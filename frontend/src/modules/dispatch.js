/**
 * DALOR SIGO-P | Módulo: DISPATCH.JS
 * Control Logístico de Guías de Despacho & Formato Abierto (Libre Edición)
 */

var API_BASE = window.API_BASE || (window.location.origin + "/api/v1");
var allDispatchGuides = window.allDispatchGuides = window.allDispatchGuides || [];
var freeformItemCounter = 0;

// --- GESTIÓN DE SUBPESTAÑAS DE DESPACHO ---
function switchDispatchSubtab(subtabName) {
    const allTabs = ['list', 'freeform', 'form'];
    allTabs.forEach(t => {
        const el = document.getElementById(`subtab-disp-${t}`);
        const btn = document.getElementById(`tabbtn-disp-${t}`);
        if (el) el.classList.toggle('hidden', t !== subtabName);
        if (btn) {
            btn.className = (t === subtabName) ? 'btn-primary' : 'btn-secondary';
        }
    });

    if (subtabName === 'list') {
        loadDispatchGuidesList();
    } else if (subtabName === 'freeform') {
        initFreeformDispatch();
    } else if (subtabName === 'form') {
        initDispatchForm();
    }
}

async function initDispatchView() {
    switchDispatchSubtab('list');
    await loadDispatchGuidesList();
}

// --- CARGA Y LISTADO DE GUÍAS DE TRASLADO ---
async function loadDispatchGuidesList() {
    const tbody = document.getElementById("dispatchTableBody");
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 25px; color: #94a3b8;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando despachos y traslados...</td></tr>`;

    try {
        const token = window.authToken || localStorage.getItem('dalor_token') || null;
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        const res = await fetch(`${API_BASE}/dispatch/`, { headers });
        if (!res.ok) throw new Error("Error al consultar guías");

        allDispatchGuides = window.allDispatchGuides = await res.json();
        const badge = document.getElementById("dispatch_count_badge");
        if (badge) badge.innerText = `${allDispatchGuides.length} Guía(s) Registrada(s)`;

        renderDispatchTable(allDispatchGuides);
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 20px; color: #e11d48; font-weight: 600;">Error: ${e.message}</td></tr>`;
    }
}

function renderDispatchTable(guides) {
    const tbody = document.getElementById("dispatchTableBody");
    if (!tbody) return;

    if (!guides || guides.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 30px; color: #64748b;">
            <i class="fa-solid fa-truck-ramp-box" style="font-size: 32px; color: #cbd5e1; margin-bottom: 8px; display: block;"></i>
            <span style="font-size: 13px; font-weight: 700;">No hay guías de despacho emitidas todavía.</span><br>
            <span style="font-size: 11px; color: #94a3b8;">Usa el botón "📝 Emitir Guía Formato Abierto" para redactar una salida libre editable.</span>
        </td></tr>`;
        return;
    }

    tbody.innerHTML = guides.map(g => {
        let statusBadge = `<span style="background: #e0f2fe; color: #0369a1; padding: 3px 8px; border-radius: 6px; font-weight: 800; font-size: 10.5px;"><i class="fa-solid fa-truck"></i> En Tránsito</span>`;
        if (g.status === 'entregado_conforme') {
            statusBadge = `<span style="background: #dcfce7; color: #166534; padding: 3px 8px; border-radius: 6px; font-weight: 800; font-size: 10.5px;"><i class="fa-solid fa-check-double"></i> Entregado Conforme</span>`;
        }

        const isFree = g.is_freeform;
        const typeBadge = isFree
            ? `<span style="background: #fef3c7; color: #92400e; font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 4px;">📝 Formato Abierto</span>`
            : `<span style="background: #f1f5f9; color: #475569; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px;">🏢 Estándar Obra</span>`;

        const reasonBadge = g.transfer_reason 
            ? `<span style="display: block; font-size: 10.5px; color: #0284c7; font-weight: 700;">📌 ${g.transfer_reason}</span>`
            : '';

        const clientDisplay = g.recipient_name || g.client_name || "Destinatario Libre";

        return `
            <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.15s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='white'">
                <td style="padding: 10px; font-weight: 800; color: var(--dalor-navy); font-size: 12px;">
                    ${g.guide_number}
                    <div style="margin-top: 3px;">${typeBadge}</div>
                </td>
                <td style="padding: 10px; color: #475569; font-size: 11px;">${g.dispatch_date || '-'}</td>
                <td style="padding: 10px;">
                    <b style="color: var(--dalor-navy); font-size: 12px;">${clientDisplay}</b>
                    ${reasonBadge}
                    <small style="display: block; color: #64748b; font-size: 10.5px;">${g.destination_plant ? g.destination_plant + ' - ' : ''}${g.destination_address}</small>
                </td>
                <td style="padding: 10px; font-size: 11.5px;">
                    <span style="font-weight: 700; color: var(--dalor-blue);">${g.project_code || 'S/P'}</span>
                    <small style="display: block; color: #64748b;">${g.project_name || 'Traslado Libre / Directo'}</small>
                </td>
                <td style="padding: 10px; font-size: 11px;">
                    <div>Placa: <b>${g.vehicle_plate || 'S/P'}</b></div>
                    <small style="color: #64748b;">Chofer: ${g.driver_name} (${g.driver_id_doc})</small>
                </td>
                <td style="padding: 10px; text-align: center;">
                    <span style="background: #f1f5f9; padding: 3px 8px; border-radius: 6px; font-weight: 800; color: #334155; font-size: 11px;">
                        ${g.items_count} ítem(s)
                    </span>
                </td>
                <td style="padding: 10px; text-align: right; font-weight: 700; font-size: 11px; color: ${g.freight_cost_usd > 0 ? '#dc2626' : '#64748b'};">
                    ${g.freight_cost_usd > 0 ? '$' + g.freight_cost_usd.toFixed(2) : '$0.00'}
                </td>
                <td style="padding: 10px; text-align: center;">${statusBadge}</td>
                <td style="padding: 10px; text-align: center; white-space: nowrap;">
                    <button type="button" onclick="printOfficialDispatchGuide(${g.id})" class="btn-primary" style="padding: 4px 8px; font-size: 11px; background: #0284c7; border-radius: 6px;" title="Ver / Imprimir Guía">
                        <i class="fa-solid fa-print"></i>
                    </button>
                    ${g.status !== 'entregado_conforme' ? `
                        <button type="button" onclick="openConfirmDeliveryModal(${g.id}, '${g.guide_number}')" class="btn-primary" style="padding: 4px 8px; font-size: 11px; background: #059669; border-radius: 6px;" title="Confirmar Recepción Conforme">
                            <i class="fa-solid fa-check"></i>
                        </button>
                    ` : ''}
                    <button type="button" onclick="deleteDispatchGuide(${g.id})" class="btn-secondary" style="padding: 4px 8px; font-size: 11px; color: #ef4444; border-color: #fecaca; border-radius: 6px;" title="Anular Guía">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function filterDispatchList(query) {
    const q = (query || '').toLowerCase().trim();
    if (!q) {
        renderDispatchTable(allDispatchGuides);
        return;
    }
    const filtered = allDispatchGuides.filter(g => 
        g.guide_number.toLowerCase().includes(q) ||
        (g.recipient_name && g.recipient_name.toLowerCase().includes(q)) ||
        (g.client_name && g.client_name.toLowerCase().includes(q)) ||
        (g.driver_name && g.driver_name.toLowerCase().includes(q)) ||
        (g.vehicle_plate && g.vehicle_plate.toLowerCase().includes(q)) ||
        (g.transfer_reason && g.transfer_reason.toLowerCase().includes(q))
    );
    renderDispatchTable(filtered);
}

// --- GUÍA DE FORMATO ABIERTO (LIBRE EDICIÓN) ---
function initFreeformDispatch() {
    const form = document.getElementById("freeformDispatchForm");
    if (form) form.reset();

    const dateInp = document.getElementById("disp_ff_date");
    if (dateInp) {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        dateInp.value = now.toISOString().slice(0, 16);
    }

    const tbody = document.getElementById("freeformDispatchItemsTableBody");
    if (tbody) {
        tbody.innerHTML = "";
        freeformItemCounter = 0;
        addFreeformDispatchItemRow();
    }
}

function addFreeformDispatchItemRow() {
    freeformItemCounter++;
    const tbody = document.getElementById("freeformDispatchItemsTableBody");
    if (!tbody) return;

    const rowId = `ff_disp_row_${freeformItemCounter}`;
    const tr = document.createElement("tr");
    tr.id = rowId;
    tr.className = "dispatch-item-row";
    tr.style.borderBottom = "1px solid #e2e8f0";

    tr.innerHTML = `
        <td style="padding: 8px; text-align: center; font-weight: 800; color: #64748b;">${freeformItemCounter}</td>
        <td style="padding: 8px;">
            <input type="text" class="disp-it-desc form-input" placeholder="Descripción detallada de la pieza, máquina o insumo *" required style="font-size: 11.5px; padding: 5px 8px; width: 100%;">
        </td>
        <td style="padding: 8px; width: 90px;">
            <input type="number" step="0.01" class="disp-it-qty form-input" value="1.0" required style="font-size: 11.5px; padding: 5px; text-align: center; font-weight: 700; width: 100%;">
        </td>
        <td style="padding: 8px; width: 110px;">
            <select class="disp-it-unit form-select" style="font-size: 11px; padding: 5px; width: 100%;">
                <option value="Pzas">Pzas</option>
                <option value="Global">Global</option>
                <option value="Kg">Kg</option>
                <option value="Ton">Ton</option>
                <option value="Mts">Mts</option>
                <option value="Tramos">Tramos</option>
                <option value="Juegos">Juegos</option>
                <option value="Tambores">Tambores</option>
            </select>
        </td>
        <td style="padding: 8px; width: 180px;">
            <input type="text" class="disp-it-cond form-input" value="Reparado / Listo p/ Montaje" placeholder="Estado físico" style="font-size: 11px; padding: 5px 8px; width: 100%;">
        </td>
        <td style="padding: 8px; width: 100px;">
            <input type="number" step="0.1" class="disp-it-weight form-input" placeholder="0.0" value="0.0" style="font-size: 11px; padding: 5px; text-align: right; width: 100%;">
        </td>
        <td style="padding: 8px; width: 40px; text-align: center;">
            <button type="button" onclick="removeFreeformDispatchItemRow('${rowId}')" style="background: none; border: none; color: #ef4444; font-size: 16px; cursor: pointer;">&times;</button>
        </td>
    `;
    tbody.appendChild(tr);
}

function removeFreeformDispatchItemRow(rowId) {
    const row = document.getElementById(rowId);
    if (row) row.remove();
}

async function submitFreeformDispatch(event) {
    if (event && event.preventDefault) event.preventDefault();

    const recipient = document.getElementById("disp_ff_recipient")?.value?.trim();
    if (!recipient) {
        alert("Por favor indica el Destinatario / Empresa / Cliente receptor.");
        return;
    }

    const destAddr = document.getElementById("disp_ff_destination")?.value?.trim();
    if (!destAddr) {
        alert("Por favor indica la Dirección o Lugar de Destino.");
        return;
    }

    const driverName = document.getElementById("disp_ff_driver_name")?.value?.trim() || "Chofer Taller";
    const driverDoc = document.getElementById("disp_ff_driver_id")?.value?.trim() || "V-00000000";
    const plate = document.getElementById("disp_ff_vehicle_plate")?.value?.trim().toUpperCase() || "SIN-PLACA";

    const itemRows = document.querySelectorAll("#freeformDispatchItemsTableBody .dispatch-item-row");
    if (itemRows.length === 0) {
        alert("Debes agregar al menos un renglón de carga para emitir la guía.");
        return;
    }

    const items = [];
    itemRows.forEach((row, idx) => {
        items.push({
            item_number: idx + 1,
            description: row.querySelector(".disp-it-desc").value.trim(),
            quantity: parseFloat(row.querySelector(".disp-it-qty").value) || 1.0,
            unit: row.querySelector(".disp-it-unit").value,
            condition_status: row.querySelector(".disp-it-cond").value.trim() || "Conforme",
            approx_weight_kg: parseFloat(row.querySelector(".disp-it-weight").value) || 0.0
        });
    });

    const payload = {
        is_freeform: true,
        recipient_name: recipient,
        transfer_reason: document.getElementById("disp_ff_reason")?.value?.trim() || "Despacho de Producción",
        destination_address: destAddr,
        destination_plant: document.getElementById("disp_ff_plant")?.value?.trim() || null,
        transport_type: document.getElementById("disp_ff_transport_type")?.value || "propio_dalor",
        carrier_company: document.getElementById("disp_ff_carrier_company")?.value?.trim() || null,
        driver_name: driverName,
        driver_id_doc: driverDoc,
        driver_phone: document.getElementById("disp_ff_driver_phone")?.value?.trim() || null,
        vehicle_model: document.getElementById("disp_ff_vehicle_model")?.value?.trim() || "Camioneta Taller",
        vehicle_plate: plate,
        freight_cost_usd: parseFloat(document.getElementById("disp_ff_freight_cost")?.value || 0) || 0.0,
        freight_price_charged_usd: 0.0,
        dispatcher_name: document.getElementById("disp_ff_dispatcher")?.value?.trim() || "Despacho Taller Guacara",
        quality_inspector: document.getElementById("disp_ff_inspector")?.value?.trim() || "Control de Calidad DALOR",
        notes: document.getElementById("disp_ff_notes")?.value?.trim() || null,
        items: items
    };

    try {
        const token = window.authToken || localStorage.getItem('dalor_token') || null;
        const res = await fetch(`${API_BASE}/dispatch/`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Error al emitir guía");

        alert(`✅ Guía de Despacho de Formato Abierto [${data.guide_number}] emitida con éxito.`);
        switchDispatchSubtab('list');
        await loadDispatchGuidesList();

        if (data.id) {
            printOfficialDispatchGuide(data.id);
        }
    } catch (e) {
        alert("Error al guardar: " + e.message);
    }
}

// --- VISUALIZACIÓN E IMPRESIÓN OFICIAL DE GUÍA DE DESPACHO ---
async function printOfficialDispatchGuide(guideId) {
    try {
        const token = window.authToken || localStorage.getItem('dalor_token') || null;
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        const res = await fetch(`${API_BASE}/dispatch/${guideId}`, { headers });
        if (!res.ok) throw new Error("No se pudo cargar la guía");
        const g = await res.json();

        const recipientDisplay = g.recipient_name || g.client_name || "Destinatario Particular";
        const reasonDisplay = g.transfer_reason || "Despacho de Producción";

        const itemsHtml = g.items.map((it, idx) => `
            <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
                <td style="padding: 6px 8px; text-align: center; font-weight: 800; color: #475569;">${idx + 1}</td>
                <td style="padding: 6px 8px; font-weight: 700; color: #0f172a;">${it.description}</td>
                <td style="padding: 6px 8px; text-align: center; font-weight: 800;">${it.quantity}</td>
                <td style="padding: 6px 8px; text-align: center; color: #475569;">${it.unit}</td>
                <td style="padding: 6px 8px; color: #334155;">${it.condition_status || 'Conforme'}</td>
                <td style="padding: 6px 8px; text-align: right; color: #64748b;">${it.approx_weight_kg > 0 ? it.approx_weight_kg + ' Kg' : '-'}</td>
            </tr>
        `).join('');

        const sheetHtml = `
            <div style="background: white; padding: 25px; border-radius: 8px; font-family: 'Inter', sans-serif; color: #1e293b; max-width: 800px; margin: 0 auto; line-height: 1.4;">
                <!-- ENCABEZADO FORMAL INSTITUCIONAL DALOR -->
                <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #F5B800; padding-bottom: 12px; margin-bottom: 14px;">
                    <div style="display: flex; align-items: center; gap: 14px;">
                        <img src="logo_dalor.jpg" alt="DALOR" style="height: 52px; max-width: 140px; object-fit: contain;" onerror="this.style.display='none'">
                        <div>
                            <h2 style="margin: 0; font-size: 18px; font-weight: 900; color: #002B49; letter-spacing: -0.5px; text-transform: uppercase;">Metalmecánica Dalor, C.A.</h2>
                            <p style="margin: 2px 0 0; font-size: 11px; color: #0284c7; font-weight: 700;">RIF: J-31601195-0 &bull; Zona Ind. Pruinca, Guacara, Edo. Carabobo</p>
                            <p style="margin: 1px 0 0; font-size: 10px; color: #64748b;">Fabricación, Metalmecánica, Montajes Industriales & Obras</p>
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="background: #002B49; color: white; padding: 5px 14px; border-radius: 6px; font-size: 13px; font-weight: 900; display: inline-block; border-left: 4px solid #F5B800;">
                            GUÍA DE TRASLADO &bull; ${g.guide_number}
                        </div>
                        <p style="margin: 4px 0 0; font-size: 11px; font-weight: 700; color: #0284c7;">Fecha: ${g.dispatch_date || 'Inmediata'}</p>
                        <span style="display: inline-block; background: #e0f2fe; color: #0369a1; font-size: 10.5px; font-weight: 800; padding: 2px 8px; border-radius: 4px; margin-top: 3px;">
                            ${reasonDisplay}
                        </span>
                    </div>
                </div>

                <!-- DATOS DEL DESTINATARIO Y TRANSPORTE -->
                <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 14px; margin-bottom: 14px; background: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 11px;">
                    <div>
                        <span style="font-size: 10px; text-transform: uppercase; font-weight: 800; color: #64748b; display: block;">Destinatario / Receptor:</span>
                        <strong style="font-size: 13px; color: #002B49;">${recipientDisplay}</strong>
                        <p style="margin: 3px 0 0; color: #475569;"><b>Destino:</b> ${g.destination_plant ? g.destination_plant + ' - ' : ''}${g.destination_address}</p>
                        <p style="margin: 2px 0 0; color: #64748b;"><b>Obra / Servicio:</b> ${g.project_name || 'Despacho Directo / Sin Obra'}</p>
                    </div>
                    <div>
                        <span style="font-size: 10px; text-transform: uppercase; font-weight: 800; color: #64748b; display: block;">Transporte & Conductor:</span>
                        <p style="margin: 2px 0 0; color: #1e293b;"><b>Chofer:</b> ${g.driver_name} (C.I. ${g.driver_id_doc})</p>
                        <p style="margin: 2px 0 0; color: #1e293b;"><b>Vehículo:</b> ${g.vehicle_model || 'Unidad DALOR'} &bull; <b>Placa:</b> ${g.vehicle_plate}</p>
                        <p style="margin: 2px 0 0; color: #64748b;"><b>Modalidad:</b> ${g.transport_type === 'propio_dalor' ? 'Flota DALOR' : (g.transport_type === 'tercerizado_flete' ? 'Flete Tercerizado' : 'Retiro en Taller')}</p>
                    </div>
                </div>

                <!-- TABLA DE RENGLONES -->
                <div style="margin-bottom: 16px;">
                    <table style="width: 100%; border-collapse: collapse; border: 1px solid #cbd5e1;">
                        <thead>
                            <tr style="background: #002B49; color: white; font-size: 10.5px; text-transform: uppercase;">
                                <th style="padding: 7px; width: 30px; text-align: center;">#</th>
                                <th style="padding: 7px; text-align: left;">Descripción de la Carga / Pieza / Equipo</th>
                                <th style="padding: 7px; width: 60px; text-align: center;">Cant</th>
                                <th style="padding: 7px; width: 70px; text-align: center;">Unidad</th>
                                <th style="padding: 7px; width: 140px; text-align: left;">Estado / Condición</th>
                                <th style="padding: 7px; width: 80px; text-align: right;">Peso Aprox</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsHtml}
                        </tbody>
                    </table>
                </div>

                ${g.notes ? `
                    <div style="background: #fffbeb; border: 1px solid #fde68a; padding: 8px 12px; border-radius: 6px; font-size: 10.5px; color: #92400e; margin-bottom: 16px;">
                        <b>Observaciones:</b> ${g.notes}
                    </div>
                ` : ''}

                <!-- CAJAS DE FIRMA Y RECEPCIÓN -->
                <div style="margin-top: 30px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; text-align: center; font-size: 10px;">
                    <div style="border-top: 1px solid #002B49; padding-top: 6px;">
                        <strong style="color: #002B49; display: block;">Despachado por DALOR</strong>
                        <span style="color: #64748b;">${g.dispatcher_name || 'Despacho Taller Guacara'}</span>
                    </div>
                    <div style="border-top: 1px solid #002B49; padding-top: 6px;">
                        <strong style="color: #002B49; display: block;">Transportado por (Chofer)</strong>
                        <span style="color: #64748b;">${g.driver_name} (Firma)</span>
                    </div>
                    <div style="border-top: 1px solid #002B49; padding-top: 6px;">
                        <strong style="color: #002B49; display: block;">Recibido Conforme (Cliente)</strong>
                        <span style="color: #64748b;">${g.received_by_client_name ? g.received_by_client_name + ' (Sello & Firma)' : 'Nombre, Firma y Sello'}</span>
                    </div>
                </div>
            </div>
        `;

        const container = document.getElementById("modalPrintPreviewContent") || document.getElementById("dispatchPrintPreviewBox");
        if (container) {
            container.innerHTML = sheetHtml;
            const titleEl = document.getElementById("previewModalTitle");
            if (titleEl) titleEl.innerText = `Guía de Despacho Oficial ${g.guide_number}`;
            window.openModal?.('modalPrintPreview');
        } else {
            // Ventana emergente de impresión
            const printWin = window.open('', '_blank');
            printWin.document.write(`<html><head><title>${g.guide_number}</title><style>@media print { body { -webkit-print-color-adjust: exact; } }</style></head><body>${sheetHtml}</body></html>`);
            printWin.document.close();
            printWin.focus();
            setTimeout(() => { printWin.print(); }, 400);
        }
    } catch (e) {
        alert("Error al cargar comprobante de guía: " + e.message);
    }
}

// --- CONFIRMAR ENTREGA Y ANULAR ---
function openConfirmDeliveryModal(guideId, guideNum) {
    const idInp = document.getElementById("conf_disp_id");
    if (idInp) idInp.value = guideId;
    const txt = document.getElementById("conf_disp_guide_text");
    if (txt) txt.innerText = `Registra los datos de la persona que recibió conforme la guía [${guideNum}] en destino:`;
    window.openModal?.('modalConfirmDelivery');
}

async function submitConfirmDelivery(event) {
    if (event && event.preventDefault) event.preventDefault();
    const guideId = document.getElementById("conf_disp_id")?.value;
    if (!guideId) return;

    const payload = {
        received_by_client_name: document.getElementById("conf_received_by")?.value?.trim() || "Receptor Conforme",
        received_by_client_id_doc: document.getElementById("conf_received_id_doc")?.value?.trim() || "V-...",
        notes: document.getElementById("conf_notes")?.value?.trim() || ""
    };

    try {
        const token = window.authToken || localStorage.getItem('dalor_token') || null;
        const res = await fetch(`${API_BASE}/dispatch/${guideId}/confirm-delivery`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Error al confirmar");

        window.closeModal?.('modalConfirmDelivery');
        loadDispatchGuidesList();
        alert(data.message || "Entrega confirmada con éxito.");
    } catch (e) {
        alert("Error: " + e.message);
    }
}

async function deleteDispatchGuide(guideId) {
    if (!confirm("¿Estás seguro de anular esta Guía de Despacho?")) return;
    try {
        const token = window.authToken || localStorage.getItem('dalor_token') || null;
        const res = await fetch(`${API_BASE}/dispatch/${guideId}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Error al anular");

        loadDispatchGuidesList();
        alert(data.message || "Guía anulada correctamente.");
    } catch (e) {
        alert("Error al anular: " + e.message);
    }
}

// Exportar al scope global
if (typeof window !== 'undefined') {
    window.switchDispatchSubtab = switchDispatchSubtab;
    window.initDispatchView = initDispatchView;
    window.loadDispatchGuidesList = loadDispatchGuidesList;
    window.filterDispatchList = filterDispatchList;
    window.initFreeformDispatch = initFreeformDispatch;
    window.addFreeformDispatchItemRow = addFreeformDispatchItemRow;
    window.removeFreeformDispatchItemRow = removeFreeformDispatchItemRow;
    window.submitFreeformDispatch = submitFreeformDispatch;
    window.printOfficialDispatchGuide = printOfficialDispatchGuide;
    window.openConfirmDeliveryModal = openConfirmDeliveryModal;
    window.submitConfirmDelivery = submitConfirmDelivery;
    window.deleteDispatchGuide = deleteDispatchGuide;
}

export { 
    switchDispatchSubtab, initDispatchView, loadDispatchGuidesList, 
    filterDispatchList, initFreeformDispatch, addFreeformDispatchItemRow, 
    removeFreeformDispatchItemRow, submitFreeformDispatch, printOfficialDispatchGuide, 
    openConfirmDeliveryModal, submitConfirmDelivery, deleteDispatchGuide 
};
