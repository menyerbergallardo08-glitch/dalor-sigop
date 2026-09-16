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

// --- BLOQUE L8039-L8865 ---
// ==============================================================================

// 💰 13. MÓDULO FINANCIERO: SUBTABS (CxC, CxP, TESORERÍA)

// ==============================================================================

function openFinancialSubtab(subtabName) {

    switchView('financial', 'finanzas');

    switchFinancialSubtab(subtabName);

}



function switchFinancialSubtab(subtabName) {

    const subtabs = ['cxc', 'cxp', 'summary'];

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

}



// ----------------------------------------------------

// CUENTAS POR COBRAR (CxC)

// ----------------------------------------------------

async function loadReceivablesList() {

    const tbody = document.getElementById("cxcTableBody");

    tbody.innerHTML = `<tr><td colspan="11" style="text-align: center; color: #94a3b8; padding: 16px;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando cuentas por cobrar...</td></tr>`;



    try {

        const res = await fetch(`${API_BASE}/financial/cxc`);

        if (!res.ok) throw new Error("Error en servidor");

        const list = await res.json();



        if (list.length === 0) {

            tbody.innerHTML = `<tr><td colspan="11" style="text-align: center; color: #94a3b8; padding: 16px;">No hay cuentas por cobrar registradas.</td></tr>`;

            return;

        }



        tbody.innerHTML = list.map(r => {

            const isIncobrable = r.status === 'incobrable' || r.is_bad_debt;

            const isPaid = r.status === 'cobrado' || (r.balance_usd <= 0.05 && !isIncobrable);

            const isOverdue = !isPaid && !isIncobrable && new Date(r.due_date) < new Date();

            let badgeBg = '#fef3c7', badgeColor = '#92400e', statusLabel = 'Pendiente';

            if (r.status === 'cobrado' || (r.balance_usd <= 0.05 && r.status !== 'incobrable')) { badgeBg = '#d1fae5'; badgeColor = '#065f46'; statusLabel = 'Cobrado Total'; }

            else if (r.status === 'incobrable' || r.is_bad_debt) { badgeBg = '#fee2e2'; badgeColor = '#991b1b'; statusLabel = '🛑 Incobrable / Castigado'; }

            else if (new Date(r.due_date) < new Date()) { badgeBg = '#fee2e2'; badgeColor = '#dc2626'; statusLabel = '⚠️ En Mora / Vencido'; }

            else if (r.status === 'parcial') { badgeBg = '#e0f2fe'; badgeColor = '#0369a1'; statusLabel = 'Abono Parcial'; }

            if (r.status === 'vencido') { badgeBg = '#fee2e2'; badgeColor = '#991b1b'; statusLabel = '⚠️ Vencida'; }



            return `

            <tr>

                <td style="font-weight: 800; color: var(--dalor-navy);">${r.invoice_number}</td>

                <td style="font-weight: 700;">${r.client_name}</td>

                <td><span style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 11px;">${r.project_code}</span></td>

                <td>${r.description}</td>

                <td style="font-size: 11px; color: #64748b;">${r.issue_date}</td>

                <td style="font-size: 11px; font-weight: 700; color: ${r.status === 'vencido' ? '#e11d48' : '#334155'};">${r.due_date}</td>

                <td style="font-weight: 800; color: #059669;">$${r.amount_usd.toLocaleString()}</td>

                <td style="font-weight: 700; color: #0284c7;">$${r.paid_amount_usd.toLocaleString()}</td>

                <td style="font-weight: 800; color: ${r.balance_usd > 0 ? '#e11d48' : '#059669'}; font-size: 13px;">$${r.balance_usd.toLocaleString()}</td>

                <td>

                    <span style="font-size: 10px; padding: 3px 8px; border-radius: 9999px; font-weight: 800; background: ${badgeBg}; color: ${badgeColor};">

                        ${statusLabel}

                    </span>

                </td>

                <td style="text-align: center;">

                    ${r.balance_usd > 0 ? `

                        <button onclick="openRecordPaymentModal('cobro_cxc', ${r.id}, ${r.balance_usd})" class="btn-primary" style="font-size: 11px; padding: 4px 10px; background: #059669;">

                            <i class="fa-solid fa-hand-holding-dollar"></i> Cobrar

                        </button>

                    ` : `<span style="color: #059669; font-weight: 800; font-size: 11px;"><i class="fa-solid fa-check-double"></i> Al Día</span>`}

                </td>

            </tr>`;

        }).join('');

    } catch (e) {

        tbody.innerHTML = `<tr><td colspan="11" style="text-align: center; color: #e11d48; padding: 16px;">Error al cargar cuentas por cobrar.</td></tr>`;

    }

}



async function openNewReceivableModal() {

    if (!allClients || allClients.length === 0) {

        try {

            const resC = await fetch(`${API_BASE}/clients/`);

            if (resC.ok) allClients = await resC.json();

        } catch(e) {}

    }

    if (!allProjects || allProjects.length === 0) {

        try {

            const resP = await fetch(`${API_BASE}/projects/`);

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

    const invoiceNum = document.getElementById("cxc_invoice_number").value.trim();

    const clientId = parseInt(document.getElementById("cxc_client_id").value);

    const projId = document.getElementById("cxc_project_id").value ? parseInt(document.getElementById("cxc_project_id").value) : null;

    const desc = document.getElementById("cxc_description").value.trim();

    const dueDateVal = document.getElementById("cxc_due_date").value;

    const amountVal = parseFloat(document.getElementById("cxc_amount_usd").value);

    const taxRetained = parseFloat(document.getElementById("cxc_tax_retained").value) || 0.0;



    if (!invoiceNum || !clientId || !dueDateVal || isNaN(amountVal) || amountVal <= 0) {

        alert("Por favor completa todos los campos requeridos (*): N° Factura, Cliente, Fecha de Vencimiento y Monto válido.");

        return;

    }



    // Desglose fiscal limpio: Sólo aplicar retención si el usuario introdujo un valor explícito mayor a 0

    const baseUsd = parseFloat((amountVal / 1.16).toFixed(2));

    const taxUsd = parseFloat((amountVal - baseUsd).toFixed(2));

    const retIvaUsd = taxRetained > 0 ? parseFloat((taxRetained * 0.75).toFixed(2)) : 0.0;

    const retIslrUsd = taxRetained > 0 ? parseFloat((taxRetained * 0.25).toFixed(2)) : 0.0;

    const netUsd = parseFloat((amountVal - taxRetained).toFixed(2));



    const payload = {

        invoice_number: invoiceNum,

        client_id: clientId,

        project_id: projId,

        description: desc || `Valuación / Factura ${invoiceNum}`,

        due_date: new Date(dueDateVal).toISOString(),

        amount_usd: amountVal,

        taxable_base_usd: baseUsd,

        tax_amount_usd: taxUsd,

        tax_withholding_rate: 75.0,

        tax_withholding_usd: retIvaUsd,

        islr_rate: 2.0,

        islr_withholding_usd: retIslrUsd,

        net_amount_usd: netUsd,

        tax_retained_usd: taxRetained > 0 ? taxRetained : (retIvaUsd + retIslrUsd),

        exchange_rate: (typeof EXCHANGE_RATE !== 'undefined' ? EXCHANGE_RATE : 800.0)

    };



    try {

        const res = await fetch(`${API_BASE}/financial/cxc`, {

            method: "POST",

            headers: { "Content-Type": "application/json" },

            body: JSON.stringify(payload)

        });

        if (!res.ok) {

            const err = await res.json();

            throw new Error(err.detail || "Error al emitir factura");

        }

        

        closeModal("modalReceivable");

        document.getElementById("receivableForm").reset();

        

        // Conmutar a vista financiera y refrescar

        switchView('financial', 'finanzas');

        switchFinancialSubtab('cxc');

        await loadReceivablesList();

        

        if (typeof showToastNotification === 'function') {

            showToastNotification(`✅ Valuación/Factura [${invoiceNum}] cargada exitosamente en el Módulo Financiero.`, 'success');

        } else {

            alert(`✅ Valuación/Factura [${invoiceNum}] registrada exitosamente y cargada en el Módulo Financiero.`);

        }

    } catch (err) {

        alert("Error al guardar cuenta por cobrar: " + err.message);

    }

}



// ----------------------------------------------------

// CUENTAS POR PAGAR (CxP)

// ----------------------------------------------------

async function loadPayablesList() {

    const tbody = document.getElementById("cxpTableBody");

    tbody.innerHTML = `<tr><td colspan="11" style="text-align: center; color: #94a3b8; padding: 16px;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando cuentas por pagar...</td></tr>`;



    try {

        const res = await fetch(`${API_BASE}/financial/cxp`);

        if (!res.ok) throw new Error("Error en servidor");

        const list = await res.json();



        if (list.length === 0) {

            tbody.innerHTML = `<tr><td colspan="11" style="text-align: center; color: #94a3b8; padding: 16px;">No hay cuentas por pagar a proveedores.</td></tr>`;

            return;

        }



        tbody.innerHTML = list.map(p => {

            let badgeBg = '#fef3c7', badgeColor = '#92400e', statusLabel = 'Pendiente';

            if (p.status === 'pagado') { badgeBg = '#d1fae5'; badgeColor = '#065f46'; statusLabel = 'Pagado Total'; }

            if (p.status === 'parcial') { badgeBg = '#e0f2fe'; badgeColor = '#0369a1'; statusLabel = 'Pago Parcial'; }

            if (p.status === 'vencido') { badgeBg = '#fee2e2'; badgeColor = '#991b1b'; statusLabel = '⚠️ Vencida'; }



            return `

            <tr>

                <td style="font-weight: 800; color: var(--dalor-navy);">${p.invoice_number}</td>

                <td style="font-weight: 700;">${p.supplier_name}</td>

                <td><span style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 11px;">${p.project_code}</span></td>

                <td>${p.description}</td>

                <td style="font-size: 11px; color: #64748b;">${p.issue_date}</td>

                <td style="font-size: 11px; font-weight: 700; color: ${p.status === 'vencido' ? '#e11d48' : '#334155'};">${p.due_date}</td>

                <td style="font-weight: 800; color: #e11d48;">$${p.amount_usd.toLocaleString()}</td>

                <td style="font-weight: 700; color: #059669;">$${p.paid_amount_usd.toLocaleString()}</td>

                <td style="font-weight: 800; color: ${p.balance_usd > 0 ? '#e11d48' : '#059669'}; font-size: 13px;">$${p.balance_usd.toLocaleString()}</td>

                <td>

                    <span style="font-size: 10px; padding: 3px 8px; border-radius: 9999px; font-weight: 800; background: ${badgeBg}; color: ${badgeColor};">

                        ${statusLabel}

                    </span>

                </td>

                <td style="text-align: center;">

                    ${p.balance_usd > 0 ? `

                        <button onclick="openRecordPaymentModal('pago_cxp', ${p.id}, ${p.balance_usd})" class="btn-primary" style="font-size: 11px; padding: 4px 10px; background: #e11d48;">

                            <i class="fa-solid fa-money-bill-wave"></i> Pagar

                        </button>

                    ` : `<span style="color: #059669; font-weight: 800; font-size: 11px;"><i class="fa-solid fa-check-double"></i> Solventado</span>`}

                </td>

            </tr>`;

        }).join('');

    } catch (e) {

        tbody.innerHTML = `<tr><td colspan="11" style="text-align: center; color: #e11d48; padding: 16px;">Error al cargar cuentas por pagar.</td></tr>`;

    }

}



function openNewPayableModal() {

    populateSelect("cxp_project_id", [{id: '', code: 'Sede Central / Gastos Generales'}, ...allProjects], p => `<option value="${p.id || ''}">${p.code} - ${p.name || ''}</option>`);

    

    const d = new Date();

    d.setDate(d.getDate() + 15);

    document.getElementById("cxp_due_date").value = d.toISOString().split('T')[0];

    

    openModal("modalPayable");

}



async function submitCreatePayable(e) {

    e.preventDefault();

    const payload = {

        invoice_number: document.getElementById("cxp_invoice_number").value.trim(),

        supplier_name: document.getElementById("cxp_supplier_name").value.trim(),

        project_id: document.getElementById("cxp_project_id").value ? parseInt(document.getElementById("cxp_project_id").value) : null,

        description: document.getElementById("cxp_description").value.trim(),

        due_date: new Date(document.getElementById("cxp_due_date").value).toISOString(),

        amount_usd: parseFloat(document.getElementById("cxp_amount_usd").value),

        exchange_rate: EXCHANGE_RATE

    };



    try {

        const res = await fetch(`${API_BASE}/financial/cxp`, {

            method: "POST",

            headers: { "Content-Type": "application/json" },

            body: JSON.stringify(payload)

        });

        if (!res.ok) throw new Error("Error al registrar deuda");

        closeModal("modalPayable");

        document.getElementById("payableForm").reset();

        loadPayablesList();

        alert("✅ Cuenta por pagar registrada exitosamente.");

    } catch (err) {

        alert("Error: " + err.message);

    }

}



// ----------------------------------------------------

// REGISTRO DE COBRO O PAGO

// ----------------------------------------------------

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



    openModal("modalFinancialTransaction");

}



async function submitFinancialPayment(e) {

    e.preventDefault();

    const type = document.getElementById("fin_trans_type").value;

    const targetId = document.getElementById("fin_trans_target_id").value;

    const amountUsd = parseFloat(document.getElementById("fin_trans_amount_usd").value);



    const payload = {

        amount_usd: amountUsd,

        exchange_rate: EXCHANGE_RATE,

        payment_method: document.getElementById("fin_trans_method").value,

        reference_number: document.getElementById("fin_trans_ref").value.trim(),

        notes: document.getElementById("fin_trans_notes").value.trim()

    };



    const endpoint = type === 'cobro_cxc' 

        ? `${API_BASE}/financial/cxc/${targetId}/payment`

        : `${API_BASE}/financial/cxp/${targetId}/payment`;



    try {

        const res = await fetch(endpoint, {

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



    try {

        const res = await fetch(`${API_BASE}/financial/summary`);

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



    } catch (e) {

        console.error("Error al cargar tesorería:", e);

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

            const partner_name = document.getElementById('qf_partner_name').value;

            const concept = document.getElementById('qf_partner_concept').value.trim() || description;



            const res = await fetch(`${API_BASE}/financial/partners/withdrawals`, {

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



            const res = await fetch(`${API_BASE}/expenses/manual`, {

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



            const res = await fetch(`${API_BASE}/expenses/manual`, {

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

        const res = await fetch(`${API_BASE}/financial/partners/withdrawals`);

        const list = await res.json();



        if (list.length === 0) {

            tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #94a3b8; padding: 16px;">No hay retiros de socios registrados.</td></tr>`;

            return;

        }



        tbody.innerHTML = list.map(w => `

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



    } catch (e) {

        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #e11d48; padding: 16px;">Error al cargar cuenta corriente de socios.</td></tr>`;

    }

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

        const res = await fetch(`${API_BASE}/financial/direct-collection`, {

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

            const resC = await fetch(`${API_BASE}/clients/`);

            if (resC.ok) allClients = await resC.json();

        } catch(e) {

            console.error("Error loading clients:", e);

        }

    }

    if (!allProjects || allProjects.length === 0) {

        try {

            const resP = await fetch(`${API_BASE}/projects/`);

            if (resP.ok) allProjects = await resP.json();

        } catch(e) {

            console.error("Error loading projects:", e);

        }

    }



    const proj = (allProjects || []).find(p => p.id == pId);



    // Cambiar a vista de finanzas y subpestaña de CxC

    switchView('financial', 'finanzas');

    switchFinancialSubtab('cxc');



    // Poblar y abrir modal

    openNewReceivableModal();



    if (proj) {

        if (proj.client_id && document.getElementById("cxc_client_id")) {

            document.getElementById("cxc_client_id").value = proj.client_id;

        }

        if (document.getElementById("cxc_project_id")) {

            document.getElementById("cxc_project_id").value = proj.id;

        }

        if (document.getElementById("cxc_description")) {

            document.getElementById("cxc_description").value = `Valuación / Facturación de Obra - [${proj.code}] ${proj.name}`;

        }

        if (document.getElementById("cxc_amount_usd") && proj.contract_amount_usd) {

            const amt = parseFloat(proj.contract_amount_usd) || 0;

            document.getElementById("cxc_amount_usd").value = amt.toFixed(2);

            

            // Retenciones en 0.00 por defecto (el cliente debe el 100% hasta que consigne comprobantes de retención)

            if (document.getElementById("cxc_tax_retained")) {

                document.getElementById("cxc_tax_retained").value = "0.00";

            }

        }

        if (document.getElementById("cxc_invoice_number")) {

            const randNum = Math.floor(100 + Math.random() * 900);

            document.getElementById("cxc_invoice_number").value = `VAL-${proj.code}-${randNum}`;

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

        const res = await fetch(`${API_BASE}/financial/cxc/${cxcId}/write-off`, {

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
}

export { calcClientPaymentBs, calcQuickBs, loadPartnersWithdrawalsList, loadPayablesList, loadReceivablesList, loadTreasurySummary, openBadDebtModal, openCreateCxCForProject, openFinancialSubtab, openMaterialConsumeModalWithProject, openNewPartnerWithdrawalModal, openNewPayableModal, openNewReceivableModal, openQuickFlowModal, openReceiveClientPaymentModal, openRecordPaymentModal, selectQuickType, submitBadDebtWriteOff, submitCreatePayable, submitCreateReceivable, submitDirectClientPayment, submitFinancialPayment, submitQuickFlow, switchFinancialSubtab };
