from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.models.models import Asset, ExpenseCategory

class AssetCreate(BaseModel):
    asset_code: str
    name: str
    asset_type: str  # vehiculo, camioneta, herramienta, maquinaria, equipo_medicion
    category: Optional[str] = "General"
    brand: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None
    license_plate: Optional[str] = None
    current_odometer: Optional[float] = 0.0
    service_interval_km: Optional[float] = 5000.0
    ownership_type: Optional[str] = "propio"  # propio, alquilado_a_tercero, etc.
    external_entity_name: Optional[str] = None
    rental_rate_usd: Optional[float] = 0.0
    return_due_date: Optional[datetime] = None
    current_location: Optional[str] = "Sede Central Dalor (Guacara)"
    current_custodian_name: Optional[str] = "Disponible en Base"
    is_exclusive: bool = True
    is_active: bool = True

class AssetUpdate(BaseModel):
    name: Optional[str] = None
    asset_type: Optional[str] = None
    category: Optional[str] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None
    license_plate: Optional[str] = None
    current_odometer: Optional[float] = None
    service_interval_km: Optional[float] = None
    ownership_type: Optional[str] = None
    external_entity_name: Optional[str] = None
    rental_rate_usd: Optional[float] = None
    return_due_date: Optional[datetime] = None
    current_location: Optional[str] = None
    current_custodian_name: Optional[str] = None
    status: Optional[str] = None
    is_active: Optional[bool] = None

class DispatchGuideItem(BaseModel):
    asset_id: int
    asset_code: str
    name: str
    serial_or_plate: Optional[str] = None
    condition_notes: Optional[str] = "Buen estado operativo"

class DispatchGuideCreate(BaseModel):
    guide_number: Optional[str] = None
    project_id: Optional[int] = None
    origin_location: str = "Taller Central Valencia"
    destination_location: str
    driver_name: str
    vehicle_plate: str
    receiver_custodian_name: str
    freight_cost_usd: Optional[float] = 0.0
    fuel_cost_usd: Optional[float] = 0.0
    observations: Optional[str] = None
    items: List[DispatchGuideItem]

class ServiceRecordCreate(BaseModel):
    new_odometer: Optional[float] = None
    hours_operated: Optional[float] = None
    service_type: str = "mantenimiento_preventivo"
    cost_usd: float = 0.0
    performed_by: Optional[str] = "Taller Central / Taller Externo"
    notes: Optional[str] = None
    reset_oil_interval: Optional[bool] = None
    create_expense: bool = False
    service_date: Optional[datetime] = None

class ServiceRecordUpdate(BaseModel):
    service_type: Optional[str] = None
    service_odometer: Optional[float] = None
    hours_operated: Optional[float] = None
    cost_usd: Optional[float] = None
    technician_workshop: Optional[str] = None
    notes: Optional[str] = None
    create_expense: Optional[bool] = None
    service_date: Optional[datetime] = None

class AdminAuthServiceDelete(BaseModel):
    admin_password: str
    reason: Optional[str] = "Eliminación de servicio solicitada por Administrador"

class OdometerUpdate(BaseModel):
    odometer_reading: float
    photo_url: Optional[str] = None
    reported_by: Optional[str] = "Supervisor de Campo"
    notes: Optional[str] = None

class CalibrateOdometerInput(BaseModel):
    target_odometer: float
    reason: Optional[str] = "Calibración y homologación de odómetro"

class BulkCalibrateOdometerInput(BaseModel):
    target_odometer: float
    vehicle_ids: Optional[List[int]] = None
    reason: Optional[str] = "Calibración masiva de flota"

class AssetMaintenanceInput(BaseModel):
    maintenance_type: str = "preventivo"  # preventivo, correctivo, cambio_aceite, frenos, cauchos
    service_odometer: Optional[float] = None
    technician_or_workshop: str = "Taller Central Guacara"
    cost_usd: Optional[float] = 0.0
    description: str = "Cambio de aceite 15W40 y filtros de aire/aceite"

def get_service_expense_category(db: Session, asset: Asset):
    is_veh = bool(
        (asset.asset_type and asset.asset_type.lower() in ["vehiculo", "camioneta", "camion", "moto", "vehículo", "transporte"])
        or "-V-" in (asset.asset_code or "")
        or asset.license_plate
    )
    if is_veh:
        cat = db.query(ExpenseCategory).filter(
            (ExpenseCategory.code == "13.0") | 
            (ExpenseCategory.name.ilike("%flota%")) | 
            (ExpenseCategory.name.ilike("%vehiculo%"))
        ).first()
    else:
        cat = db.query(ExpenseCategory).filter(
            (ExpenseCategory.name.ilike("%maquinaria%")) |
            (ExpenseCategory.name.ilike("%equipo%")) |
            (ExpenseCategory.name.ilike("%mantenimiento%")) |
            (ExpenseCategory.code == "14.0")
        ).first()
    if not cat:
        cat = db.query(ExpenseCategory).filter(ExpenseCategory.is_active == True).first()
    return cat.id if cat else 1
