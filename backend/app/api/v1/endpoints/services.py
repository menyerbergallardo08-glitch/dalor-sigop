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

import re

OFFICIAL_APU_CATEGORIES = [
    "Fabricación Metalmecánica",
    "Montaje e Instalación en Sitio",
    "Mantenimiento Industrial & Paradas",
    "Soldadura Especializada & Pailería",
    "Mecanizado & Torno",
    "Arenado y Pintura Industrial",
    "Obras Civiles & Eléctricas Asociadas"
]

def get_next_service_code_value(db: Session) -> str:
    items = db.query(ServiceItem).all()
    max_num = 0
    for item in items:
        if item.code:
            m = re.match(r'^APU-(\d+)$', item.code.strip())
            if m:
                max_num = max(max_num, int(m.group(1)))
    if max_num > 0:
        next_num = max_num + 1
    else:
        next_num = len(items) + 1
    code = f"APU-{next_num:03d}"
    while db.query(ServiceItem).filter(ServiceItem.code == code).first():
        next_num += 1
        code = f"APU-{next_num:03d}"
    return code

@router.get("/next-code")
def get_next_service_code_endpoint(db: Session = Depends(get_db)):
    return {"next_code": get_next_service_code_value(db)}

@router.get("/categories")
def get_service_categories():
    return OFFICIAL_APU_CATEGORIES

@router.post("/", response_model=ServiceItemOut)
def create_service_item(item_in: ServiceItemCreate, db: Session = Depends(get_db)):
    item_dict = item_in.dict()
    name_val = (item_dict.get("name") or "").strip()
    
    if not name_val:
        raise HTTPException(status_code=400, detail="El nombre de la partida de servicio es obligatorio.")
        
    # Anti-duplicados por nombre exacto en catálogo activo
    existing_name = db.query(ServiceItem).filter(
        ServiceItem.name.ilike(name_val),
        ServiceItem.is_active == True
    ).first()
    if existing_name:
        raise HTTPException(status_code=400, detail=f"Ya existe una partida de servicio con el nombre '{name_val}' ({existing_name.code}).")

    # 🔴 REGLA DE NEGOCIO: Precio de venta debe ser >= Costo base
    cost_val = float(item_dict.get("base_cost_usd") or 0.0)
    price_val = float(item_dict.get("unit_price_usd") or 0.0)
    if price_val < cost_val:
        raise HTTPException(
            status_code=400,
            detail=f"El precio de venta (${price_val:.2f}) no puede ser menor al costo base (${cost_val:.2f}). El margen de ganancia debe ser mayor o igual a cero."
        )

    code_val = (item_dict.get("code") or "").strip()
    if not code_val or code_val in ("Cargando...", "Generando...", "Ej: SER-ELEC-03"):
        code_val = get_next_service_code_value(db)
    else:
        existing_code = db.query(ServiceItem).filter(ServiceItem.code == code_val).first()
        if existing_code:
            code_val = get_next_service_code_value(db)
            
    item_dict["code"] = code_val
    new_item = ServiceItem(**item_dict)
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return new_item


@router.put("/{service_id}", response_model=ServiceItemOut)
def update_service_item(service_id: int, item_in: ServiceItemCreate, db: Session = Depends(get_db)):
    item = db.query(ServiceItem).filter(ServiceItem.id == service_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Partida de servicio no encontrada.")
        
    item_dict = item_in.dict()
    name_val = (item_dict.get("name") or "").strip()
    if name_val:
        existing = db.query(ServiceItem).filter(
            ServiceItem.name.ilike(name_val),
            ServiceItem.id != service_id,
            ServiceItem.is_active == True
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail=f"Ya existe otra partida con el nombre '{name_val}' ({existing.code}).")
        item.name = name_val
        
    updatable = ["category", "unit_measure", "base_cost_usd", "unit_price_usd", "description"]
    for field in updatable:
        if field in item_dict and item_dict[field] is not None:
            setattr(item, field, item_dict[field])

    # 🔴 REGLA DE NEGOCIO: Verificar margen después de aplicar cambios
    final_cost = float(item.base_cost_usd or 0.0)
    final_price = float(item.unit_price_usd or 0.0)
    if final_price < final_cost:
        raise HTTPException(
            status_code=400,
            detail=f"El precio de venta (${final_price:.2f}) no puede ser menor al costo base (${final_cost:.2f}). El margen de ganancia debe ser mayor o igual a cero."
        )

    db.commit()
    db.refresh(item)
    return item


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
