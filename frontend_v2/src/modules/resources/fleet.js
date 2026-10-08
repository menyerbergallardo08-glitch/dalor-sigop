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

async function loadFleetList() {
    const tbody = document.getElementById("fleetTableBody");
    if (!tbody) return;

    // Si ya tenemos datos en memoria de una visita previa, renderizar de inmediato (0ms de espera)
    if (Array.isArray(window.rawFleetList) && window.rawFleetList.length > 0) {
        rawFleetList = window.rawFleetList;
        filterFleetList();
    } else {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; padding: 20px; color: #94a3b8;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando flota...</td></tr>`;
    }

    try {
        const token = window.authToken || localStorage.getItem('dalor_token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        const res = await authFetch(`${API_BASE}/assets/fleet-summary`, { headers });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const fleet = await res.json();
        
        if (!Array.isArray(fleet)) {
            tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; padding: 20px; color: #94a3b8;">No se pudo procesar la respuesta de la flota.</td></tr>`;
            return;
        }

        rawFleetList = fleet.filter(a => a && (
            (a.asset_type === 'vehiculo' || 
             a.asset_type === 'camioneta' || 
             (typeof a.asset_code === 'string' && (a.asset_code.includes('-V-') || a.asset_code.startsWith('FLT-'))) ||
             (typeof a.category === 'string' && a.category.toLowerCase().includes('flota')))
            && !((a.name || '').toLowerCase().includes('montacarga') || a.asset_code === '3-V-1-05')
        ));
        window.rawFleetList = rawFleetList;

        filterFleetList();

    } catch (e) {
        console.error("[FLEET ERROR]", e);
        const tbody = document.getElementById("fleetTableBody");
        if (tbody) tbody.innerHTML = `<tr><td colspan="11" style="text-align: center; color: #e11d48;">Error al cargar flota: ${e?.message || e}</td></tr>`;
    }
}

let rawFleetList = [];

function filterFleetList() {
    const q = (document.getElementById("fleetSearchInput")?.value || '').trim().toLowerCase();
    const status = document.getElementById("fleetStatusFilter")?.value || 'all';
    const maint = document.getElementById("fleetMaintFilter")?.value || 'all';
    const tbody = document.getElementById("fleetTableBody");
    const countBadge = document.getElementById("fleetCountBadge");

    let filtered = (rawFleetList || []).filter(v => {
        const safeCode = (v?.asset_code || '').toLowerCase();
        const safeName = (v?.name || '').toLowerCase();
        const safeBrand = (v?.brand || '').toLowerCase();
        const safePlate = (v?.license_plate || '').toLowerCase();
        const matchText = !q || safeCode.includes(q) || safeName.includes(q) || safeBrand.includes(q) || safePlate.includes(q);

        const inBase = (v?.status === 'disponible_base' || v?.status === 'disponible') && !v?.current_project_id && (!v?.custodian || v.custodian.toLowerCase().includes('base') || v.custodian === '-');
        let matchStatus = true;
        if (status === 'en_obra') matchStatus = !inBase;
        if (status === 'disponible_base') matchStatus = inBase;

        let matchMaint = true;
        if (maint !== 'all') matchMaint = String(v?.traffic_light || '') === maint;

        return matchText && matchStatus && matchMaint;
    });

    if (countBadge) countBadge.innerText = `${filtered.length} de ${rawFleetList.length} vehículos`;

    if (!tbody) return;

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="11" style="text-align: center; padding: 20px; color: #94a3b8;">No hay vehículos que coincidan con la búsqueda o filtros aplicados.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(v => {
        if (!v) return '';
        let semColor = '#166534';
        let semBg = '#dcfce7';
        const light = String(v?.traffic_light ?? 'VERDE_OK');
        if (light === 'ROJO_VENCIDO') {
            semColor = '#991b1b';
            semBg = '#fee2e2';
        } else if (light === 'AMARILLO_PROXIMO') {
            semColor = '#92400e';
            semBg = '#fef3c7';
        }

        const inBase = (v?.status === 'disponible_base' || v?.status === 'disponible') && !v?.current_project_id && (!v?.custodian || v.custodian.toLowerCase().includes('base') || v.custodian === '-');
        const curOdo = Number(v?.current_odometer ?? 0);
        const remKm = Number(v?.remaining_km_to_service ?? 0);
        const plateStr = v?.license_plate || '-';
        const locStr = inBase 
            ? (v?.current_location || 'Sede Central Dalor (Guacara)')
            : (v?.current_location || (v?.current_project_id ? 'En Operación / Obra' : 'Sede Central (Uso Administrativo / Logística)'));
        const custStr = inBase 
            ? 'Disponible en Base'
            : (v?.custodian && !v.custodian.toLowerCase().includes('base') ? v.custodian : (v?.current_custodian_name || (v?.current_project_id ? 'Equipo de Obra' : 'Asignado a Custodio')));
        const vName = v?.name || 'Vehículo';
        const safeName = String(vName).replace(/'/g, "\\'").replace(/"/g, "&quot;");
        const safeCode = v?.asset_code || 'FLT';
        const vId = v?.id ?? 0;
        const vBrand = v?.brand ? `(${v.brand})` : '';
        const srvCount = v?.services_count ?? 0;

        let badgeText = 'DISPONIBLE EN BASE';
        let badgeBg = '#dcfce7';
        let badgeColor = '#166534';
        let badgeIcon = 'fa-warehouse';

        if (!inBase) {
            if (v?.current_project_id) {
                badgeText = 'EN OPERACIÓN / OBRA';
                badgeBg = '#e0f2fe';
                badgeColor = '#0369a1';
                badgeIcon = 'fa-truck-front';
            } else {
                badgeText = 'EN OPERACIÓN / ASIGNADO A CUSTODIO';
                badgeBg = '#fef3c7';
                badgeColor = '#92400e';
                badgeIcon = 'fa-user-shield';
            }
        }

        return `
        <tr>
            <td style="font-weight: 800; color: var(--dalor-blue); font-family: monospace;">${safeCode}</td>
            <td style="font-weight: 700; color: var(--dalor-navy);">${vName} ${vBrand}</td>
            <td style="font-weight: 800; font-family: monospace;">${plateStr}</td>
            <td style="font-weight: 800;">${curOdo.toLocaleString()} Km</td>
            <td>En ${remKm.toLocaleString()} Km</td>
            <td>
                <span style="font-size: 10px; padding: 2px 8px; border-radius: 9999px; font-weight: 800; background: ${semBg}; color: ${semColor};">
                    ${light.replace(/_/g, ' ')}
                </span>
            </td>
            <td style="text-align: center;">
                <button onclick="openVehicleServicesModal(${vId}, '${safeCode}', '${safeName}')" class="btn-secondary" style="padding: 3px 8px; border-radius: 9999px; font-weight: 800; font-size: 11px; background: #ffedd5; color: #c2410c; border: 1px solid #fed7aa; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;" title="Ver bitácora de mantenimientos y servicios de esta unidad">
                    <i class="fa-solid fa-wrench"></i> ${srvCount} Servicios
                </button>
            </td>
            <td>
                <span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 800; background: ${badgeBg}; color: ${badgeColor};">
                    <i class="fa-solid ${badgeIcon}"></i> ${badgeText}
                </span>
            </td>
            <td>${locStr}</td>
            <td>${custStr}</td>
            <td style="text-align: center; white-space: nowrap;">
                <button onclick="openAssetHistoryModal(${vId}, '${safeCode}', '${safeName}')" class="btn-primary" style="padding: 3px 8px; font-size: 11px; margin-right: 4px; background: #2563eb;" title="Ver Bitácora Integral y Trazabilidad">
                    <i class="fa-solid fa-clock-rotate-left"></i> Bitácora
                </button>
                <button onclick="openOdometerOcrModal(${vId}, '${safeCode}', '${safeName}', '${plateStr}', ${curOdo})" class="btn-primary" style="padding: 3px 6px; font-size: 11px; margin-right: 4px; background: #0284c7; box-shadow: 0 1px 3px rgba(2, 132, 199, 0.4);" title="Capturar Odómetro por Foto (OCR)">
                    <i class="fa-solid fa-camera"></i> Odómetro
                </button>
                <button onclick="openCalibrateOdometerModal(${vId}, '${safeCode}', '${safeName}', ${curOdo})" class="btn-secondary" style="padding: 3px 6px; font-size: 11px; margin-right: 4px; color: #7c3aed; border-color: #c4b5fd;" title="Calibrar / Resetear Odómetro con Clave de Director">
                    <i class="fa-solid fa-key"></i> Calibrar
                </button>
                ${inBase ? `
                    <button onclick="openAssignModal('asset', ${vId}, '${safeName}', 'assign')" class="btn-primary" style="padding: 3px 8px; font-size: 11px;">
                        Asignar
                    </button>
                ` : `
                    <button onclick="openAssignModal('asset', ${vId}, '${safeName}', 'transfer')" class="btn-secondary" style="padding: 3px 6px; font-size: 11px;" title="Transferir a otra obra o sede">
                        <i class="fa-solid fa-arrows-split-up-and-left"></i>
                    </button>
                    ${v.current_project_id ? `
                    <button onclick="openSubstituteResourceModal('asset', ${vId}, '${safeName}', ${v.current_project_id})" class="btn-secondary" style="padding: 3px 6px; font-size: 11px; margin-left: 4px; color: #2563eb; border-color: #bfdbfe;" title="Sustituir en Obra por otra unidad disponible">
                        <i class="fa-solid fa-arrows-rotate"></i>
                    </button>
                    ` : ''}
                    <button onclick="returnResourceToBase('asset', ${vId})" class="btn-primary" style="padding: 3px 8px; font-size: 11px; margin-left: 4px; background: #059669;" title="Devolver a Sede Central">
                        <i class="fa-solid fa-warehouse"></i> Devolver
                    </button>
                `}
                <button onclick="openEditAssetModal(${vId})" class="btn-secondary" style="padding: 3px 6px; font-size: 11px; margin-left: 4px; color: #0284c7; border-color: #bae6fd;" title="Editar Activo / Vehículo">
                    <i class="fa-solid fa-pen"></i>
                </button>
                <button onclick="deleteAssetItem(${vId})" class="btn-secondary" style="padding: 3px 6px; color: #ef4444; margin-left: 4px;" title="Inactivar Vehículo">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        </tr>`;
    }).join('');
}

let currentVehServicesList = [];
let currentVehServicesPage = 1;
let currentVehServicesPageSize = 5;


function openOdometerOcrModal(assetId, code, name, plate, currentKm) {

    document.getElementById("odoAssetIdHidden").value = assetId;

    document.getElementById("odoImageUrlHidden").value = "";

    document.getElementById("odoVehicleSubtitle").innerText = `[${code}] ${name} - Placa: ${plate || 'N/A'}`;

    document.getElementById("odoCurrentKmDisplay").innerText = `${(currentKm || 0).toLocaleString()} Km`;

    

    // Resetear preview y resultados

    const previewBox = document.getElementById("odoPreviewBox");

    const resultBox = document.getElementById("odoResultBox");

    const btnConfirm = document.getElementById("btnConfirmOdometer");

    const fileInput = document.getElementById("odometerFileInput");

    

    if (previewBox) previewBox.style.display = "none";

    if (resultBox) resultBox.style.display = "none";

    if (btnConfirm) btnConfirm.style.display = "none";

    if (fileInput) fileInput.value = "";



    openModal("modalOdometerOcr");

}



async function handleOdometerImageSelected(event) {

    const file = event.target.files[0];

    if (!file) return;



    const previewBox = document.getElementById("odoPreviewBox");

    const previewImg = document.getElementById("odoPreviewImg");

    const scanningOverlay = document.getElementById("odoScanningOverlay");

    const resultBox = document.getElementById("odoResultBox");

    const btnConfirm = document.getElementById("btnConfirmOdometer");

    const detectedInput = document.getElementById("odoDetectedInput");

    const confidenceBadge = document.getElementById("odoConfidenceBadge");

    const notesEl = document.getElementById("odoDetectedNotes");

    const assetId = document.getElementById("odoAssetIdHidden").value;



    // Mostrar preview local

    const reader = new FileReader();

    reader.onload = function(e) {

        previewImg.src = e.target.result;

        previewBox.style.display = "block";

        scanningOverlay.style.display = "flex";

    };

    reader.readAsDataURL(file);



    resultBox.style.display = "none";

    btnConfirm.style.display = "none";



    // Enviar al backend para OCR

    try {

        const formData = new FormData();

        formData.append("file", file);

        if (assetId) formData.append("asset_id", assetId);



        const res = await authFetch(`${API_BASE}/ocr/scan-odometer`, {

            method: "POST",

            body: formData

        });



        if (!res.ok) throw new Error("Error en servidor OCR");



        const data = await res.json();

        scanningOverlay.style.display = "none";



        const odoVal = data.detected_odometer || 0;

        document.getElementById("odoImageUrlHidden").value = data.image_url || "";

        

        detectedInput.value = odoVal > 0 ? odoVal : "";

        confidenceBadge.innerText = data.is_ai_vision ? `IA Visión (${Math.round((data.confidence || 0.95)*100)}%)` : "Lectura OCR";

        notesEl.innerText = data.notes || "Verifica la lectura antes de confirmar.";



        resultBox.style.display = "block";

        btnConfirm.style.display = "inline-flex";



        if (odoVal > 0) {

            showRealtimeToast(`Odómetro leído: ${odoVal.toLocaleString()} Km`, 'ocr_flota', 'info');

        }

    } catch (err) {

        console.error("Error analizando odómetro:", err);

        scanningOverlay.style.display = "none";

        resultBox.style.display = "block";

        detectedInput.value = "";

        confidenceBadge.innerText = "Modo Manual";

        notesEl.innerText = "No se pudo leer automáticamente el tablero. Ingresa el kilometraje a mano.";

        btnConfirm.style.display = "inline-flex";

    }

}



async function submitConfirmOdometer(event) {

    event.preventDefault();

    const assetId = document.getElementById("odoAssetIdHidden").value;

    const reading = parseFloat(document.getElementById("odoDetectedInput").value);

    const photoUrl = document.getElementById("odoImageUrlHidden").value;



    if (isNaN(reading) || reading <= 0) {

        alert("Por favor ingresa un kilometraje válido mayor a 0.");

        return;

    }



    try {

        const res = await authFetch(`${API_BASE}/assets/${assetId}/record-odometer`, {

            method: "POST",

            headers: { "Content-Type": "application/json" },

            body: JSON.stringify({

                odometer_reading: reading,

                photo_url: photoUrl,

                reported_by: (currentUser && currentUser.full_name) ? currentUser.full_name : "Supervisor de Campo"

            })

        });



        if (!res.ok) throw new Error("Error al guardar odómetro");



        const data = await res.json();

        closeModal("modalOdometerOcr");
        showRealtimeToast(`✅ Odómetro registrado: ${reading.toLocaleString()} Km (${data.traffic_light.replace('_', ' ')})`, 'flota', 'success');
        await loadFleetList();
    } catch (err) {
        alert("Error al guardar odómetro: " + err.message);
    }
}


function openCalibrateOdometerModal(assetId, code, name, currentKm) {
    let modal = document.getElementById("modalCalibrateOdometer");
    if (!modal) {
        const div = document.createElement("div");
        div.id = "modalCalibrateOdometer";
        div.className = "modal-overlay hidden";
        div.innerHTML = `
        <div class="modal-card" style="max-width: 460px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <h3 style="font-size: 16px; font-weight: 800; color: #7c3aed; display: flex; align-items: center; gap: 8px;">
                    <i class="fa-solid fa-key"></i> Calibrar / Resetear Odómetro
                </h3>
                <button onclick="closeModal('modalCalibrateOdometer')" style="background: none; border: none; font-size: 18px; color: #64748b; cursor: pointer;">&times;</button>
            </div>
            <p style="font-size: 12px; color: #64748b; margin-bottom: 12px;">
                Esta función permite a la Dirección General calibrar o resetear a cero el odómetro base del vehículo mediante autorización criptográfica.
            </p>
            <form id="formCalibrateOdometer" onsubmit="submitCalibrateOdometer(event)">
                <input type="hidden" id="calib_asset_id">
                <div class="form-group" style="margin-bottom: 12px;">
                    <label style="font-size: 12px; font-weight: 700; color: #334155;">Vehículo Seleccionado:</label>
                    <div id="calib_veh_label" style="font-weight: 800; color: var(--dalor-navy); font-size: 13px; padding: 8px; background: #f1f5f9; border-radius: 6px;"></div>
                </div>
                <div class="form-group" style="margin-bottom: 12px;">
                    <label style="font-size: 12px; font-weight: 700; color: #334155;">Nuevo Odómetro Actual (Km) *</label>
                    <input type="number" step="1" id="calib_new_odometer" class="form-control" required placeholder="0">
                </div>
                <div class="form-group" style="margin-bottom: 12px;">
                    <label style="font-size: 12px; font-weight: 700; color: #334155;">Odómetro de Último Servicio (Km) *</label>
                    <input type="number" step="1" id="calib_service_odometer" class="form-control" required placeholder="0">
                    <small style="color: #64748b; font-size: 10px;">Si es puesta a cero, coloca el mismo valor que el odómetro actual.</small>
                </div>
                <div class="form-group" style="margin-bottom: 12px;">
                    <label style="font-size: 12px; font-weight: 700; color: #334155;">Motivo / Nota de Calibración</label>
                    <input type="text" id="calib_notes" class="form-control" value="Calibración y puesta a punto de odómetro por Dirección">
                </div>
                <div class="form-group" style="margin-bottom: 16px; background: #faf5ff; padding: 10px; border-radius: 6px; border: 1px solid #e9d5ff;">
                    <label style="font-size: 12px; font-weight: 800; color: #6b21a8;"><i class="fa-solid fa-lock"></i> Contraseña de Director General *</label>
                    <input type="password" id="calib_director_password" class="form-control" required placeholder="Ingresa clave de director (dalor2026)" style="border-color: #c4b5fd;">
                </div>
                <div style="display: flex; justify-content: flex-end; gap: 8px;">
                    <button type="button" onclick="closeModal('modalCalibrateOdometer')" class="btn-secondary">Cancelar</button>
                    <button type="submit" class="btn-primary" style="background: #7c3aed;">Confirmar Calibración</button>
                </div>
            </form>
        </div>
        `;
        document.body.appendChild(div);
    }

    document.getElementById("calib_asset_id").value = assetId;
    document.getElementById("calib_veh_label").innerText = `[${code}] ${name}`;
    document.getElementById("calib_new_odometer").value = currentKm || 0;
    document.getElementById("calib_service_odometer").value = currentKm || 0;
    document.getElementById("calib_director_password").value = "";
    openModal("modalCalibrateOdometer");
}

async function submitCalibrateOdometer(event) {
    event.preventDefault();
    const assetId = document.getElementById("calib_asset_id").value;
    const newKm = parseFloat(document.getElementById("calib_new_odometer").value);
    const servKm = parseFloat(document.getElementById("calib_service_odometer").value);
    const notes = document.getElementById("calib_notes").value;
    const password = document.getElementById("calib_director_password").value;

    if (isNaN(newKm) || newKm < 0) {
        alert("Por favor ingresa un odómetro válido.");
        return;
    }

    try {
        const res = await authFetch(`${API_BASE}/assets/${assetId}/calibrate-odometer`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                director_password: password,
                new_odometer: newKm,
                new_last_service_odometer: servKm,
                notes: notes
            })
        });

        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.detail || "Error al calibrar odómetro");
        }

        closeModal("modalCalibrateOdometer");
        showRealtimeToast(data.message || "Odómetro calibrado exitosamente.", "flota", "success");
        await loadFleetList();
    } catch (err) {
        alert("Error de autorización o calibración: " + err.message);
    }
}

function openCalibrateAllOdometersModal() {
    let modal = document.getElementById("modalCalibrateAllOdometers");
    if (!modal) {
        const div = document.createElement("div");
        div.id = "modalCalibrateAllOdometers";
        div.className = "modal-overlay hidden";
        div.innerHTML = `
        <div class="modal-card" style="max-width: 480px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <h3 style="font-size: 16px; font-weight: 800; color: #7c3aed; display: flex; align-items: center; gap: 8px;">
                    <i class="fa-solid fa-gauge-high"></i> Puesta a Cero / Calibrar Todos los Odómetros
                </h3>
                <button onclick="closeModal('modalCalibrateAllOdometers')" style="background: none; border: none; font-size: 18px; color: #64748b; cursor: pointer;">&times;</button>
            </div>
            <div style="background: #fdf2f8; border: 1px solid #fbcfe8; border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                <span style="color: #9d174d; font-size: 12px; font-weight: 700;">
                    <i class="fa-solid fa-triangle-exclamation"></i> Calibración Masiva de Flota:
                </span>
                <p style="color: #475569; font-size: 11px; margin-top: 4px;">
                    Esta acción calibrará simultáneamente los 8 vehículos oficiales de DALOR al kilometraje seleccionado (ej: 0 Km para arranque limpio de operación).
                </p>
            </div>
            <form id="formCalibrateAllOdometers" onsubmit="submitCalibrateAllOdometers(event)">
                <div class="form-group" style="margin-bottom: 12px;">
                    <label style="font-size: 12px; font-weight: 700; color: #334155;">Kilometraje Base Objetivo (Km) *</label>
                    <input type="number" step="1" id="bulk_target_odometer" class="form-control" value="0" required>
                </div>
                <div class="form-group" style="margin-bottom: 16px; background: #faf5ff; padding: 10px; border-radius: 6px; border: 1px solid #e9d5ff;">
                    <label style="font-size: 12px; font-weight: 800; color: #6b21a8;"><i class="fa-solid fa-lock"></i> Contraseña de Director General *</label>
                    <input type="password" id="bulk_director_password" class="form-control" required placeholder="Ingresa clave de director (dalor2026)" style="border-color: #c4b5fd;">
                </div>
                <div style="display: flex; justify-content: flex-end; gap: 8px;">
                    <button type="button" onclick="closeModal('modalCalibrateAllOdometers')" class="btn-secondary">Cancelar</button>
                    <button type="submit" class="btn-primary" style="background: #7c3aed;">Ejecutar Calibración Masiva</button>
                </div>
            </form>
        </div>
        `;
        document.body.appendChild(div);
    }
    document.getElementById("bulk_director_password").value = "";
    openModal("modalCalibrateAllOdometers");
}

async function submitCalibrateAllOdometers(event) {
    event.preventDefault();
    const targetKm = parseFloat(document.getElementById("bulk_target_odometer").value);
    const password = document.getElementById("bulk_director_password").value;

    if (isNaN(targetKm) || targetKm < 0) {
        alert("Por favor ingresa un kilometraje válido.");
        return;
    }

    try {
        const res = await authFetch(`${API_BASE}/assets/calibrate-all-odometers`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                director_password: password,
                target_odometer: targetKm,
                notes: "Calibración masiva de flota por Dirección General"
            })
        });

        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.detail || "Error en calibración masiva");
        }

        closeModal("modalCalibrateAllOdometers");
        showRealtimeToast(data.message || "Flota calibrada exitosamente.", "flota", "success");
        await loadFleetList();
    } catch (err) {
        alert("Error de autorización: " + err.message);
    }
}


function openNewVehicleModal() {

    document.getElementById("vehicleForm").reset();

    openModal("modalVehicle");

}



async function submitCreateVehicle(event) {

    event.preventDefault();

    const payload = {

        asset_code: document.getElementById("veh_code").value,

        name: document.getElementById("veh_name").value,

        asset_type: "vehiculo",

        brand: document.getElementById("veh_brand").value,

        license_plate: document.getElementById("veh_plate").value,

        current_odometer: parseFloat(document.getElementById("veh_odometer").value) || 0.0,

        service_interval_km: parseFloat(document.getElementById("veh_interval").value) || 5000.0,

        current_location: "Sede Central",

        is_exclusive: true

    };



    try {

        const res = await authFetch(`${API_BASE}/assets/`, {

            method: "POST",

            headers: { "Content-Type": "application/json" },

            body: JSON.stringify(payload)

        });

        if (res.ok) {

            alert("Vehículo registrado exitosamente en la flota.");

            closeModal("modalVehicle");

            await loadInitialMasterData();

            loadFleetList();

        } else {

            const err = await res.json();

            alert("Error: " + (err.detail || JSON.stringify(err)));

        }

    } catch (e) {

        alert("Error al registrar vehículo.");

    }

}



// ----------------------------------------------------

// 4. CONTROL DE MAQUINARIA PESADA & PLANTAS (PESTAÑA EXCLUSIVA)

// ----------------------------------------------------



// --- VINCULACIÓN CON WINDOW Y SCOPE GLOBAL ---
if (typeof window !== 'undefined') {
    window.loadFleetList = loadFleetList;
    window.filterFleetList = filterFleetList;
    window.openOdometerOcrModal = openOdometerOcrModal;
    window.handleOdometerImageSelected = handleOdometerImageSelected;
    window.submitConfirmOdometer = submitConfirmOdometer;
    window.openCalibrateOdometerModal = openCalibrateOdometerModal;
    window.submitCalibrateOdometer = submitCalibrateOdometer;
    window.openCalibrateAllOdometersModal = openCalibrateAllOdometersModal;
    window.submitCalibrateAllOdometers = submitCalibrateAllOdometers;
    window.openNewVehicleModal = openNewVehicleModal;
    window.submitCreateVehicle = submitCreateVehicle;
}
