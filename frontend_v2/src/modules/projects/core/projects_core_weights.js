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

var currentPhaseWeightsTasksData = [];

export async function openConfigurePhaseWeightsModal(projectId, phaseId, phaseName, currentWeight) {
    const pIdInput = document.getElementById("cfg_weights_project_id");
    const phIdInput = document.getElementById("cfg_weights_phase_id");
    const phNameEl = document.getElementById("cfg_weights_phase_name");
    const phPctInput = document.getElementById("cfg_weights_phase_percent");
    if (!pIdInput || !phIdInput) return;

    pIdInput.value = projectId;
    phIdInput.value = phaseId;
    if (phNameEl) phNameEl.innerText = `Etapa: ${phaseName}`;
    if (phPctInput) phPctInput.value = currentWeight || 0;

    try {
        const res = await authFetch(`${API_BASE}/projects/${projectId}/details`);
        if (!res.ok) throw new Error("No se pudo obtener información del proyecto.");
        const proj = await res.json();
        const phase = (proj.phases || []).find(p => p.id === phaseId);
        if (!phase) throw new Error("Etapa no encontrada en el proyecto.");

        const otherPhases = (proj.phases || []).filter(p => p.id !== phaseId);
        const otherSum = otherPhases.reduce((acc, p) => acc + (parseFloat(p.weight_percent) || 0), 0);
        const maxAvailable = Math.max(0, 100 - otherSum);
        const hintEl = document.getElementById("cfg_weights_phase_context_hint");
        if (hintEl) {
            hintEl.innerText = `Las demás etapas suman ${otherSum.toFixed(1)}%. El peso máximo disponible para esta etapa es ${maxAvailable.toFixed(1)}% (Total <= 100%).`;
        }

        let rawTasks = (phase.description || "").split(";").map(t => t.trim()).filter(Boolean);
        if (rawTasks.length === 0 && (phase.description || "").trim().length > 0) {
            rawTasks = (phase.description || "").split("\n").map(t => t.trim()).filter(Boolean);
        }

        const tasksListEl = document.getElementById("cfg_weights_tasks_list");
        currentPhaseWeightsTasksData = [];

        if (!tasksListEl) return;

        if (rawTasks.length === 0) {
            tasksListEl.innerHTML = `<p style="font-size: 11px; color: #94a3b8; font-style: italic; margin: 4px 0;">Esta etapa no tiene tareas registradas aún.</p>`;
        } else {
            tasksListEl.innerHTML = rawTasks.map((t, idx) => {
                let cleanName = t;
                for (const pref of ["[x]", "[X]", "[ ]", "✅", "⏳"]) {
                    if (cleanName.startsWith(pref)) cleanName = cleanName.substring(pref.length).trim();
                }
                cleanName = cleanName.replace(/\[\s*([0-9]+(?:\.[0-9]+)?)\s*%\s*\]/, '').trim();

                let taskWeight = "";
                const wMatch = cleanName.match(/\[W:\s*([0-9]+(?:\.[0-9]+)?)\s*%?\]/i);
                if (wMatch) {
                    taskWeight = wMatch[1];
                    cleanName = cleanName.replace(/\[W:\s*([0-9]+(?:\.[0-9]+)?)\s*%?\]/i, '').trim();
                }

                let taskHours = "";
                const hMatch = cleanName.match(/\[(?:H|HH|WORK):\s*([0-9]+(?:\.[0-9]+)?)\s*(?:h|hrs|hh)?\]/i);
                if (hMatch) {
                    taskHours = hMatch[1];
                    cleanName = cleanName.replace(/\[(?:H|HH|WORK):\s*([0-9]+(?:\.[0-9]+)?)\s*(?:h|hrs|hh)?\]/i, '').trim();
                }

                currentPhaseWeightsTasksData.push({ idx, name: cleanName });

                return `
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 10px;">
                    <div style="display: flex; align-items: center; gap: 6px; flex: 1;">
                        <span style="font-size: 10px; font-weight: 800; background: #e2e8f0; color: #334155; padding: 2px 6px; border-radius: 4px;">#${idx + 1}</span>
                        <span style="font-size: 11.5px; font-weight: 600; color: #1e293b;">${cleanName}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <div style="display: flex; align-items: center; gap: 3px;">
                            <span style="font-size: 10px; font-weight: 700; color: #059669;" title="Horas de trabajo estimadas (Work / HH)">HH:</span>
                            <input type="text" inputmode="decimal" class="form-input cfg-modal-task-hours" data-idx="${idx}" value="${taskHours}" placeholder="Horas" style="width: 50px; font-size: 11px; text-align: center; font-weight: bold; color: #059669; padding: 3px 4px; border: 1px solid #cbd5e1; background: white; border-radius: 4px;">
                        </div>
                        <div style="display: flex; align-items: center; gap: 3px;">
                            <span style="font-size: 10px; font-weight: 700; color: #475569;">Peso:</span>
                            <input type="text" inputmode="decimal" class="form-input cfg-modal-task-weight" data-idx="${idx}" value="${taskWeight}" placeholder="Auto" oninput="updateModalTaskWeightsSumIndicator()" style="width: 50px; font-size: 11px; text-align: center; font-weight: bold; color: #0284c7; padding: 3px 4px; border: 1px solid #94a3b8; background: white; border-radius: 4px;">
                            <span style="font-size: 11px; font-weight: 700; color: #64748b;">%</span>
                        </div>
                    </div>
                </div>`;
            }).join('');
        }

        updateModalTaskWeightsSumIndicator();
        if (typeof openModal === 'function') {
            openModal("modalConfigurePhaseWeights");
        } else {
            document.getElementById("modalConfigurePhaseWeights")?.classList.remove("hidden");
        }
    } catch (e) {
        console.error("Error al abrir modal de ponderación:", e);
        alert("Error: " + (e.message || e));
    }
}

export function updateModalTaskWeightsSumIndicator() {
    const badge = document.getElementById("cfg_weights_tasks_sum_badge");
    if (!badge) return;

    const inps = document.querySelectorAll(".cfg-modal-task-weight");
    let sum = 0;
    let anyExplicit = false;

    inps.forEach(inp => {
        const v = typeof parseLocalizedNumber === 'function' ? parseLocalizedNumber(inp.value) : parseFloat(inp.value);
        if (!isNaN(v) && v > 0) {
            sum += v;
            anyExplicit = true;
        }
    });

    if (!anyExplicit || inps.length === 0) {
        badge.innerHTML = `Total: 0% (Equiponderadas)`;
        badge.style.background = '#e2e8f0';
        badge.style.color = '#334155';
        badge.style.border = 'none';
    } else if (Math.abs(sum - 100) <= 0.05) {
        badge.innerHTML = `✅ Total: 100% (Balanceado)`;
        badge.style.background = '#dcfce7';
        badge.style.color = '#166534';
        badge.style.border = '1px solid #86efac';
    } else if (sum > 100.05) {
        badge.innerHTML = `❌ Total: ${sum.toFixed(1)}% (Supera 100%)`;
        badge.style.background = '#fee2e2';
        badge.style.color = '#b91c1c';
        badge.style.border = '1px solid #fca5a5';
    } else {
        const remaining = (100 - sum).toFixed(1);
        badge.innerHTML = `⚠️ Total: ${sum.toFixed(1)}% (Falta ${remaining}%)`;
        badge.style.background = '#fef3c7';
        badge.style.color = '#92400e';
        badge.style.border = '1px solid #fcd34d';
    }
}

export function distributeModalTaskWeightsEqually() {
    const inps = document.querySelectorAll(".cfg-modal-task-weight");
    const n = inps.length;
    if (n === 0) return;

    const baseWeight = Math.floor((100 / n) * 100) / 100;
    let remainder = Math.round((100 - (baseWeight * n)) * 100) / 100;

    inps.forEach((inp, idx) => {
        let w = baseWeight;
        if (idx === 0) {
            w = Math.round((baseWeight + remainder) * 100) / 100;
        }
        inp.value = w;
    });

    updateModalTaskWeightsSumIndicator();
}

export function distributeModalTaskWeightsByHours() {
    const hourInps = document.querySelectorAll(".cfg-modal-task-hours");
    const weightInps = document.querySelectorAll(".cfg-modal-task-weight");
    let totalHours = 0;
    hourInps.forEach(inp => {
        const h = typeof parseLocalizedNumber === 'function' ? parseLocalizedNumber(inp.value) : parseFloat(inp.value);
        if (!isNaN(h) && h > 0) totalHours += h;
    });
    if (totalHours <= 0) {
        alert("Por favor ingrese las horas estimadas (HH) en las tareas para calcular su ponderación automática.");
        return;
    }
    let runningSum = 0;
    hourInps.forEach((inp, idx) => {
        const h = typeof parseLocalizedNumber === 'function' ? parseLocalizedNumber(inp.value) : parseFloat(inp.value);
        const wInp = weightInps[idx];
        if (wInp) {
            let pct = parseFloat(((h / totalHours) * 100).toFixed(1));
            wInp.value = pct;
            runningSum += pct;
        }
    });
    if (weightInps.length > 0 && Math.abs(100 - runningSum) > 0.01 && Math.abs(100 - runningSum) < 0.5) {
        const lastInp = weightInps[weightInps.length - 1];
        lastInp.value = parseFloat((parseFloat(lastInp.value) + (100 - runningSum)).toFixed(1));
    }
    updateModalTaskWeightsSumIndicator();
}

export async function submitConfigurePhaseWeights(event) {
    if (event && event.preventDefault) event.preventDefault();

    const projectId = parseInt(document.getElementById("cfg_weights_project_id")?.value);
    const phaseId = parseInt(document.getElementById("cfg_weights_phase_id")?.value);
    const phaseWeightRaw = document.getElementById("cfg_weights_phase_percent")?.value;
    const phaseWeight = typeof parseLocalizedNumber === 'function' ? parseLocalizedNumber(phaseWeightRaw) : parseFloat(phaseWeightRaw);

    const taskInps = document.querySelectorAll(".cfg-modal-task-weight");
    let taskWeights = [];
    let taskSum = 0;
    let anyTaskWeight = false;

    taskInps.forEach(inp => {
        const v = typeof parseLocalizedNumber === 'function' ? parseLocalizedNumber(inp.value) : parseFloat(inp.value);
        const val = (!isNaN(v) && v > 0) ? v : 0.0;
        taskWeights.push(val);
        taskSum += val;
        if (val > 0) anyTaskWeight = true;
    });

    const hourInps = document.querySelectorAll(".cfg-modal-task-hours");
    let taskHours = [];
    let anyTaskHours = false;
    hourInps.forEach(inp => {
        const v = typeof parseLocalizedNumber === 'function' ? parseLocalizedNumber(inp.value) : parseFloat(inp.value);
        const val = (!isNaN(v) && v > 0) ? v : 0.0;
        taskHours.push(val);
        if (val > 0) anyTaskHours = true;
    });

    if (taskSum > 100.05) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'error',
                title: 'Ponderación de Tareas Inválida',
                text: `La suma de pesos de las tareas es ${taskSum.toFixed(1)}%, no puede superar el 100% de la etapa.`
            });
        } else {
            alert(`⚠️ Error: La suma de pesos de las tareas es ${taskSum.toFixed(1)}%, no puede superar el 100%.`);
        }
        return;
    }

    const payload = {
        weight_percent: !isNaN(phaseWeight) ? phaseWeight : 0.0,
        tasks_weights: anyTaskWeight ? taskWeights : null,
        tasks_hours: anyTaskHours ? taskHours : null
    };

    const btn = document.getElementById("btn_save_phase_weights");
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Guardando...`;
    }

    try {
        const res = await authFetch(`${API_BASE}/projects/${projectId}/phases/${phaseId}/weights`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || "Error al actualizar ponderaciones.");
        }

        const data = await res.json();
        if (typeof showToastNotification === 'function') {
            showToastNotification(data.message || "✅ Ponderaciones actualizadas correctamente.", "success");
        } else {
            alert(data.message || "✅ Ponderaciones actualizadas.");
        }

        if (typeof closeModal === 'function') {
            closeModal("modalConfigurePhaseWeights");
        } else {
            document.getElementById("modalConfigurePhaseWeights")?.classList.add("hidden");
        }

        await viewProjectDetails(projectId);
        if (typeof loadProjectsList === 'function') await loadProjectsList();
    } catch (e) {
        console.error("Error al guardar ponderaciones:", e);
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'error',
                title: 'No se pudo guardar la ponderación',
                text: e.message || String(e)
            });
        } else {
            alert("Error: " + (e.message || e));
        }
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Guardar Ponderaciones`;
        }
    }
}
