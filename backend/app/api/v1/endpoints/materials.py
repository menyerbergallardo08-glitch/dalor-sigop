from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List, Optional
from pydantic import BaseModel

from app.core.database import get_db
from app.models.models import (
    Material,
    MaterialMovement,
    Project,
    Expense,
    ExpenseCategory,
    AccountPayable
)

router = APIRouter()

# ------------------------------------------------------------------------------
# PYDANTIC SCHEMAS
# ------------------------------------------------------------------------------
class MaterialCreate(BaseModel):
    code: str
    name: str
    category: str = "Acero Estructural"
    unit_measure: str = "UND"
    stock_quantity: float = 0.0
    min_stock_alert: float = 5.0
    unit_cost_usd: float = 0.0
    location: str = "Almacen Central Dalor"

class MaterialEntryCreate(BaseModel):
    material_id: int
    quantity: float
    unit_cost_usd: float
    supplier_name: Optional[str] = "Proveedor General"
    reference_doc: Optional[str] = None
    notes: Optional[str] = None
    performed_by: Optional[str] = "Custodio de Almacen"
    register_in_cxp: bool = False
    due_days: int = 15

class MaterialConsumeCreate(BaseModel):
    material_id: int
    quantity: float
    project_id: Optional[int] = None
    destination: str = "Taller Central"
    reference_doc: Optional[str] = None
    notes: Optional[str] = None
    performed_by: Optional[str] = "Custodio de Almacen"

# ------------------------------------------------------------------------------
# 1. LISTADO DE MATERIALES & STOCK EN TIEMPO REAL
# ------------------------------------------------------------------------------
@router.get("/")
def get_materials(
    category: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Material).filter(Material.is_active == True)
    if category:
        query = query.filter(Material.category == category)
    if search:
        query = query.filter(
            (Material.name.ilike(f"%{search}%")) | (Material.code.ilike(f"%{search}%"))
        )
    materials = query.order_by(Material.category.asc(), Material.name.asc()).all()
    total_inventory_usd = sum(m.stock_quantity * m.unit_cost_usd for m in materials)

    return {
        "total_items": len(materials),
        "total_inventory_usd": round(total_inventory_usd, 2),
        "materials": [{
            "id": m.id,
            "code": m.code,
            "name": m.name,
            "category": m.category,
            "unit_measure": m.unit_measure,
            "stock_quantity": m.stock_quantity,
            "min_stock_alert": m.min_stock_alert,
            "unit_cost_usd": m.unit_cost_usd,
            "total_cost_usd": round(m.stock_quantity * m.unit_cost_usd, 2),
            "location": m.location,
            "is_low_stock": m.stock_quantity <= m.min_stock_alert
        } for m in materials]
    }

# ------------------------------------------------------------------------------
# 2. CREAR NUEVO ITEM DE MATERIAL
# ------------------------------------------------------------------------------
@router.post("/")
def create_material(m_in: MaterialCreate, db: Session = Depends(get_db)):
    existing = db.query(Material).filter(Material.code == m_in.code.strip().upper()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe un material con este codigo.")

    total_cost = m_in.stock_quantity * m_in.unit_cost_usd
    mat = Material(
        code=m_in.code.strip().upper(),
        name=m_in.name.strip(),
        category=m_in.category,
        unit_measure=m_in.unit_measure.strip().upper(),
        stock_quantity=m_in.stock_quantity,
        min_stock_alert=m_in.min_stock_alert,
        unit_cost_usd=m_in.unit_cost_usd,
        total_cost_usd=total_cost,
        location=m_in.location
    )
    db.add(mat)
    db.commit()
    db.refresh(mat)

    if m_in.stock_quantity > 0:
        mov = MaterialMovement(
            material_id=mat.id,
            movement_type="entrada_inicial",
            quantity=m_in.stock_quantity,
            unit_cost_usd=m_in.unit_cost_usd,
            total_cost_usd=total_cost,
            destination="Almacen Central",
            reference_doc="Inventario Inicial",
            notes="Carga de apertura de inventario"
        )
        db.add(mov)
        db.commit()

    return {"success": True, "message": "Material creado exitosamente.", "id": mat.id}

# ------------------------------------------------------------------------------
# 3. ENTRADA DE MATERIAL (COMPRA / INGRESO A ALMACEN)
# ------------------------------------------------------------------------------
@router.post("/entry")
def record_material_entry(entry: MaterialEntryCreate, db: Session = Depends(get_db)):
    mat = db.query(Material).filter(Material.id == entry.material_id).first()
    if not mat:
        raise HTTPException(status_code=404, detail="Material no encontrado.")

    if entry.quantity <= 0:
        raise HTTPException(status_code=400, detail="La cantidad debe ser mayor a cero.")

    prev_stock = mat.stock_quantity
    prev_cost = mat.unit_cost_usd
    prev_total = prev_stock * prev_cost

    new_qty = entry.quantity
    new_unit_cost = entry.unit_cost_usd
    entry_total = new_qty * new_unit_cost

    total_qty = prev_stock + new_qty
    if total_qty > 0:
        weighted_cost = (prev_total + entry_total) / total_qty
    else:
        weighted_cost = new_unit_cost

    mat.stock_quantity = total_qty
    mat.unit_cost_usd = round(weighted_cost, 4)
    mat.total_cost_usd = round(total_qty * mat.unit_cost_usd, 2)

    movement = MaterialMovement(
        material_id=mat.id,
        movement_type="entrada_compra",
        quantity=new_qty,
        unit_cost_usd=new_unit_cost,
        total_cost_usd=entry_total,
        destination="Almacen Central",
        reference_doc=entry.reference_doc or "Compra de Material",
        notes=f"Proveedor: {entry.supplier_name or 'N/A'}. {entry.notes or ''}",
        performed_by=entry.performed_by
    )
    db.add(movement)

    if entry.register_in_cxp and entry.reference_doc:
        cxp = AccountPayable(
            invoice_number=entry.reference_doc,
            supplier_name=entry.supplier_name or "Proveedor Materiales",
            payable_type="stock_almacen",
            description=f"Compra Stock: {mat.name} ({new_qty} {mat.unit_measure})",
            due_date=datetime.utcnow() + timedelta(days=entry.due_days),
            amount_usd=entry_total,
            amount_bs=entry_total * 800.0,
            balance_usd=entry_total,
            status="pendiente",
            notes=f"Generado automaticamente desde entrada de almacen. {entry.notes or ''}"
        )
        db.add(cxp)

    db.commit()

    return {
        "success": True,
        "message": f"Entrada registrada: +{new_qty} {mat.unit_measure} de {mat.name}.",
        "new_stock": mat.stock_quantity,
        "new_unit_cost_usd": mat.unit_cost_usd,
        "total_value_usd": mat.total_cost_usd
    }

# ------------------------------------------------------------------------------
# 4. SALIDA / DESPACHO DE MATERIAL (A PROYECTO O TALLER)
# ------------------------------------------------------------------------------
@router.post("/consume")
def record_material_consumption(consume: MaterialConsumeCreate, db: Session = Depends(get_db)):
    mat = db.query(Material).filter(Material.id == consume.material_id).first()
    if not mat:
        raise HTTPException(status_code=404, detail="Material no encontrado.")

    if consume.quantity <= 0:
        raise HTTPException(status_code=400, detail="La cantidad a despachar debe ser mayor a cero.")

    if consume.quantity > mat.stock_quantity:
        raise HTTPException(
            status_code=400,
            detail=f"Stock insuficiente ({mat.stock_quantity} {mat.unit_measure} disponibles)."
        )

    consumed_total_usd = consume.quantity * mat.unit_cost_usd
    mat.stock_quantity -= consume.quantity
    mat.total_cost_usd = round(mat.stock_quantity * mat.unit_cost_usd, 2)

    project_name = "Taller Central (Gasto Operativo)"
    if consume.project_id:
        proj = db.query(Project).filter(Project.id == consume.project_id).first()
        if proj:
            project_name = f"Proyecto {proj.code} - {proj.name}"

    movement = MaterialMovement(
        material_id=mat.id,
        movement_type="despacho_obra",
        quantity=consume.quantity,
        unit_cost_usd=mat.unit_cost_usd,
        total_cost_usd=round(consumed_total_usd, 2),
        project_id=consume.project_id,
        destination=consume.destination,
        reference_doc=consume.reference_doc or "Requisicion Interna",
        notes=f"Destino: {project_name}. {consume.notes or ''}",
        performed_by=consume.performed_by
    )
    db.add(movement)

    if consume.project_id:
        cat = db.query(ExpenseCategory).filter(
            (ExpenseCategory.name.ilike("%Insumos%")) | (ExpenseCategory.name.ilike("%Materiales%"))
        ).first()
        cat_id = cat.id if cat else 1

        expense = Expense(
            category_id=cat_id,
            project_id=consume.project_id,
            expense_type="costo_obra",
            description=f"Consumo de Almacen: {consume.quantity} {mat.unit_measure} {mat.name}",
            supplier_vendor="Almacen Central Dalor",
            amount_usd=round(consumed_total_usd, 2),
            amount_bs=round(consumed_total_usd * 800.0, 2),
            exchange_rate=800.0,
            payment_method="consumo_inventario",
            status="aprobado",
            has_receipt=False,
            alert_notes=f"Requisicion #{consume.reference_doc or 'INTERNA'}"
        )
        db.add(expense)

    db.commit()

    return {
        "success": True,
        "message": f"Despacho procesado: -{consume.quantity} {mat.unit_measure} imputados a {project_name}.",
        "remaining_stock": mat.stock_quantity,
        "total_cost_imputed_usd": round(consumed_total_usd, 2)
    }

# ------------------------------------------------------------------------------
# 5. HISTORIAL DE MOVIMIENTOS (KARDEX)
# ------------------------------------------------------------------------------
@router.get("/movements")
def get_material_movements(
    material_id: Optional[int] = None,
    project_id: Optional[int] = None,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    query = db.query(MaterialMovement)
    if material_id:
        query = query.filter(MaterialMovement.material_id == material_id)
    if project_id:
        query = query.filter(MaterialMovement.project_id == project_id)

    rows = query.order_by(MaterialMovement.movement_date.desc()).limit(limit).all()

    return [{
        "id": m.id,
        "material_name": m.material.name if m.material else "N/A",
        "material_code": m.material.code if m.material else "N/A",
        "movement_type": m.movement_type,
        "quantity": m.quantity,
        "unit_measure": m.material.unit_measure if m.material else "UND",
        "unit_cost_usd": m.unit_cost_usd,
        "total_cost_usd": m.total_cost_usd,
        "project_name": m.project.name if m.project else "Taller Central",
        "destination": m.destination,
        "reference_doc": m.reference_doc,
        "notes": m.notes,
        "performed_by": m.performed_by,
        "movement_date": m.movement_date.strftime("%Y-%m-%d %H:%M")
    } for m in rows]
