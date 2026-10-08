// Sigop ERP - Submódulo de Proyectos Modularizado
const API_BASE = (typeof window !== 'undefined' && window.API_BASE) || '/api/v1';

const authFetch = (url, options = {}) => {
    const token = (typeof localStorage !== 'undefined' && localStorage.getItem('token')) || (typeof window !== 'undefined' && window.authToken);
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (options.body instanceof FormData) {
        delete headers['Content-Type'];
    }
    return window.fetch(url, { ...options, headers });
};

function safeNum(val, def = 0) {
    if (val === null || val === undefined) return def;
    if (typeof val === 'number') return isNaN(val) ? def : val;
    if (typeof window !== 'undefined' && typeof window.parseLocalizedNumber === 'function') {
        const parsed = window.parseLocalizedNumber(val);
        return isNaN(parsed) ? def : parsed;
    }
    const clean = String(val).replace(/[^0-9.,-]/g, '').replace(',', '.');
    const n = parseFloat(clean);
    return isNaN(n) ? def : n;
}

// ==============================================================================
// PUNTO 8: REABRIR Y EDITAR PROYECTO GUARDADO (MODAL & SUBMIT)
// ==============================================================================
let editPhaseCount = 0;

function addEditProjectPhaseRow(defName = "", defDuration = 7, defUnit = "dias", defCost = 0, defDesc = "", defStatus = "pendiente") {
    editPhaseCount++;
    const container = document.getElementById("editProjectPhasesContainer");
    if (!container) return;

    const rowId = `edit_phase_row_${editPhaseCount}`;
    const div = document.createElement("div");
    div.id = rowId;
    div.className = "edit-phase-row";
    div.style.cssText = "background: white; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 10px; display: grid; grid-template-columns: 2fr 1fr 1fr 24px; gap: 8px; align-items: center;";

    div.innerHTML = `
        <div>
            <label style="font-size: 9.5px; font-weight: 700; color: #64748b; display: block;">Hito / Etapa:</label>
            <input type="text" class="form-input eph-name" value="${(defName || '').replaceAll('"', '&quot;')}" placeholder="Nombre de etapa" style="font-size: 11px; padding: 4px 6px; font-weight: 700;" required>
            <input type="hidden" class="eph-desc" value="${(defDesc || defName || '').replaceAll('"', '&quot;')}">
            <input type="hidden" class="eph-status" value="${(defStatus || 'pendiente').replaceAll('"', '&quot;')}">
        </div>
        <div>
            <label style="font-size: 9.5px; font-weight: 700; color: #64748b; display: block;">Duración:</label>
            <div style="display: flex; gap: 3px;">
                <input type="text" inputmode="decimal" class="form-input eph-dur-val" value="${defDuration}" style="font-size: 11px; padding: 4px 4px; font-weight: bold; width: 55%;">
                <select class="form-select eph-dur-unit" style="font-size: 10px; padding: 3px 2px; width: 45%; font-weight: 700;">
                    <option value="dias" ${defUnit === 'dias' ? 'selected' : ''}>Días</option>
                    <option value="horas" ${defUnit === 'horas' ? 'selected' : ''}>Horas</option>
                </select>
            </div>
        </div>
        <div>
            <label style="font-size: 9.5px; font-weight: 700; color: #64748b; display: block;">Ppto ($):</label>
            <input type="text" inputmode="decimal" class="form-input eph-cost" value="${defCost}" style="font-size: 11px; padding: 4px 6px; font-weight: 800; color: var(--dalor-blue);">
        </div>
        <button type="button" onclick="document.getElementById('${rowId}')?.remove()" style="background: none; border: none; color: #ef4444; font-size: 16px; cursor: pointer; padding-top: 10px;" title="Eliminar etapa">&times;</button>
    `;
    container.appendChild(div);
}

// Variables de estado para Recursos y Materiales en Re-edición de Proyecto
var editSelectedPersonnelIds = (typeof window !== 'undefined' && window.editSelectedPersonnelIds) || [];
var editSelectedVehicleIds = (typeof window !== 'undefined' && window.editSelectedVehicleIds) || [];
var editSelectedToolIds = (typeof window !== 'undefined' && window.editSelectedToolIds) || [];
var editSelectedMaterials = (typeof window !== 'undefined' && window.editSelectedMaterials) || [];

if (typeof window !== 'undefined') {
    window.editSelectedPersonnelIds = editSelectedPersonnelIds;
    window.editSelectedVehicleIds = editSelectedVehicleIds;
    window.editSelectedToolIds = editSelectedToolIds;
    window.editSelectedMaterials = editSelectedMaterials;
}

function applyEditProjectSedeRules(isSede) {
    const fleetWrap = document.getElementById("edit_fleet_wrapper");
    const fleetBanner = document.getElementById("edit_fleet_sede_banner");
    const fuelWrap = document.getElementById("edit_fuel_wrapper");
    const fuelInp = document.getElementById("edit_project_fuel");

    if (isSede) {
        if (fleetWrap) fleetWrap.style.display = "none";
        if (fleetBanner) fleetBanner.style.display = "flex";
        if (fuelWrap) fuelWrap.style.display = "none";
        if (fuelInp) fuelInp.value = "0.00";
        editSelectedVehicleIds = [];
        if (typeof window !== 'undefined') {
            window.editSelectedVehicleIds = [];
        }
        const selFleet = document.getElementById("edit_select_fleet");
        if (selFleet) selFleet.value = "";
        renderEditAssignedTags();
    } else {
        if (fleetWrap) fleetWrap.style.display = "";
        if (fleetBanner) fleetBanner.style.display = "none";
        if (fuelWrap) fuelWrap.style.display = "";
    }
}
if (typeof window !== 'undefined') {
    window.applyEditProjectSedeRules = applyEditProjectSedeRules;
}

function onEditProjectMaterialChanged(selectEl) {
    if (!selectEl) return;
    const opt = selectEl.options[selectEl.selectedIndex];
    const unit = opt ? opt.getAttribute('data-unit') : 'UND';
    const unitLabel = document.getElementById('edit_mat_unit_label');
    if (unitLabel) unitLabel.textContent = unit || 'UND';
}

function renderEditAssignedTags() {
    // 1. Personal
    const persContainer = document.getElementById('edit_tags_personnel');
    const persCounter = document.getElementById('edit_pers_counter');
    if (persCounter) persCounter.textContent = `${editSelectedPersonnelIds.length} asignados`;
    if (persContainer) {
        if (editSelectedPersonnelIds.length === 0) {
            persContainer.innerHTML = '<span style="font-size: 10px; color: #94a3b8; font-style: italic;">Sin personal asignado</span>';
        } else {
            const allPers = (typeof window !== 'undefined' && Array.isArray(window.allPersonnel)) ? window.allPersonnel : [];
            persContainer.innerHTML = editSelectedPersonnelIds.map(id => {
                const p = allPers.find(x => x.id === id);
                const name = p ? `[${p.code}] ${p.full_name}` : `Personal #${id}`;
                return `<div style="display: flex; align-items: center; justify-content: space-between; background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; border-radius: 4px; padding: 2px 6px; font-size: 10.5px; font-weight: 700;">
                    <span>${name}</span>
                    <button type="button" onclick="removeEditProjectResource('personnel', ${id})" style="background: none; border: none; color: #ef4444; font-weight: 800; cursor: pointer; margin-left: 6px;" title="Desasignar">&times;</button>
                </div>`;
            }).join('');
        }
    }

    // 2. Flota
    const fleetContainer = document.getElementById('edit_tags_fleet');
    const fleetCounter = document.getElementById('edit_fleet_counter');
    if (fleetCounter) fleetCounter.textContent = `${editSelectedVehicleIds.length} asignados`;
    if (fleetContainer) {
        if (editSelectedVehicleIds.length === 0) {
            fleetContainer.innerHTML = '<span style="font-size: 10px; color: #94a3b8; font-style: italic;">Sin flota asignada</span>';
        } else {
            const allAss = (typeof window !== 'undefined' && Array.isArray(window.allAssets)) ? window.allAssets : [];
            fleetContainer.innerHTML = editSelectedVehicleIds.map(id => {
                const a = allAss.find(x => x.id === id);
                const plate = a ? (a.license_plate || a.serial_chassis || 'S/P') : '';
                const name = a ? `[${a.asset_code || a.code || 'VEH'}] ${a.name} (${plate})` : `Vehículo #${id}`;
                return `<div style="display: flex; align-items: center; justify-content: space-between; background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; border-radius: 4px; padding: 2px 6px; font-size: 10.5px; font-weight: 700;">
                    <span>${name}</span>
                    <button type="button" onclick="removeEditProjectResource('fleet', ${id})" style="background: none; border: none; color: #ef4444; font-weight: 800; cursor: pointer; margin-left: 6px;" title="Desasignar">&times;</button>
                </div>`;
            }).join('');
        }
    }

    // 3. Herramientas
    const toolContainer = document.getElementById('edit_tags_tools');
    const toolCounter = document.getElementById('edit_tools_counter');
    if (toolCounter) toolCounter.textContent = `${editSelectedToolIds.length} asignados`;
    if (toolContainer) {
        if (editSelectedToolIds.length === 0) {
            toolContainer.innerHTML = '<span style="font-size: 10px; color: #94a3b8; font-style: italic;">Sin herramientas asignadas</span>';
        } else {
            const allAss = (typeof window !== 'undefined' && Array.isArray(window.allAssets)) ? window.allAssets : [];
            toolContainer.innerHTML = editSelectedToolIds.map(id => {
                const t = allAss.find(x => x.id === id);
                const name = t ? `[${t.asset_code || t.code || 'HERR'}] ${t.name}` : `Herramienta #${id}`;
                return `<div style="display: flex; align-items: center; justify-content: space-between; background: #fffbeb; color: #92400e; border: 1px solid #fde68a; border-radius: 4px; padding: 2px 6px; font-size: 10.5px; font-weight: 700;">
                    <span>${name}</span>
                    <button type="button" onclick="removeEditProjectResource('tools', ${id})" style="background: none; border: none; color: #ef4444; font-weight: 800; cursor: pointer; margin-left: 6px;" title="Desasignar">&times;</button>
                </div>`;
            }).join('');
        }
    }

    // 4. Materiales
    const matContainer = document.getElementById('edit_tags_materials');
    const matCounter = document.getElementById('edit_mats_total_badge');
    if (matCounter) matCounter.textContent = `${editSelectedMaterials.length} insumos`;
    if (matContainer) {
        if (editSelectedMaterials.length === 0) {
            matContainer.innerHTML = '<span style="font-size: 10px; color: #94a3b8; font-style: italic;">Sin materiales requeridos todavía</span>';
        } else {
            matContainer.innerHTML = editSelectedMaterials.map((m, idx) => {
                const isNew = !m.is_existing;
                const badge = isNew ? '<span style="font-size: 9px; padding: 1px 4px; border-radius: 4px; background: #dcfce7; color: #166534; font-weight: 800;">NUEVO</span>' : (m.status ? `<span style="font-size: 9px; padding: 1px 4px; border-radius: 4px; background: #e2e8f0; color: #475569;">${m.status}</span>` : '');
                const itemCost = ((parseFloat(m.quantity) || 0) * (parseFloat(m.unit_cost_usd) || 0)).toFixed(2);
                return `<div style="display: flex; align-items: center; justify-content: space-between; background: #f0fdfa; color: #0f766e; border: 1px solid #99f6e4; border-radius: 4px; padding: 3px 6px; font-size: 10.5px; font-weight: 700;">
                    <span>[${m.code || 'MAT'}] ${m.name} (${m.quantity} ${m.unit_measure || 'UND'} &bull; <span style="color: #047857; font-weight: 800;">$${itemCost} USD</span>) ${badge}</span>
                    <button type="button" onclick="removeEditProjectResource('material', ${idx})" style="background: none; border: none; color: #ef4444; font-weight: 800; cursor: pointer; margin-left: 6px;" title="Quitar">&times;</button>
                </div>`;
            }).join('');
        }
    }
}

function updateEditProjectMaterialsCost() {
    let allMats = window.allMaterials || [];
    const totalCost = editSelectedMaterials.reduce((acc, m) => {
        let uCost = m.unit_cost_usd;
        if (uCost === undefined || uCost === null) {
            const found = allMats.find(x => x.id === m.material_id);
            uCost = found ? (found.unit_cost_usd || 0.0) : 0.0;
            m.unit_cost_usd = uCost;
        }
        return acc + ((parseFloat(m.quantity) || 0) * (parseFloat(uCost) || 0));
    }, 0);

    const matInput = document.getElementById("edit_project_materials");
    if (matInput) {
        matInput.value = totalCost.toFixed(2);
    }
}

function addEditProjectResource(type) {
    if (type === 'personnel') {
        const sel = document.getElementById('edit_select_personnel');
        const id = parseInt(sel?.value);
        if (id && !editSelectedPersonnelIds.includes(id)) {
            editSelectedPersonnelIds.push(id);
            renderEditAssignedTags();
            sel.value = '';
        }
    } else if (type === 'fleet') {
        const sel = document.getElementById('edit_select_fleet');
        const id = parseInt(sel?.value);
        if (id && !editSelectedVehicleIds.includes(id)) {
            editSelectedVehicleIds.push(id);
            renderEditAssignedTags();
            sel.value = '';
        }
    } else if (type === 'tools') {
        const sel = document.getElementById('edit_select_tools');
        const id = parseInt(sel?.value);
        if (id && !editSelectedToolIds.includes(id)) {
            editSelectedToolIds.push(id);
            renderEditAssignedTags();
            sel.value = '';
        }
    } else if (type === 'material') {
        const sel = document.getElementById('edit_select_materials');
        const qtyInp = document.getElementById('edit_mat_quantity');
        const matId = parseInt(sel?.value);
        const qty = parseFloat(qtyInp?.value) || 1.0;
        if (!matId) {
            alert('Por favor selecciona un material del catálogo.');
            return;
        }
        const opt = sel.options[sel.selectedIndex];
        const name = opt.getAttribute('data-name') || opt.textContent;
        const code = opt.getAttribute('data-code') || 'MAT';
        const unit = opt.getAttribute('data-unit') || 'UND';

        const allMats = window.allMaterials || [];
        const found = allMats.find(x => x.id === matId);
        const uCost = found ? (found.unit_cost_usd || 0.0) : 0.0;

        editSelectedMaterials.push({
            material_id: matId,
            name: name,
            code: code,
            unit_measure: unit,
            quantity: qty,
            unit_cost_usd: uCost,
            is_existing: false,
            notes: 'Agregado en re-edición de obra'
        });
        renderEditAssignedTags();
        updateEditProjectMaterialsCost();
        sel.value = '';
        if (qtyInp) qtyInp.value = '1';
    }
}

function removeEditProjectResource(type, target) {
    if (type === 'personnel') {
        editSelectedPersonnelIds = editSelectedPersonnelIds.filter(id => id !== target);
    } else if (type === 'fleet') {
        editSelectedVehicleIds = editSelectedVehicleIds.filter(id => id !== target);
    } else if (type === 'tools') {
        editSelectedToolIds = editSelectedToolIds.filter(id => id !== target);
    } else if (type === 'material') {
        editSelectedMaterials.splice(target, 1);
        updateEditProjectMaterialsCost();
    }
    renderEditAssignedTags();
}

async function populateEditProjectDropdowns(currentProjId) {
    // 1. Personal
    let allPers = (typeof window !== 'undefined' && Array.isArray(window.allPersonnel) && window.allPersonnel.length > 0) ? window.allPersonnel : [];
    if (allPers.length === 0) {
        try {
            const res = await authFetch(`${API_BASE}/personnel/?include_inactive=false`);
            if (res.ok) allPers = window.allPersonnel = await res.json();
        } catch(e) {}
    }
    const persSel = document.getElementById('edit_select_personnel');
    if (persSel) {
        const validPers = allPers.filter(p => !p.current_project_id || p.current_project_id === currentProjId || editSelectedPersonnelIds.includes(p.id));
        persSel.innerHTML = '<option value="">-- Seleccionar Trabajador --</option>' +
            validPers.map(p => `<option value="${p.id}">[${p.code}] ${p.full_name} (${p.role_title || 'Operario'})</option>`).join('');
    }

    // 2. Flota & Herramientas
    let allAss = (typeof window !== 'undefined' && Array.isArray(window.allAssets) && window.allAssets.length > 0) ? window.allAssets : [];
    if (allAss.length === 0) {
        try {
            const res = await authFetch(`${API_BASE}/assets/`);
            if (res.ok) allAss = window.allAssets = await res.json();
        } catch(e) {}
    }
    const fleetSel = document.getElementById('edit_select_fleet');
    if (fleetSel) {
        const vehicles = allAss.filter(a => {
            const isVeh = ['vehiculo', 'camioneta'].includes((a.asset_type || '').toLowerCase()) ||
                (a.category && a.category.toLowerCase().includes('veh'));
            return isVeh && (!a.current_project_id || a.current_project_id === currentProjId || editSelectedVehicleIds.includes(a.id));
        });
        fleetSel.innerHTML = '<option value="">-- Seleccionar Unidad / Flota --</option>' +
            vehicles.map(v => `<option value="${v.id}">[${v.asset_code || v.code || 'VEH'}] ${v.name} (Placa: ${v.license_plate || 'S/P'})</option>`).join('');
    }

    const toolSel = document.getElementById('edit_select_tools');
    if (toolSel) {
        const tools = allAss.filter(a => {
            const isVeh = ['vehiculo', 'camioneta'].includes((a.asset_type || '').toLowerCase()) ||
                (a.category && a.category.toLowerCase().includes('veh'));
            return !isVeh && (!a.current_project_id || a.current_project_id === currentProjId || editSelectedToolIds.includes(a.id));
        });
        toolSel.innerHTML = '<option value="">-- Seleccionar Herramienta / Equipo --</option>' +
            tools.map(t => `<option value="${t.id}">[${t.asset_code || t.code || 'HERR'}] ${t.name}</option>`).join('');
    }

    // 3. Materiales
    let allMats = (typeof window !== 'undefined' && Array.isArray(window.allMaterials) && window.allMaterials.length > 0) ? window.allMaterials : [];
    if (allMats.length === 0) {
        try {
            const res = await authFetch(`${API_BASE}/materials/`);
            if (res.ok) allMats = window.allMaterials = await res.json();
        } catch(e) {}
    }
    const matSel = document.getElementById('edit_select_materials');
    if (matSel) {
        matSel.innerHTML = '<option value="">-- Seleccionar Material / Consumible --</option>' +
            allMats.map(m => `<option value="${m.id}" data-name="${m.name}" data-code="${m.code}" data-unit="${m.unit_measure || 'UND'}">[${m.code}] ${m.name} (Stock: ${m.stock_quantity || 0} ${m.unit_measure || 'UND'})</option>`).join('');
    }
}

async function openEditProjectModal(projectId) {
    try {
        const pId = parseInt(projectId) || (window.currentViewingProjectId ? parseInt(window.currentViewingProjectId) : null);
        if (!pId) {
            alert("Identificador de obra no válido para editar.");
            return;
        }

        const token = window.authToken || localStorage.getItem('dalor_token') || null;
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

        const res = await authFetch(`${API_BASE}/projects/${pId}/details`, { headers });
        if (!res.ok) throw new Error("No se pudo cargar la información del proyecto.");
        const p = await res.json();

        document.getElementById("edit_project_id").value = p.id;
        document.getElementById("edit_project_code").value = p.code || "";
        document.getElementById("edit_project_name").value = p.name || "";
        document.getElementById("edit_project_location").value = p.location || "Sede Central";
        document.getElementById("edit_project_status").value = (p.status || "activo").toLowerCase();
        document.getElementById("edit_project_duration").value = p.duration_days || 30;
        document.getElementById("edit_project_execution_time").value = p.execution_time || `${p.duration_days || 15} días hábiles`;
        document.getElementById("edit_project_contract").value = p.contract_amount_usd || 0;
        document.getElementById("edit_project_scope").value = p.scope_of_work || "";

        // Bolsas
        document.getElementById("edit_project_labor").value = p.estimated_labor_usd || 0;
        document.getElementById("edit_project_fuel").value = p.estimated_fuel_usd || 0;
        document.getElementById("edit_project_materials").value = p.estimated_materials_usd || 0;
        document.getElementById("edit_project_tools").value = p.estimated_tools_usd || 0;
        document.getElementById("edit_project_services").value = p.estimated_services_usd || 0;

        // Asegurar carga de clientes para dropdown
        if (!window.allClients || !Array.isArray(window.allClients) || window.allClients.length === 0) {
            try {
                const resCli = await authFetch(`${API_BASE}/clients/`);
                if (resCli.ok) window.allClients = await resCli.json();
            } catch(e) {}
        }
        const clientSel = document.getElementById("edit_project_client_id");
        if (clientSel) {
            const listCli = (typeof window !== 'undefined' && Array.isArray(window.allClients)) ? window.allClients : [];
            let opts = `<option value="">-- Seleccionar Cliente --</option>` +
                listCli.map(c => `<option value="${c.id}" ${c.id === p.client_id ? 'selected' : ''}>[${c.code}] ${c.name}</option>`).join('');
            clientSel.innerHTML = opts;
            if (p.client_id) clientSel.value = String(p.client_id);
        }

        // Fases
        const phasesContainer = document.getElementById("editProjectPhasesContainer");
        if (phasesContainer) {
            phasesContainer.innerHTML = "";
            editPhaseCount = 0;
            if (p.phases && p.phases.length > 0) {
                p.phases.forEach(ph => {
                    const durUnit = ph.duration_unit || "dias";
                    const durVal = ph.estimated_duration !== undefined ? ph.estimated_duration : (ph.duration_days || 7);
                    addEditProjectPhaseRow(ph.name, durVal, durUnit, ph.estimated_cost_usd || 0, ph.description || ph.name, ph.status || "pendiente");
                });
            } else {
                addEditProjectPhaseRow("Fase 1: Ejecución Inicial", 7, "dias", 0, "", "pendiente");
            }
        }

        // Cargar Recursos y Materiales Asignados
        editSelectedPersonnelIds = (p.assigned_personnel || []).map(x => x.id);
        editSelectedVehicleIds = (p.assigned_fleet || []).map(x => x.id);
        editSelectedToolIds = (p.assigned_tools || []).map(x => x.id);
        editSelectedMaterials = (p.requested_materials || []).map(r => ({
            material_id: r.material_id,
            name: r.material_name,
            code: r.material_code,
            unit_measure: r.unit_measure,
            quantity: r.quantity_required,
            unit_cost_usd: r.unit_cost_usd !== undefined ? r.unit_cost_usd : (r.estimated_cost_usd && r.quantity_required ? r.estimated_cost_usd / r.quantity_required : 0),
            is_existing: true,
            status: r.status
        }));

        await populateEditProjectDropdowns(p.id);
        renderEditAssignedTags();

        // Aplicar reglas de Sede Central (ocultar flota y combustible si es Sede Central)
        const locLower = (p.location || '').toLowerCase();
        const isSede = locLower.includes('sede') || locLower.includes('central') || locLower.includes('taller') || locLower.includes('guacara') || p.execution_type === 'sede';
        applyEditProjectSedeRules(isSede);

        // Sumar automáticamente el costo total de los materiales asignados
        updateEditProjectMaterialsCost();

        if (typeof window.openModal === 'function') {
            window.openModal("modalEditProject");
        } else {
            document.getElementById("modalEditProject")?.classList.remove("hidden");
        }
    } catch (err) {
        console.error("Error abriendo modal de edición de proyecto:", err);
        alert("Error cargando proyecto para edición: " + err.message);
    }
}

async function submitEditProject(event) {
    if (event && event.preventDefault) event.preventDefault();

    const projId = parseInt(document.getElementById("edit_project_id")?.value);
    if (!projId) {
        alert("ID de proyecto no válido.");
        return;
    }

    const clientSel = document.getElementById("edit_project_client_id");
    const clientId = parseInt(clientSel?.value) || null;
    const clientName = (clientSel && clientSel.selectedIndex > 0) ? (clientSel.options[clientSel.selectedIndex]?.text?.replace(/^\[[^\]]+\]\s*/, '') || null) : null;
    const name = (document.getElementById("edit_project_name")?.value || "").trim();
    if (!name) {
        alert("El nombre de la obra es obligatorio.");
        return;
    }

    // Colectar fases respetando su estatus previo
    const phaseRows = document.querySelectorAll("#editProjectPhasesContainer .edit-phase-row");
    let phases = [];
    phaseRows.forEach((row, idx) => {
        const phName = row.querySelector(".eph-name")?.value.trim() || `Fase ${idx + 1}`;
        const rawDur = row.querySelector(".eph-dur-val")?.value || "7";
        const durVal = safeNum(rawDur, 7);
        const durUnit = row.querySelector(".eph-dur-unit")?.value || "dias";
        const cost = safeNum(row.querySelector(".eph-cost")?.value, 0.0);
        const desc = row.querySelector(".eph-desc")?.value || phName;
        const phStatus = row.querySelector(".eph-status")?.value || "pendiente";
        const days = durUnit === "horas" ? Math.max(1, Math.round(durVal / 8)) : Math.max(1, Math.round(durVal));

        phases.push({
            phase_number: idx + 1,
            name: phName,
            description: desc,
            duration_days: days,
            duration_unit: durUnit,
            estimated_duration: durVal,
            estimated_cost_usd: cost,
            status: phStatus
        });
    });

    if (phases.length === 0) {
        phases.push({
            phase_number: 1,
            name: "Fase 1: Ejecución Inicial",
            description: "Fase 1: Ejecución Inicial",
            duration_days: 7,
            duration_unit: "dias",
            estimated_duration: 7.0,
            estimated_cost_usd: 0.0,
            status: "pendiente"
        });
    }

    const payload = {
        name: name,
        client_id: clientId,
        client_name: clientName,
        location: (document.getElementById("edit_project_location")?.value || "Sede Central").trim(),
        status: document.getElementById("edit_project_status")?.value || "activo",
        duration_days: parseInt(document.getElementById("edit_project_duration")?.value) || 30,
        execution_time: (document.getElementById("edit_project_execution_time")?.value || "").trim() || "15 días hábiles",
        contract_amount_usd: safeNum(document.getElementById("edit_project_contract")?.value, 0.0),
        scope_of_work: document.getElementById("edit_project_scope")?.value || "",
        estimated_labor_usd: safeNum(document.getElementById("edit_project_labor")?.value, 0.0),
        estimated_fuel_usd: safeNum(document.getElementById("edit_project_fuel")?.value, 0.0),
        estimated_materials_usd: safeNum(document.getElementById("edit_project_materials")?.value, 0.0),
        estimated_tools_usd: safeNum(document.getElementById("edit_project_tools")?.value, 0.0),
        estimated_services_usd: safeNum(document.getElementById("edit_project_services")?.value, 0.0),
        phases: phases,
        assigned_personnel_ids: editSelectedPersonnelIds || [],
        assigned_vehicle_ids: editSelectedVehicleIds || [],
        assigned_tool_ids: editSelectedToolIds || [],
        assigned_material_items: editSelectedMaterials || []
    };

    const btnSubmit = document.getElementById("btnSubmitEditProject");
    if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardando...';
    }

    try {
        const token = window.authToken || localStorage.getItem('dalor_token') || null;
        const headers = { "Content-Type": "application/json" };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await authFetch(`${API_BASE}/projects/${projId}`, {
            method: "PUT",
            headers,
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({ detail: "Error del servidor al procesar la actualización" }));
            throw new Error(err.detail || "Error al actualizar el proyecto");
        }

        if (typeof window.closeModal === 'function') {
            window.closeModal("modalEditProject");
        } else {
            document.getElementById("modalEditProject")?.classList.add("hidden");
        }

        if (typeof showToastNotification === 'function') {
            showToastNotification(`✅ Proyecto actualizado exitosamente.`, "success");
        } else {
            alert("Proyecto actualizado exitosamente.");
        }

        if (typeof loadProjectsList === 'function') {
            await loadProjectsList();
        } else if (typeof window.loadProjectsList === 'function') {
            await window.loadProjectsList();
        }
    } catch (err) {
        console.error("Error guardando edición de proyecto:", err);
        alert("Error al actualizar proyecto: " + err.message);
    } finally {
        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Guardar Cambios de Obra';
        }
    }
}


// Auto-window binding & ES6 exports
if (typeof window !== 'undefined') {
    window.addEditProjectPhaseRow = addEditProjectPhaseRow;
    window.onEditProjectMaterialChanged = onEditProjectMaterialChanged;
    window.renderEditAssignedTags = renderEditAssignedTags;
    window.updateEditProjectMaterialsCost = updateEditProjectMaterialsCost;
    window.addEditProjectResource = addEditProjectResource;
    window.removeEditProjectResource = removeEditProjectResource;
    window.populateEditProjectDropdowns = populateEditProjectDropdowns;
    window.openEditProjectModal = openEditProjectModal;
    window.submitEditProject = submitEditProject;
    window.applyEditProjectSedeRules = applyEditProjectSedeRules;
}

export { addEditProjectPhaseRow };
export { onEditProjectMaterialChanged };
export { renderEditAssignedTags };
export { updateEditProjectMaterialsCost };
export { addEditProjectResource };
export { removeEditProjectResource };
export { populateEditProjectDropdowns };
export { openEditProjectModal };
export { submitEditProject };
export { applyEditProjectSedeRules };
