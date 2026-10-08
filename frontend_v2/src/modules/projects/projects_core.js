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

// --- BLOQUE L35-L226 ---
function setProjectType(type) {
    const hiddenInp = document.getElementById("new_proj_type");
    if (hiddenInp) hiddenInp.value = type;

    const radioSede = document.getElementById("radio_type_sede");
    const radioForaneo = document.getElementById("radio_type_foraneo");
    const cardSede = document.getElementById("card_type_sede");
    const cardForaneo = document.getElementById("card_type_foraneo");
    const locInput = document.getElementById("new_proj_location");
    const vehCol = document.getElementById("plan_vehicle_container");
    const vehPlace = document.getElementById("plan_vehicle_placeholder");

    if (type === 'sede') {
        if (radioSede) radioSede.checked = true;
        if (radioForaneo) radioForaneo.checked = false;
        if (cardSede) { cardSede.style.background = "#eff6ff"; cardSede.style.borderColor = "var(--dalor-navy)"; }
        if (cardForaneo) { cardForaneo.style.background = "#ffffff"; cardForaneo.style.borderColor = "#cbd5e1"; }
        if (locInput) locInput.value = "Sede Central";

        // 🏢 En Sede Central: Ocultar selector de vehículos y limpiar flota asignada
        if (vehCol) vehCol.style.display = "none";
        if (vehPlace) {
            vehPlace.classList.remove("hidden");
            vehPlace.style.display = "flex";
        }
        selectedVehicleIds = [];
        const selFleet = document.getElementById("plan_select_fleet");
        if (selFleet) selFleet.value = "";
        if (typeof renderAssignedTags === 'function') renderAssignedTags();

        // Combustible en $0.00 y oculto para trabajos en Sede Central
        const fuelContainer = document.getElementById("plan_fuel_container");
        if (fuelContainer) fuelContainer.style.display = "none";
        const fuelInp = document.getElementById("new_proj_fuel");
        if (fuelInp) fuelInp.value = "0.00";
        if (typeof recalcProjectBudgetPreview === 'function') recalcProjectBudgetPreview();
    } else {
        if (radioForaneo) radioForaneo.checked = true;
        if (radioSede) radioSede.checked = false;
        if (cardForaneo) { cardForaneo.style.background = "#eff6ff"; cardForaneo.style.borderColor = "var(--dalor-blue)"; }
        if (cardSede) { cardSede.style.background = "#ffffff"; cardSede.style.borderColor = "#cbd5e1"; }
        if (locInput && (locInput.value === "Sede Central" || locInput.value === "Sede Central (Taller Guacara)" || locInput.value === "Taller Central Guacara")) locInput.value = "";

        // 📍 Proyecto Foráneo: Mostrar selector de flota y combustible
        if (vehCol) vehCol.style.display = "";
        if (vehPlace) {
            vehPlace.classList.add("hidden");
            vehPlace.style.display = "none";
        }
        const fuelContainer = document.getElementById("plan_fuel_container");
        if (fuelContainer) fuelContainer.style.display = "";
    }
}

function onProjectLocationInput(val) {
    if (!val) return;
    const lower = val.toLowerCase().trim();
    if (lower.includes('sede') || lower.includes('central') || lower.includes('taller') || lower.includes('guacara central')) {
        setProjectType('sede');
    }
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
        if (typeof window !== 'undefined') {
            window.editSelectedVehicleIds = [];
        }
        const selFleet = document.getElementById("edit_select_fleet");
        if (selFleet) selFleet.value = "";
        if (typeof window !== 'undefined' && typeof window.renderEditAssignedTags === 'function') {
            window.renderEditAssignedTags();
        }
    } else {
        if (fleetWrap) fleetWrap.style.display = "";
        if (fleetBanner) fleetBanner.style.display = "none";
        if (fuelWrap) fuelWrap.style.display = "";
    }
}

function onEditProjectLocationInput(val) {
    if (!val) return;
    const lower = val.toLowerCase().trim();
    const isSede = lower.includes('sede') || lower.includes('central') || lower.includes('taller') || lower.includes('guacara');
    applyEditProjectSedeRules(isSede);
}





// ====================================================================

// GESTIÓN DE SUBPESTAÑAS Y FILTRADO DEL MÓDULO DE PROYECTOS (UX ENHANCEMENT)

let currentProjectSubtab = 'list';

// ====================================================================

async function switchProjectSubtab(subtabName) {
    currentProjectSubtab = subtabName || 'list';
    try {
        sessionStorage.setItem('dalor_active_subtab_projects', currentProjectSubtab);
        localStorage.setItem('dalor_active_subtab_projects', currentProjectSubtab);
    } catch(e) {}
    const isForm = (subtabName === 'form');
    const isCompleted = (subtabName === 'completed');
    const isList = (!isForm && !isCompleted);

    const subtabList = document.getElementById('subtab-proj-list');
    const subtabForm = document.getElementById('subtab-proj-form');
    const btnList = document.getElementById('tabbtn-proj-list');
    const btnCompleted = document.getElementById('tabbtn-proj-completed');
    const btnForm = document.getElementById('tabbtn-proj-form');

    if (subtabList) subtabList.classList.toggle('hidden', isForm);
    if (subtabForm) subtabForm.classList.toggle('hidden', !isForm);

    if (btnList) btnList.className = isList ? 'btn-primary' : 'btn-secondary';
    if (btnCompleted) btnCompleted.className = isCompleted ? 'btn-primary' : 'btn-secondary';
    if (btnForm) btnForm.className = isForm ? 'btn-primary' : 'btn-secondary';

    if (!isForm) {
        await loadProjectsList();
    } else {
        // Garantizar carga fresca de personal, flota, herramientas y clientes
        try {
            if (!allPersonnel || allPersonnel.length === 0 || !allAssets || allAssets.length === 0 || !allClients || allClients.length === 0) {
                const [resPers, resAss, resCli] = await Promise.all([
                    authFetch(`${API_BASE}/personnel/`),
                    authFetch(`${API_BASE}/assets/`),
                    authFetch(`${API_BASE}/clients/`)
                ]);
                if (resPers.ok) allPersonnel = await resPers.json();
                if (resAss.ok) allAssets = await resAss.json();
                if (resCli.ok) allClients = await resCli.json();
            }
        } catch (e) {
            console.warn("Error cargando recursos para planificación:", e);
        }
        populateSelectDropdowns();
        populatePlanDropdownSelectors();
        renderAssignedTags();

        // Sincronizar visibilidad de vehículos y tipo de frente (Sede vs Foráneo)
        const curType = document.getElementById("new_proj_type")?.value || 'foraneo';
        if (typeof setProjectType === 'function') setProjectType(curType);

        // Asignar correlativo consecutivo oficial
        try {
            const resCode = await authFetch(`${API_BASE}/projects/next-code`);
            if (resCode.ok) {
                const dataCode = await resCode.json();
                const codeInp = document.getElementById("new_proj_code");
                if (codeInp && (!codeInp.value || codeInp.dataset.autogenerated === "true" || !codeInp.value.trim())) {
                    codeInp.value = dataCode.next_code;
                    codeInp.dataset.autogenerated = "true";
                }
            }
        } catch (e) {
            console.warn("Error fetching next project code:", e);
        }
    }
}




let currentViewingProjectId = null;





// --- BLOQUE L1610-L3479 ---
// ----------------------------------------------------

// 1. PLANIFICACIÓN & ARMADO INTEGRAL DE PROYECTOS

// ----------------------------------------------------

function initProjectPlanningView() {
    switchProjectSubtab('list');
    loadProjectsList();
    populatePlanDropdownSelectors();
    renderAssignedTags();

    // Restaurar conversión pendiente si el usuario refrescó la página
    try {
        const savedConvQuoteId = sessionStorage.getItem('dalor_active_converting_quote_id');
        if (savedConvQuoteId && typeof window.convertQuoteToProject === 'function') {
            setTimeout(() => {
                const stillSaved = sessionStorage.getItem('dalor_active_converting_quote_id');
                if (stillSaved) {
                    window.convertQuoteToProject(stillSaved);
                }
            }, 200);
        }
    } catch(e) {}

    

    // Iniciar con 1 etapa limpia en blanco sin presupuestos ni tareas ficticias
    const container = document.getElementById("projectPhasesContainer");
    if (container && container.children.length === 0) {
        phaseRowsCount = 0;
        addProjectPhaseRow("Fase 1: Ejecución Inicial", [], 7, 0);
    }
}



function populatePlanDropdownSelectors() {
    const rawPersonnel = (window.allPersonnel && window.allPersonnel.length > 0) ? window.allPersonnel : (allPersonnel || []);
    const safePersonnel = rawPersonnel.filter(p => !p.current_project_id && p.status !== 'en_obra' && p.status !== 'inactivo' && (p.status === 'disponible_base' || p.status === 'disponible' || !p.status));

    const rawAssets = (window.allAssets && window.allAssets.length > 0) ? window.allAssets : (allAssets || []);
    // Solo mostrar activos disponibles que no estén asignados a otra obra activa, ni en mantenimiento, ni alquilados
    const availableAssets = rawAssets.filter(a => !a.current_project_id && a.status !== 'en_obra' && a.status !== 'alquilado_a_tercero' && a.status !== 'en_mantenimiento' && a.status !== 'inactivo' && (a.status === 'disponible_base' || a.status === 'disponible' || !a.status));

    // 1. Desplegable de Personal (Solo integrantes disponibles en base)
    const persSel = document.getElementById("plan_select_personnel") || document.getElementById("plan_pers_select");
    if (persSel) {
        persSel.innerHTML = `<option value="">-- Seleccionar Trabajador (${safePersonnel.length} disp. en base) --</option>` + 
            safePersonnel.map(p => `<option value="${p.id}">[${p.code}] ${p.full_name} (${p.role_title || 'Personal Operativo'})</option>`).join('');
        persSel.onchange = function() {
            if (this.value) addPlanResource('personnel');
        };
    }

    // 2. Desplegable de Vehículos (Solo disponibles en base)
    const vehSel = document.getElementById("plan_select_fleet") || document.getElementById("plan_veh_select");
    const vehicles = availableAssets.filter(a => a.asset_type === 'vehiculo' || a.asset_type === 'camioneta');
    if (vehSel) {
        vehSel.innerHTML = `<option value="">-- Seleccionar Unidad / Flota (${vehicles.length} disp. en base) --</option>` + 
            vehicles.map(v => `<option value="${v.id}">[${v.asset_code}] ${v.name} ${v.license_plate ? `(${v.license_plate})` : ''} - Ubic: ${v.current_location || 'Base'}</option>`).join('');
        vehSel.onchange = function() {
            if (this.value) addPlanResource('fleet');
        };
    }

    // 3. Desplegable de Herramientas & Equipos (Solo disponibles en base)
    const toolSel = document.getElementById("plan_select_tools") || document.getElementById("plan_tool_select");
    const tools = availableAssets.filter(a => a.asset_type !== 'vehiculo' && a.asset_type !== 'camioneta');
    if (toolSel) {
        const machinery = tools.filter(t => (t.asset_type === 'maquinaria' || (t.category || '').toLowerCase().includes('maquinaria') || (t.name || '').toLowerCase().includes('montacarga')));
        const standardTools = tools.filter(t => !machinery.includes(t));

        let toolsHtml = `<option value="">-- Seleccionar Equipo o Herramienta (${tools.length} disp. en base) --</option>`;
        if (machinery.length > 0) {
            toolsHtml += `<optgroup label="🚜 Maquinaria Pesada & Equipos Especiales (${machinery.length})">` +
                machinery.map(t => `<option value="${t.id}">🚜 [${t.asset_code}] ${t.name} (S/N: ${t.serial_number || 'S/N'} - ${t.current_location || 'Base'})</option>`).join('') +
                `</optgroup>`;
        }
        if (standardTools.length > 0) {
            toolsHtml += `<optgroup label="🔧 Herramientas & Equipos de Taller (${standardTools.length})">` +
                standardTools.map(t => `<option value="${t.id}">🔧 [${t.asset_code}] ${t.name} (S/N: ${t.serial_number || 'S/N'})</option>`).join('') +
                `</optgroup>`;
        }
        toolSel.innerHTML = toolsHtml;
        toolSel.onchange = function() {
            if (this.value) addPlanResource('tools');
        };
    }

    // 4. Desplegable de Materiales & Insumos de Almacén (filtrando aquellos con stock > 0)
    const matSel = document.getElementById("plan_select_materials") || document.getElementById("plan_mat_select");
    const safeMats = (window.allMaterials && window.allMaterials.length > 0) ? window.allMaterials : (allMaterials || []);
    const availableMats = safeMats.filter(m => (parseFloat(m.stock_quantity) || 0) > 0);
    if (matSel) {
        matSel.innerHTML = `<option value="">-- Seleccionar Material / Insumo (${availableMats.length} con stock disp.) --</option>` +
            availableMats.map(m => `<option value="${m.id}">[${m.code}] ${m.name} (Stock: ${m.stock_quantity} ${m.unit_measure || 'UND'})</option>`).join('');
        matSel.onchange = function() {
            onPlanMaterialSelected();
        };
    }
}

function filterPlanSelect(selectId, query) {
    const sel = document.getElementById(selectId);
    if (!sel) return;
    const q = (query || '').toLowerCase().trim();
    Array.from(sel.options).forEach(opt => {
        if (!opt.value) return;
        const text = (opt.textContent || '').toLowerCase();
        const matches = !q || text.includes(q);
        opt.style.display = matches ? '' : 'none';
        opt.disabled = !matches;
    });
}

var selectedMaterialItems = window.selectedMaterialItems = [];

function onPlanMaterialSelected() {
    const sel = document.getElementById("plan_select_materials") || document.getElementById("plan_mat_select");
    const val = parseInt(sel?.value);
    const unitEl = document.getElementById("plan_mat_unit_label");
    const costEl = document.getElementById("plan_mat_cost_preview");
    if (!val) {
        if (unitEl) unitEl.innerText = "UND";
        if (costEl) costEl.innerText = "$0.00";
        return;
    }
    const safeMats = (window.allMaterials && window.allMaterials.length > 0) ? window.allMaterials : (allMaterials || []);
    const mat = safeMats.find(m => m.id === val);
    if (mat) {
        if (unitEl) unitEl.innerText = mat.unit_measure || "UND";
        if (costEl) costEl.innerText = `$${(mat.unit_cost_usd || 0).toFixed(2)}`;
    }
}

function updatePlanMaterialsCostTotal() {
    const items = window.selectedMaterialItems || [];
    const totalMatCost = items.reduce((acc, it) => acc + ((it.quantity || 0) * (it.unit_cost_usd || 0)), 0);
    const badge = document.getElementById("plan_materials_total_cost_badge");
    if (badge) {
        badge.innerText = `$${totalMatCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;
    }
    const matBudgetInp = document.getElementById("new_proj_materials");
    if (matBudgetInp) {
        matBudgetInp.value = totalMatCost.toFixed(2);
        if (typeof recalcProjectBudgetPreview === 'function') {
            recalcProjectBudgetPreview();
        }
    }
}

// Handler universal para asignación y desasignación de recursos en proyectos
function addPlanResource(type) {
    if (type === 'personnel') {
        const sel = document.getElementById("plan_select_personnel") || document.getElementById("plan_pers_select");
        const val = parseInt(sel?.value);
        if (val && !selectedPersonnelIds.includes(val)) {
            selectedPersonnelIds.push(val);
            renderAssignedTags();
        }
        if (sel) sel.value = "";
    } else if (type === 'fleet' || type === 'vehicle') {
        const sel = document.getElementById("plan_select_fleet") || document.getElementById("plan_veh_select");
        const val = parseInt(sel?.value);
        if (val && !selectedVehicleIds.includes(val)) {
            selectedVehicleIds.push(val);
            renderAssignedTags();
        }
        if (sel) sel.value = "";
    } else if (type === 'tools' || type === 'tool') {
        const sel = document.getElementById("plan_select_tools") || document.getElementById("plan_tool_select");
        const val = parseInt(sel?.value);
        if (val && !selectedToolIds.includes(val)) {
            selectedToolIds.push(val);
            renderAssignedTags();
        }
        if (sel) sel.value = "";
    } else if (type === 'material' || type === 'materials') {
        const sel = document.getElementById("plan_select_materials") || document.getElementById("plan_mat_select");
        const val = parseInt(sel?.value);
        if (!val) {
            alert("⚠️ Selecciona un material del catálogo antes de agregarlo.");
            return;
        }
        const qtyInp = document.getElementById("plan_mat_quantity");
        const qty = parseFloat(qtyInp?.value || 1);
        if (qty <= 0 || isNaN(qty)) {
            alert("⚠️ Ingresa una cantidad válida mayor a 0.");
            if (qtyInp) qtyInp.focus();
            return;
        }
        const safeMats = (window.allMaterials && window.allMaterials.length > 0) ? window.allMaterials : (allMaterials || []);
        const m = safeMats.find(item => item.id === val);
        if (!m) return;

        window.selectedMaterialItems = window.selectedMaterialItems || [];
        const existing = window.selectedMaterialItems.find(it => it.material_id === val);
        if (existing) {
            existing.quantity = Number((existing.quantity + qty).toFixed(2));
        } else {
            window.selectedMaterialItems.push({
                material_id: m.id,
                code: m.code,
                name: m.name,
                unit_measure: m.unit_measure || "UND",
                unit_cost_usd: m.unit_cost_usd || 0.0,
                quantity: qty,
                notes: ""
            });
        }
        if (!selectedMaterialIds.includes(val)) {
            selectedMaterialIds.push(val);
        }
        renderAssignedTags();
        updatePlanMaterialsCostTotal();
        if (sel) sel.value = "";
        if (qtyInp) qtyInp.value = "1";
        onPlanMaterialSelected();
    }
}

function removePlanResource(type, id) {
    if (type === 'personnel') {
        selectedPersonnelIds = selectedPersonnelIds.filter(i => i !== id);
    } else if (type === 'fleet' || type === 'vehicle') {
        selectedVehicleIds = selectedVehicleIds.filter(i => i !== id);
    } else if (type === 'tools' || type === 'tool') {
        selectedToolIds = selectedToolIds.filter(i => i !== id);
    } else if (type === 'material' || type === 'materials') {
        selectedMaterialIds = selectedMaterialIds.filter(i => i !== id);
        window.selectedMaterialItems = (window.selectedMaterialItems || []).filter(it => it.material_id !== id);
        updatePlanMaterialsCostTotal();
    }
    renderAssignedTags();
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

    const persContainer = document.getElementById("plan_tags_personnel") || document.getElementById("plan_pers_tags");

    if (persContainer) {

        if (selectedPersonnelIds.length === 0) {

            persContainer.innerHTML = `<span style="font-size:11px; color:#94a3b8;">Sin personal seleccionado. Selecciona arriba y pulsa '+'.</span>`;

        } else {

            persContainer.innerHTML = selectedPersonnelIds.map(id => {

                const p = allPersonnel.find(item => item.id === id);

                if (!p) return '';

                return `

                    <span class="resource-tag-pill" style="display:inline-flex; align-items:center; gap:6px; background:#eff6ff; color:#1e40af; border:1px solid #bfdbfe; padding:3px 8px; border-radius:9999px; font-size:11px; font-weight:700; margin:2px;">

                        <i class="fa-solid fa-user-check"></i> [${p.code}] ${p.full_name}

                        <button type="button" onclick="removePlanResource('personnel', ${p.id})" style="background:none; border:none; color:#ef4444; cursor:pointer; font-weight:bold; font-size:12px; line-height:1;">&times;</button>

                    </span>

                `;

            }).join('');

        }

    }



    // 2. Vehículos Tags

    const vehContainer = document.getElementById("plan_tags_fleet") || document.getElementById("plan_veh_tags");

    if (vehContainer) {

        if (selectedVehicleIds.length === 0) {

            vehContainer.innerHTML = `<span style="font-size:11px; color:#94a3b8;">Sin unidades asignadas. Selecciona arriba y pulsa '+'.</span>`;

        } else {

            vehContainer.innerHTML = selectedVehicleIds.map(id => {

                const v = allAssets.find(item => item.id === id);

                if (!v) return '';

                return `

                    <span class="resource-tag-pill" style="display:inline-flex; align-items:center; gap:6px; background:#f0fdf4; color:#166534; border:1px solid #bbf7d0; padding:3px 8px; border-radius:9999px; font-size:11px; font-weight:700; margin:2px;">

                        <i class="fa-solid fa-truck"></i> [${v.asset_code}] ${v.name}

                        <button type="button" onclick="removePlanResource('fleet', ${v.id})" style="background:none; border:none; color:#ef4444; cursor:pointer; font-weight:bold; font-size:12px; line-height:1;">&times;</button>

                    </span>

                `;

            }).join('');

        }

    }



    // 3. Herramientas Tags

    const toolContainer = document.getElementById("plan_tags_tools") || document.getElementById("plan_tool_tags");

    if (toolContainer) {

        if (selectedToolIds.length === 0) {

            toolContainer.innerHTML = `<span style="font-size:11px; color:#94a3b8;">Sin equipos seleccionados. Selecciona arriba y pulsa '+'.</span>`;

        } else {

            toolContainer.innerHTML = selectedToolIds.map(id => {

                const t = allAssets.find(item => item.id === id);

                if (!t) return '';

                return `

                    <span class="resource-tag-pill" style="display:inline-flex; align-items:center; gap:6px; background:#fffbeb; color:#92400e; border:1px solid #fde68a; padding:3px 8px; border-radius:9999px; font-size:11px; font-weight:700; margin:2px;">

                        <i class="fa-solid fa-wrench"></i> [${t.asset_code}] ${t.name}

                        <button type="button" onclick="removePlanResource('tools', ${t.id})" style="background:none; border:none; color:#ef4444; cursor:pointer; font-weight:bold; font-size:12px; line-height:1;">&times;</button>

                    </span>

                `;

            }).join('');
        }
    }

    // 4. Materiales & Insumos con Cantidades y Costo
    const matContainer = document.getElementById("plan_tags_materials") || document.getElementById("plan_mat_tags");
    if (matContainer) {
        const matItems = window.selectedMaterialItems || [];
        if (matItems.length === 0) {
            matContainer.innerHTML = `<span style="font-size:11px; color:#94a3b8; font-style:italic;">No hay insumos agregados a la lista de preparación. Selecciona un material arriba, ingresa la cantidad y pulsa '+ Agregar Insumo'.</span>`;
        } else {
            matContainer.innerHTML = `
                <div style="overflow-x:auto; border:1px solid #e2e8f0; border-radius:6px; background:white;">
                    <table style="width:100%; border-collapse:collapse; font-size:11.5px; text-align:left;">
                        <thead>
                            <tr style="background:#f1f5f9; color:#475569; font-weight:700; border-bottom:1px solid #e2e8f0;">
                                <th style="padding:6px 10px;">Código</th>
                                <th style="padding:6px 10px;">Material / Insumo</th>
                                <th style="padding:6px 10px; text-align:center;">Cantidad</th>
                                <th style="padding:6px 10px; text-align:right;">Costo Unit.</th>
                                <th style="padding:6px 10px; text-align:right;">Subtotal</th>
                                <th style="padding:6px 10px; text-align:center; width:40px;"></th>
                            </tr>
                        </thead>
                        <tbody>
                            ${matItems.map(it => {
                                const subtotal = (it.quantity * it.unit_cost_usd).toFixed(2);
                                return `
                                    <tr style="border-bottom:1px solid #f8fafc;">
                                        <td style="padding:6px 10px; font-family:monospace; font-weight:700; color:#334155;">${it.code}</td>
                                        <td style="padding:6px 10px; font-weight:600; color:#0f172a;">${it.name}</td>
                                        <td style="padding:6px 10px; text-align:center; font-weight:700; color:#0284c7;">${it.quantity} ${it.unit_measure}</td>
                                        <td style="padding:6px 10px; text-align:right; color:#64748b;">$${it.unit_cost_usd.toFixed(2)}</td>
                                        <td style="padding:6px 10px; text-align:right; font-weight:700; color:#166534;">$${subtotal}</td>
                                        <td style="padding:6px 10px; text-align:center;">
                                            <button type="button" onclick="removePlanResource('material', ${it.material_id})" style="background:none; border:none; color:#ef4444; cursor:pointer; font-weight:bold; font-size:14px;" title="Eliminar insumo">&times;</button>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }
    }
}



// Creador Dinámico de Etapas / Fases con Sub-campos de Tareas Operativas

function addProjectPhaseRow(defName = "", defTasks = [], defDays = 7, defCost = 0, defUnit = "dias") {

    phaseRowsCount++;

    const container = document.getElementById("projectPhasesContainer");

    const phaseId = `phase_card_${phaseRowsCount}`;

    const pNum = phaseRowsCount;

    if (typeof defTasks === 'string') {
        defTasks = defTasks.split(/[,;\.]\s+/).filter(t => t.trim().length > 0);
    }

    if (!Array.isArray(defTasks)) {
        defTasks = [];
    }

    const card = document.createElement("div");

    card.id = phaseId;

    card.className = "project-phase-card";

    card.style.cssText = "background: white; border: 1px solid #cbd5e1; border-radius: 10px; padding: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); display: flex; flex-direction: column; gap: 10px;";

    card.innerHTML = `

        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;">

            <div style="display: flex; align-items: center; gap: 8px;">

                <span class="phase-number-badge" style="background: var(--dalor-navy); color: white; border-radius: 6px; font-size: 11px; font-weight: 800; padding: 3px 8px;">

                    Etapa ${pNum}

                </span>

                <span style="font-size: 12px; font-weight: 700; color: #475569;">Datos Principales del Hito</span>

            </div>

            <button type="button" onclick="removeProjectPhaseRow('${phaseId}')" style="background: #fee2e2; border: 1px solid #fca5a5; color: #b91c1c; border-radius: 6px; padding: 3px 8px; font-size: 11px; font-weight: 700; cursor: pointer;" title="Eliminar Etapa">

                <i class="fa-solid fa-trash"></i> Eliminar Etapa

            </button>

        </div>

        <!-- Campos de la Fase -->
        <div style="display: grid; grid-template-columns: 2.5fr 1.5fr 1.2fr; gap: 10px;">
            <div>
                <label style="display: block; font-size: 10px; font-weight: 800; color: #475569; text-transform: uppercase; margin-bottom: 3px;">
                    Nombre de la Etapa / Hito
                </label>
                <input type="text" class="form-input ph-name" placeholder="Ej: Fase 1: Movilización & Permisos" value="${defName}" style="font-size: 12px; font-weight: 700;" required>
            </div>
            <div>
                <label style="display: block; font-size: 10px; font-weight: 800; color: #475569; text-transform: uppercase; margin-bottom: 3px;">
                    Duración Estimada
                </label>
                <div style="display: flex; gap: 4px;">
                    <input type="text" inputmode="decimal" class="form-input ph-duration-val" placeholder="Ej: 7" value="${defDays}" style="font-size: 12px; font-weight: bold; width: 55%;">
                    <select class="form-select ph-duration-unit" style="font-size: 10.5px; padding: 4px 2px; width: 45%; font-weight: 700;">
                        <option value="dias" ${defUnit === 'dias' ? 'selected' : ''}>Días</option>
                        <option value="horas" ${defUnit === 'horas' ? 'selected' : ''}>Horas</option>
                    </select>
                </div>
            </div>
            <div>
                <label style="display: block; font-size: 10px; font-weight: 800; color: #475569; text-transform: uppercase; margin-bottom: 3px;">
                    Presupuesto Fase ($)
                </label>
                <input type="text" inputmode="decimal" class="form-input ph-cost" placeholder="Ppto ($)" value="${defCost}" style="font-size: 12px; font-weight: 800; color: var(--dalor-blue);">
            </div>
        </div>



        <!-- Sub-campo de Tareas / Actividades Asignadas a esta Fase -->

        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px;">

            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">

                <label style="font-size: 11px; font-weight: 800; color: var(--dalor-navy); display: flex; align-items: center; gap: 6px;">

                    <i class="fa-solid fa-list-check" style="color: var(--dalor-blue);"></i> Tareas / Actividades Operativas de esta Etapa:

                </label>

                <button type="button" onclick="addProjectPhaseTask('${phaseId}')" class="btn-primary" style="font-size: 10px; padding: 3px 8px; background: #0284c7;">

                    <i class="fa-solid fa-plus"></i> Añadir Tarea

                </button>

            </div>

            

            <div class="phase-tasks-container" style="display: flex; flex-direction: column; gap: 6px;"></div>

        </div>

    `;



    container.appendChild(card);

    

    // Poblar las tareas iniciales

    const tasksContainer = card.querySelector('.phase-tasks-container');

    defTasks.forEach((taskText) => {

        addProjectPhaseTaskRow(tasksContainer, taskText);

    });



    renumberPhasesAndTasks();

}



function addProjectPhaseTask(phaseCardId) {

    const card = document.getElementById(phaseCardId);

    if (!card) return;

    const tasksContainer = card.querySelector('.phase-tasks-container');

    addProjectPhaseTaskRow(tasksContainer, "");

    renumberPhasesAndTasks();

}



function addProjectPhaseTaskRow(container, textValue = "") {

    const taskRow = document.createElement("div");

    taskRow.className = "phase-task-row";

    taskRow.style.cssText = "display: flex; align-items: center; gap: 6px;";

    taskRow.innerHTML = `

        <span class="task-number-badge" style="font-size: 10px; font-weight: 800; background: #e2e8f0; color: #334155; padding: 4px 6px; border-radius: 4px; min-width: 34px; text-align: center;">

            -

        </span>

        <input type="text" class="form-input ph-task-input" placeholder="Escribe la tarea puntual (ej: Corte con oxicorte, Pases de planta...)" value="${textValue}" style="font-size: 11px; flex: 1;" required>

        <button type="button" onclick="this.closest('.phase-task-row').remove(); renumberPhasesAndTasks();" style="background: none; border: none; color: #ef4444; font-size: 16px; cursor: pointer; padding: 0 4px;" title="Eliminar Tarea">&times;</button>

    `;

    container.appendChild(taskRow);

}



function removeProjectPhaseRow(phaseId) {

    const el = document.getElementById(phaseId);

    if (el) el.remove();

    renumberPhasesAndTasks();

}



function renumberPhasesAndTasks() {

    const phaseCards = document.querySelectorAll("#projectPhasesContainer .project-phase-card");

    phaseCards.forEach((card, pIdx) => {

        const badge = card.querySelector('.phase-number-badge');

        if (badge) badge.innerText = `Etapa ${pIdx + 1}`;



        const taskRows = card.querySelectorAll('.phase-task-row');

        taskRows.forEach((tRow, tIdx) => {

            const tBadge = tRow.querySelector('.task-number-badge');

            if (tBadge) tBadge.innerText = `${pIdx + 1}.${tIdx + 1}`;

        });

    });

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



    // Auto-capturar si hay algún recurso seleccionado en el dropdown que no fue pulsado con '+'

    const pSelVal = parseInt(document.getElementById("plan_select_personnel")?.value);

    if (pSelVal && !selectedPersonnelIds.includes(pSelVal)) selectedPersonnelIds.push(pSelVal);



    const fSelVal = parseInt(document.getElementById("plan_select_fleet")?.value);

    if (fSelVal && !selectedVehicleIds.includes(fSelVal)) selectedVehicleIds.push(fSelVal);



    const tSelVal = parseInt(document.getElementById("plan_select_tools")?.value);

    if (tSelVal && !selectedToolIds.includes(tSelVal)) selectedToolIds.push(tSelVal);



    event.preventDefault();



    // 1. Etapas con Sub-tareas Operativas

    const phaseCards = document.querySelectorAll("#projectPhasesContainer .project-phase-card");

    let phases = [];

    phaseCards.forEach((card, idx) => {
        const name = card.querySelector(".ph-name")?.value.trim() || `Fase ${idx + 1}`;
        const rawDur = card.querySelector(".ph-duration-val")?.value || card.querySelector(".ph-days")?.value || "7";
        const durVal = parseLocalizedNumber(rawDur) || 7;
        const durUnit = card.querySelector(".ph-duration-unit")?.value || "dias";
        const cost = parseLocalizedNumber(card.querySelector(".ph-cost")?.value) || 0.0;
        const days = durUnit === "horas" ? Math.max(1, Math.round(durVal / 8)) : Math.max(1, Math.round(durVal));
        
        const taskInputs = card.querySelectorAll(".ph-task-input");
        const tasksList = Array.from(taskInputs).map(inp => inp.value.trim()).filter(Boolean);
        const description = tasksList.length > 0 ? tasksList.join("; ") : name;

        phases.push({
            phase_number: idx + 1,
            name: name,
            description: description,
            duration_days: days,
            duration_unit: durUnit,
            estimated_duration: durVal,
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
        execution_time: (document.getElementById("new_proj_execution_time")?.value || "").trim() || "15 días hábiles",
        contract_amount_usd: parseLocalizedNumber(document.getElementById("new_proj_contract").value),
        scope_of_work: document.getElementById("new_proj_scope").value,
        estimated_labor_usd: parseLocalizedNumber(document.getElementById("new_proj_labor")?.value),
        estimated_fuel_usd: parseLocalizedNumber(document.getElementById("new_proj_fuel")?.value),
        estimated_materials_usd: parseLocalizedNumber(document.getElementById("new_proj_materials")?.value),
        estimated_tools_usd: parseLocalizedNumber(document.getElementById("new_proj_tools")?.value),
        estimated_services_usd: parseLocalizedNumber(document.getElementById("new_proj_services")?.value),
        phases: phases,

        assigned_personnel_ids: selectedPersonnelIds,
        assigned_vehicle_ids: (document.getElementById("new_proj_type")?.value === 'sede' || (document.getElementById("new_proj_location")?.value || '').toLowerCase().includes('sede')) ? [] : selectedVehicleIds,
        assigned_tool_ids: selectedToolIds,
        assigned_material_items: (window.selectedMaterialItems && window.selectedMaterialItems.length > 0)
            ? window.selectedMaterialItems.map(it => ({
                material_id: it.material_id,
                quantity: it.quantity,
                name: it.name,
                code: it.code,
                unit_measure: it.unit_measure,
                notes: it.notes || ""
            }))
            : (selectedMaterialIds || []).map(id => ({ material_id: id, quantity: 1 }))
    };



    try {
        const res = await authFetch(`${API_BASE}/projects/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            const data = await res.json();
            
            // Si proviene de un presupuesto, marcar la cotización como 'aprobado'
            const convQuoteId = document.getElementById("converting_quotation_id") ? document.getElementById("converting_quotation_id").value : "";
            if (convQuoteId) {
                try {
                    await authFetch(`${API_BASE}/quotations/${convQuoteId}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ status: "aprobado" })
                    });
                } catch (errQ) {

                    console.error("Error actualizando status de cotización vinculada:", errQ);

                }

                cancelQuotationConversion();

            }



            alert(`¡Proyecto ${data.code} planificado, estructurado y activado con éxito!`);

            document.getElementById("projectCreateForm").reset();

            selectedPersonnelIds = [];

            selectedVehicleIds = [];

            selectedToolIds = [];

            renderAssignedTags();

            await loadInitialMasterData();

            loadProjectsList();

            loadQuotations();

        } else {

            const err = await res.json();

            alert("Error: " + (err.detail || JSON.stringify(err)));

        }

    } catch (e) {

        alert("Error al planificar proyecto.");

    }

}



var projectCurrentPage = 1;
var projectPageSize = 6;
var lastFilteredProjects = [];

async function loadProjectsList() {
    const container = document.getElementById("projectsCardsContainer");
    if (!container) return;

    // Si ya tenemos proyectos en memoria de una visita previa, renderizar de inmediato (0ms de espera)
    if (Array.isArray(window.allProjects) && window.allProjects.length > 0) {
        allProjects = window.allProjects;
        renderProjectsWithPagination(false);
    } else {
        container.innerHTML = `<div style="grid-column: span 2; text-align: center; padding: 20px; color: #94a3b8;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando proyectos...</div>`;
    }

    try {
        const res = await authFetch(`${API_BASE}/projects/`);
        if (!res.ok) throw new Error("Error HTTP " + res.status);
        const data = await res.json();
        allProjects = Array.isArray(data) ? data : [];

        // 1. Ordenar descendente para que las obras recién creadas aparezcan siempre arriba
        allProjects.sort((a, b) => b.id - a.id);
        window.allProjects = allProjects;

        // 2. Poblar selector de clientes si está en pantalla
        const clientFilterSelect = document.getElementById("project_client_filter");
        if (clientFilterSelect) {
            const currentSelected = clientFilterSelect.value;
            const uniqueClients = Array.from(new Set(allProjects.map(p => p.client_name).filter(Boolean))).sort();
            clientFilterSelect.innerHTML = `<option value="">🏢 Todos los Clientes</option>` +
                uniqueClients.map(c => `<option value="${c}">${c}</option>`).join('');
            if (currentSelected) clientFilterSelect.value = currentSelected;
        }

        renderProjectsWithPagination(true);
    } catch (e) {
        console.error("Error al cargar proyectos:", e);
        if (container) container.innerHTML = `<div style="grid-column: span 2; text-align: center; color: #e11d48; padding: 20px;">Error al cargar proyectos.</div>`;
    }
}

function changeProjectPageSize(size) {
    projectPageSize = parseInt(size) || 6;
    projectCurrentPage = 1;
    renderProjectsWithPagination(false);
}

function goToProjectPage(page) {
    projectCurrentPage = page;
    renderProjectsWithPagination(false);
    const container = document.getElementById("projectsCardsContainer");
    if (container) container.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

let currentProjectCxcFilter = 'all';

function setProjectCxcFilter(fType) {
    currentProjectCxcFilter = fType;
    ['all', 'open', 'paid', 'none'].forEach(f => {
        const btn = document.getElementById(`btn_proj_cxc_${f}`);
        if (btn) btn.className = (f === fType) ? 'btn-primary' : 'btn-secondary';
    });
    projectCurrentPage = 1;
    filterProjectsList();
}
window.setProjectCxcFilter = setProjectCxcFilter;

function filterProjectsList() {
    renderProjectsWithPagination(true);
}

function renderProjectsWithPagination(resetPage = false) {
    const container = document.getElementById("projectsCardsContainer");
    const pagContainer = document.getElementById("projectsPaginationContainer");
    if (!container) return;

    if (resetPage) projectCurrentPage = 1;

    const isCompletedView = (currentProjectSubtab === 'completed');
    const q = (document.getElementById("project_search_input")?.value || '').toLowerCase().trim();
    const selClient = (document.getElementById("project_client_filter")?.value || '').toLowerCase().trim();

    let list = (allProjects || []).filter(p => isCompletedView ? (p.status === 'culminado') : (p.status !== 'culminado'));

    if (q) {
        list = list.filter(p =>
            (p.code || '').toLowerCase().includes(q) ||
            (p.name || '').toLowerCase().includes(q) ||
            (p.client_name || '').toLowerCase().includes(q) ||
            (p.location || '').toLowerCase().includes(q)
        );
    }

    if (selClient) {
        list = list.filter(p => (p.client_name || '').toLowerCase().includes(selClient));
    }

    if (currentProjectCxcFilter === 'open') {
        list = list.filter(p => p.cxc_status === 'abierta' || p.cxc_status === 'parcial' || (p.cxc_pending_usd && p.cxc_pending_usd > 0.05));
    } else if (currentProjectCxcFilter === 'paid') {
        list = list.filter(p => p.cxc_status === 'cerrada' || (p.has_cxc && (!p.cxc_pending_usd || p.cxc_pending_usd <= 0.05) && p.cxc_paid_usd > 0));
    } else if (currentProjectCxcFilter === 'none') {
        list = list.filter(p => p.cxc_status === 'sin_cxc' || (!p.has_cxc && !p.total_billed_cxc_usd));
    }

    lastFilteredProjects = list;
    const totalFiltered = list.length;
    const effectivePageSize = projectPageSize === 1000 ? (totalFiltered || 1) : projectPageSize;
    const totalPages = Math.ceil(totalFiltered / effectivePageSize) || 1;

    if (projectCurrentPage > totalPages) projectCurrentPage = totalPages;
    if (projectCurrentPage < 1) projectCurrentPage = 1;

    // Actualizar badge superior
    const badge = document.getElementById("projects_count_badge");
    if (badge) {
        const totalBase = (allProjects || []).filter(p => isCompletedView ? p.status === 'culminado' : p.status !== 'culminado').length;
        if (totalFiltered === totalBase) {
            badge.innerText = `${totalFiltered} ${isCompletedView ? 'obra(s) culminada(s)' : 'obra(s) activa(s)'} • Pág. ${projectCurrentPage} de ${totalPages}`;
        } else {
            badge.innerText = `${totalFiltered} de ${totalBase} ${isCompletedView ? 'culminada(s)' : 'activa(s)'} • Pág. ${projectCurrentPage} de ${totalPages}`;
        }
    }

    if (totalFiltered === 0) {
        container.innerHTML = isCompletedView
            ? `<div style="grid-column: span 2; text-align: center; padding: 30px; color: #94a3b8;"><i class="fa-solid fa-flag-checkered" style="font-size: 28px; margin-bottom: 8px; color: #10b981;"></i><br><b>No hay obras culminadas en el archivo histórico todavía.</b><br><small>Las obras culminadas al 100% se archivarán aquí automáticamente con su margen y rentabilidad consolidados.</small></div>`
            : `<div style="grid-column: span 2; text-align: center; padding: 20px; color: #94a3b8;">No se encontraron obras con el filtro seleccionado.</div>`;
        if (pagContainer) pagContainer.innerHTML = '';
        return;
    }

    const startIndex = (projectCurrentPage - 1) * effectivePageSize;
    const endIndex = Math.min(startIndex + effectivePageSize, totalFiltered);
    const paginatedItems = list.slice(startIndex, endIndex);

    const savedUserStr = sessionStorage.getItem('dalor_user') || localStorage.getItem('dalor_user');
    const userObj = savedUserStr ? JSON.parse(savedUserStr) : (currentUser || {});
    const urole = (userObj.role_name || userObj.role || userObj.username || '').toLowerCase();
    const isDirector = urole.includes('director') || userObj.is_superuser || false;
    const isFinanzas = urole.includes('finanz') || urole.includes('admin') || false;
    const canSeeFinances = isDirector || isFinanzas || urole.includes('ingeniero') || true;

    container.innerHTML = paginatedItems.map(p => renderProjectCardHtml(p, canSeeFinances, isDirector)).join('');

    renderProjectsPaginationControls(totalFiltered, effectivePageSize, totalPages, startIndex, endIndex);
}

function renderProjectsPaginationControls(totalItems, pageSize, totalPages, startIndex, endIndex) {
    const pagContainer = document.getElementById("projectsPaginationContainer");
    if (!pagContainer) return;

    if (totalPages <= 1 && totalItems <= 6) {
        pagContainer.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 11.5px; color: #64748b;">
                <span>Mostrando <b>${totalItems}</b> obra(s)</span>
                <div style="display: flex; align-items: center; gap: 6px;">
                    <span>Mostrar:</span>
                    <select onchange="changeProjectPageSize(this.value)" style="padding: 2px 6px; font-size: 11px; border: 1px solid #cbd5e1; border-radius: 4px; background: white; font-weight: 700;">
                        <option value="6" ${pageSize === 6 ? 'selected' : ''}>6 por página</option>
                        <option value="12" ${pageSize === 12 ? 'selected' : ''}>12 por página</option>
                        <option value="24" ${pageSize === 24 ? 'selected' : ''}>24 por página</option>
                        <option value="1000" ${pageSize === 1000 ? 'selected' : ''}>Ver todos</option>
                    </select>
                </div>
            </div>
        `;
        return;
    }

    let pageButtons = '';
    const cur = projectCurrentPage;
    let startP = Math.max(1, cur - 2);
    let endP = Math.min(totalPages, cur + 2);

    if (startP > 1) {
        pageButtons += `<button type="button" onclick="goToProjectPage(1)" class="btn-secondary" style="padding: 4px 9px; font-size: 11px; border-radius: 5px;">1</button>`;
        if (startP > 2) pageButtons += `<span style="padding: 0 4px; color: #94a3b8;">...</span>`;
    }

    for (let i = startP; i <= endP; i++) {
        if (i === cur) {
            pageButtons += `<button type="button" class="btn-primary" style="padding: 4px 10px; font-size: 11px; font-weight: 800; border-radius: 5px; background: var(--dalor-navy);">${i}</button>`;
        } else {
            pageButtons += `<button type="button" onclick="goToProjectPage(${i})" class="btn-secondary" style="padding: 4px 9px; font-size: 11px; border-radius: 5px;">${i}</button>`;
        }
    }

    if (endP < totalPages) {
        if (endP < totalPages - 1) pageButtons += `<span style="padding: 0 4px; color: #94a3b8;">...</span>`;
        pageButtons += `<button type="button" onclick="goToProjectPage(${totalPages})" class="btn-secondary" style="padding: 4px 9px; font-size: 11px; border-radius: 5px;">${totalPages}</button>`;
    }

    pagContainer.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 12px; color: #475569; flex-wrap: wrap; gap: 10px; box-shadow: 0 1px 2px rgba(0,0,0,0.04);">
            <div style="font-weight: 600;">
                Mostrando <b style="color: var(--dalor-navy);">${startIndex + 1} - ${endIndex}</b> de <b style="color: var(--dalor-navy);">${totalItems}</b> obra(s)
            </div>

            <div style="display: flex; align-items: center; gap: 6px;">
                <button type="button" onclick="goToProjectPage(1)" class="btn-secondary" style="padding: 4px 8px; font-size: 11px; border-radius: 5px;" ${cur === 1 ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : ''} title="Primera página">
                    <i class="fa-solid fa-angles-left"></i>
                </button>
                <button type="button" onclick="goToProjectPage(${cur - 1})" class="btn-secondary" style="padding: 4px 9px; font-size: 11px; border-radius: 5px;" ${cur === 1 ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : ''} title="Página anterior">
                    <i class="fa-solid fa-chevron-left"></i> Anterior
                </button>

                <div style="display: flex; align-items: center; gap: 4px;">
                    ${pageButtons}
                </div>

                <button type="button" onclick="goToProjectPage(${cur + 1})" class="btn-secondary" style="padding: 4px 9px; font-size: 11px; border-radius: 5px;" ${cur === totalPages ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : ''} title="Página siguiente">
                    Siguiente <i class="fa-solid fa-chevron-right"></i>
                </button>
                <button type="button" onclick="goToProjectPage(${totalPages})" class="btn-secondary" style="padding: 4px 8px; font-size: 11px; border-radius: 5px;" ${cur === totalPages ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : ''} title="Última página">
                    <i class="fa-solid fa-angles-right"></i>
                </button>
            </div>

            <div style="display: flex; align-items: center; gap: 6px;">
                <span style="font-size: 11.5px; color: #64748b;">Por página:</span>
                <select onchange="changeProjectPageSize(this.value)" style="padding: 3px 8px; font-size: 11.5px; border: 1px solid #cbd5e1; border-radius: 5px; background: white; font-weight: 700; color: var(--dalor-navy); cursor: pointer;">
                    <option value="6" ${pageSize === 6 ? 'selected' : ''}>6 obras</option>
                    <option value="12" ${pageSize === 12 ? 'selected' : ''}>12 obras</option>
                    <option value="24" ${pageSize === 24 ? 'selected' : ''}>24 obras</option>
                    <option value="1000" ${pageSize === 1000 ? 'selected' : ''}>Ver todas</option>
                </select>
            </div>
        </div>
    `;
}

function renderProjectCardHtml(p, canSeeFinances, isDirector) {
    const spent = p.total_spent_usd || 0;
    const budget = p.budget_limit_usd || 0;
    const contract = p.contract_amount_usd || 0;
    const balance = budget - spent;
    const isOverBudget = spent > budget && budget > 0;
    const realBurnPct = budget > 0 ? (spent / budget * 100).toFixed(1) : 0;
    const marginReal = contract - spent;
    const marginRealPct = contract > 0 ? ((marginReal / contract) * 100).toFixed(1) : 0;

    const phasesCount = p.phases ? p.phases.length : 0;
    const completedPhases = p.phases ? p.phases.filter(ph => ph.status === 'completado').length : 0;

    // Calcular porcentaje de avance físico
    let progressPct = (p.progress_pct !== undefined && p.progress_pct > 0) ? p.progress_pct : 0;
    if (phasesCount > 0 && progressPct === 0) {
        let totalT = 0;
        let doneT = 0;
        (p.phases || []).forEach(ph => {
            const raw = (ph.description || '').split(';').map(t => t.trim()).filter(Boolean);
            if (raw.length > 0) {
                totalT += raw.length;
                if (ph.status === 'completado') {
                    doneT += raw.length;
                } else {
                    doneT += raw.filter(t => t.startsWith('[x]') || t.startsWith('[X]')).length;
                }
            } else {
                totalT += 1;
                if (ph.status === 'completado') doneT += 1;
            }
        });
        if (totalT > 0) progressPct = Math.round((doneT / totalT) * 100);
    }
    if (phasesCount > 0 && completedPhases === phasesCount) {
        progressPct = 100;
    }

    let burnColor = '#059669'; // verde
    if (realBurnPct >= 80 && realBurnPct <= 100) burnColor = '#f59e0b'; // ámbar
    if (realBurnPct > 100) burnColor = '#e11d48'; // rojo sobrecosto

    const isCulminated = p.status === 'culminado';
    let statusBg = isCulminated ? '#d1fae5' : (p.status === 'completado' ? '#dcfce7' : '#e0f2fe');
    let statusColor = isCulminated ? '#065f46' : (p.status === 'completado' ? '#166534' : '#0369a1');
    let statusLabel = isCulminated ? '🏁 Culminado' : (p.status === 'completado' ? '✅ Completado' : (p.status || 'Activo'));

    const cxcStatus = p.cxc_status || (p.has_cxc ? 'abierta' : 'sin_cxc');
    const cxcPaid = p.cxc_paid_usd || 0;
    const cxcPending = (typeof p.cxc_pending_usd === 'number') ? p.cxc_pending_usd : Math.max(0, (p.total_billed_cxc_usd || 0) - cxcPaid);
    let cxcBadgeHtml = '';
    if (cxcStatus === 'cerrada' || (p.has_cxc && cxcPending <= 0.05)) {
        cxcBadgeHtml = `<span onclick="event.stopPropagation(); goToProjectCxC('${p.code || p.id}')" style="font-size: 10px; font-weight: 800; background: #dcfce7; color: #166534; border: 1px solid #86efac; padding: 2px 7px; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px; cursor: pointer;" title="Obra totalmente solventada en CxC ($${Number(cxcPaid || 0).toLocaleString()} USD) - Clic para ver en Finanzas"><i class="fa-solid fa-circle-check"></i> CxC Solvente</span>`;
    } else if (cxcStatus === 'parcial' || (cxcPaid > 0 && cxcPending > 0.05)) {
        cxcBadgeHtml = `<span onclick="event.stopPropagation(); goToProjectCxC('${p.code || p.id}')" style="font-size: 10px; font-weight: 800; background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; padding: 2px 7px; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px; cursor: pointer;" title="Abono parcial registrado. Pendiente: $${Number(cxcPending || 0).toLocaleString()} USD - Clic para ver en Finanzas"><i class="fa-solid fa-chart-pie"></i> CxC Parcial ($${Number(cxcPending || 0).toLocaleString()} pend.)</span>`;
    } else if (cxcStatus === 'abierta' || p.has_cxc || (p.total_billed_cxc_usd && p.total_billed_cxc_usd > 0)) {
        cxcBadgeHtml = `<span onclick="event.stopPropagation(); goToProjectCxC('${p.code || p.id}')" style="font-size: 10px; font-weight: 800; background: #fef3c7; color: #92400e; border: 1px solid #fde68a; padding: 2px 7px; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px; cursor: pointer;" title="Factura emitida en CxC pendiente de cobro ($${Number(cxcPending || 0).toLocaleString()} USD) - Clic para ver en Finanzas"><i class="fa-solid fa-hourglass-half"></i> CxC Abierta ($${Number(cxcPending || 0).toLocaleString()} pend.)</span>`;
    } else {
        cxcBadgeHtml = `<span onclick="event.stopPropagation(); goToProjectCxC('${p.code || p.id}')" style="font-size: 10px; font-weight: 800; background: #f1f5f9; color: #64748b; border: 1px solid #cbd5e1; padding: 2px 7px; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px; cursor: pointer;" title="Obra sin valuación emitida en CxC - Clic para gestionar en Finanzas"><i class="fa-solid fa-file-circle-question"></i> Sin Facturar</span>`;
    }

    return `
    <div class="card project-card" data-status="${p.status || 'activo'}" data-client="${p.client_name || ''}" style="border-left: 4px solid ${isCulminated ? '#10b981' : 'var(--dalor-blue)'}; margin-bottom: 0; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.06);">
        <div>
            <!-- Encabezado de la Obra -->
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                <div style="max-width: 75%;">
                    <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
                        <span style="font-size: 11px; font-weight: 800; background: var(--dalor-navy); color: white; padding: 2px 8px; border-radius: 4px;">${p.code}</span>
                        ${cxcBadgeHtml}
                    </div>
                    <h4 style="font-size: 14.5px; font-weight: 800; color: var(--dalor-navy); margin-top: 4px; line-height: 1.3; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${p.name}">${p.name}</h4>
                    <p style="font-size: 11px; color: #64748b; margin-top: 2px;">
                        <i class="fa-solid fa-building-user"></i> Cliente: <b>${p.client_name || 'General'}</b> &bull; <i class="fa-solid fa-location-dot"></i> <b>${p.location}</b>
                    </p>
                </div>
                <span style="font-size: 10px; background: ${statusBg}; color: ${statusColor}; padding: 3px 10px; border-radius: 9999px; font-weight: 800; text-transform: uppercase; white-space: nowrap;">
                    ${statusLabel}
                </span>
            </div>

            ${isCulminated ? `
            <div style="background: #ecfdf5; border: 1.5px solid #10b981; border-radius: 8px; padding: 8px 12px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px;">
                <div>
                    <span style="font-size: 10px; font-weight: 800; color: #065f46; text-transform: uppercase;">Rentabilidad Final Consolidada:</span>
                    <div style="font-size: 13px; font-weight: 900; color: ${marginReal >= 0 ? '#059669' : '#e11d48'};">
                        ${marginReal >= 0 ? '+' : ''}$${marginReal.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})} USD (${marginRealPct}%)
                    </div>
                </div>
                <div style="text-align: right;">
                    <span style="font-size: 10px; color: #047857;">Monto Contrato: <b>$${contract.toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 0})}</b></span><br>
                    <span style="font-size: 10px; color: #64748b;">Costo Real: <b>$${spent.toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 0})}</b></span>
                </div>
            </div>
            ` : ''}

            <!-- 1. BARRA DE AVANCE FÍSICO GENERAL DE LA OBRA -->
            <div style="margin-bottom: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 12px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                    <span style="font-size: 10.5px; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.5px;">
                        <i class="fa-solid fa-bars-progress" style="color: var(--dalor-blue);"></i> Avance Físico Global
                    </span>
                    <span style="font-size: 11px; font-weight: 900; color: ${progressPct >= 100 ? '#059669' : 'var(--dalor-blue)'};">
                        ${progressPct}%
                    </span>
                </div>
                <div style="height: 7px; background: #e2e8f0; border-radius: 9999px; overflow: hidden;">
                    <div style="width: ${progressPct}%; height: 100%; background: ${progressPct >= 100 ? '#10b981' : 'linear-gradient(90deg, #0284c7, #2563eb)'}; transition: width 0.4s ease;"></div>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 9.5px; color: #64748b; margin-top: 4px;">
                    <span>${completedPhases} de ${phasesCount} Etapas culminadas</span>
                    <span>${p.duration_days} días de ejecución</span>
                </div>
            </div>

            <!-- 2. CONTROL FINANCIERO Y JOB COSTING -->
            ${canSeeFinances ? `
            <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; margin-bottom: 10px; box-shadow: 0 1px 2px rgba(0,0,0,0.03);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <span style="font-size: 10.5px; font-weight: 800; color: #475569; text-transform: uppercase;">
                        <i class="fa-solid fa-chart-pie" style="color: #f59e0b;"></i> Job Costing en Tiempo Real
                    </span>
                    <span style="font-size: 9.5px; font-weight: 800; color: ${isOverBudget ? '#e11d48' : '#059669'}; background: ${isOverBudget ? '#ffe4e6' : '#dcfce7'}; padding: 2px 6px; border-radius: 4px;">
                        ${isOverBudget ? '⚠️ Sobrecosto' : '✅ En Presupuesto'}
                    </span>
                </div>
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; text-align: center;">
                    <div style="background: #f8fafc; padding: 6px 2px; border-radius: 6px; border: 1px solid #f1f5f9;">
                        <span style="font-size: 8.5px; color: #64748b; text-transform: uppercase; display: block;">Contrato</span>
                        <strong style="font-size: 11.5px; color: var(--dalor-navy);">$${contract.toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 0})}</strong>
                    </div>
                    <div style="background: #f8fafc; padding: 6px 2px; border-radius: 6px; border: 1px solid #f1f5f9;">
                        <span style="font-size: 8.5px; color: #64748b; text-transform: uppercase; display: block;">Ppto Techo</span>
                        <strong style="font-size: 11.5px; color: #0284c7;">$${budget.toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 0})}</strong>
                    </div>
                    <div style="background: #f8fafc; padding: 6px 2px; border-radius: 6px; border: 1px solid #f1f5f9;">
                        <span style="font-size: 8.5px; color: #64748b; text-transform: uppercase; display: block;">Gasto Real</span>
                        <strong style="font-size: 11.5px; color: ${isOverBudget ? '#e11d48' : '#d97706'};">$${spent.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong>
                    </div>
                    <div style="background: #f8fafc; padding: 6px 2px; border-radius: 6px; border: 1px solid #f1f5f9;">
                        <span style="font-size: 8.5px; color: #64748b; text-transform: uppercase; display: block;">Saldo</span>
                        <strong style="font-size: 11.5px; color: ${balance >= 0 ? '#059669' : '#e11d48'};">
                            ${balance >= 0 ? '+' : ''}$${balance.toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 0})}
                        </strong>
                    </div>
                </div>
                <div style="font-size: 10px; color: #64748b; margin-top: 4px;">
                    <div style="display: flex; justify-content: space-between; font-weight: 700; margin-bottom: 2px;">
                        <span>Consumo: <b>${realBurnPct}%</b> ($${spent.toLocaleString()} / $${budget.toLocaleString()})</span>
                        <span style="color: #059669;">Margen: <b>${marginRealPct}%</b></span>
                    </div>
                    <div style="height: 6px; background: #e2e8f0; border-radius: 9999px; overflow: hidden;">
                        <div style="width: ${Math.min(100, Math.max(0, realBurnPct))}%; height: 100%; background: ${burnColor};"></div>
                    </div>
                </div>
            </div>
            ` : `
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; display: grid; grid-template-columns: 1fr 1fr 1fr; text-align: center; margin-bottom: 10px;">
                <div>
                    <span style="font-size: 10px; color: #64748b; text-transform: uppercase;">Duración Total</span>
                    <p style="font-size: 13px; font-weight: 800; color: var(--dalor-navy);">${p.duration_days} días</p>
                </div>
                <div>
                    <span style="font-size: 10px; color: #64748b; text-transform: uppercase;">Hitos WBS</span>
                    <p style="font-size: 13px; font-weight: 800; color: #0284c7;">${phasesCount} Etapas</p>
                </div>
                <div>
                    <span style="font-size: 10px; color: #64748b; text-transform: uppercase;">Régimen de Turno</span>
                    <p style="font-size: 13px; font-weight: 800; color: #059669;">Operativo</p>
                </div>
            </div>
            `}
        </div>

        <div>
            <!-- Metadatos de la Obra y Opción Eliminar -->
            <div style="font-size: 11px; color: #64748b; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #f1f5f9; padding-top: 8px; margin-bottom: 8px;">
                <span><i class="fa-solid fa-list-ol"></i> <b>${phasesCount} Etapas</b> &bull; <b>${p.duration_days} días</b></span>
                ${isDirector ? `
                <button type="button" onclick="deleteProject(${p.id})" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 11px; font-weight: 700; padding: 2px 4px; display: inline-flex; align-items: center; gap: 4px;" title="Inactivar Proyecto">
                    <i class="fa-solid fa-trash"></i> Eliminar
                </button>
                ` : ''}
            </div>

            <!-- Barra de Botones Adaptativa y Proporcional (Sin Desbordamiento) -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(75px, 1fr)); gap: 6px;">
                ${(() => {
                    const billedVal = Number(p.total_billed_cxc_usd || 0);
                    const contractVal = Number(p.contract_amount_usd || 0);
                    const isFullyBilled = p.is_fully_billed || (contractVal > 0 && billedVal >= contractVal - 0.05);
                    const hasPartialBilled = billedVal > 0 && !isFullyBilled;
                    const pctBilled = contractVal > 0 ? Math.min(100, Math.round((billedVal / contractVal) * 100)) : 0;
                    
                    if (isFullyBilled) {
                        return `<span onclick="event.stopPropagation(); navigateToProjectCxC('${p.code || p.id}')" style="padding: 6px 6px; font-size: 10.5px; background: #dcfce7; color: #166534; border: 1px solid #86efac; border-radius: 6px; font-weight: 800; display: flex; align-items: center; justify-content: center; gap: 4px; white-space: nowrap; cursor: pointer;" title="Contrato 100% Facturado en CxC ($${billedVal.toLocaleString()} USD) - Clic para ver en Finanzas">
                            <i class="fa-solid fa-circle-check" style="color: #16a34a;"></i> Facturado 100%
                        </span>`;
                    } else if (hasPartialBilled) {
                        return `<span onclick="event.stopPropagation(); navigateToProjectCxC('${p.code || p.id}')" style="padding: 6px 6px; font-size: 10.5px; background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; border-radius: 6px; font-weight: 800; display: flex; align-items: center; justify-content: center; gap: 4px; white-space: nowrap; cursor: pointer;" title="Facturado Parcial: $${billedVal.toLocaleString()} de $${contractVal.toLocaleString()} USD (${pctBilled}%) - Clic para ver en Finanzas">
                            <i class="fa-solid fa-chart-pie" style="color: #0284c7;"></i> Facturado ${pctBilled}%
                        </span>`;
                    } else {
                        return `<span onclick="event.stopPropagation(); navigateToProjectCxC('${p.code || p.id}')" style="padding: 6px 6px; font-size: 10.5px; background: #f8fafc; color: #64748b; border: 1px solid #cbd5e1; border-radius: 6px; font-weight: 800; display: flex; align-items: center; justify-content: center; gap: 4px; white-space: nowrap; cursor: pointer;" title="Obra sin valuaciones emitidas en CxC - Clic para ver en Finanzas">
                            <i class="fa-regular fa-file"></i> Sin Facturar (0%)
                        </span>`;
                    }
                })()}

                <button type="button" onclick="openAddendumModal(${p.id})" class="btn-secondary" style="padding: 6px 4px; font-size: 10.5px; background: #faf5ff; color: #9333ea; border: 1.5px solid #d8b4fe; font-weight: 800; text-align: center; border-radius: 6px; display: flex; align-items: center; justify-content: center; gap: 4px; white-space: nowrap;" title="Registrar Adenda Contractual / Obra Extra (+USD)">
                    <i class="fa-solid fa-file-circle-plus"></i> + Adenda
                </button>

                <button type="button" onclick="openRequestProjectResourcesModal(${p.id})" class="btn-primary" style="padding: 6px 4px; font-size: 10.5px; background: #0284c7; text-align: center; border-radius: 6px; display: flex; align-items: center; justify-content: center; gap: 4px; white-space: nowrap;" title="Solicitar Recursos y Materiales a Almacén para esta obra">
                    <i class="fa-solid fa-truck-ramp-box"></i> Insumos
                </button>

                <button type="button" onclick="navigateToProjectGuides(${p.id}, '${p.code}')" class="btn-secondary" style="padding: 6px 4px; font-size: 10.5px; background: #f8fafc; color: #0284c7; border: 1px solid #cbd5e1; text-align: center; border-radius: 6px; display: flex; align-items: center; justify-content: center; gap: 4px; white-space: nowrap;" title="Consultar Guías de Despacho emitidas para esta obra">
                    <i class="fa-solid fa-truck"></i> Guías
                </button>

                <button type="button" onclick="openEditProjectModal(${p.id})" class="btn-secondary" style="padding: 6px 4px; font-size: 10.5px; background: #fffbeb; color: #b45309; border: 1.5px solid #fde68a; font-weight: 800; text-align: center; border-radius: 6px; display: flex; align-items: center; justify-content: center; gap: 4px; white-space: nowrap;" title="Reabrir / Editar Proyecto">
                    <i class="fa-solid fa-pen-to-square"></i> Editar
                </button>

                <button type="button" onclick="viewProjectDetails(${p.id})" class="btn-primary" style="padding: 6px 4px; font-size: 10.5px; text-align: center; border-radius: 6px; display: flex; align-items: center; justify-content: center; gap: 4px; white-space: nowrap;" title="Ver Ficha y Etapas del Proyecto">
                    <i class="fa-solid fa-eye"></i> Ficha
                </button>
            </div>

            <!-- Desglose de Fases & Tareas Desplegable Directo -->
            <details style="margin-top: 8px; font-size: 11px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 10px;">
                <summary style="cursor: pointer; font-weight: 700; color: var(--dalor-navy); display: flex; justify-content: space-between; align-items: center;">
                    <span><i class="fa-solid fa-list-check" style="color: var(--dalor-blue);"></i> Tareas por Fase de Obra (${phasesCount})</span>
                    <span style="font-size: 10px; color: #0284c7; font-weight: 600;">(Ver Desglose)</span>
                </summary>
                <div style="margin-top: 8px; display: flex; flex-direction: column; gap: 6px;">
                    ${(p.phases || []).map((ph, idx) => `
                        <div style="background: white; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 8px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; font-weight: 700; color: var(--dalor-navy);">
                                <span><b>Etapa ${idx + 1}:</b> ${ph.name}</span>
                                <span style="font-size: 10px; font-weight: 800; color: ${ph.status === 'completado' ? '#059669' : (ph.status === 'en_progreso' ? '#0284c7' : '#64748b')};">
                                    ${ph.status === 'completado' ? '✅ Culminada' : (ph.status === 'en_progreso' ? '🔄 En Progreso' : '⏳ Pendiente')}
                                </span>
                            </div>
                            ${ph.description ? `
                                <div style="margin-top: 4px; padding-left: 8px; border-left: 2px solid #cbd5e1; font-size: 10px; color: #475569; display: flex; flex-direction: column; gap: 2px;">
                                    ${ph.description.split(/[,;\.]\s+/).filter(t => t.trim().length > 2).map((t, tidx) => `
                                        <div>&bull; <b>${idx + 1}.${tidx + 1}</b> ${t}</div>
                                    `).join('')}
                                </div>
                            ` : ''}
                        </div>
                    `).join('') || '<div style="color: #94a3b8; font-style: italic;">Sin etapas estructuradas todavía.</div>'}
                </div>
            </details>
        </div>
    </div>
    `;
}

async function viewProjectDetails(projectId) {

    try {

        currentViewingProjectId = projectId;
        window.currentViewingProjectId = projectId;
        const modalDetailEl = document.getElementById("modalProjectDetail");
        if (modalDetailEl) modalDetailEl.dataset.projectId = String(projectId);

        const res = await authFetch(`${API_BASE}/projects/${projectId}/details`);
        if (!res.ok) throw new Error("Error HTTP " + res.status);

        const data = await res.json();

        currentViewingProjectId = data.id;
        window.currentViewingProjectId = data.id;
        if (modalDetailEl) modalDetailEl.dataset.projectId = String(data.id);

        // Determinar permisos de rol para modal
        const savedUserStr = sessionStorage.getItem('dalor_user') || localStorage.getItem('dalor_user');
        const userObj = savedUserStr ? JSON.parse(savedUserStr) : (currentUser || {});
        const uname = (userObj.username || '').toLowerCase();
        const urole = (userObj.role_name || '').toLowerCase();
        const isDirector = uname === 'director' || urole.includes('director') || userObj.is_superuser;
        const isFinanzas = uname === 'administracion' || urole.includes('admin') || urole.includes('finanzas');
        const canSeeFinances = isDirector || isFinanzas;

        const finBox = document.getElementById("detail_proj_financial_box");
        if (finBox) finBox.style.display = canSeeFinances ? 'grid' : 'none';

        if (document.getElementById("detail_proj_code")) document.getElementById("detail_proj_code").innerText = data.code || '';
        if (document.getElementById("detail_proj_name")) document.getElementById("detail_proj_name").innerText = data.name || '';
        if (document.getElementById("detail_proj_subtitle")) document.getElementById("detail_proj_subtitle").innerText = `Cliente: ${data.client_name || 'General'} | Ubicación: ${data.location || 'N/A'} | Duración: ${data.duration_days || 0} días`;

        const contractEl = document.getElementById("detail_proj_contract");
        if (contractEl) contractEl.innerText = `$${Number(data.contract_amount_usd || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

        const budgetEl = document.getElementById("detail_proj_budget");
        if (budgetEl) budgetEl.innerText = `$${Number(data.budget_limit_usd || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

        const spentEl = document.getElementById("detail_proj_spent");
        if (spentEl) spentEl.innerText = `$${Number(data.total_spent_usd || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

        const marginEl = document.getElementById("detail_proj_margin");
        if (marginEl) marginEl.innerText = `$${Number(data.gross_margin_usd || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

        const billedEl = document.getElementById("detail_proj_billed");
        if (billedEl) billedEl.innerText = `$${Number(data.total_billed_cxc_usd || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

        const unbilledEl = document.getElementById("detail_proj_unbilled");
        if (unbilledEl) unbilledEl.innerText = `$${Number(data.unbilled_contract_usd || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

        const colEl = document.getElementById("detail_proj_collected");
        if (colEl) colEl.innerText = `$${Number(data.total_collected_usd || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

        const recBalEl = document.getElementById("detail_proj_receivable_bal");
        if (recBalEl) recBalEl.innerText = `$${Number(data.balance_receivable_usd || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

        // Renderizar Adendas & Ampliaciones Contractuales
        const addendumsListEl = document.getElementById("detail_proj_addendums_list");
        if (addendumsListEl) {
            const addendums = data.addendums || [];
            if (addendums.length === 0) {
                addendumsListEl.innerHTML = `<p style="font-size: 11px; color: #94a3b8; margin: 0;">No se han registrado adendas contractuales en esta obra.</p>`;
            } else {
                addendumsListEl.innerHTML = addendums.map(a => `
                    <div style="background: white; border: 1px solid #e9d5ff; border-radius: 6px; padding: 8px 10px; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                        <div>
                            <div style="display: flex; align-items: center; gap: 6px;">
                                <span style="font-size: 10px; font-weight: 800; background: #9333ea; color: white; padding: 1px 6px; border-radius: 4px;">Adenda N° ${a.addendum_number}</span>
                                <strong style="font-size: 12px; color: #1e293b;">${a.title}</strong>
                            </div>
                            ${a.scope_description ? `<p style="font-size: 11px; color: #64748b; margin: 3px 0 0 0;">${a.scope_description}</p>` : ''}
                            <div style="font-size: 10px; color: #94a3b8; margin-top: 3px;">
                                <i class="fa-solid fa-calendar"></i> ${a.approval_date} &bull; <i class="fa-solid fa-user-check"></i> ${a.authorized_by}
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <span style="font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 700;">Monto Adicional:</span>
                            <div style="font-size: 13px; font-weight: 800; color: #059669;">+$${Number(a.additional_contract_usd || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} USD</div>
                        </div>
                    </div>
                `).join('');
            }
        }

        // Renderizar Trazabilidad de Cobros & Abonos
        const colCountEl = document.getElementById("detail_proj_collections_count");
        const colBodyEl = document.getElementById("detail_proj_collections_body");
        if (colBodyEl) {
            const collections = data.collections || [];
            if (colCountEl) colCountEl.innerText = `${collections.length} abono(s) registrado(s)`;

            if (collections.length === 0) {
                colBodyEl.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #94a3b8; padding: 12px;">No se registran abonos ni cobros para esta obra (Facturado: $${(data.total_billed_cxc_usd || 0).toLocaleString()}).</td></tr>`;
            } else {
                colBodyEl.innerHTML = collections.map(c => `
                    <tr style="border-bottom: 1px solid #f1f5f9;">
                        <td style="padding: 6px 8px; font-weight: 600; color: #334155;">${c.payment_date}</td>
                        <td style="padding: 6px 8px; font-weight: 800; color: var(--dalor-navy);">${c.invoice_number}</td>
                        <td style="padding: 6px 8px; text-transform: capitalize;">${(c.payment_method || '-').replace(/_/g, ' ')}</td>
                        <td style="padding: 6px 8px; font-family: monospace; font-weight: 700; color: #0284c7;">${c.reference_number}</td>
                        <td style="padding: 6px 8px; text-align: right; font-weight: 800; color: #059669;">$${Number(c.amount_usd || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                        <td style="padding: 6px 8px; color: #64748b;">${c.notes || '-'}</td>
                    </tr>
                `).join('');
            }
        }



        document.getElementById("detail_proj_scope").innerText = data.scope_of_work || "No se ha definido descripción técnica del alcance para este proyecto.";



        // Cálculo de Avance Físico Global Exacto basado en Tareas y Etapas

        let totalAllTasks = 0;

        let completedAllTasks = 0;

        if (data.phases) {

            data.phases.forEach(ph => {

                const rawTasks = (ph.description || "").split(";").map(t => t.trim()).filter(Boolean);

                if (rawTasks.length > 0) {

                    totalAllTasks += rawTasks.length;

                    completedAllTasks += rawTasks.filter(t => t.startsWith("[x]") || t.startsWith("[X]")).length;

                } else {

                    totalAllTasks += 1;

                    if (ph.status === 'completado') completedAllTasks += 1;

                }

            });

        }

        const totalPhases = data.phases ? data.phases.length : 0;

        const completedPhases = data.phases ? data.phases.filter(p => p.status === 'completado').length : 0;

        const physicalProgressPct = totalAllTasks > 0 ? Math.round((completedAllTasks / totalAllTasks) * 100) : 0;



        // Etapas con Checklist Interactivo y Barra de Progreso Dinámica

        const phasesList = document.getElementById("detail_proj_phases_list");

        if (data.phases && data.phases.length > 0) {

            let html = `

            <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; padding: 12px; margin-bottom: 12px;">

                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; font-weight: 800; margin-bottom: 6px;">

                    <span style="color: var(--dalor-navy);">

                        <i class="fa-solid fa-bars-progress" style="color: var(--dalor-blue);"></i> Avance Físico Global de la Obra:

                    </span>

                    <span style="color: ${physicalProgressPct === 100 ? '#059669' : 'var(--dalor-blue)'}; font-size: 13px;">

                        ${physicalProgressPct}% (${completedAllTasks} de ${totalAllTasks} Tareas Culminadas &bull; ${completedPhases} de ${totalPhases} Etapas)

                    </span>

                </div>
                <div style="height: 12px; background: #e2e8f0; border-radius: 9999px; overflow: hidden;">
                    <div style="width: ${physicalProgressPct}%; height: 100%; background: linear-gradient(90deg, #0284c7 0%, #059669 100%); transition: width 0.4s ease;"></div>
                </div>
            </div>`;

            if (data.status === 'culminado') {
                html += `
                <div style="background: #ecfdf5; border: 1.5px solid #10b981; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 8px; color: #065f46; font-weight: 800; font-size: 12px;">
                        <i class="fa-solid fa-flag-checkered" style="font-size: 16px;"></i> OBRA CULMINADA Y CERRADA (Todos los recursos fueron liberados a Base Central)
                    </div>
                    <span style="background: #10b981; color: white; padding: 2px 8px; border-radius: 4px; font-size: 10.5px; font-weight: 800;">ARCHIVADO HISTÓRICO</span>
                </div>`;
            } else if (physicalProgressPct === 100) {
                html += `
                <div style="background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                    <div>
                        <span style="color: #166534; font-weight: 800; font-size: 12px; display: block;">
                            🎉 ¡Todas las etapas y actividades han alcanzado el 100% de ejecución física!
                        </span>
                        <small style="color: #15803d; font-size: 11px;">Al culminar la obra, maquinaria, vehículos y personal serán devueltos automáticamente a Base Central.</small>
                    </div>
                    <button type="button" onclick="closeAndCulminateProject(${data.id})" class="btn-primary" style="background: #059669; font-weight: 800; font-size: 11.5px; padding: 6px 14px; box-shadow: 0 2px 4px rgba(5,150,105,0.25);">
                        <i class="fa-solid fa-flag-checkered"></i> Culminar y Cerrar Obra
                    </button>
                </div>`;
            }

            html += `<div style="display: flex; flex-direction: column; gap: 8px;">`;



            html += data.phases.map((ph, idx) => {

                const isDone = ph.status === 'completado';

                const isInProg = ph.status === 'en_progreso';

                

                // Restricción Secuencial Estricta:

                const prevPhases = data.phases.slice(0, idx);

                const isUnlocked = prevPhases.every(p => p.status === 'completado');



                // Tareas desglosadas por etapa con checkboxes interactivos

                let tasksHtml = '';

                const rawDesc = ph.description || "";

                let tasksList = rawDesc.split(";").map(t => t.trim()).filter(Boolean);

                if (tasksList.length === 0 && rawDesc.trim().length > 0) {

                    tasksList = rawDesc.split("\n").map(t => t.trim()).filter(Boolean);

                }



                const doneTasksCount = tasksList.filter(t => t.startsWith('[x]') || t.startsWith('[X]')).length;

                tasksHtml = `
                <div style="margin-top: 8px; border-top: 1px dashed #e2e8f0; padding-top: 8px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                        <span style="font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase;">
                            <i class="fa-solid fa-list-check" style="color: var(--dalor-blue);"></i> Tareas / Actividades Asignadas:
                        </span>
                        <span style="font-size: 10px; font-weight: 700; color: ${isDone ? '#059669' : '#0284c7'};">
                            ${doneTasksCount} de ${tasksList.length} completadas
                        </span>
                    </div>

                    ${tasksList.length > 0 ? `
                    <div style="display: flex; flex-direction: column; gap: 5px; margin-bottom: 8px;">
                        ${tasksList.map((t, tIdx) => {
                            const isChecked = t.startsWith("[x]") || t.startsWith("[X]");
                            let cleanName = t;
                            for (const pref of ["[x]", "[X]", "[ ]", "✅", "⏳"]) {
                                if (cleanName.startsWith(pref)) cleanName = cleanName.substring(pref.length).trim();
                            }
                            return `
                            <div style="display: flex; align-items: center; gap: 8px; font-size: 11px; padding: 5px 8px; border-radius: 6px; background: ${isChecked ? '#f0fdf4' : '#f8fafc'}; border: 1px solid ${isChecked ? '#bbf7d0' : '#e2e8f0'};">
                                <input type="checkbox" ${isChecked ? 'checked' : ''} ${!isUnlocked && !isChecked ? 'disabled' : ''} onchange="toggleProjectTask(${data.id}, ${ph.id}, ${tIdx}, this.checked)" style="width: 16px; height: 16px; accent-color: #059669; cursor: pointer;">
                                <span style="font-weight: 800; color: ${isChecked ? '#166534' : 'var(--dalor-navy)'}; font-family: monospace;">${idx + 1}.${tIdx + 1}</span>
                                <span style="${isChecked ? 'text-decoration: line-through; color: #15803d; font-weight: 600;' : 'color: #334155;'} flex: 1;">${cleanName}</span>
                                ${isChecked ? '<span style="font-size: 10px; font-weight: 800; color: #059669;"><i class="fa-solid fa-check"></i> Hecho</span>' : ''}
                                <button type="button" onclick="deleteProjectTask(${data.id}, ${ph.id}, ${tIdx})" style="background: none; border: none; color: #94a3b8; font-size: 16px; cursor: pointer; padding: 0 4px; line-height: 1;" title="Eliminar tarea de esta etapa">&times;</button>
                            </div>`;
                        }).join('')}
                    </div>` : '<p style="font-size: 11px; color: #94a3b8; margin: 4px 0 8px 0; font-style: italic;">No hay tareas asignadas en esta etapa.</p>'}

                    <div style="display: flex; gap: 6px; align-items: center;">
                        <input type="text" id="new_task_inp_${ph.id}" placeholder="+ Escribir nueva tarea / actividad para esta etapa..." style="flex: 1; font-size: 11px; padding: 5px 8px; border: 1px solid #cbd5e1; border-radius: 6px; background: white;" onkeydown="if(event.key==='Enter'){event.preventDefault(); addProjectTask(${data.id}, ${ph.id});}">
                        <button type="button" onclick="addProjectTask(${data.id}, ${ph.id})" class="btn-primary" style="font-size: 11px; padding: 5px 10px; background: #0284c7; font-weight: 700; border-radius: 6px; white-space: nowrap; display: flex; align-items: center; gap: 4px;">
                            <i class="fa-solid fa-plus"></i> + Tarea
                        </button>
                    </div>
                </div>`;



                return `

                <div style="background: ${isDone ? '#f0fdf4' : (!isUnlocked ? '#f8fafc' : '#ffffff')}; border: 1px solid ${isDone ? '#86efac' : (!isUnlocked ? '#e2e8f0' : '#cbd5e1')}; border-radius: 8px; padding: 10px 12px; ${!isUnlocked ? 'opacity: 0.8;' : ''}">

                    <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap;">

                        <div style="display: flex; align-items: center; gap: 8px;">

                            <span style="background: ${isDone ? '#059669' : (!isUnlocked ? '#94a3b8' : '#002B49')}; color: white; border-radius: 6px; font-size: 11px; font-weight: 800; padding: 2px 6px;">

                                Etapa ${idx + 1}

                            </span>

                            <div>

                                <b style="font-size: 13px; color: var(--dalor-navy); ${isDone ? 'text-decoration: line-through; color: #166534;' : ''}">${ph.name}</b>

                                <span style="font-size: 11px; color: #64748b; margin-left: 6px;">(${ph.duration_days || 0} días &bull; Ppto: $${Number(ph.estimated_cost_usd || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})})</span>

                            </div>

                        </div>

                        <div style="display: flex; align-items: center; gap: 6px;">

                            ${!isUnlocked 

                                ? `<span style="font-size: 10px; font-weight: 800; background: #fee2e2; color: #991b1b; padding: 4px 8px; border-radius: 6px;"><i class="fa-solid fa-lock"></i> Bloqueada (Culmina Etapa ${idx})</span>`

                                : (isDone 

                                    ? `<button onclick="updatePhaseStatus(${data.id}, ${ph.id}, 'pendiente')" class="btn-secondary" style="font-size: 11px; padding: 4px 8px; color: #64748b;" title="Reabrir Etapa"><i class="fa-solid fa-rotate-left"></i> Reabrir</button>`

                                    : `<button onclick="updatePhaseStatus(${data.id}, ${ph.id}, 'completado')" class="btn-primary" style="font-size: 11px; padding: 4px 10px; background: #059669; font-weight: 800;"><i class="fa-solid fa-check"></i> Culminar Etapa</button>`

                                )

                            }

                            <select onchange="updatePhaseStatus(${data.id}, ${ph.id}, this.value)" style="font-size: 11px; padding: 3px 6px; border-radius: 6px; border: 1px solid #cbd5e1; font-weight: 700;" ${!isUnlocked ? 'disabled' : ''}>

                                <option value="pendiente" ${ph.status === 'pendiente' ? 'selected' : ''}>⏳ Pendiente</option>

                                <option value="en_progreso" ${ph.status === 'en_progreso' ? 'selected' : ''}>🔄 En Progreso</option>

                                <option value="completado" ${ph.status === 'completado' ? 'selected' : ''}>✅ Culminada</option>

                            </select>

                        </div>

                    </div>

                    ${tasksHtml}

                </div>`;

            }).join('');



            html += `</div>`;

            phasesList.innerHTML = html;

        } else {

            phasesList.innerHTML = `<span style="font-size: 11px; color: #94a3b8;">No se registraron etapas para este proyecto.</span>`;

        }



        // Personal Asignado
        const persList = document.getElementById("detail_proj_personnel");
        if (persList) {
            persList.innerHTML = (data.assigned_personnel || []).map(p => `
                <li style="color: #334155; display: flex; align-items: center; justify-content: space-between; gap: 6px; padding: 3px 0; border-bottom: 1px solid #f1f5f9;">
                    <span><b>[${p.code}]</b> ${p.name} <span style="color: #64748b;">(${p.role})</span></span>
                    <div style="display: flex; gap: 4px; align-items: center;">
                        <button type="button" onclick="openSubstituteResourceModal('personnel', ${p.id}, '${(p.name || '').replace(/'/g, "\\'")}', ${data.id})" class="btn-secondary" style="font-size: 9px; padding: 2px 6px; color: #2563eb; border-color: #bfdbfe;" title="Sustituir en obra por otro trabajador disponible"><i class="fa-solid fa-arrows-rotate"></i> Sustituir</button>
                        <button type="button" onclick="releaseProjectResource('personnel', ${p.id}, '${(p.name || '').replace(/'/g, "\\'")}', ${data.id})" class="btn-secondary" style="font-size: 9px; padding: 2px 6px; color: #dc2626; border-color: #fecdd3;" title="Liberar y retornar a Base Central"><i class="fa-solid fa-arrow-right-from-bracket"></i> Liberar</button>
                    </div>
                </li>
            `).join('') || '<li style="color: #94a3b8;">Sin personal asignado</li>';
        }

        // Vehículos
        const fleetList = document.getElementById("detail_proj_fleet");
        if (fleetList) {
            fleetList.innerHTML = (data.assigned_fleet || []).map(v => `
                <li style="color: #334155; display: flex; align-items: center; justify-content: space-between; gap: 6px; padding: 3px 0; border-bottom: 1px solid #f1f5f9;">
                    <span><b>[${v.code}]</b> ${v.name} <span style="color: #64748b;">(${v.license_plate || 'Sin Placa'})</span></span>
                    <div style="display: flex; gap: 4px; align-items: center;">
                        <button type="button" onclick="openSubstituteResourceModal('asset', ${v.id}, '${(v.name || '').replace(/'/g, "\\'")}', ${data.id})" class="btn-secondary" style="font-size: 9px; padding: 2px 6px; color: #2563eb; border-color: #bfdbfe;" title="Sustituir por otra unidad disponible"><i class="fa-solid fa-arrows-rotate"></i> Sustituir</button>
                        <button type="button" onclick="releaseProjectResource('asset', ${v.id}, '${(v.name || '').replace(/'/g, "\\'")}', ${data.id})" class="btn-secondary" style="font-size: 9px; padding: 2px 6px; color: #dc2626; border-color: #fecdd3;" title="Liberar y retornar a Base Central"><i class="fa-solid fa-arrow-right-from-bracket"></i> Liberar</button>
                    </div>
                </li>
            `).join('') || '<li style="color: #94a3b8;">Sin vehículos asignados</li>';
        }

        // Herramientas
        const toolList = document.getElementById("detail_proj_tools");
        if (toolList) {
            toolList.innerHTML = (data.assigned_tools || []).map(t => `
                <li style="color: #334155; display: flex; align-items: center; justify-content: space-between; gap: 6px; padding: 3px 0; border-bottom: 1px solid #f1f5f9;">
                    <span><b>[${t.code}]</b> ${t.name} <span style="color: #64748b;">(${t.brand || ''})</span></span>
                    <div style="display: flex; gap: 4px; align-items: center;">
                        <button type="button" onclick="openSubstituteResourceModal('asset', ${t.id}, '${(t.name || '').replace(/'/g, "\\'")}', ${data.id})" class="btn-secondary" style="font-size: 9px; padding: 2px 6px; color: #2563eb; border-color: #bfdbfe;" title="Sustituir por otra herramienta disponible"><i class="fa-solid fa-arrows-rotate"></i> Sustituir</button>
                        <button type="button" onclick="releaseProjectResource('asset', ${t.id}, '${(t.name || '').replace(/'/g, "\\'")}', ${data.id})" class="btn-secondary" style="font-size: 9px; padding: 2px 6px; color: #dc2626; border-color: #fecdd3;" title="Liberar y retornar a Base Central"><i class="fa-solid fa-arrow-right-from-bracket"></i> Liberar</button>
                    </div>
                </li>
            `).join('') || '<li style="color: #94a3b8;">Sin herramientas asignadas</li>';
        }

        // Renderizar Materiales e Insumos Solicitados a Almacén (Armado / Requisiciones)
        const reqMatsCountEl = document.getElementById("detail_proj_materials_count");
        const reqMatsBodyEl = document.getElementById("detail_proj_materials_body");
        if (reqMatsBodyEl) {
            const reqMats = data.requested_materials || [];
            if (reqMatsCountEl) reqMatsCountEl.innerText = `${reqMats.length} insumo(s) listado(s)`;

            if (reqMats.length === 0) {
                reqMatsBodyEl.innerHTML = `<tr><td colspan="9" style="text-align: center; color: #94a3b8; padding: 14px;">No se registran materiales ni insumos solicitados para esta obra. Pulsa <b>'+ Solicitar Insumos'</b> para generar la lista de requerimientos a Almacén.</td></tr>`;
            } else {
                reqMatsBodyEl.innerHTML = reqMats.map(r => {
                    let badgeBg = '#fef3c7', badgeColor = '#92400e', statusLabel = '⏳ PENDIENTE';
                    if (r.status === 'despachado_total') {
                        badgeBg = '#dcfce7'; badgeColor = '#166534'; statusLabel = '✅ DESPACHADO';
                    } else if (r.status === 'despachado_parcial') {
                        badgeBg = '#e0f2fe'; badgeColor = '#0369a1'; statusLabel = '🔄 PARCIAL';
                    }
                    return `
                    <tr style="border-bottom: 1px solid #f1f5f9;">
                        <td style="padding: 6px 8px; font-weight: 800; color: var(--dalor-navy); font-family: monospace;">${r.material_code || '-'}</td>
                        <td style="padding: 6px 8px; font-weight: 700; color: #1e293b;">${r.material_name || '-'}</td>
                        <td style="padding: 6px 8px; text-align: center;"><span style="background: #f1f5f9; padding: 1px 6px; border-radius: 4px; font-size: 10px;">${r.unit_measure || 'UND'}</span></td>
                        <td style="padding: 6px 8px; text-align: right; font-weight: 800; color: #0284c7;">${Number(r.quantity_required || 0).toLocaleString()}</td>
                        <td style="padding: 6px 8px; text-align: right; font-weight: 800; color: #059669;">${Number(r.quantity_dispatched || 0).toLocaleString()}</td>
                        <td style="padding: 6px 8px; text-align: right; font-weight: 800; color: ${r.quantity_pending > 0 ? '#e11d48' : '#10b981'};">${Number(r.quantity_pending || 0).toLocaleString()}</td>
                        <td style="padding: 6px 8px; text-align: center;">
                            <span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 800; background: ${badgeBg}; color: ${badgeColor};">${statusLabel}</span>
                        </td>
                        <td style="padding: 6px 8px; color: #64748b; font-size: 10.5px;">${r.notes || '-'}</td>
                        <td style="padding: 6px 8px; text-align: center; white-space: nowrap;">
                            <button type="button" onclick="openSubstituteMaterialModal(${r.id}, ${r.material_id || 0}, '${(r.material_name || '').replace(/'/g, "\\'")}', ${data.id})" class="btn-secondary" style="font-size: 9px; padding: 2px 6px; color: #0284c7; border-color: #bae6fd; margin-right: 3px;" title="Sustituir por otro insumo del catálogo">
                                <i class="fa-solid fa-shuffle"></i> Sustituir
                            </button>
                            <button type="button" onclick="openReturnMaterialModal(${data.id}, ${r.material_id || 0}, '${(r.material_name || '').replace(/'/g, "\\'")}', '${r.material_code || ''}', ${r.quantity_dispatched || 0}, '${r.unit_measure || 'UND'}')" class="btn-secondary" style="font-size: 9px; padding: 2px 6px; color: #16a34a; border-color: #bbf7d0;" title="Devolver sobrante a almacén central">
                                <i class="fa-solid fa-arrow-rotate-left"></i> Devolver
                            </button>
                        </td>
                    </tr>`;
                }).join('');
            }
        }

        // Renderizar Guías de Despacho & Salidas de Almacén de la Obra
        const dispCountEl = document.getElementById("detail_proj_dispatch_count");
        const dispBodyEl = document.getElementById("detail_proj_dispatch_body");
        if (dispBodyEl) {
            const guides = data.dispatch_guides || [];
            if (dispCountEl) dispCountEl.innerText = `${guides.length} guía(s) emitida(s)`;

            if (guides.length === 0) {
                dispBodyEl.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #94a3b8; padding: 14px;">No se registran guías de despacho emitidas para esta obra.</td></tr>`;
            } else {
                dispBodyEl.innerHTML = guides.map(g => `
                    <tr style="border-bottom: 1px solid #f1f5f9;">
                        <td style="padding: 6px 8px; font-weight: 800; color: var(--dalor-navy); font-family: monospace;">${g.guide_number}</td>
                        <td style="padding: 6px 8px; color: #475569;">${g.dispatch_date || '-'}</td>
                        <td style="padding: 6px 8px; font-weight: 600;">${g.destination_address || 'En Obra'}</td>
                        <td style="padding: 6px 8px; color: #2563eb; font-weight: 600;">${g.driver_name || '-'}</td>
                        <td style="padding: 6px 8px; text-align: center;"><span style="font-weight: 800; background: #e0f2fe; color: #0284c7; padding: 2px 6px; border-radius: 4px;">${g.items_count} ítems</span></td>
                        <td style="padding: 6px 8px; text-align: center;"><span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 800; background: #dcfce7; color: #166534;">EMITIDA</span></td>
                        <td style="padding: 6px 8px; text-align: center; white-space: nowrap;">
                            <button type="button" onclick="printOfficialDispatchGuide(${g.id})" class="btn-primary" style="font-size: 10px; padding: 2px 8px; background: #0284c7;" title="Ver Documento Oficial Imprimible"><i class="fa-solid fa-print"></i> Ver</button>
                            <button type="button" onclick="navigateToDispatchGuide('${g.guide_number}')" class="btn-secondary" style="font-size: 10px; padding: 2px 6px; margin-left: 3px;" title="Consultar en Módulo de Despachos"><i class="fa-solid fa-arrow-up-right-from-square"></i></button>
                        </td>
                    </tr>
                `).join('');
            }
        }

        // Renderizar Gastos Imputados a la Obra
        const expBodyEl = document.getElementById("detail_proj_expenses_body");
        const expCountEl = document.getElementById("detail_proj_expenses_count_badge");
        if (expBodyEl) {
            const expenses = data.expenses || [];
            const totalExpUsd = expenses.reduce((acc, curr) => acc + (Number(curr.amount_usd) || 0), 0);
            if (expCountEl) {
                expCountEl.innerText = `${expenses.length} gasto(s) ($${totalExpUsd.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})} USD)`;
            }
            if (expenses.length === 0) {
                expBodyEl.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #94a3b8; padding: 14px;">No se registran gastos imputados a esta obra.</td></tr>`;
            } else {
                expBodyEl.innerHTML = expenses.map(e => `
                    <tr style="border-bottom: 1px solid #f1f5f9;">
                        <td style="padding: 6px 8px; font-weight: 700; color: #475569;">${e.expense_date}</td>
                        <td style="padding: 6px 8px; font-weight: 700; color: var(--dalor-navy);">${e.supplier_vendor}</td>
                        <td style="padding: 6px 8px; color: #334155; max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${e.description}">${e.description}</td>
                        <td style="padding: 6px 8px;"><span style="font-size: 10px; background: #f1f5f9; color: #475569; padding: 2px 6px; border-radius: 4px; font-weight: 700;">${e.category_code ? '[' + e.category_code + '] ' : ''}${e.category_name}</span></td>
                        <td style="padding: 6px 8px; text-align: right; font-weight: 800; color: #b45309;">$${Number(e.amount_usd || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                        <td style="padding: 6px 8px; text-align: center;">
                            <span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 800; text-transform: uppercase; ${e.status === 'aprobado' ? 'background: #dcfce7; color: #166534;' : (e.status === 'rechazado' ? 'background: #fee2e2; color: #991b1b;' : 'background: #fef3c7; color: #92400e;')}">
                                ${e.status || 'pendiente'}
                            </span>
                        </td>
                        <td style="padding: 6px 8px; text-align: center;">
                            ${e.receipt_image_path ? `
                                <button onclick="viewReceiptImage('${e.receipt_image_path}', ${e.id})" class="btn-secondary" style="font-size: 10px; padding: 2px 7px; color: #0284c7; border: 1px solid #bae6fd; background: #f0f9ff; border-radius: 4px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;" title="Ver Foto / Comprobante">
                                    <i class="fa-solid fa-image"></i> Ver
                                </button>
                            ` : `
                                <button onclick="viewReceiptImage('', ${e.id})" class="btn-secondary" style="font-size: 10px; padding: 2px 5px; color: #94a3b8; border: 1px dashed #cbd5e1; background: transparent; border-radius: 4px; cursor: pointer;" title="Adjuntar Comprobante">
                                    <i class="fa-solid fa-plus"></i> Foto
                                </button>
                            `}
                        </td>
                        <td style="padding: 6px 8px; color: #64748b; font-size: 10.5px;">${e.reported_by_name || 'Admin'}</td>
                    </tr>
                `).join('');
            }
        }

        // Renderizar Compras y Facturas CxP Imputadas a la Obra
        const payBodyEl = document.getElementById("detail_proj_payables_body");
        const payCountEl = document.getElementById("detail_proj_payables_count_badge");
        if (payBodyEl) {
            const payables = data.payables || [];
            const totalPayUsd = payables.reduce((acc, curr) => acc + (Number(curr.paid_amount_usd) || 0), 0);
            if (payCountEl) {
                payCountEl.innerText = `${payables.length} compra(s) ($${totalPayUsd.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})} USD pagado)`;
            }
            if (payables.length === 0) {
                payBodyEl.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #94a3b8; padding: 14px;">No se registran compras por CxP imputadas a esta obra.</td></tr>`;
            } else {
                payBodyEl.innerHTML = payables.map(p => `
                    <tr style="border-bottom: 1px solid #f1f5f9;">
                        <td style="padding: 6px 8px; font-weight: 700; color: #475569;">${p.issue_date}</td>
                        <td style="padding: 6px 8px; font-weight: 800; color: var(--dalor-navy); font-family: monospace;">${p.invoice_number}</td>
                        <td style="padding: 6px 8px; font-weight: 700; color: #1e293b;">${p.supplier_name}</td>
                        <td style="padding: 6px 8px; color: #334155; max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${p.description}">${p.description}</td>
                        <td style="padding: 6px 8px; text-align: right; font-weight: 700; color: #475569;">$${Number(p.amount_usd || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                        <td style="padding: 6px 8px; text-align: right; font-weight: 800; color: #059669;">$${Number(p.paid_amount_usd || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                        <td style="padding: 6px 8px; text-align: right; font-weight: 700; color: ${p.balance_usd > 0.05 ? '#dc2626' : '#64748b'};">$${Number(p.balance_usd || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                        <td style="padding: 6px 8px; text-align: center;">
                            <span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 800; text-transform: uppercase; ${p.status === 'pagado_total' ? 'background: #dcfce7; color: #166534;' : (p.status === 'abono_parcial' ? 'background: #e0f2fe; color: #0369a1;' : 'background: #fef3c7; color: #92400e;')}">
                                ${(p.status || 'pendiente').replace(/_/g, ' ')}
                            </span>
                        </td>
                    </tr>
                `).join('');
            }
        }

        const btnFact = document.getElementById("btn_detail_facturar_cxc");
        if (btnFact) {
            const billed = Number(data.total_billed_cxc_usd || 0);
            const contract = Number(data.contract_amount_usd || 0);
            const unbilled = Math.max(0, contract - billed);
            if (unbilled > 0.05) {
                btnFact.innerHTML = `<i class="fa-solid fa-file-invoice-dollar"></i> Facturar / Cobrar Obra ($${unbilled.toLocaleString('en-US', {minimumFractionDigits: 2})} pend.)`;
                btnFact.title = "Generar factura o valuación para cobrar esta obra en Cuentas por Cobrar";
            } else {
                btnFact.innerHTML = `<i class="fa-solid fa-circle-check"></i> Facturado 100% (Ver Cobros)`;
                btnFact.title = "La obra ya tiene el 100% del contrato facturado en CxC";
            }
            btnFact.disabled = false;
            btnFact.style.opacity = '1';
            btnFact.style.cursor = 'pointer';
        }

        openModal("modalProjectDetail");

    } catch (e) {
        console.error("Error al cargar la ficha del proyecto:", e);
        alert("Error al cargar la ficha del proyecto: " + (e.message || e));
    }

}





async function toggleProjectTask(projectId, phaseId, taskIndex, isChecked) {

    try {
        const res = await authFetch(`${API_BASE}/projects/${projectId}/phases/${phaseId}/toggle-task`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                task_index: taskIndex,
                is_completed: isChecked
            })
        });

        if (res.ok) {
            await viewProjectDetails(projectId);
        } else {
            const err = await res.json();
            alert("⚠️ " + (err.detail || "No se pudo actualizar la tarea."));
            await viewProjectDetails(projectId);
        }
    } catch (e) {
        alert("Error de conexión al actualizar la tarea.");
    }
}

async function updatePhaseStatus(projectId, phaseId, newStatus) {
    try {
        const res = await authFetch(`${API_BASE}/projects/${projectId}/phases/${phaseId}/status`, {
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
        const res = await authFetch(`${API_BASE}/projects/import-excel`, {
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

function deleteProject(projectId) {
    if (typeof window.openAdminAuthModal === 'function') {
        window.openAdminAuthModal(
            'delete_project',
            projectId,
            `¿Confirmas la inactivación del proyecto #${projectId}? Esta acción requiere contraseña de Administrador / Director General y registrará una traza permanente en la bitácora de auditoría.`
        );
    } else {
        const reason = prompt("Indica el motivo de la inactivación (Requerido para auditoría):");
        if (!reason) return;
        const pwd = prompt("🔒 AUTORIZACIÓN: Ingrese la contraseña de Administrador / Director:");
        if (!pwd) return;
        authFetch(`${API_BASE}/projects/${projectId}/delete`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ admin_password: pwd, reason: reason })
        })
        .then(async r => {
            const data = await r.json();
            if (!r.ok) throw new Error(data.detail || "Error al inactivar proyecto");
            alert(`✅ ${data.message || 'Proyecto inactivado exitosamente.'}`);
            if (typeof loadInitialMasterData === 'function') await loadInitialMasterData();
            loadProjectsList();
        })
        .catch(err => alert("❌ " + err.message));
    }
}

async function closeAndCulminateProject(projectId) {
    if (!confirm("¿Estás seguro de culminar y cerrar esta obra?\n\n- El estatus pasará a CULMINADO.\n- Toda la maquinaria, vehículos y personal asignados serán liberados a Disponible en Base Central.\n- El proyecto quedará archivado en el histórico.")) {
        return;
    }

    try {
        const res = await authFetch(`${API_BASE}/projects/${projectId}/status`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "culminado" })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Error al culminar el proyecto");

        alert(`✅ ${data.message || 'Obra culminada y cerrada exitosamente.'}`);
        closeModal("modalProjectDetail");
        await loadProjectsList();
        if (typeof window.loadInitialMasterData === 'function') {
            await window.loadInitialMasterData();
        }
    } catch (e) {
        alert("Error al culminar obra: " + e.message);
    }
}







// Auto-window binding & ES6 exports
if (typeof window !== 'undefined') {
    window.setProjectType = setProjectType;
    window.onProjectLocationInput = onProjectLocationInput;
    window.applyEditProjectSedeRules = applyEditProjectSedeRules;
    window.onEditProjectLocationInput = onEditProjectLocationInput;
    window.switchProjectSubtab = switchProjectSubtab;
    window.initProjectPlanningView = initProjectPlanningView;
    window.populatePlanDropdownSelectors = populatePlanDropdownSelectors;
    window.filterPlanSelect = filterPlanSelect;
    window.onPlanMaterialSelected = onPlanMaterialSelected;
    window.updatePlanMaterialsCostTotal = updatePlanMaterialsCostTotal;
    window.addPlanResource = addPlanResource;
    window.removePlanResource = removePlanResource;
    window.assignPersonnelTag = assignPersonnelTag;
    window.removePersonnelTag = removePersonnelTag;
    window.assignVehicleTag = assignVehicleTag;
    window.removeVehicleTag = removeVehicleTag;
    window.assignToolTag = assignToolTag;
    window.removeToolTag = removeToolTag;
    window.renderAssignedTags = renderAssignedTags;
    window.addProjectPhaseRow = addProjectPhaseRow;
    window.addProjectPhaseTask = addProjectPhaseTask;
    window.addProjectPhaseTaskRow = addProjectPhaseTaskRow;
    window.removeProjectPhaseRow = removeProjectPhaseRow;
    window.renumberPhasesAndTasks = renumberPhasesAndTasks;
    window.recalcProjectBudgetPreview = recalcProjectBudgetPreview;
    window.submitCreateProject = submitCreateProject;
    window.loadProjectsList = loadProjectsList;
    window.changeProjectPageSize = changeProjectPageSize;
    window.goToProjectPage = goToProjectPage;
    window.setProjectCxcFilter = setProjectCxcFilter;
    window.filterProjectsList = filterProjectsList;
    window.renderProjectsWithPagination = renderProjectsWithPagination;
    window.renderProjectsPaginationControls = renderProjectsPaginationControls;
    window.renderProjectCardHtml = renderProjectCardHtml;
    window.viewProjectDetails = viewProjectDetails;
    window.toggleProjectTask = toggleProjectTask;
    window.updatePhaseStatus = updatePhaseStatus;
    window.downloadExcelTemplate = downloadExcelTemplate;
    window.triggerExcelImport = triggerExcelImport;
    window.handleExcelFileSelected = handleExcelFileSelected;
    window.deleteProject = deleteProject;
    window.closeAndCulminateProject = closeAndCulminateProject;
}

export { setProjectType };
export { onProjectLocationInput };
export { applyEditProjectSedeRules };
export { onEditProjectLocationInput };
export { switchProjectSubtab };
export { initProjectPlanningView };
export { populatePlanDropdownSelectors };
export { filterPlanSelect };
export { onPlanMaterialSelected };
export { updatePlanMaterialsCostTotal };
export { addPlanResource };
export { removePlanResource };
export { assignPersonnelTag };
export { removePersonnelTag };
export { assignVehicleTag };
export { removeVehicleTag };
export { assignToolTag };
export { removeToolTag };
export { renderAssignedTags };
export { addProjectPhaseRow };
export { addProjectPhaseTask };
export { addProjectPhaseTaskRow };
export { removeProjectPhaseRow };
export { renumberPhasesAndTasks };
export { recalcProjectBudgetPreview };
export { submitCreateProject };
export { loadProjectsList };
export { changeProjectPageSize };
export { goToProjectPage };
export { setProjectCxcFilter };
export { filterProjectsList };
export { renderProjectsWithPagination };
export { renderProjectsPaginationControls };
export { renderProjectCardHtml };
export { viewProjectDetails };
export { toggleProjectTask };
export { updatePhaseStatus };
export { downloadExcelTemplate };
export { triggerExcelImport };
export { handleExcelFileSelected };
export { deleteProject };
export { closeAndCulminateProject };
