from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload, selectinload
from typing import Optional

from app.core.database import get_db
from app.models.models import DispatchGuide

router = APIRouter()

@router.get("/")
def list_dispatch_guides(
    project_id: Optional[int] = None,
    client_id: Optional[int] = None,
    status: Optional[str] = None,
    page: Optional[int] = Query(None, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    q = db.query(DispatchGuide).options(
        joinedload(DispatchGuide.project),
        joinedload(DispatchGuide.client),
        joinedload(DispatchGuide.asset),
        selectinload(DispatchGuide.items)
    )
    if project_id:
        q = q.filter(DispatchGuide.project_id == project_id)
    if client_id:
        q = q.filter(DispatchGuide.client_id == client_id)
    if status:
        q = q.filter(DispatchGuide.status == status)
        
    q = q.order_by(DispatchGuide.created_at.desc())
    is_paginated = page is not None and isinstance(page, int)
    total = q.count() if is_paginated else None
    guides = q.offset((page - 1) * page_size).limit(page_size).all() if is_paginated else q.all()
    
    results = []
    for g in guides:
        results.append({
            "id": g.id,
            "guide_number": g.guide_number,
            "guide_type": getattr(g, "guide_type", "traslado_externo") or "traslado_externo",
            "delivered_by_staff": getattr(g, "delivered_by_staff", "") or "",
            "received_by_staff": getattr(g, "received_by_staff", "") or "",
            "project_id": g.project_id,
            "project_code": g.project.code if g.project else "S/P",
            "project_name": g.project.name if g.project else "Servicio Directo de Taller",
            "client_id": g.client_id,
            "client_name": g.recipient_name if (g.is_freeform and g.recipient_name) else (g.client.name if g.client else (g.recipient_name or "Cliente General")),
            "recipient_name": g.recipient_name or (g.client.name if g.client else "Destinatario Libre"),
            "transfer_reason": g.transfer_reason or "Despacho de Producción",
            "is_freeform": g.is_freeform or False,
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
        
    if is_paginated:
        return {
            "items": results,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size if page_size > 0 else 1
        }
    return results

@router.get("/{guide_id}")
def get_dispatch_guide(guide_id: int, db: Session = Depends(get_db)):
    g = (
        db.query(DispatchGuide)
        .options(
            joinedload(DispatchGuide.project),
            joinedload(DispatchGuide.client),
            joinedload(DispatchGuide.asset),
            selectinload(DispatchGuide.items)
        )
        .filter(DispatchGuide.id == guide_id)
        .first()
    )
    if not g:
        raise HTTPException(status_code=404, detail="Guía de despacho no encontrada.")
        
    return {
        "id": g.id,
        "guide_number": g.guide_number,
        "guide_type": getattr(g, "guide_type", "traslado_externo") or "traslado_externo",
        "delivered_by_staff": getattr(g, "delivered_by_staff", "") or "",
        "received_by_staff": getattr(g, "received_by_staff", "") or "",
        "project_id": g.project_id,
        "project_code": g.project.code if g.project else "S/P",
        "project_name": g.project.name if g.project else "Servicio Directo de Taller",
        "client_id": g.client_id,
        "client_name": g.recipient_name if (g.is_freeform and g.recipient_name) else (g.client.name if g.client else (g.recipient_name or "Cliente General")),
        "recipient_name": g.recipient_name or (g.client.name if g.client else "Destinatario Libre"),
        "transfer_reason": g.transfer_reason or "Despacho de Producción",
        "is_freeform": g.is_freeform or False,
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
