from fastapi import Depends, APIRouter
from .rentals_delivery import router as delivery_router
from .rentals_returns import router as returns_router
from .rentals_operations import router as operations_router
from app.api.deps import get_current_active_user

router = APIRouter(dependencies=[Depends(get_current_active_user)])

# 1. Rutas específicas primero para evitar colisión de path parameters
router.include_router(delivery_router, tags=["Alquileres - Notas de Entrega"])
router.include_router(returns_router, tags=["Alquileres - Retornos"])
router.include_router(operations_router, tags=["Alquileres - Operaciones"])
