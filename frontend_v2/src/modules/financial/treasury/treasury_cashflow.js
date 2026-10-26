/**
 * DALOR SIGO-P | Módulo: TREASURY_CASHFLOW.JS
 * Estado de Flujo de Caja Matricial Multimensual, filtros de períodos, monedas y reportes
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

// PUENTE GLOBAL WINDOW
if (typeof window !== 'undefined') {
    window.setCashFlowRange = setCashFlowRange;
    window.onCashFlowMonthChange = onCashFlowMonthChange;
    window.applyCashFlowDateFilter = applyCashFlowDateFilter;
    window.clearCashFlowDateFilter = clearCashFlowDateFilter;
    window.setCashFlowCurrency = setCashFlowCurrency;
    window.loadCashFlowMatrix = loadCashFlowMatrix;
    window.renderCashFlowMatrixTable = renderCashFlowMatrixTable;
    window.printCashFlowMatrixReport = printCashFlowMatrixReport;
}

export {
    setCashFlowRange,
    onCashFlowMonthChange,
    applyCashFlowDateFilter,
    clearCashFlowDateFilter,
    setCashFlowCurrency,
    loadCashFlowMatrix,
    renderCashFlowMatrixTable,
    printCashFlowMatrixReport
};
