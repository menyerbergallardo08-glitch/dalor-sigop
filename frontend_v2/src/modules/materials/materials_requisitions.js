/**
 * DALOR SIGO-P | Módulo de Materiales e Inventario Desacoplado
 */
var API_BASE = window.API_BASE || (window.location.origin + "/api/v1");
var allMaterials = window.allMaterials = window.allMaterials || [];
var allProjects = window.allProjects = window.allProjects || [];
var allCategories = window.allCategories = window.allCategories || [];
var allAssets = window.allAssets = window.allAssets || [];
var allPersonnel = window.allPersonnel = window.allPersonnel || [];

function authFetch(url, options = {}) {
    const t = sessionStorage.getItem('dalor_token') || localStorage.getItem('dalor_token') || window.authToken || '';
    const h = { ...(options.headers || {}) };
    if (t) h['Authorization'] = 'Bearer ' + t;
    if (options.body && !(options.body instanceof FormData) && !h['Content-Type']) {
        h['Content-Type'] = 'application/json';
    }
    if (options.body instanceof FormData) {
        delete h['Content-Type'];
    }
    return window.fetch(url, { ...options, headers: h });
}

// ==============================================================================
// 📥 BANDEJA DE REQUISICIONES DE OBRAS (PICKING & DESPACHO PARA ALMACÉN)
// ==============================================================================

var allProjectRequisitions = window.allProjectRequisitions = [];

async function loadProjectRequisitionsBadge() {
    try {
        const res = await authFetch(`${API_BASE}/materials/project-requisitions?status=pendiente`);
        if (!res.ok) return;
        const data = await res.json();
        
        // Contar la cantidad de PROYECTOS con requerimientos pendientes (no la suma de ítems)
        const pendingProjects = new Set();
        let hasPartial = false;
        (data || []).forEach(r => {
            if ((r.quantity_pending || 0) > 0) {
                if (r.project_id) pendingProjects.add(r.project_id);
                if ((r.quantity_dispatched || 0) > 0) hasPartial = true;
            }
        });
        const pendingCount = pendingProjects.size;

        const ids = [
            "badgePendingRequisitions",
            "badgePendingRequisitionsBanner",
            "badgePendingRequisitionsDispatch",
            "badgePendingRequisitionsNav",
            "badgePendingRequisitionsHeader"
        ];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.innerText = pendingCount;
                el.style.display = pendingCount > 0 ? "inline-block" : "none";
                if (hasPartial) {
                    el.title = `${pendingCount} obra(s) con requerimientos (posee pendientes parciales)`;
                } else {
                    el.title = `${pendingCount} obra(s) con requerimientos pendientes`;
                }
            }
        });

        const alarmBtn = document.getElementById("btnHeaderRequisitionsAlarm");
        if (alarmBtn) {
            if (pendingCount > 0) {
                alarmBtn.style.color = "#dc2626";
                alarmBtn.style.fontWeight = "800";
                alarmBtn.title = `🚨 ¡Atención Almacén! Hay ${pendingCount} obra(s) con solicitudes pendientes de despacho`;
            } else {
                alarmBtn.style.color = "";
                alarmBtn.style.fontWeight = "";
                alarmBtn.title = "Requisiciones de Materiales";
            }
        }
    } catch (e) {
        console.warn("Could not load project requisitions badge:", e);
    }
}

async function openProjectRequisitionsInboxModal(targetProjectId = null) {
    if (typeof openModal === "function") {
        openModal("modalProjectRequisitionsInbox");
    }
    await loadProjectRequisitionsInbox(targetProjectId);
}

async function loadProjectRequisitionsInbox(targetProjectId = null) {
    const container = document.getElementById("reqInboxContainer");
    if (!container) return;
    container.innerHTML = `<div style="text-align: center; padding: 40px; color: #94a3b8;"><i class="fa-solid fa-spinner fa-spin" style="font-size: 24px;"></i><p style="margin-top: 8px; font-size: 13px;">Cargando pedidos de insumos desde las Obras...</p></div>`;

    try {
        const res = await authFetch(`${API_BASE}/materials/project-requisitions`);
        if (!res.ok) throw new Error("Error al consultar requisiciones de proyectos.");
        const data = await res.json();
        allProjectRequisitions = window.allProjectRequisitions = Array.isArray(data) ? data : [];

        // Poblar selector de proyectos ordenado por código descendente con nombre
        const pSelect = document.getElementById("reqInboxProjectFilter");
        if (pSelect) {
            const currentVal = targetProjectId !== null ? String(targetProjectId) : pSelect.value;
            const uniqueProjects = [];
            const seen = new Set();
            allProjectRequisitions.forEach(r => {
                if (r.project_id && !seen.has(r.project_id)) {
                    seen.add(r.project_id);
                    uniqueProjects.push({ id: r.project_id, code: r.project_code || `PRJ-${r.project_id}`, name: r.project_name || "Sin Título" });
                }
            });

            // Ordenar proyectos descendente por código
            uniqueProjects.sort((a, b) => (b.code || '').localeCompare(a.code || ''));

            let optsHtml = '<option value="">-- Todas las Obras / Proyectos --</option>';
            uniqueProjects.forEach(p => {
                optsHtml += `<option value="${p.id}" ${currentVal == String(p.id) ? 'selected' : ''}>[${p.code}] ${p.name}</option>`;
            });
            pSelect.innerHTML = optsHtml;
        }

        filterProjectRequisitionsView();
    } catch (e) {
        console.error("Error loading project requisitions inbox:", e);
        container.innerHTML = `<div style="text-align: center; padding: 30px; color: #ef4444;"><i class="fa-solid fa-triangle-exclamation" style="font-size: 24px;"></i><p style="margin-top: 8px;">Error al cargar las requisiciones: ${e.message}</p></div>`;
    }
}

function filterProjectRequisitionsView() {
    const searchVal = (document.getElementById("reqInboxSearch")?.value || "").toLowerCase().trim();
    const projFilter = document.getElementById("reqInboxProjectFilter")?.value || "";
    const statusFilter = document.getElementById("reqInboxStatusFilter")?.value || "pending";

    let filtered = allProjectRequisitions || [];

    if (statusFilter === "pending") {
        filtered = filtered.filter(r => (r.quantity_pending || 0) > 0 && r.status !== "despachado");
    }

    if (projFilter) {
        filtered = filtered.filter(r => String(r.project_id) === String(projFilter));
    }

    if (searchVal) {
        filtered = filtered.filter(r => 
            (r.material_name || "").toLowerCase().includes(searchVal) ||
            (r.material_code || "").toLowerCase().includes(searchVal) ||
            (r.project_code || "").toLowerCase().includes(searchVal) ||
            (r.project_name || "").toLowerCase().includes(searchVal)
        );
    }

    renderProjectRequisitionsGroups(filtered);
}

function onReqVehicleChanged(projectId) {
    const sel = document.getElementById(`req_vehicle_sel_${projectId}`);
    const plateInp = document.getElementById(`req_plate_${projectId}`);
    const modelInp = document.getElementById(`req_vehicle_model_${projectId}`);
    if (!sel || !plateInp || !modelInp) return;
    const opt = sel.options[sel.selectedIndex];
    if (!opt || opt.value === "" || opt.value === "externo") {
        if (opt && opt.value === "externo") {
            plateInp.value = "";
            modelInp.value = "";
            plateInp.placeholder = "Placa flete (ej: A12BC3D)";
            modelInp.placeholder = "Modelo / Tipo Flete";
        }
        return;
    }
    const plate = opt.getAttribute("data-plate") || "";
    const model = opt.getAttribute("data-model") || "";
    plateInp.value = plate !== "S/P" ? plate : "";
    modelInp.value = model;
}
window.onReqVehicleChanged = onReqVehicleChanged;

function onReqDriverChanged(projectId) {
    const sel = document.getElementById(`req_driver_sel_${projectId}`);
    const nameInp = document.getElementById(`req_driver_${projectId}`);
    const ciInp = document.getElementById(`req_driver_ci_${projectId}`);
    if (!sel || !nameInp || !ciInp) return;
    const opt = sel.options[sel.selectedIndex];
    if (!opt || opt.value === "" || opt.value === "externo") {
        if (opt && opt.value === "externo") {
            nameInp.value = "";
            ciInp.value = "";
            nameInp.placeholder = "Nombre del Chofer Contratado";
            ciInp.placeholder = "C.I. / Cédula";
        }
        return;
    }
    const name = opt.getAttribute("data-name") || "";
    const ci = opt.getAttribute("data-ci") || "";
    nameInp.value = name;
    ciInp.value = ci;
}
window.onReqDriverChanged = onReqDriverChanged;

var currentReqPage = window.currentReqPage = 1;
var reqPageSize = window.reqPageSize = 3;
var currentFilteredReqs = window.currentFilteredReqs = [];

function renderProjectRequisitionsGroups(reqs, resetPage = true) {
    const container = document.getElementById("reqInboxContainer");
    if (!container) return;

    if (resetPage) {
        currentReqPage = 1;
    }
    currentFilteredReqs = reqs || [];

    if (!reqs || reqs.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 50px 20px; background: #f8fafc; border-radius: 12px; border: 2px dashed #cbd5e1;">
                <i class="fa-solid fa-circle-check" style="font-size: 40px; color: #10b981; margin-bottom: 12px;"></i>
                <h4 style="font-size: 16px; font-weight: 800; color: #1e293b;">¡No hay requerimientos pendientes de preparación!</h4>
                <p style="font-size: 12px; color: #64748b; max-width: 480px; margin: 6px auto 0;">
                    Todas las solicitudes de insumos formuladas en Obras han sido despachadas o no coinciden con los filtros seleccionados.
                </p>
            </div>
        `;
        return;
    }

    // Agrupar por project_id
    const groups = {};
    reqs.forEach(r => {
        const pId = r.project_id || 0;
        if (!groups[pId]) {
            groups[pId] = {
                project_id: pId,
                project_code: r.project_code || "S/P",
                project_name: r.project_name || "Sin Obra Asignada",
                project_location: r.project_location || "",
                is_internal: !!r.is_internal,
                max_req_id: r.id || 0,
                items: []
            };
        }
        groups[pId].items.push(r);
        if ((r.id || 0) > groups[pId].max_req_id) {
            groups[pId].max_req_id = r.id;
        }
    });

    const allGroups = Object.values(groups);
    // Ordenar proyectos por solicitud más reciente hacia abajo
    allGroups.sort((a, b) => (b.max_req_id || 0) - (a.max_req_id || 0));
    allGroups.forEach(grp => {
        grp.items.sort((a, b) => (b.id || 0) - (a.id || 0));
    });

    const totalGroups = allGroups.length;
    const totalPages = Math.max(1, Math.ceil(totalGroups / reqPageSize));
    if (currentReqPage > totalPages) currentReqPage = totalPages;
    const startIdx = (currentReqPage - 1) * reqPageSize;
    const pagedGroups = allGroups.slice(startIdx, startIdx + reqPageSize);

    let html = "";
    pagedGroups.forEach(grp => {
        const pendingCount = grp.items.filter(i => (i.quantity_pending || 0) > 0).length;
        const firstItem = grp.items[0] || {};
        const locLower = `${firstItem.project_location || grp.project_location || ''} ${grp.project_name || ''} ${grp.project_code || ''}`.toLowerCase();
        const isInternal = firstItem.is_internal || grp.is_internal || locLower.includes('sede') || locLower.includes('guacara') || locLower.includes('taller');

        let logisticsHtml = "";
        if (isInternal) {
            // Vertiente 1: Entrega de Materiales en Taller (Control Interno) -> Cero vehículo, cero chofer
            logisticsHtml = `
                <input type="hidden" id="req_is_internal_${grp.project_id}" value="1">
                <div style="background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 8px; padding: 12px 16px; margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <span style="font-size: 26px;">🏢</span>
                        <div>
                            <strong style="color: #166534; font-size: 13px; display: block;">ENTREGA DE MATERIALES (CONTROL INTERNO - SEDE CENTRAL)</strong>
                            <span style="color: #4b5563; font-size: 11px;">Trabajo ejecutado dentro de sede central. Almacén certifica la entrega de pañol. No requiere chofer ni vehículo.</span>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px; flex: 1; max-width: 420px; min-width: 260px;">
                        <div style="flex: 1;">
                            <label style="font-size: 10px; font-weight: 800; color: #166534; text-transform: uppercase; display: block; margin-bottom: 2px;">Observaciones de Entrega en Pañol:</label>
                            <input type="text" id="req_notes_${grp.project_id}" placeholder="Ej: Material verificado para trabajo interno en pañol." class="form-input" style="font-size: 11px; padding: 5px 8px; background: white; width: 100%;">
                        </div>
                    </div>
                </div>
            `;
        } else {
            // Vertiente 2: Obra Foránea -> Conductor y Transporte seleccionables o ingreso manual (SIN auto-asignación obligada)
            const projVehs = firstItem.project_vehicles || [];
            const availFleet = firstItem.available_fleet || firstItem.all_fleet || [];
            const projPers = firstItem.project_personnel || [];
            const availPers = firstItem.available_personnel || firstItem.all_personnel || [];

            // Priorizar vehículo de la obra si existe
            const hasProjVeh = projVehs.length > 0;
            const defaultPlate = hasProjVeh ? (projVehs[0].plate !== 'S/P' ? projVehs[0].plate : '') : '';
            const defaultModel = hasProjVeh ? (projVehs[0].name || projVehs[0].model || '') : '';

            let vehOpts = `<option value="">-- Seleccionar Flota DALOR o Externo --</option>`;
            if (projVehs.length > 0) {
                vehOpts += `<optgroup label="🚗 Asignado a esta Obra (Prioridad)">`;
                projVehs.forEach((v, idx) => {
                    const selAttr = idx === 0 ? 'selected' : '';
                    vehOpts += `<option value="${v.id}" data-plate="${v.plate}" data-model="${v.name || v.model}" ${selAttr}>[${v.code}] ${v.name} (${v.plate})</option>`;
                });
                vehOpts += `</optgroup>`;
            }
            if (availFleet.length > 0) {
                vehOpts += `<optgroup label="🚚 Otros Vehículos Disponibles en Base">`;
                availFleet.filter(f => !projVehs.some(pv => pv.id === f.id)).forEach(f => {
                    vehOpts += `<option value="${f.id}" data-plate="${f.plate}" data-model="${f.name || f.model}">[${f.code}] ${f.name} (${f.plate})</option>`;
                });
                vehOpts += `</optgroup>`;
            }
            vehOpts += `<optgroup label="🏢 Flete Tercerizado / Externo">`;
            const extSelected = !hasProjVeh ? 'selected' : '';
            vehOpts += `<option value="externo" data-plate="" data-model="" ${extSelected}>Flete Externo / Retiro Cliente (Ingreso manual)</option>`;
            vehOpts += `</optgroup>`;

            // Chofer: Solo personal asignado a esta obra o disponible en base
            let persOpts = `<option value="">-- Seleccionar Chofer o Externo --</option>`;
            if (projPers.length > 0) {
                persOpts += `<optgroup label="🚗 Personal Asignado a esta Obra">`;
                projPers.forEach(ap => {
                    persOpts += `<option value="${ap.id}" data-name="${ap.name}" data-ci="${ap.ci}">${ap.name} (C.I: ${ap.ci})</option>`;
                });
                persOpts += `</optgroup>`;
            }
            if (availPers.length > 0) {
                persOpts += `<optgroup label="🏢 Chofer / Personal Disponible en Base">`;
                availPers.filter(f => !projPers.some(pp => pp.id === f.id)).forEach(ap => {
                    persOpts += `<option value="${ap.id}" data-name="${ap.name}" data-ci="${ap.ci}">${ap.name} (C.I: ${ap.ci})</option>`;
                });
                persOpts += `</optgroup>`;
            }
            persOpts += `<optgroup label="✍️ Chofer Contratado / Externo">`;
            persOpts += `<option value="externo" data-name="" data-ci="" selected>✍️ Chofer Externo / Contratado por Fuera (Ingreso manual)</option>`;
            persOpts += `</optgroup>`;

            logisticsHtml = `
                <input type="hidden" id="req_is_internal_${grp.project_id}" value="0">
                <div style="background: #f0f9ff; border: 1.5px solid #bae6fd; border-radius: 8px; padding: 12px 14px; margin-bottom: 12px; display: grid; grid-template-columns: 1.2fr 1.2fr 1.6fr; gap: 12px; align-items: start;">
                    <div>
                        <label style="font-size: 11px; font-weight: 800; color: #0369a1; display: flex; align-items: center; justify-content: space-between; margin-bottom: 3px;">
                            <span><i class="fa-solid fa-truck-pickup"></i> Vehículo para Obra Foránea</span>
                            <span style="font-size: 9.5px; color: #0284c7; font-weight: 700;">(Flota o Externo)</span>
                        </label>
                        <select id="req_vehicle_sel_${grp.project_id}" onchange="onReqVehicleChanged(${grp.project_id})" class="form-select" style="font-size: 11px; padding: 5px 8px; background: white; margin-bottom: 4px;">
                            ${vehOpts}
                        </select>
                        <div style="display: flex; gap: 6px;">
                            <input type="text" id="req_plate_${grp.project_id}" value="${defaultPlate}" placeholder="Placa (ej: A12BC3D)" class="form-input" style="font-size: 11px; padding: 4px 6px; font-weight: 700; width: 45%;" title="Placa del vehículo">
                            <input type="text" id="req_vehicle_model_${grp.project_id}" value="${defaultModel}" placeholder="Modelo / Marca" class="form-input" style="font-size: 11px; padding: 4px 6px; width: 55%;" title="Modelo del vehículo">
                        </div>
                    </div>
                    <div>
                        <label style="font-size: 11px; font-weight: 800; color: #0369a1; display: flex; align-items: center; justify-content: space-between; margin-bottom: 3px;">
                            <span><i class="fa-solid fa-id-card"></i> Chofer Asignado al Traslado</span>
                            <span style="font-size: 9.5px; color: #0284c7; font-weight: 700;">(DALOR o Externo)</span>
                        </label>
                        <select id="req_driver_sel_${grp.project_id}" onchange="onReqDriverChanged(${grp.project_id})" class="form-select" style="font-size: 11px; padding: 5px 8px; background: white; margin-bottom: 4px;">
                            ${persOpts}
                        </select>
                        <div style="display: flex; gap: 6px;">
                            <input type="text" id="req_driver_${grp.project_id}" value="" placeholder="Nombre del Chofer" class="form-input" style="font-size: 11px; padding: 4px 6px; font-weight: 700; width: 60%;" title="Nombre del chofer">
                            <input type="text" id="req_driver_ci_${grp.project_id}" value="" placeholder="C.I. / Cédula" class="form-input" style="font-size: 11px; padding: 4px 6px; font-weight: 700; width: 40%;" title="Cédula de identidad">
                        </div>
                    </div>
                    <div>
                        <label style="font-size: 11px; font-weight: 800; color: #0369a1; display: block; margin-bottom: 3px;">
                            <i class="fa-solid fa-note-sticky"></i> Observaciones de Despacho & Precinto
                        </label>
                        <textarea id="req_notes_${grp.project_id}" rows="2" placeholder="Ej: Material verificado en pañol para traslado de obra." class="form-input" style="font-size: 11px; padding: 5px 8px; background: white; resize: none;"></textarea>
                    </div>
                </div>
            `;
        }

        html += `
            <div class="card" style="border: 1px solid #cbd5e1; border-radius: 10px; padding: 14px 18px; background: white; box-shadow: 0 1px 3px rgba(0,0,0,0.05); margin-bottom: 16px;">
                <!-- Header de Obra -->
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
                    <div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span style="background: ${isInternal ? '#0284c7' : '#1e3a8a'}; color: white; font-weight: 800; font-size: 11px; padding: 3px 8px; border-radius: 6px; letter-spacing: 0.5px;">
                                <i class="${isInternal ? 'fa-solid fa-warehouse' : 'fa-solid fa-building'}"></i> ${grp.project_code}
                            </span>
                            <h4 style="font-size: 15px; font-weight: 800; color: #0f172a; margin: 0;">${grp.project_name}</h4>
                            <span style="font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 4px; ${isInternal ? 'background: #dcfce7; color: #15803d;' : 'background: #e0f2fe; color: #0369a1;'}">
                                ${isInternal ? '🏢 Sede Central' : '📍 Obra Foránea (Traslado Externo)'}
                            </span>
                        </div>
                    </div>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <span style="font-size: 11px; font-weight: 700; color: #475569; background: #f1f5f9; padding: 4px 10px; border-radius: 6px;">
                            ${grp.items.length} insumos en lista (${pendingCount} pendientes)
                        </span>
                    </div>
                </div>

                <!-- Datos de Despacho & Logística para esta Obra -->
                ${logisticsHtml}

                <!-- Tabla de Insumos Requeridos -->
                <div style="overflow-x: auto; border: 1px solid #e2e8f0; border-radius: 8px;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 11.5px; text-align: left;">
                        <thead>
                            <tr style="background: #f8fafc; color: #475569; font-weight: 700; border-bottom: 1px solid #e2e8f0;">
                                <th style="padding: 8px 10px; width: 36px; text-align: center;">
                                    <input type="checkbox" onchange="toggleSelectAllProjectReqs(${grp.project_id}, this.checked)" title="Seleccionar todos con stock">
                                </th>
                                <th style="padding: 8px 10px;">Código</th>
                                <th style="padding: 8px 10px;">Descripción del Insumo</th>
                                <th style="padding: 8px 10px; text-align: center;">Solicitado</th>
                                <th style="padding: 8px 10px; text-align: center;">Despachado</th>
                                <th style="padding: 8px 10px; text-align: center;">Saldo Pendiente</th>
                                <th style="padding: 8px 10px; text-align: center;">Stock en Pañol</th>
                                <th style="padding: 8px 10px; text-align: center; width: 140px;">A Despachar</th>
                                <th style="padding: 8px 10px; text-align: center; width: 90px;">Acción</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${grp.items.map(it => {
                                const isDone = (it.quantity_pending || 0) <= 0 || it.status === "despachado";
                                const stockVal = it.stock_available || 0;
                                const hasZeroStock = stockVal <= 0;
                                const isBlocked = isDone || hasZeroStock;
                                const defaultDispatchQty = isBlocked ? 0 : Math.min(it.quantity_pending, stockVal);
                                
                                const stockBadge = hasZeroStock
                                    ? `<span style="background: #fee2e2; color: #b91c1c; padding: 2px 7px; border-radius: 4px; font-weight: 800; font-size: 10.5px;"><i class="fa-solid fa-ban"></i> 0.00 (SIN STOCK)</span>`
                                    : (it.has_enough_stock 
                                        ? `<span style="background: #dcfce7; color: #15803d; padding: 2px 7px; border-radius: 4px; font-weight: 700; font-size: 10.5px;"><i class="fa-solid fa-circle-check"></i> ${stockVal.toFixed(2)} ${it.unit_measure}</span>`
                                        : `<span style="background: #fef3c7; color: #b45309; padding: 2px 7px; border-radius: 4px; font-weight: 700; font-size: 10.5px;"><i class="fa-solid fa-triangle-exclamation"></i> ${stockVal.toFixed(2)} ${it.unit_measure} (Parcial)</span>`);

                                return `
                                    <tr style="border-bottom: 1px solid #f1f5f9; ${isDone ? 'background: #f8fafc; opacity: 0.65;' : ''} ${hasZeroStock && !isDone ? 'background: #fff1f2;' : ''}">
                                        <td style="padding: 8px 10px; text-align: center;">
                                            <input type="checkbox" class="req-check-${grp.project_id}" data-req-id="${it.id}" data-project-id="${grp.project_id}" data-stock="${stockVal}" data-pending="${it.quantity_pending}" ${!isBlocked ? 'checked' : ''} ${isBlocked ? 'disabled' : ''}>
                                        </td>
                                        <td style="padding: 8px 10px; font-family: monospace; font-weight: 700; color: #334155;">
                                            ${it.material_code}
                                        </td>
                                        <td style="padding: 8px 10px;">
                                            <div style="font-weight: 600; color: #0f172a; display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                                                ${it.resource_type === 'herramienta' ? '<span class="badge-tag" style="background:#e0e7ff; color:#3730a3; font-size:9.5px;"><i class="fa-solid fa-wrench"></i> Herramienta</span>' :
                                                  it.resource_type === 'maquinaria' ? '<span class="badge-tag" style="background:#ffedd5; color:#9a3412; font-size:9.5px;"><i class="fa-solid fa-tractor"></i> Maquinaria</span>' :
                                                  it.resource_type === 'vehiculo' ? '<span class="badge-tag" style="background:#fef3c7; color:#92400e; font-size:9.5px;"><i class="fa-solid fa-truck-pickup"></i> Vehículo</span>' :
                                                  '<span class="badge-tag" style="background:#f0fdf4; color:#166534; font-size:9.5px;"><i class="fa-solid fa-boxes-stacked"></i> Material</span>'}
                                                <span>${it.material_name}</span>
                                            </div>
                                            ${it.notes ? `<span style="font-size: 10px; color: #64748b;">Nota: ${it.notes}</span>` : ''}
                                        </td>
                                        <td style="padding: 8px 10px; text-align: center; font-weight: 600;">
                                            ${(it.quantity_required || 0).toFixed(2)} ${it.unit_measure}
                                        </td>
                                        <td style="padding: 8px 10px; text-align: center; color: #059669; font-weight: 600;">
                                            ${(it.quantity_dispatched || 0).toFixed(2)} ${it.unit_measure}
                                        </td>
                                        <td style="padding: 8px 10px; text-align: center; font-weight: 800; color: ${isDone ? '#10b981' : '#e11d48'};">
                                            ${isDone ? '0.00 (Listo)' : `${(it.quantity_pending || 0).toFixed(2)} ${it.unit_measure}`}
                                        </td>
                                        <td style="padding: 8px 10px; text-align: center;">
                                            ${stockBadge}
                                        </td>
                                        <td style="padding: 8px 10px; text-align: center;">
                                            <input type="number" step="0.01" min="0" max="${Math.min(it.quantity_pending, stockVal)}" id="req_qty_${it.id}" value="${defaultDispatchQty}" oninput="onReqQtyChanged(${it.id}, ${it.quantity_pending}, ${stockVal})" class="form-input" style="font-size: 11.5px; padding: 4px 6px; text-align: center; width: 100px; font-weight: 700; ${hasZeroStock ? 'background-color: #f1f5f9; color: #94a3b8; cursor: not-allowed;' : ''}" ${isBlocked ? 'disabled' : ''}>
                                            <div id="req_warn_${it.id}" style="${defaultDispatchQty < it.quantity_pending && defaultDispatchQty > 0 ? '' : 'display: none;'}">
                                                ${defaultDispatchQty < it.quantity_pending && defaultDispatchQty > 0 ? `<span style="color: #b45309; background: #fef3c7; border: 1px solid #fde68a; padding: 2px 6px; border-radius: 4px; font-size: 9.5px; font-weight: 700; display: inline-block; margin-top: 3px;">⚠️ Parcial: Quedan ${(it.quantity_pending - defaultDispatchQty).toFixed(2)} por stock</span>` : ''}
                                            </div>
                                        </td>
                                        <td style="padding: 8px 10px; text-align: center;">
                                            ${isDone ? '<span class="badge-tag" style="background:#e2e8f0; color:#475569; font-size:10px;">Completado</span>' :
                                              hasZeroStock ? `
                                                <div style="display: flex; flex-direction: column; gap: 3px; align-items: center;">
                                                    <span style="color: #ef4444; font-size: 9.5px; font-weight: 800;"><i class="fa-solid fa-ban"></i> Sin Stock</span>
                                                    <button type="button" onclick="closeModal('modalProjectRequisitionsInbox'); openSubstituteMaterialModal(${it.id}, ${it.material_id || 0}, '${(it.material_name || '').replace(/'/g, "\\'")}', ${grp.project_id})" class="btn-secondary" style="font-size: 9px; padding: 2px 6px; background: #fef3c7; color: #b45309; border-color: #fde68a; font-weight: 800;" title="Sustituir por otro insumo con inventario">
                                                        <i class="fa-solid fa-shuffle"></i> Sustituir
                                                    </button>
                                                    <button type="button" onclick="closeModal('modalProjectRequisitionsInbox'); openNewPayableModal(); setTimeout(() => { const pSel = document.getElementById('new_cxp_project_id'); if (pSel) pSel.value = '${grp.project_id}'; const desc = document.getElementById('new_cxp_description'); if (desc) desc.value = 'Compra urgente de ${(it.material_name || '').replace(/'/g, "\\'")} para obra ${grp.project_code}'; }, 200);" class="btn-secondary" style="font-size: 9px; padding: 2px 6px; background: #eff6ff; color: #1d4ed8; border-color: #bfdbfe; font-weight: 800;" title="Cargar CxP / Orden de Compra para este material">
                                                        <i class="fa-solid fa-cart-shopping"></i> Comprar
                                                    </button>
                                                </div>
                                              ` : `
                                                <button type="button" onclick="quickDispatchSingleRequisition(${it.id}, ${grp.project_id})" class="btn-secondary" style="font-size: 10px; padding: 3px 8px; border-radius: 4px; background: #e0f2fe; color: #0369a1; border-color: #bae6fd; font-weight: 700;" title="Despachar solo este ítem ahora">
                                                    ⚡ Rápido
                                                </button>
                                            `}
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>

                <!-- Botón de Despacho de la Obra -->
                <div style="display: flex; justify-content: flex-end; align-items: center; margin-top: 12px; gap: 10px;">
                    <button type="button" onclick="submitDispatchProjectGroup(${grp.project_id})" class="btn-primary" style="${isInternal ? 'background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);' : 'background: linear-gradient(135deg, #059669 0%, #047857 100%);'} font-weight: 800; font-size: 12px; padding: 8px 18px; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        ${isInternal ? '<i class="fa-solid fa-clipboard-check"></i> Entregar Ítems en Taller y Emitir Vale de Control Interno' : '<i class="fa-solid fa-truck-ramp-box"></i> Despachar Ítems Marcados y Emitir Guía de Traslado'} (${grp.project_code})
                    </button>
                </div>
            </div>
        `;
    });

    // Barra de Paginación de la Bandeja
    html += `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin-top: 14px; flex-wrap: wrap; gap: 10px;">
            <div style="font-size: 12px; font-weight: 600; color: #475569;">
                Mostrando obras <span style="font-weight: 800; color: #0f172a;">${startIdx + 1} - ${Math.min(totalGroups, startIdx + reqPageSize)}</span> de <span style="font-weight: 800; color: #0f172a;">${totalGroups}</span> con requerimientos
            </div>
            <div style="display: flex; gap: 6px; align-items: center;">
                <button type="button" onclick="goToReqPage(${currentReqPage - 1})" class="btn-secondary" style="padding: 4px 10px; font-size: 11px;" ${currentReqPage <= 1 ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
                    <i class="fa-solid fa-chevron-left"></i> Anterior
                </button>
                <span style="font-size: 11.5px; font-weight: 700; color: #1e293b; padding: 0 8px;">
                    Página ${currentReqPage} de ${totalPages}
                </span>
                <button type="button" onclick="goToReqPage(${currentReqPage + 1})" class="btn-secondary" style="padding: 4px 10px; font-size: 11px;" ${currentReqPage >= totalPages ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
                    Siguiente <i class="fa-solid fa-chevron-right"></i>
                </button>
            </div>
            <div style="display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: #475569;">
                <span>Por página:</span>
                <select onchange="changeReqPageSize(this.value)" style="border: 1px solid #cbd5e1; border-radius: 4px; padding: 3px 6px; font-size: 11px; background: white;">
                    <option value="2" ${reqPageSize === 2 ? 'selected' : ''}>2 obras</option>
                    <option value="3" ${reqPageSize === 3 ? 'selected' : ''}>3 obras</option>
                    <option value="5" ${reqPageSize === 5 ? 'selected' : ''}>5 obras</option>
                    <option value="10" ${reqPageSize === 10 ? 'selected' : ''}>10 obras</option>
                </select>
            </div>
        </div>
    `;

    container.innerHTML = html;
}

function goToReqPage(page) {
    currentReqPage = page;
    renderProjectRequisitionsGroups(currentFilteredReqs, false);
}

function changeReqPageSize(newSize) {
    reqPageSize = parseInt(newSize) || 3;
    currentReqPage = 1;
    renderProjectRequisitionsGroups(currentFilteredReqs, false);
}

function onReqQtyChanged(reqId, maxPending, stockAvailable) {
    const inp = document.getElementById(`req_qty_${reqId}`);
    const warnEl = document.getElementById(`req_warn_${reqId}`);
    if (!inp) return;

    let val = parseFloat(inp.value) || 0;
    if (val < 0) {
        val = 0;
        inp.value = 0;
    }

    // 1. No puede ser mayor a lo solicitado
    if (val > maxPending) {
        alert(`⚠️ La cantidad a despachar (${val}) no puede ser mayor a lo solicitado (Saldo pendiente: ${maxPending}). Se ajustó automáticamente.`);
        val = maxPending;
        inp.value = maxPending;
    }

    // 2. No puede ser mayor al stock disponible
    if (val > stockAvailable) {
        alert(`⚠️ Stock insuficiente en almacén/pañol: Solo hay ${stockAvailable} unidades disponibles.`);
        val = stockAvailable;
        inp.value = stockAvailable;
    }

    // 3. Advertencia si es menor por tema de inventario
    if (warnEl) {
        if (val < maxPending && val > 0) {
            const diff = (maxPending - val).toFixed(2);
            warnEl.style.display = "block";
            warnEl.innerHTML = `<span style="color: #b45309; background: #fef3c7; border: 1px solid #fde68a; padding: 2px 6px; border-radius: 4px; font-size: 9.5px; font-weight: 700; display: inline-block; margin-top: 3px;">⚠️ Entrega parcial: Quedarán ${diff} pendientes por inventario.</span>`;
        } else if (val === 0) {
            warnEl.style.display = "block";
            warnEl.innerHTML = `<span style="color: #dc2626; background: #fee2e2; border: 1px solid #fecaca; padding: 2px 6px; border-radius: 4px; font-size: 9.5px; font-weight: 700; display: inline-block; margin-top: 3px;">⛔ Cantidad 0: No se incluirá en el traslado.</span>`;
        } else {
            warnEl.style.display = "none";
        }
    }
}

function toggleSelectAllProjectReqs(projectId, checked) {
    document.querySelectorAll(`.req-check-${projectId}`).forEach(chk => {
        if (!chk.disabled) chk.checked = checked;
    });
}

async function submitDispatchProjectGroup(projectId) {
    const checkboxes = document.querySelectorAll(`.req-check-${projectId}:checked`);
    if (!checkboxes || checkboxes.length === 0) {
        alert("⚠️ Por favor selecciona al menos un insumo disponible de la lista para despachar.");
        return;
    }

    const items = [];
    let hasPartial = false;

    for (const chk of checkboxes) {
        const reqId = parseInt(chk.getAttribute("data-req-id"));
        const stock = parseFloat(chk.getAttribute("data-stock") || 0);
        const pending = parseFloat(chk.getAttribute("data-pending") || 0);
        const qtyInp = document.getElementById(`req_qty_${reqId}`);
        const qty = parseFloat(qtyInp?.value || 0);

        if (stock <= 0) {
            alert("⛔ No se puede despachar un ítem con stock 0 en almacén.");
            if (qtyInp) qtyInp.focus();
            return;
        }

        if (qty <= 0) {
            alert("⚠️ La cantidad a despachar para los ítems seleccionados debe ser mayor a 0.");
            if (qtyInp) qtyInp.focus();
            return;
        }

        if (qty > pending) {
            alert(`⚠️ La cantidad a despachar (${qty}) no puede ser mayor a lo solicitado (${pending}).`);
            if (qtyInp) qtyInp.focus();
            return;
        }

        if (qty > stock) {
            alert(`⚠️ Stock insuficiente: Solicitas ${qty} pero solo hay ${stock} en almacén.`);
            if (qtyInp) qtyInp.focus();
            return;
        }

        if (qty < pending) {
            hasPartial = true;
        }

        items.push({
            requisition_id: reqId,
            quantity_to_dispatch: qty
        });
    }

    const isInternal = document.getElementById(`req_is_internal_${projectId}`)?.value === "1";
    let driverName = null;
    let driverCi = null;
    let vehiclePlate = null;
    let vehicleModel = null;
    let vehicleAssetId = null;

    if (!isInternal) {
        driverName = (document.getElementById(`req_driver_${projectId}`)?.value || "").trim();
        driverCi = (document.getElementById(`req_driver_ci_${projectId}`)?.value || "").trim();
        vehiclePlate = (document.getElementById(`req_plate_${projectId}`)?.value || "").trim();
        vehicleModel = (document.getElementById(`req_vehicle_model_${projectId}`)?.value || "").trim();
        vehicleAssetId = document.getElementById(`req_vehicle_sel_${projectId}`)?.value;
        if (!driverName) {
            alert("⚠️ Para despachos a Obra Foránea, por favor ingresa o selecciona el Chofer / Conductor asignado.");
            document.getElementById(`req_driver_${projectId}`)?.focus();
            return;
        }
    }
    const notes = (document.getElementById(`req_notes_${projectId}`)?.value || "").trim();

    let confirmMsg = isInternal 
        ? `¿Confirmas la entrega interna de ${items.length} insumo(s) para los trabajos en Taller Guacara?\n\nSe emitirá el Vale de Control Interno de Almacén.`
        : `¿Confirmas el despacho de ${items.length} insumo(s) para la Obra Foránea?\n\nSe descontará el stock en Almacén y se emitirá la Guía Oficial de Traslado.`;
    if (hasPartial) {
        confirmMsg += `\n\n⚠️ ADVERTENCIA: Uno o más ítems tienen una entrega menor a lo solicitado por disponibilidad de inventario. El resto quedará como saldo pendiente en la obra.`;
    }

    if (!confirm(confirmMsg)) {
        return;
    }

    try {
        const payload = {
            project_id: projectId,
            items: items,
            is_internal: isInternal,
            driver_name: driverName,
            driver_id_doc: driverCi,
            vehicle_plate: vehiclePlate,
            vehicle_model: vehicleModel,
            asset_id: (vehicleAssetId && vehicleAssetId !== 'externo' && !isNaN(parseInt(vehicleAssetId))) ? parseInt(vehicleAssetId) : null,
            notes: notes
        };

        const res = await authFetch(`${API_BASE}/materials/dispatch-project-requisition`, {
            method: "POST",
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            const data = await res.json();
            await loadProjectRequisitionsBadge();
            await loadMaterialsList();
            await loadProjectRequisitionsInbox(projectId);

            const guideNumber = data.guide_number;
            const openGuide = confirm(`✅ ${data.message || 'Despacho registrado exitosamente.'}\n\nSe ha emitido el documento N°: ${guideNumber}\n\n¿Deseas abrir la Guía en pantalla completa ahora?`);
            if (openGuide && typeof window.navigateToDispatchGuide === 'function') {
                if (typeof closeModal === 'function') closeModal('modalProjectRequisitionsInbox');
                window.navigateToDispatchGuide(guideNumber);
            }
        } else {
            const err = await res.json();
            alert("❌ Error al procesar despacho: " + (err.detail || JSON.stringify(err)));
        }
    } catch (e) {
        console.error("Error submitting project requisition dispatch:", e);
        alert("❌ Error de comunicación: " + e.message);
    }
}

async function quickDispatchSingleRequisition(reqId, projectId) {
    const qtyInp = document.getElementById(`req_qty_${reqId}`);
    const qty = parseFloat(qtyInp?.value || 0);

    const chk = document.querySelector(`.req-check-${projectId}[data-req-id="${reqId}"]`);
    const stock = parseFloat(chk?.getAttribute("data-stock") || 0);
    const pending = parseFloat(chk?.getAttribute("data-pending") || 0);

    if (stock <= 0) {
        alert("⛔ No se puede despachar: Stock disponible en almacén es 0.");
        return;
    }

    if (qty <= 0) {
        alert("⚠️ Ingresa una cantidad válida mayor a 0 para despachar.");
        if (qtyInp) qtyInp.focus();
        return;
    }

    if (qty > pending) {
        alert(`⚠️ La cantidad a despachar (${qty}) no puede ser mayor a lo solicitado (${pending}).`);
        if (qtyInp) qtyInp.focus();
        return;
    }

    if (qty > stock) {
        alert(`⚠️ Stock insuficiente: Requieres ${qty} pero solo hay ${stock} en pañol.`);
        if (qtyInp) qtyInp.focus();
        return;
    }

    const isInternal = document.getElementById(`req_is_internal_${projectId}`)?.value === "1";
    let driverName = null;
    let driverCi = null;
    let vehiclePlate = null;
    let vehicleModel = null;
    let vehicleAssetId = null;

    if (!isInternal) {
        driverName = (document.getElementById(`req_driver_${projectId}`)?.value || "").trim();
        driverCi = (document.getElementById(`req_driver_ci_${projectId}`)?.value || "").trim();
        vehiclePlate = (document.getElementById(`req_plate_${projectId}`)?.value || "").trim();
        vehicleModel = (document.getElementById(`req_vehicle_model_${projectId}`)?.value || "").trim();
        vehicleAssetId = document.getElementById(`req_vehicle_sel_${projectId}`)?.value;
        if (!driverName) {
            alert("⚠️ Para despachos a Obra Foránea, por favor ingresa o selecciona el Chofer / Conductor asignado.");
            document.getElementById(`req_driver_${projectId}`)?.focus();
            return;
        }
    }
    const notes = (document.getElementById(`req_notes_${projectId}`)?.value || "").trim();

    let confirmMsg = isInternal
        ? `¿Confirmas la entrega rápida de este insumo (${qty} unidades) en Taller Guacara?\nSe generará el Vale de Control Interno.`
        : `¿Confirmas el despacho rápido de este insumo (${qty} unidades) para la Obra Foránea?\nSe generará la Guía Oficial de Traslado.`;
    if (qty < pending) {
        confirmMsg += `\n\n⚠️ ADVERTENCIA: La cantidad a entregar (${qty}) es menor a lo solicitado (${pending}) por inventario. Quedarán ${(pending - qty).toFixed(2)} pendientes.`;
    }

    if (!confirm(confirmMsg)) {
        return;
    }

    try {
        const payload = {
            project_id: projectId,
            items: [{ requisition_id: reqId, quantity_to_dispatch: qty }],
            is_internal: isInternal,
            driver_name: driverName,
            driver_id_doc: driverCi,
            vehicle_plate: vehiclePlate,
            vehicle_model: vehicleModel,
            asset_id: (vehicleAssetId && vehicleAssetId !== 'externo' && !isNaN(parseInt(vehicleAssetId))) ? parseInt(vehicleAssetId) : null,
            notes: notes
        };

        const res = await authFetch(`${API_BASE}/materials/dispatch-project-requisition`, {
            method: "POST",
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            const data = await res.json();
            await loadProjectRequisitionsBadge();
            await loadMaterialsList();
            await loadProjectRequisitionsInbox(projectId);

            const guideNumber = data.guide_number;
            const openGuide = confirm(`✅ Despacho procesado exitosamente.\n\nSe ha emitido la Guía Oficial N°: ${guideNumber}\n\n¿Deseas ver la Guía de Despacho ahora?`);
            if (openGuide && typeof window.navigateToDispatchGuide === 'function') {
                if (typeof closeModal === 'function') closeModal('modalProjectRequisitionsInbox');
                window.navigateToDispatchGuide(guideNumber);
            }
        } else {
            const err = await res.json();
            alert("❌ Error: " + (err.detail || JSON.stringify(err)));
        }
    } catch (e) {
        console.error("Error in quick dispatch:", e);
        alert("❌ Error de comunicación: " + e.message);
    }
}

// Exponer al objeto global window para eventos inline y compatibilidad
if (typeof window !== 'undefined') {
    window.loadProjectRequisitionsBadge = loadProjectRequisitionsBadge;
    window.openProjectRequisitionsInboxModal = openProjectRequisitionsInboxModal;
    window.loadProjectRequisitionsInbox = loadProjectRequisitionsInbox;
    window.filterProjectRequisitionsView = filterProjectRequisitionsView;
    window.renderProjectRequisitionsGroups = renderProjectRequisitionsGroups;
    window.goToReqPage = goToReqPage;
    window.changeReqPageSize = changeReqPageSize;
    window.onReqQtyChanged = onReqQtyChanged;
    window.toggleSelectAllProjectReqs = toggleSelectAllProjectReqs;
    window.submitDispatchProjectGroup = submitDispatchProjectGroup;
    window.quickDispatchSingleRequisition = quickDispatchSingleRequisition;
}
