// Sigop ERP - Submódulo Cuentas por Pagar (Listado, Filtros y Paginación)
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

let allPayablesList = [];
let lastPayablesList = [];
let cxpCurrentPage = 1;
let cxpPageSize = 10;
let currentCxpFilter = 'all';
let currentCxpSearch = '';
let currentCxpDocType = 'all';
let currentCxpDateFrom = '';
let currentCxpDateTo = '';

export async function loadPayablesList() {
    const tbody = document.getElementById("cxpTableBody");

    // SWR: Si ya existen cuentas por pagar en memoria, renderizarlas de inmediato (0 ms)
    const hasCached = Array.isArray(lastPayablesList) && lastPayablesList.length > 0;
    if (hasCached) {
        updateCxpFilterBadges();
        renderPayablesPaginated();
    } else if (tbody) {
        tbody.innerHTML = `<tr><td colspan="11" style="text-align: center; color: #94a3b8; padding: 16px;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando cuentas por pagar...</td></tr>`;
    }

    try {
        let url = `${API_BASE}/financial/cxp?`;
        const params = [];
        if (currentCxpSearch) params.push(`search=${encodeURIComponent(currentCxpSearch)}`);
        if (currentCxpDocType && currentCxpDocType !== 'all') params.push(`doc_type=${encodeURIComponent(currentCxpDocType)}`);
        if (currentCxpFilter && currentCxpFilter !== 'all') params.push(`status=${encodeURIComponent(currentCxpFilter)}`);
        if (currentCxpDateFrom) params.push(`date_from=${encodeURIComponent(currentCxpDateFrom)}`);
        if (currentCxpDateTo) params.push(`date_to=${encodeURIComponent(currentCxpDateTo)}`);
        url += params.join('&');

        const res = await authFetch(url);
        if (!res.ok) throw new Error("Error en servidor al consultar CxP");

        const list = await res.json();
        allPayablesList = Array.isArray(list) ? list : (list.items || []);
        lastPayablesList = allPayablesList;
        if (typeof window !== "undefined") {
            window.allPayablesList = allPayablesList;
            window.lastPayablesList = lastPayablesList;
        }
        
        updateCxpFilterBadges();
        renderPayablesPaginated();
    } catch (e) {
        console.error("Error al cargar CxP:", e);
        if (!hasCached && tbody) {
            tbody.innerHTML = `<tr><td colspan="11" style="text-align: center; color: #e11d48; padding: 16px;">Error al cargar cuentas por pagar: ${e.message}</td></tr>`;
        }
    }
}

export function updateCxpFilterBadges() {
    const list = lastPayablesList || [];
    const countAll = list.length;
    const countPendiente = list.filter(x => x.balance_usd > 0.01).length;
    const countPorVencer = list.filter(x => x.aging_status === 'por_vencer').length;
    const countVencido = list.filter(x => x.aging_status === 'vencido').length;
    const countSolvente = list.filter(x => x.balance_usd <= 0.01 || x.aging_status === 'solventado').length;

    const elAll = document.getElementById("cxpCount_all");
    if (elAll) elAll.textContent = countAll;
    const elPen = document.getElementById("cxpCount_pendiente");
    if (elPen) elPen.textContent = countPendiente;
    const elPor = document.getElementById("cxpCount_por_vencer");
    if (elPor) elPor.textContent = countPorVencer;
    const elVen = document.getElementById("cxpCount_vencido");
    if (elVen) elVen.textContent = countVencido;
    const elSol = document.getElementById("cxpCount_solvente");
    if (elSol) elSol.textContent = countSolvente;
}

export function onCxpSearchInput(val) {
    currentCxpSearch = (val || '').trim();
    cxpCurrentPage = 1;
    loadPayablesList();
}

export function onCxpDocTypeFilterChange(val) {
    currentCxpDocType = val || 'all';
    cxpCurrentPage = 1;
    loadPayablesList();
}

export function applyCxpDateFilter() {
    const dFrom = document.getElementById("cxp_date_from")?.value || '';
    const dTo = document.getElementById("cxp_date_to")?.value || '';
    currentCxpDateFrom = dFrom;
    currentCxpDateTo = dTo;
    cxpCurrentPage = 1;
    loadPayablesList();
}

export function clearCxpDateFilter() {
    const elF = document.getElementById("cxp_date_from");
    const elT = document.getElementById("cxp_date_to");
    if (elF) elF.value = '';
    if (elT) elT.value = '';
    currentCxpDateFrom = '';
    currentCxpDateTo = '';
    cxpCurrentPage = 1;
    loadPayablesList();
}

export function setFilterCxp(filterType) {
    currentCxpFilter = filterType;
    ['all', 'pendiente', 'por_vencer', 'vencido', 'solvente'].forEach(f => {
        const btn = document.getElementById(`btnFilterCxp_${f}`);
        if (btn) {
            if (f === filterType) {
                btn.style.background = '#0f172a';
                btn.style.color = 'white';
            } else {
                btn.style.background = '#f1f5f9';
                btn.style.color = '#334155';
            }
        }
    });
    cxpCurrentPage = 1;
    loadPayablesList();
}

export function goToCxpPage(page) {
    cxpCurrentPage = page;
    renderPayablesPaginated();
    const c = document.getElementById("cxpTableBody");
    if (c) c.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

export function changeCxpPageSize(size) {
    cxpPageSize = parseInt(size) || 15;
    cxpCurrentPage = 1;
    renderPayablesPaginated();
}

export function renderPayablesPaginated() {
    const tbody = document.getElementById("cxpTableBody");
    if (!tbody) return;

    const list = allPayablesList || [];
    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="11" style="text-align: center; color: #94a3b8; padding: 16px;">No se encontraron cuentas por pagar con los filtros seleccionados.</td></tr>`;
        const pCont = document.getElementById("cxpPaginationContainer");
        if (pCont) pCont.innerHTML = '';
        return;
    }

    const { startIndex, endIndex, currentPage } = (typeof window.renderPaginationControls === 'function' ? window.renderPaginationControls : renderPaginationControls)({
        containerId: "cxpPaginationContainer",
        totalItems: list.length,
        currentPage: cxpCurrentPage,
        pageSize: cxpPageSize,
        onPageChange: "goToCxpPage",
        onPageSizeChange: "changeCxpPageSize",
        itemLabel: "cuenta(s) por pagar"
    });
    cxpCurrentPage = currentPage;

        const bcvRate = (typeof window !== "undefined" && (window.BCV_DATA?.rate || window.EXCHANGE_RATE)) || 850.0;
    const pageItems = list.slice(startIndex, endIndex);
    tbody.innerHTML = pageItems.map(p => {
        let docBadge = '';
        if (p.doc_type === 'nota_entrega') {
            docBadge = `<span style="background: #fef3c7; color: #92400e; font-size: 9px; padding: 1px 5px; border-radius: 4px; font-weight: 800; display: inline-block;">Nota Entrega</span>`;
        } else if (p.doc_type === 'factura_sin_retencion') {
            docBadge = `<span style="background: #e0f2fe; color: #0369a1; font-size: 9px; padding: 1px 5px; border-radius: 4px; font-weight: 800; display: inline-block;">Contado</span>`;
        } else {
            docBadge = `<span style="background: #fce7f3; color: #9d174d; font-size: 9px; padding: 1px 5px; border-radius: 4px; font-weight: 800; display: inline-block;">SENIAT 16%</span>`;
        }

        let agingBadge = '';
        if (p.balance_usd <= 0.01 || p.aging_status === 'solventado') {
            agingBadge = `<span style="font-size: 10px; padding: 2px 7px; border-radius: 9999px; font-weight: 800; background: #d1fae5; color: #065f46;"><i class="fa-solid fa-check"></i> Solvente</span>`;
        } else if (p.aging_status === 'vencido') {
            agingBadge = `<span style="font-size: 10px; padding: 2px 7px; border-radius: 9999px; font-weight: 800; background: #fee2e2; color: #991b1b;"><i class="fa-solid fa-triangle-exclamation"></i> Vencida ${p.days_overdue > 0 ? `(${p.days_overdue}d)` : ''}</span>`;
        } else if (p.aging_status === 'por_vencer') {
            agingBadge = `<span style="font-size: 10px; padding: 2px 7px; border-radius: 9999px; font-weight: 800; background: #fef9c3; color: #854d0e;"><i class="fa-solid fa-clock"></i> Próx. 7d</span>`;
        } else {
            agingBadge = `<span style="font-size: 10px; padding: 2px 7px; border-radius: 9999px; font-weight: 800; background: #f1f5f9; color: #334155;">Al día</span>`;
        }

        return `
        <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="font-weight: 800; color: var(--dalor-navy);">
                <div>${p.invoice_number || 'S/N'}</div>
                <div style="font-size: 10px; color: #64748b; font-weight: normal;">Ctrl: ${p.control_number || '-'}</div>
                <div style="margin-top: 2px;">${docBadge}</div>
            </td>
            <td>
                <div style="font-weight: 700; color: #0f172a;">${p.supplier_name}</div>
                <div style="font-size: 10px; color: #64748b; font-family: monospace;">RIF: ${p.supplier_rif || 'N/A'}</div>
            </td>
            <td>
                <span style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 11px; color: #0369a1;">
                    ${p.project_code || p.project_name || 'Sede Central'}
                </span>
            </td>
            <td style="font-size: 11.5px; color: #334155; max-width: 220px;">
                <div>${p.description}</div>
                ${(p.warehouse_movement_id || p.warehouse_entry_ref) ? `
                    <div style="margin-top: 3px;">
                        <span style="background: #ecfdf5; color: #047857; font-size: 9.5px; font-weight: 700; padding: 1px 6px; border-radius: 4px; border: 1px solid #a7f3d0; display: inline-flex; align-items: center; gap: 4px;" title="Entrada física en almacén vinculada: ${p.warehouse_entry_ref || p.warehouse_movement_id}">
                            <i class="fa-solid fa-boxes-stacked"></i> ${p.warehouse_entry_ref || `Recepción #${p.warehouse_movement_id}`}
                        </span>
                    </div>
                ` : ''}
            </td>
            <td style="font-size: 11px; color: #64748b;">${p.issue_date || '-'}</td>
            <td style="font-size: 11px; font-weight: 700; color: ${p.aging_status === 'vencido' ? '#e11d48' : '#334155'};"><i class="fa-regular fa-calendar"></i> ${p.due_date || '-'}</td>
            <td style="font-weight: 800; color: #0f172a;">$${Number(p.amount_usd || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td style="font-weight: 700; color: #b91c1c; font-size: 11px;">
                ${p.tax_withholding_usd > 0 ? `-Bs. ${((p.tax_withholding_usd || 0) * (p.exchange_rate || bcvRate || 850.0)).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : 'Bs. 0.00'}
            </td>
            <td style="font-weight: 900; color: ${p.balance_usd > 0.01 ? '#e11d48' : '#059669'}; font-size: 13px;">
                $${Number(p.balance_usd || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
            </td>
            <td>${agingBadge}</td>
            <td style="text-align: center;">
                <div style="display: flex; gap: 4px; justify-content: center; align-items: center; flex-wrap: wrap;">
                    ${p.balance_usd > 0.01 ? `
                        <button onclick="openRecordPaymentModal('pago_cxp', ${p.id}, ${p.balance_usd})" class="btn-primary" style="font-size: 11px; padding: 4px 10px; background: #e11d48;" title="Registrar Pago Bancario del Saldo Neto">
                            <i class="fa-solid fa-money-bill-wave"></i> Pagar
                        </button>
                    ` : `<span style="color: #059669; font-weight: 800; font-size: 11px; margin-right: 2px;"><i class="fa-solid fa-circle-check"></i> Pagado</span>`}

                    ${(p.tax_withholding_usd > 0 || p.withholding_voucher_number) ? `
                        <button onclick="openWithholdingVoucherModal(${p.id})" class="btn-secondary" style="font-size: 11px; padding: 4px 8px; background: #fdf2f8; color: #be185d; border-color: #fbcfe8; font-weight: 700;" title="Ver e Imprimir Comprobante Oficial de Retención IVA (SNAT/2015/0049)">
                            <i class="fa-solid fa-file-invoice"></i> Ret. IVA
                        </button>
                    ` : ''}

                    ${(p.islr_withholding_usd > 0 || (p.islr_rate && p.islr_rate > 0)) ? `
                        <button onclick="openIslrWithholdingVoucherModal(${p.id})" class="btn-secondary" style="font-size: 11px; padding: 4px 8px; background: #eff6ff; color: #1d4ed8; border-color: #bfdbfe; font-weight: 700;" title="Ver e Imprimir Comprobante Oficial de Retención ISLR (Decreto Nº 1.808)">
                            <i class="fa-solid fa-file-invoice-dollar"></i> Ret. ISLR
                        </button>
                    ` : ''}

                    ${(p.municipal_withholding_usd > 0 || (p.municipal_rate && p.municipal_rate > 0) || p.municipal_voucher_number) ? `
                        <button onclick="openMunicipalWithholdingVoucherModal(${p.id})" class="btn-secondary" style="font-size: 11px; padding: 4px 8px; background: #ecfdf5; color: #047857; border-color: #a7f3d0; font-weight: 700;" title="Ver e Imprimir Comprobante Oficial de Retención Municipal (Alcaldía de Guacara)">
                            <i class="fa-solid fa-landmark"></i> Ret. Municipal
                        </button>
                    ` : ''}

                    <button onclick="openEditPayableModal(${p.id})" class="btn-secondary" style="font-size: 11px; padding: 4px 7px; background: #f8fafc; color: #2563eb;" title="Modificar Factura / Retención">
                        <i class="fa-solid fa-pen"></i>
                    </button>

                    <button onclick="deletePayablePrompt(${p.id})" class="btn-secondary" style="font-size: 11px; padding: 4px 7px; background: #fff1f2; color: #e11d48;" title="Anular Cuenta por Pagar">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>

                    <button onclick="openPayableHistoryModal(${p.id})" class="btn-secondary" style="font-size: 11px; padding: 4px 8px; background: #f1f5f9; color: #475569;" title="Ver Historial de Abonos y Comprobantes">
                        <i class="fa-solid fa-clock-rotate-left"></i>
                    </button>
                </div>
            </td>
        </tr>`;
    }).join('');
}
