
import { api } from '../api/client.js';

export function renderProjectsView() {
    return `
    <div class="main-wrapper">
        <div class="dalor-card">
            <div class="card-header">
                <h2><i class="fa-solid fa-helmet-safety" style="color: var(--dalor-blue);"></i> Proyectos & Obras Operativas</h2>
            </div>

            <div class="table-responsive">
                <table class="dalor-table">
                    <thead>
                        <tr>
                            <th>Código</th>
                            <th>Nombre de la Obra</th>
                            <th>Cliente</th>
                            <th>Ubicación</th>
                            <th>Monto Contratado ($)</th>
                            <th>Total Cobrado ($)</th>
                            <th>Saldo Pendiente ($)</th>
                            <th>Estado</th>
                        </tr>
                    </thead>
                    <tbody id="projects-table-body">
                        <tr><td colspan="8" style="text-align: center; padding: 24px; color: #94a3b8;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando proyectos...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
    `;
}

export async function bindProjectsEvents() {
    const tbody = document.getElementById('projects-table-body');
    if (!tbody) return;

    try {
        const projects = await api.projects.getAll();
        if (!projects || projects.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" class="empty-state"><i class="fa-solid fa-diagram-project"></i><h3>No hay proyectos activos</h3><p>Las cotizaciones aprobadas aparecen aquí como proyectos.</p></td></tr>`;
            return;
        }

        tbody.innerHTML = projects.map(p => {
            const clientName = p.client ? p.client.name : 'Cliente General';
            const balance = (p.total_amount_usd || 0) - (p.total_collected_usd || 0);
            return `
            <tr>
                <td style="font-weight: 800; color: var(--dalor-blue);">${p.code}</td>
                <td style="font-weight: 700; color: var(--dalor-navy);">${p.name}</td>
                <td>${clientName}</td>
                <td>${p.location || 'Sede'}</td>
                <td style="font-weight: 700;">$${Number(p.total_amount_usd || 0).toLocaleString()}</td>
                <td style="font-weight: 700; color: #059669;">$${Number(p.total_collected_usd || 0).toLocaleString()}</td>
                <td style="font-weight: 800; color: ${balance > 0 ? '#b91c1c' : '#059669'};">$${Number(balance).toLocaleString()}</td>
                <td><span class="badge badge-green">${p.status || 'ACTIVO'}</span></td>
            </tr>
            `;
        }).join('');

    } catch(e) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #ef4444; padding: 20px;">Error al cargar proyectos: ${e.message}</td></tr>`;
    }
}
