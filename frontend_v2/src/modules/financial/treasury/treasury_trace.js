/**
 * DALOR SIGO-P | Módulo: TREASURY_TRACE.JS
 * Trazabilidad de movimientos bancarios y caja, filtros de auditoría, KPIs y reportes
 */

let allTreasuryOperations = [];
let filteredTreasuryOperations = [];
let treasuryCurrentPage = 1;
let treasuryPageSize = 10;

function setTreasuryOperations(ops) {
    allTreasuryOperations = Array.isArray(ops) ? ops : [];
    filteredTreasuryOperations = [...allTreasuryOperations];
    if (typeof window !== 'undefined') {
        window.allTreasuryOperations = allTreasuryOperations;
        window.filteredTreasuryOperations = filteredTreasuryOperations;
    }
}

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

    const sourceOps = allTreasuryOperations.length > 0 ? allTreasuryOperations : (window.allTreasuryOperations || []);

    filteredTreasuryOperations = sourceOps.filter(op => {
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

    if (typeof window !== 'undefined') {
        window.filteredTreasuryOperations = filteredTreasuryOperations;
    }

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
        if (typeof window.onTreasurySummaryPeriodChange === 'function') {
            window.onTreasurySummaryPeriodChange();
        }
        return;
    }
    applyTreasuryFilters();
}

function updateTreasuryTraceKpis() {
    const countEl = document.getElementById("kpi_trace_count");
    const incomeEl = document.getElementById("kpi_trace_income");
    const expenseEl = document.getElementById("kpi_trace_expense");
    const netEl = document.getElementById("kpi_trace_net");

    const ops = filteredTreasuryOperations || window.filteredTreasuryOperations || [];
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
    const ops = filteredTreasuryOperations || window.filteredTreasuryOperations || [];
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

    const operations = filteredTreasuryOperations || window.filteredTreasuryOperations || [];
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

// PUENTE GLOBAL WINDOW
if (typeof window !== 'undefined') {
    window.setTreasuryOperations = setTreasuryOperations;
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
}

export {
    setTreasuryOperations,
    getIsoDate,
    formatDateDisplay,
    applyTreasuryFilters,
    handleTreasuryPeriodChange,
    updateTreasuryTraceKpis,
    resetTreasuryFilters,
    printTreasuryTraceReport,
    goToTreasuryPage,
    changeTreasuryPageSize,
    renderTreasuryTracePaginated
};
