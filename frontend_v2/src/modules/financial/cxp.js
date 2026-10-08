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

let allPayablesList = [];
let lastPayablesList = [];
let cxpCurrentPage = 1;
let cxpPageSize = 10;
let currentCxpFilter = 'all';
let currentCxpSearch = '';
let currentCxpDocType = 'all';
let currentCxpDateFrom = '';
let currentCxpDateTo = '';
let unbilledWarehouseEntriesCache = [];

async function loadPayablesList() {
    const tbody = document.getElementById("cxpTableBody");
    if (tbody) {
        if (Array.isArray(allPayablesList) && allPayablesList.length > 0) {
            renderPayablesPaginated();
        } else {
            tbody.innerHTML = `<tr><td colspan="11" style="text-align: center; color: #94a3b8; padding: 16px;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando cuentas por pagar...</td></tr>`;
        }
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

function onCxpModalDocTypeChange() {
    const docType = document.getElementById("cxp_doc_type")?.value || 'factura';
    const rifContainer = document.getElementById("cxp_rif_container");
    const rifReq = document.getElementById("cxp_rif_req");
    const ctrlContainer = document.getElementById("cxp_control_container");
    const retContainer = document.getElementById("cxp_ret_rate_container");
    const islrContainer = document.getElementById("cxp_islr_container");
    const muniContainer = document.getElementById("cxp_municipal_container");
    const breakdownBox = document.getElementById("cxp_fiscal_breakdown");
    const invoiceLbl = document.getElementById("lbl_cxp_invoice");

    if (docType === 'nota_entrega') {
        if (invoiceLbl) invoiceLbl.textContent = "Nº Nota de Entrega / Recibo *";
        if (rifReq) rifReq.style.display = "none";
        if (ctrlContainer) ctrlContainer.style.display = "none";
        if (retContainer) retContainer.style.display = "none";
        if (islrContainer) islrContainer.style.display = "none";
        if (muniContainer) muniContainer.style.display = "none";
        if (breakdownBox) breakdownBox.style.display = "none";
    } else if (docType === 'factura_sin_retencion') {
        if (invoiceLbl) invoiceLbl.textContent = "Nº Factura Fiscal *";
        if (rifReq) rifReq.style.display = "inline";
        if (ctrlContainer) ctrlContainer.style.display = "block";
        if (retContainer) retContainer.style.display = "none";
        if (islrContainer) islrContainer.style.display = "none";
        if (muniContainer) muniContainer.style.display = "none";
        if (breakdownBox) breakdownBox.style.display = "grid";
    } else {
        if (invoiceLbl) invoiceLbl.textContent = "Nº Factura Fiscal *";
        if (rifReq) rifReq.style.display = "inline";
        if (ctrlContainer) ctrlContainer.style.display = "block";
        if (retContainer) retContainer.style.display = "block";
        if (islrContainer) islrContainer.style.display = "block";
        if (muniContainer) muniContainer.style.display = "block";
        if (breakdownBox) breakdownBox.style.display = "grid";
    }
    calcPayablePreview();
}

function calcPayablePreview() {
    const total = parseFloat(document.getElementById("cxp_amount_usd")?.value) || 0;
    const docType = document.getElementById("cxp_doc_type")?.value || 'factura';
    const retRate = (docType === 'factura') ? (parseFloat(document.getElementById("cxp_tax_withholding_rate")?.value) || 75.0) : 0;
    const islrRate = (docType === 'factura') ? (parseFloat(document.getElementById("cxp_islr_rate")?.value) || 0.0) : 0;
    const muniRate = (docType === 'factura') ? (parseFloat(document.getElementById("cxp_municipal_rate")?.value) || 0.0) : 0;

    let base = 0, tax = 0, ret = 0, islr = 0, muni = 0, net = total;
    if (docType === 'nota_entrega') {
        base = total;
        tax = 0;
        ret = 0;
        islr = 0;
        muni = 0;
        net = total;
    } else {
        base = roundFinancial(total / 1.16);
        tax = roundFinancial(total - base);
        ret = (retRate > 0) ? roundFinancial(tax * (retRate / 100.0)) : 0;
        islr = (islrRate > 0) ? roundFinancial(base * (islrRate / 100.0)) : 0;
        muni = (muniRate > 0) ? roundFinancial(base * (muniRate / 100.0)) : 0;
        net = roundFinancial(total - ret - islr - muni);
    }

    const lblBase = document.getElementById("cxp_lbl_base");
    const lblTax = document.getElementById("cxp_lbl_tax");
    const lblRet = document.getElementById("cxp_lbl_withholding");
    const lblIslr = document.getElementById("cxp_lbl_islr");
    const lblMuni = document.getElementById("cxp_lbl_municipal");
    const lblNet = document.getElementById("cxp_lbl_net");

    const activeRate = window.EXCHANGE_RATE || (window.BCV_DATA ? window.BCV_DATA.rate : 850.0) || 850.0;
    if (lblBase) lblBase.textContent = `$${base.toFixed(2)}`;
    if (lblTax) lblTax.textContent = `$${tax.toFixed(2)}`;
    if (lblRet) lblRet.textContent = `Bs. ${(ret * activeRate).toFixed(2)}`;
    if (lblIslr) lblIslr.textContent = `Bs. ${(islr * activeRate).toFixed(2)}`;
    if (lblMuni) lblMuni.textContent = `Bs. ${(muni * activeRate).toFixed(2)}`;
    if (lblNet) lblNet.textContent = `$${net.toFixed(2)}`;
}

async function loadUnbilledWarehouseEntries() {
    try {
        const res = await authFetch(`${API_BASE}/financial/unbilled-warehouse-entries`);
        if (res.ok) {
            unbilledWarehouseEntriesCache = await res.json();
            window.unbilledWarehouseEntriesCache = unbilledWarehouseEntriesCache;
        } else {
            unbilledWarehouseEntriesCache = [];
        }
    } catch (e) {
        console.warn("Error cargando entradas de almacén sin facturar:", e);
        unbilledWarehouseEntriesCache = [];
    }

    const selectEl = document.getElementById("cxp_warehouse_entry_id");
    if (selectEl) {
        if (!unbilledWarehouseEntriesCache || unbilledWarehouseEntriesCache.length === 0) {
            selectEl.innerHTML = `<option value="">⚠️ No hay entradas de almacén pendientes (Utilice la opción 'Cargar Mercancía Recibida Ahora')</option>`;
        } else {
            let opts = `<option value="">-- Seleccionar Entrada Física de Almacén (${unbilledWarehouseEntriesCache.length} disponibles) --</option>`;
            opts += unbilledWarehouseEntriesCache.map(e => {
                const dateStr = e.movement_date ? e.movement_date.split(' ')[0] : '';
                return `<option value="${e.id}">[#${e.id} | ${dateStr}] ${e.material_name} - Cant: ${e.quantity} ${e.unit_measure} ($${Number(e.total_cost_usd || 0).toFixed(2)}) → ${e.destination}</option>`;
            }).join('');
            selectEl.innerHTML = opts;
        }
    }
}

async function loadExpenseConcepts() {
    const sel = document.getElementById("cxp_payable_type");
    if (!sel) return;
    const currentVal = sel.value;
    try {
        const res = await authFetch(`${API_BASE}/financial/expense-concepts`);
        if (res.ok) {
            const concepts = await res.json();
            let html = `
                <option value="costo_material_obra" data-rule="costo_material_obra">🏗️ Materiales / Consumibles Obra (Entrada)</option>
                <option value="stock_almacen" data-rule="stock_almacen">🏢 Reposición Stock Almacén (Entrada)</option>
                <option value="servicios_honorarios" data-rule="servicios_honorarios">🤝 Subcontrato / Servicios / Honorarios</option>
                <option value="alquiler_maquinaria_ext" data-rule="alquiler_maquinaria_ext">🚜 Alquiler Maquinaria / Equipos Externos</option>
                <option value="gastos_sede" data-rule="gastos_sede">📂 Gastos Operativos / Administrativos Sede</option>
            `;
            const ruleIcons = {
                costo_material_obra: '🏗️',
                stock_almacen: '🏢',
                servicios_honorarios: '🤝',
                alquiler_maquinaria_ext: '🚜',
                gastos_sede: '📂'
            };
            concepts.forEach(c => {
                const icon = ruleIcons[c.business_rule] || '🏷️';
                html += `<option value="concept_${c.id}" data-rule="${c.business_rule}" data-category-id="${c.id}">${icon} ${c.name}</option>`;
            });
            sel.innerHTML = html;
            if (currentVal && sel.querySelector(`option[value="${currentVal}"]`)) {
                sel.value = currentVal;
            }
        }
    } catch(e) {
        console.warn("Error cargando conceptos de gasto:", e);
    }
}

function openCreateConceptModal() {
    const nameInput = document.getElementById("new_concept_name");
    const descInput = document.getElementById("new_concept_description");
    if (nameInput) nameInput.value = "";
    if (descInput) descInput.value = "";
    const firstRadio = document.querySelector('input[name="new_concept_rule"]');
    if (firstRadio) firstRadio.checked = true;
    openModal("modalCreateExpenseConcept");
}

async function submitCreateExpenseConcept(e) {
    if (e && e.preventDefault) e.preventDefault();
    const name = document.getElementById("new_concept_name")?.value?.trim();
    const desc = document.getElementById("new_concept_description")?.value?.trim() || "";
    const ruleInput = document.querySelector('input[name="new_concept_rule"]:checked');
    const businessRule = ruleInput ? ruleInput.value : "costo_material_obra";

    if (!name) {
        alert("Por favor ingrese el nombre del concepto.");
        return;
    }

    const submitBtn = document.getElementById("btnSubmitCreateConcept");
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Guardando...`;
    }

    try {
        const res = await authFetch(`${API_BASE}/financial/expense-concepts`, {
            method: 'POST',
            body: JSON.stringify({
                name: name,
                business_rule: businessRule,
                description: desc
            })
        });

        if (res.ok) {
            const data = await res.json();
            const created = data.concept || data;
            closeModal("modalCreateExpenseConcept");
            await loadExpenseConcepts();
            const sel = document.getElementById("cxp_payable_type");
            if (sel) {
                sel.value = `concept_${created.id}`;
                onCxpPayableTypeChanged();
            }
            if (typeof showToast === 'function') {
                showToast(`Concepto "${created.name}" creado y asociado a regla de negocio`, 'success');
            } else {
                alert(`Concepto "${created.name}" creado exitosamente.`);
            }
        } else {
            const err = await res.json().catch(() => ({}));
            alert("Error al crear concepto: " + (err.detail || "Error en el servidor"));
        }
    } catch(err) {
        console.error("Error al crear concepto:", err);
        alert("Ocurrió un error de conexión al crear el concepto.");
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `<i class="fa-solid fa-save"></i> Guardar Concepto`;
        }
    }
}

function onCxpPayableTypeChanged() {
    const sel = document.getElementById("cxp_payable_type");
    const opt = sel?.options[sel?.selectedIndex];
    const rule = opt?.getAttribute('data-rule') || sel?.value || 'costo_material_obra';
    const isMaterial = ['costo_material_obra', 'stock_almacen', 'compra_materiales'].includes(rule);
    const panel = document.getElementById("cxp_warehouse_matching_panel");
    if (panel) {
        if (isMaterial) {
            panel.style.display = 'block';
            loadUnbilledWarehouseEntries();
        } else {
            panel.style.display = 'none';
        }
    }
}

function onCxpWarehouseModeChange() {
    const isLink = document.getElementById("cxp_wh_mode_link")?.checked;
    const linkView = document.getElementById("cxp_wh_link_view");
    const newView = document.getElementById("cxp_wh_new_view");
    const lblLink = document.getElementById("lbl_wh_mode_link");
    const lblNew = document.getElementById("lbl_wh_mode_new");

    if (isLink) {
        if (linkView) linkView.classList.remove("hidden");
        if (newView) newView.classList.add("hidden");
        if (lblLink) lblLink.style.borderColor = "#86efac";
        if (lblNew) lblNew.style.borderColor = "#cbd5e1";
    } else {
        if (linkView) linkView.classList.add("hidden");
        if (newView) newView.classList.remove("hidden");
        if (lblLink) lblLink.style.borderColor = "#cbd5e1";
        if (lblNew) lblNew.style.borderColor = "#86efac";

        const tbody = document.getElementById("cxp_materials_tbody");
        if (tbody && tbody.children.length === 0) {
            addCxpMaterialRow();
        }
    }
}

function onCxpWarehouseEntrySelected() {
    const selVal = document.getElementById("cxp_warehouse_entry_id")?.value;
    const detailsEl = document.getElementById("cxp_wh_entry_details");
    if (!selVal) {
        if (detailsEl) detailsEl.classList.add("hidden");
        return;
    }

    const entry = (unbilledWarehouseEntriesCache || []).find(e => String(e.id) === String(selVal));
    if (entry && detailsEl) {
        detailsEl.classList.remove("hidden");
        detailsEl.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span><strong>Entrada #${entry.id}:</strong> ${entry.material_name} (${entry.quantity} ${entry.unit_measure})</span>
                <span style="font-weight: 800; color: #16a34a;">Est: $${Number(entry.total_cost_usd || 0).toFixed(2)}</span>
            </div>
            <div style="font-size: 10px; color: #64748b; margin-top: 3px;">
                Doc. Ref: <strong>${entry.reference_doc || 'S/N'}</strong> | Destino: ${entry.destination} | Fecha: ${entry.movement_date || '-'}
            </div>
        `;

        // Autofill sugerido en monto y descripción si están vacíos
        const amtInput = document.getElementById("cxp_amount_usd");
        if (amtInput && (!amtInput.value || parseFloat(amtInput.value) === 0)) {
            amtInput.value = Number(entry.total_cost_usd || 0).toFixed(2);
            calcPayablePreview();
        }

        const descInput = document.getElementById("cxp_description");
        if (descInput && (!descInput.value || descInput.value.trim() === '')) {
            descInput.value = `Compra de ${entry.quantity} ${entry.unit_measure} de ${entry.material_name} (Entrada #${entry.id})`;
        }
    }
}

function addCxpMaterialRow(preselectedId = null, prefilledCost = null) {
    const tbody = document.getElementById("cxp_materials_tbody");
    if (!tbody) return;

    const materials = (window.allMaterials && window.allMaterials.length > 0) ? window.allMaterials : (allMaterials || []);
    let matOpts = `<option value="">-- Seleccionar Material --</option>`;
    matOpts += `<option value="__NEW__" style="color: #2563eb; font-weight: 800;">+ Crear Nuevo Artículo en Catálogo...</option>`;
    matOpts += materials.map(m => `<option value="${m.id}" data-cost="${m.unit_cost_usd || 0}" ${preselectedId && Number(m.id) === Number(preselectedId) ? 'selected' : ''}>[${m.code || m.id}] ${m.name} (${m.unit || m.unit_measure || 'UND'})</option>`).join('');

    const initialCost = (prefilledCost !== null && !isNaN(prefilledCost)) ? prefilledCost : 0.00;

    const tr = document.createElement("tr");
    tr.style.borderBottom = "1px solid #f1f5f9";
    tr.innerHTML = `
        <td style="padding: 6px 8px;">
            <select class="cxp-mat-item-id form-select" onchange="onCxpMaterialRowMatChanged(this)" style="font-size: 11px; padding: 4px 6px;">
                ${matOpts}
            </select>
        </td>
        <td style="padding: 6px 8px;">
            <input type="number" step="0.01" min="0.01" value="1.0" class="cxp-mat-item-qty form-input" oninput="calcCxpMaterialsTotal()" style="font-size: 11px; padding: 4px 6px; font-weight: 700;">
        </td>
        <td style="padding: 6px 8px;">
            <input type="number" step="0.01" min="0" value="${Number(initialCost).toFixed(2)}" class="cxp-mat-item-cost form-input" oninput="calcCxpMaterialsTotal()" style="font-size: 11px; padding: 4px 6px; font-weight: 700; color: #166534;">
        </td>
        <td class="cxp-mat-item-subtotal" style="padding: 6px 8px; text-align: right; font-weight: 800; color: #0f172a; font-size: 11px;">
            $${Number(initialCost).toFixed(2)}
        </td>
        <td style="padding: 6px 8px; text-align: center;">
            <button type="button" onclick="removeCxpMaterialRow(this)" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 12px;" title="Eliminar fila">
                <i class="fa-solid fa-trash-can"></i>
            </button>
        </td>
    `;
    tbody.appendChild(tr);
    calcCxpMaterialsTotal();
}

function onCxpMaterialRowMatChanged(sel) {
    if (sel.value === "__NEW__") {
        sel.value = "";
        if (typeof window.openNewMaterialModalFromCxp === 'function') {
            window.openNewMaterialModalFromCxp();
        } else if (typeof openNewMaterialModal === 'function') {
            openNewMaterialModal(true);
        }
        return;
    }
    const tr = sel.closest("tr");
    if (!tr) return;
    const selectedOpt = sel.options[sel.selectedIndex];
    const cost = parseFloat(selectedOpt?.dataset?.cost) || 0;
    const costInput = tr.querySelector(".cxp-mat-item-cost");
    if (costInput && (!costInput.value || parseFloat(costInput.value) === 0)) {
        costInput.value = cost.toFixed(2);
    }
    calcCxpMaterialsTotal();
}

function onMaterialCreatedFromCxp(newMat) {
    if (newMat && newMat.id) {
        if (!window.allMaterials) window.allMaterials = [];
        const exists = window.allMaterials.some(m => Number(m.id) === Number(newMat.id));
        if (!exists) {
            window.allMaterials.unshift({
                id: newMat.id,
                code: newMat.code,
                name: newMat.name,
                category: newMat.category,
                unit: newMat.unit || newMat.unit_measure || 'UND',
                unit_measure: newMat.unit_measure || 'UND',
                unit_cost_usd: newMat.unit_cost_usd || 0.0,
                stock_quantity: newMat.stock_quantity || 0.0
            });
        }
    }

    // Actualizar los selectores en todas las filas existentes para incluir el nuevo ítem
    const rows = document.querySelectorAll("#cxp_materials_tbody tr");
    rows.forEach(tr => {
        const sel = tr.querySelector(".cxp-mat-item-id");
        if (sel) {
            const currentVal = sel.value;
            const materials = (window.allMaterials && window.allMaterials.length > 0) ? window.allMaterials : (allMaterials || []);
            let opts = `<option value="">-- Seleccionar Material --</option>`;
            opts += `<option value="__NEW__" style="color: #2563eb; font-weight: 800;">+ Crear Nuevo Artículo en Catálogo...</option>`;
            opts += materials.map(m => `<option value="${m.id}" data-cost="${m.unit_cost_usd || 0}">[${m.code || m.id}] ${m.name} (${m.unit || m.unit_measure || 'UND'})</option>`).join('');
            sel.innerHTML = opts;
            if (currentVal && currentVal !== "__NEW__") {
                sel.value = currentVal;
            }
        }
    });

    // Añadir automáticamente la fila con el nuevo material seleccionado y su costo cargado
    if (newMat && newMat.id) {
        addCxpMaterialRow(newMat.id, newMat.unit_cost_usd || 0.0);
    }

    if (typeof showToastNotification === 'function') {
        showToastNotification(`✅ Artículo "${newMat.name}" registrado e insertado en la lista de compras de CxP.`, 'success');
    } else {
        alert(`✅ Artículo "${newMat.name}" registrado e insertado en la lista de compras de CxP.`);
    }
}

function removeCxpMaterialRow(btn) {
    const tr = btn.closest("tr");
    if (tr) tr.remove();
    calcCxpMaterialsTotal();
}

function calcCxpMaterialsTotal() {
    const rows = document.querySelectorAll("#cxp_materials_tbody tr");
    let total = 0;
    rows.forEach(tr => {
        const qty = parseFloat(tr.querySelector(".cxp-mat-item-qty")?.value) || 0;
        const cost = parseFloat(tr.querySelector(".cxp-mat-item-cost")?.value) || 0;
        const sub = qty * cost;
        total += sub;
        const subEl = tr.querySelector(".cxp-mat-item-subtotal");
        if (subEl) subEl.textContent = `$${sub.toFixed(2)}`;
    });

    const totalEl = document.getElementById("cxp_materials_total_usd");
    if (totalEl) totalEl.textContent = `$${total.toFixed(2)}`;
    return total;
}

function applyCxpMaterialsTotalToAmount() {
    const total = calcCxpMaterialsTotal();
    const amtInput = document.getElementById("cxp_amount_usd");
    if (amtInput) {
        amtInput.value = total.toFixed(2);
        calcPayablePreview();
    }
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

    // Cargar conceptos dinámicos de cuentas por pagar
    await loadExpenseConcepts();

    // Resetear formulario y componentes de 3-Way Matching
    const ptypeSel = document.getElementById("cxp_payable_type");
    if (ptypeSel) ptypeSel.value = "costo_material_obra";

    const whModeLink = document.getElementById("cxp_wh_mode_link");
    if (whModeLink) whModeLink.checked = true;

    const tbody = document.getElementById("cxp_materials_tbody");
    if (tbody) tbody.innerHTML = "";

    const detailsEl = document.getElementById("cxp_wh_entry_details");
    if (detailsEl) detailsEl.classList.add("hidden");

    onCxpModalDocTypeChange();
    onCxpPayableTypeChanged();
    onCxpWarehouseModeChange();

    openModal("modalPayable");
}

async function submitCreatePayable(e) {
    if (e && e.preventDefault) e.preventDefault();

    const submitBtn = document.getElementById("btnSubmitCreatePayable") || (e && e.target ? e.target.querySelector('button[type="submit"]') : null);

    const docType = document.getElementById("cxp_doc_type")?.value || 'factura';
    const selPayableType = document.getElementById("cxp_payable_type");
    const selectedOption = selPayableType?.options[selPayableType?.selectedIndex];
    const businessRule = selectedOption?.getAttribute('data-rule') || selPayableType?.value || 'costo_material_obra';
    const categoryId = selectedOption?.getAttribute('data-category-id') ? parseInt(selectedOption.getAttribute('data-category-id')) : null;
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

    // ---------------------------------------------------------
    // VALIDACIÓN AUDITORÍA DALOR: 3-WAY MATCHING PARA MATERIALES
    // ---------------------------------------------------------
    const isMaterial = ['costo_material_obra', 'stock_almacen', 'compra_materiales'].includes(businessRule);
    let warehouseMovementId = null;
    let warehouseEntryRef = null;
    let materialItems = null;

    if (isMaterial) {
        const isLinkMode = document.getElementById("cxp_wh_mode_link")?.checked;
        if (isLinkMode) {
            const whId = document.getElementById("cxp_warehouse_entry_id")?.value;
            if (!whId) {
                alert("⚠️ Control de Auditoría Dalor (3-Way Matching):\n\nPara registrar una compra de materiales o consumibles, debe seleccionar la Entrada de Almacén correspondiente o utilizar la opción '2. Cargar Mercancía Recibida Ahora'.");
                return;
            }
            warehouseMovementId = parseInt(whId);
            const foundEntry = (unbilledWarehouseEntriesCache || []).find(x => String(x.id) === String(whId));
            warehouseEntryRef = foundEntry ? (foundEntry.reference_doc || `ENTRADA-${whId}`) : `ENTRADA-${whId}`;
        } else {
            // Modo B: Cargar Mercancía Recibida Ahora
            const rows = document.querySelectorAll("#cxp_materials_tbody tr");
            const items = [];
            rows.forEach(tr => {
                const matId = parseInt(tr.querySelector(".cxp-mat-item-id")?.value);
                const qty = parseFloat(tr.querySelector(".cxp-mat-item-qty")?.value) || 0;
                const cost = parseFloat(tr.querySelector(".cxp-mat-item-cost")?.value) || 0;
                if (matId && qty > 0) {
                    items.push({
                        material_id: matId,
                        quantity: qty,
                        unit_cost_usd: cost,
                        destination: businessRule === 'stock_almacen' ? 'Almacén Central Dalor' : 'Obra / Proyecto'
                    });
                }
            });

            if (items.length === 0) {
                alert("⚠️ Debe agregar al menos un material con cantidad válida mayor a 0 para ingresar al inventario físico.");
                return;
            }
            materialItems = items;
        }
    }

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.dataset.origText = submitBtn.dataset.origText || submitBtn.innerHTML;
        submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Registrando en CxP...`;
    }

    const payload = {
        invoice_number: document.getElementById("cxp_invoice_number")?.value?.trim() || '',
        control_number: document.getElementById("cxp_control_number")?.value?.trim() || '',
        supplier_name: document.getElementById("cxp_supplier_name")?.value?.trim() || '',
        supplier_rif: document.getElementById("cxp_supplier_rif")?.value?.trim() || '',
        doc_type: docType,
        payable_type: businessRule,
        category_id: categoryId,
        warehouse_movement_id: warehouseMovementId,
        warehouse_entry_ref: warehouseEntryRef,
        material_items: materialItems,
        project_id: document.getElementById("cxp_project_id")?.value ? parseInt(document.getElementById("cxp_project_id").value) : null,
        description: document.getElementById("cxp_description")?.value?.trim() || '',
        due_date: new Date(document.getElementById("cxp_due_date").value).toISOString(),
        amount_usd: amountUsd,
        taxable_base_usd: baseUsd,
        tax_amount_usd: taxUsd,
        tax_withholding_rate: retRate,
        tax_withholding_usd: retUsd,
        islr_rate: (docType === 'factura') ? (parseFloat(document.getElementById("cxp_islr_rate")?.value) || 0.0) : 0.0,
        islr_withholding_usd: (docType === 'factura' && parseFloat(document.getElementById("cxp_islr_rate")?.value) > 0) ? roundFinancial(baseUsd * ((parseFloat(document.getElementById("cxp_islr_rate")?.value) || 0) / 100.0)) : 0.0,
        municipal_rate: (docType === 'factura') ? (parseFloat(document.getElementById("cxp_municipal_rate")?.value) || 0.0) : 0.0,
        municipal_withholding_usd: (docType === 'factura' && parseFloat(document.getElementById("cxp_municipal_rate")?.value) > 0) ? roundFinancial(baseUsd * ((parseFloat(document.getElementById("cxp_municipal_rate")?.value) || 0) / 100.0)) : 0.0,
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
                showToastNotification(`✅ Cuenta por pagar registrada exitosamente con respaldo de almacén.`, 'success');
            } else {
                alert(`✅ Cuenta por pagar registrada exitosamente con respaldo de almacén.`);
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

    const rateBcv = p.exchange_rate || (window.BCV_DATA?.rate || (typeof EXCHANGE_RATE !== 'undefined' ? EXCHANGE_RATE : 850.0));
    const baseUsd = p.taxable_base_usd || (p.amount_usd ? (p.amount_usd / 1.16) : 0);
    const retUsd = p.tax_withholding_usd || 0;
    const baseBs = baseUsd * rateBcv;
    const retBs = retUsd * rateBcv;

    const rateInput = document.getElementById("edit_cxp_exchange_rate");
    const baseBsInput = document.getElementById("edit_cxp_base_bs");
    const retBsInput = document.getElementById("edit_cxp_ret_bs");
    const retUsdInput = document.getElementById("edit_cxp_ret_usd");

    if (rateInput) rateInput.value = Number(rateBcv).toFixed(2);
    if (baseBsInput) baseBsInput.value = Number(baseBs).toFixed(2);
    if (retBsInput) retBsInput.value = Number(retBs).toFixed(2);
    if (retUsdInput) retUsdInput.value = Number(retUsd).toFixed(2);

    const voucherContainer = document.getElementById("edit_cxp_voucher_container");
    const voucherInput = document.getElementById("edit_cxp_voucher_number");
    if (voucherContainer && voucherInput) {
        if (p.withholding_voucher_number || p.is_withholding_applied) {
            voucherContainer.style.display = "block";
            voucherInput.value = p.withholding_voucher_number || "";
        } else {
            voucherContainer.style.display = "none";
            voucherInput.value = "";
        }
    }

    openModal("modalEditPayable");
}

function calcEditPayableBsPreview() {
    const rate = parseFloat(document.getElementById("edit_cxp_exchange_rate")?.value) || 850.0;
    const totalUsd = parseFloat(document.getElementById("edit_cxp_amount_usd")?.value) || 0;
    const retPct = parseFloat(document.getElementById("edit_cxp_tax_withholding_rate")?.value) || 75.0;

    const baseUsd = totalUsd > 0 ? (totalUsd / 1.16) : 0;
    const taxUsd = totalUsd - baseUsd;
    const retUsd = taxUsd * (retPct / 100.0);

    const baseBs = baseUsd * rate;
    const retBs = retUsd * rate;

    const baseBsInput = document.getElementById("edit_cxp_base_bs");
    const retBsInput = document.getElementById("edit_cxp_ret_bs");
    const retUsdInput = document.getElementById("edit_cxp_ret_usd");

    if (baseBsInput) baseBsInput.value = baseBs.toFixed(2);
    if (retBsInput) retBsInput.value = retBs.toFixed(2);
    if (retUsdInput) retUsdInput.value = retUsd.toFixed(2);
}

function calcEditPayableFromBs() {
    const rate = parseFloat(document.getElementById("edit_cxp_exchange_rate")?.value) || 850.0;
    const baseBs = parseFloat(document.getElementById("edit_cxp_base_bs")?.value) || 0;
    const retPct = parseFloat(document.getElementById("edit_cxp_tax_withholding_rate")?.value) || 75.0;

    if (rate > 0) {
        const taxBs = baseBs * 0.16;
        const retBs = taxBs * (retPct / 100.0);
        const retUsd = retBs / rate;

        const retBsInput = document.getElementById("edit_cxp_ret_bs");
        const retUsdInput = document.getElementById("edit_cxp_ret_usd");
        if (retBsInput) retBsInput.value = retBs.toFixed(2);
        if (retUsdInput) retUsdInput.value = retUsd.toFixed(2);
    }
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

    const rateVal = parseFloat(document.getElementById("edit_cxp_exchange_rate")?.value);
    const retUsdVal = parseFloat(document.getElementById("edit_cxp_ret_usd")?.value);
    const baseBsVal = parseFloat(document.getElementById("edit_cxp_base_bs")?.value);

    if (!isNaN(rateVal) && rateVal > 0) payload.exchange_rate = rateVal;
    if (!isNaN(retUsdVal) && retUsdVal >= 0) payload.tax_withholding_usd = retUsdVal;
    if (!isNaN(baseBsVal) && rateVal > 0) payload.taxable_base_usd = parseFloat((baseBsVal / rateVal).toFixed(2));

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


// Auto-window binding & ES6 exports
if (typeof window !== 'undefined') {
    window.loadPayablesList = loadPayablesList;
    window.updateCxpFilterBadges = updateCxpFilterBadges;
    window.onCxpSearchInput = onCxpSearchInput;
    window.onCxpDocTypeFilterChange = onCxpDocTypeFilterChange;
    window.applyCxpDateFilter = applyCxpDateFilter;
    window.clearCxpDateFilter = clearCxpDateFilter;
    window.setFilterCxp = setFilterCxp;
    window.goToCxpPage = goToCxpPage;
    window.changeCxpPageSize = changeCxpPageSize;
    window.renderPayablesPaginated = renderPayablesPaginated;
    window.onCxpModalDocTypeChange = onCxpModalDocTypeChange;
    window.calcPayablePreview = calcPayablePreview;
    window.loadUnbilledWarehouseEntries = loadUnbilledWarehouseEntries;
    window.loadExpenseConcepts = loadExpenseConcepts;
    window.openCreateConceptModal = openCreateConceptModal;
    window.submitCreateExpenseConcept = submitCreateExpenseConcept;
    window.onCxpPayableTypeChanged = onCxpPayableTypeChanged;
    window.onCxpWarehouseModeChange = onCxpWarehouseModeChange;
    window.onCxpWarehouseEntrySelected = onCxpWarehouseEntrySelected;
    window.addCxpMaterialRow = addCxpMaterialRow;
    window.onCxpMaterialRowMatChanged = onCxpMaterialRowMatChanged;
    window.onMaterialCreatedFromCxp = onMaterialCreatedFromCxp;
    window.removeCxpMaterialRow = removeCxpMaterialRow;
    window.calcCxpMaterialsTotal = calcCxpMaterialsTotal;
    window.applyCxpMaterialsTotalToAmount = applyCxpMaterialsTotalToAmount;
    window.openNewPayableModal = openNewPayableModal;
    window.submitCreatePayable = submitCreatePayable;
    window.openEditPayableModal = openEditPayableModal;
    window.calcEditPayableBsPreview = calcEditPayableBsPreview;
    window.calcEditPayableFromBs = calcEditPayableFromBs;
    window.submitEditPayable = submitEditPayable;
    window.deletePayablePrompt = deletePayablePrompt;
    window.openPayableHistoryModal = openPayableHistoryModal;
    window.openDeclareBadDebtModal = openDeclareBadDebtModal;
    window.submitDeclareBadDebt = submitDeclareBadDebt;
}

export { loadPayablesList };
export { updateCxpFilterBadges };
export { onCxpSearchInput };
export { onCxpDocTypeFilterChange };
export { applyCxpDateFilter };
export { clearCxpDateFilter };
export { setFilterCxp };
export { goToCxpPage };
export { changeCxpPageSize };
export { renderPayablesPaginated };
export { onCxpModalDocTypeChange };
export { calcPayablePreview };
export { loadUnbilledWarehouseEntries };
export { loadExpenseConcepts };
export { openCreateConceptModal };
export { submitCreateExpenseConcept };
export { onCxpPayableTypeChanged };
export { onCxpWarehouseModeChange };
export { onCxpWarehouseEntrySelected };
export { addCxpMaterialRow };
export { onCxpMaterialRowMatChanged };
export { onMaterialCreatedFromCxp };
export { removeCxpMaterialRow };
export { calcCxpMaterialsTotal };
export { applyCxpMaterialsTotalToAmount };
export { openNewPayableModal };
export { submitCreatePayable };
export { openEditPayableModal };
export { calcEditPayableBsPreview };
export { calcEditPayableFromBs };
export { submitEditPayable };
export { deletePayablePrompt };
export { openPayableHistoryModal };
export { openDeclareBadDebtModal };
export { submitDeclareBadDebt };
