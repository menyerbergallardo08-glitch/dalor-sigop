"""
Fachada de Retrocompatibilidad (Facade Pattern) para Cuentas por Cobrar (CxC) - DALOR SIGO-P.

Este módulo re-exporta de manera transparente todos los esquemas, funciones y el router
unificado desde el nuevo paquete modular `app.api.v1.endpoints.financial.cxc`.

Garantiza que cualquier importación existente continúe funcionando sin modificación:
    from app.api.v1.endpoints.financial import financial_cxc
    from app.api.v1.endpoints.financial.financial_cxc import router, get_receivables, ...
"""

from app.api.v1.endpoints.financial.cxc import (
    router,
    # Schemas
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
    FiscalCorrelativeUpdate,
    # Invoices / Correlatives
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
    cancel_receivable,
    # Payments
    record_cxc_payment,
    process_client_refund,
    declare_cxc_bad_debt,
    write_off_bad_debt,
    record_cxc_split_payment,
    get_cxc_payments,
    revert_cxc_payment,
    # Timeline
    get_cxc_timeline,
    get_client_cxc_timeline,
    upload_cxc_evidence,
    create_cxc_follow_up_log,
    create_client_cxc_follow_up_log
)

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
