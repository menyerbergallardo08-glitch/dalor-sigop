/**
 * DALOR SIGO-P | Módulo: CORE_ALERTS.JS
 * Desacoplado de core.js
 * Sistema de alertas en tiempo real, sonido (chime), toast y notificaciones inbox
 */

// --- BLOQUE L13829-L14266 ---
// ==============================================================================
// 🔔 SISTEMA DE ALERTAS EN TIEMPO REAL: SONIDO (CHIME), TOAST & AUTO-REFRESH
// ==============================================================================
let isSoundAlertsEnabled = localStorage.getItem('dalor_sound_alerts') !== 'false'; // Activo por defecto

let lastKnownPendingIds = new Set();

let isFirstPendingCheck = true;

function toggleSoundAlerts() {
    isSoundAlertsEnabled = !isSoundAlertsEnabled;

    localStorage.setItem('dalor_sound_alerts', isSoundAlertsEnabled ? 'true' : 'false');

    updateSoundToggleUI();

    if (isSoundAlertsEnabled) {
        playNotificationChime();

    }

}

function updateSoundToggleUI() {
    const icon1 = document.getElementById('iconSoundToggle');

    const txt1 = document.getElementById('textSoundToggle');

    const icon2 = document.getElementById('iconSoundToggleInbox');

    const txt2 = document.getElementById('textSoundToggleInbox');

    const btn1 = document.getElementById('btnSoundToggle');

    if (icon1 && txt1) {
        if (isSoundAlertsEnabled) {
            icon1.className = 'fa-solid fa-bell';

            txt1.innerText = 'Sonido: ON';

            if (btn1) {
                btn1.style.color = '#fbbf24';

                btn1.style.borderColor = '#fbbf24';

            }

        } else {
            icon1.className = 'fa-solid fa-bell-slash';

            txt1.innerText = 'Sonido: OFF';

            if (btn1) {
                btn1.style.color = '#94a3b8';

                btn1.style.borderColor = '#334155';

            }

        }

    }

    if (icon2 && txt2) {
        if (isSoundAlertsEnabled) {
            icon2.className = 'fa-solid fa-bell';

            icon2.style.color = '#059669';

            txt2.innerText = 'Alertas Sonoras: ON';

        } else {
            icon2.className = 'fa-solid fa-bell-slash';

            icon2.style.color = '#94a3b8';

            txt2.innerText = 'Alertas Sonoras: OFF';

        }

    }

}

// 🔊 Generador de Tono de Notificación Nativo (Web Audio API - Cero Dependencias)
function playNotificationChime() {
    if (!isSoundAlertsEnabled) return;

    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;

        if (!AudioCtx) return;

        const ctx = new AudioCtx();

        const now = ctx.currentTime;

        // Tono Armónico 1 (Mi 5 - 659.25 Hz)
        const osc1 = ctx.createOscillator();

        const gain1 = ctx.createGain();

        osc1.type = 'sine';

        osc1.frequency.setValueAtTime(659.25, now);

        gain1.gain.setValueAtTime(0.25, now);

        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc1.connect(gain1);

        gain1.connect(ctx.destination);

        osc1.start(now);

        osc1.stop(now + 0.35);

        // Tono Armónico 2 (La 5 - 880.00 Hz)
        const osc2 = ctx.createOscillator();

        const gain2 = ctx.createGain();

        osc2.type = 'sine';

        osc2.frequency.setValueAtTime(880.00, now + 0.12);

        gain2.gain.setValueAtTime(0.30, now + 0.12);

        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

        osc2.connect(gain2);

        gain2.connect(ctx.destination);

        osc2.start(now + 0.12);

        osc2.stop(now + 0.55);

    } catch(e) {
        console.warn('Audio alert error:', e);

    }

}

// 🪟 Renderizador de Tarjetas Flotantes (Toast Notification)
function showInboxToastNotification(item) {
    const container = document.getElementById('toastNotificationContainer');

    if (!container) return;

    const toast = document.createElement('div');

    toast.className = 'toast-card-live';

    toast.style.cssText = `

        background: #0f172a;

        color: white;

        border: 2px solid #059669;

        border-radius: 12px;

        padding: 12px 14px;

        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.6);

        pointer-events: auto;

        display: flex;

        align-items: flex-start;

        gap: 12px;

        transition: all 0.3s ease;

    `;

    const rep = item.reported_by || 'Personal de Campo';

    const amt = Number(item.amount_usd || 0).toFixed(2);

    const proj = item.project_name || 'Obra General';

    const vendor = item.supplier_vendor || 'Comercio General';

    toast.innerHTML = `

        <div style="background: rgba(5, 150, 105, 0.2); color: #34d399; width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; animation: pulseGlowGreen 2s infinite;">

            <i class="fa-solid fa-file-invoice-dollar"></i>

        </div>

        <div style="flex: 1; min-width: 0;">

            <div style="display: flex; justify-content: space-between; align-items: center;">

                <h4 style="margin: 0; font-size: 13px; font-weight: 800; color: #34d399;">¡Nuevo Comprobante Recibido!</h4>

                <button onclick="this.closest('.toast-card-live').remove()" style="background: none; border: none; color: #94a3b8; font-size: 18px; cursor: pointer; line-height: 1; padding: 0 4px;">&times;</button>

            </div>

            <p style="margin: 3px 0 0 0; font-size: 11px; color: #cbd5e1;"><b>${rep}</b> reportó factura en <b>${vendor}</b></p>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">

                <span style="font-size: 13px; font-weight: 900; color: var(--dalor-gold);">$${amt} USD <small style="color: #94a3b8; font-weight: 600;">(${proj})</small></span>

                <button onclick="switchView('inbox', 'gastos'); this.closest('.toast-card-live').remove();" style="background: #059669; color: white; border: none; padding: 5px 10px; border-radius: 6px; font-size: 11px; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 4px;">

                    <i class="fa-solid fa-stamp"></i> Auditar

                </button>

            </div>

        </div>

    `;

    container.appendChild(toast);

    setTimeout(() => {
        if (toast.parentElement) {
            toast.style.opacity = '0';

            toast.style.transform = 'translateX(60px)';

            setTimeout(() => toast.remove(), 300);

        }

    }, 9000);

}

// 🔄 Ciclo de Monitoreo Rápido (Cada 5 Segundos)
async function updatePendingInboxBadge() {
    try {
        if (!currentUser) return;

        const uname = (currentUser.username || '').toLowerCase();

        const role = (currentUser.role_name || '').toLowerCase();

        const isCampo = uname === 'campo' || role.includes('supervisor') || role.includes('campo');

        if (isCampo) {
            const b1 = document.getElementById("badgeInboxCount");

            const b2 = document.getElementById("badgeGastosDropdown");

            if (b1) b1.style.display = "none";

            if (b2) b2.style.display = "none";

            return;

        }

        const res = await authFetch(`${API_BASE}/expenses/inbox/pending`);

        if (!res.ok) return;

        const pending = await res.json();

        const list = Array.isArray(pending) ? pending : [];

        const count = list.length;

        const b1 = document.getElementById("badgeInboxCount");

        if (b1) {
            b1.innerText = count;

            b1.style.display = count > 0 ? "inline-block" : "none";

        }

        const b2 = document.getElementById("badgeGastosDropdown");

        if (b2) {
            b2.innerText = count;

            b2.style.display = count > 0 ? "inline-block" : "none";

        }

        // Detección de nuevos comprobantes entrantes
        const currentIds = new Set(list.map(item => item.id));

        if (!isFirstPendingCheck) {
            const newlyArrived = list.filter(item => !lastKnownPendingIds.has(item.id));

            if (newlyArrived.length > 0) {
                // 🔊 Sonido de Notificación
                playNotificationChime();

                // 🪟 Notificación Toast en Pantalla
                newlyArrived.forEach(item => showInboxToastNotification(item));

                // 🔄 Si el usuario está viendo el Inbox, actualizar la tabla automáticamente
                const inboxView = document.getElementById('view-inbox');

                if (inboxView && !inboxView.classList.contains('hidden')) {
                    loadPendingExpensesInbox();

                }

            }

        }

        lastKnownPendingIds = currentIds;

        isFirstPendingCheck = false;

    } catch(e) {
        // Silencioso
    }

}

// Ejecutar cada 5 segundos para respuesta inmediata en demostraciones
setInterval(updatePendingInboxBadge, 5000);

// Inicializar el estado de los interruptores de sonido
updateSoundToggleUI();

// 🟢 UPTIME & KEEP-ALIVE PING (Mantiene Render 100% activo sin latencia en frío)
setInterval(() => {
    authFetch('/healthz').catch(() => {});

}, 300000); // Cada 5 minutos

// --- PUENTE DE COMPATIBILIDAD CON WINDOW & HTML INLINE ---
if (typeof window !== 'undefined') {
    window.allClients = allClients;
    window.allServices = allServices;
    window.allProjects = allProjects;
    window.allCategories = allCategories;
    window.allAssets = allAssets;
    window.allPersonnel = allPersonnel;
    window.allMaterials = allMaterials;
    window.selectedPersonnelIds = selectedPersonnelIds;
    window.selectedVehicleIds = selectedVehicleIds;
    window.selectedToolIds = selectedToolIds;
    window.selectedMaterialIds = selectedMaterialIds;
    window.EXCHANGE_RATE = EXCHANGE_RATE;
    window.currentUser = window.currentUser || currentUser;
    window.authToken = window.authToken || authToken;

    window.closeAllDropdowns = closeAllDropdowns;
    window.closeMobileSubmenu = closeMobileSubmenu;
    window.closeModal = closeModal;
    window.isMobileViewport = isMobileViewport;
    window.loadInitialMasterData = loadInitialMasterData;
    window.openMobileSubmenu = openMobileSubmenu;
    window.openModal = openModal;
    window.parseLocalizedNumber = parseLocalizedNumber;
    window.playNotificationChime = playNotificationChime;
    window.populateSelect = populateSelect;
    window.populateSelectDropdowns = populateSelectDropdowns;
    window.roundNumber = roundNumber;
    window.showInboxToastNotification = showInboxToastNotification;
    window.renderPaginationControls = renderPaginationControls;
    window.sortCategoriesNumerically = sortCategoriesNumerically;
    window.switchView = switchView;
    window.toggleDropdown = toggleDropdown;
    window.toggleSoundAlerts = toggleSoundAlerts;
    window.printElementHtml = printElementHtml;
    window.updatePendingInboxBadge = updatePendingInboxBadge;
    window.updateSoundToggleUI = updateSoundToggleUI;
}

export {
    toggleSoundAlerts,
    updateSoundToggleUI,
    playNotificationChime,
    showInboxToastNotification,
    updatePendingInboxBadge
};
