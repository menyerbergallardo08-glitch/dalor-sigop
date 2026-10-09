// Sigop ERP - Submódulo Financiero Modularizado
const API_BASE = (typeof window !== 'undefined' && window.API_BASE) || '/api/v1';

function safeParseFloat(val) {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    let s = String(val).trim();
    if (!s) return 0;
    let hasComma = s.includes(',');
    let hasDot = s.includes('.');
    if (hasComma && hasDot) {
        if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
            s = s.replace(/\./g, '').replace(',', '.');
        } else {
            s = s.replace(/,/g, '');
        }
    } else if (hasComma) {
        s = s.replace(',', '.');
    }
    s = s.replace(/[^0-9.-]/g, '');
    let res = parseFloat(s);
    return isNaN(res) ? 0 : res;
}

const authFetch = (url, options = {}) => {
    const token = (typeof localStorage !== 'undefined' && localStorage.getItem('token')) || (typeof window !== 'undefined' && window.authToken);
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (options.body instanceof FormData) {
        delete headers['Content-Type'];
    }
    return window.fetch(url, { ...options, headers });
};

async function openWithholdingVoucherModal(payableId) {
    try {
        const res = await authFetch(`${API_BASE}/financial/cxp/${payableId}/withholding-voucher`);
        if (!res.ok) throw new Error("No se pudo obtener el comprobante de retención");
        const data = await res.json();
        const v = data.voucher;
        if (!v) throw new Error("Datos de comprobante no disponibles");

        document.getElementById("voucher_doc_number").textContent = v.voucher_number || '-';
        document.getElementById("voucher_doc_date").textContent = v.voucher_date || '-';
        document.getElementById("voucher_doc_period").textContent = v.fiscal_period || '-';

        document.getElementById("voucher_supp_name").textContent = v.supplier.name || '-';
        document.getElementById("voucher_supp_rif").textContent = v.supplier.rif || 'J-00000000-0';
        document.getElementById("voucher_supp_concept").textContent = v.invoice.invoice_number ? `Factura N° ${v.invoice.invoice_number}` : '-';
        document.getElementById("voucher_bcv_rate").textContent = `Bs. ${Number(v.invoice.exchange_rate || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}`;

        document.getElementById("v_td_date").textContent = v.invoice.invoice_date || '-';
        document.getElementById("v_td_invoice").textContent = v.invoice.invoice_number || '-';
        document.getElementById("v_td_control").textContent = v.invoice.control_number || '-';
        document.getElementById("v_td_ret_rate").textContent = `${v.invoice.withholding_rate_pct || 75}%`;

        document.getElementById("v_td_total_bs").textContent = `Bs. ${Number(v.invoice.total_bs || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}`;
        document.getElementById("v_td_base_bs").textContent = `Bs. ${Number(v.invoice.base_bs || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}`;
        document.getElementById("v_td_tax_bs").textContent = `Bs. ${Number(v.invoice.tax_bs || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}`;
        document.getElementById("v_td_withheld_bs").textContent = `-Bs. ${Number(v.invoice.withholding_bs || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}`;
        document.getElementById("v_td_net_bs").textContent = `Bs. ${Number(v.invoice.net_payable_bs || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}`;

        openModal("modalWithholdingVoucher");
    } catch (err) {
        alert("Error al cargar comprobante: " + err.message);
    }
}

function printWithholdingVoucher() {
    const voucherModal = document.querySelector("#modalWithholdingVoucher .modal-content");
    const docNumber = document.getElementById("voucher_doc_number")?.textContent || "SENIAT";
    const title = `Comprobante_Retencion_IVA_${docNumber}`;
    if (typeof window.printElementHtml === 'function' && voucherModal) {
        window.printElementHtml(voucherModal, title);
    } else {
        window.print();
    }
}

async function openIslrWithholdingVoucherModal(payableId) {
    try {
        const res = await authFetch(`${API_BASE}/financial/cxp/${payableId}/islr-withholding-voucher`);
        if (!res.ok) throw new Error("No se pudo obtener el comprobante de retención ISLR");
        const data = await res.json();
        const v = data.voucher;
        if (!v) throw new Error("Datos de comprobante no disponibles");

        const elDocNum = document.getElementById("islr_voucher_doc_number");
        if (elDocNum) elDocNum.textContent = v.voucher_number || '-';

        const elDocDate = document.getElementById("islr_voucher_doc_date");
        if (elDocDate) elDocDate.textContent = v.voucher_date || '-';

        const elDocPeriod = document.getElementById("islr_voucher_doc_period");
        if (elDocPeriod) elDocPeriod.textContent = v.fiscal_period || '-';

        const elSuppName = document.getElementById("islr_voucher_supp_name");
        if (elSuppName) elSuppName.textContent = v.supplier.name || '-';

        const elSuppRif = document.getElementById("islr_voucher_supp_rif");
        if (elSuppRif) elSuppRif.textContent = v.supplier.rif || 'J-00000000-0';

        const elSuppConcept = document.getElementById("islr_voucher_supp_concept");
        if (elSuppConcept) elSuppConcept.textContent = v.invoice.concept || `Factura N° ${v.invoice.invoice_number}`;

        const elBcvRate = document.getElementById("islr_voucher_bcv_rate");
        if (elBcvRate) elBcvRate.textContent = `Bs. ${Number(v.invoice.exchange_rate || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}`;

        const elTdDate = document.getElementById("islr_v_td_date");
        if (elTdDate) elTdDate.textContent = v.invoice.invoice_date || '-';

        const elTdInvoice = document.getElementById("islr_v_td_invoice");
        if (elTdInvoice) elTdInvoice.textContent = v.invoice.invoice_number || '-';

        const elTdControl = document.getElementById("islr_v_td_control");
        if (elTdControl) elTdControl.textContent = v.invoice.control_number || '-';

        const elTdCode = document.getElementById("islr_v_td_code");
        if (elTdCode) elTdCode.textContent = v.invoice.concept_code || '054';

        const elTdTotalBs = document.getElementById("islr_v_td_total_bs");
        if (elTdTotalBs) elTdTotalBs.textContent = `Bs. ${Number(v.invoice.total_bs || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}`;

        const elTdBaseBs = document.getElementById("islr_v_td_base_bs");
        if (elTdBaseBs) elTdBaseBs.textContent = `Bs. ${Number(v.invoice.base_bs || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}`;

        const elTdRetRate = document.getElementById("islr_v_td_ret_rate");
        if (elTdRetRate) elTdRetRate.textContent = `${v.invoice.islr_rate_pct || 2}%`;

        const elTdWithheldBs = document.getElementById("islr_v_td_withheld_bs");
        if (elTdWithheldBs) elTdWithheldBs.textContent = `-Bs. ${Number(v.invoice.islr_withholding_bs || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}`;

        const elTdNetBs = document.getElementById("islr_v_td_net_bs");
        if (elTdNetBs) elTdNetBs.textContent = `Bs. ${Number(v.invoice.net_payable_bs || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}`;

        openModal("modalIslrWithholdingVoucher");
    } catch (err) {
        alert("Error al cargar comprobante ISLR: " + err.message);
    }
}

function printIslrWithholdingVoucher() {
    const voucherModal = document.querySelector("#modalIslrWithholdingVoucher .modal-content");
    const docNumber = document.getElementById("islr_voucher_doc_number")?.textContent || "SENIAT_ISLR";
    const title = `Comprobante_Retencion_ISLR_${docNumber}`;
    if (typeof window.printElementHtml === 'function' && voucherModal) {
        window.printElementHtml(voucherModal, title);
    } else {
        window.print();
    }
}

async function openMunicipalWithholdingVoucherModal(payableId) {
    try {
        const res = await authFetch(`${API_BASE}/financial/cxp/${payableId}/municipal-withholding-voucher`);
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.detail || "No se pudo obtener el comprobante de retención municipal");
        }
        const data = await res.json();
        const v = data.voucher;
        if (!v) throw new Error("Datos de comprobante no disponibles");

        const setTxt = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val !== null && val !== undefined ? val : '-';
        };

        setTxt("muni_voucher_doc_number", v.voucher_number || '-');
        const periodStr = v.period ? `${v.period.day ? String(v.period.day).padStart(2, '0') + '/' : ''}${v.period.month || ''}/${v.period.year || ''}` : '-';
        setTxt("muni_voucher_doc_date", periodStr);
        setTxt("muni_voucher_doc_period", `${v.period?.month || ''} / ${v.period?.year || ''}`);
        setTxt("muni_voucher_legal_base", v.legal_base || '');
        setTxt("muni_voucher_legal_article", v.legal_article || '');

        setTxt("muni_voucher_supp_name", v.supplier?.name || '-');
        setTxt("muni_voucher_supp_rif", v.supplier?.rif || '-');
        setTxt("muni_voucher_supp_address", v.supplier?.address || '-');
        setTxt("muni_voucher_supp_phone", v.supplier?.phone || '-');

        setTxt("muni_v_td_date", v.invoice?.invoice_date || '-');
        setTxt("muni_v_td_invoice", v.invoice?.invoice_number || '-');
        setTxt("muni_v_td_control", v.invoice?.control_number || '-');
        setTxt("muni_v_td_total_bs", `Bs. ${Number(v.invoice?.total_bs || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`);
        setTxt("muni_v_td_base_bs", `Bs. ${Number(v.invoice?.base_bs || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`);
        setTxt("muni_v_td_rate", `${v.withholding?.rate_pct || 3.0}%`);
        setTxt("muni_v_td_withheld_bs", `Bs. ${Number(v.withholding?.amount_bs || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`);
        setTxt("muni_v_tfoot_withheld_bs", `Bs. ${Number(v.withholding?.amount_bs || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`);

        openModal("modalMunicipalWithholdingVoucher");
    } catch (err) {
        alert("Error al cargar comprobante municipal: " + err.message);
    }
}

function printMunicipalWithholdingVoucher() {
    const voucherModal = document.querySelector("#modalMunicipalWithholdingVoucher .modal-content");
    const docNumber = document.getElementById("muni_voucher_doc_number")?.textContent || "GUACARA_MUNICIPAL";
    const title = `Comprobante_Retencion_Municipal_${docNumber}`;
    if (typeof window.printElementHtml === 'function' && voucherModal) {
        window.printElementHtml(voucherModal, title);
    } else {
        window.print();
    }
}

let currentFiscalInnerTab = 'ventas';

function switchFiscalInnerTab(tab) {
    currentFiscalInnerTab = tab;
    const btnVentas = document.getElementById("btn-fiscal-sub-ventas");
    const btnCompras = document.getElementById("btn-fiscal-sub-compras");
    const secVentas = document.getElementById("section-fiscal-ventas");
    const secCompras = document.getElementById("section-fiscal-compras");

    if (tab === 'ventas') {
        if (btnVentas) { btnVentas.className = "btn-primary"; btnVentas.style.background = "#0284c7"; }
        if (btnCompras) { btnCompras.className = "btn-secondary"; btnCompras.style.background = ""; }
        if (secVentas) secVentas.classList.remove("hidden");
        if (secCompras) secCompras.classList.add("hidden");
    } else {
        if (btnCompras) { btnCompras.className = "btn-primary"; btnCompras.style.background = "#be123c"; }
        if (btnVentas) { btnVentas.className = "btn-secondary"; btnVentas.style.background = ""; }
        if (secVentas) secVentas.classList.add("hidden");
        if (secCompras) secCompras.classList.remove("hidden");
    }
}

async function loadFiscalBooksView() {
    const month = parseInt(document.getElementById("fiscal_month_select")?.value) || 9;
    const year = parseInt(document.getElementById("fiscal_year_select")?.value) || 2026;
    const filterType = document.getElementById("fiscal_doc_filter")?.value || "all";

    // Load Libro de Ventas Data
    try {
        const resV = await authFetch(`${API_BASE}/financial/reports/libro-ventas/data?month=${month}&year=${year}&filter_type=${filterType}`);
        if (resV.ok) {
            const dataV = await resV.json();
            const totals = dataV.totals || {};
            const items = dataV.items || [];

            const fmt = (num) => `Bs. ${Number(num || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
            const setTxt = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };

            setTxt("kpi_lv_total", fmt(totals.total_ventas_bs));
            setTxt("kpi_lv_base", fmt(totals.base_imponible_bs));
            setTxt("kpi_lv_tax", fmt(totals.iva_bs));
            setTxt("kpi_lv_ret_iva", fmt(totals.ret_iva_bs));
            setTxt("kpi_lv_ret_islr", fmt(totals.ret_islr_bs));

            const tbodyV = document.getElementById("libroVentasTableBody");
            if (tbodyV) {
                if (items.length === 0) {
                    tbodyV.innerHTML = `<tr><td colspan="11" style="text-align: center; padding: 24px; color: #94a3b8;"><i class="fa-solid fa-folder-open"></i> No hay facturas de ventas registradas en este período con el filtro seleccionado.</td></tr>`;
                } else {
                    tbodyV.innerHTML = items.map(it => `
                        <tr style="border-bottom: 1px solid #f1f5f9;">
                            <td style="text-align: center; font-weight: 700;">${it.operacion}</td>
                            <td style="text-align: center;">${it.fecha}</td>
                            <td style="font-family: monospace; font-weight: 700;">${it.rif}</td>
                            <td style="font-weight: 700; color: #1e293b;">${it.cliente}</td>
                            <td style="text-align: center; font-weight: 800; color: #0284c7;">${it.factura}</td>
                            <td style="text-align: center; color: #64748b;">${it.control}</td>
                            <td style="text-align: right; font-weight: 800;">${fmt(it.total_ventas_bs)}</td>
                            <td style="text-align: right;">${fmt(it.base_imponible_bs)}</td>
                            <td style="text-align: right; color: #059669; font-weight: 700;">${fmt(it.iva_bs)}</td>
                            <td style="text-align: right; color: #be185d; font-weight: 700;">${fmt(it.ret_iva_bs)}</td>
                            <td style="text-align: right; color: #7e22ce; font-weight: 700;">${fmt(it.ret_islr_bs)}</td>
                        </tr>
                    `).join('');
                }
            }
        }
    } catch (err) {
        console.warn("Error cargando Libro de Ventas:", err);
    }

    // Load Libro de Compras Data
    try {
        const resC = await authFetch(`${API_BASE}/financial/reports/libro-compras/data?month=${month}&year=${year}&filter_type=${filterType}`);
        if (resC.ok) {
            const dataC = await resC.json();
            const totals = dataC.totals || {};
            const items = dataC.items || [];

            const fmt = (num) => `Bs. ${Number(num || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
            const setTxt = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };

            setTxt("kpi_lc_total", fmt(totals.total_compras_bs));
            setTxt("kpi_lc_exento", fmt(totals.exento_bs));
            setTxt("kpi_lc_base", fmt(totals.base_16_bs));
            setTxt("kpi_lc_tax", fmt(totals.iva_16_bs));
            setTxt("kpi_lc_ret_iva", fmt(totals.ret_iva_bs));

            const tbodyC = document.getElementById("libroComprasTableBody");
            if (tbodyC) {
                if (items.length === 0) {
                    tbodyC.innerHTML = `<tr><td colspan="13" style="text-align: center; padding: 24px; color: #94a3b8;"><i class="fa-solid fa-folder-open"></i> No hay compras registradas en este período con el filtro seleccionado.</td></tr>`;
                } else {
                    tbodyC.innerHTML = items.map(it => `
                        <tr style="border-bottom: 1px solid #f1f5f9;">
                            <td style="text-align: center; font-weight: 700;">${it.operacion}</td>
                            <td style="text-align: center;">${it.fecha}</td>
                            <td style="font-family: monospace; font-weight: 700;">${it.rif}</td>
                            <td style="font-weight: 700; color: #1e293b;">${it.proveedor}</td>
                            <td style="text-align: center; font-weight: 800; color: #e11d48;">${it.factura}</td>
                            <td style="text-align: center; color: #64748b;">${it.control}</td>
                            <td style="text-align: center; font-family: monospace; font-size: 9px; color: #be185d;">${it.cbt_retencion || '-'}</td>
                            <td style="text-align: right; font-weight: 800;">${fmt(it.total_compras_bs)}</td>
                            <td style="text-align: right;">${fmt(it.exento_bs)}</td>
                            <td style="text-align: right;">${fmt(it.base_16_bs)}</td>
                            <td style="text-align: right; color: #2563eb; font-weight: 700;">${fmt(it.iva_16_bs)}</td>
                            <td style="text-align: right; color: #be185d; font-weight: 700;">${fmt(it.ret_iva_bs)}</td>
                            <td style="text-align: center;">
                                ${(it.payable_id && ((it.municipal_rate && it.municipal_rate > 0) || it.municipal_voucher_number)) ? `
                                    <button onclick="openMunicipalWithholdingVoucherModal(${it.payable_id})" class="btn-secondary" style="font-size: 10px; padding: 3px 6px; background: #ecfdf5; color: #047857; border-color: #a7f3d0;" title="Ver Comprobante Municipal">
                                        <i class="fa-solid fa-landmark"></i> Ret. Munic.
                                    </button>
                                ` : '<span style="color: #cbd5e1; font-weight: 700;">-</span>'}
                            </td>
                        </tr>
                    `).join('');
                }
            }
        }
    } catch (err) {
        console.warn("Error cargando Libro de Compras:", err);
    }
}

async function downloadLibroVentasExcel() {
    const month = parseInt(document.getElementById("fiscal_month_select")?.value) || 9;
    const year = parseInt(document.getElementById("fiscal_year_select")?.value) || 2026;
    const filterType = document.getElementById("fiscal_doc_filter")?.value || "all";
    try {
        const res = await authFetch(`${API_BASE}/financial/reports/libro-ventas/excel?month=${month}&year=${year}&filter_type=${filterType}`);
        if (!res.ok) throw new Error("Error al generar Excel de Libro de Ventas");
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Libro_de_Ventas_${year}_${String(month).padStart(2, '0')}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
    } catch (e) {
        alert("Error al descargar Excel: " + e.message);
    }
}

async function downloadLibroComprasExcel() {
    const month = parseInt(document.getElementById("fiscal_month_select")?.value) || 9;
    const year = parseInt(document.getElementById("fiscal_year_select")?.value) || 2026;
    const filterType = document.getElementById("fiscal_doc_filter")?.value || "all";
    try {
        const res = await authFetch(`${API_BASE}/financial/reports/libro-compras/excel?month=${month}&year=${year}&filter_type=${filterType}`);
        if (!res.ok) throw new Error("Error al generar Excel de Libro de Compras");
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Libro_de_Compras_${year}_${String(month).padStart(2, '0')}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
    } catch (e) {
        alert("Error al descargar Excel: " + e.message);
    }
}

function printLibroVentasPDF() {
    const month = document.getElementById("fiscal_month_select")?.selectedOptions[0]?.text || "Septiembre";
    const year = document.getElementById("fiscal_year_select")?.value || "2026";
    const content = document.getElementById("section-fiscal-ventas");
    if (!content) return;
    const title = `Libro de Ventas - ${month} ${year}`;
    if (typeof window.printElementHtml === 'function') {
        window.printElementHtml(content, title, { orientation: 'landscape' });
    } else {
        window.print();
    }
}

function printLibroComprasPDF() {
    const month = document.getElementById("fiscal_month_select")?.selectedOptions[0]?.text || "Septiembre";
    const year = document.getElementById("fiscal_year_select")?.value || "2026";
    const content = document.getElementById("section-fiscal-compras");
    if (!content) return;
    const title = `Libro de Compras - ${month} ${year}`;
    if (typeof window.printElementHtml === 'function') {
        window.printElementHtml(content, title, { orientation: 'landscape' });
    } else {
        window.print();
    }
}

function openImportLibrosExcelModal() {
    const form = document.getElementById("importLibrosExcelForm");
    if (form) form.reset();
    const status = document.getElementById("import_libros_status");
    if (status) { status.style.display = "none"; status.innerHTML = ""; }
    openModal("modalImportLibrosExcel");
}

async function submitImportLibrosExcel(event) {
    event.preventDefault();
    const fileInput = document.getElementById("import_libros_file");
    const rateInput = document.getElementById("import_libros_rate");
    const status = document.getElementById("import_libros_status");
    const btn = document.getElementById("btnSubmitImportLibros");

    if (!fileInput?.files?.length) {
        alert("Por favor seleccione un archivo Excel (.xlsx).");
        return;
    }

    const file = fileInput.files[0];
    const rate = parseFloat(rateInput?.value) || 859.06;

    const formData = new FormData();
    formData.append("file", file);

    if (btn) { btn.disabled = true; btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Procesando Archivo...`; }
    if (status) {
        status.style.display = "block";
        status.style.background = "#eff6ff";
        status.style.color = "#1d4ed8";
        status.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Leyendo hojas de Ventas, Compras y Retenciones Municipales...`;
    }

    try {
        const res = await authFetch(`${API_BASE}/financial/import-libros-excel?exchange_rate=${rate}`, {
            method: "POST",
            body: formData
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
            throw new Error(data.detail || data.message || "Error al procesar el archivo Excel");
        }

        if (status) {
            status.style.background = "#ecfdf5";
            status.style.color = "#047857";
            status.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${data.message}`;
        }

        setTimeout(() => {
            closeModal("modalImportLibrosExcel");
            loadFiscalBooksView();
            loadPayablesList();
            loadReceivablesList();
        }, 1500);

    } catch (err) {
        if (status) {
            status.style.background = "#fff1f2";
            status.style.color = "#e11d48";
            status.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> ${err.message}`;
        }
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = `<i class="fa-solid fa-cloud-arrow-up"></i> Procesar e Importar al Sistema`; }
    }
}


// Auto-window binding & ES6 exports
if (typeof window !== 'undefined') {
    window.openWithholdingVoucherModal = openWithholdingVoucherModal;
    window.printWithholdingVoucher = printWithholdingVoucher;
    window.openIslrWithholdingVoucherModal = openIslrWithholdingVoucherModal;
    window.printIslrWithholdingVoucher = printIslrWithholdingVoucher;
    window.openMunicipalWithholdingVoucherModal = openMunicipalWithholdingVoucherModal;
    window.printMunicipalWithholdingVoucher = printMunicipalWithholdingVoucher;
    window.switchFiscalInnerTab = switchFiscalInnerTab;
    window.loadFiscalBooksView = loadFiscalBooksView;
    window.downloadLibroVentasExcel = downloadLibroVentasExcel;
    window.downloadLibroComprasExcel = downloadLibroComprasExcel;
    window.printLibroVentasPDF = printLibroVentasPDF;
    window.printLibroComprasPDF = printLibroComprasPDF;
    window.openImportLibrosExcelModal = openImportLibrosExcelModal;
    window.submitImportLibrosExcel = submitImportLibrosExcel;
}

export { openWithholdingVoucherModal };
export { printWithholdingVoucher };
export { openIslrWithholdingVoucherModal };
export { printIslrWithholdingVoucher };
export { openMunicipalWithholdingVoucherModal };
export { printMunicipalWithholdingVoucher };
export { switchFiscalInnerTab };
export { loadFiscalBooksView };
export { downloadLibroVentasExcel };
export { downloadLibroComprasExcel };
export { printLibroVentasPDF };
export { printLibroComprasPDF };
export { openImportLibrosExcelModal };
export { submitImportLibrosExcel };
