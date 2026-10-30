from fastapi import Depends, APIRouter
from .materials_entries import router as entries_router
from .materials_consumption import router as consumption_router
from .materials_requisitions import router as requisitions_router
from .materials_movements import router as movements_router
from .materials_catalog import router as catalog_router
from app.api.deps import get_current_active_user

router = APIRouter(dependencies=[Depends(get_current_active_user)])

# Prioridad: registrar rutas específicas/estáticas antes de las dinámicas /{material_id}
router.include_router(entries_router)
router.include_router(consumption_router)
router.include_router(requisitions_router)
router.include_router(movements_router)
router.include_router(catalog_router)
