/**
 * DALOR SIGO-P | Módulo: CORE.JS
 * Extraído y desacoplado del monolito de producción (v94)
 */

// --- BLOQUE L1-L34 ---
// Global Helper: roundNumber
function roundNumber(num, decimals = 2) {
    const factor = Math.pow(10, decimals);
    return Math.round((Number(num) || 0) * factor) / factor;
}
window.roundNumber = roundNumber;


// --------------------------------------------------------------------------
// DALOR PARSER NUMERICO UNIVERSAL PARA MULTIMONEDA (USD / VES / EUR)
// --------------------------------------------------------------------------
function parseLocalizedNumber(val) {
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    if (!val) return 0;
    let s = String(val).trim().replace(/[$Bs€\s]/g, '');
    if (s.includes(',') && s.includes('.')) {
        if (s.indexOf('.') < s.indexOf(',')) {
            s = s.replace(/\./g, '').replace(',', '.');
        } else {
            s = s.replace(/,/g, '');
        }
    } else if (s.includes(',')) {
        s = s.replace(',', '.');
    }
    const num = parseFloat(s);
    return isNaN(num) ? 0 : num;
}



window.API_BASE = window.location.origin + "/api/v1";
var API_BASE = window.API_BASE;





// --- BLOQUE L323-L384 ---
// ==============================================================================

// 🛠️ FUNCIONES UNIVERSALES DE UTILIDAD & ORDENAMIENTO NUMÉRICO JERÁRQUICO

// ==============================================================================

function populateSelect(selectId, items, mapFn) {

    const el = document.getElementById(selectId);

    if (!el) return;

    if (!Array.isArray(items)) {

        el.innerHTML = '';

        return;

    }

    el.innerHTML = items.map(mapFn).join('');

}



function sortCategoriesNumerically(cats) {

    if (!Array.isArray(cats)) return [];

    return [...cats].sort((a, b) => {

        const partsA = String(a.code || "").split('.').map(n => parseInt(n, 10) || 0);

        const partsB = String(b.code || "").split('.').map(n => parseInt(n, 10) || 0);

        for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {

            const valA = partsA[i] !== undefined ? partsA[i] : -1;

            const valB = partsB[i] !== undefined ? partsB[i] : -1;

            if (valA !== valB) return valA - valB;

        }

        return String(a.name || "").localeCompare(String(b.name || ""));

    });

}



// Purga obligatoria de localStorage para garantizar que SIEMPRE aparezca la pantalla de login

localStorage.removeItem('dalor_user');

localStorage.removeItem('dalor_token');





// --- BLOQUE L385-L496 ---
// ==============================================================================

// 💵 CÁLCULOS DE MONTO & CONDICIÓN FISCAL EN FORMULARIO DE CAMPO

// ==============================================================================

window.calcFieldBs = function() {

    const usd = parseFloat(document.getElementById("field_amount_usd")?.value) || 0;

    const rate = parseFloat(document.getElementById("globalExchangeRateInput")?.value) || EXCHANGE_RATE;

    const bsEl = document.getElementById("field_amount_bs");

    if (bsEl && !isNaN(usd)) {

        bsEl.value = (usd * rate).toFixed(2);

    }

    updateFieldTaxDisplays();

};



window.calcFieldUsd = function() {

    const bs = parseFloat(document.getElementById("field_amount_bs")?.value) || 0;

    const rate = parseFloat(document.getElementById("globalExchangeRateInput")?.value) || EXCHANGE_RATE;

    const usdEl = document.getElementById("field_amount_usd");

    if (usdEl && !isNaN(bs) && rate > 0) {

        usdEl.value = (bs / rate).toFixed(2);

    }

    updateFieldTaxDisplays();

};



window.onFieldTaxConditionChanged = function() {

    updateFieldTaxDisplays();

};



function updateFieldTaxDisplays() {

    const usd = parseFloat(document.getElementById("field_amount_usd")?.value) || 0;

    const isExempt = document.getElementById("field_is_tax_exempt")?.value === "true";

    const base = isExempt ? usd : +(usd / 1.16).toFixed(2);

    const tax = isExempt ? 0.0 : +(usd - base).toFixed(2);

    const baseIn = document.getElementById("field_base_amount_usd");

    const taxIn = document.getElementById("field_tax_amount_usd");

    const baseDisp = document.getElementById("field_base_display");

    const taxDisp = document.getElementById("field_tax_display");

    if (baseIn) baseIn.value = base.toFixed(2);

    if (taxIn) taxIn.value = tax.toFixed(2);

    if (baseDisp) baseDisp.innerText = `$${base.toFixed(2)}`;

    if (taxDisp) taxDisp.innerText = `$${tax.toFixed(2)}`;

}



window.onValTaxChanged = function() {

    const usd = parseFloat(document.getElementById("val_amount_usd")?.value) || 0;

    const isExempt = document.getElementById("val_is_tax_exempt")?.value === "true";

    const base = isExempt ? usd : +(usd / 1.16).toFixed(2);

    const tax = isExempt ? 0.0 : +(usd - base).toFixed(2);

    const baseEl = document.getElementById("val_base_usd");

    const taxEl = document.getElementById("val_tax_usd");

    if (baseEl) baseEl.value = base.toFixed(2);

    if (taxEl) taxEl.value = tax.toFixed(2);

};



window.APP_BUILD_VERSION = "2026.09.15.v93-clean-production";

console.log("--> DALOR SIGO-P INITIALIZED v22");





// --- BLOQUE L765-L917 ---
// ==============================================================================

// 🚀 VERSIONADO & PURGA AUTOMÁTICA DE CACHÉ CLIENTE

// ==============================================================================

window.APP_BUILD_VERSION = "2026.09.15.v93-clean-production";

var APP_BUILD_VERSION = window.APP_BUILD_VERSION;

// Forzar purga de sesiones previas en cada actualización para garantizar que SIEMPRE pida login

if (localStorage.getItem("dalor_build_version") !== APP_BUILD_VERSION) {

    localStorage.clear();

    sessionStorage.clear();

    localStorage.setItem("dalor_build_version", APP_BUILD_VERSION);

    localStorage.setItem("dalor_exchange_rate", "850.0");

}



let EXCHANGE_RATE = parseFloat(localStorage.getItem('dalor_exchange_rate')) || 850.0;



var allClients = window.allClients = window.allClients || [];

var allServices = window.allServices = window.allServices || [];

var allProjects = window.allProjects = window.allProjects || [];

var allCategories = window.allCategories = window.allCategories || [];

var allAssets = window.allAssets = window.allAssets || [];

var allPersonnel = window.allPersonnel = window.allPersonnel || [];

var allMaterials = window.allMaterials = window.allMaterials || [];

let quoteRowsCount = 0;

let splitRowsCount = 0;

let phaseRowsCount = 0;



// Estado de Selección de Recursos en Planificación de Obra

let selectedPersonnelIds = [];

let selectedVehicleIds = [];

let selectedToolIds = [];
let selectedMaterialIds = [];



// Inicialización

let currentUser = null;

let authToken = localStorage.getItem('dalor_token') || null;

let lastDropdownToggleTime = 0;



document.addEventListener("DOMContentLoaded", async () => {

    const rateInput = document.getElementById("globalExchangeRateInput");

    if (rateInput) rateInput.value = EXCHANGE_RATE.toFixed(2);



    const handleOutsideClick = (e) => {

        if (Date.now() - lastDropdownToggleTime < 350) return;

        if (!e.target.closest(".nav-dropdown") && !e.target.closest(".dropdown-menu") && !e.target.closest(".mobile-submenu-card")) {

            closeAllDropdowns();

            closeMobileSubmenu();

        }

    };



    document.addEventListener("click", handleOutsideClick);

    document.addEventListener("touchend", handleOutsideClick);



    const isAuth = await checkAuthStatus();

    fetchAndApplyBcvRate();

    

    const loginScreen = document.getElementById('app-login-screen');

    const authShell = document.getElementById('app-authenticated-shell');

    const nav = document.querySelector('.mobile-bottom-nav');



    if (isAuth && currentUser) {

        document.body.classList.add('authenticated');

        if (loginScreen) loginScreen.style.setProperty('display', 'none', 'important');

        if (authShell) authShell.style.setProperty('display', 'block', 'important');

        

        renderUserBadge();

        applyPermissionMap(currentUser);

        configureMobileNav(currentUser);

        redirectUserByRole(currentUser);

        loadInitialMasterData();

    } else {

        document.body.classList.remove('authenticated');

        if (loginScreen) loginScreen.style.setProperty('display', 'flex', 'important');

        if (authShell) authShell.style.setProperty('display', 'none', 'important');

        if (nav) nav.style.setProperty('display', 'none', 'important');

    }

});





// --- BLOQUE L1120-L1609 ---
function isMobileViewport() {

    return window.innerWidth <= 768 || ('ontouchstart' in window && window.innerWidth <= 1024);

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

function switchView(viewName, moduleCategory) {

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



    if (viewName === 'executive') loadExecutiveDashboard();

    if (viewName === 'financial') switchFinancialSubtab('cxc');

    if (viewName === 'maintenance') switchMaintenanceSubtab('users');

    if (viewName === 'quotations') loadQuotations();

    if (viewName === 'clients') loadClients();

    if (viewName === 'services') loadServices();

    if (viewName === 'projects') initProjectPlanningView();

    if (viewName === 'dispatch') initDispatchView();

    if (viewName === 'dashboard') loadComparisonDashboard();

    if (viewName === 'resources') switchResourceSubtab('dashboard');

    if (viewName === 'inbox') loadPendingExpensesInbox();

    if (viewName === 'tree') loadCategoriesTree();

    if (viewName === 'expenses-log') loadExpensesLog();

}

window.switchView = switchView;

window.appSwitchView = switchView;



// Carga Inicial de Datos Maestros

async function loadInitialMasterData() {

    // Auto-sincronización de catálogo DALOR si faltan datos

    try {

        await fetch(`${API_BASE}/maintenance/sync-dalor-catalog`, { method: "POST" });

    } catch(e) {}



    try {

        const [resCli, resSrv, resProj, resCat, resAss, resPers, resMat] = await Promise.all([

            fetch(`${API_BASE}/clients/`),

            fetch(`${API_BASE}/services/`),

            fetch(`${API_BASE}/projects/`),

            fetch(`${API_BASE}/expenses/categories`),

            fetch(`${API_BASE}/assets/`),

            fetch(`${API_BASE}/personnel/`),

            fetch(`${API_BASE}/materials/`)

        ]);



        const cliData = resCli.ok ? await resCli.json() : [];
        window.allClients = allClients = Array.isArray(cliData) ? cliData : [];

        const srvData = resSrv.ok ? await resSrv.json() : [];
        window.allServices = allServices = Array.isArray(srvData) ? srvData : [];

        const projData = resProj.ok ? await resProj.json() : [];
        window.allProjects = allProjects = Array.isArray(projData) ? projData : [];

        const catData = resCat.ok ? await resCat.json() : [];
        window.allCategories = allCategories = Array.isArray(catData) ? catData : [];

        const assData = resAss.ok ? await resAss.json() : [];
        window.allAssets = allAssets = Array.isArray(assData) ? assData : [];

        const persData = resPers.ok ? await resPers.json() : [];
        window.allPersonnel = allPersonnel = Array.isArray(persData) ? persData : [];

        const matData = resMat.ok ? await resMat.json() : {};
        window.allMaterials = allMaterials = Array.isArray(matData.materials) ? matData.materials : (Array.isArray(matData) ? matData : []);



        populateSelectDropdowns();

        populatePlanDropdownSelectors();

        updatePendingInboxBadge();

    } catch (e) {

        console.error("Error al cargar datos maestros:", e);

    }

}



function populateSelectDropdowns() {

    const safeClients = (window.allClients && window.allClients.length > 0) 
        ? window.allClients 
        : (Array.isArray(allClients) ? allClients : []);

    const safeProjects = (window.allProjects && window.allProjects.length > 0) 
        ? window.allProjects 
        : (Array.isArray(allProjects) ? allProjects : []);

    const safeCategories = (window.allCategories && window.allCategories.length > 0) 
        ? window.allCategories 
        : (Array.isArray(allCategories) ? allCategories : []);

    const safeAssets = (window.allAssets && window.allAssets.length > 0) 
        ? window.allAssets 
        : (Array.isArray(allAssets) ? allAssets : []);

    const safeMaterials = (window.allMaterials && window.allMaterials.length > 0) 
        ? window.allMaterials 
        : (Array.isArray(allMaterials) ? allMaterials : []);

    const safePersonnel = (window.allPersonnel && window.allPersonnel.length > 0) 
        ? window.allPersonnel 
        : (Array.isArray(allPersonnel) ? allPersonnel : []);



        // Helper para repoblar selectores PRESERVANDO la seleccion activa
    const setSafeOptions = (id, optsHtml) => {
        const sel = document.getElementById(id);
        if (!sel) return;
        const prev = sel.value;
        sel.innerHTML = optsHtml;
        if (prev) sel.value = prev;
    };

    // Clientes Selects
    const cliOptions = `<option value="">-- Seleccione Cliente --</option>` + 
        safeClients.map(c => `<option value="${c.id}">[${c.code}] ${c.name} (${c.rif || 'Sin RIF'})</option>`).join('');
    
    setSafeOptions("quote_client_id", cliOptions);
    setSafeOptions("new_proj_client_id", cliOptions);
    setSafeOptions("cxc_client_id", cliOptions);
    setSafeOptions("rcp_client_id", cliOptions);

    // Auto-seleccionar si solo hay 1 cliente disponible (ej. OXICAR)
    if (safeClients.length === 1) {
        const qCli = document.getElementById("quote_client_id");
        if (qCli && !qCli.value) qCli.value = String(safeClients[0].id);
        const npCli = document.getElementById("new_proj_client_id");
        if (npCli && !npCli.value) npCli.value = String(safeClients[0].id);
    }



    // Proyectos Selects

    const projOptions = `<option value="">-- Gasto General Sede (Sin Proyecto) --</option>` + 

        safeProjects.map(p => `<option value="${p.id}">${p.code} - ${p.name}</option>`).join('');

    

    if (document.getElementById("field_project_id")) document.getElementById("field_project_id").innerHTML = projOptions;

    if (document.getElementById("manual_project_id")) document.getElementById("manual_project_id").innerHTML = projOptions;

    if (document.getElementById("cxc_project_id")) document.getElementById("cxc_project_id").innerHTML = projOptions;

    if (document.getElementById("cxp_project_id")) document.getElementById("cxp_project_id").innerHTML = projOptions;

    if (document.getElementById("rcp_project_id")) document.getElementById("rcp_project_id").innerHTML = projOptions;

    if (document.getElementById("mc_project_id")) document.getElementById("mc_project_id").innerHTML = 

        `<option value="">-- Consumo Interno Taller Central (Gasto Sede) --</option>` + 

        safeProjects.map(p => `<option value="${p.id}">${p.code} - ${p.name}</option>`).join('');



    if (document.getElementById("modal_target_project_id")) document.getElementById("modal_target_project_id").innerHTML = 

        safeProjects.map(p => `<option value="${p.id}">${p.code} - ${p.name} (${p.location})</option>`).join('');

    if (document.getElementById("tg_project_id")) document.getElementById("tg_project_id").innerHTML = 

        `<option value="">-- Seleccione Proyecto Aprobado --</option>` +

        safeProjects.map(p => `<option value="${p.id}" data-location="${p.location}">${p.code} - ${p.name} (${p.location})</option>`).join('');



    // Categorías Selects (Ordenadas numéricamente 1.0 -> 1.1 -> 2.0 -> 10.0)

    const sortedCats = sortCategoriesNumerically(safeCategories);

    const catOptions = sortedCats.map(c => `<option value="${c.id}">[${c.code}] ${c.name}</option>`).join('');

    if (document.getElementById("field_category_id")) document.getElementById("field_category_id").innerHTML = catOptions;

    if (document.getElementById("manual_category_id")) document.getElementById("manual_category_id").innerHTML = catOptions;



    // Activos / Flota

    const assOptions = `<option value="">-- No Aplica --</option>` + 

        safeAssets.map(a => `<option value="${a.id}">${a.asset_code} - ${a.name}</option>`).join('');

    if (document.getElementById("field_asset_id")) document.getElementById("field_asset_id").innerHTML = assOptions;



    // Vehículos para Guías

    const vehicles = allAssets.filter(a => a.asset_type === 'vehiculo' || a.asset_type === 'camioneta');

    const vehOptions = `<option value="">-- Seleccione Vehículo de Transporte --</option>` + 

        vehicles.map(v => `<option value="${v.id}">[${v.asset_code}] ${v.name} (Placa: ${v.license_plate || 'S/P'})</option>`).join('');

    if (document.getElementById("tg_vehicle_id")) document.getElementById("tg_vehicle_id").innerHTML = vehOptions;



    // Materiales Selects

    const matOptions = `<option value="">-- Seleccione Material --</option>` + 

        allMaterials.map(m => `<option value="${m.id}" data-cost="${m.unit_cost_usd}" data-stock="${m.stock_quantity}" data-unit="${m.unit_measure}">[${m.code}] ${m.name} (${m.stock_quantity} ${m.unit_measure} disp. - $${m.unit_cost_usd}/u)</option>`).join('');

    if (document.getElementById("me_material_id")) document.getElementById("me_material_id").innerHTML = matOptions;

    if (document.getElementById("mc_material_id")) document.getElementById("mc_material_id").innerHTML = matOptions;



    // Personal Selects

    if (allPersonnel && allPersonnel.length > 0) {

        const persOptions = allPersonnel.map(p => `<option value="${p.id}">[${p.code}] ${p.full_name}${p.role_title ? ' - ' + p.role_title : ''}</option>`).join('');

        if (document.getElementById("field_reported_by")) document.getElementById("field_reported_by").innerHTML = persOptions;

        if (document.getElementById("manual_reported_by")) document.getElementById("manual_reported_by").innerHTML = persOptions;

    }



    // Preseleccionar usuario conectado

    if (currentUser && allPersonnel && allPersonnel.length > 0) {

        const userMatch = allPersonnel.find(p => 

            (p.full_name && currentUser.username && p.full_name.toLowerCase().includes(currentUser.username.toLowerCase())) ||

            (p.role_title && currentUser.role && p.role_title.toLowerCase().includes(currentUser.role.toLowerCase()))

        ) || allPersonnel[0];

        

        if (userMatch) {

            if (document.getElementById("field_reported_by")) document.getElementById("field_reported_by").value = userMatch.id;

            if (document.getElementById("manual_reported_by")) document.getElementById("manual_reported_by").value = userMatch.id;

        }

    }

}





// --- BLOQUE L8013-L8038 ---
// ----------------------------------------------------

// UTILIDADES MODALES

// ----------------------------------------------------

function openModal(modalId) {
    if (modalId === 'modalNewQuotation') modalId = 'modalQuotation';
    const el = document.getElementById(modalId);

    if (el) el.classList.remove("hidden");

}



function closeModal(modalId) {

    const el = document.getElementById(modalId);

    if (el) el.classList.add("hidden");

}





// --- BLOQUE L13829-L14266 ---
// ==============================================================================

// 🔔 SISTEMA DE ALERTAS EN TIEMPO REAL: SONIDO (CHIME), TOAST & AUTO-REFRESH

// ==============================================================================



let isSoundAlertsEnabled = localStorage.getItem('dalor_sound_alerts') !== 'false'; // Activo por defecto

let lastKnownPendingIds = new Set();

let isFirstPendingCheck = true;



function toggleSoundAlerts() {

    isSoundAlertsEnabled = !isSoundAlertsEnabled;

    localStorage.setItem('dalor_sound_alerts', isSoundAlertsEnabled ? 'true' : 'false');

    updateSoundToggleUI();

    if (isSoundAlertsEnabled) {

        playNotificationChime();

    }

}



function updateSoundToggleUI() {

    const icon1 = document.getElementById('iconSoundToggle');

    const txt1 = document.getElementById('textSoundToggle');

    const icon2 = document.getElementById('iconSoundToggleInbox');

    const txt2 = document.getElementById('textSoundToggleInbox');

    const btn1 = document.getElementById('btnSoundToggle');

    

    if (icon1 && txt1) {

        if (isSoundAlertsEnabled) {

            icon1.className = 'fa-solid fa-bell';

            txt1.innerText = 'Sonido: ON';

            if (btn1) {

                btn1.style.color = '#fbbf24';

                btn1.style.borderColor = '#fbbf24';

            }

        } else {

            icon1.className = 'fa-solid fa-bell-slash';

            txt1.innerText = 'Sonido: OFF';

            if (btn1) {

                btn1.style.color = '#94a3b8';

                btn1.style.borderColor = '#334155';

            }

        }

    }



    if (icon2 && txt2) {

        if (isSoundAlertsEnabled) {

            icon2.className = 'fa-solid fa-bell';

            icon2.style.color = '#059669';

            txt2.innerText = 'Alertas Sonoras: ON';

        } else {

            icon2.className = 'fa-solid fa-bell-slash';

            icon2.style.color = '#94a3b8';

            txt2.innerText = 'Alertas Sonoras: OFF';

        }

    }

}



// 🔊 Generador de Tono de Notificación Nativo (Web Audio API - Cero Dependencias)

function playNotificationChime() {

    if (!isSoundAlertsEnabled) return;

    try {

        const AudioCtx = window.AudioContext || window.webkitAudioContext;

        if (!AudioCtx) return;

        const ctx = new AudioCtx();

        const now = ctx.currentTime;

        

        // Tono Armónico 1 (Mi 5 - 659.25 Hz)

        const osc1 = ctx.createOscillator();

        const gain1 = ctx.createGain();

        osc1.type = 'sine';

        osc1.frequency.setValueAtTime(659.25, now);

        gain1.gain.setValueAtTime(0.25, now);

        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc1.connect(gain1);

        gain1.connect(ctx.destination);

        osc1.start(now);

        osc1.stop(now + 0.35);



        // Tono Armónico 2 (La 5 - 880.00 Hz)

        const osc2 = ctx.createOscillator();

        const gain2 = ctx.createGain();

        osc2.type = 'sine';

        osc2.frequency.setValueAtTime(880.00, now + 0.12);

        gain2.gain.setValueAtTime(0.30, now + 0.12);

        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

        osc2.connect(gain2);

        gain2.connect(ctx.destination);

        osc2.start(now + 0.12);

        osc2.stop(now + 0.55);

    } catch(e) {

        console.warn('Audio alert error:', e);

    }

}



// 🪟 Renderizador de Tarjetas Flotantes (Toast Notification)

function showInboxToastNotification(item) {

    const container = document.getElementById('toastNotificationContainer');

    if (!container) return;

    

    const toast = document.createElement('div');

    toast.className = 'toast-card-live';

    toast.style.cssText = `

        background: #0f172a;

        color: white;

        border: 2px solid #059669;

        border-radius: 12px;

        padding: 12px 14px;

        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.6);

        pointer-events: auto;

        display: flex;

        align-items: flex-start;

        gap: 12px;

        transition: all 0.3s ease;

    `;

    

    const rep = item.reported_by || 'Personal de Campo';

    const amt = Number(item.amount_usd || 0).toFixed(2);

    const proj = item.project_name || 'Obra General';

    const vendor = item.supplier_vendor || 'Comercio General';

    

    toast.innerHTML = `

        <div style="background: rgba(5, 150, 105, 0.2); color: #34d399; width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; animation: pulseGlowGreen 2s infinite;">

            <i class="fa-solid fa-file-invoice-dollar"></i>

        </div>

        <div style="flex: 1; min-width: 0;">

            <div style="display: flex; justify-content: space-between; align-items: center;">

                <h4 style="margin: 0; font-size: 13px; font-weight: 800; color: #34d399;">¡Nuevo Comprobante Recibido!</h4>

                <button onclick="this.closest('.toast-card-live').remove()" style="background: none; border: none; color: #94a3b8; font-size: 18px; cursor: pointer; line-height: 1; padding: 0 4px;">&times;</button>

            </div>

            <p style="margin: 3px 0 0 0; font-size: 11px; color: #cbd5e1;"><b>${rep}</b> reportó factura en <b>${vendor}</b></p>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">

                <span style="font-size: 13px; font-weight: 900; color: var(--dalor-gold);">$${amt} USD <small style="color: #94a3b8; font-weight: 600;">(${proj})</small></span>

                <button onclick="switchView('inbox', 'gastos'); this.closest('.toast-card-live').remove();" style="background: #059669; color: white; border: none; padding: 5px 10px; border-radius: 6px; font-size: 11px; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 4px;">

                    <i class="fa-solid fa-stamp"></i> Auditar

                </button>

            </div>

        </div>

    `;

    

    container.appendChild(toast);

    

    setTimeout(() => {

        if (toast.parentElement) {

            toast.style.opacity = '0';

            toast.style.transform = 'translateX(60px)';

            setTimeout(() => toast.remove(), 300);

        }

    }, 9000);

}



// 🔄 Ciclo de Monitoreo Rápido (Cada 5 Segundos)

async function updatePendingInboxBadge() {

    try {

        if (!currentUser) return;

        const uname = (currentUser.username || '').toLowerCase();

        const role = (currentUser.role_name || '').toLowerCase();

        const isCampo = uname === 'campo' || role.includes('supervisor') || role.includes('campo');

        if (isCampo) {

            const b1 = document.getElementById("badgeInboxCount");

            const b2 = document.getElementById("badgeGastosDropdown");

            if (b1) b1.style.display = "none";

            if (b2) b2.style.display = "none";

            return;

        }



        const res = await fetch(`${API_BASE}/expenses/inbox/pending`);

        if (!res.ok) return;

        const pending = await res.json();

        const list = Array.isArray(pending) ? pending : [];

        const count = list.length;



        const b1 = document.getElementById("badgeInboxCount");

        if (b1) {

            b1.innerText = count;

            b1.style.display = count > 0 ? "inline-block" : "none";

        }

        const b2 = document.getElementById("badgeGastosDropdown");

        if (b2) {

            b2.innerText = count;

            b2.style.display = count > 0 ? "inline-block" : "none";

        }



        // Detección de nuevos comprobantes entrantes

        const currentIds = new Set(list.map(item => item.id));

        

        if (!isFirstPendingCheck) {

            const newlyArrived = list.filter(item => !lastKnownPendingIds.has(item.id));

            if (newlyArrived.length > 0) {

                // 🔊 Sonido de Notificación

                playNotificationChime();

                

                // 🪟 Notificación Toast en Pantalla

                newlyArrived.forEach(item => showInboxToastNotification(item));

                

                // 🔄 Si el usuario está viendo el Inbox, actualizar la tabla automáticamente

                const inboxView = document.getElementById('view-inbox');

                if (inboxView && !inboxView.classList.contains('hidden')) {

                    loadPendingExpensesInbox();

                }

            }

        }



        lastKnownPendingIds = currentIds;

        isFirstPendingCheck = false;

    } catch(e) {

        // Silencioso

    }

}



// Ejecutar cada 5 segundos para respuesta inmediata en demostraciones

setInterval(updatePendingInboxBadge, 5000);



// Inicializar el estado de los interruptores de sonido

updateSoundToggleUI();



// 🟢 UPTIME & KEEP-ALIVE PING (Mantiene Render 100% activo sin latencia en frío)

setInterval(() => {

    fetch('/healthz').catch(() => {});

}, 300000); // Cada 5 minutos








// --- PUENTE DE COMPATIBILIDAD CON WINDOW & HTML INLINE ---
if (typeof window !== 'undefined') {
    window.allClients = allClients;
    window.allServices = allServices;
    window.allProjects = allProjects;
    window.allCategories = allCategories;
    window.allAssets = allAssets;
    window.allPersonnel = allPersonnel;
    window.allMaterials = allMaterials;
    window.selectedPersonnelIds = selectedPersonnelIds;
    window.selectedVehicleIds = selectedVehicleIds;
    window.selectedToolIds = selectedToolIds;
    window.selectedMaterialIds = selectedMaterialIds;
    window.EXCHANGE_RATE = EXCHANGE_RATE;
    window.currentUser = currentUser;
    window.authToken = authToken;

    window.closeAllDropdowns = closeAllDropdowns;
    window.closeMobileSubmenu = closeMobileSubmenu;
    window.closeModal = closeModal;
    window.isMobileViewport = isMobileViewport;
    window.loadInitialMasterData = loadInitialMasterData;
    window.openMobileSubmenu = openMobileSubmenu;
    window.openModal = openModal;
    window.parseLocalizedNumber = parseLocalizedNumber;
    window.playNotificationChime = playNotificationChime;
    window.populateSelect = populateSelect;
    window.populateSelectDropdowns = populateSelectDropdowns;
    window.roundNumber = roundNumber;
    window.showInboxToastNotification = showInboxToastNotification;
    window.sortCategoriesNumerically = sortCategoriesNumerically;
    window.switchView = switchView;
    window.toggleDropdown = toggleDropdown;
    window.toggleSoundAlerts = toggleSoundAlerts;
    window.updateFieldTaxDisplays = updateFieldTaxDisplays;
    window.updatePendingInboxBadge = updatePendingInboxBadge;
    window.updateSoundToggleUI = updateSoundToggleUI;
}

export { closeAllDropdowns, closeMobileSubmenu, closeModal, isMobileViewport, loadInitialMasterData, openMobileSubmenu, openModal, parseLocalizedNumber, playNotificationChime, populateSelect, populateSelectDropdowns, roundNumber, showInboxToastNotification, sortCategoriesNumerically, switchView, toggleDropdown, toggleSoundAlerts, updateFieldTaxDisplays, updatePendingInboxBadge, updateSoundToggleUI };
