from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

from app.core.database import get_db
from app.models.models import AssetRentalLoan, Asset, Project, AuditLog
from app.api.deps import get_current_active_user, require_roles

router = APIRouter()

# ------------------------------------------------------------------------------
# SCHEMAS
# ------------------------------------------------------------------------------
class AssetRentalLoanCreate(BaseModel):
    direction: str # 'dalor_a_tercero' (salida) o 'tercero_a_dalor' (entrada)
    operation_type: str # 'alquiler' o 'prestamo'
    asset_id: Optional[int] = None
    equipment_name: str
    equipment_code: Optional[str] = None
    external_entity: str
    contact_person: Optional[str] = None
    contact_phone: Optional[str] = None
    project_id: Optional[int] = None
    start_date: Optional[datetime] = None
    expected_return_date: Optional[datetime] = None
    rate_usd: Optional[float] = 0.0
    rate_period: Optional[str] = "dia" # dia, semana, mes, global
    notes: Optional[str] = None

class RentalReturnIn(BaseModel):
    return_date: Optional[datetime] = None
    condition_status: str = "devuelto_conforme" # devuelto_conforme, devuelto_con_novedad
    return_notes: Optional[str] = None


# ------------------------------------------------------------------------------
# ENDPOINTS
# ------------------------------------------------------------------------------
@router.get("/")
def list_rentals(
    direction: Optional[str] = Query(None),
    operation_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    q = db.query(AssetRentalLoan)
    if direction:
        q = q.filter(AssetRentalLoan.direction == direction)
    if operation_type:
        q = q.filter(AssetRentalLoan.operation_type == operation_type)
    if status:
        q = q.filter(AssetRentalLoan.status == status)

    records = q.order_by(AssetRentalLoan.created_at.desc()).all()
    results = []
    now = datetime.utcnow()
    
    for r in records:
        is_overdue = False
        if r.status == "activo" and r.expected_return_date:
            is_overdue = now > r.expected_return_date

        results.append({
            "id": r.id,
            "operation_code": r.operation_code,
            "direction": r.direction,
            "operation_type": r.operation_type,
            "asset_id": r.asset_id,
            "asset_name": r.asset.name if r.asset else None,
            "asset_code": r.asset.asset_code if r.asset else r.equipment_code,
            "equipment_name": r.equipment_name,
            "equipment_code": r.equipment_code or (r.asset.asset_code if r.asset else ""),
            "external_entity": r.external_entity,
            "contact_person": r.contact_person or "",
            "contact_phone": r.contact_phone or "",
            "project_id": r.project_id,
            "project_name": r.project.name if r.project else "Taller Central Guacara",
            "start_date": r.start_date.strftime("%Y-%m-%d %H:%M") if r.start_date else "",
            "expected_return_date": r.expected_return_date.strftime("%Y-%m-%d") if r.expected_return_date else "Indefinido",
            "actual_return_date": r.actual_return_date.strftime("%Y-%m-%d %H:%M") if r.actual_return_date else "",
            "rate_usd": r.rate_usd or 0.0,
            "rate_period": r.rate_period or "dia",
            "total_amount_usd": r.total_amount_usd or 0.0,
            "status": r.status,
            "is_overdue": is_overdue,
            "return_notes": r.return_notes or "",
            "notes": r.notes or "",
            "created_at": r.created_at.strftime("%Y-%m-%d %H:%M") if r.created_at else ""
        })
    return results


@router.post("/")
def create_rental_loan(
    req: AssetRentalLoanCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    if not req.equipment_name.strip():
        raise HTTPException(status_code=400, detail="El nombre del equipo es obligatorio.")
    if not req.external_entity.strip():
        raise HTTPException(status_code=400, detail="Debe indicar el cliente, proveedor o tercero responsable.")

    # Generar correlativo
    prefix = "ALQ" if req.operation_type == "alquiler" else "PRE"
    count = db.query(AssetRentalLoan).filter(AssetRentalLoan.operation_type == req.operation_type).count() + 1
    op_code = f"{prefix}-2026-{count:03d}"

    # Si ya existe, incrementar
    if db.query(AssetRentalLoan).filter(AssetRentalLoan.operation_code == op_code).first():
        count = db.query(AssetRentalLoan).count() + 10
        op_code = f"{prefix}-2026-{count:03d}"

    eq_name = req.equipment_name.strip()
    eq_code = (req.equipment_code or "").strip()

    # Si se asoció a un activo propio de Dalor
    asset_obj = None
    if req.asset_id:
        asset_obj = db.query(Asset).filter(Asset.id == req.asset_id).first()
        if asset_obj:
            eq_name = asset_obj.name
            eq_code = asset_obj.asset_code
            if req.direction == "dalor_a_tercero":
                asset_obj.status = "alquilado_a_tercero" if req.operation_type == "alquiler" else "prestado_a_cliente"
                asset_obj.current_location = f"Custodia Externa: {req.external_entity.strip()}"
                asset_obj.current_custodian_name = req.contact_person or req.external_entity.strip()
                asset_obj.rental_rate_usd = req.rate_usd or 0.0
                asset_obj.return_due_date = req.expected_return_date

    new_item = AssetRentalLoan(
        operation_code=op_code,
        direction=req.direction,
        operation_type=req.operation_type,
        asset_id=req.asset_id,
        equipment_name=eq_name,
        equipment_code=eq_code or None,
        external_entity=req.external_entity.strip(),
        contact_person=req.contact_person.strip() if req.contact_person else None,
        contact_phone=req.contact_phone.strip() if req.contact_phone else None,
        project_id=req.project_id,
        start_date=req.start_date or datetime.utcnow(),
        expected_return_date=req.expected_return_date,
        rate_usd=req.rate_usd or 0.0,
        rate_period=req.rate_period or "dia",
        total_amount_usd=req.rate_usd or 0.0,
        status="activo",
        notes=req.notes
    )
    db.add(new_item)

    audit = AuditLog(
        username=current_user.username if hasattr(current_user, "username") else "operaciones",
        module="Activos / Alquileres y Prestamos",
        action=f"Crear {req.operation_type.title()} ({req.direction})",
        details=f"Registrado [{op_code}] {eq_name} con {req.external_entity.strip()}. Tarifa: ${req.rate_usd:.2f}/{req.rate_period}."
    )
    db.add(audit)

    db.commit()
    db.refresh(new_item)

    return {
        "success": True,
        "message": f"Registro [{op_code}] de {req.operation_type.title()} guardado exitosamente.",
        "id": new_item.id,
        "operation_code": op_code
    }


@router.post("/{item_id}/return")
def return_rental_loan(
    item_id: int,
    ret_in: RentalReturnIn,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    item = db.query(AssetRentalLoan).filter(AssetRentalLoan.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Registro de préstamo o alquiler no encontrado.")

    item.actual_return_date = ret_in.return_date or datetime.utcnow()
    item.status = ret_in.condition_status
    item.return_notes = ret_in.return_notes

    # Si era un activo propio de Dalor, devolver a disponible en base central
    if item.asset_id:
        asset_obj = db.query(Asset).filter(Asset.id == item.asset_id).first()
        if asset_obj:
            asset_obj.status = "disponible_base"
            asset_obj.current_location = "Sede Central Guacara"
            asset_obj.current_custodian_name = "Almacén Central"
            asset_obj.return_due_date = None

    audit = AuditLog(
        username=current_user.username if hasattr(current_user, "username") else "operaciones",
        module="Activos / Alquileres y Prestamos",
        action="Registrar Devolución de Equipo",
        details=f"Equipo [{item.operation_code}] {item.equipment_name} devuelto por {item.external_entity}. Condición: {ret_in.condition_status}."
    )
    db.add(audit)

    db.commit()
    return {
        "success": True,
        "message": f"Devolución del equipo [{item.equipment_name}] registrada conforme exitosamente.",
        "id": item.id
    }


@router.delete("/{item_id}", dependencies=[Depends(require_roles(["director_general", "administrador_financiero"]))])
def delete_rental_loan(item_id: int, db: Session = Depends(get_db)):
    item = db.query(AssetRentalLoan).filter(AssetRentalLoan.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Registro no encontrado.")

    # Restaurar activo si estaba asociado
    if item.asset_id and item.status == "activo":
        asset_obj = db.query(Asset).filter(Asset.id == item.asset_id).first()
        if asset_obj:
            asset_obj.status = "disponible_base"
            asset_obj.current_location = "Sede Central Guacara"
            asset_obj.return_due_date = None

    db.delete(item)
    db.commit()
    return {"success": True, "message": f"Registro [{item.operation_code}] anulado con éxito."}
