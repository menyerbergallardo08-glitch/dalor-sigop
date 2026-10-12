"""
Unified APIRouter aggregating all submodules of the reports domain.
"""
from fastapi import APIRouter
from .reports_dashboard import router as dashboard_router

router = APIRouter()
router.include_router(dashboard_router)
