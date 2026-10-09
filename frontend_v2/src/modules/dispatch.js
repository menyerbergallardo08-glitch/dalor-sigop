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
// MODALIDAD: POR OBRA / PROYECTO VS FORMATO ABIERTO VS CONTROL INTERNO
// ==============================================================================
function setDispatchMode(mode) {
    const isFreeform = (mode === 'freeform');
    const isInternal = (mode === 'internal');

    const hiddenFreeform = document.getElementById('disp_is_freeform');
    const hiddenGuideType = document.getElementById('disp_guide_type');
    if (hiddenFreeform) hiddenFreeform.value = isFreeform ? '1' : '0';
    if (hiddenGuideType) hiddenGuideType.value = isInternal ? 'control_interno' : 'traslado_externo';

    const secProject = document.getElementById('disp_sec_project_mode');
    const secFreeform = document.getElementById('disp_sec_freeform_mode');
    const secInternal = document.getElementById('disp_sec_internal_mode');

    const secTransExt = document.getElementById('disp_sec_trans_external');
    const secTransInt = document.getElementById('disp_sec_trans_internal');

    const btnProject = document.getElementById('btn_disp_mode_project');
    const btnFreeform = document.getElementById('btn_disp_mode_freeform');
    const btnInternal = document.getElementById('btn_disp_mode_internal');

    const hint = document.getElementById('disp_mode_hint');
    const step1Title = document.getElementById('disp_step1_title');
    const step2Title = document.getElementById('disp_step2_title');
    const step3Title = document.getElementById('disp_step3_title');

    if (secProject) secProject.style.display = (!isFreeform && !isInternal) ? 'block' : 'none';
    if (secFreeform) secFreeform.style.display = isFreeform ? 'block' : 'none';
    if (secInternal) secInternal.style.display = isInternal ? 'block' : 'none';

    if (secTransExt) secTransExt.style.display = isInternal ? 'none' : 'block';
    if (secTransInt) secTransInt.style.display = isInternal ? 'block' : 'none';

    if (btnProject) btnProject.className = (!isFreeform && !isInternal) ? 'btn-primary' : 'btn-secondary';
    if (btnFreeform) btnFreeform.className = isFreeform ? 'btn-primary' : 'btn-secondary';
    if (btnInternal) btnInternal.className = isInternal ? 'btn-primary' : 'btn-secondary';

    if (hint) {
        if (isInternal) {
            hint.innerHTML = '<i class="fa-solid fa-circle-info" style="color: #2563eb;"></i> <b>Control Interno Taller Guacara:</b> Nomenclatura <b>GCI-2026-XXXX</b> para custodia de maquinaria, herramientas y salida de insumos a taller en sede.';
        } else if (isFreeform) {
            hint.innerHTML = '<i class="fa-solid fa-circle-info" style="color: #0284c7;"></i> <b>Formato Abierto (GD):</b> Traslado legal con correlativo <b>GD-2026-XXXX</b> a destinatario libre.';
        } else {
            hint.innerHTML = '<i class="fa-solid fa-circle-info" style="color: #0284c7;"></i> <b>Por Obra / Proyecto (GD):</b> Emisión de guía oficial <b>GD-2026-XXXX</b> vinculada a un cliente y proyecto registrado.';
        }
    }

    if (step1Title) {
        step1Title.textContent = isInternal 
            ? 'Datos del Traslado Interno & Destino en Sede' 
            : (isFreeform ? 'Datos del Destinatario & Motivo Libre' : 'Datos del Destinatario & Obra / Motivo');
    }
    if (step2Title) {
        step2Title.textContent = isInternal 
            ? 'Custodios & Responsables de Entrega Interna' 
            : 'Modalidad de Transporte, Vehículo & Conductor';
    }
    if (step3Title) {
        step3Title.textContent = isInternal 
            ? 'Maquinaria, Equipos & Insumos en Movimiento Interno' 
            : 'Carga / Piezas / Componentes Despachados';
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
        const ciProjSel = document.getElementById('disp_ci_project_id');
        let projects = window.allProjects || [];
        if (projects.length === 0) {
            const res = await authFetch(`${API_BASE}/projects/`);
            if (res.ok) projects = window.allProjects = await res.json();
        }
        const openProjects = (projects || []).filter(p => {
            const st = (p.status || '').toLowerCase().trim();
            return !['culminado', 'completado', 'cerrado', 'cancelado', 'finalizado', 'inactivo'].includes(st);
        });

        if (projSel) {
            projSel.innerHTML = '<option value="">-- Seleccionar Proyecto Activo DALOR --</option>' +
                openProjects.map(p => `<option value="${p.id}" data-client-id="${p.client_id || ''}">[${p.code || ('PRJ-' + p.id)}] ${p.name}</option>`).join('');
        }
        if (ciProjSel) {
            ciProjSel.innerHTML = '<option value="">-- Operación General Sede (Sin Proyecto) --</option>' +
                openProjects.map(p => `<option value="${p.id}">[${p.code || ('PRJ-' + p.id)}] ${p.name}</option>`).join('');
        }
    } catch (err) {
        console.warn('Error cargando proyectos para despacho:', err);
    }

    // Cargar Personal DALOR (para choferes y custodios internos)
    try {
        let personnel = window.allPersonnel || [];
        if (personnel.length === 0) {
            const resPers = await authFetch(`${API_BASE}/personnel/`);
            if (resPers.ok) personnel = window.allPersonnel = await resPers.json();
        }

        const driverSel = document.getElementById('disp_select_driver_personnel');
        if (driverSel && personnel.length > 0) {
            driverSel.innerHTML = '<option value="">-- Seleccionar Chofer del Personal (Opcional) --</option>' +
                '<option value="__MANUAL__">➕ Escribir Chofer Manualmente / Flete Externo</option>' +
                personnel.map(p => `<option value="${p.id}" data-name="${p.full_name}" data-id-doc="${p.id_document || ''}">[${p.code}] ${p.full_name} (${p.id_document || 'S/C'})</option>`).join('');
        }

        const delSel = document.getElementById('disp_ci_delivered_select');
        if (delSel && personnel.length > 0) {
            delSel.innerHTML = '<option value="">-- Seleccionar de Personal DALOR --</option>' +
                personnel.map(p => `<option value="${p.id}" data-name="${p.full_name}">[${p.code}] ${p.full_name} (${p.role_title || 'Almacén'})</option>`).join('');
        }

        const recSel = document.getElementById('disp_ci_received_select');
        if (recSel && personnel.length > 0) {
            recSel.innerHTML = '<option value="">-- Seleccionar de Personal DALOR --</option>' +
                personnel.map(p => `<option value="${p.id}" data-name="${p.full_name}">[${p.code}] ${p.full_name} (${p.role_title || 'Taller'})</option>`).join('');
        }
    } catch (err) {
        console.warn('Error cargando personal para despacho:', err);
    }

    // Cargar Vehículos DALOR (Flota) filtrando disponibilidad operativa
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
                (a.sub_category && a.sub_category.toLowerCase().includes('veh')) ||
                (a.asset_type && a.asset_type.toLowerCase().includes('veh')) ||
                (a.asset_code && a.asset_code.toLowerCase().includes('veh'))
            );

            const availableVehicles = [];
            const unavailableVehicles = [];

            vehicles.forEach(v => {
                const st = (v.status || '').toLowerCase().trim();
                const isInactive = v.is_active === false;
                const isAssigned = Boolean(v.current_project_id);
                const isUnavail = isInactive || isAssigned || 
                    ['en_obra', 'asignado', 'en_mantenimiento', 'mantenimiento', 'en_reparacion', 'reparacion', 'inactivo', 'desincorporado', 'no_disponible'].includes(st);
                
                if (isUnavail) {
                    unavailableVehicles.push(v);
                } else {
                    availableVehicles.push(v);
                }
            });

            let optsHtml = '';
            if (availableVehicles.length === 0) {
                optsHtml += `<option value="" disabled selected>-- No hay vehículos de flota disponibles (0 disponibles) --</option>`;
            } else {
                optsHtml += `<option value="">-- Seleccionar Vehículo de Flota DALOR (${availableVehicles.length} disponibles) --</option>`;
                optsHtml += availableVehicles.map(v => {
                    const plate = v.license_plate || v.serial_chassis || v.internal_code || '';
                    const code = v.asset_code || v.internal_code || '';
                    return `<option value="${v.id}" data-plate="${plate}" data-model="${v.name}" data-status="${v.status}">✅ [DISPONIBLE] ${v.name} (${code} - Placa: ${plate || 'S/P'})</option>`;
                }).join('');
            }

            if (unavailableVehicles.length > 0) {
                optsHtml += `<optgroup label="⛔ Vehículos No Disponibles (En Obra / Mantenimiento / Taller / Inactivos)">`;
                optsHtml += unavailableVehicles.map(v => {
                    let st = (v.status || 'No Disponible').toUpperCase();
                    if (v.current_project_id && (st === 'DISPONIBLE' || st === 'DISPONIBLE_BASE')) {
                        st = 'EN OBRA';
                    }
                    const plate = v.license_plate || v.serial_chassis || '';
                    return `<option value="${v.id}" disabled style="color: #94a3b8; background-color: #f8fafc;">⛔ [${st}] ${v.name} (${v.asset_code || ''} - Placa: ${plate || 'S/P'})</option>`;
                }).join('');
                optsHtml += `</optgroup>`;
            }

            assetSel.innerHTML = optsHtml;
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

function onDispatchDriverPersonnelChanged() {
    const sel = document.getElementById('disp_select_driver_personnel');
    if (!sel) return;
    const opt = sel.options[sel.selectedIndex];
    if (!opt || !opt.value || opt.value === '__MANUAL__') return;
    const name = opt.getAttribute('data-name') || '';
    const idDoc = opt.getAttribute('data-id-doc') || '';
    const nameInp = document.getElementById('disp_driver_name_propio');
    const idInp = document.getElementById('disp_driver_id_propio');
    if (nameInp && name) nameInp.value = name;
    if (idInp && idDoc) idInp.value = idDoc;
}

function onDispatchCiDeliveredChanged() {
    const sel = document.getElementById('disp_ci_delivered_select');
    if (!sel) return;
    const opt = sel.options[sel.selectedIndex];
    if (!opt || !opt.value) return;
    const name = opt.getAttribute('data-name') || '';
    const inp = document.getElementById('disp_ci_delivered_staff');
    if (inp && name) inp.value = name + ' (Almacén Central DALOR)';
}

function onDispatchCiReceivedChanged() {
    const sel = document.getElementById('disp_ci_received_select');
    if (!sel) return;
    const opt = sel.options[sel.selectedIndex];
    if (!opt || !opt.value) return;
    const name = opt.getAttribute('data-name') || '';
    const inp = document.getElementById('disp_ci_received_staff');
    if (inp && name) inp.value = name + ' (Taller Metalmecánico)';
}

async function loadDalorAssetsIntoDispatch() {
    try {
        let assets = window.allAssets || [];
        if (assets.length === 0) {
            const res = await authFetch(`${API_BASE}/assets/`);
            if (res.ok) assets = window.allAssets = await res.json();
        }
        if (assets.length === 0) {
            alert('No se encontraron activos o herramientas registradas.');
            return;
        }

        const promptText = "Ingresa el nombre o código de la maquinaria/equipo DALOR a agregar:\n(Ej: Máquina de Soldar Miller, Torno Paralelo, Esmeril 9\"):";
        const inputVal = prompt(promptText);
        if (!inputVal) return;

        const match = assets.find(a => 
            (a.name && a.name.toLowerCase().includes(inputVal.toLowerCase())) ||
            (a.asset_code && a.asset_code.toLowerCase().includes(inputVal.toLowerCase()))
        );

        const desc = match 
            ? `Equipo DALOR: ${match.name} (${match.asset_code || match.internal_code || 'S/C'})`
            : `Equipo DALOR: ${inputVal}`;

        addDispatchItemRow(desc, 1, "Unid", "Operativo / En Custodia", 0);
        if (typeof window.showToast === 'function') {
            window.showToast('Equipo agregado a los ítems del vale.', 'success');
        }
    } catch (err) {
        console.error('Error cargando maquinaria DALOR en despacho:', err);
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
        const loc = (project.location || '').toLowerCase();
        const pName = (project.name || '').toLowerCase();
        const isSede = loc.includes('sede') || loc.includes('taller') || loc.includes('guacara') || loc.includes('planta dalor') || pName.includes('taller') || pName.includes('sede');

        if (isSede) {
            setDispatchMode('internal');
            const ciProjSel = document.getElementById('disp_ci_project_id');
            if (ciProjSel) ciProjSel.value = String(projId);
            const areaInp = document.getElementById('disp_ci_destination_area');
            if (areaInp && (!areaInp.value || areaInp.value.includes('Taller Metalmecánico'))) {
                areaInp.value = `${project.name} (Taller / Sede)`;
            }
        } else {
            setDispatchMode('project');
        }

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
        // Retiro por cliente
        driverName = (document.getElementById('disp_driver_name_ret')?.value || "").trim() || "Receptor Autorizado";
        driverIdDoc = (document.getElementById('disp_driver_id_ret')?.value || "").trim() || "V-00000000";
        vehiclePlate = (document.getElementById('disp_plate_ret')?.value || "").trim() || "S/P";
        carrierCompany = "Retiro Directo por Cliente";
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

        switchDispatchSubtab('list');
        await loadDispatchGuidesList();

        // Ofrecer vista de impresión oficial
        if (confirm(`¿Deseas abrir el documento oficial N° ${data.guide_number} para imprimir o guardar en PDF?`)) {
            printOfficialDispatchGuide(data.id);
        }
    } catch (err) {
        console.error('Error al emitir documento de despacho:', err);
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
        if (typeof window.loadProjectRequisitionsBadge === 'function') {
            window.loadProjectRequisitionsBadge();
        }
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
    const countProject = guides.filter(g => !g.is_freeform && g.guide_type !== 'control_interno' && !(g.guide_number && g.guide_number.startsWith('GCI-'))).length;
    const countFreeform = guides.filter(g => g.is_freeform && g.guide_type !== 'control_interno' && !(g.guide_number && g.guide_number.startsWith('GCI-'))).length;
    const countInternal = guides.filter(g => g.guide_type === 'control_interno' || (g.guide_number && g.guide_number.startsWith('GCI-'))).length;
    const countTransit = guides.filter(g => g.status === 'en_transito').length;
    const countDelivered = guides.filter(g => g.status === 'entregada' || g.status === 'entregado_conforme').length;

    const elAll = document.getElementById('count_disp_all');
    const elProj = document.getElementById('count_disp_project');
    const elFree = document.getElementById('count_disp_freeform');
    const elInt = document.getElementById('count_disp_internal');
    const elTrans = document.getElementById('count_disp_transit');
    const elDel = document.getElementById('count_disp_delivered');

    if (elAll) elAll.textContent = countAll;
    if (elProj) elProj.textContent = countProject;
    if (elFree) elFree.textContent = countFreeform;
    if (elInt) elInt.textContent = countInternal;
    if (elTrans) elTrans.textContent = countTransit;
    if (elDel) elDel.textContent = countDelivered;
}

function setDispatchFilter(filter) {
    currentDispatchFilter = filter;
    const filterButtons = ['all', 'project', 'freeform', 'internal', 'transit', 'delivered'];
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
        guides = guides.filter(g => !g.is_freeform && g.guide_type !== 'control_interno' && !(g.guide_number && g.guide_number.startsWith('GCI-')));
    } else if (currentDispatchFilter === 'freeform') {
        guides = guides.filter(g => g.is_freeform && g.guide_type !== 'control_interno' && !(g.guide_number && g.guide_number.startsWith('GCI-')));
    } else if (currentDispatchFilter === 'internal') {
        guides = guides.filter(g => g.guide_type === 'control_interno' || (g.guide_number && g.guide_number.startsWith('GCI-')));
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
            (g.vehicle_plate && g.vehicle_plate.toLowerCase().includes(q)) ||
            (g.delivered_by_staff && g.delivered_by_staff.toLowerCase().includes(q)) ||
            (g.received_by_staff && g.received_by_staff.toLowerCase().includes(q))
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

    const paginateFn = typeof window.renderPaginationControls === 'function' 
        ? window.renderPaginationControls 
        : (typeof renderPaginationControls === 'function' ? renderPaginationControls : () => ({ startIndex: 0, endIndex: guides.length }));

    const { startIndex, endIndex } = paginateFn({
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
        const isInternal = (g.guide_type === 'control_interno' || (g.guide_number && g.guide_number.startsWith('GCI-')));
        const isFreeform = !!g.is_freeform;
        const isDelivered = (g.status === 'entregada' || g.status === 'entregado_conforme');
        const statusBadge = isDelivered
            ? `<span style="background: #ecfdf5; color: #047857; font-weight: 800; padding: 3px 8px; border-radius: 12px; font-size: 10.5px; border: 1px solid #a7f3d0;"><i class="fa-solid fa-circle-check"></i> ${isInternal ? 'Conforme Sede' : 'Entregada'}</span>`
            : `<span style="background: #fff7ed; color: #c2410c; font-weight: 800; padding: 3px 8px; border-radius: 12px; font-size: 10.5px; border: 1px solid #fed7aa;"><i class="fa-solid fa-truck-fast"></i> En Tránsito</span>`;

        let typeBadge = '';
        if (isInternal) {
            typeBadge = `<span style="background: #eff6ff; color: #1e40af; font-weight: 800; padding: 2px 7px; border-radius: 6px; font-size: 10px; border: 1px solid #bfdbfe;"><i class="fa-solid fa-warehouse"></i> Interno GCI</span>`;
        } else if (isFreeform) {
            typeBadge = `<span style="background: #fef3c7; color: #92400e; font-weight: 800; padding: 2px 7px; border-radius: 6px; font-size: 10px; border: 1px solid #fde68a;"><i class="fa-solid fa-feather-pointed"></i> Libre</span>`;
        } else {
            typeBadge = `<span style="background: #e0f2fe; color: #0369a1; font-weight: 800; padding: 2px 7px; border-radius: 6px; font-size: 10px; border: 1px solid #bae6fd;"><i class="fa-solid fa-building"></i> Obra</span>`;
        }

        let clientDisplay = '';
        let projectDisplay = '';
        let transportDisplay = '';

        if (isInternal) {
            const area = g.destination_plant || 'Taller Metalmecánico';
            clientDisplay = `<div><b>${area}</b></div><div style="font-size: 10px; color: #64748b;">Sede Central Guacara</div>`;
            projectDisplay = g.project_name ? `${g.project_code || 'PRJ'} - ${g.project_name}` : (g.transfer_reason || 'Uso en Taller');
            transportDisplay = `<div><b>${g.delivered_by_staff || 'Almacén'} &rarr; ${g.received_by_staff || 'Taller'}</b></div><div style="font-size: 10px; color: #64748b;">Custodia Interna</div>`;
        } else {
            const cName = isFreeform ? (g.recipient_name || 'Destinatario Libre') : (g.client_name || 'Cliente DALOR');
            clientDisplay = `<div>${cName}</div><div style="font-size: 10px; color: #64748b; font-weight: 400;">${g.destination_plant ? g.destination_plant + ' &bull; ' : ''}${g.destination_address || ''}</div>`;
            projectDisplay = isFreeform ? (g.transfer_reason || 'Traslado Libre') : (g.project_code ? `${g.project_code} - ${g.project_name}` : 'Servicio Directo');
            transportDisplay = `<div><b>${g.driver_name || 'Personal DALOR'}</b></div><div style="font-size: 10px; color: #64748b;">${g.vehicle_plate || 'S/P'} &bull; ${g.transport_type === 'flete_tercerizado' ? 'Tercerizado' : (g.transport_type === 'retiro_cliente' ? 'Retiro' : 'DALOR')}</div>`;
        }

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
                    ${clientDisplay}
                </td>
                <td style="padding: 10px; color: #334155; font-size: 11.5px;">
                    ${projectDisplay}
                </td>
                <td style="padding: 10px; font-size: 11.5px; color: #475569;">
                    ${transportDisplay}
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


// ==============================================================================
// MODAL SELECTOR UNIFICADO DE RECURSOS PARA GUIA / CONTROL INTERNO
// (Herramientas, Maquinaria y Materiales en Stock)
// ==============================================================================
let currentPickerTab = 'tools';
let pickerSelectedResources = new Map(); // key: 'type-id', val: { name, code, type, unit, qty, cond }

async function openDispatchResourcePickerModal() {
    pickerSelectedResources.clear();
    updatePickerSelectedCount();
    if (typeof openModal === 'function') {
        openModal('modalDispatchResourcePicker');
    } else {
        const el = document.getElementById('modalDispatchResourcePicker');
        if (el) el.classList.remove('hidden');
    }
    await switchDispatchPickerTab('tools');
}

async function switchDispatchPickerTab(tab) {
    currentPickerTab = tab;
    const btnTools = document.getElementById('tab_disp_pick_tools');
    const btnMach = document.getElementById('tab_disp_pick_machinery');
    const btnMats = document.getElementById('tab_disp_pick_materials');

    if (btnTools) btnTools.className = (tab === 'tools') ? 'btn-primary' : 'btn-secondary';
    if (btnMach) btnMach.className = (tab === 'machinery') ? 'btn-primary' : 'btn-secondary';
    if (btnMats) btnMats.className = (tab === 'materials') ? 'btn-primary' : 'btn-secondary';

    const searchInput = document.getElementById('disp_picker_search');
    if (searchInput) searchInput.value = '';

    await renderDispatchPickerItems();
}

async function renderDispatchPickerItems(filterText = '') {
    const container = document.getElementById('disp_picker_list_container');
    const counterBadge = document.getElementById('disp_picker_items_count');
    if (!container) return;

    container.innerHTML = '<div style="text-align: center; padding: 25px; color: #64748b;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando...</div>';

    try {
        let items = [];

        function getAssetKind(a) {
            const t = (a.asset_type || '').toLowerCase();
            const c = (a.category || '').toLowerCase();
            const code = (a.asset_code || a.code || '').toLowerCase();
            const name = (a.name || '').toLowerCase();

            // 1. Vehículos
            if (t.includes('veh') || c.includes('veh') || code.includes('-v-') || Boolean(a.license_plate)) {
                return 'vehiculo';
            }

            // 2. Maquinaria y Equipos Mayores
            const machKeywords = [
                'torno', 'fresadora', 'generador', 'compresor', 'maquina de soldar', 
                'soldadora', 'plasma', 'prensa', 'plegadora', 'cilindradora', 
                'taladro de columna', 'taladro radial', 'grua', 'montacarga', 'retroexcavadora'
            ];
            if (t.includes('maquinaria') || t.includes('pesado') || machKeywords.some(k => name.includes(k))) {
                return 'machinery';
            }

            // 3. Todo lo demás son herramientas y equipos de taller
            return 'tools';
        }

        if (currentPickerTab === 'tools' || currentPickerTab === 'machinery') {
            let assets = window.allAssets || [];
            if (assets.length === 0) {
                const res = await authFetch(`${API_BASE}/assets/`);
                if (res.ok) assets = window.allAssets = await res.json();
            }

            items = assets.filter(a => getAssetKind(a) === currentPickerTab);
        } else if (currentPickerTab === 'materials') {
            let materials = window.allMaterials || [];
            if (materials.length === 0) {
                const res = await authFetch(`${API_BASE}/materials/`);
                if (res.ok) materials = window.allMaterials = await res.json();
            }
            items = materials;
        }

        // Conteo de badges en pestañas
        const cTools = document.getElementById('count_picker_tools');
        const cMach = document.getElementById('count_picker_machinery');
        const cMats = document.getElementById('count_picker_materials');
        if (window.allAssets && window.allAssets.length > 0) {
            if (cTools) cTools.textContent = window.allAssets.filter(a => getAssetKind(a) === 'tools').length;
            if (cMach) cMach.textContent = window.allAssets.filter(a => getAssetKind(a) === 'machinery').length;
        }
        if (window.allMaterials && cMats) {
            cMats.textContent = window.allMaterials.length;
        }

        // Filtrado por texto
        const query = filterText.toLowerCase().trim();
        const filtered = items.filter(it => {
            if (!query) return true;
            const name = (it.name || '').toLowerCase();
            const code = (it.asset_code || it.code || it.internal_code || '').toLowerCase();
            const brand = (it.brand || '').toLowerCase();
            const model = (it.model || '').toLowerCase();
            const serial = (it.serial_number || '').toLowerCase();
            return name.includes(query) || code.includes(query) || brand.includes(query) || model.includes(query) || serial.includes(query);
        });

        if (counterBadge) counterBadge.textContent = `${filtered.length} disponibles`;

        if (filtered.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 30px; color: #94a3b8;">
                    <i class="fa-solid fa-box-open" style="font-size: 24px; margin-bottom: 6px;"></i>
                    <p style="margin: 0; font-size: 12px;">No se encontraron ítems que coincidan con la búsqueda.</p>
                </div>`;
            return;
        }

        let html = '<div style="display: flex; flex-direction: column; gap: 6px;">';
        filtered.forEach(it => {
            const itemType = (currentPickerTab === 'materials') ? 'mat' : 'asset';
            const itemKey = `${itemType}-${it.id}`;
            const isChecked = pickerSelectedResources.has(itemKey);
            const code = it.asset_code || it.code || it.internal_code || 'S/C';
            const name = it.name || 'Sin Nombre';
            const extra = (currentPickerTab === 'materials')
                ? `Stock: ${it.stock_quantity ?? it.stock ?? 0} ${it.unit_measure || 'UND'}`
                : `Marca: ${it.brand || 'N/A'} | Ubicación: ${it.current_location || 'Base'}`;
            const badgeColor = (currentPickerTab === 'tools') ? '#fef3c7; color: #92400e;' : 
                               (currentPickerTab === 'machinery') ? '#e0e7ff; color: #3730a3;' : '#d1fae5; color: #065f46;';

            html += `
                <label style="display: flex; align-items: center; justify-content: space-between; background: #fff; border: 1.5px solid ${isChecked ? '#3b82f6' : '#e2e8f0'}; border-radius: 6px; padding: 8px 12px; cursor: pointer; transition: all 0.15s ease;">
                    <div style="display: flex; align-items: center; gap: 10px; flex: 1;">
                        <input type="checkbox" onchange="togglePickerItemSelection('${itemKey}', '${itemType}', ${it.id}, this.checked)" ${isChecked ? 'checked' : ''} style="width: 16px; height: 16px; cursor: pointer;">
                        <div>
                            <div style="display: flex; align-items: center; gap: 6px;">
                                <span style="font-family: monospace; font-size: 11px; font-weight: 800; background: ${badgeColor} padding: 2px 6px; border-radius: 4px;">
                                    ${code}
                                </span>
                                <span style="font-size: 12px; font-weight: 700; color: #1e293b;">
                                    ${name}
                                </span>
                            </div>
                            <span style="font-size: 11px; color: #64748b;">
                                ${extra}
                            </span>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <span style="font-size: 10px; font-weight: 700; color: ${it.is_active !== false ? '#10b981' : '#ef4444'}; background: ${it.is_active !== false ? '#ecfdf5' : '#fef2f2'}; padding: 2px 8px; border-radius: 9999px;">
                            ${it.is_active !== false ? 'DISPONIBLE' : 'NO DISPONIBLE'}
                        </span>
                    </div>
                </label>
            `;
        });
        html += '</div>';
        container.innerHTML = html;
    } catch (err) {
        console.error('Error renderizando ítems en picker:', err);
        container.innerHTML = '<div style="color: #ef4444; padding: 20px; text-align: center;">Error al cargar recursos.</div>';
    }
}

function filterDispatchPickerList(text) {
    renderDispatchPickerItems(text);
}

function togglePickerItemSelection(key, type, id, isChecked) {
    if (isChecked) {
        let name = "";
        let code = "";
        let unit = "Unid";
        let cond = "Operativo / En Custodia";

        if (type === 'mat') {
            const m = (window.allMaterials || []).find(x => x.id === id);
            name = m ? m.name : "Material";
            code = m ? (m.code || 'S/C') : "S/C";
            unit = m ? (m.unit_measure || 'Unid') : "Unid";
            cond = "Nuevo / Salida de Almacén";
        } else {
            const a = (window.allAssets || []).find(x => x.id === id);
            name = a ? a.name : "Activo";
            code = a ? (a.asset_code || a.internal_code || 'S/C') : "S/C";
            unit = "Unid";
            cond = "Operativo / En Custodia";
        }

        pickerSelectedResources.set(key, {
            type,
            id,
            name,
            code,
            unit,
            cond,
            qty: 1
        });
    } else {
        pickerSelectedResources.delete(key);
    }
    updatePickerSelectedCount();
    const container = document.getElementById('disp_picker_list_container');
    if (container) {
        const labels = container.querySelectorAll('label');
        labels.forEach(lbl => {
            const chk = lbl.querySelector('input[type="checkbox"]');
            if (chk) {
                lbl.style.borderColor = chk.checked ? '#3b82f6' : '#e2e8f0';
            }
        });
    }
}

function updatePickerSelectedCount() {
    const el = document.getElementById('disp_picker_selected_count');
    if (el) el.textContent = pickerSelectedResources.size;
}

function confirmAddSelectedResourcesToDispatch() {
    if (pickerSelectedResources.size === 0) {
        alert("Por favor selecciona al menos una herramienta, maquinaria o material.");
        return;
    }

    const tbody = document.getElementById('dispatchItemsTableBody');
    if (tbody && tbody.children.length === 1) {
        const firstDesc = tbody.children[0].querySelector('.disp-item-desc')?.value.trim();
        if (!firstDesc) {
            tbody.innerHTML = '';
        }
    }

    let addedCount = 0;
    pickerSelectedResources.forEach(item => {
        let desc = "";
        if (item.type === 'mat') {
            desc = `[${item.code}] ${item.name}`;
        } else {
            const prefix = (currentPickerTab === 'machinery') ? 'Maquinaria / Equipo' : 'Herramienta';
            desc = `${prefix}: ${item.name} (${item.code})`;
        }
        addDispatchItemRow(desc, item.qty, item.unit, item.cond, 0);
        addedCount++;
    });

    closeModal('modalDispatchResourcePicker');
    if (typeof window.showToast === 'function') {
        window.showToast(`Se agregaron ${addedCount} recursos a la guía de despacho.`, 'success');
    } else {
        alert(`✅ Se agregaron ${addedCount} recursos a los renglones de la guía.`);
    }
}

// ==============================================================================
// PUENTE GLOBAL (WINDOW) & EXPORTS ES6
// ==============================================================================
if (typeof window !== 'undefined') {
    window.switchDispatchSubtab = switchDispatchSubtab;
    window.initDispatchView = initDispatchView;
    window.initDispatchForm = initDispatchForm;
        window.openDispatchResourcePickerModal = openDispatchResourcePickerModal;
    window.switchDispatchPickerTab = switchDispatchPickerTab;
    window.filterDispatchPickerList = filterDispatchPickerList;
    window.togglePickerItemSelection = togglePickerItemSelection;
    window.confirmAddSelectedResourcesToDispatch = confirmAddSelectedResourcesToDispatch;
    window.setDispatchMode = setDispatchMode;
    window.setDispatchTransportMode = setDispatchTransportMode;
    window.setDispatchFilter = setDispatchFilter;
    window.filterDispatchList = filterDispatchList;
    window.renderDispatchTable = renderDispatchTable;
    window.onDispatchClientChanged = onDispatchClientChanged;
    window.onDispatchProjectChanged = onDispatchProjectChanged;
    window.loadProjectResourcesIntoDispatch = loadProjectResourcesIntoDispatch;
    window.onDispatchAssetChanged = onDispatchAssetChanged;
    window.onDispatchDriverPersonnelChanged = onDispatchDriverPersonnelChanged;
    window.onDispatchCiDeliveredChanged = onDispatchCiDeliveredChanged;
    window.onDispatchCiReceivedChanged = onDispatchCiReceivedChanged;
    window.loadDalorAssetsIntoDispatch = loadDalorAssetsIntoDispatch;
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
    openDispatchResourcePickerModal,
    switchDispatchPickerTab,
    filterDispatchPickerList,
    confirmAddSelectedResourcesToDispatch,
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
    onDispatchDriverPersonnelChanged,
    onDispatchCiDeliveredChanged,
    onDispatchCiReceivedChanged,
    loadDalorAssetsIntoDispatch,
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
