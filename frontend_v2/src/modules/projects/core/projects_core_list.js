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

var projectCurrentPage = 1;
var projectPageSize = 6;
var lastFilteredProjects = [];
let currentProjectCxcFilter = 'all';
var allProjects = window.allProjects = window.allProjects || [];

export async function loadProjectsList() {
    const container = document.getElementById("projectsCardsContainer");
    if (!container) return;

    // SWR: Si ya existen proyectos en memoria, renderizarlos de inmediato (0 ms) sin spinner bloqueante
    const hasCached = (Array.isArray(allProjects) && allProjects.length > 0) || (Array.isArray(window.allProjects) && window.allProjects.length > 0);
    if (hasCached) {
        if (!allProjects || allProjects.length === 0) allProjects = window.allProjects || [];
        renderProjectsWithPagination(false);
    } else {
        container.innerHTML = `<div style="grid-column: span 2; text-align: center; padding: 20px; color: #94a3b8;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando proyectos...</div>`;
    }

    try {
        const res = await authFetch(`${API_BASE}/projects/`);
        if (!res.ok) throw new Error("Error HTTP " + res.status);
        const data = await res.json();
        allProjects = Array.isArray(data) ? data : [];

        // 1. Ordenar descendente para que las obras recién creadas aparezcan siempre arriba
        allProjects.sort((a, b) => b.id - a.id);
        window.allProjects = allProjects;

        // 2. Poblar selector de clientes si está en pantalla
        const clientFilterSelect = document.getElementById("project_client_filter");
        if (clientFilterSelect) {
            const currentSelected = clientFilterSelect.value;
            const uniqueClients = Array.from(new Set(allProjects.map(p => p.client_name).filter(Boolean))).sort();
            clientFilterSelect.innerHTML = `<option value="">🏢 Todos los Clientes</option>` +
                uniqueClients.map(c => `<option value="${c}">${c}</option>`).join('');
            if (currentSelected) clientFilterSelect.value = currentSelected;
        }

        renderProjectsWithPagination(false);
    } catch (e) {
        console.error("Error al cargar proyectos:", e);
        if (!hasCached && container) {
            container.innerHTML = `<div style="grid-column: span 2; text-align: center; color: #e11d48; padding: 20px;">Error al cargar proyectos.</div>`;
        }
    }
}

export function changeProjectPageSize(size) {
    projectPageSize = parseInt(size) || 6;
    projectCurrentPage = 1;
    renderProjectsWithPagination(false);
}

export function goToProjectPage(page) {
    projectCurrentPage = page;
    renderProjectsWithPagination(false);
    const container = document.getElementById("projectsCardsContainer");
    if (container) container.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function setProjectCxcFilter(fType) {
    currentProjectCxcFilter = fType;
    ['all', 'open', 'paid', 'none'].forEach(f => {
        const btn = document.getElementById(`btn_proj_cxc_${f}`);
        if (btn) btn.className = (f === fType) ? 'btn-primary' : 'btn-secondary';
    });
    projectCurrentPage = 1;
    filterProjectsList();
}

export function filterProjectsList() {
    renderProjectsWithPagination(true);
}

export function renderProjectsWithPagination(resetPage = false) {
    const container = document.getElementById("projectsCardsContainer");
    const pagContainer = document.getElementById("projectsPaginationContainer");
    if (!container) return;

    if (resetPage) projectCurrentPage = 1;

    const subtab = (typeof currentProjectSubtab !== 'undefined' ? currentProjectSubtab : (window.currentProjectSubtab || sessionStorage.getItem('dalor_active_subtab_projects') || 'list'));
    const isCompletedView = (subtab === 'completed');
    const q = (document.getElementById("project_search_input")?.value || '').toLowerCase().trim();
    const selClient = (document.getElementById("project_client_filter")?.value || '').toLowerCase().trim();

    let list = (allProjects || []).filter(p => isCompletedView ? (p.status === 'culminado') : (p.status !== 'culminado'));

    if (q) {
        list = list.filter(p =>
            (p.code || '').toLowerCase().includes(q) ||
            (p.name || '').toLowerCase().includes(q) ||
            (p.client_name || '').toLowerCase().includes(q) ||
            (p.location || '').toLowerCase().includes(q)
        );
    }

    if (selClient) {
        list = list.filter(p => (p.client_name || '').toLowerCase().includes(selClient));
    }

    if (currentProjectCxcFilter === 'open') {
        list = list.filter(p => p.cxc_status === 'abierta' || p.cxc_status === 'parcial' || (p.cxc_pending_usd && p.cxc_pending_usd > 0.05));
    } else if (currentProjectCxcFilter === 'paid') {
        list = list.filter(p => p.cxc_status === 'cerrada' || (p.has_cxc && (!p.cxc_pending_usd || p.cxc_pending_usd <= 0.05) && p.cxc_paid_usd > 0));
    } else if (currentProjectCxcFilter === 'none') {
        list = list.filter(p => p.cxc_status === 'sin_cxc' || (!p.has_cxc && !p.total_billed_cxc_usd));
    }

    lastFilteredProjects = list;
    const totalFiltered = list.length;
    const effectivePageSize = projectPageSize === 1000 ? (totalFiltered || 1) : projectPageSize;
    const totalPages = Math.ceil(totalFiltered / effectivePageSize) || 1;

    if (projectCurrentPage > totalPages) projectCurrentPage = totalPages;
    if (projectCurrentPage < 1) projectCurrentPage = 1;

    // Actualizar badge superior
    const badge = document.getElementById("projects_count_badge");
    if (badge) {
        const totalBase = (allProjects || []).filter(p => isCompletedView ? p.status === 'culminado' : p.status !== 'culminado').length;
        if (totalFiltered === totalBase) {
            badge.innerText = `${totalFiltered} ${isCompletedView ? 'obra(s) culminada(s)' : 'obra(s) activa(s)'} • Pág. ${projectCurrentPage} de ${totalPages}`;
        } else {
            badge.innerText = `${totalFiltered} de ${totalBase} ${isCompletedView ? 'culminada(s)' : 'activa(s)'} • Pág. ${projectCurrentPage} de ${totalPages}`;
        }
    }

    if (totalFiltered === 0) {
        container.innerHTML = isCompletedView
            ? `<div style="grid-column: span 2; text-align: center; padding: 30px; color: #94a3b8;"><i class="fa-solid fa-flag-checkered" style="font-size: 28px; margin-bottom: 8px; color: #10b981;"></i><br><b>No hay obras culminadas en el archivo histórico todavía.</b><br><small>Las obras culminadas al 100% se archivarán aquí automáticamente con su margen y rentabilidad consolidados.</small></div>`
            : `<div style="grid-column: span 2; text-align: center; padding: 20px; color: #94a3b8;">No se encontraron obras con el filtro seleccionado.</div>`;
        if (pagContainer) pagContainer.innerHTML = '';
        return;
    }

    const startIndex = (projectCurrentPage - 1) * effectivePageSize;
    const endIndex = Math.min(startIndex + effectivePageSize, totalFiltered);
    const paginatedItems = list.slice(startIndex, endIndex);

    const savedUserStr = sessionStorage.getItem('dalor_user') || localStorage.getItem('dalor_user');
    const userObj = savedUserStr ? JSON.parse(savedUserStr) : (currentUser || {});
    const urole = (userObj.role_name || userObj.role || userObj.username || '').toLowerCase();
    const isDirector = urole.includes('director') || userObj.is_superuser || false;
    const isFinanzas = urole.includes('finanz') || urole.includes('admin') || false;
    const canSeeFinances = isDirector || isFinanzas || urole.includes('ingeniero') || true;

    container.innerHTML = paginatedItems.map(p => renderProjectCardHtml(p, canSeeFinances, isDirector)).join('');

    renderProjectsPaginationControls(totalFiltered, effectivePageSize, totalPages, startIndex, endIndex);
}

export function renderProjectsPaginationControls(totalItems, pageSize, totalPages, startIndex, endIndex) {
    const pagContainer = document.getElementById("projectsPaginationContainer");
    if (!pagContainer) return;

    if (totalPages <= 1 && totalItems <= 6) {
        pagContainer.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 11.5px; color: #64748b;">
                <span>Mostrando <b>${totalItems}</b> obra(s)</span>
                <div style="display: flex; align-items: center; gap: 6px;">
                    <span>Mostrar:</span>
                    <select onchange="changeProjectPageSize(this.value)" style="padding: 2px 6px; font-size: 11px; border: 1px solid #cbd5e1; border-radius: 4px; background: white; font-weight: 700;">
                        <option value="6" ${pageSize === 6 ? 'selected' : ''}>6 por página</option>
                        <option value="12" ${pageSize === 12 ? 'selected' : ''}>12 por página</option>
                        <option value="24" ${pageSize === 24 ? 'selected' : ''}>24 por página</option>
                        <option value="1000" ${pageSize === 1000 ? 'selected' : ''}>Ver todos</option>
                    </select>
                </div>
            </div>
        `;
        return;
    }

    let pageButtons = '';
    const cur = projectCurrentPage;
    let startP = Math.max(1, cur - 2);
    let endP = Math.min(totalPages, cur + 2);

    if (startP > 1) {
        pageButtons += `<button type="button" onclick="goToProjectPage(1)" class="btn-secondary" style="padding: 4px 9px; font-size: 11px; border-radius: 5px;">1</button>`;
        if (startP > 2) pageButtons += `<span style="padding: 0 4px; color: #94a3b8;">...</span>`;
    }

    for (let i = startP; i <= endP; i++) {
        if (i === cur) {
            pageButtons += `<button type="button" class="btn-primary" style="padding: 4px 10px; font-size: 11px; font-weight: 800; border-radius: 5px; background: var(--dalor-navy);">${i}</button>`;
        } else {
            pageButtons += `<button type="button" onclick="goToProjectPage(${i})" class="btn-secondary" style="padding: 4px 9px; font-size: 11px; border-radius: 5px;">${i}</button>`;
        }
    }

    if (endP < totalPages) {
        if (endP < totalPages - 1) pageButtons += `<span style="padding: 0 4px; color: #94a3b8;">...</span>`;
        pageButtons += `<button type="button" onclick="goToProjectPage(${totalPages})" class="btn-secondary" style="padding: 4px 9px; font-size: 11px; border-radius: 5px;">${totalPages}</button>`;
    }

    pagContainer.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 12px; color: #475569; flex-wrap: wrap; gap: 10px; box-shadow: 0 1px 2px rgba(0,0,0,0.04);">
            <div style="font-weight: 600;">
                Mostrando <b style="color: var(--dalor-navy);">${startIndex + 1} - ${endIndex}</b> de <b style="color: var(--dalor-navy);">${totalItems}</b> obra(s)
            </div>

            <div style="display: flex; align-items: center; gap: 6px;">
                <button type="button" onclick="goToProjectPage(1)" class="btn-secondary" style="padding: 4px 8px; font-size: 11px; border-radius: 5px;" ${cur === 1 ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : ''} title="Primera página">
                    <i class="fa-solid fa-angles-left"></i>
                </button>
                <button type="button" onclick="goToProjectPage(${cur - 1})" class="btn-secondary" style="padding: 4px 9px; font-size: 11px; border-radius: 5px;" ${cur === 1 ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : ''} title="Página anterior">
                    <i class="fa-solid fa-chevron-left"></i> Anterior
                </button>

                <div style="display: flex; align-items: center; gap: 4px;">
                    ${pageButtons}
                </div>

                <button type="button" onclick="goToProjectPage(${cur + 1})" class="btn-secondary" style="padding: 4px 9px; font-size: 11px; border-radius: 5px;" ${cur === totalPages ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : ''} title="Página siguiente">
                    Siguiente <i class="fa-solid fa-chevron-right"></i>
                </button>
                <button type="button" onclick="goToProjectPage(${totalPages})" class="btn-secondary" style="padding: 4px 8px; font-size: 11px; border-radius: 5px;" ${cur === totalPages ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : ''} title="Última página">
                    <i class="fa-solid fa-angles-right"></i>
                </button>
            </div>

            <div style="display: flex; align-items: center; gap: 6px;">
                <span style="font-size: 11.5px; color: #64748b;">Por página:</span>
                <select onchange="changeProjectPageSize(this.value)" style="padding: 3px 8px; font-size: 11.5px; border: 1px solid #cbd5e1; border-radius: 5px; background: white; font-weight: 700; color: var(--dalor-navy); cursor: pointer;">
                    <option value="6" ${pageSize === 6 ? 'selected' : ''}>6 obras</option>
                    <option value="12" ${pageSize === 12 ? 'selected' : ''}>12 obras</option>
                    <option value="24" ${pageSize === 24 ? 'selected' : ''}>24 obras</option>
                    <option value="1000" ${pageSize === 1000 ? 'selected' : ''}>Ver todas</option>
                </select>
            </div>
        </div>
    `;
}

export function renderProjectCardHtml(p, canSeeFinances, isDirector) {
    const spent = p.total_spent_usd || 0;
    const budget = p.budget_limit_usd || 0;
    const contract = p.contract_amount_usd || 0;
    const balance = budget - spent;
    const isOverBudget = spent > budget && budget > 0;
    const realBurnPct = budget > 0 ? (spent / budget * 100).toFixed(1) : 0;
    const marginReal = contract - spent;
    const marginRealPct = contract > 0 ? ((marginReal / contract) * 100).toFixed(1) : 0;

    const phasesCount = p.phases ? p.phases.length : 0;
    const completedPhases = p.phases ? p.phases.filter(ph => ph.status === 'completado').length : 0;

    // Calcular porcentaje de avance físico
    let progressPct = (p.progress_pct !== undefined && p.progress_pct > 0) ? p.progress_pct : 0;
    if (phasesCount > 0 && progressPct === 0) {
        let totalT = 0;
        let doneT = 0;
        (p.phases || []).forEach(ph => {
            const raw = (ph.description || '').split(';').map(t => t.trim()).filter(Boolean);
            if (raw.length > 0) {
                totalT += raw.length;
                if (ph.status === 'completado') {
                    doneT += raw.length;
                } else {
                    doneT += raw.filter(t => t.startsWith('[x]') || t.startsWith('[X]')).length;
                }
            } else {
                totalT += 1;
                if (ph.status === 'completado') doneT += 1;
            }
        });
        if (totalT > 0) progressPct = Math.round((doneT / totalT) * 100);
    }
    if (phasesCount > 0 && completedPhases === phasesCount) {
        progressPct = 100;
    }

    let burnColor = '#059669'; // verde
    if (realBurnPct >= 80 && realBurnPct <= 100) burnColor = '#f59e0b'; // ámbar
    if (realBurnPct > 100) burnColor = '#e11d48'; // rojo sobrecosto

    const isCulminated = p.status === 'culminado';
    let statusBg = isCulminated ? '#d1fae5' : (p.status === 'completado' ? '#dcfce7' : '#e0f2fe');
    let statusColor = isCulminated ? '#065f46' : (p.status === 'completado' ? '#166534' : '#0369a1');
    let statusLabel = isCulminated ? '🏁 Culminado' : (p.status === 'completado' ? '✅ Completado' : (p.status || 'Activo'));

    const cxcStatus = p.cxc_status || (p.has_cxc ? 'abierta' : 'sin_cxc');
    const cxcPaid = p.cxc_paid_usd || 0;
    const cxcPending = (typeof p.cxc_pending_usd === 'number') ? p.cxc_pending_usd : Math.max(0, (p.total_billed_cxc_usd || 0) - cxcPaid);
    let cxcBadgeHtml = '';
    if (cxcStatus === 'cerrada' || (p.has_cxc && cxcPending <= 0.05)) {
        cxcBadgeHtml = `<span onclick="event.stopPropagation(); goToProjectCxC('${p.code || p.id}')" style="font-size: 10px; font-weight: 800; background: #dcfce7; color: #166534; border: 1px solid #86efac; padding: 2px 7px; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px; cursor: pointer;" title="Obra totalmente solventada en CxC ($${Number(cxcPaid || 0).toLocaleString()} USD) - Clic para ver en Finanzas"><i class="fa-solid fa-circle-check"></i> CxC Solvente</span>`;
    } else if (cxcStatus === 'parcial' || (cxcPaid > 0 && cxcPending > 0.05)) {
        cxcBadgeHtml = `<span onclick="event.stopPropagation(); goToProjectCxC('${p.code || p.id}')" style="font-size: 10px; font-weight: 800; background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; padding: 2px 7px; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px; cursor: pointer;" title="Abono parcial registrado. Pendiente: $${Number(cxcPending || 0).toLocaleString()} USD - Clic para ver en Finanzas"><i class="fa-solid fa-chart-pie"></i> CxC Parcial ($${Number(cxcPending || 0).toLocaleString()} pend.)</span>`;
    } else if (cxcStatus === 'abierta' || p.has_cxc || (p.total_billed_cxc_usd && p.total_billed_cxc_usd > 0)) {
        cxcBadgeHtml = `<span onclick="event.stopPropagation(); goToProjectCxC('${p.code || p.id}')" style="font-size: 10px; font-weight: 800; background: #fef3c7; color: #92400e; border: 1px solid #fde68a; padding: 2px 7px; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px; cursor: pointer;" title="Factura emitida en CxC pendiente de cobro ($${Number(cxcPending || 0).toLocaleString()} USD) - Clic para ver en Finanzas"><i class="fa-solid fa-hourglass-half"></i> CxC Abierta ($${Number(cxcPending || 0).toLocaleString()} pend.)</span>`;
    } else {
        cxcBadgeHtml = `<span onclick="event.stopPropagation(); goToProjectCxC('${p.code || p.id}')" style="font-size: 10px; font-weight: 800; background: #f1f5f9; color: #64748b; border: 1px solid #cbd5e1; padding: 2px 7px; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px; cursor: pointer;" title="Obra sin valuación emitida en CxC - Clic para gestionar en Finanzas"><i class="fa-solid fa-file-circle-question"></i> Sin Facturar</span>`;
    }

    return `
    <div class="card project-card" data-status="${p.status || 'activo'}" data-client="${p.client_name || ''}" style="border-left: 4px solid ${isCulminated ? '#10b981' : 'var(--dalor-blue)'}; margin-bottom: 0; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.06);">
        <div>
            <!-- Encabezado de la Obra -->
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                <div style="max-width: 75%;">
                    <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
                        <span style="font-size: 11px; font-weight: 800; background: var(--dalor-navy); color: white; padding: 2px 8px; border-radius: 4px;">${p.code}</span>
                        ${cxcBadgeHtml}
                    </div>
                    <h4 style="font-size: 14px; font-weight: 800; color: var(--dalor-navy); margin-top: 4px; line-height: 1.35; word-break: break-word;" title="${p.name}">${p.name}</h4>
                    <p style="font-size: 11px; color: #64748b; margin-top: 2px;">
                        <i class="fa-solid fa-building-user"></i> Cliente: <b>${p.client_name || 'General'}</b> &bull; <i class="fa-solid fa-location-dot"></i> <b>${p.location}</b> &bull; <i class="fa-regular fa-calendar-days" style="color: var(--dalor-gold);"></i> Inicio: <b>${(d => !d ? '-' : (d.includes('-') ? (pts => `${pts[2]}/${pts[1]}/${pts[0]}`)(d.substring(0, 10).split('-')) : new Date(d).toLocaleDateString('es-VE')))(p.start_date || p.created_at)}</b>
                    </p>
                </div>
                <span style="font-size: 10px; background: ${statusBg}; color: ${statusColor}; padding: 3px 10px; border-radius: 9999px; font-weight: 800; text-transform: uppercase; white-space: nowrap;">
                    ${statusLabel}
                </span>
            </div>

            ${isCulminated ? `
            <div style="background: #ecfdf5; border: 1.5px solid #10b981; border-radius: 8px; padding: 8px 12px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px;">
                <div>
                    <span style="font-size: 10px; font-weight: 800; color: #065f46; text-transform: uppercase;">Rentabilidad Final Consolidada:</span>
                    <div style="font-size: 13px; font-weight: 900; color: ${marginReal >= 0 ? '#059669' : '#e11d48'};">
                        ${marginReal >= 0 ? '+' : ''}$${marginReal.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})} USD (${marginRealPct}%)
                    </div>
                </div>
                <div style="text-align: right;">
                    <span style="font-size: 10px; color: #047857;">Monto Contrato: <b>$${contract.toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 0})}</b></span><br>
                    <span style="font-size: 10px; color: #64748b;">Costo Real: <b>$${spent.toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 0})}</b></span>
                </div>
            </div>
            ` : ''}

            <!-- 1. BARRA DE AVANCE FÍSICO GENERAL DE LA OBRA -->
            <div style="margin-bottom: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 12px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                    <span style="font-size: 10.5px; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.5px;">
                        <i class="fa-solid fa-bars-progress" style="color: var(--dalor-blue);"></i> Avance Físico Global
                    </span>
                    <span style="font-size: 11px; font-weight: 900; color: ${progressPct >= 100 ? '#059669' : 'var(--dalor-blue)'};">
                        ${progressPct}%
                    </span>
                </div>
                <div style="height: 7px; background: #e2e8f0; border-radius: 9999px; overflow: hidden;">
                    <div style="width: ${progressPct}%; height: 100%; background: ${progressPct >= 100 ? '#10b981' : 'linear-gradient(90deg, #0284c7, #2563eb)'}; transition: width 0.4s ease;"></div>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 9.5px; color: #64748b; margin-top: 4px;">
                    <span>${completedPhases} de ${phasesCount} Etapas culminadas</span>
                    <span>${p.duration_days} días de ejecución</span>
                </div>
            </div>

            <!-- 2. CONTROL FINANCIERO Y JOB COSTING -->
            ${canSeeFinances ? `
            <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; margin-bottom: 10px; box-shadow: 0 1px 2px rgba(0,0,0,0.03);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <span style="font-size: 10.5px; font-weight: 800; color: #475569; text-transform: uppercase;">
                        <i class="fa-solid fa-chart-pie" style="color: #f59e0b;"></i> Job Costing en Tiempo Real
                    </span>
                    <span style="font-size: 9.5px; font-weight: 800; color: ${isOverBudget ? '#e11d48' : '#059669'}; background: ${isOverBudget ? '#ffe4e6' : '#dcfce7'}; padding: 2px 6px; border-radius: 4px;">
                        ${isOverBudget ? '⚠️ Sobrecosto' : '✅ En Presupuesto'}
                    </span>
                </div>
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; text-align: center;">
                    <div style="background: #f8fafc; padding: 6px 2px; border-radius: 6px; border: 1px solid #f1f5f9;">
                        <span style="font-size: 8.5px; color: #64748b; text-transform: uppercase; display: block;">Contrato</span>
                        <strong style="font-size: 11.5px; color: var(--dalor-navy);">$${contract.toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 0})}</strong>
                    </div>
                    <div style="background: #f8fafc; padding: 6px 2px; border-radius: 6px; border: 1px solid #f1f5f9;">
                        <span style="font-size: 8.5px; color: #64748b; text-transform: uppercase; display: block;">Ppto Techo</span>
                        <strong style="font-size: 11.5px; color: #0284c7;">$${budget.toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 0})}</strong>
                    </div>
                    <div style="background: #f8fafc; padding: 6px 2px; border-radius: 6px; border: 1px solid #f1f5f9;">
                        <span style="font-size: 8.5px; color: #64748b; text-transform: uppercase; display: block;">Gasto Real</span>
                        <strong style="font-size: 11.5px; color: ${isOverBudget ? '#e11d48' : '#d97706'};">$${spent.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong>
                    </div>
                    <div style="background: #f8fafc; padding: 6px 2px; border-radius: 6px; border: 1px solid #f1f5f9;">
                        <span style="font-size: 8.5px; color: #64748b; text-transform: uppercase; display: block;">Saldo</span>
                        <strong style="font-size: 11.5px; color: ${balance >= 0 ? '#059669' : '#e11d48'};">
                            ${balance >= 0 ? '+' : ''}$${balance.toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 0})}
                        </strong>
                    </div>
                </div>
                <div style="font-size: 10px; color: #64748b; margin-top: 4px;">
                    <div style="display: flex; justify-content: space-between; font-weight: 700; margin-bottom: 2px;">
                        <span>Consumo: <b>${realBurnPct}%</b> ($${spent.toLocaleString()} / $${budget.toLocaleString()})</span>
                        <span style="color: #059669;">Margen: <b>${marginRealPct}%</b></span>
                    </div>
                    <div style="height: 6px; background: #e2e8f0; border-radius: 9999px; overflow: hidden;">
                        <div style="width: ${Math.min(100, Math.max(0, realBurnPct))}%; height: 100%; background: ${burnColor};"></div>
                    </div>
                </div>
            </div>
            ` : `
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; display: grid; grid-template-columns: 1fr 1fr 1fr; text-align: center; margin-bottom: 10px;">
                <div>
                    <span style="font-size: 10px; color: #64748b; text-transform: uppercase;">Duración Total</span>
                    <p style="font-size: 13px; font-weight: 800; color: var(--dalor-navy);">${p.duration_days} días</p>
                </div>
                <div>
                    <span style="font-size: 10px; color: #64748b; text-transform: uppercase;">Hitos WBS</span>
                    <p style="font-size: 13px; font-weight: 800; color: #0284c7;">${phasesCount} Etapas</p>
                </div>
                <div>
                    <span style="font-size: 10px; color: #64748b; text-transform: uppercase;">Régimen de Turno</span>
                    <p style="font-size: 13px; font-weight: 800; color: #059669;">Operativo</p>
                </div>
            </div>
            `}
        </div>

        <div>
            <!-- Metadatos de la Obra y Opción Eliminar -->
            <div style="font-size: 11px; color: #64748b; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #f1f5f9; padding-top: 8px; margin-bottom: 8px;">
                <span><i class="fa-solid fa-list-ol"></i> <b>${phasesCount} Etapas</b> &bull; <b>${p.duration_days} días</b></span>
                ${isDirector ? `
                <button type="button" onclick="deleteProject(${p.id})" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 11px; font-weight: 700; padding: 2px 4px; display: inline-flex; align-items: center; gap: 4px;" title="Inactivar Proyecto">
                    <i class="fa-solid fa-trash"></i> Eliminar
                </button>
                ` : ''}
            </div>

            <!-- Barra de Botones Adaptativa y Proporcional (Sin Desbordamiento) -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(75px, 1fr)); gap: 6px;">
                ${(() => {
                    const billedVal = Number(p.total_billed_cxc_usd || 0);
                    const contractVal = Number(p.contract_amount_usd || 0);
                    const isFullyBilled = p.is_fully_billed || (contractVal > 0 && billedVal >= contractVal - 0.05);
                    const hasPartialBilled = billedVal > 0 && !isFullyBilled;
                    const pctBilled = contractVal > 0 ? Math.min(100, Math.round((billedVal / contractVal) * 100)) : 0;
                    
                    if (isFullyBilled) {
                        return `<span onclick="event.stopPropagation(); navigateToProjectCxC('${p.code || p.id}')" style="padding: 6px 6px; font-size: 10.5px; background: #dcfce7; color: #166534; border: 1px solid #86efac; border-radius: 6px; font-weight: 800; display: flex; align-items: center; justify-content: center; gap: 4px; white-space: nowrap; cursor: pointer;" title="Contrato 100% Facturado en CxC ($${billedVal.toLocaleString()} USD) - Clic para ver en Finanzas">
                            <i class="fa-solid fa-circle-check" style="color: #16a34a;"></i> Facturado 100%
                        </span>`;
                    } else if (hasPartialBilled) {
                        return `<span onclick="event.stopPropagation(); navigateToProjectCxC('${p.code || p.id}')" style="padding: 6px 6px; font-size: 10.5px; background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; border-radius: 6px; font-weight: 800; display: flex; align-items: center; justify-content: center; gap: 4px; white-space: nowrap; cursor: pointer;" title="Facturado Parcial: $${billedVal.toLocaleString()} de $${contractVal.toLocaleString()} USD (${pctBilled}%) - Clic para ver en Finanzas">
                            <i class="fa-solid fa-chart-pie" style="color: #0284c7;"></i> Facturado ${pctBilled}%
                        </span>`;
                    } else {
                        return `<span onclick="event.stopPropagation(); navigateToProjectCxC('${p.code || p.id}')" style="padding: 6px 6px; font-size: 10.5px; background: #f8fafc; color: #64748b; border: 1px solid #cbd5e1; border-radius: 6px; font-weight: 800; display: flex; align-items: center; justify-content: center; gap: 4px; white-space: nowrap; cursor: pointer;" title="Obra sin valuaciones emitidas en CxC - Clic para ver en Finanzas">
                            <i class="fa-regular fa-file"></i> Sin Facturar (0%)
                        </span>`;
                    }
                })()}

                <button type="button" onclick="openAddendumModal(${p.id})" class="btn-secondary" style="padding: 6px 4px; font-size: 10.5px; background: #faf5ff; color: #9333ea; border: 1.5px solid #d8b4fe; font-weight: 800; text-align: center; border-radius: 6px; display: flex; align-items: center; justify-content: center; gap: 4px; white-space: nowrap;" title="Registrar Adenda Contractual / Obra Extra (+USD)">
                    <i class="fa-solid fa-file-circle-plus"></i> + Adenda
                </button>

                <button type="button" onclick="openRequestProjectResourcesModal(${p.id})" class="btn-primary" style="padding: 6px 4px; font-size: 10.5px; background: #0284c7; text-align: center; border-radius: 6px; display: flex; align-items: center; justify-content: center; gap: 4px; white-space: nowrap;" title="Solicitar Recursos y Materiales a Almacén para esta obra">
                    <i class="fa-solid fa-truck-ramp-box"></i> Insumos
                </button>

                <button type="button" onclick="navigateToProjectGuides(${p.id}, '${p.code}')" class="btn-secondary" style="padding: 6px 4px; font-size: 10.5px; background: #f8fafc; color: #0284c7; border: 1px solid #cbd5e1; text-align: center; border-radius: 6px; display: flex; align-items: center; justify-content: center; gap: 4px; white-space: nowrap;" title="Consultar Guías de Despacho emitidas para esta obra">
                    <i class="fa-solid fa-truck"></i> Guías
                </button>

                <button type="button" onclick="openEditProjectModal(${p.id})" class="btn-secondary" style="padding: 6px 4px; font-size: 10.5px; background: #fffbeb; color: #b45309; border: 1.5px solid #fde68a; font-weight: 800; text-align: center; border-radius: 6px; display: flex; align-items: center; justify-content: center; gap: 4px; white-space: nowrap;" title="Reabrir / Editar Proyecto">
                    <i class="fa-solid fa-pen-to-square"></i> Editar
                </button>

                <button type="button" onclick="viewProjectDetails(${p.id})" class="btn-primary" style="padding: 6px 4px; font-size: 10.5px; text-align: center; border-radius: 6px; display: flex; align-items: center; justify-content: center; gap: 4px; white-space: nowrap;" title="Ver Ficha y Etapas del Proyecto">
                    <i class="fa-solid fa-eye"></i> Ficha
                </button>
            </div>

            <!-- Desglose de Fases & Tareas Desplegable Directo -->
            <details style="margin-top: 8px; font-size: 11px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 10px;">
                <summary style="cursor: pointer; font-weight: 700; color: var(--dalor-navy); display: flex; justify-content: space-between; align-items: center;">
                    <span><i class="fa-solid fa-list-check" style="color: var(--dalor-blue);"></i> Tareas por Fase de Obra (${phasesCount})</span>
                    <span style="font-size: 10px; color: #0284c7; font-weight: 600;">(Ver Desglose)</span>
                </summary>
                <div style="margin-top: 8px; display: flex; flex-direction: column; gap: 6px;">
                    ${(p.phases || []).map((ph, idx) => `
                        <div style="background: white; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 8px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; font-weight: 700; color: var(--dalor-navy);">
                                <span><b>Etapa ${idx + 1}:</b> ${ph.name}</span>
                                <span style="font-size: 10px; font-weight: 800; color: ${ph.status === 'completado' ? '#059669' : (ph.status === 'en_progreso' ? '#0284c7' : '#64748b')};">
                                    ${ph.status === 'completado' ? '✅ Culminada' : (ph.status === 'en_progreso' ? '🔄 En Progreso' : '⏳ Pendiente')}
                                </span>
                            </div>
                            ${ph.description ? `
                                <div style="margin-top: 4px; padding-left: 8px; border-left: 2px solid #cbd5e1; font-size: 10px; color: #475569; display: flex; flex-direction: column; gap: 2px;">
                                    ${ph.description.split(/[,;\.]\s+/).filter(t => t.trim().length > 2).map((t, tidx) => `
                                        <div>&bull; <b>${idx + 1}.${tidx + 1}</b> ${t}</div>
                                    `).join('')}
                                </div>
                            ` : ''}
                        </div>
                    `).join('') || '<div style="color: #94a3b8; font-style: italic;">Sin etapas estructuradas todavía.</div>'}
                </div>
            </details>
        </div>
    </div>
    `;
}
