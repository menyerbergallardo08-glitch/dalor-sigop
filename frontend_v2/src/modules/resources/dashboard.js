/**
 * DALOR SIGO-P | Módulo Especializado de Recursos
 */
var API_BASE = window.API_BASE || (window.location.origin + "/api/v1");
var allAssets = window.allAssets = window.allAssets || [];
var allPersonnel = window.allPersonnel = window.allPersonnel || [];

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



// --- VINCULACIÓN CON WINDOW Y SCOPE GLOBAL ---
if (typeof window !== 'undefined') {
    window.openResourceSubtab = openResourceSubtab;
    window.switchResourceSubtab = switchResourceSubtab;
    window.loadResourceDashboard = loadResourceDashboard;
}
