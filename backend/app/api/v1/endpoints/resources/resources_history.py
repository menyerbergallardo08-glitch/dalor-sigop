from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import ResourceAssignmentHistory

router = APIRouter()

@router.get("/history")
def get_resource_history(name: str = None, query: str = None, resource_id: int = None, db: Session = Depends(get_db)):
    """
    Retorna el historial completo de asignaciones, transferencias y retornos.
    Soporta filtro por query/nombre o por resource_id.
    """
    q = db.query(ResourceAssignmentHistory)
    
    search_term = query or name
    if search_term and search_term.strip():
        term = f"%{search_term.strip()}%"
        q = q.filter(
            (ResourceAssignmentHistory.resource_name.ilike(term)) |
            (ResourceAssignmentHistory.resource_code.ilike(term)) |
            (ResourceAssignmentHistory.custodian_name.ilike(term))
        )
    if resource_id:
        q = q.filter(ResourceAssignmentHistory.resource_id == resource_id)

    records = q.order_by(ResourceAssignmentHistory.assigned_at.desc()).limit(150).all()

    return [{
        "id": r.id,
        "resource_code": r.resource_code,
        "resource_name": r.resource_name,
        "resource_type": r.resource_type,
        "project_code": r.project.code if r.project else "Sede Central (Dalor)",
        "project_name": r.project.name if r.project else "Operaciones Base",
        "custodian_name": r.custodian_name,
        "driver_name": r.driver_name or "-",
        "transfer_code": r.transfer_code or "-",
        "odometer": getattr(r, "start_odometer", None) or "-",
        "origin_location": r.origin_location,
        "destination_location": r.destination_location,
        "status": r.status,
        "notes": r.notes or "-",
        "assigned_at": r.assigned_at.strftime("%Y-%m-%d %H:%M:%S") if r.assigned_at else ""
    } for r in records]
