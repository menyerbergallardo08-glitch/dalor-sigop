/**
 * DALOR SIGO-P | Módulo: CXC_NAV.JS
 * Navegación de Subpestañas Financieras y Helpers de Parseo Numérico
 */

function safeParseFloat(val) {

    if (val === null || val === undefined) return 0;

    if (typeof val === 'number') return isNaN(val) ? 0 : val;

    let s = String(val).trim();

    if (!s) return 0;

    let hasComma = s.includes(',');

    let hasDot = s.includes('.');

    if (hasComma && hasDot) {

        if (s.lastIndexOf(',') > s.lastIndexOf('.')) {

            s = s.replace(/\./g, '').replace(',', '.');

        } else {

            s = s.replace(/,/g, '');

        }

    } else if (hasComma) {

        s = s.replace(',', '.');

    }

    s = s.replace(/[^0-9.-]/g, '');

    let res = parseFloat(s);

    return isNaN(res) ? 0 : res;

}

const authFetch = (url, options = {}) => {

    const token = (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('dalor_token')) ||

                  (typeof localStorage !== 'undefined' && (localStorage.getItem('dalor_token') || localStorage.getItem('token'))) ||

                  (typeof window !== 'undefined' && window.authToken) || '';

    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };

    if (token) headers['Authorization'] = `Bearer ${token}`;

    if (options.body instanceof FormData) {

        delete headers['Content-Type'];

    }

    return window.fetch(url, { ...options, headers });

};

// --- BLOQUE L8039-L8865 ---

// ==============================================================================

// 💰 13. MÓDULO FINANCIERO: SUBTABS (CxC, CxP, TESORERÍA)

// ==============================================================================

function openFinancialSubtab(subtabName) {

    switchView('financial', 'finanzas');

    switchFinancialSubtab(subtabName);

}

function switchFinancialSubtab(subtabName) {

    const user = window.currentUser;

    if (user) {

        let p = {};

        if (typeof user.permissions_json === 'string') {

            try { p = JSON.parse(user.permissions_json); } catch(e) { p = {}; }

        } else if (user.permissions_json && typeof user.permissions_json === 'object') {

            p = user.permissions_json;

        } else if (user.permissions && typeof user.permissions === 'object') {

            p = user.permissions;

        }

        const role = (user.role_name || '').toLowerCase();

        const uname = (user.username || '').toLowerCase();

        const isDirector = uname === 'director' || role.includes('director') || user.is_superuser === true;

        if (!isDirector) {

            const hasGranularFin = p.cxc_view !== undefined || p.cxp_view !== undefined || p.bancos_view !== undefined || p.retiros_view !== undefined;

            const canCxc = p.cxc_view !== undefined ? !!(p.cxc_view || p.cxc_pay) : (hasGranularFin ? false : true);

            const canCxp = p.cxp_view !== undefined ? !!(p.cxp_view || p.cxp_pay) : (hasGranularFin ? false : true);

            const canBancos = p.bancos_view !== undefined ? !!p.bancos_view : (hasGranularFin ? false : true);

            const canPartners = p.retiros_view !== undefined ? !!p.retiros_view : false;

            let validSubtab = 'cxc';

            if (canCxc) validSubtab = 'cxc';

            else if (canCxp) validSubtab = 'cxp';

            else if (canBancos) validSubtab = 'summary';

            else if (canPartners) validSubtab = 'partners';

            const isAllowed = (subtabName === 'cxc' && canCxc) ||

                              (subtabName === 'cxp' && canCxp) ||

                              (subtabName === 'summary' && canBancos) ||

                              (subtabName === 'partners' && canPartners);

            if (!isAllowed) {

                subtabName = validSubtab;

            }

        }

    }

    try { 

        sessionStorage.setItem('dalor_active_subtab_financial', subtabName); 

        localStorage.setItem('dalor_active_subtab_financial', subtabName); 

    } catch(e) {}

    const subtabs = ['cxc', 'cxp', 'summary', 'partners', 'fiscal'];

    subtabs.forEach(tab => {

        const pane = document.getElementById(`subtab-fin-${tab}`);

        const btn = document.getElementById(`tabbtn-fin-${tab}`);

        if (pane) pane.classList.add('hidden');

        if (btn) btn.classList.remove('active');

    });

    const activePane = document.getElementById(`subtab-fin-${subtabName}`);

    const activeBtn = document.getElementById(`tabbtn-fin-${subtabName}`);

    if (activePane) activePane.classList.remove('hidden');

    if (activeBtn) activeBtn.classList.add('active');

    if (subtabName === 'cxc') {

        if (typeof loadReceivablesList === 'function') loadReceivablesList();

        else if (typeof window.loadReceivablesList === 'function') window.loadReceivablesList();

    }

    if (subtabName === 'cxp' && typeof window.loadPayablesList === 'function') window.loadPayablesList();

    if (subtabName === 'summary' && typeof window.loadTreasurySummary === 'function') window.loadTreasurySummary();

    if (subtabName === 'partners' && typeof window.loadPartnersWithdrawalsList === 'function') window.loadPartnersWithdrawalsList();

    if (subtabName === 'fiscal' && typeof window.loadFiscalBooksView === 'function') window.loadFiscalBooksView();

}

// ----------------------------------------------------

// CUENTAS POR COBRAR (CxC)

// ----------------------------------------------------

let allReceivablesList = [];

let cxcCurrentPage = 1;

let cxcPageSize = 10;

function roundFinancial(num) {

    return Math.round((num + Number.EPSILON) * 100) / 100;

}


// PUENTE GLOBAL WINDOW
if (typeof window !== 'undefined') {
    window.safeParseFloat = safeParseFloat;
    window.openFinancialSubtab = openFinancialSubtab;
    window.switchFinancialSubtab = switchFinancialSubtab;
    window.roundFinancial = roundFinancial;
}

export {
    safeParseFloat,
    openFinancialSubtab,
    switchFinancialSubtab,
    roundFinancial
};
