from fastapi import Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.models import User
from typing import Optional, List

def get_current_user(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> Optional[User]:
    if not authorization:
        return None
    token = authorization.replace("Bearer ", "").strip()
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        return None
    username = payload["sub"]
    return db.query(User).filter(User.username == username).first()

def require_roles(allowed_roles: List[str]):
    def role_checker(
        current_user: Optional[User] = Depends(get_current_user)
    ):
        if not current_user:
            return None
        role = (current_user.role_name or "").lower()
        uname = (current_user.username or "").lower()
        if current_user.is_superuser or uname == "director" or any(r in role for r in allowed_roles):
            return current_user
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Acceso denegado. Este módulo requiere uno de los siguientes roles: {', '.join(allowed_roles)}"
        )
    return role_checker
