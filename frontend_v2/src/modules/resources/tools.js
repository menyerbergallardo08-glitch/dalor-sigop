/**
 * DALOR SIGO-P | Módulo Especializado de Recursos
 */
var API_BASE = window.API_BASE || (window.location.origin + "/api/v1");
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

let groupedToolsList = [];
let rawToolsList = [];

function populateToolCategoryDropdown(grouped, raw) {
    const catSelect = document.getElementById("toolCategoryFilter");
    if (!catSelect) return;
    const currentVal = catSelect.value || 'all';
    const cats = new Set();
    (grouped || []).forEach(g => { 
        if (g.category && g.category.trim()) cats.add(g.category.trim()); 
        if (g.asset_type && g.asset_type !== 'herramienta') {
            cats.add(g.asset_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()));
        }
    });
    (raw || []).forEach(t => { 
        if (t.category && t.category.trim()) cats.add(t.category.trim()); 
        if (t.asset_type && t.asset_type !== 'herramienta') {
            cats.add(t.asset_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()));
        }
    });
    const categories = Array.from(cats).filter(Boolean).sort();
    catSelect.innerHTML = `<option value="all">Todas las Categorías (${categories.length})</option>` +
        categories.map(c => `<option value="${c}" ${c === currentVal ? 'selected' : ''}>${c}</option>`).join('');
}

async function loadToolsList() {
    const tbody = document.getElementById("toolsTableBody");
    if (!tbody) return;

    // SWR: Si ya existen herramientas en memoria, renderizar de inmediato (0 ms)
    const hasCached = Array.isArray(groupedToolsList) && groupedToolsList.length > 0;
    if (hasCached) {
        populateToolCategoryDropdown(groupedToolsList, rawToolsList);
        renderGroupedTools(groupedToolsList);
    } else {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px; color: #94a3b8;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando inventario de herramientas agrupadas...</td></tr>`;
    }

    try {
        const res = await authFetch(`${API_BASE}/assets/tools-summary`);
        if (res.ok) {
            groupedToolsList = await res.json();
            rawToolsList = groupedToolsList.flatMap(g => g.items || []);
            window.rawToolsList = rawToolsList;
            populateToolCategoryDropdown(groupedToolsList, rawToolsList);
            renderGroupedTools(groupedToolsList);
            return;
        }

        // Fallback si endpoint no está disponible
        const fallbackRes = await authFetch(`${API_BASE}/assets/`);
        const assets = await fallbackRes.json();
        const nonTools = ['vehiculo', 'camioneta', 'camion', 'remolque', 'maquinaria', 'planta', 'generador', 'compresor'];
        rawToolsList = assets.filter(a => !nonTools.includes(a.asset_type));
        window.rawToolsList = rawToolsList;

        if (rawToolsList.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px; color: #94a3b8;">No hay herramientas registradas.</td></tr>`;
            return;
        }

        // Agrupar herramientas idénticas por nombre normalizado
        const groups = {};
        rawToolsList.forEach(t => {
            const key = (t.name || 'HERRAMIENTA GENERAL').trim().toUpperCase();
            if (!groups[key]) {
                groups[key] = {
                    name: t.name.trim(),
                    asset_type: t.asset_type || 'herramienta',
                    category: t.category || 'General',
                    items: [],
                    total: 0,
                    available: 0,
                    in_use: 0,
                    locations: new Set()
                };
            }
            groups[key].items.push(t);
            const st = (t.status || '').toLowerCase().trim();
            const loc = (t.current_location || '').toLowerCase().trim();
            const isBaseLoc = !loc || loc.includes('sede') || loc.includes('base') || loc.includes('guacara') || loc.includes('pañol') || loc.includes('panol');
            const notInBase = !isBaseLoc || st.includes('alquil') || st.includes('presta') || st.includes('mantenimiento') || st.includes('mtto') || st === 'en_obra' || st === 'asignado' || st === 'en_transito' || st === 'desincorporado' || st === 'inactivo' || Boolean(t.current_project_id);
            const inBase = isBaseLoc && !notInBase && (st === 'disponible_base' || st === 'disponible' || !st);
            if (inBase) {
                groups[key].available++;
            } else {
                groups[key].in_use++;
            }
            if (t.current_location) groups[key].locations.add(t.current_location);
        });

        groupedToolsList = Object.values(groups).map(g => ({
            ...g,
            locations: Array.from(g.locations)
        }));

        populateToolCategoryDropdown(groupedToolsList, rawToolsList);
        renderGroupedTools(groupedToolsList);

    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #e11d48; padding: 20px;">Error al cargar herramientas.</td></tr>`;
    }
}

let lastGroupedToolsList = [];
let toolsCurrentPage = 1;
let toolsPageSize = 10;

function goToToolsPage(page) {
    toolsCurrentPage = page;
    renderGroupedToolsPaginated();
    const tableEl = document.getElementById("toolsTableBody");
    if (tableEl) tableEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function changeToolsPageSize(size) {
    toolsPageSize = parseInt(size) || 10;
    toolsCurrentPage = 1;
    renderGroupedToolsPaginated();
}

function renderGroupedTools(list) {
    lastGroupedToolsList = list || [];
    toolsCurrentPage = 1;
    renderGroupedToolsPaginated();
}

function renderGroupedToolsPaginated() {
    const list = lastGroupedToolsList;
    const tbody = document.getElementById("toolsTableBody");
    const countBadge = document.getElementById("toolsCountBadge");
    if (countBadge) countBadge.innerText = `${list.length} modelos (${list.reduce((acc, g) => acc + g.total, 0)} unidades físicas)`;

    if (!tbody) return;
    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px; color: #94a3b8;">No se encontraron herramientas con los filtros seleccionados.</td></tr>`;
        const container = document.getElementById("toolsPaginationContainer");
        if (container) {
            container.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 11.5px; color: #64748b; margin-top: 8px;">
                    <span>Mostrando <b>0</b> modelo(s) de herramientas</span>
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <span>Mostrar:</span>
                        <select onchange="changeToolsPageSize(this.value)" style="padding: 2px 6px; font-size: 11px; border: 1px solid #cbd5e1; border-radius: 4px; background: white; font-weight: 700; cursor: pointer;">
                            <option value="10" ${toolsPageSize === 10 ? 'selected' : ''}>10</option>
                            <option value="20" ${toolsPageSize === 20 ? 'selected' : ''}>20</option>
                            <option value="50" ${toolsPageSize === 50 ? 'selected' : ''}>50</option>
                            <option value="100" ${toolsPageSize === 100 ? 'selected' : ''}>100</option>
                        </select>
                    </div>
                </div>
            `;
        }
        return;
    }

    const paginateFn = typeof window.renderPaginationControls === 'function' 
        ? window.renderPaginationControls 
        : (typeof renderPaginationControls === 'function' ? renderPaginationControls : () => ({ startIndex: 0, endIndex: list.length }));

    const { startIndex, endIndex } = paginateFn({
        containerId: "toolsPaginationContainer",
        totalItems: list.length,
        currentPage: toolsCurrentPage,
        pageSize: toolsPageSize,
        onPageChange: "goToToolsPage",
        onPageSizeChange: "changeToolsPageSize",
        itemLabel: "modelo(s) de herramientas",
        pageSizeOptions: [10, 20, 50, 100]
    });

    const pageItems = list.slice(startIndex, endIndex);

    tbody.innerHTML = pageItems.map((g, idx) => {
        const sampleCode = g.items[0]?.asset_code || 'HER';
        const sampleBrand = g.items[0]?.brand || '';
        const sampleModel = g.items[0]?.model ? `(${g.items[0].model})` : '';
        const locDisplay = g.locations.length > 0 ? g.locations.slice(0, 2).join(', ') : 'Sede Central';
        const rowCollapseId = `tool_units_row_${startIndex + idx}`;

        // Renderizar tabla interna de unidades individuales
        const unitsRows = g.items.map(it => {
            const st = (it.status || '').toLowerCase().trim();
            const loc = (it.current_location || '').toLowerCase().trim();
            const isBaseLoc = !loc || loc.includes('sede') || loc.includes('base') || loc.includes('guacara') || loc.includes('pañol') || loc.includes('panol');
            const isRented = st.includes('alquil');
            const isLoaned = st.includes('presta') || st.includes('comodato');
            const isMaint = st.includes('mantenimiento') || st.includes('mtto') || st.includes('taller');
            const isObra = !isBaseLoc || Boolean(it.current_project_id) || st === 'en_obra';
            const isAsignado = st === 'asignado' || st === 'en_operacion' || st === 'en_uso';
            const isTransito = st === 'en_transito' || st === 'despachado';
            const isBaja = st === 'desincorporado' || st === 'baja' || st === 'inactivo';
            const isAvail = isBaseLoc && !isRented && !isLoaned && !isMaint && !isObra && !isAsignado && !isTransito && !isBaja && (st === 'disponible_base' || st === 'disponible' || !st);

            let statusBadge = '';
            if (isAvail) {
                statusBadge = '<span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 800; background: #dcfce7; color: #166534;"><i class="fa-solid fa-circle-check"></i> DISPONIBLE</span>';
            } else if (isRented) {
                statusBadge = '<span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 800; background: #e0e7ff; color: #3730a3; border: 1px solid #c7d2fe;" title="Activo alquilado a tercero"><i class="fa-solid fa-handshake"></i> ALQUILADO</span>';
            } else if (isLoaned) {
                statusBadge = '<span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 800; background: #fef3c7; color: #92400e; border: 1px solid #fde68a;" title="Activo en préstamo / alianza"><i class="fa-solid fa-handshake-angle"></i> EN PRÉSTAMO</span>';
            } else if (isMaint) {
                statusBadge = '<span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 800; background: #fed7aa; color: #c2410c;"><i class="fa-solid fa-wrench"></i> EN MTTO</span>';
            } else if (isObra) {
                statusBadge = '<span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 800; background: #fee2e2; color: #991b1b;"><i class="fa-solid fa-helmet-safety"></i> EN OBRA</span>';
            } else if (isTransito) {
                statusBadge = '<span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 800; background: #fef9c3; color: #854d0e; border: 1px solid #fef08a;"><i class="fa-solid fa-truck-fast"></i> EN TRÁNSITO</span>';
            } else if (isAsignado) {
                statusBadge = '<span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 800; background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1;"><i class="fa-solid fa-user-check"></i> ASIGNADO</span>';
            } else if (isBaja) {
                statusBadge = '<span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 800; background: #f3f4f6; color: #6b7280;"><i class="fa-solid fa-ban"></i> DE BAJA</span>';
            } else {
                statusBadge = `<span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 800; background: #f1f5f9; color: #475569;">${(st || 'OCUPADO').toUpperCase()}</span>`;
            }

            return `
                <tr style="border-bottom: 1px solid #e2e8f0; background: #ffffff;">
                    <td style="padding: 5px 8px; font-weight: 800; color: var(--dalor-navy); font-family: monospace;">${it.asset_code}</td>
                    <td style="padding: 5px 8px; font-size: 11px;">${it.brand || '-'} ${it.model || ''}</td>
                    <td style="padding: 5px 8px; font-family: monospace; font-size: 11px; color: #64748b;">${it.serial_number || '-'}</td>
                    <td style="padding: 5px 8px; font-size: 11px; color: #334155;">${it.current_location || 'Sede Central'}</td>
                    <td style="padding: 5px 8px; font-size: 11px; color: #2563eb; font-weight: 600;">${it.current_custodian_name || 'En Pañol Base'}</td>
                    <td style="padding: 5px 8px; text-align: center;">
                        ${statusBadge}
                    </td>
                    <td style="padding: 5px 8px; text-align: center; white-space: nowrap;">
                        ${isAvail ? `
                            <button onclick="openAssignSingleToolUnitModal(${it.id}, '${it.asset_code}', '${(it.name || '').replace(/'/g, "\\'")}')" class="btn-primary" style="padding: 2px 7px; font-size: 10px; margin-right: 3px; background: #0284c7; border: none; color: white;" title="Asignar esta unidad física individual a una obra específica">
                                <i class="fa-solid fa-arrow-right-from-bracket"></i> Asignar
                            </button>
                        ` : ''}
                        ${(isObra || isAsignado) ? `
                            <button onclick="openTransferSingleToolUnitModal(${it.id}, '${it.asset_code}', '${(it.name || '').replace(/'/g, "\\'")}')" class="btn-secondary" style="padding: 2px 6px; font-size: 10px; color: #d97706; border-color: #fde68a; background: #fefce8; margin-right: 3px;" title="Transferir esta unidad directamente a otra obra">
                                <i class="fa-solid fa-arrow-right-arrow-left"></i> Transferir
                            </button>
                            <button onclick="confirmReturnSingleToolToBase(${it.id}, '${it.asset_code}', '${(it.name || '').replace(/'/g, "\\'")}')" class="btn-secondary" style="padding: 2px 6px; font-size: 10px; color: #16a34a; border-color: #bbf7d0; background: #f0fdf4; margin-right: 3px;" title="Retornar esta unidad a la Base Central">
                                <i class="fa-solid fa-house-chimney"></i> A Base
                            </button>
                        ` : ''}
                        <button onclick="openEditAssetModal(${it.id})" class="btn-secondary" style="padding: 2px 6px; font-size: 10px; color: #0284c7; border-color: #bae6fd; margin-right: 3px;" title="Editar Ficha de esta Herramienta">
                            <i class="fa-solid fa-pen"></i> Editar
                        </button>
                        ${isAvail ? `
                            <button onclick="confirmRemoveSingleToolUnit(${it.id}, '${it.asset_code}', '${(it.name || '').replace(/'/g, "\\'")}')" class="btn-secondary" style="padding: 2px 6px; font-size: 10px; color: #dc2626; border-color: #fecaca; margin-right: 3px;" title="Dar de baja / restar esta unidad física del inventario">
                                <i class="fa-solid fa-trash-can"></i> Restar
                            </button>
                        ` : ''}
                        ${!isAvail ? `
                            <button onclick="openSubstituteResourceModal('asset', ${it.id}, '${(it.name || '').replace(/'/g, "\\'")}', ${it.current_project_id})" class="btn-secondary" style="padding: 2px 6px; font-size: 10px; color: #2563eb; border-color: #bfdbfe; margin-right: 3px;" title="Sustituir en Obra por otra herramienta disponible">
                                <i class="fa-solid fa-arrows-rotate"></i> Sustituir
                            </button>
                        ` : ''}
                        <button onclick="openAssetHistoryModal(${it.id}, '${it.asset_code}', '${(it.name || '').replace(/'/g, "\\'")}')" class="btn-secondary" style="padding: 2px 6px; font-size: 10px; color: #2563eb; border-color: #bfdbfe;" title="Ver Bitácora de esta unidad física">
                            <i class="fa-solid fa-clock-rotate-left"></i> Traza
                        </button>
                    </td>

                </tr>
            `;
        }).join('');

        return `
        <tr style="background: #ffffff; border-bottom: 1px solid #e2e8f0;">
            <td>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <button onclick="toggleToolUnitsBreakdown('${rowCollapseId}')" style="background: none; border: 1px solid #cbd5e1; border-radius: 4px; width: 22px; height: 22px; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; color: #0284c7;" title="Desplegar / Ocultar desglose de unidades físicas">
                        <i id="icon_${rowCollapseId}" class="fa-solid fa-chevron-right" style="font-size: 10px; transition: transform 0.2s;"></i>
                    </button>
                    <div>
                        <div style="font-weight: 800; color: var(--dalor-navy); cursor: pointer;" onclick="toggleToolUnitsBreakdown('${rowCollapseId}')">
                            ${g.name}
                        </div>
                        <div style="font-size: 10px; color: #64748b; font-family: monospace;">Muestra: ${sampleCode} ${sampleBrand} ${sampleModel}</div>
                    </div>
                </div>
            </td>
            <td><span style="font-size: 10px; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-weight: 700;">${(g.asset_type || 'HERRAMIENTA').toUpperCase().replace('_', ' ')}</span></td>
            <td style="text-align: center;">
                <span style="font-size: 12px; font-weight: 800; background: #e0e7ff; color: #3730a3; padding: 3px 8px; border-radius: 6px;">${g.total}</span>
            </td>
            <td style="text-align: center;">
                <span style="font-size: 12px; font-weight: 800; background: ${g.available > 0 ? '#dcfce7' : '#f1f5f9'}; color: ${g.available > 0 ? '#166534' : '#94a3b8'}; padding: 3px 8px; border-radius: 6px;">
                    ${g.available}
                </span>
            </td>
            <td style="text-align: center;">
                <span style="font-size: 12px; font-weight: 800; background: ${g.in_use > 0 ? '#fee2e2' : '#f1f5f9'}; color: ${g.in_use > 0 ? '#991b1b' : '#94a3b8'}; padding: 3px 8px; border-radius: 6px;">
                    ${g.in_use}
                </span>
            </td>
            <td style="font-size: 11px; color: #334155;">${locDisplay}</td>
            <td style="text-align: center; white-space: nowrap;">
                <button onclick="toggleToolUnitsBreakdown('${rowCollapseId}')" class="btn-secondary" style="padding: 3px 8px; font-size: 11px; margin-right: 4px; color: #475569; background: #f8fafc;" title="Ver desglose detallado de cada serial y unidad">
                    <i class="fa-solid fa-layer-group"></i> Desglose (${g.total})
                </button>
                <button onclick="openAddToolUnitsModal('${encodeURIComponent(g.name)}', ${g.total})" class="btn-secondary" style="padding: 3px 8px; font-size: 11px; margin-right: 4px; color: #16a34a; border-color: #bbf7d0; background: #f0fdf4;" title="Agregar más unidades / cantidades a este modelo">
                    <i class="fa-solid fa-plus"></i> + Cantidad
                </button>
                <button onclick="openRemoveToolUnitsModal('${encodeURIComponent(g.name)}', ${g.available}, ${g.total})" class="btn-secondary" style="padding: 3px 8px; font-size: 11px; margin-right: 4px; color: #dc2626; border-color: #fecaca; background: #fef2f2;" title="Restar o desincorporar unidades disponibles en base">
                    <i class="fa-solid fa-minus"></i> - Cantidad
                </button>
                <button onclick="openEditAssetModal(${g.items[0]?.id})" class="btn-secondary" style="padding: 3px 8px; font-size: 11px; margin-right: 4px; color: #0284c7; border-color: #bae6fd;" title="Editar Ficha Técnica de esta Herramienta">
                    <i class="fa-solid fa-pen"></i> Editar
                </button>

                ${g.available > 0 ? `
                    <button onclick="assignAvailableToolFromGroup('${encodeURIComponent(g.name)}')" class="btn-primary" style="padding: 3px 8px; font-size: 11px; margin-right: 4px;" title="Asignar una unidad disponible a obra">
                        <i class="fa-solid fa-arrow-right-from-bracket"></i> Asignar
                    </button>
                ` : ''}
                <button onclick="openToolHistoryModal('${encodeURIComponent(g.name)}')" class="btn-secondary" style="padding: 3px 8px; font-size: 11px; color: #0284c7; border-color: #bae6fd;" title="Ver Historial de Traza Global">
                    <i class="fa-solid fa-clock-rotate-left"></i> Traza
                </button>
            </td>
        </tr>
        <!-- FILA DE DESGLOSE DE UNIDADES INDIVIDUALES -->
        <tr id="${rowCollapseId}" class="hidden" style="background: #f8fafc;">
            <td colspan="7" style="padding: 12px 16px; border-left: 3px solid #0284c7;">
                <div style="font-size: 11px; font-weight: 800; color: #002B49; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
                    <span><i class="fa-solid fa-boxes-stacked" style="color: #0284c7;"></i> Desglose Unitario de [${g.name}] &bull; ${g.total} unidad(es) física(s) con serial y custodio:</span>
                    <span style="color: #64748b; font-weight: 600;">Disponibles: <b style="color: #166534;">${g.available}</b> | En Uso / Préstamo: <b style="color: #991b1b;">${g.in_use}</b></span>
                </div>
                <div style="border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; background: white;">
                    <table style="width: 100%; font-size: 11px; margin: 0;">
                        <thead>
                            <tr style="background: #f1f5f9; border-bottom: 1px solid #cbd5e1;">
                                <th style="padding: 6px 8px; text-align: left;">Código Dalor</th>
                                <th style="padding: 6px 8px; text-align: left;">Marca / Modelo</th>
                                <th style="padding: 6px 8px; text-align: left;">Serial Físico</th>
                                <th style="padding: 6px 8px; text-align: left;">Ubicación Actual</th>
                                <th style="padding: 6px 8px; text-align: left;">Custodio / Técnico</th>
                                <th style="padding: 6px 8px; text-align: center;">Estatus</th>
                                <th style="padding: 6px 8px; text-align: center;">Acción</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${unitsRows}
                        </tbody>
                    </table>
                </div>
            </td>
        </tr>`;
    }).join('');
}

function toggleToolUnitsBreakdown(rowId) {
    const row = document.getElementById(rowId);
    const icon = document.getElementById(`icon_${rowId}`);
    if (row) {
        const isHidden = row.classList.contains('hidden');
        if (isHidden) {
            row.classList.remove('hidden');
            if (icon) icon.style.transform = 'rotate(90deg)';
        } else {
            row.classList.add('hidden');
            if (icon) icon.style.transform = 'rotate(0deg)';
        }
    }
}
window.toggleToolUnitsBreakdown = toggleToolUnitsBreakdown;

function filterToolsList() {
    const rawQ = (document.getElementById("toolSearchInput")?.value || '').trim();
    const status = document.getElementById("toolStatusFilter")?.value || 'all';
    const cat = document.getElementById("toolCategoryFilter")?.value || 'all';

    const cleanStr = (s) => (s || '').toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    const tokens = rawQ ? cleanStr(rawQ).split(/\s+/).filter(Boolean) : [];
    const catNorm = cat !== 'all' ? cleanStr(cat) : '';

    let filtered = groupedToolsList.filter(g => {
        // 1. Búsqueda por Texto (Todos los tokens deben coincidir en algún atributo de la herramienta o sus unidades)
        let matchText = true;
        if (tokens.length > 0) {
            let searchable = cleanStr(g.name) + ' ' + cleanStr(g.category) + ' ';
            if (g.asset_type && g.asset_type !== 'herramienta') {
                searchable += cleanStr(g.asset_type) + ' ';
            }
            if (Array.isArray(g.locations)) {
                searchable += g.locations.map(cleanStr).join(' ') + ' ';
            }
            if (Array.isArray(g.items)) {
                g.items.forEach(it => {
                    searchable += cleanStr(it.asset_code) + ' ' + 
                                  cleanStr(it.serial_number) + ' ' + 
                                  cleanStr(it.brand) + ' ' + 
                                  cleanStr(it.model) + ' ' + 
                                  cleanStr(it.current_location) + ' ' + 
                                  cleanStr(it.current_custodian_name) + ' ';
                });
            }
            matchText = tokens.every(tok => searchable.includes(tok));
        }

        // 2. Filtro de Disponibilidad
        let matchStatus = true;
        if (status === 'disponible') matchStatus = g.available > 0;
        if (status === 'en_obra') matchStatus = g.in_use > 0;

        // 3. Filtro de Categoría / Tipo
        let matchCat = true;
        if (catNorm) {
            matchCat = cleanStr(g.category) === catNorm ||
                       cleanStr(g.asset_type).replace(/_/g, ' ') === catNorm ||
                       (Array.isArray(g.items) && g.items.some(it => 
                           cleanStr(it.category) === catNorm || 
                           cleanStr(it.asset_type).replace(/_/g, ' ') === catNorm
                       ));
        }

        return matchText && matchStatus && matchCat;
    });

    renderGroupedTools(filtered);
}

function assignAvailableToolFromGroup(encodedName) {
    const name = decodeURIComponent(encodedName);
    const unit = rawToolsList.find(t => {
        const st = (t.status || '').toLowerCase().trim();
        const isAvail = !['alquilado_a_tercero', 'prestado_a_cliente', 'alquilado', 'en_prestamo', 'en_mantenimiento', 'en_obra'].includes(st) && !t.current_project_id && (st === 'disponible_base' || st === 'disponible' || !st);
        return t.name.trim().toUpperCase() === name.trim().toUpperCase() && isAvail;
    });
    if (!unit) {
        alert("No hay unidades disponibles de esta herramienta en Base (están en obra, alquiler o préstamo).");
        return;
    }
    openAssignModal('asset', unit.id, unit.name, 'assign');
}

let currentToolHistoryList = [];
let currentToolHistoryPage = 1;
let currentToolHistoryPageSize = 6;

function goToToolHistoryPage(page) {
    currentToolHistoryPage = page;
    renderToolHistoryTablePaginated();
}

function changeToolHistoryPageSize(size) {
    currentToolHistoryPageSize = parseInt(size) || 6;
    currentToolHistoryPage = 1;
    renderToolHistoryTablePaginated();
}

function renderToolHistoryTablePaginated() {
    const tbody = document.getElementById("toolHistoryTableBody");
    const container = document.getElementById("toolHistoryPagination");
    if (!tbody) return;

    if (!currentToolHistoryList || currentToolHistoryList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #94a3b8; padding: 16px;">No se registran movimientos para esta herramienta (permanece en Base Central).</td></tr>`;
        if (container) container.innerHTML = '';
        return;
    }

    const paginateFn = typeof window.renderPaginationControls === 'function' 
        ? window.renderPaginationControls 
        : (typeof renderPaginationControls === 'function' ? renderPaginationControls : () => ({ startIndex: 0, endIndex: currentToolHistoryList.length }));

    const { startIndex, endIndex } = paginateFn({
        containerId: "toolHistoryPagination",
        totalItems: currentToolHistoryList.length,
        currentPage: currentToolHistoryPage,
        pageSize: currentToolHistoryPageSize,
        onPageChange: "goToToolHistoryPage",
        onPageSizeChange: "changeToolHistoryPageSize",
        itemLabel: "movimiento(s) en traza",
        pageSizeOptions: [6, 12, 25],
        allowAll: true
    });

    const pageItems = currentToolHistoryList.slice(startIndex, endIndex);

    tbody.innerHTML = pageItems.map(h => `
        <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 8px; font-weight: 700; color: #64748b; font-size: 10px;">${h.assigned_at}</td>
            <td style="padding: 8px; font-weight: 800; color: var(--dalor-navy); font-family: monospace;">${h.resource_code}</td>
            <td style="padding: 8px;">
                <span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 700; ${h.status === 'en_obra' ? 'background: #e0f2fe; color: #0369a1;' : 'background: #dcfce7; color: #166534;'}">
                    ${h.status === 'en_obra' ? 'Despacho a Obra' : 'Retorno a Base'}
                </span>
            </td>
            <td style="padding: 8px; font-weight: 600;">${h.destination_location} (${h.project_name})</td>
            <td style="padding: 8px;">${h.custodian_name || h.driver_name || '-'}</td>
        </tr>
    `).join('');
}

async function openToolHistoryModal(encodedName) {
    const name = decodeURIComponent(encodedName);
    const modalTitle = document.getElementById("modalToolHistoryTitle");
    const modalSub = document.getElementById("modalToolHistorySubtitle");
    const tbody = document.getElementById("toolHistoryTableBody");

    if (modalTitle) modalTitle.innerHTML = `<i class="fa-solid fa-clock-rotate-left" style="color: var(--dalor-blue);"></i> Traza: ${name}`;
    if (modalSub) modalSub.innerText = `Histórico de movimientos de las unidades de este modelo.`;
    if (tbody) tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #94a3b8; padding: 16px;"><i class="fa-solid fa-spinner fa-spin"></i> Consultando traza...</td></tr>`;

    openModal("modalToolHistory");

    try {
        const res = await authFetch(`${API_BASE}/resources/history?name=${encodeURIComponent(name)}`);
        if (!res.ok) throw new Error("Error en servidor");
        const history = await res.json();

        currentToolHistoryList = history || [];
        currentToolHistoryPage = 1;
        renderToolHistoryTablePaginated();

    } catch (e) {
        if (tbody) tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #e11d48; padding: 16px;">Error al cargar la traza de movimientos.</td></tr>`;
    }
}



let toolCategoryDebounceTimer = null;

async function fetchNextToolCode(assetType, category) {
    try {
        let url = `${API_BASE}/assets/next-code?asset_type=${encodeURIComponent(assetType || 'herramienta')}`;
        if (category && category.trim()) {
            url += `&category=${encodeURIComponent(category.trim())}`;
        }
        const res = await authFetch(url);
        if (res.ok) {
            const data = await res.json();
            const codeInp = document.getElementById("tool_code");
            if (codeInp && data.next_code) {
                codeInp.value = data.next_code;
                codeInp.style.borderColor = "#10b981";
                codeInp.style.backgroundColor = "#f0fdf4";
                setTimeout(() => {
                    codeInp.style.borderColor = "";
                    codeInp.style.backgroundColor = "";
                }, 1000);
            }
        }
    } catch (e) {
        console.error("Error al obtener próximo código de herramienta:", e);
    }
}

function onToolTypeOrCategoryChanged() {
    const type = document.getElementById("tool_type")?.value || 'herramienta';
    const cat = document.getElementById("tool_category")?.value || '';
    fetchNextToolCode(type, cat);
}

function onToolCategoryTyped(val) {
    if (toolCategoryDebounceTimer) clearTimeout(toolCategoryDebounceTimer);
    toolCategoryDebounceTimer = setTimeout(() => {
        const type = document.getElementById("tool_type")?.value || 'herramienta';
        fetchNextToolCode(type, val);
    }, 300);
}

function openNewToolModal() {
    const form = document.getElementById("toolForm");
    if (form) form.reset();
    
    const catInp = document.getElementById("tool_category");
    if (catInp) catInp.value = "";
    
    const type = document.getElementById("tool_type")?.value || 'herramienta';
    fetchNextToolCode(type, '');

    openModal("modalTool");
}

async function submitCreateTool(event) {
    event.preventDefault();
    const qty = parseInt(document.getElementById("tool_quantity")?.value || "1", 10) || 1;
    const catVal = (document.getElementById("tool_category")?.value || "").trim() || "General";

    const payload = {
        asset_code: document.getElementById("tool_code").value.trim(),
        name: document.getElementById("tool_name").value.trim(),
        asset_type: document.getElementById("tool_type").value,
        category: catVal,
        brand: document.getElementById("tool_brand").value.trim(),
        serial_number: document.getElementById("tool_serial").value.trim(),
        current_location: document.getElementById("tool_location").value || "Sede Central Dalor (Guacara)",
        is_exclusive: true,
        quantity: qty
    };

    try {
        const res = await authFetch(`${API_BASE}/assets/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            alert(qty > 1 ? `✅ Se registraron exitosamente ${qty} unidades de la herramienta.` : "✅ Herramienta/Equipo registrado exitosamente.");
            closeModal("modalTool");
            await loadInitialMasterData();
            loadToolsList();
            if (typeof loadMachineryList === "function") loadMachineryList();
            if (typeof loadFleetList === "function") loadFleetList();
        } else {
            const err = await res.json();
            alert("Error: " + (err.detail || JSON.stringify(err)));
        }
    } catch (e) {
        alert("Error al registrar herramienta: " + e.message);
    }
}

function openAddToolUnitsModal(toolNameEncoded, currentTotal) {
    const toolName = decodeURIComponent(toolNameEncoded);
    const hiddenInput = document.getElementById("add_units_tool_name");
    const nameDisplay = document.getElementById("add_units_display_name");
    const currentDisplay = document.getElementById("add_units_display_current");
    const qtyInput = document.getElementById("add_units_quantity");
    const prefixInput = document.getElementById("add_units_prefix");
    const locInput = document.getElementById("add_units_location");

    if (hiddenInput) hiddenInput.value = toolName;
    if (nameDisplay) nameDisplay.innerText = toolName;
    if (currentDisplay) currentDisplay.innerText = `Unidades físicas actuales: ${currentTotal}`;
    if (qtyInput) qtyInput.value = "";
    if (prefixInput) prefixInput.value = "";
    if (locInput) locInput.value = "Sede Central Dalor (Guacara)";

    openModal("modalAddToolUnits");
}

async function submitAddToolUnits(event) {
    event.preventDefault();
    const toolName = document.getElementById("add_units_tool_name")?.value;
    const qty = parseInt(document.getElementById("add_units_quantity")?.value || "1", 10);
    const prefix = document.getElementById("add_units_prefix")?.value?.trim() || null;
    const loc = document.getElementById("add_units_location")?.value?.trim() || "Sede Central Dalor (Guacara)";

    if (!qty || qty < 1) {
        alert("Por favor indica una cantidad válida (mínimo 1).");
        return;
    }

    try {
        const payload = {
            tool_name: toolName,
            quantity: qty,
            prefix_code: prefix,
            current_location: loc
        };

        const res = await authFetch(`${API_BASE}/assets/tools/add-units`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            const data = await res.json();
            alert(`✅ ${data.message || `Se agregaron ${qty} unidades con éxito.`}`);
            closeModal("modalAddToolUnits");
            await loadInitialMasterData();
            loadToolsList();
        } else {
            const err = await res.json();
            alert("Error al agregar unidades: " + (err.detail || JSON.stringify(err)));
        }
    } catch (e) {
        alert("Error de conexión al agregar unidades: " + e.message);
    }
}

function openRemoveToolUnitsModal(toolNameEncoded, availableUnits, totalUnits) {
    const toolName = decodeURIComponent(toolNameEncoded);
    const hiddenName = document.getElementById("remove_units_tool_name");
    const hiddenMax = document.getElementById("remove_units_max_available");
    const nameDisplay = document.getElementById("remove_units_display_name");
    const statusDisplay = document.getElementById("remove_units_display_status");
    const qtyInput = document.getElementById("remove_units_quantity");
    const reasonInput = document.getElementById("remove_units_reason");

    if (availableUnits <= 0) {
        alert(`⚠️ No hay unidades disponibles en base para restar de '${toolName}'. Las unidades en obra deben retornar antes de darse de baja.`);
        return;
    }

    if (hiddenName) hiddenName.value = toolName;
    if (hiddenMax) hiddenMax.value = availableUnits;
    if (nameDisplay) nameDisplay.innerText = toolName;
    if (statusDisplay) statusDisplay.innerText = `Disponibles en base para restar: ${availableUnits} | Total físico histórico: ${totalUnits}`;
    if (qtyInput) {
        qtyInput.value = "1";
        qtyInput.max = availableUnits;
    }
    if (reasonInput) reasonInput.value = "Ajuste de inventario físico / Desgaste";

    openModal("modalRemoveToolUnits");
}

async function submitRemoveToolUnits(event) {
    event.preventDefault();
    const toolName = document.getElementById("remove_units_tool_name")?.value;
    const maxAvail = parseInt(document.getElementById("remove_units_max_available")?.value || "0", 10);
    const qty = parseInt(document.getElementById("remove_units_quantity")?.value || "1", 10);
    const reason = document.getElementById("remove_units_reason")?.value?.trim() || "Ajuste de inventario físico";

    if (!qty || qty < 1) {
        alert("Por favor indica una cantidad válida a restar (mínimo 1).");
        return;
    }

    if (qty > maxAvail) {
        alert(`⚠️ No puedes restar más de ${maxAvail} unidad(es), ya que solo esas están disponibles en base.`);
        return;
    }

    if (!confirm(`¿Confirmas que deseas restar / desincorporar ${qty} unidad(es) de '${toolName}'? Esta acción registrará la baja en la traza.`)) {
        return;
    }

    try {
        const payload = {
            tool_name: toolName,
            quantity: qty,
            reason: reason
        };

        const res = await authFetch(`${API_BASE}/assets/tools/remove-units`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            const data = await res.json();
            alert(`✅ ${data.message || `Se restaron ${qty} unidades exitosamente.`}`);
            closeModal("modalRemoveToolUnits");
            await loadInitialMasterData();
            loadToolsList();
        } else {
            const err = await res.json();
            alert("❌ " + (err.detail || JSON.stringify(err)));
        }
    } catch (e) {
        alert("Error de conexión al restar unidades: " + e.message);
    }
}

async function confirmRemoveSingleToolUnit(assetId, assetCode, toolName) {
    const reason = prompt(`Indica el motivo para dar de baja la unidad [${assetCode}] de '${toolName}':`, "Ajuste de inventario / Desgaste / Daño");
    if (reason === null) return;

    if (!confirm(`¿Confirmas dar de baja la unidad física [${assetCode}] de '${toolName}'?`)) {
        return;
    }

    try {
        const payload = {
            tool_name: toolName,
            quantity: 1,
            reason: reason || "Baja unitaria manual",
            specific_asset_id: assetId
        };

        const res = await authFetch(`${API_BASE}/assets/tools/remove-units`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            const data = await res.json();
            alert(`✅ ${data.message || `Unidad dada de baja con éxito.`}`);
            await loadInitialMasterData();
            loadToolsList();
        } else {
            const err = await res.json();
            alert("❌ " + (err.detail || JSON.stringify(err)));
        }
    } catch (e) {
        alert("Error de conexión al dar de baja unidad: " + e.message);
    }
}

function openAssignSingleToolUnitModal(assetId, assetCode, assetName) {
    const displayName = `${assetName} [${assetCode}]`;
    const openFn = (typeof openAssignModal === 'function') ? openAssignModal : window.openAssignModal;
    if (openFn) {
        openFn('asset', assetId, displayName, 'assign');
        const qtyContainer = document.getElementById("modal_quantity_container");
        const qtyInput = document.getElementById("modal_res_quantity");
        if (qtyContainer) qtyContainer.style.display = 'none';
        if (qtyInput) qtyInput.value = "1";
    } else {
        alert("El modal de asignación no está disponible.");
    }
}

function openTransferSingleToolUnitModal(assetId, assetCode, assetName) {
    const displayName = `${assetName} [${assetCode}]`;
    const openFn = (typeof openAssignModal === 'function') ? openAssignModal : window.openAssignModal;
    if (openFn) {
        openFn('asset', assetId, displayName, 'transfer');
    } else {
        alert("El modal de transferencia no está disponible.");
    }
}

async function confirmReturnSingleToolToBase(assetId, assetCode, assetName) {
    if (!confirm(`¿Confirmas el retorno a la Base Central (Guacara) de la unidad:\n[${assetCode}] ${assetName}?`)) {
        return;
    }
    const retFn = (typeof returnResourceToBase === 'function') ? returnResourceToBase : window.returnResourceToBase;
    if (retFn) {
        await retFn('asset', assetId);
        loadToolsList();
    } else {
        try {
            const res = await authFetch(`${API_BASE}/resources/return-to-base`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    resource_type: "asset",
                    resource_id: assetId,
                    return_location: "Sede Central Dalor (Guacara)"
                })
            });
            if (res.ok) {
                const data = await res.json();
                alert("✅ " + (data.message || "Unidad retornada a Base con éxito."));
                loadToolsList();
            } else {
                const err = await res.json().catch(() => ({}));
                alert("❌ Error al retornar unidad: " + (err.detail || err.message || "Error desconocido"));
            }
        } catch(e) {
            alert("❌ Error de comunicación: " + e.message);
        }
    }
}

async function downloadAssetsExcelTemplate() {
    try {
        const token = sessionStorage.getItem('dalor_token') || localStorage.getItem('dalor_token') || window.authToken || '';
        const res = await fetch(`${API_BASE}/assets/excel-template`, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (!res.ok) throw new Error("Error del servidor al generar plantilla");
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `DALOR_Catalogo_Activos_Herramientas_${new Date().toISOString().slice(0, 10)}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
    } catch (e) {
        alert("Error al descargar plantilla de activos: " + e.message);
    }
}

async function submitImportAssetsExcel(event) {
    event.preventDefault();
    const fileInput = document.getElementById("assets_excel_file_input");
    const feedback = document.getElementById("assetsExcelImportFeedback");
    const btn = document.getElementById("btnSubmitImportAssetsExcel");

    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        alert("Por favor selecciona un archivo Excel (.xlsx).");
        return;
    }

    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append("file", file);

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Procesando archivo...`;
    }
    if (feedback) {
        feedback.className = "";
        feedback.style.display = "block";
        feedback.style.background = "#eff6ff";
        feedback.style.color = "#1e40af";
        feedback.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Leyendo registros y aplicando cambios a herramientas y activos...`;
    }

    try {
        const res = await authFetch(`${API_BASE}/assets/import-excel`, {
            method: "POST",
            body: formData
        });

        const data = await res.json();
        if (res.ok) {
            if (feedback) {
                feedback.style.background = "#f0fdf4";
                feedback.style.color = "#166534";
                feedback.innerHTML = `<b>✅ Carga masiva exitosa:</b> ${data.message || ''}`;
            }
            alert(`✅ ${data.message || 'Carga completada con éxito.'}`);
            closeModal("modalImportAssetsExcel");
            fileInput.value = "";
            await loadInitialMasterData();
            loadToolsList();
            if (typeof loadMachineryList === 'function') loadMachineryList();
        } else {
            if (feedback) {
                feedback.style.background = "#fef2f2";
                feedback.style.color = "#991b1b";
                feedback.innerHTML = `<b>❌ Error:</b> ${data.detail || JSON.stringify(data)}`;
            }
            alert("Error al procesar archivo: " + (data.detail || JSON.stringify(data)));
        }
    } catch (e) {
        if (feedback) {
            feedback.style.background = "#fef2f2";
            feedback.style.color = "#991b1b";
            feedback.innerHTML = `<b>❌ Error de conexión:</b> ${e.message}`;
        }
        alert("Error de conexión al subir Excel: " + e.message);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `<i class="fa-solid fa-cloud-arrow-up"></i> Procesar Carga Masiva`;
        }
    }
}

// --- VINCULACIÓN CON WINDOW Y SCOPE GLOBAL ---
if (typeof window !== 'undefined') {
    window.populateToolCategoryDropdown = populateToolCategoryDropdown;
    window.loadToolsList = loadToolsList;
    window.goToToolsPage = goToToolsPage;
    window.changeToolsPageSize = changeToolsPageSize;
    window.renderGroupedTools = renderGroupedTools;
    window.renderGroupedToolsPaginated = renderGroupedToolsPaginated;
    window.toggleToolUnitsBreakdown = toggleToolUnitsBreakdown;
    window.filterToolsList = filterToolsList;
    window.debouncedFilterToolsList = filterToolsList;
    window.assignAvailableToolFromGroup = assignAvailableToolFromGroup;
    window.goToToolHistoryPage = goToToolHistoryPage;
    window.changeToolHistoryPageSize = changeToolHistoryPageSize;
    window.renderToolHistoryTablePaginated = renderToolHistoryTablePaginated;
    window.openToolHistoryModal = openToolHistoryModal;
    window.openNewToolModal = openNewToolModal;
    window.submitCreateTool = submitCreateTool;
    window.openAddToolUnitsModal = openAddToolUnitsModal;
    window.submitAddToolUnits = submitAddToolUnits;
    window.openRemoveToolUnitsModal = openRemoveToolUnitsModal;
    window.submitRemoveToolUnits = submitRemoveToolUnits;
    window.confirmRemoveSingleToolUnit = confirmRemoveSingleToolUnit;
    window.openAssignSingleToolUnitModal = openAssignSingleToolUnitModal;
    window.openTransferSingleToolUnitModal = openTransferSingleToolUnitModal;
    window.confirmReturnSingleToolToBase = confirmReturnSingleToolToBase;
    window.downloadAssetsExcelTemplate = downloadAssetsExcelTemplate;
    window.submitImportAssetsExcel = submitImportAssetsExcel;
}

