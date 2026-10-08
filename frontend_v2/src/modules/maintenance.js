import { 
    checkAuthStatus, 
    performLogin, 
    handleLogout, 
    renderUserBadge, 
    applyPermissionMap, 
    redirectUserByRole, 
    showLoginError 
} from '../auth.js';

var API_BASE = window.API_BASE || (window.location.origin + "/api/v1");
var allClients = window.allClients = window.allClients || [];
var allServices = window.allServices = window.allServices || [];
var allProjects = window.allProjects = window.allProjects || [];
var allCategories = window.allCategories = window.allCategories || [];
var allAssets = window.allAssets = window.allAssets || [];
var allPersonnel = window.allPersonnel = window.allPersonnel || [];
var allMaterials = window.allMaterials = window.allMaterials || [];
var selectedPersonnelIds = window.selectedPersonnelIds = window.selectedPersonnelIds || [];
var selectedVehicleIds = window.selectedVehicleIds = window.selectedVehicleIds || [];
var selectedToolIds = window.selectedToolIds = window.selectedToolIds || [];
var selectedMaterialIds = window.selectedMaterialIds = window.selectedMaterialIds || [];
var EXCHANGE_RATE = window.EXCHANGE_RATE = window.EXCHANGE_RATE || 850.0;
var BCV_DATA = window.BCV_DATA = window.BCV_DATA || { rate: 850.0, source: 'BCV Oficial' };
var currentUser = window.currentUser || null;
var authToken = window.authToken = window.authToken || localStorage.getItem('dalor_token') || null;
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


// --- BLOQUE L497-L764 ---
// ==============================================================================

// 🔐 CONTROLADOR CORPORATIVO DE AUTENTICACIÓN & SESIONES (PRODUCCIÓN)

// ==============================================================================



window.togglePasswordVisibility = function(inputId, btn) {

    const el = document.getElementById(inputId);

    if (!el) return;

    if (el.type === 'password') {

        el.type = 'text';

        if (btn) btn.innerHTML = '<i class="fa-solid fa-eye-slash"></i>';

    } else {

        el.type = 'password';

        if (btn) btn.innerHTML = '<i class="fa-solid fa-eye"></i>';

    }

};



window.toggleDemoProfiles = function() {

    const grid = document.getElementById('demoProfilesGrid');

    if (grid) {

        grid.style.display = (grid.style.display === 'none' || !grid.style.display) ? 'grid' : 'none';

    }

};



const fillQuickLogin = performLogin;
const fillAndSubmitQuickLogin = performLogin;
const loginDirectlyAs = performLogin;
const submitLogin = function(e) {
    if (e && e.preventDefault) e.preventDefault();
    const u = document.getElementById('login_username')?.value?.trim();
    const p = document.getElementById('login_password')?.value;
    performLogin(u, p);
};

window.quickFillAndLogin = performLogin;
window.handlePortalLogin = function(e) {
    if (e && e.preventDefault) e.preventDefault();
    const u = document.getElementById('portal_username')?.value?.trim();
    const p = document.getElementById('portal_password')?.value;
    performLogin(u, p);
};
window.loginDirectlyAs = loginDirectlyAs;
window.fillAndSubmitQuickLogin = fillAndSubmitQuickLogin;
window.fillQuickLogin = fillQuickLogin;
window.submitLogin = submitLogin;





// --- BLOQUE L6328-L6484 ---
// ----------------------------------------------------

// 8. MÓDULO DE CLIENTES

// ----------------------------------------------------

let lastClientsList = [];
let clientsCurrentPage = 1;
let clientsPageSize = 10;

function goToClientsPage(page) {
    clientsCurrentPage = page;
    renderClientsPaginated();
    const tableEl = document.getElementById("clientsTableBody");
    if (tableEl) tableEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function changeClientsPageSize(size) {
    clientsPageSize = parseInt(size) || 10;
    clientsCurrentPage = 1;
    renderClientsPaginated();
}

function renderClientsPaginated() {
    const tbody = document.getElementById("clientsTableBody");
    if (!tbody) return;

    const clients = lastClientsList;
    if (clients.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px; color: #94a3b8;">No hay clientes registrados en el directorio. Usa '+ Nuevo Cliente' para agregar.</td></tr>`;
        const container = document.getElementById("clientsPaginationContainer");
        if (container) container.innerHTML = "";
        return;
    }

    const paginateFn = typeof window.renderPaginationControls === 'function' 
        ? window.renderPaginationControls 
        : (typeof renderPaginationControls === 'function' ? renderPaginationControls : () => ({ startIndex: 0, endIndex: clients.length }));

    const { startIndex, endIndex } = paginateFn({
        containerId: "clientsPaginationContainer",
        totalItems: clients.length,
        currentPage: clientsCurrentPage,
        pageSize: clientsPageSize,
        onPageChange: "goToClientsPage",
        onPageSizeChange: "changeClientsPageSize",
        itemLabel: "cliente(s)",
        pageSizeOptions: [10, 20, 50, 100]
    });

    const pageItems = clients.slice(startIndex, endIndex);

    tbody.innerHTML = pageItems.map(c => {
        const rawPhone = (c.contact_phone || '').replace(/[^0-9]/g, '');
        let waPhone = rawPhone;
        if (waPhone.startsWith('0')) waPhone = '58' + waPhone.substring(1);
        else if (waPhone && !waPhone.startsWith('58') && waPhone.length === 10) waPhone = '58' + waPhone;
        const waBtn = waPhone ? `
            <a href="https://wa.me/${waPhone}?text=${encodeURIComponent('Hola ' + (c.contact_name || c.name) + ', le saludamos de Metalmecánica Dalor C.A.')}" target="_blank" class="btn-secondary" style="padding: 4px 8px; color: #16a34a; margin-right: 4px; text-decoration: none; display: inline-flex; align-items: center;" title="Contactar por WhatsApp">
                <i class="fa-brands fa-whatsapp"></i>
            </a>
        ` : '';

        return `
        <tr>
            <td style="font-weight: 800; color: var(--dalor-blue);">${c.code || ('CLI-' + String(c.id).padStart(3, '0'))}</td>
            <td style="font-weight: 700; color: var(--dalor-navy);">${c.name}</td>
            <td>${c.rif || '<span style="color:#94a3b8;">-</span>'}</td>
            <td>${c.contact_name || '<span style="color:#94a3b8;">-</span>'}</td>
            <td>
                ${c.contact_phone || c.contact_email || '<span style="color:#94a3b8;">-</span>'}
                ${waBtn}
            </td>
            <td>${c.address || '<span style="color:#94a3b8;">-</span>'}</td>
            <td style="text-align: center; white-space: nowrap;">
                <button onclick="openClientHistoryModal(${c.id})" class="btn-secondary" style="padding: 4px 8px; color: #059669; margin-right: 4px;" title="Ver Ficha e Historial">
                    <i class="fa-solid fa-clock-rotate-left"></i>
                </button>
                <button onclick="openEditClientModal(${c.id})" class="btn-secondary" style="padding: 4px 8px; color: var(--dalor-blue); margin-right: 4px;" title="Editar Cliente">
                    <i class="fa-solid fa-pen-to-square"></i>
                </button>
                <button onclick="deleteClient(${c.id})" class="btn-secondary" style="padding: 4px 8px; color: #ef4444;" title="Inactivar Cliente">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        </tr>
    `;}).join('');
}

async function loadClients() {
    const tbody = document.getElementById("clientsTableBody");
    if (Array.isArray(allClients) && allClients.length > 0) {
        lastClientsList = allClients;
        renderClientsPaginated();
    } else if (tbody) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px; color: #94a3b8;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando clientes...</td></tr>`;
    }

    try {
        const res = await authFetch(`${API_BASE}/clients/`);
        if (!res.ok) throw new Error("Error HTTP " + res.status);
        const data = await res.json();
        allClients = Array.isArray(data) ? data : [];
        lastClientsList = allClients;
        clientsCurrentPage = 1;
        renderClientsPaginated();

    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #e11d48;">Error al cargar clientes.</td></tr>`;
    }
}

function onClientSearchInput(val) {
    const q = (val || '').toLowerCase().trim();
    if (!q) {
        lastClientsList = allClients;
    } else {
        lastClientsList = (allClients || []).filter(c => 
            (c.name && c.name.toLowerCase().includes(q)) ||
            (c.code && c.code.toLowerCase().includes(q)) ||
            (c.rif && c.rif.toLowerCase().includes(q)) ||
            (c.contact_name && c.contact_name.toLowerCase().includes(q)) ||
            (c.address && c.address.toLowerCase().includes(q))
        );
    }
    applyClientSorting();
    clientsCurrentPage = 1;
    renderClientsPaginated();
}

let currentClientSortMode = 'code_asc';

function onClientSortChanged(sortMode) {
    currentClientSortMode = sortMode || 'code_asc';
    applyClientSorting();
    clientsCurrentPage = 1;
    renderClientsPaginated();
}
window.onClientSortChanged = onClientSortChanged;

function applyClientSorting() {
    if (!lastClientsList || !Array.isArray(lastClientsList)) return;
    lastClientsList.sort((a, b) => {
        if (currentClientSortMode === 'name_asc') {
            return (a.name || '').localeCompare(b.name || '', 'es', { sensitivity: 'base' });
        } else if (currentClientSortMode === 'name_desc') {
            return (b.name || '').localeCompare(a.name || '', 'es', { sensitivity: 'base' });
        } else if (currentClientSortMode === 'code_desc') {
            return (b.code || '').localeCompare(a.code || '', 'es', { numeric: true });
        } else {
            // code_asc (default)
            return (a.code || '').localeCompare(b.code || '', 'es', { numeric: true });
        }
    });
}

function openEditClientModal(clientId) {
    const c = (allClients || []).find(item => item.id === clientId);
    if (!c) {
        alert("Cliente no encontrado.");
        return;
    }
    document.getElementById("edit_cli_id").value = c.id;
    document.getElementById("edit_cli_code").value = c.code || ('CLI-' + String(c.id).padStart(3, '0'));
    document.getElementById("edit_cli_name").value = c.name || "";
    document.getElementById("edit_cli_rif").value = c.rif || "";
    document.getElementById("edit_cli_industry").value = c.industry || "";
    document.getElementById("edit_cli_contact").value = c.contact_name || "";
    document.getElementById("edit_cli_phone").value = c.contact_phone || "";
    document.getElementById("edit_cli_email").value = c.contact_email || "";
    document.getElementById("edit_cli_address").value = c.address || "";
    openModal("modalEditClient");
}

async function submitEditClient(event) {
    if (event && event.preventDefault) event.preventDefault();
    const clientId = document.getElementById("edit_cli_id").value;
    const payload = {
        name: document.getElementById("edit_cli_name").value.trim(),
        rif: document.getElementById("edit_cli_rif").value.trim(),
        industry: document.getElementById("edit_cli_industry").value.trim(),
        contact_name: document.getElementById("edit_cli_contact").value.trim(),
        contact_phone: document.getElementById("edit_cli_phone").value.trim(),
        contact_email: document.getElementById("edit_cli_email").value.trim(),
        address: document.getElementById("edit_cli_address").value.trim()
    };
    if (!payload.name) {
        alert("La razón social es obligatoria.");
        return;
    }
    try {
        const res = await authFetch(`${API_BASE}/clients/${clientId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            closeModal("modalEditClient");
            if (typeof showToastNotification === 'function') {
                showToastNotification("Cliente actualizado exitosamente", "success");
            } else if (typeof showToast === 'function') {
                showToast("Cliente actualizado exitosamente", "success");
            } else {
                alert("Cliente actualizado exitosamente.");
            }
            await loadInitialMasterData();
            loadClients();
        } else {
            const err = await res.json();
            alert("Error: " + (err.detail || JSON.stringify(err)));
        }
    } catch (e) {
        console.error("Error al actualizar cliente:", e);
        alert("Error de conexión al actualizar cliente.");
    }
}

async function openClientHistoryModal(clientId) {
    const c = (allClients || []).find(item => item.id === clientId);
    if (!c) return;

    document.getElementById("clientHistoryTitle").textContent = `Ficha Histórica: ${c.name}`;
    document.getElementById("clientHistorySubtitle").textContent = `Código: ${c.code || '-'} | RIF: ${c.rif || '-'}`;
    const body = document.getElementById("clientHistoryBody");
    body.innerHTML = `<div style="text-align: center; padding: 30px; color: #94a3b8;"><i class="fa-solid fa-spinner fa-spin" style="font-size: 24px;"></i> Consultando base de datos histórica...</div>`;
    openModal("modalClientHistory");

    try {
        const res = await authFetch(`${API_BASE}/clients/${clientId}/history`);
        if (!res.ok) throw new Error("HTTP " + res.status);
        const data = await res.json();
        const clientInfo = data.client || {};
        
        let html = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-bottom: 16px;">
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center;">
                    <div style="font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase;">Total Contratado</div>
                    <div style="font-size: 18px; font-weight: 800; color: #059669; margin-top: 4px;">$${Number(data.total_contracted_usd || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                </div>
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center;">
                    <div style="font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase;">Proyectos Registrados</div>
                    <div style="font-size: 18px; font-weight: 800; color: var(--dalor-navy); margin-top: 4px;">${data.projects_count || 0}</div>
                </div>
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center;">
                    <div style="font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase;">Cotizaciones Emitidas</div>
                    <div style="font-size: 18px; font-weight: 800; color: var(--dalor-blue); margin-top: 4px;">${data.quotations_count || 0}</div>
                </div>
            </div>

            <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin-bottom: 14px;">
                <h4 style="font-size: 13px; font-weight: 800; color: var(--dalor-navy); margin-bottom: 8px; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px;">Información de Contacto y Planta</h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12px;">
                    <div><strong>Contacto:</strong> ${clientInfo.contact_name || 'No especificado'}</div>
                    <div><strong>Teléfono:</strong> ${clientInfo.contact_phone || 'No especificado'}</div>
                    <div><strong>Email:</strong> ${clientInfo.contact_email || 'No especificado'}</div>
                    <div><strong>Dirección:</strong> ${clientInfo.address || 'No especificada'}</div>
                    <div><strong>Sector / Industria:</strong> ${clientInfo.industry || 'No especificado'}</div>
                </div>
            </div>
        `;

        body.innerHTML = html;
    } catch (e) {
        console.error("Error al cargar historial de cliente:", e);
        body.innerHTML = `<div style="text-align: center; padding: 20px; color: #ef4444;">No se pudo cargar el historial del cliente.</div>`;
    }
}



async function openNewClientModal() {
    const form = document.getElementById("clientForm");
    if (form) form.reset();

    const codeInput = document.getElementById("cli_code");
    if (codeInput) {
        codeInput.value = "Generando correlativo...";
        codeInput.setAttribute("readonly", "true");
        codeInput.style.backgroundColor = "#f1f5f9";
        codeInput.style.cursor = "not-allowed";
        codeInput.style.fontWeight = "700";
    }

    openModal("modalClient");

    try {
        const res = await authFetch(`${API_BASE}/clients/next-code`);
        if (res.ok) {
            const data = await res.json();
            if (codeInput && data && data.next_code) {
                codeInput.value = data.next_code;
            }
        } else {
            if (codeInput) {
                const count = (window.appState && window.appState.clients) ? window.appState.clients.length + 1 : 3;
                codeInput.value = `CLI-${String(count).padStart(3, '0')}`;
            }
        }
    } catch (e) {
        console.warn("No se pudo cargar correlativo dinámico:", e);
        if (codeInput && (codeInput.value.includes("Generando") || !codeInput.value)) {
            codeInput.value = "CLI-003";
        }
    }
}



async function submitCreateClient(event) {
    if (event && event.preventDefault) event.preventDefault();
    const payload = {
        code: document.getElementById("cli_code").value.trim(),
        name: document.getElementById("cli_name").value.trim(),
        rif: document.getElementById("cli_rif") ? document.getElementById("cli_rif").value.trim() : "",
        industry: document.getElementById("cli_industry") ? document.getElementById("cli_industry").value.trim() : "General",
        contact_name: document.getElementById("cli_contact") ? document.getElementById("cli_contact").value.trim() : "",
        contact_phone: document.getElementById("cli_phone") ? document.getElementById("cli_phone").value.trim() : "",
        contact_email: document.getElementById("cli_email") ? document.getElementById("cli_email").value.trim() : "",
        address: document.getElementById("cli_address") ? document.getElementById("cli_address").value.trim() : ""
    };

    if (!payload.name) {
        alert("Por favor ingresa el nombre o razón social del cliente.");
        return;
    }

    try {
        const res = await authFetch(`${API_BASE}/clients/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            const newClient = await res.json();
            closeModal("modalClient");
            const form = document.getElementById("clientForm");
            if (form) form.reset();

            // Recargar datos maestros en caliente desde la base de datos
            await loadInitialMasterData();
            populateSelectDropdowns();
            populatePlanDropdownSelectors();

            // Auto-seleccionar el cliente recién creado en el selector activo
            if (document.getElementById("quote_client_id")) {
                document.getElementById("quote_client_id").value = String(newClient.id);
            }
            if (document.getElementById("new_proj_client_id")) {
                document.getElementById("new_proj_client_id").value = String(newClient.id);
            }

            if (typeof loadClients === 'function') loadClients();
            if (typeof showToastNotification === 'function') {
                showToastNotification(`Cliente ${newClient.name} registrado con éxito`, 'success');
            } else if (typeof showToast === 'function') {
                showToast(`Cliente ${newClient.name} registrado con éxito`, 'success');
            } else {
                alert(`Cliente ${newClient.name} registrado con éxito.`);
            }
        } else {
            const err = await res.json();
            alert("Error: " + (err.detail || JSON.stringify(err)));
        }
    } catch (e) {
        console.error("Error al guardar cliente:", e);
        alert("Error de conexión al guardar cliente.");
    }
}



async function deleteClient(clientId) {

    if (!confirm("¿Deseas inactivar este cliente? (Se conservará su historial de obras y facturas)")) return;

    try {

        await authFetch(`${API_BASE}/clients/${clientId}`, { method: "DELETE" });

        await loadInitialMasterData();

        loadClients();

    } catch (e) {

        alert("Error al inactivar cliente.");

    }

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





// --- BLOQUE L9458-L9995 ---
// ==============================================================================

// 🛠️ 15. MÓDULO DE MANTENIMIENTO, USUARIOS & AUDITORÍA (TIPO PROFIT PLUS)

// ==============================================================================

let allSystemUsers = [];



function openMaintenanceSubtab(subtab) {
    switchView('maintenance', 'mantenimiento', subtab);
}



let allSystemRoles = [];

function switchMaintenanceSubtab(subtab) {
    try { sessionStorage.setItem('dalor_active_subtab_maintenance', subtab); } catch(e) {}

    ['users', 'roles', 'audit', 'backups', 'clean'].forEach(t => {
        const pane = document.getElementById(`subtab-maint-${t}`);
        const btn = document.getElementById(`tabbtn-maint-${t}`);
        if (pane) pane.classList.add('hidden');
        if (btn) btn.classList.remove('active');
    });

    const activePane = document.getElementById(`subtab-maint-${subtab}`);
    const activeBtn = document.getElementById(`tabbtn-maint-${subtab}`);
    if (activePane) activePane.classList.remove('hidden');
    if (activeBtn) activeBtn.classList.add('active');

    if (subtab === 'users') loadMaintenanceUsersList();
    if (subtab === 'roles') loadMaintenanceRolesList();
    if (subtab === 'audit') loadMaintenanceAuditLogs();
    if (subtab === 'backups') loadBackupsList();
}

async function loadMaintenanceUsersList() {
    const tbody = document.getElementById('maintenanceUsersTableBody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #94a3b8; padding: 16px;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando usuarios...</td></tr>`;

    try {
        const res = await authFetch(`${API_BASE}/maintenance/users`);
        allSystemUsers = await res.json();

        if (allSystemUsers.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #94a3b8; padding: 16px;">No hay usuarios registrados.</td></tr>`;
            return;
        }

        const roleBadges = {
            'director_general': '<span style="background: #ede9fe; color: #5b21b6; padding: 2px 6px; border-radius: 4px; font-weight: 800; font-size: 11px;">👑 Director General</span>',
            'administrador_financiero': '<span style="background: #d1fae5; color: #065f46; padding: 2px 6px; border-radius: 4px; font-weight: 800; font-size: 11px;">💼 Administración & Finanzas</span>',
            'ingeniero_obra': '<span style="background: #e0f2fe; color: #0369a1; padding: 2px 6px; border-radius: 4px; font-weight: 800; font-size: 11px;">👷 Ingeniero Residente</span>',
            'supervisor_campo': '<span style="background: #fef3c7; color: #92400e; padding: 2px 6px; border-radius: 4px; font-weight: 800; font-size: 11px;">📱 Supervisor Campo</span>',
            'auditor_control': '<span style="background: #ffedd5; color: #c2410c; padding: 2px 6px; border-radius: 4px; font-weight: 800; font-size: 11px;">🔍 Auditor de Control</span>'
        };

        tbody.innerHTML = allSystemUsers.map(u => `
            <tr>
                <td style="font-weight: 800; color: var(--dalor-navy);">${u.username}</td>
                <td style="font-weight: 700;">${u.full_name}</td>
                <td style="color: #64748b;">${u.email || '-'}</td>
                <td>${roleBadges[u.role_name] || `<span style="background: #f1f5f9; color: #334155; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 11px;">🛡️ ${u.role_name}</span>`}</td>
                <td style="color: #64748b; font-size: 11px;">${u.last_login}</td>
                <td>
                    <span style="padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 800; background: ${u.is_active ? '#dcfce7' : '#fee2e2'}; color: ${u.is_active ? '#166534' : '#991b1b'};">
                        ${u.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                </td>
                <td style="text-align: center; white-space: nowrap;">
                    <button onclick="openUserPermissionsModal(${u.id})" class="btn-secondary" style="padding: 3px 7px; font-size: 11px; margin-right: 4px;" title="Modificar Mapa de Permisos">
                        <i class="fa-solid fa-key" style="color: #0284c7;"></i> Permisos
                    </button>
                    <button onclick="toggleUserStatus(${u.id})" class="btn-secondary" style="padding: 3px 7px; font-size: 11px; color: ${u.is_active ? '#e11d48' : '#059669'};" title="Activar/Desactivar Cuenta">
                        <i class="fa-solid fa-power-off"></i>
                    </button>
                </td>
            </tr>
        `).join('');

    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #e11d48; padding: 16px;">Error al cargar directorio de usuarios.</td></tr>`;
    }
}

// -----------------------------------------------------------------------------
// GESTIÓN DE ROLES (PROFIT PLUS STYLE)
// -----------------------------------------------------------------------------
async function loadMaintenanceRolesList() {
    const tbody = document.getElementById('maintenanceRolesTableBody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #94a3b8; padding: 16px;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando roles de seguridad...</td></tr>`;

    try {
        const res = await authFetch(`${API_BASE}/maintenance/roles`);
        if (!res.ok) throw new Error("Error fetching roles");
        allSystemRoles = await res.json();

        if (allSystemRoles.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #94a3b8; padding: 16px;">No hay roles definidos.</td></tr>`;
            return;
        }

        tbody.innerHTML = allSystemRoles.map(r => {
            let perms = {};
            try { perms = typeof r.permissions_json === 'string' ? JSON.parse(r.permissions_json) : r.permissions_json; } catch(e) { perms = {}; }

            const moduleBadges = [];
            if (perms.comercial || perms.comercial_view) moduleBadges.push('<span style="background: #e0f2fe; color: #0369a1; padding: 1px 5px; border-radius: 3px; font-size: 10px; font-weight: 700;">Comercial</span>');
            if (perms.proyectos || perms.proyectos_view) moduleBadges.push('<span style="background: #dcfce7; color: #166534; padding: 1px 5px; border-radius: 3px; font-size: 10px; font-weight: 700;">Proyectos</span>');
            if (perms.finanzas || perms.finanzas_view) moduleBadges.push('<span style="background: #fef3c7; color: #92400e; padding: 1px 5px; border-radius: 3px; font-size: 10px; font-weight: 700;">Finanzas</span>');
            if (perms.recursos || perms.recursos_view) moduleBadges.push('<span style="background: #ede9fe; color: #5b21b6; padding: 1px 5px; border-radius: 3px; font-size: 10px; font-weight: 700;">Recursos</span>');
            if (perms.gastos || perms.gastos_view) moduleBadges.push('<span style="background: #ffedd5; color: #c2410c; padding: 1px 5px; border-radius: 3px; font-size: 10px; font-weight: 700;">Gastos</span>');
            if (perms.executive_bi || perms.executive_dashboard) moduleBadges.push('<span style="background: #fae8ff; color: #86198f; padding: 1px 5px; border-radius: 3px; font-size: 10px; font-weight: 700;">BI Ejecutivo</span>');
            if (perms.mantenimiento || perms.mantenimiento_admin) moduleBadges.push('<span style="background: #fee2e2; color: #991b1b; padding: 1px 5px; border-radius: 3px; font-size: 10px; font-weight: 700;">Config/Seguridad</span>');

            return `
                <tr>
                    <td style="font-weight: 800; color: var(--dalor-navy);">
                        <i class="fa-solid fa-shield-halved" style="color: #d97706; margin-right: 5px;"></i> ${r.display_name}
                    </td>
                    <td style="font-family: monospace; font-size: 11px; color: #475569;">${r.name}</td>
                    <td style="font-size: 11px; color: #64748b; max-width: 250px;">${r.description || '-'}</td>
                    <td>
                        <div style="display: flex; flex-wrap: wrap; gap: 4px;">
                            ${moduleBadges.length > 0 ? moduleBadges.join('') : '<span style="color: #94a3b8; font-size: 10px;">Sin permisos</span>'}
                        </div>
                    </td>
                    <td>
                        <span style="padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 800; background: ${r.is_system ? '#e2e8f0' : '#dbeafe'}; color: ${r.is_system ? '#475569' : '#1e40af'};">
                            ${r.is_system ? '🔒 Nativo' : '✨ Personalizado'}
                        </span>
                    </td>
                    <td style="text-align: center; white-space: nowrap;">
                        <button onclick="openEditRoleModal(${r.id})" class="btn-secondary" style="padding: 3px 8px; font-size: 11px; margin-right: 4px;" title="Editar Permisos del Rol">
                            <i class="fa-solid fa-pen-to-square"></i> Editar
                        </button>
                        ${!r.is_system ? `
                            <button onclick="deleteRole(${r.id}, '${r.display_name}')" class="btn-secondary" style="padding: 3px 8px; font-size: 11px; color: #e11d48;" title="Eliminar Rol">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        ` : ''}
                    </td>
                </tr>
            `;
        }).join('');

    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #e11d48; padding: 16px;">Error al cargar roles.</td></tr>`;
    }
}

const GRANULAR_PERM_KEYS = [
    'comercial_view', 'comercial_edit', 'services_view', 'quotations_create', 'quotations_approve',
    'proyectos_view', 'proyectos_edit', 'proyectos_phases', 'proyectos_adendas', 'proyectos_costs',
    'cxc_view', 'cxc_pay', 'cxp_view', 'cxp_pay', 'bancos_view', 'conciliacion_view', 'retiros_view',
    'gastos_view', 'gastos_create', 'gastos_approve',
    'recursos_view', 'recursos_edit', 'mantenimiento_vehicular', 'personal_view', 'cuadrillas_assign',
    'almacen_view', 'almacen_adjust', 'requisiciones_view', 'despacho_view', 'alquileres_view',
    'executive_dashboard', 'audit_logs', 'usuarios_admin', 'backups_admin'
];

function toggleAllRoleCheckboxes(check) {
    GRANULAR_PERM_KEYS.forEach(k => {
        const el = document.getElementById('role_perm_' + k);
        if (el) el.checked = !!check;
    });
}

function toggleAllUserCheckboxes(check) {
    GRANULAR_PERM_KEYS.forEach(k => {
        const el = document.getElementById('perm_' + k);
        if (el) el.checked = !!check;
    });
}

function openNewRoleModal() {
    const form = document.getElementById('roleForm');
    if (form) form.reset();
    document.getElementById('role_form_id').value = '';
    document.getElementById('roleModalTitle').textContent = 'Crear Rol de Seguridad';
    document.getElementById('role_name').readOnly = false;
    toggleAllRoleCheckboxes(false);
    ['comercial_view', 'proyectos_view', 'gastos_view', 'gastos_create', 'recursos_view'].forEach(k => {
        const el = document.getElementById('role_perm_' + k);
        if (el) el.checked = true;
    });
    openModal('modalRoleForm');
}

function autoGenerateRoleSlug() {
    const idField = document.getElementById('role_form_id');
    if (idField && idField.value) return;
    const title = document.getElementById('role_display_name').value;
    const slug = title.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
    document.getElementById('role_name').value = slug;
}

function openEditRoleModal(roleId) {
    const role = allSystemRoles.find(r => r.id === roleId);
    if (!role) return;

    document.getElementById('role_form_id').value = role.id;
    document.getElementById('roleModalTitle').textContent = `Editar Rol: ${role.display_name}`;
    document.getElementById('role_display_name').value = role.display_name;
    document.getElementById('role_name').value = role.name;
    document.getElementById('role_name').readOnly = role.is_system;
    document.getElementById('role_description').value = role.description || '';

    let perms = {};
    try { perms = typeof role.permissions_json === 'string' ? JSON.parse(role.permissions_json) : role.permissions_json; } catch(e) { perms = {}; }

    GRANULAR_PERM_KEYS.forEach(k => {
        const el = document.getElementById('role_perm_' + k);
        if (!el) return;
        if (perms[k] !== undefined) {
            el.checked = !!perms[k];
        } else if (k.startsWith('comercial_') || k.startsWith('quotations_') || k === 'services_view') {
            el.checked = !!(perms.comercial || perms.comercial_view);
        } else if (k.startsWith('proyectos_')) {
            el.checked = !!(perms.proyectos || perms.proyectos_view);
        } else if (['cxc_view', 'cxc_pay', 'cxp_view', 'cxp_pay', 'bancos_view', 'conciliacion_view', 'retiros_view'].includes(k)) {
            el.checked = !!(perms.finanzas || perms.finanzas_view);
        } else if (k.startsWith('gastos_')) {
            el.checked = !!(perms.gastos || perms.gastos_view);
        } else if (k.startsWith('recursos_') || k.startsWith('personal_') || k === 'mantenimiento_vehicular' || k === 'cuadrillas_assign') {
            el.checked = !!(perms.recursos || perms.recursos_view);
        } else if (k.startsWith('almacen_') || k.startsWith('requisiciones_') || k.startsWith('despacho_') || k.startsWith('alquileres_')) {
            el.checked = !!(perms.recursos || perms.recursos_view);
        } else if (k === 'executive_dashboard') {
            el.checked = !!(perms.executive_bi || perms.executive_dashboard);
        } else if (['usuarios_admin', 'audit_logs', 'backups_admin'].includes(k)) {
            el.checked = !!(perms.mantenimiento || perms.mantenimiento_admin);
        } else {
            el.checked = false;
        }
    });

    openModal('modalRoleForm');
}

async function submitRoleForm(event) {
    event.preventDefault();
    const roleId = document.getElementById('role_form_id').value;
    const displayName = document.getElementById('role_display_name').value.trim();
    const name = document.getElementById('role_name').value.trim();
    const description = document.getElementById('role_description').value.trim();

    const permissions = {};
    GRANULAR_PERM_KEYS.forEach(k => {
        const el = document.getElementById('role_perm_' + k);
        permissions[k] = el ? el.checked : false;
    });

    // Rollup legacy flags for 100% backward compatibility
    permissions.comercial = permissions.comercial_view || permissions.comercial_edit || permissions.quotations_create;
    permissions.comercial_view = permissions.comercial_view;
    permissions.comercial_edit = permissions.comercial_edit;
    permissions.proyectos = permissions.proyectos_view || permissions.proyectos_edit;
    permissions.proyectos_view = permissions.proyectos_view;
    permissions.proyectos_edit = permissions.proyectos_edit;
    permissions.finanzas = permissions.cxc_view || permissions.cxp_view || permissions.bancos_view;
    permissions.finanzas_view = permissions.finanzas;
    permissions.finanzas_edit = permissions.cxc_pay || permissions.cxp_pay;
    permissions.gastos = permissions.gastos_view || permissions.gastos_create;
    permissions.gastos_view = permissions.gastos_view;
    permissions.gastos_edit = permissions.gastos_create;
    permissions.recursos = permissions.recursos_view || permissions.personal_view || permissions.almacen_view;
    permissions.recursos_view = permissions.recursos;
    permissions.recursos_edit = permissions.recursos_edit || permissions.almacen_adjust;
    permissions.executive_bi = permissions.executive_dashboard;
    permissions.executive_dashboard = permissions.executive_dashboard;
    permissions.mantenimiento = permissions.usuarios_admin || permissions.backups_admin || permissions.audit_logs;
    permissions.mantenimiento_admin = permissions.mantenimiento;

    try {
        let res;
        if (roleId) {
            res = await authFetch(`${API_BASE}/maintenance/roles/${roleId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    display_name: displayName,
                    description: description,
                    permissions_json: JSON.stringify(permissions)
                })
            });
        } else {
            res = await authFetch(`${API_BASE}/maintenance/roles`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name,
                    display_name: displayName,
                    description: description,
                    permissions_json: JSON.stringify(permissions)
                })
            });
        }

        const data = await res.json();
        if (!res.ok) {
            alert(data.detail || 'Error al guardar rol.');
            return;
        }

        alert(data.message || 'Rol guardado exitosamente.');
        closeModal('modalRoleForm');
        loadMaintenanceRolesList();
    } catch(e) {
        alert('Error de conexión al guardar rol.');
    }
}

async function deleteRole(roleId, roleName) {
    if (!confirm(`¿Está seguro de eliminar el rol '${roleName}'? Esta acción no se puede deshacer.`)) return;
    try {
        const res = await authFetch(`${API_BASE}/maintenance/roles/${roleId}`, { method: 'DELETE' });
        const data = await res.json();
        if (!res.ok) {
            alert(data.detail || 'Error al eliminar rol.');
            return;
        }
        alert(data.message || 'Rol eliminado con éxito.');
        loadMaintenanceRolesList();
    } catch(e) {
        alert('Error de conexión al eliminar rol.');
    }
}

// -----------------------------------------------------------------------------
// CREACIÓN DE USUARIO CON PERMISOS MODULARES
// -----------------------------------------------------------------------------
async function openNewUserModal() {
    const form = document.getElementById('newUserForm');
    if (form) form.reset();

    // Populate roles dynamically if available
    try {
        if (!allSystemRoles || allSystemRoles.length === 0) {
            const res = await authFetch(`${API_BASE}/maintenance/roles`);
            if (res.ok) allSystemRoles = await res.json();
        }
        const select = document.getElementById('nusr_role');
        if (select && allSystemRoles.length > 0) {
            select.innerHTML = allSystemRoles.map(r => `
                <option value="${r.name}">${r.display_name}</option>
            `).join('');
        }
    } catch(e) {}

    onNewUserRoleChanged();
    openModal('modalNewUser');
}

function onNewUserRoleChanged() {
    const roleSelect = document.getElementById('nusr_role');
    if (!roleSelect) return;
    const selectedRoleName = roleSelect.value;
    const role = allSystemRoles.find(r => r.name === selectedRoleName);
    const descEl = document.getElementById('nusr_role_desc');
    if (descEl) {
        if (role && role.description) {
            descEl.textContent = `${role.display_name}: ${role.description}. Heredará sus 32 permisos granulares automáticamente.`;
        } else if (role) {
            descEl.textContent = `Rol asignado: ${role.display_name}. Heredará sus 32 permisos granulares automáticamente.`;
        } else {
            descEl.textContent = 'Este usuario heredará automáticamente la matriz de 32 permisos asignada al rol seleccionado.';
        }
    }
}

const onUserRoleTemplateChanged = onNewUserRoleChanged;

async function submitCreateUser(event) {
    event.preventDefault();
    const username = document.getElementById('nusr_username').value.trim();
    const full_name = document.getElementById('nusr_fullname').value.trim();
    const email = document.getElementById('nusr_email').value.trim();
    const password = document.getElementById('nusr_password').value;
    const role_name = document.getElementById('nusr_role').value;

    const role = allSystemRoles.find(r => r.name === role_name);
    let permissions_json = null;
    if (role && role.permissions_json) {
        permissions_json = typeof role.permissions_json === 'string' ? role.permissions_json : JSON.stringify(role.permissions_json);
    }

    try {
        const res = await authFetch(`${API_BASE}/maintenance/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username, full_name, email, password, role_name,
                permissions_json
            })
        });

        const data = await res.json();
        if (!res.ok) {
            alert(data.detail || 'Error al crear usuario.');
            return;
        }

        alert(`¡Usuario '${username}' creado con éxito con los permisos asignados del rol '${role ? role.display_name : role_name}'!`);
        closeModal('modalNewUser');
        loadMaintenanceUsersList();
    } catch (e) {
        alert('Error de conexión al registrar usuario.');
    }
}

function openUserPermissionsModal(userId) {
    const user = allSystemUsers.find(u => u.id === userId);
    if (!user) return;

    document.getElementById('perm_target_user_id').value = user.id;
    document.getElementById('permModalUsername').textContent = user.username;
    document.getElementById('permModalFullName').textContent = user.full_name;

    let p = {};
    if (typeof user.permissions_json === 'string') {
        try { p = JSON.parse(user.permissions_json); } catch(e) { p = {}; }
    } else if (user.permissions_json) {
        p = user.permissions_json;
    } else if (user.permissions) {
        p = user.permissions;
    }

    GRANULAR_PERM_KEYS.forEach(k => {
        const el = document.getElementById('perm_' + k);
        if (!el) return;
        if (p[k] !== undefined) {
            el.checked = !!p[k];
        } else if (k.startsWith('comercial_') || k.startsWith('quotations_') || k === 'services_view') {
            el.checked = !!(p.comercial || p.comercial_view);
        } else if (k.startsWith('proyectos_')) {
            el.checked = !!(p.proyectos || p.proyectos_view);
        } else if (['cxc_view', 'cxc_pay', 'cxp_view', 'cxp_pay', 'bancos_view', 'conciliacion_view', 'retiros_view'].includes(k)) {
            el.checked = !!(p.finanzas || p.finanzas_view);
        } else if (k.startsWith('gastos_')) {
            el.checked = !!(p.gastos || p.gastos_view);
        } else if (k.startsWith('recursos_') || k.startsWith('personal_') || k === 'mantenimiento_vehicular' || k === 'cuadrillas_assign') {
            el.checked = !!(p.recursos || p.recursos_view);
        } else if (k.startsWith('almacen_') || k.startsWith('requisiciones_') || k.startsWith('despacho_') || k.startsWith('alquileres_')) {
            el.checked = !!(p.recursos || p.recursos_view);
        } else if (k === 'executive_dashboard') {
            el.checked = !!(p.executive_bi || p.executive_dashboard);
        } else if (['usuarios_admin', 'audit_logs', 'backups_admin'].includes(k)) {
            el.checked = !!(p.mantenimiento || p.mantenimiento_admin);
        } else {
            el.checked = false;
        }
    });

    document.getElementById('modalUserPermissions').classList.remove('hidden');
}

async function submitSaveUserPermissions() {
    const userId = parseInt(document.getElementById('perm_target_user_id').value);

    const permissions = {};
    GRANULAR_PERM_KEYS.forEach(k => {
        const el = document.getElementById('perm_' + k);
        permissions[k] = el ? el.checked : false;
    });

    // Rollup legacy flags for 100% backward compatibility
    permissions.comercial = permissions.comercial_view || permissions.comercial_edit || permissions.quotations_create;
    permissions.comercial_view = permissions.comercial_view;
    permissions.comercial_edit = permissions.comercial_edit;
    permissions.proyectos = permissions.proyectos_view || permissions.proyectos_edit;
    permissions.proyectos_view = permissions.proyectos_view;
    permissions.proyectos_edit = permissions.proyectos_edit;
    permissions.finanzas = permissions.cxc_view || permissions.cxp_view || permissions.bancos_view;
    permissions.finanzas_view = permissions.finanzas;
    permissions.finanzas_edit = permissions.cxc_pay || permissions.cxp_pay;
    permissions.gastos = permissions.gastos_view || permissions.gastos_create;
    permissions.gastos_view = permissions.gastos_view;
    permissions.gastos_edit = permissions.gastos_create;
    permissions.recursos = permissions.recursos_view || permissions.personal_view || permissions.almacen_view;
    permissions.recursos_view = permissions.recursos;
    permissions.recursos_edit = permissions.recursos_edit || permissions.almacen_adjust;
    permissions.executive_bi = permissions.executive_dashboard;
    permissions.executive_dashboard = permissions.executive_dashboard;
    permissions.mantenimiento = permissions.usuarios_admin || permissions.backups_admin || permissions.audit_logs;
    permissions.mantenimiento_admin = permissions.mantenimiento;



    try {
        const token = window.authToken || localStorage.getItem('dalor_token');
        const headers = { 
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };

        const res = await authFetch(`${API_BASE}/maintenance/users/${userId}/permissions`, {
            method: 'PUT',
            headers: headers,
            body: JSON.stringify({ permissions_json: JSON.stringify(permissions) })
        });

        const data = await res.json();
        if (!res.ok) {
            alert(data.detail || 'Error al actualizar permisos.');
            return;
        }



        alert('Mapa de permisos guardado con éxito.');

        closeModal('modalUserPermissions');

        loadMaintenanceUsersList();



        // Si es el usuario actual, actualizar permisos en vivo

        if (currentUser && currentUser.id === userId) {

            currentUser.permissions = permissions;

            localStorage.setItem('dalor_user', JSON.stringify(currentUser));

            applyPermissionMap(currentUser);

        }



    } catch (e) {

        alert('Error de conexión al guardar permisos.');

    }

}



async function toggleUserStatus(userId) {

    if (!confirm('¿Deseas cambiar el estado de acceso de este usuario?')) return;

    try {

        const res = await authFetch(`${API_BASE}/maintenance/users/${userId}/toggle-status`, { method: 'PUT' });

        const data = await res.json();

        if (!res.ok) {

            alert(data.detail || 'Error al cambiar estado.');

            return;

        }

        loadMaintenanceUsersList();

    } catch (e) {

        alert('Error al procesar solicitud.');

    }

}



let allAuditLogsCache = [];

async function loadMaintenanceAuditLogs() {
    const tbody = document.getElementById('maintenanceAuditTableBody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #94a3b8; padding: 16px;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando bitácora de eventos...</td></tr>`;

    try {
        const res = await authFetch(`${API_BASE}/maintenance/audit-logs`);
        const logs = await res.json();
        allAuditLogsCache = Array.isArray(logs) ? logs : [];

        renderMaintenanceAuditLogs(allAuditLogsCache);
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #e11d48; padding: 16px;">Error al cargar bitácora.</td></tr>`;
    }
}

let auditCurrentPage = 1;
let auditPageSize = 25;
let currentFilteredAuditLogs = [];

function renderMaintenanceAuditLogs(logs) {
    const tbody = document.getElementById('maintenanceAuditTableBody');
    if (!tbody) return;

    currentFilteredAuditLogs = Array.isArray(logs) ? logs : [];

    if (currentFilteredAuditLogs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #94a3b8; padding: 16px;">No hay eventos registrados que coincidan con la búsqueda.</td></tr>`;
        updateAuditPaginationControls(0, 0, 0, 0);
        return;
    }

    const totalItems = currentFilteredAuditLogs.length;
    const totalPages = Math.ceil(totalItems / auditPageSize) || 1;
    if (auditCurrentPage > totalPages) auditCurrentPage = totalPages;
    if (auditCurrentPage < 1) auditCurrentPage = 1;

    const startIdx = (auditCurrentPage - 1) * auditPageSize;
    const endIdx = Math.min(startIdx + auditPageSize, totalItems);
    const pageItems = currentFilteredAuditLogs.slice(startIdx, endIdx);

    tbody.innerHTML = pageItems.map(l => {
        const rawDate = l.created_at || l.timestamp || '';
        let displayDate = rawDate;
        if (rawDate) {
            try {
                // If it already contains YYYY-MM-DD HH:MM:SS
                if (rawDate.includes(' ') && rawDate.length >= 19) {
                    const [dPart, tPart] = rawDate.split(' ');
                    const [y, m, d] = dPart.split('-');
                    displayDate = `${d}/${m}/${y} ${tPart}`;
                } else {
                    const dt = new Date(rawDate);
                    if (!isNaN(dt.getTime())) {
                        displayDate = dt.toLocaleString('es-VE', {
                            year: 'numeric', month: '2-digit', day: '2-digit',
                            hour: '2-digit', minute: '2-digit', second: '2-digit',
                            hour12: true
                        });
                    }
                }
            } catch(e) {}
        }
        return `
            <tr>
                <td style="font-weight: 700; color: #334155; font-size: 11px; white-space: nowrap;">
                    <i class="fa-regular fa-clock" style="color: #0284c7; margin-right: 4px;"></i>${displayDate}
                </td>
                <td style="font-weight: 800; color: var(--dalor-navy);">${l.username || 'Sistema'}</td>
                <td><span style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 11px; text-transform: uppercase;">${l.module || 'General'}</span></td>
                <td style="font-weight: 700; color: #0284c7;">${l.action || '-'}</td>
                <td style="color: #334155; font-size: 11px;">${l.details || '-'}</td>
            </tr>
        `;
    }).join('');

    updateAuditPaginationControls(startIdx + 1, endIdx, totalItems, totalPages);
}

function updateAuditPaginationControls(start, end, total, totalPages) {
    const countInfo = document.getElementById('auditPageCountInfo');
    if (countInfo) {
        countInfo.textContent = total > 0 ? `Mostrando ${start} - ${end} de ${total}` : 'Mostrando 0 - 0 de 0';
    }

    const container = document.getElementById('auditPaginationControls');
    if (!container) return;

    if (total <= auditPageSize) {
        container.innerHTML = '';
        return;
    }

    let html = `
        <button onclick="goToAuditPage(${auditCurrentPage - 1})" class="btn-secondary" style="padding: 3px 8px; font-size: 11px;" ${auditCurrentPage <= 1 ? 'disabled' : ''}>
            <i class="fa-solid fa-chevron-left"></i> Anterior
        </button>
        <span style="font-size: 11px; font-weight: 700; color: #334155; padding: 0 4px;">Pág. ${auditCurrentPage} / ${totalPages}</span>
        <button onclick="goToAuditPage(${auditCurrentPage + 1})" class="btn-secondary" style="padding: 3px 8px; font-size: 11px;" ${auditCurrentPage >= totalPages ? 'disabled' : ''}>
            Siguiente <i class="fa-solid fa-chevron-right"></i>
        </button>
    `;
    container.innerHTML = html;
}

function goToAuditPage(page) {
    auditCurrentPage = page;
    renderMaintenanceAuditLogs(currentFilteredAuditLogs);
}

function changeAuditPageSize(newSize) {
    auditPageSize = parseInt(newSize, 10) || 25;
    auditCurrentPage = 1;
    renderMaintenanceAuditLogs(currentFilteredAuditLogs);
}

function filterMaintenanceAuditLogs() {
    auditCurrentPage = 1;
    const userFilter = (document.getElementById('auditFilterUser')?.value || '').toLowerCase().trim();
    const dateFrom = document.getElementById('auditFilterDateFrom')?.value || '';
    const dateTo = document.getElementById('auditFilterDateTo')?.value || '';
    const query = (document.getElementById('auditFilterQuery')?.value || '').toLowerCase().trim();

    let filtered = allAuditLogsCache.filter(l => {
        if (userFilter && !(l.username || '').toLowerCase().includes(userFilter)) return false;
        if (query) {
            const matchAction = (l.action || '').toLowerCase().includes(query);
            const matchDetails = (l.details || '').toLowerCase().includes(query);
            const matchModule = (l.module || '').toLowerCase().includes(query);
            if (!matchAction && !matchDetails && !matchModule) return false;
        }
        if (dateFrom || dateTo) {
            const raw = l.created_at || l.timestamp || '';
            const logDateStr = (raw.split(' ')[0] || raw.split('T')[0]).trim();
            if (dateFrom && logDateStr < dateFrom) return false;
            if (dateTo && logDateStr > dateTo) return false;
        }
        return true;
    });

    renderMaintenanceAuditLogs(filtered);
}

function resetMaintenanceAuditFilters() {
    auditCurrentPage = 1;
    if (document.getElementById('auditFilterUser')) document.getElementById('auditFilterUser').value = '';
    if (document.getElementById('auditFilterDateFrom')) document.getElementById('auditFilterDateFrom').value = '';
    if (document.getElementById('auditFilterDateTo')) document.getElementById('auditFilterDateTo').value = '';
    if (document.getElementById('auditFilterQuery')) document.getElementById('auditFilterQuery').value = '';
    renderMaintenanceAuditLogs(allAuditLogsCache);
}









// --- BLOQUE L10370-L10941 ---
// ==============================================================================
// 📊 16. DASHBOARD GERENCIAL BI CON MAPA DE VENEZUELA Y POWERBI DARK NAVY
// ==============================================================================

let biSummaryData = null;
let biRawProjects = [];
let chartBiMonthlyRev = null;
let chartBiService = null;
let chartBiClients = null;
let chartBiStatus = null;
let chartBiMethods = null;
let biCurrentFilter = { region: 'all', year: '2026', client: 'all' };

async function loadExecutiveDashboard() {
    const pnlTbody = document.getElementById("executivePnlTableBody");
    if (pnlTbody) pnlTbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: #64748b; padding: 20px;"><i class="fa-solid fa-spinner fa-spin"></i> Consolidando analítica ejecutiva y mapa georreferenciado...</td></tr>`;

    try {
        let qParams = [];
        if (biCurrentFilter.year && biCurrentFilter.year !== 'all') qParams.push(`year=${encodeURIComponent(biCurrentFilter.year)}`);
        if (biCurrentFilter.client && biCurrentFilter.client !== 'all') qParams.push(`client_id=${encodeURIComponent(biCurrentFilter.client)}`);
        if (biCurrentFilter.region && biCurrentFilter.region !== 'all') qParams.push(`region=${encodeURIComponent(biCurrentFilter.region)}`);
        const qStr = qParams.length ? `?${qParams.join('&')}` : '';

        const [resMetrics, resClients] = await Promise.all([
            authFetch(`${API_BASE}/financial/bi-metrics${qStr}`),
            authFetch(`${API_BASE}/clients/`)
        ]);

        if (resClients.ok) {
            const clients = await resClients.json();
            populateBIClientSlicer(clients);
        }

        if (resMetrics.ok) {
            biSummaryData = await resMetrics.json();
            renderExecutiveDashboardContent(biSummaryData);
        } else {
            throw new Error(`HTTP ${resMetrics.status}`);
        }

    } catch (e) {
        console.error("Error al cargar BI:", e);
        if (pnlTbody) pnlTbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: #e11d48; padding: 20px;">Error al consolidar dashboard ejecutivo: ${e?.message || e}</td></tr>`;
    }
}

function populateBIClientSlicer(clientsList) {
    const cliSelect = document.getElementById('bi_slicer_client');
    if (!cliSelect) return;
    const cur = cliSelect.value;
    const list = Array.isArray(clientsList) ? clientsList : [];

    let opts = '<option value="all">Todos los Clientes</option>';
    list.forEach(c => {
        opts += `<option value="${c.id}">${c.name}</option>`;
    });
    cliSelect.innerHTML = opts;
    if (cur) cliSelect.value = cur;
}

function filterBIExtended(type, val, btnEl) {
    if (type === 'region') {
        biCurrentFilter.region = val;
        const buttons = document.querySelectorAll('#biRegionSlicers .bi-filter-pill-light');
        buttons.forEach(b => b.classList.remove('active'));
        if (btnEl) btnEl.classList.add('active');
    } else if (type === 'year') {
        biCurrentFilter.year = val;
    } else if (type === 'client') {
        biCurrentFilter.client = val;
    }
    loadExecutiveDashboard();
}

function renderExecutiveDashboardContent(data) {
    if (!data || !data.success) return;
    const s = data.summary || {};
    const regions = data.regions || [];
    const monthly = data.monthly_revenue || [];
    const topClients = data.top_clients || [];
    const statusCounts = data.project_statuses || {};
    const paymentMethods = data.payment_methods || [];
    const serviceLines = data.service_lines || [];
    const pnlList = data.projects_pnl || [];

    // 1. Badge de región seleccionada
    const badgeEl = document.getElementById('biMapSelectedBadge');
    if (badgeEl) {
        const names = {
            all: 'Todo el Territorio Nacional',
            carabobo: 'Carabobo (Centro / Guacara)',
            miranda: 'Miranda / Caracas',
            aragua: 'Aragua (Maracay / Cagua)',
            oriente: 'Oriente (Anzoátegui / Monagas)',
            zulia_falcon: 'Occidente (Zulia / Falcón)',
            bolivar: 'Guayana / Sur (Bolívar)',
            centro_occidente: 'Lara / Centro-Occidente'
        };
        badgeEl.textContent = names[biCurrentFilter.region] || 'Todo el Territorio';
    }

    // 2. Nodos Georreferenciados del Mapa de Venezuela (100% REALES)
    const nodeMap = {
        carabobo: { node: 'mapNodeCarabobo', text: 'mapCaraboboAmount' },
        miranda: { node: 'mapNodeMiranda', text: 'mapMirandaAmount' },
        aragua: { node: 'mapNodeAragua', text: 'mapAraguaAmount' },
        oriente: { node: 'mapNodeOriente', text: 'mapOrienteAmount' },
        zulia_falcon: { node: 'mapNodeZulia', text: 'mapOccidenteAmount' },
        bolivar: { node: 'mapNodeBolivar', text: 'mapBolivarAmount' },
        centro_occidente: { node: 'mapNodeCentroOccidente', text: 'mapCentroOccAmount' }
    };

    let anyActiveRegion = false;
    regions.forEach(r => {
        const cfg = nodeMap[r.key];
        if (!cfg) return;
        const nodeEl = document.getElementById(cfg.node);
        const textEl = document.getElementById(cfg.text);

        if (r.has_active_projects || r.projects_count > 0) {
            anyActiveRegion = true;
            if (nodeEl) nodeEl.style.display = 'block';
            if (textEl) {
                const amt = r.collected_usd > 0 ? r.collected_usd : r.invoiced_usd;
                textEl.textContent = `$${(amt >= 1000 ? (amt / 1000).toFixed(1) + 'k' : amt.toFixed(0))}`;
            }
        } else {
            if (nodeEl) nodeEl.style.display = 'none';
        }
    });

    const emptyOverlay = document.getElementById('biEmptyMapOverlay');
    if (emptyOverlay) {
        emptyOverlay.style.display = anyActiveRegion ? 'none' : 'flex';
    }

    // 3. Totales de Cabecera (Tarjetas de KPIs)
    const hTotal = document.getElementById('biTotalIngresosHeader');
    if (hTotal) hTotal.textContent = `$${(s.total_collected_usd || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const sFact = document.getElementById('biTotalFacturadoSub');
    if (sFact) sFact.textContent = `$${(s.total_invoiced_usd || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

    const sEfect = document.getElementById('biTasaCobranzaSub');
    if (sEfect) sEfect.textContent = `${(s.collection_rate_pct || 0).toFixed(1)}%`;

    const mProm = document.getElementById('biMargenPromedio');
    if (mProm) mProm.textContent = `${(s.margin_pct || 0).toFixed(1)}%`;

    const oAct = document.getElementById('biObrasActivasCount');
    if (oAct) oAct.textContent = s.active_projects_count || 0;

    const cCalle = document.getElementById('biCarteraCalle');
    if (cCalle) cCalle.textContent = `$${(s.total_pending_cxc_usd || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

    const pProv = document.getElementById('biPasivoProveedores');
    if (pProv) pProv.textContent = `$${(s.total_cost_usd || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

    const mTotal = document.getElementById('biMonthKpiTotal');
    if (mTotal) mTotal.textContent = `$${(s.total_collected_usd || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

    // 4. Gráfico Evolución Mensual Real
    renderBIMonthlyChartReal(monthly);

    // 5. Gráfico de Líneas de Servicio Reales
    renderBIServiceLineChartReal(serviceLines);

    // 6. Donas Reales (Top Clientes, Estado de Obras, Métodos de Pago)
    renderBIDonutsReal(topClients, statusCounts, paymentMethods);

    // 7. Tabla P&L Detallada
    renderBIPnlTable(pnlList);
}

function renderBIMonthlyChartReal(monthlyData) {
    const ctx = document.getElementById('chartBiMonthlyRevenue');
    const emptyEl = document.getElementById('chartBiMonthlyEmpty');
    if (!ctx) return;
    if (chartBiMonthlyRev) chartBiMonthlyRev.destroy();

    const list = Array.isArray(monthlyData) ? monthlyData : [];
    if (list.length === 0) {
        if (emptyEl) emptyEl.style.display = 'flex';
        return;
    }
    if (emptyEl) emptyEl.style.display = 'none';

    const labels = list.map(m => m.label || m.month);
    const collectedVals = list.map(m => m.collected_usd || 0);
    const invoicedVals = list.map(m => m.invoiced_usd || 0);

    chartBiMonthlyRev = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Cobrado Real ($)',
                    data: collectedVals,
                    backgroundColor: '#059669',
                    borderRadius: 4,
                    barPercentage: 0.6
                },
                {
                    label: 'Facturado ($)',
                    data: invoicedVals,
                    backgroundColor: '#93c5fd',
                    borderRadius: 4,
                    barPercentage: 0.6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: { color: '#475569', font: { size: 10, weight: '700' }, boxWidth: 12 }
                },
                tooltip: {
                    backgroundColor: '#ffffff',
                    titleColor: '#0f172a',
                    bodyColor: '#334155',
                    borderColor: '#cbd5e1',
                    borderWidth: 1,
                    callbacks: {
                        label: (ctx) => ` ${ctx.dataset.label}: $${ctx.parsed.y.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: '#64748b', font: { size: 10, weight: '600' } }
                },
                y: {
                    grid: { color: 'rgba(0,0,0,0.05)' },
                    ticks: {
                        color: '#64748b',
                        font: { size: 9.5 },
                        callback: (v) => `$${(v >= 1000 ? (v/1000).toFixed(0) + 'k' : v)}`
                    }
                }
            }
        }
    });
}

function renderBIServiceLineChartReal(serviceLines) {
    const ctx = document.getElementById('chartBiServiceLine');
    const emptyEl = document.getElementById('chartBiServiceEmpty');
    if (!ctx) return;
    if (chartBiService) chartBiService.destroy();

    const list = Array.isArray(serviceLines) ? serviceLines : [];
    if (list.length === 0) {
        if (emptyEl) emptyEl.style.display = 'flex';
        return;
    }
    if (emptyEl) emptyEl.style.display = 'none';

    const labels = list.map(l => l.name);
    const vals = list.map(l => l.percentage);
    const colors = ['#2563eb', '#0284c7', '#059669', '#d97706', '#64748b'];

    chartBiService = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Participación (%)',
                data: vals,
                backgroundColor: colors.slice(0, labels.length),
                borderRadius: 4,
                barThickness: 16
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#ffffff',
                    titleColor: '#0f172a',
                    bodyColor: '#334155',
                    borderColor: '#cbd5e1',
                    borderWidth: 1,
                    callbacks: { label: (ctx) => ` Participación: ${ctx.parsed.x}%` }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(0,0,0,0.05)' },
                    ticks: { color: '#64748b', callback: (v) => `${v}%`, font: { size: 9.5 } },
                    max: 100
                },
                y: {
                    grid: { display: false },
                    ticks: { color: '#334155', font: { size: 10, weight: '700' } }
                }
            }
        }
    });
}

function renderBIDonutsReal(topClients, statusCounts, paymentMethods) {
    // Dona 1: Top Clientes Real
    const ctxCli = document.getElementById('chartBiDonutClients');
    const emptyCli = document.getElementById('chartBiClientsEmpty');
    if (ctxCli) {
        if (chartBiClients) chartBiClients.destroy();
        const list = Array.isArray(topClients) ? topClients : [];
        if (list.length === 0) {
            if (emptyCli) emptyCli.style.display = 'flex';
        } else {
            if (emptyCli) emptyCli.style.display = 'none';
            const labels = list.map(c => `${c.name} (${c.percentage}%)`);
            const dataVals = list.map(c => c.total_usd);

            chartBiClients = new Chart(ctxCli, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        data: dataVals,
                        backgroundColor: ['#2563eb', '#0284c7', '#059669', '#d97706', '#94a3b8'],
                        borderWidth: 2,
                        borderColor: '#ffffff'
                    }]
                },
                options: {
                    cutout: '68%',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: { color: '#475569', boxWidth: 10, font: { size: 9.5 } }
                        }
                    }
                }
            });
        }
    }

    // Dona 2: Estado de Proyectos Real
    const ctxSt = document.getElementById('chartBiDonutProjectsStatus');
    const emptySt = document.getElementById('chartBiStatusEmpty');
    if (ctxSt) {
        if (chartBiStatus) chartBiStatus.destroy();
        const enEjec = statusCounts?.en_ejecucion || 0;
        const culm = statusCounts?.culminados || 0;
        const plan = statusCounts?.planificados || 0;
        const totalProjs = enEjec + culm + plan;

        if (totalProjs === 0) {
            if (emptySt) emptySt.style.display = 'flex';
        } else {
            if (emptySt) emptySt.style.display = 'none';
            chartBiStatus = new Chart(ctxSt, {
                type: 'doughnut',
                data: {
                    labels: [`En Ejecución (${enEjec})`, `Culminadas (${culm})`, `Planificadas (${plan})`],
                    datasets: [{
                        data: [enEjec, culm, plan],
                        backgroundColor: ['#2563eb', '#059669', '#94a3b8'],
                        borderWidth: 2,
                        borderColor: '#ffffff'
                    }]
                },
                options: {
                    cutout: '68%',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: { color: '#475569', boxWidth: 10, font: { size: 9.5 } }
                        }
                    }
                }
            });
        }
    }

    // Dona 3: Método de Pago Real
    const ctxPay = document.getElementById('chartBiDonutPaymentMethods');
    const emptyPay = document.getElementById('chartBiMethodsEmpty');
    if (ctxPay) {
        if (chartBiMethods) chartBiMethods.destroy();
        const list = Array.isArray(paymentMethods) ? paymentMethods : [];
        if (list.length === 0) {
            if (emptyPay) emptyPay.style.display = 'flex';
        } else {
            if (emptyPay) emptyPay.style.display = 'none';
            const labels = list.map(m => `${m.label} (${m.percentage}%)`);
            const dataVals = list.map(m => m.total_usd);

            chartBiMethods = new Chart(ctxPay, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        data: dataVals,
                        backgroundColor: ['#2563eb', '#059669', '#0284c7', '#d97706', '#94a3b8'],
                        borderWidth: 2,
                        borderColor: '#ffffff'
                    }]
                },
                options: {
                    cutout: '68%',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: { color: '#475569', boxWidth: 10, font: { size: 9.5 } }
                        }
                    }
                }
            });
        }
    }
}

let lastBiPnlList = [];
let biPnlCurrentPage = 1;
let biPnlPageSize = 10;

function goToBiPnlPage(page) {
    biPnlCurrentPage = page;
    renderBIPnlTablePaginated();
}

function changeBiPnlPageSize(size) {
    biPnlPageSize = parseInt(size) || 10;
    biPnlCurrentPage = 1;
    renderBIPnlTablePaginated();
}

function renderBIPnlTable(pnlList) {
    lastBiPnlList = Array.isArray(pnlList) ? pnlList : [];
    biPnlCurrentPage = 1;
    renderBIPnlTablePaginated();
}

function renderBIPnlTablePaginated() {
    const pnlTbody = document.getElementById("executivePnlTableBody");
    if (!pnlTbody) return;

    const list = lastBiPnlList || [];
    if (list.length === 0) {
        pnlTbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: #94a3b8; padding: 18px;">No hay registros para este filtro.</td></tr>`;
        const pCont = document.getElementById("biPnlPaginationContainer");
        if (pCont) pCont.innerHTML = '';
        return;
    }

    const { startIndex, endIndex, currentPage } = (typeof window.renderPaginationControls === 'function' ? window.renderPaginationControls : renderPaginationControls)({
        containerId: "biPnlPaginationContainer",
        totalItems: list.length,
        currentPage: biPnlCurrentPage,
        pageSize: biPnlPageSize,
        onPageChange: "goToBiPnlPage",
        onPageSizeChange: "changeBiPnlPageSize",
        itemLabel: "obra(s)",
        pageSizeOptions: [5, 10, 20]
    });
    biPnlCurrentPage = currentPage;

    const pageItems = list.slice(startIndex, endIndex);
    pnlTbody.innerHTML = pageItems.map(p => {
        const rawP = (biRawProjects || []).find(rp => rp.id === (p.project_id || p.id));
        const loc = rawP?.location || p.location || 'Sede Central (Guacara)';
        
        const contr = Number(p.contract_amount_usd || 0);
        const inv = Number(p.invoiced_usd ?? p.total_invoiced_usd ?? 0);
        const col = Number(p.collected_usd ?? p.collected_cxc_usd ?? 0);
        const cost = Number(p.cost_usd ?? p.total_cost_usd ?? 0);
        const profit = Number(p.profit_usd ?? p.net_profit_usd ?? (col - cost));
        const margin = Number(p.margin_pct ?? p.net_margin_percent ?? (cost > 0 ? (profit / cost * 100) : (col > 0 ? 100 : 0)));
        const isProfitable = profit >= 0;

        return `
        <tr style="border-bottom: 1px solid #e2e8f0; hover: background: #f8fafc;">
            <td style="padding: 9px 8px; font-weight: 800; color: #0284c7;">${p.code}</td>
            <td style="padding: 9px 8px; font-weight: 700; color: #0f172a;">${p.name}</td>
            <td style="padding: 9px 8px; color: #334155; font-weight: 600;">${p.client_name || 'General'}</td>
            <td style="padding: 9px 8px; color: #475569; font-size: 11px;"><i class="fa-solid fa-location-dot" style="color:#0284c7;"></i> ${loc}</td>
            <td style="padding: 9px 8px; text-align: right; font-weight: 700; color: #0f172a;">$${contr.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td style="padding: 9px 8px; text-align: right; font-weight: 700; color: #2563eb;">$${inv.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td style="padding: 9px 8px; text-align: right; font-weight: 800; color: #059669;">$${col.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td style="padding: 9px 8px; text-align: right; font-weight: 800; color: #dc2626;">$${cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td style="padding: 9px 8px; text-align: right; font-weight: 900; color: ${isProfitable ? '#059669' : '#dc2626'};">
                $${profit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </td>
            <td style="padding: 9px 8px; text-align: right; font-weight: 800; color: ${isProfitable ? '#059669' : '#dc2626'};">
                ${margin.toFixed(1)}%
            </td>
        </tr>`;
    }).join('');
}

function filterBIDashboard() {
    renderExecutiveDashboardContent();
}

function populateBISlicers() {
    populateBIClientSlicer();
}

function renderBIAnalyticsCharts() {}

function renderCleanRadialCharts() {}







// --- BLOQUE L10942-L11091 ---
// ==============================================================================

// 💾 18. MÓDULO DE COPIAS DE SEGURIDAD & RESPALDOS AUTOMÁTICOS

// ==============================================================================

async function loadBackupsList() {

    const tbody = document.getElementById('backupsTableBody');

    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #94a3b8; padding: 16px;"><i class="fa-solid fa-spinner fa-spin"></i> Consultando copias de seguridad...</td></tr>`;



    try {

        const res = await authFetch(`${API_BASE}/maintenance/backups`);

        const list = await res.json();



        if (list.length === 0) {

            tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #94a3b8; padding: 16px;">No hay respaldos generados aún. Haz clic en "Generar Respaldo Ahora".</td></tr>`;

            return;

        }



        tbody.innerHTML = list.map(b => `

            <tr>

                <td style="font-weight: 700; color: #64748b; font-size: 11px;">${b.created_at}</td>

                <td style="font-weight: 800; color: var(--dalor-navy); font-family: monospace;">${b.filename}</td>

                <td style="font-weight: 700; color: #0284c7;">${b.size_kb} KB</td>

                <td><span style="background: #d1fae5; color: #065f46; padding: 2px 8px; border-radius: 4px; font-weight: 800; font-size: 11px;">Disponible</span></td>

                <td style="text-align: right;">

                    <a href="${API_BASE}/maintenance/backups/download/${b.filename}" target="_blank" class="btn-secondary" style="padding: 4px 8px; font-size: 11px; text-decoration: none; margin-right: 4px;" title="Descargar copia">

                        <i class="fa-solid fa-download"></i> Descargar

                    </a>

                    <button onclick="restoreBackup('${b.filename}')" class="btn-secondary" style="padding: 4px 8px; font-size: 11px; color: #b45309;" title="Restaurar a esta versión">

                        <i class="fa-solid fa-rotate-left"></i> Restaurar

                    </button>

                </td>

            </tr>

        `).join('');



    } catch (e) {

        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #e11d48; padding: 16px;">Error al cargar copias de seguridad.</td></tr>`;

    }

}



async function createNewBackup() {

    try {

        const res = await authFetch(`${API_BASE}/maintenance/backups/create`, { method: 'POST' });

        const data = await res.json();

        if (data.success) {

            alert(`✅ ${data.message}`);

            loadBackupsList();

        } else {

            alert('Error al generar respaldo.');

        }

    } catch (e) {

        alert('Error de conexión al generar respaldo: ' + e.message);

    }

}



async function restoreBackup(filename) {

    if (!confirm(`⚠️ ¿Estás seguro de restaurar la base de datos al estado de '${filename}'?\n\nSe creará un respaldo automático preventivo antes de aplicar la restauración.`)) {

        return;

    }



    try {

        const res = await authFetch(`${API_BASE}/maintenance/backups/restore/${filename}`, { method: 'POST' });

        const data = await res.json();

        if (data.success) {

            alert(`✅ ${data.message}`);

            loadInitialMasterData();

            loadExecutiveDashboard();

            loadBackupsList();

        } else {

            alert('Error al restaurar respaldo.');

        }

    } catch (e) {

        alert('Error al restaurar respaldo: ' + e.message);

    }

}





// --- BLOQUE L12542-L12739 ---
// ==============================================================================

// 👤 GESTIÓN Y CREACIÓN DE USUARIOS DE SISTEMA

// ==============================================================================

async function openUserManagementModal() {

    openModal("modalUserManagement");

    await loadUsersManagementTable();

}



async function loadUsersManagementTable() {

    const tbody = document.getElementById("userManagementTableBody");

    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #94a3b8; padding: 20px;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando usuarios...</td></tr>`;



    try {

        const res = await authFetch(`${API_BASE}/auth/users`);

        if (!res.ok) throw new Error("Error al obtener usuarios");

        const users = await res.json();



        if (!users || users.length === 0) {

            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #94a3b8; padding: 20px;">No hay usuarios registrados.</td></tr>`;

            return;

        }



        const roleNamesMap = {

            "director_general": "Director General / Socio",

            "administrador_financiero": "Administración & Finanzas",

            "ingeniero_obra": "Ingeniero Residente de Obra",

            "supervisor_campo": "Supervisor de Campo / Faena"

        };



        tbody.innerHTML = users.map(u => `

            <tr>

                <td><b style="color: var(--dalor-navy); font-family: monospace;">@${u.username}</b></td>

                <td><b>${u.full_name}</b></td>

                <td><span style="color: #64748b; font-size: 11px;">${u.email || '-'}</span></td>

                <td><span class="badge-tag" style="background: #e0f2fe; color: #0369a1; font-size: 10px;">${roleNamesMap[u.role_name] || u.role_name}</span></td>

                <td><span style="color: ${u.is_active ? '#059669' : '#ef4444'}; font-weight: 700; font-size: 11px;">${u.is_active ? '● Activo' : '○ Inactivo'}</span></td>

                <td><span style="color: #64748b; font-size: 11px;">${u.last_login}</span></td>

            </tr>

        `).join("");

    } catch (err) {

        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #ef4444; padding: 20px;">Error al cargar usuarios: ${err.message}</td></tr>`;

    }

}



function openNewUserModal_v2() {

    const form = document.getElementById("newUserForm");

    if (form) form.reset();

    openModal("modalNewUser");

}



async function submitCreateUser_v2(e) {

    e.preventDefault();

    const username = document.getElementById("nusr_username").value.trim();

    const password = document.getElementById("nusr_password").value.trim();

    const fullname = document.getElementById("nusr_fullname").value.trim();

    const email = document.getElementById("nusr_email").value.trim();

    const role = document.getElementById("nusr_role").value;



    const payload = {

        username: username,

        password: password,

        full_name: fullname,

        email: email || null,

        role_name: role,

        is_active: true,

        is_superuser: role === "director_general"

    };



    try {

        const res = await authFetch(`${API_BASE}/auth/users`, {

            method: "POST",

            headers: { "Content-Type": "application/json" },

            body: JSON.stringify(payload)

        });



        if (!res.ok) {

            const err = await res.json();

            throw new Error(err.detail || "Error al crear usuario");

        }



        closeModal("modalNewUser");

        alert(`✅ Usuario @${username} (${fullname}) creado exitosamente.`);

        await loadUsersManagementTable();

    } catch (err) {

        alert(`❌ Error: ${err.message}`);

    }

}



function openMaintenanceSubtab_v2(subtab) {

    if (subtab === 'users') {

        openUserManagementModal();

    } else {

        alert(`Módulo de ${subtab} activo.`);

    }

}










// --- PUENTE DE COMPATIBILIDAD CON WINDOW & HTML INLINE ---
if (typeof window !== 'undefined') {
    window.applyPermissionMap = applyPermissionMap;
    window.checkAuthStatus = checkAuthStatus;
    window.createNewBackup = createNewBackup;
    window.deleteClient = deleteClient;
    window.fillAndSubmitQuickLogin = fillAndSubmitQuickLogin;
    window.fillQuickLogin = fillQuickLogin;
    window.filterBIDashboard = filterBIDashboard;
    window.filterBIExtended = filterBIExtended;
    window.handleLogout = handleLogout;
    window.loadBackupsList = loadBackupsList;
    window.loadCategoriesTree = loadCategoriesTree;
    window.loadClients = loadClients;
    window.loadComparisonDashboard = loadComparisonDashboard;
    window.loadExecutiveDashboard = loadExecutiveDashboard;
    window.loadMaintenanceAuditLogs = loadMaintenanceAuditLogs;
    window.loadMaintenanceUsersList = loadMaintenanceUsersList;
    window.loadUsersManagementTable = loadUsersManagementTable;
    window.loginDirectlyAs = loginDirectlyAs;
    window.onUserRoleTemplateChanged = onUserRoleTemplateChanged;
    window.openMaintenanceSubtab = openMaintenanceSubtab;
    window.openMaintenanceSubtab_v2 = openMaintenanceSubtab_v2;
    window.openNewClientModal = openNewClientModal;
    window.openNewUserModal = openNewUserModal;
    window.openNewUserModal_v2 = openNewUserModal_v2;
    window.openUserManagementModal = openUserManagementModal;
    window.openUserPermissionsModal = openUserPermissionsModal;
    window.populateBISlicers = populateBISlicers;
    window.redirectUserByRole = redirectUserByRole;
    window.renderBIAnalyticsCharts = renderBIAnalyticsCharts;
    window.renderBIPnlTable = renderBIPnlTable;
    window.goToBiPnlPage = goToBiPnlPage;
    window.changeBiPnlPageSize = changeBiPnlPageSize;
    window.renderBIPnlTablePaginated = renderBIPnlTablePaginated;
    window.renderCleanRadialCharts = renderCleanRadialCharts;
    window.renderUserBadge = renderUserBadge;
    window.restoreBackup = restoreBackup;
    window.showLoginError = showLoginError;
    window.submitCreateClient = submitCreateClient;
    window.submitCreateUser = submitCreateUser;
    window.submitCreateUser_v2 = submitCreateUser_v2;
    window.submitLogin = submitLogin;
    window.submitSaveUserPermissions = submitSaveUserPermissions;
    window.filterMaintenanceAuditLogs = filterMaintenanceAuditLogs;
    window.resetMaintenanceAuditFilters = resetMaintenanceAuditFilters;
    window.switchMaintenanceSubtab = switchMaintenanceSubtab;
    window.toggleUserStatus = toggleUserStatus;
    window.goToClientsPage = goToClientsPage;
    window.changeClientsPageSize = changeClientsPageSize;
    window.renderClientsPaginated = renderClientsPaginated;
    window.onClientSearchInput = onClientSearchInput;
    window.openEditClientModal = openEditClientModal;
    window.submitEditClient = submitEditClient;
    window.openClientHistoryModal = openClientHistoryModal;
    window.debouncedFilterComparisonDashboard = debouncedFilterComparisonDashboard;
    window.filterComparisonDashboard = filterComparisonDashboard;
    window.goToComparisonPage = goToComparisonPage;
    window.changeComparisonPageSize = changeComparisonPageSize;
    window.openCategoryHistoryModal = openCategoryHistoryModal;
    window.debouncedFilterCategoryHistory = debouncedFilterCategoryHistory;
    window.filterCategoryHistory = filterCategoryHistory;
    window.loadMaintenanceRolesList = loadMaintenanceRolesList;
    window.openNewRoleModal = openNewRoleModal;
    window.openEditRoleModal = openEditRoleModal;
    window.autoGenerateRoleSlug = autoGenerateRoleSlug;
    window.submitRoleForm = submitRoleForm;
    window.deleteRole = deleteRole;
    window.onNewUserRoleChanged = onNewUserRoleChanged;
    window.toggleAllRoleCheckboxes = toggleAllRoleCheckboxes;
    window.toggleAllUserCheckboxes = toggleAllUserCheckboxes;
    window.goToAuditPage = goToAuditPage;
    window.changeAuditPageSize = changeAuditPageSize;
}

export { applyPermissionMap, checkAuthStatus, createNewBackup, deleteClient, fillAndSubmitQuickLogin, fillQuickLogin, filterBIDashboard, filterBIExtended, filterMaintenanceAuditLogs, handleLogout, loadBackupsList, loadCategoriesTree, loadClients, loadComparisonDashboard, debouncedFilterComparisonDashboard, filterComparisonDashboard, goToComparisonPage, changeComparisonPageSize, loadExecutiveDashboard, loadMaintenanceAuditLogs, loadMaintenanceUsersList, loadMaintenanceRolesList, openNewRoleModal, openEditRoleModal, autoGenerateRoleSlug, submitRoleForm, deleteRole, onNewUserRoleChanged, loadUsersManagementTable, loginDirectlyAs, onUserRoleTemplateChanged, openMaintenanceSubtab, openMaintenanceSubtab_v2, openNewClientModal, openNewUserModal, openNewUserModal_v2, openUserManagementModal, openUserPermissionsModal, populateBISlicers, redirectUserByRole, renderBIAnalyticsCharts, renderBIPnlTable, goToBiPnlPage, changeBiPnlPageSize, renderBIPnlTablePaginated, renderCleanRadialCharts, renderUserBadge, resetMaintenanceAuditFilters, restoreBackup, showLoginError, submitCreateClient, submitCreateUser, submitCreateUser_v2, submitLogin, submitSaveUserPermissions, switchMaintenanceSubtab, toggleUserStatus, goToClientsPage, changeClientsPageSize, renderClientsPaginated, onClientSearchInput, openEditClientModal, submitEditClient, openClientHistoryModal, openCategoryHistoryModal, debouncedFilterCategoryHistory, filterCategoryHistory, goToCategoryHistoryPage, changeCategoryHistoryPageSize, openCreateCategoryModal, submitCreateCategory, toggleCategoryActive, goToAuditPage, changeAuditPageSize };
