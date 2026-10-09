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
    try:
        proj = db.query(Project).filter(Project.id == guide_in.project_id).first() if guide_in.project_id else None
        proj_id = proj.id if proj else None
        proj_label = proj.code if proj else "Traslado General Abierto"

        guide_number = guide_in.guide_number or f"GT-{datetime.now().strftime('%Y%m%d')}-{len(guide_in.items):02d}"
        created_records = []

        for item in guide_in.items:
            asset = db.query(Asset).filter(Asset.id == item.asset_id).first()
            if asset:
                asset.status = "en_obra" if proj_id else "en_transito"
                asset.current_project_id = proj_id
                asset.current_location = guide_in.destination_location
                asset.current_custodian_name = guide_in.receiver_custodian_name

            history_record = ResourceAssignmentHistory(
                project_id=proj_id,
                transfer_code=guide_number,
                resource_type="herramienta_equipo",
                resource_id=item.asset_id,
                resource_code=item.asset_code,
                resource_name=item.name,
                custodian_name=guide_in.receiver_custodian_name,
                driver_name=guide_in.driver_name,
                origin_location=guide_in.origin_location,
                destination_location=guide_in.destination_location,
                freight_cost_usd=guide_in.freight_cost_usd or 0.0,
                fuel_cost_usd=guide_in.fuel_cost_usd or 0.0,
                status="en_obra" if proj_id else "en_transito",
                notes=f"Guía {guide_number} | Chofer: {guide_in.driver_name} (Placa: {guide_in.vehicle_plate}) | {item.condition_notes or ''}"
            )
            db.add(history_record)
            created_records.append(history_record)

        # Registrar gasto logístico de traslado si hubo flete o combustible
        total_logistics_usd = (guide_in.freight_cost_usd or 0.0) + (guide_in.fuel_cost_usd or 0.0)
        if total_logistics_usd > 0:
            from app.models.models import ExpenseCategory
            cat = db.query(ExpenseCategory).filter(ExpenseCategory.code == "20.0").first()
            if not cat:
                cat = db.query(ExpenseCategory).first()
            if cat:
                logistics_expense = Expense(
                    category_id=cat.id,
                    project_id=proj_id if proj_id else 1,
                    expense_type="costo_obra" if proj_id else "gasto_fijo_sede",
                    expense_date=datetime.utcnow(),
                    description=f"Logística de Traslado de Equipos (Guía {guide_number}) - Chofer: {guide_in.driver_name}",
                    supplier_vendor=f"Transporte / {guide_in.driver_name}",
                    amount_usd=total_logistics_usd,
                    amount_bs=total_logistics_usd * 800.0,
                    exchange_rate=800.0,
                    status="aprobado",
                    alert_notes=f"Flete: ${guide_in.freight_cost_usd or 0.0} | Combustible: ${guide_in.fuel_cost_usd or 0.0}"
                )
                db.add(logistics_expense)

        db.commit()

        audit = AuditLog(
            username="almacen",
            module="recursos_obra",
            action="emitir_guia_traslado",
            details=f"Guía de Traslado {guide_number} emitida con {len(guide_in.items)} equipos para '{proj_label}' (Costo Logístico: ${total_logistics_usd:.2f})"
        )
        db.add(audit)
        db.commit()

        return {
            "success": True,
            "guide_number": guide_number,
            "items_count": len(guide_in.items),
            "freight_cost_usd": guide_in.freight_cost_usd or 0.0,
            "fuel_cost_usd": guide_in.fuel_cost_usd or 0.0,
            "message": f"Guía de Traslado {guide_number} generada con éxito."
        }
    except Exception as e:
        import traceback
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error en create_dispatch_guide: {str(e)} -> {traceback.format_exc()}")

