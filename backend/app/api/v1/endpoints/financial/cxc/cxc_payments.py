"""
Submódulo especializado de Cuentas por Cobrar (CxC) - DALOR SIGO-P.
"""
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
import re
import uuid
from sqlalchemy.orm import Session, joinedload, selectinload
from sqlalchemy import func, text, desc, asc
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any

from app.core.database import get_db
from app.services.storage import R2StorageService
from app.models.models import (
    AccountReceivable,
    FinancialPayment,
    FinancialAccount,
    Client,
    Project,
    AuditLog,
    ReceivableFollowUpLog,
    User as UserModel,
    CompanyProfile
)
from app.api.deps import get_current_active_user, require_roles, get_current_user
from app.core.file_security import read_and_validate_file
from app.schemas.schemas import (
    ReceivableFollowUpLogCreate,
    ReceivableFollowUpLogOut
)
from .cxc_schemas import (
    ReceivableCreate,
    PaymentCreate,
    ClientRefundCreate,
    BadDebtRequest,
    BadDebtWriteOff,
    CorrelativeOverrideRequest,
    SplitPaymentItem,
    SplitPaymentRequest,
    ReceivableUpdate,
    ReceivableCancelIn,
    ControlNumberUpdate,
    FiscalCorrelativeUpdate
)

router = APIRouter(dependencies=[Depends(get_current_active_user)])

@router.post("/cxc/{receivable_id}/payment", dependencies=[Depends(require_roles(["director_general", "director", "administracion", "administrador_financiero", "tesoreria"]))])
def record_cxc_payment(receivable_id: int, p_in: PaymentCreate, db: Session = Depends(get_db)):
    r = db.query(AccountReceivable).filter(AccountReceivable.id == receivable_id).with_for_update().first()
    if not r:
        raise HTTPException(status_code=404, detail="Factura no encontrada.")

    if r.balance_usd <= 0.001:
        raise HTTPException(status_code=400, detail="Esta factura ya se encuentra totalmente cobrada (saldo $0.00). No es posible registrar abonos adicionales.")

    if p_in.amount_usd <= 0:
        raise HTTPException(status_code=400, detail="El monto del cobro debe ser mayor a cero.")

    if p_in.amount_usd > (r.balance_usd + 0.05):
        raise HTTPException(status_code=400, detail=f"El cobro (${p_in.amount_usd}) supera el saldo pendiente (${r.balance_usd}).")

    # 🛡️ Idempotencia Transaccional: Rechazar duplicación de la misma referencia
    ref_clean = (p_in.reference_number or p_in.voucher_number or "").strip()
    if ref_clean:
        existing_pay = db.query(FinancialPayment).filter(
            FinancialPayment.receivable_id == receivable_id,
            (FinancialPayment.reference_number == ref_clean) | (FinancialPayment.voucher_number == ref_clean)
        ).first()
        if existing_pay:
            raise HTTPException(
                status_code=409,
                detail=f"Operación duplicada: El cobro con referencia '{ref_clean}' ya fue procesado para esta factura (Pago #{existing_pay.id} por ${existing_pay.amount_usd:.2f})."
            )

    # Buscar tasa BCV oficial
    rate = float(p_in.exchange_rate or r.exchange_rate or 0.0)
    if rate <= 0 or rate == 800.0:
        d_str = datetime.utcnow().strftime("%Y-%m-%d")
        bcv_row = db.execute(
            text("SELECT rate FROM bcv_rate_history WHERE rate_date <= :d ORDER BY rate_date DESC LIMIT 1"),
            {"d": d_str}
        ).fetchone()
        if not bcv_row:
            bcv_row = db.execute(text("SELECT rate FROM bcv_rate_history ORDER BY rate_date DESC LIMIT 1")).fetchone()
        if bcv_row and bcv_row[0] and float(bcv_row[0]) > 0:
            rate = float(bcv_row[0])
    if rate <= 0:
        rate = 800.0

    current_year = datetime.utcnow().year
    emitted_inv_id = r.id
    emitted_inv_code = r.fiscal_invoice_number or r.invoice_number

    # CASO: El usuario solicita emitir una Factura Fiscal oficial por este cobro específico
    if p_in.emit_fiscal_invoice:
        is_partial_split = p_in.amount_usd < (r.amount_usd - 0.05)
        
        if is_partial_split:
            # Facturación fraccionada: Crear un nuevo registro fiscal independiente por el monto exacto cobrado
            next_inv = compute_next_invoice_code(db, current_year, "FAC")
            next_ctrl = compute_next_control_number(db)
            
            base_usd = round(p_in.amount_usd / 1.16, 2)
            tax_usd = round(p_in.amount_usd - base_usd, 2)
            
            clean_concept = (p_in.custom_concept or "").strip()
            if not clean_concept:
                p_code = r.project.code if r.project else "GEN"
                clean_concept = f"VALUACIÓN / ABONO FACTURADO - [{p_code}] {r.description}"

            child_r = AccountReceivable(
                invoice_number=next_inv,
                fiscal_invoice_number=next_inv,
                control_number=next_ctrl,
                client_id=r.client_id,
                project_id=r.project_id,
                description=clean_concept,
                issue_date=datetime.utcnow(),
                due_date=r.due_date or datetime.utcnow(),
                taxable_base_usd=base_usd,
                tax_amount_usd=tax_usd,
                tax_withholding_rate=75.0,
                tax_withholding_usd=0.0,
                islr_rate=2.0,
                islr_withholding_usd=0.0,
                net_amount_usd=p_in.amount_usd,
                amount_usd=p_in.amount_usd,
                amount_bs=round(p_in.amount_usd * rate, 2),
                exchange_rate=rate,
                tax_retained_usd=0.0,
                paid_amount_usd=p_in.amount_usd,
                balance_usd=0.0,
                status="cobrado_total",
                notes=f"Emitida automáticamente desde Cobro por ${p_in.amount_usd:.2f} sobre cuenta origen #{r.id} ({r.invoice_number})"
            )
            db.add(child_r)
            db.flush()

            # Avanzar contadores en CompanyProfile
            profile = db.query(CompanyProfile).first()
            if profile:
                m_inv = re.findall(r'\d+', next_inv)
                if m_inv and profile.next_invoice_number and int(m_inv[-1]) >= profile.next_invoice_number:
                    profile.next_invoice_number = int(m_inv[-1]) + 1
                if next_ctrl:
                    m_ctrl = re.findall(r'\d+', next_ctrl)
                    if m_ctrl and profile.next_control_number and int(m_ctrl[-1]) >= profile.next_control_number:
                        profile.next_control_number = int(m_ctrl[-1]) + 1

            # Registrar el pago contra la nueva factura emitida
            payment = FinancialPayment(
                payment_type=p_in.payment_type or "cxc_cobro",
                receivable_id=child_r.id,
                amount_usd=p_in.amount_usd,
                amount_bs=round(p_in.amount_usd * rate, 2),
                exchange_rate=rate,
                payment_method=p_in.payment_method,
                voucher_number=p_in.voucher_number or p_in.reference_number,
                reference_number=p_in.reference_number,
                notes=p_in.notes
            )
            db.add(payment)

            # Reducir la cuenta origen (padre) para que mantenga el saldo real pendiente
            r.amount_usd = max(0.0, round(r.amount_usd - p_in.amount_usd, 2))
            r.balance_usd = max(0.0, round(r.balance_usd - p_in.amount_usd, 2))
            r.taxable_base_usd = round(r.amount_usd / 1.16, 2)
            r.tax_amount_usd = round(r.amount_usd - r.taxable_base_usd, 2)
            r.amount_bs = round(r.amount_usd * rate, 2)
            if r.balance_usd <= 0.01:
                r.status = "cobrado_total"

            emitted_inv_id = child_r.id
            emitted_inv_code = next_inv

        else:
            # Es el cobro del saldo restante o monto total: asegurar correlativo fiscal oficial
            if not getattr(r, "fiscal_invoice_number", None) or not r.fiscal_invoice_number.strip():
                next_inv = compute_next_invoice_code(db, current_year, "FAC")
                r.fiscal_invoice_number = next_inv
                r.control_number = r.control_number or compute_next_control_number(db)
                profile = db.query(CompanyProfile).first()
                if profile:
                    m_inv = re.findall(r'\d+', next_inv)
                    if m_inv and profile.next_invoice_number and int(m_inv[-1]) >= profile.next_invoice_number:
                        profile.next_invoice_number = int(m_inv[-1]) + 1
                    if r.control_number:
                        m_ctrl = re.findall(r'\d+', r.control_number)
                        if m_ctrl and profile.next_control_number and int(m_ctrl[-1]) >= profile.next_control_number:
                            profile.next_control_number = int(m_ctrl[-1]) + 1

            payment = FinancialPayment(
                payment_type=p_in.payment_type or "cxc_cobro",
                receivable_id=r.id,
                amount_usd=p_in.amount_usd,
                amount_bs=round(p_in.amount_usd * rate, 2),
                exchange_rate=rate,
                payment_method=p_in.payment_method,
                voucher_number=p_in.voucher_number or p_in.reference_number,
                reference_number=p_in.reference_number,
                notes=p_in.notes
            )
            db.add(payment)

            r.paid_amount_usd += p_in.amount_usd
            r.balance_usd = max(0.0, round(r.balance_usd - p_in.amount_usd, 2))
            if r.balance_usd <= 0.01:
                r.status = "cobrado_total"
            else:
                r.status = "abono_parcial"

            emitted_inv_id = r.id
            emitted_inv_code = r.fiscal_invoice_number

    else:
        # Flujo estándar de cobro sin emitir nueva factura fiscal (abono tradicional)
        payment = FinancialPayment(
            payment_type=p_in.payment_type or "cxc_cobro",
            receivable_id=r.id,
            amount_usd=p_in.amount_usd,
            amount_bs=round(p_in.amount_usd * rate, 2),
            exchange_rate=rate,
            payment_method=p_in.payment_method,
            voucher_number=p_in.voucher_number or p_in.reference_number,
            reference_number=p_in.reference_number,
            notes=p_in.notes
        )
        db.add(payment)

        r.paid_amount_usd += p_in.amount_usd
        r.balance_usd = max(0.0, round(r.balance_usd - p_in.amount_usd, 2))
        if r.balance_usd <= 0.01:
            r.status = "cobrado_total"
        else:
            r.status = "abono_parcial"

    db.commit()
    return {
        "success": True,
        "message": f"Cobro aplicado exitosamente ({f'Factura Fiscal {emitted_inv_code} emitida' if p_in.emit_fiscal_invoice else 'Saldo restante: $' + str(r.balance_usd)}).",
        "new_balance_usd": r.balance_usd,
        "status": r.status,
        "emitted_invoice_id": emitted_inv_id if p_in.emit_fiscal_invoice else None,
        "invoice_number": emitted_inv_code
    }

@router.post("/cxc/{receivable_id}/refund", dependencies=[Depends(require_roles(["director_general", "director", "administrador_financiero"]))])
def process_client_refund(receivable_id: int, r_in: ClientRefundCreate, db: Session = Depends(get_db)):
    r = db.query(AccountReceivable).filter(AccountReceivable.id == receivable_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Factura o cuenta por cobrar no encontrada.")
    
    # Validación estricta: Solo se puede reembolsar si el cliente pagó de más
    surplus = round((r.paid_amount_usd or 0.0) - (r.amount_usd or 0.0), 2)
    if surplus <= 0.01:
        raise HTTPException(
            status_code=400, 
            detail=f"No hay saldo a favor disponible para reembolso. Monto facturado: ${r.amount_usd:,.2f}, Total cancelado: ${r.paid_amount_usd:,.2f}."
        )
    
    if r_in.amount_usd <= 0.0:
        raise HTTPException(status_code=400, detail="El monto a reembolsar debe ser mayor a cero.")
    
    if r_in.amount_usd > (surplus + 0.01):
        raise HTTPException(
            status_code=400,
            detail=f"El monto a reembolsar (${r_in.amount_usd:,.2f}) supera el saldo a favor disponible (${surplus:,.2f})."
        )
    
    ref_num = (r_in.reference_number or f"REFUND-{int(datetime.utcnow().timestamp())}").strip()
    rate = r_in.exchange_rate or 850.0
    
    payment = FinancialPayment(
        payment_type="reembolso_cliente",
        receivable_id=r.id,
        amount_usd=r_in.amount_usd,
        amount_bs=round(r_in.amount_usd * rate, 2),
        exchange_rate=rate,
        payment_method=r_in.payment_method or "transferencia",
        voucher_number=ref_num,
        reference_number=ref_num,
        notes=f"[REEMBOLSO SALDO A FAVOR] {r_in.notes or ''}".strip()
    )
    db.add(payment)
    
    # Reducir paid_amount_usd para extinguir el excedente reembolsado
    r.paid_amount_usd = max(r.amount_usd, round(r.paid_amount_usd - r_in.amount_usd, 2))
    r.notes = (r.notes or "") + f" | Reembolso de ${r_in.amount_usd:,.2f} USD procesado (Ref: {ref_num})."
    
    audit = AuditLog(
        username="Finanzas",
        module="Finanzas / CxC",
        action="Emitir Reembolso de Saldo a Favor",
        details=f"Reembolso de ${r_in.amount_usd:,.2f} USD emitido para factura {r.invoice_number} ({r.client.name if r.client else 'Cliente'}). Ref: {ref_num}."
    )
    db.add(audit)
    db.commit()
    
    return {
        "success": True,
        "message": f"Reembolso de ${r_in.amount_usd:,.2f} USD emitido exitosamente.",
        "receipt_number": ref_num,
        "remaining_surplus": max(0.0, round(surplus - r_in.amount_usd, 2))
    }

@router.post("/cxc/{receivable_id}/declare-bad-debt", dependencies=[Depends(require_roles(["director_general", "director", "administrador_financiero"]))])
def declare_cxc_bad_debt(receivable_id: int, req: BadDebtRequest, db: Session = Depends(get_db)):
    r = db.query(AccountReceivable).filter(AccountReceivable.id == receivable_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Factura no encontrada.")
    if r.status in ["cobrado_total", "cobrado"]:
        raise HTTPException(status_code=400, detail="No se puede castigar una factura ya cobrada en su totalidad.")

    amount_written_off = r.balance_usd
    r.is_bad_debt = True
    r.bad_debt_amount_usd = amount_written_off
    r.bad_debt_reason = req.reason.strip()
    r.bad_debt_date = datetime.utcnow()
    r.balance_usd = 0.0
    r.status = "incobrable"

    audit = AuditLog(
        username="Finanzas",
        module="Finanzas / CxC",
        action="Declarar Cartera Incobrable",
        details=f"Factura {r.invoice_number} ({r.client.name if r.client else 'Cliente'}) castigada por ${amount_written_off:,.2f} USD. Motivo: {req.reason}. Notas: {req.notes or 'N/A'}"
    )
    db.add(audit)
    db.commit()
    return {
        "success": True,
        "message": f"Factura {r.invoice_number} declarada incobrable por ${amount_written_off:,.2f} USD.",
        "amount_written_off": amount_written_off
    }

# ------------------------------------------------------------------------------
# 3.1 BITÁCORA Y TRAZABILIDAD DE COBRANZA (CxC TIMELINE & SEGUIMIENTO)
# ------------------------------------------------------------------------------


@router.post("/cxc/{receivable_id}/write-off", dependencies=[Depends(require_roles(["director_general", "director", "administrador_financiero"]))])
def write_off_bad_debt(receivable_id: int, w_in: BadDebtWriteOff, db: Session = Depends(get_db)):
    try:
        rec = db.query(AccountReceivable).filter(AccountReceivable.id == receivable_id).first()
        if not rec:
            raise HTTPException(status_code=404, detail="Cuenta por cobrar no encontrada.")

        if rec.balance_usd <= 0:
            raise HTTPException(status_code=400, detail="Esta cuenta no tiene saldo pendiente por castigar.")

        castigo_amount = rec.balance_usd
        rec.is_bad_debt = True
        rec.bad_debt_amount_usd = castigo_amount
        rec.bad_debt_reason = w_in.reason.strip()
        rec.bad_debt_date = datetime.utcnow()
        rec.status = "incobrable"
        rec.balance_usd = 0.0
        if w_in.notes:
            rec.notes = (rec.notes or "") + f"\n[Castigo Cartera: {w_in.reason} - {w_in.notes}]"

        # Si está vinculada a un proyecto, registrar auditoría
        audit = AuditLog(
            username="administracion",
            module="finanzas_cxc",
            action="castigo_cartera_incobrable",
            details=f"Castigo de cartera por ${castigo_amount:.2f} en factura [{rec.invoice_number}] de '{rec.client.name if rec.client else 'General'}'. Motivo: {w_in.reason}"
        )
        db.add(audit)
        db.commit()

        return {
            "success": True,
            "invoice_number": rec.invoice_number,
            "bad_debt_amount_usd": castigo_amount,
            "message": f"Factura [{rec.invoice_number}] declarada Incobrable por ${castigo_amount:.2f}. Saldo vivo retirado de tesorería."
        }
    except Exception as e:
        import traceback
        db.rollback()
        return {"error": str(e), "traceback": traceback.format_exc()}


# ==============================================================================
# COBRO MIXTO UNIFICADO (SINGLE-ENTRY MULTI-SPLIT)
# ==============================================================================
@router.post("/cxc/{receivable_id}/split-payment", dependencies=[Depends(require_roles(["director_general", "director", "administracion", "administrador_financiero", "tesoreria"]))])
def record_cxc_split_payment(
    receivable_id: int,
    req: SplitPaymentRequest,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user)
):
    r = db.query(AccountReceivable).filter(AccountReceivable.id == receivable_id).with_for_update().first()
    if not r:
        raise HTTPException(status_code=404, detail="Factura no encontrada.")

    if r.balance_usd <= 0.001:
        raise HTTPException(status_code=400, detail="Esta factura ya se encuentra totalmente cobrada (saldo $0.00).")

    if not req.items or len(req.items) == 0:
        raise HTTPException(status_code=400, detail="Debe incluir al menos un instrumento de cobro.")

    total_usd = sum(float(item.amount_usd or 0.0) for item in req.items)
    if total_usd <= 0.001:
        raise HTTPException(status_code=400, detail="El monto total a cobrar debe ser mayor a cero.")

    if total_usd > (float(r.balance_usd) + 0.05):
        raise HTTPException(status_code=400, detail=f"El cobro total (${total_usd:.2f}) supera el saldo pendiente (${float(r.balance_usd):.2f}).")

    pay_date = req.payment_date or datetime.utcnow()
    created_payments = []

    for item in req.items:
        m_usd = float(item.amount_usd or 0.0)
        if m_usd <= 0:
            continue
        rate = float(item.exchange_rate or r.exchange_rate or 800.0)
        m_bs = float(item.amount_bs) if item.amount_bs and item.amount_bs > 0 else round(m_usd * rate, 2)

        ptype = "cxc_cobro"
        if item.payment_type == "retencion_iva":
            ptype = "retencion_iva"
            r.tax_withholding_usd = round(float(r.tax_withholding_usd or 0.0) + m_usd, 2)
            if item.voucher_number:
                r.notes = (r.notes or "") + f" [Comp.IVA: {item.voucher_number}]"
        elif item.payment_type == "retencion_islr":
            ptype = "retencion_islr"
            r.islr_withholding_usd = round(float(r.islr_withholding_usd or 0.0) + m_usd, 2)
            if item.voucher_number:
                r.notes = (r.notes or "") + f" [Comp.ISLR: {item.voucher_number}]"

        p = FinancialPayment(
            payment_type=ptype,
            receivable_id=r.id,
            amount_usd=m_usd,
            amount_bs=m_bs,
            exchange_rate=rate,
            payment_date=pay_date,
            payment_method=item.payment_method or "transferencia",
            bank_account=item.bank_account or "banesco_usd",
            financial_account_id=item.financial_account_id,
            reference_number=item.reference_number or item.voucher_number or f"SPLIT-{int(datetime.utcnow().timestamp())}",
            voucher_number=item.voucher_number,
            notes=item.notes or f"Cobro Mixto en {item.payment_type.upper()}"
        )
        db.add(p)
        created_payments.append(p)

    r.paid_amount_usd = round(float(r.paid_amount_usd or 0.0) + total_usd, 2)
    r.balance_usd = max(0.0, round(float(r.amount_usd) - float(r.paid_amount_usd), 2))
    
    if r.balance_usd <= 0.01:
        r.status = "al_dia"
    else:
        r.status = "abono_parcial"

    audit = AuditLog(
        username=current_user.username,
        module="finanzas_cxc",
        action="cobro_mixto_unificado",
        details=f"Cobro mixto por ${total_usd:.2f} aplicado en {len(created_payments)} partes a Factura [{r.invoice_number}]. Nuevo saldo: ${r.balance_usd:.2f}"
    )
    db.add(audit)
    db.commit()
    db.refresh(r)

    return {
        "success": True,
        "message": f"Cobro mixto de ${total_usd:.2f} registrado exitosamente.",
        "invoice_number": r.invoice_number,
        "paid_amount_usd": r.paid_amount_usd,
        "balance_usd": r.balance_usd,
        "tax_withholding_usd": r.tax_withholding_usd,
        "islr_withholding_usd": r.islr_withholding_usd,
        "status": r.status,
        "payments_count": len(created_payments)
    }


# ==============================================================================
# CONSULTA Y REVERSIÓN DE COBROS
# ==============================================================================
@router.get("/cxc/{receivable_id}/payments")
def get_cxc_payments(receivable_id: int, db: Session = Depends(get_db)):
    r = db.query(AccountReceivable).filter(AccountReceivable.id == receivable_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Factura no encontrada.")
    payments = db.query(FinancialPayment).filter(FinancialPayment.receivable_id == receivable_id).order_by(FinancialPayment.payment_date.desc()).all()
    return [
        {
            "id": p.id,
            "payment_type": p.payment_type,
            "payment_method": p.payment_method,
            "amount_usd": p.amount_usd,
            "amount_bs": p.amount_bs,
            "exchange_rate": p.exchange_rate,
            "bank_account": p.bank_account,
            "financial_account_id": p.financial_account_id,
            "reference_number": p.reference_number,
            "voucher_number": p.voucher_number,
            "payment_date": p.payment_date.strftime("%Y-%m-%d %H:%M") if p.payment_date else None,
            "notes": p.notes
        }
        for p in payments
    ]


@router.post("/cxc/{receivable_id}/revert-payment/{payment_id}", dependencies=[Depends(require_roles(["director_general", "director", "administracion", "administrador_financiero"]))])
def revert_cxc_payment(
    receivable_id: int,
    payment_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user)
):
    r = db.query(AccountReceivable).filter(AccountReceivable.id == receivable_id).with_for_update().first()
    if not r:
        raise HTTPException(status_code=404, detail="Factura no encontrada.")

    p = db.query(FinancialPayment).filter(
        FinancialPayment.id == payment_id,
        FinancialPayment.receivable_id == receivable_id
    ).first()
    if not p:
        raise HTTPException(status_code=404, detail="Pago no encontrado o no pertenece a esta factura.")

    rev_amount = float(p.amount_usd)

    if p.payment_type == "retencion_iva":
        r.tax_withholding_usd = max(0.0, round(float(r.tax_withholding_usd or 0.0) - rev_amount, 2))
    elif p.payment_type == "retencion_islr":
        r.islr_withholding_usd = max(0.0, round(float(r.islr_withholding_usd or 0.0) - rev_amount, 2))

    r.paid_amount_usd = max(0.0, round(float(r.paid_amount_usd or 0.0) - rev_amount, 2))
    r.balance_usd = min(float(r.amount_usd), round(float(r.amount_usd) - float(r.paid_amount_usd), 2))

    if r.paid_amount_usd <= 0.001:
        r.status = "pendiente"
    else:
        r.status = "abono_parcial"

    p_ref = p.reference_number or p.voucher_number or str(p.id)
    db.delete(p)

    audit = AuditLog(
        username=current_user.username,
        module="finanzas_cxc",
        action="reversar_cobro_cxc",
        details=f"Cobro #{payment_id} (${rev_amount:.2f}, Ref: {p_ref}) revertido en Factura [{r.invoice_number}] por {current_user.username}. Nuevo saldo: ${r.balance_usd:.2f}"
    )
    db.add(audit)
    db.commit()
    db.refresh(r)

    return {
        "success": True,
        "message": f"Pago de ${rev_amount:.2f} revertido con éxito. Factura reabierta.",
        "invoice_number": r.invoice_number,
        "paid_amount_usd": r.paid_amount_usd,
        "balance_usd": r.balance_usd,
        "status": r.status
    }


# ==============================================================================
# EDICIÓN QUIRÚRGICA DE FACTURA / CxC
# ==============================================================================
