"""
Unified APIRouter aggregating all submodules of the services domain.
"""
from fastapi import Depends, APIRouter
from .services_catalog import router as catalog_router
from app.api.deps import get_current_active_user

router = APIRouter(dependencies=[Depends(get_current_active_user)])
router.include_router(catalog_router)
