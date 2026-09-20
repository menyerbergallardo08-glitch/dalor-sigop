
import { api } from '../api/client.js';
import { showToast } from '../components/Toast.js';

export function renderClientsView() {
    return `
    <div class="main-wrapper">
        <div class="dalor-card">
            <div class="card-header">
                <h2><i class="fa-solid fa-users" style="color: var(--dalor-blue);"></i> Directorio Oficial de Clientes</h2>
                <button class="btn btn-primary" id="btn-new-client">
                    <i class="fa-solid fa-plus"></i> Nuevo Cliente
                </button>
            </div>

            <div class="table-responsive">
                <table class="dalor-table">
                    <thead>
                        <tr>
                            <th>Código</th>
                            <th>Razón Social / Nombre</th>
                            <th>RIF</th>
                            <th>Contacto</th>
                            <th>Teléfono / Correo</th>
                            <th>Dirección</th>
                            <th style="text-align: center;">Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="clients-table-body">
                        <tr><td colspan="7" style="text-align: center; padding: 24px; color: #94a3b8;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando clientes...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
    `;
}

export async function bindClientsEvents() {
    const tbody = document.getElementById('clients-table-body');
    if (!tbody) return;

    try {
        const clients = await api.clients.getAll();
        if (!clients || clients.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="empty-state"><i class="fa-solid fa-user-plus"></i><h3>No hay clientes registrados</h3><p>Usa '+ Nuevo Cliente' para agregar el primero.</p></td></tr>`;
            return;
        }

        tbody.innerHTML = clients.map(c => `
            <tr>
                <td style="font-weight: 800; color: var(--dalor-blue);">${c.code || ('CLI-' + String(c.id).padStart(3, '0'))}</td>
                <td style="font-weight: 700; color: var(--dalor-navy);">${c.name}</td>
                <td>${c.rif || '<span style="color:#94a3b8;">-</span>'}</td>
                <td>${c.contact_name || '<span style="color:#94a3b8;">-</span>'}</td>
                <td>${c.contact_phone || c.contact_email || '<span style="color:#94a3b8;">-</span>'}</td>
                <td>${c.address || '<span style="color:#94a3b8;">-</span>'}</td>
                <td style="text-align: center;">
                    <button class="btn btn-secondary btn-delete-client" data-id="${c.id}" style="padding: 4px 8px; color: #ef4444;" title="Inactivar">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');

        document.querySelectorAll('.btn-delete-client').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (!confirm("¿Inactivar cliente del directorio?")) return;
                try {
                    await api.clients.delete(btn.dataset.id);
                    showToast("Cliente inactivado");
                    bindClientsEvents();
                } catch(e) {
                    showToast(e.message, 'error');
                }
            });
        });

    } catch(e) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #ef4444; padding: 20px;">Error al cargar clientes: ${e.message}</td></tr>`;
    }
}
