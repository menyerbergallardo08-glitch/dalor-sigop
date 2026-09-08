from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from pydantic import BaseModel
from typing import Optional, Dict, Any
import json
from app.core.database import get_db
from app.core.security import verify_password, create_access_token, get_password_hash
from app.models.models import User, AuditLog

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

@router.post("/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == req.username).first()
    if not user:
        raise HTTPException(status_code=400, detail="Usuario o contraseña incorrectos.")
    
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Esta cuenta de usuario ha sido desactivada por la Gerencia.")

    if not verify_password(req.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Usuario o contraseña incorrectos.")

    user.last_login = datetime.utcnow()
    db.commit()

    # Parse permissions
    perms = {}
    if user.permissions_json:
        try:
            perms = json.loads(user.permissions_json)
        except Exception:
            perms = {}

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
            "is_superuser": user.is_superuser
        }
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
        perms = {}
        if u.permissions_json:
            try:
                perms = json.loads(u.permissions_json)
            except Exception:
                perms = {}
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

