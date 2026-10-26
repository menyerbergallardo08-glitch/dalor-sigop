/**
 * DALOR SIGO-P | Módulo: DISPATCH_PICKER.JS
 * Modal selector unificado de recursos para guías de despacho (Herramientas, Maquinaria y Materiales en Stock).
 * Incluye selector jerárquico agrupado por modelo para herramientas repetitivas (evita listas interminables).
 */

var API_BASE = window.API_BASE || (window.location.origin + "/api/v1");

function authFetch(url, options = {}) {
    var _t = sessionStorage.getItem('dalor_token') || localStorage.getItem('dalor_token') || '';
    var _h = Object.assign({}, options.headers || {});
    if (_t) _h['Authorization'] = 'Bearer ' + _t;
    return window.fetch(url, Object.assign({}, options, { headers: _h }));
}

let currentPickerTab = 'tools';
let pickerSelectedResources = new Map(); // key: 'type-id' o 'group-KEY', val: metadata
let pickerToolGroups = new Map();

export async function openDispatchResourcePickerModal() {
    pickerSelectedResources.clear();
    pickerToolGroups.clear();
    updatePickerSelectedCount();
    if (typeof openModal === 'function') {
        openModal('modalDispatchResourcePicker');
    } else {
        const el = document.getElementById('modalDispatchResourcePicker');
        if (el) el.classList.remove('hidden');
    }
    await switchDispatchPickerTab('tools');
}

export async function switchDispatchPickerTab(tab) {
    currentPickerTab = tab;
    const btnTools = document.getElementById('tab_disp_pick_tools');
    const btnMach = document.getElementById('tab_disp_pick_machinery');
    const btnMats = document.getElementById('tab_disp_pick_materials');

    if (btnTools) btnTools.className = (tab === 'tools') ? 'btn-primary' : 'btn-secondary';
    if (btnMach) btnMach.className = (tab === 'machinery') ? 'btn-primary' : 'btn-secondary';
    if (btnMats) btnMats.className = (tab === 'materials') ? 'btn-primary' : 'btn-secondary';

    const searchInput = document.getElementById('disp_picker_search');
    if (searchInput) searchInput.value = '';

    await renderDispatchPickerItems();
}

function getAssetKind(a) {
    const t = (a.asset_type || '').toLowerCase();
    const c = (a.category || '').toLowerCase();
    const code = (a.asset_code || a.code || '').toLowerCase();
    const name = (a.name || '').toLowerCase();

    // 1. Vehículos
    if (t.includes('veh') || c.includes('veh') || code.includes('-v-') || Boolean(a.license_plate)) {
        return 'vehiculo';
    }

    // 2. Maquinaria y Equipos Mayores
    const machKeywords = [
        'torno', 'fresadora', 'generador', 'compresor', 'maquina de soldar', 
        'soldadora', 'plasma', 'prensa', 'plegadora', 'cilindradora', 
        'taladro de columna', 'taladro radial', 'grua', 'montacarga', 'retroexcavadora'
    ];
    if (t.includes('maquinaria') || t.includes('pesado') || machKeywords.some(k => name.includes(k))) {
        return 'machinery';
    }

    // 3. Todo lo demás son herramientas y equipos de taller
    return 'tools';
}

function isUnitAvailableInBase(a) {
    const st = (a.status || 'disponible_base').toLowerCase().trim();
    const isInactive = a.is_active === false;
    const isAssigned = Boolean(a.current_project_id);
    const isUnavail = isInactive || isAssigned || 
        ['en_obra', 'asignado', 'alquilado_a_tercero', 'en_mantenimiento', 'mantenimiento', 'en_reparacion', 'reparacion', 'inactivo', 'desincorporado', 'no_disponible'].includes(st);
    return !isUnavail;
}

export async function renderDispatchPickerItems(filterText = '') {
    const container = document.getElementById('disp_picker_list_container');
    const counterBadge = document.getElementById('disp_picker_items_count');
    if (!container) return;

    container.innerHTML = '<div style="text-align: center; padding: 25px; color: #64748b;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando...</div>';

    try {
        let items = [];

        if (currentPickerTab === 'tools' || currentPickerTab === 'machinery') {
            let assets = window.allAssets || [];
            if (assets.length === 0) {
                const res = await authFetch(`${API_BASE}/assets/`);
                if (res.ok) assets = window.allAssets = await res.json();
            }
            items = assets.filter(a => getAssetKind(a) === currentPickerTab);
        } else if (currentPickerTab === 'materials') {
            let materials = (typeof window !== 'undefined' && Array.isArray(window.allMaterials) && window.allMaterials.length > 0) ? window.allMaterials : [];
            if (materials.length === 0) {
                const res = await authFetch(`${API_BASE}/materials/`);
                if (res.ok) {
                    const mData = await res.json();
                    materials = window.allMaterials = Array.isArray(mData) ? mData : (mData.materials || mData.items || []);
                }
            }
            items = Array.isArray(materials) ? materials : [];
        }

        // Conteo de badges en pestañas
        const cTools = document.getElementById('count_picker_tools');
        const cMach = document.getElementById('count_picker_machinery');
        const cMats = document.getElementById('count_picker_materials');
        if (window.allAssets && window.allAssets.length > 0) {
            if (cTools) cTools.textContent = window.allAssets.filter(a => getAssetKind(a) === 'tools').length;
            if (cMach) cMach.textContent = window.allAssets.filter(a => getAssetKind(a) === 'machinery').length;
        }
        if (Array.isArray(window.allMaterials) && cMats) {
            cMats.textContent = window.allMaterials.length;
        }

        const query = filterText.toLowerCase().trim();

        // ======================================================================
        // 🛠️ RENDERIZADO ESPECIAL AGRUPADO PARA HERRAMIENTAS (SELECTOR DE 2 PASOS)
        // ======================================================================
        if (currentPickerTab === 'tools') {
            const groupsMap = new Map();
            items.forEach(a => {
                const name = (a.name || 'Herramienta').trim();
                const key = name.toUpperCase();
                if (!groupsMap.has(key)) {
                    groupsMap.set(key, {
                        key: key,
                        name: name,
                        brand: a.brand || '',
                        units: []
                    });
                }
                groupsMap.get(key).units.push(a);
            });

            pickerToolGroups = groupsMap;

            // Filtrar grupos
            const filteredGroups = Array.from(groupsMap.values()).filter(g => {
                if (!query) return true;
                const matchesName = g.name.toLowerCase().includes(query);
                const matchesBrand = g.brand.toLowerCase().includes(query);
                const matchesUnit = g.units.some(u => 
                    (u.asset_code || '').toLowerCase().includes(query) ||
                    (u.serial_number || '').toLowerCase().includes(query)
                );
                return matchesName || matchesBrand || matchesUnit;
            });

            if (counterBadge) counterBadge.textContent = `${filteredGroups.length} modelos de herramienta`;

            if (filteredGroups.length === 0) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 30px; color: #94a3b8;">
                        <i class="fa-solid fa-box-open" style="font-size: 24px; margin-bottom: 6px;"></i>
                        <p style="margin: 0; font-size: 12px;">No se encontraron herramientas con la búsqueda.</p>
                    </div>`;
                return;
            }

            let html = '<div style="display: flex; flex-direction: column; gap: 8px;">';
            filteredGroups.forEach(g => {
                const availableUnits = g.units.filter(isUnitAvailableInBase);
                const totalUnits = g.units.length;
                const availCount = availableUnits.length;
                const isGroupDisabled = (availCount === 0);

                const itemKey = `toolgrp-${encodeURIComponent(g.key)}`;
                const existingSelected = pickerSelectedResources.get(itemKey);
                const isChecked = !!existingSelected;
                const selectedQty = existingSelected ? existingSelected.qty : 1;
                const selectedUnitId = existingSelected ? (existingSelected.specificUnitId || '') : '';

                let unitOptionsHtml = `<option value="">⚡ Cualquier unidad disponible en base (${availCount} disp.)</option>`;
                availableUnits.forEach(u => {
                    const sn = u.serial_number ? ` | S/N: ${u.serial_number}` : '';
                    const loc = (u.current_location && u.current_location !== 'Base') ? ` [${u.current_location}]` : '';
                    unitOptionsHtml += `<option value="${u.id}" ${String(selectedUnitId) === String(u.id) ? 'selected' : ''}>🔧 [${u.asset_code || 'HERR'}]${sn}${loc}</option>`;
                });

                html += `
                    <div style="background: #fff; border: 1.5px solid ${isChecked ? '#3b82f6' : '#e2e8f0'}; border-radius: 8px; padding: 10px 12px; transition: all 0.15s ease;">
                        <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px;">
                            <label style="display: flex; align-items: center; gap: 10px; flex: 1; cursor: pointer; margin: 0;">
                                <input type="checkbox" onchange="togglePickerToolGroupSelection('${encodeURIComponent(g.key)}', this.checked)" ${isChecked ? 'checked' : ''} ${isGroupDisabled ? 'disabled' : ''} style="width: 17px; height: 17px; cursor: pointer;">
                                <div>
                                    <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                                        <span style="font-size: 12.5px; font-weight: 800; color: #1e293b;">
                                            ${g.name}
                                        </span>
                                        ${g.brand ? `<span style="font-size: 11px; color: #64748b; font-weight: 600;">(${g.brand})</span>` : ''}
                                    </div>
                                    <span style="font-size: 10.5px; color: #64748b;">
                                        Total inventario: ${totalUnits} unidades registradas
                                    </span>
                                </div>
                            </label>
                            <div>
                                <span style="font-size: 10.5px; font-weight: 800; color: ${availCount > 0 ? '#854d0e' : '#ef4444'}; background: ${availCount > 0 ? '#fef9c3' : '#fef2f2'}; border: 1px solid ${availCount > 0 ? '#fde047' : '#fecaca'}; padding: 3px 8px; border-radius: 9999px;">
                                    ${availCount > 0 ? `⚡ ${availCount} disp. en base` : '⛔ NO DISPONIBLE'}
                                </span>
                            </div>
                        </div>

                        <!-- Selector Jerárquico de 2 Pasos (Serial / Unidad Física & Cantidad) -->
                        <div style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed #e2e8f0; display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap;">
                            <div style="display: flex; align-items: center; gap: 6px; flex: 1; min-width: 200px;">
                                <span style="font-size: 11px; font-weight: 700; color: #475569; white-space: nowrap;">Unidad física:</span>
                                <select id="picker_unit_${itemKey}" 
                                        onchange="onPickerToolUnitSelectChanged('${encodeURIComponent(g.key)}', this.value)" 
                                        ${isGroupDisabled ? 'disabled' : ''}
                                        style="flex: 1; min-width: 150px; padding: 4px 6px; font-size: 11px; border: 1px solid #cbd5e1; border-radius: 4px; background: #f8fafc;">
                                    ${unitOptionsHtml}
                                </select>
                            </div>
                            <div style="display: flex; align-items: center; gap: 6px;">
                                <span style="font-size: 11px; font-weight: 700; color: #475569;">Cant:</span>
                                <input type="number" min="1" max="${availCount || 1}" value="${selectedQty}" 
                                       id="picker_qty_${itemKey}" 
                                       onchange="onPickerToolGroupQuantityChanged('${encodeURIComponent(g.key)}', this.value)" 
                                       oninput="onPickerToolGroupQuantityChanged('${encodeURIComponent(g.key)}', this.value)" 
                                       ${(isGroupDisabled || selectedUnitId) ? 'disabled' : ''}
                                       style="width: 60px; padding: 4px 6px; font-size: 11.5px; text-align: center; border: 1.5px solid #cbd5e1; border-radius: 4px; font-weight: 800; background: white;">
                                <span style="font-size: 11px; font-weight: 700; color: #64748b;">Unid</span>
                            </div>
                        </div>
                    </div>
                `;
            });
            html += '</div>';
            container.innerHTML = html;
            return;
        }

        // ======================================================================
        // 🚜 RENDERIZADO DIRECTO PARA MAQUINARIA Y MATERIALES
        // ======================================================================
        const filtered = items.filter(it => {
            if (!query) return true;
            const name = (it.name || '').toLowerCase();
            const code = (it.asset_code || it.code || it.internal_code || '').toLowerCase();
            const brand = (it.brand || '').toLowerCase();
            const model = (it.model || '').toLowerCase();
            const serial = (it.serial_number || '').toLowerCase();
            return name.includes(query) || code.includes(query) || brand.includes(query) || model.includes(query) || serial.includes(query);
        });

        if (counterBadge) counterBadge.textContent = `${filtered.length} disponibles`;

        if (filtered.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 30px; color: #94a3b8;">
                    <i class="fa-solid fa-box-open" style="font-size: 24px; margin-bottom: 6px;"></i>
                    <p style="margin: 0; font-size: 12px;">No se encontraron ítems que coincidan con la búsqueda.</p>
                </div>`;
            return;
        }

        let html = '<div style="display: flex; flex-direction: column; gap: 6px;">';
        filtered.forEach(it => {
            const itemType = (currentPickerTab === 'materials') ? 'mat' : 'asset';
            const itemKey = `${itemType}-${it.id}`;
            const existingSelected = pickerSelectedResources.get(itemKey);
            const isChecked = !!existingSelected;
            const code = it.asset_code || it.code || it.internal_code || 'S/C';
            const name = it.name || 'Sin Nombre';
            const unitDisplay = (currentPickerTab === 'materials') ? (it.unit_measure || 'UND') : 'UND';
            const selectedQty = existingSelected ? existingSelected.qty : 1;
            const extra = (currentPickerTab === 'materials')
                ? `Stock: ${it.stock_quantity ?? it.stock ?? 0} ${it.unit_measure || 'UND'}`
                : `Marca: ${it.brand || 'N/A'} | Ubicación: ${it.current_location || 'Base'}`;
            const badgeColor = (currentPickerTab === 'machinery') ? '#e0e7ff; color: #3730a3;' : '#d1fae5; color: #065f46;';

            html += `
                <label style="display: flex; align-items: center; justify-content: space-between; background: #fff; border: 1.5px solid ${isChecked ? '#3b82f6' : '#e2e8f0'}; border-radius: 6px; padding: 8px 12px; cursor: pointer; transition: all 0.15s ease;">
                    <div style="display: flex; align-items: center; gap: 10px; flex: 1;">
                        <input type="checkbox" onchange="togglePickerItemSelection('${itemKey}', '${itemType}', ${it.id}, this.checked)" ${isChecked ? 'checked' : ''} style="width: 16px; height: 16px; cursor: pointer;">
                        <div>
                            <div style="display: flex; align-items: center; gap: 6px;">
                                <span style="font-family: monospace; font-size: 11px; font-weight: 800; background: ${badgeColor} padding: 2px 6px; border-radius: 4px;">
                                    ${code}
                                </span>
                                <span style="font-size: 12px; font-weight: 700; color: #1e293b;">
                                    ${name}
                                </span>
                            </div>
                            <span style="font-size: 11px; color: #64748b;">
                                ${extra}
                            </span>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="display: flex; align-items: center; gap: 4px;" onclick="event.stopPropagation()">
                            <span style="font-size: 11px; font-weight: 700; color: #475569;">Cant:</span>
                            <input type="number" step="0.01" min="0.01" value="${selectedQty}" 
                                   id="picker_qty_${itemKey}" 
                                   onchange="onPickerQuantityChanged('${itemKey}', this.value)" 
                                   oninput="onPickerQuantityChanged('${itemKey}', this.value)" 
                                   style="width: 72px; padding: 3px 6px; font-size: 11.5px; text-align: right; border: 1.5px solid #cbd5e1; border-radius: 4px; font-weight: 800; background: white;">
                            <span style="font-size: 11px; font-weight: 700; color: #64748b; min-width: 25px;">${unitDisplay}</span>
                        </div>
                        <span style="font-size: 10px; font-weight: 700; color: ${it.is_active !== false ? '#10b981' : '#ef4444'}; background: ${it.is_active !== false ? '#ecfdf5' : '#fef2f2'}; padding: 2px 8px; border-radius: 9999px;">
                            ${it.is_active !== false ? 'DISPONIBLE' : 'NO DISPONIBLE'}
                        </span>
                    </div>
                </label>
            `;
        });
        html += '</div>';
        container.innerHTML = html;
    } catch (err) {
        console.error('Error renderizando ítems en picker:', err);
        container.innerHTML = '<div style="color: #ef4444; padding: 20px; text-align: center;">Error al cargar recursos.</div>';
    }
}

export function filterDispatchPickerList(text) {
    renderDispatchPickerItems(text);
}

export function onPickerQuantityChanged(key, val) {
    const qty = parseFloat(val) || 1.0;
    if (pickerSelectedResources.has(key)) {
        const item = pickerSelectedResources.get(key);
        item.qty = qty;
        pickerSelectedResources.set(key, item);
    }
}

export function onPickerToolGroupQuantityChanged(encodedGroupKey, val) {
    const groupKey = decodeURIComponent(encodedGroupKey);
    const itemKey = `toolgrp-${encodedGroupKey}`;
    const qty = parseInt(val, 10) || 1;
    if (pickerSelectedResources.has(itemKey)) {
        const item = pickerSelectedResources.get(itemKey);
        item.qty = qty;
        pickerSelectedResources.set(itemKey, item);
    }
}

export function onPickerToolUnitSelectChanged(encodedGroupKey, unitId) {
    const itemKey = `toolgrp-${encodedGroupKey}`;
    const qtyInput = document.getElementById(`picker_qty_${itemKey}`);

    if (unitId) {
        if (qtyInput) {
            qtyInput.value = "1";
            qtyInput.disabled = true;
        }
    } else {
        if (qtyInput) {
            qtyInput.disabled = false;
        }
    }

    if (pickerSelectedResources.has(itemKey)) {
        const item = pickerSelectedResources.get(itemKey);
        item.specificUnitId = unitId ? parseInt(unitId) : null;
        item.qty = unitId ? 1 : (parseInt(qtyInput ? qtyInput.value : 1, 10) || 1);
        pickerSelectedResources.set(itemKey, item);
    }
}

export function togglePickerToolGroupSelection(encodedGroupKey, isChecked) {
    const groupKey = decodeURIComponent(encodedGroupKey);
    const itemKey = `toolgrp-${encodedGroupKey}`;
    const group = pickerToolGroups.get(groupKey);

    if (isChecked && group) {
        const availableUnits = group.units.filter(isUnitAvailableInBase);
        const unitSelect = document.getElementById(`picker_unit_${itemKey}`);
        const qtyInput = document.getElementById(`picker_qty_${itemKey}`);

        const specificUnitId = unitSelect && unitSelect.value ? parseInt(unitSelect.value) : null;
        const qtyVal = specificUnitId ? 1 : (parseInt(qtyInput ? qtyInput.value : 1, 10) || 1);

        pickerSelectedResources.set(itemKey, {
            type: 'tool_group',
            groupKey: groupKey,
            name: group.name,
            brand: group.brand,
            category: 'tools',
            specificUnitId: specificUnitId,
            candidates: availableUnits,
            qty: qtyVal,
            unit: 'Unid',
            cond: 'Operativo / En Custodia'
        });
    } else {
        pickerSelectedResources.delete(itemKey);
    }
    updatePickerSelectedCount();
}

export function togglePickerItemSelection(key, type, id, isChecked) {
    if (isChecked) {
        let name = "";
        let code = "";
        let unit = "Unid";
        let cond = "Operativo / En Custodia";
        let category = currentPickerTab;

        if (type === 'mat') {
            const m = (window.allMaterials || []).find(x => x.id === id);
            name = m ? m.name : "Material";
            code = m ? (m.code || 'S/C') : "S/C";
            unit = m ? (m.unit_measure || 'Kg') : "Kg";
            cond = "Material en Custodia / Salida de Almacén";
            category = 'materials';
        } else {
            const a = (window.allAssets || []).find(x => x.id === id);
            name = a ? a.name : "Activo";
            code = a ? (a.asset_code || a.internal_code || 'S/C') : "S/C";
            unit = "Unid";
            cond = "Operativo / Buen Estado";
            category = (currentPickerTab === 'machinery') ? 'machinery' : 'tools';
        }

        const qtyInput = document.getElementById(`picker_qty_${key}`);
        const qtyVal = parseFloat(qtyInput ? qtyInput.value : 1) || 1.0;

        pickerSelectedResources.set(key, {
            type,
            id,
            name,
            code,
            unit,
            cond,
            category,
            qty: qtyVal
        });
    } else {
        pickerSelectedResources.delete(key);
    }
    updatePickerSelectedCount();
    const container = document.getElementById('disp_picker_list_container');
    if (container) {
        const labels = container.querySelectorAll('label');
        labels.forEach(lbl => {
            const chk = lbl.querySelector('input[type="checkbox"]');
            if (chk) {
                lbl.style.borderColor = chk.checked ? '#3b82f6' : '#e2e8f0';
            }
        });
    }
}

export function updatePickerSelectedCount() {
    const el = document.getElementById('disp_picker_selected_count');
    if (el) el.textContent = pickerSelectedResources.size;
}

export function confirmAddSelectedResourcesToDispatch() {
    if (pickerSelectedResources.size === 0) {
        alert("Por favor selecciona al menos una herramienta, maquinaria o material.");
        return;
    }

    const tbody = document.getElementById('dispatchItemsTableBody');
    if (tbody && tbody.children.length === 1) {
        const firstDesc = tbody.children[0].querySelector('.disp-item-desc')?.value.trim();
        if (!firstDesc) {
            tbody.innerHTML = '';
        }
    }

    let addedCount = 0;
    const addFn = typeof window.addDispatchItemRow === 'function' ? window.addDispatchItemRow : null;
    if (!addFn) {
        alert("Error: No se encontró la función para añadir renglones de despacho.");
        return;
    }

    pickerSelectedResources.forEach(item => {
        if (item.type === 'tool_group') {
            // Manejo de Grupo Jerárquico de Herramientas
            if (item.specificUnitId) {
                // Unidad física específica seleccionada
                const unit = (item.candidates || []).find(u => u.id === item.specificUnitId) || 
                             (window.allAssets || []).find(u => u.id === item.specificUnitId);
                const code = unit ? (unit.asset_code || unit.internal_code || 'HERR') : 'HERR';
                const sn = unit && unit.serial_number ? ` S/N: ${unit.serial_number}` : '';
                const desc = `Herramienta: ${item.name} (${code}${sn})`;
                addFn(desc, 1, 'Unid', item.cond, 0, 'asset', item.specificUnitId);
                addedCount++;
            } else {
                // Cantidad múltiple de unidades disponibles del mismo modelo
                const candidates = (item.candidates || []).slice(0, item.qty);
                if (candidates.length === 0) {
                    addFn(`Herramienta: ${item.name}`, item.qty, 'Unid', item.cond, 0, 'asset', null);
                    addedCount++;
                } else if (candidates.length === 1) {
                    const c = candidates[0];
                    const desc = `Herramienta: ${item.name} (${c.asset_code || 'HERR'})`;
                    addFn(desc, 1, 'Unid', item.cond, 0, 'asset', c.id);
                    addedCount++;
                } else {
                    // Si son varias unidades, agregar cada una con su código individual
                    candidates.forEach(c => {
                        const sn = c.serial_number ? ` S/N: ${c.serial_number}` : '';
                        const desc = `Herramienta: ${item.name} (${c.asset_code || 'HERR'}${sn})`;
                        addFn(desc, 1, 'Unid', item.cond, 0, 'asset', c.id);
                        addedCount++;
                    });
                }
            }
        } else {
            // Maquinaria o Material estándar
            let desc = "";
            if (item.type === 'mat') {
                desc = `[${item.code}] ${item.name}`;
            } else {
                const prefix = (item.category === 'machinery') ? 'Maquinaria / Equipo' : 'Herramienta';
                desc = `${prefix}: ${item.name} (${item.code})`;
            }
            const resType = item.type === 'mat' ? 'material' : 'asset';
            addFn(desc, item.qty, item.unit, item.cond, 0, resType, item.id);
            addedCount++;
        }
    });

    if (typeof closeModal === 'function') {
        closeModal('modalDispatchResourcePicker');
    } else {
        const modal = document.getElementById('modalDispatchResourcePicker');
        if (modal) modal.classList.add('hidden');
    }

    if (typeof window.showToast === 'function') {
        window.showToast(`Se agregaron ${addedCount} recursos a la guía de despacho.`, 'success');
    } else {
        alert(`✅ Se agregaron ${addedCount} recursos a los renglones de la guía.`);
    }
}

if (typeof window !== 'undefined') {
    window.openDispatchResourcePickerModal = openDispatchResourcePickerModal;
    window.switchDispatchPickerTab = switchDispatchPickerTab;
    window.renderDispatchPickerItems = renderDispatchPickerItems;
    window.filterDispatchPickerList = filterDispatchPickerList;
    window.onPickerQuantityChanged = onPickerQuantityChanged;
    window.onPickerToolGroupQuantityChanged = onPickerToolGroupQuantityChanged;
    window.onPickerToolUnitSelectChanged = onPickerToolUnitSelectChanged;
    window.togglePickerToolGroupSelection = togglePickerToolGroupSelection;
    window.togglePickerItemSelection = togglePickerItemSelection;
    window.updatePickerSelectedCount = updatePickerSelectedCount;
    window.confirmAddSelectedResourcesToDispatch = confirmAddSelectedResourcesToDispatch;
}
