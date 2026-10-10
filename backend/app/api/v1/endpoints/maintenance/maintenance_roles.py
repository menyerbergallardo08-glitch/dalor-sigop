import re
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.models import Role, User, AuditLog
from app.api.deps import require_roles
from .maintenance_common import RoleCreate, RoleUpdate

router = APIRouter()

@router.get("/roles", dependencies=[Depends(require_roles(["director_general", "administrador_financiero"]))])
def list_roles(db: Session = Depends(get_db)):
    roles = db.query(Role).order_by(Role.id.asc()).all()
    return [{
        "id": r.id,
        "name": r.name,
        "display_name": r.display_name,
        "description": r.description or "",
        "permissions_json": r.permissions_json,
        "is_system": r.is_system,
        "created_at": r.created_at.strftime("%Y-%m-%d %H:%M") if r.created_at else ""
    } for r in roles]

@router.post("/roles", dependencies=[Depends(require_roles(["director_general"]))])
def create_role(role_in: RoleCreate, db: Session = Depends(get_db)):
    clean_name = re.sub(r'[^a-zA-Z0-9_]', '_', role_in.name.strip().lower())
    existing = db.query(Role).filter(Role.name == clean_name).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"El rol con identificador '{clean_name}' ya existe.")

    new_role = Role(
        name=clean_name,
        display_name=role_in.display_name.strip(),
        description=role_in.description.strip() if role_in.description else "",
        permissions_json=role_in.permissions_json,
        is_system=False
    )
    db.add(new_role)
    db.commit()
    db.refresh(new_role)

    audit = AuditLog(
        username="director_general",
        module="mantenimiento",
        action="crear_rol",
        details=f"Rol de seguridad '{new_role.display_name}' ({new_role.name}) creado"
    )
    db.add(audit)
    db.commit()

    return {"success": True, "message": f"Rol '{new_role.display_name}' creado con éxito.", "id": new_role.id}

@router.put("/roles/{role_id}", dependencies=[Depends(require_roles(["director_general"]))])
def update_role(role_id: int, role_in: RoleUpdate, db: Session = Depends(get_db)):
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Rol no encontrado.")

    if role_in.display_name is not None:
        role.display_name = role_in.display_name.strip()
    if role_in.description is not None:
        role.description = role_in.description.strip()
    if role_in.permissions_json is not None:
        role.permissions_json = role_in.permissions_json
        # Propagar inmediatamente a todos los usuarios asignados a este rol
        db.query(User).filter(User.role_name == role.name).update(
            {"permissions_json": role_in.permissions_json},
            synchronize_session=False
        )
    db.commit()

    audit = AuditLog(
        username="director_general",
        module="mantenimiento",
        action="actualizar_rol",
        details=f"Rol '{role.display_name}' ({role.name}) actualizado y sincronizado a sus usuarios"
    )
    db.add(audit)
    db.commit()

    return {"success": True, "message": f"Rol '{role.display_name}' actualizado y sincronizado con éxito."}

@router.delete("/roles/{role_id}", dependencies=[Depends(require_roles(["director_general"]))])
def delete_role(role_id: int, db: Session = Depends(get_db)):
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Rol no encontrado.")
    if role.is_system:
        raise HTTPException(status_code=400, detail="No se pueden eliminar los roles nativos del sistema.")

    in_use = db.query(User).filter(User.role_name == role.name).first()
    if in_use:
        raise HTTPException(status_code=400, detail=f"No se puede eliminar el rol porque está asignado al usuario '{in_use.username}'.")

    name = role.display_name
    db.delete(role)
    db.commit()

    audit = AuditLog(
        username="director_general",
        module="mantenimiento",
        action="eliminar_rol",
        details=f"Rol '{name}' eliminado"
    )
    db.add(audit)
    db.commit()

    return {"success": True, "message": f"Rol '{name}' eliminado con éxito."}

# ------------------------------------------------------------------------------

