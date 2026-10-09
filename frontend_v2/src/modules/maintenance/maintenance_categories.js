/**
 * DALOR SIGO-P | Módulo de Mantenimiento Desacoplado
 */
var API_BASE = window.API_BASE || (window.location.origin + "/api/v1");

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

// --- BLOQUE L7801-L8012 ---
// ----------------------------------------------------

// 11. DASHBOARD COMPARATIVO

// ----------------------------------------------------

let allComparisonProjectsCache = [];
let currentFilteredComparison = [];
let currentComparisonPage = 1;
let comparisonPageSize = 10;
let comparisonSearchTimer = null;

function debouncedFilterComparisonDashboard() {
    clearTimeout(comparisonSearchTimer);
    comparisonSearchTimer = setTimeout(() => {
        filterComparisonDashboard();
    }, 250);
}
window.debouncedFilterComparisonDashboard = debouncedFilterComparisonDashboard;

function filterComparisonDashboard() {
    const search = (document.getElementById("dashboard_filter_search")?.value || "").toLowerCase().trim();
    const health = document.getElementById("dashboard_filter_health")?.value;

    currentFilteredComparison = allComparisonProjectsCache.filter(p => {
        if (health) {
            const h = (p.health_status || '').toUpperCase();
            if (health.startsWith("VERDE") && !h.includes("VERDE")) return false;
            if (health.startsWith("AMARILLO") && !h.includes("AMARILLO")) return false;
            if (health.startsWith("ROJO") && !h.includes("ROJO")) return false;
        }
        if (search) {
            const matchText = `${p.project_code || ''} ${p.project_name || ''} ${p.client_name || ''}`.toLowerCase();
            if (!matchText.includes(search)) return false;
        }
        return true;
    });

    currentComparisonPage = 1;
    renderComparisonTablePaginated(currentFilteredComparison);
}
window.filterComparisonDashboard = filterComparisonDashboard;

function renderComparisonTablePaginated(list) {
    const tbody = document.getElementById("comparisonTableBody");
    if (!tbody) return;

    const countBadge = document.getElementById("dashboardProjectCountBadge");
    if (countBadge) countBadge.innerText = `${list.length} obras listadas`;

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 24px; color: #94a3b8;">No se encontraron obras que coincidan con la búsqueda o filtro seleccionado.</td></tr>`;
        const pagContainer = document.getElementById("comparisonDashboardPagination");
        if (pagContainer) pagContainer.innerHTML = "";
        return;
    }

    const paginateFn = typeof window.renderPaginationControls === 'function' 
        ? window.renderPaginationControls 
        : (typeof renderPaginationControls === 'function' ? renderPaginationControls : null);

    let pageItems = list;
    if (paginateFn) {
        const { startIndex, endIndex } = paginateFn({
            containerId: "comparisonDashboardPagination",
            totalItems: list.length,
            currentPage: currentComparisonPage,
            pageSize: comparisonPageSize,
            onPageChange: "goToComparisonPage",
            onPageSizeChange: "changeComparisonPageSize",
            itemLabel: "obra(s) analizada(s)",
            pageSizeOptions: [5, 10, 20, 50],
            allowAll: true
        });
        pageItems = list.slice(startIndex, endIndex);
    } else {
        const totalPages = Math.ceil(list.length / comparisonPageSize) || 1;
        if (currentComparisonPage > totalPages) currentComparisonPage = totalPages;
        if (currentComparisonPage < 1) currentComparisonPage = 1;
        const startIdx = (currentComparisonPage - 1) * comparisonPageSize;
        const endIdx = startIdx + comparisonPageSize;
        pageItems = list.slice(startIdx, endIdx);
    }

    tbody.innerHTML = pageItems.map(p => {
        let badgeBg = "#dcfce7";
        let badgeColor = "#166534";
        if (p.health_status === "ROJO_SOBRECOSTO") {
            badgeBg = "#fee2e2";
            badgeColor = "#991b1b";
        } else if (p.health_status === "AMARILLO_ALERTA") {
            badgeBg = "#fef3c7";
            badgeColor = "#92400e";
        }

        return `
        <tr>
            <td style="font-weight: 800; color: var(--dalor-blue); font-size: 11px;">${p.project_code}</td>
            <td style="font-weight: 700; font-size: 11px;">${p.project_name}</td>
            <td style="font-size: 11px; color: #475569;">${p.client_name}</td>
            <td style="font-weight: 800; font-size: 11px;">$${(p.contract_amount_usd || 0).toLocaleString()}</td>
            <td style="font-weight: 800; font-size: 11px; color: #e11d48;">$${(p.actual_spent_usd || 0).toLocaleString()}</td>
            <td style="font-weight: 800; font-size: 11px; color: #059669;">$${(p.gross_margin_usd || 0).toLocaleString()}</td>
            <td style="font-weight: 800; font-size: 11px; color: #059669;">${p.gross_margin_percent}%</td>
            <td style="font-weight: 800; font-size: 11px; color: var(--dalor-navy);">${p.cpi_index}</td>
            <td style="text-align: center;">
                <span style="font-size: 9.5px; padding: 2px 8px; border-radius: 9999px; font-weight: 800; background: ${badgeBg}; color: ${badgeColor};">
                    ${(p.health_status || '').replace('_', ' ')}
                </span>
            </td>
        </tr>`;
    }).join('');
}

function goToComparisonPage(page) {
    currentComparisonPage = page;
    renderComparisonTablePaginated(currentFilteredComparison);
}
window.goToComparisonPage = goToComparisonPage;

function changeComparisonPageSize(size) {
    comparisonPageSize = parseInt(size) || 10;
    currentComparisonPage = 1;
    renderComparisonTablePaginated(currentFilteredComparison);
}
window.changeComparisonPageSize = changeComparisonPageSize;

async function loadComparisonDashboard() {
    try {
        const res = await authFetch(`${API_BASE}/reports/comparison-dashboard`);
        const data = await res.json();

        // KPIs Globales
        document.getElementById("dashboardKPIsContainer").innerHTML = `
            <div class="card" style="text-align: center; margin-bottom: 0;">
                <span style="font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 700;">Proyectos Activos</span>
                <p style="font-size: 20px; font-weight: 900; color: var(--dalor-navy);">${data.global_summary.active_projects_count}</p>
            </div>
            <div class="card" style="text-align: center; margin-bottom: 0;">
                <span style="font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 700;">Contratos Totales ($)</span>
                <p style="font-size: 20px; font-weight: 900; color: var(--dalor-navy);">$${data.global_summary.total_contracted_usd.toLocaleString()}</p>
            </div>
            <div class="card" style="text-align: center; margin-bottom: 0;">
                <span style="font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 700;">Gasto Real Ejecutado ($)</span>
                <p style="font-size: 20px; font-weight: 900; color: #e11d48;">$${data.global_summary.total_spent_usd.toLocaleString()}</p>
            </div>
            <div class="card" style="text-align: center; margin-bottom: 0;">
                <span style="font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 700;">Margen Neto Consolidado</span>
                <p style="font-size: 20px; font-weight: 900; color: #059669;">${data.global_summary.global_margin_percent}% ($${data.global_summary.net_margin_usd.toLocaleString()})</p>
            </div>
        `;

        allComparisonProjectsCache = data.projects_comparison || [];
        currentFilteredComparison = [...allComparisonProjectsCache];
        currentComparisonPage = 1;
        renderComparisonTablePaginated(currentFilteredComparison);
    } catch (e) {
        console.error("Error al cargar dashboard comparativo:", e);
    }
}



// ----------------------------------------------------

// 12. ÁRBOL JERÁRQUICO DE PARTIDAS

// ----------------------------------------------------

async function loadCategoriesTree() {

    const container = document.getElementById("categoriesTreeContainer");

    container.innerHTML = `<div style="grid-column: span 2; text-align: center; padding: 20px; color: #94a3b8;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando árbol de partidas...</div>`;



    try {

        const res = await authFetch(`${API_BASE}/expenses/categories-tree`);

        if (!res.ok) throw new Error("Error en servidor");

        const tree = await res.json();



        container.innerHTML = tree.map(parent => `
            <div class="card" style="margin-bottom: 0; border-top: 3px solid var(--dalor-blue); cursor: pointer; transition: transform 0.15s, box-shadow 0.15s;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 16px rgba(0,0,0,0.08)';" onmouseout="this.style.transform='none'; this.style.boxShadow='none';" onclick="openCategoryHistoryModal(${parent.id}, '${(parent.code || '').replace(/'/g, "\\'")}', '${(parent.name || '').replace(/'/g, "\\'")}', ${parent.total_spent_usd}, false)">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; margin-bottom: 8px;">
                    <div>
                        <span style="font-size: 11px; font-weight: 800; background: var(--dalor-navy); color: white; padding: 2px 6px; border-radius: 4px;">${parent.code}</span>
                        <h4 style="font-size: 13px; font-weight: 800; color: var(--dalor-navy); display: inline-block; margin-left: 6px;">${parent.name}</h4>
                    </div>
                    <div style="text-align: right;">
                        <span style="font-size: 10px; color: #64748b; display: block;">Total Consolidado Partida</span>
                        <span style="font-weight: 800; color: #e11d48; font-size: 13px;">$${parent.total_spent_usd.toFixed(2)}</span>
                    </div>
                </div>

                <div style="display: flex; justify-content: flex-end; margin-bottom: 6px;">
                    <span style="font-size: 10px; color: var(--dalor-blue); font-weight: 700; display: inline-flex; align-items: center; gap: 4px;">
                        <i class="fa-solid fa-list-check"></i> Ver Bitácora Consolidada <i class="fa-solid fa-chevron-right" style="font-size: 8px;"></i>
                    </span>
                </div>

                <div style="display: flex; flex-direction: column; gap: 4px;">
                    ${parent.subcategories && parent.subcategories.length > 0 ? parent.subcategories.map(sub => `
                        <div style="cursor: pointer; display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #475569; padding: 6px 10px; background: ${sub.is_direct ? '#fffbeb' : '#f8fafc'}; border-radius: 4px; border: 1px solid ${sub.is_direct ? '#fef3c7' : '#f1f5f9'}; transition: background 0.15s;" onmouseover="this.style.background='#e0f2fe'" onmouseout="this.style.background='${sub.is_direct ? '#fffbeb' : '#f8fafc'}'" onclick="openCategoryHistoryModal(${sub.id}, '${(sub.code || '').replace(/'/g, "\\'")}', '${(sub.name || '').replace(/'/g, "\\'")}', ${sub.spent_usd}, ${sub.is_direct ? 'true' : 'false'}); event.stopPropagation();">
                            <span><b>${sub.code}</b> ${sub.name}</span>
                            <span style="display: flex; align-items: center; gap: 8px;">
                                <span style="font-weight: 700; color: ${sub.is_direct ? '#b45309' : 'var(--dalor-navy)'};">$${sub.spent_usd.toFixed(2)}</span>
                                <i class="fa-solid fa-chevron-right" style="font-size: 9px; color: #94a3b8;"></i>
                            </span>
                        </div>
                    `).join('') : `
                        <div style="font-size: 11px; color: #94a3b8; font-style: italic; padding: 4px 6px;">
                            Partida directa sin sub-cuentas &bull; Ppto ref: $${(parent.monthly_budget_usd || 0).toLocaleString()}
                        </div>
                    `}
                </div>
            </div>
        `).join('');
    } catch (e) {
        container.innerHTML = `<div style="grid-column: span 2; text-align: center; color: #e11d48;">Error al cargar árbol.</div>`;
    }
}
window.loadCategoriesTree = loadCategoriesTree;

function openCreateCategoryModal() {
    const codeInp = document.getElementById("cat_code_input");
    const nameInp = document.getElementById("cat_name_input");
    if (codeInp) codeInp.value = "";
    if (nameInp) nameInp.value = "";
    if (typeof openModal === "function") openModal("modalCreateCategory");
}
window.openCreateCategoryModal = openCreateCategoryModal;

async function submitCreateCategory(e) {
    if (e && e.preventDefault) e.preventDefault();
    const code = (document.getElementById("cat_code_input")?.value || "").trim();
    const name = (document.getElementById("cat_name_input")?.value || "").trim();
    const monthly_budget_usd = parseFloat(document.getElementById("cat_budget_input")?.value) || 0;
    const group_type = "general";

    if (!code || !name) {
        alert("Por favor ingrese el código y el nombre de la partida.");
        return;
    }

    try {
        const res = await authFetch(`${API_BASE}/expenses/categories`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code, name, group_type, monthly_budget_usd })
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({ detail: "Error al crear partida" }));
            throw new Error(err.detail || "Error al crear partida");
        }
        alert(`✅ Partida [${code}] ${name} creada exitosamente.`);
        if (typeof closeModal === "function") closeModal("modalCreateCategory");
        await loadCategoriesTree();
        if (typeof loadExpenseConcepts === "function") loadExpenseConcepts();
    } catch(err) {
        alert("❌ Error: " + err.message);
    }
}
window.submitCreateCategory = submitCreateCategory;

async function toggleCategoryActive(catId, currentActive, event) {
    if (event) event.stopPropagation();
    const action = currentActive ? "inactivar" : "activar";
    if (!confirm(`¿Deseas ${action} esta partida presupuestaria?`)) return;

    try {
        const res = await authFetch(`${API_BASE}/expenses/categories/${catId}/toggle-active`, {
            method: "POST"
        });
        if (!res.ok) throw new Error("No se pudo cambiar el estado de la partida.");
        alert(`✅ Partida actualizada exitosamente.`);
        await loadCategoriesTree();
    } catch(err) {
        alert("❌ Error: " + err.message);
    }
}
window.toggleCategoryActive = toggleCategoryActive;

// ----------------------------------------------------
// BITÁCORA DE PARTIDA CONTABLE (HISTORIAL EN MODAL)
// ----------------------------------------------------
let allCatHistoryItems = [];
let filteredCatHistoryItems = [];
let currentCatHistoryPage = 1;
let catHistoryPageSize = 10;
let catHistoryDebounceTimer = null;

async function openCategoryHistoryModal(catId, catCode, catName, totalSpent, isDirect = false) {
    const titleEl = document.getElementById("catHistTitle");
    const subtitleEl = document.getElementById("catHistSubtitle");
    const totalSpentEl = document.getElementById("catHistTotalSpent");
    const totalBsEl = document.getElementById("catHistTotalBs");
    const countBadge = document.getElementById("catHistCountBadge");
    const tbody = document.getElementById("catHistTableBody");

    if (titleEl) titleEl.innerText = `Bitácora: [${catCode}] ${catName}`;
    if (subtitleEl) subtitleEl.innerText = isDirect ? `Comprobantes imputados directamente a la partida raíz` : `Histórico de comprobantes y egresos imputados a esta partida contable`;
    if (totalSpentEl) totalSpentEl.innerText = `$${(totalSpent || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

    const bcvRate = window.EXCHANGE_RATE || (window.BCV_DATA ? window.BCV_DATA.rate : 850.0) || 850.0;
    if (totalBsEl) totalBsEl.innerText = `${((totalSpent || 0) * bcvRate).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} Bs`;

    const searchInput = document.getElementById("catHistSearchInput");
    if (searchInput) searchInput.value = "";
    const statusFilter = document.getElementById("catHistStatusFilter");
    if (statusFilter) statusFilter.value = "";

    if (tbody) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 24px; color: #64748b;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando comprobantes de la partida [${catCode}]...</td></tr>`;
    }

    if (typeof window.openModal === 'function') {
        window.openModal("modalCategoryHistory");
    } else if (typeof openModal === 'function') {
        openModal("modalCategoryHistory");
    } else {
        document.getElementById("modalCategoryHistory")?.classList.remove("hidden");
    }

    try {
        const directParam = isDirect ? '&direct_only=true' : '';
        const res = await authFetch(`${API_BASE}/expenses/?category_id=${catId}&status=all${directParam}`);
        if (!res.ok) throw new Error("Error en servidor al consultar gastos");
        const items = await res.json();
        allCatHistoryItems = Array.isArray(items) ? items : [];

        // Calcular totales reales de la lista
        const sumUsd = allCatHistoryItems.reduce((acc, x) => acc + (x.amount_usd || 0), 0);
        const sumBs = allCatHistoryItems.reduce((acc, x) => acc + (x.amount_bs || (x.amount_usd || 0) * bcvRate), 0);

        if (totalSpentEl) totalSpentEl.innerText = `$${sumUsd.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        if (totalBsEl) totalBsEl.innerText = `${sumBs.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} Bs`;
        if (countBadge) countBadge.innerText = `${allCatHistoryItems.length} registros`;

        filterCategoryHistory();
    } catch (err) {
        console.error("Error al cargar historial de partida:", err);
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #e11d48; padding: 20px;">No se pudo cargar la bitácora: ${err.message}</td></tr>`;
        }
    }
}
window.openCategoryHistoryModal = openCategoryHistoryModal;

function debouncedFilterCategoryHistory() {
    clearTimeout(catHistoryDebounceTimer);
    catHistoryDebounceTimer = setTimeout(() => {
        filterCategoryHistory();
    }, 250);
}
window.debouncedFilterCategoryHistory = debouncedFilterCategoryHistory;

function filterCategoryHistory() {
    const search = (document.getElementById("catHistSearchInput")?.value || "").toLowerCase().trim();
    const status = document.getElementById("catHistStatusFilter")?.value || "";

    filteredCatHistoryItems = allCatHistoryItems.filter(exp => {
        if (status) {
            const expStat = (exp.status || '').toLowerCase();
            if (status === "aprobado" && !expStat.includes("aprobado")) return false;
            if (status === "pendiente" && !expStat.includes("pendiente")) return false;
        }
        if (search) {
            const vendor = (exp.supplier_vendor || exp.merchant || '').toLowerCase();
            const proj = (exp.project_name || (exp.project ? exp.project.name : '') || '').toLowerCase();
            const projCode = (exp.project_code || (exp.project ? exp.project.code : '') || '').toLowerCase();
            const desc = (exp.description || '').toLowerCase();
            const reporter = (exp.reported_by_name || (exp.reported_by ? exp.reported_by.full_name : '') || '').toLowerCase();
            const combined = `${vendor} ${proj} ${projCode} ${desc} ${reporter}`;
            if (!combined.includes(search)) return false;
        }
        return true;
    });

    currentCatHistoryPage = 1;
    renderCategoryHistoryTable();
}
window.filterCategoryHistory = filterCategoryHistory;

function renderCategoryHistoryTable() {
    const tbody = document.getElementById("catHistTableBody");
    if (!tbody) return;

    const countBadge = document.getElementById("catHistCountBadge");
    if (countBadge) countBadge.innerText = `${filteredCatHistoryItems.length} registros listados`;

    if (filteredCatHistoryItems.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 24px; color: #94a3b8;"><i class="fa-solid fa-folder-open" style="font-size: 24px; display: block; margin-bottom: 8px;"></i> No se encontraron comprobantes o gastos en esta partida.</td></tr>`;
        const pagContainer = document.getElementById("catHistPagination");
        if (pagContainer) pagContainer.innerHTML = "";
        return;
    }

    const paginateFn = typeof window.renderPaginationControls === 'function' 
        ? window.renderPaginationControls 
        : (typeof renderPaginationControls === 'function' ? renderPaginationControls : null);

    let pageItems = filteredCatHistoryItems;
    if (paginateFn) {
        const { startIndex, endIndex } = paginateFn({
            containerId: "catHistPagination",
            totalItems: filteredCatHistoryItems.length,
            currentPage: currentCatHistoryPage,
            pageSize: catHistoryPageSize,
            onPageChange: "goToCategoryHistoryPage",
            onPageSizeChange: "changeCategoryHistoryPageSize",
            itemLabel: "gasto(s)",
            pageSizeOptions: [5, 10, 20, 50],
            allowAll: true
        });
        pageItems = filteredCatHistoryItems.slice(startIndex, endIndex);
    }

    const bcvRate = window.EXCHANGE_RATE || (window.BCV_DATA ? window.BCV_DATA.rate : 850.0) || 850.0;

    tbody.innerHTML = pageItems.map(exp => {
        const rawDate = exp.expense_date || exp.date || exp.created_at || '';
        const dateStr = rawDate ? String(rawDate).split('T')[0] : 'S/F';
        const vendor = exp.supplier_vendor || exp.merchant || 'Comercio General';
        
        let projDisplay = "Sede Central (Sin Proyecto)";
        if (exp.project_name && exp.project_name !== "Sin Proyecto") {
            projDisplay = exp.project_code ? `[${exp.project_code}] ${exp.project_name}` : exp.project_name;
        } else if (exp.project) {
            projDisplay = `[${exp.project.code}] ${exp.project.name}`;
        }

        let typeLabel = "Gasto Operativo";
        let typeBadgeColor = "#0284c7";
        let typeBadgeBg = "#e0f2fe";
        if (exp.expense_type === "costo_obra") {
            typeLabel = "Costo de Obra";
            typeBadgeColor = "#059669";
            typeBadgeBg = "#dcfce7";
        } else if (exp.expense_type === "retiro_socio") {
            typeLabel = "Retiro de Socio";
            typeBadgeColor = "#b45309";
            typeBadgeBg = "#fef3c7";
        }

        const amtUsd = Number(exp.amount_usd || 0);
        const amtBs = Number(exp.amount_bs || (amtUsd * bcvRate));

        const isApproved = (exp.status || '').toLowerCase() === "aprobado";
        const statusBadge = isApproved 
            ? `<span style="font-size: 10px; font-weight: 800; background: #dcfce7; color: #166534; padding: 2px 6px; border-radius: 4px;">APROBADO</span>`
            : `<span style="font-size: 10px; font-weight: 800; background: #fef3c7; color: #92400e; padding: 2px 6px; border-radius: 4px;">PENDIENTE</span>`;

        const receiptPath = exp.receipt_image_path || exp.receipt_url || '';
        const receiptBtn = receiptPath 
            ? `<button type="button" onclick="viewReceiptImage('${receiptPath.replace(/'/g, "\\'")}')" class="btn-secondary" style="font-size: 10px; padding: 3px 8px; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px; color: var(--dalor-blue);"><i class="fa-solid fa-receipt"></i> Ver</button>`
            : `<span style="color: #94a3b8; font-size: 10px;">—</span>`;

        return `
            <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 7px 8px; color: #475569; white-space: nowrap;">${dateStr}</td>
                <td style="padding: 7px 8px; font-weight: 700; color: var(--dalor-navy);">${vendor}</td>
                <td style="padding: 7px 8px; color: #334155; font-size: 10.5px;">${projDisplay}</td>
                <td style="padding: 7px 8px;">
                    <span style="font-size: 9.5px; font-weight: 800; background: ${typeBadgeBg}; color: ${typeBadgeColor}; padding: 2px 6px; border-radius: 4px;">${typeLabel}</span>
                </td>
                <td style="padding: 7px 8px; text-align: right; font-weight: 800; color: #059669;">$${amtUsd.toFixed(2)}</td>
                <td style="padding: 7px 8px; text-align: right; font-weight: 700; color: #475569;">${amtBs.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} Bs</td>
                <td style="padding: 7px 8px; text-align: center;">${statusBadge}</td>
                <td style="padding: 7px 8px; text-align: center;">${receiptBtn}</td>
            </tr>
        `;
    }).join('');
}

function goToCategoryHistoryPage(page) {
    currentCatHistoryPage = page;
    renderCategoryHistoryTable();
}
window.goToCategoryHistoryPage = goToCategoryHistoryPage;

function changeCategoryHistoryPageSize(size) {
    catHistoryPageSize = parseInt(size) || 10;
    currentCatHistoryPage = 1;
    renderCategoryHistoryTable();
}
window.changeCategoryHistoryPageSize = changeCategoryHistoryPageSize;





// ==============================================================================
// 🔐 AUTENTICACIÓN, ROLES & PERMISOS UNIFICADOS EN src/auth.js
// ==============================================================================






// Exponer al objeto global window para eventos inline y compatibilidad
if (typeof window !== 'undefined') {
    window.renderComparisonTablePaginated = renderComparisonTablePaginated;
    window.loadComparisonDashboard = loadComparisonDashboard;
    window.renderCategoryHistoryTable = renderCategoryHistoryTable;
}
