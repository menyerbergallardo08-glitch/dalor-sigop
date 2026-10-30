from fastapi import Depends, APIRouter
from .dispatch_delivery import router as delivery_router
from .dispatch_operations import router as operations_router
from .dispatch_guides import router as guides_router
from app.api.deps import get_current_active_user

router = APIRouter(dependencies=[Depends(get_current_active_user)])

# 1. Rutas con sub-paths específicos primero
router.include_router(delivery_router, tags=["Guías de Despacho - Confirmación"])
# 2. Operaciones de creación y borrado
router.include_router(operations_router, tags=["Guías de Despacho - Operaciones"])
# 3. Listado y detalle por ID
router.include_router(guides_router, tags=["Guías de Despacho - Consultas"])
