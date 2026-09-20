
import { api } from '../api/client.js';

export function renderDispatchView() {
    return `
    <div class="main-wrapper">
        <div class="dalor-card">
            <div class="card-header">
                <h2><i class="fa-solid fa-truck-ramp-box" style="color: var(--dalor-blue);"></i> Guías de Despacho & Control de Movimientos</h2>
            </div>

            <div class="table-responsive">
                <table class="dalor-table">
                    <thead>
                        <tr>
                            <th>N° Guía</th>
                            <th>Fecha</th>
                            <th>Destinatario / Obra</th>
                            <th>Dirección</th>
                            <th>Tipo de Guía</th>
                            <th>Estado</th>
                        </tr>
                    </thead>
                    <tbody id="dispatch-table-body">
                        <tr><td colspan="6" style="text-align: center; padding: 24px; color: #94a3b8;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando guías...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
    `;
}

export async function bindDispatchEvents() {
    const tbody = document.getElementById('dispatch-table-body');
    if (!tbody) return;

    try {
        const guides = await api.dispatch.getAll();
        if (!guides || guides.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="empty-state"><i class="fa-solid fa-clipboard-check"></i><h3>No hay guías de despacho emitidas</h3></td></tr>`;
            return;
        }

        tbody.innerHTML = guides.map(g => `
            <tr>
                <td style="font-weight: 800; color: var(--dalor-blue);">${g.guide_number}</td>
                <td>${g.created_at ? g.created_at.substring(0, 10) : '-'}</td>
                <td style="font-weight: 700; color: var(--dalor-navy);">${g.recipient_name || g.project_name || 'Obra'}</td>
                <td>${g.destination_address || '-'}</td>
                <td><span class="badge badge-blue">${g.guide_type || 'ESTÁNDAR'}</span></td>
                <td><span class="badge ${g.status === 'entregada' ? 'badge-green' : 'badge-amber'}">${(g.status || 'EMITIDA').toUpperCase()}</span></td>
            </tr>
        `).join('');

    } catch(e) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #ef4444; padding: 20px;">Error al cargar guías: ${e.message}</td></tr>`;
    }
}
