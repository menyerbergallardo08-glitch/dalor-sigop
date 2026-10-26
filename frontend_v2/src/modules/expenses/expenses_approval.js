/**
 * DALOR SIGO-P | Módulo: EXPENSES_APPROVAL.JS
 * Bandeja de Entrada, Validación, Imputación Contable y Aprobación/Rechazo de Rendiciones
 */

var API_BASE = window.API_BASE || (window.location.origin + '/api/v1');
var EXCHANGE_RATE = window.EXCHANGE_RATE || 850.0;
var allPendingExpenses = [];

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

async function loadPendingExpensesInbox() {
    const tbody = document.getElementById("inboxPendingTableBody");
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 20px; color: #94a3b8;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando comprobantes pendientes...</td></tr>`;
    try {
        const res = await authFetch(`${API_BASE}/expenses/inbox/pending`);
        allPendingExpenses = await res.json();
        const badge = document.getElementById("badgeInboxCount");
        if (badge) {
            badge.innerText = allPendingExpenses.length;
            badge.style.display = allPendingExpenses.length > 0 ? "inline-block" : "none";
        }
        if (allPendingExpenses.length === 0) {
            tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 24px; color: #059669; font-weight: 700;"><i class="fa-solid fa-circle-check" style="font-size: 24px; display: block; margin-bottom: 6px;"></i> ¡Al día! No hay comprobantes pendientes por auditar o aprobar.</td></tr>`;
            return;
        }
        tbody.innerHTML = allPendingExpenses.map(exp => {
            const hasImg = !!exp.receipt_image_path;
            const imgThumb = hasImg 
                ? `<img src="${resolveReceiptUrl(exp.receipt_image_path)}" style="height: 38px; width: 38px; object-fit: cover; border-radius: 4px; border: 1px solid #cbd5e1; cursor: pointer;" onclick="openValidateExpenseModal(${exp.id})" onerror="this.onerror=null; this.src='/icons/icon-192.png'; this.title='Comprobante no disponible en disco';">` 
                : `<span style="font-size: 10px; color: #94a3b8;">Sin foto</span>`;
            return `
            <tr>
                <td style="font-size: 11px; white-space: nowrap; color: #64748b;">${exp.date}</td>
                <td style="text-align: center;">${imgThumb}</td>
                <td style="font-weight: 700; color: var(--dalor-navy);">${exp.reported_by || 'Campo'}</td>
                <td><span style="font-size: 10px; background: #e0f2fe; color: #0369a1; padding: 2px 6px; border-radius: 4px; font-weight: 800;">${exp.project_code || 'SEDE'}</span> ${exp.project_name}</td>
                <td style="font-weight: 700;">${exp.supplier_vendor || 'Comercio General'}</td>
                <td style="font-size: 12px; color: #475569;">${exp.description}</td>
                <td style="font-weight: 900; color: var(--dalor-blue); font-size: 13px;">$${(exp.amount_usd || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td style="font-size: 11px; color: #64748b;">Bs. ${(exp.amount_bs || 0).toLocaleString()}</td>
                <td style="text-align: center; white-space: nowrap;">
                    <button onclick="openValidateExpenseModal(${exp.id})" class="btn-primary" style="padding: 4px 10px; font-size: 11px; background: #059669; font-weight: 800;">
                        <i class="fa-solid fa-magnifying-glass"></i> Auditar & Aprobar
                    </button>
                    <button onclick="rejectExpense(${exp.id})" class="btn-secondary" style="padding: 4px 8px; font-size: 11px; color: #e11d48; margin-left: 4px;" title="Rechazar Comprobante">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            </tr>
            `;
        }).join('');
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: #e11d48; padding: 20px;">Error al cargar comprobantes pendientes.</td></tr>`;
    }
}
async function openValidateExpenseModal(expenseId) {
    const exp = (allPendingExpenses || []).find(e => e.id === expenseId);
    if (!exp) return;
    // Asegurar carga fresca de proyectos y categorías contables
    let projectsList = (window.allProjects && window.allProjects.length > 0) ? window.allProjects : (allProjects || []);
    let categoriesList = (window.allCategories && window.allCategories.length > 0) ? window.allCategories : (allCategories || []);
    if (projectsList.length === 0 || categoriesList.length === 0) {
        try {
            const token = window.authToken || localStorage.getItem('dalor_token');
            const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
            const [pRes, cRes] = await Promise.all([
                authFetch(`${API_BASE}/projects/`, { headers }),
                authFetch(`${API_BASE}/expenses/categories`, { headers })
            ]);
            if (pRes.ok) {
                projectsList = await pRes.json();
                window.allProjects = allProjects = projectsList;
            }
            if (cRes.ok) {
                categoriesList = await cRes.json();
                window.allCategories = allCategories = categoriesList;
            }
        } catch(e) {
            console.warn("[EXPENSES] Error recargando maestros para modal:", e);
        }
    }
    document.getElementById("val_expense_id").value = exp.id;
    document.getElementById("val_supplier_vendor").value = exp.supplier_vendor || "";
    document.getElementById("val_amount_usd").value = exp.amount_usd || "";
    document.getElementById("val_amount_bs").value = exp.amount_bs || "";
    document.getElementById("val_description").value = exp.description || "";
    document.getElementById("val_expense_type").value = exp.project_id ? "costo_obra" : "gasto_sede";
    // Foto
    const imgEl = document.getElementById("val_receipt_image");
    const linkEl = document.getElementById("val_receipt_link");
    const phEl = document.getElementById("val_receipt_placeholder");
    if (imgEl && exp.receipt_image_path) {
        const fullUrl = resolveReceiptUrl(exp.receipt_image_path);
        imgEl.src = fullUrl;
        imgEl.style.display = "block";
        if (phEl) phEl.style.display = "none";
        if (linkEl) {
            linkEl.href = fullUrl;
            linkEl.style.display = "inline-block";
        }
        imgEl.onerror = function() {
            imgEl.style.display = "none";
            if (phEl) {
                phEl.style.display = "block";
                phEl.innerHTML = `<i class="fa-solid fa-triangle-exclamation" style="color: #f59e0b; font-size: 24px;"></i><p style="margin: 4px 0 0 0; font-size: 11px; color: #b45309;">Comprobante no disponible en disco<br><span style="font-size:10px; color:#64748b;">(Reiniciado tras actualización de servidor)</span></p>`;
            }
        };
    } else if (imgEl) {
        imgEl.src = "";
        imgEl.style.display = "none";
        if (phEl) {
            phEl.style.display = "block";
            phEl.innerHTML = `<i class="fa-regular fa-image" style="font-size: 28px; color: #94a3b8;"></i><p style="margin: 4px 0 0 0; font-size: 11px; color: #64748b;">Sin comprobante digital</p>`;
        }
        if (linkEl) linkEl.style.display = "none";
    }
    if (document.getElementById("val_is_tax_exempt")) {
        document.getElementById("val_is_tax_exempt").value = exp.is_tax_exempt ? "true" : "false";
    }
    const valBase = exp.base_amount_usd !== undefined && exp.base_amount_usd !== null ? exp.base_amount_usd : (exp.is_tax_exempt ? exp.amount_usd : +(exp.amount_usd / 1.16).toFixed(2));
    const valTax = exp.tax_amount_usd !== undefined && exp.tax_amount_usd !== null ? exp.tax_amount_usd : (exp.is_tax_exempt ? 0.0 : +(exp.amount_usd - valBase).toFixed(2));
    if (document.getElementById("val_base_usd")) document.getElementById("val_base_usd").value = Number(valBase).toFixed(2);
    if (document.getElementById("val_tax_usd")) document.getElementById("val_tax_usd").value = Number(valTax).toFixed(2);
    // Proyectos Select
    const projSelect = document.getElementById("val_project_id");
    if (projSelect) {
        projSelect.innerHTML = `<option value="">-- Seleccione Proyecto --</option>` + 
            projectsList.map(p => `<option value="${p.id}" ${p.id === exp.project_id ? 'selected' : ''}>[${p.code || 'PRJ'}] ${p.name}</option>`).join('');
    }
    // Categorías Select (Orden Numérico & Preselección Inteligente por OCR)
    const catSelect = document.getElementById("val_category_id");
    if (catSelect) {
        const sortedCats = typeof sortCategoriesNumerically === 'function' ? sortCategoriesNumerically(categoriesList) : categoriesList;
        let selectedCatId = exp.category_id;
        if (!selectedCatId && exp.category_code) {
            const match = sortedCats.find(c => c.code === exp.category_code || c.code.startsWith(exp.category_code));
            if (match) selectedCatId = match.id;
        }
        catSelect.innerHTML = `<option value="">-- Seleccione Partida Dalor --</option>` + 
            sortedCats.map(c => `<option value="${c.id}" ${c.id === selectedCatId ? 'selected' : ''}>[${c.code}] ${c.name}</option>`).join('');
    }
    onValExpenseTypeChanged();
    openModal("modalValidateExpense");
}
function onValExpenseTypeChanged() {
    const type = document.getElementById("val_expense_type").value;
    const projContainer = document.getElementById("val_proj_container");
    const partnerContainer = document.getElementById("val_partner_container");
    const projSelect = document.getElementById("val_project_id");
    const partnerInput = document.getElementById("val_partner_name");
    if (type === "costo_obra") {
        if (projContainer) projContainer.classList.remove("hidden");
        if (partnerContainer) partnerContainer.classList.add("hidden");
        if (projSelect) projSelect.required = true;
        if (partnerInput) partnerInput.required = false;
    } else if (type === "retiro_socio") {
        if (projContainer) projContainer.classList.add("hidden");
        if (partnerContainer) partnerContainer.classList.remove("hidden");
        if (projSelect) { projSelect.required = false; projSelect.value = ""; }
        if (partnerInput) partnerInput.required = true;
    } else {
        if (projContainer) projContainer.classList.add("hidden");
        if (partnerContainer) partnerContainer.classList.add("hidden");
        if (projSelect) { projSelect.required = false; projSelect.value = ""; }
        if (partnerInput) { partnerInput.required = false; partnerInput.value = ""; }
    }
}
function calcValBs() {
    const usd = parseFloat(document.getElementById("val_amount_usd").value) || 0;
    const bsInput = document.getElementById("val_amount_bs");
    if (bsInput) bsInput.value = (usd * EXCHANGE_RATE).toFixed(2);
}
function calcValUsd() {
    const bs = parseFloat(document.getElementById("val_amount_bs").value) || 0;
    const usdInput = document.getElementById("val_amount_usd");
    if (usdInput && EXCHANGE_RATE > 0) usdInput.value = (bs / EXCHANGE_RATE).toFixed(2);
}
async function submitValidateExpense(event) {
    event.preventDefault();
    const expId = document.getElementById("val_expense_id").value;
    const usd = parseFloat(document.getElementById("val_amount_usd").value) || 0;
    if (usd <= 0) {
        alert("Por favor ingresa un monto válido en USD.");
        return;
    }
    const expType = document.getElementById("val_expense_type").value;
    const catVal = document.getElementById("val_category_id").value;
    const catId = parseInt(catVal);
    if (!catId || isNaN(catId)) {
        alert("Por favor selecciona una Partida Contable Dalor obligatoria para imputar el gasto.");
        return;
    }
    const projVal = document.getElementById("val_project_id")?.value;
    const projId = projVal ? parseInt(projVal) : null;
    if (expType === "costo_obra" && !projId) {
        alert("Para imputar como 'Costo Directo de Obra', debes seleccionar el Proyecto correspondiente.");
        return;
    }
    const partnerName = document.getElementById("val_partner_name")?.value?.trim() || null;
    if (expType === "retiro_socio" && !partnerName) {
        alert("Para imputar como 'Retiro Personal de Socio', debes indicar el nombre del Socio.");
        return;
    }
    const isExempt = document.getElementById("val_is_tax_exempt")?.value === "true";
    const baseUsd = parseFloat(document.getElementById("val_base_usd")?.value) || (isExempt ? usd : +(usd / 1.16).toFixed(2));
    const taxUsd = parseFloat(document.getElementById("val_tax_usd")?.value) || (isExempt ? 0.0 : +(usd - baseUsd).toFixed(2));
    const payload = {
        expense_type: expType,
        category_id: catId,
        project_id: expType === "costo_obra" ? projId : null,
        partner_name: expType === "retiro_socio" ? partnerName : null,
        supplier_vendor: document.getElementById("val_supplier_vendor").value,
        description: document.getElementById("val_description").value,
        amount_usd: usd,
        exchange_rate: EXCHANGE_RATE,
        payment_method: "caja_chica",
        has_fiscal_invoice: !isExempt,
        is_tax_exempt: isExempt,
        base_amount_usd: Math.round(baseUsd * 100) / 100,
        tax_amount_usd: Math.round(taxUsd * 100) / 100
    };
    try {
        const res = await authFetch(`${API_BASE}/expenses/inbox/${expId}/validate-impute`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            alert("¡Comprobante auditado, imputado y aprobado exitosamente!");
            closeModal("modalValidateExpense");
            loadPendingExpensesInbox();
            if (typeof loadExpensesLog === 'function') loadExpensesLog();
            if (typeof loadComparisonDashboard === 'function') loadComparisonDashboard();
            if (typeof window.loadProjects === 'function') window.loadProjects();
            if (typeof window.loadFinancialData === 'function') window.loadFinancialData();
            if (typeof window.loadCashFlowMatrix === 'function') window.loadCashFlowMatrix();
        } else {
            const err = await res.json();
            alert("Error: " + (err.detail || JSON.stringify(err)));
        }
    } catch (e) {
        alert("Error de conexión al aprobar comprobante.");
    }
}
async function rejectCurrentExpense() {
    const expId = document.getElementById("val_expense_id").value;
    rejectExpense(expId);
}
async function rejectExpense(expenseId) {
    const reason = prompt("Indica el motivo del rechazo del comprobante (ej: Foto ilegible, Monto no coincide, etc.):", "Comprobante rechazado por administración");
    if (!reason) return;
    try {
        const res = await authFetch(`${API_BASE}/expenses/inbox/${expenseId}/reject?reason=${encodeURIComponent(reason)}`, {
            method: "PUT"
        });
        if (res.ok) {
            alert("Comprobante rechazado.");
            closeModal("modalValidateExpense");
            loadPendingExpensesInbox();
        } else {
            alert("Error al rechazar comprobante.");
        }
    } catch (e) {
        alert("Error de conexión con el servidor.");
    }
}

// PUENTE GLOBAL WINDOW
if (typeof window !== 'undefined') {
    window.loadPendingExpensesInbox = loadPendingExpensesInbox;
    window.openValidateExpenseModal = openValidateExpenseModal;
    window.onValExpenseTypeChanged = onValExpenseTypeChanged;
    window.calcValBs = calcValBs;
    window.calcValUsd = calcValUsd;
    window.submitValidateExpense = submitValidateExpense;
    window.rejectCurrentExpense = rejectCurrentExpense;
    window.rejectExpense = rejectExpense;
}

export {
    loadPendingExpensesInbox,
    openValidateExpenseModal,
    onValExpenseTypeChanged,
    calcValBs,
    calcValUsd,
    submitValidateExpense,
    rejectCurrentExpense,
    rejectExpense
};
