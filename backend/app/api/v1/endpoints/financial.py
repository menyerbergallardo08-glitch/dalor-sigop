from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel

from app.core.database import get_db
from app.models.models import (
    AccountReceivable,
    AccountPayable,
    FinancialPayment,
    Project,
    Expense,
    Client,
    PartnerWithdrawal,
    FixedExpenseSetting
)

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
    amount_usd: float
    exchange_rate: float = 800.0
    tax_retained_usd: float = 0.0
    notes: Optional[str] = None

class PayableCreate(BaseModel):
    invoice_number: str
    supplier_name: str
    project_id: Optional[int] = None
    category_id: Optional[int] = None
    payable_type: str = "costo_material_obra" # costo_material_obra, gasto_fijo_sede, stock_almacen
    description: str
    due_date: datetime
    amount_usd: float
    exchange_rate: float = 800.0
    notes: Optional[str] = None

class PaymentCreate(BaseModel):
    payment_type: Optional[str] = "cxc_cobro" # cxc_cobro, cxp_pago
    target_id: Optional[int] = None # receivable_id o payable_id
    amount_usd: float
    payment_method: str = "transferencia"
    reference_number: Optional[str] = None
    exchange_rate: float = 800.0
    notes: Optional[str] = None

class DirectCollectionCreate(BaseModel):
    client_id: int
    project_id: Optional[int] = None
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

# ------------------------------------------------------------------------------
# 1. RESUMEN FINANCIERO EJECUTIVO & POWERBI CON BLINDAJE DE COSTOS
# ------------------------------------------------------------------------------
@router.get("/summary")
def get_financial_summary(db: Session = Depends(get_db)):
    # 1. Cuentas por Cobrar (CxC Clientes)
    r_query = db.query(AccountReceivable).all()
    total_invoiced_cxc = sum(r.amount_usd for r in r_query)
    total_collected_cxc = sum(r.paid_amount_usd for r in r_query)
    pending_cxc = sum(r.balance_usd for r in r_query)

    # 2. Cuentas por Pagar (CxP Proveedores)
    p_query = db.query(AccountPayable).all()
    total_invoiced_cxp = sum(p.amount_usd for p in p_query)
    total_paid_cxp = sum(p.paid_amount_usd for p in p_query)
    pending_cxp = sum(p.balance_usd for p in p_query)

    # 3. Gastos Directos y de Oficina
    all_expenses = db.query(Expense).all()
    total_direct_expenses = sum(e.amount_usd for e in all_expenses)

    # 4. Retiros Personales de Socios / Dueños
    partner_withdrawals = db.query(PartnerWithdrawal).order_by(PartnerWithdrawal.withdrawal_date.desc()).all()
    total_partner_withdrawals = sum(pw.amount_usd for pw in partner_withdrawals)

    # 5. Presupuesto Mensual de Gastos Fijos (Punto de Equilibrio / Break-Even)
    fixed_settings = db.query(FixedExpenseSetting).filter(FixedExpenseSetting.is_active == True).all()
    monthly_fixed_budget = sum(fs.monthly_amount_usd for fs in fixed_settings)
    if monthly_fixed_budget == 0:
        monthly_fixed_budget = 5000.0

    # 6. Saldo Líquido Real en Caja / Bancos Disponible
    net_operating_cash = total_collected_cxc - total_paid_cxp - total_direct_expenses - total_partner_withdrawals

    # 7. Ganancia Neta Devengada (Utilidad de Obras - Gastos Generales - Retiros)
    net_accrual_profit = total_invoiced_cxc - total_invoiced_cxp - total_direct_expenses
    net_margin_pct = round((net_accrual_profit / total_invoiced_cxc * 100), 1) if total_invoiced_cxc > 0 else 0.0

    # Cobertura de Gastos Fijos (Punto de Equilibrio del mes)
    fixed_overhead_covered_pct = min(100, round((net_accrual_profit / monthly_fixed_budget) * 100)) if monthly_fixed_budget > 0 and net_accrual_profit > 0 else 0

    # 8. Estado de Resultados (P&L) Limpio Obra por Obra
    projects = db.query(Project).filter(Project.is_active == True).all()
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

    return {
        "kpis": {
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
            "net_margin_percent": net_margin_pct
        },
        "partners_breakdown": [{"partner": k, "total_usd": round(v, 2)} for k, v in partners_summary.items()],
        "projects_pnl": projects_pnl,
        "alerts": alerts
    }

# ------------------------------------------------------------------------------
# 2. ENDPOINTS DE RETIROS DE SOCIOS (BLINDAJE DE CAJA)
# ------------------------------------------------------------------------------
@router.get("/partners/withdrawals")
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
        "date": r.withdrawal_date.strftime("%Y-%m-%d %H:%M")
    } for r in rows]

@router.post("/partners/withdrawals")
def create_partner_withdrawal(req: PartnerWithdrawalCreate, db: Session = Depends(get_db)):
    amount_bs = req.amount_usd * req.exchange_rate
    new_w = PartnerWithdrawal(
        partner_name=req.partner_name.strip(),
        concept=req.concept.strip(),
        amount_usd=req.amount_usd,
        amount_bs=amount_bs,
        exchange_rate=req.exchange_rate,
        payment_method=req.payment_method,
        reference_number=req.reference_number,
        notes=req.notes
    )
    db.add(new_w)
    db.commit()
    db.refresh(new_w)
    return {"success": True, "message": f"Retiro de socio registrado por ${req.amount_usd:,.2f} USD.", "id": new_w.id}

# ------------------------------------------------------------------------------
# 3. ENDPOINTS DE CUENTAS POR COBRAR (CxC)
# ------------------------------------------------------------------------------
@router.get("/cxc")
def get_receivables(db: Session = Depends(get_db)):
    rows = db.query(AccountReceivable).order_by(AccountReceivable.due_date.asc()).all()
    return [{
        "id": r.id,
        "invoice_number": r.invoice_number,
        "client_name": r.client.name if r.client else "General",
        "client_rif": r.client.rif if r.client else "-",
        "project_name": r.project.name if r.project else "Sede Central",
        "description": r.description,
        "issue_date": r.issue_date.strftime("%Y-%m-%d"),
        "due_date": r.due_date.strftime("%Y-%m-%d"),
        "amount_usd": r.amount_usd,
        "paid_amount_usd": r.paid_amount_usd,
        "balance_usd": r.balance_usd,
        "status": r.status,
        "tax_retained_usd": r.tax_retained_usd
    } for r in rows]

@router.post("/cxc")
def create_receivable(r_in: ReceivableCreate, db: Session = Depends(get_db)):
    existing = db.query(AccountReceivable).filter(AccountReceivable.invoice_number == r_in.invoice_number).first()
    if existing:
        raise HTTPException(status_code=400, detail="El número de factura/valuación ya existe.")

    amount_bs = r_in.amount_usd * r_in.exchange_rate
    new_r = AccountReceivable(
        invoice_number=r_in.invoice_number.strip(),
        client_id=r_in.client_id,
        project_id=r_in.project_id,
        description=r_in.description.strip(),
        due_date=r_in.due_date,
        amount_usd=r_in.amount_usd,
        amount_bs=amount_bs,
        exchange_rate=r_in.exchange_rate,
        tax_retained_usd=r_in.tax_retained_usd,
        balance_usd=r_in.amount_usd - r_in.tax_retained_usd,
        status="pendiente",
        notes=r_in.notes
    )
    db.add(new_r)
    db.commit()
    db.refresh(new_r)
    return {"success": True, "message": "Factura CxC registrada con éxito.", "id": new_r.id}

@router.post("/cxc/{receivable_id}/payment")
def record_cxc_payment(receivable_id: int, p_in: PaymentCreate, db: Session = Depends(get_db)):
    r = db.query(AccountReceivable).filter(AccountReceivable.id == receivable_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Factura no encontrada.")

    if p_in.amount_usd <= 0:
        raise HTTPException(status_code=400, detail="El monto del cobro debe ser mayor a cero.")

    if p_in.amount_usd > r.balance_usd:
        raise HTTPException(status_code=400, detail=f"El cobro (${p_in.amount_usd}) supera el saldo pendiente (${r.balance_usd}).")

    payment = FinancialPayment(
        payment_type="cxc_cobro",
        receivable_id=r.id,
        amount_usd=p_in.amount_usd,
        amount_bs=p_in.amount_usd * p_in.exchange_rate,
        exchange_rate=p_in.exchange_rate,
        payment_method=p_in.payment_method,
        reference_number=p_in.reference_number,
        notes=p_in.notes
    )
    db.add(payment)

    r.paid_amount_usd += p_in.amount_usd
    r.balance_usd -= p_in.amount_usd
    if r.balance_usd <= 0:
        r.status = "cobrado_total"
    else:
        r.status = "abono_parcial"

    db.commit()
    return {"success": True, "message": "Cobro aplicado con éxito.", "new_balance_usd": r.balance_usd, "status": r.status}

@router.post("/direct-collection")
def record_direct_client_collection(c_in: DirectCollectionCreate, db: Session = Depends(get_db)):
    client = db.query(Client).filter(Client.id == c_in.client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado.")

    if c_in.amount_usd <= 0:
        raise HTTPException(status_code=400, detail="El monto del cobro debe ser mayor a cero.")

    amount_bs = c_in.amount_usd * c_in.exchange_rate
    inv_num = f"REC-{datetime.utcnow().strftime('%y%m%d%H%M%S')}"

    # 1. Crear documento CxC ya saldado
    rec = AccountReceivable(
        invoice_number=inv_num,
        client_id=client.id,
        project_id=c_in.project_id,
        description=c_in.concept or "Anticipo / Abono Directo de Cliente",
        due_date=datetime.utcnow(),
        amount_usd=c_in.amount_usd,
        amount_bs=amount_bs,
        exchange_rate=c_in.exchange_rate,
        paid_amount_usd=c_in.amount_usd,
        balance_usd=0.0,
        status="cobrado_total",
        notes=c_in.notes
    )
    db.add(rec)
    db.flush()

    # 2. Registrar cobro en Tesorería
    payment = FinancialPayment(
        payment_type="cxc_cobro",
        receivable_id=rec.id,
        amount_usd=c_in.amount_usd,
        amount_bs=amount_bs,
        exchange_rate=c_in.exchange_rate,
        payment_method=c_in.payment_method,
        reference_number=c_in.reference_number or f"TRANS-{datetime.utcnow().strftime('%H%M%S')}",
        notes=f"Cobro directo de cliente: {client.name}. {c_in.notes or ''}"
    )
    db.add(payment)
    db.commit()

    return {
        "success": True,
        "message": f"Cobro directo de ${c_in.amount_usd:.2f} registrado exitosamente para {client.name}.",
        "receipt_number": inv_num,
        "payment_id": payment.id
    }

# ------------------------------------------------------------------------------
# 4. ENDPOINTS DE CUENTAS POR PAGAR (CxP PROVEEDORES)
# ------------------------------------------------------------------------------
@router.get("/cxp")
def get_payables(db: Session = Depends(get_db)):
    rows = db.query(AccountPayable).order_by(AccountPayable.due_date.asc()).all()
    return [{
        "id": p.id,
        "invoice_number": p.invoice_number,
        "supplier_name": p.supplier_name,
        "project_name": p.project.name if p.project else "Sede Central",
        "payable_type": p.payable_type,
        "description": p.description,
        "issue_date": p.issue_date.strftime("%Y-%m-%d"),
        "due_date": p.due_date.strftime("%Y-%m-%d"),
        "amount_usd": p.amount_usd,
        "paid_amount_usd": p.paid_amount_usd,
        "balance_usd": p.balance_usd,
        "status": p.status
    } for p in rows]

@router.post("/cxp")
def create_payable(p_in: PayableCreate, db: Session = Depends(get_db)):
    amount_bs = p_in.amount_usd * p_in.exchange_rate
    new_p = AccountPayable(
        invoice_number=p_in.invoice_number.strip(),
        supplier_name=p_in.supplier_name.strip(),
        project_id=p_in.project_id,
        category_id=p_in.category_id,
        payable_type=p_in.payable_type,
        description=p_in.description.strip(),
        due_date=p_in.due_date,
        amount_usd=p_in.amount_usd,
        amount_bs=amount_bs,
        exchange_rate=p_in.exchange_rate,
        balance_usd=p_in.amount_usd,
        status="pendiente",
        notes=p_in.notes
    )
    db.add(new_p)
    db.commit()
    db.refresh(new_p)
    return {"success": True, "message": "Cuenta por pagar registrada con éxito.", "id": new_p.id}

@router.post("/cxp/{payable_id}/payment")
def record_cxp_payment(payable_id: int, p_in: PaymentCreate, db: Session = Depends(get_db)):
    p = db.query(AccountPayable).filter(AccountPayable.id == payable_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Deuda no encontrada.")

    if p_in.amount_usd <= 0:
        raise HTTPException(status_code=400, detail="El monto del pago debe ser mayor a cero.")

    if p_in.amount_usd > p.balance_usd:
        raise HTTPException(status_code=400, detail=f"El pago (${p_in.amount_usd}) supera la deuda (${p.balance_usd}).")

    payment = FinancialPayment(
        payment_type="cxp_pago",
        payable_id=p.id,
        amount_usd=p_in.amount_usd,
        amount_bs=p_in.amount_usd * p_in.exchange_rate,
        exchange_rate=p_in.exchange_rate,
        payment_method=p_in.payment_method,
        reference_number=p_in.reference_number,
        notes=p_in.notes
    )
    db.add(payment)

    p.paid_amount_usd += p_in.amount_usd
    p.balance_usd -= p_in.amount_usd
    if p.balance_usd <= 0:
        p.status = "pagado_total"
    else:
        p.status = "abono_parcial"

    db.commit()
    return {"success": True, "message": "Pago aplicado con éxito.", "new_balance_usd": p.balance_usd, "status": p.status}
