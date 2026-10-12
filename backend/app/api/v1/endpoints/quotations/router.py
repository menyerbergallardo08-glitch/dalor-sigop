"""
Unified APIRouter aggregating all submodules of the quotations domain.
"""
from fastapi import APIRouter
from .quotations_crud import router as crud_router
from .quotations_conversion import router as conversion_router

router = APIRouter()
router.include_router(crud_router)
router.include_router(conversion_router)
