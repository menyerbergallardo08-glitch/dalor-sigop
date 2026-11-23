/**
 * DALOR SIGO-P | Submódulo: PROJECTS_SUBCONTRACTS.JS
 * Personal Subcontratado y Recursos Opcionales (Exclusivo de Proyectos, no Servicios APU).
 */

const getApiBase = () => (typeof window !== 'undefined' && window.API_BASE) || (window.location.origin + '/api/v1');

function authFetch(url, options = {}) {
    const t = sessionStorage.getItem('dalor_token') || localStorage.getItem('dalor_token') || window.authToken || '';
    const headers = Object.assign({}, options.headers || {});
    if (t) headers['Authorization'] = 'Bearer ' + t;
    if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
    }
    return window.fetch(url, Object.assign({}, options, { headers }));
}

let draftProjectSubcontracts = [];
let currentSubcontractProjectId = null;
let loadedProjectSubcontracts = [];
let editingSubcontractId = null;
let selectedSubcontractIds = new Set();

function escapeHtml(val) {
    return String(val ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export function addDraftProjectSubcontract() {
    const kind = document.getElementById('draft_subc_kind')?.value || 'personal_subcontratado';
    const name = (document.getElementById('draft_subc_name')?.value || '').trim();
    const spec = (document.getElementById('draft_subc_spec')?.value || '').trim();
    const prov = (document.getElementById('draft_subc_provider')?.value || '').trim();
    const qty = parseFloat(document.getElementById('draft_subc_qty')?.value) || 1;
    const cost = parseFloat(document.getElementById('draft_subc_cost')?.value) || 0;
    const isOpt = !!document.getElementById('draft_subc_optional')?.checked || kind === 'recurso_opcional';

    if (!name) {
        alert('Indica el nombre de la cuadrilla, persona subcontratada o recurso opcional.');
        return;
    }

    draftProjectSubcontracts.push({
        resource_kind: kind,
        name,
        specialty_or_unit: spec || null,
        provider_name: prov || null,
        quantity: qty,
        unit_cost_usd: cost,
        is_optional: isOpt
    });

    document.getElementById('draft_subc_name').value = '';
    document.getElementById('draft_subc_spec').value = '';
    document.getElementById('draft_subc_provider').value = '';
    document.getElementById('draft_subc_qty').value = '1';
    document.getElementById('draft_subc_cost').value = '0';
    renderDraftProjectSubcontracts();
}

export function removeDraftProjectSubcontract(idx) {
    draftProjectSubcontracts.splice(idx, 1);
    renderDraftProjectSubcontracts();
}

export function renderDraftProjectSubcontracts() {
    const container = document.getElementById('draft_subcontracts_list');
    if (!container) return;
    if (!draftProjectSubcontracts.length) {
        container.innerHTML = '<span style="font-size:11px; color:#64748b;">Sin personal subcontratado ni recursos opcionales agregados aún.</span>';
        return;
    }
    container.innerHTML = draftProjectSubcontracts.map((it, idx) => {
        const badge = it.resource_kind === 'personal_subcontratado'
            ? '<span style="background:#ede9fe; color:#6d28d9; padding:1px 6px; border-radius:4px; font-size:10px; font-weight:800;">SUBCONTRATO</span>'
            : '<span style="background:#fef3c7; color:#b45309; padding:1px 6px; border-radius:4px; font-size:10px; font-weight:800;">OPCIONAL</span>';
        const tot = (it.quantity * it.unit_cost_usd).toFixed(2);
        return `
            <div style="display:flex; justify-content:space-between; align-items:center; background:#fff; border:1px solid #e2e8f0; border-radius:6px; padding:5px 8px; font-size:11px; gap:8px;">
                <div>${badge} <b>${it.name}</b> ${it.specialty_or_unit ? `(${it.specialty_or_unit})` : ''} ${it.provider_name ? `&bull; ${it.provider_name}` : ''} &bull; Cant: ${it.quantity} &bull; <b style="color:#059669;">$${tot}</b></div>
                <button type="button" onclick="removeDraftProjectSubcontract(${idx})" style="border:none; background:none; color:#dc2626; cursor:pointer; font-weight:800;">&times;</button>
            </div>
        `;
    }).join('');
}

export async function flushDraftProjectSubcontracts(projectId) {
    if (!projectId || !draftProjectSubcontracts.length) return;
    try {
        await authFetch(`${getApiBase()}/projects/${projectId}/subcontracts`, {
            method: 'POST',
            body: JSON.stringify({ items: draftProjectSubcontracts })
        });
    } catch (_) {}
    draftProjectSubcontracts = [];
    renderDraftProjectSubcontracts();
}

export async function openProjectSubcontractsModal(projectId, projectCode, projectName) {
    currentSubcontractProjectId = projectId;
    editingSubcontractId = null;
    selectedSubcontractIds = new Set();
    const badge = document.getElementById('subc_modal_project_badge');
    if (badge) badge.innerText = `[${projectCode || 'PRJ'}] ${projectName || ''}`;
    const searchEl = document.getElementById('subc_search_input');
    if (searchEl) searchEl.value = '';
    const filterEl = document.getElementById('subc_filter_kind');
    if (filterEl) filterEl.value = 'all';
    const panel = document.getElementById('subc_jc_panel');
    if (panel) panel.classList.add('hidden');
    if (typeof window.openModal === 'function') window.openModal('modalProjectSubcontracts');
    await loadProjectSubcontractsList();
}

export function filterProjectSubcontracts() {
    renderProjectSubcontractsTable();
}

function renderProjectSubcontractsTable() {
    const tbody = document.getElementById('subc_modal_tbody');
    const countBadge = document.getElementById('subc_count_badge');
    const totalEl = document.getElementById('subc_total_usd');
    if (!tbody) return;

    const query = (document.getElementById('subc_search_input')?.value || '').trim().toLowerCase();
    const kindFilter = document.getElementById('subc_filter_kind')?.value || 'all';

    const filtered = loadedProjectSubcontracts.filter(r => {
        if (kindFilter !== 'all' && r.resource_kind !== kindFilter) return false;
        if (query) {
            const hay = `${r.name || ''} ${r.specialty_or_unit || ''} ${r.provider_name || ''}`.toLowerCase();
            if (!hay.includes(query)) return false;
        }
        return true;
    });

    if (countBadge) {
        countBadge.innerText = loadedProjectSubcontracts.length === filtered.length
            ? `${filtered.length} registro${filtered.length === 1 ? '' : 's'}`
            : `Mostrando ${filtered.length} de ${loadedProjectSubcontracts.length}`;
    }

    const sumTotal = filtered.reduce((acc, r) => acc + Number(r.total_cost_usd || 0), 0);
    const sumImputed = filtered
        .filter(r => r.job_costing_status === 'gasto' || r.job_costing_status === 'cxp')
        .reduce((acc, r) => acc + Number(r.total_cost_usd || 0), 0);
    const sumPending = Math.max(0, sumTotal - sumImputed);
    if (totalEl) totalEl.innerText = `$${sumTotal.toFixed(2)}`;
    const imputedEl = document.getElementById('subc_imputed_usd');
    if (imputedEl) imputedEl.innerText = `$${sumImputed.toFixed(2)}`;
    const pendingEl = document.getElementById('subc_pending_usd');
    if (pendingEl) pendingEl.innerText = `$${sumPending.toFixed(2)}`;

    if (!filtered.length) {
        const msg = loadedProjectSubcontracts.length
            ? 'Ningún registro coincide con el filtro actual.'
            : 'No hay personal subcontratado ni recursos opcionales registrados en esta obra.';
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:18px; color:#64748b;">${msg}</td></tr>`;
        updateJobCostingPendingState();
        return;
    }

    tbody.innerHTML = filtered.map(r => {
        const isPendingPayable = Number(r.total_cost_usd || 0) > 0 && (!r.job_costing_status || r.job_costing_status === 'pendiente');
        const isChecked = isPendingPayable && selectedSubcontractIds.has(r.id);

        if (editingSubcontractId === r.id) {
            const qtyVal = Number(r.quantity ?? 1);
            const unitVal = Number(r.unit_cost_usd ?? 0);
            const liveTotal = (qtyVal * unitVal).toFixed(2);
            return `
                <tr style="background:#f5f3ff;" onkeydown="handleInlineSubcKeydown(event, ${r.id})">
                    <td style="text-align:center;"><input type="checkbox" disabled></td>
                    <td>
                        <select id="subc_edit_kind_${r.id}" class="form-select" style="font-size:11px; padding:3px 6px;">
                            <option value="personal_subcontratado" ${r.resource_kind === 'personal_subcontratado' ? 'selected' : ''}>Subcontratado</option>
                            <option value="recurso_opcional" ${r.resource_kind === 'recurso_opcional' ? 'selected' : ''}>Opcional</option>
                        </select>
                    </td>
                    <td>
                        <input type="text" id="subc_edit_name_${r.id}" value="${escapeHtml(r.name)}" class="form-input" placeholder="Nombre *" style="font-size:11px; padding:3px 6px; margin-bottom:4px;">
                        <input type="text" id="subc_edit_spec_${r.id}" value="${escapeHtml(r.specialty_or_unit || '')}" class="form-input" placeholder="Especialidad / Cargo" style="font-size:10.5px; padding:3px 6px;">
                    </td>
                    <td>
                        <input type="text" id="subc_edit_provider_${r.id}" value="${escapeHtml(r.provider_name || '')}" class="form-input" placeholder="Proveedor" style="font-size:11px; padding:3px 6px;">
                    </td>
                    <td style="text-align:center;">
                        <input type="number" step="any" inputmode="decimal" min="0.01" id="subc_edit_qty_${r.id}" value="${qtyVal}" oninput="updateInlineSubcontractTotal(${r.id})" class="form-input" style="font-size:11px; padding:3px 6px; width:68px; text-align:center;">
                    </td>
                    <td style="text-align:right;">
                        <input type="number" step="any" inputmode="decimal" min="0" id="subc_edit_cost_${r.id}" value="${unitVal}" oninput="updateInlineSubcontractTotal(${r.id})" class="form-input" style="font-size:11px; padding:3px 6px; width:92px; text-align:right;">
                    </td>
                    <td style="text-align:right; font-weight:800; color:#059669;" id="subc_edit_total_${r.id}">$${liveTotal}</td>
                    <td style="text-align:center; white-space:nowrap;">
                        <button type="button" onclick="saveEditProjectSubcontract(${r.id})" title="Guardar cambios" class="btn-primary" style="padding:3px 8px; background:#059669; font-size:11px; margin-right:4px;">
                            <i class="fa-solid fa-check"></i>
                        </button>
                        <button type="button" onclick="cancelEditProjectSubcontract()" title="Cancelar" class="btn-secondary" style="padding:3px 8px; font-size:11px;">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    </td>
                </tr>
            `;
        }

        const badge = r.resource_kind === 'personal_subcontratado'
            ? '<span style="background:#ede9fe;color:#6d28d9;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:800;">Subcontratado</span>'
            : '<span style="background:#fef3c7;color:#b45309;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:800;">Opcional</span>';
        const refText = escapeHtml(r.job_costing_ref || (r.job_costing_status === 'gasto' ? 'Gasto' : 'CxP'));
        const jcPill = r.job_costing_status === 'gasto'
            ? `<div style="margin-top:4px; display:flex; align-items:center; gap:4px; flex-wrap:wrap;"><span style="background:#dcfce7;color:#166534;padding:1px 5px;border-radius:4px;font-size:9.5px;font-weight:800;">✓ ${refText}</span><button type="button" onclick="reverseSubcontractJobCosting(${r.id}, '${refText}')" title="Reversar ${refText} y devolver a pendiente" style="border:1px solid #fca5a5; background:#fff1f2; color:#dc2626; border-radius:4px; padding:0px 5px; font-size:9.5px; font-weight:800; cursor:pointer;">↺ Reversar</button></div>`
            : (r.job_costing_status === 'cxp'
                ? `<div style="margin-top:4px; display:flex; align-items:center; gap:4px; flex-wrap:wrap;"><span style="background:#dbeafe;color:#1d4ed8;padding:1px 5px;border-radius:4px;font-size:9.5px;font-weight:800;">✓ ${refText}</span><button type="button" onclick="reverseSubcontractJobCosting(${r.id}, '${refText}')" title="Reversar ${refText} y devolver a pendiente" style="border:1px solid #fca5a5; background:#fff1f2; color:#dc2626; border-radius:4px; padding:0px 5px; font-size:9.5px; font-weight:800; cursor:pointer;">↺ Reversar</button></div>`
                : '');
        const chkTitle = isPendingPayable
            ? 'Seleccionar para imputar al Job Costing'
            : (r.job_costing_status && r.job_costing_status !== 'pendiente' ? 'Ya imputado al Job Costing' : 'Asigna una tarifa mayor a $0 para imputar');
        const unitCost = Number(r.unit_cost_usd || 0);
        const totalCost = Number(r.total_cost_usd || 0);
        return `
            <tr style="${isChecked ? 'background:#f0fdf4;' : ''}">
                <td style="text-align:center;">
                    <input type="checkbox" ${isChecked ? 'checked' : ''} ${isPendingPayable ? '' : 'disabled'} title="${chkTitle}" onchange="toggleSelectSubcontractRow(${r.id}, this.checked)">
                </td>
                <td>${badge}${jcPill}</td>
                <td><b>${escapeHtml(r.name)}</b><br><span style="font-size:10px;color:#64748b;">${escapeHtml(r.specialty_or_unit || '-')}</span></td>
                <td style="font-size:11px;">${escapeHtml(r.provider_name || '-')}</td>
                <td style="text-align:center;">${r.quantity}</td>
                <td style="text-align:right; color:#334155; font-weight:600;">$${unitCost.toFixed(2)}</td>
                <td style="text-align:right; font-weight:800; color:#059669;">$${totalCost.toFixed(2)}</td>
                <td style="text-align:center; white-space:nowrap;">
                    <button type="button" onclick="startEditProjectSubcontract(${r.id})" title="Editar salario o datos" class="btn-secondary" style="padding:3px 8px; color:#2563eb; font-size:11px; margin-right:4px;">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button type="button" onclick="deleteProjectSubcontract(${r.id})" title="Eliminar registro" class="btn-secondary" style="padding:3px 8px; color:#dc2626; font-size:11px;">&times;</button>
                </td>
            </tr>
        `;
    }).join('');

    updateJobCostingPendingState();
}

function getPendingJobCostingItems() {
    return loadedProjectSubcontracts.filter(
        r => Number(r.total_cost_usd || 0) > 0 && (!r.job_costing_status || r.job_costing_status === 'pendiente')
    );
}

function getSelectedJobCostingItems() {
    return getPendingJobCostingItems().filter(r => selectedSubcontractIds.has(r.id));
}

export function toggleSelectSubcontractRow(itemId, checked) {
    if (checked) selectedSubcontractIds.add(itemId);
    else selectedSubcontractIds.delete(itemId);
    renderProjectSubcontractsTable();
}

export function toggleSelectAllSubcontracts(checked) {
    const pending = getPendingJobCostingItems();
    if (checked) {
        pending.forEach(r => selectedSubcontractIds.add(r.id));
    } else {
        selectedSubcontractIds.clear();
    }
    renderProjectSubcontractsTable();
}

function updateJobCostingPendingState() {
    const btn = document.getElementById('btn_subc_post_jc');
    const summaryEl = document.getElementById('subc_jc_pending_summary');
    const panel = document.getElementById('subc_jc_panel');
    const selectAllChk = document.getElementById('subc_select_all_chk');

    const pending = getPendingJobCostingItems();
    const pendingIds = new Set(pending.map(r => r.id));
    // Limpiar IDs que ya no son elegibles
    Array.from(selectedSubcontractIds).forEach(id => {
        if (!pendingIds.has(id)) selectedSubcontractIds.delete(id);
    });

    const selected = pending.filter(r => selectedSubcontractIds.has(r.id));
    const selectedUsd = selected.reduce((acc, r) => acc + Number(r.total_cost_usd || 0), 0);

    if (selectAllChk) {
        selectAllChk.disabled = pending.length === 0;
        selectAllChk.checked = pending.length > 0 && selected.length === pending.length;
        selectAllChk.indeterminate = selected.length > 0 && selected.length < pending.length;
    }

    if (summaryEl) {
        summaryEl.innerText = `${selected.length} seleccionado${selected.length === 1 ? '' : 's'} • $${selectedUsd.toFixed(2)}`;
    }
    if (btn) {
        btn.disabled = selected.length === 0;
        btn.style.opacity = selected.length === 0 ? '0.55' : '1';
        if (selected.length > 0) {
            btn.innerHTML = `<i class="fa-solid fa-file-invoice-dollar"></i> Imputar seleccionados (${selected.length} • $${selectedUsd.toFixed(2)})`;
        } else if (pending.length > 0) {
            btn.innerHTML = `<i class="fa-solid fa-file-invoice-dollar"></i> Marca filas para imputar (${pending.length} disp.)`;
        } else {
            btn.innerHTML = `<i class="fa-solid fa-file-invoice-dollar"></i> Sin pendientes por imputar`;
        }
    }
    if (selected.length === 0 && panel) {
        panel.classList.add('hidden');
    }
}

export function toggleSubcontractJobCostingPanel(forceState) {
    const panel = document.getElementById('subc_jc_panel');
    if (!panel) return;
    if (typeof forceState === 'boolean') {
        panel.classList.toggle('hidden', !forceState);
    } else {
        if (!getSelectedJobCostingItems().length) return;
        panel.classList.toggle('hidden');
    }
    onSubcJcTargetChanged();
}

export function onSubcJcTargetChanged() {
    const target = document.getElementById('subc_jc_target')?.value || 'expense';
    const payWrap = document.getElementById('subc_jc_payment_wrap');
    if (payWrap) payWrap.style.display = target === 'expense' ? '' : 'none';
}

export async function submitSubcontractsToJobCosting() {
    if (!currentSubcontractProjectId) return;
    const selected = getSelectedJobCostingItems();
    if (!selected.length) {
        alert('Marca al menos una fila pendiente con monto mayor a $0.00 para imputar.');
        return;
    }

    const target = document.getElementById('subc_jc_target')?.value || 'expense';
    const grouping = document.getElementById('subc_jc_grouping')?.value || 'by_provider';
    const paymentMethod = document.getElementById('subc_jc_payment_method')?.value || 'transferencia';
    const btn = document.getElementById('btn_subc_jc_confirm');
    if (btn) btn.disabled = true;

    try {
        const res = await authFetch(`${getApiBase()}/projects/${currentSubcontractProjectId}/subcontracts/post-to-job-costing`, {
            method: 'POST',
            body: JSON.stringify({
                target_type: target,
                grouping,
                payment_method: paymentMethod,
                item_ids: selected.map(r => r.id)
            })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            alert('Error: ' + (data.detail || 'No se pudo imputar al Job Costing'));
            return;
        }
        if (Array.isArray(data.items)) {
            loadedProjectSubcontracts = data.items;
        }
        selectedSubcontractIds.clear();
        toggleSubcontractJobCostingPanel(false);
        renderProjectSubcontractsTable();
        syncEditProjectSubcontractsIfOpen();
        if (typeof window.loadProjects === 'function') {
            window.loadProjects();
        }
        const tipoLabel = target === 'expense' ? 'Gasto Declarado (Job Costing inmediato)' : 'Cuenta por Pagar (CxP)';
        alert(`Imputación exitosa como ${tipoLabel}.\nRegistros creados: ${(data.refs || []).join(', ')}\nTotal: $${Number(data.total_usd || 0).toFixed(2)}`);
    } catch (err) {
        alert('Error de conexión: ' + (err?.message || 'Intenta nuevamente'));
    } finally {
        if (btn) btn.disabled = false;
    }
}

export async function reverseSubcontractJobCosting(itemId, refLabel) {
    if (!currentSubcontractProjectId) return;
    const label = refLabel || 'esta imputación';
    if (!confirm(`¿Reversar ${label}?\n\nEsto eliminará el registro contable asociado y devolverá todos los ítems vinculados a estado Pendiente.`)) {
        return;
    }
    try {
        const res = await authFetch(`${getApiBase()}/projects/${currentSubcontractProjectId}/subcontracts/${itemId}/reverse-job-costing`, {
            method: 'POST'
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            alert('No se pudo reversar: ' + (data.detail || 'Error inesperado'));
            return;
        }
        if (Array.isArray(data.items)) {
            loadedProjectSubcontracts = data.items;
        }
        renderProjectSubcontractsTable();
        syncEditProjectSubcontractsIfOpen();
        if (typeof window.loadProjects === 'function') {
            window.loadProjects();
        }
        alert(`Reverso exitoso: ${data.reversed_ref} eliminado y ${data.reverted_items_count} ítem(s) devueltos a Pendiente.`);
    } catch (err) {
        alert('Error de conexión al reversar: ' + (err?.message || 'Intenta nuevamente'));
    }
}

function renderEditProjectSubcontractsPreview(rows) {
    const container = document.getElementById('edit_tags_subcontracts');
    const counter = document.getElementById('edit_subc_counter');
    if (!container) return;
    const list = Array.isArray(rows) ? rows : [];
    const totalUsd = list.reduce((acc, r) => acc + Number(r.total_cost_usd || 0), 0);
    if (counter) {
        counter.innerText = `${list.length} registro${list.length === 1 ? '' : 's'} • $${totalUsd.toFixed(2)}`;
    }
    if (!list.length) {
        container.innerHTML = '<span style="font-size: 11px; color: #64748b;">Sin personal subcontratado ni recursos opcionales registrados en esta obra.</span>';
        return;
    }
    container.innerHTML = list.map(r => {
        const badge = r.resource_kind === 'personal_subcontratado'
            ? '<span style="background:#ede9fe;color:#6d28d9;padding:1px 6px;border-radius:4px;font-size:10px;font-weight:800;">SUBCONTRATO</span>'
            : '<span style="background:#fef3c7;color:#b45309;padding:1px 6px;border-radius:4px;font-size:10px;font-weight:800;">OPCIONAL</span>';
        const unitCost = Number(r.unit_cost_usd || 0).toFixed(2);
        const totalCost = Number(r.total_cost_usd || 0).toFixed(2);
        return `
            <div style="display:flex; justify-content:space-between; align-items:center; background:#fff; border:1px solid #e2e8f0; border-radius:6px; padding:5px 8px; font-size:11px; gap:8px;">
                <div style="min-width:0;">
                    ${badge} <b>${escapeHtml(r.name)}</b>
                    ${r.specialty_or_unit ? `<span style="color:#64748b;">(${escapeHtml(r.specialty_or_unit)})</span>` : ''}
                    ${r.provider_name ? `<span style="color:#475569;">&bull; ${escapeHtml(r.provider_name)}</span>` : ''}
                </div>
                <div style="white-space:nowrap; font-size:11px;">
                    <span style="color:#475569;">Cant: <b>${r.quantity}</b> &bull; Unit: <b>$${unitCost}</b> &bull;</span>
                    <b style="color:#059669;">$${totalCost}</b>
                </div>
            </div>
        `;
    }).join('');
}

export async function loadEditProjectSubcontractsPreview(projectId) {
    const container = document.getElementById('edit_tags_subcontracts');
    const counter = document.getElementById('edit_subc_counter');
    if (!container || !projectId) return;
    container.innerHTML = '<span style="font-size: 11px; color: #64748b;">Cargando personal subcontratado...</span>';
    if (counter) counter.innerText = '...';
    try {
        const res = await authFetch(`${getApiBase()}/projects/${projectId}/subcontracts`);
        if (!res.ok) throw new Error('Error cargando subcontratación');
        const rows = await res.json();
        renderEditProjectSubcontractsPreview(rows);
    } catch (err) {
        container.innerHTML = `<span style="font-size: 11px; color: #dc2626;">${escapeHtml(err?.message || 'Error al cargar')}</span>`;
    }
}

function syncEditProjectSubcontractsIfOpen() {
    const editProjId = parseInt(document.getElementById('edit_project_id')?.value || '0', 10);
    if (editProjId && Number(currentSubcontractProjectId) === editProjId) {
        renderEditProjectSubcontractsPreview(loadedProjectSubcontracts);
    }
}

async function loadProjectSubcontractsList() {
    const tbody = document.getElementById('subc_modal_tbody');
    if (!tbody || !currentSubcontractProjectId) return;
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:14px; color:#64748b;">Cargando...</td></tr>';
    try {
        const res = await authFetch(`${getApiBase()}/projects/${currentSubcontractProjectId}/subcontracts`);
        if (!res.ok) throw new Error('Error cargando subcontratación');
        const rows = await res.json();
        loadedProjectSubcontracts = Array.isArray(rows) ? rows : [];
        renderProjectSubcontractsTable();
        syncEditProjectSubcontractsIfOpen();
    } catch (err) {
        loadedProjectSubcontracts = [];
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:#dc2626;">${escapeHtml(err?.message || 'Error inesperado')}</td></tr>`;
    }
}

export function startEditProjectSubcontract(itemId) {
    editingSubcontractId = itemId;
    renderProjectSubcontractsTable();
    const costInput = document.getElementById(`subc_edit_cost_${itemId}`);
    if (costInput) {
        costInput.focus();
        costInput.select();
    }
}

export function cancelEditProjectSubcontract() {
    editingSubcontractId = null;
    renderProjectSubcontractsTable();
}

export function updateInlineSubcontractTotal(itemId) {
    const qty = parseFloat(document.getElementById(`subc_edit_qty_${itemId}`)?.value) || 0;
    const cost = parseFloat(document.getElementById(`subc_edit_cost_${itemId}`)?.value) || 0;
    const totalCell = document.getElementById(`subc_edit_total_${itemId}`);
    if (totalCell) totalCell.innerText = `$${(qty * cost).toFixed(2)}`;
}

export function handleInlineSubcKeydown(event, itemId) {
    if (event.key === 'Enter') {
        event.preventDefault();
        saveEditProjectSubcontract(itemId);
    } else if (event.key === 'Escape') {
        event.preventDefault();
        cancelEditProjectSubcontract();
    }
}

export async function saveEditProjectSubcontract(itemId) {
    if (!currentSubcontractProjectId) return;
    const name = (document.getElementById(`subc_edit_name_${itemId}`)?.value || '').trim();
    if (!name) {
        alert('El nombre no puede estar vacío.');
        return;
    }
    const kind = document.getElementById(`subc_edit_kind_${itemId}`)?.value || 'personal_subcontratado';
    const qty = parseFloat(document.getElementById(`subc_edit_qty_${itemId}`)?.value);
    const cost = parseFloat(document.getElementById(`subc_edit_cost_${itemId}`)?.value);

    const payload = {
        resource_kind: kind,
        name,
        specialty_or_unit: (document.getElementById(`subc_edit_spec_${itemId}`)?.value || '').trim() || null,
        provider_name: (document.getElementById(`subc_edit_provider_${itemId}`)?.value || '').trim() || null,
        quantity: Number.isFinite(qty) && qty > 0 ? qty : 1,
        unit_cost_usd: Number.isFinite(cost) && cost >= 0 ? cost : 0,
        is_optional: kind === 'recurso_opcional'
    };

    try {
        const res = await authFetch(`${getApiBase()}/projects/${currentSubcontractProjectId}/subcontracts/${itemId}`, {
            method: 'PATCH',
            body: JSON.stringify(payload)
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            alert('Error: ' + (err.detail || 'No se pudo actualizar el registro'));
            return;
        }
        const data = await res.json();
        const updated = data?.item;
        if (updated) {
            loadedProjectSubcontracts = loadedProjectSubcontracts.map(it => it.id === itemId ? updated : it);
        }
        editingSubcontractId = null;
        renderProjectSubcontractsTable();
        syncEditProjectSubcontractsIfOpen();
    } catch (err) {
        alert('Error de conexión al guardar: ' + (err?.message || 'Intenta nuevamente'));
    }
}

export async function submitAddProjectSubcontract(event) {
    if (event && event.preventDefault) event.preventDefault();
    if (!currentSubcontractProjectId) return;
    const kind = document.getElementById('subc_add_kind').value;
    const name = document.getElementById('subc_add_name').value.trim();
    if (!name) return;

    const item = {
        resource_kind: kind,
        name,
        specialty_or_unit: document.getElementById('subc_add_spec').value.trim() || null,
        provider_name: document.getElementById('subc_add_provider').value.trim() || null,
        quantity: parseFloat(document.getElementById('subc_add_qty').value) || 1,
        unit_cost_usd: parseFloat(document.getElementById('subc_add_cost').value) || 0,
        is_optional: kind === 'recurso_opcional' || !!document.getElementById('subc_add_optional').checked
    };
    const res = await authFetch(`${getApiBase()}/projects/${currentSubcontractProjectId}/subcontracts`, {
        method: 'POST',
        body: JSON.stringify({ items: [item] })
    });
    if (res.ok) {
        document.getElementById('formAddProjectSubcontract').reset();
        document.getElementById('subc_add_qty').value = '1';
        document.getElementById('subc_add_cost').value = '0';
        await loadProjectSubcontractsList();
    } else {
        const err = await res.json().catch(() => ({}));
        alert('Error: ' + (err.detail || 'No se pudo guardar'));
    }
}

export async function deleteProjectSubcontract(itemId) {
    if (!currentSubcontractProjectId) return;
    const target = loadedProjectSubcontracts.find(it => it.id === itemId);
    const label = target?.name ? `"${target.name}"` : 'este registro';
    if (!confirm(`¿Eliminar ${label} del listado de subcontratación?`)) return;
    const res = await authFetch(`${getApiBase()}/projects/${currentSubcontractProjectId}/subcontracts/${itemId}`, { method: 'DELETE' });
    if (res.ok) {
        if (editingSubcontractId === itemId) editingSubcontractId = null;
        await loadProjectSubcontractsList();
    }
}

if (typeof window !== 'undefined') {
    window.addDraftProjectSubcontract = addDraftProjectSubcontract;
    window.removeDraftProjectSubcontract = removeDraftProjectSubcontract;
    window.flushDraftProjectSubcontracts = flushDraftProjectSubcontracts;
    window.openProjectSubcontractsModal = openProjectSubcontractsModal;
    window.loadEditProjectSubcontractsPreview = loadEditProjectSubcontractsPreview;
    window.filterProjectSubcontracts = filterProjectSubcontracts;
    window.startEditProjectSubcontract = startEditProjectSubcontract;
    window.cancelEditProjectSubcontract = cancelEditProjectSubcontract;
    window.updateInlineSubcontractTotal = updateInlineSubcontractTotal;
    window.handleInlineSubcKeydown = handleInlineSubcKeydown;
    window.saveEditProjectSubcontract = saveEditProjectSubcontract;
    window.submitAddProjectSubcontract = submitAddProjectSubcontract;
    window.deleteProjectSubcontract = deleteProjectSubcontract;
    window.toggleSubcontractJobCostingPanel = toggleSubcontractJobCostingPanel;
    window.onSubcJcTargetChanged = onSubcJcTargetChanged;
    window.submitSubcontractsToJobCosting = submitSubcontractsToJobCosting;
    window.toggleSelectSubcontractRow = toggleSelectSubcontractRow;
    window.toggleSelectAllSubcontracts = toggleSelectAllSubcontracts;
    window.reverseSubcontractJobCosting = reverseSubcontractJobCosting;
}
