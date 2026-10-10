from fastapi import APIRouter
from .auth_session import router as session_router
from .auth_users import router as users_router

router = APIRouter()

# 1. Sesión y perfil de usuario autenticado
router.include_router(session_router, tags=["Autenticación - Sesión"])
# 2. Gestión de usuarios del sistema
router.include_router(users_router, tags=["Autenticación - Usuarios"])
