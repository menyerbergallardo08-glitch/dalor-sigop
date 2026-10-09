"""
Router modular y ultraliviano para Reportes Financieros, Business Intelligence y Libros Contables.
Delega toda la computación pesada a:
- app.services.bi_metrics_service.BIMetricsService
- app.services.financial_excel_service.FinancialExcelService
"""
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from pydantic import BaseModel

from app.core.database import get_db
from app.models.models import ExpenseCategory, User as UserModel
from app.api.deps import get_current_user
from app.services.bi_metrics_service import BIMetricsService
from app.services.financial_excel_service import FinancialExcelService

router = APIRouter()

# ------------------------------------------------------------------------------
# 1. BUSINESS INTELLIGENCE & ANALYTICS EJECUTIVO
# ------------------------------------------------------------------------------
@router.get("/bi-metrics")
def get_bi_metrics(
    year: Optional[str] = None,
    client_id: Optional[int] = None,
    region: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Retorna métricas ejecutivas consolidadas desde la base de datos de Dalor SIGO-P.
    """
    return BIMetricsService.calculate_executive_bi_metrics(
        db=db,
        year=year,
        client_id=client_id,
        region=region
    )

# ------------------------------------------------------------------------------
# 2. LIBRO DE VENTAS (DATOS Y EXCEL)
# ------------------------------------------------------------------------------
@router.get("/reports/libro-ventas/data")
def get_libro_ventas_data(
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None, ge=2020, le=2040),
    filter_type: Optional[str] = Query("all"),
    db: Session = Depends(get_db)
):
    """
    Retorna los datos del Libro de Ventas para visualización en pantalla y reportes.
    """
    return FinancialExcelService.get_libro_ventas_data(
        month=month,
        year=year,
        filter_type=filter_type,
        db=db
    )

@router.get("/reports/libro-ventas/excel")
def export_libro_ventas_excel(
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None, ge=2020, le=2040),
    filter_type: Optional[str] = Query("all"),
    db: Session = Depends(get_db)
):
    """
    Genera y descarga el archivo Excel oficial del Libro de Ventas.
    """
    return FinancialExcelService.export_libro_ventas_excel(
        month=month,
        year=year,
        filter_type=filter_type,
        db=db
    )

# ------------------------------------------------------------------------------
# 3. LIBRO DE COMPRAS (DATOS Y EXCEL)
# ------------------------------------------------------------------------------
@router.get("/reports/libro-compras/data")
def get_libro_compras_data(
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None, ge=2020, le=2040),
    filter_type: Optional[str] = Query("all"),
    db: Session = Depends(get_db)
):
    """
    Retorna los datos del Libro de Compras para visualización en pantalla y reportes.
    """
    return FinancialExcelService.get_libro_compras_data(
        month=month,
        year=year,
        filter_type=filter_type,
        db=db
    )

@router.get("/reports/libro-compras/excel")
def export_libro_compras_excel(
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None, ge=2020, le=2040),
    filter_type: Optional[str] = Query("all"),
    db: Session = Depends(get_db)
):
    """
    Genera y descarga el archivo Excel oficial del Libro de Compras.
    """
    return FinancialExcelService.export_libro_compras_excel(
        month=month,
        year=year,
        filter_type=filter_type,
        db=db
    )

# ------------------------------------------------------------------------------
# 4. IMPORTACIÓN MASIVA DE LIBROS EXCEL
# ------------------------------------------------------------------------------
@router.post("/import-libros-excel")
async def import_libros_excel(
    file: UploadFile = File(...),
    target_book: str = Query("compras"),
    preview: bool = Query(True),
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """
    Importa transacciones fiscales a partir de un archivo Excel.
    """
    return await FinancialExcelService.import_libros_excel(
        file=file,
        target_book=target_book,
        preview=preview,
        db=db,
        current_user=current_user
    )

# ------------------------------------------------------------------------------
# 5. CONCEPTOS DE GASTO Y REGLAS DE NEGOCIO
# ------------------------------------------------------------------------------
class ExpenseConceptCreate(BaseModel):
    name: str
    business_rule: str = "costo_material_obra"
    description: Optional[str] = None

@router.get("/expense-concepts")
def get_expense_concepts(db: Session = Depends(get_db)):
    """
    Retorna la lista de conceptos de gasto y cuentas por pagar con su regla de negocio asociada.
    """
    categories = db.query(ExpenseCategory).order_by(ExpenseCategory.name.asc()).all()
    result = []
    for c in categories:
        rule = c.business_rule or "costo_material_obra"
        if not c.business_rule:
            low = c.name.lower()
            if any(k in low for k in ["insumo", "material", "compra", "tubo", "plancha"]):
                rule = "costo_material_obra"
            elif any(k in low for k in ["almacen", "stock", "inventario"]):
                rule = "stock_almacen"
            elif any(k in low for k in ["servicio", "honorario", "asesoria", "torno", "soldad"]):
                rule = "servicios_honorarios"
            elif any(k in low for k in ["flota", "maquinaria", "alquiler", "grua", "vehiculo"]):
                rule = "alquiler_maquinaria_ext"
            else:
                rule = "gastos_sede"
        result.append({
            "id": c.id,
            "code": c.code,
            "name": c.name,
            "business_rule": rule,
            "group_type": c.group_type
        })
    return result

@router.post("/expense-concepts")
def create_expense_concept(c_in: ExpenseConceptCreate, db: Session = Depends(get_db)):
    """
    Crea un nuevo concepto de gasto asociado a una regla de negocio específica.
    """
    name = (c_in.name or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="El nombre del concepto no puede estar vacío.")

    valid_rules = ["costo_material_obra", "stock_almacen", "servicios_honorarios", "alquiler_maquinaria_ext", "gastos_sede"]
    rule = c_in.business_rule if c_in.business_rule in valid_rules else "costo_material_obra"

    existing = db.query(ExpenseCategory).filter(ExpenseCategory.name.ilike(name)).first()
    if existing:
        existing.business_rule = rule
        db.commit()
        return {
            "success": True,
            "message": f"Concepto '{existing.name}' actualizado y vinculado a la regla '{rule}'.",
            "concept": {
                "id": existing.id,
                "code": existing.code,
                "name": existing.name,
                "business_rule": existing.business_rule,
                "group_type": existing.group_type
            }
        }

    last_id = db.query(func.max(ExpenseCategory.id)).scalar() or 100
    code = f"CPT-{last_id + 1}"

    new_cat = ExpenseCategory(
        code=code,
        name=name,
        business_rule=rule,
        group_type="operativo" if rule in ["costo_material_obra", "stock_almacen"] else "corporativo"
    )
    db.add(new_cat)
    db.commit()
    db.refresh(new_cat)

    return {
        "success": True,
        "message": f"Concepto '{new_cat.name}' creado exitosamente y asociado a la regla '{rule}'.",
        "concept": {
            "id": new_cat.id,
            "code": new_cat.code,
            "name": new_cat.name,
            "business_rule": new_cat.business_rule,
            "group_type": new_cat.group_type
        }
    }
