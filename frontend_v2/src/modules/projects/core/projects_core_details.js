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

var currentViewingProjectId = null;

export async function viewProjectDetails(projectId) {

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



        // Cálculo de Avance Físico Global Ponderado basado en Tareas y Etapas
        let totalAllTasks = 0;
        let completedAllTasks = 0;
        let phaseProgressList = [];
        let explicitPhaseWeightsSum = 0;

        if (data.phases && data.phases.length > 0) {
            data.phases.forEach(ph => {
                const phWeight = parseFloat(ph.weight_percent || 0);
                if (phWeight > 0) explicitPhaseWeightsSum += phWeight;

                let rawTasks = (ph.description || "").split(";").map(t => t.trim()).filter(Boolean);
                if (rawTasks.length === 0 && (ph.description || "").trim().length > 0) {
                    rawTasks = (ph.description || "").split("\n").map(t => t.trim()).filter(Boolean);
                }

                let phaseProg = 0;
                if (ph.status === 'completado') {
                    phaseProg = 100;
                    totalAllTasks += Math.max(1, rawTasks.length);
                    completedAllTasks += Math.max(1, rawTasks.length);
                } else if (rawTasks.length > 0) {
                    let parsedTasks = rawTasks.map(t => {
                        let prog = 0;
                        const pMatch = t.match(/\[\s*([0-9]+(?:\.[0-9]+)?)\s*%\s*\]/);
                        if (pMatch) prog = parseFloat(pMatch[1]);
                        else if (t.startsWith("[x]") || t.startsWith("[X]") || t.includes("✅")) prog = 100;
                        
                        let w = null;
                        const wMatch = t.match(/\[W:\s*([0-9]+(?:\.[0-9]+)?)\s*%?\]/i);
                        if (wMatch) w = parseFloat(wMatch[1]);

                        let h = null;
                        const hMatch = t.match(/\[(?:H|HH|WORK):\s*([0-9]+(?:\.[0-9]+)?)\s*(?:h|hrs|hh)?\]/i);
                        if (hMatch) h = parseFloat(hMatch[1]);

                        return { prog: Math.max(0, Math.min(100, prog)), weight: w, hours: h, isDone: prog >= 100 };
                    });

                    totalAllTasks += parsedTasks.length;
                    completedAllTasks += parsedTasks.filter(t => t.isDone).length;

                    const explicitTaskWeightsSum = parsedTasks.reduce((acc, t) => acc + (t.weight || 0), 0);
                    const totalHoursSum = parsedTasks.reduce((acc, t) => acc + (t.hours || 0), 0);

                    if (explicitTaskWeightsSum > 0) {
                        const weightedSum = parsedTasks.reduce((acc, t) => acc + (t.prog * (t.weight || 0)), 0);
                        phaseProg = Math.min(100, Math.round(weightedSum / explicitTaskWeightsSum));
                    } else if (totalHoursSum > 0) {
                        const weightedSum = parsedTasks.reduce((acc, t) => acc + (t.prog * (t.hours || 0)), 0);
                        phaseProg = Math.min(100, Math.round(weightedSum / totalHoursSum));
                    } else {
                        const sumProg = parsedTasks.reduce((acc, t) => acc + t.prog, 0);
                        phaseProg = Math.min(100, Math.round(sumProg / parsedTasks.length));
                    }
                } else {
                    totalAllTasks += 1;
                    if (ph.status === 'en_progreso') {
                        phaseProg = 50;
                    } else {
                        phaseProg = 0;
                    }
                }
                phaseProgressList.push(phaseProg);
            });
        }

        const totalPhases = data.phases ? data.phases.length : 0;
        const completedPhases = data.phases ? data.phases.filter(p => p.status === 'completado').length : 0;

        let physicalProgressPct = 0;
        if (data.status === 'culminado') {
            physicalProgressPct = 100;
        } else if (data.phases && data.phases.length > 0) {
            if (explicitPhaseWeightsSum > 0) {
                let weightedSum = 0;
                data.phases.forEach((ph, idx) => {
                    const pw = parseFloat(ph.weight_percent || 0);
                    weightedSum += (phaseProgressList[idx] * pw);
                });
                physicalProgressPct = Math.min(100, Math.round(weightedSum / explicitPhaseWeightsSum));
            } else {
                let sumProg = phaseProgressList.reduce((acc, v) => acc + v, 0);
                physicalProgressPct = Math.min(100, Math.round(sumProg / data.phases.length));
            }
        }

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
                const phaseProg = phaseProgressList[idx] || 0;
                const phWeight = parseFloat(ph.weight_percent || 0);

                // Tareas desglosadas por etapa con checkboxes interactivos (sin prelación)
                let tasksHtml = '';
                const rawDesc = ph.description || "";
                let tasksList = rawDesc.split(";").map(t => t.trim()).filter(Boolean);
                if (tasksList.length === 0 && rawDesc.trim().length > 0) {
                    tasksList = rawDesc.split("\n").map(t => t.trim()).filter(Boolean);
                }

                const doneTasksCount = tasksList.filter(t => t.startsWith('[x]') || t.startsWith('[X]')).length;

                tasksHtml = `
                <div style="margin-top: 8px; border-top: 1px dashed #e2e8f0; padding-top: 8px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; flex-wrap: wrap; gap: 4px;">
                        <span style="font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase;">
                            <i class="fa-solid fa-list-check" style="color: var(--dalor-blue);"></i> Tareas / Actividades Asignadas:
                        </span>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span style="font-size: 10px; font-weight: 800; color: #0284c7; background: #e0f2fe; padding: 2px 6px; border-radius: 4px;">
                                Avance Etapa: ${phaseProg}%
                            </span>
                            <span style="font-size: 10px; font-weight: 700; color: ${isDone ? '#059669' : '#64748b'};">
                                ${doneTasksCount} de ${tasksList.length} completadas
                            </span>
                        </div>
                    </div>

                    ${tasksList.length > 0 ? `
                    <div style="display: flex; flex-direction: column; gap: 5px; margin-bottom: 8px;">
                        ${(() => {
                            // Preprocesar jerarquía y resumen para la vista
                            const parsedList = tasksList.map((t, idx) => {
                                let lvl = 1;
                                const lMatch = t.match(/\[\s*(?:L|LVL|INDENT)(?::|\s*)?([1-9])\s*\]/i);
                                if (lMatch) lvl = parseInt(lMatch[1], 10);

                                let prog = 0;
                                const pMatch = t.match(/\[\s*([0-9]+(?:\.[0-9]+)?)\s*%\s*\]/);
                                if (pMatch) prog = parseFloat(pMatch[1]);
                                else if (t.startsWith("[x]") || t.startsWith("[X]") || t.includes("✅")) prog = 100;

                                let clean = t;
                                for (const pref of ["[x]", "[X]", "[ ]", "✅", "⏳"]) {
                                    if (clean.startsWith(pref)) clean = clean.substring(pref.length).trim();
                                }
                                clean = clean.replace(/\[\s*(?:L|LVL|INDENT)(?::|\s*)?([1-9])\s*\]/gi, '').trim();
                                clean = clean.replace(/\[\s*([0-9]+(?:\.[0-9]+)?)\s*%\s*\]/, '').trim();

                                let taskWeight = null;
                                const wMatch = clean.match(/\[W:\s*([0-9]+(?:\.[0-9]+)?)\s*%?\]/i);
                                if (wMatch) {
                                    taskWeight = parseFloat(wMatch[1]);
                                    clean = clean.replace(/\[W:\s*([0-9]+(?:\.[0-9]+)?)\s*%?\]/i, '').trim();
                                }

                                let taskHours = null;
                                const hMatch = clean.match(/\[(?:H|HH|WORK):\s*([0-9]+(?:\.[0-9]+)?)\s*(?:h|hrs|hh)?\]/i);
                                if (hMatch) {
                                    taskHours = parseFloat(hMatch[1]);
                                    clean = clean.replace(/\[(?:H|HH|WORK):\s*([0-9]+(?:\.[0-9]+)?)\s*(?:h|hrs|hh)?\]/i, '').trim();
                                }

                                return { raw: t, idx, lvl, prog, cleanName: clean, taskWeight, taskHours };
                            });

                            return parsedList.map((item, tIdx) => {
                                const isSummary = (tIdx + 1 < parsedList.length && parsedList[tIdx + 1].lvl > item.lvl);
                                const isChecked = item.prog >= 100;
                                const indentPx = (item.lvl - 1) * 22; // 0px para L1, 22px para L2, 44px para L3

                                return `
                                <div style="display: flex; align-items: center; gap: 6px; font-size: 11px; padding: 5px 8px; margin-left: ${indentPx}px; border-radius: 6px; background: ${isSummary ? '#f1f5f9' : (isChecked ? '#f0fdf4' : (item.prog > 0 ? '#f0f9ff' : '#f8fafc'))}; border: 1px solid ${isSummary ? '#94a3b8' : (isChecked ? '#bbf7d0' : (item.prog > 0 ? '#bae6fd' : '#e2e8f0'))}; border-left: ${item.lvl > 1 ? '3px solid ' + (item.lvl === 2 ? '#0284c7' : '#9333ea') : '1px solid ' + (isSummary ? '#94a3b8' : '#e2e8f0')}; position: relative; overflow: hidden;">
                                    <div style="position: absolute; left: 0; top: 0; bottom: 0; width: ${item.prog}%; background: ${isSummary ? 'rgba(148, 163, 184, 0.25)' : (isChecked ? 'rgba(187, 247, 208, 0.4)' : 'rgba(186, 230, 253, 0.45)')}; pointer-events: none; z-index: 0;"></div>
                                    <div style="display: flex; align-items: center; gap: 6px; z-index: 1; width: 100%;">
                                        <!-- Control de Sangría (Indent / Outdent estilo MS Project) -->
                                        <div style="display: inline-flex; gap: 2px;">
                                            <button type="button" onclick="indentProjectTask(${data.id}, ${ph.id}, ${tIdx}, 'outdent')" style="background: none; border: none; font-size: 10px; color: ${item.lvl > 1 ? '#0284c7' : '#cbd5e1'}; cursor: ${item.lvl > 1 ? 'pointer' : 'default'}; padding: 0 2px;" title="${item.lvl > 1 ? '⬅️ Disminuir sangría (Subir nivel WBS)' : 'Nivel máximo raíz'}" ${item.lvl <= 1 ? 'disabled' : ''}>◀</button>
                                            <button type="button" onclick="indentProjectTask(${data.id}, ${ph.id}, ${tIdx}, 'indent')" style="background: none; border: none; font-size: 10px; color: ${item.lvl < 3 ? '#0284c7' : '#cbd5e1'}; cursor: ${item.lvl < 3 ? 'pointer' : 'default'}; padding: 0 2px;" title="${item.lvl < 3 ? '➡️ Aumentar sangría (Hacer sub-tarea de la anterior)' : 'Nivel máximo de anidación'}" ${item.lvl >= 3 ? 'disabled' : ''}>▶</button>
                                        </div>

                                        ${!isSummary ? `
                                            <input type="checkbox" ${isChecked ? 'checked' : ''} onchange="toggleProjectTask(${data.id}, ${ph.id}, ${tIdx}, this.checked)" style="width: 15px; height: 15px; accent-color: #059669; cursor: pointer;">
                                        ` : `
                                            <span style="font-size: 10px; color: #475569;" title="Etapa resumen calculada automáticamente"><i class="fa-solid fa-folder-tree"></i></span>
                                        `}

                                        <span style="font-weight: 800; font-size: 10px; color: ${isSummary ? 'var(--dalor-navy)' : '#64748b'}; font-family: monospace;">
                                            ${idx + 1}.${tIdx + 1}
                                        </span>

                                        <span style="${isSummary ? 'font-weight: 800; color: #0f172a;' : (isChecked ? 'text-decoration: line-through; color: #15803d; font-weight: 600;' : 'color: #334155; font-weight: 600;')} flex: 1;">
                                            ${item.cleanName}
                                        </span>

                                        ${item.taskHours !== null ? `<span style="font-size: 10px; font-weight: 700; color: #059669; background: #dcfce7; padding: 2px 6px; border-radius: 4px;" title="Horas de trabajo (Work / HH)"><i class="fa-regular fa-clock"></i> ${item.taskHours} HH</span>` : ''}
                                        ${item.taskWeight !== null ? `<span style="font-size: 10px; font-weight: 700; color: #0284c7; background: #e0f2fe; padding: 2px 6px; border-radius: 4px;" title="Ponderación WBS">${item.taskWeight}%</span>` : ''}

                                        <!-- Porcentaje de Avance (Editable en tareas hojas, Automático no editable en resúmenes) -->
                                        ${isSummary ? `
                                            <span style="font-size: 11px; font-weight: 800; padding: 2px 8px; border-radius: 4px; background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd;" title="Calculado automáticamente por roll-up en cascada">
                                                ${item.prog}% Auto
                                            </span>
                                        ` : `
                                            <div style="display: inline-flex; align-items: center; gap: 3px; background: white; border: 1px solid #cbd5e1; border-radius: 4px; padding: 1px 4px;" title="Editar porcentaje de avance de la tarea (0 - 100%)">
                                                <input type="number" id="task_prog_${ph.id}_${tIdx}" min="0" max="100" value="${item.prog}" onchange="updateProjectTaskProgress(${data.id}, ${ph.id}, ${tIdx}, this.value)" onkeydown="if(event.key==='Enter'){event.preventDefault(); updateProjectTaskProgress(${data.id}, ${ph.id}, ${tIdx}, this.value);}" style="width: 44px; font-size: 11px; border: none; text-align: center; font-weight: 800; color: ${isChecked ? '#166534' : (item.prog > 0 ? '#0284c7' : '#64748b')}; outline: none;">
                                                <span style="font-size: 10px; font-weight: 800; color: #64748b;">%</span>
                                                <button type="button" onclick="updateProjectTaskProgress(${data.id}, ${ph.id}, ${tIdx}, document.getElementById('task_prog_${ph.id}_${tIdx}').value)" style="background: none; border: none; color: #059669; font-size: 11px; cursor: pointer; padding: 0 2px;" title="Guardar avance"><i class="fa-solid fa-floppy-disk"></i></button>
                                            </div>
                                        `}

                                        <button type="button" onclick="deleteProjectTask(${data.id}, ${ph.id}, ${tIdx})" style="background: none; border: none; color: #94a3b8; font-size: 16px; cursor: pointer; padding: 0 4px; line-height: 1;" title="Eliminar tarea de esta etapa">&times;</button>
                                    </div>
                                </div>`;
                            }).join('');
                        })()}
                    </div>` : '<p style="font-size: 11px; color: #94a3b8; margin: 4px 0 8px 0; font-style: italic;">No hay tareas asignadas en esta etapa.</p>'}

                    <div id="btn_wrap_add_task_${ph.id}" style="margin-top: 6px;">
                        <button type="button" onclick="document.getElementById('form_add_task_${ph.id}').style.display='flex'; document.getElementById('btn_wrap_add_task_${ph.id}').style.display='none'; document.getElementById('new_task_inp_${ph.id}').focus();" class="btn-secondary" style="font-size: 11px; padding: 4px 10px; color: #0284c7; border: 1px dashed #7dd3fc; background: #f0f9ff; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 5px; font-weight: 700;">
                            <i class="fa-solid fa-plus"></i> + Agregar Tarea a esta Etapa
                        </button>
                    </div>
                    <div id="form_add_task_${ph.id}" style="display: none; gap: 6px; align-items: center; flex-wrap: wrap; margin-top: 6px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 8px 10px; border-radius: 6px;">
                        <input type="text" id="new_task_inp_${ph.id}" placeholder="Descripción de la tarea / actividad..." style="flex: 2; min-width: 180px; font-size: 11px; padding: 5px 8px; border: 1px solid #cbd5e1; border-radius: 6px; background: white;" onkeydown="if(event.key==='Enter'){event.preventDefault(); addProjectTask(${data.id}, ${ph.id});}">
                        <input type="number" id="new_task_hours_${ph.id}" placeholder="Horas HH" title="Horas de trabajo estimadas (Work / HH)" style="width: 75px; font-size: 11px; padding: 5px 4px; border: 1px solid #cbd5e1; border-radius: 6px; background: white; text-align: center; font-weight: bold; color: #059669;">
                        <input type="text" inputmode="decimal" id="new_task_weight_${ph.id}" placeholder="Peso %" title="Ponderación manual (%) opcional" style="width: 65px; font-size: 11px; padding: 5px 4px; border: 1px solid #cbd5e1; border-radius: 6px; background: white; text-align: center; font-weight: bold; color: #0284c7;">
                        <button type="button" onclick="addProjectTask(${data.id}, ${ph.id})" class="btn-primary" style="font-size: 11px; padding: 5px 10px; background: #059669; font-weight: 700; border-radius: 6px; white-space: nowrap; display: flex; align-items: center; gap: 4px;">
                            <i class="fa-solid fa-floppy-disk"></i> Guardar Tarea
                        </button>
                        <button type="button" onclick="document.getElementById('form_add_task_${ph.id}').style.display='none'; document.getElementById('btn_wrap_add_task_${ph.id}').style.display='block';" class="btn-secondary" style="font-size: 11px; padding: 5px 8px; border-radius: 6px; color: #64748b;">
                            Cancelar
                        </button>
                    </div>
                </div>`;

                return `
                <div style="background: ${isDone ? '#f0fdf4' : '#ffffff'}; border: 1px solid ${isDone ? '#86efac' : '#cbd5e1'}; border-radius: 8px; padding: 10px 12px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span style="background: ${isDone ? '#059669' : '#002B49'}; color: white; border-radius: 6px; font-size: 11px; font-weight: 800; padding: 2px 6px;">
                                Etapa ${idx + 1}
                            </span>
                            <div>
                                <b style="font-size: 13px; color: var(--dalor-navy); ${isDone ? 'text-decoration: line-through; color: #166534;' : ''}">${ph.name}</b>
                                <span style="font-size: 11px; color: #64748b; margin-left: 6px;">(${ph.duration_days || 0} días &bull; Ppto: $${Number(ph.estimated_cost_usd || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}${phWeight > 0 ? ' &bull; Peso: ' + phWeight + '%' : ''})</span>
                            </div>
                        </div>

                        <div style="display: flex; align-items: center; gap: 6px;">
                            <button type="button" onclick="openConfigurePhaseWeightsModal(${data.id}, ${ph.id}, '${(ph.name || '').replace(/'/g, "\\'")}', ${phWeight})" class="btn-secondary" style="font-size: 11px; padding: 4px 8px; background: #f0fdf4; color: #166534; border-color: #86efac; font-weight: 700;" title="Ponderar tareas y peso de esta etapa">
                                <i class="fa-solid fa-scale-balanced"></i> Ponderar
                            </button>
                            ${isDone 
                                ? `<button onclick="updatePhaseStatus(${data.id}, ${ph.id}, 'pendiente')" class="btn-secondary" style="font-size: 11px; padding: 4px 8px; color: #64748b;" title="Reabrir Etapa"><i class="fa-solid fa-rotate-left"></i> Reabrir</button>`
                                : `<button onclick="updatePhaseStatus(${data.id}, ${ph.id}, 'completado')" class="btn-primary" style="font-size: 11px; padding: 4px 10px; background: #059669; font-weight: 800;"><i class="fa-solid fa-check"></i> Culminar Etapa</button>`
                            }
                            <select onchange="updatePhaseStatus(${data.id}, ${ph.id}, this.value)" style="font-size: 11px; padding: 3px 6px; border-radius: 6px; border: 1px solid #cbd5e1; font-weight: 700;">
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
                            <button type="button" onclick="openReturnMaterialModal(${data.id}, ${r.material_id || 0}, '${(r.material_name || '').replace(/'/g, "\\'")}', '${r.material_code || ''}', ${r.quantity_dispatched || 0}, '${r.unit_measure || 'UND'}')" class="btn-secondary" style="font-size: 9px; padding: 2px 6px; color: #16a34a; border-color: #bbf7d0; margin-right: 3px;" title="Devolver sobrante a almacén central">
                                <i class="fa-solid fa-arrow-rotate-left"></i> Devolver
                            </button>
                            ${(r.status !== 'cancelado' && (r.quantity_pending > 0 || !r.quantity_dispatched)) ? `
                            <button type="button" onclick="abortProjectRequisition(${r.id}, '${(r.material_name || '').replace(/'/g, "\\'")}', '${data.code || 'OBRA'}')" class="btn-secondary" style="font-size: 9px; padding: 2px 6px; color: #dc2626; border-color: #fca5a5; background: #fef2f2;" title="Anular o cancelar esta petición de insumo">
                                <i class="fa-solid fa-ban"></i> Anular
                            </button>
                            ` : ''}
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

export async function toggleProjectTask(projectId, phaseId, taskIndex, isChecked) {

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

export async function updateProjectTaskProgress(projectId, phaseId, taskIndex, newPct) {
    const pct = Math.max(0, Math.min(100, parseFloat(newPct) || 0));
    try {
        const res = await authFetch(`${API_BASE}/projects/${projectId}/phases/${phaseId}/toggle-task`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                task_index: taskIndex,
                progress_percent: pct
            })
        });

        if (res.ok) {
            await viewProjectDetails(projectId);
        } else {
            const err = await res.json();
            alert("⚠️ " + (err.detail || "No se pudo actualizar el avance de la tarea."));
            await viewProjectDetails(projectId);
        }
    } catch (e) {
        alert("Error de conexión al actualizar el avance de la tarea.");
    }
}

export async function updatePhaseStatus(projectId, phaseId, newStatus) {
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
