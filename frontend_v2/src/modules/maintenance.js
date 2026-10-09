/**
 * DALOR SIGO-P | Módulo: MAINTENANCE.JS (Orquestador Desacoplado)
 * Submódulos independientes y especializados en ./maintenance/
 */

// 1. Carga de Submódulos Especializados (< 450 líneas c/u)
import './maintenance/maintenance_clients.js';
import './maintenance/maintenance_categories.js';
import './maintenance/maintenance_roles.js';
import './maintenance/maintenance_users.js';
import './maintenance/maintenance_audit.js';
import './maintenance/maintenance_bi.js';
import './maintenance/maintenance_backups.js';

// 2. Control de Navegación de Subpestañas del Módulo de Mantenimiento
export function openMaintenanceSubtab(subtab) {
    if (typeof window.switchView === 'function') {
        window.switchView('maintenance', 'mantenimiento', subtab);
    }
    switchMaintenanceSubtab(subtab);
}

export function switchMaintenanceSubtab(subtab) {
    try { sessionStorage.setItem('dalor_active_subtab_maintenance', subtab); } catch(e) {}

    ['users', 'roles', 'audit', 'backups', 'clean'].forEach(t => {
        const pane = document.getElementById(`subtab-maint-${t}`);
        const btn = document.getElementById(`tabbtn-maint-${t}`);
        if (pane) pane.classList.add('hidden');
        if (btn) btn.classList.remove('active');
    });

    const activePane = document.getElementById(`subtab-maint-${subtab}`);
    const activeBtn = document.getElementById(`tabbtn-maint-${subtab}`);
    if (activePane) activePane.classList.remove('hidden');
    if (activeBtn) activeBtn.classList.add('active');

    if (subtab === 'users' && typeof window.loadMaintenanceUsersList === 'function') window.loadMaintenanceUsersList();
    if (subtab === 'roles' && typeof window.loadMaintenanceRolesList === 'function') window.loadMaintenanceRolesList();
    if (subtab === 'audit' && typeof window.loadMaintenanceAuditLogs === 'function') window.loadMaintenanceAuditLogs();
    if (subtab === 'backups' && typeof window.loadBackupsList === 'function') window.loadBackupsList();
}

export function openMaintenanceSubtab_v2(subtab) {
    if (subtab === 'users') {
        if (typeof window.openUserManagementModal === 'function') {
            window.openUserManagementModal();
        }
    } else {
        alert(`Módulo de ${subtab} activo.`);
    }
}

// 3. Exportaciones Seguras ES6 delegadas a las funciones en scope global window
export const applyPermissionMap = (...args) => (window.applyPermissionMap ? window.applyPermissionMap(...args) : undefined);
export const checkAuthStatus = (...args) => (window.checkAuthStatus ? window.checkAuthStatus(...args) : undefined);
export const createNewBackup = (...args) => (window.createNewBackup ? window.createNewBackup(...args) : undefined);
export const deleteClient = (...args) => (window.deleteClient ? window.deleteClient(...args) : undefined);
export const fillAndSubmitQuickLogin = (...args) => (window.fillAndSubmitQuickLogin ? window.fillAndSubmitQuickLogin(...args) : undefined);
export const fillQuickLogin = (...args) => (window.fillQuickLogin ? window.fillQuickLogin(...args) : undefined);
export const filterBIDashboard = (...args) => (window.filterBIDashboard ? window.filterBIDashboard(...args) : undefined);
export const filterBIExtended = (...args) => (window.filterBIExtended ? window.filterBIExtended(...args) : undefined);
export const filterMaintenanceAuditLogs = (...args) => (window.filterMaintenanceAuditLogs ? window.filterMaintenanceAuditLogs(...args) : undefined);
export const handleLogout = (...args) => (window.handleLogout ? window.handleLogout(...args) : undefined);
export const loadBackupsList = (...args) => (window.loadBackupsList ? window.loadBackupsList(...args) : undefined);
export const loadCategoriesTree = (...args) => (window.loadCategoriesTree ? window.loadCategoriesTree(...args) : undefined);
export const loadClients = (...args) => (window.loadClients ? window.loadClients(...args) : undefined);
export const loadComparisonDashboard = (...args) => (window.loadComparisonDashboard ? window.loadComparisonDashboard(...args) : undefined);
export const debouncedFilterComparisonDashboard = (...args) => (window.debouncedFilterComparisonDashboard ? window.debouncedFilterComparisonDashboard(...args) : undefined);
export const filterComparisonDashboard = (...args) => (window.filterComparisonDashboard ? window.filterComparisonDashboard(...args) : undefined);
export const goToComparisonPage = (...args) => (window.goToComparisonPage ? window.goToComparisonPage(...args) : undefined);
export const changeComparisonPageSize = (...args) => (window.changeComparisonPageSize ? window.changeComparisonPageSize(...args) : undefined);
export const loadExecutiveDashboard = (...args) => (window.loadExecutiveDashboard ? window.loadExecutiveDashboard(...args) : undefined);
export const loadMaintenanceAuditLogs = (...args) => (window.loadMaintenanceAuditLogs ? window.loadMaintenanceAuditLogs(...args) : undefined);
export const loadMaintenanceUsersList = (...args) => (window.loadMaintenanceUsersList ? window.loadMaintenanceUsersList(...args) : undefined);
export const loadMaintenanceRolesList = (...args) => (window.loadMaintenanceRolesList ? window.loadMaintenanceRolesList(...args) : undefined);
export const openNewRoleModal = (...args) => (window.openNewRoleModal ? window.openNewRoleModal(...args) : undefined);
export const openEditRoleModal = (...args) => (window.openEditRoleModal ? window.openEditRoleModal(...args) : undefined);
export const autoGenerateRoleSlug = (...args) => (window.autoGenerateRoleSlug ? window.autoGenerateRoleSlug(...args) : undefined);
export const submitRoleForm = (...args) => (window.submitRoleForm ? window.submitRoleForm(...args) : undefined);
export const deleteRole = (...args) => (window.deleteRole ? window.deleteRole(...args) : undefined);
export const onNewUserRoleChanged = (...args) => (window.onNewUserRoleChanged ? window.onNewUserRoleChanged(...args) : undefined);
export const loadUsersManagementTable = (...args) => (window.loadUsersManagementTable ? window.loadUsersManagementTable(...args) : undefined);
export const loginDirectlyAs = (...args) => (window.loginDirectlyAs ? window.loginDirectlyAs(...args) : undefined);
export const onUserRoleTemplateChanged = (...args) => (window.onUserRoleTemplateChanged ? window.onUserRoleTemplateChanged(...args) : undefined);
export const openNewClientModal = (...args) => (window.openNewClientModal ? window.openNewClientModal(...args) : undefined);
export const openNewUserModal = (...args) => (window.openNewUserModal ? window.openNewUserModal(...args) : undefined);
export const openNewUserModal_v2 = (...args) => (window.openNewUserModal_v2 ? window.openNewUserModal_v2(...args) : undefined);
export const openUserManagementModal = (...args) => (window.openUserManagementModal ? window.openUserManagementModal(...args) : undefined);
export const openUserPermissionsModal = (...args) => (window.openUserPermissionsModal ? window.openUserPermissionsModal(...args) : undefined);
export const populateBISlicers = (...args) => (window.populateBISlicers ? window.populateBISlicers(...args) : undefined);
export const redirectUserByRole = (...args) => (window.redirectUserByRole ? window.redirectUserByRole(...args) : undefined);
export const renderBIAnalyticsCharts = (...args) => (window.renderBIAnalyticsCharts ? window.renderBIAnalyticsCharts(...args) : undefined);
export const renderBIPnlTable = (...args) => (window.renderBIPnlTable ? window.renderBIPnlTable(...args) : undefined);
export const goToBiPnlPage = (...args) => (window.goToBiPnlPage ? window.goToBiPnlPage(...args) : undefined);
export const changeBiPnlPageSize = (...args) => (window.changeBiPnlPageSize ? window.changeBiPnlPageSize(...args) : undefined);
export const renderBIPnlTablePaginated = (...args) => (window.renderBIPnlTablePaginated ? window.renderBIPnlTablePaginated(...args) : undefined);
export const renderCleanRadialCharts = (...args) => (window.renderCleanRadialCharts ? window.renderCleanRadialCharts(...args) : undefined);
export const renderUserBadge = (...args) => (window.renderUserBadge ? window.renderUserBadge(...args) : undefined);
export const resetMaintenanceAuditFilters = (...args) => (window.resetMaintenanceAuditFilters ? window.resetMaintenanceAuditFilters(...args) : undefined);
export const restoreBackup = (...args) => (window.restoreBackup ? window.restoreBackup(...args) : undefined);
export const showLoginError = (...args) => (window.showLoginError ? window.showLoginError(...args) : undefined);
export const submitCreateClient = (...args) => (window.submitCreateClient ? window.submitCreateClient(...args) : undefined);
export const submitCreateUser = (...args) => (window.submitCreateUser ? window.submitCreateUser(...args) : undefined);
export const submitCreateUser_v2 = (...args) => (window.submitCreateUser_v2 ? window.submitCreateUser_v2(...args) : undefined);
export const submitLogin = (...args) => (window.submitLogin ? window.submitLogin(...args) : undefined);
export const submitSaveUserPermissions = (...args) => (window.submitSaveUserPermissions ? window.submitSaveUserPermissions(...args) : undefined);
export const toggleUserStatus = (...args) => (window.toggleUserStatus ? window.toggleUserStatus(...args) : undefined);
export const goToClientsPage = (...args) => (window.goToClientsPage ? window.goToClientsPage(...args) : undefined);
export const changeClientsPageSize = (...args) => (window.changeClientsPageSize ? window.changeClientsPageSize(...args) : undefined);
export const renderClientsPaginated = (...args) => (window.renderClientsPaginated ? window.renderClientsPaginated(...args) : undefined);
export const onClientSearchInput = (...args) => (window.onClientSearchInput ? window.onClientSearchInput(...args) : undefined);
export const openEditClientModal = (...args) => (window.openEditClientModal ? window.openEditClientModal(...args) : undefined);
export const submitEditClient = (...args) => (window.submitEditClient ? window.submitEditClient(...args) : undefined);
export const openClientHistoryModal = (...args) => (window.openClientHistoryModal ? window.openClientHistoryModal(...args) : undefined);
export const openCategoryHistoryModal = (...args) => (window.openCategoryHistoryModal ? window.openCategoryHistoryModal(...args) : undefined);
export const debouncedFilterCategoryHistory = (...args) => (window.debouncedFilterCategoryHistory ? window.debouncedFilterCategoryHistory(...args) : undefined);
export const filterCategoryHistory = (...args) => (window.filterCategoryHistory ? window.filterCategoryHistory(...args) : undefined);
export const goToCategoryHistoryPage = (...args) => (window.goToCategoryHistoryPage ? window.goToCategoryHistoryPage(...args) : undefined);
export const changeCategoryHistoryPageSize = (...args) => (window.changeCategoryHistoryPageSize ? window.changeCategoryHistoryPageSize(...args) : undefined);
export const openCreateCategoryModal = (...args) => (window.openCreateCategoryModal ? window.openCreateCategoryModal(...args) : undefined);
export const submitCreateCategory = (...args) => (window.submitCreateCategory ? window.submitCreateCategory(...args) : undefined);
export const toggleCategoryActive = (...args) => (window.toggleCategoryActive ? window.toggleCategoryActive(...args) : undefined);
export const goToAuditPage = (...args) => (window.goToAuditPage ? window.goToAuditPage(...args) : undefined);
export const changeAuditPageSize = (...args) => (window.changeAuditPageSize ? window.changeAuditPageSize(...args) : undefined);

// Exponer navegación en window
if (typeof window !== 'undefined') {
    window.openMaintenanceSubtab = openMaintenanceSubtab;
    window.switchMaintenanceSubtab = switchMaintenanceSubtab;
    window.openMaintenanceSubtab_v2 = openMaintenanceSubtab_v2;
}
