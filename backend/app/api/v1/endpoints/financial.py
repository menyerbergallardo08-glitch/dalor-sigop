from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List, Optional
from pydantic import BaseModel

from app.core.database import get_db
from app.models.models import (
    AccountReceivable, AccountPayable, FinancialPayment, 
    PartnerWithdrawal, FixedExpenseSetting, Project, Client, ExpenseCategory, Expense, AuditLog
)
from app.schemas.schemas import (
    ReceivableCreate, PayableCreate, FinancialPaymentCreate, 
    PartnerWithdrawalCreate, FixedExpenseSettingCreate
)
from app.services.bcv_scraper import BCVScraperService, BCVExchangeRateService

router = APIRouter()

@router.get("/summary")
def get_financial_summary(db: Session = Depends(get_db)):
    r_query = db.query(AccountReceivable).all()
    total_invoiced_cxc = sum(r.amount_usd or 0.0 for r in r_query)
    total_collected_cxc = sum(r.paid_amount_usd or 0.0 for r in r_query)
    pending_cxc = sum(r.balance_usd or 0.0 for r in r_query if not r.is_bad_debt)

    p_query = db.query(AccountPayable).all()
    total_invoiced_cxp = sum(p.amount_usd or 0.0 for p in p_query)
    total_paid_cxp = sum(p.paid_amount_usd or 0.0 for p in p_query)
    pending_cxp = sum(p.balance_usd or 0.0 for p in p_query)

    all_expenses = db.query(Expense).filter(Expense.status == "aprobado").all()
    total_direct_expenses = sum(e.amount_usd or 0.0 for e in all_expenses)

    partner_withdrawals = db.query(PartnerWithdrawal).order_by(PartnerWithdrawal.withdrawal_date.desc()).all()
    total_partner_withdrawals = sum(pw.amount_usd or 0.0 for pw in partner_withdrawals)

    fixed_settings = db.query(FixedExpenseSetting).filter(FixedExpenseSetting.is_active == True).all()
    monthly_fixed_budget = sum(fs.monthly_amount_usd for fs in fixed_settings)
    if monthly_fixed_budget == 0:
        monthly_fixed_budget = 5000.0

    net_operating_cash = total_collected_cxc - total_paid_cxp - total_direct_expenses - total_partner_withdrawals
    net_accrual_profit = total_invoiced_cxc - total_invoiced_cxp - total_direct_expenses
    net_margin_pct = round((net_accrual_profit / total_invoiced_cxc * 100), 1) if total_invoiced_cxc > 0 else 0.0
    fixed_overhead_covered_pct = min(100, round((net_accrual_profit / monthly_fixed_budget * 100), 1)) if monthly_fixed_budget > 0 else 0.0

    return {
        "total_invoiced_cxc_usd": round(total_invoiced_cxc, 2),
        "total_collected_cxc_usd": round(total_collected_cxc, 2),
        "pending_cxc_usd": round(pending_cxc, 2),
        "total_invoiced_cxp_usd": round(total_invoiced_cxp, 2),
        "total_paid_cxp_usd": round(total_paid_cxp, 2),
        "pending_cxp_usd": round(pending_cxp, 2),
        "total_direct_expenses_usd": round(total_direct_expenses, 2),
        "total_partner_withdrawals_usd": round(total_partner_withdrawals, 2),
        "net_operating_cash_usd": round(net_operating_cash, 2),
        "net_accrual_profit_usd": round(net_accrual_profit, 2),
        "net_margin_pct": net_margin_pct,
        "monthly_fixed_budget_usd": round(monthly_fixed_budget, 2),
        "fixed_overhead_covered_pct": fixed_overhead_covered_pct
    }

@router.get("/cxc")
def get_receivables(db: Session = Depends(get_db)):
    rows = db.query(AccountReceivable).order_by(AccountReceivable.due_date.asc()).all()
    return [{
        "id": r.id,
        "invoice_number": r.invoice_number or f"REC-{r.id}",
        "client_name": r.client.name if r.client else "General",
        "client_rif": r.client.rif if r.client else "-",
        "project_name": r.project.name if r.project else "Sede Central",
        "project_code": r.project.code if r.project else "GEN",
        "description": r.description or "Factura / Valuacion",
        "issue_date": r.issue_date.strftime("%Y-%m-%d") if r.issue_date else datetime.utcnow().strftime("%Y-%m-%d"),
        "due_date": r.due_date.strftime("%Y-%m-%d") if r.due_date else datetime.utcnow().strftime("%Y-%m-%d"),
        "amount_usd": r.amount_usd or 0.0,
        "taxable_base_usd": r.taxable_base_usd or 0.0,
        "tax_amount_usd": r.tax_amount_usd or 0.0,
        "tax_withholding_rate": r.tax_withholding_rate or 75.0,
        "tax_withholding_usd": r.tax_withholding_usd or 0.0,
        "islr_rate": r.islr_rate or 2.0,
        "islr_withholding_usd": r.islr_withholding_usd or 0.0,
        "net_amount_usd": r.net_amount_usd or 0.0,
        "paid_amount_usd": r.paid_amount_usd or 0.0,
        "balance_usd": r.balance_usd or 0.0,
        "status": r.status or "pendiente",
        "is_bad_debt": r.is_bad_debt or False,
        "tax_retained_usd": r.tax_retained_usd or 0.0,
        "payments": [{
            "id": p.id,
            "payment_type": p.payment_type,
            "payment_method": p.payment_method,
            "amount_usd": p.amount_usd or 0.0,
            "voucher_number": p.voucher_number or p.reference_number,
            "payment_date": p.payment_date.strftime("%d/%m/%Y") if p.payment_date else "-",
            "notes": p.notes
        } for p in (r.payments or [])]
    } for r in rows]

@router.post("/cxc")
def create_receivable(r_in: ReceivableCreate, db: Session = Depends(get_db)):
    try:
        existing = db.query(AccountReceivable).filter(AccountReceivable.invoice_number == r_in.invoice_number).first()
        if existing:
            raise HTTPException(status_code=400, detail="El numero de factura/valuacion ya existe.")

        gross_amount = r_in.amount_usd or 0.0
        taxable_base = r_in.taxable_base_usd if r_in.taxable_base_usd > 0 else (gross_amount / 1.16)
        tax_amount = r_in.tax_amount_usd if r_in.tax_amount_usd > 0 else (gross_amount - taxable_base)
        ret_iva = (tax_amount * (r_in.tax_withholding_rate / 100.0)) if r_in.tax_withholding_rate > 0 else 0.0
        ret_islr = (taxable_base * (r_in.islr_rate / 100.0)) if r_in.islr_rate > 0 else 0.0
        net_amount = gross_amount - (ret_iva + ret_islr)

        rec = AccountReceivable(
            invoice_number=r_in.invoice_number.strip().upper(),
            client_id=r_in.client_id,
            project_id=r_in.project_id,
            description=r_in.description.strip(),
            issue_date=r_in.issue_date or datetime.utcnow(),
            due_date=r_in.due_date,
            taxable_base_usd=round(taxable_base, 2),
            tax_amount_usd=round(tax_amount, 2),
            tax_withholding_rate=r_in.tax_withholding_rate,
            tax_withholding_usd=round(ret_iva, 2),
            islr_rate=r_in.islr_rate,
            islr_withholding_usd=round(ret_islr, 2),
            net_amount_usd=round(net_amount, 2),
            amount_usd=round(gross_amount, 2),
            paid_amount_usd=0.0,
            balance_usd=round(gross_amount, 2),
            status="pendiente",
            tax_retained_usd=round(ret_iva + ret_islr, 2),
            notes=r_in.notes
        )
        db.add(rec)
        db.commit()
        db.refresh(rec)
        return rec
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al registrar cuenta por cobrar: {str(e)}")

@router.post("/cxc/{receivable_id}/payment")
def record_receivable_payment(receivable_id: int, pay_in: FinancialPaymentCreate, db: Session = Depends(get_db)):
    rec = db.query(AccountReceivable).filter(AccountReceivable.id == receivable_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Cuenta por cobrar no encontrada.")

    pay = FinancialPayment(
        receivable_id=rec.id,
        payment_type=pay_in.payment_type,
        payment_method=pay_in.payment_method,
        voucher_number=pay_in.voucher_number,
        reference_number=pay_in.reference_number,
        amount_usd=pay_in.amount_usd,
        amount_bs=pay_in.amount_bs or (pay_in.amount_usd * pay_in.exchange_rate),
        exchange_rate=pay_in.exchange_rate,
        notes=pay_in.notes,
        payment_date=pay_in.payment_date or datetime.utcnow()
    )
    db.add(pay)

    rec.paid_amount_usd = (rec.paid_amount_usd or 0.0) + pay_in.amount_usd
    rec.balance_usd = max(0.0, (rec.amount_usd or 0.0) - rec.paid_amount_usd)

    if rec.balance_usd <= 0.05:
        rec.status = "cobrado"
    else:
        rec.status = "parcial"

    db.commit()
    return {"message": "Cobro / Abono registrado exitosamente.", "new_balance_usd": rec.balance_usd}

@router.delete("/cxc/{cxc_id}")
def delete_receivable(cxc_id: int, db: Session = Depends(get_db)):
    rec = db.query(AccountReceivable).filter(AccountReceivable.id == cxc_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Cuenta por cobrar no encontrada.")
    db.delete(rec)
    db.commit()
    return {"message": "Cuenta por cobrar eliminada exitosamente."}

@router.get("/cxp")
def get_payables(db: Session = Depends(get_db)):
    rows = db.query(AccountPayable).order_by(AccountPayable.due_date.asc()).all()
    return [{
        "id": p.id,
        "invoice_number": p.invoice_number,
        "supplier_name": p.supplier_name,
        "project_name": p.project.name if p.project else "Gasto Sede / General",
        "description": p.description,
        "issue_date": p.issue_date.strftime("%Y-%m-%d") if p.issue_date else "-",
        "due_date": p.due_date.strftime("%Y-%m-%d") if p.due_date else "-",
        "amount_usd": p.amount_usd or 0.0,
        "paid_amount_usd": p.paid_amount_usd or 0.0,
        "balance_usd": p.balance_usd or 0.0,
        "status": p.status or "pendiente",
        "payable_type": p.payable_type
    } for p in rows]

@router.post("/cxp")
def create_payable(p_in: PayableCreate, db: Session = Depends(get_db)):
    pay = AccountPayable(
        invoice_number=p_in.invoice_number.strip().upper(),
        supplier_name=p_in.supplier_name.strip(),
        project_id=p_in.project_id,
        category_id=p_in.category_id,
        payable_type=p_in.payable_type,
        description=p_in.description.strip(),
        issue_date=p_in.issue_date or datetime.utcnow(),
        due_date=p_in.due_date,
        amount_usd=p_in.amount_usd,
        paid_amount_usd=0.0,
        balance_usd=p_in.amount_usd,
        status="pendiente",
        notes=p_in.notes
    )
    db.add(pay)
    db.commit()
    db.refresh(pay)
    return pay

@router.post("/cxp/{payable_id}/payment")
def record_payable_payment(payable_id: int, pay_in: FinancialPaymentCreate, db: Session = Depends(get_db)):
    pay_record = db.query(AccountPayable).filter(AccountPayable.id == payable_id).first()
    if not pay_record:
        raise HTTPException(status_code=404, detail="Cuenta por pagar no encontrada.")

    fin_pay = FinancialPayment(
        payable_id=pay_record.id,
        payment_type=pay_in.payment_type,
        payment_method=pay_in.payment_method,
        voucher_number=pay_in.voucher_number,
        reference_number=pay_in.reference_number,
        amount_usd=pay_in.amount_usd,
        amount_bs=pay_in.amount_bs or (pay_in.amount_usd * pay_in.exchange_rate),
        exchange_rate=pay_in.exchange_rate,
        notes=pay_in.notes,
        payment_date=pay_in.payment_date or datetime.utcnow()
    )
    db.add(fin_pay)

    pay_record.paid_amount_usd = (pay_record.paid_amount_usd or 0.0) + pay_in.amount_usd
    pay_record.balance_usd = max(0.0, (pay_record.amount_usd or 0.0) - pay_record.paid_amount_usd)

    if pay_record.balance_usd <= 0.05:
        pay_record.status = "pagado"
    else:
        pay_record.status = "parcial"

    db.commit()
    return {"message": "Pago registrado con exito.", "new_balance_usd": pay_record.balance_usd}

@router.get("/bcv-rate")
@router.get("/bcv-rate/")
@router.get("/exchange-rate")
@router.get("/exchange-rate/")
def get_bcv_rate(force_refresh: bool = False):
    try:
        return BCVExchangeRateService.get_current_rate(force_refresh=force_refresh)
    except Exception as e:
        return {
            "rate": 850.00,
            "formatted_rate": "850.00",
            "date_value": datetime.now().strftime("%d/%m/%Y"),
            "source": "Tasa Base de Contingencia (Fallback)",
            "source_tier": "fallback_base",
            "last_updated": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "is_fallback": True,
            "status": "warning",
            "error": str(e)
        }

@router.post("/bcv-rate/sync")
@router.post("/bcv-rate/sync/")
def force_sync_bcv_rate():
    try:
        return BCVExchangeRateService.get_current_rate(force_refresh=True)
    except Exception as e:
        return {
            "rate": 850.00,
            "formatted_rate": "850.00",
            "date_value": datetime.now().strftime("%d/%m/%Y"),
            "source": "Tasa Base de Contingencia (Fallback)",
            "source_tier": "fallback_base",
            "last_updated": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "is_fallback": True,
            "status": "warning",
            "error": str(e)
        }
