import os
import sys
import sqlite3
import hashlib
import json
from datetime import datetime

# Rutas de Respaldo
BACKUP_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "daily")
os.makedirs(BACKUP_DIR, exist_ok=True)

SOURCE_DB = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "dalor_sigop.db")

def create_daily_backup():
    if not os.path.exists(SOURCE_DB):
        print(f"[ERROR] No se localizó la base de datos origen: {SOURCE_DB}")
        return False, None

    timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_filename = f"dalor_backup_{timestamp_str}.db"
    backup_path = os.path.join(BACKUP_DIR, backup_filename)
    meta_path = os.path.join(BACKUP_DIR, f"dalor_backup_{timestamp_str}.json")

    print(f"--> Iniciando respaldo en caliente de DALOR SIGO-P...")
    print(f"    Origen:  {SOURCE_DB}")
    print(f"    Destino: {backup_path}")

    # 1. Copia segura en caliente mediante SQLite Online Backup API
    source_conn = sqlite3.connect(SOURCE_DB)
    dest_conn = sqlite3.connect(backup_path)
    try:
        source_conn.backup(dest_conn)
        dest_conn.close()
        source_conn.close()
    except Exception as e:
        print(f"[ERROR] Falló la API de respaldo SQLite: {e}")
        return False, None

    # 2. Verificación Estricta de Integridad
    verify_conn = sqlite3.connect(backup_path)
    cur = verify_conn.cursor()
    cur.execute("PRAGMA integrity_check;")
    integrity_rows = cur.fetchall()
    
    is_ok = (len(integrity_rows) == 1 and integrity_rows[0][0] == "ok")
    if not is_ok:
        print(f"[ALERTA CRÍTICA] Falló la verificación de integridad: {integrity_rows}")
        verify_conn.close()
        return False, None

    # Recuento de tablas y registros
    cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
    tables = [r[0] for r in cur.fetchall()]
    table_stats = {}
    total_records = 0
    for t in tables:
        cur.execute(f'SELECT COUNT(*) FROM "{t}";')
        cnt = cur.fetchone()[0]
        table_stats[t] = cnt
        total_records += cnt
    verify_conn.close()

    # 3. Hash Criptográfico SHA-256
    hasher = hashlib.sha256()
    with open(backup_path, "rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    sha256_hash = hasher.hexdigest()
    file_size_bytes = os.path.getsize(backup_path)

    metadata = {
        "backup_filename": backup_filename,
        "backup_path": backup_path,
        "created_at": datetime.now().isoformat(),
        "file_size_bytes": file_size_bytes,
        "file_size_mb": round(file_size_bytes / (1024 * 1024), 3),
        "sha256_checksum": sha256_hash,
        "integrity_check": "ok",
        "total_tables": len(tables),
        "total_records": total_records,
        "table_stats": table_stats
    }

    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)

    print(f"[ÉXITO] Respaldo completado y verificado:")
    print(f"    Archivo:     {backup_filename}")
    print(f"    Tamaño:      {metadata['file_size_mb']} MB ({file_size_bytes:,} Bytes)")
    print(f"    Integridad:  PRAGMA integrity_check = {metadata['integrity_check']}")
    print(f"    Registros:   {total_records:,} filas en {len(tables)} tablas")
    print(f"    SHA-256:     {sha256_hash}")
    return True, metadata

if __name__ == "__main__":
    success, meta = create_daily_backup()
    sys.exit(0 if success else 1)
