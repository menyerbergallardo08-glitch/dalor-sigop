// Sigop ERP - Orquestador Cuentas por Pagar (CXP)
// Modularizado bajo Clean Architecture (< 400 líneas por submódulo)

import {
    loadPayablesList,
    updateCxpFilterBadges,
    onCxpSearchInput,
    onCxpDocTypeFilterChange,
    applyCxpDateFilter,
    clearCxpDateFilter,
    setFilterCxp,
    goToCxpPage,
    changeCxpPageSize,
    renderPayablesPaginated
} from './cxp/cxp_list.js';

import {
    loadUnbilledWarehouseEntries,
    loadExpenseConcepts,
    openCreateConceptModal,
    submitCreateExpenseConcept,
    onCxpPayableTypeChanged,
    onCxpWarehouseModeChange,
    onCxpWarehouseEntrySelected,
    addCxpMaterialRow,
    onCxpMaterialRowMatChanged,
    onMaterialCreatedFromCxp,
    removeCxpMaterialRow,
    calcCxpMaterialsTotal,
    applyCxpMaterialsTotalToAmount
} from './cxp/cxp_materials.js';

import {
    onCxpModalDocTypeChange,
    calcPayablePreview,
    openNewPayableModal,
    submitCreatePayable
} from './cxp/cxp_form.js';

import {
    openEditPayableModal,
    calcEditPayableBsPreview,
    calcEditPayableFromBs,
    submitEditPayable,
    deletePayablePrompt,
    openPayableHistoryModal,
    openDeclareBadDebtModal,
    submitDeclareBadDebt,
    exportCxpExcel
} from './cxp/cxp_operations.js';

// Re-exports
export {
    loadPayablesList,
    updateCxpFilterBadges,
    onCxpSearchInput,
    onCxpDocTypeFilterChange,
    applyCxpDateFilter,
    clearCxpDateFilter,
    setFilterCxp,
    goToCxpPage,
    changeCxpPageSize,
    renderPayablesPaginated,
    loadUnbilledWarehouseEntries,
    loadExpenseConcepts,
    openCreateConceptModal,
    submitCreateExpenseConcept,
    onCxpPayableTypeChanged,
    onCxpWarehouseModeChange,
    onCxpWarehouseEntrySelected,
    addCxpMaterialRow,
    onCxpMaterialRowMatChanged,
    onMaterialCreatedFromCxp,
    removeCxpMaterialRow,
    calcCxpMaterialsTotal,
    applyCxpMaterialsTotalToAmount,
    onCxpModalDocTypeChange,
    calcPayablePreview,
    openNewPayableModal,
    submitCreatePayable,
    openEditPayableModal,
    calcEditPayableBsPreview,
    calcEditPayableFromBs,
    submitEditPayable,
    deletePayablePrompt,
    openPayableHistoryModal,
    openDeclareBadDebtModal,
    submitDeclareBadDebt,
    exportCxpExcel
};

// 100% retrocompatibilidad global con window.* e index.html
if (typeof window !== 'undefined') {
    window.loadPayablesList = loadPayablesList;
    window.updateCxpFilterBadges = updateCxpFilterBadges;
    window.onCxpSearchInput = onCxpSearchInput;
    window.onCxpDocTypeFilterChange = onCxpDocTypeFilterChange;
    window.applyCxpDateFilter = applyCxpDateFilter;
    window.clearCxpDateFilter = clearCxpDateFilter;
    window.setFilterCxp = setFilterCxp;
    window.goToCxpPage = goToCxpPage;
    window.changeCxpPageSize = changeCxpPageSize;
    window.renderPayablesPaginated = renderPayablesPaginated;
    window.loadUnbilledWarehouseEntries = loadUnbilledWarehouseEntries;
    window.loadExpenseConcepts = loadExpenseConcepts;
    window.openCreateConceptModal = openCreateConceptModal;
    window.submitCreateExpenseConcept = submitCreateExpenseConcept;
    window.onCxpPayableTypeChanged = onCxpPayableTypeChanged;
    window.onCxpWarehouseModeChange = onCxpWarehouseModeChange;
    window.onCxpWarehouseEntrySelected = onCxpWarehouseEntrySelected;
    window.addCxpMaterialRow = addCxpMaterialRow;
    window.onCxpMaterialRowMatChanged = onCxpMaterialRowMatChanged;
    window.onMaterialCreatedFromCxp = onMaterialCreatedFromCxp;
    window.removeCxpMaterialRow = removeCxpMaterialRow;
    window.calcCxpMaterialsTotal = calcCxpMaterialsTotal;
    window.applyCxpMaterialsTotalToAmount = applyCxpMaterialsTotalToAmount;
    window.onCxpModalDocTypeChange = onCxpModalDocTypeChange;
    window.calcPayablePreview = calcPayablePreview;
    window.openNewPayableModal = openNewPayableModal;
    window.submitCreatePayable = submitCreatePayable;
    window.openEditPayableModal = openEditPayableModal;
    window.calcEditPayableBsPreview = calcEditPayableBsPreview;
    window.calcEditPayableFromBs = calcEditPayableFromBs;
    window.submitEditPayable = submitEditPayable;
    window.deletePayablePrompt = deletePayablePrompt;
    window.openPayableHistoryModal = openPayableHistoryModal;
    window.openDeclareBadDebtModal = openDeclareBadDebtModal;
    window.submitDeclareBadDebt = submitDeclareBadDebt;
    window.exportCxpExcel = exportCxpExcel;
}
