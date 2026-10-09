"""
Servicio especializado para cálculo y agregación de Business Intelligence y métricas ejecutivas.
Consolida datos reales de proyectos, contratos, cobranzas, compras, inventario y P&L.
"""
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime

from app.models.models import (
    Client,
    Project,
    AccountReceivable,
    FinancialPayment,
    AccountPayable,
    Expense,
    MaterialMovement,
    ExpenseCategory
)

class BIMetricsService:

    @staticmethod
    def classify_venezuela_region(location_str: str, client_address: str = None) -> str:
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

    @classmethod
    def calculate_executive_bi_metrics(
        cls,
        db: Session,
        year: Optional[str] = None,
        client_id: Optional[int] = None,
        region: Optional[str] = None
    ) -> Dict[str, Any]:
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
                if cls.classify_venezuela_region(p.location, all_clients.get(p.client_id, None).address if all_clients.get(p.client_id) else None) == region
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
            reg_key = cls.classify_venezuela_region(p.location, cli.address if cli else None)
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
                "region": cls.classify_venezuela_region(p.location, cli.address if cli else None),
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
