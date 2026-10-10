from fastapi import APIRouter
from .expenses_categories import router as categories_router
from .expenses_inbox import router as inbox_router
from .expenses_receipts import router as receipts_router
from .expenses_operations import router as operations_router

router = APIRouter()

# Prioridad estricta de rutas:
# 1. Rutas específicas prefijadas (/categories, /inbox)
# 2. Rutas con parámetros ({expense_id}/receipt)
# 3. Operaciones generales (/, /manual, /import-batch)
router.include_router(categories_router)
router.include_router(inbox_router)
router.include_router(receipts_router)
router.include_router(operations_router)
