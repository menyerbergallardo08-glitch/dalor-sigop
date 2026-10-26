from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from fastapi.responses import StreamingResponse
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
from app.services.inventory_excel_service import InventoryExcelService
from .assets_common import *

router = APIRouter()


def get_next_asset_code_value(db: Session, asset_type: str = "herramienta", category: Optional[str] = None) -> str:
    import re
    import unicodedata

    asset_type_clean = (asset_type or "").lower().strip()
    cat_clean = (category or "").strip()
    
    if asset_type_clean in ("vehiculo", "camioneta", "camion"):
        vehs = db.query(Asset.asset_code).filter(
            (Asset.asset_type.in_(["vehiculo", "camioneta", "camion"])) |
            (Asset.asset_code.like("%-V-%")) |
            (Asset.asset_code.like("FLT-%"))
        ).all()
        max_num = 0
        for v in vehs:
            if v[0]:
                nums = re.findall(r'\d+', v[0])
                if nums:
                    max_num = max(max_num, int(nums[-1]))
        candidate = f"3-V-1-{max_num + 1:02d}"
        while db.query(Asset).filter(Asset.asset_code == candidate).first():
            max_num += 1
            candidate = f"3-V-1-{max_num + 1:02d}"
        return candidate

    elif asset_type_clean in ("maquinaria", "planta", "generador", "compresor"):
        maqs = db.query(Asset.asset_code).filter(Asset.asset_code.ilike("MAQ-%")).all()
        max_num = 0
        for m in maqs:
            if m[0]:
                match = re.match(r"^MAQ[-_](\d+)", m[0].strip().upper())
                if match:
                    try:
                        max_num = max(max_num, int(match.group(1)))
                    except ValueError:
                        pass
        candidate = f"MAQ-{max_num + 1:03d}"
        while db.query(Asset).filter(
            or_(
                func.upper(Asset.asset_code) == candidate.upper(),
                func.upper(Asset.asset_code).like(f"{candidate.upper()}-%")
            )
        ).first():
            max_num += 1
            candidate = f"MAQ-{max_num + 1:03d}"
        return candidate

    elif asset_type_clean in ("equipo_medicion", "medicion") or "medicion" in cat_clean.lower():
        meds = db.query(Asset.asset_code).filter(Asset.asset_code.ilike("MED-%")).all()
        max_num = 0
        for m in meds:
            if m[0]:
                match = re.match(r"^MED[-_](\d+)", m[0].strip().upper())
                if match:
                    try:
                        max_num = max(max_num, int(match.group(1)))
                    except ValueError:
                        pass
        candidate = f"MED-{max_num + 1:03d}"
        while db.query(Asset).filter(
            or_(
                func.upper(Asset.asset_code) == candidate.upper(),
                func.upper(Asset.asset_code).like(f"{candidate.upper()}-%")
            )
        ).first():
            max_num += 1
            candidate = f"MED-{max_num + 1:03d}"
        return candidate

    else:
        # Herramientas / Categorías dinámicas
        prefix = "HERR"
        if cat_clean and cat_clean.lower() not in ("general", "herramienta", "herramientas", "none"):
            # Generar prefijo desde la categoría
            clean_str = unicodedata.normalize('NFKD', cat_clean).encode('ASCII', 'ignore').decode('utf-8').upper().strip()
            words = [w for w in re.split(r'[\s\-_/,]+', clean_str) if w and w not in ('Y', 'DE', 'DEL', 'LA', 'EL', 'LOS', 'LAS', 'EN', 'PARA')]
            if words:
                prefix = f"HERR-{words[0][:3]}" if len(words[0]) >= 3 else f"HERR-{words[0]}"
        
        candidates = db.query(Asset.asset_code).filter(
            Asset.asset_code.ilike(f"{prefix}-%")
        ).all()
        max_num = 0
        for h in candidates:
            if h[0]:
                raw_code = h[0].strip().upper()
                # Extraer el número de modelo base directamente posterior al prefijo (ej. HERR-013 o HERR-013-09 -> modelo 13)
                pattern = r"^" + re.escape(prefix.upper()) + r"[-_](\d+)"
                m = re.match(pattern, raw_code)
                if m:
                    try:
                        max_num = max(max_num, int(m.group(1)))
                    except ValueError:
                        pass
        num = max_num + 1
        candidate = f"{prefix}-{num:03d}"
        while db.query(Asset).filter(
            or_(
                func.upper(Asset.asset_code) == candidate.upper(),
                func.upper(Asset.asset_code).like(f"{candidate.upper()}-%")
            )
        ).first():
            num += 1
            candidate = f"{prefix}-{num:03d}"
        return candidate


@router.get("/next-code")
def get_next_asset_code_endpoint(
    asset_type: str = "herramienta",
    category: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    return {"next_code": get_next_asset_code_value(db, asset_type, category)}


@router.get("/tools-categories")
def get_tools_categories(db: Session = Depends(get_db)):
    non_tools = ['vehiculo', 'camioneta', 'camion', 'maquinaria', 'planta', 'generador', 'compresor']
    cats = db.query(Asset.category).distinct().filter(
        ~Asset.asset_type.in_(non_tools),
        Asset.category.isnot(None),
        Asset.category != "",
        Asset.category != "General",
        Asset.category != "None"
    ).order_by(Asset.category.asc()).all()
    return [c[0] for c in cats if c[0]]



@router.get("/tools-summary")
def get_tools_summary(include_inactive: bool = False, db: Session = Depends(get_db)):
    """
    Optimized endpoint for tool inventory grouping.
    Returns tools grouped by name with compact representation,
    reducing payload from 465 KB to ~15 KB.
    """
    non_tools = ['vehiculo', 'camioneta', 'camion', 'remolque', 'maquinaria', 'planta', 'generador', 'compresor']
    tools_query = db.query(
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
        Asset.category,
        Asset.is_active
    )
    if not include_inactive:
        tools_query = tools_query.filter(Asset.is_active == True)
    tools = tools_query.filter(~Asset.asset_type.in_(non_tools)).all()

    groups = {}
    for t in tools:
        t_id, code, name, a_type, brand, model, serial, status, loc, cust, proj_id, cat, is_act = t
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
        loc_clean = (loc or "").lower().strip()
        is_base_loc = not loc_clean or ("sede" in loc_clean) or ("base" in loc_clean) or ("guacara" in loc_clean) or ("pañol" in loc_clean) or ("panol" in loc_clean)
        st_clean = (status or "").lower().strip()
        not_in_base = (
            not is_base_loc or
            any(k in st_clean for k in ["alquil", "presta", "comodato", "mtto", "mantenimiento", "en_obra", "asignado", "en_transito", "desincorporado", "baja", "inactivo"]) or
            bool(proj_id)
        )
        is_avail = is_base_loc and not not_in_base and (st_clean in ["disponible_base", "disponible"] or not st_clean)
        if is_avail:
            g["available"] += 1
        else:
            g["in_use"] += 1
        if loc:
            g["locations"].add(loc)
        
        effective_status = status
        if not is_base_loc and (st_clean in ["disponible_base", "disponible"] or not st_clean):
            effective_status = "en_obra"

        g["items"].append({
            "id": t_id,
            "asset_code": code,
            "name": name,
            "brand": brand or "",
            "model": model or "",
            "serial_number": serial or "",
            "category": cat or 'General',
            "status": effective_status,
            "current_location": loc or "Sede Central",
            "current_custodian_name": cust or ("Disponible en Base" if is_base_loc else (loc or "En Obra")),
            "current_project_id": proj_id,
            "is_active": is_act
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
    qty = getattr(asset_in, 'quantity', 1) or 1
    code_val = (asset_in.asset_code or "").strip().upper()

    # Si el código no viene, es un placeholder o ya colisiona en la base de datos (exacto o como modelo con unidades), auto-asignar el siguiente libre
    is_colliding = False
    if code_val:
        collision = db.query(Asset).filter(
            or_(
                func.upper(Asset.asset_code) == code_val,
                func.upper(Asset.asset_code).like(f"{code_val}-%")
            )
        ).first()
        if collision:
            is_colliding = True

    if not code_val or code_val in ("CARGANDO...", "GENERANDO...", "AUTO", "S/C") or is_colliding:
        code_val = get_next_asset_code_value(db, asset_in.asset_type, asset_in.category)
    
    asset_in.asset_code = code_val
    
    if qty > 1:
        base_code = code_val
        existing_codes = set(
            c[0].strip().upper() for c in db.query(Asset.asset_code).filter(func.upper(Asset.asset_code).like(f"{base_code}%")).all() if c[0]
        )
        created_assets = []
        counter = 1
        while len(created_assets) < qty:
            candidate_code = f"{base_code}-{counter:02d}"
            if candidate_code not in existing_codes:
                existing_codes.add(candidate_code)
                new_asset = Asset(
                    asset_code=candidate_code,
                    name=asset_in.name,
                    asset_type=asset_in.asset_type,
                    category=asset_in.category or "General",
                    brand=asset_in.brand,
                    model=asset_in.model,
                    serial_number=f"{asset_in.serial_number}-{counter:02d}" if asset_in.serial_number else None,
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
                created_assets.append(new_asset)
            counter += 1
            if counter > 9999:
                break
        db.commit()
        for a in created_assets:
            db.refresh(a)
        return created_assets[0]
    
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

@router.post("/tools/add-units")
def add_tool_units(req: ToolAddUnitsRequest, db: Session = Depends(get_db)):
    if req.quantity < 1:
        raise HTTPException(status_code=400, detail="La cantidad a agregar debe ser al menos 1.")
    
    # Buscar registros existentes del mismo modelo para tomar sus datos base si no vienen
    base_name = req.tool_name.strip()
    existing_tools = db.query(Asset).filter(
        func.trim(func.upper(Asset.name)) == base_name.upper(),
        Asset.is_active == True
    ).order_by(Asset.id.asc()).all()
    
    sample = existing_tools[0] if existing_tools else None
    
    brand = req.brand if req.brand is not None else (sample.brand if sample else "")
    model = req.model if req.model is not None else (sample.model if sample else "")
    cat = req.category if req.category is not None else (sample.category if sample else "General")
    a_type = req.asset_type if req.asset_type is not None else (sample.asset_type if sample else "herramienta")
    loc = req.current_location or (sample.current_location if sample else "Sede Central Dalor (Guacara)")
    
    # Determinar prefijo de modelo
    import re
    prefix = (req.prefix_code or "").strip().upper()
    if not prefix and sample and sample.asset_code:
        code = sample.asset_code.strip().upper()
        # Si tiene formato con sufijo de unidad (ej. HERR-013-09 o HERR-013-10):
        m_unit = re.match(r"^(.*?)[-_](\d{2,3})$", code)
        parts = [p for p in re.split(r'[-_]', code) if p]
        num_parts = [p for p in parts if p.isdigit()]
        if len(num_parts) >= 2 and m_unit:
            prefix = m_unit.group(1).rstrip("-_")
        else:
            prefix = code
    if not prefix:
        prefix = "HERR-001"
        
    existing_records = db.query(Asset.asset_code).filter(
        func.upper(Asset.asset_code).like(f"{prefix.upper()}%")
    ).all()
    existing_codes = set(c[0].strip().upper() for c in existing_records if c[0])
    existing_codes.add(prefix.upper())

    # Determinar el sufijo numérico máximo existente para este modelo
    max_suffix = 0
    pattern_suffix = r"^" + re.escape(prefix.upper()) + r"[-_](\d+)$"
    for c in existing_codes:
        m_suf = re.match(pattern_suffix, c)
        if m_suf:
            try:
                max_suffix = max(max_suffix, int(m_suf.group(1)))
            except ValueError:
                pass

    created_assets = []
    counter = max_suffix + 1 if max_suffix > 0 else 1
    
    while len(created_assets) < req.quantity:
        candidate_code = f"{prefix}-{counter:02d}" if counter < 100 else f"{prefix}-{counter}"
        if candidate_code not in existing_codes:
            existing_codes.add(candidate_code)
            new_a = Asset(
                asset_code=candidate_code,
                name=base_name,
                asset_type=a_type,
                category=cat,
                brand=brand,
                model=model,
                serial_number=req.serial_number or f"S/N-{candidate_code}",
                status="disponible_base",
                current_location=loc,
                current_custodian_name="Disponible en Base",
                is_exclusive=True,
                is_active=True
            )
            db.add(new_a)
            created_assets.append(candidate_code)
        counter += 1
        if counter > 99999:
            break
            
    db.commit()
    return {
        "success": True,
        "created_count": len(created_assets),
        "new_codes": created_assets,
        "message": f"Se agregaron exitosamente {len(created_assets)} unidades al modelo '{base_name}'."
    }


@router.post("/tools/remove-units")
def remove_tool_units(req: ToolRemoveUnitsRequest, db: Session = Depends(get_db)):
    """
    Resta o desincorpora N unidades físicas de una herramienta existente (solo unidades disponibles en base).
    """
    if req.quantity < 1:
        raise HTTPException(status_code=400, detail="La cantidad a restar debe ser al menos 1.")

    base_name = req.tool_name.strip()

    # Si viene un ID específico a restar/desincorporar
    if req.specific_asset_id:
        target_asset = db.query(Asset).filter(
            Asset.id == req.specific_asset_id,
            Asset.is_active == True
        ).first()
        if not target_asset:
            raise HTTPException(status_code=404, detail="La unidad física especificada no existe o ya está inactiva.")

        target_asset.is_active = False
        target_asset.status = "desincorporado"
        target_asset.current_custodian_name = "Desincorporado / Baja"

        hist = ResourceAssignmentHistory(
            project_id=None,
            resource_type="asset",
            resource_id=target_asset.id,
            resource_code=target_asset.asset_code,
            resource_name=target_asset.name,
            custodian_name="Desincorporado / Baja",
            origin_location=target_asset.current_location or "Sede Central Dalor",
            destination_location="Baja Definitiva",
            status="desincorporado",
            notes=f"Baja de inventario físico: {req.reason}"
        )
        db.add(hist)
        db.commit()
        return {
            "success": True,
            "removed_count": 1,
            "removed_codes": [target_asset.asset_code],
            "message": f"Se dio de baja exitosamente la unidad [{target_asset.asset_code}] de '{target_asset.name}'."
        }

    # Resta por lote de un modelo agrupado
    available_units = db.query(Asset).filter(
        func.trim(func.upper(Asset.name)) == base_name.upper(),
        Asset.is_active == True,
        (Asset.status == "disponible_base") | (Asset.current_project_id == None)
    ).order_by(Asset.id.desc()).all()

    if len(available_units) < req.quantity:
        raise HTTPException(
            status_code=400,
            detail=f"Operación rechazada: Solo hay {len(available_units)} unidades disponibles en base de '{base_name}' para restar (solicitadas: {req.quantity}). Las unidades en obra no pueden restarse sin previo retorno a base."
        )

    removed_codes = []
    units_to_remove = available_units[:req.quantity]
    for unit in units_to_remove:
        unit.is_active = False
        unit.status = "desincorporado"
        unit.current_custodian_name = "Desincorporado / Baja"
        hist = ResourceAssignmentHistory(
            project_id=None,
            resource_type="asset",
            resource_id=unit.id,
            resource_code=unit.asset_code,
            resource_name=unit.name,
            custodian_name="Desincorporado / Baja",
            origin_location=unit.current_location or "Sede Central Dalor",
            destination_location="Baja Definitiva",
            status="desincorporado",
            notes=f"Baja de inventario físico: {req.reason}"
        )
        db.add(hist)
        removed_codes.append(unit.asset_code)

    db.commit()


    return {
        "success": True,
        "removed_count": len(removed_codes),
        "removed_codes": removed_codes,
        "message": f"Se restaron exitosamente {len(removed_codes)} unidades de '{base_name}' ({', '.join(removed_codes)})."
    }


@router.get("/excel-template")
def download_assets_excel_template(db: Session = Depends(get_db)):
    """
    Descarga la plantilla oficial en Excel (.xlsx) con las herramientas, maquinarias y equipos para reforma masiva.
    """
    excel_stream = InventoryExcelService.generate_assets_template(db)
    headers = {
        "Content-Disposition": "attachment; filename=DALOR_Catalogo_Activos_Herramientas.xlsx",
        "Access-Control-Expose-Headers": "Content-Disposition"
    }
    return StreamingResponse(
        excel_stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers=headers
    )


@router.post("/import-excel")
async def import_assets_from_excel(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    Importa masivamente herramientas, maquinarias y activos desde la plantilla Excel de DALOR SIGO-P.
    """
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="Formato de archivo inválido. Debe subir un archivo Excel (.xlsx).")

    contents = await file.read()
    try:
        result = InventoryExcelService.import_assets_excel(contents, db)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error al procesar el archivo Excel: {str(e)}")



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
def get_fleet_summary(include_inactive: bool = False, db: Session = Depends(get_db)):
    # Filter only assets that represent fleet vehicles
    fleet_query = db.query(Asset)
    if not include_inactive:
        fleet_query = fleet_query.filter(Asset.is_active == True)
    fleet_query = fleet_query.filter(
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
        elif a.status == "en_obra" or (a.current_location and "en ruta" in a.current_location.lower()):
            status_val = "en_obra"
            loc_val = a.current_location or "En Operación de Obra / Ruta"
            cust_val = a.current_custodian_name if (a.current_custodian_name and "base" not in a.current_custodian_name.lower()) else "Equipo de Despacho / Obra"
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
    action_str = "reactivar_activo" if asset.is_active else "inactivar_activo"
    details_str = f"Recurso '{asset.name}' ({asset.asset_code}) {'reactivado y puesto disponible en base' if asset.is_active else 'inactivado / dado de baja'}."
    if asset.is_active and not asset.status:
        asset.status = "disponible_base"
    db.add(AuditLog(
        username="director_general",
        module="recursos",
        action=action_str,
        details=details_str
    ))
    db.commit()
    return {
        "success": True,
        "id": asset.id,
        "is_active": asset.is_active,
        "status_label": "Activo" if asset.is_active else "Inactivo / Devuelto",
        "message": details_str
    }

@router.post("/{asset_id}/reactivate")
def reactivate_asset(asset_id: int, db: Session = Depends(get_db)):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Activo no encontrado.")
    asset.is_active = True
    asset.status = "disponible_base"
    db.add(AuditLog(
        username="director_general",
        module="recursos",
        action="reactivar_activo",
        details=f"Recurso '{asset.name}' ({asset.asset_code}) reactivado y puesto en base."
    ))
    db.commit()
    return {"success": True, "message": f"Recurso '{asset.name}' reactivado exitosamente."}

@router.delete("/{asset_id}")
def delete_asset(asset_id: int, db: Session = Depends(get_db)):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Activo no encontrado.")
    asset.is_active = False
    asset.status = "inactivo"
    db.add(AuditLog(
        username="director_general",
        module="recursos",
        action="inactivar_activo",
        details=f"Baja de recurso '{asset.name}' ({asset.asset_code}) registrada en bitácora."
    ))
    db.commit()
    return {"message": "Activo/Herramienta inactivado exitosamente (traza histórica preservada)."}


