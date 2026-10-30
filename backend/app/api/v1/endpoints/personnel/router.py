"""
Unified APIRouter aggregating all submodules of the personnel domain.
"""
from fastapi import Depends, APIRouter
from .personnel_crud import router as crud_router
from .personnel_history import router as history_router
from app.api.deps import get_current_active_user

router = APIRouter(dependencies=[Depends(get_current_active_user)])
router.include_router(crud_router)
router.include_router(history_router)
