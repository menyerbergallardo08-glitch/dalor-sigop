from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel

from app.core.database import get_db
from app.models.models import (
    DispatchGuide,
    DispatchGuideItem,
    Project,
    Client,
    Asset,
    AccountPayable,
    AccountReceivable,
    Expense,
    ExpenseCategory,
    AuditLog
)

router = APIRouter()

# ------------------------------------------------------------------------------
# SCHEMAS
# ------------------------------------------------------------------------------
class DispatchItemIn(BaseModel):
    description: str
    quantity: float = 1.0
    unit: str = "Pzas"
    condition_status: str = "Reparado / Listo para Montaje"
    approx_weight_kg: Optional[float] = 0.0

class DispatchGuideCreate(BaseModel):
    guide_number: Optional[str] = None
    project_id: Optional[int] = None
    client_id: Optional[int] = None
    dispatch_date: Optional[datetime] = None
    destination_address: str
    destination_plant: Optional[str] = None
    
    transport_type: str = "propio_dalor" # propio_dalor, tercerizado_flete, retiro_cliente
    asset_id: Optional[int] = None
    carrier_company: Optional[str] = None
    driver_name: str
    driver_id_doc: str
    driver_phone: Optional[str] = None
    vehicle_model: Optional[str] = None
    vehicle_plate: str
    
    freight_cost_usd: Optional[float] = 0.0
    freight_price_charged_usd: Optional[float] = 0.0
    
    quality_inspector: Optional[str] = "Control de Calidad DALOR"
    dispatcher_name: Optional[str] = "Despacho Taller Guacara"
    notes: Optional[str] = None
    
    items: List[DispatchItemIn] = []

class DeliveryConfirmIn(BaseModel):
    received_by_client_name: str
    received_by_client_id_doc: str
    reception_date: Optional[datetime] = None
    notes: Optional[str] = None

class BadDebtIn(BaseModel):
    reason: str
    notes: Optional[str] = None


# ------------------------------------------------------------------------------
# ENDPOINTS
# ------------------------------------------------------------------------------

@router.get("/")
def list_dispatch_guides(
    project_id: Optional[int] = None,
    client_id: Optional[int] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    q = db.query(DispatchGuide)
    if project_id:
        q = q.filter(DispatchGuide.project_id == project_id)
    if client_id:
        q = q.filter(DispatchGuide.client_id == client_id)
    if status:
        q = q.filter(DispatchGuide.status == status)
        
    guides = q.order_by(DispatchGuide.created_at.desc()).all()
    
    results = []
    for g in guides:
        results.append({
            "id": g.id,
            "guide_number": g.guide_number,
            "project_id": g.project_id,
            "project_code": g.project.code if g.project else "S/P",
            "project_name": g.project.name if g.project else "Servicio Directo de Taller",
            "client_id": g.client_id,
            "client_name": g.client.name if g.client else "Cliente General",
            "client_rif": g.client.rif if g.client else "-",
            "dispatch_date": g.dispatch_date.strftime("%Y-%m-%d %H:%M") if g.dispatch_date else "",
            "destination_address": g.destination_address,
            "destination_plant": g.destination_plant or "",
            "transport_type": g.transport_type,
            "carrier_company": g.carrier_company or "",
            "driver_name": g.driver_name,
            "driver_id_doc": g.driver_id_doc,
            "vehicle_model": g.vehicle_model or (g.asset.name if g.asset else ""),
            "vehicle_plate": g.vehicle_plate,
            "freight_cost_usd": g.freight_cost_usd or 0.0,
            "freight_price_charged_usd": g.freight_price_charged_usd or 0.0,
            "status": g.status,
            "dispatcher_name": g.dispatcher_name,
            "quality_inspector": g.quality_inspector,
            "received_by_client_name": g.received_by_client_name or "",
            "received_by_client_id_doc": g.received_by_client_id_doc or "",
            "reception_date": g.reception_date.strftime("%Y-%m-%d %H:%M") if g.reception_date else "",
            "items_count": len(g.items),
            "items": [{
                "id": it.id,
                "item_number": it.item_number,
                "description": it.description,
                "quantity": it.quantity,
                "unit": it.unit,
                "condition_status": it.condition_status,
                "approx_weight_kg": it.approx_weight_kg
            } for it in g.items],
            "notes": g.notes or ""
        })
    return results


@router.get("/{guide_id}")
def get_dispatch_guide(guide_id: int, db: Session = Depends(get_db)):
    g = db.query(DispatchGuide).filter(DispatchGuide.id == guide_id).first()
    if not g:
        raise HTTPException(status_code=404, detail="Guía de despacho no encontrada.")
        
    return {
        "id": g.id,
        "guide_number": g.guide_number,
        "project_id": g.project_id,
        "project_code": g.project.code if g.project else "S/P",
        "project_name": g.project.name if g.project else "Servicio Directo de Taller",
        "client_id": g.client_id,
        "client_name": g.client.name if g.client else "Cliente General",
        "client_rif": g.client.rif if g.client else "-",
        "dispatch_date": g.dispatch_date.strftime("%Y-%m-%d %H:%M") if g.dispatch_date else "",
        "destination_address": g.destination_address,
        "destination_plant": g.destination_plant or "",
        "transport_type": g.transport_type,
        "carrier_company": g.carrier_company or "",
        "driver_name": g.driver_name,
        "driver_id_doc": g.driver_id_doc,
        "driver_phone": g.driver_phone or "",
        "vehicle_model": g.vehicle_model or (g.asset.name if g.asset else ""),
        "vehicle_plate": g.vehicle_plate,
        "freight_cost_usd": g.freight_cost_usd or 0.0,
        "freight_price_charged_usd": g.freight_price_charged_usd or 0.0,
        "payable_id": g.payable_id,
        "receivable_id": g.receivable_id,
        "status": g.status,
        "dispatcher_name": g.dispatcher_name,
        "quality_inspector": g.quality_inspector,
        "received_by_client_name": g.received_by_client_name or "",
        "received_by_client_id_doc": g.received_by_client_id_doc or "",
        "reception_date": g.reception_date.strftime("%Y-%m-%d %H:%M") if g.reception_date else "",
        "items": [{
            "id": it.id,
            "item_number": it.item_number,
            "description": it.description,
            "quantity": it.quantity,
            "unit": it.unit,
            "condition_status": it.condition_status,
            "approx_weight_kg": it.approx_weight_kg
        } for it in g.items],
        "notes": g.notes or ""
    }


@router.post("/")
def create_dispatch_guide(g_in: DispatchGuideCreate, db: Session = Depends(get_db)):
    if g_in.client_id:
        client = db.query(Client).filter(Client.id == g_in.client_id).first()
    else:
        client = db.query(Client).first()
    client_id_val = client.id if client else 1
    client_name = client.name if client else "DALOR Interno / Sin Cliente"

    # Correlativo automático si no viene provisto
    guide_num = g_in.guide_number
    if not guide_num:
        count = db.query(DispatchGuide).count() + 1
        guide_num = f"GD-2026-{count:03d}"

    # Validar unicidad
    existing = db.query(DispatchGuide).filter(DispatchGuide.guide_number == guide_num).first()
    if existing:
        count = db.query(DispatchGuide).count() + 10
        guide_num = f"GD-2026-{count:03d}"

    new_guide = DispatchGuide(
        guide_number=guide_num,
        project_id=g_in.project_id,
        client_id=client_id_val,
        dispatch_date=g_in.dispatch_date or datetime.utcnow(),
        destination_address=g_in.destination_address.strip(),
        destination_plant=g_in.destination_plant.strip() if g_in.destination_plant else None,
        transport_type=g_in.transport_type,
        asset_id=g_in.asset_id,
        carrier_company=g_in.carrier_company.strip() if g_in.carrier_company else None,
        driver_name=g_in.driver_name.strip(),
        driver_id_doc=g_in.driver_id_doc.strip(),
        driver_phone=g_in.driver_phone.strip() if g_in.driver_phone else None,
        vehicle_model=g_in.vehicle_model.strip() if g_in.vehicle_model else None,
        vehicle_plate=g_in.vehicle_plate.strip().upper(),
        freight_cost_usd=g_in.freight_cost_usd or 0.0,
        freight_price_charged_usd=g_in.freight_price_charged_usd or 0.0,
        status="en_transito",
        quality_inspector=g_in.quality_inspector or "Control de Calidad DALOR",
        dispatcher_name=g_in.dispatcher_name or "Despacho Taller Guacara",
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
            description=f"Flete / Transporte Tercerizado Guía {guide_num} para {client.name}",
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
        new_cxc = AccountReceivable(
            invoice_number=f"FLT-CLI-{guide_num}",
            client_id=g_in.client_id,
            project_id=g_in.project_id,
            description=f"Servicio de Flete / Logística de Entrega ({guide_num})",
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
                origin_location="Sede Central Dalor",
                destination_location=dest,
                custodian_name=g_in.driver_name,
                driver_name=g_in.driver_name,
                transfer_code=guide_num,
                notes=f"Guía {guide_num} para {client.name}"
            )
            db.add(hist)

    # Auditoría
    audit = AuditLog(
        username="despacho",
        module="despachos_taller",
        action="emitir_guia_despacho",
        details=f"Guía de Despacho {guide_num} emitida para cliente '{client.name}' ({len(g_in.items)} ítems, Modalidad: {g_in.transport_type})"
    )
    db.add(audit)
    db.commit()

    return {
        "success": True,
        "id": new_guide.id,
        "guide_number": guide_num,
        "message": f"Guía de Despacho {guide_num} emitida exitosamente."
    }


@router.put("/{guide_id}/confirm-delivery")
def confirm_dispatch_delivery(
    guide_id: int,
    conf_in: DeliveryConfirmIn,
    db: Session = Depends(get_db)
):
    g = db.query(DispatchGuide).filter(DispatchGuide.id == guide_id).first()
    if not g:
        raise HTTPException(status_code=404, detail="Guía no encontrada.")

    g.status = "entregado_conforme"
    g.received_by_client_name = conf_in.received_by_client_name.strip()
    g.received_by_client_id_doc = conf_in.received_by_client_id_doc.strip()
    g.reception_date = conf_in.reception_date or datetime.utcnow()
    if conf_in.notes:
        g.notes = (g.notes or "") + f"\n[Recepción: {conf_in.notes}]"

    db.commit()
    return {
        "success": True,
        "message": f"Guía {g.guide_number} marcada como Entregado Conforme por {g.received_by_client_name}."
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
