from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime

from app.core.database import get_db
from app.models.models import (
    DispatchGuide, DispatchGuideItem, Project, Client, Asset, User,
    AccountPayable, AccountReceivable, Expense, ExpenseCategory, AuditLog, ProjectAddendum,
    Material, MaterialMovement, ResourceAssignmentHistory
)
from .dispatch_common import DispatchGuideCreate, DispatchGuideUpdate, DispatchGuideCancelIn
from app.api.deps import get_current_active_user

router = APIRouter(dependencies=[Depends(get_current_active_user)])

@router.post("/")
def create_dispatch_guide(
    g_in: DispatchGuideCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    client = None
    if g_in.client_id:
        client = db.query(Client).filter(Client.id == g_in.client_id).first()
    
    if g_in.is_freeform is not None:
        is_free = bool(g_in.is_freeform)
    else:
        is_free = bool(g_in.recipient_name and not g_in.client_id and not g_in.project_id)
    recipient = (g_in.recipient_name or "").strip()
    if not recipient and client:
        recipient = client.name
    elif not recipient and not client:
        recipient = "Destinatario Libre / Particular"

    if g_in.project_id:
        proj = db.query(Project).filter(Project.id == g_in.project_id).first()
        if proj:
            proj_st = (proj.status or "").lower().strip()
            if proj_st in ["culminado", "completado", "cerrado", "cancelado", "finalizado", "inactivo"]:
                has_addendum = db.query(ProjectAddendum).filter(ProjectAddendum.project_id == proj.id).first()
                if not has_addendum:
                    raise HTTPException(
                        status_code=400,
                        detail=f"La obra [{proj.code}] '{proj.name}' se encuentra {proj_st.upper()} y cerrada. No se permite despachar insumos a obras cerradas sin una adenda contractual aprobada."
                    )

            if g_in.client_id and proj.client_id and proj.client_id != g_in.client_id:
                raise HTTPException(
                    status_code=400,
                    detail=f"Inconsistencia: El proyecto [{proj.code}] pertenece a otro cliente y no puede cruzarse."
                )

    if g_in.asset_id:
        veh_asset = db.query(Asset).filter(Asset.id == g_in.asset_id).first()
        if veh_asset:
            st = (veh_asset.status or "").lower()
            if not veh_asset.is_active or st in ["en_mantenimiento", "mantenimiento", "en_reparacion", "reparacion", "inactivo", "desincorporado", "no_disponible"]:
                raise HTTPException(
                    status_code=400,
                    detail=f"El vehículo de flota [{veh_asset.asset_code}] '{veh_asset.name}' no está disponible para despacho (Estatus actual: {veh_asset.status})."
                )

    client_id_val = client.id if client else None

    guide_type = (g_in.guide_type or "traslado_externo").strip()
    is_internal = guide_type == "control_interno"

    # Correlativo automático si no viene provisto
    guide_num = g_in.guide_number
    prefix = "GCI-2026" if is_internal else "GD-2026"
    if not guide_num:
        import re
        existing_guides = db.query(DispatchGuide.guide_number).filter(DispatchGuide.guide_number.like(f"{prefix}-%")).all()
        max_num = 0
        for eg in existing_guides:
            if eg[0]:
                m = re.search(r'(\d+)$', eg[0])
                if m:
                    try:
                        max_num = max(max_num, int(m.group(1)))
                    except ValueError:
                        pass
        next_num = max_num + 1
        guide_num = f"{prefix}-{next_num:04d}" if is_internal else f"{prefix}-{next_num:03d}"
        while db.query(DispatchGuide.id).filter(DispatchGuide.guide_number == guide_num).first():
            next_num += 1
            guide_num = f"{prefix}-{next_num:04d}" if is_internal else f"{prefix}-{next_num:03d}"

    dest_addr = (g_in.destination_address or ("Taller DALOR Guacara (Control Interno)" if is_internal else "Sede Central DALOR")).strip()
    d_name = (g_in.driver_name or ("Personal Dalor Taller" if is_internal else "Chofer")).strip()
    d_doc = (g_in.driver_id_doc or ("N/A" if is_internal else "-")).strip()
    v_plate = (g_in.vehicle_plate or "S/P").strip().upper()

    new_guide = DispatchGuide(
        guide_number=guide_num,
        guide_type=guide_type,
        delivered_by_staff=g_in.delivered_by_staff.strip() if g_in.delivered_by_staff else None,
        received_by_staff=g_in.received_by_staff.strip() if g_in.received_by_staff else None,
        project_id=g_in.project_id,
        client_id=client_id_val,
        recipient_name=recipient,
        transfer_reason=(g_in.transfer_reason or ("Control Interno Taller Guacara" if is_internal else "Despacho de Producción")).strip(),
        is_freeform=is_free,
        dispatch_date=g_in.dispatch_date or datetime.utcnow(),
        destination_address=dest_addr,
        destination_plant=g_in.destination_plant.strip() if g_in.destination_plant else None,
        transport_type=g_in.transport_type or "propio_dalor",
        asset_id=g_in.asset_id,
        carrier_company=g_in.carrier_company.strip() if g_in.carrier_company else None,
        driver_name=d_name,
        driver_id_doc=d_doc,
        driver_phone=g_in.driver_phone.strip() if g_in.driver_phone else None,
        vehicle_model=g_in.vehicle_model.strip() if g_in.vehicle_model else None,
        vehicle_plate=v_plate,
        freight_cost_usd=g_in.freight_cost_usd or 0.0,
        freight_price_charged_usd=g_in.freight_price_charged_usd or 0.0,
        status="entregado_conforme" if is_internal else "en_transito",
        quality_inspector=g_in.quality_inspector or "Control de Calidad DALOR",
        dispatcher_name=g_in.dispatcher_name or ("Almacén Dalor Guacara" if is_internal else "Despacho Taller Guacara"),
        notes=g_in.notes
    )
    db.add(new_guide)
    db.flush()

    # Agregar ítems y actualizar estatus de recursos (bloqueo real de herramientas/maquinaria)
    for idx, it in enumerate(g_in.items):
        item_obj = DispatchGuideItem(
            dispatch_guide_id=new_guide.id,
            item_number=idx + 1,
            description=it.description.strip(),
            quantity=it.quantity,
            unit=it.unit or "Pzas",
            condition_status=it.condition_status or "Reparado / Listo para Montaje",
            approx_weight_kg=it.approx_weight_kg or 0.0
        )
        db.add(item_obj)

        # Si el ítem es un Activo (Herramienta o Maquinaria): Bloqueo operativo inmediato
        if getattr(it, "asset_id", None):
            cargo_asset = db.query(Asset).filter(Asset.id == it.asset_id).first()
            if cargo_asset and cargo_asset.is_active:
                target_status = "en_obra" if g_in.project_id else "en_transito"
                cargo_asset.status = target_status
                if g_in.project_id:
                    cargo_asset.current_project_id = g_in.project_id
                cargo_asset.current_location = dest_addr or "En Custodia de Despacho"
                hist = ResourceAssignmentHistory(
                    project_id=g_in.project_id,
                    resource_type="asset",
                    resource_id=cargo_asset.id,
                    resource_code=cargo_asset.asset_code,
                    resource_name=cargo_asset.name,
                    destination_location=dest_addr,
                    status=target_status,
                    transfer_code=guide_num,
                    driver_name=d_name,
                    notes=f"Despachado en Guía {guide_num} para {recipient}"
                )
                db.add(hist)

        # Si el ítem es un Material consumible de almacén: Descuento de stock
        elif getattr(it, "material_id", None):
            cargo_mat = db.query(Material).filter(Material.id == it.material_id).with_for_update().first()
            if cargo_mat:
                req_qty = float(it.quantity or 0.0)
                curr_stock = float(cargo_mat.stock_quantity or 0.0)
                if curr_stock < req_qty:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Stock insuficiente en almacén para '{cargo_mat.name}' ({cargo_mat.code}). Stock disponible: {curr_stock} {cargo_mat.unit_of_measure or 'Pzas'}, solicitado: {req_qty}."
                    )
                if req_qty > 0:
                    cargo_mat.stock_quantity = round(cargo_mat.stock_quantity - req_qty, 2)
                    cargo_mat.total_cost_usd = round(cargo_mat.stock_quantity * (cargo_mat.unit_cost_usd or 0.0), 2)
                    mov = MaterialMovement(
                        material_id=cargo_mat.id,
                        movement_type="despacho_obra" if g_in.project_id else "salida_ajuste",
                        quantity=req_qty,
                        unit_cost_usd=cargo_mat.unit_cost_usd or 0.0,
                        total_cost_usd=round(req_qty * (cargo_mat.unit_cost_usd or 0.0), 2),
                        project_id=g_in.project_id,
                        destination=dest_addr,
                        reference_doc=guide_num,
                        notes=f"Salida en Guía {guide_num} - {recipient}",
                        performed_by=g_in.dispatcher_name or "Despacho Taller"
                    )
                    db.add(mov)

    # 1. Si el transporte es TERCERIZADO y tiene costo > 0: Generar Cuenta por Pagar (CxP) automática
    if g_in.transport_type == "tercerizado_flete" and (g_in.freight_cost_usd or 0.0) > 0:
        carrier_name = g_in.carrier_company or f"Transportista {g_in.driver_name}"
        f_cost = float(g_in.freight_cost_usd)
        new_cxp = AccountPayable(
            invoice_number=f"FLT-{guide_num}",
            supplier_name=carrier_name,
            project_id=g_in.project_id,
            payable_type="costo_material_obra" if g_in.project_id else "gasto_fijo_sede",
            description=f"Flete / Transporte Tercerizado Guía {guide_num} para {recipient}",
            due_date=datetime.utcnow(),
            amount_usd=f_cost,
            balance_usd=f_cost,
            status="pendiente"
        )
        db.add(new_cxp)
        db.flush()
        new_guide.payable_id = new_cxp.id

        # Si está asociado a un proyecto, imputar a gastos del proyecto
        if g_in.project_id:
            cat = db.query(ExpenseCategory).filter(ExpenseCategory.code == "20.0").first() or db.query(ExpenseCategory).first()
            exp = Expense(
                category_id=cat.id if cat else 1,
                project_id=g_in.project_id,
                description=f"Servicio Flete Tercerizado ({guide_num}) - {carrier_name}",
                supplier_vendor=carrier_name,
                amount_usd=f_cost,
                amount_bs=f_cost * 800.0,
                exchange_rate=800.0,
                status="aprobado"
            )
            db.add(exp)

    # 2. Si se cobra flete al cliente: Generar Cuenta por Cobrar (CxC) de flete/logística
    if (g_in.freight_price_charged_usd or 0.0) > 0:
        f_price = float(g_in.freight_price_charged_usd)
        c_id = g_in.client_id or client_id_val
        if not c_id:
            rec_client = db.query(Client).filter(Client.name == recipient).first()
            if not rec_client:
                rec_client = Client(
                    name=recipient or "Destinatario Eventual",
                    code=f"CLI-EVT-{int(datetime.utcnow().timestamp())}",
                    rif="J-00000000-0",
                    contact_name=recipient or "Destinatario Libre",
                    contact_phone="0412-0000000",
                    contact_email="contacto@cliente.com",
                    address=g_in.destination_address or "Venezuela"
                )
                db.add(rec_client)
                db.flush()
            c_id = rec_client.id
            new_guide.client_id = c_id

        new_cxc = AccountReceivable(
            invoice_number=f"FLT-CLI-{guide_num}",
            client_id=c_id,
            project_id=g_in.project_id,
            description=f"Servicio de Flete / Logística de Entrega ({guide_num}) para {recipient}",
            due_date=datetime.utcnow(),
            amount_usd=f_price,
            balance_usd=f_price,
            status="pendiente"
        )
        db.add(new_cxc)
        db.flush()
        new_guide.receivable_id = new_cxc.id

    # 3. 🚛 Acoplamiento Logístico: Actualizar estatus y ubicación de vehículo DALOR en la Matriz
    if g_in.transport_type == "propio_dalor" and g_in.asset_id:
        veh = db.query(Asset).filter(Asset.id == g_in.asset_id).first()
        if veh:
            dest = g_in.destination_plant or g_in.destination_address or "En Tránsito / Despacho"
            veh.status = "en_obra"
            if g_in.project_id:
                veh.current_project_id = g_in.project_id
            if g_in.driver_name and g_in.driver_name.strip():
                veh.current_custodian_name = g_in.driver_name.strip()
            veh.current_location = f"En ruta: {dest}"
            hist = ResourceAssignmentHistory(
                resource_type="asset",
                resource_id=veh.id,
                resource_code=veh.asset_code,
                resource_name=veh.name,
                project_id=g_in.project_id,
                origin_location="Sede Central Dalor (Guacara)",
                destination_location=dest,
                custodian_name=g_in.driver_name,
                driver_name=g_in.driver_name,
                transfer_code=guide_num,
                notes=f"Guía {guide_num} para {recipient}"
            )
            db.add(hist)

    # Auditoría
    audit = AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        module="despachos_taller",
        action="emitir_guia_despacho",
        details=f"Guía de Despacho {guide_num} emitida para cliente '{recipient}' ({len(g_in.items)} ítems, Modalidad: {g_in.transport_type})"
    )
    db.add(audit)
    db.commit()

    return {
        "success": True,
        "id": new_guide.id,
        "guide_number": guide_num,
        "is_freeform": new_guide.is_freeform,
        "message": f"Guía de Despacho {guide_num} emitida exitosamente."
    }

def release_guide_resources(guide: DispatchGuide, db: Session, action_name: str, reason: str = ""):
    """Libera activos, vehículos y devuelve stock de materiales a base cuando una guía se reversa, anula o elimina."""
    import re
    # 1. Liberar activos de carga
    for item in guide.items:
        cargo_asset = None
        if getattr(item, "asset_id", None):
            cargo_asset = db.query(Asset).filter(Asset.id == item.asset_id).first()
        elif item.description:
            m = re.search(r'\[([A-Za-z0-9\-_]+)\]', item.description)
            if m:
                code = m.group(1)
                cargo_asset = db.query(Asset).filter(Asset.asset_code == code).first()
            if not cargo_asset:
                cargo_asset = db.query(Asset).filter(Asset.name == item.description.strip()).first()
        
        if cargo_asset:
            cargo_asset.status = "disponible"
            cargo_asset.current_project_id = None
            cargo_asset.current_location = "Sede Central Dalor (Guacara)"
            hist = ResourceAssignmentHistory(
                project_id=guide.project_id,
                resource_type="asset",
                resource_id=cargo_asset.id,
                resource_code=cargo_asset.asset_code,
                resource_name=cargo_asset.name,
                origin_location=guide.destination_address or "Frente de Obra",
                destination_location="Sede Central Dalor (Guacara)",
                status="disponible",
                transfer_code=guide.guide_number,
                notes=f"{action_name}: Guía {guide.guide_number} reversada/anulada. {reason}".strip()
            )
            db.add(hist)

        # 2. Devolver stock de materiales consumibles
        cargo_mat = None
        if getattr(item, "material_id", None):
            cargo_mat = db.query(Material).filter(Material.id == item.material_id).first()
        elif item.description:
            cargo_mat = db.query(Material).filter(Material.name == item.description.strip()).first()
            
        if cargo_mat:
            return_qty = float(item.quantity or 0.0)
            if return_qty > 0:
                cargo_mat.stock_quantity = round(cargo_mat.stock_quantity + return_qty, 2)
                cargo_mat.total_cost_usd = round(cargo_mat.stock_quantity * (cargo_mat.unit_cost_usd or 0.0), 2)
                mov = MaterialMovement(
                    material_id=cargo_mat.id,
                    movement_type="reversion_despacho",
                    quantity=return_qty,
                    unit_cost_usd=cargo_mat.unit_cost_usd or 0.0,
                    total_cost_usd=round(return_qty * (cargo_mat.unit_cost_usd or 0.0), 2),
                    project_id=guide.project_id,
                    destination="Almacén Central Dalor",
                    reference_doc=guide.guide_number,
                    notes=f"Reincorporación a stock por {action_name} Guía {guide.guide_number}. {reason}".strip(),
                    performed_by="Auditoría / Sistema"
                )
                db.add(mov)

    # 3. Liberar vehículo DALOR si estaba asignado
    if guide.asset_id:
        veh = db.query(Asset).filter(Asset.id == guide.asset_id).first()
        if veh:
            veh.status = "disponible"
            veh.current_project_id = None
            veh.current_location = "Sede Central Dalor (Guacara)"
            hist = ResourceAssignmentHistory(
                resource_type="asset",
                resource_id=veh.id,
                resource_code=veh.asset_code,
                resource_name=veh.name,
                project_id=guide.project_id,
                origin_location="En ruta / Despacho",
                destination_location="Sede Central Dalor (Guacara)",
                transfer_code=guide.guide_number,
                notes=f"Vehículo liberado por {action_name} Guía {guide.guide_number}"
            )
            db.add(hist)

def safe_cancel_guide_financials(guide: DispatchGuide, db: Session, action_name: str, reason: str = ""):
    """Anula o desvincula CxP y CxC asociadas a la guía protegiendo contra errores de clave foránea si hay pagos."""
    if guide.payable_id:
        ap = db.query(AccountPayable).filter(AccountPayable.id == guide.payable_id).first()
        if ap:
            has_payments = bool(getattr(ap, 'payments', None) and len(ap.payments) > 0)
            if has_payments:
                ap.notes = f"{ap.notes or ''} [Guía {guide.guide_number} {action_name.lower()} - CxP conservada por pagos existentes]".strip()
            else:
                ap.status = "anulada"
                ap.balance_usd = 0.0
                ap.notes = f"{ap.notes or ''} [Anulada por {action_name} de Guía {guide.guide_number}. {reason}]".strip()
        guide.payable_id = None

    if guide.receivable_id:
        ar = db.query(AccountReceivable).filter(AccountReceivable.id == guide.receivable_id).first()
        if ar:
            has_payments = bool(getattr(ar, 'payments', None) and len(ar.payments) > 0)
            if has_payments:
                ar.notes = f"{ar.notes or ''} [Guía {guide.guide_number} {action_name.lower()} - CxC conservada por cobros existentes]".strip()
            else:
                ar.status = "anulada"
                ar.balance_usd = 0.0
                ar.notes = f"{ar.notes or ''} [Anulada por {action_name} de Guía {guide.guide_number}. {reason}]".strip()
        guide.receivable_id = None

@router.put("/{guide_id}")
def update_dispatch_guide(
    guide_id: int,
    guide_in: DispatchGuideUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    g = db.query(DispatchGuide).filter(DispatchGuide.id == guide_id).first()
    if not g:
        raise HTTPException(status_code=404, detail="Guía no encontrada.")
    if g.status == "anulada":
        raise HTTPException(status_code=400, detail="Una guía anulada no puede ser modificada.")

    if guide_in.destination_address is not None:
        g.destination_address = guide_in.destination_address
    if guide_in.destination_plant is not None:
        g.destination_plant = guide_in.destination_plant
    if guide_in.transfer_reason is not None:
        g.transfer_reason = guide_in.transfer_reason
    if guide_in.carrier_company is not None:
        g.carrier_company = guide_in.carrier_company
    if guide_in.driver_name is not None:
        g.driver_name = guide_in.driver_name
    if guide_in.driver_id_doc is not None:
        g.driver_id_doc = guide_in.driver_id_doc
    if guide_in.driver_phone is not None:
        g.driver_phone = guide_in.driver_phone
    if guide_in.vehicle_model is not None:
        g.vehicle_model = guide_in.vehicle_model
    if guide_in.vehicle_plate is not None:
        g.vehicle_plate = guide_in.vehicle_plate
    if guide_in.notes is not None:
        g.notes = guide_in.notes

    # Sincronización Logística de Vehículo de Flota DALOR
    new_asset_id = guide_in.asset_id
    if not new_asset_id and guide_in.vehicle_plate:
        matched_veh = db.query(Asset).filter(
            Asset.license_plate == guide_in.vehicle_plate.strip().upper(),
            Asset.is_active == True
        ).first()
        if matched_veh:
            new_asset_id = matched_veh.id

    if new_asset_id is not None and new_asset_id != g.asset_id:
        # 1. Si tenía un vehículo anterior asignado diferente, liberarlo a base
        if g.asset_id:
            old_veh = db.query(Asset).filter(Asset.id == g.asset_id).first()
            if old_veh:
                old_veh.status = "disponible_base"
                old_veh.current_project_id = None
                old_veh.current_location = "Sede Central Dalor (Guacara)"
                old_veh.current_custodian_name = "Disponible en Base"
                db.add(ResourceAssignmentHistory(
                    project_id=g.project_id,
                    resource_type="asset",
                    resource_id=old_veh.id,
                    resource_code=old_veh.asset_code,
                    resource_name=old_veh.name,
                    origin_location=g.destination_plant or g.destination_address or "En ruta",
                    destination_location="Sede Central Dalor (Guacara)",
                    status="disponible_base",
                    transfer_code=g.guide_number,
                    notes=f"Vehículo sustituido en edición de Guía {g.guide_number}"
                ))

        # 2. Asignar nuevo vehículo
        new_veh = db.query(Asset).filter(Asset.id == new_asset_id).first()
        if new_veh:
            target_dest = guide_in.destination_plant or guide_in.destination_address or g.destination_plant or g.destination_address or "En ruta"
            new_veh.status = "en_obra" if g.project_id else "en_transito"
            new_veh.current_project_id = g.project_id
            new_veh.current_location = target_dest
            if guide_in.driver_name and guide_in.driver_name.strip():
                new_veh.current_custodian_name = guide_in.driver_name.strip()
            g.asset_id = new_veh.id
            if not guide_in.vehicle_model:
                g.vehicle_model = new_veh.name
            if not guide_in.vehicle_plate and new_veh.license_plate:
                g.vehicle_plate = new_veh.license_plate

            db.add(ResourceAssignmentHistory(
                project_id=g.project_id,
                resource_type="asset",
                resource_id=new_veh.id,
                resource_code=new_veh.asset_code,
                resource_name=new_veh.name,
                destination_location=target_dest,
                custodian_name=new_veh.current_custodian_name,
                driver_name=guide_in.driver_name or g.driver_name,
                status="en_obra" if g.project_id else "en_transito",
                transfer_code=g.guide_number,
                notes=f"Vehículo asignado por edición de Guía {g.guide_number}"
            ))
    elif new_asset_id is not None:
        g.asset_id = new_asset_id

    # Si se actualizan ítems
    if guide_in.items is not None:
        old_item_asset_ids = set([it.asset_id for it in g.items if it.asset_id])
        new_item_asset_ids = set([getattr(it, "asset_id", None) for it in guide_in.items if getattr(it, "asset_id", None)])

        # 1. Activos retirados de la carga -> devolver a base
        removed_asset_ids = old_item_asset_ids - new_item_asset_ids
        for r_id in removed_asset_ids:
            rem_asset = db.query(Asset).filter(Asset.id == r_id).first()
            if rem_asset:
                rem_asset.status = "disponible_base"
                rem_asset.current_project_id = None
                rem_asset.current_location = "Sede Central Dalor (Guacara)"
                rem_asset.current_custodian_name = "Disponible en Base"
                db.add(ResourceAssignmentHistory(
                    project_id=g.project_id,
                    resource_type="asset",
                    resource_id=rem_asset.id,
                    resource_code=rem_asset.asset_code,
                    resource_name=rem_asset.name,
                    origin_location=g.destination_plant or g.destination_address or "En obra",
                    destination_location="Sede Central Dalor (Guacara)",
                    status="disponible_base",
                    transfer_code=g.guide_number,
                    notes=f"Equipo/Herramienta desincorporado en edición de Guía {g.guide_number}"
                ))

        # 2. Sincronización Diferencial de Materiales Consumibles de Almacén
        from collections import defaultdict
        old_mat_map = defaultdict(float)
        for it in g.items:
            if getattr(it, "material_id", None):
                old_mat_map[it.material_id] += float(it.quantity or 0.0)

        new_mat_map = defaultdict(float)
        for it in guide_in.items:
            if getattr(it, "material_id", None):
                new_mat_map[it.material_id] += float(it.quantity or 0.0)

        all_mat_ids = set(old_mat_map.keys()) | set(new_mat_map.keys())
        for m_id in all_mat_ids:
            old_qty = old_mat_map[m_id]
            new_qty = new_mat_map[m_id]
            diff = round(new_qty - old_qty, 2)
            if diff != 0:
                mat_obj = db.query(Material).filter(Material.id == m_id).with_for_update().first()
                if mat_obj:
                    if diff > 0:
                        # Se requiere más cantidad: verificar y descontar stock
                        curr_stock = float(mat_obj.stock_quantity or 0.0)
                        if curr_stock < diff:
                            raise HTTPException(
                                status_code=400,
                                detail=f"Stock insuficiente en almacén para incrementar '{mat_obj.name}' ({mat_obj.code}). Disponible adicional: {curr_stock}, requerido: {diff}."
                            )
                        mat_obj.stock_quantity = round(mat_obj.stock_quantity - diff, 2)
                        mat_obj.total_cost_usd = round(mat_obj.stock_quantity * (mat_obj.unit_cost_usd or 0.0), 2)
                        db.add(MaterialMovement(
                            material_id=mat_obj.id,
                            movement_type="despacho_obra" if g.project_id else "salida_ajuste",
                            quantity=diff,
                            unit_cost_usd=mat_obj.unit_cost_usd or 0.0,
                            total_cost_usd=round(diff * (mat_obj.unit_cost_usd or 0.0), 2),
                            project_id=g.project_id,
                            destination=g.destination_plant or g.destination_address or "En ruta",
                            reference_doc=g.guide_number,
                            notes=f"Ajuste en edición de Guía {g.guide_number} (+{diff})",
                            performed_by=current_user.username
                        ))
                    else:
                        # Se redujo cantidad: retornar diferencial a stock
                        ret_qty = abs(diff)
                        mat_obj.stock_quantity = round((mat_obj.stock_quantity or 0.0) + ret_qty, 2)
                        mat_obj.total_cost_usd = round(mat_obj.stock_quantity * (mat_obj.unit_cost_usd or 0.0), 2)
                        db.add(MaterialMovement(
                            material_id=mat_obj.id,
                            movement_type="reversion_despacho",
                            quantity=ret_qty,
                            unit_cost_usd=mat_obj.unit_cost_usd or 0.0,
                            total_cost_usd=round(ret_qty * (mat_obj.unit_cost_usd or 0.0), 2),
                            project_id=g.project_id,
                            destination="Almacén Central Dalor",
                            reference_doc=g.guide_number,
                            notes=f"Reincorporación a stock por edición de Guía {g.guide_number} (-{ret_qty})",
                            performed_by=current_user.username
                        ))

        # 3. Eliminar items antiguos y agregar nuevos
        db.query(DispatchGuideItem).filter(DispatchGuideItem.dispatch_guide_id == g.id).delete(synchronize_session=False)
        target_dest = guide_in.destination_plant or guide_in.destination_address or g.destination_plant or g.destination_address or "En ruta"
        for idx, it in enumerate(guide_in.items):
            db.add(DispatchGuideItem(
                dispatch_guide_id=g.id,
                item_number=idx + 1,
                description=it.description.strip(),
                quantity=it.quantity,
                unit=it.unit or "Pzas",
                condition_status=it.condition_status or "Reparado / Listo para Montaje",
                approx_weight_kg=it.approx_weight_kg or 0.0,
                asset_id=getattr(it, "asset_id", None),
                material_id=getattr(it, "material_id", None)
            ))

            # Si es un nuevo activo agregado a la carga
            if getattr(it, "asset_id", None) and it.asset_id in (new_item_asset_ids - old_item_asset_ids):
                add_asset = db.query(Asset).filter(Asset.id == it.asset_id).first()
                if add_asset:
                    add_asset.status = "en_obra" if g.project_id else "en_transito"
                    add_asset.current_project_id = g.project_id
                    add_asset.current_location = target_dest
                    db.add(ResourceAssignmentHistory(
                        project_id=g.project_id,
                        resource_type="asset",
                        resource_id=add_asset.id,
                        resource_code=add_asset.asset_code,
                        resource_name=add_asset.name,
                        destination_location=target_dest,
                        status="en_obra" if g.project_id else "en_transito",
                        transfer_code=g.guide_number,
                        notes=f"Equipo/Herramienta incorporado en edición de Guía {g.guide_number}"
                    ))

    audit = AuditLog(
        username=current_user.username,
        module="despachos_taller",
        action="modificar_guia_despacho",
        details=f"Guía de Despacho {g.guide_number} modificada por usuario '{current_user.username}'"
    )
    db.add(audit)
    db.commit()
    db.refresh(g)
    return {"success": True, "message": f"Guía {g.guide_number} actualizada con éxito.", "id": g.id}

@router.put("/{guide_id}/revert")
def revert_dispatch_guide(
    guide_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    g = db.query(DispatchGuide).filter(DispatchGuide.id == guide_id).first()
    if not g:
        raise HTTPException(status_code=404, detail="Guía no encontrada.")
    if g.status == "anulada":
        raise HTTPException(status_code=400, detail="Una guía anulada no puede ser revertida.")

    # Liberar recursos y devolverlos a base
    release_guide_resources(g, db, "Reversión Operativa", "Reversión de guía a estado en preparación")

    # Cancelar o desvincular CxP y CxC asociadas de forma segura
    safe_cancel_guide_financials(g, db, "Reversión Operativa", "Reversión a preparación")

    g.status = "en_preparacion"
    audit = AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        module="despachos_taller",
        action="revertir_guia_despacho",
        details=f"Guía {g.guide_number} revertida a estado 'en preparación'. Recursos devueltos a base."
    )
    db.add(audit)
    db.commit()
    return {"success": True, "message": f"Guía {g.guide_number} revertida con éxito. Activos y recursos liberados a base."}

@router.put("/{guide_id}/cancel")
def cancel_dispatch_guide(
    guide_id: int,
    cancel_in: DispatchGuideCancelIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    g = db.query(DispatchGuide).filter(DispatchGuide.id == guide_id).first()
    if not g:
        raise HTTPException(status_code=404, detail="Guía no encontrada.")
    if g.status == "anulada":
        raise HTTPException(status_code=400, detail="La guía ya se encuentra anulada.")

    reason = cancel_in.cancellation_reason.strip()
    if not reason:
        raise HTTPException(status_code=400, detail="Debe especificar un motivo formal de anulación.")

    # Liberar recursos a base
    release_guide_resources(g, db, "Anulación Formal", reason)

    # Cancelar o desvincular CxP y CxC asociadas de forma segura
    safe_cancel_guide_financials(g, db, "Anulación Formal", reason)

    g.status = "anulada"
    g.cancelled_at = datetime.utcnow()
    g.cancellation_reason = reason
    g.cancelled_by = cancel_in.cancelled_by or current_user.username

    audit = AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        module="despachos_taller",
        action="anular_guia_despacho",
        details=f"Guía {g.guide_number} anulada formalmente. Motivo: {reason}"
    )
    db.add(audit)
    db.commit()
    return {"success": True, "message": f"Guía {g.guide_number} anulada formalmente.", "id": g.id}

@router.delete("/{guide_id}")
def delete_dispatch_guide(
    guide_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    g = db.query(DispatchGuide).filter(DispatchGuide.id == guide_id).first()
    if not g:
        raise HTTPException(status_code=404, detail="Guía no encontrada.")

    guide_num = g.guide_number

    # Liberar recursos antes de borrar físicamente
    release_guide_resources(g, db, "Eliminación de Registro", "Eliminación física del registro de guía")

    # Cancelar o desvincular CxP y CxC asociadas de forma segura
    safe_cancel_guide_financials(g, db, "Eliminación de Registro", "Eliminación física del registro de guía")

    db.delete(g)
    audit = AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        module="despachos_taller",
        action="eliminar_guia_despacho",
        details=f"Guía de Despacho {guide_num} eliminada definitivamente. Recursos reincorporados a base."
    )
    db.add(audit)
    db.commit()
    return {"success": True, "message": f"Guía {guide_num} eliminada con éxito y recursos reincorporados a base."}

