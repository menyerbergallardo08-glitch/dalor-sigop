// Sigop ERP - Submódulo Cuentas por Pagar (Edición, Anulación, Bitácora y Excel)
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

let lastPayablesList = [];
let allReceivablesList = [];

export function openEditPayableModal(payableId) {
    const p = ((typeof window !== "undefined" && (window.lastPayablesList || window.allPayablesList)) || lastPayablesList || []).find(x => x.id === payableId);
    if (!p) {
        alert("Factura no encontrada.");
        return;
    }
    document.getElementById("edit_cxp_id").value = p.id;
    document.getElementById("edit_cxp_supplier_name").value = p.supplier_name || '';
    document.getElementById("edit_cxp_supplier_rif").value = p.supplier_rif && p.supplier_rif !== '-' ? p.supplier_rif : '';
    document.getElementById("edit_cxp_invoice_number").value = p.invoice_number || '';
    document.getElementById("edit_cxp_control_number").value = p.control_number && p.control_number !== '-' ? p.control_number : '';
    document.getElementById("edit_cxp_amount_usd").value = p.amount_usd || 0;
    document.getElementById("edit_cxp_tax_withholding_rate").value = String(p.tax_withholding_rate || 75);
    document.getElementById("edit_cxp_due_date").value = p.due_date || '';
    document.getElementById("edit_cxp_description").value = p.description || '';

    const rateBcv = p.exchange_rate || (window.BCV_DATA?.rate || (typeof EXCHANGE_RATE !== 'undefined' ? EXCHANGE_RATE : 850.0));
    const baseUsd = p.taxable_base_usd || (p.amount_usd ? (p.amount_usd / 1.16) : 0);
    const retUsd = p.tax_withholding_usd || 0;
    const baseBs = baseUsd * rateBcv;
    const retBs = retUsd * rateBcv;

    const rateInput = document.getElementById("edit_cxp_exchange_rate");
    const baseBsInput = document.getElementById("edit_cxp_base_bs");
    const retBsInput = document.getElementById("edit_cxp_ret_bs");
    const retUsdInput = document.getElementById("edit_cxp_ret_usd");

    if (rateInput) rateInput.value = Number(rateBcv).toFixed(2);
    if (baseBsInput) baseBsInput.value = Number(baseBs).toFixed(2);
    if (retBsInput) retBsInput.value = Number(retBs).toFixed(2);
    if (retUsdInput) retUsdInput.value = Number(retUsd).toFixed(2);

    const voucherContainer = document.getElementById("edit_cxp_voucher_container");
    const voucherInput = document.getElementById("edit_cxp_voucher_number");
    if (voucherContainer && voucherInput) {
        if (p.withholding_voucher_number || p.is_withholding_applied) {
            voucherContainer.style.display = "block";
            voucherInput.value = p.withholding_voucher_number || "";
        } else {
            voucherContainer.style.display = "none";
            voucherInput.value = "";
        }
    }

    openModal("modalEditPayable");
}

export function calcEditPayableBsPreview() {
    const rate = parseFloat(document.getElementById("edit_cxp_exchange_rate")?.value) || 850.0;
    const totalUsd = parseFloat(document.getElementById("edit_cxp_amount_usd")?.value) || 0;
    const retPct = parseFloat(document.getElementById("edit_cxp_tax_withholding_rate")?.value) || 75.0;

    const baseUsd = totalUsd > 0 ? (totalUsd / 1.16) : 0;
    const taxUsd = totalUsd - baseUsd;
    const retUsd = taxUsd * (retPct / 100.0);

    const baseBs = baseUsd * rate;
    const retBs = retUsd * rate;

    const baseBsInput = document.getElementById("edit_cxp_base_bs");
    const retBsInput = document.getElementById("edit_cxp_ret_bs");
    const retUsdInput = document.getElementById("edit_cxp_ret_usd");

    if (baseBsInput) baseBsInput.value = baseBs.toFixed(2);
    if (retBsInput) retBsInput.value = retBs.toFixed(2);
    if (retUsdInput) retUsdInput.value = retUsd.toFixed(2);
}

export function calcEditPayableFromBs() {
    const rate = parseFloat(document.getElementById("edit_cxp_exchange_rate")?.value) || 850.0;
    const baseBs = parseFloat(document.getElementById("edit_cxp_base_bs")?.value) || 0;
    const retPct = parseFloat(document.getElementById("edit_cxp_tax_withholding_rate")?.value) || 75.0;

    if (rate > 0) {
        const taxBs = baseBs * 0.16;
        const retBs = taxBs * (retPct / 100.0);
        const retUsd = retBs / rate;

        const retBsInput = document.getElementById("edit_cxp_ret_bs");
        const retUsdInput = document.getElementById("edit_cxp_ret_usd");
        if (retBsInput) retBsInput.value = retBs.toFixed(2);
        if (retUsdInput) retUsdInput.value = retUsd.toFixed(2);
    }
}

export async function submitEditPayable(e) {
    if (e && e.preventDefault) e.preventDefault();
    const id = document.getElementById("edit_cxp_id")?.value;
    if (!id) return;

    const payload = {
        supplier_name: document.getElementById("edit_cxp_supplier_name")?.value?.trim(),
        supplier_rif: document.getElementById("edit_cxp_supplier_rif")?.value?.trim() || null,
        invoice_number: document.getElementById("edit_cxp_invoice_number")?.value?.trim(),
        control_number: document.getElementById("edit_cxp_control_number")?.value?.trim() || null,
        amount_usd: parseFloat(document.getElementById("edit_cxp_amount_usd")?.value) || 0,
        tax_withholding_rate: parseFloat(document.getElementById("edit_cxp_tax_withholding_rate")?.value) || 0,
        due_date: (document.getElementById("edit_cxp_due_date")?.value) ? new Date(document.getElementById("edit_cxp_due_date").value).toISOString() : null,
        description: document.getElementById("edit_cxp_description")?.value?.trim()
    };

    const voucherVal = document.getElementById("edit_cxp_voucher_number")?.value?.trim();
    if (voucherVal) {
        payload.withholding_voucher_number = voucherVal;
    }

    const rateVal = parseFloat(document.getElementById("edit_cxp_exchange_rate")?.value);
    const retUsdVal = parseFloat(document.getElementById("edit_cxp_ret_usd")?.value);
    const baseBsVal = parseFloat(document.getElementById("edit_cxp_base_bs")?.value);

    if (!isNaN(rateVal) && rateVal > 0) payload.exchange_rate = rateVal;
    if (!isNaN(retUsdVal) && retUsdVal >= 0) payload.tax_withholding_usd = retUsdVal;
    if (!isNaN(baseBsVal) && rateVal > 0) payload.taxable_base_usd = parseFloat((baseBsVal / rateVal).toFixed(2));

    try {
        const res = await authFetch(`${API_BASE}/financial/cxp/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || "Error al modificar factura");
        }
        closeModal("modalEditPayable");
        if (typeof window !== "undefined" && typeof window.loadPayablesList === "function") { await window.loadPayablesList(); }
        alert("✅ Factura actualizada exitosamente.");
    } catch (err) {
        alert("❌ Error: " + err.message);
    }
}

export async function deletePayablePrompt(payableId) {
    const p = ((typeof window !== "undefined" && (window.lastPayablesList || window.allPayablesList)) || lastPayablesList || []).find(x => x.id === payableId);
    const inv = p ? p.invoice_number : `#${payableId}`;
    if (!confirm(`¿Está seguro de que desea anular y eliminar la factura ${inv}? Esta acción es irreversible.`)) {
        return;
    }
    try {
        const res = await authFetch(`${API_BASE}/financial/cxp/${payableId}`, {
            method: "DELETE"
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || "Error al anular la factura");
        }
        if (typeof window !== "undefined" && typeof window.loadPayablesList === "function") { await window.loadPayablesList(); }
        alert("✅ Factura anulada y eliminada con éxito.");
    } catch (err) {
        alert("❌ Error: " + err.message);
    }
}

export function openPayableHistoryModal(payableId) {
    const p = ((typeof window !== "undefined" && (window.lastPayablesList || window.allPayablesList)) || lastPayablesList || []).find(x => x.id === payableId);
    if (!p) {
        alert("No se pudo localizar el detalle de esta factura.");
        return;
    }

    const titleEl = document.getElementById("payableHistoryTitle");
    if (titleEl) {
        titleEl.innerHTML = `<i class="fa-solid fa-clock-rotate-left" style="color: #e11d48;"></i> Historial de Pagos & Retenciones &bull; Factura [${p.invoice_number}]`;
    }

    const subtitleEl = document.getElementById("payableHistorySubtitle");
    if (subtitleEl) {
        subtitleEl.textContent = `Proveedor: ${p.supplier_name} | Total: $${Number(p.amount_usd || 0).toLocaleString('en-US', {minimumFractionDigits: 2})} | Saldo Pendiente: $${Number(p.balance_usd || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}`;
    }

    const tbody = document.getElementById("payableHistoryTableBody");
    if (tbody) {
        const payments = p.payments || [];
        if (payments.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #94a3b8; padding: 16px;">No se han registrado abonos ni pagos aún para esta factura.</td></tr>`;
        } else {
            tbody.innerHTML = payments.map(pm => {
                let isRet = pm.payment_method === 'retencion_iva';
                let typeBadge = isRet 
                    ? `<span style="background: #fdf2f8; color: #be185d; font-size: 9.5px; padding: 2px 6px; border-radius: 4px; font-weight: 800;">Comprobante Retención IVA</span>`
                    : `<span style="background: #dcfce7; color: #166534; font-size: 9.5px; padding: 2px 6px; border-radius: 4px; font-weight: 800;">Pago Bancario (${(pm.bank_account || 'Banesco').replace(/_/g, ' ')})</span>`;
                return `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 8px; font-weight: 600; color: #334155;">${pm.payment_date || '-'}</td>
                    <td style="padding: 8px;">${typeBadge}</td>
                    <td style="padding: 8px; font-family: monospace; font-weight: 700; color: #0284c7;">${pm.voucher_number || '-'}</td>
                    <td style="padding: 8px; text-align: right; font-weight: 800; color: ${isRet ? '#be185d' : '#059669'};">$${Number(pm.amount_usd || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                    <td style="padding: 8px; color: #64748b; font-size: 11px;">${pm.notes || '-'}</td>
                </tr>`;
            }).join('');
        }
    }
    openModal("modalPayableHistory");
}

export function openDeclareBadDebtModal(recId, invoiceNum, clientName, balanceUsd) {
    const item = ((typeof window !== "undefined" && (window.allReceivablesList || window.lastReceivablesList)) || allReceivablesList || []).find(x => x.id === recId) || {};
    const inv = invoiceNum || item.invoice_number || 'S/F';
    const cName = clientName || item.client_name || '';
    const bal = balanceUsd !== undefined ? balanceUsd : (item.balance_usd || 0);

    const targetInput = document.getElementById("bad_debt_target_id") || document.getElementById("bad_debt_cxc_id");
    if (targetInput) targetInput.value = recId;

    const invLabel = document.getElementById("bad_debt_inv_label");
    if (invLabel) invLabel.textContent = `[${inv}] ${cName ? '- ' + cName : ''}`;

    const amountLabel = document.getElementById("bad_debt_amount_label");
    if (amountLabel) amountLabel.textContent = `$${parseFloat(bal || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})} USD`;

    const notesInput = document.getElementById("bad_debt_notes");
    if (notesInput) notesInput.value = "";

    openModal("modalDeclareBadDebt");
}

export async function submitDeclareBadDebt(e) {
    if (e && e.preventDefault) e.preventDefault();
    const targetInput = document.getElementById("bad_debt_target_id") || document.getElementById("bad_debt_cxc_id");
    const id = targetInput ? targetInput.value : null;
    const reason = document.getElementById("bad_debt_reason")?.value || "Insolvencia Prolongada";
    const notes = document.getElementById("bad_debt_notes")?.value?.trim() || "";

    if (!id) {
        alert("Error: No se identificó la cuenta por cobrar.");
        return;
    }

    try {
        const res = await authFetch(`${API_BASE}/financial/cxc/${id}/declare-bad-debt`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reason, notes })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || data.error || "Error al declarar incobrable");

        closeModal("modalDeclareBadDebt");
        if (typeof showToastNotification === 'function') {
            showToastNotification("✅ Factura declarada como Incobrable / Cartera Castigada con éxito.", "success");
        } else {
            alert("✅ Factura declarada como Incobrable / Cartera Castigada con éxito.");
        }
        await loadReceivablesList();
        if (typeof loadFinancialSummary === 'function') await loadFinancialSummary();
        if (typeof loadTreasurySummary === 'function') await loadTreasurySummary();
    } catch (err) {
        alert("Error: " + err.message);
    }
}

export async function exportCxpExcel() {
    try {
        const res = await authFetch(`${API_BASE}/financial/reports/cxp/excel`);
        if (!res.ok) throw new Error("Error al generar Excel de CxP");
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `DALOR_Cuentas_Por_Pagar_${new Date().toISOString().slice(0, 10)}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
    } catch (e) {
        alert("Error al descargar Excel de CxP: " + e.message);
    }
}
