/**
 * DALOR SIGO-P | Módulo: RENTALS_PRINT.JS
 * Generador e impresión oficial de Guías de Entrega y Despacho de Alquiler o Préstamo (Comodato).
 */

var API_BASE = window.API_BASE || (window.location.origin + "/api/v1");

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

export async function printRentalDeliveryNote(rentalId) {
    try {
        const token = window.authToken || localStorage.getItem('dalor_token') || null;
        const res = await authFetch(`${API_BASE}/rentals/${rentalId}/delivery-note`, {
            headers: token ? { "Authorization": `Bearer ${token}` } : {}
        });

        if (!res.ok) throw new Error("No se pudo obtener la nota de entrega");
        const g = await res.json();

        const itemsHtml = g.items.map((it, idx) => `
            <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
                <td style="padding: 6px 8px; text-align: center; font-weight: 800; color: #475569;">${idx + 1}</td>
                <td style="padding: 6px 8px; font-weight: 700; color: #0f172a;">${it.name}</td>
                <td style="padding: 6px 8px; font-size: 10px; color: #64748b; font-family: monospace;">${it.code || '-'}</td>
                <td style="padding: 6px 8px; text-align: center; font-weight: 800; color: #0284c7;">${it.quantity}</td>
                <td style="padding: 6px 8px; text-align: center; color: #475569;">${it.unit}</td>
                <td style="padding: 6px 8px; color: #334155;">${it.condition || 'Operativo Conforme'}</td>
                <td style="padding: 6px 8px; text-align: center; font-weight: 700; color: ${it.status === 'devuelto_total' ? '#059669' : '#0369a1'};">
                    ${it.status === 'devuelto_total' ? 'Devuelto' : 'En Custodia'}
                </td>
            </tr>
        `).join('');

        const sheetHtml = `
            <div style="background: white; padding: 25px; border-radius: 8px; font-family: 'Inter', sans-serif; color: #1e293b; max-width: 820px; margin: 0 auto; line-height: 1.4;">
                <!-- ENCABEZADO OFICIAL DALOR -->
                <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #F5B800; padding-bottom: 12px; margin-bottom: 14px;">
                    <div style="display: flex; align-items: center; gap: 14px;">
                        <img src="logo_dalor.jpg" alt="DALOR" style="height: 52px; max-width: 140px; object-fit: contain;" onerror="this.style.display='none'">
                        <div>
                            <h2 style="margin: 0; font-size: 18px; font-weight: 900; color: #002B49; letter-spacing: -0.5px; text-transform: uppercase;">Metalmecánica Dalor, C.A.</h2>
                            <p style="margin: 2px 0 0; font-size: 11px; color: #0284c7; font-weight: 700;">RIF: J-31601195-0 &bull; Av. Cámara de las Industrias, Galpón 10, Zona Industrial El Tigre, Guacara, Edo. Carabobo</p>
                            <p style="margin: 1px 0 0; font-size: 10px; color: #64748b;">Fabricación, Metalmecánica, Montajes Industriales, Equipos & Obras</p>
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="background: #002B49; color: white; padding: 6px 14px; border-radius: 6px; font-size: 13px; font-weight: 900; display: inline-block; border-left: 4px solid #F5B800;">
                            ${g.guide_number}
                        </div>
                        <p style="margin: 4px 0 0; font-size: 11px; font-weight: 800; color: #0284c7;">${g.guide_type}</p>
                        <span style="display: inline-block; background: #e0f2fe; color: #0369a1; font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: 4px; margin-top: 3px;">
                            ${g.direction_label}
                        </span>
                    </div>
                </div>

                <!-- DATOS DE ENTREGA Y DESTINATARIO -->
                <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 14px; margin-bottom: 14px; background: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 11px;">
                    <div>
                        <span style="font-size: 10px; text-transform: uppercase; font-weight: 800; color: #64748b; display: block;">Destinatario / Contraparte:</span>
                        <strong style="font-size: 13px; color: #002B49;">${g.external_entity}</strong>
                        <p style="margin: 3px 0 0; color: #475569;"><b>Contacto:</b> ${g.contact_person} &bull; <b>Tel:</b> ${g.contact_phone}</p>
                        <p style="margin: 2px 0 0; color: #0284c7;"><b>Destino / Obra de Referencia:</b> ${g.destination_reference}</p>
                    </div>
                    <div>
                        <span style="font-size: 10px; text-transform: uppercase; font-weight: 800; color: #64748b; display: block;">Plazos & Modalidad:</span>
                        <p style="margin: 2px 0 0; color: #1e293b;"><b>Fecha de Salida / Emisión:</b> ${g.dispatch_date}</p>
                        <p style="margin: 2px 0 0; color: #1e293b;"><b>Fecha Límite Prevista:</b> ${g.expected_return_date}</p>
                        <p style="margin: 2px 0 0; color: #64748b;"><b>Régimen Financiero:</b> ${g.operation_type === 'prestamo' ? 'Préstamo sin costo / Comodato' : `Alquiler ($${g.rate_usd}/${g.rate_period})`}</p>
                    </div>
                </div>

                <!-- TABLA DE RENGLONES -->
                <div style="margin-bottom: 16px;">
                    <table style="width: 100%; border-collapse: collapse; border: 1px solid #cbd5e1;">
                        <thead>
                            <tr style="background: #002B49; color: white; font-size: 10.5px; text-transform: uppercase;">
                                <th style="padding: 7px; width: 30px; text-align: center;">#</th>
                                <th style="padding: 7px; text-align: left;">Descripción del Recurso / Activo / Material</th>
                                <th style="padding: 7px; width: 90px; text-align: left;">Serial / Placa / Cód</th>
                                <th style="padding: 7px; width: 50px; text-align: center;">Cant</th>
                                <th style="padding: 7px; width: 60px; text-align: center;">Unidad</th>
                                <th style="padding: 7px; width: 140px; text-align: left;">Condición al Salir</th>
                                <th style="padding: 7px; width: 85px; text-align: center;">Estatus</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsHtml}
                        </tbody>
                    </table>
                </div>

                ${g.notes ? `
                    <div style="background: #fffbeb; border: 1px solid #fde68a; padding: 8px 12px; border-radius: 6px; font-size: 10.5px; color: #92400e; margin-bottom: 16px;">
                        <b>Observaciones / Cláusulas:</b> ${g.notes}
                    </div>
                ` : ''}

                <!-- CAJAS DE FIRMA Y RECEPCIÓN -->
                <div style="margin-top: 35px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; text-align: center; font-size: 10px;">
                    <div style="border-top: 1.5px solid #002B49; padding-top: 6px;">
                        <strong style="color: #002B49; display: block;">Despachado por DALOR</strong>
                        <span style="color: #334155; font-weight: 700; display: block; margin-top: 2px;">${g.dispatcher_name}</span>
                        <span style="color: #64748b; font-size: 9px;">Almacén & Custodia Central Guacara</span>
                    </div>
                    <div style="border-top: 1.5px solid #002B49; padding-top: 6px;">
                        <strong style="color: #002B49; display: block;">Transportado por / Custodio</strong>
                        <span style="color: #334155; font-weight: 700; display: block; margin-top: 2px;">Chofer / Cuadrilla</span>
                        <span style="color: #64748b; font-size: 9px;">Nombre, C.I. y Firma</span>
                    </div>
                    <div style="border-top: 1.5px solid #002B49; padding-top: 6px;">
                        <strong style="color: #002B49; display: block;">Recibido Conforme (Receptor)</strong>
                        <span style="color: #334155; font-weight: 700; display: block; margin-top: 2px;">${g.receiver_name}</span>
                        <span style="color: #64748b; font-size: 9px;">Nombre, C.I., Firma y Sello</span>
                    </div>
                </div>

                <!-- COLETILLA LEGAL SENIAT / TRÁNSITO -->
                <div style="margin-top: 22px; border-top: 1px dashed #cbd5e1; padding-top: 6px; font-size: 9px; color: #64748b; text-align: justify; line-height: 1.3;">
                    <b>VALIDEZ Y CONTROL:</b> La presente <b>Guía de Traslado y Entrega de Equipos</b> ampara la salida, movilización y asignación temporal en comodato/alquiler de los activos y materiales industriales descritos. El receptor asume la custodia integral, buen uso y obligación de devolución en las fechas convenidas en idénticas condiciones operativas.
                </div>
            </div>
        `;

        const printWin = window.open('', '_blank');
        printWin.document.write(`
            <html>
                <head>
                    <title>${g.guide_number} - Guía Oficial Metalmecánica Dalor C.A.</title>
                    <style>
                        body { margin: 0; padding: 20px; background: #f8fafc; font-family: sans-serif; }
                        @media print {
                            body { background: #fff; padding: 0; }
                            @page { margin: 10mm; }
                        }
                    </style>
                </head>
                <body>
                    ${sheetHtml}
                    <script>
                        window.onload = function() { window.print(); }
                    </script>
                </body>
            </html>
        `);
        printWin.document.close();
    } catch (e) {
        alert("Error al generar guía de entrega: " + e.message);
    }
}

// PUENTE GLOBAL WINDOW
if (typeof window !== 'undefined') {
    window.printRentalDeliveryNote = printRentalDeliveryNote;
}
