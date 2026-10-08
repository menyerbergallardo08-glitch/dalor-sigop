from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from datetime import datetime, timedelta
from typing import List, Optional
from pydantic import BaseModel

from app.core.database import get_db
from app.models.models import (
    Material,
    MaterialMovement,
    Project,
    Expense,
    ExpenseCategory,
    AccountPayable,
    DispatchGuide,
    DispatchGuideItem,
    ProjectMaterialRequisition,
    Asset,
    Personnel,
    ResourceAssignmentHistory
)
from app.services.bcv_scraper import BCVScraperService

router = APIRouter()

# ------------------------------------------------------------------------------
# PYDANTIC SCHEMAS
# ------------------------------------------------------------------------------
class MaterialCreate(BaseModel):
    code: str
    name: str
    category: str = "Acero Estructural"
    unit_measure: str = "UND"
    stock_quantity: float = 0.0
    min_stock_alert: float = 5.0
    unit_cost_usd: float = 0.0
    location: str = "Almacen Central Dalor"

class MaterialEntryItem(BaseModel):
    material_id: int
    quantity: float
    unit_cost_usd: float

class MaterialEntryCreate(BaseModel):
    material_id: Optional[int] = None
    quantity: Optional[float] = None
    unit_cost_usd: Optional[float] = None
    items: Optional[List[MaterialEntryItem]] = None
    supplier_name: Optional[str] = "Proveedor General"
    reference_doc: Optional[str] = None
    notes: Optional[str] = None
    performed_by: Optional[str] = "Custodio de Almacen"
    register_in_cxp: bool = False
    due_days: int = 15
    payment_channel: Optional[str] = "caja_chica_usd"
    payment_ref: Optional[str] = None

class MaterialConsumeItem(BaseModel):
    material_id: int
    quantity: float

class MaterialConsumeCreate(BaseModel):
    material_id: Optional[int] = None
    quantity: Optional[float] = None
    items: Optional[List[MaterialConsumeItem]] = None
    project_id: Optional[int] = None
    destination: Optional[str] = "Taller Central"
    reference_doc: Optional[str] = None
    notes: Optional[str] = None
    performed_by: Optional[str] = "Custodio de Almacen"
    driver_name: Optional[str] = None
    vehicle_plate: Optional[str] = None

class RequisitionDispatchItem(BaseModel):
    requisition_id: int
    quantity_to_dispatch: float

class RequisitionDispatchCreate(BaseModel):
    project_id: int
    items: List[RequisitionDispatchItem]
    driver_name: Optional[str] = None
    driver_id_doc: Optional[str] = None
    vehicle_plate: Optional[str] = None
    vehicle_model: Optional[str] = None
    asset_id: Optional[int] = None
    carrier_company: Optional[str] = "DALOR C.A."
    is_internal: Optional[bool] = None
    notes: Optional[str] = None

# ------------------------------------------------------------------------------
# 1. LISTADO DE MATERIALES & STOCK EN TIEMPO REAL
# ------------------------------------------------------------------------------
@router.get("/")
def get_materials(
    category: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Material).filter((Material.is_active == True) | (Material.is_active == None))
    if category:
        query = query.filter(Material.category == category)
    if search:
        query = query.filter(
            (Material.name.ilike(f"%{search}%")) | (Material.code.ilike(f"%{search}%"))
        )
    materials = query.order_by(Material.category.asc(), Material.name.asc()).all()
    total_inventory_usd = sum(m.stock_quantity * m.unit_cost_usd for m in materials)

    return {
        "total_items": len(materials),
        "total_inventory_usd": round(total_inventory_usd, 2),
        "materials": [{
            "id": m.id,
            "code": m.code,
            "name": m.name,
            "category": m.category,
            "unit_measure": m.unit_measure,
            "stock_quantity": m.stock_quantity,
            "min_stock_alert": m.min_stock_alert,
            "unit_cost_usd": m.unit_cost_usd,
            "total_cost_usd": round(m.stock_quantity * m.unit_cost_usd, 2),
            "location": m.location,
            "is_low_stock": m.stock_quantity <= m.min_stock_alert
        } for m in materials]
    }

# ------------------------------------------------------------------------------
# 2. CREAR NUEVO ITEM DE MATERIAL
# ------------------------------------------------------------------------------
@router.post("/")
def create_material(m_in: MaterialCreate, db: Session = Depends(get_db)):
    existing = db.query(Material).filter(Material.code == m_in.code.strip().upper()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe un material con este codigo.")

    total_cost = m_in.stock_quantity * m_in.unit_cost_usd
    mat = Material(
        code=m_in.code.strip().upper(),
        name=m_in.name.strip(),
        category=m_in.category,
        unit_measure=m_in.unit_measure.strip().upper(),
        stock_quantity=m_in.stock_quantity,
        min_stock_alert=m_in.min_stock_alert,
        unit_cost_usd=m_in.unit_cost_usd,
        total_cost_usd=total_cost,
        location=m_in.location
    )
    db.add(mat)
    db.commit()
    db.refresh(mat)

    if m_in.stock_quantity > 0:
        mov = MaterialMovement(
            material_id=mat.id,
            movement_type="entrada_inicial",
            quantity=m_in.stock_quantity,
            unit_cost_usd=m_in.unit_cost_usd,
            total_cost_usd=total_cost,
            destination="Almacen Central",
            reference_doc="Inventario Inicial",
            notes="Carga de apertura de inventario"
        )
        db.add(mov)
        db.commit()

    return {
        "success": True,
        "message": "Material creado exitosamente.",
        "id": mat.id,
        "code": mat.code,
        "name": mat.name,
        "category": mat.category,
        "unit": mat.unit_measure,
        "unit_measure": mat.unit_measure,
        "unit_cost_usd": mat.unit_cost_usd,
        "stock_quantity": mat.stock_quantity
    }

# ------------------------------------------------------------------------------
# 3. ENTRADA DE MATERIAL (COMPRA / INGRESO A ALMACEN - SOPORTE MULTI-RENGLÓN)
# ------------------------------------------------------------------------------
@router.post("/entry")
def record_material_entry(entry: MaterialEntryCreate, db: Session = Depends(get_db)):
    # 1. Normalizar ítems (soporte multi-renglón y retrocompatibilidad mono-ítem)
    raw_items = entry.items if (entry.items and len(entry.items) > 0) else []
    if not raw_items and entry.material_id:
        if (entry.quantity or 0) <= 0:
            raise HTTPException(status_code=400, detail="La cantidad debe ser mayor a cero.")
        raw_items = [MaterialEntryItem(
            material_id=entry.material_id,
            quantity=entry.quantity,
            unit_cost_usd=entry.unit_cost_usd or 0.0
        )]

    if not raw_items:
        raise HTTPException(status_code=400, detail="Debe ingresar al menos un renglón de material con cantidad válida.")

    try:
        bcv_data = BCVScraperService.get_official_rate()
        current_rate = float(bcv_data.get("rate", 842.21))

        invoice_total_usd = 0.0
        processed_items_desc = []
        created_movements = []

        for item in raw_items:
            if item.quantity <= 0:
                continue

            mat = db.query(Material).filter(Material.id == item.material_id).with_for_update().first()
            if not mat:
                raise HTTPException(status_code=404, detail=f"Material #{item.material_id} no encontrado.")

            item_total = item.quantity * item.unit_cost_usd
            invoice_total_usd += item_total

            prev_stock = max(0.0, float(mat.stock_quantity or 0.0))
            prev_cost = float(mat.unit_cost_usd or 0.0)
            new_qty = float(item.quantity)
            new_cost = float(item.unit_cost_usd)
            total_qty = prev_stock + new_qty

            if total_qty > 0 and new_cost > 0:
                if prev_stock > 0 and prev_cost > 0:
                    # Costo Promedio Ponderado (CPP)
                    mat.unit_cost_usd = round(((prev_stock * prev_cost) + (new_qty * new_cost)) / total_qty, 4)
                else:
                    mat.unit_cost_usd = round(new_cost, 4)

            is_discrete = (mat.unit_measure or "").strip().lower() in ["und", "unid", "unidad", "unidades", "pza", "pieza", "piezas", "rollo", "rollos"]
            mat.stock_quantity = float(round(total_qty)) if is_discrete else round(total_qty, 2)
            mat.total_cost_usd = round(mat.stock_quantity * mat.unit_cost_usd, 2)

            movement = MaterialMovement(
                material_id=mat.id,
                movement_type="entrada_compra",
                quantity=item.quantity,
                unit_cost_usd=item.unit_cost_usd,
                total_cost_usd=round(item_total, 2),
                destination="Almacen Central",
                reference_doc=entry.reference_doc or "Compra de Material",
                notes=f"Proveedor: {entry.supplier_name or 'N/A'}. {entry.notes or ''}",
                performed_by=entry.performed_by or "Custodio de Almacén"
            )
            db.add(movement)
            db.flush()
            created_movements.append(movement)
            processed_items_desc.append(f"{item.quantity:g} {mat.unit_measure} de {mat.name}")

        invoice_total_usd = round(invoice_total_usd, 2)
        summary_desc = f"Compra ({len(processed_items_desc)} ítems): " + "; ".join(processed_items_desc[:4])
        if len(processed_items_desc) > 4:
            summary_desc += f" y {len(processed_items_desc) - 4} más..."

        cash_expense = None
        created_cxp = None
        first_mov_id = created_movements[0].id if created_movements else None
        ref_code = entry.reference_doc or f"CXP-ENT-{first_mov_id or int(datetime.utcnow().timestamp())}"

        if entry.register_in_cxp:
            due_date = datetime.utcnow() + timedelta(days=entry.due_days or 15)
            created_cxp = AccountPayable(
                invoice_number=ref_code,
                supplier_name=entry.supplier_name or "Proveedor de Materiales",
                payable_type="stock_almacen",
                project_id=None,
                description=summary_desc[:250],
                due_date=due_date,
                amount_usd=invoice_total_usd,
                amount_bs=round(invoice_total_usd * current_rate, 2),
                exchange_rate=current_rate,
                balance_usd=invoice_total_usd,
                status="pendiente",
                warehouse_movement_id=first_mov_id,
                warehouse_entry_ref=ref_code,
                notes=f"Generado automáticamente desde entrada de almacén multi-renglón ({len(raw_items)} ítems). {entry.notes or ''}"
            )
            db.add(created_cxp)
        else:
            cat = db.query(ExpenseCategory).filter((ExpenseCategory.code == "17.0") | (ExpenseCategory.code == "11.0")).first()
            ref_info = f"Ref: {entry.payment_ref or entry.reference_doc or 'Contado Almacén'}."
            note_info = f" {entry.notes}" if entry.notes else ""
            cash_expense = Expense(
                category_id=cat.id if cat else 17,
                expense_type="gasto_sede",
                expense_date=datetime.utcnow(),
                description=f"Compra Contado Stock ({len(raw_items)} ítems). {summary_desc[:180]}. {ref_info}{note_info}",
                supplier_vendor=entry.supplier_name or "Proveedor de Materiales",
                amount_usd=invoice_total_usd,
                amount_bs=round(invoice_total_usd * current_rate, 2),
                exchange_rate=current_rate,
                payment_method=entry.payment_channel or "caja_chica_usd",
                status="aprobado"
            )
            db.add(cash_expense)

        db.commit()

        return {
            "success": True,
            "message": f"Entrada multi-renglón procesada exitosamente ({len(raw_items)} ítems ingresados por ${invoice_total_usd:,.2f} USD).",
            "items_count": len(raw_items),
            "total_usd": invoice_total_usd,
            "expense_id": cash_expense.id if cash_expense else None,
            "cxp_id": created_cxp.id if created_cxp else None,
            "invoice_number": ref_code
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Fallo en transacción atómica de almacén: {str(e)}")


# ------------------------------------------------------------------------------
# 4. SALIDA / DESPACHO DE MATERIAL (A PROYECTO O TALLER - CON GUÍA FORMAL GD-XXXX)
# ------------------------------------------------------------------------------
@router.post("/consume")
def record_material_consumption(consume: MaterialConsumeCreate, db: Session = Depends(get_db)):
    # Normalizar ítems (soporte multi-renglón y mono-ítem)
    raw_items = consume.items if (consume.items and len(consume.items) > 0) else []
    if not raw_items and consume.material_id:
        if (consume.quantity or 0) <= 0:
            raise HTTPException(status_code=400, detail="La cantidad a despachar debe ser mayor a cero.")
        raw_items = [MaterialConsumeItem(material_id=consume.material_id, quantity=consume.quantity)]

    if not raw_items:
        raise HTTPException(status_code=400, detail="Debe indicar al menos un material y cantidad a despachar.")

    try:
        bcv_data = BCVScraperService.get_official_rate()
        current_rate = float(bcv_data.get("rate", 842.21))

        proj = None
        project_name = "Taller Central (Gasto Operativo)"
        if consume.project_id:
            proj = db.query(Project).filter(Project.id == consume.project_id).first()
            if proj:
                project_name = f"Proyecto {proj.code} - {proj.name}"

        # Si el despacho es para una obra, emitir formalmente la Guía de Despacho (Punto 5)
        guide = None
        if proj:
            loc_str = f"{proj.location or ''} {proj.name or ''} {proj.code or ''}".lower()
            is_internal_dest = any(k in loc_str for k in ["sede dalor", "sede central", "guacara", "taller", "interna", "interno"])
            
            prefix = "GCI" if is_internal_dest else "GD"
            current_year = datetime.utcnow().year
            seq = db.query(DispatchGuide).filter(DispatchGuide.guide_number.like(f"{prefix}-%")).count() + 1
            guide_number = f"{prefix}-{current_year}-{seq:03d}"
            while db.query(DispatchGuide).filter(DispatchGuide.guide_number == guide_number).first():
                seq += 1
                guide_number = f"{prefix}-{current_year}-{seq:03d}"

            guide = DispatchGuide(
                guide_number=guide_number,
                guide_type="control_interno" if is_internal_dest else "traslado_externo",
                project_id=proj.id,
                client_id=proj.client_id,
                recipient_name=proj.client_name,
                transfer_reason=f"Asignación Interna de Insumos / Taller {proj.code}" if is_internal_dest else f"Despacho de Materiales a Obra {proj.code}",
                destination_address=proj.location or ("Sede Central DALOR (Guacara)" if is_internal_dest else "Frente de Obra Dalor"),
                destination_plant=proj.name or ("Taller Metalmecánico Guacara" if is_internal_dest else "Recepción en Obra"),
                transport_type="interno" if is_internal_dest else "propio_dalor",
                driver_name=None if is_internal_dest else (consume.driver_name or "Transporte DALOR / Conductor Asignado"),
                driver_id_doc=None if is_internal_dest else "V-DALOR",
                vehicle_plate=None if is_internal_dest else (consume.vehicle_plate or "DALOR-01"),
                delivered_by_staff=consume.performed_by or "Custodio de Almacén Dalor",
                received_by_staff="Personal de Taller / Responsable de Obra",
                status="entregado_conforme" if is_internal_dest else "en_transito",
                dispatcher_name=consume.performed_by or "Custodio de Almacén Dalor",
                notes=consume.notes or (f"Asignación interna directa para {proj.code}" if is_internal_dest else f"Despacho automático de almacén para {proj.code}")
            )
            db.add(guide)
            db.flush()

        total_consumed_usd = 0.0
        despachados_summary = []

        for item in raw_items:
            if item.quantity <= 0:
                continue

            mat = db.query(Material).filter(Material.id == item.material_id).with_for_update().first()
            if not mat:
                raise HTTPException(status_code=404, detail=f"Material #{item.material_id} no encontrado.")

            if item.quantity > mat.stock_quantity:
                raise HTTPException(
                    status_code=400,
                    detail=f"Stock insuficiente para {mat.name}: solicitados {item.quantity} {mat.unit_measure}, disponibles {mat.stock_quantity} {mat.unit_measure}."
                )

            item_cost_usd = item.quantity * mat.unit_cost_usd
            total_consumed_usd += item_cost_usd
            mat.stock_quantity -= item.quantity
            mat.total_cost_usd = round(mat.stock_quantity * mat.unit_cost_usd, 2)

            movement = MaterialMovement(
                material_id=mat.id,
                movement_type="despacho_obra",
                quantity=item.quantity,
                unit_cost_usd=mat.unit_cost_usd,
                total_cost_usd=round(item_cost_usd, 2),
                project_id=consume.project_id,
                destination=consume.destination or (proj.location if proj else "Taller Central"),
                reference_doc=guide.guide_number if guide else (consume.reference_doc or "Vale Interno"),
                notes=f"Destino: {project_name}. {consume.notes or ''}",
                performed_by=consume.performed_by or "Custodio de Almacén"
            )
            db.add(movement)

            # Renglón en la Guía de Despacho si aplica
            if guide:
                g_item = DispatchGuideItem(
                    dispatch_guide_id=guide.id,
                    description=f"[{mat.code}] {mat.name}",
                    quantity=item.quantity,
                    unit=mat.unit_measure,
                    condition_status="Nuevo / Verificado en Almacén"
                )
                db.add(g_item)

            # Si existe una requisición pendiente para este proyecto y material, actualizarla
            if proj:
                req_item = db.query(ProjectMaterialRequisition).filter(
                    ProjectMaterialRequisition.project_id == proj.id,
                    ProjectMaterialRequisition.material_id == mat.id
                ).first()
                if req_item:
                    req_item.quantity_dispatched = (req_item.quantity_dispatched or 0.0) + item.quantity
                    if req_item.quantity_dispatched >= req_item.quantity_required:
                        req_item.status = "despachado_total"
                    else:
                        req_item.status = "despachado_parcial"

            despachados_summary.append(f"{item.quantity:g} {mat.unit_measure} de {mat.name}")

        total_consumed_usd = round(total_consumed_usd, 2)

        # Si es para obra, imputar gasto contable
        if consume.project_id:
            cat = db.query(ExpenseCategory).filter(
                (ExpenseCategory.name.ilike("%Insumos%")) | (ExpenseCategory.name.ilike("%Materiales%"))
            ).first() or db.query(ExpenseCategory).first()

            desc_exp = f"Despacho Insumos ({len(raw_items)} ítems) a {project_name}: " + "; ".join(despachados_summary[:3])
            expense = Expense(
                category_id=cat.id if cat else 1,
                project_id=consume.project_id,
                expense_type="costo_obra",
                description=desc_exp[:250],
                supplier_vendor="Almacen Central Dalor",
                amount_usd=total_consumed_usd,
                amount_bs=round(total_consumed_usd * current_rate, 2),
                exchange_rate=current_rate,
                payment_method="consumo_inventario",
                status="aprobado",
                has_receipt=False,
                alert_notes=f"Guía de Despacho #{guide.guide_number if guide else 'S/G'}"
            )
            db.add(expense)

        db.commit()

        return {
            "success": True,
            "message": f"Despacho procesado exitosamente ({len(raw_items)} renglones imputados a {project_name})." + (f" Guía de Despacho formal #{guide.guide_number} emitida." if guide else ""),
            "items_count": len(raw_items),
            "total_cost_imputed_usd": total_consumed_usd,
            "guide_id": guide.id if guide else None,
            "guide_number": guide.guide_number if guide else None
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Fallo en transacción atómica de despacho: {str(e)}")


# ------------------------------------------------------------------------------
# 5. BANDEJA DE ALMACÉN: REQUISICIONES DE MATERIALES DE PROYECTOS (PREPARACIÓN & PICKING)
# ------------------------------------------------------------------------------
@router.get("/project-requisitions")
def get_project_material_requisitions(
    project_id: Optional[int] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(ProjectMaterialRequisition)
    if project_id:
        query = query.filter(ProjectMaterialRequisition.project_id == project_id)
    else:
        closed_statuses = ['culminado', 'completado', 'cerrado', 'cancelado', 'finalizado', 'inactivo']
        query = query.outerjoin(Project, ProjectMaterialRequisition.project_id == Project.id).filter(
            or_(Project.id == None, ~Project.status.in_(closed_statuses))
        )
    if status and status != "all":
        query = query.filter(ProjectMaterialRequisition.status == status)

    rows = query.order_by(ProjectMaterialRequisition.id.desc()).all()

    # Pre-cargar vehículos y personal por proyecto y flota general disponible
    project_logistics = {}
    fleet_assets = db.query(Asset).filter(
        Asset.asset_type.in_(["vehiculo", "camioneta", "camion", "remolque"]),
        Asset.is_active == True
    ).all()
    # Flota disponible en base (sin obra asignada y en estatus disponible)
    available_fleet = [v for v in fleet_assets if not v.current_project_id and (v.status or '').lower() in ['disponible', 'disponible_base']]

    # Personal activo: solo disponible en base o asignado a obras (excluye reposo, vacaciones e inactivos)
    all_pers_raw = db.query(Personnel).filter(
        Personnel.is_active == True,
        (Personnel.status.in_(["disponible", "disponible_base"]) | Personnel.current_project_id.isnot(None))
    ).all()
    # Personal libre en base disponible para traslados
    available_pers = [p for p in all_pers_raw if not p.current_project_id and (p.status or '').lower() in ['disponible', 'disponible_base']]

    for r in rows:
        p_id = r.project_id
        if p_id and p_id not in project_logistics:
            p_vehs = [v for v in fleet_assets if v.current_project_id == p_id]
            p_pers = [p for p in all_pers_raw if p.current_project_id == p_id]
            project_logistics[p_id] = {
                "assigned_vehicles": [{
                    "id": v.id,
                    "code": v.asset_code,
                    "name": v.name,
                    "brand": v.brand or "",
                    "model": v.model or "",
                    "plate": v.license_plate or "S/P"
                } for v in p_vehs],
                "assigned_personnel": [{
                    "id": p.id,
                    "code": p.code,
                    "name": p.full_name,
                    "ci": p.identification_id or "V-DALOR",
                    "role": p.role_title or "Técnico"
                } for p in p_pers]
            }

    results = []
    for r in rows:
        mat = r.material
        asset = r.asset
        res_type = getattr(r, 'resource_type', 'material') or 'material'

        if res_type == 'material':
            stock_disp = mat.stock_quantity if mat else 0.0
            unit_m = r.unit_measure or (mat.unit_measure if mat else "UND")
            m_code = r.material_code or (mat.code if mat else "MAT-REQ")
            m_name = r.material_name or (mat.name if mat else "Insumo")
        else:
            is_avail_for_project = False
            if asset and asset.is_active:
                st = (asset.status or '').lower()
                if st in ['disponible', 'disponible_base'] and (not asset.current_project_id or asset.current_project_id == r.project_id):
                    is_avail_for_project = True
                elif asset.current_project_id == r.project_id:
                    is_avail_for_project = True
            stock_disp = 1.0 if is_avail_for_project else 0.0
            unit_m = "UND"
            m_code = r.material_code or (asset.asset_code if asset else "ACT-REQ")
            m_name = r.material_name or (asset.name if asset else "Equipo / Recurso")

        rem = max(0.0, (r.quantity_required or 0.0) - (r.quantity_dispatched or 0.0))
        results.append({
            "id": r.id,
            "project_id": r.project_id,
            "project_code": r.project.code if r.project else "S/P",
            "project_name": r.project.name if r.project else "Sin Proyecto",
            "project_location": r.project.location if r.project else "Sede Central",
            "is_internal": any(k in f"{r.project.location or ''} {r.project.name or ''}".lower() for k in ["sede dalor", "sede central", "guacara", "taller", "interna", "interno"]) if r.project else True,
            "resource_type": res_type,
            "material_id": r.material_id,
            "asset_id": getattr(r, 'asset_id', None),
            "material_code": m_code,
            "material_name": m_name,
            "unit_measure": unit_m,
            "quantity_required": r.quantity_required,
            "quantity_dispatched": r.quantity_dispatched or 0.0,
            "quantity_pending": rem,
            "stock_available": stock_disp,
            "has_enough_stock": stock_disp >= rem,
            "status": r.status,
            "notes": r.notes or "",
            "project_vehicles": project_logistics.get(r.project_id, {}).get("assigned_vehicles", []),
            "project_personnel": project_logistics.get(r.project_id, {}).get("assigned_personnel", []),
            "available_fleet": [{
                "id": v.id,
                "code": v.asset_code,
                "name": v.name,
                "model": v.model or "",
                "plate": v.license_plate or "S/P"
            } for v in available_fleet],
            "available_personnel": [{
                "id": p.id,
                "name": p.full_name,
                "ci": p.identification_id or "V-DALOR",
                "role": p.role_title or ""
            } for p in available_pers],
            "all_fleet": [{
                "id": v.id,
                "code": v.asset_code,
                "name": v.name,
                "model": v.model or "",
                "plate": v.license_plate or "S/P"
            } for v in available_fleet],
            "all_personnel": [{
                "id": p.id,
                "name": p.full_name,
                "ci": p.identification_id or "V-DALOR",
                "role": p.role_title or ""
            } for p in available_pers],
            "created_at": r.created_at.strftime("%Y-%m-%d %H:%M") if r.created_at else "-"
        })
    return results


@router.post("/dispatch-project-requisition")
def dispatch_project_requisition(req_in: RequisitionDispatchCreate, db: Session = Depends(get_db)):
    proj = db.query(Project).filter(Project.id == req_in.project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado.")

    if not req_in.items:
        raise HTTPException(status_code=400, detail="Debe incluir al menos un ítem a despachar.")

    try:
        loc_str = f"{proj.location or ''} {proj.name or ''} {proj.code or ''}".lower()
        is_internal_dest = (
            req_in.is_internal is True or
            any(k in loc_str for k in ["sede dalor", "sede central", "guacara", "taller", "interna", "interno"])
        )

        prefix = "GCI" if is_internal_dest else "GD"
        current_year = datetime.utcnow().year
        seq = db.query(DispatchGuide).filter(DispatchGuide.guide_number.like(f"{prefix}-%")).count() + 1
        guide_number = f"{prefix}-{current_year}-{seq:03d}"
        while db.query(DispatchGuide).filter(DispatchGuide.guide_number == guide_number).first():
            seq += 1
            guide_number = f"{prefix}-{current_year}-{seq:03d}"

        if is_internal_dest:
            # Vertiente 1: Entrega de Materiales en Taller (Control Interno) -> Cero vehículos, cero choferes
            d_name = None
            d_ci = None
            v_plate = None
            v_model = None
            v_asset_id = None
            c_company = "DALOR C.A."
            guide_type = "control_interno"
            transport_type = "interno"
            transfer_reason = f"Entrega Interna de Insumos ({proj.code})"
            delivered_by = "Custodio de Almacén Dalor"
            received_by = "Personal de Taller / Responsable de Trabajo"
            guide_status = "entregado_conforme"
            default_notes = f"Entrega interna de insumos ({proj.code})"
        else:
            # Vertiente 2: Obra Foránea -> Solo lo que el usuario especificó (chofer de empresa o chofer externo contratado)
            # NUNCA auto-asignar el primer obrero del proyecto
            d_name = (req_in.driver_name or "").strip() or None
            d_ci = (req_in.driver_id_doc or "").strip() or None
            v_plate = (req_in.vehicle_plate or "").strip() or None
            v_model = (req_in.vehicle_model or "").strip() or None
            v_asset_id = req_in.asset_id
            c_company = req_in.carrier_company or "DALOR C.A."
            guide_type = "traslado_externo"
            transport_type = "propio_dalor" if v_asset_id else ("flete_tercerizado" if (v_plate or d_name) else "propio_dalor")
            transfer_reason = f"Despacho de Insumos para Obra Foránea {proj.code}"
            delivered_by = "Custodio de Almacén Dalor"
            received_by = "Receptor en Obra / Responsable en Sitio"
            guide_status = "en_transito"
            default_notes = f"Despacho de lista de armado para obra {proj.code}"

        guide = DispatchGuide(
            guide_number=guide_number,
            guide_type=guide_type,
            project_id=proj.id,
            client_id=proj.client_id,
            recipient_name=proj.client_name,
            transfer_reason=transfer_reason,
            destination_address="Sede Central" if is_internal_dest else (proj.location or "Frente de Obra Dalor"),
            destination_plant=proj.name or ("Sede Central" if is_internal_dest else "Recepción en Obra"),
            transport_type=transport_type,
            carrier_company=c_company,
            asset_id=v_asset_id,
            driver_name=d_name,
            driver_id_doc=d_ci,
            vehicle_plate=v_plate,
            vehicle_model=v_model,
            delivered_by_staff=delivered_by,
            received_by_staff=received_by,
            status=guide_status,
            dispatcher_name="Custodio de Almacén Dalor",
            notes=req_in.notes or default_notes
        )
        db.add(guide)
        db.flush()

        bcv_data = BCVScraperService.get_official_rate()
        current_rate = float(bcv_data.get("rate", 842.21))
        total_usd = 0.0
        guide_items_to_create = []

        for it in req_in.items:
            req_item = db.query(ProjectMaterialRequisition).filter(
                ProjectMaterialRequisition.id == it.requisition_id
            ).first()
            if not req_item or it.quantity_to_dispatch <= 0:
                continue

            pending_qty = max(0.0, (req_item.quantity_required or 0.0) - (req_item.quantity_dispatched or 0.0))
            if it.quantity_to_dispatch > pending_qty + 0.001:
                raise HTTPException(
                    status_code=400,
                    detail=f"La cantidad a despachar ({it.quantity_to_dispatch}) no puede ser mayor al saldo solicitado/pendiente ({pending_qty}) para '{req_item.material_name}'."
                )

            res_type = getattr(req_item, 'resource_type', '') or 'material'

            if res_type == 'material':
                mat = None
                if req_item.material_id:
                    mat = db.query(Material).filter(Material.id == req_item.material_id).with_for_update().first()

                unit_cost = mat.unit_cost_usd if mat else (req_item.estimated_cost_usd / max(1.0, req_item.quantity_required))
                cost_this = it.quantity_to_dispatch * unit_cost
                total_usd += cost_this

                if mat:
                    if it.quantity_to_dispatch > mat.stock_quantity:
                        raise HTTPException(
                            status_code=400,
                            detail=f"Stock insuficiente en pañol para {mat.name}: requerido {it.quantity_to_dispatch}, disponible {mat.stock_quantity}."
                        )
                    mat.stock_quantity -= it.quantity_to_dispatch
                    mat.total_cost_usd = round(mat.stock_quantity * mat.unit_cost_usd, 2)

                    movement = MaterialMovement(
                        material_id=mat.id,
                        movement_type="despacho_obra",
                        quantity=it.quantity_to_dispatch,
                        unit_cost_usd=unit_cost,
                        total_cost_usd=round(cost_this, 2),
                        project_id=proj.id,
                        destination=proj.location or "Obra",
                        reference_doc=guide.guide_number,
                        notes=f"Despacho por requisición #{req_item.id} - Guía {guide.guide_number}",
                        performed_by="Custodio de Almacén"
                    )
                    db.add(movement)

            # Asignación de Activo (Herramienta, Maquinaria, Vehículo)
            elif res_type in ["herramienta", "maquinaria", "vehiculo"] and req_item.asset_id:
                asset = db.query(Asset).filter(Asset.id == req_item.asset_id).first()
                is_valid_asset = False
                if asset and asset.is_active:
                    st = (asset.status or '').lower()
                    if st in ['disponible', 'disponible_base'] and (asset.current_project_id is None or asset.current_project_id == proj.id):
                        is_valid_asset = True
                    elif asset.current_project_id == proj.id:
                        is_valid_asset = True
                if not is_valid_asset:
                    st_desc = asset.status if asset else "no existe"
                    raise HTTPException(
                        status_code=400,
                        detail=f"No se puede despachar {req_item.material_name} ({req_item.material_code}): El equipo no está disponible para esta obra (Estatus: {st_desc})."
                    )
                asset.current_project_id = proj.id
                asset.status = "en_obra"
                asset.current_location = proj.location
                hist = ResourceAssignmentHistory(
                    project_id=proj.id,
                    resource_type="asset",
                    resource_id=asset.id,
                    resource_code=asset.asset_code,
                    resource_name=asset.name,
                    destination_location=proj.location,
                    status="en_obra",
                    transfer_code=guide.guide_number,
                    driver_name=guide.driver_name,
                    notes=f"Despacho y asignación en obra por requisición #{req_item.id} - Guía {guide.guide_number}"
                )
                db.add(hist)

            req_item.quantity_dispatched = (req_item.quantity_dispatched or 0.0) + it.quantity_to_dispatch
            if req_item.quantity_dispatched >= req_item.quantity_required:
                req_item.status = "despachado_total"
            else:
                req_item.status = "despachado_parcial"

            # El vehículo de transporte NO se agrega como ítem de carga en la lista
            if res_type != 'vehiculo':
                guide_items_to_create.append({
                    "resource_type": res_type,
                    "code": req_item.material_code or "",
                    "description": f"[{req_item.material_code}] {req_item.material_name}",
                    "quantity": it.quantity_to_dispatch,
                    "unit": req_item.unit_measure or "UND"
                })

        # ORDENAR LA CARGA: 1° Materiales e Insumos, 2° Herramientas y Equipos, 3° Maquinaria Pesada
        def sort_cargo_items(it_obj):
            t = it_obj["resource_type"]
            order_prio = 1 if t == "material" else (2 if t == "herramienta" else (3 if t == "maquinaria" else 4))
            return (order_prio, it_obj["code"])

        guide_items_to_create.sort(key=sort_cargo_items)

        for seq_idx, it_data in enumerate(guide_items_to_create, 1):
            g_item = DispatchGuideItem(
                dispatch_guide_id=guide.id,
                item_number=seq_idx,
                description=it_data["description"],
                quantity=it_data["quantity"],
                unit=it_data["unit"],
                condition_status="Preparado y Verificado en Almacén"
            )
            db.add(g_item)

        # Imputar costo contable
        cat = db.query(ExpenseCategory).filter(
            (ExpenseCategory.name.ilike("%Insumos%")) | (ExpenseCategory.name.ilike("%Materiales%"))
        ).first() or db.query(ExpenseCategory).first()

        expense = Expense(
            category_id=cat.id if cat else 1,
            project_id=proj.id,
            expense_type="costo_obra",
            description=f"Despacho de Lista de Armado a {proj.code} (Guía {guide.guide_number})",
            supplier_vendor="Almacen Central Dalor",
            amount_usd=round(total_usd, 2),
            amount_bs=round(total_usd * current_rate, 2),
            exchange_rate=current_rate,
            payment_method="consumo_inventario",
            status="aprobado",
            has_receipt=False,
            alert_notes=f"Guía de Despacho #{guide.guide_number}"
        )
        db.add(expense)

        db.commit()
        return {
            "success": True,
            "message": f"Lista de insumos despachada con éxito. Se emitió la Guía de Despacho #{guide.guide_number}.",
            "guide_id": guide.id,
            "guide_number": guide.guide_number,
            "total_usd": round(total_usd, 2)
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Fallo al despachar lista de requisición: {str(e)}")

# ------------------------------------------------------------------------------
# 6. HISTORIAL DE MOVIMIENTOS (KARDEX)
# ------------------------------------------------------------------------------
@router.get("/movements")
def get_material_movements(
    material_id: Optional[int] = None,
    project_id: Optional[int] = None,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    query = db.query(MaterialMovement)
    if material_id:
        query = query.filter(MaterialMovement.material_id == material_id)
    if project_id:
        query = query.filter(MaterialMovement.project_id == project_id)

    rows = query.order_by(MaterialMovement.movement_date.desc()).limit(limit).all()

    return [{
        "id": m.id,
        "material_name": m.material.name if m.material else "N/A",
        "material_code": m.material.code if m.material else "N/A",
        "movement_type": m.movement_type,
        "quantity": m.quantity,
        "unit_measure": m.material.unit_measure if m.material else "UND",
        "unit_cost_usd": m.unit_cost_usd,
        "total_cost_usd": m.total_cost_usd,
        "project_name": m.project.name if m.project else "Taller Central",
        "destination": m.destination,
        "reference_doc": m.reference_doc,
        "notes": m.notes,
        "performed_by": m.performed_by,
        "movement_date": m.movement_date.strftime("%Y-%m-%d %H:%M")
    } for m in rows]

class MaterialCalibrationRequest(BaseModel):
    new_stock_quantity: Optional[float] = None
    new_stock: Optional[float] = None
    reason: str
    director_password: str
    calibrated_by: Optional[str] = "Dirección General"

@router.put("/{material_id}/calibrate")
def calibrate_material_stock(material_id: int, req: MaterialCalibrationRequest, db: Session = Depends(get_db)):
    from app.core.security import verify_password
    from app.models.models import User
    
    stock_qty = req.new_stock_quantity if req.new_stock_quantity is not None else req.new_stock
    if stock_qty is None:
        raise HTTPException(status_code=400, detail="Debe especificar la nueva cantidad física.")

    authorized = False
    admin_users = db.query(User).filter(
        (User.is_superuser == True) | 
        (User.role_name.in_(["director", "director_general", "admin_finanzas", "administrador", "admin"])) |
        (User.username.in_(["admin", "director"]))
    ).all()
    for u in admin_users:
        if u.hashed_password and verify_password(req.director_password, u.hashed_password):
            authorized = True
            break
            
    if not authorized:
        raise HTTPException(status_code=403, detail="Contraseña de autorización de Dirección incorrecta.")
        
    mat = db.query(Material).filter(Material.id == material_id).first()
    if not mat:
        raise HTTPException(status_code=404, detail="Material no encontrado.")
        
    old_stock = mat.stock_quantity or 0.0
    diff = stock_qty - old_stock
    mat.stock_quantity = stock_qty
    
    mov = MaterialMovement(
        material_id=mat.id,
        project_id=None,
        movement_type="calibracion_inventario",
        quantity=abs(diff),
        unit_cost_usd=mat.unit_cost_usd or 0.0,
        total_cost_usd=round(abs(diff) * (mat.unit_cost_usd or 0.0), 2),
        reference_doc="Ajuste Físico Calibrado",
        notes=f"Calibración de Stock (Anterior: {old_stock}, Nuevo: {stock_qty}). Motivo: {req.reason}",
        performed_by=req.calibrated_by or "Dirección General"
    )
    db.add(mov)
    db.commit()
    return {
        "success": True,
        "message": f"Stock de [{mat.code}] {mat.name} calibrado exitosamente de {old_stock} a {stock_qty} {mat.unit_measure}.",
        "previous_stock": old_stock,
        "new_stock": mat.stock_quantity,
        "difference": diff
    }


class MaterialUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    unit_measure: Optional[str] = None
    min_stock_alert: Optional[float] = None
    unit_cost_usd: Optional[float] = None
    location: Optional[str] = None
    is_active: Optional[bool] = None

@router.put("/{material_id}")
def update_material_item(material_id: int, req: MaterialUpdate, db: Session = Depends(get_db)):
    """
    Edita la ficha técnica del material/insumo (nombre, categoría, unidad, costo, stock mínimo, ubicación).
    """
    mat = db.query(Material).filter(Material.id == material_id).first()
    if not mat:
        raise HTTPException(status_code=404, detail="Material no encontrado.")

    if req.name is not None and req.name.strip():
        mat.name = req.name.strip()
    if req.category is not None and req.category.strip():
        mat.category = req.category.strip()
    if req.unit_measure is not None and req.unit_measure.strip():
        mat.unit_measure = req.unit_measure.strip().upper()
    if req.min_stock_alert is not None:
        mat.min_stock_alert = max(0.0, float(req.min_stock_alert))
    if req.unit_cost_usd is not None:
        mat.unit_cost_usd = max(0.0, float(req.unit_cost_usd))
        mat.total_cost_usd = round((mat.stock_quantity or 0.0) * mat.unit_cost_usd, 2)
    if req.location is not None:
        mat.location = req.location.strip()
    if req.is_active is not None:
        mat.is_active = req.is_active

    db.commit()
    db.refresh(mat)

    return {
        "success": True,
        "message": f"Ficha de material [{mat.code}] {mat.name} actualizada correctamente.",
        "material": {
            "id": mat.id,
            "code": mat.code,
            "name": mat.name,
            "category": mat.category,
            "unit_measure": mat.unit_measure,
            "stock_quantity": mat.stock_quantity,
            "min_stock_alert": mat.min_stock_alert,
            "unit_cost_usd": mat.unit_cost_usd,
            "location": mat.location,
            "is_active": mat.is_active
        }
    }

