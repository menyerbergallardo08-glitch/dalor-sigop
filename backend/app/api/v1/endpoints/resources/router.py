from fastapi import APIRouter
from .resources_matrix import router as matrix_router
from .resources_movements import router as movements_router
from .resources_history import router as history_router

router = APIRouter()

# 1. Matriz de disponibilidad general
router.include_router(matrix_router, tags=["Matriz de Recursos - Estado"])
# 2. Historial de movimientos
router.include_router(history_router, tags=["Matriz de Recursos - Historial"])
# 3. Asignación, transferencia, retorno y sustitución
router.include_router(movements_router, tags=["Matriz de Recursos - Movimientos"])
