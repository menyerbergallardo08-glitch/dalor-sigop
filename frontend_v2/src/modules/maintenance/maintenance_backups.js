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

// --- BLOQUE L10942-L11091 ---
// ==============================================================================

// 💾 18. MÓDULO DE COPIAS DE SEGURIDAD & RESPALDOS AUTOMÁTICOS

// ==============================================================================

async function loadBackupsList() {

    const tbody = document.getElementById('backupsTableBody');

    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #94a3b8; padding: 16px;"><i class="fa-solid fa-spinner fa-spin"></i> Consultando copias de seguridad...</td></tr>`;



    try {

        const res = await authFetch(`${API_BASE}/maintenance/backups`);

        const list = await res.json();



        if (list.length === 0) {

            tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #94a3b8; padding: 16px;">No hay respaldos generados aún. Haz clic en "Generar Respaldo Ahora".</td></tr>`;

            return;

        }



        tbody.innerHTML = list.map(b => `

            <tr>

                <td style="font-weight: 700; color: #64748b; font-size: 11px;">${b.created_at}</td>

                <td style="font-weight: 800; color: var(--dalor-navy); font-family: monospace;">${b.filename}</td>

                <td style="font-weight: 700; color: #0284c7;">${b.size_kb} KB</td>

                <td><span style="background: #d1fae5; color: #065f46; padding: 2px 8px; border-radius: 4px; font-weight: 800; font-size: 11px;">Disponible</span></td>

                <td style="text-align: right;">

                    <a href="${API_BASE}/maintenance/backups/download/${b.filename}" target="_blank" class="btn-secondary" style="padding: 4px 8px; font-size: 11px; text-decoration: none; margin-right: 4px;" title="Descargar copia">

                        <i class="fa-solid fa-download"></i> Descargar

                    </a>

                    <button onclick="restoreBackup('${b.filename}')" class="btn-secondary" style="padding: 4px 8px; font-size: 11px; color: #b45309;" title="Restaurar a esta versión">

                        <i class="fa-solid fa-rotate-left"></i> Restaurar

                    </button>

                </td>

            </tr>

        `).join('');



    } catch (e) {

        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #e11d48; padding: 16px;">Error al cargar copias de seguridad.</td></tr>`;

    }

}



async function createNewBackup() {

    try {

        const res = await authFetch(`${API_BASE}/maintenance/backups/create`, { method: 'POST' });

        const data = await res.json();

        if (data.success) {

            alert(`✅ ${data.message}`);

            loadBackupsList();

        } else {

            alert('Error al generar respaldo.');

        }

    } catch (e) {

        alert('Error de conexión al generar respaldo: ' + e.message);

    }

}



async function restoreBackup(filename) {

    if (!confirm(`⚠️ ¿Estás seguro de restaurar la base de datos al estado de '${filename}'?\n\nSe creará un respaldo automático preventivo antes de aplicar la restauración.`)) {

        return;

    }



    try {

        const res = await authFetch(`${API_BASE}/maintenance/backups/restore/${filename}`, { method: 'POST' });

        const data = await res.json();

        if (data.success) {

            alert(`✅ ${data.message}`);

            loadInitialMasterData();

            loadExecutiveDashboard();

            loadBackupsList();

        } else {

            alert('Error al restaurar respaldo.');

        }

    } catch (e) {

        alert('Error al restaurar respaldo: ' + e.message);

    }

}






// Exponer al objeto global window para eventos inline y compatibilidad
if (typeof window !== 'undefined') {
    window.loadBackupsList = loadBackupsList;
    window.createNewBackup = createNewBackup;
    window.restoreBackup = restoreBackup;
}
