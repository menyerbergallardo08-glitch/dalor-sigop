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

let lastServicesList = [];
let servicesCurrentPage = 1;
let servicesPageSize = 10;
let serviceSearchTerm = '';
let serviceCategoryFilterVal = '';


function goToServicesPage(page) {
    servicesCurrentPage = page;
    renderServicesPaginated();
    const tableEl = document.getElementById("servicesTableBody");
    if (tableEl) tableEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function changeServicesPageSize(size) {
    servicesPageSize = parseInt(size) || 10;
    servicesCurrentPage = 1;
    renderServicesPaginated();
}

function onServiceSearchInput(val) {
    serviceSearchTerm = (val || '').toLowerCase().trim();
    filterAndPaginateServices();
}

function onServiceCategoryFilterChange(val) {
    serviceCategoryFilterVal = (val || '').trim();
    filterAndPaginateServices();
}

function filterAndPaginateServices() {
    lastServicesList = (allServices || []).filter(s => {
        const matchesSearch = !serviceSearchTerm || 
            (s.name && s.name.toLowerCase().includes(serviceSearchTerm)) ||
            (s.code && s.code.toLowerCase().includes(serviceSearchTerm)) ||
            (s.unit_measure && s.unit_measure.toLowerCase().includes(serviceSearchTerm));
        const matchesCategory = !serviceCategoryFilterVal || s.category === serviceCategoryFilterVal;
        return matchesSearch && matchesCategory;
    });
    servicesCurrentPage = 1;
    renderServicesPaginated();
}

function renderServicesPaginated() {
    const tbody = document.getElementById("servicesTableBody");
    if (!tbody) return;

    const items = lastServicesList;
    if (items.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 25px; color: #64748b; font-weight: 500;">
            <i class="fa-solid fa-folder-open" style="font-size: 24px; color: #94a3b8; margin-bottom: 8px; display: block;"></i>
            No se encontraron partidas que coincidan con los filtros.
        </td></tr>`;
        const container = document.getElementById("servicesPaginationContainer");
        if (container) container.innerHTML = "";
        return;
    }

    const paginateFn = typeof window.renderPaginationControls === 'function' 
        ? window.renderPaginationControls 
        : (typeof renderPaginationControls === 'function' ? renderPaginationControls : () => ({ startIndex: 0, endIndex: items.length }));

    const { startIndex, endIndex } = paginateFn({
        containerId: "servicesPaginationContainer",
        totalItems: items.length,
        currentPage: servicesCurrentPage,
        pageSize: servicesPageSize,
        onPageChange: "goToServicesPage",
        onPageSizeChange: "changeServicesPageSize",
        itemLabel: "partida(s)",
        pageSizeOptions: [10, 25, 50, 100]
    });

    const pageItems = items.slice(startIndex, endIndex);

    tbody.innerHTML = pageItems.map(s => {
        const margin = (s.unit_price_usd || 0) - (s.base_cost_usd || 0);
        return `
        <tr>
            <td style="font-weight: 800; color: var(--dalor-blue);">${s.code}</td>
            <td style="font-weight: 600; color: var(--dalor-navy);">${s.name}</td>
            <td><span style="font-size: 11px; background: #e0f2fe; color: #0369a1; padding: 3px 8px; border-radius: 6px; font-weight: 700;">${s.category}</span></td>
            <td>${s.unit_measure}</td>
            <td>$${Number(s.base_cost_usd || 0).toFixed(2)}</td>
            <td style="font-weight: 800; color: var(--dalor-navy);">$${Number(s.unit_price_usd || 0).toFixed(2)}</td>
            <td style="color: #059669; font-weight: 700;">+$${margin.toFixed(2)}</td>
            <td style="text-align: center; white-space: nowrap;">
                <button onclick="openEditServiceModal(${s.id})" class="btn-secondary" style="padding: 4px 8px; color: var(--dalor-blue); margin-right: 4px;" title="Editar Partida">
                    <i class="fa-solid fa-pen-to-square"></i>
                </button>
                <button onclick="deleteService(${s.id})" class="btn-secondary" style="padding: 4px 8px; color: #ef4444;" title="Inactivar Partida">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        </tr>`;
    }).join('');
}

async function loadServices() {
    const tbody = document.getElementById("servicesTableBody");
    if (tbody) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 20px; color: #94a3b8;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando partidas...</td></tr>`;
    }

    try {
        const res = await authFetch(`${API_BASE}/services/`);
        if (!res.ok) throw new Error("Error HTTP " + res.status);
        const srvData = await res.json();
        allServices = Array.isArray(srvData) ? srvData : [];
        lastServicesList = allServices;
        servicesCurrentPage = 1;
        renderServicesPaginated();
    } catch (e) {
        if (tbody) tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #e11d48;">Error al cargar servicios.</td></tr>`;
    }
}



function getCustomCategories() {
    try {
        return JSON.parse(localStorage.getItem('dalor_custom_apu_categories') || '[]');
    } catch(e) {
        return [];
    }
}

function getCustomUnits() {
    try {
        return JSON.parse(localStorage.getItem('dalor_custom_apu_units') || '[]');
    } catch(e) {
        return [];
    }
}

function registerCustomCategory(cat) {
    if (!cat || typeof cat !== 'string') return;
    const trimmed = cat.trim();
    if (!trimmed || trimmed === '__NEW__') return;
    try {
        const stored = getCustomCategories();
        if (!stored.includes(trimmed)) {
            stored.push(trimmed);
            localStorage.setItem('dalor_custom_apu_categories', JSON.stringify(stored));
        }
    } catch(e) {}
}

function registerCustomUnit(unit) {
    if (!unit || typeof unit !== 'string') return;
    const trimmed = unit.trim();
    if (!trimmed || trimmed === '__NEW__') return;
    try {
        const stored = getCustomUnits();
        if (!stored.includes(trimmed)) {
            stored.push(trimmed);
            localStorage.setItem('dalor_custom_apu_units', JSON.stringify(stored));
        }
    } catch(e) {}
}

function getAllServiceCategories() {
    const catSet = new Set(OFFICIAL_DALOR_APU_CATEGORIES);
    getCustomCategories().forEach(c => c && catSet.add(c.trim()));
    (window.allServices || allServices || []).forEach(s => {
        if (s.category && typeof s.category === 'string' && s.category.trim() && s.category !== '__NEW__') {
            catSet.add(s.category.trim());
        }
    });
    return Array.from(catSet);
}

function getAllServiceUnits() {
    const baseUnits = [
        "Kilogramo (kg)",
        "Tonelada (ton)",
        "Metro (m)",
        "Metro Cuadrado (m²)",
        "Metro Cúbico (m³)",
        "Pieza (und)",
        "Global (gl)",
        "Hora-Hombre (hh)",
        "Día (dia)",
        "Pulgada-Diámetro (pulg-diam)",
        "Litro (L)",
        "Galón (gal)"
    ];
    const unitSet = new Set(baseUnits);
    getCustomUnits().forEach(u => u && unitSet.add(u.trim()));
    (window.allServices || allServices || []).forEach(s => {
        if (s.unit_measure && typeof s.unit_measure === 'string' && s.unit_measure.trim() && s.unit_measure !== '__NEW__') {
            unitSet.add(s.unit_measure.trim());
        }
    });
    return Array.from(unitSet);
}

function populateServiceCategoriesAndUnits() {
    const categories = getAllServiceCategories();
    const units = getAllServiceUnits();

    const catOptions = categories.map(cat => `<option value="${cat}">${cat}</option>`).join('') +
        `<option value="__NEW__" style="color: #0284c7; font-weight: 800;">âž• Escribir Nueva Categoría...</option>`;

    const unitOptions = units.map(u => `<option value="${u}">${u}</option>`).join('') +
        `<option value="__NEW__" style="color: #0284c7; font-weight: 800;">âž• Escribir Nueva Unidad...</option>`;

    // 1. Selector de categoría en Modal Nuevo Servicio
    const catSelect = document.getElementById("srv_category");
    if (catSelect) {
        const prev = catSelect.value;
        catSelect.innerHTML = catOptions;
        if (prev && prev !== '__NEW__' && categories.includes(prev)) {
            catSelect.value = prev;
        } else if (categories.length > 0 && prev !== '__NEW__') {
            catSelect.value = categories[0];
        }
    }

    // 2. Selector de unidad en Modal Nuevo Servicio
    const unitSelect = document.getElementById("srv_unit");
    if (unitSelect) {
        const prev = unitSelect.value;
        unitSelect.innerHTML = unitOptions;
        if (prev && prev !== '__NEW__' && units.includes(prev)) {
            unitSelect.value = prev;
        } else if (units.length > 0 && prev !== '__NEW__') {
            unitSelect.value = units[0];
        }
    }

    // 3. Selector de categoría en Modal Editar Servicio
    const editCatSelect = document.getElementById("edit_srv_category");
    if (editCatSelect) {
        const prev = editCatSelect.value;
        editCatSelect.innerHTML = catOptions;
        if (prev && prev !== '__NEW__' && categories.includes(prev)) {
            editCatSelect.value = prev;
        }
    }

    // 4. Selector de unidad en Modal Editar Servicio
    const editUnitSelect = document.getElementById("edit_srv_unit");
    if (editUnitSelect) {
        const prev = editUnitSelect.value;
        editUnitSelect.innerHTML = unitOptions;
        if (prev && prev !== '__NEW__' && units.includes(prev)) {
            editUnitSelect.value = prev;
        }
    }

    // 5. Filtro de categorías en la tabla de catálogo de servicios
    const filterCatSelect = document.getElementById("serviceCategoryFilter");
    if (filterCatSelect) {
        const prev = filterCatSelect.value;
        filterCatSelect.innerHTML = `<option value="">Todas las Categorías</option>` +
            categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
        if (prev && categories.includes(prev)) {
            filterCatSelect.value = prev;
        }
    }
}

function onServiceCategoryChanged(val) {
    const input = document.getElementById("srv_new_category");
    if (!input) return;
    if (val === '__NEW__') {
        input.classList.remove("hidden");
        input.focus();
    } else {
        input.classList.add("hidden");
        input.value = "";
    }
}

function onServiceUnitChanged(val) {
    const input = document.getElementById("srv_new_unit");
    if (!input) return;
    if (val === '__NEW__') {
        input.classList.remove("hidden");
        input.focus();
    } else {
        input.classList.add("hidden");
        input.value = "";
    }
}

function onEditServiceCategoryChanged(val) {
    const input = document.getElementById("edit_srv_new_category");
    if (!input) return;
    if (val === '__NEW__') {
        input.classList.remove("hidden");
        input.focus();
    } else {
        input.classList.add("hidden");
        input.value = "";
    }
}

function onEditServiceUnitChanged(val) {
    const input = document.getElementById("edit_srv_new_unit");
    if (!input) return;
    if (val === '__NEW__') {
        input.classList.remove("hidden");
        input.focus();
    } else {
        input.classList.add("hidden");
        input.value = "";
    }
}

async function openNewServiceModal() {
    const form = document.getElementById("serviceForm");
    if (form) form.reset();

    const newCatInput = document.getElementById("srv_new_category");
    if (newCatInput) {
        newCatInput.value = "";
        newCatInput.classList.add("hidden");
    }

    const newUnitInput = document.getElementById("srv_new_unit");
    if (newUnitInput) {
        newUnitInput.value = "";
        newUnitInput.classList.add("hidden");
    }

    const codeInput = document.getElementById("srv_code");
    if (codeInput) {
        codeInput.value = "Generando correlativo...";
        codeInput.setAttribute("readonly", "true");
        codeInput.style.backgroundColor = "#f1f5f9";
        codeInput.style.cursor = "not-allowed";
        codeInput.style.fontWeight = "700";
    }

    const newBadge = document.getElementById("newSrvMarginBadge");
    if (newBadge) newBadge.innerHTML = "";
    const newBtn = document.getElementById("btnSubmitCreateService");
    if (newBtn) {
        newBtn.disabled = false;
        newBtn.title = "";
        newBtn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Guardar Partida`;
    }

    populateServiceCategoriesAndUnits();
    openModal("modalService");

    try {
        const res = await authFetch(`${API_BASE}/services/next-code`);
        if (res.ok) {
            const data = await res.json();
            if (codeInput && data && data.next_code) {
                codeInput.value = data.next_code;
            }
        } else {
            if (codeInput) {
                const count = (allServices ? allServices.length : 0) + 1;
                codeInput.value = `APU-${String(count).padStart(3, '0')}`;
            }
        }
    } catch (e) {
        console.warn("No se pudo obtener correlativo de APU:", e);
        if (codeInput && codeInput.value.includes("Generando")) {
            codeInput.value = "APU-001";
        }
    }
}

async function submitCreateService(event) {
    if (event && event.preventDefault) event.preventDefault();

    let selectedCat = document.getElementById("srv_category")?.value;
    if (selectedCat === '__NEW__') {
        const customCat = (document.getElementById("srv_new_category")?.value || "").trim();
        if (!customCat) {
            alert("Por favor escribe el nombre de la nueva categoría.");
            document.getElementById("srv_new_category")?.focus();
            return;
        }
        selectedCat = customCat;
        registerCustomCategory(selectedCat);
    }

    let selectedUnit = document.getElementById("srv_unit")?.value;
    if (selectedUnit === '__NEW__') {
        const customUnit = (document.getElementById("srv_new_unit")?.value || "").trim();
        if (!customUnit) {
            alert("Por favor escribe la unidad de medida (ej: Kg, Ton, Galón, etc.).");
            document.getElementById("srv_new_unit")?.focus();
            return;
        }
        selectedUnit = customUnit;
        registerCustomUnit(selectedUnit);
    }

    const costVal = parseFloat(String(document.getElementById("srv_cost")?.value || "").replace(',', '.')) || 0.0;
    const priceVal = parseFloat(String(document.getElementById("srv_price")?.value || "").replace(',', '.')) || 0.0;

    const payload = {
        code: document.getElementById("srv_code").value.trim(),
        name: document.getElementById("srv_name").value.trim(),
        category: selectedCat,
        unit_measure: selectedUnit,
        base_cost_usd: costVal,
        unit_price_usd: priceVal
    };

    if (!payload.name) {
        alert("El nombre de la partida es obligatorio.");
        document.getElementById("srv_name")?.focus();
        return;
    }

    // 🔴 BLOQUEO ESTRICTO DE MARGEN COMERCIAL (VENTA >= COSTO)
    if (priceVal < costVal) {
        const margen = (priceVal - costVal).toFixed(2);
        alert(`⛔ OPERACIÓN DENEGADA | MARGEN NEGATIVO\n\nEl Precio de Venta ($${priceVal.toFixed(2)}) no puede ser menor al Costo Base ($${costVal.toFixed(2)}).\n\nPérdida calculada: -$${Math.abs(margen)} USD.\n\nPor favor ajusta el precio para garantizar la rentabilidad.`);
        document.getElementById("srv_price")?.focus();
        return;
    }

    const btnSubmit = document.getElementById("btnSubmitCreateService") || document.querySelector("#serviceForm button[type=\"submit\"]");
    if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Guardando...`;
    }

    try {
        const res = await authFetch(`${API_BASE}/services/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            const created = await res.json();
            closeModal("modalService");
            if (typeof showToastNotification === 'function') {
                showToastNotification(`Partida ${created.code} registrada exitosamente`, "success");
            } else if (typeof showToast === 'function') {
                showToast(`Partida ${created.code} registrada exitosamente`, "success");
            } else {
                alert(`Partida ${created.code} registrada exitosamente.`);
            }
            registerCustomCategory(created.category || selectedCat);
            registerCustomUnit(created.unit_measure || selectedUnit);

            await loadInitialMasterData();
            await loadServices();
            populateServiceCategoriesAndUnits();
        } else {
            const err = await res.json().catch(() => ({}));
            alert("Error al registrar partida: " + (err.detail || "Respuesta inválida del servidor"));
        }
    } catch (e) {
        console.error("Error al guardar servicio:", e);
        alert("Error de conexión al guardar servicio.");
    } finally {
        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Guardar Partida`;
        }
    }

}

async function openEditServiceModal(serviceId) {
    let list = (window.allServices && window.allServices.length > 0) ? window.allServices : (allServices || []);
    if (!list || list.length === 0) {
        list = (typeof lastServicesList !== 'undefined' && lastServicesList.length > 0) ? lastServicesList : [];
    }
    let s = list.find(item => item && (item.id === serviceId || String(item.id) === String(serviceId)));

    if (!s) {
        try {
            const res = await authFetch(`${API_BASE}/services/`);
            if (res.ok) {
                const data = await res.json();
                window.allServices = Array.isArray(data) ? data : [];
                allServices = window.allServices;
                s = allServices.find(item => item && (item.id === serviceId || String(item.id) === String(serviceId)));
            }
        } catch (_) {}
    }

    if (!s) {
        alert("Partida no encontrada en el catálogo.");
        return;
    }
    populateServiceCategoriesAndUnits();


    const newCatInput = document.getElementById("edit_srv_new_category");
    if (newCatInput) {
        newCatInput.value = "";
        newCatInput.classList.add("hidden");
    }

    const newUnitInput = document.getElementById("edit_srv_new_unit");
    if (newUnitInput) {
        newUnitInput.value = "";
        newUnitInput.classList.add("hidden");
    }

    document.getElementById("edit_srv_id").value = s.id;
    document.getElementById("edit_srv_code").value = s.code;
    document.getElementById("edit_srv_name").value = s.name;

    const catSelect = document.getElementById("edit_srv_category");
    if (catSelect) {
        if (s.category && !Array.from(catSelect.options).some(o => o.value === s.category)) {
            const opt = document.createElement("option");
            opt.value = s.category;
            opt.textContent = s.category;
            catSelect.insertBefore(opt, catSelect.lastElementChild);
        }
        catSelect.value = s.category;
    }

    const unitSelect = document.getElementById("edit_srv_unit");
    if (unitSelect) {
        if (s.unit_measure && !Array.from(unitSelect.options).some(o => o.value === s.unit_measure)) {
            const opt = document.createElement("option");
            opt.value = s.unit_measure;
            opt.textContent = s.unit_measure;
            unitSelect.insertBefore(opt, unitSelect.lastElementChild);
        }
        unitSelect.value = s.unit_measure;
    }

    document.getElementById("edit_srv_cost").value = s.base_cost_usd;
    document.getElementById("edit_srv_price").value = s.unit_price_usd;
    calcEditServiceMargin();
    openModal("modalEditService");
}

async function submitEditService(event) {
    if (event && event.preventDefault) event.preventDefault();
    const serviceId = document.getElementById("edit_srv_id").value;

    let selectedCat = document.getElementById("edit_srv_category")?.value;
    if (selectedCat === '__NEW__') {
        const customCat = (document.getElementById("edit_srv_new_category")?.value || "").trim();
        if (!customCat) {
            alert("Por favor escribe el nombre de la nueva categoría.");
            document.getElementById("edit_srv_new_category")?.focus();
            return;
        }
        selectedCat = customCat;
        registerCustomCategory(selectedCat);
    }

    let selectedUnit = document.getElementById("edit_srv_unit")?.value;
    if (selectedUnit === '__NEW__') {
        const customUnit = (document.getElementById("edit_srv_new_unit")?.value || "").trim();
        if (!customUnit) {
            alert("Por favor escribe la unidad de medida.");
            document.getElementById("edit_srv_new_unit")?.focus();
            return;
        }
        selectedUnit = customUnit;
        registerCustomUnit(selectedUnit);
    }

    const costVal = parseFloat(String(document.getElementById("edit_srv_cost")?.value || "").replace(',', '.')) || 0.0;
    const priceVal = parseFloat(String(document.getElementById("edit_srv_price")?.value || "").replace(',', '.')) || 0.0;

    const payload = {
        name: document.getElementById("edit_srv_name").value.trim(),
        category: selectedCat,
        unit_measure: selectedUnit,
        base_cost_usd: costVal,
        unit_price_usd: priceVal
    };

    if (!payload.name) {
        alert("El nombre de la partida es obligatorio.");
        document.getElementById("edit_srv_name")?.focus();
        return;
    }

    // 🔴 BLOQUEO ESTRICTO DE MARGEN COMERCIAL (VENTA >= COSTO)
    if (priceVal < costVal) {
        const margen = (priceVal - costVal).toFixed(2);
        alert(`⛔ OPERACIÓN DENEGADA | MARGEN NEGATIVO\n\nEl Precio de Venta ($${priceVal.toFixed(2)}) no puede ser menor al Costo Base ($${costVal.toFixed(2)}).\n\nPérdida calculada: -$${Math.abs(margen)} USD.\n\nPor favor ajusta el precio para garantizar la rentabilidad.`);
        document.getElementById("edit_srv_price")?.focus();
        return;
    }

    const btnSubmit = document.querySelector("#editServiceForm button[type=\"submit\"]");
    if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Guardando...`;
    }

    try {
        const res = await authFetch(`${API_BASE}/services/${serviceId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            closeModal("modalEditService");
            if (typeof showToastNotification === 'function') {
                showToastNotification("Partida actualizada exitosamente", "success");
            } else if (typeof showToast === 'function') {
                showToast("Partida actualizada exitosamente", "success");
            } else {
                alert("Partida actualizada exitosamente.");
            }
            registerCustomCategory(payload.category);
            registerCustomUnit(payload.unit_measure);

            await loadInitialMasterData();
            await loadServices();
            populateServiceCategoriesAndUnits();
        } else {
            const err = await res.json().catch(() => ({}));
            alert("Error al actualizar partida: " + (err.detail || "Respuesta inválida del servidor"));
        }
    } catch (e) {
        console.error("Error al actualizar servicio:", e);
        alert("Error de conexión al actualizar servicio.");
    } finally {
        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Guardar Cambios`;
        }
    }

}

async function deleteService(serviceId) {

    if (!confirm("¿Deseas eliminar permanentemente esta partida de servicio del catálogo?")) return;

    try {

        const res = await authFetch(`${API_BASE}/services/${serviceId}?permanent=true`, { method: "DELETE" });

        if (res.ok) {

            await loadInitialMasterData();

            loadServices();

        } else {

            alert("Error al eliminar partida.");

        }

    } catch (e) {

        alert("Error de conexión al eliminar servicio.");

    }

}






// --- VERIFICACIÓN DE RIESGO CREDITICIO EN COTIZACIONES (SIN BLOQUEO AUTOMÁTICO) ---


// ── Indicadores de Margen en Tiempo Real y Bloqueo Preventivo ───────────────
function calcEditServiceMargin() {
    const costInput = document.getElementById('edit_srv_cost');
    const priceInput = document.getElementById('edit_srv_price');
    const cost = parseFloat(costInput?.value) || 0;
    const price = parseFloat(priceInput?.value) || 0;
    const badge = document.getElementById('editSrvMarginBadge');
    const btn = document.querySelector('#editServiceForm button[type="submit"]');

    if (!costInput?.value && !priceInput?.value) {
        if (badge) badge.innerHTML = '';
        if (btn) btn.disabled = false;
        return;
    }

    const margin = price - cost;
    const pct = cost > 0 ? ((margin / cost) * 100).toFixed(1) : 'N/A';

    if (price < cost) {
        if (badge) {
            badge.innerHTML = `<span style="color:#e11d48;background:#fff1f2;padding:4px 10px;border-radius:6px;border:1px solid #fecdd3;display:inline-block;">❌ ERROR: Precio ($${price.toFixed(2)}) menor al costo ($${cost.toFixed(2)}) — Pérdida: -$${Math.abs(margin).toFixed(2)} (${Math.abs(pct)}%)</span>`;
        }
        if (btn) {
            btn.disabled = true;
            btn.title = "No se puede guardar una partida con precio menor al costo";
        }
    } else if (margin === 0) {
        if (badge) {
            badge.innerHTML = '<span style="color:#b45309;background:#fffbeb;padding:4px 10px;border-radius:6px;border:1px solid #fde68a;display:inline-block;">⚠️ Margen Cero: Precio igual al costo base, sin ganancia</span>';
        }
        if (btn) {
            btn.disabled = false;
            btn.title = "";
        }
    } else {
        if (badge) {
            badge.innerHTML = `<span style="color:#059669;background:#ecfdf5;padding:4px 10px;border-radius:6px;border:1px solid #a7f3d0;display:inline-block;">✅ Margen Válido: Ganancia +$${margin.toFixed(2)} (+${pct}% sobre costo)</span>`;
        }
        if (btn) {
            btn.disabled = false;
            btn.title = "";
        }
    }
}

function calcNewServiceMargin() {
    const costInput = document.getElementById('srv_cost');
    const priceInput = document.getElementById('srv_price');
    const cost = parseFloat(costInput?.value) || 0;
    const price = parseFloat(priceInput?.value) || 0;
    const badge = document.getElementById('newSrvMarginBadge');
    const btn = document.getElementById('btnSubmitCreateService') || document.querySelector('#serviceForm button[type="submit"]');

    if (!costInput?.value && !priceInput?.value) {
        if (badge) badge.innerHTML = '';
        if (btn) btn.disabled = false;
        return;
    }

    const margin = price - cost;
    const pct = cost > 0 ? ((margin / cost) * 100).toFixed(1) : 'N/A';

    if (price < cost) {
        if (badge) {
            badge.innerHTML = `<span style="color:#e11d48;background:#fff1f2;padding:4px 10px;border-radius:6px;border:1px solid #fecdd3;display:inline-block;">❌ ERROR: Precio ($${price.toFixed(2)}) menor al costo ($${cost.toFixed(2)}) — Pérdida: -$${Math.abs(margin).toFixed(2)} (${Math.abs(pct)}%)</span>`;
        }
        if (btn) {
            btn.disabled = true;
            btn.title = "No se puede guardar una partida con precio menor al costo";
        }
    } else if (margin === 0) {
        if (badge) {
            badge.innerHTML = '<span style="color:#b45309;background:#fffbeb;padding:4px 10px;border-radius:6px;border:1px solid #fde68a;display:inline-block;">⚠️ Margen Cero: Precio igual al costo base, sin ganancia</span>';
        }
        if (btn) {
            btn.disabled = false;
            btn.title = "";
        }
    } else {
        if (badge) {
            badge.innerHTML = `<span style="color:#059669;background:#ecfdf5;padding:4px 10px;border-radius:6px;border:1px solid #a7f3d0;display:inline-block;">✅ Margen Válido: Ganancia +$${margin.toFixed(2)} (+${pct}% sobre costo)</span>`;
        }
        if (btn) {
            btn.disabled = false;
            btn.title = "";
        }
    }
}


window.calcEditServiceMargin = calcEditServiceMargin;
window.calcNewServiceMargin = calcNewServiceMargin;

// Exponer al objeto global window para eventos inline y compatibilidad
if (typeof window !== 'undefined') {
    window.goToServicesPage = goToServicesPage;
    window.changeServicesPageSize = changeServicesPageSize;
    window.onServiceSearchInput = onServiceSearchInput;
    window.onServiceCategoryFilterChange = onServiceCategoryFilterChange;
    window.filterAndPaginateServices = filterAndPaginateServices;
    window.renderServicesPaginated = renderServicesPaginated;
    window.loadServices = loadServices;
    window.getCustomCategories = getCustomCategories;
    window.getCustomUnits = getCustomUnits;
    window.registerCustomCategory = registerCustomCategory;
    window.registerCustomUnit = registerCustomUnit;
    window.getAllServiceCategories = getAllServiceCategories;
    window.getAllServiceUnits = getAllServiceUnits;
    window.populateServiceCategoriesAndUnits = populateServiceCategoriesAndUnits;
    window.onServiceCategoryChanged = onServiceCategoryChanged;
    window.onServiceUnitChanged = onServiceUnitChanged;
    window.onEditServiceCategoryChanged = onEditServiceCategoryChanged;
    window.onEditServiceUnitChanged = onEditServiceUnitChanged;
    window.openNewServiceModal = openNewServiceModal;
    window.submitCreateService = submitCreateService;
    window.openEditServiceModal = openEditServiceModal;
    window.submitEditService = submitEditService;
    window.deleteService = deleteService;
}
