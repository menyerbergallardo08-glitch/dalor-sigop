/**
 * DALOR SIGO-P | Módulo: DISPATCH.JS
 * Control Logístico Unificado de Guías de Despacho & Formato Abierto (Libre Edición)
 * Versión 4.2.0 - Unificada
 */

var API_BASE = window.API_BASE || (window.location.origin + "/api/v1");
var allDispatchGuides = window.allDispatchGuides = window.allDispatchGuides || [];
var currentDispatchFilter = 'all';
var dispatchItemCounter = 0;

/** authFetch - inyecta token en cada request usando window.fetch nativo */
function authFetch(url, options = {}) {
    var _t = sessionStorage.getItem('dalor_token') || localStorage.getItem('dalor_token') || '';
    var _h = Object.assign({}, options.headers || {});
    if (_t) _h['Authorization'] = 'Bearer ' + _t;
    return window.fetch(url, Object.assign({}, options, { headers: _h }));
}

// ==============================================================================
// GESTIÓN DE SUBPESTAÑAS
// ==============================================================================
function switchDispatchSubtab(subtabName) {
    try {
        sessionStorage.setItem('dalor_active_subtab_dispatch', subtabName || 'list');
        localStorage.setItem('dalor_active_subtab_dispatch', subtabName || 'list');
    } catch(e) {}
    const isList = (subtabName === 'list');
    const subtabList = document.getElementById('subtab-disp-list');
    const subtabForm = document.getElementById('subtab-disp-form');
    const btnList = document.getElementById('tabbtn-disp-list');
    const btnForm = document.getElementById('tabbtn-disp-form');

    if (subtabList) subtabList.classList.toggle('hidden', !isList);
    if (subtabForm) subtabForm.classList.toggle('hidden', isList);

    if (btnList) {
        btnList.className = isList ? 'btn-primary' : 'btn-secondary';
        btnList.style.fontWeight = isList ? '800' : '600';
    }
    if (btnForm) {
        btnForm.className = !isList ? 'btn-primary' : 'btn-secondary';
        btnForm.style.fontWeight = !isList ? '800' : '600';
    }

    if (isList) {
        loadDispatchGuidesList();
    } else {
        initDispatchForm();
    }
}

async function initDispatchView() {
    switchDispatchSubtab('list');
    await loadDispatchGuidesList();
}

// ==============================================================================
// MODALIDAD: POR OBRA / PROYECTO VS FORMATO ABIERTO
// ==============================================================================
function setDispatchMode(mode) {
    const isFreeform = (mode === 'freeform');
    const hiddenInput = document.getElementById('disp_is_freeform');
    if (hiddenInput) hiddenInput.value = isFreeform ? '1' : '0';

    const secProject = document.getElementById('disp_sec_project_mode');
    const secFreeform = document.getElementById('disp_sec_freeform_mode');
    const btnProject = document.getElementById('btn_disp_mode_project');
    const btnFreeform = document.getElementById('btn_disp_mode_freeform');
    const hint = document.getElementById('disp_mode_hint');

    if (secProject) secProject.style.display = isFreeform ? 'none' : 'block';
    if (secFreeform) secFreeform.style.display = isFreeform ? 'block' : 'none';

    if (btnProject) btnProject.className = isFreeform ? 'btn-secondary' : 'btn-primary';
    if (btnFreeform) btnFreeform.className = isFreeform ? 'btn-primary' : 'btn-secondary';

    if (hint) {
        hint.innerHTML = isFreeform 
            ? '<i class="fa-solid fa-circle-info" style="color: #0284c7;"></i> <b>Formato Abierto:</b> Destinatario libre sin forzar cliente ni proyecto DALOR preexistente.'
            : '<i class="fa-solid fa-circle-info" style="color: #0284c7;"></i> <b>Por Obra / Proyecto:</b> Vincula la salida a un cliente y proyecto registrado en el sistema.';
    }
}

// ==============================================================================
// MODALIDAD DE TRANSPORTE
// ==============================================================================
function setDispatchTransportMode(mode) {
    const hiddenType = document.getElementById('disp_transport_type');
    if (hiddenType) hiddenType.value = mode;

    const btnPropio = document.getElementById('btn_mode_propio');
    const btnTerc = document.getElementById('btn_mode_tercerizado');
    const btnRet = document.getElementById('btn_mode_retiro');

    const secPropio = document.getElementById('disp_sec_propio');
    const secTerc = document.getElementById('disp_sec_tercerizado');
    const secRet = document.getElementById('disp_sec_retiro');

    if (btnPropio) btnPropio.className = (mode === 'propio_dalor') ? 'btn-primary' : 'btn-secondary';
    if (btnTerc) btnTerc.className = (mode === 'flete_tercerizado') ? 'btn-primary' : 'btn-secondary';
    if (btnRet) btnRet.className = (mode === 'retiro_cliente') ? 'btn-primary' : 'btn-secondary';

    if (secPropio) secPropio.classList.toggle('hidden', mode !== 'propio_dalor');
    if (secTerc) secTerc.classList.toggle('hidden', mode !== 'flete_tercerizado');
    if (secRet) secRet.classList.toggle('hidden', mode !== 'retiro_cliente');
}

// ==============================================================================
// INICIALIZACIÓN Y SELECTORES DEL FORMULARIO
// ==============================================================================
async function initDispatchForm() {
    setDispatchMode('project');
    setDispatchTransportMode('propio_dalor');

    // Cargar Clientes
    try {
        const clientSel = document.getElementById('disp_client_id');
        if (clientSel) {
            let clients = window.allClients || [];
            if (clients.length === 0) {
                const res = await authFetch(`${API_BASE}/clients/`);
                if (res.ok) clients = window.allClients = await res.json();
            }
            clientSel.innerHTML = '<option value="">-- Seleccionar Cliente Registrado --</option>' +
                clients.map(c => `<option value="${c.id}">${c.name} (${c.rif || 'S/R'})</option>`).join('');
        }
    } catch (err) {
        console.warn('Error cargando clientes para despacho:', err);
    }

    // Cargar Proyectos
    try {
        const projSel = document.getElementById('disp_project_id');
        if (projSel) {
            let projects = window.allProjects || [];
            if (projects.length === 0) {
                const res = await authFetch(`${API_BASE}/projects/`);
                if (res.ok) projects = window.allProjects = await res.json();
            }
            projSel.innerHTML = '<option value="">-- Seleccionar Proyecto DALOR --</option>' +
                projects.map(p => `<option value="${p.id}" data-client-id="${p.client_id || ''}">${p.code || ('PRJ-' + p.id)} - ${p.name}</option>`).join('');
        }
    } catch (err) {
        console.warn('Error cargando proyectos para despacho:', err);
    }

    // Cargar Vehículos DALOR (Flota)
    try {
        const assetSel = document.getElementById('disp_select_asset');
        if (assetSel) {
            let assets = window.allAssets || [];
            if (assets.length === 0) {
                const res = await authFetch(`${API_BASE}/assets/`);
                if (res.ok) assets = window.allAssets = await res.json();
            }
            const vehicles = assets.filter(a => 
                (a.category && a.category.toLowerCase().includes('veh')) || 
                (a.sub_category && a.sub_category.toLowerCase().includes('veh'))
            );
            assetSel.innerHTML = '<option value="">-- Seleccionar Vehículo de Flota DALOR --</option>' +
                vehicles.map(v => `<option value="${v.id}" data-plate="${v.serial_chassis || v.internal_code || ''}" data-model="${v.name}">${v.name} (${v.internal_code || v.serial_chassis || 'S/P'})</option>`).join('');
        }
    } catch (err) {
        console.warn('Error cargando vehículos para despacho:', err);
    }

    // Asegurar que haya al menos 1 renglón en la tabla de ítems
    const tableBody = document.getElementById('dispatchItemsTableBody');
    if (tableBody && tableBody.children.length === 0) {
        addDispatchItemRow();
    }
}

function onDispatchClientChanged() {
    const clientSel = document.getElementById('disp_client_id');
    const projSel = document.getElementById('disp_project_id');
    if (!clientSel || !projSel) return;

    const clientId = clientSel.value;
    let matchCount = 0;

    // Si cambia de cliente, limpiar selección de proyecto incompatible
    const currentProj = projSel.selectedOptions[0];
    if (currentProj && currentProj.getAttribute('data-client-id') !== clientId) {
        projSel.value = "";
    }

    Array.from(projSel.options).forEach(opt => {
        if (!opt.value) return;
        const optClientId = opt.getAttribute('data-client-id');
        const matches = (!clientId || String(optClientId) === String(clientId));
        opt.style.display = matches ? 'block' : 'none';
        opt.disabled = !matches;
        if (matches) matchCount++;
    });

    const defaultOpt = projSel.options[0];
    if (defaultOpt) {
        if (clientId) {
            defaultOpt.textContent = matchCount > 0 
                ? `-- Seleccionar Obra del Cliente (${matchCount} disponibles) --` 
                : '-- Este cliente no posee obras registradas --';
        } else {
            defaultOpt.textContent = '-- Seleccionar Proyecto DALOR --';
        }
    }

    const clients = window.allClients || [];
    const client = clients.find(c => String(c.id) === String(clientId));
    if (client && client.address) {
        const addrInput = document.getElementById('disp_destination_address');
        if (addrInput && !addrInput.value) {
            addrInput.value = client.address;
        }
    }
}

function onDispatchProjectChanged() {
    const projSel = document.getElementById('disp_project_id');
    const clientSel = document.getElementById('disp_client_id');
    if (!projSel || !projSel.value) return;

    const projId = projSel.value;
    const projects = window.allProjects || [];
    const project = projects.find(p => String(p.id) === String(projId));

    if (project) {
        if (project.client_id && clientSel) {
            clientSel.value = String(project.client_id);
            // Re-ejecutar filtrado consistente y reasegurar selección
            onDispatchClientChanged();
            projSel.value = String(projId);
        }
        const plantInput = document.getElementById('disp_destination_plant');
        if (plantInput && !plantInput.value) {
            plantInput.value = project.name || 'Planta de Obra';
        }
    }
}

async function loadProjectResourcesIntoDispatch() {
    const projSel = document.getElementById('disp_project_id');
    if (!projSel || !projSel.value) {
        if (typeof window.showToast === 'function') {
            window.showToast('Selecciona un proyecto primero para cargar sus insumos.', 'warning');
        } else {
            alert('Selecciona un proyecto primero para cargar sus insumos.');
        }
        return;
    }

    try {
        const res = await authFetch(`${API_BASE}/projects/${projSel.value}`);
        if (!res.ok) throw new Error('No se pudo obtener el proyecto');
        const projData = await res.json();

        const tableBody = document.getElementById('dispatchItemsTableBody');
        if (tableBody) tableBody.innerHTML = '';
        dispatchItemCounter = 0;

        let added = 0;
        if (projData.materials && projData.materials.length > 0) {
            projData.materials.forEach(m => {
                addDispatchItemRow(m.material_name || m.name || 'Insumo de Obra', m.quantity || 1, m.unit || 'Pzas', 'Nuevo / En Obra', 0);
                added++;
            });
        }

        if (projData.assets && projData.assets.length > 0) {
            projData.assets.forEach(a => {
                addDispatchItemRow(`Equipo / Herramienta: ${a.name} (${a.internal_code || 'S/C'})`, 1, 'Unid', 'Operativo / En Uso', 0);
                added++;
            });
        }

        if (added === 0) {
            addDispatchItemRow(`Materiales para: ${projData.name || 'Proyecto'}`, 1, 'Lote', 'Reparado / Listo para Montaje', 0);
            if (typeof window.showToast === 'function') window.showToast('Se cargó renglón base del proyecto.', 'info');
        } else {
            if (typeof window.showToast === 'function') window.showToast(`Se cargaron ${added} ítems asignados al proyecto.`, 'success');
        }
    } catch (err) {
        console.error('Error cargando recursos de proyecto:', err);
        addDispatchItemRow();
    }
}

function onDispatchAssetChanged() {
    const sel = document.getElementById('disp_select_asset');
    if (!sel || !sel.value) return;

    const opt = sel.options[sel.selectedIndex];
    const plate = opt.getAttribute('data-plate') || '';
    const plateInput = document.getElementById('disp_plate_propio');
    if (plateInput && plate) {
        plateInput.value = plate.toUpperCase();
    }
}

// ==============================================================================
// RENGLONES DINÁMICOS DE CARGA / PIEZAS
// ==============================================================================
function addDispatchItemRow(desc = "", qty = 1, unit = "Pzas", cond = "Reparado / Listo para Montaje", weight = 0) {
    const tableBody = document.getElementById('dispatchItemsTableBody');
    if (!tableBody) return;

    dispatchItemCounter++;
    const rowId = `disp_row_${dispatchItemCounter}`;

    const tr = document.createElement('tr');
    tr.id = rowId;
    tr.style.borderBottom = '1px solid #e2e8f0';

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
                <option value="Pzas" ${unit === 'Pzas' ? 'selected' : ''}>Pzas</option>
                <option value="Unid" ${unit === 'Unid' ? 'selected' : ''}>Unid</option>
                <option value="Kg" ${unit === 'Kg' ? 'selected' : ''}>Kg</option>
                <option value="Metros" ${unit === 'Metros' ? 'selected' : ''}>Metros</option>
                <option value="Lote" ${unit === 'Lote' ? 'selected' : ''}>Lote</option>
                <option value="Juego" ${unit === 'Juego' ? 'selected' : ''}>Juego</option>
                <option value="Tambor" ${unit === 'Tambor' ? 'selected' : ''}>Tambor</option>
            </select>
        </td>
        <td style="padding: 6px;">
            <select class="form-select disp-item-cond" style="width: 100%; font-size: 11px;">
                <option value="Reparado / Listo para Montaje" ${cond.includes('Reparado') ? 'selected' : ''}>Reparado / Listo p/ Montaje</option>
                <option value="Nuevo / Fabricado" ${cond.includes('Fabricado') || cond.includes('Nuevo') ? 'selected' : ''}>Nuevo / Fabricado DALOR</option>
                <option value="Operativo / Buen Estado" ${cond.includes('Operativo') ? 'selected' : ''}>Operativo / Buen Estado</option>
                <option value="Material en Custodia / Devolución" ${cond.includes('Custodia') ? 'selected' : ''}>Material en Custodia</option>
                <option value="Dañado / Para Evaluación en Sitio" ${cond.includes('Dañado') ? 'selected' : ''}>Dañado / Para Evaluación</option>
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

function removeDispatchItemRow(btn) {
    const tr = btn.closest('tr');
    if (!tr) return;
    const tbody = tr.parentElement;
    tr.remove();
    reindexDispatchRows();
    if (tbody && tbody.children.length === 0) {
        addDispatchItemRow();
    }
}

function reindexDispatchRows() {
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
async function submitCreateDispatchGuide(event) {
    if (event && event.preventDefault) event.preventDefault();

    const isFreeform = document.getElementById('disp_is_freeform')?.value === '1';
    let clientId = null;
    let projectId = null;
    let recipientName = "";
    let transferReason = "Despacho de Producción";
    let destPlant = "";
    let destAddress = "";

    if (!isFreeform) {
        // Modalidad Por Obra / Proyecto
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
        // Modalidad Formato Abierto
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

    // Modalidad de Transporte
    const transportType = document.getElementById('disp_transport_type')?.value || "propio_dalor";
    let driverName = "";
    let driverIdDoc = "";
    let vehiclePlate = "";
    let carrierCompany = "";
    let freightCost = 0.0;
    let freightPrice = 0.0;
    let assetId = null;

    if (transportType === 'propio_dalor') {
        assetId = document.getElementById('disp_select_asset')?.value || null;
        driverName = (document.getElementById('disp_driver_name_propio')?.value || "").trim();
        driverIdDoc = (document.getElementById('disp_driver_id_propio')?.value || "").trim();
        vehiclePlate = (document.getElementById('disp_plate_propio')?.value || "").trim();
        carrierCompany = "Transporte Propio DALOR";
        if (!driverName || !vehiclePlate) {
            alert("Completa el nombre del chofer y la placa del vehículo DALOR.");
            return;
        }
    } else if (transportType === 'flete_tercerizado') {
        carrierCompany = (document.getElementById('disp_carrier_company')?.value || "").trim();
        driverName = (document.getElementById('disp_driver_name_ext')?.value || "").trim();
        driverIdDoc = (document.getElementById('disp_driver_id_ext')?.value || "").trim();
        vehiclePlate = (document.getElementById('disp_plate_ext')?.value || "").trim();
        freightCost = parseFloat(document.getElementById('disp_freight_cost_usd')?.value || 0) || 0.0;
        freightPrice = parseFloat(document.getElementById('disp_freight_price_charged')?.value || 0) || 0.0;
        if (!carrierCompany || !driverName || !vehiclePlate) {
            alert("Completa la empresa fletera, nombre del chofer y placa para flete tercerizado.");
            return;
        }
    } else {
        // Retiro por cliente
        driverName = (document.getElementById('disp_driver_name_ret')?.value || "").trim();
        driverIdDoc = (document.getElementById('disp_driver_id_ret')?.value || "").trim();
        vehiclePlate = (document.getElementById('disp_plate_ret')?.value || "").trim();
        carrierCompany = "Retiro Directo por Cliente";
        if (!driverName) {
            alert("Indica el nombre de la persona autorizada que retira.");
            return;
        }
    }

    // Recolectar renglones de carga
    const items = [];
    const itemRows = document.querySelectorAll('#dispatchItemsTableBody tr');
    itemRows.forEach(tr => {
        const desc = (tr.querySelector('.disp-item-desc')?.value || "").trim();
        const qty = parseFloat(tr.querySelector('.disp-item-qty')?.value || 1) || 1.0;
        const unit = tr.querySelector('.disp-item-unit')?.value || "Pzas";
        const cond = tr.querySelector('.disp-item-cond')?.value || "Reparado / Listo para Montaje";
        const weight = parseFloat(tr.querySelector('.disp-item-weight')?.value || 0) || 0.0;

        if (desc) {
            items.push({
                description: desc,
                quantity: qty,
                unit: unit,
                condition_status: cond,
                approx_weight_kg: weight
            });
        }
    });

    if (items.length === 0) {
        alert("Debes agregar al menos un renglón con la descripción del material o pieza despachada.");
        return;
    }

    const payload = {
        project_id: projectId ? parseInt(projectId) : null,
        client_id: clientId ? parseInt(clientId) : null,
        recipient_name: recipientName,
        transfer_reason: transferReason,
        is_freeform: isFreeform,
        destination_plant: destPlant || null,
        destination_address: destAddress,
        transport_type: transportType,
        asset_id: assetId ? parseInt(assetId) : null,
        carrier_company: carrierCompany,
        driver_name: driverName,
        driver_id_doc: driverIdDoc || "V-00000000",
        vehicle_plate: vehiclePlate || "S/P",
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
        if (typeof window.showToast === 'function') {
            window.showToast(`Guía de Despacho N° ${data.guide_number} emitida con éxito.`, 'success');
        } else {
            alert(`Guía de Despacho N° ${data.guide_number} emitida con éxito.`);
        }

        switchDispatchSubtab('list');
        await loadDispatchGuidesList();

        // Ofrecer vista de impresión oficial
        if (confirm(`¿Deseas abrir la Guía Oficial N° ${data.guide_number} para imprimir o guardar en PDF?`)) {
            printOfficialDispatchGuide(data.id);
        }
    } catch (err) {
        console.error('Error al emitir guía:', err);
        alert('Error: ' + err.message);
    }
}

// ==============================================================================
// LISTADO Y TABLA DE GUÍAS DE DESPACHO
// ==============================================================================
async function loadDispatchGuidesList() {
    const tbody = document.getElementById('dispatchTableBody');
    const badge = document.getElementById('dispatch_count_badge');

    try {
        const res = await authFetch(`${API_BASE}/dispatch/`);
        if (!res.ok) throw new Error('Error al consultar guías de despacho.');
        allDispatchGuides = window.allDispatchGuides = await res.json();

        updateFilterCounters();
        renderDispatchTable();
    } catch (err) {
        console.error('Error cargando guías de despacho:', err);
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: #ef4444; padding: 20px;">Error al cargar guías: ${err.message}</td></tr>`;
        }
        if (badge) badge.textContent = 'Error de conexión';
    }
}

function updateFilterCounters() {
    const guides = allDispatchGuides || [];
    const countAll = guides.length;
    const countProject = guides.filter(g => !g.is_freeform).length;
    const countFreeform = guides.filter(g => g.is_freeform).length;
    const countTransit = guides.filter(g => g.status === 'en_transito').length;
    const countDelivered = guides.filter(g => g.status === 'entregada' || g.status === 'entregado_conforme').length;

    const elAll = document.getElementById('count_disp_all');
    const elProj = document.getElementById('count_disp_project');
    const elFree = document.getElementById('count_disp_freeform');
    const elTrans = document.getElementById('count_disp_transit');
    const elDel = document.getElementById('count_disp_delivered');

    if (elAll) elAll.textContent = countAll;
    if (elProj) elProj.textContent = countProject;
    if (elFree) elFree.textContent = countFreeform;
    if (elTrans) elTrans.textContent = countTransit;
    if (elDel) elDel.textContent = countDelivered;
}

function setDispatchFilter(filter) {
    currentDispatchFilter = filter;
    const filterButtons = ['all', 'project', 'freeform', 'transit', 'delivered'];
    filterButtons.forEach(f => {
        const btn = document.getElementById(`btn_disp_filter_${f}`);
        if (btn) {
            btn.className = (f === filter) ? 'btn-primary' : 'btn-secondary';
        }
    });
    renderDispatchTable();
}

function filterDispatchList(query) {
    renderDispatchTable(query);
}

let lastFilteredDispatchGuides = [];
let dispatchCurrentPage = 1;
let dispatchPageSize = 15;

function goToDispatchPage(page) {
    dispatchCurrentPage = page;
    renderDispatchPaginated();
    const tableEl = document.getElementById('dispatchTableBody');
    if (tableEl) tableEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function changeDispatchPageSize(size) {
    dispatchPageSize = parseInt(size) || 15;
    dispatchCurrentPage = 1;
    renderDispatchPaginated();
}

function renderDispatchTable(searchQuery = "") {
    let guides = allDispatchGuides || [];

    // 1. Filtro de Categoría / Modalidad
    if (currentDispatchFilter === 'project') {
        guides = guides.filter(g => !g.is_freeform);
    } else if (currentDispatchFilter === 'freeform') {
        guides = guides.filter(g => g.is_freeform);
    } else if (currentDispatchFilter === 'transit') {
        guides = guides.filter(g => g.status === 'en_transito');
    } else if (currentDispatchFilter === 'delivered') {
        guides = guides.filter(g => g.status === 'entregada' || g.status === 'entregado_conforme');
    }

    // 2. Filtro de Texto
    const q = (typeof searchQuery === 'string' ? searchQuery : (document.getElementById('dispatch_search_input')?.value || "")).trim().toLowerCase();
    if (q) {
        guides = guides.filter(g => 
            (g.guide_number && g.guide_number.toLowerCase().includes(q)) ||
            (g.client_name && g.client_name.toLowerCase().includes(q)) ||
            (g.recipient_name && g.recipient_name.toLowerCase().includes(q)) ||
            (g.project_code && g.project_code.toLowerCase().includes(q)) ||
            (g.project_name && g.project_name.toLowerCase().includes(q)) ||
            (g.transfer_reason && g.transfer_reason.toLowerCase().includes(q)) ||
            (g.driver_name && g.driver_name.toLowerCase().includes(q)) ||
            (g.vehicle_plate && g.vehicle_plate.toLowerCase().includes(q))
        );
    }

    const badge = document.getElementById('dispatch_count_badge');
    if (badge) {
        badge.textContent = `${guides.length} guías mostradas`;
    }

    lastFilteredDispatchGuides = guides;
    dispatchCurrentPage = 1;
    renderDispatchPaginated();
}

function renderDispatchPaginated() {
    const tbody = document.getElementById('dispatchTableBody');
    if (!tbody) return;

    const guides = lastFilteredDispatchGuides;

    if (guides.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: #94a3b8; padding: 28px;">No se encontraron guías de despacho registradas con el filtro actual.</td></tr>`;
        const container = document.getElementById("dispatchPaginationContainer");
        if (container) container.innerHTML = "";
        return;
    }

    const { startIndex, endIndex } = (window.renderPaginationControls || renderPaginationControls)({
        containerId: "dispatchPaginationContainer",
        totalItems: guides.length,
        currentPage: dispatchCurrentPage,
        pageSize: dispatchPageSize,
        onPageChange: "goToDispatchPage",
        onPageSizeChange: "changeDispatchPageSize",
        itemLabel: "guía(s) de despacho",
        pageSizeOptions: [10, 15, 25, 50, 100]
    });

    const pageItems = guides.slice(startIndex, endIndex);

    tbody.innerHTML = pageItems.map(g => {
        const isFreeform = !!g.is_freeform;
        const isDelivered = (g.status === 'entregada' || g.status === 'entregado_conforme');
        const statusBadge = isDelivered
            ? `<span style="background: #ecfdf5; color: #047857; font-weight: 800; padding: 3px 8px; border-radius: 12px; font-size: 10.5px; border: 1px solid #a7f3d0;"><i class="fa-solid fa-circle-check"></i> Entregada</span>`
            : `<span style="background: #fff7ed; color: #c2410c; font-weight: 800; padding: 3px 8px; border-radius: 12px; font-size: 10.5px; border: 1px solid #fed7aa;"><i class="fa-solid fa-truck-fast"></i> En Tránsito</span>`;

        const typeBadge = isFreeform
            ? `<span style="background: #fef3c7; color: #92400e; font-weight: 800; padding: 2px 7px; border-radius: 6px; font-size: 10px; border: 1px solid #fde68a;"><i class="fa-solid fa-feather-pointed"></i> Libre</span>`
            : `<span style="background: #e0f2fe; color: #0369a1; font-weight: 800; padding: 2px 7px; border-radius: 6px; font-size: 10px; border: 1px solid #bae6fd;"><i class="fa-solid fa-building"></i> Obra</span>`;

        const clientDisplay = isFreeform ? (g.recipient_name || 'Destinatario Libre') : (g.client_name || 'Cliente DALOR');
        const projectDisplay = isFreeform ? (g.transfer_reason || 'Traslado Libre') : (g.project_code ? `${g.project_code} - ${g.project_name}` : 'Servicio Directo');

        return `
            <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.15s ease;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'">
                <td style="padding: 10px; font-weight: 900; color: var(--dalor-navy);">
                    ${g.guide_number}
                </td>
                <td style="padding: 10px; color: #64748b; font-size: 11px;">
                    ${g.dispatch_date || '-'}
                </td>
                <td style="padding: 10px; text-align: center;">
                    ${typeBadge}
                </td>
                <td style="padding: 10px; font-weight: 700; color: #1e293b;">
                    <div>${clientDisplay}</div>
                    <div style="font-size: 10px; color: #64748b; font-weight: 400;">${g.destination_plant ? g.destination_plant + ' &bull; ' : ''}${g.destination_address || ''}</div>
                </td>
                <td style="padding: 10px; color: #334155; font-size: 11.5px;">
                    ${projectDisplay}
                </td>
                <td style="padding: 10px; font-size: 11.5px; color: #475569;">
                    <div><b>${g.driver_name}</b></div>
                    <div style="font-size: 10px; color: #64748b;">${g.vehicle_plate} &bull; ${g.transport_type === 'flete_tercerizado' ? 'Tercerizado' : (g.transport_type === 'retiro_cliente' ? 'Retiro' : 'DALOR')}</div>
                </td>
                <td style="padding: 10px; text-align: center; font-weight: 700;">
                    <span style="background: #f1f5f9; color: #334155; padding: 2px 7px; border-radius: 10px; font-size: 11px;">
                        ${g.items_count || (g.items ? g.items.length : 0)} renglones
                    </span>
                </td>
                <td style="padding: 10px; text-align: right; font-weight: 800; color: #475569;">
                    $${(g.freight_cost_usd || 0).toFixed(2)}
                </td>
                <td style="padding: 10px; text-align: center;">
                    ${statusBadge}
                </td>
                <td style="padding: 10px; text-align: center;">
                    <div style="display: inline-flex; gap: 4px;">
                        <button type="button" onclick="printOfficialDispatchGuide(${g.id})" class="btn-secondary" style="padding: 4px 8px; font-size: 11px;" title="Ver e Imprimir Guía Oficial">
                            <i class="fa-solid fa-print"></i>
                        </button>
                        ${(!isDelivered) ? `
                            <button type="button" onclick="openConfirmDeliveryModal(${g.id}, '${g.guide_number}')" class="btn-primary" style="padding: 4px 8px; font-size: 11px; background: #059669;" title="Confirmar Recepción / Entrega">
                                <i class="fa-solid fa-clipboard-check"></i>
                            </button>
                        ` : ''}
                        <button type="button" onclick="deleteDispatchGuide(${g.id}, '${g.guide_number}')" class="btn-secondary" style="padding: 4px 8px; font-size: 11px; color: #dc2626;" title="Eliminar Guía">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// ==============================================================================
// CONFIRMACIÓN DE ENTREGA EN CLIENTE
// ==============================================================================
function openConfirmDeliveryModal(guideId, guideNum) {
    const hiddenId = document.getElementById('conf_disp_id');
    const textLabel = document.getElementById('conf_disp_guide_text');
    if (hiddenId) hiddenId.value = guideId;
    if (textLabel) {
        textLabel.innerHTML = `Registra los datos de recepción para la <b>Guía N° ${guideNum}</b>:`;
    }
    if (typeof window.openModal === 'function') {
        window.openModal('modalConfirmDelivery');
    } else {
        const modal = document.getElementById('modalConfirmDelivery');
        if (modal) modal.classList.remove('hidden');
    }
}

async function submitConfirmDelivery(event) {
    if (event && event.preventDefault) event.preventDefault();

    const guideId = document.getElementById('conf_disp_id')?.value;
    const receivedBy = (document.getElementById('conf_received_by')?.value || "").trim();
    const receivedIdDoc = (document.getElementById('conf_received_id_doc')?.value || "").trim();
    const notes = (document.getElementById('conf_notes')?.value || "").trim();

    if (!guideId || !receivedBy) {
        alert("Completa el nombre de la persona que recibió en destino.");
        return;
    }

    try {
        const res = await authFetch(`${API_BASE}/dispatch/${guideId}/confirm-delivery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                received_by: receivedBy,
                received_by_client_name: receivedBy,
                received_by_client_id_doc: receivedIdDoc || "V-Receptor",
                notes: notes
            })
        });

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.detail || 'Error al confirmar recepción.');
        }

        if (typeof window.closeModal === 'function') {
            window.closeModal('modalConfirmDelivery');
        } else {
            const modal = document.getElementById('modalConfirmDelivery');
            if (modal) modal.classList.add('hidden');
        }

        if (typeof window.showToast === 'function') {
            window.showToast('Recepción de entrega registrada exitosamente.', 'success');
        } else {
            alert('Recepción de entrega registrada exitosamente.');
        }

        await loadDispatchGuidesList();
    } catch (err) {
        console.error('Error confirmando recepción:', err);
        alert('Error: ' + err.message);
    }
}

// ==============================================================================
// ELIMINACIÓN DE GUÍA
// ==============================================================================
async function deleteDispatchGuide(guideId, guideNum) {
    if (!confirm(`¿Estás seguro de anular/eliminar la Guía de Despacho N° ${guideNum}? Esta acción es irreversible.`)) {
        return;
    }

    try {
        const res = await authFetch(`${API_BASE}/dispatch/${guideId}`, {
            method: 'DELETE'
        });

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.detail || 'Error al eliminar guía.');
        }

        if (typeof window.showToast === 'function') {
            window.showToast(`Guía ${guideNum} eliminada correctamente.`, 'info');
        } else {
            alert(`Guía ${guideNum} eliminada correctamente.`);
        }

        await loadDispatchGuidesList();
    } catch (err) {
        console.error('Error eliminando guía:', err);
        alert('Error: ' + err.message);
    }
}

// ==============================================================================
// GUÍA OFICIAL IMPRIMIBLE (DOCUMENTO DALOR CON RIF J-31601195-0)
// ==============================================================================
async function printOfficialDispatchGuide(guideId) {
    try {
        const res = await authFetch(`${API_BASE}/dispatch/${guideId}`);
        if (!res.ok) throw new Error('No se pudo cargar la información de la guía.');
        const g = await res.json();

        const isFreeform = !!g.is_freeform;
        const clientName = isFreeform ? (g.recipient_name || 'Destinatario Libre') : (g.client_name || 'Cliente DALOR');
        const motiveDisplay = isFreeform ? (g.transfer_reason || 'Traslado Libre') : (`${g.project_code || 'PRJ'} - ${g.project_name || 'Servicio de Taller'}`);

        let itemsHtml = (g.items && g.items.length > 0) ? g.items.map((it, idx) => `
            <tr style="border-bottom: 1px solid #cbd5e1;">
                <td style="padding: 7px; text-align: center; font-weight: 700;">${idx + 1}</td>
                <td style="padding: 7px; font-weight: 600;">${it.description}</td>
                <td style="padding: 7px; text-align: right; font-weight: 800;">${it.quantity}</td>
                <td style="padding: 7px; text-align: center;">${it.unit || 'Pzas'}</td>
                <td style="padding: 7px;">${it.condition_status || 'Listo para Montaje'}</td>
                <td style="padding: 7px; text-align: right;">${it.approx_weight_kg ? it.approx_weight_kg.toFixed(2) + ' Kg' : '-'}</td>
            </tr>
        `).join('') : `<tr><td colspan="6" style="padding: 12px; text-align: center; color: #64748b;">Sin renglones especificados</td></tr>`;

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('Por favor habilita las ventanas emergentes (pop-ups) para imprimir la guía.');
            return;
        }

        printWindow.document.write(`
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <title>Guía de Despacho ${g.guide_number} - DALOR</title>
                <style>
                    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #0f172a; margin: 0; padding: 24px; }
                    .header-box { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #002B49; padding-bottom: 14px; margin-bottom: 14px; }
                    .info-grid { display: grid; grid-template-columns: 1.2fr 1fr; gap: 14px; margin-bottom: 16px; }
                    .info-card { border: 1.5px solid #cbd5e1; border-radius: 6px; padding: 10px 12px; background: #f8fafc; }
                    .info-card h4 { margin: 0 0 6px 0; font-size: 11px; text-transform: uppercase; color: #002B49; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11.5px; }
                    th { background: #002B49; color: white; padding: 8px; text-align: left; font-size: 11px; text-transform: uppercase; }
                    .signatures-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 30px; text-align: center; }
                    .sig-box { border: 1px solid #94a3b8; border-radius: 4px; padding: 8px 6px; height: 95px; display: flex; flex-direction: column; justify-content: space-between; font-size: 10.5px; }
                    .sig-line { border-top: 1px dashed #64748b; margin-top: 35px; padding-top: 4px; font-weight: 700; color: #334155; }
                    @media print {
                        body { padding: 10px; }
                        button { display: none !important; }
                    }
                </style>
            </head>
            <body>
                <div style="text-align: right; margin-bottom: 10px;">
                    <button onclick="window.print()" style="background: #002B49; color: white; border: none; padding: 8px 16px; font-weight: bold; border-radius: 6px; cursor: pointer;">
                        🖨️ Imprimir Guía / Guardar PDF
                    </button>
                </div>

                <div class="header-box">
                    <div style="display: flex; align-items: center; gap: 14px;">
                        <img src="/logo_dalor.jpg" alt="DALOR" style="height: 52px; max-width: 140px; object-fit: contain;" onerror="this.style.display='none'">
                        <div>
                            <h1 style="font-size: 18px; font-weight: 900; color: #002B49; margin: 0; text-transform: uppercase;">Metalmecánica Dalor, C.A.</h1>
                            <p style="font-size: 11px; font-weight: 700; color: #0284c7; margin: 2px 0 0 0;">RIF: <b>J-31601195-0</b> &bull; Mantenimiento Predictivo & Montajes Industriales</p>
                            <p style="font-size: 10px; color: #64748b; margin: 2px 0 0 0;">Av. Cámara de las Industrias, Galpón 10, Z.I. El Tigre, Guacara, Edo. Carabobo &bull; Telf: +58 0412-2407079</p>
                        </div>
                    </div>
                    <div style="text-align: right; border: 2px solid #002B49; padding: 8px 14px; border-radius: 6px; background: #f8fafc; min-width: 220px;">
                        <div style="font-size: 11px; font-weight: 900; color: #002B49; text-transform: uppercase;">GUÍA OFICIAL DE TRASLADO Y NOTA DE ENTREGA</div>
                        <div style="font-size: 18px; font-weight: 900; color: #dc2626; margin-top: 3px;">N° ${g.guide_number}</div>
                        <div style="font-size: 10.5px; color: #475569; margin-top: 2px;">Fecha: <b>${g.dispatch_date || new Date().toLocaleString('es-VE')}</b></div>
                    </div>
                </div>

                <div class="info-grid">
                    <div class="info-card">
                        <h4>1. Datos del Destinatario & Obra / Motivo</h4>
                        <div><b>Destinatario / Razón Social:</b> ${clientName}</div>
                        <div><b>Motivo / Proyecto:</b> ${motiveDisplay}</div>
                        <div><b>Planta / Almacén Destino:</b> ${g.destination_plant || 'Recepción en Sitio'}</div>
                        <div><b>Dirección de Entrega:</b> ${g.destination_address || 'Sin dirección especificada'}</div>
                    </div>

                    <div class="info-card">
                        <h4>2. Control de Transporte & Vehículo</h4>
                        <div><b>Modalidad:</b> ${g.transport_type === 'propio_dalor' ? 'Flota Propia DALOR' : (g.transport_type === 'flete_tercerizado' ? 'Flete Tercerizado' : 'Retiro en Taller por Cliente')}</div>
                        <div><b>Empresa / Fletero:</b> ${g.carrier_company || 'DALOR C.A.'}</div>
                        <div><b>Conductor:</b> ${g.driver_name} (C.I: ${g.driver_id_doc})</div>
                        <div><b>Placa / Batea:</b> <b style="text-transform: uppercase;">${g.vehicle_plate}</b> ${g.vehicle_model ? '(' + g.vehicle_model + ')' : ''}</div>
                    </div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th style="width: 35px; text-align: center;">#</th>
                            <th>Descripción de la Carga / Pieza Fabricada o Reparada</th>
                            <th style="width: 70px; text-align: right;">Cantidad</th>
                            <th style="width: 60px; text-align: center;">Unidad</th>
                            <th style="width: 170px;">Condición Física</th>
                            <th style="width: 80px; text-align: right;">Peso Aprox</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml}
                    </tbody>
                </table>

                <div style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 12px; margin-bottom: 20px; background: #fafafa; font-size: 11px;">
                    <b>Observaciones & Precintos:</b> ${g.notes || 'Carga verificada y apta para despacho.'} &bull; <b>Inspector:</b> ${g.quality_inspector || 'Control de Calidad'}
                </div>

                ${(g.status === 'entregada' || g.status === 'entregado_conforme') ? `
                    <div style="border: 1.5px solid #10b981; border-radius: 6px; padding: 8px 12px; margin-bottom: 20px; background: #ecfdf5; font-size: 11px; color: #065f46;">
                        <i class="fa-solid fa-circle-check"></i> <b>Constancia de Recepción Conforme:</b> Recibido por <b>${g.received_by_client_name}</b> (C.I: ${g.received_by_client_id_doc}) en fecha <b>${g.reception_date}</b>.
                    </div>
                ` : ''}

                <div class="signatures-grid">
                    <div class="sig-box">
                        <span>Despachado por DALOR:</span>
                        <div class="sig-line">${g.dispatcher_name || 'Despacho Taller'}</div>
                    </div>
                    <div class="sig-box">
                        <span>Transportista / Conductor:</span>
                        <div class="sig-line">${g.driver_name}</div>
                    </div>
                    <div class="sig-box">
                        <span>Control de Calidad:</span>
                        <div class="sig-line">${g.quality_inspector || 'DALOR'}</div>
                    </div>
                    <div class="sig-box">
                        <span>Recibido Conforme (Cliente):</span>
                        <div class="sig-line">Firma, C.I. y Sello</div>
                    </div>
                </div>

                <div style="text-align: center; margin-top: 25px; font-size: 10px; color: #64748b;">
                    Documento emitido por el Sistema Integrado de Gestión Operativa (DALOR SIGO-P) &bull; RIF J-31601195-0
                </div>
            </body>
            </html>
        `);
        printWindow.document.close();
    } catch (err) {
        console.error('Error imprimiendo guía de despacho:', err);
        alert('Error: ' + err.message);
    }
}

// ==============================================================================
// PUENTE GLOBAL (WINDOW) & EXPORTS ES6
// ==============================================================================
if (typeof window !== 'undefined') {
    window.switchDispatchSubtab = switchDispatchSubtab;
    window.initDispatchView = initDispatchView;
    window.initDispatchForm = initDispatchForm;
    window.setDispatchMode = setDispatchMode;
    window.setDispatchTransportMode = setDispatchTransportMode;
    window.setDispatchFilter = setDispatchFilter;
    window.filterDispatchList = filterDispatchList;
    window.renderDispatchTable = renderDispatchTable;
    window.onDispatchClientChanged = onDispatchClientChanged;
    window.onDispatchProjectChanged = onDispatchProjectChanged;
    window.loadProjectResourcesIntoDispatch = loadProjectResourcesIntoDispatch;
    window.onDispatchAssetChanged = onDispatchAssetChanged;
    window.addDispatchItemRow = addDispatchItemRow;
    window.removeDispatchItemRow = removeDispatchItemRow;
    window.submitCreateDispatchGuide = submitCreateDispatchGuide;
    window.loadDispatchGuidesList = loadDispatchGuidesList;
    window.openConfirmDeliveryModal = openConfirmDeliveryModal;
    window.submitConfirmDelivery = submitConfirmDelivery;
    window.deleteDispatchGuide = deleteDispatchGuide;
    window.printOfficialDispatchGuide = printOfficialDispatchGuide;
    window.goToDispatchPage = goToDispatchPage;
    window.changeDispatchPageSize = changeDispatchPageSize;
    window.renderDispatchPaginated = renderDispatchPaginated;
}

export {
    switchDispatchSubtab,
    initDispatchView,
    initDispatchForm,
    setDispatchMode,
    setDispatchTransportMode,
    setDispatchFilter,
    filterDispatchList,
    renderDispatchTable,
    onDispatchClientChanged,
    onDispatchProjectChanged,
    loadProjectResourcesIntoDispatch,
    onDispatchAssetChanged,
    addDispatchItemRow,
    removeDispatchItemRow,
    submitCreateDispatchGuide,
    loadDispatchGuidesList,
    openConfirmDeliveryModal,
    submitConfirmDelivery,
    deleteDispatchGuide,
    printOfficialDispatchGuide,
    goToDispatchPage,
    changeDispatchPageSize,
    renderDispatchPaginated
};
