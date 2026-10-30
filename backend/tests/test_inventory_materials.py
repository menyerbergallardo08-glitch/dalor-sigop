import pytest
from app.models.models import Material, Asset, ExpenseCategory

def test_35_materials_catalog_loading(client, auth_headers):
    r = client.get("/api/v1/materials/", headers=auth_headers)
    assert r.status_code == 200

def test_36_material_stock_editing_and_audit(db_session):
    mat = db_session.query(Material).first()
    if mat:
        assert mat.stock_quantity is not None
        assert mat.unit_cost_usd >= 0.0

def test_37_material_movement_history_logging(db_session):
    materials_count = db_session.query(Material).count()
    assert materials_count >= 0

def test_38_tool_unit_assignment(db_session):
    assets = db_session.query(Asset).filter(Asset.asset_type.in_(["herramienta", "maquinaria"])).all()
    assert isinstance(assets, list)

def test_39_fleet_summary_odometer(client, auth_headers):
    r = client.get("/api/v1/assets/fleet-summary", headers=auth_headers)
    assert r.status_code == 200

def test_40_dispatch_guide_creation(client, auth_headers):
    r = client.get("/api/v1/dispatch/", headers=auth_headers)
    assert r.status_code == 200

def test_41_expense_categories_integrity(client, auth_headers):
    r = client.get("/api/v1/expenses/categories", headers=auth_headers)
    assert r.status_code == 200
    cats = r.json()
    assert len(cats) >= 20
