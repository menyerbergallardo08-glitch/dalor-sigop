from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

from app.core.database import get_db
from app.models.models import TransferGuide, TransferGuideItem, Asset, Project

router = APIRouter()

class GuideItemCreate(BaseModel):
    asset_id: Optional[int] = None
    description: str
    brand: Optional[str] = None
    serial_or_presentation: Optional[str] = None
    quantity: float = 1.0
    notes: Optional[str] = None

class GuideCreate(BaseModel):
    project_id: int
    destination: str
    vehicle_id: Optional[int] = None
    driver_name: Optional[str] = None
    driver_id_card: Optional[str] = None
    custodian_name: Optional[str] = "Carlos Hurtado"
    items: List[GuideItemCreate]

class DispatchConfirmation(BaseModel):
    custodian_name: str = "Carlos Hurtado"
    custodian_notes: Optional[str] = None
    verified_item_ids: List[int] = []

class ReceptionConfirmation(BaseModel):
    receiver_name: str
    receiver_notes: Optional[str] = None
    verified_item_ids: List[int] = []

@router.get("/")
def get_transfer_guides(project_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(TransferGuide)
    if project_id:
        query = query.filter(TransferGuide.project_id == project_id)
    guides = query.order_by(TransferGuide.id.desc()).all()
    
    result = []
    for g in guides:
        proj = db.query(Project).filter(Project.id == g.project_id).first()
        veh = db.query(Asset).filter(Asset.id == g.vehicle_id).first() if g.vehicle_id else None
        items = db.query(TransferGuideItem).filter(TransferGuideItem.guide_id == g.id).all()
        
        result.append({
            "id": g.id,
            "guide_number": g.guide_number,
            "project_id": g.project_id,
            "project_code": proj.code if proj else "N/A",
            "project_name": proj.name if proj else "N/A",
            "destination": g.destination,
            "issue_date": g.issue_date.strftime("%Y-%m-%d %H:%M") if g.issue_date else "",
            "vehicle_id": g.vehicle_id,
            "vehicle_name": veh.name if veh else (g.vehicle_name or "N/A"),
            "vehicle_plate": veh.license_plate if veh else (g.vehicle_plate or "N/A"),
            "driver_name": g.driver_name or "Por Asignar",
            "driver_id_card": g.driver_id_card or "",
            "status": g.status,
            "custodian_name": g.custodian_name,
            "dispatched_at": g.dispatched_at.strftime("%Y-%m-%d %H:%M") if g.dispatched_at else None,
            "receiver_name": g.receiver_name,
            "received_at": g.received_at.strftime("%Y-%m-%d %H:%M") if g.received_at else None,
            "returned_at": g.returned_at.strftime("%Y-%m-%d %H:%M") if g.returned_at else None,
            "total_items": len(items),
            "items": [{
                "id": it.id,
                "item_number": it.item_number,
                "asset_id": it.asset_id,
                "description": it.description,
                "brand": it.brand or "N/A",
                "serial_or_presentation": it.serial_or_presentation or "N/A",
                "quantity": it.quantity,
                "verified_by_custodian": it.verified_by_custodian,
                "verified_by_receiver": it.verified_by_receiver,
                "returned_to_base": it.returned_to_base,
                "notes": it.notes
            } for it in items]
        })
    return result

@router.get("/{guide_id}")
def get_guide_detail(guide_id: int, db: Session = Depends(get_db)):
    g = db.query(TransferGuide).filter(TransferGuide.id == guide_id).first()
    if not g:
        raise HTTPException(status_code=404, detail="Guía no encontrada")
    
    proj = db.query(Project).filter(Project.id == g.project_id).first()
    veh = db.query(Asset).filter(Asset.id == g.vehicle_id).first() if g.vehicle_id else None
    items = db.query(TransferGuideItem).filter(TransferGuideItem.guide_id == g.id).order_by(TransferGuideItem.item_number).all()
    
    return {
        "id": g.id,
        "guide_number": g.guide_number,
        "project_id": g.project_id,
        "project_code": proj.code if proj else "N/A",
        "project_name": proj.name if proj else "N/A",
        "destination": g.destination,
        "issue_date": g.issue_date.strftime("%d/%m/%Y"),
        "vehicle_name": veh.name if veh else (g.vehicle_name or "N/A"),
        "vehicle_plate": veh.license_plate if veh else (g.vehicle_plate or "N/A"),
        "driver_name": g.driver_name or "N/A",
        "driver_id_card": g.driver_id_card or "N/A",
        "status": g.status,
        "custodian_name": g.custodian_name,
        "dispatched_at": g.dispatched_at.strftime("%d/%m/%Y %H:%M") if g.dispatched_at else None,
        "custodian_notes": g.custodian_notes,
        "receiver_name": g.receiver_name,
        "received_at": g.received_at.strftime("%d/%m/%Y %H:%M") if g.received_at else None,
        "receiver_notes": g.receiver_notes,
        "items": [{
            "id": it.id,
            "item_number": it.item_number,
            "asset_id": it.asset_id,
            "description": it.description,
            "brand": it.brand or "-",
            "serial_or_presentation": it.serial_or_presentation or "-",
            "quantity": it.quantity,
            "verified_by_custodian": it.verified_by_custodian,
            "verified_by_receiver": it.verified_by_receiver,
            "notes": it.notes
        } for it in items]
    }

@router.post("/")
def create_transfer_guide(payload: GuideCreate, db: Session = Depends(get_db)):
    proj = db.query(Project).filter(Project.id == payload.project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    
    count = db.query(TransferGuide).count() + 1
    guide_num = f"GUIA-{datetime.utcnow().year}-{count:04d}"
    
    veh = db.query(Asset).filter(Asset.id == payload.vehicle_id).first() if payload.vehicle_id else None
    
    guide = TransferGuide(
        guide_number=guide_num,
        project_id=payload.project_id,
        destination=payload.destination,
        vehicle_id=payload.vehicle_id,
        vehicle_name=veh.name if veh else None,
        vehicle_plate=veh.license_plate if veh else None,
        driver_name=payload.driver_name,
        driver_id_card=payload.driver_id_card,
        custodian_name=payload.custodian_name or "Carlos Hurtado",
        status="borrador"
    )
    db.add(guide)
    db.commit()
    db.refresh(guide)
    
    for idx, it in enumerate(payload.items, 1):
        item_obj = TransferGuideItem(
            guide_id=guide.id,
            asset_id=it.asset_id,
            item_number=idx,
            description=it.description,
            brand=it.brand,
            serial_or_presentation=it.serial_or_presentation,
            quantity=it.quantity,
            notes=it.notes
        )
        db.add(item_obj)
    
    db.commit()
    return {"message": "Guía de traslado creada exitosamente", "guide_id": guide.id, "guide_number": guide_num}

@router.put("/{guide_id}/dispatch")
def confirm_custodian_dispatch(guide_id: int, payload: DispatchConfirmation, db: Session = Depends(get_db)):
    guide = db.query(TransferGuide).filter(TransferGuide.id == guide_id).first()
    if not guide:
        raise HTTPException(status_code=404, detail="Guía no encontrada")
    
    guide.status = "despachado"
    guide.custodian_name = payload.custodian_name
    guide.dispatched_at = datetime.utcnow()
    guide.custodian_notes = payload.custodian_notes
    
    items = db.query(TransferGuideItem).filter(TransferGuideItem.guide_id == guide.id).all()
    for it in items:
        if not payload.verified_item_ids or it.id in payload.verified_item_ids:
            it.verified_by_custodian = True
            if it.asset_id:
                asset = db.query(Asset).filter(Asset.id == it.asset_id).first()
                if asset:
                    asset.status = "en_obra"
                    asset.current_location = guide.destination
                    asset.current_project_id = guide.project_id
                    asset.current_custodian_name = guide.driver_name or "En Tránsito"
    
    if guide.vehicle_id:
        veh = db.query(Asset).filter(Asset.id == guide.vehicle_id).first()
        if veh:
            veh.status = "en_obra"
            veh.current_location = guide.destination
            veh.current_project_id = guide.project_id
            
    db.commit()
    return {"message": "Salida de almacén confirmada por custodio Carlos Hurtado", "status": "despachado"}

@router.put("/{guide_id}/receive")
def confirm_engineer_reception(guide_id: int, payload: ReceptionConfirmation, db: Session = Depends(get_db)):
    guide = db.query(TransferGuide).filter(TransferGuide.id == guide_id).first()
    if not guide:
        raise HTTPException(status_code=404, detail="Guía no encontrada")
    
    guide.status = "recibido_en_obra"
    guide.receiver_name = payload.receiver_name
    guide.received_at = datetime.utcnow()
    guide.receiver_notes = payload.receiver_notes
    
    items = db.query(TransferGuideItem).filter(TransferGuideItem.guide_id == guide.id).all()
    for it in items:
        if not payload.verified_item_ids or it.id in payload.verified_item_ids:
            it.verified_by_receiver = True
            if it.asset_id:
                asset = db.query(Asset).filter(Asset.id == it.asset_id).first()
                if asset:
                    asset.status = "en_obra"
                    asset.current_custodian_name = payload.receiver_name
                    
    db.commit()
    return {"message": "Recepción conforme en obra confirmada por Ing. Residente", "status": "recibido_en_obra"}

@router.put("/{guide_id}/return-to-base")
def return_guide_assets_to_base(guide_id: int, db: Session = Depends(get_db)):
    guide = db.query(TransferGuide).filter(TransferGuide.id == guide_id).first()
    if not guide:
        raise HTTPException(status_code=404, detail="Guía no encontrada")
    
    guide.status = "retornado"
    guide.returned_at = datetime.utcnow()
    
    items = db.query(TransferGuideItem).filter(TransferGuideItem.guide_id == guide.id).all()
    for it in items:
        it.returned_to_base = True
        if it.asset_id:
            asset = db.query(Asset).filter(Asset.id == it.asset_id).first()
            if asset:
                asset.status = "disponible_base"
                asset.current_location = "Almacén Central Dalor"
                asset.current_project_id = None
                asset.current_custodian_name = "Carlos Hurtado (Almacén)"
                
    if guide.vehicle_id:
        veh = db.query(Asset).filter(Asset.id == guide.vehicle_id).first()
        if veh:
            veh.status = "disponible_base"
            veh.current_location = "Sede Central Dalor"
            veh.current_project_id = None
            
    db.commit()
    return {"message": "Herramientas y vehículos retornados con éxito al inventario central", "status": "retornado"}
