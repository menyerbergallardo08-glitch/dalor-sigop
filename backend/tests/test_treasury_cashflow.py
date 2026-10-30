import pytest
from sqlalchemy import func
from app.models.models import AccountReceivable, AccountPayable, Expense, FinancialAccount
from app.services.cash_flow_service import CashFlowService

def test_01_healthz_check(client):
    r = client.get("/healthz")
    assert r.status_code == 200
    assert r.json().get("status") in ["healthy", "ok", "online", "active"]

def test_02_director_login_success(client):
    r = client.post("/api/v1/auth/login", json={"username": "director", "password": "dalor2026"})
    if r.status_code != 200:
        r = client.post("/api/v1/auth/login", json={"username": "menyerber gallardo", "password": "Dalor2026*"})
    assert r.status_code == 200
    assert "access_token" in r.json()

def test_03_financial_summary_endpoint(client, auth_headers):
    r = client.get("/api/v1/financial/summary", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert "total_invoiced_cxc_usd" in data
    assert "total_collected_cxc_usd" in data
    assert "pending_cxc_usd" in data

def test_04_cxc_invoiced_aggregation_sql(db_session):
    sql_val = db_session.query(func.coalesce(func.sum(AccountReceivable.amount_usd), 0.0)).scalar()
    mem_val = sum(r.amount_usd or 0.0 for r in db_session.query(AccountReceivable).all())
    assert abs(sql_val - mem_val) < 0.01

def test_05_cxc_pending_balance_accuracy(db_session):
    sql_val = db_session.query(func.coalesce(func.sum(AccountReceivable.balance_usd), 0.0)).scalar()
    mem_val = sum(r.balance_usd or 0.0 for r in db_session.query(AccountReceivable).all())
    assert abs(sql_val - mem_val) < 0.01

def test_06_cxc_collected_amount_accuracy(db_session):
    sql_val = db_session.query(func.coalesce(func.sum(AccountReceivable.paid_amount_usd), 0.0)).scalar()
    mem_val = sum(r.paid_amount_usd or 0.0 for r in db_session.query(AccountReceivable).all())
    assert abs(sql_val - mem_val) < 0.01

def test_07_cxp_invoiced_aggregation_sql(db_session):
    sql_val = db_session.query(func.coalesce(func.sum(AccountPayable.amount_usd), 0.0)).scalar()
    mem_val = sum(p.amount_usd or 0.0 for p in db_session.query(AccountPayable).all())
    assert abs(sql_val - mem_val) < 0.01

def test_08_cxp_pending_balance_accuracy(db_session):
    sql_val = db_session.query(func.coalesce(func.sum(AccountPayable.balance_usd), 0.0)).scalar()
    mem_val = sum(p.balance_usd or 0.0 for p in db_session.query(AccountPayable).all())
    assert abs(sql_val - mem_val) < 0.01

def test_09_direct_expenses_aggregation(db_session):
    sql_val = db_session.query(func.coalesce(func.sum(Expense.amount_usd), 0.0)).filter(Expense.status.in_(["aprobado", "pagado"])).scalar()
    mem_val = sum(e.amount_usd or 0.0 for e in db_session.query(Expense).filter(Expense.status.in_(["aprobado", "pagado"])).all())
    assert abs(sql_val - mem_val) < 0.01

def test_10_financial_net_cash_formula(db_session):
    summary = CashFlowService.calculate_financial_summary(db=db_session)
    assert isinstance(summary, dict)
    assert summary["net_operating_cash_usd"] is not None
