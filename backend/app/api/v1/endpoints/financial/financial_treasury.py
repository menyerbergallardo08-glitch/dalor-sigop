"""
Router modular y ultraliviano para Tesorería, Mesa de Cambio, Retiros de Socios y Flujo de Caja.
Delega los cálculos financieros complejos y matrices a:
- app.services.cash_flow_service.CashFlowService
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel

from app.core.database import get_db
from app.models.models import (
    FinancialAccount,
    FinancialPayment,
    PartnerWithdrawal,
    AuditLog,
    User as UserModel
)
from app.api.deps import get_current_user
from app.services.cash_flow_service import CashFlowService

router = APIRouter()

# ------------------------------------------------------------------------------
# SCHEMAS
# ------------------------------------------------------------------------------
class DirectCollectionCreate(BaseModel):
    client_id: int
    amount_usd: float
    payment_method: str = "transferencia"
    financial_account_id: Optional[int] = None
    exchange_rate: Optional[float] = 800.0
    reference_number: Optional[str] = None
    notes: Optional[str] = None

class PartnerWithdrawalCreate(BaseModel):
    partner_name: str
    withdrawal_date: Optional[datetime] = None
    amount_usd: float
    amount_bs: Optional[float] = 0.0
    exchange_rate: Optional[float] = 850.0
    currency: Optional[str] = "USD"
    bank_account: Optional[str] = "Banesco USD"
    payment_method: Optional[str] = "transferencia"
    reference_number: Optional[str] = None
    notes: Optional[str] = None

class CurrencyExchangeCreate(BaseModel):
    operation_type: str  # 'bs_a_usd' | 'usd_a_bs'
    source_account: str
    target_account: str
    source_amount: float
    target_amount: float
    exchange_rate: float
    notes: Optional[str] = None
    operation_date: Optional[str] = None

# ------------------------------------------------------------------------------
# 1. RESUMEN FINANCIERO EJECUTIVO (CAJA OPERATIVA)
# ------------------------------------------------------------------------------
@router.get("/summary")
def get_financial_summary(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    account_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    Retorna el estado de tesorería en tiempo real: saldos de cuentas, CxC vivas y CxP.
    """
    return CashFlowService.calculate_financial_summary(
        db=db,
        date_from=date_from,
        date_to=date_to,
        account_id=account_id
    )

# ------------------------------------------------------------------------------
# 2. COBRANZA DIRECTA DE CLIENTE
# ------------------------------------------------------------------------------
@router.post("/direct-collection")
def direct_client_collection(
    data: DirectCollectionCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """
    Registra un abono o cobro directo de cliente hacia una cuenta bancaria.
    """
    return CashFlowService.execute_direct_collection(
        db=db,
        p_in=data,
        current_user=current_user
    )

# ------------------------------------------------------------------------------
# 3. RETIROS DE SOCIOS
# ------------------------------------------------------------------------------
@router.get("/withdrawals")
@router.get("/partners/withdrawals")
def get_partner_withdrawals(db: Session = Depends(get_db)):
    """
    Lista el histórico de retiros de socios ordenados cronológicamente.
    """
    return db.query(PartnerWithdrawal).order_by(PartnerWithdrawal.withdrawal_date.desc()).all()

@router.post("/withdrawals")
def create_partner_withdrawal(
    w_in: PartnerWithdrawalCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """
    Registra un retiro de dividendos o socio impactando la tesorería.
    """
    if w_in.amount_usd <= 0 and (w_in.amount_bs or 0) <= 0:
        raise HTTPException(status_code=400, detail="El monto del retiro debe ser mayor a cero.")

    withdrawal = PartnerWithdrawal(
        partner_name=w_in.partner_name,
        withdrawal_date=w_in.withdrawal_date or datetime.utcnow(),
        amount_usd=w_in.amount_usd,
        amount_bs=w_in.amount_bs or 0.0,
        exchange_rate=w_in.exchange_rate or 850.0,
        currency=w_in.currency or "USD",
        bank_account=w_in.bank_account,
        payment_method=w_in.payment_method,
        reference_number=w_in.reference_number,
        notes=w_in.notes
    )
    db.add(withdrawal)
    db.commit()
    db.refresh(withdrawal)
    return withdrawal

@router.delete("/partners/withdrawals/{withdrawal_id}")
def delete_partner_withdrawal(withdrawal_id: int, db: Session = Depends(get_db)):
    """
    Elimina un retiro de socio registrado.
    """
    w = db.query(PartnerWithdrawal).filter(PartnerWithdrawal.id == withdrawal_id).first()
    if not w:
        raise HTTPException(status_code=404, detail="Retiro no encontrado.")
    db.delete(w)
    db.commit()
    return {"success": True, "message": "Retiro eliminado exitosamente."}

# ------------------------------------------------------------------------------
# 4. ARBITRAJE CAMBIARIO Y TRANSFERENCIAS ENTRE CUENTAS
# ------------------------------------------------------------------------------
@router.post("/exchange")
def execute_currency_exchange(
    req: CurrencyExchangeCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """
    Ejecuta una operación de mesa de cambio debitando una cuenta y acreditando otra.
    """
    return CashFlowService.execute_currency_exchange(
        db=db,
        req=req,
        current_user=current_user
    )

@router.get("/exchanges")
def get_currency_exchanges(limit: int = 50, db: Session = Depends(get_db)):
    """
    Lista el historial de operaciones cambiarias realizadas en la mesa de dinero.
    """
    exchanges = db.query(FinancialPayment).filter(
        FinancialPayment.payment_type.in_(["cambio_divisas_salida", "cambio_divisas_entrada"])
    ).order_by(FinancialPayment.payment_date.desc()).limit(limit * 2).all()
    return exchanges

# ------------------------------------------------------------------------------
# 5. MATRIZ MULTIMENSUAL DE FLUJO DE CAJA (PROYECTADO VS REAL)
# ------------------------------------------------------------------------------
@router.get("/cash-flow-matrix")
def get_cash_flow_matrix(
    year: Optional[int] = Query(2026),
    month: Optional[int] = Query(None),
    start_month: Optional[int] = Query(1),
    end_month: Optional[int] = Query(12),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    is_ytd: Optional[bool] = Query(False),
    db: Session = Depends(get_db)
):
    """
    Retorna la matriz mensual contable de liquidez y flujo de fondos proyectado vs ejecutado.
    """
    return CashFlowService.generate_cash_flow_matrix(
        db=db,
        year=year,
        month=month,
        start_month=start_month,
        end_month=end_month,
        start_date=start_date,
        end_date=end_date,
        is_ytd=is_ytd
    )