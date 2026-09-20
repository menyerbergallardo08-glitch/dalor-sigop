
import { api } from '../api/client.js';

export function renderResourcesView() {
    return `
    <div class="main-wrapper">
        <div class="dalor-card">
            <div class="card-header">
                <h2><i class="fa-solid fa-truck-pickup" style="color: var(--dalor-blue);"></i> Catálogo Industrial de Activos & Herramientas (907 Ítems)</h2>
                <div style="display: flex; gap: 10px; align-items: center;">
                    <input type="text" id="asset-search-input" placeholder="Buscar herramienta o equipo..."
                        style="padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; width: 280px;">
                </div>
            </div>

            <div class="table-responsive">
                <table class="dalor-table">
                    <thead>
                        <tr>
                            <th>Código</th>
                            <th>Nombre del Activo / Herramienta</th>
                            <th>Categoría</th>
                            <th>Marca / Modelo</th>
                            <th>Serial / Placa</th>
                            <th>Estado</th>
                            <th>Ubicación</th>
                        </tr>
                    </thead>
                    <tbody id="assets-table-body">
                        <tr><td colspan="7" style="text-align: center; padding: 24px; color: #94a3b8;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando catálogo de activos...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
    `;
}

let allAssetsData = [];

export async function bindResourcesEvents() {
    const tbody = document.getElementById('assets-table-body');
    const searchInput = document.getElementById('asset-search-input');
    if (!tbody) return;

    try {
        allAssetsData = await api.assets.getAll();
        renderAssetsTable(allAssetsData);

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const query = e.target.value.toLowerCase().trim();
                const filtered = allAssetsData.filter(a =>
                    (a.code && a.code.toLowerCase().includes(query)) ||
                    (a.name && a.name.toLowerCase().includes(query)) ||
                    (a.category && a.category.toLowerCase().includes(query)) ||
                    (a.brand && a.brand.toLowerCase().includes(query))
                );
                renderAssetsTable(filtered);
            });
        }
    } catch(e) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #ef4444; padding: 20px;">Error al cargar activos: ${e.message}</td></tr>`;
    }
}

function renderAssetsTable(items) {
    const tbody = document.getElementById('assets-table-body');
    if (!tbody) return;

    if (!items || items.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="empty-state"><i class="fa-solid fa-wrench"></i><h3>No se encontraron activos coincidentes</h3></td></tr>`;
        return;
    }

    // Limit display to first 100 for fast DOM rendering
    const displayItems = items.slice(0, 100);
    tbody.innerHTML = displayItems.map(a => `
        <tr>
            <td style="font-weight: 800; color: var(--dalor-blue); font-family: monospace;">${a.code}</td>
            <td style="font-weight: 700; color: var(--dalor-navy);">${a.name}</td>
            <td><span class="badge badge-blue">${a.category || 'General'}</span></td>
            <td>${a.brand || '-'}</td>
            <td>${a.plate_number || a.serial_number || '-'}</td>
            <td><span class="badge ${a.status === 'operativo' ? 'badge-green' : 'badge-amber'}">${(a.status || 'OPERATIVO').toUpperCase()}</span></td>
            <td>${a.location || 'Almacén Central'}</td>
        </tr>
    `).join('') + (items.length > 100 ? `<tr><td colspan="7" style="text-align: center; padding: 10px; color: #64748b; background: #f8fafc;">Mostrando 100 de ${items.length} activos. Usa el buscador para filtrar.</td></tr>` : '');
}
