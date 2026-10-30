# transfer_guides.py
# Este módulo está pendiente de implementación y actualmente no se registra en el router.
# Se mantiene como placeholder para evitar ImportError en escaneos automáticos.
from fastapi import Depends, APIRouter
from app.api.deps import get_current_active_user
router = APIRouter(dependencies=[Depends(get_current_active_user)])
