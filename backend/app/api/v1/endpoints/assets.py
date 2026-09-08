from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

from app.core.database import get_db
from app.models.models import Asset, Expense, Project, Personnel, ResourceAssignmentHistory, AuditLog

router = APIRouter()

class AssetCreate(BaseModel):
    asset_code: str
    name: str
    asset_type: str # vehiculo, camioneta, herramienta, maquinaria, equipo_medicion
    brand: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None
    license_plate: Optional[str] = None
    current_odometer: Optional[float] = 0.0
    service_interval_km: Optional[float] = 5000.0
    current_location: Optional[str] = "Sede Central"
    current_custodian_name: Optional[str] = "Disponible en Base"
    is_exclusive: bool = True

class DispatchGuideItem(BaseModel):
    asset_id: int
    asset_code: str
    name: str
    serial_or_plate: Optional[str] = None
    condition_notes: Optional[str] = "Buen estado operativo"

class DispatchGuideCreate(BaseModel):
    guide_number: Optional[str] = None
    project_id: int
    origin_location: str = "Taller Central Valencia"
    destination_location: str
    driver_name: str
    vehicle_plate: str
    receiver_custodian_name: str
    observations: Optional[str] = None
    items: List[DispatchGuideItem]

@router.get("/")
def get_assets(asset_type: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Asset).filter(Asset.is_active == True)
    if asset_type:
        query = query.filter(Asset.asset_type == asset_type)
    return query.order_by(Asset.asset_code.asc()).all()

@router.post("/")
def create_asset(asset_in: AssetCreate, db: Session = Depends(get_db)):
    existing = db.query(Asset).filter(Asset.asset_code == asset_in.asset_code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe un activo/herramienta con ese código.")
    
    new_asset = Asset(
        asset_code=asset_in.asset_code,
        name=asset_in.name,
        asset_type=asset_in.asset_type,
        brand=asset_in.brand,
        model=asset_in.model,
        serial_number=asset_in.serial_number,
        license_plate=asset_in.license_plate,
        current_odometer=asset_in.current_odometer or 0.0,
        service_interval_km=asset_in.service_interval_km or 5000.0,
        last_service_odometer=asset_in.current_odometer or 0.0,
        status="disponible_base",
        current_location=asset_in.current_location or "Sede Central",
        current_custodian_name=asset_in.current_custodian_name or "Disponible en Base",
        is_exclusive=asset_in.is_exclusive,
        is_active=True
    )
    db.add(new_asset)
    db.commit()
    db.refresh(new_asset)
    return new_asset

@router.delete("/{asset_id}")
def delete_asset(asset_id: int, db: Session = Depends(get_db)):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Activo no encontrado.")
    asset.is_active = False
    db.commit()
    return {"message": "Activo/Herramienta inactivado exitosamente (traza histórica preservada)."}

@router.get("/fleet-summary")
def get_fleet_summary(db: Session = Depends(get_db)):
    assets = db.query(Asset).filter(Asset.is_active == True).all()
    result = []
    
    for a in assets:
        total_exp = db.query(func.sum(Expense.amount_usd)).filter(Expense.asset_id == a.id).scalar() or 0.0
        km_since_service = (a.current_odometer or 0.0) - (a.last_service_odometer or 0.0)
        remaining_km = (a.service_interval_km or 5000.0) - km_since_service
        
        traffic_light = "VERDE_OK"
        if remaining_km <= 0:
            traffic_light = "ROJO_VENCIDO"
        elif remaining_km <= 500:
            traffic_light = "AMARILLO_PROXIMO"
            
        result.append({
            "id": a.id,
            "asset_code": a.asset_code,
            "name": a.name,
            "asset_type": a.asset_type,
            "brand": a.brand,
            "model": a.model,
            "serial_number": a.serial_number,
            "license_plate": a.license_plate,
            "status": "en_obra" if a.current_project_id else "disponible_base",
            "current_location": a.current_location or "Sede Central",
            "current_odometer": a.current_odometer or 0.0,
            "remaining_km_to_service": round(remaining_km, 1),
            "traffic_light": traffic_light,
            "custodian": a.current_custodian_name or "Disponible en Base",
            "total_operating_cost_usd": round(total_exp, 2)
        })
    return result

# ------------------------------------------------------------------------------
# 📄 GUÍAS DE TRASLADO & PASES DE SALIDA DE HERRAMIENTAS Y EQUIPOS
# ------------------------------------------------------------------------------
@router.get("/dispatch-guides")
def list_dispatch_guides(db: Session = Depends(get_db)):
    histories = db.query(ResourceAssignmentHistory).order_by(ResourceAssignmentHistory.assigned_at.desc()).all()
    return [{
        "id": h.id,
        "project_id": h.project_id,
        "project_name": h.project.name if h.project else "Sin Proyecto",
        "project_code": h.project.code if h.project else "-",
        "resource_type": h.resource_type,
        "resource_name": h.resource_name,
        "resource_code": h.resource_code,
        "custodian_name": h.custodian_name,
        "origin_location": h.origin_location,
        "destination_location": h.destination_location,
        "status": h.status,
        "assigned_at": h.assigned_at.strftime("%Y-%m-%d %H:%M"),
        "notes": h.notes
    } for h in histories]

@router.post("/dispatch-guides/create")
def create_dispatch_guide(guide_in: DispatchGuideCreate, db: Session = Depends(get_db)):
    proj = db.query(Project).filter(Project.id == guide_in.project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Proyecto de destino no encontrado.")

    guide_number = guide_in.guide_number or f"GT-{datetime.now().strftime('%Y%m%d')}-{len(guide_in.items):02d}"
    created_records = []

    for item in guide_in.items:
        asset = db.query(Asset).filter(Asset.id == item.asset_id).first()
        if asset:
            asset.status = "en_obra"
            asset.current_project_id = proj.id
            asset.current_location = guide_in.destination_location
            asset.current_custodian_name = guide_in.receiver_custodian_name

        history_record = ResourceAssignmentHistory(
            project_id=proj.id,
            resource_type="herramienta_equipo",
            resource_id=item.asset_id,
            resource_code=item.asset_code,
            resource_name=item.name,
            custodian_name=guide_in.receiver_custodian_name,
            origin_location=guide_in.origin_location,
            destination_location=guide_in.destination_location,
            status="en_obra",
            notes=f"Guía {guide_number} | Chofer: {guide_in.driver_name} (Placa: {guide_in.vehicle_plate}) | {item.condition_notes or ''}"
        )
        db.add(history_record)
        created_records.append(history_record)

    db.commit()

    audit = AuditLog(
        username="almacen",
        module="recursos_obra",
        action="emitir_guia_traslado",
        details=f"Guía de Traslado {guide_number} emitida con {len(guide_in.items)} equipos para obra '{proj.code}'"
    )
    db.add(audit)
    db.commit()

    return {
        "success": True,
        "guide_number": guide_number,
        "items_count": len(guide_in.items),
        "message": f"Guía de Traslado {guide_number} generada con éxito."
    }
