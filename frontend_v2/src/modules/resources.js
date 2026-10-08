/**
 * DALOR SIGO-P | Módulo: RESOURCES.JS (Orquestador Desacoplado)
 * Submódulos independientes y especializados en ./resources/
 */

// 1. Carga de Submódulos Especializados (< 700 líneas c/u)
import './resources/dashboard.js';
import './resources/fleet.js';
import './resources/services.js';
import './resources/machinery.js';
import './resources/tools.js';
import './resources/personnel.js';
import './resources/assets.js';

// 2. Exportaciones Seguras ES6 delegadas a las funciones en scope global
export const openAdminAuthModal = (...args) => (window.openAdminAuthModal ? window.openAdminAuthModal(...args) : undefined);
export const submitAdminAuth = (...args) => (window.submitAdminAuth ? window.submitAdminAuth(...args) : undefined);
export const toggleVehServicesAuditTrace = (...args) => (window.toggleVehServicesAuditTrace ? window.toggleVehServicesAuditTrace(...args) : undefined);
export const executeAdminAuthDirect = (...args) => (window.executeAdminAuthDirect ? window.executeAdminAuthDirect(...args) : undefined);
export const onRecordServiceTypeChange = (...args) => (window.onRecordServiceTypeChange ? window.onRecordServiceTypeChange(...args) : undefined);
export const openRecordServiceModal = (...args) => (window.openRecordServiceModal ? window.openRecordServiceModal(...args) : undefined);
export const openEditServiceModal = (...args) => (window.openEditServiceModal ? window.openEditServiceModal(...args) : undefined);
export const submitRecordService = (...args) => (window.submitRecordService ? window.submitRecordService(...args) : undefined);
export const deleteServiceRecord = (...args) => (window.deleteServiceRecord ? window.deleteServiceRecord(...args) : undefined);
export const promptNewCustomServiceType = (...args) => (window.promptNewCustomServiceType ? window.promptNewCustomServiceType(...args) : undefined);
export const deleteAssetItem = (...args) => (window.deleteAssetItem ? window.deleteAssetItem(...args) : undefined);
export const handleOdometerImageSelected = (...args) => (window.handleOdometerImageSelected ? window.handleOdometerImageSelected(...args) : undefined);
export const loadFleetList = (...args) => (window.loadFleetList ? window.loadFleetList(...args) : undefined);
export const loadMachineryList = (...args) => (window.loadMachineryList ? window.loadMachineryList(...args) : undefined);
export const loadPersonnelTableList = (...args) => (window.loadPersonnelTableList ? window.loadPersonnelTableList(...args) : undefined);
export const loadResourceDashboard = (...args) => (window.loadResourceDashboard ? window.loadResourceDashboard(...args) : undefined);
export const loadToolsList = (...args) => (window.loadToolsList ? window.loadToolsList(...args) : undefined);
export const onAssetTypeChanged = (...args) => (window.onAssetTypeChanged ? window.onAssetTypeChanged(...args) : undefined);
export const openAssignModal = (...args) => (window.openAssignModal ? window.openAssignModal(...args) : undefined);
export const openNewAssetModal = (...args) => (window.openNewAssetModal ? window.openNewAssetModal(...args) : undefined);
export const openNewPersonnelModal = (...args) => (window.openNewPersonnelModal ? window.openNewPersonnelModal(...args) : undefined);
export const openNewToolModal = (...args) => (window.openNewToolModal ? window.openNewToolModal(...args) : undefined);
export const openNewToolModal_v2 = (...args) => ((window.openNewToolModal_v2 || window.openNewToolModal) ? (window.openNewToolModal_v2 || window.openNewToolModal)(...args) : undefined);
export const openNewVehicleModal = (...args) => (window.openNewVehicleModal ? window.openNewVehicleModal(...args) : undefined);
export const openNewVehicleModal_v2 = (...args) => ((window.openNewVehicleModal_v2 || window.openNewVehicleModal) ? (window.openNewVehicleModal_v2 || window.openNewVehicleModal)(...args) : undefined);
export const openOdometerOcrModal = (...args) => (window.openOdometerOcrModal ? window.openOdometerOcrModal(...args) : undefined);
export const openResourceSubtab = (...args) => (window.openResourceSubtab ? window.openResourceSubtab(...args) : undefined);
export const returnResourceToBase = (...args) => (window.returnResourceToBase ? window.returnResourceToBase(...args) : undefined);
export const submitConfirmOdometer = (...args) => (window.submitConfirmOdometer ? window.submitConfirmOdometer(...args) : undefined);
export const submitCreateAsset = (...args) => (window.submitCreateAsset ? window.submitCreateAsset(...args) : undefined);
export const submitCreatePersonnel = (...args) => (window.submitCreatePersonnel ? window.submitCreatePersonnel(...args) : undefined);
export const submitCreateTool = (...args) => (window.submitCreateTool ? window.submitCreateTool(...args) : undefined);
export const submitCreateVehicle = (...args) => (window.submitCreateVehicle ? window.submitCreateVehicle(...args) : undefined);
export const submitResourceAction = (...args) => (window.submitResourceAction ? window.submitResourceAction(...args) : undefined);
export const switchResourceSubtab = (...args) => (window.switchResourceSubtab ? window.switchResourceSubtab(...args) : undefined);
export const openCalibrateOdometerModal = (...args) => (window.openCalibrateOdometerModal ? window.openCalibrateOdometerModal(...args) : undefined);
export const submitCalibrateOdometer = (...args) => (window.submitCalibrateOdometer ? window.submitCalibrateOdometer(...args) : undefined);
export const openCalibrateAllOdometersModal = (...args) => (window.openCalibrateAllOdometersModal ? window.openCalibrateAllOdometersModal(...args) : undefined);
export const submitCalibrateAllOdometers = (...args) => (window.submitCalibrateAllOdometers ? window.submitCalibrateAllOdometers(...args) : undefined);
export const filterToolsList = (...args) => (window.filterToolsList ? window.filterToolsList(...args) : undefined);
export const assignAvailableToolFromGroup = (...args) => (window.assignAvailableToolFromGroup ? window.assignAvailableToolFromGroup(...args) : undefined);
export const openToolHistoryModal = (...args) => (window.openToolHistoryModal ? window.openToolHistoryModal(...args) : undefined);
export const openAssetHistoryModal = (...args) => (window.openAssetHistoryModal ? window.openAssetHistoryModal(...args) : undefined);
export const openPersonnelHistoryModal = (...args) => (window.openPersonnelHistoryModal ? window.openPersonnelHistoryModal(...args) : undefined);
export const goToToolsPage = (...args) => (window.goToToolsPage ? window.goToToolsPage(...args) : undefined);
export const changeToolsPageSize = (...args) => (window.changeToolsPageSize ? window.changeToolsPageSize(...args) : undefined);
export const renderGroupedToolsPaginated = (...args) => (window.renderGroupedToolsPaginated ? window.renderGroupedToolsPaginated(...args) : undefined);
export const openVehicleServicesModal = (...args) => (window.openVehicleServicesModal ? window.openVehicleServicesModal(...args) : undefined);
export const filterFleetList = (...args) => (window.filterFleetList ? window.filterFleetList(...args) : undefined);
export const filterPersonnelList = (...args) => (window.filterPersonnelList ? window.filterPersonnelList(...args) : undefined);
export const onAssetCategorySelected = (...args) => (window.onAssetCategorySelected ? window.onAssetCategorySelected(...args) : undefined);
export const goToVehServicesPage = (...args) => (window.goToVehServicesPage ? window.goToVehServicesPage(...args) : undefined);
export const changeVehServicesPageSize = (...args) => (window.changeVehServicesPageSize ? window.changeVehServicesPageSize(...args) : undefined);
export const renderVehServicesTablePaginated = (...args) => (window.renderVehServicesTablePaginated ? window.renderVehServicesTablePaginated(...args) : undefined);
export const goToToolHistoryPage = (...args) => (window.goToToolHistoryPage ? window.goToToolHistoryPage(...args) : undefined);
export const changeToolHistoryPageSize = (...args) => (window.changeToolHistoryPageSize ? window.changeToolHistoryPageSize(...args) : undefined);
export const renderToolHistoryTablePaginated = (...args) => (window.renderToolHistoryTablePaginated ? window.renderToolHistoryTablePaginated(...args) : undefined);
export const goToAssetHistoryPage = (...args) => (window.goToAssetHistoryPage ? window.goToAssetHistoryPage(...args) : undefined);
export const changeAssetHistoryPageSize = (...args) => (window.changeAssetHistoryPageSize ? window.changeAssetHistoryPageSize(...args) : undefined);
export const renderAssetHistoryTablePaginated = (...args) => (window.renderAssetHistoryTablePaginated ? window.renderAssetHistoryTablePaginated(...args) : undefined);
export const goToPersonnelHistoryPage = (...args) => (window.goToPersonnelHistoryPage ? window.goToPersonnelHistoryPage(...args) : undefined);
export const changePersonnelHistoryPageSize = (...args) => (window.changePersonnelHistoryPageSize ? window.changePersonnelHistoryPageSize(...args) : undefined);
export const renderPersonnelHistoryTablePaginated = (...args) => (window.renderPersonnelHistoryTablePaginated ? window.renderPersonnelHistoryTablePaginated(...args) : undefined);
export const populatePersonnelDatalists = (...args) => (window.populatePersonnelDatalists ? window.populatePersonnelDatalists(...args) : undefined);
export const openEditPersonnelModal = (...args) => (window.openEditPersonnelModal ? window.openEditPersonnelModal(...args) : undefined);
export const submitEditPersonnel = (...args) => (window.submitEditPersonnel ? window.submitEditPersonnel(...args) : undefined);
export const togglePersonnelStatus = (...args) => (window.togglePersonnelStatus ? window.togglePersonnelStatus(...args) : undefined);
export const openEditAssetModal = (...args) => (window.openEditAssetModal ? window.openEditAssetModal(...args) : undefined);
export const submitEditAsset = (...args) => (window.submitEditAsset ? window.submitEditAsset(...args) : undefined);
export const toggleAssetStatus = (...args) => (window.toggleAssetStatus ? window.toggleAssetStatus(...args) : undefined);
export const onEditAssetTypeChanged = (...args) => (window.onEditAssetTypeChanged ? window.onEditAssetTypeChanged(...args) : undefined);

