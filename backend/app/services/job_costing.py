from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.project import Project, CostCenter
from app.models.expense import ExpenseEntry
from app.models.category import ExpenseCategory
from typing import Dict, Any, List

class JobCostingService:
    @staticmethod
    def get_project_financial_summary(db: Session, project_id: int) -> Dict[str, Any]:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            return {}

        # 1. Total de Gastos Imputados al Proyecto
        expenses = db.query(ExpenseEntry).filter(ExpenseEntry.project_id == project_id).all()
        total_spent_usd = sum(e.amount_usd for e in expenses)

        # 2. Desglose por Grupo de Costos
        breakdown_by_category = {}
        for exp in expenses:
            cat_name = exp.category.name if exp.category else "Sin Categoría"
            cat_code = exp.category.code if exp.category else "0.0"
            group = exp.category.group_type if exp.category else "otros"
            
            if cat_name not in breakdown_by_category:
                breakdown_by_category[cat_name] = {
                    "code": cat_code,
                    "group": group,
                    "total_usd": 0.0,
                    "count": 0
                }
            breakdown_by_category[cat_name]["total_usd"] += exp.amount_usd
            breakdown_by_category[cat_name]["count"] += 1

        # 3. Cálculo de Márgenes
        contract_amount = project.contract_amount_usd or 0.0
        budget_limit = project.budget_limit_usd or 0.0
        gross_profit_usd = contract_amount - total_spent_usd
        gross_margin_percent = (gross_profit_usd / contract_amount * 100.0) if contract_amount > 0 else 0.0
        budget_consumed_percent = (total_spent_usd / budget_limit * 100.0) if budget_limit > 0 else 0.0

        # 4. Estado de Alerta Presupuestaria
        alert_status = "APTO"
        if budget_limit > 0:
            if total_spent_usd > budget_limit:
                alert_status = "CRÍTICO_EXCEDIDO"
            elif budget_consumed_percent >= 80.0:
                alert_status = "PRECAUCIÓN"

        return {
            "project_id": project.id,
            "project_code": project.code,
            "project_name": project.name,
            "client_name": project.client_name,
            "partner_involved": project.partner_involved,
            "status": project.status,
            "contract_amount_usd": round(contract_amount, 2),
            "budget_limit_usd": round(budget_limit, 2),
            "total_spent_usd": round(total_spent_usd, 2),
            "budget_remaining_usd": round(budget_limit - total_spent_usd, 2),
            "budget_consumed_percent": round(budget_consumed_percent, 2),
            "gross_profit_usd": round(gross_profit_usd, 2),
            "gross_margin_percent": round(gross_margin_percent, 2),
            "alert_status": alert_status,
            "breakdown_by_category": list(breakdown_by_category.values()),
            "total_expenses_count": len(expenses)
        }

    @staticmethod
    def get_global_company_summary(db: Session) -> Dict[str, Any]:
        """
        Resumen financiero general para Dalor y reporte de auditoría consolidado
        """
        all_expenses = db.query(ExpenseEntry).all()
        total_global_spent_usd = sum(e.amount_usd for e in all_expenses)
        
        # Gastos con Alerta / Sobreprecio
        alerted_expenses = [e for e in all_expenses if e.alert_flag]
        
        # Proyectos activos
        projects = db.query(Project).all()
        project_summaries = [JobCostingService.get_project_financial_summary(db, p.id) for p in projects]

        return {
            "total_company_spent_usd": round(total_global_spent_usd, 2),
            "active_projects_count": len([p for p in projects if p.status == 'en_ejecucion']),
            "alerted_expenses_count": len(alerted_expenses),
            "alerted_expenses_total_usd": round(sum(e.amount_usd for e in alerted_expenses), 2),
            "projects": project_summaries
        }
