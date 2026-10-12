"""
Unified APIRouter aggregating all submodules of the services domain.
"""
from fastapi import APIRouter
from .services_catalog import router as catalog_router

router = APIRouter()
router.include_router(catalog_router)
