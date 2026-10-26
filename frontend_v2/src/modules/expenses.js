/**
 * DALOR SIGO-P | Módulo: EXPENSES.JS (Orquestador Desacoplado)
 * Gestión y Auditoría de Gastos de Operación, Caja Chica y Rendiciones de Campo
 * Arquitectura modular: submódulos independientes en ./expenses/ (< 330 líneas c/u)
 */

// 1. Importación de Submódulos Especializados
import {
    compressImageForOCR,
    triggerFileSelect,
    handleFileSelected,
    processOCRFile
} from './expenses/expenses_ocr.js';

import {
    toggleSplitMode,
    addSplitRow,
    removeSplitRow,
    updateSplitBalance,
    submitFieldExpense,
    calcManualBs,
    calcManualUsd,
    submitManualExpense
} from './expenses/expenses_form.js';

import {
    loadPendingExpensesInbox,
    openValidateExpenseModal,
    onValExpenseTypeChanged,
    calcValBs,
    calcValUsd,
    submitValidateExpense,
    rejectCurrentExpense,
    rejectExpense
} from './expenses/expenses_approval.js';

import {
    debouncedFilterExpensesLog,
    loadExpensesLog,
    populateExpensesLogFilters,
    filterExpensesLog,
    updateExpensesLogKPIs,
    renderExpensesLogTable,
    goToExpensesLogPage,
    changeExpensesLogPageSize
} from './expenses/expenses_list.js';

import {
    resolveReceiptUrl,
    viewReceiptImage,
    exportExpensesLogExcel,
    submitResetToCleanSlate
} from './expenses/expenses_receipts.js';

// 2. Registro en Scope Global Window (Compatibilidad con index.html)
if (typeof window !== 'undefined') {
    window.compressImageForOCR = compressImageForOCR;
    window.triggerFileSelect = triggerFileSelect;
    window.handleFileSelected = handleFileSelected;
    window.processOCRFile = processOCRFile;

    window.toggleSplitMode = toggleSplitMode;
    window.addSplitRow = addSplitRow;
    window.removeSplitRow = removeSplitRow;
    window.updateSplitBalance = updateSplitBalance;
    window.submitFieldExpense = submitFieldExpense;
    window.calcManualBs = calcManualBs;
    window.calcManualUsd = calcManualUsd;
    window.submitManualExpense = submitManualExpense;

    window.loadPendingExpensesInbox = loadPendingExpensesInbox;
    window.openValidateExpenseModal = openValidateExpenseModal;
    window.onValExpenseTypeChanged = onValExpenseTypeChanged;
    window.calcValBs = calcValBs;
    window.calcValUsd = calcValUsd;
    window.submitValidateExpense = submitValidateExpense;
    window.rejectCurrentExpense = rejectCurrentExpense;
    window.rejectExpense = rejectExpense;

    window.debouncedFilterExpensesLog = debouncedFilterExpensesLog;
    window.loadExpensesLog = loadExpensesLog;
    window.populateExpensesLogFilters = populateExpensesLogFilters;
    window.filterExpensesLog = filterExpensesLog;
    window.updateExpensesLogKPIs = updateExpensesLogKPIs;
    window.renderExpensesLogTable = renderExpensesLogTable;
    window.goToExpensesLogPage = goToExpensesLogPage;
    window.changeExpensesLogPageSize = changeExpensesLogPageSize;

    window.resolveReceiptUrl = resolveReceiptUrl;
    window.viewReceiptImage = viewReceiptImage;
    window.exportExpensesLogExcel = exportExpensesLogExcel;
    window.submitResetToCleanSlate = submitResetToCleanSlate;
}

// 3. Exportación Modular ES6
export {
    compressImageForOCR,
    triggerFileSelect,
    handleFileSelected,
    processOCRFile,

    toggleSplitMode,
    addSplitRow,
    removeSplitRow,
    updateSplitBalance,
    submitFieldExpense,
    calcManualBs,
    calcManualUsd,
    submitManualExpense,

    loadPendingExpensesInbox,
    openValidateExpenseModal,
    onValExpenseTypeChanged,
    calcValBs,
    calcValUsd,
    submitValidateExpense,
    rejectCurrentExpense,
    rejectExpense,

    debouncedFilterExpensesLog,
    loadExpensesLog,
    populateExpensesLogFilters,
    filterExpensesLog,
    updateExpensesLogKPIs,
    renderExpensesLogTable,
    goToExpensesLogPage,
    changeExpensesLogPageSize,

    resolveReceiptUrl,
    viewReceiptImage,
    exportExpensesLogExcel,
    submitResetToCleanSlate
};
