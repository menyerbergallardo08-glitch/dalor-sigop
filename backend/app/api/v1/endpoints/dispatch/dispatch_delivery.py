from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime

from app.core.database import get_db
from app.models.models import DispatchGuide
from .dispatch_common import DeliveryConfirmIn

router = APIRouter()

@router.put("/{guide_id}/confirm-delivery")
@router.post("/{guide_id}/confirm-delivery")
def confirm_dispatch_delivery(
    guide_id: int,
    conf_in: DeliveryConfirmIn,
    db: Session = Depends(get_db)
):
    g = db.query(DispatchGuide).filter(DispatchGuide.id == guide_id).first()
    if not g:
        raise HTTPException(status_code=404, detail="Guía no encontrada.")

    recv_name = (conf_in.received_by_client_name or conf_in.received_by or "Receptor Conforme").strip()
    recv_doc = (conf_in.received_by_client_id_doc or "V-Receptor").strip()

    g.status = "entregado_conforme"
    g.received_by_client_name = recv_name
    g.received_by_client_id_doc = recv_doc
    g.reception_date = conf_in.reception_date or datetime.utcnow()
    if conf_in.notes:
        g.notes = (g.notes or "") + f"\n[Recepción: {conf_in.notes}]"

    # Si la guía usó vehículo DALOR y no es asignación permanente a obra, liberar a Base
    if g.asset_id:
        from app.models.models import Asset
        veh = db.query(Asset).filter(Asset.id == g.asset_id).first()
        if veh and veh.current_project_id == g.project_id:
            veh.status = "disponible_base"
            veh.current_project_id = None
            veh.current_location = "Sede Central Dalor (Guacara)"
            veh.current_custodian_name = "Disponible en Base"

    db.commit()
    return {
        "success": True,
        "message": f"Guía {g.guide_number} marcada como Entregado Conforme por {g.received_by_client_name}."
    }
