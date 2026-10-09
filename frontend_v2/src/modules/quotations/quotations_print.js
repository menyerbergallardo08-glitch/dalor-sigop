/**
 * DALOR SIGO-P | Módulo de Presupuestos & APU Desacoplado
 */
import { renderPaginationControls, populateSelectDropdowns, openModal, closeModal, loadInitialMasterData } from '../core.js';

var API_BASE = window.API_BASE || (window.location.origin + "/api/v1");
var allClients = window.allClients = window.allClients || [];
var allServices = window.allServices = window.allServices || [];
var allProjects = window.allProjects = window.allProjects || [];
var allCategories = window.allCategories = window.allCategories || [];
var allMaterials = window.allMaterials = window.allMaterials || [];
var EXCHANGE_RATE = window.EXCHANGE_RATE = window.EXCHANGE_RATE || 850.0;
var BCV_DATA = window.BCV_DATA = window.BCV_DATA || { rate: 850.0, source: 'BCV Oficial' };
var currentUser = window.currentUser || null;
var authToken = window.authToken = window.authToken || localStorage.getItem('dalor_token') || null;

const OFFICIAL_DALOR_APU_CATEGORIES = [
    "Fabricación Metalmecánica",
    "Montaje e Instalación en Sitio",
    "Mantenimiento Industrial & Paradas",
    "Soldadura Especializada & Pailería",
    "Mecanizado & Torno",
    "Arenado y Pintura Industrial",
    "Obras Civiles & Eléctricas Asociadas"
];
if (typeof window !== 'undefined') {
    window.OFFICIAL_DALOR_APU_CATEGORIES = OFFICIAL_DALOR_APU_CATEGORIES;
}

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

async function printQuotation(quoteId) {

    try {

        const res = await authFetch(`${API_BASE}/quotations/${quoteId}`);

        if (!res.ok) throw new Error('No se pudo cargar la cotización.');

        const q = await res.json();



        const rate = q.exchange_rate || EXCHANGE_RATE || 800.0;

        const curr = (q.currency || 'USD').toUpperCase();

        

        let currSymbol = '$';

        let currLabel = 'USD';

        let currencyNotesHtml = '';

        let totalsBoxHtml = '';

        let tablePriceHeader = 'P. Unit ($)';

        let tableTotalHeader = 'Total ($)';



        if (curr === 'USD') {

            currSymbol = '$';

            currLabel = 'USD';

            tablePriceHeader = 'P. Unit ($ USD)';

            tableTotalHeader = 'Total ($ USD)';

            

            const subtotalFormatted = `$${q.subtotal_usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

            const taxFormatted = q.tax_usd === 0 ? 'EXENTO (0%)' : `$${q.tax_usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

            const totalFormatted = `$${q.total_usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;



            totalsBoxHtml = `

                <div style="display: flex; justify-content: space-between; font-size: 11.5px; margin-bottom: 4px;">

                    <span style="color: #475569;">Subtotal:</span>

                    <span style="font-weight: 700; color: #1e293b;">${subtotalFormatted}</span>

                </div>

                <div style="display: flex; justify-content: space-between; font-size: 11.5px; margin-bottom: 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">

                    <span style="color: #475569;">IVA (${q.tax_percent}%):</span>

                    <span style="font-weight: 700; color: ${q.tax_usd === 0 ? '#10b981' : '#d97706'};">${taxFormatted}</span>

                </div>

                <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: 900; color: #002B49;">

                    <span>TOTAL USD:</span>

                    <span style="color: #0072B8;">${totalFormatted}</span>

                </div>

            `;



            currencyNotesHtml = '';

        } else if (curr === 'VES') {

            currSymbol = 'Bs.';

            currLabel = 'VES';

            tablePriceHeader = 'P. Unit (Bs.)';

            tableTotalHeader = 'Total (Bs.)';



            const subBs = q.subtotal_usd * rate;

            const taxBs = q.tax_usd * rate;

            const totBs = q.total_usd * rate;



            const subtotalFormatted = `Bs. ${subBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

            const taxFormatted = taxBs === 0 ? 'EXENTO (0%)' : `Bs. ${taxBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

            const totalFormatted = `Bs. ${totBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;



            totalsBoxHtml = `

                <div style="display: flex; justify-content: space-between; font-size: 11.5px; margin-bottom: 4px;">

                    <span style="color: #475569;">Subtotal:</span>

                    <span style="font-weight: 700; color: #1e293b;">${subtotalFormatted}</span>

                </div>

                <div style="display: flex; justify-content: space-between; font-size: 11.5px; margin-bottom: 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">

                    <span style="color: #475569;">IVA (${q.tax_percent}%):</span>

                    <span style="font-weight: 700; color: ${taxBs === 0 ? '#10b981' : '#d97706'};">${taxFormatted}</span>

                </div>

                <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: 900; color: #002B49;">

                    <span>TOTAL BS:</span>

                    <span style="color: #0072B8;">${totalFormatted}</span>

                </div>

            `;



            currencyNotesHtml = '';

        } else {

            // EUR

            currSymbol = 'â‚¬';

            currLabel = 'EUR';

            tablePriceHeader = 'P. Unit (â‚¬ EUR)';

            tableTotalHeader = 'Total (â‚¬ EUR)';



            const subtotalFormatted = `â‚¬ ${q.subtotal_usd.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

            const taxFormatted = q.tax_usd === 0 ? 'EXENTO (0%)' : `â‚¬ ${q.tax_usd.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

            const totalFormatted = `â‚¬ ${q.total_usd.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;



            totalsBoxHtml = `

                <div style="display: flex; justify-content: space-between; font-size: 11.5px; margin-bottom: 4px;">

                    <span style="color: #475569;">Subtotal:</span>

                    <span style="font-weight: 700; color: #1e293b;">${subtotalFormatted}</span>

                </div>

                <div style="display: flex; justify-content: space-between; font-size: 11.5px; margin-bottom: 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">

                    <span style="color: #475569;">IVA (${q.tax_percent}%):</span>

                    <span style="font-weight: 700; color: ${q.tax_usd === 0 ? '#10b981' : '#d97706'};">${taxFormatted}</span>

                </div>

                <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: 900; color: #002B49;">

                    <span>TOTAL EUR:</span>

                    <span style="color: #0072B8;">${totalFormatted}</span>

                </div>

            `;



            currencyNotesHtml = '';

        }

        let coletillasList = [];
        if (q.coletilla_divisas === true || q.terms_currency_usd_only === true) {
            coletillasList.push('<b>Condición de Pago:</b> Solo pagadero en divisas (USD).');
        }
        if (q.coletilla_modalidad === true || q.terms_check_payment_mode === true) {
            coletillasList.push('<b>Modalidad de Pago:</b> Consultar modalidad de pago.');
        }
        if (q.coletilla_bolivares === true) {
            coletillasList.push('<b>Pago en Bolívares (Bs.):</b> En caso de realizar el pago en Bolívares, se calculará a la tasa oficial del Banco Central de Venezuela (BCV) correspondiente a la fecha valor del pago efectivo.');
        }

        let commercialNotesHtml = '';
        if (q.notes && q.notes.trim()) {
            commercialNotesHtml = `
                <div style="background: #ffffff; border: 1.5px solid #cbd5e1; border-left: 4px solid #0072B8; border-radius: 6px; padding: 10px 14px; margin-bottom: 12px; font-size: 11px; color: #1e293b; line-height: 1.45; page-break-inside: avoid;">
                    <div style="font-weight: 800; color: #002B49; margin-bottom: 4px; text-transform: uppercase; font-size: 10.5px;">
                        <i class="fa-solid fa-clipboard-list" style="color: #0072B8;"></i> Notas & Observaciones Comerciales del Presupuesto:
                    </div>
                    <p style="margin: 0; white-space: pre-wrap;">${q.notes.trim()}</p>
                </div>
            `;
        }

        let coletillasHtml = '';
        if (coletillasList.length > 0) {
            coletillasHtml = `
                <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-left: 4px solid #F5B800; padding: 8px 12px; border-radius: 6px; margin-bottom: 12px; font-size: 10.5px; color: #334155; line-height: 1.45; page-break-inside: avoid;">
                    ${coletillasList.map(c => `<p style="margin: 3px 0;">• ${c}</p>`).join('')}
                </div>
            `;
        }

        const itemsRows = (q.items || []).map((item, idx) => {

            let unitPriceDisplay = `$${item.unit_price_usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

            let totalLineDisplay = `$${item.total_usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

            

            if (curr === 'VES') {

                unitPriceDisplay = `Bs. ${(item.unit_price_usd * rate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

                totalLineDisplay = `Bs. ${(item.total_usd * rate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

            } else if (curr === 'EUR') {

                unitPriceDisplay = `â‚¬ ${item.unit_price_usd.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

                totalLineDisplay = `â‚¬ ${item.total_usd.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

            }



            return `

            <tr style="page-break-inside: avoid;">

                <td style="text-align: center; font-weight: bold; border: 1px solid #cbd5e1; padding: 6px 4px; font-size: 11px;">${idx + 1}</td>

                <td style="text-align: center; color: #0284c7; font-weight: 800; border: 1px solid #cbd5e1; padding: 6px 4px; font-size: 11px;">${item.item_code || ('SER-' + (idx+1))}</td>

                <td style="border: 1px solid #cbd5e1; padding: 6px 8px; font-weight: 600; font-size: 11px; line-height: 1.35;">${item.description}</td>

                <td style="text-align: center; border: 1px solid #cbd5e1; padding: 6px 4px; font-size: 11px;">${item.unit_measure || 'Global'}</td>

                <td style="text-align: center; font-weight: bold; border: 1px solid #cbd5e1; padding: 6px 4px; font-size: 11px;">${item.quantity}</td>

                <td style="text-align: right; border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 11px;">${unitPriceDisplay}</td>

                <td style="text-align: right; font-weight: bold; border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 11px; color: #002B49;">${totalLineDisplay}</td>

            </tr>`;

        }).join('');



        const sheetHtml = `

            <!-- Membrete DALOR -->

            <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #F5B800; padding-bottom: 10px; margin-bottom: 10px;">

                <div style="display: flex; align-items: center; gap: 12px;">

                    <img src="logo_dalor.jpg" alt="DALOR" style="height: 48px; display: block; border-radius: 4px;">

                    <div>

                        <h1 style="font-size: 17px; font-weight: 900; color: #002B49; margin: 0; letter-spacing: 0.3px;">METALMECÁNICA DALOR, C.A.</h1>

                        <p style="font-size: 10.5px; color: #475569; margin: 2px 0 0 0; font-weight: 600;">RIF: <b>J-31601195-0</b> &bull; Mantenimiento Predictivo, Proyectos Industriales & Metalmecánica</p>

                        <p style="font-size: 10px; color: #64748b; margin: 1px 0 0 0;">Av. Cámara de las Industrias, Galpón 10, Z.I. El Tigre, Guacara, Edo. Carabobo &bull; Telf: +58 0412-2407079 / 0424-4131782</p>

                    </div>

                </div>

                <div style="text-align: right;">

                    <span style="background: #002B49; color: #F5B800; padding: 4px 10px; border-radius: 6px; font-weight: 900; font-size: 13px; letter-spacing: 0.5px; display: inline-block;">${q.quote_number}</span>

                    <p style="font-size: 10.5px; color: #475569; margin: 4px 0 0 0;">Fecha: <b>${new Date(q.created_at).toLocaleDateString('es-VE')}</b></p>

                    <p style="font-size: 10.5px; color: #475569; margin: 2px 0 0 0;">Validez: <b>${q.validity_days || 15} Días</b></p>

                </div>

            </div>



            <!-- Ficha de Datos: Cliente, Obra y Condiciones -->

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px; background: #f8fafc; border: 1px solid #cbd5e1; padding: 10px 12px; border-radius: 6px;">

                <div>

                    <span style="font-size: 9.5px; font-weight: 800; color: #64748b; text-transform: uppercase;">Datos del Cliente:</span>

                    <p style="font-size: 12.5px; font-weight: 800; color: #002B49; margin: 2px 0 0 0;">${(q.client && q.client.name) || 'Cliente General'}</p>

                    <p style="font-size: 10.5px; color: #334155; margin: 2px 0 0 0;">RIF: <b>${(q.client && q.client.rif) || '-'}</b></p>

                    <p style="font-size: 10.5px; color: #475569; margin: 2px 0 0 0;">Contacto: ${(q.client && q.client.contact_name) || '-'} | Tel: ${(q.client && q.client.contact_phone) || '-'}</p>

                </div>

                <div>

                    <span style="font-size: 9.5px; font-weight: 800; color: #64748b; text-transform: uppercase;">Proyecto & Condiciones:</span>

                    <p style="font-size: 12.5px; font-weight: 800; color: #002B49; margin: 2px 0 0 0;">${q.project_title}</p>

                    <p style="font-size: 10.5px; color: #334155; margin: 2px 0 0 0;">Lugar de Ejecución: <b>${q.location || 'Sede Central'}</b></p>

                    <p style="font-size: 10.5px; color: #0284c7; margin: 2px 0 0 0;">Tiempo de Ejecución: <b>${q.execution_time || '15 días hábiles a partir del anticipo'}</b></p>

                    <p style="font-size: 10px; color: #64748b; margin: 2px 0 0 0;">Moneda de Emisión: <b>${curr === 'USD' ? 'Dólares Americanos (USD $)' : (curr === 'VES' ? 'Bolívares (VES Bs.)' : 'Euros (EUR â‚¬)')}</b></p>

                </div>

            </div>



            <!-- Tabla de Partidas / APU -->

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 11px;">

                <thead>

                    <tr style="background: #002B49; color: white;">

                        <th style="width: 25px; padding: 6px 4px; border: 1px solid #002B49; font-size: 10.5px; text-align: center;">#</th>

                        <th style="width: 75px; padding: 6px 4px; border: 1px solid #002B49; font-size: 10.5px; text-align: center;">Código</th>

                        <th style="padding: 6px 8px; border: 1px solid #002B49; font-size: 10.5px; text-align: left;">Descripción del Servicio / Partida APU</th>

                        <th style="width: 55px; padding: 6px 4px; border: 1px solid #002B49; font-size: 10.5px; text-align: center;">Unidad</th>

                        <th style="width: 45px; padding: 6px 4px; border: 1px solid #002B49; font-size: 10.5px; text-align: center;">Cant.</th>

                        <th style="width: 95px; padding: 6px 8px; border: 1px solid #002B49; font-size: 10.5px; text-align: right;">${tablePriceHeader}</th>

                        <th style="width: 105px; padding: 6px 8px; border: 1px solid #002B49; font-size: 10.5px; text-align: right;">${tableTotalHeader}</th>

                    </tr>

                </thead>

                <tbody>

                    ${itemsRows}

                </tbody>

            </table>



            <!-- Bloque de Totales -->

            <div style="display: flex; justify-content: flex-end; margin-bottom: 16px; page-break-inside: avoid;">

                <div style="width: 310px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 14px;">

                    ${totalsBoxHtml}

                </div>

            </div>



            <!-- Notas y Coletillas Comerciales (Punto 4 y 5) -->
            ${commercialNotesHtml}
            ${coletillasHtml}

            <!-- Coletilla de Condiciones Cambiarias -->
            ${currencyNotesHtml}



            <!-- Firmas de Aprobación Formal -->

            <div style="margin-top: 25px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; text-align: center; page-break-inside: avoid;">

                <div>

                    <div style="border-bottom: 1px solid #1e293b; margin-bottom: 5px;"></div>

                    <p style="font-size: 10.5px; font-weight: 800; margin: 0; color: #002B49;">Por Metalmecánica Dalor C.A.</p>

                    <p style="font-size: 9.5px; color: #64748b; margin: 0;">Gerencia de Proyectos / Estimación</p>

                </div>

                <div>

                    <div style="border-bottom: 1px solid #1e293b; margin-bottom: 5px;"></div>

                    <p style="font-size: 10.5px; font-weight: 800; margin: 0; color: #002B49;">Aceptado y Conforme por el Cliente</p>

                    <p style="font-size: 9.5px; color: #64748b; margin: 0;">Firma y Sello de Aprobación</p>

                </div>

            </div>

        `;



        document.getElementById('modalPrintPreviewContent').innerHTML = sheetHtml;

        document.getElementById('previewModalTitle').textContent = `Presupuesto ${q.quote_number} | ${(q.client && q.client.name) || 'Cliente'}`;

        document.getElementById('modalPrintPreview').classList.remove('hidden');



    } catch (e) {

        alert('Error al visualizar cotización: ' + e.message);

    }

}



function triggerPrintFromModal() {
    const content = document.getElementById("modalPrintPreviewContent");
    const title = document.getElementById("previewModalTitle")?.textContent || "Presupuesto DALOR";
    if (typeof window.printElementHtml === 'function' && content) {
        window.printElementHtml(content, title);
    } else {
        window.print();
    }
}





let servicesCurrentPage = 1;
let servicesPageSize = 10;
let lastServicesList = [];
let serviceSearchTerm = '';
let serviceCategoryFilterVal = '';


// Exponer al objeto global window para eventos inline y compatibilidad
if (typeof window !== 'undefined') {
    window.printQuotation = printQuotation;
    window.triggerPrintFromModal = triggerPrintFromModal;
}
