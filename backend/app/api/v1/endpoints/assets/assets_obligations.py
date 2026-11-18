"""
Submódulo desacoplado de Obligaciones Legales de Flota (Seguros, Pólizas, Trimestres)
y Estado 'En Servicio - No Disponible' - DALOR SIGO-P.
"""

from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.api.deps import get_current_active_user
from app.models.models import Asset, AuditLog, FleetObligation, User as UserModel

router = APIRouter(dependencies=[Depends(get_current_active_user)])


class FleetObligationCreate(BaseModel):
    asset_id: int
    obligation_type: str = "seguro_rcv"
    title: str
    provider_or_entity: Optional[str] = None
    policy_or_ref_number: Optional[str] = None
    issue_date: Optional[datetime] = None
    expiration_date: Optional[datetime] = None
    amount_usd: float = 0.0
    alert_days_before: int = 30
    notes: Optional[str] = None


class FleetObligationUpdate(BaseModel):
    obligation_type: Optional[str] = None
    title: Optional[str] = None
    provider_or_entity: Optional[str] = None
    policy_or_ref_number: Optional[str] = None
    issue_date: Optional[datetime] = None
    expiration_date: Optional[datetime] = None
    amount_usd: Optional[float] = None
    alert_days_before: Optional[int] = None
    status: Optional[str] = None
    notes: Optional[str] = None


def _compute_obligation_status(ob: FleetObligation) -> tuple:
    if (ob.status or "").lower() == "pagado":
        return "pagado", None
    if not ob.expiration_date:
        return ob.status or "vigente", None
    now = datetime.utcnow()
    days_rem = (ob.expiration_date.date() - now.date()).days
    if days_rem < 0:
        return "vencido", days_rem
    if days_rem <= int(ob.alert_days_before or 30):
        return "por_vencer", days_rem
    return "vigente", days_rem


def _serialize_obligation(ob: FleetObligation) -> dict:
    computed_status, days_rem = _compute_obligation_status(ob)
    return {
        "id": ob.id,
        "asset_id": ob.asset_id,
        "asset_code": ob.asset.asset_code if ob.asset else None,
        "asset_name": ob.asset.name if ob.asset else None,
        "license_plate": ob.asset.license_plate if ob.asset else None,
        "obligation_type": ob.obligation_type,
        "title": ob.title,
        "provider_or_entity": ob.provider_or_entity,
        "policy_or_ref_number": ob.policy_or_ref_number,
        "issue_date": ob.issue_date.strftime("%Y-%m-%d") if ob.issue_date else None,
        "expiration_date": ob.expiration_date.strftime("%Y-%m-%d") if ob.expiration_date else None,
        "amount_usd": float(ob.amount_usd or 0.0),
        "alert_days_before": int(ob.alert_days_before or 30),
        "status": computed_status,
        "days_remaining": days_rem,
        "notes": ob.notes,
    }


@router.get("/obligations")
def list_fleet_obligations(
    asset_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    query = db.query(FleetObligation).options(joinedload(FleetObligation.asset))
    if asset_id:
        query = query.filter(FleetObligation.asset_id == asset_id)
    rows = query.order_by(FleetObligation.expiration_date.asc(), FleetObligation.id.desc()).all()
    items = [_serialize_obligation(r) for r in rows]
    summary = {
        "total": len(items),
        "vencido": sum(1 for i in items if i["status"] == "vencido"),
        "por_vencer": sum(1 for i in items if i["status"] == "por_vencer"),
        "vigente": sum(1 for i in items if i["status"] == "vigente"),
    }
    return {"items": items, "summary": summary}


@router.post("/obligations", status_code=201)
def create_fleet_obligation(
    payload: FleetObligationCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user),
):
    asset = db.query(Asset).filter(Asset.id == payload.asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Vehículo / activo no encontrado.")
    ob = FleetObligation(
        asset_id=payload.asset_id,
        obligation_type=(payload.obligation_type or "seguro_rcv").strip(),
        title=payload.title.strip(),
        provider_or_entity=(payload.provider_or_entity or "").strip() or None,
        policy_or_ref_number=(payload.policy_or_ref_number or "").strip() or None,
        issue_date=payload.issue_date,
        expiration_date=payload.expiration_date,
        amount_usd=max(0.0, float(payload.amount_usd or 0.0)),
        alert_days_before=max(1, int(payload.alert_days_before or 30)),
        status="vigente",
        notes=(payload.notes or "").strip() or None,
    )
    computed_status, _ = _compute_obligation_status(ob)
    ob.status = computed_status
    db.add(ob)
    db.add(AuditLog(
        username=current_user.username,
        module="flota_obligaciones",
        action="crear_obligacion_flota",
        details=f"Registrada obligación '{ob.title}' ({ob.obligation_type}) para [{asset.asset_code}] {asset.name}.",
    ))
    db.commit()
    db.refresh(ob)
    return _serialize_obligation(ob)


@router.put("/obligations/{obligation_id}")
def update_fleet_obligation(
    obligation_id: int,
    payload: FleetObligationUpdate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user),
):
    ob = db.query(FleetObligation).options(joinedload(FleetObligation.asset)).filter(FleetObligation.id == obligation_id).first()
    if not ob:
        raise HTTPException(status_code=404, detail="Obligación no encontrada.")
    for field in (
        "obligation_type",
        "title",
        "provider_or_entity",
        "policy_or_ref_number",
        "issue_date",
        "expiration_date",
        "amount_usd",
        "alert_days_before",
        "status",
        "notes",
    ):
        val = getattr(payload, field)
        if val is not None:
            setattr(ob, field, val)
    if payload.status != "pagado":
        ob.status, _ = _compute_obligation_status(ob)
    db.add(AuditLog(
        username=current_user.username,
        module="flota_obligaciones",
        action="actualizar_obligacion_flota",
        details=f"Actualizada obligación #{ob.id} '{ob.title}' -> estado {ob.status}.",
    ))
    db.commit()
    db.refresh(ob)
    return _serialize_obligation(ob)


@router.delete("/obligations/{obligation_id}")
def delete_fleet_obligation(
    obligation_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user),
):
    ob = db.query(FleetObligation).filter(FleetObligation.id == obligation_id).first()
    if not ob:
        raise HTTPException(status_code=404, detail="Obligación no encontrada.")
    title = ob.title
    db.delete(ob)
    db.add(AuditLog(
        username=current_user.username,
        module="flota_obligaciones",
        action="eliminar_obligacion_flota",
        details=f"Eliminada obligación '{title}' (#{obligation_id}).",
    ))
    db.commit()
    return {"success": True, "message": f"Obligación '{title}' eliminada."}


@router.post("/{asset_id}/enter-service")
def mark_asset_in_service(
    asset_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user),
):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Activo no encontrado.")
    asset.status = "en_servicio"
    asset.current_location = "Taller / En Servicio (No Disponible)"
    asset.current_project_id = None
    db.add(AuditLog(
        username=current_user.username,
        module="flota",
        action="ingresar_a_servicio",
        details=f"Unidad [{asset.asset_code}] {asset.name} marcada como EN SERVICIO (No Disponible).",
    ))
    db.commit()
    return {"success": True, "status": asset.status, "message": f"[{asset.asset_code}] marcada como En Servicio (No Disponible)."}


@router.post("/{asset_id}/release-service")
def release_asset_from_service(
    asset_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user),
):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Activo no encontrado.")
    asset.status = "disponible_base"
    asset.current_location = "Sede Central Dalor (Guacara)"
    db.add(AuditLog(
        username=current_user.username,
        module="flota",
        action="liberar_de_servicio",
        details=f"Unidad [{asset.asset_code}] {asset.name} liberada de servicio -> Disponible en Base.",
    ))
    db.commit()
    return {"success": True, "status": asset.status, "message": f"[{asset.asset_code}] liberada a Disponible en Base."}
