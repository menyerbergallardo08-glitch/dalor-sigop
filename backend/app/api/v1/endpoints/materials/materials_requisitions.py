from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_
from datetime import datetime
from typing import Optional

from app.core.database import get_db
from app.models.models import (
    Material,
    MaterialMovement,
    Project,
    DispatchGuide,
    DispatchGuideItem,
    ProjectMaterialRequisition,
    Asset,
    Personnel,
    ResourceAssignmentHistory,
)
from app.services.bcv_scraper import BCVScraperService
from .materials_common import RequisitionDispatchCreate

router = APIRouter()

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


