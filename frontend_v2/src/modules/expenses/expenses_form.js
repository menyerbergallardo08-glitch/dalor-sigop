/**
 * DALOR SIGO-P | Módulo: EXPENSES_FORM.JS
 * Formulario de Rendición de Gastos (Campo y Manual), Centros de Costo y Split Multicentro
 */

var API_BASE = window.API_BASE || (window.location.origin + '/api/v1');
var EXCHANGE_RATE = window.EXCHANGE_RATE || 850.0;
var splitRowsCount = 0;

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

function toggleSplitMode() {
    const isSplit = document.getElementById("chkEnableSplit").checked;
    const splitContainer = document.getElementById("splitRowsContainer");
    const singleBlock = document.getElementById("singleItemBlock");
    if (isSplit) {
        splitContainer.classList.remove("hidden");
        singleBlock.style.opacity = "0.5";
        singleBlock.style.pointerEvents = "none";
        if (splitRowsCount === 0) {
            addSplitRow();
            addSplitRow();
        }
    } else {
        splitContainer.classList.add("hidden");
        singleBlock.style.opacity = "1";
        singleBlock.style.pointerEvents = "auto";
    }
    updateSplitBalance();
}
function addSplitRow() {
    splitRowsCount++;
    const container = document.getElementById("splitItemsList");
    const rowId = `split_row_${splitRowsCount}`;
    const catOptions = allCategories.map(c => `<option value="${c.id}">[${c.code}] ${c.name}</option>`).join('');
    const projOptions = `<option value="">-- General Sede --</option>` + 
        allProjects.map(p => `<option value="${p.id}">${p.code} - ${p.name}</option>`).join('');
    const div = document.createElement("div");
    div.id = rowId;
    div.style.cssText = "display: grid; grid-template-columns: 2fr 2fr 1fr 2fr 25px; gap: 4px; background: white; padding: 6px; border-radius: 6px; border: 1px solid #fde68a; align-items: center; font-size: 11px;";
    div.innerHTML = `
        <select class="form-select split-cat" style="font-size: 11px; padding: 4px;">${catOptions}</select>
        <select class="form-select split-proj" style="font-size: 11px; padding: 4px;">${projOptions}</select>
        <input type="number" step="0.01" class="form-input split-amt" placeholder="$" oninput="updateSplitBalance()" style="font-size: 11px; padding: 4px; font-weight: bold; color: var(--dalor-blue);" required>
        <input type="text" class="form-input split-desc" placeholder="Detalle parte" style="font-size: 11px; padding: 4px;">
        <button type="button" onclick="removeSplitRow('${rowId}')" style="background: none; border: none; color: #ef4444; font-size: 14px; cursor: pointer;">&times;</button>
    `;
    container.appendChild(div);
    updateSplitBalance();
}
function removeSplitRow(rowId) {
    const el = document.getElementById(rowId);
    if (el) el.remove();
    updateSplitBalance();
}
function updateSplitBalance() {
    const totalUsd = parseFloat(document.getElementById("field_amount_usd").value) || 0;
    const amtInputs = document.querySelectorAll(".split-amt");
    let sum = 0;
    amtInputs.forEach(i => sum += parseFloat(i.value) || 0);
    const diff = (totalUsd - sum).toFixed(2);
    const span = document.getElementById("splitSumBalance");
    if (Math.abs(diff) < 0.01 && totalUsd > 0) {
        span.innerHTML = `<span style="color: #059669; font-weight: 800;">✓ Suma cuadra: $${sum.toFixed(2)} = Total $${totalUsd.toFixed(2)}</span>`;
    } else {
        span.innerHTML = `<span style="color: #e11d48; font-weight: 800;">Suma: $${sum.toFixed(2)} / Total: $${totalUsd.toFixed(2)} (Dif: $${diff})</span>`;
    }
}
async function submitFieldExpense(event) {
    if (event && event.preventDefault) event.preventDefault();
    const btnSubmit = document.getElementById("btnSubmitExpense");
    const origBtnHtml = btnSubmit ? btnSubmit.innerHTML : 'Registrar y Enviar';
    const isSplit = document.getElementById("chkEnableSplit") ? document.getElementById("chkEnableSplit").checked : false;
    let totalUsd = parseFloat(document.getElementById("field_amount_usd")?.value) || 0;
    let bsAmount = parseFloat(document.getElementById("field_amount_bs")?.value) || 0;
    // Si tiene monto en Bs pero no en USD, convertir automáticamente
    if (totalUsd <= 0 && bsAmount > 0) {
        totalUsd = Math.round((bsAmount / (EXCHANGE_RATE || 800.0)) * 100) / 100;
        if (document.getElementById("field_amount_usd")) {
            document.getElementById("field_amount_usd").value = totalUsd.toFixed(2);
        }
    } else if (bsAmount <= 0 && totalUsd > 0) {
        bsAmount = Math.round(totalUsd * (EXCHANGE_RATE || 800.0) * 100) / 100;
        if (document.getElementById("field_amount_bs")) {
            document.getElementById("field_amount_bs").value = bsAmount.toFixed(2);
        }
    }
    if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Enviando a Administración...';
    }
    const isExempt = document.getElementById("field_is_tax_exempt")?.value === "true";
    const baseAmt = parseFloat(document.getElementById("field_base_amount_usd")?.value) || (isExempt ? totalUsd : +(totalUsd / 1.16).toFixed(2));
    const taxAmt = parseFloat(document.getElementById("field_tax_amount_usd")?.value) || (isExempt ? 0.0 : +(totalUsd - baseAmt).toFixed(2));
    const imgPath = document.getElementById("field_receipt_image_path")?.value || null;
    let payload = {
        supplier_vendor: document.getElementById("field_vendor")?.value || "Por auditar en oficina",
        reported_by_id: parseInt(document.getElementById("field_reported_by")?.value) || 1,
        payment_method: document.getElementById("field_payment_method")?.value || "caja_chica",
        amount_usd: totalUsd,
        amount_bs: bsAmount,
        base_amount_usd: Math.round(baseAmt * 100) / 100,
        tax_amount_usd: Math.round(taxAmt * 100) / 100,
        is_tax_exempt: isExempt,
        exchange_rate: EXCHANGE_RATE || 800.0,
        has_receipt: true,
        receipt_image_path: imgPath
    };
    if (isSplit) {
        const rows = document.querySelectorAll("#splitItemsList > div");
        let splitItems = [];
        let runningSum = 0;
        rows.forEach(r => {
            const catId = parseInt(r.querySelector(".split-cat").value);
            const projId = r.querySelector(".split-proj").value ? parseInt(r.querySelector(".split-proj").value) : null;
            const amt = parseFloat(r.querySelector(".split-amt").value) || 0;
            const desc = r.querySelector(".split-desc").value || "Parte desglosada";
            runningSum += amt;
            splitItems.push({ category_id: catId, project_id: projId, amount_usd: amt, description: desc });
        });
        if (Math.abs(totalUsd - runningSum) > 0.05) {
            alert(`La suma del desglose ($${runningSum.toFixed(2)}) no coincide con el total de la factura ($${totalUsd.toFixed(2)}).`);
            if (btnSubmit) { btnSubmit.disabled = false; btnSubmit.innerHTML = origBtnHtml; }
            return;
        }
        payload.category_id = splitItems[0].category_id;
        payload.description = `Factura Desglosada (${splitItems.length} partidas) en ${payload.supplier_vendor}`;
        payload.split_items = splitItems;
    } else {
        payload.category_id = parseInt(document.getElementById("field_category_id")?.value) || 1;
        payload.project_id = document.getElementById("field_project_id")?.value ? parseInt(document.getElementById("field_project_id").value) : null;
        payload.asset_id = document.getElementById("field_asset_id")?.value ? parseInt(document.getElementById("field_asset_id").value) : null;
        payload.description = document.getElementById("field_description")?.value || (payload.supplier_vendor ? `Compra en ${payload.supplier_vendor}` : "Comprobante de campo");
        payload.fuel_liters = document.getElementById("field_fuel_liters")?.value ? parseFloat(document.getElementById("field_fuel_liters").value) : null;
        payload.odometer_at_fueling = document.getElementById("field_odometer")?.value ? parseFloat(document.getElementById("field_odometer").value) : null;
    }
    // Asociación automática de usuario que reporta
    const repName = currentUser ? (currentUser.full_name || currentUser.username) : "Personal de Campo";
    payload.reported_by_name = repName;
    // 📶 Resguardo Automático si el dispositivo está sin cobertura (Modo Offline PWA)
    if (!navigator.onLine) {
        if (typeof window.savePendingExpenseLocally === "function") {
            try {
                await window.savePendingExpenseLocally(payload);
                alert("📶 MODO SIN CONEXIÓN:\n\nTu comprobante ha sido resguardado de forma segura en la memoria de este teléfono.\n\nApenas detecte señal WiFi o datos móviles (4G), se transmitirá automáticamente a Administración y Google Gemini.");
                document.getElementById("expenseForm")?.reset();
                document.getElementById("imagePreviewContainer")?.classList.add("hidden");
                document.getElementById("dropzoneContent")?.classList.remove("hidden");
                document.getElementById("ocrNoticeBox")?.classList.add("hidden");
                if (btnSubmit) { btnSubmit.disabled = false; btnSubmit.innerHTML = origBtnHtml; }
                return;
            } catch (storeErr) {
                console.warn("[PWA Offline] Error al almacenar en IndexedDB:", storeErr);
            }
        }
    }
    try {
        const res = await authFetch(`${API_BASE}/expenses/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        // 🛡️ Filtro Anti-Duplicados
        if (res.status === 409) {
            const err = await res.json();
            const msg = typeof err.detail === 'object' ? err.detail.message : err.detail;
            const confirmDup = confirm(`⚠️ ALERTA DE COMPROBANTE DUPLICADO:\n\n${msg}\n\n¿Deseas registrar este comprobante de todas formas?`);
            if (confirmDup) {
                payload.allow_duplicate = true;
                const res2 = await authFetch(`${API_BASE}/expenses/`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });
                if (res2.ok) {
                    alert("¡Gasto registrado con éxito y enviado a Administración!");
                    document.getElementById("expenseForm").reset();
                    document.getElementById("imagePreviewContainer")?.classList.add("hidden");
                    document.getElementById("dropzoneContent")?.classList.remove("hidden");
                    document.getElementById("ocrNoticeBox")?.classList.add("hidden");
                    const isCampo = (currentUser?.role_name || currentUser?.username || '').toLowerCase().includes('campo');
                    if (isCampo) {
                        switchView('pwa', 'gastos');
                    } else {
                        switchView('expenses-log', 'gastos');
                    }
                    return;
                }
            }
            if (btnSubmit) { btnSubmit.disabled = false; btnSubmit.innerHTML = origBtnHtml; }
            return;
        }
        if (res.ok) {
            alert("¡Comprobante enviado con éxito a la Bandeja de Administración!");
            document.getElementById("expenseForm").reset();
            document.getElementById("imagePreviewContainer")?.classList.add("hidden");
            document.getElementById("dropzoneContent")?.classList.remove("hidden");
            document.getElementById("ocrNoticeBox")?.classList.add("hidden");
            if (document.getElementById("chkEnableSplit")) {
                document.getElementById("chkEnableSplit").checked = false;
                toggleSplitMode();
            }
            // Refrescar inbox y navegar directamente a la Bandeja de Aprobación
            await loadPendingExpensesInbox();
            updatePendingInboxBadge();
            switchView('inbox', 'gastos');
        } else {
            let errorMsg = `Error del servidor (${res.status})`;
            try {
                const err = await res.json();
                if (typeof err.detail === 'string') {
                    errorMsg = err.detail;
                } else if (Array.isArray(err.detail)) {
                    errorMsg = err.detail.map(d => d.msg || JSON.stringify(d)).join(', ');
                } else if (err.detail) {
                    errorMsg = JSON.stringify(err.detail);
                }
            } catch (pErr) {
                try { errorMsg = await res.text(); } catch(tErr) {}
            }
            alert("⚠️ " + errorMsg);
        }
    } catch (e) {
        console.error("Error al enviar gasto:", e);
        if (typeof window.savePendingExpenseLocally === "function") {
            try {
                await window.savePendingExpenseLocally(payload);
                alert("📶 MODO SIN CONEXIÓN:\n\nHubo una interrupción en la red durante la transmisión. El comprobante ha sido resguardado de forma segura en la memoria de este teléfono y se enviará automáticamente al reconectar.");
                document.getElementById("expenseForm")?.reset();
                document.getElementById("imagePreviewContainer")?.classList.add("hidden");
                document.getElementById("dropzoneContent")?.classList.remove("hidden");
                document.getElementById("ocrNoticeBox")?.classList.add("hidden");
                if (btnSubmit) { btnSubmit.disabled = false; btnSubmit.innerHTML = origBtnHtml; }
                return;
            } catch (errDb) {}
        }
        alert("⚠️ Error al registrar comprobante: " + (e.message || e));
    } finally {
        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = origBtnHtml;
        }
    }
}
// ----------------------------------------------------
// 10. CARGA MANUAL DE OFICINA
// ----------------------------------------------------
function calcManualBs() {
    const usd = parseFloat(document.getElementById("manual_amount_usd").value) || 0;
    const bsInput = document.getElementById("manual_amount_bs");
    if (bsInput) bsInput.value = (usd * EXCHANGE_RATE).toFixed(2);
}
function calcManualUsd() {
    const bs = parseFloat(document.getElementById("manual_amount_bs").value) || 0;
    const usdInput = document.getElementById("manual_amount_usd");
    if (usdInput) usdInput.value = (bs / EXCHANGE_RATE).toFixed(2);
}
async function submitManualExpense(event) {
    event.preventDefault();
    const usd = parseFloat(document.getElementById("manual_amount_usd").value) || 0;
    if (usd <= 0) {
        alert("Ingresa un monto válido en USD.");
        return;
    }
    const payload = {
        category_id: parseInt(document.getElementById("manual_category_id").value) || 1,
        project_id: document.getElementById("manual_project_id").value ? parseInt(document.getElementById("manual_project_id").value) : null,
        reported_by_id: parseInt(document.getElementById("manual_reported_by").value) || 1,
        description: document.getElementById("manual_description").value,
        supplier_vendor: document.getElementById("manual_vendor").value || "Sede Central",
        amount_usd: usd,
        amount_bs: parseFloat(document.getElementById("manual_amount_bs").value) || (usd * EXCHANGE_RATE),
        exchange_rate: EXCHANGE_RATE,
        payment_method: document.getElementById("manual_payment_method").value,
        has_receipt: false
    };
    try {
        const res = await authFetch(`${API_BASE}/expenses/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            alert("¡Gasto / Transferencia de oficina guardado exitosamente!");
            document.getElementById("manualExpenseForm").reset();
            switchView('expenses-log', 'gastos');
        } else {
            const err = await res.json();
        }
    } catch (err) {
        alert("Error de conexión: " + err.message);
    }
}

// PUENTE GLOBAL WINDOW
if (typeof window !== 'undefined') {
    window.toggleSplitMode = toggleSplitMode;
    window.addSplitRow = addSplitRow;
    window.removeSplitRow = removeSplitRow;
    window.updateSplitBalance = updateSplitBalance;
    window.submitFieldExpense = submitFieldExpense;
    window.calcManualBs = calcManualBs;
    window.calcManualUsd = calcManualUsd;
    window.submitManualExpense = submitManualExpense;
}

export {
    toggleSplitMode,
    addSplitRow,
    removeSplitRow,
    updateSplitBalance,
    submitFieldExpense,
    calcManualBs,
    calcManualUsd,
    submitManualExpense
};
