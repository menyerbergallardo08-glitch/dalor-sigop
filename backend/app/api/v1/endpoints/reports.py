from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.models.models import Project, Expense, ExpenseCategory, Asset, Personnel

router = APIRouter()

@router.get("/comparison-dashboard")
def get_comparison_dashboard(db: Session = Depends(get_db)):
    """
    Tablero comparativo multi-proyecto con métricas financieras y CPI (Cost Performance Index)
    """
    projects = db.query(Project).filter(Project.is_active == True).all()
    
    total_contracted_global = sum(p.contract_amount_usd for p in projects)
    total_spent_global = 0.0
    
    project_metrics = []

    for p in projects:
        # Sumar gastos de este proyecto
        exp_sum = db.query(func.sum(Expense.amount_usd)).filter(Expense.project_id == p.id).scalar() or 0.0
        exp_count = db.query(func.count(Expense.id)).filter(Expense.project_id == p.id).scalar() or 0
        total_spent_global += exp_sum

        gross_margin_usd = p.contract_amount_usd - exp_sum
        gross_margin_pct = round((gross_margin_usd / p.contract_amount_usd * 100), 1) if p.contract_amount_usd > 0 else 0.0
        
        # Desglose de gasto real por categoría para este proyecto
        cat_breakdown = db.query(
            ExpenseCategory.name,
            ExpenseCategory.code,
            func.sum(Expense.amount_usd).label("total")
        ).join(Expense, Expense.category_id == ExpenseCategory.id)\
         .filter(Expense.project_id == p.id)\
         .group_by(ExpenseCategory.id).all()

        consumed_pct = round((exp_sum / p.budget_limit_usd * 100), 1) if p.budget_limit_usd > 0 else 0.0

        # Semáforo de Desviación
        health = "VERDE_RENTABLE"
        if exp_sum > p.budget_limit_usd and p.budget_limit_usd > 0:
            health = "ROJO_SOBRECOSTO"
        elif consumed_pct >= 80:
            health = "AMARILLO_ALERTA"

        # CPI (Cost Performance Index)
        cpi = round((p.contract_amount_usd / (exp_sum if exp_sum > 0 else 1.0)), 2)

        project_metrics.append({
            "project_id": p.id,
            "project_code": p.code,
            "project_name": p.name,
            "client_name": p.client_name or "Cliente General",
            "location": p.location,
            "status": p.status,
            "contract_amount_usd": p.contract_amount_usd,
            "budget_limit_usd": p.budget_limit_usd,
            "actual_spent_usd": round(exp_sum, 2),
            "gross_margin_usd": round(gross_margin_usd, 2),
            "gross_margin_percent": gross_margin_pct,
            "budget_consumed_percent": consumed_pct,
            "cpi_index": cpi,
            "health_status": health,
            "expenses_count": exp_count,
            "categories_spent": [{"code": c.code, "name": c.name, "total": round(c.total, 2)} for c in cat_breakdown]
        })

    net_margin_global = total_contracted_global - total_spent_global
    global_margin_pct = round((net_margin_global / total_contracted_global * 100), 1) if total_contracted_global > 0 else 0.0

    return {
        "global_summary": {
            "active_projects_count": len(projects),
            "total_contracted_usd": round(total_contracted_global, 2),
            "total_spent_usd": round(total_spent_global, 2),
            "net_margin_usd": round(net_margin_global, 2),
            "global_margin_percent": global_margin_pct
        },
        "projects_comparison": project_metrics
    }

@router.get("/company-overview")
def get_company_overview(db: Session = Depends(get_db)):
    return get_comparison_dashboard(db)
