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

// --- BLOQUE L11768-L12241 ---
// ==============================================================================

// 📋 7. GUÍAS OFICIALES DE TRASLADO & DESPACHO A OBRA

// ==============================================================================



function openTransferGuideModal() {

    document.getElementById("transferGuideForm").reset();

    populateSelectDropdowns();

    renderTransferToolsChecklist();

    openModal("modalTransferGuide");

}



function onTransferGuideProjectChanged() {

    const sel = document.getElementById("tg_project_id");

    if (!sel || !sel.options[sel.selectedIndex]) return;

    const opt = sel.options[sel.selectedIndex];

    const projId = parseInt(sel.value);

    const proj = allProjects.find(p => p.id === projId);



    // 1. Destino

    const loc = (proj && proj.location) || opt.getAttribute("data-location") || "Planta Centro - Morón";

    const destInput = document.getElementById("tg_destination");

    if (destInput) destInput.value = loc;



    // 2. Chofer responsable pre-cargado

    const driverInput = document.getElementById("tg_driver_name");

    if (driverInput) {

        let chofer = (allPersonnel || []).find(p => p.current_project_id === projId && (p.role_title || '').toLowerCase().includes('chofer'));

        if (!chofer) {

            chofer = (allPersonnel || []).find(p => (p.role_title || '').toLowerCase().includes('chofer'));

        }

        if (!chofer && allPersonnel && allPersonnel.length > 0) {

            chofer = allPersonnel[0];

        }

        if (chofer) driverInput.value = chofer.full_name;

    }



    // 3. Vehículo de transporte pre-cargado

    const vehSelect = document.getElementById("tg_vehicle_id");

    if (vehSelect) {

        const projVeh = (allAssets || []).find(a => (a.asset_type === 'vehiculo' || a.asset_type === 'camioneta') && a.current_project_id === projId);

        if (projVeh) {

            vehSelect.value = projVeh.id;

        } else {
            const availableVeh = (allAssets || []).find(a => 
                (a.asset_type === 'vehiculo' || a.asset_type === 'camioneta' || a.asset_type === 'transporte') &&
                a.is_active !== false &&
                !a.current_project_id &&
                (a.status === 'disponible_base' || a.status === 'disponible' || !a.status) &&
                a.status !== 'en_mantenimiento' && a.status !== 'en_obra' && a.status !== 'alquilado_a_tercero'
            );
            if (availableVeh) vehSelect.value = availableVeh.id;
            else vehSelect.value = "";
        }

    }



    // 4. Pre-marcar herramientas asignadas a este proyecto

    renderTransferToolsChecklist(projId);

}



var transferToolsGrouped = [];

async function ensureToolsLoadedForTransfer() {
    if (!allAssets || allAssets.length === 0 || !(window.rawToolsList && window.rawToolsList.length > 0)) {
        try {
            const res = await authFetch(`${API_BASE}/assets/tools-summary`);
            if (res.ok) {
                const grouped = await res.json();
                window.rawToolsList = grouped.flatMap(g => g.items || []);
                if (!allAssets || allAssets.length === 0) {
                    window.allAssets = allAssets = window.rawToolsList;
                }
            } else {
                const resA = await authFetch(`${API_BASE}/assets/`);
                if (resA.ok) {
                    window.allAssets = allAssets = await resA.json();
                }
            }
        } catch (e) {
            console.warn("Error cargando inventario de herramientas para traslado:", e);
        }
    }
}

async function renderTransferToolsChecklist(selectedProjId = null) {
    const container = document.getElementById("tg_tools_checklist_container");
    if (!container) return;

    container.innerHTML = `<div style="text-align: center; padding: 12px; color: #64748b; font-size: 11px;">
        <i class="fa-solid fa-spinner fa-spin"></i> Cargando herramientas disponibles...
    </div>`;

    await ensureToolsLoadedForTransfer();

    const nonTools = ['vehiculo', 'camioneta', 'camion', 'remolque'];
    const pool = (window.rawToolsList && window.rawToolsList.length > 0)
        ? window.rawToolsList
        : (allAssets || []).filter(a => !nonTools.includes(a.asset_type));

    // Agrupar herramientas por nombre / modelo
    const groups = {};
    pool.forEach(t => {
        const key = (t.name || 'HERRAMIENTA GENERAL').trim().toUpperCase();
        if (!groups[key]) {
            groups[key] = {
                key: key,
                name: (t.name || 'Herramienta General').trim(),
                asset_code_sample: t.asset_code || 'HERR',
                brand: t.brand || '',
                availableUnits: [],
                projectUnits: [],
                allUnits: []
            };
        }
        groups[key].allUnits.push(t);

        const isAssignedToThis = selectedProjId && (t.current_project_id === selectedProjId);
        const isAvail = (t.status === 'disponible_base' || t.status === 'disponible' || !t.current_project_id);

        if (isAssignedToThis) {
            groups[key].projectUnits.push(t);
        } else if (isAvail) {
            groups[key].availableUnits.push(t);
        }
    });

    transferToolsGrouped = Object.values(groups).sort((a, b) => a.name.localeCompare(b.name));

    if (transferToolsGrouped.length === 0) {
        container.innerHTML = `<div style="text-align: center; padding: 12px; color: #94a3b8; font-size: 11px;">
            No hay herramientas registradas en el sistema.
        </div>`;
        return;
    }

    renderTransferToolsItemsHtml();
}

function renderTransferToolsItemsHtml() {
    const container = document.getElementById("tg_tools_checklist_container");
    if (!container) return;

    container.innerHTML = transferToolsGrouped.map((g, idx) => {
        const totalAvail = g.availableUnits.length + g.projectUnits.length;
        const initialQty = g.projectUnits.length > 0 ? g.projectUnits.length : 0;
        const isInitiallyActive = initialQty > 0;

        return `
        <div class="tg-tool-item" data-index="${idx}" data-text="${g.name} ${g.asset_code_sample} ${g.brand}" style="display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 6px 8px; border-radius: 6px; background: ${isInitiallyActive ? '#f0fdf4' : '#f8fafc'}; border: 1px solid ${isInitiallyActive ? '#86efac' : '#e2e8f0'}; transition: all 0.2s ease;">
            <div style="display: flex; align-items: center; gap: 8px; min-width: 0; flex: 1;">
                <input type="checkbox" id="tg_chk_${idx}" class="tg-tool-checkbox" data-index="${idx}" ${isInitiallyActive ? 'checked' : ''} onchange="onToggleTransferToolRow(${idx})" style="width: 16px; height: 16px; accent-color: #0284c7; cursor: pointer; flex-shrink: 0;">
                <label for="tg_chk_${idx}" style="cursor: pointer; display: flex; flex-direction: column; min-width: 0;">
                    <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                        <span style="font-weight: 700; color: var(--dalor-navy); font-size: 12px; line-height: 1.2;">${g.name}</span>
                        ${g.brand ? `<span style="font-size: 10px; color: #64748b; background: #e2e8f0; padding: 1px 5px; border-radius: 4px;">${g.brand}</span>` : ''}
                    </div>
                    <span style="font-size: 10px; color: ${totalAvail > 0 ? '#059669' : '#e11d48'}; font-weight: 600;">
                        Stock Disp.: ${totalAvail} unid. ${g.projectUnits.length > 0 ? `(${g.projectUnits.length} ya en obra)` : ''}
                    </span>
                </label>
            </div>
            
            <div style="display: flex; align-items: center; gap: 4px; flex-shrink: 0;">
                <button type="button" onclick="adjustTransferToolQty(${idx}, -1)" class="btn-qty-minus" style="width: 24px; height: 24px; border: 1px solid #cbd5e1; background: #ffffff; border-radius: 4px; font-weight: 800; cursor: pointer; color: #475569; display: flex; align-items: center; justify-content: center; font-size: 12px;">-</button>
                <input type="number" id="tg_qty_${idx}" class="tg-tool-qty-input" data-index="${idx}" min="0" max="${Math.max(1, totalAvail)}" value="${initialQty}" oninput="onTransferToolQtyInput(${idx})" style="width: 52px; height: 24px; text-align: center; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 12px; font-weight: 800; color: #0284c7;">
                <button type="button" onclick="adjustTransferToolQty(${idx}, 1)" class="btn-qty-plus" style="width: 24px; height: 24px; border: 1px solid #cbd5e1; background: #ffffff; border-radius: 4px; font-weight: 800; cursor: pointer; color: #475569; display: flex; align-items: center; justify-content: center; font-size: 12px;">+</button>
            </div>
        </div>
        `;
    }).join('');

    filterTransferToolsChecklist();
}

function onToggleTransferToolRow(idx) {
    const chk = document.getElementById(`tg_chk_${idx}`);
    const input = document.getElementById(`tg_qty_${idx}`);
    const row = chk?.closest('.tg-tool-item');
    if (!chk || !input || !row) return;

    const g = transferToolsGrouped[idx];
    const totalAvail = (g?.availableUnits?.length || 0) + (g?.projectUnits?.length || 0);

    if (chk.checked) {
        if (parseInt(input.value) <= 0) {
            input.value = totalAvail > 0 ? "1" : "0";
        }
        row.style.background = '#f0fdf4';
        row.style.borderColor = '#86efac';
    } else {
        input.value = "0";
        row.style.background = '#f8fafc';
        row.style.borderColor = '#e2e8f0';
    }
}

function adjustTransferToolQty(idx, delta) {
    const input = document.getElementById(`tg_qty_${idx}`);
    const chk = document.getElementById(`tg_chk_${idx}`);
    const row = input?.closest('.tg-tool-item');
    if (!input || !chk || !row) return;

    const g = transferToolsGrouped[idx];
    const totalAvail = (g?.availableUnits?.length || 0) + (g?.projectUnits?.length || 0);
    let val = parseInt(input.value || "0") + delta;
    if (val < 0) val = 0;
    if (val > totalAvail && totalAvail > 0) val = totalAvail;

    input.value = String(val);
    chk.checked = val > 0;
    row.style.background = val > 0 ? '#f0fdf4' : '#f8fafc';
    row.style.borderColor = val > 0 ? '#86efac' : '#e2e8f0';
}

function onTransferToolQtyInput(idx) {
    const input = document.getElementById(`tg_qty_${idx}`);
    const chk = document.getElementById(`tg_chk_${idx}`);
    const row = input?.closest('.tg-tool-item');
    if (!input || !chk || !row) return;

    const g = transferToolsGrouped[idx];
    const totalAvail = (g?.availableUnits?.length || 0) + (g?.projectUnits?.length || 0);
    let val = parseInt(input.value || "0");
    if (isNaN(val) || val < 0) val = 0;
    if (val > totalAvail && totalAvail > 0) val = totalAvail;

    input.value = String(val);
    chk.checked = val > 0;
    row.style.background = val > 0 ? '#f0fdf4' : '#f8fafc';
    row.style.borderColor = val > 0 ? '#86efac' : '#e2e8f0';
}

function filterTransferToolsChecklist() {
    const input = document.getElementById("tg_tools_search");
    const q = (input?.value || "").toLowerCase().trim();
    let visibleCount = 0;

    document.querySelectorAll(".tg-tool-item").forEach(item => {
        const text = (item.getAttribute("data-text") || "").toLowerCase();
        const matches = !q || text.includes(q);
        item.style.display = matches ? "flex" : "none";
        if (matches) visibleCount++;
    });

    const container = document.getElementById("tg_tools_checklist_container");
    let noMatchEl = document.getElementById("tg_tools_no_match");
    if (visibleCount === 0) {
        if (!noMatchEl && container) {
            noMatchEl = document.createElement("div");
            noMatchEl.id = "tg_tools_no_match";
            noMatchEl.style.cssText = "text-align: center; padding: 12px; color: #94a3b8; font-size: 11px;";
            container.appendChild(noMatchEl);
        }
        if (noMatchEl) {
            noMatchEl.innerHTML = `No se encontraron herramientas que coincidan con "<strong>${q}</strong>".`;
            noMatchEl.style.display = "block";
        }
    } else if (noMatchEl) {
        noMatchEl.style.display = "none";
    }
}



async function submitGenerateTransferGuide(event) {

    event.preventDefault();

    const projId = parseInt(document.getElementById("tg_project_id").value);

    const dest = document.getElementById("tg_destination").value.trim();

    const vehId = document.getElementById("tg_vehicle_id").value;

    const driver = document.getElementById("tg_driver_name").value.trim();



    if (!projId) {

        alert("Por favor selecciona un proyecto aprobado de destino.");

        return;

    }



    // Recolectar herramientas y cantidades seleccionadas
    const selectedToolGroups = [];
    let totalItemsCount = 0;

    (transferToolsGrouped || []).forEach((g, idx) => {
        const input = document.getElementById(`tg_qty_${idx}`);
        const chk = document.getElementById(`tg_chk_${idx}`);
        const qty = parseInt(input?.value || "0");
        if (qty > 0 || (chk && chk.checked)) {
            const finalQty = qty > 0 ? qty : 1;
            // Tomar primero unidades ya en este proyecto o disponibles en base
            const allCandidates = [...g.projectUnits, ...g.availableUnits, ...g.allUnits];
            const uniqueUnits = [];
            const seenIds = new Set();
            for (const u of allCandidates) {
                if (!seenIds.has(u.id)) {
                    seenIds.add(u.id);
                    uniqueUnits.push(u);
                }
            }
            const allocatedUnits = uniqueUnits.slice(0, finalQty);
            selectedToolGroups.push({
                group: g,
                name: g.name,
                brand: g.brand,
                quantity: finalQty,
                units: allocatedUnits
            });
            totalItemsCount += finalQty;
        }
    });

    if (selectedToolGroups.length === 0 || totalItemsCount === 0) {
        alert("Por favor selecciona al menos una herramienta o equipo con cantidad mayor a 0 para trasladar.");
        return;
    }

    const proj = allProjects.find(p => p.id === projId) || { code: "DAL-2026-001", name: "Proyecto Obra" };
    const isSedeCentralOrNoVeh = !vehId || vehId === "none" || (dest && (dest.toLowerCase().includes("sede") || dest.toLowerCase().includes("taller")));
    const veh = (!isSedeCentralOrNoVeh && vehId && vehId !== "none") ? (allAssets.find(a => a.id == vehId) || null) : null;

    const notes = document.getElementById("tg_notes")?.value || "";
    const vehPlate = veh ? (veh.license_plate || "S/P") : "S/P";
    const finalDriver = driver || (isSedeCentralOrNoVeh ? "Personal Dalor Sede Central / Custodia Interna" : "Chofer DALOR");

    let guideNumber = `GT-DALOR-${Date.now().toString().slice(-6)}`;

    // 1. Emitir y registrar guía legal en base de datos mediante API oficial de Despacho
    try {
        const dispatchItems = [];
        selectedToolGroups.forEach(tg => {
            if (tg.units.length > 0) {
                // Registrar cada unidad individual con su código de activo
                tg.units.forEach(u => {
                    dispatchItems.push({
                        description: `[${u.asset_code}] ${u.name} (Serial: ${u.serial_number || 'S/N'})`,
                        quantity: 1,
                        unit: "UND",
                        condition_status: "Operativo / Verificado"
                    });
                });
            } else {
                dispatchItems.push({
                    description: `${tg.name} ${tg.brand ? '(' + tg.brand + ')' : ''}`,
                    quantity: tg.quantity,
                    unit: "UND",
                    condition_status: "Operativo / Verificado"
                });
            }
        });

        const dispatchPayload = {
            project_id: projId,
            client_id: proj ? proj.client_id : null,
            guide_type: isSedeCentralOrNoVeh ? "control_interno" : "traslado_externo",
            destination_address: dest || (isSedeCentralOrNoVeh ? "Taller DALOR Guacara (Sede Central)" : "En Obra"),
            driver_name: finalDriver,
            vehicle_plate: vehPlate,
            carrier_company: "DALOR C.A.",
            asset_id: (veh && veh.id) ? parseInt(veh.id) : null,
            transport_type: "propio_dalor",
            notes: notes || (isSedeCentralOrNoVeh ? "Control Interno / Traslado a Sede Central DALOR" : "Guía de traslado de equipos y herramientas hacia obra"),
            items: dispatchItems
        };
        const guideRes = await authFetch(`${API_BASE}/dispatch/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(dispatchPayload)
        });
        if (guideRes.ok) {
            const guideData = await guideRes.json();
            if (guideData && guideData.guide_number) {
                guideNumber = guideData.guide_number;
            }
        }
    } catch (errG) {
        console.warn("Advertencia al persistir guía en backend:", errG);
    }

    // 2. Reubicar herramientas en backend para el proyecto
    for (const tg of selectedToolGroups) {
        for (const unit of tg.units) {
            try {
                await authFetch(`${API_BASE}/resources/assign`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        resource_type: "asset",
                        resource_id: unit.id,
                        project_id: projId,
                        destination_location: dest,
                        custodian_name: driver,
                        action_type: "assign"
                    })
                });
            } catch (e) {
                console.error("Error asignando herramienta:", e);
            }
        }
    }

    closeModal("modalTransferGuide");


    await loadInitialMasterData();

    if (document.getElementById("subtab-res-tools") && !document.getElementById("subtab-res-tools").classList.contains("hidden")) {

        loadToolsList();

    }



    // MOSTRAR FORMATO OFICIAL FORMAL LISTO PARA IMPRIMIR O GUARDAR EN PDF

    const printArea = document.getElementById("modalPrintPreviewContent");

    const titleEl = document.getElementById("previewModalTitle");

    if (titleEl) titleEl.innerText = "Guía Oficial de Traslado y Despacho de Equipos - Dalor C.A.";



    const nowStr = new Date().toLocaleDateString('es-VE') + ' ' + new Date().toLocaleTimeString('es-VE', {hour: '2-digit', minute:'2-digit'});



    if (printArea) {

        printArea.innerHTML = `

        <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; padding: 25px; background: #fff;">

            <!-- Header Membretado Oficial DALOR -->

            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #002B49; padding-bottom: 12px; margin-bottom: 16px;">

                <div>

                    <h2 style="margin: 0; color: #002B49; font-size: 22px; font-weight: 900; letter-spacing: 1px;">DALOR, C.A.</h2>

                    <p style="margin: 3px 0 0 0; font-size: 11px; color: #475569; font-weight: 600;">SOLUCIONES DE INGENIERÍA, MANTENIMIENTO Y MONTAJE INDUSTRIAL</p>

                    <p style="margin: 2px 0 0 0; font-size: 10px; color: #64748b;">RIF: J-31601195-0 &bull; Guacara, Edo. Carabobo - Venezuela</p>

                </div>

                <div style="text-align: right;">

                    <div style="background: #0284c7; color: #fff; padding: 6px 14px; border-radius: 6px; font-weight: 900; font-size: 13px; letter-spacing: 0.5px;">

                        GUÍA DE TRASLADO DE EQUIPOS

                    </div>

                    <div style="font-size: 13px; font-weight: 900; color: #002B49; margin-top: 5px;">

                        N°: ${guideNumber}

                    </div>

                    <div style="font-size: 11px; color: #64748b;">

                        Fecha: ${nowStr}

                    </div>

                </div>

            </div>



            <!-- Ficha de Traslado y Destino -->

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 11px;">

                <tr style="background: #f8fafc;">

                    <td style="padding: 6px 10px; border: 1px solid #cbd5e1; font-weight: 700; width: 20%; color: #475569;">Proyecto Destino:</td>

                    <td style="padding: 6px 10px; border: 1px solid #cbd5e1; width: 30%; font-weight: 800; color: #0284c7;">[${proj.code}] ${proj.name}</td>

                    <td style="padding: 6px 10px; border: 1px solid #cbd5e1; font-weight: 700; width: 20%; color: #475569;">Ubicación / Frente:</td>

                    <td style="padding: 6px 10px; border: 1px solid #cbd5e1; width: 30%; font-weight: 700;">${dest}</td>

                </tr>

                <tr>

                    <td style="padding: 6px 10px; border: 1px solid #cbd5e1; font-weight: 700; color: #475569;">Vehículo de Carga:</td>

                    <td style="padding: 6px 10px; border: 1px solid #cbd5e1;">${veh.name} (Placa: ${veh.license_plate || 'N/A'})</td>

                    <td style="padding: 6px 10px; border: 1px solid #cbd5e1; font-weight: 700; color: #475569;">Conductor / Chofer:</td>

                    <td style="padding: 6px 10px; border: 1px solid #cbd5e1; font-weight: 800; color: #002B49;">${driver}</td>

                </tr>

            </table>



            <!-- Tabla de Herramientas y Equipos Despachados -->

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 11px;">

                <thead>

                    <tr style="background: #002B49; color: #ffffff;">

                        <th style="padding: 8px 10px; border: 1px solid #002B49; width: 40px; text-align: center;">Item</th>

                        <th style="padding: 8px 10px; border: 1px solid #002B49; width: 90px;">Código</th>

                        <th style="padding: 8px 10px; border: 1px solid #002B49;">Descripción de la Herramienta / Equipo</th>

                        <th style="padding: 8px 10px; border: 1px solid #002B49; width: 130px;">Marca / Modelo</th>

                        <th style="padding: 8px 10px; border: 1px solid #002B49; width: 120px;">Serial</th>

                        <th style="padding: 8px 10px; border: 1px solid #002B49; width: 90px; text-align: center;">Estado</th>

                    </tr>

                </thead>

                <tbody>

                    ${(() => {
                        let rowIdx = 0;
                        const rows = [];
                        selectedToolGroups.forEach(tg => {
                            if (tg.units.length > 0) {
                                tg.units.forEach(u => {
                                    rowIdx++;
                                    rows.push(`
                                        <tr style="background: ${rowIdx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
                                            <td style="padding: 6px 10px; border: 1px solid #cbd5e1; text-align: center; font-weight: 800;">${rowIdx}</td>
                                            <td style="padding: 6px 10px; border: 1px solid #cbd5e1; font-family: monospace; font-weight: 800; color: #0284c7;">${u.asset_code}</td>
                                            <td style="padding: 6px 10px; border: 1px solid #cbd5e1; font-weight: 700;">${u.name}</td>
                                            <td style="padding: 6px 10px; border: 1px solid #cbd5e1; color: #64748b;">${u.brand || tg.brand || '-'}</td>
                                            <td style="padding: 6px 10px; border: 1px solid #cbd5e1; font-family: monospace;">${u.serial_number || 'S/N'}</td>
                                            <td style="padding: 6px 10px; border: 1px solid #cbd5e1; text-align: center; color: #059669; font-weight: 800;">Operativo (1 UND)</td>
                                        </tr>
                                    `);
                                });
                            } else {
                                rowIdx++;
                                rows.push(`
                                    <tr style="background: ${rowIdx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
                                        <td style="padding: 6px 10px; border: 1px solid #cbd5e1; text-align: center; font-weight: 800;">${rowIdx}</td>
                                        <td style="padding: 6px 10px; border: 1px solid #cbd5e1; font-family: monospace; font-weight: 800; color: #0284c7;">${tg.group.asset_code_sample}</td>
                                        <td style="padding: 6px 10px; border: 1px solid #cbd5e1; font-weight: 700;">${tg.name}</td>
                                        <td style="padding: 6px 10px; border: 1px solid #cbd5e1; color: #64748b;">${tg.brand || '-'}</td>
                                        <td style="padding: 6px 10px; border: 1px solid #cbd5e1; font-family: monospace;">LOTE</td>
                                        <td style="padding: 6px 10px; border: 1px solid #cbd5e1; text-align: center; color: #059669; font-weight: 800;">Operativo (${tg.quantity} UND)</td>
                                    </tr>
                                `);
                            }
                        });
                        return rows.join('');
                    })()}
                </tbody>
            </table>



            <!-- Observaciones -->

            <div style="background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 14px; margin-bottom: 24px; font-size: 11px;">

                <strong>Observaciones / Condición de Custodia:</strong> ${document.getElementById("tg_notes")?.value || 'Equipos verificados y entregados en condiciones 100% operativas para faena de obra.'}

            </div>



            <!-- Bloque Formal de 3 Firmas de Responsabilidad -->

            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; text-align: center; margin-top: 36px; font-size: 11px;">

                <div style="border-top: 1px solid #475569; padding-top: 6px;">

                    <strong style="color: #002B49;">Despachado por:</strong><br>

                    <span style="color: #64748b; font-size: 10px;">Almacén Central / Custodia Dalor</span>

                </div>

                <div style="border-top: 1px solid #475569; padding-top: 6px;">

                    <strong style="color: #002B49;">Transportado por:</strong><br>

                    <span style="color: #64748b; font-size: 10px;">${driver} (Chofer)</span>

                </div>

                <div style="border-top: 1px solid #475569; padding-top: 6px;">

                    <strong style="color: #002B49;">Recibido Conforme en Obra:</strong><br>

                    <span style="color: #64748b; font-size: 10px;">Supervisor / Residente de Obra</span>

                </div>

            </div>

        </div>

        `;

        openModal("modalPrintPreview");

    }

}






// Exponer al objeto global window para eventos inline y compatibilidad
if (typeof window !== 'undefined') {
    window.openTransferGuideModal = openTransferGuideModal;
    window.onTransferGuideProjectChanged = onTransferGuideProjectChanged;
    window.renderTransferToolsChecklist = renderTransferToolsChecklist;
    window.filterTransferToolsChecklist = filterTransferToolsChecklist;
    window.onToggleTransferToolRow = onToggleTransferToolRow;
    window.adjustTransferToolQty = adjustTransferToolQty;
    window.onTransferToolQtyInput = onTransferToolQtyInput;
    window.submitGenerateTransferGuide = submitGenerateTransferGuide;
}
