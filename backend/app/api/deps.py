from fastapi import Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.models import User
from typing import Optional, List

def get_current_user(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> User:
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No autenticado. Token de acceso requerido en encabezado Authorization.",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    auth_parts = authorization.strip().split()
    if len(auth_parts) != 2 or auth_parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Formato de autenticación inválido. Debe ser 'Bearer <token>'.",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    token = auth_parts[1]
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de acceso inválido, manipulado o expirado.",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    username = payload["sub"]
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="El usuario asociado a este token no existe.",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cuenta de usuario desactivada o suspendida por la Gerencia."
        )
    
    return user

def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    return current_user

def require_roles(allowed_roles: List[str]):
    def role_checker(
        current_user: User = Depends(get_current_user)
    ) -> User:
        role = (current_user.role_name or "").lower()
        if current_user.is_superuser or any(r.lower() in role for r in allowed_roles):
            return current_user
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Acceso denegado. Se requiere uno de los siguientes roles: {', '.join(allowed_roles)} (Rol actual: {current_user.role_name})"
        )
    return role_checker

