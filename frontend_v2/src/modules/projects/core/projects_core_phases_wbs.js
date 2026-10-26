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


export function updatePhaseWeightsSumIndicator() {
    const badge = document.getElementById("project_phases_weight_total_badge");
    const hint = document.getElementById("project_phases_weight_hint");
    if (!badge) return;

    const weightInputs = document.querySelectorAll("#projectPhasesContainer .ph-weight");
    let sum = 0;
    let anyExplicit = false;

    weightInputs.forEach(inp => {
        const v = typeof parseLocalizedNumber === 'function' ? parseLocalizedNumber(inp.value) : parseFloat(inp.value);
        if (!isNaN(v) && v > 0) {
            sum += v;
            anyExplicit = true;
        }
    });

    if (!anyExplicit || weightInputs.length === 0) {
        badge.innerHTML = `Total Etapas: 0% (Equiponderación Automática)`;
        badge.style.background = '#e2e8f0';
        badge.style.color = '#334155';
        badge.style.border = 'none';
        if (hint) {
            hint.innerText = "Equiponderación activa o balancea los pesos manualmente.";
            hint.style.color = '#64748b';
            hint.style.fontWeight = '600';
        }
    } else if (Math.abs(sum - 100) <= 0.05) {
        badge.innerHTML = `✅ Total Etapas: 100% (Balanceado)`;
        badge.style.background = '#dcfce7';
        badge.style.color = '#166534';
        badge.style.border = '1px solid #86efac';
        if (hint) {
            hint.innerText = "Ponderación perfecta: El 100% de la obra está distribuido.";
            hint.style.color = '#166534';
            hint.style.fontWeight = '700';
        }
    } else if (sum > 100.05) {
        badge.innerHTML = `❌ Total Etapas: ${sum.toFixed(1)}% (¡Supera el 100%!)`;
        badge.style.background = '#fee2e2';
        badge.style.color = '#b91c1c';
        badge.style.border = '1px solid #fca5a5';
        if (hint) {
            hint.innerText = "⚠️ La suma no puede exceder el 100%. Por favor ajusta los valores o pulsa 'Repartir 100% Equitativo'.";
            hint.style.color = '#b91c1c';
            hint.style.fontWeight = '800';
        }
    } else {
        const remaining = (100 - sum).toFixed(1);
        badge.innerHTML = `⚠️ Total Etapas: ${sum.toFixed(1)}% (Falta ${remaining}%)`;
        badge.style.background = '#fef3c7';
        badge.style.color = '#92400e';
        badge.style.border = '1px solid #fcd34d';
        if (hint) {
            hint.innerText = `Falta un ${remaining}% para completar el 100% del proyecto.`;
            hint.style.color = '#92400e';
            hint.style.fontWeight = '700';
        }
    }
}

export function distributePhaseWeightsEqually() {
    const weightInputs = document.querySelectorAll("#projectPhasesContainer .ph-weight");
    const n = weightInputs.length;
    if (n === 0) return;

    const baseWeight = Math.floor((100 / n) * 100) / 100;
    let remainder = Math.round((100 - (baseWeight * n)) * 100) / 100;

    weightInputs.forEach((inp, idx) => {
        let w = baseWeight;
        if (idx === 0) {
            w = Math.round((baseWeight + remainder) * 100) / 100;
        }
        inp.value = w;
    });

    updatePhaseWeightsSumIndicator();
}

export function updateTaskWeightsSumIndicator(phaseCardId) {
    if (!phaseCardId) return;
    const card = document.getElementById(phaseCardId);
    if (!card) return;

    const badge = card.querySelector('.phase-tasks-weight-badge');
    if (!badge) return;

    const allRows = Array.from(card.querySelectorAll('.phase-task-row'));
    if (allRows.length === 0) {
        badge.innerHTML = `Suma Tareas: 0%`;
        badge.style.background = '#e2e8f0';
        badge.style.color = '#475569';
        badge.style.border = 'none';
        return;
    }

    const topRows = allRows.filter(r => parseInt(r.dataset.level || '1', 10) === 1);
    const targetRows = topRows.length > 0 ? topRows : allRows;

    let sum = 0;
    let anyExplicit = false;

    targetRows.forEach(r => {
        const inp = r.querySelector('.ph-task-weight');
        const v = inp ? (typeof parseLocalizedNumber === 'function' ? parseLocalizedNumber(inp.value) : parseFloat(inp.value)) : 0;
        if (!isNaN(v) && v > 0) {
            sum += v;
            anyExplicit = true;
        }
    });

    if (!anyExplicit) {
        badge.innerHTML = `Suma Tareas: 0% <span style="font-size: 9px; opacity: 0.8;">(Equiponderadas)</span>`;
        badge.style.background = '#e2e8f0';
        badge.style.color = '#475569';
        badge.style.border = 'none';
    } else if (Math.abs(sum - 100) <= 0.05) {
        badge.innerHTML = `✅ Tareas: 100% (Balanceado)`;
        badge.style.background = '#dcfce7';
        badge.style.color = '#166534';
        badge.style.border = '1px solid #86efac';
    } else if (sum > 100.05) {
        badge.innerHTML = `❌ Tareas: ${sum.toFixed(1)}% (Supera 100%)`;
        badge.style.background = '#fee2e2';
        badge.style.color = '#b91c1c';
        badge.style.border = '1px solid #fca5a5';
    } else {
        const remaining = (100 - sum).toFixed(1);
        badge.innerHTML = `⚠️ Tareas: ${sum.toFixed(1)}% (Falta ${remaining}%)`;
        badge.style.background = '#fef3c7';
        badge.style.color = '#92400e';
        badge.style.border = '1px solid #fcd34d';
    }
}

export function distributeTaskWeightsEqually(phaseCardId) {
    if (!phaseCardId) return;
    const card = document.getElementById(phaseCardId);
    if (!card) return;

    const allRows = Array.from(card.querySelectorAll('.phase-task-row'));
    if (allRows.length === 0) return;

    const topRows = allRows.filter(r => parseInt(r.dataset.level || '1', 10) === 1);
    const targetRows = topRows.length > 0 ? topRows : allRows;

    const baseWeight = Math.floor((100 / targetRows.length) * 100) / 100;
    let remainder = Math.round((100 - (baseWeight * targetRows.length)) * 100) / 100;

    targetRows.forEach((r, idx) => {
        const inp = r.querySelector('.ph-task-weight');
        if (inp) {
            let w = baseWeight;
            if (idx === targetRows.length - 1) {
                w = Math.round((baseWeight + remainder) * 100) / 100;
            }
            inp.value = w;
        }
    });

    let currentChildren = [];
    allRows.forEach(r => {
        const lvl = parseInt(r.dataset.level || '1', 10);
        if (lvl === 1) {
            if (currentChildren.length > 0) {
                distributeSubGroup(currentChildren);
                currentChildren = [];
            }
        } else {
            currentChildren.push(r);
        }
    });
    if (currentChildren.length > 0) distributeSubGroup(currentChildren);

    function distributeSubGroup(subRows) {
        if (!subRows.length) return;
        const b = Math.floor((100 / subRows.length) * 100) / 100;
        let rem = Math.round((100 - (b * subRows.length)) * 100) / 100;
        subRows.forEach((sr, idx) => {
            const inp = sr.querySelector('.ph-task-weight');
            if (inp) {
                let w = b;
                if (idx === subRows.length - 1) w = Math.round((w + rem) * 100) / 100;
                inp.value = w;
            }
        });
    }

    updateTaskWeightsSumIndicator(phaseCardId);
}

export function distributeSubGroup(subRows) {
        if (!subRows.length) return;
        const b = Math.floor((100 / subRows.length) * 100) / 100;
        let rem = Math.round((100 - (b * subRows.length)) * 100) / 100;
        subRows.forEach((sr, idx) => {
            const inp = sr.querySelector('.ph-task-weight');
            if (inp) {
                let w = b;
                if (idx === subRows.length - 1) w = Math.round((w + rem) * 100) / 100;
                inp.value = w;
            }
        });
    }

export function distributeTaskWeightsByHours(phaseCardId) {
    if (!phaseCardId) return;
    const card = document.getElementById(phaseCardId);
    if (!card) return;

    const allRows = Array.from(card.querySelectorAll('.phase-task-row'));
    if (allRows.length === 0) return;

    const topRows = allRows.filter(r => parseInt(r.dataset.level || '1', 10) === 1);
    const targetRows = topRows.length > 0 ? topRows : allRows;

    let totalHours = 0;
    const rowHours = [];

    targetRows.forEach(row => {
        const hInp = row.querySelector('.ph-task-hours');
        const h = hInp ? (typeof parseLocalizedNumber === 'function' ? parseLocalizedNumber(hInp.value) : parseFloat(hInp.value)) || 0 : 0;
        rowHours.push(h);
        totalHours += h;
    });

    if (totalHours <= 0) {
        alert("Por favor ingresa las horas estimadas (HH) en las tareas para ponderar automáticamente según el esfuerzo.");
        return;
    }

    let allocated = 0;
    targetRows.forEach((row, idx) => {
        const h = rowHours[idx];
        const wInp = row.querySelector('.ph-task-weight');
        if (wInp) {
            let pct = (idx === targetRows.length - 1) ? Math.round((100 - allocated) * 100) / 100 : Math.round((h / totalHours * 100) * 100) / 100;
            allocated += pct;
            wInp.value = Math.max(0, pct);
        }
    });

    updateTaskWeightsSumIndicator(phaseCardId);
}

export function calcWeightsFromHours(phaseCardId) {
    updateTaskWeightsSumIndicator(phaseCardId);
}

export function indentCreationTaskRow(btn, direction) {
    const row = btn.closest('.phase-task-row');
    if (!row) return;
    const currentLvl = parseInt(row.dataset.level || '1', 10);
    const newLvl = direction === 'indent' ? Math.min(3, currentLvl + 1) : Math.max(1, currentLvl - 1);
    row.dataset.level = String(newLvl);
    const indentPx = (newLvl - 1) * 20;
    row.style.marginLeft = `${indentPx}px`;
    row.style.paddingLeft = newLvl > 1 ? '6px' : '0px';
    row.style.borderLeft = newLvl > 1 ? (newLvl === 2 ? '3px solid #0284c7' : '3px solid #9333ea') : 'none';
    renumberPhasesAndTasks();
}

export function addProjectPhaseRow(defName = "", defTasks = [], defDays = 7, defCost = 0, defUnit = "dias", defWeight = 0) {

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
        <div style="display: grid; grid-template-columns: 2.2fr 1.3fr 1fr 1fr; gap: 8px;">
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
                    Presupuesto ($)
                </label>
                <input type="text" inputmode="decimal" class="form-input ph-cost" placeholder="Ppto ($)" value="${defCost}" style="font-size: 12px; font-weight: 800; color: var(--dalor-blue);">
            </div>
            <div>
                <label style="display: block; font-size: 10px; font-weight: 800; color: #475569; text-transform: uppercase; margin-bottom: 3px;">
                    Peso / Ponderación (%)
                </label>
                <input type="text" inputmode="decimal" class="form-input ph-weight" oninput="updatePhaseWeightsSumIndicator()" placeholder="0 - 100%" value="${defWeight || 0}" style="font-size: 12px; font-weight: 800; color: #059669;" title="Porcentaje de aporte de esta etapa al proyecto total (0 a 100%)">
            </div>
        </div>

        <!-- Sub-campo de Tareas / Actividades Asignadas a esta Fase -->
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; flex-wrap: wrap; gap: 6px;">
                <div style="display: flex; align-items: center; gap: 6px;">
                    <label style="font-size: 11px; font-weight: 800; color: var(--dalor-navy); display: flex; align-items: center; gap: 6px; margin: 0;">
                        <i class="fa-solid fa-list-check" style="color: var(--dalor-blue);"></i> Tareas Operativas de esta Etapa:
                    </label>
                    <span class="phase-tasks-weight-badge" style="font-size: 10.5px; font-weight: 800; padding: 2px 7px; border-radius: 4px; background: #e2e8f0; color: #475569;">
                        Suma Tareas: 0%
                    </span>
                </div>
                <div style="display: flex; gap: 4px; align-items: center; flex-wrap: wrap;">
                    <button type="button" onclick="distributeTaskWeightsByHours('${phaseId}')" class="btn-secondary" style="font-size: 10px; padding: 2px 7px; background: #e0f2fe; color: #0369a1; border-color: #bae6fd; font-weight: 700;" title="Ponderar proporcionalmente según las Horas de Trabajo (Work / HH)">
                        ⏱️ Por Horas (HH)
                    </button>
                    <button type="button" onclick="distributeTaskWeightsEqually('${phaseId}')" class="btn-secondary" style="font-size: 10px; padding: 2px 7px; background: #f0fdf4; color: #166534; border-color: #86efac; font-weight: 700;" title="Repartir 100% de la etapa equitativamente entre las tareas">
                        ⚖️ Repartir 100%
                    </button>
                    <button type="button" onclick="addProjectPhaseTask('${phaseId}')" class="btn-primary" style="font-size: 10px; padding: 3px 8px; background: #0284c7;">
                        <i class="fa-solid fa-plus"></i> Añadir Tarea
                    </button>
                </div>
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
    updatePhaseWeightsSumIndicator();
    updateTaskWeightsSumIndicator(phaseId);
}

export function addProjectPhaseTask(phaseCardId) {
    const card = document.getElementById(phaseCardId);
    if (!card) return;

    const tasksContainer = card.querySelector('.phase-tasks-container');
    addProjectPhaseTaskRow(tasksContainer, "");
    renumberPhasesAndTasks();
    updateTaskWeightsSumIndicator(phaseCardId);
}

export function addProjectPhaseTaskRow(container, textValue = "", weightValue = "") {
    let cleanText = textValue;
    let taskWeight = weightValue;
    let taskLevel = 1;
    let taskHours = "";

    const lvlMatch = cleanText.match(/\[(?:L|LVL|INDENT):\s*([1-9])\s*\]/i);
    if (lvlMatch) {
        taskLevel = parseInt(lvlMatch[1], 10);
        cleanText = cleanText.replace(/\[(?:L|LVL|INDENT):\s*([1-9])\s*\]/i, '').trim();
    }
    const hMatch = cleanText.match(/\[(?:H|HH|WORK):\s*([0-9]+(?:\.[0-9]+)?)\s*(?:h|hrs|hh)?\]/i);
    if (hMatch) {
        taskHours = hMatch[1];
        cleanText = cleanText.replace(/\[(?:H|HH|WORK):\s*([0-9]+(?:\.[0-9]+)?)\s*(?:h|hrs|hh)?\]/i, '').trim();
    }
    const wMatch = cleanText.match(/\[W:\s*([0-9]+(?:\.[0-9]+)?)\s*%?\]/i);
    if (wMatch) {
        if (!taskWeight) taskWeight = wMatch[1];
        cleanText = cleanText.replace(/\[W:\s*([0-9]+(?:\.[0-9]+)?)\s*%?\]/i, '').trim();
    }
    for (const pref of ["[x]", "[X]", "[ ]", "✅", "⏳"]) {
        if (cleanText.startsWith(pref)) cleanText = cleanText.substring(pref.length).trim();
    }

    const card = container.closest('.project-phase-card');
    const phaseCardId = card ? card.id : '';

    const taskRow = document.createElement("div");
    taskRow.className = "phase-task-row";
    taskRow.dataset.level = String(taskLevel);
    const indentPx = (taskLevel - 1) * 20;
    taskRow.style.cssText = `display: flex; align-items: center; gap: 6px; margin-left: ${indentPx}px; padding-left: ${taskLevel > 1 ? '6px' : '0px'}; border-left: ${taskLevel > 1 ? (taskLevel === 2 ? '3px solid #0284c7' : '3px solid #9333ea') : 'none'};`;

    taskRow.innerHTML = `
        <!-- Botones de Sangría WBS (Nivel 1, 2, 3) -->
        <div style="display: inline-flex; gap: 2px;">
            <button type="button" class="btn-task-outdent" onclick="indentCreationTaskRow(this, 'outdent')" style="background: none; border: 1px solid #cbd5e1; border-radius: 3px; font-size: 10px; padding: 2px 4px; color: ${taskLevel > 1 ? '#0284c7' : '#cbd5e1'}; cursor: ${taskLevel > 1 ? 'pointer' : 'default'};" title="⬅️ Subir nivel WBS" ${taskLevel <= 1 ? 'disabled' : ''}>◀</button>
            <button type="button" class="btn-task-indent" onclick="indentCreationTaskRow(this, 'indent')" style="background: none; border: 1px solid #cbd5e1; border-radius: 3px; font-size: 10px; padding: 2px 4px; color: ${taskLevel < 3 ? '#0284c7' : '#cbd5e1'}; cursor: ${taskLevel < 3 ? 'pointer' : 'default'};" title="➡️ Sangrar como Sub-tarea (Nivel WBS 2 o 3)" ${taskLevel >= 3 ? 'disabled' : ''}>▶</button>
        </div>
        <span class="task-number-badge" style="font-size: 10px; font-weight: 800; background: ${taskLevel > 1 ? '#e0f2fe' : '#e2e8f0'}; color: ${taskLevel > 1 ? '#0369a1' : '#334155'}; padding: 4px 6px; border-radius: 4px; min-width: 38px; text-align: center; font-family: monospace;">
            -
        </span>
        <input type="text" class="form-input ph-task-input" placeholder="Escribe la tarea puntual (ej: Corte con oxicorte, Pases de planta...)" value="${cleanText.replaceAll('"', '&quot;')}" style="font-size: 11px; flex: 1; font-weight: ${taskLevel === 1 ? '600' : 'normal'};" required>
        <div style="display: flex; align-items: center; gap: 2px; background: #f0fdf4; padding: 2px 5px; border-radius: 4px; border: 1px solid #bbf7d0;" title="Horas Hombre estimadas de trabajo (Work / HH)">
            <span style="font-size: 9.5px; font-weight: 700; color: #166534;"><i class="fa-regular fa-clock"></i> HH:</span>
            <input type="text" inputmode="decimal" class="form-input ph-task-hours" placeholder="HH" value="${taskHours || ''}" oninput="calcWeightsFromHours('${phaseCardId}')" style="width: 44px; font-size: 11px; text-align: center; font-weight: bold; color: #166534; padding: 2px 4px; border: 1px solid #86efac; background: white; border-radius: 4px;">
        </div>
        <div style="display: flex; align-items: center; gap: 3px; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; border: 1px solid #cbd5e1;" title="Ponderación de la tarea dentro de esta etapa (deben sumar 100%)">
            <span style="font-size: 9.5px; font-weight: 700; color: #475569; white-space: nowrap;">Peso:</span>
            <input type="text" inputmode="decimal" class="form-input ph-task-weight" placeholder="Auto" value="${taskWeight || ''}" oninput="updateTaskWeightsSumIndicator('${phaseCardId}')" style="width: 48px; font-size: 11px; text-align: center; font-weight: bold; color: #0284c7; padding: 2px 4px; border: 1px solid #94a3b8; background: white; border-radius: 4px;">
            <span style="font-weight: 800; font-size: 10px; color: #64748b;">%</span>
        </div>
        <button type="button" onclick="const pId='${phaseCardId}'; this.closest('.phase-task-row').remove(); renumberPhasesAndTasks(); updateTaskWeightsSumIndicator(pId);" style="background: none; border: none; color: #ef4444; font-size: 16px; cursor: pointer; padding: 0 4px;" title="Eliminar Tarea">&times;</button>
    `;

    container.appendChild(taskRow);
    if (phaseCardId) updateTaskWeightsSumIndicator(phaseCardId);
}

export function removeProjectPhaseRow(phaseId) {
    const el = document.getElementById(phaseId);
    if (el) el.remove();
    renumberPhasesAndTasks();
    updatePhaseWeightsSumIndicator();
}

export function renumberPhasesAndTasks() {
    const phaseCards = document.querySelectorAll("#projectPhasesContainer .project-phase-card");
    phaseCards.forEach((card, pIdx) => {
        const badge = card.querySelector('.phase-number-badge');
        if (badge) badge.innerText = `Etapa ${pIdx + 1}`;

        const taskRows = card.querySelectorAll('.phase-task-row');
        let l1 = 0, l2 = 0, l3 = 0;
        taskRows.forEach((tRow) => {
            const lvl = parseInt(tRow.dataset.level || '1', 10);
            let numStr = '';
            if (lvl === 1) {
                l1++;
                l2 = 0;
                l3 = 0;
                numStr = `${pIdx + 1}.${l1}`;
            } else if (lvl === 2) {
                l2++;
                l3 = 0;
                numStr = `${pIdx + 1}.${l1}.${l2}`;
            } else {
                l3++;
                numStr = `${pIdx + 1}.${l1}.${l2}.${l3}`;
            }
            const tBadge = tRow.querySelector('.task-number-badge');
            if (tBadge) tBadge.innerText = numStr;

            const outdentBtn = tRow.querySelector('.btn-task-outdent');
            const indentBtn = tRow.querySelector('.btn-task-indent');
            if (outdentBtn) {
                outdentBtn.style.color = lvl > 1 ? '#0284c7' : '#cbd5e1';
                outdentBtn.disabled = lvl <= 1;
            }
            if (indentBtn) {
                indentBtn.style.color = lvl < 3 ? '#0284c7' : '#cbd5e1';
                indentBtn.disabled = lvl >= 3;
            }
        });
    });
}
