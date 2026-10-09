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

    const supplier = (document.getElementById("me_supplier")?.value || "").trim();
    if (!supplier) {
        alert("⚠️ Debe ingresar el nombre del Proveedor / Vendedor de la compra.");
        document.getElementById("me_supplier")?.focus();
        return false;
    }

    const docRef = (document.getElementById("me_doc")?.value || "").trim();
    if (!docRef) {
        alert("⚠️ Debe ingresar el Nº de Factura o Guía de Entrega del Proveedor.");
        document.getElementById("me_doc")?.focus();
        return false;
    }

    const rows = document.querySelectorAll("#me_materials_tbody tr");
    if (!rows || rows.length === 0) {
        alert("⚠️ Debe agregar al menos un renglón de material a la factura.");
        return false;
    }

    const items = [];
    for (let i = 0; i < rows.length; i++) {
        const tr = rows[i];
        const matId = parseInt(tr.querySelector(".me-row-material")?.value);
        const qty = parseFloat(tr.querySelector(".me-row-qty")?.value) || 0;
        const cost = parseFloat(tr.querySelector(".me-row-cost")?.value) || 0;

        if (!matId || isNaN(matId)) {
            alert(`⚠️ En el renglón #${i + 1}: Debe seleccionar un material del catálogo.`);
            tr.querySelector(".me-row-material")?.focus();
            return false;
        }
        if (qty <= 0) {
            alert(`⚠️ En el renglón #${i + 1}: La cantidad ingresada debe ser mayor a 0.`);
            tr.querySelector(".me-row-qty")?.focus();
            return false;
        }
        if (cost <= 0) {
            alert(`⚠️ En el renglón #${i + 1}: El costo unitario en USD debe ser mayor a 0.`);
            tr.querySelector(".me-row-cost")?.focus();
            return false;
        }

        items.push({
            material_id: matId,
            quantity: qty,
            unit_cost_usd: cost
        });
    }

    const registerCxp = document.getElementById("me_register_cxp")?.checked || false;
    const paymentChannel = document.getElementById("me_payment_channel")?.value || "caja_chica_usd";
    const paymentRef = (document.getElementById("me_payment_ref")?.value || "").trim();

    if (!registerCxp && !paymentRef) {
        alert("⚠️ Para compras de contado, debe ingresar el Nº de Referencia o comprobante del pago de caja/banco.");
        document.getElementById("me_payment_ref")?.focus();
        return false;
    }

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








async function openCalibrateMaterialModal(matId) {
    const safeMaterials = (window.allMaterials && window.allMaterials.length > 0) ? window.allMaterials : (allMaterials || []);
    let m = safeMaterials.find(x => x && (x.id == matId || String(x.id) === String(matId)));

    if (!m && matId) {
        try {
            const res = await authFetch(`${API_BASE}/materials/${matId}`);
            if (res.ok) m = await res.json();
        } catch(e) {}
    }

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

// ------------------------------------------------------------------------------
// HISTORIAL KARDEX AUDITABLE DE MOVIMIENTOS
// ------------------------------------------------------------------------------
let rawKardexMovements = [];

async function openMaterialKardexModal(materialId = null) {
    if (typeof openModal === 'function') openModal('modalMaterialKardex');
    const searchInput = document.getElementById('kardexSearchInput');
    if (searchInput) searchInput.value = '';
    const typeFilter = document.getElementById('kardexTypeFilter');
    if (typeFilter) typeFilter.value = '';
    await loadMaterialKardexList(materialId);
}

async function loadMaterialKardexList(materialId = null) {
    const tbody = document.getElementById('kardexTableBody');
    const badge = document.getElementById('kardexCountBadge');
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 25px; color: #64748b;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando movimientos...</td></tr>';
    }

    try {
        let url = `${API_BASE}/materials/movements?limit=200`;
        if (materialId) url += `&material_id=${materialId}`;
        const res = await authFetch(url);
        if (res.ok) {
            rawKardexMovements = await res.json();
            renderMaterialKardexTable(rawKardexMovements);
        } else {
            if (tbody) tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 25px; color: #ef4444;">Error al cargar historial de movimientos.</td></tr>';
        }
    } catch(err) {
        console.error("Error loading kardex:", err);
        if (tbody) tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 25px; color: #ef4444;">Error: ${err.message || err}</td></tr>`;
    }
}

function filterMaterialKardexTable() {
    const q = (document.getElementById('kardexSearchInput')?.value || '').toLowerCase().trim();
    const type = document.getElementById('kardexTypeFilter')?.value || '';

    const filtered = (rawKardexMovements || []).filter(m => {
        if (type && m.movement_type !== type) return false;
        if (!q) return true;
        const text = `${m.material_code || ''} ${m.material_name || ''} ${m.reference_doc || ''} ${m.performed_by || ''} ${m.project_name || ''} ${m.destination || ''}`.toLowerCase();
        return text.includes(q);
    });

    renderMaterialKardexTable(filtered);
}

function renderMaterialKardexTable(movements) {
    const tbody = document.getElementById('kardexTableBody');
    const badge = document.getElementById('kardexCountBadge');
    if (badge) badge.textContent = `${movements.length} movimientos`;
    if (!tbody) return;

    if (!movements || movements.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 25px; color: #94a3b8;">No se registraron movimientos que coincidan con los filtros.</td></tr>';
        return;
    }

    tbody.innerHTML = movements.map(m => {
        let typeBadge = '';
        if (m.movement_type === 'entrada_compra') {
            typeBadge = '<span style="background: #ecfdf5; color: #047857; font-weight: 800; padding: 2px 7px; border-radius: 6px; font-size: 10.5px; border: 1px solid #a7f3d0;"><i class="fa-solid fa-cart-shopping"></i> Compra</span>';
        } else if (m.movement_type === 'despacho_obra') {
            typeBadge = '<span style="background: #e0f2fe; color: #0369a1; font-weight: 800; padding: 2px 7px; border-radius: 6px; font-size: 10.5px; border: 1px solid #bae6fd;"><i class="fa-solid fa-truck-arrow-right"></i> Despacho</span>';
        } else if (m.movement_type === 'calibracion_inventario') {
            typeBadge = '<span style="background: #fef3c7; color: #92400e; font-weight: 800; padding: 2px 7px; border-radius: 6px; font-size: 10.5px; border: 1px solid #fde68a;"><i class="fa-solid fa-scale-balanced"></i> Calibración</span>';
        } else {
            typeBadge = `<span style="background: #f1f5f9; color: #475569; font-weight: 700; padding: 2px 6px; border-radius: 6px; font-size: 10px;">${m.movement_type}</span>`;
        }

        return `
            <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.15s ease;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'">
                <td style="padding: 7px 10px; color: #64748b; font-size: 11px; white-space: nowrap;">${m.movement_date || '-'}</td>
                <td style="padding: 7px 10px; text-align: center;">${typeBadge}</td>
                <td style="padding: 7px 10px; font-weight: 700; color: #1e293b;">
                    <span style="font-family: monospace; font-size: 10.5px; color: #2563eb; background: #eff6ff; padding: 1px 4px; border-radius: 4px; margin-right: 4px;">${m.material_code || 'S/C'}</span>
                    ${m.material_name || 'N/A'}
                </td>
                <td style="padding: 7px 10px; text-align: right; font-weight: 800; color: #0f172a;">
                    ${m.quantity} <span style="font-size: 10px; color: #64748b; font-weight: 400;">${m.unit_measure || 'UND'}</span>
                </td>
                <td style="padding: 7px 10px; text-align: right; color: #475569;">$${(m.unit_cost_usd || 0).toFixed(2)}</td>
                <td style="padding: 7px 10px; text-align: right; font-weight: 800; color: #059669;">$${(m.total_cost_usd || 0).toFixed(2)}</td>
                <td style="padding: 7px 10px; color: #334155; font-size: 11px;">${m.project_name || m.destination || '-'}</td>
                <td style="padding: 7px 10px; font-family: monospace; font-size: 10.5px; color: #475569;">${m.reference_doc || '-'}</td>
                <td style="padding: 7px 10px; color: #64748b; font-size: 11px;">${m.performed_by || '-'}</td>
            </tr>
        `;
    }).join('');
}


// Exponer al objeto global window para eventos inline y compatibilidad
if (typeof window !== 'undefined') {
    window.addMaterialEntryRow = addMaterialEntryRow;
    window.removeMaterialEntryRow = removeMaterialEntryRow;
    window.onEntryMaterialRowChanged = onEntryMaterialRowChanged;
    window.filterEntryRowDropdown = filterEntryRowDropdown;
    window.openMaterialEntryModal = openMaterialEntryModal;
    window.calcMaterialEntryTotal = calcMaterialEntryTotal;
    window.toggleMaterialEntryPaymentBox = toggleMaterialEntryPaymentBox;
    window.submitMaterialEntry = submitMaterialEntry;
    window.openMaterialConsumeModal = openMaterialConsumeModal;
    window.filterConsumeMaterialDropdown = filterConsumeMaterialDropdown;
    window.onConsumeProjectChanged = onConsumeProjectChanged;
    window.onConsumeMaterialSelected = onConsumeMaterialSelected;
    window.calcMaterialConsumeTotal = calcMaterialConsumeTotal;
    window.submitMaterialConsume = submitMaterialConsume;
    window.openCalibrateMaterialModal = openCalibrateMaterialModal;
    window.submitCalibrateMaterial = submitCalibrateMaterial;
    window.openMaterialKardexModal = openMaterialKardexModal;
    window.loadMaterialKardexList = loadMaterialKardexList;
    window.filterMaterialKardexTable = filterMaterialKardexTable;
}
