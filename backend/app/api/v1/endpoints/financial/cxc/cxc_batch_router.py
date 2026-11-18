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
    iva_mode: str = "included_16"  # "included_16" | "add_16" | "exempt"
    exchange_rate: Optional[float] = None
    issue_date: Optional[datetime] = None
    custom_concept: Optional[str] = None


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


@router.post(
    "/cxc/invoice-payments",
    dependencies=[Depends(require_roles(["director_general", "director", "administracion", "administrador_financiero", "facturacion"]))],
)
def invoice_cxc_payments(
    req: BatchInvoicePaymentsRequest,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user),
):
    """Emite facturas fiscales por abonos seleccionados en modalidad 'individual' o 'lote'."""
    if not req.payment_ids:
        raise HTTPException(status_code=400, detail="Debes seleccionar al menos un abono para facturar.")
    mode = (req.mode or "lote").strip().lower()
    if mode not in ("individual", "lote"):
        raise HTTPException(status_code=400, detail="Modalidad inválida. Usa 'individual' o 'lote'.")

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
            amt = round(float(p.amount_usd or 0.0), 2)
            rate = float(req.exchange_rate or p.exchange_rate or (parent.exchange_rate if parent else 0.0) or 859.06)
            next_inv = compute_next_invoice_code(db, current_year, "FAC")
            next_ctrl = compute_next_control_number(db)
            base_usd, tax_usd, total_usd, balance_usd, inv_status = _compute_iva_breakdown(amt, req.iva_mode)
            p_code = parent.project.code if (parent and parent.project) else "GEN"
            concept = (req.custom_concept or "").strip() or f"ABONO FACTURADO ({parent.invoice_number}) - [{p_code}] {parent.description}"

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
                amount_bs=round(total_usd * rate, 2),
                exchange_rate=rate,
                paid_amount_usd=amt,
                balance_usd=balance_usd,
                status=inv_status,
                notes=f"Facturación individual de abono #{p.id} (Origen: {parent.invoice_number})",
            )
            db.add(inv)
            db.flush()
            _advance_company_correlatives(db, next_inv, next_ctrl)

            _deduct_from_parent_receivable(parent, amt)
            p.receivable_id = inv.id
            p.notes = f"{(p.notes or '').strip()} [FACTURADO IND: {next_inv} | Origen: {parent.invoice_number}]".strip()
            created_invoices.append({"id": inv.id, "invoice_number": next_inv, "control_number": next_ctrl, "amount_usd": amt})
    else:
        total_amt = round(sum(float(p.amount_usd or 0.0) for p in payments), 2)
        first_parent = payments[0].receivable
        rate = float(req.exchange_rate or payments[0].exchange_rate or (first_parent.exchange_rate if first_parent else 0.0) or 859.06)
        next_inv = compute_next_invoice_code(db, current_year, "FAC")
        next_ctrl = compute_next_control_number(db)
        base_usd, tax_usd, total_inv_usd, balance_usd, inv_status = _compute_iva_breakdown(total_amt, req.iva_mode)
        origins = sorted({p.receivable.invoice_number for p in payments if p.receivable})
        concept = (req.custom_concept or "").strip() or f"FACTURACIÓN CONSOLIDADA ({len(payments)} ABONOS) - {', '.join(origins)}"

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
            amount_bs=round(total_inv_usd * rate, 2),
            exchange_rate=rate,
            paid_amount_usd=total_amt,
            balance_usd=balance_usd,
            status=inv_status,
            notes=f"Facturación en lote de {len(payments)} abonos (IDs: {','.join(str(p.id) for p in payments)})",
        )
        db.add(inv)
        db.flush()
        _advance_company_correlatives(db, next_inv, next_ctrl)

        for p in payments:
            parent = p.receivable
            amt = round(float(p.amount_usd or 0.0), 2)
            _deduct_from_parent_receivable(parent, amt)
            p.receivable_id = inv.id
            p.notes = f"{(p.notes or '').strip()} [FACTURADO LOTE: {next_inv} | Origen: {parent.invoice_number}]".strip()

        created_invoices.append({"id": inv.id, "invoice_number": next_inv, "control_number": next_ctrl, "amount_usd": total_amt})

    db.add(AuditLog(
        username=current_user.username,
        module="finanzas_cxc",
        action=f"facturar_abonos_{mode}",
        details=f"Facturados {len(payments)} abonos en modalidad {mode.upper()}: {[c['invoice_number'] for c in created_invoices]}",
    ))
    db.commit()

    return {
        "success": True,
        "mode": mode,
        "created_invoices": created_invoices,
        "message": f"Se emitieron {len(created_invoices)} factura(s) fiscal(es) en modalidad {mode.upper()}.",
    }
