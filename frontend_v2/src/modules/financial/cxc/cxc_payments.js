/**
 * DALOR SIGO-P | Módulo: CXC_PAYMENTS.JS
 * Imputación de Pagos Directos de Clientes, Cálculo en Bs y Asignación
 */

var API_BASE = window.API_BASE || (window.location.origin + '/api/v1');

function authFetch(url, options = {}) {
    var _t = sessionStorage.getItem('dalor_token') || localStorage.getItem('dalor_token') || window.authToken || '';
    var _h = Object.assign({}, options.headers || {});
    if (_t) _h['Authorization'] = 'Bearer ' + _t;
    if (options.body && !(options.body instanceof FormData) && !_h['Content-Type']) {
        _h['Content-Type'] = 'application/json';
    }
    if (options.body instanceof FormData) {
        delete _h['Content-Type'];
    }
    return window.fetch(url, Object.assign({}, options, { headers: _h }));
}

async function openReceiveClientPaymentModal() {

    const form = document.getElementById("receiveClientPaymentForm");

    if (form) form.reset();

    populateSelectDropdowns();

    if (!window.allProjects || window.allProjects.length === 0) {

        try {

            const resP = await authFetch(`${API_BASE}/projects/`);

            if (resP.ok) {

                window.allProjects = await resP.json();

            }

        } catch(e) {

            console.error("Error fetching projects for payment modal:", e);

        }

    }

    const projSel = document.getElementById("rcp_project_id");

    if (projSel) {

        projSel.innerHTML = `<option value="">-- Sin Proyecto Específico (Anticipo a Cuenta) --</option>`;

    }

    // Cargar cuentas financieras en el selector de destino

    const accSel = document.getElementById("rcp_financial_account_id");

    if (accSel) {

        accSel.innerHTML = `<option value="">-- Por Defecto según Método --</option>`;

        try {

            const accRes = await authFetch(`${API_BASE}/financial/accounts`);

            if (accRes.ok) {

                const accounts = await accRes.json();

                accounts.forEach(a => {

                    const opt = document.createElement("option");

                    opt.value = a.id;

                    opt.textContent = `${a.account_name} (${a.currency.toUpperCase()})`;

                    accSel.appendChild(opt);

                });

            }

        } catch(e) {}

    }

    const rateEl = document.getElementById("rcp_rate");

    if (rateEl) rateEl.value = (typeof EXCHANGE_RATE !== 'undefined' ? EXCHANGE_RATE : 850.0).toFixed(2);

    calcClientPaymentBs();

    openModal("modalReceiveClientPayment");

}

async function onRcpClientChanged() {

    const clientSelect = document.getElementById("rcp_client_id");

    const projSelect = document.getElementById("rcp_project_id");

    if (!projSelect) return;

    const clientId = parseInt(clientSelect?.value);

    if (!clientId) {

        projSelect.innerHTML = `<option value="">-- Sin Proyecto Específico (Anticipo a Cuenta) --</option>`;

        return;

    }

    let allProjs = (window.allProjects && window.allProjects.length > 0) ? window.allProjects : ((typeof State !== 'undefined' && Array.isArray(State.projects) && State.projects.length > 0) ? State.projects : []);

    if (allProjs.length === 0) {

        try {

            const resP = await authFetch(`${API_BASE}/projects/`);

            if (resP.ok) {

                allProjs = window.allProjects = await resP.json();

            }

        } catch(e) {

            console.error("Error fetching projects on client change:", e);

        }

    }

    const clientProjects = allProjs.filter(p => {

        const pCliId = p.client_id || (p.client && p.client.id);

        const st = (p.status || '').toLowerCase();

        return pCliId === clientId && st !== 'cancelado' && st !== 'cerrado';

    });

    if (clientProjects.length === 0) {

        projSelect.innerHTML = `<option value="">-- Sin Obras Activas (Anticipo a Cuenta) --</option>`;

    } else {

        projSelect.innerHTML = `<option value="">-- Sin Proyecto Específico (Anticipo a Cuenta) --</option>` +

            clientProjects.map(p => `<option value="${p.id}">[${p.code}] ${p.name}</option>`).join('');

    }

}

function calcClientPaymentBs() {

    const usd = parseFloat(document.getElementById("rcp_amount_usd")?.value) || 0.0;

    const rate = parseFloat(document.getElementById("rcp_rate")?.value) || EXCHANGE_RATE || 800.0;

    const bs = usd * rate;

    const preview = document.getElementById("rcp_total_bs_preview");

    if (preview) {

        preview.innerText = `Bs. ${bs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`;

    }

}

async function submitDirectClientPayment(event) {

    event.preventDefault();

    const clientId = parseInt(document.getElementById("rcp_client_id").value);

    const projIdVal = document.getElementById("rcp_project_id").value;

    const projId = projIdVal ? parseInt(projIdVal) : null;

    const accIdVal = document.getElementById("rcp_financial_account_id")?.value;

    const finAccId = accIdVal ? parseInt(accIdVal) : null;

    const amountUsd = parseFloat(document.getElementById("rcp_amount_usd").value) || 0.0;

    const rate = parseFloat(document.getElementById("rcp_rate").value) || EXCHANGE_RATE || 800.0;

    if (!clientId || amountUsd <= 0) {

        alert("Por favor selecciona un cliente y un monto válido.");

        return;

    }

    const payload = {

        client_id: clientId,

        project_id: projId,

        financial_account_id: finAccId,

        amount_usd: amountUsd,

        exchange_rate: rate,

        payment_method: document.getElementById("rcp_method").value,

        reference_number: document.getElementById("rcp_ref").value.trim() || `COB-${Date.now().toString().slice(-6)}`,

        concept: document.getElementById("rcp_concept").value.trim() || "Abono / Cobranza de Cliente",

        notes: document.getElementById("rcp_notes").value.trim()

    };

    try {

        const res = await authFetch(`${API_BASE}/financial/direct-collection`, {

            method: "POST",

            headers: { "Content-Type": "application/json" },

            body: JSON.stringify(payload)

        });

        if (res.ok) {

            const data = await res.json();

            alert(`✅ ${data.message}\nComprobante Nº: ${data.receipt_number}`);

            closeModal("modalReceiveClientPayment");

            if (typeof loadReceivablesList === "function") loadReceivablesList();

            if (typeof loadTreasurySummary === "function") loadTreasurySummary();

            if (typeof loadCashFlowMatrix === "function") loadCashFlowMatrix();

            if (typeof loadProjectsList === "function") loadProjectsList();

        } else {

            const err = await res.json();

            alert("Error: " + (err.detail || JSON.stringify(err)));

        }

    } catch (e) {
        alert("Error de conexión al registrar cobro: " + e.message);
    }
}

// ==============================================================================
// ⚡ COBRANZA MIXTA UNIFICADA (SINGLE-ENTRY MULTI-SPLIT)
// ==============================================================================
function getLiveBcvRate() {
    let rate = 897.54;
    try {
        const stored = localStorage.getItem('dalor_bcv_rate');
        if (stored) {
            const parsed = parseFloat(stored);
            if (!isNaN(parsed) && parsed > 0) rate = parsed;
        } else if (typeof window.CURRENT_BCV_RATE === 'number' && window.CURRENT_BCV_RATE > 0) {
            rate = window.CURRENT_BCV_RATE;
        } else if (typeof EXCHANGE_RATE === 'number' && EXCHANGE_RATE > 0) {
            rate = EXCHANGE_RATE;
        }
    } catch (_) {}
    return rate;
}

async function openSplitPaymentModal(receivableId) {
    let rec = null;
    if (window.allReceivables && Array.isArray(window.allReceivables)) {
        rec = window.allReceivables.find(r => r.id === receivableId);
    }

    if (!rec) {
        try {
            const res = await authFetch(`${API_BASE}/financial/cxc`);
            if (res.ok) {
                const list = await res.json();
                window.allReceivables = list;
                rec = list.find(r => r.id === receivableId);
            }
        } catch (_) {}
    }

    if (!rec) {
        alert("No se encontró la información de la factura.");
        return;
    }

    const bcvRate = getLiveBcvRate();

    // Llenar cabecera y datos ocultos
    document.getElementById("split_receivable_id").value = rec.id;
    document.getElementById("split_orig_balance_usd").value = (rec.balance_usd || 0).toFixed(2);
    document.getElementById("split_tax_amount_usd").value = (rec.tax_amount_usd || (rec.amount_usd * 0.16 / 1.16) || 0).toFixed(2);
    document.getElementById("split_taxable_base_usd").value = (rec.taxable_base_usd || (rec.amount_usd / 1.16) || 0).toFixed(2);

    document.getElementById("split_disp_invoice_number").innerText = rec.invoice_number || `FAC-${rec.id}`;
    document.getElementById("split_disp_client_name").innerText = rec.client_name || "Cliente Corporativo";
    document.getElementById("split_disp_total_usd").innerText = `$${(rec.amount_usd || 0).toFixed(2)}`;
    document.getElementById("split_disp_balance_usd").innerText = `$${(rec.balance_usd || 0).toFixed(2)}`;
    document.getElementById("split_disp_bcv_rate").innerText = `${bcvRate.toFixed(2)} Bs/$`;

    // Resetear formulario
    const chkIva = document.getElementById("split_chk_ret_iva");
    if (chkIva) chkIva.checked = false;
    const boxIva = document.getElementById("split_box_ret_iva");
    if (boxIva) boxIva.style.display = "none";
    document.getElementById("split_ret_iva_usd").value = "";
    document.getElementById("split_ret_iva_voucher").value = "";

    const chkIslr = document.getElementById("split_chk_ret_islr");
    if (chkIslr) chkIslr.checked = false;
    const boxIslr = document.getElementById("split_box_ret_islr");
    if (boxIslr) boxIslr.style.display = "none";
    document.getElementById("split_ret_islr_usd").value = "";
    document.getElementById("split_ret_islr_voucher").value = "";

    document.getElementById("split_ves_amount").value = "";
    document.getElementById("split_ves_usd").value = "";
    document.getElementById("split_ves_ref").value = "";

    document.getElementById("split_usd_amount").value = "";
    document.getElementById("split_usd_ref").value = "";
    document.getElementById("split_notes").value = "";

    recalcSplitPayment();

    if (typeof window.openModal === 'function') {
        window.openModal("modalSplitPayment");
    } else {
        const m = document.getElementById("modalSplitPayment");
        if (m) m.classList.remove("hidden");
    }
}

function onSplitToggleRetIva(checked) {
    const box = document.getElementById("split_box_ret_iva");
    if (box) box.style.display = checked ? "flex" : "none";
    if (checked) {
        const taxUsd = parseFloat(document.getElementById("split_tax_amount_usd").value) || 0.0;
        const rate = parseFloat(document.getElementById("split_ret_iva_rate").value) || 75.0;
        document.getElementById("split_ret_iva_usd").value = (taxUsd * (rate / 100.0)).toFixed(2);
    } else {
        document.getElementById("split_ret_iva_usd").value = "";
    }
    recalcSplitPayment();
}

function onSplitToggleRetIslr(checked) {
    const box = document.getElementById("split_box_ret_islr");
    if (box) box.style.display = checked ? "flex" : "none";
    if (checked) {
        const baseUsd = parseFloat(document.getElementById("split_taxable_base_usd").value) || 0.0;
        const rate = parseFloat(document.getElementById("split_ret_islr_rate").value) || 2.0;
        document.getElementById("split_ret_islr_usd").value = (baseUsd * (rate / 100.0)).toFixed(2);
    } else {
        document.getElementById("split_ret_islr_usd").value = "";
    }
    recalcSplitPayment();
}

function onSplitVesInput(val) {
    const rate = getLiveBcvRate();
    const ves = parseFloat(val) || 0.0;
    const usd = rate > 0 ? (ves / rate) : 0.0;
    const usdInput = document.getElementById("split_ves_usd");
    if (usdInput) usdInput.value = usd > 0 ? usd.toFixed(2) : "";
    recalcSplitPayment();
}

function onSplitVesUsdInput(val) {
    const rate = getLiveBcvRate();
    const usd = parseFloat(val) || 0.0;
    const ves = usd * rate;
    const vesInput = document.getElementById("split_ves_amount");
    if (vesInput) vesInput.value = ves > 0 ? ves.toFixed(2) : "";
    recalcSplitPayment();
}

function autoFillRemainingToUsd() {
    const origBalance = parseFloat(document.getElementById("split_orig_balance_usd").value) || 0.0;
    const chkIva = document.getElementById("split_chk_ret_iva")?.checked;
    const ivaUsd = chkIva ? (parseFloat(document.getElementById("split_ret_iva_usd")?.value) || 0.0) : 0.0;
    const chkIslr = document.getElementById("split_chk_ret_islr")?.checked;
    const islrUsd = chkIslr ? (parseFloat(document.getElementById("split_ret_islr_usd")?.value) || 0.0) : 0.0;
    const vesUsd = parseFloat(document.getElementById("split_ves_usd")?.value) || 0.0;

    const remaining = Math.max(0, origBalance - (ivaUsd + islrUsd + vesUsd));
    const usdInput = document.getElementById("split_usd_amount");
    if (usdInput) usdInput.value = remaining > 0 ? remaining.toFixed(2) : "";
    recalcSplitPayment();
}

function recalcSplitPayment(isManualUsd = false) {
    const origBalance = parseFloat(document.getElementById("split_orig_balance_usd")?.value) || 0.0;

    const chkIva = document.getElementById("split_chk_ret_iva")?.checked;
    const ivaUsd = chkIva ? (parseFloat(document.getElementById("split_ret_iva_usd")?.value) || 0.0) : 0.0;

    const chkIslr = document.getElementById("split_chk_ret_islr")?.checked;
    const islrUsd = chkIslr ? (parseFloat(document.getElementById("split_ret_islr_usd")?.value) || 0.0) : 0.0;

    const vesUsd = parseFloat(document.getElementById("split_ves_usd")?.value) || 0.0;
    const usdAmount = parseFloat(document.getElementById("split_usd_amount")?.value) || 0.0;

    const totalImputed = parseFloat((ivaUsd + islrUsd + vesUsd + usdAmount).toFixed(2));
    const diff = parseFloat((origBalance - totalImputed).toFixed(2));

    const sumEl = document.getElementById("split_disp_sum_imputed");
    if (sumEl) sumEl.innerText = `$${totalImputed.toFixed(2)}`;

    const badgeEl = document.getElementById("split_disp_diff_badge");
    const btnSubmit = document.getElementById("btnSubmitSplitPayment");

    if (badgeEl) {
        if (Math.abs(diff) <= 0.01 && totalImputed > 0) {
            badgeEl.style.background = "#dcfce7";
            badgeEl.style.color = "#15803d";
            badgeEl.innerHTML = `<i class="fa-solid fa-circle-check"></i> Cuadrado Exacto ($0.00)`;
            if (btnSubmit) btnSubmit.disabled = false;
        } else if (diff > 0.01) {
            badgeEl.style.background = "#eff6ff";
            badgeEl.style.color = "#1e40af";
            badgeEl.innerHTML = `<i class="fa-solid fa-hourglass-half"></i> Resta por cubrir: $${diff.toFixed(2)}`;
            if (btnSubmit) btnSubmit.disabled = false; // Permite abonos parciales
        } else if (diff < -0.01) {
            badgeEl.style.background = "#fee2e2";
            badgeEl.style.color = "#dc2626";
            badgeEl.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Sobregiro: -$${Math.abs(diff).toFixed(2)}`;
            if (btnSubmit) btnSubmit.disabled = true; // Bloquea si supera el saldo
        } else {
            badgeEl.style.background = "#f1f5f9";
            badgeEl.style.color = "#475569";
            badgeEl.innerText = `Ingresa montos para imputar`;
            if (btnSubmit) btnSubmit.disabled = true;
        }
    }
}

async function submitSplitPayment(event) {
    if (event && event.preventDefault) event.preventDefault();

    const recId = parseInt(document.getElementById("split_receivable_id").value);
    const origBalance = parseFloat(document.getElementById("split_orig_balance_usd").value) || 0.0;
    const bcvRate = getLiveBcvRate();

    const items = [];

    // 1. Retención IVA
    if (document.getElementById("split_chk_ret_iva")?.checked) {
        const ivaUsd = parseFloat(document.getElementById("split_ret_iva_usd").value) || 0.0;
        const voucher = (document.getElementById("split_ret_iva_voucher").value || "").trim();
        if (ivaUsd > 0) {
            items.push({
                payment_type: "retencion_iva",
                amount_usd: ivaUsd,
                payment_method: "retencion_seniat",
                voucher_number: voucher || "S/C-IVA",
                reference_number: voucher,
                notes: `Retención de IVA SENIAT`
            });
        }
    }

    // 2. Retención ISLR
    if (document.getElementById("split_chk_ret_islr")?.checked) {
        const islrUsd = parseFloat(document.getElementById("split_ret_islr_usd").value) || 0.0;
        const voucher = (document.getElementById("split_ret_islr_voucher").value || "").trim();
        if (islrUsd > 0) {
            items.push({
                payment_type: "retencion_islr",
                amount_usd: islrUsd,
                payment_method: "retencion_seniat",
                voucher_number: voucher || "S/C-ISLR",
                reference_number: voucher,
                notes: `Retención de ISLR SENIAT`
            });
        }
    }

    // 3. Pago en Bolívares
    const vesUsd = parseFloat(document.getElementById("split_ves_usd").value) || 0.0;
    const vesAmount = parseFloat(document.getElementById("split_ves_amount").value) || 0.0;
    if (vesUsd > 0) {
        const vesBank = document.getElementById("split_ves_bank").value;
        const vesRef = (document.getElementById("split_ves_ref").value || "").trim();
        items.push({
            payment_type: "bolivares",
            amount_usd: vesUsd,
            amount_bs: vesAmount,
            exchange_rate: bcvRate,
            payment_method: "transferencia_bs",
            bank_account: vesBank,
            reference_number: vesRef || `REF-BS-${Date.now().toString().slice(-6)}`,
            notes: `Pago en Bolívares (${vesAmount.toFixed(2)} Bs @ ${bcvRate.toFixed(2)})`
        });
    }

    // 4. Pago en Divisas USD
    const usdAmount = parseFloat(document.getElementById("split_usd_amount").value) || 0.0;
    if (usdAmount > 0) {
        const usdAcc = document.getElementById("split_usd_account").value;
        const usdRef = (document.getElementById("split_usd_ref").value || "").trim();
        items.push({
            payment_type: "divisas_usd",
            amount_usd: usdAmount,
            amount_bs: roundFinancial(usdAmount * bcvRate),
            exchange_rate: bcvRate,
            payment_method: "divisas",
            bank_account: usdAcc,
            reference_number: usdRef || `REF-USD-${Date.now().toString().slice(-6)}`,
            notes: `Pago en Divisas USD`
        });
    }

    if (items.length === 0) {
        alert("Por favor ingresa al menos un concepto de cobro (Retención, Bolívares o Divisas).");
        return;
    }

    const totalSum = items.reduce((acc, it) => acc + it.amount_usd, 0.0);
    if (totalSum > (origBalance + 0.05)) {
        alert(`El cobro total ($${totalSum.toFixed(2)}) supera el saldo pendiente ($${origBalance.toFixed(2)}).`);
        return;
    }

    const payload = {
        items: items,
        payment_date: new Date().toISOString(),
        notes: (document.getElementById("split_notes").value || "").trim()
    };

    const submitBtn = document.getElementById("btnSubmitSplitPayment");
    const origHtml = submitBtn ? submitBtn.innerHTML : "";
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Procesando...`;
    }

    try {
        const res = await authFetch(`${API_BASE}/financial/cxc/${recId}/split-payment`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            const data = await res.json();
            alert(`✅ ${data.message}\nFactura: ${data.invoice_number}\nNuevo Saldo: $${(data.balance_usd || 0).toFixed(2)}`);
            closeModal("modalSplitPayment");
            if (typeof loadReceivablesList === 'function') loadReceivablesList();
            if (typeof loadTreasurySummary === 'function') loadTreasurySummary();
            if (typeof loadCashFlowMatrix === 'function') loadCashFlowMatrix();
        } else {
            const err = await res.json().catch(() => ({}));
            alert("Error: " + (err.detail || JSON.stringify(err)));
        }
    } catch (err) {
        alert("Error de conexión: " + err.message);
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = origHtml;
        }
    }
}

// ==============================================================================
// ↩️ REVERSIÓN DE COBROS Y REAPERTURA DE FACTURA
// ==============================================================================
async function openRevertCxcPaymentModal(receivableId, invoiceNumber) {
    document.getElementById("revert_cxc_badge").innerText = invoiceNumber;
    const tbody = document.getElementById("revert_cxc_payments_tbody");
    if (tbody) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 16px; color: #94a3b8;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando pagos...</td></tr>`;
    }

    if (typeof window.openModal === 'function') {
        window.openModal("modalRevertCxcPayment");
    } else {
        const m = document.getElementById("modalRevertCxcPayment");
        if (m) m.classList.remove("hidden");
    }

    try {
        const res = await authFetch(`${API_BASE}/financial/cxc/${receivableId}/payments`);
        if (!res.ok) throw new Error("Error al consultar pagos de la factura.");
        const payments = await res.json();

        if (payments.length === 0) {
            if (tbody) tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px; color: #64748b;">No hay pagos registrados para esta factura.</td></tr>`;
            return;
        }

        if (tbody) {
            tbody.innerHTML = payments.map(p => {
                const ref = p.voucher_number || p.reference_number || `PAGO-${p.id}`;
                const method = (p.payment_type || p.payment_method || 'Cobro').toUpperCase();
                return `
                    <tr style="border-bottom: 1px solid #f1f5f9;">
                        <td style="padding: 8px; color: #64748b;">${p.payment_date || '-'}</td>
                        <td style="padding: 8px; font-weight: 700; color: #1e293b;">${method}</td>
                        <td style="padding: 8px; color: #0284c7; font-family: monospace;">${ref}</td>
                        <td style="padding: 8px; text-align: right; font-weight: 800; color: #059669;">$${parseFloat(p.amount_usd || 0).toFixed(2)}</td>
                        <td style="padding: 8px; text-align: center;">
                            <button type="button" onclick="confirmRevertPayment(${receivableId}, ${p.id}, ${p.amount_usd}, '${ref}')" class="btn-secondary" style="font-size: 10px; padding: 3px 8px; color: #dc2626; border-color: #fecaca; background: #fef2f2; font-weight: 700; cursor: pointer;">
                                <i class="fa-solid fa-rotate-left"></i> Reversar
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
        }
    } catch (err) {
        if (tbody) tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #dc2626; padding: 16px;">${err.message}</td></tr>`;
    }
}

async function confirmRevertPayment(receivableId, paymentId, amountUsd, ref) {
    if (!confirm(`¿Estás seguro de REVERSAR el cobro de $${parseFloat(amountUsd).toFixed(2)} (Ref: ${ref})?\n\nEl saldo de la factura se reabrirá automáticamente.`)) {
        return;
    }

    try {
        const res = await authFetch(`${API_BASE}/financial/cxc/${receivableId}/revert-payment/${paymentId}`, {
            method: "POST"
        });

        if (res.ok) {
            const data = await res.json();
            alert(`✅ ${data.message}\nNuevo Saldo Pendiente: $${(data.balance_usd || 0).toFixed(2)}`);
            openRevertCxcPaymentModal(receivableId, data.invoice_number);
            if (typeof loadReceivablesList === 'function') loadReceivablesList();
            if (typeof loadTreasurySummary === 'function') loadTreasurySummary();
            if (typeof loadCashFlowMatrix === 'function') loadCashFlowMatrix();
        } else {
            const err = await res.json().catch(() => ({}));
            alert("Error: " + (err.detail || JSON.stringify(err)));
        }
    } catch (err) {
        alert("Error de conexión: " + err.message);
    }
}

// ==============================================================================
// ✏️ EDICIÓN QUIRÚRGICA DE FACTURA / CxC
// ==============================================================================
async function openEditReceivableModal(receivableId) {
    let rec = null;
    if (window.allReceivables && Array.isArray(window.allReceivables)) {
        rec = window.allReceivables.find(r => r.id === receivableId);
    }

    if (!rec) {
        try {
            const res = await authFetch(`${API_BASE}/financial/cxc`);
            if (res.ok) {
                const list = await res.json();
                window.allReceivables = list;
                rec = list.find(r => r.id === receivableId);
            }
        } catch (_) {}
    }

    if (!rec) {
        alert("No se encontró la factura a editar.");
        return;
    }

    document.getElementById("edit_cxc_id").value = rec.id;
    document.getElementById("edit_cxc_badge").innerText = rec.invoice_number || `FAC-${rec.id}`;
    document.getElementById("edit_cxc_invoice_number").value = rec.invoice_number || "";
    document.getElementById("edit_cxc_control_number").value = rec.control_number || "";
    document.getElementById("edit_cxc_description").value = rec.description || "";

    const issueDateStr = rec.issue_date ? rec.issue_date.split('T')[0] : "";
    const dueDateStr = rec.due_date ? rec.due_date.split('T')[0] : "";
    document.getElementById("edit_cxc_issue_date").value = issueDateStr;
    document.getElementById("edit_cxc_due_date").value = dueDateStr;

    document.getElementById("edit_cxc_amount_usd").value = parseFloat(rec.amount_usd || 0).toFixed(2);
    document.getElementById("edit_cxc_base_usd").value = parseFloat(rec.taxable_base_usd || 0).toFixed(2);
    document.getElementById("edit_cxc_tax_usd").value = parseFloat(rec.tax_amount_usd || 0).toFixed(2);
    document.getElementById("edit_cxc_notes").value = rec.notes || "";

    if (typeof window.openModal === 'function') {
        window.openModal("modalEditReceivable");
    } else {
        const m = document.getElementById("modalEditReceivable");
        if (m) m.classList.remove("hidden");
    }
}

function onEditCxcBaseChange(val) {
    const base = parseFloat(val) || 0.0;
    const tax = roundFinancial(base * 0.16);
    const total = roundFinancial(base + tax);
    document.getElementById("edit_cxc_tax_usd").value = tax.toFixed(2);
    document.getElementById("edit_cxc_amount_usd").value = total.toFixed(2);
}

function onEditCxcTaxChange(val) {
    const base = parseFloat(document.getElementById("edit_cxc_base_usd").value) || 0.0;
    const tax = parseFloat(val) || 0.0;
    document.getElementById("edit_cxc_amount_usd").value = (base + tax).toFixed(2);
}

async function submitEditReceivable(event) {
    if (event && event.preventDefault) event.preventDefault();

    const recId = parseInt(document.getElementById("edit_cxc_id").value);
    const payload = {
        invoice_number: document.getElementById("edit_cxc_invoice_number").value.trim(),
        control_number: document.getElementById("edit_cxc_control_number").value.trim() || null,
        description: document.getElementById("edit_cxc_description").value.trim(),
        issue_date: document.getElementById("edit_cxc_issue_date").value || null,
        due_date: document.getElementById("edit_cxc_due_date").value || null,
        amount_usd: parseFloat(document.getElementById("edit_cxc_amount_usd").value) || 0.0,
        taxable_base_usd: parseFloat(document.getElementById("edit_cxc_base_usd").value) || 0.0,
        tax_amount_usd: parseFloat(document.getElementById("edit_cxc_tax_usd").value) || 0.0,
        notes: document.getElementById("edit_cxc_notes").value.trim() || null
    };

    try {
        const res = await authFetch(`${API_BASE}/financial/cxc/${recId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            const data = await res.json();
            alert(`✅ ${data.message}`);
            closeModal("modalEditReceivable");
            if (typeof loadReceivablesList === 'function') loadReceivablesList();
        } else {
            const err = await res.json().catch(() => ({}));
            alert("Error: " + (err.detail || JSON.stringify(err)));
        }
    } catch (err) {
        alert("Error de conexión: " + err.message);
    }
}

// ==============================================================================
// ❌ ANULACIÓN FORMAL DE FACTURA
// ==============================================================================
function openCancelReceivableModal(receivableId, invoiceNumber) {
    document.getElementById("cancel_cxc_id").value = receivableId;
    document.getElementById("cancel_cxc_badge").innerText = invoiceNumber;
    document.getElementById("cancel_cxc_reason").value = "";

    if (typeof window.openModal === 'function') {
        window.openModal("modalCancelReceivable");
    } else {
        const m = document.getElementById("modalCancelReceivable");
        if (m) m.classList.remove("hidden");
    }
}

async function submitCancelReceivable(event) {
    if (event && event.preventDefault) event.preventDefault();

    const recId = parseInt(document.getElementById("cancel_cxc_id").value);
    const reason = (document.getElementById("cancel_cxc_reason").value || "").trim();

    if (!reason) {
        alert("Debe indicar el motivo formal de la anulación.");
        return;
    }

    try {
        const res = await authFetch(`${API_BASE}/financial/cxc/${recId}/cancel`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cancellation_reason: reason })
        });

        if (res.ok) {
            const data = await res.json();
            alert(`✅ Factura anulada exitosamente.`);
            closeModal("modalCancelReceivable");
            if (typeof loadReceivablesList === 'function') loadReceivablesList();
            if (typeof loadTreasurySummary === 'function') loadTreasurySummary();
            if (typeof loadCashFlowMatrix === 'function') loadCashFlowMatrix();
        } else {
            const err = await res.json().catch(() => ({}));
            alert("Error: " + (err.detail || JSON.stringify(err)));
        }
    } catch (err) {
        alert("Error de conexión: " + err.message);
    }
}

// PUENTE GLOBAL WINDOW
if (typeof window !== 'undefined') {
    window.openReceiveClientPaymentModal = openReceiveClientPaymentModal;
    window.onRcpClientChanged = onRcpClientChanged;
    window.calcClientPaymentBs = calcClientPaymentBs;
    window.submitDirectClientPayment = submitDirectClientPayment;

    // Cobro Mixto
    window.openSplitPaymentModal = openSplitPaymentModal;
    window.onSplitToggleRetIva = onSplitToggleRetIva;
    window.onSplitToggleRetIslr = onSplitToggleRetIslr;
    window.onSplitVesInput = onSplitVesInput;
    window.onSplitVesUsdInput = onSplitVesUsdInput;
    window.autoFillRemainingToUsd = autoFillRemainingToUsd;
    window.recalcSplitPayment = recalcSplitPayment;
    window.submitSplitPayment = submitSplitPayment;

    // Reversión y Reapertura
    window.openRevertCxcPaymentModal = openRevertCxcPaymentModal;
    window.confirmRevertPayment = confirmRevertPayment;

    // Edición
    window.openEditReceivableModal = openEditReceivableModal;
    window.onEditCxcBaseChange = onEditCxcBaseChange;
    window.onEditCxcTaxChange = onEditCxcTaxChange;
    window.submitEditReceivable = submitEditReceivable;

    // Anulación
    window.openCancelReceivableModal = openCancelReceivableModal;
    window.submitCancelReceivable = submitCancelReceivable;
}

export {
    openReceiveClientPaymentModal,
    onRcpClientChanged,
    calcClientPaymentBs,
    submitDirectClientPayment,
    openSplitPaymentModal,
    onSplitToggleRetIva,
    onSplitToggleRetIslr,
    onSplitVesInput,
    onSplitVesUsdInput,
    autoFillRemainingToUsd,
    recalcSplitPayment,
    submitSplitPayment,
    openRevertCxcPaymentModal,
    confirmRevertPayment,
    openEditReceivableModal,
    onEditCxcBaseChange,
    onEditCxcTaxChange,
    submitEditReceivable,
    openCancelReceivableModal,
    submitCancelReceivable
};
