from fastapi import Depends, HTTPException, status, Header, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import decode_access_token
import json
from app.models.models import User, Role
from typing import Optional, List, Union

def get_current_user(
    authorization: Optional[str] = Header(None),
    token_query: Optional[str] = Query(None, alias="token"),
    db: Session = Depends(get_db)
) -> User:
    token = None
    if authorization:
        auth_parts = authorization.strip().split()
        if len(auth_parts) == 2 and auth_parts[0].lower() == "bearer":
            token = auth_parts[1]
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Formato de autenticación inválido. Debe ser 'Bearer <token>'.",
                headers={"WWW-Authenticate": "Bearer"}
            )
    elif token_query:
        token = token_query.strip()

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No autenticado. Token de acceso requerido en encabezado Authorization o parámetro token.",
            headers={"WWW-Authenticate": "Bearer"}
        )
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

def check_user_has_permission(user: User, perm_key: str, db: Optional[Session] = None) -> bool:
    """Valida jerárquicamente si un usuario tiene un permiso específico."""
    role_name = (user.role_name or "").lower()
    if user.is_superuser or role_name in ["director_general", "director", "root", "admin"]:
        return True

    # 1. Verificar si el usuario tiene permisos específicos individuales adjudicados
    if user.permissions_json:
        try:
            u_perms = json.loads(user.permissions_json) if isinstance(user.permissions_json, str) else user.permissions_json
            if isinstance(u_perms, dict) and perm_key in u_perms:
                return bool(u_perms[perm_key])
        except Exception:
            pass

    # 2. Si no está definido individualmente, consultar la plantilla del rol asignado
    if user.role_name and db is not None:
        role_obj = db.query(Role).filter(Role.name == user.role_name).first()
        if role_obj and role_obj.permissions_json:
            try:
                r_perms = json.loads(role_obj.permissions_json) if isinstance(role_obj.permissions_json, str) else role_obj.permissions_json
                if isinstance(r_perms, dict) and perm_key in r_perms:
                    return bool(r_perms[perm_key])
            except Exception:
                pass

    return False

def require_roles(allowed_roles: List[str], required_permission: Optional[str] = None):
    """
    Control de acceso híbrido:
    Permite el paso si el usuario es Director/Superuser, o si tiene uno de los roles permitidos,
    O si se le ha adjudicado específicamente el permiso requerido en su ficha.
    """
    def role_checker(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
    ) -> User:
        role = (current_user.role_name or "").lower()
        if current_user.is_superuser or role in ["director_general", "director"]:
            return current_user

        # Si se especificó un permiso requerido, verificar si el usuario lo tiene adjudicado
        if required_permission and check_user_has_permission(current_user, required_permission, db):
            return current_user

        # Verificar rol permitido
        if any(r.lower() in role for r in allowed_roles):
            return current_user

        perm_msg = f" o el permiso '{required_permission}'" if required_permission else ""
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Acceso denegado. Se requiere uno de los roles autorizados ({', '.join(allowed_roles)}){perm_msg} (Rol actual: {current_user.role_name})"
        )
    return role_checker

def require_permission(permission_key: str, fallback_roles: Optional[List[str]] = None):
    """
    Dependencia de control basada en capacidades/permisos granulares.
    """
    def permission_checker(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
    ) -> User:
        if check_user_has_permission(current_user, permission_key, db):
            return current_user

        if fallback_roles:
            role = (current_user.role_name or "").lower()
            if any(r.lower() in role for r in fallback_roles):
                return current_user

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Permiso insuficiente. Se requiere el permiso específico '{permission_key}' para ejecutar esta acción."
        )
    return permission_checker


