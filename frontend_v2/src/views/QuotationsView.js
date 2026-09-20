
import { api } from '../api/client.js';
import { store } from '../state/store.js';
import { showToast } from '../components/Toast.js';

export function renderQuotationsView() {
    return `
    <div class="main-wrapper">
        <div class="dalor-card">
            <div class="card-header">
                <h2><i class="fa-solid fa-file-invoice-dollar" style="color: var(--dalor-blue);"></i> Presupuestos & Cotizaciones Formales (APU)</h2>
                <button class="btn btn-primary" id="btn-new-quotation">
                    <i class="fa-solid fa-plus"></i> Nueva Cotización
                </button>
            </div>

            <div class="table-responsive">
                <table class="dalor-table">
                    <thead>
                        <tr>
                            <th>N° Cotización</th>
                            <th>Cliente</th>
                            <th>Título de Obra / Proyecto</th>
                            <th>Subtotal ($)</th>
                            <th>IVA ($)</th>
                            <th>Total ($)</th>
                            <th>Estado</th>
                            <th style="text-align: center;">Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="quotations-table-body">
                        <tr><td colspan="8" style="text-align: center; padding: 24px; color: #94a3b8;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando cotizaciones...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
    `;
}

export async function bindQuotationsEvents() {
    const tbody = document.getElementById('quotations-table-body');
    if (!tbody) return;

    try {
        const quotes = await api.quotations.getAll();
        if (!quotes || quotes.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" class="empty-state"><i class="fa-solid fa-file-circle-plus"></i><h3>No hay cotizaciones emitidas</h3><p>Usa '+ Nueva Cotización' para armar una.</p></td></tr>`;
            return;
        }

        tbody.innerHTML = quotes.map(q => {
            const isApproved = q.status === 'aprobado';
            const clientName = q.client ? q.client.name : 'Cliente General';
            return `
            <tr>
                <td style="font-weight: 800; color: var(--dalor-blue);">${q.quote_number}</td>
                <td style="font-weight: 600;">${clientName}</td>
                <td>${q.project_title}</td>
                <td style="font-weight: 700;">$${Number(q.subtotal_usd || 0).toLocaleString()}</td>
                <td style="color: ${q.tax_usd === 0 ? '#10b981' : '#64748b'}; font-weight: 700;">
                    ${q.tax_usd === 0 ? 'EXENTO (0%)' : `$${Number(q.tax_usd || 0).toLocaleString()}`}
                </td>
                <td style="font-weight: 800; color: var(--dalor-navy);">$${Number(q.total_usd || 0).toLocaleString()}</td>
                <td>
                    <span class="badge ${isApproved ? 'badge-green' : 'badge-gray'}">${q.status.toUpperCase()}</span>
                </td>
                <td style="text-align: center; white-space: nowrap;">
                    ${!isApproved ? `
                    <button class="btn btn-success btn-approve-quote" data-id="${q.id}" style="padding: 4px 8px; font-size: 11px;">
                        <i class="fa-solid fa-check"></i> Convertir en Proyecto
                    </button>
                    ` : '<span style="font-size: 11px; color: #059669; font-weight: 800;"><i class="fa-solid fa-circle-check"></i> Obra Activa</span>'}
                </td>
            </tr>
            `;
        }).join('');

        // Bind approval buttons
        document.querySelectorAll('.btn-approve-quote').forEach(btn => {
            btn.addEventListener('click', async () => {
                const quoteId = btn.dataset.id;
                if (!confirm(`¿Deseas aprobar la cotización y convertirla en Proyecto Operativo?`)) return;
                try {
                    const res = await api.quotations.approve(quoteId);
                    showToast(`Proyecto ${res.project_code || ''} activado con éxito`);
                    bindQuotationsEvents();
                } catch(e) {
                    showToast(e.message, 'error');
                }
            });
        });

    } catch(e) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 20px; color: #ef4444;">Error al cargar cotizaciones: ${e.message}</td></tr>`;
    }
}
