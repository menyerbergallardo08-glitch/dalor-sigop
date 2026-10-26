/**
 * DALOR SIGO-P | Módulo: TREASURY.JS (Orquestador Desacoplado)
 * Tesorería, Cajas, Bancos, Mesa de Cambio, Matriz de Flujo de Caja y Trazabilidad
 * Arquitectura modular: submódulos especializados en ./treasury/
 */

// 1. Submódulos Especializados
import {
    safeParseFloat,
    roundFinancial,
    getActiveOfficialRate,
    calcFinTransFromUsd,
    calcFinTransFromBs,
    calcRetentionFromBs,
    onFinTransDateChanged,
    onFinTransMethodChanged,
    calcFinTransBsEquiv,
    onFinTransAccountChanged,
    openClientRefundModal,
    submitClientRefund,
    openRecordPaymentModal,
    printOfficialFiscalInvoiceFromModal,
    submitFinancialPayment
} from './treasury/treasury_transactions.js';

import {
    onTreasurySummaryPeriodChange,
    resetTreasurySummaryFilters,
    loadTreasurySummary
} from './treasury/treasury_dashboard.js';

import {
    setTreasuryOperations,
    getIsoDate,
    formatDateDisplay,
    applyTreasuryFilters,
    handleTreasuryPeriodChange,
    updateTreasuryTraceKpis,
    resetTreasuryFilters,
    printTreasuryTraceReport,
    goToTreasuryPage,
    changeTreasuryPageSize,
    renderTreasuryTracePaginated
} from './treasury/treasury_trace.js';

import {
    setCashFlowRange,
    onCashFlowMonthChange,
    applyCashFlowDateFilter,
    clearCashFlowDateFilter,
    setCashFlowCurrency,
    loadCashFlowMatrix,
    renderCashFlowMatrixTable,
    printCashFlowMatrixReport
} from './treasury/treasury_cashflow.js';

import {
    openTreasuryExchangeModal,
    onTreasuryExchangeDateChanged,
    openBcvRateHistoryModal,
    selectBcvHistoricalRate,
    onTreasuryExchangeTypeChanged,
    calcTreasuryExchangeDiff,
    submitTreasuryExchange
} from './treasury/treasury_exchange.js';

// 2. Registro Global Window
if (typeof window !== 'undefined') {
    window.safeParseFloat = safeParseFloat;
    window.roundFinancial = roundFinancial;
    window.getActiveOfficialRate = getActiveOfficialRate;
    window.calcRetentionFromBs = calcRetentionFromBs;
    window.onFinTransDateChanged = onFinTransDateChanged;
    window.calcFinTransFromUsd = calcFinTransFromUsd;
    window.calcFinTransFromBs = calcFinTransFromBs;
    window.onFinTransMethodChanged = onFinTransMethodChanged;
    window.calcFinTransBsEquiv = calcFinTransBsEquiv;
    window.onFinTransAccountChanged = onFinTransAccountChanged;
    window.openClientRefundModal = openClientRefundModal;
    window.submitClientRefund = submitClientRefund;
    window.openRecordPaymentModal = openRecordPaymentModal;
    window.printOfficialFiscalInvoiceFromModal = printOfficialFiscalInvoiceFromModal;
    window.submitFinancialPayment = submitFinancialPayment;

    window.onTreasurySummaryPeriodChange = onTreasurySummaryPeriodChange;
    window.resetTreasurySummaryFilters = resetTreasurySummaryFilters;
    window.loadTreasurySummary = loadTreasurySummary;
    window.loadFinancialSummary = loadTreasurySummary;

    window.setTreasuryOperations = setTreasuryOperations;
    window.getIsoDate = getIsoDate;
    window.formatDateDisplay = formatDateDisplay;
    window.applyTreasuryFilters = applyTreasuryFilters;
    window.handleTreasuryPeriodChange = handleTreasuryPeriodChange;
    window.updateTreasuryTraceKpis = updateTreasuryTraceKpis;
    window.resetTreasuryFilters = resetTreasuryFilters;
    window.printTreasuryTraceReport = printTreasuryTraceReport;
    window.goToTreasuryPage = goToTreasuryPage;
    window.changeTreasuryPageSize = changeTreasuryPageSize;
    window.renderTreasuryTracePaginated = renderTreasuryTracePaginated;

    window.setCashFlowRange = setCashFlowRange;
    window.onCashFlowMonthChange = onCashFlowMonthChange;
    window.applyCashFlowDateFilter = applyCashFlowDateFilter;
    window.clearCashFlowDateFilter = clearCashFlowDateFilter;
    window.setCashFlowCurrency = setCashFlowCurrency;
    window.loadCashFlowMatrix = loadCashFlowMatrix;
    window.renderCashFlowMatrixTable = renderCashFlowMatrixTable;
    window.printCashFlowMatrixReport = printCashFlowMatrixReport;

    window.openTreasuryExchangeModal = openTreasuryExchangeModal;
    window.onTreasuryExchangeDateChanged = onTreasuryExchangeDateChanged;
    window.openBcvRateHistoryModal = openBcvRateHistoryModal;
    window.selectBcvHistoricalRate = selectBcvHistoricalRate;
    window.onTreasuryExchangeTypeChanged = onTreasuryExchangeTypeChanged;
    window.calcTreasuryExchangeDiff = calcTreasuryExchangeDiff;
    window.submitTreasuryExchange = submitTreasuryExchange;
}

// 3. Exportación Modular ES6
export {
    safeParseFloat,
    roundFinancial,
    getActiveOfficialRate,
    calcFinTransFromUsd,
    calcFinTransFromBs,
    calcRetentionFromBs,
    onFinTransDateChanged,
    onFinTransMethodChanged,
    calcFinTransBsEquiv,
    onFinTransAccountChanged,
    openClientRefundModal,
    submitClientRefund,
    openRecordPaymentModal,
    printOfficialFiscalInvoiceFromModal,
    submitFinancialPayment,
    onTreasurySummaryPeriodChange,
    resetTreasurySummaryFilters,
    loadTreasurySummary,
    setTreasuryOperations,
    getIsoDate,
    formatDateDisplay,
    applyTreasuryFilters,
    handleTreasuryPeriodChange,
    updateTreasuryTraceKpis,
    resetTreasuryFilters,
    printTreasuryTraceReport,
    goToTreasuryPage,
    changeTreasuryPageSize,
    renderTreasuryTracePaginated,
    setCashFlowRange,
    onCashFlowMonthChange,
    applyCashFlowDateFilter,
    clearCashFlowDateFilter,
    setCashFlowCurrency,
    loadCashFlowMatrix,
    renderCashFlowMatrixTable,
    printCashFlowMatrixReport,
    openTreasuryExchangeModal,
    onTreasuryExchangeDateChanged,
    openBcvRateHistoryModal,
    selectBcvHistoricalRate,
    onTreasuryExchangeTypeChanged,
    calcTreasuryExchangeDiff,
    submitTreasuryExchange
};
