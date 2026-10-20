// Sigop ERP - Facturación en Forma Libre SENIAT (Metalmecánica Dalor, C.A.)
import { DALOR_LOGO_B64, DALOR_WATERMARK_B64 } from './fiscal_invoice_assets.js';

const API_BASE = (typeof window !== 'undefined' && window.API_BASE) || '/api/v1';

const authFetch = (url, options = {}) => {
    const token = (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('dalor_token')) ||
                  (typeof localStorage !== 'undefined' && (localStorage.getItem('dalor_token') || localStorage.getItem('token'))) ||
                  (typeof window !== 'undefined' && window.authToken) || '';
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (options.body instanceof FormData) {
        delete headers['Content-Type'];
    }
    return window.fetch(url, { ...options, headers });
};

function formatBsNumber(num) {
    if (num === null || num === undefined || isNaN(num)) return "0,00";
    return Number(num).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function printOfficialFiscalInvoice(receivableId, initialMode = 'digital') {
    try {
        const res = await authFetch(`${API_BASE}/financial/cxc/${receivableId}/fiscal-invoice-data`);
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || 'No se pudo cargar la información de la factura.');
        }
        const data = await res.json();

        const activeToken = (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('dalor_token')) ||
                            (typeof localStorage !== 'undefined' && (localStorage.getItem('dalor_token') || localStorage.getItem('token'))) ||
                            (typeof window !== 'undefined' && window.authToken) || '';
        let apiBaseFull = API_BASE || '/api/v1';
        if (!apiBaseFull.startsWith('http://') && !apiBaseFull.startsWith('https://')) {
            const origin = (typeof window !== 'undefined' && window.location.origin) ? window.location.origin : '';
            apiBaseFull = origin + (apiBaseFull.startsWith('/') ? apiBaseFull : ('/' + apiBaseFull));
        }
        apiBaseFull = apiBaseFull.replace(/\/+$/, '');

        const printWin = window.open('', '_blank');
        if (!printWin) {
            alert('Por favor habilita las ventanas emergentes (pop-ups) en tu navegador para ver e imprimir la factura.');
            return;
        }

        const itemsRowsHtml = (data.items || []).map(it => `
            <tr>
                <td style="padding: 6px 8px; border-right: 1px solid #000; font-size: 9.5px; font-weight: 800; line-height: 1.35; text-transform: uppercase;">
                    ${it.description}
                </td>
                <td style="padding: 6px 8px; border-right: 1px solid #000; text-align: center; font-size: 10px; font-weight: 900;">
                    ${it.quantity}
                </td>
                <td style="padding: 6px 8px; border-right: 1px solid #000; text-align: right; font-size: 10px; font-weight: 800; font-family: monospace;">
                    ${formatBsNumber(it.unit_price_bs)}
                </td>
                <td style="padding: 6px 8px; text-align: right; font-size: 10px; font-weight: 900; font-family: monospace;">
                    ${formatBsNumber(it.total_bs)}
                </td>
            </tr>
        `).join('');

        // Renglones vacíos de relleno para mantener la altura de la tabla idéntica al formato físico original
        const minRows = 8;
        const currentCount = (data.items || []).length;
        let emptyRowsHtml = '';
        if (currentCount < minRows) {
            for (let i = 0; i < (minRows - currentCount); i++) {
                emptyRowsHtml += `
                    <tr>
                        <td style="padding: 10px 8px; border-right: 1px solid #000;">&nbsp;</td>
                        <td style="border-right: 1px solid #000;">&nbsp;</td>
                        <td style="border-right: 1px solid #000;">&nbsp;</td>
                        <td>&nbsp;</td>
                    </tr>
                `;
            }
        }

        // Extracción limpia del número de control para el sello rojo
        let controlPrefix = '00 —';
        let controlSuffix = data.control_number || '000558';
        if (controlSuffix.includes('-')) {
            const parts = controlSuffix.split('-');
            controlPrefix = parts[0].trim() + ' —';
            controlSuffix = parts[1].trim();
        }

        const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Factura ${data.invoice_number} - Metalmecánica Dalor, C.A.</title>
    <style>
        @page {
            size: letter portrait;
            margin: 0;
        }
        * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }
        body {
            margin: 0;
            padding: 0;
            background: #cbd5e1;
            font-family: Arial, Helvetica, sans-serif;
            color: #000;
        }

        /* Barra de Control y Calibración (Solo visible en pantalla) */
        .toolbar-container {
            background: #0f172a;
            color: white;
            padding: 10px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 12px;
            position: sticky;
            top: 0;
            z-index: 1000;
            box-shadow: 0 4px 6px rgba(0,0,0,0.15);
        }
        .toolbar-group {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .btn-tool {
            background: #1e293b;
            color: white;
            border: 1px solid #475569;
            padding: 6px 12px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s;
        }
        .btn-tool:hover { background: #334155; }
        .btn-tool.active {
            background: #0284c7;
            border-color: #38bdf8;
            color: white;
        }
        .btn-print {
            background: #059669;
            color: white;
            border: none;
            padding: 7px 16px;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 800;
            cursor: pointer;
        }
        .btn-print:hover { background: #047857; }
        body.mode-paper #btnActionPrintDigital {
            display: none !important;
        }

        /* Contenedor de la Hoja Tamaño Carta (Exactamente 216mm x 279mm) */
        .page-sheet {
            width: 216mm;
            height: 279mm;
            margin: 15px auto;
            background: white;
            position: relative;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            overflow: hidden;
            display: flex;
            flex-direction: column;
            padding: 7mm 10mm 6mm 10mm;
        }

        /* Marca de Agua Central de DALOR (Vectorial limpia, transparente al 8% de opacidad) */
        .watermark-img {
            position: absolute;
            top: 52%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 165mm;
            opacity: 0.08;
            pointer-events: none;
            z-index: 1;
            display: none;
        }
        body.mode-digital .watermark-img {
            display: block !important;
        }

        /* Encabezado Membretado Dalor */
        .header-preprinted {
            height: 38mm;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            position: relative;
            z-index: 2;
        }
        .dalor-logo-box {
            width: 60mm;
        }
        .dalor-logo-box img {
            width: 100%;
            height: auto;
            display: block;
        }
        .dalor-rif-badge {
            font-size: 11px;
            font-weight: 900;
            color: #000;
            letter-spacing: 0.8px;
            margin-top: 2px;
            font-family: Arial, Helvetica, sans-serif;
        }
        .company-data-box {
            text-align: right;
            font-size: 8.5px;
            line-height: 1.35;
            color: #1e293b;
        }
        .company-title {
            font-size: 13px;
            font-weight: 900;
            color: #002b49;
            margin-bottom: 2px;
        }
        .control-number-box {
            position: absolute;
            bottom: 0mm;
            left: 0;
            right: 0;
            text-align: center;
        }
        .control-num-label {
            font-size: 9.5px;
            font-weight: 800;
            color: #1e293b;
            letter-spacing: 0.5px;
        }
        .control-num-val {
            font-size: 15px;
            font-weight: 900;
            margin-top: 1px;
        }

        /* Cuerpo de la Factura */
        .invoice-body {
            flex: 1;
            display: flex;
            flex-direction: column;
            z-index: 2;
        }

        /* Título FACTURA NRO */
        .invoice-title-row {
            text-align: center;
            font-size: 14.5px;
            font-weight: 900;
            letter-spacing: 0.5px;
            margin: 1mm 0 2mm 0;
        }

        /* Fila 1: Nombre o Razón Social (Izquierda) + Fecha de Emisión (Derecha) */
        .client-header-grid {
            display: flex;
            gap: 4px;
            margin-bottom: 3px;
        }
        .box-nombre {
            flex: 1.58;
            border: 1.5px solid #000;
            border-radius: 3px;
            padding: 3px 6px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            min-height: 12.5mm;
        }
        .box-fecha {
            flex: 1;
            border: 1.5px solid #000;
            border-radius: 3px;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            min-height: 12.5mm;
        }

        /* Fila 2: Dirección Fiscal (100% Ancho) */
        .box-dir {
            border: 1.5px solid #000;
            border-radius: 3px;
            padding: 3px 6px;
            font-size: 9px;
            margin-bottom: 3px;
            display: flex;
            align-items: center;
        }

        /* Filas 3 y 4: Rejillas de 3 Columnas */
        .grid-3col {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            border: 1.5px solid #000;
            border-radius: 3px;
            margin-bottom: 3px;
        }
        .cell-3col {
            padding: 3px 6px;
            border-right: 1px solid #000;
            display: flex;
            flex-direction: column;
        }
        .cell-3col:last-child {
            border-right: none;
        }

        /* Tabla Unificada de Renglones + Totales */
        .items-main-table {
            width: 100%;
            border-collapse: collapse;
            border: 1.5px solid #000;
            border-radius: 3px;
            margin-top: 1mm;
            background: transparent;
        }
        .items-main-table th {
            border-bottom: 1.5px solid #000;
            border-right: 1px solid #000;
            padding: 4px 6px;
            font-size: 8.5px;
            font-weight: 900;
            background: #ffffff;
            text-align: center;
            letter-spacing: 0.3px;
        }
        .items-main-table th:last-child {
            border-right: none;
        }

        /* Pie Legal Pre-impreso de Horimar de Venezuela */
        .footer-legal-box {
            margin-top: auto;
            z-index: 2;
        }
        .footer-grid {
            border: 1.5px solid #000;
            border-radius: 4px;
            display: flex;
            font-size: 7.2px;
            overflow: hidden;
        }
        .f-col {
            padding: 3px 4px;
            border-right: 1px solid #000;
            text-align: center;
            line-height: 1.25;
            display: flex;
            flex-direction: column;
            justify-content: center;
        }
        .f-col:last-child {
            border-right: none;
        }

        /* Reglas de Impresión según Modo */
        @media print {
            * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
            }
            @page {
                size: letter portrait;
                margin: 0;
            }
            body {
                background: #ffffff !important;
                margin: 0 !important;
                padding: 0 !important;
            }
            .toolbar-container {
                display: none !important;
            }
            .page-sheet {
                box-shadow: none !important;
                margin: 0 auto !important;
                width: 216mm !important;
                height: 279mm !important;
                padding: 7mm 10mm 6mm 10mm !important;
                overflow: hidden !important;
            }

            /* MODO PAPEL FORMA LIBRE: Oculta Encabezado, Marca de Agua y Pie (Ya vienen en el papel membretado físico) */
            body.mode-paper .watermark-img {
                display: none !important;
            }
            body.mode-paper .header-preprinted {
                visibility: hidden !important;
            }
            body.mode-paper .footer-legal-box {
                visibility: hidden !important;
            }

            /* MODO COPIA DIGITAL / PDF: Muestra Todo el Documento Completo con Calidad Vectorial */
            body.mode-digital .watermark-img {
                display: block !important;
                visibility: visible !important;
                opacity: 0.08 !important;
            }
            body.mode-digital .header-preprinted {
                display: flex !important;
                visibility: visible !important;
            }
            body.mode-digital .footer-legal-box {
                display: block !important;
                visibility: visible !important;
            }
        }
    </style>
</head>
<body class="mode-${initialMode}">

    <!-- Barra Superior de Control & Calibración -->
    <div class="toolbar-container">
        <div class="toolbar-group">
            <span style="font-weight: 900; font-size: 13px; color: #38bdf8;">🖨️ FACTURACIÓN FISCAL SENIAT</span>
            <span style="background: #334155; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 800;">FAC: <span id="tbDispInvoice">${data.invoice_number}</span></span>
            ${data.operational_code && data.operational_code !== data.invoice_number ? `<span style="background: #1e293b; color: #94a3b8; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 700;">Ref: ${data.operational_code}</span>` : ''}
        </div>

        <!-- Selector de Modo de Impresión -->
        <div class="toolbar-group">
            <button type="button" id="btnModeDigital" class="btn-tool ${initialMode === 'digital' ? 'active' : ''}" onclick="switchPrintMode('digital')" title="Genera la copia oficial completa con membrete, logo a color, sello rojo y marca de agua">
                🌐 Copia Digital / PDF
            </button>
            <button type="button" id="btnModePaper" class="btn-tool ${initialMode === 'paper' ? 'active' : ''}" onclick="switchPrintMode('paper')" title="Para insertar la hoja física membretada de Horimar en la impresora">
                📄 Papel Forma Libre Físico
            </button>
        </div>

        <!-- Asignación / Ajuste de Correlativos Fiscales (Dirección y Administración) -->
        <div class="toolbar-group" style="background: #1e293b; padding: 3px 8px; border-radius: 6px; border: 1px solid #475569; gap: 6px;">
            <label style="font-size: 11px; font-weight: 700; color: #94a3b8;">N° Factura:</label>
            <input type="text" id="inputInvoiceNumber" value="${data.invoice_number}" style="width: 70px; font-size: 12px; font-weight: 900; padding: 2px 4px; text-align: center; border-radius: 4px; border: 1px solid #94a3b8; background: white; color: #000;" placeholder="0948">

            <label style="font-size: 11px; font-weight: 700; color: #94a3b8; margin-left: 4px;">N° Control:</label>
            <input type="text" id="inputControlNumber" value="${data.control_number || ''}" style="width: 95px; font-size: 12px; font-weight: 900; padding: 2px 4px; text-align: center; border-radius: 4px; border: 1px solid #94a3b8; background: white; color: #000;" placeholder="00-000558">

            <label style="font-size: 11px; font-weight: 700; color: #94a3b8; margin-left: 4px;">Fecha:</label>
            <input type="date" id="inputIssueDate" value="${data.issue_date_iso || ''}" style="font-size: 11px; font-weight: 800; padding: 2px 4px; border-radius: 4px; border: 1px solid #94a3b8; background: white; color: #000;">

            <button type="button" onclick="saveCorrelatives(${data.id})" style="background: #0284c7; color: white; border: none; border-radius: 4px; padding: 3px 8px; font-size: 11px; font-weight: 800; cursor: pointer;" title="Guardar ajustes de correlativos y fecha oficial (Dirección/Administración)">💾 Guardar</button>
        </div>

        <!-- Botones de Impresión Directa -->
        <div class="toolbar-group">
            <button type="button" id="btnActionPrintDigital" class="btn-print" onclick="printDigitalCopy()" title="Imprimir o Guardar en PDF la Factura Oficial Completa (con logo, membrete y sello)">
                📥 Imprimir Copia Digital (PDF)
            </button>
            <button type="button" id="btnActionPrintPaper" class="btn-tool" onclick="printPaperMode()" title="Imprimir únicamente los datos en la bandeja de papel preimpreso de Horimar" style="background: #334155; border-color: #64748b;">
                🖨️ Imprimir Papel Físico
            </button>
        </div>
    </div>

    <!-- Hoja Tamaño Carta -->
    <div class="page-sheet" id="printSheet">

        <!-- Marca de Agua Central -->
        <img src="${DALOR_WATERMARK_B64}" class="watermark-img" alt="Marca de Agua DALOR">

        <!-- Encabezado Membretado Dalor -->
        <div class="header-preprinted">
            <div class="dalor-logo-box">
                <img src="${DALOR_LOGO_B64}" alt="DALOR">
                <div class="dalor-rif-badge">RIF: J-31601195-0</div>
            </div>
            <div class="company-data-box">
                <div class="company-title">METALMECÁNICA DALOR, C.A.</div>
                Av. Cámara de las Industrias, Galpón 10, Zona Industrial El Tigre, Guacara Edo. Carabobo<br>
                Telf.: 0412-240.70.79 / 0412-476.63.17<br>
                E-mail: admmetalmecanicadalor@gmail.com / www.metalmecanicadalor.com
            </div>
            <div class="control-number-box">
                <div class="control-num-label">FORMA LIBRE CONTROL Nº</div>
                <div class="control-num-val">
                    <span style="color: #000; letter-spacing: 2px;">${controlPrefix}</span>
                    <span style="color: #b91c1c; font-family: 'Courier New', Courier, monospace; font-size: 16px; font-weight: 900; letter-spacing: 2px; margin-left: 6px;" id="dispControlNumber">${controlSuffix}</span>
                </div>
            </div>
        </div>

        <!-- Cuerpo de la Factura -->
        <div class="invoice-body">

            <!-- Fila Título FACTURA NRO -->
            <div class="invoice-title-row">
                FACTURA NRO <span id="dispInvoiceNumber">${data.invoice_number}</span>
            </div>

            <!-- Fila 1: Nombre o Razón Social (61%) + Fecha de Emisión (39%) -->
            <div class="client-header-grid">
                <div class="box-nombre">
                    <div style="font-size: 8px; font-weight: 900; color: #000;">NOMBRE O RAZON SOCIAL:</div>
                    <div style="font-size: 10px; font-weight: 900; margin-top: 2px; text-transform: uppercase; color: #000;">
                        ${data.client.name}
                    </div>
                </div>
                <div class="box-fecha">
                    <div style="background: #fff; border-bottom: 1px solid #000; text-align: center; font-size: 7.5px; font-weight: 900; padding: 2px 4px;">
                        FECHA DE EMISION DIA/MES/AÑO
                    </div>
                    <div style="text-align: center; font-size: 9.5px; font-weight: 900; padding: 3px 4px; display: flex; justify-content: space-around; align-items: center; flex: 1;">
                        <span>En</span>
                        <span>Guacara</span>
                        <span id="dispIssueDate">${data.issue_date}</span>
                    </div>
                </div>
            </div>

            <!-- Fila 2: Dirección Fiscal (100% Ancho) -->
            <div class="box-dir">
                <span style="font-weight: 900; font-size: 8px; margin-right: 4px;">DIRECCION FISCAL:</span>
                <span style="font-weight: 700; font-size: 9px;">${data.client.fiscal_address}</span>
            </div>

            <!-- Fila 3: Condiciones de Pago | Nota de Entrega | Teléfonos -->
            <div class="grid-3col">
                <div class="cell-3col">
                    <span style="font-size: 7.5px; font-weight: 900;">CONDICIONES DE PAGO</span>
                    <span style="font-size: 9.5px; font-weight: 800; margin-top: 1px;">${data.payment_conditions || 'CONTADO'}</span>
                </div>
                <div class="cell-3col">
                    <span style="font-size: 7.5px; font-weight: 900;">NOTA DE ENTREGA N°</span>
                    <span style="font-size: 9.5px; font-weight: 800; margin-top: 1px;">${data.delivery_note || 'N/A'}</span>
                </div>
                <div class="cell-3col">
                    <span style="font-size: 7.5px; font-weight: 900;">TELEFONOS:</span>
                    <span style="font-size: 9.5px; font-weight: 800; margin-top: 1px;">${data.client.phones || '-'}</span>
                </div>
            </div>

            <!-- Fila 4: N° de OT | N° de RIF | Nro Orden de Servicio -->
            <div class="grid-3col">
                <div class="cell-3col">
                    <span style="font-size: 7.5px; font-weight: 900;">N° DE OT:</span>
                    <span style="font-size: 9.5px; font-weight: 900; color: #002b49; margin-top: 1px;">${data.ot_number || '-'}</span>
                </div>
                <div class="cell-3col">
                    <span style="font-size: 7.5px; font-weight: 900;">N° DE RIF:</span>
                    <span style="font-size: 9.5px; font-weight: 900; margin-top: 1px;">${data.client.rif || '-'}</span>
                </div>
                <div class="cell-3col">
                    <span style="font-size: 7.5px; font-weight: 900;">Nro Orden de Servicio:</span>
                    <span style="font-size: 9.5px; font-weight: 800; margin-top: 1px;">${data.service_order || '-'}</span>
                </div>
            </div>

            <!-- Tabla Unificada de Renglones + Coletilla Art. 25 + Totales -->
            <table class="items-main-table">
                <thead>
                    <tr>
                        <th style="width: 54%;">CONCEPTO O DESCRIPCION</th>
                        <th style="width: 11%;">CANTIDAD</th>
                        <th style="width: 17.5%;">PRECIO VENTA UNITARIO</th>
                        <th style="width: 17.5%;">TOTAL</th>
                    </tr>
                </thead>
                <tbody id="dispItemsTbody">
                    ${itemsRowsHtml}
                    ${emptyRowsHtml}
                </tbody>
                <tfoot>
                    <tr>
                        <td id="dispColetilla" rowspan="3" style="border-top: 1.5px solid #000; border-right: 1.5px solid #000; padding: 6px 8px; font-size: 8px; line-height: 1.35; vertical-align: middle; background: #ffffff;">
                            ${data.coletilla_art25}
                        </td>
                        <td colspan="2" style="border-top: 1.5px solid #000; border-right: 1px solid #000; padding: 4px 6px; font-size: 9px; font-weight: 900; background: #ffffff;">
                            BASE IMPONIBLE Bs.
                        </td>
                        <td id="dispTaxableBaseBs" style="border-top: 1.5px solid #000; padding: 4px 6px; text-align: right; font-size: 10px; font-weight: 900; font-family: monospace; background: #ffffff;">
                            ${formatBsNumber(data.taxable_base_bs)}
                        </td>
                    </tr>
                    <tr>
                        <td colspan="2" style="border-top: 1px solid #000; border-right: 1px solid #000; padding: 4px 6px; font-size: 9px; font-weight: 900; background: #ffffff;">
                            IVA 16%
                        </td>
                        <td id="dispTaxBs" style="border-top: 1px solid #000; padding: 4px 6px; text-align: right; font-size: 10px; font-weight: 900; font-family: monospace; background: #ffffff;">
                            ${formatBsNumber(data.tax_amount_bs)}
                        </td>
                    </tr>
                    <tr>
                        <td colspan="2" style="border-top: 1.5px solid #000; border-right: 1px solid #000; padding: 4px 6px; font-size: 9.5px; font-weight: 900; background: #ffffff;">
                            MONTO TOTAL Bs.
                        </td>
                        <td id="dispTotalBs" style="border-top: 1.5px solid #000; padding: 4px 6px; text-align: right; font-size: 11px; font-weight: 900; font-family: monospace; background: #ffffff;">
                            ${formatBsNumber(data.total_bs)}
                        </td>
                    </tr>
                </tfoot>
            </table>

            <!-- Pie de Imprenta Legal Horimar de Venezuela -->
            <div class="footer-legal-box">
                <div class="footer-grid">
                    <div class="f-col" style="width: 14%; font-weight: 900;">
                        HORIMAR DE VENEZUELA, C.A.<br><span style="font-weight: normal; font-size: 6.5px;">RIF: J-31368381-7</span>
                    </div>
                    <div class="f-col" style="width: 25%; font-size: 6.8px;">
                        Av. 73-B C.C. Alfer Nivel P.B. Local Galpon 01-B Zona Industrial Castillito, San Diego, Edo. Carabobo - Telf.: 0414-430.83.74
                    </div>
                    <div class="f-col" style="width: 18%; font-size: 6.8px;">
                        Autorizado Nº Providencia<br><strong>SENIAT/10/00418 de Fecha: 28-02-2008</strong>
                    </div>
                    <div class="f-col" style="width: 8%; font-weight: 900;">
                        REGIÓN<br>CENTRAL
                    </div>
                    <div class="f-col" style="width: 12%; font-size: 6.8px;">
                        Fecha de Impresión:<br><strong>08-01-2025</strong>
                    </div>
                    <div class="f-col" style="width: 23%; font-size: 7px;">
                        Documento: <strong>FORMA LIBRE Nº DE CONTROL</strong><br>
                        Desde el Nº 00-000501 hasta el Nº 00-000750
                    </div>
                </div>
                <div style="text-align: center; font-size: 8.5px; font-weight: 900; color: #b91c1c; margin-top: 3px; letter-spacing: 0.5px;">
                    ORIGINAL - CLIENTE
                </div>
            </div>

        </div>

    </div>

    <script>
        const API_ENDPOINT = "${apiBaseFull}";
        const SAVED_TOKEN = "${activeToken}";

        function switchPrintMode(mode) {
            document.body.className = 'mode-' + mode;
            const btnPaper = document.getElementById('btnModePaper');
            const btnDigital = document.getElementById('btnModeDigital');
            const btnActionDigital = document.getElementById('btnActionPrintDigital');
            if (btnPaper) btnPaper.className = 'btn-tool ' + (mode === 'paper' ? 'active' : '');
            if (btnDigital) btnDigital.className = 'btn-tool ' + (mode === 'digital' ? 'active' : '');
            if (btnActionDigital) {
                btnActionDigital.style.display = (mode === 'paper' ? 'none' : 'inline-block');
            }
        }

        function printDigitalCopy() {
            switchPrintMode('digital');
            setTimeout(() => {
                window.print();
            }, 120);
        }

        function printPaperMode() {
            switchPrintMode('paper');
            setTimeout(() => {
                window.print();
            }, 120);
        }

        function formatBs(num) {
            if (num === null || num === undefined || isNaN(num)) return "0,00";
            return Number(num).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }

        async function saveCorrelatives(recId) {
            const invInput = document.getElementById('inputInvoiceNumber');
            const ctrlInput = document.getElementById('inputControlNumber');
            const dateInput = document.getElementById('inputIssueDate');
            const invVal = (invInput?.value || '').trim();
            const ctrlVal = (ctrlInput?.value || '').trim();
            const dateVal = (dateInput?.value || '').trim();
            if (!invVal && !ctrlVal && !dateVal) {
                alert('Por favor especifique al menos un campo a actualizar.');
                return;
            }
            const reason = prompt('Indique el motivo del ajuste o confirmación fiscal (Auditoría Directiva):', 'Emisión oficial de factura SENIAT');
            if (reason === null) return;
            try {
                const token = SAVED_TOKEN || (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('dalor_token')) || (typeof localStorage !== 'undefined' && localStorage.getItem('dalor_token')) || '';
                const r = await fetch(API_ENDPOINT + '/financial/cxc/' + recId + '/fiscal-correlative', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                    body: JSON.stringify({ fiscal_invoice_number: invVal, control_number: ctrlVal, issue_date: dateVal, reason: reason })
                });
                const res = await r.json().catch(() => ({}));
                if (r.ok) {
                    // Obtener los datos frescos de la factura tras el cambio para actualizar en vivo sin recargar ventana
                    const freshRes = await fetch(API_ENDPOINT + '/financial/cxc/' + recId + '/fiscal-invoice-data', {
                        headers: { 'Authorization': 'Bearer ' + token }
                    });
                    if (freshRes.ok) {
                        const fresh = await freshRes.json();
                        if (fresh.invoice_number) {
                            const dispInv = document.getElementById('dispInvoiceNumber');
                            if (dispInv) dispInv.innerText = fresh.invoice_number;
                            const tbInv = document.getElementById('tbDispInvoice');
                            if (tbInv) tbInv.innerText = fresh.invoice_number;
                            document.title = 'Factura ' + fresh.invoice_number + ' - Metalmecánica Dalor, C.A.';
                        }
                        if (fresh.control_number) {
                            const dispCtrl = document.getElementById('dispControlNumber');
                            if (dispCtrl) {
                                const parts = fresh.control_number.split('-');
                                dispCtrl.innerText = parts.length > 1 ? parts[1].trim() : fresh.control_number;
                            }
                        }
                        if (fresh.issue_date) {
                            const dispDate = document.getElementById('dispIssueDate');
                            if (dispDate) dispDate.innerText = fresh.issue_date;
                        }
                        if (fresh.coletilla_art25) {
                            const dispColetilla = document.getElementById('dispColetilla');
                            if (dispColetilla) dispColetilla.innerText = fresh.coletilla_art25;
                        }
                        if (fresh.taxable_base_bs !== undefined) {
                            const dispBase = document.getElementById('dispTaxableBaseBs');
                            if (dispBase) dispBase.innerText = formatBs(fresh.taxable_base_bs);
                        }
                        if (fresh.tax_amount_bs !== undefined) {
                            const dispTax = document.getElementById('dispTaxBs');
                            if (dispTax) dispTax.innerText = formatBs(fresh.tax_amount_bs);
                        }
                        if (fresh.total_bs !== undefined) {
                            const dispTot = document.getElementById('dispTotalBs');
                            if (dispTot) dispTot.innerText = formatBs(fresh.total_bs);
                        }
                        // Re-renderizar renglones con montos en Bs recalculados
                        if (fresh.items && fresh.items.length > 0) {
                            var newRowsHtml = fresh.items.map(function(it) {
                                return '<tr>' +
                                    '<td style="padding: 6px 8px; border-right: 1px solid #000; font-size: 9.5px; font-weight: 800; line-height: 1.35; text-transform: uppercase;">' + it.description + '</td>' +
                                    '<td style="padding: 6px 8px; border-right: 1px solid #000; text-align: center; font-size: 10px; font-weight: 900;">' + it.quantity + '</td>' +
                                    '<td style="padding: 6px 8px; border-right: 1px solid #000; text-align: right; font-size: 10px; font-weight: 800; font-family: monospace;">' + formatBs(it.unit_price_bs) + '</td>' +
                                    '<td style="padding: 6px 8px; text-align: right; font-size: 10px; font-weight: 900; font-family: monospace;">' + formatBs(it.total_bs) + '</td>' +
                                '</tr>';
                            }).join('');
                            var minR = 8;
                            var emptyR = '';
                            if (fresh.items.length < minR) {
                                for (var i = 0; i < (minR - fresh.items.length); i++) {
                                    emptyR += '<tr><td style="padding: 10px 8px; border-right: 1px solid #000;">&nbsp;</td><td style="border-right: 1px solid #000;">&nbsp;</td><td style="border-right: 1px solid #000;">&nbsp;</td><td>&nbsp;</td></tr>';
                                }
                            }
                            var tbody = document.getElementById('dispItemsTbody');
                            if (tbody) tbody.innerHTML = newRowsHtml + emptyR;
                        }
                    }
                    alert('✅ Ajustes fiscales guardados con éxito.');
                } else {
                    alert('Error al actualizar datos fiscales: ' + (res.detail || 'Operación no permitida'));
                }
            } catch (e) {
                alert('Error de conexión: ' + e.message);
            }
        }
    </script>
</body>
</html>
        `;

        printWin.document.open();
        printWin.document.write(htmlContent);
        printWin.document.close();

    } catch (e) {
        console.error("Error al generar factura fiscal en forma libre:", e);
        alert("Error al cargar la factura fiscal: " + e.message);
    }
}

if (typeof window !== 'undefined') {
    window.printOfficialFiscalInvoice = printOfficialFiscalInvoice;
}

export { printOfficialFiscalInvoice };
