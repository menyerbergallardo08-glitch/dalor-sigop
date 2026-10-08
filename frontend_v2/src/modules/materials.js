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
    if (options.body && !(options.body instanceof FormData) && !h['Content-Type']) {
        h['Content-Type'] = 'application/json';
    }
    if (options.body instanceof FormData) {
        delete h['Content-Type'];
    }
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

    if (Array.isArray(allMaterials) && allMaterials.length > 0) {
        filterMaterialsList();
    } else {
        tbody.innerHTML = `<tr><td colspan="${colSpan}" style="text-align: center; padding: 20px; color: #94a3b8;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando inventario de materiales...</td></tr>`;
    }

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
        try { populateMaterialCategories(); } catch(eCat) { console.warn("Error populating material categories:", eCat); }
        loadProjectRequisitionsBadge();
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
                <button onclick="openEditMaterialModal(${m.id})" class="btn-secondary" style="padding: 3px 8px; font-size: 11px; margin-left: 4px; color: #0284c7; border-color: #bae6fd;" title="Editar Ficha del Material">
                    <i class="fa-solid fa-pen-to-square"></i> Editar
                </button>
                <button onclick="openCalibrateMaterialModal(${m.id})" class="btn-secondary" style="padding: 3px 8px; font-size: 11px; margin-left: 4px; color: #7c3aed; border-color: #c4b5fd;" title="Calibrar / Ajustar Stock con Clave de Director">
                    <i class="fa-solid fa-key"></i> Calibrar
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

function populateMaterialCategories() {
    const baseCats = [
        "Planchas de Acero",
        "Acero Estructural",
        "Perfiles y Vigas",
        "Tuberías y Bridas",
        "Soldadura y Gases",
        "Abrasivos y Discos",
        "Tornillería y Fijaciones",
        "Pinturas y Recubrimientos",
        "Consumibles de Almacén"
    ];

    const currentCats = (allMaterials || [])
        .map(m => (m.category || '').trim())
        .filter(c => c && c.length > 0);

    const uniqueCats = Array.from(new Set([...baseCats, ...currentCats])).sort((a, b) => a.localeCompare(b, 'es'));

    // Selector de filtro de la tabla de inventario
    const filterSel = document.getElementById("filterMaterialCategory");
    if (filterSel) {
        const prevVal = filterSel.value;
        filterSel.innerHTML = `<option value="">-- Todas las Categorías (${uniqueCats.length}) --</option>` +
            uniqueCats.map(c => `<option value="${c}">${c}</option>`).join('');
        if (prevVal && uniqueCats.includes(prevVal)) filterSel.value = prevVal;
    }

    // Selector dentro del modal de crear material
    const modalSel = document.getElementById("nmat_category");
    if (modalSel) {
        const prevModalVal = modalSel.value;
        modalSel.innerHTML = uniqueCats.map(c => `<option value="${c}">${c}</option>`).join('') +
            `<option value="__NEW__" style="font-weight: bold; color: #2563eb;">➕ Crear Nueva Categoría...</option>`;
        if (prevModalVal && (uniqueCats.includes(prevModalVal) || prevModalVal === '__NEW__')) {
            modalSel.value = prevModalVal;
        }
    }
}

function onNewMaterialCategoryChanged() {
    const sel = document.getElementById("nmat_category");
    const customInp = document.getElementById("nmat_category_custom");
    if (!sel || !customInp) return;
    if (sel.value === "__NEW__") {
        customInp.classList.remove("hidden");
        customInp.style.display = "block";
        customInp.required = true;
        customInp.focus();
    } else {
        customInp.classList.add("hidden");
        customInp.style.display = "none";
        customInp.required = false;
        customInp.value = "";
    }
}

function openNewMaterialModal(fromCxp = false) {
    if (fromCxp) {
        window.openedMaterialModalFromCxp = true;
    }
    const modalEl = document.getElementById("modalNewMaterial");
    if (modalEl) {
        modalEl.style.zIndex = "2200";
    }
    document.getElementById("newMaterialForm")?.reset();
    populateMaterialCategories();
    const customInp = document.getElementById("nmat_category_custom");
    if (customInp) {
        customInp.classList.add("hidden");
        customInp.style.display = "none";
        customInp.required = false;
        customInp.value = "";
    }
    openModal("modalNewMaterial");
}

function openNewMaterialModalFromCxp() {
    openNewMaterialModal(true);
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
        code: document.getElementById("nmat_code").value.trim().toUpperCase(),
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
            const resData = await res.json().catch(() => ({}));
            closeModal("modalNewMaterial");

            // Recargar catálogo y categorías en tiempo real
            await loadMaterialsList();
            populateMaterialCategories();

            // Filtrar automáticamente para que el usuario vea de inmediato su nuevo material en pantalla
            const searchInput = document.getElementById("filterMaterialSearch");
            if (searchInput) {
                searchInput.value = payload.code || resData.code || "";
                filterMaterialsTable();
            }

            if (window.openedMaterialModalFromCxp) {
                window.openedMaterialModalFromCxp = false;
                if (typeof window.onMaterialCreatedFromCxp === 'function') {
                    window.onMaterialCreatedFromCxp(resData);
                }
            } else {
                alert(`✅ Material [${payload.code}] "${payload.name}" creado con éxito en categoría "${categoryVal}".`);
            }
        } else {
            const err = await res.json().catch(() => ({}));
            alert("Error: " + (err.detail || JSON.stringify(err)));
        }
    } catch (e) {
        alert("Error de conexión al crear material: " + e.message);
    }
}

function addMaterialEntryRow(defaultMaterialId = null, defaultQty = 1, defaultCost = 0) {
    const tbody = document.getElementById("me_materials_tbody");
    if (!tbody) return;

    const safeMaterials = (window.allMaterials && window.allMaterials.length > 0) ? window.allMaterials : (allMaterials || []);
    const rowId = "me_row_" + Date.now() + "_" + Math.floor(Math.random() * 1000);

    const tr = document.createElement("tr");
    tr.id = rowId;
    tr.style.borderBottom = "1px solid #e2e8f0";

    const optionsHtml = safeMaterials.map(m => {
        const isSel = (defaultMaterialId && m.id === defaultMaterialId) ? 'selected' : '';
        const cost = m.unit_cost_usd || 0;
        return `<option value="${m.id}" data-cost="${cost}" data-unit="${m.unit_measure || 'UND'}" data-stock="${m.stock_quantity || 0}" ${isSel}>[${m.code}] ${m.name} (Stock: ${m.stock_quantity || 0} ${m.unit_measure || 'UND'})</option>`;
    }).join('');

    tr.innerHTML = `
        <td style="padding: 6px 8px;">
            <input type="text" placeholder="🔍 Escribe para filtrar material..." oninput="filterEntryRowDropdown(this)" style="font-size: 11px; padding: 4px 6px; width: 100%; margin-bottom: 4px; border: 1px solid #cbd5e1; border-radius: 4px; box-sizing: border-box; background: #f8fafc;">
            <select class="me-row-material form-select" onchange="onEntryMaterialRowChanged(this)" style="font-size: 11.5px; padding: 4px 6px; width: 100%;">
                <option value="">-- Seleccionar Material --</option>
                ${optionsHtml}
            </select>
        </td>
        <td style="padding: 6px 8px; width: 110px;">
            <input type="number" step="0.01" min="0.01" value="${defaultQty}" class="me-row-qty form-input" style="font-size: 11.5px; padding: 4px 6px; text-align: right;" oninput="calcMaterialEntryTotal()">
        </td>
        <td style="padding: 6px 8px; width: 130px;">
            <input type="number" step="0.01" min="0" value="${defaultCost}" class="me-row-cost form-input" style="font-size: 11.5px; padding: 4px 6px; text-align: right;" oninput="calcMaterialEntryTotal()">
        </td>
        <td style="padding: 6px 8px; width: 120px; text-align: right; font-weight: 800; color: #059669; font-size: 12px;">
            <span class="me-row-subtotal">$0.00</span>
        </td>
        <td style="padding: 6px 8px; width: 36px; text-align: center;">
            <button type="button" onclick="removeMaterialEntryRow(this)" style="background: none; border: none; color: #dc2626; font-size: 18px; cursor: pointer; padding: 2px 6px; font-weight: bold; line-height: 1;" title="Eliminar este renglón">&times;</button>
        </td>
    `;

    tbody.appendChild(tr);

    if (defaultMaterialId) {
        const sel = tr.querySelector(".me-row-material");
        if (sel) {
            sel.value = defaultMaterialId;
            onEntryMaterialRowChanged(sel);
        }
    } else {
        calcMaterialEntryTotal();
    }
}

function removeMaterialEntryRow(btn) {
    const tr = btn.closest("tr");
    if (tr) tr.remove();
    const tbody = document.getElementById("me_materials_tbody");
    if (tbody && tbody.children.length === 0) {
        addMaterialEntryRow();
    } else {
        calcMaterialEntryTotal();
    }
}

function onEntryMaterialRowChanged(sel) {
    const tr = sel.closest("tr");
    if (!tr) return;
    const opt = sel.options[sel.selectedIndex];
    if (opt && opt.value) {
        const costInput = tr.querySelector(".me-row-cost");
        if (costInput && (!parseFloat(costInput.value) || parseFloat(costInput.value) === 0)) {
            const cost = parseFloat(opt.getAttribute("data-cost")) || 0;
            if (cost > 0) costInput.value = cost.toFixed(2);
        }
    }
    calcMaterialEntryTotal();
}

function filterEntryRowDropdown(input) {
    const q = (input.value || '').toLowerCase().trim();
    const tr = input.closest("tr");
    if (!tr) return;
    const sel = tr.querySelector(".me-row-material");
    if (!sel) return;
    const safeMaterials = (window.allMaterials && window.allMaterials.length > 0) ? window.allMaterials : (allMaterials || []);
    const filtered = q ? safeMaterials.filter(m => (m.name || '').toLowerCase().includes(q) || (m.code || '').toLowerCase().includes(q)) : safeMaterials;
    const currentVal = sel.value;
    sel.innerHTML = `<option value="">-- Seleccionar Material (${filtered.length}) --</option>` +
        filtered.map(m => {
            const isSel = (String(m.id) === String(currentVal)) ? 'selected' : '';
            return `<option value="${m.id}" data-cost="${m.unit_cost_usd || 0}" data-unit="${m.unit_measure || 'UND'}" data-stock="${m.stock_quantity || 0}" ${isSel}>[${m.code}] ${m.name} (Stock: ${m.stock_quantity || 0} ${m.unit_measure || 'UND'})</option>`;
        }).join('');
}

function openMaterialEntryModal(materialId = null) {
    const form = document.getElementById("materialEntryForm");
    if (form) form.reset();

    const tbody = document.getElementById("me_materials_tbody");
    if (tbody) tbody.innerHTML = "";

    addMaterialEntryRow(materialId, 1, 0);
    toggleMaterialEntryPaymentBox();
    openModal("modalMaterialEntry");
}

function calcMaterialEntryTotal() {
    const rows = document.querySelectorAll("#me_materials_tbody tr");
    let totalUsd = 0;
    rows.forEach(tr => {
        const qty = parseFloat(tr.querySelector(".me-row-qty")?.value) || 0;
        const cost = parseFloat(tr.querySelector(".me-row-cost")?.value) || 0;
        const subtotal = qty * cost;
        totalUsd += subtotal;
        const subtotalEl = tr.querySelector(".me-row-subtotal");
        if (subtotalEl) subtotalEl.innerText = `$${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    });

    const previewUsd = document.getElementById("me_total_usd_preview");
    if (previewUsd) previewUsd.innerText = `$${totalUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;

    const bcvRate = window.bcvRate || window.currentBcvRate || 1.0;
    const totalBs = totalUsd * (bcvRate > 1 ? bcvRate : 1);
    const previewBs = document.getElementById("me_total_bs_preview");
    if (previewBs) previewBs.innerText = bcvRate > 1 ? `≈ Bs ${totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (Tasa BCV: ${bcvRate})` : '';
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

    const rows = document.querySelectorAll("#me_materials_tbody tr");
    const items = [];

    rows.forEach(tr => {
        const matId = parseInt(tr.querySelector(".me-row-material")?.value);
        const qty = parseFloat(tr.querySelector(".me-row-qty")?.value) || 0;
        const cost = parseFloat(tr.querySelector(".me-row-cost")?.value) || 0;
        if (matId && !isNaN(matId) && qty > 0) {
            items.push({
                material_id: matId,
                quantity: qty,
                unit_cost_usd: cost
            });
        }
    });

    if (items.length === 0) {
        alert("⚠️ Por favor añade al menos un material válido con cantidad mayor a 0.");
        return false;
    }

    const registerCxp = document.getElementById("me_register_cxp")?.checked || false;
    const paymentChannel = document.getElementById("me_payment_channel")?.value || "caja_chica_usd";
    const paymentRef = (document.getElementById("me_payment_ref")?.value || "").trim();
    const supplier = (document.getElementById("me_supplier")?.value || "").trim() || "Proveedor General";
    const docRef = (document.getElementById("me_doc")?.value || "").trim() || "Factura Compra";
    const notes = (document.getElementById("me_notes")?.value || "").trim();

    const payload = {
        items: items,
        supplier_name: supplier,
        reference_doc: docRef,
        notes: notes,
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

    const searchInput = document.getElementById("mc_material_search");
    if (searchInput) searchInput.value = "";

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

    onConsumeProjectChanged();
    onConsumeMaterialSelected();
    calcMaterialConsumeTotal();
    openModal("modalMaterialConsume");
}

function filterConsumeMaterialDropdown(query) {
    const q = (query || '').toLowerCase().trim();
    const sel = document.getElementById("mc_material_id");
    if (!sel) return;
    const safeMaterials = (window.allMaterials && window.allMaterials.length > 0) ? window.allMaterials : (allMaterials || []);
    const available = safeMaterials.filter(m => (parseFloat(m.stock_quantity) || 0) > 0);
    const filtered = q ? available.filter(m => (m.name || '').toLowerCase().includes(q) || (m.code || '').toLowerCase().includes(q)) : available;
    const currentVal = sel.value;
    sel.innerHTML = `<option value="">-- Seleccionar Material (${filtered.length} con stock) --</option>` +
        filtered.map(m => {
            const isSel = (String(m.id) === String(currentVal)) ? 'selected' : '';
            return `<option value="${m.id}" data-cost="${m.unit_cost_usd || 0}" data-unit="${m.unit_measure || 'UND'}" data-stock="${m.stock_quantity}" ${isSel}>[${m.code}] ${m.name} (Stock: ${m.stock_quantity} ${m.unit_measure || 'UND'})</option>`;
        }).join('');
    onConsumeMaterialSelected();
}

function onConsumeProjectChanged() {
    const projIdVal = document.getElementById("mc_project_id")?.value;
    const banner = document.getElementById("mc_guide_banner");
    if (banner) {
        banner.style.display = projIdVal ? "block" : "none";
    }
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

    const driverName = (document.getElementById("mc_driver_name")?.value || "").trim();
    const vehiclePlate = (document.getElementById("mc_vehicle_plate")?.value || "").trim();

    const payload = {
        material_id: matId,
        quantity: qty,
        project_id: projId,
        destination: projId ? "Obra en Ejecución" : "Taller Central",
        reference_doc: document.getElementById("mc_doc").value.trim() || "Requisición Interna",
        notes: document.getElementById("mc_notes").value.trim(),
        performed_by: document.getElementById("mc_performed_by").value.trim() || "Custodio de Almacén",
        driver_name: driverName,
        vehicle_plate: vehiclePlate
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
            closeModal("modalMaterialConsume");
            await loadInitialMasterData();
            loadMaterialsList();

            if (data.guide_number) {
                const openGuide = confirm(`✅ ${data.message || 'Despacho procesado exitosamente.'}\n\nSe ha emitido automáticamente la Guía de Despacho Oficial N°: ${data.guide_number}\n\n¿Deseas abrirla en el módulo de Despachos ahora mismo?`);
                if (openGuide && typeof window.navigateToDispatchGuide === 'function') {
                    window.navigateToDispatchGuide(data.guide_number);
                }
            } else {
                alert(`✅ ${data.message || 'Despacho registrado exitosamente.'}`);
            }
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

async function openMaterialDeliveryModal() {
    const form = document.getElementById("materialDeliveryForm");
    if (form) form.reset();

    let projects = (window.allProjects && window.allProjects.length > 0) ? window.allProjects : (allProjects || []);
    if (projects.length === 0) {
        try {
            const res = await authFetch(`${API_BASE}/projects/`);
            if (res.ok) {
                projects = await res.json();
                window.allProjects = allProjects = projects;
            }
        } catch(e) {
            console.error("Error cargando proyectos para despacho:", e);
        }
    }

    // Filtrar estrictamente solo obras ABIERTAS / ACTIVAS
    const openProjects = (projects || []).filter(p => {
        const st = (p.status || '').toLowerCase().trim();
        return !['culminado', 'completado', 'cerrado', 'cancelado', 'finalizado', 'inactivo'].includes(st);
    });

    const sel = document.getElementById("md_project_id");
    if (sel) {
        if (openProjects.length === 0) {
            sel.innerHTML = `<option value="">⚠️ No hay obras abiertas disponibles para despacho</option>`;
        } else {
            sel.innerHTML = `<option value="">-- Seleccione Proyecto Aprobado Destino --</option>` +
                openProjects.map(p => `<option value="${p.id}" data-location="${p.location || ''}">[${p.code}] ${p.name}</option>`).join('');
        }
    }

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

function openCalibrateMaterialModal(matId) {
    const m = (allMaterials || []).find(x => x.id === matId);
    if (!m) return alert("Material no encontrado");

    const idInput = document.getElementById("calib_mat_id");
    if (idInput) idInput.value = m.id;

    const dispInput = document.getElementById("calib_mat_display");
    if (dispInput) dispInput.value = `[${m.code}] ${m.name}`;

    const stockInput = document.getElementById("calib_mat_current_stock");
    if (stockInput) stockInput.value = `${m.stock_quantity} ${m.unit_measure}`;

    const newStockInput = document.getElementById("calib_mat_new_stock");
    if (newStockInput) newStockInput.value = m.stock_quantity;

    const reasonInput = document.getElementById("calib_mat_reason");
    if (reasonInput) reasonInput.value = "";

    const passInput = document.getElementById("calib_mat_password");
    if (passInput) passInput.value = "";

    if (typeof openModal === 'function') openModal("modalCalibrateMaterial");
}

async function submitCalibrateMaterial(event) {
    if (event) event.preventDefault();

    const matId = document.getElementById("calib_mat_id")?.value;
    const newStock = parseFloat(document.getElementById("calib_mat_new_stock")?.value);
    const reason = document.getElementById("calib_mat_reason")?.value?.trim() || "";
    const password = document.getElementById("calib_mat_password")?.value || "";

    if (!matId) return alert("Error: ID del material no identificado.");
    if (isNaN(newStock) || newStock < 0) return alert("Ingrese un nuevo stock válido mayor o igual a 0.");
    if (!reason) return alert("Debe indicar la justificación o motivo del ajuste físico.");
    if (!password) return alert("Debe ingresar su contraseña para autorizar la calibración.");

    try {
        const res = await authFetch(`${API_BASE}/materials/${matId}/calibrate`, {
            method: 'PUT',
            body: JSON.stringify({
                new_stock_quantity: newStock,
                new_stock: newStock,
                reason: reason,
                director_password: password
            })
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({ detail: 'Error al calibrar stock' }));
            throw new Error(err.detail || 'Error al calibrar stock');
        }

        const data = await res.json();
        alert(`✅ Stock calibrado exitosamente: nuevo stock ${data.new_stock}`);
        if (typeof closeModal === 'function') closeModal("modalCalibrateMaterial");
        loadMaterialsList();
    } catch(err) {
        console.error("Error calibrating material:", err);
        alert(`❌ Error: ${err.message || err}`);
    }

    return false;
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
    window.addMaterialEntryRow = addMaterialEntryRow;
    window.removeMaterialEntryRow = removeMaterialEntryRow;
    window.onEntryMaterialRowChanged = onEntryMaterialRowChanged;
    window.filterEntryRowDropdown = filterEntryRowDropdown;
    window.filterConsumeMaterialDropdown = filterConsumeMaterialDropdown;
    window.onConsumeProjectChanged = onConsumeProjectChanged;
    window.toggleMaterialEntryPaymentBox = toggleMaterialEntryPaymentBox;
    window.onNewMaterialCategoryChanged = onNewMaterialCategoryChanged;
    window.populateMaterialCategories = populateMaterialCategories;
    window.openNewMaterialModalFromCxp = openNewMaterialModalFromCxp;
    // Requisiciones de Obra
    window.loadProjectRequisitionsBadge = loadProjectRequisitionsBadge;
    window.openProjectRequisitionsInboxModal = openProjectRequisitionsInboxModal;
    window.loadProjectRequisitionsInbox = loadProjectRequisitionsInbox;
    window.filterProjectRequisitionsView = filterProjectRequisitionsView;
    window.toggleSelectAllProjectReqs = toggleSelectAllProjectReqs;
    window.submitDispatchProjectGroup = submitDispatchProjectGroup;
    window.quickDispatchSingleRequisition = quickDispatchSingleRequisition;
    window.goToReqPage = goToReqPage;
    window.changeReqPageSize = changeReqPageSize;
    window.onReqQtyChanged = onReqQtyChanged;
    window.onReqVehicleChanged = onReqVehicleChanged;
    window.onReqDriverChanged = onReqDriverChanged;
    window.openCalibrateMaterialModal = openCalibrateMaterialModal;
    window.submitCalibrateMaterial = submitCalibrateMaterial;
    window.openEditMaterialModal = openEditMaterialModal;
    window.submitEditMaterial = submitEditMaterial;
}

async function openEditMaterialModal(materialId) {
    const safeMaterials = (window.allMaterials && window.allMaterials.length > 0) ? window.allMaterials : (allMaterials || []);
    const mat = safeMaterials.find(m => m.id === materialId);
    if (!mat) {
        alert("Material no encontrado en catálogo.");
        return;
    }
    const idInput = document.getElementById("edit_mat_id");
    const codeInput = document.getElementById("edit_mat_code");
    const nameInput = document.getElementById("edit_mat_name");
    const catInput = document.getElementById("edit_mat_category");
    const unitInput = document.getElementById("edit_mat_unit");
    const minStockInput = document.getElementById("edit_mat_min_stock");
    const unitCostInput = document.getElementById("edit_mat_unit_cost");
    const locInput = document.getElementById("edit_mat_location");

    if (idInput) idInput.value = mat.id;
    if (codeInput) codeInput.value = mat.code || '';
    if (nameInput) nameInput.value = mat.name || '';
    if (catInput) catInput.value = mat.category || 'Acero Estructural';
    if (unitInput) unitInput.value = (mat.unit_measure || 'UND').toUpperCase();
    if (minStockInput) minStockInput.value = mat.min_stock_alert !== undefined ? mat.min_stock_alert : 5;
    if (unitCostInput) unitCostInput.value = mat.unit_cost_usd ? Number(mat.unit_cost_usd).toFixed(2) : '0.00';
    if (locInput) locInput.value = mat.location || '';

    openModal("modalEditMaterial");
}

async function submitEditMaterial(event) {
    if (event) {
        if (typeof event.preventDefault === 'function') event.preventDefault();
        if (typeof event.stopPropagation === 'function') event.stopPropagation();
    }
    const matId = document.getElementById("edit_mat_id")?.value;
    if (!matId) return;

    const payload = {
        name: (document.getElementById("edit_mat_name")?.value || "").trim(),
        category: (document.getElementById("edit_mat_category")?.value || "").trim(),
        unit_measure: (document.getElementById("edit_mat_unit")?.value || "").trim().toUpperCase(),
        min_stock_alert: parseFloat(document.getElementById("edit_mat_min_stock")?.value) || 0,
        unit_cost_usd: parseFloat(document.getElementById("edit_mat_unit_cost")?.value) || 0,
        location: (document.getElementById("edit_mat_location")?.value || "").trim()
    };

    if (!payload.name) {
        alert("Por favor ingrese el nombre del material.");
        return;
    }

    const btn = document.getElementById("btnSubmitEditMaterial");
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Guardando...`;
    }

    try {
        const res = await authFetch(`${API_BASE}/materials/${matId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || "Error al actualizar material");
        }
        closeModal("modalEditMaterial");
        if (typeof showToastNotification === 'function') {
            showToastNotification("✅ Ficha de material actualizada correctamente.", "success");
        } else {
            alert("✅ Material actualizado con éxito.");
        }
        await loadMaterialsList();
    } catch (e) {
        alert("Error al actualizar material: " + e.message);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Guardar Cambios`;
        }
    }
}

export { 
    addMaterialDeliveryRow, 
    addMaterialEntryRow,
    removeMaterialEntryRow,
    onEntryMaterialRowChanged,
    filterEntryRowDropdown,
    filterConsumeMaterialDropdown,
    onConsumeProjectChanged,
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
    openNewMaterialModalFromCxp,
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
    onNewMaterialCategoryChanged,
    loadProjectRequisitionsBadge,
    openProjectRequisitionsInboxModal,
    loadProjectRequisitionsInbox,
    filterProjectRequisitionsView,
    toggleSelectAllProjectReqs,
    submitDispatchProjectGroup,
    quickDispatchSingleRequisition,
    goToReqPage,
    changeReqPageSize,
    onReqQtyChanged,
    onReqVehicleChanged,
    onReqDriverChanged,
    openCalibrateMaterialModal,
    submitCalibrateMaterial,
    openEditMaterialModal,
    submitEditMaterial
};
