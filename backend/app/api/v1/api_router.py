from fastapi import APIRouter
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
    materials
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Autenticación"])
api_router.include_router(maintenance.router, prefix="/maintenance", tags=["Mantenimiento & Usuarios"])
api_router.include_router(clients.router, prefix="/clients", tags=["Clientes"])
api_router.include_router(services.router, prefix="/services", tags=["Catálogo de Servicios"])
api_router.include_router(quotations.router, prefix="/quotations", tags=["Presupuestos & APU"])
api_router.include_router(projects.router, prefix="/projects", tags=["Proyectos"])
api_router.include_router(resources.router, prefix="/resources", tags=["Matriz de Recursos"])
api_router.include_router(materials.router, prefix="/materials", tags=["Inventario de Materiales"])
api_router.include_router(expenses.router, prefix="/expenses", tags=["Gastos & Imputación"])
api_router.include_router(financial.router, prefix="/financial", tags=["Módulo Financiero & CxC/CxP"])
api_router.include_router(assets.router, prefix="/assets", tags=["Flota & Activos"])
api_router.include_router(personnel.router, prefix="/personnel", tags=["Personal"])
api_router.include_router(reports.router, prefix="/reports", tags=["Reportes & Dashboard"])
api_router.include_router(ocr.router, prefix="/ocr", tags=["OCR & PDF"])
