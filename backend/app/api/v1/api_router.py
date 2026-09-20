from fastapi import APIRouter, Depends
from app.api.deps import get_current_active_user
from app.api.v1.endpoints import (
    clients,
    services,
    quotations,
    projects,
    resources,
    expenses,
    assets,
    personnel,
    reports,
    ocr,
    financial,
    auth,
    maintenance,
    materials,
    dispatch,
    rentals
)

from sqlalchemy.orm import Session
from app.core.database import get_db

api_router = APIRouter()

# 🔓 Rutas Públicas (Sin Token Requerido para Login/Acceso Inicial)
api_router.include_router(auth.router, prefix="/auth", tags=["Autenticación"])

@api_router.get("/financial/bcv-rate", tags=["Financiero Público"])
@api_router.get("/financial/bcv-rate/", tags=["Financiero Público"])
def public_bcv_rate(force_refresh: bool = False):
    from app.services.bcv_scraper import BCVExchangeRateService
    return BCVExchangeRateService.get_current_rate(force_refresh=force_refresh)

api_router.include_router(projects.public_router, prefix="/projects", tags=["Seguimiento Público"])

# 🔒 Rutas Protegidas por Autenticación JWT (SEC-01: Exigen Bearer Token Válido)
api_router.include_router(maintenance.router, prefix="/maintenance", tags=["Mantenimiento & Usuarios"], dependencies=[Depends(get_current_active_user)])
api_router.include_router(clients.router, prefix="/clients", tags=["Clientes"], dependencies=[Depends(get_current_active_user)])
api_router.include_router(services.router, prefix="/services", tags=["Catálogo de Servicios"], dependencies=[Depends(get_current_active_user)])
api_router.include_router(quotations.router, prefix="/quotations", tags=["Presupuestos & APU"], dependencies=[Depends(get_current_active_user)])
api_router.include_router(projects.router, prefix="/projects", tags=["Proyectos"], dependencies=[Depends(get_current_active_user)])
api_router.include_router(dispatch.router, prefix="/dispatch", tags=["Guías de Despacho & Salida"], dependencies=[Depends(get_current_active_user)])
api_router.include_router(resources.router, prefix="/resources", tags=["Matriz de Recursos"], dependencies=[Depends(get_current_active_user)])
api_router.include_router(materials.router, prefix="/materials", tags=["Inventario de Materiales"], dependencies=[Depends(get_current_active_user)])
api_router.include_router(expenses.router, prefix="/expenses", tags=["Gastos & Imputación"], dependencies=[Depends(get_current_active_user)])
api_router.include_router(financial.router, prefix="/financial", tags=["Módulo Financiero & CxC/CxP"], dependencies=[Depends(get_current_active_user)])
api_router.include_router(assets.router, prefix="/assets", tags=["Flota & Activos"], dependencies=[Depends(get_current_active_user)])
api_router.include_router(personnel.router, prefix="/personnel", tags=["Personal"], dependencies=[Depends(get_current_active_user)])
api_router.include_router(reports.router, prefix="/reports", tags=["Reportes & Dashboard"], dependencies=[Depends(get_current_active_user)])
api_router.include_router(ocr.router, prefix="/ocr", tags=["OCR & PDF"], dependencies=[Depends(get_current_active_user)])
api_router.include_router(rentals.router, prefix="/rentals", tags=["Alquileres & Préstamos de Equipos"], dependencies=[Depends(get_current_active_user)])

