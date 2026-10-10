from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.models import User, Role, AuditLog
from app.core.security import get_password_hash
from app.api.deps import require_roles
from .maintenance_common import UserCreate, UserUpdate, UserPermissionsUpdate

router = APIRouter()

@router.get("/users", dependencies=[Depends(require_roles(["director_general", "administrador_financiero"]))])
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

@router.post("/users", dependencies=[Depends(require_roles(["director_general"]))])
def create_user(user_in: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.username == user_in.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="El nombre de usuario ya existe.")

    hashed_pw = get_password_hash(user_in.password)
    
    # Resolving permissions: from payload, or role, or default
    perms = user_in.permissions_json
    if not perms:
        assigned_role = db.query(Role).filter(Role.name == user_in.role_name).first()
        if assigned_role and assigned_role.permissions_json:
            perms = assigned_role.permissions_json
        else:
            perms = '{"comercial": true, "proyectos": true, "finanzas": false, "recursos": true, "gastos": true, "executive_bi": false, "mantenimiento": false}'

    new_user = User(
        username=user_in.username.strip().lower(),
        full_name=user_in.full_name.strip(),
        email=user_in.email,
        hashed_password=hashed_pw,
        role_name=user_in.role_name,
        permissions_json=perms,
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

@router.put("/users/{user_id}", dependencies=[Depends(require_roles(["director_general"]))])
def update_user(user_id: int, user_in: UserUpdate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    if user_in.full_name is not None:
        user.full_name = user_in.full_name.strip()
    if user_in.email is not None:
        user.email = user_in.email.strip()
    if user_in.role_name is not None:
        user.role_name = user_in.role_name.strip()
        user.is_superuser = (user.role_name == "director_general")
        if user_in.permissions_json is None:
            assigned_role = db.query(Role).filter(Role.name == user.role_name).first()
            if assigned_role and assigned_role.permissions_json:
                user.permissions_json = assigned_role.permissions_json
    if user_in.permissions_json is not None:
        user.permissions_json = user_in.permissions_json
    if user_in.password:
        user.hashed_password = get_password_hash(user_in.password)

    db.commit()
    audit = AuditLog(
        user_id=user.id,
        username=user.username,
        module="mantenimiento",
        action="modificar_usuario",
        details=f"Perfil y permisos de usuario {user.username} actualizados"
    )
    db.add(audit)
    db.commit()

    return {"success": True, "message": f"Usuario '{user.username}' actualizado con éxito."}

@router.put("/users/{user_id}/permissions", dependencies=[Depends(require_roles(["director_general"]))])
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

@router.put("/users/{user_id}/toggle-status", dependencies=[Depends(require_roles(["director_general"]))])
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

