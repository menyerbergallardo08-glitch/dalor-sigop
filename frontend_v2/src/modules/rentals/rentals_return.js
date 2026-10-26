/**
 * DALOR SIGO-P | Módulo: RENTALS_RETURN.JS
 * Gestión de devoluciones y retornos (totales y parciales), cálculo de prórrogas/penalizaciones
 * y liquidación financiera de días excedentes vs anticipados.
 */

var API_BASE = window.API_BASE || (window.location.origin + "/api/v1");

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

export function openReturnRentalModal(rentalId) {
    const idInput = document.getElementById("returnRentalId");
    if (idInput) idInput.value = rentalId;

    const r = (window.allRentals || []).find(item => item.id === rentalId);
    window.currentReturnRental = r || null;

    const summaryEl = document.getElementById("returnRentalSummary");
    const entityEl = document.getElementById("returnRentalEntity");
    const actualDateEl = document.getElementById("returnActualDate");
    const itemsListEl = document.getElementById("returnRentalItemsList");
    const itemsContainer = document.getElementById("returnRentalItemsContainer");

    if (actualDateEl) actualDateEl.value = new Date().toISOString().split('T')[0];

    if (r) {
        if (summaryEl) summaryEl.innerHTML = `<span style="color: #0284c7; font-weight: 800;">[${r.operation_code}]</span> ${r.equipment_name}`;
        if (entityEl) entityEl.innerText = `Destinatario / Entidad: ${r.external_entity} | ${r.destination_reference || r.project_name || 'Uso Particular'}`;

        if (r.items && r.items.length > 0) {
            if (itemsContainer) itemsContainer.style.display = "block";
            let itemsHtml = `
                <table style="width: 100%; border-collapse: collapse; font-size: 11px; border: 1px solid #e2e8f0; border-radius: 6px;">
                    <thead style="background: #f1f5f9; color: #475569; font-size: 10px; text-transform: uppercase;">
                        <tr>
                            <th style="padding: 6px 8px; text-align: left;">Recurso</th>
                            <th style="padding: 6px 8px; text-align: center;">Salida</th>
                            <th style="padding: 6px 8px; text-align: center;">Devuelto</th>
                            <th style="padding: 6px 8px; text-align: center;">Estado</th>
                            <th style="padding: 6px 8px; text-align: center;">Acción</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            r.items.forEach(it => {
                const rem = it.quantity - (it.returned_quantity || 0);
                const isTotal = it.status === 'devuelto_total' || rem <= 0.001;
                itemsHtml += `
                    <tr style="border-bottom: 1px solid #f1f5f9; background: ${isTotal ? '#f8fafc' : 'white'};">
                        <td style="padding: 6px 8px;">
                            <strong style="color: #0f172a;">${it.name}</strong>
                            ${it.code ? `<span style="font-size: 9.5px; color: #64748b; display: block;">${it.code}</span>` : ''}
                        </td>
                        <td style="padding: 6px 8px; text-align: center; font-weight: 700;">${it.quantity}</td>
                        <td style="padding: 6px 8px; text-align: center; color: #059669; font-weight: 700;">${it.returned_quantity || 0}</td>
                        <td style="padding: 6px 8px; text-align: center;">
                            <span style="font-size: 9.5px; padding: 2px 6px; border-radius: 4px; font-weight: 800; background: ${isTotal ? '#f1f5f9' : '#e0f2fe'}; color: ${isTotal ? '#64748b' : '#0369a1'};">
                                ${isTotal ? 'Devuelto 100%' : `Pend: ${rem}`}
                            </span>
                        </td>
                        <td style="padding: 6px 8px; text-align: center;">
                            ${isTotal ? '<i class="fa-solid fa-check" style="color: #10b981;"></i>' : `
                                <div style="display: flex; gap: 4px; justify-content: center; align-items: center;">
                                    <input type="number" id="ret_qty_${it.id}" value="${rem}" min="0.01" max="${rem}" step="0.01" style="width: 55px; padding: 2px 4px; font-size: 11px; border: 1px solid #cbd5e1; border-radius: 4px; text-align: center;">
                                    <button type="button" onclick="submitRentalReturnPartial(${r.id}, ${it.id})" class="btn-primary" style="padding: 3px 6px; font-size: 10px; background: #0284c7; border-radius: 4px; font-weight: 700;">Devolver</button>
                                </div>
                            `}
                        </td>
                    </tr>
                `;
            });

            itemsHtml += `</tbody></table>`;
            if (itemsListEl) itemsListEl.innerHTML = itemsHtml;
        } else {
            if (itemsContainer) itemsContainer.style.display = "none";
        }

        onRentalReturnDateChanged();
    }

    window.openModal?.('modalRentalReturn');
}

export function onRentalReturnDateChanged() {
    const r = window.currentReturnRental;
    const container = document.getElementById("returnRentalSettlementContainer");
    if (!container) return;

    if (!r || r.operation_type !== 'alquiler' || !(r.rate_usd > 0)) {
        container.style.display = "none";
        return;
    }

    const startVal = r.start_date || r.created_at;
    const expectedVal = r.expected_return_date || r.start_date || r.created_at;
    const actualVal = document.getElementById("returnActualDate")?.value;

    if (!actualVal || !startVal) {
        container.style.display = "none";
        return;
    }

    const dStart = new Date(startVal);
    const dExpected = new Date(expectedVal);
    const dActual = new Date(actualVal);

    const msPerDay = 1000 * 60 * 60 * 24;
    const dStartMid = new Date(dStart.getFullYear(), dStart.getMonth(), dStart.getDate());
    const dExpectedMid = new Date(dExpected.getFullYear(), dExpected.getMonth(), dExpected.getDate());
    const dActualMid = new Date(dActual.getFullYear(), dActual.getMonth(), dActual.getDate());

    const plannedDays = Math.max(1, Math.round((dExpectedMid - dStartMid) / msPerDay));
    const actualDays = Math.max(1, Math.round((dActualMid - dStartMid) / msPerDay));
    const diffDays = actualDays - plannedDays;

    container.style.display = "block";
    const badgeEl = document.getElementById("returnRentalDaysBadge");
    const compEl = document.getElementById("returnRentalDaysComparison");
    const earlySec = document.getElementById("returnRentalEarlySection");
    const extSec = document.getElementById("returnRentalExtensionSection");

    const rate = Number(r.rate_usd || 0);

    if (diffDays < 0) {
        // Devolución anticipada
        const earlyDays = Math.abs(diffDays);
        if (badgeEl) {
            badgeEl.className = "";
            badgeEl.style.cssText = "font-size: 11px; padding: 2px 8px; border-radius: 12px; font-weight: 700; background: #ecfdf5; color: #065f46;";
            badgeEl.innerText = `Entrega Anticipada (-${earlyDays} ${earlyDays === 1 ? 'día' : 'días'})`;
        }
        if (compEl) {
            compEl.innerHTML = `
                Pactados inicialmente: <strong>${plannedDays} días</strong> a $${rate.toFixed(2)}/día ($${(plannedDays * rate).toFixed(2)} USD).<br>
                Días reales transcurridos: <strong>${actualDays} días</strong> ($${(actualDays * rate).toFixed(2)} USD).
            `;
        }
        if (earlySec) earlySec.style.display = "block";
        if (extSec) extSec.style.display = "none";

        const earlyAmountText = document.getElementById("returnEarlyAdjustAmountText");
        if (earlyAmountText) earlyAmountText.innerText = `$${(actualDays * rate).toFixed(2)} USD`;
    } else if (diffDays > 0) {
        // Prórroga / Días adicionales
        if (badgeEl) {
            badgeEl.className = "";
            badgeEl.style.cssText = "font-size: 11px; padding: 2px 8px; border-radius: 12px; font-weight: 700; background: #fffbeb; color: #92400e;";
            badgeEl.innerText = `Prórroga (+${diffDays} ${diffDays === 1 ? 'día extra' : 'días extras'})`;
        }
        if (compEl) {
            compEl.innerHTML = `
                Pactados inicialmente: <strong>${plannedDays} días</strong>.<br>
                Retorno registrado: <strong>${actualDays} días</strong> (+${diffDays} días adicionales a regularizar en CxC/CxP).
            `;
        }
        if (earlySec) earlySec.style.display = "none";
        if (extSec) extSec.style.display = "block";

        const origRateSpan = document.getElementById("returnOrigRateSpan");
        if (origRateSpan) origRateSpan.innerText = rate.toFixed(2);

        onRentalExtensionModeChanged();
    } else {
        // Periodo exacto
        if (badgeEl) {
            badgeEl.className = "";
            badgeEl.style.cssText = "font-size: 11px; padding: 2px 8px; border-radius: 12px; font-weight: 700; background: #e0f2fe; color: #0369a1;";
            badgeEl.innerText = `Periodo Exacto (${plannedDays} días)`;
        }
        if (compEl) {
            compEl.innerHTML = `Periodo pactado de <strong>${plannedDays} días</strong> cumplido conforme sin variaciones financieras.`;
        }
        if (earlySec) earlySec.style.display = "none";
        if (extSec) extSec.style.display = "none";
    }
}

export function onRentalExtensionModeChanged() {
    const mode = document.getElementById("returnExtensionMode")?.value || "contract_rate";
    const negBox = document.getElementById("returnExtensionNegotiatedRateBox");
    const lumpBox = document.getElementById("returnExtensionLumpSumBox");

    if (negBox) negBox.style.display = (mode === "negotiated_rate") ? "block" : "none";
    if (lumpBox) lumpBox.style.display = (mode === "lump_sum") ? "block" : "none";

    updateExtensionCalculatedTotal();
}

export function updateExtensionCalculatedTotal() {
    const r = window.currentReturnRental;
    if (!r) return;

    const startVal = r.start_date || r.created_at;
    const expectedVal = r.expected_return_date || r.start_date || r.created_at;
    const actualVal = document.getElementById("returnActualDate")?.value;

    const dStart = new Date(startVal);
    const dExpected = new Date(expectedVal);
    const dActual = new Date(actualVal);
    const msPerDay = 1000 * 60 * 60 * 24;
    const dStartMid = new Date(dStart.getFullYear(), dStart.getMonth(), dStart.getDate());
    const dExpectedMid = new Date(dExpected.getFullYear(), dExpected.getMonth(), dExpected.getDate());
    const dActualMid = new Date(dActual.getFullYear(), dActual.getMonth(), dActual.getDate());

    const plannedDays = Math.max(1, Math.round((dExpectedMid - dStartMid) / msPerDay));
    const actualDays = Math.max(1, Math.round((dActualMid - dStartMid) / msPerDay));
    const extraDays = Math.max(0, actualDays - plannedDays);

    const mode = document.getElementById("returnExtensionMode")?.value || "contract_rate";
    let extraTotal = 0;
    const origRate = Number(r.rate_usd || 0);

    if (mode === "contract_rate") {
        extraTotal = extraDays * origRate;
    } else if (mode === "negotiated_rate") {
        const negRate = parseFloat(document.getElementById("returnNegotiatedRateUsd")?.value || "0") || 0;
        extraTotal = extraDays * negRate;
    } else if (mode === "lump_sum") {
        extraTotal = parseFloat(document.getElementById("returnLumpSumUsd")?.value || "0") || 0;
    } else if (mode === "waive") {
        extraTotal = 0;
    }

    const previewEl = document.getElementById("returnExtensionTotalPreview");
    if (previewEl) {
        if (mode === "waive") {
            previewEl.innerText = "$0.00 USD (Cortesía Comercial Exonerada)";
            previewEl.style.color = "#059669";
        } else {
            previewEl.innerText = `$${extraTotal.toFixed(2)} USD`;
            previewEl.style.color = "#b45309";
        }
    }
}

export async function submitRentalReturnAll(event) {
    if (event && event.preventDefault) event.preventDefault();
    const rentalId = document.getElementById("returnRentalId")?.value;
    if (!rentalId) return;

    const returnDate = document.getElementById("returnActualDate")?.value;
    const conditionStatus = document.getElementById("returnStatus")?.value || "devuelto_conforme";
    const returnNotes = document.getElementById("returnNotes")?.value || "";

    const payload = {
        return_date: returnDate ? new Date(returnDate).toISOString() : new Date().toISOString(),
        condition_status: conditionStatus,
        return_notes: returnNotes.trim() || null
    };

    const r = window.currentReturnRental;
    if (r && r.operation_type === 'alquiler' && (r.rate_usd > 0)) {
        const startVal = r.start_date || r.created_at;
        const expectedVal = r.expected_return_date || r.start_date || r.created_at;
        const actualVal = returnDate || new Date().toISOString().split('T')[0];

        const dStartMid = new Date(new Date(startVal).getFullYear(), new Date(startVal).getMonth(), new Date(startVal).getDate());
        const dExpectedMid = new Date(new Date(expectedVal).getFullYear(), new Date(expectedVal).getMonth(), new Date(expectedVal).getDate());
        const dActualMid = new Date(new Date(actualVal).getFullYear(), new Date(actualVal).getMonth(), new Date(actualVal).getDate());

        const plannedDays = Math.max(1, Math.round((dExpectedMid - dStartMid) / (1000 * 60 * 60 * 24)));
        const actualDays = Math.max(1, Math.round((dActualMid - dStartMid) / (1000 * 60 * 60 * 24)));

        if (actualDays < plannedDays) {
            const adjustCheck = document.getElementById("returnRentalAdjustDaysCheckbox")?.checked;
            if (adjustCheck) {
                payload.settlement_action = "adjust_real_days";
            }
        } else if (actualDays > plannedDays) {
            payload.settlement_action = "extension_negotiation";
            payload.extension_mode = document.getElementById("returnExtensionMode")?.value || "contract_rate";
            payload.negotiated_rate_usd = parseFloat(document.getElementById("returnNegotiatedRateUsd")?.value || "0") || null;
            payload.lump_sum_amount_usd = parseFloat(document.getElementById("returnLumpSumUsd")?.value || "0") || null;
            payload.settlement_notes = document.getElementById("returnSettlementNotes")?.value || null;
        }
    }

    try {
        const token = window.authToken || localStorage.getItem('dalor_token') || null;
        const res = await authFetch(`${API_BASE}/rentals/${rentalId}/return`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Error al registrar retorno");

        window.closeModal?.('modalRentalReturn');
        if (typeof window.loadRentalsList === 'function') await window.loadRentalsList();
        if (typeof window.refreshAllResourceViews === 'function') window.refreshAllResourceViews();
        if (typeof window.loadMaterialsList === 'function') await window.loadMaterialsList();
        if (typeof window.populateRentalResources === 'function') await window.populateRentalResources();
        alert(data.message || "Devolución completa del lote registrada exitosamente.");
    } catch (e) {
        alert("Error: " + e.message);
    }
}

export async function submitRentalReturnPartial(rentalId, subItemId) {
    const qtyInput = document.getElementById(`ret_qty_${subItemId}`);
    const qty = parseFloat(qtyInput?.value || "1");
    if (isNaN(qty) || qty <= 0) {
        alert("Por favor ingresa una cantidad válida a devolver.");
        return;
    }

    const conditionStatus = document.getElementById("returnStatus")?.value || "devuelto_conforme";
    const returnNotes = document.getElementById("returnNotes")?.value || "";

    const payload = {
        item_sub_id: subItemId,
        returned_quantity: qty,
        condition_status: conditionStatus,
        return_notes: returnNotes.trim() || null
    };

    try {
        const token = window.authToken || localStorage.getItem('dalor_token') || null;
        const res = await authFetch(`${API_BASE}/rentals/${rentalId}/return-partial`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Error al procesar retorno parcial");

        alert(data.message || "Retorno parcial registrado.");
        if (typeof window.loadRentalsList === 'function') await window.loadRentalsList();
        if (typeof window.refreshAllResourceViews === 'function') window.refreshAllResourceViews();
        if (typeof window.loadMaterialsList === 'function') await window.loadMaterialsList();
        if (typeof window.populateRentalResources === 'function') await window.populateRentalResources();
        openReturnRentalModal(rentalId);
    } catch (e) {
        alert("Error: " + e.message);
    }
}

export async function submitRentalReturn(event) {
    return submitRentalReturnAll(event);
}

// PUENTE GLOBAL WINDOW
if (typeof window !== 'undefined') {
    window.openReturnRentalModal = openReturnRentalModal;
    window.onRentalReturnDateChanged = onRentalReturnDateChanged;
    window.onRentalExtensionModeChanged = onRentalExtensionModeChanged;
    window.updateExtensionCalculatedTotal = updateExtensionCalculatedTotal;
    window.submitRentalReturnAll = submitRentalReturnAll;
    window.submitRentalReturnPartial = submitRentalReturnPartial;
    window.submitRentalReturn = submitRentalReturn;
}
