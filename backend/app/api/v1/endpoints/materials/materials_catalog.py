from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.models.models import Material, MaterialMovement
from .materials_common import MaterialCreate, MaterialUpdate

router = APIRouter()

@router.get("/")
def get_materials(
    category: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Material).filter((Material.is_active == True) | (Material.is_active == None))
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

    return {
        "success": True,
        "message": "Material creado exitosamente.",
        "id": mat.id,
        "code": mat.code,
        "name": mat.name,
        "category": mat.category,
        "unit": mat.unit_measure,
        "unit_measure": mat.unit_measure,
        "unit_cost_usd": mat.unit_cost_usd,
        "stock_quantity": mat.stock_quantity
    }


@router.put("/{material_id}")
def update_material_item(material_id: int, req: MaterialUpdate, db: Session = Depends(get_db)):
    """
    Edita la ficha técnica del material/insumo (nombre, categoría, unidad, costo, stock mínimo, ubicación).
    """
    mat = db.query(Material).filter(Material.id == material_id).first()
    if not mat:
        raise HTTPException(status_code=404, detail="Material no encontrado.")

    if req.name is not None and req.name.strip():
        mat.name = req.name.strip()
    if req.category is not None and req.category.strip():
        mat.category = req.category.strip()
    if req.unit_measure is not None and req.unit_measure.strip():
        mat.unit_measure = req.unit_measure.strip().upper()
    if req.min_stock_alert is not None:
        mat.min_stock_alert = max(0.0, float(req.min_stock_alert))
    if req.unit_cost_usd is not None:
        mat.unit_cost_usd = max(0.0, float(req.unit_cost_usd))
        mat.total_cost_usd = round((mat.stock_quantity or 0.0) * mat.unit_cost_usd, 2)
    if req.location is not None:
        mat.location = req.location.strip()
    if req.is_active is not None:
        mat.is_active = req.is_active

    db.commit()
    db.refresh(mat)

    return {
        "success": True,
        "message": f"Ficha de material [{mat.code}] {mat.name} actualizada correctamente.",
        "material": {
            "id": mat.id,
            "code": mat.code,
            "name": mat.name,
            "category": mat.category,
            "unit_measure": mat.unit_measure,
            "stock_quantity": mat.stock_quantity,
            "min_stock_alert": mat.min_stock_alert,
            "unit_cost_usd": mat.unit_cost_usd,
            "location": mat.location,
            "is_active": mat.is_active
        }
    }


