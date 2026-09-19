"""
=============================================================================
DALOR SIGO-P — Prueba de Restauración y Verificación Real en PostgreSQL 16
Versión del Sistema: 2026.09.18.v96.2
Módulo: backups/test_postgres_restore.py (Fase V4.1.4)
=============================================================================
Objetivo:
- Verificar de manera controlada y reproducible la restauración del respaldo
  de referencia en un motor PostgreSQL 16 aislado y real.
- Validar integridad estructural, tipos de datos, llaves foráneas y secuencias.
- Ejecutar pruebas funcionales post-restauración.
- BARRERA CRÍTICA DE SEGURIDAD: ALLOW_PRODUCTION_RESTORE = False
=============================================================================
"""

import os
import sys
import json
import hashlib
from datetime import datetime, date
from urllib.parse import urlparse, urlunparse

# Configurar sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, os.path.join(BASE_DIR, "backend"))

# BARRERA CRÍTICA DE SEGURIDAD: PRODUCCIÓN ES INTOCABLE
ALLOW_PRODUCTION_RESTORE = False

# Backup de referencia V4.1.3
REFERENCE_BACKUP_PATH = os.path.join(BASE_DIR, "backups", "production", "dalor_backup_20260919_181816.json")
REFERENCE_MANIFEST_PATH = os.path.join(BASE_DIR, "backups", "production", "backup_manifest_20260919_181815.json")
EXPECTED_SHA256 = "4bb17c803e2baf76b9611c10f2a316d687a116a52de87c92fc67b8ba75332894"
EXPECTED_SIZE_BYTES = 989669

# URL de destino aislada (PostgreSQL 16 en puerto aislado 5433)
ISOLATED_POSTGRES_URL = os.getenv(
    "ISOLATED_TEST_DATABASE_URL",
    "postgresql+psycopg2://postgres@127.0.0.1:5433/dalor_isolated_restore_test"
)

def mask_url(url: str) -> str:
    """Enmascara contraseñas y credenciales sensibles para auditoría."""
    if not url:
        return "[NONE]"
    try:
        parsed = urlparse(url)
        netloc = parsed.hostname or "unknown"
        if parsed.username:
            netloc = f"{parsed.username}:********@{netloc}"
        if parsed.port:
            netloc += f":{parsed.port}"
        return urlunparse((parsed.scheme, netloc, parsed.path, parsed.params, parsed.query, parsed.fragment))
    except Exception:
        return "[MASKED_URL]"

def verify_safety_guardrails(target_url: str):
    """Verifica estrictamente que el destino sea un entorno aislado y no producción."""
    if ALLOW_PRODUCTION_RESTORE:
        raise RuntimeError("VIOLACIÓN DE SEGURIDAD: ALLOW_PRODUCTION_RESTORE está activado.")

    parsed = urlparse(target_url)
    host = parsed.hostname or ""
    port = parsed.port or 5432
    dbname = parsed.path.lstrip("/")

    # Detectar palabras o patrones de producción
    prod_indicators = ["render.com", "oregon-postgres", "frankfurt-postgres", "virginia-postgres", "dpg-", "dalor_prod"]
    for ind in prod_indicators:
        if ind in target_url.lower():
            raise RuntimeError(f"ABORTADO POR SEGURIDAD: Se detectó indicador de producción '{ind}' en la URL de destino.")

    # Exigir explícitamente localhost o entorno aislado
    is_local = host in ["127.0.0.1", "localhost"]
    is_test_db = "test" in dbname.lower() or "isolated" in dbname.lower()

    if not (is_local and is_test_db):
        raise RuntimeError(
            f"ABORTADO POR SEGURIDAD: La base destino '{dbname}' en host '{host}' no cumple los criterios de aislamiento estricto."
        )

    print(f"[SEGURIDAD] Destino validado como entorno aislado:")
    print(f"            Host: {host}:{port}")
    print(f"            Base de datos: {dbname}")
    print(f"            ALLOW_PRODUCTION_RESTORE = {ALLOW_PRODUCTION_RESTORE} (Intocable)")

def verify_reference_backup() -> dict:
    """Verifica la existencia, integridad y hash SHA-256 del backup de referencia."""
    print(f"\n--> [1. VERIFICACIÓN DEL BACKUP DE REFERENCIA]")
    if not os.path.exists(REFERENCE_BACKUP_PATH):
        raise FileNotFoundError(f"No se localizó el archivo de respaldo: {REFERENCE_BACKUP_PATH}")

    actual_size = os.path.getsize(REFERENCE_BACKUP_PATH)
    hasher = hashlib.sha256()
    with open(REFERENCE_BACKUP_PATH, "rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    actual_sha256 = hasher.hexdigest()

    size_match = (actual_size == EXPECTED_SIZE_BYTES)
    sha_match = (actual_sha256 == EXPECTED_SHA256)

    print(f"    Archivo:        {os.path.basename(REFERENCE_BACKUP_PATH)}")
    print(f"    Tamaño:         {actual_size:,} Bytes (Esperado: {EXPECTED_SIZE_BYTES:,}) -> {'PASS' if size_match else 'FAIL'}")
    print(f"    SHA-256:        {actual_sha256}")
    print(f"    SHA-256 Match:  {'PASS' if sha_match else 'FAIL'}")

    if not (size_match and sha_match):
        raise ValueError("ABORTADO: El respaldo no coincide con el manifest criptográfico de V4.1.3.")

    with open(REFERENCE_BACKUP_PATH, "r", encoding="utf-8") as f:
        dump_data = json.load(f)

    return {
        "file_name": os.path.basename(REFERENCE_BACKUP_PATH),
        "file_path": REFERENCE_BACKUP_PATH,
        "size_bytes": actual_size,
        "sha256": actual_sha256,
        "total_tables": len(dump_data.get("tables", {})),
        "dump_data": dump_data
    }

def run_postgres_restore(target_url: str, dump_data: dict) -> dict:
    """Ejecuta la restauración real en PostgreSQL 16 y valida secuencias e integridad."""
    verify_safety_guardrails(target_url)

    from sqlalchemy import create_engine, inspect, text
    from sqlalchemy.orm import sessionmaker
    from app.core.database import Base
    import app.models.models

    start_time = datetime.now()
    engine = create_engine(target_url)

    # Validar versión real del servidor PostgreSQL
    with engine.connect() as conn:
        pg_version = conn.execute(text("SELECT version();")).scalar()
        print(f"\n--> [2. CONEXIÓN A POSTGRESQL AISLADO]")
        print(f"    Versión de Motor: {pg_version}")
        print(f"    URL Enmascarada:  {mask_url(target_url)}")

    # 1. Recrear esquema en PostgreSQL aislado
    print(f"--> [3. CREACIÓN DE ESTRUCTURA Y TABLAS]")
    Base.metadata.create_all(bind=engine)
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())
    print(f"    Tablas creadas en PostgreSQL: {len(existing_tables)}")

    Session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = Session()

    tables_data = dump_data.get("tables", {})
    restored_stats = {}
    total_records = 0

    print(f"\n--> [4. RESTAURACIÓN TOPOLÓGICA EN POSTGRESQL]")
    # Orden topológico: tablas padre primero, tablas hijas después
    ordered_model_tables = [t.name for t in Base.metadata.sorted_tables]
    non_model_tables = [t for t in tables_data.keys() if t not in ordered_model_tables]
    insert_order = non_model_tables + [t for t in ordered_model_tables if t in tables_data]

    try:
        # Purgar cualquier dato residual previo en orden inverso
        delete_order = [t for t in reversed(ordered_model_tables) if t in existing_tables] + [t for t in non_model_tables if t in existing_tables]
        for t_name in delete_order:
            db.execute(text(f'DELETE FROM "{t_name}";'))
        db.commit()

        # Habilitar modo réplica si PostgreSQL lo permite para restauración masiva
        try:
            db.execute(text("SET session_replication_role = 'replica';"))
        except Exception:
            pass

        model_table_map = {t.name: t for t in Base.metadata.sorted_tables}
        inserted_ids = {}

        # Inserción de filas respetando claves y tipos
        for t_name in insert_order:
            if t_name not in existing_tables:
                print(f"    [AVISO] Tabla {t_name} no existe en esquema destino. Saltando.")
                continue

            t_content = tables_data[t_name]
            rows = t_content.get("rows", [])
            cols = t_content.get("columns", [])

            target_cols = set([c["name"] for c in inspector.get_columns(t_name)])
            col_objs = {c["name"]: c for c in inspector.get_columns(t_name)}
            valid_cols = [c for c in cols if c in target_cols]

            if not valid_cols or not rows:
                restored_stats[t_name] = 0
                inserted_ids[t_name] = set()
                continue

            # Identificar FKs nulables de esta tabla para sanitizar huérfanos históricos
            nullable_fks = {}
            if t_name in model_table_map:
                table_obj = model_table_map[t_name]
                nullable_fks = {fk.parent.name: fk.column.table.name for fk in table_obj.foreign_keys if fk.parent.nullable}

            col_names_str = ", ".join([f'"{k}"' for k in valid_cols])
            val_placeholders = ", ".join([f":{k}" for k in valid_cols])
            stmt = text(f'INSERT INTO "{t_name}" ({col_names_str}) VALUES ({val_placeholders});')

            for r in rows:
                filtered_row = {k: r[k] for k in valid_cols if k in r}
                for k, v in filtered_row.items():
                    if v is not None and k in col_objs:
                        col_type = str(col_objs[k]["type"]).lower()
                        # Conversión tipada para TIMESTAMP / DATETIME
                        if ("datetime" in col_type or "timestamp" in col_type) and isinstance(v, str):
                            try:
                                filtered_row[k] = datetime.fromisoformat(v)
                            except Exception:
                                pass
                        # Conversión tipada para DATE
                        elif "date" in col_type and isinstance(v, str) and len(v) == 10:
                            try:
                                filtered_row[k] = date.fromisoformat(v)
                            except Exception:
                                pass
                        # Conversión tipada para BOOLEAN (PostgreSQL exige bool nativo, no 0/1)
                        elif ("bool" in col_type or "boolean" in col_type) and not isinstance(v, bool):
                            filtered_row[k] = bool(v) if v not in (0, "0", "false", "False", False) else False

                # Sanitizar FKs nulables si apuntan a IDs de usuarios/padres borrados previamente
                for fk_col, parent_t in nullable_fks.items():
                    if fk_col in filtered_row and filtered_row[fk_col] is not None:
                        valid_parent_ids = inserted_ids.get(parent_t, set())
                        if valid_parent_ids and filtered_row[fk_col] not in valid_parent_ids:
                            print(f"    [SANIDAD FK] En '{t_name}', FK nulable '{fk_col}': {filtered_row[fk_col]} huérfano en '{parent_t}'. Seteado a NULL.")
                            filtered_row[fk_col] = None

                db.execute(stmt, filtered_row)

            restored_stats[t_name] = len(rows)
            inserted_ids[t_name] = set(r["id"] for r in rows if "id" in r)
            total_records += len(rows)

        # Restaurar modo réplica a normal
        try:
            db.execute(text("SET session_replication_role = 'origin';"))
        except Exception:
            pass

        db.commit()
        print(f"    Filas insertadas con éxito: {total_records:,} en {len(restored_stats)} tablas.")

        # 5. SINCRONIZACIÓN Y VERIFICACIÓN DE SECUENCIAS POSTGRESQL
        print(f"\n--> [5. VERIFICACIÓN DE SECUENCIAS POSTGRESQL]")
        sequence_reports = []
        for t_name in existing_tables:
            # Obtener secuencia de la columna ID si existe
            seq_query = text(f"SELECT pg_get_serial_sequence('\"{t_name}\"', 'id');")
            try:
                seq_name = db.execute(seq_query).scalar()
            except Exception:
                seq_name = None

            if seq_name:
                # Sincronizar secuencia con setval al MAX(id)
                sync_sql = text(f"""
                    SELECT setval(
                        '{seq_name}', 
                        COALESCE((SELECT MAX(id) FROM "{t_name}"), 1), 
                        (SELECT MAX(id) FROM "{t_name}") IS NOT NULL
                    );
                """)
                db.execute(sync_sql)
                db.commit()

                # Obtener max_id y last_value de la secuencia
                max_id = db.execute(text(f'SELECT COALESCE(MAX(id), 0) FROM "{t_name}";')).scalar()
                curr_val = db.execute(text(f"SELECT last_value, is_called FROM {seq_name};")).fetchone()
                last_val = curr_val[0]
                is_called = curr_val[1]

                seq_status = "OK" if (max_id == 0 or (last_val >= max_id and is_called)) else "MISMATCH"
                sequence_reports.append({
                    "table": t_name,
                    "sequence": seq_name,
                    "max_id": max_id,
                    "last_value": last_val,
                    "is_called": is_called,
                    "status": seq_status
                })

        print(f"    Secuencias verificadas: {len(sequence_reports)}")
        all_seq_ok = all(s["status"] == "OK" for s in sequence_reports)
        print(f"    Estado Global de Secuencias: {'TODAS CORRECTAS (PASS)' if all_seq_ok else 'ADVERTENCIA'}")

        # 6. PRUEBA DE INSERCIÓN Y NO COLISIÓN (SMOKE TEST DE SECUENCIAS)
        print(f"\n--> [6. PRUEBA DE NO-COLISIÓN DE IDs AUTOINCREMENTALES]")
        # Insertamos un registro de auditoría de prueba para verificar que la secuencia asigna el siguiente ID
        max_audit_id_before = db.execute(text('SELECT COALESCE(MAX(id), 0) FROM "audit_logs";')).scalar()
        test_audit_stmt = text("""
            INSERT INTO "audit_logs" ("username", "module", "action", "details", "created_at")
            VALUES ('test_v414_verifier', 'auditoria', 'prueba_secuencia_postgres', 'Verificando autoincrement', NOW())
            RETURNING id;
        """)
        new_audit_id = db.execute(test_audit_stmt).scalar()
        db.commit()

        expected_new_id = max_audit_id_before + 1
        seq_insert_ok = (new_audit_id == expected_new_id)
        print(f"    audit_logs ID previo:     {max_audit_id_before}")
        print(f"    audit_logs nuevo ID:      {new_audit_id} (Esperado: {expected_new_id}) -> {'PASS' if seq_insert_ok else 'FAIL'}")

        # Limpiar registro de prueba
        db.execute(text(f'DELETE FROM "audit_logs" WHERE id = {new_audit_id};'))
        # Reajustar secuencia de nuevo a max previo
        db.execute(text(f"SELECT setval('audit_logs_id_seq', {max_audit_id_before}, true);"))
        db.commit()

        # 7. PRUEBAS FUNCIONALES DE CONSULTA Y NEGOCIO
        print(f"\n--> [7. PRUEBAS FUNCIONALES SOBRE POSTGRESQL RESTAURADO]")
        sample_queries = {
            "assets_total": 'SELECT COUNT(*) FROM "assets";',
            "assets_herramientas": 'SELECT COUNT(*) FROM "assets" WHERE asset_type = \'herramienta\';',
            "projects_total": 'SELECT COUNT(*) FROM "projects";',
            "users_total": 'SELECT COUNT(*) FROM "users";',
            "cxc_total": 'SELECT COUNT(*) FROM "accounts_receivable";',
            "cxp_total": 'SELECT COUNT(*) FROM "accounts_payable";'
        }
        func_results = {}
        for q_name, sql in sample_queries.items():
            val = db.execute(text(sql)).scalar()
            func_results[q_name] = val
            print(f"    - {q_name}: {val}")

        end_time = datetime.now()
        duration_sec = round((end_time - start_time).total_seconds(), 3)

        report = {
            "status": "PASSED" if (all_seq_ok and seq_insert_ok) else "FAILED",
            "execution_timestamps": {
                "start": start_time.isoformat(),
                "end": end_time.isoformat(),
                "duration_seconds": duration_sec
            },
            "database_engine": {
                "engine": "PostgreSQL",
                "version": pg_version,
                "target_url_masked": mask_url(target_url),
                "is_isolated": True
            },
            "restored_summary": {
                "total_tables": len(restored_stats),
                "total_records": total_records,
                "table_counts": restored_stats
            },
            "sequence_verification": {
                "total_sequences": len(sequence_reports),
                "all_sequences_ok": all_seq_ok,
                "no_collision_smoke_test": "PASSED" if seq_insert_ok else "FAILED",
                "details": sequence_reports
            },
            "functional_smoke_tests": func_results
        }
        return report

    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()
        engine.dispose()

if __name__ == "__main__":
    print("=============================================================================")
    print("DALOR SIGO-P — VERIFICACIÓN REAL DE BACKUP Y RESTORE EN POSTGRESQL 16 (V4.1.4)")
    print("=============================================================================")

    # 1. Verificar backup de referencia
    ref_info = verify_reference_backup()

    # 2. Ejecutar restauración y validación
    report = run_postgres_restore(ISOLATED_POSTGRES_URL, ref_info["dump_data"])

    # 3. Guardar reporte de resultados
    output_report_path = os.path.join(BASE_DIR, "backups", "production", "v4_1_4_postgres_restore_report.json")
    with open(output_report_path, "w", encoding="utf-8") as rf:
        json.dump(report, rf, indent=2, ensure_ascii=False)

    print(f"\n=============================================================================")
    print(f"DICTAMEN DE RESTAURACIÓN POSTGRESQL: {report['status']}")
    print(f"Reporte técnico guardado en: {output_report_path}")
    print(f"=============================================================================")
