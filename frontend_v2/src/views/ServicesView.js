
import { api } from '../api/client.js';

export function renderServicesView() {
    return `
    <div class="main-wrapper">
        <div class="dalor-card">
            <div class="card-header">
                <h2><i class="fa-solid fa-list-check" style="color: var(--dalor-blue);"></i> Catálogo Maestro de Partidas APU</h2>
            </div>

            <div class="table-responsive">
                <table class="dalor-table">
                    <thead>
                        <tr>
                            <th>Código</th>
                            <th>Descripción del Servicio</th>
                            <th>Categoría</th>
                            <th>Unidad</th>
                            <th>Costo Base ($)</th>
                            <th>Precio Venta ($)</th>
                            <th>Margen ($)</th>
                        </tr>
                    </thead>
                    <tbody id="services-table-body">
                        <tr><td colspan="7" style="text-align: center; padding: 24px; color: #94a3b8;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando partidas...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
    `;
}

export async function bindServicesEvents() {
    const tbody = document.getElementById('services-table-body');
    if (!tbody) return;

    try {
        const services = await api.services.getAll();
        if (!services || services.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="empty-state"><i class="fa-solid fa-toolbox"></i><h3>No hay partidas registradas</h3></td></tr>`;
            return;
        }

        tbody.innerHTML = services.map(s => {
            const margin = (s.unit_price_usd || 0) - (s.base_cost_usd || 0);
            return `
            <tr>
                <td style="font-weight: 800; color: var(--dalor-blue);">${s.code}</td>
                <td style="font-weight: 700; color: var(--dalor-navy);">${s.name}</td>
                <td><span class="badge badge-blue">${s.category || 'General'}</span></td>
                <td style="font-weight: 600;">${s.unit_measure}</td>
                <td style="font-weight: 600;">$${Number(s.base_cost_usd || 0).toFixed(2)}</td>
                <td style="font-weight: 800; color: var(--dalor-navy);">$${Number(s.unit_price_usd || 0).toFixed(2)}</td>
                <td style="font-weight: 700; color: ${margin >= 0 ? '#10b981' : '#ef4444'};">
                    +$${margin.toFixed(2)}
                </td>
            </tr>
            `;
        }).join('');

    } catch(e) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #ef4444; padding: 20px;">Error al cargar partidas: ${e.message}</td></tr>`;
    }
}
