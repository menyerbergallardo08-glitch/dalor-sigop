/**
 * DALOR SIGO-P | Módulo: RENTALS_LIST.JS
 * Listado, filtros, KPIs operativos, paginación y anulación de órdenes de alquiler y préstamo.
 */

var API_BASE = window.API_BASE || (window.location.origin + "/api/v1");
var allRentals = window.allRentals = window.allRentals || [];
var currentFilteredRentals = [];
var rentalCurrentPage = 1;
var rentalPageSize = 10;

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

// --- CARGA Y RENDERIZADO DE ALQUILERES & PRÉSTAMOS ---
export async function loadRentalsList() {
    const tbody = document.getElementById("rentalsTableBody");
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="11" style="text-align: center; padding: 25px; color: #94a3b8;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando control de alquileres y préstamos...</td></tr>`;

    try {
        const token = window.authToken || localStorage.getItem('dalor_token') || null;
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        const res = await authFetch(`${API_BASE}/rentals/`, { headers });
        if (!res.ok) throw new Error("Error en la respuesta del servidor");

        allRentals = window.allRentals = await res.json();
        updateRentalsKPIs(allRentals);

        // Poblar selector inteligente de clientes en filtros
        const clientFilter = document.getElementById("rentalFilterClient");
        if (clientFilter) {
            const currentSelected = clientFilter.value;
            const entities = new Set();
            (window.allClients || []).forEach(c => {
                if (c.name) entities.add(c.name.trim());
            });
            (allRentals || []).forEach(r => {
                if (r.external_entity) entities.add(r.external_entity.trim());
            });
            const sortedEntities = Array.from(entities).sort();
            clientFilter.innerHTML = `<option value="">Todos los Clientes / Contrapartes (${sortedEntities.length})</option>` +
                sortedEntities.map(e => `<option value="${e}" ${e === currentSelected ? 'selected' : ''}>${e}</option>`).join('');
        }

        applyRentalsFilter();
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="11" style="text-align: center; padding: 20px; color: #e11d48; font-weight: 600;">Error al cargar registros: ${e.message}</td></tr>`;
    }
}

export function updateRentalsKPIs(items) {
    const arr = items || [];
    const kpiSalidas = document.getElementById("kpi_rentals_salidas_count") || document.getElementById("rentalKpiDalorTercero");
    const kpiEntradas = document.getElementById("kpi_rentals_entradas_count") || document.getElementById("rentalKpiTerceroDalor");
    const kpiTotal = document.getElementById("rentalKpiTotalActive");
    const kpiReturned = document.getElementById("rentalKpiReturned");
    const kpiTarifa = document.getElementById("kpi_rentals_daily_rate_usd");
    const badgeCount = document.getElementById("rentals_count_badge");

    const activasSalidas = arr.filter(r => r.direction === 'dalor_a_tercero' && (r.status === 'activo' || r.status === 'retorno_parcial'));
    const activasEntradas = arr.filter(r => r.direction === 'tercero_a_dalor' && (r.status === 'activo' || r.status === 'retorno_parcial'));
    const totalActivos = arr.filter(r => r.status === 'activo' || r.status === 'retorno_parcial');
    const totalDevueltos = arr.filter(r => (r.status || '').startsWith('devuelto'));
    
    let totalTarifaDia = 0;
    arr.filter(r => (r.status === 'activo' || r.status === 'retorno_parcial') && r.operation_type === 'alquiler').forEach(r => {
        if (r.rate_period === 'dia') totalTarifaDia += (r.rate_usd || 0);
        else if (r.rate_period === 'semana') totalTarifaDia += (r.rate_usd || 0) / 7;
        else if (r.rate_period === 'mes') totalTarifaDia += (r.rate_usd || 0) / 30;
    });

    if (kpiSalidas) kpiSalidas.innerText = activasSalidas.length;
    if (kpiEntradas) kpiEntradas.innerText = activasEntradas.length;
    if (kpiTotal) kpiTotal.innerText = totalActivos.length;
    if (kpiReturned) kpiReturned.innerText = totalDevueltos.length;
    if (kpiTarifa) kpiTarifa.innerText = `$${totalTarifaDia.toFixed(2)}/día`;
    if (badgeCount) badgeCount.innerText = `${arr.length} Registros`;
}

// --- FILTRADO Y PAGINACIÓN ---
export function applyRentalsFilter() {
    const q = (document.getElementById("rentalFilterSearch")?.value || "").toLowerCase().trim();
    const clientVal = (document.getElementById("rentalFilterClient")?.value || "").toLowerCase().trim();
    const dir = document.getElementById("rentalFilterDirection")?.value || "";
    const type = document.getElementById("rentalFilterType")?.value || "";
    const status = document.getElementById("rentalFilterStatus")?.value || "";

    let filtered = Array.isArray(allRentals) ? [...allRentals] : [];

    if (q) {
        filtered = filtered.filter(r => 
            (r.operation_code || '').toLowerCase().includes(q) ||
            (r.equipment_name || '').toLowerCase().includes(q) ||
            (r.external_entity || '').toLowerCase().includes(q) ||
            (r.destination_reference || '').toLowerCase().includes(q) ||
            (r.contact_person || '').toLowerCase().includes(q) ||
            (r.notes || '').toLowerCase().includes(q)
        );
    }

    if (clientVal) {
        filtered = filtered.filter(r => (r.external_entity || '').toLowerCase().trim() === clientVal);
    }

    if (dir) {
        filtered = filtered.filter(r => r.direction === dir);
    }

    if (type) {
        filtered = filtered.filter(r => r.operation_type === type);
    }

    if (status) {
        if (status === 'activo') {
            filtered = filtered.filter(r => r.status === 'activo' || r.status === 'retorno_parcial');
        } else if (status.startsWith('devuelto')) {
            filtered = filtered.filter(r => r.status === status);
        }
    }

    currentFilteredRentals = filtered;
    rentalCurrentPage = 1;
    renderRentalsTablePaginated();
}

let filterDebounceTimer = null;
export function debouncedApplyRentalsFilter() {
    clearTimeout(filterDebounceTimer);
    filterDebounceTimer = setTimeout(applyRentalsFilter, 250);
}

export function goToRentalsPage(page) {
    rentalCurrentPage = page;
    renderRentalsTablePaginated();
}

export function renderRentalsTablePaginated() {
    const tbody = document.getElementById("rentalsTableBody");
    if (!tbody) return;

    const items = currentFilteredRentals || [];
    const totalItems = items.length;
    const totalPages = Math.ceil(totalItems / rentalPageSize) || 1;

    if (rentalCurrentPage > totalPages) rentalCurrentPage = totalPages;
    if (rentalCurrentPage < 1) rentalCurrentPage = 1;

    const startIndex = (rentalCurrentPage - 1) * rentalPageSize;
    const endIndex = Math.min(startIndex + rentalPageSize, totalItems);
    const pageItems = items.slice(startIndex, endIndex);

    const infoEl = document.getElementById("rentalsPaginationInfo");
    const controlsEl = document.getElementById("rentalsPaginationControls");

    if (infoEl) {
        infoEl.innerText = totalItems > 0 
            ? `Mostrando ${startIndex + 1} - ${endIndex} de ${totalItems} operaciones (Pág. ${rentalCurrentPage} de ${totalPages})`
            : "No hay operaciones registradas";
    }

    if (controlsEl) {
        let btns = '';
        btns += `<button type="button" class="btn-secondary" style="padding: 4px 8px; font-size: 11px;" ${rentalCurrentPage <= 1 ? 'disabled' : ''} onclick="goToRentalsPage(${rentalCurrentPage - 1})"><i class="fa-solid fa-chevron-left"></i> Anterior</button>`;
        
        for (let p = 1; p <= totalPages; p++) {
            if (totalPages > 7 && Math.abs(p - rentalCurrentPage) > 2 && p !== 1 && p !== totalPages) {
                if (p === 2 || p === totalPages - 1) btns += `<span style="padding: 0 4px; color: #94a3b8;">...</span>`;
                continue;
            }
            btns += `<button type="button" class="${p === rentalCurrentPage ? 'btn-primary' : 'btn-secondary'}" style="padding: 4px 9px; font-size: 11px; font-weight: 700;" onclick="goToRentalsPage(${p})">${p}</button>`;
        }

        btns += `<button type="button" class="btn-secondary" style="padding: 4px 8px; font-size: 11px;" ${rentalCurrentPage >= totalPages ? 'disabled' : ''} onclick="goToRentalsPage(${rentalCurrentPage + 1})">Siguiente <i class="fa-solid fa-chevron-right"></i></button>`;
        controlsEl.innerHTML = btns;
    }

    if (pageItems.length === 0) {
        tbody.innerHTML = `<tr><td colspan="11" style="text-align: center; padding: 35px; color: #64748b;">
            <i class="fa-solid fa-handshake" style="font-size: 32px; color: #cbd5e1; margin-bottom: 8px; display: block;"></i>
            <span style="font-size: 13px; font-weight: 700;">No hay préstamos ni alquileres registrados con este filtro.</span><br>
            <span style="font-size: 11px; color: #94a3b8;">Usa el botón "+ Nuevo Alquiler / Préstamo" para registrar salidas o recepciones.</span>
        </td></tr>`;
        return;
    }

    tbody.innerHTML = pageItems.map(r => {
        const isSalida = r.direction === 'dalor_a_tercero';
        const dirBadge = isSalida 
            ? `<span style="background: #e0f2fe; color: #0369a1; font-weight: 800; font-size: 10px; padding: 3px 7px; border-radius: 6px; display: inline-flex; align-items: center; gap: 4px;"><i class="fa-solid fa-arrow-up-right-from-square"></i> DALOR ➔ Tercero</span>`
            : `<span style="background: #fef3c7; color: #92400e; font-weight: 800; font-size: 10px; padding: 3px 7px; border-radius: 6px; display: inline-flex; align-items: center; gap: 4px;"><i class="fa-solid fa-arrow-down-left-and-up-right-to-center"></i> Tercero ➔ DALOR</span>`;

        const isAlquiler = r.operation_type === 'alquiler';
        const tipoBadge = isAlquiler
            ? `<span style="font-weight: 800; color: #0284c7; font-size: 11px;"><i class="fa-solid fa-tag"></i> Alquiler</span>`
            : `<span style="font-weight: 800; color: #059669; font-size: 11px;"><i class="fa-solid fa-handshake-angle"></i> Préstamo</span>`;

        const tarifaText = isAlquiler
            ? `<strong style="color: var(--dalor-navy); font-size: 11.5px;">$${Number(r.rate_usd || 0).toFixed(2)}</strong><span style="font-size: 10px; color: #64748b;">/${r.rate_period || 'día'}</span>`
            : `<span style="font-size: 11px; font-weight: 700; color: #059669;">Sin Costo</span>`;

        let statusBadge = '';
        if (r.status === 'activo') {
            if (r.is_overdue) {
                statusBadge = `<span style="background: #fee2e2; color: #b91c1c; font-weight: 800; font-size: 10px; padding: 2px 7px; border-radius: 4px;"><i class="fa-solid fa-triangle-exclamation"></i> En Mora</span>`;
            } else {
                statusBadge = `<span style="background: #dcfce7; color: #15803d; font-weight: 800; font-size: 10px; padding: 2px 7px; border-radius: 4px;"><i class="fa-solid fa-circle-check"></i> Activo</span>`;
            }
        } else if (r.status === 'retorno_parcial') {
            statusBadge = `<span style="background: #e0f2fe; color: #0369a1; font-weight: 800; font-size: 10px; padding: 2px 7px; border-radius: 4px;"><i class="fa-solid fa-boxes-packing"></i> Ret. Parcial</span>`;
        } else if (r.status === 'devuelto_conforme') {
            statusBadge = `<span style="background: #f1f5f9; color: #475569; font-weight: 700; font-size: 10px; padding: 2px 7px; border-radius: 4px;"><i class="fa-solid fa-check-double"></i> Conforme</span>`;
        } else {
            statusBadge = `<span style="background: #ffedd5; color: #c2410c; font-weight: 700; font-size: 10px; padding: 2px 7px; border-radius: 4px;"><i class="fa-solid fa-note-sticky"></i> C/ Novedad</span>`;
        }

        let actionsHtml = '';
        if (r.status === 'activo' || r.status === 'retorno_parcial') {
            actionsHtml += `<button type="button" onclick="openReturnRentalModal(${r.id})" class="btn-primary" style="font-size: 11px; padding: 4px 8px; background: #059669; border-radius: 6px; font-weight: 700;" title="Registrar Retorno / Devolución"><i class="fa-solid fa-rotate-left"></i> Retorno</button> `;
        }
        actionsHtml += `<button type="button" onclick="openEditRentalModal(${r.id})" class="btn-secondary" style="font-size: 11px; padding: 4px 8px; border-radius: 6px; font-weight: 700; color: #d97706; border-color: #fde68a;" title="Editar Registro"><i class="fa-solid fa-pen"></i></button> `;
        actionsHtml += `<button type="button" onclick="printRentalDeliveryNote(${r.id})" class="btn-secondary" style="font-size: 11px; padding: 4px 8px; border-radius: 6px; font-weight: 700; color: #0284c7; border-color: #bae6fd;" title="Imprimir Guía de Entrega / Despacho"><i class="fa-solid fa-file-invoice"></i> Guía</button> `;
        actionsHtml += `<button type="button" onclick="deleteRentalRecord(${r.id})" class="btn-secondary" style="font-size: 11px; padding: 4px 8px; color: #ef4444; border-color: #fecaca; border-radius: 6px;" title="Anular Registro"><i class="fa-solid fa-trash-can"></i></button>`;

        const startDateStr = (r.start_date || '').split(' ')[0] || '-';
        const expectedDateStr = r.expected_return_date || '-';
        const destDisplay = r.destination_reference || (r.project_name ? r.project_name : 'Uso Particular / Sede');

        return `
            <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.15s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='white'">
                <td style="padding: 10px; font-weight: 800; color: var(--dalor-navy); font-size: 11.5px;">${r.operation_code}</td>
                <td style="padding: 10px;">${dirBadge}</td>
                <td style="padding: 10px; font-size: 11px;">${tipoBadge}</td>
                <td style="padding: 10px;">
                    <strong style="color: var(--dalor-blue); font-size: 12px;">${r.equipment_name}</strong>
                    ${r.equipment_code ? `<span style="display:block; font-size:10px; color:#64748b; font-weight:600;">Cód: ${r.equipment_code}</span>` : ''}
                    ${r.items && r.items.length > 1 ? `<span style="display:inline-block; margin-top:2px; font-size:9.5px; background:#f1f5f9; color:#475569; padding:1px 5px; border-radius:4px; font-weight:700;">${r.items.length} recursos asociados</span>` : ''}
                </td>
                <td style="padding: 10px;">
                    <span style="font-weight: 700; color: #1e293b; font-size: 11.5px;">${r.external_entity}</span>
                    <span style="display:block; font-size:10px; color:#64748b;"><i class="fa-solid fa-location-dot" style="font-size:9px;"></i> ${destDisplay}</span>
                </td>
                <td style="padding: 10px; font-size: 11px;">
                    <span style="font-weight: 600; color: #334155;">${r.contact_person || '-'}</span>
                    ${r.contact_phone ? `<span style="display:block; font-size:10px; color:#64748b;"><i class="fa-solid fa-phone" style="font-size:9px;"></i> ${r.contact_phone}</span>` : ''}
                </td>
                <td style="padding: 10px; font-size: 11px; color: #475569;">${startDateStr}</td>
                <td style="padding: 10px; font-size: 11px; font-weight: 700; color: ${r.is_overdue ? '#b91c1c' : '#0369a1'};">${expectedDateStr}</td>
                <td style="padding: 10px;">${tarifaText}</td>
                <td style="padding: 10px; text-align: center;">${statusBadge}</td>
                <td style="padding: 10px; text-align: center; white-space: nowrap;">${actionsHtml}</td>
            </tr>
        `;
    }).join('');
}

export async function deleteRentalRecord(rentalId) {
    if (!confirm("¿Estás seguro de anular este registro de préstamo o alquiler?")) return;
    try {
        const token = window.authToken || localStorage.getItem('dalor_token') || null;
        const res = await authFetch(`${API_BASE}/rentals/${rentalId}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Error al eliminar");
        loadRentalsList();
        if (typeof window.showToast === 'function') {
            window.showToast("Registro de alquiler/préstamo eliminado.", "info");
        }
    } catch (e) {
        alert("Error: " + e.message);
    }
}

export function openRentalsSubtab() {
    if (typeof window.switchView === 'function') {
        window.switchView('resources', 'recursos');
    }
    if (typeof window.switchResourceSubtab === 'function') {
        window.switchResourceSubtab('rentals');
    } else {
        loadRentalsList();
    }
}

// PUENTE GLOBAL WINDOW
if (typeof window !== 'undefined') {
    window.loadRentalsList = loadRentalsList;
    window.updateRentalsKPIs = updateRentalsKPIs;
    window.applyRentalsFilter = applyRentalsFilter;
    window.debouncedApplyRentalsFilter = debouncedApplyRentalsFilter;
    window.goToRentalsPage = goToRentalsPage;
    window.renderRentalsTablePaginated = renderRentalsTablePaginated;
    window.deleteRentalRecord = deleteRentalRecord;
    window.openRentalsSubtab = openRentalsSubtab;
}
