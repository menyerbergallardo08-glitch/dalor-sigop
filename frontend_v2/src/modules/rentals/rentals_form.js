/**
 * DALOR SIGO-P | Módulo: RENTALS_FORM.JS
 * Formulario de registro de alquileres/préstamos (DALOR a Tercero / Tercero a DALOR),
 * verificación de riesgo crediticio de clientes, edición y creación de órdenes.
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

export function toggleRentalOperationType() {
    const type = document.getElementById("rentalOperationType")?.value || "alquiler";
    const finGroup = document.getElementById("rentalFinancialGroup");
    const banner = document.getElementById("rentalLoanBanner");
    const rateInput = document.getElementById("rentalRateUsd");

    if (type === "prestamo") {
        if (finGroup) finGroup.style.display = "none";
        if (banner) banner.style.display = "block";
        if (rateInput) rateInput.value = "0.00";
    } else {
        if (finGroup) finGroup.style.display = "block";
        if (banner) banner.style.display = "none";
    }
}

export function toggleRentalDirectionFields() {
    const dir = document.getElementById("rentalDirection")?.value || "dalor_a_tercero";
    const dalorGroup = document.getElementById("rentalDalorAssetGroup");
    const extGroup = document.getElementById("rentalExternalEquipmentGroup");
    const lblEntity = document.getElementById("lblRentalExternalEntity");
    const lblDest = document.getElementById("lblRentalDestination");
    const destRef = document.getElementById("rentalDestinationRef");
    const projSelect = document.getElementById("rentalProjectId");

    if (dir === "dalor_a_tercero") {
        if (dalorGroup) dalorGroup.style.display = "block";
        if (extGroup) extGroup.style.display = "none";
        if (lblEntity) lblEntity.innerText = "Empresa / Cliente / Destinatario *";
        if (lblDest) lblDest.innerText = "Destino / Obra de Referencia del Cliente (Opcional)";
        if (destRef) destRef.style.display = "block";
        if (projSelect) projSelect.style.display = "none";
    } else {
        if (dalorGroup) dalorGroup.style.display = "none";
        if (extGroup) extGroup.style.display = "block";
        if (lblEntity) lblEntity.innerText = "Empresa / Proveedor Propietario *";
        if (lblDest) lblDest.innerText = "Proyecto / Obra Vinculada (Opcional)";
        if (destRef) destRef.style.display = "none";
        if (projSelect) projSelect.style.display = "block";
    }
}

export async function openCreateRentalModal(direction = 'dalor_a_tercero', operationType = 'alquiler') {
    const form = document.getElementById("formRentalLoan");
    if (form) form.reset();
    if (window.rentalCartItems) window.rentalCartItems.length = 0;
    if (typeof window.renderRentalCart === 'function') window.renderRentalCart();

    const dirSelect = document.getElementById("rentalDirection");
    if (dirSelect) dirSelect.value = direction;

    const opType = document.getElementById("rentalOperationType");
    if (opType) opType.value = operationType || "alquiler";

    const startInput = document.getElementById("rentalStartDate");
    if (startInput) startInput.value = new Date().toISOString().split('T')[0];

    const expInput = document.getElementById("rentalExpectedReturnDate");
    if (expInput) {
        const d = new Date();
        d.setDate(d.getDate() + 7);
        expInput.value = d.toISOString().split('T')[0];
    }

    // Cargar proyectos en el select
    const projSelect = document.getElementById("rentalProjectId");
    if (projSelect) {
        if (!window.allProjects || window.allProjects.length === 0) {
            try {
                const resP = await authFetch(`${API_BASE}/projects/`);
                if (resP.ok) window.allProjects = await resP.json();
            } catch(e) {}
        }
        let pOptions = `<option value="">-- Sede Central / Taller Guacara --</option>`;
        (window.allProjects || []).forEach(p => {
            pOptions += `<option value="${p.id}">[${p.code}] ${p.name}</option>`;
        });
        projSelect.innerHTML = pOptions;
    }

    const searchInput = document.getElementById("rentalResourceSearch");
    if (searchInput) searchInput.value = "";

    const dl = document.getElementById("rentalClientsDatalist");
    if (dl) {
        if (!window.allClients || window.allClients.length === 0) {
            try {
                const resC = await authFetch(`${API_BASE}/clients/`);
                if (resC.ok) window.allClients = await resC.json();
            } catch(e) {}
        }
        dl.innerHTML = (window.allClients || []).map(c => `<option value="${c.name}">${c.rif ? `[${c.rif}] ` : ''}${c.name}</option>`).join('');
    }

    if (typeof window.populateRentalResources === 'function') {
        await window.populateRentalResources();
    }
    toggleRentalOperationType();
    toggleRentalDirectionFields();

    window.openModal?.('modalRentalLoan');
}

// --- VERIFICACIÓN DE RIESGO CREDITICIO EN ALQUILERES ---
export async function checkRentalClientCreditRisk(clientId) {
    const alertBox = document.getElementById("rentalClientRiskAlert");
    const detailsBox = document.getElementById("rentalClientRiskDetails");
    if (!alertBox || !clientId) {
        if (alertBox) alertBox.style.display = "none";
        return;
    }

    try {
        const token = window.authToken || localStorage.getItem('dalor_token') || null;
        const res = await authFetch(`${API_BASE}/clients/${clientId}/credit-risk`, {
            headers: token ? { "Authorization": `Bearer ${token}` } : {}
        });
        if (!res.ok) {
            alertBox.style.display = "none";
            return;
        }

        const data = await res.json();
        if (data && data.has_risk) {
            let debtList = (data.bad_debts || []).map(b => `• <strong>${b.invoice_number || 'Doc'}</strong>: $${(b.amount_usd || 0).toFixed(2)} USD <em>(${b.reason || 'Sin motivo'})</em>`).join("<br>");
            if (detailsBox) {
                detailsBox.innerHTML = `
                    Este cliente posee antecedentes de <strong>cuenta incobrable / castigada</strong> por un total de <strong>$${(data.total_bad_debt_usd || 0).toFixed(2)} USD</strong>.<br>
                    <div style="margin-top: 4px; padding: 4px 6px; background: rgba(255,255,255,0.7); border-radius: 4px;">${debtList}</div>
                    <span style="font-size: 10px; color: #881337; margin-top: 4px; display: block;">
                        <strong>Decisión Operativa:</strong> Puede autorizar el despacho o préstamo del equipo bajo supervisión o cambiar de cliente.
                    </span>
                `;
            }
            alertBox.style.display = "block";
        } else {
            alertBox.style.display = "none";
        }
    } catch(err) {
        console.warn("Error al verificar riesgo crediticio en alquiler:", err);
        if (alertBox) alertBox.style.display = "none";
    }
}

export function confirmRentalClientRisk() {
    const alertBox = document.getElementById("rentalClientRiskAlert");
    if (alertBox) alertBox.style.display = "none";
}

export function cancelRentalClientRisk() {
    const input = document.getElementById("rentalExternalEntity");
    if (input) input.value = "";
    const alertBox = document.getElementById("rentalClientRiskAlert");
    if (alertBox) alertBox.style.display = "none";
}

export function renderRentalClientsList(clients) {
    const listEl = document.getElementById("rentalClientsPredictiveList");
    if (!listEl) return;
    if (!clients || clients.length === 0) {
        listEl.innerHTML = `<div style="padding: 10px; font-size: 11.5px; color: #94a3b8; text-align: center;">No se encontraron clientes registrados con ese nombre. Puedes ingresarlo como texto libre.</div>`;
        listEl.style.display = "block";
        return;
    }

    listEl.innerHTML = clients.map(c => {
        const safeName = (c.name || '').replace(/'/g, "\\'");
        const safeContact = (c.contact_name || '').replace(/'/g, "\\'");
        const safePhone = (c.contact_phone || c.phone || '').replace(/'/g, "\\'");
        const cId = c.id || 0;
        return `
            <div onclick="selectRentalPredictiveClient('${safeName}', '${safeContact}', '${safePhone}', ${cId})" 
                 style="padding: 8px 10px; border-bottom: 1px solid #f1f5f9; cursor: pointer; display: flex; justify-content: space-between; align-items: center; transition: background 0.15s;"
                 onmouseover="this.style.background='#f0f9ff'" onmouseout="this.style.background='white'">
                <div>
                    <div style="font-weight: 700; color: #0f172a; font-size: 12px;">${c.name}</div>
                    <div style="font-size: 10.5px; color: #64748b;">
                        ${c.rif ? `<span style="font-family: monospace; font-weight: 700; color: #0284c7;">[${c.rif}]</span> ` : ''}
                        ${c.contact_name ? `Resp: ${c.contact_name}` : ''}
                    </div>
                </div>
                <div style="font-size: 11px; font-weight: 700; color: #059669;">
                    ${c.contact_phone || c.phone || ''}
                </div>
            </div>
        `;
    }).join('');
    listEl.style.display = "block";
}

export function onRentalClientInput(val) {
    onRentalClientSelected(val);
    const query = (val || '').toLowerCase().trim();
    const clients = window.allClients || [];
    if (!query) {
        renderRentalClientsList(clients);
        return;
    }
    const filtered = clients.filter(c => 
        (c.name && c.name.toLowerCase().includes(query)) ||
        (c.rif && c.rif.toLowerCase().includes(query)) ||
        (c.contact_name && c.contact_name.toLowerCase().includes(query))
    );
    renderRentalClientsList(filtered);
}

export function toggleRentalClientsDropdown() {
    const listEl = document.getElementById("rentalClientsPredictiveList");
    if (!listEl) return;
    if (listEl.style.display === "block") {
        listEl.style.display = "none";
    } else {
        const inp = document.getElementById("rentalExternalEntity");
        onRentalClientInput(inp?.value || "");
    }
}

export function selectRentalPredictiveClient(name, contact, phone, clientId) {
    const inp = document.getElementById("rentalExternalEntity");
    const contactInput = document.getElementById("rentalContactPerson");
    const phoneInput = document.getElementById("rentalContactPhone");
    const listEl = document.getElementById("rentalClientsPredictiveList");

    if (inp) inp.value = name;
    if (contactInput) contactInput.value = contact || "";
    if (phoneInput) phoneInput.value = phone || "";
    if (listEl) listEl.style.display = "none";

    const direction = document.getElementById("rentalDirection")?.value || "dalor_a_tercero";
    if (direction === "dalor_a_tercero" && clientId) {
        checkRentalClientCreditRisk(clientId);
    }
}

export function onRentalClientSelected(val) {
    const alertBox = document.getElementById("rentalClientRiskAlert");
    if (!val) {
        if (alertBox) alertBox.style.display = "none";
        return;
    }
    const match = (window.allClients || []).find(c => c.name.toLowerCase() === val.toLowerCase().trim());
    if (match) {
        const contactInput = document.getElementById("rentalContactPerson");
        const phoneInput = document.getElementById("rentalContactPhone");
        if (contactInput && match.contact_name && !contactInput.value) contactInput.value = match.contact_name;
        if (phoneInput && (match.contact_phone || match.phone) && !phoneInput.value) phoneInput.value = match.contact_phone || match.phone;
        
        const direction = document.getElementById("rentalDirection")?.value || "dalor_a_tercero";
        if (direction === "dalor_a_tercero") {
            checkRentalClientCreditRisk(match.id);
        }
    } else {
        if (alertBox) alertBox.style.display = "none";
    }
}

export async function submitCreateRental(event) {
    if (event && event.preventDefault) event.preventDefault();

    const direction = document.getElementById("rentalDirection")?.value || "dalor_a_tercero";
    const operation_type = document.getElementById("rentalOperationType")?.value || "alquiler";
    const external_entity = document.getElementById("rentalExternalEntity")?.value || "";
    const contact_person = document.getElementById("rentalContactPerson")?.value || "";
    const contact_phone = document.getElementById("rentalContactPhone")?.value || "";
    const start_date = document.getElementById("rentalStartDate")?.value;
    const expected_return_date = document.getElementById("rentalExpectedReturnDate")?.value;
    const notes = document.getElementById("rentalNotes")?.value || "";

    if (!external_entity.trim()) {
        alert("Debes indicar la empresa, cliente o contraparte.");
        return;
    }
    if (!start_date) {
        alert("Debes indicar la fecha de inicio/entrega.");
        return;
    }

    let payload = {
        direction: direction,
        operation_type: operation_type,
        external_entity: external_entity.trim(),
        contact_person: contact_person.trim() || null,
        contact_phone: contact_phone.trim() || null,
        start_date: start_date ? new Date(start_date).toISOString() : new Date().toISOString(),
        expected_return_date: expected_return_date ? new Date(expected_return_date).toISOString() : null,
        notes: notes.trim() || null,
        rate_usd: 0.0,
        rate_period: "dia",
        imputation_mode: "total_estimado"
    };

    if (operation_type === "alquiler") {
        payload.rate_usd = parseFloat(document.getElementById("rentalRateUsd")?.value || "0") || 0.0;
        payload.rate_period = document.getElementById("rentalRatePeriod")?.value || "dia";
        payload.imputation_mode = document.getElementById("rentalImputationMode")?.value || "total_estimado";
    }

    const cart = window.rentalCartItems || [];

    if (direction === "dalor_a_tercero") {
        payload.destination_reference = (document.getElementById("rentalDestinationRef")?.value || "").trim();
        
        if (cart.length > 0) {
            payload.items = cart;
            if (cart.length === 1) {
                payload.equipment_name = cart[0].name;
                payload.equipment_code = cart[0].code;
                if (cart[0].item_type === "asset") {
                    payload.asset_id = cart[0].asset_id;
                } else if (cart[0].item_type === "material") {
                    payload.material_id = cart[0].material_id;
                    payload.material_quantity = cart[0].quantity;
                }
            } else {
                const names = cart.map(it => it.name).slice(0, 2);
                payload.equipment_name = `Lote (${cart.length} recursos): ${names.join(", ")}${cart.length > 2 ? '...' : ''}`;
            }
        } else {
            const sel = document.getElementById("rentalAssetId");
            const opt = sel?.options[sel.selectedIndex];
            if (!opt || !sel.value) {
                alert("Debes agregar al menos un recurso a la salida.");
                return;
            }
            if (opt.dataset.type === "material") {
                const mQty = parseFloat(document.getElementById("rentalMaterialQuantity")?.value || "1");
                payload.material_id = parseInt(opt.dataset.id);
                payload.material_quantity = mQty;
                payload.equipment_name = `${opt.dataset.name} (${mQty} ${opt.dataset.unit || 'UND'})`;
                payload.equipment_code = opt.dataset.code;
            } else {
                payload.asset_id = parseInt(opt.dataset.id);
                payload.equipment_name = opt.dataset.name;
                payload.equipment_code = opt.dataset.code;
            }
        }
    } else {
        const projVal = document.getElementById("rentalProjectId")?.value;
        payload.project_id = projVal ? parseInt(projVal) : null;
        payload.equipment_name = document.getElementById("rentalEquipmentName")?.value || "";
        payload.equipment_code = document.getElementById("rentalEquipmentCode")?.value || "";

        if (!payload.equipment_name.trim()) {
            alert("Debes indicar el nombre del equipo externo recibido.");
            return;
        }
    }

    try {
        const token = window.authToken || localStorage.getItem('dalor_token') || null;
        const res = await authFetch(`${API_BASE}/rentals/`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Error al registrar operación");

        window.closeModal?.('modalRentalLoan');
        if (typeof window.loadRentalsList === 'function') await window.loadRentalsList();
        refreshAllResourceViews();
        if (typeof window.loadMaterialsList === 'function') await window.loadMaterialsList();
        if (typeof window.loadProjectsList === 'function') await window.loadProjectsList();
        if (typeof window.populateRentalResources === 'function') await window.populateRentalResources();

        alert(`✅ Operación [${data.operation_code}] registrada exitosamente.`);
    } catch (e) {
        alert("Error: " + e.message);
    }
}

export function refreshAllResourceViews() {
    if (typeof window.loadToolsList === 'function') window.loadToolsList();
    if (typeof window.loadMachineryList === 'function') window.loadMachineryList();
    if (typeof window.loadFleetList === 'function') window.loadFleetList();
    if (typeof window.loadResourceDashboard === 'function') window.loadResourceDashboard();
}

export function openEditRentalModal(id) {
    const r = (window.allRentals || []).find(item => item.id === id);
    if (!r) return;
    document.getElementById("edit_rent_id").value = r.id;
    document.getElementById("edit_rent_code").innerText = r.operation_code;
    document.getElementById("edit_rent_entity").value = r.external_entity || "";
    document.getElementById("edit_rent_contact").value = r.contact_person || "";
    document.getElementById("edit_rent_phone").value = r.contact_phone || "";
    document.getElementById("edit_rent_rate").value = r.rate_usd || 0;
    document.getElementById("edit_rent_period").value = r.rate_period || "dia";
    document.getElementById("edit_rent_start").value = (r.start_date || "").split("T")[0];
    document.getElementById("edit_rent_return").value = (r.expected_return_date || "").split("T")[0];
    document.getElementById("edit_rent_dest").value = r.destination_reference || "";
    document.getElementById("edit_rent_notes").value = r.notes || "";
    if (typeof window.openModal === 'function') window.openModal('modalEditRental');
}

export async function submitEditRental(e) {
    if (e && e.preventDefault) e.preventDefault();
    const id = document.getElementById("edit_rent_id").value;
    const payload = {
        external_entity: document.getElementById("edit_rent_entity").value.trim(),
        contact_person: document.getElementById("edit_rent_contact").value.trim(),
        contact_phone: document.getElementById("edit_rent_phone").value.trim(),
        rate_usd: parseFloat(document.getElementById("edit_rent_rate").value) || 0,
        rate_period: document.getElementById("edit_rent_period").value,
        start_date: document.getElementById("edit_rent_start").value || null,
        expected_return_date: document.getElementById("edit_rent_return").value || null,
        destination_reference: document.getElementById("edit_rent_dest").value.trim(),
        notes: document.getElementById("edit_rent_notes").value.trim()
    };
    try {
        const res = await authFetch(`${API_BASE}/rentals/${id}`, {
            method: 'PUT',
            body: JSON.stringify(payload)
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({ detail: 'Error al actualizar orden' }));
            throw new Error(err.detail || 'Error al actualizar orden');
        }
        alert("✅ Orden de alquiler/préstamo actualizada con éxito.");
        if (typeof closeModal === 'function') closeModal('modalEditRental');
        if (typeof window.loadRentalsList === 'function') window.loadRentalsList();
    } catch (err) {
        alert("❌ Error: " + err.message);
    }
    return false;
}

// PUENTE GLOBAL WINDOW
if (typeof window !== 'undefined') {
    window.toggleRentalOperationType = toggleRentalOperationType;
    window.toggleRentalDirectionFields = toggleRentalDirectionFields;
    window.openCreateRentalModal = openCreateRentalModal;
    window.checkRentalClientCreditRisk = checkRentalClientCreditRisk;
    window.confirmRentalClientRisk = confirmRentalClientRisk;
    window.cancelRentalClientRisk = cancelRentalClientRisk;
    window.renderRentalClientsList = renderRentalClientsList;
    window.onRentalClientInput = onRentalClientInput;
    window.toggleRentalClientsDropdown = toggleRentalClientsDropdown;
    window.selectRentalPredictiveClient = selectRentalPredictiveClient;
    window.onRentalClientSelected = onRentalClientSelected;
    window.submitCreateRental = submitCreateRental;
    window.refreshAllResourceViews = refreshAllResourceViews;
    window.openEditRentalModal = openEditRentalModal;
    window.submitEditRental = submitEditRental;
}
