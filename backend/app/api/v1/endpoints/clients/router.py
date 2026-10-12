"""
Unified APIRouter aggregating all submodules of the clients domain.
"""
from fastapi import APIRouter
from .clients_crud import router as crud_router
from .clients_analytics import router as analytics_router

router = APIRouter()
router.include_router(crud_router)
router.include_router(analytics_router)
