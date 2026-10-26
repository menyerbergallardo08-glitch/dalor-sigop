// Sigop ERP - Submódulo Proyectos Core
const API_BASE = (typeof window !== 'undefined' && window.API_BASE) || '/api/v1';

const authFetch = (url, options = {}) => {
    const token = (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('dalor_token')) ||
                  (typeof localStorage !== 'undefined' && (localStorage.getItem('dalor_token') || localStorage.getItem('token'))) ||
                  (typeof window !== 'undefined' && window.authToken) || '';
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (options.body instanceof FormData) {
        delete headers['Content-Type'];
    }
    return window.fetch(url, { ...options, headers });
};

var allPersonnel = (typeof window !== 'undefined' && window.allPersonnel) || [];
var allAssets = (typeof window !== 'undefined' && window.allAssets) || [];
var allClients = (typeof window !== 'undefined' && window.allClients) || [];
var allMaterials = (typeof window !== 'undefined' && window.allMaterials) || [];
var selectedPersonnelIds = (typeof window !== 'undefined' && window.selectedPersonnelIds) || [];
var selectedVehicleIds = (typeof window !== 'undefined' && window.selectedVehicleIds) || [];
var selectedToolIds = (typeof window !== 'undefined' && window.selectedToolIds) || [];
var selectedMaterialItems = (typeof window !== 'undefined' && window.selectedMaterialItems) || [];
let currentProjectSubtab = 'list';

export function setProjectType(type) {
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
        if (typeof window !== "undefined") { window.selectedVehicleIds = selectedVehicleIds; }
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

export function onProjectLocationInput(val) {
    if (!val) return;
    const lower = val.toLowerCase().trim();
    if (lower.includes('sede') || lower.includes('central') || lower.includes('taller') || lower.includes('guacara central')) {
        setProjectType('sede');
    }
}

export function applyEditProjectSedeRules(isSede) {
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

export function onEditProjectLocationInput(val) {
    if (!val) return;
    const lower = val.toLowerCase().trim();
    const isSede = lower.includes('sede') || lower.includes('central') || lower.includes('taller') || lower.includes('guacara');
    applyEditProjectSedeRules(isSede);
}

export async function switchProjectSubtab(subtabName) {
    currentProjectSubtab = subtabName || 'list';
    if (typeof window !== 'undefined') window.currentProjectSubtab = currentProjectSubtab;
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

        const dateInp = document.getElementById("new_proj_start_date");
        if (dateInp && !dateInp.value) {
            dateInp.value = new Date().toISOString().substring(0, 10);
        }
    }
}

export function initProjectPlanningView() {
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

export async function populatePlanDropdownSelectors() {
    let rawPersonnel = (window.allPersonnel && window.allPersonnel.length > 0) ? window.allPersonnel : (allPersonnel || []);
    let rawAssets = (window.allAssets && window.allAssets.length > 0) ? window.allAssets : (allAssets || []);

    if (rawPersonnel.length === 0 || rawAssets.length === 0) {
        try {
            const [resPers, resAss] = await Promise.all([
                authFetch(`${API_BASE}/personnel/`),
                authFetch(`${API_BASE}/assets/`)
            ]);
            if (resPers.ok) {
                const pData = await resPers.json();
                if (Array.isArray(pData) && pData.length > 0) {
                    rawPersonnel = window.allPersonnel = allPersonnel = pData;
                }
            }
            if (resAss.ok) {
                const aData = await resAss.json();
                if (Array.isArray(aData) && aData.length > 0) {
                    rawAssets = window.allAssets = allAssets = aData;
                }
            }
        } catch(e) {
            console.warn("Auto-fetch fallback en populatePlanDropdownSelectors:", e);
        }
    }

    const safePersonnel = rawPersonnel.filter(p => !p.current_project_id && p.status !== 'en_obra' && p.status !== 'inactivo' && (p.status === 'disponible_base' || p.status === 'disponible' || !p.status));

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

    // 3. Desplegable de Herramientas & Equipos (Solo disponibles en base, agrupadas jerárquicamente por modelo)
    const toolSel = document.getElementById("plan_select_tools") || document.getElementById("plan_tool_select");
    const planToolWrapper = document.getElementById("plan_tool_unit_wrapper");
    if (planToolWrapper) planToolWrapper.style.display = 'none';

    if (toolSel) {
        const tools = availableAssets.filter(a => {
            const isVeh = ['vehiculo', 'camioneta'].includes((a.asset_type || '').toLowerCase()) ||
                (a.category && a.category.toLowerCase().includes('veh'));
            return !isVeh && (!selectedToolIds || !selectedToolIds.includes(a.id));
        });

        const modelMap = {};
        tools.forEach(t => {
            const mName = (t.name || 'Sin Nombre').trim();
            if (!modelMap[mName]) {
                modelMap[mName] = {
                    name: mName,
                    isMachinery: t.asset_type === 'maquinaria' || (t.category || '').toLowerCase().includes('maquinaria') || (t.name || '').toLowerCase().includes('montacarga'),
                    units: []
                };
            }
            modelMap[mName].units.push(t);
        });

        const models = Object.values(modelMap);
        const machineryModels = models.filter(m => m.isMachinery);
        const standardModels = models.filter(m => !m.isMachinery);

        let toolsHtml = `<option value="">-- 1. Seleccionar Modelo / Equipo (${models.length} modelos disp.) --</option>`;
        if (machineryModels.length > 0) {
            toolsHtml += `<optgroup label="🚜 Maquinaria Pesada & Equipos Especiales (${machineryModels.length})">` +
                machineryModels.map(m => `<option value="${encodeURIComponent(m.name)}">🚜 ${m.name} (${m.units.length} disp. en base)</option>`).join('') +
                `</optgroup>`;
        }
        if (standardModels.length > 0) {
            toolsHtml += `<optgroup label="🔧 Herramientas & Equipos de Taller (${standardModels.length})">` +
                standardModels.map(m => `<option value="${encodeURIComponent(m.name)}">🔧 ${m.name} (${m.units.length} disp. en base)</option>`).join('') +
                `</optgroup>`;
        }
        toolSel.innerHTML = toolsHtml;
        toolSel.onchange = function() {
            onPlanToolModelSelected();
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

export function filterPlanSelect(selectId, query) {
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

export function recalcProjectBudgetPreview() {

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

export async function submitCreateProject(event) {

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
        const weightVal = parseLocalizedNumber(card.querySelector(".ph-weight")?.value) || 0.0;
        const days = durUnit === "horas" ? Math.max(1, Math.round(durVal / 8)) : Math.max(1, Math.round(durVal));
        
        const taskRows = card.querySelectorAll(".phase-task-row");
        const tasksList = [];
        taskRows.forEach(row => {
            const tName = row.querySelector(".ph-task-input")?.value.trim();
            const tWeight = parseLocalizedNumber(row.querySelector(".ph-task-weight")?.value);
            const tHours = parseLocalizedNumber(row.querySelector(".ph-task-hours")?.value);
            const tLvl = parseInt(row.dataset.level || '1', 10);
            if (tName) {
                let parts = [];
                if (tLvl > 1) parts.push(`[LVL:${tLvl}]`);
                parts.push(`[ ] ${tName}`);
                if (tHours && tHours > 0) parts.push(`[H:${tHours}]`);
                if (tWeight && tWeight > 0) parts.push(`[W:${tWeight}%]`);
                tasksList.push(parts.join(' '));
            }
        });
        const description = tasksList.length > 0 ? tasksList.join("; ") : name;

        phases.push({
            phase_number: idx + 1,
            name: name,
            description: description,
            duration_days: days,
            duration_unit: durUnit,
            estimated_duration: durVal,
            estimated_cost_usd: cost,
            weight_percent: weightVal,
            status: "pendiente"
        });
    });

    // Validar Ponderación de Etapas (no puede superar 100%)
    const totalPhaseWeight = phases.reduce((acc, p) => acc + (p.weight_percent || 0), 0);
    if (totalPhaseWeight > 100.05) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'error',
                title: 'Ponderación de Etapas Inválida',
                text: `La suma de ponderaciones de las etapas es ${totalPhaseWeight.toFixed(1)}%, no puede superar el 100%. Por favor corrige los porcentajes o pulsa 'Repartir 100% Equitativo'.`
            });
        } else {
            alert(`⚠️ Error de Ponderación: La suma de las etapas es ${totalPhaseWeight.toFixed(1)}%, no puede superar el 100%.`);
        }
        return;
    }

    // Validar Ponderación de Tareas por cada Etapa (no puede superar 100%)
    for (let i = 0; i < phaseCards.length; i++) {
        const card = phaseCards[i];
        const pName = card.querySelector(".ph-name")?.value.trim() || `Etapa ${i + 1}`;
        const allRows = Array.from(card.querySelectorAll(".phase-task-row"));
        const topRows = allRows.filter(r => parseInt(r.dataset.level || '1', 10) === 1);
        const targetRows = topRows.length > 0 ? topRows : allRows;
        const taskWeights = targetRows
            .map(r => parseLocalizedNumber(r.querySelector(".ph-task-weight")?.value) || 0)
            .filter(w => w > 0);
        const taskSum = taskWeights.reduce((a, b) => a + b, 0);
        if (taskSum > 100.05) {
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    icon: 'error',
                    title: `Ponderación Inválida en ${pName}`,
                    text: `La suma de pesos de las tareas en "${pName}" es ${taskSum.toFixed(1)}%, no puede superar el 100% de la etapa.`
                });
            } else {
                alert(`⚠️ Error en ${pName}: La suma de pesos de las tareas es ${taskSum.toFixed(1)}%, supera el 100%.`);
            }
            return;
        }
    }

    const startDateVal = document.getElementById("new_proj_start_date") ? document.getElementById("new_proj_start_date").value : "";
    let formattedStartDate = undefined;
    if (startDateVal) {
        formattedStartDate = `${startDateVal}T12:00:00`;
    }

    const payload = {
        code: document.getElementById("new_proj_code").value,
        name: document.getElementById("new_proj_name").value,
        client_id: parseInt(document.getElementById("new_proj_client_id").value) || null,
        location: document.getElementById("new_proj_location").value,
        start_date: formattedStartDate,
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

            if (typeof window.loadProjectRequisitionsBadge === 'function') {
                window.loadProjectRequisitionsBadge();
            }

        } else {

            const err = await res.json();

            alert("Error: " + (err.detail || JSON.stringify(err)));

        }

    } catch (e) {

        alert("Error al planificar proyecto.");

    }

}
