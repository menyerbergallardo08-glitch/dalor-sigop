"""
Unified APIRouter aggregating all submodules of the reports domain.
"""
from fastapi import Depends, APIRouter
from .reports_dashboard import router as dashboard_router
from app.api.deps import get_current_active_user

router = APIRouter(dependencies=[Depends(get_current_active_user)])
router.include_router(dashboard_router)
