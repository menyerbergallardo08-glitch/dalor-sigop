/**
 * DALOR SIGO-P | Submódulo: FLEET_OBLIGATIONS.JS
 * Obligaciones Legales de Flota (Seguros, Pólizas, Trimestres) y Estado 'En Servicio'.
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

let fleetObligationsCache = [];

export async function loadFleetObligations() {
    const tbody = document.getElementById('fleetObligationsTbody');
    const summaryEl = document.getElementById('fleetObligationsSummary');
    if (!tbody) return;

    await populateObligationVehiclesSelect();
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:14px; color:#64748b;">Cargando obligaciones...</td></tr>';

    try {
        const res = await authFetch(`${getApiBase()}/assets/obligations`);
        if (!res.ok) throw new Error('Error consultando obligaciones de flota');
        const data = await res.json();
        const items = data.items || [];
        fleetObligationsCache = items;
        syncObligationTypesDatalist(items);
        const s = data.summary || {};

        if (summaryEl) {
            summaryEl.innerHTML = `
                <span style="background:#fee2e2; color:#991b1b; padding:3px 10px; border-radius:9999px; font-size:11px; font-weight:800;">🔴 Vencidas: ${s.vencido || 0}</span>
                <span style="background:#fef3c7; color:#92400e; padding:3px 10px; border-radius:9999px; font-size:11px; font-weight:800;">🟡 Por Vencer: ${s.por_vencer || 0}</span>
                <span style="background:#dcfce7; color:#166534; padding:3px 10px; border-radius:9999px; font-size:11px; font-weight:800;">🟢 Vigentes: ${s.vigente || 0}</span>
            `;
        }

        if (!items.length) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:16px; color:#64748b;">No hay seguros, pólizas o trimestres registrados aún.</td></tr>';
            return;
        }

        tbody.innerHTML = items.map(ob => {
            let stBadge = '<span style="background:#dcfce7; color:#166534; padding:2px 8px; border-radius:9999px; font-size:10px; font-weight:800;">🟢 VIGENTE</span>';
            if (ob.status === 'vencido') {
                stBadge = `<span style="background:#fee2e2; color:#991b1b; padding:2px 8px; border-radius:9999px; font-size:10px; font-weight:800;">🔴 VENCIDO (${Math.abs(ob.days_remaining || 0)}d)</span>`;
            } else if (ob.status === 'por_vencer') {
                stBadge = `<span style="background:#fef3c7; color:#92400e; padding:2px 8px; border-radius:9999px; font-size:10px; font-weight:800;">🟡 POR VENCER (${ob.days_remaining}d)</span>`;
            } else if (ob.status === 'pagado') {
                stBadge = '<span style="background:#e0f2fe; color:#0369a1; padding:2px 8px; border-radius:9999px; font-size:10px; font-weight:800;">✅ PAGADO</span>';
            }
            return `
                <tr>
                    <td><b>${ob.asset_code || ''}</b> ${ob.asset_name || ''}<br><span style="font-size:10px;color:#64748b;">Placa: ${ob.license_plate || '-'}</span></td>
                    <td><b>${ob.title}</b><br><span style="font-size:10px;color:#64748b;">${ob.obligation_type}</span></td>
                    <td style="font-size:11px;">${ob.provider_or_entity || '-'}<br><span style="color:#64748b;">Ref: ${ob.policy_or_ref_number || '-'}</span></td>
                    <td style="font-size:11px; font-weight:700;">${ob.expiration_date || '-'}</td>
                    <td style="text-align:right; font-weight:800; color:#059669;">$${Number(ob.amount_usd || 0).toFixed(2)}</td>
                    <td>${stBadge}</td>
                    <td style="text-align:center; white-space:nowrap;">
                        <button type="button" onclick="openEditFleetObligation(${ob.id})" class="btn-secondary" style="padding:2px 7px; font-size:10.5px; color:#0284c7;" title="Editar obligación">✏️</button>
                        <button type="button" onclick="markObligationPaid(${ob.id})" class="btn-secondary" style="padding:2px 7px; font-size:10.5px; color:#059669;" title="Marcar Pagada / Renovada">✅</button>
                        <button type="button" onclick="deleteFleetObligation(${ob.id})" class="btn-secondary" style="padding:2px 7px; font-size:10.5px; color:#dc2626;" title="Eliminar">&times;</button>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#dc2626;">${err.message}</td></tr>`;
    }
}

async function populateObligationVehiclesSelect() {
    const sel = document.getElementById('ob_asset_id');
    if (!sel || sel.options.length > 1) return;
    try {
        const res = await authFetch(`${getApiBase()}/assets/`);
        if (!res.ok) return;
        const raw = await res.json();
        const list = (Array.isArray(raw) ? raw : []).filter(a => {
            const t = (a.asset_type || '').toLowerCase().trim();
            const code = (a.asset_code || '').toUpperCase();
            return (t === 'vehiculo' || t === 'maquinaria') && !code.startsWith('HERR-');
        });
        sel.innerHTML = '<option value="">-- Seleccionar Vehículo o Maquinaria --</option>' +
            list.map(v => `<option value="${v.id}">[${v.asset_code}] ${v.name} (${v.license_plate || v.asset_type || 'S/P'})</option>`).join('');
    } catch (_) {}
}

export function openEditFleetObligation(obId) {
    const ob = fleetObligationsCache.find(x => x.id === obId);
    if (!ob) return;
    document.getElementById('ob_edit_id').value = ob.id;
    document.getElementById('ob_asset_id').value = ob.asset_id;
    document.getElementById('ob_type').value = ob.obligation_type || 'seguro_rcv';
    document.getElementById('ob_title').value = ob.title || '';
    document.getElementById('ob_provider').value = ob.provider_or_entity || '';
    document.getElementById('ob_policy_num').value = ob.policy_or_ref_number || '';
    document.getElementById('ob_expiration_date').value = ob.expiration_date || '';
    document.getElementById('ob_amount_usd').value = Number(ob.amount_usd || 0).toFixed(2);
    document.getElementById('ob_alert_days').value = ob.alert_days_before || 30;
    const btn = document.getElementById('btnSubmitFleetObligation');
    if (btn) {
        btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Guardar';
        btn.style.background = '#0284c7';
    }
    const cancelBtn = document.getElementById('btnCancelEditObligation');
    if (cancelBtn) cancelBtn.classList.remove('hidden');
}

export function cancelEditFleetObligation() {
    document.getElementById('ob_edit_id').value = '';
    document.getElementById('formFleetObligation').reset();
    document.getElementById('ob_alert_days').value = '30';
    const btn = document.getElementById('btnSubmitFleetObligation');
    if (btn) {
        btn.innerHTML = '<i class="fa-solid fa-plus"></i> Registrar';
        btn.style.background = '#dc2626';
    }
    const cancelBtn = document.getElementById('btnCancelEditObligation');
    if (cancelBtn) cancelBtn.classList.add('hidden');
}

export async function submitCreateFleetObligation(event) {
    if (event && event.preventDefault) event.preventDefault();
    const editId = (document.getElementById('ob_edit_id')?.value || '').trim();
    const assetId = parseInt(document.getElementById('ob_asset_id')?.value || '0');
    const title = (document.getElementById('ob_title')?.value || '').trim();
    if (!assetId || !title) {
        alert('Selecciona el vehículo e indica el nombre de la obligación.');
        return;
    }
    const expVal = document.getElementById('ob_expiration_date')?.value || null;
    const payload = {
        asset_id: assetId,
        obligation_type: document.getElementById('ob_type')?.value || 'seguro_rcv',
        title,
        provider_or_entity: document.getElementById('ob_provider')?.value.trim() || null,
        policy_or_ref_number: document.getElementById('ob_policy_num')?.value.trim() || null,
        expiration_date: expVal ? `${expVal}T12:00:00` : null,
        amount_usd: parseFloat(document.getElementById('ob_amount_usd')?.value) || 0,
        alert_days_before: parseInt(document.getElementById('ob_alert_days')?.value) || 30
    };
    const url = editId ? `${getApiBase()}/assets/obligations/${editId}` : `${getApiBase()}/assets/obligations`;
    const res = await authFetch(url, {
        method: editId ? 'PUT' : 'POST',
        body: JSON.stringify(payload)
    });
    if (res.ok) {
        cancelEditFleetObligation();
        await loadFleetObligations();
    } else {
        const err = await res.json().catch(() => ({}));
        alert('Error: ' + (err.detail || 'No se pudo guardar'));
    }
}

export async function markObligationPaid(obligationId) {
    const res = await authFetch(`${getApiBase()}/assets/obligations/${obligationId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'pagado' })
    });
    if (res.ok) await loadFleetObligations();
}

export async function deleteFleetObligation(obligationId) {
    if (!confirm('¿Eliminar esta obligación de flota?')) return;
    const res = await authFetch(`${getApiBase()}/assets/obligations/${obligationId}`, { method: 'DELETE' });
    if (res.ok) await loadFleetObligations();
}

export async function toggleAssetServiceStatus(assetId, currentlyInService) {
    const endpoint = currentlyInService ? 'release-service' : 'enter-service';
    const res = await authFetch(`${getApiBase()}/assets/${assetId}/${endpoint}`, { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        alert('Error: ' + (data.detail || 'No se pudo cambiar estado de servicio'));
        return;
    }
    if (typeof window.loadFleetList === 'function') await window.loadFleetList();
}

function syncObligationTypesDatalist(items) {
    const dl = document.getElementById('obTypeDatalist');
    if (!dl) return;
    const existing = new Set(Array.from(dl.options).map(o => o.value));
    (items || []).forEach(it => {
        const t = (it.obligation_type || '').trim();
        if (t && !existing.has(t)) {
            existing.add(t);
            const opt = document.createElement('option');
            opt.value = t;
            dl.appendChild(opt);
        }
    });
}

export function addDynamicObligationTypePrompt() {
    const val = prompt('Nombre del nuevo tipo de documentación (ej: Seguro de Carga, ROTC, Certificado):', '');
    if (!val || !val.trim()) return;
    const clean = val.trim();
    const dl = document.getElementById('obTypeDatalist');
    if (dl && !Array.from(dl.options).some(o => o.value.toLowerCase() === clean.toLowerCase())) {
        const opt = document.createElement('option');
        opt.value = clean;
        dl.appendChild(opt);
    }
    const inp = document.getElementById('ob_type');
    if (inp) inp.value = clean;
}

if (typeof window !== 'undefined') {
    window.loadFleetObligations = loadFleetObligations;
    window.openEditFleetObligation = openEditFleetObligation;
    window.cancelEditFleetObligation = cancelEditFleetObligation;
    window.submitCreateFleetObligation = submitCreateFleetObligation;
    window.markObligationPaid = markObligationPaid;
    window.deleteFleetObligation = deleteFleetObligation;
    window.toggleAssetServiceStatus = toggleAssetServiceStatus;
    window.addDynamicObligationTypePrompt = addDynamicObligationTypePrompt;
}
