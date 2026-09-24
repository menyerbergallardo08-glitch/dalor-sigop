/**
 * DALOR SIGO-P | Módulo: FINANCIAL.JS
 * Extraído y desacoplado del monolito de producción (v94)
 */

var API_BASE = window.API_BASE || (window.location.origin + "/api/v1");
var allClients = window.allClients = window.allClients || [];
var allServices = window.allServices = window.allServices || [];
var allProjects = window.allProjects = window.allProjects || [];
var allCategories = window.allCategories = window.allCategories || [];
var allAssets = window.allAssets = window.allAssets || [];
var allPersonnel = window.allPersonnel = window.allPersonnel || [];
var allMaterials = window.allMaterials = window.allMaterials || [];
var selectedPersonnelIds = window.selectedPersonnelIds = window.selectedPersonnelIds || [];
var selectedVehicleIds = window.selectedVehicleIds = window.selectedVehicleIds || [];
var selectedToolIds = window.selectedToolIds = window.selectedToolIds || [];
var selectedMaterialIds = window.selectedMaterialIds = window.selectedMaterialIds || [];
var EXCHANGE_RATE = window.EXCHANGE_RATE = window.EXCHANGE_RATE || 850.0;
var BCV_DATA = window.BCV_DATA = window.BCV_DATA || { rate: 850.0, source: 'BCV Oficial' };
var currentUser = window.currentUser || null;
var authToken = window.authToken = window.authToken || localStorage.getItem('dalor_token') || null;

function safeParseFloat(val) {
    if (typeof val === 'number') return isNaN(val) ? 0.0 : val;
    if (!val) return 0.0;
    let s = String(val).trim();
    if (s.includes(',') && s.includes('.')) {
        if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
            s = s.replace(/\./g, '').replace(',', '.');
        } else {
            s = s.replace(/,/g, '');
        }
    } else if (s.includes(',')) {
        s = s.replace(',', '.');
    }
    const num = parseFloat(s);
    return isNaN(num) ? 0.0 : num;
}

/**
 * authFetch — wrapper que inyecta el token de autorización en cada request.
 * Usa window.fetch directamente (referencia nativa) para evitar recursión infinita.
 */
function authFetch(url, options = {}) {
    const freshToken = sessionStorage.getItem('dalor_token') || localStorage.getItem('dalor_token') || window.authToken || '';
    const headers = { ...(options.headers || {}) };
    if (freshToken) headers['Authorization'] = 'Bearer ' + freshToken;
    if (options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
    return window.fetch(url, { ...options, headers });
}

// --- BLOQUE L8039-L8865 ---
// ==============================================================================

// 💰 13. MÓDULO FINANCIERO: SUBTABS (CxC, CxP, TESORERÍA)

// ==============================================================================

function openFinancialSubtab(subtabName) {

    switchView('financial', 'finanzas');

    switchFinancialSubtab(subtabName);

}



function switchFinancialSubtab(subtabName) {
    try { 
        sessionStorage.setItem('dalor_active_subtab_financial', subtabName); 
        localStorage.setItem('dalor_active_subtab_financial', subtabName); 
    } catch(e) {}

    const subtabs = ['cxc', 'cxp', 'summary', 'partners'];

    subtabs.forEach(tab => {
        const pane = document.getElementById(`subtab-fin-${tab}`);
        const btn = document.getElementById(`tabbtn-fin-${tab}`);
        if (pane) pane.classList.add('hidden');
        if (btn) btn.classList.remove('active');
    });

    const activePane = document.getElementById(`subtab-fin-${subtabName}`);
    const activeBtn = document.getElementById(`tabbtn-fin-${subtabName}`);
    if (activePane) activePane.classList.remove('hidden');
    if (activeBtn) activeBtn.classList.add('active');

    if (subtabName === 'cxc') loadReceivablesList();
    if (subtabName === 'cxp') loadPayablesList();
    if (subtabName === 'summary') loadTreasurySummary();
    if (subtabName === 'partners') loadPartnersWithdrawalsList();
}



// ----------------------------------------------------

// CUENTAS POR COBRAR (CxC)

// ----------------------------------------------------

let allReceivablesList = [];
let cxcCurrentPage = 1;
let cxcPageSize = 15;

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

let currentCxcFilter = 'all';
let currentCxcSearch = '';

function roundFinancial(num) {
    return Math.round((num + Number.EPSILON) * 100) / 100;
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

        return `
        <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="font-weight: 800; color: var(--dalor-navy);">
                <div>${invNum}</div>
                <div style="margin-top: 2px;">${typeBadge}</div>
                ${surplusBadge}
            </td>
            <td style="font-weight: 700;">
                <div>${r.client_name}</div>
                <div style="font-size: 10px; color: #64748b; font-family: monospace;">RIF: ${r.client_rif || '-'}</div>
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
    tbody.innerHTML = `<tr><td colspan="11" style="text-align: center; color: #94a3b8; padding: 16px;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando cuentas por cobrar...</td></tr>`;

    try {
        const res = await authFetch(`${API_BASE}/financial/cxc`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const list = await res.json();
        allReceivablesList = Array.isArray(list) ? list : [];
        renderReceivablesPaginated();
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="11" style="text-align: center; color: #e11d48; padding: 16px;">Error al cargar cuentas por cobrar.</td></tr>`;
    }
}



async function openNewReceivableModal() {

    if (!allClients || allClients.length === 0) {

        try {

            const resC = await authFetch(`${API_BASE}/clients/`);

            if (resC.ok) allClients = await resC.json();

        } catch(e) {}

    }

    if (!allProjects || allProjects.length === 0) {

        try {

            const resP = await authFetch(`${API_BASE}/projects/`);

            if (resP.ok) allProjects = await resP.json();

        } catch(e) {}

    }



    populateSelect("cxc_client_id", allClients || [], c => `<option value="${c.id}">${c.name} (${c.rif || 'S/R'})</option>`);

    populateSelect("cxc_project_id", [{id: '', code: 'Sin Obra / General'}, ...(allProjects || [])], p => `<option value="${p.id || ''}">${p.code} - ${p.name || ''}</option>`);

    

    // Fecha de vencimiento a 15 días

    const d = new Date();

    d.setDate(d.getDate() + 15);

    const dueDateInput = document.getElementById("cxc_due_date");

    if (dueDateInput) dueDateInput.value = d.toISOString().split('T')[0];

    

    openModal("modalReceivable");

}



async function submitCreateReceivable(e) {
    if (e && e.preventDefault) e.preventDefault();

    console.log('[CxC] submitCreateReceivable llamada');

    const submitBtn = document.querySelector('#receivableForm button[type="submit"]');
    let btnOrigHtml = null;

    try {
        // Deshabilitar botón DENTRO del try para que finally SIEMPRE lo restaure
        if (submitBtn) {
            btnOrigHtml = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Guardando...`;
        }

        const invoiceNum  = (document.getElementById("cxc_invoice_number")?.value || '').trim();
        const clientId    = parseInt(document.getElementById("cxc_client_id")?.value || '0');
        const projVal     = document.getElementById("cxc_project_id")?.value || '';
        const projId      = (projVal && projVal !== '' && projVal !== '0') ? parseInt(projVal) : null;
        const desc        = (document.getElementById("cxc_description")?.value || '').trim();
        const dueDateVal  = (document.getElementById("cxc_due_date")?.value || '').trim();
        const amountVal   = safeParseFloat(document.getElementById("cxc_amount_usd")?.value);
        const taxRetained = safeParseFloat(document.getElementById("cxc_tax_retained")?.value);

        // Validaciones — usando throw para que el finally restaure el botón siempre
        if (!invoiceNum)              throw new Error("Debes ingresar el N° de Factura / Valuación.");
        if (!clientId || clientId <= 0) throw new Error("Debes seleccionar un Cliente.");
        if (!dueDateVal)              throw new Error("Debes ingresar la Fecha de Vencimiento.");
        if (amountVal <= 0)           throw new Error("El Monto USD debe ser mayor a cero.");

        // Parseo seguro de fecha (input type=date entrega YYYY-MM-DD)
        let safeDueDateIso;
        if (dueDateVal.includes('/')) {
            const parts = dueDateVal.split('/');
            if (parts.length === 3) {
                safeDueDateIso = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]), 12, 0, 0).toISOString();
            }
        }
        if (!safeDueDateIso) {
            const parsedD = new Date(dueDateVal + 'T12:00:00');
            safeDueDateIso = !isNaN(parsedD.getTime()) ? parsedD.toISOString() : new Date().toISOString();
        }

        // Desglose fiscal
        const baseUsd    = parseFloat((amountVal / 1.16).toFixed(2));
        const taxUsd     = parseFloat((amountVal - baseUsd).toFixed(2));
        const retIvaUsd  = taxRetained > 0 ? parseFloat((taxRetained * 0.75).toFixed(2)) : 0.0;
        const retIslrUsd = taxRetained > 0 ? parseFloat((taxRetained * 0.25).toFixed(2)) : 0.0;
        const netUsd     = parseFloat((amountVal - taxRetained).toFixed(2));

        const payload = {
            invoice_number:       invoiceNum,
            client_id:            clientId,
            project_id:           projId,
            description:          desc || `Valuación / Factura ${invoiceNum}`,
            due_date:             safeDueDateIso,
            amount_usd:           amountVal,
            taxable_base_usd:     baseUsd,
            tax_amount_usd:       taxUsd,
            tax_withholding_rate: 75.0,
            tax_withholding_usd:  retIvaUsd,
            islr_rate:            2.0,
            islr_withholding_usd: retIslrUsd,
            net_amount_usd:       netUsd,
            tax_retained_usd:     taxRetained > 0 ? taxRetained : (retIvaUsd + retIslrUsd),
            exchange_rate:        (typeof EXCHANGE_RATE !== 'undefined' ? EXCHANGE_RATE : 800.0)
        };

        console.log('[CxC] Payload:', JSON.stringify(payload));

        const res = await authFetch(`${API_BASE}/financial/cxc`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        console.log('[CxC] Response status:', res.status);

        if (!res.ok) {
            let errMsg = `Error HTTP ${res.status}`;
            try { const errData = await res.json(); errMsg = errData.detail || errMsg; } catch (_) {}
            throw new Error(errMsg);
        }


        // Éxito
        closeModal('modalReceivable');
        const recForm = document.getElementById('receivableForm');
        if (recForm) recForm.reset();

        switchView('financial', 'finanzas');
        switchFinancialSubtab('cxc');
        await loadReceivablesList();

        if (typeof window.loadProjectsList === 'function') {
            window.loadProjectsList();
        }

        if (typeof showToastNotification === 'function') {
            showToastNotification(`✅ Factura/Valuación [${invoiceNum}] registrada y vinculada a la obra con éxito.`, 'success');
        } else {
            alert(`✅ Factura [${invoiceNum}] registrada con éxito.`);
        }

    } catch (err) {
        console.error('[CxC Submit Error]', err);
        alert('Error: ' + err.message);
    } finally {
        // SIEMPRE restaurar el botón, sin importar qué ocurrió
        if (submitBtn) {
            submitBtn.disabled = false;
            if (btnOrigHtml) submitBtn.innerHTML = btnOrigHtml;
        }
    }
}



// ----------------------------------------------------

// CUENTAS POR PAGAR (CxP)

// ----------------------------------------------------

let allPayablesList = [];
let lastPayablesList = [];
let cxpCurrentPage = 1;
let cxpPageSize = 15;
let currentCxpFilter = 'all'; // all, pendiente, por_vencer, vencido, solvente
let currentCxpSearch = '';
let currentCxpDocType = 'all';
let currentCxpDateFrom = '';
let currentCxpDateTo = '';

async function loadPayablesList() {
    const tbody = document.getElementById("cxpTableBody");
    if (tbody) {
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
        
        updateCxpFilterBadges();
        renderPayablesPaginated();
    } catch (e) {
        console.error("Error al cargar CxP:", e);
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="11" style="text-align: center; color: #e11d48; padding: 16px;">Error al cargar cuentas por pagar: ${e.message}</td></tr>`;
        }
    }
}

function updateCxpFilterBadges() {
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

function onCxpSearchInput(val) {
    currentCxpSearch = (val || '').trim();
    cxpCurrentPage = 1;
    loadPayablesList();
}

function onCxpDocTypeFilterChange(val) {
    currentCxpDocType = val || 'all';
    cxpCurrentPage = 1;
    loadPayablesList();
}

function applyCxpDateFilter() {
    const dFrom = document.getElementById("cxp_date_from")?.value || '';
    const dTo = document.getElementById("cxp_date_to")?.value || '';
    currentCxpDateFrom = dFrom;
    currentCxpDateTo = dTo;
    cxpCurrentPage = 1;
    loadPayablesList();
}

function clearCxpDateFilter() {
    const elF = document.getElementById("cxp_date_from");
    const elT = document.getElementById("cxp_date_to");
    if (elF) elF.value = '';
    if (elT) elT.value = '';
    currentCxpDateFrom = '';
    currentCxpDateTo = '';
    cxpCurrentPage = 1;
    loadPayablesList();
}

function setFilterCxp(filterType) {
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

function goToCxpPage(page) {
    cxpCurrentPage = page;
    renderPayablesPaginated();
    const c = document.getElementById("cxpTableBody");
    if (c) c.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function changeCxpPageSize(size) {
    cxpPageSize = parseInt(size) || 15;
    cxpCurrentPage = 1;
    renderPayablesPaginated();
}

function renderPayablesPaginated() {
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
            <td style="font-size: 11.5px; color: #334155; max-width: 200px;">${p.description}</td>
            <td style="font-size: 11px; color: #64748b;">${p.issue_date || '-'}</td>
            <td style="font-size: 11px; font-weight: 700; color: ${p.aging_status === 'vencido' ? '#e11d48' : '#334155'};"><i class="fa-regular fa-calendar"></i> ${p.due_date || '-'}</td>
            <td style="font-weight: 800; color: #0f172a;">$${Number(p.amount_usd || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td style="font-weight: 700; color: #b91c1c;">
                ${p.tax_withholding_usd > 0 ? `-$${Number(p.tax_withholding_usd).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : '$0.00'}
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

                    ${p.withholding_voucher_number ? `
                        <button onclick="openWithholdingVoucherModal(${p.id})" class="btn-secondary" style="font-size: 11px; padding: 4px 8px; background: #fdf2f8; color: #be185d; border-color: #fbcfe8; font-weight: 700;" title="Ver e Imprimir Comprobante Oficial de Retención IVA (SNAT/2015/0049)">
                            <i class="fa-solid fa-file-invoice"></i> Comprobante
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

function onCxpModalDocTypeChange() {
    const docType = document.getElementById("cxp_doc_type")?.value || 'factura';
    const rifContainer = document.getElementById("cxp_rif_container");
    const rifReq = document.getElementById("cxp_rif_req");
    const ctrlContainer = document.getElementById("cxp_control_container");
    const retContainer = document.getElementById("cxp_ret_rate_container");
    const breakdownBox = document.getElementById("cxp_fiscal_breakdown");
    const invoiceLbl = document.getElementById("lbl_cxp_invoice");

    if (docType === 'nota_entrega') {
        if (invoiceLbl) invoiceLbl.textContent = "Nº Nota de Entrega / Recibo *";
        if (rifReq) rifReq.style.display = "none";
        if (ctrlContainer) ctrlContainer.style.display = "none";
        if (retContainer) retContainer.style.display = "none";
        if (breakdownBox) breakdownBox.style.display = "none";
    } else if (docType === 'factura_sin_retencion') {
        if (invoiceLbl) invoiceLbl.textContent = "Nº Factura Fiscal *";
        if (rifReq) rifReq.style.display = "inline";
        if (ctrlContainer) ctrlContainer.style.display = "block";
        if (retContainer) retContainer.style.display = "none";
        if (breakdownBox) breakdownBox.style.display = "grid";
    } else {
        if (invoiceLbl) invoiceLbl.textContent = "Nº Factura Fiscal *";
        if (rifReq) rifReq.style.display = "inline";
        if (ctrlContainer) ctrlContainer.style.display = "block";
        if (retContainer) retContainer.style.display = "block";
        if (breakdownBox) breakdownBox.style.display = "grid";
    }
    calcPayablePreview();
}

function calcPayablePreview() {
    const total = parseFloat(document.getElementById("cxp_amount_usd")?.value) || 0;
    const docType = document.getElementById("cxp_doc_type")?.value || 'factura';
    const retRate = (docType === 'factura') ? (parseFloat(document.getElementById("cxp_tax_withholding_rate")?.value) || 75.0) : 0;

    let base = 0, tax = 0, ret = 0, net = total;
    if (docType === 'nota_entrega') {
        base = total;
        tax = 0;
        ret = 0;
        net = total;
    } else {
        base = roundFinancial(total / 1.16);
        tax = roundFinancial(total - base);
        ret = (retRate > 0) ? roundFinancial(tax * (retRate / 100.0)) : 0;
        net = roundFinancial(total - ret);
    }

    const lblBase = document.getElementById("cxp_lbl_base");
    const lblTax = document.getElementById("cxp_lbl_tax");
    const lblRet = document.getElementById("cxp_lbl_withholding");
    const lblNet = document.getElementById("cxp_lbl_net");

    if (lblBase) lblBase.textContent = `$${base.toFixed(2)}`;
    if (lblTax) lblTax.textContent = `$${tax.toFixed(2)}`;
    if (lblRet) lblRet.textContent = `$${ret.toFixed(2)}`;
    if (lblNet) lblNet.textContent = `$${net.toFixed(2)}`;
}

async function openNewPayableModal() {
    // 1. Asegurar que los proyectos estén cargados para imputación de compras a obras
    if (!allProjects || allProjects.length === 0) {
        try {
            const resP = await authFetch(`${API_BASE}/projects/`);
            if (resP.ok) {
                allProjects = await resP.json();
                window.allProjects = allProjects;
            }
        } catch(e) {
            console.error("Error cargando proyectos para modal de CxP:", e);
        }
    }
    const safeProjects = (window.allProjects && window.allProjects.length > 0) ? window.allProjects : (allProjects || []);

    const projectSelect = document.getElementById("cxp_project_id");
    if (projectSelect) {
        let opts = `<option value="">Sede Central / Gastos Generales (Sin Imputar a Obra)</option>`;
        opts += safeProjects.map(p => `<option value="${p.id}">[${p.code}] ${p.name || ''}</option>`).join('');
        projectSelect.innerHTML = opts;
    }

    const d = new Date();
    d.setDate(d.getDate() + 15);
    const dueDateInput = document.getElementById("cxp_due_date");
    if (dueDateInput) dueDateInput.value = d.toISOString().split('T')[0];

    onCxpModalDocTypeChange();
    openModal("modalPayable");
}

async function submitCreatePayable(e) {
    if (e && e.preventDefault) e.preventDefault();

    const submitBtn = document.getElementById("btnSubmitCreatePayable") || (e && e.target ? e.target.querySelector('button[type="submit"]') : null);
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.dataset.origText = submitBtn.dataset.origText || submitBtn.innerHTML;
        submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Registrando en CxP...`;
    }

    const docType = document.getElementById("cxp_doc_type")?.value || 'factura';
    const amountUsd = parseFloat(document.getElementById("cxp_amount_usd")?.value) || 0;
    const retRate = (docType === 'factura') ? (parseFloat(document.getElementById("cxp_tax_withholding_rate")?.value) || 75.0) : 0;
    
    let baseUsd = 0, taxUsd = 0, retUsd = 0;
    if (docType !== 'nota_entrega') {
        baseUsd = roundFinancial(amountUsd / 1.16);
        taxUsd = roundFinancial(amountUsd - baseUsd);
        retUsd = (retRate > 0) ? roundFinancial(taxUsd * (retRate / 100.0)) : 0;
    } else {
        baseUsd = amountUsd;
    }

    const payload = {
        invoice_number: document.getElementById("cxp_invoice_number")?.value?.trim() || '',
        control_number: document.getElementById("cxp_control_number")?.value?.trim() || '',
        supplier_name: document.getElementById("cxp_supplier_name")?.value?.trim() || '',
        supplier_rif: document.getElementById("cxp_supplier_rif")?.value?.trim() || '',
        doc_type: docType,
        project_id: document.getElementById("cxp_project_id")?.value ? parseInt(document.getElementById("cxp_project_id").value) : null,
        description: document.getElementById("cxp_description")?.value?.trim() || '',
        due_date: new Date(document.getElementById("cxp_due_date").value).toISOString(),
        amount_usd: amountUsd,
        taxable_base_usd: baseUsd,
        tax_amount_usd: taxUsd,
        tax_withholding_rate: retRate,
        tax_withholding_usd: retUsd,
        is_withholding_applied: (docType === 'factura' && retRate > 0),
        exchange_rate: (typeof EXCHANGE_RATE !== 'undefined' ? EXCHANGE_RATE : 850.0),
        notes: document.getElementById("cxp_notes")?.value?.trim() || ''
    };

    try {
        const res = await authFetch(`${API_BASE}/financial/cxp`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.detail || `Error HTTP ${res.status} al registrar cuenta por pagar`);
        }

        const data = await res.json();
        closeModal("modalPayable");
        document.getElementById("payableForm")?.reset();
        
        // Asegurar que estemos en la subpestaña de CxP y recargar lista
        if (typeof switchFinancialSubtab === 'function') switchFinancialSubtab('cxp');
        await loadPayablesList();

        if (data.withholding_voucher_number) {
            if (typeof showToastNotification === 'function') {
                showToastNotification(`✅ Factura registrada con éxito. Se generó el Comprobante Oficial N° ${data.withholding_voucher_number}. Abriendo...`, 'success');
            } else {
                alert(`✅ Factura registrada con éxito.\n📄 Se generó el Comprobante Oficial de Retención IVA N° ${data.withholding_voucher_number}.`);
            }
            // Abrir automáticamente el comprobante oficial de retención SENIAT para visualización e impresión
            await openWithholdingVoucherModal(data.id);
        } else {
            if (typeof showToastNotification === 'function') {
                showToastNotification(`✅ Cuenta por pagar registrada exitosamente en CxP.`, 'success');
            } else {
                alert(`✅ Cuenta por pagar registrada exitosamente en CxP.`);
            }
        }
    } catch (err) {
        console.error("Error al registrar CxP:", err);
        alert("❌ Error al registrar Cuenta por Pagar: " + err.message);
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.dataset.submitting = "false";
            submitBtn.innerHTML = submitBtn.dataset.origText || `<i class="fa-solid fa-floppy-disk"></i> Registrar y Emitir Cuenta por Pagar`;
        }
    }
}

async function openWithholdingVoucherModal(payableId) {
    try {
        const res = await authFetch(`${API_BASE}/financial/cxp/${payableId}/withholding-voucher`);
        if (!res.ok) throw new Error("No se pudo obtener el comprobante de retención");
        const data = await res.json();
        const v = data.voucher;
        if (!v) throw new Error("Datos de comprobante no disponibles");

        document.getElementById("voucher_doc_number").textContent = v.voucher_number || '-';
        document.getElementById("voucher_doc_date").textContent = v.voucher_date || '-';
        document.getElementById("voucher_doc_period").textContent = v.fiscal_period || '-';

        document.getElementById("voucher_supp_name").textContent = v.supplier.name || '-';
        document.getElementById("voucher_supp_rif").textContent = v.supplier.rif || 'J-00000000-0';
        document.getElementById("voucher_supp_concept").textContent = v.invoice.invoice_number ? `Factura N° ${v.invoice.invoice_number}` : '-';
        document.getElementById("voucher_bcv_rate").textContent = `Bs. ${Number(v.invoice.exchange_rate || 0).toLocaleString('en-US', {minimumFractionDigits: 2})} / USD`;

        document.getElementById("v_td_date").textContent = v.invoice.invoice_date || '-';
        document.getElementById("v_td_invoice").textContent = v.invoice.invoice_number || '-';
        document.getElementById("v_td_control").textContent = v.invoice.control_number || '-';
        document.getElementById("v_td_total_usd").textContent = `$${Number(v.invoice.total_usd || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}`;
        document.getElementById("v_td_base_usd").textContent = `$${Number(v.invoice.base_usd || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}`;
        document.getElementById("v_td_tax_usd").textContent = `$${Number(v.invoice.tax_usd || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}`;
        document.getElementById("v_td_ret_rate").textContent = `${v.invoice.withholding_rate_pct || 75}%`;
        document.getElementById("v_td_withheld_usd").textContent = `-$${Number(v.invoice.withholding_usd || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}`;
        document.getElementById("v_td_net_usd").textContent = `$${Number(v.invoice.net_payable_usd || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}`;

        document.getElementById("v_td_total_bs").textContent = `Bs. ${Number(v.invoice.total_bs || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}`;
        document.getElementById("v_td_base_bs").textContent = `Bs. ${Number(v.invoice.base_bs || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}`;
        document.getElementById("v_td_tax_bs").textContent = `Bs. ${Number(v.invoice.tax_bs || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}`;
        document.getElementById("v_td_withheld_bs").textContent = `-Bs. ${Number(v.invoice.withholding_bs || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}`;
        document.getElementById("v_td_net_bs").textContent = `Bs. ${Number(v.invoice.net_payable_bs || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}`;

        openModal("modalWithholdingVoucher");
    } catch (err) {
        alert("Error al cargar comprobante: " + err.message);
    }
}

function printWithholdingVoucher() {
    const voucherModal = document.querySelector("#modalWithholdingVoucher .modal-content");
    const docNumber = document.getElementById("voucher_doc_number")?.textContent || "SENIAT";
    const title = `Comprobante_Retencion_IVA_${docNumber}`;
    if (typeof window.printElementHtml === 'function' && voucherModal) {
        window.printElementHtml(voucherModal, title);
    } else {
        window.print();
    }
}

function openEditPayableModal(payableId) {
    const p = (lastPayablesList || []).find(x => x.id === payableId);
    if (!p) {
        alert("Factura no encontrada.");
        return;
    }
    document.getElementById("edit_cxp_id").value = p.id;
    document.getElementById("edit_cxp_supplier_name").value = p.supplier_name || '';
    document.getElementById("edit_cxp_supplier_rif").value = p.supplier_rif && p.supplier_rif !== '-' ? p.supplier_rif : '';
    document.getElementById("edit_cxp_invoice_number").value = p.invoice_number || '';
    document.getElementById("edit_cxp_control_number").value = p.control_number && p.control_number !== '-' ? p.control_number : '';
    document.getElementById("edit_cxp_amount_usd").value = p.amount_usd || 0;
    document.getElementById("edit_cxp_tax_withholding_rate").value = String(p.tax_withholding_rate || 75);
    document.getElementById("edit_cxp_due_date").value = p.due_date || '';
    document.getElementById("edit_cxp_description").value = p.description || '';

    const voucherContainer = document.getElementById("edit_cxp_voucher_container");
    const voucherInput = document.getElementById("edit_cxp_voucher_number");
    if (voucherContainer && voucherInput) {
        if (p.withholding_voucher_number) {
            voucherContainer.style.display = "block";
            voucherInput.value = p.withholding_voucher_number;
        } else {
            voucherContainer.style.display = "none";
            voucherInput.value = "";
        }
    }

    openModal("modalEditPayable");
}

async function submitEditPayable(e) {
    if (e && e.preventDefault) e.preventDefault();
    const id = document.getElementById("edit_cxp_id")?.value;
    if (!id) return;

    const payload = {
        supplier_name: document.getElementById("edit_cxp_supplier_name")?.value?.trim(),
        supplier_rif: document.getElementById("edit_cxp_supplier_rif")?.value?.trim() || null,
        invoice_number: document.getElementById("edit_cxp_invoice_number")?.value?.trim(),
        control_number: document.getElementById("edit_cxp_control_number")?.value?.trim() || null,
        amount_usd: parseFloat(document.getElementById("edit_cxp_amount_usd")?.value) || 0,
        tax_withholding_rate: parseFloat(document.getElementById("edit_cxp_tax_withholding_rate")?.value) || 0,
        due_date: new Date(document.getElementById("edit_cxp_due_date").value).toISOString(),
        description: document.getElementById("edit_cxp_description")?.value?.trim()
    };

    const voucherVal = document.getElementById("edit_cxp_voucher_number")?.value?.trim();
    if (voucherVal) {
        payload.withholding_voucher_number = voucherVal;
    }

    try {
        const res = await authFetch(`${API_BASE}/financial/cxp/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || "Error al modificar factura");
        }
        closeModal("modalEditPayable");
        await loadPayablesList();
        alert("✅ Factura actualizada exitosamente.");
    } catch (err) {
        alert("❌ Error: " + err.message);
    }
}

async function deletePayablePrompt(payableId) {
    const p = (lastPayablesList || []).find(x => x.id === payableId);
    const inv = p ? p.invoice_number : `#${payableId}`;
    if (!confirm(`¿Está seguro de que desea anular y eliminar la factura ${inv}? Esta acción es irreversible.`)) {
        return;
    }
    try {
        const res = await authFetch(`${API_BASE}/financial/cxp/${payableId}`, {
            method: "DELETE"
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || "Error al anular la factura");
        }
        await loadPayablesList();
        alert("✅ Factura anulada y eliminada con éxito.");
    } catch (err) {
        alert("❌ Error: " + err.message);
    }
}

function openPayableHistoryModal(payableId) {
    const p = (lastPayablesList || []).find(x => x.id === payableId);
    if (!p) {
        alert("No se pudo localizar el detalle de esta factura.");
        return;
    }

    const titleEl = document.getElementById("payableHistoryTitle");
    if (titleEl) {
        titleEl.innerHTML = `<i class="fa-solid fa-clock-rotate-left" style="color: #e11d48;"></i> Historial de Pagos & Retenciones &bull; Factura [${p.invoice_number}]`;
    }

    const subtitleEl = document.getElementById("payableHistorySubtitle");
    if (subtitleEl) {
        subtitleEl.textContent = `Proveedor: ${p.supplier_name} | Total: $${Number(p.amount_usd || 0).toLocaleString('en-US', {minimumFractionDigits: 2})} | Saldo Pendiente: $${Number(p.balance_usd || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}`;
    }

    const tbody = document.getElementById("payableHistoryTableBody");
    if (tbody) {
        const payments = p.payments || [];
        if (payments.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #94a3b8; padding: 16px;">No se han registrado abonos ni pagos aún para esta factura.</td></tr>`;
        } else {
            tbody.innerHTML = payments.map(pm => {
                let isRet = pm.payment_method === 'retencion_iva';
                let typeBadge = isRet 
                    ? `<span style="background: #fdf2f8; color: #be185d; font-size: 9.5px; padding: 2px 6px; border-radius: 4px; font-weight: 800;">Comprobante Retención IVA</span>`
                    : `<span style="background: #dcfce7; color: #166534; font-size: 9.5px; padding: 2px 6px; border-radius: 4px; font-weight: 800;">Pago Bancario (${(pm.bank_account || 'Banesco').replace(/_/g, ' ')})</span>`;
                return `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 8px; font-weight: 600; color: #334155;">${pm.payment_date || '-'}</td>
                    <td style="padding: 8px;">${typeBadge}</td>
                    <td style="padding: 8px; font-family: monospace; font-weight: 700; color: #0284c7;">${pm.voucher_number || '-'}</td>
                    <td style="padding: 8px; text-align: right; font-weight: 800; color: ${isRet ? '#be185d' : '#059669'};">$${Number(pm.amount_usd || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                    <td style="padding: 8px; color: #64748b; font-size: 11px;">${pm.notes || '-'}</td>
                </tr>`;
            }).join('');
        }
    }
    openModal("modalPayableHistory");
}


function openDeclareBadDebtModal(recId, invoiceNum, clientName, balanceUsd) {
    const item = (allReceivablesList || []).find(x => x.id === recId) || {};
    const inv = invoiceNum || item.invoice_number || 'S/F';
    const cName = clientName || item.client_name || '';
    const bal = balanceUsd !== undefined ? balanceUsd : (item.balance_usd || 0);

    const targetInput = document.getElementById("bad_debt_target_id") || document.getElementById("bad_debt_cxc_id");
    if (targetInput) targetInput.value = recId;

    const invLabel = document.getElementById("bad_debt_inv_label");
    if (invLabel) invLabel.textContent = `[${inv}] ${cName ? '- ' + cName : ''}`;

    const amountLabel = document.getElementById("bad_debt_amount_label");
    if (amountLabel) amountLabel.textContent = `$${parseFloat(bal || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})} USD`;

    const notesInput = document.getElementById("bad_debt_notes");
    if (notesInput) notesInput.value = "";

    openModal("modalDeclareBadDebt");
}

async function submitDeclareBadDebt(e) {
    if (e && e.preventDefault) e.preventDefault();
    const targetInput = document.getElementById("bad_debt_target_id") || document.getElementById("bad_debt_cxc_id");
    const id = targetInput ? targetInput.value : null;
    const reason = document.getElementById("bad_debt_reason")?.value || "Insolvencia Prolongada";
    const notes = document.getElementById("bad_debt_notes")?.value?.trim() || "";

    if (!id) {
        alert("Error: No se identificó la cuenta por cobrar.");
        return;
    }

    try {
        const res = await authFetch(`${API_BASE}/financial/cxc/${id}/declare-bad-debt`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reason, notes })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || data.error || "Error al declarar incobrable");

        closeModal("modalDeclareBadDebt");
        if (typeof showToastNotification === 'function') {
            showToastNotification("✅ Factura declarada como Incobrable / Cartera Castigada con éxito.", "success");
        } else {
            alert("✅ Factura declarada como Incobrable / Cartera Castigada con éxito.");
        }
        await loadReceivablesList();
        if (typeof loadFinancialSummary === 'function') await loadFinancialSummary();
        if (typeof loadTreasurySummary === 'function') await loadTreasurySummary();
    } catch (err) {
        alert("Error: " + err.message);
    }
}



// ----------------------------------------------------

// REGISTRO DE COBRO O PAGO

// ----------------------------------------------------

function calcFinTransBsEquiv() {
    const acc = document.getElementById("fin_trans_account")?.value || "";
    const method = document.getElementById("fin_trans_method")?.value || "";
    const container = document.getElementById("fin_trans_bcv_calc");
    const rateLbl = document.getElementById("fin_bcv_rate_lbl");
    const equivLbl = document.getElementById("fin_bs_equiv_lbl");
    const amountUsd = parseFloat(document.getElementById("fin_trans_amount_usd")?.value) || 0;
    
    const rate = (typeof EXCHANGE_RATE !== 'undefined' ? EXCHANGE_RATE : (window.EXCHANGE_RATE || 850.0));
    const isBs = acc.includes("(Bs)") || method === 'pago_movil';
    
    if (container) {
        if (isBs) {
            container.style.display = 'block';
            if (rateLbl) rateLbl.innerText = `Bs. ${rate.toFixed(2)}`;
            const equivBs = roundFinancial(amountUsd * rate);
            if (equivLbl) equivLbl.innerText = `Bs. ${equivBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`;
        } else {
            container.style.display = 'none';
        }
    }
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
    calcFinTransBsEquiv();
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

    calcFinTransBsEquiv();
    openModal("modalFinancialTransaction");

}



async function submitFinancialPayment(e) {

    e.preventDefault();

    const type = document.getElementById("fin_trans_type").value;

    const targetId = document.getElementById("fin_trans_target_id").value;

    const amountUsd = parseFloat(document.getElementById("fin_trans_amount_usd").value);
    const selectedAcc = document.getElementById("fin_trans_account")?.value || "";
    const notesVal = document.getElementById("fin_trans_notes")?.value?.trim() || "";
    const fullNotes = selectedAcc ? `[Cuenta: ${selectedAcc}] ${notesVal}`.trim() : notesVal;

    const payload = {

        amount_usd: amountUsd,

        exchange_rate: (typeof EXCHANGE_RATE !== 'undefined' ? EXCHANGE_RATE : 850.0),

        payment_method: document.getElementById("fin_trans_method").value,

        reference_number: document.getElementById("fin_trans_ref").value.trim(),

        notes: fullNotes

    };



    const endpoint = type === 'cobro_cxc' 

        ? `${API_BASE}/financial/cxc/${targetId}/payment`

        : `${API_BASE}/financial/cxp/${targetId}/payment`;



    try {

        const res = await authFetch(endpoint, {

            method: "POST",

            headers: { "Content-Type": "application/json" },

            body: JSON.stringify(payload)

        });

        if (!res.ok) throw new Error("Error al registrar transacción");

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
async function loadTreasurySummary() {

    const kpisContainer = document.getElementById("treasuryKPIsContainer");

    const cashflowDetails = document.getElementById("treasuryCashflowDetails");

    const creditDetails = document.getElementById("treasuryCreditDetails");



    loadCashFlowMatrix();

    try {
        const res = await authFetch(`${API_BASE}/financial/summary`);

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
        `;

        cashflowDetails.innerHTML = `
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

            <div style="display: flex; justify-content: space-between; padding: 8px 10px; background: var(--dalor-navy); color: white; border-radius: 6px; font-size: 13px; font-weight: 800; margin-top: 4px;">
                <span>(=) Flujo Neto Operativo de Caja:</span>
                <span style="color: ${k.net_operating_cash_usd >= 0 ? '#34d399' : '#f87171'};">$${k.net_operating_cash_usd.toLocaleString()}</span>
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
                const [resCxc, resCxp, resPart, resExch, resExp] = await Promise.all([
                    authFetch(`${API_BASE}/financial/cxc`, { headers }),
                    authFetch(`${API_BASE}/financial/cxp`, { headers }),
                    authFetch(`${API_BASE}/financial/partners/withdrawals`, { headers }),
                    authFetch(`${API_BASE}/financial/exchanges`, { headers }),
                    authFetch(`${API_BASE}/expenses/?status=aprobado`, { headers })
                ]);

                const cxcList = resCxc.ok ? await resCxc.json() : [];
                const cxpList = resCxp.ok ? await resCxp.json() : [];
                const partList = resPart.ok ? await resPart.json() : [];
                const exchList = resExch.ok ? await resExch.json() : [];
                const expList = (resExp && resExp.ok) ? await resExp.json() : [];

                const operations = [];
                const bcvRate = window.BCV_DATA?.rate || (typeof State !== 'undefined' && State.exchangeRate) || EXCHANGE_RATE || 850.0;

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
                                    notes: pm.notes || ''
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
                                notes: ''
                            });
                        }
                    });
                }

                // 2. Trazabilidad de cada pago / abono individual a proveedores
                if (Array.isArray(cxpList)) {
                    cxpList.forEach(p => {
                        const payments = p.payments || [];
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
                                    notes: pm.notes || ''
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
                                notes: ''
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
                            amount_bs: w.amount_bs || (w.amount_usd * (w.exchange_rate || window.BCV_DATA?.rate || 850.0))
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
                            amount_bs: ex.amount_bs || 0
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
                            notes: e.description || ''
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
let treasuryPageSize = 15;

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

function handleTreasuryPeriodChange() {
    const pSelect = document.getElementById("treasuryFilterPeriod");
    const cCont = document.getElementById("treasuryCustomDateContainer");
    if (pSelect && cCont) {
        cCont.style.display = (pSelect.value === 'custom') ? 'flex' : 'none';
    }
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

function setCashFlowRange(range) {
    currentCfRange = range;
    ['all', 'h1', 'h2', 'last3'].forEach(r => {
        const btn = document.getElementById(`btn_cf_range_${r}`);
        if (btn) btn.className = (r === range) ? 'btn-primary' : 'btn-secondary';
    });
    loadCashFlowMatrix();
}

async function loadCashFlowMatrix() {
    const table = document.getElementById("cashFlowMatrixTable");
    const thead = document.getElementById("cashFlowMatrixThead");
    const tbody = document.getElementById("cashFlowMatrixTbody");
    if (!table || !tbody) return;

    const yearSelect = document.getElementById("cf_matrix_year");
    const year = yearSelect ? (parseInt(yearSelect.value) || 2026) : 2026;

    let startMonth = 1;
    let endMonth = 12;

    if (currentCfRange === 'h1') {
        startMonth = 1; endMonth = 6;
    } else if (currentCfRange === 'h2') {
        startMonth = 7; endMonth = 12;
    } else if (currentCfRange === 'last3') {
        const curMonth = (new Date()).getMonth() + 1;
        endMonth = Math.min(12, Math.max(1, curMonth));
        startMonth = Math.max(1, endMonth - 2);
    }

    tbody.innerHTML = `<tr><td colspan="15" style="text-align: center; padding: 24px; color: #94a3b8;"><i class="fa-solid fa-spinner fa-spin"></i> Conciliando flujo de caja del período...</td></tr>`;

    try {
        const res = await authFetch(`${API_BASE}/financial/cash-flow-matrix?year=${year}&start_month=${startMonth}&end_month=${endMonth}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
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

    const months = data.months;

    // 1. Render Encabezado de Meses
    let theadHtml = `<tr>
        <th style="padding: 10px 14px; background: #1e3a8a; color: white; text-align: left; position: sticky; left: 0; z-index: 3; min-width: 240px; font-size: 12px; font-weight: 800; border-right: 2px solid #3b82f6;">
            Concepto / Partida Contable
        </th>`;
    months.forEach(m => {
        theadHtml += `<th style="padding: 10px 12px; background: #1e3a8a; color: white; text-align: right; min-width: 105px; font-size: 11.5px; font-weight: 800; border-right: 1px solid #2563eb;">
            ${m.month_name.toUpperCase()}
        </th>`;
    });
    theadHtml += `<th style="padding: 10px 14px; background: #0f172a; color: #38bdf8; text-align: right; min-width: 120px; font-size: 12px; font-weight: 900;">
        TOTAL PERÍODO
    </th></tr>`;
    thead.innerHTML = theadHtml;

    const fmt = (val, isZeroDash = true) => {
        const num = Number(val || 0);
        if (isZeroDash && Math.abs(num) < 0.01) return '<span style="color: #cbd5e1;">-</span>';
        const str = Math.abs(num).toLocaleString('en-US', { minimumFractionDigits: 2 });
        return num < 0 ? `(${str})` : `${str}`;
    };

    const row = (label, getVal, opts = {}) => {
        const isHeader = opts.isHeader || false;
        const isTotal = opts.isTotal || false;
        const isSub = opts.isSub || false;
        const color = opts.color || 'inherit';
        const bg = opts.bg || (isHeader ? '#f8fafc' : (isTotal ? '#f1f5f9' : '#fff'));

        let sum = 0;
        months.forEach(m => { sum += Number(getVal(m) || 0); });

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
            ${isHeader ? '' : fmt(sum)}
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
function openTreasuryExchangeModal() {
    const form = document.getElementById("treasuryExchangeForm");
    if (form) form.reset();
    onTreasuryExchangeTypeChanged();
    calcTreasuryExchangeDiff();
    openModal("modalTreasuryExchange");
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
    const bcvRate = window.BCV_DATA?.rate || (typeof State !== 'undefined' && State.exchangeRate) || (typeof EXCHANGE_RATE !== 'undefined' ? EXCHANGE_RATE : 850.0);

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
    const bcvRate = window.BCV_DATA?.rate || (typeof State !== 'undefined' && State.exchangeRate) || (typeof EXCHANGE_RATE !== 'undefined' ? EXCHANGE_RATE : 850.0);

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
        alert("Error al procesar cambio de divisas: " + err.message);
    }
}

// --- BLOQUE L9996-L10369 ---
// ==============================================================================

// ⚡ 17. CARGA RÁPIDA EN 3 TOQUES & CONTROL DE RETIROS DE SOCIOS

// ==============================================================================

function openQuickFlowModal() {

    const role = (currentUser?.role_name || currentUser?.username || '').toLowerCase();

    if (role.includes('campo') || role.includes('supervisor')) {

        alert('Acceso restringido: El atajo de 3 toques es exclusivo para Dirección y Finanzas. Por favor utiliza el formulario formal de campo.');

        return;

    }

    const pSelect = document.getElementById('qf_project_id');

    if (pSelect && allProjects.length > 0) {

        pSelect.innerHTML = allProjects.map(p => `<option value="${p.id}">${p.code} - ${p.name.substring(0, 30)}</option>`).join('');

    }

    document.getElementById('quickFlowForm').reset();

    selectQuickType('obra');

    calcQuickBs();

    document.getElementById('modalQuickFlow').classList.remove('hidden');

}



function selectQuickType(type) {

    document.getElementById('qf_selected_type').value = type;

    

    // Reset cards styles

    ['obra', 'sede', 'socio'].forEach(t => {

        const card = document.getElementById(`card_type_${t}`);

        const details = document.getElementById(`qf_details_${t}`);

        if (card) {

            card.style.borderColor = '#cbd5e1';

            card.style.background = '#ffffff';

        }

        if (details) details.classList.add('hidden');

    });



    const activeCard = document.getElementById(`card_type_${type}`);

    const activeDetails = document.getElementById(`qf_details_${type}`);

    

    if (type === 'obra') {

        if (activeCard) { activeCard.style.borderColor = 'var(--dalor-blue)'; activeCard.style.background = '#f0f9ff'; }

    } else if (type === 'sede') {

        if (activeCard) { activeCard.style.borderColor = '#0d9488'; activeCard.style.background = '#f0fdfa'; }

    } else if (type === 'socio') {

        if (activeCard) { activeCard.style.borderColor = '#7c3aed'; activeCard.style.background = '#faf5ff'; }

    }



    if (activeDetails) activeDetails.classList.remove('hidden');

}



function calcQuickBs() {

    const usd = parseFloat(document.getElementById('qf_amount_usd').value) || 0;

    const bsInput = document.getElementById('qf_amount_bs');

    if (bsInput) {

        bsInput.value = (usd * EXCHANGE_RATE).toFixed(2);

    }

}



async function submitQuickFlow(event) {

    event.preventDefault();

    const amount_usd = parseFloat(document.getElementById('qf_amount_usd').value) || 0;

    const payment_method = document.getElementById('qf_payment_method').value;

    const vendor = document.getElementById('qf_vendor').value.trim() || 'General';

    const description = document.getElementById('qf_description').value.trim();

    const selected_type = document.getElementById('qf_selected_type').value;



    if (amount_usd <= 0) {

        alert('Por favor ingresa un monto mayor a cero.');

        return;

    }



    try {

        if (selected_type === 'socio') {

            // Registrar como Retiro de Socio

            const partner_name = (document.getElementById('qf_partner_name')?.value || '').trim() || 'Accionista';
            const concept = document.getElementById('qf_partner_concept').value.trim() || description;



            const res = await authFetch(`${API_BASE}/financial/partners/withdrawals`, {

                method: 'POST',

                headers: { 'Content-Type': 'application/json' },

                body: JSON.stringify({

                    partner_name,

                    concept,

                    amount_usd,

                    payment_method,

                    exchange_rate: EXCHANGE_RATE,

                    notes: `Registrado vía Carga Rápida. Proveedor/Destino: ${vendor}`

                })

            });



            if (!res.ok) throw new Error('Error al registrar retiro.');

            alert(`✅ Retiro de $${amount_usd.toLocaleString()} registrado con éxito para ${partner_name}.`);



        } else if (selected_type === 'sede') {

            // Registrar como Gasto Fijo de Sede

            const fixedCat = document.getElementById('qf_fixed_category').value;

            const category_id = (allCategories[0] && allCategories[0].id) || 1;



            const res = await authFetch(`${API_BASE}/expenses/manual`, {

                method: 'POST',

                headers: { 'Content-Type': 'application/json' },

                body: JSON.stringify({

                    category_id: category_id,

                    project_id: null,

                    amount_usd: amount_usd,

                    amount_bs: amount_usd * EXCHANGE_RATE,

                    exchange_rate: EXCHANGE_RATE,

                    payment_method: payment_method,

                    supplier_vendor: vendor,

                    description: `[SEDE / TALLER] ${description} (${fixedCat})`,

                    reported_by_id: (allPersonnel[0] && allPersonnel[0].id) || 1

                })

            });



            if (!res.ok) throw new Error('Error al registrar gasto de sede.');

            alert(`✅ Gasto Fijo de Sede de $${amount_usd.toLocaleString()} registrado con éxito.`);



        } else {

            // Registrar como Costo Directo de Obra

            const project_id = parseInt(document.getElementById('qf_project_id').value);

            const costCat = document.getElementById('qf_cost_category').value;

            const category_id = (allCategories[0] && allCategories[0].id) || 1;



            const res = await authFetch(`${API_BASE}/expenses/manual`, {

                method: 'POST',

                headers: { 'Content-Type': 'application/json' },

                body: JSON.stringify({

                    category_id: category_id,

                    project_id: project_id,

                    amount_usd: amount_usd,

                    amount_bs: amount_usd * EXCHANGE_RATE,

                    exchange_rate: EXCHANGE_RATE,

                    payment_method: payment_method,

                    supplier_vendor: vendor,

                    description: `[COSTO OBRA - ${costCat.toUpperCase()}] ${description}`,

                    reported_by_id: (allPersonnel[0] && allPersonnel[0].id) || 1

                })

            });



            if (!res.ok) throw new Error('Error al registrar costo de obra.');

            alert(`✅ Costo de Obra de $${amount_usd.toLocaleString()} imputado exitosamente al proyecto.`);

        }



        closeModal('modalQuickFlow');

        

        // Recargar vistas activas

        loadInitialMasterData();

        loadExecutiveDashboard();



    } catch (e) {

        alert('Error al procesar la carga rápida: ' + e.message);

    }

}



async function loadPartnersWithdrawalsList() {

    const tbody = document.getElementById('partnersWithdrawalsTableBody');

    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #94a3b8; padding: 16px;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando cuenta corriente de socios...</td></tr>`;



    try {

        const token = window.authToken || localStorage.getItem('dalor_token') || null;
        const res = await authFetch(`${API_BASE}/financial/partners/withdrawals`, { headers: token ? { 'Authorization': `Bearer ${token}` } : {} });

        const list = await res.json();
        allPartnersWithdrawalsList = Array.isArray(list) ? list : [];
        renderPartnersWithdrawalsPaginated();
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #e11d48; padding: 16px;">Error al cargar cuenta corriente de socios.</td></tr>`;
    }
}

let allPartnersWithdrawalsList = [];
let partnersCurrentPage = 1;
let partnersPageSize = 15;

function goToPartnersPage(page) {
    partnersCurrentPage = page;
    renderPartnersWithdrawalsPaginated();
    const c = document.getElementById("partnersWithdrawalsTableBody");
    if (c) c.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function changePartnersPageSize(size) {
    partnersPageSize = parseInt(size) || 15;
    partnersCurrentPage = 1;
    renderPartnersWithdrawalsPaginated();
}

function renderPartnersWithdrawalsPaginated() {
    const tbody = document.getElementById('partnersWithdrawalsTableBody');
    if (!tbody) return;

    const list = allPartnersWithdrawalsList || [];
    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #94a3b8; padding: 16px;">No hay retiros de socios registrados.</td></tr>`;
        const pCont = document.getElementById("partnersPaginationContainer");
        if (pCont) pCont.innerHTML = '';
        return;
    }

    const { startIndex, endIndex, currentPage } = (typeof window.renderPaginationControls === 'function' ? window.renderPaginationControls : renderPaginationControls)({
        containerId: "partnersPaginationContainer",
        totalItems: list.length,
        currentPage: partnersCurrentPage,
        pageSize: partnersPageSize,
        onPageChange: "goToPartnersPage",
        onPageSizeChange: "changePartnersPageSize",
        itemLabel: "retiro(s) de socio"
    });
    partnersCurrentPage = currentPage;

    const pageItems = list.slice(startIndex, endIndex);
    tbody.innerHTML = pageItems.map(w => `
        <tr>
            <td style="font-weight: 700; color: #64748b; font-size: 11px;">${w.date}</td>
            <td style="font-weight: 800; color: #7c3aed;">${w.partner_name}</td>
            <td style="font-weight: 600;">${w.concept}</td>
            <td><span style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 11px; text-transform: uppercase;">${w.payment_method}</span></td>
            <td style="color: #64748b; font-size: 11px;">${w.reference_number || '-'}</td>
            <td style="font-weight: 900; color: #7c3aed; font-size: 13px;">$${w.amount_usd.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
            <td style="color: #475569; font-weight: 700;">Bs. ${w.amount_bs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</td>
        </tr>
    `).join('');
}



function openNewPartnerWithdrawalModal() {

    openQuickFlowModal();

    selectQuickType('socio');

}





// --- BLOQUE L11630-L11767 ---
// ==============================================================================

// 💵 6. COBRANZAS & ABONOS DIRECTOS DE CLIENTES

// ==============================================================================



function openReceiveClientPaymentModal() {

    document.getElementById("receiveClientPaymentForm").reset();

    populateSelectDropdowns();

    const rateEl = document.getElementById("rcp_rate");

    if (rateEl) rateEl.value = EXCHANGE_RATE.toFixed(2);

    calcClientPaymentBs();

    openModal("modalReceiveClientPayment");

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

    const amountUsd = parseFloat(document.getElementById("rcp_amount_usd").value) || 0.0;

    const rate = parseFloat(document.getElementById("rcp_rate").value) || EXCHANGE_RATE || 800.0;



    if (!clientId || amountUsd <= 0) {

        alert("Por favor selecciona un cliente y un monto válido.");

        return;

    }



    const payload = {

        client_id: clientId,

        project_id: projId,

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

            loadReceivablesList();

            if (typeof loadTreasurySummary === "function") loadTreasurySummary();

        } else {

            const err = await res.json();

            alert("Error: " + (err.detail || JSON.stringify(err)));

        }

    } catch (e) {

        alert("Error de conexión al registrar cobro: " + e.message);

    }

}





// --- BLOQUE L13705-L13828 ---
// ==============================================================================

// 📄 FACTURACIÓN RÁPIDA 1-CLIC DESDE PROYECTO HACIA CxC

// ==============================================================================

async function openCreateCxCForProject(projId) {

    const pId = projId || window.currentViewingProjectId;

    

    // Cerrar modal de detalle de proyecto si estaba abierto

    closeModal('modalProjectDetail');



    // Asegurar que tengamos la lista de clientes y proyectos actualizada

    if (!allClients || allClients.length === 0) {

        try {

            const resC = await authFetch(`${API_BASE}/clients/`);

            if (resC.ok) allClients = await resC.json();

        } catch(e) {

            console.error("Error loading clients:", e);

        }

    }

    if (!allProjects || allProjects.length === 0) {

        try {

            const resP = await authFetch(`${API_BASE}/projects/`);

            if (resP.ok) allProjects = await resP.json();

        } catch(e) {

            console.error("Error loading projects:", e);

        }

    }



    const safeProjects = (window.allProjects && window.allProjects.length > 0) ? window.allProjects : (allProjects || []);
    const proj = safeProjects.find(p => p.id == pId);

    const contractAmt = parseFloat(proj?.contract_amount_usd) || 0;
    const billedAmt = parseFloat(proj?.total_billed_cxc_usd) || 0;
    const unbilledAmt = Math.max(0, Math.round((contractAmt - billedAmt) * 100) / 100);
    const isFullyBilled = (billedAmt >= contractAmt - 0.05) && (contractAmt > 0);

    if (proj && isFullyBilled) {
        alert(`ℹ️ Esta obra ya cuenta con el 100% de su contrato facturado en Cuentas por Cobrar ($${billedAmt.toLocaleString('en-US', {minimumFractionDigits: 2})} USD de $${contractAmt.toLocaleString('en-US', {minimumFractionDigits: 2})} USD contratados).`);
        return;
    }

    // Cambiar a vista de finanzas y subpestaña de CxC
    switchView('financial', 'finanzas');
    switchFinancialSubtab('cxc');

    // Poblar y abrir modal (AWAIT estricto para asegurar que los selects existan antes de asignar)
    await openNewReceivableModal();

    if (proj) {
        let cid = proj.client_id;
        if (!cid && allClients && allClients.length > 0) {
            const dalorCli = allClients.find(c => (c.name || '').toLowerCase().includes('dalor')) || allClients[0];
            if (dalorCli) cid = dalorCli.id;
        }
        const clientSelect = document.getElementById("cxc_client_id");
        if (clientSelect && cid) {
            clientSelect.value = String(cid);
        }

        const projectSelect = document.getElementById("cxc_project_id");
        if (projectSelect) {
            projectSelect.value = String(proj.id);
        }

        const valIndex = (billedAmt > 0 ? 2 : 1);
        const descInput = document.getElementById("cxc_description");
        if (descInput) {
            descInput.value = `Valuación N° ${valIndex} - [${proj.code}] ${proj.name}`;
        }

        const amtInput = document.getElementById("cxc_amount_usd");
        if (amtInput) {
            const targetAmt = (billedAmt > 0 && unbilledAmt > 0) ? unbilledAmt : (contractAmt || 0);
            amtInput.value = targetAmt.toFixed(2);
            if (document.getElementById("cxc_tax_retained")) {
                document.getElementById("cxc_tax_retained").value = "0.00";
            }
        }

        const invInput = document.getElementById("cxc_invoice_number");
        if (invInput) {
            const randSuffix = Math.floor(10 + Math.random() * 90);
            invInput.value = `VAL-${proj.code}-${String(valIndex).padStart(2, '0')}-${randSuffix}`;
        }

        const toastMsg = (billedAmt > 0)
            ? `📋 Valuación N° ${valIndex} de [${proj.code}]. Se precargó el saldo faltante del contrato: $${unbilledAmt.toLocaleString('en-US', {minimumFractionDigits: 2})} USD.`
            : `📋 Facturación completa de [${proj.code}]. Monto de contrato: $${contractAmt.toLocaleString('en-US', {minimumFractionDigits: 2})} USD.`;
        if (typeof showToastNotification === 'function') {
            showToastNotification(toastMsg, 'info');
        }
    }

}





// --- BLOQUE L15643-L15739 ---
// ==============================================================================

// 🛑 CASTIGO DE CARTERA & GESTIÓN DE DEUDAS INCOBRABLES EN FINANZAS

// ==============================================================================

function openBadDebtModal(recId, invoiceNum, balanceUsd) {

    document.getElementById("bad_debt_cxc_id").value = recId;

    document.getElementById("bad_debt_invoice_title").innerText = `Factura [${invoiceNum}] &bull; Saldo a Castigar: $${parseFloat(balanceUsd).toFixed(2)}`;

    document.getElementById("badDebtForm").reset();

    openModal("modalBadDebt");

}



async function submitBadDebtWriteOff(event) {

    event.preventDefault();

    const cxcId = document.getElementById("bad_debt_cxc_id").value;

    const reason = document.getElementById("bad_debt_reason").value;

    const notes = document.getElementById("bad_debt_notes").value.trim();



    if (!confirm(`¿Confirmas que deseas declarar este saldo como INCOBRABLE / Castigo de Cartera?\n\nEsta acción retirará el saldo vivo de tesorería y lo registrará formalmente como pérdida operativa.`)) {

        return;

    }



    try {

        const res = await authFetch(`${API_BASE}/financial/cxc/${cxcId}/write-off`, {

            method: "POST",

            headers: { "Content-Type": "application/json" },

            body: JSON.stringify({ reason: reason, notes: notes })

        });

        if (!res.ok) {

            const err = await res.json();

            throw new Error(err.detail || "Error al castigar deuda");

        }

        const data = await res.json();

        closeModal("modalBadDebt");

        await loadReceivablesList();

        if (typeof showToastNotification === 'function') {

            showToastNotification(`🛑 Factura [${data.invoice_number}] declarada como Incobrable. Saldo castigado.`, 'success');

        } else {

            alert(`🛑 Factura [${data.invoice_number}] declarada como Incobrable por $${data.bad_debt_amount_usd.toFixed(2)}.`);

        }

    } catch(err) {

        alert("Error al castigar saldo: " + err.message);

    }

}


// Helper para despachar materiales directamente desde la ficha de proyecto
function openMaterialConsumeModalWithProject(projectId) {
    if (typeof openMaterialConsumeModal === 'function') {
        openMaterialConsumeModal();
    } else {
        openModal("modalMaterialConsume");
    }
    const projSel = document.getElementById("mc_project_id");
    if (projSel && projectId) {
        projSel.value = String(projectId);
    }
}



// --- PUENTE DE COMPATIBILIDAD CON WINDOW & HTML INLINE ---
if (typeof window !== 'undefined') {
    window.calcClientPaymentBs = calcClientPaymentBs;
    window.calcQuickBs = calcQuickBs;
    window.loadPartnersWithdrawalsList = loadPartnersWithdrawalsList;
    window.loadPayablesList = loadPayablesList;
    window.loadReceivablesList = loadReceivablesList;
    window.loadTreasurySummary = loadTreasurySummary;
    window.openBadDebtModal = openBadDebtModal;
    window.openCreateCxCForProject = openCreateCxCForProject;
    window.openFinancialSubtab = openFinancialSubtab;
    window.openMaterialConsumeModalWithProject = openMaterialConsumeModalWithProject;
    window.openNewPartnerWithdrawalModal = openNewPartnerWithdrawalModal;
    window.openNewPayableModal = openNewPayableModal;
    window.openNewReceivableModal = openNewReceivableModal;
    window.openQuickFlowModal = openQuickFlowModal;
    window.openReceiveClientPaymentModal = openReceiveClientPaymentModal;
    window.openRecordPaymentModal = openRecordPaymentModal;
    window.selectQuickType = selectQuickType;
    window.submitBadDebtWriteOff = submitBadDebtWriteOff;
    window.submitCreatePayable = submitCreatePayable;
    window.submitCreateReceivable = submitCreateReceivable;
    window.submitDirectClientPayment = submitDirectClientPayment;
    window.submitFinancialPayment = submitFinancialPayment;
    window.submitQuickFlow = submitQuickFlow;
    window.switchFinancialSubtab = switchFinancialSubtab;
    window.openDeclareBadDebtModal = openDeclareBadDebtModal;
    window.submitDeclareBadDebt = submitDeclareBadDebt;
    window.openPayableHistoryModal = openPayableHistoryModal;
    window.goToCxcPage = goToCxcPage;
    window.changeCxcPageSize = changeCxcPageSize;
    window.renderReceivablesPaginated = renderReceivablesPaginated;
    window.goToCxpPage = goToCxpPage;
    window.changeCxpPageSize = changeCxpPageSize;
    window.renderPayablesPaginated = renderPayablesPaginated;
    window.goToTreasuryPage = goToTreasuryPage;
    window.changeTreasuryPageSize = changeTreasuryPageSize;
    window.renderTreasuryTracePaginated = renderTreasuryTracePaginated;
    window.goToPartnersPage = goToPartnersPage;
    window.changePartnersPageSize = changePartnersPageSize;
    window.renderPartnersWithdrawalsPaginated = renderPartnersWithdrawalsPaginated;
    window.setFilterCxc = setFilterCxc;
    window.filterCxcList = filterCxcList;
    window.calcFinTransBsEquiv = calcFinTransBsEquiv;
    window.onFinTransAccountChanged = onFinTransAccountChanged;
    window.openClientRefundModal = openClientRefundModal;
    window.submitClientRefund = submitClientRefund;
    window.openTreasuryExchangeModal = openTreasuryExchangeModal;
    window.onTreasuryExchangeTypeChanged = onTreasuryExchangeTypeChanged;
    window.calcTreasuryExchangeDiff = calcTreasuryExchangeDiff;
    window.submitTreasuryExchange = submitTreasuryExchange;
    window.setCashFlowRange = setCashFlowRange;
    window.loadCashFlowMatrix = loadCashFlowMatrix;
    window.printCashFlowMatrixReport = printCashFlowMatrixReport;
    window.applyTreasuryFilters = applyTreasuryFilters;
    window.resetTreasuryFilters = resetTreasuryFilters;
    window.handleTreasuryPeriodChange = handleTreasuryPeriodChange;
    window.printTreasuryTraceReport = printTreasuryTraceReport;
    window.onCxpSearchInput = onCxpSearchInput;
    window.onCxpDocTypeFilterChange = onCxpDocTypeFilterChange;
    window.applyCxpDateFilter = applyCxpDateFilter;
    window.clearCxpDateFilter = clearCxpDateFilter;
    window.setFilterCxp = setFilterCxp;
    window.onCxpModalDocTypeChange = onCxpModalDocTypeChange;
    window.calcPayablePreview = calcPayablePreview;
    window.openWithholdingVoucherModal = openWithholdingVoucherModal;
    window.printWithholdingVoucher = printWithholdingVoucher;
    window.openEditPayableModal = openEditPayableModal;
    window.submitEditPayable = submitEditPayable;
    window.deletePayablePrompt = deletePayablePrompt;
}

export { calcClientPaymentBs, calcQuickBs, loadPartnersWithdrawalsList, loadPayablesList, loadReceivablesList, loadTreasurySummary, openBadDebtModal, openCreateCxCForProject, openDeclareBadDebtModal, openFinancialSubtab, openMaterialConsumeModalWithProject, openNewPartnerWithdrawalModal, openNewPayableModal, openNewReceivableModal, openPayableHistoryModal, openQuickFlowModal, openReceiveClientPaymentModal, openRecordPaymentModal, selectQuickType, submitBadDebtWriteOff, submitCreatePayable, submitCreateReceivable, submitDeclareBadDebt, submitDirectClientPayment, submitFinancialPayment, submitQuickFlow, switchFinancialSubtab, goToCxcPage, changeCxcPageSize, renderReceivablesPaginated, goToCxpPage, changeCxpPageSize, renderPayablesPaginated, goToTreasuryPage, changeTreasuryPageSize, renderTreasuryTracePaginated, goToPartnersPage, changePartnersPageSize, renderPartnersWithdrawalsPaginated, setFilterCxc, filterCxcList, calcFinTransBsEquiv, onFinTransAccountChanged, openClientRefundModal, submitClientRefund, openTreasuryExchangeModal, onTreasuryExchangeTypeChanged, calcTreasuryExchangeDiff, submitTreasuryExchange, setCashFlowRange, loadCashFlowMatrix, printCashFlowMatrixReport, applyTreasuryFilters, resetTreasuryFilters, handleTreasuryPeriodChange, printTreasuryTraceReport, onCxpSearchInput, onCxpDocTypeFilterChange, applyCxpDateFilter, clearCxpDateFilter, setFilterCxp, onCxpModalDocTypeChange, calcPayablePreview, openWithholdingVoucherModal, printWithholdingVoucher, openEditPayableModal, submitEditPayable, deletePayablePrompt };
