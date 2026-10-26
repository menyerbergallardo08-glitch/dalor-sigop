/**
 * DALOR SIGO-P | Módulo: CXC_LIST.JS
 * Listado, filtros, KPIs de cobranza y paginación de Cuentas por Cobrar
 */

var API_BASE = window.API_BASE || (window.location.origin + '/api/v1');
var allReceivablesList = [];
var currentReceivables = [];
var currentFilteredReceivables = [];
var cxcCurrentPage = 1;
var cxcPageSize = 15;
var currentCxcFilter = 'all';
var currentCxcSearch = '';

function roundFinancial(num) {
    return Math.round(((parseFloat(num) || 0) + Number.EPSILON) * 100) / 100;
}

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

function goToCxcPage(page) {

    cxcCurrentPage = page;

    renderReceivablesPaginated();

    const c = document.getElementById("cxcTableBody");

    if (c) c.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

}

function changeCxcPageSize(size) {

    cxcPageSize = parseInt(size) || 15;

    cxcCurrentPage = 1;

    renderReceivablesPaginated();

}

function setFilterCxc(filterType) {

    currentCxcFilter = filterType;

    ['all', 'projects', 'rentals', 'overdue', 'paid', 'surplus'].forEach(f => {

        const btn = document.getElementById(`btn_cxc_filter_${f}`);

        if (btn) btn.className = (f === filterType) ? 'btn-primary' : 'btn-secondary';

    });

    cxcCurrentPage = 1;

    renderReceivablesPaginated();

}

function filterCxcList(query) {

    currentCxcSearch = (typeof query === 'string' ? query : (document.getElementById('cxcSearchInput')?.value || '')).trim().toLowerCase();

    cxcCurrentPage = 1;

    renderReceivablesPaginated();

}

function renderReceivablesPaginated() {

    const tbody = document.getElementById("cxcTableBody");

    if (!tbody) return;

    let list = allReceivablesList || [];

    // 1. Filtro por categoría

    if (currentCxcFilter === 'projects') {

        list = list.filter(r => !(r.invoice_number || '').startsWith('ALQ-'));

    } else if (currentCxcFilter === 'rentals') {

        list = list.filter(r => (r.invoice_number || '').startsWith('ALQ-') || (r.description || '').toLowerCase().includes('alquiler'));

    } else if (currentCxcFilter === 'overdue') {

        list = list.filter(r => r.balance_usd > 0.05 && !r.is_bad_debt && r.due_date && new Date(r.due_date) < new Date());

    } else if (currentCxcFilter === 'paid') {

        list = list.filter(r => (r.balance_usd <= 0.05 || r.status === 'cobrado_total' || r.status === 'cobrado') && !r.is_bad_debt);

    } else if (currentCxcFilter === 'surplus') {

        list = list.filter(r => (r.paid_amount_usd || 0) > (r.amount_usd || 0) + 0.01);

    }

    // 2. Filtro por buscador de texto

    if (currentCxcSearch) {

        const q = currentCxcSearch;

        list = list.filter(r => 

            (r.invoice_number && r.invoice_number.toLowerCase().includes(q)) ||

            (r.client_name && r.client_name.toLowerCase().includes(q)) ||

            (r.project_code && r.project_code.toLowerCase().includes(q)) ||

            (r.project_name && r.project_name.toLowerCase().includes(q)) ||

            (r.description && r.description.toLowerCase().includes(q))

        );

    }

    const countBadge = document.getElementById("cxcCountBadge");

    if (countBadge) countBadge.innerText = `${list.length} cuentas mostradas`;

    if (list.length === 0) {

        tbody.innerHTML = `<tr><td colspan="11" style="text-align: center; color: #94a3b8; padding: 24px;">No se encontraron cuentas por cobrar con los filtros seleccionados.</td></tr>`;

        const pCont = document.getElementById("cxcPaginationContainer");

        if (pCont) pCont.innerHTML = '';

        return;

    }

    const { startIndex, endIndex, currentPage } = (typeof window.renderPaginationControls === 'function' ? window.renderPaginationControls : renderPaginationControls)({

        containerId: "cxcPaginationContainer",

        totalItems: list.length,

        currentPage: cxcCurrentPage,

        pageSize: cxcPageSize,

        onPageChange: "goToCxcPage",

        onPageSizeChange: "changeCxcPageSize",

        itemLabel: "cuenta(s) por cobrar",

        pageSizeOptions: [10, 25, 50, 100]

    });

    cxcCurrentPage = currentPage;

    const pageItems = list.slice(startIndex, endIndex);

    tbody.innerHTML = pageItems.map(r => {

        const isIncobrable = r.status === 'incobrable' || r.is_bad_debt;

        const isPaid = r.status === 'cobrado' || r.status === 'cobrado_total' || (r.balance_usd <= 0.05 && !isIncobrable);

        const isOverdue = !isPaid && !isIncobrable && r.due_date && new Date(r.due_date) < new Date();

        let badgeBg = '#fef3c7', badgeColor = '#92400e', statusLabel = 'Pendiente';

        if (isPaid) { badgeBg = '#d1fae5'; badgeColor = '#065f46'; statusLabel = 'Cobrado Total'; }

        else if (isIncobrable) { badgeBg = '#fee2e2'; badgeColor = '#991b1b'; statusLabel = '🛑 Incobrable / Castigado'; }

        else if (isOverdue) { badgeBg = '#fee2e2'; badgeColor = '#dc2626'; statusLabel = '⚠️ En Mora / Vencido'; }

        else if (r.status === 'parcial' || r.status === 'abono_parcial') { badgeBg = '#e0f2fe'; badgeColor = '#0369a1'; statusLabel = 'Abono Parcial'; }

        if (r.status === 'vencido') { badgeBg = '#fee2e2'; badgeColor = '#991b1b'; statusLabel = '⚠️ Vencida'; }

        const invNum = r.invoice_number || 'S/F';

        const isAdenda = (invNum && invNum.startsWith('ADENDA-')) || (r.description || '').toLowerCase().includes('adenda');

        const isRentalExt = invNum.startsWith('ALQ-') && invNum.endsWith('-EXT');

        const isRental = invNum.startsWith('ALQ-') || (r.description || '').toLowerCase().includes('alquiler');

        let typeBadge = '';

        if (isAdenda) {

            typeBadge = `<span style="background: #faf5ff; color: #9333ea; font-size: 9.5px; padding: 2px 6px; border-radius: 4px; font-weight: 800; display: inline-flex; align-items: center; gap: 3px; border: 1px solid #d8b4fe;"><i class="fa-solid fa-file-circle-plus"></i> Adenda Obra</span>`;

        } else if (isRentalExt) {

            typeBadge = `<span style="background: #fef3c7; color: #92400e; font-size: 9.5px; padding: 2px 6px; border-radius: 4px; font-weight: 800; display: inline-flex; align-items: center; gap: 3px; border: 1px solid #fde68a;"><i class="fa-solid fa-clock"></i> Prórroga Alquiler</span>`;

        } else if (isRental) {

            typeBadge = `<span style="background: #e0f2fe; color: #0369a1; font-size: 9.5px; padding: 2px 6px; border-radius: 4px; font-weight: 800; display: inline-flex; align-items: center; gap: 3px; border: 1px solid #bae6fd;"><i class="fa-solid fa-tractor"></i> Alquiler DALOR</span>`;

        } else if (r.project_code && r.project_code !== 'GEN') {

            typeBadge = `<span style="background: #ecfdf5; color: #047857; font-size: 9.5px; padding: 2px 6px; border-radius: 4px; font-weight: 800; display: inline-flex; align-items: center; gap: 3px; border: 1px solid #a7f3d0;"><i class="fa-solid fa-building"></i> Obra: ${r.project_code}</span>`;

        } else {

            typeBadge = `<span style="background: #f1f5f9; color: #475569; font-size: 9.5px; padding: 2px 6px; border-radius: 4px; font-weight: 800; display: inline-flex; align-items: center; gap: 3px;"><i class="fa-solid fa-file-invoice"></i> Comercial</span>`;

        }

        const surplus = Math.max(0, roundFinancial((r.paid_amount_usd || 0) - (r.amount_usd || 0)));

        const hasSurplus = surplus > 0.01;

        const surplusBadge = hasSurplus

            ? `<div style="margin-top: 3px;"><span style="background: #dcfce7; color: #15803d; font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 4px; border: 1px solid #86efac; display: inline-flex; align-items: center; gap: 3px;"><i class="fa-solid fa-gift"></i> Saldo a favor: +$${surplus.toFixed(2)}</span></div>`

            : '';

        const safeClientName = (r.client_name || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');

        const invoiceBtn = `<button type="button" onclick="printOfficialFiscalInvoice(${r.id})" class="btn-primary" style="font-size: 10px; padding: 4px 7px; background: #0284c7; color: white; font-weight: 800; border-radius: 4px;" title="Ver e Imprimir Factura Fiscal Forma Libre SENIAT"><i class="fa-solid fa-file-invoice-dollar"></i> Factura</button>`;

        const bitacoraBtn = `<button type="button" onclick="openCxcHistoryModal(${r.id}, ${r.client_id || 0}, '${invNum}', '${safeClientName}')" class="btn-secondary" style="font-size: 10.5px; padding: 4px 7px; color: #1d4ed8; border-color: #bfdbfe; background: #eff6ff; font-weight: 800;" title="Ver Bitácora de Cobranza & Seguimiento"><i class="fa-solid fa-clock-rotate-left"></i> Bitácora</button>`;

        let actionsHtml = '';

        if (r.balance_usd > 0.01 && !isIncobrable) {

            actionsHtml = `<button onclick="openRecordPaymentModal('cobro_cxc', ${r.id}, ${r.balance_usd})" class="btn-primary" style="font-size: 11px; padding: 4px 8px; background: #059669;" title="Registrar Cobro"><i class="fa-solid fa-hand-holding-dollar"></i> Cobrar</button> <button onclick="openDeclareBadDebtModal(${r.id})" class="btn-secondary" style="font-size: 10px; padding: 4px 7px; background: #fff1f2; color: #be123c; border: 1px solid #fecdd3; font-weight: 700;" title="Castigar Cartera / Declarar Incobrable"><i class="fa-solid fa-ban"></i> Incobrable</button>`;

        } else if (isIncobrable) {

            actionsHtml = `<span style="color: #dc2626; font-weight: 800; font-size: 11px;"><i class="fa-solid fa-ban"></i> Castigada</span>`;

        } else {

            actionsHtml = `<span style="color: #059669; font-weight: 800; font-size: 11px;"><i class="fa-solid fa-check-double"></i> Al Día</span>`;

        }

        if (hasSurplus) {

            actionsHtml += ` <button onclick="openClientRefundModal(${r.id})" class="btn-secondary" style="font-size: 10.5px; padding: 4px 8px; color: #059669; border-color: #a7f3d0; background: #ecfdf5; font-weight: 800;" title="Emitir Reembolso de Saldo a Favor al Cliente"><i class="fa-solid fa-arrow-rotate-left"></i> Reembolsar</button>`;

        }

        actionsHtml = invoiceBtn + ' ' + bitacoraBtn + ' ' + actionsHtml;

        return `

        <tr style="border-bottom: 1px solid #f1f5f9;">

            <td style="font-weight: 800; color: var(--dalor-navy);">

                <div style="font-size: 12.5px;">${invNum}</div>

                ${r.control_number ? `<div style="font-size: 9.5px; color: #059669; font-family: monospace; font-weight: 800; margin-top: 1px;" title="Número de Control Forma Libre SENIAT"><i class="fa-solid fa-shield-halved"></i> Ctrl: ${r.control_number}</div>` : ''}

                <div style="margin-top: 2px;">${typeBadge}</div>

                ${surplusBadge}

            </td>

            <td style="font-weight: 700;">

                <div>${r.client_name}</div>

                <div style="font-size: 10px; color: #64748b; font-family: monospace;">RIF: ${r.client_rif || '-'}</div>

                ${r.client_id ? `<div><button type="button" onclick="printClientAccountStatement(${r.client_id})" class="btn-secondary" style="font-size: 9px; padding: 1px 6px; margin-top: 3px; border-color: #bae6fd; background: #f0f9ff; color: #0284c7; font-weight: 800; border-radius: 4px; display: inline-flex; align-items: center; gap: 3px;" title="Ver e Imprimir Estado de Cuenta Oficial"><i class="fa-solid fa-file-pdf"></i> Estado de Cuenta</button></div>` : ''}

            </td>

            <td><span style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 11px;">${r.project_code || 'General'}</span></td>

            <td style="font-size: 11.5px; color: #334155; max-width: 200px;">${r.description || '-'}</td>

            <td style="font-size: 11px; color: #64748b;">${r.issue_date || '-'}</td>

            <td style="font-size: 11px; font-weight: 700; color: ${isOverdue ? '#e11d48' : '#334155'};">${r.due_date || '-'}</td>

            <td style="font-weight: 800; color: #059669;">$${(r.amount_usd || 0).toLocaleString()}</td>

            <td style="font-weight: 700; color: #0284c7;">$${(r.paid_amount_usd || 0).toLocaleString()}</td>

            <td style="font-weight: 800; color: ${r.balance_usd > 0 ? '#e11d48' : '#059669'}; font-size: 13px;">$${(r.balance_usd || 0).toLocaleString()}</td>

            <td>

                <span style="font-size: 10px; padding: 3px 8px; border-radius: 9999px; font-weight: 800; background: ${badgeBg}; color: ${badgeColor};">

                    ${statusLabel}

                </span>

            </td>

            <td style="text-align: center; white-space: nowrap;">

                <div style="display: flex; gap: 4px; justify-content: center; align-items: center;">

                    ${actionsHtml}

                </div>

            </td>

        </tr>`;

    }).join('');

}

async function loadReceivablesList() {

    const tbody = document.getElementById("cxcTableBody");

    if (!tbody) return;

    // SWR: Si ya existen cuentas por cobrar en memoria, renderizar de inmediato (0 ms)

    const hasCached = Array.isArray(allReceivablesList) && allReceivablesList.length > 0;

    if (hasCached) {

        renderReceivablesPaginated();

    } else {

        tbody.innerHTML = `<tr><td colspan="11" style="text-align: center; color: #94a3b8; padding: 16px;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando cuentas por cobrar...</td></tr>`;

    }

    try {

        const res = await authFetch(`${API_BASE}/financial/cxc`);

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const list = await res.json();

        allReceivablesList = Array.isArray(list) ? list : [];
        if (typeof window !== 'undefined') window.allReceivablesList = allReceivablesList;

        renderReceivablesPaginated();

        if (typeof checkDirectorCorrelativeAccess === 'function') {
            checkDirectorCorrelativeAccess();
        } else if (typeof window !== 'undefined' && typeof window.checkDirectorCorrelativeAccess === 'function') {
            window.checkDirectorCorrelativeAccess();
        }

    } catch (e) {
        console.error("Error in loadReceivablesList:", e);

        if (!hasCached) {

            tbody.innerHTML = `<tr><td colspan="11" style="text-align: center; color: #e11d48; padding: 16px;">Error al cargar cuentas por cobrar: ${e.message || e}</td></tr>`;

        }

        if (typeof checkDirectorCorrelativeAccess === 'function') {
            checkDirectorCorrelativeAccess();
        } else if (typeof window !== 'undefined' && typeof window.checkDirectorCorrelativeAccess === 'function') {
            window.checkDirectorCorrelativeAccess();
        }

    }

}


// PUENTE GLOBAL WINDOW
if (typeof window !== 'undefined') {
    window.goToCxcPage = goToCxcPage;
    window.changeCxcPageSize = changeCxcPageSize;
    window.setFilterCxc = setFilterCxc;
    window.filterCxcList = filterCxcList;
    window.renderReceivablesPaginated = renderReceivablesPaginated;
    window.loadReceivablesList = loadReceivablesList;
    window.roundFinancial = roundFinancial;
}

export {
    goToCxcPage,
    changeCxcPageSize,
    setFilterCxc,
    filterCxcList,
    renderReceivablesPaginated,
    loadReceivablesList,
    roundFinancial
};
