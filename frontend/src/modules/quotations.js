/**
 * DALOR SIGO-P | Módulo: QUOTATIONS.JS
 * Extraído y desacoplado del monolito de producción (v94)
 */

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

// --- BLOQUE L4952-L6327 ---
// ----------------------------------------------------

// 6. MÓDULO DE PRESUPUESTOS (LULOWIN STYLE)

// ----------------------------------------------------

async function loadQuotations() {

    const tbody = document.getElementById("quotationsTableBody");

    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 20px; color: #94a3b8;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando cotizaciones...</td></tr>`;



    try {

        // Carga fresca paralela de cotizaciones, clientes y servicios

        const [resQuotes, resCli, resSrv] = await Promise.all([

            fetch(`${API_BASE}/quotations/`),

            fetch(`${API_BASE}/clients/`),

            fetch(`${API_BASE}/services/`)

        ]);



        if (resCli.ok) {

            const cData = await resCli.json();

            allClients = Array.isArray(cData) ? cData : [];

        }

        if (resSrv.ok) {

            const sData = await resSrv.json();

            allServices = Array.isArray(sData) ? sData : [];

        }

        populateSelectDropdowns();



        if (!resQuotes.ok) throw new Error("Error HTTP " + resQuotes.status);
        const quotesData = await resQuotes.json();
        const quotes = Array.isArray(quotesData) ? quotesData : [];

        if (quotes.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 20px; color: #94a3b8;">No hay cotizaciones emitidas. Haz clic en '+ Nueva Cotización' para armar una.</td></tr>`;
            return;
        }



        tbody.innerHTML = quotes.map(q => {

            const clientName = q.client ? q.client.name : 'Cliente General';

            const isApproved = q.status === 'aprobado';

            

            return `

            <tr>

                <td style="font-weight: 800; color: var(--dalor-blue);">${q.quote_number}</td>

                <td style="font-weight: 600;">${clientName}</td>

                <td>${q.project_title}</td>

                <td style="font-weight: 700;">$${q.subtotal_usd.toLocaleString()}</td>

                <td style="color: ${q.tax_usd === 0 ? '#10b981' : '#64748b'}; font-weight: 700;">

                    ${q.tax_usd === 0 ? 'EXENTO (0%)' : `$${q.tax_usd.toLocaleString()}`}

                </td>

                <td style="font-weight: 800; color: var(--dalor-navy);">$${q.total_usd.toLocaleString()}</td>

                <td>

                    <span style="font-size: 10px; padding: 3px 8px; border-radius: 9999px; font-weight: 800; ${isApproved ? 'background: #dcfce7; color: #166534;' : 'background: #f1f5f9; color: #475569;'}">

                        ${q.status.toUpperCase()}

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

    } catch (e) {

        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #e11d48;">Error al cargar cotizaciones.</td></tr>`;

    }

}



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

    const itemsContainer = document.getElementById("quoteItemsList");
    if (itemsContainer) itemsContainer.innerHTML = "";

    // Carga de clientes y servicios si no están en memoria
    try {
        let currentClients = (window.allClients && window.allClients.length > 0) ? window.allClients : (allClients || []);
        if (currentClients.length === 0) {
            const token = window.authToken || localStorage.getItem('dalor_token') || null;
            const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
            const resCli = await fetch(`${API_BASE}/clients/`, { headers });
            if (resCli.ok) {
                const cData = await resCli.json();
                allClients = window.allClients = Array.isArray(cData) ? cData : [];
            }
        }
        if (!window._servicesLoaded) {
            const token = window.authToken || localStorage.getItem('dalor_token') || null;
            const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
            const resSrv = await fetch(`${API_BASE}/services/`, { headers });
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



    const descVal = itemData ? (itemData.description || '').replace(/"/g, '&quot;') : '';

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
                <option value="Global">
                <option value="Und">
                <option value="Pza">
                <option value="m">
                <option value="m²">
                <option value="m³">
                <option value="ml">
                <option value="Kg">
                <option value="Ton">
                <option value="Litro">
                <option value="Galón">
                <option value="Horas">
                <option value="HH">
                <option value="Días">
                <option value="Punto">
                <option value="Juego">
                <option value="Pulg-Diam">
            </datalist>
        </div>

        <div>

            <input type="number" step="0.01" class="form-input q-qty" placeholder="Cant" value="${qtyVal}" oninput="recalcQuotationTotals()" autocomplete="off" style="font-size: 11px; padding: 5px; font-weight: bold;" required>

        </div>

        <div>

            <input type="number" step="0.01" class="form-input q-price" placeholder="P. Unit ($)" value="${priceVal}" oninput="recalcQuotationTotals()" autocomplete="off" style="font-size: 11px; padding: 5px; font-weight: bold; color: var(--dalor-blue);" required>

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

        const qty = parseFloat(qtyInp ? qtyInp.value : 0) || 0;

        const price = parseFloat(priceInp ? priceInp.value : 0) || 0;

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
            const resCli = await fetch(`${API_BASE}/clients/`, { headers });
            if (resCli.ok) {
                const cData = await resCli.json();
                allClients = window.allClients = Array.isArray(cData) ? cData : [];
            }
        }
        if (!window._servicesLoaded) {
            const resSrv = await fetch(`${API_BASE}/services/`, { headers });
            if (resSrv.ok) {
                const sData = await resSrv.json();
                allServices = window.allServices = Array.isArray(sData) ? sData : [];
                window._servicesLoaded = true;
            }
        }
        if (typeof window.populateSelectDropdowns === 'function') {
            window.populateSelectDropdowns();
        }

        const res = await fetch(`${API_BASE}/quotations/${quoteId}`, { headers });
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
        execution_time: (document.getElementById("quote_execution_time").value || "").trim() || "A convenir",
        currency: document.getElementById("quote_currency").value || "USD",
        validity_days: parseInt(document.getElementById("quote_validity") ? document.getElementById("quote_validity").value : 15) || 15,
        tax_percent: parseLocalizedNumber(document.getElementById("quote_tax_percent")?.value) || 0.0,
        exchange_rate: typeof EXCHANGE_RATE !== 'undefined' ? EXCHANGE_RATE : 850.0,
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
        const res = await fetch(url, {
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

    const banner = document.getElementById("quote_conversion_banner");

    if (banner) banner.classList.add("hidden");

    const form = document.getElementById("projectCreateForm");

    if (form) form.reset();

    switchProjectSubtab('list');

}



// Convertir cotización en Proyecto con pre-llenado interactivo y edición completa

async function convertQuoteToProject(quoteId) {
    try {
        if (!allClients || allClients.length === 0) {
            try {
                const resCli = await fetch(`${API_BASE}/clients/`);
                if (resCli.ok) allClients = await resCli.json();
            } catch(e) {}
        }

        const res = await fetch(`${API_BASE}/quotations/${quoteId}`);
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

        // 3. Generar código correlativo de proyecto
        const projNum = (allProjects ? allProjects.length : 0) + 1;
        const codeInput = document.getElementById("new_proj_code");
        if (codeInput) codeInput.value = `PRJ-2026-${String(projNum).padStart(3, '0')}`;

        // 4. Pre-llenar datos principales y seleccionar cliente dinámicamente
        if (document.getElementById("new_proj_name")) document.getElementById("new_proj_name").value = q.project_title || "";
        
        const projClientSelect = document.getElementById("new_proj_client_id");
        if (projClientSelect && q.client_id) {
            projClientSelect.value = String(q.client_id);
        }

        if (document.getElementById("new_proj_location")) document.getElementById("new_proj_location").value = q.location || "Sede Central";

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

        // Auto-distribuir bolsas de costo estimadas respetando el límite financiero (65% del contrato)
        const subtotal = q.subtotal_usd || q.total_usd || 0;
        const total = q.total_usd || 0;
        const targetBudgetLimit = subtotal * 0.65; // Margen protegido 35%

        if (document.getElementById("new_proj_labor")) document.getElementById("new_proj_labor").value = (subtotal * 0.30).toFixed(2);
        if (document.getElementById("new_proj_fuel")) document.getElementById("new_proj_fuel").value = (subtotal * 0.08).toFixed(2);
        if (document.getElementById("new_proj_materials")) document.getElementById("new_proj_materials").value = (subtotal * 0.20).toFixed(2);
        if (document.getElementById("new_proj_tools")) document.getElementById("new_proj_tools").value = (subtotal * 0.04).toFixed(2);
        if (document.getElementById("new_proj_services")) document.getElementById("new_proj_services").value = (subtotal * 0.03).toFixed(2);

        // Reconstruir las fases para que la suma de sus costos no exceda el límite presupuestario
        const phasesContainer = document.getElementById("projectPhasesContainer");
        if (phasesContainer && typeof addProjectPhaseRow === 'function') {
            phasesContainer.innerHTML = "";
            window.phaseRowsCount = 0;
            const pDays = Math.max(7, Math.round(durDays / 4));
            addProjectPhaseRow("Fase 1: Movilización, Permisos & Seguridad SHA", [
                "Gestión de pases y autorizaciones",
                "Charla de inducción y seguridad industrial SHA",
                "Movilización de cuadrilla y equipos a planta"
            ], pDays, Number((targetBudgetLimit * 0.20).toFixed(2)));

            addProjectPhaseRow("Fase 2: Ejecución Operativa / Desmontaje", [
                "Desmontaje, cortes y maniobras mecánicas",
                "Alineación y preparación de superficies"
            ], pDays, Number((targetBudgetLimit * 0.35).toFixed(2)));

            addProjectPhaseRow("Fase 3: Montaje, Armado & Ajustes", [
                "Soldadura, calderería e instalación de piezas nuevas",
                "Torque y fijación de soportería estructural"
            ], pDays, Number((targetBudgetLimit * 0.30).toFixed(2)));

            addProjectPhaseRow("Fase 4: Ensayos, Pintura & Entrega Conforme", [
                "Inspección de calidad y recubrimiento anticorrosivo",
                "Pruebas de servicio y firma de acta de entrega"
            ], pDays, Number((targetBudgetLimit * 0.15).toFixed(2)));
        }

        recalcProjectBudgetPreview();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch(err) {
        console.error("Error al convertir presupuesto:", err);
        alert("Error al vincular presupuesto: " + err.message);
    }
}



async function printQuotation(quoteId) {

    try {

        const res = await fetch(`${API_BASE}/quotations/${quoteId}`);

        if (!res.ok) throw new Error('No se pudo cargar la cotización.');

        const q = await res.json();



        const rate = q.exchange_rate || EXCHANGE_RATE || 800.0;

        const curr = (q.currency || 'USD').toUpperCase();

        

        let currSymbol = '$';

        let currLabel = 'USD';

        let currencyNotesHtml = '';

        let totalsBoxHtml = '';

        let tablePriceHeader = 'P. Unit ($)';

        let tableTotalHeader = 'Total ($)';



        if (curr === 'USD') {

            currSymbol = '$';

            currLabel = 'USD';

            tablePriceHeader = 'P. Unit ($ USD)';

            tableTotalHeader = 'Total ($ USD)';

            

            const subtotalFormatted = `$${q.subtotal_usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

            const taxFormatted = q.tax_usd === 0 ? 'EXENTO (0%)' : `$${q.tax_usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

            const totalFormatted = `$${q.total_usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;



            totalsBoxHtml = `

                <div style="display: flex; justify-content: space-between; font-size: 11.5px; margin-bottom: 4px;">

                    <span style="color: #475569;">Subtotal:</span>

                    <span style="font-weight: 700; color: #1e293b;">${subtotalFormatted}</span>

                </div>

                <div style="display: flex; justify-content: space-between; font-size: 11.5px; margin-bottom: 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">

                    <span style="color: #475569;">IVA (${q.tax_percent}%):</span>

                    <span style="font-weight: 700; color: ${q.tax_usd === 0 ? '#10b981' : '#d97706'};">${taxFormatted}</span>

                </div>

                <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: 900; color: #002B49;">

                    <span>TOTAL USD:</span>

                    <span style="color: #0072B8;">${totalFormatted}</span>

                </div>

            `;



            currencyNotesHtml = `

                <div style="background: #f8fafc; border-left: 4px solid var(--dalor-navy); padding: 8px 12px; border-radius: 4px; margin-bottom: 18px; font-size: 10px; color: #334155; line-height: 1.45;">

                    <p style="margin: 0;"><b>Condición de Pago & Cláusula Cambiaria:</b> Precios expresados en Dólares Americanos (USD). En caso de liquidación o pago en Bolívares (VES), los importes se calcularán a la tasa oficial de cambio publicada por el Banco Central de Venezuela (BCV) vigente a la fecha efectiva del pago.</p>

                </div>

            `;

        } else if (curr === 'VES') {

            currSymbol = 'Bs.';

            currLabel = 'VES';

            tablePriceHeader = 'P. Unit (Bs.)';

            tableTotalHeader = 'Total (Bs.)';



            const subBs = q.subtotal_usd * rate;

            const taxBs = q.tax_usd * rate;

            const totBs = q.total_usd * rate;



            const subtotalFormatted = `Bs. ${subBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

            const taxFormatted = taxBs === 0 ? 'EXENTO (0%)' : `Bs. ${taxBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

            const totalFormatted = `Bs. ${totBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;



            totalsBoxHtml = `

                <div style="display: flex; justify-content: space-between; font-size: 11.5px; margin-bottom: 4px;">

                    <span style="color: #475569;">Subtotal:</span>

                    <span style="font-weight: 700; color: #1e293b;">${subtotalFormatted}</span>

                </div>

                <div style="display: flex; justify-content: space-between; font-size: 11.5px; margin-bottom: 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">

                    <span style="color: #475569;">IVA (${q.tax_percent}%):</span>

                    <span style="font-weight: 700; color: ${taxBs === 0 ? '#10b981' : '#d97706'};">${taxFormatted}</span>

                </div>

                <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: 900; color: #002B49;">

                    <span>TOTAL BS:</span>

                    <span style="color: #0072B8;">${totalFormatted}</span>

                </div>

            `;



            currencyNotesHtml = `
                <div style="background: #fefce8; border: 1.5px solid #facc15; border-left: 5px solid #d97706; padding: 10px 14px; border-radius: 6px; margin-bottom: 18px; font-size: 11px; color: #713f12; line-height: 1.45;">
                    <p style="margin: 0;"><b><i class="fa-solid fa-scale-balanced" style="color: #b45309;"></i> Membrete Oficial & Cláusula Cambiaria BCV:</b> Monto cotizado expresado en USD y pagadero en Bolívares (VES) a la Tasa Oficial del Banco Central de Venezuela (BCV) vigente a la fecha efectiva de pago. Operación amparada bajo el régimen cambiario y fiscal venezolano vigente.</p>
                </div>
            `;

        } else {

            // EUR

            currSymbol = '€';

            currLabel = 'EUR';

            tablePriceHeader = 'P. Unit (€ EUR)';

            tableTotalHeader = 'Total (€ EUR)';



            const subtotalFormatted = `€ ${q.subtotal_usd.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

            const taxFormatted = q.tax_usd === 0 ? 'EXENTO (0%)' : `€ ${q.tax_usd.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

            const totalFormatted = `€ ${q.total_usd.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;



            totalsBoxHtml = `

                <div style="display: flex; justify-content: space-between; font-size: 11.5px; margin-bottom: 4px;">

                    <span style="color: #475569;">Subtotal:</span>

                    <span style="font-weight: 700; color: #1e293b;">${subtotalFormatted}</span>

                </div>

                <div style="display: flex; justify-content: space-between; font-size: 11.5px; margin-bottom: 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">

                    <span style="color: #475569;">IVA (${q.tax_percent}%):</span>

                    <span style="font-weight: 700; color: ${q.tax_usd === 0 ? '#10b981' : '#d97706'};">${taxFormatted}</span>

                </div>

                <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: 900; color: #002B49;">

                    <span>TOTAL EUR:</span>

                    <span style="color: #0072B8;">${totalFormatted}</span>

                </div>

            `;



            currencyNotesHtml = `

                <div style="background: #f8fafc; border-left: 4px solid var(--dalor-navy); padding: 8px 12px; border-radius: 4px; margin-bottom: 18px; font-size: 10px; color: #334155; line-height: 1.45;">

                    <p style="margin: 0;"><b>Condición de Pago & Cláusula Cambiaria:</b> Precios expresados en Euros (EUR). Pagaderos en Bolívares (VES) a la tasa oficial BCV vigente a la fecha efectiva del pago.</p>

                </div>

            `;

        }



        const itemsRows = (q.items || []).map((item, idx) => {

            let unitPriceDisplay = `$${item.unit_price_usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

            let totalLineDisplay = `$${item.total_usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

            

            if (curr === 'VES') {

                unitPriceDisplay = `Bs. ${(item.unit_price_usd * rate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

                totalLineDisplay = `Bs. ${(item.total_usd * rate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

            } else if (curr === 'EUR') {

                unitPriceDisplay = `€ ${item.unit_price_usd.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

                totalLineDisplay = `€ ${item.total_usd.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

            }



            return `

            <tr style="page-break-inside: avoid;">

                <td style="text-align: center; font-weight: bold; border: 1px solid #cbd5e1; padding: 6px 4px; font-size: 11px;">${idx + 1}</td>

                <td style="text-align: center; color: #0284c7; font-weight: 800; border: 1px solid #cbd5e1; padding: 6px 4px; font-size: 11px;">${item.item_code || ('SER-' + (idx+1))}</td>

                <td style="border: 1px solid #cbd5e1; padding: 6px 8px; font-weight: 600; font-size: 11px; line-height: 1.35;">${item.description}</td>

                <td style="text-align: center; border: 1px solid #cbd5e1; padding: 6px 4px; font-size: 11px;">${item.unit_measure || 'Global'}</td>

                <td style="text-align: center; font-weight: bold; border: 1px solid #cbd5e1; padding: 6px 4px; font-size: 11px;">${item.quantity}</td>

                <td style="text-align: right; border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 11px;">${unitPriceDisplay}</td>

                <td style="text-align: right; font-weight: bold; border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 11px; color: #002B49;">${totalLineDisplay}</td>

            </tr>`;

        }).join('');



        const sheetHtml = `

            <!-- Membrete DALOR -->

            <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #F5B800; padding-bottom: 10px; margin-bottom: 10px;">

                <div style="display: flex; align-items: center; gap: 12px;">

                    <img src="logo_dalor.jpg" alt="DALOR" style="height: 48px; display: block; border-radius: 4px;">

                    <div>

                        <h1 style="font-size: 17px; font-weight: 900; color: #002B49; margin: 0; letter-spacing: 0.3px;">METALMECÁNICA DALOR, C.A.</h1>

                        <p style="font-size: 10.5px; color: #475569; margin: 2px 0 0 0; font-weight: 600;">RIF: <b>J-31601195-0</b> &bull; Mantenimiento Predictivo, Proyectos Industriales & Metalmecánica</p>

                        <p style="font-size: 10px; color: #64748b; margin: 1px 0 0 0;">Av. Cámara de las Industrias, Galpón 10, Z.I. El Tigre, Guacara, Edo. Carabobo &bull; Telf: +58 0412-2407079 / 0424-4131782</p>

                    </div>

                </div>

                <div style="text-align: right;">

                    <span style="background: #002B49; color: #F5B800; padding: 4px 10px; border-radius: 6px; font-weight: 900; font-size: 13px; letter-spacing: 0.5px; display: inline-block;">${q.quote_number}</span>

                    <p style="font-size: 10.5px; color: #475569; margin: 4px 0 0 0;">Fecha: <b>${new Date(q.created_at).toLocaleDateString('es-VE')}</b></p>

                    <p style="font-size: 10.5px; color: #475569; margin: 2px 0 0 0;">Validez: <b>${q.validity_days || 15} Días</b></p>

                </div>

            </div>



            <!-- Ficha de Datos: Cliente, Obra y Condiciones -->

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px; background: #f8fafc; border: 1px solid #cbd5e1; padding: 10px 12px; border-radius: 6px;">

                <div>

                    <span style="font-size: 9.5px; font-weight: 800; color: #64748b; text-transform: uppercase;">Datos del Cliente:</span>

                    <p style="font-size: 12.5px; font-weight: 800; color: #002B49; margin: 2px 0 0 0;">${(q.client && q.client.name) || 'Cliente General'}</p>

                    <p style="font-size: 10.5px; color: #334155; margin: 2px 0 0 0;">RIF: <b>${(q.client && q.client.rif) || '-'}</b></p>

                    <p style="font-size: 10.5px; color: #475569; margin: 2px 0 0 0;">Contacto: ${(q.client && q.client.contact_name) || '-'} | Tel: ${(q.client && q.client.contact_phone) || '-'}</p>

                </div>

                <div>

                    <span style="font-size: 9.5px; font-weight: 800; color: #64748b; text-transform: uppercase;">Proyecto & Condiciones:</span>

                    <p style="font-size: 12.5px; font-weight: 800; color: #002B49; margin: 2px 0 0 0;">${q.project_title}</p>

                    <p style="font-size: 10.5px; color: #334155; margin: 2px 0 0 0;">Lugar de Ejecución: <b>${q.location || 'Sede Central'}</b></p>

                    <p style="font-size: 10.5px; color: #0284c7; margin: 2px 0 0 0;">Tiempo de Ejecución: <b>${q.execution_time || '15 días hábiles a partir del anticipo'}</b></p>

                    <p style="font-size: 10px; color: #64748b; margin: 2px 0 0 0;">Moneda de Emisión: <b>${curr === 'USD' ? 'Dólares Americanos (USD $)' : (curr === 'VES' ? 'Bolívares (VES Bs.)' : 'Euros (EUR €)')}</b></p>

                </div>

            </div>



            <!-- Tabla de Partidas / APU -->

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 11px;">

                <thead>

                    <tr style="background: #002B49; color: white;">

                        <th style="width: 25px; padding: 6px 4px; border: 1px solid #002B49; font-size: 10.5px; text-align: center;">#</th>

                        <th style="width: 75px; padding: 6px 4px; border: 1px solid #002B49; font-size: 10.5px; text-align: center;">Código</th>

                        <th style="padding: 6px 8px; border: 1px solid #002B49; font-size: 10.5px; text-align: left;">Descripción del Servicio / Partida APU</th>

                        <th style="width: 55px; padding: 6px 4px; border: 1px solid #002B49; font-size: 10.5px; text-align: center;">Unidad</th>

                        <th style="width: 45px; padding: 6px 4px; border: 1px solid #002B49; font-size: 10.5px; text-align: center;">Cant.</th>

                        <th style="width: 95px; padding: 6px 8px; border: 1px solid #002B49; font-size: 10.5px; text-align: right;">${tablePriceHeader}</th>

                        <th style="width: 105px; padding: 6px 8px; border: 1px solid #002B49; font-size: 10.5px; text-align: right;">${tableTotalHeader}</th>

                    </tr>

                </thead>

                <tbody>

                    ${itemsRows}

                </tbody>

            </table>



            <!-- Bloque de Totales -->

            <div style="display: flex; justify-content: flex-end; margin-bottom: 16px; page-break-inside: avoid;">

                <div style="width: 310px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 14px;">

                    ${totalsBoxHtml}

                </div>

            </div>



            <!-- Coletilla de Condiciones Comerciales -->

            ${currencyNotesHtml}



            <!-- Firmas de Aprobación Formal -->

            <div style="margin-top: 25px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; text-align: center; page-break-inside: avoid;">

                <div>

                    <div style="border-bottom: 1px solid #1e293b; margin-bottom: 5px;"></div>

                    <p style="font-size: 10.5px; font-weight: 800; margin: 0; color: #002B49;">Por Metalmecánica Dalor C.A.</p>

                    <p style="font-size: 9.5px; color: #64748b; margin: 0;">Gerencia de Proyectos / Estimación</p>

                </div>

                <div>

                    <div style="border-bottom: 1px solid #1e293b; margin-bottom: 5px;"></div>

                    <p style="font-size: 10.5px; font-weight: 800; margin: 0; color: #002B49;">Aceptado y Conforme por el Cliente</p>

                    <p style="font-size: 9.5px; color: #64748b; margin: 0;">Firma y Sello de Aprobación</p>

                </div>

            </div>

        `;



        document.getElementById('modalPrintPreviewContent').innerHTML = sheetHtml;

        document.getElementById('previewModalTitle').textContent = `Presupuesto ${q.quote_number} | ${(q.client && q.client.name) || 'Cliente'}`;

        document.getElementById('modalPrintPreview').classList.remove('hidden');



    } catch (e) {

        alert('Error al visualizar cotización: ' + e.message);

    }

}



function triggerPrintFromModal() {

    window.print();

}





async function loadServices() {

    const tbody = document.getElementById("servicesTableBody");

    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 20px; color: #94a3b8;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando partidas...</td></tr>`;



    try {
        const res = await fetch(`${API_BASE}/services/`);
        if (!res.ok) throw new Error("Error HTTP " + res.status);
        const srvData = await res.json();
        allServices = Array.isArray(srvData) ? srvData : [];

        if (allServices.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 30px; color: #64748b; font-weight: 500;">
                <i class="fa-solid fa-folder-open" style="font-size: 26px; color: #94a3b8; margin-bottom: 10px; display: block;"></i>
                <span style="font-size: 13px; font-weight: 700; color: #475569;">No hay partidas registradas en el catálogo (Catálogo en blanco).</span><br>
                <span style="font-size: 11px; color: #94a3b8;">Usa el botón "+ Nueva Partida" para registrar partidas oficiales de Metalmecánica Dalor.</span>
            </td></tr>`;
            return;
        }

        tbody.innerHTML = allServices.map(s => {

            const margin = s.unit_price_usd - s.base_cost_usd;

            return `

            <tr>

                <td style="font-weight: 800; color: var(--dalor-blue);">${s.code}</td>

                <td style="font-weight: 600;">${s.name}</td>

                <td><span style="font-size: 10px; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-weight: 700;">${s.category}</span></td>

                <td>${s.unit_measure}</td>

                <td>$${s.base_cost_usd.toFixed(2)}</td>

                <td style="font-weight: 800; color: var(--dalor-navy);">$${s.unit_price_usd.toFixed(2)}</td>

                <td style="color: #059669; font-weight: 700;">+$${margin.toFixed(2)}</td>

                <td style="text-align: center;">

                    <button onclick="deleteService(${s.id})" class="btn-secondary" style="padding: 4px 8px; color: #ef4444;" title="Inactivar Partida">

                        <i class="fa-solid fa-trash"></i>

                    </button>

                </td>

            </tr>`;

        }).join('');

    } catch (e) {

        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #e11d48;">Error al cargar servicios.</td></tr>`;

    }

}



function openNewServiceModal() {

    document.getElementById("serviceForm").reset();

    openModal("modalService");

}





function onServiceCategoryChanged(val) {

    const newCatInput = document.getElementById("srv_new_category");

    if (!newCatInput) return;

    if (val === '__NEW__') {

        newCatInput.classList.remove("hidden");

        newCatInput.focus();

    } else {
        newCatInput.classList.add("hidden");
    }
}

function onServiceUnitChanged(val) {
    const newUnitInput = document.getElementById("srv_new_unit");
    if (!newUnitInput) return;
    if (val === '__NEW__') {
        newUnitInput.classList.remove("hidden");
        newUnitInput.focus();
    } else {
        newUnitInput.classList.add("hidden");
        newUnitInput.value = "";
    }
}

async function submitCreateService(event) {
    if (event && event.preventDefault) event.preventDefault();
    let selectedCat = document.getElementById("srv_category").value;
    if (selectedCat === '__NEW__') {
        const customCat = (document.getElementById("srv_new_category")?.value || "").trim();
        if (!customCat) {
            alert("Por favor escribe el nombre de la nueva categoría.");
            return;
        }
        selectedCat = customCat;
    }

    let selectedUnit = document.getElementById("srv_unit").value;
    if (selectedUnit === '__NEW__') {
        const customUnit = (document.getElementById("srv_new_unit")?.value || "").trim();
        if (!customUnit) {
            alert("Por favor escribe la unidad de medida (ej: Kg, Ton, Pulg-Diam).");
            return;
        }
        selectedUnit = customUnit;
    }

    const payload = {
        code: document.getElementById("srv_code").value.trim(),
        name: document.getElementById("srv_name").value.trim(),
        category: selectedCat,
        unit_measure: selectedUnit,
        base_cost_usd: parseFloat(document.getElementById("srv_cost").value) || 0.0,
        unit_price_usd: parseFloat(document.getElementById("srv_price").value) || 0.0
    };



    try {

        const res = await fetch(`${API_BASE}/services/`, {

            method: "POST",

            headers: { "Content-Type": "application/json" },

            body: JSON.stringify(payload)

        });

        if (res.ok) {

            alert("Partida de servicio creada exitosamente.");

            closeModal("modalService");

            await loadInitialMasterData();

            loadServices();

        } else {

            const err = await res.json();

            alert("Error: " + (err.detail || JSON.stringify(err)));

        }

    } catch (e) {

        alert("Error al guardar servicio.");

    }

}



async function deleteService(serviceId) {

    if (!confirm("¿Deseas eliminar permanentemente esta partida de servicio del catálogo?")) return;

    try {

        const res = await fetch(`${API_BASE}/services/${serviceId}?permanent=true`, { method: "DELETE" });

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






// --- PUENTE DE COMPATIBILIDAD CON WINDOW & HTML INLINE ---
if (typeof window !== 'undefined') {
    window.addQuotationRow = addQuotationRow;
    window.cancelQuotationConversion = cancelQuotationConversion;
    window.convertQuoteToProject = convertQuoteToProject;
    window.deleteService = deleteService;
    window.editQuotation = editQuotation;
    window.loadQuotations = loadQuotations;
    window.loadServices = loadServices;
    window.onQuotationCurrencyChanged = onQuotationCurrencyChanged;
    window.onServiceCategoryChanged = onServiceCategoryChanged;
    window.onServiceUnitChanged = onServiceUnitChanged;
    window.onServiceSelected = onServiceSelected;
    window.onTaxTypeChanged = onTaxTypeChanged;
    window.openNewQuotationModal = openNewQuotationModal;
    window.openNewServiceModal = openNewServiceModal;
    window.printQuotation = printQuotation;
    window.recalcQuotationTotals = recalcQuotationTotals;
    window.removeQuotationRow = removeQuotationRow;
    window.submitCreateQuotation = submitCreateQuotation;
    window.submitCreateService = submitCreateService;
    window.triggerPrintFromModal = triggerPrintFromModal;
}

export { addQuotationRow, cancelQuotationConversion, convertQuoteToProject, deleteService, editQuotation, loadQuotations, loadServices, onQuotationCurrencyChanged, onServiceCategoryChanged, onServiceUnitChanged, onServiceSelected, onTaxTypeChanged, openNewQuotationModal, openNewServiceModal, printQuotation, recalcQuotationTotals, removeQuotationRow, submitCreateQuotation, submitCreateService, triggerPrintFromModal };
