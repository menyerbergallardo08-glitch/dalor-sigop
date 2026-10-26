/**
 * DALOR SIGO-P | Módulo: DISPATCH_FORM_SETUP.JS
 * Configuración de modalidades de guía (Obra, Formato Abierto, Control Interno),
 * transporte y carga reactiva de selectores (Clientes, Proyectos, Flota y Personal).
 */

var API_BASE = window.API_BASE || (window.location.origin + "/api/v1");

function authFetch(url, options = {}) {
    var _t = sessionStorage.getItem('dalor_token') || localStorage.getItem('dalor_token') || '';
    var _h = Object.assign({}, options.headers || {});
    if (_t) _h['Authorization'] = 'Bearer ' + _t;
    return window.fetch(url, Object.assign({}, options, { headers: _h }));
}

// ==============================================================================
// MODALIDAD: POR OBRA / PROYECTO VS FORMATO ABIERTO VS CONTROL INTERNO
// ==============================================================================
export function setDispatchMode(mode) {
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
export function setDispatchTransportMode(mode) {
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
export async function initDispatchForm() {
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
        if (typeof window.addDispatchItemRow === 'function') {
            window.addDispatchItemRow();
        }
    }
}

export function onDispatchDriverPersonnelChanged() {
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

export function onDispatchCiDeliveredChanged() {
    const sel = document.getElementById('disp_ci_delivered_select');
    if (!sel) return;
    const opt = sel.options[sel.selectedIndex];
    if (!opt || !opt.value) return;
    const name = opt.getAttribute('data-name') || '';
    const inp = document.getElementById('disp_ci_delivered_staff');
    if (inp && name) inp.value = name + ' (Almacén Central DALOR)';
}

export function onDispatchCiReceivedChanged() {
    const sel = document.getElementById('disp_ci_received_select');
    if (!sel) return;
    const opt = sel.options[sel.selectedIndex];
    if (!opt || !opt.value) return;
    const name = opt.getAttribute('data-name') || '';
    const inp = document.getElementById('disp_ci_received_staff');
    if (inp && name) inp.value = name + ' (Taller Metalmecánico)';
}

export async function loadDalorAssetsIntoDispatch() {
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

        if (typeof window.addDispatchItemRow === 'function') {
            window.addDispatchItemRow(desc, 1, "Unid", "Operativo / En Custodia", 0);
        }
        if (typeof window.showToast === 'function') {
            window.showToast('Equipo agregado a los ítems del vale.', 'success');
        }
    } catch (err) {
        console.error('Error cargando maquinaria DALOR en despacho:', err);
    }
}

export function onDispatchClientChanged() {
    const clientSel = document.getElementById('disp_client_id');
    const projSel = document.getElementById('disp_project_id');
    if (!clientSel || !projSel) return;

    const clientId = clientSel.value;
    let matchCount = 0;

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

export function onDispatchProjectChanged() {
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
            onDispatchClientChanged();
            projSel.value = String(projId);
        }
        const plantInput = document.getElementById('disp_destination_plant');
        if (plantInput && !plantInput.value) {
            plantInput.value = project.name || 'Planta de Obra';
        }
    }
}

export async function loadProjectResourcesIntoDispatch() {
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

        const addFn = typeof window.addDispatchItemRow === 'function' ? window.addDispatchItemRow : null;
        if (!addFn) return;

        let added = 0;
        if (projData.materials && projData.materials.length > 0) {
            projData.materials.forEach(m => {
                addFn(m.material_name || m.name || 'Insumo de Obra', m.quantity || 1, m.unit || 'Pzas', 'Nuevo / En Obra', 0);
                added++;
            });
        }

        if (projData.assets && projData.assets.length > 0) {
            projData.assets.forEach(a => {
                addFn(`Equipo / Herramienta: ${a.name} (${a.internal_code || 'S/C'})`, 1, 'Unid', 'Operativo / En Uso', 0);
                added++;
            });
        }

        if (added === 0) {
            addFn(`Materiales para: ${projData.name || 'Proyecto'}`, 1, 'Lote', 'Reparado / Listo para Montaje', 0);
            if (typeof window.showToast === 'function') window.showToast('Se cargó renglón base del proyecto.', 'info');
        } else {
            if (typeof window.showToast === 'function') window.showToast(`Se cargaron ${added} ítems asignados al proyecto.`, 'success');
        }
    } catch (err) {
        console.error('Error cargando recursos de proyecto:', err);
        if (typeof window.addDispatchItemRow === 'function') window.addDispatchItemRow();
    }
}

export function onDispatchAssetChanged() {
    const sel = document.getElementById('disp_select_asset');
    if (!sel) return;

    const opt = sel.options[sel.selectedIndex];
    const plate = opt ? (opt.getAttribute('data-plate') || '') : '';
    const model = opt ? (opt.getAttribute('data-model') || '') : '';
    const plateInput = document.getElementById('disp_plate_propio');
    const manualVehInput = document.getElementById('disp_vehicle_model_propio');
    if (plateInput && plate) {
        plateInput.value = plate.toUpperCase();
    }
    if (manualVehInput && model) {
        manualVehInput.value = model;
    }
}

// PUENTE GLOBAL WINDOW
if (typeof window !== 'undefined') {
    window.setDispatchMode = setDispatchMode;
    window.setDispatchTransportMode = setDispatchTransportMode;
    window.initDispatchForm = initDispatchForm;
    window.onDispatchDriverPersonnelChanged = onDispatchDriverPersonnelChanged;
    window.onDispatchCiDeliveredChanged = onDispatchCiDeliveredChanged;
    window.onDispatchCiReceivedChanged = onDispatchCiReceivedChanged;
    window.loadDalorAssetsIntoDispatch = loadDalorAssetsIntoDispatch;
    window.onDispatchClientChanged = onDispatchClientChanged;
    window.onDispatchProjectChanged = onDispatchProjectChanged;
    window.loadProjectResourcesIntoDispatch = loadProjectResourcesIntoDispatch;
    window.onDispatchAssetChanged = onDispatchAssetChanged;
}
