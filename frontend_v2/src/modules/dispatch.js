/**
 * DALOR SIGO-P | Módulo: DISPATCH.JS (Orquestador Desacoplado)
 * Control Logístico Unificado de Guías de Despacho & Formato Abierto
 * Submódulos independientes y especializados en ./dispatch/ (< 480 líneas c/u)
 */

// 1. Carga de Submódulos Especializados
import {
    loadDispatchGuidesList,
    updateFilterCounters,
    setDispatchFilter,
    filterDispatchList,
    goToDispatchPage,
    changeDispatchPageSize,
    renderDispatchTable,
    renderDispatchPaginated,
    openConfirmDeliveryModal,
    submitConfirmDelivery,
    deleteDispatchGuide
} from './dispatch/dispatch_list.js';

import {
    setDispatchMode,
    setDispatchTransportMode,
    initDispatchForm,
    onDispatchDriverPersonnelChanged,
    onDispatchCiDeliveredChanged,
    onDispatchCiReceivedChanged,
    loadDalorAssetsIntoDispatch,
    onDispatchClientChanged,
    onDispatchProjectChanged,
    loadProjectResourcesIntoDispatch,
    onDispatchAssetChanged,
    normalizeDispatchUnit,
    addDispatchItemRow,
    removeDispatchItemRow,
    reindexDispatchRows,
    submitCreateDispatchGuide
} from './dispatch/dispatch_form.js';

import {
    openDispatchResourcePickerModal,
    switchDispatchPickerTab,
    renderDispatchPickerItems,
    filterDispatchPickerList,
    onPickerQuantityChanged,
    togglePickerItemSelection,
    updatePickerSelectedCount,
    confirmAddSelectedResourcesToDispatch
} from './dispatch/dispatch_picker.js';

import {
    printOfficialDispatchGuide
} from './dispatch/dispatch_print.js';

// ==============================================================================
// 2. Control de Navegación de Subpestañas del Módulo de Despacho
// ==============================================================================
function switchDispatchSubtab(subtabName) {
    try {
        sessionStorage.setItem('dalor_active_subtab_dispatch', subtabName || 'list');
        localStorage.setItem('dalor_active_subtab_dispatch', subtabName || 'list');
    } catch(e) {}
    const isList = (subtabName === 'list');
    const subtabList = document.getElementById('subtab-disp-list');
    const subtabForm = document.getElementById('subtab-disp-form');
    const btnList = document.getElementById('tabbtn-disp-list');
    const btnForm = document.getElementById('tabbtn-disp-form');

    if (subtabList) subtabList.classList.toggle('hidden', !isList);
    if (subtabForm) subtabForm.classList.toggle('hidden', isList);

    if (btnList) {
        btnList.className = isList ? 'btn-primary' : 'btn-secondary';
        btnList.style.fontWeight = isList ? '800' : '600';
    }
    if (btnForm) {
        btnForm.className = !isList ? 'btn-primary' : 'btn-secondary';
        btnForm.style.fontWeight = !isList ? '800' : '600';
    }

    if (isList) {
        loadDispatchGuidesList();
    } else {
        initDispatchForm();
    }
}

async function initDispatchView() {
    switchDispatchSubtab('list');
    await loadDispatchGuidesList();
}

// ==============================================================================
// 3. Puente Global (window) para compatibilidad total con eventos inline
// ==============================================================================
if (typeof window !== 'undefined') {
    window.switchDispatchSubtab = switchDispatchSubtab;
    window.initDispatchView = initDispatchView;
    window.initDispatchForm = initDispatchForm;
    window.openDispatchResourcePickerModal = openDispatchResourcePickerModal;
    window.switchDispatchPickerTab = switchDispatchPickerTab;
    window.filterDispatchPickerList = filterDispatchPickerList;
    window.onPickerQuantityChanged = onPickerQuantityChanged;
    window.togglePickerItemSelection = togglePickerItemSelection;
    window.confirmAddSelectedResourcesToDispatch = confirmAddSelectedResourcesToDispatch;
    window.setDispatchMode = setDispatchMode;
    window.setDispatchTransportMode = setDispatchTransportMode;
    window.setDispatchFilter = setDispatchFilter;
    window.filterDispatchList = filterDispatchList;
    window.renderDispatchTable = renderDispatchTable;
    window.onDispatchClientChanged = onDispatchClientChanged;
    window.onDispatchProjectChanged = onDispatchProjectChanged;
    window.loadProjectResourcesIntoDispatch = loadProjectResourcesIntoDispatch;
    window.onDispatchAssetChanged = onDispatchAssetChanged;
    window.onDispatchDriverPersonnelChanged = onDispatchDriverPersonnelChanged;
    window.onDispatchCiDeliveredChanged = onDispatchCiDeliveredChanged;
    window.onDispatchCiReceivedChanged = onDispatchCiReceivedChanged;
    window.loadDalorAssetsIntoDispatch = loadDalorAssetsIntoDispatch;
    window.addDispatchItemRow = addDispatchItemRow;
    window.removeDispatchItemRow = removeDispatchItemRow;
    window.submitCreateDispatchGuide = submitCreateDispatchGuide;
    window.loadDispatchGuidesList = loadDispatchGuidesList;
    window.openConfirmDeliveryModal = openConfirmDeliveryModal;
    window.submitConfirmDelivery = submitConfirmDelivery;
    window.deleteDispatchGuide = deleteDispatchGuide;
    window.printOfficialDispatchGuide = printOfficialDispatchGuide;
    window.goToDispatchPage = goToDispatchPage;
    window.changeDispatchPageSize = changeDispatchPageSize;
    window.renderDispatchPaginated = renderDispatchPaginated;
}

// ==============================================================================
// 4. Re-exportaciones ES6
// ==============================================================================
export {
    openDispatchResourcePickerModal,
    switchDispatchPickerTab,
    filterDispatchPickerList,
    confirmAddSelectedResourcesToDispatch,
    switchDispatchSubtab,
    initDispatchView,
    initDispatchForm,
    setDispatchMode,
    setDispatchTransportMode,
    setDispatchFilter,
    filterDispatchList,
    renderDispatchTable,
    onDispatchClientChanged,
    onDispatchProjectChanged,
    loadProjectResourcesIntoDispatch,
    onDispatchAssetChanged,
    onDispatchDriverPersonnelChanged,
    onDispatchCiDeliveredChanged,
    onDispatchCiReceivedChanged,
    loadDalorAssetsIntoDispatch,
    addDispatchItemRow,
    removeDispatchItemRow,
    submitCreateDispatchGuide,
    loadDispatchGuidesList,
    openConfirmDeliveryModal,
    submitConfirmDelivery,
    deleteDispatchGuide,
    printOfficialDispatchGuide,
    goToDispatchPage,
    changeDispatchPageSize,
    renderDispatchPaginated
};
