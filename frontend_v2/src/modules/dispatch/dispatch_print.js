/**
 * DALOR SIGO-P | Módulo: DISPATCH_PRINT.JS
 * Generador e impresión oficial de Guías de Despacho DALOR (Formato SENIAT & Control Interno).
 */

var API_BASE = window.API_BASE || (window.location.origin + "/api/v1");

function authFetch(url, options = {}) {
    var _t = sessionStorage.getItem('dalor_token') || localStorage.getItem('dalor_token') || '';
    var _h = Object.assign({}, options.headers || {});
    if (_t) _h['Authorization'] = 'Bearer ' + _t;
    return window.fetch(url, Object.assign({}, options, { headers: _h }));
}

// ==============================================================================
// GUÍA OFICIAL IMPRIMIBLE (DOCUMENTO DALOR CON RIF J-31601195-0)
// ==============================================================================
export async function printOfficialDispatchGuide(guideId) {
    try {
        const res = await authFetch(`${API_BASE}/dispatch/${guideId}`);
        if (!res.ok) throw new Error('No se pudo cargar la información de la guía.');
        const g = await res.json();

        const fullLoc = `${g.destination_address || ''} ${g.destination_plant || ''} ${g.project_location || ''} ${g.project_name || ''} ${g.transfer_reason || ''}`.toLowerCase();
        const isInternal = (
            g.guide_type === 'control_interno' || 
            (g.guide_number && g.guide_number.startsWith('GCI-')) ||
            g.transport_type === 'interno' ||
            fullLoc.includes('sede dalor') ||
            fullLoc.includes('sede central') ||
            fullLoc.includes('taller guacara')
        );
        const isFreeform = !!g.is_freeform;
        const clientName = isFreeform ? (g.recipient_name || 'Destinatario Libre') : (g.client_name || 'Cliente DALOR');
        const motiveDisplay = isFreeform ? (g.transfer_reason || 'Traslado Libre') : (`${g.project_code || 'PRJ'} - ${g.project_name || 'Servicio de Taller'}`);

        let itemsHtml = (g.items && g.items.length > 0) ? g.items.map((it, idx) => `
            <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
                <td style="padding: 7px 8px; text-align: center; font-weight: 800; color: #475569;">${idx + 1}</td>
                <td style="padding: 7px 8px; font-weight: 700; color: #0f172a;">${it.description}</td>
                <td style="padding: 7px 8px; text-align: right; font-weight: 800; color: #002B49;">${it.quantity}</td>
                <td style="padding: 7px 8px; text-align: center;"><span style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600;">${it.unit || 'UND'}</span></td>
                <td style="padding: 7px 8px; color: #334155;">${it.condition_status || (isInternal ? 'Operativo / En Custodia' : 'Listo para Montaje')}</td>
                <td style="padding: 7px 8px; text-align: right; color: #64748b;">${it.approx_weight_kg ? it.approx_weight_kg.toFixed(2) + ' Kg' : '-'}</td>
            </tr>
        `).join('') : `<tr><td colspan="6" style="padding: 14px; text-align: center; color: #64748b;">Sin renglones especificados</td></tr>`;

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('Por favor habilita las ventanas emergentes (pop-ups) para imprimir el documento.');
            return;
        }

        const docTitle = isInternal 
            ? `Vale de Control Interno ${g.guide_number} - DALOR`
            : `Guía Oficial de Traslado ${g.guide_number} - DALOR`;

        const guideTypeLabel = isInternal
            ? 'VALE DE CONTROL INTERNO'
            : 'GUÍA OFICIAL DE TRASLADO Y NOTA DE ENTREGA';

        const directionLabel = isInternal
            ? ''
            : (isFreeform ? '📦 DESPACHO LIBRE / TRASLADO EXTERNO' : '🏗️ DESPACHO A OBRA FORÁNEA');

        const infoCardsHtml = isInternal ? `
            <div>
                <span style="font-size: 10px; text-transform: uppercase; font-weight: 800; color: #64748b; display: block;">Obra / Destino:</span>
                <strong style="font-size: 13px; color: #002B49;">${g.project_name ? `[${g.project_code || 'PRJ'}] ${g.project_name}` : (g.destination_plant || 'Sede Central')}</strong>
                <p style="margin: 3px 0 0; color: #475569;"><b>Ubicación:</b> Sede Central</p>
                <p style="margin: 2px 0 0; color: #0284c7;"><b>Motivo:</b> ${g.transfer_reason || 'Entrega interna de insumos de pañol'}</p>
            </div>
            <div>
                <span style="font-size: 10px; text-transform: uppercase; font-weight: 800; color: #64748b; display: block;">Datos de Emisión & Custodia:</span>
                <p style="margin: 2px 0 0; color: #1e293b;"><b>Fecha de Entrega:</b> ${g.dispatch_date || new Date().toLocaleDateString('es-VE')}</p>
                <p style="margin: 2px 0 0; color: #1e293b;"><b>Despachado por:</b> ${g.delivered_by_staff || g.dispatcher_name || 'Custodio de Almacén Dalor'}</p>
                <p style="margin: 2px 0 0; color: #059669; font-weight: 700;"><b>Recibido por:</b> ${g.received_by_staff || 'Personal de Taller / Responsable de Trabajo'}</p>
            </div>
        ` : `
            <div>
                <span style="font-size: 10px; text-transform: uppercase; font-weight: 800; color: #64748b; display: block;">Destinatario / Contraparte:</span>
                <strong style="font-size: 13px; color: #002B49;">${clientName}</strong>
                <p style="margin: 3px 0 0; color: #475569;"><b>Planta / Destino:</b> ${g.destination_plant || 'Recepción en Sitio'}</p>
                <p style="margin: 2px 0 0; color: #475569;"><b>Dirección:</b> ${g.destination_address || 'Sin dirección especificada'}</p>
                <p style="margin: 2px 0 0; color: #0284c7;"><b>Obra / Motivo:</b> ${motiveDisplay}</p>
            </div>
            <div>
                <span style="font-size: 10px; text-transform: uppercase; font-weight: 800; color: #64748b; display: block;">Transporte & Conductor Asignado:</span>
                <p style="margin: 2px 0 0; color: #1e293b;"><b>Fecha de Despacho:</b> ${g.dispatch_date || new Date().toLocaleDateString('es-VE')}</p>
                <p style="margin: 2px 0 0; color: #1e293b;"><b>Modalidad:</b> ${g.transport_type === 'propio_dalor' ? 'Flota Propia DALOR' : (g.transport_type === 'flete_tercerizado' ? 'Flete Tercerizado / Externo' : 'Retiro por Cliente')}</p>
                <p style="margin: 2px 0 0; color: #002B49; font-weight: 700;"><b>Chofer:</b> ${g.driver_name || 'Conductor Autorizado'} ${g.driver_id_doc ? '(C.I. ' + g.driver_id_doc + ')' : ''}</p>
                <p style="margin: 2px 0 0; color: #64748b;"><b>Vehículo / Placa:</b> <b style="text-transform: uppercase; color: #1e293b;">${g.vehicle_plate || 'S/P'}</b> ${g.vehicle_model ? '(' + g.vehicle_model + ')' : ''}</p>
            </div>
        `;

        const signaturesHtml = isInternal ? `
            <!-- CAJAS DE FIRMA: SOLO 2 PARA CONTROL INTERNO -->
            <div style="margin-top: 35px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; text-align: center; font-size: 10px;">
                <div style="border-top: 1.5px solid #002B49; padding-top: 8px;">
                    <strong style="color: #002B49; font-size: 11px; display: block;">Entregado por (Almacén Central)</strong>
                    <span style="color: #334155; font-weight: 700; display: block; margin-top: 3px;">${g.delivered_by_staff || g.dispatcher_name || 'Custodio de Almacén Dalor'}</span>
                    <span style="color: #64748b; font-size: 9px;">Custodia y Despacho DALOR</span>
                </div>
                <div style="border-top: 1.5px solid #002B49; padding-top: 8px;">
                    <strong style="color: #002B49; font-size: 11px; display: block;">Recibido Conforme</strong>
                    <span style="color: #334155; font-weight: 700; display: block; margin-top: 3px;">${g.received_by_staff || 'Personal de Taller / Responsable'}</span>
                    <span style="color: #64748b; font-size: 9px;">Nombre, C.I., Firma y Fecha</span>
                </div>
            </div>
        ` : `
            <!-- CAJAS DE FIRMA: 3 PARA OBRA FORÁNEA (IDÉNTICO A GUÍA DE PRÉSTAMOS) -->
            <div style="margin-top: 35px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; text-align: center; font-size: 10px;">
                <div style="border-top: 1.5px solid #002B49; padding-top: 6px;">
                    <strong style="color: #002B49; display: block;">Despachado por DALOR</strong>
                    <span style="color: #334155; font-weight: 700; display: block; margin-top: 2px;">${g.delivered_by_staff || g.dispatcher_name || 'Almacén Central'}</span>
                    <span style="color: #64748b; font-size: 9px;">Custodia y Despacho DALOR</span>
                </div>
                <div style="border-top: 1.5px solid #002B49; padding-top: 6px;">
                    <strong style="color: #002B49; display: block;">Transportado por / Chofer</strong>
                    <span style="color: #334155; font-weight: 700; display: block; margin-top: 2px;">${g.driver_name || 'Chofer Asignado'}</span>
                    <span style="color: #64748b; font-size: 9px;">${g.driver_id_doc ? 'C.I. ' + g.driver_id_doc + ' &bull; ' : ''}Firma</span>
                </div>
                <div style="border-top: 1.5px solid #002B49; padding-top: 6px;">
                    <strong style="color: #002B49; display: block;">Recibido Conforme (Receptor)</strong>
                    <span style="color: #334155; font-weight: 700; display: block; margin-top: 2px;">${g.received_by_staff || g.received_by_client_name || 'Receptor en Sitio'}</span>
                    <span style="color: #64748b; font-size: 9px;">Nombre, C.I., Firma y Sello</span>
                </div>
            </div>
        `;

        const footerNote = isInternal
            ? '<b>VALIDEZ Y CONTROL INTERNO:</b> El presente <b>Vale de Control Interno</b> certifica la entrega de insumos, herramientas y materiales de pañol para la ejecución de trabajos dentro de las instalaciones de Metalmecánica DALOR C.A. Respaldo administrativo de inventario &bull; RIF J-31601195-0.'
            : '<b>VALIDEZ Y CONTROL SENIAT:</b> La presente <b>Guía Oficial de Traslado y Nota de Entrega</b> ampara el transporte de bienes, piezas fabricadas/reparadas, maquinaria y materiales industriales propiedad de o encomendados a Metalmecánica Dalor, C.A. conforme a las providencias administrativas del SENIAT y normativas de tránsito terrestre &bull; RIF J-31601195-0.';

        printWindow.document.write(`
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <title>${docTitle}</title>
                <style>
                    body { margin: 0; padding: 20px; background: #f8fafc; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
                    @media print {
                        body { background: #fff; padding: 0; }
                        @page { margin: 10mm; }
                        .no-print { display: none !important; }
                    }
                </style>
            </head>
            <body>
                <div class="no-print" style="text-align: right; margin-bottom: 12px; max-width: 820px; margin-left: auto; margin-right: auto;">
                    <button onclick="window.print()" style="background: #002B49; color: white; border: none; padding: 8px 18px; font-weight: 800; border-radius: 6px; cursor: pointer; font-size: 12px; display: inline-flex; align-items: center; gap: 6px;">
                        🖨️ Imprimir Guía / Guardar PDF
                    </button>
                </div>

                <div style="background: white; padding: 25px; border-radius: 8px; font-family: 'Inter', sans-serif; color: #1e293b; max-width: 820px; margin: 0 auto; line-height: 1.4; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    <!-- ENCABEZADO OFICIAL DALOR -->
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #F5B800; padding-bottom: 12px; margin-bottom: 14px;">
                        <div style="display: flex; align-items: center; gap: 14px;">
                            <img src="/logo_dalor.jpg" alt="DALOR" style="height: 52px; max-width: 140px; object-fit: contain;" onerror="this.style.display='none'">
                            <div>
                                <h2 style="margin: 0; font-size: 18px; font-weight: 900; color: #002B49; letter-spacing: -0.5px; text-transform: uppercase;">Metalmecánica Dalor, C.A.</h2>
                                <p style="margin: 2px 0 0; font-size: 11px; color: #0284c7; font-weight: 700;">RIF: J-31601195-0 &bull; Av. Cámara de las Industrias, Galpón 10, Zona Industrial El Tigre, Guacara, Edo. Carabobo</p>
                                <p style="margin: 1px 0 0; font-size: 10px; color: #64748b;">Fabricación, Metalmecánica, Montajes Industriales, Equipos & Obras &bull; Telf: +58 0412-2407079</p>
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <div style="background: #002B49; color: white; padding: 6px 14px; border-radius: 6px; font-size: 13px; font-weight: 900; display: inline-block; border-left: 4px solid #F5B800;">
                                ${g.guide_number}
                            </div>
                            <p style="margin: 4px 0 0; font-size: 11px; font-weight: 800; color: #0284c7;">${guideTypeLabel}</p>
                            ${directionLabel ? `
                            <span style="display: inline-block; background: #e0f2fe; color: #0369a1; font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: 4px; margin-top: 3px;">
                                ${directionLabel}
                            </span>` : ''}
                        </div>
                    </div>

                    <!-- DATOS DE ENTREGA Y DESTINATARIO (2 COLUMNAS) -->
                    <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 14px; margin-bottom: 14px; background: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 11px;">
                        ${infoCardsHtml}
                    </div>

                    <!-- TABLA DE RENGLONES -->
                    <div style="margin-bottom: 16px;">
                        <table style="width: 100%; border-collapse: collapse; border: 1px solid #cbd5e1;">
                            <thead>
                                <tr style="background: #002B49; color: white; font-size: 10.5px; text-transform: uppercase;">
                                    <th style="padding: 7px; width: 30px; text-align: center;">#</th>
                                    <th style="padding: 7px; text-align: left;">Descripción del Recurso / Activo / Material</th>
                                    <th style="padding: 7px; width: 55px; text-align: right;">Cant</th>
                                    <th style="padding: 7px; width: 55px; text-align: center;">Unidad</th>
                                    <th style="padding: 7px; width: 140px; text-align: left;">Condición / Estado al Salir</th>
                                    <th style="padding: 7px; width: 75px; text-align: right;">Peso Aprox</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${itemsHtml}
                            </tbody>
                        </table>
                    </div>

                    <!-- OBSERVACIONES Y PRECINTOS -->
                    <div style="background: #fffbeb; border: 1px solid #fde68a; padding: 8px 12px; border-radius: 6px; font-size: 10.5px; color: #92400e; margin-bottom: 16px;">
                        <b>Observaciones & Precintos:</b> ${g.notes || (isInternal ? 'Equipos verificados e inventariados para custodia interna en sede.' : 'Carga verificada y apta para despacho a obra.')} &bull; <b>Control de Calidad:</b> ${g.quality_inspector || 'DALOR C.A.'}
                    </div>

                    ${(!isInternal && (g.status === 'entregada' || g.status === 'entregado_conforme')) ? `
                        <div style="background: #ecfdf5; border: 1.5px solid #86efac; border-radius: 6px; padding: 8px 12px; margin-bottom: 16px; font-size: 11px; color: #065f46;">
                            <i class="fa-solid fa-circle-check"></i> <b>Constancia de Recepción Conforme:</b> Recibido por <b>${g.received_by_client_name || 'Cliente'}</b> (C.I: ${g.received_by_client_id_doc || 'S/D'}) en fecha <b>${g.reception_date || '-'}</b>.
                        </div>
                    ` : ''}

                    <!-- CAJAS DE FIRMA Y RECEPCIÓN (3 BLOQUES IDÉNTICO A RENTALS) -->
                    ${signaturesHtml}

                    <!-- COLETILLA LEGAL -->
                    <div style="margin-top: 22px; border-top: 1px dashed #cbd5e1; padding-top: 6px; font-size: 9px; color: #64748b; text-align: justify; line-height: 1.3;">
                        ${footerNote}
                    </div>
                </div>
            </body>
            </html>
        `);
        printWindow.document.close();
    } catch (err) {
        console.error('Error imprimiendo documento de despacho:', err);
        alert('Error: ' + err.message);
    }
}

if (typeof window !== 'undefined') {
    window.printOfficialDispatchGuide = printOfficialDispatchGuide;
}
