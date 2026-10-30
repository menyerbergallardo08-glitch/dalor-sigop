"""
Unified APIRouter aggregating all submodules of the quotations domain.
"""
from fastapi import Depends, APIRouter
from .quotations_crud import router as crud_router
from .quotations_conversion import router as conversion_router
from app.api.deps import get_current_active_user

router = APIRouter(dependencies=[Depends(get_current_active_user)])
router.include_router(crud_router)
router.include_router(conversion_router)
