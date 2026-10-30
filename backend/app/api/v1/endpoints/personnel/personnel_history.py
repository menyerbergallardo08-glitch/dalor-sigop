from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.models import Personnel, ResourceAssignmentHistory, DispatchGuide, Project
from app.api.deps import get_current_active_user

router = APIRouter(dependencies=[Depends(get_current_active_user)])


@router.get("/{personnel_id}/history")
def get_personnel_history(personnel_id: int, db: Session = Depends(get_db)):
    p = db.query(Personnel).filter(Personnel.id == personnel_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Colaborador no encontrado.")

    # 1. Movimientos en ResourceAssignmentHistory
    movements = db.query(ResourceAssignmentHistory).filter(
        (
            (ResourceAssignmentHistory.resource_type.in_(["personnel", "personal"])) &
            (
                (ResourceAssignmentHistory.resource_id == personnel_id) |
                (ResourceAssignmentHistory.resource_code == p.code) |
                (ResourceAssignmentHistory.resource_name == p.full_name)
            )
        ) |
        (ResourceAssignmentHistory.custodian_name == p.full_name) |
        (ResourceAssignmentHistory.driver_name == p.full_name)
    ).order_by(ResourceAssignmentHistory.assigned_at.desc()).all()

    timeline = []
    for m in movements:
        m_type = "asignacion_obra"
        if "transfer" in (m.notes or "").lower() or (m.origin_location and "obra" in m.origin_location.lower()):
            m_type = "transferencia_obra"
        elif "retorno" in (m.notes or "").lower() or "base" in (m.destination_location or "").lower():
            m_type = "retorno_base"

        timeline.append({
            "id": f"mov-{m.id}",
            "type": m_type,
            "date": m.assigned_at.strftime("%Y-%m-%d %H:%M:%S") if m.assigned_at else "-",
            "transfer_code": m.transfer_code or "S/C",
            "project_code": m.project.code if m.project else "Sede Central Dalor (Guacara)",
            "project_name": m.project.name if m.project else "Sede Central Dalor (Guacara)",
            "origin": m.origin_location or "Sede Central Dalor (Guacara)",
            "destination": m.destination_location or "-",
            "role": p.role_title or "Personal Operativo",
            "status": m.status or "en_obra",
            "notes": m.notes or ""
        })

    # 2. Despachos y Guías donde actuó como chofer o receptor
    guides = db.query(DispatchGuide).filter(
        (DispatchGuide.driver_name == p.full_name) |
        (DispatchGuide.received_by_client_name == p.full_name)
    ).order_by(DispatchGuide.dispatch_date.desc()).all()

    for g in guides:
        is_driver = (g.driver_name == p.full_name)
        timeline.append({
            "id": f"disp-{g.id}",
            "type": "chofer_despacho" if is_driver else "receptor_guia",
            "date": g.dispatch_date.strftime("%Y-%m-%d %H:%M:%S") if g.dispatch_date else g.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            "transfer_code": g.guide_number,
            "project_code": g.project.code if g.project else "S/P",
            "project_name": g.project.name if g.project else (g.recipient_name or "Despacho Libre"),
            "origin": "Sede Central Dalor (Guacara)",
            "destination": g.destination_address,
            "role": "Conductor de Traslado" if is_driver else "Receptor en Obra",
            "status": g.status,
            "notes": f"Guía {g.guide_number} | Placa: {g.vehicle_plate} | {g.transfer_reason or ''}"
        })

    # Ordenar por fecha cronológica descendente
    timeline.sort(key=lambda x: x["date"], reverse=True)

    return {
        "personnel": {
            "id": p.id,
            "code": p.code,
            "full_name": p.full_name,
            "role_title": p.role_title,
            "identification_id": p.identification_id or "-",
            "phone": p.phone or "-",
            "current_location": p.current_location or "Sede Central Dalor (Guacara)",
            "status": p.status,
            "project_code": p.current_project.code if p.current_project else "Sede Central"
        },
        "history_count": len(timeline),
        "timeline": timeline
    }
