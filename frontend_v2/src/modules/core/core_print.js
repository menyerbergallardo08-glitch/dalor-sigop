/**
 * DALOR SIGO-P | Módulo: CORE_PRINT.JS
 * Desacoplado de core.js
 * Utilidades de impresión y renderizado de iframe fiscal/corporativo
 */

// 🛠️ FUNCIONES UNIVERSALES DE UTILIDAD & ORDENAMIENTO NUMÉRICO JERÁRQUICO
function printElementHtml(elementOrHtml, docTitle = 'Documento DALOR', options = {}) {
    let iframe = document.getElementById('dalor_print_iframe');
    if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = 'dalor_print_iframe';
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        iframe.style.visibility = 'hidden';
        document.body.appendChild(iframe);
    }

    const titleLower = String(docTitle || '').toLowerCase();
    const isLandscape = (options && options.orientation === 'landscape') ||
                        (options && options.landscape) ||
                        titleLower.includes('libro') ||
                        titleLower.includes('compras') ||
                        titleLower.includes('ventas') ||
                        titleLower.includes('matriz');

    let contentHtml = '';
    if (typeof elementOrHtml === 'string') {
        contentHtml = elementOrHtml;
    } else if (elementOrHtml && elementOrHtml.nodeType) {
        const clone = elementOrHtml.cloneNode(true);
        // Eliminar botones y elementos marcados como no imprimibles
        clone.querySelectorAll('.no-print, button, input[type="button"], input[type="submit"]').forEach(el => el.remove());

        // Desactivar contenedores con scroll para que la tabla imprima completa
        clone.querySelectorAll('.table-wrapper, div').forEach(el => {
            if (el.style) {
                if (el.style.maxHeight) el.style.maxHeight = 'none';
                if (el.style.overflow) el.style.overflow = 'visible';
                if (el.style.overflowY) el.style.overflowY = 'visible';
                if (el.style.overflowX) el.style.overflowX = 'visible';
            }
        });

        // Para libros fiscales, remover la columna de "Acción" del encabezado y filas
        if (isLandscape) {
            clone.querySelectorAll('table').forEach(tbl => {
                let actionColIdx = -1;
                const headerCells = tbl.querySelectorAll('thead th');
                headerCells.forEach((th, idx) => {
                    const txt = th.textContent.trim().toLowerCase();
                    if (txt === 'acción' || txt === 'accion') actionColIdx = idx;
                });
                if (actionColIdx !== -1) {
                    tbl.querySelectorAll('tr').forEach(row => {
                        if (row.cells && row.cells[actionColIdx]) {
                            row.cells[actionColIdx].remove();
                        }
                    });
                }
            });
        }

        contentHtml = clone.innerHTML;
    }

    const headerBanner = `
        <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 8px; border-bottom: 2px solid #002B49; padding-bottom: 4px;">
            <div>
                <h1 style="margin: 0; font-size: ${isLandscape ? '13px' : '15px'}; font-weight: 900; color: #002B49; letter-spacing: -0.2px;">METALMECÁNICA DALOR, C.A.</h1>
                <p style="margin: 2px 0 0; font-size: ${isLandscape ? '8px' : '9.5px'}; color: #475569; font-weight: 600;">RIF: J-31601195-0 &bull; Av. Cámara de las Industrias, Galpón 10, Guacara, Edo. Carabobo</p>
            </div>
            <div style="text-align: right;">
                <h2 style="margin: 0; font-size: ${isLandscape ? '11px' : '13px'}; font-weight: 800; color: #0072B8;">${String(docTitle).replace(/_/g, ' ')}</h2>
                <p style="margin: 2px 0 0; font-size: ${isLandscape ? '7.5px' : '9px'}; color: #64748b;">Impreso: ${new Date().toLocaleDateString('es-VE')} ${new Date().toLocaleTimeString('es-VE', {hour:'2-digit', minute:'2-digit'})}</p>
            </div>
        </div>
    `;

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`
        <!DOCTYPE html>
        <html lang="es">
            <head>
                <meta charset="utf-8">
                <title>${docTitle}</title>
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
                <link rel="stylesheet" href="/css/styles.css?v=2026.09.24.v98.35">
                <style>
                    :root {
                        --dalor-navy: #002B49;
                        --dalor-blue: #0072B8;
                        --dalor-gold: #F5B800;
                        --dalor-coral: #ff4b72;
                        --dalor-cyan: #0284c7;
                        --dalor-emerald: #059669;
                        --dalor-purple: #7c3aed;
                        --dalor-bg: #f1f5f9;
                        --dalor-card-bg: #ffffff;
                        --border-color: #cbd5e1;
                    }
                    * { 
                        box-sizing: border-box; 
                        scrollbar-width: none !important;
                    }
                    ::-webkit-scrollbar {
                        display: none !important;
                        width: 0 !important;
                        height: 0 !important;
                    }
                    body {
                        margin: 0;
                        padding: ${isLandscape ? '4mm 6mm' : '8mm 10mm'};
                        background: #ffffff;
                        color: #0f172a;
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                        font-size: ${isLandscape ? '8px' : '11px'};
                        line-height: 1.25;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    @page {
                        size: ${isLandscape ? 'letter landscape' : 'letter portrait'};
                        margin: ${isLandscape ? '5mm' : '8mm 10mm'};
                    }
                    @media print {
                        body { padding: 0; margin: 0; background: #fff !important; }
                        .no-print { display: none !important; }
                    }
                    .no-print { display: none !important; }

                    .table-wrapper {
                        max-height: none !important;
                        height: auto !important;
                        overflow: visible !important;
                        overflow-x: visible !important;
                        overflow-y: visible !important;
                        width: 100% !important;
                        border: none !important;
                        box-shadow: none !important;
                        margin-bottom: 6px !important;
                    }
                    table {
                        width: 100% !important;
                        max-width: 100% !important;
                        border-collapse: collapse !important;
                        font-size: ${isLandscape ? '7.5px' : '10px'} !important;
                        table-layout: auto !important;
                        page-break-inside: auto;
                    }
                    tr {
                        page-break-inside: avoid;
                        page-break-after: auto;
                    }
                    thead {
                        display: table-header-group;
                    }
                    th, td {
                        padding: ${isLandscape ? '2.5px 2px' : '6px 8px'} !important;
                        border: 1px solid #94a3b8 !important;
                        white-space: normal !important;
                        word-break: break-word !important;
                        font-size: ${isLandscape ? '7.5px' : '10px'} !important;
                        line-height: 1.15 !important;
                    }
                    thead th {
                        background: #0f172a !important;
                        color: #ffffff !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        text-align: center;
                        font-weight: 800;
                    }
                    /* Barra horizontal compacta para KPI Cards */
                    div[style*="grid-template-columns"] {
                        display: flex !important;
                        flex-direction: row !important;
                        justify-content: space-between !important;
                        gap: 5px !important;
                        margin-bottom: 8px !important;
                        width: 100% !important;
                    }
                    div[style*="grid-template-columns"] > div {
                        flex: 1 1 0 !important;
                        padding: 3px 6px !important;
                        border-radius: 4px !important;
                    }
                    div[style*="grid-template-columns"] span {
                        font-size: 7.5px !important;
                        display: block !important;
                    }
                    div[style*="grid-template-columns"] div[id^="kpi_"] {
                        font-size: ${isLandscape ? '11px' : '13px'} !important;
                        font-weight: 900 !important;
                        margin-top: 1px !important;
                    }
                </style>
            </head>
            <body>
                ${headerBanner}
                ${contentHtml}
            </body>
        </html>
    `);
    doc.close();

    setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
    }, 250);
}

if (typeof window !== 'undefined') {
    window.printElementHtml = printElementHtml;
}

export { printElementHtml };
