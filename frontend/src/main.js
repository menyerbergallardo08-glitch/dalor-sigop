// DALOR SIGO-P | Global Environment Initializer
window.API_BASE = window.API_BASE || (window.location.origin + "/api/v1");
window.EXCHANGE_RATE = window.EXCHANGE_RATE || parseFloat(localStorage.getItem('dalor_exchange_rate')) || 850.0;
window.BCV_DATA = window.BCV_DATA || { rate: 850.0, date_value: '', source: 'BCV Oficial', source_tier: 'oficial_directo' };
window.allClients = window.allClients || [];
window.allServices = window.allServices || [];
window.allProjects = window.allProjects || [];
window.allCategories = window.allCategories || [];
window.allAssets = window.allAssets || [];
window.allPersonnel = window.allPersonnel || [];
window.allMaterials = window.allMaterials || [];
window.quoteRowsCount = window.quoteRowsCount || 0;
window.splitRowsCount = window.splitRowsCount || 0;
window.phaseRowsCount = window.phaseRowsCount || 0;
window.selectedPersonnelIds = window.selectedPersonnelIds || [];
window.selectedVehicleIds = window.selectedVehicleIds || [];
window.selectedToolIds = window.selectedToolIds || [];
window.selectedMaterialIds = window.selectedMaterialIds || [];
try {
    window.currentUser = window.currentUser || JSON.parse(localStorage.getItem('dalor_user') || 'null');
} catch(e) { window.currentUser = null; }
window.authToken = window.authToken || localStorage.getItem('dalor_token') || null;

import { Api } from './api.js';
import { State } from './state.js';
import { checkAuthStatus, performLogin, handleLogout, renderUserBadge, applyPermissionMap, redirectUserByRole } from './auth.js';

// Carga e Inicialización de Submódulos Especializados
import './modules/core.js';
import './modules/bcv.js';
import './modules/maintenance.js';
import './modules/projects.js';
import './modules/resources.js';
import './modules/quotations.js';
import './modules/expenses.js';
import './modules/financial.js';
import './modules/materials.js';

// Exportar al scope global para compatibilidad total con eventos inline de index.html
window.Api = Api;
window.State = State;
window.performLogin = performLogin;
window.quickFillAndLogin = (u, p) => performLogin(u, p);
window.loginDirectlyAs = (u, p) => performLogin(u, p);
window.handlePortalLogin = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const u = document.getElementById('portal_username')?.value?.trim();
    const p = document.getElementById('portal_password')?.value;
    performLogin(u, p);
};
window.handleLogout = handleLogout;

// Control de Tasa Oficial BCV
async function fetchAndApplyBcvRate(forceRefresh = false) {
    try {
        const data = await Api.financial.getBcvRate(forceRefresh);
        State.bcvData = data;
        const val = parseFloat(data.rate);
        if (!isNaN(val) && val > 0) {
            State.exchangeRate = val;
            localStorage.setItem('dalor_exchange_rate', val);
            const display = document.getElementById("bcvRateDisplay");
            if (display) display.innerText = data.formatted_rate || val.toFixed(2);
            const input = document.getElementById("globalExchangeRateInput");
            if (input) input.value = val.toFixed(2);
        }
    } catch (e) {
        console.warn("No se pudo actualizar tasa BCV:", e);
    }
}
window.fetchAndApplyBcvRate = fetchAndApplyBcvRate;

// Router de Navegación de Vistas
window.switchView = function(viewName, moduleCategory) {
    if (typeof window.appSwitchView === 'function') {
        window.appSwitchView(viewName, moduleCategory);
        return;
    }

    const allViews = [
        'executive', 'financial', 'maintenance',
        'quotations', 'clients', 'services', 
        'projects', 'dispatch', 'dashboard', 
        'resources', 
        'pwa', 'manual', 'tree', 'inbox', 'expenses-log'
    ];

    allViews.forEach(v => {
        const el = document.getElementById(`view-${v}`);
        if (el) el.classList.add('hidden');
    });

    const activeView = document.getElementById(`view-${viewName}`);
    if (activeView) activeView.classList.remove('hidden');

    document.querySelectorAll(".nav-dropdown").forEach(drop => drop.classList.remove("active", "open"));
    const activeDropdown = document.getElementById(`dropdown-${moduleCategory}`);
    if (activeDropdown) activeDropdown.classList.add("active");

    if (viewName === 'executive' && typeof window.loadExecutiveDashboard === 'function') window.loadExecutiveDashboard();
    if (viewName === 'financial' && typeof window.openFinancialSubtab === 'function') window.openFinancialSubtab('cxc');
    if (viewName === 'maintenance' && typeof window.openMaintenanceSubtab === 'function') window.openMaintenanceSubtab('users');
    if (viewName === 'quotations' && typeof window.loadQuotations === 'function') window.loadQuotations();
    if (viewName === 'clients' && typeof window.loadClients === 'function') window.loadClients();
    if (viewName === 'services' && typeof window.loadServices === 'function') window.loadServices();
    if (viewName === 'projects' && typeof window.initProjectPlanningView === 'function') window.initProjectPlanningView();
    if (viewName === 'dispatch' && typeof window.initDispatchView === 'function') window.initDispatchView();
    if (viewName === 'dashboard' && typeof window.loadComparisonDashboard === 'function') window.loadComparisonDashboard();
    if (viewName === 'resources' && typeof window.switchResourceSubtab === 'function') window.switchResourceSubtab('dashboard');
    if (viewName === 'inbox' && typeof window.loadPendingExpensesInbox === 'function') window.loadPendingExpensesInbox();
    if (viewName === 'tree' && typeof window.loadCategoriesTree === 'function') window.loadCategoriesTree();
    if (viewName === 'expenses-log' && typeof window.loadExpensesLog === 'function') window.loadExpensesLog();

    if (window.onViewSwitched) {
        window.onViewSwitched(viewName);
    }
};

// Bootstrap Inicial
document.addEventListener("DOMContentLoaded", async () => {
    fetchAndApplyBcvRate();
    const isAuth = checkAuthStatus();
    
    const loginScreen = document.getElementById('app-login-screen');
    const authShell = document.getElementById('app-authenticated-shell');

    if (isAuth && State.currentUser) {
        document.body.classList.add('authenticated');
        if (loginScreen) loginScreen.style.setProperty('display', 'none', 'important');
        if (authShell) authShell.style.setProperty('display', 'block', 'important');
        
        renderUserBadge();
        applyPermissionMap(State.currentUser);
        redirectUserByRole(State.currentUser);
    } else {
        document.body.classList.remove('authenticated');
        if (loginScreen) loginScreen.style.setProperty('display', 'flex', 'important');
        if (authShell) authShell.style.setProperty('display', 'none', 'important');
    }
});
