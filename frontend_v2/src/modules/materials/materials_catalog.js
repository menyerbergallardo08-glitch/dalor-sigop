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



async function openEditMaterialModal(materialId) {
    const safeMaterials = (window.allMaterials && window.allMaterials.length > 0) ? window.allMaterials : (allMaterials || []);
    let mat = safeMaterials.find(m => m && (m.id == materialId || String(m.id) === String(materialId)));

    if (!mat && materialId) {
        try {
            const res = await authFetch(`${API_BASE}/materials/${materialId}`);
            if (res.ok) mat = await res.json();
        } catch(e) {}
    }

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


// Exponer al objeto global window para eventos inline y compatibilidad
if (typeof window !== 'undefined') {
    window.loadMaterialsList = loadMaterialsList;
    window.goToMaterialsPage = goToMaterialsPage;
    window.changeMaterialsPageSize = changeMaterialsPageSize;
    window.renderMaterialsTable = renderMaterialsTable;
    window.renderMaterialsTablePaginated = renderMaterialsTablePaginated;
    window.filterMaterialsTable = filterMaterialsTable;
    window.populateMaterialCategories = populateMaterialCategories;
    window.onNewMaterialCategoryChanged = onNewMaterialCategoryChanged;
    window.openNewMaterialModal = openNewMaterialModal;
    window.openNewMaterialModalFromCxp = openNewMaterialModalFromCxp;
    window.submitCreateMaterial = submitCreateMaterial;
    window.openEditMaterialModal = openEditMaterialModal;
    window.submitEditMaterial = submitEditMaterial;
}
