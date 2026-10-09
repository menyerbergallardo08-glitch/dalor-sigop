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

@router.post("/{asset_id}/record-odometer")
def record_asset_odometer(asset_id: int, req: OdometerUpdate, db: Session = Depends(get_db)):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Vehículo/Activo no encontrado.")
    
    asset.current_odometer = req.odometer_reading
    km_since_service = (asset.current_odometer or 0.0) - (asset.last_service_odometer or 0.0)
    remaining_km = (asset.service_interval_km or 5000.0) - km_since_service

    traffic_light = "VERDE_OK"
    if remaining_km <= 0:
        traffic_light = "ROJO_VENCIDO"
    elif remaining_km <= 500:
        traffic_light = "AMARILLO_PROXIMO"

    log = AuditLog(
        username=req.reported_by or "campo",
        module="flota",
        action="actualizar_odometro_ocr",
        details=f"Odómetro de [{asset.asset_code}] {asset.name} actualizado a {req.odometer_reading:,.0f} km. Semáforo: {traffic_light}. {f'Foto: {req.photo_url}' if req.photo_url else ''}"
    )
    db.add(log)
    db.commit()
    return {
        "success": True,
        "message": f"Odómetro actualizado a {req.odometer_reading:,.0f} Km para {asset.name}. Semáforo: {traffic_light}.",
        "current_odometer": asset.current_odometer,
        "remaining_km": round(remaining_km, 1),
        "traffic_light": traffic_light
    }


class CalibrateOdometerInput(BaseModel):
    director_password: str
    new_odometer: float = 0.0
    new_last_service_odometer: Optional[float] = None
    service_interval_km: Optional[float] = 5000.0
    notes: Optional[str] = "Calibración inicial de odómetro por Dirección General"


class BulkCalibrateOdometerInput(BaseModel):
    director_password: str
    target_odometer: float = 0.0
    notes: Optional[str] = "Puesta a cero / Calibración masiva de odómetros de flota"


@router.post("/{asset_id}/calibrate-odometer")
def calibrate_asset_odometer(asset_id: int, req: CalibrateOdometerInput, db: Session = Depends(get_db)):
    """
    Permite al Director General o Administrador resetear/calibrar libremente el odómetro
    de un vehículo específico mediante confirmación de clave de Director.
    """
    director = db.query(User).filter(User.username == "director").first()
    authorized = False
    if director and verify_password(req.director_password, director.hashed_password):
        authorized = True
    else:
        admin = db.query(User).filter(User.username == "admin").first()
        if admin and verify_password(req.director_password, admin.hashed_password):
            authorized = True

    if not authorized:
        raise HTTPException(status_code=403, detail="Contraseña de Director General incorrecta. Calibración cancelada.")

    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Vehículo/Activo no encontrado.")

    asset.current_odometer = float(req.new_odometer)
    if req.new_last_service_odometer is not None:
        asset.last_service_odometer = float(req.new_last_service_odometer)
    else:
        asset.last_service_odometer = float(req.new_odometer)
    if req.service_interval_km:
        asset.service_interval_km = float(req.service_interval_km)

    km_since_service = (asset.current_odometer or 0.0) - (asset.last_service_odometer or 0.0)
    remaining_km = (asset.service_interval_km or 5000.0) - km_since_service

    traffic_light = "VERDE_OK"
    if remaining_km <= 0:
        traffic_light = "ROJO_VENCIDO"
    elif remaining_km <= 500:
        traffic_light = "AMARILLO_PROXIMO"

    log = AuditLog(
        username="director",
        module="flota",
        action="calibracion_odometro_director",
        details=f"Odómetro de [{asset.asset_code}] {asset.name} calibrado por Dirección a {req.new_odometer:,.0f} km. Semáforo: {traffic_light}. Nota: {req.notes}"
    )
    db.add(log)
    db.commit()

    return {
        "success": True,
        "message": f"Odómetro de [{asset.asset_code}] calibrado exitosamente a {req.new_odometer:,.0f} Km.",
        "current_odometer": asset.current_odometer,
        "last_service_odometer": asset.last_service_odometer,
        "remaining_km": round(remaining_km, 1),
        "traffic_light": traffic_light
    }


@router.post("/calibrate-all-odometers")
def calibrate_all_odometers(req: BulkCalibrateOdometerInput, db: Session = Depends(get_db)):
    """
    Permite al Director General resetear simultáneamente todos los vehículos de la flota
    a un kilometraje base (ej: 0.0 Km) mediante confirmación de clave de Director.
    """
    director = db.query(User).filter(User.username == "director").first()
    authorized = False
    if director and verify_password(req.director_password, director.hashed_password):
        authorized = True
    else:
        admin = db.query(User).filter(User.username == "admin").first()
        if admin and verify_password(req.director_password, admin.hashed_password):
            authorized = True

    if not authorized:
        raise HTTPException(status_code=403, detail="Contraseña de Director General incorrecta. Operación cancelada.")

    vehicles = db.query(Asset).filter(
        (Asset.asset_type.in_(["vehiculo", "camioneta", "maquinaria"])) | (Asset.asset_code.like("%-V-%"))
    ).all()
    count = 0
    for v in vehicles:
        v.current_odometer = float(req.target_odometer)
        v.last_service_odometer = float(req.target_odometer)
        count += 1

    log = AuditLog(
        username="director",
        module="flota",
        action="calibracion_masiva_odometros",
        details=f"Dirección General calibró {count} vehículos a {req.target_odometer:,.0f} km. Nota: {req.notes}"
    )
    db.add(log)
    db.commit()

    return {
        "success": True,
        "message": f"Se calibraron {count} vehículos de la flota a {req.target_odometer:,.0f} Km.",
        "vehicles_updated": count
    }

