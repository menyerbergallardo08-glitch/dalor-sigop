// DALOR SIGO-P ERP — Motor de Sincronización Fuera de Línea (IndexedDB & Background Sync)
// Diseñado para frentes de obra, carreteras y galpones con intermitencia de cobertura

const DB_NAME = "dalor_sigop_offline_db";
const DB_VERSION = 1;
const STORE_NAME = "pending_expenses";

// 1. Inicialización de IndexedDB
function openOfflineDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
            }
        };
        request.onsuccess = (e) => resolve(e.target.result);
        request.onerror = (e) => reject(e.target.error);
    });
}

// 2. Guardar comprobante en cola local
export async function savePendingExpenseLocally(expenseData) {
    try {
        const db = await openOfflineDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, "readwrite");
            const store = tx.objectStore(STORE_NAME);
            expenseData.saved_at = new Date().toISOString();
            const req = store.add(expenseData);
            req.onsuccess = () => {
                updateOfflineIndicators();
                resolve(req.result);
            };
            req.onerror = () => reject(req.error);
        });
    } catch (err) {
        console.error("[PWA Offline] Error guardando en IndexedDB:", err);
        throw err;
    }
}

// 3. Obtener todos los comprobantes pendientes
export async function getPendingExpenses() {
    try {
        const db = await openOfflineDB();
        return new Promise((resolve) => {
            const tx = db.transaction(STORE_NAME, "readonly");
            const store = tx.objectStore(STORE_NAME);
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => resolve([]);
        });
    } catch (err) {
        return [];
    }
}

// 4. Eliminar comprobante sincronizado
export async function removePendingExpense(id) {
    try {
        const db = await openOfflineDB();
        return new Promise((resolve) => {
            const tx = db.transaction(STORE_NAME, "readwrite");
            const store = tx.objectStore(STORE_NAME);
            const req = store.delete(id);
            req.onsuccess = () => {
                updateOfflineIndicators();
                resolve(true);
            };
            req.onerror = () => resolve(false);
        });
    } catch (err) {
        return false;
    }
}

// 5. Sincronización Automática al volver a estar en línea
export async function syncOfflineQueue() {
    if (!navigator.onLine) return;
    const pending = await getPendingExpenses();
    if (pending.length === 0) {
        updateOfflineIndicators();
        return;
    }

    console.log(`[PWA Offline] Sincronizando ${pending.length} comprobantes con Google Gemini y el servidor...`);
    let syncedCount = 0;

    for (const item of pending) {
        try {
            // A. Si tiene foto pendiente de OCR en base64 y no tiene montos
            if (item.raw_image_base64 && item.needs_ocr) {
                try {
                    const blob = await (await fetch(item.raw_image_base64)).blob();
                    const formData = new FormData();
                    formData.append("file", blob, item.file_name || "recibo_offline.jpg");
                    formData.append("exchange_rate", window.EXCHANGE_RATE || 850.0);

                    const ocrRes = await window.authFetch(`${window.API_BASE}/ocr/scan-ticket`, {
                        method: "POST",
                        body: formData
                    });
                    if (ocrRes.ok) {
                        const ocrData = await ocrRes.json();
                        item.supplier_vendor = item.supplier_vendor || ocrData.detected_vendor;
                        item.amount_usd = item.amount_usd || ocrData.detected_amount_usd;
                        item.amount_bs = item.amount_bs || ocrData.detected_amount_bs;
                        if (ocrData.image_url) item.receipt_image_path = ocrData.image_url;
                    }
                } catch (ocrErr) {
                    console.warn("[PWA Offline] Fallo secundario OCR, enviando directo:", ocrErr);
                }
            }

            // B. Enviar gasto a /api/v1/expenses/
            const payload = {
                project_id: item.project_id,
                category_id: item.category_id,
                supplier_vendor: item.supplier_vendor || "Gasto en Campo (Offline)",
                reported_by_id: item.reported_by_id || 1,
                payment_method: item.payment_method || "caja_chica",
                amount_usd: parseFloat(item.amount_usd) || 0.0,
                amount_bs: parseFloat(item.amount_bs) || 0.0,
                base_amount_usd: parseFloat(item.base_amount_usd) || 0.0,
                tax_amount_usd: parseFloat(item.tax_amount_usd) || 0.0,
                is_tax_exempt: !!item.is_tax_exempt,
                exchange_rate: window.EXCHANGE_RATE || 850.0,
                has_receipt: true,
                receipt_image_path: item.receipt_image_path || item.raw_image_base64 || null,
                notes: (item.notes ? item.notes + " • " : "") + "[Sincronizado automáticamente desde PWA Offline]"
            };

            const saveRes = await window.authFetch(`${window.API_BASE}/expenses/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (saveRes.ok) {
                await removePendingExpense(item.id);
                syncedCount++;
            }
        } catch (syncErr) {
            console.error("[PWA Offline] Error sincronizando ítem:", item.id, syncErr);
        }
    }

    if (syncedCount > 0) {
        showPwaToast(`✓ Sincronización exitosa: ${syncedCount} comprobante(s) procesado(s) en la nube.`);
        if (typeof window.loadExpensesLog === "function") {
            window.loadExpensesLog();
        }
    }
    updateOfflineIndicators();
}

// 6. Indicadores Visuales de Conexión en la Interfaz
export async function updateOfflineIndicators() {
    const isOnline = navigator.onLine;
    const statusBadges = document.querySelectorAll(".pwa-connection-indicator");
    const pendingBadges = document.querySelectorAll(".pwa-pending-counter");
    const pending = await getPendingExpenses();

    statusBadges.forEach(el => {
        if (isOnline) {
            el.className = "pwa-connection-indicator online";
            el.innerHTML = '<i class="fa-solid fa-wifi" style="color: #10b981;"></i> <span style="font-size: 11px; font-weight: 700; color: #065f46;">En Línea</span>';
        } else {
            el.className = "pwa-connection-indicator offline";
            el.innerHTML = '<i class="fa-solid fa-plane-slash" style="color: #f59e0b;"></i> <span style="font-size: 11px; font-weight: 700; color: #92400e;">Modo Offline (Guardando local)</span>';
        }
    });

    pendingBadges.forEach(el => {
        if (pending.length > 0) {
            el.style.display = "inline-flex";
            el.innerHTML = `<i class="fa-solid fa-cloud-arrow-up"></i> ${pending.length} pendiente(s)`;
        } else {
            el.style.display = "none";
        }
    });
}

function showPwaToast(msg) {
    let toast = document.getElementById("pwaToastNotification");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "pwaToastNotification";
        toast.style.cssText = "position: fixed; bottom: 20px; right: 20px; z-index: 99999; background: #0f172a; border: 1.5px solid #10b981; color: white; padding: 12px 20px; border-radius: 10px; font-size: 12px; font-weight: 700; box-shadow: 0 10px 25px rgba(0,0,0,0.5); display: flex; align-items: center; gap: 10px; transition: opacity 0.3s;";
        document.body.appendChild(toast);
    }
    toast.innerHTML = `<i class="fa-solid fa-circle-check" style="color: #10b981; font-size: 16px;"></i> <span>${msg}</span>`;
    toast.style.opacity = "1";
    toast.style.display = "flex";
    setTimeout(() => {
        toast.style.opacity = "0";
        setTimeout(() => toast.style.display = "none", 300);
    }, 4500);
}

// 7. Listeners Globales
window.addEventListener("online", () => {
    console.log("[PWA] Conexión restaurada.");
    updateOfflineIndicators();
    syncOfflineQueue();
});

window.addEventListener("offline", () => {
    console.log("[PWA] Conexión perdida. Entrando en modo Offline.");
    updateOfflineIndicators();
});

// Exponer globalmente
window.savePendingExpenseLocally = savePendingExpenseLocally;
window.getPendingExpenses = getPendingExpenses;
window.syncOfflineQueue = syncOfflineQueue;
window.updateOfflineIndicators = updateOfflineIndicators;
