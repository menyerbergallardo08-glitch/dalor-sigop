// Sigop ERP - Submódulo Cuentas por Pagar (Materiales y Conciliación 3-Way Matching)
const API_BASE = (typeof window !== 'undefined' && window.API_BASE) || '/api/v1';

const authFetch = (url, options = {}) => {
    const token = (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('dalor_token')) ||
                  (typeof localStorage !== 'undefined' && (localStorage.getItem('dalor_token') || localStorage.getItem('token'))) ||
                  (typeof window !== 'undefined' && window.authToken) || '';
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (options.body instanceof FormData) {
        delete headers['Content-Type'];
    }
    return window.fetch(url, { ...options, headers });
};

let unbilledWarehouseEntriesCache = [];
let allMaterials = [];

export async function loadUnbilledWarehouseEntries() {
    try {
        const res = await authFetch(`${API_BASE}/financial/unbilled-warehouse-entries`);
        if (res.ok) {
            unbilledWarehouseEntriesCache = await res.json();
            window.unbilledWarehouseEntriesCache = unbilledWarehouseEntriesCache;
        } else {
            unbilledWarehouseEntriesCache = [];
        }
    } catch (e) {
        console.warn("Error cargando entradas de almacén sin facturar:", e);
        unbilledWarehouseEntriesCache = [];
    }

    const selectEl = document.getElementById("cxp_warehouse_entry_id");
    if (selectEl) {
        if (!unbilledWarehouseEntriesCache || unbilledWarehouseEntriesCache.length === 0) {
            selectEl.innerHTML = `<option value="">⚠️ No hay entradas de almacén pendientes (Utilice la opción 'Cargar Mercancía Recibida Ahora')</option>`;
        } else {
            let opts = `<option value="">-- Seleccionar Entrada Física de Almacén (${unbilledWarehouseEntriesCache.length} disponibles) --</option>`;
            opts += unbilledWarehouseEntriesCache.map(e => {
                const dateStr = e.movement_date ? e.movement_date.split(' ')[0] : '';
                return `<option value="${e.id}">[#${e.id} | ${dateStr}] ${e.material_name} - Cant: ${e.quantity} ${e.unit_measure} ($${Number(e.total_cost_usd || 0).toFixed(2)}) → ${e.destination}</option>`;
            }).join('');
            selectEl.innerHTML = opts;
        }
    }
}

export async function loadExpenseConcepts() {
    const sel = document.getElementById("cxp_payable_type");
    if (!sel) return;
    const currentVal = sel.value;
    try {
        const res = await authFetch(`${API_BASE}/financial/expense-concepts`);
        if (res.ok) {
            const concepts = await res.json();
            let html = `
                <option value="costo_material_obra" data-rule="costo_material_obra">🏗️ Materiales / Consumibles Obra (Entrada)</option>
                <option value="stock_almacen" data-rule="stock_almacen">🏢 Reposición Stock Almacén (Entrada)</option>
                <option value="servicios_honorarios" data-rule="servicios_honorarios">🤝 Subcontrato / Servicios / Honorarios</option>
                <option value="alquiler_maquinaria_ext" data-rule="alquiler_maquinaria_ext">🚜 Alquiler Maquinaria / Equipos Externos</option>
                <option value="gastos_sede" data-rule="gastos_sede">📂 Gastos Operativos / Administrativos Sede</option>
            `;
            const ruleIcons = {
                costo_material_obra: '🏗️',
                stock_almacen: '🏢',
                servicios_honorarios: '🤝',
                alquiler_maquinaria_ext: '🚜',
                gastos_sede: '📂'
            };
            concepts.forEach(c => {
                const icon = ruleIcons[c.business_rule] || '🏷️';
                html += `<option value="concept_${c.id}" data-rule="${c.business_rule}" data-category-id="${c.id}">${icon} ${c.name}</option>`;
            });
            sel.innerHTML = html;
            if (currentVal && sel.querySelector(`option[value="${currentVal}"]`)) {
                sel.value = currentVal;
            }
        }
    } catch(e) {
        console.warn("Error cargando conceptos de gasto:", e);
    }
}

export function openCreateConceptModal() {
    const nameInput = document.getElementById("new_concept_name");
    const descInput = document.getElementById("new_concept_description");
    if (nameInput) nameInput.value = "";
    if (descInput) descInput.value = "";
    const firstRadio = document.querySelector('input[name="new_concept_rule"]');
    if (firstRadio) firstRadio.checked = true;
    openModal("modalCreateExpenseConcept");
}

export async function submitCreateExpenseConcept(e) {
    if (e && e.preventDefault) e.preventDefault();
    const name = document.getElementById("new_concept_name")?.value?.trim();
    const desc = document.getElementById("new_concept_description")?.value?.trim() || "";
    const ruleInput = document.querySelector('input[name="new_concept_rule"]:checked');
    const businessRule = ruleInput ? ruleInput.value : "costo_material_obra";

    if (!name) {
        alert("Por favor ingrese el nombre del concepto.");
        return;
    }

    const submitBtn = document.getElementById("btnSubmitCreateConcept");
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Guardando...`;
    }

    try {
        const res = await authFetch(`${API_BASE}/financial/expense-concepts`, {
            method: 'POST',
            body: JSON.stringify({
                name: name,
                business_rule: businessRule,
                description: desc
            })
        });

        if (res.ok) {
            const data = await res.json();
            const created = data.concept || data;
            closeModal("modalCreateExpenseConcept");
            await loadExpenseConcepts();
            const sel = document.getElementById("cxp_payable_type");
            if (sel) {
                sel.value = `concept_${created.id}`;
                onCxpPayableTypeChanged();
            }
            if (typeof showToast === 'function') {
                showToast(`Concepto "${created.name}" creado y asociado a regla de negocio`, 'success');
            } else {
                alert(`Concepto "${created.name}" creado exitosamente.`);
            }
        } else {
            const err = await res.json().catch(() => ({}));
            alert("Error al crear concepto: " + (err.detail || "Error en el servidor"));
        }
    } catch(err) {
        console.error("Error al crear concepto:", err);
        alert("Ocurrió un error de conexión al crear el concepto.");
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `<i class="fa-solid fa-save"></i> Guardar Concepto`;
        }
    }
}

export function onCxpPayableTypeChanged() {
    const sel = document.getElementById("cxp_payable_type");
    const opt = sel?.options[sel?.selectedIndex];
    const rule = opt?.getAttribute('data-rule') || sel?.value || 'costo_material_obra';
    const isMaterial = ['costo_material_obra', 'stock_almacen', 'compra_materiales'].includes(rule);
    const panel = document.getElementById("cxp_warehouse_matching_panel");
    if (panel) {
        if (isMaterial) {
            panel.style.display = 'block';
            loadUnbilledWarehouseEntries();
        } else {
            panel.style.display = 'none';
        }
    }
}

export function onCxpWarehouseModeChange() {
    const isLink = document.getElementById("cxp_wh_mode_link")?.checked;
    const linkView = document.getElementById("cxp_wh_link_view");
    const newView = document.getElementById("cxp_wh_new_view");
    const lblLink = document.getElementById("lbl_wh_mode_link");
    const lblNew = document.getElementById("lbl_wh_mode_new");

    if (isLink) {
        if (linkView) linkView.classList.remove("hidden");
        if (newView) newView.classList.add("hidden");
        if (lblLink) lblLink.style.borderColor = "#86efac";
        if (lblNew) lblNew.style.borderColor = "#cbd5e1";
    } else {
        if (linkView) linkView.classList.add("hidden");
        if (newView) newView.classList.remove("hidden");
        if (lblLink) lblLink.style.borderColor = "#cbd5e1";
        if (lblNew) lblNew.style.borderColor = "#86efac";

        const tbody = document.getElementById("cxp_materials_tbody");
        if (tbody && tbody.children.length === 0) {
            addCxpMaterialRow();
        }
    }
}

export function onCxpWarehouseEntrySelected() {
    const selVal = document.getElementById("cxp_warehouse_entry_id")?.value;
    const detailsEl = document.getElementById("cxp_wh_entry_details");
    if (!selVal) {
        if (detailsEl) detailsEl.classList.add("hidden");
        return;
    }

    const entry = (unbilledWarehouseEntriesCache || []).find(e => String(e.id) === String(selVal));
    if (entry && detailsEl) {
        detailsEl.classList.remove("hidden");
        detailsEl.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span><strong>Entrada #${entry.id}:</strong> ${entry.material_name} (${entry.quantity} ${entry.unit_measure})</span>
                <span style="font-weight: 800; color: #16a34a;">Est: $${Number(entry.total_cost_usd || 0).toFixed(2)}</span>
            </div>
            <div style="font-size: 10px; color: #64748b; margin-top: 3px;">
                Doc. Ref: <strong>${entry.reference_doc || 'S/N'}</strong> | Destino: ${entry.destination} | Fecha: ${entry.movement_date || '-'}
            </div>
        `;

        // Autofill sugerido en monto y descripción si están vacíos
        const amtInput = document.getElementById("cxp_amount_usd");
        if (amtInput && (!amtInput.value || parseFloat(amtInput.value) === 0)) {
            amtInput.value = Number(entry.total_cost_usd || 0).toFixed(2);
            if (typeof window !== "undefined" && typeof window.calcPayablePreview === "function") { window.calcPayablePreview(); }
        }

        const descInput = document.getElementById("cxp_description");
        if (descInput && (!descInput.value || descInput.value.trim() === '')) {
            descInput.value = `Compra de ${entry.quantity} ${entry.unit_measure} de ${entry.material_name} (Entrada #${entry.id})`;
        }
    }
}

export function addCxpMaterialRow(preselectedId = null, prefilledCost = null) {
    const tbody = document.getElementById("cxp_materials_tbody");
    if (!tbody) return;

    const materials = (window.allMaterials && window.allMaterials.length > 0) ? window.allMaterials : (allMaterials || []);
    let matOpts = `<option value="">-- Seleccionar Material --</option>`;
    matOpts += `<option value="__NEW__" style="color: #2563eb; font-weight: 800;">+ Crear Nuevo Artículo en Catálogo...</option>`;
    matOpts += materials.map(m => `<option value="${m.id}" data-cost="${m.unit_cost_usd || 0}" ${preselectedId && Number(m.id) === Number(preselectedId) ? 'selected' : ''}>[${m.code || m.id}] ${m.name} (${m.unit || m.unit_measure || 'UND'})</option>`).join('');

    const initialCost = (prefilledCost !== null && !isNaN(prefilledCost)) ? prefilledCost : 0.00;

    const tr = document.createElement("tr");
    tr.style.borderBottom = "1px solid #f1f5f9";
    tr.innerHTML = `
        <td style="padding: 6px 8px;">
            <select class="cxp-mat-item-id form-select" onchange="onCxpMaterialRowMatChanged(this)" style="font-size: 11px; padding: 4px 6px;">
                ${matOpts}
            </select>
        </td>
        <td style="padding: 6px 8px;">
            <input type="number" step="0.01" min="0.01" value="1.0" class="cxp-mat-item-qty form-input" oninput="calcCxpMaterialsTotal()" style="font-size: 11px; padding: 4px 6px; font-weight: 700;">
        </td>
        <td style="padding: 6px 8px;">
            <input type="number" step="0.01" min="0" value="${Number(initialCost).toFixed(2)}" class="cxp-mat-item-cost form-input" oninput="calcCxpMaterialsTotal()" style="font-size: 11px; padding: 4px 6px; font-weight: 700; color: #166534;">
        </td>
        <td class="cxp-mat-item-subtotal" style="padding: 6px 8px; text-align: right; font-weight: 800; color: #0f172a; font-size: 11px;">
            $${Number(initialCost).toFixed(2)}
        </td>
        <td style="padding: 6px 8px; text-align: center;">
            <button type="button" onclick="removeCxpMaterialRow(this)" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 12px;" title="Eliminar fila">
                <i class="fa-solid fa-trash-can"></i>
            </button>
        </td>
    `;
    tbody.appendChild(tr);
    calcCxpMaterialsTotal();
}

export function onCxpMaterialRowMatChanged(sel) {
    if (sel.value === "__NEW__") {
        sel.value = "";
        if (typeof window.openNewMaterialModalFromCxp === 'function') {
            window.openNewMaterialModalFromCxp();
        } else if (typeof openNewMaterialModal === 'function') {
            openNewMaterialModal(true);
        }
        return;
    }
    const tr = sel.closest("tr");
    if (!tr) return;
    const selectedOpt = sel.options[sel.selectedIndex];
    const cost = parseFloat(selectedOpt?.dataset?.cost) || 0;
    const costInput = tr.querySelector(".cxp-mat-item-cost");
    if (costInput && (!costInput.value || parseFloat(costInput.value) === 0)) {
        costInput.value = cost.toFixed(2);
    }
    calcCxpMaterialsTotal();
}

export function onMaterialCreatedFromCxp(newMat) {
    if (newMat && newMat.id) {
        if (!window.allMaterials) window.allMaterials = [];
        const exists = window.allMaterials.some(m => Number(m.id) === Number(newMat.id));
        if (!exists) {
            window.allMaterials.unshift({
                id: newMat.id,
                code: newMat.code,
                name: newMat.name,
                category: newMat.category,
                unit: newMat.unit || newMat.unit_measure || 'UND',
                unit_measure: newMat.unit_measure || 'UND',
                unit_cost_usd: newMat.unit_cost_usd || 0.0,
                stock_quantity: newMat.stock_quantity || 0.0
            });
        }
    }

    // Actualizar los selectores en todas las filas existentes para incluir el nuevo ítem
    const rows = document.querySelectorAll("#cxp_materials_tbody tr");
    rows.forEach(tr => {
        const sel = tr.querySelector(".cxp-mat-item-id");
        if (sel) {
            const currentVal = sel.value;
            const materials = (window.allMaterials && window.allMaterials.length > 0) ? window.allMaterials : (allMaterials || []);
            let opts = `<option value="">-- Seleccionar Material --</option>`;
            opts += `<option value="__NEW__" style="color: #2563eb; font-weight: 800;">+ Crear Nuevo Artículo en Catálogo...</option>`;
            opts += materials.map(m => `<option value="${m.id}" data-cost="${m.unit_cost_usd || 0}">[${m.code || m.id}] ${m.name} (${m.unit || m.unit_measure || 'UND'})</option>`).join('');
            sel.innerHTML = opts;
            if (currentVal && currentVal !== "__NEW__") {
                sel.value = currentVal;
            }
        }
    });

    // Añadir automáticamente la fila con el nuevo material seleccionado y su costo cargado
    if (newMat && newMat.id) {
        addCxpMaterialRow(newMat.id, newMat.unit_cost_usd || 0.0);
    }

    if (typeof showToastNotification === 'function') {
        showToastNotification(`✅ Artículo "${newMat.name}" registrado e insertado en la lista de compras de CxP.`, 'success');
    } else {
        alert(`✅ Artículo "${newMat.name}" registrado e insertado en la lista de compras de CxP.`);
    }
}

export function removeCxpMaterialRow(btn) {
    const tr = btn.closest("tr");
    if (tr) tr.remove();
    calcCxpMaterialsTotal();
}

export function calcCxpMaterialsTotal() {
    const rows = document.querySelectorAll("#cxp_materials_tbody tr");
    let total = 0;
    rows.forEach(tr => {
        const qty = parseFloat(tr.querySelector(".cxp-mat-item-qty")?.value) || 0;
        const cost = parseFloat(tr.querySelector(".cxp-mat-item-cost")?.value) || 0;
        const sub = qty * cost;
        total += sub;
        const subEl = tr.querySelector(".cxp-mat-item-subtotal");
        if (subEl) subEl.textContent = `$${sub.toFixed(2)}`;
    });

    const totalEl = document.getElementById("cxp_materials_total_usd");
    if (totalEl) totalEl.textContent = `$${total.toFixed(2)}`;
    return total;
}

export function applyCxpMaterialsTotalToAmount() {
    const total = calcCxpMaterialsTotal();
    const amtInput = document.getElementById("cxp_amount_usd");
    if (amtInput) {
        amtInput.value = total.toFixed(2);
        if (typeof window !== "undefined" && typeof window.calcPayablePreview === "function") { window.calcPayablePreview(); }
    }
}
