from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.models import ServiceItem
from app.schemas.schemas import ServiceItemCreate, ServiceItemOut

router = APIRouter()

@router.get("/", response_model=List[ServiceItemOut])
def get_service_items(include_inactive: bool = False, db: Session = Depends(get_db)):
    query = db.query(ServiceItem)
    if not include_inactive:
        query = query.filter(ServiceItem.is_active == True)
    return query.order_by(ServiceItem.code.asc()).all()

@router.post("/", response_model=ServiceItemOut)
def create_service_item(item_in: ServiceItemCreate, db: Session = Depends(get_db)):
    existing = db.query(ServiceItem).filter(ServiceItem.code == item_in.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe una partida de servicio con ese código.")
    
    new_item = ServiceItem(**item_in.dict())
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return new_item

@router.delete("/purge/all")
def purge_all_service_items(db: Session = Depends(get_db)):
    from app.models.models import QuotationItem
    db.query(QuotationItem).filter(QuotationItem.service_id != None).update({QuotationItem.service_id: None})
    count = db.query(ServiceItem).delete()
    db.commit()
    return {"message": f"Catálogo vaciado por completo. {count} partidas eliminadas.", "count": count}

@router.delete("/{service_id}")
def delete_service_item(service_id: int, permanent: bool = True, db: Session = Depends(get_db)):
    item = db.query(ServiceItem).filter(ServiceItem.id == service_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Partida de servicio no encontrada.")
    
    from app.models.models import QuotationItem
    db.query(QuotationItem).filter(QuotationItem.service_id == service_id).update({QuotationItem.service_id: None})
    if permanent:
        db.delete(item)
    else:
        item.is_active = False
    db.commit()
    return {"message": "Partida de servicio eliminada exitosamente."}
