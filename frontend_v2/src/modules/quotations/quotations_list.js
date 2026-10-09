/**
 * DALOR SIGO-P | Módulo de Presupuestos & APU Desacoplado
 */
import { renderPaginationControls, populateSelectDropdowns, openModal, closeModal, loadInitialMasterData } from '../core.js';

var API_BASE = window.API_BASE || (window.location.origin + "/api/v1");
var allClients = window.allClients = window.allClients || [];
var allServices = window.allServices = window.allServices || [];
var allProjects = window.allProjects = window.allProjects || [];
var allCategories = window.allCategories = window.allCategories || [];
var allMaterials = window.allMaterials = window.allMaterials || [];
var EXCHANGE_RATE = window.EXCHANGE_RATE = window.EXCHANGE_RATE || 850.0;
var BCV_DATA = window.BCV_DATA = window.BCV_DATA || { rate: 850.0, source: 'BCV Oficial' };
var currentUser = window.currentUser || null;
var authToken = window.authToken = window.authToken || localStorage.getItem('dalor_token') || null;

const OFFICIAL_DALOR_APU_CATEGORIES = [
    "Fabricación Metalmecánica",
    "Montaje e Instalación en Sitio",
    "Mantenimiento Industrial & Paradas",
    "Soldadura Especializada & Pailería",
    "Mecanizado & Torno",
    "Arenado y Pintura Industrial",
    "Obras Civiles & Eléctricas Asociadas"
];
if (typeof window !== 'undefined') {
    window.OFFICIAL_DALOR_APU_CATEGORIES = OFFICIAL_DALOR_APU_CATEGORIES;
}

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

// --- BLOQUE L4952-L6327 ---
// ----------------------------------------------------

// 6. MÓDULO DE PRESUPUESTOS (LULOWIN STYLE)

// ----------------------------------------------------

let lastQuotationsList = [];
let quotationsCurrentPage = 1;
let quotationsPageSize = 10;
let quoteFilterSearch = "";
let quoteFilterStatus = "";
let quoteFilterDateFrom = "";
let quoteFilterDateTo = "";

function goToQuotationsPage(page) {
    quotationsCurrentPage = page;
    renderQuotationsPaginated();
    const tableEl = document.getElementById("quotationsTableBody");
    if (tableEl) tableEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function changeQuotationsPageSize(size) {
    quotationsPageSize = parseInt(size) || 10;
    quotationsCurrentPage = 1;
    renderQuotationsPaginated();
}

function onQuotationSearchInput(val) {
    quoteFilterSearch = (val || "").trim().toLowerCase();
    quotationsCurrentPage = 1;
    renderQuotationsPaginated();
}

function onQuotationStatusFilterChange(val) {
    quoteFilterStatus = (val || "").trim().toLowerCase();
    quotationsCurrentPage = 1;
    renderQuotationsPaginated();
}

function onQuotationDateFilterChange() {
    quoteFilterDateFrom = document.getElementById("quoteFilterDateFrom")?.value || "";
    quoteFilterDateTo = document.getElementById("quoteFilterDateTo")?.value || "";
    quotationsCurrentPage = 1;
    renderQuotationsPaginated();
}

function clearQuotationFilters() {
    quoteFilterSearch = "";
    quoteFilterStatus = "";
    quoteFilterDateFrom = "";
    quoteFilterDateTo = "";
    const sInp = document.getElementById("quoteSearchInput");
    if (sInp) sInp.value = "";
    const stSel = document.getElementById("quoteStatusFilter");
    if (stSel) stSel.value = "";
    const dfInp = document.getElementById("quoteFilterDateFrom");
    if (dfInp) dfInp.value = "";
    const dtInp = document.getElementById("quoteFilterDateTo");
    if (dtInp) dtInp.value = "";
    quotationsCurrentPage = 1;
    renderQuotationsPaginated();
}

function renderQuotationsPaginated() {
    const tbody = document.getElementById("quotationsTableBody");
    if (!tbody) return;

    let quotes = lastQuotationsList || [];

    // Filtro por texto (búsqueda inteligente por número, cliente o título)
    if (quoteFilterSearch) {
        const q = quoteFilterSearch;
        quotes = quotes.filter(item => 
            (item.quote_number && item.quote_number.toLowerCase().includes(q)) ||
            (item.client && item.client.name && item.client.name.toLowerCase().includes(q)) ||
            (item.project_title && item.project_title.toLowerCase().includes(q))
        );
    }

    // Filtro por estatus
    if (quoteFilterStatus) {
        quotes = quotes.filter(item => (item.status || "").toLowerCase() === quoteFilterStatus);
    }

    // Filtro por fechas
    if (quoteFilterDateFrom) {
        quotes = quotes.filter(item => item.created_at && item.created_at.substring(0, 10) >= quoteFilterDateFrom);
    }
    if (quoteFilterDateTo) {
        quotes = quotes.filter(item => item.created_at && item.created_at.substring(0, 10) <= quoteFilterDateTo);
    }

    if (quotes.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 20px; color: #94a3b8;">No se encontraron cotizaciones con los criterios seleccionados.</td></tr>`;
        const container = document.getElementById("quotationsPaginationContainer");
        if (container) container.innerHTML = "";
        return;
    }

    const paginateFn = typeof window.renderPaginationControls === 'function' 
        ? window.renderPaginationControls 
        : (typeof renderPaginationControls === 'function' ? renderPaginationControls : () => ({ startIndex: 0, endIndex: quotes.length }));

    const { startIndex, endIndex } = paginateFn({
        containerId: "quotationsPaginationContainer",
        totalItems: quotes.length,
        currentPage: quotationsCurrentPage,
        pageSize: quotationsPageSize,
        onPageChange: "goToQuotationsPage",
        onPageSizeChange: "changeQuotationsPageSize",
        itemLabel: "cotización(es)",
        pageSizeOptions: [10, 20, 50, 100]
    });

    const pageItems = quotes.slice(startIndex, endIndex);

    tbody.innerHTML = pageItems.map(q => {
        const clientName = q.client ? q.client.name : 'Cliente General';
        const isApproved = q.status === 'aprobado';
        const subtotal = Number(q.subtotal_usd || 0);
        const tax = Number(q.tax_usd || 0);
        const total = Number(q.total_usd || 0);
        return `
        <tr>
            <td style="font-weight: 800; color: var(--dalor-blue);">${q.quote_number}</td>
            <td style="font-weight: 600;">${clientName}</td>
            <td>${q.project_title}</td>
            <td style="font-weight: 700;">$${subtotal.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td style="color: ${tax === 0 ? '#10b981' : '#64748b'}; font-weight: 700;">
                ${tax === 0 ? 'EXENTO (0%)' : `$${tax.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`}
            </td>
            <td style="font-weight: 800; color: var(--dalor-navy);">$${total.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td>
                <span style="font-size: 10px; padding: 3px 8px; border-radius: 9999px; font-weight: 800; ${isApproved ? 'background: #dcfce7; color: #166534;' : 'background: #f1f5f9; color: #475569;'}">
                    ${(q.status || 'borrador').toUpperCase()}
                </span>
            </td>
            <td style="text-align: center; white-space: nowrap;">
                <button onclick="editQuotation(${q.id})" class="btn-secondary" style="padding: 4px 8px; font-size: 11px; margin-right: 4px; color: #0284c7; font-weight: 700;" title="Re-editar Cotización">
                    <i class="fa-solid fa-pen-to-square"></i> Re-editar
                </button>
                <button onclick="printQuotation(${q.id})" class="btn-secondary" style="padding: 4px 8px; font-size: 11px;" title="Imprimir / Exportar Cotización">
                    <i class="fa-solid fa-print"></i>
                </button>
                ${!isApproved ? `
                    <button onclick="convertQuoteToProject(${q.id})" class="btn-primary" style="padding: 4px 8px; font-size: 11px; margin-left: 4px; background: #059669;" title="Aprobar y Convertir en Proyecto">
                        <i class="fa-solid fa-check"></i> Convertir en Proyecto
                    </button>
                ` : '<span style="font-size: 11px; color: #059669; font-weight: bold; margin-left: 6px;">Obra Activa</span>'}
            </td>
        </tr>`;
    }).join('');
}

async function loadQuotations() {
    const tbody = document.getElementById("quotationsTableBody");
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 20px; color: #94a3b8;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando cotizaciones...</td></tr>`;

    try {
        // Carga fresca paralela de cotizaciones, clientes y servicios
        const [resQuotes, resCli, resSrv] = await Promise.all([
            authFetch(`${API_BASE}/quotations/`),
            authFetch(`${API_BASE}/clients/`),
            authFetch(`${API_BASE}/services/`)
        ]);

        if (resCli.ok) {
            const cData = await resCli.json();
            allClients = Array.isArray(cData) ? cData : [];
        }

        if (resSrv.ok) {
            const sData = await resSrv.json();
            allServices = Array.isArray(sData) ? sData : [];
        }

        try {
            if (typeof window.populateSelectDropdowns === 'function') {
                window.populateSelectDropdowns();
            } else if (typeof populateSelectDropdowns === 'function') {
                populateSelectDropdowns();
            }
        } catch (dropErr) {
            console.warn("Aviso al poblar dropdowns de cotizaciones:", dropErr);
        }

        if (!resQuotes.ok) throw new Error("Error HTTP " + resQuotes.status);
        const quotesData = await resQuotes.json();
        lastQuotationsList = Array.isArray(quotesData) ? quotesData : [];
        quotationsCurrentPage = 1;
        renderQuotationsPaginated();

    } catch (e) {
        console.error("Error al cargar cotizaciones:", e);
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #e11d48; padding: 20px;">Error al cargar cotizaciones: ${e.message || 'Error de conexión'}</td></tr>`;
    }
}




// Exponer al objeto global window para eventos inline y compatibilidad
if (typeof window !== 'undefined') {
    window.goToQuotationsPage = goToQuotationsPage;
    window.changeQuotationsPageSize = changeQuotationsPageSize;
    window.onQuotationSearchInput = onQuotationSearchInput;
    window.onQuotationStatusFilterChange = onQuotationStatusFilterChange;
    window.onQuotationDateFilterChange = onQuotationDateFilterChange;
    window.clearQuotationFilters = clearQuotationFilters;
    window.renderQuotationsPaginated = renderQuotationsPaginated;
    window.loadQuotations = loadQuotations;
}
