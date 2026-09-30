/**
 * DALOR SIGO-P | Módulo: EXPENSES.JS
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


// --- BLOQUE L227-L322 ---
// ==============================================================================

// 📷 COMPRESIÓN DE IMÁGENES CLIENTE PARA OCR INSTANTÁNEO (<1s EN CELULARES)

// ==============================================================================

function compressImageForOCR(file, maxWidth = 1280, maxHeight = 1280, quality = 0.82) {

    return new Promise((resolve) => {

        if (!file || !file.type || !file.type.startsWith('image/')) {

            return resolve(file);

        }

        const reader = new FileReader();

        reader.onload = function(e) {

            const img = new Image();

            img.onload = function() {

                let width = img.width;

                let height = img.height;

                if (width > maxWidth || height > maxHeight) {

                    if (width > height) {

                        height = Math.round((height * maxWidth) / width);

                        width = maxWidth;

                    } else {

                        width = Math.round((width * maxHeight) / height);

                        height = maxHeight;

                    }

                }

                const canvas = document.createElement('canvas');

                canvas.width = width;

                canvas.height = height;

                const ctx = canvas.getContext('2d');

                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob(function(blob) {

                    if (blob && blob.size < file.size) {

                        const compressed = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {

                            type: "image/jpeg",

                            lastModified: Date.now()

                        });

                        resolve(compressed);

                    } else {

                        resolve(file);

                    }

                }, "image/jpeg", quality);

            };

            img.onerror = function() { resolve(file); };

            img.src = e.target.result;

        };

        reader.onerror = function() { resolve(file); };

        reader.readAsDataURL(file);

    });

}





// --- BLOQUE L6485-L7800 ---
// ----------------------------------------------------

// 9. CAPTURA OCR / PDF (CAMPO)

// ----------------------------------------------------

function triggerFileSelect() {

    document.getElementById("ticketFileInput").click();

}



function handleFileSelected(event) {

    const file = event.target.files[0];

    if (!file) return;



    const imgPreview = document.getElementById("imagePreview");

    const pdfPreview = document.getElementById("pdfPreview");

    const container = document.getElementById("imagePreviewContainer");

    const dropzone = document.getElementById("dropzoneContent");



    dropzone.classList.add("hidden");

    container.classList.remove("hidden");



    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {

        imgPreview.classList.add("hidden");

        pdfPreview.classList.remove("hidden");

        document.getElementById("pdfFileName").innerText = file.name;

    } else {

        pdfPreview.classList.add("hidden");

        imgPreview.classList.remove("hidden");

        const reader = new FileReader();

        reader.onload = function(e) {

            imgPreview.src = e.target.result;

            if (document.getElementById("field_receipt_image_path") && !document.getElementById("field_receipt_image_path").value) {

                document.getElementById("field_receipt_image_path").value = e.target.result;

            }

        };

        reader.readAsDataURL(file);

    }



    const btnSubmit = document.getElementById("btnSubmitExpense");

    if (btnSubmit) {

        btnSubmit.disabled = false;

        btnSubmit.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Enviar Comprobante a Administración';

        btnSubmit.style.background = "#059669";

        btnSubmit.style.color = "#ffffff";

    }



    processOCRFile(file);

}



async function processOCRFile(rawFile) {
    const badge = document.getElementById("ocrStatusBadge");
    const btnSubmit = document.getElementById("btnSubmitExpense");
    const procBar = document.getElementById("ocrProcessingBar");
    const infoCard = document.getElementById("ocrExtractedInfoCard");

    if (procBar) procBar.classList.remove("hidden");
    if (infoCard) infoCard.classList.add("hidden");

    if (badge) {
        badge.style.background = "#fef3c7";
        badge.style.color = "#92400e";
        badge.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Leyendo con Gemini IA...';
    }

    // 📶 Manejo si el dispositivo se encuentra sin conexión a internet
    if (!navigator.onLine) {
        if (procBar) procBar.classList.add("hidden");
        if (badge) {
            badge.style.background = "#fef3c7";
            badge.style.color = "#92400e";
            badge.innerHTML = '<i class="fa-solid fa-cloud-arrow-down"></i> Modo Offline: Foto lista para resguardo local';
        }
        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Guardar en Cola Local Offline';
            btnSubmit.style.background = "#d97706";
            btnSubmit.style.color = "#ffffff";
        }
        return;
    }

    // Compresión instantánea en el navegador (<100ms, reduce foto de 15MB a ~200KB)
    const file = await compressImageForOCR(rawFile);

    const formData = new FormData();
    formData.append("file", file, file.name);
    formData.append("exchange_rate", EXCHANGE_RATE || 800.0);

    try {
        // Asegurar que las categorías y proyectos estén cargados
        if (!allCategories || allCategories.length === 0) {
            try {
                const resCat = await authFetch(`${API_BASE}/expenses/categories`);
                allCategories = await resCat.json();
                populateSelectDropdowns();
            } catch (err) {
                console.warn("No se pudieron cargar categorías:", err);
            }
        }

        const res = await authFetch(`${API_BASE}/ocr/scan-ticket`, {
            method: "POST",
            body: formData
        });
        
        if (!res.ok) {
            throw new Error("Respuesta no exitosa del servidor OCR");
        }

        const data = await res.json();
        
        if (data.image_url && document.getElementById("field_receipt_image_path")) {
            document.getElementById("field_receipt_image_path").value = data.image_url;
        }
        if (data.detected_vendor && document.getElementById("field_vendor")) {
            document.getElementById("field_vendor").value = data.detected_vendor;
        }
        if (data.detected_amount_usd !== undefined && data.detected_amount_usd !== null && document.getElementById("field_amount_usd")) {
            document.getElementById("field_amount_usd").value = Number(data.detected_amount_usd).toFixed(2);
        }
        if (data.detected_amount_bs !== undefined && data.detected_amount_bs !== null && document.getElementById("field_amount_bs")) {
            document.getElementById("field_amount_bs").value = Number(data.detected_amount_bs).toFixed(2);
        }
        if (document.getElementById("field_is_tax_exempt")) {
            document.getElementById("field_is_tax_exempt").value = data.is_tax_exempt ? "true" : "false";
        }
        updateFieldTaxDisplays();

        if (data.fuel_liters && document.getElementById("field_fuel_liters")) {
            document.getElementById("field_fuel_liters").value = data.fuel_liters;
        }

        const cats = (window.allCategories && window.allCategories.length > 0) ? window.allCategories : allCategories;
        if (cats && cats.length > 0 && document.getElementById("field_category_id")) {
            const catMatch = cats.find(c => c.code === data.suggested_category_code) || 
                             cats.find(c => String(c.code).startsWith(String(data.suggested_category_code).split('.')[0])) ||
                             cats[0];
            if (catMatch) {
                document.getElementById("field_category_id").value = catMatch.id;
            }
        }

        // Asegurar que 'Reportado Por' tenga un valor seleccionado
        const repSelect = document.getElementById("field_reported_by");
        if (repSelect && (!repSelect.value || repSelect.value === "")) {
            repSelect.selectedIndex = 0;
        }

        if (document.getElementById("field_description")) {
            let desc = `Consumo / Factura en ${data.detected_vendor || 'Comercio'}`;
            if (data.detected_tax_usd && data.detected_tax_usd > 0) {
                desc += ` (Base: $${Number(data.detected_base_usd || 0).toFixed(2)} + IVA: $${Number(data.detected_tax_usd || 0).toFixed(2)})`;
            }
            document.getElementById("field_description").value = desc;
        }

        if (badge) {
            badge.style.background = "#dcfce7";
            badge.style.color = "#166534";
            const isGemini = data.raw_text && (data.raw_text.includes("GEMINI") || data.raw_text.includes("VISION"));
            badge.innerHTML = `<i class="fa-solid fa-check"></i> ${isGemini ? 'Datos Extraídos con Gemini IA' : 'Datos Extraídos con OCR'}`;
        }

        if (procBar) procBar.classList.add("hidden");
        if (infoCard) {
            infoCard.classList.remove("hidden");
            const vBadge = document.getElementById("ocrVendorBadge");
            const txtPrev = document.getElementById("ocrExtractedTextPreview");
            if (vBadge) vBadge.innerText = data.detected_vendor || "Detectado";
            const usdVal = Number(data.detected_amount_usd || 0).toFixed(2);
            const bsVal = Number(data.detected_amount_bs || 0).toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2});
            if (txtPrev) {
                txtPrev.innerHTML = `<strong>Total Extraído:</strong> $${usdVal} USD / Bs. ${bsVal}<br><span style="color: #065f46; font-size: 11px;">${data.raw_text ? data.raw_text.split('\n')[0] : ''}</span>`;
            }
        }

        const noticeBox = document.getElementById("ocrNoticeBox");
        if (noticeBox) {
            noticeBox.classList.remove("hidden");
        }

        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Registrar y Enviar a Administración';
            btnSubmit.style.background = "#059669";
            btnSubmit.style.color = "#ffffff";
        }
    } catch (e) {
        console.error("Error en lectura OCR:", e);
        if (procBar) procBar.classList.add("hidden");
        if (badge) {
            badge.style.background = "#fef3c7";
            badge.style.color = "#92400e";
            badge.innerHTML = '<i class="fa-solid fa-circle-info"></i> Foto adjunta (completar datos manualmente)';
        }

        if (btnSubmit) {

            btnSubmit.disabled = false;

            btnSubmit.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Enviar Comprobante a Administración';

            btnSubmit.style.background = "#059669";

            btnSubmit.style.color = "#ffffff";

        }

    }

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



// 📥 BANDEJA DE APROBACIÓN & VALIDACIÓN DE COMPROBANTES DE CAMPO

// ==============================================================================

let allPendingExpenses = [];



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





// --- BLOQUE L13127-L13704 ---
// ==============================================================================

// 📑 13. HISTÓRICO & AUDITORÍA GENERAL DE GASTOS

// ==============================================================================

let allExpensesCache = [];
let currentFilteredExpenses = [];
let currentExpensesLogPage = 1;
let expensesLogPageSize = 15;
let expensesLogSearchTimer = null;

function debouncedFilterExpensesLog() {
    clearTimeout(expensesLogSearchTimer);
    expensesLogSearchTimer = setTimeout(() => {
        filterExpensesLog();
    }, 250);
}
window.debouncedFilterExpensesLog = debouncedFilterExpensesLog;

async function loadExpensesLog() {
    const tbody = document.getElementById("expensesLogTableBody");
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="13" style="text-align:center; padding:20px; color:#64748b;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando histórico consolidado de gastos...</td></tr>`;

    try {
        let projectsList = (window.allProjects && window.allProjects.length > 0) ? window.allProjects : (allProjects || []);
        let categoriesList = (window.allCategories && window.allCategories.length > 0) ? window.allCategories : (allCategories || []);

        const fetches = [authFetch(`${API_BASE}/expenses/`)];
        if (projectsList.length === 0) fetches.push(authFetch(`${API_BASE}/projects/`));
        if (categoriesList.length === 0) fetches.push(authFetch(`${API_BASE}/expenses/categories`));

        const responses = await Promise.all(fetches);
        allExpensesCache = await responses[0].json();

        let rIdx = 1;
        if (projectsList.length === 0 && responses[rIdx]) {
            projectsList = await responses[rIdx++].json();
            window.allProjects = allProjects = projectsList;
        }
        if (categoriesList.length === 0 && responses[rIdx]) {
            categoriesList = await responses[rIdx++].json();
            window.allCategories = allCategories = categoriesList;
        }

        populateExpensesLogFilters();
        currentExpensesLogPage = 1;
        filterExpensesLog();
    } catch (e) {
        console.error("[EXPENSES] Error loading expenses log:", e);
        tbody.innerHTML = `<tr><td colspan="13" style="text-align:center; padding:20px; color:#e11d48;">Error al cargar histórico de gastos.</td></tr>`;
    }
}

function populateExpensesLogFilters() {
    const projectsList = (window.allProjects && window.allProjects.length > 0) ? window.allProjects : (allProjects || []);
    const categoriesList = (window.allCategories && window.allCategories.length > 0) ? window.allCategories : (allCategories || []);

    const projectSelect = document.getElementById("log_filter_project");
    if (projectSelect) {
        projectSelect.innerHTML = `<option value="">-- Todos los Proyectos --</option>` +
            `<option value="sede_central">🏢 Sede Central / Gastos Fijos (Sin Proyecto)</option>` +
            projectsList.map(p => `<option value="${p.id}">[${p.code || 'PRJ'}] ${p.name}</option>`).join('');
    }

    const sortedCats = typeof sortCategoriesNumerically === 'function' ? sortCategoriesNumerically(categoriesList) : categoriesList;
    const catSelect = document.getElementById("log_filter_category");
    if (catSelect) {
        catSelect.innerHTML = `<option value="">-- Todas las Partidas --</option>` +
            sortedCats.map(c => `<option value="${c.id}">[${c.code}] ${c.name}</option>`).join('');
    }
}

function filterExpensesLog() {
    const projId = document.getElementById("log_filter_project")?.value;
    const catId = document.getElementById("log_filter_category")?.value;
    const fiscal = document.getElementById("log_filter_fiscal")?.value;
    const fromDate = document.getElementById("log_filter_date_from")?.value;
    const toDate = document.getElementById("log_filter_date_to")?.value;
    const search = (document.getElementById("log_filter_search")?.value || "").toLowerCase().trim();

    currentFilteredExpenses = allExpensesCache.filter(e => {
        if (projId === 'sede_central') {
            if (e.project_id) return false;
        } else if (projId) {
            if (String(e.project_id) !== String(projId)) return false;
        }

        if (catId) {
            if (String(e.category_id) !== String(catId)) {
                const catObj = (window.allCategories || []).find(c => String(c.id) === String(catId));
                if (!catObj || !e.category_code || !e.category_code.startsWith(catObj.code)) {
                    return false;
                }
            }
        }

        const isFiscal = !e.is_tax_exempt && (e.tax_amount_usd || 0) > 0;
        if (fiscal === 'con_iva' && !isFiscal) return false;
        if (fiscal === 'sin_iva' && isFiscal) return false;

        if (fromDate) {
            const expDate = (e.expense_date || '').split('T')[0];
            if (expDate && expDate < fromDate) return false;
        }
        if (toDate) {
            const expDate = (e.expense_date || '').split('T')[0];
            if (expDate && expDate > toDate) return false;
        }

        if (search) {
            const matchText = `${e.supplier_vendor || ''} ${e.vendor || ''} ${e.invoice_number || ''} ${e.description || ''} ${e.reported_by || ''} ${e.reported_by_name || ''} ${e.category_name || ''} ${e.category_code || ''} ${e.project_name || ''} ${e.project_code || ''}`.toLowerCase();
            if (!matchText.includes(search)) return false;
        }

        return true;
    });

    currentExpensesLogPage = 1;
    renderExpensesLogTable(currentFilteredExpenses);
    updateExpensesLogKPIs(currentFilteredExpenses);
}

function updateExpensesLogKPIs(list) {
    let totalUsd = 0;
    let totalBs = 0;
    let fiscalUsd = 0;
    let fiscalCount = 0;
    let nonFiscalUsd = 0;
    let nonFiscalCount = 0;
    let totalTaxUsd = 0;

    list.forEach(e => {
        const usd = e.amount_usd || 0;
        const bs = e.amount_bs || 0;
        const tax = e.tax_amount_usd || 0;
        totalUsd += usd;
        totalBs += bs;
        totalTaxUsd += tax;

        if (!e.is_tax_exempt && tax > 0) {
            fiscalUsd += usd;
            fiscalCount++;
        } else {
            nonFiscalUsd += usd;
            nonFiscalCount++;
        }
    });

    const elTotalUsd = document.getElementById("log_kpi_total_usd");
    const elTotalBs = document.getElementById("log_kpi_total_bs");
    const elFiscalUsd = document.getElementById("log_kpi_fiscal_usd");
    const elFiscalCount = document.getElementById("log_kpi_fiscal_count");
    const elNonFiscalUsd = document.getElementById("log_kpi_nonfiscal_usd");
    const elNonFiscalCount = document.getElementById("log_kpi_nonfiscal_count");
    const elTaxUsd = document.getElementById("log_kpi_tax_usd");
    const elCountTotal = document.getElementById("log_kpi_count_total");

    if (elTotalUsd) elTotalUsd.innerText = `$${totalUsd.toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    if (elTotalBs) elTotalBs.innerText = `Bs. ${totalBs.toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    if (elFiscalUsd) elFiscalUsd.innerText = `$${fiscalUsd.toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    if (elFiscalCount) elFiscalCount.innerText = `${fiscalCount} facturas fiscales con IVA`;
    if (elNonFiscalUsd) elNonFiscalUsd.innerText = `$${nonFiscalUsd.toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    if (elNonFiscalCount) elNonFiscalCount.innerText = `${nonFiscalCount} notas / compras sin IVA`;
    if (elTaxUsd) elTaxUsd.innerText = `$${totalTaxUsd.toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    if (elCountTotal) elCountTotal.innerText = `${list.length} registros listados`;
}

function renderExpensesLogTable(list) {
    const tbody = document.getElementById("expensesLogTableBody");
    if (!tbody) return;

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="13" style="text-align:center; padding:24px; color:#94a3b8;">No se encontraron gastos que coincidan con los filtros seleccionados.</td></tr>`;
        const tfoot = document.getElementById("expensesLogTableFoot");
        if (tfoot) tfoot.innerHTML = "";
        const pagContainer = document.getElementById("expensesLogPagination");
        if (pagContainer) pagContainer.innerHTML = "";
        return;
    }

    let totBase = 0, totTax = 0, totUsd = 0, totBs = 0;
    list.forEach(e => {
        const uAmount = e.amount_usd || 0;
        const bsAmount = e.amount_bs || 0;
        const tAmount = e.tax_amount_usd || 0;
        const bAmount = (e.base_amount_usd !== undefined && e.base_amount_usd !== null && e.base_amount_usd > 0)
            ? e.base_amount_usd
            : (e.is_tax_exempt ? uAmount : (tAmount > 0 ? (uAmount - tAmount) : uAmount));

        totBase += bAmount;
        totTax += tAmount;
        totUsd += uAmount;
        totBs += bsAmount;
    });

    const paginateFn = typeof window.renderPaginationControls === 'function' 
        ? window.renderPaginationControls 
        : (typeof renderPaginationControls === 'function' ? renderPaginationControls : null);

    let pageItems = list;
    if (paginateFn) {
        const { startIndex, endIndex } = paginateFn({
            containerId: "expensesLogPagination",
            totalItems: list.length,
            currentPage: currentExpensesLogPage,
            pageSize: expensesLogPageSize,
            onPageChange: "goToExpensesLogPage",
            onPageSizeChange: "changeExpensesLogPageSize",
            itemLabel: "gasto(s) registrado(s)",
            pageSizeOptions: [10, 15, 25, 50, 100],
            allowAll: true
        });
        pageItems = list.slice(startIndex, endIndex);
    } else {
        const totalPages = Math.ceil(list.length / expensesLogPageSize) || 1;
        if (currentExpensesLogPage > totalPages) currentExpensesLogPage = totalPages;
        if (currentExpensesLogPage < 1) currentExpensesLogPage = 1;
        const startIdx = (currentExpensesLogPage - 1) * expensesLogPageSize;
        const endIdx = startIdx + expensesLogPageSize;
        pageItems = list.slice(startIdx, endIdx);
        const pagContainer = document.getElementById("expensesLogPagination");
        if (pagContainer) {
            pagContainer.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; font-size:12px; color:#64748b;">
                    <span>Mostrando ${startIdx + 1}-${Math.min(endIdx, list.length)} de ${list.length} gastos</span>
                    <div style="display:flex; gap:6px;">
                        <button class="btn-secondary" style="padding:4px 10px; font-size:11px;" onclick="goToExpensesLogPage(${currentExpensesLogPage - 1})" ${currentExpensesLogPage <= 1 ? 'disabled' : ''}>Anterior</button>
                        <span style="padding:4px 8px; font-weight:700;">${currentExpensesLogPage} / ${totalPages}</span>
                        <button class="btn-secondary" style="padding:4px 10px; font-size:11px;" onclick="goToExpensesLogPage(${currentExpensesLogPage + 1})" ${currentExpensesLogPage >= totalPages ? 'disabled' : ''}>Siguiente</button>
                    </div>
                </div>
            `;
        }
    }

    const projectsList = (window.allProjects && window.allProjects.length > 0) ? window.allProjects : (allProjects || []);
    const categoriesList = (window.allCategories && window.allCategories.length > 0) ? window.allCategories : (allCategories || []);

    tbody.innerHTML = pageItems.map((e) => {
        const dateStr = (e.expense_date || '').split('T')[0] || '-';
        const proj = projectsList.find(p => p.id === e.project_id);
        const projLabel = e.project_name ? `[${e.project_code || 'PRJ'}] ${e.project_name}` : (proj ? `[${proj.code}] ${proj.name}` : (e.project_id ? `Proyecto #${e.project_id}` : 'Gasto General Sede'));

        const cat = categoriesList.find(c => c.id === e.category_id);
        const catLabel = e.category_name ? `[${e.category_code || 'CAT'}] ${e.category_name}` : (cat ? `[${cat.code}] ${cat.name}` : (e.category_code || '10.0 General'));

        const isFiscal = !e.is_tax_exempt && (e.tax_amount_usd || 0) > 0;
        const fiscalBadge = isFiscal 
            ? `<span style="background:#dcfce7; color:#166534; padding:2px 6px; border-radius:4px; font-weight:800; font-size:10px;">Fiscal IVA</span>`
            : `<span style="background:#f1f5f9; color:#64748b; padding:2px 6px; border-radius:4px; font-weight:700; font-size:10px;">Sin IVA</span>`;

        const statusBadge = e.status === 'aprobado'
            ? `<span style="background:#d1fae5; color:#065f46; padding:2px 6px; border-radius:4px; font-weight:800; font-size:10px;">Aprobado</span>`
            : `<span style="background:#fef3c7; color:#92400e; padding:2px 6px; border-radius:4px; font-weight:800; font-size:10px;">Pendiente</span>`;

        const uAmount = e.amount_usd || 0;
        const bsAmount = e.amount_bs || 0;
        const tAmount = e.tax_amount_usd || 0;
        const bAmount = (e.base_amount_usd !== undefined && e.base_amount_usd !== null && e.base_amount_usd > 0)
            ? e.base_amount_usd
            : (e.is_tax_exempt ? uAmount : (tAmount > 0 ? (uAmount - tAmount) : uAmount));

        const repName = e.reported_by_name || e.reported_by || '-';
        const vendorName = e.supplier_vendor || e.vendor || 'Comercio';

        const viewBtn = e.receipt_image_path
            ? `<button onclick="viewReceiptImageById(${e.id})" class="btn-primary" style="padding:3px 8px; font-size:11px; background:#0284c7; cursor:pointer;" title="Ver Comprobante Digital"><i class="fa-solid fa-eye"></i></button>`
            : `<button onclick="viewReceiptImageById(${e.id})" class="btn-secondary" style="padding:2px 6px; font-size:10px; color:#94a3b8; border:1px dashed #cbd5e1; background:transparent; cursor:pointer;" title="Adjuntar Comprobante"><i class="fa-solid fa-plus"></i></button>`;

        return `
            <tr>
                <td style="font-size:11px; color:#64748b;">${dateStr}</td>
                <td style="font-weight:700; font-size:11px; color:var(--dalor-navy);">${projLabel}</td>
                <td style="font-size:11px;"><span style="background:#f0f9ff; color:#0369a1; padding:2px 5px; border-radius:4px; font-weight:700;">${catLabel}</span></td>
                <td style="font-weight:600; font-size:11px;">${vendorName}</td>
                <td style="font-family:monospace; font-size:11px;">${e.invoice_number || '-'}</td>
                <td style="text-align:center;">${fiscalBadge}</td>
                <td style="text-align:right; font-size:11px;">$${bAmount.toFixed(2)}</td>
                <td style="text-align:right; font-size:11px; color:#8b5cf6;">$${tAmount.toFixed(2)}</td>
                <td style="text-align:right; font-weight:800; font-size:12px; color:var(--dalor-navy);">$${uAmount.toFixed(2)}</td>
                <td style="text-align:right; font-weight:700; font-size:11px; color:#0284c7;">Bs. ${bsAmount.toLocaleString('es-VE', {minimumFractionDigits:2, maximumFractionDigits:2})}</td>
                <td style="font-size:11px; color:#475569;">${repName}</td>
                <td style="text-align:center;">${statusBadge}</td>
                <td style="text-align:center;">${viewBtn}</td>
            </tr>
        `;
    }).join('');

    // RENDERIZAR FILA TOTALIZADORA FIJA (TFOOT)
    let tfoot = document.getElementById("expensesLogTableFoot");
    if (!tfoot) {
        const table = tbody.closest("table");
        if (table) {
            tfoot = document.createElement("tfoot");
            tfoot.id = "expensesLogTableFoot";
            table.appendChild(tfoot);
        }
    }
    if (tfoot) {
        tfoot.innerHTML = `
            <tr style="background: var(--dalor-navy); color: white; font-weight: 800; font-size: 11px; border-top: 2px solid var(--dalor-gold);">
                <td colspan="6" style="padding: 10px 12px; text-align: left; text-transform: uppercase; letter-spacing: 0.5px;">
                    <i class="fa-solid fa-calculator" style="color: var(--dalor-gold); margin-right: 6px;"></i> TOTALIZADO AUDITORÍA (${list.length} Registros)
                </td>
                <td style="padding: 10px 8px; text-align: right; color: #93c5fd;">$${totBase.toLocaleString('es-VE', {minimumFractionDigits:2, maximumFractionDigits:2})}</td>
                <td style="padding: 10px 8px; text-align: right; color: #c4b5fd;">$${totTax.toLocaleString('es-VE', {minimumFractionDigits:2, maximumFractionDigits:2})}</td>
                <td style="padding: 10px 8px; text-align: right; color: var(--dalor-gold); font-size: 13px;">$${totUsd.toLocaleString('es-VE', {minimumFractionDigits:2, maximumFractionDigits:2})}</td>
                <td style="padding: 10px 8px; text-align: right; color: #38bdf8; font-size: 12px;">Bs. ${totBs.toLocaleString('es-VE', {minimumFractionDigits:2, maximumFractionDigits:2})}</td>
                <td colspan="3" style="padding: 10px 8px; text-align: center; color: #94a3b8; font-size: 10px;">Sincronizado con Tesorería</td>
            </tr>
        `;
    }
}

function goToExpensesLogPage(page) {
    currentExpensesLogPage = page;
    renderExpensesLogTable(currentFilteredExpenses);
}
window.goToExpensesLogPage = goToExpensesLogPage;

function changeExpensesLogPageSize(size) {
    expensesLogPageSize = parseInt(size) || 15;
    currentExpensesLogPage = 1;
    renderExpensesLogTable(currentFilteredExpenses);
}
window.changeExpensesLogPageSize = changeExpensesLogPageSize;



function resolveReceiptUrl(path) {
    if (!path) return '';
    if (path.startsWith('data:') || path.startsWith('blob:') || path.startsWith('http://') || path.startsWith('https://')) {
        return path;
    }
    const backendBase = (window.API_BASE || window.location.origin).replace(/\/api\/v1\/?$/, '');
    return path.startsWith('/') ? (backendBase + path) : (backendBase + '/' + path);
}
window.resolveReceiptUrl = resolveReceiptUrl;

window.viewReceiptImageById = function(expId) {
    const exp = (allExpensesCache || []).find(e => e.id === expId);
    if (!exp) {
        alert("Gasto no encontrado.");
        return;
    }
    viewReceiptImage(exp.receipt_image_path || '', expId);
};

window.handleModalReceiptUpload = async function(file) {
    if (!file) return;
    const expId = window.currentViewingExpenseId;
    if (!expId) {
        alert("No se ha seleccionado ningún gasto.");
        return;
    }
    const btnText = document.getElementById("receiptViewerUploadText");
    try {
        if (btnText) btnText.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Subiendo...';
        
        const formData = new FormData();
        formData.append("file", file);
        const res = await authFetch(`${API_BASE}/expenses/${expId}/receipt`, {
            method: "POST",
            body: formData
        });
        if (!res.ok) throw new Error("Error en servidor al guardar comprobante");
        const data = await res.json();
        
        // Actualizar caché en memoria
        if (window.allExpensesCache) {
            const exp = window.allExpensesCache.find(e => e.id === expId);
            if (exp) {
                exp.receipt_image_path = data.receipt_image_path;
                exp.has_receipt = true;
            }
        }
        
        // Actualizar modal
        viewReceiptImage(data.receipt_image_path, expId);
        
        // Refrescar listados
        if (typeof window.loadExpensesLog === 'function') {
            window.loadExpensesLog();
        }
        if (typeof window.loadExpensesInbox === 'function') {
            window.loadExpensesInbox();
        }
        
        alert("¡Comprobante digital actualizado y respaldado permanentemente en la base de datos!");
    } catch (err) {
        console.error(err);
        alert("Error al subir el comprobante: " + err.message);
    } finally {
        if (btnText) btnText.innerHTML = 'Adjuntar / Reemplazar Foto';
    }
};

window.openReceiptInNewTab = function() {
    const imgEl = document.getElementById("receiptViewerImg");
    if (!imgEl || !imgEl.src) return;
    const src = imgEl.src;
    if (src.startsWith("data:")) {
        const w = window.open("");
        w.document.write(`<html><head><title>Comprobante DALOR</title><style>body{margin:0;background:#0f172a;display:flex;justify-content:center;align-items:center;min-height:100vh;}img{max-width:98%;max-height:98vh;border-radius:8px;box-shadow:0 8px 30px rgba(0,0,0,0.5);}</style></head><body><img src="${src}"></body></html>`);
    } else {
        window.open(src, "_blank");
    }
};

function viewReceiptImage(imagePath, expId = null) {
    window.currentViewingExpenseId = expId;
    const fullUrl = imagePath ? resolveReceiptUrl(imagePath) : '';
    const imgEl = document.getElementById("receiptViewerImg");
    const linkEl = document.getElementById("receiptViewerDownload");
    const errContainer = document.getElementById("receiptViewerError");
    const uploadBtn = document.getElementById("receiptViewerUploadBtn");

    if (uploadBtn) {
        uploadBtn.style.display = expId ? "inline-flex" : "none";
    }

    if (errContainer) {
        errContainer.classList.add("hidden");
        errContainer.innerHTML = '';
    }

    if (imgEl) {
        if (!fullUrl) {
            imgEl.style.display = "none";
            if (errContainer) {
                errContainer.classList.remove("hidden");
                errContainer.innerHTML = `
                    <div style="padding: 24px; text-align: center; color: #94a3b8;">
                        <i class="fa-solid fa-receipt" style="font-size: 40px; color: #64748b; margin-bottom: 12px; display: block;"></i>
                        <h4 style="color: #f1f5f9; margin-bottom: 6px; font-size: 14px;">Este gasto no tiene comprobante adjunto</h4>
                        <p style="font-size: 12px; margin-bottom: 16px;">Puedes adjuntar una foto o factura en PDF usando el botón inferior.</p>
                    </div>
                `;
            }
        } else {
            imgEl.style.display = "block";
            imgEl.src = fullUrl;
            imgEl.onerror = function() {
                imgEl.style.display = "none";
                if (errContainer) {
                    errContainer.classList.remove("hidden");
                    errContainer.innerHTML = `
                        <div style="padding: 20px; text-align: center;">
                            <i class="fa-solid fa-triangle-exclamation" style="font-size: 36px; color: #f59e0b; margin-bottom: 10px; display: block;"></i>
                            <h4 style="color: #fbbf24; margin-bottom: 6px; font-size: 13px;">Comprobante físico no encontrado en disco</h4>
                            <p style="font-size: 11px; color: #94a3b8; max-width: 420px; margin: 0 auto 14px auto;">
                                El archivo temporal se reinició tras la actualización del servidor en la nube. 
                                Adjunta la foto nuevamente para resguardarla <strong>permanentemente</strong> en la base de datos.
                            </p>
                        </div>
                    `;
                }
            };
        }
    }

    if (linkEl) {
        if (fullUrl) {
            linkEl.style.display = "inline-flex";
            linkEl.href = fullUrl;
            if (fullUrl.startsWith('data:')) {
                linkEl.setAttribute('download', `Comprobante_DALOR_${Date.now()}.jpg`);
                linkEl.onclick = function(e) { e.preventDefault(); openReceiptInNewTab(); };
            } else {
                linkEl.onclick = null;
            }
        } else {
            linkEl.style.display = "none";
        }
    }

    openModal("modalReceiptViewer");
}
window.viewReceiptImage = viewReceiptImage;



function exportExpensesLogExcel() {

    if (!allExpensesCache || allExpensesCache.length === 0) {

        alert("No hay gastos cargados para exportar.");

        return;

    }

    // Formato CSV delimitado por punto y coma compatible con Excel en español

    let csv = "Fecha;Proyecto;Partida;Proveedor;Factura;Condicion Fiscal;Base USD;IVA USD;Total USD;Total Bs;Reportado Por;Estado\n";

    allExpensesCache.forEach(e => {

        const proj = allProjects.find(p => p.id === e.project_id);

        const projLabel = proj ? `[${proj.code}] ${proj.name}` : 'Sede General';

        const cat = (allCategories || []).find(c => c.id === e.category_id);

        const catLabel = cat ? `${cat.code} ${cat.name}` : (e.category_code || 'General');

        const cond = (!e.is_tax_exempt && (e.tax_amount_usd || 0) > 0) ? 'Fiscal Con IVA' : 'Sin IVA / Exento';

        

        csv += `"${(e.expense_date||'').split('T')[0]}";"${projLabel}";"${catLabel}";"${e.vendor||''}";"${e.invoice_number||''}";"${cond}";"${(e.base_amount_usd||0).toFixed(2)}";"${(e.tax_amount_usd||0).toFixed(2)}";"${(e.amount_usd||0).toFixed(2)}";"${(e.amount_bs||0).toFixed(2)}";"${e.reported_by||''}";"${e.status||''}"\n`;

    });



    const blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' });

    const link = document.createElement("a");

    link.href = URL.createObjectURL(blob);

    link.setAttribute("download", `Auditoria_Gastos_DALOR_${Date.now()}.csv`);

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

}





async function submitResetToCleanSlate(event) {

    event.preventDefault();

    const pwd = document.getElementById("clean_slate_password")?.value;

    if (!pwd) return;



    if (!confirm("⚠️ ADVERTENCIA CRÍTICA:\n\n¿Estás 100% seguro de que deseas purgar todos los registros de prueba y llevar el sistema a CERO para el arranque oficial de DALOR?\n\nEsta acción dejará la base de datos impecable para la contabilidad real.")) {

        return;

    }



    try {

        const res = await authFetch(`${API_BASE}/maintenance/reset-to-clean-slate`, {

            method: "POST",

            headers: { "Content-Type": "application/json" },

            body: JSON.stringify({ director_password: pwd })

        });

        if (res.ok) {

            const data = await res.json();

            alert("🧹 " + data.message);

            document.getElementById("clean_slate_password").value = "";

            await loadInitialMasterData();

            switchView("executive", "gerencia");

        } else {

            const err = await res.json();

            alert("❌ Error: " + (err.detail || "No se pudo realizar la puesta a cero."));

        }

    } catch (e) {

        alert("Error de conexión al ejecutar puesta a cero.");

    }

}






// --- PUENTE DE COMPATIBILIDAD CON WINDOW & HTML INLINE ---
if (typeof window !== 'undefined') {
    window.addSplitRow = addSplitRow;
    window.calcManualBs = calcManualBs;
    window.calcManualUsd = calcManualUsd;
    window.calcValBs = calcValBs;
    window.calcValUsd = calcValUsd;
    window.compressImageForOCR = compressImageForOCR;
    window.exportExpensesLogExcel = exportExpensesLogExcel;
    window.filterExpensesLog = filterExpensesLog;
    window.handleFileSelected = handleFileSelected;
    window.loadExpensesLog = loadExpensesLog;
    window.loadPendingExpensesInbox = loadPendingExpensesInbox;
    window.onValExpenseTypeChanged = onValExpenseTypeChanged;
    window.openValidateExpenseModal = openValidateExpenseModal;
    window.populateExpensesLogFilters = populateExpensesLogFilters;
    window.processOCRFile = processOCRFile;
    window.rejectCurrentExpense = rejectCurrentExpense;
    window.rejectExpense = rejectExpense;
    window.removeSplitRow = removeSplitRow;
    window.renderExpensesLogTable = renderExpensesLogTable;
    window.submitFieldExpense = submitFieldExpense;
    window.submitManualExpense = submitManualExpense;
    window.submitResetToCleanSlate = submitResetToCleanSlate;
    window.submitValidateExpense = submitValidateExpense;
    window.toggleSplitMode = toggleSplitMode;
    window.triggerFileSelect = triggerFileSelect;
    window.updateExpensesLogKPIs = updateExpensesLogKPIs;
    window.updateSplitBalance = updateSplitBalance;
    window.viewReceiptImage = viewReceiptImage;
    window.debouncedFilterExpensesLog = debouncedFilterExpensesLog;
    window.goToExpensesLogPage = goToExpensesLogPage;
    window.changeExpensesLogPageSize = changeExpensesLogPageSize;
}

export { addSplitRow, calcManualBs, calcManualUsd, calcValBs, calcValUsd, compressImageForOCR, exportExpensesLogExcel, filterExpensesLog, debouncedFilterExpensesLog, goToExpensesLogPage, changeExpensesLogPageSize, handleFileSelected, loadExpensesLog, loadPendingExpensesInbox, onValExpenseTypeChanged, openValidateExpenseModal, populateExpensesLogFilters, processOCRFile, rejectCurrentExpense, rejectExpense, removeSplitRow, renderExpensesLogTable, submitFieldExpense, submitManualExpense, submitResetToCleanSlate, submitValidateExpense, toggleSplitMode, triggerFileSelect, updateExpensesLogKPIs, updateSplitBalance, viewReceiptImage };
