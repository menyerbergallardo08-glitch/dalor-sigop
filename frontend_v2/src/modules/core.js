/**
 * DALOR SIGO-P | Módulo: CORE.JS (Orquestador Facade)
 * Arquitectura modular desacoplada en ./core/ (< 400 líneas por submódulo)
 * Exporta y unifica utilidades globales, reactividad e inicialización del sistema.
 */

// 1. Utilidades UI, numéricas y modales
export {
    roundNumber,
    parseLocalizedNumber,
    populateSelect,
    sortCategoriesNumerically,
    authFetch,
    renderPaginationControls,
    openModal,
    closeModal
} from './core/core_ui.js';

// 2. Navegación, vistas y menú responsive
export {
    isMobileViewport,
    toggleDropdown,
    openMobileSubmenu,
    closeMobileSubmenu,
    closeAllDropdowns,
    switchView
} from './core/core_nav.js';

// 3. Cálculos fiscales e impuestos
export {
    updateFieldTaxDisplays
} from './core/core_tax.js';

// 4. Utilidades de impresión corporativa / libros fiscales
export {
    printElementHtml
} from './core/core_print.js';

// 5. Carga y gestión de datos maestros
export {
    loadInitialMasterData,
    populateSelectDropdowns
} from './core/core_data.js';

// 6. Alertas en tiempo real, sonido y notificaciones
export {
    toggleSoundAlerts,
    updateSoundToggleUI,
    playNotificationChime,
    showInboxToastNotification,
    updatePendingInboxBadge
} from './core/core_alerts.js';

// Importar todos los submódulos para garantizar registro en window y auto-ejecución
import './core/core_ui.js';
import './core/core_nav.js';
import './core/core_tax.js';
import './core/core_print.js';
import './core/core_data.js';
import './core/core_alerts.js';

console.log('--> DALOR SIGO-P CORE (Modular Facade) INITIALIZED');
