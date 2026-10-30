from fastapi import Depends, APIRouter
from .assets_dispatch import router as dispatch_router
from .assets_odometer import router as odometer_router
from .assets_services import router as services_router
from .assets_maintenance import router as maintenance_router
from .assets_core import router as core_router
from app.api.deps import get_current_active_user

router = APIRouter(dependencies=[Depends(get_current_active_user)])
# Registrar primero las rutas con prefijos estáticos específicos antes de /{asset_id}
router.include_router(dispatch_router)
router.include_router(odometer_router)
router.include_router(services_router)
router.include_router(maintenance_router)
router.include_router(core_router)
