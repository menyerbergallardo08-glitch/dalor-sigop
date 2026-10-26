/**
 * DALOR SIGO-P | Módulo: TREASURY_TRANSACTIONS.JS
 * Cálculos multimoneda (USD/Bs/BCV), modales de transacción, cobros y reembolsos
 */

const API_BASE = (typeof window !== 'undefined' && window.API_BASE) || '/api/v1';

function safeParseFloat(val) {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    let s = String(val).trim();
    if (!s) return 0;
    let hasComma = s.includes(',');
    let hasDot = s.includes('.');
    if (hasComma && hasDot) {
        if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
            s = s.replace(/\./g, '').replace(',', '.');
        } else {
            s = s.replace(/,/g, '');
        }
    } else if (hasComma) {
        s = s.replace(',', '.');
    }
    s = s.replace(/[^0-9.-]/g, '');
    let res = parseFloat(s);
    return isNaN(res) ? 0 : res;
}

function roundFinancial(num) {
    return Math.round(((parseFloat(num) || 0) + Number.EPSILON) * 100) / 100;
}

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

function getActiveOfficialRate() {
    return window.BCV_DATA?.rate || (typeof EXCHANGE_RATE !== 'undefined' ? EXCHANGE_RATE : (window.EXCHANGE_RATE || 875.65));
}

function calcFinTransFromUsd() {
    const amountUsd = parseFloat(document.getElementById("fin_trans_amount_usd")?.value) || 0;
    const customRate = parseFloat(document.getElementById("fin_trans_custom_rate")?.value) || getActiveOfficialRate();
    const bsInput = document.getElementById("fin_trans_amount_bs");
    const equivLbl = document.getElementById("fin_bs_equiv_lbl");
    const rateLbl = document.getElementById("fin_bcv_rate_lbl");
    const officialRate = getActiveOfficialRate();

    const totalBs = roundFinancial(amountUsd * customRate);
    if (bsInput && document.activeElement !== bsInput) {
        bsInput.value = totalBs > 0 ? totalBs.toFixed(2) : "";
    }
    if (rateLbl) rateLbl.innerText = `Bs. ${officialRate.toFixed(2)}`;
    if (equivLbl) equivLbl.innerText = `Bs. ${totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`;

    const dispHint = document.getElementById("disp_invoice_amount_hint");
    if (dispHint) {
        dispHint.innerText = `$${amountUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
}

function calcFinTransFromBs() {
    const amountBs = parseFloat(document.getElementById("fin_trans_amount_bs")?.value) || 0;
    const customRate = parseFloat(document.getElementById("fin_trans_custom_rate")?.value) || getActiveOfficialRate();
    const usdInput = document.getElementById("fin_trans_amount_usd");
    const equivLbl = document.getElementById("fin_bs_equiv_lbl");
    const maxBalance = parseFloat(document.getElementById("fin_trans_amount_usd")?.max) || 99999999;

    if (customRate > 0) {
        const computedUsd = roundFinancial(amountBs / customRate);
        if (usdInput) {
            usdInput.value = computedUsd > 0 ? Math.min(computedUsd, maxBalance).toFixed(2) : "";
        }
        if (equivLbl) equivLbl.innerText = `Bs. ${amountBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`;
    }
}

function calcRetentionFromBs() {
    const amountBs = parseFloat(document.getElementById("fin_trans_retention_bs")?.value) || 0;
    const rate = parseFloat(document.getElementById("fin_trans_retention_rate")?.value) || getActiveOfficialRate();
    const usdCalcEl = document.getElementById("fin_trans_retention_usd_calc");
    const amountUsdInput = document.getElementById("fin_trans_amount_usd");
    const maxBalance = parseFloat(amountUsdInput?.max) || 99999999;

    if (rate > 0) {
        const computedUsd = roundFinancial(amountBs / rate);
        const finalUsd = Math.min(computedUsd, maxBalance);
        if (amountUsdInput) {
            amountUsdInput.value = finalUsd > 0 ? finalUsd.toFixed(2) : "";
        }
        if (usdCalcEl) {
            usdCalcEl.innerText = `$${finalUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;
        }
    }
}

async function onFinTransDateChanged() {
    const dateVal = document.getElementById("fin_trans_date")?.value;
    if (!dateVal) return;

    try {
        const res = await authFetch(`${API_BASE}/financial/bcv-rates/history?limit=90`);
        if (res.ok) {
            const data = await res.json();
            const history = data.history || [];
            const found = history.find(h => h.rate_date === dateVal);
            if (found && found.rate > 0) {
                const targetRate = parseFloat(found.rate);
                const retRateInput = document.getElementById("fin_trans_retention_rate");
                const customRateInput = document.getElementById("fin_trans_custom_rate");
                if (retRateInput) retRateInput.value = targetRate.toFixed(2);
                if (customRateInput) customRateInput.value = targetRate.toFixed(2);

                const method = document.getElementById("fin_trans_method")?.value || "";
                if (method.startsWith("retencion_")) {
                    calcRetentionFromBs();
                } else {
                    calcFinTransFromUsd();
                }
            }
        }
    } catch (e) {
        console.warn("No se pudo cargar la tasa histórica para la fecha:", e);
    }
}

function onFinTransMethodChanged() {
    const method = document.getElementById("fin_trans_method")?.value || "";
    const retentionBox = document.getElementById("fin_trans_retention_box");
    const standardBox = document.getElementById("fin_trans_standard_box");
    const accountWrapper = document.getElementById("fin_trans_account_wrapper");
    const refLbl = document.getElementById("fin_trans_ref_lbl");
    const refInput = document.getElementById("fin_trans_ref");
    const dateLbl = document.getElementById("fin_trans_date_lbl");
    const activeRate = getActiveOfficialRate();

    if (method.startsWith("retencion_")) {
        if (retentionBox) retentionBox.style.display = "block";
        if (standardBox) standardBox.style.display = "none";
        if (accountWrapper) accountWrapper.style.display = "none";
        if (refLbl) refLbl.innerText = "Nº Comprobante de Retención Fiscal *";
        if (refInput) refInput.placeholder = "Ej: 202610000045 (Número impreso en el comprobante)";
        if (dateLbl) dateLbl.innerText = "Fecha Emisión Comprobante";

        const retRateInput = document.getElementById("fin_trans_retention_rate");
        if (retRateInput && (!retRateInput.value || parseFloat(retRateInput.value) <= 0)) {
            retRateInput.value = activeRate.toFixed(2);
        }
        calcRetentionFromBs();
    } else {
        if (retentionBox) retentionBox.style.display = "none";
        if (standardBox) standardBox.style.display = "block";
        if (accountWrapper) accountWrapper.style.display = "block";
        if (refLbl) refLbl.innerText = "Nº Referencia Bancaria *";
        if (refInput) refInput.placeholder = "Ej: 049182 / REF-BANCARIA";
        if (dateLbl) dateLbl.innerText = "Fecha de Liquidación / Entrada en Banco";

        const customRateInput = document.getElementById("fin_trans_custom_rate");
        if (customRateInput && (!customRateInput.value || parseFloat(customRateInput.value) <= 0)) {
            customRateInput.value = activeRate.toFixed(2);
        }
        calcFinTransFromUsd();
    }
}

function calcFinTransBsEquiv() {
    calcFinTransFromUsd();
}

function onFinTransAccountChanged() {
    const acc = document.getElementById("fin_trans_account")?.value || "";
    const methodSel = document.getElementById("fin_trans_method");
    if (acc.includes("(Bs)") && methodSel) {
        if (methodSel.value === 'efectivo_divisa' || methodSel.value === 'zelle') {
            methodSel.value = 'transferencia';
        }
    } else if (acc.includes("Zelle") && methodSel) {
        methodSel.value = 'zelle';
    } else if (acc.includes("Efectivo USD") && methodSel) {
        methodSel.value = 'efectivo_divisa';
    }
    onFinTransMethodChanged();
}

function openClientRefundModal(receivableId, maxSurplus, clientName, invoiceNumber) {
    const recList = window.allReceivablesList || [];
    const item = recList.find(x => x.id === receivableId) || {};
    const inv = invoiceNumber || item.invoice_number || 'S/F';
    const cName = clientName || item.client_name || 'Cliente';
    const computedSurplus = Math.max(0, roundFinancial((item.paid_amount_usd || 0) - (item.amount_usd || 0)));
    const surplusNum = maxSurplus !== undefined ? parseFloat(maxSurplus) : computedSurplus;

    const idEl = document.getElementById("refund_receivable_id");
    if (idEl) idEl.value = receivableId;
    
    const infoEl = document.getElementById("refund_client_info");
    if (infoEl) infoEl.innerHTML = `<i class="fa-solid fa-user"></i> Cliente: <strong>${cName}</strong> &bull; Factura: <strong>${inv}</strong>`;
    
    const surplusEl = document.getElementById("refund_max_surplus");
    if (surplusEl) surplusEl.innerText = `$${surplusNum.toFixed(2)}`;
    
    const amountInput = document.getElementById("refund_amount_usd");
    if (amountInput) {
        amountInput.max = surplusNum;
        amountInput.value = surplusNum > 0 ? surplusNum.toFixed(2) : '0.00';
    }
    
    const refInput = document.getElementById("refund_reference");
    if (refInput) refInput.value = '';
    
    const notesInput = document.getElementById("refund_notes");
    if (notesInput) notesInput.value = `Devolución saldo a favor por ${inv}`;
    
    if (typeof openModal === 'function') openModal("modalClientRefund");
    else if (typeof window !== 'undefined' && typeof window.openModal === 'function') window.openModal("modalClientRefund");
}

async function submitClientRefund(e) {
    if (e && e.preventDefault) e.preventDefault();
    const id = document.getElementById("refund_receivable_id")?.value;
    const amount = parseFloat(document.getElementById("refund_amount_usd")?.value) || 0;
    const account = document.getElementById("refund_source_account")?.value || "";
    const method = document.getElementById("refund_payment_method")?.value || "transferencia";
    const ref = (document.getElementById("refund_reference")?.value || "").trim();
    const notes = (document.getElementById("refund_notes")?.value || "").trim();

    if (!id) {
        alert("Error: No se identificó la cuenta por cobrar.");
        return;
    }
    if (amount <= 0) {
        alert("El monto a reembolsar debe ser mayor a 0.");
        return;
    }
    if (!ref) {
        alert("Debes indicar el número de referencia o comprobante de la devolución.");
        return;
    }

    const payload = {
        amount_usd: amount,
        payment_method: method,
        reference_number: ref,
        exchange_rate: (typeof EXCHANGE_RATE !== 'undefined' ? EXCHANGE_RATE : (window.EXCHANGE_RATE || 850.0)),
        notes: `[Cuenta: ${account}] ${notes}`.trim()
    };

    try {
        const res = await authFetch(`${API_BASE}/financial/cxc/${id}/refund`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            let errMsg = `Error HTTP ${res.status}`;
            try { const d = await res.json(); errMsg = d.detail || errMsg; } catch (_) {}
            throw new Error(errMsg);
        }

        const data = await res.json();
        if (typeof closeModal === 'function') closeModal("modalClientRefund");
        else if (typeof window !== 'undefined' && typeof window.closeModal === 'function') window.closeModal("modalClientRefund");

        if (typeof window.loadReceivablesList === 'function') await window.loadReceivablesList();
        if (typeof showToastNotification === 'function') {
            showToastNotification(`✅ Reembolso emitido con éxito: Ref ${data.receipt_number || ref}`, 'success');
        } else {
            alert(`✅ ${data.message || 'Reembolso procesado exitosamente.'}`);
        }
    } catch (err) {
        alert("Error al procesar reembolso: " + err.message);
    }
}

function openRecordPaymentModal(type, targetId, currentBalance) {
    document.getElementById("fin_trans_type").value = type;
    document.getElementById("fin_trans_target_id").value = targetId;
    document.getElementById("fin_trans_current_balance").innerText = `$${currentBalance.toLocaleString()}`;
    document.getElementById("fin_trans_amount_usd").value = currentBalance;
    document.getElementById("fin_trans_amount_usd").max = currentBalance;

    const titleEl = document.getElementById("finTransModalTitle");
    const btnEl = document.getElementById("btnConfirmFinTrans");

    if (type === 'cobro_cxc') {
        titleEl.innerHTML = `<i class="fa-solid fa-hand-holding-dollar" style="color: #059669;"></i> Registrar Cobro de Cliente (CxC)`;
        btnEl.style.background = "#059669";
        btnEl.innerText = "Confirmar Cobro";
    } else {
        titleEl.innerHTML = `<i class="fa-solid fa-money-bill-wave" style="color: #e11d48;"></i> Registrar Pago a Proveedor (CxP)`;
        btnEl.style.background = "#e11d48";
        btnEl.innerText = "Confirmar Pago a Proveedor";
    }

    const customRateInput = document.getElementById("fin_trans_custom_rate");
    const activeRate = getActiveOfficialRate();
    if (customRateInput) {
        customRateInput.value = activeRate.toFixed(2);
    }

    const retRateInput = document.getElementById("fin_trans_retention_rate");
    if (retRateInput) {
        retRateInput.value = activeRate.toFixed(2);
    }

    const dateInput = document.getElementById("fin_trans_date");
    if (dateInput && !dateInput.value) {
        dateInput.value = new Date().toISOString().split("T")[0];
    }

    const retBsInput = document.getElementById("fin_trans_retention_bs");
    if (retBsInput) retBsInput.value = "";

    const btnInvoice = document.getElementById("btnFinTransPrintInvoice");
    if (btnInvoice) {
        btnInvoice.style.display = (type === 'cobro_cxc') ? 'inline-flex' : 'none';
    }

    const emitBox = document.getElementById("cxc_emit_invoice_box");
    if (emitBox) {
        emitBox.style.display = (type === 'cobro_cxc') ? 'block' : 'none';
        const chk = document.getElementById("fin_trans_emit_invoice");
        if (chk) chk.checked = true;
        const conceptInp = document.getElementById("fin_trans_custom_concept");
        if (conceptInp) conceptInp.value = "";
        const dispHint = document.getElementById("disp_invoice_amount_hint");
        if (dispHint) {
            dispHint.innerText = `$${Number(currentBalance || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        }
    }

    onFinTransMethodChanged();
    if (typeof openModal === 'function') openModal("modalFinancialTransaction");
    else if (typeof window !== 'undefined' && typeof window.openModal === 'function') window.openModal("modalFinancialTransaction");
}

function printOfficialFiscalInvoiceFromModal() {
    const targetId = document.getElementById("fin_trans_target_id")?.value;
    if (targetId && typeof window.printOfficialFiscalInvoice === 'function') {
        window.printOfficialFiscalInvoice(parseInt(targetId, 10));
    } else if (targetId) {
        alert("Cargando módulo de facturación...");
    }
}

async function submitFinancialPayment(e) {
    e.preventDefault();

    const type = document.getElementById("fin_trans_type").value;
    const targetId = document.getElementById("fin_trans_target_id").value;
    const amountUsd = parseFloat(document.getElementById("fin_trans_amount_usd").value);
    const method = document.getElementById("fin_trans_method").value;
    
    let effectiveRate = getActiveOfficialRate();
    if (method.startsWith("retencion_")) {
        effectiveRate = parseFloat(document.getElementById("fin_trans_retention_rate")?.value) || effectiveRate;
    } else {
        effectiveRate = parseFloat(document.getElementById("fin_trans_custom_rate")?.value) || effectiveRate;
    }

    const selectedAcc = document.getElementById("fin_trans_account")?.value || "";
    const notesVal = document.getElementById("fin_trans_notes")?.value?.trim() || "";
    const dateVal = document.getElementById("fin_trans_date")?.value || "";
    const datePrefix = dateVal ? `[Fecha Op: ${dateVal}] ` : "";
    const fullNotes = (selectedAcc && !method.startsWith("retencion_")) 
        ? `${datePrefix}[Cuenta: ${selectedAcc}] ${notesVal}`.trim() 
        : `${datePrefix}${notesVal}`.trim();

    const emitInvoice = (type === 'cobro_cxc') && (document.getElementById("fin_trans_emit_invoice")?.checked || false);
    const customConcept = document.getElementById("fin_trans_custom_concept")?.value.trim() || "";

    const payload = {
        amount_usd: amountUsd,
        exchange_rate: effectiveRate,
        payment_method: method,
        reference_number: document.getElementById("fin_trans_ref").value.trim(),
        notes: fullNotes,
        payment_type: type === 'cobro_cxc' ? 'cxc_cobro' : 'cxp_pago',
        emit_fiscal_invoice: emitInvoice,
        custom_concept: customConcept
    };

    if (type === 'cobro_cxc' && (!targetId || targetId === 'null' || targetId === '0')) {
        alert("Atención: Debe seleccionar una factura existente con saldo pendiente para aplicar un abono.");
        return;
    }

    const endpoint = type === 'cobro_cxc' 
        ? `${API_BASE}/financial/cxc/${targetId}/payment`
        : `${API_BASE}/financial/cxp/${targetId}/payment`;

    try {
        const res = await authFetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.detail || "Error al registrar transacción");
        }

        const data = await res.json();
        if (typeof closeModal === 'function') closeModal("modalFinancialTransaction");
        else if (typeof window !== 'undefined' && typeof window.closeModal === 'function') window.closeModal("modalFinancialTransaction");
        
        document.getElementById("financialTransactionForm").reset();

        if (type === 'cobro_cxc') {
            if (typeof window.loadReceivablesList === 'function') await window.loadReceivablesList();
        } else {
            if (typeof window.loadPayablesList === 'function') await window.loadPayablesList();
        }

        if (data.emitted_invoice_id && typeof window.printOfficialFiscalInvoice === 'function') {
            window.printOfficialFiscalInvoice(data.emitted_invoice_id);
        } else {
            alert(`✅ ${data.message}`);
        }
    } catch (err) {
        alert("Error: " + err.message);
    }
}

// PUENTE GLOBAL WINDOW
if (typeof window !== 'undefined') {
    window.safeParseFloat = safeParseFloat;
    window.roundFinancial = roundFinancial;
    window.getActiveOfficialRate = getActiveOfficialRate;
    window.calcFinTransFromUsd = calcFinTransFromUsd;
    window.calcFinTransFromBs = calcFinTransFromBs;
    window.calcRetentionFromBs = calcRetentionFromBs;
    window.onFinTransDateChanged = onFinTransDateChanged;
    window.onFinTransMethodChanged = onFinTransMethodChanged;
    window.calcFinTransBsEquiv = calcFinTransBsEquiv;
    window.onFinTransAccountChanged = onFinTransAccountChanged;
    window.openClientRefundModal = openClientRefundModal;
    window.submitClientRefund = submitClientRefund;
    window.openRecordPaymentModal = openRecordPaymentModal;
    window.printOfficialFiscalInvoiceFromModal = printOfficialFiscalInvoiceFromModal;
    window.submitFinancialPayment = submitFinancialPayment;
}

export {
    safeParseFloat,
    roundFinancial,
    getActiveOfficialRate,
    calcFinTransFromUsd,
    calcFinTransFromBs,
    calcRetentionFromBs,
    onFinTransDateChanged,
    onFinTransMethodChanged,
    calcFinTransBsEquiv,
    onFinTransAccountChanged,
    openClientRefundModal,
    submitClientRefund,
    openRecordPaymentModal,
    printOfficialFiscalInvoiceFromModal,
    submitFinancialPayment
};
