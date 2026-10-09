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

@router.get("/tools-summary")
def get_tools_summary(db: Session = Depends(get_db)):
    """
    Optimized endpoint for tool inventory grouping.
    Returns tools grouped by name with compact representation,
    reducing payload from 465 KB to ~15 KB.
    """
    non_tools = ['vehiculo', 'camioneta', 'camion', 'remolque', 'maquinaria', 'planta', 'generador', 'compresor']
    tools = (
        db.query(
            Asset.id,
            Asset.asset_code,
            Asset.name,
            Asset.asset_type,
            Asset.brand,
            Asset.model,
            Asset.serial_number,
            Asset.status,
            Asset.current_location,
            Asset.current_custodian_name,
            Asset.current_project_id,
            Asset.category
        )
        .filter(Asset.is_active == True, ~Asset.asset_type.in_(non_tools))
        .all()
    )

    groups = {}
    for t in tools:
        t_id, code, name, a_type, brand, model, serial, status, loc, cust, proj_id, cat = t
        key = (name or 'HERRAMIENTA GENERAL').strip().upper()
        if key not in groups:
            groups[key] = {
                "name": (name or 'Herramienta General').strip(),
                "asset_type": a_type or 'herramienta',
                "category": cat or 'General',
                "total": 0,
                "available": 0,
                "in_use": 0,
                "locations": set(),
                "items": []
            }
        g = groups[key]
        g["total"] += 1
        is_avail = (status == "disponible_base" or not proj_id)
        if is_avail:
            g["available"] += 1
        else:
            g["in_use"] += 1
        if loc:
            g["locations"].add(loc)
        
        g["items"].append({
            "id": t_id,
            "asset_code": code,
            "name": name,
            "brand": brand or "",
            "model": model or "",
            "serial_number": serial or "",
            "category": cat or 'General',
            "status": status,
            "current_location": loc or "Sede Central",
            "current_custodian_name": cust or "Disponible en Base",
            "current_project_id": proj_id
        })

    result = []
    for g in groups.values():
        g["locations"] = sorted(list(g["locations"]))
        result.append(g)

    return result

@router.get("/")
def get_assets(
    asset_type: Optional[str] = None,
    ownership_type: Optional[str] = None,
    include_inactive: bool = False,
    search: Optional[str] = None,
    page: Optional[int] = Query(None, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    query = db.query(Asset)
    if not include_inactive:
        query = query.filter(Asset.is_active == True)
    if asset_type:
        query = query.filter(Asset.asset_type == asset_type)
    if ownership_type:
        query = query.filter(Asset.ownership_type == ownership_type)
    if search:
        s = f"%{search.strip()}%"
        query = query.filter(or_(Asset.name.ilike(s), Asset.asset_code.ilike(s), Asset.brand.ilike(s)))
        
    query = query.order_by(Asset.asset_code.asc())
    
    is_paginated = page is not None and isinstance(page, int)
    if is_paginated:
        total = query.order_by(None).count()
        items = query.offset((page - 1) * page_size).limit(page_size).all()
        return {
            "items": items,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size if page_size > 0 else 1
        }
        
    return query.all()

@router.post("/")
def create_asset(asset_in: AssetCreate, db: Session = Depends(get_db)):
    existing = db.query(Asset).filter(Asset.asset_code == asset_in.asset_code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe un activo/herramienta con ese código.")
    
    new_asset = Asset(
        asset_code=asset_in.asset_code,
        name=asset_in.name,
        asset_type=asset_in.asset_type,
        category=asset_in.category or "General",
        brand=asset_in.brand,
        model=asset_in.model,
        serial_number=asset_in.serial_number,
        license_plate=asset_in.license_plate,
        current_odometer=asset_in.current_odometer or 0.0,
        service_interval_km=asset_in.service_interval_km or 5000.0,
        last_service_odometer=asset_in.current_odometer or 0.0,
        ownership_type=asset_in.ownership_type or "propio",
        external_entity_name=asset_in.external_entity_name,
        rental_rate_usd=asset_in.rental_rate_usd or 0.0,
        return_due_date=asset_in.return_due_date,
        status="disponible_base",
        current_location=asset_in.current_location or "Sede Central Dalor (Guacara)",
        current_custodian_name=asset_in.current_custodian_name or "Disponible en Base",
        is_exclusive=asset_in.is_exclusive,
        is_active=asset_in.is_active
    )
    db.add(new_asset)
    db.commit()
    db.refresh(new_asset)
    return new_asset

@router.get("/categories/list")
def get_asset_categories(db: Session = Depends(get_db)):
    cats = db.query(Asset.category).filter(Asset.is_active == True, Asset.category != None).distinct().all()
    cleaned = sorted(list(set(c[0] for c in cats if c[0])))
    return cleaned

@router.get("/types/list")
def get_asset_types(db: Session = Depends(get_db)):
    types = db.query(Asset.asset_type).filter(Asset.is_active == True, Asset.asset_type != None).distinct().all()
    cleaned = sorted(list(set(t[0] for t in types if t[0])))
    default_types = ["herramienta_mayor", "herramienta_menor", "maquinaria", "vehiculo", "equipo_medicion"]
    for dt in default_types:
        if dt not in cleaned:
            cleaned.append(dt)
    return sorted(cleaned)

@router.get("/fleet-summary")
def get_fleet_summary(db: Session = Depends(get_db)):
    # Filter only assets that represent fleet vehicles
    fleet_query = db.query(Asset).filter(
        Asset.is_active == True,
        or_(
            Asset.asset_type.in_(["vehiculo", "camioneta", "camion", "moto", "vehículo", "transporte"]),
            Asset.asset_code.like("%-V-%"),
            Asset.category.ilike("%flota%"),
            Asset.license_plate != None
        )
    )
    assets = fleet_query.all()
    if not assets:
        return []

    asset_ids = [a.id for a in assets]

    # Pre-aggregate expenses and services in 2 single queries instead of N*2 queries
    expenses_raw = db.query(Expense.asset_id, func.sum(Expense.amount_usd)).filter(Expense.asset_id.in_(asset_ids)).group_by(Expense.asset_id).all()
    exp_map = {r[0]: (float(r[1]) if r[1] else 0.0) for r in expenses_raw}

    services_raw = db.query(AssetService.asset_id, func.count(AssetService.id)).filter(AssetService.asset_id.in_(asset_ids)).group_by(AssetService.asset_id).all()
    svc_map = {r[0]: (int(r[1]) if r[1] else 0) for r in services_raw}

    proj_ids = [a.current_project_id for a in assets if a.current_project_id]
    projects_map = {p.id: p for p in db.query(Project).filter(Project.id.in_(proj_ids)).all()} if proj_ids else {}

    result = []
    for a in assets:
        total_exp = exp_map.get(a.id, 0.0)
        services_count = svc_map.get(a.id, 0)
        km_since_service = (a.current_odometer or 0.0) - (a.last_service_odometer or 0.0)
        remaining_km = (a.service_interval_km or 5000.0) - km_since_service
        
        traffic_light = "VERDE_OK"
        if remaining_km <= 0:
            traffic_light = "ROJO_VENCIDO"
        elif remaining_km <= 500:
            traffic_light = "AMARILLO_PROXIMO"
            
        is_in_project = bool(a.current_project_id and a.current_project_id in projects_map)
        if is_in_project:
            p = projects_map[a.current_project_id]
            status_val = "en_obra"
            loc_val = f"[{p.code}] {p.name}" + (f" ({p.location})" if p.location else "")
            cust_val = a.current_custodian_name if (a.current_custodian_name and "base" not in a.current_custodian_name.lower()) else f"Equipo de Obra ({p.code})"
        elif a.status in ["en_operacion", "asignado"] or (a.current_custodian_name and "base" not in a.current_custodian_name.lower() and "disponible" not in a.current_custodian_name.lower()):
            status_val = "en_operacion"
            loc_val = a.current_location or "Sede Central Dalor (Uso Administrativo / Logística)"
            cust_val = a.current_custodian_name or "Asignado a Custodio"
        else:
            status_val = "disponible_base"
            loc_val = a.current_location or "Sede Central Dalor (Guacara)"
            cust_val = a.current_custodian_name or "Disponible en Base"
            
        result.append({
            "id": a.id,
            "asset_code": a.asset_code,
            "name": a.name,
            "asset_type": a.asset_type,
            "category": a.category or "Flota Vehicular",
            "brand": a.brand,
            "model": a.model,
            "serial_number": a.serial_number,
            "license_plate": a.license_plate,
            "current_project_id": a.current_project_id,
            "status": status_val,
            "current_location": loc_val,
            "current_odometer": a.current_odometer or 0.0,
            "remaining_km_to_service": round(remaining_km, 1),
            "traffic_light": traffic_light,
            "custodian": cust_val,
            "services_count": services_count,
            "total_operating_cost_usd": round(total_exp, 2)
        })
    return result

@router.get("/{asset_id}")
def get_asset_by_id(asset_id: int, db: Session = Depends(get_db)):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Activo no encontrado.")
    return asset

@router.put("/{asset_id}")
def update_asset(asset_id: int, asset_in: AssetUpdate, db: Session = Depends(get_db)):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Activo no encontrado.")
    
    for field, val in asset_in.dict(exclude_unset=True).items():
        setattr(asset, field, val)
        
    db.commit()
    db.refresh(asset)
    return asset

@router.post("/{asset_id}/toggle-active")
def toggle_asset_active(asset_id: int, db: Session = Depends(get_db)):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Activo no encontrado.")
    asset.is_active = not asset.is_active
    db.commit()
    return {
        "success": True,
        "id": asset.id,
        "is_active": asset.is_active,
        "status_label": "Activo" if asset.is_active else "Inactivo / Devuelto"
    }

@router.delete("/{asset_id}")
def delete_asset(asset_id: int, db: Session = Depends(get_db)):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Activo no encontrado.")
    asset.is_active = False
    db.commit()
    return {"message": "Activo/Herramienta inactivado exitosamente (traza histórica preservada)."}

