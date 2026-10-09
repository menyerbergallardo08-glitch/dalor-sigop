from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.models.models import Material, MaterialMovement
from .materials_common import MaterialCalibrationRequest

router = APIRouter()

# 6. HISTORIAL DE MOVIMIENTOS (KARDEX)
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


@router.put("/{material_id}/calibrate")
def calibrate_material_stock(material_id: int, req: MaterialCalibrationRequest, db: Session = Depends(get_db)):
    from app.core.security import verify_password
    from app.models.models import User
    
    stock_qty = req.new_stock_quantity if req.new_stock_quantity is not None else req.new_stock
    if stock_qty is None:
        raise HTTPException(status_code=400, detail="Debe especificar la nueva cantidad física.")

    authorized = False
    admin_users = db.query(User).filter(
        (User.is_superuser == True) | 
        (User.role_name.in_(["director", "director_general", "admin_finanzas", "administrador", "admin"])) |
        (User.username.in_(["admin", "director"]))
    ).all()
    for u in admin_users:
        if u.hashed_password and verify_password(req.director_password, u.hashed_password):
            authorized = True
            break
            
    if not authorized:
        raise HTTPException(status_code=403, detail="Contraseña de autorización de Dirección incorrecta.")
        
    mat = db.query(Material).filter(Material.id == material_id).first()
    if not mat:
        raise HTTPException(status_code=404, detail="Material no encontrado.")
        
    old_stock = mat.stock_quantity or 0.0
    diff = stock_qty - old_stock
    mat.stock_quantity = stock_qty
    
    mov = MaterialMovement(
        material_id=mat.id,
        project_id=None,
        movement_type="calibracion_inventario",
        quantity=abs(diff),
        unit_cost_usd=mat.unit_cost_usd or 0.0,
        total_cost_usd=round(abs(diff) * (mat.unit_cost_usd or 0.0), 2),
        reference_doc="Ajuste Físico Calibrado",
        notes=f"Calibración de Stock (Anterior: {old_stock}, Nuevo: {stock_qty}). Motivo: {req.reason}",
        performed_by=req.calibrated_by or "Dirección General"
    )
    db.add(mov)
    db.commit()
    return {
        "success": True,
        "message": f"Stock de [{mat.code}] {mat.name} calibrado exitosamente de {old_stock} a {stock_qty} {mat.unit_measure}.",
        "previous_stock": old_stock,
        "new_stock": mat.stock_quantity,
        "difference": diff
    }


