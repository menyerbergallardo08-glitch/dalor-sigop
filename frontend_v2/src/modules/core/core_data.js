/**
 * DALOR SIGO-P | Módulo: CORE_DATA.JS
 * Desacoplado de core.js
 * Carga de datos maestros (clientes, proyectos, servicios, personal, etc.)
 */

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

// Carga Inicial de Datos Maestros con Coalescencia y Caché en Memoria
let _masterDataPromise = null;
let _lastMasterDataFetchTime = 0;
const MASTER_DATA_TTL_MS = 60000; // 60 segundos de caché fresca en cliente para navegación ultra-rápida (0 ms)

async function loadInitialMasterData(force = false) {
    const now = Date.now();

    // 1. Coalescencia: Si ya hay una petición en vuelo, devolver la misma promesa
    if (_masterDataPromise) {
        return _masterDataPromise;
    }

    // 2. Caché en memoria: Si los datos se cargaron recientemente y están completos, retornar de inmediato
    if (!force && (now - _lastMasterDataFetchTime < MASTER_DATA_TTL_MS) && 
        window.allClients && window.allClients.length > 0 && 
        window.allPersonnel && window.allPersonnel.length > 0 && 
        window.allAssets && window.allAssets.length > 0) {
        if (typeof populatePlanDropdownSelectors === 'function') {
            populatePlanDropdownSelectors();
        }
        return Promise.resolve();
    }

    _masterDataPromise = (async () => {
        try {
            const [resCli, resSrv, resProj, resCat, resAss, resPers, resMat] = await Promise.all([
                authFetch(`${API_BASE}/clients/`),
                authFetch(`${API_BASE}/services/`),
                authFetch(`${API_BASE}/projects/`),
                authFetch(`${API_BASE}/expenses/categories`),
                authFetch(`${API_BASE}/assets/`),
                authFetch(`${API_BASE}/personnel/`),
                authFetch(`${API_BASE}/materials/`)
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

            _lastMasterDataFetchTime = Date.now();

            populateSelectDropdowns();
            populatePlanDropdownSelectors();
            updatePendingInboxBadge();
        } catch (e) {
            console.error("Error al cargar datos maestros:", e);
        } finally {
            _masterDataPromise = null;
        }
    })();

    return _masterDataPromise;
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

    if (document.getElementById("rcp_project_id")) document.getElementById("rcp_project_id").innerHTML = `<option value="">-- Sin Proyecto Específico (Anticipo a Cuenta) --</option>`;

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

    // Vehículos para Guías (Solo unidades activas y disponibles en base)
    const vehicles = (allAssets || []).filter(a => 
        (a.asset_type === 'vehiculo' || a.asset_type === 'camioneta' || a.asset_type === 'transporte') &&
        a.is_active !== false &&
        !a.current_project_id &&
        (a.status === 'disponible_base' || a.status === 'disponible' || !a.status) &&
        a.status !== 'en_obra' &&
        a.status !== 'en_mantenimiento' &&
        a.status !== 'alquilado_a_tercero' &&
        a.status !== 'desincorporado'
    );

    const vehOptions = `<option value="">-- Seleccione Vehículo de Transporte (${vehicles.length} disp. en base) --</option>` + 
        `<option value="none">📍 Sin Vehículo Asignado (Sede Central / Taller / Custodia Interna)</option>` +
        vehicles.map(v => `<option value="${v.id}">[${v.asset_code}] ${v.name} (Placa: ${v.license_plate || 'S/P'}) - ${v.current_location || 'Base'}</option>`).join('');

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

    if (typeof window.populateServiceCategoriesAndUnits === 'function') {
        window.populateServiceCategoriesAndUnits();
    }
}

export { loadInitialMasterData, populateSelectDropdowns };
