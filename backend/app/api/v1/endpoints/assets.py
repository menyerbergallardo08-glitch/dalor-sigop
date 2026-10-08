from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

from app.core.database import get_db
from app.models.models import Asset, AssetService, Expense, ExpenseCategory, Project, Personnel, ResourceAssignmentHistory, AuditLog, User, AssetRentalLoan, DispatchGuide, AssetRentalLoanItem
from app.core.security import verify_password

router = APIRouter()

class AssetCreate(BaseModel):
    asset_code: str
    name: str
    asset_type: str # vehiculo, camioneta, herramienta, maquinaria, equipo_medicion
    category: Optional[str] = "General"
    brand: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None
    license_plate: Optional[str] = None
    current_odometer: Optional[float] = 0.0
    service_interval_km: Optional[float] = 5000.0
    ownership_type: Optional[str] = "propio" # propio, alquilado_a_tercero, prestado_de_tercero, alquilado_a_cliente, prestado_a_cliente
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

class OdometerUpdate(BaseModel):
    odometer_reading: float
    photo_url: Optional[str] = None
    reported_by: Optional[str] = "Supervisor de Campo"
    notes: Optional[str] = None

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

class AssetMaintenanceInput(BaseModel):
    maintenance_type: str = "preventivo" # preventivo, correctivo, cambio_aceite, frenos, cauchos
    service_odometer: Optional[float] = None
    technician_or_workshop: str = "Taller Central Guacara"
    cost_usd: Optional[float] = 0.0
    description: str = "Cambio de aceite 15W40 y filtros de aire/aceite"

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
