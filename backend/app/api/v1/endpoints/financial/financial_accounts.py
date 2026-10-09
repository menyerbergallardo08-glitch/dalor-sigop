from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime, timedelta
from typing import List, Optional
from pydantic import BaseModel

from app.core.database import get_db
from app.models.models import (
    FinancialAccount,
    FinancialPayment,
    Expense,
    PartnerWithdrawal,
    User as UserModel
)
from app.api.deps import get_current_user
from app.schemas.schemas import (
    FinancialAccountCreate, FinancialAccountUpdate, FinancialAccountOut
)

router = APIRouter()

# ------------------------------------------------------------------------------
# 1. COTIZACIÓN OFICIAL BCV (SCRAPING AUTOMATIZADO CON FAIL-SAFE EN 4 CAPAS)
# ------------------------------------------------------------------------------
@router.get("/bcv-rate")
@router.get("/bcv-rate/")
@router.get("/exchange-rate")
@router.get("/exchange-rate/")
def get_bcv_rate(force_refresh: bool = False):
    from app.services.bcv_scraper import BCVExchangeRateService
    rate_info = BCVExchangeRateService.get_current_rate(force_refresh=force_refresh)
    return rate_info

def _persist_daily_bcv_rate(db: Session, rate_info: dict):
    """
    Persiste o actualiza automáticamente la tasa oficial del día en la tabla bcv_rate_history.
    """
    if not rate_info or not rate_info.get("rate"):
        return
    try:
        # Hora de Venezuela (UTC - 4)
        ve_today = (datetime.utcnow() - timedelta(hours=4)).strftime("%Y-%m-%d")
        rate_val = round(float(rate_info["rate"]), 2)
        source_val = rate_info.get("source") or "BCV Oficial"

        existing = db.execute(
            text("SELECT id, rate FROM bcv_rate_history WHERE rate_date = :d"),
            {"d": ve_today}
        ).fetchone()

        if existing:
            if abs(float(existing[1]) - rate_val) > 0.001:
                db.execute(
                    text("UPDATE bcv_rate_history SET rate = :r, source = :s WHERE id = :id"),
                    {"r": rate_val, "s": source_val, "id": existing[0]}
                )
                db.commit()
        else:
            db.execute(
                text("INSERT INTO bcv_rate_history (rate_date, rate, source, created_at) VALUES (:d, :r, :s, CURRENT_TIMESTAMP)"),
                {"d": ve_today, "r": rate_val, "s": source_val}
            )
            db.commit()
    except Exception as e:
        db.rollback()
        print(f"[BCV Persistence] Error guardando tasa diaria: {e}")

@router.post("/bcv-rate/sync")
@router.post("/bcv-rate/sync/")
def sync_bcv_rate(db: Session = Depends(get_db)):
    from app.services.bcv_scraper import BCVExchangeRateService
    rate_info = BCVExchangeRateService.get_current_rate(force_refresh=True)
    _persist_daily_bcv_rate(db, rate_info)
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
        if live_info and live_info.get("rate"):
            _persist_daily_bcv_rate(db, live_info)
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
            "current_date": live_info.get("date_value") if live_info else (rates[0]["rate_date"] if rates else datetime.utcnow().strftime("%Y-%m-%d")),
            "history": rates
        }
    except Exception:
        return {
            "success": True,
            "current_rate": live_info.get("rate") if live_info else 855.66,
            "current_date": datetime.utcnow().strftime("%Y-%m-%d"),
            "history": []
        }

# ------------------------------------------------------------------------------
# 2. CUENTAS BANCARIAS Y CAJAS PERSONALIZADAS
# ------------------------------------------------------------------------------
@router.get("/accounts", response_model=List[FinancialAccountOut])
def list_financial_accounts(db: Session = Depends(get_db), current_user: UserModel = Depends(get_current_user)):
    """Lista todas las cuentas bancarias y cajas con su saldo inicial y saldo actual calculado."""
    accounts = db.query(FinancialAccount).order_by(FinancialAccount.sort_order, FinancialAccount.id).all()
    for acc in accounts:
        # Saldo inicial registrado
        init_p = db.query(FinancialPayment).filter(
            FinancialPayment.financial_account_id == acc.id,
            FinancialPayment.payment_type == "saldo_inicial"
        ).first()
        init_usd = float(init_p.amount_usd or 0.0) if init_p else 0.0
        init_bs = float(init_p.amount_bs or 0.0) if init_p else 0.0
        init_date = init_p.payment_date.strftime("%Y-%m-%d") if (init_p and init_p.payment_date) else None

        # 1. Cobros CxC en esta cuenta
        cxc_in = db.query(FinancialPayment).filter(
            (FinancialPayment.financial_account_id == acc.id) | (FinancialPayment.bank_account.ilike(f"%{acc.name}%")),
            FinancialPayment.receivable_id.isnot(None)
        ).all()
        tot_cxc = sum(float(p.amount_usd or 0.0) for p in cxc_in)

        # 2. Pagos CxP en esta cuenta (excluyendo retenciones que no son salida bancaria)
        cxp_out = db.query(FinancialPayment).filter(
            (FinancialPayment.financial_account_id == acc.id) | (FinancialPayment.bank_account.ilike(f"%{acc.name}%")),
            FinancialPayment.payable_id.isnot(None),
            FinancialPayment.payment_method.notin_(["retencion_iva", "retencion_islr"])
        ).all()
        tot_cxp = sum(float(p.amount_usd or 0.0) for p in cxp_out)

        # 3. Gastos operativos directos
        exp_out = db.query(Expense).filter(Expense.financial_account_id == acc.id, Expense.status == "aprobado").all()
        tot_exp = sum(float(e.amount_usd or 0.0) for e in exp_out)

        # 4. Retiros de socios
        pw_out = db.query(PartnerWithdrawal).filter(PartnerWithdrawal.financial_account_id == acc.id).all()
        tot_pw = sum(float(w.amount_usd or 0.0) for w in pw_out)

        # 5. Mesa de cambio (ingresos / egresos)
        ex_in = db.query(FinancialPayment).filter(
            (FinancialPayment.financial_account_id == acc.id) | (FinancialPayment.bank_account.ilike(f"%{acc.name}%")),
            FinancialPayment.payment_type == "cambio_divisa_ingreso"
        ).all()
        tot_ex_in = sum(float(p.amount_usd or 0.0) for p in ex_in)

        ex_out = db.query(FinancialPayment).filter(
            (FinancialPayment.financial_account_id == acc.id) | (FinancialPayment.bank_account.ilike(f"%{acc.name}%")),
            FinancialPayment.payment_type == "cambio_divisa_egreso"
        ).all()
        tot_ex_out = sum(float(p.amount_usd or 0.0) for p in ex_out)

        # Cálculo de saldo disponible en cuenta
        cur_balance = round(init_usd + tot_cxc - tot_cxp - tot_exp - tot_pw + (tot_ex_in - tot_ex_out), 2)

        acc.initial_balance = init_usd
        acc.initial_balance_bs = init_bs
        acc.initial_balance_date = init_date
        acc.current_balance = cur_balance

    return accounts

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

class InitialBalanceIn(BaseModel):
    balance_amount: float
    currency: str = "USD" # "USD" o "BS"
    exchange_rate: Optional[float] = 859.06
    notes: Optional[str] = "Saldo de apertura / saldo inicial"
    operation_date: Optional[datetime] = None

@router.post("/accounts/{account_id}/initial-balance")
def set_account_initial_balance(account_id: int, data: InitialBalanceIn, db: Session = Depends(get_db)):
    """Registra o actualiza el saldo inicial de apertura para una cuenta o caja."""
    acc = db.query(FinancialAccount).filter(FinancialAccount.id == account_id).first()
    if not acc:
        raise HTTPException(status_code=404, detail="Cuenta no encontrada.")
    
    existing_init = db.query(FinancialPayment).filter(
        FinancialPayment.financial_account_id == acc.id,
        FinancialPayment.payment_type == "saldo_inicial"
    ).first()
    
    rate = data.exchange_rate or 859.06
    if data.currency.upper() == "USD":
        amt_usd = data.balance_amount
        amt_bs = round(data.balance_amount * rate, 2)
    else:
        amt_bs = data.balance_amount
        amt_usd = round(data.balance_amount / rate, 2) if rate > 0 else 0.0

    if existing_init:
        existing_init.amount_usd = amt_usd
        existing_init.amount_bs = amt_bs
        existing_init.exchange_rate = rate
        existing_init.payment_date = data.operation_date or datetime.utcnow()
        existing_init.notes = data.notes or "Saldo de apertura / saldo inicial"
    else:
        init_pmt = FinancialPayment(
            payment_type="saldo_inicial",
            voucher_number=f"SI-{acc.id}-{datetime.utcnow().year}",
            bank_account=acc.name,
            financial_account_id=acc.id,
            payment_date=data.operation_date or datetime.utcnow(),
            payment_method="saldo_inicial",
            reference_number="SALDO-INICIAL",
            amount_usd=amt_usd,
            amount_bs=amt_bs,
            exchange_rate=rate,
            notes=data.notes or "Saldo de apertura / saldo inicial"
        )
        db.add(init_pmt)
    
    db.commit()
    return {
        "success": True,
        "message": f"Saldo inicial registrado exitosamente para la cuenta {acc.name}: {data.currency} {data.balance_amount:,.2f}",
        "account_id": acc.id,
        "amount_usd": amt_usd,
        "amount_bs": amt_bs
    }
