"""
Submódulo desacoplado de Personal Subcontratado y Recursos Opcionales (Exclusivo de Proyectos / Obras).
No aplica a Servicios APU ni Cotizaciones.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import get_current_active_user
from app.models.models import AuditLog, Project, ProjectSubcontractResource, User as UserModel

router = APIRouter(dependencies=[Depends(get_current_active_user)])


class SubcontractItemCreate(BaseModel):
    resource_kind: str = "personal_subcontratado"  # personal_subcontratado | recurso_opcional
    name: str
    specialty_or_unit: Optional[str] = None
    provider_name: Optional[str] = None
    quantity: float = 1.0
    unit_cost_usd: float = 0.0
    is_optional: bool = False
    notes: Optional[str] = None


class SubcontractBatchCreate(BaseModel):
    items: List[SubcontractItemCreate]


def _serialize_item(item: ProjectSubcontractResource) -> dict:
    return {
        "id": item.id,
        "project_id": item.project_id,
        "resource_kind": item.resource_kind,
        "name": item.name,
        "specialty_or_unit": item.specialty_or_unit,
        "provider_name": item.provider_name,
        "quantity": float(item.quantity or 1.0),
        "unit_cost_usd": float(item.unit_cost_usd or 0.0),
        "total_cost_usd": float(item.total_cost_usd or 0.0),
        "is_optional": bool(item.is_optional),
        "notes": item.notes,
        "created_at": item.created_at.strftime("%Y-%m-%d %H:%M") if item.created_at else None,
    }


@router.get("/{project_id}/subcontracts")
def list_project_subcontracts(project_id: int, db: Session = Depends(get_db)):
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado.")
    rows = (
        db.query(ProjectSubcontractResource)
        .filter(ProjectSubcontractResource.project_id == project_id)
        .order_by(ProjectSubcontractResource.id.asc())
        .all()
    )
    return [_serialize_item(r) for r in rows]


@router.post("/{project_id}/subcontracts", status_code=201)
def add_project_subcontracts(
    project_id: int,
    payload: SubcontractBatchCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user),
):
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado.")
    if not payload.items:
        raise HTTPException(status_code=400, detail="Debes enviar al menos un registro.")

    created = []
    for raw in payload.items:
        name = (raw.name or "").strip()
        if not name:
            continue
        kind = (raw.resource_kind or "personal_subcontratado").strip().lower()
        if kind not in ("personal_subcontratado", "recurso_opcional"):
            kind = "personal_subcontratado"
        qty = max(0.01, float(raw.quantity or 1.0))
        unit_cost = max(0.0, float(raw.unit_cost_usd or 0.0))
        total_cost = round(qty * unit_cost, 2)
        row = ProjectSubcontractResource(
            project_id=project_id,
            resource_kind=kind,
            name=name,
            specialty_or_unit=(raw.specialty_or_unit or "").strip() or None,
            provider_name=(raw.provider_name or "").strip() or None,
            quantity=qty,
            unit_cost_usd=unit_cost,
            total_cost_usd=total_cost,
            is_optional=bool(raw.is_optional or kind == "recurso_opcional"),
            notes=(raw.notes or "").strip() or None,
        )
        db.add(row)
        db.flush()
        created.append(_serialize_item(row))

    db.add(AuditLog(
        username=current_user.username,
        module="proyectos",
        action="agregar_subcontratacion_recurso_opcional",
        details=f"Agregados {len(created)} item(s) de subcontratación/recurso opcional al proyecto [{proj.code}].",
    ))
    db.commit()
    return {"success": True, "items": created}


@router.delete("/{project_id}/subcontracts/{item_id}")
def delete_project_subcontract(
    project_id: int,
    item_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user),
):
    row = (
        db.query(ProjectSubcontractResource)
        .filter(ProjectSubcontractResource.id == item_id, ProjectSubcontractResource.project_id == project_id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Registro no encontrado.")
    name = row.name
    db.delete(row)
    db.add(AuditLog(
        username=current_user.username,
        module="proyectos",
        action="eliminar_subcontratacion_recurso_opcional",
        details=f"Eliminado '{name}' (#{item_id}) del proyecto #{project_id}.",
    ))
    db.commit()
    return {"success": True, "message": f"Eliminado '{name}'."}
