from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload, selectinload
from sqlalchemy import func, text
from datetime import datetime, timedelta
from typing import List, Optional
from pydantic import BaseModel

from app.core.database import get_db
from app.models.models import (
    AccountReceivable,
    AccountPayable,
    FinancialPayment,
    FinancialAccount,
    Project,
    Expense,
    Client,
    PartnerWithdrawal,
    FixedExpenseSetting,
    AuditLog,
    Material,
    MaterialMovement
)
from app.api.deps import require_roles, get_current_user
from app.models.models import User as UserModel
from app.schemas.schemas import FinancialAccountCreate, FinancialAccountUpdate, FinancialAccountOut

router = APIRouter()

# ------------------------------------------------------------------------------
# PYDANTIC SCHEMAS
# ------------------------------------------------------------------------------
class ReceivableCreate(BaseModel):
    invoice_number: str
    client_id: int
    project_id: Optional[int] = None
    description: str
    due_date: datetime
    amount_usd: float # Total Factura
    taxable_base_usd: Optional[float] = 0.0
    tax_amount_usd: Optional[float] = 0.0
    tax_withholding_rate: Optional[float] = 75.0 # 0, 75, 100
    tax_withholding_usd: Optional[float] = 0.0
    islr_rate: Optional[float] = 2.0 # 0, 1, 2, 3, 5
    islr_withholding_usd: Optional[float] = 0.0
    tax_retained_usd: Optional[float] = 0.0
    net_amount_usd: Optional[float] = 0.0
    exchange_rate: float = 800.0
    notes: Optional[str] = None

class PayableMaterialItem(BaseModel):
    material_id: int
    quantity: float
    unit_cost_usd: float
    destination: Optional[str] = "Almacén Central Dalor"

class PayableCreate(BaseModel):
    invoice_number: str
    supplier_name: str
    supplier_rif: Optional[str] = None
    control_number: Optional[str] = None
    doc_type: Optional[str] = "factura" # factura, factura_sin_retencion, nota_entrega
    project_id: Optional[int] = None
    category_id: Optional[int] = None
    payable_type: str = "costo_material_obra" # costo_material_obra, stock_almacen, servicios_honorarios, gastos_sede, alquiler_maquinaria_ext
    description: str
    due_date: datetime
    amount_usd: float # Total Factura
    taxable_base_usd: Optional[float] = 0.0
    tax_amount_usd: Optional[float] = 0.0
    tax_withholding_rate: Optional[float] = 75.0
    tax_withholding_usd: Optional[float] = 0.0
    withholding_exempt_usd: Optional[float] = 0.0
    is_withholding_applied: Optional[bool] = True
    islr_rate: Optional[float] = 2.0
    islr_withholding_usd: Optional[float] = 0.0
    tax_retained_usd: Optional[float] = 0.0
    net_amount_usd: Optional[float] = 0.0
    exchange_rate: float = 800.0
    notes: Optional[str] = None
    issue_date: Optional[datetime] = None
    warehouse_movement_id: Optional[int] = None
    warehouse_entry_ref: Optional[str] = None
    material_items: Optional[List[PayableMaterialItem]] = None

class PayableUpdate(BaseModel):
    supplier_name: Optional[str] = None
    supplier_rif: Optional[str] = None
    invoice_number: Optional[str] = None
    control_number: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    doc_type: Optional[str] = None
    is_withholding_applied: Optional[bool] = None
    tax_withholding_rate: Optional[float] = None
    taxable_base_usd: Optional[float] = None
    tax_amount_usd: Optional[float] = None
    tax_withholding_usd: Optional[float] = None
    withholding_exempt_usd: Optional[float] = None
    withholding_voucher_number: Optional[str] = None
    islr_rate: Optional[float] = None
    islr_withholding_usd: Optional[float] = None
    amount_usd: Optional[float] = None
    exchange_rate: Optional[float] = None
    notes: Optional[str] = None

class PaymentCreate(BaseModel):
    payment_type: Optional[str] = "cxc_cobro" # cxc_cobro, cxp_pago, cxp_retencion_iva
    target_id: Optional[int] = None # receivable_id o payable_id
    amount_usd: float
    payment_method: str = "transferencia" # transferencia, efectivo_usd, retencion_iva, retencion_islr, zelle, pago_movil
    bank_account: Optional[str] = "banesco_usd" # banesco_usd, banesco_bs, binance_usdt, efectivo_usd, caja_chica
    voucher_number: Optional[str] = None # N° comprobante de retención o referencia
    reference_number: Optional[str] = None
    exchange_rate: float = 800.0
    notes: Optional[str] = None

class DirectCollectionCreate(BaseModel):
    client_id: int
    project_id: Optional[int] = None
    financial_account_id: Optional[int] = None
    amount_usd: float
    exchange_rate: float = 800.0
    payment_method: str = "transferencia"
    reference_number: Optional[str] = None
    concept: Optional[str] = "Anticipo / Abono de Cliente"
    notes: Optional[str] = None

class PartnerWithdrawalCreate(BaseModel):
    partner_name: str
    concept: str
    amount_usd: float
    payment_method: str = "transferencia"
    reference_number: Optional[str] = None
    exchange_rate: float = 800.0
    notes: Optional[str] = None

class ClientRefundCreate(BaseModel):
    amount_usd: float
    payment_method: str = "transferencia"
    reference_number: Optional[str] = None
    exchange_rate: Optional[float] = 850.0
    notes: Optional[str] = None

# ------------------------------------------------------------------------------
# 1. RESUMEN FINANCIERO EJECUTIVO & POWERBI CON BLINDAJE DE COSTOS
# ------------------------------------------------------------------------------
@router.get("/summary")
def get_financial_summary(
    date_from: str = None,
    date_to: str = None,
    account_id: int = None,
    db: Session = Depends(get_db)
):
    df = None
    dt = None
    if date_from:
        try:
            df = datetime.fromisoformat(date_from)
        except Exception:
            pass
    if date_to:
        try:
            dt = datetime.fromisoformat(date_to + (" 23:59:59" if " " not in date_to else ""))
        except Exception:
            pass

    # 1. Cuentas por Cobrar (CxC Clientes) - Eager load client to eliminate N+1 in alerts
    r_q = db.query(AccountReceivable).options(joinedload(AccountReceivable.client))
    if df:
        r_q = r_q.filter(AccountReceivable.issue_date >= df)
    if dt:
        r_q = r_q.filter(AccountReceivable.issue_date <= dt)
    r_query = r_q.all()
    total_invoiced_cxc = sum(r.amount_usd for r in r_query)

    acc_filter_obj = db.query(FinancialAccount).filter(FinancialAccount.id == account_id).first() if account_id else None
    acc_name_tag = acc_filter_obj.name if acc_filter_obj else None

    pay_cxc_q = db.query(FinancialPayment).filter(FinancialPayment.receivable_id.isnot(None))
    if df:
        pay_cxc_q = pay_cxc_q.filter(FinancialPayment.payment_date >= df)
    if dt:
        pay_cxc_q = pay_cxc_q.filter(FinancialPayment.payment_date <= dt)
    if account_id:
        if acc_name_tag:
            pay_cxc_q = pay_cxc_q.filter((FinancialPayment.financial_account_id == account_id) | (FinancialPayment.bank_account.ilike(f"%{acc_name_tag}%")))
        else:
            pay_cxc_q = pay_cxc_q.filter(FinancialPayment.financial_account_id == account_id)
    cxc_payments = pay_cxc_q.all()

    if df or dt or account_id:
        total_collected_cxc = sum(p.amount_usd for p in cxc_payments)
    else:
        total_collected_cxc = sum(r.paid_amount_usd for r in r_query)
    pending_cxc = sum(r.balance_usd for r in r_query)

    # 2. Cuentas por Pagar (CxP Proveedores)
    p_q = db.query(AccountPayable)
    if df:
        p_q = p_q.filter(AccountPayable.issue_date >= df)
    if dt:
        p_q = p_q.filter(AccountPayable.issue_date <= dt)
    p_query = p_q.all()
    total_invoiced_cxp = sum(p.amount_usd for p in p_query)

    pay_cxp_q = db.query(FinancialPayment).filter(
        FinancialPayment.payable_id.isnot(None),
        FinancialPayment.payment_method.notin_(["retencion_iva", "retencion_islr"])
    )
    if df:
        pay_cxp_q = pay_cxp_q.filter(FinancialPayment.payment_date >= df)
    if dt:
        pay_cxp_q = pay_cxp_q.filter(FinancialPayment.payment_date <= dt)
    if account_id:
        if acc_name_tag:
            pay_cxp_q = pay_cxp_q.filter((FinancialPayment.financial_account_id == account_id) | (FinancialPayment.bank_account.ilike(f"%{acc_name_tag}%")))
        else:
            pay_cxp_q = pay_cxp_q.filter(FinancialPayment.financial_account_id == account_id)
    cxp_bank_outflows = sum(p.amount_usd for p in pay_cxp_q.all())

    total_paid_cxp = cxp_bank_outflows
    pending_cxp = sum(p.balance_usd for p in p_query)

    # 3. Gastos Directos y de Oficina
    exp_q = db.query(Expense).filter(Expense.status == "aprobado")
    if df:
        exp_q = exp_q.filter(Expense.expense_date >= df)
    if dt:
        exp_q = exp_q.filter(Expense.expense_date <= dt)
    if account_id:
        exp_q = exp_q.filter(Expense.financial_account_id == account_id)
    all_expenses = exp_q.all()
    total_direct_expenses = sum(e.amount_usd for e in all_expenses)

    # 4. Retiros Personales de Socios / Dueños
    part_q = db.query(PartnerWithdrawal)
    if df:
        part_q = part_q.filter(PartnerWithdrawal.withdrawal_date >= df)
    if dt:
        part_q = part_q.filter(PartnerWithdrawal.withdrawal_date <= dt)
    if account_id:
        part_q = part_q.filter(PartnerWithdrawal.financial_account_id == account_id)
    partner_withdrawals = part_q.order_by(PartnerWithdrawal.withdrawal_date.desc()).all()
    total_partner_withdrawals = sum(pw.amount_usd for pw in partner_withdrawals)

    # 4.1 Mesa de Cambio / Arbitraje Cambiario (Diferencial Cambiario Real)
    exch_q = db.query(FinancialPayment).filter(
        FinancialPayment.payment_type.in_(["cambio_divisa_egreso", "cambio_divisa_ingreso"])
    )
    if df:
        exch_q = exch_q.filter(FinancialPayment.payment_date >= df)
    if dt:
        exch_q = exch_q.filter(FinancialPayment.payment_date <= dt)
    if account_id:
        if acc_name_tag:
            exch_q = exch_q.filter((FinancialPayment.financial_account_id == account_id) | (FinancialPayment.bank_account.ilike(f"%{acc_name_tag}%")))
        else:
            exch_q = exch_q.filter(FinancialPayment.financial_account_id == account_id)
    exchange_payments = exch_q.all()
    total_exchange_egresos = sum(p.amount_usd for p in exchange_payments if p.payment_type == "cambio_divisa_egreso")
    total_exchange_ingresos = sum(p.amount_usd for p in exchange_payments if p.payment_type == "cambio_divisa_ingreso")
    net_exchange_diff = round(total_exchange_ingresos - total_exchange_egresos, 2)

    # 5. Presupuesto Mensual de Gastos Fijos (Punto de Equilibrio / Break-Even)
    fixed_settings = db.query(FixedExpenseSetting).filter(FixedExpenseSetting.is_active == True).all()
    monthly_fixed_budget = sum(fs.monthly_amount_usd for fs in fixed_settings)
    if monthly_fixed_budget == 0:
        monthly_fixed_budget = 5000.0

    # 6. Saldo Líquido Real en Caja / Bancos Disponible (incluye diferencial cambiario de mesa de cambio)
    net_operating_cash = total_collected_cxc - cxp_bank_outflows - total_direct_expenses - total_partner_withdrawals + net_exchange_diff

    # 7. Ganancia Neta Devengada (Utilidad de Obras - Gastos Generales - Retiros + Diferencial Cambiario)
    net_accrual_profit = total_invoiced_cxc - total_invoiced_cxp - total_direct_expenses + net_exchange_diff
    net_margin_pct = round((net_accrual_profit / total_invoiced_cxc * 100), 1) if total_invoiced_cxc > 0 else 0.0

    # Cobertura de Gastos Fijos (Punto de Equilibrio del mes)
    fixed_overhead_covered_pct = min(100, round((net_accrual_profit / monthly_fixed_budget) * 100)) if monthly_fixed_budget > 0 and net_accrual_profit > 0 else 0

    # 8. Estado de Resultados (P&L) Limpio Obra por Obra - Eager load client to eliminate N+1
    projects = db.query(Project).options(joinedload(Project.client)).filter(Project.is_active == True).all()
    projects_pnl = []
    total_contracted = 0.0

    for proj in projects:
        total_contracted += proj.contract_amount_usd
        
        # Facturado y Cobrado del proyecto
        proj_receivables = [r for r in r_query if r.project_id == proj.id]
        p_invoiced = sum(r.amount_usd for r in proj_receivables)
        p_collected = sum(r.paid_amount_usd for r in proj_receivables)
        
        # Costos Directos Limpios de la Obra (Gastos directos + CxP de materiales imputables)
        proj_expenses = [e for e in all_expenses if e.project_id == proj.id]
        p_exp_cost = sum(e.amount_usd for e in proj_expenses)
        
        proj_payables = [p for p in p_query if p.project_id == proj.id]
        p_cxp_cost = sum(p.amount_usd for p in proj_payables)
        
        total_p_cost = p_exp_cost + p_cxp_cost
        
        # Ganancia neta del proyecto limpio
        p_revenue = p_invoiced if p_invoiced > 0 else proj.contract_amount_usd
        net_profit = p_revenue - total_p_cost
        margin_pct = round((net_profit / p_revenue * 100), 1) if p_revenue > 0 else 0.0
        cpi = round((p_revenue / total_p_cost), 2) if total_p_cost > 0 else 1.0

        projects_pnl.append({
            "id": proj.id,
            "code": proj.code,
            "name": proj.name,
            "client_id": proj.client_id,
            "client_name": proj.client.name if proj.client else proj.client_name,
            "contract_amount_usd": proj.contract_amount_usd,
            "invoiced_cxc_usd": p_invoiced,
            "collected_cxc_usd": p_collected,
            "direct_expenses_usd": p_exp_cost,
            "materials_cxp_usd": p_cxp_cost,
            "total_cost_usd": total_p_cost,
            "net_profit_usd": round(net_profit, 2),
            "net_margin_percent": margin_pct,
            "cpi_efficiency": cpi
        })

    # 9. Alertas Financieras
    alerts = []
    now = datetime.utcnow()
    for r in r_query:
        if r.status != "cobrado_total" and r.due_date < now and r.balance_usd > 0:
            alerts.append({
                "type": "cxc_overdue",
                "title": f"Factura {r.invoice_number} en Mora",
                "message": f"Cliente {r.client.name if r.client else 'General'} adeuda ${r.balance_usd:,.2f} vencida el {r.due_date.strftime('%d/%m/%Y')}.",
                "level": "danger"
            })

    for p in p_query:
        if p.status != "pagado_total" and p.due_date < now and p.balance_usd > 0:
            alerts.append({
                "type": "cxp_overdue",
                "title": f"Factura Proveedor {p.invoice_number} Vencida",
                "message": f"Deuda con {p.supplier_name} por ${p.balance_usd:,.2f} venció el {p.due_date.strftime('%d/%m/%Y')}.",
                "level": "warning"
            })

    # Resumen de Retiros por Socio
    partners_summary = {}
    for pw in partner_withdrawals:
        if pw.partner_name not in partners_summary:
            partners_summary[pw.partner_name] = 0.0
        partners_summary[pw.partner_name] += pw.amount_usd

    # 9. Retenciones Fiscales (Pasivo Acumulado por Enterar al SENIAT)
    total_withheld_iva = sum(p.tax_withholding_usd for p in p_query if p.is_withholding_applied and p.tax_withholding_usd)
    total_withheld_islr = sum(p.islr_withholding_usd for p in p_query if p.islr_withholding_usd)
    paid_seniat_iva = sum(e.amount_usd for e in all_expenses if e.category and 'seniat iva' in e.category.name.lower())
    paid_seniat_islr = sum(e.amount_usd for e in all_expenses if e.category and 'seniat islr' in e.category.name.lower())
    pending_seniat_iva = max(0.0, round(total_withheld_iva - paid_seniat_iva, 2))
    pending_seniat_islr = max(0.0, round(total_withheld_islr - paid_seniat_islr, 2))
    total_pending_tax_withholdings = round(pending_seniat_iva + pending_seniat_islr, 2)

    kpis_data = {
            "total_contracted_usd": total_contracted,
            "total_invoiced_cxc_usd": round(total_invoiced_cxc, 2),
            "total_collected_cxc_usd": round(total_collected_cxc, 2),
            "pending_cxc_usd": round(pending_cxc, 2),
            "total_invoiced_cxp_usd": round(total_invoiced_cxp, 2),
            "total_paid_cxp_usd": round(total_paid_cxp, 2),
            "pending_cxp_usd": round(pending_cxp, 2),
            "total_direct_expenses_usd": round(total_direct_expenses, 2),
            "total_partner_withdrawals_usd": round(total_partner_withdrawals, 2),
            "monthly_fixed_budget_usd": round(monthly_fixed_budget, 2),
            "fixed_overhead_covered_percent": fixed_overhead_covered_pct,
            "net_operating_cash_usd": round(net_operating_cash, 2),
            "net_accrual_profit_usd": round(net_accrual_profit, 2),
            "net_margin_percent": net_margin_pct,
            "net_exchange_diff_usd": net_exchange_diff,
            "total_exchange_egresos_usd": round(total_exchange_egresos, 2),
            "total_exchange_ingresos_usd": round(total_exchange_ingresos, 2),
            "total_exchanges_count": len(set(p.voucher_number for p in exchange_payments if p.voucher_number)),
            "total_withheld_iva_usd": round(total_withheld_iva, 2),
            "total_withheld_islr_usd": round(total_withheld_islr, 2),
            "paid_seniat_iva_usd": round(paid_seniat_iva, 2),
            "paid_seniat_islr_usd": round(paid_seniat_islr, 2),
            "pending_seniat_iva_usd": pending_seniat_iva,
            "pending_seniat_islr_usd": pending_seniat_islr,
            "total_pending_tax_withholdings_usd": total_pending_tax_withholdings
    }
    return {
        **kpis_data,
        "kpis": kpis_data,
        "partners_breakdown": [{"partner": k, "total_usd": round(v, 2)} for k, v in partners_summary.items()],
        "projects_pnl": projects_pnl,
        "alerts": alerts
    }

# ------------------------------------------------------------------------------
# 2. ENDPOINTS DE RETIROS DE SOCIOS (BLINDAJE DE CAJA)
# ------------------------------------------------------------------------------

@router.post("/direct-collection")
def direct_client_collection(p_in: DirectCollectionCreate, db: Session = Depends(get_db)):
    if p_in.amount_usd <= 0:
        raise HTTPException(status_code=400, detail="El monto del cobro debe ser mayor a cero.")
    
    rate = p_in.exchange_rate or 800.0
    amount_bs = round(p_in.amount_usd * rate, 2)
    ref_num = p_in.reference_number or f"COB-{int(datetime.utcnow().timestamp())}"
    
    acc_obj = db.query(FinancialAccount).filter(FinancialAccount.id == p_in.financial_account_id).first() if p_in.financial_account_id else None
    bank_acc_str = acc_obj.name if acc_obj else (p_in.payment_method or "banesco_usd")
    
    # 1. Buscar facturas/valuaciones pendientes de este cliente (y proyecto si aplica)
    query = db.query(AccountReceivable).filter(
        AccountReceivable.client_id == p_in.client_id,
        AccountReceivable.balance_usd > 0.01
    )
    if p_in.project_id:
        query = query.filter(AccountReceivable.project_id == p_in.project_id)
    
    open_receivables = query.order_by(AccountReceivable.due_date.asc(), AccountReceivable.id.asc()).all()

    # Si se especificó un proyecto pero no tiene facturas con saldo pendiente, crear anticipo formal de obra
    if p_in.project_id and not open_receivables:
        proj = db.query(Project).filter(Project.id == p_in.project_id).first()
        proj_code = proj.code if proj else f"PRJ-{p_in.project_id}"
        count_ant = db.query(AccountReceivable).filter(AccountReceivable.invoice_number.like(f"ANT-{proj_code}%")).count()
        inv_code = f"ANT-{proj_code}-{count_ant + 1:02d}"
        proj_rec = AccountReceivable(
            project_id=p_in.project_id,
            client_id=p_in.client_id,
            invoice_number=inv_code,
            description=f"Anticipo Obra: {p_in.concept or (proj.name if proj else 'Obra')}",
            issue_date=datetime.utcnow(),
            due_date=datetime.utcnow(),
            taxable_base_usd=p_in.amount_usd,
            amount_usd=p_in.amount_usd,
            paid_amount_usd=p_in.amount_usd,
            balance_usd=0.0,
            net_amount_usd=p_in.amount_usd,
            status="cobrado_total"
        )
        db.add(proj_rec)
        db.flush()
        
        payment = FinancialPayment(
            payment_type="cxc_cobro",
            receivable_id=proj_rec.id,
            financial_account_id=p_in.financial_account_id,
            bank_account=bank_acc_str,
            amount_usd=p_in.amount_usd,
            amount_bs=round(p_in.amount_usd * rate, 2),
            exchange_rate=rate,
            payment_method=p_in.payment_method or "transferencia",
            voucher_number=ref_num,
            reference_number=ref_num,
            notes=p_in.notes or p_in.concept or "Anticipo de obra aplicado"
        )
        db.add(payment)
        db.commit()
        return {
            "success": True,
            "message": f"Anticipo de Obra [{proj_code}] por ${p_in.amount_usd:,.2f} USD registrado con éxito.",
            "receipt_number": ref_num
        }

    remaining_to_apply = p_in.amount_usd
    applied_to_any = False
    
    for r in open_receivables:
        if remaining_to_apply <= 0.001:
            break
        
        apply_amount = min(remaining_to_apply, r.balance_usd)
        payment = FinancialPayment(
            payment_type="cxc_cobro",
            receivable_id=r.id,
            financial_account_id=p_in.financial_account_id,
            bank_account=bank_acc_str,
            amount_usd=apply_amount,
            amount_bs=round(apply_amount * rate, 2),
            exchange_rate=rate,
            payment_method=p_in.payment_method or "transferencia",
            voucher_number=ref_num,
            reference_number=ref_num,
            notes=p_in.notes or p_in.concept or "Cobro directo aplicado"
        )
        db.add(payment)
        
        r.paid_amount_usd += apply_amount
        r.balance_usd = max(0.0, round(r.balance_usd - apply_amount, 2))
        if r.balance_usd <= 0.01:
            r.status = "cobrado_total"
        else:
            r.status = "abono_parcial"
            
        remaining_to_apply = round(remaining_to_apply - apply_amount, 2)
        applied_to_any = True

    # Si sobra monto o no había facturas pendientes, crear anticipo libre formal para el cliente
    if remaining_to_apply > 0.01 or not applied_to_any:
        ant_amount = remaining_to_apply if applied_to_any else p_in.amount_usd
        client_tag = f"CLI-{p_in.client_id}"
        count_ant = db.query(AccountReceivable).filter(AccountReceivable.invoice_number.like(f"ANT-{client_tag}%")).count()
        inv_code = f"ANT-{client_tag}-{count_ant + 1:02d}"
        
        adv_rec = AccountReceivable(
            client_id=p_in.client_id,
            project_id=p_in.project_id,
            invoice_number=inv_code,
            description=f"Anticipo Cliente: {p_in.concept or 'Abono libre en cuenta'}",
            issue_date=datetime.utcnow(),
            due_date=datetime.utcnow(),
            taxable_base_usd=ant_amount,
            amount_usd=ant_amount,
            paid_amount_usd=ant_amount,
            balance_usd=0.0,
            net_amount_usd=ant_amount,
            status="cobrado_total"
        )
        db.add(adv_rec)
        db.flush()

        adv_payment = FinancialPayment(
            payment_type="cxc_anticipo",
            receivable_id=adv_rec.id,
            financial_account_id=p_in.financial_account_id,
            bank_account=bank_acc_str,
            amount_usd=ant_amount,
            amount_bs=round(ant_amount * rate, 2),
            exchange_rate=rate,
            payment_method=p_in.payment_method or "transferencia",
            voucher_number=ref_num,
            reference_number=ref_num,
            notes=f"[ANTICIPO CLIENTE] {p_in.notes or p_in.concept or ''}".strip()
        )
        db.add(adv_payment)
    
    db.commit()
    return {
        "success": True,
        "message": f"Cobro / Abono de ${p_in.amount_usd:,.2f} USD registrado con éxito.",
        "receipt_number": ref_num
    }

@router.get("/partners/withdrawals", dependencies=[Depends(require_roles(["director_general", "administrador_financiero"]))])
@router.get("/withdrawals", dependencies=[Depends(require_roles(["director_general", "administrador_financiero"]))])
def get_partner_withdrawals(db: Session = Depends(get_db)):
    rows = db.query(PartnerWithdrawal).order_by(PartnerWithdrawal.withdrawal_date.desc()).all()
    return [{
        "id": r.id,
        "partner_name": r.partner_name,
        "concept": r.concept,
        "amount_usd": r.amount_usd,
        "amount_bs": r.amount_bs,
        "exchange_rate": r.exchange_rate,
        "payment_method": r.payment_method,
        "reference_number": r.reference_number,
        "notes": r.notes,
        "date": r.withdrawal_date.strftime("%Y-%m-%d %H:%M") if r.withdrawal_date else ""
    } for r in rows]

@router.post("/partners/withdrawals", dependencies=[Depends(require_roles(["director_general"]))])
@router.post("/withdrawals", dependencies=[Depends(require_roles(["director_general"]))])
def create_partner_withdrawal(req: PartnerWithdrawalCreate, db: Session = Depends(get_db)):
    if req.amount_usd <= 0:
        raise HTTPException(status_code=400, detail="El monto del retiro debe ser mayor a cero.")

    ref_clean = (req.reference_number or "").strip()
    if ref_clean:
        existing_w = db.query(PartnerWithdrawal).filter(PartnerWithdrawal.reference_number == ref_clean).first()
        if existing_w:
            raise HTTPException(
                status_code=409,
                detail=f"Operación duplicada: El retiro con referencia '{ref_clean}' ya fue registrado previamente (Retiro #{existing_w.id} por ${existing_w.amount_usd:.2f})."
            )

    amount_bs = req.amount_usd * req.exchange_rate
    new_w = PartnerWithdrawal(
        partner_name=req.partner_name.strip(),
        concept=req.concept.strip(),
        amount_usd=req.amount_usd,
        amount_bs=amount_bs,
        exchange_rate=req.exchange_rate,
        payment_method=req.payment_method,
        reference_number=ref_clean,
        notes=req.notes
    )
    db.add(new_w)
    db.commit()
    db.refresh(new_w)
    return {"success": True, "message": f"Retiro de socio registrado por ${req.amount_usd:,.2f} USD.", "id": new_w.id}

@router.delete("/partners/withdrawals/{withdrawal_id}", dependencies=[Depends(require_roles(["director_general", "administrador_financiero"]))])
def delete_partner_withdrawal(withdrawal_id: int, db: Session = Depends(get_db)):
    w = db.query(PartnerWithdrawal).filter(PartnerWithdrawal.id == withdrawal_id).first()
    if not w:
        raise HTTPException(status_code=404, detail="Retiro de socio no encontrado.")
    db.delete(w)
    db.commit()
    return {"success": True, "message": f"Retiro #{withdrawal_id} anulado correctamente."}

# ------------------------------------------------------------------------------
# 3. ENDPOINTS DE CUENTAS POR COBRAR (CxC)
# ------------------------------------------------------------------------------
@router.get("/cxc")
def get_receivables(
    page: Optional[int] = Query(None, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    query = (
        db.query(AccountReceivable)
        .options(
            joinedload(AccountReceivable.client),
            joinedload(AccountReceivable.project),
            selectinload(AccountReceivable.payments)
        )
        .order_by(AccountReceivable.id.desc())
    )
    is_paginated = page is not None and isinstance(page, int)
    total = query.order_by(None).count() if is_paginated else None
    rows = query.offset((page - 1) * page_size).limit(page_size).all() if is_paginated else query.all()

    items = [{
        "id": r.id,
        "invoice_number": r.invoice_number,
        "client_name": r.client.name if r.client else "General",
        "client_rif": r.client.rif if r.client else "-",
        "project_name": r.project.name if r.project else "Sede Central",
        "project_code": r.project.code if r.project else "GEN",
        "description": r.description,
        "issue_date": r.issue_date.strftime("%Y-%m-%d"),
        "due_date": r.due_date.strftime("%Y-%m-%d"),
        "amount_usd": r.amount_usd,
        "taxable_base_usd": r.taxable_base_usd,
        "tax_amount_usd": r.tax_amount_usd,
        "tax_withholding_rate": r.tax_withholding_rate,
        "tax_withholding_usd": r.tax_withholding_usd,
        "islr_rate": r.islr_rate,
        "islr_withholding_usd": r.islr_withholding_usd,
        "net_amount_usd": r.net_amount_usd,
        "paid_amount_usd": r.paid_amount_usd,
        "balance_usd": r.balance_usd,
        "status": r.status,
        "tax_retained_usd": r.tax_retained_usd,
        "payments": [{
            "id": p.id,
            "payment_type": p.payment_type,
            "payment_method": p.payment_method,
            "amount_usd": p.amount_usd,
            "voucher_number": p.voucher_number or p.reference_number,
            "payment_date": p.payment_date.strftime("%d/%m/%Y"),
            "notes": p.notes
        } for p in r.payments]
    } for r in rows]

    if is_paginated:
        return {
            "items": items,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size if page_size > 0 else 1
        }
    return items

def compute_next_invoice_code(db: Session, current_year: int, prefix: str = "FAC") -> str:
    import re
    records = db.query(AccountReceivable.invoice_number).all()
    max_seq = 0
    pattern = re.compile(rf"{prefix}-{current_year}-(\d+)", re.IGNORECASE)
    for (inv_code,) in records:
        if inv_code:
            match = pattern.search(inv_code.strip())
            if match:
                try:
                    num = int(match.group(1))
                    if num > max_seq:
                        max_seq = num
                except ValueError:
                    pass
    return f"{prefix}-{current_year}-{(max_seq + 1):03d}"

@router.get("/next-invoice-code")
def get_next_invoice_code(prefix: str = "FAC", db: Session = Depends(get_db)):
    current_year = datetime.utcnow().year
    clean_prefix = "VAL" if prefix.upper().startswith("VAL") else "FAC"
    code = compute_next_invoice_code(db, current_year, clean_prefix)
    return {"next_code": code, "year": current_year, "prefix": clean_prefix}

@router.post("/cxc")
def create_receivable(r_in: ReceivableCreate, db: Session = Depends(get_db)):
    try:
        current_year = datetime.utcnow().year
        raw_inv = (r_in.invoice_number or "").strip()
        if not raw_inv:
            inv_number = compute_next_invoice_code(db, current_year, "FAC")
        else:
            existing = db.query(AccountReceivable).filter(AccountReceivable.invoice_number == raw_inv).first()
            if existing:
                base_inv = raw_inv
                count = db.query(AccountReceivable).filter(AccountReceivable.invoice_number.like(f"{base_inv}%")).count()
                inv_number = f"{base_inv}-{count+1:02d}"
            else:
                inv_number = raw_inv

        # Validación estricta: sólo se puede facturar si está asociado a un proyecto activo del cliente
        if not r_in.project_id:
            raise HTTPException(
                status_code=400,
                detail="No es posible facturar: Debe asociar un proyecto u obra registrada del cliente."
            )

        proj = db.query(Project).filter(Project.id == r_in.project_id).first()
        if not proj:
            raise HTTPException(status_code=404, detail="El proyecto imputable no existe.")
        if proj.client_id and proj.client_id != r_in.client_id:
            raise HTTPException(
                status_code=400,
                detail=f"Inconsistencia: La obra [{proj.code}] '{proj.name}' pertenece a otro cliente y no puede imputarse a este cliente."
            )

        # Las retenciones NO se predeterminan obligatoriamente; sólo se registran si el usuario o cliente las especifica explícitamente (> 0)
        base_usd = r_in.taxable_base_usd if (r_in.taxable_base_usd and r_in.taxable_base_usd > 0) else round(r_in.amount_usd / 1.16, 2)
        tax_usd = r_in.tax_amount_usd if (r_in.tax_amount_usd and r_in.tax_amount_usd > 0) else round(r_in.amount_usd - base_usd, 2)
        ret_iva_usd = r_in.tax_withholding_usd if (r_in.tax_withholding_usd and r_in.tax_withholding_usd > 0) else 0.0
        ret_islr_usd = r_in.islr_withholding_usd if (r_in.islr_withholding_usd and r_in.islr_withholding_usd > 0) else 0.0
        tot_ret_usd = r_in.tax_retained_usd if (r_in.tax_retained_usd and r_in.tax_retained_usd > 0) else (ret_iva_usd + ret_islr_usd)
        net_usd = r_in.net_amount_usd if (r_in.net_amount_usd and r_in.net_amount_usd > 0) else round(r_in.amount_usd - tot_ret_usd, 2)

        amount_bs = r_in.amount_usd * r_in.exchange_rate
        new_r = AccountReceivable(
            invoice_number=inv_number,
            client_id=r_in.client_id,
            project_id=r_in.project_id,
            description=r_in.description.strip(),
            due_date=r_in.due_date,
            taxable_base_usd=base_usd,
            tax_amount_usd=tax_usd,
            tax_withholding_rate=r_in.tax_withholding_rate or 75.0,
            tax_withholding_usd=ret_iva_usd,
            islr_rate=r_in.islr_rate or 2.0,
            islr_withholding_usd=ret_islr_usd,
            net_amount_usd=net_usd,
            amount_usd=r_in.amount_usd,
            amount_bs=amount_bs,
            exchange_rate=r_in.exchange_rate,
            tax_retained_usd=ret_iva_usd + ret_islr_usd,
            balance_usd=r_in.amount_usd,
            status="pendiente",
            notes=r_in.notes
        )
        db.add(new_r)
        db.commit()
        db.refresh(new_r)
        return {"success": True, "message": "Factura CxC registrada con éxito con retenciones SENIAT.", "id": new_r.id}
    except Exception as e:
        import traceback
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error en create_receivable: {str(e)} -> {traceback.format_exc()}")

@router.post("/cxc/{receivable_id}/payment")
def record_cxc_payment(receivable_id: int, p_in: PaymentCreate, db: Session = Depends(get_db)):
    r = db.query(AccountReceivable).filter(AccountReceivable.id == receivable_id).with_for_update().first()
    if not r:
        raise HTTPException(status_code=404, detail="Factura no encontrada.")

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

    payment = FinancialPayment(
        payment_type=p_in.payment_type or "cxc_cobro",
        receivable_id=r.id,
        amount_usd=p_in.amount_usd,
        amount_bs=p_in.amount_usd * p_in.exchange_rate,
        exchange_rate=p_in.exchange_rate,
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
    return {"success": True, "message": "Cobro / Comprobante aplicado con éxito.", "new_balance_usd": r.balance_usd, "status": r.status}

@router.post("/cxc/{receivable_id}/refund")
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

class BadDebtRequest(BaseModel):
    reason: str
    notes: Optional[str] = None

@router.post("/cxc/{receivable_id}/declare-bad-debt")
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
# 4. ENDPOINTS DE CUENTAS POR PAGAR (CxP PROVEEDORES)
# ------------------------------------------------------------------------------
# ------------------------------------------------------------------------------
# 4. ENDPOINTS DE CUENTAS POR PAGAR (CxP PROVEEDORES)
# ------------------------------------------------------------------------------
@router.get("/cxp")
def get_payables(
    page: Optional[int] = Query(None, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    search: Optional[str] = Query(None),
    doc_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    project_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    query = (
        db.query(AccountPayable)
        .options(
            joinedload(AccountPayable.project),
            selectinload(AccountPayable.payments)
        )
    )

    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        query = query.filter(
            func.lower(AccountPayable.supplier_name).like(term) |
            func.lower(AccountPayable.invoice_number).like(term) |
            func.lower(AccountPayable.control_number).like(term) |
            func.lower(AccountPayable.supplier_rif).like(term) |
            func.lower(AccountPayable.description).like(term) |
            func.lower(AccountPayable.withholding_voucher_number).like(term)
        )

    if doc_type and doc_type.strip() and doc_type != "all":
        query = query.filter(AccountPayable.doc_type == doc_type.strip())

    if project_id:
        query = query.filter(AccountPayable.project_id == project_id)

    if date_from and date_from.strip():
        try:
            df = datetime.strptime(date_from.strip(), "%Y-%m-%d")
            query = query.filter(AccountPayable.issue_date >= df)
        except Exception:
            pass

    if date_to and date_to.strip():
        try:
            dt = datetime.strptime(date_to.strip(), "%Y-%m-%d").replace(hour=23, minute=59, second=59)
            query = query.filter(AccountPayable.issue_date <= dt)
        except Exception:
            pass

    today = datetime.utcnow().date()

    if status and status.strip() and status != "all":
        st = status.strip().lower()
        if st in ["pagado", "pagado_total", "solvente"]:
            query = query.filter(AccountPayable.balance_usd <= 0.01)
        elif st in ["pendiente", "abierta"]:
            query = query.filter(AccountPayable.balance_usd > 0.01)
        elif st == "vencido":
            query = query.filter(AccountPayable.balance_usd > 0.01, AccountPayable.due_date < datetime.utcnow())
        elif st == "por_vencer":
            seven_days = datetime.utcnow() + timedelta(days=7)
            query = query.filter(AccountPayable.balance_usd > 0.01, AccountPayable.due_date >= datetime.utcnow(), AccountPayable.due_date <= seven_days)

    query = query.order_by(AccountPayable.id.desc())

    is_paginated = page is not None and isinstance(page, int)
    total = query.order_by(None).count() if is_paginated else None
    rows = query.offset((page - 1) * page_size).limit(page_size).all() if is_paginated else query.all()

    items = []
    for p in rows:
        due_d = p.due_date.date() if p.due_date else None
        days_diff = (today - due_d).days if due_d else 0
        
        if p.balance_usd <= 0.01:
            aging_status = "solventado"
        elif days_diff > 0:
            aging_status = "vencido"
        elif days_diff >= -7:
            aging_status = "por_vencer"
        else:
            aging_status = "al_dia"

        items.append({
            "id": p.id,
            "invoice_number": p.invoice_number,
            "control_number": p.control_number or "-",
            "supplier_name": p.supplier_name,
            "supplier_rif": p.supplier_rif or "-",
            "doc_type": p.doc_type or "factura",
            "project_id": p.project_id,
            "project_name": p.project.name if p.project else "Sede Central",
            "project_code": p.project.code if p.project else "SEDE",
            "payable_type": p.payable_type,
            "description": p.description,
            "issue_date": p.issue_date.strftime("%Y-%m-%d") if p.issue_date else "-",
            "due_date": p.due_date.strftime("%Y-%m-%d") if p.due_date else "-",
            "days_overdue": max(0, days_diff) if aging_status == "vencido" else 0,
            "aging_status": aging_status,
            "withholding_voucher_number": p.withholding_voucher_number,
            "withholding_voucher_date": p.withholding_voucher_date.strftime("%Y-%m-%d") if p.withholding_voucher_date else None,
            "is_withholding_applied": p.is_withholding_applied,
            "withholding_exempt_usd": p.withholding_exempt_usd or 0.0,
            "warehouse_movement_id": p.warehouse_movement_id,
            "warehouse_entry_ref": p.warehouse_entry_ref,
            "amount_usd": p.amount_usd,
            "amount_bs": p.amount_bs,
            "exchange_rate": p.exchange_rate,
            "taxable_base_usd": p.taxable_base_usd,
            "tax_amount_usd": p.tax_amount_usd,
            "tax_withholding_rate": p.tax_withholding_rate,
            "tax_withholding_usd": p.tax_withholding_usd,
            "islr_rate": p.islr_rate,
            "islr_withholding_usd": p.islr_withholding_usd,
            "net_amount_usd": p.net_amount_usd,
            "paid_amount_usd": p.paid_amount_usd,
            "balance_usd": p.balance_usd,
            "status": p.status,
            "payments": [{
                "id": pm.id,
                "payment_type": pm.payment_type,
                "payment_method": pm.payment_method,
                "bank_account": pm.bank_account or "banesco_usd",
                "amount_usd": pm.amount_usd,
                "amount_bs": pm.amount_bs,
                "voucher_number": pm.voucher_number or pm.reference_number,
                "payment_date": pm.payment_date.strftime("%d/%m/%Y") if pm.payment_date else "-",
                "notes": pm.notes
            } for pm in p.payments]
        })

    if is_paginated:
        return {
            "items": items,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size if page_size > 0 else 1
        }
    return items

@router.get("/unbilled-warehouse-entries")
def get_unbilled_warehouse_entries(db: Session = Depends(get_db)):
    """
    Retorna entradas físicas de almacén que no han sido vinculadas a una Cuenta por Pagar (CxP).
    """
    entries = db.query(MaterialMovement).options(
        joinedload(MaterialMovement.material),
        joinedload(MaterialMovement.project)
    ).filter(
        MaterialMovement.movement_type == "entrada"
    ).order_by(MaterialMovement.movement_date.desc()).limit(150).all()

    linked_ids = set(
        row[0] for row in db.query(AccountPayable.warehouse_movement_id).filter(
            AccountPayable.warehouse_movement_id.isnot(None)
        ).all()
    )

    unbilled = []
    for e in entries:
        if e.id not in linked_ids:
            unbilled.append({
                "id": e.id,
                "movement_date": e.movement_date.strftime("%Y-%m-%d %H:%M") if e.movement_date else "",
                "material_id": e.material_id,
                "material_name": e.material.name if e.material else "Material Desconocido",
                "unit_measure": e.material.unit_measure if e.material else "UND",
                "quantity": e.quantity,
                "unit_cost_usd": e.unit_cost_usd or 0.0,
                "total_cost_usd": e.total_cost_usd or round((e.quantity or 0) * (e.unit_cost_usd or 0), 2),
                "destination": e.destination or "Almacén Central Dalor",
                "reference_doc": e.reference_doc or f"ENTRADA-{e.id}",
                "project_id": e.project_id,
                "project_name": e.project.name if e.project else None
            })
    return unbilled

@router.post("/cxp")
def create_payable(p_in: PayableCreate, db: Session = Depends(get_db)):
    # --------------------------------------------------------------------------
    # REGLA DE AUDITORÍA: AMARRE OBLIGATORIO DE COMPRAS DE MERCANCÍA / CONSUMIBLES
    # --------------------------------------------------------------------------
    ptype = (p_in.payable_type or "").strip().lower()
    is_material_purchase = ptype in ["stock_almacen", "costo_material_obra", "compra_materiales"]

    created_mov_id = None
    created_mov_ref = None

    if is_material_purchase:
        # Opción A: Vinculación con entrada previa existente
        if p_in.warehouse_movement_id:
            mov = db.query(MaterialMovement).filter(
                MaterialMovement.id == p_in.warehouse_movement_id,
                MaterialMovement.movement_type == "entrada"
            ).first()
            if not mov:
                raise HTTPException(status_code=400, detail=f"La entrada de almacén #{p_in.warehouse_movement_id} no existe o no corresponde a una recepción válida.")
            created_mov_id = mov.id
            created_mov_ref = mov.reference_doc or f"REC-MAT-{mov.id}"

        # Opción B: Carga física simultánea de ítems recibidos
        elif p_in.material_items and len(p_in.material_items) > 0:
            for item in p_in.material_items:
                if item.quantity <= 0:
                    raise HTTPException(status_code=400, detail="La cantidad ingresada de cada material debe ser mayor a cero.")
                mat = db.query(Material).filter(Material.id == item.material_id).first()
                if not mat:
                    raise HTTPException(status_code=404, detail=f"Material #{item.material_id} no encontrado en catálogo.")

                mat.stock_quantity = (mat.stock_quantity or 0.0) + item.quantity
                if item.unit_cost_usd > 0:
                    mat.unit_cost_usd = item.unit_cost_usd
                mat.total_cost_usd = round(mat.stock_quantity * (mat.unit_cost_usd or 0.0), 2)

                dest = item.destination or ("Almacén Central Dalor" if ptype == "stock_almacen" else f"Proyecto #{p_in.project_id or 'General'}")
                ref_doc = p_in.invoice_number or p_in.control_number or f"REC-CXP-{int(datetime.utcnow().timestamp())}"

                new_mov = MaterialMovement(
                    material_id=mat.id,
                    movement_type="entrada",
                    quantity=item.quantity,
                    unit_cost_usd=item.unit_cost_usd,
                    total_cost_usd=round(item.quantity * item.unit_cost_usd, 2),
                    project_id=p_in.project_id if ptype == "costo_material_obra" else None,
                    destination=dest,
                    reference_doc=ref_doc,
                    notes=f"Entrada por compra a crédito según factura [{p_in.invoice_number}] de {p_in.supplier_name}",
                    performed_by="Finanzas / Almacén"
                )
                db.add(new_mov)
                db.flush()
                if not created_mov_id:
                    created_mov_id = new_mov.id
                    created_mov_ref = ref_doc
        else:
            raise HTTPException(
                status_code=400,
                detail="Por control de inventario y auditoría Dalor, toda Cuenta por Pagar por compra de mercancía o consumibles debe respaldarse obligatoriamente con una Entrada de Almacén previa o registrando los materiales recibidos."
            )

    doc = (p_in.doc_type or "factura").strip().lower()
    islr_r = 0.0
    ret_islr_usd = 0.0
    
    # 1. Caso Nota de Entrega Informal (Sin IVA, Sin Retención)
    if doc == "nota_entrega":
        base_usd = p_in.amount_usd
        tax_usd = 0.0
        ret_rate = 0.0
        ret_iva_usd = 0.0
        islr_r = 0.0
        ret_islr_usd = 0.0
        net_usd = p_in.amount_usd
        voucher_num = None
        voucher_date = None
        is_ret_applied = False
        init_paid = 0.0
        init_balance = p_in.amount_usd
    
    # 2. Caso Factura Contado en Sitio (Con IVA pagado al 100% de contado, Sin Retención de DALOR)
    elif doc == "factura_sin_retencion" or p_in.is_withholding_applied is False or (p_in.tax_withholding_rate or 0) <= 0:
        base_usd = p_in.taxable_base_usd if (p_in.taxable_base_usd and p_in.taxable_base_usd > 0) else round(p_in.amount_usd / 1.16, 2)
        tax_usd = p_in.tax_amount_usd if (p_in.tax_amount_usd and p_in.tax_amount_usd > 0) else round(p_in.amount_usd - base_usd, 2)
        ret_rate = 0.0
        ret_iva_usd = 0.0
        net_usd = p_in.amount_usd
        voucher_num = None
        voucher_date = None
        is_ret_applied = False
        init_paid = 0.0
        init_balance = p_in.amount_usd
        
    # 3. Caso Factura Fiscal SENIAT Estándar con Retención de IVA (75% / 100%)
    else:
        base_usd = p_in.taxable_base_usd if (p_in.taxable_base_usd and p_in.taxable_base_usd > 0) else round(p_in.amount_usd / 1.16, 2)
        tax_usd = p_in.tax_amount_usd if (p_in.tax_amount_usd and p_in.tax_amount_usd > 0) else round(p_in.amount_usd - base_usd, 2)
        ret_rate = p_in.tax_withholding_rate if p_in.tax_withholding_rate is not None else 75.0
        ret_iva_usd = p_in.tax_withholding_usd if (p_in.tax_withholding_usd and p_in.tax_withholding_usd > 0) else round(tax_usd * (ret_rate / 100.0), 2)
        islr_r = p_in.islr_rate if p_in.islr_rate is not None else 0.0
        ret_islr_usd = p_in.islr_withholding_usd if (p_in.islr_withholding_usd and p_in.islr_withholding_usd > 0) else (round(base_usd * (islr_r / 100.0), 2) if islr_r > 0 else 0.0)
        net_usd = round(p_in.amount_usd - ret_iva_usd - ret_islr_usd, 2)
        
        # Correlativo normativo SENIAT YYYYMM + 8 dígitos
        now = datetime.utcnow()
        prefix = now.strftime("%Y%m") # e.g. 202609
        latest_v = db.query(AccountPayable.withholding_voucher_number).filter(
            AccountPayable.withholding_voucher_number.like(f"{prefix}%")
        ).order_by(AccountPayable.withholding_voucher_number.desc()).first()
        
        if latest_v and latest_v[0]:
            try:
                seq = int(str(latest_v[0])[6:]) + 1
            except Exception:
                seq = 1
        else:
            seq = 1015 if prefix == "202609" else 1
            
        voucher_num = f"{prefix}{seq:08d}"
        voucher_date = now
        is_ret_applied = True
        init_paid = 0.0
        init_balance = net_usd

    amount_bs = round(p_in.amount_usd * p_in.exchange_rate, 2)
    
    new_p = AccountPayable(
        invoice_number=p_in.invoice_number.strip(),
        control_number=(p_in.control_number or "").strip() or None,
        supplier_name=p_in.supplier_name.strip(),
        supplier_rif=(p_in.supplier_rif or "").strip() or None,
        doc_type=doc,
        withholding_voucher_number=voucher_num,
        withholding_voucher_date=voucher_date,
        is_withholding_applied=is_ret_applied,
        withholding_exempt_usd=p_in.withholding_exempt_usd or 0.0,
        project_id=p_in.project_id,
        category_id=p_in.category_id,
        payable_type=p_in.payable_type,
        warehouse_movement_id=created_mov_id,
        warehouse_entry_ref=created_mov_ref,
        description=p_in.description.strip(),
        issue_date=p_in.issue_date or datetime.utcnow(),
        due_date=p_in.due_date,
        taxable_base_usd=base_usd,
        tax_amount_usd=tax_usd,
        tax_withholding_rate=ret_rate,
        tax_withholding_usd=ret_iva_usd,
        islr_rate=islr_r,
        islr_withholding_usd=ret_islr_usd,
        net_amount_usd=net_usd,
        amount_usd=p_in.amount_usd,
        amount_bs=amount_bs,
        exchange_rate=p_in.exchange_rate,
        paid_amount_usd=init_paid,
        balance_usd=init_balance,
        status="pagado_total" if init_balance <= 0.01 else "pendiente",
        notes=p_in.notes
    )
    db.add(new_p)
    db.flush()

    # Si se aplicó retención IVA, crear el movimiento fiscal de comprobante
    if is_ret_applied and ret_iva_usd > 0:
        ret_pay = FinancialPayment(
            payment_type="cxp_retencion_iva",
            payable_id=new_p.id,
            amount_usd=ret_iva_usd,
            amount_bs=round(ret_iva_usd * p_in.exchange_rate, 2),
            exchange_rate=p_in.exchange_rate,
            payment_method="retencion_iva",
            bank_account="fiscal_seniat",
            voucher_number=voucher_num,
            reference_number=voucher_num,
            notes=f"Comprobante de Retención de IVA {voucher_num} (Alícuota {ret_rate}%) emitido al proveedor."
        )
        db.add(ret_pay)

    # Si se aplicó retención ISLR, crear el movimiento fiscal de comprobante ISLR
    if ret_islr_usd > 0:
        ret_islr_pay = FinancialPayment(
            payment_type="cxp_retencion_islr",
            payable_id=new_p.id,
            amount_usd=ret_islr_usd,
            amount_bs=round(ret_islr_usd * p_in.exchange_rate, 2),
            exchange_rate=p_in.exchange_rate,
            payment_method="retencion_islr",
            bank_account="fiscal_seniat",
            voucher_number=f"ISLR-{voucher_num or new_p.id}",
            reference_number=f"ISLR-{voucher_num or new_p.id}",
            notes=f"Retención ISLR {islr_r}% ({new_p.supplier_name})"
        )
        db.add(ret_islr_pay)

    # Auditoría
    audit = AuditLog(
        username="Finanzas",
        module="cuentas_por_pagar",
        action="crear_cuenta_por_pagar",
        details=f"Factura/Nota {new_p.invoice_number} de '{new_p.supplier_name}' registrada por ${new_p.amount_usd:.2f} USD. Modalidad: {doc}. Comprobante: {voucher_num or 'N/A'}."
    )
    db.add(audit)
    db.commit()
    db.refresh(new_p)

    return {
        "success": True,
        "message": f"Cuenta por pagar {new_p.invoice_number} registrada exitosamente.",
        "id": new_p.id,
        "withholding_voucher_number": voucher_num,
        "net_balance_usd": new_p.balance_usd,
        "warehouse_movement_id": new_p.warehouse_movement_id,
        "warehouse_entry_ref": new_p.warehouse_entry_ref
    }

@router.get("/cxp/{payable_id}/withholding-voucher")
def get_payable_withholding_voucher(payable_id: int, db: Session = Depends(get_db)):
    p = db.query(AccountPayable).filter(AccountPayable.id == payable_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Factura o cuenta por pagar no encontrada.")

    # Datos oficiales del comprobante SENIAT
    v_date = p.withholding_voucher_date or p.issue_date or datetime.utcnow()
    period_fiscal = v_date.strftime("%Y-%m")
    v_num = p.withholding_voucher_number or f"{v_date.strftime('%Y%m')}00000001"

    rate_bcv = p.exchange_rate or 850.0
    base_bs = round(p.taxable_base_usd * rate_bcv, 2)
    tax_bs = round(p.tax_amount_usd * rate_bcv, 2)
    ret_bs = round(p.tax_withholding_usd * rate_bcv, 2)
    total_bs = round(p.amount_usd * rate_bcv, 2)
    net_bs = round(p.net_amount_usd * rate_bcv, 2)
    exempt_bs = round((p.withholding_exempt_usd or 0.0) * rate_bcv, 2)

    return {
        "success": True,
        "voucher": {
            "voucher_number": v_num,
            "voucher_date": v_date.strftime("%d/%m/%Y"),
            "fiscal_period": period_fiscal,
            "agent": {
                "name": "METALMECANICA DALOR, C.A.",
                "rif": "J-31601195-0",
                "address": "AV CAMARA DE LAS INDUSTRIAS LOCAL GALPON NRO 10 ZONA INDUSTRIAL EL TIGRE GUACARA CARABOBO",
                "email": "metalmecanicadalorca@yahoo.com",
                "legal_base": "Providencia Administrativa SNAT/2015/0049 de fecha 17/07/2015, publicada en Gaceta Oficial N° 40.720 del 10/08/2015."
            },
            "supplier": {
                "name": p.supplier_name,
                "rif": p.supplier_rif or "J-00000000-0"
            },
            "invoice": {
                "invoice_date": p.issue_date.strftime("%d/%m/%Y") if p.issue_date else v_date.strftime("%d/%m/%Y"),
                "invoice_number": p.invoice_number,
                "control_number": p.control_number or p.invoice_number,
                "transaction_type": "01-Reg",
                "total_usd": p.amount_usd,
                "total_bs": total_bs,
                "exempt_usd": p.withholding_exempt_usd or 0.0,
                "exempt_bs": exempt_bs,
                "base_usd": p.taxable_base_usd,
                "base_bs": base_bs,
                "tax_rate_pct": 16.0,
                "tax_usd": p.tax_amount_usd,
                "tax_bs": tax_bs,
                "withholding_rate_pct": p.tax_withholding_rate or 75.0,
                "withholding_usd": p.tax_withholding_usd,
                "withholding_bs": ret_bs,
                "net_payable_usd": p.net_amount_usd,
                "net_payable_bs": net_bs,
                "exchange_rate": rate_bcv
            }
        }
    }

@router.get("/cxp/{payable_id}/islr-withholding-voucher")
def get_payable_islr_withholding_voucher(payable_id: int, db: Session = Depends(get_db)):
    p = db.query(AccountPayable).filter(AccountPayable.id == payable_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Factura o cuenta por pagar no encontrada.")

    v_date = p.withholding_voucher_date or p.issue_date or datetime.utcnow()
    period_fiscal = v_date.strftime("%Y-%m")
    v_num = f"ISLR-{v_date.strftime('%Y%m')}{p.id:04d}"

    rate_bcv = p.exchange_rate or 850.0
    base_usd = p.taxable_base_usd if (p.taxable_base_usd and p.taxable_base_usd > 0) else round(p.amount_usd / 1.16, 2)
    base_bs = round(base_usd * rate_bcv, 2)
    
    islr_rate = p.islr_rate if p.islr_rate is not None else 2.0
    islr_usd = p.islr_withholding_usd if (p.islr_withholding_usd and p.islr_withholding_usd > 0) else round(base_usd * (islr_rate / 100.0), 2)
    islr_bs = round(islr_usd * rate_bcv, 2)
    
    total_bs = round(p.amount_usd * rate_bcv, 2)
    tax_bs = round((p.tax_amount_usd or (p.amount_usd - base_usd)) * rate_bcv, 2)
    net_bs = round(total_bs - islr_bs - round((p.tax_withholding_usd or 0.0) * rate_bcv, 2), 2)

    return {
        "success": True,
        "voucher": {
            "voucher_number": v_num,
            "voucher_date": v_date.strftime("%d/%m/%Y"),
            "fiscal_period": period_fiscal,
            "legal_base": "Decreto N° 1.808 - Reglamento Parcial de la Ley de Impuesto Sobre la Renta en Materia de Retenciones (G.O. N° 36.203 del 12/05/1997).",
            "agent": {
                "name": "METALMECANICA DALOR, C.A.",
                "rif": "J-31601195-0",
                "address": "AV CAMARA DE LAS INDUSTRIAS LOCAL GALPON NRO 10 ZONA INDUSTRIAL EL TIGRE GUACARA CARABOBO",
                "email": "metalmecanicadalorca@yahoo.com"
            },
            "supplier": {
                "name": p.supplier_name,
                "rif": p.supplier_rif or "J-00000000-0"
            },
            "invoice": {
                "invoice_date": p.issue_date.strftime("%d/%m/%Y") if p.issue_date else v_date.strftime("%d/%m/%Y"),
                "invoice_number": p.invoice_number or f"FAC-{p.id}",
                "control_number": p.control_number or p.invoice_number or f"00-{p.id}",
                "concept": p.description or "Servicios / Suministros Comerciales e Industriales",
                "concept_code": "054" if islr_rate == 2.0 else "001",
                "total_usd": p.amount_usd,
                "total_bs": total_bs,
                "base_usd": base_usd,
                "base_bs": base_bs,
                "tax_bs": tax_bs,
                "islr_rate_pct": islr_rate,
                "islr_withholding_usd": islr_usd,
                "islr_withholding_bs": islr_bs,
                "net_payable_bs": net_bs,
                "exchange_rate": rate_bcv
            }
        }
    }

@router.put("/cxp/{payable_id}")
def update_payable(payable_id: int, p_in: PayableUpdate, db: Session = Depends(get_db)):
    p = db.query(AccountPayable).filter(AccountPayable.id == payable_id).with_for_update().first()
    if not p:
        raise HTTPException(status_code=404, detail="Cuenta por pagar no encontrada.")

    # Solo permitir editar si no se han hecho pagos bancarios definitivos
    bank_pays = [pm for pm in p.payments if pm.payment_method not in ["retencion_iva", "retencion_islr"]]
    if bank_pays:
        raise HTTPException(status_code=400, detail="No se puede modificar una factura que ya posee pagos bancarios ejecutados. Debe anular primero los pagos si desea corregirla.")

    if p_in.supplier_name is not None: p.supplier_name = p_in.supplier_name.strip()
    if p_in.supplier_rif is not None: p.supplier_rif = p_in.supplier_rif.strip()
    if p_in.invoice_number is not None: p.invoice_number = p_in.invoice_number.strip()
    if p_in.control_number is not None: p.control_number = p_in.control_number.strip()
    if p_in.description is not None: p.description = p_in.description.strip()
    if p_in.due_date is not None: p.due_date = p_in.due_date
    if p_in.notes is not None: p.notes = p_in.notes
    if p_in.doc_type is not None: p.doc_type = p_in.doc_type.strip().lower()
    if p_in.withholding_voucher_number is not None: p.withholding_voucher_number = p_in.withholding_voucher_number.strip()

    if p_in.exchange_rate is not None and p_in.exchange_rate > 0:
        p.exchange_rate = p_in.exchange_rate

    if p_in.amount_usd is not None and p_in.amount_usd > 0:
        p.amount_usd = p_in.amount_usd
    
    p.amount_bs = round(p.amount_usd * p.exchange_rate, 2)

    if p_in.tax_withholding_rate is not None:
        p.tax_withholding_rate = p_in.tax_withholding_rate

    if p.doc_type == "factura" and p.tax_withholding_rate and p.tax_withholding_rate > 0:
        base_usd = p_in.taxable_base_usd if (p_in.taxable_base_usd is not None and p_in.taxable_base_usd > 0) else round(p.amount_usd / 1.16, 2)
        tax_usd = p_in.tax_amount_usd if (p_in.tax_amount_usd is not None and p_in.tax_amount_usd > 0) else round(p.amount_usd - base_usd, 2)
        ret_usd = p_in.tax_withholding_usd if (p_in.tax_withholding_usd is not None and p_in.tax_withholding_usd > 0) else round(tax_usd * (p.tax_withholding_rate / 100.0), 2)
        net_usd = round(p.amount_usd - ret_usd, 2)

        p.taxable_base_usd = base_usd
        p.tax_amount_usd = tax_usd
        p.tax_withholding_usd = ret_usd
        p.net_amount_usd = net_usd
        p.paid_amount_usd = 0.0
        p.balance_usd = net_usd
        p.is_withholding_applied = True

        # Actualizar pago de retención
        ret_pay = db.query(FinancialPayment).filter(
            FinancialPayment.payable_id == p.id,
            FinancialPayment.payment_method == "retencion_iva"
        ).first()
        if ret_pay:
            ret_pay.amount_usd = ret_usd
            ret_pay.amount_bs = round(ret_usd * p.exchange_rate, 2)
            ret_pay.exchange_rate = p.exchange_rate
            if p.withholding_voucher_number:
                ret_pay.voucher_number = p.withholding_voucher_number
                ret_pay.reference_number = p.withholding_voucher_number
        elif ret_usd > 0:
            now = datetime.utcnow()
            v_num = p.withholding_voucher_number or f"{now.strftime('%Y%m')}00001015"
            p.withholding_voucher_number = v_num
            p.withholding_voucher_date = now
            db.add(FinancialPayment(
                payment_type="cxp_retencion_iva",
                payable_id=p.id,
                amount_usd=ret_usd,
                amount_bs=round(ret_usd * p.exchange_rate, 2),
                exchange_rate=p.exchange_rate,
                payment_method="retencion_iva",
                bank_account="fiscal_seniat",
                voucher_number=v_num,
                reference_number=v_num,
                notes=f"Comprobante de Retención de IVA {v_num} reajustado."
            ))
    else:
        # Sin retención
        p.tax_withholding_rate = 0.0
        p.tax_withholding_usd = 0.0
        p.net_amount_usd = p.amount_usd
        p.paid_amount_usd = 0.0
        p.balance_usd = p.amount_usd
        p.is_withholding_applied = False
        db.query(FinancialPayment).filter(
            FinancialPayment.payable_id == p.id,
            FinancialPayment.payment_method == "retencion_iva"
        ).delete(synchronize_session=False)

    p.status = "pagado_total" if p.balance_usd <= 0.01 else "pendiente"

    audit = AuditLog(
        username="Finanzas",
        module="cuentas_por_pagar",
        action="modificar_cuenta_por_pagar",
        details=f"Factura {p.invoice_number} modificada. Nuevo saldo: ${p.balance_usd:.2f} USD."
    )
    db.add(audit)
    db.commit()
    db.refresh(p)
    return {"success": True, "message": "Factura actualizada exitosamente.", "id": p.id, "balance_usd": p.balance_usd}

@router.delete("/cxp/{payable_id}")
def delete_payable(payable_id: int, db: Session = Depends(get_db)):
    p = db.query(AccountPayable).filter(AccountPayable.id == payable_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Cuenta por pagar no encontrada.")

    bank_pays = [pm for pm in (p.payments or []) if pm.payment_method != "retencion_iva"]
    if bank_pays:
        raise HTTPException(status_code=400, detail="No se puede eliminar una factura que tiene pagos bancarios registrados. Anule primero los pagos.")

    inv_num = p.invoice_number
    supp = p.supplier_name
    db.delete(p)

    audit = AuditLog(
        username="Finanzas",
        module="cuentas_por_pagar",
        action="anular_cuenta_por_pagar",
        details=f"Cuenta por pagar {inv_num} de '{supp}' fue anulada y eliminada del sistema."
    )
    db.add(audit)
    db.commit()
    return {"success": True, "message": f"Factura {inv_num} eliminada y anulada con éxito."}

@router.post("/cxp/{payable_id}/payment")
def record_cxp_payment(payable_id: int, p_in: PaymentCreate, db: Session = Depends(get_db)):
    p = db.query(AccountPayable).filter(AccountPayable.id == payable_id).with_for_update().first()
    if not p:
        raise HTTPException(status_code=404, detail="Deuda no encontrada.")

    if p_in.amount_usd <= 0:
        raise HTTPException(status_code=400, detail="El monto del pago debe ser mayor a cero.")

    if p_in.amount_usd > (p.balance_usd + 0.05):
        raise HTTPException(status_code=400, detail=f"El pago (${p_in.amount_usd:.2f}) supera el saldo pendiente (${p.balance_usd:.2f}).")

    ref_clean = (p_in.reference_number or p_in.voucher_number or "").strip()
    if ref_clean:
        existing_pay = db.query(FinancialPayment).filter(
            FinancialPayment.payable_id == payable_id,
            (FinancialPayment.reference_number == ref_clean) | (FinancialPayment.voucher_number == ref_clean)
        ).first()
        if existing_pay:
            raise HTTPException(
                status_code=409,
                detail=f"Operación duplicada: El pago con referencia '{ref_clean}' ya fue procesado para esta deuda (Pago #{existing_pay.id} por ${existing_pay.amount_usd:.2f})."
            )

    b_acc = p_in.bank_account or "banesco_usd"
    amount_bs = round(p_in.amount_usd * p_in.exchange_rate, 2)
    payment = FinancialPayment(
        payment_type="cxp_pago",  # SIEMPRE forzado a cxp_pago independientemente del payload
        payable_id=p.id,

        amount_usd=round(p_in.amount_usd, 2),
        amount_bs=amount_bs,
        exchange_rate=p_in.exchange_rate,
        payment_method=p_in.payment_method,
        bank_account=b_acc,
        voucher_number=p_in.voucher_number or p_in.reference_number,
        reference_number=p_in.reference_number,
        notes=p_in.notes
    )
    db.add(payment)

    p.paid_amount_usd = round(p.paid_amount_usd + p_in.amount_usd, 2)
    p.balance_usd = max(0.0, round(p.balance_usd - p_in.amount_usd, 2))
    if p.balance_usd <= 0.01:
        p.status = "pagado_total"
    else:
        p.status = "abono_parcial"

    audit = AuditLog(
        username="Finanzas",
        module="cuentas_por_pagar",
        action="registrar_pago_cxp",
        details=f"Abono de ${p_in.amount_usd:.2f} USD a '{p.supplier_name}' (Factura {p.invoice_number}) desde cuenta '{b_acc}'. Ref: {ref_clean}. Nuevo Saldo: ${p.balance_usd:.2f} USD."
    )
    db.add(audit)
    db.commit()
    return {"success": True, "message": "Pago aplicado con éxito.", "new_balance_usd": p.balance_usd, "status": p.status}

# ------------------------------------------------------------------------------
# ------------------------------------------------------------------------------
# 5. COTIZACIÓN OFICIAL BCV (SCRAPING AUTOMATIZADO CON FAIL-SAFE EN 4 CAPAS)
# ------------------------------------------------------------------------------
@router.get("/bcv-rate")
@router.get("/bcv-rate/")
@router.get("/exchange-rate")
@router.get("/exchange-rate/")
def get_bcv_rate(force_refresh: bool = False):
    from app.services.bcv_scraper import BCVExchangeRateService
    rate_info = BCVExchangeRateService.get_current_rate(force_refresh=force_refresh)
    return rate_info

@router.post("/bcv-rate/sync")
@router.post("/bcv-rate/sync/")
def sync_bcv_rate():
    from app.services.bcv_scraper import BCVExchangeRateService
    rate_info = BCVExchangeRateService.get_current_rate(force_refresh=True)
    return {
        "success": True,
        "message": f"Tasa BCV sincronizada exitosamente: {rate_info.get('formatted_rate')} Bs/$ ({rate_info.get('source')})",
        "data": rate_info
    }

@router.get("/bcv-rates/history")
@router.get("/bcv-rate/history")
def get_bcv_rate_history(limit: int = Query(60), db: Session = Depends(get_db)):
    """
    Retorna el historial cronológico de tasas oficiales BCV registradas en el sistema.
    """
    try:
        from app.services.bcv_scraper import BCVExchangeRateService
        live_info = BCVExchangeRateService.get_current_rate()
    except Exception:
        live_info = None

    try:
        result = db.execute(
            text("SELECT id, rate_date, rate, source, created_at FROM bcv_rate_history ORDER BY rate_date DESC LIMIT :lim"),
            {"lim": limit}
        ).fetchall()
        
        rates = []
        for row in result:
            rates.append({
                "id": row[0],
                "rate_date": str(row[1]),
                "rate": float(row[2]),
                "source": row[3] or "BCV Oficial",
                "created_at": str(row[4])
            })
        return {
            "success": True,
            "current_rate": live_info.get("rate") if live_info else (rates[0]["rate"] if rates else 855.66),
            "current_date": live_info.get("date") if live_info else (rates[0]["rate_date"] if rates else datetime.utcnow().strftime("%Y-%m-%d")),
            "history": rates
        }
    except Exception as e:
        return {
            "success": True,
            "current_rate": live_info.get("rate") if live_info else 855.66,
            "current_date": datetime.utcnow().strftime("%Y-%m-%d"),
            "history": []
        }

# ------------------------------------------------------------------------------
# 6. ARBITRAJE CAMBIARIO Y TRANSFERENCIAS ENTRE CUENTAS (MESA DE CAMBIO)
# ------------------------------------------------------------------------------
class CurrencyExchangeCreate(BaseModel):
    operation_type: str  # "bs_a_usd" o "usd_a_bs"
    source_account: str
    target_account: str
    source_amount: float
    target_amount: float
    transaction_rate: Optional[float] = None
    exchange_rate: Optional[float] = None
    operation_date: Optional[str] = None
    reference_number: Optional[str] = None
    notes: Optional[str] = None

@router.post("/exchange")
def execute_currency_exchange(req: CurrencyExchangeCreate, db: Session = Depends(get_db)):
    if req.source_amount <= 0 or req.target_amount <= 0:
        raise HTTPException(status_code=400, detail="Los montos de origen y destino deben ser mayores a cero.")
    
    if req.source_account.strip().lower() == req.target_account.strip().lower():
        raise HTTPException(status_code=400, detail="La cuenta de origen y la de destino deben ser distintas.")

    from app.services.bcv_scraper import BCVExchangeRateService
    rate_info = BCVExchangeRateService.get_current_rate()
    bcv_rate = req.exchange_rate if (req.exchange_rate and req.exchange_rate > 0) else (rate_info.get("rate") or 850.0)

    # Fecha de operación (soporte retroactivo)
    if req.operation_date:
        try:
            op_dt = datetime.strptime(req.operation_date[:10], "%Y-%m-%d")
        except Exception:
            op_dt = datetime.utcnow()
    else:
        op_dt = datetime.utcnow()

    ref_clean = (req.reference_number or f"EXCH-{int(datetime.utcnow().timestamp())}").strip()
    notes_clean = (req.notes or "").strip()

    if req.operation_type == "bs_a_usd":
        # Venta de Bs para comprar USD (ej. Banesco Bs -> Binance USDT)
        trans_rate = req.transaction_rate if (req.transaction_rate and req.transaction_rate > 0) else round(req.source_amount / req.target_amount, 2)
        # Contravalor de los Bs al cambio oficial BCV
        official_usd = round(req.source_amount / bcv_rate, 2)
        # Diferencial = USD obtenidos - USD según BCV
        diff_usd = round(req.target_amount - official_usd, 2)
        diff_type = "perdida_cambiaria" if diff_usd < 0 else "ganancia_cambiaria"

        # Egreso de Bs
        p_out = FinancialPayment(
            payment_type="cambio_divisa_egreso",
            amount_usd=official_usd,
            amount_bs=req.source_amount,
            exchange_rate=bcv_rate,
            payment_date=op_dt,
            payment_method="transferencia",
            voucher_number=ref_clean,
            reference_number=ref_clean,
            notes=f"Salida de [{req.source_account}]: Bs. {req.source_amount:,.2f} transferidos a tasa {trans_rate:,.2f} Bs/$. Ref: {ref_clean}. {notes_clean}".strip()
        )
        # Ingreso de USD
        p_in = FinancialPayment(
            payment_type="cambio_divisa_ingreso",
            amount_usd=req.target_amount,
            amount_bs=round(req.target_amount * bcv_rate, 2),
            exchange_rate=bcv_rate,
            payment_date=op_dt,
            payment_method="transferencia",
            voucher_number=ref_clean,
            reference_number=ref_clean,
            notes=f"Entrada a [{req.target_account}]: ${req.target_amount:,.2f} USD recibidos. Diferencial: {'+$' if diff_usd >= 0 else '-$'}{abs(diff_usd):,.2f} USD ({diff_type.replace('_', ' ').title()}). Ref: {ref_clean}. {notes_clean}".strip()
        )
    else:
        # Venta de USD para obtener Bs (ej. Binance USDT -> Banesco Bs)
        trans_rate = req.transaction_rate if (req.transaction_rate and req.transaction_rate > 0) else round(req.target_amount / req.source_amount, 2)
        # Contravalor de los Bs obtenidos al cambio oficial BCV
        official_usd = round(req.target_amount / bcv_rate, 2)
        # Diferencial = USD según BCV de los Bs obtenidos - USD entregados
        diff_usd = round(official_usd - req.source_amount, 2)
        diff_type = "ganancia_cambiaria" if diff_usd > 0 else "perdida_cambiaria"

        # Egreso de USD
        p_out = FinancialPayment(
            payment_type="cambio_divisa_egreso",
            amount_usd=req.source_amount,
            amount_bs=round(req.source_amount * bcv_rate, 2),
            exchange_rate=bcv_rate,
            payment_date=op_dt,
            payment_method="transferencia",
            voucher_number=ref_clean,
            reference_number=ref_clean,
            notes=f"Salida de [{req.source_account}]: ${req.source_amount:,.2f} USD liquidados a tasa {trans_rate:,.2f} Bs/$. Ref: {ref_clean}. {notes_clean}".strip()
        )
        # Ingreso de Bs
        p_in = FinancialPayment(
            payment_type="cambio_divisa_ingreso",
            amount_usd=official_usd,
            amount_bs=req.target_amount,
            exchange_rate=bcv_rate,
            payment_date=op_dt,
            payment_method="transferencia",
            voucher_number=ref_clean,
            reference_number=ref_clean,
            notes=f"Entrada a [{req.target_account}]: Bs. {req.target_amount:,.2f} acreditados. Diferencial: {'+$' if diff_usd >= 0 else '-$'}{abs(diff_usd):,.2f} USD ({diff_type.replace('_', ' ').title()}). Ref: {ref_clean}. {notes_clean}".strip()
        )

    db.add(p_out)
    db.add(p_in)

    audit = AuditLog(
        username="Finanzas",
        module="Finanzas / Tesorería",
        action="Cambio de Divisas / Transferencia Entre Cuentas",
        details=f"Transferencia de [{req.source_account}] a [{req.target_account}]. Tasa: {trans_rate:,.2f} Bs/$ (BCV: {bcv_rate:,.2f}). Diferencial: {'+$' if diff_usd >= 0 else '-$'}{abs(diff_usd):,.2f} USD ({diff_type}). Ref: {ref_clean}."
    )
    db.add(audit)
    db.commit()

    return {
        "success": True,
        "message": f"Operación de cambio procesada exitosamente. Diferencial: {'+$' if diff_usd >= 0 else '-$'}{abs(diff_usd):,.2f} USD ({diff_type.replace('_', ' ').title()}).",
        "operation_code": ref_clean,
        "source_account": req.source_account,
        "target_account": req.target_account,
        "source_amount": req.source_amount,
        "target_amount": req.target_amount,
        "transaction_rate": trans_rate,
        "bcv_rate": bcv_rate,
        "exchange_diff_usd": diff_usd,
        "diff_type": diff_type
    }

@router.get("/exchanges")
def get_currency_exchanges(db: Session = Depends(get_db)):
    payments = db.query(FinancialPayment).filter(
        FinancialPayment.payment_type.in_(["cambio_divisa_egreso", "cambio_divisa_ingreso"])
    ).order_by(FinancialPayment.payment_date.desc()).limit(100).all()

    return [{
        "id": p.id,
        "payment_type": p.payment_type,
        "voucher_number": p.voucher_number or p.reference_number,
        "amount_usd": p.amount_usd,
        "amount_bs": p.amount_bs,
        "exchange_rate": p.exchange_rate,
        "payment_method": p.payment_method,
        "payment_date": p.payment_date.strftime("%Y-%m-%d %H:%M") if p.payment_date else datetime.utcnow().strftime("%Y-%m-%d %H:%M"),
        "created_at": p.payment_date.isoformat() if p.payment_date else datetime.utcnow().isoformat(),
        "notes": p.notes
    } for p in payments]

@router.delete("/cxc/{cxc_id}")
def delete_receivable(cxc_id: int, db: Session = Depends(get_db)):
    rec = db.query(AccountReceivable).filter(AccountReceivable.id == cxc_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Cuenta por cobrar no encontrada.")
    # Eliminar pagos asociados primero si existen
    db.query(FinancialPayment).filter(
        (FinancialPayment.receivable_id == cxc_id) | 
        ((FinancialPayment.payment_type == "cxc_cobro") & (FinancialPayment.reference_number == rec.invoice_number))
    ).delete(synchronize_session=False)
    
    db.delete(rec)
    db.commit()
    return {"success": True, "message": f"Cuenta por cobrar [{rec.invoice_number}] eliminada con éxito."}

class BadDebtWriteOff(BaseModel):
    reason: str
    notes: Optional[str] = None

@router.post("/cxc/{receivable_id}/write-off")
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

# ------------------------------------------------------------------------------
# 7. ESTADO DE FLUJO DE CAJA MATRICIAL MULTIMENSUAL (ESTÁNDAR CONTABLE)
# ------------------------------------------------------------------------------
@router.get("/cash-flow-matrix")
def get_cash_flow_matrix(
    year: Optional[int] = Query(2026),
    month: Optional[int] = Query(None),
    start_month: Optional[int] = Query(1),
    end_month: Optional[int] = Query(12),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    is_ytd: Optional[bool] = Query(False),
    db: Session = Depends(get_db)
):
    try:
        from app.services.bcv_scraper import BCVExchangeRateService
        bcv_rate = float(BCVExchangeRateService.get_current_rate().get("rate") or 855.66)
    except Exception:
        bcv_rate = 855.66

    MONTH_NAMES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]

    all_payments = db.query(FinancialPayment).options(
        joinedload(FinancialPayment.receivable),
        joinedload(FinancialPayment.payable)
    ).all()
    all_expenses = db.query(Expense).options(joinedload(Expense.category)).filter(Expense.status == "aprobado").all()
    all_withdrawals = db.query(PartnerWithdrawal).all()

    # Si se especificó rango de fechas personalizado por día (Desde - Hasta)
    if start_date and end_date:
        try:
            s_dt = datetime.strptime(start_date.strip()[:10], "%Y-%m-%d")
            e_dt = datetime.strptime(end_date.strip()[:10], "%Y-%m-%d") + timedelta(days=1)
        except Exception:
            s_dt = datetime(year or 2026, 1, 1)
            e_dt = datetime(year or 2026, 12, 31, 23, 59, 59)

        # Saldo previo a s_dt
        prev_c = sum(p.amount_usd for p in all_payments if p.payment_type == "cxc_cobro" and p.payment_date and p.payment_date < s_dt)
        prev_p = sum(p.amount_usd for p in all_payments if p.payment_type == "cxp_pago" and p.payment_date and p.payment_date < s_dt)
        prev_e = sum(e.amount_usd for e in all_expenses if e.expense_date and e.expense_date < s_dt)
        prev_w = sum(w.amount_usd for w in all_withdrawals if w.withdrawal_date and w.withdrawal_date < s_dt)
        prev_in = sum(p.amount_usd for p in all_payments if p.payment_type == "cambio_divisa_ingreso" and p.payment_date and p.payment_date < s_dt)
        prev_out = sum(p.amount_usd for p in all_payments if p.payment_type == "cambio_divisa_egreso" and p.payment_date and p.payment_date < s_dt)
        saldo_inicial_custom = round(prev_c - prev_p - prev_e - prev_w + (prev_in - prev_out), 2)

        rng_payments = [p for p in all_payments if p.payment_date and s_dt <= p.payment_date < e_dt]
        rng_expenses = [e for e in all_expenses if e.expense_date and s_dt <= e.expense_date < e_dt]
        rng_withdrawals = [w for w in all_withdrawals if w.withdrawal_date and s_dt <= w.withdrawal_date < e_dt]

        ing_cxc_obras = sum(p.amount_usd for p in rng_payments if p.payment_type == "cxc_cobro" and (not p.receivable or not (p.receivable.invoice_number or "").startswith("ALQ-")))
        ing_cxc_alquileres = sum(p.amount_usd for p in rng_payments if p.payment_type == "cxc_cobro" and p.receivable and (p.receivable.invoice_number or "").startswith("ALQ-"))
        ing_anticipos = sum(p.amount_usd for p in rng_payments if p.payment_type == "cxc_cobro" and not p.receivable)
        ing_mesa = sum(p.amount_usd for p in rng_payments if p.payment_type == "cambio_divisa_ingreso")
        total_ing = round(ing_cxc_obras + ing_cxc_alquileres + ing_anticipos + ing_mesa, 2)

        egr_materiales = 0.0
        egr_nomina = 0.0
        egr_cxp = sum(p.amount_usd for p in rng_payments if p.payment_type == "cxp_pago")
        egr_alquileres_ext = 0.0
        egr_gastos_sede = 0.0
        for e in rng_expenses:
            cat = ((e.category.name if e.category else (e.payable_type or "")).strip().lower())
            if any(k in cat for k in ["nómina", "nomina", "personal", "sueldo"]):
                egr_nomina += e.amount_usd
            elif "material" in cat:
                egr_materiales += e.amount_usd
            elif "alquiler" in cat:
                egr_alquileres_ext += e.amount_usd
            else:
                egr_gastos_sede += e.amount_usd
        egr_mesa = sum(p.amount_usd for p in rng_payments if p.payment_type == "cambio_divisa_egreso")
        total_egr = round(egr_materiales + egr_nomina + egr_cxp + egr_alquileres_ext + egr_gastos_sede + egr_mesa, 2)

        flujo_op = round(total_ing - total_egr, 2)
        retiros = round(sum(w.amount_usd for w in rng_withdrawals), 2)
        diff_camb = round(ing_mesa - egr_mesa, 2)
        tot_fin = round(-retiros, 2)
        saldo_fin = round(saldo_inicial_custom + flujo_op - retiros, 2)

        col_name = f"{s_dt.strftime('%d/%m/%Y')} - {(e_dt - timedelta(days=1)).strftime('%d/%m/%Y')}"
        month_item = {
            "month_num": s_dt.month,
            "month_name": col_name,
            "month_year": col_name,
            "bcv_rate": bcv_rate,
            "saldo_inicial": saldo_inicial_custom,
            "ingresos": {
                "cxc_obras": round(ing_cxc_obras, 2),
                "alquileres_dalor": round(ing_cxc_alquileres, 2),
                "anticipos_directos": round(ing_anticipos, 2),
                "mesa_cambio": round(ing_mesa, 2),
                "total_ingresos": total_ing
            },
            "egresos": {
                "materiales_insumos": round(egr_materiales, 2),
                "nomina_personal": round(egr_nomina, 2),
                "proveedores_cxp": round(egr_cxp, 2),
                "alquileres_maquinaria": round(egr_alquileres_ext, 2),
                "gastos_sede_fijos": round(egr_gastos_sede, 2),
                "mesa_cambio": round(egr_mesa, 2),
                "total_egresos": total_egr
            },
            "flujo_economico_operativo": flujo_op,
            "financiamiento": {
                "retiros_socios": retiros,
                "diferencial_cambiario": diff_camb,
                "total_financiamiento": tot_fin
            },
            "saldo_final": saldo_fin
        }
        return {
            "success": True,
            "year": year or s_dt.year,
            "month": None,
            "start_date": start_date,
            "end_date": end_date,
            "is_ytd": False,
            "bcv_rate": bcv_rate,
            "opening_period_balance": saldo_inicial_custom,
            "closing_period_balance": saldo_fin,
            "total_ingresos": total_ing,
            "total_egresos": total_egr,
            "total_operativo": flujo_op,
            "total_financiamiento": tot_fin,
            "months": [month_item]
        }

    # Flujo mensual / anual / YTD
    target_year = year or datetime.utcnow().year
    if month is not None and month > 0:
        s_month = max(1, min(12, int(month)))
        e_month = s_month
    elif is_ytd:
        s_month = 1
        cur_year = datetime.utcnow().year
        e_month = datetime.utcnow().month if target_year == cur_year else 12
    else:
        s_month = max(1, min(12, start_month or 1))
        e_month = max(1, min(12, end_month or 12))
        if s_month > e_month:
            s_month, e_month = 1, 12

    start_dt = datetime(target_year, s_month, 1)

    # Saldo acumulado histórico previo a start_dt
    prev_collected_cxc = sum(p.amount_usd for p in all_payments if p.payment_type == "cxc_cobro" and p.payment_date and p.payment_date < start_dt)
    prev_paid_cxp = sum(p.amount_usd for p in all_payments if p.payment_type == "cxp_pago" and p.payment_date and p.payment_date < start_dt)
    prev_expenses = sum(e.amount_usd for e in all_expenses if e.expense_date and e.expense_date < start_dt)
    prev_withdrawals = sum(w.amount_usd for w in all_withdrawals if w.withdrawal_date and w.withdrawal_date < start_dt)
    prev_ex_in = sum(p.amount_usd for p in all_payments if p.payment_type == "cambio_divisa_ingreso" and p.payment_date and p.payment_date < start_dt)
    prev_ex_out = sum(p.amount_usd for p in all_payments if p.payment_type == "cambio_divisa_egreso" and p.payment_date and p.payment_date < start_dt)

    running_balance = prev_collected_cxc - prev_paid_cxp - prev_expenses - prev_withdrawals + (prev_ex_in - prev_ex_out)

    months_data = []
    tot_ingresos_period = 0.0
    tot_egresos_period = 0.0
    tot_operativo_period = 0.0
    tot_financiamiento_period = 0.0

    for m in range(s_month, e_month + 1):
        m_start = datetime(target_year, m, 1)
        m_end = datetime(target_year + 1, 1, 1) if m == 12 else datetime(target_year, m + 1, 1)

        saldo_inicial_mes = round(running_balance, 2)

        m_payments = [p for p in all_payments if p.payment_date and m_start <= p.payment_date < m_end]
        m_expenses = [e for e in all_expenses if e.expense_date and m_start <= e.expense_date < m_end]
        m_withdrawals = [w for w in all_withdrawals if w.withdrawal_date and m_start <= w.withdrawal_date < m_end]

        # Ingresos
        ing_cxc_obras = 0.0
        ing_cxc_alquileres = 0.0
        ing_anticipos = 0.0

        for p in m_payments:
            if p.payment_type == "cxc_cobro":
                if p.receivable:
                    inv = p.receivable.invoice_number or ""
                    if inv.startswith("ALQ-") or "alquiler" in (p.receivable.description or "").lower():
                        ing_cxc_alquileres += p.amount_usd
                    else:
                        ing_cxc_obras += p.amount_usd
                else:
                    ing_anticipos += p.amount_usd

        ing_mesa_cambio = sum(p.amount_usd for p in m_payments if p.payment_type == "cambio_divisa_ingreso")
        total_ingresos_mes = round(ing_cxc_obras + ing_cxc_alquileres + ing_anticipos + ing_mesa_cambio, 2)

        # Egresos
        egr_materiales = 0.0
        egr_nomina = 0.0
        egr_cxp_proveedores = 0.0
        egr_alquileres_ext = 0.0
        egr_gastos_sede = 0.0

        for p in m_payments:
            if p.payment_type == "cxp_pago":
                if p.payable:
                    ptype = (p.payable.payable_type or "").lower()
                    inv = (p.payable.invoice_number or "").lower()
                    if inv.startswith("alq-") or "alquiler" in ptype:
                        egr_alquileres_ext += p.amount_usd
                    elif "material" in ptype or "obra" in ptype:
                        egr_cxp_proveedores += p.amount_usd
                    else:
                        egr_gastos_sede += p.amount_usd
                else:
                    egr_cxp_proveedores += p.amount_usd

        for e in m_expenses:
            cat_name = ((e.category.name if e.category else (e.payable_type or "")).strip().lower())
            if any(k in cat_name for k in ["nómina", "nomina", "personal", "sueldo"]):
                egr_nomina += e.amount_usd
            elif "material" in cat_name:
                egr_materiales += e.amount_usd
            elif "alquiler" in cat_name:
                egr_alquileres_ext += e.amount_usd
            else:
                egr_gastos_sede += e.amount_usd

        egr_mesa_cambio = sum(p.amount_usd for p in m_payments if p.payment_type == "cambio_divisa_egreso")
        total_egresos_mes = round(egr_materiales + egr_nomina + egr_cxp_proveedores + egr_alquileres_ext + egr_gastos_sede + egr_mesa_cambio, 2)

        # Flujo Económico Operativo
        flujo_economico = round(total_ingresos_mes - total_egresos_mes, 2)

        # Financiamiento y Socios
        retiros_socios = round(sum(w.amount_usd for w in m_withdrawals), 2)
        diff_cambiario = round(ing_mesa_cambio - egr_mesa_cambio, 2)
        total_financiamiento = round(-retiros_socios, 2)

        saldo_final_mes = round(saldo_inicial_mes + flujo_economico - retiros_socios, 2)
        running_balance = saldo_final_mes

        tot_ingresos_period += total_ingresos_mes
        tot_egresos_period += total_egresos_mes
        tot_operativo_period += flujo_economico
        tot_financiamiento_period += total_financiamiento

        months_data.append({
            "month_num": m,
            "month_name": MONTH_NAMES[m - 1],
            "month_year": f"{MONTH_NAMES[m - 1]} {target_year}",
            "bcv_rate": bcv_rate,
            "saldo_inicial": saldo_inicial_mes,
            "ingresos": {
                "cxc_obras": round(ing_cxc_obras, 2),
                "alquileres_dalor": round(ing_cxc_alquileres, 2),
                "anticipos_directos": round(ing_anticipos, 2),
                "mesa_cambio": round(ing_mesa_cambio, 2),
                "total_ingresos": total_ingresos_mes
            },
            "egresos": {
                "materiales_insumos": round(egr_materiales, 2),
                "nomina_personal": round(egr_nomina, 2),
                "proveedores_cxp": round(egr_cxp_proveedores, 2),
                "alquileres_maquinaria": round(egr_alquileres_ext, 2),
                "gastos_sede_fijos": round(egr_gastos_sede, 2),
                "mesa_cambio": round(egr_mesa_cambio, 2),
                "total_egresos": total_egresos_mes
            },
            "flujo_economico_operativo": flujo_economico,
            "financiamiento": {
                "retiros_socios": retiros_socios,
                "diferencial_cambiario": diff_cambiario,
                "total_financiamiento": total_financiamiento
            },
            "saldo_final": saldo_final_mes
        })

    return {
        "success": True,
        "year": target_year,
        "month": month,
        "start_month": s_month,
        "end_month": e_month,
        "is_ytd": bool(is_ytd),
        "start_date": None,
        "end_date": None,
        "bcv_rate": bcv_rate,
        "opening_period_balance": months_data[0]["saldo_inicial"] if months_data else 0.0,
        "closing_period_balance": months_data[-1]["saldo_final"] if months_data else 0.0,
        "total_ingresos": round(tot_ingresos_period, 2),
        "total_egresos": round(tot_egresos_period, 2),
        "total_operativo": round(tot_operativo_period, 2),
        "total_financiamiento": round(tot_financiamiento_period, 2),
        "months": months_data
    }

# ─── CUENTAS BANCARIAS Y CAJAS PERSONALIZADAS ──────────────────────────────────

@router.get("/accounts", response_model=List[FinancialAccountOut])
def list_financial_accounts(db: Session = Depends(get_db), current_user: UserModel = Depends(get_current_user)):
    """Lista todas las cuentas bancarias y cajas."""
    return db.query(FinancialAccount).order_by(FinancialAccount.sort_order, FinancialAccount.id).all()

@router.post("/accounts", response_model=FinancialAccountOut, status_code=201)
def create_financial_account(data: FinancialAccountCreate, db: Session = Depends(get_db), current_user: UserModel = Depends(get_current_user)):
    """Crea una nueva cuenta bancaria o caja."""
    acc = FinancialAccount(**data.model_dump())
    db.add(acc)
    db.commit()
    db.refresh(acc)
    return acc

@router.patch("/accounts/{account_id}", response_model=FinancialAccountOut)
def update_financial_account(account_id: int, data: FinancialAccountUpdate, db: Session = Depends(get_db), current_user: UserModel = Depends(get_current_user)):
    """Actualiza una cuenta bancaria o caja."""
    acc = db.query(FinancialAccount).filter(FinancialAccount.id == account_id).first()
    if not acc:
        raise HTTPException(status_code=404, detail="Cuenta no encontrada")
    for field, val in data.model_dump(exclude_unset=True).items():
        setattr(acc, field, val)
    db.commit()
    db.refresh(acc)
    return acc

@router.delete("/accounts/{account_id}", status_code=204)
def delete_financial_account(account_id: int, db: Session = Depends(get_db), current_user: UserModel = Depends(get_current_user)):
    """Desactiva (soft-delete) una cuenta bancaria."""
    acc = db.query(FinancialAccount).filter(FinancialAccount.id == account_id).first()
    if not acc:
        raise HTTPException(status_code=404, detail="Cuenta no encontrada")
    acc.is_active = False
    db.commit()


# ─── BUSINESS INTELLIGENCE & ANALYTICS EJECUTIVO (100% DATOS REALES) ──────────

def _classify_venezuela_region(location_str: str, client_address: str = None) -> str:
    raw = f"{location_str or ''} {client_address or ''}".lower()
    if any(k in raw for k in ["carabobo", "valencia", "guacara", "san joaquin", "san joaquín", "puerto cabello", "naguanagua", "mariara", "los guayos"]):
        return "carabobo"
    if any(k in raw for k in ["aragua", "maracay", "cagua", "turmero", "la victoria"]):
        return "aragua"
    if any(k in raw for k in ["miranda", "caracas", "guarenas", "guatire", "distrito", "chacao", "baruta", "los teques"]):
        return "miranda"
    if any(k in raw for k in ["anzoategui", "anzoátegui", "barcelona", "puerto la cruz", "lecheria", "el tigre", "monagas", "maturin"]):
        return "oriente"
    if any(k in raw for k in ["zulia", "maracaibo", "cabimas", "san francisco", "falcon", "punto fijo"]):
        return "zulia_falcon"
    if any(k in raw for k in ["bolivar", "bolívar", "puerto ordaz", "guayana", "san felix", "ciudad bolivar"]):
        return "bolivar"
    if any(k in raw for k in ["lara", "barquisimeto", "cabudare", "yaracuy"]):
        return "centro_occidente"
    return "carabobo"

@router.get("/bi-metrics")
def get_bi_metrics(
    year: Optional[str] = None,
    client_id: Optional[int] = None,
    region: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Retorna métricas ejecutivas 100% reales consolidadas desde la base de datos de DALOR SIGO-P.
    Cero maquetas, cero porcentajes hardcodeados y cero datos simulados.
    """
    from app.models.models import MaterialMovement
    
    # 1. Base Queries
    all_clients = {c.id: c for c in db.query(Client).all()}
    
    # Proyectos
    p_query = db.query(Project)
    if client_id:
        p_query = p_query.filter(Project.client_id == client_id)
    all_projects = p_query.all()
    
    # Filtrar por región si aplica
    if region and region != "all":
        all_projects = [
            p for p in all_projects
            if _classify_venezuela_region(p.location, all_clients.get(p.client_id, None).address if all_clients.get(p.client_id) else None) == region
        ]
    
    project_ids = {p.id for p in all_projects}

    # Año filter helper
    apply_year = year and str(year).strip().lower() not in ["all", "none", "0", ""]
    year_int = int(year) if apply_year and str(year).strip().isdigit() else None

    # CxC Facturación & Valuaciones
    r_query = db.query(AccountReceivable)
    if client_id:
        r_query = r_query.filter(AccountReceivable.client_id == client_id)
    if region and region != "all":
        r_query = r_query.filter(AccountReceivable.project_id.in_(project_ids))
    if year_int:
        r_query = r_query.filter(func.extract('year', AccountReceivable.issue_date) == year_int)
    all_rec = r_query.all()
    rec_ids = {r.id for r in all_rec}

    # Cobros Reales
    pay_query = db.query(FinancialPayment).filter(FinancialPayment.receivable_id.isnot(None))
    if rec_ids:
        pay_query = pay_query.filter(FinancialPayment.receivable_id.in_(rec_ids))
    elif client_id or (region and region != "all"):
        pay_query = pay_query.filter(FinancialPayment.receivable_id == -999)
    if year_int:
        pay_query = pay_query.filter(func.extract('year', FinancialPayment.payment_date) == year_int)
    all_cxc_payments = pay_query.all()

    # Costos & Gastos Directos de Campo
    exp_query = db.query(Expense).filter(Expense.status == "aprobado")
    if region and region != "all":
        exp_query = exp_query.filter(Expense.project_id.in_(project_ids))
    if year_int:
        exp_query = exp_query.filter(func.extract('year', Expense.expense_date) == year_int)
    all_expenses = exp_query.all()

    # Cuentas por Pagar (Compras de Insumos/Servicios de Proveedores)
    cxp_query = db.query(AccountPayable)
    if region and region != "all":
        cxp_query = cxp_query.filter(AccountPayable.project_id.in_(project_ids))
    if year_int:
        cxp_query = cxp_query.filter(func.extract('year', AccountPayable.issue_date) == year_int)
    all_payables = cxp_query.all()

    # Despachos de Materiales de Almacén a Proyectos
    mat_query = db.query(MaterialMovement).filter(MaterialMovement.movement_type.in_(["salida_obra", "salida"]))
    if region and region != "all":
        mat_query = mat_query.filter(MaterialMovement.project_id.in_(project_ids))
    if year_int:
        mat_query = mat_query.filter(func.extract('year', MaterialMovement.movement_date) == year_int)
    all_mat_movements = mat_query.all()

    # 2. Resumen KPI Superior
    tot_invoiced = sum(r.amount_usd for r in all_rec)
    tot_contracted = sum(p.contract_amount_usd or 0.0 for p in all_projects)
    tot_collected = sum(p.amount_usd for p in all_cxc_payments)
    tot_pending_cxc = sum(r.balance_usd for r in all_rec)
    
    tot_field_expenses = sum(e.amount_usd for e in all_expenses)
    tot_supplier_purchases = sum(ap.amount_usd for ap in all_payables)
    tot_warehouse_dispatches = sum((m.quantity * (m.unit_cost_usd or 0.0)) for m in all_mat_movements)
    
    tot_cost = round(tot_field_expenses + tot_supplier_purchases + tot_warehouse_dispatches, 2)
    net_profit = round(tot_collected - tot_cost, 2)
    margin_pct = round((net_profit / tot_cost * 100), 1) if tot_cost > 0 else 0.0
    collection_rate = round((tot_collected / tot_invoiced * 100), 1) if tot_invoiced > 0 else (100.0 if tot_collected > 0 else 0.0)

    # 3. Mapa de Venezuela Georreferenciado Real
    regions_def = [
        {"key": "carabobo", "name": "Carabobo (Centro / Guacara)"},
        {"key": "aragua", "name": "Aragua (Maracay / Cagua)"},
        {"key": "miranda", "name": "Miranda / Caracas"},
        {"key": "oriente", "name": "Oriente (Anzoátegui / Monagas)"},
        {"key": "zulia_falcon", "name": "Zulia / Falcón"},
        {"key": "bolivar", "name": "Bolívar / Guayana"},
        {"key": "centro_occidente", "name": "Lara / Centro-Occidente"}
    ]
    regional_metrics = {
        r["key"]: {
            "key": r["key"],
            "name": r["name"],
            "projects_count": 0,
            "active_projects_count": 0,
            "invoiced_usd": 0.0,
            "collected_usd": 0.0,
            "has_active_projects": False
        }
        for r in regions_def
    }

    # Mapeo por proyecto global
    raw_all_projects = db.query(Project).all()
    for p in raw_all_projects:
        cli = all_clients.get(p.client_id)
        reg_key = _classify_venezuela_region(p.location, cli.address if cli else None)
        if reg_key in regional_metrics:
            p_rec = [r for r in all_rec if r.project_id == p.id]
            p_inv = sum(r.amount_usd for r in p_rec)
            p_col = sum(r.paid_amount_usd for r in p_rec)
            is_act = (p.status or '').lower() in ['activo', 'en_ejecucion']
            
            regional_metrics[reg_key]["projects_count"] += 1
            if is_act:
                regional_metrics[reg_key]["active_projects_count"] += 1
                regional_metrics[reg_key]["has_active_projects"] += True
            regional_metrics[reg_key]["invoiced_usd"] += round(p_inv, 2)
            regional_metrics[reg_key]["collected_usd"] += round(p_col, 2)

    # 4. Evolución Mensual Real
    months_map = {}
    for r in all_rec:
        if r.issue_date:
            m_key = r.issue_date.strftime("%Y-%m")
            if m_key not in months_map:
                months_map[m_key] = {"month": m_key, "invoiced_usd": 0.0, "collected_usd": 0.0}
            months_map[m_key]["invoiced_usd"] += r.amount_usd

    for p in all_cxc_payments:
        p_date = p.payment_date or datetime.utcnow()
        m_key = p_date.strftime("%Y-%m")
        if m_key not in months_map:
            months_map[m_key] = {"month": m_key, "invoiced_usd": 0.0, "collected_usd": 0.0}
        months_map[m_key]["collected_usd"] += p.amount_usd

    month_names = {
        "01": "Ene", "02": "Feb", "03": "Mar", "04": "Abr", "05": "May", "06": "Jun",
        "07": "Jul", "08": "Ago", "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dic"
    }
    sorted_months = sorted(months_map.values(), key=lambda x: x["month"])
    monthly_data = []
    for m in sorted_months:
        parts = m["month"].split("-")
        label = f"{month_names.get(parts[1], parts[1])} {parts[0]}" if len(parts) == 2 else m["month"]
        monthly_data.append({
            "month": m["month"],
            "label": label,
            "invoiced_usd": round(m["invoiced_usd"], 2),
            "collected_usd": round(m["collected_usd"], 2)
        })

    # 5. Top Clientes Real
    client_sales = {}
    for r in all_rec:
        c_name = all_clients[r.client_id].name if r.client_id in all_clients else f"Cliente #{r.client_id}"
        client_sales[c_name] = client_sales.get(c_name, 0.0) + r.amount_usd

    tot_client_sales = sum(client_sales.values())
    top_clients_list = []
    for c_name, val in sorted(client_sales.items(), key=lambda x: x[1], reverse=True)[:5]:
        pct = round((val / tot_client_sales * 100), 1) if tot_client_sales > 0 else 0.0
        top_clients_list.append({
            "name": c_name,
            "total_usd": round(val, 2),
            "percentage": pct
        })

    # 6. Estatus de Obras Real
    status_counts = {"en_ejecucion": 0, "culminados": 0, "planificados": 0}
    for p in all_projects:
        st = (p.status or '').lower()
        if st in ['culminado', 'finalizado', 'cerrado', 'completado']:
            status_counts["culminados"] += 1
        elif st in ['planificado', 'propuesta', 'cotizacion', 'borrador']:
            status_counts["planificados"] += 1
        else:
            status_counts["en_ejecucion"] += 1

    # 7. Métodos de Pago Reales
    pay_methods_map = {}
    method_labels = {
        "transferencia": "Transferencia Bancaria",
        "efectivo_divisa": "Efectivo Divisa ($)",
        "zelle": "Zelle / Wire",
        "pago_movil": "Pago Móvil",
        "cheque": "Cheque",
        "cxc_anticipo": "Anticipo Registrado"
    }
    for p in all_cxc_payments:
        pm = p.payment_method or "transferencia"
        if pm not in pay_methods_map:
            pay_methods_map[pm] = 0.0
        pay_methods_map[pm] += p.amount_usd

    tot_pay_methods = sum(pay_methods_map.values())
    payment_methods_list = []
    for pm, val in sorted(pay_methods_map.items(), key=lambda x: x[1], reverse=True):
        pct = round((val / tot_pay_methods * 100), 1) if tot_pay_methods > 0 else 0.0
        payment_methods_list.append({
            "method": pm,
            "label": method_labels.get(pm, pm.replace('_', ' ').title()),
            "total_usd": round(val, 2),
            "percentage": pct
        })

    # 8. Líneas de Servicio Reales (Extraídas de nombres/alcance de cotizaciones u obras)
    service_lines_map = {}
    for p in all_projects:
        desc = f"{p.name or ''} {getattr(p, 'scope_of_work', '') or ''}".lower()
        if any(w in desc for w in ["montaje", "estructura", "galpon", "techo"]):
            line = "Montajes Industriales"
        elif any(w in desc for w in ["fabricacion", "fabricación", "tanque", "tolva", "spool", "chapa"]):
            line = "Fabricación Metalmecánica"
        elif any(w in desc for w in ["electr", "i&c", "tablero", "cableado", "instrumentacion"]):
            line = "Obras Eléctricas / I&C"
        elif any(w in desc for w in ["mantenimiento", "parada", "reparacion", "soldadura"]):
            line = "Mantenimiento & Paradas"
        else:
            line = "Obras y Servicios Generales"
        
        p_rec = [r for r in all_rec if r.project_id == p.id]
        p_val = sum(r.amount_usd for r in p_rec) or (p.contract_amount_usd or 0.0)
        service_lines_map[line] = service_lines_map.get(line, 0.0) + p_val

    tot_sl = sum(service_lines_map.values())
    service_lines_list = []
    for sl_name, sl_val in sorted(service_lines_map.items(), key=lambda x: x[1], reverse=True):
        pct = round((sl_val / tot_sl * 100), 1) if tot_sl > 0 else 0.0
        service_lines_list.append({
            "name": sl_name,
            "total_usd": round(sl_val, 2),
            "percentage": pct
        })

    # 9. P&L por Proyecto Detallado Real
    projects_pnl = []
    for p in all_projects:
        cli = all_clients.get(p.client_id)
        p_rec = [r for r in all_rec if r.project_id == p.id]
        p_inv = sum(r.amount_usd for r in p_rec)
        p_col = sum(r.paid_amount_usd for r in p_rec)
        p_bal = sum(r.balance_usd for r in p_rec)
        
        # Costos directos completos imputados a la obra:
        # a) Gastos de campo / viáticos / nómina de campo
        p_exp = sum(e.amount_usd for e in all_expenses if e.project_id == p.id)
        # b) Compras de insumos y servicios a proveedores (CxP)
        p_cxp = sum(ap.amount_usd for ap in all_payables if ap.project_id == p.id)
        # c) Despachos de materiales de almacén
        p_mat = sum((m.quantity * (m.unit_cost_usd or 0.0)) for m in all_mat_movements if m.project_id == p.id)
        
        p_cost = round(p_exp + p_cxp + p_mat, 2)
        p_profit = round(p_col - p_cost, 2)
        p_margin = round((p_profit / p_cost * 100), 1) if p_cost > 0 else (100.0 if p_col > 0 else 0.0)
        
        projects_pnl.append({
            "id": p.id,
            "project_id": p.id,
            "code": p.code,
            "name": p.name,
            "client_id": p.client_id,
            "client_name": cli.name if cli else "Sin Cliente",
            "status": p.status,
            "location": p.location or "En Sitio",
            "region": _classify_venezuela_region(p.location, cli.address if cli else None),
            "contract_amount_usd": round(p.contract_amount_usd or 0.0, 2),
            "invoiced_usd": round(p_inv, 2),
            "total_invoiced_usd": round(p_inv, 2),
            "collected_usd": round(p_col, 2),
            "collected_cxc_usd": round(p_col, 2),
            "balance_usd": round(p_bal, 2),
            "pending_cxc_usd": round(p_bal, 2),
            "cost_usd": p_cost,
            "total_cost_usd": p_cost,
            "field_expenses_usd": round(p_exp, 2),
            "supplier_purchases_usd": round(p_cxp, 2),
            "materials_consumed_usd": round(p_mat, 2),
            "profit_usd": p_profit,
            "net_profit_usd": p_profit,
            "margin_pct": p_margin,
            "net_margin_percent": p_margin
        })

    return {
        "success": True,
        "summary": {
            "total_contracted_usd": round(tot_contracted, 2),
            "total_invoiced_usd": round(tot_invoiced, 2),
            "total_collected_usd": round(tot_collected, 2),
            "total_collected_cxc_usd": round(tot_collected, 2),
            "total_pending_cxc_usd": round(tot_pending_cxc, 2),
            "total_cost_usd": tot_cost,
            "field_expenses_usd": round(tot_field_expenses, 2),
            "supplier_purchases_usd": round(tot_supplier_purchases, 2),
            "materials_consumed_usd": round(tot_warehouse_dispatches, 2),
            "net_profit_usd": net_profit,
            "profit_usd": net_profit,
            "margin_pct": margin_pct,
            "net_margin_percent": margin_pct,
            "collection_rate_pct": collection_rate,
            "active_projects_count": status_counts.get("en_ejecucion", 0) + status_counts.get("activo", 0),
            "total_projects_count": len(all_projects)
        },
        "regions": list(regional_metrics.values()),
        "monthly_revenue": monthly_data,
        "top_clients": top_clients_list,
        "project_statuses": status_counts,
        "payment_methods": payment_methods_list,
        "service_lines": service_lines_list,
        "projects_pnl": projects_pnl
    }

