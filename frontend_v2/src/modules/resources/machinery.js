/**
 * DALOR SIGO-P | Módulo Especializado de Recursos - Maquinaria Pesada & Plantas
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

let machineryCurrentPage = 1;
let machineryPageSize = 10;
let lastFilteredMachineryList = [];

function goToMachineryPage(page) {
    machineryCurrentPage = page;
    renderMachineryTablePaginated();
    const tableEl = document.getElementById("machineryTableBody");
    if (tableEl) tableEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function changeMachineryPageSize(size) {
    machineryPageSize = parseInt(size) || 10;
    machineryCurrentPage = 1;
    renderMachineryTablePaginated();
}

function filterMachineryList() {
    const q = (document.getElementById("machinerySearchInput")?.value || '').trim();
    const status = document.getElementById("machineryStatusFilter")?.value || 'all';
    const countBadge = document.getElementById("machineryCountBadge");

    const clean = (s) => (s || '').toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    const qNorm = clean(q);

    let filtered = (window.rawMachineryList || []).filter(m => {
        const safeCode = clean(m?.asset_code);
        const safeName = clean(m?.name);
        const safeBrand = clean(m?.brand);
        const safeModel = clean(m?.model);
        const safeSerial = clean(m?.serial_number);
        const matchText = !qNorm || safeCode.includes(qNorm) || safeName.includes(qNorm) || safeBrand.includes(qNorm) || safeModel.includes(qNorm) || safeSerial.includes(qNorm);

        const hasProject = Boolean(m.current_project_id);
        const hasCustodian = Boolean(m.current_custodian_name && !m.current_custodian_name.toLowerCase().includes('disponible') && !m.current_custodian_name.toLowerCase().includes('base') && m.current_custodian_name !== '-');
        const isEnObra = m.status === 'en_obra' || hasProject;
        const isEnOperacion = m.status === 'en_operacion' || (!hasProject && hasCustodian);
        const inBase = !isEnObra && !isEnOperacion && (m.status === 'disponible_base' || m.status === 'disponible' || !m.status);
        const isMaint = m.maintenance_status === 'en_mantenimiento';

        let matchStatus = true;
        if (status === 'disponible_base') matchStatus = inBase && !isMaint;
        if (status === 'en_obra') matchStatus = (isEnObra || isEnOperacion) && !isMaint;
        if (status === 'mantenimiento') matchStatus = isMaint;

        return matchText && matchStatus;
    });

    if (countBadge) countBadge.innerText = `${filtered.length} de ${(window.rawMachineryList || []).length} equipos`;
    lastFilteredMachineryList = filtered;
    machineryCurrentPage = 1;
    renderMachineryTablePaginated();
}

function renderMachineryTablePaginated() {
    const tbody = document.getElementById("machineryTableBody");
    const container = document.getElementById("machineryPaginationContainer");
    if (!tbody) return;

    const list = lastFilteredMachineryList || [];
    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; padding: 20px; color: #94a3b8;">No se encontró maquinaria que coincida con los filtros aplicados.</td></tr>`;
        if (container) container.innerHTML = '';
        return;
    }

    const paginateFn = typeof window.renderPaginationControls === 'function'
        ? window.renderPaginationControls
        : (typeof renderPaginationControls === 'function' ? renderPaginationControls : () => ({ startIndex: 0, endIndex: list.length }));

    const { startIndex, endIndex, currentPage } = paginateFn({
        containerId: "machineryPaginationContainer",
        totalItems: list.length,
        currentPage: machineryCurrentPage,
        pageSize: machineryPageSize,
        onPageChange: "goToMachineryPage",
        onPageSizeChange: "changeMachineryPageSize",
        itemLabel: "equipo(s) de maquinaria",
        pageSizeOptions: [5, 10, 25, 50]
    });
    machineryCurrentPage = currentPage;

    const pageItems = list.slice(startIndex, endIndex);

    tbody.innerHTML = pageItems.map(m => {
        const hasProject = Boolean(m.current_project_id);
        const hasCustodian = Boolean(m.current_custodian_name && !m.current_custodian_name.toLowerCase().includes('disponible') && !m.current_custodian_name.toLowerCase().includes('base') && m.current_custodian_name !== '-');
        const isEnObra = m.status === 'en_obra' || hasProject;
        const isEnTransito = m.status === 'en_transito' || (m.current_location && m.current_location.toLowerCase().includes('en ruta'));
        const isEnOperacion = m.status === 'en_operacion' || (!hasProject && hasCustodian);
        const inBase = !isEnObra && !isEnTransito && !isEnOperacion && (m.status === 'disponible_base' || m.status === 'disponible' || !m.status);

        const isMaint = m.maintenance_status === 'en_mantenimiento';

        let obraLabel = 'DISPONIBLE EN BASE';
        let badgeStyle = 'background: #dcfce7; color: #166534;';
        if (isEnObra) {
            const proj = (window.allProjects || []).find(p => p.id === m.current_project_id);
            const projName = proj ? `[${proj.code}]` : '';
            obraLabel = `EN OBRA ${projName}`.trim();
            badgeStyle = 'background: #e0f2fe; color: #0369a1;';
        } else if (isEnTransito) {
            obraLabel = 'EN TRÁNSITO / DESPACHO';
            badgeStyle = 'background: #fef3c7; color: #92400e; font-weight: 800; border: 1px solid #fde68a;';
        } else if (isEnOperacion) {
            obraLabel = 'EN OPERACIÓN / ASIGNADO';
            badgeStyle = 'background: #fef3c7; color: #92400e;';
        }

        const odo = Number(m.current_odometer || 0);
        const interval = Number(m.service_interval_km || 250);
        const lastSrvOdo = Number(m.last_service_odometer || 0);
        const delta = Math.max(0, odo - lastSrvOdo);
        const isMaintOverdue = delta >= interval && interval > 0;
        const isMaintWarning = delta >= (interval * 0.85) && !isMaintOverdue && interval > 0;

        let maintBadge = '';
        if (isMaint) {
            maintBadge = `<span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 800; background: #fee2e2; color: #991b1b;"><i class="fa-solid fa-wrench"></i> EN TALLER</span>`;
        } else if (isMaintOverdue) {
            maintBadge = `<span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 800; background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5;" title="Uso acumulado (${delta} hrs) excede el ciclo de servicio de ${interval} hrs"><i class="fa-solid fa-triangle-exclamation"></i> MTTO VENCIDO</span>`;
        } else if (isMaintWarning) {
            maintBadge = `<span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 800; background: #fef3c7; color: #92400e; border: 1px solid #fde68a;" title="Próximo a servicio preventivo (${delta}/${interval} hrs)"><i class="fa-solid fa-clock"></i> MTTO PRÓXIMO</span>`;
        } else {
            maintBadge = `<span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 800; background: #dcfce7; color: #166534;"><i class="fa-solid fa-circle-check"></i> OPERATIVO</span>`;
        }

        return `
        <tr style="${isMaintOverdue ? 'background: #fff5f5;' : ''}">
            <td style="font-weight: 800; color: #ea580c; font-family: monospace;">${m.asset_code}</td>
            <td style="font-weight: 700; color: var(--dalor-navy);">${m.name}</td>
            <td>${m.brand || ''} ${m.model ? `(${m.model})` : ''}</td>
            <td style="font-family: monospace; font-size: 11px;">${m.serial_number || '-'}</td>
            <td style="font-weight: 800; color: ${isMaintOverdue ? '#e11d48' : '#0284c7'};">
                <div>${odo.toLocaleString()} Hrs/Km</div>
                <div style="font-size: 9.5px; color: ${isMaintOverdue ? '#e11d48' : '#64748b'}; font-weight: 600;">
                    ${delta}/${interval} Hrs ciclo
                </div>
            </td>
            <td>${maintBadge}</td>
            <td>
                <span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 800; ${badgeStyle}">
                    ${obraLabel}
                </span>
            </td>
            <td style="font-size: 11.5px; font-weight: 600; color: #334155;">${m.current_location || 'Sede Central'}</td>
            <td style="font-size: 11.5px; font-weight: 700; color: ${hasCustodian ? '#0f766e' : '#64748b'};">${m.current_custodian_name || 'Disponible en Base'}</td>
            <td style="text-align: center; white-space: nowrap;">
                ${inBase ? `
                    <button onclick="openAssignModal('asset', ${m.id}, '${(m.name || '').replace(/'/g, "\\'")}', 'assign')" class="btn-primary" style="padding: 3px 8px; font-size: 11px; background: #ea580c;">
                        <i class="fa-solid fa-truck-ramp-box"></i> Asignar a Faena
                    </button>
                ` : `
                    <button onclick="openAssignModal('asset', ${m.id}, '${(m.name || '').replace(/'/g, "\\'")}', 'transfer')" class="btn-secondary" style="padding: 3px 6px; font-size: 11px;" title="Transferir o reasignar destino/custodio">
                        <i class="fa-solid fa-arrows-split-up-and-left"></i>
                    </button>
                    ${m.current_project_id ? `
                    <button onclick="openSubstituteResourceModal('asset', ${m.id}, '${(m.name || '').replace(/'/g, "\\'")}', ${m.current_project_id})" class="btn-secondary" style="padding: 3px 6px; font-size: 11px; margin-left: 4px; color: #2563eb; border-color: #bfdbfe;" title="Sustituir en Obra por otra maquinaria disponible">
                        <i class="fa-solid fa-arrows-rotate"></i>
                    </button>` : ''}
                    <button onclick="returnResourceToBase('asset', ${m.id})" class="btn-primary" style="padding: 3px 6px; font-size: 11px; margin-left: 4px; background: #059669;" title="Liberar y retornar a Sede Central (Disponible)">
                        <i class="fa-solid fa-warehouse"></i> Liberar
                    </button>
                `}

                <button onclick="openVehicleServicesModal(${m.id}, '${(m.asset_code || '').replace(/'/g, "\\'")}', '${(m.name || '').replace(/'/g, "\\'")}')" class="btn-primary" style="padding: 3px 8px; font-size: 11px; margin-right: 4px; background: #ea580c; border-radius: 4px;" title="Servicios, Horómetro y Mantenimiento de Maquinaria">
                    <i class="fa-solid fa-wrench"></i> Servicios
                </button>
                <button onclick="openAssetHistoryModal(${m.id})" class="btn-primary" style="padding: 3px 8px; font-size: 11px; margin-right: 4px; background: #2563eb;" title="Ver Bitácora y Trazabilidad de Uso">
                    <i class="fa-solid fa-clock-rotate-left"></i> Bitácora
                </button>
                <button onclick="openEditAssetModal(${m.id})" class="btn-secondary" style="padding: 3px 8px; font-size: 11px; margin-right: 4px; color: #0284c7; border-color: #bae6fd;" title="Editar Maquinaria">
                    <i class="fa-solid fa-pen"></i> Editar
                </button>
                <button onclick="deleteAssetItem(${m.id})" class="btn-secondary" style="padding: 3px 6px; color: #ef4444; margin-left: 4px;" title="Inactivar Maquinaria">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        </tr>`;
    }).join('');
}

async function loadMachineryList() {
    const tbody = document.getElementById("machineryTableBody");
    if (!tbody) return;

    // SWR: Si ya existe maquinaria en memoria, renderizar de inmediato (0 ms)
    const hasCached = Array.isArray(window.rawMachineryList) && window.rawMachineryList.length > 0;
    if (hasCached) {
        filterMachineryList();
    } else {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; padding: 20px; color: #94a3b8;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando maquinaria pesada y plantas...</td></tr>`;
    }

    try {
        const res = await authFetch(`${API_BASE}/assets/`);
        const assets = await res.json();
        window.allAssets = assets;

        const machinery = assets.filter(a => 
            (['maquinaria', 'planta', 'generador', 'compresor', 'equipo_mayor'].includes(a.asset_type) ||
            (a.asset_code === 'MAQ-001') || (a.asset_code === '3-V-1-05')) && a.asset_type !== 'herramienta'
        );
        window.rawMachineryList = machinery;

        filterMachineryList();

    } catch (e) {
        console.error("Error al cargar maquinaria pesada:", e);
        if (!hasCached && tbody) {
            tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: #e11d48;">Error al cargar maquinaria pesada.</td></tr>`;
        }
    }
}

// --- VINCULACIÓN CON WINDOW Y SCOPE GLOBAL ---
if (typeof window !== 'undefined') {
    window.loadMachineryList = loadMachineryList;
    window.filterMachineryList = filterMachineryList;
    window.goToMachineryPage = goToMachineryPage;
    window.changeMachineryPageSize = changeMachineryPageSize;
    window.renderMachineryTablePaginated = renderMachineryTablePaginated;
}
