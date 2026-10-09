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

// --- BLOQUE L8039-L8865 ---
// ==============================================================================

// 💰 13. MÓDULO FINANCIERO: SUBTABS (CxC, CxP, TESORERÍA)

// ==============================================================================

function openFinancialSubtab(subtabName) {

    switchView('financial', 'finanzas');

    switchFinancialSubtab(subtabName);

}



function switchFinancialSubtab(subtabName) {
    const user = window.currentUser;
    if (user) {
        let p = {};
        if (typeof user.permissions_json === 'string') {
            try { p = JSON.parse(user.permissions_json); } catch(e) { p = {}; }
        } else if (user.permissions_json && typeof user.permissions_json === 'object') {
            p = user.permissions_json;
        } else if (user.permissions && typeof user.permissions === 'object') {
            p = user.permissions;
        }
        const role = (user.role_name || '').toLowerCase();
        const uname = (user.username || '').toLowerCase();
        const isDirector = uname === 'director' || role.includes('director') || user.is_superuser === true;

        if (!isDirector) {
            const hasGranularFin = p.cxc_view !== undefined || p.cxp_view !== undefined || p.bancos_view !== undefined || p.retiros_view !== undefined;
            const canCxc = p.cxc_view !== undefined ? !!(p.cxc_view || p.cxc_pay) : (hasGranularFin ? false : true);
            const canCxp = p.cxp_view !== undefined ? !!(p.cxp_view || p.cxp_pay) : (hasGranularFin ? false : true);
            const canBancos = p.bancos_view !== undefined ? !!p.bancos_view : (hasGranularFin ? false : true);
            const canPartners = p.retiros_view !== undefined ? !!p.retiros_view : false;

            let validSubtab = 'cxc';
            if (canCxc) validSubtab = 'cxc';
            else if (canCxp) validSubtab = 'cxp';
            else if (canBancos) validSubtab = 'summary';
            else if (canPartners) validSubtab = 'partners';

            const isAllowed = (subtabName === 'cxc' && canCxc) ||
                              (subtabName === 'cxp' && canCxp) ||
                              (subtabName === 'summary' && canBancos) ||
                              (subtabName === 'partners' && canPartners);
            if (!isAllowed) {
                subtabName = validSubtab;
            }
        }
    }

    try { 
        sessionStorage.setItem('dalor_active_subtab_financial', subtabName); 
        localStorage.setItem('dalor_active_subtab_financial', subtabName); 
    } catch(e) {}

    const subtabs = ['cxc', 'cxp', 'summary', 'partners', 'fiscal'];

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
    if (subtabName === 'fiscal') loadFiscalBooksView();
}



// ----------------------------------------------------

// CUENTAS POR COBRAR (CxC)

// ----------------------------------------------------

let allReceivablesList = [];
let cxcCurrentPage = 1;
let cxcPageSize = 10;

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

        const safeClientName = (r.client_name || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
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
        actionsHtml = bitacoraBtn + ' ' + actionsHtml;

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



    // Reset de campos para evitar datos residuales
    const amtInput = document.getElementById("cxc_amount_usd");
    if (amtInput) amtInput.value = "";
    const descInput = document.getElementById("cxc_description");
    if (descInput) descInput.value = "";
    const taxRet = document.getElementById("cxc_tax_retained");
    if (taxRet) taxRet.value = "0.00";

    populateSelect("cxc_client_id", [{id: '', name: '-- Seleccionar Cliente --'}, ...(allClients || [])], c => `<option value="${c.id}">${c.name} ${c.rif ? '(' + c.rif + ')' : ''}</option>`);

    const clientSelect = document.getElementById("cxc_client_id");
    if (clientSelect) {
        clientSelect.value = "";
        clientSelect.onchange = function() {
            onCxcClientChanged();
        };
    }

    const projSelect = document.getElementById("cxc_project_id");
    if (projSelect) {
        projSelect.innerHTML = '<option value="">-- Selecciona primero un cliente --</option>';
        projSelect.disabled = true;
        projSelect.onchange = function() {
            onCxcProjectChanged();
        };
    }

    // Correlativo consecutivo oficial
    try {
        const resCode = await authFetch(`${API_BASE}/financial/next-invoice-code?prefix=FAC`);
        if (resCode.ok) {
            const dataCode = await resCode.json();
            const invInp = document.getElementById("cxc_invoice_number");
            if (invInp && (!invInp.value || invInp.value.startsWith('FAC-'))) {
                invInp.value = dataCode.next_code;
            }
        }
    } catch(e) {
        console.warn("Error fetching next invoice code:", e);
    }

    // Inicializar estado del selector de obras
    onCxcClientChanged();

    // Fecha de vencimiento a 15 días
    const d = new Date();
    d.setDate(d.getDate() + 15);
    const dueDateInput = document.getElementById("cxc_due_date");
    if (dueDateInput) dueDateInput.value = d.toISOString().split('T')[0];

    openModal("modalReceivable");
}

function onCxcClientChanged() {
    const clientSel = document.getElementById("cxc_client_id");
    const projSel = document.getElementById("cxc_project_id");
    const amtInput = document.getElementById("cxc_amount_usd");
    const descInput = document.getElementById("cxc_description");
    const submitBtn = document.querySelector('#receivableForm button[type="submit"]');
    if (!clientSel || !projSel) return;

    // Resetear siempre monto y concepto al cambiar o deseleccionar cliente
    if (amtInput) amtInput.value = "";
    if (descInput) descInput.value = "";

    const clientId = clientSel.value;
    const safeProjects = (window.allProjects && window.allProjects.length > 0) ? window.allProjects : (allProjects || []);
    
    // FILTRO ESTRICTO: Solo mostrar proyectos del cliente con saldo activo pendiente por facturar (> $0.05)
    const clientProjects = safeProjects.filter(p => {
        if (String(p.client_id) !== String(clientId)) return false;
        const contract = parseFloat(p.contract_amount_usd) || 0;
        const billed = parseFloat(p.total_billed_cxc_usd) || 0;
        const unbilled = Math.max(0, contract - billed);
        return unbilled > 0.05;
    });

    const warnElId = "cxc_no_project_warn";
    let warnEl = document.getElementById(warnElId);

    if (!clientId) {
        projSel.innerHTML = '<option value="">-- Selecciona primero un cliente --</option>';
        projSel.disabled = true;
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.style.opacity = '0.5';
            submitBtn.style.cursor = 'not-allowed';
        }
        if (warnEl) warnEl.remove();
        return;
    }

    projSel.disabled = false;

    if (clientProjects.length === 0) {
        projSel.innerHTML = '<option value="" disabled selected>⚠️ Este cliente no posee obras con saldo pendiente por facturar</option>';
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.style.opacity = '0.5';
            submitBtn.style.cursor = 'not-allowed';
        }
        if (!warnEl) {
            warnEl = document.createElement("div");
            warnEl.id = warnElId;
            warnEl.style.cssText = "font-size: 11.5px; color: #dc2626; font-weight: 700; background: #fef2f2; border: 1px solid #fecaca; padding: 6px 10px; border-radius: 6px; margin-top: 4px;";
            warnEl.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Este cliente no tiene proyectos con saldo disponible por facturar (contratos 100% facturados o sin obras registradas).';
            projSel.parentNode.appendChild(warnEl);
        }
    } else {
        if (warnEl) warnEl.remove();
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.style.opacity = '1';
            submitBtn.style.cursor = 'pointer';
        }
        let opts = `<option value="">-- Seleccionar Obra (${clientProjects.length} con saldo por facturar) --</option>`;
        opts += clientProjects.map(p => {
            const unbilled = Math.max(0, (parseFloat(p.contract_amount_usd) || 0) - (parseFloat(p.total_billed_cxc_usd) || 0));
            return `<option value="${p.id}">[${p.code}] ${p.name} (Por facturar: $${unbilled.toFixed(2)})</option>`;
        }).join('');
        projSel.innerHTML = opts;
        if (clientProjects.length === 1) {
            projSel.value = String(clientProjects[0].id);
            onCxcProjectChanged();
        }
    }
}

function onCxcProjectChanged() {
    const projSel = document.getElementById("cxc_project_id");
    const amtInput = document.getElementById("cxc_amount_usd");
    const descInput = document.getElementById("cxc_description");
    const pId = projSel?.value;

    if (!pId) {
        if (amtInput) amtInput.value = "";
        if (descInput) descInput.value = "";
        return;
    }

    const safeProjects = (window.allProjects && window.allProjects.length > 0) ? window.allProjects : (allProjects || []);
    const proj = safeProjects.find(p => String(p.id) === String(pId));
    if (proj) {
        const unbilled = Math.max(0, (parseFloat(proj.contract_amount_usd) || 0) - (parseFloat(proj.total_billed_cxc_usd) || 0));
        if (amtInput) {
            amtInput.value = (unbilled > 0 ? unbilled : (parseFloat(proj.contract_amount_usd) || 0)).toFixed(2);
        }
        if (descInput) {
            descInput.value = `Valuación de Obra - [${proj.code}] ${proj.name}`;
        }
    }
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
// BITÁCORA Y TRAZABILIDAD DE COBRANZA (CxC)
// ----------------------------------------------------

let currentCxcHistoryContext = {
    receivableId: null,
    clientId: null,
    invoiceNum: '',
    clientName: '',
    currentScope: 'invoice',
    totalUsd: 0,
    paidUsd: 0,
    balUsd: 0,
    status: 'pendiente'
};



function openCxcHistoryModal(recId, clientId, invoiceNum, clientName) {
    const item = (allReceivablesList || []).find(x => x.id === recId) || {};
    const inv = invoiceNum || item.invoice_number || 'S/F';
    const cName = clientName || item.client_name || 'Cliente';
    const totalUsd = Number(item.amount_usd || 0);
    const paidUsd = Number(item.paid_amount_usd || 0);
    const balUsd = Number(item.balance_usd || 0);
    const status = item.status || 'pendiente';
    const actualClientId = clientId || item.client_id || null;

    currentCxcHistoryContext = {
        receivableId: recId,
        clientId: actualClientId,
        invoiceNum: inv,
        clientName: cName,
        currentScope: 'invoice',
        totalUsd: totalUsd,
        paidUsd: paidUsd,
        balUsd: balUsd,
        status: status
    };

    // Subtitle & Header
    const subTitleEl = document.getElementById("cxc_history_subtitle");
    if (subTitleEl) {
        subTitleEl.innerHTML = `Factura <b>[${inv}]</b> &bull; Cliente: <b>${cName}</b>`;
    }

    // Hidden form inputs
    const recIdInput = document.getElementById("cxc_follow_rec_id");
    if (recIdInput) recIdInput.value = recId || '';

    const clientIdInput = document.getElementById("cxc_follow_client_id");
    if (clientIdInput) clientIdInput.value = actualClientId || '';

    // Clear form inputs
    const contactInput = document.getElementById("cxc_follow_contact");
    if (contactInput) contactInput.value = '';

    const dateInput = document.getElementById("cxc_follow_prom_date");
    if (dateInput) dateInput.value = '';

    const amountInput = document.getElementById("cxc_follow_prom_amount");
    if (amountInput) amountInput.value = '';

    const notesInput = document.getElementById("cxc_follow_notes");
    if (notesInput) notesInput.value = '';

    // Reset evidence file
    clearCxcEvidenceFile();
    const evidenceFileInput = document.getElementById("cxc_follow_evidence_file");
    if (evidenceFileInput && !evidenceFileInput._hasEventListener) {
        evidenceFileInput._hasEventListener = true;
        evidenceFileInput.addEventListener("change", function () {
            const badge = document.getElementById("cxc_follow_evidence_badge");
            const btnClear = document.getElementById("cxc_btn_clear_evidence");
            const status = document.getElementById("cxc_follow_evidence_status");
            if (this.files && this.files.length > 0) {
                const f = this.files[0];
                const sizeKb = (f.size / 1024).toFixed(1);
                if (badge) badge.style.display = "inline-flex";
                if (btnClear) btnClear.style.display = "inline-block";
                if (status) {
                    status.style.display = "block";
                    status.style.color = "#0369a1";
                    status.innerHTML = `<i class="fa-solid fa-file-arrow-up"></i> ${f.name} (${sizeKb} KB) listo para respaldo en R2`;
                }
            } else {
                clearCxcEvidenceFile();
            }
        });
    }

    // Summary cards
    updateCxcHistorySummaryCards();

    // Reset scope buttons UI
    updateCxcScopeButtonsUI('invoice');

    // Reset gestion form to collapsed state
    toggleCxcGestionForm(false);

    // Load data
    loadCxcTimelineData();

    openModal("modalCxcHistory");
}

function toggleCxcGestionForm(forceOpen = null) {
    const container = document.getElementById("cxc_gestion_form_container");
    const btn = document.getElementById("btn_toggle_cxc_gestion");
    if (!container) return;

    const isHidden = container.style.display === "none";
    const shouldOpen = forceOpen !== null ? forceOpen : isHidden;

    if (shouldOpen) {
        container.style.display = "block";
        if (btn) {
            btn.innerHTML = `<i class="fa-solid fa-chevron-up"></i> Ocultar Formulario de Gestión`;
            btn.className = "btn-secondary";
            btn.style.background = "#e2e8f0";
            btn.style.color = "#1e293b";
        }
        const notesInp = document.getElementById("cxc_follow_notes");
        if (notesInp) notesInp.focus();
    } else {
        container.style.display = "none";
        if (btn) {
            btn.innerHTML = `<i class="fa-solid fa-plus-circle"></i> Registrar Nueva Gestión / Contacto`;
            btn.className = "btn-primary";
            btn.style.background = "#2563eb";
            btn.style.color = "#ffffff";
        }
    }
}

function updateCxcHistorySummaryCards() {
    const totalEl = document.getElementById("cxc_hist_total_usd");
    const paidEl = document.getElementById("cxc_hist_paid_usd");
    const balEl = document.getElementById("cxc_hist_balance_usd");
    const statusEl = document.getElementById("cxc_hist_status_badge");

    if (totalEl) totalEl.textContent = `$${(currentCxcHistoryContext.totalUsd || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (paidEl) paidEl.textContent = `$${(currentCxcHistoryContext.paidUsd || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (balEl) balEl.textContent = `$${(currentCxcHistoryContext.balUsd || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    if (statusEl) {
        const isBad = currentCxcHistoryContext.status === 'incobrable' || currentCxcHistoryContext.status === 'castigada';
        const isPaid = (currentCxcHistoryContext.balUsd || 0) <= 0.01;
        if (isBad) {
            statusEl.innerHTML = `<span style="background: #fee2e2; color: #dc2626; padding: 2px 8px; border-radius: 4px; border: 1px solid #fca5a5;">INCOBRABLE</span>`;
        } else if (isPaid) {
            statusEl.innerHTML = `<span style="background: #dcfce7; color: #16a34a; padding: 2px 8px; border-radius: 4px; border: 1px solid #86efac;">PAGADA</span>`;
        } else {
            statusEl.innerHTML = `<span style="background: #fef3c7; color: #d97706; padding: 2px 8px; border-radius: 4px; border: 1px solid #fcd34d;">PENDIENTE</span>`;
        }
    }
}

function updateCxcScopeButtonsUI(scope) {
    const btnInvoice = document.getElementById("btn_cxc_scope_invoice");
    const btnClient = document.getElementById("btn_cxc_scope_client");

    if (scope === 'invoice') {
        if (btnInvoice) {
            btnInvoice.className = "btn-primary";
            btnInvoice.style.background = "#2563eb";
            btnInvoice.style.color = "#ffffff";
        }
        if (btnClient) {
            btnClient.className = "btn-secondary";
            btnClient.style.background = "#f1f5f9";
            btnClient.style.color = "#475569";
        }
    } else {
        if (btnClient) {
            btnClient.className = "btn-primary";
            btnClient.style.background = "#2563eb";
            btnClient.style.color = "#ffffff";
        }
        if (btnInvoice) {
            btnInvoice.className = "btn-secondary";
            btnInvoice.style.background = "#f1f5f9";
            btnInvoice.style.color = "#475569";
        }
    }
}

function switchCxcHistoryScope(scope) {
    currentCxcHistoryContext.currentScope = scope;
    updateCxcScopeButtonsUI(scope);
    loadCxcTimelineData();
}

async function loadCxcTimelineData() {
    const container = document.getElementById("cxc_timeline_container");
    const countEl = document.getElementById("cxc_history_count");
    if (!container) return;

    container.innerHTML = `
        <div style="text-align: center; padding: 24px; color: #64748b;">
            <i class="fa-solid fa-spinner fa-spin" style="font-size: 20px; color: #2563eb; margin-bottom: 8px;"></i>
            <div style="font-size: 12px; font-weight: 600;">Cargando bitácora y movimientos de cobranza...</div>
        </div>`;

    const scope = currentCxcHistoryContext.currentScope;
    let url = '';
    if (scope === 'client' && currentCxcHistoryContext.clientId) {
        url = `${API_BASE}/financial/cxc/client/${currentCxcHistoryContext.clientId}/timeline`;
    } else if (currentCxcHistoryContext.receivableId) {
        url = `${API_BASE}/financial/cxc/${currentCxcHistoryContext.receivableId}/timeline`;
    } else if (currentCxcHistoryContext.clientId) {
        url = `${API_BASE}/financial/cxc/client/${currentCxcHistoryContext.clientId}/timeline`;
    }

    if (!url) {
        container.innerHTML = `<div style="text-align: center; padding: 16px; color: #94a3b8; font-size: 12px;">No se especificó factura o cliente válido.</div>`;
        return;
    }

    try {
        const res = await authFetch(url);
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.detail || "Error al obtener cronología de cobranza");
        }
        const data = await res.json();
        const timeline = data.timeline || [];
        if (countEl) countEl.textContent = `${timeline.length} registro${timeline.length === 1 ? '' : 's'}`;
        renderCxcTimelineList(timeline);
    } catch (err) {
        console.error("Error loading CxC timeline:", err);
        container.innerHTML = `
            <div style="background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; padding: 12px; border-radius: 6px; font-size: 12px; text-align: center;">
                <i class="fa-solid fa-triangle-exclamation"></i> Error al cargar bitácora: ${err.message}
            </div>`;
    }
}

function renderCxcTimelineList(events) {
    const container = document.getElementById("cxc_timeline_container");
    if (!container) return;

    if (!events || events.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 32px 16px; color: #94a3b8; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px;">
                <i class="fa-regular fa-folder-open" style="font-size: 28px; margin-bottom: 8px; color: #cbd5e1;"></i>
                <div style="font-size: 12px; font-weight: 700; color: #64748b;">No hay gestiones ni movimientos registrados aún</div>
                <div style="font-size: 11px; color: #94a3b8; margin-top: 3px;">Usa el formulario superior para registrar la primera llamada, mensaje o acuerdo con el cliente.</div>
            </div>`;
        return;
    }

    const eventIcons = {
        'facturacion': { icon: 'fa-file-invoice-dollar', bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8', badgeBg: '#dbeafe', badgeColor: '#1e40af' },
        'pago': { icon: 'fa-circle-check', bg: '#ecfdf5', border: '#a7f3d0', text: '#047857', badgeBg: '#d1fae5', badgeColor: '#065f46' },
        'gestion_cobranza': { icon: 'fa-headset', bg: '#faf5ff', border: '#e9d5ff', text: '#7e22ce', badgeBg: '#f3e8ff', badgeColor: '#6b21a8' },
        'castigo_incobrable': { icon: 'fa-ban', bg: '#fef2f2', border: '#fecaca', text: '#b91c1c', badgeBg: '#fee2e2', badgeColor: '#991b1b' },
        'reembolso': { icon: 'fa-arrow-rotate-left', bg: '#f0fdf4', border: '#bbf7d0', text: '#15803d', badgeBg: '#dcfce7', badgeColor: '#166534' }
    };

    function formatDateTimeClean(rawStr) {
        if (!rawStr || rawStr === '-' || rawStr === 'S/F' || rawStr === 'Reciente') return rawStr || '-';
        const str = String(rawStr).trim();
        let datePart = '';
        let timePart = '';

        if (str.includes('T')) {
            const parts = str.split('T');
            datePart = parts[0];
            timePart = (parts[1] || '').split('.')[0].slice(0, 5); // HH:MM
        } else if (str.includes(' ')) {
            const parts = str.split(' ');
            datePart = parts[0];
            timePart = (parts[1] || '').split('.')[0].slice(0, 5); // HH:MM
        } else {
            datePart = str;
        }

        if (datePart && datePart.includes('-')) {
            const dp = datePart.split('-');
            if (dp.length === 3 && dp[0].length === 4) {
                datePart = `${dp[2]}/${dp[1]}/${dp[0]}`;
            }
        }

        if (timePart) {
            return `${datePart} ${timePart}`;
        }
        return datePart || '-';
    }

    const html = events.map(ev => {
        const theme = eventIcons[ev.type] || { icon: 'fa-circle-dot', bg: '#f8fafc', border: '#e2e8f0', text: '#334155', badgeBg: '#e2e8f0', badgeColor: '#1e293b' };
        
        let metaHtml = '';
        if (ev.type === 'facturacion' || ev.type === 'factura_emitida') {
            metaHtml = `
                <div style="display: flex; gap: 12px; font-size: 11px; margin-top: 4px; color: #475569;">
                    <span><b>Emisión:</b> ${formatDateTimeClean(ev.date)}</span>
                    ${ev.amount_usd ? `<span><b>Monto Facturado:</b> <span style="color: #047857; font-weight: 700;">$${Number(ev.amount_usd).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></span>` : ''}
                    ${ev.invoice_number ? `<span><b>Factura:</b> <span style="font-family: monospace; font-weight: 700;">${ev.invoice_number}</span></span>` : ''}
                </div>`;
        } else if (ev.type === 'pago' || ev.type === 'abono_pago') {
            metaHtml = `
                <div style="display: flex; flex-wrap: wrap; gap: 10px; font-size: 11px; margin-top: 4px; color: #475569;">
                    <span><b>Fecha Pago:</b> ${formatDateTimeClean(ev.date)}</span>
                    <span><b>Abono:</b> <span style="color: #059669; font-weight: 800;">+$${Number(ev.amount_usd || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></span>
                    ${ev.payment_method ? `<span><b>Método:</b> <span style="text-transform: capitalize;">${ev.payment_method.replace('_', ' ')}</span></span>` : ''}
                    ${ev.reference ? `<span><b>Ref:</b> <span style="font-family: monospace;">${ev.reference}</span></span>` : ''}
                    ${ev.balance_after_usd !== undefined ? `<span><b>Saldo Restante:</b> <span style="color: #dc2626; font-weight: 700;">$${Number(ev.balance_after_usd).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></span>` : ''}
                </div>`;
        } else if (ev.type === 'gestion_cobranza') {
            const hasPromise = !!(ev.promised_payment_date || ev.promised_amount_usd);
            const promiseBadge = hasPromise ? `
                <div style="margin-top: 6px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 4px 8px; font-size: 11px; color: #92400e; display: inline-flex; align-items: center; gap: 6px; font-weight: 700;">
                    <i class="fa-regular fa-calendar-check" style="color: #d97706;"></i>
                    <span>Compromiso de Pago: ${ev.promised_payment_date ? '<b>' + formatDateTimeClean(ev.promised_payment_date) + '</b>' : ''} ${ev.promised_amount_usd ? '&bull; <b>$' + Number(ev.promised_amount_usd).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' USD</b>' : ''}</span>
                </div>` : '';

            metaHtml = `
                <div style="display: flex; flex-wrap: wrap; gap: 8px; font-size: 11px; margin-top: 4px; color: #475569;">
                    ${ev.channel ? `<span style="background: #f1f5f9; padding: 1px 6px; border-radius: 4px; font-weight: 600;"><i class="fa-solid fa-tag"></i> ${ev.channel}</span>` : ''}
                    ${ev.contact_person ? `<span><b>Contacto:</b> ${ev.contact_person}</span>` : ''}
                    ${ev.invoice_number ? `<span><b>Factura:</b> <span style="font-family: monospace; font-weight: 700;">${ev.invoice_number}</span></span>` : ''}
                </div>
                ${promiseBadge}`;
        } else if (ev.type === 'castigo_incobrable' || ev.type === 'incobrable') {
            metaHtml = `
                <div style="font-size: 11px; margin-top: 4px; color: #991b1b;">
                    <span><b>Fecha de Declaración:</b> ${formatDateTimeClean(ev.date)}</span>
                    ${ev.amount_usd ? ` &bull; <span><b>Monto Castigado:</b> <span style="font-weight: 800;">$${Number(ev.amount_usd).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></span>` : ''}
                </div>`;
        }

        const dateStr = formatDateTimeClean(ev.date || ev.created_at);
        const userBadge = ev.user ? `<span style="font-size: 10px; color: #64748b; background: #f8fafc; border: 1px solid #e2e8f0; padding: 1px 6px; border-radius: 9999px;"><i class="fa-solid fa-user-check"></i> ${ev.user}</span>` : '';

        return `
        <div style="background: ${theme.bg}; border: 1px solid ${theme.border}; border-radius: 8px; padding: 10px 12px; position: relative;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <div style="width: 26px; height: 26px; border-radius: 50%; background: #ffffff; border: 1.5px solid ${theme.border}; display: flex; align-items: center; justify-content: center; color: ${theme.text}; font-size: 12px; flex-shrink: 0;">
                        <i class="fa-solid ${theme.icon}"></i>
                    </div>
                    <div>
                        <div style="font-size: 12.5px; font-weight: 800; color: #0f172a;">${ev.title || 'Evento de Cobranza'}</div>
                        <div style="font-size: 10.5px; color: #64748b;">${dateStr}</div>
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 6px;">
                    <span style="font-size: 9.5px; font-weight: 800; text-transform: uppercase; background: ${theme.badgeBg}; color: ${theme.badgeColor}; padding: 2px 6px; border-radius: 4px;">
                        ${ev.type.replace('_', ' ')}
                    </span>
                    ${userBadge}
                </div>
            </div>

            ${metaHtml}

            ${ev.description || ev.notes ? `
            <div style="margin-top: 6px; font-size: 11.5px; color: #334155; line-height: 1.4; background: rgba(255,255,255,0.7); border-radius: 6px; padding: 6px 8px; border: 1px dashed ${theme.border};">
                ${ev.notes || ev.description}
            </div>` : ''}

            ${ev.evidence_image_path ? `
            <div style="margin-top: 8px; display: flex; align-items: center; gap: 8px;">
                <button type="button" onclick="viewCxcEvidence(this.getAttribute('data-url'))" 
                   data-url="${ev.evidence_image_path}"
                   style="display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; color: #1d4ed8; background: #eff6ff; border: 1px solid #bfdbfe; padding: 5px 12px; border-radius: 6px; cursor: pointer; transition: all 0.2s;"
                   onmouseover="this.style.background='#dbeafe'" onmouseout="this.style.background='#eff6ff'">
                    <i class="fa-solid fa-paperclip"></i>
                    <span>Ver Evidencia / Soporte Digital</span>
                    <i class="fa-solid fa-arrow-up-right-from-square" style="font-size: 9.5px;"></i>
                </button>
                <span style="font-size: 10px; color: #64748b; display: inline-flex; align-items: center; gap: 4px;">
                    <i class="fa-solid fa-cloud" style="color: #0284c7;"></i> Respaldo R2
                </span>
            </div>` : ''}
        </div>`;
    }).join('');

    container.innerHTML = html;
}

function viewCxcEvidence(url) {
    if (!url) return alert("No hay soporte digital asociado.");

    let modal = document.getElementById("modalImageViewer");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "modalImageViewer";
        modal.className = "modal-overlay hidden";
        modal.style.zIndex = "9999";
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 800px; max-height: 90vh; display: flex; flex-direction: column; padding: 16px; background: #fff; border-radius: 8px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.3);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">
                    <h3 style="font-size: 14px; font-weight: 800; color: #002B49; margin: 0; display: flex; align-items: center; gap: 8px;">
                        <i class="fa-solid fa-file-invoice" style="color: #0284c7;"></i> <span>Soporte Digital / Evidencia de Cobranza</span>
                    </h3>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <a id="imgViewerDownloadBtn" href="#" download="evidencia_cxc" class="btn-secondary" style="font-size: 11px; padding: 4px 10px; text-decoration: none; display: inline-flex; align-items: center; gap: 5px;">
                            <i class="fa-solid fa-download"></i> Descargar
                        </a>
                        <button type="button" onclick="closeModal('modalImageViewer')" style="background: none; border: none; font-size: 22px; color: #64748b; cursor: pointer; line-height: 1;">&times;</button>
                    </div>
                </div>
                <div style="flex: 1; overflow: auto; text-align: center; background: #0f172a; border-radius: 6px; padding: 12px; min-height: 400px; display: flex; align-items: center; justify-content: center;">
                    <img id="imgViewerContent" src="" style="max-width: 100%; max-height: 72vh; object-fit: contain; border-radius: 4px;" alt="Evidencia de Cobranza">
                    <iframe id="pdfViewerContent" src="" style="width: 100%; height: 72vh; border: none; display: none;"></iframe>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    const imgEl = document.getElementById("imgViewerContent");
    const pdfEl = document.getElementById("pdfViewerContent");
    const downloadBtn = document.getElementById("imgViewerDownloadBtn");

    if (downloadBtn) {
        downloadBtn.href = url;
    }

    if (url.startsWith("data:application/pdf") || url.toLowerCase().includes(".pdf")) {
        if (imgEl) imgEl.style.display = "none";
        if (pdfEl) {
            pdfEl.style.display = "block";
            pdfEl.src = url;
        }
    } else {
        if (pdfEl) pdfEl.style.display = "none";
        if (imgEl) {
            imgEl.style.display = "block";
            imgEl.src = url;
        }
    }

    if (typeof openModal === 'function') {
        openModal("modalImageViewer");
    } else {
        modal.classList.remove("hidden");
    }
}
window.viewCxcEvidence = viewCxcEvidence;

function clearCxcEvidenceFile() {
    const fileInp = document.getElementById("cxc_follow_evidence_file");
    const badge = document.getElementById("cxc_follow_evidence_badge");
    const btnClear = document.getElementById("cxc_btn_clear_evidence");
    const status = document.getElementById("cxc_follow_evidence_status");
    if (fileInp) fileInp.value = "";
    if (badge) badge.style.display = "none";
    if (btnClear) btnClear.style.display = "none";
    if (status) {
        status.textContent = "";
        status.style.display = "none";
    }
}

async function submitCxcFollowUpLog(e) {
    if (e && e.preventDefault) e.preventDefault();

    const btnSubmit = document.getElementById("btnSubmitCxcFollowUp");
    const recId = document.getElementById("cxc_follow_rec_id")?.value;
    const clientId = document.getElementById("cxc_follow_client_id")?.value;
    const channel = document.getElementById("cxc_follow_channel")?.value || "Llamada Telefónica";
    const contact = document.getElementById("cxc_follow_contact")?.value?.trim() || null;
    const promDate = document.getElementById("cxc_follow_prom_date")?.value || null;
    const promAmountStr = document.getElementById("cxc_follow_prom_amount")?.value?.trim();
    const promAmount = promAmountStr ? parseFloat(promAmountStr) : null;
    const notes = document.getElementById("cxc_follow_notes")?.value?.trim();
    const evidenceFileInput = document.getElementById("cxc_follow_evidence_file");
    const statusDiv = document.getElementById("cxc_follow_evidence_status");

    if (!notes) {
        alert("Por favor ingresa la minuta o detalle de la gestión realizada.");
        return;
    }

    let url = '';
    if (recId) {
        url = `${API_BASE}/financial/cxc/${recId}/log`;
    } else if (clientId) {
        url = `${API_BASE}/financial/cxc/client/${clientId}/log`;
    } else {
        alert("No se pudo determinar la cuenta por cobrar o cliente objetivo.");
        return;
    }

    try {
        if (btnSubmit) {
            btnSubmit.disabled = true;
            btnSubmit.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Guardando...`;
        }

        let uploadedEvidenceUrl = null;

        // 1. Si hay archivo de evidencia seleccionado, subir a Cloudflare R2 primero
        if (evidenceFileInput && evidenceFileInput.files && evidenceFileInput.files.length > 0) {
            const file = evidenceFileInput.files[0];
            if (statusDiv) {
                statusDiv.style.display = "block";
                statusDiv.style.color = "#2563eb";
                statusDiv.innerHTML = `<i class="fa-solid fa-cloud-arrow-up fa-fade"></i> Subiendo soporte a Cloudflare R2...`;
            }
            if (btnSubmit) {
                btnSubmit.innerHTML = `<i class="fa-solid fa-cloud-arrow-up fa-spin"></i> Subiendo a R2...`;
            }

            const formData = new FormData();
            formData.append("file", file);

            const uploadRes = await authFetch(`${API_BASE}/financial/cxc/upload-evidence`, {
                method: "POST",
                body: formData
            });

            const uploadData = await uploadRes.json();
            if (!uploadRes.ok) {
                throw new Error(uploadData.detail || "Error subiendo evidencia digital a R2");
            }

            uploadedEvidenceUrl = uploadData.evidence_url;
            if (statusDiv) {
                statusDiv.style.color = "#16a34a";
                statusDiv.innerHTML = `<i class="fa-solid fa-circle-check"></i> Archivo respaldado con éxito en R2.`;
            }
        }

        if (btnSubmit) {
            btnSubmit.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Registrando gestión...`;
        }

        const payload = {
            contact_channel: channel,
            contact_person: contact,
            promised_payment_date: promDate,
            promised_amount_usd: promAmount,
            notes: notes,
            evidence_image_path: uploadedEvidenceUrl
        };

        const res = await authFetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.detail || data.error || "Error al guardar gestión de cobranza");
        }

        // Reset form inputs & clear evidence file
        const notesInput = document.getElementById("cxc_follow_notes");
        if (notesInput) notesInput.value = '';
        const promDateInput = document.getElementById("cxc_follow_prom_date");
        if (promDateInput) promDateInput.value = '';
        const promAmountInput = document.getElementById("cxc_follow_prom_amount");
        if (promAmountInput) promAmountInput.value = '';
        clearCxcEvidenceFile();
        toggleCxcGestionForm(false);

        if (typeof showToastNotification === 'function') {
            showToastNotification("✅ Gestión de cobranza guardada en la bitácora con éxito.", "success");
        } else {
            alert("✅ Gestión de cobranza guardada en la bitácora con éxito.");
        }

        // Refresh timeline
        await loadCxcTimelineData();
    } catch (err) {
        console.error("Error submitting CxC log:", err);
        alert("Error: " + err.message);
    } finally {
        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = `<i class="fa-solid fa-plus-circle"></i> Guardar Gestión en Bitácora`;
        }
    }
}

// ----------------------------------------------------
// REGISTRO DE COBRO O PAGO
// ----------------------------------------------------


// --- BLOQUE L11630-L11767 ---
// ==============================================================================

// 💵 6. COBRANZAS & ABONOS DIRECTOS DE CLIENTES

// ==============================================================================



async function openReceiveClientPaymentModal() {
    const form = document.getElementById("receiveClientPaymentForm");
    if (form) form.reset();

    populateSelectDropdowns();

    if (!window.allProjects || window.allProjects.length === 0) {
        try {
            const resP = await authFetch(`${API_BASE}/projects/`);
            if (resP.ok) {
                window.allProjects = await resP.json();
            }
        } catch(e) {
            console.error("Error fetching projects for payment modal:", e);
        }
    }

    const projSel = document.getElementById("rcp_project_id");
    if (projSel) {
        projSel.innerHTML = `<option value="">-- Sin Proyecto Específico (Anticipo a Cuenta) --</option>`;
    }

    // Cargar cuentas financieras en el selector de destino
    const accSel = document.getElementById("rcp_financial_account_id");
    if (accSel) {
        accSel.innerHTML = `<option value="">-- Por Defecto según Método --</option>`;
        try {
            const accRes = await authFetch(`${API_BASE}/financial/accounts`);
            if (accRes.ok) {
                const accounts = await accRes.json();
                accounts.forEach(a => {
                    const opt = document.createElement("option");
                    opt.value = a.id;
                    opt.textContent = `${a.account_name} (${a.currency.toUpperCase()})`;
                    accSel.appendChild(opt);
                });
            }
        } catch(e) {}
    }

    const rateEl = document.getElementById("rcp_rate");
    if (rateEl) rateEl.value = (typeof EXCHANGE_RATE !== 'undefined' ? EXCHANGE_RATE : 850.0).toFixed(2);

    calcClientPaymentBs();
    openModal("modalReceiveClientPayment");
}

async function onRcpClientChanged() {
    const clientSelect = document.getElementById("rcp_client_id");
    const projSelect = document.getElementById("rcp_project_id");
    if (!projSelect) return;

    const clientId = parseInt(clientSelect?.value);
    if (!clientId) {
        projSelect.innerHTML = `<option value="">-- Sin Proyecto Específico (Anticipo a Cuenta) --</option>`;
        return;
    }

    let allProjs = (window.allProjects && window.allProjects.length > 0) ? window.allProjects : ((typeof State !== 'undefined' && Array.isArray(State.projects) && State.projects.length > 0) ? State.projects : []);

    if (allProjs.length === 0) {
        try {
            const resP = await authFetch(`${API_BASE}/projects/`);
            if (resP.ok) {
                allProjs = window.allProjects = await resP.json();
            }
        } catch(e) {
            console.error("Error fetching projects on client change:", e);
        }
    }

    const clientProjects = allProjs.filter(p => {
        const pCliId = p.client_id || (p.client && p.client.id);
        const st = (p.status || '').toLowerCase();
        return pCliId === clientId && st !== 'cancelado' && st !== 'cerrado';
    });

    if (clientProjects.length === 0) {
        projSelect.innerHTML = `<option value="">-- Sin Obras Activas (Anticipo a Cuenta) --</option>`;
    } else {
        projSelect.innerHTML = `<option value="">-- Sin Proyecto Específico (Anticipo a Cuenta) --</option>` +
            clientProjects.map(p => `<option value="${p.id}">[${p.code}] ${p.name}</option>`).join('');
    }
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
    const accIdVal = document.getElementById("rcp_financial_account_id")?.value;
    const finAccId = accIdVal ? parseInt(accIdVal) : null;
    const amountUsd = parseFloat(document.getElementById("rcp_amount_usd").value) || 0.0;
    const rate = parseFloat(document.getElementById("rcp_rate").value) || EXCHANGE_RATE || 800.0;

    if (!clientId || amountUsd <= 0) {
        alert("Por favor selecciona un cliente y un monto válido.");
        return;
    }

    const payload = {
        client_id: clientId,
        project_id: projId,
        financial_account_id: finAccId,
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
            if (typeof loadReceivablesList === "function") loadReceivablesList();
            if (typeof loadTreasurySummary === "function") loadTreasurySummary();
            if (typeof loadCashFlowMatrix === "function") loadCashFlowMatrix();
            if (typeof loadProjectsList === "function") loadProjectsList();
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



    let proj = null;
    try {
        const resP = await authFetch(`${API_BASE}/projects/${pId}/details`);
        if (resP.ok) proj = await resP.json();
    } catch(e) {
        console.warn("Error fetching fresh project details:", e);
    }

    if (!proj) {
        const safeProjects = (window.allProjects && window.allProjects.length > 0) ? window.allProjects : (allProjects || []);
        proj = safeProjects.find(p => p.id == pId);
    }

    const contractAmt = parseFloat(proj?.contract_amount_usd) || 0;
    const billedAmt = parseFloat(proj?.total_billed_cxc_usd) || 0;
    const unbilledAmt = Math.max(0, Math.round((contractAmt - billedAmt) * 100) / 100);

    // Nota: se permite siempre emitir valuaciones adicionales incluso si el contrato inicial está cubierto.
    // Esto cubre adendas, obras extra, ajustes de precio y desfases cambiarios.

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
            // SOLO MOSTRAR SU PROYECTO ASOCIADO
            projectSelect.innerHTML = `<option value="${proj.id}" selected>[${proj.code}] ${proj.name} (Por facturar: $${unbilledAmt.toFixed(2)})</option>`;
            projectSelect.value = String(proj.id);
            projectSelect.disabled = true;
        }

        const valIndex = (billedAmt > 0 ? 2 : 1);
        const descInput = document.getElementById("cxc_description");
        if (descInput) {
            descInput.value = (billedAmt > 0)
                ? `Valuación Parcial N° ${valIndex} - [${proj.code}] ${proj.name}`
                : `Facturación de Obra - [${proj.code}] ${proj.name}`;
        }

        const amtInput = document.getElementById("cxc_amount_usd");
        if (amtInput) {
            const targetAmt = (unbilledAmt > 0) ? unbilledAmt : (contractAmt || 0);
            amtInput.value = targetAmt.toFixed(2);
            if (document.getElementById("cxc_tax_retained")) {
                document.getElementById("cxc_tax_retained").value = "0.00";
            }
        }

        try {
            const resCode = await authFetch(`${API_BASE}/financial/next-invoice-code?prefix=FAC`);
            if (resCode.ok) {
                const dataCode = await resCode.json();
                const invInput = document.getElementById("cxc_invoice_number");
                if (invInput) invInput.value = dataCode.next_code;
            }
        } catch(e) {
            const invInput = document.getElementById("cxc_invoice_number");
            if (invInput) invInput.value = `FAC-2026-001`;
        }

        const toastMsg = (billedAmt > 0)
            ? `📋 Valuación de [${proj.code}]. Monto sugerido (Saldo restante): $${unbilledAmt.toLocaleString('en-US', {minimumFractionDigits: 2})} USD. Puedes ajustar el monto a facturar en esta valuación.`
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


// Auto-window binding & ES6 exports
if (typeof window !== 'undefined') {
    window.openFinancialSubtab = openFinancialSubtab;
    window.switchFinancialSubtab = switchFinancialSubtab;
    window.goToCxcPage = goToCxcPage;
    window.changeCxcPageSize = changeCxcPageSize;
    window.roundFinancial = roundFinancial;
    window.setFilterCxc = setFilterCxc;
    window.filterCxcList = filterCxcList;
    window.renderReceivablesPaginated = renderReceivablesPaginated;
    window.loadReceivablesList = loadReceivablesList;
    window.openNewReceivableModal = openNewReceivableModal;
    window.onCxcClientChanged = onCxcClientChanged;
    window.onCxcProjectChanged = onCxcProjectChanged;
    window.submitCreateReceivable = submitCreateReceivable;
    window.openCxcHistoryModal = openCxcHistoryModal;
    window.toggleCxcGestionForm = toggleCxcGestionForm;
    window.updateCxcHistorySummaryCards = updateCxcHistorySummaryCards;
    window.updateCxcScopeButtonsUI = updateCxcScopeButtonsUI;
    window.switchCxcHistoryScope = switchCxcHistoryScope;
    window.loadCxcTimelineData = loadCxcTimelineData;
    window.renderCxcTimelineList = renderCxcTimelineList;
    window.viewCxcEvidence = viewCxcEvidence;
    window.clearCxcEvidenceFile = clearCxcEvidenceFile;
    window.submitCxcFollowUpLog = submitCxcFollowUpLog;
    window.openReceiveClientPaymentModal = openReceiveClientPaymentModal;
    window.onRcpClientChanged = onRcpClientChanged;
    window.calcClientPaymentBs = calcClientPaymentBs;
    window.submitDirectClientPayment = submitDirectClientPayment;
    window.openCreateCxCForProject = openCreateCxCForProject;
    window.openBadDebtModal = openBadDebtModal;
    window.submitBadDebtWriteOff = submitBadDebtWriteOff;
}

export { openFinancialSubtab };
export { switchFinancialSubtab };
export { goToCxcPage };
export { changeCxcPageSize };
export { roundFinancial };
export { setFilterCxc };
export { filterCxcList };
export { renderReceivablesPaginated };
export { loadReceivablesList };
export { openNewReceivableModal };
export { onCxcClientChanged };
export { onCxcProjectChanged };
export { submitCreateReceivable };
export { openCxcHistoryModal };
export { toggleCxcGestionForm };
export { updateCxcHistorySummaryCards };
export { updateCxcScopeButtonsUI };
export { switchCxcHistoryScope };
export { loadCxcTimelineData };
export { renderCxcTimelineList };
export { viewCxcEvidence };
export { clearCxcEvidenceFile };
export { submitCxcFollowUpLog };
export { openReceiveClientPaymentModal };
export { onRcpClientChanged };
export { calcClientPaymentBs };
export { submitDirectClientPayment };
export { openCreateCxCForProject };
export { openBadDebtModal };
export { submitBadDebtWriteOff };
