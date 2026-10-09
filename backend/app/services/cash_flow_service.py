"""
Servicio especializado para cálculo de Tesorería, Flujo de Caja Operativo y Mesa de Cambio.
Maneja consolidación de saldos de cuentas, conciliación de cobros/pagos,
arbitraje cambiario multi-divisa y proyección de la matriz de liquidez a 12 meses.
"""
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from sqlalchemy.orm import Session, joinedload, selectinload
from sqlalchemy import func, text
from fastapi import HTTPException

from app.models.models import (
    FinancialAccount,
    FinancialPayment,
    AccountReceivable,
    AccountPayable,
    Expense,
    PartnerWithdrawal,
    FixedExpenseSetting,
    AuditLog,
    Project,
    Client,
    User as UserModel
)
from app.services.bcv_scraper import BCVExchangeRateService

class CashFlowService:

    @classmethod
    def calculate_financial_summary(
        cls,
        db: Session,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
        account_id: Optional[int] = None
    ) -> Dict[str, Any]:
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

        # 0. Saldo Inicial / Apertura de Cuentas Bancarias y Cajas
        init_bal_q = db.query(FinancialPayment).filter(FinancialPayment.payment_type == "saldo_inicial")
        if account_id:
            if acc_name_tag:
                init_bal_q = init_bal_q.filter((FinancialPayment.financial_account_id == account_id) | (FinancialPayment.bank_account.ilike(f"%{acc_name_tag}%")))
            else:
                init_bal_q = init_bal_q.filter(FinancialPayment.financial_account_id == account_id)
        total_initial_balance = sum(p.amount_usd for p in init_bal_q.all())

        # 6. Saldo Líquido Real en Caja / Bancos Disponible (incluye saldos iniciales + flujos operativos + mesa de cambio)
        net_operating_cash = total_initial_balance + total_collected_cxc - cxp_bank_outflows - total_direct_expenses - total_partner_withdrawals + net_exchange_diff

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
                "total_initial_balance_usd": round(total_initial_balance, 2),
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


    @classmethod
    def execute_direct_collection(
        cls,
        db: Session,
        p_in: Any,
        current_user: Optional[UserModel] = None
    ) -> Dict[str, Any]:
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

        # REGLA ESTRICTA CXC: Todo abono debe estar estrictamente asociado a una factura existente con saldo pendiente
        if not open_receivables:
            raise HTTPException(
                status_code=400,
                detail="No es posible registrar un abono: El cliente no posee facturas ni valuaciones con saldo pendiente. Todo abono debe aplicarse a una factura creada previamente."
            )

        total_pending = sum(r.balance_usd for r in open_receivables)
        if p_in.amount_usd > round(total_pending + 0.05, 2):
            raise HTTPException(
                status_code=400,
                detail=f"El monto del abono (${p_in.amount_usd:,.2f}) excede la deuda exigible pendiente del cliente (${total_pending:,.2f}). Todo cobro debe aplicarse estrictamente contra facturas existentes."
            )

        remaining_to_apply = p_in.amount_usd
    
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

        db.commit()
        return {
            "success": True,
            "message": f"Cobro / Abono de ${p_in.amount_usd:,.2f} USD aplicado exitosamente a facturas del cliente.",
            "receipt_number": ref_num
        }


    @classmethod
    def execute_currency_exchange(
        cls,
        db: Session,
        req: Any,
        current_user: Optional[UserModel] = None
    ) -> Dict[str, Any]:
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


    @classmethod
    def generate_cash_flow_matrix(
        cls,
        db: Session,
        year: Optional[int] = 2026,
        month: Optional[int] = None,
        start_month: Optional[int] = 1,
        end_month: Optional[int] = 12,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        is_ytd: Optional[bool] = False
    ) -> Dict[str, Any]:
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
