/**
 * DALOR SIGO-P | Módulo: PROJECTS.JS
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

/** authFetch - inyecta token en cada request usando window.fetch nativo */
function authFetch(url, options = {}) {
    var _t = sessionStorage.getItem('dalor_token') || localStorage.getItem('dalor_token') || window.authToken || '';
    var _h = Object.assign({}, options.headers || {});
    if (_t) _h['Authorization'] = 'Bearer ' + _t;
    return window.fetch(url, Object.assign({}, options, { headers: _h }));
}
if (typeof window !== 'undefined') {
    window.authFetch = authFetch;
}

// --- BLOQUE L35-L226 ---
function setProjectType(type) {

    const hiddenInp = document.getElementById("new_proj_type");

    if (hiddenInp) hiddenInp.value = type;



    const radioSede = document.getElementById("radio_type_sede");

    const radioForaneo = document.getElementById("radio_type_foraneo");

    const cardSede = document.getElementById("card_type_sede");

    const cardForaneo = document.getElementById("card_type_foraneo");

    const locInput = document.getElementById("new_proj_location");



    if (type === 'sede') {

        if (radioSede) radioSede.checked = true;

        if (radioForaneo) radioForaneo.checked = false;

        if (cardSede) { cardSede.style.background = "#eff6ff"; cardSede.style.borderColor = "var(--dalor-navy)"; }

        if (cardForaneo) { cardForaneo.style.background = "#ffffff"; cardForaneo.style.borderColor = "#cbd5e1"; }

        if (locInput && (!locInput.value || locInput.value.includes("Planta"))) locInput.value = "Taller Central Guacara";

    } else {

        if (radioForaneo) radioForaneo.checked = true;

        if (radioSede) radioSede.checked = false;

        if (cardForaneo) { cardForaneo.style.background = "#eff6ff"; cardForaneo.style.borderColor = "var(--dalor-blue)"; }

        if (cardSede) { cardSede.style.background = "#ffffff"; cardSede.style.borderColor = "#cbd5e1"; }

        if (locInput && locInput.value === "Taller Central Guacara") locInput.value = "";

    }

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
                    fetch(`${API_BASE}/personnel/`),
                    fetch(`${API_BASE}/assets/`),
                    fetch(`${API_BASE}/clients/`)
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

    

    // Iniciar con 4 etapas industriales estándar y sus tareas operativas desglosadas

    const container = document.getElementById("projectPhasesContainer");

    if (container && container.children.length === 0) {

        phaseRowsCount = 0;

        addProjectPhaseRow("Fase 1: Movilización, Permisos & Seguridad SHA", [

            "Gestión de pases de planta PDVSA/Corpoelec",

            "Charla de inducción y seguridad industrial SHA",

            "Inspección de EPP y movilización de equipos y maquinaria"

        ], 10, 15000);



        addProjectPhaseRow("Fase 2: Desmontaje Mecánico & Corte con Oxicorte", [

            "Corte de tolvas deterioradas en sitio",

            "Retiro de vigas secundarias y soportería",

            "Desconexión y retiro de ductos de gases calientes"

        ], 15, 25000);



        addProjectPhaseRow("Fase 3: Fabricación & Montaje de Estructuras Nuevas", [

            "Armado y calderería de tolvas en acero A36",

            "Soldadura calificada bajo código ASME Sección IX / AWS",

            "Izamiento e instalación de vigas principales HEA"

        ], 25, 45000);



        addProjectPhaseRow("Fase 4: Ensayos No Destructivos (END), Pintura & Entrega", [

            "Inspección de soldaduras por líquidos penetrantes y ultrasonido",

            "Aplicación de recubrimiento epóxico anticorrosivo",

            "Pruebas en frío, firma de acta de entrega y recepción definitiva"

        ], 10, 20500);

    }

}



function populatePlanDropdownSelectors() {
    const rawPersonnel = (window.allPersonnel && window.allPersonnel.length > 0) ? window.allPersonnel : (allPersonnel || []);
    const safePersonnel = rawPersonnel.filter(p => !p.current_project_id || p.status === 'disponible_base' || p.status === 'disponible' || !p.status);

    const rawAssets = (window.allAssets && window.allAssets.length > 0) ? window.allAssets : (allAssets || []);
    // Solo mostrar activos disponibles que no estén asignados a otra obra activa
    const availableAssets = rawAssets.filter(a => !a.current_project_id || a.status === 'disponible_base' || a.status === 'disponible' || !a.status);

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
        toolSel.innerHTML = `<option value="">-- Seleccionar Herramienta / Equipo Mayor (${tools.length} disp. en base) --</option>` + 
            tools.map(t => `<option value="${t.id}">[${t.asset_code}] ${t.name} (Cant: 1 disp. | S/N: ${t.serial_number || 'S/N'})</option>`).join('');
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
            if (this.value) addPlanResource('material');
        };
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
        if (val && !selectedMaterialIds.includes(val)) {
            selectedMaterialIds.push(val);
            renderAssignedTags();
        }
        if (sel) sel.value = "";
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

    // 4. Materiales Tags
    const matContainer = document.getElementById("plan_tags_materials") || document.getElementById("plan_mat_tags");
    if (matContainer) {
        const safeMats = (window.allMaterials && window.allMaterials.length > 0) ? window.allMaterials : (allMaterials || []);
        if (selectedMaterialIds.length === 0) {
            matContainer.innerHTML = `<span style="font-size:11px; color:#94a3b8;">Sin materiales seleccionados. Selecciona arriba y pulsa '+'.</span>`;
        } else {
            matContainer.innerHTML = selectedMaterialIds.map(id => {
                const m = safeMats.find(item => item.id === id);
                if (!m) return '';
                return `
                    <span class="resource-tag-pill" style="display:inline-flex; align-items:center; gap:6px; background:#f0fdfa; color:#0f766e; border:1px solid #99f6e4; padding:3px 8px; border-radius:9999px; font-size:11px; font-weight:700; margin:2px;">
                        <i class="fa-solid fa-boxes-stacked"></i> [${m.code}] ${m.name}
                        <button type="button" onclick="removePlanResource('material', ${m.id})" style="background:none; border:none; color:#ef4444; cursor:pointer; font-weight:bold; font-size:12px; line-height:1;">&times;</button>
                    </span>
                `;
            }).join('');
        }
    }
}



// Creador Dinámico de Etapas / Fases con Sub-campos de Tareas Operativas

function addProjectPhaseRow(defName = "", defTasks = [], defDays = 7, defCost = 0) {

    phaseRowsCount++;

    const container = document.getElementById("projectPhasesContainer");

    const phaseId = `phase_card_${phaseRowsCount}`;

    const pNum = phaseRowsCount;



    if (typeof defTasks === 'string') {

        defTasks = defTasks.split(/[,;\.]\s+/).filter(t => t.trim().length > 0);

    }

    if (!Array.isArray(defTasks) || defTasks.length === 0) {

        defTasks = ["Tarea inicial de la etapa"];

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

        <div style="display: grid; grid-template-columns: 3fr 1fr 1.2fr; gap: 10px;">

            <div>

                <label style="display: block; font-size: 10px; font-weight: 800; color: #475569; text-transform: uppercase; margin-bottom: 3px;">

                    Nombre de la Etapa / Hito

                </label>

                <input type="text" class="form-input ph-name" placeholder="Ej: Fase 1: Movilización & Permisos" value="${defName}" style="font-size: 12px; font-weight: 700;" required>

            </div>

            <div>

                <label style="display: block; font-size: 10px; font-weight: 800; color: #475569; text-transform: uppercase; margin-bottom: 3px;">

                    Duración (Días)

                </label>

                <input type="number" class="form-input ph-days" placeholder="Días" value="${defDays}" style="font-size: 12px; font-weight: bold;">

            </div>

            <div>

                <label style="display: block; font-size: 10px; font-weight: 800; color: #475569; text-transform: uppercase; margin-bottom: 3px;">

                    Presupuesto Fase ($)

                </label>

                <input type="number" step="0.01" class="form-input ph-cost" placeholder="Ppto ($)" value="${defCost}" style="font-size: 12px; font-weight: 800; color: var(--dalor-blue);">

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

        const name = card.querySelector(".ph-name").value.trim();

        const days = parseInt(card.querySelector(".ph-days").value) || 7;

        const cost = parseFloat(card.querySelector(".ph-cost").value) || 0.0;

        

        const taskInputs = card.querySelectorAll(".ph-task-input");

        const tasksList = Array.from(taskInputs).map(inp => inp.value.trim()).filter(Boolean);

        const description = tasksList.length > 0 ? tasksList.join("; ") : name;



        phases.push({

            phase_number: idx + 1,

            name: name,

            description: description,

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

            

            // Si proviene de un presupuesto, marcar la cotización como 'aprobado'

            const convQuoteId = document.getElementById("converting_quotation_id") ? document.getElementById("converting_quotation_id").value : "";

            if (convQuoteId) {

                try {

                    await fetch(`${API_BASE}/quotations/${convQuoteId}`, {

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
    container.innerHTML = `<div style="grid-column: span 2; text-align: center; padding: 20px; color: #94a3b8;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando proyectos...</div>`;

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
        cxcBadgeHtml = `<span style="font-size: 10px; font-weight: 800; background: #dcfce7; color: #166534; border: 1px solid #86efac; padding: 2px 7px; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px;" title="Obra totalmente solventada en CxC ($${cxcPaid.toLocaleString()} USD)"><i class="fa-solid fa-circle-check"></i> CxC Solvente</span>`;
    } else if (cxcStatus === 'parcial' || (cxcPaid > 0 && cxcPending > 0.05)) {
        cxcBadgeHtml = `<span style="font-size: 10px; font-weight: 800; background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; padding: 2px 7px; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px;" title="Abono parcial registrado. Pendiente: $${cxcPending.toLocaleString()} USD"><i class="fa-solid fa-chart-pie"></i> CxC Parcial ($${cxcPending.toLocaleString()} pend.)</span>`;
    } else if (cxcStatus === 'abierta' || p.has_cxc || (p.total_billed_cxc_usd && p.total_billed_cxc_usd > 0)) {
        cxcBadgeHtml = `<span style="font-size: 10px; font-weight: 800; background: #fef3c7; color: #92400e; border: 1px solid #fde68a; padding: 2px 7px; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px;" title="Factura emitida en CxC pendiente de cobro ($${cxcPending.toLocaleString()} USD)"><i class="fa-solid fa-hourglass-half"></i> CxC Abierta ($${cxcPending.toLocaleString()} pend.)</span>`;
    } else {
        cxcBadgeHtml = `<span style="font-size: 10px; font-weight: 800; background: #f1f5f9; color: #64748b; border: 1px solid #cbd5e1; padding: 2px 7px; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px;" title="Obra sin valuación emitida en CxC"><i class="fa-solid fa-file-circle-question"></i> Sin Facturar</span>`;
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
                ${(p.unbilled_contract_usd && p.unbilled_contract_usd > 0.05) ? `
                <button type="button" onclick="openCreateCxCForProject(${p.id})" class="btn-primary" style="padding: 6px 4px; font-size: 10.5px; background: #059669; text-align: center; border-radius: 6px; display: flex; align-items: center; justify-content: center; gap: 4px; white-space: nowrap;" title="Facturar Remanente / Valuación ($${p.unbilled_contract_usd.toLocaleString()} USD)">
                    <i class="fa-solid fa-file-invoice-dollar"></i> Facturar
                </button>
                ` : ((cxcStatus === 'abierta' || cxcStatus === 'parcial' || cxcPending > 0.05) ? `
                <button type="button" onclick="navigateToProjectCxC('${p.code}')" class="btn-primary" style="padding: 6px 4px; font-size: 10.5px; background: #d97706; text-align: center; border-radius: 6px; display: flex; align-items: center; justify-content: center; gap: 4px; white-space: nowrap;" title="Ver y Gestionar Cobro en CxC ($${cxcPending.toLocaleString()} USD pendientes)">
                    <i class="fa-solid fa-hand-holding-dollar"></i> CxC Abierta
                </button>
                ` : `
                <button type="button" class="btn-secondary" style="padding: 6px 4px; font-size: 10.5px; background: #f0fdf4; color: #166534; border-color: #86efac; cursor: default; font-weight: 700; text-align: center; border-radius: 6px; display: flex; align-items: center; justify-content: center; gap: 4px; white-space: nowrap;" title="Obra totalmente facturada y solventada" disabled>
                    <i class="fa-solid fa-circle-check" style="color: #059669;"></i> Solvente
                </button>
                `)}

                <button type="button" onclick="openAddendumModal(${p.id})" class="btn-secondary" style="padding: 6px 4px; font-size: 10.5px; background: #faf5ff; color: #9333ea; border: 1.5px solid #d8b4fe; font-weight: 800; text-align: center; border-radius: 6px; display: flex; align-items: center; justify-content: center; gap: 4px; white-space: nowrap;" title="Registrar Adenda Contractual / Obra Extra (+USD)">
                    <i class="fa-solid fa-file-circle-plus"></i> + Adenda
                </button>

                <button type="button" onclick="openRequestProjectResourcesModal(${p.id})" class="btn-primary" style="padding: 6px 4px; font-size: 10.5px; background: #0284c7; text-align: center; border-radius: 6px; display: flex; align-items: center; justify-content: center; gap: 4px; white-space: nowrap;" title="Solicitar Recursos y Materiales a Almacén para esta obra">
                    <i class="fa-solid fa-truck-ramp-box"></i> Insumos
                </button>

                <button type="button" onclick="navigateToProjectGuides(${p.id}, '${p.code}')" class="btn-secondary" style="padding: 6px 4px; font-size: 10.5px; background: #f8fafc; color: #0284c7; border: 1px solid #cbd5e1; text-align: center; border-radius: 6px; display: flex; align-items: center; justify-content: center; gap: 4px; white-space: nowrap;" title="Consultar Guías de Despacho emitidas para esta obra">
                    <i class="fa-solid fa-truck"></i> Guías
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

        const res = await fetch(`${API_BASE}/projects/${projectId}/details`);
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



        document.getElementById("detail_proj_code").innerText = data.code;

        document.getElementById("detail_proj_name").innerText = data.name;

        document.getElementById("detail_proj_subtitle").innerText = `Cliente: ${data.client_name || 'General'} | Ubicación: ${data.location} | Duración: ${data.duration_days} días`;

        

        document.getElementById("detail_proj_contract").innerText = `$${data.contract_amount_usd.toLocaleString()}`;

        document.getElementById("detail_proj_budget").innerText = `$${data.budget_limit_usd.toLocaleString()}`;

        document.getElementById("detail_proj_spent").innerText = `$${data.total_spent_usd.toLocaleString()}`;

        document.getElementById("detail_proj_margin").innerText = `$${data.gross_margin_usd.toLocaleString()}`;

        const billedEl = document.getElementById("detail_proj_billed");
        if (billedEl) billedEl.innerText = `$${(data.total_billed_cxc_usd || 0).toLocaleString()}`;

        const unbilledEl = document.getElementById("detail_proj_unbilled");
        if (unbilledEl) unbilledEl.innerText = `$${(data.unbilled_contract_usd || 0).toLocaleString()}`;

        const colEl = document.getElementById("detail_proj_collected");
        if (colEl) colEl.innerText = `$${(data.total_collected_usd || 0).toLocaleString()}`;

        const recBalEl = document.getElementById("detail_proj_receivable_bal");
        if (recBalEl) recBalEl.innerText = `$${(data.balance_receivable_usd || 0).toLocaleString()}`;

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



                if (tasksList.length > 0) {

                    const doneTasksCount = tasksList.filter(t => t.startsWith('[x]') || t.startsWith('[X]')).length;

                    tasksHtml = `

                    <div style="margin-top: 8px; border-top: 1px dashed #e2e8f0; padding-top: 8px;">

                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">

                            <span style="font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase;">

                                <i class="fa-solid fa-list-check" style="color: var(--dalor-blue);"></i> Tareas / Actividades Asignadas (Tilda para avanzar):

                            </span>

                            <span style="font-size: 10px; font-weight: 700; color: ${isDone ? '#059669' : '#0284c7'};">

                                ${doneTasksCount} de ${tasksList.length} completadas

                            </span>

                        </div>

                        <div style="display: flex; flex-direction: column; gap: 5px;">

                            ${tasksList.map((t, tIdx) => {

                                const isChecked = t.startsWith("[x]") || t.startsWith("[X]");

                                let cleanName = t;

                                for (const pref of ["[x]", "[X]", "[ ]", "✅", "⏳"]) {

                                    if (cleanName.startsWith(pref)) cleanName = cleanName.substring(pref.length).trim();

                                }

                                return `

                                <label style="display: flex; align-items: center; gap: 8px; font-size: 11px; padding: 5px 8px; border-radius: 6px; background: ${isChecked ? '#f0fdf4' : '#f8fafc'}; border: 1px solid ${isChecked ? '#bbf7d0' : '#e2e8f0'}; cursor: ${!isUnlocked && !isChecked ? 'not-allowed' : 'pointer'};">

                                    <input type="checkbox" ${isChecked ? 'checked' : ''} ${!isUnlocked && !isChecked ? 'disabled' : ''} onchange="toggleProjectTask(${data.id}, ${ph.id}, ${tIdx}, this.checked)" style="width: 16px; height: 16px; accent-color: #059669; cursor: pointer;">

                                    <span style="font-weight: 800; color: ${isChecked ? '#166534' : 'var(--dalor-navy)'}; font-family: monospace;">${idx + 1}.${tIdx + 1}</span>

                                    <span style="${isChecked ? 'text-decoration: line-through; color: #15803d; font-weight: 600;' : 'color: #334155;'}">${cleanName}</span>

                                    ${isChecked ? '<span style="margin-left: auto; font-size: 10px; font-weight: 800; color: #059669;"><i class="fa-solid fa-check"></i> Hecho</span>' : ''}

                                </label>

                                `;

                            }).join('')}

                        </div>

                    </div>`;

                }



                return `

                <div style="background: ${isDone ? '#f0fdf4' : (!isUnlocked ? '#f8fafc' : '#ffffff')}; border: 1px solid ${isDone ? '#86efac' : (!isUnlocked ? '#e2e8f0' : '#cbd5e1')}; border-radius: 8px; padding: 10px 12px; ${!isUnlocked ? 'opacity: 0.8;' : ''}">

                    <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap;">

                        <div style="display: flex; align-items: center; gap: 8px;">

                            <span style="background: ${isDone ? '#059669' : (!isUnlocked ? '#94a3b8' : '#002B49')}; color: white; border-radius: 6px; font-size: 11px; font-weight: 800; padding: 2px 6px;">

                                Etapa ${idx + 1}

                            </span>

                            <div>

                                <b style="font-size: 13px; color: var(--dalor-navy); ${isDone ? 'text-decoration: line-through; color: #166534;' : ''}">${ph.name}</b>

                                <span style="font-size: 11px; color: #64748b; margin-left: 6px;">(${ph.duration_days} días &bull; Ppto: $${ph.estimated_cost_usd.toLocaleString()})</span>

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





async function toggleProjectTask(projectId, phaseId, taskIndex, isChecked) {

    try {

        const res = await fetch(`${API_BASE}/projects/${projectId}/phases/${phaseId}/toggle-task`, {

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

async function closeAndCulminateProject(projectId) {
    if (!confirm("¿Estás seguro de culminar y cerrar esta obra?\n\n- El estatus pasará a CULMINADO.\n- Toda la maquinaria, vehículos y personal asignados serán liberados a Disponible en Base Central.\n- El proyecto quedará archivado en el histórico.")) {
        return;
    }

    try {
        const token = window.authToken || localStorage.getItem('dalor_token') || null;
        const headers = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch(`${API_BASE}/projects/${projectId}/status`, {
            method: "PUT",
            headers: headers,
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





// --- BLOQUE L14267-L14456 ---
// ==============================================================================

// 🌟 MÓDULOS MAESTROS DALOR: SEGUIMIENTO PÚBLICO, MULTIMONEDA & RETENCIONES SENIAT

// ==============================================================================



function resolveCurrentProjectId(projIdOrCode) {
    if (typeof projIdOrCode === 'number' && !isNaN(projIdOrCode)) return projIdOrCode;
    if (typeof projIdOrCode === 'string' && !isNaN(parseInt(projIdOrCode, 10)) && /^\d+$/.test(projIdOrCode.trim())) {
        return parseInt(projIdOrCode.trim(), 10);
    }
    if (window.currentViewingProjectId) return window.currentViewingProjectId;
    if (currentViewingProjectId) return currentViewingProjectId;
    const modalEl = document.getElementById("modalProjectDetail");
    if (modalEl && modalEl.dataset && modalEl.dataset.projectId) {
        return parseInt(modalEl.dataset.projectId, 10);
    }
    const codeEl = document.getElementById("detail_proj_code");
    if (codeEl && codeEl.innerText) {
        const rawCode = codeEl.innerText.trim();
        const found = (window.allProjects || []).find(p => p.code === rawCode);
        if (found) return found.id;
    }
    return null;
}

/// Copiar Enlace de Seguimiento Público de Proyecto para Clientes
// Enlace de Seguimiento Público de Proyecto para Clientes (Portal Ciego a Costos)
async function copyProjectClientTrackingLink(projIdOrCode) {
    let token = null;
    let projId = resolveCurrentProjectId(projIdOrCode);
    
    // Si se pasa un código de proyecto string que no sea número
    if (typeof projIdOrCode === 'string' && isNaN(parseInt(projIdOrCode, 10))) {
        token = projIdOrCode;
    }

    if (projId) {
        try {
            const res = await fetch(`${API_BASE}/projects/${projId}/tracking-token`, { method: 'POST' });
            if (res.ok) {
                const data = await res.json();
                token = data.tracking_token || data.project_code;
            }
        } catch(e) {
            console.error('Error generating token:', e);
        }
    }

    if (!token && window.allProjects && projId) {
        const p = window.allProjects.find(x => x.id == projId);
        if (p) token = p.tracking_token || p.code;
    }
    
    const url = window.location.origin + '/seguimiento/' + (token || 'PRJ-2026-001');
    if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
    }
    
    if (typeof showToastNotification === 'function') {
        showToastNotification(`🔗 Enlace copiado al portapapeles: ${url}`, 'success');
    } else {
        alert(`🔗 Enlace de Seguimiento para Cliente copiado al portapapeles:\n\n${url}`);
    }
}

async function shareProjectViaWhatsApp(projIdOrCode) {
    let projId = resolveCurrentProjectId(projIdOrCode);
    let proj = (window.allProjects || []).find(p => p.id == projId) || { name: 'Proyecto', code: 'PRJ' };

    let token = proj.tracking_token || proj.code;
    if (projId) {
        try {
            const res = await fetch(`${API_BASE}/projects/${projId}/tracking-token`, { method: 'POST' });
            if (res.ok) {
                const data = await res.json();
                token = data.tracking_token || token;
            }
        } catch(e) {}
    }

    const trackingUrl = `${window.location.origin}/seguimiento/${token}`;
    const text = `*Metalmecánica Dalor, C.A.*%0A%0AEstimado cliente, puede consultar el avance en tiempo real y cronograma del proyecto *${encodeURIComponent(proj.name)}* en el siguiente enlace oficial:%0A${encodeURIComponent(trackingUrl)}%0A%0AGracias por confiar en nuestros servicios.`;
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
}

async function printProjectProgressReport(projIdOrCode) {
    const projId = resolveCurrentProjectId(projIdOrCode);
    if (!projId) {
        alert("Por favor abra la ficha de un proyecto para generar el reporte de avance en PDF.");
        return;
    }
    try {
        const res = await fetch(`${API_BASE}/projects/${projId}/details`);
        if (!res.ok) throw new Error("Error al obtener datos del proyecto (" + res.status + ")");
        const proj = await res.json();

        let phasesRows = (proj.phases || []).map((ph, idx) => `
            <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 8px; font-weight: 800; color: #002B49;">Etapa ${idx + 1}</td>
                <td style="padding: 8px; font-weight: 700;">${ph.name}</td>
                <td style="padding: 8px; text-align: center;">${ph.duration_days} días</td>
                <td style="padding: 8px; text-align: center;">
                    <span style="font-size: 11px; padding: 3px 8px; border-radius: 4px; font-weight: 800; ${ph.status === 'completado' ? 'background: #dcfce7; color: #166534;' : (ph.status === 'en_progreso' ? 'background: #e0f2fe; color: #0369a1;' : 'background: #f1f5f9; color: #64748b;')}">
                        ${ph.status === 'completado' ? '✅ Culminada' : (ph.status === 'en_progreso' ? '🔄 En Progreso' : '⏳ Pendiente')}
                    </span>
                </td>
            </tr>
        `).join('');

        const printHtml = `
        <div style="font-family: Arial, sans-serif; color: #1e293b; max-width: 800px; margin: auto; padding: 24px; border: 1px solid #cbd5e1; background: #fff;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #F5B800; padding-bottom: 12px; margin-bottom: 16px;">
                <div style="display: flex; align-items: center; gap: 14px;">
                    <img src="logo_dalor.jpg" alt="DALOR" style="height: 50px; max-width: 140px; object-fit: contain;" onerror="this.style.display='none'">
                    <div>
                        <h1 style="font-size: 18px; font-weight: 900; color: #002B49; margin: 0; text-transform: uppercase;">Metalmecánica Dalor, C.A.</h1>
                        <p style="font-size: 11px; color: #0284c7; margin: 2px 0 0 0; font-weight: 700;">RIF: J-31601195-0 &bull; Guacara, Edo. Carabobo</p>
                    </div>
                </div>
                <div style="text-align: right; border: 2px solid #002B49; padding: 6px 12px; border-radius: 6px; background: #f8fafc;">
                    <div style="font-size: 10px; font-weight: 900; color: #002B49;">REPORTE OFICIAL DE AVANCE DE OBRA</div>
                    <div style="font-size: 15px; font-weight: 900; color: #0284c7;">${proj.code}</div>
                    <div style="font-size: 10px; color: #64748b;">Fecha: ${new Date().toLocaleDateString('es-VE')}</div>
                </div>
            </div>

            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                <h2 style="font-size: 15px; font-weight: 800; color: #002B49; margin: 0 0 6px 0;">${proj.name}</h2>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12px;">
                    <div><b>Cliente:</b> ${proj.client_name || 'General'}</div>
                    <div><b>Ubicación:</b> ${proj.location || 'Sede Central'}</div>
                    <div><b>Duración Estimada:</b> ${proj.duration_days} días</div>
                    <div><b>Avance Físico Global:</b> <span style="font-weight: 800; color: #059669;">${proj.progress_pct || 0}%</span></div>
                </div>
                ${proj.scope_of_work ? `<p style="font-size: 11px; color: #475569; margin: 8px 0 0 0; border-top: 1px dashed #cbd5e1; padding-top: 6px;"><b>Alcance del Trabajo:</b> ${proj.scope_of_work}</p>` : ''}
            </div>

            <h3 style="font-size: 13px; font-weight: 800; color: #002B49; margin-bottom: 8px;">Desglose de Fases y Cronograma de Ejecución:</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 24px;">
                <thead style="background: #f1f5f9; border-bottom: 2px solid #cbd5e1;">
                    <tr>
                        <th style="padding: 8px; text-align: left;">Fase</th>
                        <th style="padding: 8px; text-align: left;">Descripción de la Actividad</th>
                        <th style="padding: 8px; text-align: center;">Duración</th>
                        <th style="padding: 8px; text-align: center;">Estado</th>
                    </tr>
                </thead>
                <tbody>
                    ${phasesRows}
                </tbody>
            </table>

            <div style="display: flex; justify-content: space-between; margin-top: 40px; padding-top: 10px;">
                <div style="text-align: center; width: 45%; border-top: 1px solid #94a3b8; padding-top: 6px; font-size: 11px;">
                    <b>Ingeniero Residente / Supervisor DALOR</b><br>Firma y Sello
                </div>
                <div style="text-align: center; width: 45%; border-top: 1px solid #94a3b8; padding-top: 6px; font-size: 11px;">
                    <b>Inspector Técnico del Cliente</b><br>Firma y Conformidad
                </div>
            </div>
        </div>
        `;

        const container = document.getElementById("modalPrintPreviewContent");
        if (container) {
            container.innerHTML = printHtml;
            const titleEl = document.getElementById("previewModalTitle");
            if (titleEl) titleEl.innerText = `Reporte de Avance de Obra - ${proj.code}`;
            if (typeof window.openModal === 'function') {
                window.openModal('modalPrintPreview');
            } else {
                const modalEl = document.getElementById('modalPrintPreview');
                if (modalEl) modalEl.classList.remove('hidden');
            }
        } else {
            const w = window.open('', '_blank');
            if (w) {
                w.document.write(`<html><head><title>Avance de Obra - ${proj.code}</title></head><body style="margin: 20px;">${printHtml}</body></html>`);
                w.document.close();
                setTimeout(() => { w.focus(); w.print(); }, 400);
            }
        }
    } catch(e) {
        alert("Error al generar reporte PDF: " + e.message);
    }
}



// Toggle Activo / Inactivo en Activos y Equipos

window.toggleAssetActive = async function(assetId) {

    try {

        const res = await fetch(`${API_BASE}/assets/${assetId}/toggle-active`, { method: 'POST' });

        if (!res.ok) throw new Error('No se pudo cambiar el estado del activo.');

        const data = await res.json();

        showToastNotification(`Activo actualizado: ${data.status_label}`, 'success');

        if (typeof loadAssetsList === 'function') loadAssetsList();

        if (typeof loadFleetView === 'function') loadFleetView();

    } catch(err) {

        showToastNotification(`Error: ${err.message}`, 'error');

    }

};



// Cambio dinámico de moneda en cotización

window.onQuotationCurrencyChanged = function() {

    const cur = document.getElementById("quote_currency")?.value || "USD";

    const symbol = cur === "VES" ? "Bs." : (cur === "EUR" ? "€" : "$");

    const labelSub = document.querySelector("#quote_subtotal_display")?.previousElementSibling;

    const labelTot = document.querySelector("#quote_total_display")?.previousElementSibling;

    if (labelSub) labelSub.innerText = `Subtotal (${symbol})`;

    if (labelTot) labelTot.innerText = `Total Cotizado (${symbol})`;

    if (typeof recalcQuotationTotals === 'function') recalcQuotationTotals();

};





async function deleteReceivable(cxcId, invoiceNum) {

    if (!confirm(`¿Estás seguro de anular / eliminar la Cuenta por Cobrar [${invoiceNum || cxcId}]?`)) return;

    try {

        const res = await fetch(`${API_BASE}/financial/cxc/${cxcId}`, { method: 'DELETE' });

        if (!res.ok) {

            const err = await res.json();

            throw new Error(err.detail || "Error al anular CxC");

        }

        await loadReceivablesList();

        if (typeof showToastNotification === 'function') {

            showToastNotification(`🗑️ Cuenta por cobrar [${invoiceNum}] eliminada con éxito.`, 'success');

        } else {

            alert(`🗑️ Cuenta por cobrar eliminada con éxito.`);

        }

    } catch(err) {

        alert("Error al anular CxC: " + err.message);

    }

}









// ==============================================================================
// 🚚 SOLICITUD DE RECURSOS & MATERIALES A ALMACÉN (FLUJO OBRA -> DESPACHO)
// ==============================================================================

var reqSelectedPersonnelIds = [];
var reqSelectedVehicleIds = [];
var reqSelectedToolIds = [];
var reqSelectedMaterialItems = [];

async function openRequestProjectResourcesModal(projectId) {
    if (!projectId) {
        alert("Por favor selecciona una obra válida.");
        return;
    }
    
    reqSelectedPersonnelIds = [];
    reqSelectedVehicleIds = [];
    reqSelectedToolIds = [];
    reqSelectedMaterialItems = [];

    const p = (allProjects || []).find(x => x.id === projectId) || {};
    const titleEl = document.getElementById("reqProjModalTitle");
    const subEl = document.getElementById("reqProjModalSubtitle");
    const idInput = document.getElementById("req_proj_id");
    const destInput = document.getElementById("req_proj_destination");

    if (titleEl) titleEl.innerHTML = `<i class="fa-solid fa-truck-ramp-box" style="color: #0284c7;"></i> Solicitar Recursos y Materiales a Almacén &bull; [${p.code || 'OBRA'}]`;
    if (subEl) subEl.textContent = `Proyecto: ${p.name || ''} | Cliente: ${p.client_name || 'General'}`;
    if (idInput) idInput.value = projectId;
    if (destInput) destInput.value = p.location || "En Obra";

    // Cargar alerta de guías existentes si las hay
    const existingGuidesBanner = document.getElementById("req_proj_existing_guides_banner");
    if (existingGuidesBanner) {
        try {
            const gRes = await authFetch(`${API_BASE}/dispatch/?project_id=${projectId}`);
            if (gRes.ok) {
                const gData = await gRes.json();
                if (Array.isArray(gData) && gData.length > 0) {
                    existingGuidesBanner.style.display = 'block';
                    existingGuidesBanner.innerHTML = `
                        <div style="background: #e0f2fe; border: 1px solid #7dd3fc; border-radius: 6px; padding: 6px 10px; margin-bottom: 10px; font-size: 11px; color: #0369a1; display: flex; justify-content: space-between; align-items: center;">
                            <span><i class="fa-solid fa-info-circle"></i> Esta obra ya cuenta con <b>${gData.length} guía(s) de despacho</b> emitidas.</span>
                            <button type="button" onclick="navigateToProjectGuides(${projectId}, '${p.code}')" class="btn-secondary" style="font-size: 10.5px; padding: 2px 8px; background: white; color: #0284c7; border: 1px solid #bae6fd;">
                                <i class="fa-solid fa-truck"></i> Ver Guías
                            </button>
                        </div>
                    `;
                } else {
                    existingGuidesBanner.style.display = 'none';
                }
            }
        } catch(e) {
            existingGuidesBanner.style.display = 'none';
        }
    }

    await loadInitialMasterData();
    populateRequestModalDropdowns();
    renderReqAssignedTags();

    openModal("modalRequestProjectResources");
}

function getResourceProjectTag(projId) {
    if (!projId) return '';
    const projs = window.allProjects || allProjects || [];
    const p = projs.find(x => x.id === projId);
    return p ? `${p.code} - ${p.name || ''}`.trim() : `Obra ID ${projId}`;
}

function populateRequestModalDropdowns() {
    const rawPersonnel = (window.allPersonnel && window.allPersonnel.length > 0) ? window.allPersonnel : (allPersonnel || []);
    const rawAssets = (window.allAssets && window.allAssets.length > 0) ? window.allAssets : (allAssets || []);
    const safeMats = (window.allMaterials && window.allMaterials.length > 0) ? window.allMaterials : (allMaterials || []);

    // 1. Personal
    const persSel = document.getElementById("req_select_personnel");
    if (persSel) {
        const activePers = rawPersonnel.filter(p => p.is_active !== false);
        const availPers = activePers.filter(p => !p.current_project_id && (p.status === 'disponible_base' || p.status === 'disponible' || !p.status) && p.status !== 'en_obra');
        const busyPers = activePers.filter(p => p.current_project_id || p.status === 'en_obra');

        let persHtml = `<option value="">-- Seleccionar Personal (${availPers.length} disp. en base) --</option>`;
        if (availPers.length > 0) {
            persHtml += `<optgroup label="✅ Disponibles en Base (${availPers.length})">` +
                availPers.map(p => `<option value="${p.id}">[${p.code}] ${p.full_name} (${p.role_title || 'Técnico'})</option>`).join('') +
                `</optgroup>`;
        }
        if (busyPers.length > 0) {
            persHtml += `<optgroup label="⚠️ Asignados a Otra Obra (Requiere Transferencia)">` +
                busyPers.map(p => {
                    const tag = getResourceProjectTag(p.current_project_id);
                    return `<option value="${p.id}" disabled style="color: #64748b; background: #f8fafc;">[${p.code}] ${p.full_name} 🚫 (Asignado a: ${tag})</option>`;
                }).join('') +
                `</optgroup>`;
        }
        persSel.innerHTML = persHtml;
    }

    // 2. Vehículos
    const vehSel = document.getElementById("req_select_fleet");
    if (vehSel) {
        const vehicles = rawAssets.filter(a => (a.asset_type === 'vehiculo' || a.asset_type === 'camioneta') && a.is_active !== false);
        const availVeh = vehicles.filter(v => !v.current_project_id && (v.status === 'disponible_base' || v.status === 'disponible' || !v.status) && v.status !== 'en_obra' && v.status !== 'alquilado_a_tercero');
        const busyVeh = vehicles.filter(v => v.current_project_id || v.status === 'en_obra' || v.status === 'alquilado_a_tercero');

        let vehHtml = `<option value="">-- Seleccionar Unidad (${availVeh.length} disp. en base) --</option>`;
        if (availVeh.length > 0) {
            vehHtml += `<optgroup label="✅ Disponibles en Base (${availVeh.length})">` +
                availVeh.map(v => `<option value="${v.id}">[${v.asset_code}] ${v.name} ${v.license_plate ? `(${v.license_plate})` : ''} - Ubic: ${v.current_location || 'Base'}</option>`).join('') +
                `</optgroup>`;
        }
        if (busyVeh.length > 0) {
            vehHtml += `<optgroup label="⚠️ Asignados a Otra Obra (Requiere Transferencia)">` +
                busyVeh.map(v => {
                    const tag = v.status === 'alquilado_a_tercero' ? 'Alquiler a Tercero' : (getResourceProjectTag(v.current_project_id) || 'En otra obra');
                    return `<option value="${v.id}" disabled style="color: #64748b; background: #f8fafc;">[${v.asset_code}] ${v.name} ${v.license_plate ? `(${v.license_plate})` : ''} 🚫 (Asignado a: ${tag})</option>`;
                }).join('') +
                `</optgroup>`;
        }
        vehSel.innerHTML = vehHtml;
    }

    // 3. Herramientas
    const toolSel = document.getElementById("req_select_tools");
    if (toolSel) {
        const tools = rawAssets.filter(a => a.asset_type !== 'vehiculo' && a.asset_type !== 'camioneta' && a.is_active !== false);
        const availTools = tools.filter(t => !t.current_project_id && (t.status === 'disponible_base' || t.status === 'disponible' || !t.status) && t.status !== 'en_obra' && t.status !== 'alquilado_a_tercero');
        const busyTools = tools.filter(t => t.current_project_id || t.status === 'en_obra' || t.status === 'alquilado_a_tercero');

        let toolHtml = `<option value="">-- Seleccionar Herramienta (${availTools.length} disp. en base) --</option>`;
        if (availTools.length > 0) {
            toolHtml += `<optgroup label="✅ Disponibles en Base (${availTools.length})">` +
                availTools.map(t => `<option value="${t.id}">[${t.asset_code}] ${t.name} (S/N: ${t.serial_number || 'S/N'})</option>`).join('') +
                `</optgroup>`;
        }
        if (busyTools.length > 0) {
            toolHtml += `<optgroup label="⚠️ Asignadas a Otra Obra (Requiere Transferencia)">` +
                busyTools.map(t => {
                    const tag = t.status === 'alquilado_a_tercero' ? 'Alquiler a Tercero' : (getResourceProjectTag(t.current_project_id) || 'En otra obra');
                    return `<option value="${t.id}" disabled style="color: #64748b; background: #f8fafc;">[${t.asset_code}] ${t.name} 🚫 (Asignada a: ${tag})</option>`;
                }).join('') +
                `</optgroup>`;
        }
        toolSel.innerHTML = toolHtml;
    }

    // 4. Materiales con Stock > 0
    const matSel = document.getElementById("req_select_materials");
    const availableMats = safeMats.filter(m => (parseFloat(m.stock_quantity) || 0) > 0);
    if (matSel) {
        matSel.innerHTML = `<option value="">-- Seleccionar Material (${availableMats.length} con stock) --</option>` +
            availableMats.map(m => `<option value="${m.id}" data-unit="${m.unit_measure || 'UND'}" data-stock="${m.stock_quantity}">[${m.code}] ${m.name} (Stock: ${m.stock_quantity} ${m.unit_measure || 'UND'})</option>`).join('');
    }
}

function filterReqDropdown(type, query) {
    const q = (query || '').toLowerCase().trim();
    if (type === 'personnel') {
        const sel = document.getElementById("req_select_personnel");
        const rawPersonnel = (window.allPersonnel && window.allPersonnel.length > 0) ? window.allPersonnel : (allPersonnel || []);
        const activePers = rawPersonnel.filter(p => p.is_active !== false);
        const availPers = activePers.filter(p => !p.current_project_id && (p.status === 'disponible_base' || p.status === 'disponible' || !p.status) && p.status !== 'en_obra');
        const busyPers = activePers.filter(p => p.current_project_id || p.status === 'en_obra');

        const match = p => !q || (p.full_name || '').toLowerCase().includes(q) || (p.code || '').toLowerCase().includes(q) || (p.role_title || '').toLowerCase().includes(q);
        const fAvail = availPers.filter(match);
        const fBusy = busyPers.filter(match);

        let html = `<option value="">-- Seleccionar Personal (${fAvail.length} disp.) --</option>`;
        if (fAvail.length > 0) {
            html += `<optgroup label="✅ Disponibles en Base (${fAvail.length})">` +
                fAvail.map(p => `<option value="${p.id}">[${p.code}] ${p.full_name} (${p.role_title || 'Técnico'})</option>`).join('') +
                `</optgroup>`;
        }
        if (fBusy.length > 0) {
            html += `<optgroup label="⚠️ Asignados a Otra Obra (Requiere Transferencia)">` +
                fBusy.map(p => `<option value="${p.id}" disabled style="color: #64748b; background: #f8fafc;">[${p.code}] ${p.full_name} 🚫 (Asignado a: ${getResourceProjectTag(p.current_project_id)})</option>`).join('') +
                `</optgroup>`;
        }
        if (sel) sel.innerHTML = html;
    } else if (type === 'fleet') {
        const sel = document.getElementById("req_select_fleet");
        const rawAssets = (window.allAssets && window.allAssets.length > 0) ? window.allAssets : (allAssets || []);
        const vehicles = rawAssets.filter(a => (a.asset_type === 'vehiculo' || a.asset_type === 'camioneta') && a.is_active !== false);
        const availVeh = vehicles.filter(v => !v.current_project_id && (v.status === 'disponible_base' || v.status === 'disponible' || !v.status) && v.status !== 'en_obra' && v.status !== 'alquilado_a_tercero');
        const busyVeh = vehicles.filter(v => v.current_project_id || v.status === 'en_obra' || v.status === 'alquilado_a_tercero');

        const match = v => !q || (v.name || '').toLowerCase().includes(q) || (v.asset_code || '').toLowerCase().includes(q) || (v.license_plate || '').toLowerCase().includes(q);
        const fAvail = availVeh.filter(match);
        const fBusy = busyVeh.filter(match);

        let html = `<option value="">-- Seleccionar Unidad (${fAvail.length} disp.) --</option>`;
        if (fAvail.length > 0) {
            html += `<optgroup label="✅ Disponibles en Base (${fAvail.length})">` +
                fAvail.map(v => `<option value="${v.id}">[${v.asset_code}] ${v.name} ${v.license_plate ? `(${v.license_plate})` : ''}</option>`).join('') +
                `</optgroup>`;
        }
        if (fBusy.length > 0) {
            html += `<optgroup label="⚠️ Asignados a Otra Obra (Requiere Transferencia)">` +
                fBusy.map(v => {
                    const tag = v.status === 'alquilado_a_tercero' ? 'Alquiler a Tercero' : (getResourceProjectTag(v.current_project_id) || 'En otra obra');
                    return `<option value="${v.id}" disabled style="color: #64748b; background: #f8fafc;">[${v.asset_code}] ${v.name} 🚫 (Asignado a: ${tag})</option>`;
                }).join('') +
                `</optgroup>`;
        }
        if (sel) sel.innerHTML = html;
    } else if (type === 'tools') {
        const sel = document.getElementById("req_select_tools");
        const rawAssets = (window.allAssets && window.allAssets.length > 0) ? window.allAssets : (allAssets || []);
        const tools = rawAssets.filter(a => a.asset_type !== 'vehiculo' && a.asset_type !== 'camioneta' && a.is_active !== false);
        const availTools = tools.filter(t => !t.current_project_id && (t.status === 'disponible_base' || t.status === 'disponible' || !t.status) && t.status !== 'en_obra' && t.status !== 'alquilado_a_tercero');
        const busyTools = tools.filter(t => t.current_project_id || t.status === 'en_obra' || t.status === 'alquilado_a_tercero');

        const match = t => !q || (t.name || '').toLowerCase().includes(q) || (t.asset_code || '').toLowerCase().includes(q) || (t.serial_number || '').toLowerCase().includes(q);
        const fAvail = availTools.filter(match);
        const fBusy = busyTools.filter(match);

        let html = `<option value="">-- Seleccionar Herramienta (${fAvail.length} disp.) --</option>`;
        if (fAvail.length > 0) {
            html += `<optgroup label="✅ Disponibles en Base (${fAvail.length})">` +
                fAvail.map(t => `<option value="${t.id}">[${t.asset_code}] ${t.name} (S/N: ${t.serial_number || 'S/N'})</option>`).join('') +
                `</optgroup>`;
        }
        if (fBusy.length > 0) {
            html += `<optgroup label="⚠️ Asignadas a Otra Obra (Requiere Transferencia)">` +
                fBusy.map(t => {
                    const tag = t.status === 'alquilado_a_tercero' ? 'Alquiler a Tercero' : (getResourceProjectTag(t.current_project_id) || 'En otra obra');
                    return `<option value="${t.id}" disabled style="color: #64748b; background: #f8fafc;">[${t.asset_code}] ${t.name} 🚫 (Asignada a: ${tag})</option>`;
                }).join('') +
                `</optgroup>`;
        }
        if (sel) sel.innerHTML = html;
    } else if (type === 'material') {
        const sel = document.getElementById("req_select_materials");
        const safeMats = (window.allMaterials && window.allMaterials.length > 0) ? window.allMaterials : (allMaterials || []);
        const availableMats = safeMats.filter(m => (parseFloat(m.stock_quantity) || 0) > 0);
        const filtered = q ? availableMats.filter(m => (m.name || '').toLowerCase().includes(q) || (m.code || '').toLowerCase().includes(q)) : availableMats;
        if (sel) {
            sel.innerHTML = `<option value="">-- Seleccionar Material (${filtered.length}) --</option>` +
                filtered.map(m => `<option value="${m.id}" data-unit="${m.unit_measure || 'UND'}" data-stock="${m.stock_quantity}">[${m.code}] ${m.name} (Stock: ${m.stock_quantity} ${m.unit_measure || 'UND'})</option>`).join('');
        }
    }
}

function addReqResource(type) {
    if (type === 'personnel') {
        const sel = document.getElementById("req_select_personnel");
        const opt = sel?.options[sel.selectedIndex];
        if (opt && opt.disabled) {
            alert("⚠️ Este trabajador ya está asignado a otra obra. Para utilizarlo en este proyecto, debe gestionarse mediante 'Transferencia entre Obras'.");
            sel.value = "";
            return;
        }
        const val = parseInt(sel?.value);
        if (val && !reqSelectedPersonnelIds.includes(val)) {
            reqSelectedPersonnelIds.push(val);
            renderReqAssignedTags();
        }
        if (sel) sel.value = "";
    } else if (type === 'fleet') {
        const sel = document.getElementById("req_select_fleet");
        const opt = sel?.options[sel.selectedIndex];
        if (opt && opt.disabled) {
            alert("⚠️ Este vehículo ya está asignado a otra obra. Para utilizarlo en este proyecto, debe gestionarse mediante 'Transferencia entre Obras'.");
            sel.value = "";
            return;
        }
        const val = parseInt(sel?.value);
        if (val && !reqSelectedVehicleIds.includes(val)) {
            reqSelectedVehicleIds.push(val);
            renderReqAssignedTags();
        }
        if (sel) sel.value = "";
    } else if (type === 'tools') {
        const sel = document.getElementById("req_select_tools");
        const opt = sel?.options[sel.selectedIndex];
        if (opt && opt.disabled) {
            alert("⚠️ Esta herramienta ya está asignada a otra obra. Para utilizarla en este proyecto, debe gestionarse mediante 'Transferencia entre Obras'.");
            sel.value = "";
            return;
        }
        const val = parseInt(sel?.value);
        if (val && !reqSelectedToolIds.includes(val)) {
            reqSelectedToolIds.push(val);
            renderReqAssignedTags();
        }
        if (sel) sel.value = "";
    } else if (type === 'material') {
        const sel = document.getElementById("req_select_materials");
        const qtyInp = document.getElementById("req_mat_quantity");
        const val = parseInt(sel?.value);
        let qty = parseFloat(qtyInp?.value) || 0;
        if (!val) {
            alert("Por favor selecciona un material del catálogo.");
            return false;
        }
        if (qty <= 0) {
            alert("Por favor ingresa la cantidad requerida (debe ser mayor a 0).");
            if (qtyInp) qtyInp.focus();
            return false;
        }
        const opt = sel.options[sel.selectedIndex];
        const maxStock = parseFloat(opt?.dataset?.stock) || 0;
        const mUnit = opt?.dataset?.unit || 'UND';
        if (qty > maxStock) {
            alert(`⚠️ Stock insuficiente en almacén:\n\nEstás solicitando ${qty} ${mUnit}, pero el stock disponible en bodega es solo de ${maxStock} ${mUnit}.\n\nPor favor ajusta la cantidad requerida al stock disponible o gestiona una orden de compra para abastecer la diferencia.`);
            if (qtyInp) {
                qtyInp.focus();
                qtyInp.select();
            }
            return false;
        }
        const existing = reqSelectedMaterialItems.find(x => x.material_id === val);
        if (existing) {
            existing.quantity = qty;
        } else {
            reqSelectedMaterialItems.push({ material_id: val, quantity: qty });
        }
        renderReqAssignedTags();
        if (sel) sel.value = "";
        if (qtyInp) {
            qtyInp.value = "";
            qtyInp.removeAttribute("max");
            qtyInp.placeholder = "Cant.";
        }
        return true;
    }
}

function onReqMaterialChanged(sel) {
    const qtyInp = document.getElementById("req_mat_quantity");
    if (!sel || !sel.value) {
        if (qtyInp) { 
            qtyInp.value = ""; 
            qtyInp.removeAttribute("max"); 
            qtyInp.placeholder = "Cant."; 
        }
        return;
    }
    const opt = sel.options[sel.selectedIndex];
    const maxStock = parseFloat(opt?.dataset?.stock) || 0;
    const mUnit = opt?.dataset?.unit || 'UND';
    if (qtyInp) {
        qtyInp.max = maxStock;
        qtyInp.placeholder = `Disp: ${maxStock} ${mUnit}`;
        qtyInp.title = `Stock físico disponible en almacén: ${maxStock} ${mUnit}`;
        // NO se autorrellena con números para evitar errores operativos: el usuario ingresa su cantidad requerida
        qtyInp.value = "";
        qtyInp.focus();
    }
}

function removeReqResource(type, id) {
    if (type === 'personnel') {
        reqSelectedPersonnelIds = reqSelectedPersonnelIds.filter(x => x !== id);
    } else if (type === 'fleet') {
        reqSelectedVehicleIds = reqSelectedVehicleIds.filter(x => x !== id);
    } else if (type === 'tools') {
        reqSelectedToolIds = reqSelectedToolIds.filter(x => x !== id);
    } else if (type === 'material') {
        reqSelectedMaterialItems = reqSelectedMaterialItems.filter(x => x.material_id !== id);
    }
    renderReqAssignedTags();
}

function renderReqAssignedTags() {
    const safePersonnel = (window.allPersonnel && window.allPersonnel.length > 0) ? window.allPersonnel : (allPersonnel || []);
    const safeAssets = (window.allAssets && window.allAssets.length > 0) ? window.allAssets : (allAssets || []);
    const safeMats = (window.allMaterials && window.allMaterials.length > 0) ? window.allMaterials : (allMaterials || []);

    // 1. Personal Tags
    const persContainer = document.getElementById("req_tags_personnel");
    if (persContainer) {
        if (reqSelectedPersonnelIds.length === 0) {
            persContainer.innerHTML = `<span style="font-size:11px; color:#94a3b8;">Sin personal seleccionado.</span>`;
        } else {
            persContainer.innerHTML = reqSelectedPersonnelIds.map(id => {
                const p = safePersonnel.find(item => item.id === id);
                const pCode = p ? p.code : `ID:${id}`;
                const pName = p ? p.full_name : 'Personal';
                return `
                    <span class="resource-tag-pill" style="display:inline-flex; align-items:center; gap:6px; background:#eff6ff; color:#1e40af; border:1px solid #bfdbfe; padding:4px 10px; border-radius:9999px; font-size:11.5px; font-weight:700; margin:2px;">
                        <i class="fa-solid fa-user-check"></i> [${pCode}] ${pName}
                        <button type="button" onclick="removeReqResource('personnel', ${id})" style="background:none; border:none; color:#ef4444; cursor:pointer; font-weight:bold; font-size:13px; line-height:1; padding:0 2px;" title="Eliminar">&times;</button>
                    </span>
                `;
            }).join('');
        }
    }

    // 2. Vehículos Tags
    const vehContainer = document.getElementById("req_tags_fleet");
    if (vehContainer) {
        if (reqSelectedVehicleIds.length === 0) {
            vehContainer.innerHTML = `<span style="font-size:11px; color:#94a3b8;">Sin vehículos seleccionados.</span>`;
        } else {
            vehContainer.innerHTML = reqSelectedVehicleIds.map(id => {
                const v = safeAssets.find(item => item.id === id);
                const vCode = v ? v.asset_code : `ID:${id}`;
                const vName = v ? v.name : 'Vehículo';
                return `
                    <span class="resource-tag-pill" style="display:inline-flex; align-items:center; gap:6px; background:#f0fdf4; color:#166534; border:1px solid #bbf7d0; padding:4px 10px; border-radius:9999px; font-size:11.5px; font-weight:700; margin:2px;">
                        <i class="fa-solid fa-truck"></i> [${vCode}] ${vName}
                        <button type="button" onclick="removeReqResource('fleet', ${id})" style="background:none; border:none; color:#ef4444; cursor:pointer; font-weight:bold; font-size:13px; line-height:1; padding:0 2px;" title="Eliminar">&times;</button>
                    </span>
                `;
            }).join('');
        }
    }

    // 3. Herramientas Tags
    const toolContainer = document.getElementById("req_tags_tools");
    if (toolContainer) {
        if (reqSelectedToolIds.length === 0) {
            toolContainer.innerHTML = `<span style="font-size:11px; color:#94a3b8;">Sin herramientas seleccionadas.</span>`;
        } else {
            toolContainer.innerHTML = reqSelectedToolIds.map(id => {
                const t = safeAssets.find(item => item.id === id);
                const tCode = t ? t.asset_code : `ID:${id}`;
                const tName = t ? t.name : 'Herramienta';
                return `
                    <span class="resource-tag-pill" style="display:inline-flex; align-items:center; gap:6px; background:#fffbeb; color:#92400e; border:1px solid #fde68a; padding:4px 10px; border-radius:9999px; font-size:11.5px; font-weight:700; margin:2px;">
                        <i class="fa-solid fa-wrench"></i> [${tCode}] ${tName}
                        <button type="button" onclick="removeReqResource('tools', ${id})" style="background:none; border:none; color:#ef4444; cursor:pointer; font-weight:bold; font-size:13px; line-height:1; padding:0 2px;" title="Eliminar">&times;</button>
                    </span>
                `;
            }).join('');
        }
    }

    // 4. Materiales Tags
    const matContainer = document.getElementById("req_tags_materials");
    if (matContainer) {
        if (reqSelectedMaterialItems.length === 0) {
            matContainer.innerHTML = `<span style="font-size:11px; color:#94a3b8;">Sin materiales seleccionados.</span>`;
        } else {
            matContainer.innerHTML = reqSelectedMaterialItems.map(item => {
                const m = safeMats.find(x => x.id === item.material_id);
                const mCode = m ? m.code : `MAT-${item.material_id}`;
                const mName = m ? m.name : 'Material';
                const mUnit = m ? (m.unit_measure || 'UND') : 'UND';
                return `
                    <span class="resource-tag-pill" style="display:inline-flex; align-items:center; gap:6px; background:#f0fdfa; color:#0f766e; border:1px solid #99f6e4; padding:4px 10px; border-radius:9999px; font-size:11.5px; font-weight:700; margin:2px;">
                        <i class="fa-solid fa-boxes-stacked"></i> [${mCode}] ${mName} &bull; <b>${item.quantity} ${mUnit}</b>
                        <button type="button" onclick="removeReqResource('material', ${item.material_id})" style="background:none; border:none; color:#ef4444; cursor:pointer; font-weight:bold; font-size:13px; line-height:1; padding:0 2px;" title="Eliminar">&times;</button>
                    </span>
                `;
            }).join('');
        }
    }

    // Actualizar contadores visuales en el modal
    const pCnt = document.getElementById("req_pers_counter");
    if (pCnt) pCnt.innerText = `${reqSelectedPersonnelIds.length} elegidos`;

    const fCnt = document.getElementById("req_fleet_counter");
    if (fCnt) fCnt.innerText = `${reqSelectedVehicleIds.length} elegidos`;

    const tCnt = document.getElementById("req_tools_counter");
    if (tCnt) tCnt.innerText = `${reqSelectedToolIds.length} elegidos`;

    const mCnt = document.getElementById("req_mats_counter");
    if (mCnt) mCnt.innerText = `${reqSelectedMaterialItems.length} renglones`;
}

function navigateToDispatchGuide(guideNumber) {
    if (typeof closeModal === 'function') {
        closeModal('modalProjectDetail');
        closeModal('modalRequestProjectResources');
    }
    if (typeof switchView === 'function') {
        switchView('dispatch', 'operaciones');
    }
    if (typeof switchDispatchSubtab === 'function') {
        switchDispatchSubtab('list');
    }
    setTimeout(() => {
        const searchInp = document.getElementById("dispatch_search_input");
        if (searchInp) {
            searchInp.value = guideNumber;
            if (typeof filterDispatchList === 'function') {
                filterDispatchList(guideNumber);
            }
        }
    }, 200);
}

function navigateToProjectGuides(projectId, projectCode) {
    if (typeof closeModal === 'function') {
        closeModal('modalProjectDetail');
        closeModal('modalRequestProjectResources');
    }
    if (typeof switchView === 'function') {
        switchView('dispatch', 'operaciones');
    }
    if (typeof switchDispatchSubtab === 'function') {
        switchDispatchSubtab('list');
    }
    setTimeout(() => {
        const searchInp = document.getElementById("dispatch_search_input");
        if (searchInp) {
            searchInp.value = projectCode || '';
            if (typeof filterDispatchList === 'function') {
                filterDispatchList(projectCode || '');
            }
        }
    }, 200);
}

async function submitRequestProjectResources(event) {
    if (event) {
        if (typeof event.preventDefault === 'function') event.preventDefault();
        if (typeof event.stopPropagation === 'function') event.stopPropagation();
    }

    const projectId = parseInt(document.getElementById("req_proj_id")?.value);
    const dest = document.getElementById("req_proj_destination")?.value?.trim() || "En Obra";
    const notes = document.getElementById("req_proj_notes")?.value?.trim() || "";

    if (!projectId) {
        alert("Error: Proyecto no identificado.");
        return false;
    }

    // Si el usuario dejó un material seleccionado en el desplegable antes de presionar Enviar:
    const pendingMatSel = document.getElementById("req_select_materials");
    const pendingQtyInp = document.getElementById("req_mat_quantity");
    if (pendingMatSel && pendingMatSel.value) {
        const added = addReqResource('material');
        if (!added) {
            return false; // Frena el envío para que el usuario corrija conscientemente
        }
    }
    const pendingPersSel = document.getElementById("req_select_personnel");
    if (pendingPersSel && pendingPersSel.value) {
        addReqResource('personnel');
    }
    const pendingFleetSel = document.getElementById("req_select_fleet");
    if (pendingFleetSel && pendingFleetSel.value) {
        addReqResource('fleet');
    }
    const pendingToolsSel = document.getElementById("req_select_tools");
    if (pendingToolsSel && pendingToolsSel.value) {
        addReqResource('tools');
    }

    const totalSelected = reqSelectedPersonnelIds.length + reqSelectedVehicleIds.length + reqSelectedToolIds.length + reqSelectedMaterialItems.length;
    if (totalSelected === 0) {
        alert("⚠️ Por favor selecciona al menos un recurso o material a solicitar para la obra.");
        return false;
    }

    const payload = {
        assigned_personnel_ids: reqSelectedPersonnelIds,
        assigned_vehicle_ids: reqSelectedVehicleIds,
        assigned_tool_ids: reqSelectedToolIds,
        materials: reqSelectedMaterialItems,
        destination_address: dest,
        notes: notes
    };

    try {
        const res = await authFetch(`${API_BASE}/projects/${projectId}/request-dispatch`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Error al procesar solicitud");

        closeModal("modalRequestProjectResources");
        await loadInitialMasterData();
        if (typeof loadProjectsList === 'function') await loadProjectsList();
        if (typeof loadDispatchGuidesList === 'function') loadDispatchGuidesList();

        const guideCode = data.guide_number;
        const msg = `✅ ${data.message || 'Solicitud enviada exitosamente a Almacén.'}\n\nSe ha emitido la Guía de Despacho Oficial N°: ${guideCode || 'Generada'} (${data.items_count || totalSelected} ítems).\n\n¿Deseas abrir y consultar esta Guía en el módulo de Despachos ahora mismo?`;
        if (guideCode && confirm(msg)) {
            navigateToDispatchGuide(guideCode);
        } else {
            if (typeof viewProjectDetails === 'function') viewProjectDetails(projectId);
        }
    } catch (err) {
        console.error("[REQUEST DISPATCH ERROR]", err);
        alert(`❌ Error al solicitar despacho: ${err.message || err}`);
    }

    return false;
}

// ==============================================================================
// ➕ GESTIÓN DE ADENDAS CONTRACTUALES & OBRAS EXTRAS (+USD)
// ==============================================================================
async function openAddendumModal(projectId) {
    const pId = projectId || window.currentViewingProjectId;
    if (!pId) {
        alert("Seleccione un proyecto válido.");
        return;
    }

    const safeProjects = (window.allProjects && window.allProjects.length > 0) ? window.allProjects : (allProjects || []);
    let proj = safeProjects.find(p => p.id == pId);

    if (!proj) {
        try {
            const token = window.authToken || localStorage.getItem('dalor_token') || null;
            const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
            const res = await authFetch(`${API_BASE}/projects/${pId}/details`, { headers });
            if (res.ok) proj = await res.json();
        } catch(e) {
            console.error("Error fetching project for addendum:", e);
        }
    }

    const idInput = document.getElementById("addendum_project_id");
    if (idInput) idInput.value = String(pId);

    const codeEl = document.getElementById("addendum_project_code");
    if (codeEl) codeEl.textContent = proj?.code || `PRJ-${pId}`;

    const nameEl = document.getElementById("addendum_project_name");
    if (nameEl) nameEl.textContent = proj?.name || "Proyecto";

    const contractEl = document.getElementById("addendum_current_contract");
    if (contractEl) contractEl.textContent = `$${Number(proj?.contract_amount_usd || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} USD`;

    // Resetear formulario
    const form = document.getElementById("formProjectAddendum");
    if (form) form.reset();
    if (idInput) idInput.value = String(pId);

    const authInput = document.getElementById("addendum_authorized_by");
    if (authInput) authInput.value = "Dirección General";

    openModal("modalProjectAddendum");
}

async function submitProjectAddendum(event) {
    if (event) event.preventDefault();

    const pId = document.getElementById("addendum_project_id")?.value;
    const title = document.getElementById("addendum_title")?.value?.trim();
    const amountUsd = parseFloat(document.getElementById("addendum_amount_usd")?.value) || 0;
    const scope = document.getElementById("addendum_scope")?.value?.trim() || null;
    const authorizedBy = document.getElementById("addendum_authorized_by")?.value?.trim() || "Dirección General";
    const matUsd = parseFloat(document.getElementById("addendum_mat_usd")?.value) || 0.0;
    const laborUsd = parseFloat(document.getElementById("addendum_labor_usd")?.value) || 0.0;
    const newPhase = document.getElementById("addendum_new_phase")?.value?.trim() || null;

    if (!pId) {
        alert("Error: ID del proyecto no identificado.");
        return;
    }
    if (!title) {
        alert("Indique el título de la adenda contractual.");
        return;
    }
    if (amountUsd <= 0) {
        alert("El monto adicional del contrato debe ser mayor a 0.");
        return;
    }

    try {
        const token = window.authToken || localStorage.getItem('dalor_token') || null;
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const payload = {
            title: title,
            scope_description: scope,
            additional_contract_usd: amountUsd,
            additional_materials_usd: matUsd,
            additional_labor_usd: laborUsd,
            authorized_by: authorizedBy,
            new_phase_name: newPhase
        };

        const res = await authFetch(`${API_BASE}/projects/${pId}/addendums`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.detail || `Error HTTP ${res.status}`);
        }

        const addendumData = await res.json();
        closeModal("modalProjectAddendum");

        if (typeof showToastNotification === 'function') {
            showToastNotification(`✅ Adenda N° ${addendumData.addendum_number} aplicada con éxito (+ $${amountUsd.toLocaleString()} USD) y generada automáticamente en Cuentas por Cobrar (CxC).`, 'success');
        } else {
            alert(`✅ Adenda N° ${addendumData.addendum_number} aplicada con éxito (+ $${amountUsd.toLocaleString()} USD) y generada automáticamente en Cuentas por Cobrar (CxC).`);
        }

        // Recargar proyectos, CxC y vista de detalles si estaba abierta
        if (typeof loadProjectsList === 'function') {
            await loadProjectsList();
        }
        if (typeof loadReceivablesList === 'function') {
            await loadReceivablesList();
        }
        if (window.currentViewingProjectId == pId && typeof viewProjectDetails === 'function') {
            await viewProjectDetails(pId);
        }
    } catch(err) {
        console.error("Error al registrar adenda:", err);
        alert("Error al registrar adenda: " + err.message);
    }
}

// --- PUENTE DE COMPATIBILIDAD CON WINDOW & HTML INLINE ---
if (typeof window !== 'undefined') {
    window.addPlanResource = addPlanResource;
    window.addProjectPhaseRow = addProjectPhaseRow;
    window.addProjectPhaseTask = addProjectPhaseTask;
    window.addProjectPhaseTaskRow = addProjectPhaseTaskRow;
    window.assignPersonnelTag = assignPersonnelTag;
    window.assignToolTag = assignToolTag;
    window.assignVehicleTag = assignVehicleTag;
    window.deleteProject = deleteProject;
    window.deleteReceivable = deleteReceivable;
    window.downloadExcelTemplate = downloadExcelTemplate;
    window.filterProjectsList = filterProjectsList;
    window.handleExcelFileSelected = handleExcelFileSelected;
    window.initProjectPlanningView = initProjectPlanningView;
    window.loadProjectsList = loadProjectsList;
    window.populatePlanDropdownSelectors = populatePlanDropdownSelectors;
    window.recalcProjectBudgetPreview = recalcProjectBudgetPreview;
    window.removePersonnelTag = removePersonnelTag;
    window.removePlanResource = removePlanResource;
    window.removeProjectPhaseRow = removeProjectPhaseRow;
    window.removeToolTag = removeToolTag;
    window.removeVehicleTag = removeVehicleTag;
    window.renderAssignedTags = renderAssignedTags;
    window.renumberPhasesAndTasks = renumberPhasesAndTasks;
    window.setProjectType = setProjectType;
    window.submitCreateProject = submitCreateProject;
    window.switchProjectSubtab = switchProjectSubtab;
    window.toggleProjectTask = toggleProjectTask;
    window.triggerExcelImport = triggerExcelImport;
    window.updatePhaseStatus = updatePhaseStatus;
    window.viewProjectDetails = viewProjectDetails;
    window.shareProjectViaWhatsApp = shareProjectViaWhatsApp;
    window.printProjectProgressReport = printProjectProgressReport;
    window.copyProjectClientTrackingLink = copyProjectClientTrackingLink;
    window.closeAndCulminateProject = closeAndCulminateProject;
    window.openRequestProjectResourcesModal = openRequestProjectResourcesModal;
    window.populateRequestModalDropdowns = populateRequestModalDropdowns;
    window.filterReqDropdown = filterReqDropdown;
    window.addReqResource = addReqResource;
    window.onReqMaterialChanged = onReqMaterialChanged;
    window.removeReqResource = removeReqResource;
    window.renderReqAssignedTags = renderReqAssignedTags;
    window.navigateToDispatchGuide = navigateToDispatchGuide;
    window.navigateToProjectGuides = navigateToProjectGuides;
    window.submitRequestProjectResources = submitRequestProjectResources;
    window.goToProjectPage = goToProjectPage;
    window.changeProjectPageSize = changeProjectPageSize;
    window.renderProjectsWithPagination = renderProjectsWithPagination;
    window.openAddendumModal = openAddendumModal;
    window.submitProjectAddendum = submitProjectAddendum;
    window.navigateToProjectCxC = function(projCode) {
        if (typeof switchView === 'function') switchView('financial');
        setTimeout(() => {
            if (typeof switchFinancialSubtab === 'function') switchFinancialSubtab('cxc');
            const searchInp = document.getElementById('cxcSearchInput');
            if (searchInp) {
                searchInp.value = projCode;
                if (typeof filterCxcList === 'function') filterCxcList(projCode);
            }
        }, 150);
    };
}

export { addPlanResource, addProjectPhaseRow, addProjectPhaseTask, addProjectPhaseTaskRow, assignPersonnelTag, assignToolTag, assignVehicleTag, copyProjectClientTrackingLink, deleteProject, deleteReceivable, downloadExcelTemplate, filterProjectsList, handleExcelFileSelected, initProjectPlanningView, loadProjectsList, populatePlanDropdownSelectors, recalcProjectBudgetPreview, removePersonnelTag, removePlanResource, removeProjectPhaseRow, removeToolTag, removeVehicleTag, renderAssignedTags, renumberPhasesAndTasks, setProjectType, submitCreateProject, switchProjectSubtab, toggleProjectTask, triggerExcelImport, updatePhaseStatus, viewProjectDetails, shareProjectViaWhatsApp, printProjectProgressReport, closeAndCulminateProject, openRequestProjectResourcesModal, populateRequestModalDropdowns, filterReqDropdown, addReqResource, onReqMaterialChanged, removeReqResource, renderReqAssignedTags, navigateToDispatchGuide, navigateToProjectGuides, submitRequestProjectResources, goToProjectPage, changeProjectPageSize, renderProjectsWithPagination, setProjectCxcFilter, openAddendumModal, submitProjectAddendum };
