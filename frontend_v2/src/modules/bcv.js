/**
 * DALOR SIGO-P | Módulo: BCV.JS
 * Sincronización oficial automatizada de tasa BCV en tiempo real con background polling y persistencia fail-safe.
 */

var API_BASE = window.API_BASE || (window.location.origin + "/api/v1");
var EXCHANGE_RATE = window.EXCHANGE_RATE = window.EXCHANGE_RATE || parseFloat(localStorage.getItem('dalor_exchange_rate')) || 897.54;
var BCV_DATA = window.BCV_DATA = window.BCV_DATA || {
    rate: EXCHANGE_RATE,
    formatted_rate: EXCHANGE_RATE.toFixed(2),
    date_value: '',
    source: 'BCV Oficial',
    source_tier: 'oficial_directo'
};

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

let _lastBcvFetchTimestamp = 0;
let _bcvPollingTimer = null;

// ==============================================================================
// 1. SINCRONIZACIÓN AUTOMÁTICA DE TASA OFICIAL BCV
// ==============================================================================
export async function fetchAndApplyBcvRate(forceRefresh = false) {
    const icon = document.getElementById("bcvSyncIcon");
    if (icon) icon.classList.add("fa-spin");

    try {
        const res = await authFetch(`${API_BASE}/financial/bcv-rate?force_refresh=${forceRefresh}`);
        if (res.ok) {
            const data = await res.json();
            BCV_DATA = window.BCV_DATA = data;
            const val = parseFloat(data.rate);
            if (!isNaN(val) && val > 0) {
                EXCHANGE_RATE = window.EXCHANGE_RATE = val;
                localStorage.setItem('dalor_exchange_rate', val);
                _lastBcvFetchTimestamp = Date.now();

                // 1. Actualizar indicador principal en header
                const display = document.getElementById("bcvRateDisplay");
                if (display) display.innerText = data.formatted_rate || val.toFixed(2);

                const srcName = document.getElementById("bcvSourceName");
                if (srcName) srcName.innerText = data.source_tier === 'oficial_directo' ? 'BCV:' : 'BCV Espejo:';

                const dot = document.getElementById("bcvStatusDot");
                if (dot) {
                    dot.style.background = data.is_fallback ? '#f59e0b' : '#10b981';
                    dot.style.boxShadow = data.is_fallback ? '0 0 5px #f59e0b' : '0 0 5px #10b981';
                }

                const badge = document.getElementById("bcvTasaBadge");
                if (badge) {
                    badge.title = `Tasa: ${val.toFixed(2)} Bs/$ | Fuente: ${data.source} | Fecha Valor: ${data.date_value || 'Hoy'} | Actualizado: ${data.last_updated || 'Ahora'}`;
                }

                // 2. Actualizar modales de configuración y cálculo
                const modalRate = document.getElementById("modalBcvCurrentRate");
                if (modalRate) modalRate.innerText = `${val.toFixed(2)} Bs/$ (${data.source || 'BCV'})`;

                const modalDate = document.getElementById("modalBcvDateValue");
                if (modalDate) modalDate.innerText = data.date_value || 'Vigente';

                const kpiBcv = document.getElementById("kpi_partners_bcv_rate");
                if (kpiBcv) kpiBcv.innerText = `${val.toFixed(2)} Bs/$`;

                const globalInput = document.getElementById("globalExchangeRateInput");
                if (globalInput) globalInput.value = val.toFixed(2);

                const manualInput = document.getElementById("manualTasaInput");
                if (manualInput && !manualInput.value) manualInput.value = val.toFixed(2);

                const importLibrosRate = document.getElementById("import_libros_rate");
                if (importLibrosRate && (!importLibrosRate.value || importLibrosRate.value === '859.06')) {
                    importLibrosRate.value = val.toFixed(2);
                }

                // 3. Recalcular montos en bolívares si la función de gastos existe
                if (typeof window.calcManualBs === 'function') {
                    try { window.calcManualBs(); } catch(e) {}
                }

                // 4. Notificación amigable solo si fue forzado por el usuario
                if (forceRefresh) {
                    if (typeof window.showToast === 'function') {
                        window.showToast(`Cotización BCV Oficial: ${val.toFixed(2)} Bs/$ (${data.date_value || 'Hoy'})`, 'info');
                    }
                }
            }
        }
    } catch (e) {
        console.warn("No se pudo sincronizar tasa BCV, usando tasa guardada:", e);
    } finally {
        if (icon) {
            setTimeout(() => icon.classList.remove("fa-spin"), 500);
        }
    }
}

// ==============================================================================
// 2. ORQUESTADOR PERIÓDICO DE AUTO-ACTUALIZACIÓN (POLLING & RESUME)
// ==============================================================================
export function startBcvAutoSync() {
    // 1. Restaurar de inmediato de localStorage para evitar parpadeos
    const cachedRate = parseFloat(localStorage.getItem('dalor_exchange_rate'));
    if (!isNaN(cachedRate) && cachedRate > 0) {
        window.EXCHANGE_RATE = cachedRate;
        const display = document.getElementById("bcvRateDisplay");
        if (display && (!display.innerText || display.innerText === '859.06')) {
            display.innerText = cachedRate.toFixed(2);
        }
    }

    // 2. Consulta automática inmediata al arrancar el cliente
    fetchAndApplyBcvRate(false);

    // 3. Polling en segundo plano cada 60 segundos
    if (_bcvPollingTimer) clearInterval(_bcvPollingTimer);
    _bcvPollingTimer = setInterval(() => {
        fetchAndApplyBcvRate(false);
    }, 60000);

    // 4. Refrescar automáticamente cuando el usuario regresa a la pestaña
    if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                const now = Date.now();
                if (now - _lastBcvFetchTimestamp > 45000) {
                    fetchAndApplyBcvRate(false);
                }
            }
        });
    }
    if (typeof window !== 'undefined') {
        window.addEventListener('focus', () => {
            const now = Date.now();
            if (now - _lastBcvFetchTimestamp > 45000) {
                fetchAndApplyBcvRate(false);
            }
        });
    }
}

export function syncBcvRateFromBtn(e) {
    if (e) e.stopPropagation();
    fetchAndApplyBcvRate(true);
}

// ==============================================================================
// 3. MODAL DE AJUSTE MANUAL DE CONTINGENCIA
// ==============================================================================
export function openManualTasaModal(e) {
    if (e) e.stopPropagation();
    const input = document.getElementById("manualTasaInput");
    if (input) input.value = EXCHANGE_RATE.toFixed(2);
    if (typeof window.openModal === 'function') {
        window.openModal("modalManualTasa");
    } else {
        const m = document.getElementById("modalManualTasa");
        if (m) m.classList.remove("hidden");
    }
}

export function submitManualTasa(e) {
    if (e) e.preventDefault();
    const input = document.getElementById("manualTasaInput");
    const val = parseFloat(input?.value);
    if (!isNaN(val) && val > 0) {
        EXCHANGE_RATE = window.EXCHANGE_RATE = val;
        if (window.BCV_DATA) window.BCV_DATA.rate = val;
        localStorage.setItem('dalor_exchange_rate', val);

        const display = document.getElementById("bcvRateDisplay");
        if (display) display.innerText = val.toFixed(2);

        const kpiBcv = document.getElementById("kpi_partners_bcv_rate");
        if (kpiBcv) kpiBcv.innerText = `${val.toFixed(2)} Bs/$`;

        const dot = document.getElementById("bcvStatusDot");
        if (dot) {
            dot.style.background = '#f59e0b';
            dot.style.boxShadow = '0 0 5px #f59e0b';
        }

        const srcName = document.getElementById("bcvSourceName");
        if (srcName) srcName.innerText = 'Manual:';

        if (typeof window.closeModal === 'function') {
            window.closeModal("modalManualTasa");
        } else {
            const m = document.getElementById("modalManualTasa");
            if (m) m.classList.add("hidden");
        }

        if (typeof window.calcManualBs === 'function') {
            try { window.calcManualBs(); } catch(err) {}
        }

        if (typeof window.showToast === 'function') {
            window.showToast(`Tasa manual establecida a ${val.toFixed(2)} Bs/$ (Modo Contingencia)`, 'warning');
        }
    }
}

// ==============================================================================
// 4. AUTO-EJECUCIÓN INMEDIATA AL CARGAR EL MÓDULO Y PUENTE GLOBAL
// ==============================================================================
if (typeof window !== 'undefined') {
    window.fetchAndApplyBcvRate = fetchAndApplyBcvRate;
    window.openManualTasaModal = openManualTasaModal;
    window.submitManualTasa = submitManualTasa;
    window.syncBcvRateFromBtn = syncBcvRateFromBtn;
    window.startBcvAutoSync = startBcvAutoSync;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startBcvAutoSync);
    } else {
        startBcvAutoSync();
    }
}
