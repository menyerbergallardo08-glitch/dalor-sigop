import os
import io
import json
import gzip
import shutil
import glob
from datetime import datetime, date
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import inspect, text

from app.core.config import settings
from app.models.models import AuditLog

BACKUP_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))),
    "backups"
)
os.makedirs(BACKUP_DIR, exist_ok=True)

def _json_serializer(obj):
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    return str(obj)

def get_db_file_path() -> Optional[str]:
    db_url = settings.DATABASE_URL
    if "sqlite:///" in db_url:
        path = db_url.replace("sqlite:///", "")
        if os.path.exists(path):
            return path
    default_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))),
        "dalor_sigop.db"
    )
    if os.path.exists(default_path):
        return default_path
    return None

class BackupService:
    @staticmethod
    def list_backups() -> List[Dict[str, Any]]:
        patterns = ["dalor_backup_*.db", "dalor_backup_*.json", "dalor_backup_*.json.gz"]
        all_files = []
        for pat in patterns:
            all_files.extend(glob.glob(os.path.join(BACKUP_DIR, pat)))
        
        backups = []
        for f in set(all_files):
            fname = os.path.basename(f)
            size_bytes = os.path.getsize(f)
            mtime = os.path.getmtime(f)
            ext = fname.split(".")[-1]
            if fname.endswith(".json.gz"):
                ext = "json.gz"
            backups.append({
                "filename": fname,
                "file_type": ext.upper(),
                "size_kb": round(size_bytes / 1024, 2),
                "size_mb": round(size_bytes / (1024 * 1024), 2),
                "created_at": datetime.fromtimestamp(mtime).strftime("%Y-%m-%d %H:%M:%S"),
                "timestamp_epoch": mtime
            })
        
        backups.sort(key=lambda x: x["timestamp_epoch"], reverse=True)
        return backups

    @staticmethod
    def create_backup(db: Session, initiator_username: str = "sistema") -> Dict[str, Any]:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        created_files = []
        total_kb = 0.0

        # 1. Multi-table JSON Dump usando Reflection (PostgreSQL + SQLite)
        inspector = inspect(db.bind)
        all_table_names = inspector.get_table_names()

        dump_data = {
            "version": "2.0",
            "system": "DALOR SIGO-P",
            "exported_at": datetime.utcnow().isoformat(),
            "initiator": initiator_username,
            "database_engine": db.bind.name,
            "tables": {}
        }

        for t_name in all_table_names:
            cols = [c["name"] for c in inspector.get_columns(t_name)]
            if not cols:
                continue
            
            quoted_cols = ", ".join([f'"{c}"' if db.bind.name == "postgresql" else f'`{c}`' if db.bind.name == "mysql" else f'"{c}"' for c in cols])
            query = text(f'SELECT {quoted_cols} FROM "{t_name}"' if db.bind.name == "postgresql" else f'SELECT {quoted_cols} FROM {t_name}')
            
            try:
                result = db.execute(query).fetchall()
                table_rows = []
                for row in result:
                    row_dict = {}
                    for col_name, val in zip(cols, row):
                        if isinstance(val, (datetime, date)):
                            row_dict[col_name] = val.isoformat()
                        else:
                            row_dict[col_name] = val
                    table_rows.append(row_dict)
                dump_data["tables"][t_name] = {
                    "columns": cols,
                    "row_count": len(table_rows),
                    "rows": table_rows
                }
            except Exception as e:
                dump_data["tables"][t_name] = {
                    "columns": cols,
                    "row_count": 0,
                    "rows": [],
                    "error": str(e)
                }

        json_filename = f"dalor_backup_{timestamp}.json"
        json_path = os.path.join(BACKUP_DIR, json_filename)
        with open(json_path, "w", encoding="utf-8") as jf:
            json.dump(dump_data, jf, indent=2, default=_json_serializer, ensure_ascii=False)
        
        json_kb = round(os.path.getsize(json_path) / 1024, 2)
        total_kb += json_kb
        created_files.append(json_filename)

        # 2. Si es SQLite, realizar también copia binaria .db directa
        src_db = get_db_file_path()
        if src_db and os.path.exists(src_db):
            db_filename = f"dalor_backup_{timestamp}.db"
            dest_db_path = os.path.join(BACKUP_DIR, db_filename)
            try:
                shutil.copyfile(src_db, dest_db_path)
                created_files.append(db_filename)
                total_kb += round(os.path.getsize(dest_db_path) / 1024, 2)
            except Exception:
                pass

        # 3. Registrar auditoría de respaldo
        try:
            audit = AuditLog(
                username=initiator_username,
                module="mantenimiento",
                action="crear_respaldo_bd",
                details=f"Respaldo multi-tabla generado con éxito: {json_filename} ({json_kb} KB, {len(dump_data['tables'])} tablas respaldadas)."
            )
            db.add(audit)
            db.commit()
        except Exception:
            pass

        return {
            "success": True,
            "primary_file": json_filename,
            "created_files": created_files,
            "size_kb": total_kb,
            "tables_backed_up": list(dump_data["tables"].keys()),
            "message": f"Copia de seguridad '{json_filename}' generada exitosamente con todas las tablas del sistema."
        }

    @staticmethod
    def get_backup_path(filename: str) -> Optional[str]:
        safe_name = os.path.basename(filename)
        path = os.path.join(BACKUP_DIR, safe_name)
        if os.path.exists(path):
            return path
        return None

    @staticmethod
    def restore_backup(filename: str, db: Session, initiator_username: str = "admin") -> Dict[str, Any]:
        file_path = BackupService.get_backup_path(filename)
        if not file_path:
            raise FileNotFoundError(f"Archivo de respaldo '{filename}' no encontrado.")

        if filename.endswith(".json"):
            with open(file_path, "r", encoding="utf-8") as jf:
                dump_data = json.load(jf)
            
            tables_data = dump_data.get("tables", {})
            restored_counts = {}

            inspector = inspect(db.bind)
            existing_tables = set(inspector.get_table_names())

            try:
                # 0. En PostgreSQL, deshabilitar triggers y checks de FK durante restauración
                if db.bind.name == "postgresql":
                    try:
                        db.execute(text("SET session_replication_role = 'replica';"))
                    except Exception:
                        pass

                # 1. Purgar tablas en orden inverso
                for t_name in reversed(list(tables_data.keys())):
                    if t_name in existing_tables:
                        try:
                            if db.bind.name == "postgresql":
                                db.execute(text(f'DELETE FROM "{t_name}"'))
                            else:
                                db.execute(text(f'DELETE FROM {t_name}'))
                        except Exception:
                            pass

                # 2. Insertar filas
                for t_name, t_content in tables_data.items():
                    if t_name not in existing_tables:
                        continue
                    
                    rows = t_content.get("rows", [])
                    cols = t_content.get("columns", [])
                    
                    # Validar qué columnas realmente existen en la BD destino
                    target_cols = set([c["name"] for c in inspector.get_columns(t_name)])
                    valid_cols = [c for c in cols if c in target_cols]
                    
                    if not valid_cols or not rows:
                        restored_counts[t_name] = 0
                        continue

                    for r in rows:
                        filtered_row = {k: r[k] for k in valid_cols if k in r}
                        # Convertir ISO datetimes
                        col_objs = {c["name"]: c for c in inspector.get_columns(t_name)}
                        for k, v in filtered_row.items():
                            if v is not None and k in col_objs:
                                col_type = str(col_objs[k]["type"]).lower()
                                if ("datetime" in col_type or "timestamp" in col_type) and isinstance(v, str):
                                    try:
                                        filtered_row[k] = datetime.fromisoformat(v)
                                    except Exception:
                                        pass
                        
                        col_names_str = ", ".join([f'"{k}"' if db.bind.name == "postgresql" else f'"{k}"' for k in filtered_row.keys()])
                        val_placeholders = ", ".join([f":{k}" for k in filtered_row.keys()])
                        stmt = text(f'INSERT INTO "{t_name}" ({col_names_str}) VALUES ({val_placeholders})' if db.bind.name == "postgresql" else f'INSERT INTO {t_name} ({col_names_str}) VALUES ({val_placeholders})')
                        db.execute(stmt, filtered_row)
                    
                    restored_counts[t_name] = len(rows)

                db.commit()

                audit = AuditLog(
                    username=initiator_username,
                    module="mantenimiento",
                    action="restaurar_respaldo_bd",
                    details=f"Base de datos restaurada desde '{filename}' ({sum(restored_counts.values())} registros restaurados en {len(restored_counts)} tablas)."
                )
                db.add(audit)
                db.commit()

                return {
                    "success": True,
                    "message": f"Base de datos restaurada con éxito desde '{filename}'.",
                    "restored_counts": restored_counts
                }
            except Exception as e:
                db.rollback()
                raise e
            finally:
                if db.bind.name == "postgresql":
                    try:
                        db.execute(text("SET session_replication_role = 'origin';"))
                        db.commit()
                    except Exception:
                        pass

        elif filename.endswith(".db"):
            src_db = get_db_file_path()
            if not src_db:
                raise ValueError("No se puede restaurar archivo .db en una conexión remota PostgreSQL.")
            
            pre_restore = os.path.join(BACKUP_DIR, f"pre_restore_{datetime.now().strftime('%Y%m%d_%H%M%S')}.db")
            if os.path.exists(src_db):
                shutil.copyfile(src_db, pre_restore)
            shutil.copyfile(file_path, src_db)
            return {
                "success": True,
                "message": f"Archivo SQLite restaurado exitosamente desde '{filename}'."
            }
        else:
            raise ValueError("Formato de respaldo no soportado.")
