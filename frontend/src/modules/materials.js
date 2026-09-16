/**
 * DALOR SIGO-P | Módulo: MATERIALS.JS
 * Extraído y desacoplado del monolito de producción (v94)
 */

// --- BLOQUE L11092-L11629 ---
// ==============================================================================

// 📦 5. MÓDULO DE INVENTARIO DE MATERIALES Y CONSUMIBLES (DALOR SIGO-P)

// ==============================================================================



async function loadMaterialsList() {

    const tbody = document.getElementById("materialsTableBody");

    if (!tbody) return;



    tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 20px; color: #94a3b8;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando inventario de materiales...</td></tr>`;



    try {

        const res = await fetch(`${API_BASE}/materials/`);

        const data = await res.json();

        allMaterials = data.materials || (Array.isArray(data) ? data : []);



        const totalItemsEl = document.getElementById("matTotalItemsCount");

        const totalValEl = document.getElementById("matTotalValuationUsd");

        if (totalItemsEl) totalItemsEl.innerText = data.total_items !== undefined ? data.total_items : allMaterials.length;

        if (totalValEl) {

            const val = data.total_inventory_usd !== undefined ? data.total_inventory_usd : allMaterials.reduce((acc, m) => acc + (m.stock_quantity * m.unit_cost_usd || 0), 0);

            totalValEl.innerText = `$${val.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD`;

        }



        renderMaterialsTable(allMaterials);

        try {

            if (typeof populateSelectDropdowns === 'function') populateSelectDropdowns();

        } catch (errPop) {

            console.warn("Dropdown populator warning:", errPop);

        }

    } catch (e) {

        console.error("Error loading materials:", e);

        tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: #e11d48; padding: 20px;">Error al cargar inventario de materiales: ${e.message}</td></tr>`;

    }

}



function renderMaterialsTable(materials) {

    const tbody = document.getElementById("materialsTableBody");

    if (!tbody) return;



    if (materials.length === 0) {

        tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 20px; color: #94a3b8;">No se encontraron materiales registrados.</td></tr>`;

        return;

    }



    tbody.innerHTML = materials.map(m => {

        const isLow = m.is_low_stock || m.stock_quantity <= m.min_stock_alert;

        return `

        <tr>

            <td style="font-weight: 800; color: var(--dalor-blue); font-family: monospace;">${m.code}</td>

            <td style="font-weight: 700; color: var(--dalor-navy);">${m.name}</td>

            <td><span style="font-size: 10px; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-weight: 700; color: #475569;">${m.category}</span></td>

            <td style="text-align: center; font-weight: 700;">${m.unit_measure}</td>

            <td style="text-align: center;">

                <span style="font-weight: 800; font-size: 13px; color: ${isLow ? '#e11d48' : '#059669'};">

                    ${(["und", "unid", "unidad", "unidades", "pza", "pieza", "piezas", "rollo", "rollos"].includes((m.unit_measure || "").toLowerCase()) ? Math.round(m.stock_quantity) : Number((m.stock_quantity || 0).toFixed(2))).toLocaleString()} ${m.unit_measure}

                </span>

                ${isLow ? `<span style="display: block; font-size: 9px; color: #dc2626; font-weight: 800;">⚠️ STOCK CRÍTICO</span>` : ''}

            </td>

            <td style="text-align: center; color: #64748b; font-size: 11px;">${m.min_stock_alert} ${m.unit_measure}</td>

            <td style="text-align: right; font-weight: 700; color: #0284c7;">$${m.unit_cost_usd.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>

            <td style="text-align: right; font-weight: 900; color: var(--dalor-navy);">$${m.total_cost_usd.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>

            <td style="text-align: center; white-space: nowrap;">

                <button onclick="openMaterialEntryModal(${m.id})" class="btn-primary" style="padding: 3px 8px; font-size: 11px; background: #059669;" title="Registrar Entrada / Compra">

                    <i class="fa-solid fa-plus"></i> Entrada

                </button>

                <button onclick="openMaterialConsumeModal(${m.id})" class="btn-primary" style="padding: 3px 8px; font-size: 11px; background: #0284c7; margin-left: 4px;" title="Despachar a Obra o Taller">

                    <i class="fa-solid fa-arrow-right-from-bracket"></i> Despachar

                </button>

            </td>

        </tr>

        `;

    }).join('');

}



function filterMaterialsTable() {

    const search = (document.getElementById("filterMaterialSearch")?.value || "").toLowerCase();

    const cat = document.getElementById("filterMaterialCategory")?.value || "";



    const filtered = allMaterials.filter(m => {

        const matchesSearch = !search || m.name.toLowerCase().includes(search) || m.code.toLowerCase().includes(search);

        const matchesCat = !cat || m.category === cat;

        return matchesSearch && matchesCat;

    });



    renderMaterialsTable(filtered);

}



function openNewMaterialModal() {

    document.getElementById("newMaterialForm").reset();

    openModal("modalNewMaterial");

}



async function submitCreateMaterial(event) {

    event.preventDefault();

    const payload = {

        code: document.getElementById("nmat_code").value.trim(),

        name: document.getElementById("nmat_name").value.trim(),

        category: document.getElementById("nmat_category").value,

        unit_measure: document.getElementById("nmat_unit").value,

        stock_quantity: parseFloat(document.getElementById("nmat_stock").value) || 0.0,

        min_stock_alert: parseFloat(document.getElementById("nmat_alert").value) || 5.0,

        unit_cost_usd: parseFloat(document.getElementById("nmat_cost").value) || 0.0,

        location: document.getElementById("nmat_location").value.trim() || "Almacén Central Dalor"

    };



    try {

        const res = await fetch(`${API_BASE}/materials/`, {

            method: "POST",

            headers: { "Content-Type": "application/json" },

            body: JSON.stringify(payload)

        });



        if (res.ok) {

            alert("✅ Material registrado con éxito en el catálogo.");

            closeModal("modalNewMaterial");

            await loadInitialMasterData();

            loadMaterialsList();

        } else {

            const err = await res.json();

            alert("Error: " + (err.detail || JSON.stringify(err)));

        }

    } catch (e) {

        alert("Error de conexión al crear material: " + e.message);

    }

}



function openMaterialEntryModal(materialId = null) {

    document.getElementById("materialEntryForm").reset();

    populateSelectDropdowns();

    if (materialId) {

        document.getElementById("me_material_id").value = materialId;

    }

    calcMaterialEntryTotal();

    openModal("modalMaterialEntry");

}



function calcMaterialEntryTotal() {

    const qty = parseFloat(document.getElementById("me_quantity")?.value) || 0.0;

    const cost = parseFloat(document.getElementById("me_unit_cost")?.value) || 0.0;

    const total = qty * cost;

    const previewEl = document.getElementById("me_total_usd_preview");

    if (previewEl) previewEl.innerText = `$${total.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD`;

}



async function submitMaterialEntry(event) {

    event.preventDefault();

    const matId = parseInt(document.getElementById("me_material_id").value);

    const qty = parseFloat(document.getElementById("me_quantity").value) || 0.0;

    const cost = parseFloat(document.getElementById("me_unit_cost").value) || 0.0;

    const registerCxp = document.getElementById("me_register_cxp")?.checked || false;



    if (!matId || qty <= 0) {

        alert("Selecciona un material y cantidad válida.");

        return;

    }



    const payload = {

        material_id: matId,

        quantity: qty,

        unit_cost_usd: cost,

        supplier_name: document.getElementById("me_supplier").value.trim() || "Proveedor General",

        reference_doc: document.getElementById("me_doc").value.trim() || "Compra Almacén",

        notes: document.getElementById("me_notes").value.trim(),

        performed_by: "Custodio de Almacén",

        register_in_cxp: registerCxp,

        due_days: 15

    };



    try {

        const res = await fetch(`${API_BASE}/materials/entry`, {

            method: "POST",

            headers: { "Content-Type": "application/json" },

            body: JSON.stringify(payload)

        });



        if (res.ok) {

            const data = await res.json();

            alert(`✅ ${data.message}`);

            closeModal("modalMaterialEntry");

            await loadInitialMasterData();

            loadMaterialsList();

            if (registerCxp) loadPayablesList();

        } else {

            const err = await res.json();

            alert("Error: " + (err.detail || JSON.stringify(err)));

        }

    } catch (e) {

        alert("Error al procesar entrada de material: " + e.message);

    }

}



function openMaterialConsumeModal(materialId = null) {

    document.getElementById("materialConsumeForm").reset();

    populateSelectDropdowns();

    if (materialId) {

        document.getElementById("mc_material_id").value = materialId;

    }

    onConsumeMaterialSelected();

    calcMaterialConsumeTotal();

    openModal("modalMaterialConsume");

}



function onConsumeMaterialSelected() {

    const sel = document.getElementById("mc_material_id");

    if (!sel || !sel.options[sel.selectedIndex]) return;

    const opt = sel.options[sel.selectedIndex];

    const stock = opt.getAttribute("data-stock") || "0";

    const unit = opt.getAttribute("data-unit") || "UND";

    const label = document.getElementById("mc_stock_available_label");

    if (label) label.innerText = `${parseFloat(stock).toLocaleString()} ${unit}`;

    calcMaterialConsumeTotal();

}



function calcMaterialConsumeTotal() {

    const sel = document.getElementById("mc_material_id");

    const qty = parseFloat(document.getElementById("mc_quantity")?.value) || 0.0;

    let cost = 0.0;

    if (sel && sel.options[sel.selectedIndex]) {

        cost = parseFloat(sel.options[sel.selectedIndex].getAttribute("data-cost")) || 0.0;

    }

    const total = qty * cost;

    const previewEl = document.getElementById("mc_cost_preview");

    if (previewEl) previewEl.value = `$${total.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD`;

}



async function submitMaterialConsume(event) {

    event.preventDefault();

    const matId = parseInt(document.getElementById("mc_material_id").value);

    const qty = parseFloat(document.getElementById("mc_quantity").value) || 0.0;

    const projIdVal = document.getElementById("mc_project_id").value;

    const projId = projIdVal ? parseInt(projIdVal) : null;



    if (!matId || qty <= 0) {

        alert("Selecciona un material y cantidad válida.");

        return;

    }



    const payload = {

        material_id: matId,

        quantity: qty,

        project_id: projId,

        destination: projId ? "Obra en Ejecución" : "Taller Central",

        reference_doc: document.getElementById("mc_doc").value.trim() || "Requisición Interna",

        notes: document.getElementById("mc_notes").value.trim(),

        performed_by: document.getElementById("mc_performed_by").value.trim() || "Custodio de Almacén"

    };



    try {

        const res = await fetch(`${API_BASE}/materials/consume`, {

            method: "POST",

            headers: { "Content-Type": "application/json" },

            body: JSON.stringify(payload)

        });



        if (res.ok) {

            const data = await res.json();

            alert(`✅ ${data.message}`);

            closeModal("modalMaterialConsume");

            await loadInitialMasterData();

            loadMaterialsList();

        } else {

            const err = await res.json();

            alert("Error: " + (err.detail || JSON.stringify(err)));

        }

    } catch (e) {

        alert("Error al procesar despacho de material: " + e.message);

    }

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

            const firstVeh = (allAssets || []).find(a => a.asset_type === 'vehiculo' || a.asset_type === 'camioneta');

            if (firstVeh) vehSelect.value = firstVeh.id;

        }

    }



    // 4. Pre-marcar herramientas asignadas a este proyecto

    renderTransferToolsChecklist(projId);

}



function renderTransferToolsChecklist(selectedProjId = null) {

    const container = document.getElementById("tg_tools_checklist_container");

    if (!container) return;



    const tools = allAssets.filter(a => a.asset_type !== 'vehiculo' && a.asset_type !== 'camioneta');

    if (tools.length === 0) {

        container.innerHTML = `<span style="font-size:11px; color:#94a3b8;">No hay herramientas registradas.</span>`;

        return;

    }



    container.innerHTML = tools.map(t => {

        const isPreChecked = selectedProjId && (t.current_project_id === selectedProjId || t.current_location === "en_obra");

        return `

        <label style="display: flex; align-items: center; gap: 8px; padding: 4px 6px; border-radius: 4px; background: ${isPreChecked ? '#f0fdf4' : '#f8fafc'}; font-size: 11px; cursor: pointer;" class="tg-tool-item" data-text="${t.asset_code} ${t.name} ${t.brand || ''}">

            <input type="checkbox" value="${t.id}" data-name="${t.name}" data-code="${t.asset_code}" data-brand="${t.brand || ''}" data-serial="${t.serial_number || ''}" class="tg-tool-checkbox" ${isPreChecked ? 'checked' : ''} style="width: 15px; height: 15px; accent-color: #0284c7;">

            <span style="font-weight: 800; color: var(--dalor-blue); font-family: monospace;">[${t.asset_code}]</span>

            <span style="font-weight: 600; color: var(--dalor-navy);">${t.name}</span>

            <span style="color: #64748b; font-size: 10px; margin-left: auto;">${t.brand || ''}</span>

        </label>

        `;

    }).join('');

}



function filterTransferToolsChecklist() {

    const q = (document.getElementById("tg_tools_search")?.value || "").toLowerCase();

    document.querySelectorAll(".tg-tool-item").forEach(item => {

        const text = item.getAttribute("data-text").toLowerCase();

        item.style.display = text.includes(q) ? "flex" : "none";

    });

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



    const selectedTools = [];

    document.querySelectorAll(".tg-tool-checkbox:checked").forEach(cb => {

        selectedTools.push({

            id: parseInt(cb.value),

            code: cb.getAttribute("data-code"),

            name: cb.getAttribute("data-name")

        });

    });



    if (selectedTools.length === 0) {

        alert("Por favor selecciona al menos una herramienta o equipo a trasladar.");

        return;

    }



    const proj = allProjects.find(p => p.id === projId) || { code: "DAL-2026-001", name: "Proyecto Obra" };

    const veh = allAssets.find(a => a.id == vehId) || { asset_code: "VEH-001", name: "Camioneta Toyota Hilux" };

    const guideNumber = `GT-DALOR-${Date.now().toString().slice(-6)}`;



    // Reubicar herramientas en backend para el proyecto

    for (const tool of selectedTools) {

        try {

            await fetch(`${API_BASE}/resources/assign`, {

                method: "POST",

                headers: { "Content-Type": "application/json" },

                body: JSON.stringify({

                    resource_type: "asset",

                    resource_id: tool.id,

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

                    ${selectedTools.map((t, i) => `

                        <tr style="background: ${i % 2 === 0 ? '#ffffff' : '#f8fafc'};">

                            <td style="padding: 6px 10px; border: 1px solid #cbd5e1; text-align: center; font-weight: 800;">${i + 1}</td>

                            <td style="padding: 6px 10px; border: 1px solid #cbd5e1; font-family: monospace; font-weight: 800; color: #0284c7;">${t.code}</td>

                            <td style="padding: 6px 10px; border: 1px solid #cbd5e1; font-weight: 700;">${t.name}</td>

                            <td style="padding: 6px 10px; border: 1px solid #cbd5e1; color: #64748b;">${t.brand || '-'}</td>

                            <td style="padding: 6px 10px; border: 1px solid #cbd5e1; font-family: monospace;">${t.serial || 'S/N'}</td>

                            <td style="padding: 6px 10px; border: 1px solid #cbd5e1; text-align: center; color: #059669; font-weight: 800;">Operativo</td>

                        </tr>

                    `).join('')}

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





// --- BLOQUE L12740-L13126 ---
// ==============================================================================

// 📦 NOTA DE ENTREGA DE MATERIALES (PARA JEFE DE MATERIALES / ALMACÉN)

// ==============================================================================

function openMaterialDeliveryModal() {

    const form = document.getElementById("materialDeliveryForm");

    if (form) form.reset();

    populateSelect("md_project_id", allProjects, p => `<option value="${p.id}" data-location="${p.location || ''}">${p.code} - ${p.name}</option>`);

    onMaterialDeliveryProjectChanged();

    openModal("modalMaterialDelivery");

}



function onMaterialDeliveryProjectChanged() {

    const sel = document.getElementById("md_project_id");

    if (!sel || !sel.options[sel.selectedIndex]) return;

    const projId = parseInt(sel.value);

    const proj = allProjects.find(p => p.id === projId);



    const loc = (proj && proj.location) || "Frente de Obra / Planta";

    const destInput = document.getElementById("md_destination");

    if (destInput) destInput.value = loc;



    const dispInput = document.getElementById("md_dispatcher_name");

    if (dispInput && !dispInput.value) {

        dispInput.value = "Jefe de Materiales / Almacén Central";

    }



    const recvInput = document.getElementById("md_receiver_name");

    if (recvInput && !recvInput.value) {

        recvInput.value = (proj && proj.client_name) ? `Supervisor / Residente (${proj.client_name})` : "Supervisor Residente de Obra";

    }



    renderInitialMaterialDeliveryRows();

}



function renderInitialMaterialDeliveryRows() {

    const tbody = document.getElementById("md_materials_tbody");

    if (!tbody) return;

    tbody.innerHTML = '';

    

    // Si hay materiales en inventario, precargar los primeros 2

    if (allMaterials && allMaterials.length > 0) {

        for (let i = 0; i < Math.min(2, allMaterials.length); i++) {

            addMaterialDeliveryRow(allMaterials[i].name, allMaterials[i].unit_measure || 'Pza', 1);

        }

    } else {

        addMaterialDeliveryRow('Cable THW 12 AWG', 'Metro (m)', 50);

        addMaterialDeliveryRow('Breaker 2x30A', 'Pza', 2);

    }

}



function addMaterialDeliveryRow(defaultName = '', defaultUnit = 'Pza', defaultQty = 1) {

    const tbody = document.getElementById("md_materials_tbody");

    if (!tbody) return;



    const tr = document.createElement("tr");

    tr.style.borderBottom = "1px solid #f1f5f9";

    tr.innerHTML = `

        <td style="padding: 4px 6px;">

            <input type="text" class="form-input md-item-name" value="${defaultName}" placeholder="Descripción del material..." style="padding: 4px 6px; font-size: 11px;" required>

        </td>

        <td style="padding: 4px 6px;">

            <input type="text" class="form-input md-item-unit" value="${defaultUnit}" placeholder="Pza, m, etc." style="padding: 4px 6px; font-size: 11px; text-align: center;">

        </td>

        <td style="padding: 4px 6px;">

            <input type="number" step="0.01" class="form-input md-item-qty" value="${defaultQty}" style="padding: 4px 6px; font-size: 11px; text-align: right; font-weight: 800;" required>

        </td>

        <td style="padding: 4px 6px; text-align: center;">

            <button type="button" onclick="this.closest('tr').remove()" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 13px;">&times;</button>

        </td>

    `;

    tbody.appendChild(tr);

}



function submitGenerateMaterialDeliveryGuide(event) {

    event.preventDefault();

    const projId = parseInt(document.getElementById("md_project_id").value);

    const dest = document.getElementById("md_destination").value.trim();

    const dispatcher = document.getElementById("md_dispatcher_name").value.trim();

    const receiver = document.getElementById("md_receiver_name").value.trim();

    const notes = document.getElementById("md_notes").value.trim();



    const items = [];

    document.querySelectorAll("#md_materials_tbody tr").forEach(row => {

        const name = row.querySelector(".md-item-name")?.value.trim();

        const unit = row.querySelector(".md-item-unit")?.value.trim() || "Pza";

        const qty = parseFloat(row.querySelector(".md-item-qty")?.value) || 0;

        if (name && qty > 0) {

            items.push({ name, unit, qty });

        }

    });



    if (items.length === 0) {

        alert("Por favor ingresa al menos un material con cantidad válida.");

        return;

    }



    const proj = allProjects.find(p => p.id === projId) || { code: "DAL-2026-001", name: "Proyecto en Obra", client_name: "General" };

    const guideNumber = `NE-MAT-${Date.now().toString().slice(-6)}`;

    const nowStr = new Date().toLocaleDateString('es-VE') + ' ' + new Date().toLocaleTimeString('es-VE', {hour: '2-digit', minute:'2-digit'});



    closeModal("modalMaterialDelivery");



    // MOSTRAR FORMATO OFICIAL FORMAL LISTO PARA IMPRIMIR O GUARDAR EN PDF

    const printArea = document.getElementById("modalPrintPreviewContent");

    const titleEl = document.getElementById("previewModalTitle");

    if (titleEl) titleEl.innerText = "Nota Oficial de Entrega de Materiales - Dalor C.A.";



    if (printArea) {

        printArea.innerHTML = `

        <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; padding: 25px; background: #fff;">

            <!-- Header Membretado Oficial DALOR -->

            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #002B49; padding-bottom: 12px; margin-bottom: 16px;">

                <div style="display: flex; align-items: center; gap: 12px;">
                    <img src="logo_dalor.jpg" alt="DALOR" style="height: 48px; display: block; border-radius: 4px;" onerror="this.style.display='none'">
                    <div>
                        <h2 style="margin: 0; color: #002B49; font-size: 20px; font-weight: 900; letter-spacing: 0.5px;">METALMECÁNICA DALOR, C.A.</h2>
                        <p style="margin: 2px 0 0 0; font-size: 11px; color: #0284c7; font-weight: 700;">RIF: <b>J-31601195-0</b> &bull; Mantenimiento Predictivo, Proyectos Industriales & Metalmecánica</p>
                        <p style="margin: 2px 0 0 0; font-size: 10px; color: #64748b;">Av. Cámara de las Industrias, Galpón 10, Z.I. El Tigre, Guacara, Edo. Carabobo</p>
                    </div>
                </div>

                <div style="text-align: right;">

                    <div style="background: #059669; color: #fff; padding: 6px 14px; border-radius: 6px; font-weight: 900; font-size: 13px; letter-spacing: 0.5px;">

                        NOTA DE ENTREGA DE MATERIALES

                    </div>

                    <div style="font-size: 13px; font-weight: 900; color: #002B49; margin-top: 5px;">

                        N°: ${guideNumber}

                    </div>

                    <div style="font-size: 11px; color: #64748b;">

                        Fecha: ${nowStr}

                    </div>

                </div>

            </div>



            <!-- Ficha de Destinatario y Entrega -->

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 11px;">

                <tr style="background: #f8fafc;">

                    <td style="padding: 6px 10px; border: 1px solid #cbd5e1; font-weight: 700; width: 20%; color: #475569;">Proyecto / Obra:</td>

                    <td style="padding: 6px 10px; border: 1px solid #cbd5e1; width: 30%; font-weight: 800; color: #059669;">[${proj.code}] ${proj.name}</td>

                    <td style="padding: 6px 10px; border: 1px solid #cbd5e1; font-weight: 700; width: 20%; color: #475569;">Lugar de Entrega:</td>

                    <td style="padding: 6px 10px; border: 1px solid #cbd5e1; width: 30%; font-weight: 700;">${dest}</td>

                </tr>

                <tr>

                    <td style="padding: 6px 10px; border: 1px solid #cbd5e1; font-weight: 700; color: #475569;">Despachado Por:</td>

                    <td style="padding: 6px 10px; border: 1px solid #cbd5e1; font-weight: 700;">${dispatcher}</td>

                    <td style="padding: 6px 10px; border: 1px solid #cbd5e1; font-weight: 700; color: #475569;">Receptor en Obra:</td>

                    <td style="padding: 6px 10px; border: 1px solid #cbd5e1; font-weight: 800; color: #002B49;">${receiver}</td>

                </tr>

            </table>



            <!-- Tabla de Materiales Despachados -->

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 11px;">

                <thead>

                    <tr style="background: #002B49; color: #ffffff;">

                        <th style="padding: 8px 10px; border: 1px solid #002B49; width: 40px; text-align: center;">Item</th>

                        <th style="padding: 8px 10px; border: 1px solid #002B49;">Descripción de Material / Insumo</th>

                        <th style="padding: 8px 10px; border: 1px solid #002B49; width: 100px; text-align: center;">Unidad</th>

                        <th style="padding: 8px 10px; border: 1px solid #002B49; width: 110px; text-align: right;">Cantidad Entregada</th>

                    </tr>

                </thead>

                <tbody>

                    ${items.map((it, i) => `

                        <tr style="background: ${i % 2 === 0 ? '#ffffff' : '#f8fafc'};">

                            <td style="padding: 6px 10px; border: 1px solid #cbd5e1; text-align: center; font-weight: 800;">${i + 1}</td>

                            <td style="padding: 6px 10px; border: 1px solid #cbd5e1; font-weight: 700;">${it.name}</td>

                            <td style="padding: 6px 10px; border: 1px solid #cbd5e1; text-align: center; color: #64748b;">${it.unit}</td>

                            <td style="padding: 6px 10px; border: 1px solid #cbd5e1; text-align: right; font-weight: 900; color: #059669; font-size: 12px;">${it.qty}</td>

                        </tr>

                    `).join('')}

                </tbody>

            </table>



            <!-- Observaciones -->

            <div style="background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 14px; margin-bottom: 24px; font-size: 11px;">

                <strong>Observaciones de Despacho:</strong> ${notes || 'Material verificado en almacén, embalado y entregado conforme para instalación inmediata en obra.'}

            </div>



            <!-- Bloque de Firmas -->

            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; text-align: center; margin-top: 36px; font-size: 11px;">

                <div style="border-top: 1px solid #475569; padding-top: 6px;">

                    <strong style="color: #002B49;">Despachado por:</strong><br>

                    <span style="color: #64748b; font-size: 10px;">${dispatcher}</span>

                </div>

                <div style="border-top: 1px solid #475569; padding-top: 6px;">

                    <strong style="color: #002B49;">Transportado por:</strong><br>

                    <span style="color: #64748b; font-size: 10px;">Chofer / Transportista</span>

                </div>

                <div style="border-top: 1px solid #475569; padding-top: 6px;">

                    <strong style="color: #002B49;">Recibido Conforme en Obra:</strong><br>

                    <span style="color: #64748b; font-size: 10px;">${receiver}</span>

                </div>

            </div>

        </div>

        `;

        openModal("modalPrintPreview");

    }

}





// --- BLOQUE L14457-L15642 ---
// ==============================================================================

// 📦 MÓDULO DE GUÍAS DE DESPACHO, TRASLADO & ENTREGA DE PRODUCTOS / EJES

// ==============================================================================

let allDispatchGuides = [];



function switchDispatchSubtab(subtabName) {

    const isList = (subtabName === 'list');

    const subtabList = document.getElementById('subtab-disp-list');

    const subtabForm = document.getElementById('subtab-disp-form');

    const btnList = document.getElementById('tabbtn-disp-list');

    const btnForm = document.getElementById('tabbtn-disp-form');



    if (subtabList) subtabList.classList.toggle('hidden', !isList);

    if (subtabForm) subtabForm.classList.toggle('hidden', isList);



    if (btnList) btnList.className = isList ? 'btn-primary' : 'btn-secondary';

    if (btnForm) btnForm.className = !isList ? 'btn-primary' : 'btn-secondary';



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



async function initDispatchForm() {

    // Asegurar clientes, proyectos y flota

    if (!allClients || allClients.length === 0) {

        try {

            const res = await fetch(`${API_BASE}/clients/`);

            if (res.ok) allClients = await res.json();

        } catch(e) {}

    }

    if (!allProjects || allProjects.length === 0) {

        try {

            const res = await fetch(`${API_BASE}/projects/`);

            if (res.ok) allProjects = await res.json();

        } catch(e) {}

    }

    if (!allAssets || allAssets.length === 0) {

        try {

            const res = await fetch(`${API_BASE}/assets/`);

            if (res.ok) allAssets = await res.json();

        } catch(e) {}

    }



    // Poblar selectores

    populateSelect("disp_client_id", allClients || [], c => `<option value="${c.id}">${c.name} (${c.rif || 'S/R'})</option>`);

    populateSelect("disp_project_id", [{id: '', code: 'Sin Obra / Servicio Directo de Taller'}, ...(allProjects || [])], p => `<option value="${p.id || ''}">${p.code ? '['+p.code+'] ' : ''}${p.name || ''}</option>`);

    

    // Poblar vehículos propios

    const vehicles = (allAssets || []).filter(a => a.asset_type === 'vehiculo' || a.category === 'Flota' || (a.code && a.code.startsWith('FLT-')));

    populateSelect("disp_select_asset", [{id: '', name: '-- Seleccionar Vehículo Flota --'}, ...vehicles], a => `<option value="${a.id}" data-driver="${a.assigned_to_name || ''}" data-plate="${a.plate_number || a.code}">${a.code} - ${a.name} (${a.plate_number || 'Sin Placa'})</option>`);



    // Reset modo a propio

    setDispatchTransportMode('propio_dalor');



    // Inicializar con al menos 1 ítem de carga

    const container = document.getElementById("dispatchItemsTableBody");

    if (container && container.children.length === 0) {

        addDispatchItemRow("Reparación y Rectificación de Ejes de Transmisión Ø 4\" x 2.20m", 2, "Ejes", "Reparado / 100% Operativo", 350);

    }

}



function setDispatchTransportMode(mode) {

    document.getElementById("disp_transport_type").value = mode;



    const btnP = document.getElementById("btn_mode_propio");

    const btnT = document.getElementById("btn_mode_tercerizado");

    const btnR = document.getElementById("btn_mode_retiro");



    if (btnP) btnP.className = (mode === 'propio_dalor') ? 'btn-primary' : 'btn-secondary';

    if (btnT) btnT.className = (mode === 'tercerizado_flete') ? 'btn-primary' : 'btn-secondary';

    if (btnR) btnR.className = (mode === 'retiro_cliente') ? 'btn-primary' : 'btn-secondary';



    const secP = document.getElementById("disp_sec_propio");

    const secT = document.getElementById("disp_sec_tercerizado");

    const secR = document.getElementById("disp_sec_retiro");



    if (secP) secP.classList.toggle("hidden", mode !== 'propio_dalor');

    if (secT) secT.classList.toggle("hidden", mode !== 'tercerizado_flete');

    if (secR) secR.classList.toggle("hidden", mode !== 'retiro_cliente');

}



function onDispatchClientChanged() {

    const cId = parseInt(document.getElementById("disp_client_id")?.value);

    const client = (allClients || []).find(c => c.id === cId);

    if (client) {

        if (client.address && document.getElementById("disp_destination_address")) {

            document.getElementById("disp_destination_address").value = client.address;

        }

        if (client.industry && document.getElementById("disp_destination_plant")) {

            document.getElementById("disp_destination_plant").value = `Planta ${client.name}`;

        }

    }

}



function onDispatchAssetChanged() {

    const sel = document.getElementById("disp_select_asset");

    if (!sel) return;

    const opt = sel.options[sel.selectedIndex];

    if (opt) {

        const driver = opt.getAttribute("data-driver") || "";

        const plate = opt.getAttribute("data-plate") || "";

        if (driver && document.getElementById("disp_driver_name_propio")) {

            document.getElementById("disp_driver_name_propio").value = driver;

        }

        if (plate && document.getElementById("disp_plate_propio")) {

            document.getElementById("disp_plate_propio").value = plate;

        }

        if (document.getElementById("disp_driver_id_propio") && !document.getElementById("disp_driver_id_propio").value) {

            document.getElementById("disp_driver_id_propio").value = "V-18.450.210";

        }

    }

}



function addDispatchItemRow(desc = "", qty = 1, unit = "Pzas", cond = "Reparado / Listo para Montaje", weight = 0) {

    const tbody = document.getElementById("dispatchItemsTableBody");

    if (!tbody) return;

    const rowIdx = tbody.children.length + 1;

    const tr = document.createElement("tr");

    tr.className = "dispatch-item-row";

    tr.style.borderBottom = "1px solid #f1f5f9";

    tr.innerHTML = `

        <td style="padding: 8px; text-align: center; font-weight: 800; color: var(--dalor-navy);">${rowIdx}</td>

        <td style="padding: 8px;">

            <input type="text" class="disp-it-desc form-input" required value="${desc}" placeholder="Ej: Ejes rectificados..." style="width: 100%; font-size: 12px; padding: 5px 8px;">

        </td>

        <td style="padding: 8px; text-align: center;">

            <input type="number" step="0.1" class="disp-it-qty form-input" required value="${qty}" min="0.1" style="width: 100%; font-size: 12px; padding: 5px; text-align: center;">

        </td>

        <td style="padding: 8px;">

            <select class="disp-it-unit form-select" style="width: 100%; font-size: 12px; padding: 5px;">

                <option value="Pzas" ${unit === 'Pzas' ? 'selected' : ''}>Pzas</option>

                <option value="Ejes" ${unit === 'Ejes' ? 'selected' : ''}>Ejes</option>

                <option value="Tramos" ${unit === 'Tramos' ? 'selected' : ''}>Tramos</option>

                <option value="Kg" ${unit === 'Kg' ? 'selected' : ''}>Kg</option>

                <option value="Tn" ${unit === 'Tn' ? 'selected' : ''}>Tn</option>

                <option value="Conjuntos" ${unit === 'Conjuntos' ? 'selected' : ''}>Conjuntos</option>

                <option value="Servicios" ${unit === 'Servicios' ? 'selected' : ''}>Servicios</option>

            </select>

        </td>

        <td style="padding: 8px;">

            <input type="text" class="disp-it-cond form-input" value="${cond}" placeholder="Condición" style="width: 100%; font-size: 12px; padding: 5px 8px;">

        </td>

        <td style="padding: 8px; text-align: right;">

            <input type="number" step="0.01" class="disp-it-weight form-input" value="${weight}" style="width: 100%; font-size: 12px; padding: 5px; text-align: right;">

        </td>

        <td style="padding: 8px; text-align: center;">

            <button type="button" onclick="removeDispatchItemRow(this)" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 14px;" title="Quitar ítem">

                <i class="fa-solid fa-trash-can"></i>

            </button>

        </td>

    `;

    tbody.appendChild(tr);

}



function removeDispatchItemRow(btn) {

    const tr = btn.closest("tr");

    if (tr) {

        tr.remove();

        // Renumerar

        const tbody = document.getElementById("dispatchItemsTableBody");

        if (tbody) {

            Array.from(tbody.children).forEach((row, i) => {

                const numTd = row.querySelector("td:first-child");

                if (numTd) numTd.innerText = i + 1;

            });

        }

    }

}



async function submitCreateDispatchGuide(event) {

    event.preventDefault();

    const mode = document.getElementById("disp_transport_type").value;

    const clientId = parseInt(document.getElementById("disp_client_id").value);

    const projIdVal = document.getElementById("disp_project_id").value;

    const projId = projIdVal ? parseInt(projIdVal) : null;

    const destAddr = document.getElementById("disp_destination_address").value.trim();

    const destPlant = document.getElementById("disp_destination_plant").value.trim();



    let driverName = "", driverDoc = "", plate = "", carrierComp = null, assetId = null;

    let freightCost = 0.0, freightCharged = 0.0;



    if (mode === 'propio_dalor') {

        const assetVal = document.getElementById("disp_select_asset").value;

        assetId = assetVal ? parseInt(assetVal) : null;

        driverName = document.getElementById("disp_driver_name_propio").value.trim();

        driverDoc = document.getElementById("disp_driver_id_propio").value.trim();

        plate = document.getElementById("disp_plate_propio").value.trim();

        if (!driverName || !driverDoc || !plate) {

            alert("Por favor completa los datos del chofer y vehículo propio de DALOR.");

            return;

        }

    } else if (mode === 'tercerizado_flete') {

        carrierComp = document.getElementById("disp_carrier_company").value.trim();

        driverName = document.getElementById("disp_driver_name_ext").value.trim();

        driverDoc = document.getElementById("disp_driver_id_ext").value.trim();

        plate = document.getElementById("disp_plate_ext").value.trim();

        freightCost = parseFloat(document.getElementById("disp_freight_cost_usd").value) || 0.0;

        freightCharged = parseFloat(document.getElementById("disp_freight_price_charged_usd").value) || 0.0;

        if (!carrierComp || !driverName || !driverDoc || !plate) {

            alert("Por favor completa los datos de la empresa de transporte y chofer tercerizado.");

            return;

        }

    } else {

        driverName = document.getElementById("disp_driver_name_ret").value.trim();

        driverDoc = document.getElementById("disp_driver_id_ret").value.trim();

        plate = document.getElementById("disp_plate_ret").value.trim() || "RETIRO-PLANTA";

        if (!driverName || !driverDoc) {

            alert("Por favor indica la persona autorizada y su cédula.");

            return;

        }

    }



    // Recoger ítems

    const itemRows = document.querySelectorAll("#dispatchItemsTableBody .dispatch-item-row");

    if (itemRows.length === 0) {

        alert("Debes agregar al menos un ítem de carga para despachar.");

        return;

    }



    const items = [];

    itemRows.forEach((row, idx) => {

        items.push({

            description: row.querySelector(".disp-it-desc").value.trim(),

            quantity: parseFloat(row.querySelector(".disp-it-qty").value) || 1.0,

            unit: row.querySelector(".disp-it-unit").value,

            condition_status: row.querySelector(".disp-it-cond").value.trim() || "Reparado / Conforme",

            approx_weight_kg: parseFloat(row.querySelector(".disp-it-weight").value) || 0.0

        });

    });



    const payload = {

        client_id: clientId,

        project_id: projId,

        destination_address: destAddr,

        destination_plant: destPlant,

        transport_type: mode,

        asset_id: assetId,

        carrier_company: carrierComp,

        driver_name: driverName,

        driver_id_doc: driverDoc,

        vehicle_plate: plate,

        freight_cost_usd: freightCost,

        freight_price_charged_usd: freightCharged,

        dispatcher_name: document.getElementById("disp_dispatcher_name").value.trim(),

        quality_inspector: document.getElementById("disp_quality_inspector").value.trim(),

        notes: document.getElementById("disp_notes").value.trim(),

        items: items

    };



    try {

        const res = await fetch(`${API_BASE}/dispatch/`, {

            method: "POST",

            headers: { "Content-Type": "application/json" },

            body: JSON.stringify(payload)

        });

        if (!res.ok) {

            const err = await res.json();

            throw new Error(err.detail || "Error al emitir guía de despacho");

        }

        const data = await res.json();



        if (typeof showToastNotification === 'function') {

            showToastNotification(`✅ Guía de Despacho [${data.guide_number}] emitida con éxito.`, 'success');

        } else {

            alert(`✅ Guía de Despacho [${data.guide_number}] emitida exitosamente.`);

        }



        switchDispatchSubtab('list');

        await loadDispatchGuidesList();

        

        // Preguntar si desea imprimir la guía de inmediato

        if (data.id && confirm(`¿Deseas visualizar e imprimir la Guía Oficial [${data.guide_number}] en este momento?`)) {

            printOfficialDispatchGuide(data.id);

        }

    } catch(err) {

        alert("Error al guardar guía de despacho: " + err.message);

    }

}



async function loadDispatchGuidesList() {

    const tbody = document.getElementById("dispatchTableBody");

    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 20px; color: #94a3b8;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando despachos...</td></tr>`;



    try {

        const res = await fetch(`${API_BASE}/dispatch/`);

        if (!res.ok) throw new Error("Error en servidor");

        allDispatchGuides = await res.json();



        const badge = document.getElementById("dispatch_count_badge");

        if (badge) badge.innerText = `${allDispatchGuides.length} despacho(s) registrado(s)`;



        if (allDispatchGuides.length === 0) {

            tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 20px; color: #94a3b8;">No hay guías de despacho emitidas. Pulsa "➕ Emitir Despacho" para registrar la primera.</td></tr>`;

            return;

        }



        tbody.innerHTML = allDispatchGuides.map(g => {

            let statusBadge = `<span style="background: #e0f2fe; color: #0369a1; padding: 3px 8px; border-radius: 9999px; font-weight: 700; font-size: 11px;"><i class="fa-solid fa-truck"></i> En Tránsito</span>`;

            if (g.status === 'entregado_conforme') {

                statusBadge = `<span style="background: #dcfce7; color: #166534; padding: 3px 8px; border-radius: 9999px; font-weight: 700; font-size: 11px;"><i class="fa-solid fa-check-double"></i> Entregado Conforme</span>`;

            }



            let modeLabel = `<span style="color: #0369a1; font-weight: 700;">Propio DALOR</span>`;

            if (g.transport_type === 'tercerizado_flete') modeLabel = `<span style="color: #d97706; font-weight: 700;">Flete Tercerizado</span>`;

            if (g.transport_type === 'retiro_cliente') modeLabel = `<span style="color: #64748b; font-weight: 700;">Retiro en Planta</span>`;



            return `

            <tr style="border-bottom: 1px solid #f1f5f9;">

                <td style="padding: 10px; font-weight: 800; color: var(--dalor-navy);">${g.guide_number}</td>

                <td style="padding: 10px; color: #475569;">${g.dispatch_date || '-'}</td>

                <td style="padding: 10px;">

                    <b style="color: var(--dalor-navy);">${g.client_name}</b>

                    <small style="display: block; color: #64748b;">${g.destination_plant ? g.destination_plant + ' - ' : ''}${g.destination_address}</small>

                </td>

                <td style="padding: 10px;">

                    <span style="font-weight: 700; color: var(--dalor-blue);">${g.project_code}</span>

                    <small style="display: block; color: #64748b;">${g.project_name}</small>

                </td>

                <td style="padding: 10px;">

                    <div>${modeLabel} &bull; <b>${g.vehicle_plate}</b></div>

                    <small style="color: #64748b;">Chofer: ${g.driver_name} (${g.driver_id_doc})</small>

                </td>

                <td style="padding: 10px; text-align: center;">

                    <span style="background: #f1f5f9; padding: 2px 8px; border-radius: 6px; font-weight: 800; color: #334155;">

                        ${g.items_count} ítem(s)

                    </span>

                </td>

                <td style="padding: 10px; text-align: right; font-weight: 700; color: ${g.freight_cost_usd > 0 ? '#dc2626' : '#64748b'};">

                    ${g.freight_cost_usd > 0 ? '$' + g.freight_cost_usd.toFixed(2) : '$0.00'}

                </td>

                <td style="padding: 10px; text-align: center;">${statusBadge}</td>

                <td style="padding: 10px; text-align: center;">

                    <div style="display: flex; gap: 4px; justify-content: center;">

                        <button type="button" onclick="printOfficialDispatchGuide(${g.id})" class="btn-secondary" style="padding: 4px 8px; font-size: 11px;" title="Imprimir Guía de Despacho">

                            <i class="fa-solid fa-print"></i>

                        </button>

                        ${g.status !== 'entregado_conforme' ? `

                        <button type="button" onclick="openConfirmDeliveryModal(${g.id}, '${g.guide_number}')" class="btn-primary" style="padding: 4px 8px; font-size: 11px; background: #059669;" title="Confirmar Recepción Cliente">

                            <i class="fa-solid fa-check"></i>

                        </button>` : ''}

                        <button type="button" onclick="deleteDispatchGuide(${g.id}, '${g.guide_number}')" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 13px; padding: 4px;" title="Eliminar Guía">

                            <i class="fa-solid fa-trash-can"></i>

                        </button>

                    </div>

                </td>

            </tr>

            `;

        }).join('');

    } catch(e) {

        tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: #ef4444; padding: 16px;">Error al cargar despachos: ${e.message}</td></tr>`;

    }

}



function filterDispatchList(query) {

    if (!allDispatchGuides || allDispatchGuides.length === 0) return;

    const q = (query || '').toLowerCase().trim();

    const tbody = document.getElementById("dispatchTableBody");

    if (!tbody) return;



    const rows = tbody.querySelectorAll("tr");

    let visible = 0;

    rows.forEach(r => {

        const text = (r.innerText || '').toLowerCase();

        if (!q || text.includes(q)) {

            r.style.display = "";

            visible++;

        } else {

            r.style.display = "none";

        }

    });



    const badge = document.getElementById("dispatch_count_badge");

    if (badge) badge.innerText = q ? `${visible} de ${allDispatchGuides.length} despacho(s)` : `${allDispatchGuides.length} despacho(s) registrado(s)`;

}



function openConfirmDeliveryModal(guideId, guideNum) {

    document.getElementById("conf_disp_id").value = guideId;

    document.getElementById("conf_disp_guide_text").innerText = `Confirmando recepción formal para Guía de Despacho [${guideNum}]:`;

    document.getElementById("confirmDeliveryForm").reset();

    openModal("modalConfirmDelivery");

}



async function submitConfirmDelivery(e) {

    e.preventDefault();

    const guideId = document.getElementById("conf_disp_id").value;

    const recBy = document.getElementById("conf_received_by").value.trim();

    const recDoc = document.getElementById("conf_received_id_doc").value.trim();

    const notes = document.getElementById("conf_notes").value.trim();



    try {

        const res = await fetch(`${API_BASE}/dispatch/${guideId}/confirm-delivery`, {

            method: "PUT",

            headers: { "Content-Type": "application/json" },

            body: JSON.stringify({

                received_by_client_name: recBy,

                received_by_client_id_doc: recDoc,

                notes: notes

            })

        });

        if (!res.ok) throw new Error("Error al confirmar entrega");

        closeModal("modalConfirmDelivery");

        await loadDispatchGuidesList();

        if (typeof showToastNotification === 'function') {

            showToastNotification(`✅ Guía confirmada como Entregada Conforme por ${recBy}.`, 'success');

        } else {

            alert(`✅ Guía confirmada como Entregada Conforme por ${recBy}.`);

        }

    } catch(err) {

        alert("Error: " + err.message);

    }

}



async function deleteDispatchGuide(guideId, guideNum) {

    if (!confirm(`¿Estás seguro de anular / eliminar la Guía de Despacho [${guideNum}]?`)) return;

    try {

        const res = await fetch(`${API_BASE}/dispatch/${guideId}`, { method: "DELETE" });

        if (!res.ok) throw new Error("Error al anular guía");

        await loadDispatchGuidesList();

        if (typeof showToastNotification === 'function') {

            showToastNotification(`🗑️ Guía [${guideNum}] eliminada con éxito.`, 'success');

        }

    } catch(e) {

        alert("Error: " + e.message);

    }

}



async function printOfficialDispatchGuide(guideId) {

    try {

        const res = await fetch(`${API_BASE}/dispatch/${guideId}`);

        if (!res.ok) throw new Error("No se pudo cargar la información del despacho.");

        const g = await res.json();



        let modeBadge = "Transporte Propio (Flota DALOR)";

        let modeTransportTitle = "TRANSPORTE PROPIO DALOR";

        let transportLabel = "TRANSPORTADO POR";

        if (g.transport_type === 'tercerizado_flete') {

            modeBadge = `Flete Tercerizado (${g.carrier_company || 'Línea de Transporte'})`;

            modeTransportTitle = `FLETE TERCERIZADO: ${g.carrier_company || 'Línea Externa'}`;

            transportLabel = "TRANSPORTISTA CONTRATADO";

        } else if (g.transport_type === 'retiro_cliente') {

            modeBadge = "Retiro en Taller por Cuenta del Cliente";

            modeTransportTitle = "RETIRO EN PLANTA / TALLER DALOR POR EL CLIENTE";

            transportLabel = "RETIRADO / TRANSPORTADO POR CLIENTE";

        }



        const printHtml = `

        <div style="font-family: Arial, sans-serif; color: #1e293b; max-width: 820px; margin: auto; padding: 22px; border: 1px solid #cbd5e1; background: #fff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">

            <!-- Membrete Oficial DALOR con Logo -->

            <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #F5B800; padding-bottom: 12px; margin-bottom: 14px;">

                <div style="display: flex; align-items: center; gap: 14px;">

                    <img src="logo_dalor.jpg" alt="DALOR" style="height: 52px; max-width: 140px; object-fit: contain; display: block; border-radius: 4px;" onerror="this.style.display='none'">

                    <div>

                        <h1 style="font-size: 18px; font-weight: 900; color: #002B49; margin: 0; letter-spacing: 0.3px; text-transform: uppercase;">Metalmecánica Dalor, C.A.</h1>

                        <p style="font-size: 11px; font-weight: 700; color: #0284c7; margin: 2px 0 0 0;">RIF: <b>J-31601195-0</b> &bull; Mantenimiento Predictivo, Proyectos Industriales & Metalmecánica</p>

                        <p style="font-size: 10px; color: #64748b; margin: 2px 0 0 0;">Av. Cámara de las Industrias, Galpón 10, Z.I. El Tigre, Guacara, Edo. Carabobo &bull; Telf: +58 0412-2407079 / 0424-4131782</p>

                    </div>

                </div>

                <div style="text-align: right; border: 2px solid #002B49; padding: 8px 14px; border-radius: 6px; background: #f8fafc; min-width: 210px;">

                    <div style="font-size: 11px; font-weight: 900; color: #002B49; text-transform: uppercase; letter-spacing: 0.5px;">GUÍA DE TRASLADO Y NOTA DE ENTREGA</div>

                    <div style="font-size: 17px; font-weight: 900; color: #dc2626; margin-top: 3px;">N° ${g.guide_number}</div>

                    <div style="font-size: 10px; color: #475569; margin-top: 2px;">Fecha: <b>${g.dispatch_date || new Date().toLocaleString('es-VE')}</b></div>

                </div>

            </div>



            <!-- Cintillo de Modalidad de Traslado -->

            <div style="background: #002B49; color: #F5B800; padding: 6px 12px; border-radius: 5px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">

                <span><i class="fa-solid fa-truck-moving"></i> Modalidad de Traslado: ${modeTransportTitle}</span>

                <span style="background: rgba(255,255,255,0.15); color: #fff; padding: 2px 8px; border-radius: 4px; font-size: 10px;">Estado: ${g.status === 'entregado_conforme' ? 'ENTREGADO CONFORME' : 'EN TRÁNSITO / DESPACHADO'}</span>

            </div>



            <!-- Ficha de Datos: Cliente, Destino y Transporte -->

            <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 12px; margin-bottom: 14px; font-size: 11px; background: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid #cbd5e1;">

                <div>

                    <div style="font-weight: 900; color: #002B49; font-size: 11.5px; margin-bottom: 4px; border-bottom: 1px solid #e2e8f0; padding-bottom: 2px; text-transform: uppercase;">

                        DATOS DEL CLIENTE / DESTINATARIO:

                    </div>

                    <div style="margin-top: 3px;"><b>Razón Social:</b> ${g.client_name}</div>

                    <div style="margin-top: 2px;"><b>RIF:</b> ${g.client_rif || '-'}</div>

                    <div style="margin-top: 2px;"><b>Destino / Planta:</b> ${g.destination_plant ? g.destination_plant + ' - ' : ''}${g.destination_address || 'Retiro directo en Taller Guacara'}</div>

                    <div style="margin-top: 2px;"><b>Proyecto / Obra:</b> <span style="color: #0284c7; font-weight: 800;">[${g.project_code}]</span> ${g.project_name}</div>

                </div>

                <div>

                    <div style="font-weight: 900; color: #002B49; font-size: 11.5px; margin-bottom: 4px; border-bottom: 1px solid #e2e8f0; padding-bottom: 2px; text-transform: uppercase;">

                        DATOS DE TRANSPORTE & LOGÍSTICA:

                    </div>

                    <div style="margin-top: 3px;"><b>Modalidad:</b> ${modeBadge}</div>

                    <div style="margin-top: 2px;"><b>Vehículo / Modelo:</b> ${g.vehicle_model || (g.transport_type === 'retiro_cliente' ? 'Vehículo del Cliente' : 'Unidad DALOR')}</div>

                    <div style="margin-top: 2px;"><b>Placa:</b> <b style="color: #002B49; font-size: 12px;">${g.vehicle_plate || 'S/P'}</b></div>

                    <div style="margin-top: 2px;"><b>Responsable / Chofer:</b> ${g.driver_name} (C.I. ${g.driver_id_doc})</div>

                    ${g.driver_phone ? `<div style="margin-top: 2px;"><b>Teléfono Chofer:</b> ${g.driver_phone}</div>` : ''}

                </div>

            </div>



            <!-- Tabla de Piezas / Trabajos / Equipos Despachados -->

            <div style="margin-bottom: 14px;">

                <div style="font-weight: 900; color: #002B49; font-size: 11.5px; margin-bottom: 6px; text-transform: uppercase; display: flex; justify-content: space-between;">

                    <span>Detalle de Piezas, Estructuras & Materiales Trasladados:</span>

                    <span style="color: #64748b; font-size: 10px; font-weight: normal;">Total: ${g.items ? g.items.length : 0} Ítem(s)</span>

                </div>

                <table style="width: 100%; border-collapse: collapse; font-size: 11px; border: 1px solid #cbd5e1;">

                    <thead style="background: #002B49; color: #ffffff;">

                        <tr>

                            <th style="padding: 7px 8px; width: 30px; text-align: center;">#</th>

                            <th style="padding: 7px 8px; text-align: left;">Descripción de la Pieza / Trabajo Mecánico / Material</th>

                            <th style="padding: 7px 8px; width: 55px; text-align: center;">Cant.</th>

                            <th style="padding: 7px 8px; width: 60px; text-align: center;">Unidad</th>

                            <th style="padding: 7px 8px; width: 150px; text-align: left;">Condición / Estado Técnico</th>

                            <th style="padding: 7px 8px; width: 75px; text-align: right;">Peso Aprox</th>

                        </tr>

                    </thead>

                    <tbody>

                        ${g.items && g.items.length > 0 ? g.items.map((it, idx) => `

                        <tr style="border-bottom: 1px solid #e2e8f0; background: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">

                            <td style="padding: 6px 8px; text-align: center; font-weight: 700; color: #002B49;">${idx + 1}</td>

                            <td style="padding: 6px 8px; font-weight: 600; color: #1e293b;">${it.description}</td>

                            <td style="padding: 6px 8px; text-align: center; font-weight: 800; color: #002B49;">${it.quantity}</td>

                            <td style="padding: 6px 8px; text-align: center;">${it.unit}</td>

                            <td style="padding: 6px 8px; color: #059669; font-weight: 600;">${it.condition_status || 'Conforme'}</td>

                            <td style="padding: 6px 8px; text-align: right; color: #475569;">${it.approx_weight_kg > 0 ? it.approx_weight_kg + ' Kg' : '-'}</td>

                        </tr>

                        `).join('') : `<tr><td colspan="6" style="padding: 12px; text-align: center; color: #94a3b8;">Sin ítems registrados</td></tr>`}

                    </tbody>

                </table>

            </div>



            ${g.notes ? `

            <div style="font-size: 10px; color: #475569; margin-bottom: 14px; background: #fffbeb; border: 1px solid #fef3c7; padding: 6px 10px; border-radius: 4px;">

                <b>Observaciones / Precintos / Notas Especiales:</b> ${g.notes}

            </div>` : ''}



            <!-- Cuadro de 3 Firmas Legales y Recepción -->

            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-top: 26px; font-size: 10px; text-align: center;">

                <div style="border-top: 1.5px solid #002B49; padding-top: 6px;">

                    <div style="font-weight: 900; color: #002B49;">ENTREGADO / DESPACHADO POR DALOR</div>

                    <div style="color: #334155; margin-top: 2px; font-weight: 700;">${g.dispatcher_name || 'Despacho Taller Guacara'}</div>

                    <div style="color: #64748b; font-size: 9px;">QA/QC: ${g.quality_inspector || 'Control de Calidad Conforme'}</div>

                </div>

                <div style="border-top: 1.5px solid #002B49; padding-top: 6px;">

                    <div style="font-weight: 900; color: #002B49;">${transportLabel}</div>

                    <div style="color: #334155; margin-top: 2px; font-weight: 700;">${g.driver_name}</div>

                    <div style="color: #64748b; font-size: 9px;">C.I. ${g.driver_id_doc} &bull; Placa: ${g.vehicle_plate || 'S/P'}</div>

                </div>

                <div style="border-top: 1.5px solid #002B49; padding-top: 6px;">

                    <div style="font-weight: 900; color: #002B49;">RECIBIDO CONFORME CLIENTE</div>

                    <div style="color: #334155; margin-top: 2px; font-weight: 700;">${g.received_by_client_name || 'Firma / Sello de Recepción'}</div>

                    <div style="color: #64748b; font-size: 9px;">${g.received_by_client_id_doc ? 'C.I. ' + g.received_by_client_id_doc : 'Nombre, C.I., Firma y Sello'}</div>

                </div>

            </div>



            <!-- Coletilla Legal de Movilización SENIAT / Tránsito -->

            <div style="margin-top: 18px; border-top: 1px dashed #cbd5e1; padding-top: 6px; font-size: 9px; color: #64748b; text-align: justify; line-height: 1.3;">

                <b>VALIDEZ LEGAL:</b> Esta <b>Guía de Traslado y Nota de Entrega</b> ampara el despacho, movilización y entrega formal de las piezas, maquinarias y materiales aquí descritos, en estricto cumplimiento con la normativa legal, comercial y tributaria venezolana vigente. La mercancía viaja y se entrega por cuenta y riesgo del receptor o comitente una vez firmada la presente constancia.

            </div>

        </div>

        `;



        const win = window.open('', '_blank');

        win.document.write(`

            <html>

                <head>

                    <title>Guía de Traslado y Entrega N° ${g.guide_number} - Metalmecánica DALOR, C.A.</title>

                    <style>

                        body { margin: 0; padding: 20px; background: #f1f5f9; }

                        @media print {

                            body { background: #fff; padding: 0; }

                            @page { margin: 10mm; }

                        }

                    </style>

                </head>

                <body>

                    ${printHtml}

                    <script>

                        window.onload = function() { window.print(); }

                    </script>

                </body>

            </html>

        `);

        win.document.close();

    } catch(err) {

        alert("Error al preparar impresión de guía: " + err.message);

    }

}








// --- PUENTE DE COMPATIBILIDAD CON WINDOW & HTML INLINE ---
if (typeof window !== 'undefined') {
    window.addDispatchItemRow = addDispatchItemRow;
    window.addMaterialDeliveryRow = addMaterialDeliveryRow;
    window.calcMaterialConsumeTotal = calcMaterialConsumeTotal;
    window.calcMaterialEntryTotal = calcMaterialEntryTotal;
    window.deleteDispatchGuide = deleteDispatchGuide;
    window.filterDispatchList = filterDispatchList;
    window.filterMaterialsTable = filterMaterialsTable;
    window.filterTransferToolsChecklist = filterTransferToolsChecklist;
    window.initDispatchForm = initDispatchForm;
    window.initDispatchView = initDispatchView;
    window.loadDispatchGuidesList = loadDispatchGuidesList;
    window.loadMaterialsList = loadMaterialsList;
    window.onConsumeMaterialSelected = onConsumeMaterialSelected;
    window.onDispatchAssetChanged = onDispatchAssetChanged;
    window.onDispatchClientChanged = onDispatchClientChanged;
    window.onMaterialDeliveryProjectChanged = onMaterialDeliveryProjectChanged;
    window.onTransferGuideProjectChanged = onTransferGuideProjectChanged;
    window.openConfirmDeliveryModal = openConfirmDeliveryModal;
    window.openMaterialConsumeModal = openMaterialConsumeModal;
    window.openMaterialDeliveryModal = openMaterialDeliveryModal;
    window.openMaterialEntryModal = openMaterialEntryModal;
    window.openNewMaterialModal = openNewMaterialModal;
    window.openTransferGuideModal = openTransferGuideModal;
    window.printOfficialDispatchGuide = printOfficialDispatchGuide;
    window.removeDispatchItemRow = removeDispatchItemRow;
    window.renderInitialMaterialDeliveryRows = renderInitialMaterialDeliveryRows;
    window.renderMaterialsTable = renderMaterialsTable;
    window.renderTransferToolsChecklist = renderTransferToolsChecklist;
    window.setDispatchTransportMode = setDispatchTransportMode;
    window.submitConfirmDelivery = submitConfirmDelivery;
    window.submitCreateDispatchGuide = submitCreateDispatchGuide;
    window.submitCreateMaterial = submitCreateMaterial;
    window.submitGenerateMaterialDeliveryGuide = submitGenerateMaterialDeliveryGuide;
    window.submitGenerateTransferGuide = submitGenerateTransferGuide;
    window.submitMaterialConsume = submitMaterialConsume;
    window.submitMaterialEntry = submitMaterialEntry;
    window.switchDispatchSubtab = switchDispatchSubtab;
}

export { addDispatchItemRow, addMaterialDeliveryRow, calcMaterialConsumeTotal, calcMaterialEntryTotal, deleteDispatchGuide, filterDispatchList, filterMaterialsTable, filterTransferToolsChecklist, initDispatchForm, initDispatchView, loadDispatchGuidesList, loadMaterialsList, onConsumeMaterialSelected, onDispatchAssetChanged, onDispatchClientChanged, onMaterialDeliveryProjectChanged, onTransferGuideProjectChanged, openConfirmDeliveryModal, openMaterialConsumeModal, openMaterialDeliveryModal, openMaterialEntryModal, openNewMaterialModal, openTransferGuideModal, printOfficialDispatchGuide, removeDispatchItemRow, renderInitialMaterialDeliveryRows, renderMaterialsTable, renderTransferToolsChecklist, setDispatchTransportMode, submitConfirmDelivery, submitCreateDispatchGuide, submitCreateMaterial, submitGenerateMaterialDeliveryGuide, submitGenerateTransferGuide, submitMaterialConsume, submitMaterialEntry, switchDispatchSubtab };
