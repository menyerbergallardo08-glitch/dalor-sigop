/**
 * DALOR SIGO-P | Módulo: DISPATCH_LIST.JS
 * Listado, filtros por estado/modalidad, paginación, confirmación de entrega y eliminación.
 */

var API_BASE = window.API_BASE || (window.location.origin + "/api/v1");
var allDispatchGuides = window.allDispatchGuides = window.allDispatchGuides || [];
var currentDispatchFilter = 'all';

function authFetch(url, options = {}) {
    var _t = sessionStorage.getItem('dalor_token') || localStorage.getItem('dalor_token') || '';
    var _h = Object.assign({}, options.headers || {});
    if (_t) _h['Authorization'] = 'Bearer ' + _t;
    return window.fetch(url, Object.assign({}, options, { headers: _h }));
}

// ==============================================================================
// LISTADO Y TABLA DE GUÍAS DE DESPACHO
// ==============================================================================
export async function loadDispatchGuidesList() {
    const tbody = document.getElementById('dispatchTableBody');
    const badge = document.getElementById('dispatch_count_badge');

    try {
        const res = await authFetch(`${API_BASE}/dispatch/`);
        if (!res.ok) throw new Error('Error al consultar guías de despacho.');
        allDispatchGuides = window.allDispatchGuides = await res.json();

        updateFilterCounters();
        renderDispatchTable();
        if (typeof window.loadProjectRequisitionsBadge === 'function') {
            window.loadProjectRequisitionsBadge();
        }
    } catch (err) {
        console.error('Error cargando guías de despacho:', err);
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: #ef4444; padding: 20px;">Error al cargar guías: ${err.message}</td></tr>`;
        }
        if (badge) badge.textContent = 'Error de conexión';
    }
}

export function updateFilterCounters() {
    const guides = allDispatchGuides || [];
    const countAll = guides.length;
    const countProject = guides.filter(g => !g.is_freeform && g.guide_type !== 'control_interno' && !(g.guide_number && g.guide_number.startsWith('GCI-'))).length;
    const countFreeform = guides.filter(g => g.is_freeform && g.guide_type !== 'control_interno' && !(g.guide_number && g.guide_number.startsWith('GCI-'))).length;
    const countInternal = guides.filter(g => g.guide_type === 'control_interno' || (g.guide_number && g.guide_number.startsWith('GCI-'))).length;
    const countIssued = guides.filter(g => g.status === 'emitida').length;
    const countTransit = guides.filter(g => g.status === 'en_transito').length;
    const countDelivered = guides.filter(g => g.status === 'entregada' || g.status === 'entregado_conforme').length;

    const elAll = document.getElementById('count_disp_all');
    const elProj = document.getElementById('count_disp_project');
    const elFree = document.getElementById('count_disp_freeform');
    const elInt = document.getElementById('count_disp_internal');
    const elIssued = document.getElementById('count_disp_issued');
    const elTrans = document.getElementById('count_disp_transit');
    const elDel = document.getElementById('count_disp_delivered');

    if (elAll) elAll.textContent = countAll;
    if (elProj) elProj.textContent = countProject;
    if (elFree) elFree.textContent = countFreeform;
    if (elInt) elInt.textContent = countInternal;
    if (elIssued) elIssued.textContent = countIssued;
    if (elTrans) elTrans.textContent = countTransit;
    if (elDel) elDel.textContent = countDelivered;
}

export function setDispatchFilter(filter) {
    currentDispatchFilter = filter;
    const filterButtons = ['all', 'project', 'freeform', 'internal', 'issued', 'transit', 'delivered'];
    filterButtons.forEach(f => {
        const btn = document.getElementById(`btn_disp_filter_${f}`);
        if (btn) {
            btn.className = (f === filter) ? 'btn-primary' : 'btn-secondary';
        }
    });
    renderDispatchTable();
}

export function filterDispatchList(query) {
    renderDispatchTable(query);
}

let lastFilteredDispatchGuides = [];
let dispatchCurrentPage = 1;
let dispatchPageSize = 15;

export function goToDispatchPage(page) {
    dispatchCurrentPage = page;
    renderDispatchPaginated();
    const tableEl = document.getElementById('dispatchTableBody');
    if (tableEl) tableEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

export function changeDispatchPageSize(size) {
    dispatchPageSize = parseInt(size) || 15;
    dispatchCurrentPage = 1;
    renderDispatchPaginated();
}

export function renderDispatchTable(searchQuery = "") {
    let guides = allDispatchGuides || [];

    // 1. Filtro de Categoría / Modalidad
    if (currentDispatchFilter === 'project') {
        guides = guides.filter(g => !g.is_freeform && g.guide_type !== 'control_interno' && !(g.guide_number && g.guide_number.startsWith('GCI-')));
    } else if (currentDispatchFilter === 'freeform') {
        guides = guides.filter(g => g.is_freeform && g.guide_type !== 'control_interno' && !(g.guide_number && g.guide_number.startsWith('GCI-')));
    } else if (currentDispatchFilter === 'internal') {
        guides = guides.filter(g => g.guide_type === 'control_interno' || (g.guide_number && g.guide_number.startsWith('GCI-')));
    } else if (currentDispatchFilter === 'issued') {
        guides = guides.filter(g => g.status === 'emitida');
    } else if (currentDispatchFilter === 'transit') {
        guides = guides.filter(g => g.status === 'en_transito');
    } else if (currentDispatchFilter === 'delivered') {
        guides = guides.filter(g => g.status === 'entregada' || g.status === 'entregado_conforme');
    }

    // 2. Filtro de Texto
    const q = (typeof searchQuery === 'string' ? searchQuery : (document.getElementById('dispatch_search_input')?.value || "")).trim().toLowerCase();
    if (q) {
        guides = guides.filter(g => 
            (g.guide_number && g.guide_number.toLowerCase().includes(q)) ||
            (g.client_name && g.client_name.toLowerCase().includes(q)) ||
            (g.recipient_name && g.recipient_name.toLowerCase().includes(q)) ||
            (g.project_code && g.project_code.toLowerCase().includes(q)) ||
            (g.project_name && g.project_name.toLowerCase().includes(q)) ||
            (g.transfer_reason && g.transfer_reason.toLowerCase().includes(q)) ||
            (g.driver_name && g.driver_name.toLowerCase().includes(q)) ||
            (g.vehicle_plate && g.vehicle_plate.toLowerCase().includes(q)) ||
            (g.delivered_by_staff && g.delivered_by_staff.toLowerCase().includes(q)) ||
            (g.received_by_staff && g.received_by_staff.toLowerCase().includes(q))
        );
    }

    const badge = document.getElementById('dispatch_count_badge');
    if (badge) {
        badge.textContent = `${guides.length} guías mostradas`;
    }

    lastFilteredDispatchGuides = guides;
    dispatchCurrentPage = 1;
    renderDispatchPaginated();
}

export function renderDispatchPaginated() {
    const tbody = document.getElementById('dispatchTableBody');
    if (!tbody) return;

    const guides = lastFilteredDispatchGuides;

    if (guides.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: #94a3b8; padding: 28px;">No se encontraron guías de despacho registradas con el filtro actual.</td></tr>`;
        const container = document.getElementById("dispatchPaginationContainer");
        if (container) container.innerHTML = "";
        return;
    }

    const paginateFn = typeof window.renderPaginationControls === 'function' 
        ? window.renderPaginationControls 
        : (typeof renderPaginationControls === 'function' ? renderPaginationControls : () => ({ startIndex: 0, endIndex: guides.length }));

    const { startIndex, endIndex } = paginateFn({
        containerId: "dispatchPaginationContainer",
        totalItems: guides.length,
        currentPage: dispatchCurrentPage,
        pageSize: dispatchPageSize,
        onPageChange: "goToDispatchPage",
        onPageSizeChange: "changeDispatchPageSize",
        itemLabel: "guía(s) de despacho",
        pageSizeOptions: [10, 15, 25, 50, 100]
    });

    const pageItems = guides.slice(startIndex, endIndex);

    tbody.innerHTML = pageItems.map(g => {
        const isInternal = (g.guide_type === 'control_interno' || (g.guide_number && g.guide_number.startsWith('GCI-')));
        const isFreeform = !!g.is_freeform;
        const isDelivered = (g.status === 'entregada' || g.status === 'entregado_conforme');
        const isIssued = (g.status === 'emitida');
        const statusBadge = isDelivered
            ? `<span style="background: #ecfdf5; color: #047857; font-weight: 800; padding: 3px 8px; border-radius: 12px; font-size: 10.5px; border: 1px solid #a7f3d0;"><i class="fa-solid fa-circle-check"></i> ${isInternal ? 'Conforme Sede' : 'Entregada'}</span>`
            : (isIssued
                ? `<span style="background: #fefce8; color: #a16207; font-weight: 800; padding: 3px 8px; border-radius: 12px; font-size: 10.5px; border: 1px solid #fef08a;"><i class="fa-solid fa-file-circle-check"></i> ${isInternal ? 'Emitida (Taller)' : 'Emitida'}</span>`
                : `<span style="background: #fff7ed; color: #c2410c; font-weight: 800; padding: 3px 8px; border-radius: 12px; font-size: 10.5px; border: 1px solid #fed7aa;"><i class="fa-solid fa-truck-fast"></i> En Tránsito</span>`);

        let typeBadge = '';
        if (isInternal) {
            typeBadge = `<span style="background: #eff6ff; color: #1e40af; font-weight: 800; padding: 2px 7px; border-radius: 6px; font-size: 10px; border: 1px solid #bfdbfe;"><i class="fa-solid fa-warehouse"></i> Interno GCI</span>`;
        } else if (isFreeform) {
            typeBadge = `<span style="background: #fef3c7; color: #92400e; font-weight: 800; padding: 2px 7px; border-radius: 6px; font-size: 10px; border: 1px solid #fde68a;"><i class="fa-solid fa-feather-pointed"></i> Libre</span>`;
        } else {
            typeBadge = `<span style="background: #e0f2fe; color: #0369a1; font-weight: 800; padding: 2px 7px; border-radius: 6px; font-size: 10px; border: 1px solid #bae6fd;"><i class="fa-solid fa-building"></i> Obra</span>`;
        }

        let clientDisplay = '';
        let projectDisplay = '';
        let transportDisplay = '';

        if (isInternal) {
            const area = g.destination_plant || 'Taller Metalmecánico';
            clientDisplay = `<div><b>${area}</b></div><div style="font-size: 10px; color: #64748b;">Sede Central Guacara</div>`;
            projectDisplay = g.project_name ? `${g.project_code || 'PRJ'} - ${g.project_name}` : (g.transfer_reason || 'Uso en Taller');
            transportDisplay = `<div><b>${g.delivered_by_staff || 'Almacén'} &rarr; ${g.received_by_staff || 'Taller'}</b></div><div style="font-size: 10px; color: #64748b;">Custodia Interna</div>`;
        } else {
            const cName = isFreeform ? (g.recipient_name || 'Destinatario Libre') : (g.client_name || 'Cliente DALOR');
            clientDisplay = `<div>${cName}</div><div style="font-size: 10px; color: #64748b; font-weight: 400;">${g.destination_plant ? g.destination_plant + ' &bull; ' : ''}${g.destination_address || ''}</div>`;
            projectDisplay = isFreeform ? (g.transfer_reason || 'Traslado Libre') : (g.project_code ? `${g.project_code} - ${g.project_name}` : 'Servicio Directo');
            transportDisplay = `<div><b>${g.driver_name || 'Personal DALOR'}</b></div><div style="font-size: 10px; color: #64748b;">${g.vehicle_plate || 'S/P'} &bull; ${g.transport_type === 'flete_tercerizado' ? 'Tercerizado' : (g.transport_type === 'retiro_cliente' ? 'Retiro' : 'DALOR')}</div>`;
        }

        return `
            <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.15s ease;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'">
                <td style="padding: 10px; font-weight: 900; color: var(--dalor-navy);">
                    ${g.guide_number}
                </td>
                <td style="padding: 10px; color: #64748b; font-size: 11px;">
                    ${g.dispatch_date || '-'}
                </td>
                <td style="padding: 10px; text-align: center;">
                    ${typeBadge}
                </td>
                <td style="padding: 10px; font-weight: 700; color: #1e293b;">
                    ${clientDisplay}
                </td>
                <td style="padding: 10px; color: #334155; font-size: 11.5px;">
                    ${projectDisplay}
                </td>
                <td style="padding: 10px; font-size: 11.5px; color: #475569;">
                    ${transportDisplay}
                </td>
                <td style="padding: 10px; text-align: center; font-weight: 700;">
                    <span style="background: #f1f5f9; color: #334155; padding: 2px 7px; border-radius: 10px; font-size: 11px;">
                        ${g.items_count || (g.items ? g.items.length : 0)} renglones
                    </span>
                </td>
                <td style="padding: 10px; text-align: right; font-weight: 800; color: #475569;">
                    $${(g.freight_cost_usd || 0).toFixed(2)}
                </td>
                <td style="padding: 10px; text-align: center;">
                    ${statusBadge}
                </td>
                <td style="padding: 10px; text-align: center;">
                    <div style="display: inline-flex; gap: 4px;">
                        <button type="button" onclick="printOfficialDispatchGuide(${g.id})" class="btn-secondary" style="padding: 4px 8px; font-size: 11px;" title="Ver e Imprimir Guía Oficial">
                            <i class="fa-solid fa-print"></i>
                        </button>
                        ${(!isDelivered) ? `
                            <button type="button" onclick="openConfirmDeliveryModal(${g.id}, '${g.guide_number}')" class="btn-primary" style="padding: 4px 8px; font-size: 11px; background: #059669;" title="Confirmar Recepción / Entrega">
                                <i class="fa-solid fa-clipboard-check"></i>
                            </button>
                        ` : ''}
                        <button type="button" onclick="deleteDispatchGuide(${g.id}, '${g.guide_number}')" class="btn-secondary" style="padding: 4px 8px; font-size: 11px; color: #dc2626;" title="Eliminar Guía">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// ==============================================================================
// CONFIRMACIÓN DE ENTREGA EN CLIENTE
// ==============================================================================
export function openConfirmDeliveryModal(guideId, guideNum) {
    const hiddenId = document.getElementById('conf_disp_id');
    const textLabel = document.getElementById('conf_disp_guide_text');
    if (hiddenId) hiddenId.value = guideId;
    if (textLabel) {
        textLabel.innerHTML = `Registra los datos de recepción para la <b>Guía N° ${guideNum}</b>:`;
    }
    if (typeof window.openModal === 'function') {
        window.openModal('modalConfirmDelivery');
    } else {
        const modal = document.getElementById('modalConfirmDelivery');
        if (modal) modal.classList.remove('hidden');
    }
}

export async function submitConfirmDelivery(event) {
    if (event && event.preventDefault) event.preventDefault();

    const guideId = document.getElementById('conf_disp_id')?.value;
    const receivedBy = (document.getElementById('conf_received_by')?.value || "").trim();
    const receivedIdDoc = (document.getElementById('conf_received_id_doc')?.value || "").trim();
    const notes = (document.getElementById('conf_notes')?.value || "").trim();

    if (!guideId || !receivedBy) {
        alert("Completa el nombre de la persona que recibió en destino.");
        return;
    }

    try {
        const res = await authFetch(`${API_BASE}/dispatch/${guideId}/confirm-delivery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                received_by: receivedBy,
                received_by_client_name: receivedBy,
                received_by_client_id_doc: receivedIdDoc || "V-Receptor",
                notes: notes
            })
        });

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.detail || 'Error al confirmar recepción.');
        }

        if (typeof window.closeModal === 'function') {
            window.closeModal('modalConfirmDelivery');
        } else {
            const modal = document.getElementById('modalConfirmDelivery');
            if (modal) modal.classList.add('hidden');
        }

        if (typeof window.showToast === 'function') {
            window.showToast('Recepción de entrega registrada exitosamente.', 'success');
        } else {
            alert('Recepción de entrega registrada exitosamente.');
        }

        await loadDispatchGuidesList();
    } catch (err) {
        console.error('Error confirmando recepción:', err);
        alert('Error: ' + err.message);
    }
}

// ==============================================================================
// ELIMINACIÓN DE GUÍA
// ==============================================================================
export async function deleteDispatchGuide(guideId, guideNum) {
    if (!confirm(`¿Estás seguro de anular/eliminar la Guía de Despacho N° ${guideNum}? Esta acción es irreversible.`)) {
        return;
    }

    try {
        const res = await authFetch(`${API_BASE}/dispatch/${guideId}`, {
            method: 'DELETE'
        });

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.detail || 'Error al eliminar guía.');
        }

        if (typeof window.showToast === 'function') {
            window.showToast(`Guía ${guideNum} eliminada correctamente.`, 'info');
        } else {
            alert(`Guía ${guideNum} eliminada correctamente.`);
        }

        await loadDispatchGuidesList();
    } catch (err) {
        console.error('Error eliminando guía:', err);
        alert('Error: ' + err.message);
    }
}

// PUENTE GLOBAL WINDOW
if (typeof window !== 'undefined') {
    window.loadDispatchGuidesList = loadDispatchGuidesList;
    window.updateFilterCounters = updateFilterCounters;
    window.setDispatchFilter = setDispatchFilter;
    window.filterDispatchList = filterDispatchList;
    window.goToDispatchPage = goToDispatchPage;
    window.changeDispatchPageSize = changeDispatchPageSize;
    window.renderDispatchTable = renderDispatchTable;
    window.renderDispatchPaginated = renderDispatchPaginated;
    window.openConfirmDeliveryModal = openConfirmDeliveryModal;
    window.submitConfirmDelivery = submitConfirmDelivery;
    window.deleteDispatchGuide = deleteDispatchGuide;
}
