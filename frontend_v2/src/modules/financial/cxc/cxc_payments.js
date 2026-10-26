/**
 * DALOR SIGO-P | Módulo: CXC_PAYMENTS.JS
 * Imputación de Pagos Directos de Clientes, Cálculo en Bs y Asignación
 */

var API_BASE = window.API_BASE || (window.location.origin + '/api/v1');

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


// PUENTE GLOBAL WINDOW
if (typeof window !== 'undefined') {
    window.openReceiveClientPaymentModal = openReceiveClientPaymentModal;
    window.onRcpClientChanged = onRcpClientChanged;
    window.calcClientPaymentBs = calcClientPaymentBs;
    window.submitDirectClientPayment = submitDirectClientPayment;
}

export {
    openReceiveClientPaymentModal,
    onRcpClientChanged,
    calcClientPaymentBs,
    submitDirectClientPayment
};
