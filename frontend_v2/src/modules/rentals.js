/**
 * DALOR SIGO-P | Módulo: RENTALS.JS
 * Módulo de Alquileres & Préstamos de Equipos, Maquinarias, Herramientas y Materiales (Multi-Recurso)
 */

var API_BASE = window.API_BASE || (window.location.origin + "/api/v1");
var allRentals = window.allRentals = window.allRentals || [];
var currentFilteredRentals = [];
var rentalCartItems = [];
var rentalCurrentPage = 1;
var rentalPageSize = 10;
var currentRentalsFilter = 'all';

/** authFetch - inyecta token en cada request usando window.fetch nativo */
function authFetch(url, options = {}) {
    var _t = sessionStorage.getItem('dalor_token') || localStorage.getItem('dalor_token') || window.authToken || '';
    var _h = Object.assign({}, options.headers || {});
    if (_t) _h['Authorization'] = 'Bearer ' + _t;
    if (options.body && !_h['Content-Type']) _h['Content-Type'] = 'application/json';
    return window.fetch(url, Object.assign({}, options, { headers: _h }));
}

// --- CARGA Y RENDERIZADO DE ALQUILERES & PRÉSTAMOS ---
async function loadRentalsList() {
    const tbody = document.getElementById("rentalsTableBody");
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="11" style="text-align: center; padding: 25px; color: #94a3b8;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando control de alquileres y préstamos...</td></tr>`;

    try {
        const token = window.authToken || localStorage.getItem('dalor_token') || null;
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        const res = await authFetch(`${API_BASE}/rentals/`, { headers });
        if (!res.ok) throw new Error("Error en la respuesta del servidor");

        allRentals = window.allRentals = await res.json();
        updateRentalsKPIs(allRentals);
        applyRentalsFilter();
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="11" style="text-align: center; padding: 20px; color: #e11d48; font-weight: 600;">Error al cargar registros: ${e.message}</td></tr>`;
    }
}

function updateRentalsKPIs(items) {
    const arr = items || [];
    const kpiSalidas = document.getElementById("kpi_rentals_salidas_count") || document.getElementById("rentalKpiDalorTercero");
    const kpiEntradas = document.getElementById("kpi_rentals_entradas_count") || document.getElementById("rentalKpiTerceroDalor");
    const kpiTotal = document.getElementById("rentalKpiTotalActive");
    const kpiReturned = document.getElementById("rentalKpiReturned");
    const kpiTarifa = document.getElementById("kpi_rentals_daily_rate_usd");
    const badgeCount = document.getElementById("rentals_count_badge");

    const activasSalidas = arr.filter(r => r.direction === 'dalor_a_tercero' && (r.status === 'activo' || r.status === 'retorno_parcial'));
    const activasEntradas = arr.filter(r => r.direction === 'tercero_a_dalor' && (r.status === 'activo' || r.status === 'retorno_parcial'));
    const totalActivos = arr.filter(r => r.status === 'activo' || r.status === 'retorno_parcial');
    const totalDevueltos = arr.filter(r => (r.status || '').startsWith('devuelto'));
    
    let totalTarifaDia = 0;
    arr.filter(r => (r.status === 'activo' || r.status === 'retorno_parcial') && r.operation_type === 'alquiler').forEach(r => {
        if (r.rate_period === 'dia') totalTarifaDia += (r.rate_usd || 0);
        else if (r.rate_period === 'semana') totalTarifaDia += (r.rate_usd || 0) / 7;
        else if (r.rate_period === 'mes') totalTarifaDia += (r.rate_usd || 0) / 30;
    });

    if (kpiSalidas) kpiSalidas.innerText = activasSalidas.length;
    if (kpiEntradas) kpiEntradas.innerText = activasEntradas.length;
    if (kpiTotal) kpiTotal.innerText = totalActivos.length;
    if (kpiReturned) kpiReturned.innerText = totalDevueltos.length;
    if (kpiTarifa) kpiTarifa.innerText = `$${totalTarifaDia.toFixed(2)}/día`;
    if (badgeCount) badgeCount.innerText = `${arr.length} Registros`;
}

// --- FILTRADO Y PAGINACIÓN ---
function applyRentalsFilter() {
    const q = (document.getElementById("rentalFilterSearch")?.value || "").toLowerCase().trim();
    const dir = document.getElementById("rentalFilterDirection")?.value || "";
    const type = document.getElementById("rentalFilterType")?.value || "";
    const status = document.getElementById("rentalFilterStatus")?.value || "";

    let filtered = Array.isArray(allRentals) ? [...allRentals] : [];

    if (q) {
        filtered = filtered.filter(r => 
            (r.operation_code || '').toLowerCase().includes(q) ||
            (r.equipment_name || '').toLowerCase().includes(q) ||
            (r.external_entity || '').toLowerCase().includes(q) ||
            (r.destination_reference || '').toLowerCase().includes(q) ||
            (r.contact_person || '').toLowerCase().includes(q) ||
            (r.notes || '').toLowerCase().includes(q)
        );
    }

    if (dir) {
        filtered = filtered.filter(r => r.direction === dir);
    }

    if (type) {
        filtered = filtered.filter(r => r.operation_type === type);
    }

    if (status) {
        if (status === 'activo') {
            filtered = filtered.filter(r => r.status === 'activo' || r.status === 'retorno_parcial');
        } else if (status.startsWith('devuelto')) {
            filtered = filtered.filter(r => r.status === status);
        }
    }

    currentFilteredRentals = filtered;
    rentalCurrentPage = 1;
    renderRentalsTablePaginated();
}

let filterDebounceTimer = null;
function debouncedApplyRentalsFilter() {
    clearTimeout(filterDebounceTimer);
    filterDebounceTimer = setTimeout(applyRentalsFilter, 250);
}

function goToRentalsPage(page) {
    rentalCurrentPage = page;
    renderRentalsTablePaginated();
}

function renderRentalsTablePaginated() {
    const tbody = document.getElementById("rentalsTableBody");
    if (!tbody) return;

    const items = currentFilteredRentals || [];
    const totalItems = items.length;
    const totalPages = Math.ceil(totalItems / rentalPageSize) || 1;

    if (rentalCurrentPage > totalPages) rentalCurrentPage = totalPages;
    if (rentalCurrentPage < 1) rentalCurrentPage = 1;

    const startIndex = (rentalCurrentPage - 1) * rentalPageSize;
    const endIndex = Math.min(startIndex + rentalPageSize, totalItems);
    const pageItems = items.slice(startIndex, endIndex);

    // Actualizar barra de paginación
    const infoEl = document.getElementById("rentalsPaginationInfo");
    const controlsEl = document.getElementById("rentalsPaginationControls");

    if (infoEl) {
        infoEl.innerText = totalItems > 0 
            ? `Mostrando ${startIndex + 1} - ${endIndex} de ${totalItems} operaciones (Pág. ${rentalCurrentPage} de ${totalPages})`
            : "No hay operaciones registradas";
    }

    if (controlsEl) {
        let btns = '';
        btns += `<button type="button" class="btn-secondary" style="padding: 4px 8px; font-size: 11px;" ${rentalCurrentPage <= 1 ? 'disabled' : ''} onclick="goToRentalsPage(${rentalCurrentPage - 1})"><i class="fa-solid fa-chevron-left"></i> Anterior</button>`;
        
        for (let p = 1; p <= totalPages; p++) {
            if (totalPages > 7 && Math.abs(p - rentalCurrentPage) > 2 && p !== 1 && p !== totalPages) {
                if (p === 2 || p === totalPages - 1) btns += `<span style="padding: 0 4px; color: #94a3b8;">...</span>`;
                continue;
            }
            btns += `<button type="button" class="${p === rentalCurrentPage ? 'btn-primary' : 'btn-secondary'}" style="padding: 4px 9px; font-size: 11px; font-weight: 700;" onclick="goToRentalsPage(${p})">${p}</button>`;
        }

        btns += `<button type="button" class="btn-secondary" style="padding: 4px 8px; font-size: 11px;" ${rentalCurrentPage >= totalPages ? 'disabled' : ''} onclick="goToRentalsPage(${rentalCurrentPage + 1})">Siguiente <i class="fa-solid fa-chevron-right"></i></button>`;
        controlsEl.innerHTML = btns;
    }

    if (pageItems.length === 0) {
        tbody.innerHTML = `<tr><td colspan="11" style="text-align: center; padding: 35px; color: #64748b;">
            <i class="fa-solid fa-handshake" style="font-size: 32px; color: #cbd5e1; margin-bottom: 8px; display: block;"></i>
            <span style="font-size: 13px; font-weight: 700;">No hay préstamos ni alquileres registrados con este filtro.</span><br>
            <span style="font-size: 11px; color: #94a3b8;">Usa el botón "+ Nuevo Alquiler / Préstamo" para registrar salidas o recepciones.</span>
        </td></tr>`;
        return;
    }

    tbody.innerHTML = pageItems.map(r => {
        // Dirección Badge
        const isSalida = r.direction === 'dalor_a_tercero';
        const dirBadge = isSalida 
            ? `<span style="background: #e0f2fe; color: #0369a1; font-weight: 800; font-size: 10px; padding: 3px 7px; border-radius: 6px; display: inline-flex; align-items: center; gap: 4px;"><i class="fa-solid fa-arrow-up-right-from-square"></i> DALOR ➔ Tercero</span>`
            : `<span style="background: #fef3c7; color: #92400e; font-weight: 800; font-size: 10px; padding: 3px 7px; border-radius: 6px; display: inline-flex; align-items: center; gap: 4px;"><i class="fa-solid fa-arrow-down-left-and-up-right-to-center"></i> Tercero ➔ DALOR</span>`;

        // Tipo Badge
        const isAlquiler = r.operation_type === 'alquiler';
        const tipoBadge = isAlquiler
            ? `<span style="font-weight: 800; color: #0284c7; font-size: 11px;"><i class="fa-solid fa-tag"></i> Alquiler</span>`
            : `<span style="font-weight: 800; color: #059669; font-size: 11px;"><i class="fa-solid fa-handshake-angle"></i> Préstamo</span>`;

        // Tarifa
        const tarifaText = isAlquiler
            ? `<strong style="color: var(--dalor-navy); font-size: 11.5px;">$${Number(r.rate_usd || 0).toFixed(2)}</strong><span style="font-size: 10px; color: #64748b;">/${r.rate_period || 'día'}</span>`
            : `<span style="font-size: 11px; font-weight: 700; color: #059669;">Sin Costo</span>`;

        // Estado Badge
        let statusBadge = '';
        if (r.status === 'activo') {
            if (r.is_overdue) {
                statusBadge = `<span style="background: #fee2e2; color: #b91c1c; font-weight: 800; font-size: 10px; padding: 2px 7px; border-radius: 4px;"><i class="fa-solid fa-triangle-exclamation"></i> En Mora</span>`;
            } else {
                statusBadge = `<span style="background: #dcfce7; color: #15803d; font-weight: 800; font-size: 10px; padding: 2px 7px; border-radius: 4px;"><i class="fa-solid fa-circle-check"></i> Activo</span>`;
            }
        } else if (r.status === 'retorno_parcial') {
            statusBadge = `<span style="background: #e0f2fe; color: #0369a1; font-weight: 800; font-size: 10px; padding: 2px 7px; border-radius: 4px;"><i class="fa-solid fa-boxes-packing"></i> Ret. Parcial</span>`;
        } else if (r.status === 'devuelto_conforme') {
            statusBadge = `<span style="background: #f1f5f9; color: #475569; font-weight: 700; font-size: 10px; padding: 2px 7px; border-radius: 4px;"><i class="fa-solid fa-check-double"></i> Conforme</span>`;
        } else {
            statusBadge = `<span style="background: #ffedd5; color: #c2410c; font-weight: 700; font-size: 10px; padding: 2px 7px; border-radius: 4px;"><i class="fa-solid fa-note-sticky"></i> C/ Novedad</span>`;
        }

        // Acciones
        let actionsHtml = '';
        if (r.status === 'activo' || r.status === 'retorno_parcial') {
            actionsHtml += `<button type="button" onclick="openReturnRentalModal(${r.id})" class="btn-primary" style="font-size: 11px; padding: 4px 8px; background: #059669; border-radius: 6px; font-weight: 700;" title="Registrar Retorno / Devolución"><i class="fa-solid fa-rotate-left"></i> Retorno</button> `;
        }
        actionsHtml += `<button type="button" onclick="printRentalDeliveryNote(${r.id})" class="btn-secondary" style="font-size: 11px; padding: 4px 8px; border-radius: 6px; font-weight: 700; color: #0284c7; border-color: #bae6fd;" title="Imprimir Guía de Entrega / Despacho"><i class="fa-solid fa-file-invoice"></i> Guía</button> `;
        actionsHtml += `<button type="button" onclick="deleteRentalRecord(${r.id})" class="btn-secondary" style="font-size: 11px; padding: 4px 8px; color: #ef4444; border-color: #fecaca; border-radius: 6px;" title="Anular Registro"><i class="fa-solid fa-trash-can"></i></button>`;

        const startDateStr = (r.start_date || '').split(' ')[0] || '-';
        const expectedDateStr = r.expected_return_date || '-';
        const destDisplay = r.destination_reference || (r.project_name ? r.project_name : 'Uso Particular / Sede');

        return `
            <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.15s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='white'">
                <td style="padding: 10px; font-weight: 800; color: var(--dalor-navy); font-size: 11.5px;">${r.operation_code}</td>
                <td style="padding: 10px;">${dirBadge}</td>
                <td style="padding: 10px; font-size: 11px;">${tipoBadge}</td>
                <td style="padding: 10px;">
                    <strong style="color: var(--dalor-blue); font-size: 12px;">${r.equipment_name}</strong>
                    ${r.equipment_code ? `<span style="display:block; font-size:10px; color:#64748b; font-weight:600;">Cód: ${r.equipment_code}</span>` : ''}
                    ${r.items && r.items.length > 1 ? `<span style="display:inline-block; margin-top:2px; font-size:9.5px; background:#f1f5f9; color:#475569; padding:1px 5px; border-radius:4px; font-weight:700;">${r.items.length} recursos asociados</span>` : ''}
                </td>
                <td style="padding: 10px;">
                    <span style="font-weight: 700; color: #1e293b; font-size: 11.5px;">${r.external_entity}</span>
                    <span style="display:block; font-size:10px; color:#64748b;"><i class="fa-solid fa-location-dot" style="font-size:9px;"></i> ${destDisplay}</span>
                </td>
                <td style="padding: 10px; font-size: 11px;">
                    <span style="font-weight: 600; color: #334155;">${r.contact_person || '-'}</span>
                    ${r.contact_phone ? `<span style="display:block; font-size:10px; color:#64748b;"><i class="fa-solid fa-phone" style="font-size:9px;"></i> ${r.contact_phone}</span>` : ''}
                </td>
                <td style="padding: 10px; font-size: 11px; color: #475569;">${startDateStr}</td>
                <td style="padding: 10px; font-size: 11px; font-weight: 700; color: ${r.is_overdue ? '#b91c1c' : '#0369a1'};">${expectedDateStr}</td>
                <td style="padding: 10px;">${tarifaText}</td>
                <td style="padding: 10px; text-align: center;">${statusBadge}</td>
                <td style="padding: 10px; text-align: center; white-space: nowrap;">${actionsHtml}</td>
            </tr>
        `;
    }).join('');
}

var rentalCatalog = { heavyMachinery: [], fleetVehicles: [], tools: [], stockMaterials: [] };

// --- POBLAR RECURSOS (MAQUINARIA, VEHÍCULOS, HERRAMIENTAS, MATERIALES) ---
async function populateRentalResources() {
    const selectAsset = document.getElementById("rentalAssetId");
    if (!selectAsset) return;

    // Cargar SIEMPRE datos frescos desde el servidor para reflejar retornos y salidas al instante
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
    const tools = [];

    assets.forEach(a => {
        const aType = (a.asset_type || a.category || a.type || '').toLowerCase();
        const aCode = (a.asset_code || a.code || '').trim();
        const aName = (a.name || '').trim();
        
        // Un activo sólo está verdaderamente disponible si su estado es disponible_base o disponible Y no tiene proyecto asignado
        const isAssigned = !!a.current_project_id;
        const rawStatus = (a.status || 'disponible_base').toLowerCase();
        const isAvailable = (rawStatus === 'disponible_base' || rawStatus === 'disponible') && !isAssigned;
        
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
            statusTag: statusTag,
            statusClass: statusClass,
            disabled: !isAvailable,
            itemType: 'asset',
            assetType: aType,
            location: a.current_location || 'Sede Central'
        };

        if (aType.includes('maquinaria') || aType.includes('pesada') || aType.includes('planta') || aName.toLowerCase().includes('montacarga')) {
            heavyMachinery.push(optData);
        } else if (aType.includes('vehiculo') || aType.includes('transporte') || aType.includes('flota')) {
            fleetVehicles.push(optData);
        } else {
            tools.push(optData);
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

function renderPredictiveResults(hm, fv, tl, sm, query) {
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

        // Resaltado de término buscado
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

function selectPredictiveRentalResource(optVal) {
    const sel = document.getElementById("rentalAssetId");
    if (!sel) return;

    // Verificar si está deshabilitado
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

function renderRentalResourceOptions(query = '') {
    const selectAsset = document.getElementById("rentalAssetId");
    if (!selectAsset) return;

    const q = (query || '').toLowerCase().trim();
    const match = (item) => !q || (item.name || '').toLowerCase().includes(q) || (item.code || '').toLowerCase().includes(q);

    const hm = rentalCatalog.heavyMachinery.filter(match);
    const fv = rentalCatalog.fleetVehicles.filter(match);
    const tl = rentalCatalog.tools.filter(match);
    const sm = rentalCatalog.stockMaterials.filter(match);

    // Actualizar menú predictivo flotante
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
        html += `<optgroup label="🔧 Herramientas & Equipos de Obra (${tl.length})">`;
        tl.forEach(item => {
            html += `<option value="asset_${item.id}" data-type="asset" data-id="${item.id}" data-code="${item.code}" data-name="${item.name}" ${item.disabled ? 'disabled style="color: #94a3b8;"' : ''}>[${item.code}] ${item.name} ${item.statusTag}</option>`;
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

    // Si la búsqueda arroja 1 solo resultado disponible, preseleccionarlo automáticamente
    const totalFound = hm.length + fv.length + tl.length + sm.length;
    if (q && totalFound === 1) {
        const firstOpt = selectAsset.querySelector('option[data-id]:not([disabled])');
        if (firstOpt) {
            selectAsset.value = firstOpt.value;
            fillRentalAssetDetails();
        }
    }
}

function filterRentalResources(query) {
    renderRentalResourceOptions(query);
}

function clearRentalResourceSearch() {
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
function fillRentalAssetDetails() {
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
        if (qtyGroup) qtyGroup.style.display = "block";
        if (lblQty) lblQty.innerText = "Unidad Única";
        if (unitBadge) unitBadge.innerText = "UND";
        if (qtyInput) {
            qtyInput.value = "1";
            qtyInput.disabled = true;
        }
        if (stockBadge) {
            stockBadge.style.display = "block";
            stockBadge.innerHTML = `<i class="fa-solid fa-circle-check" style="color: #10b981;"></i> Activo individual disponible para asignación.`;
        }
    } else {
        if (qtyGroup) qtyGroup.style.display = "none";
        if (stockBadge) stockBadge.style.display = "none";
    }
}

function addResourceToRentalCart() {
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

    if (itemType === "asset") {
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

function removeRentalCartItem(idx) {
    rentalCartItems.splice(idx, 1);
    renderRentalCart();
}

function renderRentalCart() {
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

function roundDec(val, dec) {
    const m = Math.pow(10, dec || 2);
    return Math.round(val * m) / m;
}

// --- DINÁMICA DEL MODAL DE REGISTRO ---
function toggleRentalOperationType() {
    const type = document.getElementById("rentalOperationType")?.value || "alquiler";
    const finGroup = document.getElementById("rentalFinancialGroup");
    const banner = document.getElementById("rentalLoanBanner");
    const rateInput = document.getElementById("rentalRateUsd");

    if (type === "prestamo") {
        if (finGroup) finGroup.style.display = "none";
        if (banner) banner.style.display = "block";
        if (rateInput) rateInput.value = "0.00";
    } else {
        if (finGroup) finGroup.style.display = "block";
        if (banner) banner.style.display = "none";
    }
}

function toggleRentalDirectionFields() {
    const dir = document.getElementById("rentalDirection")?.value || "dalor_a_tercero";
    const dalorGroup = document.getElementById("rentalDalorAssetGroup");
    const extGroup = document.getElementById("rentalExternalEquipmentGroup");
    const lblEntity = document.getElementById("lblRentalExternalEntity");
    const lblDest = document.getElementById("lblRentalDestination");
    const destRef = document.getElementById("rentalDestinationRef");
    const projSelect = document.getElementById("rentalProjectId");

    if (dir === "dalor_a_tercero") {
        if (dalorGroup) dalorGroup.style.display = "block";
        if (extGroup) extGroup.style.display = "none";
        if (lblEntity) lblEntity.innerText = "Empresa / Cliente / Destinatario *";
        if (lblDest) lblDest.innerText = "Destino / Obra de Referencia del Cliente (Opcional)";
        if (destRef) destRef.style.display = "block";
        if (projSelect) projSelect.style.display = "none";
    } else {
        if (dalorGroup) dalorGroup.style.display = "none";
        if (extGroup) extGroup.style.display = "block";
        if (lblEntity) lblEntity.innerText = "Empresa / Proveedor Propietario *";
        if (lblDest) lblDest.innerText = "Proyecto / Obra Vinculada (Opcional)";
        if (destRef) destRef.style.display = "none";
        if (projSelect) projSelect.style.display = "block";
    }
}

async function openCreateRentalModal(direction = 'dalor_a_tercero') {
    const form = document.getElementById("formRentalLoan");
    if (form) form.reset();
    rentalCartItems = [];
    renderRentalCart();

    const dirSelect = document.getElementById("rentalDirection");
    if (dirSelect) dirSelect.value = direction;

    const opType = document.getElementById("rentalOperationType");
    if (opType) opType.value = "alquiler";

    const startInput = document.getElementById("rentalStartDate");
    if (startInput) startInput.value = new Date().toISOString().split('T')[0];

    const expInput = document.getElementById("rentalExpectedReturnDate");
    if (expInput) {
        const d = new Date();
        d.setDate(d.getDate() + 7);
        expInput.value = d.toISOString().split('T')[0];
    }

    // Cargar proyectos en el select
    const projSelect = document.getElementById("rentalProjectId");
    if (projSelect) {
        if (!window.allProjects || window.allProjects.length === 0) {
            try {
                const resP = await authFetch(`${API_BASE}/projects/`);
                if (resP.ok) window.allProjects = await resP.json();
            } catch(e) {}
        }
        let pOptions = `<option value="">-- Sede Central / Taller Guacara --</option>`;
        (window.allProjects || []).forEach(p => {
            pOptions += `<option value="${p.id}">[${p.code}] ${p.name}</option>`;
        });
        projSelect.innerHTML = pOptions;
    }

    // Limpiar buscador de recursos
    const searchInput = document.getElementById("rentalResourceSearch");
    if (searchInput) searchInput.value = "";

    // Poblar autocompletado de clientes registrados
    const dl = document.getElementById("rentalClientsDatalist");
    if (dl) {
        if (!window.allClients || window.allClients.length === 0) {
            try {
                const resC = await authFetch(`${API_BASE}/clients/`);
                if (resC.ok) window.allClients = await resC.json();
            } catch(e) {}
        }
        dl.innerHTML = (window.allClients || []).map(c => `<option value="${c.name}">${c.rif ? `[${c.rif}] ` : ''}${c.name}</option>`).join('');
    }

    await populateRentalResources();
    toggleRentalOperationType();
    toggleRentalDirectionFields();

    window.openModal?.('modalRentalLoan');
}

// --- VERIFICACIÓN DE RIESGO CREDITICIO EN ALQUILERES (SIN BLOQUEO AUTOMÁTICO) ---
async function checkRentalClientCreditRisk(clientId) {
    const alertBox = document.getElementById("rentalClientRiskAlert");
    const detailsBox = document.getElementById("rentalClientRiskDetails");
    if (!alertBox || !clientId) {
        if (alertBox) alertBox.style.display = "none";
        return;
    }

    try {
        const token = window.authToken || localStorage.getItem('dalor_token') || null;
        const res = await authFetch(`${API_BASE}/clients/${clientId}/credit-risk`, {
            headers: token ? { "Authorization": `Bearer ${token}` } : {}
        });
        if (!res.ok) {
            alertBox.style.display = "none";
            return;
        }

        const data = await res.json();
        if (data && data.has_risk) {
            let debtList = (data.bad_debts || []).map(b => `• <strong>${b.invoice_number || 'Doc'}</strong>: $${(b.amount_usd || 0).toFixed(2)} USD <em>(${b.reason || 'Sin motivo'})</em>`).join("<br>");
            if (detailsBox) {
                detailsBox.innerHTML = `
                    Este cliente posee antecedentes de <strong>cuenta incobrable / castigada</strong> por un total de <strong>$${(data.total_bad_debt_usd || 0).toFixed(2)} USD</strong>.<br>
                    <div style="margin-top: 4px; padding: 4px 6px; background: rgba(255,255,255,0.7); border-radius: 4px;">${debtList}</div>
                    <span style="font-size: 10px; color: #881337; margin-top: 4px; display: block;">
                        <strong>Decisión Operativa:</strong> Puede autorizar el despacho o préstamo del equipo bajo supervisión o cambiar de cliente.
                    </span>
                `;
            }
            alertBox.style.display = "block";
        } else {
            alertBox.style.display = "none";
        }
    } catch(err) {
        console.warn("Error al verificar riesgo crediticio en alquiler:", err);
        if (alertBox) alertBox.style.display = "none";
    }
}

function confirmRentalClientRisk() {
    const alertBox = document.getElementById("rentalClientRiskAlert");
    if (alertBox) alertBox.style.display = "none";
}

function cancelRentalClientRisk() {
    const input = document.getElementById("rentalExternalEntity");
    if (input) input.value = "";
    const alertBox = document.getElementById("rentalClientRiskAlert");
    if (alertBox) alertBox.style.display = "none";
}

function onRentalClientSelected(val) {
    const alertBox = document.getElementById("rentalClientRiskAlert");
    if (!val) {
        if (alertBox) alertBox.style.display = "none";
        return;
    }
    const match = (window.allClients || []).find(c => c.name.toLowerCase() === val.toLowerCase().trim());
    if (match) {
        const contactInput = document.getElementById("rentalContactPerson");
        const phoneInput = document.getElementById("rentalContactPhone");
        if (contactInput && match.contact_name && !contactInput.value) contactInput.value = match.contact_name;
        if (phoneInput && (match.contact_phone || match.phone) && !phoneInput.value) phoneInput.value = match.contact_phone || match.phone;
        
        const direction = document.getElementById("rentalDirection")?.value || "dalor_a_tercero";
        if (direction === "dalor_a_tercero") {
            checkRentalClientCreditRisk(match.id);
        }
    } else {
        if (alertBox) alertBox.style.display = "none";
    }
}

async function submitCreateRental(event) {
    if (event && event.preventDefault) event.preventDefault();

    const direction = document.getElementById("rentalDirection")?.value || "dalor_a_tercero";
    const operation_type = document.getElementById("rentalOperationType")?.value || "alquiler";
    const external_entity = document.getElementById("rentalExternalEntity")?.value || "";
    const contact_person = document.getElementById("rentalContactPerson")?.value || "";
    const contact_phone = document.getElementById("rentalContactPhone")?.value || "";
    const start_date = document.getElementById("rentalStartDate")?.value;
    const expected_return_date = document.getElementById("rentalExpectedReturnDate")?.value;
    const notes = document.getElementById("rentalNotes")?.value || "";

    if (!external_entity.trim()) {
        alert("Debes indicar la empresa, cliente o contraparte.");
        return;
    }
    if (!start_date) {
        alert("Debes indicar la fecha de inicio/entrega.");
        return;
    }

    let payload = {
        direction: direction,
        operation_type: operation_type,
        external_entity: external_entity.trim(),
        contact_person: contact_person.trim() || null,
        contact_phone: contact_phone.trim() || null,
        start_date: start_date ? new Date(start_date).toISOString() : new Date().toISOString(),
        expected_return_date: expected_return_date ? new Date(expected_return_date).toISOString() : null,
        notes: notes.trim() || null,
        rate_usd: 0.0,
        rate_period: "dia",
        imputation_mode: "total_estimado"
    };

    if (operation_type === "alquiler") {
        payload.rate_usd = parseFloat(document.getElementById("rentalRateUsd")?.value || "0") || 0.0;
        payload.rate_period = document.getElementById("rentalRatePeriod")?.value || "dia";
        payload.imputation_mode = document.getElementById("rentalImputationMode")?.value || "total_estimado";
    }

    if (direction === "dalor_a_tercero") {
        payload.destination_reference = (document.getElementById("rentalDestinationRef")?.value || "").trim();
        
        // Si hay items en la canasta, usar la canasta
        if (rentalCartItems.length > 0) {
            payload.items = rentalCartItems;
            if (rentalCartItems.length === 1) {
                payload.equipment_name = rentalCartItems[0].name;
                payload.equipment_code = rentalCartItems[0].code;
            } else {
                const names = rentalCartItems.map(it => it.name).slice(0, 2);
                payload.equipment_name = `Lote (${rentalCartItems.length} recursos): ${names.join(", ")}${rentalCartItems.length > 2 ? '...' : ''}`;
            }
        } else {
            // Un solo recurso del selector directo
            const sel = document.getElementById("rentalAssetId");
            const opt = sel?.options[sel.selectedIndex];
            if (!opt || !sel.value) {
                alert("Debes agregar al menos un recurso a la salida.");
                return;
            }
            if (opt.dataset.type === "material") {
                const mQty = parseFloat(document.getElementById("rentalMaterialQuantity")?.value || "1");
                payload.material_id = parseInt(opt.dataset.id);
                payload.material_quantity = mQty;
                payload.equipment_name = `${opt.dataset.name} (${mQty} ${opt.dataset.unit || 'UND'})`;
                payload.equipment_code = opt.dataset.code;
            } else {
                payload.asset_id = parseInt(opt.dataset.id);
                payload.equipment_name = opt.dataset.name;
                payload.equipment_code = opt.dataset.code;
            }
        }
    } else {
        // Tercero a DALOR
        const projVal = document.getElementById("rentalProjectId")?.value;
        payload.project_id = projVal ? parseInt(projVal) : null;
        payload.equipment_name = document.getElementById("rentalEquipmentName")?.value || "";
        payload.equipment_code = document.getElementById("rentalEquipmentCode")?.value || "";

        if (!payload.equipment_name.trim()) {
            alert("Debes indicar el nombre del equipo externo recibido.");
            return;
        }
    }

    try {
        const token = window.authToken || localStorage.getItem('dalor_token') || null;
        const res = await authFetch(`${API_BASE}/rentals/`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Error al registrar operación");

        window.closeModal?.('modalRentalLoan');
        await loadRentalsList();
        if (typeof window.loadAssets === 'function') await window.loadAssets();
        if (typeof window.loadMaterialsList === 'function') await window.loadMaterialsList();
        if (typeof window.loadProjectsList === 'function') await window.loadProjectsList();
        await populateRentalResources();

        alert(`✅ Operación [${data.operation_code}] registrada exitosamente.`);
    } catch (e) {
        alert("Error: " + e.message);
    }
}

// --- MODAL DE RETORNO (PARCIAL Y COMPLETO CON LIQUIDACIÓN FINANCIERA) ---
function openReturnRentalModal(rentalId) {
    const idInput = document.getElementById("returnRentalId");
    if (idInput) idInput.value = rentalId;

    const r = (allRentals || []).find(item => item.id === rentalId);
    window.currentReturnRental = r || null;

    const summaryEl = document.getElementById("returnRentalSummary");
    const entityEl = document.getElementById("returnRentalEntity");
    const actualDateEl = document.getElementById("returnActualDate");
    const itemsListEl = document.getElementById("returnRentalItemsList");
    const itemsContainer = document.getElementById("returnRentalItemsContainer");
    const btnAll = document.getElementById("btnReturnAllRental");

    if (actualDateEl) actualDateEl.value = new Date().toISOString().split('T')[0];

    if (r) {
        if (summaryEl) summaryEl.innerHTML = `<span style="color: #0284c7; font-weight: 800;">[${r.operation_code}]</span> ${r.equipment_name}`;
        if (entityEl) entityEl.innerText = `Destinatario / Entidad: ${r.external_entity} | ${r.destination_reference || r.project_name || 'Uso Particular'}`;

        if (r.items && r.items.length > 0) {
            if (itemsContainer) itemsContainer.style.display = "block";
            let itemsHtml = `
                <table style="width: 100%; border-collapse: collapse; font-size: 11px; border: 1px solid #e2e8f0; border-radius: 6px;">
                    <thead style="background: #f1f5f9; color: #475569; font-size: 10px; text-transform: uppercase;">
                        <tr>
                            <th style="padding: 6px 8px; text-align: left;">Recurso</th>
                            <th style="padding: 6px 8px; text-align: center;">Salida</th>
                            <th style="padding: 6px 8px; text-align: center;">Devuelto</th>
                            <th style="padding: 6px 8px; text-align: center;">Estado</th>
                            <th style="padding: 6px 8px; text-align: center;">Acción</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            r.items.forEach(it => {
                const rem = it.quantity - (it.returned_quantity || 0);
                const isTotal = it.status === 'devuelto_total' || rem <= 0.001;
                itemsHtml += `
                    <tr style="border-bottom: 1px solid #f1f5f9; background: ${isTotal ? '#f8fafc' : 'white'};">
                        <td style="padding: 6px 8px;">
                            <strong style="color: #0f172a;">${it.name}</strong>
                            ${it.code ? `<span style="font-size: 9.5px; color: #64748b; display: block;">${it.code}</span>` : ''}
                        </td>
                        <td style="padding: 6px 8px; text-align: center; font-weight: 700;">${it.quantity}</td>
                        <td style="padding: 6px 8px; text-align: center; color: #059669; font-weight: 700;">${it.returned_quantity || 0}</td>
                        <td style="padding: 6px 8px; text-align: center;">
                            <span style="font-size: 9.5px; padding: 2px 6px; border-radius: 4px; font-weight: 800; background: ${isTotal ? '#f1f5f9' : '#e0f2fe'}; color: ${isTotal ? '#64748b' : '#0369a1'};">
                                ${isTotal ? 'Devuelto 100%' : `Pend: ${rem}`}
                            </span>
                        </td>
                        <td style="padding: 6px 8px; text-align: center;">
                            ${isTotal ? '<i class="fa-solid fa-check" style="color: #10b981;"></i>' : `
                                <div style="display: flex; gap: 4px; justify-content: center; align-items: center;">
                                    <input type="number" id="ret_qty_${it.id}" value="${rem}" min="0.01" max="${rem}" step="0.01" style="width: 55px; padding: 2px 4px; font-size: 11px; border: 1px solid #cbd5e1; border-radius: 4px; text-align: center;">
                                    <button type="button" onclick="submitRentalReturnPartial(${r.id}, ${it.id})" class="btn-primary" style="padding: 3px 6px; font-size: 10px; background: #0284c7; border-radius: 4px; font-weight: 700;">Devolver</button>
                                </div>
                            `}
                        </td>
                    </tr>
                `;
            });

            itemsHtml += `</tbody></table>`;
            if (itemsListEl) itemsListEl.innerHTML = itemsHtml;
        } else {
            if (itemsContainer) itemsContainer.style.display = "none";
        }

        // Calcular y actualizar panel de liquidación financiera (Días Reales vs Previstos)
        onRentalReturnDateChanged();
    }

    window.openModal?.('modalRentalReturn');
}

function onRentalReturnDateChanged() {
    const r = window.currentReturnRental;
    const container = document.getElementById("returnRentalSettlementContainer");
    if (!container) return;

    if (!r || r.operation_type !== 'alquiler' || !(r.rate_usd > 0)) {
        container.style.display = "none";
        return;
    }

    const startVal = r.start_date || r.created_at;
    const expectedVal = r.expected_return_date || r.start_date || r.created_at;
    const actualVal = document.getElementById("returnActualDate")?.value;

    if (!actualVal || !startVal) {
        container.style.display = "none";
        return;
    }

    const dStart = new Date(startVal);
    const dExpected = new Date(expectedVal);
    const dActual = new Date(actualVal);

    const msPerDay = 1000 * 60 * 60 * 24;
    const dStartMid = new Date(dStart.getFullYear(), dStart.getMonth(), dStart.getDate());
    const dExpectedMid = new Date(dExpected.getFullYear(), dExpected.getMonth(), dExpected.getDate());
    const dActualMid = new Date(dActual.getFullYear(), dActual.getMonth(), dActual.getDate());

    const plannedDays = Math.max(1, Math.round((dExpectedMid - dStartMid) / msPerDay));
    const actualDays = Math.max(1, Math.round((dActualMid - dStartMid) / msPerDay));
    const diffDays = actualDays - plannedDays;

    container.style.display = "block";
    const badgeEl = document.getElementById("returnRentalDaysBadge");
    const compEl = document.getElementById("returnRentalDaysComparison");
    const earlySec = document.getElementById("returnRentalEarlySection");
    const extSec = document.getElementById("returnRentalExtensionSection");

    const rate = Number(r.rate_usd || 0);

    if (diffDays < 0) {
        // Caso A: Devolución anticipada
        const earlyDays = Math.abs(diffDays);
        if (badgeEl) {
            badgeEl.className = "";
            badgeEl.style.cssText = "font-size: 11px; padding: 2px 8px; border-radius: 12px; font-weight: 700; background: #ecfdf5; color: #065f46;";
            badgeEl.innerText = `Entrega Anticipada (-${earlyDays} ${earlyDays === 1 ? 'día' : 'días'})`;
        }
        if (compEl) {
            compEl.innerHTML = `
                Pactados inicialmente: <strong>${plannedDays} días</strong> a $${rate.toFixed(2)}/día ($${(plannedDays * rate).toFixed(2)} USD).<br>
                Días reales transcurridos: <strong>${actualDays} días</strong> ($${(actualDays * rate).toFixed(2)} USD).
            `;
        }
        if (earlySec) earlySec.style.display = "block";
        if (extSec) extSec.style.display = "none";

        const earlyAmountText = document.getElementById("returnEarlyAdjustAmountText");
        if (earlyAmountText) earlyAmountText.innerText = `$${(actualDays * rate).toFixed(2)} USD`;
    } else if (diffDays > 0) {
        // Caso B / Variables: Días excedentes / Prórroga
        if (badgeEl) {
            badgeEl.className = "";
            badgeEl.style.cssText = "font-size: 11px; padding: 2px 8px; border-radius: 12px; font-weight: 700; background: #fffbeb; color: #92400e;";
            badgeEl.innerText = `Prórroga (+${diffDays} ${diffDays === 1 ? 'día extra' : 'días extras'})`;
        }
        if (compEl) {
            compEl.innerHTML = `
                Pactados inicialmente: <strong>${plannedDays} días</strong>.<br>
                Retorno registrado: <strong>${actualDays} días</strong> (+${diffDays} días adicionales a regularizar en CxC/CxP).
            `;
        }
        if (earlySec) earlySec.style.display = "none";
        if (extSec) extSec.style.display = "block";

        const origRateSpan = document.getElementById("returnOrigRateSpan");
        if (origRateSpan) origRateSpan.innerText = rate.toFixed(2);

        onRentalExtensionModeChanged();
    } else {
        // Periodo exacto
        if (badgeEl) {
            badgeEl.className = "";
            badgeEl.style.cssText = "font-size: 11px; padding: 2px 8px; border-radius: 12px; font-weight: 700; background: #e0f2fe; color: #0369a1;";
            badgeEl.innerText = `Periodo Exacto (${plannedDays} días)`;
        }
        if (compEl) {
            compEl.innerHTML = `Periodo pactado de <strong>${plannedDays} días</strong> cumplido conforme sin variaciones financieras.`;
        }
        if (earlySec) earlySec.style.display = "none";
        if (extSec) extSec.style.display = "none";
    }
}

function onRentalExtensionModeChanged() {
    const mode = document.getElementById("returnExtensionMode")?.value || "contract_rate";
    const negBox = document.getElementById("returnExtensionNegotiatedRateBox");
    const lumpBox = document.getElementById("returnExtensionLumpSumBox");

    if (negBox) negBox.style.display = (mode === "negotiated_rate") ? "block" : "none";
    if (lumpBox) lumpBox.style.display = (mode === "lump_sum") ? "block" : "none";

    updateExtensionCalculatedTotal();
}

function updateExtensionCalculatedTotal() {
    const r = window.currentReturnRental;
    if (!r) return;

    const startVal = r.start_date || r.created_at;
    const expectedVal = r.expected_return_date || r.start_date || r.created_at;
    const actualVal = document.getElementById("returnActualDate")?.value;

    const dStart = new Date(startVal);
    const dExpected = new Date(expectedVal);
    const dActual = new Date(actualVal);
    const msPerDay = 1000 * 60 * 60 * 24;
    const dStartMid = new Date(dStart.getFullYear(), dStart.getMonth(), dStart.getDate());
    const dExpectedMid = new Date(dExpected.getFullYear(), dExpected.getMonth(), dExpected.getDate());
    const dActualMid = new Date(dActual.getFullYear(), dActual.getMonth(), dActual.getDate());

    const plannedDays = Math.max(1, Math.round((dExpectedMid - dStartMid) / msPerDay));
    const actualDays = Math.max(1, Math.round((dActualMid - dStartMid) / msPerDay));
    const extraDays = Math.max(0, actualDays - plannedDays);

    const mode = document.getElementById("returnExtensionMode")?.value || "contract_rate";
    let extraTotal = 0;
    const origRate = Number(r.rate_usd || 0);

    if (mode === "contract_rate") {
        extraTotal = extraDays * origRate;
    } else if (mode === "negotiated_rate") {
        const negRate = parseFloat(document.getElementById("returnNegotiatedRateUsd")?.value || "0") || 0;
        extraTotal = extraDays * negRate;
    } else if (mode === "lump_sum") {
        extraTotal = parseFloat(document.getElementById("returnLumpSumUsd")?.value || "0") || 0;
    } else if (mode === "waive") {
        extraTotal = 0;
    }

    const previewEl = document.getElementById("returnExtensionTotalPreview");
    if (previewEl) {
        if (mode === "waive") {
            previewEl.innerText = "$0.00 USD (Cortesía Comercial Exonerada)";
            previewEl.style.color = "#059669";
        } else {
            previewEl.innerText = `$${extraTotal.toFixed(2)} USD`;
            previewEl.style.color = "#b45309";
        }
    }
}

async function submitRentalReturnAll(event) {
    if (event && event.preventDefault) event.preventDefault();
    const rentalId = document.getElementById("returnRentalId")?.value;
    if (!rentalId) return;

    const returnDate = document.getElementById("returnActualDate")?.value;
    const conditionStatus = document.getElementById("returnStatus")?.value || "devuelto_conforme";
    const returnNotes = document.getElementById("returnNotes")?.value || "";

    const payload = {
        return_date: returnDate ? new Date(returnDate).toISOString() : new Date().toISOString(),
        condition_status: conditionStatus,
        return_notes: returnNotes.trim() || null
    };

    const r = window.currentReturnRental;
    if (r && r.operation_type === 'alquiler' && (r.rate_usd > 0)) {
        const startVal = r.start_date || r.created_at;
        const expectedVal = r.expected_return_date || r.start_date || r.created_at;
        const actualVal = returnDate || new Date().toISOString().split('T')[0];

        const dStartMid = new Date(new Date(startVal).getFullYear(), new Date(startVal).getMonth(), new Date(startVal).getDate());
        const dExpectedMid = new Date(new Date(expectedVal).getFullYear(), new Date(expectedVal).getMonth(), new Date(expectedVal).getDate());
        const dActualMid = new Date(new Date(actualVal).getFullYear(), new Date(actualVal).getMonth(), new Date(actualVal).getDate());

        const plannedDays = Math.max(1, Math.round((dExpectedMid - dStartMid) / (1000 * 60 * 60 * 24)));
        const actualDays = Math.max(1, Math.round((dActualMid - dStartMid) / (1000 * 60 * 60 * 24)));

        if (actualDays < plannedDays) {
            const adjustCheck = document.getElementById("returnRentalAdjustDaysCheckbox")?.checked;
            if (adjustCheck) {
                payload.settlement_action = "adjust_real_days";
            }
        } else if (actualDays > plannedDays) {
            payload.settlement_action = "extension_negotiation";
            payload.extension_mode = document.getElementById("returnExtensionMode")?.value || "contract_rate";
            payload.negotiated_rate_usd = parseFloat(document.getElementById("returnNegotiatedRateUsd")?.value || "0") || null;
            payload.lump_sum_amount_usd = parseFloat(document.getElementById("returnLumpSumUsd")?.value || "0") || null;
            payload.settlement_notes = document.getElementById("returnSettlementNotes")?.value || null;
        }
    }

    try {
        const token = window.authToken || localStorage.getItem('dalor_token') || null;
        const res = await authFetch(`${API_BASE}/rentals/${rentalId}/return`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Error al registrar retorno");

        window.closeModal?.('modalRentalReturn');
        await loadRentalsList();
        if (typeof window.loadAssets === 'function') await window.loadAssets();
        if (typeof window.loadMaterialsList === 'function') await window.loadMaterialsList();
        await populateRentalResources();
        alert(data.message || "Devolución completa del lote registrada exitosamente.");
    } catch (e) {
        alert("Error: " + e.message);
    }
}

async function submitRentalReturnPartial(rentalId, subItemId) {
    const qtyInput = document.getElementById(`ret_qty_${subItemId}`);
    const qty = parseFloat(qtyInput?.value || "1");
    if (isNaN(qty) || qty <= 0) {
        alert("Por favor ingresa una cantidad válida a devolver.");
        return;
    }

    const conditionStatus = document.getElementById("returnStatus")?.value || "devuelto_conforme";
    const returnNotes = document.getElementById("returnNotes")?.value || "";

    const payload = {
        item_sub_id: subItemId,
        returned_quantity: qty,
        condition_status: conditionStatus,
        return_notes: returnNotes.trim() || null
    };

    try {
        const token = window.authToken || localStorage.getItem('dalor_token') || null;
        const res = await authFetch(`${API_BASE}/rentals/${rentalId}/return-partial`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Error al procesar retorno parcial");

        alert(data.message || "Retorno parcial registrado.");
        await loadRentalsList();
        if (typeof window.loadAssets === 'function') await window.loadAssets();
        if (typeof window.loadMaterialsList === 'function') await window.loadMaterialsList();
        await populateRentalResources();
        openReturnRentalModal(rentalId);
    } catch (e) {
        alert("Error: " + e.message);
    }
}

async function submitRentalReturn(event) {
    // Si se pulsa el botón inferior "Guardar Cierre", ejecuta el retorno de todo lo pendiente
    return submitRentalReturnAll(event);
}

// --- IMPRESIÓN OFICIAL DE GUÍA DE ENTREGA / DESPACHO DE ALQUILER O PRÉSTAMO ---
async function printRentalDeliveryNote(rentalId) {
    try {
        const token = window.authToken || localStorage.getItem('dalor_token') || null;
        const res = await authFetch(`${API_BASE}/rentals/${rentalId}/delivery-note`, {
            headers: token ? { "Authorization": `Bearer ${token}` } : {}
        });

        if (!res.ok) throw new Error("No se pudo obtener la nota de entrega");
        const g = await res.json();

        const itemsHtml = g.items.map((it, idx) => `
            <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
                <td style="padding: 6px 8px; text-align: center; font-weight: 800; color: #475569;">${idx + 1}</td>
                <td style="padding: 6px 8px; font-weight: 700; color: #0f172a;">${it.name}</td>
                <td style="padding: 6px 8px; font-size: 10px; color: #64748b; font-family: monospace;">${it.code || '-'}</td>
                <td style="padding: 6px 8px; text-align: center; font-weight: 800; color: #0284c7;">${it.quantity}</td>
                <td style="padding: 6px 8px; text-align: center; color: #475569;">${it.unit}</td>
                <td style="padding: 6px 8px; color: #334155;">${it.condition || 'Operativo Conforme'}</td>
                <td style="padding: 6px 8px; text-align: center; font-weight: 700; color: ${it.status === 'devuelto_total' ? '#059669' : '#0369a1'};">
                    ${it.status === 'devuelto_total' ? 'Devuelto' : 'En Custodia'}
                </td>
            </tr>
        `).join('');

        const sheetHtml = `
            <div style="background: white; padding: 25px; border-radius: 8px; font-family: 'Inter', sans-serif; color: #1e293b; max-width: 820px; margin: 0 auto; line-height: 1.4;">
                <!-- ENCABEZADO OFICIAL DALOR -->
                <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #F5B800; padding-bottom: 12px; margin-bottom: 14px;">
                    <div style="display: flex; align-items: center; gap: 14px;">
                        <img src="logo_dalor.jpg" alt="DALOR" style="height: 52px; max-width: 140px; object-fit: contain;" onerror="this.style.display='none'">
                        <div>
                            <h2 style="margin: 0; font-size: 18px; font-weight: 900; color: #002B49; letter-spacing: -0.5px; text-transform: uppercase;">Metalmecánica Dalor, C.A.</h2>
                            <p style="margin: 2px 0 0; font-size: 11px; color: #0284c7; font-weight: 700;">RIF: J-31601195-0 &bull; Zona Ind. Pruinca, Guacara, Edo. Carabobo</p>
                            <p style="margin: 1px 0 0; font-size: 10px; color: #64748b;">Fabricación, Metalmecánica, Montajes Industriales, Equipos & Obras</p>
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="background: #002B49; color: white; padding: 6px 14px; border-radius: 6px; font-size: 13px; font-weight: 900; display: inline-block; border-left: 4px solid #F5B800;">
                            ${g.guide_number}
                        </div>
                        <p style="margin: 4px 0 0; font-size: 11px; font-weight: 800; color: #0284c7;">${g.guide_type}</p>
                        <span style="display: inline-block; background: #e0f2fe; color: #0369a1; font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: 4px; margin-top: 3px;">
                            ${g.direction_label}
                        </span>
                    </div>
                </div>

                <!-- DATOS DE ENTREGA Y DESTINATARIO -->
                <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 14px; margin-bottom: 14px; background: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 11px;">
                    <div>
                        <span style="font-size: 10px; text-transform: uppercase; font-weight: 800; color: #64748b; display: block;">Destinatario / Contraparte:</span>
                        <strong style="font-size: 13px; color: #002B49;">${g.external_entity}</strong>
                        <p style="margin: 3px 0 0; color: #475569;"><b>Contacto:</b> ${g.contact_person} &bull; <b>Tel:</b> ${g.contact_phone}</p>
                        <p style="margin: 2px 0 0; color: #0284c7;"><b>Destino / Obra de Referencia:</b> ${g.destination_reference}</p>
                    </div>
                    <div>
                        <span style="font-size: 10px; text-transform: uppercase; font-weight: 800; color: #64748b; display: block;">Plazos & Modalidad:</span>
                        <p style="margin: 2px 0 0; color: #1e293b;"><b>Fecha de Salida / Emisión:</b> ${g.dispatch_date}</p>
                        <p style="margin: 2px 0 0; color: #1e293b;"><b>Fecha Límite Prevista:</b> ${g.expected_return_date}</p>
                        <p style="margin: 2px 0 0; color: #64748b;"><b>Régimen Financiero:</b> ${g.operation_type === 'prestamo' ? 'Préstamo sin costo / Comodato' : `Alquiler ($${g.rate_usd}/${g.rate_period})`}</p>
                    </div>
                </div>

                <!-- TABLA DE RENGLONES -->
                <div style="margin-bottom: 16px;">
                    <table style="width: 100%; border-collapse: collapse; border: 1px solid #cbd5e1;">
                        <thead>
                            <tr style="background: #002B49; color: white; font-size: 10.5px; text-transform: uppercase;">
                                <th style="padding: 7px; width: 30px; text-align: center;">#</th>
                                <th style="padding: 7px; text-align: left;">Descripción del Recurso / Activo / Material</th>
                                <th style="padding: 7px; width: 90px; text-align: left;">Serial / Placa / Cód</th>
                                <th style="padding: 7px; width: 50px; text-align: center;">Cant</th>
                                <th style="padding: 7px; width: 60px; text-align: center;">Unidad</th>
                                <th style="padding: 7px; width: 140px; text-align: left;">Condición al Salir</th>
                                <th style="padding: 7px; width: 85px; text-align: center;">Estatus</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsHtml}
                        </tbody>
                    </table>
                </div>

                ${g.notes ? `
                    <div style="background: #fffbeb; border: 1px solid #fde68a; padding: 8px 12px; border-radius: 6px; font-size: 10.5px; color: #92400e; margin-bottom: 16px;">
                        <b>Observaciones / Cláusulas:</b> ${g.notes}
                    </div>
                ` : ''}

                <!-- CAJAS DE FIRMA Y RECEPCIÓN (IDÉNTICO A GUÍAS DALOR) -->
                <div style="margin-top: 35px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; text-align: center; font-size: 10px;">
                    <div style="border-top: 1.5px solid #002B49; padding-top: 6px;">
                        <strong style="color: #002B49; display: block;">Despachado por DALOR</strong>
                        <span style="color: #334155; font-weight: 700; display: block; margin-top: 2px;">${g.dispatcher_name}</span>
                        <span style="color: #64748b; font-size: 9px;">Almacén & Custodia Central Guacara</span>
                    </div>
                    <div style="border-top: 1.5px solid #002B49; padding-top: 6px;">
                        <strong style="color: #002B49; display: block;">Transportado por / Custodio</strong>
                        <span style="color: #334155; font-weight: 700; display: block; margin-top: 2px;">Chofer / Cuadrilla</span>
                        <span style="color: #64748b; font-size: 9px;">Nombre, C.I. y Firma</span>
                    </div>
                    <div style="border-top: 1.5px solid #002B49; padding-top: 6px;">
                        <strong style="color: #002B49; display: block;">Recibido Conforme (Receptor)</strong>
                        <span style="color: #334155; font-weight: 700; display: block; margin-top: 2px;">${g.receiver_name}</span>
                        <span style="color: #64748b; font-size: 9px;">Nombre, C.I., Firma y Sello</span>
                    </div>
                </div>

                <!-- COLETILLA LEGAL SENIAT / TRÁNSITO -->
                <div style="margin-top: 22px; border-top: 1px dashed #cbd5e1; padding-top: 6px; font-size: 9px; color: #64748b; text-align: justify; line-height: 1.3;">
                    <b>VALIDEZ Y CONTROL:</b> La presente <b>Guía de Traslado y Entrega de Equipos</b> ampara la salida, movilización y asignación temporal en comodato/alquiler de los activos y materiales industriales descritos. El receptor asume la custodia integral, buen uso y obligación de devolución en las fechas convenidas en idénticas condiciones operativas.
                </div>
            </div>
        `;

        const printWin = window.open('', '_blank');
        printWin.document.write(`
            <html>
                <head>
                    <title>${g.guide_number} - Guía Oficial Metalmecánica Dalor C.A.</title>
                    <style>
                        body { margin: 0; padding: 20px; background: #f8fafc; font-family: sans-serif; }
                        @media print {
                            body { background: #fff; padding: 0; }
                            @page { margin: 10mm; }
                        }
                    </style>
                </head>
                <body>
                    ${sheetHtml}
                    <script>
                        window.onload = function() { window.print(); }
                    </script>
                </body>
            </html>
        `);
        printWin.document.close();
    } catch (e) {
        alert("Error al generar guía de entrega: " + e.message);
    }
}

async function deleteRentalRecord(rentalId) {
    if (!confirm("¿Estás seguro de anular este registro de préstamo o alquiler?")) return;
    try {
        const token = window.authToken || localStorage.getItem('dalor_token') || null;
        const res = await authFetch(`${API_BASE}/rentals/${rentalId}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Error al eliminar");
        loadRentalsList();
        if (typeof window.loadAssets === 'function') window.loadAssets();
    } catch (e) {
        alert("Error al anular: " + e.message);
    }
}

function openRentalsSubtab() {
    switchView('resources', 'recursos');
    if (typeof window.switchResourceSubtab === 'function') {
        window.switchResourceSubtab('rentals');
    }
}

// Exportar al scope global
if (typeof window !== 'undefined') {
    window.loadRentalsList = loadRentalsList;
    window.openCreateRentalModal = openCreateRentalModal;
    window.toggleRentalDirectionFields = toggleRentalDirectionFields;
    window.toggleRentalOperationType = toggleRentalOperationType;
    window.fillRentalAssetDetails = fillRentalAssetDetails;
    window.addResourceToRentalCart = addResourceToRentalCart;
    window.removeRentalCartItem = removeRentalCartItem;
    window.submitCreateRental = submitCreateRental;
    window.openReturnRentalModal = openReturnRentalModal;
    window.submitRentalReturn = submitRentalReturn;
    window.submitRentalReturnAll = submitRentalReturnAll;
    window.submitRentalReturnPartial = submitRentalReturnPartial;
    window.printRentalDeliveryNote = printRentalDeliveryNote;
    window.deleteRentalRecord = deleteRentalRecord;
    window.applyRentalsFilter = applyRentalsFilter;
    window.debouncedApplyRentalsFilter = debouncedApplyRentalsFilter;
    window.goToRentalsPage = goToRentalsPage;
    window.openRentalsSubtab = openRentalsSubtab;
    window.filterRentalResources = filterRentalResources;
    window.clearRentalResourceSearch = clearRentalResourceSearch;
    window.onRentalClientSelected = onRentalClientSelected;
    window.selectPredictiveRentalResource = selectPredictiveRentalResource;
    window.onRentalReturnDateChanged = onRentalReturnDateChanged;
    window.onRentalExtensionModeChanged = onRentalExtensionModeChanged;
    window.updateExtensionCalculatedTotal = updateExtensionCalculatedTotal;
    window.checkRentalClientCreditRisk = checkRentalClientCreditRisk;
    window.confirmRentalClientRisk = confirmRentalClientRisk;
    window.cancelRentalClientRisk = cancelRentalClientRisk;
}

export { 
    loadRentalsList, openCreateRentalModal, toggleRentalDirectionFields,
    toggleRentalOperationType, fillRentalAssetDetails, addResourceToRentalCart,
    removeRentalCartItem, submitCreateRental, openReturnRentalModal,
    submitRentalReturn, submitRentalReturnAll, submitRentalReturnPartial,
    printRentalDeliveryNote, deleteRentalRecord, applyRentalsFilter,
    debouncedApplyRentalsFilter, goToRentalsPage, openRentalsSubtab,
    filterRentalResources, clearRentalResourceSearch, onRentalClientSelected,
    selectPredictiveRentalResource, onRentalReturnDateChanged,
    onRentalExtensionModeChanged, updateExtensionCalculatedTotal,
    checkRentalClientCreditRisk, confirmRentalClientRisk, cancelRentalClientRisk
};
