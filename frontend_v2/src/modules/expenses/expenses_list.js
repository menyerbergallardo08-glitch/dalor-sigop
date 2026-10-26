/**
 * DALOR SIGO-P | Módulo: EXPENSES_LIST.JS
 * Bitácora Histórica, KPIs de Gastos, Filtros Dinámicos y Paginación
 */

var API_BASE = window.API_BASE || (window.location.origin + '/api/v1');
var EXCHANGE_RATE = window.EXCHANGE_RATE || 850.0;
var allExpensesCache = [];
var currentFilteredExpenses = [];
var currentExpensesLogPage = 1;
var expensesLogPageSize = 15;
var expensesLogSearchTimer = null;

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

function debouncedFilterExpensesLog() {
    clearTimeout(expensesLogSearchTimer);
    expensesLogSearchTimer = setTimeout(() => {
        filterExpensesLog();
    }, 250);
}
window.debouncedFilterExpensesLog = debouncedFilterExpensesLog;
async function loadExpensesLog() {
    const tbody = document.getElementById("expensesLogTableBody");
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="13" style="text-align:center; padding:20px; color:#64748b;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando histórico consolidado de gastos...</td></tr>`;
    try {
        let projectsList = (window.allProjects && window.allProjects.length > 0) ? window.allProjects : (allProjects || []);
        let categoriesList = (window.allCategories && window.allCategories.length > 0) ? window.allCategories : (allCategories || []);
        const fetches = [authFetch(`${API_BASE}/expenses/`)];
        if (projectsList.length === 0) fetches.push(authFetch(`${API_BASE}/projects/`));
        if (categoriesList.length === 0) fetches.push(authFetch(`${API_BASE}/expenses/categories`));
        const responses = await Promise.all(fetches);
        allExpensesCache = await responses[0].json();
        let rIdx = 1;
        if (projectsList.length === 0 && responses[rIdx]) {
            projectsList = await responses[rIdx++].json();
            window.allProjects = allProjects = projectsList;
        }
        if (categoriesList.length === 0 && responses[rIdx]) {
            categoriesList = await responses[rIdx++].json();
            window.allCategories = allCategories = categoriesList;
        }
        populateExpensesLogFilters();
        currentExpensesLogPage = 1;
        filterExpensesLog();
    } catch (e) {
        console.error("[EXPENSES] Error loading expenses log:", e);
        tbody.innerHTML = `<tr><td colspan="13" style="text-align:center; padding:20px; color:#e11d48;">Error al cargar histórico de gastos.</td></tr>`;
    }
}
function populateExpensesLogFilters() {
    const projectsList = (window.allProjects && window.allProjects.length > 0) ? window.allProjects : (allProjects || []);
    const categoriesList = (window.allCategories && window.allCategories.length > 0) ? window.allCategories : (allCategories || []);
    const projectSelect = document.getElementById("log_filter_project");
    if (projectSelect) {
        projectSelect.innerHTML = `<option value="">-- Todos los Proyectos --</option>` +
            `<option value="sede_central">🏢 Sede Central / Gastos Fijos (Sin Proyecto)</option>` +
            projectsList.map(p => `<option value="${p.id}">[${p.code || 'PRJ'}] ${p.name}</option>`).join('');
    }
    const sortedCats = typeof sortCategoriesNumerically === 'function' ? sortCategoriesNumerically(categoriesList) : categoriesList;
    const catSelect = document.getElementById("log_filter_category");
    if (catSelect) {
        catSelect.innerHTML = `<option value="">-- Todas las Partidas --</option>` +
            sortedCats.map(c => `<option value="${c.id}">[${c.code}] ${c.name}</option>`).join('');
    }
}
function filterExpensesLog() {
    const projId = document.getElementById("log_filter_project")?.value;
    const catId = document.getElementById("log_filter_category")?.value;
    const fiscal = document.getElementById("log_filter_fiscal")?.value;
    const fromDate = document.getElementById("log_filter_date_from")?.value;
    const toDate = document.getElementById("log_filter_date_to")?.value;
    const search = (document.getElementById("log_filter_search")?.value || "").toLowerCase().trim();
    currentFilteredExpenses = allExpensesCache.filter(e => {
        if (projId === 'sede_central') {
            if (e.project_id) return false;
        } else if (projId) {
            if (String(e.project_id) !== String(projId)) return false;
        }
        if (catId) {
            if (String(e.category_id) !== String(catId)) {
                const catObj = (window.allCategories || []).find(c => String(c.id) === String(catId));
                if (!catObj || !e.category_code || !e.category_code.startsWith(catObj.code)) {
                    return false;
                }
            }
        }
        const isFiscal = !e.is_tax_exempt && (e.tax_amount_usd || 0) > 0;
        if (fiscal === 'con_iva' && !isFiscal) return false;
        if (fiscal === 'sin_iva' && isFiscal) return false;
        if (fromDate) {
            const expDate = (e.expense_date || '').split('T')[0];
            if (expDate && expDate < fromDate) return false;
        }
        if (toDate) {
            const expDate = (e.expense_date || '').split('T')[0];
            if (expDate && expDate > toDate) return false;
        }
        if (search) {
            const matchText = `${e.supplier_vendor || ''} ${e.vendor || ''} ${e.invoice_number || ''} ${e.description || ''} ${e.reported_by || ''} ${e.reported_by_name || ''} ${e.category_name || ''} ${e.category_code || ''} ${e.project_name || ''} ${e.project_code || ''}`.toLowerCase();
            if (!matchText.includes(search)) return false;
        }
        return true;
    });
    currentExpensesLogPage = 1;
    renderExpensesLogTable(currentFilteredExpenses);
    updateExpensesLogKPIs(currentFilteredExpenses);
}
function updateExpensesLogKPIs(list) {
    let totalUsd = 0;
    let totalBs = 0;
    let fiscalUsd = 0;
    let fiscalCount = 0;
    let nonFiscalUsd = 0;
    let nonFiscalCount = 0;
    let totalTaxUsd = 0;
    list.forEach(e => {
        const usd = e.amount_usd || 0;
        const bs = e.amount_bs || 0;
        const tax = e.tax_amount_usd || 0;
        totalUsd += usd;
        totalBs += bs;
        totalTaxUsd += tax;
        if (!e.is_tax_exempt && tax > 0) {
            fiscalUsd += usd;
            fiscalCount++;
        } else {
            nonFiscalUsd += usd;
            nonFiscalCount++;
        }
    });
    const elTotalUsd = document.getElementById("log_kpi_total_usd");
    const elTotalBs = document.getElementById("log_kpi_total_bs");
    const elFiscalUsd = document.getElementById("log_kpi_fiscal_usd");
    const elFiscalCount = document.getElementById("log_kpi_fiscal_count");
    const elNonFiscalUsd = document.getElementById("log_kpi_nonfiscal_usd");
    const elNonFiscalCount = document.getElementById("log_kpi_nonfiscal_count");
    const elTaxUsd = document.getElementById("log_kpi_tax_usd");
    const elCountTotal = document.getElementById("log_kpi_count_total");
    if (elTotalUsd) elTotalUsd.innerText = `$${totalUsd.toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    if (elTotalBs) elTotalBs.innerText = `Bs. ${totalBs.toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    if (elFiscalUsd) elFiscalUsd.innerText = `$${fiscalUsd.toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    if (elFiscalCount) elFiscalCount.innerText = `${fiscalCount} facturas fiscales con IVA`;
    if (elNonFiscalUsd) elNonFiscalUsd.innerText = `$${nonFiscalUsd.toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    if (elNonFiscalCount) elNonFiscalCount.innerText = `${nonFiscalCount} notas / compras sin IVA`;
    if (elTaxUsd) elTaxUsd.innerText = `$${totalTaxUsd.toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    if (elCountTotal) elCountTotal.innerText = `${list.length} registros listados`;
}
function renderExpensesLogTable(list) {
    const tbody = document.getElementById("expensesLogTableBody");
    if (!tbody) return;
    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="13" style="text-align:center; padding:24px; color:#94a3b8;">No se encontraron gastos que coincidan con los filtros seleccionados.</td></tr>`;
        const tfoot = document.getElementById("expensesLogTableFoot");
        if (tfoot) tfoot.innerHTML = "";
        const pagContainer = document.getElementById("expensesLogPagination");
        if (pagContainer) pagContainer.innerHTML = "";
        return;
    }
    let totBase = 0, totTax = 0, totUsd = 0, totBs = 0;
    list.forEach(e => {
        const uAmount = e.amount_usd || 0;
        const bsAmount = e.amount_bs || 0;
        const tAmount = e.tax_amount_usd || 0;
        const bAmount = (e.base_amount_usd !== undefined && e.base_amount_usd !== null && e.base_amount_usd > 0)
            ? e.base_amount_usd
            : (e.is_tax_exempt ? uAmount : (tAmount > 0 ? (uAmount - tAmount) : uAmount));
        totBase += bAmount;
        totTax += tAmount;
        totUsd += uAmount;
        totBs += bsAmount;
    });
    const paginateFn = typeof window.renderPaginationControls === 'function' 
        ? window.renderPaginationControls 
        : (typeof renderPaginationControls === 'function' ? renderPaginationControls : null);
    let pageItems = list;
    if (paginateFn) {
        const { startIndex, endIndex } = paginateFn({
            containerId: "expensesLogPagination",
            totalItems: list.length,
            currentPage: currentExpensesLogPage,
            pageSize: expensesLogPageSize,
            onPageChange: "goToExpensesLogPage",
            onPageSizeChange: "changeExpensesLogPageSize",
            itemLabel: "gasto(s) registrado(s)",
            pageSizeOptions: [10, 15, 25, 50, 100],
            allowAll: true
        });
        pageItems = list.slice(startIndex, endIndex);
    } else {
        const totalPages = Math.ceil(list.length / expensesLogPageSize) || 1;
        if (currentExpensesLogPage > totalPages) currentExpensesLogPage = totalPages;
        if (currentExpensesLogPage < 1) currentExpensesLogPage = 1;
        const startIdx = (currentExpensesLogPage - 1) * expensesLogPageSize;
        const endIdx = startIdx + expensesLogPageSize;
        pageItems = list.slice(startIdx, endIdx);
        const pagContainer = document.getElementById("expensesLogPagination");
        if (pagContainer) {
            pagContainer.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; font-size:12px; color:#64748b;">
                    <span>Mostrando ${startIdx + 1}-${Math.min(endIdx, list.length)} de ${list.length} gastos</span>
                    <div style="display:flex; gap:6px;">
                        <button class="btn-secondary" style="padding:4px 10px; font-size:11px;" onclick="goToExpensesLogPage(${currentExpensesLogPage - 1})" ${currentExpensesLogPage <= 1 ? 'disabled' : ''}>Anterior</button>
                        <span style="padding:4px 8px; font-weight:700;">${currentExpensesLogPage} / ${totalPages}</span>
                        <button class="btn-secondary" style="padding:4px 10px; font-size:11px;" onclick="goToExpensesLogPage(${currentExpensesLogPage + 1})" ${currentExpensesLogPage >= totalPages ? 'disabled' : ''}>Siguiente</button>
                    </div>
                </div>
            `;
        }
    }
    const projectsList = (window.allProjects && window.allProjects.length > 0) ? window.allProjects : (allProjects || []);
    const categoriesList = (window.allCategories && window.allCategories.length > 0) ? window.allCategories : (allCategories || []);
    tbody.innerHTML = pageItems.map((e) => {
        const dateStr = (e.expense_date || '').split('T')[0] || '-';
        const proj = projectsList.find(p => p.id === e.project_id);
        const projLabel = e.project_name ? `[${e.project_code || 'PRJ'}] ${e.project_name}` : (proj ? `[${proj.code}] ${proj.name}` : (e.project_id ? `Proyecto #${e.project_id}` : 'Gasto General Sede'));
        const cat = categoriesList.find(c => c.id === e.category_id);
        const catLabel = e.category_name ? `[${e.category_code || 'CAT'}] ${e.category_name}` : (cat ? `[${cat.code}] ${cat.name}` : (e.category_code || '10.0 General'));
        const isFiscal = !e.is_tax_exempt && (e.tax_amount_usd || 0) > 0;
        const fiscalBadge = isFiscal 
            ? `<span style="background:#dcfce7; color:#166534; padding:2px 6px; border-radius:4px; font-weight:800; font-size:10px;">Fiscal IVA</span>`
            : `<span style="background:#f1f5f9; color:#64748b; padding:2px 6px; border-radius:4px; font-weight:700; font-size:10px;">Sin IVA</span>`;
        const statusBadge = e.status === 'aprobado'
            ? `<span style="background:#d1fae5; color:#065f46; padding:2px 6px; border-radius:4px; font-weight:800; font-size:10px;">Aprobado</span>`
            : `<span style="background:#fef3c7; color:#92400e; padding:2px 6px; border-radius:4px; font-weight:800; font-size:10px;">Pendiente</span>`;
        const uAmount = e.amount_usd || 0;
        const bsAmount = e.amount_bs || 0;
        const tAmount = e.tax_amount_usd || 0;
        const bAmount = (e.base_amount_usd !== undefined && e.base_amount_usd !== null && e.base_amount_usd > 0)
            ? e.base_amount_usd
            : (e.is_tax_exempt ? uAmount : (tAmount > 0 ? (uAmount - tAmount) : uAmount));
        const repName = e.reported_by_name || e.reported_by || '-';
        const vendorName = e.supplier_vendor || e.vendor || 'Comercio';
        const viewBtn = e.receipt_image_path
            ? `<button onclick="viewReceiptImageById(${e.id})" class="btn-primary" style="padding:3px 8px; font-size:11px; background:#0284c7; cursor:pointer;" title="Ver Comprobante Digital"><i class="fa-solid fa-eye"></i></button>`
            : `<button onclick="viewReceiptImageById(${e.id})" class="btn-secondary" style="padding:2px 6px; font-size:10px; color:#94a3b8; border:1px dashed #cbd5e1; background:transparent; cursor:pointer;" title="Adjuntar Comprobante"><i class="fa-solid fa-plus"></i></button>`;
        return `
            <tr>
                <td style="font-size:11px; color:#64748b;">${dateStr}</td>
                <td style="font-weight:700; font-size:11px; color:var(--dalor-navy);">${projLabel}</td>
                <td style="font-size:11px;"><span style="background:#f0f9ff; color:#0369a1; padding:2px 5px; border-radius:4px; font-weight:700;">${catLabel}</span></td>
                <td style="font-weight:600; font-size:11px;">${vendorName}</td>
                <td style="font-family:monospace; font-size:11px;">${e.invoice_number || '-'}</td>
                <td style="text-align:center;">${fiscalBadge}</td>
                <td style="text-align:right; font-size:11px;">$${bAmount.toFixed(2)}</td>
                <td style="text-align:right; font-size:11px; color:#8b5cf6;">$${tAmount.toFixed(2)}</td>
                <td style="text-align:right; font-weight:800; font-size:12px; color:var(--dalor-navy);">$${uAmount.toFixed(2)}</td>
                <td style="text-align:right; font-weight:700; font-size:11px; color:#0284c7;">Bs. ${bsAmount.toLocaleString('es-VE', {minimumFractionDigits:2, maximumFractionDigits:2})}</td>
                <td style="font-size:11px; color:#475569;">${repName}</td>
                <td style="text-align:center;">${statusBadge}</td>
                <td style="text-align:center;">${viewBtn}</td>
            </tr>
        `;
    }).join('');
    // RENDERIZAR FILA TOTALIZADORA FIJA (TFOOT)
    let tfoot = document.getElementById("expensesLogTableFoot");
    if (!tfoot) {
        const table = tbody.closest("table");
        if (table) {
            tfoot = document.createElement("tfoot");
            tfoot.id = "expensesLogTableFoot";
            table.appendChild(tfoot);
        }
    }
    if (tfoot) {
        tfoot.innerHTML = `
            <tr style="background: var(--dalor-navy); color: white; font-weight: 800; font-size: 11px; border-top: 2px solid var(--dalor-gold);">
                <td colspan="6" style="padding: 10px 12px; text-align: left; text-transform: uppercase; letter-spacing: 0.5px;">
                    <i class="fa-solid fa-calculator" style="color: var(--dalor-gold); margin-right: 6px;"></i> TOTALIZADO AUDITORÍA (${list.length} Registros)
                </td>
                <td style="padding: 10px 8px; text-align: right; color: #93c5fd;">$${totBase.toLocaleString('es-VE', {minimumFractionDigits:2, maximumFractionDigits:2})}</td>
                <td style="padding: 10px 8px; text-align: right; color: #c4b5fd;">$${totTax.toLocaleString('es-VE', {minimumFractionDigits:2, maximumFractionDigits:2})}</td>
                <td style="padding: 10px 8px; text-align: right; color: var(--dalor-gold); font-size: 13px;">$${totUsd.toLocaleString('es-VE', {minimumFractionDigits:2, maximumFractionDigits:2})}</td>
                <td style="padding: 10px 8px; text-align: right; color: #38bdf8; font-size: 12px;">Bs. ${totBs.toLocaleString('es-VE', {minimumFractionDigits:2, maximumFractionDigits:2})}</td>
                <td colspan="3" style="padding: 10px 8px; text-align: center; color: #94a3b8; font-size: 10px;">Sincronizado con Tesorería</td>
            </tr>
        `;
    }
}
function goToExpensesLogPage(page) {
    currentExpensesLogPage = page;
    renderExpensesLogTable(currentFilteredExpenses);
}
window.goToExpensesLogPage = goToExpensesLogPage;
function changeExpensesLogPageSize(size) {
    expensesLogPageSize = parseInt(size) || 15;
    currentExpensesLogPage = 1;
    renderExpensesLogTable(currentFilteredExpenses);
}
window.changeExpensesLogPageSize = changeExpensesLogPageSize;


// PUENTE GLOBAL WINDOW
if (typeof window !== 'undefined') {
    window.debouncedFilterExpensesLog = debouncedFilterExpensesLog;
    window.loadExpensesLog = loadExpensesLog;
    window.populateExpensesLogFilters = populateExpensesLogFilters;
    window.filterExpensesLog = filterExpensesLog;
    window.updateExpensesLogKPIs = updateExpensesLogKPIs;
    window.renderExpensesLogTable = renderExpensesLogTable;
    window.goToExpensesLogPage = goToExpensesLogPage;
    window.changeExpensesLogPageSize = changeExpensesLogPageSize;
}

export {
    debouncedFilterExpensesLog,
    loadExpensesLog,
    populateExpensesLogFilters,
    filterExpensesLog,
    updateExpensesLogKPIs,
    renderExpensesLogTable,
    goToExpensesLogPage,
    changeExpensesLogPageSize
};
