/**
 * DALOR SIGO-P | Módulo: CORE_UI.JS
 * Desacoplado de core.js
 * Helpers numéricos, authFetch, paginación y modales
 */

/**
 * DALOR SIGO-P | Módulo: CORE_UI.JS
 * Desacoplado de core.js
 * Helpers numéricos, authFetch, navegación de vistas, menú responsive, modales y paginación
 */

// --- BLOQUE L1-L34 ---
// Global Helper: roundNumber
function roundNumber(num, decimals = 2) {
    const factor = Math.pow(10, decimals);
    return Math.round((Number(num) || 0) * factor) / factor;
}
window.roundNumber = roundNumber;

// --------------------------------------------------------------------------
// DALOR PARSER NUMERICO UNIVERSAL PARA MULTIMONEDA (USD / VES / EUR)
// --------------------------------------------------------------------------
function parseLocalizedNumber(val) {
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    if (!val) return 0;
    let s = String(val).trim().replace(/[$Bs€\s]/g, '');
    if (s.includes(',') && s.includes('.')) {
        if (s.indexOf('.') < s.indexOf(',')) {
            s = s.replace(/\./g, '').replace(',', '.');
        } else {
            s = s.replace(/,/g, '');
        }
    } else if (s.includes(',')) {
        s = s.replace(',', '.');
    }
    const num = parseFloat(s);
    return isNaN(num) ? 0 : num;
}
window.parseLocalizedNumber = parseLocalizedNumber;
window.parseDecimal = parseLocalizedNumber;

window.API_BASE = window.location.origin + "/api/v1";
var API_BASE = window.API_BASE;

function populateSelect(selectId, items, mapFn) {
    const el = document.getElementById(selectId);

    if (!el) return;

    if (!Array.isArray(items)) {
        el.innerHTML = '';

        return;

    }

    el.innerHTML = items.map(mapFn).join('');

}

function sortCategoriesNumerically(cats) {
    if (!Array.isArray(cats)) return [];

    return [...cats].sort((a, b) => {
        const partsA = String(a.code || "").split('.').map(n => parseInt(n, 10) || 0);

        const partsB = String(b.code || "").split('.').map(n => parseInt(n, 10) || 0);

        for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
            const valA = partsA[i] !== undefined ? partsA[i] : -1;

            const valB = partsB[i] !== undefined ? partsB[i] : -1;

            if (valA !== valB) return valA - valB;

        }

        return String(a.name || "").localeCompare(String(b.name || ""));

    });

}

let currentUser = window.currentUser || (() => {
    try { return JSON.parse(localStorage.getItem('dalor_user') || sessionStorage.getItem('dalor_user') || 'null'); } catch(e) { return null; }
})();

let authToken = window.authToken || localStorage.getItem('dalor_token') || sessionStorage.getItem('dalor_token') || null;
/** authFetch - inyecta token en cada request usando window.fetch nativo */
function authFetch(url, options = {}) {
    var _t = sessionStorage.getItem('dalor_token') || localStorage.getItem('dalor_token') || window.authToken || '';
    var _h = Object.assign({}, options.headers || {});
    if (_t) _h['Authorization'] = 'Bearer ' + _t;
    if (options.body && !(options.body instanceof FormData) && !_h['Content-Type']) {
        _h['Content-Type'] = 'application/json';
    }
    if (options.body instanceof FormData) {
        delete _h['Content-Type'];
    }
    return window.fetch(url, Object.assign({}, options, { headers: _h }));
}
window.authFetch = authFetch;

function renderPaginationControls({
    containerId,
    totalItems = 0,
    currentPage = 1,
    pageSize = 10,
    onPageChange = '',
    onPageSizeChange = '',
    itemLabel = 'registro(s)',
    pageSizeOptions = [10, 15, 25, 50, 100],
    allowAll = true
}) {
    const container = document.getElementById(containerId);
    if (!container) return { startIndex: 0, endIndex: 0, totalPages: 1, currentPage: 1 };

    const effectivePageSize = (pageSize === 1000 || pageSize === 9999) ? (totalItems || 1) : (pageSize || 15);
    const totalPages = Math.max(1, Math.ceil(totalItems / effectivePageSize));
    let cur = Math.max(1, Math.min(currentPage, totalPages));

    const startIndex = (cur - 1) * effectivePageSize;
    const endIndex = Math.min(startIndex + effectivePageSize, totalItems);

    if (totalItems <= Math.min(...pageSizeOptions) && totalPages <= 1) {
        container.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 11.5px; color: #64748b; margin-top: 8px;">
                <span>Mostrando <b>${totalItems}</b> ${itemLabel}</span>
                ${onPageSizeChange ? `
                <div style="display: flex; align-items: center; gap: 6px;">
                    <span>Mostrar:</span>
                    <select onchange="${onPageSizeChange}(this.value)" style="padding: 2px 6px; font-size: 11px; border: 1px solid #cbd5e1; border-radius: 4px; background: white; font-weight: 700; cursor: pointer;">
                        ${pageSizeOptions.map(sz => `<option value="${sz}" ${pageSize === sz ? 'selected' : ''}>${sz}</option>`).join('')}
                        ${allowAll ? `<option value="1000" ${pageSize === 1000 ? 'selected' : ''}>Todos</option>` : ''}
                    </select>
                </div>` : ''}
            </div>
        `;
        return { startIndex, endIndex, totalPages, currentPage: cur };
    }

    let pageButtons = '';
    let startP = Math.max(1, cur - 2);
    let endP = Math.min(totalPages, cur + 2);

    if (startP > 1) {
        pageButtons += `<button type="button" onclick="${onPageChange}(1)" class="btn-secondary" style="padding: 4px 9px; font-size: 11px; border-radius: 5px;">1</button>`;
        if (startP > 2) pageButtons += `<span style="padding: 0 4px; color: #94a3b8;">...</span>`;
    }

    for (let i = startP; i <= endP; i++) {
        if (i === cur) {
            pageButtons += `<button type="button" class="btn-primary" style="padding: 4px 10px; font-size: 11px; font-weight: 800; border-radius: 5px; background: var(--dalor-navy, #0f172a); color: white;">${i}</button>`;
        } else {
            pageButtons += `<button type="button" onclick="${onPageChange}(${i})" class="btn-secondary" style="padding: 4px 9px; font-size: 11px; border-radius: 5px;">${i}</button>`;
        }
    }

    if (endP < totalPages) {
        if (endP < totalPages - 1) pageButtons += `<span style="padding: 0 4px; color: #94a3b8;">...</span>`;
        pageButtons += `<button type="button" onclick="${onPageChange}(${totalPages})" class="btn-secondary" style="padding: 4px 9px; font-size: 11px; border-radius: 5px;">${totalPages}</button>`;
    }

    container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 12px; color: #475569; flex-wrap: wrap; gap: 10px; box-shadow: 0 1px 2px rgba(0,0,0,0.04); margin-top: 8px;">
            <div style="font-weight: 600;">
                Mostrando <b style="color: var(--dalor-navy, #0f172a);">${totalItems === 0 ? 0 : startIndex + 1} - ${endIndex}</b> de <b style="color: var(--dalor-navy, #0f172a);">${totalItems}</b> ${itemLabel}
            </div>

            <div style="display: flex; align-items: center; gap: 5px;">
                <button type="button" onclick="${onPageChange}(1)" class="btn-secondary" style="padding: 4px 8px; font-size: 11px; border-radius: 5px;" ${cur === 1 ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : ''} title="Primera página">
                    <i class="fa-solid fa-angles-left"></i>
                </button>
                <button type="button" onclick="${onPageChange}(${cur - 1})" class="btn-secondary" style="padding: 4px 9px; font-size: 11px; border-radius: 5px;" ${cur === 1 ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : ''} title="Página anterior">
                    <i class="fa-solid fa-chevron-left"></i> Anterior
                </button>

                <div style="display: flex; align-items: center; gap: 4px;">
                    ${pageButtons}
                </div>

                <button type="button" onclick="${onPageChange}(${cur + 1})" class="btn-secondary" style="padding: 4px 9px; font-size: 11px; border-radius: 5px;" ${cur === totalPages ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : ''} title="Página siguiente">
                    Siguiente <i class="fa-solid fa-chevron-right"></i>
                </button>
                <button type="button" onclick="${onPageChange}(${totalPages})" class="btn-secondary" style="padding: 4px 8px; font-size: 11px; border-radius: 5px;" ${cur === totalPages ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : ''} title="Última página">
                    <i class="fa-solid fa-angles-right"></i>
                </button>
            </div>

            ${onPageSizeChange ? `
            <div style="display: flex; align-items: center; gap: 6px;">
                <span style="font-size: 11.5px; color: #64748b;">Por página:</span>
                <select onchange="${onPageSizeChange}(this.value)" style="padding: 3px 8px; font-size: 11.5px; border: 1px solid #cbd5e1; border-radius: 5px; background: white; font-weight: 700; color: var(--dalor-navy, #0f172a); cursor: pointer;">
                    ${pageSizeOptions.map(sz => `<option value="${sz}" ${pageSize === sz ? 'selected' : ''}>${sz}</option>`).join('')}
                    ${allowAll ? `<option value="1000" ${pageSize === 1000 ? 'selected' : ''}>Ver todos</option>` : ''}
                </select>
            </div>` : ''}
        </div>
    `;

    return { startIndex, endIndex, totalPages, currentPage: cur };
}

window.renderPaginationControls = renderPaginationControls;

// ----------------------------------------------------
// UTILIDADES MODALES
// ----------------------------------------------------
function openModal(modalId) {
    if (modalId === 'modalNewQuotation') modalId = 'modalQuotation';
    const el = document.getElementById(modalId);

    if (el) {
        el.classList.remove("hidden");
        el.style.setProperty("display", "flex", "important");
    }

    const floatingBtn = document.getElementById("btnFloatingLogout");
    if (floatingBtn) floatingBtn.style.setProperty("display", "none", "important");
}

function closeModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) {
        el.classList.add("hidden");
        el.style.setProperty("display", "none", "important");
    }

    const openModals = document.querySelectorAll(".modal-overlay:not(.hidden):not([style*='display: none']), .modal:not(.hidden):not([style*='display: none'])");
    if (openModals.length === 0) {
        const floatingBtn = document.getElementById("btnFloatingLogout");
        if (floatingBtn) floatingBtn.style.removeProperty("display");
    }
}

if (typeof window !== 'undefined') {
    window.openModal = openModal;
    window.closeModal = closeModal;
    window.roundNumber = roundNumber;
    window.parseLocalizedNumber = parseLocalizedNumber;
    window.populateSelect = populateSelect;
    window.sortCategoriesNumerically = sortCategoriesNumerically;
    window.authFetch = authFetch;
    window.renderPaginationControls = renderPaginationControls;
}

export {
    roundNumber,
    parseLocalizedNumber,
    populateSelect,
    sortCategoriesNumerically,
    authFetch,
    renderPaginationControls,
    openModal,
    closeModal
};
