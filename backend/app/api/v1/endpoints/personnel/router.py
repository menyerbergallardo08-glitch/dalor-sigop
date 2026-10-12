"""
Unified APIRouter aggregating all submodules of the personnel domain.
"""
from fastapi import APIRouter
from .personnel_crud import router as crud_router
from .personnel_history import router as history_router

router = APIRouter()
router.include_router(crud_router)
router.include_router(history_router)
