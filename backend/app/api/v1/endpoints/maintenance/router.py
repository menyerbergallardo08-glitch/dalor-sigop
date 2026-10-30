from fastapi import Depends, APIRouter
from .maintenance_roles import router as roles_router
from .maintenance_users import router as users_router
from .maintenance_audit import router as audit_router
from .maintenance_backups import router as backups_router
from .maintenance_database import router as database_router
from app.api.deps import get_current_active_user

router = APIRouter(dependencies=[Depends(get_current_active_user)])

# Prioridad de registro: rutas específicas antes de rutas dinámicas
router.include_router(roles_router)
router.include_router(users_router)
router.include_router(audit_router)
router.include_router(backups_router)
router.include_router(database_router)
