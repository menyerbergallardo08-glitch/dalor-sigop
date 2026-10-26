/**
 * DALOR SIGO-P | Módulo: CXC_FORM.JS
 * Modal y Selectores de Cuentas por Cobrar y Configuración de Documento
 */

var API_BASE = window.API_BASE || (window.location.origin + '/api/v1');
var allClients = window.allClients || [];
var allProjects = window.allProjects || [];

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

    // Inicializar selector de tipo de documento

    const docTypeSel = document.getElementById("cxc_doc_type");

    if (docTypeSel) docTypeSel.value = "FAC";

    await onCxcDocTypeChanged();

    // Inicializar estado del selector de obras

    onCxcClientChanged();

    // Fecha de vencimiento a 15 días

    const d = new Date();

    d.setDate(d.getDate() + 15);

    const dueDateInput = document.getElementById("cxc_due_date");

    if (dueDateInput) dueDateInput.value = d.toISOString().split('T')[0];

    openModal("modalReceivable");

}

async function onCxcDocTypeChanged() {

    const docTypeSel = document.getElementById("cxc_doc_type");

    const docType = docTypeSel ? docTypeSel.value : 'FAC';

    const badgeEl = document.getElementById("cxc_doc_type_badge");

    const hintEl = document.getElementById("cxc_doc_type_hint");

    const invInp = document.getElementById("cxc_invoice_number");

    const ctrlInp = document.getElementById("cxc_control_number");

    const btnAdjust = document.getElementById("btnEmergencyInvoiceAdjust");

    const lblInvoice = document.getElementById("lbl_cxc_invoice_number");

    const lblControl = document.getElementById("lbl_cxc_control_number");

    if (docType === 'FAC') {

        if (badgeEl) {

            badgeEl.textContent = 'Factura Fiscal SENIAT';

            badgeEl.style.background = '#dbeafe';

            badgeEl.style.color = '#1e40af';

        }

        if (hintEl) {

            hintEl.innerHTML = 'ℹ️ <b>Factura Oficial Forma Libre:</b> Asigna correlativo fiscal numerado e IVA 16%. Entra en el Libro de Ventas SENIAT.';

        }

        if (lblInvoice) lblInvoice.textContent = 'Nº Factura *';

        if (lblControl) lblControl.textContent = 'Nº Control Forma Libre';

        if (ctrlInp) {

            ctrlInp.disabled = false;

            ctrlInp.placeholder = '00-000558';

        }

        if (btnAdjust) btnAdjust.style.display = 'inline-block';

    } else if (docType === 'VAL') {

        if (badgeEl) {

            badgeEl.textContent = 'Valuación de Obra (No Fiscal)';

            badgeEl.style.background = '#fef3c7';

            badgeEl.style.color = '#92400e';

        }

        if (hintEl) {

            hintEl.innerHTML = '🏗️ <b>Valuación de Avance / Cobro Interno:</b> Registra la cuenta por cobrar y amortiza el contrato de la obra sin generar débito fiscal SENIAT ni requerir papel de forma libre.';

        }

        if (lblInvoice) lblInvoice.textContent = 'Nº Valuación *';

        if (lblControl) lblControl.textContent = 'Nº Control (No Aplica)';

        if (ctrlInp) {

            ctrlInp.value = '';

            ctrlInp.disabled = true;

            ctrlInp.placeholder = 'N/A (No Fiscal)';

        }

        if (btnAdjust) btnAdjust.style.display = 'none';

    } else if (docType === 'NE') {

        if (badgeEl) {

            badgeEl.textContent = 'Nota de Entrega (No Fiscal)';

            badgeEl.style.background = '#e0e7ff';

            badgeEl.style.color = '#3730a3';

        }

        if (hintEl) {

            hintEl.innerHTML = '📦 <b>Nota de Entrega / Despacho:</b> Cobro respaldado por guía de entrega/salida de materiales o servicios no fiscalizados.';

        }

        if (lblInvoice) lblInvoice.textContent = 'Nº Nota de Entrega *';

        if (lblControl) lblControl.textContent = 'Nº Control (No Aplica)';

        if (ctrlInp) {

            ctrlInp.value = '';

            ctrlInp.disabled = true;

            ctrlInp.placeholder = 'N/A (No Fiscal)';

        }

        if (btnAdjust) btnAdjust.style.display = 'none';

    } else if (docType === 'REC') {

        if (badgeEl) {

            badgeEl.textContent = 'Recibo Interno (No Fiscal)';

            badgeEl.style.background = '#f3e8ff';

            badgeEl.style.color = '#6b21a8';

        }

        if (hintEl) {

            hintEl.innerHTML = '🧾 <b>Recibo de Anticipo / Cobro Interno:</b> Comprobante interno para anticipos o pagos por caja/banco en moneda extranjera.';

        }

        if (lblInvoice) lblInvoice.textContent = 'Nº Recibo *';

        if (lblControl) lblControl.textContent = 'Nº Control (No Aplica)';

        if (ctrlInp) {

            ctrlInp.value = '';

            ctrlInp.disabled = true;

            ctrlInp.placeholder = 'N/A (No Fiscal)';

        }

        if (btnAdjust) btnAdjust.style.display = 'none';

    }

    try {

        const resCode = await authFetch(`${API_BASE}/financial/next-invoice-code?prefix=${docType}`);

        if (resCode.ok) {

            const dataCode = await resCode.json();

            if (invInp) invInp.value = dataCode.next_code || '';

            if (ctrlInp && docType === 'FAC') ctrlInp.value = dataCode.next_control || '';

        }

    } catch(e) {

        console.warn("Error fetching next code for doc type:", e);

    }

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

    if (warnEl) warnEl.remove();

    if (submitBtn) {

        submitBtn.disabled = false;

        submitBtn.style.opacity = '1';

        submitBtn.style.cursor = 'pointer';

    }

    let opts = '<option value="" selected>📄 Facturación Libre / Servicio General (Sin Proyecto)</option>';

    if (clientProjects.length > 0) {

        opts += `<optgroup label="Obras con Saldo Pendiente por Facturar (${clientProjects.length})">`;

        opts += clientProjects.map(p => {

            const unbilled = Math.max(0, (parseFloat(p.contract_amount_usd) || 0) - (parseFloat(p.total_billed_cxc_usd) || 0));

            return `<option value="${p.id}">[${p.code}] ${p.name} (Por facturar: $${unbilled.toFixed(2)})</option>`;

        }).join('');

        opts += `</optgroup>`;

    }

    projSel.innerHTML = opts;

    if (clientProjects.length === 1) {

        projSel.value = String(clientProjects[0].id);

        onCxcProjectChanged();

    }

}

function onCxcProjectChanged() {

    const projSel = document.getElementById("cxc_project_id");

    const amtInput = document.getElementById("cxc_amount_usd");

    const descInput = document.getElementById("cxc_description");

    const pId = projSel?.value;

    if (!pId) {

        // En modo Facturación Libre / Sin Proyecto, preservar lo que el usuario haya escrito

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


// PUENTE GLOBAL WINDOW
if (typeof window !== 'undefined') {
    window.openNewReceivableModal = openNewReceivableModal;
    window.onCxcDocTypeChanged = onCxcDocTypeChanged;
    window.onCxcClientChanged = onCxcClientChanged;
    window.onCxcProjectChanged = onCxcProjectChanged;
}

export {
    openNewReceivableModal,
    onCxcDocTypeChanged,
    onCxcClientChanged,
    onCxcProjectChanged
};
