
import { api } from '../api/client.js';

export function renderExpensesView() {
    return `
    <div class="main-wrapper">
        <div class="dalor-card">
            <div class="card-header">
                <h2><i class="fa-solid fa-receipt" style="color: var(--dalor-blue);"></i> Bandeja de Gastos & Comprobantes de Obra</h2>
            </div>

            <div class="table-responsive">
                <table class="dalor-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Fecha</th>
                            <th>Descripción</th>
                            <th>Categoría</th>
                            <th>Proyecto / Sede</th>
                            <th>Monto ($)</th>
                            <th>Monto (Bs)</th>
                            <th>Estado</th>
                        </tr>
                    </thead>
                    <tbody id="expenses-table-body">
                        <tr><td colspan="8" style="text-align: center; padding: 24px; color: #94a3b8;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando gastos...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
    `;
}

export async function bindExpensesEvents() {
    const tbody = document.getElementById('expenses-table-body');
    if (!tbody) return;

    try {
        const expenses = await api.expenses.getAll();
        if (!expenses || expenses.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" class="empty-state"><i class="fa-solid fa-receipt"></i><h3>No hay gastos registrados en la bandeja</h3></td></tr>`;
            return;
        }

        tbody.innerHTML = expenses.map(e => `
            <tr>
                <td style="font-weight: 800; color: var(--dalor-blue);">#${e.id}</td>
                <td>${e.date ? e.date.substring(0, 10) : '-'}</td>
                <td style="font-weight: 700; color: var(--dalor-navy);">${e.description}</td>
                <td><span class="badge badge-blue">${e.category_name || 'General'}</span></td>
                <td>${e.project_name || 'Sede'}</td>
                <td style="font-weight: 800;">$${Number(e.amount_usd || 0).toFixed(2)}</td>
                <td style="color: #64748b;">${Number(e.amount_bs || 0).toLocaleString()} Bs</td>
                <td><span class="badge ${e.status === 'aprobado' ? 'badge-green' : 'badge-amber'}">${(e.status || 'PENDIENTE').toUpperCase()}</span></td>
            </tr>
        `).join('');

    } catch(e) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #ef4444; padding: 20px;">Error al cargar gastos: ${e.message}</td></tr>`;
    }
}
