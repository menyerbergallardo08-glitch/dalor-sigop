from fastapi import APIRouter
from .materials_entries import router as entries_router
from .materials_consumption import router as consumption_router
from .materials_requisitions import router as requisitions_router
from .materials_movements import router as movements_router
from .materials_catalog import router as catalog_router

router = APIRouter()

# Prioridad: registrar rutas específicas/estáticas antes de las dinámicas /{material_id}
router.include_router(entries_router)
router.include_router(consumption_router)
router.include_router(requisitions_router)
router.include_router(movements_router)
router.include_router(catalog_router)
