// Sigop ERP - Submódulo de Proyectos Modularizado
const API_BASE = (typeof window !== 'undefined' && window.API_BASE) || '/api/v1';

const authFetch = (url, options = {}) => {
    const token = (typeof localStorage !== 'undefined' && localStorage.getItem('token')) || (typeof window !== 'undefined' && window.authToken);
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (options.body instanceof FormData) {
        delete headers['Content-Type'];
    }
    return window.fetch(url, { ...options, headers });
};

// ==============================================================================
// 🚚 SOLICITUD DE RECURSOS & MATERIALES A ALMACÉN (FLUJO OBRA -> DESPACHO)
// ==============================================================================

var reqSelectedPersonnelIds = [];
var reqSelectedVehicleIds = [];
var reqSelectedToolIds = [];
var reqSelectedMaterialItems = [];

async function openRequestProjectResourcesModal(projectId) {
    let pId = projectId;
    if (!pId) {
        const modalEl = document.getElementById("modalProjectDetail");
        if (modalEl && modalEl.dataset && modalEl.dataset.projectId) {
            pId = parseInt(modalEl.dataset.projectId, 10);
        } else if (window.currentViewingProjectId) {
            pId = window.currentViewingProjectId;
        } else if (typeof window.resolveCurrentProjectId === 'function') {
            pId = window.resolveCurrentProjectId();
        }
    }
    if (!pId) {
        alert("Por favor selecciona una obra válida.");
        return;
    }
    projectId = pId;
    
    reqSelectedPersonnelIds = [];
    reqSelectedVehicleIds = [];
    reqSelectedToolIds = [];
    reqSelectedMaterialItems = [];

    const p = (allProjects || []).find(x => x.id === projectId) || {};
    
    // Validar si la obra está culminada
    if (p.status === 'culminado') {
        const hasAddendum = (p.addendums_count > 0) || (Array.isArray(p.addendums) && p.addendums.length > 0);
        if (!hasAddendum) {
            alert(`⚠️ La obra [${p.code}] '${p.name}' se encuentra CULMINADA y cerrada.\n\nNo se permite solicitar ni despachar insumos a una obra cerrada a menos que cuente con una Adenda Contractual aprobada.`);
            return;
        }
    }

    const titleEl = document.getElementById("reqProjModalTitle");
    const subEl = document.getElementById("reqProjModalSubtitle");
    const idInput = document.getElementById("req_proj_id");
    const destInput = document.getElementById("req_proj_destination");

    if (titleEl) titleEl.innerHTML = `<i class="fa-solid fa-truck-ramp-box" style="color: #0284c7;"></i> Solicitar Recursos y Materiales a Almacén &bull; [${p.code || 'OBRA'}]`;
    if (subEl) subEl.textContent = `Proyecto: ${p.name || ''} | Cliente: ${p.client_name || 'General'}`;
    if (idInput) idInput.value = projectId;
    if (destInput) {
        destInput.value = p.name ? `[${p.code}] ${p.name} - ${p.location || 'En Obra'}` : (p.location || "En Obra");
        destInput.readOnly = true;
        destInput.style.backgroundColor = '#f1f5f9';
        destInput.style.cursor = 'not-allowed';
    }

    // Cargar alerta de guías existentes si las hay
    const existingGuidesBanner = document.getElementById("req_proj_existing_guides_banner");
    if (existingGuidesBanner) {
        try {
            const gRes = await authFetch(`${API_BASE}/dispatch/?project_id=${projectId}`);
            if (gRes.ok) {
                const gData = await gRes.json();
                if (Array.isArray(gData) && gData.length > 0) {
                    existingGuidesBanner.style.display = 'block';
                    existingGuidesBanner.innerHTML = `
                        <div style="background: #e0f2fe; border: 1px solid #7dd3fc; border-radius: 6px; padding: 6px 10px; margin-bottom: 10px; font-size: 11px; color: #0369a1; display: flex; justify-content: space-between; align-items: center;">
                            <span><i class="fa-solid fa-info-circle"></i> Esta obra ya cuenta con <b>${gData.length} guía(s) de despacho</b> emitidas.</span>
                            <button type="button" onclick="navigateToProjectGuides(${projectId}, '${p.code}')" class="btn-secondary" style="font-size: 10.5px; padding: 2px 8px; background: white; color: #0284c7; border: 1px solid #bae6fd;">
                                <i class="fa-solid fa-truck"></i> Ver Guías
                            </button>
                        </div>
                    `;
                } else {
                    existingGuidesBanner.style.display = 'none';
                }
            }
        } catch(e) {
            existingGuidesBanner.style.display = 'none';
        }
    }

    await loadInitialMasterData();
    populateRequestModalDropdowns();
    renderReqAssignedTags();

    const locLower = `${p.location || ''} ${p.name || ''}`.toLowerCase();
    const isInternalProj = locLower.includes('sede') || locLower.includes('guacara') || locLower.includes('taller');
    setRequestDispatchMode(isInternalProj ? 'sede' : 'foranea');

    openModal("modalRequestProjectResources");
}

function setRequestDispatchMode(mode) {
    const isSede = (mode === 'sede');
    const hiddenInternal = document.getElementById("req_is_internal");
    if (hiddenInternal) hiddenInternal.value = isSede ? '1' : '0';

    const btnForanea = document.getElementById("btn_req_mode_foranea");
    const btnSede = document.getElementById("btn_req_mode_sede");
    const badge = document.getElementById("req_guide_badge");
    const driverCont = document.getElementById("req_driver_container");
    const custodyCont = document.getElementById("req_internal_custody_container");
    const fleetSection = document.getElementById("req_fleet_section");

    if (btnForanea) {
        btnForanea.className = !isSede ? 'btn-primary' : 'btn-secondary';
        btnForanea.style.fontWeight = !isSede ? '800' : '600';
    }
    if (btnSede) {
        btnSede.className = isSede ? 'btn-primary' : 'btn-secondary';
        btnSede.style.fontWeight = isSede ? '800' : '600';
    }
    if (badge) {
        badge.textContent = isSede ? 'GCI-2026-XXXX (Control Interno Sede)' : 'GD-2026-XXXX (Guía Oficial)';
        badge.style.background = isSede ? '#fef3c7' : '#e0f2fe';
        badge.style.color = isSede ? '#92400e' : '#0284c7';
    }
    if (driverCont) driverCont.style.display = isSede ? 'none' : 'block';
    if (custodyCont) custodyCont.style.display = isSede ? 'block' : 'none';
    if (fleetSection) fleetSection.style.display = isSede ? 'none' : 'block';
}

function onRequestDriverChanged(selectEl) {
    const manualBox = document.getElementById("req_manual_driver_box");
    if (manualBox) {
        manualBox.style.display = (selectEl.value === '__MANUAL__') ? 'block' : 'none';
    }
}

function getResourceProjectTag(projId) {
    if (!projId) return '';
    const projs = window.allProjects || allProjects || [];
    const p = projs.find(x => x.id === projId);
    return p ? `${p.code} - ${p.name || ''}`.trim() : `Obra ID ${projId}`;
}

function populateRequestModalDropdowns() {
    const rawPersonnel = (window.allPersonnel && window.allPersonnel.length > 0) ? window.allPersonnel : (allPersonnel || []);
    const rawAssets = (window.allAssets && window.allAssets.length > 0) ? window.allAssets : (allAssets || []);
    const safeMats = (window.allMaterials && window.allMaterials.length > 0) ? window.allMaterials : (allMaterials || []);

    // 0. Chofer / Conductor Responsable de Traslado
    const driverSel = document.getElementById("req_driver_id");
    if (driverSel) {
        const activePers = rawPersonnel.filter(pers => pers.is_active !== false);
        driverSel.innerHTML = `<option value="">-- Seleccionar Chofer Responsable del Traslado --</option>` +
            `<option value="__MANUAL__">➕ Escribir Chofer Manual / Fletero Externo</option>` +
            activePers.map(pers => `<option value="${pers.id}" data-name="${pers.full_name}">[${pers.code}] ${pers.full_name} (${pers.role_title || 'Conductor'})</option>`).join('');
    }

    // 1. Personal
    const persSel = document.getElementById("req_select_personnel");
    if (persSel) {
        const activePers = rawPersonnel.filter(p => p.is_active !== false);
        const availPers = activePers.filter(p => !p.current_project_id && (p.status === 'disponible_base' || p.status === 'disponible' || !p.status) && p.status !== 'en_obra');
        const busyPers = activePers.filter(p => p.current_project_id || p.status === 'en_obra');

        let persHtml = `<option value="">-- Seleccionar Personal (${availPers.length} disp. en base) --</option>`;
        if (availPers.length > 0) {
            persHtml += `<optgroup label="✅ Disponibles en Base (${availPers.length})">` +
                availPers.map(p => `<option value="${p.id}">[${p.code}] ${p.full_name} (${p.role_title || 'Técnico'})</option>`).join('') +
                `</optgroup>`;
        }
        if (busyPers.length > 0) {
            persHtml += `<optgroup label="⚠️ Asignados a Otra Obra (Requiere Transferencia)">` +
                busyPers.map(p => {
                    const tag = getResourceProjectTag(p.current_project_id);
                    return `<option value="${p.id}" disabled style="color: #64748b; background: #f8fafc;">[${p.code}] ${p.full_name} 🚫 (Asignado a: ${tag})</option>`;
                }).join('') +
                `</optgroup>`;
        }
        persSel.innerHTML = persHtml;
    }

    // 2. Vehículos
    const vehSel = document.getElementById("req_select_fleet");
    if (vehSel) {
        const vehicles = rawAssets.filter(a => (a.asset_type === 'vehiculo' || a.asset_type === 'camioneta') && a.is_active !== false);
        const availVeh = vehicles.filter(v => !v.current_project_id && (v.status === 'disponible_base' || v.status === 'disponible' || !v.status) && v.status !== 'en_obra' && v.status !== 'alquilado_a_tercero');
        const busyVeh = vehicles.filter(v => v.current_project_id || v.status === 'en_obra' || v.status === 'alquilado_a_tercero');

        let vehHtml = `<option value="">-- Seleccionar Unidad (${availVeh.length} disp. en base) --</option>`;
        if (availVeh.length > 0) {
            vehHtml += `<optgroup label="✅ Disponibles en Base (${availVeh.length})">` +
                availVeh.map(v => `<option value="${v.id}">[${v.asset_code}] ${v.name} ${v.license_plate ? `(${v.license_plate})` : ''} - Ubic: ${v.current_location || 'Base'}</option>`).join('') +
                `</optgroup>`;
        }
        if (busyVeh.length > 0) {
            vehHtml += `<optgroup label="⚠️ Asignados a Otra Obra (Requiere Transferencia)">` +
                busyVeh.map(v => {
                    const tag = v.status === 'alquilado_a_tercero' ? 'Alquiler a Tercero' : (getResourceProjectTag(v.current_project_id) || 'En otra obra');
                    return `<option value="${v.id}" disabled style="color: #64748b; background: #f8fafc;">[${v.asset_code}] ${v.name} ${v.license_plate ? `(${v.license_plate})` : ''} 🚫 (Asignado a: ${tag})</option>`;
                }).join('') +
                `</optgroup>`;
        }
        vehSel.innerHTML = vehHtml;
    }

    // 3. Herramientas
    const toolSel = document.getElementById("req_select_tools");
    if (toolSel) {
        const tools = rawAssets.filter(a => a.asset_type !== 'vehiculo' && a.asset_type !== 'camioneta' && a.is_active !== false);
        const availTools = tools.filter(t => !t.current_project_id && (t.status === 'disponible_base' || t.status === 'disponible' || !t.status) && t.status !== 'en_obra' && t.status !== 'alquilado_a_tercero');
        const busyTools = tools.filter(t => t.current_project_id || t.status === 'en_obra' || t.status === 'alquilado_a_tercero');

        let toolHtml = `<option value="">-- Seleccionar Herramienta (${availTools.length} disp. en base) --</option>`;
        if (availTools.length > 0) {
            toolHtml += `<optgroup label="✅ Disponibles en Base (${availTools.length})">` +
                availTools.map(t => `<option value="${t.id}">[${t.asset_code}] ${t.name} (S/N: ${t.serial_number || 'S/N'})</option>`).join('') +
                `</optgroup>`;
        }
        if (busyTools.length > 0) {
            toolHtml += `<optgroup label="⚠️ Asignadas a Otra Obra (Requiere Transferencia)">` +
                busyTools.map(t => {
                    const tag = t.status === 'alquilado_a_tercero' ? 'Alquiler a Tercero' : (getResourceProjectTag(t.current_project_id) || 'En otra obra');
                    return `<option value="${t.id}" disabled style="color: #64748b; background: #f8fafc;">[${t.asset_code}] ${t.name} 🚫 (Asignada a: ${tag})</option>`;
                }).join('') +
                `</optgroup>`;
        }
        toolSel.innerHTML = toolHtml;
    }

    // 4. Materiales con Stock > 0
    const matSel = document.getElementById("req_select_materials");
    const availableMats = safeMats.filter(m => (parseFloat(m.stock_quantity) || 0) > 0);
    if (matSel) {
        matSel.innerHTML = `<option value="">-- Seleccionar Material (${availableMats.length} con stock) --</option>` +
            availableMats.map(m => `<option value="${m.id}" data-unit="${m.unit_measure || 'UND'}" data-stock="${m.stock_quantity}">[${m.code}] ${m.name} (Stock: ${m.stock_quantity} ${m.unit_measure || 'UND'})</option>`).join('');
    }
}

function filterReqDropdown(type, query) {
    const q = (query || '').toLowerCase().trim();
    if (type === 'personnel') {
        const sel = document.getElementById("req_select_personnel");
        const rawPersonnel = (window.allPersonnel && window.allPersonnel.length > 0) ? window.allPersonnel : (allPersonnel || []);
        const activePers = rawPersonnel.filter(p => p.is_active !== false);
        const availPers = activePers.filter(p => !p.current_project_id && (p.status === 'disponible_base' || p.status === 'disponible' || !p.status) && p.status !== 'en_obra');
        const busyPers = activePers.filter(p => p.current_project_id || p.status === 'en_obra');

        const match = p => !q || (p.full_name || '').toLowerCase().includes(q) || (p.code || '').toLowerCase().includes(q) || (p.role_title || '').toLowerCase().includes(q);
        const fAvail = availPers.filter(match);
        const fBusy = busyPers.filter(match);

        let html = `<option value="">-- Seleccionar Personal (${fAvail.length} disp.) --</option>`;
        if (fAvail.length > 0) {
            html += `<optgroup label="✅ Disponibles en Base (${fAvail.length})">` +
                fAvail.map(p => `<option value="${p.id}">[${p.code}] ${p.full_name} (${p.role_title || 'Técnico'})</option>`).join('') +
                `</optgroup>`;
        }
        if (fBusy.length > 0) {
            html += `<optgroup label="⚠️ Asignados a Otra Obra (Requiere Transferencia)">` +
                fBusy.map(p => `<option value="${p.id}" disabled style="color: #64748b; background: #f8fafc;">[${p.code}] ${p.full_name} 🚫 (Asignado a: ${getResourceProjectTag(p.current_project_id)})</option>`).join('') +
                `</optgroup>`;
        }
        if (sel) sel.innerHTML = html;
    } else if (type === 'fleet') {
        const sel = document.getElementById("req_select_fleet");
        const rawAssets = (window.allAssets && window.allAssets.length > 0) ? window.allAssets : (allAssets || []);
        const vehicles = rawAssets.filter(a => (a.asset_type === 'vehiculo' || a.asset_type === 'camioneta') && a.is_active !== false);
        const availVeh = vehicles.filter(v => !v.current_project_id && (v.status === 'disponible_base' || v.status === 'disponible' || !v.status) && v.status !== 'en_obra' && v.status !== 'alquilado_a_tercero');
        const busyVeh = vehicles.filter(v => v.current_project_id || v.status === 'en_obra' || v.status === 'alquilado_a_tercero');

        const match = v => !q || (v.name || '').toLowerCase().includes(q) || (v.asset_code || '').toLowerCase().includes(q) || (v.license_plate || '').toLowerCase().includes(q);
        const fAvail = availVeh.filter(match);
        const fBusy = busyVeh.filter(match);

        let html = `<option value="">-- Seleccionar Unidad (${fAvail.length} disp.) --</option>`;
        if (fAvail.length > 0) {
            html += `<optgroup label="✅ Disponibles en Base (${fAvail.length})">` +
                fAvail.map(v => `<option value="${v.id}">[${v.asset_code}] ${v.name} ${v.license_plate ? `(${v.license_plate})` : ''}</option>`).join('') +
                `</optgroup>`;
        }
        if (fBusy.length > 0) {
            html += `<optgroup label="⚠️ Asignados a Otra Obra (Requiere Transferencia)">` +
                fBusy.map(v => {
                    const tag = v.status === 'alquilado_a_tercero' ? 'Alquiler a Tercero' : (getResourceProjectTag(v.current_project_id) || 'En otra obra');
                    return `<option value="${v.id}" disabled style="color: #64748b; background: #f8fafc;">[${v.asset_code}] ${v.name} 🚫 (Asignado a: ${tag})</option>`;
                }).join('') +
                `</optgroup>`;
        }
        if (sel) sel.innerHTML = html;
    } else if (type === 'tools') {
        const sel = document.getElementById("req_select_tools");
        const rawAssets = (window.allAssets && window.allAssets.length > 0) ? window.allAssets : (allAssets || []);
        const tools = rawAssets.filter(a => a.asset_type !== 'vehiculo' && a.asset_type !== 'camioneta' && a.is_active !== false);
        const availTools = tools.filter(t => !t.current_project_id && (t.status === 'disponible_base' || t.status === 'disponible' || !t.status) && t.status !== 'en_obra' && t.status !== 'alquilado_a_tercero');
        const busyTools = tools.filter(t => t.current_project_id || t.status === 'en_obra' || t.status === 'alquilado_a_tercero');

        const match = t => !q || (t.name || '').toLowerCase().includes(q) || (t.asset_code || '').toLowerCase().includes(q) || (t.serial_number || '').toLowerCase().includes(q);
        const fAvail = availTools.filter(match);
        const fBusy = busyTools.filter(match);

        let html = `<option value="">-- Seleccionar Herramienta (${fAvail.length} disp.) --</option>`;
        if (fAvail.length > 0) {
            html += `<optgroup label="✅ Disponibles en Base (${fAvail.length})">` +
                fAvail.map(t => `<option value="${t.id}">[${t.asset_code}] ${t.name} (S/N: ${t.serial_number || 'S/N'})</option>`).join('') +
                `</optgroup>`;
        }
        if (fBusy.length > 0) {
            html += `<optgroup label="⚠️ Asignadas a Otra Obra (Requiere Transferencia)">` +
                fBusy.map(t => {
                    const tag = t.status === 'alquilado_a_tercero' ? 'Alquiler a Tercero' : (getResourceProjectTag(t.current_project_id) || 'En otra obra');
                    return `<option value="${t.id}" disabled style="color: #64748b; background: #f8fafc;">[${t.asset_code}] ${t.name} 🚫 (Asignada a: ${tag})</option>`;
                }).join('') +
                `</optgroup>`;
        }
        if (sel) sel.innerHTML = html;
    } else if (type === 'material') {
        const sel = document.getElementById("req_select_materials");
        const safeMats = (window.allMaterials && window.allMaterials.length > 0) ? window.allMaterials : (allMaterials || []);
        const availableMats = safeMats.filter(m => (parseFloat(m.stock_quantity) || 0) > 0);
        const filtered = q ? availableMats.filter(m => (m.name || '').toLowerCase().includes(q) || (m.code || '').toLowerCase().includes(q)) : availableMats;
        if (sel) {
            sel.innerHTML = `<option value="">-- Seleccionar Material (${filtered.length}) --</option>` +
                filtered.map(m => `<option value="${m.id}" data-unit="${m.unit_measure || 'UND'}" data-stock="${m.stock_quantity}">[${m.code}] ${m.name} (Stock: ${m.stock_quantity} ${m.unit_measure || 'UND'})</option>`).join('');
        }
    }
}

function addReqResource(type) {
    if (type === 'personnel') {
        const sel = document.getElementById("req_select_personnel");
        const opt = sel?.options[sel.selectedIndex];
        if (opt && opt.disabled) {
            alert("⚠️ Este trabajador ya está asignado a otra obra. Para utilizarlo en este proyecto, debe gestionarse mediante 'Transferencia entre Obras'.");
            sel.value = "";
            return;
        }
        const val = parseInt(sel?.value);
        if (val && !reqSelectedPersonnelIds.includes(val)) {
            reqSelectedPersonnelIds.push(val);
            renderReqAssignedTags();
        }
        if (sel) sel.value = "";
    } else if (type === 'fleet') {
        const sel = document.getElementById("req_select_fleet");
        const opt = sel?.options[sel.selectedIndex];
        if (opt && opt.disabled) {
            alert("⚠️ Este vehículo ya está asignado a otra obra. Para utilizarlo en este proyecto, debe gestionarse mediante 'Transferencia entre Obras'.");
            sel.value = "";
            return;
        }
        const val = parseInt(sel?.value);
        if (val && !reqSelectedVehicleIds.includes(val)) {
            reqSelectedVehicleIds.push(val);
            renderReqAssignedTags();
        }
        if (sel) sel.value = "";
    } else if (type === 'tools') {
        const sel = document.getElementById("req_select_tools");
        const opt = sel?.options[sel.selectedIndex];
        if (opt && opt.disabled) {
            alert("⚠️ Esta herramienta ya está asignada a otra obra. Para utilizarla en este proyecto, debe gestionarse mediante 'Transferencia entre Obras'.");
            sel.value = "";
            return;
        }
        const val = parseInt(sel?.value);
        if (val && !reqSelectedToolIds.includes(val)) {
            reqSelectedToolIds.push(val);
            renderReqAssignedTags();
        }
        if (sel) sel.value = "";
    } else if (type === 'material') {
        const sel = document.getElementById("req_select_materials");
        const qtyInp = document.getElementById("req_mat_quantity");
        const val = parseInt(sel?.value);
        let qty = parseFloat(qtyInp?.value) || 0;
        if (!val) {
            alert("Por favor selecciona un material del catálogo.");
            return false;
        }
        if (qty <= 0) {
            alert("Por favor ingresa la cantidad requerida (debe ser mayor a 0).");
            if (qtyInp) qtyInp.focus();
            return false;
        }
        const opt = sel.options[sel.selectedIndex];
        const maxStock = parseFloat(opt?.dataset?.stock) || 0;
        const mUnit = opt?.dataset?.unit || 'UND';
        if (qty > maxStock) {
            alert(`⚠️ Stock insuficiente en almacén:\n\nEstás solicitando ${qty} ${mUnit}, pero el stock disponible en bodega es solo de ${maxStock} ${mUnit}.\n\nPor favor ajusta la cantidad requerida al stock disponible o gestiona una orden de compra para abastecer la diferencia.`);
            if (qtyInp) {
                qtyInp.focus();
                qtyInp.select();
            }
            return false;
        }
        const existing = reqSelectedMaterialItems.find(x => x.material_id === val);
        if (existing) {
            existing.quantity = qty;
        } else {
            reqSelectedMaterialItems.push({ material_id: val, quantity: qty });
        }
        renderReqAssignedTags();
        if (sel) sel.value = "";
        if (qtyInp) {
            qtyInp.value = "";
            qtyInp.removeAttribute("max");
            qtyInp.placeholder = "Cant.";
        }
        return true;
    }
}

function onReqMaterialChanged(sel) {
    const qtyInp = document.getElementById("req_mat_quantity");
    if (!sel || !sel.value) {
        if (qtyInp) { 
            qtyInp.value = ""; 
            qtyInp.removeAttribute("max"); 
            qtyInp.placeholder = "Cant."; 
        }
        return;
    }
    const opt = sel.options[sel.selectedIndex];
    const maxStock = parseFloat(opt?.dataset?.stock) || 0;
    const mUnit = opt?.dataset?.unit || 'UND';
    if (qtyInp) {
        qtyInp.max = maxStock;
        qtyInp.placeholder = `Disp: ${maxStock} ${mUnit}`;
        qtyInp.title = `Stock físico disponible en almacén: ${maxStock} ${mUnit}`;
        // NO se autorrellena con números para evitar errores operativos: el usuario ingresa su cantidad requerida
        qtyInp.value = "";
        qtyInp.focus();
    }
}

function removeReqResource(type, id) {
    if (type === 'personnel') {
        reqSelectedPersonnelIds = reqSelectedPersonnelIds.filter(x => x !== id);
    } else if (type === 'fleet') {
        reqSelectedVehicleIds = reqSelectedVehicleIds.filter(x => x !== id);
    } else if (type === 'tools') {
        reqSelectedToolIds = reqSelectedToolIds.filter(x => x !== id);
    } else if (type === 'material') {
        reqSelectedMaterialItems = reqSelectedMaterialItems.filter(x => x.material_id !== id);
    }
    renderReqAssignedTags();
}

function renderReqAssignedTags() {
    const safePersonnel = (window.allPersonnel && window.allPersonnel.length > 0) ? window.allPersonnel : (allPersonnel || []);
    const safeAssets = (window.allAssets && window.allAssets.length > 0) ? window.allAssets : (allAssets || []);
    const safeMats = (window.allMaterials && window.allMaterials.length > 0) ? window.allMaterials : (allMaterials || []);

    // 1. Personal Tags
    const persContainer = document.getElementById("req_tags_personnel");
    if (persContainer) {
        if (reqSelectedPersonnelIds.length === 0) {
            persContainer.innerHTML = `<span style="font-size:11px; color:#94a3b8;">Sin personal seleccionado.</span>`;
        } else {
            persContainer.innerHTML = reqSelectedPersonnelIds.map(id => {
                const p = safePersonnel.find(item => item.id === id);
                const pCode = p ? p.code : `ID:${id}`;
                const pName = p ? p.full_name : 'Personal';
                return `
                    <span class="resource-tag-pill" style="display:inline-flex; align-items:center; gap:6px; background:#eff6ff; color:#1e40af; border:1px solid #bfdbfe; padding:4px 10px; border-radius:9999px; font-size:11.5px; font-weight:700; margin:2px;">
                        <i class="fa-solid fa-user-check"></i> [${pCode}] ${pName}
                        <button type="button" onclick="removeReqResource('personnel', ${id})" style="background:none; border:none; color:#ef4444; cursor:pointer; font-weight:bold; font-size:13px; line-height:1; padding:0 2px;" title="Eliminar">&times;</button>
                    </span>
                `;
            }).join('');
        }
    }

    // 2. Vehículos Tags
    const vehContainer = document.getElementById("req_tags_fleet");
    if (vehContainer) {
        if (reqSelectedVehicleIds.length === 0) {
            vehContainer.innerHTML = `<span style="font-size:11px; color:#94a3b8;">Sin vehículos seleccionados.</span>`;
        } else {
            vehContainer.innerHTML = reqSelectedVehicleIds.map(id => {
                const v = safeAssets.find(item => item.id === id);
                const vCode = v ? v.asset_code : `ID:${id}`;
                const vName = v ? v.name : 'Vehículo';
                return `
                    <span class="resource-tag-pill" style="display:inline-flex; align-items:center; gap:6px; background:#f0fdf4; color:#166534; border:1px solid #bbf7d0; padding:4px 10px; border-radius:9999px; font-size:11.5px; font-weight:700; margin:2px;">
                        <i class="fa-solid fa-truck"></i> [${vCode}] ${vName}
                        <button type="button" onclick="removeReqResource('fleet', ${id})" style="background:none; border:none; color:#ef4444; cursor:pointer; font-weight:bold; font-size:13px; line-height:1; padding:0 2px;" title="Eliminar">&times;</button>
                    </span>
                `;
            }).join('');
        }
    }

    // 3. Herramientas Tags
    const toolContainer = document.getElementById("req_tags_tools");
    if (toolContainer) {
        if (reqSelectedToolIds.length === 0) {
            toolContainer.innerHTML = `<span style="font-size:11px; color:#94a3b8;">Sin herramientas seleccionadas.</span>`;
        } else {
            toolContainer.innerHTML = reqSelectedToolIds.map(id => {
                const t = safeAssets.find(item => item.id === id);
                const tCode = t ? t.asset_code : `ID:${id}`;
                const tName = t ? t.name : 'Herramienta';
                return `
                    <span class="resource-tag-pill" style="display:inline-flex; align-items:center; gap:6px; background:#fffbeb; color:#92400e; border:1px solid #fde68a; padding:4px 10px; border-radius:9999px; font-size:11.5px; font-weight:700; margin:2px;">
                        <i class="fa-solid fa-wrench"></i> [${tCode}] ${tName}
                        <button type="button" onclick="removeReqResource('tools', ${id})" style="background:none; border:none; color:#ef4444; cursor:pointer; font-weight:bold; font-size:13px; line-height:1; padding:0 2px;" title="Eliminar">&times;</button>
                    </span>
                `;
            }).join('');
        }
    }

    // 4. Materiales Tags
    const matContainer = document.getElementById("req_tags_materials");
    if (matContainer) {
        if (reqSelectedMaterialItems.length === 0) {
            matContainer.innerHTML = `<span style="font-size:11px; color:#94a3b8;">Sin materiales seleccionados.</span>`;
        } else {
            matContainer.innerHTML = reqSelectedMaterialItems.map(item => {
                const m = safeMats.find(x => x.id === item.material_id);
                const mCode = m ? m.code : `MAT-${item.material_id}`;
                const mName = m ? m.name : 'Material';
                const mUnit = m ? (m.unit_measure || 'UND') : 'UND';
                return `
                    <span class="resource-tag-pill" style="display:inline-flex; align-items:center; gap:6px; background:#f0fdfa; color:#0f766e; border:1px solid #99f6e4; padding:4px 10px; border-radius:9999px; font-size:11.5px; font-weight:700; margin:2px;">
                        <i class="fa-solid fa-boxes-stacked"></i> [${mCode}] ${mName} &bull; <b>${item.quantity} ${mUnit}</b>
                        <button type="button" onclick="removeReqResource('material', ${item.material_id})" style="background:none; border:none; color:#ef4444; cursor:pointer; font-weight:bold; font-size:13px; line-height:1; padding:0 2px;" title="Eliminar">&times;</button>
                    </span>
                `;
            }).join('');
        }
    }

    // Actualizar contadores visuales en el modal
    const pCnt = document.getElementById("req_pers_counter");
    if (pCnt) pCnt.innerText = `${reqSelectedPersonnelIds.length} elegidos`;

    const fCnt = document.getElementById("req_fleet_counter");
    if (fCnt) fCnt.innerText = `${reqSelectedVehicleIds.length} elegidos`;

    const tCnt = document.getElementById("req_tools_counter");
    if (tCnt) tCnt.innerText = `${reqSelectedToolIds.length} elegidos`;

    const mCnt = document.getElementById("req_mats_counter");
    if (mCnt) mCnt.innerText = `${reqSelectedMaterialItems.length} renglones`;
}

function navigateToDispatchGuide(guideNumber) {
    if (typeof closeModal === 'function') {
        closeModal('modalProjectDetail');
        closeModal('modalRequestProjectResources');
    }
    if (typeof switchView === 'function') {
        switchView('dispatch', 'operaciones');
    }
    if (typeof switchDispatchSubtab === 'function') {
        switchDispatchSubtab('list');
    }
    setTimeout(() => {
        const searchInp = document.getElementById("dispatch_search_input");
        if (searchInp) {
            searchInp.value = guideNumber;
            if (typeof filterDispatchList === 'function') {
                filterDispatchList(guideNumber);
            }
        }
    }, 200);
}

function navigateToProjectGuides(projectId, projectCode) {
    if (typeof closeModal === 'function') {
        closeModal('modalProjectDetail');
        closeModal('modalRequestProjectResources');
    }
    if (typeof switchView === 'function') {
        switchView('dispatch', 'operaciones');
    }
    if (typeof switchDispatchSubtab === 'function') {
        switchDispatchSubtab('list');
    }
    setTimeout(() => {
        const searchInp = document.getElementById("dispatch_search_input");
        if (searchInp) {
            searchInp.value = projectCode || '';
            if (typeof filterDispatchList === 'function') {
                filterDispatchList(projectCode || '');
            }
        }
    }, 200);
}

async function submitRequestProjectResources(event) {
    if (event) {
        if (typeof event.preventDefault === 'function') event.preventDefault();
        if (typeof event.stopPropagation === 'function') event.stopPropagation();
    }

    const projectId = parseInt(document.getElementById("req_proj_id")?.value);
    const dest = document.getElementById("req_proj_destination")?.value?.trim() || "En Obra";
    const notes = document.getElementById("req_proj_notes")?.value?.trim() || "";

    if (!projectId) {
        alert("Error: Proyecto no identificado.");
        return false;
    }

    // Si el usuario dejó un material seleccionado en el desplegable antes de presionar Enviar:
    const pendingMatSel = document.getElementById("req_select_materials");
    const pendingQtyInp = document.getElementById("req_mat_quantity");
    if (pendingMatSel && pendingMatSel.value) {
        const added = addReqResource('material');
        if (!added) {
            return false; // Frena el envío para que el usuario corrija conscientemente
        }
    }
    const pendingPersSel = document.getElementById("req_select_personnel");
    if (pendingPersSel && pendingPersSel.value) {
        addReqResource('personnel');
    }
    const pendingFleetSel = document.getElementById("req_select_fleet");
    if (pendingFleetSel && pendingFleetSel.value) {
        addReqResource('fleet');
    }
    const pendingToolsSel = document.getElementById("req_select_tools");
    if (pendingToolsSel && pendingToolsSel.value) {
        addReqResource('tools');
    }

    const totalSelected = reqSelectedPersonnelIds.length + reqSelectedVehicleIds.length + reqSelectedToolIds.length + reqSelectedMaterialItems.length;
    if (totalSelected === 0) {
        alert("⚠️ Por favor selecciona al menos un recurso o material a solicitar para la obra.");
        return false;
    }

    const isInternal = document.getElementById("req_is_internal")?.value === "1";
    let driverId = null;
    let driverName = null;
    let deliveredBy = null;
    let receivedBy = null;

    if (!isInternal) {
        const driverSel = document.getElementById("req_driver_id");
        const selVal = driverSel?.value;
        if (!selVal) {
            alert("⚠️ Para emitir una Guía de Despacho Oficial (GD) a obra foránea debes seleccionar o especificar el Conductor/Chofer responsable.");
            return false;
        }
        if (selVal === '__MANUAL__') {
            driverName = (document.getElementById("req_manual_driver_name")?.value || "").trim();
            if (!driverName) {
                alert("⚠️ Por favor ingresa el nombre y datos del conductor manual o fletero.");
                return false;
            }
        } else {
            driverId = parseInt(selVal);
            const opt = driverSel.options[driverSel.selectedIndex];
            driverName = opt?.getAttribute('data-name') || opt?.textContent;
        }
    } else {
        deliveredBy = (document.getElementById("req_delivered_by")?.value || "Almacén Central DALOR (Guacara)").trim();
        receivedBy = (document.getElementById("req_received_by")?.value || "").trim();
    }

    const payload = {
        assigned_personnel_ids: reqSelectedPersonnelIds,
        assigned_vehicle_ids: isInternal ? [] : reqSelectedVehicleIds,
        assigned_tool_ids: reqSelectedToolIds,
        materials: reqSelectedMaterialItems,
        destination_address: dest,
        notes: notes,
        is_internal: isInternal,
        driver_id: driverId,
        driver_name: driverName,
        delivered_by_staff: deliveredBy,
        received_by_staff: receivedBy
    };

    try {
        const res = await authFetch(`${API_BASE}/projects/${projectId}/request-dispatch`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const text = await res.text();
        let data = {};
        try {
            data = JSON.parse(text);
        } catch (e) {
            data = { detail: text || `Error del servidor (${res.status})` };
        }
        if (!res.ok) throw new Error(data.detail || `Error del servidor (${res.status})`);

        closeModal("modalRequestProjectResources");
        await loadInitialMasterData();
        if (typeof loadProjectsList === 'function') await loadProjectsList();
        if (typeof loadDispatchGuidesList === 'function') loadDispatchGuidesList();

        const guideCode = data.guide_number;
        const guideId = data.guide_id;
        const isDocInternal = data.guide_type === 'control_interno';
        const docLabel = isDocInternal ? 'Vale de Control Interno' : 'Guía de Despacho Oficial';

        const msg = `✅ ${data.message || 'Solicitud procesada exitosamente.'}\n\nSe ha emitido el ${docLabel} N°: ${guideCode || 'Generada'} (${data.items_count || totalSelected} ítems).\n\n¿Deseas abrir el documento oficial ahora mismo para imprimirlo o guardarlo en PDF?`;
        if (guideId && confirm(msg)) {
            if (typeof printOfficialDispatchGuide === 'function') {
                printOfficialDispatchGuide(guideId);
            } else if (typeof window.printOfficialDispatchGuide === 'function') {
                window.printOfficialDispatchGuide(guideId);
            } else {
                navigateToDispatchGuide(guideCode);
            }
        }
        if (typeof viewProjectDetails === 'function') {
            await viewProjectDetails(projectId);
        }
    } catch (err) {
        console.error("[REQUEST DISPATCH ERROR]", err);
        alert(`❌ Error al solicitar despacho: ${err.message || err}`);
    }

    return false;
}

// ==============================================================================
// 🔄 DEVOLUCIÓN DE MATERIALES SOBRANTES DE OBRA A ALMACÉN (PUNTO 17)
let currentDispatchedReturnMaterials = [];

function selectReturnMaterialItem(materialId, name, code, maxQty, unitMeasure) {
    const matSelect = document.getElementById("retmat_material_id");
    const previewBox = document.getElementById("retmat_selected_preview");
    const previewText = document.getElementById("retmat_preview_text");
    const cardsContainer = document.getElementById("retmat_cards_container");
    const qtyInput = document.getElementById("retmat_quantity");
    const maxHint = document.getElementById("retmat_max_hint");

    if (matSelect) {
        matSelect.innerHTML = `<option value="${materialId}" data-max="${maxQty}" data-unit="${unitMeasure}" selected>${name}</option>`;
        matSelect.value = String(materialId);
    }
    if (previewText) {
        previewText.innerHTML = `<strong>[${code || 'MAT'}] ${name}</strong> &bull; Tope despachado: <b>${maxQty} ${unitMeasure}</b>`;
    }
    if (previewBox) previewBox.style.display = 'flex';
    if (cardsContainer) cardsContainer.style.display = 'none';

    const maxVal = parseFloat(maxQty) || 0;
    if (qtyInput) {
        if (maxVal > 0) {
            qtyInput.max = maxVal;
            qtyInput.value = maxVal;
        } else {
            qtyInput.removeAttribute("max");
            qtyInput.value = "";
        }
    }
    if (maxHint) {
        maxHint.textContent = maxVal > 0 ? `Máx. a devolver: ${maxVal} ${unitMeasure}` : 'Seleccione insumo';
    }
}

function clearReturnMaterialSelection() {
    const matSelect = document.getElementById("retmat_material_id");
    const previewBox = document.getElementById("retmat_selected_preview");
    const cardsContainer = document.getElementById("retmat_cards_container");
    const qtyInput = document.getElementById("retmat_quantity");
    const maxHint = document.getElementById("retmat_max_hint");

    if (matSelect) matSelect.value = '';
    if (previewBox) previewBox.style.display = 'none';
    if (cardsContainer) cardsContainer.style.display = 'flex';
    if (qtyInput) {
        qtyInput.value = '';
        qtyInput.removeAttribute("max");
    }
    if (maxHint) maxHint.textContent = 'Seleccione insumo';
}

function renderReturnMaterialOptions(list) {
    const cardsContainer = document.getElementById("retmat_cards_container");
    const matSelect = document.getElementById("retmat_material_id");
    const hintEl = document.getElementById("retmat_select_hint");

    if (!list || list.length === 0) {
        if (cardsContainer) cardsContainer.innerHTML = `<div style="text-align: center; padding: 14px; color: #94a3b8; font-size: 11px;">⚠️ No hay insumos despachados que coincidan.</div>`;
        if (hintEl) hintEl.innerText = "0 materiales encontrados";
        return;
    }

    if (cardsContainer) {
        cardsContainer.innerHTML = list.map(m => {
            const maxVal = parseFloat(m.quantity_dispatched) || 0;
            const unit = m.unit_measure || 'UND';
            const safeName = (m.material_name || '').replace(/'/g, "\\'");
            const safeCode = m.material_code || 'MAT';
            return `
            <div onclick="selectReturnMaterialItem(${m.material_id}, '${safeName}', '${safeCode}', ${maxVal}, '${unit}')"
                 style="background: white; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 10px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; transition: all 0.15s ease;"
                 onmouseover="this.style.borderColor='#0284c7'; this.style.background='#f0f9ff';"
                 onmouseout="this.style.borderColor='#cbd5e1'; this.style.background='white';">
                <div style="display: flex; flex-direction: column; gap: 2px;">
                    <div style="font-size: 11.5px; font-weight: 700; color: var(--dalor-navy);">
                        <span style="font-family: monospace; color: #0284c7; font-weight: 800;">[${safeCode}]</span> ${m.material_name}
                    </div>
                    <div style="font-size: 10.5px; color: #64748b;">
                        Requerido en obra: ${m.quantity_required || 0} ${unit}
                    </div>
                </div>
                <div style="text-align: right;">
                    <span style="font-size: 11px; font-weight: 800; background: #dcfce7; color: #166534; padding: 2px 7px; border-radius: 4px; display: inline-block;">
                        ${maxVal} ${unit} despachado
                    </span>
                    <div style="font-size: 9.5px; color: #0284c7; font-weight: 700; margin-top: 2px;">Clic para devolver</div>
                </div>
            </div>`;
        }).join('');
    }

    if (matSelect) {
        matSelect.innerHTML = `<option value="">-- Seleccionar --</option>` +
            list.map(m => `<option value="${m.material_id}" data-max="${m.quantity_dispatched}" data-unit="${m.unit_measure || 'UND'}">${m.material_name}</option>`).join('');
    }

    if (hintEl) hintEl.innerText = `${list.length} insumo(s) disponible(s) para retorno`;
}

function filterReturnMaterialOptions(searchTerm) {
    const term = (searchTerm || '').trim().toLowerCase();
    if (!term) {
        renderReturnMaterialOptions(currentDispatchedReturnMaterials);
        return;
    }
    const filtered = currentDispatchedReturnMaterials.filter(m => {
        const name = (m.material_name || '').toLowerCase();
        const code = (m.material_code || '').toLowerCase();
        return name.includes(term) || code.includes(term);
    });
    renderReturnMaterialOptions(filtered);
}

// ==============================================================================
async function openReturnMaterialModal(projectId, materialId = null, materialName = '', materialCode = '', dispatchedQty = 0, unitMeasure = 'UND') {
    let pId = projectId;
    if (!pId) {
        const modalEl = document.getElementById("modalProjectDetail");
        if (modalEl && modalEl.dataset && modalEl.dataset.projectId) {
            pId = parseInt(modalEl.dataset.projectId, 10);
        } else if (window.currentViewingProjectId) {
            pId = window.currentViewingProjectId;
        } else if (typeof window.resolveCurrentProjectId === 'function') {
            pId = window.resolveCurrentProjectId();
        } else if (typeof resolveCurrentProjectId === 'function') {
            pId = resolveCurrentProjectId();
        }
    }
    if (!pId) return alert("Seleccione un proyecto válido.");

    const idInput = document.getElementById("retmat_project_id");
    if (idInput) idInput.value = String(pId);

    const selContainer = document.getElementById("retmat_mat_select_container");
    const fixContainer = document.getElementById("retmat_mat_fixed_container");
    const matSelect = document.getElementById("retmat_material_id");
    const qtyInput = document.getElementById("retmat_quantity");
    const maxHint = document.getElementById("retmat_max_hint");
    const searchInp = document.getElementById("retmat_search_input");
    const cardsContainer = document.getElementById("retmat_cards_container");
    const previewBox = document.getElementById("retmat_selected_preview");

    if (searchInp) searchInp.value = "";
    if (previewBox) previewBox.style.display = "none";
    if (cardsContainer) cardsContainer.style.display = "flex";

    // Abrir modal de inmediato para evitar demoras
    if (typeof window.openModal === 'function') {
        window.openModal("modalReturnMaterial");
    } else if (typeof openModal === 'function') {
        openModal("modalReturnMaterial");
    } else {
        const mEl = document.getElementById("modalReturnMaterial");
        if (mEl) mEl.classList.remove("hidden");
    }

    if (materialId && Number(materialId) > 0) {
        // MODO ESPECÍFICO: Fila de material individual seleccionada
        if (selContainer) selContainer.style.display = 'none';
        if (fixContainer) fixContainer.style.display = 'block';

        const nameEl = document.getElementById("retmat_fixed_name");
        const codeEl = document.getElementById("retmat_fixed_code");
        const dispEl = document.getElementById("retmat_fixed_dispatched");
        if (nameEl) nameEl.textContent = materialName || 'Material';
        if (codeEl) codeEl.textContent = materialCode || 'MAT';
        if (dispEl) dispEl.textContent = `${Number(dispatchedQty).toLocaleString()} ${unitMeasure}`;

        if (matSelect) {
            matSelect.innerHTML = `<option value="${materialId}" data-max="${dispatchedQty}" data-unit="${unitMeasure}" selected>${materialName}</option>`;
            matSelect.value = String(materialId);
        }

        const maxVal = parseFloat(dispatchedQty) || 0;
        if (qtyInput) {
            if (maxVal > 0) {
                qtyInput.max = maxVal;
                qtyInput.value = maxVal;
            } else {
                qtyInput.removeAttribute("max");
                qtyInput.value = "";
            }
        }
        if (maxHint) {
            maxHint.textContent = maxVal > 0 ? `Máx. a devolver: ${maxVal} ${unitMeasure}` : 'Sin tope despachado';
        }
    } else {
        // MODO CABECERA: Listar ÚNICAMENTE materiales despachados a esta obra
        if (selContainer) selContainer.style.display = 'block';
        if (fixContainer) fixContainer.style.display = 'none';

        if (cardsContainer) {
            cardsContainer.innerHTML = `<div style="text-align: center; padding: 12px; color: #0284c7; font-size: 11px;"><i class="fa-solid fa-spinner fa-spin"></i> Consultando insumos despachados a esta obra...</div>`;
        }

        try {
            const res = await authFetch(`${API_BASE}/projects/${pId}/details`);
            if (res.ok) {
                const pData = await res.json();
                const reqMats = pData.requested_materials || pData.materials_requisition || [];
                const dispatchedOnly = reqMats.filter(m => (parseFloat(m.quantity_dispatched) || 0) > 0 && m.material_id);
                currentDispatchedReturnMaterials = dispatchedOnly;

                if (dispatchedOnly.length > 0) {
                    renderReturnMaterialOptions(dispatchedOnly);
                } else {
                    if (cardsContainer) {
                        cardsContainer.innerHTML = `<div style="text-align: center; padding: 14px; color: #94a3b8; font-size: 11px;">⚠️ Esta obra aún no tiene insumos despachados para devolver.</div>`;
                    }
                    if (matSelect) matSelect.innerHTML = `<option value="">⚠️ Sin insumos despachados</option>`;
                }
            } else {
                if (cardsContainer) cardsContainer.innerHTML = `<div style="text-align: center; padding: 12px; color: #dc2626; font-size: 11px;">Error al consultar materiales de la obra.</div>`;
            }
        } catch(e) {
            console.error("Error populating dispatched materials:", e);
            if (cardsContainer) cardsContainer.innerHTML = `<div style="text-align: center; padding: 12px; color: #dc2626; font-size: 11px;">Error de conexión.</div>`;
        }

        if (qtyInput) {
            qtyInput.value = "";
            qtyInput.removeAttribute("max");
        }
        if (maxHint) maxHint.textContent = "Selecciona un material";
    }

    const retByInput = document.getElementById("retmat_returned_by");
    if (retByInput) {
        const u = window.currentUser || JSON.parse(localStorage.getItem('dalor_user') || 'null') || {};
        retByInput.value = u.full_name || u.username || '';
    }

    const notesInput = document.getElementById("retmat_notes");
    if (notesInput) notesInput.value = "";
}

function onReturnMaterialSelectChanged(selectEl) {
    if (!selectEl) return;
    const opt = selectEl.options[selectEl.selectedIndex];
    const maxVal = parseFloat(opt?.getAttribute('data-max') || 0);
    const unit = opt?.getAttribute('data-unit') || 'UND';
    const qtyInput = document.getElementById("retmat_quantity");
    const maxHint = document.getElementById("retmat_max_hint");

    if (qtyInput) {
        if (maxVal > 0) {
            qtyInput.max = maxVal;
            qtyInput.value = maxVal;
        } else {
            qtyInput.removeAttribute("max");
            qtyInput.value = "";
        }
    }
    if (maxHint) {
        maxHint.textContent = maxVal > 0 ? `Máx. a devolver: ${maxVal} ${unit}` : 'Seleccione insumo';
    }
}

async function submitReturnMaterial(event) {
    if (event) event.preventDefault();

    const pId = document.getElementById("retmat_project_id")?.value || window.currentViewingProjectId;
    const materialId = parseInt(document.getElementById("retmat_material_id")?.value);
    const quantity = parseFloat(document.getElementById("retmat_quantity")?.value);
    const returnedBy = document.getElementById("retmat_returned_by")?.value?.trim() || "";
    const notes = document.getElementById("retmat_notes")?.value?.trim() || "";

    if (!pId) return alert("Error: ID del proyecto no identificado.");
    if (!materialId || isNaN(materialId)) return alert("Seleccione el material que desea retornar.");
    if (isNaN(quantity) || quantity <= 0) return alert("Ingrese una cantidad válida mayor a 0.");

    const qtyInp = document.getElementById("retmat_quantity");
    const maxAttr = parseFloat(qtyInp?.getAttribute("max"));
    if (!isNaN(maxAttr) && maxAttr > 0 && quantity > (maxAttr + 0.001)) {
        alert(`⛔ Cantidad no permitida: No puedes devolver ${quantity}. El total despachado a esta obra es de ${maxAttr}.`);
        return false;
    }

    try {
        const res = await authFetch(`${API_BASE}/projects/${pId}/return-material`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                material_id: materialId,
                quantity: quantity,
                returned_by: returnedBy,
                notes: notes
            })
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({ detail: 'Error al procesar devolución' }));
            throw new Error(err.detail || 'Error al procesar devolución');
        }

        const data = await res.json();
        if (typeof showToastNotification === 'function') {
            showToastNotification(`✅ ${data.message || 'Material reingresado a almacén exitosamente.'}`, 'success');
        } else {
            alert(`✅ ${data.message || 'Material reingresado a almacén exitosamente.'}`);
        }
        if (typeof window.closeModal === 'function') {
            window.closeModal("modalReturnMaterial");
        } else if (typeof closeModal === 'function') {
            closeModal("modalReturnMaterial");
        } else {
            const m = document.getElementById("modalReturnMaterial");
            if (m) m.classList.add("hidden");
        }

        if (typeof viewProjectDetails === 'function' && pId) {
            await viewProjectDetails(pId);
        }
        if (typeof window.loadMaterialsList === 'function') {
            window.loadMaterialsList();
        }
    } catch(err) {
        console.error("Error returning material:", err);
        alert(`❌ Error: ${err.message || err}`);
    }

    return false;
}



// Auto-window binding & ES6 exports
if (typeof window !== 'undefined') {
    window.openRequestProjectResourcesModal = openRequestProjectResourcesModal;
    window.setRequestDispatchMode = setRequestDispatchMode;
    window.onRequestDriverChanged = onRequestDriverChanged;
    window.getResourceProjectTag = getResourceProjectTag;
    window.populateRequestModalDropdowns = populateRequestModalDropdowns;
    window.filterReqDropdown = filterReqDropdown;
    window.addReqResource = addReqResource;
    window.onReqMaterialChanged = onReqMaterialChanged;
    window.removeReqResource = removeReqResource;
    window.renderReqAssignedTags = renderReqAssignedTags;
    window.navigateToDispatchGuide = navigateToDispatchGuide;
    window.navigateToProjectGuides = navigateToProjectGuides;
    window.submitRequestProjectResources = submitRequestProjectResources;
    window.openReturnMaterialModal = openReturnMaterialModal;
    window.selectReturnMaterialItem = selectReturnMaterialItem;
    window.clearReturnMaterialSelection = clearReturnMaterialSelection;
    window.onReturnMaterialSelectChanged = onReturnMaterialSelectChanged;
    window.submitReturnMaterial = submitReturnMaterial;
    window.filterReturnMaterialOptions = filterReturnMaterialOptions;
}

export { openRequestProjectResourcesModal };
export { setRequestDispatchMode };
export { onRequestDriverChanged };
export { getResourceProjectTag };
export { populateRequestModalDropdowns };
export { filterReqDropdown };
export { addReqResource };
export { onReqMaterialChanged };
export { removeReqResource };
export { renderReqAssignedTags };
export { navigateToDispatchGuide };
export { navigateToProjectGuides };
export { submitRequestProjectResources };
export { openReturnMaterialModal };
export { selectReturnMaterialItem };
export { clearReturnMaterialSelection };
export { onReturnMaterialSelectChanged };
export { submitReturnMaterial };
export { filterReturnMaterialOptions };
