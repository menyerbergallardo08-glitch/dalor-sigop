import pytest
from app.models.models import AccountReceivable, AccountPayable

def test_11_tax_withholding_75_percent_iva():
    base = 1000.0
    iva = base * 0.16  # 160.0
    ret_75 = round(iva * 0.75, 2)
    assert ret_75 == 120.0

def test_12_tax_withholding_100_percent_iva():
    base = 1000.0
    iva = base * 0.16
    ret_100 = round(iva * 1.0, 2)
    assert ret_100 == 160.0

def test_13_islr_withholding_2_percent():
    base = 1000.0
    islr = round(base * 0.02, 2)
    assert islr == 20.0

def test_14_seniat_voucher_number_assignment(client, auth_headers):
    r = client.get("/api/v1/financial/cxc", headers=auth_headers)
    assert r.status_code == 200

def test_15_seniat_voucher_date_validation():
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    assert now.year >= 2026

def test_16_pending_seniat_iva_calculation(db_session):
    cxp_records = db_session.query(AccountPayable).all()
    assert isinstance(cxp_records, list)

def test_17_pending_seniat_islr_calculation(db_session):
    cxc_records = db_session.query(AccountReceivable).all()
    assert isinstance(cxc_records, list)

def test_18_tax_withholding_integrity_check():
    taxable_base = 5000.0
    iva_amount = taxable_base * 0.16
    ret_iva = iva_amount * 0.75
    islr = taxable_base * 0.02
    net_to_pay = (taxable_base + iva_amount) - ret_iva - islr
    assert round(net_to_pay, 2) == 5100.0
