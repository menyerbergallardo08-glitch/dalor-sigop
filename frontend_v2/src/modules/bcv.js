/**
 * DALOR SIGO-P | Módulo: BCV.JS
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
    if (options.body && !_h['Content-Type']) _h['Content-Type'] = 'application/json';
    return window.fetch(url, Object.assign({}, options, { headers: _h }));
}


// --- BLOQUE L918-L1119 ---
// Control de Tasa Oficial BCV Automatizada con Blindaje Fail-Safe

BCV_DATA = window.BCV_DATA = {

    rate: 832.49,

    date_value: '',

    source: 'BCV Oficial',

    source_tier: 'oficial_directo'

};



async function fetchAndApplyBcvRate(forceRefresh = false) {

    const icon = document.getElementById("bcvSyncIcon");

    if (icon) icon.classList.add("fa-spin");



    try {

        const res = await authFetch(`${API_BASE}/financial/bcv-rate?force_refresh=${forceRefresh}`);

        if (res.ok) {

            const data = await res.json();

            BCV_DATA = data;

            const val = parseFloat(data.rate);

            if (!isNaN(val) && val > 0) {

                EXCHANGE_RATE = val;

                localStorage.setItem('dalor_exchange_rate', val);

                

                // Actualizar interfaz

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



                const modalRate = document.getElementById("modalBcvCurrentRate");

                if (modalRate) modalRate.innerText = `${val.toFixed(2)} Bs/$ (${data.source})`;



                const modalDate = document.getElementById("modalBcvDateValue");

                if (modalDate) modalDate.innerText = data.date_value || 'Vigente';



                calcManualBs();



                if (forceRefresh) {

                    showRealtimeToast(`Cotización BCV Oficial: ${val.toFixed(2)} Bs/$ (${data.date_value || 'Hoy'})`, 'tasa_bcv', 'info');

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



function syncBcvRateFromBtn(e) {

    if (e) e.stopPropagation();

    fetchAndApplyBcvRate(true);

}



function openManualTasaModal(e) {

    if (e) e.stopPropagation();

    const input = document.getElementById("manualTasaInput");

    if (input) input.value = EXCHANGE_RATE.toFixed(2);

    openModal("modalManualTasa");

}



function submitManualTasa(e) {

    e.preventDefault();

    const input = document.getElementById("manualTasaInput");

    const val = parseFloat(input.value);

    if (!isNaN(val) && val > 0) {

        EXCHANGE_RATE = val;

        localStorage.setItem('dalor_exchange_rate', val);

        const display = document.getElementById("bcvRateDisplay");

        if (display) display.innerText = val.toFixed(2);

        

        const dot = document.getElementById("bcvStatusDot");

        if (dot) {

            dot.style.background = '#f59e0b';

            dot.style.boxShadow = '0 0 5px #f59e0b';

        }

        

        const srcName = document.getElementById("bcvSourceName");

        if (srcName) srcName.innerText = 'Manual:';



        closeModal("modalManualTasa");

        calcManualBs();

        showRealtimeToast(`Tasa manual establecida a ${val.toFixed(2)} Bs/$ (Modo Contingencia)`, 'tasa_bcv', 'warning');

    }

}





// Desplegables Tipo ERP (Profit Plus Style) con Soporte Móvil Nativo Action-Sheet (iOS / iPhone / Android / Desktop)




// --- PUENTE DE COMPATIBILIDAD CON WINDOW & HTML INLINE ---
if (typeof window !== 'undefined') {
    window.fetchAndApplyBcvRate = fetchAndApplyBcvRate;
    window.openManualTasaModal = openManualTasaModal;
    window.submitManualTasa = submitManualTasa;
    window.syncBcvRateFromBtn = syncBcvRateFromBtn;
}

export { fetchAndApplyBcvRate, openManualTasaModal, submitManualTasa, syncBcvRateFromBtn };
