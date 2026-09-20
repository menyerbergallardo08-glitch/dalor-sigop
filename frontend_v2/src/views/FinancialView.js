
import { api } from '../api/client.js';

export function renderFinancialView() {
    return `
    <div class="main-wrapper">
        <div class="dalor-card">
            <div class="card-header">
                <h2><i class="fa-solid fa-scale-balanced" style="color: var(--dalor-blue);"></i> Finanzas, Tesorería & Cuentas por Pagar (CxP)</h2>
            </div>

            <div class="table-responsive">
                <table class="dalor-table">
                    <thead>
                        <tr>
                            <th>N° CxP</th>
                            <th>Proveedor</th>
                            <th>Concepto</th>
                            <th>Monto Facturado ($)</th>
                            <th>Total Pagado ($)</th>
                            <th>Saldo Pendiente ($)</th>
                            <th>Estado</th>
                        </tr>
                    </thead>
                    <tbody id="financial-table-body">
                        <tr><td colspan="7" style="text-align: center; padding: 24px; color: #94a3b8;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando cuentas por pagar...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
    `;
}

export async function bindFinancialEvents() {
    const tbody = document.getElementById('financial-table-body');
    if (!tbody) return;

    try {
        const cxp = await api.financial.getCxp();
        if (!cxp || cxp.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="empty-state"><i class="fa-solid fa-wallet"></i><h3>No hay cuentas por pagar pendientes</h3></td></tr>`;
            return;
        }

        tbody.innerHTML = cxp.map(item => `
            <tr>
                <td style="font-weight: 800; color: var(--dalor-blue);">CXP-${item.id}</td>
                <td style="font-weight: 700; color: var(--dalor-navy);">${item.supplier_name || 'Proveedor'}</td>
                <td>${item.description || '-'}</td>
                <td style="font-weight: 700;">$${Number(item.total_usd || 0).toLocaleString()}</td>
                <td style="font-weight: 700; color: #059669;">$${Number(item.paid_usd || 0).toLocaleString()}</td>
                <td style="font-weight: 800; color: ${item.balance_usd > 0 ? '#b91c1c' : '#059669'};">$${Number(item.balance_usd || 0).toLocaleString()}</td>
                <td><span class="badge ${item.status === 'pagada' ? 'badge-green' : 'badge-amber'}">${(item.status || 'PENDIENTE').toUpperCase()}</span></td>
            </tr>
        `).join('');

    } catch(e) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #ef4444; padding: 20px;">Error al cargar finanzas: ${e.message}</td></tr>`;
    }
}
