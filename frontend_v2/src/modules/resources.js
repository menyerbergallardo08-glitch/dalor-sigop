/**
 * DALOR SIGO-P | Módulo: RESOURCES.JS
 * Extraído y desacoplado del monolito de producción (v94)
 */

var API_BASE = window.API_BASE || (window.location.origin + "/api/v1");
var allClients = window.allClients = window.allClients || [];
var allServices = window.allServices = window.allServices || [];
var allProjects = window.allProjects = window.allProjects || [];
var allCategories = window.allCategories = window.allCategories || [];
var allAssets = window.allAssets = window.allAssets || [];
var allPersonnel = window.allPersonnel = window.allPersonnel || [];
var allMaterials = window.allMaterials = window.allMaterials || [];
var selectedPersonnelIds = window.selectedPersonnelIds = window.selectedPersonnelIds || [];
var selectedVehicleIds = window.selectedVehicleIds = window.selectedVehicleIds || [];
var selectedToolIds = window.selectedToolIds = window.selectedToolIds || [];
var selectedMaterialIds = window.selectedMaterialIds = window.selectedMaterialIds || [];
var EXCHANGE_RATE = window.EXCHANGE_RATE = window.EXCHANGE_RATE || 850.0;
var BCV_DATA = window.BCV_DATA = window.BCV_DATA || { rate: 850.0, source: 'BCV Oficial' };
var currentUser = window.currentUser || null;
var authToken = window.authToken = window.authToken || localStorage.getItem('dalor_token') || null;

/** authFetch — inyecta token en cada request usando window.fetch nativo (evita recursión) */
function authFetch(url, options = {}) {
    const t = sessionStorage.getItem('dalor_token') || localStorage.getItem('dalor_token') || window.authToken || '';
    const h = { ...(options.headers || {}) };
    if (t) h['Authorization'] = 'Bearer ' + t;
    if (options.body && !(options.body instanceof FormData) && !h['Content-Type']) {
        h['Content-Type'] = 'application/json';
    }
    if (options.body instanceof FormData) {
        delete h['Content-Type'];
    }
    return window.fetch(url, { ...options, headers: h });
}


// --- BLOQUE L3480-L4951 ---
// ----------------------------------------------------

// 2. MÓDULO DE ACTIVOS & RECURSOS (PESTAÑAS INDEPENDIENTES)

// ----------------------------------------------------

function openResourceSubtab(subtabName) {

    switchView('resources', 'recursos');

    switchResourceSubtab(subtabName);

}



function switchResourceSubtab(subtabName) {
    try { 
        sessionStorage.setItem('dalor_active_subtab_resources', subtabName); 
        localStorage.setItem('dalor_active_subtab_resources', subtabName);
    } catch(e) {}

    const allSubtabs = ['dashboard', 'fleet', 'machinery', 'tools', 'materials', 'personnel', 'rentals'];

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

    if (subtabName === 'rentals' && typeof window.loadRentalsList === 'function') window.loadRentalsList();
}



async function loadResourceDashboard() {

    try {

        const res = await authFetch(`${API_BASE}/resources/matrix-status`);

        const data = await res.json();



        // 1. Tarjetas de Resumen General KPI por Categoría Real (Flota, Maquinaria, Herramientas, Personal)
        const vTot = data.summary.vehicles_total ?? ((data.summary.vehicles_available_base || 0) + (data.summary.vehicles_in_operation || 0));
        const mTot = data.summary.machinery_total ?? ((data.summary.machinery_available_base || 0) + (data.summary.machinery_in_operation || 0));
        const tTot = data.summary.tools_total ?? ((data.summary.tools_available_base || 0) + (data.summary.tools_in_operation || 0));
        const pTot = data.summary.total_personnel ?? ((data.summary.personnel_available_base || 0) + (data.summary.personnel_in_operation || 0));

        document.getElementById("matrixCountersContainer").innerHTML = `
            <div style="background: white; border: 1px solid #cbd5e1; border-radius: 10px; padding: 10px 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                    <span style="font-size: 10.5px; text-transform: uppercase; color: #1e293b; font-weight: 800;">
                        <i class="fa-solid fa-truck-front" style="color: #0284c7;"></i> Flota Vehicular
                    </span>
                    <span style="font-size: 10px; background: #f1f5f9; padding: 1px 6px; border-radius: 4px; font-weight: 800; color: #475569;">Total: ${vTot}</span>
                </div>
                <div style="display: flex; justify-content: space-around; align-items: baseline; margin-top: 6px;">
                    <div style="text-align: center;">
                        <span style="font-size: 9px; color: #0284c7; font-weight: 700; text-transform: uppercase;">En Obra</span>
                        <p style="font-size: 16px; font-weight: 900; color: #0284c7; margin: 0;">${data.summary.vehicles_in_operation ?? 0}</p>
                    </div>
                    <div style="border-left: 1px solid #e2e8f0; height: 24px;"></div>
                    <div style="text-align: center;">
                        <span style="font-size: 9px; color: #166534; font-weight: 700; text-transform: uppercase;">En Base</span>
                        <p style="font-size: 16px; font-weight: 900; color: #16a34a; margin: 0;">${data.summary.vehicles_available_base ?? 0}</p>
                    </div>
                </div>
            </div>

            <div style="background: white; border: 1px solid #cbd5e1; border-radius: 10px; padding: 10px 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                    <span style="font-size: 10.5px; text-transform: uppercase; color: #1e293b; font-weight: 800;">
                        <i class="fa-solid fa-tractor" style="color: #ea580c;"></i> Maquinaria Pesada
                    </span>
                    <span style="font-size: 10px; background: #f1f5f9; padding: 1px 6px; border-radius: 4px; font-weight: 800; color: #475569;">Total: ${mTot}</span>
                </div>
                <div style="display: flex; justify-content: space-around; align-items: baseline; margin-top: 6px;">
                    <div style="text-align: center;">
                        <span style="font-size: 9px; color: #0284c7; font-weight: 700; text-transform: uppercase;">En Obra</span>
                        <p style="font-size: 16px; font-weight: 900; color: #0284c7; margin: 0;">${data.summary.machinery_in_operation ?? 0}</p>
                    </div>
                    <div style="border-left: 1px solid #e2e8f0; height: 24px;"></div>
                    <div style="text-align: center;">
                        <span style="font-size: 9px; color: #c2410c; font-weight: 700; text-transform: uppercase;">En Base</span>
                        <p style="font-size: 16px; font-weight: 900; color: #ea580c; margin: 0;">${data.summary.machinery_available_base ?? 0}</p>
                    </div>
                </div>
            </div>

            <div style="background: white; border: 1px solid #cbd5e1; border-radius: 10px; padding: 10px 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                    <span style="font-size: 10.5px; text-transform: uppercase; color: #1e293b; font-weight: 800;">
                        <i class="fa-solid fa-wrench" style="color: #4f46e5;"></i> Herramientas Stock
                    </span>
                    <span style="font-size: 10px; background: #f1f5f9; padding: 1px 6px; border-radius: 4px; font-weight: 800; color: #475569;">Total: ${tTot}</span>
                </div>
                <div style="display: flex; justify-content: space-around; align-items: baseline; margin-top: 6px;">
                    <div style="text-align: center;">
                        <span style="font-size: 9px; color: #0284c7; font-weight: 700; text-transform: uppercase;">En Obra</span>
                        <p style="font-size: 16px; font-weight: 900; color: #0284c7; margin: 0;">${data.summary.tools_in_operation ?? 0}</p>
                    </div>
                    <div style="border-left: 1px solid #e2e8f0; height: 24px;"></div>
                    <div style="text-align: center;">
                        <span style="font-size: 9px; color: #166534; font-weight: 700; text-transform: uppercase;">En Base</span>
                        <p style="font-size: 16px; font-weight: 900; color: #16a34a; margin: 0;">${data.summary.tools_available_base ?? 0}</p>
                    </div>
                </div>
            </div>

            <div style="background: white; border: 1px solid #cbd5e1; border-radius: 10px; padding: 10px 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                    <span style="font-size: 10.5px; text-transform: uppercase; color: #1e293b; font-weight: 800;">
                        <i class="fa-solid fa-users" style="color: #059669;"></i> Nómina / Personal
                    </span>
                    <span style="font-size: 10px; background: #f1f5f9; padding: 1px 6px; border-radius: 4px; font-weight: 800; color: #475569;">Total: ${pTot}</span>
                </div>
                <div style="display: flex; justify-content: space-around; align-items: baseline; margin-top: 6px;">
                    <div style="text-align: center;">
                        <span style="font-size: 9px; color: #0284c7; font-weight: 700; text-transform: uppercase;">En Obra</span>
                        <p style="font-size: 16px; font-weight: 900; color: #0284c7; margin: 0;">${data.summary.personnel_in_operation ?? 0}</p>
                    </div>
                    <div style="border-left: 1px solid #e2e8f0; height: 24px;"></div>
                    <div style="text-align: center;">
                        <span style="font-size: 9px; color: #166534; font-weight: 700; text-transform: uppercase;">En Base</span>
                        <p style="font-size: 16px; font-weight: 900; color: #16a34a; margin: 0;">${data.summary.personnel_available_base ?? 0}</p>
                    </div>
                </div>
            </div>
        `;



        // 2. Distribución por Ubicación
        const normalizeLoc = (item) => {
            if (item.project_id && item.project_name) {
                const code = item.project_code || `PRJ-${item.project_id}`;
                const locSuffix = item.project_location ? ` (${item.project_location})` : '';
                return `Obra [${code}] - ${item.project_name}${locSuffix}`;
            }
            const l = item.location || '';
            const s = l.trim().toLowerCase();
            if (!s || s.includes('sede') || s.includes('base') || s.includes('guacara') || s.includes('taller')) {
                return 'Sede Central Dalor (Guacara)';
            }
            return l.trim();
        };

        const locMap = {};
        [...data.assets, ...data.personnel].forEach(item => {
            const loc = normalizeLoc(item);
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

        document.getElementById("recentMovementsContainer").innerHTML = data.assets.slice(0, 5).map(a => {
            const inProject = a.status === 'en_obra' || a.project_id;
            const custLabel = inProject
                ? ((a.custodian && !a.custodian.toLowerCase().includes('base')) ? a.custodian : 'En Operación de Obra')
                : (a.custodian || 'Disponible en Base');
            return `
            <div style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 10px; font-size: 11px;">
                <span><b>${a.code}</b> - ${a.name}</span>
                <span style="font-weight: 700; color: ${inProject ? '#0284c7' : '#059669'};">
                    ${a.location} (${custLabel})
                </span>
            </div>
        `;
        }).join('');



    } catch (e) {

        console.error("Error al cargar dashboard de recursos:", e);

    }

}



// ----------------------------------------------------

// 3. CONTROL DE FLOTA & VEHÍCULOS (PESTAÑA EXCLUSIVA)

// ----------------------------------------------------

async function loadFleetList() {
    const tbody = document.getElementById("fleetTableBody");
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; padding: 20px; color: #94a3b8;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando flota...</td></tr>`;

    try {
        const token = window.authToken || localStorage.getItem('dalor_token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        const res = await authFetch(`${API_BASE}/assets/fleet-summary`, { headers });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const fleet = await res.json();
        
        if (!Array.isArray(fleet)) {
            tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; padding: 20px; color: #94a3b8;">No se pudo procesar la respuesta de la flota.</td></tr>`;
            return;
        }

        rawFleetList = fleet.filter(a => a && (
            a.asset_type === 'vehiculo' || 
            a.asset_type === 'camioneta' || 
            (typeof a.asset_code === 'string' && (a.asset_code.includes('-V-') || a.asset_code.startsWith('FLT-'))) ||
            (typeof a.category === 'string' && a.category.toLowerCase().includes('flota'))
        ));

        filterFleetList();

    } catch (e) {
        console.error("[FLEET ERROR]", e);
        const tbody = document.getElementById("fleetTableBody");
        if (tbody) tbody.innerHTML = `<tr><td colspan="11" style="text-align: center; color: #e11d48;">Error al cargar flota: ${e?.message || e}</td></tr>`;
    }
}

let rawFleetList = [];

function filterFleetList() {
    const q = (document.getElementById("fleetSearchInput")?.value || '').trim().toLowerCase();
    const status = document.getElementById("fleetStatusFilter")?.value || 'all';
    const maint = document.getElementById("fleetMaintFilter")?.value || 'all';
    const tbody = document.getElementById("fleetTableBody");
    const countBadge = document.getElementById("fleetCountBadge");

    let filtered = (rawFleetList || []).filter(v => {
        const safeCode = (v?.asset_code || '').toLowerCase();
        const safeName = (v?.name || '').toLowerCase();
        const safeBrand = (v?.brand || '').toLowerCase();
        const safePlate = (v?.license_plate || '').toLowerCase();
        const matchText = !q || safeCode.includes(q) || safeName.includes(q) || safeBrand.includes(q) || safePlate.includes(q);

        const inBase = (v?.status === 'disponible_base') && !v?.current_project_id;
        let matchStatus = true;
        if (status === 'en_obra') matchStatus = !inBase;
        if (status === 'disponible_base') matchStatus = inBase;

        let matchMaint = true;
        if (maint !== 'all') matchMaint = String(v?.traffic_light || '') === maint;

        return matchText && matchStatus && matchMaint;
    });

    if (countBadge) countBadge.innerText = `${filtered.length} de ${rawFleetList.length} vehículos`;

    if (!tbody) return;

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="11" style="text-align: center; padding: 20px; color: #94a3b8;">No hay vehículos que coincidan con la búsqueda o filtros aplicados.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(v => {
        if (!v) return '';
        let semColor = '#166534';
        let semBg = '#dcfce7';
        const light = String(v?.traffic_light ?? 'VERDE_OK');
        if (light === 'ROJO_VENCIDO') {
            semColor = '#991b1b';
            semBg = '#fee2e2';
        } else if (light === 'AMARILLO_PROXIMO') {
            semColor = '#92400e';
            semBg = '#fef3c7';
        }

        const inBase = (v?.status === 'disponible_base') && !v?.current_project_id;
        const curOdo = Number(v?.current_odometer ?? 0);
        const remKm = Number(v?.remaining_km_to_service ?? 0);
        const plateStr = v?.license_plate || '-';
        const locStr = inBase 
            ? (v?.current_location || 'Sede Central Dalor (Guacara)')
            : (v?.current_location && !v.current_location.includes('Sede') ? v.current_location : 'En Operación / Obra');
        const custStr = inBase 
            ? 'Disponible en Base'
            : (v?.custodian && !v.custodian.toLowerCase().includes('base') ? v.custodian : 'Equipo de Obra');
        const vName = v?.name || 'Vehículo';
        const safeName = String(vName).replace(/'/g, "\\'").replace(/"/g, "&quot;");
        const safeCode = v?.asset_code || 'FLT';
        const vId = v?.id ?? 0;
        const vBrand = v?.brand ? `(${v.brand})` : '';
        const srvCount = v?.services_count ?? 0;

        return `
        <tr>
            <td style="font-weight: 800; color: var(--dalor-blue); font-family: monospace;">${safeCode}</td>
            <td style="font-weight: 700; color: var(--dalor-navy);">${vName} ${vBrand}</td>
            <td style="font-weight: 800; font-family: monospace;">${plateStr}</td>
            <td style="font-weight: 800;">${curOdo.toLocaleString()} Km</td>
            <td>En ${remKm.toLocaleString()} Km</td>
            <td>
                <span style="font-size: 10px; padding: 2px 8px; border-radius: 9999px; font-weight: 800; background: ${semBg}; color: ${semColor};">
                    ${light.replace(/_/g, ' ')}
                </span>
            </td>
            <td style="text-align: center;">
                <button onclick="openVehicleServicesModal(${vId}, '${safeCode}', '${safeName}')" class="btn-secondary" style="padding: 3px 8px; border-radius: 9999px; font-weight: 800; font-size: 11px; background: #ffedd5; color: #c2410c; border: 1px solid #fed7aa; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;" title="Ver bitácora de mantenimientos y servicios de esta unidad">
                    <i class="fa-solid fa-wrench"></i> ${srvCount} Servicios
                </button>
            </td>
            <td>
                <span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 800; ${inBase ? 'background: #dcfce7; color: #166534;' : 'background: #e0f2fe; color: #0369a1;'}">
                    <i class="fa-solid ${inBase ? 'fa-warehouse' : 'fa-truck-front'}"></i> ${inBase ? 'DISPONIBLE EN BASE' : 'EN OPERACIÓN / OBRA'}
                </span>
            </td>
            <td>${locStr}</td>
            <td>${custStr}</td>
            <td style="text-align: center; white-space: nowrap;">
                <button onclick="openAssetHistoryModal(${vId}, '${safeCode}', '${safeName}')" class="btn-primary" style="padding: 3px 8px; font-size: 11px; margin-right: 4px; background: #2563eb;" title="Ver Bitácora Integral y Trazabilidad">
                    <i class="fa-solid fa-clock-rotate-left"></i> Bitácora
                </button>
                <button onclick="openOdometerOcrModal(${vId}, '${safeCode}', '${safeName}', '${plateStr}', ${curOdo})" class="btn-primary" style="padding: 3px 6px; font-size: 11px; margin-right: 4px; background: #0284c7; box-shadow: 0 1px 3px rgba(2, 132, 199, 0.4);" title="Capturar Odómetro por Foto (OCR)">
                    <i class="fa-solid fa-camera"></i> Odómetro
                </button>
                <button onclick="openCalibrateOdometerModal(${vId}, '${safeCode}', '${safeName}', ${curOdo})" class="btn-secondary" style="padding: 3px 6px; font-size: 11px; margin-right: 4px; color: #7c3aed; border-color: #c4b5fd;" title="Calibrar / Resetear Odómetro con Clave de Director">
                    <i class="fa-solid fa-key"></i> Calibrar
                </button>
                ${inBase ? `
                    <button onclick="openAssignModal('asset', ${vId}, '${safeName}', 'assign')" class="btn-primary" style="padding: 3px 8px; font-size: 11px;">
                        Asignar a Obra
                    </button>
                ` : `
                    <button onclick="openAssignModal('asset', ${vId}, '${safeName}', 'transfer')" class="btn-secondary" style="padding: 3px 6px; font-size: 11px;" title="Transferir a otra obra">
                        <i class="fa-solid fa-arrows-split-up-and-left"></i>
                    </button>
                    <button onclick="returnResourceToBase('asset', ${vId})" class="btn-primary" style="padding: 3px 6px; font-size: 11px; margin-left: 4px; background: #059669;" title="Devolver a Sede Central">
                        <i class="fa-solid fa-warehouse"></i>
                    </button>
                `}
                <button onclick="deleteAssetItem(${vId})" class="btn-secondary" style="padding: 3px 6px; color: #ef4444; margin-left: 4px;" title="Inactivar Vehículo">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        </tr>`;
    }).join('');
}

let currentVehServicesList = [];
let currentVehServicesPage = 1;
let currentVehServicesPageSize = 5;

function goToVehServicesPage(page) {
    currentVehServicesPage = page;
    renderVehServicesTablePaginated();
}

function changeVehServicesPageSize(size) {
    currentVehServicesPageSize = parseInt(size) || 5;
    currentVehServicesPage = 1;
    renderVehServicesTablePaginated();
}

function renderVehServicesTablePaginated() {
    const tbody = document.getElementById("vehServicesTableBody");
    const container = document.getElementById("vehServicesPagination");
    if (!tbody) return;

    if (!currentVehServicesList || currentVehServicesList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 20px; color: #94a3b8;">No se registran servicios de taller ni cambios de aceite para este vehículo aún. Usa el botón superior para registrar uno.</td></tr>`;
        if (container) container.innerHTML = '';
        return;
    }

    const paginateFn = typeof window.renderPaginationControls === 'function' 
        ? window.renderPaginationControls 
        : (typeof renderPaginationControls === 'function' ? renderPaginationControls : () => ({ startIndex: 0, endIndex: currentVehServicesList.length }));

    const { startIndex, endIndex } = paginateFn({
        containerId: "vehServicesPagination",
        totalItems: currentVehServicesList.length,
        currentPage: currentVehServicesPage,
        pageSize: currentVehServicesPageSize,
        onPageChange: "goToVehServicesPage",
        onPageSizeChange: "changeVehServicesPageSize",
        itemLabel: "servicio(s) realizado(s)",
        pageSizeOptions: [5, 10, 20],
        allowAll: true
    });

    const pageItems = currentVehServicesList.slice(startIndex, endIndex);

    tbody.innerHTML = pageItems.map(s => {
        const sType = (s.service_type || '').replace(/_/g, ' ').toUpperCase();
        return `
        <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 8px; font-weight: 600; color: #475569; white-space: nowrap;">${s.service_date}</td>
            <td style="padding: 8px; font-weight: 700; color: #1e293b;">
                <span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 800; background: #fff7ed; color: #c2410c; border: 1px solid #ffedd5;">
                    <i class="fa-solid fa-wrench"></i> ${sType}
                </span>
            </td>
            <td style="padding: 8px; text-align: right; font-weight: 800; color: var(--dalor-navy);">${Number(s.service_odometer || 0).toLocaleString()} Km</td>
            <td style="padding: 8px; color: #334155; font-weight: 600;">${s.technician_workshop || 'Taller Central'}</td>
            <td style="padding: 8px; text-align: right; font-weight: 800; color: #059669;">$${Number(s.cost_usd || 0).toFixed(2)}</td>
            <td style="padding: 8px; color: #64748b; font-size: 11px;">${s.notes || '-'}</td>
        </tr>`;
    }).join('');
}

async function openVehicleServicesModal(assetId, code = null, name = null) {
    const titleEl = document.getElementById("vehServicesModalTitle");
    const subEl = document.getElementById("vehServicesModalSubtitle");
    const plateEl = document.getElementById("vehSrvPlate");
    const odoEl = document.getElementById("vehSrvOdometer");
    const countEl = document.getElementById("vehSrvCount");
    const costEl = document.getElementById("vehSrvTotalCost");
    const tbody = document.getElementById("vehServicesTableBody");
    const btnNew = document.getElementById("btnOpenNewServiceFromHistory");

    if (titleEl) titleEl.innerHTML = `<i class="fa-solid fa-wrench"></i> Historial de Servicios: [${code || '...'} ${name || ''}]`;
    if (subEl) subEl.innerText = `Cargando bitácora de mantenimientos preventivos y correctivos...`;
    if (tbody) tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 20px; color: #64748b;"><i class="fa-solid fa-spinner fa-spin"></i> Consultando registros...</td></tr>`;

    openModal("modalVehicleServices");

    try {
        const res = await authFetch(`${API_BASE}/assets/${assetId}/services`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const a = data.asset || {};
        const services = data.services || [];

        if (titleEl) titleEl.innerHTML = `<i class="fa-solid fa-wrench"></i> Historial de Servicios: [${a.asset_code || code || ''}] ${a.name || name || ''}`;
        if (subEl) subEl.innerText = `${a.brand ? a.brand + ' ' : ''}${a.model || ''} | Placa: ${a.license_plate || '-'} | Ubicación: ${a.current_location || 'Base'}`;
        if (plateEl) plateEl.innerText = a.license_plate || '-';
        if (odoEl) odoEl.innerText = `${Number(a.current_odometer || 0).toLocaleString()} Km`;
        if (countEl) countEl.innerText = `${data.services_count || 0} Realizados`;
        if (costEl) costEl.innerText = `$${Number(data.total_cost_usd || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} USD`;

        if (btnNew) {
            btnNew.onclick = () => {
                closeModal("modalVehicleServices");
                openRecordServiceModal(a.id, a.asset_code, a.name, a.current_odometer || 0);
            };
        }

        currentVehServicesList = services;
        currentVehServicesPage = 1;
        renderVehServicesTablePaginated();

    } catch (e) {
        if (tbody) tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #e11d48; padding: 16px;">Error al cargar servicios: ${e.message}</td></tr>`;
    }
}



function onRecordServiceTypeChange() {
    const type = document.getElementById("srv_type")?.value;
    const chk = document.getElementById("srv_reset_oil");
    const desc = document.getElementById("srv_reset_oil_desc");
    if (!chk) return;
    if (type === 'cambio_aceite_filtros' || type === 'mantenimiento_preventivo_mayor') {
        chk.checked = true;
        if (desc) desc.innerText = "Marcado: Este servicio incluye cambio de lubricante y reinicia el intervalo a 5.000 Km (Verde OK).";
    } else {
        chk.checked = false;
        if (desc) desc.innerText = "Desmarcado: Solo registra la reparación/cauchos en bitácora. El semáforo de aceite conserva su conteo de kilómetros.";
    }
}

function openRecordServiceModal(assetId, code, name, currentKm) {
    let modal = document.getElementById("modalRecordService");
    if (!modal) {
        const div = document.createElement("div");
        div.id = "modalRecordService";
        div.className = "modal-overlay hidden";
        div.innerHTML = `
        <div class="modal-card" style="max-width: 460px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <h3 style="font-size: 16px; font-weight: 800; color: #ea580c; display: flex; align-items: center; gap: 8px;">
                    <i class="fa-solid fa-wrench"></i> Registrar Mantenimiento / Servicio
                </h3>
                <button onclick="closeModal('modalRecordService')" style="background: none; border: none; font-size: 18px; color: #64748b; cursor: pointer;">&times;</button>
            </div>
            <form id="formRecordService" onsubmit="submitRecordService(event)">
                <input type="hidden" id="srv_asset_id">
                <div class="form-group" style="margin-bottom: 12px;">
                    <label style="font-size: 12px; font-weight: 700; color: #334155;">Vehículo / Equipo:</label>
                    <div id="srv_veh_label" style="font-weight: 800; color: var(--dalor-navy); font-size: 13px; padding: 8px; background: #f1f5f9; border-radius: 6px;"></div>
                </div>
                <div class="form-group" style="margin-bottom: 12px;">
                    <label style="font-size: 12px; font-weight: 700; color: #334155;">Tipo de Servicio *</label>
                    <select id="srv_type" class="form-control" onchange="onRecordServiceTypeChange()" required>
                        <option value="cambio_aceite_filtros">Cambio de Aceite y Filtros (5.000 Km)</option>
                        <option value="mantenimiento_preventivo_mayor">Mantenimiento Preventivo Mayor (Frenos/Tren/Correas)</option>
                        <option value="reparacion_correctiva">Reparación Mecánica Correctiva</option>
                        <option value="cambio_cauchos_alineacion">Cambio de Cauchos y Alineación</option>
                    </select>
                </div>
                <div class="form-group" style="margin-bottom: 12px; background: #fff7ed; padding: 10px; border-radius: 6px; border: 1px solid #fed7aa;">
                    <label style="display: flex; align-items: flex-start; gap: 8px; cursor: pointer; font-size: 11px; font-weight: 700; color: #9a3412;">
                        <input type="checkbox" id="srv_reset_oil" checked style="width: 16px; height: 16px; accent-color: #ea580c;">
                        <div>
                            <span>¿Reiniciar semáforo de cambio de aceite a 5.000 Km?</span>
                            <span id="srv_reset_oil_desc" style="display: block; font-size: 10px; font-weight: 500; color: #c2410c;">Marcado: Incluye cambio de lubricante y reinicia a 5.000 Km.</span>
                        </div>
                    </label>
                </div>
                <div class="form-group" style="margin-bottom: 12px;">
                    <label style="font-size: 12px; font-weight: 700; color: #334155;">Nuevo Odómetro al momento del Servicio (Km) *</label>
                    <input type="number" step="1" id="srv_odometer" class="form-control" required>
                </div>
                <div class="form-group" style="margin-bottom: 12px;">
                    <label style="font-size: 12px; font-weight: 700; color: #334155;">Costo Total del Servicio (USD)</label>
                    <input type="number" step="0.01" id="srv_cost" class="form-control" value="0.00">
                </div>
                <div class="form-group" style="margin-bottom: 16px;">
                    <label style="font-size: 12px; font-weight: 700; color: #334155;">Taller / Observaciones</label>
                    <textarea id="srv_notes" class="form-control" rows="2" placeholder="Ej: Taller Central - Aceite 15W40 mineral"></textarea>
                </div>
                <div style="display: flex; justify-content: flex-end; gap: 8px;">
                    <button type="button" onclick="closeModal('modalRecordService')" class="btn-secondary" style="font-size: 12px;">Cancelar</button>
                    <button type="submit" class="btn-primary" style="font-size: 12px; background: #ea580c;">
                        <i class="fa-solid fa-check"></i> Guardar en Bitácora
                    </button>
                </div>
            </form>
        </div>`;
        document.body.appendChild(div);
    }

    const idEl = document.getElementById("srv_asset_id");
    const labelEl = document.getElementById("srv_veh_label");
    const odoEl = document.getElementById("srv_odometer");
    const typeEl = document.getElementById("srv_type");

    if (idEl) idEl.value = assetId;
    if (labelEl) labelEl.innerText = `[${code}] ${name}`;
    if (odoEl) odoEl.value = currentKm;
    if (typeEl) {
        typeEl.value = "cambio_aceite_filtros";
        onRecordServiceTypeChange();
    }

    openModal("modalRecordService");
}

async function submitRecordService(event) {
    event.preventDefault();
    const assetId = document.getElementById("srv_asset_id").value;
    const resetOilEl = document.getElementById("srv_reset_oil");

    const payload = {
        new_odometer: parseFloat(document.getElementById("srv_odometer").value),
        service_type: document.getElementById("srv_type").value,
        cost_usd: parseFloat(document.getElementById("srv_cost").value) || 0.0,
        notes: document.getElementById("srv_notes").value,
        reset_oil_interval: resetOilEl ? resetOilEl.checked : undefined
    };

    try {
        const res = await authFetch(`${API_BASE}/assets/${assetId}/record-service`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            const data = await res.json();
            alert(data.message || "Servicio registrado exitosamente.");
            closeModal("modalRecordService");
            await loadFleetList();
            await openVehicleServicesModal(assetId);
        } else {
            const err = await res.json();
            alert("Error: " + (err.detail || JSON.stringify(err)));
        }
    } catch (e) {
        alert("Error al conectar con el servidor.");
    }
}



// ----------------------------------------------------

// 📸 CAPTURA & OCR DE ODÓMETRO VEHICULAR

// ----------------------------------------------------

function openOdometerOcrModal(assetId, code, name, plate, currentKm) {

    document.getElementById("odoAssetIdHidden").value = assetId;

    document.getElementById("odoImageUrlHidden").value = "";

    document.getElementById("odoVehicleSubtitle").innerText = `[${code}] ${name} - Placa: ${plate || 'N/A'}`;

    document.getElementById("odoCurrentKmDisplay").innerText = `${(currentKm || 0).toLocaleString()} Km`;

    

    // Resetear preview y resultados

    const previewBox = document.getElementById("odoPreviewBox");

    const resultBox = document.getElementById("odoResultBox");

    const btnConfirm = document.getElementById("btnConfirmOdometer");

    const fileInput = document.getElementById("odometerFileInput");

    

    if (previewBox) previewBox.style.display = "none";

    if (resultBox) resultBox.style.display = "none";

    if (btnConfirm) btnConfirm.style.display = "none";

    if (fileInput) fileInput.value = "";



    openModal("modalOdometerOcr");

}



async function handleOdometerImageSelected(event) {

    const file = event.target.files[0];

    if (!file) return;



    const previewBox = document.getElementById("odoPreviewBox");

    const previewImg = document.getElementById("odoPreviewImg");

    const scanningOverlay = document.getElementById("odoScanningOverlay");

    const resultBox = document.getElementById("odoResultBox");

    const btnConfirm = document.getElementById("btnConfirmOdometer");

    const detectedInput = document.getElementById("odoDetectedInput");

    const confidenceBadge = document.getElementById("odoConfidenceBadge");

    const notesEl = document.getElementById("odoDetectedNotes");

    const assetId = document.getElementById("odoAssetIdHidden").value;



    // Mostrar preview local

    const reader = new FileReader();

    reader.onload = function(e) {

        previewImg.src = e.target.result;

        previewBox.style.display = "block";

        scanningOverlay.style.display = "flex";

    };

    reader.readAsDataURL(file);



    resultBox.style.display = "none";

    btnConfirm.style.display = "none";



    // Enviar al backend para OCR

    try {

        const formData = new FormData();

        formData.append("file", file);

        if (assetId) formData.append("asset_id", assetId);



        const res = await authFetch(`${API_BASE}/ocr/scan-odometer`, {

            method: "POST",

            body: formData

        });



        if (!res.ok) throw new Error("Error en servidor OCR");



        const data = await res.json();

        scanningOverlay.style.display = "none";



        const odoVal = data.detected_odometer || 0;

        document.getElementById("odoImageUrlHidden").value = data.image_url || "";

        

        detectedInput.value = odoVal > 0 ? odoVal : "";

        confidenceBadge.innerText = data.is_ai_vision ? `IA Visión (${Math.round((data.confidence || 0.95)*100)}%)` : "Lectura OCR";

        notesEl.innerText = data.notes || "Verifica la lectura antes de confirmar.";



        resultBox.style.display = "block";

        btnConfirm.style.display = "inline-flex";



        if (odoVal > 0) {

            showRealtimeToast(`Odómetro leído: ${odoVal.toLocaleString()} Km`, 'ocr_flota', 'info');

        }

    } catch (err) {

        console.error("Error analizando odómetro:", err);

        scanningOverlay.style.display = "none";

        resultBox.style.display = "block";

        detectedInput.value = "";

        confidenceBadge.innerText = "Modo Manual";

        notesEl.innerText = "No se pudo leer automáticamente el tablero. Ingresa el kilometraje a mano.";

        btnConfirm.style.display = "inline-flex";

    }

}



async function submitConfirmOdometer(event) {

    event.preventDefault();

    const assetId = document.getElementById("odoAssetIdHidden").value;

    const reading = parseFloat(document.getElementById("odoDetectedInput").value);

    const photoUrl = document.getElementById("odoImageUrlHidden").value;



    if (isNaN(reading) || reading <= 0) {

        alert("Por favor ingresa un kilometraje válido mayor a 0.");

        return;

    }



    try {

        const res = await authFetch(`${API_BASE}/assets/${assetId}/record-odometer`, {

            method: "POST",

            headers: { "Content-Type": "application/json" },

            body: JSON.stringify({

                odometer_reading: reading,

                photo_url: photoUrl,

                reported_by: (currentUser && currentUser.full_name) ? currentUser.full_name : "Supervisor de Campo"

            })

        });



        if (!res.ok) throw new Error("Error al guardar odómetro");



        const data = await res.json();

        closeModal("modalOdometerOcr");
        showRealtimeToast(`✅ Odómetro registrado: ${reading.toLocaleString()} Km (${data.traffic_light.replace('_', ' ')})`, 'flota', 'success');
        await loadFleetList();
    } catch (err) {
        alert("Error al guardar odómetro: " + err.message);
    }
}


function openCalibrateOdometerModal(assetId, code, name, currentKm) {
    let modal = document.getElementById("modalCalibrateOdometer");
    if (!modal) {
        const div = document.createElement("div");
        div.id = "modalCalibrateOdometer";
        div.className = "modal-overlay hidden";
        div.innerHTML = `
        <div class="modal-card" style="max-width: 460px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <h3 style="font-size: 16px; font-weight: 800; color: #7c3aed; display: flex; align-items: center; gap: 8px;">
                    <i class="fa-solid fa-key"></i> Calibrar / Resetear Odómetro
                </h3>
                <button onclick="closeModal('modalCalibrateOdometer')" style="background: none; border: none; font-size: 18px; color: #64748b; cursor: pointer;">&times;</button>
            </div>
            <p style="font-size: 12px; color: #64748b; margin-bottom: 12px;">
                Esta función permite a la Dirección General calibrar o resetear a cero el odómetro base del vehículo mediante autorización criptográfica.
            </p>
            <form id="formCalibrateOdometer" onsubmit="submitCalibrateOdometer(event)">
                <input type="hidden" id="calib_asset_id">
                <div class="form-group" style="margin-bottom: 12px;">
                    <label style="font-size: 12px; font-weight: 700; color: #334155;">Vehículo Seleccionado:</label>
                    <div id="calib_veh_label" style="font-weight: 800; color: var(--dalor-navy); font-size: 13px; padding: 8px; background: #f1f5f9; border-radius: 6px;"></div>
                </div>
                <div class="form-group" style="margin-bottom: 12px;">
                    <label style="font-size: 12px; font-weight: 700; color: #334155;">Nuevo Odómetro Actual (Km) *</label>
                    <input type="number" step="1" id="calib_new_odometer" class="form-control" required placeholder="0">
                </div>
                <div class="form-group" style="margin-bottom: 12px;">
                    <label style="font-size: 12px; font-weight: 700; color: #334155;">Odómetro de Último Servicio (Km) *</label>
                    <input type="number" step="1" id="calib_service_odometer" class="form-control" required placeholder="0">
                    <small style="color: #64748b; font-size: 10px;">Si es puesta a cero, coloca el mismo valor que el odómetro actual.</small>
                </div>
                <div class="form-group" style="margin-bottom: 12px;">
                    <label style="font-size: 12px; font-weight: 700; color: #334155;">Motivo / Nota de Calibración</label>
                    <input type="text" id="calib_notes" class="form-control" value="Calibración y puesta a punto de odómetro por Dirección">
                </div>
                <div class="form-group" style="margin-bottom: 16px; background: #faf5ff; padding: 10px; border-radius: 6px; border: 1px solid #e9d5ff;">
                    <label style="font-size: 12px; font-weight: 800; color: #6b21a8;"><i class="fa-solid fa-lock"></i> Contraseña de Director General *</label>
                    <input type="password" id="calib_director_password" class="form-control" required placeholder="Ingresa clave de director (dalor2026)" style="border-color: #c4b5fd;">
                </div>
                <div style="display: flex; justify-content: flex-end; gap: 8px;">
                    <button type="button" onclick="closeModal('modalCalibrateOdometer')" class="btn-secondary">Cancelar</button>
                    <button type="submit" class="btn-primary" style="background: #7c3aed;">Confirmar Calibración</button>
                </div>
            </form>
        </div>
        `;
        document.body.appendChild(div);
    }

    document.getElementById("calib_asset_id").value = assetId;
    document.getElementById("calib_veh_label").innerText = `[${code}] ${name}`;
    document.getElementById("calib_new_odometer").value = currentKm || 0;
    document.getElementById("calib_service_odometer").value = currentKm || 0;
    document.getElementById("calib_director_password").value = "";
    openModal("modalCalibrateOdometer");
}

async function submitCalibrateOdometer(event) {
    event.preventDefault();
    const assetId = document.getElementById("calib_asset_id").value;
    const newKm = parseFloat(document.getElementById("calib_new_odometer").value);
    const servKm = parseFloat(document.getElementById("calib_service_odometer").value);
    const notes = document.getElementById("calib_notes").value;
    const password = document.getElementById("calib_director_password").value;

    if (isNaN(newKm) || newKm < 0) {
        alert("Por favor ingresa un odómetro válido.");
        return;
    }

    try {
        const res = await authFetch(`${API_BASE}/assets/${assetId}/calibrate-odometer`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                director_password: password,
                new_odometer: newKm,
                new_last_service_odometer: servKm,
                notes: notes
            })
        });

        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.detail || "Error al calibrar odómetro");
        }

        closeModal("modalCalibrateOdometer");
        showRealtimeToast(data.message || "Odómetro calibrado exitosamente.", "flota", "success");
        await loadFleetList();
    } catch (err) {
        alert("Error de autorización o calibración: " + err.message);
    }
}

function openCalibrateAllOdometersModal() {
    let modal = document.getElementById("modalCalibrateAllOdometers");
    if (!modal) {
        const div = document.createElement("div");
        div.id = "modalCalibrateAllOdometers";
        div.className = "modal-overlay hidden";
        div.innerHTML = `
        <div class="modal-card" style="max-width: 480px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <h3 style="font-size: 16px; font-weight: 800; color: #7c3aed; display: flex; align-items: center; gap: 8px;">
                    <i class="fa-solid fa-gauge-high"></i> Puesta a Cero / Calibrar Todos los Odómetros
                </h3>
                <button onclick="closeModal('modalCalibrateAllOdometers')" style="background: none; border: none; font-size: 18px; color: #64748b; cursor: pointer;">&times;</button>
            </div>
            <div style="background: #fdf2f8; border: 1px solid #fbcfe8; border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                <span style="color: #9d174d; font-size: 12px; font-weight: 700;">
                    <i class="fa-solid fa-triangle-exclamation"></i> Calibración Masiva de Flota:
                </span>
                <p style="color: #475569; font-size: 11px; margin-top: 4px;">
                    Esta acción calibrará simultáneamente los 8 vehículos oficiales de DALOR al kilometraje seleccionado (ej: 0 Km para arranque limpio de operación).
                </p>
            </div>
            <form id="formCalibrateAllOdometers" onsubmit="submitCalibrateAllOdometers(event)">
                <div class="form-group" style="margin-bottom: 12px;">
                    <label style="font-size: 12px; font-weight: 700; color: #334155;">Kilometraje Base Objetivo (Km) *</label>
                    <input type="number" step="1" id="bulk_target_odometer" class="form-control" value="0" required>
                </div>
                <div class="form-group" style="margin-bottom: 16px; background: #faf5ff; padding: 10px; border-radius: 6px; border: 1px solid #e9d5ff;">
                    <label style="font-size: 12px; font-weight: 800; color: #6b21a8;"><i class="fa-solid fa-lock"></i> Contraseña de Director General *</label>
                    <input type="password" id="bulk_director_password" class="form-control" required placeholder="Ingresa clave de director (dalor2026)" style="border-color: #c4b5fd;">
                </div>
                <div style="display: flex; justify-content: flex-end; gap: 8px;">
                    <button type="button" onclick="closeModal('modalCalibrateAllOdometers')" class="btn-secondary">Cancelar</button>
                    <button type="submit" class="btn-primary" style="background: #7c3aed;">Ejecutar Calibración Masiva</button>
                </div>
            </form>
        </div>
        `;
        document.body.appendChild(div);
    }
    document.getElementById("bulk_director_password").value = "";
    openModal("modalCalibrateAllOdometers");
}

async function submitCalibrateAllOdometers(event) {
    event.preventDefault();
    const targetKm = parseFloat(document.getElementById("bulk_target_odometer").value);
    const password = document.getElementById("bulk_director_password").value;

    if (isNaN(targetKm) || targetKm < 0) {
        alert("Por favor ingresa un kilometraje válido.");
        return;
    }

    try {
        const res = await authFetch(`${API_BASE}/assets/calibrate-all-odometers`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                director_password: password,
                target_odometer: targetKm,
                notes: "Calibración masiva de flota por Dirección General"
            })
        });

        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.detail || "Error en calibración masiva");
        }

        closeModal("modalCalibrateAllOdometers");
        showRealtimeToast(data.message || "Flota calibrada exitosamente.", "flota", "success");
        await loadFleetList();
    } catch (err) {
        alert("Error de autorización: " + err.message);
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

        const res = await authFetch(`${API_BASE}/assets/`, {

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

        const res = await authFetch(`${API_BASE}/assets/`);

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

                    <button onclick="openAssetHistoryModal(${m.id})" class="btn-primary" style="padding: 3px 8px; font-size: 11px; margin-right: 4px; background: #2563eb;" title="Ver Bitácora y Trazabilidad de Uso">
                        <i class="fa-solid fa-clock-rotate-left"></i> Bitácora
                    </button>
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

let rawToolsList = [];
let groupedToolsList = [];

async function loadToolsList() {
    const tbody = document.getElementById("toolsTableBody");
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px; color: #94a3b8;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando inventario de herramientas agrupadas...</td></tr>`;

    try {
        const res = await authFetch(`${API_BASE}/assets/tools-summary`);
        if (res.ok) {
            groupedToolsList = await res.json();
            rawToolsList = groupedToolsList.flatMap(g => g.items || []);
            renderGroupedTools(groupedToolsList);
            return;
        }

        // Fallback si endpoint no está disponible
        const fallbackRes = await authFetch(`${API_BASE}/assets/`);
        const assets = await fallbackRes.json();
        const nonTools = ['vehiculo', 'camioneta', 'camion', 'remolque', 'maquinaria', 'planta', 'generador', 'compresor'];
        rawToolsList = assets.filter(a => !nonTools.includes(a.asset_type));

        if (rawToolsList.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px; color: #94a3b8;">No hay herramientas registradas.</td></tr>`;
            return;
        }

        // Agrupar herramientas idénticas por nombre normalizado
        const groups = {};
        rawToolsList.forEach(t => {
            const key = (t.name || 'HERRAMIENTA GENERAL').trim().toUpperCase();
            if (!groups[key]) {
                groups[key] = {
                    name: t.name.trim(),
                    asset_type: t.asset_type || 'herramienta',
                    category: t.category || 'General',
                    items: [],
                    total: 0,
                    available: 0,
                    in_use: 0,
                    locations: new Set()
                };
            }
            groups[key].items.push(t);
            groups[key].total++;
            const inBase = t.status === 'disponible_base' || !t.current_project_id;
            if (inBase) {
                groups[key].available++;
            } else {
                groups[key].in_use++;
            }
            if (t.current_location) groups[key].locations.add(t.current_location);
        });

        groupedToolsList = Object.values(groups).map(g => ({
            ...g,
            locations: Array.from(g.locations)
        }));

        // Poblar selector dinámico de categorías de herramientas
        const catSelect = document.getElementById("toolCategoryFilter");
        if (catSelect) {
            const currentVal = catSelect.value || 'all';
            const categories = Array.from(new Set(rawToolsList.map(t => t.category).filter(Boolean))).sort();
            catSelect.innerHTML = `<option value="all">Todas las Categorías (${categories.length})</option>` +
                categories.map(c => `<option value="${c}" ${c === currentVal ? 'selected' : ''}>${c}</option>`).join('');
        }

        renderGroupedTools(groupedToolsList);

    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #e11d48; padding: 20px;">Error al cargar herramientas.</td></tr>`;
    }
}

let lastGroupedToolsList = [];
let toolsCurrentPage = 1;
let toolsPageSize = 10;

function goToToolsPage(page) {
    toolsCurrentPage = page;
    renderGroupedToolsPaginated();
    const tableEl = document.getElementById("toolsTableBody");
    if (tableEl) tableEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function changeToolsPageSize(size) {
    toolsPageSize = parseInt(size) || 10;
    toolsCurrentPage = 1;
    renderGroupedToolsPaginated();
}

function renderGroupedTools(list) {
    lastGroupedToolsList = list || [];
    toolsCurrentPage = 1;
    renderGroupedToolsPaginated();
}

function renderGroupedToolsPaginated() {
    const list = lastGroupedToolsList;
    const tbody = document.getElementById("toolsTableBody");
    const countBadge = document.getElementById("toolsCountBadge");
    if (countBadge) countBadge.innerText = `${list.length} modelos (${list.reduce((acc, g) => acc + g.total, 0)} unidades físicas)`;

    if (!tbody) return;
    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px; color: #94a3b8;">No se encontraron herramientas con los filtros seleccionados.</td></tr>`;
        const container = document.getElementById("toolsPaginationContainer");
        if (container) container.innerHTML = "";
        return;
    }

    const paginateFn = typeof window.renderPaginationControls === 'function' 
        ? window.renderPaginationControls 
        : (typeof renderPaginationControls === 'function' ? renderPaginationControls : () => ({ startIndex: 0, endIndex: list.length }));

    const { startIndex, endIndex } = paginateFn({
        containerId: "toolsPaginationContainer",
        totalItems: list.length,
        currentPage: toolsCurrentPage,
        pageSize: toolsPageSize,
        onPageChange: "goToToolsPage",
        onPageSizeChange: "changeToolsPageSize",
        itemLabel: "modelo(s) de herramientas",
        pageSizeOptions: [10, 20, 50, 100]
    });

    const pageItems = list.slice(startIndex, endIndex);

    tbody.innerHTML = pageItems.map((g, idx) => {
        const sampleCode = g.items[0]?.asset_code || 'HER';
        const sampleBrand = g.items[0]?.brand || '';
        const sampleModel = g.items[0]?.model ? `(${g.items[0].model})` : '';
        const locDisplay = g.locations.length > 0 ? g.locations.slice(0, 2).join(', ') : 'Sede Central';
        const rowCollapseId = `tool_units_row_${startIndex + idx}`;

        // Renderizar tabla interna de unidades individuales
        const unitsRows = g.items.map(it => {
            const isAvail = it.status === 'disponible_base' || !it.current_project_id;
            return `
                <tr style="border-bottom: 1px solid #e2e8f0; background: #ffffff;">
                    <td style="padding: 5px 8px; font-weight: 800; color: var(--dalor-navy); font-family: monospace;">${it.asset_code}</td>
                    <td style="padding: 5px 8px; font-size: 11px;">${it.brand || '-'} ${it.model || ''}</td>
                    <td style="padding: 5px 8px; font-family: monospace; font-size: 11px; color: #64748b;">${it.serial_number || '-'}</td>
                    <td style="padding: 5px 8px; font-size: 11px; color: #334155;">${it.current_location || 'Sede Central'}</td>
                    <td style="padding: 5px 8px; font-size: 11px; color: #2563eb; font-weight: 600;">${it.current_custodian_name || 'En Pañol Base'}</td>
                    <td style="padding: 5px 8px; text-align: center;">
                        <span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 800; ${isAvail ? 'background: #dcfce7; color: #166534;' : 'background: #fee2e2; color: #991b1b;'}">
                            ${isAvail ? 'DISPONIBLE' : 'EN OBRA'}
                        </span>
                    </td>
                    <td style="padding: 5px 8px; text-align: center;">
                        <button onclick="openAssetHistoryModal(${it.id}, '${it.asset_code}', '${(it.name || '').replace(/'/g, "\\'")}')" class="btn-secondary" style="padding: 2px 6px; font-size: 10px; color: #2563eb; border-color: #bfdbfe;" title="Ver Bitácora de esta unidad física">
                            <i class="fa-solid fa-clock-rotate-left"></i> Traza
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        return `
        <tr style="background: #ffffff; border-bottom: 1px solid #e2e8f0;">
            <td>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <button onclick="toggleToolUnitsBreakdown('${rowCollapseId}')" style="background: none; border: 1px solid #cbd5e1; border-radius: 4px; width: 22px; height: 22px; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; color: #0284c7;" title="Desplegar / Ocultar desglose de unidades físicas">
                        <i id="icon_${rowCollapseId}" class="fa-solid fa-chevron-right" style="font-size: 10px; transition: transform 0.2s;"></i>
                    </button>
                    <div>
                        <div style="font-weight: 800; color: var(--dalor-navy); cursor: pointer;" onclick="toggleToolUnitsBreakdown('${rowCollapseId}')">
                            ${g.name}
                        </div>
                        <div style="font-size: 10px; color: #64748b; font-family: monospace;">Muestra: ${sampleCode} ${sampleBrand} ${sampleModel}</div>
                    </div>
                </div>
            </td>
            <td><span style="font-size: 10px; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-weight: 700;">${(g.asset_type || 'HERRAMIENTA').toUpperCase().replace('_', ' ')}</span></td>
            <td style="text-align: center;">
                <span style="font-size: 12px; font-weight: 800; background: #e0e7ff; color: #3730a3; padding: 3px 8px; border-radius: 6px;">${g.total}</span>
            </td>
            <td style="text-align: center;">
                <span style="font-size: 12px; font-weight: 800; background: ${g.available > 0 ? '#dcfce7' : '#f1f5f9'}; color: ${g.available > 0 ? '#166534' : '#94a3b8'}; padding: 3px 8px; border-radius: 6px;">
                    ${g.available}
                </span>
            </td>
            <td style="text-align: center;">
                <span style="font-size: 12px; font-weight: 800; background: ${g.in_use > 0 ? '#fee2e2' : '#f1f5f9'}; color: ${g.in_use > 0 ? '#991b1b' : '#94a3b8'}; padding: 3px 8px; border-radius: 6px;">
                    ${g.in_use}
                </span>
            </td>
            <td style="font-size: 11px; color: #334155;">${locDisplay}</td>
            <td style="text-align: center; white-space: nowrap;">
                <button onclick="toggleToolUnitsBreakdown('${rowCollapseId}')" class="btn-secondary" style="padding: 3px 8px; font-size: 11px; margin-right: 4px; color: #475569; background: #f8fafc;" title="Ver desglose detallado de cada serial y unidad">
                    <i class="fa-solid fa-layer-group"></i> Desglose (${g.total})
                </button>
                ${g.available > 0 ? `
                    <button onclick="assignAvailableToolFromGroup('${encodeURIComponent(g.name)}')" class="btn-primary" style="padding: 3px 8px; font-size: 11px; margin-right: 4px;" title="Asignar una unidad disponible a obra">
                        <i class="fa-solid fa-arrow-right-from-bracket"></i> Asignar
                    </button>
                ` : ''}
                <button onclick="openToolHistoryModal('${encodeURIComponent(g.name)}')" class="btn-secondary" style="padding: 3px 8px; font-size: 11px; color: #0284c7; border-color: #bae6fd;" title="Ver Historial de Traza Global">
                    <i class="fa-solid fa-clock-rotate-left"></i> Traza
                </button>
            </td>
        </tr>
        <!-- FILA DE DESGLOSE DE UNIDADES INDIVIDUALES -->
        <tr id="${rowCollapseId}" class="hidden" style="background: #f8fafc;">
            <td colspan="7" style="padding: 12px 16px; border-left: 3px solid #0284c7;">
                <div style="font-size: 11px; font-weight: 800; color: #002B49; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
                    <span><i class="fa-solid fa-boxes-stacked" style="color: #0284c7;"></i> Desglose Unitario de [${g.name}] &bull; ${g.total} unidad(es) física(s) con serial y custodio:</span>
                    <span style="color: #64748b; font-weight: 600;">Disponibles: <b style="color: #166534;">${g.available}</b> | En Obra: <b style="color: #991b1b;">${g.in_use}</b></span>
                </div>
                <div style="border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; background: white;">
                    <table style="width: 100%; font-size: 11px; margin: 0;">
                        <thead>
                            <tr style="background: #f1f5f9; border-bottom: 1px solid #cbd5e1;">
                                <th style="padding: 6px 8px; text-align: left;">Código Dalor</th>
                                <th style="padding: 6px 8px; text-align: left;">Marca / Modelo</th>
                                <th style="padding: 6px 8px; text-align: left;">Serial Físico</th>
                                <th style="padding: 6px 8px; text-align: left;">Ubicación Actual</th>
                                <th style="padding: 6px 8px; text-align: left;">Custodio / Técnico</th>
                                <th style="padding: 6px 8px; text-align: center;">Estatus</th>
                                <th style="padding: 6px 8px; text-align: center;">Acción</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${unitsRows}
                        </tbody>
                    </table>
                </div>
            </td>
        </tr>`;
    }).join('');
}

function toggleToolUnitsBreakdown(rowId) {
    const row = document.getElementById(rowId);
    const icon = document.getElementById(`icon_${rowId}`);
    if (row) {
        const isHidden = row.classList.contains('hidden');
        if (isHidden) {
            row.classList.remove('hidden');
            if (icon) icon.style.transform = 'rotate(90deg)';
        } else {
            row.classList.add('hidden');
            if (icon) icon.style.transform = 'rotate(0deg)';
        }
    }
}
window.toggleToolUnitsBreakdown = toggleToolUnitsBreakdown;

function filterToolsList() {
    const q = (document.getElementById("toolSearchInput")?.value || '').trim().toLowerCase();
    const status = document.getElementById("toolStatusFilter")?.value || 'all';
    const cat = document.getElementById("toolCategoryFilter")?.value || 'all';

    let filtered = groupedToolsList.filter(g => {
        const matchText = !q || g.name.toLowerCase().includes(q) || (g.asset_type && g.asset_type.toLowerCase().includes(q)) || (g.category && g.category.toLowerCase().includes(q));
        let matchStatus = true;
        if (status === 'disponible') matchStatus = g.available > 0;
        if (status === 'en_obra') matchStatus = g.in_use > 0;
        let matchCat = true;
        if (cat !== 'all') {
            matchCat = g.category === cat || (g.items && g.items.some(it => it.category === cat));
        }
        return matchText && matchStatus && matchCat;
    });

    renderGroupedTools(filtered);
}

function assignAvailableToolFromGroup(encodedName) {
    const name = decodeURIComponent(encodedName);
    const unit = rawToolsList.find(t => t.name.trim().toUpperCase() === name.trim().toUpperCase() && (t.status === 'disponible_base' || !t.current_project_id));
    if (!unit) {
        alert("No hay unidades disponibles de esta herramienta en Base.");
        return;
    }
    openAssignModal('asset', unit.id, unit.name, 'assign');
}

let currentToolHistoryList = [];
let currentToolHistoryPage = 1;
let currentToolHistoryPageSize = 6;

function goToToolHistoryPage(page) {
    currentToolHistoryPage = page;
    renderToolHistoryTablePaginated();
}

function changeToolHistoryPageSize(size) {
    currentToolHistoryPageSize = parseInt(size) || 6;
    currentToolHistoryPage = 1;
    renderToolHistoryTablePaginated();
}

function renderToolHistoryTablePaginated() {
    const tbody = document.getElementById("toolHistoryTableBody");
    const container = document.getElementById("toolHistoryPagination");
    if (!tbody) return;

    if (!currentToolHistoryList || currentToolHistoryList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #94a3b8; padding: 16px;">No se registran movimientos para esta herramienta (permanece en Base Central).</td></tr>`;
        if (container) container.innerHTML = '';
        return;
    }

    const paginateFn = typeof window.renderPaginationControls === 'function' 
        ? window.renderPaginationControls 
        : (typeof renderPaginationControls === 'function' ? renderPaginationControls : () => ({ startIndex: 0, endIndex: currentToolHistoryList.length }));

    const { startIndex, endIndex } = paginateFn({
        containerId: "toolHistoryPagination",
        totalItems: currentToolHistoryList.length,
        currentPage: currentToolHistoryPage,
        pageSize: currentToolHistoryPageSize,
        onPageChange: "goToToolHistoryPage",
        onPageSizeChange: "changeToolHistoryPageSize",
        itemLabel: "movimiento(s) en traza",
        pageSizeOptions: [6, 12, 25],
        allowAll: true
    });

    const pageItems = currentToolHistoryList.slice(startIndex, endIndex);

    tbody.innerHTML = pageItems.map(h => `
        <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 8px; font-weight: 700; color: #64748b; font-size: 10px;">${h.assigned_at}</td>
            <td style="padding: 8px; font-weight: 800; color: var(--dalor-navy); font-family: monospace;">${h.resource_code}</td>
            <td style="padding: 8px;">
                <span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 700; ${h.status === 'en_obra' ? 'background: #e0f2fe; color: #0369a1;' : 'background: #dcfce7; color: #166534;'}">
                    ${h.status === 'en_obra' ? 'Despacho a Obra' : 'Retorno a Base'}
                </span>
            </td>
            <td style="padding: 8px; font-weight: 600;">${h.destination_location} (${h.project_name})</td>
            <td style="padding: 8px;">${h.custodian_name || h.driver_name || '-'}</td>
        </tr>
    `).join('');
}

async function openToolHistoryModal(encodedName) {
    const name = decodeURIComponent(encodedName);
    const modalTitle = document.getElementById("modalToolHistoryTitle");
    const modalSub = document.getElementById("modalToolHistorySubtitle");
    const tbody = document.getElementById("toolHistoryTableBody");

    if (modalTitle) modalTitle.innerHTML = `<i class="fa-solid fa-clock-rotate-left" style="color: var(--dalor-blue);"></i> Traza: ${name}`;
    if (modalSub) modalSub.innerText = `Histórico de movimientos de las unidades de este modelo.`;
    if (tbody) tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #94a3b8; padding: 16px;"><i class="fa-solid fa-spinner fa-spin"></i> Consultando traza...</td></tr>`;

    openModal("modalToolHistory");

    try {
        const res = await authFetch(`${API_BASE}/resources/history?name=${encodeURIComponent(name)}`);
        if (!res.ok) throw new Error("Error en servidor");
        const history = await res.json();

        currentToolHistoryList = history || [];
        currentToolHistoryPage = 1;
        renderToolHistoryTablePaginated();

    } catch (e) {
        if (tbody) tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #e11d48; padding: 16px;">Error al cargar la traza de movimientos.</td></tr>`;
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

        const res = await authFetch(`${API_BASE}/assets/`, {

            method: "POST",

            headers: { "Content-Type": "application/json" },

            body: JSON.stringify(payload)

        });

        if (res.ok) {

            alert("Herramienta/Equipo registrado exitosamente.");

            closeModal("modalTool");

            await loadInitialMasterData();

            loadToolsList();
            if (typeof loadMachineryList === "function") loadMachineryList();
            if (typeof loadFleetList === "function") loadFleetList();

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

        await authFetch(`${API_BASE}/assets/${assetId}`, { method: "DELETE" });

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

let rawPersonnelList = [];

async function loadPersonnelTableList() {
    const tbody = document.getElementById("matrixPersonnelTableBody");
    if (tbody) tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px; color: #94a3b8;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando personal...</td></tr>`;

    try {
        const res = await authFetch(`${API_BASE}/personnel/`);
        allPersonnel = await res.json();
        rawPersonnelList = Array.isArray(allPersonnel) ? allPersonnel : [];

        // Poblar selector dinámico de roles de personal
        const roleSelect = document.getElementById("personnelRoleFilter");
        if (roleSelect) {
            const currentVal = roleSelect.value || 'all';
            const roles = Array.from(new Set(rawPersonnelList.map(p => (p.role_title || '').trim()).filter(Boolean))).sort();
            roleSelect.innerHTML = `<option value="all">Todos los Cargos / Roles (${roles.length})</option>` +
                roles.map(r => `<option value="${r}" ${r === currentVal ? 'selected' : ''}>${r}</option>`).join('');
        }

        filterPersonnelList();

    } catch (e) {
        if (tbody) tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #e11d48;">Error al cargar personal: ${e?.message || e}</td></tr>`;
    }
}

function filterPersonnelList() {
    const q = (document.getElementById("personnelSearchInput")?.value || '').trim().toLowerCase();
    const role = document.getElementById("personnelRoleFilter")?.value || 'all';
    const status = document.getElementById("personnelStatusFilter")?.value || 'all';
    const countBadge = document.getElementById("personnelCountBadge");
    const tbody = document.getElementById("matrixPersonnelTableBody");

    let filtered = (rawPersonnelList || []).filter(p => {
        const safeCode = (p?.code || '').toLowerCase();
        const safeName = (p?.full_name || '').toLowerCase();
        const safePhone = (p?.phone || '').toLowerCase();
        const safeRole = (p?.role_title || '').toLowerCase();
        const matchText = !q || safeCode.includes(q) || safeName.includes(q) || safePhone.includes(q) || safeRole.includes(q);

        let matchRole = true;
        if (role !== 'all') matchRole = (p?.role_title || '').trim() === role;

        const inBase = p?.status === 'disponible_base' || !p?.current_project_id;
        let matchStatus = true;
        if (status === 'disponible_base') matchStatus = inBase;
        if (status === 'en_obra') matchStatus = !inBase;

        return matchText && matchRole && matchStatus;
    });

    if (countBadge) countBadge.innerText = `${filtered.length} de ${rawPersonnelList.length} empleados`;

    if (!tbody) return;

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px; color: #94a3b8;">No se encontraron empleados con los criterios de búsqueda.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(p => {
        const inBase = p?.status === 'disponible_base' || !p?.current_project_id;
        const locStr = p?.current_location || (inBase ? 'Sede Central Dalor (Guacara)' : 'En Obra / Proyecto');
        const safeName = (p?.full_name || '').replace(/'/g, "\\'");
        const pId = p?.id ?? 0;

        return `
        <tr>
            <td style="font-weight: 800; color: var(--dalor-blue); font-family: monospace;">${p?.code || '-'}</td>
            <td style="font-weight: 700; color: var(--dalor-navy);">${p?.full_name || '-'}</td>
            <td><span style="font-size: 11px; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-weight: 600;">${p?.role_title || '-'}</span></td>
            <td>${p?.phone || '-'}</td>
            <td>
                <span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 800; ${inBase ? 'background: #dcfce7; color: #166534;' : 'background: #e0f2fe; color: #0369a1;'}">
                    <i class="fa-solid ${inBase ? 'fa-warehouse' : 'fa-helmet-safety'}"></i> ${inBase ? 'DISPONIBLE EN BASE' : 'EN OBRA'}
                </span>
            </td>
            <td>${locStr}</td>
            <td style="text-align: center; white-space: nowrap;">
                <button onclick="openPersonnelHistoryModal(${pId}, '${p?.code || ''}', '${safeName}')" class="btn-secondary" style="padding: 3px 6px; font-size: 11px; margin-right: 4px; color: #2563eb; border-color: #93c5fd;" title="Ver Bitácora & Trazabilidad de Asignaciones (Punto 6)">
                    <i class="fa-solid fa-clock-rotate-left"></i> Bitácora
                </button>
                ${inBase ? `
                    <button onclick="openAssignModal('personnel', ${pId}, '${safeName}', 'assign')" class="btn-primary" style="padding: 3px 8px; font-size: 11px;">
                        Asignar a Obra
                    </button>
                ` : `
                    <button onclick="openAssignModal('personnel', ${pId}, '${safeName}', 'transfer')" class="btn-secondary" style="padding: 3px 6px; font-size: 11px;" title="Transferir a otra obra">
                        <i class="fa-solid fa-arrows-split-up-and-left"></i>
                    </button>
                    <button onclick="returnResourceToBase('personnel', ${pId})" class="btn-primary" style="padding: 3px 6px; font-size: 11px; margin-left: 4px; background: #059669;" title="Devolver a Sede Central">
                        <i class="fa-solid fa-warehouse"></i>
                    </button>
                `}
            </td>
        </tr>`;
    }).join('');
}



function openAssignModal(type, id, name, action) {

    document.getElementById("modal_res_type").value = type;

    document.getElementById("modal_res_id").value = id;

    document.getElementById("modal_action_type").value = action;

    

    const isAsset = type === 'asset';

    document.getElementById("modal_odometer_container").style.display = isAsset ? 'block' : 'none';

    document.getElementById("modal_custodian_container").style.display = isAsset ? 'block' : 'none';



    // Poblar dinámicamente proyectos si está vacío o desactualizado (Solo Obras Abiertas)
    const projSelect = document.getElementById("modal_target_project_id");
    if (projSelect) {
        let safeProjects = (window.allProjects && window.allProjects.length > 0) ? window.allProjects : (allProjects || []);
        const openProjects = (safeProjects || []).filter(p => {
            const st = (p.status || '').toLowerCase().trim();
            return !['culminado', 'completado', 'cerrado', 'cancelado', 'finalizado', 'inactivo'].includes(st);
        });

        if (openProjects.length > 0) {
            projSelect.innerHTML = `<option value="">-- Seleccione Proyecto Destino Activo --</option>` +
                openProjects.map(p => `<option value="${p.id}" data-loc="${p.location || 'Sede Central'}">[${p.code}] ${p.name} (${p.location || 'Sede Central'})</option>`).join('');
            
            projSelect.onchange = function() {
                const opt = this.options[this.selectedIndex];
                const loc = opt ? opt.getAttribute("data-loc") : "";
                const locInput = document.getElementById("modal_res_location");
                if (locInput && loc) locInput.value = loc;
            };
        } else {
            projSelect.innerHTML = `<option value="">⚠️ No hay obras abiertas disponibles</option>`;
        }
    }


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

        const res = await authFetch(endpoint, {

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
            if (typeof loadMachineryList === 'function') loadMachineryList();
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

        const res = await authFetch(`${API_BASE}/resources/return-to-base`, {

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





// --- BLOQUE L12242-L12541 ---
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

    // Poblar categorías dinámicamente desde activos existentes
    const catSelect = document.getElementById("nass_category");
    const newCatInput = document.getElementById("nass_new_category");
    if (newCatInput) {
        newCatInput.classList.add('hidden');
        newCatInput.value = '';
    }

    if (catSelect) {
        const existingCats = Array.from(new Set((allAssets || []).map(a => a.category).filter(Boolean))).sort();
        const baseCats = ["Herramientas Manuales", "Herramientas Eléctricas", "Equipos de Medición", "Seguridad Industrial", "Consumibles de Taller", "Flota Vehicular", "Maquinaria Pesada", "Herramientas Generales"];
        const combined = Array.from(new Set([...baseCats, ...existingCats]));

        catSelect.innerHTML = combined.map(c => `<option value="${c}">${c}</option>`).join('') +
            `<option value="__NEW__" style="font-weight: 800; color: #2563eb;">+ Crear Nueva Categoría...</option>`;
    }

    const locInput = document.getElementById("nass_location");
    if (locInput) locInput.value = "Sede Central Dalor (Guacara)";

    onAssetTypeChanged();
    openModal("modalNewAsset");
}

function onAssetCategorySelected() {
    const sel = document.getElementById("nass_category");
    const input = document.getElementById("nass_new_category");
    if (!sel || !input) return;
    if (sel.value === '__NEW__') {
        input.classList.remove('hidden');
        input.required = true;
        input.focus();
    } else {
        input.classList.add('hidden');
        input.required = false;
    }
}

function openNewToolModal_v2() {
    openNewAssetModal('herramienta_mayor');
}

function openNewVehicleModal_v2() {
    openNewAssetModal('vehiculo');
}

function onAssetTypeChanged() {
    const type = document.getElementById("nass_type")?.value || 'herramienta_mayor';
    const title = document.getElementById("newAssetModalTitle");
    const serialLabel = document.getElementById("nass_serial_label");
    const odometerLabel = document.getElementById("nass_odometer_label");
    const guideText = document.getElementById("nass_nomenclature_text");
    const codeInput = document.getElementById("nass_code");
    const catSelect = document.getElementById("nass_category");

    const assets = allAssets || [];

    if (type === 'vehiculo') {
        if (title) title.innerHTML = '<i class="fa-solid fa-truck" style="color: #6366f1;"></i> Registrar Nuevo Vehículo de Flota / Carga';
        if (serialLabel) serialLabel.textContent = "Placa del Vehículo *";
        if (odometerLabel) odometerLabel.textContent = "Kilometraje Inicial (Km)";
        if (guideText) guideText.innerHTML = 'Nomenclatura Dalor Flota: <b>[Piso]-[Tipo V]-[Área]-[Correlativo]</b> (Ej: <code>1-V-1-09</code>) o <b>FLT-XXX</b> (Ej: <code>FLT-009</code>).';
        if (catSelect) catSelect.value = "Flota Vehicular";

        const fltVehs = assets.filter(a => a.asset_type === 'vehiculo' || (a.asset_code && a.asset_code.includes('-V-')));
        const nextNum = fltVehs.length + 1;
        if (codeInput) codeInput.value = `3-V-1-${String(nextNum).padStart(2, '0')}`;
    } else if (type === 'maquinaria') {
        if (title) title.innerHTML = '<i class="fa-solid fa-gears" style="color: #d97706;"></i> Registrar Nueva Maquinaria Pesada / Planta / Compresor';
        if (serialLabel) serialLabel.textContent = "Serial del Fabricante";
        if (odometerLabel) odometerLabel.textContent = "Horómetro Inicial (Horas)";
        if (guideText) guideText.innerHTML = 'Nomenclatura Dalor Maquinaria: Prefijo <b>MAQ-</b> o <b>EQ-</b> (Ej: <code>MAQ-002</code> o <code>EQ-PLANTA-01</code>).';
        if (catSelect) catSelect.value = "Maquinaria Pesada";

        const maqs = assets.filter(a => a.asset_type === 'maquinaria' || (a.asset_code && a.asset_code.startsWith('MAQ-')));
        const nextNum = maqs.length + 1;
        if (codeInput) codeInput.value = `MAQ-${String(nextNum).padStart(3, '0')}`;
    } else if (type === 'equipo_medicion') {
        if (title) title.innerHTML = '<i class="fa-solid fa-scale-unbalanced" style="color: #8b5cf6;"></i> Registrar Nuevo Equipo de Medición / Calibración';
        if (serialLabel) serialLabel.textContent = "Serial / Certificado Calibración";
        if (odometerLabel) odometerLabel.textContent = "Usos / Horómetro";
        if (guideText) guideText.innerHTML = 'Nomenclatura Dalor Medición: Prefijo <b>MED-</b> o código Pañol <b>1-D-X-XX</b> (Ej: <code>MED-002</code> o <code>1-D-1-26-3</code>).';
        if (catSelect) catSelect.value = "Equipos de Medición";

        const meds = assets.filter(a => a.asset_type === 'equipo_medicion' || (a.asset_code && a.asset_code.startsWith('MED-')));
        const nextNum = meds.length + 1;
        if (codeInput) codeInput.value = `MED-${String(nextNum).padStart(3, '0')}`;
    } else {
        if (title) title.innerHTML = '<i class="fa-solid fa-toolbox" style="color: var(--dalor-blue);"></i> Registrar Nueva Herramienta / Equipo';
        if (serialLabel) serialLabel.textContent = "Serial / Identificador";
        if (odometerLabel) odometerLabel.textContent = "Horómetro / Contador";
        if (guideText) guideText.innerHTML = 'Nomenclatura Dalor Herramientas: Prefijo <b>HERR-</b> (Ej: <code>HERR-0908</code>) o Código Pañol <b>[Gaveta]-[Letra]-[Nivel]-[Ítem]</b> (Ej: <code>1-J-1-28</code>).';
        if (catSelect && (catSelect.value === 'Flota Vehicular' || catSelect.value === 'Maquinaria Pesada')) {
            catSelect.value = "Herramientas Manuales";
        }

        const herrCodes = assets.map(a => a.asset_code).filter(c => c && c.startsWith('HERR-')).map(c => parseInt(c.replace('HERR-', '')) || 0);
        const maxHerr = herrCodes.length > 0 ? Math.max(...herrCodes) : 907;
        if (codeInput) codeInput.value = `HERR-${String(maxHerr + 1).padStart(4, '0')}`;
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
    const location = document.getElementById("nass_location").value.trim() || "Sede Central Dalor (Guacara)";
    const custodian = document.getElementById("nass_custodian").value.trim() || "Disponible en Base";

    let category = document.getElementById("nass_category")?.value || "General";
    if (category === '__NEW__') {
        category = (document.getElementById("nass_new_category")?.value || '').trim() || "General";
    }

    const payload = {
        asset_code: code,
        name: name,
        asset_type: type,
        category: category,
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
        const res = await authFetch(`${API_BASE}/assets/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || "Error al crear activo");
        }

        closeModal("modalNewAsset");
        alert(`✅ Activo ${code} (${name}) registrado exitosamente en categoría "${category}".`);

        await loadInitialMasterData();
        loadFleetList();
        loadToolsList();
        if (typeof loadMachineryList === "function") loadMachineryList();

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

    // Auto-sugerir siguiente correlativo PERS-XXX
    const persList = allPersonnel || [];
    const nums = persList.map(p => {
        const m = (p.code || '').match(/(\d+)/);
        return m ? parseInt(m[1]) : 0;
    });
    const maxNum = nums.length > 0 ? Math.max(...nums) : 18;
    const nextCode = `PERS-${String(maxNum + 1).padStart(3, '0')}`;
    const codeInput = document.getElementById("npers_code");
    if (codeInput) codeInput.value = nextCode;

    const locInput = document.getElementById("npers_location");
    if (locInput) locInput.value = "Sede Central Dalor (Guacara)";

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
    const location = document.getElementById("npers_location").value.trim() || "Sede Central Dalor (Guacara)";

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
        const res = await authFetch(`${API_BASE}/personnel/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || "Error al registrar empleado");
        }

        closeModal("modalNewPersonnel");
        alert(`✅ Empleado ${fullName} (${role || 'Personal'}) registrado exitosamente.`);

        await loadInitialMasterData();
        loadPersonnelTableList();

    } catch (err) {
        alert(`❌ Error: ${err.message}`);
    }
}






let currentAssetTimelineList = [];
let currentAssetTimelinePage = 1;
let currentAssetTimelinePageSize = 6;

function goToAssetHistoryPage(page) {
    currentAssetTimelinePage = page;
    renderAssetHistoryTablePaginated();
}

function changeAssetHistoryPageSize(size) {
    currentAssetTimelinePageSize = parseInt(size) || 6;
    currentAssetTimelinePage = 1;
    renderAssetHistoryTablePaginated();
}

function renderAssetHistoryTablePaginated() {
    const tbody = document.getElementById("assetHistoryTableBody");
    const container = document.getElementById("assetHistoryPagination");
    if (!tbody) return;

    if (!currentAssetTimelineList || currentAssetTimelineList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #94a3b8; padding: 20px;">No se registran salidas ni movimientos históricos para este activo (Permanece en Base Central).</td></tr>`;
        if (container) container.innerHTML = '';
        return;
    }

    const paginateFn = typeof window.renderPaginationControls === 'function' 
        ? window.renderPaginationControls 
        : (typeof renderPaginationControls === 'function' ? renderPaginationControls : () => ({ startIndex: 0, endIndex: currentAssetTimelineList.length }));

    const { startIndex, endIndex } = paginateFn({
        containerId: "assetHistoryPagination",
        totalItems: currentAssetTimelineList.length,
        currentPage: currentAssetTimelinePage,
        pageSize: currentAssetTimelinePageSize,
        onPageChange: "goToAssetHistoryPage",
        onPageSizeChange: "changeAssetHistoryPageSize",
        itemLabel: "registro(s) en bitácora",
        pageSizeOptions: [6, 12, 25],
        allowAll: true
    });

    const pageItems = currentAssetTimelineList.slice(startIndex, endIndex);

    tbody.innerHTML = pageItems.map(t => {
        let badgeBg = '#f1f5f9', badgeColor = '#475569', typeLabel = 'Movimiento';
        if (t.type === 'guia_despacho') { badgeBg = '#dbeafe'; badgeColor = '#1d4ed8'; typeLabel = 'Guía Despacho'; }
        else if (t.type === 'alquiler_prestamo') { badgeBg = '#fef3c7'; badgeColor = '#b45309'; typeLabel = 'Alquiler/Préstamo'; }
        else if (t.status === 'disponible_base') { badgeBg = '#dcfce7'; badgeColor = '#15803d'; typeLabel = 'Retorno a Base'; }
        else { badgeBg = '#e0e7ff'; badgeColor = '#4338ca'; typeLabel = 'Asignación Obra'; }

        return `
            <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 8px; font-weight: 600; color: #475569; white-space: nowrap;">${t.date}</td>
                <td style="padding: 8px;"><span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 800; background: ${badgeBg}; color: ${badgeColor};">${typeLabel}</span></td>
                <td style="padding: 8px; font-family: monospace; font-weight: 800; color: var(--dalor-navy);">${t.transfer_code || '-'}</td>
                <td style="padding: 8px;"><span style="font-weight: 700; color: #1e293b;">${t.project_code ? `[${t.project_code}] ` : ''}${t.destination || t.project_name}</span></td>
                <td style="padding: 8px; font-weight: 700; color: #2563eb;">${t.driver_name || t.responsible_person || '-'}</td>
                <td style="padding: 8px; text-align: right; font-weight: 800; color: #059669;">${t.odometer != null ? Number(t.odometer).toLocaleString() + ' Km' : '-'}</td>
                <td style="padding: 8px; color: #64748b; font-size: 11px;">${t.notes || '-'}</td>
            </tr>
        `;
    }).join('');
}

async function openAssetHistoryModal(assetId, assetCode = null, assetName = null) {
    const titleEl = document.getElementById("assetHistoryTitle");
    const subEl = document.getElementById("assetHistorySubtitle");
    const locEl = document.getElementById("assetHistCurrentLoc");
    const custEl = document.getElementById("assetHistCustodian");
    const odoEl = document.getElementById("assetHistOdometer");
    const statusEl = document.getElementById("assetHistStatusBadge");
    const tbody = document.getElementById("assetHistoryTableBody");

    const matched = (allAssets || []).find(a => a.id === assetId) || {};
    const code = assetCode || matched.asset_code || matched.code || `ACT-${assetId}`;
    const name = assetName || matched.name || 'Activo / Maquinaria';

    if (titleEl) titleEl.innerHTML = `<i class="fa-solid fa-clock-rotate-left" style="color: #2563eb;"></i> Bitácora & Trazabilidad: [${code}] ${name}`;
    if (subEl) subEl.innerText = `Consultando historial de asignaciones, choferes, obras y despachos...`;
    if (tbody) tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #94a3b8; padding: 20px;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando bitácora de uso...</td></tr>`;

    openModal("modalAssetHistory");

    try {
        const token = sessionStorage.getItem('dalor_token') || localStorage.getItem('dalor_token') || window.authToken || '';
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        const res = await authFetch(`${API_BASE}/assets/${assetId}/history`, { headers });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const a = data.asset || {};
        const timeline = data.timeline || [];

        if (subEl) subEl.innerText = `${a.brand ? a.brand + ' ' : ''}${a.model || ''} | Placa/Serial: ${a.license_plate || '-'} | Ubicación Actual: ${a.current_location || 'Base'}`;
        if (locEl) locEl.innerText = a.current_location || "Sede Central Dalor";
        if (custEl) custEl.innerText = a.current_custodian || "Disponible en Base";
        if (odoEl) odoEl.innerText = `${Number(a.current_odometer || 0).toLocaleString()} Km`;
        if (statusEl) {
            const inBase = a.status === 'disponible_base' || !a.current_project_id;
            statusEl.innerHTML = `<span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 800; ${inBase ? 'background: #dcfce7; color: #166534;' : 'background: #e0f2fe; color: #0369a1;'}">${(a.status || 'DISPONIBLE').toUpperCase().replace(/_/g, ' ')}</span>`;
        }

        currentAssetTimelineList = timeline;
        currentAssetTimelinePage = 1;
        renderAssetHistoryTablePaginated();

    } catch (e) {
        if (tbody) tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #e11d48; padding: 20px;">Error al cargar bitácora del activo: ${e.message}</td></tr>`;
    }
}

let currentPersonnelTimelineList = [];
let currentPersonnelTimelinePage = 1;
let currentPersonnelTimelinePageSize = 6;
let currentPersonnelItem = null;

function goToPersonnelHistoryPage(page) {
    currentPersonnelTimelinePage = page;
    renderPersonnelHistoryTablePaginated();
}

function changePersonnelHistoryPageSize(size) {
    currentPersonnelTimelinePageSize = parseInt(size) || 6;
    currentPersonnelTimelinePage = 1;
    renderPersonnelHistoryTablePaginated();
}

function renderPersonnelHistoryTablePaginated() {
    const tbody = document.getElementById("personnelHistoryTableBody");
    const container = document.getElementById("personnelHistoryPagination");
    if (!tbody) return;

    if (!currentPersonnelTimelineList || currentPersonnelTimelineList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #94a3b8; padding: 20px;">No se registran asignaciones ni traslados históricos para este colaborador (Permanece en Base Central).</td></tr>`;
        if (container) container.innerHTML = '';
        return;
    }

    const paginateFn = typeof window.renderPaginationControls === 'function' 
        ? window.renderPaginationControls 
        : (typeof renderPaginationControls === 'function' ? renderPaginationControls : () => ({ startIndex: 0, endIndex: currentPersonnelTimelineList.length }));

    const { startIndex, endIndex } = paginateFn({
        containerId: "personnelHistoryPagination",
        totalItems: currentPersonnelTimelineList.length,
        currentPage: currentPersonnelTimelinePage,
        pageSize: currentPersonnelTimelinePageSize,
        onPageChange: "goToPersonnelHistoryPage",
        onPageSizeChange: "changePersonnelHistoryPageSize",
        itemLabel: "registro(s) en bitácora",
        pageSizeOptions: [6, 12, 25],
        allowAll: true
    });

    const pageItems = currentPersonnelTimelineList.slice(startIndex, endIndex);

    tbody.innerHTML = pageItems.map(t => {
        let badgeBg = '#f1f5f9', badgeColor = '#475569', typeLabel = 'Movimiento';
        if (t.type === 'chofer_despacho') {
            badgeBg = '#dbeafe'; badgeColor = '#1d4ed8'; typeLabel = '🚛 Conductor Guía';
        } else if (t.type === 'receptor_guia' || t.type === 'guia_despacho') {
            badgeBg = '#e0f2fe'; badgeColor = '#0369a1'; typeLabel = '📦 Receptor en Obra';
        } else if (t.type === 'retorno_base' || t.status === 'disponible_base') {
            badgeBg = '#dcfce7'; badgeColor = '#15803d'; typeLabel = '🏠 Retorno a Base';
        } else if (t.type === 'transferencia_obra') {
            badgeBg = '#ffedd5'; badgeColor = '#c2410c'; typeLabel = '🔄 Transferencia Obra';
        } else {
            badgeBg = '#e0e7ff'; badgeColor = '#4338ca'; typeLabel = '🏗️ Asignación a Obra';
        }

        const roleText = t.role_in_project || t.role || (currentPersonnelItem && currentPersonnelItem.role_title) || '-';

        return `
            <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 8px; font-weight: 600; color: #475569; white-space: nowrap;">${t.date}</td>
                <td style="padding: 8px;"><span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 800; background: ${badgeBg}; color: ${badgeColor};">${typeLabel}</span></td>
                <td style="padding: 8px;"><span style="font-weight: 700; color: #1e293b;">${t.project_code ? `[${t.project_code}] ` : ''}${t.destination || t.project_name || '-'}</span></td>
                <td style="padding: 8px; font-weight: 600; color: #2563eb;">${roleText}</td>
                <td style="padding: 8px; color: #64748b; font-size: 11px;">
                    ${t.transfer_code ? `<b style="color: var(--dalor-navy); font-family: monospace;">[${t.transfer_code}]</b> ` : ''}${t.notes || '-'}
                </td>
            </tr>
        `;
    }).join('');
}

async function openPersonnelHistoryModal(personnelId, personnelCode = null, personnelName = null) {
    const titleEl = document.getElementById("personnelHistoryTitle");
    const subEl = document.getElementById("personnelHistorySubtitle");
    const locEl = document.getElementById("persHistCurrentLoc");
    const roleEl = document.getElementById("persHistRole");
    const prjEl = document.getElementById("persHistTotalProjects");
    const statusEl = document.getElementById("persHistStatusBadge");
    const tbody = document.getElementById("personnelHistoryTableBody");

    const safePersonnel = (window.allPersonnel && window.allPersonnel.length > 0) ? window.allPersonnel : (allPersonnel || []);
    const matched = safePersonnel.find(p => p.id === personnelId) || {};
    const code = personnelCode || matched.code || `EMP-${personnelId}`;
    const name = personnelName || matched.full_name || 'Personal / Colaborador';

    if (titleEl) titleEl.innerHTML = `<i class="fa-solid fa-user-clock" style="color: #2563eb;"></i> Bitácora & Trazabilidad: [${code}] ${name}`;
    if (subEl) subEl.innerText = `Cargando historial cronológico de obras, roles y guías de despacho...`;
    if (tbody) tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #94a3b8; padding: 20px;"><i class="fa-solid fa-spinner fa-spin"></i> Consultando bitácora del colaborador...</td></tr>`;

    openModal("modalPersonnelHistory");

    try {
        const token = sessionStorage.getItem('dalor_token') || localStorage.getItem('dalor_token') || window.authToken || '';
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        const res = await authFetch(`${API_BASE}/personnel/${personnelId}/history`, { headers });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const p = data.personnel || {};
        const timeline = data.timeline || [];

        if (subEl) subEl.innerText = `Cédula: ${p.identification_id || p.dni || '-'} | Cargo: ${p.role_title || 'Colaborador'} | Teléfono: ${p.phone || '-'}`;
        if (locEl) locEl.innerText = p.current_location || "Sede Central Dalor (Guacara)";
        if (roleEl) roleEl.innerText = p.role_title || "Colaborador";
        if (prjEl) prjEl.innerText = `${p.total_projects_assigned || timeline.length} registro(s)`;
        if (statusEl) {
            const inBase = p.status === 'disponible_base' || !p.current_project_id;
            statusEl.innerHTML = `<span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 800; ${inBase ? 'background: #dcfce7; color: #166534;' : 'background: #e0f2fe; color: #0369a1;'}">${(p.status || 'DISPONIBLE').toUpperCase().replace(/_/g, ' ')}</span>`;
        }

        currentPersonnelItem = p;
        currentPersonnelTimelineList = timeline;
        currentPersonnelTimelinePage = 1;
        renderPersonnelHistoryTablePaginated();

    } catch (e) {
        if (tbody) tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #e11d48; padding: 20px;">Error al cargar bitácora del colaborador: ${e.message}</td></tr>`;
    }
}

// --- PUENTE DE COMPATIBILIDAD CON WINDOW & HTML INLINE ---
if (typeof window !== 'undefined') {
    window.deleteAssetItem = deleteAssetItem;
    window.handleOdometerImageSelected = handleOdometerImageSelected;
    window.loadFleetList = loadFleetList;
    window.loadFleetTable = loadFleetList;
    window.loadMachineryList = loadMachineryList;
    window.loadPersonnelTableList = loadPersonnelTableList;
    window.loadResourceDashboard = loadResourceDashboard;
    window.loadToolsList = loadToolsList;
    window.onAssetTypeChanged = onAssetTypeChanged;
    window.openAssignModal = openAssignModal;
    window.openNewAssetModal = openNewAssetModal;
    window.openNewPersonnelModal = openNewPersonnelModal;
    window.openNewToolModal = openNewToolModal;
    window.openNewToolModal_v2 = openNewToolModal_v2;
    window.openNewVehicleModal = openNewVehicleModal;
    window.openNewVehicleModal_v2 = openNewVehicleModal_v2;
    window.openOdometerOcrModal = openOdometerOcrModal;
    window.openRecordServiceModal = openRecordServiceModal;
    window.openResourceSubtab = openResourceSubtab;
    window.returnResourceToBase = returnResourceToBase;
    window.submitConfirmOdometer = submitConfirmOdometer;
    window.submitCreateAsset = submitCreateAsset;
    window.submitCreatePersonnel = submitCreatePersonnel;
    window.submitCreateTool = submitCreateTool;
    window.submitCreateVehicle = submitCreateVehicle;
    window.submitRecordService = submitRecordService;
    window.submitResourceAction = submitResourceAction;
    window.switchResourceSubtab = switchResourceSubtab;
    window.openCalibrateOdometerModal = openCalibrateOdometerModal;
    window.submitCalibrateOdometer = submitCalibrateOdometer;
    window.openCalibrateAllOdometersModal = openCalibrateAllOdometersModal;
    window.submitCalibrateAllOdometers = submitCalibrateAllOdometers;
    window.filterToolsList = filterToolsList;
    window.assignAvailableToolFromGroup = assignAvailableToolFromGroup;
    window.openToolHistoryModal = openToolHistoryModal;
    window.openAssetHistoryModal = openAssetHistoryModal;
    window.openPersonnelHistoryModal = openPersonnelHistoryModal;
    window.goToToolsPage = goToToolsPage;
    window.changeToolsPageSize = changeToolsPageSize;
    window.renderGroupedToolsPaginated = renderGroupedToolsPaginated;
    window.openVehicleServicesModal = openVehicleServicesModal;
    window.filterFleetList = filterFleetList;
    window.filterPersonnelList = filterPersonnelList;
    window.onAssetCategorySelected = onAssetCategorySelected;

    // Paginación en Bitácoras
    window.goToVehServicesPage = goToVehServicesPage;
    window.changeVehServicesPageSize = changeVehServicesPageSize;
    window.renderVehServicesTablePaginated = renderVehServicesTablePaginated;
    window.goToToolHistoryPage = goToToolHistoryPage;
    window.changeToolHistoryPageSize = changeToolHistoryPageSize;
    window.renderToolHistoryTablePaginated = renderToolHistoryTablePaginated;
    window.goToAssetHistoryPage = goToAssetHistoryPage;
    window.changeAssetHistoryPageSize = changeAssetHistoryPageSize;
    window.renderAssetHistoryTablePaginated = renderAssetHistoryTablePaginated;
    window.goToPersonnelHistoryPage = goToPersonnelHistoryPage;
    window.changePersonnelHistoryPageSize = changePersonnelHistoryPageSize;
    window.renderPersonnelHistoryTablePaginated = renderPersonnelHistoryTablePaginated;
    window.onRecordServiceTypeChange = onRecordServiceTypeChange;
}

export { 
    onRecordServiceTypeChange,
    deleteAssetItem, handleOdometerImageSelected, loadFleetList, loadMachineryList, loadPersonnelTableList, 
    loadResourceDashboard, loadToolsList, onAssetTypeChanged, openAssignModal, openNewAssetModal, 
    openNewPersonnelModal, openNewToolModal, openNewToolModal_v2, openNewVehicleModal, openNewVehicleModal_v2, 
    openOdometerOcrModal, openRecordServiceModal, openResourceSubtab, returnResourceToBase, 
    submitConfirmOdometer, submitCreateAsset, submitCreatePersonnel, submitCreateTool, 
    submitCreateVehicle, submitRecordService, submitResourceAction, switchResourceSubtab, 
    openCalibrateOdometerModal, submitCalibrateOdometer, openCalibrateAllOdometersModal, 
    submitCalibrateAllOdometers, filterToolsList, assignAvailableToolFromGroup, 
    openToolHistoryModal, openAssetHistoryModal, openPersonnelHistoryModal, 
    goToToolsPage, changeToolsPageSize, renderGroupedToolsPaginated, 
    openVehicleServicesModal, filterFleetList, filterPersonnelList, onAssetCategorySelected,
    goToVehServicesPage, changeVehServicesPageSize, renderVehServicesTablePaginated,
    goToToolHistoryPage, changeToolHistoryPageSize, renderToolHistoryTablePaginated,
    goToAssetHistoryPage, changeAssetHistoryPageSize, renderAssetHistoryTablePaginated,
    goToPersonnelHistoryPage, changePersonnelHistoryPageSize, renderPersonnelHistoryTablePaginated
};


