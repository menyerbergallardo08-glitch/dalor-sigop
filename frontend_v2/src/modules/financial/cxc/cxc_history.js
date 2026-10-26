/**
 * DALOR SIGO-P | Módulo: CXC_HISTORY.JS
 * Modal de Historial de Cobranzas, Alcance de Factura/Cliente y Resumen
 */

import { clearCxcEvidenceFile, renderCxcTimelineList } from './cxc_timeline.js';

var API_BASE = window.API_BASE || (window.location.origin + '/api/v1');
var currentReceivableId = null;
var currentHistoryClientId = null;
var currentHistoryScope = 'invoice';
var currentReceivableInvoiceNum = '';
var currentReceivableClientName = '';
var allTimelineEvents = [];
var currentCxcHistoryContext = {};

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

function openCxcHistoryModal(recId, clientId, invoiceNum, clientName) {

    const recList = window.allReceivablesList || [];
    const item = recList.find(x => x.id === recId) || {};

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

    if (typeof openModal === 'function') openModal("modalCxcHistory");
    else if (typeof window !== 'undefined' && typeof window.openModal === 'function') window.openModal("modalCxcHistory");

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


// PUENTE GLOBAL WINDOW
if (typeof window !== 'undefined') {
    window.openCxcHistoryModal = openCxcHistoryModal;
    window.toggleCxcGestionForm = toggleCxcGestionForm;
    window.updateCxcHistorySummaryCards = updateCxcHistorySummaryCards;
    window.updateCxcScopeButtonsUI = updateCxcScopeButtonsUI;
    window.switchCxcHistoryScope = switchCxcHistoryScope;
    window.loadCxcTimelineData = loadCxcTimelineData;
}

export {
    openCxcHistoryModal,
    toggleCxcGestionForm,
    updateCxcHistorySummaryCards,
    updateCxcScopeButtonsUI,
    switchCxcHistoryScope,
    loadCxcTimelineData
};
