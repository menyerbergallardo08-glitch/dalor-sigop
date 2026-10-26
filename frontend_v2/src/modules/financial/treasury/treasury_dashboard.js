/**
 * DALOR SIGO-P | Módulo: TREASURY_DASHBOARD.JS
 * Resumen Ejecutivo de Tesorería, KPIs consolidados, filtros por período y conciliación
 */

import { loadCashFlowMatrix } from './treasury_cashflow.js';
import { getIsoDate, formatDateDisplay, applyTreasuryFilters, setTreasuryOperations } from './treasury_trace.js';

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

    if (typeof loadCashFlowMatrix === 'function') {
        loadCashFlowMatrix();
    } else if (typeof window !== 'undefined' && typeof window.loadCashFlowMatrix === 'function') {
        window.loadCashFlowMatrix();
    }

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

        if (kpisContainer) {
            kpisContainer.innerHTML = `
                <div class="card" style="margin-bottom: 0; text-align: center; border-left: 4px solid #059669;">
                    <span style="font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase;">Cobros Recibidos</span>
                    <p style="font-size: 18px; font-weight: 900; color: #059669; margin-top: 4px;">$${(k.total_collected_cxc_usd || 0).toLocaleString()}</p>
                    <span style="font-size: 10px; color: #10b981;">Total ingresado</span>
                </div>

                <div class="card" style="margin-bottom: 0; text-align: center; border-left: 4px solid #e11d48;">
                    <span style="font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase;">Pagos a Proveedores</span>
                    <p style="font-size: 18px; font-weight: 900; color: #e11d48; margin-top: 4px;">$${(k.total_paid_cxp_usd || 0).toLocaleString()}</p>
                    <span style="font-size: 10px; color: #f43f5e;">Total cancelado</span>
                </div>

                <div class="card" style="margin-bottom: 0; text-align: center; border-left: 4px solid #0284c7;">
                    <span style="font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase;">Cartera por Cobrar (CxC)</span>
                    <p style="font-size: 18px; font-weight: 900; color: #0284c7; margin-top: 4px;">$${(k.pending_cxc_usd || 0).toLocaleString()}</p>
                    <span style="font-size: 10px; color: #38bdf8;">Dinero en la calle</span>
                </div>

                <div class="card" style="margin-bottom: 0; text-align: center; border-left: 4px solid #f59e0b;">
                    <span style="font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase;">Deuda a Proveedores (CxP)</span>
                    <p style="font-size: 18px; font-weight: 900; color: #f59e0b; margin-top: 4px;">$${(k.pending_cxp_usd || 0).toLocaleString()}</p>
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
        }

        if (cashflowDetails) {
            cashflowDetails.innerHTML = `
                ${(k.total_initial_balance_usd && k.total_initial_balance_usd > 0) ? `
                <div style="display: flex; justify-content: space-between; padding: 6px 10px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; font-size: 12px;">
                    <span style="color: #15803d; font-weight: 700;"><i class="fa-solid fa-coins"></i> (+) Saldo Inicial / Apertura:</span>
                    <b style="color: #15803d;">+$${k.total_initial_balance_usd.toLocaleString()}</b>
                </div>` : ''}

                <div style="display: flex; justify-content: space-between; padding: 6px 10px; background: #f8fafc; border-radius: 6px; font-size: 12px;">
                    <span>(+) Cobranzas Líquidas de Clientes:</span>
                    <b style="color: #059669;">+$${(k.total_collected_cxc_usd || 0).toLocaleString()}</b>
                </div>

                <div style="display: flex; justify-content: space-between; padding: 6px 10px; background: #f8fafc; border-radius: 6px; font-size: 12px;">
                    <span>(-) Pagos a Proveedores / CxP:</span>
                    <b style="color: #e11d48;">-$${(k.total_paid_cxp_usd || 0).toLocaleString()}</b>
                </div>

                <div style="display: flex; justify-content: space-between; padding: 6px 10px; background: #f8fafc; border-radius: 6px; font-size: 12px;">
                    <span>(-) Gastos Operativos Directos / Caja:</span>
                    <b style="color: #e11d48;">-$${(k.total_direct_expenses_usd || 0).toLocaleString()}</b>
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
                    <span style="color: ${((k.net_operating_cash_usd || 0) - (k.total_pending_tax_withholdings_usd || 0)) >= 0 ? '#34d399' : '#f87171'};">
                        $${((k.net_operating_cash_usd || 0) - (k.total_pending_tax_withholdings_usd || 0)).toLocaleString()}
                    </span>
                </div>
            `;
        }

        if (creditDetails) {
            const netCredit = (k.pending_cxc_usd || 0) - (k.pending_cxp_usd || 0);
            creditDetails.innerHTML = `
                <div style="display: flex; justify-content: space-between; padding: 6px 10px; background: #f8fafc; border-radius: 6px; font-size: 12px;">
                    <span>Cuentas por Cobrar Pendientes (CxC):</span>
                    <b style="color: #0284c7;">$${(k.pending_cxc_usd || 0).toLocaleString()}</b>
                </div>

                <div style="display: flex; justify-content: space-between; padding: 6px 10px; background: #f8fafc; border-radius: 6px; font-size: 12px;">
                    <span>Cuentas por Pagar Pendientes (CxP):</span>
                    <b style="color: #e11d48;">$${(k.pending_cxp_usd || 0).toLocaleString()}</b>
                </div>

                <div style="display: flex; justify-content: space-between; padding: 8px 10px; background: #0f172a; color: white; border-radius: 6px; font-size: 13px; font-weight: 800; margin-top: 4px;">
                    <span>Posición Neta de Crédito (CxC - CxP):</span>
                    <span style="color: ${netCredit >= 0 ? '#38bdf8' : '#f87171'};">$${netCredit.toLocaleString()}</span>
                </div>
            `;
        }

        // --- TRAZABILIDAD LÍNEA POR LÍNEA DESEMPAQUETADA EN TESORERÍA ---
        const traceTbody = document.getElementById("treasuryTraceTableBody");
        if (traceTbody) {
            try {
                const token = (typeof window !== 'undefined' && window.authToken) || (typeof localStorage !== 'undefined' && localStorage.getItem('dalor_token')) || null;
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
                const bcvRate = window.BCV_DATA?.rate || (typeof State !== 'undefined' && State.exchangeRate) || (typeof EXCHANGE_RATE !== 'undefined' ? EXCHANGE_RATE : 850.0);

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

                // 5. Trazabilidad de gastos operativos directos aprobados
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

                // Ordenar cronológicamente descendente
                operations.sort((a, b) => (b.rawDate || b.date || '').localeCompare(a.rawDate || a.date || ''));
                
                setTreasuryOperations(operations);
                applyTreasuryFilters();
            } catch (errTrace) {
                console.error("Error al cargar traza de tesorería:", errTrace);
            }
        }

    } catch (e) {
        console.error("Error al cargar tesorería:", e);
    }
}

// PUENTE GLOBAL WINDOW
if (typeof window !== 'undefined') {
    window.loadFinancialSummary = loadTreasurySummary;
    window.onTreasurySummaryPeriodChange = onTreasurySummaryPeriodChange;
    window.resetTreasurySummaryFilters = resetTreasurySummaryFilters;
    window.loadTreasurySummary = loadTreasurySummary;
}

export {
    onTreasurySummaryPeriodChange,
    resetTreasurySummaryFilters,
    loadTreasurySummary
};
