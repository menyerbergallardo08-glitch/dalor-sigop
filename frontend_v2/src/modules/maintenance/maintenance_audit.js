/**
 * DALOR SIGO-P | Módulo de Mantenimiento Desacoplado
 */
var API_BASE = window.API_BASE || (window.location.origin + "/api/v1");

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

let allAuditLogsCache = window.allAuditLogsCache = window.allAuditLogsCache || [];

async function loadMaintenanceAuditLogs() {
    const tbody = document.getElementById('maintenanceAuditTableBody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #94a3b8; padding: 16px;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando bitácora de eventos...</td></tr>`;

    try {
        const res = await authFetch(`${API_BASE}/maintenance/audit-logs`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const logs = await res.json();
        allAuditLogsCache = Array.isArray(logs) ? logs : [];

        renderMaintenanceAuditLogs(allAuditLogsCache);
    } catch (e) {
        console.error("loadMaintenanceAuditLogs error:", e);
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #e11d48; padding: 16px;">Error al cargar bitácora.</td></tr>`;
    }
}

let auditCurrentPage = 1;
let auditPageSize = 25;
let currentFilteredAuditLogs = [];

function renderMaintenanceAuditLogs(logs) {
    const tbody = document.getElementById('maintenanceAuditTableBody');
    if (!tbody) return;

    currentFilteredAuditLogs = Array.isArray(logs) ? logs : [];

    if (currentFilteredAuditLogs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #94a3b8; padding: 16px;">No hay eventos registrados que coincidan con la búsqueda.</td></tr>`;
        updateAuditPaginationControls(0, 0, 0, 0);
        return;
    }

    const totalItems = currentFilteredAuditLogs.length;
    const totalPages = Math.ceil(totalItems / auditPageSize) || 1;
    if (auditCurrentPage > totalPages) auditCurrentPage = totalPages;
    if (auditCurrentPage < 1) auditCurrentPage = 1;

    const startIdx = (auditCurrentPage - 1) * auditPageSize;
    const endIdx = Math.min(startIdx + auditPageSize, totalItems);
    const pageItems = currentFilteredAuditLogs.slice(startIdx, endIdx);

    tbody.innerHTML = pageItems.map(l => {
        const rawDate = l.created_at || l.timestamp || '';
        let displayDate = rawDate;
        if (rawDate) {
            try {
                // If it already contains YYYY-MM-DD HH:MM:SS
                if (rawDate.includes(' ') && rawDate.length >= 19) {
                    const [dPart, tPart] = rawDate.split(' ');
                    const [y, m, d] = dPart.split('-');
                    displayDate = `${d}/${m}/${y} ${tPart}`;
                } else {
                    const dt = new Date(rawDate);
                    if (!isNaN(dt.getTime())) {
                        displayDate = dt.toLocaleString('es-VE', {
                            year: 'numeric', month: '2-digit', day: '2-digit',
                            hour: '2-digit', minute: '2-digit', second: '2-digit',
                            hour12: true
                        });
                    }
                }
            } catch(e) {}
        }
        return `
            <tr>
                <td style="font-weight: 700; color: #334155; font-size: 11px; white-space: nowrap;">
                    <i class="fa-regular fa-clock" style="color: #0284c7; margin-right: 4px;"></i>${displayDate}
                </td>
                <td style="font-weight: 800; color: var(--dalor-navy);">${l.username || 'Sistema'}</td>
                <td><span style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 11px; text-transform: uppercase;">${l.module || 'General'}</span></td>
                <td style="font-weight: 700; color: #0284c7;">${l.action || '-'}</td>
                <td style="color: #334155; font-size: 11px;">${l.details || '-'}</td>
            </tr>
        `;
    }).join('');

    updateAuditPaginationControls(startIdx + 1, endIdx, totalItems, totalPages);
}

function updateAuditPaginationControls(start, end, total, totalPages) {
    const countInfo = document.getElementById('auditPageCountInfo');
    if (countInfo) {
        countInfo.textContent = total > 0 ? `Mostrando ${start} - ${end} de ${total}` : 'Mostrando 0 - 0 de 0';
    }

    const container = document.getElementById('auditPaginationControls');
    if (!container) return;

    if (total <= auditPageSize) {
        container.innerHTML = '';
        return;
    }

    let html = `
        <button onclick="goToAuditPage(${auditCurrentPage - 1})" class="btn-secondary" style="padding: 3px 8px; font-size: 11px;" ${auditCurrentPage <= 1 ? 'disabled' : ''}>
            <i class="fa-solid fa-chevron-left"></i> Anterior
        </button>
        <span style="font-size: 11px; font-weight: 700; color: #334155; padding: 0 4px;">Pág. ${auditCurrentPage} / ${totalPages}</span>
        <button onclick="goToAuditPage(${auditCurrentPage + 1})" class="btn-secondary" style="padding: 3px 8px; font-size: 11px;" ${auditCurrentPage >= totalPages ? 'disabled' : ''}>
            Siguiente <i class="fa-solid fa-chevron-right"></i>
        </button>
    `;
    container.innerHTML = html;
}

function goToAuditPage(page) {
    auditCurrentPage = page;
    renderMaintenanceAuditLogs(currentFilteredAuditLogs);
}

function changeAuditPageSize(newSize) {
    auditPageSize = parseInt(newSize, 10) || 25;
    auditCurrentPage = 1;
    renderMaintenanceAuditLogs(currentFilteredAuditLogs);
}

function filterMaintenanceAuditLogs() {
    auditCurrentPage = 1;
    const userFilter = (document.getElementById('auditFilterUser')?.value || '').toLowerCase().trim();
    const dateFrom = document.getElementById('auditFilterDateFrom')?.value || '';
    const dateTo = document.getElementById('auditFilterDateTo')?.value || '';
    const query = (document.getElementById('auditFilterQuery')?.value || '').toLowerCase().trim();

    let filtered = allAuditLogsCache.filter(l => {
        if (userFilter && !(l.username || '').toLowerCase().includes(userFilter)) return false;
        if (query) {
            const matchAction = (l.action || '').toLowerCase().includes(query);
            const matchDetails = (l.details || '').toLowerCase().includes(query);
            const matchModule = (l.module || '').toLowerCase().includes(query);
            if (!matchAction && !matchDetails && !matchModule) return false;
        }
        if (dateFrom || dateTo) {
            const raw = l.created_at || l.timestamp || '';
            const logDateStr = (raw.split(' ')[0] || raw.split('T')[0]).trim();
            if (dateFrom && logDateStr < dateFrom) return false;
            if (dateTo && logDateStr > dateTo) return false;
        }
        return true;
    });

    renderMaintenanceAuditLogs(filtered);
}

function resetMaintenanceAuditFilters() {
    auditCurrentPage = 1;
    if (document.getElementById('auditFilterUser')) document.getElementById('auditFilterUser').value = '';
    if (document.getElementById('auditFilterDateFrom')) document.getElementById('auditFilterDateFrom').value = '';
    if (document.getElementById('auditFilterDateTo')) document.getElementById('auditFilterDateTo').value = '';
    if (document.getElementById('auditFilterQuery')) document.getElementById('auditFilterQuery').value = '';
    renderMaintenanceAuditLogs(allAuditLogsCache);
}










// Exponer al objeto global window para eventos inline y compatibilidad
if (typeof window !== 'undefined') {
    window.loadMaintenanceAuditLogs = loadMaintenanceAuditLogs;
    window.renderMaintenanceAuditLogs = renderMaintenanceAuditLogs;
    window.updateAuditPaginationControls = updateAuditPaginationControls;
    window.goToAuditPage = goToAuditPage;
    window.changeAuditPageSize = changeAuditPageSize;
    window.filterMaintenanceAuditLogs = filterMaintenanceAuditLogs;
    window.resetMaintenanceAuditFilters = resetMaintenanceAuditFilters;
}
