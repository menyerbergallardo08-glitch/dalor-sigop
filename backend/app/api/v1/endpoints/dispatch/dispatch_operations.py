from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime

from app.core.database import get_db
from app.models.models import (
    DispatchGuide, DispatchGuideItem, Project, Client, Asset,
    AccountPayable, AccountReceivable, Expense, ExpenseCategory, AuditLog, ProjectAddendum
)
from .dispatch_common import DispatchGuideCreate

router = APIRouter()

@router.post("/")
def create_dispatch_guide(g_in: DispatchGuideCreate, db: Session = Depends(get_db)):
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
        count = db.query(DispatchGuide).filter(DispatchGuide.guide_number.like(f"{prefix}-%")).count() + 1
        guide_num = f"{prefix}-{count:04d}" if is_internal else f"{prefix}-{count:03d}"

    # Validar unicidad
    existing = db.query(DispatchGuide).filter(DispatchGuide.guide_number == guide_num).first()
    if existing:
        count = db.query(DispatchGuide).filter(DispatchGuide.guide_number.like(f"{prefix}-%")).count() + 10
        guide_num = f"{prefix}-{count:04d}" if is_internal else f"{prefix}-{count:03d}"

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

    # Agregar ítems
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
            veh.current_location = f"En ruta: {dest}"
            from app.models.models import ResourceAssignmentHistory
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
        username="despacho",
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

@router.delete("/{guide_id}")
def delete_dispatch_guide(guide_id: int, db: Session = Depends(get_db)):
    g = db.query(DispatchGuide).filter(DispatchGuide.id == guide_id).first()
    if not g:
        raise HTTPException(status_code=404, detail="Guía no encontrada.")

    # Si tenía CxP generada por flete, eliminarla
    if g.payable_id:
        db.query(AccountPayable).filter(AccountPayable.id == g.payable_id).delete(synchronize_session=False)
    # Si tenía CxC generada, eliminarla
    if g.receivable_id:
        db.query(AccountReceivable).filter(AccountReceivable.id == g.receivable_id).delete(synchronize_session=False)

    db.delete(g)
    db.commit()
    return {"success": True, "message": f"Guía {g.guide_number} eliminada con éxito."}
