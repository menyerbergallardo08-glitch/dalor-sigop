"""
Unified APIRouter aggregating all submodules of the clients domain.
"""
from fastapi import Depends, APIRouter
from .clients_crud import router as crud_router
from .clients_analytics import router as analytics_router
from app.api.deps import get_current_active_user

router = APIRouter(dependencies=[Depends(get_current_active_user)])
router.include_router(crud_router)
router.include_router(analytics_router)
