"""
Router maestro unificado para el módulo Financiero (Dalor SIGO-P).
Integra modularmente los 6 sub-routers especializados:
1. financial_accounts: Cuentas bancarias, saldos iniciales y cotizaciones BCV
2. financial_vouchers: Comprobantes de retención (IVA, ISLR, Municipal)
3. financial_cxc: Cuentas por cobrar, facturación, cobranza, morosidad y timeline
4. financial_cxp: Cuentas por pagar, recepción de compras y pagos
5. financial_treasury: Caja operativa, retiros de socios, arbitraje cambiario y matriz de flujo de caja
6. financial_reports: Métricas BI, libros de ventas y compras (datos y Excel), conceptos de gastos
"""

from fastapi import APIRouter

# 1. Router maestro
router = APIRouter()

# ── 1. SUB-ROUTER: CUENTAS BANCARIAS, SALDOS & BCV ──
from app.api.v1.endpoints.financial import financial_accounts
router.include_router(financial_accounts.router)
from app.api.v1.endpoints.financial.financial_accounts import (
    get_bcv_rate, sync_bcv_rate, get_bcv_rate_history,
    list_financial_accounts, create_financial_account,
    update_financial_account, delete_financial_account,
    set_account_initial_balance
)

# ── 2. SUB-ROUTER: COMPROBANTES DE RETENCIÓN ──
from app.api.v1.endpoints.financial import financial_vouchers
router.include_router(financial_vouchers.router)
from app.api.v1.endpoints.financial.financial_vouchers import (
    get_payable_withholding_voucher,
    get_payable_islr_withholding_voucher,
    get_payable_municipal_withholding_voucher
)

# ── 3. SUB-ROUTER: CUENTAS POR COBRAR (CxC) ──
from app.api.v1.endpoints.financial import financial_cxc
router.include_router(financial_cxc.router)
from app.api.v1.endpoints.financial.financial_cxc import (
    ReceivableCreate,
    PaymentCreate,
    ClientRefundCreate,
    BadDebtRequest,
    BadDebtWriteOff,
    compute_next_invoice_code,
    get_receivables,
    get_next_invoice_code,
    create_receivable,
    record_cxc_payment,
    process_client_refund,
    declare_cxc_bad_debt,
    get_cxc_timeline,
    get_client_cxc_timeline,
    upload_cxc_evidence,
    create_cxc_follow_up_log,
    create_client_cxc_follow_up_log,
    delete_receivable,
    write_off_bad_debt
)

# ── 4. SUB-ROUTER: CUENTAS POR PAGAR (CxP) ──
from app.api.v1.endpoints.financial import financial_cxp
router.include_router(financial_cxp.router)
from app.api.v1.endpoints.financial.financial_cxp import (
    PayableMaterialItem,
    PayableCreate,
    PayableUpdate,
    get_payables,
    get_unbilled_warehouse_entries,
    create_payable,
    update_payable,
    delete_payable,
    record_cxp_payment
)

# ── 5. SUB-ROUTER: TESORERÍA, RETIROS & FLUJO DE CAJA ──
from app.api.v1.endpoints.financial import financial_treasury
router.include_router(financial_treasury.router)
from app.api.v1.endpoints.financial.financial_treasury import (
    DirectCollectionCreate,
    PartnerWithdrawalCreate,
    CurrencyExchangeCreate,
    get_financial_summary,
    direct_client_collection,
    get_partner_withdrawals,
    create_partner_withdrawal,
    delete_partner_withdrawal,
    execute_currency_exchange,
    get_currency_exchanges,
    get_cash_flow_matrix
)

# ── 6. SUB-ROUTER: REPORTES, BUSINESS INTELLIGENCE & LIBROS CONTABLES ──
from app.api.v1.endpoints.financial import financial_reports
router.include_router(financial_reports.router)
from app.api.v1.endpoints.financial.financial_reports import (
    ExpenseConceptCreate,
    get_bi_metrics,
    get_libro_ventas_data,
    export_libro_ventas_excel,
    get_libro_compras_data,
    export_libro_compras_excel,
    import_libros_excel,
    get_expense_concepts,
    create_expense_concept
)