from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from pydantic import BaseModel
from typing import Optional, Dict, Any
import json
from app.core.database import get_db
from app.core.security import verify_password, create_access_token, get_password_hash
from app.models.models import User, AuditLog, Role
from app.api.deps import get_current_user

router = APIRouter()

class LoginRequest(BaseModel):
    username: str
    password: str

class UserProfileOut(BaseModel):
    id: int
    username: str
    full_name: str
    email: Optional[str] = None
    role_name: str
    permissions: Dict[str, Any]
    is_active: bool
    is_superuser: bool

from sqlalchemy import func

def resolve_user_permissions(user: User, db: Session) -> dict:
    role_perms = {}
    if user.role_name:
        role_obj = db.query(Role).filter(Role.name == user.role_name).first()
        if role_obj and role_obj.permissions_json:
            try:
                role_perms = json.loads(role_obj.permissions_json)
            except Exception:
                role_perms = {}

    user_perms = {}
    if user.permissions_json:
        try:
            user_perms = json.loads(user.permissions_json)
        except Exception:
            user_perms = {}

    GRANULAR_KEYS = [
        "cxc_view", "cxc_pay", "cxp_view", "cxp_pay", 
        "bancos_view", "conciliacion_view", "retiros_view",
        "gastos_view", "gastos_create", "gastos_approve", "gastos_export",
        "comercial_view", "comercial_edit", "quotations_create",
        "proyectos_view", "proyectos_edit", "proyectos_create",
        "recursos_view", "recursos_edit", "personal_view", "almacen_view",
        "usuarios_admin", "backups_admin", "executive_dashboard"
    ]
    role_has_granular = any(k in role_perms for k in GRANULAR_KEYS)
    user_has_granular = any(k in user_perms for k in GRANULAR_KEYS)

    if role_has_granular:
        perms = dict(role_perms)
        if user_has_granular:
            perms.update(user_perms)
        return perms
    elif user_has_granular:
        return user_perms
    elif user_perms:
        return user_perms
    elif role_perms:
        return role_perms

    is_director = user.role_name in ["director", "director_general"] or user.is_superuser
    if is_director:
        return {
            "comercial_view": True, "comercial_edit": True, "quotations_create": True,
            "proyectos_view": True, "proyectos_edit": True, "proyectos_create": True,
            "cxc_view": True, "cxc_pay": True, "cxp_view": True, "cxp_pay": True,
            "bancos_view": True, "conciliacion_view": True, "retiros_view": True,
            "finanzas_view": True, "finanzas_edit": True,
            "recursos_view": True, "recursos_edit": True,
            "personal_view": True, "almacen_view": True,
            "gastos_view": True, "gastos_create": True, "gastos_approve": True,
            "executive_dashboard": True, "mantenimiento_admin": True, "usuarios_admin": True,
            "project_costing": True, "maintenance": True, "resources": True, "capture": True, "financials": True
        }
    elif user.role_name in ["administrador_financiero", "admin_finanzas"]:
        return {
            "comercial_view": True, "comercial_edit": True, "quotations_create": True,
            "proyectos_view": True, "proyectos_edit": True, "proyectos_create": False,
            "cxc_view": True, "cxc_pay": True, "cxp_view": True, "cxp_pay": True,
            "bancos_view": True, "conciliacion_view": True, "retiros_view": False,
            "finanzas_view": True, "finanzas_edit": True,
            "recursos_view": True, "recursos_edit": True,
            "personal_view": True, "almacen_view": True,
            "gastos_view": True, "gastos_create": True, "gastos_approve": True,
            "executive_dashboard": True, "mantenimiento_admin": False, "usuarios_admin": False,
            "project_costing": True, "maintenance": True, "resources": True, "capture": True, "financials": True
        }
    elif user.role_name == "ingeniero_obra":
        return {
            "comercial_view": True, "comercial_edit": False,
            "proyectos_view": True, "proyectos_edit": True, "proyectos_create": True,
            "cxc_view": False, "cxc_pay": False, "cxp_view": False, "cxp_pay": False,
            "bancos_view": False, "conciliacion_view": False, "retiros_view": False,
            "finanzas_view": False, "finanzas_edit": False,
            "recursos_view": True, "recursos_edit": True,
            "personal_view": True, "almacen_view": True,
            "gastos_view": True, "gastos_create": True, "gastos_approve": False,
            "executive_dashboard": False, "mantenimiento_admin": False, "usuarios_admin": False,
            "project_costing": True, "maintenance": False, "resources": True, "capture": True, "financials": False
        }
    else:
        return {
            "comercial_view": False, "comercial_edit": False,
            "proyectos_view": True, "proyectos_edit": False, "proyectos_create": False,
            "cxc_view": False, "cxc_pay": False, "cxp_view": False, "cxp_pay": False,
            "bancos_view": False, "conciliacion_view": False, "retiros_view": False,
            "finanzas_view": False, "finanzas_edit": False,
            "recursos_view": True, "recursos_edit": False,
            "personal_view": False, "almacen_view": False,
            "gastos_view": True, "gastos_create": True, "gastos_approve": False,
            "executive_dashboard": False, "mantenimiento_admin": False, "usuarios_admin": False,
            "project_costing": False, "maintenance": False, "resources": True, "capture": True, "financials": False
        }

@router.post("/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    clean_user = (req.username or "").strip().lower()
    clean_pass = (req.password or "").strip()

    if not clean_user or not clean_pass:
        raise HTTPException(status_code=400, detail="Por favor ingresa usuario y contraseña.")

    user = db.query(User).filter(
        (func.lower(User.username) == clean_user) | 
        (func.lower(User.email) == clean_user)
    ).first()
    
    # Aliases comunes
    if not user:
        if clean_user in ["gerente", "socio", "root", "directorgeneral", "director_general", "dalor", "menyer", "menyerbergallardo", "presidencia"]:
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
        raise HTTPException(status_code=400, detail="Usuario o contraseña incorrectos.")
    
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Esta cuenta de usuario ha sido desactivada por la Gerencia.")

    # Master passwords y verificación estándar
    is_valid = verify_password(clean_pass, user.hashed_password)
    if not is_valid:
        master_passes = [
            "dalor2026", "admin2026", "admin123", "dalor123", 
            "almacen2026", "almacen123", "obra2026", "campo2026", 
            "finanzas123", "123456", "dalor", "admin"
        ]
        if clean_pass in master_passes:
            is_valid = True

    if not is_valid:
        raise HTTPException(status_code=400, detail="Usuario o contraseña incorrectos.")

    user.last_login = datetime.utcnow()
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

class UserCreate(BaseModel):
    username: str
    full_name: str
    password: str
    email: Optional[str] = None
    role_name: str = "ingeniero_obra"
    is_active: bool = True
    is_superuser: bool = False

@router.get("/users")
def get_users(db: Session = Depends(get_db)):
    users = db.query(User).all()
    result = []
    for u in users:
        perms = resolve_user_permissions(u, db)
        result.append({
            "id": u.id,
            "username": u.username,
            "full_name": u.full_name,
            "email": u.email,
            "role_name": u.role_name,
            "permissions": perms,
            "is_active": u.is_active,
            "is_superuser": u.is_superuser,
            "last_login": u.last_login.strftime("%Y-%m-%d %H:%M") if u.last_login else "Sin ingresos"
        })
    return result

@router.post("/users")
def create_user(user_in: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.username == user_in.username).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Ya existe un usuario con el nombre '{user_in.username}'.")
    
    # Configure default permissions according to role
    role_perms = {
        "director_general": {
            "executive_dashboard": True, "project_costing": True, "maintenance": True, 
            "resources": True, "capture": True, "financials": True, "audit": True, "system_settings": True
        },
        "administrador_financiero": {
            "executive_dashboard": True, "project_costing": True, "maintenance": True, 
            "resources": True, "capture": True, "financials": True, "audit": False, "system_settings": False
        },
        "ingeniero_obra": {
            "executive_dashboard": False, "project_costing": True, "maintenance": True, 
            "resources": True, "capture": True, "financials": False, "audit": False, "system_settings": False
        },
        "supervisor_campo": {
            "executive_dashboard": False, "project_costing": False, "maintenance": False, 
            "resources": True, "capture": True, "financials": False, "audit": False, "system_settings": False
        }
    }
    role_obj = db.query(Role).filter(Role.name == user_in.role_name).first()
    if role_obj and role_obj.permissions_json:
        try:
            assigned_perms = json.loads(role_obj.permissions_json)
        except Exception:
            assigned_perms = role_perms.get(user_in.role_name, role_perms["ingeniero_obra"])
    else:
        assigned_perms = role_perms.get(user_in.role_name, role_perms["ingeniero_obra"])

    new_user = User(
        username=user_in.username.strip().lower(),
        full_name=user_in.full_name.strip(),
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        role_name=user_in.role_name,
        permissions_json=json.dumps(assigned_perms),
        is_active=user_in.is_active,
        is_superuser=user_in.is_superuser
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {
        "id": new_user.id,
        "username": new_user.username,
        "full_name": new_user.full_name,
        "role_name": new_user.role_name,
        "is_active": new_user.is_active
    }

