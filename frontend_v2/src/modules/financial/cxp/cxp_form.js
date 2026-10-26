// Sigop ERP - Submódulo Cuentas por Pagar (Formulario de Creación y Vista Previa Fiscal)
const API_BASE = (typeof window !== 'undefined' && window.API_BASE) || '/api/v1';

function roundFinancial(num) {
    return Math.round((num + Number.EPSILON) * 100) / 100;
}

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

let allProjects = [];
let unbilledWarehouseEntriesCache = [];

export function onCxpModalDocTypeChange() {
    const docType = document.getElementById("cxp_doc_type")?.value || 'factura';
    const rifContainer = document.getElementById("cxp_rif_container");
    const rifReq = document.getElementById("cxp_rif_req");
    const ctrlContainer = document.getElementById("cxp_control_container");
    const retContainer = document.getElementById("cxp_ret_rate_container");
    const islrContainer = document.getElementById("cxp_islr_container");
    const muniContainer = document.getElementById("cxp_municipal_container");
    const breakdownBox = document.getElementById("cxp_fiscal_breakdown");
    const invoiceLbl = document.getElementById("lbl_cxp_invoice");

    if (docType === 'nota_entrega') {
        if (invoiceLbl) invoiceLbl.textContent = "Nº Nota de Entrega / Recibo *";
        if (rifReq) rifReq.style.display = "none";
        if (ctrlContainer) ctrlContainer.style.display = "none";
        if (retContainer) retContainer.style.display = "none";
        if (islrContainer) islrContainer.style.display = "none";
        if (muniContainer) muniContainer.style.display = "none";
        if (breakdownBox) breakdownBox.style.display = "none";
    } else if (docType === 'factura_sin_retencion') {
        if (invoiceLbl) invoiceLbl.textContent = "Nº Factura Fiscal *";
        if (rifReq) rifReq.style.display = "inline";
        if (ctrlContainer) ctrlContainer.style.display = "block";
        if (retContainer) retContainer.style.display = "none";
        if (islrContainer) islrContainer.style.display = "none";
        if (muniContainer) muniContainer.style.display = "none";
        if (breakdownBox) breakdownBox.style.display = "grid";
    } else {
        if (invoiceLbl) invoiceLbl.textContent = "Nº Factura Fiscal *";
        if (rifReq) rifReq.style.display = "inline";
        if (ctrlContainer) ctrlContainer.style.display = "block";
        if (retContainer) retContainer.style.display = "block";
        if (islrContainer) islrContainer.style.display = "block";
        if (muniContainer) muniContainer.style.display = "block";
        if (breakdownBox) breakdownBox.style.display = "grid";
    }
    calcPayablePreview();
}

export function calcPayablePreview() {
    const total = parseFloat(document.getElementById("cxp_amount_usd")?.value) || 0;
    const docType = document.getElementById("cxp_doc_type")?.value || 'factura';
    const retRate = (docType === 'factura') ? (parseFloat(document.getElementById("cxp_tax_withholding_rate")?.value) || 75.0) : 0;
    const islrRate = (docType === 'factura') ? (parseFloat(document.getElementById("cxp_islr_rate")?.value) || 0.0) : 0;
    const muniRate = (docType === 'factura') ? (parseFloat(document.getElementById("cxp_municipal_rate")?.value) || 0.0) : 0;

    let base = 0, tax = 0, ret = 0, islr = 0, muni = 0, net = total;
    if (docType === 'nota_entrega') {
        base = total;
        tax = 0;
        ret = 0;
        islr = 0;
        muni = 0;
        net = total;
    } else {
        base = roundFinancial(total / 1.16);
        tax = roundFinancial(total - base);
        ret = (retRate > 0) ? roundFinancial(tax * (retRate / 100.0)) : 0;
        islr = (islrRate > 0) ? roundFinancial(base * (islrRate / 100.0)) : 0;
        muni = (muniRate > 0) ? roundFinancial(base * (muniRate / 100.0)) : 0;
        net = roundFinancial(total - ret - islr - muni);
    }

    const lblBase = document.getElementById("cxp_lbl_base");
    const lblTax = document.getElementById("cxp_lbl_tax");
    const lblRet = document.getElementById("cxp_lbl_withholding");
    const lblIslr = document.getElementById("cxp_lbl_islr");
    const lblMuni = document.getElementById("cxp_lbl_municipal");
    const lblNet = document.getElementById("cxp_lbl_net");

    const activeRate = window.EXCHANGE_RATE || (window.BCV_DATA ? window.BCV_DATA.rate : 850.0) || 850.0;
    if (lblBase) lblBase.textContent = `$${base.toFixed(2)}`;
    if (lblTax) lblTax.textContent = `$${tax.toFixed(2)}`;
    if (lblRet) lblRet.textContent = `Bs. ${(ret * activeRate).toFixed(2)}`;
    if (lblIslr) lblIslr.textContent = `Bs. ${(islr * activeRate).toFixed(2)}`;
    if (lblMuni) lblMuni.textContent = `Bs. ${(muni * activeRate).toFixed(2)}`;
    if (lblNet) lblNet.textContent = `$${net.toFixed(2)}`;
}

export async function openNewPayableModal() {
    // 1. Asegurar que los proyectos estén cargados para imputación de compras a obras
    if (!allProjects || allProjects.length === 0) {
        try {
            const resP = await authFetch(`${API_BASE}/projects/`);
            if (resP.ok) {
                allProjects = await resP.json();
                window.allProjects = allProjects;
            }
        } catch(e) {
            console.error("Error cargando proyectos para modal de CxP:", e);
        }
    }
    const safeProjects = (window.allProjects && window.allProjects.length > 0) ? window.allProjects : (allProjects || []);

    const projectSelect = document.getElementById("cxp_project_id");
    if (projectSelect) {
        let opts = `<option value="">Sede Central / Gastos Generales (Sin Imputar a Obra)</option>`;
        opts += safeProjects.map(p => `<option value="${p.id}">[${p.code}] ${p.name || ''}</option>`).join('');
        projectSelect.innerHTML = opts;
    }

    const d = new Date();
    d.setDate(d.getDate() + 15);
    const dueDateInput = document.getElementById("cxp_due_date");
    if (dueDateInput) dueDateInput.value = d.toISOString().split('T')[0];

    // Cargar conceptos dinámicos de cuentas por pagar
    if (typeof window !== "undefined" && typeof window.loadExpenseConcepts === "function") { await window.loadExpenseConcepts(); }

    // Resetear formulario y componentes de 3-Way Matching
    const ptypeSel = document.getElementById("cxp_payable_type");
    if (ptypeSel) ptypeSel.value = "costo_material_obra";

    const whModeLink = document.getElementById("cxp_wh_mode_link");
    if (whModeLink) whModeLink.checked = true;

    const tbody = document.getElementById("cxp_materials_tbody");
    if (tbody) tbody.innerHTML = "";

    const detailsEl = document.getElementById("cxp_wh_entry_details");
    if (detailsEl) detailsEl.classList.add("hidden");

    onCxpModalDocTypeChange();
    if (typeof window !== "undefined" && typeof window.onCxpPayableTypeChanged === "function") { window.onCxpPayableTypeChanged(); }
    if (typeof window !== "undefined" && typeof window.onCxpWarehouseModeChange === "function") { window.onCxpWarehouseModeChange(); }

    openModal("modalPayable");
}

export async function submitCreatePayable(e) {
    if (e && e.preventDefault) e.preventDefault();

    const submitBtn = document.getElementById("btnSubmitCreatePayable") || (e && e.target ? e.target.querySelector('button[type="submit"]') : null);

    const docType = document.getElementById("cxp_doc_type")?.value || 'factura';
    const selPayableType = document.getElementById("cxp_payable_type");
    const selectedOption = selPayableType?.options[selPayableType?.selectedIndex];
    const businessRule = selectedOption?.getAttribute('data-rule') || selPayableType?.value || 'costo_material_obra';
    const categoryId = selectedOption?.getAttribute('data-category-id') ? parseInt(selectedOption.getAttribute('data-category-id')) : null;
    const amountUsd = parseFloat(document.getElementById("cxp_amount_usd")?.value) || 0;
    const retRate = (docType === 'factura') ? (parseFloat(document.getElementById("cxp_tax_withholding_rate")?.value) || 75.0) : 0;
    
    let baseUsd = 0, taxUsd = 0, retUsd = 0;
    if (docType !== 'nota_entrega') {
        baseUsd = roundFinancial(amountUsd / 1.16);
        taxUsd = roundFinancial(amountUsd - baseUsd);
        retUsd = (retRate > 0) ? roundFinancial(taxUsd * (retRate / 100.0)) : 0;
    } else {
        baseUsd = amountUsd;
    }

    // ---------------------------------------------------------
    // VALIDACIÓN AUDITORÍA DALOR: 3-WAY MATCHING PARA MATERIALES
    // ---------------------------------------------------------
    const isMaterial = ['costo_material_obra', 'stock_almacen', 'compra_materiales'].includes(businessRule);
    let warehouseMovementId = null;
    let warehouseEntryRef = null;
    let materialItems = null;

    if (isMaterial) {
        const isLinkMode = document.getElementById("cxp_wh_mode_link")?.checked;
        if (isLinkMode) {
            const whId = document.getElementById("cxp_warehouse_entry_id")?.value;
            if (!whId) {
                alert("⚠️ Control de Auditoría Dalor (3-Way Matching):\n\nPara registrar una compra de materiales o consumibles, debe seleccionar la Entrada de Almacén correspondiente o utilizar la opción '2. Cargar Mercancía Recibida Ahora'.");
                return;
            }
            warehouseMovementId = parseInt(whId);
            const foundEntry = ((typeof window !== "undefined" && window.unbilledWarehouseEntriesCache) || unbilledWarehouseEntriesCache || []).find(x => String(x.id) === String(whId));
            warehouseEntryRef = foundEntry ? (foundEntry.reference_doc || `ENTRADA-${whId}`) : `ENTRADA-${whId}`;
        } else {
            // Modo B: Cargar Mercancía Recibida Ahora
            const rows = document.querySelectorAll("#cxp_materials_tbody tr");
            const items = [];
            rows.forEach(tr => {
                const matId = parseInt(tr.querySelector(".cxp-mat-item-id")?.value);
                const qty = parseFloat(tr.querySelector(".cxp-mat-item-qty")?.value) || 0;
                const cost = parseFloat(tr.querySelector(".cxp-mat-item-cost")?.value) || 0;
                if (matId && qty > 0) {
                    items.push({
                        material_id: matId,
                        quantity: qty,
                        unit_cost_usd: cost,
                        destination: businessRule === 'stock_almacen' ? 'Almacén Central Dalor' : 'Obra / Proyecto'
                    });
                }
            });

            if (items.length === 0) {
                alert("⚠️ Debe agregar al menos un material con cantidad válida mayor a 0 para ingresar al inventario físico.");
                return;
            }
            materialItems = items;
        }
    }

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.dataset.origText = submitBtn.dataset.origText || submitBtn.innerHTML;
        submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Registrando en CxP...`;
    }

    const payload = {
        invoice_number: document.getElementById("cxp_invoice_number")?.value?.trim() || '',
        control_number: document.getElementById("cxp_control_number")?.value?.trim() || '',
        supplier_name: document.getElementById("cxp_supplier_name")?.value?.trim() || '',
        supplier_rif: document.getElementById("cxp_supplier_rif")?.value?.trim() || '',
        doc_type: docType,
        payable_type: businessRule,
        category_id: categoryId,
        warehouse_movement_id: warehouseMovementId,
        warehouse_entry_ref: warehouseEntryRef,
        material_items: materialItems,
        project_id: document.getElementById("cxp_project_id")?.value ? parseInt(document.getElementById("cxp_project_id").value) : null,
        description: document.getElementById("cxp_description")?.value?.trim() || '',
        due_date: (document.getElementById("cxp_due_date")?.value) ? new Date(document.getElementById("cxp_due_date").value).toISOString() : null,
        amount_usd: amountUsd,
        taxable_base_usd: baseUsd,
        tax_amount_usd: taxUsd,
        tax_withholding_rate: retRate,
        tax_withholding_usd: retUsd,
        islr_rate: (docType === 'factura') ? (parseFloat(document.getElementById("cxp_islr_rate")?.value) || 0.0) : 0.0,
        islr_withholding_usd: (docType === 'factura' && parseFloat(document.getElementById("cxp_islr_rate")?.value) > 0) ? roundFinancial(baseUsd * ((parseFloat(document.getElementById("cxp_islr_rate")?.value) || 0) / 100.0)) : 0.0,
        municipal_rate: (docType === 'factura') ? (parseFloat(document.getElementById("cxp_municipal_rate")?.value) || 0.0) : 0.0,
        municipal_withholding_usd: (docType === 'factura' && parseFloat(document.getElementById("cxp_municipal_rate")?.value) > 0) ? roundFinancial(baseUsd * ((parseFloat(document.getElementById("cxp_municipal_rate")?.value) || 0) / 100.0)) : 0.0,
        is_withholding_applied: (docType === 'factura' && retRate > 0),
        exchange_rate: (typeof EXCHANGE_RATE !== 'undefined' ? EXCHANGE_RATE : 850.0),
        notes: document.getElementById("cxp_notes")?.value?.trim() || ''
    };

    try {
        const res = await authFetch(`${API_BASE}/financial/cxp`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.detail || `Error HTTP ${res.status} al registrar cuenta por pagar`);
        }

        const data = await res.json();
        closeModal("modalPayable");
        document.getElementById("payableForm")?.reset();
        
        // Asegurar que estemos en la subpestaña de CxP y recargar lista
        if (typeof switchFinancialSubtab === 'function') switchFinancialSubtab('cxp');
        if (typeof window !== "undefined" && typeof window.loadPayablesList === "function") { await window.loadPayablesList(); }

        if (data.withholding_voucher_number) {
            if (typeof showToastNotification === 'function') {
                showToastNotification(`✅ Factura registrada con éxito. Se generó el Comprobante Oficial N° ${data.withholding_voucher_number}. Abriendo...`, 'success');
            } else {
                alert(`✅ Factura registrada con éxito.\n📄 Se generó el Comprobante Oficial de Retención IVA N° ${data.withholding_voucher_number}.`);
            }
            // Abrir automáticamente el comprobante oficial de retención SENIAT para visualización e impresión
            if (typeof window !== "undefined" && typeof window.openWithholdingVoucherModal === "function") { await window.openWithholdingVoucherModal(data.id); }
        } else {
            if (typeof showToastNotification === 'function') {
                showToastNotification(`✅ Cuenta por pagar registrada exitosamente con respaldo de almacén.`, 'success');
            } else {
                alert(`✅ Cuenta por pagar registrada exitosamente con respaldo de almacén.`);
            }
        }
    } catch (err) {
        console.error("Error al registrar CxP:", err);
        alert("❌ Error al registrar Cuenta por Pagar: " + err.message);
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.dataset.submitting = "false";
            submitBtn.innerHTML = submitBtn.dataset.origText || `<i class="fa-solid fa-floppy-disk"></i> Registrar y Emitir Cuenta por Pagar`;
        }
    }
}
