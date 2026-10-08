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

    if (Array.isArray(window.rawToolsList) && window.rawToolsList.length > 0 && Array.isArray(groupedToolsList) && groupedToolsList.length > 0) {
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
            groups[key].total++;
            const inBase = t.status === 'disponible_base' || !t.current_project_id;
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
        if (container) container.innerHTML = "";
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
            const isAvail = it.status === 'disponible_base' || !it.current_project_id;
            return `
                <tr style="border-bottom: 1px solid #e2e8f0; background: #ffffff;">
                    <td style="padding: 5px 8px; font-weight: 800; color: var(--dalor-navy); font-family: monospace;">${it.asset_code}</td>
                    <td style="padding: 5px 8px; font-size: 11px;">${it.brand || '-'} ${it.model || ''}</td>
                    <td style="padding: 5px 8px; font-family: monospace; font-size: 11px; color: #64748b;">${it.serial_number || '-'}</td>
                    <td style="padding: 5px 8px; font-size: 11px; color: #334155;">${it.current_location || 'Sede Central'}</td>
                    <td style="padding: 5px 8px; font-size: 11px; color: #2563eb; font-weight: 600;">${it.current_custodian_name || 'En Pañol Base'}</td>
                    <td style="padding: 5px 8px; text-align: center;">
                        <span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 800; ${isAvail ? 'background: #dcfce7; color: #166534;' : 'background: #fee2e2; color: #991b1b;'}">
                            ${isAvail ? 'DISPONIBLE' : 'EN OBRA'}
                        </span>
                    </td>
                    <td style="padding: 5px 8px; text-align: center; white-space: nowrap;">
                        <button onclick="openEditAssetModal(${it.id})" class="btn-secondary" style="padding: 2px 6px; font-size: 10px; color: #0284c7; border-color: #bae6fd; margin-right: 3px;" title="Editar Ficha de esta Herramienta">
                            <i class="fa-solid fa-pen"></i> Editar
                        </button>
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
                    <span style="color: #64748b; font-weight: 600;">Disponibles: <b style="color: #166534;">${g.available}</b> | En Obra: <b style="color: #991b1b;">${g.in_use}</b></span>
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
    const unit = rawToolsList.find(t => t.name.trim().toUpperCase() === name.trim().toUpperCase() && (t.status === 'disponible_base' || !t.current_project_id));
    if (!unit) {
        alert("No hay unidades disponibles de esta herramienta en Base.");
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



function openNewToolModal() {

    document.getElementById("toolForm").reset();

    openModal("modalTool");

}



async function submitCreateTool(event) {

    event.preventDefault();

    const payload = {

        asset_code: document.getElementById("tool_code").value,

        name: document.getElementById("tool_name").value,

        asset_type: document.getElementById("tool_type").value,

        brand: document.getElementById("tool_brand").value,

        serial_number: document.getElementById("tool_serial").value,

        current_location: document.getElementById("tool_location").value || "Sede Central",

        is_exclusive: true

    };



    try {

        const res = await authFetch(`${API_BASE}/assets/`, {

            method: "POST",

            headers: { "Content-Type": "application/json" },

            body: JSON.stringify(payload)

        });

        if (res.ok) {

            alert("Herramienta/Equipo registrado exitosamente.");

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

        alert("Error al registrar herramienta.");

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
}
