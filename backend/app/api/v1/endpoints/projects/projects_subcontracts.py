"""
Submódulo desacoplado de Personal Subcontratado y Recursos Opcionales (Exclusivo de Proyectos / Obras).
No aplica a Servicios APU ni Cotizaciones.
"""

import re
from collections import defaultdict
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import get_current_active_user
from app.models.models import (
    AccountPayable,
    AuditLog,
    Expense,
    ExpenseCategory,
    Project,
    ProjectSubcontractResource,
    User as UserModel,
)
from app.services.bcv_scraper import BCVExchangeRateService

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


class SubcontractItemUpdate(BaseModel):
    resource_kind: Optional[str] = None
    name: Optional[str] = None
    specialty_or_unit: Optional[str] = None
    provider_name: Optional[str] = None
    quantity: Optional[float] = None
    unit_cost_usd: Optional[float] = None
    is_optional: Optional[bool] = None
    notes: Optional[str] = None


class SubcontractJobCostingRequest(BaseModel):
    target_type: str = "expense"  # expense | payable
    grouping: str = "by_provider"  # by_provider | individual | consolidated
    payment_method: Optional[str] = "transferencia"
    item_ids: Optional[List[int]] = None


_JC_TAG_RE = re.compile(r"\[JC:(EXP|CXP)#(\d+)\]")


def _extract_jc_info(notes: Optional[str]) -> tuple:
    if not notes:
        return ("pendiente", None)
    m = _JC_TAG_RE.search(notes)
    if not m:
        return ("pendiente", None)
    kind, ref_id = m.group(1), m.group(2)
    if kind == "EXP":
        return ("gasto", f"Gasto #{ref_id}")
    return ("cxp", f"CxP #{ref_id}")


def _resolve_subcontract_category_id(db: Session) -> int:
    cats = db.query(ExpenseCategory).all()
    for kw in ("subcontrat", "mano de obra", "servicios", "honorarios", "obra"):
        for c in cats:
            if kw in (c.name or "").lower():
                return c.id
    if cats:
        return cats[0].id
    new_cat = ExpenseCategory(
        code="SUBC-01",
        name="Subcontratación y Mano de Obra Externa",
        group_type="costo_directo",
        business_rule="servicios_honorarios",
    )
    db.add(new_cat)
    db.flush()
    return new_cat.id


def _get_safe_bcv_rate() -> float:
    try:
        info = BCVExchangeRateService.get_current_rate()
        val = float((info or {}).get("usd") or (info or {}).get("rate") or 0)
        if val > 0:
            return val
    except Exception:
        pass
    return 1.0


def _serialize_item(item: ProjectSubcontractResource) -> dict:
    jc_status, jc_ref = _extract_jc_info(item.notes)
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
        "job_costing_status": jc_status,
        "job_costing_ref": jc_ref,
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


@router.patch("/{project_id}/subcontracts/{item_id}")
def update_project_subcontract(
    project_id: int,
    item_id: int,
    payload: SubcontractItemUpdate,
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

    data = payload.model_dump(exclude_unset=True) if hasattr(payload, "model_dump") else payload.dict(exclude_unset=True)

    if "name" in data:
        new_name = (data["name"] or "").strip()
        if not new_name:
            raise HTTPException(status_code=400, detail="El nombre no puede estar vacío.")
        row.name = new_name

    if "resource_kind" in data and data["resource_kind"]:
        kind = str(data["resource_kind"]).strip().lower()
        if kind in ("personal_subcontratado", "recurso_opcional"):
            row.resource_kind = kind

    if "specialty_or_unit" in data:
        row.specialty_or_unit = (data["specialty_or_unit"] or "").strip() or None

    if "provider_name" in data:
        row.provider_name = (data["provider_name"] or "").strip() or None

    if "notes" in data:
        row.notes = (data["notes"] or "").strip() or None

    if "is_optional" in data and data["is_optional"] is not None:
        row.is_optional = bool(data["is_optional"] or row.resource_kind == "recurso_opcional")

    if "quantity" in data and data["quantity"] is not None:
        row.quantity = max(0.01, float(data["quantity"]))

    if "unit_cost_usd" in data and data["unit_cost_usd"] is not None:
        row.unit_cost_usd = max(0.0, float(data["unit_cost_usd"]))

    row.total_cost_usd = round(float(row.quantity or 1.0) * float(row.unit_cost_usd or 0.0), 2)

    db.add(AuditLog(
        username=current_user.username,
        module="proyectos",
        action="editar_subcontratacion_recurso_opcional",
        details=(
            f"Editado '{row.name}' (#{item_id}) en proyecto #{project_id}: "
            f"Cant={row.quantity}, Unit=${float(row.unit_cost_usd):.2f}, Total=${float(row.total_cost_usd):.2f}."
        ),
    ))
    db.commit()
    db.refresh(row)
    return {"success": True, "item": _serialize_item(row)}


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


@router.post("/{project_id}/subcontracts/post-to-job-costing")
def post_subcontracts_to_job_costing(
    project_id: int,
    payload: SubcontractJobCostingRequest,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user),
):
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado.")

    target = (payload.target_type or "expense").strip().lower()
    if target not in ("expense", "payable"):
        raise HTTPException(status_code=400, detail="Tipo de destino inválido (use 'expense' o 'payable').")

    grouping = (payload.grouping or "by_provider").strip().lower()
    if grouping not in ("by_provider", "individual", "consolidated"):
        grouping = "by_provider"

    q = db.query(ProjectSubcontractResource).filter(ProjectSubcontractResource.project_id == project_id)
    if payload.item_ids:
        q = q.filter(ProjectSubcontractResource.id.in_(payload.item_ids))
    all_rows = q.order_by(ProjectSubcontractResource.id.asc()).all()

    pending = [
        r for r in all_rows
        if float(r.total_cost_usd or 0.0) > 0.0 and _extract_jc_info(r.notes)[0] == "pendiente"
    ]
    if not pending:
        raise HTTPException(
            status_code=400,
            detail="No hay registros pendientes con monto mayor a $0.00 para imputar al Job Costing.",
        )

    rate = _get_safe_bcv_rate()
    category_id = _resolve_subcontract_category_id(db)
    payment_method = (payload.payment_method or "transferencia").strip().lower()

    groups = []
    if grouping == "individual":
        for r in pending:
            prov = (r.provider_name or r.name or "Subcontratista").strip()
            groups.append((prov, [r]))
    elif grouping == "consolidated":
        provs = sorted({(r.provider_name or "").strip() for r in pending if (r.provider_name or "").strip()})
        prov_label = ", ".join(provs[:3]) if provs else "Personal Subcontratado"
        if len(provs) > 3:
            prov_label += f" (+{len(provs) - 3})"
        groups.append((prov_label, pending))
    else:
        by_prov = defaultdict(list)
        for r in pending:
            key = (r.provider_name or "Contratista General").strip()
            by_prov[key].append(r)
        for prov, items_list in by_prov.items():
            groups.append((prov, items_list))

    created_refs = []
    grand_total = 0.0

    for idx, (supplier_label, group_items) in enumerate(groups, start=1):
        group_total = round(sum(float(it.total_cost_usd or 0.0) for it in group_items), 2)
        if group_total <= 0:
            continue
        grand_total = round(grand_total + group_total, 2)
        amount_bs = round(group_total * rate, 2)

        names_preview = ", ".join(
            f"{it.name} (${float(it.total_cost_usd or 0):.2f})" for it in group_items[:5]
        )
        if len(group_items) > 5:
            names_preview += f" y {len(group_items) - 5} más"
        desc = f"Subcontratación obra [{proj.code}]: {names_preview}"

        if target == "expense":
            exp = Expense(
                category_id=category_id,
                project_id=project_id,
                expense_type="costo_obra",
                partner_name=current_user.username,
                description=desc,
                supplier_vendor=supplier_label,
                amount_bs=amount_bs,
                exchange_rate=rate,
                amount_usd=group_total,
                base_amount_usd=group_total,
                tax_amount_usd=0.0,
                is_tax_exempt=True,
                payment_method=payment_method,
                status="aprobado",
            )
            db.add(exp)
            db.flush()
            tag = f"[JC:EXP#{exp.id}]"
            ref_label = f"Gasto #{exp.id}"
        else:
            inv_code = f"SUBC-{proj.code or project_id}-{group_items[0].id}"
            cxp = AccountPayable(
                invoice_number=inv_code[:50],
                supplier_name=supplier_label[:150],
                project_id=project_id,
                category_id=category_id,
                payable_type="costo_material_obra",
                description=desc[:255],
                doc_type="nota_entrega",
                is_withholding_applied=False,
                taxable_base_usd=group_total,
                tax_amount_usd=0.0,
                tax_withholding_rate=0.0,
                tax_withholding_usd=0.0,
                islr_rate=0.0,
                islr_withholding_usd=0.0,
                net_amount_usd=group_total,
                amount_usd=group_total,
                amount_bs=amount_bs,
                exchange_rate=rate,
                paid_amount_usd=0.0,
                balance_usd=group_total,
                status="pendiente",
                notes=f"Generado desde Subcontratación [{proj.code}] ({len(group_items)} ítem(s)).",
            )
            db.add(cxp)
            db.flush()
            tag = f"[JC:CXP#{cxp.id}]"
            ref_label = f"CxP #{cxp.id}"

        created_refs.append(ref_label)
        for it in group_items:
            prev_notes = (it.notes or "").strip()
            it.notes = f"{prev_notes} {tag}".strip() if prev_notes else tag

    db.add(AuditLog(
        username=current_user.username,
        module="proyectos",
        action="imputar_subcontratacion_job_costing",
        details=(
            f"Imputados {len(pending)} registro(s) de subcontratación del proyecto [{proj.code}] "
            f"como {'Gasto Declarado' if target == 'expense' else 'Cuenta por Pagar (CxP)'} "
            f"(agrupación={grouping}, total=${grand_total:.2f}, refs={', '.join(created_refs)})."
        ),
    ))
    db.commit()

    refreshed = (
        db.query(ProjectSubcontractResource)
        .filter(ProjectSubcontractResource.project_id == project_id)
        .order_by(ProjectSubcontractResource.id.asc())
        .all()
    )
    return {
        "success": True,
        "target_type": target,
        "grouping": grouping,
        "created_count": len(created_refs),
        "imputed_items_count": len(pending),
        "total_usd": grand_total,
        "refs": created_refs,
        "items": [_serialize_item(r) for r in refreshed],
    }


@router.post("/{project_id}/subcontracts/{item_id}/reverse-job-costing")
def reverse_subcontract_job_costing(
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

    m = _JC_TAG_RE.search(row.notes or "")
    if not m:
        raise HTTPException(status_code=400, detail="Este registro no está imputado al Job Costing.")

    tag_full = m.group(0)
    kind = m.group(1)  # EXP | CXP
    ref_id = int(m.group(2))
    ref_label = f"Gasto #{ref_id}" if kind == "EXP" else f"CxP #{ref_id}"

    if kind == "EXP":
        exp = db.query(Expense).filter(Expense.id == ref_id, Expense.project_id == project_id).first()
        if exp:
            db.delete(exp)
    else:
        cxp = db.query(AccountPayable).filter(AccountPayable.id == ref_id, AccountPayable.project_id == project_id).first()
        if cxp:
            if float(cxp.paid_amount_usd or 0.0) > 0.0:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"No se puede reversar {ref_label} porque ya tiene pagos aplicados "
                        f"(${float(cxp.paid_amount_usd):.2f}). Reversa primero el pago en Finanzas/CxP."
                    ),
                )
            db.delete(cxp)

    # Limpiar la etiqueta en todos los ítems de la obra que compartían ese mismo Gasto/CxP
    siblings = (
        db.query(ProjectSubcontractResource)
        .filter(ProjectSubcontractResource.project_id == project_id)
        .all()
    )
    reverted_count = 0
    for s in siblings:
        if s.notes and tag_full in s.notes:
            cleaned = s.notes.replace(tag_full, "").strip()
            s.notes = cleaned or None
            reverted_count += 1

    db.add(AuditLog(
        username=current_user.username,
        module="proyectos",
        action="reversar_subcontratacion_job_costing",
        details=f"Reversado {ref_label} en proyecto #{project_id} ({reverted_count} ítem(s) devueltos a Pendiente).",
    ))
    db.commit()

    refreshed = (
        db.query(ProjectSubcontractResource)
        .filter(ProjectSubcontractResource.project_id == project_id)
        .order_by(ProjectSubcontractResource.id.asc())
        .all()
    )
    return {
        "success": True,
        "reversed_ref": ref_label,
        "reverted_items_count": reverted_count,
        "items": [_serialize_item(r) for r in refreshed],
    }
