"""
Submódulo desacoplado de Facturación de Abonos (Individual o Lote General) - DALOR SIGO-P.
Permite convertir abonos ya registrados en Facturas Fiscales formales sin duplicar ingresos en Tesorería.
"""

import re
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.api.deps import get_current_active_user, require_roles
from app.models.models import (
    AccountReceivable,
    AuditLog,
    CompanyProfile,
    FinancialPayment,
    User as UserModel,
)
from .cxc_invoices import compute_next_invoice_code, compute_next_control_number

router = APIRouter(dependencies=[Depends(get_current_active_user)])


class BatchInvoicePaymentsRequest(BaseModel):
    payment_ids: List[int]
    mode: str = "lote"  # "individual" | "lote"
    iva_mode: str = "included_16"  # "included_16" | "add_16" | "exempt" | "custom_base"
    billing_basis: str = "bs_real"  # "bs_real" (Bs históricos reales) | "usd_rate"
    custom_taxable_base_bs: Optional[float] = None
    exchange_rate: Optional[float] = None
    issue_date: Optional[datetime] = None
    custom_concept: Optional[str] = None


class UpdateUnbilledPaymentRequest(BaseModel):
    exchange_rate: Optional[float] = None
    amount_bs: Optional[float] = None
    reference_number: Optional[str] = None
    notes: Optional[str] = None


_FACTURADO_TAG_RE = re.compile(r"\s*\[FACTURADO\s+(?:IND|LOTE):[^\]]+\]")
_ORIGEN_ID_RE = re.compile(r"OrigenID:\s*(\d+)")
_ORIGEN_INV_RE = re.compile(r"Origen:\s*([^|\]]+)")


def _compute_iva_breakdown_bs(paid_bs: float, iva_mode: str, custom_taxable_base_bs: Optional[float] = None):
    m = (iva_mode or "included_16").strip().lower()
    if m == "custom_base":
        base_bs = max(0.0, round(float(custom_taxable_base_bs or 0.0), 2))
        exempt_bs = max(0.0, round(paid_bs - base_bs, 2))
        tax_bs = round(base_bs * 0.16, 2)
        total_bs = round(base_bs + exempt_bs + tax_bs, 2)
        balance_bs = max(0.0, round(total_bs - paid_bs, 2))
        status = "abono_parcial" if balance_bs > 0.01 else "cobrado_total"
        return base_bs, tax_bs, total_bs, balance_bs, status
    if m == "add_16":
        base_bs = round(paid_bs, 2)
        tax_bs = round(base_bs * 0.16, 2)
        total_bs = round(base_bs + tax_bs, 2)
        balance_bs = max(0.0, round(total_bs - paid_bs, 2))
        status = "abono_parcial" if balance_bs > 0.01 else "cobrado_total"
        return base_bs, tax_bs, total_bs, balance_bs, status
    if m == "exempt":
        total_bs = round(paid_bs, 2)
        return total_bs, 0.0, total_bs, 0.0, "cobrado_total"
    total_bs = round(paid_bs, 2)
    base_bs = round(total_bs / 1.16, 2)
    tax_bs = round(total_bs - base_bs, 2)
    return base_bs, tax_bs, total_bs, 0.0, "cobrado_total"


def _payment_real_bs(p: FinancialPayment) -> float:
    bs = float(p.amount_bs or 0.0)
    if bs > 0.01:
        return round(bs, 2)
    rate = float(p.exchange_rate or (p.receivable.exchange_rate if p.receivable else 0.0) or 0.0)
    if rate > 0:
        return round(float(p.amount_usd or 0.0) * rate, 2)
    return 0.0


def _clean_fiscal_concept(parent: Optional[AccountReceivable], custom_concept: Optional[str]) -> str:
    if custom_concept and custom_concept.strip():
        return custom_concept.strip()[:255]
    if parent and parent.project and parent.project.name:
        return f"Servicios de ejecución de obra: {parent.project.name.strip()}"[:255]
    raw = (parent.description if parent else "") or "Servicios prestados"
    cleaned = re.sub(r"^(Valuación de Obra|Contrato\s*/\s*Valuación Inicial)\s*[-:]\s*", "", raw, flags=re.IGNORECASE).strip()
    return (cleaned or "Servicios prestados")[:255]


def _restore_to_parent_receivable(parent: AccountReceivable, amount_usd: float) -> None:
    parent.amount_usd = round(float(parent.amount_usd or 0.0) + amount_usd, 2)
    parent.paid_amount_usd = round(float(parent.paid_amount_usd or 0.0) + amount_usd, 2)
    parent.balance_usd = max(0.0, round(parent.amount_usd - parent.paid_amount_usd, 2))
    parent.taxable_base_usd = round(parent.amount_usd / 1.16, 2)
    parent.tax_amount_usd = round(parent.amount_usd - parent.taxable_base_usd, 2)
    rate = float(parent.exchange_rate or 0.0)
    if rate > 0:
        parent.amount_bs = round(parent.amount_usd * rate, 2)
    if parent.balance_usd <= 0.01 and parent.paid_amount_usd > 0:
        parent.status = "cobrado_total"
    elif parent.paid_amount_usd > 0:
        parent.status = "abono_parcial"
    else:
        parent.status = "pendiente"


def _compute_iva_breakdown(paid_usd: float, iva_mode: str):
    m = (iva_mode or "included_16").strip().lower()
    if m == "add_16":
        base_usd = round(paid_usd, 2)
        tax_usd = round(base_usd * 0.16, 2)
        total_usd = round(base_usd + tax_usd, 2)
        balance_usd = max(0.0, round(total_usd - paid_usd, 2))
        status = "abono_parcial" if balance_usd > 0.01 else "cobrado_total"
        return base_usd, tax_usd, total_usd, balance_usd, status
    if m == "exempt":
        total_usd = round(paid_usd, 2)
        return total_usd, 0.0, total_usd, 0.0, "cobrado_total"
    total_usd = round(paid_usd, 2)
    base_usd = round(total_usd / 1.16, 2)
    tax_usd = round(total_usd - base_usd, 2)
    return base_usd, tax_usd, total_usd, 0.0, "cobrado_total"


def _advance_company_correlatives(db: Session, inv_code: str, ctrl_code: Optional[str]) -> None:
    profile = db.query(CompanyProfile).first()
    if not profile:
        return
    m_inv = re.findall(r"\d+", inv_code or "")
    if m_inv and profile.next_invoice_number and int(m_inv[-1]) >= profile.next_invoice_number:
        profile.next_invoice_number = int(m_inv[-1]) + 1
    if ctrl_code:
        m_ctrl = re.findall(r"\d+", ctrl_code)
        if m_ctrl and profile.next_control_number and int(m_ctrl[-1]) >= profile.next_control_number:
            profile.next_control_number = int(m_ctrl[-1]) + 1


def _deduct_from_parent_receivable(parent: AccountReceivable, amount_usd: float) -> None:
    parent.amount_usd = max(0.0, round(float(parent.amount_usd or 0.0) - amount_usd, 2))
    parent.paid_amount_usd = max(0.0, round(float(parent.paid_amount_usd or 0.0) - amount_usd, 2))
    parent.balance_usd = max(0.0, round(parent.amount_usd - parent.paid_amount_usd, 2))
    parent.taxable_base_usd = round(parent.amount_usd / 1.16, 2)
    parent.tax_amount_usd = round(parent.amount_usd - parent.taxable_base_usd, 2)
    rate = float(parent.exchange_rate or 0.0)
    if rate > 0:
        parent.amount_bs = round(parent.amount_usd * rate, 2)
    if parent.amount_usd <= 0.01 or (parent.balance_usd <= 0.01 and parent.paid_amount_usd > 0):
        parent.status = "cobrado_total"
    elif parent.paid_amount_usd > 0:
        parent.status = "abono_parcial"
    else:
        parent.status = "pendiente"


@router.get("/cxc/unbilled-payments")
def get_unbilled_cxc_payments(
    client_id: Optional[int] = Query(None),
    receivable_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    """Lista los abonos de CxC elegibles para facturación fiscal (individual o por lote)."""
    query = (
        db.query(FinancialPayment)
        .join(AccountReceivable, FinancialPayment.receivable_id == AccountReceivable.id)
        .options(joinedload(FinancialPayment.receivable).joinedload(AccountReceivable.client))
        .filter(
            FinancialPayment.receivable_id.isnot(None),
            FinancialPayment.amount_usd > 0.01,
            AccountReceivable.status != "anulada",
        )
    )
    if client_id:
        query = query.filter(AccountReceivable.client_id == client_id)
    if receivable_id:
        query = query.filter(FinancialPayment.receivable_id == receivable_id)

    payments = query.order_by(FinancialPayment.payment_date.desc(), FinancialPayment.id.desc()).all()
    results = []
    for p in payments:
        notes_str = p.notes or ""
        if "[FACTURADO" in notes_str:
            continue
        rec = p.receivable
        results.append({
            "id": p.id,
            "receivable_id": p.receivable_id,
            "invoice_number": rec.invoice_number if rec else None,
            "client_id": rec.client_id if rec else None,
            "client_name": rec.client.name if (rec and rec.client) else "Cliente",
            "project_id": rec.project_id if rec else None,
            "amount_usd": round(float(p.amount_usd or 0.0), 2),
            "amount_bs": round(float(p.amount_bs or 0.0), 2),
            "exchange_rate": float(p.exchange_rate or 0.0),
            "payment_method": p.payment_method,
            "reference_number": p.reference_number or p.voucher_number or "-",
            "payment_date": p.payment_date.strftime("%Y-%m-%d %H:%M") if p.payment_date else None,
            "notes": p.notes,
        })
    return results


@router.patch(
    "/cxc/unbilled-payments/{payment_id}",
    dependencies=[Depends(require_roles(["director_general", "director", "administracion", "administrador_financiero", "facturacion"]))],
)
def update_unbilled_cxc_payment(
    payment_id: int,
    payload: UpdateUnbilledPaymentRequest,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user),
):
    """Permite ajustar tasa BCV y/o monto en Bolívares de un abono aún no facturado."""
    p = (
        db.query(FinancialPayment)
        .options(joinedload(FinancialPayment.receivable))
        .filter(FinancialPayment.id == payment_id, FinancialPayment.receivable_id.isnot(None))
        .first()
    )
    if not p:
        raise HTTPException(status_code=404, detail="Abono no encontrado.")
    if "[FACTURADO" in (p.notes or ""):
        raise HTTPException(status_code=400, detail="Este abono ya fue facturado. Reversa primero la factura de lote para editarlo.")

    amt_usd = float(p.amount_usd or 0.0)
    old_rate = float(p.exchange_rate or 0.0)
    old_bs = float(p.amount_bs or 0.0)

    if payload.amount_bs is not None and payload.amount_bs > 0 and payload.exchange_rate is None:
        p.amount_bs = round(float(payload.amount_bs), 2)
        if amt_usd > 0:
            p.exchange_rate = round(p.amount_bs / amt_usd, 4)
    elif payload.exchange_rate is not None and payload.exchange_rate > 0:
        p.exchange_rate = round(float(payload.exchange_rate), 4)
        if payload.amount_bs is not None and payload.amount_bs > 0:
            p.amount_bs = round(float(payload.amount_bs), 2)
        else:
            p.amount_bs = round(amt_usd * p.exchange_rate, 2)

    if payload.reference_number is not None:
        p.reference_number = payload.reference_number.strip() or None
    if payload.notes is not None and "[FACTURADO" not in payload.notes:
        p.notes = payload.notes.strip() or None

    db.add(AuditLog(
        username=current_user.username,
        module="finanzas_cxc",
        action="editar_tasa_abono_cxc",
        details=(
            f"Ajuste de tasa/Bs en abono #{p.id} (USD ${amt_usd:.2f}): "
            f"Tasa {old_rate:.4f} -> {float(p.exchange_rate or 0):.4f}, "
            f"Bs {old_bs:.2f} -> {float(p.amount_bs or 0):.2f}."
        ),
    ))
    db.commit()
    db.refresh(p)
    return {
        "success": True,
        "payment": {
            "id": p.id,
            "amount_usd": round(float(p.amount_usd or 0.0), 2),
            "amount_bs": round(float(p.amount_bs or 0.0), 2),
            "exchange_rate": round(float(p.exchange_rate or 0.0), 4),
            "reference_number": p.reference_number or p.voucher_number or "-",
            "notes": p.notes,
        },
    }


@router.post(
    "/cxc/invoice-payments",
    dependencies=[Depends(require_roles(["director_general", "director", "administracion", "administrador_financiero", "facturacion"]))],
)
def invoice_cxc_payments(
    req: BatchInvoicePaymentsRequest,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user),
):
    """Emite facturas fiscales en Bolívares reales por abonos seleccionados ('individual' o 'lote')."""
    if not req.payment_ids:
        raise HTTPException(status_code=400, detail="Debes seleccionar al menos un abono para facturar.")
    mode = (req.mode or "lote").strip().lower()
    if mode not in ("individual", "lote"):
        raise HTTPException(status_code=400, detail="Modalidad inválida. Usa 'individual' o 'lote'.")
    basis = (req.billing_basis or "bs_real").strip().lower()

    payments = (
        db.query(FinancialPayment)
        .options(joinedload(FinancialPayment.receivable).joinedload(AccountReceivable.project))
        .filter(FinancialPayment.id.in_(req.payment_ids), FinancialPayment.receivable_id.isnot(None))
        .order_by(FinancialPayment.id.asc())
        .all()
    )
    if len(payments) != len(set(req.payment_ids)):
        raise HTTPException(status_code=404, detail="Uno o más abonos seleccionados no existen o no pertenecen a CxC.")

    client_ids = {p.receivable.client_id for p in payments if p.receivable}
    if len(client_ids) != 1:
        raise HTTPException(status_code=400, detail="Todos los abonos seleccionados deben pertenecer al mismo cliente.")

    for p in payments:
        if "[FACTURADO" in (p.notes or ""):
            raise HTTPException(status_code=400, detail=f"El abono #{p.id} ya fue facturado anteriormente.")

    client_id = next(iter(client_ids))
    issue_dt = req.issue_date or datetime.utcnow()
    current_year = issue_dt.year
    created_invoices = []

    if mode == "individual":
        for p in payments:
            parent = p.receivable
            amt_orig_usd = round(float(p.amount_usd or 0.0), 2)
            p_bs = _payment_real_bs(p)
            emission_rate = float(req.exchange_rate or p.exchange_rate or (parent.exchange_rate if parent else 0.0) or 859.06)
            if p_bs <= 0.01:
                p_bs = round(amt_orig_usd * emission_rate, 2)

            if basis == "usd_rate":
                base_usd, tax_usd, total_usd, balance_usd, inv_status = _compute_iva_breakdown(amt_orig_usd, req.iva_mode)
                total_bs = round(total_usd * emission_rate, 2)
                paid_inv_usd = amt_orig_usd
            else:
                base_bs, tax_bs, total_bs, balance_bs, inv_status = _compute_iva_breakdown_bs(p_bs, req.iva_mode, req.custom_taxable_base_bs)
                total_usd = round(total_bs / emission_rate, 2) if emission_rate > 0 else amt_orig_usd
                base_usd = round(base_bs / emission_rate, 2) if emission_rate > 0 else round(total_usd / 1.16, 2)
                tax_usd = round(tax_bs / emission_rate, 2) if emission_rate > 0 else (round(total_usd - base_usd, 2) if req.iva_mode != "exempt" else 0.0)
                paid_inv_usd = round(p_bs / emission_rate, 2) if emission_rate > 0 else amt_orig_usd
                balance_usd = max(0.0, round(balance_bs / emission_rate, 2)) if emission_rate > 0 else 0.0

            next_inv = compute_next_invoice_code(db, current_year, "FAC")
            next_ctrl = compute_next_control_number(db)
            concept = _clean_fiscal_concept(parent, req.custom_concept)

            inv = AccountReceivable(
                invoice_number=next_inv,
                fiscal_invoice_number=next_inv,
                control_number=next_ctrl,
                client_id=client_id,
                project_id=parent.project_id if parent else None,
                description=concept,
                issue_date=issue_dt,
                due_date=issue_dt,
                taxable_base_usd=base_usd,
                tax_amount_usd=tax_usd,
                net_amount_usd=total_usd,
                amount_usd=total_usd,
                amount_bs=total_bs,
                exchange_rate=emission_rate,
                paid_amount_usd=paid_inv_usd,
                balance_usd=balance_usd,
                status=inv_status,
                notes=f"[BATCH_INVOICE | mode=individual | orig_usd={amt_orig_usd:.2f} | orig_bs={p_bs:.2f} | ids={p.id}]",
            )
            db.add(inv)
            db.flush()
            _advance_company_correlatives(db, next_inv, next_ctrl)

            _deduct_from_parent_receivable(parent, amt_orig_usd)
            p.receivable_id = inv.id
            p.notes = f"{(p.notes or '').strip()} [FACTURADO IND: {next_inv} | OrigenID: {parent.id} | Origen: {parent.invoice_number}]".strip()
            created_invoices.append({"id": inv.id, "invoice_number": next_inv, "control_number": next_ctrl, "amount_usd": total_usd, "amount_bs": total_bs})
    else:
        total_orig_usd = round(sum(float(p.amount_usd or 0.0) for p in payments), 2)
        first_parent = payments[0].receivable
        emission_rate = float(req.exchange_rate or payments[0].exchange_rate or (first_parent.exchange_rate if first_parent else 0.0) or 859.06)
        total_real_bs = round(sum((_payment_real_bs(p) or round(float(p.amount_usd or 0.0) * emission_rate, 2)) for p in payments), 2)

        if basis == "usd_rate":
            base_usd, tax_usd, total_inv_usd, balance_usd, inv_status = _compute_iva_breakdown(total_orig_usd, req.iva_mode)
            total_inv_bs = round(total_inv_usd * emission_rate, 2)
            paid_inv_usd = total_orig_usd
        else:
            base_bs, tax_bs, total_inv_bs, balance_bs, inv_status = _compute_iva_breakdown_bs(total_real_bs, req.iva_mode, req.custom_taxable_base_bs)
            total_inv_usd = round(total_inv_bs / emission_rate, 2) if emission_rate > 0 else total_orig_usd
            base_usd = round(base_bs / emission_rate, 2) if emission_rate > 0 else round(total_inv_usd / 1.16, 2)
            tax_usd = round(tax_bs / emission_rate, 2) if emission_rate > 0 else (round(total_inv_usd - base_usd, 2) if req.iva_mode != "exempt" else 0.0)
            paid_inv_usd = round(total_real_bs / emission_rate, 2) if emission_rate > 0 else total_orig_usd
            balance_usd = max(0.0, round(balance_bs / emission_rate, 2)) if emission_rate > 0 else 0.0

        next_inv = compute_next_invoice_code(db, current_year, "FAC")
        next_ctrl = compute_next_control_number(db)
        concept = _clean_fiscal_concept(first_parent, req.custom_concept)

        inv = AccountReceivable(
            invoice_number=next_inv,
            fiscal_invoice_number=next_inv,
            control_number=next_ctrl,
            client_id=client_id,
            project_id=first_parent.project_id if first_parent else None,
            description=concept,
            issue_date=issue_dt,
            due_date=issue_dt,
            taxable_base_usd=base_usd,
            tax_amount_usd=tax_usd,
            net_amount_usd=total_inv_usd,
            amount_usd=total_inv_usd,
            amount_bs=total_inv_bs,
            exchange_rate=emission_rate,
            paid_amount_usd=paid_inv_usd,
            balance_usd=balance_usd,
            status=inv_status,
            notes=f"[BATCH_INVOICE | mode=lote | orig_usd={total_orig_usd:.2f} | orig_bs={total_real_bs:.2f} | ids={','.join(str(p.id) for p in payments)}]",
        )
        db.add(inv)
        db.flush()
        _advance_company_correlatives(db, next_inv, next_ctrl)

        for p in payments:
            parent = p.receivable
            amt = round(float(p.amount_usd or 0.0), 2)
            _deduct_from_parent_receivable(parent, amt)
            p.receivable_id = inv.id
            p.notes = f"{(p.notes or '').strip()} [FACTURADO LOTE: {next_inv} | OrigenID: {parent.id} | Origen: {parent.invoice_number}]".strip()

        created_invoices.append({"id": inv.id, "invoice_number": next_inv, "control_number": next_ctrl, "amount_usd": total_inv_usd, "amount_bs": total_inv_bs})

    db.add(AuditLog(
        username=current_user.username,
        module="finanzas_cxc",
        action=f"facturar_abonos_{mode}",
        details=f"Facturados {len(payments)} abonos en modalidad {mode.upper()} (base={basis}): {[c['invoice_number'] for c in created_invoices]}",
    ))
    db.commit()

    return {
        "success": True,
        "mode": mode,
        "created_invoices": created_invoices,
        "message": f"Se emitieron {len(created_invoices)} factura(s) fiscal(es) en Bolívares ({mode.upper()}).",
    }


@router.get("/cxc/{cxc_id}/batch-summary")
def get_batch_invoice_summary(cxc_id: int, db: Session = Depends(get_db)):
    """Ficha interna privada de trazabilidad de abonos vinculados a una factura emitida por lote/abono."""
    inv = (
        db.query(AccountReceivable)
        .options(joinedload(AccountReceivable.client))
        .filter(AccountReceivable.id == cxc_id)
        .first()
    )
    if not inv:
        raise HTTPException(status_code=404, detail="Factura no encontrada.")

    payments = (
        db.query(FinancialPayment)
        .filter(FinancialPayment.receivable_id == cxc_id)
        .order_by(FinancialPayment.payment_date.asc(), FinancialPayment.id.asc())
        .all()
    )
    linked = []
    for p in payments:
        m_orig = _ORIGEN_INV_RE.search(p.notes or "")
        linked.append({
            "id": p.id,
            "payment_date": p.payment_date.strftime("%Y-%m-%d %H:%M") if p.payment_date else None,
            "origin_invoice": m_orig.group(1).strip() if m_orig else "-",
            "payment_method": p.payment_method,
            "reference_number": p.reference_number or p.voucher_number or "-",
            "amount_usd_original": round(float(p.amount_usd or 0.0), 2),
            "exchange_rate_payment": round(float(p.exchange_rate or 0.0), 4),
            "amount_bs_real": _payment_real_bs(p),
        })

    total_orig_usd = round(sum(x["amount_usd_original"] for x in linked), 2)
    total_real_bs = round(sum(x["amount_bs_real"] for x in linked), 2)
    weighted_rate = round(total_real_bs / total_orig_usd, 4) if total_orig_usd > 0 else 0.0
    can_revert = inv.status != "anulada" and any("[FACTURADO" in (p.notes or "") for p in payments)

    return {
        "invoice_id": inv.id,
        "invoice_number": inv.invoice_number,
        "control_number": inv.control_number,
        "client_name": inv.client.name if inv.client else "Cliente",
        "status": inv.status,
        "issue_date": inv.issue_date.strftime("%Y-%m-%d") if inv.issue_date else None,
        "fiscal_amount_bs": round(float(inv.amount_bs or 0.0), 2),
        "fiscal_emission_rate": round(float(inv.exchange_rate or 0.0), 4),
        "fiscal_amount_usd_ref": round(float(inv.amount_usd or 0.0), 2),
        "historical_total_usd": total_orig_usd,
        "historical_total_bs": total_real_bs,
        "weighted_avg_rate": weighted_rate,
        "can_revert": can_revert,
        "payments": linked,
    }


@router.post(
    "/cxc/{cxc_id}/revert-batch-invoice",
    dependencies=[Depends(require_roles(["director_general", "director", "administracion", "administrador_financiero"]))],
)
def revert_batch_invoice(
    cxc_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user),
):
    """Reverso integral: devuelve cada abono a su cuenta madre original, restaura sus saldos y anula la factura de lote."""
    inv = db.query(AccountReceivable).filter(AccountReceivable.id == cxc_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Factura no encontrada.")
    if inv.status == "anulada":
        raise HTTPException(status_code=400, detail="Esta factura ya se encuentra anulada.")

    payments = (
        db.query(FinancialPayment)
        .filter(FinancialPayment.receivable_id == cxc_id)
        .order_by(FinancialPayment.id.asc())
        .all()
    )
    batch_payments = [p for p in payments if "[FACTURADO" in (p.notes or "")]
    if not batch_payments:
        raise HTTPException(status_code=400, detail="Esta factura no tiene abonos de lote vinculados para reversar.")

    restored_origins = set()
    for p in batch_payments:
        notes_str = p.notes or ""
        parent = None
        m_id = _ORIGEN_ID_RE.search(notes_str)
        if m_id:
            parent = db.query(AccountReceivable).filter(AccountReceivable.id == int(m_id.group(1))).first()
        if not parent:
            m_inv = _ORIGEN_INV_RE.search(notes_str)
            if m_inv:
                parent = db.query(AccountReceivable).filter(AccountReceivable.invoice_number == m_inv.group(1).strip()).first()
        if not parent:
            raise HTTPException(
                status_code=400,
                detail=f"No se pudo localizar la cuenta origen del abono #{p.id}. Reverso cancelado por seguridad.",
            )

        amt_usd = round(float(p.amount_usd or 0.0), 2)
        _restore_to_parent_receivable(parent, amt_usd)
        p.receivable_id = parent.id
        p.notes = _FACTURADO_TAG_RE.sub("", notes_str).strip() or None
        restored_origins.add(parent.invoice_number)

    inv.status = "anulada"
    inv.paid_amount_usd = 0.0
    inv.balance_usd = 0.0
    inv.notes = f"{(inv.notes or '').strip()} [LOTE REVERSADO el {datetime.utcnow().strftime('%Y-%m-%d %H:%M')} por {current_user.username}]".strip()

    db.add(AuditLog(
        username=current_user.username,
        module="finanzas_cxc",
        action="reversar_facturacion_lote_cxc",
        details=(
            f"Reversada factura de lote [{inv.invoice_number}] (#{inv.id}). "
            f"Devueltos {len(batch_payments)} abono(s) a cuentas origen: {sorted(restored_origins)}."
        ),
    ))
    db.commit()

    return {
        "success": True,
        "invoice_number": inv.invoice_number,
        "restored_payments_count": len(batch_payments),
        "restored_origins": sorted(restored_origins),
        "message": f"Factura {inv.invoice_number} anulada y {len(batch_payments)} abono(s) devueltos a su estado disponible original.",
    }
