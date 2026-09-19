from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload, selectinload
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
    FixedExpenseSetting,
    AuditLog
)
from app.api.deps import require_roles

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

class PayableCreate(BaseModel):
    invoice_number: str
    supplier_name: str
    project_id: Optional[int] = None
    category_id: Optional[int] = None
    payable_type: str = "costo_material_obra" # costo_material_obra, gasto_fijo_sede, stock_almacen
    description: str
    due_date: datetime
    amount_usd: float # Total Factura
    taxable_base_usd: Optional[float] = 0.0
    tax_amount_usd: Optional[float] = 0.0
    tax_withholding_rate: Optional[float] = 75.0
    tax_withholding_usd: Optional[float] = 0.0
    islr_rate: Optional[float] = 2.0
    islr_withholding_usd: Optional[float] = 0.0
    tax_retained_usd: Optional[float] = 0.0
    net_amount_usd: Optional[float] = 0.0
    exchange_rate: float = 800.0
    notes: Optional[str] = None

class PaymentCreate(BaseModel):
    payment_type: Optional[str] = "cxc_cobro" # cxc_cobro, cxp_pago
    target_id: Optional[int] = None # receivable_id o payable_id
    amount_usd: float
    payment_method: str = "transferencia" # transferencia, efectivo_usd, retencion_iva, retencion_islr, zelle, pago_movil
    voucher_number: Optional[str] = None # N° comprobante de retención o referencia
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
    # 1. Cuentas por Cobrar (CxC Clientes) - Eager load client to eliminate N+1 in alerts
    r_query = db.query(AccountReceivable).options(joinedload(AccountReceivable.client)).all()
    total_invoiced_cxc = sum(r.amount_usd for r in r_query)
    total_collected_cxc = sum(r.paid_amount_usd for r in r_query)
    pending_cxc = sum(r.balance_usd for r in r_query)

    # 2. Cuentas por Pagar (CxP Proveedores)
    p_query = db.query(AccountPayable).all()
    total_invoiced_cxp = sum(p.amount_usd for p in p_query)
    total_paid_cxp = sum(p.paid_amount_usd for p in p_query)
    pending_cxp = sum(p.balance_usd for p in p_query)

    # 3. Gastos Directos y de Oficina
    all_expenses = db.query(Expense).filter(Expense.status == "aprobado").all()
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
            "net_margin_percent": net_margin_pct
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
    
    # 1. Buscar facturas/valuaciones pendientes de este cliente (y proyecto si aplica)
    query = db.query(AccountReceivable).filter(
        AccountReceivable.client_id == p_in.client_id,
        AccountReceivable.balance_usd > 0.01
    )
    if p_in.project_id:
        query = query.filter(AccountReceivable.project_id == p_in.project_id)
    
    open_receivables = query.order_by(AccountReceivable.due_date.asc(), AccountReceivable.id.asc()).all()
    
    remaining_to_apply = p_in.amount_usd
    applied_to_any = False
    
    for r in open_receivables:
        if remaining_to_apply <= 0.001:
            break
        
        apply_amount = min(remaining_to_apply, r.balance_usd)
        payment = FinancialPayment(
            payment_type="cxc_cobro",
            receivable_id=r.id,
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

    # Si sobra monto o no había facturas pendientes, registrar como anticipo
    if remaining_to_apply > 0.01 or not applied_to_any:
        adv_payment = FinancialPayment(
            payment_type="cxc_anticipo",
            receivable_id=open_receivables[0].id if open_receivables else None,
            amount_usd=remaining_to_apply if applied_to_any else p_in.amount_usd,
            amount_bs=round((remaining_to_apply if applied_to_any else p_in.amount_usd) * rate, 2),
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
        "date": r.withdrawal_date.strftime("%Y-%m-%d %H:%M")
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
        .order_by(AccountReceivable.due_date.asc())
    )
    is_paginated = page is not None and isinstance(page, int)
    total = query.count() if is_paginated else None
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

@router.post("/cxc")
def create_receivable(r_in: ReceivableCreate, db: Session = Depends(get_db)):
    try:
        existing = db.query(AccountReceivable).filter(AccountReceivable.invoice_number == r_in.invoice_number.strip()).first()
        inv_number = r_in.invoice_number.strip()
        if existing:
            base_inv = inv_number
            count = db.query(AccountReceivable).filter(AccountReceivable.invoice_number.like(f"{base_inv}%")).count()
            inv_number = f"{base_inv}-{count+1:02d}"

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
@router.get("/cxp")
def get_payables(
    page: Optional[int] = Query(None, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    query = (
        db.query(AccountPayable)
        .options(
            joinedload(AccountPayable.project),
            selectinload(AccountPayable.payments)
        )
        .order_by(AccountPayable.due_date.asc())
    )
    is_paginated = page is not None and isinstance(page, int)
    total = query.count() if is_paginated else None
    rows = query.offset((page - 1) * page_size).limit(page_size).all() if is_paginated else query.all()

    items = [{
        "id": p.id,
        "invoice_number": p.invoice_number,
        "supplier_name": p.supplier_name,
        "project_name": p.project.name if p.project else "Sede Central",
        "payable_type": p.payable_type,
        "description": p.description,
        "issue_date": p.issue_date.strftime("%Y-%m-%d"),
        "due_date": p.due_date.strftime("%Y-%m-%d"),
        "amount_usd": p.amount_usd,
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
            "amount_usd": pm.amount_usd,
            "voucher_number": pm.voucher_number or pm.reference_number,
            "payment_date": pm.payment_date.strftime("%d/%m/%Y"),
            "notes": pm.notes
        } for pm in p.payments]
    } for r, p in enumerate(rows)]

    if is_paginated:
        return {
            "items": items,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size if page_size > 0 else 1
        }
    return items

@router.post("/cxp")
def create_payable(p_in: PayableCreate, db: Session = Depends(get_db)):
    base_usd = p_in.taxable_base_usd if p_in.taxable_base_usd > 0 else round(p_in.amount_usd / 1.16, 2)
    tax_usd = p_in.tax_amount_usd if p_in.tax_amount_usd > 0 else round(p_in.amount_usd - base_usd, 2)
    ret_iva_usd = p_in.tax_withholding_usd if p_in.tax_withholding_usd > 0 else round(tax_usd * ((p_in.tax_withholding_rate or 75.0) / 100.0), 2)
    ret_islr_usd = p_in.islr_withholding_usd if p_in.islr_withholding_usd > 0 else round(base_usd * ((p_in.islr_rate or 2.0) / 100.0), 2)
    net_usd = p_in.net_amount_usd if p_in.net_amount_usd > 0 else round(p_in.amount_usd - ret_iva_usd - ret_islr_usd, 2)

    amount_bs = p_in.amount_usd * p_in.exchange_rate
    new_p = AccountPayable(
        invoice_number=p_in.invoice_number.strip(),
        supplier_name=p_in.supplier_name.strip(),
        project_id=p_in.project_id,
        category_id=p_in.category_id,
        payable_type=p_in.payable_type,
        description=p_in.description.strip(),
        due_date=p_in.due_date,
        taxable_base_usd=base_usd,
        tax_amount_usd=tax_usd,
        tax_withholding_rate=p_in.tax_withholding_rate or 75.0,
        tax_withholding_usd=ret_iva_usd,
        islr_rate=p_in.islr_rate or 2.0,
        islr_withholding_usd=ret_islr_usd,
        net_amount_usd=net_usd,
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
    return {"success": True, "message": "Cuenta por pagar registrada con éxito con retenciones SENIAT.", "id": new_p.id}

@router.post("/cxp/{payable_id}/payment")
def record_cxp_payment(payable_id: int, p_in: PaymentCreate, db: Session = Depends(get_db)):
    p = db.query(AccountPayable).filter(AccountPayable.id == payable_id).with_for_update().first()
    if not p:
        raise HTTPException(status_code=404, detail="Deuda no encontrada.")

    if p_in.amount_usd <= 0:
        raise HTTPException(status_code=400, detail="El monto del pago debe ser mayor a cero.")

    if p_in.amount_usd > (p.balance_usd + 0.05):
        raise HTTPException(status_code=400, detail=f"El pago (${p_in.amount_usd}) supera la deuda (${p.balance_usd}).")

    # 🛡️ Idempotencia Transaccional: Rechazar duplicación de la misma referencia
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

    payment = FinancialPayment(
        payment_type=p_in.payment_type or "cxp_pago",
        payable_id=p.id,
        amount_usd=p_in.amount_usd,
        amount_bs=p_in.amount_usd * p_in.exchange_rate,
        exchange_rate=p_in.exchange_rate,
        payment_method=p_in.payment_method,
        voucher_number=p_in.voucher_number or p_in.reference_number,
        reference_number=p_in.reference_number,
        notes=p_in.notes
    )
    db.add(payment)

    p.paid_amount_usd += p_in.amount_usd
    p.balance_usd = max(0.0, round(p.balance_usd - p_in.amount_usd, 2))
    if p.balance_usd <= 0.01:
        p.status = "pagado_total"
    else:
        p.status = "abono_parcial"

    db.commit()
    return {"success": True, "message": "Pago / Comprobante de retención aplicado con éxito.", "new_balance_usd": p.balance_usd, "status": p.status}

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
