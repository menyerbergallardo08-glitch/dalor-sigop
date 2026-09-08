from sqlalchemy.orm import Session
from app.models.asset import Asset, MaintenanceRecord
from app.models.expense import ExpenseEntry
from typing import Dict, Any, List

class AssetTrackerService:
    @staticmethod
    def get_asset_status_summary(db: Session, asset_id: int) -> Dict[str, Any]:
        asset = db.query(Asset).filter(Asset.id == asset_id).first()
        if not asset:
            return {}

        km_since_last_service = (asset.current_odometer_km_hours or 0.0) - (asset.last_service_odometer or 0.0)
        remaining_km = (asset.service_interval_km_hours or 5000.0) - km_since_last_service

        # Semáforo de Mantenimiento
        traffic_light = "VERDE" # Al día
        if remaining_km <= 0:
            traffic_light = "ROJO_VENCIDO"
        elif remaining_km <= 500:
            traffic_light = "AMARILLO_PROXIMO"

        # Costos acumulados del activo (Mantenimientos + Gastos de combustible/repuestos imputados)
        maintenances = db.query(MaintenanceRecord).filter(MaintenanceRecord.asset_id == asset_id).all()
        total_maintenance_usd = sum(m.cost_usd for m in maintenances)

        expenses = db.query(ExpenseEntry).filter(ExpenseEntry.asset_id == asset_id).all()
        total_fuel_usd = sum(e.amount_usd for e in expenses if e.category and e.category.code == "19.0")
        total_parts_usd = sum(e.amount_usd for e in expenses if e.category and e.category.code == "13.0")

        return {
            "asset_id": asset.id,
            "asset_code": asset.asset_code,
            "name": asset.name,
            "asset_type": asset.asset_type,
            "brand": asset.brand,
            "model": asset.model,
            "current_odometer": asset.current_odometer_km_hours,
            "last_service_odometer": asset.last_service_odometer,
            "km_since_last_service": km_since_last_service,
            "remaining_km_to_service": remaining_km,
            "traffic_light": traffic_light,
            "custodian": asset.current_custodian_name,
            "total_maintenance_cost_usd": round(total_maintenance_usd, 2),
            "total_fuel_cost_usd": round(total_fuel_usd, 2),
            "total_parts_cost_usd": round(total_parts_usd, 2),
            "total_operating_cost_usd": round(total_maintenance_usd + total_fuel_usd + total_parts_usd, 2)
        }

    @staticmethod
    def get_all_fleet_summary(db: Session) -> List[Dict[str, Any]]:
        assets = db.query(Asset).filter(Asset.is_active == True).all()
        return [AssetTrackerService.get_asset_status_summary(db, a.id) for a in assets]
