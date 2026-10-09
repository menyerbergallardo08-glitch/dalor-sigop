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

let quoteRowsCount = 0;


async function openNewQuotationModal() {
    quoteRowsCount = 0;
    const editInput = document.getElementById("edit_quotation_id");
    if (editInput) editInput.value = "";
    
    const titleEl = document.getElementById("modalQuotationTitle");
    if (titleEl) titleEl.innerHTML = `<i class="fa-solid fa-calculator" style="color: var(--dalor-blue);"></i> Armar Presupuesto / Cotización Formal (APU)`;
    
    const btnSubmit = document.getElementById("btnSubmitQuotation");
    if (btnSubmit) btnSubmit.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Guardar Presupuesto`;

    const quoteForm = document.getElementById("quoteForm");
    if (quoteForm) quoteForm.reset();

    if (document.getElementById("quote_coletilla_divisas")) document.getElementById("quote_coletilla_divisas").checked = true;
    if (document.getElementById("quote_coletilla_modalidad")) document.getElementById("quote_coletilla_modalidad").checked = true;
    if (document.getElementById("quote_coletilla_bolivares")) document.getElementById("quote_coletilla_bolivares").checked = false;
    if (document.getElementById("quote_notes")) document.getElementById("quote_notes").value = "";
    if (document.getElementById("quote_execution_time")) document.getElementById("quote_execution_time").value = "15 días hábiles";

    const riskAlert = document.getElementById("quoteClientRiskAlert");
    if (riskAlert) riskAlert.style.display = "none";

    const itemsContainer = document.getElementById("quoteItemsList");
    if (itemsContainer) itemsContainer.innerHTML = "";

    // Carga de clientes y servicios si no están en memoria
    try {
        let currentClients = (window.allClients && window.allClients.length > 0) ? window.allClients : (allClients || []);
        if (currentClients.length === 0) {
            const token = window.authToken || localStorage.getItem('dalor_token') || null;
            const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
            const resCli = await authFetch(`${API_BASE}/clients/`, { headers });
            if (resCli.ok) {
                const cData = await resCli.json();
                allClients = window.allClients = Array.isArray(cData) ? cData : [];
            }
        }
        if (!window._servicesLoaded) {
            const token = window.authToken || localStorage.getItem('dalor_token') || null;
            const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
            const resSrv = await authFetch(`${API_BASE}/services/`, { headers });
            if (resSrv.ok) {
                const sData = await resSrv.json();
                allServices = window.allServices = Array.isArray(sData) ? sData : [];
                window._servicesLoaded = true;
            }
        }
    } catch(e) {
        console.warn("Error cargando clientes o servicios para cotización:", e);
    }

    if (typeof window.populateSelectDropdowns === 'function') {
        window.populateSelectDropdowns();
    }



    // Asegurar explícitamente las opciones del selector de cliente en el modal de cotización

    const qClientSelect = document.getElementById("quote_client_id");

    if (qClientSelect) {

        const availableClients = (window.allClients && window.allClients.length > 0) ? window.allClients : (allClients || []);

        if (availableClients.length > 0) {

            let opts = `<option value="">-- Seleccione Cliente --</option>` + 

                availableClients.map(c => `<option value="${c.id}">[${c.code}] ${c.name} (${c.rif || 'Sin RIF'})</option>`).join('');

            qClientSelect.innerHTML = opts;

            if (availableClients.length === 1) {

                qClientSelect.value = String(availableClients[0].id);

            }

        }

    }



    if (document.getElementById("quote_tax_type")) document.getElementById("quote_tax_type").value = "16";

    if (document.getElementById("quote_tax_percent")) document.getElementById("quote_tax_percent").value = "16";

    if (document.getElementById("quote_execution_time")) document.getElementById("quote_execution_time").value = "";

    if (document.getElementById("quote_currency")) document.getElementById("quote_currency").value = "USD";
    if (document.getElementById("quote_coletilla_divisas")) document.getElementById("quote_coletilla_divisas").checked = false;
    if (document.getElementById("quote_coletilla_modalidad")) document.getElementById("quote_coletilla_modalidad").checked = false;
    if (document.getElementById("quote_notes")) document.getElementById("quote_notes").value = "";

    addQuotationRow();

    recalcQuotationTotals();

    onQuotationCurrencyChanged();

    if (typeof window.openModal === 'function') {
        window.openModal("modalQuotation");
    } else {
        document.getElementById("modalQuotation")?.classList.remove("hidden");
    }

}



function onTaxTypeChanged() {

    const val = document.getElementById("quote_tax_type").value;

    document.getElementById("quote_tax_percent").value = val;

    recalcQuotationTotals();

}



function addQuotationRow(itemData = null) {

    quoteRowsCount++;

    const container = document.getElementById("quoteItemsList");

    if (!container) return;

    const rowId = `quote_row_${quoteRowsCount}`;

    const srvPlaceholder = (allServices && allServices.length > 0) 
        ? '-- Partida del Catálogo --' 
        : '-- Catálogo en blanco (escriba partida manual) --';

    const srvOptions = `<option value="">${srvPlaceholder}</option>` + 

        (allServices || []).map(s => {

            const isSel = itemData && (String(itemData.service_id) === String(s.id) || String(itemData.item_code) === String(s.code));

            return `<option value="${s.id}" data-code="${s.code}" data-unit="${s.unit_measure}" data-price="${s.unit_price_usd}" ${isSel ? 'selected' : ''}>[${s.code}] ${s.name} ($${s.unit_price_usd}/${s.unit_measure})</option>`;

        }).join('');



    const descVal = itemData ? (itemData.description || '').replaceAll('"', '&quot;') : '';

    const unitVal = itemData ? (itemData.unit_measure || 'Global') : 'Global';

    const qtyVal = itemData ? (itemData.quantity !== undefined ? itemData.quantity : 1) : 1;

    const priceVal = itemData ? (itemData.unit_price_usd !== undefined ? itemData.unit_price_usd : 0.00) : 0.00;

    const totVal = (qtyVal * priceVal).toFixed(2);



    const div = document.createElement("div");

    div.id = rowId;

    div.style.cssText = "display: grid; grid-template-columns: 4fr 1fr 1fr 1fr 1fr 30px; gap: 6px; background: white; padding: 8px; border-radius: 8px; border: 1px solid #cbd5e1; align-items: center;";

    div.innerHTML = `

        <div>

            <select class="form-select q-srv-select" style="font-size: 11px; padding: 5px;" onchange="onServiceSelected('${rowId}')">

                ${srvOptions}

            </select>

            <input type="text" class="form-input q-desc" placeholder="Descripción detallada de la partida / APU" value="${descVal}" autocomplete="off" style="font-size: 11px; padding: 4px 6px; margin-top: 4px;" required>

        </div>

        <div>
            <input type="text" class="form-input q-unit" list="datalist_units" placeholder="Und / Medida" value="${unitVal}" style="font-size: 11px; padding: 5px; font-weight: 700; color: #1e293b;" title="Selecciona o escribe cualquier unidad de medida (ej: Ton, Kg, m, Pulg-Diam, HH, Und)">
            <datalist id="datalist_units">
                ${Array.from(new Set([
                    "Global", "Und", "Pza", "m", "m²", "m³", "ml", "Kg", "Ton", "Litro", "Galón", "Horas", "HH", "Días", "Punto", "Juego", "Pulg-Diam",
                    ...(allServices || []).map(s => (s.unit_measure || '').trim()).filter(Boolean)
                ])).map(u => `<option value="${u}">`).join('')}
            </datalist>
        </div>

        <div>
            <input type="text" inputmode="decimal" class="form-input q-qty" placeholder="Cant" value="${qtyVal}" oninput="recalcQuotationTotals()" autocomplete="off" style="font-size: 11px; padding: 5px; font-weight: bold;" required>
        </div>

        <div>
            <input type="text" inputmode="decimal" class="form-input q-price" placeholder="P. Unit ($)" value="${priceVal}" oninput="recalcQuotationTotals()" autocomplete="off" style="font-size: 11px; padding: 5px; font-weight: bold; color: var(--dalor-blue);" required>
        </div>

        <div>
            <input type="text" class="form-input q-total" placeholder="Total ($)" value="$${totVal}" style="font-size: 11px; padding: 5px; font-weight: 800;" readonly>
        </div>

        <div style="text-align: center;">

            <button type="button" onclick="removeQuotationRow('${rowId}')" style="background: none; border: none; color: #ef4444; font-size: 16px; cursor: pointer;">&times;</button>

        </div>

    `;

    container.appendChild(div);

}



function removeQuotationRow(rowId) {

    const el = document.getElementById(rowId);

    if (el) el.remove();

    recalcQuotationTotals();

}



function onServiceSelected(rowId) {

    const row = document.getElementById(rowId);

    if (!row) return;

    const select = row.querySelector(".q-srv-select");

    const opt = select ? select.options[select.selectedIndex] : null;

    if (opt && opt.value) {

        row.querySelector(".q-desc").value = opt.text.replace(/\[.*?\]\s*/, '').split(' ($')[0];

        row.querySelector(".q-unit").value = opt.getAttribute("data-unit") || "Global";

        row.querySelector(".q-price").value = parseFloat(opt.getAttribute("data-price") || 0).toFixed(2);

    }

    recalcQuotationTotals();

}



function recalcQuotationTotals() {

    const rows = document.querySelectorAll("#quoteItemsList > div");

    let subtotal = 0;

    rows.forEach(r => {

        const qtyInp = r.querySelector(".q-qty");
        const priceInp = r.querySelector(".q-price");
        const totInp = r.querySelector(".q-total");

        const qty = parseLocalizedNumber(qtyInp ? qtyInp.value : 0);
        const price = parseLocalizedNumber(priceInp ? priceInp.value : 0);

        const lineTot = qty * price;

        if (totInp) totInp.value = `$${lineTot.toFixed(2)}`;

        subtotal += lineTot;
    });



    const taxPercent = parseFloat(document.getElementById("quote_tax_percent") ? document.getElementById("quote_tax_percent").value : 16) || 0.0;

    const taxUsd = subtotal * (taxPercent / 100.0);

    const grandTotal = subtotal + taxUsd;

    const subEl = document.getElementById("quote_subtotal_display");
    const taxEl = document.getElementById("quote_tax_display");
    const totEl = document.getElementById("quote_total_display");

    const curr = (document.getElementById("quote_currency")?.value || "USD").toUpperCase();
    const bcvBanner = document.getElementById("quote_bcv_banner_box");
    if (bcvBanner) {
        bcvBanner.style.display = (curr === 'VES') ? 'block' : 'none';
    }

    const rate = (typeof EXCHANGE_RATE !== 'undefined' ? EXCHANGE_RATE : 850.0);

    if (curr === 'VES') {
        const subBs = subtotal * rate;
        const taxBs = taxUsd * rate;
        const grandBs = grandTotal * rate;
        if (subEl) subEl.innerHTML = `$${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}<br><span style="font-size:11px; color:#fde047;">Bs. ${subBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>`;
        if (taxEl) taxEl.innerHTML = taxPercent === 0 ? "EXENTO (0%)" : `$${taxUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}<br><span style="font-size:11px; color:#fde047;">Bs. ${taxBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>`;
        if (totEl) totEl.innerHTML = `$${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}<br><span style="font-size:12px; color:#fde047;">Bs. ${grandBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>`;
    } else {
        if (subEl) subEl.innerText = `$${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        if (taxEl) taxEl.innerText = taxPercent === 0 ? "EXENTO (0%)" : `$${taxUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        if (totEl) totEl.innerText = `$${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
}

function onQuotationCurrencyChanged() {
    recalcQuotationTotals();
}



// Función interactiva para Re-editar Cotizaciones / Presupuestos

async function editQuotation(quoteId) {
    try {
        const token = window.authToken || localStorage.getItem('dalor_token') || null;
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

        let currentClients = (window.allClients && window.allClients.length > 0) ? window.allClients : (allClients || []);
        if (currentClients.length === 0) {
            const resCli = await authFetch(`${API_BASE}/clients/`, { headers });
            if (resCli.ok) {
                const cData = await resCli.json();
                allClients = window.allClients = Array.isArray(cData) ? cData : [];
            }
        }
        if (!window._servicesLoaded) {
            const resSrv = await authFetch(`${API_BASE}/services/`, { headers });
            if (resSrv.ok) {
                const sData = await resSrv.json();
                allServices = window.allServices = Array.isArray(sData) ? sData : [];
                window._servicesLoaded = true;
            }
        }
        if (typeof window.populateSelectDropdowns === 'function') {
            window.populateSelectDropdowns();
        }

        const res = await authFetch(`${API_BASE}/quotations/${quoteId}`, { headers });
        if (!res.ok) throw new Error('No se pudo cargar la cotización para edición.');
        const q = await res.json();

        // 1. Configurar ID de edición y título del Modal
        const editInput = document.getElementById("edit_quotation_id");
        if (editInput) editInput.value = q.id;

        const titleEl = document.getElementById("modalQuotationTitle");
        if (titleEl) titleEl.innerHTML = `<i class="fa-solid fa-pen-to-square" style="color: var(--dalor-gold);"></i> Re-editar Presupuesto / Cotización [${q.quote_number}]`;

        const btnSubmit = document.getElementById("btnSubmitQuotation");
        if (btnSubmit) btnSubmit.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Guardar Cambios de Presupuesto`;

        // 2. Pre-llenar datos principales y seleccionar cliente dinámicamente
        const clientSelect = document.getElementById("quote_client_id");
        if (clientSelect) {
            const availableClients = (window.allClients && window.allClients.length > 0) ? window.allClients : (allClients || []);
            if (availableClients.length > 0) {
                let opts = `<option value="">-- Seleccione Cliente --</option>` + 
                    availableClients.map(c => `<option value="${c.id}">[${c.code}] ${c.name} (${c.rif || 'Sin RIF'})</option>`).join('');
                clientSelect.innerHTML = opts;
            }
            if (q.client_id) {
                clientSelect.value = String(q.client_id);
            }
        }

        if (document.getElementById("quote_title")) document.getElementById("quote_title").value = q.project_title || "";
        if (document.getElementById("quote_location")) document.getElementById("quote_location").value = q.location || "Sede Central";
        if (document.getElementById("quote_execution_time")) document.getElementById("quote_execution_time").value = q.execution_time || "15 días hábiles";
        if (document.getElementById("quote_validity")) document.getElementById("quote_validity").value = q.validity_days || 15;
        if (document.getElementById("quote_currency")) {
            document.getElementById("quote_currency").value = q.currency || "USD";
        }
        if (document.getElementById("quote_tax_percent")) {
            document.getElementById("quote_tax_percent").value = (q.tax_percent !== undefined && q.tax_percent !== null) ? q.tax_percent : (q.tax_usd > 0 ? 16 : 0);
        }
        if (document.getElementById("quote_notes")) {
            document.getElementById("quote_notes").value = q.notes || "";
        }
        if (document.getElementById("quote_coletilla_divisas")) {
            document.getElementById("quote_coletilla_divisas").checked = (q.coletilla_divisas !== false);
        }
        if (document.getElementById("quote_coletilla_modalidad")) {
            document.getElementById("quote_coletilla_modalidad").checked = (q.coletilla_modalidad !== false);
        }
        if (document.getElementById("quote_coletilla_bolivares")) {
            document.getElementById("quote_coletilla_bolivares").checked = Boolean(q.coletilla_bolivares);
        }

        // 3. Cargar renglones de partidas
        const container = document.getElementById("quoteItemsList");
        if (container) {
            container.innerHTML = "";
            quoteRowsCount = 0;
            if (q.items && q.items.length > 0) {
                q.items.forEach(it => addQuotationRow(it));
            } else {
                addQuotationRow();
            }
        }

        recalcQuotationTotals();
        if (typeof window.openModal === 'function') {
            window.openModal("modalQuotation");
        } else {
            document.getElementById("modalQuotation")?.classList.remove("hidden");
        }
    } catch(err) {
        console.error("Error al re-editar presupuesto:", err);
        alert("Error cargando presupuesto: " + err.message);
    }
}



async function submitCreateQuotation(event) {
    if (event && event.preventDefault) event.preventDefault();

    const clientSelect = document.getElementById("quote_client_id");
    const clientId = clientSelect ? parseInt(clientSelect.value) : null;
    if (!clientId) {
        alert("Por favor selecciona un cliente de la lista.");
        return;
    }

    const rows = document.querySelectorAll("#quoteItemsList > div");
    let items = [];
    rows.forEach(r => {
        const srvSelect = r.querySelector(".q-srv-select");
        const srvId = srvSelect && srvSelect.value ? parseInt(srvSelect.value) : null;
        const srvOpt = srvSelect ? srvSelect.options[srvSelect.selectedIndex] : null;
        const itemCode = srvOpt ? srvOpt.getAttribute("data-code") : null;
        const desc = r.querySelector(".q-desc") ? r.querySelector(".q-desc").value : "";
        const unit = r.querySelector(".q-unit") ? r.querySelector(".q-unit").value : "Global";
        const rawQty = r.querySelector(".q-qty") ? r.querySelector(".q-qty").value : "1";
        const rawPrice = r.querySelector(".q-price") ? r.querySelector(".q-price").value : "0";
        const qty = parseLocalizedNumber(rawQty) || 1;
        const price = parseLocalizedNumber(rawPrice) || 0;

        items.push({
            service_id: srvId,
            item_code: itemCode,
            description: desc,
            unit_measure: unit,
            quantity: qty,
            unit_price_usd: price,
            total_usd: Number((qty * price).toFixed(2))
        });
    });

    if (items.length === 0) {
        alert("Agrega al menos una partida a la cotización.");
        return;
    }

    const editId = document.getElementById("edit_quotation_id") ? document.getElementById("edit_quotation_id").value : "";
    const isEdit = Boolean(editId);

    const payload = {
        client_id: clientId,
        project_title: document.getElementById("quote_title").value,
        location: document.getElementById("quote_location").value || "Sede Central",
        execution_time: (document.getElementById("quote_execution_time").value || "").trim() || "15 días hábiles",
        currency: document.getElementById("quote_currency").value || "USD",
        validity_days: parseInt(document.getElementById("quote_validity") ? document.getElementById("quote_validity").value : 15) || 15,
        tax_percent: parseLocalizedNumber(document.getElementById("quote_tax_percent")?.value) || 0.0,
        exchange_rate: typeof EXCHANGE_RATE !== 'undefined' ? EXCHANGE_RATE : 850.0,
        notes: (document.getElementById("quote_notes")?.value || "").trim(),
        coletilla_divisas: document.getElementById("quote_coletilla_divisas") ? document.getElementById("quote_coletilla_divisas").checked : false,
        coletilla_modalidad: document.getElementById("quote_coletilla_modalidad") ? document.getElementById("quote_coletilla_modalidad").checked : false,
        coletilla_bolivares: document.getElementById("quote_coletilla_bolivares") ? document.getElementById("quote_coletilla_bolivares").checked : false,
        items: items
    };

    const btnSubmit = document.getElementById("btnSubmitQuotation");
    if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardando...';
    }

    try {
        const url = isEdit ? `${API_BASE}/quotations/${editId}` : `${API_BASE}/quotations/`;
        const method = isEdit ? "PUT" : "POST";
        const res = await authFetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || "Error al guardar el presupuesto");
        }

        const data = await res.json();
        closeModal("modalQuotation");
        const qForm = document.getElementById("quoteForm") || document.getElementById("quotationForm");
        if (qForm) qForm.reset();
        if (document.getElementById("edit_quotation_id")) document.getElementById("edit_quotation_id").value = "";

        if (typeof showToastNotification === 'function') {
            showToastNotification(isEdit ? `Presupuesto ${data.quote_number || ''} actualizado con éxito` : `Presupuesto ${data.quote_number || ''} emitido con éxito`, 'success');
        } else if (typeof showToast === 'function') {
            showToast(isEdit ? `Presupuesto ${data.quote_number || ''} actualizado con éxito` : `Presupuesto creado con éxito`, 'success');
        } else {
            alert(isEdit ? "Presupuesto actualizado con éxito." : "Presupuesto creado con éxito.");
        }

        await loadQuotations();
    } catch(err) {
        console.error("Error al guardar presupuesto:", err);
        alert("Error al guardar presupuesto: " + err.message);
    } finally {
        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Guardar Presupuesto';
        }
    }
}


// Cancelar vinculación de presupuesto al crear proyecto
function cancelQuotationConversion() {

    const convInput = document.getElementById("converting_quotation_id");

    if (convInput) convInput.value = "";
    sessionStorage.removeItem('dalor_active_converting_quote_id');

    const banner = document.getElementById("quote_conversion_banner");

    if (banner) banner.classList.add("hidden");

    const form = document.getElementById("projectCreateForm");

    if (form) form.reset();

    switchProjectSubtab('list');

}



// Convertir cotización en Proyecto con pre-llenado interactivo y edición completa

async function convertQuoteToProject(quoteId) {
    try {
        sessionStorage.setItem('dalor_active_converting_quote_id', String(quoteId));
        if (!allClients || allClients.length === 0) {
            try {
                const resCli = await authFetch(`${API_BASE}/clients/`);
                if (resCli.ok) allClients = await resCli.json();
            } catch(e) {}
        }

        const res = await authFetch(`${API_BASE}/quotations/${quoteId}`);
        if (!res.ok) throw new Error('No se pudo cargar la información del presupuesto.');
        const q = await res.json();

        // 1. Cambiar a vista de Proyectos
        switchView('projects', 'proyectos');
        switchProjectSubtab('form');
        populatePlanDropdownSelectors();

        // 2. Mostrar banner de conversión
        const convInput = document.getElementById("converting_quotation_id");
        if (convInput) convInput.value = q.id;

        const banner = document.getElementById("quote_conversion_banner");
        const bannerText = document.getElementById("quote_conversion_text");
        if (banner) banner.classList.remove("hidden");
        const clientNameStr = q.client ? q.client.name : (q.client_name || 'Cliente');
        if (bannerText) {
            bannerText.innerText = `Presupuesto [${q.quote_number}] para ${clientNameStr}. Monto: $${q.total_usd.toLocaleString('en-US', { minimumFractionDigits: 2 })}. Revisa y completa los campos a continuación:`;
        }

        // 3. Generar código correlativo de proyecto oficial desde backend (Solo Lectura)
        const codeInput = document.getElementById("new_proj_code");
        if (codeInput) {
            codeInput.readOnly = true;
            codeInput.style.backgroundColor = '#f1f5f9';
            codeInput.style.cursor = 'not-allowed';
            authFetch(`${API_BASE}/projects/next-code`)
                .then(r => r.json())
                .then(d => {
                    if (d && d.next_code && codeInput) {
                        codeInput.value = d.next_code;
                    }
                })
                .catch(err => {
                    console.warn("Fallback cálculo código proyecto:", err);
                    const projNum = (allProjects ? allProjects.length : 0) + 1;
                    if (codeInput) codeInput.value = `PRJ-2026-${String(projNum).padStart(3, '0')}`;
                });
        }

        // 4. Pre-llenar datos principales y seleccionar cliente dinámicamente
        if (document.getElementById("new_proj_name")) document.getElementById("new_proj_name").value = q.project_title || "";
        
        const projClientSelect = document.getElementById("new_proj_client_id");
        if (projClientSelect && q.client_id) {
            projClientSelect.value = String(q.client_id);
        }

        const qLoc = (q.location || '').trim();
        const isSede = !qLoc || qLoc.toLowerCase().includes('sede') || qLoc.toLowerCase().includes('central') || qLoc.toLowerCase().includes('taller') || qLoc.toLowerCase().includes('guacara');

        if (typeof setProjectType === 'function') {
            setProjectType(isSede ? 'sede' : 'foraneo');
        } else if (typeof window.setProjectType === 'function') {
            window.setProjectType(isSede ? 'sede' : 'foraneo');
        }

        if (document.getElementById("new_proj_location")) {
            document.getElementById("new_proj_location").value = qLoc || (isSede ? "Sede Central (Taller Guacara)" : "");
        }

        // Calcular días de duración
        let durDays = 30;
        if (q.execution_time) {
            const match = q.execution_time.match(/\d+/);
            if (match) durDays = parseInt(match[0]);
        }
        if (document.getElementById("new_proj_duration")) document.getElementById("new_proj_duration").value = durDays;
        if (document.getElementById("new_proj_contract")) document.getElementById("new_proj_contract").value = q.total_usd.toFixed(2);

        // Alcance técnico con desglose de partidas del presupuesto
        let itemsScope = `Obra adjudicada bajo Presupuesto ${q.quote_number}.\nPartidas y APU contratadas:\n`;
        if (q.items && q.items.length > 0) {
            itemsScope += q.items.map((it, idx) => `${idx + 1}. [${it.item_code || 'SER'}] ${it.description} (Cant: ${it.quantity} ${it.unit_measure || 'Global'})`).join('\n');
        } else {
            itemsScope += q.project_title;
        }
        if (document.getElementById("new_proj_scope")) document.getElementById("new_proj_scope").value = itemsScope;

        // No precargar datos ficticios ni bolsas porcentuales; únicamente el costo del material asociado
        if (document.getElementById("new_proj_labor")) document.getElementById("new_proj_labor").value = "0.00";
        if (document.getElementById("new_proj_fuel")) document.getElementById("new_proj_fuel").value = "0.00";
        if (document.getElementById("new_proj_tools")) document.getElementById("new_proj_tools").value = "0.00";
        if (document.getElementById("new_proj_services")) document.getElementById("new_proj_services").value = "0.00";

        if (typeof updatePlanMaterialsCostTotal === 'function') {
            updatePlanMaterialsCostTotal();
        } else if (typeof window.updatePlanMaterialsCostTotal === 'function') {
            window.updatePlanMaterialsCostTotal();
        } else if (document.getElementById("new_proj_materials")) {
            document.getElementById("new_proj_materials").value = "0.00";
        }

        // Inicialización limpia de etapas (1 sola fase limpia de inicio, 0 tareas ficticias pre-cargadas)
        const phasesContainer = document.getElementById("projectPhasesContainer");
        if (phasesContainer && typeof addProjectPhaseRow === 'function') {
            phasesContainer.innerHTML = "";
            window.phaseRowsCount = 0;
            addProjectPhaseRow("Fase 1: Ejecución del Proyecto", [], durDays, 0);
        }

        recalcProjectBudgetPreview();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch(err) {
        console.error("Error al convertir presupuesto:", err);
        alert("Error al vincular presupuesto: " + err.message);
    }
}





async function checkQuoteClientCreditRisk(clientId) {
    const alertBox = document.getElementById("quoteClientRiskAlert");
    const detailsBox = document.getElementById("quoteClientRiskDetails");
    if (!alertBox || !clientId) {
        if (alertBox) alertBox.style.display = "none";
        return;
    }

    try {
        const res = await authFetch(`${API_BASE}/clients/${clientId}/credit-risk`);
        if (!res.ok) {
            alertBox.style.display = "none";
            return;
        }

        const data = await res.json();
        if (data && data.has_risk) {
            let debtList = (data.bad_debts || []).map(b => `"¢ <strong>${b.invoice_number || 'Doc'}</strong>: $${(b.amount_usd || 0).toFixed(2)} USD <em>(${b.reason || 'Sin motivo'})</em>`).join("<br>");
            if (detailsBox) {
                detailsBox.innerHTML = `
                    Este cliente posee antecedentes de <strong>cuenta incobrable / castigada</strong> por un total de <strong>$${(data.total_bad_debt_usd || 0).toFixed(2)} USD</strong>.<br>
                    <div style="margin-top: 4px; padding: 4px 6px; background: rgba(255,255,255,0.7); border-radius: 4px;">${debtList}</div>
                    <span style="font-size: 10px; color: #881337; margin-top: 4px; display: block;">
                        <strong>Decisión Operativa:</strong> Puede autorizar emitir esta cotización bajo supervisión comercial o cambiar a otro cliente.
                    </span>
                `;
            }
            alertBox.style.display = "block";
            window.quoteClientRiskDismissed = false;
        } else {
            alertBox.style.display = "none";
            window.quoteClientRiskDismissed = true;
        }
    } catch(err) {
        console.warn("Error al verificar riesgo crediticio:", err);
        if (alertBox) alertBox.style.display = "none";
    }
}

function onQuoteClientChanged(clientId) {
    if (!clientId) {
        const alertBox = document.getElementById("quoteClientRiskAlert");
        if (alertBox) alertBox.style.display = "none";
        return;
    }
    checkQuoteClientCreditRisk(clientId);
}

function confirmQuoteClientRisk() {
    const alertBox = document.getElementById("quoteClientRiskAlert");
    if (alertBox) alertBox.style.display = "none";
    window.quoteClientRiskDismissed = true;
    const clientSelect = document.getElementById("quote_client_id");
    const opt = clientSelect ? clientSelect.options[clientSelect.selectedIndex] : null;
    if (opt) {
        console.log(`[Riesgo Crediticio] Cliente ${opt.text} autorizado manualmente para cotización.`);
    }
}

function cancelQuoteClientRisk() {
    const clientSelect = document.getElementById("quote_client_id");
    if (clientSelect) clientSelect.value = "";
    const alertBox = document.getElementById("quoteClientRiskAlert");
    if (alertBox) alertBox.style.display = "none";
    window.quoteClientRiskDismissed = false;
}


// Exponer al objeto global window para eventos inline y compatibilidad
if (typeof window !== 'undefined') {
    window.openNewQuotationModal = openNewQuotationModal;
    window.onTaxTypeChanged = onTaxTypeChanged;
    window.addQuotationRow = addQuotationRow;
    window.removeQuotationRow = removeQuotationRow;
    window.onServiceSelected = onServiceSelected;
    window.recalcQuotationTotals = recalcQuotationTotals;
    window.onQuotationCurrencyChanged = onQuotationCurrencyChanged;
    window.editQuotation = editQuotation;
    window.submitCreateQuotation = submitCreateQuotation;
    window.cancelQuotationConversion = cancelQuotationConversion;
    window.convertQuoteToProject = convertQuoteToProject;
    window.checkQuoteClientCreditRisk = checkQuoteClientCreditRisk;
    window.onQuoteClientChanged = onQuoteClientChanged;
    window.confirmQuoteClientRisk = confirmQuoteClientRisk;
    window.cancelQuoteClientRisk = cancelQuoteClientRisk;
}
