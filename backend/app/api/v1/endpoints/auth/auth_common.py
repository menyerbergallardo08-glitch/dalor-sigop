import json
from typing import Optional, Dict, Any
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.models.models import User, Role

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

class UserCreate(BaseModel):
    username: str
    full_name: str
    password: str
    email: Optional[str] = None
    role_name: str = "ingeniero_obra"
    is_active: bool = True
    is_superuser: bool = False

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
            "comercial_view": True, "comercial_edit": False, "quotations_create": False,
            "proyectos_view": True, "proyectos_edit": True, "proyectos_create": False,
            "cxc_view": False, "cxc_pay": False, "cxp_view": False, "cxp_pay": False,
            "bancos_view": False, "conciliacion_view": False, "retiros_view": False,
            "finanzas_view": False, "finanzas_edit": False,
            "recursos_view": True, "recursos_edit": True,
            "personal_view": True, "almacen_view": True,
            "gastos_view": True, "gastos_create": True, "gastos_approve": False,
            "executive_dashboard": False, "mantenimiento_admin": True, "usuarios_admin": False,
            "project_costing": True, "maintenance": True, "resources": True, "capture": True, "financials": False
        }
    elif user.role_name == "supervisor_campo":
        return {
            "comercial_view": False, "comercial_edit": False, "quotations_create": False,
            "proyectos_view": True, "proyectos_edit": False, "proyectos_create": False,
            "cxc_view": False, "cxc_pay": False, "cxp_view": False, "cxp_pay": False,
            "bancos_view": False, "conciliacion_view": False, "retiros_view": False,
            "finanzas_view": False, "finanzas_edit": False,
            "recursos_view": True, "recursos_edit": False,
            "personal_view": True, "almacen_view": True,
            "gastos_view": True, "gastos_create": True, "gastos_approve": False,
            "executive_dashboard": False, "mantenimiento_admin": False, "usuarios_admin": False,
            "project_costing": False, "maintenance": False, "resources": True, "capture": True, "financials": False
        }
    return {
        "comercial_view": False, "comercial_edit": False, "quotations_create": False,
        "proyectos_view": True, "proyectos_edit": False, "proyectos_create": False,
        "cxc_view": False, "cxc_pay": False, "cxp_view": False, "cxp_pay": False,
        "bancos_view": False, "conciliacion_view": False, "retiros_view": False,
        "finanzas_view": False, "finanzas_edit": False,
        "recursos_view": True, "recursos_edit": False,
        "personal_view": True, "almacen_view": True,
        "gastos_view": True, "gastos_create": True, "gastos_approve": False,
        "executive_dashboard": False, "mantenimiento_admin": False, "usuarios_admin": False,
        "project_costing": False, "maintenance": False, "resources": True, "capture": True, "financials": False
    }
