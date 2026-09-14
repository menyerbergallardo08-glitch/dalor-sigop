from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

from app.core.database import get_db
from app.models.models import Material, MaterialMovement, Project, Expense, ExpenseCategory, AuditLog

router = APIRouter()

class MaterialCreate(BaseModel):
    code: str
    name: str
    category: Optional[str] = "Acero & Perfiles"
    unit_of_measure: Optional[str] = "Unidad"
    current_stock: Optional[float] = 0.0
    minimum_stock: Optional[float] = 5.0
    unit_cost_usd: Optional[float] = 0.0
    location: Optional[str] = "Almacén Central / Galpón Dalor"

class MaterialEntryRequest(BaseModel):
    material_id: int
    quantity: float
    unit_cost_usd: float
    supplier_vendor: Optional[str] = "Proveedor Puntual"
    invoice_number: Optional[str] = None
    payment_method: Optional[str] = "transferencia"
    exchange_rate: Optional[float] = 800.0
    performed_by: Optional[str] = "Custodio de Almacén"
    notes: Optional[str] = None

class MaterialConsumeRequest(BaseModel):
    material_id: int
    quantity: float
    project_id: Optional[int] = None # None = Consumo interno de taller
    performed_by: Optional[str] = "Custodio de Almacén"
    notes: Optional[str] = None

@router.get("/")
def get_materials(category: Optional[str] = None, db: Session = Depends(get_db)):
    """Retorna todo el catálogo de materiales con stock disponible y valorización."""
    query = db.query(Material).filter(Material.is_active == True)
    if category and category != "todos":
        query = query.filter(Material.category == category)
    materials = query.order_by(Material.category.asc(), Material.name.asc()).all()

    total_inventory_value = sum(m.current_stock * m.unit_cost_usd for m in materials)

    return {
        "summary": {
            "total_items": len(materials),
            "total_inventory_value_usd": round(total_inventory_value, 2),
            "low_stock_count": len([m for m in materials if m.current_stock <= m.minimum_stock])
        },
        "materials": [
            {
                "id": m.id,
                "code": m.code,
                "name": m.name,
                "category": m.category,
                "unit_of_measure": m.unit_of_measure,
                "current_stock": m.current_stock,
                "minimum_stock": m.minimum_stock,
                "unit_cost_usd": m.unit_cost_usd,
                "total_value_usd": round(m.current_stock * m.unit_cost_usd, 2),
                "location": m.location,
                "status": "critico" if m.current_stock <= 0 else ("bajo" if m.current_stock <= m.minimum_stock else "optimo")
            } for m in materials
        ]
    }

@router.post("/")
def create_material(mat_in: MaterialCreate, db: Session = Depends(get_db)):
    """Crea un nuevo ítem en el catálogo de materiales."""
    existing = db.query(Material).filter(Material.code == mat_in.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe un material con ese código.")

    new_m = Material(
        code=mat_in.code,
        name=mat_in.name,
        category=mat_in.category,
        unit_of_measure=mat_in.unit_of_measure,
        current_stock=mat_in.current_stock,
        minimum_stock=mat_in.minimum_stock,
        unit_cost_usd=mat_in.unit_cost_usd,
        location=mat_in.location,
        is_active=True
    )
    db.add(new_m)
    db.commit()
    db.refresh(new_m)
    return {"success": True, "message": f"Material '{new_m.name}' creado con éxito.", "id": new_m.id}

@router.post("/entry")
def register_material_entry(req: MaterialEntryRequest, db: Session = Depends(get_db)):
    """
    Registra compra/entrada de material para inventario de almacén.
    Aumenta stock y registra egreso de tesorería por inversión de inventario.
    """
    mat = db.query(Material).filter(Material.id == req.material_id).first()
    if not mat:
        raise HTTPException(status_code=404, detail="Material no encontrado.")

    total_cost = round(req.quantity * req.unit_cost_usd, 2)

    # 1. Actualizar stock y costo promedio ponderado
    old_stock = mat.current_stock or 0.0
    new_stock = old_stock + req.quantity
    if new_stock > 0:
        mat.unit_cost_usd = round(((old_stock * mat.unit_cost_usd) + total_cost) / new_stock, 2)
    mat.current_stock = new_stock

    # 2. Registrar movimiento en kardex
    mov = MaterialMovement(
        material_id=mat.id,
        movement_type="entrada_compra",
        quantity=req.quantity,
        unit_cost_usd=req.unit_cost_usd,
        total_cost_usd=total_cost,
        supplier_vendor=req.supplier_vendor,
        invoice_number=req.invoice_number,
        performed_by=req.performed_by,
        notes=req.notes
    )
    db.add(mov)

    # 3. Registrar egreso en flujo de caja (Inversión en Inventario)
    cat = db.query(ExpenseCategory).filter(ExpenseCategory.code.in_(["1.1", "1.5", "10.0"])).first()
    cat_id = cat.id if cat else 1

    exp = Expense(
        category_id=cat_id,
        expense_type="gasto_sede",
        description=f"Compra de Inventario: {req.quantity} {mat.unit_of_measure} de {mat.name} ({req.supplier_vendor or 'Comercio'})",
        supplier_vendor=req.supplier_vendor or "Proveedor de Materiales",
        amount_usd=total_cost,
        amount_bs=round(total_cost * (req.exchange_rate or 800.0), 2),
        exchange_rate=req.exchange_rate or 800.0,
        payment_method=req.payment_method or "transferencia",
        status="aprobado"
    )
    db.add(exp)
    db.commit()

    return {
        "success": True,
        "message": f"Se ingresaron {req.quantity} {mat.unit_of_measure} de {mat.name}. Nuevo stock: {mat.current_stock}.",
        "new_stock": mat.current_stock
    }

@router.post("/consume")
def consume_material_to_project(req: MaterialConsumeRequest, db: Session = Depends(get_db)):
    """
    Descarga material del almacén central y lo imputa como costo devengado a una obra o taller.
    """
    mat = db.query(Material).filter(Material.id == req.material_id).first()
    if not mat:
        raise HTTPException(status_code=404, detail="Material no encontrado.")

    if mat.current_stock < req.quantity:
        raise HTTPException(
            status_code=400, 
            detail=f"Stock insuficiente: Hay {mat.current_stock} {mat.unit_of_measure} disponibles y solicitas {req.quantity}."
        )

    total_cost = round(req.quantity * mat.unit_cost_usd, 2)
    mat.current_stock -= req.quantity

    project = db.query(Project).filter(Project.id == req.project_id).first() if req.project_id else None

    # Registrar movimiento
    mov = MaterialMovement(
        material_id=mat.id,
        movement_type="salida_obra" if project else "consumo_taller",
        quantity=req.quantity,
        unit_cost_usd=mat.unit_cost_usd,
        total_cost_usd=total_cost,
        project_id=req.project_id,
        performed_by=req.performed_by,
        notes=req.notes or (f"Despacho para obra {project.code}" if project else "Consumo interno de taller")
    )
    db.add(mov)

    # Imputar costo a la obra (Devengado de material)
    if project:
        cat = db.query(ExpenseCategory).filter(ExpenseCategory.code.in_(["1.1", "1.5"])).first()
        cat_id = cat.id if cat else 1

        exp = Expense(
            category_id=cat_id,
            project_id=project.id,
            expense_type="costo_obra",
            description=f"Consumo de Almacén: {req.quantity} {mat.unit_of_measure} de {mat.name} para obra {project.code}",
            supplier_vendor="Almacén Central Dalor",
            amount_usd=total_cost,
            amount_bs=round(total_cost * 800.0, 2),
            exchange_rate=800.0,
            payment_method="consumo_almacen",
            status="aprobado"
        )
        db.add(exp)

    db.commit()

    dest_name = f"la obra '{project.name}'" if project else "consumo interno de taller"
    return {
        "success": True,
        "message": f"Se despacharon {req.quantity} {mat.unit_of_measure} de {mat.name} hacia {dest_name}. Stock restante en almacén: {mat.current_stock}.",
        "remaining_stock": mat.current_stock
    }
