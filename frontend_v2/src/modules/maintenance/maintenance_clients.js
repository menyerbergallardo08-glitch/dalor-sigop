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

// --- BLOQUE L6328-L6484 ---
// ----------------------------------------------------

// 8. MÓDULO DE CLIENTES

// ----------------------------------------------------

var allClients = window.allClients = window.allClients || [];
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
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px; color: #94a3b8;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando clientes...</td></tr>`;

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






// Exponer al objeto global window para eventos inline y compatibilidad
if (typeof window !== 'undefined') {
    window.goToClientsPage = goToClientsPage;
    window.changeClientsPageSize = changeClientsPageSize;
    window.renderClientsPaginated = renderClientsPaginated;
    window.loadClients = loadClients;
    window.onClientSearchInput = onClientSearchInput;
    window.applyClientSorting = applyClientSorting;
    window.openEditClientModal = openEditClientModal;
    window.submitEditClient = submitEditClient;
    window.openClientHistoryModal = openClientHistoryModal;
    window.openNewClientModal = openNewClientModal;
    window.submitCreateClient = submitCreateClient;
    window.deleteClient = deleteClient;
}
