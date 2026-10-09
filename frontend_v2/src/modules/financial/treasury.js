// Sigop ERP - Submódulo Financiero Modularizado
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

const authFetch = (url, options = {}) => {
    const token = (typeof localStorage !== 'undefined' && localStorage.getItem('token')) || (typeof window !== 'undefined' && window.authToken);
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

function onFinTransMethodChanged() {
    const method = document.getElementById("fin_trans_method")?.value || "";
    const bsWrapper = document.getElementById("fin_trans_bs_wrapper");
    const refLbl = document.getElementById("fin_trans_ref_lbl");
    const refInput = document.getElementById("fin_trans_ref");
    const accountSel = document.getElementById("fin_trans_account");

    if (method.startsWith("retencion_")) {
        if (bsWrapper) bsWrapper.style.display = "none";
        if (refLbl) refLbl.innerText = "Nº Comprobante de Retención *";
        if (refInput) refInput.placeholder = "Ej: 202610000045";
        // En retenciones tributarias no se afecta cuenta bancaria líquida
        if (accountSel) {
            accountSel.disabled = true;
            accountSel.title = "Las retenciones tributarias no mueven cuentas bancarias (crédito fiscal directo)";
        }
    } else {
        if (bsWrapper) bsWrapper.style.display = "block";
        if (refLbl) refLbl.innerText = "Nº Referencia Bancaria *";
        if (refInput) refInput.placeholder = "Ej: 049182 / REF-BANCARIA";
        if (accountSel) {
            accountSel.disabled = false;
            accountSel.title = "";
        }
    }
    calcFinTransFromUsd();
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
    const item = (allReceivablesList || []).find(x => x.id === receivableId) || {};
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
    
    openModal("modalClientRefund");
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
        exchange_rate: (typeof EXCHANGE_RATE !== 'undefined' ? EXCHANGE_RATE : 850.0),
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
        closeModal("modalClientRefund");
        await loadReceivablesList();
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

    onFinTransMethodChanged();
    openModal("modalFinancialTransaction");

}



async function submitFinancialPayment(e) {

    e.preventDefault();

    const type = document.getElementById("fin_trans_type").value;

    const targetId = document.getElementById("fin_trans_target_id").value;

    const amountUsd = parseFloat(document.getElementById("fin_trans_amount_usd").value);
    const customRate = parseFloat(document.getElementById("fin_trans_custom_rate")?.value) || getActiveOfficialRate();
    const selectedAcc = document.getElementById("fin_trans_account")?.value || "";
    const notesVal = document.getElementById("fin_trans_notes")?.value?.trim() || "";
    const fullNotes = selectedAcc ? `[Cuenta: ${selectedAcc}] ${notesVal}`.trim() : notesVal;

    const payload = {
        amount_usd: amountUsd,
        exchange_rate: customRate,
        payment_method: document.getElementById("fin_trans_method").value,
        reference_number: document.getElementById("fin_trans_ref").value.trim(),
        notes: fullNotes,
        payment_type: type === 'cobro_cxc' ? 'cxc_cobro' : 'cxp_pago'
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
        closeModal("modalFinancialTransaction");
        document.getElementById("financialTransactionForm").reset();

        if (type === 'cobro_cxc') loadReceivablesList();
        else loadPayablesList();

        alert(`✅ ${data.message}`);
    } catch (err) {
        alert("Error: " + err.message);
    }

}



// ----------------------------------------------------

// RESUMEN DE TESORERÍA

// ----------------------------------------------------

window.loadFinancialSummary = loadTreasurySummary;

function onTreasurySummaryPeriodChange() {
    const period = document.getElementById('treasury_sum_period')?.value || 'all';
    const customContainer = document.getElementById('treasury_sum_custom_dates');
    const dfInput = document.getElementById('treasury_sum_date_from');
    const dtInput = document.getElementById('treasury_sum_date_to');

    // Sincronizar el selector de la tabla de traza inferior
    const tracePeriod = document.getElementById('treasuryFilterPeriod');
    if (tracePeriod) tracePeriod.value = period;

    const traceCustom = document.getElementById('treasuryCustomDateContainer');

    if (period === 'custom') {
        if (customContainer) customContainer.style.display = 'flex';
        if (traceCustom) traceCustom.style.display = 'flex';
        return;
    } else {
        if (customContainer) customContainer.style.display = 'none';
        if (traceCustom) traceCustom.style.display = 'none';
    }

    const today = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (period === 'today') {
        if (dfInput) dfInput.value = fmt(today);
        if (dtInput) dtInput.value = fmt(today);
    } else if (period === 'this_week') {
        const first = new Date(today);
        const dayOfWeek = today.getDay() || 7;
        first.setDate(today.getDate() - (dayOfWeek - 1));
        if (dfInput) dfInput.value = fmt(first);
        if (dtInput) dtInput.value = fmt(today);
    } else if (period === 'this_month') {
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        if (dfInput) dfInput.value = fmt(firstDay);
        if (dtInput) dtInput.value = fmt(lastDay);
    } else if (period === 'last_month') {
        const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
        if (dfInput) dfInput.value = fmt(firstDay);
        if (dtInput) dtInput.value = fmt(lastDay);
    } else if (period === 'this_year') {
        if (dfInput) dfInput.value = `${today.getFullYear()}-01-01`;
        if (dtInput) dtInput.value = `${today.getFullYear()}-12-31`;
    } else {
        if (dfInput) dfInput.value = '';
        if (dtInput) dtInput.value = '';
    }

    const traceDf = document.getElementById('treasuryFilterDateFrom');
    const traceDt = document.getElementById('treasuryFilterDateTo');
    if (traceDf && dfInput) traceDf.value = dfInput.value;
    if (traceDt && dtInput) traceDt.value = dtInput.value;

    loadTreasurySummary();
}

function resetTreasurySummaryFilters() {
    const periodSelect = document.getElementById('treasury_sum_period');
    if (periodSelect) periodSelect.value = 'all';
    const customContainer = document.getElementById('treasury_sum_custom_dates');
    if (customContainer) customContainer.style.display = 'none';
    const dfInput = document.getElementById('treasury_sum_date_from');
    if (dfInput) dfInput.value = '';
    const dtInput = document.getElementById('treasury_sum_date_to');
    if (dtInput) dtInput.value = '';
    const accSelect = document.getElementById('treasury_sum_account');
    if (accSelect) accSelect.value = 'all';

    const tracePeriod = document.getElementById('treasuryFilterPeriod');
    if (tracePeriod) tracePeriod.value = 'all';
    const traceType = document.getElementById('treasuryFilterType');
    if (traceType) traceType.value = 'all';
    const traceImpact = document.getElementById('treasuryFilterImpact');
    if (traceImpact) traceImpact.value = 'all';
    const traceSearch = document.getElementById('treasuryTraceSearch');
    if (traceSearch) traceSearch.value = '';
    const traceCustom = document.getElementById('treasuryCustomDateContainer');
    if (traceCustom) traceCustom.style.display = 'none';
    const traceDf = document.getElementById('treasuryFilterDateFrom');
    if (traceDf) traceDf.value = '';
    const traceDt = document.getElementById('treasuryFilterDateTo');
    if (traceDt) traceDt.value = '';

    loadTreasurySummary();
}

async function loadTreasurySummary() {
    const kpisContainer = document.getElementById("treasuryKPIsContainer");
    const cashflowDetails = document.getElementById("treasuryCashflowDetails");
    const creditDetails = document.getElementById("treasuryCreditDetails");

    loadCashFlowMatrix();

    // Populate accounts selector dynamically if empty
    const accSelect = document.getElementById("treasury_sum_account");
    if (accSelect && accSelect.options.length <= 1) {
        try {
            const accRes = await authFetch(`${API_BASE}/financial/accounts`);
            if (accRes.ok) {
                const accounts = await accRes.json();
                accounts.forEach(a => {
                    const opt = document.createElement("option");
                    opt.value = a.id;
                    const typeLabel = (a.currency || a.account_type || '').toUpperCase();
                    opt.textContent = `${a.name} (${typeLabel || 'USD'})`;
                    accSelect.appendChild(opt);
                });
            }
        } catch(e) {}
    }

    // Build query params
    const period = document.getElementById('treasury_sum_period')?.value || 'all';
    const df = document.getElementById('treasury_sum_date_from')?.value;
    const dt = document.getElementById('treasury_sum_date_to')?.value;
    const accountId = document.getElementById('treasury_sum_account')?.value;

    const queryParams = new URLSearchParams();
    if (period !== 'all') {
        if (df) queryParams.append('date_from', df);
        if (dt) queryParams.append('date_to', dt);
    }
    if (accountId && accountId !== 'all') {
        queryParams.append('account_id', accountId);
    }
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';

    try {
        const res = await authFetch(`${API_BASE}/financial/summary${queryString}`);
        if (!res.ok) throw new Error("Error en servidor");
        const data = await res.json();
        const k = (data.kpis || data);



        kpisContainer.innerHTML = `

            <div class="card" style="margin-bottom: 0; text-align: center; border-left: 4px solid #059669;">

                <span style="font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase;">Cobros Recibidos</span>

                <p style="font-size: 18px; font-weight: 900; color: #059669; margin-top: 4px;">$${k.total_collected_cxc_usd.toLocaleString()}</p>

                <span style="font-size: 10px; color: #10b981;">Total ingresado</span>

            </div>

            <div class="card" style="margin-bottom: 0; text-align: center; border-left: 4px solid #e11d48;">

                <span style="font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase;">Pagos a Proveedores</span>

                <p style="font-size: 18px; font-weight: 900; color: #e11d48; margin-top: 4px;">$${k.total_paid_cxp_usd.toLocaleString()}</p>

                <span style="font-size: 10px; color: #f43f5e;">Total cancelado</span>

            </div>

            <div class="card" style="margin-bottom: 0; text-align: center; border-left: 4px solid #0284c7;">

                <span style="font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase;">Cartera por Cobrar (CxC)</span>

                <p style="font-size: 18px; font-weight: 900; color: #0284c7; margin-top: 4px;">$${k.pending_cxc_usd.toLocaleString()}</p>

                <span style="font-size: 10px; color: #38bdf8;">Dinero en la calle</span>

            </div>

            <div class="card" style="margin-bottom: 0; text-align: center; border-left: 4px solid #f59e0b;">
                <span style="font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase;">Deuda a Proveedores (CxP)</span>
                <p style="font-size: 18px; font-weight: 900; color: #f59e0b; margin-top: 4px;">$${k.pending_cxp_usd.toLocaleString()}</p>
                <span style="font-size: 10px; color: #fbbf24;">Compromisos pendientes</span>
            </div>

            <div class="card" style="margin-bottom: 0; text-align: center; border-left: 4px solid #8b5cf6;">
                <span style="font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase;">Diferencial Cambiario</span>
                <p style="font-size: 18px; font-weight: 900; color: ${(k.net_exchange_diff_usd || 0) >= 0 ? '#059669' : '#e11d48'}; margin-top: 4px;">${(k.net_exchange_diff_usd || 0) >= 0 ? '+' : ''}$${(k.net_exchange_diff_usd || 0).toLocaleString()}</p>
                <span style="font-size: 10px; color: #8b5cf6;">${k.total_exchanges_count || 0} operaciones mesa</span>
            </div>

            <div class="card" style="margin-bottom: 0; text-align: center; border-left: 4px solid #be185d; background: #fff5f8;">
                <span style="font-size: 11px; color: #9d174d; font-weight: 800; text-transform: uppercase;">
                    <i class="fa-solid fa-stamp"></i> Retenciones SENIAT (Custodia)
                </span>
                <p style="font-size: 18px; font-weight: 900; color: #be185d; margin-top: 4px;">$${(k.total_pending_tax_withholdings_usd || 0).toLocaleString()}</p>
                <span style="font-size: 10px; color: #9d174d;">IVA: $${(k.pending_seniat_iva_usd || 0).toFixed(2)} | ISLR: $${(k.pending_seniat_islr_usd || 0).toFixed(2)}</span>
            </div>
        `;

        cashflowDetails.innerHTML = `
            ${(k.total_initial_balance_usd && k.total_initial_balance_usd > 0) ? `
            <div style="display: flex; justify-content: space-between; padding: 6px 10px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; font-size: 12px;">
                <span style="color: #15803d; font-weight: 700;"><i class="fa-solid fa-coins"></i> (+) Saldo Inicial / Apertura:</span>
                <b style="color: #15803d;">+$${k.total_initial_balance_usd.toLocaleString()}</b>
            </div>` : ''}

            <div style="display: flex; justify-content: space-between; padding: 6px 10px; background: #f8fafc; border-radius: 6px; font-size: 12px;">
                <span>(+) Cobranzas Líquidas de Clientes:</span>
                <b style="color: #059669;">+$${k.total_collected_cxc_usd.toLocaleString()}</b>
            </div>

            <div style="display: flex; justify-content: space-between; padding: 6px 10px; background: #f8fafc; border-radius: 6px; font-size: 12px;">
                <span>(-) Pagos a Proveedores / CxP:</span>
                <b style="color: #e11d48;">-$${k.total_paid_cxp_usd.toLocaleString()}</b>
            </div>

            <div style="display: flex; justify-content: space-between; padding: 6px 10px; background: #f8fafc; border-radius: 6px; font-size: 12px;">
                <span>(-) Gastos Operativos Directos / Caja:</span>
                <b style="color: #e11d48;">-$${k.total_direct_expenses_usd.toLocaleString()}</b>
            </div>

            <div style="display: flex; justify-content: space-between; padding: 6px 10px; background: #f8fafc; border-radius: 6px; font-size: 12px;">
                <span>(+/-) Diferencial Cambiario (Mesa de Cambio / Arbitraje):</span>
                <b style="color: ${(k.net_exchange_diff_usd || 0) >= 0 ? '#059669' : '#e11d48'};">
                    ${(k.net_exchange_diff_usd || 0) >= 0 ? '+' : ''}$${(k.net_exchange_diff_usd || 0).toLocaleString()} USD
                </b>
            </div>

            <div style="display: flex; justify-content: space-between; padding: 6px 10px; background: #fdf2f8; border: 1px solid #fbcfe8; border-radius: 6px; font-size: 12px;">
                <span style="color: #9d174d; font-weight: 700;"><i class="fa-solid fa-stamp"></i> (-) Pasivo de Retenciones en Custodia por Pagar al SENIAT:</span>
                <b style="color: #be185d;">-$${(k.total_pending_tax_withholdings_usd || 0).toLocaleString()} USD</b>
            </div>

            <div style="display: flex; justify-content: space-between; padding: 8px 10px; background: var(--dalor-navy); color: white; border-radius: 6px; font-size: 13px; font-weight: 800; margin-top: 4px;">
                <span>(=) Saldo Líquido Disponible Real (Libre de Impuestos):</span>
                <span style="color: ${(k.net_operating_cash_usd - (k.total_pending_tax_withholdings_usd || 0)) >= 0 ? '#34d399' : '#f87171'};">
                    $${(k.net_operating_cash_usd - (k.total_pending_tax_withholdings_usd || 0)).toLocaleString()}
                </span>
            </div>
        `;



        const netCredit = k.pending_cxc_usd - k.pending_cxp_usd;

        creditDetails.innerHTML = `

            <div style="display: flex; justify-content: space-between; padding: 6px 10px; background: #f8fafc; border-radius: 6px; font-size: 12px;">

                <span>Cuentas por Cobrar Pendientes (CxC):</span>

                <b style="color: #0284c7;">$${k.pending_cxc_usd.toLocaleString()}</b>

            </div>

            <div style="display: flex; justify-content: space-between; padding: 6px 10px; background: #f8fafc; border-radius: 6px; font-size: 12px;">

                <span>Cuentas por Pagar Pendientes (CxP):</span>

                <b style="color: #e11d48;">$${k.pending_cxp_usd.toLocaleString()}</b>

            </div>

            <div style="display: flex; justify-content: space-between; padding: 8px 10px; background: #0f172a; color: white; border-radius: 6px; font-size: 13px; font-weight: 800; margin-top: 4px;">

                <span>Posición Neta de Crédito (CxC - CxP):</span>

                <span style="color: ${netCredit >= 0 ? '#38bdf8' : '#f87171'};">$${netCredit.toLocaleString()}</span>

            </div>

        `;

        // --- TRAZABILIDAD LÍNEA POR LÍNEA DESEMPAQUETADA EN TESORERÍA ---
        const traceTbody = document.getElementById("treasuryTraceTableBody");
        if (traceTbody) {
            try {
                const token = window.authToken || localStorage.getItem('dalor_token') || null;
                const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
                const [resCxc, resCxp, resPart, resExch, resExp, resAcc] = await Promise.all([
                    authFetch(`${API_BASE}/financial/cxc`, { headers }),
                    authFetch(`${API_BASE}/financial/cxp`, { headers }),
                    authFetch(`${API_BASE}/financial/partners/withdrawals`, { headers }),
                    authFetch(`${API_BASE}/financial/exchanges`, { headers }),
                    authFetch(`${API_BASE}/expenses/?status=aprobado`, { headers }),
                    authFetch(`${API_BASE}/financial/accounts`, { headers })
                ]);

                const cxcList = resCxc.ok ? await resCxc.json() : [];
                const cxpList = resCxp.ok ? await resCxp.json() : [];
                const partList = resPart.ok ? await resPart.json() : [];
                const exchList = resExch.ok ? await resExch.json() : [];
                const expList = (resExp && resExp.ok) ? await resExp.json() : [];
                const accList = (resAcc && resAcc.ok) ? await resAcc.json() : [];

                const operations = [];
                const bcvRate = window.BCV_DATA?.rate || (typeof State !== 'undefined' && State.exchangeRate) || EXCHANGE_RATE || 850.0;

                // 0. Trazabilidad de saldos iniciales de apertura
                if (Array.isArray(accList)) {
                    accList.forEach(acc => {
                        if (acc.initial_balance && acc.initial_balance > 0) {
                            const rawD = getIsoDate(acc.initial_balance_date || acc.created_at || '');
                            const dispD = formatDateDisplay(acc.initial_balance_date || acc.created_at || 'Apertura');
                            operations.push({
                                date: dispD,
                                rawDate: rawD,
                                dateDisplay: dispD,
                                type: 'SALDO INICIAL',
                                typeColor: '#0284c7',
                                sign: '+',
                                concept: `Saldo de Apertura / Inicial [${acc.name}]`,
                                entity: acc.name,
                                ref: `SI-${acc.id}`,
                                method: 'saldo inicial',
                                amount_usd: acc.initial_balance,
                                amount_bs: acc.initial_balance_bs || (acc.initial_balance * bcvRate),
                                notes: acc.notes || 'Saldo de apertura y conciliación de cuenta',
                                accountId: acc.id
                            });
                        }
                    });
                }

                // 1. Trazabilidad de cada cobro / abono individual de clientes
                if (Array.isArray(cxcList)) {
                    cxcList.forEach(c => {
                        const payments = c.payments || [];
                        if (payments.length > 0) {
                            payments.forEach(pm => {
                                const usd = pm.amount_usd || 0;
                                const rawD = getIsoDate(pm.payment_date || c.due_date || c.issue_date || '');
                                const dispD = formatDateDisplay(pm.payment_date || c.due_date || c.issue_date || '-');
                                operations.push({
                                    date: dispD,
                                    rawDate: rawD,
                                    dateDisplay: dispD,
                                    type: 'COBRO CLIENTE',
                                    typeColor: '#059669',
                                    sign: '+',
                                    concept: `Abono Factura [${c.invoice_number}] - ${(c.project_code || c.project_name || 'Obra')}`,
                                    entity: c.client_name || 'Cliente',
                                    ref: pm.voucher_number || pm.reference_number || c.invoice_number,
                                    method: (pm.payment_method || 'transferencia').replace(/_/g, ' '),
                                    amount_usd: usd,
                                    amount_bs: pm.amount_bs || (usd * bcvRate),
                                    notes: pm.notes || '',
                                    accountId: pm.financial_account_id || null
                                });
                            });
                        } else if (c.paid_amount_usd > 0) {
                            const rawD = getIsoDate(c.issue_date || c.due_date || '');
                            const dispD = formatDateDisplay(c.issue_date || c.due_date || '-');
                            operations.push({
                                date: dispD,
                                rawDate: rawD,
                                dateDisplay: dispD,
                                type: 'COBRO CLIENTE',
                                typeColor: '#059669',
                                sign: '+',
                                concept: `Cobro Factura [${c.invoice_number}]`,
                                entity: c.client_name || 'Cliente',
                                ref: c.invoice_number,
                                method: 'Directo',
                                amount_usd: c.paid_amount_usd,
                                amount_bs: c.paid_amount_usd * bcvRate,
                                notes: '',
                                accountId: null
                            });
                        }
                    });
                }

                // 2. Trazabilidad de cada pago / abono individual a proveedores
                if (Array.isArray(cxpList)) {
                    cxpList.forEach(p => {
                        const payments = (p.payments || []).filter(pm => pm.payment_method !== 'retencion_iva' && pm.payment_method !== 'retencion_islr' && pm.payment_type === 'cxp_pago');
                        if (payments.length > 0) {
                            payments.forEach(pm => {
                                const usd = pm.amount_usd || 0;
                                const rawD = getIsoDate(pm.payment_date || p.due_date || p.issue_date || '');
                                const dispD = formatDateDisplay(pm.payment_date || p.due_date || p.issue_date || '-');
                                operations.push({
                                    date: dispD,
                                    rawDate: rawD,
                                    dateDisplay: dispD,
                                    type: 'PAGO PROVEEDOR',
                                    typeColor: '#e11d48',
                                    sign: '-',
                                    concept: `Abono Factura [${p.invoice_number}] - ${p.description || 'Suministros'}`,
                                    entity: p.supplier_name || 'Proveedor',
                                    ref: pm.voucher_number || pm.reference_number || p.invoice_number,
                                    method: (pm.payment_method || 'transferencia').replace(/_/g, ' '),
                                    amount_usd: usd,
                                    amount_bs: pm.amount_bs || (usd * bcvRate),
                                    notes: pm.notes || '',
                                    accountId: pm.financial_account_id || null
                                });
                            });
                        } else if (p.paid_amount_usd > 0) {
                            const rawD = getIsoDate(p.issue_date || p.due_date || '');
                            const dispD = formatDateDisplay(p.issue_date || p.due_date || '-');
                            operations.push({
                                date: dispD,
                                rawDate: rawD,
                                dateDisplay: dispD,
                                type: 'PAGO PROVEEDOR',
                                typeColor: '#e11d48',
                                sign: '-',
                                concept: `Pago Factura [${p.invoice_number}]`,
                                entity: p.supplier_name || 'Proveedor',
                                ref: p.invoice_number,
                                method: 'Directo',
                                amount_usd: p.paid_amount_usd,
                                amount_bs: p.paid_amount_usd * bcvRate,
                                notes: '',
                                accountId: null
                            });
                        }
                    });
                }

                // 3. Trazabilidad de retiros personales de socios
                if (Array.isArray(partList)) {
                    partList.forEach(w => {
                        const rawD = getIsoDate(w.date || w.withdrawal_date || w.created_at || '');
                        const dispD = formatDateDisplay(w.date || w.withdrawal_date || w.created_at || 'Reciente');
                        operations.push({
                            date: dispD,
                            rawDate: rawD,
                            dateDisplay: dispD,
                            type: 'RETIRO SOCIO',
                            typeColor: '#7c3aed',
                            sign: '-',
                            concept: w.concept || 'Retiro a cuenta de utilidades',
                            entity: w.partner_name || 'Accionista',
                            ref: w.reference_number || w.payment_method || '-',
                            amount_usd: w.amount_usd,
                            amount_bs: w.amount_bs || (w.amount_usd * (w.exchange_rate || window.BCV_DATA?.rate || 850.0)),
                            accountId: w.financial_account_id || null
                        });
                    });
                }

                // 4. Trazabilidad de operaciones de cambio de divisas / mesa de cambio
                if (Array.isArray(exchList)) {
                    exchList.forEach(ex => {
                        const isEgreso = ex.payment_type === 'cambio_divisa_egreso';
                        const rawD = getIsoDate(ex.payment_date || ex.created_at || '');
                        const dispD = formatDateDisplay(ex.payment_date || ex.created_at || 'Reciente');
                        operations.push({
                            date: dispD,
                            rawDate: rawD,
                            dateDisplay: dispD,
                            type: isEgreso ? 'MESA CAMBIO (EGRESO)' : 'MESA CAMBIO (INGRESO)',
                            typeColor: isEgreso ? '#d97706' : '#2563eb',
                            sign: isEgreso ? '-' : '+',
                            concept: ex.notes || 'Operación de cambio de divisas',
                            entity: 'Mesa de Cambio Dalor',
                            ref: ex.voucher_number || '-',
                            method: (ex.payment_method || 'transferencia').replace(/_/g, ' '),
                            amount_usd: ex.amount_usd || 0,
                            amount_bs: ex.amount_bs || 0,
                            accountId: ex.financial_account_id || null
                        });
                    });
                }

                // 5. Trazabilidad de gastos operativos directos aprobados (Sede, Personal, Servicios, etc.)
                if (Array.isArray(expList)) {
                    expList.forEach(e => {
                        const usd = e.amount_usd || 0;
                        const rawD = getIsoDate(e.expense_date || e.created_at || '');
                        const dispD = formatDateDisplay(e.expense_date || e.created_at || 'Reciente');
                        const catName = (e.category?.name || e.expense_type || 'Gasto').replace(/_/g, ' ');
                        operations.push({
                            date: dispD,
                            rawDate: rawD,
                            dateDisplay: dispD,
                            type: 'GASTO OPERATIVO',
                            typeColor: '#ea580c',
                            sign: '-',
                            concept: `[${catName}] ${e.description || 'Gasto operacional'}`,
                            entity: e.supplier_vendor || 'Varios / Sede',
                            ref: e.invoice_number || `EXP-${e.id}`,
                            method: (e.payment_method || 'caja chica').replace(/_/g, ' '),
                            amount_usd: usd,
                            amount_bs: e.amount_bs || (usd * bcvRate),
                            notes: e.description || '',
                            accountId: e.financial_account_id || null
                        });
                    });
                }

                // Ordenar movimientos de forma cronológica descendente (más recientes primero)
                operations.sort((a, b) => (b.rawDate || b.date || '').localeCompare(a.rawDate || a.date || ''));
                allTreasuryOperations = operations;
                filteredTreasuryOperations = [...operations];

                // Aplicar filtros activos y renderizar
                applyTreasuryFilters();
            } catch (errTrace) {
                console.error("Error al cargar traza de tesorería:", errTrace);
            }
        }

    } catch (e) {
        console.error("Error al cargar tesorería:", e);
    }
}

// ==============================================================================
// 🔍 FILTRADO, SELECTORES, BÚSQUEDA Y PAGINACIÓN DE LA TRAZA DE TESORERÍA
// ==============================================================================
let allTreasuryOperations = [];
let filteredTreasuryOperations = [];
let treasuryCurrentPage = 1;
let treasuryPageSize = 10;

function getIsoDate(dStr) {
    if (!dStr) return '';
    if (typeof dStr !== 'string') return '';
    const mIso = dStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (mIso) return `${mIso[1]}-${mIso[2]}-${mIso[3]}`;
    const mVe = dStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (mVe) {
        const dd = mVe[1].padStart(2, '0');
        const mm = mVe[2].padStart(2, '0');
        const yyyy = mVe[3];
        return `${yyyy}-${mm}-${dd}`;
    }
    return '';
}

function formatDateDisplay(dStr) {
    if (!dStr || dStr === '-' || dStr === 'Reciente') return dStr || '-';
    const iso = getIsoDate(dStr);
    if (!iso) return dStr;
    const parts = iso.split('-');
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function applyTreasuryFilters() {
    const searchVal = (document.getElementById("treasuryTraceSearch")?.value || "").toLowerCase().trim();
    const typeVal = document.getElementById("treasuryFilterType")?.value || "all";
    const impactVal = document.getElementById("treasuryFilterImpact")?.value || "all";
    const periodVal = document.getElementById("treasuryFilterPeriod")?.value || "all";

    const customFrom = document.getElementById("treasuryFilterDateFrom")?.value || "";
    const customTo = document.getElementById("treasuryFilterDateTo")?.value || "";

    const topDf = document.getElementById("treasury_sum_date_from")?.value || "";
    const topDt = document.getElementById("treasury_sum_date_to")?.value || "";
    const filterAcc = document.getElementById("treasury_sum_account")?.value;

    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const todayIso = `${y}-${m}-${d}`;
    const thisMonthIso = `${y}-${m}`;

    // Mes anterior
    const prevM = now.getMonth() === 0 ? 12 : now.getMonth();
    const prevY = now.getMonth() === 0 ? y - 1 : y;
    const lastMonthIso = `${prevY}-${String(prevM).padStart(2, '0')}`;

    // Esta semana (lunes a hoy)
    const dayOfWeek = now.getDay() || 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - (dayOfWeek - 1));
    const mondayIso = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;

    filteredTreasuryOperations = (allTreasuryOperations || []).filter(op => {
        // 0. Filtro por Cuenta Bancaria Seleccionada
        if (filterAcc && filterAcc !== 'all') {
            const accNum = parseInt(filterAcc);
            if (op.accountId !== accNum) return false;
        }

        // 1. Selector Tipo de Operación
        if (typeVal !== "all" && op.type !== typeVal) {
            return false;
        }

        // 2. Selector Impacto en Caja (+ / -)
        if (impactVal !== "all" && op.sign !== impactVal) {
            return false;
        }

        // 3. Selector de Período / Fecha
        if (periodVal === "today") {
            if (op.rawDate !== todayIso) return false;
        } else if (periodVal === "this_week") {
            if (!op.rawDate || op.rawDate < mondayIso || op.rawDate > todayIso) return false;
        } else if (periodVal === "this_month") {
            if (!op.rawDate || !op.rawDate.startsWith(thisMonthIso)) return false;
        } else if (periodVal === "last_month") {
            if (!op.rawDate || !op.rawDate.startsWith(lastMonthIso)) return false;
        } else if (periodVal === "this_year") {
            if (!op.rawDate || !op.rawDate.startsWith(String(y))) return false;
        } else if (periodVal === "custom") {
            if (customFrom && (!op.rawDate || op.rawDate < customFrom)) return false;
            if (customTo && (!op.rawDate || op.rawDate > customTo)) return false;
        } else if (topDf || topDt) {
            if (topDf && (!op.rawDate || op.rawDate < topDf)) return false;
            if (topDt && (!op.rawDate || op.rawDate > topDt)) return false;
        }

        // 4. Buscador en Vivo por Texto
        if (searchVal) {
            const strTarget = [
                op.concept || '',
                op.entity || '',
                op.ref || '',
                op.type || '',
                op.method || '',
                op.notes || ''
            ].join(' ').toLowerCase();

            if (!strTarget.includes(searchVal)) {
                return false;
            }
        }

        return true;
    });

    // Actualizar KPIs de la Traza Filtrada
    updateTreasuryTraceKpis();

    // Resetear a primera página y renderizar
    treasuryCurrentPage = 1;
    renderTreasuryTracePaginated();
}

function handleTreasuryPeriodChange() {
    const pSelect = document.getElementById("treasuryFilterPeriod");
    const topPeriod = document.getElementById("treasury_sum_period");
    const cCont = document.getElementById("treasuryCustomDateContainer");
    if (pSelect && cCont) {
        cCont.style.display = (pSelect.value === 'custom') ? 'flex' : 'none';
    }
    if (pSelect && topPeriod && pSelect.value !== topPeriod.value) {
        topPeriod.value = pSelect.value;
        onTreasurySummaryPeriodChange();
        return;
    }
    applyTreasuryFilters();
}

function updateTreasuryTraceKpis() {
    const countEl = document.getElementById("kpi_trace_count");
    const incomeEl = document.getElementById("kpi_trace_income");
    const expenseEl = document.getElementById("kpi_trace_expense");
    const netEl = document.getElementById("kpi_trace_net");

    const ops = filteredTreasuryOperations || [];
    let totIncome = 0;
    let totExpense = 0;

    ops.forEach(op => {
        const amt = Number(op.amount_usd) || 0;
        if (op.sign === '+') totIncome += amt;
        else if (op.sign === '-') totExpense += amt;
    });

    const net = totIncome - totExpense;

    if (countEl) countEl.textContent = `${ops.length} ops`;
    if (incomeEl) incomeEl.textContent = `+$${totIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (expenseEl) expenseEl.textContent = `-$${totExpense.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (netEl) {
        netEl.textContent = `$${net.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        netEl.style.color = net >= 0 ? '#059669' : '#e11d48';
    }
}

function resetTreasuryFilters() {
    const sInput = document.getElementById("treasuryTraceSearch");
    if (sInput) sInput.value = "";

    const tSelect = document.getElementById("treasuryFilterType");
    if (tSelect) tSelect.value = "all";

    const iSelect = document.getElementById("treasuryFilterImpact");
    if (iSelect) iSelect.value = "all";

    const pSelect = document.getElementById("treasuryFilterPeriod");
    if (pSelect) pSelect.value = "all";

    const cCont = document.getElementById("treasuryCustomDateContainer");
    if (cCont) cCont.style.display = "none";

    const fromInput = document.getElementById("treasuryFilterDateFrom");
    if (fromInput) fromInput.value = "";

    const toInput = document.getElementById("treasuryFilterDateTo");
    if (toInput) toInput.value = "";

    applyTreasuryFilters();
}

function printTreasuryTraceReport() {
    const ops = filteredTreasuryOperations || [];
    if (ops.length === 0) {
        alert("No hay movimientos para imprimir con los filtros seleccionados.");
        return;
    }

    const typeSelect = document.getElementById("treasuryFilterType");
    const impactSelect = document.getElementById("treasuryFilterImpact");
    const periodSelect = document.getElementById("treasuryFilterPeriod");
    const searchVal = document.getElementById("treasuryTraceSearch")?.value || "";

    const typeLabel = typeSelect ? typeSelect.options[typeSelect.selectedIndex]?.text : "Todas";
    const impactLabel = impactSelect ? impactSelect.options[impactSelect.selectedIndex]?.text : "Todos";
    const periodLabel = periodSelect ? periodSelect.options[periodSelect.selectedIndex]?.text : "Histórico Completo";

    let totIncome = 0;
    let totExpense = 0;
    ops.forEach(op => {
        const amt = Number(op.amount_usd) || 0;
        if (op.sign === '+') totIncome += amt;
        else if (op.sign === '-') totExpense += amt;
    });
    const net = totIncome - totExpense;

    const rowsHtml = ops.map((op, idx) => `
        <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
            <td style="padding: 6px; text-align: center; color: #64748b;">${idx + 1}</td>
            <td style="padding: 6px; font-weight: 700; white-space: nowrap;">${op.dateDisplay || op.date}</td>
            <td style="padding: 6px;"><span style="font-weight: 800; color: ${op.typeColor};">${op.type}</span></td>
            <td style="padding: 6px; font-weight: 600;">${op.concept}</td>
            <td style="padding: 6px; color: #0284c7; font-weight: 700;">${op.entity}</td>
            <td style="padding: 6px; font-family: monospace;">${op.ref} ${op.method ? `<span style="color:#64748b;">(${op.method})</span>` : ''}</td>
            <td style="padding: 6px; text-align: right; font-weight: 800; color: ${op.typeColor};">${op.sign} $${Number(op.amount_usd).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
            <td style="padding: 6px; text-align: right; color: #475569;">Bs. ${Number(op.amount_bs).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</td>
        </tr>
    `).join('');

    const printWin = window.open('', '_blank');
    printWin.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>DALOR SIGO-P | Traza de Tesorería</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 25px; color: #1e293b; }
                h1, h2, h3, p { margin: 0; }
                .header { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
                .kpis { display: flex; gap: 16px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px 14px; border-radius: 6px; margin-bottom: 16px; }
                .kpi-item { flex: 1; }
                .kpi-title { font-size: 10px; text-transform: uppercase; font-weight: 700; color: #64748b; }
                .kpi-val { font-size: 14px; font-weight: 800; margin-top: 2px; }
                table { width: 100%; border-collapse: collapse; margin-top: 8px; }
                th { background: #0f172a; color: #ffffff; padding: 8px 6px; font-size: 11px; text-align: left; }
                th.r, td.r { text-align: right; }
                @media print { body { margin: 10mm; } }
            </style>
        </head>
        <body>
            <div class="header">
                <div>
                    <h2 style="color: #0f172a; font-weight: 900; letter-spacing: -0.5px;">DALOR INGENIERÍA & CONSTRUCCIÓN C.A.</h2>
                    <p style="font-size: 12px; color: #64748b; margin-top: 3px;">Auditoría Cronológica de Traza de Tesorería (Flujo Real de Caja)</p>
                </div>
                <div style="text-align: right; font-size: 11px; color: #64748b;">
                    <div><strong>Fecha Emisión:</strong> ${new Date().toLocaleDateString('es-VE')}</div>
                    <div><strong>Filtros:</strong> ${typeLabel} | ${impactLabel} | ${periodLabel} ${searchVal ? `| Búsqueda: "${searchVal}"` : ''}</div>
                </div>
            </div>

            <div class="kpis">
                <div class="kpi-item">
                    <div class="kpi-title">Total Movimientos</div>
                    <div class="kpi-val" style="color: #0f172a;">${ops.length} operaciones</div>
                </div>
                <div class="kpi-item">
                    <div class="kpi-title">Total Ingresos (+)</div>
                    <div class="kpi-val" style="color: #059669;">+$${totIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                </div>
                <div class="kpi-item">
                    <div class="kpi-title">Total Egresos (-)</div>
                    <div class="kpi-val" style="color: #e11d48;">-$${totExpense.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                </div>
                <div class="kpi-item">
                    <div class="kpi-title">Flujo Neto Resultante</div>
                    <div class="kpi-val" style="color: ${net >= 0 ? '#059669' : '#e11d48'};">$${net.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                </div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th style="width: 25px; text-align: center;">#</th>
                        <th>Fecha</th>
                        <th>Tipo de Operación</th>
                        <th>Concepto / Descripción</th>
                        <th>Entidad / Beneficiario</th>
                        <th>Nº Ref / Doc</th>
                        <th class="r">Monto USD</th>
                        <th class="r">Monto Bs. (BCV)</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                </tbody>
            </table>
            <div style="margin-top: 30px; display: flex; justify-content: space-between; font-size: 11px; color: #64748b; border-top: 1px solid #cbd5e1; padding-top: 10px;">
                <span>DALOR SIGO-P &bull; Sistema Integrado de Gestión de Obras y Proyectos</span>
                <span>Firma Auditor / Dirección Financiera: ________________________</span>
            </div>
            <script>
                window.onload = function() { window.print(); }
            </script>
        </body>
        </html>
    `);
    printWin.document.close();
}

function goToTreasuryPage(page) {
    treasuryCurrentPage = page;
    renderTreasuryTracePaginated();
    const c = document.getElementById("treasuryTraceTableBody");
    if (c) c.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function changeTreasuryPageSize(size) {
    treasuryPageSize = parseInt(size) || 15;
    treasuryCurrentPage = 1;
    renderTreasuryTracePaginated();
}

function renderTreasuryTracePaginated() {
    const traceTbody = document.getElementById("treasuryTraceTableBody");
    if (!traceTbody) return;

    const operations = filteredTreasuryOperations || [];
    if (operations.length === 0) {
        traceTbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #94a3b8; padding: 18px;">No se encontraron movimientos registrados con los filtros aplicados.</td></tr>`;
        const pCont = document.getElementById("treasuryPaginationContainer");
        if (pCont) pCont.innerHTML = '';
        return;
    }

    const { startIndex, endIndex, currentPage } = (typeof window.renderPaginationControls === 'function' ? window.renderPaginationControls : renderPaginationControls)({
        containerId: "treasuryPaginationContainer",
        totalItems: operations.length,
        currentPage: treasuryCurrentPage,
        pageSize: treasuryPageSize,
        onPageChange: "goToTreasuryPage",
        onPageSizeChange: "changeTreasuryPageSize",
        itemLabel: "movimiento(s) de tesorería"
    });
    treasuryCurrentPage = currentPage;

    const pageOps = operations.slice(startIndex, endIndex);
    traceTbody.innerHTML = pageOps.map(op => `
        <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="font-weight: 700; color: #64748b; font-size: 11px; white-space: nowrap;">${op.dateDisplay || op.date}</td>
            <td><span style="background: ${op.typeColor}15; color: ${op.typeColor}; font-weight: 800; padding: 2px 7px; border-radius: 4px; font-size: 10px; border: 1px solid ${op.typeColor}40;">${op.type}</span></td>
            <td style="font-weight: 600; font-size: 12px; color: #1e293b;">${op.concept}</td>
            <td style="font-weight: 700; font-size: 12px; color: #0284c7;">${op.entity}</td>
            <td style="color: #64748b; font-family: monospace; font-size: 11px;">
                <div>${op.ref}</div>
                ${op.method ? `<div style="font-size: 10px; color: #94a3b8; text-transform: capitalize;">${op.method}</div>` : ''}
            </td>
            <td style="font-weight: 800; color: ${op.typeColor}; text-align: right;">$${Number(op.amount_usd || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
            <td style="color: #475569; font-weight: 700; text-align: right;">Bs. ${Number(op.amount_bs || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</td>
            <td style="text-align: center; font-weight: 900; color: ${op.typeColor}; font-size: 14px;">${op.sign}</td>
        </tr>
    `).join('');
}

// ==============================================================================
// 📊 ESTADO DE FLUJO DE CAJA MATRICIAL MULTIMENSUAL (CASO PRÁCTICO CONTABLE)
// ==============================================================================
let currentCfRange = 'all';
let currentCfCurrency = 'usd';
let currentCfDateFrom = null;
let currentCfDateTo = null;
let lastCashFlowData = null;

function setCashFlowRange(range) {
    currentCfRange = range;
    currentCfDateFrom = null;
    currentCfDateTo = null;
    const df = document.getElementById("cf_date_from");
    const dt = document.getElementById("cf_date_to");
    if (df) df.value = '';
    if (dt) dt.value = '';

    const monthSelect = document.getElementById("cf_matrix_month");
    if (monthSelect) monthSelect.value = '';

    ['all', 'ytd', 'h1', 'h2'].forEach(r => {
        const btn = document.getElementById(`btn_cf_range_${r}`);
        if (btn) btn.className = (r === range) ? 'btn-primary' : 'btn-secondary';
    });
    loadCashFlowMatrix();
}

function onCashFlowMonthChange() {
    const monthSelect = document.getElementById("cf_matrix_month");
    const monthVal = monthSelect?.value;
    if (monthVal) {
        currentCfRange = 'custom_month';
        ['all', 'ytd', 'h1', 'h2'].forEach(r => {
            const btn = document.getElementById(`btn_cf_range_${r}`);
            if (btn) btn.className = 'btn-secondary';
        });
    } else {
        currentCfRange = 'all';
        const btnAll = document.getElementById('btn_cf_range_all');
        if (btnAll) btnAll.className = 'btn-primary';
    }
    loadCashFlowMatrix();
}

function applyCashFlowDateFilter() {
    const df = document.getElementById("cf_date_from")?.value;
    const dt = document.getElementById("cf_date_to")?.value;
    if (!df || !dt) {
        alert("Por favor selecciona ambas fechas (Desde y Hasta).");
        return;
    }
    currentCfDateFrom = df;
    currentCfDateTo = dt;
    currentCfRange = 'custom_dates';
    ['all', 'ytd', 'h1', 'h2'].forEach(r => {
        const btn = document.getElementById(`btn_cf_range_${r}`);
        if (btn) btn.className = 'btn-secondary';
    });
    const monthSelect = document.getElementById("cf_matrix_month");
    if (monthSelect) monthSelect.value = '';
    loadCashFlowMatrix();
}

function clearCashFlowDateFilter() {
    currentCfDateFrom = null;
    currentCfDateTo = null;
    const df = document.getElementById("cf_date_from");
    const dt = document.getElementById("cf_date_to");
    if (df) df.value = '';
    if (dt) dt.value = '';
    setCashFlowRange('all');
}

function setCashFlowCurrency(curr) {
    currentCfCurrency = curr;
    const btnUsd = document.getElementById("btn_cf_curr_usd");
    const btnBs = document.getElementById("btn_cf_curr_bs");
    if (btnUsd && btnBs) {
        if (curr === 'usd') {
            btnUsd.style.background = '#2563eb';
            btnUsd.style.color = '#ffffff';
            btnBs.style.background = 'transparent';
            btnBs.style.color = '#475569';
        } else {
            btnBs.style.background = '#059669';
            btnBs.style.color = '#ffffff';
            btnUsd.style.background = 'transparent';
            btnUsd.style.color = '#475569';
        }
    }
    if (lastCashFlowData) {
        renderCashFlowMatrixTable(lastCashFlowData);
    }
}

async function loadCashFlowMatrix() {
    const table = document.getElementById("cashFlowMatrixTable");
    const thead = document.getElementById("cashFlowMatrixThead");
    const tbody = document.getElementById("cashFlowMatrixTbody");
    if (!table || !tbody) return;

    const yearSelect = document.getElementById("cf_matrix_year");
    const year = yearSelect ? (parseInt(yearSelect.value) || 2026) : 2026;
    const monthSelect = document.getElementById("cf_matrix_month");
    const monthVal = monthSelect?.value ? parseInt(monthSelect.value) : null;

    let url = `${API_BASE}/financial/cash-flow-matrix?year=${year}`;

    if (currentCfRange === 'custom_dates' && currentCfDateFrom && currentCfDateTo) {
        url += `&start_date=${encodeURIComponent(currentCfDateFrom)}&end_date=${encodeURIComponent(currentCfDateTo)}`;
    } else if (currentCfRange === 'custom_month' && monthVal) {
        url += `&month=${monthVal}`;
    } else if (currentCfRange === 'ytd') {
        url += `&is_ytd=true`;
    } else if (currentCfRange === 'h1') {
        url += `&start_month=1&end_month=6`;
    } else if (currentCfRange === 'h2') {
        url += `&start_month=7&end_month=12`;
    }

    tbody.innerHTML = `<tr><td colspan="15" style="text-align: center; padding: 24px; color: #94a3b8;"><i class="fa-solid fa-spinner fa-spin"></i> Conciliando flujo de caja del período...</td></tr>`;

    try {
        const res = await authFetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        lastCashFlowData = data;
        renderCashFlowMatrixTable(data);
    } catch (err) {
        console.error("Error loading cash flow matrix:", err);
        tbody.innerHTML = `<tr><td colspan="15" style="text-align: center; padding: 20px; color: #e11d48;"><i class="fa-solid fa-triangle-exclamation"></i> Error al cargar matriz de flujo de caja: ${err.message}</td></tr>`;
    }
}

function renderCashFlowMatrixTable(data) {
    const thead = document.getElementById("cashFlowMatrixThead");
    const tbody = document.getElementById("cashFlowMatrixTbody");
    if (!thead || !tbody || !data || !Array.isArray(data.months)) return;

    const bcvBadge = document.getElementById("cf_bcv_badge");
    const bcvRate = Number(data.bcv_rate || 857.01);
    if (bcvBadge) {
        bcvBadge.innerHTML = `<i class="fa-solid fa-building-columns"></i> BCV: ${bcvRate.toFixed(2)} Bs/$`;
    }

    const isBs = (currentCfCurrency === 'bs');
    const currencyPrefix = isBs ? 'Bs. ' : '$';

    const conv = (valUsd) => {
        const num = Number(valUsd || 0);
        return isBs ? (num * bcvRate) : num;
    };

    const fmt = (valUsd, isZeroDash = true) => {
        const num = conv(valUsd);
        if (isZeroDash && Math.abs(num) < 0.01) return '<span style="color: #cbd5e1;">-</span>';
        const str = Math.abs(num).toLocaleString(isBs ? 'es-VE' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const res = `${currencyPrefix}${str}`;
        return num < 0 ? `(${res})` : res;
    };

    const months = data.months;

    // 1. Render Encabezado de Meses
    let theadHtml = `<tr>
        <th style="padding: 10px 14px; background: #1e3a8a; color: white; text-align: left; position: sticky; left: 0; z-index: 3; min-width: 240px; font-size: 12px; font-weight: 800; border-right: 2px solid #3b82f6;">
            Concepto / Partida Contable (${isBs ? 'Bolívares Bs.' : 'Dólares USD'})
        </th>`;
    months.forEach(m => {
        theadHtml += `<th style="padding: 10px 12px; background: #1e3a8a; color: white; text-align: right; min-width: 110px; font-size: 11.5px; font-weight: 800; border-right: 1px solid #2563eb;">
            ${m.month_name.toUpperCase()}
        </th>`;
    });
    theadHtml += `<th style="padding: 10px 14px; background: #0f172a; color: #38bdf8; text-align: right; min-width: 125px; font-size: 12px; font-weight: 900;">
        TOTAL PERÍODO
    </th></tr>`;
    thead.innerHTML = theadHtml;

    const row = (label, getVal, opts = {}) => {
        const isHeader = opts.isHeader || false;
        const isTotal = opts.isTotal || false;
        const isSub = opts.isSub || false;
        const color = opts.color || 'inherit';
        const bg = opts.bg || (isHeader ? '#f8fafc' : (isTotal ? '#f1f5f9' : '#fff'));

        let sumUsd = 0;
        months.forEach(m => { sumUsd += Number(getVal(m) || 0); });

        let tr = `<tr style="background: ${bg}; border-bottom: 1px solid ${isTotal ? '#cbd5e1' : '#f1f5f9'};">
            <td style="padding: ${isHeader ? '8px 12px' : '6px 14px'}; position: sticky; left: 0; background: ${bg}; z-index: 2; border-right: 2px solid #cbd5e1; font-weight: ${isHeader || isTotal ? '800' : '600'}; color: ${isHeader ? 'var(--dalor-navy)' : '#334155'}; padding-left: ${isSub ? '24px' : '12px'}; font-size: ${isHeader ? '12px' : '11px'};">
                ${label}
            </td>`;
        months.forEach(m => {
            const v = getVal(m);
            tr += `<td style="padding: 6px 12px; text-align: right; font-weight: ${isHeader || isTotal ? '800' : '600'}; color: ${color}; border-right: 1px solid #f1f5f9;">
                ${isHeader ? '' : fmt(v)}
            </td>`;
        });
        tr += `<td style="padding: 6px 14px; text-align: right; font-weight: 800; color: ${color}; background: ${isTotal ? '#e2e8f0' : '#f8fafc'};">
            ${isHeader ? '' : fmt(sumUsd)}
        </td></tr>`;
        return tr;
    };

    let tbodyHtml = '';

    // 1. SALDO INICIAL
    tbodyHtml += `<tr style="background: #eff6ff; border-bottom: 2px solid #93c5fd; font-weight: 800;">
        <td style="padding: 9px 12px; position: sticky; left: 0; background: #eff6ff; z-index: 2; border-right: 2px solid #93c5fd; color: #1e40af; font-size: 12px;">
            <i class="fa-solid fa-vault"></i> Saldo Inicial en Bancos y Caja
        </td>`;
    months.forEach(m => {
        tbodyHtml += `<td style="padding: 9px 12px; text-align: right; color: #1e40af; font-weight: 800; border-right: 1px solid #dbeafe;">
            ${fmt(m.saldo_inicial)}
        </td>`;
    });
    tbodyHtml += `<td style="padding: 9px 14px; text-align: right; color: #1e40af; font-weight: 900; background: #dbeafe;">
        ${fmt(data.opening_period_balance)}
    </td></tr>`;

    // 2. DETALLE DE INGRESOS
    tbodyHtml += row('<i class="fa-solid fa-arrow-down-long" style="color: #059669;"></i> <b>DETALLE DE INGRESOS</b>', () => '', { isHeader: true, bg: '#f0fdf4' });
    tbodyHtml += row('• Cobranzas Clientes / Valuaciones de Obra', m => m.ingresos.cxc_obras, { isSub: true });
    tbodyHtml += row('• Ingresos por Alquileres de Equipos DALOR', m => m.ingresos.alquileres_dalor, { isSub: true });
    tbodyHtml += row('• Anticipos / Abonos Directos de Clientes', m => m.ingresos.anticipos_directos, { isSub: true });
    tbodyHtml += row('• Mesa de Cambio / Arbitraje (Entradas)', m => m.ingresos.mesa_cambio, { isSub: true, color: '#2563eb' });
    tbodyHtml += row('<b>TOTAL INGRESOS</b>', m => m.ingresos.total_ingresos, { isTotal: true, color: '#059669', bg: '#ecfdf5' });

    // 3. DETALLE DE EGRESOS
    tbodyHtml += row('<i class="fa-solid fa-arrow-up-long" style="color: #e11d48;"></i> <b>DETALLE DE EGRESOS</b>', () => '', { isHeader: true, bg: '#fff1f2' });
    tbodyHtml += row('• Compras de Materiales e Insumos', m => m.egresos.materiales_insumos, { isSub: true });
    tbodyHtml += row('• Nómina de Mano de Obra y Cuadrillas', m => m.egresos.nomina_personal, { isSub: true });
    tbodyHtml += row('• Pagos a Proveedores / Cuentas por Pagar (CxP)', m => m.egresos.proveedores_cxp, { isSub: true });
    tbodyHtml += row('• Alquileres de Maquinaria Externa', m => m.egresos.alquileres_maquinaria, { isSub: true });
    tbodyHtml += row('• Gastos Fijos de Sede y Operativos', m => m.egresos.gastos_sede_fijos, { isSub: true });
    tbodyHtml += row('• Mesa de Cambio / Arbitraje (Salidas)', m => m.egresos.mesa_cambio, { isSub: true, color: '#d97706' });
    tbodyHtml += row('<b>TOTAL EGRESOS</b>', m => m.egresos.total_egresos, { isTotal: true, color: '#e11d48', bg: '#ffe4e6' });

    // 4. FLUJO DE CAJA ECONÓMICO / OPERATIVO
    tbodyHtml += row('<b>(=) FLUJO DE CAJA ECONÓMICO (Ingresos - Egresos)</b>', m => m.flujo_economico_operativo, { isTotal: true, color: '#1e293b', bg: '#f1f5f9' });

    // 5. FINANCIAMIENTO & MOVIMIENTOS DE SOCIOS
    tbodyHtml += row('<i class="fa-solid fa-coins" style="color: #7c3aed;"></i> <b>FINANCIAMIENTO & SOCIOS</b>', () => '', { isHeader: true, bg: '#faf5ff' });
    tbodyHtml += row('• Retiros Personales de Socios (-)', m => m.financiamiento.retiros_socios ? -m.financiamiento.retiros_socios : 0, { isSub: true, color: '#7c3aed' });
    tbodyHtml += row('• Diferencial Cambiario Neto (Arbitraje)', m => m.financiamiento.diferencial_cambiario, { isSub: true, color: '#2563eb' });
    tbodyHtml += row('<b>TOTAL FINANCIAMIENTO</b>', m => m.financiamiento.total_financiamiento, { isTotal: true, color: '#7c3aed', bg: '#f3e8ff' });

    // 6. FLUJO DE CAJA FINANCIERO / SALDO FINAL
    tbodyHtml += `<tr style="background: #1e293b; color: white; border-top: 3px solid #0284c7; font-weight: 900; font-size: 12px;">
        <td style="padding: 10px 12px; position: sticky; left: 0; background: #1e293b; z-index: 2; border-right: 2px solid #38bdf8; color: #38bdf8;">
            <i class="fa-solid fa-wallet"></i> (=) SALDO FINAL DE CAJA DISPONIBLE
        </td>`;
    months.forEach(m => {
        const isPos = m.saldo_final >= 0;
        tbodyHtml += `<td style="padding: 10px 12px; text-align: right; color: ${isPos ? '#34d399' : '#f87171'}; border-right: 1px solid #334155;">
            ${fmt(m.saldo_final, false)}
        </td>`;
    });
    tbodyHtml += `<td style="padding: 10px 14px; text-align: right; color: ${data.closing_period_balance >= 0 ? '#34d399' : '#f87171'}; background: #0f172a; font-size: 13px;">
        ${fmt(data.closing_period_balance, false)}
    </td></tr>`;

    tbody.innerHTML = tbodyHtml;
}

function printCashFlowMatrixReport() {
    const table = document.getElementById("cashFlowMatrixTable");
    if (!table) return;
    const year = document.getElementById("cf_matrix_year")?.value || "2026";
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
        <head>
            <title>DALOR SIGO-P - Flujo de Caja Matricial ${year}</title>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 20px; font-size: 11px; }
                h2 { color: #1e3a8a; margin-bottom: 4px; font-size: 16px; }
                p { color: #64748b; margin-top: 0; font-size: 11px; }
                table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                th, td { border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 10.5px; }
                th { background: #1e3a8a !important; color: white !important; -webkit-print-color-adjust: exact; }
                tr { -webkit-print-color-adjust: exact; }
            </style>
        </head>
        <body>
            <h2>METALMECÁNICA DALOR C.A. - ESTADO DE FLUJO DE CAJA</h2>
            <p>Período Fiscal: ${year} • Generado el ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()} por DALOR SIGO-P</p>
            ${table.outerHTML}
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 300);
}

// ==============================================================================
// 🔁 MESA DE CAMBIO DE DIVISAS & ARBITRAJE CAMBIARIO
// ==============================================================================
let bcvRatesHistoryCache = [];

async function openTreasuryExchangeModal() {
    const form = document.getElementById("treasuryExchangeForm");
    if (form) form.reset();

    // Fecha por defecto: hoy
    const dateInput = document.getElementById("exch_date");
    if (dateInput) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }

    // Consultar tasa oficial BCV en vivo
    try {
        const res = await authFetch(`${API_BASE}/financial/bcv-rates/history?limit=30`);
        if (res.ok) {
            const data = await res.json();
            bcvRatesHistoryCache = data.history || [];
            const liveRate = data.current_rate || 857.01;
            const rateInput = document.getElementById("exch_bcv_rate_input");
            const rateLbl = document.getElementById("exch_bcv_rate_lbl");
            const sourceLbl = document.getElementById("exch_bcv_rate_source_lbl");
            if (rateInput) rateInput.value = Number(liveRate).toFixed(2);
            if (rateLbl) rateLbl.innerText = `Bs. ${Number(liveRate).toFixed(2)}`;
            if (sourceLbl) sourceLbl.innerText = `Tasa oficial en vivo (${Number(liveRate).toFixed(2)} Bs/$)`;
        }
    } catch (e) {
        console.warn("Could not load BCV live rate:", e);
    }

    onTreasuryExchangeTypeChanged();
    calcTreasuryExchangeDiff();
    openModal("modalTreasuryExchange");
}

function onTreasuryExchangeDateChanged() {
    const dateVal = document.getElementById("exch_date")?.value;
    if (!dateVal || !bcvRatesHistoryCache.length) return;
    const match = bcvRatesHistoryCache.find(r => r.rate_date === dateVal);
    if (match) {
        const rateInput = document.getElementById("exch_bcv_rate_input");
        const rateLbl = document.getElementById("exch_bcv_rate_lbl");
        const sourceLbl = document.getElementById("exch_bcv_rate_source_lbl");
        if (rateInput) rateInput.value = Number(match.rate).toFixed(2);
        if (rateLbl) rateLbl.innerText = `Bs. ${Number(match.rate).toFixed(2)}`;
        if (sourceLbl) sourceLbl.innerText = `Tasa histórica del ${match.rate_date} (${match.source})`;
        calcTreasuryExchangeDiff();
    }
}

async function openBcvRateHistoryModal() {
    openModal("modalBcvRateHistory");
    const tbody = document.getElementById("bcvHistoryTableBody");
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 16px; color: #94a3b8;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando tasas históricas...</td></tr>`;
    try {
        const res = await authFetch(`${API_BASE}/financial/bcv-rates/history?limit=90`);
        if (res.ok) {
            const data = await res.json();
            bcvRatesHistoryCache = data.history || [];
        }
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 16px; color: #e11d48;">Error al consultar histórico BCV.</td></tr>`;
        return;
    }

    if (!bcvRatesHistoryCache.length) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 16px; color: #94a3b8;">No hay registros históricos de tasas.</td></tr>`;
        return;
    }

    tbody.innerHTML = bcvRatesHistoryCache.map(r => `
        <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 8px 10px; font-weight: 700; color: #1e293b;">${r.rate_date}</td>
            <td style="padding: 8px 10px; text-align: right; font-weight: 900; color: #0284c7;">Bs. ${Number(r.rate).toFixed(2)}</td>
            <td style="padding: 8px 10px; color: #64748b; font-size: 11px;">${r.source}</td>
            <td style="padding: 8px 10px; text-align: center;">
                <button type="button" onclick="selectBcvHistoricalRate(${r.rate}, '${r.rate_date}')" class="btn-primary" style="padding: 3px 8px; font-size: 11px;">
                    Seleccionar
                </button>
            </td>
        </tr>
    `).join('');
}

function selectBcvHistoricalRate(rate, date) {
    const val = Number(rate);
    if (isNaN(val) || val <= 0) return;

    // 1. Sincronizar inputs de la mesa de cambio si está activa
    const rateInput = document.getElementById("exch_bcv_rate_input");
    const rateLbl = document.getElementById("exch_bcv_rate_lbl");
    const sourceLbl = document.getElementById("exch_bcv_rate_source_lbl");
    if (rateInput) rateInput.value = val.toFixed(2);
    if (rateLbl) rateLbl.innerText = `Bs. ${val.toFixed(2)}`;
    if (sourceLbl) sourceLbl.innerText = `Tasa histórica seleccionada (${date}: ${val.toFixed(2)} Bs/$)`;

    const dateInput = document.getElementById("exch_date");
    if (dateInput && date) dateInput.value = date;

    // 2. Sincronizar input manual de contingencia
    const manualInput = document.getElementById("manualTasaInput");
    if (manualInput) manualInput.value = val.toFixed(2);

    // 3. Sincronizar estado global, cabecera y tarjetas de KPIs
    window.EXCHANGE_RATE = val;
    if (window.BCV_DATA) {
        window.BCV_DATA.rate = val;
        window.BCV_DATA.date_value = date;
    }
    localStorage.setItem('dalor_exchange_rate', val);

    const display = document.getElementById("bcvRateDisplay");
    if (display) display.innerText = val.toFixed(2);

    const kpiBcv = document.getElementById("kpi_partners_bcv_rate");
    if (kpiBcv) kpiBcv.innerText = `${val.toFixed(2)} Bs/$`;

    closeModal("modalBcvRateHistory");
    if (typeof calcTreasuryExchangeDiff === 'function') calcTreasuryExchangeDiff();
    if (typeof showRealtimeToast === 'function') {
        showRealtimeToast(`Tasa histórica seleccionada: ${val.toFixed(2)} Bs/$ (${date})`, 'tasa_bcv', 'info');
    }
}

function onTreasuryExchangeTypeChanged() {
    const opType = document.getElementById("exch_operation_type")?.value || "bs_a_usd";
    const srcLbl = document.getElementById("exch_source_label");
    const tgtLbl = document.getElementById("exch_target_label");
    const srcAcc = document.getElementById("exch_source_account");
    const tgtAcc = document.getElementById("exch_target_account");

    if (opType === "bs_a_usd") {
        if (srcLbl) srcLbl.innerText = "Monto que Sale (Bs) *";
        if (tgtLbl) tgtLbl.innerText = "Monto que Entra ($ USD) *";
        if (srcAcc) srcAcc.value = "Banesco Banco Universal (Bs)";
        if (tgtAcc) tgtAcc.value = "Binance USDT";
    } else {
        if (srcLbl) srcLbl.innerText = "Monto que Sale ($ USD) *";
        if (tgtLbl) tgtLbl.innerText = "Monto que Entra (Bs) *";
        if (srcAcc) srcAcc.value = "Binance USDT";
        if (tgtAcc) tgtAcc.value = "Banesco Banco Universal (Bs)";
    }
    calcTreasuryExchangeDiff();
}

function calcTreasuryExchangeDiff() {
    const opType = document.getElementById("exch_operation_type")?.value || "bs_a_usd";
    const srcAmt = parseFloat(document.getElementById("exch_source_amount")?.value) || 0;
    const tgtAmt = parseFloat(document.getElementById("exch_target_amount")?.value) || 0;
    
    // Obtener tasa BCV desde el input interactivo o fallback
    const rateInput = document.getElementById("exch_bcv_rate_input");
    const bcvRate = (rateInput && parseFloat(rateInput.value)) ? parseFloat(rateInput.value) : (window.BCV_DATA?.rate || 857.01);

    const bcvLbl = document.getElementById("exch_bcv_rate_lbl");
    if (bcvLbl) bcvLbl.innerText = `Bs. ${bcvRate.toFixed(2)}`;

    const transLbl = document.getElementById("exch_trans_rate_lbl");
    const badge = document.getElementById("exch_diff_badge");
    const explanation = document.getElementById("exch_explanation");

    if (srcAmt <= 0 || tgtAmt <= 0) {
        if (transLbl) transLbl.innerText = "0.00 Bs/$";
        if (badge) { badge.innerText = "$0.00 USD"; badge.style.color = "#64748b"; }
        if (explanation) explanation.innerHTML = "Ingrese los montos para calcular la tasa pactada y el impacto en cuentas financieras.";
        return;
    }

    if (opType === "bs_a_usd") {
        const transRate = srcAmt / tgtAmt;
        const officialUsd = srcAmt / bcvRate;
        const diffUsd = tgtAmt - officialUsd;

        if (transLbl) transLbl.innerText = `${transRate.toFixed(2)} Bs/$`;
        if (badge) {
            if (diffUsd < -0.01) {
                badge.innerText = `-$${Math.abs(diffUsd).toFixed(2)} USD (Pérdida)`;
                badge.style.color = "#dc2626";
                if (explanation) explanation.innerHTML = `⚠️ <strong>Pérdida Cambiaria:</strong> Se cancelaron ${transRate.toFixed(2)} Bs/$ (por encima de BCV ${bcvRate.toFixed(2)}). Se contabiliza como gasto financiero sin alterar costos de obra.`;
            } else {
                badge.innerText = `+$${Math.abs(diffUsd).toFixed(2)} USD (Ganancia)`;
                badge.style.color = "#16a34a";
                if (explanation) explanation.innerHTML = `✅ <strong>Ganancia Cambiaria:</strong> Compra de divisas a tasa favorable frente al BCV oficial.`;
            }
        }
    } else {
        const transRate = tgtAmt / srcAmt;
        const officialUsd = tgtAmt / bcvRate;
        const diffUsd = officialUsd - srcAmt;

        if (transLbl) transLbl.innerText = `${transRate.toFixed(2)} Bs/$`;
        if (badge) {
            if (diffUsd > 0.01) {
                badge.innerText = `+$${Math.abs(diffUsd).toFixed(2)} USD (Ganancia)`;
                badge.style.color = "#16a34a";
                if (explanation) explanation.innerHTML = `✅ <strong>Ganancia Cambiaria:</strong> Venta de divisas a ${transRate.toFixed(2)} Bs/$ (por encima de BCV ${bcvRate.toFixed(2)}). Se genera excedente en Bs registrado como ingreso financiero.`;
            } else {
                badge.innerText = `-$${Math.abs(diffUsd).toFixed(2)} USD (Pérdida)`;
                badge.style.color = "#dc2626";
                if (explanation) explanation.innerHTML = `⚠️ <strong>Pérdida Cambiaria:</strong> Venta de divisas por debajo de la tasa oficial BCV.`;
            }
        }
    }
}

async function submitTreasuryExchange(e) {
    if (e && e.preventDefault) e.preventDefault();

    const opType = document.getElementById("exch_operation_type")?.value || "bs_a_usd";
    const srcAcc = document.getElementById("exch_source_account")?.value || "";
    const tgtAcc = document.getElementById("exch_target_account")?.value || "";
    const srcAmt = parseFloat(document.getElementById("exch_source_amount")?.value) || 0;
    const tgtAmt = parseFloat(document.getElementById("exch_target_amount")?.value) || 0;
    const ref = (document.getElementById("exch_reference")?.value || "").trim();
    const notes = (document.getElementById("exch_notes")?.value || "").trim();
    const opDate = document.getElementById("exch_date")?.value || "";
    const rateInput = document.getElementById("exch_bcv_rate_input");
    const bcvRate = (rateInput && parseFloat(rateInput.value)) ? parseFloat(rateInput.value) : (window.BCV_DATA?.rate || 857.01);

    if (srcAmt <= 0 || tgtAmt <= 0) {
        alert("Los montos de origen y destino deben ser mayores a cero.");
        return;
    }
    if (srcAcc === tgtAcc) {
        alert("La cuenta de origen y de destino no pueden ser la misma.");
        return;
    }
    if (!ref) {
        alert("Debes indicar el número de referencia bancaria o de orden P2P.");
        return;
    }

    const payload = {
        operation_type: opType,
        source_account: srcAcc,
        target_account: tgtAcc,
        source_amount: srcAmt,
        target_amount: tgtAmt,
        exchange_rate: bcvRate,
        operation_date: opDate || null,
        reference_number: ref,
        notes: notes
    };

    try {
        const res = await authFetch(`${API_BASE}/financial/exchange`, {
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
        closeModal("modalTreasuryExchange");
        await loadTreasurySummary();

        if (typeof showToastNotification === 'function') {
            showToastNotification(`✅ ${data.message || 'Cambio de divisas registrado.'}`, 'success');
        } else {
            alert(`✅ ${data.message || 'Operación registrada con éxito.'}`);
        }
    } catch (err) {
    }
}

// --- BLOQUE L9996-L10369 ---


// Auto-window binding & ES6 exports
if (typeof window !== 'undefined') {
    window.calcFinTransFromUsd = calcFinTransFromUsd;
    window.calcFinTransFromBs = calcFinTransFromBs;
    window.onFinTransMethodChanged = onFinTransMethodChanged;
    window.calcFinTransBsEquiv = calcFinTransBsEquiv;
    window.onFinTransAccountChanged = onFinTransAccountChanged;
    window.openClientRefundModal = openClientRefundModal;
    window.submitClientRefund = submitClientRefund;
    window.openRecordPaymentModal = openRecordPaymentModal;
    window.submitFinancialPayment = submitFinancialPayment;
    window.onTreasurySummaryPeriodChange = onTreasurySummaryPeriodChange;
    window.resetTreasurySummaryFilters = resetTreasurySummaryFilters;
    window.loadTreasurySummary = loadTreasurySummary;
    window.getIsoDate = getIsoDate;
    window.formatDateDisplay = formatDateDisplay;
    window.applyTreasuryFilters = applyTreasuryFilters;
    window.handleTreasuryPeriodChange = handleTreasuryPeriodChange;
    window.updateTreasuryTraceKpis = updateTreasuryTraceKpis;
    window.resetTreasuryFilters = resetTreasuryFilters;
    window.printTreasuryTraceReport = printTreasuryTraceReport;
    window.goToTreasuryPage = goToTreasuryPage;
    window.changeTreasuryPageSize = changeTreasuryPageSize;
    window.renderTreasuryTracePaginated = renderTreasuryTracePaginated;
    window.setCashFlowRange = setCashFlowRange;
    window.onCashFlowMonthChange = onCashFlowMonthChange;
    window.applyCashFlowDateFilter = applyCashFlowDateFilter;
    window.clearCashFlowDateFilter = clearCashFlowDateFilter;
    window.setCashFlowCurrency = setCashFlowCurrency;
    window.loadCashFlowMatrix = loadCashFlowMatrix;
    window.renderCashFlowMatrixTable = renderCashFlowMatrixTable;
    window.printCashFlowMatrixReport = printCashFlowMatrixReport;
    window.openTreasuryExchangeModal = openTreasuryExchangeModal;
    window.onTreasuryExchangeDateChanged = onTreasuryExchangeDateChanged;
    window.openBcvRateHistoryModal = openBcvRateHistoryModal;
    window.selectBcvHistoricalRate = selectBcvHistoricalRate;
    window.onTreasuryExchangeTypeChanged = onTreasuryExchangeTypeChanged;
    window.calcTreasuryExchangeDiff = calcTreasuryExchangeDiff;
    window.submitTreasuryExchange = submitTreasuryExchange;
}

export { calcFinTransFromUsd };
export { calcFinTransFromBs };
export { onFinTransMethodChanged };
export { calcFinTransBsEquiv };
export { onFinTransAccountChanged };
export { openClientRefundModal };
export { submitClientRefund };
export { openRecordPaymentModal };
export { submitFinancialPayment };
export { onTreasurySummaryPeriodChange };
export { resetTreasurySummaryFilters };
export { loadTreasurySummary };
export { getIsoDate };
export { formatDateDisplay };
export { applyTreasuryFilters };
export { handleTreasuryPeriodChange };
export { updateTreasuryTraceKpis };
export { resetTreasuryFilters };
export { printTreasuryTraceReport };
export { goToTreasuryPage };
export { changeTreasuryPageSize };
export { renderTreasuryTracePaginated };
export { setCashFlowRange };
export { onCashFlowMonthChange };
export { applyCashFlowDateFilter };
export { clearCashFlowDateFilter };
export { setCashFlowCurrency };
export { loadCashFlowMatrix };
export { renderCashFlowMatrixTable };
export { printCashFlowMatrixReport };
export { openTreasuryExchangeModal };
export { onTreasuryExchangeDateChanged };
export { openBcvRateHistoryModal };
export { selectBcvHistoricalRate };
export { onTreasuryExchangeTypeChanged };
export { calcTreasuryExchangeDiff };
export { submitTreasuryExchange };
