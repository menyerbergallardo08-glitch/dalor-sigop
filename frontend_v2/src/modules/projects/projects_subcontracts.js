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
    const badge = document.getElementById('subc_modal_project_badge');
    if (badge) badge.innerText = `[${projectCode || 'PRJ'}] ${projectName || ''}`;
    if (typeof window.openModal === 'function') window.openModal('modalProjectSubcontracts');
    await loadProjectSubcontractsList();
}

async function loadProjectSubcontractsList() {
    const tbody = document.getElementById('subc_modal_tbody');
    if (!tbody || !currentSubcontractProjectId) return;
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:12px; color:#64748b;">Cargando...</td></tr>';
    try {
        const res = await authFetch(`${getApiBase()}/projects/${currentSubcontractProjectId}/subcontracts`);
        if (!res.ok) throw new Error('Error cargando subcontratación');
        const rows = await res.json();
        if (!rows.length) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:14px; color:#64748b;">No hay personal subcontratado ni recursos opcionales registrados en esta obra.</td></tr>';
            return;
        }
        tbody.innerHTML = rows.map(r => `
            <tr>
                <td>${r.resource_kind === 'personal_subcontratado' ? '<span style="background:#ede9fe;color:#6d28d9;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:800;">Subcontratado</span>' : '<span style="background:#fef3c7;color:#b45309;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:800;">Opcional</span>'}</td>
                <td><b>${r.name}</b><br><span style="font-size:10px;color:#64748b;">${r.specialty_or_unit || '-'}</span></td>
                <td style="font-size:11px;">${r.provider_name || '-'}</td>
                <td style="text-align:center;">${r.quantity}</td>
                <td style="text-align:right; font-weight:800; color:#059669;">$${Number(r.total_cost_usd || 0).toFixed(2)}</td>
                <td style="text-align:center;"><button type="button" onclick="deleteProjectSubcontract(${r.id})" class="btn-secondary" style="padding:2px 8px; color:#dc2626; font-size:11px;">&times;</button></td>
            </tr>
        `).join('');
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#dc2626;">${err.message}</td></tr>`;
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
        await loadProjectSubcontractsList();
    } else {
        const err = await res.json().catch(() => ({}));
        alert('Error: ' + (err.detail || 'No se pudo guardar'));
    }
}

export async function deleteProjectSubcontract(itemId) {
    if (!currentSubcontractProjectId) return;
    const res = await authFetch(`${getApiBase()}/projects/${currentSubcontractProjectId}/subcontracts/${itemId}`, { method: 'DELETE' });
    if (res.ok) await loadProjectSubcontractsList();
}

if (typeof window !== 'undefined') {
    window.addDraftProjectSubcontract = addDraftProjectSubcontract;
    window.removeDraftProjectSubcontract = removeDraftProjectSubcontract;
    window.flushDraftProjectSubcontracts = flushDraftProjectSubcontracts;
    window.openProjectSubcontractsModal = openProjectSubcontractsModal;
    window.submitAddProjectSubcontract = submitAddProjectSubcontract;
    window.deleteProjectSubcontract = deleteProjectSubcontract;
}
