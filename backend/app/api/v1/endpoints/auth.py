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
