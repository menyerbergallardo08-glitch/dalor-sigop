# ========================================================================================
# DALOR DEV SUITE - SCRIPT AUTOMATIZADO DE RESPALDO A GOOGLE DRIVE
# ========================================================================================
import os, sys, zipfile, shutil
from datetime import datetime

EXCLUDE_DIRS = {'.git', 'node_modules', 'venv', '.venv', '__pycache__', '.pytest_cache', '.vite', 'dist_bak', 'scratch', '.idea', '.vscode'}
EXCLUDE_EXTENSIONS = {'.pyc', '.pyo', '.pyd', '.exe', '.log', '.tmp', '.bak', '.db', '.db-wal', '.db-shm', '.sqlite', '.sqlite3'}

def find_default_cloud_path():
    candidates = [
        'G:/My Drive/MIS_DESARROLLOS',
        'G:/Mi unidad/MIS_DESARROLLOS',
        os.path.expanduser('~/Google Drive/MIS_DESARROLLOS'),
        os.path.expanduser('~/GoogleDrive/MIS_DESARROLLOS'),
        os.path.expanduser('~/OneDrive/MIS_DESARROLLOS'),
        os.path.expanduser('~/Desktop/RESPALDOS_GOOGLE_DRIVE')
    ]
    for c in candidates:
        parent = os.path.dirname(c)
        if os.path.exists(parent):
            return c
    return os.path.expanduser('~/MIS_DESARROLLOS_DRIVE')

def package_project(project_dir: str, output_dir: str, max_backups_per_proj: int = 5) -> str:
    proj_name = os.path.basename(os.path.abspath(project_dir))
    timestamp = datetime.now().strftime('%Y-%m-%d_%H%M')
    target_folder = os.path.join(output_dir, proj_name)
    os.makedirs(target_folder, exist_ok=True)
    
    zip_filename = f'{proj_name}_{timestamp}.zip'
    zip_path = os.path.join(target_folder, zip_filename)
    
    print(f'Empaquetando {proj_name} hacia {target_folder}...')
    file_count = 0
    total_uncompressed_bytes = 0
    
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as zf:
        for root, dirs, files in os.walk(project_dir):
            dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS and not d.startswith('.bak')]
            for f in files:
                ext = os.path.splitext(f)[1].lower()
                if ext in EXCLUDE_EXTENSIONS or f.startswith('.'):
                    continue
                full_path = os.path.join(root, f)
                rel_path = os.path.relpath(full_path, project_dir)
                try:
                    zf.write(full_path, rel_path)
                    file_count += 1
                    total_uncompressed_bytes += os.path.getsize(full_path)
                except Exception:
                    pass

    zip_size_mb = round(os.path.getsize(zip_path) / (1024 * 1024), 2)
    print(f'Respaldo completado: {zip_filename} ({file_count} archivos, {zip_size_mb} MB)')
    
    # Rotacion FIFO de respaldos
    existing_zips = [os.path.join(target_folder, f) for f in os.listdir(target_folder) if f.startswith(proj_name) and f.endswith('.zip')]
    if len(existing_zips) > max_backups_per_proj:
        existing_zips.sort(key=os.path.getmtime)
        for old_f in existing_zips[:-max_backups_per_proj]:
            try:
                os.remove(old_f)
                print(f'Rotacion FIFO: eliminada copia antigua {os.path.basename(old_f)}')
            except Exception:
                pass
    return zip_path

if __name__ == '__main__':
    target = os.getenv('GDRIVE_BACKUP_DIR') or find_default_cloud_path()
    os.makedirs(target, exist_ok=True)
    current_proj = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))
    package_project(current_proj, target)
