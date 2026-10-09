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

@router.post("/{asset_id}/record-maintenance")
def record_asset_maintenance(
    asset_id: int,
    maint_in: AssetMaintenanceInput,
    db: Session = Depends(get_db)
):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Vehículo o activo no encontrado.")

    # Actualizar odómetro de último servicio
    current_km = maint_in.service_odometer or asset.current_odometer or 0.0
    asset.last_service_odometer = current_km
    if maint_in.service_odometer and maint_in.service_odometer > (asset.current_odometer or 0.0):
        asset.current_odometer = maint_in.service_odometer

    # Registrar servicio en tabla de bitácora de servicios
    srv = AssetService(
        asset_id=asset.id,
        service_date=datetime.utcnow(),
        service_type=maint_in.maintenance_type,
        service_odometer=current_km,
        technician_workshop=maint_in.technician_or_workshop,
        cost_usd=maint_in.cost_usd or 0.0,
        cost_bs=(maint_in.cost_usd or 0.0) * 800.0,
        notes=maint_in.description,
        performed_by="almacen"
    )
    db.add(srv)

    # Registrar auditoría de mantenimiento
    audit = AuditLog(
        username="almacen",
        module="mantenimiento_flota",
        action="registrar_servicio_vehicular",
        details=f"Mantenimiento {maint_in.maintenance_type.upper()} registrado para [{asset.asset_code}] {asset.name} a los {current_km:,.0f} Km por '{maint_in.technician_or_workshop}': {maint_in.description}"
    )
    db.add(audit)
    db.commit()
    db.refresh(asset)

    return {
        "success": True,
        "message": f"Mantenimiento registrado exitosamente para {asset.name}. Semáforo de servicio reiniciado a Verde (0 Km acumulados de 5,000 Km).",
        "asset_code": asset.asset_code,
        "current_odometer": asset.current_odometer,
        "last_service_odometer": asset.last_service_odometer,
        "traffic_light": "VERDE_OK"
    }



@router.get("/{asset_id}/history")
def get_asset_movement_history(asset_id: int, db: Session = Depends(get_db)):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Activo no encontrado.")

    # 1. Movimientos desde ResourceAssignmentHistory
    movements = db.query(ResourceAssignmentHistory).filter(
        ResourceAssignmentHistory.resource_id == asset_id,
        ResourceAssignmentHistory.resource_type.in_(["asset", "vehiculo", "maquinaria", "herramienta"])
    ).order_by(ResourceAssignmentHistory.assigned_at.desc()).all()

    # Si no trajo por ID directo, buscar por código o nombre del activo
    if not movements:
        movements = db.query(ResourceAssignmentHistory).filter(
            (ResourceAssignmentHistory.resource_code == asset.asset_code) |
            (ResourceAssignmentHistory.resource_name == asset.name)
        ).order_by(ResourceAssignmentHistory.assigned_at.desc()).all()

    timeline = []
    for m in movements:
        timeline.append({
            "id": f"mov-{m.id}",
            "type": "movimiento_obra",
            "date": m.assigned_at.strftime("%Y-%m-%d %H:%M:%S") if m.assigned_at else "-",
            "transfer_code": m.transfer_code or "S/C",
            "project_code": m.project.code if m.project else "Sede Central",
            "project_name": m.project.name if m.project else "Sede Central",
            "origin": m.origin_location or "Sede Central",
            "destination": m.destination_location or "-",
            "responsible_person": m.custodian_name or m.driver_name or "Sin custodio",
            "driver_name": m.driver_name or "-",
            "odometer": m.start_odometer or 0.0,
            "status": m.status or "en_obra",
            "notes": m.notes or ""
        })

    # 2. Despachos y Guías vinculadas
    guides = db.query(DispatchGuide).filter(DispatchGuide.asset_id == asset_id).all()
    for g in guides:
        timeline.append({
            "id": f"disp-{g.id}",
            "type": "guia_despacho",
            "date": g.dispatch_date.strftime("%Y-%m-%d %H:%M:%S") if g.dispatch_date else g.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            "transfer_code": g.guide_number,
            "project_code": g.project.code if g.project else "S/P",
            "project_name": g.project.name if g.project else (g.recipient_name or "Despacho Libre"),
            "origin": "Base Central Dalor",
            "destination": g.destination_address,
            "responsible_person": g.driver_name,
            "driver_name": g.driver_name,
            "odometer": None,
            "status": g.status,
            "notes": f"Motivo: {g.transfer_reason or 'Despacho'} | Placa: {g.vehicle_plate}"
        })

    # 3. Alquileres o Préstamos vinculados (Directos o en Lote Multi-Item)
    rentals = db.query(AssetRentalLoan).filter(AssetRentalLoan.asset_id == asset_id).all()
    seen_rental_ids = set()
    for r in rentals:
        seen_rental_ids.add(r.id)
        timeline.append({
            "id": f"rent-{r.id}",
            "type": "alquiler_prestamo",
            "date": r.start_date.strftime("%Y-%m-%d %H:%M:%S") if r.start_date else r.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            "transfer_code": r.operation_code,
            "project_code": r.project.code if r.project else "TERCEROS",
            "project_name": f"{r.operation_type.title()} con {r.external_entity}",
            "origin": "Base Dalor",
            "destination": f"Custodia: {r.external_entity}",
            "responsible_person": r.contact_person or r.external_entity,
            "driver_name": r.contact_person or "-",
            "odometer": None,
            "status": r.status,
            "notes": f"{r.notes or ''} (Tarifa: ${r.rate_usd:.2f}/{r.rate_period})"
        })

    # Buscar también en renglones de lotes multi-item
    batch_items = db.query(AssetRentalLoanItem).filter(AssetRentalLoanItem.asset_id == asset_id).all()
    for bi in batch_items:
        r = bi.rental
        if r and r.id not in seen_rental_ids:
            seen_rental_ids.add(r.id)
            timeline.append({
                "id": f"rent-item-{bi.id}",
                "type": "alquiler_prestamo",
                "date": r.start_date.strftime("%Y-%m-%d %H:%M:%S") if r.start_date else r.created_at.strftime("%Y-%m-%d %H:%M:%S"),
                "transfer_code": r.operation_code,
                "project_code": r.project.code if r.project else "TERCEROS",
                "project_name": f"{r.operation_type.title()} con {r.external_entity}",
                "origin": "Base Dalor",
                "destination": f"Custodia: {r.external_entity}",
                "responsible_person": r.contact_person or r.external_entity,
                "driver_name": r.contact_person or "-",
                "odometer": None,
                "status": bi.status or r.status,
                "notes": f"Lote: {bi.name} | {r.notes or ''} (Tarifa: ${r.rate_usd:.2f}/{r.rate_period})"
            })

    # 4. Servicios y Mantenimientos realizados
    services = db.query(AssetService).filter(AssetService.asset_id == asset_id).all()
    for s in services:
        timeline.append({
            "id": f"srv-{s.id}",
            "type": "servicio_mantenimiento",
            "date": s.service_date.strftime("%Y-%m-%d %H:%M:%S") if s.service_date else s.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            "transfer_code": f"SRV-{s.id:04d}",
            "project_code": "TALLER",
            "project_name": f"Mantenimiento: {s.service_type.replace('_', ' ').title()}",
            "origin": "Sede Central Dalor (Guacara)",
            "destination": s.technician_workshop or "Taller Central",
            "responsible_person": s.technician_workshop or "Mecánico",
            "driver_name": s.technician_workshop or "-",
            "odometer": s.service_odometer,
            "status": "servicio_realizado",
            "notes": f"{s.notes or ''} (Costo: ${s.cost_usd:.2f})"
        })

    # Ordenar por fecha descendente
    timeline.sort(key=lambda x: x["date"], reverse=True)

    return {
        "asset": {
            "id": asset.id,
            "code": asset.asset_code,
            "name": asset.name,
            "type": asset.asset_type,
            "brand": asset.brand or "",
            "model": asset.model or "",
            "license_plate": asset.license_plate or "-",
            "current_odometer": asset.current_odometer,
            "status": asset.status,
            "current_location": asset.current_location,
            "current_custodian": asset.current_custodian_name,
            "project_code": asset.current_project.code if asset.current_project else "Base Central"
        },
        "history_count": len(timeline),
        "timeline": timeline
    }
