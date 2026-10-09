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
}
