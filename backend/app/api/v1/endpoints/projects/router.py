from fastapi import Depends, APIRouter
from .projects_core import router as core_router
from .projects_wbs import router as wbs_router
from .projects_addendums import router as addendums_router
from .projects_materials import router as materials_router
from app.api.deps import get_current_active_user

router = APIRouter(dependencies=[Depends(get_current_active_user)])
router.include_router(core_router)
router.include_router(wbs_router)
router.include_router(addendums_router)
router.include_router(materials_router)
