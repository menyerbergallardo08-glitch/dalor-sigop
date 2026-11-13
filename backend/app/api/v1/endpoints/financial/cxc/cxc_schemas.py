from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel


class ReceivableCreate(BaseModel):
    invoice_number: Optional[str] = None
    control_number: Optional[str] = None
    client_id: int
    project_id: Optional[int] = None
    description: str
    due_date: Optional[datetime] = None
    amount_usd: float  # Total Factura
    taxable_base_usd: Optional[float] = 0.0
    tax_amount_usd: Optional[float] = 0.0
    tax_withholding_rate: Optional[float] = 75.0  # 0, 75, 100
    tax_withholding_usd: Optional[float] = 0.0
    islr_rate: Optional[float] = 2.0  # 0, 1, 2, 3, 5
    islr_withholding_usd: Optional[float] = 0.0
    tax_retained_usd: Optional[float] = 0.0
    net_amount_usd: Optional[float] = 0.0
    exchange_rate: float = 800.0
    notes: Optional[str] = None


class PaymentCreate(BaseModel):
    payment_type: Optional[str] = "cxc_cobro"  # cxc_cobro, cxp_pago, cxp_retencion_iva
    target_id: Optional[int] = None  # receivable_id o payable_id
    amount_usd: float
    payment_method: str = "transferencia"  # transferencia, efectivo_usd, retencion_iva, retencion_islr, zelle, pago_movil
    bank_account: Optional[str] = "banesco_usd"  # banesco_usd, banesco_bs, binance_usdt, efectivo_usd, caja_chica
    voucher_number: Optional[str] = None  # N° comprobante de retención o referencia
    reference_number: Optional[str] = None
    exchange_rate: float = 800.0
    notes: Optional[str] = None
    emit_fiscal_invoice: bool = False
    custom_concept: Optional[str] = None


class ClientRefundCreate(BaseModel):
    amount_usd: float
    payment_method: str = "transferencia"
    reference_number: Optional[str] = None
    exchange_rate: Optional[float] = 850.0
    notes: Optional[str] = None


class BadDebtRequest(BaseModel):
    reason: str
    notes: Optional[str] = None


class BadDebtWriteOff(BaseModel):
    reason: str
    notes: Optional[str] = None


class CorrelativeOverrideRequest(BaseModel):
    next_invoice_code: Optional[str] = None
    next_control_number: Optional[str] = None
    reason: str


class SplitPaymentItem(BaseModel):
    payment_type: str  # 'retencion_iva', 'retencion_islr', 'bolivares', 'divisas_usd'
    amount_usd: float
    amount_bs: Optional[float] = 0.0
    exchange_rate: Optional[float] = 800.0
    payment_method: str = "transferencia"  # 'transferencia', 'pago_movil', 'efectivo_usd', 'zelle', 'comprobante_seniat'
    bank_account: Optional[str] = None
    financial_account_id: Optional[int] = None
    reference_number: Optional[str] = None
    voucher_number: Optional[str] = None
    voucher_date: Optional[datetime] = None
    notes: Optional[str] = None


class SplitPaymentRequest(BaseModel):
    items: List[SplitPaymentItem]
    payment_date: Optional[datetime] = None
    notes: Optional[str] = None


class ReceivableUpdate(BaseModel):
    invoice_number: Optional[str] = None
    fiscal_invoice_number: Optional[str] = None
    control_number: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    issue_date: Optional[datetime] = None
    amount_usd: Optional[float] = None
    taxable_base_usd: Optional[float] = None
    tax_amount_usd: Optional[float] = None
    notes: Optional[str] = None


class ReceivableCancelIn(BaseModel):
    cancellation_reason: str


class ControlNumberUpdate(BaseModel):
    control_number: str


class FiscalCorrelativeUpdate(BaseModel):
    fiscal_invoice_number: Optional[str] = None
    control_number: Optional[str] = None
    issue_date: Optional[str] = None
    reason: Optional[str] = None
