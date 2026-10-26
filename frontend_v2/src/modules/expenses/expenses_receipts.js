/**
 * DALOR SIGO-P | Módulo: EXPENSES_RECEIPTS.JS
 * Visor de Comprobantes, Normalización de Rutas de Imágenes, Exportación Excel y Puesta a Cero
 */

var API_BASE = window.API_BASE || (window.location.origin + '/api/v1');

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
        const uploadFile = (file && file.type && file.type.startsWith('image/'))
            ? await compressImageForOCR(file, 1600, 1600, 0.85)
            : file;
        const formData = new FormData();
        formData.append("file", uploadFile);
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
async function exportExpensesLogExcel() {
    try {
        const res = await authFetch(`${API_BASE}/financial/reports/expenses/excel`);
        if (res.ok) {
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `DALOR_Auditoria_Gastos_${new Date().toISOString().slice(0, 10)}.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            return;
        }
    } catch(err) {
        console.warn("Backend Excel export fallback to client-side CSV:", err);
    }
    if (!allExpensesCache || allExpensesCache.length === 0) {
        alert("No hay gastos cargados para exportar.");
        return;
    }
    let csv = "Fecha;Proyecto;Partida;Proveedor;Tipo/Factura;Condicion Fiscal;Base USD;IVA USD;Total USD;Total Bs;Reportado Por;Estado\n";
    allExpensesCache.forEach(e => {
        const proj = (allProjects || []).find(p => p.id === e.project_id);
        const projLabel = proj ? `[${proj.code}] ${proj.name}` : 'Sede General';
        const cat = (allCategories || []).find(c => c.id === e.category_id);
        const catLabel = cat ? `${cat.code} ${cat.name}` : (e.category_code || 'General');
        const cond = (!e.is_tax_exempt && (e.tax_amount_usd || 0) > 0) ? 'Fiscal Con IVA' : 'Sin IVA / Exento';
        csv += `"${(e.expense_date||'').split('T')[0]}";"${projLabel}";"${catLabel}";"${e.supplier_vendor||e.vendor||''}";"${e.expense_type||e.invoice_number||''}";"${cond}";"${(e.base_amount_usd||0).toFixed(2)}";"${(e.tax_amount_usd||0).toFixed(2)}";"${(e.amount_usd||0).toFixed(2)}";"${(e.amount_bs||0).toFixed(2)}";"${e.reported_by_name||e.reported_by||''}";"${e.status||''}"\n`;
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

// PUENTE GLOBAL WINDOW
if (typeof window !== 'undefined') {
    window.resolveReceiptUrl = resolveReceiptUrl;
    window.viewReceiptImage = viewReceiptImage;
    window.exportExpensesLogExcel = exportExpensesLogExcel;
    window.submitResetToCleanSlate = submitResetToCleanSlate;
}

export {
    resolveReceiptUrl,
    viewReceiptImage,
    exportExpensesLogExcel,
    submitResetToCleanSlate
};
