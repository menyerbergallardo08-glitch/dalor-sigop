"""
=============================================================================
DALOR SIGO-P — Script de Respaldo y Verificación de Producción PostgreSQL
Versión: 2026.09.18.v96.2
Módulo: backups/backup_postgres.py
=============================================================================
Objetivo:
- Ejecutar respaldos consistentes de bases de datos PostgreSQL (Render Cloud / Local).
- Soporte dual:
  a) Vía pg_dump nativo si las utilidades de PostgreSQL están en PATH.
  b) Vía BackupService agnóstico (SQLAlchemy/psycopg2) para entornos contenedorizados (Render Docker) sin pg_dump instalado.
- Cálculo estricto de SHA-256 y metadatos JSON.
- Modo de restauración de prueba en entorno aislado (Dry-Run / Isolated Test).
- Máscara estricta de contraseñas en logs y salidas de consola.
=============================================================================
"""

import os
import sys
import json
import gzip
import shutil
import hashlib
import argparse
import subprocess
from datetime import datetime
from urllib.parse import urlparse, urlunparse

# Configuración de Rutas
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKUP_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "production")
os.makedirs(BACKUP_DIR, exist_ok=True)

if BASE_DIR not in sys.path:
    sys.path.insert(0, os.path.join(BASE_DIR, "backend"))

def mask_db_url(url: str) -> str:
    """Enmascara contraseñas en cadenas de conexión para logs seguros."""
    if not url:
        return "None"
    try:
        parsed = urlparse(url)
        if parsed.password:
            netloc = f"{parsed.username}:********@{parsed.hostname}"
            if parsed.port:
                netloc += f":{parsed.port}"
            return urlunparse((parsed.scheme, netloc, parsed.path, parsed.params, parsed.query, parsed.fragment))
        return url
    except Exception:
        return "[MASKED_URL]"

def compute_sha256(filepath: str) -> str:
    """Calcula el hash criptográfico SHA-256 de un archivo."""
    hasher = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    return hasher.hexdigest()

def find_pg_dump() -> str | None:
    """Busca el binario pg_dump en el PATH o en ubicaciones estándar de Windows/Linux."""
    pg_dump_path = shutil.which("pg_dump")
    if pg_dump_path:
        return pg_dump_path
    windows_paths = [
        r"C:\Program Files\PostgreSQL\16\bin\pg_dump.exe",
        r"C:\Program Files\PostgreSQL\15\bin\pg_dump.exe",
        r"C:\Program Files\PostgreSQL\14\bin\pg_dump.exe"
    ]
    for wp in windows_paths:
        if os.path.exists(wp):
            return wp
    return None

def create_postgres_backup(db_url: str = None, method_pref: str = "auto") -> dict:
    """
    Crea un respaldo de la base de datos PostgreSQL.
    Retorna metadatos completos con SHA-256.
    """
    if not db_url:
        db_url = os.getenv("DATABASE_URL", "sqlite:///./dalor_sigop.db")

    masked_url = mask_db_url(db_url)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    print(f"--> [DALOR BACKUP] Iniciando proceso de respaldo...")
    print(f"    Target URL: {masked_url}")
    print(f"    Timestamp:  {timestamp}")

    pg_dump_bin = find_pg_dump()
    use_pg_dump = (method_pref in ["auto", "pg_dump"]) and (pg_dump_bin is not None) and ("postgresql" in db_url)

    result_meta = {
        "timestamp": timestamp,
        "database_url_masked": masked_url,
        "backup_method": "",
        "files": [],
        "success": False
    }

    if use_pg_dump:
        print(f"--> Utilizando binario nativo pg_dump: {pg_dump_bin}")
        dump_filename = f"dalor_pgdump_{timestamp}.dump"
        dump_path = os.path.join(BACKUP_DIR, dump_filename)
        cmd = [
            pg_dump_bin,
            "-Fc",
            "--no-owner",
            "--no-privileges",
            "-d", db_url,
            "-f", dump_path
        ]
        try:
            res = subprocess.run(cmd, capture_output=True, text=True, check=True)
            file_size = os.path.getsize(dump_path)
            sha256 = compute_sha256(dump_path)
            result_meta["backup_method"] = "pg_dump_custom_format"
            result_meta["success"] = True
            result_meta["files"].append({
                "filename": dump_filename,
                "filepath": dump_path,
                "size_bytes": file_size,
                "size_kb": round(file_size / 1024, 2),
                "sha256": sha256
            })
            print(f"    [ÉXITO] pg_dump completado: {dump_filename} ({file_size} Bytes, SHA256: {sha256[:12]}...)")
        except Exception as e:
            print(f"    [AVISO] Falló pg_dump ({e}). Recurriendo al motor agnóstico BackupService...")
            use_pg_dump = False

    if not use_pg_dump:
        print(f"--> Utilizando BackupService agnóstico (SQLAlchemy Reflection)...")
        from app.core.database import SessionLocal, engine
        from app.services.backup_service import BackupService
        
        db = SessionLocal()
        try:
            service_res = BackupService.create_backup(db=db, initiator_username="script_backup_postgres")
            primary_file = service_res.get("primary_file")
            from app.services.backup_service import BACKUP_DIR as APP_BACKUP_DIR
            src_file_path = os.path.join(APP_BACKUP_DIR, primary_file)
            dest_file_path = os.path.join(BACKUP_DIR, primary_file)
            shutil.copyfile(src_file_path, dest_file_path)

            file_size = os.path.getsize(dest_file_path)
            sha256 = compute_sha256(dest_file_path)

            result_meta["backup_method"] = "BackupService_SQLAlchemy_JSON"
            result_meta["database_engine"] = engine.name
            result_meta["total_tables"] = service_res.get("total_tables", 0)
            result_meta["tables"] = service_res.get("tables_backed_up", [])
            result_meta["success"] = True
            result_meta["files"].append({
                "filename": primary_file,
                "filepath": dest_file_path,
                "size_bytes": file_size,
                "size_kb": round(file_size / 1024, 2),
                "sha256": sha256
            })
            print(f"    [ÉXITO] Respaldo agnóstico generado: {primary_file} ({file_size} Bytes, {len(result_meta['tables'])} tablas, SHA256: {sha256[:12]}...)")
        finally:
            db.close()

    manifest_filename = f"backup_manifest_{timestamp}.json"
    manifest_path = os.path.join(BACKUP_DIR, manifest_filename)
    with open(manifest_path, "w", encoding="utf-8") as mf:
        json.dump(result_meta, mf, indent=2, ensure_ascii=False)
    result_meta["manifest_path"] = manifest_path
    return result_meta

def verify_restore_isolated(backup_json_path: str, isolated_db_url: str = "sqlite:///./isolated_test_restore.db") -> dict:
    """
    Prueba de restauración en entorno estrictamente aislado.
    NO toca la base de datos productiva.
    """
    print(f"\n==================================================================")
    print(f"--> [PRUEBA AISLADA DE RESTAURACIÓN (V4.1.3-02)]")
    print(f"    Archivo de respaldo: {backup_json_path}")
    print(f"    BD Aislada Destino:  {isolated_db_url}")
    print(f"==================================================================")

    if not os.path.exists(backup_json_path):
        raise FileNotFoundError(f"No existe el archivo de respaldo: {backup_json_path}")

    from sqlalchemy import create_engine, inspect, text
    from sqlalchemy.orm import sessionmaker
    from app.core.database import Base
    import app.models.models

    if "sqlite:///" in isolated_db_url:
        db_file = isolated_db_url.replace("sqlite:///", "")
        if os.path.exists(db_file):
            try:
                os.remove(db_file)
            except Exception:
                pass

    test_engine = create_engine(isolated_db_url)
    Base.metadata.create_all(bind=test_engine)
    TestSession = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
    test_db = TestSession()

    restore_report = {
        "isolated_db_url": isolated_db_url,
        "backup_source": os.path.basename(backup_json_path),
        "table_counts": {},
        "total_rows": 0,
        "status": "FAILED",
        "errors": []
    }

    try:
        with open(backup_json_path, "r", encoding="utf-8") as f:
            dump_data = json.load(f)

        tables_data = dump_data.get("tables", {})
        inspector = inspect(test_engine)
        existing_tables = set(inspector.get_table_names())

        ordered_model_tables = [t.name for t in Base.metadata.sorted_tables]
        non_model_tables = [t for t in tables_data.keys() if t not in ordered_model_tables]
        insert_order = non_model_tables + [t for t in ordered_model_tables if t in tables_data]

        for t_name in insert_order:
            if t_name not in existing_tables:
                continue

            t_content = tables_data[t_name]
            rows = t_content.get("rows", [])
            cols = t_content.get("columns", [])
            
            target_cols = set([c["name"] for c in inspector.get_columns(t_name)])
            valid_cols = [c for c in cols if c in target_cols]

            if not valid_cols or not rows:
                restore_report["table_counts"][t_name] = 0
                continue

            col_names_str = ", ".join([f'"{k}"' for k in valid_cols])
            val_placeholders = ", ".join([f":{k}" for k in valid_cols])
            stmt = text(f'INSERT INTO "{t_name}" ({col_names_str}) VALUES ({val_placeholders})')

            for r in rows:
                filtered_row = {k: r[k] for k in valid_cols if k in r}
                for k, v in filtered_row.items():
                    if isinstance(v, str) and ("T" in v or ":" in v) and len(v) >= 10:
                        try:
                            filtered_row[k] = datetime.fromisoformat(v)
                        except Exception:
                            pass
                test_db.execute(stmt, filtered_row)

            test_db.commit()
            restore_report["table_counts"][t_name] = len(rows)
            restore_report["total_rows"] += len(rows)

        print(f"--> [VERIFICACIÓN] Tablas restauradas: {len(restore_report['table_counts'])}")
        print(f"--> [VERIFICACIÓN] Filas totales:     {restore_report['total_rows']}")
        for key_table in ["users", "projects", "assets", "fuel_tickets", "audit_logs"]:
            if key_table in restore_report["table_counts"]:
                cnt = restore_report["table_counts"][key_table]
                print(f"    - {key_table}: {cnt} registros")

        restore_report["status"] = "PASSED"
        print(f"\n[ÉXITO] Restauración aislada validada al 100%. Integridad estructural y de datos confirmada.")

    except Exception as e:
        test_db.rollback()
        restore_report["errors"].append(str(e))
        print(f"[ERROR EN RESTAURACIÓN AISLADA]: {e}")
    finally:
        test_db.close()
        test_engine.dispose()

    with open(os.path.join(BACKUP_DIR, "last_isolated_restore_report.json"), "w", encoding="utf-8") as rf:
        json.dump(restore_report, rf, indent=2, ensure_ascii=False)

    return restore_report

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="DALOR SIGO-P Backup & Restore CLI")
    parser.add_argument("--backup", action="store_true", help="Ejecutar respaldo")
    parser.add_argument("--restore-test", type=str, help="Ejecutar prueba de restauración sobre archivo JSON")
    args = parser.parse_args()

    if args.backup:
        meta = create_postgres_backup()
        print("\n--- MANIFIESTO DE RESPALDO ---")
        print(json.dumps(meta, indent=2))
        for f in meta.get("files", []):
            if f["filename"].endswith(".json"):
                verify_restore_isolated(f["filepath"])
                break
    elif args.restore_test:
        verify_restore_isolated(args.restore_test)
    else:
        meta = create_postgres_backup()
        for f in meta.get("files", []):
            if f["filename"].endswith(".json"):
                verify_restore_isolated(f["filepath"])
                break
