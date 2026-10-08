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


function openAssignModal(type, id, name, action) {

    document.getElementById("modal_res_type").value = type;

    document.getElementById("modal_res_id").value = id;

    document.getElementById("modal_action_type").value = action;

    

    const isAsset = type === 'asset';

    document.getElementById("modal_odometer_container").style.display = isAsset ? 'block' : 'none';

    document.getElementById("modal_custodian_container").style.display = isAsset ? 'block' : 'none';



    // Poblar dinámicamente proyectos si está vacío o desactualizado (Solo Obras Abiertas + Opción Sede Central)
    const projSelect = document.getElementById("modal_target_project_id");
    if (projSelect) {
        function renderProjectOptions(projectsList) {
            const openProjects = (projectsList || []).filter(p => {
                const st = (p.status || '').toLowerCase().trim();
                return !['culminado', 'completado', 'cerrado', 'cancelado', 'finalizado', 'inactivo'].includes(st);
            });

            projSelect.innerHTML = `<option value="">-- Seleccione Proyecto / Destino Activo (${openProjects.length} disponibles) --</option>` +
                `<option value="0" data-loc="Sede Central Dalor (Uso Administrativo / Logística)">🏢 Sede Central / Uso Administrativo & Logística (Sin Imputar a Obra)</option>` +
                openProjects.map(p => `<option value="${p.id}" data-loc="${p.location || 'Sede Central'}">[${p.code}] ${p.name} (${p.location || 'Sede Central'})</option>`).join('');
        }

        let safeProjects = (window.allProjects && window.allProjects.length > 0) ? window.allProjects : (allProjects || []);
        renderProjectOptions(safeProjects);

        // Si safeProjects está vacío, consultar al backend de inmediato para garantizar que se listen
        if (!safeProjects || safeProjects.length === 0) {
            projSelect.innerHTML = `<option value="">-- Consultando obras activas... --</option>` +
                `<option value="0" data-loc="Sede Central Dalor (Uso Administrativo / Logística)">🏢 Sede Central / Uso Administrativo & Logística (Sin Imputar a Obra)</option>`;
            authFetch(`${API_BASE}/projects/`).then(r => r.json()).then(data => {
                const fetched = Array.isArray(data) ? data : (data.items || data.projects || []);
                window.allProjects = allProjects = fetched;
                renderProjectOptions(fetched);
            }).catch(e => {
                console.error("Error al cargar proyectos para modal de asignación:", e);
            });
        }
        
        projSelect.onchange = function() {
            const opt = this.options[this.selectedIndex];
            const loc = opt ? opt.getAttribute("data-loc") : "";
            const locInput = document.getElementById("modal_res_location");
            if (locInput && loc) locInput.value = loc;
        };
    }

    document.getElementById("assignModalTitle").innerText = action === 'assign' ? `Asignar ${name}` : `Transferir ${name}`;
    document.getElementById("btnConfirmResourceAction").innerText = action === 'assign' ? 'Confirmar Asignación' : 'Confirmar Transferencia Directa';

    openModal("modalAssignResource");
}

async function submitResourceAction(event) {
    event.preventDefault();
    const type = document.getElementById("modal_res_type").value;
    const id = parseInt(document.getElementById("modal_res_id").value);
    const action = document.getElementById("modal_action_type").value;
    const rawTargetProj = document.getElementById("modal_target_project_id")?.value;
    const targetProjId = (rawTargetProj === "0" || !rawTargetProj) ? null : parseInt(rawTargetProj);
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
            alert("✅ " + (data.message || "Movimiento procesado con éxito."));
            closeModal("modalAssignResource");
            loadResourceDashboard();
            loadFleetList();
            if (typeof loadMachineryList === 'function') loadMachineryList();
            loadToolsList();
            loadPersonnelTableList();
        } else {
            const errData = await res.json().catch(() => ({}));
            if (res.status === 401) {
                alert("⚠️ Sesión expirada. Por favor recarga e inicia sesión nuevamente.");
            } else {
                alert("❌ " + (errData.detail || errData.message || `Error HTTP ${res.status} al procesar movimiento de recurso.`));
            }
        }
    } catch (e) {
        alert("❌ Error de conexión al servidor: " + (e.message || "Sin respuesta"));
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

            if (typeof loadMachineryList === 'function') loadMachineryList();

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

function populateAssetTypesDropdown(selectEl, selectedVal = '') {
    if (!selectEl) return;
    const existingTypes = Array.from(new Set(((window.allAssets || allAssets || []).map(a => a?.asset_type)).filter(Boolean))).sort();
    const baseTypes = [
        { id: "herramienta_mayor", name: "Herramienta Mayor / Industrial" },
        { id: "herramienta_menor", name: "Herramienta Menor" },
        { id: "maquinaria", name: "Maquinaria Pesada / Planta / Compresor" },
        { id: "vehiculo", name: "Vehículo / Camión de Carga" },
        { id: "camioneta", name: "Camioneta" },
        { id: "equipo_medicion", name: "Equipo de Medición / Calibración" }
    ];
    const allTypeItems = [...baseTypes];
    for (const et of existingTypes) {
        if (!allTypeItems.find(t => t.id === et)) {
            const label = et.charAt(0).toUpperCase() + et.slice(1).replace(/_/g, ' ');
            allTypeItems.push({ id: et, name: label });
        }
    }
    selectEl.innerHTML = allTypeItems.map(t => `<option value="${t.id}">${t.name}</option>`).join('') +
        `<option value="__NEW__" style="font-weight: 800; color: #2563eb;">+ Crear Nuevo Tipo de Activo...</option>`;
    if (selectedVal) {
        selectEl.value = selectedVal;
    }
}

function openNewAssetModal(presetType = 'herramienta_mayor') {
    const form = document.getElementById("newAssetForm");
    if (form) form.reset();

    const typeSelect = document.getElementById("nass_type");
    const newTypeInput = document.getElementById("nass_new_type");
    if (newTypeInput) {
        newTypeInput.classList.add('hidden');
        newTypeInput.value = '';
    }
    if (typeSelect) {
        populateAssetTypesDropdown(typeSelect, presetType);
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

function onAssetTypeChanged() {
    const sel = document.getElementById("nass_type");
    const newTypeInp = document.getElementById("nass_new_type");
    if (sel && newTypeInp) {
        if (sel.value === '__NEW__') {
            newTypeInp.classList.remove('hidden');
            newTypeInp.required = true;
            newTypeInp.focus();
        } else {
            newTypeInp.classList.add('hidden');
            newTypeInp.required = false;
        }
    }

    const type = sel?.value || 'herramienta_mayor';
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

    let type = document.getElementById("nass_type").value;
    if (type === '__NEW__') {
        type = (document.getElementById("nass_new_type")?.value || '').trim().toLowerCase().replace(/\s+/g, '_');
        if (!type) {
            alert("Por favor ingrese el nombre del nuevo tipo de activo.");
            return;
        }
    }

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

        const newAssetData = await res.json().catch(() => null);
        if (newAssetData && Array.isArray(window.allAssets)) {
            window.allAssets.push(newAssetData);
        }

        closeModal("modalNewAsset");
        alert(`✅ Activo ${code} (${name}) registrado exitosamente con tipo "${type}" en categoría "${category}".`);

        if (typeof window.loadInitialMasterData === "function") await window.loadInitialMasterData();
        if (typeof window.loadFleetList === "function") window.loadFleetList();
        if (typeof window.loadToolsList === "function") window.loadToolsList();
        if (typeof window.loadMachineryList === "function") window.loadMachineryList();
        if (typeof window.loadResourceDashboard === "function") window.loadResourceDashboard();
        if (typeof window.populatePlanDropdownSelectors === "function") window.populatePlanDropdownSelectors();
        if (typeof window.populateRequestModalDropdowns === "function") window.populateRequestModalDropdowns();

    } catch (err) {
        alert(`❌ Error: ${err.message}`);
    }
}

function onEditAssetTypeChanged() {
    const sel = document.getElementById("edit_asset_type");
    const input = document.getElementById("edit_new_asset_type");
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

async function openEditAssetModal(assetId) {
    const aid = parseInt(assetId);
    const candidates = [
        ...(window.allAssets || []),
        ...(window.rawFleetList || []),
        ...(window.rawToolsList || []),
        ...(window.rawMachineryList || [])
    ];
    let a = candidates.find(x => x && (x.id === aid || x.id === assetId));

    if (!a && aid) {
        try {
            const res = await authFetch(`${API_BASE}/assets/${aid}`);
            if (res.ok) {
                a = await res.json();
            }
        } catch(e) {
            console.error("Error al obtener activo por ID:", e);
        }
    }

    if (!a) return alert("Activo no encontrado.");

    if (document.getElementById("edit_asset_id")) document.getElementById("edit_asset_id").value = a.id;
    if (document.getElementById("edit_asset_code")) document.getElementById("edit_asset_code").value = a.asset_code || '';
    if (document.getElementById("edit_asset_name")) document.getElementById("edit_asset_name").value = a.name || '';
    
    const editTypeSel = document.getElementById("edit_asset_type");
    const editNewTypeInp = document.getElementById("edit_new_asset_type");
    if (editNewTypeInp) {
        editNewTypeInp.classList.add('hidden');
        editNewTypeInp.value = '';
    }
    if (editTypeSel) {
        populateAssetTypesDropdown(editTypeSel, a.asset_type || 'vehiculo');
    }

    if (document.getElementById("edit_asset_category")) document.getElementById("edit_asset_category").value = a.category || '';
    if (document.getElementById("edit_asset_brand")) document.getElementById("edit_asset_brand").value = a.brand || '';
    if (document.getElementById("edit_asset_model")) document.getElementById("edit_asset_model").value = a.model || '';
    if (document.getElementById("edit_asset_serial")) document.getElementById("edit_asset_serial").value = a.serial_number || '';
    if (document.getElementById("edit_asset_plate")) document.getElementById("edit_asset_plate").value = a.license_plate || '';
    if (document.getElementById("edit_asset_odometer")) document.getElementById("edit_asset_odometer").value = a.current_odometer || 0;
    if (document.getElementById("edit_asset_location")) document.getElementById("edit_asset_location").value = a.current_location || '';

    if (typeof openModal === 'function') {
        openModal("modalEditAsset");
    } else if (typeof window.openModal === 'function') {
        window.openModal("modalEditAsset");
    } else {
        const modalEl = document.getElementById("modalEditAsset");
        if (modalEl) modalEl.classList.remove("hidden");
    }
}

async function submitEditAsset(e) {
    if (e) e.preventDefault();
    const id = document.getElementById("edit_asset_id").value;

    let assetType = document.getElementById("edit_asset_type").value;
    if (assetType === '__NEW__') {
        assetType = (document.getElementById("edit_new_asset_type")?.value || '').trim().toLowerCase().replace(/\s+/g, '_');
        if (!assetType) {
            alert("Por favor ingrese el nombre del nuevo tipo de activo.");
            return false;
        }
    }

    const payload = {
        name: document.getElementById("edit_asset_name").value.trim(),
        asset_type: assetType,
        category: document.getElementById("edit_asset_category").value.trim(),
        brand: document.getElementById("edit_asset_brand").value.trim(),
        model: document.getElementById("edit_asset_model").value.trim(),
        serial_number: document.getElementById("edit_asset_serial").value.trim(),
        license_plate: document.getElementById("edit_asset_plate").value.trim(),
        current_odometer: parseFloat(document.getElementById("edit_asset_odometer").value) || 0,
        current_location: document.getElementById("edit_asset_location").value.trim()
    };
    try {
        const res = await authFetch(`${API_BASE}/assets/${id}`, {
            method: "PUT",
            body: JSON.stringify(payload)
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({ detail: 'Error al actualizar activo' }));
            throw new Error(err.detail || 'Error al actualizar activo');
        }
        alert("✅ Activo actualizado exitosamente.");
        if (typeof closeModal === 'function') closeModal("modalEditAsset");
        if (typeof window.loadInitialMasterData === "function") await window.loadInitialMasterData();
        if (typeof window.loadFleetList === "function") window.loadFleetList();
        if (typeof window.loadMachineryList === "function") window.loadMachineryList();
        if (typeof window.loadToolsList === "function") window.loadToolsList();
    } catch (err) {
        alert("❌ Error: " + err.message);
    }
    return false;
}

async function toggleAssetStatus(assetId, currentActive) {
    const action = currentActive ? "inactivar" : "reactivar";
    if (!confirm(`¿Desea ${action} este equipo/vehículo? Se conservará su historial de uso.`)) return;
    try {
        const res = await authFetch(`${API_BASE}/assets/${assetId}/toggle-active`, { method: "POST" });
        if (!res.ok) {
            const err = await res.json().catch(() => ({ detail: 'Error al cambiar estado' }));
            throw new Error(err.detail || 'Error al cambiar estado');
        }
        alert(`✅ Activo ${action === 'inactivar' ? 'inactivado' : 'reactivado'} exitosamente.`);
        await loadInitialMasterData();
        loadFleetList();
        if (typeof loadMachineryList === "function") loadMachineryList();
        if (typeof loadToolsList === "function") loadToolsList();
    } catch (err) {
        alert("❌ Error: " + err.message);
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



// --- VINCULACIÓN CON WINDOW Y SCOPE GLOBAL ---
if (typeof window !== 'undefined') {
    window.deleteAssetItem = deleteAssetItem;
    window.openAssignModal = openAssignModal;
    window.submitResourceAction = submitResourceAction;
    window.returnResourceToBase = returnResourceToBase;
    window.openNewAssetModal = openNewAssetModal;
    window.onAssetCategorySelected = onAssetCategorySelected;
    window.onAssetTypeChanged = onAssetTypeChanged;
    window.onEditAssetTypeChanged = onEditAssetTypeChanged;
    window.submitCreateAsset = submitCreateAsset;
    window.openEditAssetModal = openEditAssetModal;
    window.submitEditAsset = submitEditAsset;
    window.toggleAssetStatus = toggleAssetStatus;
    window.goToAssetHistoryPage = goToAssetHistoryPage;
    window.changeAssetHistoryPageSize = changeAssetHistoryPageSize;
    window.renderAssetHistoryTablePaginated = renderAssetHistoryTablePaginated;
    window.openAssetHistoryModal = openAssetHistoryModal;
}

export { onAssetTypeChanged, onEditAssetTypeChanged, populateAssetTypesDropdown, openEditAssetModal, submitEditAsset };
