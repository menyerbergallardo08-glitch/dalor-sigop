/**
 * DALOR SIGO-P | Módulo Especializado de Recursos
 */
var API_BASE = window.API_BASE || (window.location.origin + "/api/v1");
var allAssets = window.allAssets = window.allAssets || [];
var allPersonnel = window.allPersonnel = window.allPersonnel || [];

function authFetch(url, options = {}) {
    const t = sessionStorage.getItem('dalor_token') || localStorage.getItem('dalor_token') || window.authToken || '';
    const h = { ...(options.headers || {}) };
    if (t) h['Authorization'] = 'Bearer ' + t;
    if (options.body && !(options.body instanceof FormData) && !h['Content-Type']) {
        h['Content-Type'] = 'application/json';
    }
    if (options.body instanceof FormData) {
        delete h['Content-Type'];
    }
    return window.fetch(url, { ...options, headers: h });
}

let currentVehServicesList = [];
let currentVehServicesPage = 1;
let currentVehServicesPageSize = 5;
let currentActiveAssetServicesModal = null;

function goToVehServicesPage(page) {
    currentVehServicesPage = page;
    renderVehServicesTablePaginated();
}

function changeVehServicesPageSize(size) {
    currentVehServicesPageSize = parseInt(size) || 5;
    currentVehServicesPage = 1;
    renderVehServicesTablePaginated();
}

function renderVehServicesTablePaginated() {
    const tbody = document.getElementById("vehServicesTableBody");
    const container = document.getElementById("vehServicesPagination");
    if (!tbody) return;

    if (!currentVehServicesList || currentVehServicesList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 20px; color: #94a3b8;">No se registran servicios de taller ni cambios de aceite para este vehículo aún. Usa el botón superior para registrar uno.</td></tr>`;
        if (container) container.innerHTML = '';
        return;
    }

    const paginateFn = typeof window.renderPaginationControls === 'function' 
        ? window.renderPaginationControls 
        : (typeof renderPaginationControls === 'function' ? renderPaginationControls : () => ({ startIndex: 0, endIndex: currentVehServicesList.length }));

    const { startIndex, endIndex } = paginateFn({
        containerId: "vehServicesPagination",
        totalItems: currentVehServicesList.length,
        currentPage: currentVehServicesPage,
        pageSize: currentVehServicesPageSize,
        onPageChange: "goToVehServicesPage",
        onPageSizeChange: "changeVehServicesPageSize",
        itemLabel: "servicio(s) realizado(s)",
        pageSizeOptions: [5, 10, 20],
        allowAll: true
    });

    const pageItems = currentVehServicesList.slice(startIndex, endIndex);
    const isMach = !!currentActiveAssetServicesModal?.isMachinery;
    const unitStr = isMach ? 'Hrs' : 'Km';

    const colReadingHdr = document.getElementById("vehSrvColReading");
    if (colReadingHdr) colReadingHdr.innerText = isMach ? 'Horómetro (Hrs)' : 'Odómetro (Km)';

    tbody.innerHTML = pageItems.map(s => {
        const sType = (s.service_type || '').replace(/_/g, ' ').toUpperCase();
        const readingVal = isMach ? (s.hours_operated || s.service_odometer || 0) : (s.service_odometer || 0);
        const expBadge = s.created_expense 
            ? `<span style="font-size: 9px; padding: 1px 5px; border-radius: 3px; font-weight: 800; background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; display: inline-flex; align-items: center; gap: 3px;" title="Gasto contable registrado en Tesorería"><i class="fa-solid fa-file-invoice-dollar"></i> Gasto Vinculado</span>` 
            : `<span style="font-size: 9px; padding: 1px 5px; border-radius: 3px; font-weight: 700; background: #f1f5f9; color: #64748b; border: 1px solid #e2e8f0;" title="Registro técnico referencial (sin duplicar gasto)">Técnico Ref.</span>`;

        return `
        <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 8px; font-weight: 600; color: #475569; white-space: nowrap;">${s.service_date}</td>
            <td style="padding: 8px; font-weight: 700; color: #1e293b;">
                <div style="display: flex; flex-direction: column; gap: 3px; align-items: flex-start;">
                    <span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 800; background: #fff7ed; color: #c2410c; border: 1px solid #ffedd5;">
                        <i class="fa-solid fa-wrench"></i> ${sType}
                    </span>
                    ${expBadge}
                </div>
            </td>
            <td style="padding: 8px; text-align: right; font-weight: 800; color: var(--dalor-navy);">${Number(readingVal).toLocaleString()} ${unitStr}</td>
            <td style="padding: 8px; color: #334155; font-weight: 600;">${s.technician_workshop || 'Taller Central'}</td>
            <td style="padding: 8px; text-align: right; font-weight: 800; color: #059669;">$${Number(s.cost_usd || 0).toFixed(2)}</td>
            <td style="padding: 8px; color: #64748b; font-size: 11px;">${s.notes || '-'}</td>
            <td style="padding: 8px; text-align: center; white-space: nowrap;">
                <button type="button" onclick="openEditVehicleServiceModal(${s.id})" class="btn-secondary" style="padding: 3px 7px; font-size: 11px; color: #0284c7; border-color: #bae6fd; margin-right: 4px;" title="Editar Servicio">
                    <i class="fa-solid fa-pen"></i> Editar
                </button>
                <button type="button" onclick="deleteServiceRecord(${s.id})" class="btn-secondary" style="padding: 3px 7px; font-size: 11px; color: #ef4444; border-color: #fecaca;" title="Eliminar Registro">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        </tr>`;
    }).join('');
}

async function openVehicleServicesModal(assetId, code = null, name = null) {
    const titleEl = document.getElementById("vehServicesModalTitle");
    const subEl = document.getElementById("vehServicesModalSubtitle");
    const plateEl = document.getElementById("vehSrvPlate");
    const odoEl = document.getElementById("vehSrvOdometer");
    const countEl = document.getElementById("vehSrvCount");
    const costEl = document.getElementById("vehSrvTotalCost");
    const tbody = document.getElementById("vehServicesTableBody");
    const btnNew = document.getElementById("btnOpenNewServiceFromHistory");

    if (titleEl) titleEl.innerHTML = `<i class="fa-solid fa-wrench"></i> Historial de Servicios: [${code || '...'} ${name || ''}]`;
    if (subEl) subEl.innerText = `Cargando bitácora de mantenimientos...`;
    if (tbody) tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px; color: #64748b;"><i class="fa-solid fa-spinner fa-spin"></i> Consultando registros...</td></tr>`;

    openModal("modalVehicleServices");

    try {
        const res = await authFetch(`${API_BASE}/assets/${assetId}/services`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const a = data.asset || {};
        const services = data.services || [];
        const isMach = !!data.asset.is_machinery;

        currentActiveAssetServicesModal = {
            assetId: a.id || assetId,
            code: a.asset_code || code || '',
            name: a.name || name || '',
            isMachinery: isMach,
            currentReading: a.current_odometer || 0
        };

        if (titleEl) {
            titleEl.innerHTML = isMach
                ? `<i class="fa-solid fa-gears" style="color: #ea580c;"></i> Historial de Servicios & Horómetro: [${a.asset_code || code || ''}] ${a.name || name || ''}`
                : `<i class="fa-solid fa-wrench" style="color: #ea580c;"></i> Historial de Mantenimientos & Odómetro: [${a.asset_code || code || ''}] ${a.name || name || ''}`;
        }
        if (subEl) {
            subEl.innerText = isMach
                ? `${a.brand ? a.brand + ' ' : ''}${a.model || ''} | Serial: ${a.serial_number || '-'} | Ubicación: ${a.current_location || 'Base'}`
                : `${a.brand ? a.brand + ' ' : ''}${a.model || ''} | Placa: ${a.license_plate || '-'} | Ubicación: ${a.current_location || 'Base'}`;
        }
        if (plateEl) plateEl.innerText = isMach ? (a.serial_number || a.model || '-') : (a.license_plate || '-');
        if (odoEl) odoEl.innerText = `${Number(a.current_odometer || 0).toLocaleString()} ${isMach ? 'Horas' : 'Km'}`;
        if (countEl) countEl.innerText = `${data.services_count || 0} Realizados`;
        if (costEl) costEl.innerText = `$${Number(data.total_cost_usd || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} USD`;

        if (btnNew) {
            btnNew.onclick = () => {
                closeModal("modalVehicleServices");
                openRecordServiceModal(a.id, a.asset_code, a.name, a.current_odometer || 0, isMach);
            };
        }

        currentVehServicesList = services;
        currentVehServicesPage = 1;
        renderVehServicesTablePaginated();

        // Renderizar trazabilidad visible de auditoría reciente para este activo
        const auditTrail = data.audit_trail || [];
        const auditCountEl = document.getElementById("vehServicesAuditCount");
        const auditListEl = document.getElementById("vehServicesAuditList");
        if (auditCountEl) {
            auditCountEl.innerText = `${auditTrail.length} evento(s) auditado(s)`;
            auditCountEl.style.background = auditTrail.length > 0 ? '#fee2e2' : '#e2e8f0';
            auditCountEl.style.color = auditTrail.length > 0 ? '#991b1b' : '#334155';
        }
        if (auditListEl) {
            if (auditTrail.length === 0) {
                auditListEl.innerHTML = `<div style="padding: 6px; color: #94a3b8; font-style: italic;">Sin eventos de eliminación o modificaciones críticas registradas para este activo.</div>`;
            } else {
                auditListEl.innerHTML = auditTrail.map(at => `
                    <div style="padding: 6px 0; border-bottom: 1px dashed #e2e8f0; display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
                        <div>
                            <span style="font-weight: 800; color: #991b1b; background: #fef2f2; border: 1px solid #fecaca; padding: 1px 5px; border-radius: 3px; font-size: 9.5px; text-transform: uppercase;">
                                <i class="fa-solid fa-triangle-exclamation"></i> ${at.action}
                            </span>
                            <span style="color: #334155; margin-left: 6px; font-weight: 600;">${at.details}</span>
                        </div>
                        <div style="white-space: nowrap; text-align: right; font-size: 9.5px; color: #94a3b8;">
                            <span>${at.date}</span> &bull; <b>${at.username}</b>
                        </div>
                    </div>
                `).join('');
            }
        }

    } catch (e) {
        if (tbody) tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #e11d48; padding: 16px;">Error al cargar servicios: ${e.message}</td></tr>`;
    }
}

function toggleVehServicesAuditTrace() {
    const listEl = document.getElementById("vehServicesAuditList");
    const chevEl = document.getElementById("vehServicesAuditChevron");
    if (!listEl) return;
    const isHidden = listEl.style.display === "none";
    listEl.style.display = isHidden ? "block" : "none";
    if (chevEl) chevEl.innerHTML = isHidden ? '<i class="fa-solid fa-chevron-up"></i>' : '<i class="fa-solid fa-chevron-down"></i>';
}

function populateServiceTypeOptions(isMachinery, selectedValue = '') {
    const sel = document.getElementById("srv_type");
    if (!sel) return;

    let options = [];
    if (isMachinery) {
        options = [
            { value: "mantenimiento_preventivo_horas", label: "Mantenimiento Preventivo por Horas" },
            { value: "cambio_filtros_lubricante", label: "Cambio de Filtros Industriales y Aceite" },
            { value: "sistema_electrico_generador", label: "Sistema Eléctrico / Generador / Alternador" },
            { value: "sistema_hidraulico", label: "Sistema Hidráulico / Mangueras / Cilindros" },
            { value: "reparacion_mecanica", label: "Reparación Mecánica / Ajuste Mayor" },
            { value: "inspeccion_operativa", label: "Inspección Rutinaria / Pruebas de Carga" },
            { value: "__CUSTOM__", label: "➕ Crear Otro Tipo de Servicio..." }
        ];
    } else {
        options = [
            { value: "cambio_aceite_filtros", label: "Cambio de Aceite y Filtros (5.000 Km)" },
            { value: "mantenimiento_preventivo_mayor", label: "Mantenimiento Preventivo Mayor (Frenos / Tren / Correas)" },
            { value: "reparacion_correctiva", label: "Reparación Mecánica Correctiva" },
            { value: "cambio_cauchos_alineacion", label: "Cambio de Cauchos y Alineación" },
            { value: "sistema_electrico", label: "Sistema Eléctrico / Batería" },
            { value: "otro_servicio", label: "Otro Mantenimiento Automotriz" },
            { value: "__CUSTOM__", label: "➕ Crear Otro Tipo de Servicio..." }
        ];
    }

    const isExistingInList = options.some(o => o.value === selectedValue);
    if (selectedValue && !isExistingInList && selectedValue !== '__CUSTOM__') {
        options.unshift({ value: selectedValue, label: selectedValue.replace(/_/g, ' ').toUpperCase() });
    }

    sel.innerHTML = options.map(o => `<option value="${o.value}">${o.label}</option>`).join('');
    if (selectedValue) sel.value = selectedValue;
}

function onRecordServiceTypeChange() {
    const type = document.getElementById("srv_type")?.value;
    const customContainer = document.getElementById("srv_custom_type_container");
    const customInput = document.getElementById("srv_custom_type");

    if (type === '__CUSTOM__') {
        if (customContainer) customContainer.style.display = "block";
        if (customInput) customInput.focus();
    } else {
        if (customContainer) customContainer.style.display = "none";
    }

    const chk = document.getElementById("srv_reset_oil");
    const desc = document.getElementById("srv_reset_oil_desc");
    if (!chk) return;
    if (type === 'cambio_aceite_filtros' || type === 'mantenimiento_preventivo_mayor') {
        chk.checked = true;
        if (desc) desc.innerText = "Marcado: Este servicio incluye cambio de lubricante y reinicia el intervalo a 5.000 Km (Verde OK).";
    } else {
        chk.checked = false;
        if (desc) desc.innerText = "Desmarcado: Solo registra el trabajo en bitácora. El semáforo de aceite conserva su conteo de kilómetros.";
    }
}

function promptNewCustomServiceType() {
    const sel = document.getElementById("srv_type");
    if (sel) {
        sel.value = "__CUSTOM__";
        onRecordServiceTypeChange();
    }
}

function openRecordServiceModal(assetId, code, name, currentReading, isMachinery = false) {
    const idEl = document.getElementById("srv_asset_id");
    const editIdEl = document.getElementById("srv_edit_service_id");
    const isMachEl = document.getElementById("srv_asset_is_machinery");
    const labelEl = document.getElementById("srv_veh_label");
    const odoEl = document.getElementById("srv_odometer");
    const readingLabel = document.getElementById("srv_reading_label");
    const oilContainer = document.getElementById("srv_reset_oil_container");
    const costEl = document.getElementById("srv_cost");
    const notesEl = document.getElementById("srv_notes");
    const dateEl = document.getElementById("srv_service_date");
    const chkExpense = document.getElementById("srv_create_expense");
    const titleEl = document.getElementById("modalRecordServiceTitle");
    const btnText = document.getElementById("btnSubmitRecordServiceText");

    if (idEl) idEl.value = assetId;
    if (editIdEl) editIdEl.value = "";
    if (isMachEl) isMachEl.value = isMachinery ? "1" : "0";
    if (labelEl) labelEl.innerText = `[${code || 'AST'}] ${name || 'Activo'}`;
    if (odoEl) odoEl.value = currentReading || 0;
    if (readingLabel) readingLabel.innerText = isMachinery ? "Horómetro al momento del Servicio (Horas de Uso) *" : "Odómetro al momento del Servicio (Km) *";
    if (oilContainer) oilContainer.style.display = isMachinery ? "none" : "block";
    if (costEl) costEl.value = "0.00";
    if (notesEl) notesEl.value = "";
    if (chkExpense) chkExpense.checked = false;

    if (dateEl) {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        dateEl.value = `${year}-${month}-${day}T${hours}:${minutes}`;
    }

    if (titleEl) titleEl.innerHTML = `<i class="fa-solid fa-wrench"></i> <span>Registrar Mantenimiento / Servicio</span>`;
    if (btnText) btnText.innerText = "Guardar en Bitácora";

    populateServiceTypeOptions(isMachinery);
    onRecordServiceTypeChange();

    openModal("modalRecordService");
}

function openEditVehicleServiceModal(serviceId) {
    const s = (currentVehServicesList || []).find(item => item.id === serviceId);
    if (!s) return alert("No se encontró la información del servicio.");

    const isMach = !!currentActiveAssetServicesModal?.isMachinery;
    const assetId = currentActiveAssetServicesModal?.assetId;
    const code = currentActiveAssetServicesModal?.code;
    const name = currentActiveAssetServicesModal?.name;

    const idEl = document.getElementById("srv_asset_id");
    const editIdEl = document.getElementById("srv_edit_service_id");
    const isMachEl = document.getElementById("srv_asset_is_machinery");
    const labelEl = document.getElementById("srv_veh_label");
    const odoEl = document.getElementById("srv_odometer");
    const readingLabel = document.getElementById("srv_reading_label");
    const oilContainer = document.getElementById("srv_reset_oil_container");
    const costEl = document.getElementById("srv_cost");
    const notesEl = document.getElementById("srv_notes");
    const dateEl = document.getElementById("srv_service_date");
    const chkExpense = document.getElementById("srv_create_expense");
    const titleEl = document.getElementById("modalRecordServiceTitle");
    const btnText = document.getElementById("btnSubmitRecordServiceText");

    if (idEl) idEl.value = assetId;
    if (editIdEl) editIdEl.value = serviceId;
    if (isMachEl) isMachEl.value = isMach ? "1" : "0";
    if (labelEl) labelEl.innerText = `[${code || 'AST'}] ${name || 'Activo'}`;
    if (odoEl) odoEl.value = isMach ? (s.hours_operated || s.service_odometer || 0) : (s.service_odometer || 0);
    if (readingLabel) readingLabel.innerText = isMach ? "Horómetro al momento del Servicio (Horas de Uso) *" : "Odómetro al momento del Servicio (Km) *";
    if (oilContainer) oilContainer.style.display = isMach ? "none" : "block";
    if (costEl) costEl.value = (s.cost_usd || 0).toFixed(2);
    if (notesEl) notesEl.value = s.notes || "";
    if (chkExpense) chkExpense.checked = !!s.created_expense;

    if (dateEl && s.service_date_raw) {
        try {
            dateEl.value = s.service_date_raw.substring(0, 16);
        } catch (_) {}
    }

    if (titleEl) titleEl.innerHTML = `<i class="fa-solid fa-pen-to-square"></i> <span>Editar Mantenimiento / Servicio #${serviceId}</span>`;
    if (btnText) btnText.innerText = "Guardar Cambios del Servicio";

    populateServiceTypeOptions(isMach, s.service_type);
    onRecordServiceTypeChange();

    closeModal("modalVehicleServices");
    openModal("modalRecordService");
}

async function submitRecordService(event) {
    if (event && event.preventDefault) event.preventDefault();

    const assetId = document.getElementById("srv_asset_id")?.value;
    const editServiceId = document.getElementById("srv_edit_service_id")?.value;
    const isMach = document.getElementById("srv_asset_is_machinery")?.value === "1";
    const resetOilEl = document.getElementById("srv_reset_oil");
    const chkExpense = document.getElementById("srv_create_expense");
    const dateEl = document.getElementById("srv_service_date");

    let sType = document.getElementById("srv_type")?.value || "mantenimiento_preventivo";
    if (sType === '__CUSTOM__') {
        const customVal = document.getElementById("srv_custom_type")?.value?.trim();
        if (!customVal) {
            alert("Por favor ingresa el nombre del nuevo tipo de servicio.");
            return;
        }
        sType = customVal;
    }

    const readingVal = parseFloat(document.getElementById("srv_odometer")?.value) || 0.0;
    const costVal = parseFloat(document.getElementById("srv_cost")?.value) || 0.0;
    const notesVal = document.getElementById("srv_notes")?.value || "";

    const btn = document.getElementById("btnSubmitRecordService");
    if (btn) btn.disabled = true;

    try {
        let parsedDate = undefined;
        if (dateEl && dateEl.value) {
            try {
                const dt = new Date(dateEl.value);
                if (!isNaN(dt.getTime())) parsedDate = dt.toISOString();
            } catch(e) {}
        }

        if (editServiceId) {
            // Edición de servicio existente
            const payload = {
                service_type: sType,
                service_odometer: readingVal,
                hours_operated: readingVal,
                cost_usd: costVal,
                notes: notesVal,
                create_expense: chkExpense ? chkExpense.checked : false,
                service_date: parsedDate
            };

            const res = await authFetch(`${API_BASE}/assets/services/${editServiceId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || JSON.stringify(err));
            }

            const data = await res.json();
            alert(`✅ ${data.message || "Servicio actualizado exitosamente."}`);
        } else {
            let parsedDate = undefined;
            if (dateEl && dateEl.value) {
                try {
                    const dt = new Date(dateEl.value);
                    if (!isNaN(dt.getTime())) parsedDate = dt.toISOString();
                } catch(e) {}
            }

            // Creación de nuevo servicio
            const payload = {
                new_odometer: readingVal,
                hours_operated: readingVal,
                service_type: sType,
                cost_usd: costVal,
                notes: notesVal,
                reset_oil_interval: (!isMach && resetOilEl) ? resetOilEl.checked : false,
                create_expense: chkExpense ? chkExpense.checked : false,
                service_date: parsedDate
            };

            const res = await authFetch(`${API_BASE}/assets/${assetId}/record-service`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || JSON.stringify(err));
            }

            const data = await res.json();
            alert(`✅ ${data.message || "Servicio registrado exitosamente."}`);
        }

        closeModal("modalRecordService");
        if (typeof loadFleetList === 'function') loadFleetList();
        if (typeof loadMachineryList === 'function') loadMachineryList();
        if (typeof loadResourceDashboard === 'function') loadResourceDashboard();

    } catch (e) {
        console.error("Error saving service:", e);
        alert("Error al guardar servicio: " + e.message);
    } finally {
        if (btn) btn.disabled = false;
    }
}

function deleteServiceRecord(serviceId) {
    const target = (currentVehServicesList || []).find(s => s.id === serviceId);
    const typeLabel = target ? (target.service_type || '').replace(/_/g, ' ').toUpperCase() : 'Mantenimiento';
    const costLabel = target ? `$${Number(target.cost_usd || 0).toFixed(2)} USD` : '';

    openAdminAuthModal(
        'delete_service',
        serviceId,
        `¿Confirmas la eliminación del servicio #${serviceId} (${typeLabel} - ${costLabel})? Esta acción requiere obligatoriamente tu contraseña de Administrador / Director General y registrará una traza permanente en la bitácora de auditoría.`
    );
}

function openAdminAuthModal(actionType, targetId, message) {
    const modal = document.getElementById("modalAdminAuth");
    if (!modal) {
        const reason = prompt("Indica el motivo de la operación (Requerido para auditoría):");
        if (!reason) return;
        const pwd = prompt("🔒 AUTORIZACIÓN: Ingrese la contraseña de Administrador / Director:");
        if (!pwd) return;
        executeAdminAuthDirect(actionType, targetId, pwd, reason);
        return;
    }

    const typeEl = document.getElementById("adminAuthActionType");
    const targetEl = document.getElementById("adminAuthTargetId");
    const msgEl = document.getElementById("adminAuthMessage");
    const reasonEl = document.getElementById("adminAuthReason");
    const pwdEl = document.getElementById("adminAuthPassword");

    if (typeEl) typeEl.value = actionType;
    if (targetEl) targetEl.value = targetId;
    if (msgEl) msgEl.innerText = message || "Esta acción es restringida y requiere clave de Administrador.";
    if (reasonEl) reasonEl.value = "";
    if (pwdEl) pwdEl.value = "";

    openModal("modalAdminAuth");
    setTimeout(() => { if (pwdEl) pwdEl.focus(); }, 100);
}

async function submitAdminAuth(event) {
    if (event && event.preventDefault) event.preventDefault();

    const actionType = document.getElementById("adminAuthActionType")?.value;
    const targetId = document.getElementById("adminAuthTargetId")?.value;
    const reason = document.getElementById("adminAuthReason")?.value?.trim();
    const password = document.getElementById("adminAuthPassword")?.value?.trim();

    if (!password) {
        alert("Por favor ingresa la contraseña de Administrador / Director.");
        return;
    }
    if (!reason) {
        alert("Por favor ingresa un motivo o justificación para la auditoría.");
        return;
    }

    const btn = document.getElementById("btnConfirmAdminAuth");
    if (btn) btn.disabled = true;

    try {
        await executeAdminAuthDirect(actionType, targetId, password, reason);
        closeModal("modalAdminAuth");
    } catch (e) {
        alert("❌ " + e.message);
    } finally {
        if (btn) btn.disabled = false;
    }
}

async function executeAdminAuthDirect(actionType, targetId, password, reason) {
    if (actionType === 'delete_service') {
        const res = await authFetch(`${API_BASE}/assets/services/${targetId}/delete`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ admin_password: password, reason: reason })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Error al eliminar servicio");

        alert(`✅ ${data.message || 'Servicio eliminado.'}\n\nAuditoría: ${data.audit_details || 'Registrado'}`);
        const assetId = currentActiveAssetServicesModal?.assetId;
        if (assetId) {
            await openVehicleServicesModal(assetId);
            if (typeof loadFleetList === 'function') loadFleetList();
            if (typeof loadMachineryList === 'function') loadMachineryList();
        }
    } else if (actionType === 'delete_project') {
        const res = await authFetch(`${API_BASE}/projects/${targetId}/delete`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ admin_password: password, reason: reason })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Error al inactivar proyecto");

        alert(`✅ ${data.message || 'Proyecto inactivado exitosamente.'}`);
        if (typeof window.loadInitialMasterData === 'function') await window.loadInitialMasterData();
        if (typeof window.loadProjectsList === 'function') window.loadProjectsList();
    }
}



// ----------------------------------------------------

// 📸 CAPTURA & OCR DE ODÓMETRO VEHICULAR

// ----------------------------------------------------



// --- VINCULACIÓN CON WINDOW Y SCOPE GLOBAL ---
if (typeof window !== 'undefined') {
    window.goToVehServicesPage = goToVehServicesPage;
    window.changeVehServicesPageSize = changeVehServicesPageSize;
    window.renderVehServicesTablePaginated = renderVehServicesTablePaginated;
    window.openVehicleServicesModal = openVehicleServicesModal;
    window.toggleVehServicesAuditTrace = toggleVehServicesAuditTrace;
    window.populateServiceTypeOptions = populateServiceTypeOptions;
    window.onRecordServiceTypeChange = onRecordServiceTypeChange;
    window.promptNewCustomServiceType = promptNewCustomServiceType;
    window.openRecordServiceModal = openRecordServiceModal;
    window.openEditVehicleServiceModal = openEditVehicleServiceModal;
    window.submitRecordService = submitRecordService;
    window.deleteServiceRecord = deleteServiceRecord;
    window.openAdminAuthModal = openAdminAuthModal;
    window.submitAdminAuth = submitAdminAuth;
    window.executeAdminAuthDirect = executeAdminAuthDirect;
}
