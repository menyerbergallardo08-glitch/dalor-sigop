from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

from app.core.database import get_db
from app.models.models import Asset, Expense, Project, Personnel, ResourceAssignmentHistory, AuditLog, User, AssetRentalLoan, DispatchGuide, AssetRentalLoanItem
from app.core.security import verify_password

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
    ownership_type: Optional[str] = "propio" # propio, alquilado_a_tercero, prestado_de_tercero, alquilado_a_cliente, prestado_a_cliente
    external_entity_name: Optional[str] = None
    rental_rate_usd: Optional[float] = 0.0
    return_due_date: Optional[datetime] = None
    current_location: Optional[str] = "Sede Central"
    current_custodian_name: Optional[str] = "Disponible en Base"
    is_exclusive: bool = True
    is_active: bool = True

class AssetUpdate(BaseModel):
    name: Optional[str] = None
    asset_type: Optional[str] = None
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
            Asset.current_project_id
        )
        .filter(Asset.is_active == True, ~Asset.asset_type.in_(non_tools))
        .all()
    )

    groups = {}
    for t in tools:
        t_id, code, name, a_type, brand, model, serial, status, loc, cust, proj_id = t
        key = (name or 'HERRAMIENTA GENERAL').strip().upper()
        if key not in groups:
            groups[key] = {
                "name": (name or 'Herramienta General').strip(),
                "asset_type": a_type or 'herramienta',
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
        total = query.count()
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
        current_location=asset_in.current_location or "Sede Central",
        current_custodian_name=asset_in.current_custodian_name or "Disponible en Base",
        is_exclusive=asset_in.is_exclusive,
        is_active=asset_in.is_active
    )
    db.add(new_asset)
    db.commit()
    db.refresh(new_asset)
    return new_asset

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


class ServiceRecordCreate(BaseModel):
    new_odometer: float
    service_type: str = "cambio_aceite_filtros"
    cost_usd: float = 0.0
    performed_by: Optional[str] = "Taller Central / Taller Externo"
    notes: Optional[str] = None

@router.post("/{asset_id}/record-service")
def record_asset_service(asset_id: int, req: ServiceRecordCreate, db: Session = Depends(get_db)):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Vehículo/Activo no encontrado.")
    
    asset.current_odometer = req.new_odometer
    asset.last_service_odometer = req.new_odometer
    
    if req.cost_usd > 0:
        from app.models.models import ExpenseCategory
        cat = db.query(ExpenseCategory).filter(ExpenseCategory.name.ilike("%mantenimiento%")).first()
        if not cat:
            cat = db.query(ExpenseCategory).first()
        cat_id = cat.id if cat else 1
        exp = Expense(
            category_id=cat_id,
            asset_id=asset.id,
            supplier_vendor=req.notes or "Taller Central",
            amount_usd=req.cost_usd,
            description=f"Mantenimiento {req.service_type} a {asset.asset_code} ({asset.name}) a los {req.new_odometer} km.",
            status="aprobado",
            exchange_rate=800.0,
            amount_bs=req.cost_usd * 800.0
        )
        db.add(exp)
        
    log = AuditLog(
        username="almacen",
        module="activos",
        action="mantenimiento_vehiculo",
        details=f"Servicio de {req.service_type} registrado para {asset.asset_code}. Odómetro reseteado a {req.new_odometer} km."
    )
    db.add(log)
    db.commit()
    return {
        "success": True, 
        "message": f"Servicio de {req.service_type} registrado. Odómetro actualizado a {req.new_odometer:,.0f} km. Semáforo en VERDE OK (5.000 Km restantes).",
        "remaining_km": asset.service_interval_km or 5000.0
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
