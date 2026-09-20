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

import { Api } from './api.js?v=2026.09.19.v97.0';
import { State } from './state.js?v=2026.09.19.v97.0';
import { checkAuthStatus, performLogin, handleLogout, renderUserBadge, applyPermissionMap, redirectUserByRole } from './auth.js?v=2026.09.19.v97.0';

// Carga e Inicialización de Submódulos Especializados
import './modules/core.js?v=2026.09.19.v97.0';
import './modules/bcv.js?v=2026.09.19.v97.0';
import './modules/maintenance.js?v=2026.09.19.v97.0';
import './modules/projects.js?v=2026.09.19.v97.0';
import './modules/resources.js?v=2026.09.19.v97.0';
import './modules/quotations.js?v=2026.09.19.v97.0';
import './modules/expenses.js?v=2026.09.19.v97.0';
import './modules/financial.js?v=2026.09.19.v97.0';
import './modules/materials.js?v=2026.09.19.v97.0';
import './modules/dispatch.js?v=2026.09.19.v97.0';
import './modules/rentals.js?v=2026.09.19.v97.0';

// Exportar al scope global para compatibilidad total con eventos inline de index.html
window.Api = Api;
window.State = State;
window.performLogin = performLogin;
window.executePortalLogin = (u, p) => performLogin(u, p);
window.quickFillAndLogin = (u, p) => performLogin(u, p);
window.loginDirectlyAs = (u, p) => performLogin(u, p);
window.handlePortalLogin = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const u = document.getElementById('portal_username')?.value?.trim();
    const p = document.getElementById('portal_password')?.value;
    performLogin(u, p);
};
window.handleLogout = handleLogout;

// Universal Double-Submit Protection
window.withDoubleSubmitProtection = function(btnOrForm, asyncFn) {
    return async function(...args) {
        let btn = null;
        if (btnOrForm instanceof HTMLElement) {
            btn = (btnOrForm.tagName === 'BUTTON' || (btnOrForm.tagName === 'INPUT' && btnOrForm.type === 'submit'))
                ? btnOrForm 
                : btnOrForm.querySelector('button[type="submit"], button:not([type="button"])');
        } else if (typeof btnOrForm === 'string') {
            btn = document.querySelector(btnOrForm);
        }

        if (btn) {
            if (btn.dataset.submitting === "true" || btn.disabled) {
                console.warn("[DoubleSubmit] Solicitud concurrente bloqueada.");
                return;
            }
            btn.dataset.submitting = "true";
            btn.disabled = true;
            btn.classList.add('loading-submitting');
            var origHtml = btn.innerHTML;
            btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Procesando...`;
        }

        try {
            return await asyncFn.apply(this, args);
        } finally {
            if (btn) {
                setTimeout(() => {
                    btn.dataset.submitting = "false";
                    btn.disabled = false;
                    btn.classList.remove('loading-submitting');
                    btn.innerHTML = origHtml;
                }, 500);
            }
        }
    };
};

// Global Form Submit interceptor for double-click protection across all standard forms
document.addEventListener('submit', function(e) {
    const form = e.target;
    if (!form || form.tagName !== 'FORM') return;
    
    const submitBtn = form.querySelector('button[type="submit"], input[type="submit"], button:not([type="button"])');
    if (!submitBtn) return;
    
    if (submitBtn.dataset.submitting === "true") {
        e.preventDefault();
        e.stopImmediatePropagation();
        console.warn("[DoubleSubmit] Envío de formulario bloqueado por concurrencia.");
        return false;
    }
    
    submitBtn.dataset.submitting = "true";
    submitBtn.disabled = true;
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardando...';
    
    setTimeout(() => {
        submitBtn.dataset.submitting = "false";
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }, 4000);
}, true);

// Utility: Debounce for fast search inputs (250ms)
window.debounce = function(func, wait = 250) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

// Connected Debounced Search Functions (250ms) - V4.1.2
window.debouncedFilterToolsList = window.debounce(function() {
    if (typeof window.filterToolsList === 'function') window.filterToolsList();
}, 250);

window.debouncedFilterProjectsList = window.debounce(function(val) {
    if (typeof window.filterProjectsList === 'function') window.filterProjectsList(val);
}, 250);

window.debouncedFilterDispatchList = window.debounce(function(val) {
    if (typeof window.filterDispatchList === 'function') window.filterDispatchList(val);
}, 250);

window.debouncedApplyRentalsFilter = window.debounce(function() {
    if (typeof window.applyRentalsFilter === 'function') window.applyRentalsFilter();
}, 250);

window.debouncedFilterMaterialsTable = window.debounce(function() {
    if (typeof window.filterMaterialsTable === 'function') window.filterMaterialsTable();
}, 250);

window.debouncedFilterExpensesLog = window.debounce(function() {
    if (typeof window.filterExpensesLog === 'function') window.filterExpensesLog();
}, 250);

window.debouncedFilterMaintenanceAuditLogs = window.debounce(function() {
    if (typeof window.filterMaintenanceAuditLogs === 'function') window.filterMaintenanceAuditLogs();
}, 250);

window.debouncedFilterTransferToolsChecklist = window.debounce(function() {
    if (typeof window.filterTransferToolsChecklist === 'function') window.filterTransferToolsChecklist();
}, 250);

// Auto-bind debounce listeners to avoid high-frequency DOM thrashing
function initSearchDebounceBindings() {
    const searchBindings = [
        { id: "toolSearchInput", fn: window.debouncedFilterToolsList },
        { id: "rentalFilterSearch", fn: window.debouncedApplyRentalsFilter },
        { id: "filterMaterialSearch", fn: window.debouncedFilterMaterialsTable },
        { id: "log_filter_search", fn: window.debouncedFilterExpensesLog },
        { id: "auditFilterUser", fn: window.debouncedFilterMaintenanceAuditLogs },
        { id: "auditFilterQuery", fn: window.debouncedFilterMaintenanceAuditLogs },
        { id: "tg_tools_search", fn: window.debouncedFilterTransferToolsChecklist }
    ];

    searchBindings.forEach(({ id, fn }) => {
        const el = document.getElementById(id);
        if (el && !el.dataset.debounced) {
            el.addEventListener("input", fn);
            el.dataset.debounced = "true";
        }
    });

    const projInput = document.getElementById("project_search_input");
    if (projInput && !projInput.dataset.debounced) {
        projInput.addEventListener("input", (e) => window.debouncedFilterProjectsList(e.target.value));
        projInput.dataset.debounced = "true";
    }

    const dispInput = document.getElementById("dispatch_search_input");
    if (dispInput && !dispInput.dataset.debounced) {
        dispInput.addEventListener("input", (e) => window.debouncedFilterDispatchList(e.target.value));
        dispInput.dataset.debounced = "true";
    }
}
window.initSearchDebounceBindings = initSearchDebounceBindings;

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
    if (typeof window.initSearchDebounceBindings === 'function') {
        setTimeout(window.initSearchDebounceBindings, 50);
    }
};

// Bootstrap Inicial
document.addEventListener("DOMContentLoaded", async () => {
    fetchAndApplyBcvRate();
    if (typeof window.initSearchDebounceBindings === 'function') {
        window.initSearchDebounceBindings();
    }
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
        if (typeof window.loadInitialMasterData === 'function') {
            try { window.loadInitialMasterData(); } catch(e) { console.warn(e); }
        }
        if (typeof window.initSearchDebounceBindings === 'function') {
            setTimeout(window.initSearchDebounceBindings, 300);
        }
    } else {
        document.body.classList.remove('authenticated');
        if (loginScreen) loginScreen.style.setProperty('display', 'flex', 'important');
        if (authShell) authShell.style.setProperty('display', 'none', 'important');
    }
});
