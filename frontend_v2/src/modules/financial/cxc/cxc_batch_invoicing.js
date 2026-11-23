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
let editingBatchPaymentId = null;
let selectedBatchPaymentIds = new Set();
let currentSummaryInvoiceId = null;

function escBatchHtml(val) {
    return String(val ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function fmtBs(val) {
    return Number(val || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export async function openBatchInvoicePaymentsModal(preselectedClientId = null) {
    editingBatchPaymentId = null;
    selectedBatchPaymentIds = new Set();
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
            clients.map(c => `<option value="${c.id}">${escBatchHtml(c.name)} (${escBatchHtml(c.rif || 'S/R')})</option>`).join('');
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

function renderBatchUnbilledPaymentsTable() {
    const tbody = document.getElementById('batch_inv_payments_tbody');
    if (!tbody) return;

    if (!batchUnbilledPaymentsCache.length) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:14px; color:#64748b;">Este cliente no tiene abonos pendientes por facturación fiscal.</td></tr>';
        recalcBatchInvoiceSelection();
        return;
    }

    tbody.innerHTML = batchUnbilledPaymentsCache.map(p => {
        const isChecked = selectedBatchPaymentIds.has(p.id);
        const usd = Number(p.amount_usd || 0);
        const rate = Number(p.exchange_rate || 0);
        const bs = Number(p.amount_bs || 0) > 0 ? Number(p.amount_bs) : (usd * rate);

        if (editingBatchPaymentId === p.id) {
            return `
                <tr style="background:#f5f3ff;">
                    <td style="text-align:center;">
                        <input type="checkbox" class="batch-inv-chk" value="${p.id}" data-usd="${usd}" data-bs="${bs}" ${isChecked ? 'checked' : ''} onchange="onToggleBatchPaymentChk(${p.id}, this.checked)">
                    </td>
                    <td style="font-size:11px;">${escBatchHtml(p.payment_date || '-')}</td>
                    <td style="font-size:11px; font-weight:700;">${escBatchHtml(p.invoice_number || '-')}</td>
                    <td style="font-size:11px;">${escBatchHtml(p.payment_method || '-')} <span style="color:#64748b;">(${escBatchHtml(p.reference_number || '-')})</span></td>
                    <td style="text-align:right; font-weight:800; color:#334155;">$${usd.toFixed(2)}</td>
                    <td style="text-align:right;">
                        <input type="number" step="any" inputmode="decimal" min="0.01" id="batch_edit_rate_${p.id}" value="${rate}" oninput="onEditBatchPaymentRateInput(${p.id}, ${usd})" class="form-input" style="font-size:11px; padding:3px 6px; width:90px; text-align:right; font-weight:700;">
                    </td>
                    <td style="text-align:right;">
                        <input type="number" step="any" inputmode="decimal" min="0.01" id="batch_edit_bs_${p.id}" value="${bs.toFixed(2)}" oninput="onEditBatchPaymentBsInput(${p.id}, ${usd})" class="form-input" style="font-size:11px; padding:3px 6px; width:120px; text-align:right; font-weight:800; color:#059669;">
                    </td>
                    <td style="text-align:center; white-space:nowrap;">
                        <button type="button" onclick="saveEditBatchPayment(${p.id})" title="Guardar tasa y Bs" class="btn-primary" style="padding:3px 7px; background:#059669; font-size:10.5px; margin-right:3px;"><i class="fa-solid fa-check"></i></button>
                        <button type="button" onclick="cancelEditBatchPayment()" title="Cancelar" class="btn-secondary" style="padding:3px 7px; font-size:10.5px;"><i class="fa-solid fa-xmark"></i></button>
                    </td>
                </tr>
            `;
        }

        return `
            <tr style="${isChecked ? 'background:#f0fdf4;' : ''}">
                <td style="text-align:center;">
                    <input type="checkbox" class="batch-inv-chk" value="${p.id}" data-usd="${usd}" data-bs="${bs}" ${isChecked ? 'checked' : ''} onchange="onToggleBatchPaymentChk(${p.id}, this.checked)">
                </td>
                <td style="font-size:11px;">${escBatchHtml(p.payment_date || '-')}</td>
                <td style="font-size:11px; font-weight:700;">${escBatchHtml(p.invoice_number || '-')}</td>
                <td style="font-size:11px;">${escBatchHtml(p.payment_method || '-')} <span style="color:#64748b;">(${escBatchHtml(p.reference_number || '-')})</span></td>
                <td style="text-align:right; font-weight:700; color:#334155;">$${usd.toFixed(2)}</td>
                <td style="text-align:right; font-size:11px; color:#1e40af; font-weight:700;">${rate > 0 ? rate.toFixed(2) : '-'}</td>
                <td style="text-align:right; font-weight:800; color:#059669;">Bs. ${fmtBs(bs)}</td>
                <td style="text-align:center;">
                    <button type="button" onclick="startEditBatchPayment(${p.id})" title="Editar tasa BCV o monto en Bs de este abono" class="btn-secondary" style="padding:2px 7px; color:#2563eb; font-size:10.5px;">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
    recalcBatchInvoiceSelection();
}

export function onToggleBatchPaymentChk(paymentId, checked) {
    if (checked) selectedBatchPaymentIds.add(paymentId);
    else selectedBatchPaymentIds.delete(paymentId);
    recalcBatchInvoiceSelection();
}

export function startEditBatchPayment(paymentId) {
    editingBatchPaymentId = paymentId;
    renderBatchUnbilledPaymentsTable();
    const rateInput = document.getElementById(`batch_edit_rate_${paymentId}`);
    if (rateInput) {
        rateInput.focus();
        rateInput.select();
    }
}

export function cancelEditBatchPayment() {
    editingBatchPaymentId = null;
    renderBatchUnbilledPaymentsTable();
}

export function onEditBatchPaymentRateInput(paymentId, usd) {
    const rate = parseFloat(document.getElementById(`batch_edit_rate_${paymentId}`)?.value) || 0;
    const bsEl = document.getElementById(`batch_edit_bs_${paymentId}`);
    if (bsEl && rate > 0 && usd > 0) {
        bsEl.value = (usd * rate).toFixed(2);
    }
}

export function onEditBatchPaymentBsInput(paymentId, usd) {
    const bs = parseFloat(document.getElementById(`batch_edit_bs_${paymentId}`)?.value) || 0;
    const rateEl = document.getElementById(`batch_edit_rate_${paymentId}`);
    if (rateEl && bs > 0 && usd > 0) {
        rateEl.value = (bs / usd).toFixed(4);
    }
}

export async function saveEditBatchPayment(paymentId) {
    const rate = parseFloat(document.getElementById(`batch_edit_rate_${paymentId}`)?.value);
    const bs = parseFloat(document.getElementById(`batch_edit_bs_${paymentId}`)?.value);
    if ((!Number.isFinite(rate) || rate <= 0) && (!Number.isFinite(bs) || bs <= 0)) {
        alert('Indica una tasa BCV o monto en Bolívares mayor a 0.');
        return;
    }
    try {
        const res = await authFetch(`${getApiBase()}/financial/cxc/unbilled-payments/${paymentId}`, {
            method: 'PATCH',
            body: JSON.stringify({
                exchange_rate: Number.isFinite(rate) && rate > 0 ? rate : null,
                amount_bs: Number.isFinite(bs) && bs > 0 ? bs : null
            })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.detail || 'No se pudo actualizar el abono');
        if (data.payment) {
            batchUnbilledPaymentsCache = batchUnbilledPaymentsCache.map(item =>
                item.id === paymentId
                    ? Object.assign({}, item, {
                        exchange_rate: data.payment.exchange_rate,
                        amount_bs: data.payment.amount_bs
                    })
                    : item
            );
        }
        editingBatchPaymentId = null;
        renderBatchUnbilledPaymentsTable();
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

export async function loadUnbilledPaymentsForBatch() {
    const clientId = document.getElementById('batch_inv_client_id')?.value || '';
    const tbody = document.getElementById('batch_inv_payments_tbody');
    if (!tbody) return;
    editingBatchPaymentId = null;
    selectedBatchPaymentIds = new Set();

    if (!clientId) {
        batchUnbilledPaymentsCache = [];
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:14px; color:#64748b;">Selecciona un cliente para ver sus abonos pendientes por facturar.</td></tr>';
        recalcBatchInvoiceSelection();
        return;
    }

    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:14px; color:#64748b;">Cargando abonos...</td></tr>';
    try {
        const res = await authFetch(`${getApiBase()}/financial/cxc/unbilled-payments?client_id=${encodeURIComponent(clientId)}`);
        if (!res.ok) throw new Error('Error consultando abonos');
        batchUnbilledPaymentsCache = await res.json();
        renderBatchUnbilledPaymentsTable();
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:14px; color:#dc2626;">${escBatchHtml(err.message)}</td></tr>`;
    }
}

export function toggleAllBatchInvoicePayments(checked) {
    selectedBatchPaymentIds.clear();
    if (checked) {
        batchUnbilledPaymentsCache.forEach(p => selectedBatchPaymentIds.add(p.id));
    }
    renderBatchUnbilledPaymentsTable();
}

export function recalcBatchInvoiceSelection() {
    const selected = batchUnbilledPaymentsCache.filter(p => selectedBatchPaymentIds.has(p.id));
    const paidUsdHist = selected.reduce((acc, p) => acc + Number(p.amount_usd || 0), 0);
    const emissionRate = parseFloat(document.getElementById('batch_inv_exchange_rate')?.value) || 0;
    const paidBsReal = selected.reduce((acc, p) => {
        const bs = Number(p.amount_bs || 0);
        if (bs > 0) return acc + bs;
        const r = Number(p.exchange_rate || emissionRate || 0);
        return acc + Number(p.amount_usd || 0) * r;
    }, 0);

    const mode = document.querySelector('input[name="batch_inv_mode"]:checked')?.value || 'lote';
    const ivaMode = document.getElementById('batch_inv_iva_mode')?.value || 'included_16';
    const basis = document.getElementById('batch_inv_billing_basis')?.value || 'bs_real';

    const customWrap = document.getElementById('batch_inv_custom_base_wrap');
    if (customWrap) customWrap.style.display = ivaMode === 'custom_base' ? 'flex' : 'none';

    const rawPaidBs = basis === 'usd_rate' ? (paidUsdHist * emissionRate) : paidBsReal;
    let baseBs = 0, exemptBs = 0, ivaBs = 0, totalFiscalBs = rawPaidBs, balanceBs = 0;

    if (ivaMode === 'custom_base') {
        const customInput = document.getElementById('batch_inv_custom_base_bs');
        baseBs = Math.max(0, parseFloat(customInput?.value) || 0);
        exemptBs = Math.max(0, Math.round((rawPaidBs - baseBs) * 100) / 100);
        ivaBs = Math.round(baseBs * 0.16 * 100) / 100;
        totalFiscalBs = Math.round((baseBs + exemptBs + ivaBs) * 100) / 100;
        balanceBs = Math.max(0, Math.round((totalFiscalBs - rawPaidBs) * 100) / 100);
    } else if (ivaMode === 'add_16') {
        baseBs = Math.round(rawPaidBs * 100) / 100;
        ivaBs = Math.round(baseBs * 0.16 * 100) / 100;
        totalFiscalBs = Math.round((baseBs + ivaBs) * 100) / 100;
        balanceBs = ivaBs;
    } else if (ivaMode === 'exempt') {
        exemptBs = Math.round(rawPaidBs * 100) / 100;
        baseBs = 0;
        ivaBs = 0;
        totalFiscalBs = exemptBs;
    } else {
        totalFiscalBs = Math.round(rawPaidBs * 100) / 100;
        baseBs = Math.round((totalFiscalBs / 1.16) * 100) / 100;
        ivaBs = Math.round((totalFiscalBs - baseBs) * 100) / 100;
    }

    const refUsd = emissionRate > 0 ? (totalFiscalBs / emissionRate) : paidUsdHist;

    const countEl = document.getElementById('batch_inv_selected_count');
    if (countEl) countEl.innerText = `${selected.length} abono(s)`;

    const totalEl = document.getElementById('batch_inv_selected_total');
    if (totalEl) {
        totalEl.innerText = `Total Factura Fiscal: Bs. ${fmtBs(totalFiscalBs)} (Ref. emisión: $${refUsd.toFixed(2)} | Abonos hist.: $${paidUsdHist.toFixed(2)})`;
    }

    const breakdownEl = document.getElementById('batch_inv_fiscal_breakdown');
    if (breakdownEl) {
        const parts = [
            `<span><b>Base Imponible:</b> Bs. ${fmtBs(baseBs)}</span>`,
            exemptBs > 0 ? `<span><b>Exento (0%):</b> Bs. ${fmtBs(exemptBs)}</span>` : '',
            `<span><b>IVA (16%):</b> Bs. ${fmtBs(ivaBs)}</span>`,
            balanceBs > 0.01 ? `<span style="color:#b45309; font-weight:800;">Saldo IVA por cobrar/retener: Bs. ${fmtBs(balanceBs)}</span>` : `<span style="color:#059669; font-weight:700;">Factura cubierta al 100%</span>`
        ].filter(Boolean);
        breakdownEl.innerHTML = parts.join(' &bull; ');
    }

    const hintEl = document.getElementById('batch_inv_mode_hint');
    if (hintEl) {
        hintEl.innerText = mode === 'individual'
            ? `Se emitirán ${selected.length} factura(s) fiscal(es) individuales en Bolívares reales (sin leyendas internas).`
            : `Se emitirá 1 factura fiscal limpia en Bolívares por Bs. ${fmtBs(totalFiscalBs)} (tasa emisión ${emissionRate.toFixed(2)}).`;
    }
}

export async function submitBatchInvoicePayments(event) {
    if (event && event.preventDefault) event.preventDefault();
    const paymentIds = Array.from(selectedBatchPaymentIds);
    if (!paymentIds.length) {
        alert('Selecciona al menos un abono para facturar.');
        return;
    }
    const mode = document.querySelector('input[name="batch_inv_mode"]:checked')?.value || 'lote';
    const ivaMode = document.getElementById('batch_inv_iva_mode')?.value || 'included_16';
    const billingBasis = document.getElementById('batch_inv_billing_basis')?.value || 'bs_real';
    const customBaseVal = parseFloat(document.getElementById('batch_inv_custom_base_bs')?.value);
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
                billing_basis: billingBasis,
                custom_taxable_base_bs: (ivaMode === 'custom_base' && Number.isFinite(customBaseVal) && customBaseVal >= 0) ? customBaseVal : null,
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

export async function openBatchInvoiceSummaryModal(cxcId) {
    currentSummaryInvoiceId = cxcId;
    const badge = document.getElementById('batch_summary_inv_badge');
    const kpis = document.getElementById('batch_summary_kpis');
    const tbody = document.getElementById('batch_summary_tbody');
    const revBtn = document.getElementById('btn_revert_batch_invoice');
    if (badge) badge.innerText = `#${cxcId}`;
    if (kpis) kpis.innerHTML = '';
    if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:14px; color:#64748b;">Cargando ficha interna...</td></tr>';
    if (revBtn) revBtn.style.display = 'none';
    if (typeof window.openModal === 'function') window.openModal('modalBatchInvoiceSummary');

    try {
        const res = await authFetch(`${getApiBase()}/financial/cxc/${cxcId}/batch-summary`);
        const d = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(d.detail || 'Error cargando ficha de abonos');

        if (badge) badge.innerText = `${d.invoice_number || '-'} (${d.client_name || ''})`;
        if (kpis) {
            kpis.innerHTML = `
                <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; padding:8px 10px;">
                    <div style="font-size:10px; font-weight:700; color:#166534;">FACTURA FISCAL (Bs)</div>
                    <div style="font-size:13px; font-weight:900; color:#059669;">Bs. ${fmtBs(d.fiscal_amount_bs)}</div>
                    <div style="font-size:10px; color:#475569;">Tasa emisión: ${Number(d.fiscal_emission_rate || 0).toFixed(2)}</div>
                </div>
                <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:8px; padding:8px 10px;">
                    <div style="font-size:10px; font-weight:700; color:#1e40af;">CONTRAVALOR USD EMISIÓN</div>
                    <div style="font-size:13px; font-weight:900; color:#1d4ed8;">$${Number(d.fiscal_amount_usd_ref || 0).toFixed(2)}</div>
                    <div style="font-size:10px; color:#475569;">Bs / Tasa emisión</div>
                </div>
                <div style="background:#faf5ff; border:1px solid #ddd6fe; border-radius:8px; padding:8px 10px;">
                    <div style="font-size:10px; font-weight:700; color:#6d28d9;">ABONOS HISTÓRICOS USD</div>
                    <div style="font-size:13px; font-weight:900; color:#7c3aed;">$${Number(d.historical_total_usd || 0).toFixed(2)}</div>
                    <div style="font-size:10px; color:#475569;">Tasa prom. pond.: ${Number(d.weighted_avg_rate || 0).toFixed(2)}</div>
                </div>
            `;
        }

        const pays = Array.isArray(d.payments) ? d.payments : [];
        if (!pays.length) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:14px; color:#64748b;">Sin abonos de lote vinculados (posiblemente ya reversados).</td></tr>';
        } else {
            tbody.innerHTML = pays.map(p => `
                <tr>
                    <td style="font-size:11px;">${escBatchHtml(p.payment_date || '-')}</td>
                    <td style="font-size:11px; font-weight:700;">${escBatchHtml(p.origin_invoice || '-')}</td>
                    <td style="font-size:11px;">${escBatchHtml(p.payment_method || '-')} <span style="color:#64748b;">(${escBatchHtml(p.reference_number || '-')})</span></td>
                    <td style="text-align:right; font-weight:700;">$${Number(p.amount_usd_original || 0).toFixed(2)}</td>
                    <td style="text-align:right; color:#1e40af; font-weight:700;">${Number(p.exchange_rate_payment || 0).toFixed(2)}</td>
                    <td style="text-align:right; font-weight:800; color:#059669;">Bs. ${fmtBs(p.amount_bs_real)}</td>
                </tr>
            `).join('');
        }
        if (revBtn) revBtn.style.display = d.can_revert ? '' : 'none';
    } catch (err) {
        if (tbody) tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:14px; color:#dc2626;">${escBatchHtml(err.message)}</td></tr>`;
    }
}

export async function revertBatchInvoiceFromSummary() {
    if (!currentSummaryInvoiceId) return;
    if (!confirm('¿Reversar esta Facturación de Lote?\n\nLa factura quedará ANULADA y todos los abonos regresarán intactos y disponibles a sus cuentas origen.')) {
        return;
    }
    const btn = document.getElementById('btn_revert_batch_invoice');
    if (btn) btn.disabled = true;
    try {
        const res = await authFetch(`${getApiBase()}/financial/cxc/${currentSummaryInvoiceId}/revert-batch-invoice`, {
            method: 'POST'
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.detail || 'No se pudo reversar la facturación de lote');
        if (typeof window.closeModal === 'function') window.closeModal('modalBatchInvoiceSummary');
        if (typeof window.loadReceivablesList === 'function') await window.loadReceivablesList();
        alert(`✅ ${data.message}`);
    } catch (err) {
        alert('Error: ' + err.message);
    } finally {
        if (btn) btn.disabled = false;
    }
}

if (typeof window !== 'undefined') {
    window.openBatchInvoicePaymentsModal = openBatchInvoicePaymentsModal;
    window.loadUnbilledPaymentsForBatch = loadUnbilledPaymentsForBatch;
    window.toggleAllBatchInvoicePayments = toggleAllBatchInvoicePayments;
    window.onToggleBatchPaymentChk = onToggleBatchPaymentChk;
    window.startEditBatchPayment = startEditBatchPayment;
    window.cancelEditBatchPayment = cancelEditBatchPayment;
    window.onEditBatchPaymentRateInput = onEditBatchPaymentRateInput;
    window.onEditBatchPaymentBsInput = onEditBatchPaymentBsInput;
    window.saveEditBatchPayment = saveEditBatchPayment;
    window.recalcBatchInvoiceSelection = recalcBatchInvoiceSelection;
    window.submitBatchInvoicePayments = submitBatchInvoicePayments;
    window.openBatchInvoiceSummaryModal = openBatchInvoiceSummaryModal;
    window.revertBatchInvoiceFromSummary = revertBatchInvoiceFromSummary;
}
