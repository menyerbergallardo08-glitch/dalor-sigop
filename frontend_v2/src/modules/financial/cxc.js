/**
 * DALOR SIGO-P | Módulo: CXC.JS (Orquestador Desacoplado)
 * Gestión Integral de Cuentas por Cobrar, Facturación, Recaudación e Historial de Cobranza
 * Arquitectura modular: submódulos especializados en ./cxc/
 */

// 1. Importación de Submódulos Especializados
import {
    safeParseFloat,
    openFinancialSubtab,
    switchFinancialSubtab,
    roundFinancial
} from './cxc/cxc_nav.js';

import {
    goToCxcPage,
    changeCxcPageSize,
    setFilterCxc,
    filterCxcList,
    renderReceivablesPaginated,
    loadReceivablesList
} from './cxc/cxc_list.js';

import {
    openNewReceivableModal,
    onCxcDocTypeChanged,
    onCxcClientChanged,
    onCxcProjectChanged
} from './cxc/cxc_form.js';

import {
    submitCreateReceivable,
    openCreateCxCForProject
} from './cxc/cxc_operations.js';

import {
    openCxcHistoryModal,
    toggleCxcGestionForm,
    updateCxcHistorySummaryCards,
    updateCxcScopeButtonsUI,
    switchCxcHistoryScope,
    loadCxcTimelineData
} from './cxc/cxc_history.js';

import {
    renderCxcTimelineList,
    formatDateTimeClean,
    viewCxcEvidence,
    clearCxcEvidenceFile,
    submitCxcFollowUpLog
} from './cxc/cxc_timeline.js';

import {
    openReceiveClientPaymentModal,
    onRcpClientChanged,
    calcClientPaymentBs,
    submitDirectClientPayment
} from './cxc/cxc_payments.js';

import {
    openBadDebtModal,
    submitBadDebtWriteOff,
    exportCxcExcel,
    printClientAccountStatement,
    openClientStatementSelectorModal,
    confirmGenerateClientStatement,
    checkDirectorCorrelativeAccess,
    openEmergencyInvoiceOverrideModal,
    submitEmergencyInvoiceOverride
} from './cxc/cxc_statements.js';

import { printOfficialFiscalInvoice } from './fiscal_invoice_print.js';

// 2. Registro en Scope Global Window (Compatibilidad con index.html)
if (typeof window !== 'undefined') {
    window.safeParseFloat = safeParseFloat;
    window.openFinancialSubtab = openFinancialSubtab;
    window.switchFinancialSubtab = switchFinancialSubtab;
    window.roundFinancial = roundFinancial;

    window.goToCxcPage = goToCxcPage;
    window.changeCxcPageSize = changeCxcPageSize;
    window.setFilterCxc = setFilterCxc;
    window.filterCxcList = filterCxcList;
    window.renderReceivablesPaginated = renderReceivablesPaginated;
    window.loadReceivablesList = loadReceivablesList;

    window.openNewReceivableModal = openNewReceivableModal;
    window.onCxcDocTypeChanged = onCxcDocTypeChanged;
    window.onCxcClientChanged = onCxcClientChanged;
    window.onCxcProjectChanged = onCxcProjectChanged;

    window.submitCreateReceivable = submitCreateReceivable;
    window.openCreateCxCForProject = openCreateCxCForProject;

    window.openCxcHistoryModal = openCxcHistoryModal;
    window.toggleCxcGestionForm = toggleCxcGestionForm;
    window.updateCxcHistorySummaryCards = updateCxcHistorySummaryCards;
    window.updateCxcScopeButtonsUI = updateCxcScopeButtonsUI;
    window.switchCxcHistoryScope = switchCxcHistoryScope;
    window.loadCxcTimelineData = loadCxcTimelineData;

    window.renderCxcTimelineList = renderCxcTimelineList;
    window.formatDateTimeClean = formatDateTimeClean;
    window.viewCxcEvidence = viewCxcEvidence;
    window.clearCxcEvidenceFile = clearCxcEvidenceFile;
    window.submitCxcFollowUpLog = submitCxcFollowUpLog;

    window.openReceiveClientPaymentModal = openReceiveClientPaymentModal;
    window.onRcpClientChanged = onRcpClientChanged;
    window.calcClientPaymentBs = calcClientPaymentBs;
    window.submitDirectClientPayment = submitDirectClientPayment;

    window.openBadDebtModal = openBadDebtModal;
    window.submitBadDebtWriteOff = submitBadDebtWriteOff;
    window.exportCxcExcel = exportCxcExcel;
    window.printClientAccountStatement = printClientAccountStatement;
    window.openClientStatementSelectorModal = openClientStatementSelectorModal;
    window.confirmGenerateClientStatement = confirmGenerateClientStatement;
    window.checkDirectorCorrelativeAccess = checkDirectorCorrelativeAccess;
    window.openEmergencyInvoiceOverrideModal = openEmergencyInvoiceOverrideModal;
    window.submitEmergencyInvoiceOverride = submitEmergencyInvoiceOverride;
    window.printOfficialFiscalInvoice = printOfficialFiscalInvoice;
}

// 3. Exportación Modular ES6
export {
    safeParseFloat,
    openFinancialSubtab,
    switchFinancialSubtab,
    roundFinancial,
    goToCxcPage,
    changeCxcPageSize,
    setFilterCxc,
    filterCxcList,
    renderReceivablesPaginated,
    loadReceivablesList,
    openNewReceivableModal,
    onCxcDocTypeChanged,
    onCxcClientChanged,
    onCxcProjectChanged,
    submitCreateReceivable,
    openCreateCxCForProject,
    openCxcHistoryModal,
    toggleCxcGestionForm,
    updateCxcHistorySummaryCards,
    updateCxcScopeButtonsUI,
    switchCxcHistoryScope,
    loadCxcTimelineData,
    renderCxcTimelineList,
    formatDateTimeClean,
    viewCxcEvidence,
    clearCxcEvidenceFile,
    submitCxcFollowUpLog,
    openReceiveClientPaymentModal,
    onRcpClientChanged,
    calcClientPaymentBs,
    submitDirectClientPayment,
    openBadDebtModal,
    submitBadDebtWriteOff,
    exportCxcExcel,
    printClientAccountStatement,
    openClientStatementSelectorModal,
    confirmGenerateClientStatement,
    checkDirectorCorrelativeAccess,
    openEmergencyInvoiceOverrideModal,
    submitEmergencyInvoiceOverride,
    printOfficialFiscalInvoice
};
