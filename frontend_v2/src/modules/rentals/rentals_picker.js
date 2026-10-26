/**
 * DALOR SIGO-P | Módulo: RENTALS_PICKER.JS
 * Selector predictivo de recursos, agrupación jerárquica de herramientas por modelo
 * y administración de canasta multi-recurso de alquiler/préstamo.
 */

var API_BASE = window.API_BASE || (window.location.origin + "/api/v1");
var rentalCartItems = window.rentalCartItems = window.rentalCartItems || [];
var rentalCatalog = { heavyMachinery: [], fleetVehicles: [], tools: [], stockMaterials: [] };

function authFetch(url, options = {}) {
    var _t = sessionStorage.getItem('dalor_token') || localStorage.getItem('dalor_token') || window.authToken || '';
    var _h = Object.assign({}, options.headers || {});
    if (_t) _h['Authorization'] = 'Bearer ' + _t;
    if (options.body && !(options.body instanceof FormData) && !_h['Content-Type']) {
        _h['Content-Type'] = 'application/json';
    }
    if (options.body instanceof FormData) {
        delete _h['Content-Type'];
    }
    return window.fetch(url, Object.assign({}, options, { headers: _h }));
}

export function roundDec(val, dec) {
    const m = Math.pow(10, dec || 2);
    return Math.round(val * m) / m;
}

// --- POBLAR RECURSOS (MAQUINARIA, VEHÍCULOS, HERRAMIENTAS AGRUPADAS, MATERIALES) ---
export async function populateRentalResources() {
    const selectAsset = document.getElementById("rentalAssetId");
    if (!selectAsset) return;

    try {
        const [resA, resM] = await Promise.all([
            authFetch(`${API_BASE}/assets/`),
            authFetch(`${API_BASE}/materials/`)
        ]);
        if (resA.ok) window.allAssets = await resA.json();
        if (resM.ok) {
            const dataM = await resM.json();
            window.allMaterials = dataM.materials || dataM || [];
        }
    } catch(e) {
        console.warn("Error cargando recursos para alquiler/préstamo:", e);
    }

    const assets = window.allAssets || [];
    const materials = window.allMaterials || [];

    const heavyMachinery = [];
    const fleetVehicles = [];
    const rawTools = [];

    assets.forEach(a => {
        const aType = (a.asset_type || a.category || a.type || '').toLowerCase();
        const aCode = (a.asset_code || a.code || '').trim();
        const aName = (a.name || '').trim();
        
        const isAssigned = !!a.current_project_id;
        const rawStatus = (a.status || 'disponible_base').toLowerCase();
        const isAvailable = (rawStatus === 'disponible_base' || rawStatus === 'disponible') && !isAssigned && a.is_active !== false;
        
        let statusTag = '[DISPONIBLE]';
        let statusClass = 'available';
        if (rawStatus === 'alquilado_a_tercero') {
            statusTag = '[ALQUILADO A TERCERO]';
            statusClass = 'rented';
        } else if (rawStatus === 'prestado_a_cliente') {
            statusTag = '[PRESTADO / COMODATO]';
            statusClass = 'loaned';
        } else if (isAssigned || rawStatus === 'en_obra') {
            statusTag = '[COMPROMETIDO EN OBRA]';
            statusClass = 'assigned';
        } else if (rawStatus === 'en_mantenimiento') {
            statusTag = '[EN MANTENIMIENTO]';
            statusClass = 'maintenance';
        } else if (!isAvailable) {
            statusTag = `[NO DISPONIBLE - ${rawStatus.toUpperCase()}]`;
            statusClass = 'unavailable';
        }

        const optData = {
            id: a.id,
            code: aCode,
            name: aName,
            brand: a.brand || '',
            statusTag: statusTag,
            statusClass: statusClass,
            disabled: !isAvailable,
            itemType: 'asset',
            assetType: aType,
            location: a.current_location || 'Sede Central',
            serialNumber: a.serial_number || ''
        };

        if (aType.includes('maquinaria') || aType.includes('pesada') || aType.includes('planta') || aName.toLowerCase().includes('montacarga')) {
            heavyMachinery.push(optData);
        } else if (aType.includes('vehiculo') || aType.includes('transporte') || aType.includes('flota')) {
            fleetVehicles.push(optData);
        } else {
            rawTools.push(optData);
        }
    });

    // 🛠️ AGRUPACIÓN INTELIGENTE DE HERRAMIENTAS POR MODELO (Evita listas kilométricas)
    const toolGroupsMap = new Map();
    rawTools.forEach(t => {
        const key = (t.name || 'Herramienta').trim().toUpperCase();
        if (!toolGroupsMap.has(key)) {
            toolGroupsMap.set(key, {
                modelKey: key,
                name: t.name,
                brand: t.brand,
                units: []
            });
        }
        toolGroupsMap.get(key).units.push(t);
    });

    const tools = [];
    toolGroupsMap.forEach(group => {
        const availableUnits = group.units.filter(u => !u.disabled);
        const availCount = availableUnits.length;
        const totalUnits = group.units.length;

        if (totalUnits === 1) {
            tools.push(group.units[0]);
        } else {
            // Grupo Consolidado por Modelo
            tools.push({
                id: availableUnits.length > 0 ? availableUnits[0].id : group.units[0].id,
                code: `LOTE-${availCount}/${totalUnits}`,
                name: group.name,
                brand: group.brand,
                isGroup: true,
                availCount: availCount,
                totalUnits: totalUnits,
                availableUnits: availableUnits,
                allUnits: group.units,
                statusTag: availCount > 0 ? `[${availCount} DISP. EN BASE]` : `[AGOTADO (0/${totalUnits})]`,
                statusClass: availCount > 0 ? 'available' : 'unavailable',
                disabled: availCount === 0,
                itemType: 'asset',
                assetType: 'herramienta_grupo'
            });
        }
    });

    const stockMaterials = materials.map(m => {
        const isAvail = (m.stock_quantity > 0);
        return {
            id: m.id,
            code: (m.code || '').trim(),
            name: (m.name || '').trim(),
            unit: m.unit_measure || 'UND',
            stock: m.stock_quantity || 0,
            statusTag: isAvail ? `[STOCK: ${m.stock_quantity} ${m.unit_measure || 'UND'}]` : '[AGOTADO]',
            statusClass: isAvail ? 'available' : 'unavailable',
            disabled: !isAvail,
            itemType: 'material'
        };
    });

    rentalCatalog = { heavyMachinery, fleetVehicles, tools, stockMaterials };
    renderRentalResourceOptions('');
}

export function renderPredictiveResults(hm, fv, tl, sm, query) {
    const predEl = document.getElementById("rentalPredictiveResults");
    if (!predEl) return;

    const q = (query || '').trim();
    if (!q) {
        predEl.style.display = "none";
        predEl.innerHTML = "";
        return;
    }

    const allMatches = [];
    hm.forEach(item => allMatches.push({ ...item, groupIcon: '🚜', groupLabel: 'Maquinaria' }));
    fv.forEach(item => allMatches.push({ ...item, groupIcon: '🚚', groupLabel: 'Vehículo' }));
    tl.forEach(item => allMatches.push({ ...item, groupIcon: '🔧', groupLabel: 'Herramienta' }));
    sm.forEach(item => allMatches.push({ ...item, groupIcon: '📦', groupLabel: 'Material' }));

    if (allMatches.length === 0) {
        predEl.style.display = "block";
        predEl.innerHTML = `
            <div style="padding: 12px; text-align: center; color: #94a3b8; font-size: 11px;">
                <i class="fa-solid fa-triangle-exclamation"></i> No se encontraron recursos que coincidan con "<strong>${q}</strong>".
            </div>
        `;
        return;
    }

    predEl.style.display = "block";
    let predHtml = `
        <div style="padding: 5px 8px; font-size: 10px; font-weight: 800; color: #475569; text-transform: uppercase; background: #f8fafc; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between;">
            <span>Resultados predictivos (${allMatches.length})</span>
            <span style="font-weight: 600; color: #0284c7;">Clic para seleccionar</span>
        </div>
        <div style="max-height: 230px; overflow-y: auto;">
    `;

    allMatches.forEach(item => {
        const val = item.itemType === 'material' ? `mat_${item.id}` : `asset_${item.id}`;
        const isDis = item.disabled;
        const badgeBg = isDis ? '#fee2e2' : '#dcfce7';
        const badgeColor = isDis ? '#991b1b' : '#15803d';

        let displayName = item.name;
        try {
            const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
            displayName = displayName.replace(regex, '<span style="background: #fef08a; color: #854d0e; font-weight: 800; border-radius: 2px; padding: 0 2px;">$1</span>');
        } catch(e) {}

        predHtml += `
            <div onclick="selectPredictiveRentalResource('${val}')" 
                 style="padding: 7px 10px; border-bottom: 1px solid #f1f5f9; cursor: ${isDis ? 'not-allowed' : 'pointer'}; display: flex; justify-content: space-between; align-items: center; background: ${isDis ? '#fffafa' : '#ffffff'}; transition: background 0.15s;" 
                 onmouseover="if(!${isDis}) this.style.background='#f0f9ff'" 
                 onmouseout="if(!${isDis}) this.style.background='#ffffff'">
                <div style="display: flex; align-items: center; gap: 8px; overflow: hidden; flex: 1;">
                    <span style="font-size: 14px; flex-shrink: 0;">${item.groupIcon}</span>
                    <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        <span style="font-size: 11px; font-weight: 700; color: ${isDis ? '#64748b' : '#0f172a'};">${displayName}</span>
                        ${item.code ? `<span style="font-size: 9.5px; color: #94a3b8; font-family: monospace; display: block;">[${item.code}]</span>` : ''}
                    </div>
                </div>
                <div style="white-space: nowrap; margin-left: 8px; flex-shrink: 0;">
                    <span style="font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 4px; background: ${badgeBg}; color: ${badgeColor};">
                        ${item.statusTag}
                    </span>
                </div>
            </div>
        `;
    });

    predHtml += `</div>`;
    predEl.innerHTML = predHtml;
}

export function selectPredictiveRentalResource(optVal) {
    const sel = document.getElementById("rentalAssetId");
    if (!sel) return;

    const targetOpt = sel.querySelector(`option[value="${optVal}"]`);
    if (targetOpt && targetOpt.disabled) {
        alert(`⚠️ Este recurso no está disponible para salida:\n${targetOpt.text}`);
        return;
    }

    sel.value = optVal;
    fillRentalAssetDetails();

    const predEl = document.getElementById("rentalPredictiveResults");
    if (predEl) predEl.style.display = "none";

    const searchInput = document.getElementById("rentalResourceSearch");
    if (searchInput && targetOpt) {
        searchInput.value = targetOpt.dataset.name || targetOpt.text;
    }
}

export function renderRentalResourceOptions(query = '') {
    const selectAsset = document.getElementById("rentalAssetId");
    if (!selectAsset) return;

    const q = (query || '').toLowerCase().trim();
    const match = (item) => !q || (item.name || '').toLowerCase().includes(q) || (item.code || '').toLowerCase().includes(q);

    const hm = rentalCatalog.heavyMachinery.filter(match);
    const fv = rentalCatalog.fleetVehicles.filter(match);
    const tl = rentalCatalog.tools.filter(match);
    const sm = rentalCatalog.stockMaterials.filter(match);

    renderPredictiveResults(hm, fv, tl, sm, query);

    let html = `<option value="">-- Seleccionar Equipo, Vehículo o Material --</option>`;

    if (hm.length > 0) {
        html += `<optgroup label="🚜 Maquinaria Pesada & Plantas Industriales (${hm.length})">`;
        hm.forEach(item => {
            html += `<option value="asset_${item.id}" data-type="asset" data-id="${item.id}" data-code="${item.code}" data-name="${item.name}" ${item.disabled ? 'disabled style="color: #94a3b8;"' : ''}>[${item.code}] ${item.name} ${item.statusTag}</option>`;
        });
        html += `</optgroup>`;
    }

    if (fv.length > 0) {
        html += `<optgroup label="🚗 Flota & Vehículos de Transporte (${fv.length})">`;
        fv.forEach(item => {
            html += `<option value="asset_${item.id}" data-type="asset" data-id="${item.id}" data-code="${item.code}" data-name="${item.name}" ${item.disabled ? 'disabled style="color: #94a3b8;"' : ''}>[${item.code}] ${item.name} ${item.statusTag}</option>`;
        });
        html += `</optgroup>`;
    }

    if (tl.length > 0) {
        html += `<optgroup label="🔧 Herramientas & Equipos (Agrupados por Modelo) (${tl.length})">`;
        tl.forEach(item => {
            const isGrp = item.isGroup;
            const dataMax = isGrp ? item.availCount : 1;
            html += `<option value="asset_${item.id}" data-type="asset" data-is-group="${isGrp ? '1' : '0'}" data-max="${dataMax}" data-id="${item.id}" data-code="${item.code}" data-name="${item.name}" ${item.disabled ? 'disabled style="color: #94a3b8;"' : ''}>${isGrp ? '⚡ [MODELO]' : `[${item.code}]`} ${item.name} ${item.statusTag}</option>`;
        });
        html += `</optgroup>`;
    }

    if (sm.length > 0) {
        html += `<optgroup label="📦 Materiales de Almacén en Stock (${sm.length})">`;
        sm.forEach(item => {
            html += `<option value="mat_${item.id}" data-type="material" data-id="${item.id}" data-code="${item.code}" data-name="${item.name}" data-unit="${item.unit}" data-stock="${item.stock}" ${item.disabled ? 'disabled style="color: #94a3b8;"' : ''}>[${item.code}] ${item.name} ${item.statusTag}</option>`;
        });
        html += `</optgroup>`;
    }

    if (hm.length === 0 && fv.length === 0 && tl.length === 0 && sm.length === 0) {
        html += `<option value="" disabled>No se encontraron recursos con "${query}"</option>`;
    }

    selectAsset.innerHTML = html;

    const totalFound = hm.length + fv.length + tl.length + sm.length;
    if (q && totalFound === 1) {
        const firstOpt = selectAsset.querySelector('option[data-id]:not([disabled])');
        if (firstOpt) {
            selectAsset.value = firstOpt.value;
            fillRentalAssetDetails();
        }
    }
}

export function filterRentalResources(query) {
    renderRentalResourceOptions(query);
}

export function clearRentalResourceSearch() {
    const input = document.getElementById("rentalResourceSearch");
    if (input) input.value = "";
    const predEl = document.getElementById("rentalPredictiveResults");
    if (predEl) {
        predEl.style.display = "none";
        predEl.innerHTML = "";
    }
    renderRentalResourceOptions("");
}

// Cerrar popup predictivo al hacer clic fuera
if (typeof document !== 'undefined') {
    document.addEventListener("click", function(e) {
        const predEl = document.getElementById("rentalPredictiveResults");
        const searchInput = document.getElementById("rentalResourceSearch");
        if (predEl && predEl.style.display !== "none") {
            if (!e.target.closest("#rentalPredictiveResults") && e.target !== searchInput) {
                predEl.style.display = "none";
            }
        }
    });
}

// --- GESTIÓN DE LA CANASTA MULTI-RECURSO ---
export function fillRentalAssetDetails() {
    const sel = document.getElementById("rentalAssetId");
    if (!sel) return;
    const opt = sel.options[sel.selectedIndex];
    const qtyGroup = document.getElementById("rentalMaterialQuantityGroup");
    const stockBadge = document.getElementById("rentalMaterialStockBadge");
    const unitBadge = document.getElementById("rentalMaterialUnitBadge");
    const qtyInput = document.getElementById("rentalMaterialQuantity");
    const lblQty = document.getElementById("lblRentalQuantity");

    if (opt && opt.dataset.type === "material") {
        if (qtyGroup) qtyGroup.style.display = "block";
        if (lblQty) lblQty.innerText = "Cantidad a Despachar *";
        if (unitBadge) unitBadge.innerText = opt.dataset.unit || "UND";
        if (qtyInput) {
            qtyInput.disabled = false;
            qtyInput.value = "1";
            qtyInput.min = "0.01";
            qtyInput.step = "0.01";
            qtyInput.max = opt.dataset.stock || "999";
        }
        if (stockBadge) {
            stockBadge.style.display = "block";
            stockBadge.innerHTML = `<i class="fa-solid fa-boxes-stacked"></i> Stock disponible en almacén: <strong>${opt.dataset.stock} ${opt.dataset.unit || 'UND'}</strong>`;
        }
    } else if (opt && opt.dataset.type === "asset") {
        const isGroup = opt.dataset.isGroup === "1";
        const maxAvail = parseInt(opt.dataset.max || "1", 10) || 1;

        if (qtyGroup) qtyGroup.style.display = "block";
        if (lblQty) lblQty.innerText = isGroup ? `Cantidad de Unidades (Max ${maxAvail}) *` : "Unidad Única";
        if (unitBadge) unitBadge.innerText = "UND";
        if (qtyInput) {
            qtyInput.value = "1";
            qtyInput.disabled = !isGroup;
            qtyInput.min = "1";
            qtyInput.max = String(maxAvail);
            qtyInput.step = "1";
        }
        if (stockBadge) {
            stockBadge.style.display = "block";
            stockBadge.innerHTML = isGroup 
                ? `<i class="fa-solid fa-layer-group" style="color: #0284c7;"></i> Modelo agrupado: <strong>${maxAvail} unidades físicas</strong> listas para salida.`
                : `<i class="fa-solid fa-circle-check" style="color: #10b981;"></i> Activo individual disponible para asignación.`;
        }
    } else {
        if (qtyGroup) qtyGroup.style.display = "none";
        if (stockBadge) stockBadge.style.display = "none";
    }
}

export function addResourceToRentalCart() {
    const sel = document.getElementById("rentalAssetId");
    if (!sel || !sel.value) {
        alert("Por favor selecciona un recurso de la lista.");
        return;
    }
    const opt = sel.options[sel.selectedIndex];
    const itemType = opt.dataset.type;
    const id = parseInt(opt.dataset.id);
    const code = opt.dataset.code || "";
    const name = opt.dataset.name || "";
    const isGroup = opt.dataset.isGroup === "1";

    if (itemType === "asset") {
        const qtyVal = parseInt(document.getElementById("rentalMaterialQuantity")?.value || "1", 10) || 1;
        const maxAvail = parseInt(opt.dataset.max || "1", 10) || 1;

        if (isGroup) {
            if (qtyVal > maxAvail) {
                alert(`No hay suficientes unidades físicas disponibles (Máximo ${maxAvail} disponibles).`);
                return;
            }
            // Buscar unidades disponibles de ese modelo en allAssets
            const modelName = name.trim().toUpperCase();
            const matchingAssets = (window.allAssets || []).filter(a => {
                const aName = (a.name || '').trim().toUpperCase();
                const rawStatus = (a.status || 'disponible_base').toLowerCase();
                const isAvail = (rawStatus === 'disponible_base' || rawStatus === 'disponible') && !a.current_project_id && a.is_active !== false;
                return aName === modelName && isAvail;
            });

            const toAdd = matchingAssets.slice(0, qtyVal);
            if (toAdd.length === 0) {
                alert("No se encontraron unidades disponibles en base para este modelo.");
                return;
            }

            let addedCount = 0;
            toAdd.forEach(unit => {
                const exists = rentalCartItems.find(it => it.item_type === "asset" && it.asset_id === unit.id);
                if (!exists) {
                    rentalCartItems.push({
                        item_type: "asset",
                        asset_id: unit.id,
                        material_id: null,
                        code: unit.asset_code || unit.internal_code || code,
                        name: unit.name,
                        quantity: 1.0,
                        unit: "UND"
                    });
                    addedCount++;
                }
            });

            if (addedCount === 0) {
                alert("Las unidades seleccionadas ya se encuentran en la canasta.");
                return;
            }
        } else {
            const exists = rentalCartItems.find(it => it.item_type === "asset" && it.asset_id === id);
            if (exists) {
                alert(`El activo [${code}] ya está agregado a esta salida.`);
                return;
            }
            rentalCartItems.push({
                item_type: "asset",
                asset_id: id,
                material_id: null,
                code: code,
                name: name,
                quantity: 1.0,
                unit: "UND"
            });
        }
    } else if (itemType === "material") {
        const qtyVal = parseFloat(document.getElementById("rentalMaterialQuantity")?.value || "1");
        const maxStock = parseFloat(opt.dataset.stock || "0");
        if (isNaN(qtyVal) || qtyVal <= 0) {
            alert("Ingresa una cantidad válida mayor a 0.");
            return;
        }
        if (qtyVal > maxStock) {
            alert(`Stock insuficiente. Solo hay ${maxStock} ${opt.dataset.unit} disponibles en almacén.`);
            return;
        }
        const existing = rentalCartItems.find(it => it.item_type === "material" && it.material_id === id);
        if (existing) {
            if (existing.quantity + qtyVal > maxStock) {
                alert(`No puedes exceder el stock disponible (${maxStock} ${opt.dataset.unit}).`);
                return;
            }
            existing.quantity = roundDec(existing.quantity + qtyVal, 2);
        } else {
            rentalCartItems.push({
                item_type: "material",
                asset_id: null,
                material_id: id,
                code: code,
                name: name,
                quantity: qtyVal,
                unit: opt.dataset.unit || "UND"
            });
        }
    }

    renderRentalCart();
    sel.value = "";
    fillRentalAssetDetails();
}

export function removeRentalCartItem(idx) {
    rentalCartItems.splice(idx, 1);
    renderRentalCart();
}

export function renderRentalCart() {
    const container = document.getElementById("rentalCartContainer");
    const countEl = document.getElementById("rentalCartCount");
    const tbody = document.getElementById("rentalCartTableBody");
    if (!container || !tbody) return;

    if (rentalCartItems.length === 0) {
        container.style.display = "none";
        tbody.innerHTML = "";
        if (countEl) countEl.innerText = "0";
        return;
    }

    container.style.display = "block";
    if (countEl) countEl.innerText = rentalCartItems.length;

    tbody.innerHTML = rentalCartItems.map((it, idx) => `
        <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 6px 8px;">
                <strong style="color: #0f172a;">${it.name}</strong>
                ${it.code ? `<span style="font-size: 10px; color: #64748b; display: block;">Cód: ${it.code}</span>` : ''}
            </td>
            <td style="padding: 6px 8px; text-align: center;">
                <span style="font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; background: ${it.item_type === 'asset' ? '#e0f2fe' : '#dcfce7'}; color: ${it.item_type === 'asset' ? '#0369a1' : '#15803d'};">
                    ${it.item_type === 'asset' ? 'Activo' : 'Material'}
                </span>
            </td>
            <td style="padding: 6px 8px; text-align: center; font-weight: 800;">${it.quantity} ${it.unit}</td>
            <td style="padding: 6px 8px; text-align: center;">
                <button type="button" onclick="removeRentalCartItem(${idx})" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 12px;" title="Quitar"><i class="fa-solid fa-trash-can"></i></button>
            </td>
        </tr>
    `).join('');
}

// PUENTE GLOBAL WINDOW
if (typeof window !== 'undefined') {
    window.populateRentalResources = populateRentalResources;
    window.renderPredictiveResults = renderPredictiveResults;
    window.selectPredictiveRentalResource = selectPredictiveRentalResource;
    window.renderRentalResourceOptions = renderRentalResourceOptions;
    window.filterRentalResources = filterRentalResources;
    window.clearRentalResourceSearch = clearRentalResourceSearch;
    window.fillRentalAssetDetails = fillRentalAssetDetails;
    window.addResourceToRentalCart = addResourceToRentalCart;
    window.removeRentalCartItem = removeRentalCartItem;
    window.renderRentalCart = renderRentalCart;
    window.roundDec = roundDec;
}
