/**
 * DALOR SIGO-P | Módulo: CXC_TIMELINE.JS
 * Línea de Tiempo de Gestión, Registro de Seguimientos y Visor de Evidencias
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


// PUENTE GLOBAL WINDOW
if (typeof window !== 'undefined') {
    window.renderCxcTimelineList = renderCxcTimelineList;
    window.formatDateTimeClean = formatDateTimeClean;
    window.viewCxcEvidence = viewCxcEvidence;
    window.clearCxcEvidenceFile = clearCxcEvidenceFile;
    window.submitCxcFollowUpLog = submitCxcFollowUpLog;
}

export {
    renderCxcTimelineList,
    formatDateTimeClean,
    viewCxcEvidence,
    clearCxcEvidenceFile,
    submitCxcFollowUpLog
};
