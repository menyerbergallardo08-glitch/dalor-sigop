/**
 * DALOR SIGO-P | Módulo: CXC_STATEMENTS.JS
 * Estados de Cuenta de Clientes, Castigo de Deuda (Bad Debt), Exportación Excel y Reemplazo Fiscal
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

async function exportCxcExcel() {

    try {

        const res = await authFetch(`${API_BASE}/financial/reports/cxc/excel`);

        if (!res.ok) throw new Error("Error al generar Excel de CxC");

        const blob = await res.blob();

        const url = window.URL.createObjectURL(blob);

        const a = document.createElement("a");

        a.href = url;

        a.download = `DALOR_Cuentas_Por_Cobrar_${new Date().toISOString().slice(0, 10)}.xlsx`;

        document.body.appendChild(a);

        a.click();

        a.remove();

        window.URL.revokeObjectURL(url);

    } catch (e) {

        alert("Error al descargar Excel de CxC: " + e.message);

    }

}

async function printClientAccountStatement(clientId) {

    if (!clientId) {

        alert("Por favor seleccione un cliente para generar el estado de cuenta.");

        return;

    }

    try {

        const res = await authFetch(`${API_BASE}/financial/reports/client-statement/${clientId}`);

        if (!res.ok) {

            const err = await res.json();

            throw new Error(err.detail || "Error al obtener estado de cuenta");

        }

        const data = await res.json();

        const comp = data.company;

        const cli = data.client;

        const tot = data.totals;

        const aging = tot.aging || {};

        let invRows = (data.invoices || []).map((inv) => `

            <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">

                <td style="padding: 6px 8px; font-weight: 800; color: #002B49; font-family: monospace;">${inv.invoice_number}</td>

                <td style="padding: 6px 8px; color: #475569;">${inv.issue_date}</td>

                <td style="padding: 6px 8px; color: ${inv.days_overdue > 0 ? '#dc2626' : '#475569'}; font-weight: ${inv.days_overdue > 0 ? '700' : '500'};">${inv.due_date}</td>

                <td style="padding: 6px 8px; font-weight: 600;">[${inv.project_code}] ${inv.concept}</td>

                <td style="padding: 6px 8px; text-align: right; font-weight: 700; color: #334155;">$${Number(inv.amount_usd || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>

                <td style="padding: 6px 8px; text-align: right; font-weight: 700; color: #0284c7;">$${Number(inv.paid_amount_usd || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>

                <td style="padding: 6px 8px; text-align: right; font-weight: 800; color: ${inv.balance_usd > 0.05 ? '#dc2626' : '#059669'};">$${Number(inv.balance_usd || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>

                <td style="padding: 6px 8px; text-align: center;">

                    <span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 800; ${inv.days_overdue > 0 ? 'background: #fee2e2; color: #991b1b;' : (inv.balance_usd <= 0.05 ? 'background: #dcfce7; color: #166534;' : 'background: #e0f2fe; color: #0369a1;')}">

                        ${inv.days_overdue > 0 ? `Vencida (${inv.days_overdue}d)` : (inv.balance_usd <= 0.05 ? 'Solvente' : 'Corriente')}

                    </span>

                </td>

            </tr>

        `).join('');

        if (!invRows) {

            invRows = `<tr><td colspan="8" style="text-align: center; color: #94a3b8; padding: 14px;">No se registran documentos de cobro para este cliente.</td></tr>`;

        }

        let payRows = (data.payments || []).map(p => `

            <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">

                <td style="padding: 6px 8px; font-weight: 800; color: #002B49; font-family: monospace;">${p.payment_number}</td>

                <td style="padding: 6px 8px; color: #475569;">${p.date}</td>

                <td style="padding: 6px 8px; font-weight: 700;">${p.invoice_number || '-'}</td>

                <td style="padding: 6px 8px;"><span style="font-size: 10px; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-weight: 700;">${p.method}</span> Ref: ${p.reference}</td>

                <td style="padding: 6px 8px; text-align: right; font-weight: 800; color: #059669;">$${Number(p.amount_usd || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>

                <td style="padding: 6px 8px; text-align: right; font-weight: 700; color: #475569;">Bs. ${Number(p.amount_bs || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>

            </tr>

        `).join('');

        if (!payRows) {

            payRows = `<tr><td colspan="6" style="text-align: center; color: #94a3b8; padding: 12px;">No se registran abonos o pagos bancarios aplicados aún.</td></tr>`;

        }

        const printHtml = `

        <div style="font-family: Arial, sans-serif; color: #1e293b; max-width: 820px; margin: auto; padding: 24px; border: 1px solid #cbd5e1; background: #ffffff;">

            <!-- Header Corporativo -->

            <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #002B49; padding-bottom: 12px; margin-bottom: 16px;">

                <div style="display: flex; align-items: center; gap: 14px;">

                    <img src="logo_dalor.jpg" alt="DALOR" style="height: 52px; max-width: 150px; object-fit: contain;" onerror="this.style.display='none'">

                    <div>

                        <h1 style="font-size: 19px; font-weight: 900; color: #002B49; margin: 0; text-transform: uppercase; letter-spacing: -0.5px;">${comp.name}</h1>

                        <p style="font-size: 11px; color: #0284c7; margin: 2px 0 0 0; font-weight: 800;">RIF: ${comp.rif} &bull; ${comp.address}</p>

                        <p style="font-size: 10px; color: #64748b; margin: 1px 0 0 0;">Tel: ${comp.phone} &bull; Email: ${comp.email}</p>

                    </div>

                </div>

                <div style="text-align: right; border: 2px solid #002B49; padding: 6px 14px; border-radius: 6px; background: #f8fafc;">

                    <div style="font-size: 10px; font-weight: 900; color: #002B49; text-transform: uppercase;">ESTADO DE CUENTA CLIENTE</div>

                    <div style="font-size: 13px; font-weight: 900; color: #0284c7;">AL: ${data.statement_date}</div>

                    <div style="font-size: 10px; color: #475569; font-weight: 700;">Tasa BCV: Bs. ${Number(data.exchange_rate).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>

                </div>

            </div>

            <!-- Ficha del Cliente -->

            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; margin-bottom: 16px;">

                <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 12px; font-size: 11.5px;">

                    <div>

                        <div style="font-size: 14px; font-weight: 900; color: #002B49; margin-bottom: 4px;">${cli.name}</div>

                        <div><b>RIF:</b> ${cli.rif} &bull; <b>Contacto:</b> ${cli.contact_person}</div>

                        <div><b>Dirección:</b> ${cli.address}</div>

                    </div>

                    <div style="text-align: right;">

                        <div><b>Teléfono:</b> ${cli.phone}</div>

                        <div><b>Correo:</b> ${cli.email}</div>

                    </div>

                </div>

            </div>

            <!-- Resumen Financiero & Aging -->

            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 16px;">

                <div style="background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px; text-align: center;">

                    <span style="font-size: 10px; font-weight: 800; color: #475569; text-transform: uppercase;">Total Facturado</span>

                    <div style="font-size: 14px; font-weight: 900; color: #1e293b; margin-top: 2px;">$${tot.total_billed_usd.toLocaleString('en-US', {minimumFractionDigits: 2})}</div>

                </div>

                <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 6px; padding: 8px; text-align: center;">

                    <span style="font-size: 10px; font-weight: 800; color: #047857; text-transform: uppercase;">Total Cobrado / Abonos</span>

                    <div style="font-size: 14px; font-weight: 900; color: #059669; margin-top: 2px;">$${tot.total_paid_usd.toLocaleString('en-US', {minimumFractionDigits: 2})}</div>

                </div>

                <div style="background: ${tot.total_pending_usd > 0.05 ? '#fef2f2' : '#f0fdf4'}; border: 1.5px solid ${tot.total_pending_usd > 0.05 ? '#fca5a5' : '#86efac'}; border-radius: 6px; padding: 8px; text-align: center;">

                    <span style="font-size: 10px; font-weight: 800; color: ${tot.total_pending_usd > 0.05 ? '#991b1b' : '#166534'}; text-transform: uppercase;">Saldo Deudor (USD)</span>

                    <div style="font-size: 15px; font-weight: 900; color: ${tot.total_pending_usd > 0.05 ? '#dc2626' : '#059669'}; margin-top: 2px;">$${tot.total_pending_usd.toLocaleString('en-US', {minimumFractionDigits: 2})}</div>

                </div>

                <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 8px; text-align: center;">

                    <span style="font-size: 10px; font-weight: 800; color: #1d4ed8; text-transform: uppercase;">Saldo Deudor (Bs. BCV)</span>

                    <div style="font-size: 13px; font-weight: 900; color: #2563eb; margin-top: 2px;">Bs. ${tot.total_pending_bs.toLocaleString('en-US', {minimumFractionDigits: 2})}</div>

                </div>

            </div>

            <!-- Antigüedad de la Deuda (Aging) -->

            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 12px; margin-bottom: 16px; font-size: 11px;">

                <div style="font-weight: 800; color: #002B49; margin-bottom: 4px; text-transform: uppercase; font-size: 10px;">Antigüedad de Saldos por Vencer y Vencidos:</div>

                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; text-align: center;">

                    <div style="background: white; border: 1px solid #cbd5e1; border-radius: 4px; padding: 4px;">Corriente: <b>$${(aging.current_usd || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</b></div>

                    <div style="background: white; border: 1px solid #cbd5e1; border-radius: 4px; padding: 4px;">1 a 30 días: <b>$${(aging.days_1_30_usd || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</b></div>

                    <div style="background: white; border: 1px solid #cbd5e1; border-radius: 4px; padding: 4px;">31 a 60 días: <b>$${(aging.days_31_60_usd || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</b></div>

                    <div style="background: white; border: 1px solid #fca5a5; border-radius: 4px; padding: 4px; color: #991b1b;">+60 días: <b>$${(aging.days_61_plus_usd || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</b></div>

                </div>

            </div>

            <!-- Detalle de Facturas y Valuaciones -->

            <h3 style="font-size: 12px; font-weight: 900; color: #002B49; margin: 0 0 6px 0; text-transform: uppercase;">1. Facturas, Valuaciones y Notas de Cobro:</h3>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">

                <thead style="background: #002B49; color: white; font-size: 10.5px;">

                    <tr>

                        <th style="padding: 6px 8px; text-align: left;">N° Doc</th>

                        <th style="padding: 6px 8px; text-align: left;">Emisión</th>

                        <th style="padding: 6px 8px; text-align: left;">Vence</th>

                        <th style="padding: 6px 8px; text-align: left;">Imputación / Concepto</th>

                        <th style="padding: 6px 8px; text-align: right;">Total Factura</th>

                        <th style="padding: 6px 8px; text-align: right;">Cobrado</th>

                        <th style="padding: 6px 8px; text-align: right;">Saldo</th>

                        <th style="padding: 6px 8px; text-align: center;">Condición</th>

                    </tr>

                </thead>

                <tbody>${invRows}</tbody>

            </table>

            <!-- Detalle de Abonos y Pagos Bancarios -->

            <h3 style="font-size: 12px; font-weight: 900; color: #002B49; margin: 0 0 6px 0; text-transform: uppercase;">2. Histórico de Pagos y Abonos Registrados:</h3>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">

                <thead style="background: #f1f5f9; color: #1e293b; font-size: 10.5px; border-bottom: 2px solid #cbd5e1;">

                    <tr>

                        <th style="padding: 6px 8px; text-align: left;">N° Recibo</th>

                        <th style="padding: 6px 8px; text-align: left;">Fecha</th>

                        <th style="padding: 6px 8px; text-align: left;">Factura Aplicada</th>

                        <th style="padding: 6px 8px; text-align: left;">Forma de Pago & Referencia</th>

                        <th style="padding: 6px 8px; text-align: right;">Monto USD</th>

                        <th style="padding: 6px 8px; text-align: right;">Monto Bs.</th>

                    </tr>

                </thead>

                <tbody>${payRows}</tbody>

            </table>

            <!-- Firmas -->

            <div style="display: flex; justify-content: space-between; margin-top: 36px; padding-top: 8px;">

                <div style="text-align: center; width: 42%; border-top: 1px solid #94a3b8; padding-top: 6px; font-size: 10.5px;">

                    <b>Administración y Finanzas DALOR</b><br>Firma y Sello Oficial

                </div>

                <div style="text-align: center; width: 42%; border-top: 1px solid #94a3b8; padding-top: 6px; font-size: 10.5px;">

                    <b>${cli.name}</b><br>Recibido Conforme (Firma y Sello)

                </div>

            </div>

        </div>

        `;

        const container = document.getElementById("modalPrintPreviewContent");

        if (container) {

            container.innerHTML = printHtml;

            const titleEl = document.getElementById("previewModalTitle");

            if (titleEl) titleEl.innerText = `Estado de Cuenta - ${cli.name}`;

            if (typeof window.openModal === 'function') {

                window.openModal('modalPrintPreview');

            } else {

                document.getElementById('modalPrintPreview')?.classList.remove('hidden');

            }

        }

    } catch(err) {

        alert("Error al generar Estado de Cuenta: " + err.message);

    }

}

async function openClientStatementSelectorModal() {
    let clients = window.allClients || [];
    if (!clients || clients.length === 0) {
        try {
            const res = await authFetch(`${API_BASE}/clients/`);
            if (res.ok) {
                clients = await res.json();
                if (typeof window !== 'undefined') window.allClients = clients;
            }
        } catch (e) {
            console.error("Error loading clients for statement:", e);
        }
    }

    const selectEl = document.getElementById("statement_selector_client_id");
    if (selectEl) {
        selectEl.innerHTML = '<option value="">-- Busque o Seleccione un Cliente --</option>' + 
            (clients || []).map(c => `<option value="${c.id}">${c.name} (${c.rif || 'S/R'})</option>`).join('');
    }

    if (typeof openModal === 'function') openModal("modalClientStatementSelector");
    else if (typeof window !== 'undefined' && typeof window.openModal === 'function') window.openModal("modalClientStatementSelector");
}

function confirmGenerateClientStatement() {
    const selectEl = document.getElementById("statement_selector_client_id");
    const cid = selectEl ? parseInt(selectEl.value) : null;
    if (!cid || isNaN(cid)) {
        alert("Por favor seleccione un cliente de la lista para continuar.");
        return;
    }
    if (typeof closeModal === 'function') closeModal("modalClientStatementSelector");
    else if (typeof window !== 'undefined' && typeof window.closeModal === 'function') window.closeModal("modalClientStatementSelector");

    printClientAccountStatement(cid);
}

function checkDirectorCorrelativeAccess() {

    try {

        const u = window.currentUser || (window.State && window.State.currentUser) || JSON.parse(localStorage.getItem('dalor_user') || 'null');

        if (!u) return false;

        const uname = (u.username || '').toLowerCase();

        const role = (u.role_name || u.role || '').toLowerCase();

        const isDirector = uname === 'director' || role.includes('director') || role.includes('gerencia') || role.includes('admin') || Boolean(u.is_superuser);

        const btn = document.getElementById('btnEmergencyInvoiceOverride');

        if (btn) {

            btn.style.display = isDirector ? 'inline-flex' : 'none';

        }

        return isDirector;

    } catch(e) {

        return false;

    }

}

async function openEmergencyInvoiceOverrideModal() {

    if (!checkDirectorCorrelativeAccess()) {

        alert("Acceso exclusivo para directores y administradores generales.");

        return;

    }

    try {

        const res = await authFetch(`${API_BASE}/financial/next-invoice-code?prefix=FAC`);

        if (res.ok) {

            const data = await res.json();

            const invInput = document.getElementById('override_next_invoice_code');

            const ctrlInput = document.getElementById('override_next_control_number');

            if (invInput) invInput.value = data.next_code || '';

            if (ctrlInput) ctrlInput.value = data.next_control || '';

        }

    } catch(e) {

        console.warn("Error consultando correlativo actual:", e);

    }

    const reasonEl = document.getElementById('override_correlative_reason');

    if (reasonEl) reasonEl.value = '';

    openModal('modalEmergencyInvoiceCorrelative');

}

async function submitEmergencyInvoiceOverride(event) {

    if (event && event.preventDefault) event.preventDefault();

    const nextInv = (document.getElementById('override_next_invoice_code')?.value || '').trim();

    const nextCtrl = (document.getElementById('override_next_control_number')?.value || '').trim();

    const reason = (document.getElementById('override_correlative_reason')?.value || '').trim();

    if (!nextInv) {

        alert("Debe indicar el próximo número de factura.");

        return;

    }

    if (!reason || reason.length < 5) {

        alert("Debe indicar un motivo justificativo detallado (mínimo 5 caracteres).");

        return;

    }

    if (!confirm(`⚠️ ¿Está seguro de ajustar el correlativo fiscal a FACTURA [${nextInv}] y CONTROL [${nextCtrl || 'Sin cambio'}]?\n\nEsta acción modificará la secuencia del Libro Fiscal de Ventas.`)) {

        return;

    }

    try {

        const res = await authFetch(`${API_BASE}/financial/override-correlative`, {

            method: 'POST',

            headers: { 'Content-Type': 'application/json' },

            body: JSON.stringify({

                next_invoice_code: nextInv,

                next_control_number: nextCtrl || null,

                reason: reason

            })

        });

        const data = await res.json();

        closeModal('modalEmergencyInvoiceCorrelative');

        const cxcInv = document.getElementById('cxc_invoice_number');
        if (cxcInv && data.next_code) cxcInv.value = data.next_code;
        const cxcCtrl = document.getElementById('cxc_control_number');
        if (cxcCtrl && data.next_control) cxcCtrl.value = data.next_control;

        alert(`✅ Correlativo fiscal actualizado exitosamente por Dirección.\nPróxima Factura: ${data.next_code}\nPróximo Control: ${data.next_control}`);
    } catch(e) {
        alert("Error: " + e.message);
    }
}

// PUENTE GLOBAL WINDOW
if (typeof window !== 'undefined') {
    window.openBadDebtModal = openBadDebtModal;
    window.submitBadDebtWriteOff = submitBadDebtWriteOff;
    window.exportCxcExcel = exportCxcExcel;
    window.printClientAccountStatement = printClientAccountStatement;
    window.openClientStatementSelectorModal = openClientStatementSelectorModal;
    window.confirmGenerateClientStatement = confirmGenerateClientStatement;
    window.checkDirectorCorrelativeAccess = checkDirectorCorrelativeAccess;
    window.openEmergencyInvoiceOverrideModal = openEmergencyInvoiceOverrideModal;
    window.submitEmergencyInvoiceOverride = submitEmergencyInvoiceOverride;
}

export {
    openBadDebtModal,
    submitBadDebtWriteOff,
    exportCxcExcel,
    printClientAccountStatement,
    openClientStatementSelectorModal,
    confirmGenerateClientStatement,
    checkDirectorCorrelativeAccess,
    openEmergencyInvoiceOverrideModal,
    submitEmergencyInvoiceOverride
};
