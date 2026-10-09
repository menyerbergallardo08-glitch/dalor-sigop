/**
 * DALOR SIGO-P | Módulo: MATERIALS.JS (Orquestador Desacoplado)
 * Submódulos independientes y especializados en ./materials/
 */

// 1. Carga de Submódulos Especializados (< 600 líneas c/u)
import './materials/materials_catalog.js';
import './materials/materials_movements.js';
import './materials/materials_transfer.js';
import './materials/materials_delivery.js';
import './materials/materials_requisitions.js';

// 2. Exportaciones Seguras ES6 delegadas a las funciones en scope global window
export const addMaterialDeliveryRow = (...args) => (window.addMaterialDeliveryRow ? window.addMaterialDeliveryRow(...args) : undefined);
export const addMaterialEntryRow = (...args) => (window.addMaterialEntryRow ? window.addMaterialEntryRow(...args) : undefined);
export const removeMaterialEntryRow = (...args) => (window.removeMaterialEntryRow ? window.removeMaterialEntryRow(...args) : undefined);
export const onEntryMaterialRowChanged = (...args) => (window.onEntryMaterialRowChanged ? window.onEntryMaterialRowChanged(...args) : undefined);
export const filterEntryRowDropdown = (...args) => (window.filterEntryRowDropdown ? window.filterEntryRowDropdown(...args) : undefined);
export const filterConsumeMaterialDropdown = (...args) => (window.filterConsumeMaterialDropdown ? window.filterConsumeMaterialDropdown(...args) : undefined);
export const onConsumeProjectChanged = (...args) => (window.onConsumeProjectChanged ? window.onConsumeProjectChanged(...args) : undefined);
export const calcMaterialConsumeTotal = (...args) => (window.calcMaterialConsumeTotal ? window.calcMaterialConsumeTotal(...args) : undefined);
export const calcMaterialEntryTotal = (...args) => (window.calcMaterialEntryTotal ? window.calcMaterialEntryTotal(...args) : undefined);
export const filterMaterialsTable = (...args) => (window.filterMaterialsTable ? window.filterMaterialsTable(...args) : undefined);
export const filterTransferToolsChecklist = (...args) => (window.filterTransferToolsChecklist ? window.filterTransferToolsChecklist(...args) : undefined);
export const loadMaterialsList = (...args) => (window.loadMaterialsList ? window.loadMaterialsList(...args) : undefined);
export const onConsumeMaterialSelected = (...args) => (window.onConsumeMaterialSelected ? window.onConsumeMaterialSelected(...args) : undefined);
export const onMaterialDeliveryProjectChanged = (...args) => (window.onMaterialDeliveryProjectChanged ? window.onMaterialDeliveryProjectChanged(...args) : undefined);
export const onTransferGuideProjectChanged = (...args) => (window.onTransferGuideProjectChanged ? window.onTransferGuideProjectChanged(...args) : undefined);
export const openMaterialConsumeModal = (...args) => (window.openMaterialConsumeModal ? window.openMaterialConsumeModal(...args) : undefined);
export const openMaterialDeliveryModal = (...args) => (window.openMaterialDeliveryModal ? window.openMaterialDeliveryModal(...args) : undefined);
export const openMaterialEntryModal = (...args) => (window.openMaterialEntryModal ? window.openMaterialEntryModal(...args) : undefined);
export const openNewMaterialModal = (...args) => (window.openNewMaterialModal ? window.openNewMaterialModal(...args) : undefined);
export const openNewMaterialModalFromCxp = (...args) => (window.openNewMaterialModalFromCxp ? window.openNewMaterialModalFromCxp(...args) : undefined);
export const openTransferGuideModal = (...args) => (window.openTransferGuideModal ? window.openTransferGuideModal(...args) : undefined);
export const renderInitialMaterialDeliveryRows = (...args) => (window.renderInitialMaterialDeliveryRows ? window.renderInitialMaterialDeliveryRows(...args) : undefined);
export const renderMaterialsTable = (...args) => (window.renderMaterialsTable ? window.renderMaterialsTable(...args) : undefined);
export const goToMaterialsPage = (...args) => (window.goToMaterialsPage ? window.goToMaterialsPage(...args) : undefined);
export const changeMaterialsPageSize = (...args) => (window.changeMaterialsPageSize ? window.changeMaterialsPageSize(...args) : undefined);
export const renderMaterialsTablePaginated = (...args) => (window.renderMaterialsTablePaginated ? window.renderMaterialsTablePaginated(...args) : undefined);
export const renderTransferToolsChecklist = (...args) => (window.renderTransferToolsChecklist ? window.renderTransferToolsChecklist(...args) : undefined);
export const submitCreateMaterial = (...args) => (window.submitCreateMaterial ? window.submitCreateMaterial(...args) : undefined);
export const submitGenerateMaterialDeliveryGuide = (...args) => (window.submitGenerateMaterialDeliveryGuide ? window.submitGenerateMaterialDeliveryGuide(...args) : undefined);
export const submitGenerateTransferGuide = (...args) => (window.submitGenerateTransferGuide ? window.submitGenerateTransferGuide(...args) : undefined);
export const submitMaterialConsume = (...args) => (window.submitMaterialConsume ? window.submitMaterialConsume(...args) : undefined);
export const submitMaterialEntry = (...args) => (window.submitMaterialEntry ? window.submitMaterialEntry(...args) : undefined);
export const toggleMaterialEntryPaymentBox = (...args) => (window.toggleMaterialEntryPaymentBox ? window.toggleMaterialEntryPaymentBox(...args) : undefined);
export const onNewMaterialCategoryChanged = (...args) => (window.onNewMaterialCategoryChanged ? window.onNewMaterialCategoryChanged(...args) : undefined);
export const loadProjectRequisitionsBadge = (...args) => (window.loadProjectRequisitionsBadge ? window.loadProjectRequisitionsBadge(...args) : undefined);
export const openProjectRequisitionsInboxModal = (...args) => (window.openProjectRequisitionsInboxModal ? window.openProjectRequisitionsInboxModal(...args) : undefined);
export const loadProjectRequisitionsInbox = (...args) => (window.loadProjectRequisitionsInbox ? window.loadProjectRequisitionsInbox(...args) : undefined);
export const filterProjectRequisitionsView = (...args) => (window.filterProjectRequisitionsView ? window.filterProjectRequisitionsView(...args) : undefined);
export const toggleSelectAllProjectReqs = (...args) => (window.toggleSelectAllProjectReqs ? window.toggleSelectAllProjectReqs(...args) : undefined);
export const submitDispatchProjectGroup = (...args) => (window.submitDispatchProjectGroup ? window.submitDispatchProjectGroup(...args) : undefined);
export const quickDispatchSingleRequisition = (...args) => (window.quickDispatchSingleRequisition ? window.quickDispatchSingleRequisition(...args) : undefined);
export const goToReqPage = (...args) => (window.goToReqPage ? window.goToReqPage(...args) : undefined);
export const changeReqPageSize = (...args) => (window.changeReqPageSize ? window.changeReqPageSize(...args) : undefined);
export const onReqQtyChanged = (...args) => (window.onReqQtyChanged ? window.onReqQtyChanged(...args) : undefined);
export const onReqVehicleChanged = (...args) => (window.onReqVehicleChanged ? window.onReqVehicleChanged(...args) : undefined);
export const onReqDriverChanged = (...args) => (window.onReqDriverChanged ? window.onReqDriverChanged(...args) : undefined);
export const openCalibrateMaterialModal = (...args) => (window.openCalibrateMaterialModal ? window.openCalibrateMaterialModal(...args) : undefined);
export const submitCalibrateMaterial = (...args) => (window.submitCalibrateMaterial ? window.submitCalibrateMaterial(...args) : undefined);
export const openMaterialKardexModal = (...args) => (window.openMaterialKardexModal ? window.openMaterialKardexModal(...args) : undefined);
export const loadMaterialKardexList = (...args) => (window.loadMaterialKardexList ? window.loadMaterialKardexList(...args) : undefined);
export const filterMaterialKardexTable = (...args) => (window.filterMaterialKardexTable ? window.filterMaterialKardexTable(...args) : undefined);
export const openEditMaterialModal = (...args) => (window.openEditMaterialModal ? window.openEditMaterialModal(...args) : undefined);
export const submitEditMaterial = (...args) => (window.submitEditMaterial ? window.submitEditMaterial(...args) : undefined);
