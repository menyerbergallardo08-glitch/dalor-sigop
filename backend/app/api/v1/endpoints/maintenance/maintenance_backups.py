from fastapi import APIRouter, Depends, HTTPException, Query, Header
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.models.models import User
from app.api.deps import get_current_user, require_roles
from app.core.security import decode_access_token
from app.services.backup_service import BackupService

router = APIRouter()

@router.get("/backups", dependencies=[Depends(require_roles(["director_general", "director", "administracion", "gerencia"]))])
def list_backups():
    return BackupService.list_backups()

@router.post("/backups/create", dependencies=[Depends(require_roles(["director_general", "director", "administracion", "gerencia"]))])
def create_backup(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        res = BackupService.create_backup(db=db, initiator_username=current_user.username)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al generar copia de seguridad: {str(e)}")

@router.get("/backups/download/{filename}")
def download_backup(
    filename: str,
    token: Optional[str] = Query(None),
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    # Authenticate via header or query parameter
    auth_token = None
    if authorization and authorization.strip().lower().startswith("bearer "):
        auth_token = authorization.strip()[7:].strip()
    elif token:
        auth_token = token.strip()
    
    if not auth_token:
        raise HTTPException(
            status_code=401,
            detail="No autenticado. Token de acceso requerido en encabezado Authorization o parámetro token."
        )
    
    payload = decode_access_token(auth_token)
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Token de acceso inválido o expirado.")
    
    username = payload["sub"]
    user = db.query(User).filter(User.username == username).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=403, detail="Usuario no autorizado o inactivo.")
    
    allowed = ["director_general", "director", "administracion", "administrador_financiero", "gerencia"]
    if user.role_name not in allowed and not user.is_superuser:
        raise HTTPException(status_code=403, detail="No tienes permisos para descargar copias de seguridad.")

    if "/" in filename or "\\" in filename or ".." in filename:
        raise HTTPException(status_code=400, detail="Nombre de archivo inválido. Intento de evasión o path traversal bloqueado.")
    if not (filename.startswith("dalor_backup_") and (filename.endswith(".json") or filename.endswith(".db") or filename.endswith(".json.gz"))):
        raise HTTPException(status_code=400, detail="Tipo de archivo no permitido. Solo se admiten archivos de respaldo DALOR.")
        
    file_path = BackupService.get_backup_path(filename)
    if not file_path:
        raise HTTPException(status_code=404, detail="Archivo de respaldo no encontrado.")
    
    media_type = "application/json" if filename.endswith(".json") else "application/octet-stream"
    return FileResponse(path=file_path, filename=filename, media_type=media_type)

@router.post("/backups/restore/{filename}", dependencies=[Depends(require_roles(["director_general", "director"]))])
def restore_backup(filename: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if "/" in filename or "\\" in filename or ".." in filename:
        raise HTTPException(status_code=400, detail="Nombre de archivo inválido. Intento de evasión o path traversal bloqueado.")
    if not (filename.startswith("dalor_backup_") and (filename.endswith(".json") or filename.endswith(".db") or filename.endswith(".json.gz"))):
        raise HTTPException(status_code=400, detail="Tipo de archivo no permitido. Solo se admiten archivos de respaldo DALOR.")
        
    try:
        res = BackupService.restore_backup(filename=filename, db=db, initiator_username=current_user.username)
        return res
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"El archivo de respaldo '{filename}' no existe.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al restaurar respaldo: {str(e)}")


# ------------------------------------------------------------------------------

