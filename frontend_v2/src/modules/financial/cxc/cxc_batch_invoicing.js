/**
 * DALOR SIGO-P | Submódulo: CXC_BATCH_INVOICING.JS
 * Facturación de Abonos registrados en modalidad Individual o Lote General.
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

let batchUnbilledPaymentsCache = [];

export async function openBatchInvoicePaymentsModal(preselectedClientId = null) {
    const sel = document.getElementById('batch_inv_client_id');
    if (sel) {
        let clients = window.allClients || [];
        if (!clients.length) {
            try {
                const res = await authFetch(`${getApiBase()}/clients/`);
                if (res.ok) {
                    clients = await res.json();
                    window.allClients = clients;
                }
            } catch (_) {}
        }
        sel.innerHTML = '<option value="">-- Selecciona un Cliente --</option>' +
            clients.map(c => `<option value="${c.id}">${c.name} (${c.rif || 'S/R'})</option>`).join('');
        if (preselectedClientId) sel.value = String(preselectedClientId);
    }

    const rateEl = document.getElementById('batch_inv_exchange_rate');
    if (rateEl) rateEl.value = (window.currentExchangeRate || 859.06).toFixed(2);

    const dateEl = document.getElementById('batch_inv_issue_date');
    if (dateEl && !dateEl.value) dateEl.value = new Date().toISOString().split('T')[0];

    const conceptEl = document.getElementById('batch_inv_concept');
    if (conceptEl) conceptEl.value = '';

    if (typeof window.openModal === 'function') window.openModal('modalBatchInvoicePayments');
    await loadUnbilledPaymentsForBatch();
}

export async function loadUnbilledPaymentsForBatch() {
    const clientId = document.getElementById('batch_inv_client_id')?.value || '';
    const tbody = document.getElementById('batch_inv_payments_tbody');
    if (!tbody) return;

    if (!clientId) {
        batchUnbilledPaymentsCache = [];
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:14px; color:#64748b;">Selecciona un cliente para ver sus abonos pendientes por facturar.</td></tr>';
        recalcBatchInvoiceSelection();
        return;
    }

    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:14px; color:#64748b;">Cargando abonos...</td></tr>';
    try {
        const res = await authFetch(`${getApiBase()}/financial/cxc/unbilled-payments?client_id=${encodeURIComponent(clientId)}`);
        if (!res.ok) throw new Error('Error consultando abonos');
        batchUnbilledPaymentsCache = await res.json();

        if (!batchUnbilledPaymentsCache.length) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:14px; color:#64748b;">Este cliente no tiene abonos pendientes por facturación fiscal.</td></tr>';
            recalcBatchInvoiceSelection();
            return;
        }

        tbody.innerHTML = batchUnbilledPaymentsCache.map(p => `
            <tr>
                <td style="text-align:center;">
                    <input type="checkbox" class="batch-inv-chk" value="${p.id}" data-usd="${p.amount_usd}" onchange="recalcBatchInvoiceSelection()">
                </td>
                <td style="font-size:11px;">${p.payment_date || '-'}</td>
                <td style="font-size:11px; font-weight:700;">${p.invoice_number || '-'}</td>
                <td style="font-size:11px;">${p.payment_method || '-'} <span style="color:#64748b;">(${p.reference_number || '-'})</span></td>
                <td style="text-align:right; font-weight:800; color:#059669;">$${Number(p.amount_usd || 0).toFixed(2)}</td>
                <td style="font-size:11px; color:#475569;">${p.notes || '-'}</td>
            </tr>
        `).join('');
        recalcBatchInvoiceSelection();
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:14px; color:#dc2626;">${err.message}</td></tr>`;
    }
}

export function toggleAllBatchInvoicePayments(checked) {
    document.querySelectorAll('.batch-inv-chk').forEach(chk => {
        chk.checked = !!checked;
    });
    recalcBatchInvoiceSelection();
}

export function recalcBatchInvoiceSelection() {
    const chks = Array.from(document.querySelectorAll('.batch-inv-chk:checked'));
    const paidUsd = chks.reduce((acc, el) => acc + (parseFloat(el.dataset.usd) || 0), 0);
    const rate = parseFloat(document.getElementById('batch_inv_exchange_rate')?.value) || 0;
    const mode = document.querySelector('input[name="batch_inv_mode"]:checked')?.value || 'lote';
    const ivaMode = document.getElementById('batch_inv_iva_mode')?.value || 'included_16';

    let totalInvUsd = paidUsd;
    if (ivaMode === 'add_16') {
        totalInvUsd = Math.round(paidUsd * 1.16 * 100) / 100;
    }

    const countEl = document.getElementById('batch_inv_selected_count');
    if (countEl) countEl.innerText = `${chks.length} abono(s)`;

    const totalEl = document.getElementById('batch_inv_selected_total');
    if (totalEl) {
        const extra = ivaMode === 'add_16' ? ` [Abonado: $${paidUsd.toFixed(2)} + IVA]` : '';
        totalEl.innerText = `$${totalInvUsd.toFixed(2)} (Bs. ${(totalInvUsd * rate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})${extra}`;
    }

    const hintEl = document.getElementById('batch_inv_mode_hint');
    if (hintEl) {
        hintEl.innerText = mode === 'individual'
            ? `Se emitirán ${chks.length} factura(s) fiscal(es) individuales (1 por cada abono).`
            : `Se emitirá 1 factura fiscal consolidada en Lote General por $${totalInvUsd.toFixed(2)}.`;
    }
}

export async function submitBatchInvoicePayments(event) {
    if (event && event.preventDefault) event.preventDefault();
    const paymentIds = Array.from(document.querySelectorAll('.batch-inv-chk:checked')).map(el => parseInt(el.value));
    if (!paymentIds.length) {
        alert('Selecciona al menos un abono para facturar.');
        return;
    }
    const mode = document.querySelector('input[name="batch_inv_mode"]:checked')?.value || 'lote';
    const ivaMode = document.getElementById('batch_inv_iva_mode')?.value || 'included_16';
    const rateVal = parseFloat(document.getElementById('batch_inv_exchange_rate')?.value);
    const dateVal = document.getElementById('batch_inv_issue_date')?.value || null;
    const concept = (document.getElementById('batch_inv_concept')?.value || '').trim() || null;

    const btn = document.getElementById('btnSubmitBatchInvoicePayments');
    const orig = btn ? btn.innerHTML : '';
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Emitiendo...';
    }
    try {
        const res = await authFetch(`${getApiBase()}/financial/cxc/invoice-payments`, {
            method: 'POST',
            body: JSON.stringify({
                payment_ids: paymentIds,
                mode,
                iva_mode: ivaMode,
                exchange_rate: (!isNaN(rateVal) && rateVal > 0) ? rateVal : null,
                issue_date: dateVal ? `${dateVal}T12:00:00` : null,
                custom_concept: concept
            })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.detail || 'Error al facturar abonos');
        if (typeof window.closeModal === 'function') window.closeModal('modalBatchInvoicePayments');
        if (typeof window.loadReceivablesList === 'function') await window.loadReceivablesList();
        const created = Array.isArray(data.created_invoices) ? data.created_invoices : [];
        if (created.length && typeof window.printOfficialFiscalInvoice === 'function') {
            for (const inv of created) {
                if (inv && inv.id) {
                    window.printOfficialFiscalInvoice(inv.id);
                }
            }
        }
        if (typeof window.showToastNotification === 'function') {
            window.showToastNotification(`✅ ${data.message}`, 'success');
        } else {
            alert(`✅ ${data.message}`);
        }
    } catch (err) {
        alert('Error: ' + err.message);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = orig;
        }
    }
}

if (typeof window !== 'undefined') {
    window.openBatchInvoicePaymentsModal = openBatchInvoicePaymentsModal;
    window.loadUnbilledPaymentsForBatch = loadUnbilledPaymentsForBatch;
    window.toggleAllBatchInvoicePayments = toggleAllBatchInvoicePayments;
    window.recalcBatchInvoiceSelection = recalcBatchInvoiceSelection;
    window.submitBatchInvoicePayments = submitBatchInvoicePayments;
}
