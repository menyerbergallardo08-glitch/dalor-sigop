/**
 * DALOR SIGO-P | Módulo: CXC_OPERATIONS.JS
 * Registro de Facturación/Cobranza y Emisión Rápida de CxC para Obras
 */

var API_BASE = window.API_BASE || (window.location.origin + '/api/v1');
var allClients = window.allClients || [];
var allProjects = window.allProjects || [];

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

        const controlNum  = (document.getElementById("cxc_control_number")?.value || '').trim();

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

        if (amountVal <= 0)           throw new Error("El Monto USD debe ser mayor a cero.");

        // Parseo seguro de fecha (input type=date entrega YYYY-MM-DD) - Opcional

        let safeDueDateIso = null;

        if (dueDateVal) {

            if (dueDateVal.includes('/')) {

                const parts = dueDateVal.split('/');

                if (parts.length === 3) {

                    safeDueDateIso = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]), 12, 0, 0).toISOString();

                }

            }

            if (!safeDueDateIso) {

                const parsedD = new Date(dueDateVal.includes('T') ? dueDateVal : dueDateVal + 'T12:00:00');

                if (!isNaN(parsedD.getTime())) {

                    safeDueDateIso = parsedD.toISOString();

                }

            }

        }

        const docType = (document.getElementById("cxc_doc_type")?.value || 'FAC').trim();

        const isFiscal = docType === 'FAC';

        // Desglose fiscal vs no fiscal

        const baseUsd    = isFiscal ? parseFloat((amountVal / 1.16).toFixed(2)) : amountVal;

        const taxUsd     = isFiscal ? parseFloat((amountVal - baseUsd).toFixed(2)) : 0.0;

        const retIvaUsd  = (isFiscal && taxRetained > 0) ? parseFloat((taxRetained * 0.75).toFixed(2)) : 0.0;

        const retIslrUsd = (isFiscal && taxRetained > 0) ? parseFloat((taxRetained * 0.25).toFixed(2)) : 0.0;

        const netUsd     = parseFloat((amountVal - taxRetained).toFixed(2));

        const payload = {

            invoice_number:       invoiceNum,

            control_number:       isFiscal ? (controlNum || undefined) : undefined,

            client_id:            clientId,

            project_id:           projId,

            description:          desc || `${isFiscal ? 'Factura' : 'Valuación'} ${invoiceNum}`,

            due_date:             safeDueDateIso,

            amount_usd:           amountVal,

            taxable_base_usd:     baseUsd,

            tax_amount_usd:       taxUsd,

            tax_withholding_rate: isFiscal ? 75.0 : 0.0,

            tax_withholding_usd:  retIvaUsd,

            islr_rate:            isFiscal ? 2.0 : 0.0,

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

        const docTypeSel = document.getElementById("cxc_doc_type");

        if (docTypeSel) {

            docTypeSel.value = "VAL"; // Sugerir por defecto Valuación de Obra

            await onCxcDocTypeChanged();

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


// PUENTE GLOBAL WINDOW
if (typeof window !== 'undefined') {
    window.submitCreateReceivable = submitCreateReceivable;
    window.openCreateCxCForProject = openCreateCxCForProject;
}

export {
    submitCreateReceivable,
    openCreateCxCForProject
};
