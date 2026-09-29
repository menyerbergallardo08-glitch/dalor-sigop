/**
 * DALOR SIGO-P | Módulo: MATERIALS.JS
 * Extraído y desacoplado del monolito de producción (v94)
 */

var API_BASE = window.API_BASE || (window.location.origin + "/api/v1");
var allClients = window.allClients = window.allClients || [];
var allServices = window.allServices = window.allServices || [];
var allProjects = window.allProjects = window.allProjects || [];
var allCategories = window.allCategories = window.allCategories || [];
var allAssets = window.allAssets = window.allAssets || [];
var allPersonnel = window.allPersonnel = window.allPersonnel || [];
var allMaterials = window.allMaterials = window.allMaterials || [];
var selectedPersonnelIds = window.selectedPersonnelIds = window.selectedPersonnelIds || [];
var selectedVehicleIds = window.selectedVehicleIds = window.selectedVehicleIds || [];
var selectedToolIds = window.selectedToolIds = window.selectedToolIds || [];
var selectedMaterialIds = window.selectedMaterialIds = window.selectedMaterialIds || [];
var EXCHANGE_RATE = window.EXCHANGE_RATE = window.EXCHANGE_RATE || 850.0;
var BCV_DATA = window.BCV_DATA = window.BCV_DATA || { rate: 850.0, source: 'BCV Oficial' };
var currentUser = window.currentUser || null;
var authToken = window.authToken = window.authToken || localStorage.getItem('dalor_token') || null;

/** authFetch — inyecta token de autorización en cada request usando window.fetch nativo */
function authFetch(url, options = {}) {
    const t = sessionStorage.getItem('dalor_token') || localStorage.getItem('dalor_token') || window.authToken || '';
    const h = { ...(options.headers || {}) };
    if (t) h['Authorization'] = 'Bearer ' + t;
    if (options.body && !h['Content-Type']) h['Content-Type'] = 'application/json';
    return window.fetch(url, { ...options, headers: h });
}


// --- BLOQUE L11092-L11629 ---
// ==============================================================================

// 📦 5. MÓDULO DE INVENTARIO DE MATERIALES Y CONSUMIBLES (DALOR SIGO-P)

// ==============================================================================



function isDirectorRole() {
    const user = window.currentUser || JSON.parse(localStorage.getItem('dalor_user') || 'null') || {};
    const role = (user.role_name || user.role || user.username || '').toLowerCase();
    return role.includes('director') || role.includes('admin');
}

async function loadMaterialsList() {
    const tbody = document.getElementById("materialsTableBody");
    if (!tbody) return;

    const isDirector = isDirectorRole();
    const colSpan = isDirector ? 9 : 7;
    tbody.innerHTML = `<tr><td colspan="${colSpan}" style="text-align: center; padding: 20px; color: #94a3b8;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando inventario de materiales...</td></tr>`;

    try {
        const res = await authFetch(`${API_BASE}/materials/`);
        const data = await res.json();
        allMaterials = data.materials || (Array.isArray(data) ? data : []);

        const totalItemsEl = document.getElementById("matTotalItemsCount");
        const totalValCard = document.getElementById("matTotalValuationCard");
        const totalValEl = document.getElementById("matTotalValuationUsd");

        if (totalItemsEl) totalItemsEl.innerText = data.total_items !== undefined ? data.total_items : allMaterials.length;

        // El valor total monetario solo es visible para el Director
        if (totalValCard) {
            totalValCard.style.display = isDirector ? 'inline-block' : 'none';
        }
        if (totalValEl && isDirector) {
            const val = data.total_inventory_usd !== undefined ? data.total_inventory_usd : allMaterials.reduce((acc, m) => acc + (m.stock_quantity * m.unit_cost_usd || 0), 0);
            totalValEl.innerText = `$${val.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD`;
        }

        // Toggle visibility of thead cost columns
        document.querySelectorAll(".director-cost-col").forEach(el => {
            el.style.display = isDirector ? '' : 'none';
        });

        renderMaterialsTable(allMaterials);
        try {
            if (typeof populateSelectDropdowns === 'function') populateSelectDropdowns();
        } catch (errPop) {
            console.warn("Dropdown populator warning:", errPop);
        }
    } catch (e) {
        console.error("Error loading materials:", e);
        tbody.innerHTML = `<tr><td colspan="${colSpan}" style="text-align: center; color: #e11d48; padding: 20px;">Error al cargar inventario de materiales: ${e.message}</td></tr>`;
    }
}

let currentFilteredMaterials = [];
let materialsCurrentPage = 1;
let materialsPageSize = 15;

function goToMaterialsPage(page) {
    materialsCurrentPage = page;
    renderMaterialsTablePaginated();
    const c = document.getElementById("materialsTableBody");
    if (c) c.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function changeMaterialsPageSize(size) {
    materialsPageSize = parseInt(size) || 15;
    materialsCurrentPage = 1;
    renderMaterialsTablePaginated();
}

function renderMaterialsTable(materials) {
    currentFilteredMaterials = Array.isArray(materials) ? materials : (allMaterials || []);
    materialsCurrentPage = 1;
    renderMaterialsTablePaginated();
}

function renderMaterialsTablePaginated() {
    const tbody = document.getElementById("materialsTableBody");
    if (!tbody) return;

    const isDirector = isDirectorRole();
    const colSpan = isDirector ? 9 : 7;
    const list = currentFilteredMaterials || [];

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${colSpan}" style="text-align: center; padding: 20px; color: #94a3b8;">No se encontraron materiales registrados.</td></tr>`;
        const pCont = document.getElementById("materialsPaginationContainer");
        if (pCont) pCont.innerHTML = '';
        return;
    }

    const { startIndex, endIndex, currentPage } = (typeof window.renderPaginationControls === 'function' ? window.renderPaginationControls : renderPaginationControls)({
        containerId: "materialsPaginationContainer",
        totalItems: list.length,
        currentPage: materialsCurrentPage,
        pageSize: materialsPageSize,
        onPageChange: "goToMaterialsPage",
        onPageSizeChange: "changeMaterialsPageSize",
        itemLabel: "material(es) en catálogo",
        pageSizeOptions: [15, 30, 60, 120]
    });
    materialsCurrentPage = currentPage;

    const pageItems = list.slice(startIndex, endIndex);
    tbody.innerHTML = pageItems.map(m => {
        const isLow = m.is_low_stock || m.stock_quantity <= m.min_stock_alert;
        const unitCost = Number(m.unit_cost_usd || 0);
        const totalCost = Number(m.total_cost_usd || (m.stock_quantity * unitCost) || 0);

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
            ${isDirector ? `
                <td style="text-align: right; font-weight: 700; color: #0284c7;">$${unitCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td style="text-align: right; font-weight: 900; color: var(--dalor-navy);">$${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
            ` : ''}
            <td style="text-align: center; white-space: nowrap;">
                <button onclick="openMaterialEntryModal(${m.id})" class="btn-primary" style="padding: 3px 8px; font-size: 11px; background: #059669;" title="Registrar Entrada / Compra">
                    <i class="fa-solid fa-plus"></i> Entrada
                </button>
                <button onclick="openMaterialConsumeModal(${m.id})" class="btn-primary" style="padding: 3px 8px; font-size: 11px; background: #0284c7; margin-left: 4px;" title="Despachar a Obra o Taller">
                    <i class="fa-solid fa-arrow-right-from-bracket"></i> Despachar
                </button>
            </td>
        </tr>`;
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

function onNewMaterialCategoryChanged() {
    const sel = document.getElementById("nmat_category");
    const customInp = document.getElementById("nmat_category_custom");
    if (!sel || !customInp) return;
    if (sel.value === "__NEW__") {
        customInp.classList.remove("hidden");
        customInp.required = true;
        customInp.focus();
    } else {
        customInp.classList.add("hidden");
        customInp.required = false;
        customInp.value = "";
    }
}

function openNewMaterialModal() {
    document.getElementById("newMaterialForm").reset();
    const customInp = document.getElementById("nmat_category_custom");
    if (customInp) {
        customInp.classList.add("hidden");
        customInp.required = false;
        customInp.value = "";
    }
    openModal("modalNewMaterial");
}

async function submitCreateMaterial(event) {
    event.preventDefault();

    let categoryVal = document.getElementById("nmat_category").value;
    if (categoryVal === "__NEW__") {
        categoryVal = (document.getElementById("nmat_category_custom")?.value || "").trim();
        if (!categoryVal) {
            alert("⚠️ Por favor ingresa el nombre de la nueva categoría.");
            document.getElementById("nmat_category_custom")?.focus();
            return;
        }
    }

    const payload = {
        code: document.getElementById("nmat_code").value.trim(),
        name: document.getElementById("nmat_name").value.trim(),
        category: categoryVal,
        unit_measure: document.getElementById("nmat_unit").value,
        stock_quantity: parseFloat(document.getElementById("nmat_stock").value) || 0.0,
        min_stock_alert: parseFloat(document.getElementById("nmat_alert").value) || 5.0,
        unit_cost_usd: parseFloat(document.getElementById("nmat_cost").value) || 0.0,
        location: document.getElementById("nmat_location").value.trim() || "Almacén Central Dalor"
    };



    try {

        const res = await authFetch(`${API_BASE}/materials/`, {

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



function toggleMaterialEntryPaymentBox() {
    const isCxp = document.getElementById("me_register_cxp")?.checked || false;
    const cashBox = document.getElementById("me_cash_payment_box");
    if (cashBox) {
        if (isCxp) {
            cashBox.classList.add("hidden");
        } else {
            cashBox.classList.remove("hidden");
        }
    }
}

async function submitMaterialEntry(event) {
    if (event) {
        if (typeof event.preventDefault === 'function') event.preventDefault();
        if (typeof event.stopPropagation === 'function') event.stopPropagation();
    }
    const matId = parseInt(document.getElementById("me_material_id")?.value);
    const qty = parseFloat(document.getElementById("me_quantity")?.value) || 0.0;
    const cost = parseFloat(document.getElementById("me_unit_cost")?.value) || 0.0;
    const registerCxp = document.getElementById("me_register_cxp")?.checked || false;
    const paymentChannel = document.getElementById("me_payment_channel")?.value || "caja_chica_usd";
    const paymentRef = (document.getElementById("me_payment_ref")?.value || "").trim();

    if (!matId || isNaN(matId) || qty <= 0) {
        alert("Selecciona un material y cantidad válida.");
        return false;
    }

    const payload = {
        material_id: matId,
        quantity: qty,
        unit_cost_usd: cost,
        supplier_name: (document.getElementById("me_supplier")?.value || "").trim() || "Proveedor General",
        reference_doc: (document.getElementById("me_doc")?.value || "").trim() || "Compra Almacén",
        notes: (document.getElementById("me_notes")?.value || "").trim(),
        performed_by: "Custodio de Almacén",
        register_in_cxp: registerCxp,
        due_days: 15,
        payment_channel: paymentChannel,
        payment_ref: paymentRef
    };

    try {
        const token = window.authToken || localStorage.getItem('dalor_token');
        const headers = { 
            "Content-Type": "application/json",
            ...(token ? { "Authorization": `Bearer ${token}` } : {})
        };

        const res = await authFetch(`${API_BASE}/materials/entry`, {
            method: "POST",
            headers: headers,
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            const data = await res.json();
            alert(`✅ ${data.message || 'Entrada registrada exitosamente'}`);
            closeModal("modalMaterialEntry");
            try { await loadInitialMasterData(); } catch(e) {}
            try { loadMaterialsList(); } catch(e) {}
            if (registerCxp && typeof window.loadPayablesList === 'function') {
                try { window.loadPayablesList(); } catch(e) {}
            }
        } else {
            const err = await res.json().catch(() => ({ detail: "Error en el servidor al registrar entrada." }));
            alert("Error: " + (err.detail || JSON.stringify(err)));
        }
    } catch (e) {
        console.error("[MATERIAL ENTRY ERROR]", e);
        alert("Error al procesar entrada de material: " + (e?.message || e));
    }
    return false;
}



function openMaterialConsumeModal(materialId = null) {
    document.getElementById("materialConsumeForm").reset();
    populateSelectDropdowns();

    const sel = document.getElementById("mc_material_id");
    if (materialId) {
        // Pre-seleccionado desde fila de tabla: bloquear selector para evitar cambio accidental
        sel.value = materialId;
        sel.disabled = true;
        sel.style.opacity = '0.7';
        sel.style.cursor = 'not-allowed';
    } else {
        // Abierto desde botón general: permitir selección libre
        sel.disabled = false;
        sel.style.opacity = '';
        sel.style.cursor = '';
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
        alert("Selecciona un material y cantidad válida mayor a 0.");
        return;
    }

    const safeMaterials = (window.allMaterials && window.allMaterials.length > 0) ? window.allMaterials : (allMaterials || []);
    const matObj = safeMaterials.find(m => m.id === matId);
    if (matObj) {
        const availableStock = parseFloat(matObj.stock_quantity) || 0;
        if (availableStock <= 0) {
            alert(`⛔ Stock agotado: El material [${matObj.code}] ${matObj.name} no posee unidades disponibles en pañol (Stock: 0).`);
            return;
        }
        if (qty > availableStock) {
            alert(`⛔ Stock insuficiente: Has solicitado ${qty} ${matObj.unit_measure || 'UND'} de [${matObj.code}] ${matObj.name}, pero solo hay ${availableStock} ${matObj.unit_measure || 'UND'} disponibles en pañol.`);
            return;
        }
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
        const token = window.authToken || localStorage.getItem('dalor_token') || null;
        const headers = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;
        const res = await authFetch(`${API_BASE}/materials/consume`, {
            method: "POST",
            headers: headers,
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

            await authFetch(`${API_BASE}/resources/assign`, {

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

// --- PUENTE DE COMPATIBILIDAD CON WINDOW & HTML INLINE ---
if (typeof window !== 'undefined') {
    window.addMaterialDeliveryRow = addMaterialDeliveryRow;
    window.calcMaterialConsumeTotal = calcMaterialConsumeTotal;
    window.calcMaterialEntryTotal = calcMaterialEntryTotal;
    window.filterMaterialsTable = filterMaterialsTable;
    window.filterTransferToolsChecklist = filterTransferToolsChecklist;
    window.loadMaterialsList = loadMaterialsList;
    window.onConsumeMaterialSelected = onConsumeMaterialSelected;
    window.onMaterialDeliveryProjectChanged = onMaterialDeliveryProjectChanged;
    window.onTransferGuideProjectChanged = onTransferGuideProjectChanged;
    window.openMaterialConsumeModal = openMaterialConsumeModal;
    window.openMaterialDeliveryModal = openMaterialDeliveryModal;
    window.openMaterialEntryModal = openMaterialEntryModal;
    window.openNewMaterialModal = openNewMaterialModal;
    window.openTransferGuideModal = openTransferGuideModal;
    window.renderInitialMaterialDeliveryRows = renderInitialMaterialDeliveryRows;
    window.renderMaterialsTable = renderMaterialsTable;
    window.goToMaterialsPage = goToMaterialsPage;
    window.changeMaterialsPageSize = changeMaterialsPageSize;
    window.renderMaterialsTablePaginated = renderMaterialsTablePaginated;
    window.renderTransferToolsChecklist = renderTransferToolsChecklist;
    window.submitCreateMaterial = submitCreateMaterial;
    window.submitGenerateMaterialDeliveryGuide = submitGenerateMaterialDeliveryGuide;
    window.submitGenerateTransferGuide = submitGenerateTransferGuide;
    window.submitMaterialConsume = submitMaterialConsume;
    window.submitMaterialEntry = submitMaterialEntry;
    window.toggleMaterialEntryPaymentBox = toggleMaterialEntryPaymentBox;
    window.onNewMaterialCategoryChanged = onNewMaterialCategoryChanged;
}

export { 
    addMaterialDeliveryRow, 
    calcMaterialConsumeTotal, 
    calcMaterialEntryTotal, 
    filterMaterialsTable, 
    filterTransferToolsChecklist, 
    loadMaterialsList, 
    onConsumeMaterialSelected, 
    onMaterialDeliveryProjectChanged, 
    onTransferGuideProjectChanged, 
    openMaterialConsumeModal, 
    openMaterialDeliveryModal, 
    openMaterialEntryModal, 
    openNewMaterialModal, 
    openTransferGuideModal, 
    renderInitialMaterialDeliveryRows, 
    renderMaterialsTable, 
    goToMaterialsPage, 
    changeMaterialsPageSize, 
    renderMaterialsTablePaginated, 
    renderTransferToolsChecklist, 
    submitCreateMaterial, 
    submitGenerateMaterialDeliveryGuide, 
    submitGenerateTransferGuide, 
    submitMaterialConsume, 
    submitMaterialEntry, 
    toggleMaterialEntryPaymentBox, 
    onNewMaterialCategoryChanged 
};
