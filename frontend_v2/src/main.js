
import './styles/main.css';
import { store } from './state/store.js';
import { api } from './api/client.js';

import { renderNavbar, bindNavbarEvents } from './components/Navbar.js';
import { renderSubnav, bindSubnavEvents } from './components/Subnav.js';

import { renderLoginView, bindLoginEvents } from './views/LoginView.js';
import { renderQuotationsView, bindQuotationsEvents } from './views/QuotationsView.js';
import { renderClientsView, bindClientsEvents } from './views/ClientsView.js';
import { renderServicesView, bindServicesEvents } from './views/ServicesView.js';
import { renderProjectsView, bindProjectsEvents } from './views/ProjectsView.js';
import { renderResourcesView, bindResourcesEvents } from './views/ResourcesView.js';
import { renderDispatchView, bindDispatchEvents } from './views/DispatchView.js';
import { renderFinancialView, bindFinancialEvents } from './views/FinancialView.js';
import { renderExpensesView, bindExpensesEvents } from './views/ExpensesView.js';
import { renderMaintenanceView, bindMaintenanceEvents } from './views/MaintenanceView.js';

const VIEW_MAP = {
    'login': { render: renderLoginView, bind: bindLoginEvents },
    'quotations': { render: renderQuotationsView, bind: bindQuotationsEvents },
    'clients': { render: renderClientsView, bind: bindClientsEvents },
    'services': { render: renderServicesView, bind: bindServicesEvents },
    'projects': { render: renderProjectsView, bind: bindProjectsEvents },
    'resources': { render: renderResourcesView, bind: bindResourcesEvents },
    'dispatch': { render: renderDispatchView, bind: bindDispatchEvents },
    'financial': { render: renderFinancialView, bind: bindFinancialEvents },
    'expenses': { render: renderExpensesView, bind: bindExpensesEvents },
    'maintenance': { render: renderMaintenanceView, bind: bindMaintenanceEvents }
};

function renderApp() {
    const appEl = document.getElementById('app');
    if (!appEl) return;

    if (!store.token) {
        appEl.innerHTML = renderLoginView();
        bindLoginEvents();
        return;
    }

    const currentViewKey = store.activeView || 'quotations';
    const viewHandler = VIEW_MAP[currentViewKey] || VIEW_MAP['quotations'];

    appEl.innerHTML = `
        ${renderNavbar()}
        ${renderSubnav()}
        <main id="view-container">
            ${viewHandler.render()}
        </main>
    `;

    bindNavbarEvents();
    bindSubnavEvents();
    if (viewHandler.bind) {
        viewHandler.bind();
    }
}

// Global hook for automated tests and legacy compatibility
window.dalorStore = store;
window.dalorApi = api;

// Initial Bootstrap
document.addEventListener('DOMContentLoaded', () => {
    store.subscribe(() => renderApp());
    renderApp();

    // Fetch live BCV in background
    api.financial.getBcvRate(false)
        .then(data => store.setBcv(data))
        .catch(err => console.warn("BCV Auto-fetch:", err));
});
