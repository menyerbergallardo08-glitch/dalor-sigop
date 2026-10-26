/**
 * DALOR SIGO-P | Módulo: RENTALS.JS (Orquestador Desacoplado)
 * Módulo de Alquileres & Préstamos de Equipos, Maquinarias, Herramientas y Materiales (Multi-Recurso)
 * Arquitectura modular: submódulos independientes en ./rentals/
 */

// 1. Importación de Submódulos Especializados
import {
    loadRentalsList,
    updateRentalsKPIs,
    applyRentalsFilter,
    debouncedApplyRentalsFilter,
    goToRentalsPage,
    renderRentalsTablePaginated,
    deleteRentalRecord,
    openRentalsSubtab
} from './rentals/rentals_list.js';

import {
    populateRentalResources,
    renderPredictiveResults,
    selectPredictiveRentalResource,
    renderRentalResourceOptions,
    filterRentalResources,
    clearRentalResourceSearch,
    fillRentalAssetDetails,
    addResourceToRentalCart,
    removeRentalCartItem,
    renderRentalCart,
    roundDec
} from './rentals/rentals_picker.js';

import {
    toggleRentalOperationType,
    toggleRentalDirectionFields,
    openCreateRentalModal,
    checkRentalClientCreditRisk,
    confirmRentalClientRisk,
    cancelRentalClientRisk,
    renderRentalClientsList,
    onRentalClientInput,
    toggleRentalClientsDropdown,
    selectRentalPredictiveClient,
    onRentalClientSelected,
    submitCreateRental,
    refreshAllResourceViews,
    openEditRentalModal,
    submitEditRental
} from './rentals/rentals_form.js';

import {
    openReturnRentalModal,
    onRentalReturnDateChanged,
    onRentalExtensionModeChanged,
    updateExtensionCalculatedTotal,
    submitRentalReturnAll,
    submitRentalReturnPartial,
    submitRentalReturn
} from './rentals/rentals_return.js';

import {
    printRentalDeliveryNote
} from './rentals/rentals_print.js';

// 2. Registro en Scope Global Window (Compatibilidad con index.html)
if (typeof window !== 'undefined') {
    window.loadRentalsList = loadRentalsList;
    window.updateRentalsKPIs = updateRentalsKPIs;
    window.applyRentalsFilter = applyRentalsFilter;
    window.debouncedApplyRentalsFilter = debouncedApplyRentalsFilter;
    window.goToRentalsPage = goToRentalsPage;
    window.renderRentalsTablePaginated = renderRentalsTablePaginated;
    window.deleteRentalRecord = deleteRentalRecord;
    window.openRentalsSubtab = openRentalsSubtab;

    window.populateRentalResources = populateRentalResources;
    window.renderPredictiveResults = renderPredictiveResults;
    window.selectPredictiveRentalResource = selectPredictiveRentalResource;
    window.renderRentalResourceOptions = renderRentalResourceOptions;
    window.filterRentalResources = filterRentalResources;
    window.clearRentalResourceSearch = clearRentalResourceSearch;
    window.fillRentalAssetDetails = fillRentalAssetDetails;
    window.addResourceToRentalCart = addResourceToRentalCart;
    window.removeRentalCartItem = removeRentalCartItem;
    window.renderRentalCart = renderRentalCart;
    window.roundDec = roundDec;

    window.toggleRentalOperationType = toggleRentalOperationType;
    window.toggleRentalDirectionFields = toggleRentalDirectionFields;
    window.openCreateRentalModal = openCreateRentalModal;
    window.checkRentalClientCreditRisk = checkRentalClientCreditRisk;
    window.confirmRentalClientRisk = confirmRentalClientRisk;
    window.cancelRentalClientRisk = cancelRentalClientRisk;
    window.renderRentalClientsList = renderRentalClientsList;
    window.onRentalClientInput = onRentalClientInput;
    window.toggleRentalClientsDropdown = toggleRentalClientsDropdown;
    window.selectRentalPredictiveClient = selectRentalPredictiveClient;
    window.onRentalClientSelected = onRentalClientSelected;
    window.submitCreateRental = submitCreateRental;
    window.refreshAllResourceViews = refreshAllResourceViews;
    window.openEditRentalModal = openEditRentalModal;
    window.submitEditRental = submitEditRental;

    window.openReturnRentalModal = openReturnRentalModal;
    window.onRentalReturnDateChanged = onRentalReturnDateChanged;
    window.onRentalExtensionModeChanged = onRentalExtensionModeChanged;
    window.updateExtensionCalculatedTotal = updateExtensionCalculatedTotal;
    window.submitRentalReturnAll = submitRentalReturnAll;
    window.submitRentalReturnPartial = submitRentalReturnPartial;
    window.submitRentalReturn = submitRentalReturn;

    window.printRentalDeliveryNote = printRentalDeliveryNote;
}

// 3. Exportación Modular ES6
export {
    loadRentalsList,
    updateRentalsKPIs,
    applyRentalsFilter,
    debouncedApplyRentalsFilter,
    goToRentalsPage,
    renderRentalsTablePaginated,
    deleteRentalRecord,
    openRentalsSubtab,

    populateRentalResources,
    renderPredictiveResults,
    selectPredictiveRentalResource,
    renderRentalResourceOptions,
    filterRentalResources,
    clearRentalResourceSearch,
    fillRentalAssetDetails,
    addResourceToRentalCart,
    removeRentalCartItem,
    renderRentalCart,
    roundDec,

    toggleRentalOperationType,
    toggleRentalDirectionFields,
    openCreateRentalModal,
    checkRentalClientCreditRisk,
    confirmRentalClientRisk,
    cancelRentalClientRisk,
    renderRentalClientsList,
    onRentalClientInput,
    toggleRentalClientsDropdown,
    selectRentalPredictiveClient,
    onRentalClientSelected,
    submitCreateRental,
    refreshAllResourceViews,
    openEditRentalModal,
    submitEditRental,

    openReturnRentalModal,
    onRentalReturnDateChanged,
    onRentalExtensionModeChanged,
    updateExtensionCalculatedTotal,
    submitRentalReturnAll,
    submitRentalReturnPartial,
    submitRentalReturn,

    printRentalDeliveryNote
};
