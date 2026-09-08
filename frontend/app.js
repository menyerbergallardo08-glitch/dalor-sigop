
// ==============================================================================
// 🔐 CONTROLADOR CORPORATIVO DE AUTENTICACIÓN & SESIONES (PRODUCCIÓN)
// ==============================================================================

window.togglePasswordVisibility = function(inputId, btn) {
    const el = document.getElementById(inputId);
    if (!el) return;
    if (el.type === 'password') {
        el.type = 'text';
        if (btn) btn.innerHTML = '<i class="fa-solid fa-eye-slash"></i>';
    } else {
        el.type = 'password';
        if (btn) btn.innerHTML = '<i class="fa-solid fa-eye"></i>';
    }
};

window.toggleDemoProfiles = function() {
    const grid = document.getElementById('demoProfilesGrid');
    if (grid) {
        grid.style.display = (grid.style.display === 'none' || !grid.style.display) ? 'grid' : 'none';
    }
};

window.quickFillAndLogin = async function(u, p) {
    const uIn = document.getElementById('portal_username');
    const pIn = document.getElementById('portal_password');
    if (uIn) uIn.value = u;
    if (pIn) pIn.value = p;
    await performLogin(u, p);
};

window.handlePortalLogin = async function(e) {
    if (e && e.preventDefault) e.preventDefault();
    const uIn = document.getElementById('portal_username');
    const pIn = document.getElementById('portal_password');
    const u = uIn ? uIn.value.trim() : '';
    const p = pIn ? pIn.value : '';
    await performLogin(u, p);
};

window.performLogin = async function(username, password) {
    if (!username || !password) {
        showLoginError('Por favor ingresa usuario y contraseña');
        return;
    }

    const errBox = document.getElementById('loginErrorMessage');
    const errTxt = document.getElementById('loginErrorText');
    const btnSubmit = document.getElementById('btnSubmitPortalLogin');

    if (errBox) errBox.style.display = 'none';
    if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Accediendo...';
    }

    try {
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await res.json();
        if (!res.ok || !data.access_token) {
            const msg = data.detail || 'Usuario o contraseña incorrectos';
            showLoginError(msg);
            if (btnSubmit) {
                btnSubmit.disabled = false;
                btnSubmit.innerHTML = '<i class="fa-solid fa-right-to-bracket" style="color: #f5b800;"></i> Iniciar Sesión';
            }
            return;
        }

        // 1. Guardar sesión
        currentUser = data.user;
        authToken = data.access_token;
        sessionStorage.setItem('dalor_user', JSON.stringify(currentUser));
        sessionStorage.setItem('dalor_token', authToken);
        localStorage.setItem('dalor_user', JSON.stringify(currentUser));
        localStorage.setItem('dalor_token', authToken);

        // 2. Desbloquear visualmente el ERP de forma garantizada
        document.body.classList.add('authenticated');
        const loginScreen = document.getElementById('app-login-screen');
        const authShell = document.getElementById('app-authenticated-shell');
        if (loginScreen) {
            loginScreen.style.setProperty('display', 'none', 'important');
        }
        if (authShell) {
            authShell.style.setProperty('display', 'block', 'important');
        }

        // 3. Configurar interfaz para el usuario
        try { renderUserBadge(); } catch(e) { console.warn(e); }
        try { applyPermissionMap(currentUser); } catch(e) { console.warn(e); }
        try { configureMobileNav(currentUser); } catch(e) { console.warn(e); }
        try { redirectUserByRole(currentUser); } catch(e) { console.warn(e); }

        // 4. Cargar datos maestros sin bloquear la interfaz
        setTimeout(() => {
            try { loadInitialMasterData(); } catch(e) { console.warn(e); }
        }, 50);

        showToast(`Bienvenido, ${currentUser.full_name || currentUser.username}`, 'success');

    } catch (err) {
        showLoginError('Error al conectar con el servidor: ' + err.message);
    } finally {
        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = '<i class="fa-solid fa-right-to-bracket" style="color: #f5b800;"></i> Iniciar Sesión';
        }
    }
};

function showLoginError(msg) {
    const errBox = document.getElementById('loginErrorMessage');
    const errTxt = document.getElementById('loginErrorText');
    if (errTxt) errTxt.textContent = msg;
    if (errBox) errBox.style.display = 'block';
}

window.configureMobileNav = function(user) {
    const nav = document.querySelector('.mobile-bottom-nav');
    if (!nav) return;
    if (!user) {
        nav.style.display = 'none';
        return;
    }
    nav.style.display = 'flex';
    const role = (user.role_name || user.username || '').toLowerCase();
    
    let buttonsHtml = '';
    if (role.includes('supervisor') || role.includes('campo')) {
        buttonsHtml = `
            <button class="mobile-nav-btn active" onclick="switchView('pwa', 'gastos')">
                <i class="fa-solid fa-camera"></i>
                <span>Cargar Gasto</span>
            </button>
            <button class="mobile-nav-btn" onclick="switchView('projects', 'proyectos')">
                <i class="fa-solid fa-folder-tree"></i>
                <span>Obras</span>
            </button>
            <button class="mobile-nav-btn" onclick="handleLogout()" style="color: #ef4444;">
                <i class="fa-solid fa-right-from-bracket"></i>
                <span>Salir</span>
            </button>
        `;
    } else if (role.includes('admin') || role.includes('finanzas')) {
        buttonsHtml = `
            <button class="mobile-nav-btn active" onclick="switchView('financial', 'finanzas')">
                <i class="fa-solid fa-file-invoice-dollar"></i>
                <span>Finanzas</span>
            </button>
            <button class="mobile-nav-btn" onclick="switchView('inbox', 'gastos')">
                <i class="fa-solid fa-inbox"></i>
                <span>Aprobación</span>
            </button>
            <button class="mobile-nav-btn" onclick="switchView('projects', 'proyectos')">
                <i class="fa-solid fa-folder-tree"></i>
                <span>Obras</span>
            </button>
            <button class="mobile-nav-btn" onclick="handleLogout()" style="color: #ef4444;">
                <i class="fa-solid fa-right-from-bracket"></i>
                <span>Salir</span>
            </button>
        `;
    } else if (role.includes('ingeniero') || role.includes('obra')) {
        buttonsHtml = `
            <button class="mobile-nav-btn active" onclick="switchView('projects', 'proyectos')">
                <i class="fa-solid fa-folder-tree"></i>
                <span>Obras</span>
            </button>
            <button class="mobile-nav-btn" onclick="openResourceSubtab('machinery')">
                <i class="fa-solid fa-tractor"></i>
                <span>Maquinaria</span>
            </button>
            <button class="mobile-nav-btn" onclick="switchView('pwa', 'gastos')">
                <i class="fa-solid fa-camera"></i>
                <span>OCR</span>
            </button>
            <button class="mobile-nav-btn" onclick="handleLogout()" style="color: #ef4444;">
                <i class="fa-solid fa-right-from-bracket"></i>
                <span>Salir</span>
            </button>
        `;
    } else { // Director General
        buttonsHtml = `
            <button class="mobile-nav-btn active" onclick="switchView('executive', 'gerencia')">
                <i class="fa-solid fa-chart-pie"></i>
                <span>PowerBI</span>
            </button>
            <button class="mobile-nav-btn" onclick="switchView('projects', 'proyectos')">
                <i class="fa-solid fa-folder-tree"></i>
                <span>Obras</span>
            </button>
            <button class="mobile-nav-btn" onclick="switchView('financial', 'finanzas')">
                <i class="fa-solid fa-coins"></i>
                <span>Finanzas</span>
            </button>
            <button class="mobile-nav-btn" onclick="handleLogout()" style="color: #ef4444;">
                <i class="fa-solid fa-right-from-bracket"></i>
                <span>Salir</span>
            </button>
        `;
    }
    nav.innerHTML = buttonsHtml;
};

// Aliases para compatibilidad
window.loginDirectlyAs = window.quickFillAndLogin;
window.fillAndSubmitQuickLogin = window.quickFillAndLogin;
window.fillQuickLogin = window.quickFillAndLogin;

// ==============================================================================
// 🚀 VERSIONADO & PURGA AUTOMÁTICA DE CACHÉ CLIENTE
// ==============================================================================
const APP_BUILD_VERSION = "2026.09.08.v16";
// Forzar purga de sesiones previas en cada actualización para garantizar que SIEMPRE pida login
if (localStorage.getItem("dalor_build_version") !== APP_BUILD_VERSION) {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem("dalor_build_version", APP_BUILD_VERSION);
    localStorage.setItem("dalor_exchange_rate", "850.0");
}

const API_BASE = window.location.origin + "/api/v1";
let EXCHANGE_RATE = parseFloat(localStorage.getItem('dalor_exchange_rate')) || 850.0;

let allClients = [];
let allServices = [];
let allProjects = [];
let allCategories = [];
let allAssets = [];
let allPersonnel = [];
let allMaterials = [];
let quoteRowsCount = 0;
let splitRowsCount = 0;
let phaseRowsCount = 0;

// Estado de Selección de Recursos en Planificación de Obra
let selectedPersonnelIds = [];
let selectedVehicleIds = [];
let selectedToolIds = [];

// Inicialización
let currentUser = null;
let authToken = localStorage.getItem('dalor_token') || null;

document.addEventListener("DOMContentLoaded", async () => {
    const rateInput = document.getElementById("globalExchangeRateInput");
    if (rateInput) rateInput.value = EXCHANGE_RATE.toFixed(2);

    document.addEventListener("click", (e) => {
        if (!e.target.closest(".nav-dropdown") && !e.target.closest(".dropdown-menu")) {
            closeAllDropdowns();
        }
    });

    const isAuth = await checkAuthStatus();
    
    const loginScreen = document.getElementById('app-login-screen');
    const authShell = document.getElementById('app-authenticated-shell');
    const nav = document.querySelector('.mobile-bottom-nav');

    if (isAuth && currentUser) {
        if (loginScreen) loginScreen.style.display = 'none';
        if (authShell) authShell.style.display = 'block';
        
        renderUserBadge();
        applyPermissionMap(currentUser);
        configureMobileNav(currentUser);
        redirectUserByRole(currentUser);
        loadInitialMasterData();
    } else {
        if (loginScreen) loginScreen.style.display = 'flex';
        if (authShell) authShell.style.display = 'none';
        if (nav) nav.style.display = 'none';
    }
});

// Control de Tasa Editable Global
function updateGlobalExchangeRate(newRate) {
    const val = parseFloat(newRate);
    if (!isNaN(val) && val > 0) {
        EXCHANGE_RATE = val;
        localStorage.setItem('dalor_exchange_rate', val);
        calcManualBs();
        
        const input = document.getElementById("globalExchangeRateInput");
        if (input) {
            input.style.color = "#34d399";
            setTimeout(() => {
                input.style.color = "var(--dalor-gold)";
            }, 800);
        }
    }
}

// Desplegables Tipo ERP (Profit Plus Style) con Soporte Móvil Táctil
function toggleDropdown(event, dropdownId) {
    if (event) {
        event.stopPropagation();
    }
    const targetDropdown = document.getElementById(dropdownId);
    if (!targetDropdown) return;
    const isOpen = targetDropdown.classList.contains("open");

    closeAllDropdowns();

    if (!isOpen) {
        targetDropdown.classList.add("open");
    }
}

function closeAllDropdowns() {
    document.querySelectorAll(".nav-dropdown").forEach(drop => {
        drop.classList.remove("open");
    });
}

// Navegación Modular Principal
function switchView(viewName, moduleCategory) {
    closeAllDropdowns();

    const allViews = [
        'executive', 'financial', 'maintenance',
        'quotations', 'clients', 'services', 
        'projects', 'dashboard', 
        'resources', 
        'pwa', 'manual', 'tree', 'inbox'
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
    if (viewName === 'financial') openFinancialSubtab('cxc');
    if (viewName === 'maintenance') openMaintenanceSubtab('users');
    if (viewName === 'quotations') loadQuotations();
    if (viewName === 'clients') loadClients();
    if (viewName === 'services') loadServices();
    if (viewName === 'projects') initProjectPlanningView();
    if (viewName === 'dashboard') loadComparisonDashboard();
    if (viewName === 'resources') switchResourceSubtab('dashboard');
    if (viewName === 'inbox') loadPendingExpensesInbox();
    if (viewName === 'tree') loadCategoriesTree();
}

// Carga Inicial de Datos Maestros
async function loadInitialMasterData() {
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

        allClients = await resCli.json();
        allServices = await resSrv.json();
        allProjects = await resProj.json();
        allCategories = await resCat.json();
        allAssets = await resAss.json();
        allPersonnel = await resPers.json();
        const matData = await resMat.json();
        allMaterials = matData.materials || [];

        populateSelectDropdowns();
        populatePlanDropdownSelectors();
    } catch (e) {
        console.error("Error al cargar datos maestros:", e);
    }
}

function populateSelectDropdowns() {
    // Clientes Selects
    const cliOptions = `<option value="">-- Seleccione Cliente --</option>` + 
        allClients.map(c => `<option value="${c.id}">[${c.code}] ${c.name} (${c.rif || 'Sin RIF'})</option>`).join('');
    
    if (document.getElementById("quote_client_id")) document.getElementById("quote_client_id").innerHTML = cliOptions;
    if (document.getElementById("new_proj_client_id")) document.getElementById("new_proj_client_id").innerHTML = cliOptions;
    if (document.getElementById("cxc_client_id")) document.getElementById("cxc_client_id").innerHTML = cliOptions;
    if (document.getElementById("rcp_client_id")) document.getElementById("rcp_client_id").innerHTML = cliOptions;

    // Proyectos Selects
    const projOptions = `<option value="">-- Gasto General Sede (Sin Proyecto) --</option>` + 
        allProjects.map(p => `<option value="${p.id}">${p.code} - ${p.name}</option>`).join('');
    
    if (document.getElementById("field_project_id")) document.getElementById("field_project_id").innerHTML = projOptions;
    if (document.getElementById("manual_project_id")) document.getElementById("manual_project_id").innerHTML = projOptions;
    if (document.getElementById("cxc_project_id")) document.getElementById("cxc_project_id").innerHTML = projOptions;
    if (document.getElementById("cxp_project_id")) document.getElementById("cxp_project_id").innerHTML = projOptions;
    if (document.getElementById("rcp_project_id")) document.getElementById("rcp_project_id").innerHTML = projOptions;
    if (document.getElementById("mc_project_id")) document.getElementById("mc_project_id").innerHTML = 
        `<option value="">-- Consumo Interno Taller Central (Gasto Sede) --</option>` + 
        allProjects.map(p => `<option value="${p.id}">${p.code} - ${p.name}</option>`).join('');

    if (document.getElementById("modal_target_project_id")) document.getElementById("modal_target_project_id").innerHTML = 
        allProjects.map(p => `<option value="${p.id}">${p.code} - ${p.name} (${p.location})</option>`).join('');
    if (document.getElementById("tg_project_id")) document.getElementById("tg_project_id").innerHTML = 
        `<option value="">-- Seleccione Proyecto Aprobado --</option>` +
        allProjects.map(p => `<option value="${p.id}" data-location="${p.location}">${p.code} - ${p.name} (${p.location})</option>`).join('');

    // Categorías Selects
    const catOptions = allCategories.map(c => `<option value="${c.id}">[${c.code}] ${c.name}</option>`).join('');
    if (document.getElementById("field_category_id")) document.getElementById("field_category_id").innerHTML = catOptions;
    if (document.getElementById("manual_category_id")) document.getElementById("manual_category_id").innerHTML = catOptions;

    // Activos / Flota
    const assOptions = `<option value="">-- No Aplica --</option>` + 
        allAssets.map(a => `<option value="${a.id}">${a.asset_code} - ${a.name}</option>`).join('');
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
        const persOptions = allPersonnel.map(p => `<option value="${p.id}">[${p.code}] ${p.full_name} - ${p.role_title}</option>`).join('');
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

// ----------------------------------------------------
// 1. PLANIFICACIÓN & ARMADO INTEGRAL DE PROYECTOS
// ----------------------------------------------------
function initProjectPlanningView() {
    loadProjectsList();
    populatePlanDropdownSelectors();
    renderAssignedTags();
    
    // Iniciar con 3 etapas estándar si está vacío
    const container = document.getElementById("projectPhasesContainer");
    if (container && container.children.length === 0) {
        phaseRowsCount = 0;
        addProjectPhaseRow("Fase 1: Movilización, Permisos & Seguridad", "Gestión de pases de planta, charla de inducción SHA y traslado de cuadrilla/equipos", 5, 1200);
        addProjectPhaseRow("Fase 2: Ejecución Técnica & Montaje", "Obras civiles menores, desmontaje, tendido de cables y conexionado electromecánico", 15, 8500);
        addProjectPhaseRow("Fase 3: Pruebas, Calibración & Entrega", "Pruebas de aislamiento, termografía, puesta en servicio y firma de acta de entrega", 5, 2000);
    }
}

function populatePlanDropdownSelectors() {
    // 1. Desplegable de Personal
    const persSel = document.getElementById("plan_pers_select");
    if (persSel) {
        persSel.innerHTML = `<option value="">-- Elegir Trabajador --</option>` + 
            allPersonnel.map(p => `<option value="${p.id}">[${p.code}] ${p.full_name} (${p.role_title})</option>`).join('');
    }

    // 2. Desplegable de Vehículos
    const vehSel = document.getElementById("plan_veh_select");
    const vehicles = allAssets.filter(a => a.asset_type === 'vehiculo' || a.asset_type === 'camioneta');
    if (vehSel) {
        vehSel.innerHTML = `<option value="">-- Elegir Vehículo / Camioneta --</option>` + 
            vehicles.map(v => `<option value="${v.id}">[${v.asset_code}] ${v.name} ${v.license_plate ? `(${v.license_plate})` : ''}</option>`).join('');
    }

    // 3. Desplegable de Herramientas
    const toolSel = document.getElementById("plan_tool_select");
    const tools = allAssets.filter(a => a.asset_type !== 'vehiculo' && a.asset_type !== 'camioneta');
    if (toolSel) {
        toolSel.innerHTML = `<option value="">-- Elegir Herramienta / Equipo --</option>` + 
            tools.map(t => `<option value="${t.id}">[${t.asset_code}] ${t.name} ${t.serial_number ? `(S/N: ${t.serial_number})` : ''}</option>`).join('');
    }
}

// Asignaciones Dinámicas de Recursos con Tags
function assignPersonnelTag() {
    const sel = document.getElementById("plan_pers_select");
    const val = parseInt(sel.value);
    if (!val) return;
    if (!selectedPersonnelIds.includes(val)) {
        selectedPersonnelIds.push(val);
        renderAssignedTags();
    }
    sel.value = "";
}

function removePersonnelTag(id) {
    selectedPersonnelIds = selectedPersonnelIds.filter(i => i !== id);
    renderAssignedTags();
}

function assignVehicleTag() {
    const sel = document.getElementById("plan_veh_select");
    const val = parseInt(sel.value);
    if (!val) return;
    if (!selectedVehicleIds.includes(val)) {
        selectedVehicleIds.push(val);
        renderAssignedTags();
    }
    sel.value = "";
}

function removeVehicleTag(id) {
    selectedVehicleIds = selectedVehicleIds.filter(i => i !== id);
    renderAssignedTags();
}

function assignToolTag() {
    const sel = document.getElementById("plan_tool_select");
    const val = parseInt(sel.value);
    if (!val) return;
    if (!selectedToolIds.includes(val)) {
        selectedToolIds.push(val);
        renderAssignedTags();
    }
    sel.value = "";
}

function removeToolTag(id) {
    selectedToolIds = selectedToolIds.filter(i => i !== id);
    renderAssignedTags();
}

function renderAssignedTags() {
    // 1. Personal Tags
    const persContainer = document.getElementById("plan_pers_tags");
    if (persContainer) {
        if (selectedPersonnelIds.length === 0) {
            persContainer.innerHTML = `<span style="font-size:11px; color:#94a3b8;">Sin personal seleccionado. Selecciona arriba y pulsa '+ Asignar'.</span>`;
        } else {
            persContainer.innerHTML = selectedPersonnelIds.map(id => {
                const p = allPersonnel.find(item => item.id === id);
                if (!p) return '';
                return `
                    <span class="resource-tag">
                        <i class="fa-solid fa-user-check"></i> ${p.full_name} (${p.role_title})
                        <span class="tag-remove" onclick="removePersonnelTag(${id})">&times;</span>
                    </span>
                `;
            }).join('');
        }
    }

    // 2. Vehicle Tags
    const vehContainer = document.getElementById("plan_veh_tags");
    if (vehContainer) {
        if (selectedVehicleIds.length === 0) {
            vehContainer.innerHTML = `<span style="font-size:11px; color:#94a3b8;">Sin vehículos seleccionados. Selecciona arriba y pulsa '+ Asignar'.</span>`;
        } else {
            vehContainer.innerHTML = selectedVehicleIds.map(id => {
                const v = allAssets.find(item => item.id === id);
                if (!v) return '';
                return `
                    <span class="resource-tag" style="background:#eef2ff; color:#4338ca; border-color:#c7d2fe;">
                        <i class="fa-solid fa-truck-pickup"></i> ${v.name} ${v.license_plate ? `(${v.license_plate})` : ''}
                        <span class="tag-remove" onclick="removeVehicleTag(${id})">&times;</span>
                    </span>
                `;
            }).join('');
        }
    }

    // 3. Tool Tags
    const toolContainer = document.getElementById("plan_tool_tags");
    if (toolContainer) {
        if (selectedToolIds.length === 0) {
            toolContainer.innerHTML = `<span style="font-size:11px; color:#94a3b8;">Sin herramientas seleccionadas. Selecciona arriba y pulsa '+ Asignar'.</span>`;
        } else {
            toolContainer.innerHTML = selectedToolIds.map(id => {
                const t = allAssets.find(item => item.id === id);
                if (!t) return '';
                return `
                    <span class="resource-tag" style="background:#f0fdf4; color:#15803d; border-color:#bbf7d0;">
                        <i class="fa-solid fa-toolbox"></i> ${t.name}
                        <span class="tag-remove" onclick="removeToolTag(${id})">&times;</span>
                    </span>
                `;
            }).join('');
        }
    }
}

// Creador Dinámico de Etapas / Fases con Membretes
function addProjectPhaseRow(defName = "", defDesc = "", defDays = 7, defCost = 0) {
    phaseRowsCount++;
    const container = document.getElementById("projectPhasesContainer");
    const rowId = `phase_row_${phaseRowsCount}`;

    const div = document.createElement("div");
    div.id = rowId;
    div.style.cssText = "display: grid; grid-template-columns: 2fr 3fr 1fr 1fr 30px; gap: 6px; background: white; padding: 8px; border-radius: 8px; border: 1px solid #cbd5e1; align-items: center;";
    div.innerHTML = `
        <div>
            <input type="text" class="form-input ph-name" placeholder="Ej: Fase 1: Movilización" value="${defName}" style="font-size: 11px; font-weight: 700;" required>
        </div>
        <div>
            <input type="text" class="form-input ph-desc" placeholder="Descripción de tareas y alcance" value="${defDesc}" style="font-size: 11px;">
        </div>
        <div>
            <input type="number" class="form-input ph-days" placeholder="Días" value="${defDays}" style="font-size: 11px; font-weight: bold;">
        </div>
        <div>
            <input type="number" step="0.01" class="form-input ph-cost" placeholder="Ppto ($)" value="${defCost}" style="font-size: 11px; font-weight: 800; color: var(--dalor-blue);">
        </div>
        <div style="text-align: center;">
            <button type="button" onclick="removeProjectPhaseRow('${rowId}')" style="background: none; border: none; color: #ef4444; font-size: 16px; cursor: pointer;" title="Eliminar Etapa">&times;</button>
        </div>
    `;
    container.appendChild(div);
}

function removeProjectPhaseRow(rowId) {
    const el = document.getElementById(rowId);
    if (el) el.remove();
}

function recalcProjectBudgetPreview() {
    const contract = parseFloat(document.getElementById("new_proj_contract").value) || 0.0;
    const labor = parseFloat(document.getElementById("new_proj_labor").value) || 0.0;
    const fuel = parseFloat(document.getElementById("new_proj_fuel").value) || 0.0;
    const mat = parseFloat(document.getElementById("new_proj_materials").value) || 0.0;
    const tools = parseFloat(document.getElementById("new_proj_tools").value) || 0.0;
    const serv = parseFloat(document.getElementById("new_proj_services").value) || 0.0;

    const totalCost = labor + fuel + mat + tools + serv;
    const marginUsd = contract - totalCost;
    const marginPct = contract > 0 ? (marginUsd / contract * 100).toFixed(1) : 0;

    const p = document.getElementById("proj_margin_preview");
    if (p) {
        p.innerText = `${marginPct}% ($${marginUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`;
        p.style.color = marginUsd >= 0 ? '#059669' : '#e11d48';
    }
}

async function submitCreateProject(event) {
    event.preventDefault();

    // 1. Etapas
    const phaseRows = document.querySelectorAll("#projectPhasesContainer > div");
    let phases = [];
    phaseRows.forEach((r, idx) => {
        const name = r.querySelector(".ph-name").value;
        const desc = r.querySelector(".ph-desc").value;
        const days = parseInt(r.querySelector(".ph-days").value) || 7;
        const cost = parseFloat(r.querySelector(".ph-cost").value) || 0.0;
        phases.push({
            phase_number: idx + 1,
            name: name,
            description: desc,
            duration_days: days,
            estimated_cost_usd: cost,
            status: "pendiente"
        });
    });

    const payload = {
        code: document.getElementById("new_proj_code").value,
        name: document.getElementById("new_proj_name").value,
        client_id: parseInt(document.getElementById("new_proj_client_id").value) || null,
        location: document.getElementById("new_proj_location").value,
        duration_days: parseInt(document.getElementById("new_proj_duration").value) || 30,
        contract_amount_usd: parseFloat(document.getElementById("new_proj_contract").value) || 0.0,
        scope_of_work: document.getElementById("new_proj_scope").value,
        estimated_labor_usd: parseFloat(document.getElementById("new_proj_labor").value) || 0.0,
        estimated_fuel_usd: parseFloat(document.getElementById("new_proj_fuel").value) || 0.0,
        estimated_materials_usd: parseFloat(document.getElementById("new_proj_materials").value) || 0.0,
        estimated_tools_usd: parseFloat(document.getElementById("new_proj_tools").value) || 0.0,
        estimated_services_usd: parseFloat(document.getElementById("new_proj_services").value) || 0.0,
        phases: phases,
        assigned_personnel_ids: selectedPersonnelIds,
        assigned_vehicle_ids: selectedVehicleIds,
        assigned_tool_ids: selectedToolIds
    };

    try {
        const res = await fetch(`${API_BASE}/projects/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            const data = await res.json();
            alert(`¡Proyecto ${data.code} planificado, estructurado y activado con éxito!`);
            document.getElementById("projectCreateForm").reset();
            selectedPersonnelIds = [];
            selectedVehicleIds = [];
            selectedToolIds = [];
            renderAssignedTags();
            await loadInitialMasterData();
            loadProjectsList();
        } else {
            const err = await res.json();
            alert("Error: " + (err.detail || JSON.stringify(err)));
        }
    } catch (e) {
        alert("Error al planificar proyecto.");
    }
}

async function loadProjectsList() {
    const container = document.getElementById("projectsCardsContainer");
    container.innerHTML = `<div style="grid-column: span 2; text-align: center; padding: 20px; color: #94a3b8;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando proyectos...</div>`;

    try {
        const res = await fetch(`${API_BASE}/projects/`);
        allProjects = await res.json();

        if (allProjects.length === 0) {
            container.innerHTML = `<div style="grid-column: span 2; text-align: center; padding: 20px; color: #94a3b8;">No hay proyectos registrados. Diligencia el formulario superior o importa desde Excel.</div>`;
            return;
        }

        container.innerHTML = allProjects.map(p => {
            const marginEst = p.contract_amount_usd - p.budget_limit_usd;
            const marginPct = p.contract_amount_usd > 0 ? (marginEst / p.contract_amount_usd * 100).toFixed(1) : 0;
            const phasesCount = p.phases ? p.phases.length : 0;

            return `
            <div class="card" style="border-left: 4px solid var(--dalor-blue); margin-bottom: 0;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                    <div>
                        <span style="font-size: 11px; font-weight: 800; background: var(--dalor-navy); color: white; padding: 2px 6px; border-radius: 4px;">${p.code}</span>
                        <h4 style="font-size: 14px; font-weight: 800; color: var(--dalor-navy); margin-top: 4px;">${p.name}</h4>
                        <p style="font-size: 11px; color: #64748b;">Cliente: <b>${p.client_name || 'General'}</b> | Ubicación: <b>${p.location}</b></p>
                    </div>
                    <span style="font-size: 10px; background: #dcfce7; color: #166534; padding: 3px 8px; border-radius: 9999px; font-weight: 800;">
                        ${p.status.toUpperCase()}
                    </span>
                </div>

                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; display: grid; grid-template-columns: 1fr 1fr 1fr; text-align: center; margin-bottom: 10px;">
                    <div>
                        <span style="font-size: 10px; color: #64748b; text-transform: uppercase;">Contrato ($)</span>
                        <p style="font-size: 14px; font-weight: 800; color: var(--dalor-navy);">$${p.contract_amount_usd.toLocaleString()}</p>
                    </div>
                    <div>
                        <span style="font-size: 10px; color: #64748b; text-transform: uppercase;">Ppto Costo ($)</span>
                        <p style="font-size: 14px; font-weight: 800; color: #e11d48;">$${p.budget_limit_usd.toLocaleString()}</p>
                    </div>
                    <div>
                        <span style="font-size: 10px; color: #64748b; text-transform: uppercase;">Margen Est (%)</span>
                        <p style="font-size: 14px; font-weight: 800; color: #059669;">${marginPct}%</p>
                    </div>
                </div>

                <div style="font-size: 11px; color: #64748b; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #f1f5f9; padding-top: 8px;">
                    <span><i class="fa-solid fa-list-ol"></i> <b>${phasesCount} Etapas</b> &bull; <b>${p.duration_days} días</b></span>
                    <div style="display: flex; gap: 6px;">
                        <button onclick="viewProjectDetails(${p.id})" class="btn-primary" style="padding: 4px 10px; font-size: 11px;">
                            <i class="fa-solid fa-eye"></i> Ficha & Etapas
                        </button>
                        <button onclick="deleteProject(${p.id})" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 13px;" title="Inactivar Proyecto">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>`;
        }).join('');
    } catch (e) {
        container.innerHTML = `<div style="grid-column: span 2; text-align: center; color: #e11d48;">Error al cargar proyectos.</div>`;
    }
}

async function viewProjectDetails(projectId) {
    try {
        const res = await fetch(`${API_BASE}/projects/${projectId}/details`);
        const data = await res.json();

        document.getElementById("detail_proj_code").innerText = data.code;
        document.getElementById("detail_proj_name").innerText = data.name;
        document.getElementById("detail_proj_subtitle").innerText = `Cliente: ${data.client_name || 'General'} | Ubicación: ${data.location} | Duración: ${data.duration_days} días`;
        
        document.getElementById("detail_proj_contract").innerText = `$${data.contract_amount_usd.toLocaleString()}`;
        document.getElementById("detail_proj_budget").innerText = `$${data.budget_limit_usd.toLocaleString()}`;
        document.getElementById("detail_proj_spent").innerText = `$${data.total_spent_usd.toLocaleString()}`;
        document.getElementById("detail_proj_margin").innerText = `$${data.gross_margin_usd.toLocaleString()}`;

        document.getElementById("detail_proj_scope").innerText = data.scope_of_work || "No se ha definido descripción técnica del alcance para este proyecto.";

        // Cálculo de Avance Físico Global
        const totalPhases = data.phases ? data.phases.length : 0;
        const completedPhases = data.phases ? data.phases.filter(p => p.status === 'completado').length : 0;
        const inProgressPhases = data.phases ? data.phases.filter(p => p.status === 'en_progreso').length : 0;
        const physicalProgressPct = totalPhases > 0 ? Math.round(((completedPhases + inProgressPhases * 0.5) / totalPhases) * 100) : 0;

        // Etapas con Checklist y Barra de Progreso
        const phasesList = document.getElementById("detail_proj_phases_list");
        if (data.phases && data.phases.length > 0) {
            let html = `
            <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; padding: 12px; margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; font-weight: 800; margin-bottom: 6px;">
                    <span style="color: var(--dalor-navy);">
                        <i class="fa-solid fa-bars-progress" style="color: var(--dalor-blue);"></i> Avance Físico Global de la Obra:
                    </span>
                    <span style="color: ${physicalProgressPct === 100 ? '#059669' : 'var(--dalor-blue)'}; font-size: 13px;">
                        ${physicalProgressPct}% (${completedPhases} de ${totalPhases} Etapas Culminadas)
                    </span>
                </div>
                <div style="height: 12px; background: #e2e8f0; border-radius: 9999px; overflow: hidden;">
                    <div style="width: ${physicalProgressPct}%; height: 100%; background: linear-gradient(90deg, #0284c7 0%, #059669 100%); transition: width 0.4s ease;"></div>
                </div>
            </div>
            <div style="display: flex; flex-direction: column; gap: 8px;">
            `;

            html += data.phases.map((ph, idx) => {
                const isDone = ph.status === 'completado';
                const isInProg = ph.status === 'en_progreso';

                return `
                <div style="background: ${isDone ? '#f0fdf4' : '#ffffff'}; border: 1px solid ${isDone ? '#86efac' : '#cbd5e1'}; border-radius: 8px; padding: 10px 12px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span style="background: ${isDone ? '#059669' : '#002B49'}; color: white; border-radius: 6px; font-size: 11px; font-weight: 800; padding: 2px 6px;">
                                Etapa ${idx + 1}
                            </span>
                            <div>
                                <b style="font-size: 13px; color: var(--dalor-navy); ${isDone ? 'text-decoration: line-through; color: #166534;' : ''}">${ph.name}</b>
                                <span style="font-size: 11px; color: #64748b; margin-left: 6px;">(${ph.duration_days} días &bull; Ppto: $${ph.estimated_cost_usd.toLocaleString()})</span>
                            </div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 6px;">
                            ${isDone 
                                ? `<button onclick="updatePhaseStatus(${data.id}, ${ph.id}, 'pendiente')" class="btn-secondary" style="font-size: 11px; padding: 4px 8px; color: #64748b;" title="Reabrir Etapa"><i class="fa-solid fa-rotate-left"></i> Reabrir</button>`
                                : `<button onclick="updatePhaseStatus(${data.id}, ${ph.id}, 'completado')" class="btn-primary" style="font-size: 11px; padding: 4px 10px; background: #059669; font-weight: 800;"><i class="fa-solid fa-check"></i> Culminar Etapa</button>`
                            }
                            <select onchange="updatePhaseStatus(${data.id}, ${ph.id}, this.value)" style="font-size: 11px; padding: 3px 6px; border-radius: 6px; border: 1px solid #cbd5e1; font-weight: 700;">
                                <option value="pendiente" ${ph.status === 'pendiente' ? 'selected' : ''}>⏳ Pendiente</option>
                                <option value="en_progreso" ${ph.status === 'en_progreso' ? 'selected' : ''}>🔄 En Progreso</option>
                                <option value="completado" ${ph.status === 'completado' ? 'selected' : ''}>✅ Culminada</option>
                            </select>
                        </div>
                    </div>
                    ${ph.description ? `<p style="font-size: 11px; color: #475569; margin-top: 4px; padding-left: 2px;">${ph.description}</p>` : ''}
                </div>`;
            }).join('');

            html += `</div>`;
            phasesList.innerHTML = html;
        } else {
            phasesList.innerHTML = `<span style="font-size: 11px; color: #94a3b8;">No se registraron etapas para este proyecto.</span>`;
        }

        // Personal Asignado
        const persList = document.getElementById("detail_proj_personnel");
        persList.innerHTML = data.assigned_personnel.map(p => `
            <li style="color: #334155;"><b>[${p.code}]</b> ${p.name} <span style="color: #64748b;">(${p.role})</span></li>
        `).join('') || '<li style="color: #94a3b8;">Sin personal asignado</li>';

        // Vehículos
        const fleetList = document.getElementById("detail_proj_fleet");
        fleetList.innerHTML = data.assigned_fleet.map(v => `
            <li style="color: #334155;"><b>[${v.code}]</b> ${v.name} <span style="color: #64748b;">(${v.license_plate || 'Sin Placa'})</span></li>
        `).join('') || '<li style="color: #94a3b8;">Sin vehículos asignados</li>';

        // Herramientas
        const toolList = document.getElementById("detail_proj_tools");
        toolList.innerHTML = data.assigned_tools.map(t => `
            <li style="color: #334155;"><b>[${t.code}]</b> ${t.name} <span style="color: #64748b;">(${t.brand || ''})</span></li>
        `).join('') || '<li style="color: #94a3b8;">Sin herramientas asignadas</li>';

        openModal("modalProjectDetail");
    } catch (e) {
        alert("Error al cargar la ficha del proyecto.");
    }
}

async function updatePhaseStatus(projectId, phaseId, newStatus) {
    try {
        const res = await fetch(`${API_BASE}/projects/${projectId}/phases/${phaseId}/status`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: newStatus })
        });
        if (res.ok) {
            viewProjectDetails(projectId);
        }
    } catch (e) {
        console.error("Error al actualizar etapa:", e);
    }
}

function downloadExcelTemplate() {
    window.location.href = `${API_BASE}/projects/excel-template`;
}

function triggerExcelImport() {
    document.getElementById("excelProjectFileInput").click();
}

async function handleExcelFileSelected(event) {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
        const res = await fetch(`${API_BASE}/projects/import-excel`, {
            method: "POST",
            body: formData
        });
        if (res.ok) {
            const data = await res.json();
            alert(data.message);
            await loadInitialMasterData();
            loadProjectsList();
        } else {
            const err = await res.json();
            alert("Error al importar Excel: " + (err.detail || JSON.stringify(err)));
        }
    } catch (e) {
        alert("Error de conexión al cargar Excel.");
    }
}

async function deleteProject(projectId) {
    if (!confirm("¿Deseas inactivar este proyecto? (Se mantendrán intactos los gastos y la auditoría)")) return;
    try {
        await fetch(`${API_BASE}/projects/${projectId}`, { method: "DELETE" });
        await loadInitialMasterData();
        loadProjectsList();
    } catch (e) {
        alert("Error al inactivar proyecto.");
    }
}

// ----------------------------------------------------
// 2. MÓDULO DE ACTIVOS & RECURSOS (PESTAÑAS INDEPENDIENTES)
// ----------------------------------------------------
function openResourceSubtab(subtabName) {
    switchView('resources', 'recursos');
    switchResourceSubtab(subtabName);
}

function switchResourceSubtab(subtabName) {
    const allSubtabs = ['dashboard', 'fleet', 'machinery', 'tools', 'materials', 'personnel'];
    allSubtabs.forEach(tab => {
        const el = document.getElementById(`subtab-res-${tab}`);
        const btn = document.getElementById(`tabbtn-res-${tab}`);
        if (el) el.classList.add('hidden');
        if (btn) btn.classList.remove('active');
    });

    const targetSubtab = document.getElementById(`subtab-res-${subtabName}`);
    const targetBtn = document.getElementById(`tabbtn-res-${subtabName}`);
    if (targetSubtab) targetSubtab.classList.remove('hidden');
    if (targetBtn) targetBtn.classList.add('active');

    if (subtabName === 'dashboard') loadResourceDashboard();
    if (subtabName === 'fleet') loadFleetList();
    if (subtabName === 'machinery') loadMachineryList();
    if (subtabName === 'tools') loadToolsList();
    if (subtabName === 'materials') loadMaterialsList();
    if (subtabName === 'personnel') loadPersonnelTableList();
}

async function loadResourceDashboard() {
    try {
        const res = await fetch(`${API_BASE}/resources/matrix-status`);
        const data = await res.json();

        // 1. Tarjetas de Resumen KPI
        document.getElementById("matrixCountersContainer").innerHTML = `
            <div style="background: white; border: 1px solid #cbd5e1; border-radius: 10px; padding: 12px; text-align: center;">
                <span style="font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 700;">Flota en Base</span>
                <p style="font-size: 18px; font-weight: 900; color: #059669;">${data.summary.assets_available_base}</p>
            </div>
            <div style="background: white; border: 1px solid #cbd5e1; border-radius: 10px; padding: 12px; text-align: center;">
                <span style="font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 700;">Flota en Obra</span>
                <p style="font-size: 18px; font-weight: 900; color: var(--dalor-blue);">${data.summary.assets_in_operation}</p>
            </div>
            <div style="background: white; border: 1px solid #cbd5e1; border-radius: 10px; padding: 12px; text-align: center;">
                <span style="font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 700;">Personal en Base</span>
                <p style="font-size: 18px; font-weight: 900; color: #059669;">${data.summary.personnel_available_base}</p>
            </div>
            <div style="background: white; border: 1px solid #cbd5e1; border-radius: 10px; padding: 12px; text-align: center;">
                <span style="font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 700;">Personal en Obra</span>
                <p style="font-size: 18px; font-weight: 900; color: var(--dalor-blue);">${data.summary.personnel_in_operation}</p>
            </div>
        `;

        // 2. Distribución por Ubicación
        const locMap = {};
        [...data.assets, ...data.personnel].forEach(item => {
            const loc = item.location || 'Sede Central';
            if (!locMap[loc]) locMap[loc] = { assets: 0, personnel: 0 };
            if (item.type) locMap[loc].assets++;
            else locMap[loc].personnel++;
        });

        document.getElementById("locationDistributionContainer").innerHTML = Object.keys(locMap).map(loc => `
            <div style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 12px; font-size: 12px;">
                <div>
                    <b><i class="fa-solid fa-location-dot" style="color: var(--dalor-blue);"></i> ${loc}</b>
                </div>
                <div style="display: flex; gap: 8px;">
                    <span style="background: #e0f2fe; color: #0369a1; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 11px;">
                        ${locMap[loc].assets} Activos/Flota
                    </span>
                    <span style="background: #dcfce7; color: #166534; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 11px;">
                        ${locMap[loc].personnel} Trabajadores
                    </span>
                </div>
            </div>
        `).join('') || '<span style="color:#94a3b8; font-size:11px;">Sin datos de ubicación.</span>';

        // 3. Resumen de Movimientos
        document.getElementById("recentMovementsContainer").innerHTML = data.assets.slice(0, 5).map(a => `
            <div style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 10px; font-size: 11px;">
                <span><b>${a.code}</b> - ${a.name}</span>
                <span style="font-weight: 700; color: ${a.status === 'disponible_base' ? '#059669' : '#0284c7'};">
                    ${a.location} (${a.custodian})
                </span>
            </div>
        `).join('');

    } catch (e) {
        console.error("Error al cargar dashboard de recursos:", e);
    }
}

// ----------------------------------------------------
// 3. CONTROL DE FLOTA & VEHÍCULOS (PESTAÑA EXCLUSIVA)
// ----------------------------------------------------
async function loadFleetList() {
    const tbody = document.getElementById("fleetTableBody");
    tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; padding: 20px; color: #94a3b8;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando flota...</td></tr>`;

    try {
        const res = await fetch(`${API_BASE}/assets/fleet-summary`);
        const fleet = await res.json();
        const vehicles = fleet.filter(a => a.asset_type === 'vehiculo' || a.asset_type === 'camioneta');

        if (vehicles.length === 0) {
            tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; padding: 20px; color: #94a3b8;">No hay vehículos registrados en la flota.</td></tr>`;
            return;
        }

        tbody.innerHTML = vehicles.map(v => {
            let semColor = '#166534';
            let semBg = '#dcfce7';
            if (v.traffic_light === 'ROJO_VENCIDO') {
                semColor = '#991b1b';
                semBg = '#fee2e2';
            } else if (v.traffic_light === 'AMARILLO_PROXIMO') {
                semColor = '#92400e';
                semBg = '#fef3c7';
            }

            const inBase = v.status === 'disponible_base' || !v.current_project_id;

            return `
            <tr>
                <td style="font-weight: 800; color: var(--dalor-blue);">${v.asset_code}</td>
                <td style="font-weight: 700; color: var(--dalor-navy);">${v.name} ${v.brand ? `(${v.brand})` : ''}</td>
                <td style="font-weight: 800; font-family: monospace;">${v.license_plate || '-'}</td>
                <td style="font-weight: 800;">${v.current_odometer.toLocaleString()} Km</td>
                <td>En ${v.remaining_km_to_service.toLocaleString()} Km</td>
                <td>
                    <span style="font-size: 10px; padding: 2px 8px; border-radius: 9999px; font-weight: 800; background: ${semBg}; color: ${semColor};">
                        ${v.traffic_light.replace('_', ' ')}
                    </span>
                </td>
                <td>
                    <span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 800; ${inBase ? 'background: #dcfce7; color: #166534;' : 'background: #e0f2fe; color: #0369a1;'}">
                        ${inBase ? 'DISPONIBLE EN BASE' : 'EN OBRA'}
                    </span>
                </td>
                <td>${v.current_location}</td>
                <td>${v.custodian}</td>
                <td style="text-align: center; white-space: nowrap;">
                    ${inBase ? `
                        <button onclick="openAssignModal('asset', ${v.id}, '${v.name}', 'assign')" class="btn-primary" style="padding: 3px 8px; font-size: 11px;">
                            Asignar a Obra
                        </button>
                    ` : `
                        <button onclick="openAssignModal('asset', ${v.id}, '${v.name}', 'transfer')" class="btn-secondary" style="padding: 3px 6px; font-size: 11px;" title="Transferir a otra obra">
                            <i class="fa-solid fa-arrows-split-up-and-left"></i>
                        </button>
                        <button onclick="returnResourceToBase('asset', ${v.id})" class="btn-primary" style="padding: 3px 6px; font-size: 11px; margin-left: 4px; background: #059669;" title="Devolver a Sede Central">
                            <i class="fa-solid fa-warehouse"></i>
                        </button>
                    `}
                    <button onclick="deleteAssetItem(${v.id})" class="btn-secondary" style="padding: 3px 6px; color: #ef4444; margin-left: 4px;" title="Inactivar Vehículo">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            </tr>`;
        }).join('');
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: #e11d48;">Error al cargar flota.</td></tr>`;
    }
}

function openNewVehicleModal() {
    document.getElementById("vehicleForm").reset();
    openModal("modalVehicle");
}

async function submitCreateVehicle(event) {
    event.preventDefault();
    const payload = {
        asset_code: document.getElementById("veh_code").value,
        name: document.getElementById("veh_name").value,
        asset_type: "vehiculo",
        brand: document.getElementById("veh_brand").value,
        license_plate: document.getElementById("veh_plate").value,
        current_odometer: parseFloat(document.getElementById("veh_odometer").value) || 0.0,
        service_interval_km: parseFloat(document.getElementById("veh_interval").value) || 5000.0,
        current_location: "Sede Central",
        is_exclusive: true
    };

    try {
        const res = await fetch(`${API_BASE}/assets/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            alert("Vehículo registrado exitosamente en la flota.");
            closeModal("modalVehicle");
            await loadInitialMasterData();
            loadFleetList();
        } else {
            const err = await res.json();
            alert("Error: " + (err.detail || JSON.stringify(err)));
        }
    } catch (e) {
        alert("Error al registrar vehículo.");
    }
}

// ----------------------------------------------------
// 4. CONTROL DE MAQUINARIA PESADA & PLANTAS (PESTAÑA EXCLUSIVA)
// ----------------------------------------------------
async function loadMachineryList() {
    const tbody = document.getElementById("machineryTableBody");
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; padding: 20px; color: #94a3b8;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando maquinaria pesada y plantas...</td></tr>`;

    try {
        const res = await fetch(`${API_BASE}/assets/`);
        const assets = await res.json();
        const machinery = assets.filter(a => ['maquinaria', 'planta', 'generador', 'compresor'].includes(a.asset_type));

        if (machinery.length === 0) {
            tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; padding: 20px; color: #94a3b8;">No hay maquinaria pesada o plantas registradas.</td></tr>`;
            return;
        }

        tbody.innerHTML = machinery.map(m => {
            const inBase = m.status === 'disponible_base' || !m.current_project_id;
            const isMaint = m.maintenance_status === 'en_mantenimiento';
            return `
            <tr>
                <td style="font-weight: 800; color: #ea580c; font-family: monospace;">${m.asset_code}</td>
                <td style="font-weight: 700; color: var(--dalor-navy);">${m.name}</td>
                <td>${m.brand || ''} ${m.model ? `(${m.model})` : ''}</td>
                <td style="font-family: monospace; font-size: 11px;">${m.serial_number || '-'}</td>
                <td style="font-weight: 800; color: #0284c7;">${(m.current_odometer || 0).toLocaleString()} Hrs/Km</td>
                <td>
                    <span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 800; ${isMaint ? 'background: #fee2e2; color: #991b1b;' : 'background: #dcfce7; color: #166534;'}">
                        ${isMaint ? 'EN TALLER / MTTO' : 'OPERATIVO'}
                    </span>
                </td>
                <td>
                    <span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 800; ${inBase ? 'background: #dcfce7; color: #166534;' : 'background: #e0f2fe; color: #0369a1;'}">
                        ${inBase ? 'DISPONIBLE EN BASE' : 'EN OBRA / FAENA'}
                    </span>
                </td>
                <td>${m.current_location || 'Sede Central'}</td>
                <td>${m.current_custodian_name || 'Disponible'}</td>
                <td style="text-align: center; white-space: nowrap;">
                    ${inBase ? `
                        <button onclick="openAssignModal('asset', ${m.id}, '${m.name}', 'assign')" class="btn-primary" style="padding: 3px 8px; font-size: 11px; background: #ea580c;">
                            Asignar a Faena
                        </button>
                    ` : `
                        <button onclick="openAssignModal('asset', ${m.id}, '${m.name}', 'transfer')" class="btn-secondary" style="padding: 3px 6px; font-size: 11px;" title="Transferir a otra obra">
                            <i class="fa-solid fa-arrows-split-up-and-left"></i>
                        </button>
                        <button onclick="returnResourceToBase('asset', ${m.id})" class="btn-primary" style="padding: 3px 6px; font-size: 11px; margin-left: 4px; background: #059669;" title="Devolver a Sede Central">
                            <i class="fa-solid fa-warehouse"></i>
                        </button>
                    `}
                    <button onclick="deleteAssetItem(${m.id})" class="btn-secondary" style="padding: 3px 6px; color: #ef4444; margin-left: 4px;" title="Inactivar Maquinaria">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            </tr>`;
        }).join('');
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: #e11d48;">Error al cargar maquinaria pesada.</td></tr>`;
    }
}

// ----------------------------------------------------
// 5. CONTROL DE HERRAMIENTAS & EQUIPOS (PESTAÑA EXCLUSIVA)
// ----------------------------------------------------
async function loadToolsList() {
    const tbody = document.getElementById("toolsTableBody");
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 20px; color: #94a3b8;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando inventario de herramientas...</td></tr>`;

    try {
        const res = await fetch(`${API_BASE}/assets/`);
        const assets = await res.json();
        const nonTools = ['vehiculo', 'camioneta', 'camion', 'remolque', 'maquinaria', 'planta', 'generador', 'compresor'];
        const tools = assets.filter(a => !nonTools.includes(a.asset_type));

        if (tools.length === 0) {
            tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 20px; color: #94a3b8;">No hay herramientas registradas.</td></tr>`;
            return;
        }

        tbody.innerHTML = tools.map(t => {
            const inBase = t.status === 'disponible_base' || !t.current_project_id;
            return `
            <tr>
                <td style="font-weight: 800; color: var(--dalor-blue);">${t.asset_code}</td>
                <td style="font-weight: 700; color: var(--dalor-navy);">${t.name}</td>
                <td><span style="font-size: 10px; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-weight: 700;">${(t.asset_type || 'HERRAMIENTA').toUpperCase().replace('_', ' ')}</span></td>
                <td>${t.brand || ''} ${t.model ? `(${t.model})` : ''}</td>
                <td style="font-family: monospace; font-size: 11px;">${t.serial_number || '-'}</td>
                <td>
                    <span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 800; ${inBase ? 'background: #dcfce7; color: #166534;' : 'background: #e0f2fe; color: #0369a1;'}">
                        ${inBase ? 'DISPONIBLE EN BASE' : 'EN OBRA'}
                    </span>
                </td>
                <td>${t.current_location || 'Sede Central'}</td>
                <td>${t.current_custodian_name || 'Disponible'}</td>
                <td style="text-align: center; white-space: nowrap;">
                    ${inBase ? `
                        <button onclick="openAssignModal('asset', ${t.id}, '${t.name}', 'assign')" class="btn-primary" style="padding: 3px 8px; font-size: 11px;">
                            Asignar a Obra
                        </button>
                    ` : `
                        <button onclick="openAssignModal('asset', ${t.id}, '${t.name}', 'transfer')" class="btn-secondary" style="padding: 3px 6px; font-size: 11px;" title="Transferir a otra obra">
                            <i class="fa-solid fa-arrows-split-up-and-left"></i>
                        </button>
                        <button onclick="returnResourceToBase('asset', ${t.id})" class="btn-primary" style="padding: 3px 6px; font-size: 11px; margin-left: 4px; background: #059669;" title="Devolver a Sede Central">
                            <i class="fa-solid fa-warehouse"></i>
                        </button>
                    `}
                    <button onclick="deleteAssetItem(${t.id})" class="btn-secondary" style="padding: 3px 6px; color: #ef4444; margin-left: 4px;" title="Inactivar Herramienta">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            </tr>`;
        }).join('');
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: #e11d48;">Error al cargar herramientas.</td></tr>`;
    }
}

function openNewToolModal() {
    document.getElementById("toolForm").reset();
    openModal("modalTool");
}

async function submitCreateTool(event) {
    event.preventDefault();
    const payload = {
        asset_code: document.getElementById("tool_code").value,
        name: document.getElementById("tool_name").value,
        asset_type: document.getElementById("tool_type").value,
        brand: document.getElementById("tool_brand").value,
        serial_number: document.getElementById("tool_serial").value,
        current_location: document.getElementById("tool_location").value || "Sede Central",
        is_exclusive: true
    };

    try {
        const res = await fetch(`${API_BASE}/assets/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            alert("Herramienta/Equipo registrado exitosamente.");
            closeModal("modalTool");
            await loadInitialMasterData();
            loadToolsList();
        } else {
            const err = await res.json();
            alert("Error: " + (err.detail || JSON.stringify(err)));
        }
    } catch (e) {
        alert("Error al registrar herramienta.");
    }
}

async function deleteAssetItem(assetId) {
    if (!confirm("¿Deseas inactivar este elemento? (Se conservará la traza histórica)")) return;
    try {
        await fetch(`${API_BASE}/assets/${assetId}`, { method: "DELETE" });
        await loadInitialMasterData();
        loadToolsList();
        loadFleetList();
    } catch (e) {
        alert("Error al inactivar.");
    }
}

// ----------------------------------------------------
// 5. CONTROL DE PERSONAL & CUADRILLA (PESTAÑA EXCLUSIVA)
// ----------------------------------------------------
async function loadPersonnelTableList() {
    const tbody = document.getElementById("matrixPersonnelTableBody");
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px; color: #94a3b8;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando personal...</td></tr>`;

    try {
        const res = await fetch(`${API_BASE}/personnel/`);
        allPersonnel = await res.json();

        tbody.innerHTML = allPersonnel.map(p => {
            const inBase = p.status === 'disponible_base' || !p.current_project_id;
            return `
            <tr>
                <td style="font-weight: 800; color: var(--dalor-blue);">${p.code}</td>
                <td style="font-weight: 700; color: var(--dalor-navy);">${p.full_name}</td>
                <td><span style="font-size: 11px; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-weight: 600;">${p.role_title}</span></td>
                <td>${p.phone || '-'}</td>
                <td>
                    <span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 800; ${inBase ? 'background: #dcfce7; color: #166534;' : 'background: #e0f2fe; color: #0369a1;'}">
                        ${inBase ? 'DISPONIBLE EN BASE' : 'EN OBRA'}
                    </span>
                </td>
                <td>${p.current_location || 'Sede Central'}</td>
                <td style="text-align: center; white-space: nowrap;">
                    ${inBase ? `
                        <button onclick="openAssignModal('personnel', ${p.id}, '${p.full_name}', 'assign')" class="btn-primary" style="padding: 3px 8px; font-size: 11px;">
                            Asignar a Obra
                        </button>
                    ` : `
                        <button onclick="openAssignModal('personnel', ${p.id}, '${p.full_name}', 'transfer')" class="btn-secondary" style="padding: 3px 6px; font-size: 11px;" title="Transferir a otra obra">
                            <i class="fa-solid fa-arrows-split-up-and-left"></i>
                        </button>
                        <button onclick="returnResourceToBase('personnel', ${p.id})" class="btn-primary" style="padding: 3px 6px; font-size: 11px; margin-left: 4px; background: #059669;" title="Devolver a Sede Central">
                            <i class="fa-solid fa-warehouse"></i>
                        </button>
                    `}
                </td>
            </tr>`;
        }).join('');
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #e11d48;">Error al cargar personal.</td></tr>`;
    }
}

function openAssignModal(type, id, name, action) {
    document.getElementById("modal_res_type").value = type;
    document.getElementById("modal_res_id").value = id;
    document.getElementById("modal_action_type").value = action;
    
    const isAsset = type === 'asset';
    document.getElementById("modal_odometer_container").style.display = isAsset ? 'block' : 'none';
    document.getElementById("modal_custodian_container").style.display = isAsset ? 'block' : 'none';

    document.getElementById("assignModalTitle").innerText = action === 'assign' ? `Asignar ${name} a Obra` : `Transferir ${name} a Nueva Obra`;
    document.getElementById("btnConfirmResourceAction").innerText = action === 'assign' ? 'Confirmar Asignación' : 'Confirmar Transferencia Directa';

    openModal("modalAssignResource");
}

async function submitResourceAction(event) {
    event.preventDefault();
    const type = document.getElementById("modal_res_type").value;
    const id = parseInt(document.getElementById("modal_res_id").value);
    const action = document.getElementById("modal_action_type").value;
    const targetProjId = parseInt(document.getElementById("modal_target_project_id").value);
    const location = document.getElementById("modal_res_location").value;
    const custodian = document.getElementById("modal_res_custodian").value;
    const odometer = parseFloat(document.getElementById("modal_res_odometer").value) || null;

    const endpoint = action === 'assign' ? `${API_BASE}/resources/assign` : `${API_BASE}/resources/transfer`;
    const payload = action === 'assign' ? {
        project_id: targetProjId,
        resource_type: type,
        resource_id: id,
        destination_location: location,
        custodian_name: custodian,
        start_odometer: odometer
    } : {
        target_project_id: targetProjId,
        resource_type: type,
        resource_id: id,
        destination_location: location,
        custodian_name: custodian,
        current_odometer: odometer
    };

    try {
        const res = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            const data = await res.json();
            alert(data.message);
            closeModal("modalAssignResource");
            loadResourceDashboard();
            loadFleetList();
            loadToolsList();
            loadPersonnelTableList();
        } else {
            alert("Error al procesar movimiento de recurso.");
        }
    } catch (e) {
        alert("Error de conexión.");
    }
}

async function returnResourceToBase(type, id) {
    let endOdometer = null;
    if (type === 'asset') {
        const odoInput = prompt("Ingresa el odómetro final (o deja en blanco):");
        if (odoInput) endOdometer = parseFloat(odoInput);
    }

    try {
        const res = await fetch(`${API_BASE}/resources/return-to-base`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                resource_type: type,
                resource_id: id,
                end_odometer: endOdometer,
                return_location: "Sede Central"
            })
        });
        if (res.ok) {
            const data = await res.json();
            alert(data.message);
            loadResourceDashboard();
            loadFleetList();
            loadToolsList();
            loadPersonnelTableList();
        }
    } catch (e) {
        alert("Error al registrar retorno.");
    }
}

// ----------------------------------------------------
// 6. MÓDULO DE PRESUPUESTOS (LULOWIN STYLE)
// ----------------------------------------------------
async function loadQuotations() {
    const tbody = document.getElementById("quotationsTableBody");
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 20px; color: #94a3b8;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando cotizaciones...</td></tr>`;

    try {
        const res = await fetch(`${API_BASE}/quotations/`);
        const quotes = await res.json();

        if (quotes.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 20px; color: #94a3b8;">No hay cotizaciones emitidas. Haz clic en '+ Nueva Cotización' para armar una.</td></tr>`;
            return;
        }

        tbody.innerHTML = quotes.map(q => {
            const clientName = q.client ? q.client.name : 'Cliente General';
            const isApproved = q.status === 'aprobado';
            
            return `
            <tr>
                <td style="font-weight: 800; color: var(--dalor-blue);">${q.quote_number}</td>
                <td style="font-weight: 600;">${clientName}</td>
                <td>${q.project_title}</td>
                <td style="font-weight: 700;">$${q.subtotal_usd.toLocaleString()}</td>
                <td style="color: ${q.tax_usd === 0 ? '#10b981' : '#64748b'}; font-weight: 700;">
                    ${q.tax_usd === 0 ? 'EXENTO (0%)' : `$${q.tax_usd.toLocaleString()}`}
                </td>
                <td style="font-weight: 800; color: var(--dalor-navy);">$${q.total_usd.toLocaleString()}</td>
                <td>
                    <span style="font-size: 10px; padding: 3px 8px; border-radius: 9999px; font-weight: 800; ${isApproved ? 'background: #dcfce7; color: #166534;' : 'background: #f1f5f9; color: #475569;'}">
                        ${q.status.toUpperCase()}
                    </span>
                </td>
                <td style="text-align: center; white-space: nowrap;">
                    <button onclick="printQuotation(${q.id})" class="btn-secondary" style="padding: 4px 8px; font-size: 11px;" title="Imprimir / Exportar Cotización">
                        <i class="fa-solid fa-print"></i>
                    </button>
                    ${!isApproved ? `
                        <button onclick="convertQuoteToProject(${q.id})" class="btn-primary" style="padding: 4px 8px; font-size: 11px; margin-left: 4px; background: #059669;" title="Aprobar y Convertir en Proyecto">
                            <i class="fa-solid fa-check"></i> Convertir en Proyecto
                        </button>
                    ` : '<span style="font-size: 11px; color: #059669; font-weight: bold; margin-left: 6px;">Obra Activa</span>'}
                </td>
            </tr>`;
        }).join('');
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #e11d48;">Error al cargar cotizaciones.</td></tr>`;
    }
}

function openNewQuotationModal() {
    quoteRowsCount = 0;
    document.getElementById("quoteForm").reset();
    document.getElementById("quoteItemsList").innerHTML = "";
    document.getElementById("quote_tax_type").value = "16";
    document.getElementById("quote_tax_percent").value = "16";
    addQuotationRow();
    addQuotationRow();
    recalcQuotationTotals();
    openModal("modalQuotation");
}

function onTaxTypeChanged() {
    const val = document.getElementById("quote_tax_type").value;
    document.getElementById("quote_tax_percent").value = val;
    recalcQuotationTotals();
}

function addQuotationRow() {
    quoteRowsCount++;
    const container = document.getElementById("quoteItemsList");
    const rowId = `quote_row_${quoteRowsCount}`;

    const srvOptions = `<option value="">-- Partida del Catálogo --</option>` + 
        allServices.map(s => `<option value="${s.id}" data-code="${s.code}" data-unit="${s.unit_measure}" data-price="${s.unit_price_usd}">[${s.code}] ${s.name} ($${s.unit_price_usd}/${s.unit_measure})</option>`).join('');

    const div = document.createElement("div");
    div.id = rowId;
    div.style.cssText = "display: grid; grid-template-columns: 4fr 1fr 1fr 1fr 1fr 30px; gap: 6px; background: white; padding: 8px; border-radius: 8px; border: 1px solid #cbd5e1; align-items: center;";
    div.innerHTML = `
        <div>
            <select class="form-select q-srv-select" style="font-size: 11px; padding: 5px;" onchange="onServiceSelected('${rowId}')">
                ${srvOptions}
            </select>
            <input type="text" class="form-input q-desc" placeholder="Descripción detallada de la partida / APU" style="font-size: 11px; padding: 4px 6px; margin-top: 4px;" required>
        </div>
        <div>
            <input type="text" class="form-input q-unit" placeholder="Unidad" value="Global" style="font-size: 11px; padding: 5px;" readonly>
        </div>
        <div>
            <input type="number" step="0.01" class="form-input q-qty" placeholder="Cant" value="1" oninput="recalcQuotationTotals()" style="font-size: 11px; padding: 5px; font-weight: bold;" required>
        </div>
        <div>
            <input type="number" step="0.01" class="form-input q-price" placeholder="P. Unit ($)" value="0.00" oninput="recalcQuotationTotals()" style="font-size: 11px; padding: 5px; font-weight: bold; color: var(--dalor-blue);" required>
        </div>
        <div>
            <input type="text" class="form-input q-total" placeholder="Total ($)" value="$0.00" style="font-size: 11px; padding: 5px; font-weight: 800;" readonly>
        </div>
        <div style="text-align: center;">
            <button type="button" onclick="removeQuotationRow('${rowId}')" style="background: none; border: none; color: #ef4444; font-size: 16px; cursor: pointer;">&times;</button>
        </div>
    `;
    container.appendChild(div);
}

function removeQuotationRow(rowId) {
    const el = document.getElementById(rowId);
    if (el) el.remove();
    recalcQuotationTotals();
}

function onServiceSelected(rowId) {
    const row = document.getElementById(rowId);
    const select = row.querySelector(".q-srv-select");
    const opt = select.options[select.selectedIndex];
    if (opt && opt.value) {
        row.querySelector(".q-desc").value = opt.text.replace(/\[.*?\]\s*/, '').split(' ($')[0];
        row.querySelector(".q-unit").value = opt.getAttribute("data-unit") || "Global";
        row.querySelector(".q-price").value = parseFloat(opt.getAttribute("data-price") || 0).toFixed(2);
    }
    recalcQuotationTotals();
}

function recalcQuotationTotals() {
    const rows = document.querySelectorAll("#quoteItemsList > div");
    let subtotal = 0;
    rows.forEach(r => {
        const qty = parseFloat(r.querySelector(".q-qty").value) || 0;
        const price = parseFloat(r.querySelector(".q-price").value) || 0;
        const lineTot = qty * price;
        r.querySelector(".q-total").value = `$${lineTot.toFixed(2)}`;
        subtotal += lineTot;
    });

    const taxPercent = parseFloat(document.getElementById("quote_tax_percent").value) || 0.0;
    const taxUsd = subtotal * (taxPercent / 100.0);
    const grandTotal = subtotal + taxUsd;

    document.getElementById("quote_subtotal_display").innerText = `$${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    document.getElementById("quote_tax_display").innerText = taxPercent === 0 ? "EXENTO (0%)" : `$${taxUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    document.getElementById("quote_total_display").innerText = `$${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

async function submitCreateQuotation(event) {
    event.preventDefault();
    const clientId = parseInt(document.getElementById("quote_client_id").value);
    if (!clientId) {
        alert("Por favor selecciona un cliente.");
        return;
    }

    const rows = document.querySelectorAll("#quoteItemsList > div");
    let items = [];
    rows.forEach(r => {
        const srvSelect = r.querySelector(".q-srv-select");
        const srvId = srvSelect.value ? parseInt(srvSelect.value) : null;
        const srvOpt = srvSelect.options[srvSelect.selectedIndex];
        const itemCode = srvOpt ? srvOpt.getAttribute("data-code") : null;
        const desc = r.querySelector(".q-desc").value;
        const unit = r.querySelector(".q-unit").value;
        const qty = parseFloat(r.querySelector(".q-qty").value) || 1;
        const price = parseFloat(r.querySelector(".q-price").value) || 0;

        items.push({
            service_id: srvId,
            item_code: itemCode,
            description: desc,
            unit_measure: unit,
            quantity: qty,
            unit_price_usd: price,
            total_usd: qty * price
        });
    });

    if (items.length === 0) {
        alert("Agrega al menos una partida a la cotización.");
        return;
    }

    const payload = {
        client_id: clientId,
        project_title: document.getElementById("quote_title").value,
        location: document.getElementById("quote_location").value || "Sede Central",
        validity_days: parseInt(document.getElementById("quote_validity").value) || 15,
        tax_percent: parseFloat(document.getElementById("quote_tax_percent").value) || 0.0,
        exchange_rate: EXCHANGE_RATE,
        items: items
    };

    try {
        const res = await fetch(`${API_BASE}/quotations/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            const data = await res.json();
            alert(`¡Presupuesto ${data.quote_number} generado exitosamente!`);
            closeModal("modalQuotation");
            loadQuotations();
        } else {
            const err = await res.json();
            alert("Error: " + (err.detail || JSON.stringify(err)));
        }
    } catch (e) {
        alert("Error al guardar presupuesto.");
    }
}

async function convertQuoteToProject(quoteId) {
    if (!confirm("¿Deseas aprobar esta cotización y convertirla en un Proyecto Activo en ejecución?")) return;

    try {
        const res = await fetch(`${API_BASE}/quotations/${quoteId}/convert-to-project`, { method: "POST" });
        if (res.ok) {
            const data = await res.json();
            alert(data.message);
            await loadInitialMasterData();
            loadQuotations();
            switchView('projects', 'proyectos');
        } else {
            alert("Error al convertir cotización en proyecto.");
        }
    } catch (e) {
        alert("Error de conexión.");
    }
}

async function printQuotation(quoteId) {
    try {
        const res = await fetch(`${API_BASE}/quotations/${quoteId}`);
        if (!res.ok) throw new Error('No se pudo cargar la cotización.');
        const q = await res.json();

        const rate = q.exchange_rate || EXCHANGE_RATE || 800.0;
        const subtotalBs = (q.subtotal_usd * rate).toLocaleString('es-VE', { minimumFractionDigits: 2 });
        const taxBs = (q.tax_usd * rate).toLocaleString('es-VE', { minimumFractionDigits: 2 });
        const totalBs = (q.total_usd * rate).toLocaleString('es-VE', { minimumFractionDigits: 2 });

        const itemsRows = (q.items || []).map((item, idx) => `
            <tr>
                <td style="text-align: center; font-weight: bold; border: 1px solid #cbd5e1; padding: 7px;">${idx + 1}</td>
                <td style="text-align: center; color: #0284c7; font-weight: bold; border: 1px solid #cbd5e1; padding: 7px;">${item.item_code || ('SER-' + (idx+1))}</td>
                <td style="border: 1px solid #cbd5e1; padding: 7px; font-weight: 600;">${item.description}</td>
                <td style="text-align: center; border: 1px solid #cbd5e1; padding: 7px;">${item.unit_measure || 'Global'}</td>
                <td style="text-align: center; font-weight: bold; border: 1px solid #cbd5e1; padding: 7px;">${item.quantity}</td>
                <td style="text-align: right; border: 1px solid #cbd5e1; padding: 7px;">$${item.unit_price_usd.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td style="text-align: right; font-weight: bold; border: 1px solid #cbd5e1; padding: 7px; color: #002B49;">$${item.total_usd.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
            </tr>
        `).join('');

        const sheetHtml = `
            <!-- Membrete -->
            <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #F5B800; padding-bottom: 12px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <img src="logo_dalor.jpg" alt="DALOR" style="height: 48px; display: block; border-radius: 4px;">
                    <div>
                        <h1 style="font-size: 16px; font-weight: 900; color: #002B49; margin: 0;">METALMECÁNICA DALOR C.A.</h1>
                        <p style="font-size: 11px; color: #64748b; margin: 2px 0 0 0;">RIF: J-30123456-1 &bull; Especialistas en Ingeniería, Electricidad & Montajes</p>
                        <p style="font-size: 11px; color: #64748b; margin: 1px 0 0 0;">Zona Industrial Valencia, Edo. Carabobo &bull; Correo: operaciones@dalor.com</p>
                    </div>
                </div>
                <div style="text-align: right;">
                    <span style="background: #002B49; color: #F5B800; padding: 4px 10px; border-radius: 6px; font-weight: 900; font-size: 13px; letter-spacing: 0.5px;">${q.quote_number}</span>
                    <p style="font-size: 11px; color: #64748b; margin: 6px 0 0 0;">Fecha: <b>${new Date(q.created_at).toLocaleDateString('es-VE')}</b></p>
                    <p style="font-size: 11px; color: #64748b; margin: 2px 0 0 0;">Validez: <b>${q.validity_days || 15} Días</b></p>
                </div>
            </div>

            <!-- Datos del Cliente y Obra -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 12px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 8px;">
                <div>
                    <span style="font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase;">Datos del Cliente:</span>
                    <p style="font-size: 13px; font-weight: 800; color: #002B49; margin: 2px 0 0 0;">${(q.client && q.client.name) || 'Cliente General'}</p>
                    <p style="font-size: 11px; color: #475569; margin: 2px 0 0 0;">RIF: <b>${(q.client && q.client.rif) || '-'}</b></p>
                    <p style="font-size: 11px; color: #475569; margin: 2px 0 0 0;">Contacto: ${(q.client && q.client.contact_name) || '-'} | Tel: ${(q.client && q.client.contact_phone) || '-'}</p>
                </div>
                <div>
                    <span style="font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase;">Proyecto / Ubicación:</span>
                    <p style="font-size: 13px; font-weight: 800; color: #002B49; margin: 2px 0 0 0;">${q.project_title}</p>
                    <p style="font-size: 11px; color: #475569; margin: 2px 0 0 0;">Lugar: <b>${q.location || 'Sede Central'}</b></p>
                    <p style="font-size: 11px; color: #0284c7; margin: 2px 0 0 0;">Tasa Referencial: <b>${rate.toFixed(2)} Bs/$</b></p>
                </div>
            </div>

            <!-- Tabla de Partidas -->
            <table style="width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 12px;">
                <thead>
                    <tr style="background: #002B49; color: white;">
                        <th style="width: 30px; padding: 8px; border: 1px solid #002B49; font-size: 11px;">#</th>
                        <th style="width: 85px; padding: 8px; border: 1px solid #002B49; font-size: 11px;">Código</th>
                        <th style="padding: 8px; border: 1px solid #002B49; font-size: 11px; text-align: left;">Descripción del Servicio / Partida APU</th>
                        <th style="width: 60px; padding: 8px; border: 1px solid #002B49; font-size: 11px;">Unidad</th>
                        <th style="width: 50px; padding: 8px; border: 1px solid #002B49; font-size: 11px;">Cant.</th>
                        <th style="width: 90px; padding: 8px; border: 1px solid #002B49; font-size: 11px; text-align: right;">P. Unit ($)</th>
                        <th style="width: 100px; padding: 8px; border: 1px solid #002B49; font-size: 11px; text-align: right;">Total ($)</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsRows}
                </tbody>
            </table>

            <!-- Bloque de Totales -->
            <div style="display: flex; justify-content: flex-end; margin-top: 14px;">
                <div style="width: 300px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 14px;">
                    <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;">
                        <span style="color: #475569;">Subtotal:</span>
                        <span style="font-weight: 700;">$${q.subtotal_usd.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 11px; color: #64748b; margin-bottom: 6px;">
                        <span>Subtotal en Bs:</span>
                        <span>Bs. ${subtotalBs}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;">
                        <span style="color: #475569;">IVA (${q.tax_percent}%):</span>
                        <span style="font-weight: 700; color: #d97706;">$${q.tax_usd.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 11px; color: #64748b; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
                        <span>IVA en Bs:</span>
                        <span>Bs. ${taxBs}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: 900; color: #002B49;">
                        <span>TOTAL USD:</span>
                        <span style="color: #0072B8;">$${q.total_usd.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: 800; color: #475569; margin-top: 2px;">
                        <span>TOTAL BS:</span>
                        <span>Bs. ${totalBs}</span>
                    </div>
                </div>
            </div>

            <!-- Firmas y Términos -->
            <div style="margin-top: 35px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; text-align: center;">
                <div>
                    <div style="border-bottom: 1px solid #000; margin-bottom: 6px;"></div>
                    <p style="font-size: 11px; font-weight: 800; margin: 0; color: #002B49;">Por Metalmecánica Dalor C.A.</p>
                    <p style="font-size: 10px; color: #64748b; margin: 0;">Gerencia de Proyectos / Estimación</p>
                </div>
                <div>
                    <div style="border-bottom: 1px solid #000; margin-bottom: 6px;"></div>
                    <p style="font-size: 11px; font-weight: 800; margin: 0; color: #002B49;">Aceptado y Conforme por el Cliente</p>
                    <p style="font-size: 10px; color: #64748b; margin: 0;">Firma y Sello de Aprobación</p>
                </div>
            </div>
        `;

        document.getElementById('modalPrintPreviewContent').innerHTML = sheetHtml;
        document.getElementById('previewModalTitle').textContent = `Presupuesto ${q.quote_number} | ${(q.client && q.client.name) || 'Cliente'}`;
        document.getElementById('modalPrintPreview').classList.remove('hidden');

    } catch (e) {
        alert('Error al visualizar cotización: ' + e.message);
    }
}

function triggerPrintFromModal() {
    window.print();
}


async function loadServices() {
    const tbody = document.getElementById("servicesTableBody");
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 20px; color: #94a3b8;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando partidas...</td></tr>`;

    try {
        const res = await fetch(`${API_BASE}/services/`);
        allServices = await res.json();

        tbody.innerHTML = allServices.map(s => {
            const margin = s.unit_price_usd - s.base_cost_usd;
            return `
            <tr>
                <td style="font-weight: 800; color: var(--dalor-blue);">${s.code}</td>
                <td style="font-weight: 600;">${s.name}</td>
                <td><span style="font-size: 10px; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-weight: 700;">${s.category}</span></td>
                <td>${s.unit_measure}</td>
                <td>$${s.base_cost_usd.toFixed(2)}</td>
                <td style="font-weight: 800; color: var(--dalor-navy);">$${s.unit_price_usd.toFixed(2)}</td>
                <td style="color: #059669; font-weight: 700;">+$${margin.toFixed(2)}</td>
                <td style="text-align: center;">
                    <button onclick="deleteService(${s.id})" class="btn-secondary" style="padding: 4px 8px; color: #ef4444;" title="Inactivar Partida">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            </tr>`;
        }).join('');
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #e11d48;">Error al cargar servicios.</td></tr>`;
    }
}

function openNewServiceModal() {
    document.getElementById("serviceForm").reset();
    openModal("modalService");
}

async function submitCreateService(event) {
    event.preventDefault();
    const payload = {
        code: document.getElementById("srv_code").value,
        name: document.getElementById("srv_name").value,
        category: document.getElementById("srv_category").value,
        unit_measure: document.getElementById("srv_unit").value,
        base_cost_usd: parseFloat(document.getElementById("srv_cost").value) || 0.0,
        unit_price_usd: parseFloat(document.getElementById("srv_price").value) || 0.0
    };

    try {
        const res = await fetch(`${API_BASE}/services/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            alert("Partida de servicio creada exitosamente.");
            closeModal("modalService");
            await loadInitialMasterData();
            loadServices();
        } else {
            const err = await res.json();
            alert("Error: " + (err.detail || JSON.stringify(err)));
        }
    } catch (e) {
        alert("Error al guardar servicio.");
    }
}

async function deleteService(serviceId) {
    if (!confirm("¿Deseas inactivar esta partida de servicio? (Se conservará la traza histórica)")) return;
    try {
        await fetch(`${API_BASE}/services/${serviceId}`, { method: "DELETE" });
        await loadInitialMasterData();
        loadServices();
    } catch (e) {
        alert("Error al inactivar servicio.");
    }
}

// ----------------------------------------------------
// 8. MÓDULO DE CLIENTES
// ----------------------------------------------------
async function loadClients() {
    const tbody = document.getElementById("clientsTableBody");
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px; color: #94a3b8;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando clientes...</td></tr>`;

    try {
        const res = await fetch(`${API_BASE}/clients/`);
        allClients = await res.json();

        tbody.innerHTML = allClients.map(c => `
            <tr>
                <td style="font-weight: 800; color: var(--dalor-blue);">${c.code}</td>
                <td style="font-weight: 700; color: var(--dalor-navy);">${c.name}</td>
                <td>${c.rif || '<span style="color:#94a3b8;">-</span>'}</td>
                <td>${c.contact_name || '<span style="color:#94a3b8;">-</span>'}</td>
                <td>${c.contact_phone || c.contact_email || '<span style="color:#94a3b8;">-</span>'}</td>
                <td>${c.address || '<span style="color:#94a3b8;">-</span>'}</td>
                <td style="text-align: center;">
                    <button onclick="deleteClient(${c.id})" class="btn-secondary" style="padding: 4px 8px; color: #ef4444;" title="Inactivar Cliente">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #e11d48;">Error al cargar clientes.</td></tr>`;
    }
}

function openNewClientModal() {
    document.getElementById("clientForm").reset();
    openModal("modalClient");
}

async function submitCreateClient(event) {
    event.preventDefault();
    const payload = {
        code: document.getElementById("cli_code").value,
        name: document.getElementById("cli_name").value,
        rif: document.getElementById("cli_rif").value,
        industry: document.getElementById("cli_industry").value,
        contact_name: document.getElementById("cli_contact").value,
        contact_phone: document.getElementById("cli_phone").value,
        contact_email: document.getElementById("cli_email").value,
        address: document.getElementById("cli_address").value
    };

    try {
        const res = await fetch(`${API_BASE}/clients/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            alert("Cliente registrado exitosamente.");
            closeModal("modalClient");
            await loadInitialMasterData();
            loadClients();
        } else {
            const err = await res.json();
            alert("Error: " + (err.detail || JSON.stringify(err)));
        }
    } catch (e) {
        alert("Error al guardar cliente.");
    }
}

async function deleteClient(clientId) {
    if (!confirm("¿Deseas inactivar este cliente? (Se conservará su historial de obras y facturas)")) return;
    try {
        await fetch(`${API_BASE}/clients/${clientId}`, { method: "DELETE" });
        await loadInitialMasterData();
        loadClients();
    } catch (e) {
        alert("Error al inactivar cliente.");
    }
}

// ----------------------------------------------------
// 9. CAPTURA OCR / PDF (CAMPO)
// ----------------------------------------------------
function triggerFileSelect() {
    document.getElementById("ticketFileInput").click();
}

function handleFileSelected(event) {
    const file = event.target.files[0];
    if (!file) return;

    const imgPreview = document.getElementById("imagePreview");
    const pdfPreview = document.getElementById("pdfPreview");
    const container = document.getElementById("imagePreviewContainer");
    const dropzone = document.getElementById("dropzoneContent");

    dropzone.classList.add("hidden");
    container.classList.remove("hidden");

    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
        imgPreview.classList.add("hidden");
        pdfPreview.classList.remove("hidden");
        document.getElementById("pdfFileName").innerText = file.name;
    } else {
        pdfPreview.classList.add("hidden");
        imgPreview.classList.remove("hidden");
        const reader = new FileReader();
        reader.onload = function(e) {
            imgPreview.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    processOCRFile(file);
}

async function processOCRFile(file) {
    const badge = document.getElementById("ocrStatusBadge");
    if (badge) {
        badge.style.background = "#fef3c7";
        badge.style.color = "#92400e";
        badge.innerText = "Analizando con OCR...";
    }

    const formData = new FormData();
    formData.append("file", file, file.name);
    formData.append("exchange_rate", EXCHANGE_RATE || 800.0);

    try {
        // Asegurar que las categorías y proyectos estén cargados
        if (!allCategories || allCategories.length === 0) {
            try {
                const resCat = await fetch(`${API_BASE}/expenses/categories`);
                allCategories = await resCat.json();
                populateSelectDropdowns();
            } catch (err) {
                console.warn("No se pudieron cargar categorías:", err);
            }
        }

        const res = await fetch(`${API_BASE}/ocr/scan-ticket`, {
            method: "POST",
            body: formData
        });
        
        if (!res.ok) {
            throw new Error("Respuesta no exitosa del servidor OCR");
        }

        const data = await res.json();
        
        if (data.detected_vendor && document.getElementById("field_vendor")) {
            document.getElementById("field_vendor").value = data.detected_vendor;
        }
        if (data.detected_amount_usd !== undefined && data.detected_amount_usd !== null && document.getElementById("field_amount_usd")) {
            document.getElementById("field_amount_usd").value = data.detected_amount_usd;
        }
        if (data.fuel_liters && document.getElementById("field_fuel_liters")) {
            document.getElementById("field_fuel_liters").value = data.fuel_liters;
        }

        if (allCategories && allCategories.length > 0 && document.getElementById("field_category_id")) {
            const catMatch = allCategories.find(c => c.code === data.suggested_category_code) || allCategories[0];
            if (catMatch) {
                document.getElementById("field_category_id").value = catMatch.id;
            }
        }

        // Asegurar que 'Reportado Por' tenga un valor seleccionado
        const repSelect = document.getElementById("field_reported_by");
        if (repSelect && (!repSelect.value || repSelect.value === "")) {
            repSelect.selectedIndex = 0;
        }

        if (document.getElementById("field_description")) {
            let desc = `Consumo / Factura en ${data.detected_vendor || 'Comercio'}`;
            if (data.detected_tax_usd && data.detected_tax_usd > 0) {
                desc += ` (Base: $${data.detected_base_usd.toFixed(2)} + IVA: $${data.detected_tax_usd.toFixed(2)})`;
            }
            document.getElementById("field_description").value = desc;
        }

        if (badge) {
            badge.style.background = "#dcfce7";
            badge.style.color = "#166534";
            badge.innerHTML = `<i class="fa-solid fa-check"></i> Datos Extraídos`;
        }
    } catch (e) {
        console.error("Error en lectura OCR:", e);
        if (badge) {
            badge.style.background = "#fee2e2";
            badge.style.color = "#991b1b";
            badge.innerText = "Lectura Manual";
        }
    }
}

function toggleSplitMode() {
    const isSplit = document.getElementById("chkEnableSplit").checked;
    const splitContainer = document.getElementById("splitRowsContainer");
    const singleBlock = document.getElementById("singleItemBlock");

    if (isSplit) {
        splitContainer.classList.remove("hidden");
        singleBlock.style.opacity = "0.5";
        singleBlock.style.pointerEvents = "none";
        if (splitRowsCount === 0) {
            addSplitRow();
            addSplitRow();
        }
    } else {
        splitContainer.classList.add("hidden");
        singleBlock.style.opacity = "1";
        singleBlock.style.pointerEvents = "auto";
    }
    updateSplitBalance();
}

function addSplitRow() {
    splitRowsCount++;
    const container = document.getElementById("splitItemsList");
    const rowId = `split_row_${splitRowsCount}`;

    const catOptions = allCategories.map(c => `<option value="${c.id}">[${c.code}] ${c.name}</option>`).join('');
    const projOptions = `<option value="">-- General Sede --</option>` + 
        allProjects.map(p => `<option value="${p.id}">${p.code} - ${p.name}</option>`).join('');

    const div = document.createElement("div");
    div.id = rowId;
    div.style.cssText = "display: grid; grid-template-columns: 2fr 2fr 1fr 2fr 25px; gap: 4px; background: white; padding: 6px; border-radius: 6px; border: 1px solid #fde68a; align-items: center; font-size: 11px;";
    div.innerHTML = `
        <select class="form-select split-cat" style="font-size: 11px; padding: 4px;">${catOptions}</select>
        <select class="form-select split-proj" style="font-size: 11px; padding: 4px;">${projOptions}</select>
        <input type="number" step="0.01" class="form-input split-amt" placeholder="$" oninput="updateSplitBalance()" style="font-size: 11px; padding: 4px; font-weight: bold; color: var(--dalor-blue);" required>
        <input type="text" class="form-input split-desc" placeholder="Detalle parte" style="font-size: 11px; padding: 4px;">
        <button type="button" onclick="removeSplitRow('${rowId}')" style="background: none; border: none; color: #ef4444; font-size: 14px; cursor: pointer;">&times;</button>
    `;
    container.appendChild(div);
    updateSplitBalance();
}

function removeSplitRow(rowId) {
    const el = document.getElementById(rowId);
    if (el) el.remove();
    updateSplitBalance();
}

function updateSplitBalance() {
    const totalUsd = parseFloat(document.getElementById("field_amount_usd").value) || 0;
    const amtInputs = document.querySelectorAll(".split-amt");
    let sum = 0;
    amtInputs.forEach(i => sum += parseFloat(i.value) || 0);

    const diff = (totalUsd - sum).toFixed(2);
    const span = document.getElementById("splitSumBalance");
    if (Math.abs(diff) < 0.01 && totalUsd > 0) {
        span.innerHTML = `<span style="color: #059669; font-weight: 800;">✓ Suma cuadra: $${sum.toFixed(2)} = Total $${totalUsd.toFixed(2)}</span>`;
    } else {
        span.innerHTML = `<span style="color: #e11d48; font-weight: 800;">Suma: $${sum.toFixed(2)} / Total: $${totalUsd.toFixed(2)} (Dif: $${diff})</span>`;
    }
}

async function submitFieldExpense(event) {
    event.preventDefault();
    const isSplit = document.getElementById("chkEnableSplit").checked;
    const totalUsd = parseFloat(document.getElementById("field_amount_usd").value) || 0;

    if (totalUsd <= 0) {
        alert("Ingresa un monto válido en USD.");
        return;
    }

    let payload = {
        supplier_vendor: document.getElementById("field_vendor").value || "Comercio General",
        reported_by_id: parseInt(document.getElementById("field_reported_by").value) || 1,
        payment_method: document.getElementById("field_payment_method").value || "caja_chica",
        amount_usd: totalUsd,
        amount_bs: Math.round(totalUsd * EXCHANGE_RATE * 100) / 100,
        exchange_rate: EXCHANGE_RATE,
        has_receipt: true
    };

    if (isSplit) {
        const rows = document.querySelectorAll("#splitItemsList > div");
        let splitItems = [];
        let runningSum = 0;
        rows.forEach(r => {
            const catId = parseInt(r.querySelector(".split-cat").value);
            const projId = r.querySelector(".split-proj").value ? parseInt(r.querySelector(".split-proj").value) : null;
            const amt = parseFloat(r.querySelector(".split-amt").value) || 0;
            const desc = r.querySelector(".split-desc").value || "Parte desglosada";
            runningSum += amt;
            splitItems.push({ category_id: catId, project_id: projId, amount_usd: amt, description: desc });
        });

        if (Math.abs(totalUsd - runningSum) > 0.05) {
            alert(`La suma del desglose ($${runningSum.toFixed(2)}) no coincide con el total de la factura ($${totalUsd.toFixed(2)}).`);
            return;
        }

        payload.category_id = splitItems[0].category_id;
        payload.description = `Factura Desglosada (${splitItems.length} partidas) en ${payload.supplier_vendor}`;
        payload.split_items = splitItems;
    } else {
        payload.category_id = parseInt(document.getElementById("field_category_id").value) || 1;
        payload.project_id = document.getElementById("field_project_id").value ? parseInt(document.getElementById("field_project_id").value) : null;
        payload.asset_id = document.getElementById("field_asset_id").value ? parseInt(document.getElementById("field_asset_id").value) : null;
        payload.description = document.getElementById("field_description").value || "Gasto de campo";
        payload.fuel_liters = document.getElementById("field_fuel_liters").value ? parseFloat(document.getElementById("field_fuel_liters").value) : null;
        payload.odometer_at_fueling = document.getElementById("field_odometer").value ? parseFloat(document.getElementById("field_odometer").value) : null;
    }

    try {
        const res = await fetch(`${API_BASE}/expenses/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            alert("¡Gasto registrado e imputado exitosamente!");
            document.getElementById("expenseForm").reset();
            document.getElementById("imagePreviewContainer").classList.add("hidden");
            document.getElementById("dropzoneContent").classList.remove("hidden");
            document.getElementById("chkEnableSplit").checked = false;
            toggleSplitMode();
            switchView('dashboard', 'proyectos');
        } else {
            const err = await res.json();
            alert("Error: " + (err.detail || JSON.stringify(err)));
        }
    } catch (e) {
        alert("Error de conexión con el backend.");
    }
}

// ----------------------------------------------------
// 10. CARGA MANUAL DE OFICINA
// ----------------------------------------------------
function calcManualBs() {
    const usd = parseFloat(document.getElementById("manual_amount_usd").value) || 0;
    const bsInput = document.getElementById("manual_amount_bs");
    if (bsInput) bsInput.value = (usd * EXCHANGE_RATE).toFixed(2);
}

function calcManualUsd() {
    const bs = parseFloat(document.getElementById("manual_amount_bs").value) || 0;
    const usdInput = document.getElementById("manual_amount_usd");
    if (usdInput) usdInput.value = (bs / EXCHANGE_RATE).toFixed(2);
}

async function submitManualExpense(event) {
    event.preventDefault();
    const usd = parseFloat(document.getElementById("manual_amount_usd").value) || 0;
    if (usd <= 0) {
        alert("Ingresa un monto válido en USD.");
        return;
    }

    const payload = {
        category_id: parseInt(document.getElementById("manual_category_id").value) || 1,
        project_id: document.getElementById("manual_project_id").value ? parseInt(document.getElementById("manual_project_id").value) : null,
        reported_by_id: parseInt(document.getElementById("manual_reported_by").value) || 1,
        description: document.getElementById("manual_description").value,
        supplier_vendor: document.getElementById("manual_vendor").value || "Sede Central",
        amount_usd: usd,
        amount_bs: parseFloat(document.getElementById("manual_amount_bs").value) || (usd * EXCHANGE_RATE),
        exchange_rate: EXCHANGE_RATE,
        payment_method: document.getElementById("manual_payment_method").value,
        has_receipt: false
    };

    try {
        const res = await fetch(`${API_BASE}/expenses/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            alert("¡Gasto / Transferencia de oficina guardado exitosamente!");
            document.getElementById("manualExpenseForm").reset();
            switchView('dashboard', 'proyectos');
        } else {
            const err = await res.json();
            alert("Error: " + (err.detail || JSON.stringify(err)));
        }
// ==============================================================================
// 📥 BANDEJA DE APROBACIÓN & VALIDACIÓN DE COMPROBANTES DE CAMPO
// ==============================================================================
let allPendingExpenses = [];

async function loadPendingExpensesInbox() {
    const tbody = document.getElementById("inboxPendingTableBody");
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 20px; color: #94a3b8;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando comprobantes pendientes...</td></tr>`;

    try {
        const res = await fetch(`${API_BASE}/expenses/inbox/pending`);
        allPendingExpenses = await res.json();

        const badge = document.getElementById("badgeInboxCount");
        if (badge) {
            badge.innerText = allPendingExpenses.length;
            badge.style.display = allPendingExpenses.length > 0 ? "inline-block" : "none";
        }

        if (allPendingExpenses.length === 0) {
            tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 24px; color: #059669; font-weight: 700;"><i class="fa-solid fa-circle-check" style="font-size: 24px; display: block; margin-bottom: 6px;"></i> ¡Al día! No hay comprobantes pendientes por auditar o aprobar.</td></tr>`;
            return;
        }

        tbody.innerHTML = allPendingExpenses.map(exp => {
            const hasImg = !!exp.receipt_image_path;
            const imgThumb = hasImg ? `<img src="${exp.receipt_image_path}" style="height: 38px; width: 38px; object-fit: cover; border-radius: 4px; border: 1px solid #cbd5e1; cursor: pointer;" onclick="openValidateExpenseModal(${exp.id})">` : `<span style="font-size: 10px; color: #94a3b8;">Sin foto</span>`;

            return `
            <tr>
                <td style="font-size: 11px; white-space: nowrap; color: #64748b;">${exp.date}</td>
                <td style="text-align: center;">${imgThumb}</td>
                <td style="font-weight: 700; color: var(--dalor-navy);">${exp.reported_by || 'Campo'}</td>
                <td><span style="font-size: 10px; background: #e0f2fe; color: #0369a1; padding: 2px 6px; border-radius: 4px; font-weight: 800;">${exp.project_code || 'SEDE'}</span> ${exp.project_name}</td>
                <td style="font-weight: 700;">${exp.supplier_vendor || 'Comercio General'}</td>
                <td style="font-size: 12px; color: #475569;">${exp.description}</td>
                <td style="font-weight: 900; color: var(--dalor-blue); font-size: 13px;">$${(exp.amount_usd || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td style="font-size: 11px; color: #64748b;">Bs. ${(exp.amount_bs || 0).toLocaleString()}</td>
                <td style="text-align: center; white-space: nowrap;">
                    <button onclick="openValidateExpenseModal(${exp.id})" class="btn-primary" style="padding: 4px 10px; font-size: 11px; background: #059669; font-weight: 800;">
                        <i class="fa-solid fa-magnifying-glass"></i> Auditar & Aprobar
                    </button>
                    <button onclick="rejectExpense(${exp.id})" class="btn-secondary" style="padding: 4px 8px; font-size: 11px; color: #e11d48; margin-left: 4px;" title="Rechazar Comprobante">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            </tr>
            `;
        }).join('');
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: #e11d48; padding: 20px;">Error al cargar comprobantes pendientes.</td></tr>`;
    }
}

function openValidateExpenseModal(expenseId) {
    const exp = allPendingExpenses.find(e => e.id === expenseId);
    if (!exp) return;

    document.getElementById("val_expense_id").value = exp.id;
    document.getElementById("val_supplier_vendor").value = exp.supplier_vendor || "";
    document.getElementById("val_amount_usd").value = exp.amount_usd || "";
    document.getElementById("val_amount_bs").value = exp.amount_bs || "";
    document.getElementById("val_description").value = exp.description || "";
    document.getElementById("val_expense_type").value = exp.project_id ? "costo_obra" : "gasto_sede";

    // Foto
    const imgEl = document.getElementById("val_receipt_image");
    const linkEl = document.getElementById("val_receipt_link");
    if (imgEl && exp.receipt_image_path) {
        imgEl.src = exp.receipt_image_path;
        linkEl.href = exp.receipt_image_path;
        linkEl.style.display = "inline-block";
    } else if (imgEl) {
        imgEl.src = "";
        linkEl.style.display = "none";
    }

    // Proyectos Select
    const projSelect = document.getElementById("val_project_id");
    if (projSelect) {
        projSelect.innerHTML = `<option value="">-- Seleccione Proyecto --</option>` + 
            allProjects.map(p => `<option value="${p.id}" ${p.id === exp.project_id ? 'selected' : ''}>[${p.code}] ${p.name}</option>`).join('');
    }

    // Categorías Select
    const catSelect = document.getElementById("val_category_id");
    if (catSelect) {
        catSelect.innerHTML = `<option value="">-- Seleccione Partida Dalor --</option>` + 
            allCategories.map(c => `<option value="${c.id}">[${c.code}] ${c.name}</option>`).join('');
    }

    onValExpenseTypeChanged();
    openModal("modalValidateExpense");
}

function onValExpenseTypeChanged() {
    const type = document.getElementById("val_expense_type").value;
    const projContainer = document.getElementById("val_proj_container");
    const partnerContainer = document.getElementById("val_partner_container");

    if (type === "costo_obra") {
        if (projContainer) projContainer.classList.remove("hidden");
        if (partnerContainer) partnerContainer.classList.add("hidden");
    } else if (type === "retiro_socio") {
        if (projContainer) projContainer.classList.add("hidden");
        if (partnerContainer) partnerContainer.classList.remove("hidden");
    } else {
        if (projContainer) projContainer.classList.add("hidden");
        if (partnerContainer) partnerContainer.classList.add("hidden");
    }
}

function calcValBs() {
    const usd = parseFloat(document.getElementById("val_amount_usd").value) || 0;
    const bsInput = document.getElementById("val_amount_bs");
    if (bsInput) bsInput.value = (usd * EXCHANGE_RATE).toFixed(2);
}

function calcValUsd() {
    const bs = parseFloat(document.getElementById("val_amount_bs").value) || 0;
    const usdInput = document.getElementById("val_amount_usd");
    if (usdInput && EXCHANGE_RATE > 0) usdInput.value = (bs / EXCHANGE_RATE).toFixed(2);
}

async function submitValidateExpense(event) {
    event.preventDefault();
    const expId = document.getElementById("val_expense_id").value;
    const usd = parseFloat(document.getElementById("val_amount_usd").value) || 0;

    if (usd <= 0) {
        alert("Por favor ingresa un monto válido en USD.");
        return;
    }

    const payload = {
        expense_type: document.getElementById("val_expense_type").value,
        category_id: parseInt(document.getElementById("val_category_id").value) || (allCategories[0]?.id || 1),
        project_id: document.getElementById("val_project_id").value ? parseInt(document.getElementById("val_project_id").value) : null,
        partner_name: document.getElementById("val_partner_name").value || null,
        supplier_vendor: document.getElementById("val_supplier_vendor").value,
        description: document.getElementById("val_description").value,
        amount_usd: usd,
        exchange_rate: EXCHANGE_RATE,
        payment_method: "caja_chica",
        has_fiscal_invoice: true
    };

    try {
        const res = await fetch(`${API_BASE}/expenses/inbox/${expId}/validate-impute`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            alert("¡Comprobante auditado, imputado y aprobado exitosamente!");
            closeModal("modalValidateExpense");
            loadPendingExpensesInbox();
            if (typeof loadComparisonDashboard === 'function') loadComparisonDashboard();
        } else {
            const err = await res.json();
            alert("Error: " + (err.detail || JSON.stringify(err)));
        }
    } catch (e) {
        alert("Error de conexión al aprobar comprobante.");
    }
}

async function rejectCurrentExpense() {
    const expId = document.getElementById("val_expense_id").value;
    rejectExpense(expId);
}

async function rejectExpense(expenseId) {
    const reason = prompt("Indica el motivo del rechazo del comprobante (ej: Foto ilegible, Monto no coincide, etc.):", "Comprobante rechazado por administración");
    if (!reason) return;

    try {
        const res = await fetch(`${API_BASE}/expenses/inbox/${expenseId}/reject?reason=${encodeURIComponent(reason)}`, {
            method: "PUT"
        });
        if (res.ok) {
            alert("Comprobante rechazado.");
            closeModal("modalValidateExpense");
            loadPendingExpensesInbox();
        } else {
            alert("Error al rechazar comprobante.");
        }
    } catch (e) {
        alert("Error de conexión con el servidor.");
    }
}

// ----------------------------------------------------
// 11. DASHBOARD COMPARATIVO
// ----------------------------------------------------
async function loadComparisonDashboard() {
    try {
        const res = await fetch(`${API_BASE}/reports/comparison-dashboard`);
        const data = await res.json();

        // KPIs Globales
        document.getElementById("dashboardKPIsContainer").innerHTML = `
            <div class="card" style="text-align: center; margin-bottom: 0;">
                <span style="font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 700;">Proyectos Activos</span>
                <p style="font-size: 20px; font-weight: 900; color: var(--dalor-navy);">${data.global_summary.active_projects_count}</p>
            </div>
            <div class="card" style="text-align: center; margin-bottom: 0;">
                <span style="font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 700;">Contratos Totales ($)</span>
                <p style="font-size: 20px; font-weight: 900; color: var(--dalor-navy);">$${data.global_summary.total_contracted_usd.toLocaleString()}</p>
            </div>
            <div class="card" style="text-align: center; margin-bottom: 0;">
                <span style="font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 700;">Gasto Real Ejecutado ($)</span>
                <p style="font-size: 20px; font-weight: 900; color: #e11d48;">$${data.global_summary.total_spent_usd.toLocaleString()}</p>
            </div>
            <div class="card" style="text-align: center; margin-bottom: 0;">
                <span style="font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 700;">Margen Neto Consolidado</span>
                <p style="font-size: 20px; font-weight: 900; color: #059669;">${data.global_summary.global_margin_percent}% ($${data.global_summary.net_margin_usd.toLocaleString()})</p>
            </div>
        `;

        // Tabla Comparativa
        document.getElementById("comparisonTableBody").innerHTML = data.projects_comparison.map(p => {
            let badgeBg = "#dcfce7";
            let badgeColor = "#166534";
            if (p.health_status === "ROJO_SOBRECOSTO") {
                badgeBg = "#fee2e2";
                badgeColor = "#991b1b";
            } else if (p.health_status === "AMARILLO_ALERTA") {
                badgeBg = "#fef3c7";
                badgeColor = "#92400e";
            }

            return `
            <tr>
                <td style="font-weight: 800; color: var(--dalor-blue);">${p.project_code}</td>
                <td style="font-weight: 700;">${p.project_name}</td>
                <td>${p.client_name}</td>
                <td style="font-weight: 800;">$${p.contract_amount_usd.toLocaleString()}</td>
                <td style="font-weight: 800; color: #e11d48;">$${p.actual_spent_usd.toLocaleString()}</td>
                <td style="font-weight: 800; color: #059669;">$${p.gross_margin_usd.toLocaleString()}</td>
                <td style="font-weight: 800; color: #059669;">${p.gross_margin_percent}%</td>
                <td style="font-weight: 800; color: var(--dalor-navy);">${p.cpi_index}</td>
                <td style="text-align: center;">
                    <span style="font-size: 10px; padding: 2px 8px; border-radius: 9999px; font-weight: 800; background: ${badgeBg}; color: ${badgeColor};">
                        ${p.health_status.replace('_', ' ')}
                    </span>
                </td>
            </tr>`;
        }).join('');

    } catch (e) {
        console.error("Error al cargar dashboard comparativo:", e);
    }
}

// ----------------------------------------------------
// 12. ÁRBOL JERÁRQUICO DE PARTIDAS
// ----------------------------------------------------
async function loadCategoriesTree() {
    const container = document.getElementById("categoriesTreeContainer");
    container.innerHTML = `<div style="grid-column: span 2; text-align: center; padding: 20px; color: #94a3b8;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando árbol de partidas...</div>`;

    try {
        const res = await fetch(`${API_BASE}/expenses/categories-tree`);
        if (!res.ok) throw new Error("Error en servidor");
        const tree = await res.json();

        container.innerHTML = tree.map(parent => `
            <div class="card" style="margin-bottom: 0;">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; margin-bottom: 8px;">
                    <div>
                        <span style="font-size: 11px; font-weight: 800; background: var(--dalor-navy); color: white; padding: 2px 6px; border-radius: 4px;">${parent.code}</span>
                        <h4 style="font-size: 14px; font-weight: 800; color: var(--dalor-navy); display: inline-block; margin-left: 6px;">${parent.name}</h4>
                    </div>
                    <span style="font-weight: 800; color: #e11d48; font-size: 14px;">$${parent.total_spent_usd.toFixed(2)}</span>
                </div>
                <div style="display: flex; flex-direction: column; gap: 4px;">
                    ${parent.subcategories.map(sub => `
                        <div style="display: flex; justify-content: space-between; font-size: 12px; color: #475569; padding: 3px 6px; background: #f8fafc; border-radius: 4px;">
                            <span><b>${sub.code}</b> ${sub.name}</span>
                            <span style="font-weight: 700; color: var(--dalor-navy);">$${sub.spent_usd.toFixed(2)}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
    } catch (e) {
        container.innerHTML = `<div style="grid-column: span 2; text-align: center; color: #e11d48;">Error al cargar árbol.</div>`;
    }
}

// ----------------------------------------------------
// UTILIDADES MODALES
// ----------------------------------------------------
function openModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.remove("hidden");
}

function closeModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.add("hidden");
}

// ==============================================================================
// 💰 13. MÓDULO FINANCIERO: SUBTABS (CxC, CxP, TESORERÍA)
// ==============================================================================
function openFinancialSubtab(subtabName) {
    switchView('financial', 'finanzas');
    switchFinancialSubtab(subtabName);
}

function switchFinancialSubtab(subtabName) {
    const subtabs = ['cxc', 'cxp', 'summary'];
    subtabs.forEach(tab => {
        const pane = document.getElementById(`subtab-fin-${tab}`);
        const btn = document.getElementById(`tabbtn-fin-${tab}`);
        if (pane) pane.classList.add('hidden');
        if (btn) btn.classList.remove('active');
    });

    const activePane = document.getElementById(`subtab-fin-${subtabName}`);
    const activeBtn = document.getElementById(`tabbtn-fin-${subtabName}`);
    if (activePane) activePane.classList.remove('hidden');
    if (activeBtn) activeBtn.classList.add('active');

    if (subtabName === 'cxc') loadReceivablesList();
    if (subtabName === 'cxp') loadPayablesList();
    if (subtabName === 'summary') loadTreasurySummary();
}

// ----------------------------------------------------
// CUENTAS POR COBRAR (CxC)
// ----------------------------------------------------
async function loadReceivablesList() {
    const tbody = document.getElementById("cxcTableBody");
    tbody.innerHTML = `<tr><td colspan="11" style="text-align: center; color: #94a3b8; padding: 16px;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando cuentas por cobrar...</td></tr>`;

    try {
        const res = await fetch(`${API_BASE}/financial/cxc`);
        if (!res.ok) throw new Error("Error en servidor");
        const list = await res.json();

        if (list.length === 0) {
            tbody.innerHTML = `<tr><td colspan="11" style="text-align: center; color: #94a3b8; padding: 16px;">No hay cuentas por cobrar registradas.</td></tr>`;
            return;
        }

        tbody.innerHTML = list.map(r => {
            let badgeBg = '#fef3c7', badgeColor = '#92400e', statusLabel = 'Pendiente';
            if (r.status === 'cobrado') { badgeBg = '#d1fae5'; badgeColor = '#065f46'; statusLabel = 'Cobrado Total'; }
            if (r.status === 'parcial') { badgeBg = '#e0f2fe'; badgeColor = '#0369a1'; statusLabel = 'Abono Parcial'; }
            if (r.status === 'vencido') { badgeBg = '#fee2e2'; badgeColor = '#991b1b'; statusLabel = '⚠️ Vencida'; }

            return `
            <tr>
                <td style="font-weight: 800; color: var(--dalor-navy);">${r.invoice_number}</td>
                <td style="font-weight: 700;">${r.client_name}</td>
                <td><span style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 11px;">${r.project_code}</span></td>
                <td>${r.description}</td>
                <td style="font-size: 11px; color: #64748b;">${r.issue_date}</td>
                <td style="font-size: 11px; font-weight: 700; color: ${r.status === 'vencido' ? '#e11d48' : '#334155'};">${r.due_date}</td>
                <td style="font-weight: 800; color: #059669;">$${r.amount_usd.toLocaleString()}</td>
                <td style="font-weight: 700; color: #0284c7;">$${r.paid_amount_usd.toLocaleString()}</td>
                <td style="font-weight: 800; color: ${r.balance_usd > 0 ? '#e11d48' : '#059669'}; font-size: 13px;">$${r.balance_usd.toLocaleString()}</td>
                <td>
                    <span style="font-size: 10px; padding: 3px 8px; border-radius: 9999px; font-weight: 800; background: ${badgeBg}; color: ${badgeColor};">
                        ${statusLabel}
                    </span>
                </td>
                <td style="text-align: center;">
                    ${r.balance_usd > 0 ? `
                        <button onclick="openRecordPaymentModal('cobro_cxc', ${r.id}, ${r.balance_usd})" class="btn-primary" style="font-size: 11px; padding: 4px 10px; background: #059669;">
                            <i class="fa-solid fa-hand-holding-dollar"></i> Cobrar
                        </button>
                    ` : `<span style="color: #059669; font-weight: 800; font-size: 11px;"><i class="fa-solid fa-check-double"></i> Al Día</span>`}
                </td>
            </tr>`;
        }).join('');
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="11" style="text-align: center; color: #e11d48; padding: 16px;">Error al cargar cuentas por cobrar.</td></tr>`;
    }
}

function openNewReceivableModal() {
    populateSelect("cxc_client_id", allClients, c => `<option value="${c.id}">${c.name}</option>`);
    populateSelect("cxc_project_id", [{id: '', code: 'Sin Obra / General'}, ...allProjects], p => `<option value="${p.id || ''}">${p.code} - ${p.name || ''}</option>`);
    
    // Set default due date to 15 days ahead
    const d = new Date();
    d.setDate(d.getDate() + 15);
    document.getElementById("cxc_due_date").value = d.toISOString().split('T')[0];
    
    openModal("modalReceivable");
}

async function submitCreateReceivable(e) {
    e.preventDefault();
    const payload = {
        invoice_number: document.getElementById("cxc_invoice_number").value.trim(),
        client_id: parseInt(document.getElementById("cxc_client_id").value),
        project_id: document.getElementById("cxc_project_id").value ? parseInt(document.getElementById("cxc_project_id").value) : null,
        description: document.getElementById("cxc_description").value.trim(),
        due_date: new Date(document.getElementById("cxc_due_date").value).toISOString(),
        amount_usd: parseFloat(document.getElementById("cxc_amount_usd").value),
        tax_retained_usd: parseFloat(document.getElementById("cxc_tax_retained").value) || 0.0,
        exchange_rate: EXCHANGE_RATE
    };

    try {
        const res = await fetch(`${API_BASE}/financial/cxc`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error("Error al emitir factura");
        closeModal("modalReceivable");
        document.getElementById("receivableForm").reset();
        loadReceivablesList();
        alert("✅ Factura / Valuación por cobrar registrada exitosamente.");
    } catch (err) {
        alert("Error: " + err.message);
    }
}

// ----------------------------------------------------
// CUENTAS POR PAGAR (CxP)
// ----------------------------------------------------
async function loadPayablesList() {
    const tbody = document.getElementById("cxpTableBody");
    tbody.innerHTML = `<tr><td colspan="11" style="text-align: center; color: #94a3b8; padding: 16px;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando cuentas por pagar...</td></tr>`;

    try {
        const res = await fetch(`${API_BASE}/financial/cxp`);
        if (!res.ok) throw new Error("Error en servidor");
        const list = await res.json();

        if (list.length === 0) {
            tbody.innerHTML = `<tr><td colspan="11" style="text-align: center; color: #94a3b8; padding: 16px;">No hay cuentas por pagar a proveedores.</td></tr>`;
            return;
        }

        tbody.innerHTML = list.map(p => {
            let badgeBg = '#fef3c7', badgeColor = '#92400e', statusLabel = 'Pendiente';
            if (p.status === 'pagado') { badgeBg = '#d1fae5'; badgeColor = '#065f46'; statusLabel = 'Pagado Total'; }
            if (p.status === 'parcial') { badgeBg = '#e0f2fe'; badgeColor = '#0369a1'; statusLabel = 'Pago Parcial'; }
            if (p.status === 'vencido') { badgeBg = '#fee2e2'; badgeColor = '#991b1b'; statusLabel = '⚠️ Vencida'; }

            return `
            <tr>
                <td style="font-weight: 800; color: var(--dalor-navy);">${p.invoice_number}</td>
                <td style="font-weight: 700;">${p.supplier_name}</td>
                <td><span style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 11px;">${p.project_code}</span></td>
                <td>${p.description}</td>
                <td style="font-size: 11px; color: #64748b;">${p.issue_date}</td>
                <td style="font-size: 11px; font-weight: 700; color: ${p.status === 'vencido' ? '#e11d48' : '#334155'};">${p.due_date}</td>
                <td style="font-weight: 800; color: #e11d48;">$${p.amount_usd.toLocaleString()}</td>
                <td style="font-weight: 700; color: #059669;">$${p.paid_amount_usd.toLocaleString()}</td>
                <td style="font-weight: 800; color: ${p.balance_usd > 0 ? '#e11d48' : '#059669'}; font-size: 13px;">$${p.balance_usd.toLocaleString()}</td>
                <td>
                    <span style="font-size: 10px; padding: 3px 8px; border-radius: 9999px; font-weight: 800; background: ${badgeBg}; color: ${badgeColor};">
                        ${statusLabel}
                    </span>
                </td>
                <td style="text-align: center;">
                    ${p.balance_usd > 0 ? `
                        <button onclick="openRecordPaymentModal('pago_cxp', ${p.id}, ${p.balance_usd})" class="btn-primary" style="font-size: 11px; padding: 4px 10px; background: #e11d48;">
                            <i class="fa-solid fa-money-bill-wave"></i> Pagar
                        </button>
                    ` : `<span style="color: #059669; font-weight: 800; font-size: 11px;"><i class="fa-solid fa-check-double"></i> Solventado</span>`}
                </td>
            </tr>`;
        }).join('');
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="11" style="text-align: center; color: #e11d48; padding: 16px;">Error al cargar cuentas por pagar.</td></tr>`;
    }
}

function openNewPayableModal() {
    populateSelect("cxp_project_id", [{id: '', code: 'Sede Central / Gastos Generales'}, ...allProjects], p => `<option value="${p.id || ''}">${p.code} - ${p.name || ''}</option>`);
    
    const d = new Date();
    d.setDate(d.getDate() + 15);
    document.getElementById("cxp_due_date").value = d.toISOString().split('T')[0];
    
    openModal("modalPayable");
}

async function submitCreatePayable(e) {
    e.preventDefault();
    const payload = {
        invoice_number: document.getElementById("cxp_invoice_number").value.trim(),
        supplier_name: document.getElementById("cxp_supplier_name").value.trim(),
        project_id: document.getElementById("cxp_project_id").value ? parseInt(document.getElementById("cxp_project_id").value) : null,
        description: document.getElementById("cxp_description").value.trim(),
        due_date: new Date(document.getElementById("cxp_due_date").value).toISOString(),
        amount_usd: parseFloat(document.getElementById("cxp_amount_usd").value),
        exchange_rate: EXCHANGE_RATE
    };

    try {
        const res = await fetch(`${API_BASE}/financial/cxp`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error("Error al registrar deuda");
        closeModal("modalPayable");
        document.getElementById("payableForm").reset();
        loadPayablesList();
        alert("✅ Cuenta por pagar registrada exitosamente.");
    } catch (err) {
        alert("Error: " + err.message);
    }
}

// ----------------------------------------------------
// REGISTRO DE COBRO O PAGO
// ----------------------------------------------------
function openRecordPaymentModal(type, targetId, currentBalance) {
    document.getElementById("fin_trans_type").value = type;
    document.getElementById("fin_trans_target_id").value = targetId;
    document.getElementById("fin_trans_current_balance").innerText = `$${currentBalance.toLocaleString()}`;
    document.getElementById("fin_trans_amount_usd").value = currentBalance;
    document.getElementById("fin_trans_amount_usd").max = currentBalance;

    const titleEl = document.getElementById("finTransModalTitle");
    const btnEl = document.getElementById("btnConfirmFinTrans");

    if (type === 'cobro_cxc') {
        titleEl.innerHTML = `<i class="fa-solid fa-hand-holding-dollar" style="color: #059669;"></i> Registrar Cobro de Cliente (CxC)`;
        btnEl.style.background = "#059669";
        btnEl.innerText = "Confirmar Cobro";
    } else {
        titleEl.innerHTML = `<i class="fa-solid fa-money-bill-wave" style="color: #e11d48;"></i> Registrar Pago a Proveedor (CxP)`;
        btnEl.style.background = "#e11d48";
        btnEl.innerText = "Confirmar Pago a Proveedor";
    }

    openModal("modalFinancialTransaction");
}

async function submitFinancialPayment(e) {
    e.preventDefault();
    const type = document.getElementById("fin_trans_type").value;
    const targetId = document.getElementById("fin_trans_target_id").value;
    const amountUsd = parseFloat(document.getElementById("fin_trans_amount_usd").value);

    const payload = {
        amount_usd: amountUsd,
        exchange_rate: EXCHANGE_RATE,
        payment_method: document.getElementById("fin_trans_method").value,
        reference_number: document.getElementById("fin_trans_ref").value.trim(),
        notes: document.getElementById("fin_trans_notes").value.trim()
    };

    const endpoint = type === 'cobro_cxc' 
        ? `${API_BASE}/financial/cxc/${targetId}/payment`
        : `${API_BASE}/financial/cxp/${targetId}/payment`;

    try {
        const res = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error("Error al registrar transacción");
        const data = await res.json();
        closeModal("modalFinancialTransaction");
        document.getElementById("financialTransactionForm").reset();

        if (type === 'cobro_cxc') loadReceivablesList();
        else loadPayablesList();

        alert(`✅ ${data.message}`);
    } catch (err) {
        alert("Error: " + err.message);
    }
}

// ----------------------------------------------------
// RESUMEN DE TESORERÍA
// ----------------------------------------------------
async function loadTreasurySummary() {
    const kpisContainer = document.getElementById("treasuryKPIsContainer");
    const cashflowDetails = document.getElementById("treasuryCashflowDetails");
    const creditDetails = document.getElementById("treasuryCreditDetails");

    try {
        const res = await fetch(`${API_BASE}/financial/summary`);
        if (!res.ok) throw new Error("Error en servidor");
        const data = await res.json();
        const k = data.kpis;

        kpisContainer.innerHTML = `
            <div class="card" style="margin-bottom: 0; text-align: center; border-left: 4px solid #059669;">
                <span style="font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase;">Cobros Recibidos</span>
                <p style="font-size: 18px; font-weight: 900; color: #059669; margin-top: 4px;">$${k.total_collected_cxc_usd.toLocaleString()}</p>
                <span style="font-size: 10px; color: #10b981;">Total ingresado</span>
            </div>
            <div class="card" style="margin-bottom: 0; text-align: center; border-left: 4px solid #e11d48;">
                <span style="font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase;">Pagos a Proveedores</span>
                <p style="font-size: 18px; font-weight: 900; color: #e11d48; margin-top: 4px;">$${k.total_paid_cxp_usd.toLocaleString()}</p>
                <span style="font-size: 10px; color: #f43f5e;">Total cancelado</span>
            </div>
            <div class="card" style="margin-bottom: 0; text-align: center; border-left: 4px solid #0284c7;">
                <span style="font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase;">Cartera por Cobrar (CxC)</span>
                <p style="font-size: 18px; font-weight: 900; color: #0284c7; margin-top: 4px;">$${k.pending_cxc_usd.toLocaleString()}</p>
                <span style="font-size: 10px; color: #38bdf8;">Dinero en la calle</span>
            </div>
            <div class="card" style="margin-bottom: 0; text-align: center; border-left: 4px solid #f59e0b;">
                <span style="font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase;">Deuda a Proveedores (CxP)</span>
                <p style="font-size: 18px; font-weight: 900; color: #f59e0b; margin-top: 4px;">$${k.pending_cxp_usd.toLocaleString()}</p>
                <span style="font-size: 10px; color: #fbbf24;">Compromisos pendientes</span>
            </div>
        `;

        cashflowDetails.innerHTML = `
            <div style="display: flex; justify-content: space-between; padding: 6px 10px; background: #f8fafc; border-radius: 6px; font-size: 12px;">
                <span>(+) Cobranzas Líquidas de Clientes:</span>
                <b style="color: #059669;">+$${k.total_collected_cxc_usd.toLocaleString()}</b>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 6px 10px; background: #f8fafc; border-radius: 6px; font-size: 12px;">
                <span>(-) Pagos a Proveedores / CxP:</span>
                <b style="color: #e11d48;">-$${k.total_paid_cxp_usd.toLocaleString()}</b>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 6px 10px; background: #f8fafc; border-radius: 6px; font-size: 12px;">
                <span>(-) Gastos Operativos Directos / Caja:</span>
                <b style="color: #e11d48;">-$${k.total_direct_expenses_usd.toLocaleString()}</b>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 8px 10px; background: var(--dalor-navy); color: white; border-radius: 6px; font-size: 13px; font-weight: 800; margin-top: 4px;">
                <span>(=) Flujo Neto Operativo de Caja:</span>
                <span style="color: ${k.net_operating_cash_usd >= 0 ? '#34d399' : '#f87171'};">$${k.net_operating_cash_usd.toLocaleString()}</span>
            </div>
        `;

        const netCredit = k.pending_cxc_usd - k.pending_cxp_usd;
        creditDetails.innerHTML = `
            <div style="display: flex; justify-content: space-between; padding: 6px 10px; background: #f8fafc; border-radius: 6px; font-size: 12px;">
                <span>Cuentas por Cobrar Pendientes (CxC):</span>
                <b style="color: #0284c7;">$${k.pending_cxc_usd.toLocaleString()}</b>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 6px 10px; background: #f8fafc; border-radius: 6px; font-size: 12px;">
                <span>Cuentas por Pagar Pendientes (CxP):</span>
                <b style="color: #e11d48;">$${k.pending_cxp_usd.toLocaleString()}</b>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 8px 10px; background: #0f172a; color: white; border-radius: 6px; font-size: 13px; font-weight: 800; margin-top: 4px;">
                <span>Posición Neta de Crédito (CxC - CxP):</span>
                <span style="color: ${netCredit >= 0 ? '#38bdf8' : '#f87171'};">$${netCredit.toLocaleString()}</span>
            </div>
        `;

    } catch (e) {
        console.error("Error al cargar tesorería:", e);
    }
}


// ==============================================================================
// 🔐 14. AUTENTICACIÓN, ROLES & CAPAS DE USO (TIPO PROFIT PLUS)
// ==============================================================================
async function checkAuthStatus() {
    const savedUser = localStorage.getItem('dalor_user');
    const savedToken = localStorage.getItem('dalor_token');
    
    if (savedUser && savedToken) {
        try {
            currentUser = JSON.parse(savedUser);
            authToken = savedToken;
            renderUserBadge();
            applyPermissionMap(currentUser);
            return true;
        } catch (e) {
            console.error('Error parsing stored user:', e);
            localStorage.removeItem('dalor_user');
            localStorage.removeItem('dalor_token');
        }
    }
    
    currentUser = null;
    authToken = null;
    return false;
}

function renderUserBadge() {
    if (!currentUser) return;
    const nameEl = document.getElementById('userFullNameDisplay');
    const roleEl = document.getElementById('userRoleDisplay');
    const avatarEl = document.getElementById('userAvatar');

    if (nameEl) nameEl.textContent = currentUser.full_name || currentUser.username;
    if (roleEl) {
        const roleNames = {
            'director': '👑 Director General',
            'director_general': '👑 Director General',
            'admin': '👑 Director General',
            'administracion': '💼 Administración & Finanzas',
            'administrador_financiero': '💼 Administración & Finanzas',
            'admin_finanzas': '💼 Administración & Finanzas',
            'ingeniero': '👷 Ing. Residente de Obra',
            'ingeniero_obra': '👷 Ing. Residente de Obra',
            'campo': '📱 Supervisor de Campo',
            'supervisor_campo': '📱 Supervisor de Campo'
        };
        roleEl.textContent = roleNames[currentUser.role_name] || currentUser.role_name;
    }
    if (avatarEl) {
        avatarEl.textContent = (currentUser.full_name || currentUser.username).charAt(0).toUpperCase();
    }
}

function applyPermissionMap(user) {
    if (!user) return;
    const role = (user.role_name || '').toLowerCase();
    const p = user.permissions || {};
    const isDirectorOrAdmin = role.includes('director') || role.includes('admin') || user.is_superuser || user.username === 'director' || user.username === 'admin';

    // Dropdown Comercial
    const dCom = document.getElementById('dropdown-comercial');
    if (dCom) {
        const canViewCom = isDirectorOrAdmin || p.comercial_view || p.comercial_edit || p.comercial || p.project_costing || role.includes('ingeniero');
        dCom.style.display = canViewCom ? 'inline-block' : 'none';
    }

    // Dropdown Proyectos
    const dProj = document.getElementById('dropdown-proyectos');
    if (dProj) {
        const canViewProj = isDirectorOrAdmin || p.proyectos_view || p.proyectos_edit || p.project_costing || role.includes('ingeniero') || role.includes('supervisor') || role.includes('campo');
        dProj.style.display = canViewProj ? 'inline-block' : 'none';
    }

    // Dropdown Finanzas
    const dFin = document.getElementById('dropdown-finanzas');
    if (dFin) {
        const canViewFin = isDirectorOrAdmin || p.finanzas_view || p.finanzas_edit || p.financials;
        dFin.style.display = canViewFin ? 'inline-block' : 'none';
    }

    // Dropdown Recursos
    const dRec = document.getElementById('dropdown-recursos');
    if (dRec) {
        const canViewRec = isDirectorOrAdmin || p.recursos_view || p.recursos_edit || p.resources || role.includes('ingeniero') || role.includes('supervisor') || role.includes('campo');
        dRec.style.display = canViewRec ? 'inline-block' : 'none';
    }

    // Dropdown Gastos (Accesible para todos los usuarios)
    const dGas = document.getElementById('dropdown-gastos');
    if (dGas) dGas.style.display = 'inline-block';

    // Dropdown Mantenimiento (Solo Administradores y Directores)
    const dMaint = document.getElementById('dropdown-mantenimiento');
    if (dMaint) {
        const canViewMaint = isDirectorOrAdmin || p.mantenimiento_admin || p.system_settings || p.maintenance;
        dMaint.style.display = canViewMaint ? 'inline-block' : 'none';
    }

    // Botón PowerBI Directivo
    const dGer = document.getElementById('dropdown-gerencia');
    if (dGer) {
        const canViewBI = isDirectorOrAdmin || p.executive_dashboard;
        dGer.style.display = canViewBI ? 'inline-block' : 'none';
    }
}

async function loginDirectlyAs(username, password) {
    const uIn = document.getElementById('login_username');
    const pIn = document.getElementById('login_password');
    if (uIn) uIn.value = username;
    if (pIn) pIn.value = password;

    const errEl = document.getElementById('loginErrorMessage');
    if (errEl) errEl.classList.add('hidden');

    try {
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await res.json();
        if (!res.ok) {
            if (errEl) {
                errEl.textContent = data.detail || 'Error de credenciales';
                errEl.classList.remove('hidden');
            }
            return;
        }

        currentUser = data.user;
        authToken = data.access_token;
        localStorage.setItem('dalor_user', JSON.stringify(currentUser));
        localStorage.setItem('dalor_token', authToken);

        renderUserBadge();
        applyPermissionMap(currentUser);
        
        const modal = document.getElementById('modalLogin');
        if (modal) {
            modal.classList.add('hidden');
            modal.style.display = 'none';
        }

        redirectUserByRole(currentUser);

    } catch (e) {
        if (errEl) {
            errEl.textContent = 'Error de conexión: ' + e.message;
            errEl.classList.remove('hidden');
        }
    }
}

function fillQuickLogin(username, password) {
    loginDirectlyAs(username, password);
}

function fillAndSubmitQuickLogin(username, password) {
    loginDirectlyAs(username, password);
}

function redirectUserByRole(user) {
    if (!user) return;
    const role = (user.role_name || user.username || '').toLowerCase();
    
    if (role.includes('supervisor') || role.includes('campo')) {
        switchView('pwa', 'gastos');
    } else if (role.includes('admin') || role.includes('finanzas') || role.includes('administrador')) {
        switchView('financial', 'finanzas');
    } else if (role.includes('ingeniero') || role.includes('obra')) {
        switchView('projects', 'proyectos');
    } else {
        switchView('executive', 'gerencia');
    }
}

async function submitLogin(event) {
    if (event && event.preventDefault) event.preventDefault();
    const username = document.getElementById('login_username').value.trim();
    const password = document.getElementById('login_password').value;
    await loginDirectlyAs(username, password);
}

function handleLogout() {
    sessionStorage.clear();
    localStorage.removeItem('dalor_user');
    localStorage.removeItem('dalor_token');
    currentUser = null;
    authToken = null;

    document.body.classList.remove('authenticated');
    const loginScreen = document.getElementById('app-login-screen');
    const authShell = document.getElementById('app-authenticated-shell');
    const nav = document.querySelector('.mobile-bottom-nav');

    if (loginScreen) loginScreen.style.display = 'flex';
    if (authShell) authShell.style.display = 'none';
    if (nav) nav.style.display = 'none';

    const uIn = document.getElementById('portal_username');
    const pIn = document.getElementById('portal_password');
    if (uIn) uIn.value = '';
    if (pIn) pIn.value = '';
    const errBox = document.getElementById('loginErrorMessage');
    if (errBox) errBox.style.display = 'none';

    showToast('Sesión finalizada. Inicia sesión con tus credenciales.', 'info');
}

// ==============================================================================
// 🛠️ 15. MÓDULO DE MANTENIMIENTO, USUARIOS & AUDITORÍA (TIPO PROFIT PLUS)
// ==============================================================================
let allSystemUsers = [];

function openMaintenanceSubtab(subtab) {
    switchView('maintenance', 'mantenimiento');
    switchMaintenanceSubtab(subtab);
}

function switchMaintenanceSubtab(subtab) {
    ['users', 'audit'].forEach(t => {
        const pane = document.getElementById(`subtab-maint-${t}`);
        const btn = document.getElementById(`tabbtn-maint-${t}`);
        if (pane) pane.classList.add('hidden');
        if (btn) btn.classList.remove('active');
    });

    const activePane = document.getElementById(`subtab-maint-${subtab}`);
    const activeBtn = document.getElementById(`tabbtn-maint-${subtab}`);
    if (activePane) activePane.classList.remove('hidden');
    if (activeBtn) activeBtn.classList.add('active');

    if (subtab === 'users') loadMaintenanceUsersList();
    if (subtab === 'audit') loadMaintenanceAuditLogs();
}

async function loadMaintenanceUsersList() {
    const tbody = document.getElementById('maintenanceUsersTableBody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #94a3b8; padding: 16px;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando usuarios...</td></tr>`;

    try {
        const res = await fetch(`${API_BASE}/maintenance/users`);
        allSystemUsers = await res.json();

        if (allSystemUsers.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #94a3b8; padding: 16px;">No hay usuarios registrados.</td></tr>`;
            return;
        }

        const roleBadges = {
            'director': '<span style="background: #ede9fe; color: #5b21b6; padding: 2px 6px; border-radius: 4px; font-weight: 800; font-size: 11px;">👑 Director General</span>',
            'admin_finanzas': '<span style="background: #d1fae5; color: #065f46; padding: 2px 6px; border-radius: 4px; font-weight: 800; font-size: 11px;">💼 Administración & Finanzas</span>',
            'ingeniero_obra': '<span style="background: #e0f2fe; color: #0369a1; padding: 2px 6px; border-radius: 4px; font-weight: 800; font-size: 11px;">👷 Ingeniero Residente</span>',
            'supervisor_campo': '<span style="background: #fef3c7; color: #92400e; padding: 2px 6px; border-radius: 4px; font-weight: 800; font-size: 11px;">📱 Supervisor Campo</span>'
        };

        tbody.innerHTML = allSystemUsers.map(u => `
            <tr>
                <td style="font-weight: 800; color: var(--dalor-navy);">${u.username}</td>
                <td style="font-weight: 700;">${u.full_name}</td>
                <td style="color: #64748b;">${u.email || '-'}</td>
                <td>${roleBadges[u.role_name] || u.role_name}</td>
                <td style="color: #64748b; font-size: 11px;">${u.last_login}</td>
                <td>
                    <span style="padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 800; background: ${u.is_active ? '#dcfce7' : '#fee2e2'}; color: ${u.is_active ? '#166534' : '#991b1b'};">
                        ${u.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                </td>
                <td style="text-align: center; white-space: nowrap;">
                    <button onclick="openUserPermissionsModal(${u.id})" class="btn-secondary" style="padding: 3px 7px; font-size: 11px; margin-right: 4px;" title="Modificar Mapa de Permisos">
                        <i class="fa-solid fa-key" style="color: #0284c7;"></i> Permisos
                    </button>
                    <button onclick="toggleUserStatus(${u.id})" class="btn-secondary" style="padding: 3px 7px; font-size: 11px; color: ${u.is_active ? '#e11d48' : '#059669'};" title="Activar/Desactivar Cuenta">
                        <i class="fa-solid fa-power-off"></i>
                    </button>
                </td>
            </tr>
        `).join('');

    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #e11d48; padding: 16px;">Error al cargar directorio de usuarios.</td></tr>`;
    }
}

function openNewUserModal() {
    document.getElementById('newUserForm').reset();
    document.getElementById('modalNewUser').classList.remove('hidden');
}

function onUserRoleTemplateChanged() {
    // Helper if needed
}

async function submitCreateUser(event) {
    event.preventDefault();
    const username = document.getElementById('maint_username').value.trim();
    const full_name = document.getElementById('maint_fullname').value.trim();
    const email = document.getElementById('maint_email').value.trim();
    const password = document.getElementById('maint_password').value;
    const role_name = document.getElementById('maint_role').value;

    const roleTemplates = {
        'director': {
            comercial_view: true, comercial_edit: true,
            proyectos_view: true, proyectos_edit: true,
            finanzas_view: true, finanzas_edit: true,
            recursos_view: true, recursos_edit: true,
            gastos_view: true, gastos_edit: true,
            executive_dashboard: true, mantenimiento_admin: true
        },
        'admin_finanzas': {
            comercial_view: true, comercial_edit: true,
            proyectos_view: true, proyectos_edit: false,
            finanzas_view: true, finanzas_edit: true,
            recursos_view: true, recursos_edit: false,
            gastos_view: true, gastos_edit: true,
            executive_dashboard: true, mantenimiento_admin: false
        },
        'ingeniero_obra': {
            comercial_view: true, comercial_edit: false,
            proyectos_view: true, proyectos_edit: true,
            finanzas_view: false, finanzas_edit: false,
            recursos_view: true, recursos_edit: true,
            gastos_view: true, gastos_edit: true,
            executive_dashboard: false, mantenimiento_admin: false
        },
        'supervisor_campo': {
            comercial_view: false, comercial_edit: false,
            proyectos_view: true, proyectos_edit: false,
            finanzas_view: false, finanzas_edit: false,
            recursos_view: true, recursos_edit: false,
            gastos_view: true, gastos_edit: true,
            executive_dashboard: false, mantenimiento_admin: false
        }
    };

    try {
        const res = await fetch(`${API_BASE}/maintenance/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username, full_name, email, password, role_name,
                permissions: roleTemplates[role_name] || {}
            })
        });

        const data = await res.json();
        if (!res.ok) {
            alert(data.detail || 'Error al crear usuario.');
            return;
        }

        alert(`¡Usuario '${username}' creado con éxito en el sistema!`);
        closeModal('modalNewUser');
        loadMaintenanceUsersList();
    } catch (e) {
        alert('Error de conexión al registrar usuario.');
    }
}

function openUserPermissionsModal(userId) {
    const user = allSystemUsers.find(u => u.id === userId);
    if (!user) return;

    document.getElementById('perm_target_user_id').value = user.id;
    document.getElementById('permModalUsername').textContent = user.username;
    document.getElementById('permModalFullName').textContent = user.full_name;

    const p = user.permissions || {};
    
    document.getElementById('perm_comercial_view').checked = !!p.comercial_view;
    document.getElementById('perm_comercial_edit').checked = !!p.comercial_edit;
    document.getElementById('perm_proyectos_view').checked = !!p.proyectos_view;
    document.getElementById('perm_proyectos_edit').checked = !!p.proyectos_edit;
    document.getElementById('perm_finanzas_view').checked = !!p.finanzas_view;
    document.getElementById('perm_finanzas_edit').checked = !!p.finanzas_edit;
    document.getElementById('perm_recursos_view').checked = !!p.recursos_view;
    document.getElementById('perm_recursos_edit').checked = !!p.recursos_edit;
    document.getElementById('perm_gastos_view').checked = !!p.gastos_view;
    document.getElementById('perm_gastos_edit').checked = !!p.gastos_edit;
    document.getElementById('perm_executive_dashboard').checked = !!p.executive_dashboard;
    document.getElementById('perm_mantenimiento_admin').checked = !!p.mantenimiento_admin;

    document.getElementById('modalUserPermissions').classList.remove('hidden');
}

async function submitSaveUserPermissions() {
    const userId = parseInt(document.getElementById('perm_target_user_id').value);
    const permissions = {
        comercial_view: document.getElementById('perm_comercial_view').checked,
        comercial_edit: document.getElementById('perm_comercial_edit').checked,
        proyectos_view: document.getElementById('perm_proyectos_view').checked,
        proyectos_edit: document.getElementById('perm_proyectos_edit').checked,
        finanzas_view: document.getElementById('perm_finanzas_view').checked,
        finanzas_edit: document.getElementById('perm_finanzas_edit').checked,
        recursos_view: document.getElementById('perm_recursos_view').checked,
        recursos_edit: document.getElementById('perm_recursos_edit').checked,
        gastos_view: document.getElementById('perm_gastos_view').checked,
        gastos_edit: document.getElementById('perm_gastos_edit').checked,
        executive_dashboard: document.getElementById('perm_executive_dashboard').checked,
        mantenimiento_admin: document.getElementById('perm_mantenimiento_admin').checked
    };

    try {
        const res = await fetch(`${API_BASE}/maintenance/users/${userId}/permissions`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ permissions })
        });

        const data = await res.json();
        if (!res.ok) {
            alert(data.detail || 'Error al actualizar permisos.');
            return;
        }

        alert('Mapa de permisos guardado con éxito.');
        closeModal('modalUserPermissions');
        loadMaintenanceUsersList();

        // Si es el usuario actual, actualizar permisos en vivo
        if (currentUser && currentUser.id === userId) {
            currentUser.permissions = permissions;
            localStorage.setItem('dalor_user', JSON.stringify(currentUser));
            applyPermissionMap(currentUser);
        }

    } catch (e) {
        alert('Error de conexión al guardar permisos.');
    }
}

async function toggleUserStatus(userId) {
    if (!confirm('¿Deseas cambiar el estado de acceso de este usuario?')) return;
    try {
        const res = await fetch(`${API_BASE}/maintenance/users/${userId}/toggle-status`, { method: 'PUT' });
        const data = await res.json();
        if (!res.ok) {
            alert(data.detail || 'Error al cambiar estado.');
            return;
        }
        loadMaintenanceUsersList();
    } catch (e) {
        alert('Error al procesar solicitud.');
    }
}

async function loadMaintenanceAuditLogs() {
    const tbody = document.getElementById('maintenanceAuditTableBody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #94a3b8; padding: 16px;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando bitácora de eventos...</td></tr>`;

    try {
        const res = await fetch(`${API_BASE}/maintenance/audit-logs`);
        const logs = await res.json();

        if (logs.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #94a3b8; padding: 16px;">No hay eventos registrados en la bitácora.</td></tr>`;
            return;
        }

        tbody.innerHTML = logs.map(l => `
            <tr>
                <td style="font-weight: 700; color: #64748b; font-size: 11px;">${l.timestamp}</td>
                <td style="font-weight: 800; color: var(--dalor-navy);">${l.username}</td>
                <td><span style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 11px; text-transform: uppercase;">${l.module}</span></td>
                <td style="font-weight: 700; color: #0284c7;">${l.action}</td>
                <td style="color: #334155; font-size: 11px;">${l.details || '-'}</td>
            </tr>
        `).join('');
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #e11d48; padding: 16px;">Error al cargar bitácora.</td></tr>`;
    }
}



// ==============================================================================
// ⚡ 17. CARGA RÁPIDA EN 3 TOQUES & CONTROL DE RETIROS DE SOCIOS
// ==============================================================================
function openQuickFlowModal() {
    const pSelect = document.getElementById('qf_project_id');
    if (pSelect && allProjects.length > 0) {
        pSelect.innerHTML = allProjects.map(p => `<option value="${p.id}">${p.code} - ${p.name.substring(0, 30)}</option>`).join('');
    }
    document.getElementById('quickFlowForm').reset();
    selectQuickType('obra');
    calcQuickBs();
    document.getElementById('modalQuickFlow').classList.remove('hidden');
}

function selectQuickType(type) {
    document.getElementById('qf_selected_type').value = type;
    
    // Reset cards styles
    ['obra', 'sede', 'socio'].forEach(t => {
        const card = document.getElementById(`card_type_${t}`);
        const details = document.getElementById(`qf_details_${t}`);
        if (card) {
            card.style.borderColor = '#cbd5e1';
            card.style.background = '#ffffff';
        }
        if (details) details.classList.add('hidden');
    });

    const activeCard = document.getElementById(`card_type_${type}`);
    const activeDetails = document.getElementById(`qf_details_${type}`);
    
    if (type === 'obra') {
        if (activeCard) { activeCard.style.borderColor = 'var(--dalor-blue)'; activeCard.style.background = '#f0f9ff'; }
    } else if (type === 'sede') {
        if (activeCard) { activeCard.style.borderColor = '#0d9488'; activeCard.style.background = '#f0fdfa'; }
    } else if (type === 'socio') {
        if (activeCard) { activeCard.style.borderColor = '#7c3aed'; activeCard.style.background = '#faf5ff'; }
    }

    if (activeDetails) activeDetails.classList.remove('hidden');
}

function calcQuickBs() {
    const usd = parseFloat(document.getElementById('qf_amount_usd').value) || 0;
    const bsInput = document.getElementById('qf_amount_bs');
    if (bsInput) {
        bsInput.value = (usd * EXCHANGE_RATE).toFixed(2);
    }
}

async function submitQuickFlow(event) {
    event.preventDefault();
    const amount_usd = parseFloat(document.getElementById('qf_amount_usd').value) || 0;
    const payment_method = document.getElementById('qf_payment_method').value;
    const vendor = document.getElementById('qf_vendor').value.trim() || 'General';
    const description = document.getElementById('qf_description').value.trim();
    const selected_type = document.getElementById('qf_selected_type').value;

    if (amount_usd <= 0) {
        alert('Por favor ingresa un monto mayor a cero.');
        return;
    }

    try {
        if (selected_type === 'socio') {
            // Registrar como Retiro de Socio
            const partner_name = document.getElementById('qf_partner_name').value;
            const concept = document.getElementById('qf_partner_concept').value.trim() || description;

            const res = await fetch(`${API_BASE}/financial/partners/withdrawals`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    partner_name,
                    concept,
                    amount_usd,
                    payment_method,
                    exchange_rate: EXCHANGE_RATE,
                    notes: `Registrado vía Carga Rápida. Proveedor/Destino: ${vendor}`
                })
            });

            if (!res.ok) throw new Error('Error al registrar retiro.');
            alert(`✅ Retiro de $${amount_usd.toLocaleString()} registrado con éxito para ${partner_name}.`);

        } else if (selected_type === 'sede') {
            // Registrar como Gasto Fijo de Sede
            const fixedCat = document.getElementById('qf_fixed_category').value;
            const category_id = (allCategories[0] && allCategories[0].id) || 1;

            const res = await fetch(`${API_BASE}/expenses/manual`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    category_id: category_id,
                    project_id: null,
                    amount_usd: amount_usd,
                    amount_bs: amount_usd * EXCHANGE_RATE,
                    exchange_rate: EXCHANGE_RATE,
                    payment_method: payment_method,
                    supplier_vendor: vendor,
                    description: `[SEDE / TALLER] ${description} (${fixedCat})`,
                    reported_by_id: (allPersonnel[0] && allPersonnel[0].id) || 1
                })
            });

            if (!res.ok) throw new Error('Error al registrar gasto de sede.');
            alert(`✅ Gasto Fijo de Sede de $${amount_usd.toLocaleString()} registrado con éxito.`);

        } else {
            // Registrar como Costo Directo de Obra
            const project_id = parseInt(document.getElementById('qf_project_id').value);
            const costCat = document.getElementById('qf_cost_category').value;
            const category_id = (allCategories[0] && allCategories[0].id) || 1;

            const res = await fetch(`${API_BASE}/expenses/manual`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    category_id: category_id,
                    project_id: project_id,
                    amount_usd: amount_usd,
                    amount_bs: amount_usd * EXCHANGE_RATE,
                    exchange_rate: EXCHANGE_RATE,
                    payment_method: payment_method,
                    supplier_vendor: vendor,
                    description: `[COSTO OBRA - ${costCat.toUpperCase()}] ${description}`,
                    reported_by_id: (allPersonnel[0] && allPersonnel[0].id) || 1
                })
            });

            if (!res.ok) throw new Error('Error al registrar costo de obra.');
            alert(`✅ Costo de Obra de $${amount_usd.toLocaleString()} imputado exitosamente al proyecto.`);
        }

        closeModal('modalQuickFlow');
        
        // Recargar vistas activas
        loadInitialMasterData();
        loadExecutiveDashboard();

    } catch (e) {
        alert('Error al procesar la carga rápida: ' + e.message);
    }
}

async function loadPartnersWithdrawalsList() {
    const tbody = document.getElementById('partnersWithdrawalsTableBody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #94a3b8; padding: 16px;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando cuenta corriente de socios...</td></tr>`;

    try {
        const res = await fetch(`${API_BASE}/financial/partners/withdrawals`);
        const list = await res.json();

        if (list.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #94a3b8; padding: 16px;">No hay retiros de socios registrados.</td></tr>`;
            return;
        }

        tbody.innerHTML = list.map(w => `
            <tr>
                <td style="font-weight: 700; color: #64748b; font-size: 11px;">${w.date}</td>
                <td style="font-weight: 800; color: #7c3aed;">${w.partner_name}</td>
                <td style="font-weight: 600;">${w.concept}</td>
                <td><span style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 11px; text-transform: uppercase;">${w.payment_method}</span></td>
                <td style="color: #64748b; font-size: 11px;">${w.reference_number || '-'}</td>
                <td style="font-weight: 900; color: #7c3aed; font-size: 13px;">$${w.amount_usd.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td style="color: #475569; font-weight: 700;">Bs. ${w.amount_bs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</td>
            </tr>
        `).join('');

    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #e11d48; padding: 16px;">Error al cargar cuenta corriente de socios.</td></tr>`;
    }
}

function openNewPartnerWithdrawalModal() {
    openQuickFlowModal();
    selectQuickType('socio');
}

// ==============================================================================
// 📊 16. DASHBOARD GERENCIAL BI CON LAS 4 RESPUESTAS CLARAS
// ==============================================================================
let biSummaryData = null;
let chartRadialCash = null;
let chartRadialOverhead = null;
let chartRadialMargin = null;
let chartRadialPartners = null;
let chartRankingExp = null;
let chartDonutCost = null;

async function loadExecutiveDashboard() {
    const alertsContainer = document.getElementById("executiveAlertsContainer");
    const pnlTbody = document.getElementById("executivePnlTableBody");

    if (pnlTbody) pnlTbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: #94a3b8; padding: 20px;"><i class="fa-solid fa-spinner fa-spin"></i> Consolidando las 4 métricas directivas...</td></tr>`;

    try {
        const res = await fetch(`${API_BASE}/financial/summary`);
        if (!res.ok) throw new Error("Error al obtener datos");
        biSummaryData = await res.json();
        const k = biSummaryData.kpis;

        // 1. Poblar Filtros Slicers
        populateBISlicers();

        // 2. Render Alertas Directivas
        if (alertsContainer) {
            if (biSummaryData.alerts && biSummaryData.alerts.length > 0) {
                alertsContainer.innerHTML = biSummaryData.alerts.map(a => `
                    <div style="background: ${a.level === 'danger' ? '#fef2f2' : '#fffbeb'}; border: 1px solid ${a.level === 'danger' ? '#fecdd3' : '#fde68a'}; border-left: 5px solid ${a.level === 'danger' ? '#e11d48' : '#f59e0b'}; padding: 8px 14px; border-radius: 8px; display: flex; align-items: center; justify-content: space-between;">
                        <div>
                            <strong style="color: ${a.level === 'danger' ? '#9f1239' : '#92400e'}; font-size: 12px;">${a.title}</strong>
                            <p style="font-size: 11px; color: #475569; margin-top: 1px;">${a.message}</p>
                        </div>
                        <button onclick="switchView('financial', 'finanzas')" class="btn-secondary" style="font-size: 10px; padding: 3px 6px;">
                            Ver Finanzas <i class="fa-solid fa-arrow-right"></i>
                        </button>
                    </div>
                `).join('');
            } else {
                alertsContainer.innerHTML = '';
            }
        }

        // 3. Render Las 4 Respuestas Claras Directivas
        // 1. Caja Libre Disponible
        document.getElementById('bi_kpi_cashflow_val').textContent = `$${k.net_operating_cash_usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        
        // 2. Gastos Fijos Cubiertos (Break-Even %)
        document.getElementById('bi_kpi_overhead_pct').textContent = `${k.fixed_overhead_covered_percent}%`;
        document.getElementById('bi_kpi_overhead_target').textContent = `$${k.monthly_fixed_budget_usd.toLocaleString()}/mes`;

        // 3. Ganancia Real de Obras
        document.getElementById('bi_kpi_profit_val').textContent = `$${k.net_accrual_profit_usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        document.getElementById('bi_kpi_margin_pct').textContent = `${k.net_margin_percent}%`;

        // 4. Retiros de Socios
        document.getElementById('bi_kpi_partners_val').textContent = `$${k.total_partner_withdrawals_usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

        // Sidebar
        document.getElementById('bi_side_cxc_val').textContent = `$${k.pending_cxc_usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        document.getElementById('bi_side_cxp_val').textContent = `$${k.pending_cxp_usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        document.getElementById('bi_side_alerts_count').textContent = biSummaryData.alerts ? biSummaryData.alerts.length : 0;

        // 4. Render 4 Arcos Radiales (% Progress)
        renderCleanRadialCharts(k);

        // 5. Render Gráficos Analíticos
        renderBIAnalyticsCharts(biSummaryData);

        // 6. Render Tabla P&L
        renderBIPnlTable(biSummaryData.projects_pnl);

    } catch (e) {
        if (pnlTbody) pnlTbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: #e11d48; padding: 20px;">Error al consolidar dashboard.</td></tr>`;
    }
}

function populateBISlicers() {
    const projSelect = document.getElementById('bi_slicer_project');
    const cliSelect = document.getElementById('bi_slicer_client');

    if (projSelect && allProjects.length > 0) {
        const cur = projSelect.value;
        projSelect.innerHTML = `<option value="all">Todas las Obras (${allProjects.length})</option>` +
            allProjects.map(p => `<option value="${p.id}">${p.code} - ${p.name.substring(0, 25)}</option>`).join('');
        if (cur) projSelect.value = cur;
    }

    if (cliSelect && allClients.length > 0) {
        const cur = cliSelect.value;
        cliSelect.innerHTML = `<option value="all">Todos los Clientes (${allClients.length})</option>` +
            allClients.map(c => `<option value="${c.id}">${c.name.substring(0, 25)}</option>`).join('');
        if (cur) cliSelect.value = cur;
    }
}

function renderCleanRadialCharts(k) {
    // 1. Radial Cash Flow
    const ctxCash = document.getElementById('radialChartCash');
    if (ctxCash) {
        if (chartRadialCash) chartRadialCash.destroy();
        chartRadialCash = new Chart(ctxCash, {
            type: 'doughnut',
            data: {
                datasets: [{
                    data: [85, 15],
                    backgroundColor: ['#059669', '#e2e8f0'],
                    borderWidth: 0
                }]
            },
            options: { cutout: '76%', responsive: false, plugins: { legend: { display: false }, tooltip: { enabled: false } } }
        });
    }

    // 2. Radial Overhead (Break-Even %)
    const pctOverhead = Math.max(0, Math.min(100, k.fixed_overhead_covered_percent));
    const ctxOh = document.getElementById('radialChartOverhead');
    if (ctxOh) {
        if (chartRadialOverhead) chartRadialOverhead.destroy();
        chartRadialOverhead = new Chart(ctxOh, {
            type: 'doughnut',
            data: {
                datasets: [{
                    data: [pctOverhead, 100 - pctOverhead],
                    backgroundColor: [pctOverhead >= 100 ? '#059669' : '#0284c7', '#e2e8f0'],
                    borderWidth: 0
                }]
            },
            options: { cutout: '76%', responsive: false, plugins: { legend: { display: false }, tooltip: { enabled: false } } }
        });
    }

    // 3. Radial Margin
    const pctMargin = Math.max(0, Math.min(100, Math.round(k.net_margin_percent)));
    const ctxMar = document.getElementById('radialChartMargin');
    if (ctxMar) {
        if (chartRadialMargin) chartRadialMargin.destroy();
        chartRadialMargin = new Chart(ctxMar, {
            type: 'doughnut',
            data: {
                datasets: [{
                    data: [pctMargin, 100 - pctMargin],
                    backgroundColor: ['#002B49', '#e2e8f0'],
                    borderWidth: 0
                }]
            },
            options: { cutout: '76%', responsive: false, plugins: { legend: { display: false }, tooltip: { enabled: false } } }
        });
    }

    // 4. Radial Partners
    const ctxPart = document.getElementById('radialChartPartners');
    if (ctxPart) {
        if (chartRadialPartners) chartRadialPartners.destroy();
        chartRadialPartners = new Chart(ctxPart, {
            type: 'doughnut',
            data: {
                datasets: [{
                    data: [70, 30],
                    backgroundColor: ['#7c3aed', '#e2e8f0'],
                    borderWidth: 0
                }]
            },
            options: { cutout: '76%', responsive: false, plugins: { legend: { display: false }, tooltip: { enabled: false } } }
        });
    }
}

function renderBIAnalyticsCharts(data) {
    const ctxRank = document.getElementById('chartRankingExpenses');
    if (ctxRank) {
        if (chartRankingExp) chartRankingExp.destroy();
        
        const labels = ['Materiales de Obra', 'Mano de Obra Cuadrilla', 'Combustible & Traslados', 'Equipos & Maquinaria', 'Nómina Fija Taller', 'Alquiler Galpón'];
        const values = [4800, 3200, 1850, 1200, 3200, 1100];

        chartRankingExp = new Chart(ctxRank, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Monto ($)',
                    data: values,
                    backgroundColor: '#0072B8',
                    borderRadius: 6,
                    barThickness: 13
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { display: false }, ticks: { font: { size: 9 } } },
                    y: { grid: { display: false }, ticks: { font: { size: 9, weight: 'bold' } } }
                }
            }
        });
    }

    const ctxDonut = document.getElementById('chartDonutCostDistribution');
    if (ctxDonut) {
        if (chartDonutCost) chartDonutCost.destroy();

        chartDonutCost = new Chart(ctxDonut, {
            type: 'doughnut',
            data: {
                labels: ['Costos Directos Obras (58%)', 'Gastos Fijos Sede (28%)', 'Retiros de Socios (14%)'],
                datasets: [{
                    data: [58, 28, 14],
                    backgroundColor: ['#0072B8', '#0d9488', '#7c3aed'],
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                cutout: '62%',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: { boxWidth: 10, font: { size: 10 } }
                    }
                }
            }
        });
    }
}

function renderBIPnlTable(pnlList) {
    const pnlTbody = document.getElementById("executivePnlTableBody");
    if (!pnlTbody) return;

    if (!pnlList || pnlList.length === 0) {
        pnlTbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: #94a3b8; padding: 20px;">No hay proyectos para el filtro seleccionado.</td></tr>`;
        return;
    }

    pnlTbody.innerHTML = pnlList.map(p => {
        const isProfitable = p.net_profit_usd >= 0;
        return `
        <tr>
            <td style="font-weight: 800; color: var(--dalor-navy);">${p.code}</td>
            <td style="font-weight: 700;">${p.name}</td>
            <td style="color: #475569;">${p.client_name || 'General'}</td>
            <td style="font-weight: 700;">$${p.contract_amount_usd.toLocaleString()}</td>
            <td style="font-weight: 700; color: #0284c7;">$${p.invoiced_cxc_usd.toLocaleString()}</td>
            <td style="font-weight: 700; color: #059669;">$${p.collected_cxc_usd.toLocaleString()}</td>
            <td style="font-weight: 800; color: #e11d48;">$${p.total_cost_usd.toLocaleString()}</td>
            <td style="font-weight: 900; color: ${isProfitable ? '#059669' : '#e11d48'}; font-size: 13px;">
                $${p.net_profit_usd.toLocaleString()}
            </td>
            <td style="font-weight: 800; color: ${isProfitable ? '#059669' : '#e11d48'};">
                ${p.net_margin_percent}%
            </td>
            <td style="font-weight: 800; color: var(--dalor-navy); text-align: center;">
                <span style="padding: 2px 6px; border-radius: 4px; background: ${p.cpi_efficiency >= 1.0 ? '#d1fae5' : '#fee2e2'}; color: ${p.cpi_efficiency >= 1.0 ? '#065f46' : '#991b1b'}; font-size: 11px;">
                    ${p.cpi_efficiency}
                </span>
            </td>
        </tr>`;
    }).join('');
}

function filterBIDashboard() {
    if (!biSummaryData || !biSummaryData.projects_pnl) return;
    const projVal = document.getElementById('bi_slicer_project').value;
    const cliVal = document.getElementById('bi_slicer_client').value;

    let filtered = biSummaryData.projects_pnl;

    if (projVal !== 'all') {
        filtered = filtered.filter(p => p.id == projVal);
    }
    if (cliVal !== 'all') {
        filtered = filtered.filter(p => p.client_id == cliVal);
    }

    renderBIPnlTable(filtered);
}


// ==============================================================================
// 💾 18. MÓDULO DE COPIAS DE SEGURIDAD & RESPALDOS AUTOMÁTICOS
// ==============================================================================
async function loadBackupsList() {
    const tbody = document.getElementById('backupsTableBody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #94a3b8; padding: 16px;"><i class="fa-solid fa-spinner fa-spin"></i> Consultando copias de seguridad...</td></tr>`;

    try {
        const res = await fetch(`${API_BASE}/maintenance/backups`);
        const list = await res.json();

        if (list.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #94a3b8; padding: 16px;">No hay respaldos generados aún. Haz clic en "Generar Respaldo Ahora".</td></tr>`;
            return;
        }

        tbody.innerHTML = list.map(b => `
            <tr>
                <td style="font-weight: 700; color: #64748b; font-size: 11px;">${b.created_at}</td>
                <td style="font-weight: 800; color: var(--dalor-navy); font-family: monospace;">${b.filename}</td>
                <td style="font-weight: 700; color: #0284c7;">${b.size_kb} KB</td>
                <td><span style="background: #d1fae5; color: #065f46; padding: 2px 8px; border-radius: 4px; font-weight: 800; font-size: 11px;">Disponible</span></td>
                <td style="text-align: right;">
                    <a href="${API_BASE}/maintenance/backups/download/${b.filename}" target="_blank" class="btn-secondary" style="padding: 4px 8px; font-size: 11px; text-decoration: none; margin-right: 4px;" title="Descargar copia">
                        <i class="fa-solid fa-download"></i> Descargar
                    </a>
                    <button onclick="restoreBackup('${b.filename}')" class="btn-secondary" style="padding: 4px 8px; font-size: 11px; color: #b45309;" title="Restaurar a esta versión">
                        <i class="fa-solid fa-rotate-left"></i> Restaurar
                    </button>
                </td>
            </tr>
        `).join('');

    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #e11d48; padding: 16px;">Error al cargar copias de seguridad.</td></tr>`;
    }
}

async function createNewBackup() {
    try {
        const res = await fetch(`${API_BASE}/maintenance/backups/create`, { method: 'POST' });
        const data = await res.json();
        if (data.success) {
            alert(`✅ ${data.message}`);
            loadBackupsList();
        } else {
            alert('Error al generar respaldo.');
        }
    } catch (e) {
        alert('Error de conexión al generar respaldo: ' + e.message);
    }
}

async function restoreBackup(filename) {
    if (!confirm(`⚠️ ¿Estás seguro de restaurar la base de datos al estado de '${filename}'?\n\nSe creará un respaldo automático preventivo antes de aplicar la restauración.`)) {
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/maintenance/backups/restore/${filename}`, { method: 'POST' });
        const data = await res.json();
        if (data.success) {
            alert(`✅ ${data.message}`);
            loadInitialMasterData();
            loadExecutiveDashboard();
            loadBackupsList();
        } else {
            alert('Error al restaurar respaldo.');
        }
    } catch (e) {
        alert('Error al restaurar respaldo: ' + e.message);
    }
}

// ==============================================================================
// 📦 5. MÓDULO DE INVENTARIO DE MATERIALES Y CONSUMIBLES (DALOR SIGO-P)
// ==============================================================================

async function loadMaterialsList() {
    const tbody = document.getElementById("materialsTableBody");
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 20px; color: #94a3b8;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando inventario de materiales...</td></tr>`;

    try {
        const res = await fetch(`${API_BASE}/materials/`);
        const data = await res.json();
        allMaterials = data.materials || (Array.isArray(data) ? data : []);

        const totalItemsEl = document.getElementById("matTotalItemsCount");
        const totalValEl = document.getElementById("matTotalValuationUsd");
        if (totalItemsEl) totalItemsEl.innerText = data.total_items !== undefined ? data.total_items : allMaterials.length;
        if (totalValEl) {
            const val = data.total_inventory_usd !== undefined ? data.total_inventory_usd : allMaterials.reduce((acc, m) => acc + (m.stock_quantity * m.unit_cost_usd || 0), 0);
            totalValEl.innerText = `$${val.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD`;
        }

        renderMaterialsTable(allMaterials);
        try {
            if (typeof populateSelectDropdowns === 'function') populateSelectDropdowns();
        } catch (errPop) {
            console.warn("Dropdown populator warning:", errPop);
        }
    } catch (e) {
        console.error("Error loading materials:", e);
        tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: #e11d48; padding: 20px;">Error al cargar inventario de materiales: ${e.message}</td></tr>`;
    }
}

function renderMaterialsTable(materials) {
    const tbody = document.getElementById("materialsTableBody");
    if (!tbody) return;

    if (materials.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 20px; color: #94a3b8;">No se encontraron materiales registrados.</td></tr>`;
        return;
    }

    tbody.innerHTML = materials.map(m => {
        const isLow = m.is_low_stock || m.stock_quantity <= m.min_stock_alert;
        return `
        <tr>
            <td style="font-weight: 800; color: var(--dalor-blue); font-family: monospace;">${m.code}</td>
            <td style="font-weight: 700; color: var(--dalor-navy);">${m.name}</td>
            <td><span style="font-size: 10px; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-weight: 700; color: #475569;">${m.category}</span></td>
            <td style="text-align: center; font-weight: 700;">${m.unit_measure}</td>
            <td style="text-align: center;">
                <span style="font-weight: 800; font-size: 13px; color: ${isLow ? '#e11d48' : '#059669'};">
                    ${m.stock_quantity.toLocaleString()} ${m.unit_measure}
                </span>
                ${isLow ? `<span style="display: block; font-size: 9px; color: #dc2626; font-weight: 800;">⚠️ STOCK CRÍTICO</span>` : ''}
            </td>
            <td style="text-align: center; color: #64748b; font-size: 11px;">${m.min_stock_alert} ${m.unit_measure}</td>
            <td style="text-align: right; font-weight: 700; color: #0284c7;">$${m.unit_cost_usd.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
            <td style="text-align: right; font-weight: 900; color: var(--dalor-navy);">$${m.total_cost_usd.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
            <td style="text-align: center; white-space: nowrap;">
                <button onclick="openMaterialEntryModal(${m.id})" class="btn-primary" style="padding: 3px 8px; font-size: 11px; background: #059669;" title="Registrar Entrada / Compra">
                    <i class="fa-solid fa-plus"></i> Entrada
                </button>
                <button onclick="openMaterialConsumeModal(${m.id})" class="btn-primary" style="padding: 3px 8px; font-size: 11px; background: #0284c7; margin-left: 4px;" title="Despachar a Obra o Taller">
                    <i class="fa-solid fa-arrow-right-from-bracket"></i> Despachar
                </button>
            </td>
        </tr>
        `;
    }).join('');
}

function filterMaterialsTable() {
    const search = (document.getElementById("filterMaterialSearch")?.value || "").toLowerCase();
    const cat = document.getElementById("filterMaterialCategory")?.value || "";

    const filtered = allMaterials.filter(m => {
        const matchesSearch = !search || m.name.toLowerCase().includes(search) || m.code.toLowerCase().includes(search);
        const matchesCat = !cat || m.category === cat;
        return matchesSearch && matchesCat;
    });

    renderMaterialsTable(filtered);
}

function openNewMaterialModal() {
    document.getElementById("newMaterialForm").reset();
    openModal("modalNewMaterial");
}

async function submitCreateMaterial(event) {
    event.preventDefault();
    const payload = {
        code: document.getElementById("nmat_code").value.trim(),
        name: document.getElementById("nmat_name").value.trim(),
        category: document.getElementById("nmat_category").value,
        unit_measure: document.getElementById("nmat_unit").value,
        stock_quantity: parseFloat(document.getElementById("nmat_stock").value) || 0.0,
        min_stock_alert: parseFloat(document.getElementById("nmat_alert").value) || 5.0,
        unit_cost_usd: parseFloat(document.getElementById("nmat_cost").value) || 0.0,
        location: document.getElementById("nmat_location").value.trim() || "Almacén Central Dalor"
    };

    try {
        const res = await fetch(`${API_BASE}/materials/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            alert("✅ Material registrado con éxito en el catálogo.");
            closeModal("modalNewMaterial");
            await loadInitialMasterData();
            loadMaterialsList();
        } else {
            const err = await res.json();
            alert("Error: " + (err.detail || JSON.stringify(err)));
        }
    } catch (e) {
        alert("Error de conexión al crear material: " + e.message);
    }
}

function openMaterialEntryModal(materialId = null) {
    document.getElementById("materialEntryForm").reset();
    populateSelectDropdowns();
    if (materialId) {
        document.getElementById("me_material_id").value = materialId;
    }
    calcMaterialEntryTotal();
    openModal("modalMaterialEntry");
}

function calcMaterialEntryTotal() {
    const qty = parseFloat(document.getElementById("me_quantity")?.value) || 0.0;
    const cost = parseFloat(document.getElementById("me_unit_cost")?.value) || 0.0;
    const total = qty * cost;
    const previewEl = document.getElementById("me_total_usd_preview");
    if (previewEl) previewEl.innerText = `$${total.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD`;
}

async function submitMaterialEntry(event) {
    event.preventDefault();
    const matId = parseInt(document.getElementById("me_material_id").value);
    const qty = parseFloat(document.getElementById("me_quantity").value) || 0.0;
    const cost = parseFloat(document.getElementById("me_unit_cost").value) || 0.0;
    const registerCxp = document.getElementById("me_register_cxp")?.checked || false;

    if (!matId || qty <= 0) {
        alert("Selecciona un material y cantidad válida.");
        return;
    }

    const payload = {
        material_id: matId,
        quantity: qty,
        unit_cost_usd: cost,
        supplier_name: document.getElementById("me_supplier").value.trim() || "Proveedor General",
        reference_doc: document.getElementById("me_doc").value.trim() || "Compra Almacén",
        notes: document.getElementById("me_notes").value.trim(),
        performed_by: "Custodio de Almacén",
        register_in_cxp: registerCxp,
        due_days: 15
    };

    try {
        const res = await fetch(`${API_BASE}/materials/entry`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            const data = await res.json();
            alert(`✅ ${data.message}`);
            closeModal("modalMaterialEntry");
            await loadInitialMasterData();
            loadMaterialsList();
            if (registerCxp) loadPayablesList();
        } else {
            const err = await res.json();
            alert("Error: " + (err.detail || JSON.stringify(err)));
        }
    } catch (e) {
        alert("Error al procesar entrada de material: " + e.message);
    }
}

function openMaterialConsumeModal(materialId = null) {
    document.getElementById("materialConsumeForm").reset();
    populateSelectDropdowns();
    if (materialId) {
        document.getElementById("mc_material_id").value = materialId;
    }
    onConsumeMaterialSelected();
    calcMaterialConsumeTotal();
    openModal("modalMaterialConsume");
}

function onConsumeMaterialSelected() {
    const sel = document.getElementById("mc_material_id");
    if (!sel || !sel.options[sel.selectedIndex]) return;
    const opt = sel.options[sel.selectedIndex];
    const stock = opt.getAttribute("data-stock") || "0";
    const unit = opt.getAttribute("data-unit") || "UND";
    const label = document.getElementById("mc_stock_available_label");
    if (label) label.innerText = `${parseFloat(stock).toLocaleString()} ${unit}`;
    calcMaterialConsumeTotal();
}

function calcMaterialConsumeTotal() {
    const sel = document.getElementById("mc_material_id");
    const qty = parseFloat(document.getElementById("mc_quantity")?.value) || 0.0;
    let cost = 0.0;
    if (sel && sel.options[sel.selectedIndex]) {
        cost = parseFloat(sel.options[sel.selectedIndex].getAttribute("data-cost")) || 0.0;
    }
    const total = qty * cost;
    const previewEl = document.getElementById("mc_cost_preview");
    if (previewEl) previewEl.value = `$${total.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD`;
}

async function submitMaterialConsume(event) {
    event.preventDefault();
    const matId = parseInt(document.getElementById("mc_material_id").value);
    const qty = parseFloat(document.getElementById("mc_quantity").value) || 0.0;
    const projIdVal = document.getElementById("mc_project_id").value;
    const projId = projIdVal ? parseInt(projIdVal) : null;

    if (!matId || qty <= 0) {
        alert("Selecciona un material y cantidad válida.");
        return;
    }

    const payload = {
        material_id: matId,
        quantity: qty,
        project_id: projId,
        destination: projId ? "Obra en Ejecución" : "Taller Central",
        reference_doc: document.getElementById("mc_doc").value.trim() || "Requisición Interna",
        notes: document.getElementById("mc_notes").value.trim(),
        performed_by: document.getElementById("mc_performed_by").value.trim() || "Custodio de Almacén"
    };

    try {
        const res = await fetch(`${API_BASE}/materials/consume`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            const data = await res.json();
            alert(`✅ ${data.message}`);
            closeModal("modalMaterialConsume");
            await loadInitialMasterData();
            loadMaterialsList();
        } else {
            const err = await res.json();
            alert("Error: " + (err.detail || JSON.stringify(err)));
        }
    } catch (e) {
        alert("Error al procesar despacho de material: " + e.message);
    }
}

// ==============================================================================
// 💵 6. COBRANZAS & ABONOS DIRECTOS DE CLIENTES
// ==============================================================================

function openReceiveClientPaymentModal() {
    document.getElementById("receiveClientPaymentForm").reset();
    populateSelectDropdowns();
    const rateEl = document.getElementById("rcp_rate");
    if (rateEl) rateEl.value = EXCHANGE_RATE.toFixed(2);
    calcClientPaymentBs();
    openModal("modalReceiveClientPayment");
}

function calcClientPaymentBs() {
    const usd = parseFloat(document.getElementById("rcp_amount_usd")?.value) || 0.0;
    const rate = parseFloat(document.getElementById("rcp_rate")?.value) || EXCHANGE_RATE || 800.0;
    const bs = usd * rate;
    const preview = document.getElementById("rcp_total_bs_preview");
    if (preview) {
        preview.innerText = `Bs. ${bs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`;
    }
}

async function submitDirectClientPayment(event) {
    event.preventDefault();
    const clientId = parseInt(document.getElementById("rcp_client_id").value);
    const projIdVal = document.getElementById("rcp_project_id").value;
    const projId = projIdVal ? parseInt(projIdVal) : null;
    const amountUsd = parseFloat(document.getElementById("rcp_amount_usd").value) || 0.0;
    const rate = parseFloat(document.getElementById("rcp_rate").value) || EXCHANGE_RATE || 800.0;

    if (!clientId || amountUsd <= 0) {
        alert("Por favor selecciona un cliente y un monto válido.");
        return;
    }

    const payload = {
        client_id: clientId,
        project_id: projId,
        amount_usd: amountUsd,
        exchange_rate: rate,
        payment_method: document.getElementById("rcp_method").value,
        reference_number: document.getElementById("rcp_ref").value.trim() || `COB-${Date.now().toString().slice(-6)}`,
        concept: document.getElementById("rcp_concept").value.trim() || "Abono / Cobranza de Cliente",
        notes: document.getElementById("rcp_notes").value.trim()
    };

    try {
        const res = await fetch(`${API_BASE}/financial/direct-collection`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            const data = await res.json();
            alert(`✅ ${data.message}\nComprobante Nº: ${data.receipt_number}`);
            closeModal("modalReceiveClientPayment");
            loadReceivablesList();
            loadFinancialSummary();
        } else {
            const err = await res.json();
            alert("Error: " + (err.detail || JSON.stringify(err)));
        }
    } catch (e) {
        alert("Error de conexión al registrar cobro: " + e.message);
    }
}

// ==============================================================================
// 📋 7. GUÍAS OFICIALES DE TRASLADO & DESPACHO A OBRA
// ==============================================================================

function openTransferGuideModal() {
    document.getElementById("transferGuideForm").reset();
    populateSelectDropdowns();
    renderTransferToolsChecklist();
    openModal("modalTransferGuide");
}

function onTransferGuideProjectChanged() {
    const sel = document.getElementById("tg_project_id");
    if (!sel || !sel.options[sel.selectedIndex]) return;
    const opt = sel.options[sel.selectedIndex];
    const loc = opt.getAttribute("data-location") || "Planta Centro - Morón";
    const destInput = document.getElementById("tg_destination");
    if (destInput && loc) destInput.value = loc;
}

function renderTransferToolsChecklist() {
    const container = document.getElementById("tg_tools_checklist_container");
    if (!container) return;

    const tools = allAssets.filter(a => a.asset_type !== 'vehiculo' && a.asset_type !== 'camioneta');
    if (tools.length === 0) {
        container.innerHTML = `<span style="font-size:11px; color:#94a3b8;">No hay herramientas registradas.</span>`;
        return;
    }

    container.innerHTML = tools.map(t => `
        <label style="display: flex; align-items: center; gap: 8px; padding: 4px 6px; border-radius: 4px; background: #f8fafc; font-size: 11px; cursor: pointer;" class="tg-tool-item" data-text="${t.asset_code} ${t.name} ${t.brand || ''}">
            <input type="checkbox" value="${t.id}" data-name="${t.name}" data-code="${t.asset_code}" class="tg-tool-checkbox" style="width: 15px; height: 15px;">
            <span style="font-weight: 800; color: var(--dalor-blue); font-family: monospace;">[${t.asset_code}]</span>
            <span style="font-weight: 600; color: var(--dalor-navy);">${t.name}</span>
            <span style="color: #64748b; font-size: 10px; margin-left: auto;">${t.brand || ''}</span>
        </label>
    `).join('');
}

function filterTransferToolsChecklist() {
    const q = (document.getElementById("tg_tools_search")?.value || "").toLowerCase();
    document.querySelectorAll(".tg-tool-item").forEach(item => {
        const text = item.getAttribute("data-text").toLowerCase();
        item.style.display = text.includes(q) ? "flex" : "none";
    });
}

async function submitGenerateTransferGuide(event) {
    event.preventDefault();
    const projId = parseInt(document.getElementById("tg_project_id").value);
    const dest = document.getElementById("tg_destination").value.trim();
    const vehId = document.getElementById("tg_vehicle_id").value;
    const driver = document.getElementById("tg_driver_name").value.trim();

    if (!projId) {
        alert("Por favor selecciona un proyecto aprobado de destino.");
        return;
    }

    const selectedTools = [];
    document.querySelectorAll(".tg-tool-checkbox:checked").forEach(cb => {
        selectedTools.push({
            id: parseInt(cb.value),
            code: cb.getAttribute("data-code"),
            name: cb.getAttribute("data-name")
        });
    });

    if (selectedTools.length === 0) {
        alert("Por favor selecciona al menos una herramienta o equipo a trasladar.");
        return;
    }

    const proj = allProjects.find(p => p.id === projId) || { code: "DAL-2026-001", name: "Proyecto Obra" };
    const veh = allAssets.find(a => a.id == vehId) || { asset_code: "VEH-001", name: "Camioneta Toyota Hilux" };
    const guideNumber = `GT-DALOR-${Date.now().toString().slice(-6)}`;

    // Reubicar herramientas en backend para el proyecto
    for (const tool of selectedTools) {
        try {
            await fetch(`${API_BASE}/resources/assign`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    resource_type: "asset",
                    resource_id: tool.id,
                    project_id: projId,
                    destination_location: dest,
                    custodian_name: driver,
                    action_type: "assign"
                })
            });
        } catch (e) {
            console.error("Error asignando herramienta:", e);
        }
    }

    closeModal("modalTransferGuide");
    alert(`✅ Guía de Traslado ${guideNumber} emitida exitosamente.\n\nSe despacharon ${selectedTools.length} equipos hacia ${dest}.`);
    await loadInitialMasterData();
    if (document.getElementById("subtab-res-tools") && !document.getElementById("subtab-res-tools").classList.contains("hidden")) {
        loadToolsList();
    }
}

// ==============================================================================
// 🚜 CREACIÓN DE NUEVOS ACTIVOS, VEHÍCULOS, HERRAMIENTAS & MAQUINARIA
// ==============================================================================
function openNewAssetModal(presetType = 'herramienta_mayor') {
    const form = document.getElementById("newAssetForm");
    if (form) form.reset();
    
    const typeSelect = document.getElementById("nass_type");
    if (typeSelect) {
        typeSelect.value = presetType;
    }
    onAssetTypeChanged();
    openModal("modalNewAsset");
}

function openNewToolModal_v2() {
    openNewAssetModal('herramienta_mayor');
}

function openNewVehicleModal_v2() {
    openNewAssetModal('vehiculo');
}

function onAssetTypeChanged() {
    const type = document.getElementById("nass_type").value;
    const title = document.getElementById("newAssetModalTitle");
    const serialLabel = document.getElementById("nass_serial_label");
    const odometerLabel = document.getElementById("nass_odometer_label");

    if (type === 'vehiculo') {
        if (title) title.innerHTML = '<i class="fa-solid fa-truck" style="color: #6366f1;"></i> Registrar Nuevo Vehículo de Flota / Carga';
        if (serialLabel) serialLabel.textContent = "Placa del Vehículo *";
        if (odometerLabel) odometerLabel.textContent = "Kilometraje Inicial (Km)";
    } else if (type === 'maquinaria') {
        if (title) title.innerHTML = '<i class="fa-solid fa-gears" style="color: #d97706;"></i> Registrar Nueva Maquinaria Pesada / Planta / Compresor';
        if (serialLabel) serialLabel.textContent = "Serial del Fabricante";
        if (odometerLabel) odometerLabel.textContent = "Horómetro Inicial (Horas)";
    } else if (type === 'equipo_medicion') {
        if (title) title.innerHTML = '<i class="fa-solid fa-scale-unbalanced" style="color: #8b5cf6;"></i> Registrar Nuevo Equipo de Medición / Calibración';
        if (serialLabel) serialLabel.textContent = "Serial / Certificado Calibración";
        if (odometerLabel) odometerLabel.textContent = "Usos / Horómetro";
    } else {
        if (title) title.innerHTML = '<i class="fa-solid fa-toolbox" style="color: var(--dalor-blue);"></i> Registrar Nueva Herramienta / Equipo';
        if (serialLabel) serialLabel.textContent = "Serial / Identificador";
        if (odometerLabel) odometerLabel.textContent = "Horómetro / Contador";
    }
}

async function submitCreateAsset(e) {
    e.preventDefault();
    const type = document.getElementById("nass_type").value;
    const code = document.getElementById("nass_code").value.trim();
    const name = document.getElementById("nass_name").value.trim();
    const brand = document.getElementById("nass_brand").value.trim();
    const model = document.getElementById("nass_model").value.trim();
    const serial = document.getElementById("nass_serial").value.trim();
    const odometer = parseFloat(document.getElementById("nass_odometer").value) || 0.0;
    const location = document.getElementById("nass_location").value.trim() || "Sede Central";
    const custodian = document.getElementById("nass_custodian").value.trim() || "Disponible en Base";

    const payload = {
        asset_code: code,
        name: name,
        asset_type: type,
        brand: brand,
        model: model,
        serial_number: type !== 'vehiculo' ? serial : null,
        license_plate: type === 'vehiculo' ? serial : null,
        current_odometer: odometer,
        service_interval_km: type === 'vehiculo' ? 5000 : 250,
        current_location: location,
        current_custodian_name: custodian,
        is_exclusive: true
    };

    try {
        const res = await fetch(`${API_BASE}/assets/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || "Error al crear activo");
        }

        closeModal("modalNewAsset");
        alert(`✅ Activo ${code} (${name}) registrado exitosamente.`);
        await loadInitialMasterData();
        loadFleetList();
        loadToolsList();
    } catch (err) {
        alert(`❌ Error: ${err.message}`);
    }
}

// ==============================================================================
// 👷 CREACIÓN DE NUEVOS EMPLEADOS / PERSONAL
// ==============================================================================
function openNewPersonnelModal() {
    const form = document.getElementById("newPersonnelForm");
    if (form) form.reset();
    openModal("modalNewPersonnel");
}

async function submitCreatePersonnel(e) {
    e.preventDefault();
    const code = document.getElementById("npers_code").value.trim();
    const fullName = document.getElementById("npers_name").value.trim();
    const idNum = document.getElementById("npers_id").value.trim();
    const role = document.getElementById("npers_role").value;
    const phone = document.getElementById("npers_phone").value.trim();
    const roster = document.getElementById("npers_roster").value;
    const salary = parseFloat(document.getElementById("npers_salary").value) || 0.0;
    const location = document.getElementById("npers_location").value.trim() || "Sede Central";

    const payload = {
        code: code,
        full_name: fullName,
        identification_id: idNum,
        role_title: role,
        phone: phone,
        roster_type: roster,
        monthly_salary_usd: salary,
        current_location: location,
        status: "disponible_base"
    };

    try {
        const res = await fetch(`${API_BASE}/personnel/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || "Error al registrar empleado");
        }

        closeModal("modalNewPersonnel");
        alert(`✅ Empleado ${fullName} (${role}) registrado exitosamente.`);
        await loadInitialMasterData();
        loadPersonnelTableList();
    } catch (err) {
        alert(`❌ Error: ${err.message}`);
    }
}

// ==============================================================================
// 👤 GESTIÓN Y CREACIÓN DE USUARIOS DE SISTEMA
// ==============================================================================
async function openUserManagementModal() {
    openModal("modalUserManagement");
    await loadUsersManagementTable();
}

async function loadUsersManagementTable() {
    const tbody = document.getElementById("userManagementTableBody");
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #94a3b8; padding: 20px;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando usuarios...</td></tr>`;

    try {
        const res = await fetch(`${API_BASE}/auth/users`);
        if (!res.ok) throw new Error("Error al obtener usuarios");
        const users = await res.json();

        if (!users || users.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #94a3b8; padding: 20px;">No hay usuarios registrados.</td></tr>`;
            return;
        }

        const roleNamesMap = {
            "director_general": "Director General / Socio",
            "administrador_financiero": "Administración & Finanzas",
            "ingeniero_obra": "Ingeniero Residente de Obra",
            "supervisor_campo": "Supervisor de Campo / Faena"
        };

        tbody.innerHTML = users.map(u => `
            <tr>
                <td><b style="color: var(--dalor-navy); font-family: monospace;">@${u.username}</b></td>
                <td><b>${u.full_name}</b></td>
                <td><span style="color: #64748b; font-size: 11px;">${u.email || '-'}</span></td>
                <td><span class="badge-tag" style="background: #e0f2fe; color: #0369a1; font-size: 10px;">${roleNamesMap[u.role_name] || u.role_name}</span></td>
                <td><span style="color: ${u.is_active ? '#059669' : '#ef4444'}; font-weight: 700; font-size: 11px;">${u.is_active ? '● Activo' : '○ Inactivo'}</span></td>
                <td><span style="color: #64748b; font-size: 11px;">${u.last_login}</span></td>
            </tr>
        `).join("");
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #ef4444; padding: 20px;">Error al cargar usuarios: ${err.message}</td></tr>`;
    }
}

function openNewUserModal_v2() {
    const form = document.getElementById("newUserForm");
    if (form) form.reset();
    openModal("modalNewUser");
}

async function submitCreateUser_v2(e) {
    e.preventDefault();
    const username = document.getElementById("nusr_username").value.trim();
    const password = document.getElementById("nusr_password").value.trim();
    const fullname = document.getElementById("nusr_fullname").value.trim();
    const email = document.getElementById("nusr_email").value.trim();
    const role = document.getElementById("nusr_role").value;

    const payload = {
        username: username,
        password: password,
        full_name: fullname,
        email: email || null,
        role_name: role,
        is_active: true,
        is_superuser: role === "director_general"
    };

    try {
        const res = await fetch(`${API_BASE}/auth/users`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || "Error al crear usuario");
        }

        closeModal("modalNewUser");
        alert(`✅ Usuario @${username} (${fullname}) creado exitosamente.`);
        await loadUsersManagementTable();
    } catch (err) {
        alert(`❌ Error: ${err.message}`);
    }
}

function openMaintenanceSubtab_v2(subtab) {
    if (subtab === 'users') {
        openUserManagementModal();
    } else {
        alert(`Módulo de ${subtab} activo.`);
    }
}

