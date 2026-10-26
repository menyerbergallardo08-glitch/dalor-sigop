/**
 * DALOR SIGO-P | Módulo: DISPATCH_FORM_ITEMS.JS
 * Gestión de la tabla dinámica de renglones despachados, normalización de unidades,
 * validaciones y emisión/submit de Guías de Despacho.
 */

var API_BASE = window.API_BASE || (window.location.origin + "/api/v1");
var dispatchItemCounter = 0;

function authFetch(url, options = {}) {
    var _t = sessionStorage.getItem('dalor_token') || localStorage.getItem('dalor_token') || '';
    var _h = Object.assign({}, options.headers || {});
    if (_t) _h['Authorization'] = 'Bearer ' + _t;
    return window.fetch(url, Object.assign({}, options, { headers: _h }));
}

// ==============================================================================
// RENGLONES DINÁMICOS DE CARGA / PIEZAS
// ==============================================================================
export function normalizeDispatchUnit(u) {
    if (!u) return 'Unid';
    const clean = String(u).trim().toUpperCase();
    if (clean === 'KG' || clean === 'KGS' || clean === 'KILOGRAMO' || clean === 'KILOGRAMOS') return 'Kg';
    if (clean === 'MTR' || clean === 'MTRS' || clean === 'MT' || clean === 'MTS' || clean === 'METRO' || clean === 'METROS') return 'Metros';
    if (clean === 'PZA' || clean === 'PZAS' || clean === 'PIEZA' || clean === 'PIEZAS') return 'Pzas';
    if (clean === 'UND' || clean === 'UNID' || clean === 'UNIDADES' || clean === 'UNIDAD') return 'Unid';
    if (clean === 'LOTE' || clean === 'LOTES') return 'Lote';
    if (clean === 'JGO' || clean === 'JUEGO' || clean === 'JUEGOS') return 'Juego';
    if (clean === 'TAMBOR' || clean === 'TAMBORES' || clean === 'TAMB') return 'Tambor';
    if (clean === 'LTS' || clean === 'LT' || clean === 'LITRO' || clean === 'LITROS') return 'Litros';
    if (clean === 'GL' || clean === 'GAL' || clean === 'GALON' || clean === 'GALONES') return 'Galones';
    return u;
}

export function addDispatchItemRow(desc = "", qty = 1, unit = "Pzas", cond = "Reparado / Listo para Montaje", weight = 0, resourceType = null, resourceId = null) {
    const tableBody = document.getElementById('dispatchItemsTableBody');
    if (!tableBody) return;

    dispatchItemCounter++;
    const rowId = `disp_row_${dispatchItemCounter}`;

    const tr = document.createElement('tr');
    tr.id = rowId;
    tr.style.borderBottom = '1px solid #e2e8f0';
    if (resourceType) tr.dataset.resourceType = resourceType;
    if (resourceId) tr.dataset.resourceId = resourceId;

    const normUnit = normalizeDispatchUnit(unit);
    const standardUnits = ['Pzas', 'Unid', 'Kg', 'Metros', 'Litros', 'Galones', 'Lote', 'Juego', 'Tambor'];
    let unitOptionsHtml = standardUnits.map(su => `<option value="${su}" ${normUnit.toLowerCase() === su.toLowerCase() ? 'selected' : ''}>${su}</option>`).join('');
    if (!standardUnits.some(su => su.toLowerCase() === normUnit.toLowerCase())) {
        unitOptionsHtml += `<option value="${normUnit}" selected>${normUnit}</option>`;
    }

    const condStr = String(cond || '');

    tr.innerHTML = `
        <td style="padding: 6px; text-align: center; color: #64748b; font-weight: 700;" class="disp-row-num">
            ${tableBody.children.length + 1}
        </td>
        <td style="padding: 6px;">
            <input type="text" class="form-input disp-item-desc" value="${desc}" placeholder="Ej: Eje motriz rectificado / Válvula compuerta 6\"" style="width: 100%; font-size: 12px;" required>
        </td>
        <td style="padding: 6px;">
            <input type="number" step="0.01" min="0.01" class="form-input disp-item-qty" value="${qty}" style="width: 100%; font-size: 12px; text-align: right;" required>
        </td>
        <td style="padding: 6px;">
            <select class="form-select disp-item-unit" style="width: 100%; font-size: 11.5px;">
                ${unitOptionsHtml}
            </select>
        </td>
        <td style="padding: 6px;">
            <select class="form-select disp-item-cond" style="width: 100%; font-size: 11px;">
                <option value="Reparado / Listo para Montaje" ${condStr.includes('Reparado') ? 'selected' : ''}>Reparado / Listo p/ Montaje</option>
                <option value="Nuevo / Fabricado" ${condStr.includes('Fabricado') ? 'selected' : ''}>Nuevo / Fabricado DALOR</option>
                <option value="Operativo / Buen Estado" ${condStr.includes('Operativo') ? 'selected' : ''}>Operativo / Buen Estado</option>
                <option value="Material en Custodia / Salida de Almacén" ${condStr.includes('Almacén') || condStr.includes('Custodia') ? 'selected' : ''}>Material en Custodia / Almacén</option>
                <option value="Dañado / Para Evaluación en Sitio" ${condStr.includes('Dañado') ? 'selected' : ''}>Dañado / Para Evaluación</option>
            </select>
        </td>
        <td style="padding: 6px;">
            <input type="number" step="0.01" class="form-input disp-item-weight" value="${weight || ''}" placeholder="0.00" style="width: 100%; font-size: 12px; text-align: right;">
        </td>
        <td style="padding: 6px; text-align: center;">
            <button type="button" onclick="removeDispatchItemRow(this)" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 14px; padding: 4px;" title="Eliminar renglón">
                <i class="fa-solid fa-trash-can"></i>
            </button>
        </td>
    `;

    tableBody.appendChild(tr);
    reindexDispatchRows();
}

export function removeDispatchItemRow(btn) {
    const tr = btn.closest('tr');
    if (!tr) return;
    const tbody = tr.parentElement;
    tr.remove();
    reindexDispatchRows();
    if (tbody && tbody.children.length === 0) {
        addDispatchItemRow();
    }
}

export function reindexDispatchRows() {
    const tbody = document.getElementById('dispatchItemsTableBody');
    if (!tbody) return;
    Array.from(tbody.children).forEach((row, idx) => {
        const numCell = row.querySelector('.disp-row-num');
        if (numCell) numCell.textContent = idx + 1;
    });
}

// ==============================================================================
// CREACIÓN / EMISIÓN DE GUÍA DE DESPACHO
// ==============================================================================
export async function submitCreateDispatchGuide(event) {
    if (event && event.preventDefault) event.preventDefault();

    const guideType = document.getElementById('disp_guide_type')?.value || 'traslado_externo';
    const isFreeform = document.getElementById('disp_is_freeform')?.value === '1';
    let clientId = null;
    let projectId = null;
    let recipientName = "";
    let transferReason = "Despacho de Producción";
    let destPlant = "";
    let destAddress = "";
    let deliveredByStaff = null;
    let receivedByStaff = null;

    if (guideType === 'control_interno') {
        recipientName = "Metalmecánica Dalor - Sede Guacara";
        transferReason = (document.getElementById('disp_ci_reason')?.value || "Uso Operativo en Taller").trim();
        destPlant = (document.getElementById('disp_ci_destination_area')?.value || "Taller Metalmecánico").trim();
        destAddress = "Sede Dalor Guacara, Av. Cámara de las Industrias, Galpón 10";
        deliveredByStaff = (document.getElementById('disp_ci_delivered_staff')?.value || "Almacén Central Guacara").trim();
        receivedByStaff = (document.getElementById('disp_ci_received_staff')?.value || "Operario de Taller").trim();
        const ciProjVal = document.getElementById('disp_ci_project_id')?.value;
        projectId = ciProjVal ? parseInt(ciProjVal) : null;
    } else if (!isFreeform) {
        clientId = document.getElementById('disp_client_id')?.value || null;
        projectId = document.getElementById('disp_project_id')?.value || null;
        destPlant = (document.getElementById('disp_destination_plant')?.value || "").trim();
        destAddress = (document.getElementById('disp_destination_address')?.value || "").trim();

        if (!destAddress) {
            alert("Por favor indica la dirección completa de destino.");
            return;
        }

        const clientSel = document.getElementById('disp_client_id');
        recipientName = clientSel?.selectedOptions[0]?.text?.split('(')[0]?.trim() || "Cliente DALOR";
    } else {
        recipientName = (document.getElementById('disp_freeform_recipient')?.value || "").trim();
        transferReason = (document.getElementById('disp_transfer_reason')?.value || "Despacho de Producción").trim();
        destPlant = (document.getElementById('disp_ff_destination_plant')?.value || "").trim();
        destAddress = (document.getElementById('disp_ff_destination_address')?.value || "").trim();

        if (!recipientName) {
            alert("Por favor ingresa la empresa o destinatario del traslado.");
            return;
        }
        if (!destAddress) {
            alert("Por favor ingresa la dirección de destino de la carga.");
            return;
        }
    }

    const transportType = (guideType === 'control_interno') 
        ? 'propio_dalor' 
        : (document.getElementById('disp_transport_type')?.value || "propio_dalor");
    let driverName = "";
    let driverIdDoc = "";
    let vehiclePlate = "";
    let carrierCompany = "";
    let freightCost = 0.0;
    let freightPrice = 0.0;
    let assetId = null;
    let vehicleModel = (document.getElementById('disp_vehicle_model_propio')?.value || "").trim() || null;

    if (guideType === 'control_interno') {
        driverName = (document.getElementById('disp_ci_movement_type')?.value || "Personal Interno DALOR").trim();
        driverIdDoc = "V-00000000";
        vehiclePlate = "INTERNO";
        carrierCompany = "Control Interno DALOR";
    } else if (transportType === 'propio_dalor') {
        assetId = document.getElementById('disp_select_asset')?.value || null;
        if (assetId) {
            const selectedVeh = (window.allAssets || []).find(a => String(a.id) === String(assetId));
            if (selectedVeh) {
                if (!vehicleModel) vehicleModel = selectedVeh.name;
                const st = (selectedVeh.status || '').toLowerCase().trim();
                const isUnavail = selectedVeh.is_active === false || 
                    ['en_mantenimiento', 'mantenimiento', 'en_reparacion', 'reparacion', 'inactivo', 'desincorporado', 'no_disponible'].includes(st);
                if (isUnavail) {
                    alert(`⛔ El vehículo seleccionado [${selectedVeh.asset_code || ''}] '${selectedVeh.name}' NO se encuentra disponible para despacho (Estatus actual: ${selectedVeh.status}). Por favor selecciona una unidad operativa.`);
                    return;
                }
            }
        }
        driverName = (document.getElementById('disp_driver_name_propio')?.value || "").trim() || "Personal DALOR";
        driverIdDoc = (document.getElementById('disp_driver_id_propio')?.value || "").trim() || "V-00000000";
        vehiclePlate = (document.getElementById('disp_plate_propio')?.value || "").trim() || "S/P";
        carrierCompany = "Transporte Propio DALOR";
    } else if (transportType === 'flete_tercerizado') {
        carrierCompany = (document.getElementById('disp_carrier_company')?.value || "Flete Tercerizado").trim();
        driverName = (document.getElementById('disp_driver_name_ext')?.value || "").trim() || "Chofer Flete Externo";
        driverIdDoc = (document.getElementById('disp_driver_id_ext')?.value || "").trim() || "V-00000000";
        vehiclePlate = (document.getElementById('disp_plate_ext')?.value || "").trim() || "S/P";
        freightCost = parseFloat(document.getElementById('disp_freight_cost_usd')?.value || 0) || 0.0;
        freightPrice = parseFloat(document.getElementById('disp_freight_price_charged')?.value || 0) || 0.0;
    } else {
        driverName = (document.getElementById('disp_driver_name_ret')?.value || "").trim() || "Receptor Autorizado";
        driverIdDoc = (document.getElementById('disp_driver_id_ret')?.value || "").trim() || "V-00000000";
        vehiclePlate = (document.getElementById('disp_plate_ret')?.value || "").trim() || "S/P";
        carrierCompany = "Retiro Directo por Cliente";
    }

    const items = [];
    const itemRows = document.querySelectorAll('#dispatchItemsTableBody tr');
    itemRows.forEach(tr => {
        const desc = (tr.querySelector('.disp-item-desc')?.value || "").trim();
        const qty = parseFloat(tr.querySelector('.disp-item-qty')?.value || 1) || 1.0;
        const unit = tr.querySelector('.disp-item-unit')?.value || "Pzas";
        const cond = tr.querySelector('.disp-item-cond')?.value || "Reparado / Listo para Montaje";
        const weight = parseFloat(tr.querySelector('.disp-item-weight')?.value || 0) || 0.0;
        const resType = tr.dataset.resourceType || null;
        const resId = tr.dataset.resourceId ? parseInt(tr.dataset.resourceId) : null;

        if (desc) {
            items.push({
                description: desc,
                quantity: qty,
                unit: unit,
                condition_status: cond,
                approx_weight_kg: weight,
                resource_type: resType,
                asset_id: (resType !== 'material' ? resId : null),
                material_id: (resType === 'material' ? resId : null)
            });
        }
    });

    if (items.length === 0) {
        alert("Debes agregar al menos un renglón con la descripción del material, equipo o pieza despachada.");
        return;
    }

    const payload = {
        guide_type: guideType,
        delivered_by_staff: deliveredByStaff,
        received_by_staff: receivedByStaff,
        project_id: projectId ? parseInt(projectId) : null,
        client_id: clientId ? parseInt(clientId) : null,
        recipient_name: recipientName,
        transfer_reason: transferReason,
        is_freeform: (guideType === 'control_interno' ? false : isFreeform),
        destination_plant: destPlant || null,
        destination_address: destAddress,
        transport_type: transportType,
        asset_id: assetId ? parseInt(assetId) : null,
        vehicle_model: vehicleModel,
        carrier_company: carrierCompany,
        driver_name: driverName,
        driver_id_doc: driverIdDoc,
        vehicle_plate: vehiclePlate,
        freight_cost_usd: freightCost,
        freight_price_charged_usd: freightPrice,
        dispatcher_name: (document.getElementById('disp_dispatcher_name')?.value || "Despacho Taller Guacara").trim(),
        quality_inspector: (document.getElementById('disp_quality_inspector')?.value || "Control de Calidad DALOR").trim(),
        notes: (document.getElementById('disp_notes')?.value || "").trim(),
        items: items
    };

    try {
        const res = await authFetch(`${API_BASE}/dispatch/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.detail || 'Error al emitir guía de despacho.');
        }

        const data = await res.json();
        const docLabel = (guideType === 'control_interno') ? 'Vale de Control Interno' : 'Guía de Despacho';
        if (typeof window.showToast === 'function') {
            window.showToast(`${docLabel} N° ${data.guide_number} emitida con éxito.`, 'success');
        } else {
            alert(`${docLabel} N° ${data.guide_number} emitida con éxito.`);
        }

        if (typeof window.switchDispatchSubtab === 'function') {
            window.switchDispatchSubtab('list');
        }
        if (typeof window.loadDispatchGuidesList === 'function') {
            await window.loadDispatchGuidesList();
        }

        if (confirm(`¿Deseas abrir el documento oficial N° ${data.guide_number} para imprimir o guardar en PDF?`)) {
            if (typeof window.printOfficialDispatchGuide === 'function') {
                window.printOfficialDispatchGuide(data.id);
            }
        }
    } catch (err) {
        console.error('Error al emitir documento de despacho:', err);
        alert('Error: ' + err.message);
    }
}

// PUENTE GLOBAL WINDOW
if (typeof window !== 'undefined') {
    window.normalizeDispatchUnit = normalizeDispatchUnit;
    window.addDispatchItemRow = addDispatchItemRow;
    window.removeDispatchItemRow = removeDispatchItemRow;
    window.reindexDispatchRows = reindexDispatchRows;
    window.submitCreateDispatchGuide = submitCreateDispatchGuide;
}
