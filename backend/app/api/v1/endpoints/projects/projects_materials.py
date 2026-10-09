from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Response, Query
from sqlalchemy.orm import Session, joinedload, selectinload
from typing import List, Optional
from datetime import datetime, timedelta
import re
from sqlalchemy import func
from app.core.database import get_db
from app.models.models import (
    Project, Client, Expense, ProjectPhase, Asset, Personnel, 
    ResourceAssignmentHistory, AccountReceivable, AccountPayable, 
    FinancialPayment, ProjectAddendum, AuditLog, Material, 
    ProjectMaterialRequisition, MaterialMovement, User
)
from app.schemas.schemas import ProjectCreate, ProjectUpdate, ProjectOut, ProjectAddendumCreate, ProjectAddendumOut
from app.services.excel_service import ExcelProjectService
from .projects_common import *

router = APIRouter()

@router.post("/{project_id}/request-materials")
def request_materials_for_project(
    project_id: int,
    req_in: ProjectMaterialRequestIn,
    db: Session = Depends(get_db)
):
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado.")

    created = []
    for it in req_in.items:
        m = None
        if it.material_id:
            m = db.query(Material).filter(Material.id == it.material_id).first()
        
        m_name = m.name if m else (it.material_name or "Insumo Requerido")
        m_code = m.code if m else "MAT-REQ"
        m_unit = m.unit_measure if m else (it.unit_measure or "UND")
        cost_est = (m.unit_cost_usd or 0.0) * it.quantity if m else 0.0

        requisition = ProjectMaterialRequisition(
            project_id=proj.id,
            material_id=m.id if m else None,
            material_code=m_code,
            material_name=m_name,
            unit_measure=m_unit,
            quantity_required=it.quantity,
            quantity_dispatched=0.0,
            estimated_cost_usd=round(cost_est, 2),
            status="pendiente",
            notes=it.notes or req_in.notes or "Solicitado a almacén para avance de obra"
        )
        db.add(requisition)
        created.append(requisition)

    db.commit()
    return {
        "success": True,
        "message": f"Se registraron {len(created)} requerimientos de insumos a almacén para el proyecto {proj.code}.",
        "items_count": len(created)
    }

@router.post("/{project_id}/request-dispatch")
def request_project_dispatch(project_id: int, req: ProjectDispatchRequest, db: Session = Depends(get_db)):
    from app.models.models import DispatchGuide, DispatchGuideItem, Material, MaterialMovement
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado.")
    
    if proj.status == "culminado":
        from app.models.models import ProjectAddendum
        has_addendum = db.query(ProjectAddendum).filter(ProjectAddendum.project_id == proj.id).first()
        if not has_addendum:
            raise HTTPException(
                status_code=400,
                detail=f"La obra [{proj.code}] '{proj.name}' se encuentra CULMINADA y cerrada. No se permite solicitar ni despachar insumos sin una adenda contractual aprobada."
            )

    dest_loc = req.destination_address or proj.location or "En Obra"
    dispatch_items = []

    # 1. Asignar Personal
    for pers_id in req.assigned_personnel_ids:
        p = db.query(Personnel).filter(Personnel.id == pers_id).first()
        if not p:
            raise HTTPException(status_code=404, detail=f"Personal con ID {pers_id} no encontrado.")
        if p.current_project_id and p.current_project_id != proj.id:
            assigned_proj = db.query(Project).filter(Project.id == p.current_project_id).first()
            p_code = assigned_proj.code if assigned_proj else f"ID {p.current_project_id}"
            raise HTTPException(
                status_code=400,
                detail=f"El trabajador [{p.code}] {p.full_name} ya está asignado a otra obra [{p_code}]. Si requiere trasladarlo a esta obra, debe solicitarse mediante 'Transferencia entre Obras'."
            )
        if p.current_project_id != proj.id and (p.is_active is False or (p.status or "").lower() not in ["disponible_base", "disponible"]):
            raise HTTPException(
                status_code=400,
                detail=f"El trabajador [{p.code}] {p.full_name} no está disponible en base (Estado actual: '{p.status or 'no disponible'}')."
            )
        p.current_project_id = proj.id
        p.status = "en_obra"
        p.current_location = dest_loc
        hist = ResourceAssignmentHistory(
            project_id=proj.id,
            resource_type="personnel",
            resource_id=p.id,
            resource_code=p.code,
            resource_name=p.full_name,
            destination_location=dest_loc,
            status="en_obra",
            notes=req.notes or "Despacho solicitado para obra"
        )
        db.add(hist)
        dispatch_items.append(DispatchGuideItem(
            description=f"Personal Operativo: [{p.code}] {p.full_name} ({p.role_title or 'Técnico'})",
            quantity=1.0,
            unit="Persona",
            condition_status="Operativo en Faena"
        ))

    # 2. Asignar Vehículos
    for veh_id in req.assigned_vehicle_ids:
        a = db.query(Asset).filter(Asset.id == veh_id).first()
        if not a:
            raise HTTPException(status_code=404, detail=f"Vehículo con ID {veh_id} no encontrado.")
        if a.current_project_id and a.current_project_id != proj.id:
            assigned_proj = db.query(Project).filter(Project.id == a.current_project_id).first()
            p_code = assigned_proj.code if assigned_proj else f"ID {a.current_project_id}"
            raise HTTPException(
                status_code=400,
                detail=f"El vehículo [{a.asset_code}] {a.name} ya está asignado a otra obra [{p_code}]. Si se encuentra en otra obra, debe solicitarse mediante 'Transferencia entre Obras'."
            )
        if a.current_project_id != proj.id and (a.is_active is False or (a.status or "").lower() not in ["disponible_base", "disponible"]):
            raise HTTPException(
                status_code=400,
                detail=f"El vehículo [{a.asset_code}] {a.name} no está disponible en base (Estado actual: '{a.status or 'no disponible'}')."
            )
        a.current_project_id = proj.id
        a.status = "en_obra"
        a.current_location = dest_loc
        hist = ResourceAssignmentHistory(
            project_id=proj.id,
            resource_type="asset",
            resource_id=a.id,
            resource_code=a.asset_code,
            resource_name=a.name,
            start_odometer=a.current_odometer,
            destination_location=dest_loc,
            status="en_obra",
            notes=req.notes or "Vehículo asignado a obra"
        )
        db.add(hist)
        dispatch_items.append(DispatchGuideItem(
            description=f"Unidad de Flota: [{a.asset_code}] {a.name} (Placa: {a.license_plate or 'S/P'})",
            quantity=1.0,
            unit="Unidad",
            condition_status="Operativo"
        ))

    # 3. Asignar Herramientas
    for tool_id in req.assigned_tool_ids:
        t = db.query(Asset).filter(Asset.id == tool_id).first()
        if not t:
            raise HTTPException(status_code=404, detail=f"Herramienta/Equipo con ID {tool_id} no encontrado.")
        if t.current_project_id and t.current_project_id != proj.id:
            assigned_proj = db.query(Project).filter(Project.id == t.current_project_id).first()
            p_code = assigned_proj.code if assigned_proj else f"ID {t.current_project_id}"
            raise HTTPException(
                status_code=400,
                detail=f"El equipo/herramienta [{t.asset_code}] {t.name} ya está asignado a otra obra [{p_code}]. Si se encuentra en otra obra, debe solicitarse mediante 'Transferencia entre Obras'."
            )
        if t.current_project_id != proj.id and (t.is_active is False or (t.status or "").lower() not in ["disponible_base", "disponible"]):
            raise HTTPException(
                status_code=400,
                detail=f"El equipo/herramienta [{t.asset_code}] {t.name} no está disponible en base (Estado actual: '{t.status or 'no disponible'}')."
            )
        t.current_project_id = proj.id
        t.status = "en_obra"
        t.current_location = dest_loc
        hist = ResourceAssignmentHistory(
            project_id=proj.id,
            resource_type="asset",
            resource_id=t.id,
            resource_code=t.asset_code,
            resource_name=t.name,
            destination_location=dest_loc,
            status="en_obra",
            notes=req.notes or "Herramienta despachada a obra"
        )
        db.add(hist)
        dispatch_items.append(DispatchGuideItem(
            description=f"Equipo/Herramienta: [{t.asset_code}] {t.name} (Serial: {t.serial_number or 'S/N'})",
            quantity=1.0,
            unit="Pza",
            condition_status="En Uso Operativo"
        ))

    # 4. Materiales Solicitados
    for mat_item in req.materials:
        mid = mat_item.get("material_id")
        qty = float(mat_item.get("quantity") or 0.0)
        if mid and qty > 0:
            m = db.query(Material).filter(Material.id == mid).first()
            if m:
                if m.stock_quantity < qty:
                    raise HTTPException(status_code=400, detail=f"Stock insuficiente para material [{m.code}] {m.name}. Stock disponible: {m.stock_quantity} {m.unit_measure}.")
                m.stock_quantity -= qty
                mov = MaterialMovement(
                    material_id=m.id,
                    project_id=proj.id,
                    movement_type="despacho_obra",
                    quantity=qty,
                    unit_cost_usd=m.unit_cost_usd or 0.0,
                    total_cost_usd=round(qty * (m.unit_cost_usd or 0.0), 2),
                    reference_doc=f"Solicitud Obra {proj.code}",
                    notes=req.notes or "Despacho a obra",
                    performed_by="Solicitud de Proyecto"
                )
                db.add(mov)

                # Actualizar o crear registro de requisición en la obra para reflejar cantidad despachada
                req_mat = db.query(ProjectMaterialRequisition).filter(
                    ProjectMaterialRequisition.project_id == proj.id,
                    ProjectMaterialRequisition.material_id == m.id
                ).first()
                if req_mat:
                    req_mat.quantity_dispatched = (req_mat.quantity_dispatched or 0.0) + qty
                    if req_mat.quantity_dispatched >= (req_mat.quantity_required or 0.0):
                        req_mat.status = "despachado_total"
                    else:
                        req_mat.status = "despachado_parcial"
                else:
                    new_req_mat = ProjectMaterialRequisition(
                        project_id=proj.id,
                        material_id=m.id,
                        material_code=m.code,
                        material_name=m.name,
                        unit_measure=m.unit_measure or "UND",
                        quantity_required=qty,
                        quantity_dispatched=qty,
                        status="despachado_total",
                        notes=req.notes or "Despachado a obra"
                    )
                    db.add(new_req_mat)

                dispatch_items.append(DispatchGuideItem(
                    description=f"Material: [{m.code}] {m.name}",
                    quantity=qty,
                    unit=m.unit_measure or "UND",
                    condition_status="Nuevo / Conforme"
                ))

    # 5. Generar la Guía de Despacho vinculada (GCI para sede, GD para foránea)
    if dispatch_items:
        current_year = datetime.utcnow().year
        is_internal = bool(req.is_internal)
        proj_loc_lower = (proj.location or "").lower()
        if not is_internal and any(w in proj_loc_lower for w in ["sede", "guacara", "taller"]):
            # Si la ubicación del proyecto es sede y no se forzó otra cosa, tratar como interno
            if not req.driver_id and not req.driver_name and not req.assigned_vehicle_ids:
                is_internal = True

        prefix = f"GCI-{current_year}" if is_internal else f"GD-{current_year}"
        existing_count = db.query(DispatchGuide).filter(DispatchGuide.guide_number.like(f"{prefix}-%")).count() + 1
        guide_code = f"{prefix}-{existing_count:04d}" if is_internal else f"{prefix}-{existing_count:03d}"
        while db.query(DispatchGuide).filter(DispatchGuide.guide_number == guide_code).first():
            existing_count += 1
            guide_code = f"{prefix}-{existing_count:04d}" if is_internal else f"{prefix}-{existing_count:03d}"

        # Asignar item_number secuencial a cada ítem de la guía
        for idx, itm in enumerate(dispatch_items):
            itm.item_number = idx + 1

        if is_internal:
            # Control Interno: Sede / Taller Guacara. Sin chofer ni vehículo.
            guide = DispatchGuide(
                guide_number=guide_code,
                guide_type="control_interno",
                project_id=proj.id,
                client_id=proj.client_id,
                transfer_reason=f"Control Interno Sede / Taller [{proj.code}] {proj.name}",
                destination_address=dest_loc,
                destination_plant=proj.name or "Taller Guacara / Sede",
                transport_type="traslado_interno",
                asset_id=None,
                vehicle_plate="INTERNO",
                vehicle_model="Uso Interno en Sede",
                carrier_company="Control Interno DALOR",
                driver_name="Traslado Interno en Planta",
                driver_id_doc="INTERNO",
                delivered_by_staff=req.delivered_by_staff or "Almacén Central DALOR (Guacara)",
                received_by_staff=req.received_by_staff or "Taller Guacara / Cuadrilla",
                status="emitida",
                notes=req.notes or "Movimiento interno registrado desde Ficha de Obra",
                items=dispatch_items
            )
        else:
            # Guía Oficial de Despacho (GD): Traslado Foráneo a Cliente.
            # Chofer debe ser seleccionado explícitamente (NUNCA predeterminado automáticamente)
            driver_name_val = "Sin Conductor Asignado"
            driver_id_doc_val = "S/D"
            if req.driver_id:
                driver_p = db.query(Personnel).filter(Personnel.id == req.driver_id).first()
                if driver_p:
                    driver_name_val = driver_p.full_name
                    driver_id_doc_val = getattr(driver_p, "identification_id", None) or getattr(driver_p, "id_document", None) or "V-DALOR"
            elif req.driver_name and req.driver_name.strip():
                driver_name_val = req.driver_name.strip()
                driver_id_doc_val = req.driver_id_doc or "V-00000000"

            first_veh = db.query(Asset).filter(Asset.id.in_(req.assigned_vehicle_ids)).first() if req.assigned_vehicle_ids else None

            guide = DispatchGuide(
                guide_number=guide_code,
                guide_type="traslado_externo",
                project_id=proj.id,
                client_id=proj.client_id,
                transfer_reason=f"Despacho Operativo para Obra [{proj.code}] {proj.name}",
                destination_address=dest_loc,
                destination_plant=proj.client_name or "Planta Cliente",
                transport_type="propio_dalor",
                asset_id=first_veh.id if first_veh else None,
                vehicle_plate=first_veh.license_plate if first_veh and first_veh.license_plate else "S/P",
                vehicle_model=f"{first_veh.brand or ''} {first_veh.name}" if first_veh else "Transporte DALOR",
                driver_name=driver_name_val,
                driver_id_doc=driver_id_doc_val,
                delivered_by_staff=req.delivered_by_staff or "Almacén Central DALOR",
                received_by_staff=req.received_by_staff or "Receptor en Obra",
                status="emitida",
                notes=req.notes or "Solicitud de despacho originada desde la Ficha de Obra",
                items=dispatch_items
            )
        db.add(guide)

    db.commit()
    guide_code_ret = guide.guide_number if (dispatch_items and 'guide' in locals()) else None
    guide_id_ret = guide.id if (dispatch_items and 'guide' in locals()) else None
    guide_type_ret = guide.guide_type if (dispatch_items and 'guide' in locals()) else "traslado_externo"

    doc_label = "Vale de Control Interno" if guide_type_ret == "control_interno" else "Guía de Despacho Oficial"
    return {
        "success": True,
        "message": f"Solicitud procesada exitosamente para la obra {proj.code}." + (f" Se emitió el {doc_label} N° {guide_code_ret}." if guide_code_ret else ""),
        "guide_number": guide_code_ret,
        "guide_id": guide_id_ret,
        "guide_type": guide_type_ret,
        "items_count": len(dispatch_items)
    }

class MaterialReturnRequest(BaseModel):
    material_id: int
    quantity: float
    notes: Optional[str] = None
    returned_by: Optional[str] = "Responsable de Obra"

@router.post("/{project_id}/return-material")
def return_project_material(project_id: int, req: MaterialReturnRequest, db: Session = Depends(get_db)):
    from app.models.models import MaterialMovement, Material
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado.")

    mat = db.query(Material).filter(Material.id == req.material_id).first()
    if not mat:
        raise HTTPException(status_code=404, detail="Material no encontrado.")

    if req.quantity <= 0:
        raise HTTPException(status_code=400, detail="La cantidad a devolver debe ser mayor a 0.")

    # Validar que no se intente devolver más de lo despachado a esta obra
    from app.models.models import ProjectMaterialRequisition
    req_item = db.query(ProjectMaterialRequisition).filter(
        ProjectMaterialRequisition.project_id == project_id,
        ProjectMaterialRequisition.material_id == req.material_id
    ).first()
    if not req_item or (float(req_item.quantity_dispatched or 0.0) <= 0):
        raise HTTPException(
            status_code=400,
            detail=f"Operación rechazada: El material [{mat.code}] '{mat.name}' no cuenta con registros de despacho para esta obra."
        )

    max_disp = float(req_item.quantity_dispatched or 0.0)
    if req.quantity > (max_disp + 0.001):
        raise HTTPException(
            status_code=400,
            detail=f"Operación rechazada: No puedes devolver {req.quantity} {mat.unit_measure or 'UND'}. La cantidad máxima despachada a esta obra es {max_disp} {mat.unit_measure or 'UND'}."
        )
    req_item.quantity_dispatched = max(0.0, round(max_disp - req.quantity, 2))
    req_item.quantity_required = max(0.0, round((req_item.quantity_required or 0.0) - req.quantity, 2))
    req_item.estimated_cost_usd = max(0.0, round(req_item.quantity_required * (mat.unit_cost_usd or 0.0), 2))
    if req_item.quantity_required == 0 and req_item.quantity_dispatched == 0:
        req_item.status = "devuelto_total"
    elif req_item.quantity_dispatched == 0:
        req_item.status = "pendiente"
    elif req_item.quantity_dispatched < (req_item.quantity_required or 0.0):
        req_item.status = "despachado_parcial"
    else:
        req_item.status = "despachado_total"

    # Incrementar stock en almacén central y actualizar valoración total de inventario
    mat.stock_quantity = round((mat.stock_quantity or 0.0) + req.quantity, 2)
    mat.total_cost_usd = round(mat.stock_quantity * (mat.unit_cost_usd or 0.0), 2)

    # Descontar monto del material devuelto del costo de materiales de la obra y su límite presupuestario
    returned_amount = round(req.quantity * (mat.unit_cost_usd or 0.0), 2)
    proj.estimated_materials_usd = max(0.0, round((proj.estimated_materials_usd or 0.0) - returned_amount, 2))
    proj.budget_limit_usd = round(
        (proj.estimated_labor_usd or 0.0) +
        (proj.estimated_fuel_usd or 0.0) +
        (proj.estimated_materials_usd or 0.0) +
        (proj.estimated_tools_usd or 0.0) +
        (proj.estimated_services_usd or 0.0), 2
    )

    # Reintegrar / descontar el costo real imputado a la obra en Gastos / Job Costing
    from app.models.models import Expense, ExpenseCategory, AuditLog
    remaining_to_discount = returned_amount
    dispatch_expenses = (
        db.query(Expense)
        .filter(
            Expense.project_id == proj.id,
            Expense.payment_method == "consumo_inventario",
            Expense.status == "aprobado"
        )
        .order_by(Expense.id.desc())
        .all()
    )

    for de in dispatch_expenses:
        if remaining_to_discount <= 0:
            break
        if de.amount_usd > 0:
            deduct = min(de.amount_usd, remaining_to_discount)
            de.amount_usd = round(de.amount_usd - deduct, 2)
            de.base_amount_usd = de.amount_usd
            de.amount_bs = round(de.amount_usd * (de.exchange_rate or 800.0), 2)
            return_note = f"Devolución: -{req.quantity} {mat.unit_measure or 'UND'} de [{mat.code}] {mat.name} (-${deduct:.2f} USD)"
            de.alert_notes = f"{de.alert_notes or ''} | {return_note}".strip(" |")
            remaining_to_discount = round(remaining_to_discount - deduct, 2)

    # Si no había gastos de despacho previos o quedó saldo remanente, registrar crédito/reintegro de gasto
    if remaining_to_discount > 0:
        cat = db.query(ExpenseCategory).filter(
            (ExpenseCategory.name.ilike("%Insumos%")) | (ExpenseCategory.name.ilike("%Materiales%"))
        ).first() or db.query(ExpenseCategory).first()
        credit_exp = Expense(
            category_id=cat.id if cat else 1,
            project_id=proj.id,
            expense_type="costo_obra",
            description=f"Reintegro por Devolución de Material a Almacén: [{mat.code}] {mat.name} ({req.quantity} {mat.unit_measure or 'UND'}) - Obra {proj.code}",
            supplier_vendor="Almacén Central Dalor",
            amount_usd=-remaining_to_discount,
            base_amount_usd=-remaining_to_discount,
            amount_bs=-round(remaining_to_discount * 800.0, 2),
            exchange_rate=800.0,
            payment_method="consumo_inventario",
            status="aprobado",
            has_receipt=False,
            alert_notes=f"Devolución formal de insumo a almacén central"
        )
        db.add(credit_exp)

    # Registrar movimiento formal de devolución de obra a almacén
    mov = MaterialMovement(
        material_id=mat.id,
        project_id=proj.id,
        movement_type="devolucion_obra",
        quantity=req.quantity,
        unit_cost_usd=mat.unit_cost_usd or 0.0,
        total_cost_usd=returned_amount,
        reference_doc=f"Devolución Obra {proj.code}",
        notes=req.notes or f"Devolución de excedente desde obra {proj.code} a almacén central",
        performed_by=req.returned_by or "Responsable de Obra"
    )
    db.add(mov)

    # Auditoría visible
    audit_entry = AuditLog(
        username=req.returned_by or "almacen",
        module="proyectos",
        action="devolucion_material",
        details=f"Devolución de {req.quantity} {mat.unit_measure or 'UND'} de [{mat.code}] {mat.name} al Almacén Central desde obra {proj.code}. Reintegro contable: -${returned_amount:,.2f} USD."
    )
    db.add(audit_entry)
    db.commit()
    return {
        "success": True,
        "message": f"Se devolvieron exitosamente {req.quantity} {mat.unit_measure or 'UND'} de [{mat.code}] {mat.name} al almacén central. Se reintegraron ${returned_amount} USD al costo de la obra.",
        "new_stock": mat.stock_quantity,
        "new_project_materials_usd": proj.estimated_materials_usd
    }


class MaterialSubstituteRequest(BaseModel):
    requisition_id: int
    new_material_id: int
    reason: Optional[str] = "Sustitución técnica de material en obra"
    notes: Optional[str] = None

@router.post("/{project_id}/substitute-material")
def substitute_project_material(project_id: int, req: MaterialSubstituteRequest, db: Session = Depends(get_db)):
    from app.models.models import ProjectMaterialRequisition, Material
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado.")

    req_item = db.query(ProjectMaterialRequisition).filter(
        ProjectMaterialRequisition.id == req.requisition_id,
        ProjectMaterialRequisition.project_id == proj.id
    ).first()
    if not req_item:
        raise HTTPException(status_code=404, detail="Requisición de material no encontrada en este proyecto.")

    from app.models.models import Asset
    new_mat = db.query(Material).filter(Material.id == req.new_material_id).first()
    new_asset = None
    if not new_mat:
        new_asset = db.query(Asset).filter(Asset.id == req.new_material_id).first()
    if not new_mat and not new_asset:
        raise HTTPException(status_code=404, detail="Nuevo insumo no encontrado en catálogo de materiales ni activos.")

    old_mat = req_item.material
    old_mat_name = req_item.material_name or (old_mat.name if old_mat else f"ID {req_item.material_id}")
    old_mat_code = req_item.material_code or (old_mat.code if old_mat else "MAT")

    if new_mat:
        req_item.material_id = new_mat.id
        req_item.material_code = new_mat.code
        req_item.material_name = new_mat.name
        req_item.resource_type = "material"
        if new_mat.unit_measure:
            req_item.unit_measure = new_mat.unit_measure
        if new_mat.unit_cost_usd:
            req_item.estimated_cost_usd = round((req_item.quantity_required or 1.0) * new_mat.unit_cost_usd, 2)
        target_code = new_mat.code
        target_name = new_mat.name
    else:
        req_item.material_id = None
        req_item.material_code = new_asset.asset_code
        req_item.material_name = new_asset.name
        req_item.resource_type = new_asset.asset_type or "herramienta"
        req_item.resource_id = new_asset.id
        req_item.unit_measure = "UND"
        target_code = new_asset.asset_code
        target_name = new_asset.name

    append_note = f"[Sustituido: {old_mat_code} {old_mat_name} por {target_code} - {target_name}. Motivo: {req.reason}]"
    req_item.notes = f"{req_item.notes or ''} {append_note}".strip()

    db.commit()
    return {
        "success": True,
        "message": f"Insumo sustituido exitosamente: [{old_mat_code}] {old_mat_name} reemplazado por [{target_code}] {target_name}.",
        "requisition_id": req_item.id,
        "new_material": {
            "id": new_mat.id if new_mat else new_asset.id,
            "code": target_code,
            "name": target_name,
            "unit_measure": req_item.unit_measure
        }
    }


class ProjectResourceSubstituteRequest(BaseModel):
    resource_type: str
    old_id: int
    new_id: int
    reason: Optional[str] = "Reemplazo operativo en obra"
    notes: Optional[str] = None

@router.post("/{project_id}/substitute-resource")
def substitute_project_resource(project_id: int, req: ProjectResourceSubstituteRequest, db: Session = Depends(get_db)):
    from app.api.v1.endpoints.resources import ResourceSubstituteRequest, substitute_resource
    res_req = ResourceSubstituteRequest(
        project_id=project_id,
        resource_type=req.resource_type,
        old_id=req.old_id,
        new_id=req.new_id,
        reason=req.reason,
        notes=req.notes
    )
    return substitute_resource(res_req, db)


