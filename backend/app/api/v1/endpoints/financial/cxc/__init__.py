"""
Submódulo unificador de Cuentas por Cobrar (CxC) - DALOR SIGO-P.
Orquesta y re-exporta los 3 sub-routers especializados:
1. cxc_invoices: Facturación fiscal, correlativos SENIAT, números de control y anulación
2. cxc_payments: Abonos, pagos, reversiones, split payments, castigo y reembolsos
3. cxc_timeline: Línea de tiempo de cobranzas, soportes de pago y seguimiento de morosidad
"""

from fastapi import APIRouter, Depends
from app.api.deps import get_current_active_user

from .cxc_schemas import (
    ReceivableCreate,
    PaymentCreate,
    ClientRefundCreate,
    BadDebtRequest,
    BadDebtWriteOff,
    CorrelativeOverrideRequest,
    SplitPaymentItem,
    SplitPaymentRequest,
    ReceivableUpdate,
    ReceivableCancelIn,
    ControlNumberUpdate,
    FiscalCorrelativeUpdate
)

from . import cxc_invoices
from . import cxc_payments
from . import cxc_timeline

from .cxc_invoices import (
    compute_next_invoice_code,
    compute_next_control_number,
    get_receivables,
    get_next_invoice_code,
    override_fiscal_correlative,
    create_receivable,
    update_receivable_control_number,
    update_receivable_fiscal_correlative,
    get_fiscal_invoice_data,
    delete_receivable,
    update_receivable,
    cancel_receivable
)

from .cxc_payments import (
    record_cxc_payment,
    process_client_refund,
    declare_cxc_bad_debt,
    write_off_bad_debt,
    record_cxc_split_payment,
    get_cxc_payments,
    revert_cxc_payment
)

from .cxc_timeline import (
    get_cxc_timeline,
    get_client_cxc_timeline,
    upload_cxc_evidence,
    create_cxc_follow_up_log,
    create_client_cxc_follow_up_log
)

router = APIRouter(dependencies=[Depends(get_current_active_user)])
router.include_router(cxc_invoices.router)
router.include_router(cxc_payments.router)
router.include_router(cxc_timeline.router)

__all__ = [
    "router",
    "ReceivableCreate",
    "PaymentCreate",
    "ClientRefundCreate",
    "BadDebtRequest",
    "BadDebtWriteOff",
    "CorrelativeOverrideRequest",
    "SplitPaymentItem",
    "SplitPaymentRequest",
    "ReceivableUpdate",
    "ReceivableCancelIn",
    "ControlNumberUpdate",
    "FiscalCorrelativeUpdate",
    "compute_next_invoice_code",
    "compute_next_control_number",
    "get_receivables",
    "get_next_invoice_code",
    "override_fiscal_correlative",
    "create_receivable",
    "update_receivable_control_number",
    "update_receivable_fiscal_correlative",
    "get_fiscal_invoice_data",
    "delete_receivable",
    "update_receivable",
    "cancel_receivable",
    "record_cxc_payment",
    "process_client_refund",
    "declare_cxc_bad_debt",
    "write_off_bad_debt",
    "record_cxc_split_payment",
    "get_cxc_payments",
    "revert_cxc_payment",
    "get_cxc_timeline",
    "get_client_cxc_timeline",
    "upload_cxc_evidence",
    "create_cxc_follow_up_log",
    "create_client_cxc_follow_up_log"
]
