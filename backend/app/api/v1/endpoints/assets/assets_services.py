from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import List, Optional
from datetime import datetime

from app.core.database import get_db
from app.models.models import (
    Asset, AssetService, Expense, ExpenseCategory, Project, Personnel, 
    ResourceAssignmentHistory, AuditLog, User, AssetRentalLoan, 
    DispatchGuide, AssetRentalLoanItem
)
from app.core.security import verify_password
from .assets_common import *

router = APIRouter()

@router.post("/{asset_id}/record-service")
def record_asset_service(asset_id: int, req: ServiceRecordCreate, db: Session = Depends(get_db)):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Vehículo/Activo no encontrado.")
    
    is_veh = bool(
        (asset.asset_type and asset.asset_type.lower() in ["vehiculo", "camioneta", "camion", "moto", "vehículo", "transporte"])
        or "-V-" in (asset.asset_code or "")
        or asset.license_plate
    )

    reading_val = req.hours_operated if req.hours_operated is not None else (req.new_odometer or 0.0)
    if reading_val > (asset.current_odometer or 0.0):
        asset.current_odometer = reading_val

    should_reset_oil = req.reset_oil_interval
    if should_reset_oil is None:
        should_reset_oil = is_veh and req.service_type in ["cambio_aceite_filtros", "mantenimiento_preventivo_mayor"]

    unit_lbl = "Km" if is_veh else "Horas"
    if should_reset_oil:
        asset.last_service_odometer = reading_val
        remaining_km = asset.service_interval_km or 5000.0
        status_msg = f"Servicio de {req.service_type} registrado. Ciclo de aceite reseteado (5.000 Km restantes - VERDE OK)."
    else:
        km_since = (asset.current_odometer or 0.0) - (asset.last_service_odometer or 0.0)
        remaining_km = max(0.0, (asset.service_interval_km or 5000.0) - km_since)
        status_msg = f"Servicio de {req.service_type} registrado en bitácora. Lectura: {reading_val:,.0f} {unit_lbl}."

    created_exp_id = None
    clean_type = req.service_type.replace("_", " ").title()

    # Opción 2: Solo generar Expense si create_expense es True y cost_usd > 0
    if req.create_expense and req.cost_usd > 0:
        cat_id = get_service_expense_category(db, asset)
        desc = f"[SRV-AST-{asset.id}] {clean_type}: {asset.asset_code} ({asset.name}). {req.notes or ''}".strip()
        exp = Expense(
            category_id=cat_id,
            asset_id=asset.id,
            project_id=asset.current_project_id,
            supplier_vendor=req.performed_by or "Taller Central",
            amount_usd=req.cost_usd,
            base_amount_usd=req.cost_usd,
            tax_amount_usd=0.0,
            is_tax_exempt=True,
            description=desc,
            status="aprobado",
            exchange_rate=800.0,
            amount_bs=req.cost_usd * 800.0,
            expense_date=req.service_date or datetime.utcnow()
        )
        db.add(exp)
        db.flush()
        created_exp_id = exp.id

    srv = AssetService(
        asset_id=asset.id,
        service_date=req.service_date or datetime.utcnow(),
        service_type=req.service_type,
        service_odometer=reading_val,
        hours_operated=reading_val,
        technician_workshop=req.performed_by or req.notes or "Taller Central",
        cost_usd=req.cost_usd,
        cost_bs=req.cost_usd * 800.0,
        notes=req.notes or "",
        performed_by="almacen",
        created_expense=bool(created_exp_id),
        expense_id=created_exp_id
    )
    db.add(srv)

    log = AuditLog(
        username="almacen",
        module="activos",
        action="mantenimiento_activo",
        details=f"Servicio de {req.service_type} para {asset.asset_code}. Lectura: {reading_val} {unit_lbl}. Costo: ${req.cost_usd:,.2f}. Gasto contable generado: {'SÍ' if created_exp_id else 'NO'}"
    )
    db.add(log)
    db.commit()
    return {
        "success": True, 
        "message": status_msg,
        "remaining_km": round(remaining_km, 1),
        "oil_interval_reset": should_reset_oil,
        "created_expense": bool(created_exp_id)
    }


@router.put("/services/{service_id}")
def update_asset_service(service_id: int, req: ServiceRecordUpdate, db: Session = Depends(get_db)):
    srv = db.query(AssetService).filter(AssetService.id == service_id).first()
    if not srv:
        raise HTTPException(status_code=404, detail="Registro de servicio no encontrado.")
    
    asset = db.query(Asset).filter(Asset.id == srv.asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Activo vinculado no encontrado.")

    if req.service_type is not None:
        srv.service_type = req.service_type.strip()
    if req.technician_workshop is not None:
        srv.technician_workshop = req.technician_workshop.strip()
    if req.notes is not None:
        srv.notes = req.notes.strip()
    if req.service_date is not None:
        srv.service_date = req.service_date
    if req.service_odometer is not None:
        srv.service_odometer = req.service_odometer
        if req.service_odometer > (asset.current_odometer or 0.0):
            asset.current_odometer = req.service_odometer
    if req.hours_operated is not None:
        srv.hours_operated = req.hours_operated
        if req.hours_operated > (asset.current_odometer or 0.0):
            asset.current_odometer = req.hours_operated
    if req.cost_usd is not None:
        srv.cost_usd = req.cost_usd
        srv.cost_bs = req.cost_usd * 800.0

    clean_type = (srv.service_type or "Mantenimiento").replace("_", " ").title()
    desc = f"[SRV-AST-{asset.id}] {clean_type}: {asset.asset_code} ({asset.name}). {srv.notes or ''}".strip()

    should_have_expense = req.create_expense if req.create_expense is not None else srv.created_expense

    if should_have_expense and srv.cost_usd > 0:
        if srv.expense_id:
            exp = db.query(Expense).filter(Expense.id == srv.expense_id).first()
            if exp:
                exp.amount_usd = srv.cost_usd
                exp.base_amount_usd = srv.cost_usd
                exp.amount_bs = round(srv.cost_usd * exp.exchange_rate, 2)
                exp.supplier_vendor = srv.technician_workshop or exp.supplier_vendor
                exp.description = desc
                if srv.service_date:
                    exp.expense_date = srv.service_date
            else:
                cat_id = get_service_expense_category(db, asset)
                new_exp = Expense(
                    category_id=cat_id,
                    asset_id=asset.id,
                    project_id=asset.current_project_id,
                    supplier_vendor=srv.technician_workshop or "Taller Central",
                    amount_usd=srv.cost_usd,
                    base_amount_usd=srv.cost_usd,
                    tax_amount_usd=0.0,
                    is_tax_exempt=True,
                    description=desc,
                    status="aprobado",
                    exchange_rate=800.0,
                    amount_bs=srv.cost_usd * 800.0,
                    expense_date=srv.service_date or datetime.utcnow()
                )
                db.add(new_exp)
                db.flush()
                srv.expense_id = new_exp.id
        else:
            cat_id = get_service_expense_category(db, asset)
            new_exp = Expense(
                category_id=cat_id,
                asset_id=asset.id,
                project_id=asset.current_project_id,
                supplier_vendor=srv.technician_workshop or "Taller Central",
                amount_usd=srv.cost_usd,
                base_amount_usd=srv.cost_usd,
                tax_amount_usd=0.0,
                is_tax_exempt=True,
                description=desc,
                status="aprobado",
                exchange_rate=800.0,
                amount_bs=srv.cost_usd * 800.0,
                expense_date=srv.service_date or datetime.utcnow()
            )
            db.add(new_exp)
            db.flush()
            srv.expense_id = new_exp.id
        srv.created_expense = True
    elif not should_have_expense or srv.cost_usd <= 0:
        if srv.expense_id:
            exp = db.query(Expense).filter(Expense.id == srv.expense_id).first()
            if exp:
                db.delete(exp)
            srv.expense_id = None
        srv.created_expense = False

    log = AuditLog(
        username="almacen",
        module="activos",
        action="editar_servicio",
        details=f"Servicio #{srv.id} actualizado para {asset.asset_code}. Tipo: {srv.service_type}. Costo: ${srv.cost_usd:,.2f}"
    )
    db.add(log)
    db.commit()
    return {"success": True, "message": f"Servicio #{srv.id} actualizado exitosamente.", "service_id": srv.id}


class AdminAuthServiceDelete(BaseModel):
    admin_password: str
    reason: Optional[str] = "Eliminación de servicio en bitácora"

@router.delete("/services/{service_id}")
@router.post("/services/{service_id}/delete")
def delete_asset_service(service_id: int, req: Optional[AdminAuthServiceDelete] = None, admin_password: Optional[str] = Query(None), db: Session = Depends(get_db)):
    pwd = (req.admin_password if req else None) or admin_password
    reason = (req.reason if req else None) or "Eliminación de servicio en bitácora"

    authorized = False
    director = db.query(User).filter(User.username == "director").first()
    if director and director.hashed_password and pwd and verify_password(pwd, director.hashed_password):
        authorized = True
    else:
        admin = db.query(User).filter(User.username == "admin").first()
        if admin and admin.hashed_password and pwd and verify_password(pwd, admin.hashed_password):
            authorized = True

    if not authorized:
        raise HTTPException(
            status_code=403,
            detail="Operación rechazada: Requiere la contraseña de Administrador / Director General para eliminar un registro de la bitácora."
        )

    srv = db.query(AssetService).filter(AssetService.id == service_id).first()
    if not srv:
        raise HTTPException(status_code=404, detail="Servicio no encontrado.")

    asset = db.query(Asset).filter(Asset.id == srv.asset_id).first()
    exp_deleted = False
    if srv.expense_id:
        exp = db.query(Expense).filter(Expense.id == srv.expense_id).first()
        if exp:
            db.delete(exp)
            exp_deleted = True

    asset_label = f"[{asset.asset_code}] {asset.name}" if asset else f"Activo ID #{srv.asset_id}"
    unit_str = "Horas" if getattr(asset, "asset_type", "") in ["maquinaria_pesada", "planta_electrica", "equipo_pesado", "maquinaria"] else "Km"
    audit_detail = (
        f"ELIMINACIÓN DE SERVICIO #{srv.id} ({srv.service_type}) para {asset_label}. "
        f"Costo: ${srv.cost_usd:,.2f}. Lectura: {srv.hours_operated or srv.service_odometer} {unit_str}. "
        f"Motivo: {reason}. Gasto en Tesorería revertido: {'SÍ' if exp_deleted else 'NO'}."
    )
    log = AuditLog(
        username="director",
        module="activos",
        action="eliminar_servicio_activo",
        details=audit_detail
    )
    db.add(log)
    db.delete(srv)
    db.commit()
    return {
        "success": True, 
        "message": f"Servicio #{service_id} eliminado exitosamente. Registro de auditoría guardado.",
        "audit_details": audit_detail
    }


@router.get("/{asset_id}/services")
def get_asset_services(asset_id: int, db: Session = Depends(get_db)):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Vehículo/Activo no encontrado.")

    services = db.query(AssetService).filter(AssetService.asset_id == asset_id).order_by(AssetService.service_date.desc()).all()
    total_cost = sum(s.cost_usd or 0.0 for s in services)

    is_machinery = bool(
        (asset.asset_type and asset.asset_type.lower() in ["maquinaria", "planta", "generador", "compresor", "equipo_mayor"])
        or (asset.asset_code == "3-V-1-05")
        or ("montacarga" in (asset.name or "").lower() and asset.asset_type not in ["herramienta", "herramienta_menor", "herramienta_mayor"])
    )

    # Consultar trazabilidad visible de auditoría reciente para este activo
    code_filter = asset.asset_code or f"ID #{asset.id}"
    audit_logs = (
        db.query(AuditLog)
        .filter(
            AuditLog.module == "activos",
            AuditLog.details.ilike(f"%{code_filter}%")
        )
        .order_by(AuditLog.id.desc())
        .limit(10)
        .all()
    )

    return {
        "asset": {
            "id": asset.id,
            "asset_code": asset.asset_code,
            "name": asset.name,
            "asset_type": asset.asset_type,
            "category": asset.category,
            "brand": asset.brand or "",
            "model": asset.model or "",
            "license_plate": asset.license_plate or "-",
            "serial_number": asset.serial_number or "-",
            "current_odometer": asset.current_odometer or 0.0,
            "status": asset.status,
            "current_location": asset.current_location or "Sede Central Dalor (Guacara)",
            "is_machinery": is_machinery
        },
        "services_count": len(services),
        "total_cost_usd": round(total_cost, 2),
        "services": [{
            "id": s.id,
            "service_date": s.service_date.strftime("%Y-%m-%d %H:%M") if s.service_date else "-",
            "service_date_raw": s.service_date.isoformat() if s.service_date else "",
            "service_type": s.service_type,
            "service_odometer": s.service_odometer,
            "hours_operated": s.hours_operated or s.service_odometer,
            "technician_workshop": s.technician_workshop or "Taller Central",
            "cost_usd": s.cost_usd or 0.0,
            "notes": s.notes or "",
            "created_expense": bool(s.created_expense or s.expense_id),
            "expense_id": s.expense_id
        } for s in services],
        "audit_trail": [{
            "id": a.id,
            "date": a.created_at.strftime("%Y-%m-%d %H:%M") if a.created_at else "-",
            "action": a.action,
            "details": a.details,
            "username": a.username
        } for a in audit_logs]
    }
