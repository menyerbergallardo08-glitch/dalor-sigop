from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime

from app.core.database import get_db
from app.models.models import AssetRentalLoan

router = APIRouter()

@router.get("/{item_id}/delivery-note")
def get_rental_delivery_note(item_id: int, db: Session = Depends(get_db)):
    item = db.query(AssetRentalLoan).filter(AssetRentalLoan.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Operación no encontrada.")

    items_list = []
    if item.items:
        for it in item.items:
            unit = "UND"
            if it.material:
                unit = it.material.unit_measure
            elif it.item_type == "asset":
                unit = "UND"
            items_list.append({
                "id": it.id,
                "name": it.name,
                "code": it.code or (it.asset.asset_code if it.asset else (it.material.code if it.material else "-")),
                "item_type": it.item_type,
                "quantity": it.quantity,
                "returned_quantity": it.returned_quantity or 0.0,
                "unit": unit,
                "status": it.status,
                "condition": it.return_condition or "Operativo / Salida Conforme"
            })
    else:
        items_list.append({
            "id": 1,
            "name": item.equipment_name,
            "code": item.equipment_code or "-",
            "item_type": "material" if item.material_id else "asset",
            "quantity": item.material_quantity if item.material_id else 1.0,
            "returned_quantity": 0.0,
            "unit": "UND",
            "status": item.status,
            "condition": "Operativo / Salida Conforme"
        })

    guide_type = "PRÉSTAMO / COMODATO DE EQUIPOS" if item.operation_type == "prestamo" else "ALQUILER Y ARRENDAMIENTO DE EQUIPOS"
    transfer_type_label = "Salida DALOR a Tercero" if item.direction == "dalor_a_tercero" else "Entrada Tercero a DALOR"

    return {
        "operation_code": item.operation_code,
        "guide_number": f"GD-{item.operation_code}",
        "guide_type": guide_type,
        "direction": item.direction,
        "direction_label": transfer_type_label,
        "operation_type": item.operation_type,
        "external_entity": item.external_entity,
        "contact_person": item.contact_person or "No indicado",
        "contact_phone": item.contact_phone or "No indicado",
        "destination_reference": item.destination_reference or (item.project.name if item.project else "Taller Central Guacara"),
        "project_name": item.project.name if item.project else (item.destination_reference or "Uso Externo / Destino Particular"),
        "dispatch_date": item.start_date.strftime("%d/%m/%Y") if item.start_date else datetime.utcnow().strftime("%d/%m/%Y"),
        "expected_return_date": item.expected_return_date.strftime("%d/%m/%Y") if item.expected_return_date else "Indefinido",
        "rate_usd": item.rate_usd or 0.0,
        "rate_period": item.rate_period or "dia",
        "total_amount_usd": item.total_amount_usd or 0.0,
        "status": item.status,
        "notes": item.notes or "",
        "dispatcher_name": "Almacén & Custodia DALOR",
        "receiver_name": item.contact_person or item.external_entity,
        "items": items_list
    }
