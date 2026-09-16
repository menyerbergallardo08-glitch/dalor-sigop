/**
 * DALOR SIGO-P | Módulo: PROJECTS.JS
 * Extraído y desacoplado del monolito de producción (v94)
 */

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

// ====================================================================

async function switchProjectSubtab(subtabName) {

    const isList = (subtabName === 'list');

    const subtabList = document.getElementById('subtab-proj-list');

    const subtabForm = document.getElementById('subtab-proj-form');

    const btnList = document.getElementById('tabbtn-proj-list');

    const btnForm = document.getElementById('tabbtn-proj-form');



    if (subtabList) subtabList.classList.toggle('hidden', !isList);

    if (subtabForm) subtabForm.classList.toggle('hidden', isList);



    if (btnList) {

        btnList.className = isList ? 'btn-primary' : 'btn-secondary';

    }

    if (btnForm) {

        btnForm.className = !isList ? 'btn-primary' : 'btn-secondary';

    }



    if (isList) {

        loadProjectsList();

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



function filterProjectsList(query) {

    if (!allProjects || allProjects.length === 0) return;

    const q = (query || '').toLowerCase().trim();

    const container = document.getElementById("projectsCardsContainer");

    if (!container) return;



    const cards = container.querySelectorAll(".project-card");

    let visibleCount = 0;

    cards.forEach(card => {

        const text = (card.innerText || '').toLowerCase();

        if (!q || text.includes(q)) {

            card.style.display = "";

            visibleCount++;

        } else {

            card.style.display = "none";

        }

    });



    const badge = document.getElementById("projects_count_badge");

    if (badge) {

        badge.innerText = q ? `${visibleCount} de ${allProjects.length} obra(s)` : `${allProjects.length} obra(s) registradas`;

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

    const safePersonnel = Array.isArray(allPersonnel) ? allPersonnel : [];

    const safeAssets = Array.isArray(allAssets) ? allAssets : [];



    // 1. Desplegable de Personal (Todos los 15 integrantes DALOR)

    const persSel = document.getElementById("plan_select_personnel") || document.getElementById("plan_pers_select");

    if (persSel) {

        persSel.innerHTML = `<option value="">-- Seleccionar Trabajador (${safePersonnel.length} disponibles) --</option>` + 

            safePersonnel.map(p => `<option value="${p.id}">[${p.code}] ${p.full_name} (${p.role_title})</option>`).join('');

        persSel.onchange = function() {

            if (this.value) addPlanResource('personnel');

        };

    }



    // 2. Desplegable de Vehículos

    const vehSel = document.getElementById("plan_select_fleet") || document.getElementById("plan_veh_select");

    const vehicles = safeAssets.filter(a => a.asset_type === 'vehiculo' || a.asset_type === 'camioneta');

    if (vehSel) {

        vehSel.innerHTML = `<option value="">-- Seleccionar Unidad / Flota (${vehicles.length} disponibles) --</option>` + 

            vehicles.map(v => `<option value="${v.id}">[${v.asset_code}] ${v.name} ${v.license_plate ? `(${v.license_plate})` : ''} - Ubic: ${v.current_location || 'Base'}</option>`).join('');

        vehSel.onchange = function() {

            if (this.value) addPlanResource('fleet');

        };

    }



    // 3. Desplegable de Herramientas & Equipos (Mostrando cantidades y ubicación)

    const toolSel = document.getElementById("plan_select_tools") || document.getElementById("plan_tool_select");

    const tools = safeAssets.filter(a => a.asset_type !== 'vehiculo' && a.asset_type !== 'camioneta');

    if (toolSel) {

        toolSel.innerHTML = `<option value="">-- Seleccionar Herramienta / Equipo Mayor (${tools.length} disp.) --</option>` + 

            tools.map(t => `<option value="${t.id}">[${t.asset_code}] ${t.name} (Cant: 1 disp. | S/N: ${t.serial_number || 'S/N'})</option>`).join('');

        toolSel.onchange = function() {

            if (this.value) addPlanResource('tools');

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

    }

}



function removePlanResource(type, id) {

    if (type === 'personnel') {

        selectedPersonnelIds = selectedPersonnelIds.filter(i => i !== id);

    } else if (type === 'fleet' || type === 'vehicle') {

        selectedVehicleIds = selectedVehicleIds.filter(i => i !== id);

    } else if (type === 'tools' || type === 'tool') {

        selectedToolIds = selectedToolIds.filter(i => i !== id);

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



        // Determinar permisos de rol para visualización financiera

        const savedUserStr = sessionStorage.getItem('dalor_user') || localStorage.getItem('dalor_user');

        const userObj = savedUserStr ? JSON.parse(savedUserStr) : (currentUser || {});

        const uname = (userObj.username || '').toLowerCase();

        const urole = (userObj.role_name || '').toLowerCase();

        const isDirector = uname === 'director' || urole.includes('director') || userObj.is_superuser;

        const isFinanzas = uname === 'administracion' || urole.includes('admin') || urole.includes('finanzas');

        const canSeeFinances = isDirector || isFinanzas;



        container.innerHTML = allProjects.map(p => {

            const spent = p.total_spent_usd || 0;

            const budget = p.budget_limit_usd || 0;

            const contract = p.contract_amount_usd || 0;

            const balance = budget - spent;

            const isOverBudget = spent > budget && budget > 0;

            const burnPct = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;

            const realBurnPct = budget > 0 ? (spent / budget * 100).toFixed(1) : 0;

            

            const marginReal = contract - spent;

            const marginRealPct = contract > 0 ? ((marginReal / contract) * 100).toFixed(1) : 0;



            const phasesCount = p.phases ? p.phases.length : 0;

            const completedPhases = p.phases ? p.phases.filter(ph => ph.status === 'completado').length : 0;

            const inProgPhases = p.phases ? p.phases.filter(ph => ph.status === 'en_progreso').length : 0;



            // Calcular porcentaje de avance físico

            let progressPct = (p.progress_pct !== undefined && p.progress_pct > 0) ? p.progress_pct : 0;

            if (phasesCount > 0 && progressPct === 0) {

                let totalT = 0;

                let doneT = 0;

                (p.phases || []).forEach(ph => {

                    const raw = (ph.description || '').split(';').map(t => t.trim()).filter(Boolean);

                    if (raw.length > 0) {

                        totalT += raw.length;

                        doneT += raw.filter(t => t.startsWith('[x]') || t.startsWith('[X]')).length;

                    } else {

                        totalT += 1;

                        if (ph.status === 'completado') doneT += 1;

                        else if (ph.status === 'en_progreso') doneT += 0.5;

                    }

                });

                progressPct = totalT > 0 ? Math.round((doneT / totalT) * 100) : 0;

            }



            // Semáforo presupuestario

            let burnColor = '#059669'; // verde

            if (realBurnPct >= 80 && realBurnPct <= 100) burnColor = '#f59e0b'; // ámbar

            if (realBurnPct > 100) burnColor = '#e11d48'; // rojo sobrecosto



            return `

            <div class="card" style="border-left: 4px solid var(--dalor-blue); margin-bottom: 0; display: flex; flex-direction: column; justify-content: space-between;">

                <div>

                    <!-- Encabezado de la Obra -->

                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">

                        <div>

                            <span style="font-size: 11px; font-weight: 800; background: var(--dalor-navy); color: white; padding: 2px 8px; border-radius: 4px;">${p.code}</span>

                            <h4 style="font-size: 15px; font-weight: 800; color: var(--dalor-navy); margin-top: 4px; line-height: 1.3;">${p.name}</h4>

                            <p style="font-size: 11px; color: #64748b; margin-top: 2px;">

                                <i class="fa-solid fa-building-user"></i> Cliente: <b>${p.client_name || 'General'}</b> &bull; <i class="fa-solid fa-location-dot"></i> <b>${p.location}</b>

                            </p>

                        </div>

                        <span style="font-size: 10px; background: ${p.status === 'completado' ? '#dcfce7' : '#e0f2fe'}; color: ${p.status === 'completado' ? '#166534' : '#0369a1'}; padding: 3px 10px; border-radius: 9999px; font-weight: 800; text-transform: uppercase;">

                            ${p.status}

                        </span>

                    </div>



                    <!-- 1. BARRA DE AVANCE FÍSICO DE LA OBRA -->

                    <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; margin-bottom: 10px;">

                        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; font-weight: 800; margin-bottom: 6px;">

                            <span style="color: var(--dalor-navy); display: flex; align-items: center; gap: 6px;">

                                <i class="fa-solid fa-bars-progress" style="color: var(--dalor-blue);"></i> Avance Físico de Obra:

                            </span>

                            <span style="color: ${progressPct === 100 ? '#059669' : 'var(--dalor-blue)'}; font-size: 12px;">

                                <b>${progressPct}%</b> (${completedPhases} de ${phasesCount} Etapas Culminadas)

                            </span>

                        </div>

                        <div style="height: 10px; background: #e2e8f0; border-radius: 9999px; overflow: hidden;">

                            <div style="width: ${progressPct}%; height: 100%; background: linear-gradient(90deg, #0284c7 0%, #059669 100%); transition: width 0.4s ease;"></div>

                        </div>

                    </div>



                    <!-- 2. CONTROL FINANCIERO & JOB COSTING (Solo Director y Administración) -->

                    ${canSeeFinances ? `

                    <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; margin-bottom: 10px;">

                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px;">

                            <span style="font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">

                                <i class="fa-solid fa-chart-pie" style="color: var(--dalor-gold);"></i> Job Costing en Tiempo Real

                            </span>

                            <span style="font-size: 10px; font-weight: 800; color: ${isOverBudget ? '#e11d48' : '#059669'};">

                                ${isOverBudget ? '⚠️ Sobrecosto Presupuestario' : '✅ En Presupuesto'}

                            </span>

                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 6px; text-align: center; margin-bottom: 8px;">

                            <div style="background: #f8fafc; padding: 6px 4px; border-radius: 6px; border: 1px solid #f1f5f9;">

                                <span style="font-size: 9px; color: #64748b; text-transform: uppercase; display: block;">Contrato</span>

                                <strong style="font-size: 12px; color: var(--dalor-navy);">$${contract.toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 0})}</strong>

                            </div>

                            <div style="background: #f8fafc; padding: 6px 4px; border-radius: 6px; border: 1px solid #f1f5f9;">

                                <span style="font-size: 9px; color: #64748b; text-transform: uppercase; display: block;">Ppto Techo</span>

                                <strong style="font-size: 12px; color: #0284c7;">$${budget.toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 0})}</strong>

                            </div>

                            <div style="background: #f8fafc; padding: 6px 4px; border-radius: 6px; border: 1px solid #f1f5f9;">

                                <span style="font-size: 9px; color: #64748b; text-transform: uppercase; display: block;">Gasto Real</span>

                                <strong style="font-size: 12px; color: ${isOverBudget ? '#e11d48' : '#d97706'};">$${spent.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong>

                            </div>

                            <div style="background: #f8fafc; padding: 6px 4px; border-radius: 6px; border: 1px solid #f1f5f9;">

                                <span style="font-size: 9px; color: #64748b; text-transform: uppercase; display: block;">Saldo Disponible</span>

                                <strong style="font-size: 12px; color: ${balance >= 0 ? '#059669' : '#e11d48'};">

                                    ${balance >= 0 ? '+' : ''}$${balance.toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 0})}

                                </strong>

                            </div>

                        </div>



                        <!-- Barra de Consumo de Presupuesto -->

                        <div style="font-size: 10px; color: #64748b; margin-top: 4px;">

                            <div style="display: flex; justify-content: space-between; font-weight: 700; margin-bottom: 2px;">

                                <span>Consumo de Presupuesto: <b>${realBurnPct}%</b> ($${spent.toLocaleString()} / $${budget.toLocaleString()})</span>

                                <span style="color: #059669;">Margen Proyectado: <b>${marginRealPct}%</b></span>

                            </div>

                            <div style="height: 6px; background: #e2e8f0; border-radius: 9999px; overflow: hidden;">

                                <div style="width: ${Math.min(100, Math.max(0, realBurnPct))}%; height: 100%; background: ${burnColor};"></div>

                            </div>

                        </div>

                    </div>

                    ` : `

                    <!-- Vista Operativa para Ingeniero Residente (Sin montos en $) -->

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

                    <!-- Barra de Acciones y Botones -->

                    <div style="font-size: 11px; color: #64748b; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #f1f5f9; padding-top: 8px;">

                        <span><i class="fa-solid fa-list-ol"></i> <b>${phasesCount} Etapas</b> &bull; <b>${p.duration_days} días</b></span>

                        <div style="display: flex; gap: 6px;">

                            ${canSeeFinances ? `

                            <button onclick="openCreateCxCForProject(${p.id})" class="btn-primary" style="padding: 4px 10px; font-size: 11px; background: #059669;" title="Facturar Valuación a Cliente">

                                <i class="fa-solid fa-file-invoice-dollar"></i> Facturar (CxC)

                            </button>

                            ` : ''}

                            <button onclick="viewProjectDetails(${p.id})" class="btn-primary" style="padding: 4px 10px; font-size: 11px;">

                                <i class="fa-solid fa-eye"></i> Ficha & Etapas

                            </button>

                            ${isDirector ? `

                            <button onclick="deleteProject(${p.id})" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 13px;" title="Inactivar Proyecto">

                                <i class="fa-solid fa-trash"></i>

                            </button>

                            ` : ''}

                        </div>

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

                            `).join('')}

                        </div>

                    </details>

                </div>

            </div>`;

        }).join('');

    } catch (e) {

        container.innerHTML = `<div style="grid-column: span 2; text-align: center; color: #e11d48;">Error al cargar proyectos.</div>`;

    }

}



async function viewProjectDetails(projectId) {

    try {

        currentViewingProjectId = projectId;

        const res = await fetch(`${API_BASE}/projects/${projectId}/details`);

        const data = await res.json();

        currentViewingProjectId = data.id;



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

            </div>

            <div style="display: flex; flex-direction: column; gap: 8px;">

            `;



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





// --- BLOQUE L14267-L14456 ---
// ==============================================================================

// 🌟 MÓDULOS MAESTROS DALOR: SEGUIMIENTO PÚBLICO, MULTIMONEDA & RETENCIONES SENIAT

// ==============================================================================



// Copiar Enlace de Seguimiento Público de Proyecto para Clientes

// Enlace de Seguimiento Público de Proyecto para Clientes (Portal Ciego a Costos)

window.copyProjectClientTrackingLink = async function(projIdOrCode) {

    let token = null;

    let projId = (typeof projIdOrCode === 'number') ? projIdOrCode : window.currentViewingProjectId;

    

    // Si se pasa un código de proyecto string que no sea número

    if (typeof projIdOrCode === 'string' && isNaN(parseInt(projIdOrCode))) {

        token = projIdOrCode;

    } else if (projIdOrCode && !isNaN(parseInt(projIdOrCode))) {

        projId = parseInt(projIdOrCode);

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

        alert(`🔗 Enlace de Seguimiento para Cliente copiado al portapapeles:



${url}`);

    }

    window.open(url, '_blank');

};



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
}

export { addPlanResource, addProjectPhaseRow, addProjectPhaseTask, addProjectPhaseTaskRow, assignPersonnelTag, assignToolTag, assignVehicleTag, deleteProject, deleteReceivable, downloadExcelTemplate, filterProjectsList, handleExcelFileSelected, initProjectPlanningView, loadProjectsList, populatePlanDropdownSelectors, recalcProjectBudgetPreview, removePersonnelTag, removePlanResource, removeProjectPhaseRow, removeToolTag, removeVehicleTag, renderAssignedTags, renumberPhasesAndTasks, setProjectType, submitCreateProject, switchProjectSubtab, toggleProjectTask, triggerExcelImport, updatePhaseStatus, viewProjectDetails };
