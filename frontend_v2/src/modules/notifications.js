/**
 * DALOR SIGO-P | Módulo: NOTIFICATIONS.JS
 * Campana de Alertas del Sistema (CxC, Gastos, Obligaciones de Flota) + Envío por Correo.
 */

const getApiBase = () => (typeof window !== 'undefined' && window.API_BASE) || (window.location.origin + '/api/v1');

function authFetch(url, options = {}) {
    const t = sessionStorage.getItem('dalor_token') || localStorage.getItem('dalor_token') || window.authToken || '';
    const headers = Object.assign({}, options.headers || {});
    if (t) headers['Authorization'] = 'Bearer ' + t;
    if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
    }
    return window.fetch(url, Object.assign({}, options, { headers }));
}

let cachedSystemAlerts = null;
let currentAlertCategoryFilter = 'all';

export async function refreshSystemAlertsBadge() {
    const t = sessionStorage.getItem('dalor_token') || localStorage.getItem('dalor_token') || window.authToken || '';
    if (!t) return;
    try {
        const res = await authFetch(`${getApiBase()}/notifications/alerts`);
        if (!res.ok) return;
        const data = await res.json();
        cachedSystemAlerts = data;
        const badge = document.getElementById('badgeSystemAlertsHeader');
        if (badge) {
            const cnt = Number(data.total_count || 0);
            badge.innerText = cnt > 99 ? '99+' : String(cnt);
            badge.style.display = cnt > 0 ? 'inline-block' : 'none';
        }
        return data;
    } catch (_) {}
}

export async function openSystemAlertsModal() {
    if (typeof window.openModal === 'function') window.openModal('modalSystemAlerts');
    const data = await refreshSystemAlertsBadge();
    renderSystemAlertsList(data || cachedSystemAlerts);
}

export function filterSystemAlerts(cat) {
    currentAlertCategoryFilter = cat || 'all';
    renderSystemAlertsList(cachedSystemAlerts);
}

function renderSystemAlertsList(data) {
    const listEl = document.getElementById('systemAlertsListContainer');
    const countsEl = document.getElementById('systemAlertsSummaryPills');
    const smtpEl = document.getElementById('systemAlertsSmtpBadge');
    if (!listEl) return;

    if (!data) {
        listEl.innerHTML = '<div style="text-align:center; padding:16px; color:#64748b;">Cargando alertas...</div>';
        return;
    }

    const c = data.counts || {};
    if (countsEl) {
        countsEl.innerHTML = `
            <button type="button" onclick="filterSystemAlerts('all')" class="${currentAlertCategoryFilter === 'all' ? 'btn-primary' : 'btn-secondary'}" style="font-size:11px; padding:4px 10px;">Todas (${data.total_count || 0})</button>
            <button type="button" onclick="filterSystemAlerts('cxc')" class="${currentAlertCategoryFilter === 'cxc' ? 'btn-primary' : 'btn-secondary'}" style="font-size:11px; padding:4px 10px;">CxC Vencidas (${c.cxc || 0})</button>
            <button type="button" onclick="filterSystemAlerts('fleet')" class="${currentAlertCategoryFilter === 'fleet' ? 'btn-primary' : 'btn-secondary'}" style="font-size:11px; padding:4px 10px;">Obligaciones / Pólizas (${c.fleet || 0})</button>
            <button type="button" onclick="filterSystemAlerts('maintenance')" class="${currentAlertCategoryFilter === 'maintenance' ? 'btn-primary' : 'btn-secondary'}" style="font-size:11px; padding:4px 10px;">Mantenimiento (${c.maintenance || 0})</button>
            <button type="button" onclick="filterSystemAlerts('expenses')" class="${currentAlertCategoryFilter === 'expenses' ? 'btn-primary' : 'btn-secondary'}" style="font-size:11px; padding:4px 10px;">Gastos (${c.expenses || 0})</button>
        `;
    }

    if (smtpEl) {
        smtpEl.innerHTML = data.smtp_configured
            ? '<span style="background:#dcfce7; color:#166534; padding:2px 8px; border-radius:9999px; font-size:10.5px; font-weight:800;">✅ SMTP Activo</span>'
            : '<span style="background:#fef3c7; color:#92400e; padding:2px 8px; border-radius:9999px; font-size:10.5px; font-weight:800;">⚠️ SMTP pendiente (.env / Render)</span>';
    }

    if (data.schedule) {
        const enEl = document.getElementById('systemAlertsAutoEnabled');
        const intEl = document.getElementById('systemAlertsIntervalHours');
        const toEl = document.getElementById('systemAlertsEmailTo');
        if (enEl) enEl.checked = data.schedule.enabled !== false;
        if (intEl && data.schedule.interval_hours) intEl.value = String(data.schedule.interval_hours);
        if (toEl && !toEl.value && data.schedule.recipients) toEl.value = data.schedule.recipients;
    }

    const items = (data.items || []).filter(i => currentAlertCategoryFilter === 'all' || i.category === currentAlertCategoryFilter);
    if (!items.length) {
        listEl.innerHTML = '<div style="text-align:center; padding:20px; color:#059669; font-weight:700;">✅ Todo al día en esta categoría.</div>';
        return;
    }

    listEl.innerHTML = items.map(it => {
        const isCrit = it.severity === 'critical';
        const bg = isCrit ? '#fef2f2' : '#fffbeb';
        const border = isCrit ? '#fecaca' : '#fde68a';
        const tagBg = it.category === 'cxc' ? '#dbeafe' : (it.category === 'fleet' ? '#fee2e2' : '#fef3c7');
        const tagColor = it.category === 'cxc' ? '#1e40af' : (it.category === 'fleet' ? '#991b1b' : '#92400e');
        return `
            <div style="background:${bg}; border:1px solid ${border}; border-radius:8px; padding:8px 10px; display:flex; justify-content:space-between; align-items:center; gap:8px;">
                <div>
                    <span style="background:${tagBg}; color:${tagColor}; font-size:9.5px; font-weight:800; padding:1px 6px; border-radius:4px; text-transform:uppercase;">${it.category}</span>
                    <b style="font-size:12px; color:#0f172a; margin-left:4px;">${it.title}</b>
                    <div style="font-size:11px; color:#475569; margin-top:2px;">${it.detail}</div>
                </div>
                <span style="font-size:10.5px; font-weight:700; color:#64748b; white-space:nowrap;">${it.due_date || ''}</span>
            </div>
        `;
    }).join('');
}

export async function sendSystemAlertsEmail() {
    const toEmail = (document.getElementById('systemAlertsEmailTo')?.value || '').trim() || null;
    const btn = document.getElementById('btnSendSystemAlertsEmail');
    const orig = btn ? btn.innerHTML : '';
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Enviando...';
    }
    try {
        const res = await authFetch(`${getApiBase()}/notifications/send-email`, {
            method: 'POST',
            body: JSON.stringify({ to_email: toEmail })
        });
        const data = await res.json().catch(() => ({}));
        alert((data.sent ? '✅ ' : '⚠️ ') + (data.message || 'Proceso finalizado'));
    } catch (err) {
        alert('Error: ' + err.message);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = orig;
        }
    }
}

export async function saveSystemAlertsSchedule() {
    const enabled = !!document.getElementById('systemAlertsAutoEnabled')?.checked;
    const intervalHours = parseInt(document.getElementById('systemAlertsIntervalHours')?.value || '24') || 24;
    const recipients = (document.getElementById('systemAlertsEmailTo')?.value || '').trim();
    const res = await authFetch(`${getApiBase()}/notifications/settings`, {
        method: 'PUT',
        body: JSON.stringify({ enabled, interval_hours: intervalHours, recipients })
    });
    if (res.ok) {
        alert(`✅ Regulación guardada: ${enabled ? 'Activo cada ' + intervalHours + 'h' : 'Envío automático pausado'}.`);
    } else {
        alert('Error al guardar configuración de alertas.');
    }
}

if (typeof window !== 'undefined') {
    window.refreshSystemAlertsBadge = refreshSystemAlertsBadge;
    window.openSystemAlertsModal = openSystemAlertsModal;
    window.filterSystemAlerts = filterSystemAlerts;
    window.sendSystemAlertsEmail = sendSystemAlertsEmail;
    window.saveSystemAlertsSchedule = saveSystemAlertsSchedule;
    setTimeout(() => refreshSystemAlertsBadge(), 2000);
    setInterval(() => refreshSystemAlertsBadge(), 180000);
}
