/**
 * DALOR SIGO-P | Módulo: CORE_NAV.JS
 * Desacoplado de core.js
 * Navegación de vistas, menú responsive y control de dropdowns
 */

// --- BLOQUE L1120-L1609 ---
let lastDropdownToggleTime = 0;

function isMobileViewport() {
    return window.innerWidth <= 768;
}

function toggleDropdown(event, dropdownId) {
    if (event) {
        if (event.stopPropagation) event.stopPropagation();
    }

    lastDropdownToggleTime = Date.now();

    const targetDropdown = document.getElementById(dropdownId);

    if (!targetDropdown) return;

    // Si estamos en Móvil / iPhone / iPad -> Abrir Action Sheet Nativo
    if (isMobileViewport()) {
        openMobileSubmenu(dropdownId);

        return;

    }

    // Modo Desktop Estándar
    const isOpen = targetDropdown.classList.contains("open");

    closeAllDropdowns();

    if (!isOpen) {
        targetDropdown.classList.add("open");

    }

}

function openMobileSubmenu(dropdownId) {
    const targetDropdown = document.getElementById(dropdownId);

    if (!targetDropdown) return;

    const btn = targetDropdown.querySelector(".dropdown-btn");

    const menu = targetDropdown.querySelector(".dropdown-menu");

    const sheet = document.getElementById("mobileSubmenuSheet");

    const sheetTitle = document.getElementById("mobileSubmenuTitle");

    const sheetItems = document.getElementById("mobileSubmenuItems");

    if (!sheet || !sheetTitle || !sheetItems || !menu) return;

    // Obtener icono y título del botón
    const btnIcon = btn ? btn.querySelector("i") : null;

    const btnText = btn ? btn.querySelector("span") : null;

    const iconHtml = btnIcon ? btnIcon.outerHTML : '<i class="fa-solid fa-layer-group" style="color: var(--dalor-blue);"></i>';

    const titleText = btnText ? btnText.innerText : 'Opciones del Módulo';

    sheetTitle.innerHTML = `${iconHtml} <span>${titleText}</span>`;

    // Clonar items del menu para el sheet
    sheetItems.innerHTML = '';

    const items = menu.querySelectorAll(".dropdown-item");

    items.forEach(item => {
        const clone = item.cloneNode(true);

        // Manejador táctil seguro para iOS Safari
        clone.onclick = (e) => {
            if (e && e.stopPropagation) e.stopPropagation();

            closeMobileSubmenu();

            if (item.onclick) {
                item.onclick(e);

            }

        };

        sheetItems.appendChild(clone);

    });

    sheet.classList.add("active");

    document.body.style.overflow = "hidden";

}

function closeMobileSubmenu(event) {
    if (event && event.target && event.target.closest(".mobile-submenu-card") && !event.target.classList.contains("mobile-submenu-close")) return;

    const sheet = document.getElementById("mobileSubmenuSheet");

    if (sheet) {
        sheet.classList.remove("active");

    }

    document.body.style.overflow = "";

}

function closeAllDropdowns() {
    document.querySelectorAll(".nav-dropdown").forEach(drop => {
        drop.classList.remove("open");

    });

    closeMobileSubmenu();

}

// Navegación Modular Principal
function switchView(viewName, moduleCategory, targetSubtab = null) {
    closeAllDropdowns();

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

    document.querySelectorAll(".nav-dropdown").forEach(drop => drop.classList.remove("active"));
    const activeDropdown = document.getElementById(`dropdown-${moduleCategory}`);
    if (activeDropdown) activeDropdown.classList.add("active");

    // Guardar estado persistente en localStorage y sessionStorage para refrescos de pantalla
    try {
        localStorage.setItem('dalor_active_view', viewName);
        if (moduleCategory) localStorage.setItem('dalor_active_category', moduleCategory);
        sessionStorage.setItem('dalor_active_view', viewName);
        if (moduleCategory) sessionStorage.setItem('dalor_active_category', moduleCategory);
    } catch(e) {}

    if (viewName === 'executive' && typeof window.loadExecutiveDashboard === 'function') window.loadExecutiveDashboard();
    if (viewName === 'financial') {
        let sub = targetSubtab || localStorage.getItem('dalor_active_subtab_financial') || sessionStorage.getItem('dalor_active_subtab_financial') || 'cxc';
        const u = window.currentUser || (window.State && window.State.currentUser);
        if (u) {
            let p = {};
            try { p = typeof u.permissions_json === 'string' ? JSON.parse(u.permissions_json) : (u.permissions_json || u.permissions || {}); } catch(e){}
            const isDir = (u.username||'').toLowerCase() === 'director' || (u.role_name||'').toLowerCase().includes('director') || u.is_superuser === true;
            if (!isDir) {
                const hasGranularFin = p.cxc_view !== undefined || p.cxp_view !== undefined || p.bancos_view !== undefined || p.retiros_view !== undefined;
                const canCxc = p.cxc_view !== undefined ? !!(p.cxc_view || p.cxc_pay) : (hasGranularFin ? false : true);
                const canCxp = p.cxp_view !== undefined ? !!(p.cxp_view || p.cxp_pay) : (hasGranularFin ? false : true);
                const canBancos = p.bancos_view !== undefined ? !!p.bancos_view : (hasGranularFin ? false : true);
                const canPartners = p.retiros_view !== undefined ? !!p.retiros_view : false;

                const isAllowed = (sub === 'cxc' && canCxc) || (sub === 'cxp' && canCxp) || (sub === 'summary' && canBancos) || (sub === 'partners' && canPartners);
                if (!isAllowed) {
                    if (canCxc) sub = 'cxc';
                    else if (canCxp) sub = 'cxp';
                    else if (canBancos) sub = 'summary';
                    else if (canPartners) sub = 'partners';
                }
            }
        }
        if (typeof window.switchFinancialSubtab === 'function') window.switchFinancialSubtab(sub);
        else if (typeof window.openFinancialSubtab === 'function') window.openFinancialSubtab(sub);
    }
    if (viewName === 'maintenance') {
        const sub = targetSubtab || localStorage.getItem('dalor_active_subtab_maintenance') || sessionStorage.getItem('dalor_active_subtab_maintenance') || 'users';
        if (typeof window.switchMaintenanceSubtab === 'function') window.switchMaintenanceSubtab(sub);
        else if (typeof window.openMaintenanceSubtab === 'function') window.openMaintenanceSubtab(sub);
    }
    if (viewName === 'quotations' && typeof window.loadQuotations === 'function') window.loadQuotations();
    if (viewName === 'clients' && typeof window.loadClients === 'function') window.loadClients();
    if (viewName === 'services' && typeof window.loadServices === 'function') window.loadServices();
    if (viewName === 'projects') {
        const sub = targetSubtab || localStorage.getItem('dalor_active_subtab_projects') || sessionStorage.getItem('dalor_active_subtab_projects') || 'list';
        if (typeof window.switchProjectSubtab === 'function') window.switchProjectSubtab(sub);
        else if (typeof window.initProjectPlanningView === 'function') window.initProjectPlanningView();
    }
    if (viewName === 'dispatch') {
        const sub = targetSubtab || localStorage.getItem('dalor_active_subtab_dispatch') || sessionStorage.getItem('dalor_active_subtab_dispatch') || 'list';
        if (typeof window.switchDispatchSubtab === 'function') window.switchDispatchSubtab(sub);
        else if (typeof window.initDispatchView === 'function') window.initDispatchView();
    }
    if (viewName === 'dashboard' && typeof window.loadComparisonDashboard === 'function') window.loadComparisonDashboard();
    if (viewName === 'resources') {
        const sub = targetSubtab || localStorage.getItem('dalor_active_subtab_resources') || sessionStorage.getItem('dalor_active_subtab_resources') || 'dashboard';
        if (typeof window.switchResourceSubtab === 'function') window.switchResourceSubtab(sub);
        else if (typeof window.openResourceSubtab === 'function') window.openResourceSubtab(sub);
    }
    if (viewName === 'inbox' && typeof window.loadPendingExpensesInbox === 'function') window.loadPendingExpensesInbox();
    if (viewName === 'tree' && typeof window.loadCategoriesTree === 'function') window.loadCategoriesTree();
    if (viewName === 'expenses-log' && typeof window.loadExpensesLog === 'function') window.loadExpensesLog();

    if (window.onViewSwitched) window.onViewSwitched(viewName);
}

window.switchView = switchView;
window.appSwitchView = switchView;
window.isMobileViewport = isMobileViewport;
window.toggleDropdown = toggleDropdown;
window.openMobileSubmenu = openMobileSubmenu;
window.closeMobileSubmenu = closeMobileSubmenu;
window.closeAllDropdowns = closeAllDropdowns;

const handleOutsideClick = (e) => {
    if (Date.now() - lastDropdownToggleTime < 350) return;
    if (!e.target.closest(".nav-dropdown") && !e.target.closest(".dropdown-menu") && !e.target.closest(".mobile-submenu-card")) {
        closeAllDropdowns();
        closeMobileSubmenu();
    }
};
document.addEventListener("click", handleOutsideClick);
document.addEventListener("touchend", handleOutsideClick);

export {
    isMobileViewport,
    toggleDropdown,
    openMobileSubmenu,
    closeMobileSubmenu,
    closeAllDropdowns,
    switchView
};
