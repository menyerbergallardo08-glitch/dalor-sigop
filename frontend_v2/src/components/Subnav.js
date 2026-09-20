
import { store } from '../state/store.js';

const TABS = [
    { id: 'quotations', label: 'Cotizaciones (APU)', icon: 'fa-file-invoice-dollar' },
    { id: 'clients', label: 'Directorio de Clientes', icon: 'fa-users' },
    { id: 'services', label: 'Catálogo Partidas APU', icon: 'fa-list-check' },
    { id: 'projects', label: 'Proyectos & Obras', icon: 'fa-helmet-safety' },
    { id: 'resources', label: 'Activos & Herramientas', icon: 'fa-truck-pickup' },
    { id: 'dispatch', label: 'Guías de Despacho', icon: 'fa-truck-ramp-box' },
    { id: 'financial', label: 'Finanzas & Tesorería', icon: 'fa-scale-balanced' },
    { id: 'expenses', label: 'Bandeja de Gastos', icon: 'fa-receipt' },
    { id: 'maintenance', label: 'Mantenimiento & Respaldos', icon: 'fa-shield-halved' }
];

export function renderSubnav() {
    const active = store.activeView;

    return `
    <div class="dalor-subnav">
        ${TABS.map(tab => `
            <div class="subnav-tab ${active === tab.id ? 'active' : ''}" data-tab="${tab.id}">
                <i class="fa-solid ${tab.icon}"></i>
                <span>${tab.label}</span>
            </div>
        `).join('')}
    </div>
    `;
}

export function bindSubnavEvents() {
    document.querySelectorAll('.subnav-tab').forEach(el => {
        el.addEventListener('click', () => {
            const tabId = el.dataset.tab;
            if (tabId) {
                store.setView(tabId);
            }
        });
    });
}
