/**
 * DALOR SIGO-P | Módulo: EXPENSES_OCR.JS
 * Procesamiento de Comprobantes, Compresión de Imágenes en Cliente e Inteligencia Gemini IA
 */

var API_BASE = window.API_BASE || (window.location.origin + '/api/v1');
var EXCHANGE_RATE = window.EXCHANGE_RATE || 850.0;

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
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        let res;
        try {
            res = await authFetch(`${API_BASE}/ocr/scan-ticket`, {
                method: "POST",
                body: formData,
                signal: controller.signal
            });
        } finally {
            clearTimeout(timeoutId);
        }
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

// PUENTE GLOBAL WINDOW
if (typeof window !== 'undefined') {
    window.compressImageForOCR = compressImageForOCR;
    window.triggerFileSelect = triggerFileSelect;
    window.handleFileSelected = handleFileSelected;
    window.processOCRFile = processOCRFile;
}

export {
    compressImageForOCR,
    triggerFileSelect,
    handleFileSelected,
    processOCRFile
};
