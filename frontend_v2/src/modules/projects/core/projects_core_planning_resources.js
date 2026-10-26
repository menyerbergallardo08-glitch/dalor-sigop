// Sigop ERP - Submódulo Proyectos Core
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

var allPersonnel = (typeof window !== 'undefined' && window.allPersonnel) || [];
var allAssets = (typeof window !== 'undefined' && window.allAssets) || [];
var allMaterials = (typeof window !== 'undefined' && window.allMaterials) || [];
var selectedPersonnelIds = (typeof window !== 'undefined' && window.selectedPersonnelIds) || [];
var selectedVehicleIds = (typeof window !== 'undefined' && window.selectedVehicleIds) || [];
var selectedToolIds = (typeof window !== 'undefined' && window.selectedToolIds) || [];
var selectedMaterialItems = (typeof window !== 'undefined' && window.selectedMaterialItems) || [];

export function onPlanToolModelSelected() {
    const sel = document.getElementById("plan_select_tools") || document.getElementById("plan_tool_select");
    const wrapper = document.getElementById("plan_tool_unit_wrapper");
    const unitSel = document.getElementById("plan_select_tool_unit");
    const qtyInp = document.getElementById("plan_tool_quantity");
    const labelEl = document.getElementById("plan_tool_selected_model_label");
    const badgeEl = document.getElementById("plan_tool_available_badge");

    if (!sel || !sel.value) {
        if (wrapper) wrapper.style.display = 'none';
        return;
    }

    const modelName = decodeURIComponent(sel.value);
    const allAss = (window.allAssets && window.allAssets.length > 0) ? window.allAssets : (allAssets || []);
    const availableUnits = allAss.filter(a => {
        const isVeh = ['vehiculo', 'camioneta'].includes((a.asset_type || '').toLowerCase()) ||
            (a.category && a.category.toLowerCase().includes('veh'));
        if (isVeh) return false;
        if ((a.name || '').trim().toUpperCase() !== modelName.toUpperCase()) return false;
        if (selectedToolIds && selectedToolIds.includes(a.id)) return false;
        if (a.status === 'en_obra' || a.status === 'alquilado_a_tercero' || a.status === 'en_mantenimiento' || a.status === 'inactivo') return false;
        return (!a.current_project_id || a.status === 'disponible_base' || a.status === 'disponible' || !a.status);
    });

    if (availableUnits.length === 0) {
        alert("⚠️ No quedan más unidades disponibles en base para este modelo.");
        sel.value = "";
        if (wrapper) wrapper.style.display = 'none';
        return;
    }

    if (labelEl) labelEl.textContent = modelName;
    if (badgeEl) badgeEl.textContent = `${availableUnits.length} disp.`;

    if (unitSel) {
        let unitOpts = `<option value="">⚡ Cualquier unidad disponible en base (${availableUnits.length} disp.)</option>`;
        availableUnits.forEach(u => {
            const snText = u.serial_number ? ` | S/N: ${u.serial_number}` : '';
            const locText = u.current_location && u.current_location !== 'Base' ? ` [${u.current_location}]` : '';
            unitOpts += `<option value="${u.id}">🔧 [${u.asset_code || 'HERR'}]${snText}${locText}</option>`;
        });
        unitSel.innerHTML = unitOpts;
        unitSel.value = "";
    }

    if (qtyInp) {
        qtyInp.value = "1";
        qtyInp.min = "1";
        qtyInp.max = availableUnits.length.toString();
        qtyInp.disabled = false;
    }

    if (wrapper) wrapper.style.display = 'block';
}

export function onPlanToolUnitSelected() {
    const unitSel = document.getElementById("plan_select_tool_unit");
    const qtyInp = document.getElementById("plan_tool_quantity");
    if (!unitSel || !qtyInp) return;

    if (unitSel.value) {
        qtyInp.value = "1";
        qtyInp.max = "1";
        qtyInp.disabled = true;
    } else {
        const sel = document.getElementById("plan_select_tools") || document.getElementById("plan_tool_select");
        const modelName = sel ? decodeURIComponent(sel.value) : '';
        const allAss = (window.allAssets && window.allAssets.length > 0) ? window.allAssets : (allAssets || []);
        const count = allAss.filter(a => {
            const isVeh = ['vehiculo', 'camioneta'].includes((a.asset_type || '').toLowerCase()) ||
                (a.category && a.category.toLowerCase().includes('veh'));
            if (isVeh) return false;
            if ((a.name || '').trim().toUpperCase() !== modelName.toUpperCase()) return false;
            if (selectedToolIds && selectedToolIds.includes(a.id)) return false;
            if (a.status === 'en_obra' || a.status === 'alquilado_a_tercero' || a.status === 'en_mantenimiento' || a.status === 'inactivo') return false;
            return (!a.current_project_id || a.status === 'disponible_base' || a.status === 'disponible' || !a.status);
        }).length;

        qtyInp.max = (count || 1).toString();
        qtyInp.disabled = false;
    }
}

export function onPlanMaterialSelected() {
    const sel = document.getElementById("plan_select_materials") || document.getElementById("plan_mat_select");
    const val = parseInt(sel?.value);
    const unitEl = document.getElementById("plan_mat_unit_label");
    const costEl = document.getElementById("plan_mat_cost_preview");
    if (!val) {
        if (unitEl) unitEl.innerText = "UND";
        if (costEl) costEl.innerText = "$0.00";
        return;
    }
    const safeMats = (window.allMaterials && window.allMaterials.length > 0) ? window.allMaterials : (allMaterials || []);
    const mat = safeMats.find(m => m.id === val);
    if (mat) {
        if (unitEl) unitEl.innerText = mat.unit_measure || "UND";
        if (costEl) costEl.innerText = `$${(mat.unit_cost_usd || 0).toFixed(2)}`;
    }
}

export function updatePlanMaterialsCostTotal() {
    const items = window.selectedMaterialItems || [];
    const totalMatCost = items.reduce((acc, it) => acc + ((it.quantity || 0) * (it.unit_cost_usd || 0)), 0);
    const badge = document.getElementById("plan_materials_total_cost_badge");
    if (badge) {
        badge.innerText = `$${totalMatCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;
    }
    const matBudgetInp = document.getElementById("new_proj_materials");
    if (matBudgetInp) {
        matBudgetInp.value = totalMatCost.toFixed(2);
        if (typeof recalcProjectBudgetPreview === 'function') {
            recalcProjectBudgetPreview();
        }
    }
}

export function addPlanResource(type) {
    if (type === 'personnel') {
        const sel = document.getElementById("plan_select_personnel") || document.getElementById("plan_pers_select");
        const val = parseInt(sel?.value);
        if (val && !selectedPersonnelIds.includes(val)) {
            selectedPersonnelIds.push(val);
            if (typeof window !== "undefined") window.selectedPersonnelIds = selectedPersonnelIds;
            renderAssignedTags();
        }
        if (sel) sel.value = "";
    } else if (type === 'fleet' || type === 'vehicle') {
        const sel = document.getElementById("plan_select_fleet") || document.getElementById("plan_veh_select");
        const val = parseInt(sel?.value);
        if (val && !selectedVehicleIds.includes(val)) {
            selectedVehicleIds.push(val);
            if (typeof window !== "undefined") window.selectedVehicleIds = selectedVehicleIds;
            renderAssignedTags();
        }
        if (sel) sel.value = "";
    } else if (type === 'tools' || type === 'tool') {
        const modelSel = document.getElementById("plan_select_tools") || document.getElementById("plan_tool_select");
        const unitSel = document.getElementById("plan_select_tool_unit");
        const qtyInp = document.getElementById("plan_tool_quantity");
        const wrapper = document.getElementById("plan_tool_unit_wrapper");

        const modelVal = modelSel?.value;
        if (!modelVal) {
            alert("⚠️ Por favor selecciona un modelo o equipo primero.");
            return;
        }

        const specificUnitId = parseInt(unitSel?.value);
        const qty = parseInt(qtyInp?.value || "1", 10) || 1;
        const allAss = (window.allAssets && window.allAssets.length > 0) ? window.allAssets : (allAssets || []);

        if (specificUnitId && !isNaN(specificUnitId)) {
            if (!selectedToolIds.includes(specificUnitId)) {
                selectedToolIds.push(specificUnitId);
            }
        } else {
            const modelName = decodeURIComponent(modelVal).trim().toUpperCase();
            const candidates = allAss.filter(a => {
                const isVeh = ['vehiculo', 'camioneta'].includes((a.asset_type || '').toLowerCase()) ||
                    (a.category && a.category.toLowerCase().includes('veh'));
                if (isVeh) return false;
                if ((a.name || '').trim().toUpperCase() !== modelName) return false;
                if (selectedToolIds.includes(a.id)) return false;
                if (a.status === 'en_obra' || a.status === 'alquilado_a_tercero' || a.status === 'en_mantenimiento' || a.status === 'inactivo') return false;
                return (!a.current_project_id || a.status === 'disponible_base' || a.status === 'disponible' || !a.status);
            });

            if (candidates.length === 0) {
                alert("⚠️ No hay unidades disponibles para este modelo.");
                return;
            }

            const toAdd = candidates.slice(0, qty);
            toAdd.forEach(c => {
                if (!selectedToolIds.includes(c.id)) selectedToolIds.push(c.id);
            });
        }

        renderAssignedTags();

        if (modelSel) modelSel.value = "";
        if (unitSel) unitSel.innerHTML = '<option value="">⚡ Cualquier unidad disponible en base</option>';
        if (qtyInp) {
            qtyInp.value = "1";
            qtyInp.disabled = false;
        }
        if (wrapper) wrapper.style.display = "none";

        populatePlanDropdownSelectors();
    } else if (type === 'material' || type === 'materials') {

        const sel = document.getElementById("plan_select_materials") || document.getElementById("plan_mat_select");
        const val = parseInt(sel?.value);
        if (!val) {
            alert("⚠️ Selecciona un material del catálogo antes de agregarlo.");
            return;
        }
        const qtyInp = document.getElementById("plan_mat_quantity");
        const qty = parseFloat(qtyInp?.value || 1);
        if (qty <= 0 || isNaN(qty)) {
            alert("⚠️ Ingresa una cantidad válida mayor a 0.");
            if (qtyInp) qtyInp.focus();
            return;
        }
        const safeMats = (window.allMaterials && window.allMaterials.length > 0) ? window.allMaterials : (allMaterials || []);
        const m = safeMats.find(item => item.id === val);
        if (!m) return;

        window.selectedMaterialItems = window.selectedMaterialItems || [];
        const existing = window.selectedMaterialItems.find(it => it.material_id === val);
        if (existing) {
            existing.quantity = Number((existing.quantity + qty).toFixed(2));
        } else {
            window.selectedMaterialItems.push({
                material_id: m.id,
                code: m.code,
                name: m.name,
                unit_measure: m.unit_measure || "UND",
                unit_cost_usd: m.unit_cost_usd || 0.0,
                quantity: qty,
                notes: ""
            });
        }
        if (!selectedMaterialIds.includes(val)) {
            selectedMaterialIds.push(val);
        }
        renderAssignedTags();
        updatePlanMaterialsCostTotal();
        if (sel) sel.value = "";
        if (qtyInp) qtyInp.value = "1";
        onPlanMaterialSelected();
    }
}

export function removePlanResource(type, id) {
    if (type === 'personnel') {
        selectedPersonnelIds = selectedPersonnelIds.filter(i => i !== id);
        if (typeof window !== "undefined") window.selectedPersonnelIds = selectedPersonnelIds;
    } else if (type === 'fleet' || type === 'vehicle') {
        selectedVehicleIds = selectedVehicleIds.filter(i => i !== id);
        if (typeof window !== "undefined") window.selectedVehicleIds = selectedVehicleIds;
    } else if (type === 'tools' || type === 'tool') {
        selectedToolIds = selectedToolIds.filter(i => i !== id);
        populatePlanDropdownSelectors();
    } else if (type === 'material' || type === 'materials') {
        selectedMaterialIds = selectedMaterialIds.filter(i => i !== id);
        window.selectedMaterialItems = (window.selectedMaterialItems || []).filter(it => it.material_id !== id);
        updatePlanMaterialsCostTotal();
    }
    renderAssignedTags();
}

export function assignPersonnelTag() {

    const sel = document.getElementById("plan_pers_select");

    const val = parseInt(sel.value);

    if (!val) return;

    if (!selectedPersonnelIds.includes(val)) {

        selectedPersonnelIds.push(val);

        renderAssignedTags();

    }

    sel.value = "";

}

export function removePersonnelTag(id) {

    selectedPersonnelIds = selectedPersonnelIds.filter(i => i !== id);

    renderAssignedTags();

}

export function assignVehicleTag() {

    const sel = document.getElementById("plan_veh_select");

    const val = parseInt(sel.value);

    if (!val) return;

    if (!selectedVehicleIds.includes(val)) {

        selectedVehicleIds.push(val);

        renderAssignedTags();

    }

    sel.value = "";

}

export function removeVehicleTag(id) {

    selectedVehicleIds = selectedVehicleIds.filter(i => i !== id);

    renderAssignedTags();

}

export function assignToolTag() {

    const sel = document.getElementById("plan_tool_select");

    const val = parseInt(sel.value);

    if (!val) return;

    if (!selectedToolIds.includes(val)) {

        selectedToolIds.push(val);

        renderAssignedTags();

    }

    sel.value = "";

}

export function removeToolTag(id) {
    selectedToolIds = selectedToolIds.filter(i => i !== id);
    renderAssignedTags();
    populatePlanDropdownSelectors();
}

export function renderAssignedTags() {

    // 1. Personal Tags

    const persContainer = document.getElementById("plan_tags_personnel") || document.getElementById("plan_pers_tags");

    if (persContainer) {

        if (selectedPersonnelIds.length === 0) {

            persContainer.innerHTML = `<span style="font-size:11px; color:#94a3b8;">Sin personal seleccionado. Selecciona arriba y pulsa '+'.</span>`;

        } else {

            persContainer.innerHTML = selectedPersonnelIds.map(id => {
                const p = (window.allPersonnel || allPersonnel || []).find(item => item.id === id);
                if (!p) return '';

                return `

                    <span class="resource-tag-pill" style="display:inline-flex; align-items:center; gap:6px; background:#eff6ff; color:#1e40af; border:1px solid #bfdbfe; padding:3px 8px; border-radius:9999px; font-size:11px; font-weight:700; margin:2px;">

                        <i class="fa-solid fa-user-check"></i> [${p.code}] ${p.full_name}

                        <button type="button" onclick="removePlanResource('personnel', ${p.id})" style="background:none; border:none; color:#ef4444; cursor:pointer; font-weight:bold; font-size:12px; line-height:1;">&times;</button>

                    </span>

                `;

            }).join('');

        }

    }



    // 2. Vehículos Tags

    const vehContainer = document.getElementById("plan_tags_fleet") || document.getElementById("plan_veh_tags");

    if (vehContainer) {

        if (selectedVehicleIds.length === 0) {

            vehContainer.innerHTML = `<span style="font-size:11px; color:#94a3b8;">Sin unidades asignadas. Selecciona arriba y pulsa '+'.</span>`;

        } else {

            vehContainer.innerHTML = selectedVehicleIds.map(id => {

                const v = allAssets.find(item => item.id === id);

                if (!v) return '';

                return `

                    <span class="resource-tag-pill" style="display:inline-flex; align-items:center; gap:6px; background:#f0fdf4; color:#166534; border:1px solid #bbf7d0; padding:3px 8px; border-radius:9999px; font-size:11px; font-weight:700; margin:2px;">

                        <i class="fa-solid fa-truck"></i> [${v.asset_code}] ${v.name}

                        <button type="button" onclick="removePlanResource('fleet', ${v.id})" style="background:none; border:none; color:#ef4444; cursor:pointer; font-weight:bold; font-size:12px; line-height:1;">&times;</button>

                    </span>

                `;

            }).join('');

        }

    }



    // 3. Herramientas Tags

    const toolContainer = document.getElementById("plan_tags_tools") || document.getElementById("plan_tool_tags");

    if (toolContainer) {

        if (selectedToolIds.length === 0) {

            toolContainer.innerHTML = `<span style="font-size:11px; color:#94a3b8;">Sin equipos seleccionados. Selecciona arriba y pulsa '+'.</span>`;

        } else {

            toolContainer.innerHTML = selectedToolIds.map(id => {

                const t = allAssets.find(item => item.id === id);

                if (!t) return '';

                return `

                    <span class="resource-tag-pill" style="display:inline-flex; align-items:center; gap:6px; background:#fffbeb; color:#92400e; border:1px solid #fde68a; padding:3px 8px; border-radius:9999px; font-size:11px; font-weight:700; margin:2px;">

                        <i class="fa-solid fa-wrench"></i> [${t.asset_code}] ${t.name}

                        <button type="button" onclick="removePlanResource('tools', ${t.id})" style="background:none; border:none; color:#ef4444; cursor:pointer; font-weight:bold; font-size:12px; line-height:1;">&times;</button>

                    </span>

                `;

            }).join('');
        }
    }

    // 4. Materiales & Insumos con Cantidades y Costo
    const matContainer = document.getElementById("plan_tags_materials") || document.getElementById("plan_mat_tags");
    if (matContainer) {
        const matItems = window.selectedMaterialItems || [];
        if (matItems.length === 0) {
            matContainer.innerHTML = `<span style="font-size:11px; color:#94a3b8; font-style:italic;">No hay insumos agregados a la lista de preparación. Selecciona un material arriba, ingresa la cantidad y pulsa '+ Agregar Insumo'.</span>`;
        } else {
            matContainer.innerHTML = `
                <div style="overflow-x:auto; border:1px solid #e2e8f0; border-radius:6px; background:white;">
                    <table style="width:100%; border-collapse:collapse; font-size:11.5px; text-align:left;">
                        <thead>
                            <tr style="background:#f1f5f9; color:#475569; font-weight:700; border-bottom:1px solid #e2e8f0;">
                                <th style="padding:6px 10px;">Código</th>
                                <th style="padding:6px 10px;">Material / Insumo</th>
                                <th style="padding:6px 10px; text-align:center;">Cantidad</th>
                                <th style="padding:6px 10px; text-align:right;">Costo Unit.</th>
                                <th style="padding:6px 10px; text-align:right;">Subtotal</th>
                                <th style="padding:6px 10px; text-align:center; width:40px;"></th>
                            </tr>
                        </thead>
                        <tbody>
                            ${matItems.map(it => {
                                const subtotal = (it.quantity * it.unit_cost_usd).toFixed(2);
                                return `
                                    <tr style="border-bottom:1px solid #f8fafc;">
                                        <td style="padding:6px 10px; font-family:monospace; font-weight:700; color:#334155;">${it.code}</td>
                                        <td style="padding:6px 10px; font-weight:600; color:#0f172a;">${it.name}</td>
                                        <td style="padding:6px 10px; text-align:center; font-weight:700; color:#0284c7;">${it.quantity} ${it.unit_measure}</td>
                                        <td style="padding:6px 10px; text-align:right; color:#64748b;">$${it.unit_cost_usd.toFixed(2)}</td>
                                        <td style="padding:6px 10px; text-align:right; font-weight:700; color:#166534;">$${subtotal}</td>
                                        <td style="padding:6px 10px; text-align:center;">
                                            <button type="button" onclick="removePlanResource('material', ${it.material_id})" style="background:none; border:none; color:#ef4444; cursor:pointer; font-weight:bold; font-size:14px;" title="Eliminar insumo">&times;</button>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }
    }
}
