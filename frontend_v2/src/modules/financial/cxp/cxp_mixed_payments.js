/**
 * DALOR SIGO-P | Submódulo: CXP_MIXED_PAYMENTS.JS
 * Pagos Mixtos Multimoneda ($ USD + Bs.) para Cuentas por Pagar con Tasa y Fecha editables.
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

let currentMixedCxpBalance = 0.0;

export async function openMixedCxpPaymentModal(payableId) {
    const payables = window.allPayablesList || window.lastPayablesList || [];
    const p = payables.find(x => x.id === payableId);
    if (!p) {
        alert('No se encontró la cuenta por pagar.');
        return;
    }
    currentMixedCxpBalance = parseFloat(p.balance_usd || 0);

    document.getElementById('mixed_cxp_id').value = p.id;
    document.getElementById('mixed_cxp_badge').innerText = `${p.invoice_number || 'CXP'} — ${p.supplier_name || ''}`;
    document.getElementById('mixed_cxp_pending_lbl').innerText = `$${currentMixedCxpBalance.toFixed(2)}`;

    const rate = parseFloat(window.currentExchangeRate || p.exchange_rate || 859.06);
    document.getElementById('mixed_cxp_rate').value = rate.toFixed(2);
    document.getElementById('mixed_cxp_date').value = new Date().toISOString().split('T')[0];
    document.getElementById('mixed_cxp_usd_amt').value = '';
    document.getElementById('mixed_cxp_usd_ref').value = '';
    document.getElementById('mixed_cxp_bs_amt').value = '';
    document.getElementById('mixed_cxp_bs_ref').value = '';
    document.getElementById('mixed_cxp_notes').value = '';

    await loadAccountsForMixedCxp();
    recalcMixedCxpPayment();
    if (typeof window.openModal === 'function') window.openModal('modalMixedCxpPayment');
}

async function loadAccountsForMixedCxp() {
    const selUsd = document.getElementById('mixed_cxp_usd_account');
    const selBs = document.getElementById('mixed_cxp_bs_account');
    if (!selUsd || !selBs) return;
    try {
        const res = await authFetch(`${getApiBase()}/financial/accounts`);
        if (!res.ok) return;
        const accounts = (await res.json()).filter(a => a.is_active !== false);
        const opts = accounts.map(a =>
            `<option value="${a.id}" data-name="${a.name}">${a.name} [${(a.owner_scope || 'empresa').toUpperCase()} - ${a.currency}] ($${Number(a.current_balance || 0).toFixed(2)})</option>`
        ).join('');
        selUsd.innerHTML = `<option value="">-- Seleccionar Cuenta USD --</option>${opts}`;
        selBs.innerHTML = `<option value="">-- Seleccionar Cuenta Bs. --</option>${opts}`;

        const defUsd = accounts.find(a => a.currency === 'USD');
        const defBs = accounts.find(a => a.currency === 'VES' || a.currency === 'BS');
        if (defUsd) selUsd.value = String(defUsd.id);
        if (defBs) selBs.value = String(defBs.id);
    } catch (_) {}
}

export function recalcMixedCxpPayment() {
    const rate = parseFloat(document.getElementById('mixed_cxp_rate')?.value) || 0;
    const usdPart = parseFloat(document.getElementById('mixed_cxp_usd_amt')?.value) || 0;
    const bsPart = parseFloat(document.getElementById('mixed_cxp_bs_amt')?.value) || 0;

    const bsToUsd = rate > 0 ? (bsPart / rate) : 0;
    const usdToBs = rate > 0 ? (usdPart * rate) : 0;
    const totalUsd = usdPart + bsToUsd;
    const totalBs = bsPart + usdToBs;
    const remaining = Math.max(0, currentMixedCxpBalance - totalUsd);

    const bsEqEl = document.getElementById('mixed_cxp_bs_eq_usd');
    if (bsEqEl) bsEqEl.innerText = `Equiv: $${bsToUsd.toFixed(2)} USD`;

    const usdEqEl = document.getElementById('mixed_cxp_usd_eq_bs');
    if (usdEqEl) usdEqEl.innerText = `Equiv: Bs. ${usdToBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const totEl = document.getElementById('mixed_cxp_total_summary');
    if (totEl) {
        totEl.innerHTML = `Total Pago: <b>$${totalUsd.toFixed(2)} USD</b> &bull; <b>Bs. ${totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b> &bull; Restante: <b style="color:${remaining <= 0.01 ? '#059669' : '#dc2626'};">$${remaining.toFixed(2)}</b>`;
    }
}

export function autoFillRemainingToBsCxp() {
    const rate = parseFloat(document.getElementById('mixed_cxp_rate')?.value) || 0;
    const usdPart = parseFloat(document.getElementById('mixed_cxp_usd_amt')?.value) || 0;
    if (rate <= 0) return;
    const remUsd = Math.max(0, currentMixedCxpBalance - usdPart);
    document.getElementById('mixed_cxp_bs_amt').value = (remUsd * rate).toFixed(2);
    recalcMixedCxpPayment();
}

export async function submitMixedCxpPayment(event) {
    if (event && event.preventDefault) event.preventDefault();
    const payableId = parseInt(document.getElementById('mixed_cxp_id').value);
    const rate = parseFloat(document.getElementById('mixed_cxp_rate').value) || 0;
    const dateVal = document.getElementById('mixed_cxp_date').value || null;
    const notes = (document.getElementById('mixed_cxp_notes').value || '').trim() || null;

    if (rate <= 0) {
        alert('Ingresa una tasa de cambio válida.');
        return;
    }

    const tranches = [];
    const usdAmt = parseFloat(document.getElementById('mixed_cxp_usd_amt').value) || 0;
    if (usdAmt > 0) {
        const accSel = document.getElementById('mixed_cxp_usd_account');
        const accId = accSel?.value ? parseInt(accSel.value) : null;
        const accName = accSel?.selectedOptions?.[0]?.dataset?.name || null;
        tranches.push({
            currency: 'USD',
            amount_usd: usdAmt,
            amount_bs: Number((usdAmt * rate).toFixed(2)),
            payment_method: document.getElementById('mixed_cxp_usd_method')?.value || 'transferencia',
            financial_account_id: accId,
            bank_account: accName,
            reference_number: document.getElementById('mixed_cxp_usd_ref')?.value.trim() || null
        });
    }

    const bsAmt = parseFloat(document.getElementById('mixed_cxp_bs_amt').value) || 0;
    if (bsAmt > 0) {
        const accSel = document.getElementById('mixed_cxp_bs_account');
        const accId = accSel?.value ? parseInt(accSel.value) : null;
        const accName = accSel?.selectedOptions?.[0]?.dataset?.name || null;
        tranches.push({
            currency: 'BS',
            amount_usd: Number((bsAmt / rate).toFixed(2)),
            amount_bs: bsAmt,
            payment_method: document.getElementById('mixed_cxp_bs_method')?.value || 'transferencia',
            financial_account_id: accId,
            bank_account: accName,
            reference_number: document.getElementById('mixed_cxp_bs_ref')?.value.trim() || null
        });
    }

    if (!tranches.length) {
        alert('Ingresa un monto en $ USD y/o en Bs.');
        return;
    }

    const btn = document.getElementById('btnSubmitMixedCxp');
    const orig = btn ? btn.innerHTML : '';
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Procesando...';
    }
    try {
        const res = await authFetch(`${getApiBase()}/financial/cxp/${payableId}/mixed-payment`, {
            method: 'POST',
            body: JSON.stringify({
                exchange_rate: rate,
                payment_date: dateVal ? `${dateVal}T12:00:00` : null,
                tranches,
                notes
            })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.detail || 'Error al registrar pago mixto');
        alert(`✅ ${data.message}`);
        if (typeof window.closeModal === 'function') window.closeModal('modalMixedCxpPayment');
        if (typeof window.loadPayablesList === 'function') await window.loadPayablesList();
        if (typeof window.loadTreasuryDashboard === 'function') await window.loadTreasuryDashboard();
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
    window.openMixedCxpPaymentModal = openMixedCxpPaymentModal;
    window.recalcMixedCxpPayment = recalcMixedCxpPayment;
    window.autoFillRemainingToBsCxp = autoFillRemainingToBsCxp;
    window.submitMixedCxpPayment = submitMixedCxpPayment;
}
