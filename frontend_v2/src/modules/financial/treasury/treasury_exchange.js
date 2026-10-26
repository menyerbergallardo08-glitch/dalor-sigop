/**
 * DALOR SIGO-P | Módulo: TREASURY_EXCHANGE.JS
 * Mesa de Cambio de Divisas & Arbitraje Cambiario, historial de tasas BCV y liquidaciones
 */

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
            const liveRate = data.current_rate || (window.BCV_DATA?.rate || 857.01);
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
    if (typeof openModal === 'function') openModal("modalTreasuryExchange");
    else if (typeof window !== 'undefined' && typeof window.openModal === 'function') window.openModal("modalTreasuryExchange");
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
    if (typeof openModal === 'function') openModal("modalBcvRateHistory");
    else if (typeof window !== 'undefined' && typeof window.openModal === 'function') window.openModal("modalBcvRateHistory");

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

    if (typeof closeModal === 'function') closeModal("modalBcvRateHistory");
    else if (typeof window !== 'undefined' && typeof window.closeModal === 'function') window.closeModal("modalBcvRateHistory");

    calcTreasuryExchangeDiff();
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
        if (typeof closeModal === 'function') closeModal("modalTreasuryExchange");
        else if (typeof window !== 'undefined' && typeof window.closeModal === 'function') window.closeModal("modalTreasuryExchange");

        if (typeof window.loadTreasurySummary === 'function') await window.loadTreasurySummary();

        if (typeof showToastNotification === 'function') {
            showToastNotification(`✅ ${data.message || 'Cambio de divisas registrado.'}`, 'success');
        } else {
            alert(`✅ ${data.message || 'Operación registrada con éxito.'}`);
        }
    } catch (err) {
        alert("Error: " + err.message);
    }
}

// PUENTE GLOBAL WINDOW
if (typeof window !== 'undefined') {
    window.openTreasuryExchangeModal = openTreasuryExchangeModal;
    window.onTreasuryExchangeDateChanged = onTreasuryExchangeDateChanged;
    window.openBcvRateHistoryModal = openBcvRateHistoryModal;
    window.selectBcvHistoricalRate = selectBcvHistoricalRate;
    window.onTreasuryExchangeTypeChanged = onTreasuryExchangeTypeChanged;
    window.calcTreasuryExchangeDiff = calcTreasuryExchangeDiff;
    window.submitTreasuryExchange = submitTreasuryExchange;
}

export {
    openTreasuryExchangeModal,
    onTreasuryExchangeDateChanged,
    openBcvRateHistoryModal,
    selectBcvHistoricalRate,
    onTreasuryExchangeTypeChanged,
    calcTreasuryExchangeDiff,
    submitTreasuryExchange
};
