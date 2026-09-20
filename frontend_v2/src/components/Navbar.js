
import { store } from '../state/store.js';
import { api } from '../api/client.js';

export function renderNavbar() {
    const user = store.currentUser;
    const bcvRate = store.bcv.rate.toFixed(2);

    return `
    <nav class="dalor-navbar">
        <div class="dalor-brand">
            <i class="fa-solid fa-bolt" style="color: var(--dalor-gold); font-size: 20px;"></i>
            <h1>DALOR SIGO-P <span class="badge-enterprise">ERP v97 Enterprise</span></h1>
        </div>

        <div class="dalor-nav-stats">
            <div class="bcv-ticker" id="bcv-ticker-btn" title="Tasa Oficial Banco Central de Venezuela">
                <i class="fa-solid fa-building-columns"></i>
                <span>BCV:</span>
                <span class="rate-val">${bcvRate} Bs/$</span>
                <i class="fa-solid fa-arrows-rotate" style="font-size: 10px; cursor: pointer;" id="btn-refresh-bcv"></i>
            </div>

            ${user ? `
            <div class="user-badge">
                <div class="user-avatar">${user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}</div>
                <div class="user-info">
                    <div class="user-name">${user.full_name || user.username}</div>
                    <div class="user-role">${user.role_name.replace('_', ' ').toUpperCase()}</div>
                </div>
            </div>

            <button class="btn-logout" id="btn-navbar-logout" title="Cerrar Sesión Segura">
                <i class="fa-solid fa-power-off"></i> Salir
            </button>
            ` : ''}
        </div>
    </nav>
    `;
}

export function bindNavbarEvents() {
    const btnRefresh = document.getElementById('btn-refresh-bcv');
    if (btnRefresh) {
        btnRefresh.addEventListener('click', async () => {
            btnRefresh.classList.add('fa-spin');
            try {
                const data = await api.financial.getBcvRate(true);
                store.setBcv(data);
            } catch(e) {
                console.warn(e);
            } finally {
                setTimeout(() => btnRefresh.classList.remove('fa-spin'), 600);
            }
        });
    }

    const btnLogout = document.getElementById('btn-navbar-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            store.logout();
        });
    }
}
