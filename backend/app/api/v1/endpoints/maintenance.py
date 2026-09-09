import os
import shutil
import glob
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel

from app.core.database import get_db
from app.core.config import settings
from app.models.models import User, AuditLog
from app.core.security import verify_password, get_password_hash, create_access_token

router = APIRouter()

BACKUP_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))), "backups")
os.makedirs(BACKUP_DIR, exist_ok=True)

def get_db_file_path():
    db_url = settings.DATABASE_URL
    if "sqlite:///" in db_url:
        path = db_url.replace("sqlite:///", "")
        if os.path.exists(path):
            return path
    default_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))), "dalor_sigop.db")
    return default_path

# ------------------------------------------------------------------------------
# 1. GESTIÓN DE USUARIOS
# ------------------------------------------------------------------------------
class UserCreate(BaseModel):
    username: str
    full_name: str
    email: str = None
    password: str
    role_name: str = "ingeniero_obra"

class UserPermissionsUpdate(BaseModel):
    permissions_json: str

@router.get("/users")
def list_users(db: Session = Depends(get_db)):
    users = db.query(User).all()
    return [{
        "id": u.id,
        "username": u.username,
        "full_name": u.full_name,
        "email": u.email,
        "role_name": u.role_name,
        "is_active": u.is_active,
        "is_superuser": u.is_superuser,
        "permissions_json": u.permissions_json,
        "last_login": u.last_login.strftime("%Y-%m-%d %H:%M") if u.last_login else "Nunca",
        "created_at": u.created_at.strftime("%Y-%m-%d %H:%M")
    } for u in users]

@router.post("/users")
def create_user(user_in: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.username == user_in.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="El nombre de usuario ya existe.")

    hashed_pw = get_password_hash(user_in.password)
    default_perms = '{"comercial": true, "proyectos": true, "finanzas": false, "recursos": true, "gastos": true, "executive_bi": false, "mantenimiento": false}'
    
    new_user = User(
        username=user_in.username.strip().lower(),
        full_name=user_in.full_name.strip(),
        email=user_in.email,
        hashed_password=hashed_pw,
        role_name=user_in.role_name,
        permissions_json=default_perms,
        is_active=True,
        is_superuser=(user_in.role_name == "director_general")
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    audit = AuditLog(
        user_id=new_user.id,
        username=new_user.username,
        module="mantenimiento",
        action="crear_usuario",
        details=f"Usuario {new_user.username} creado con rol {new_user.role_name}"
    )
    db.add(audit)
    db.commit()

    return {"success": True, "message": f"Usuario '{new_user.username}' creado con éxito.", "id": new_user.id}

@router.put("/users/{user_id}/permissions")
def update_user_permissions(user_id: int, perm_in: UserPermissionsUpdate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    user.permissions_json = perm_in.permissions_json
    db.commit()

    audit = AuditLog(
        user_id=user.id,
        username=user.username,
        module="mantenimiento",
        action="modificar_permisos",
        details=f"Mapa de permisos actualizado para {user.username}"
    )
    db.add(audit)
    db.commit()

    return {"success": True, "message": f"Permisos actualizados para '{user.username}'."}

@router.put("/users/{user_id}/toggle-status")
def toggle_user_status(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    user.is_active = not user.is_active
    db.commit()

    audit = AuditLog(
        user_id=user.id,
        username=user.username,
        module="mantenimiento",
        action="cambiar_estado",
        details=f"Estado de usuario {user.username} cambiado a {'Activo' if user.is_active else 'Inactivo'}"
    )
    db.add(audit)
    db.commit()

    return {"success": True, "is_active": user.is_active, "message": f"Usuario {user.username} {'activado' if user.is_active else 'desactivado'}."}

# ------------------------------------------------------------------------------
# 2. BITÁCORA DE AUDITORÍA (TIPO PROFIT PLUS)
# ------------------------------------------------------------------------------
@router.get("/audit-logs")
def get_audit_logs(db: Session = Depends(get_db)):
    logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(100).all()
    return [{
        "id": l.id,
        "username": l.username,
        "module": l.module,
        "action": l.action,
        "details": l.details,
        "created_at": l.created_at.strftime("%Y-%m-%d %H:%M:%S")
    } for l in logs]

# ------------------------------------------------------------------------------
# 3. 💾 MÓDULO DE COPIAS DE SEGURIDAD & RESPALDOS (AUTO-BACKUP & RESTORE)
# ------------------------------------------------------------------------------
@router.get("/backups")
def list_backups():
    files = glob.glob(os.path.join(BACKUP_DIR, "dalor_backup_*.db"))
    backups = []
    for f in files:
        fname = os.path.basename(f)
        size_bytes = os.path.getsize(f)
        mtime = os.path.getmtime(f)
        backups.append({
            "filename": fname,
            "size_kb": round(size_bytes / 1024, 2),
            "size_mb": round(size_bytes / (1024 * 1024), 2),
            "created_at": datetime.fromtimestamp(mtime).strftime("%Y-%m-%d %H:%M:%S")
        })
    backups.sort(key=lambda x: x["created_at"], reverse=True)
    return backups

@router.post("/backups/create")
def create_backup(db: Session = Depends(get_db)):
    src_db = get_db_file_path()
    if not os.path.exists(src_db):
        raise HTTPException(status_code=404, detail=f"Base de datos no encontrada en {src_db}.")

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_filename = f"dalor_backup_{timestamp}.db"
    dest_path = os.path.join(BACKUP_DIR, backup_filename)

    shutil.copyfile(src_db, dest_path)
    size_kb = round(os.path.getsize(dest_path) / 1024, 2)

    audit = AuditLog(
        username="admin",
        module="seguridad",
        action="crear_respaldo_bd",
        details=f"Copia de seguridad generada con éxito: {backup_filename} ({size_kb} KB)"
    )
    db.add(audit)
    db.commit()

    return {
        "success": True,
        "message": f"Copia de seguridad '{backup_filename}' generada exitosamente ({size_kb} KB).",
        "filename": backup_filename,
        "size_kb": size_kb
    }

@router.get("/backups/download/{filename}")
def download_backup(filename: str):
    file_path = os.path.join(BACKUP_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Archivo de respaldo no encontrado.")
    return FileResponse(path=file_path, filename=filename, media_type="application/octet-stream")

@router.post("/backups/restore/{filename}")
def restore_backup(filename: str, db: Session = Depends(get_db)):
    backup_path = os.path.join(BACKUP_DIR, filename)
    if not os.path.exists(backup_path):
        raise HTTPException(status_code=404, detail="El archivo de respaldo no existe.")

    src_db = get_db_file_path()

    pre_restore_filename = f"pre_restore_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.db"
    shutil.copyfile(src_db, os.path.join(BACKUP_DIR, pre_restore_filename))

    shutil.copyfile(backup_path, src_db)

    audit = AuditLog(
        username="admin",
        module="seguridad",
        action="restaurar_respaldo_bd",
        details=f"Base de datos restaurada desde la copia: {filename}"
    )
    db.add(audit)
    db.commit()

    return {
        "success": True,
        "message": f"Base de datos restaurada con éxito a partir de '{filename}'."
    }

# ------------------------------------------------------------------------------
# 4. 🧹 PUESTA A CERO / PURGAR REGISTROS DE PRUEBA (SOLO DIRECTOR GENERAL)
# ------------------------------------------------------------------------------
class ResetCleanSlateInput(BaseModel):
    director_password: str

@router.post("/reset-to-clean-slate")
def reset_to_clean_slate(input_data: ResetCleanSlateInput, db: Session = Depends(get_db)):
    director = db.query(User).filter(User.username == "director").first()
    authorized = False
    if director and verify_password(input_data.director_password, director.hashed_password):
        authorized = True
    else:
        admin = db.query(User).filter(User.username == "admin").first()
        if admin and verify_password(input_data.director_password, admin.hashed_password):
            authorized = True

    if not authorized:
        raise HTTPException(status_code=403, detail="Contraseña de Director General incorrecta. Acción cancelada por seguridad.")

    from app.models.models import (
        Expense, Quotation, QuotationItem, Project, ProjectPhase,
        AccountReceivable, AccountPayable, ResourceAssignmentHistory,
        PartnerWithdrawal, FinancialPayment, MaterialMovement, Asset
    )

    # 1. Purgar tablas operacionales
    db.query(Expense).delete()
    db.query(QuotationItem).delete()
    db.query(Quotation).delete()
    db.query(AccountReceivable).delete()
    db.query(AccountPayable).delete()
    db.query(ResourceAssignmentHistory).delete()
    db.query(PartnerWithdrawal).delete()
    db.query(FinancialPayment).delete()
    db.query(MaterialMovement).delete()
    db.query(ProjectPhase).delete()
    db.query(Project).delete()

    # 2. Resetear activos a su estado base disponible en Sede
    db.query(Asset).update({
        "status": "disponible_base",
        "current_location": "Sede Central",
        "current_project_id": None,
        "current_custodian_name": None
    })

    # 3. Registrar auditoría
    audit = AuditLog(
        username="director",
        module="seguridad",
        action="reset_puesta_a_cero",
        details="Puesta a Cero ejecutada por Director General: Todos los registros de prueba fueron purgados para iniciar operación real en limpio."
    )
    db.add(audit)
    db.commit()

    return {
        "success": True,
        "message": "Puesta a Cero completada con éxito. Todos los registros de prueba han sido purgados y la base de datos está en cero para la operación real."
    }

