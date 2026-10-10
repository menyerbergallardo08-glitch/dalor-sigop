import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_password_hash
from app.models.models import User, Role
from .auth_common import UserCreate, resolve_user_permissions

router = APIRouter()

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
