
import { api } from '../api/client.js';
import { showToast } from '../components/Toast.js';

export function renderMaintenanceView() {
    return `
    <div class="main-wrapper">
        <div class="dalor-card">
            <div class="card-header">
                <h2><i class="fa-solid fa-shield-halved" style="color: var(--dalor-blue);"></i> Mantenimiento, Usuarios & Respaldos</h2>
                <button class="btn btn-blue" id="btn-sync-catalog">
                    <i class="fa-solid fa-arrows-rotate"></i> Sincronizar Catálogo Maestro
                </button>
            </div>

            <div class="table-responsive">
                <table class="dalor-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Usuario</th>
                            <th>Nombre Completo</th>
                            <th>Rol Oficial</th>
                            <th>Estado</th>
                        </tr>
                    </thead>
                    <tbody id="users-table-body">
                        <tr><td colspan="5" style="text-align: center; padding: 24px; color: #94a3b8;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando usuarios...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
    `;
}

export async function bindMaintenanceEvents() {
    const tbody = document.getElementById('users-table-body');
    const btnSync = document.getElementById('btn-sync-catalog');
    if (!tbody) return;

    if (btnSync) {
        btnSync.addEventListener('click', async () => {
            btnSync.disabled = true;
            btnSync.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sincronizando...';
            try {
                const res = await api.maintenance.syncCatalog();
                showToast(res.message || "Catálogo sincronizado exitosamente");
            } catch(e) {
                showToast(e.message, 'error');
            } finally {
                btnSync.disabled = false;
                btnSync.innerHTML = '<i class="fa-solid fa-arrows-rotate"></i> Sincronizar Catálogo Maestro';
            }
        });
    }

    try {
        const users = await api.maintenance.getUsers();
        if (!users || users.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="empty-state">No hay usuarios registrados</td></tr>`;
            return;
        }

        tbody.innerHTML = users.map(u => `
            <tr>
                <td style="font-weight: 800; color: var(--dalor-blue);">#${u.id}</td>
                <td style="font-weight: 700; color: var(--dalor-navy);">@${u.username}</td>
                <td>${u.full_name}</td>
                <td><span class="badge badge-blue">${u.role_name.replace('_', ' ').toUpperCase()}</span></td>
                <td><span class="badge badge-green">${u.is_active ? 'ACTIVO' : 'INACTIVO'}</span></td>
            </tr>
        `).join('');

    } catch(e) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #ef4444; padding: 20px;">Error al cargar usuarios: ${e.message}</td></tr>`;
    }
}
