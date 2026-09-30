// DALOR SIGO-P ERP — Motor de Sincronización Fuera de Línea e Instalación PWA
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
            el.innerHTML = '<i class="fa-solid fa-plane-slash" style="color: #f59e0b;"></i> <span style="font-size: 11px; font-weight: 700; color: #92400e;">Modo Offline</span>';
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

// 7. GESTOR DE INSTALACIÓN PWA (Banner y Botones Visibles)
let deferredInstallPrompt = null;

export function initPwaInstallation() {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    if (isStandalone) {
        return; // Ya está corriendo como App instalada
    }

    // Capturar evento antes de instalar (Chrome / Edge / Android)
    window.addEventListener("beforeinstallprompt", (e) => {
        e.preventDefault();
        deferredInstallPrompt = e;
        console.log("[PWA] beforeinstallprompt capturado con éxito.");
        renderFloatingInstallBanner();
    });

    // Renderizar banner después de 1 segundo de carga inicial
    setTimeout(() => {
        renderFloatingInstallBanner();
    }, 1200);
}

export function triggerPwaInstall() {
    if (deferredInstallPrompt) {
        deferredInstallPrompt.prompt();
        deferredInstallPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === "accepted") {
                console.log("[PWA] Instalación aceptada por el usuario.");
                dismissFloatingInstallBanner();
            }
            deferredInstallPrompt = null;
        });
        return;
    }

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    if (isIOS) {
        showIosInstallModal();
        return;
    }

    showDesktopInstallModal();
}

function renderFloatingInstallBanner() {
    if (document.getElementById("pwaInstallFloatingBanner")) return;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    if (isStandalone) return;

    const banner = document.createElement("div");
    banner.id = "pwaInstallFloatingBanner";
    banner.style.cssText = "position: fixed; bottom: 18px; left: 50%; transform: translateX(-50%); z-index: 100000; width: calc(100% - 24px); max-width: 460px; background: #0f172a; border: 2px solid #f59e0b; border-radius: 16px; padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; gap: 10px; box-shadow: 0 15px 35px rgba(0,0,0,0.6);";

    banner.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <div style="background: #1e293b; width: 42px; height: 42px; border-radius: 12px; display: flex; align-items: center; justify-content: center; border: 1.5px solid #f59e0b; flex-shrink: 0;">
                <img src="/icons/icon-192.png" style="width: 28px; height: 28px; object-fit: contain;" alt="Dalor Logo">
            </div>
            <div>
                <div style="font-size: 13px; font-weight: 800; color: #ffffff;">Instalar DALOR SIGO-P</div>
                <div style="font-size: 11px; color: #cbd5e1;">Abrir en 1 toque como App móvil</div>
            </div>
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
            <button onclick="window.triggerPwaInstall()" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #0f172a; border: none; padding: 8px 14px; border-radius: 10px; font-weight: 900; font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 6px; box-shadow: 0 4px 10px rgba(245, 158, 11, 0.4);">
                <i class="fa-solid fa-download"></i> Instalar
            </button>
            <button onclick="window.dismissFloatingInstallBanner()" style="background: none; border: none; color: #94a3b8; font-size: 18px; cursor: pointer; padding: 6px;">&times;</button>
        </div>
    `;
    document.body.appendChild(banner);
}

export function dismissFloatingInstallBanner() {
    const b = document.getElementById("pwaInstallFloatingBanner");
    if (b) b.remove();
}

function showIosInstallModal() {
    let modal = document.getElementById("modalIosInstallGuide");
    if (modal) modal.remove();
    modal = document.createElement("div");
    modal.id = "modalIosInstallGuide";
    modal.style.cssText = "position: fixed; inset: 0; background: rgba(0,0,0,0.75); z-index: 100002; display: flex; align-items: center; justify-content: center; padding: 16px; backdrop-filter: blur(5px);";
    modal.innerHTML = `
        <div style="background: #ffffff; width: 100%; max-width: 380px; border-radius: 20px; padding: 24px; text-align: center; box-shadow: 0 25px 50px rgba(0,0,0,0.5);">
            <div style="background: #f1f5f9; width: 56px; height: 56px; border-radius: 14px; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px auto; font-size: 26px; color: #0284c7;">
                <i class="fa-brands fa-apple"></i>
            </div>
            <h3 style="font-size: 17px; font-weight: 800; color: #0f172a; margin-bottom: 6px;">Instalar en iPhone / iPad</h3>
            <p style="font-size: 12px; color: #64748b; line-height: 1.4; margin-bottom: 16px;">Sigue estos 2 sencillos pasos en Safari:</p>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; text-align: left; display: flex; flex-direction: column; gap: 12px; font-size: 12px; color: #334155; margin-bottom: 18px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="background: #0284c7; color: white; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 11px;">1</span>
                    <span>Toca el botón <strong>Compartir</strong> <i class="fa-solid fa-arrow-up-from-bracket" style="color: #0284c7;"></i> en la barra inferior de Safari.</span>
                </div>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="background: #0284c7; color: white; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 11px;">2</span>
                    <span>Desplázate hacia abajo y selecciona <strong>"Agregar a pantalla de inicio"</strong>.</span>
                </div>
            </div>
            <button onclick="document.getElementById('modalIosInstallGuide').remove()" style="width: 100%; background: #0f172a; color: white; border: none; padding: 12px; border-radius: 12px; font-weight: 800; font-size: 13px; cursor: pointer;">
                Entendido
            </button>
        </div>
    `;
    document.body.appendChild(modal);
}

function showDesktopInstallModal() {
    let modal = document.getElementById("modalDesktopInstallGuide");
    if (modal) modal.remove();
    modal = document.createElement("div");
    modal.id = "modalDesktopInstallGuide";
    modal.style.cssText = "position: fixed; inset: 0; background: rgba(0,0,0,0.75); z-index: 100002; display: flex; align-items: center; justify-content: center; padding: 16px; backdrop-filter: blur(5px);";
    modal.innerHTML = `
        <div style="background: #ffffff; width: 100%; max-width: 400px; border-radius: 20px; padding: 24px; text-align: center; box-shadow: 0 25px 50px rgba(0,0,0,0.5);">
            <div style="background: #fef3c7; width: 56px; height: 56px; border-radius: 14px; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px auto; font-size: 26px; color: #d97706;">
                <i class="fa-solid fa-mobile-screen-button"></i>
            </div>
            <h3 style="font-size: 17px; font-weight: 800; color: #0f172a; margin-bottom: 6px;">Instalar DALOR SIGO-P</h3>
            <p style="font-size: 12px; color: #64748b; line-height: 1.4; margin-bottom: 16px;">Para instalar la aplicación en este dispositivo:</p>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; text-align: left; display: flex; flex-direction: column; gap: 10px; font-size: 12px; color: #334155; margin-bottom: 18px;">
                <div><i class="fa-solid fa-laptop" style="color: #0284c7;"></i> <strong>En PC (Chrome / Edge):</strong> Haz clic en el ícono de instalación <i class="fa-solid fa-download" style="color: #0284c7;"></i> en la barra de direcciones superior (a la derecha).</div>
                <div><i class="fa-brands fa-android" style="color: #10b981;"></i> <strong>En Android:</strong> Abre el menú de 3 puntos (⋮) arriba a la derecha y selecciona <strong>"Instalar aplicación"</strong> o "Agregar a la pantalla principal".</div>
            </div>
            <button onclick="document.getElementById('modalDesktopInstallGuide').remove()" style="width: 100%; background: #0f172a; color: white; border: none; padding: 12px; border-radius: 12px; font-weight: 800; font-size: 13px; cursor: pointer;">
                Cerrar
            </button>
        </div>
    `;
    document.body.appendChild(modal);
}

// 8. Listeners Globales
window.addEventListener("online", () => {
    console.log("[PWA] Conexión restaurada.");
    updateOfflineIndicators();
    syncOfflineQueue();
});

window.addEventListener("offline", () => {
    console.log("[PWA] Conexión perdida. Modo Offline activo.");
    updateOfflineIndicators();
});

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
        initPwaInstallation();
        updateOfflineIndicators();
    });
} else {
    initPwaInstallation();
    updateOfflineIndicators();
}

// Exponer globalmente
window.savePendingExpenseLocally = savePendingExpenseLocally;
window.getPendingExpenses = getPendingExpenses;
window.syncOfflineQueue = syncOfflineQueue;
window.updateOfflineIndicators = updateOfflineIndicators;
window.triggerPwaInstall = triggerPwaInstall;
window.dismissFloatingInstallBanner = dismissFloatingInstallBanner;
