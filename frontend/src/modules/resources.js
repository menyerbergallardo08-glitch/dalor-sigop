/**
 * DALOR SIGO-P | Módulo: RESOURCES.JS
 * Extraído y desacoplado del monolito de producción (v94)
 */

var API_BASE = window.API_BASE || (window.location.origin + "/api/v1");
var allClients = window.allClients = window.allClients || [];
var allServices = window.allServices = window.allServices || [];
var allProjects = window.allProjects = window.allProjects || [];
var allCategories = window.allCategories = window.allCategories || [];
var allAssets = window.allAssets = window.allAssets || [];
var allPersonnel = window.allPersonnel = window.allPersonnel || [];
var allMaterials = window.allMaterials = window.allMaterials || [];
var selectedPersonnelIds = window.selectedPersonnelIds = window.selectedPersonnelIds || [];
var selectedVehicleIds = window.selectedVehicleIds = window.selectedVehicleIds || [];
var selectedToolIds = window.selectedToolIds = window.selectedToolIds || [];
var selectedMaterialIds = window.selectedMaterialIds = window.selectedMaterialIds || [];
var EXCHANGE_RATE = window.EXCHANGE_RATE = window.EXCHANGE_RATE || 850.0;
var BCV_DATA = window.BCV_DATA = window.BCV_DATA || { rate: 850.0, source: 'BCV Oficial' };
var currentUser = window.currentUser || null;
var authToken = window.authToken = window.authToken || localStorage.getItem('dalor_token') || null;

// --- BLOQUE L3480-L4951 ---
// ----------------------------------------------------

// 2. MÓDULO DE ACTIVOS & RECURSOS (PESTAÑAS INDEPENDIENTES)

// ----------------------------------------------------

function openResourceSubtab(subtabName) {

    switchView('resources', 'recursos');

    switchResourceSubtab(subtabName);

}



function switchResourceSubtab(subtabName) {

    const allSubtabs = ['dashboard', 'fleet', 'machinery', 'tools', 'materials', 'personnel'];

    allSubtabs.forEach(tab => {

        const el = document.getElementById(`subtab-res-${tab}`);

        const btn = document.getElementById(`tabbtn-res-${tab}`);

        if (el) el.classList.add('hidden');

        if (btn) btn.classList.remove('active');

    });



    const targetSubtab = document.getElementById(`subtab-res-${subtabName}`);

    const targetBtn = document.getElementById(`tabbtn-res-${subtabName}`);

    if (targetSubtab) targetSubtab.classList.remove('hidden');

    if (targetBtn) targetBtn.classList.add('active');



    if (subtabName === 'dashboard') loadResourceDashboard();

    if (subtabName === 'fleet') loadFleetList();

    if (subtabName === 'machinery') loadMachineryList();

    if (subtabName === 'tools') loadToolsList();

    if (subtabName === 'materials') loadMaterialsList();

    if (subtabName === 'personnel') loadPersonnelTableList();

}



async function loadResourceDashboard() {

    try {

        const res = await fetch(`${API_BASE}/resources/matrix-status`);

        const data = await res.json();



        // 1. Tarjetas de Resumen KPI

        document.getElementById("matrixCountersContainer").innerHTML = `

            <div style="background: white; border: 1px solid #cbd5e1; border-radius: 10px; padding: 12px; text-align: center;">

                <span style="font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 700;">Flota en Base</span>

                <p style="font-size: 18px; font-weight: 900; color: #059669;">${data.summary.assets_available_base}</p>

            </div>

            <div style="background: white; border: 1px solid #cbd5e1; border-radius: 10px; padding: 12px; text-align: center;">

                <span style="font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 700;">Flota en Obra</span>

                <p style="font-size: 18px; font-weight: 900; color: var(--dalor-blue);">${data.summary.assets_in_operation}</p>

            </div>

            <div style="background: white; border: 1px solid #cbd5e1; border-radius: 10px; padding: 12px; text-align: center;">

                <span style="font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 700;">Personal en Base</span>

                <p style="font-size: 18px; font-weight: 900; color: #059669;">${data.summary.personnel_available_base}</p>

            </div>

            <div style="background: white; border: 1px solid #cbd5e1; border-radius: 10px; padding: 12px; text-align: center;">

                <span style="font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 700;">Personal en Obra</span>

                <p style="font-size: 18px; font-weight: 900; color: var(--dalor-blue);">${data.summary.personnel_in_operation}</p>

            </div>

        `;



        // 2. Distribución por Ubicación

        const locMap = {};

        [...data.assets, ...data.personnel].forEach(item => {

            const loc = item.location || 'Sede Central';

            if (!locMap[loc]) locMap[loc] = { assets: 0, personnel: 0 };

            if (item.type) locMap[loc].assets++;

            else locMap[loc].personnel++;

        });



        document.getElementById("locationDistributionContainer").innerHTML = Object.keys(locMap).map(loc => `

            <div style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 12px; font-size: 12px;">

                <div>

                    <b><i class="fa-solid fa-location-dot" style="color: var(--dalor-blue);"></i> ${loc}</b>

                </div>

                <div style="display: flex; gap: 8px;">

                    <span style="background: #e0f2fe; color: #0369a1; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 11px;">

                        ${locMap[loc].assets} Activos/Flota

                    </span>

                    <span style="background: #dcfce7; color: #166534; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 11px;">

                        ${locMap[loc].personnel} Trabajadores

                    </span>

                </div>

            </div>

        `).join('') || '<span style="color:#94a3b8; font-size:11px;">Sin datos de ubicación.</span>';



        // 3. Resumen de Movimientos

        document.getElementById("recentMovementsContainer").innerHTML = data.assets.slice(0, 5).map(a => `

            <div style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 10px; font-size: 11px;">

                <span><b>${a.code}</b> - ${a.name}</span>

                <span style="font-weight: 700; color: ${a.status === 'disponible_base' ? '#059669' : '#0284c7'};">

                    ${a.location} (${a.custodian})

                </span>

            </div>

        `).join('');



    } catch (e) {

        console.error("Error al cargar dashboard de recursos:", e);

    }

}



// ----------------------------------------------------

// 3. CONTROL DE FLOTA & VEHÍCULOS (PESTAÑA EXCLUSIVA)

// ----------------------------------------------------

async function loadFleetList() {

    const tbody = document.getElementById("fleetTableBody");

    tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; padding: 20px; color: #94a3b8;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando flota...</td></tr>`;



    try {

        const res = await fetch(`${API_BASE}/assets/fleet-summary`);

        const fleet = await res.json();

        const vehicles = fleet.filter(a => a.asset_type === 'vehiculo' || a.asset_type === 'camioneta');



        if (vehicles.length === 0) {

            tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; padding: 20px; color: #94a3b8;">No hay vehículos registrados en la flota.</td></tr>`;

            return;

        }



        tbody.innerHTML = vehicles.map(v => {

            let semColor = '#166534';

            let semBg = '#dcfce7';

            if (v.traffic_light === 'ROJO_VENCIDO') {

                semColor = '#991b1b';

                semBg = '#fee2e2';

            } else if (v.traffic_light === 'AMARILLO_PROXIMO') {

                semColor = '#92400e';

                semBg = '#fef3c7';

            }



            const inBase = v.status === 'disponible_base' || !v.current_project_id;



            return `

            <tr>

                <td style="font-weight: 800; color: var(--dalor-blue);">${v.asset_code}</td>

                <td style="font-weight: 700; color: var(--dalor-navy);">${v.name} ${v.brand ? `(${v.brand})` : ''}</td>

                <td style="font-weight: 800; font-family: monospace;">${v.license_plate || '-'}</td>

                <td style="font-weight: 800;">${v.current_odometer.toLocaleString()} Km</td>

                <td>En ${v.remaining_km_to_service.toLocaleString()} Km</td>

                <td>

                    <span style="font-size: 10px; padding: 2px 8px; border-radius: 9999px; font-weight: 800; background: ${semBg}; color: ${semColor};">

                        ${v.traffic_light.replace('_', ' ')}

                    </span>

                </td>

                <td>

                    <span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 800; ${inBase ? 'background: #dcfce7; color: #166534;' : 'background: #e0f2fe; color: #0369a1;'}">

                        ${inBase ? 'DISPONIBLE EN BASE' : 'EN OBRA'}

                    </span>

                </td>

                <td>${v.current_location}</td>

                <td>${v.custodian}</td>

                <td style="text-align: center; white-space: nowrap;">

                    <button onclick="openOdometerOcrModal(${v.id}, '${v.asset_code}', '${v.name.replace(/'/g, "\\'")}', '${v.license_plate || ''}', ${v.current_odometer})" class="btn-primary" style="padding: 3px 6px; font-size: 11px; margin-right: 4px; background: #0284c7; box-shadow: 0 1px 3px rgba(2, 132, 199, 0.4);" title="Capturar Odómetro por Foto (OCR)">

                        <i class="fa-solid fa-camera"></i> Odómetro

                    </button>

                    <button onclick="openRecordServiceModal(${v.id}, '${v.asset_code}', '${v.name.replace(/'/g, "\\'")}', ${v.current_odometer})" class="btn-secondary" style="padding: 3px 6px; font-size: 11px; margin-right: 4px; color: #ea580c; border-color: #fdba74;" title="Registrar Mantenimiento / Cambio de Aceite">

                        <i class="fa-solid fa-wrench"></i> Servicio

                    </button>

                    ${inBase ? `

                        <button onclick="openAssignModal('asset', ${v.id}, '${v.name}', 'assign')" class="btn-primary" style="padding: 3px 8px; font-size: 11px;">

                            Asignar a Obra

                        </button>

                    ` : `

                        <button onclick="openAssignModal('asset', ${v.id}, '${v.name}', 'transfer')" class="btn-secondary" style="padding: 3px 6px; font-size: 11px;" title="Transferir a otra obra">

                            <i class="fa-solid fa-arrows-split-up-and-left"></i>

                        </button>

                        <button onclick="returnResourceToBase('asset', ${v.id})" class="btn-primary" style="padding: 3px 6px; font-size: 11px; margin-left: 4px; background: #059669;" title="Devolver a Sede Central">

                            <i class="fa-solid fa-warehouse"></i>

                        </button>

                    `}

                    <button onclick="deleteAssetItem(${v.id})" class="btn-secondary" style="padding: 3px 6px; color: #ef4444; margin-left: 4px;" title="Inactivar Vehículo">

                        <i class="fa-solid fa-trash"></i>

                    </button>

                </td>

            </tr>`;

        }).join('');

    } catch (e) {

        tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: #e11d48;">Error al cargar flota.</td></tr>`;

    }

}



function openRecordServiceModal(assetId, code, name, currentKm) {

    let modal = document.getElementById("modalRecordService");

    if (!modal) {

        const div = document.createElement("div");

        div.id = "modalRecordService";

        div.className = "modal-overlay hidden";

        div.innerHTML = `

        <div class="modal-card" style="max-width: 460px;">

            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">

                <h3 style="font-size: 16px; font-weight: 800; color: #ea580c; display: flex; align-items: center; gap: 8px;">

                    <i class="fa-solid fa-wrench"></i> Registrar Mantenimiento / Servicio

                </h3>

                <button onclick="closeModal('modalRecordService')" style="background: none; border: none; font-size: 18px; color: #64748b; cursor: pointer;">&times;</button>

            </div>

            <form id="formRecordService" onsubmit="submitRecordService(event)">

                <input type="hidden" id="srv_asset_id">

                <div class="form-group" style="margin-bottom: 12px;">

                    <label style="font-size: 12px; font-weight: 700; color: #334155;">Vehículo / Equipo:</label>

                    <div id="srv_veh_label" style="font-weight: 800; color: var(--dalor-navy); font-size: 13px; padding: 8px; background: #f1f5f9; border-radius: 6px;"></div>

                </div>

                <div class="form-group" style="margin-bottom: 12px;">

                    <label style="font-size: 12px; font-weight: 700; color: #334155;">Tipo de Servicio *</label>

                    <select id="srv_type" class="form-control" required>

                        <option value="cambio_aceite_filtros">Cambio de Aceite y Filtros (5.000 Km)</option>

                        <option value="mantenimiento_preventivo_mayor">Mantenimiento Preventivo Mayor (Frenos/Tren/Correas)</option>

                        <option value="reparacion_correctiva">Reparación Mecánica Correctiva</option>

                        <option value="cambio_cauchos_alineacion">Cambio de Cauchos y Alineación</option>

                    </select>

                </div>

                <div class="form-group" style="margin-bottom: 12px;">

                    <label style="font-size: 12px; font-weight: 700; color: #334155;">Nuevo Odómetro al momento del Servicio (Km) *</label>

                    <input type="number" step="1" id="srv_odometer" class="form-control" required>

                </div>

                <div class="form-group" style="margin-bottom: 12px;">

                    <label style="font-size: 12px; font-weight: 700; color: #334155;">Costo Total del Servicio (USD)</label>

                    <input type="number" step="0.01" id="srv_cost" class="form-control" value="0.00">

                </div>

                <div class="form-group" style="margin-bottom: 16px;">

                    <label style="font-size: 12px; font-weight: 700; color: #334155;">Taller / Observaciones</label>

                    <textarea id="srv_notes" class="form-control" rows="2" placeholder="Ej: Taller Central - Aceite 15W40 mineral"></textarea>

                </div>

                <div style="display: flex; justify-content: flex-end; gap: 8px;">

                    <button type="button" onclick="closeModal('modalRecordService')" class="btn-secondary" style="font-size: 12px;">Cancelar</button>

                    <button type="submit" class="btn-primary" style="font-size: 12px; background: #ea580c;">

                        <i class="fa-solid fa-check"></i> Guardar Servicio y Resetear Semáforo

                    </button>

                </div>

            </form>

        </div>`;

        document.body.appendChild(div);

    }

    document.getElementById("srv_asset_id").value = assetId;

    document.getElementById("srv_veh_label").innerText = `[${code}] ${name}`;

    document.getElementById("srv_odometer").value = currentKm;

    openModal("modalRecordService");

}



async function submitRecordService(event) {

    event.preventDefault();

    const assetId = document.getElementById("srv_asset_id").value;

    const payload = {

        new_odometer: parseFloat(document.getElementById("srv_odometer").value),

        service_type: document.getElementById("srv_type").value,

        cost_usd: parseFloat(document.getElementById("srv_cost").value) || 0.0,

        notes: document.getElementById("srv_notes").value

    };



    try {

        const res = await fetch(`${API_BASE}/assets/${assetId}/record-service`, {

            method: "POST",

            headers: { "Content-Type": "application/json" },

            body: JSON.stringify(payload)

        });

        if (res.ok) {

            const data = await res.json();

            alert(data.message || "Servicio registrado exitosamente.");

            closeModal("modalRecordService");

            await loadFleetList();

        } else {

            const err = await res.json();

            alert("Error: " + (err.detail || JSON.stringify(err)));

        }

    } catch (e) {

        alert("Error al conectar con el servidor.");

    }

}



// ----------------------------------------------------

// 📸 CAPTURA & OCR DE ODÓMETRO VEHICULAR

// ----------------------------------------------------

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



        const res = await fetch(`${API_BASE}/ocr/scan-odometer`, {

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

        const res = await fetch(`${API_BASE}/assets/${assetId}/record-odometer`, {

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

        const res = await fetch(`${API_BASE}/assets/`, {

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

async function loadMachineryList() {

    const tbody = document.getElementById("machineryTableBody");

    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; padding: 20px; color: #94a3b8;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando maquinaria pesada y plantas...</td></tr>`;



    try {

        const res = await fetch(`${API_BASE}/assets/`);

        const assets = await res.json();

        const machinery = assets.filter(a => ['maquinaria', 'planta', 'generador', 'compresor'].includes(a.asset_type));



        if (machinery.length === 0) {

            tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; padding: 20px; color: #94a3b8;">No hay maquinaria pesada o plantas registradas.</td></tr>`;

            return;

        }



        tbody.innerHTML = machinery.map(m => {

            const inBase = m.status === 'disponible_base' || !m.current_project_id;

            const isMaint = m.maintenance_status === 'en_mantenimiento';

            return `

            <tr>

                <td style="font-weight: 800; color: #ea580c; font-family: monospace;">${m.asset_code}</td>

                <td style="font-weight: 700; color: var(--dalor-navy);">${m.name}</td>

                <td>${m.brand || ''} ${m.model ? `(${m.model})` : ''}</td>

                <td style="font-family: monospace; font-size: 11px;">${m.serial_number || '-'}</td>

                <td style="font-weight: 800; color: #0284c7;">${(m.current_odometer || 0).toLocaleString()} Hrs/Km</td>

                <td>

                    <span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 800; ${isMaint ? 'background: #fee2e2; color: #991b1b;' : 'background: #dcfce7; color: #166534;'}">

                        ${isMaint ? 'EN TALLER / MTTO' : 'OPERATIVO'}

                    </span>

                </td>

                <td>

                    <span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 800; ${inBase ? 'background: #dcfce7; color: #166534;' : 'background: #e0f2fe; color: #0369a1;'}">

                        ${inBase ? 'DISPONIBLE EN BASE' : 'EN OBRA / FAENA'}

                    </span>

                </td>

                <td>${m.current_location || 'Sede Central'}</td>

                <td>${m.current_custodian_name || 'Disponible'}</td>

                <td style="text-align: center; white-space: nowrap;">

                    ${inBase ? `

                        <button onclick="openAssignModal('asset', ${m.id}, '${m.name}', 'assign')" class="btn-primary" style="padding: 3px 8px; font-size: 11px; background: #ea580c;">

                            Asignar a Faena

                        </button>

                    ` : `

                        <button onclick="openAssignModal('asset', ${m.id}, '${m.name}', 'transfer')" class="btn-secondary" style="padding: 3px 6px; font-size: 11px;" title="Transferir a otra obra">

                            <i class="fa-solid fa-arrows-split-up-and-left"></i>

                        </button>

                        <button onclick="returnResourceToBase('asset', ${m.id})" class="btn-primary" style="padding: 3px 6px; font-size: 11px; margin-left: 4px; background: #059669;" title="Devolver a Sede Central">

                            <i class="fa-solid fa-warehouse"></i>

                        </button>

                    `}

                    <button onclick="deleteAssetItem(${m.id})" class="btn-secondary" style="padding: 3px 6px; color: #ef4444; margin-left: 4px;" title="Inactivar Maquinaria">

                        <i class="fa-solid fa-trash"></i>

                    </button>

                </td>

            </tr>`;

        }).join('');

    } catch (e) {

        tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: #e11d48;">Error al cargar maquinaria pesada.</td></tr>`;

    }

}



// ----------------------------------------------------

// 5. CONTROL DE HERRAMIENTAS & EQUIPOS (PESTAÑA EXCLUSIVA)

// ----------------------------------------------------

async function loadToolsList() {

    const tbody = document.getElementById("toolsTableBody");

    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 20px; color: #94a3b8;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando inventario de herramientas...</td></tr>`;



    try {

        const res = await fetch(`${API_BASE}/assets/`);

        const assets = await res.json();

        const nonTools = ['vehiculo', 'camioneta', 'camion', 'remolque', 'maquinaria', 'planta', 'generador', 'compresor'];

        const tools = assets.filter(a => !nonTools.includes(a.asset_type));



        if (tools.length === 0) {

            tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 20px; color: #94a3b8;">No hay herramientas registradas.</td></tr>`;

            return;

        }



        tbody.innerHTML = tools.map(t => {

            const inBase = t.status === 'disponible_base' || !t.current_project_id;

            return `

            <tr>

                <td style="font-weight: 800; color: var(--dalor-blue);">${t.asset_code}</td>

                <td style="font-weight: 700; color: var(--dalor-navy);">${t.name}</td>

                <td><span style="font-size: 10px; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-weight: 700;">${(t.asset_type || 'HERRAMIENTA').toUpperCase().replace('_', ' ')}</span></td>

                <td>${t.brand || ''} ${t.model ? `(${t.model})` : ''}</td>

                <td style="font-family: monospace; font-size: 11px;">${t.serial_number || '-'}</td>

                <td>

                    <span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 800; ${inBase ? 'background: #dcfce7; color: #166534;' : 'background: #e0f2fe; color: #0369a1;'}">

                        ${inBase ? 'DISPONIBLE EN BASE' : 'EN OBRA'}

                    </span>

                </td>

                <td>${t.current_location || 'Sede Central'}</td>

                <td>${t.current_custodian_name || 'Disponible'}</td>

                <td style="text-align: center; white-space: nowrap;">

                    ${inBase ? `

                        <button onclick="openAssignModal('asset', ${t.id}, '${t.name}', 'assign')" class="btn-primary" style="padding: 3px 8px; font-size: 11px;">

                            Asignar a Obra

                        </button>

                    ` : `

                        <button onclick="openAssignModal('asset', ${t.id}, '${t.name}', 'transfer')" class="btn-secondary" style="padding: 3px 6px; font-size: 11px;" title="Transferir a otra obra">

                            <i class="fa-solid fa-arrows-split-up-and-left"></i>

                        </button>

                        <button onclick="returnResourceToBase('asset', ${t.id})" class="btn-primary" style="padding: 3px 6px; font-size: 11px; margin-left: 4px; background: #059669;" title="Devolver a Sede Central">

                            <i class="fa-solid fa-warehouse"></i>

                        </button>

                    `}

                    <button onclick="deleteAssetItem(${t.id})" class="btn-secondary" style="padding: 3px 6px; color: #ef4444; margin-left: 4px;" title="Inactivar Herramienta">

                        <i class="fa-solid fa-trash"></i>

                    </button>

                </td>

            </tr>`;

        }).join('');

    } catch (e) {

        tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: #e11d48;">Error al cargar herramientas.</td></tr>`;

    }

}



function openNewToolModal() {

    document.getElementById("toolForm").reset();

    openModal("modalTool");

}



async function submitCreateTool(event) {

    event.preventDefault();

    const payload = {

        asset_code: document.getElementById("tool_code").value,

        name: document.getElementById("tool_name").value,

        asset_type: document.getElementById("tool_type").value,

        brand: document.getElementById("tool_brand").value,

        serial_number: document.getElementById("tool_serial").value,

        current_location: document.getElementById("tool_location").value || "Sede Central",

        is_exclusive: true

    };



    try {

        const res = await fetch(`${API_BASE}/assets/`, {

            method: "POST",

            headers: { "Content-Type": "application/json" },

            body: JSON.stringify(payload)

        });

        if (res.ok) {

            alert("Herramienta/Equipo registrado exitosamente.");

            closeModal("modalTool");

            await loadInitialMasterData();

            loadToolsList();
            if (typeof loadMachineryList === "function") loadMachineryList();
            if (typeof loadFleetList === "function") loadFleetList();

        } else {

            const err = await res.json();

            alert("Error: " + (err.detail || JSON.stringify(err)));

        }

    } catch (e) {

        alert("Error al registrar herramienta.");

    }

}



async function deleteAssetItem(assetId) {

    if (!confirm("¿Deseas inactivar este elemento? (Se conservará la traza histórica)")) return;

    try {

        await fetch(`${API_BASE}/assets/${assetId}`, { method: "DELETE" });

        await loadInitialMasterData();

        loadToolsList();

        loadFleetList();

    } catch (e) {

        alert("Error al inactivar.");

    }

}



// ----------------------------------------------------

// 5. CONTROL DE PERSONAL & CUADRILLA (PESTAÑA EXCLUSIVA)

// ----------------------------------------------------

async function loadPersonnelTableList() {

    const tbody = document.getElementById("matrixPersonnelTableBody");

    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px; color: #94a3b8;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando personal...</td></tr>`;



    try {

        const res = await fetch(`${API_BASE}/personnel/`);

        allPersonnel = await res.json();



        tbody.innerHTML = allPersonnel.map(p => {

            const inBase = p.status === 'disponible_base' || !p.current_project_id;

            return `

            <tr>

                <td style="font-weight: 800; color: var(--dalor-blue);">${p.code}</td>

                <td style="font-weight: 700; color: var(--dalor-navy);">${p.full_name}</td>

                <td><span style="font-size: 11px; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-weight: 600;">${p.role_title}</span></td>

                <td>${p.phone || '-'}</td>

                <td>

                    <span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 800; ${inBase ? 'background: #dcfce7; color: #166534;' : 'background: #e0f2fe; color: #0369a1;'}">

                        ${inBase ? 'DISPONIBLE EN BASE' : 'EN OBRA'}

                    </span>

                </td>

                <td>${p.current_location || 'Sede Central'}</td>

                <td style="text-align: center; white-space: nowrap;">

                    ${inBase ? `

                        <button onclick="openAssignModal('personnel', ${p.id}, '${p.full_name}', 'assign')" class="btn-primary" style="padding: 3px 8px; font-size: 11px;">

                            Asignar a Obra

                        </button>

                    ` : `

                        <button onclick="openAssignModal('personnel', ${p.id}, '${p.full_name}', 'transfer')" class="btn-secondary" style="padding: 3px 6px; font-size: 11px;" title="Transferir a otra obra">

                            <i class="fa-solid fa-arrows-split-up-and-left"></i>

                        </button>

                        <button onclick="returnResourceToBase('personnel', ${p.id})" class="btn-primary" style="padding: 3px 6px; font-size: 11px; margin-left: 4px; background: #059669;" title="Devolver a Sede Central">

                            <i class="fa-solid fa-warehouse"></i>

                        </button>

                    `}

                </td>

            </tr>`;

        }).join('');

    } catch (e) {

        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #e11d48;">Error al cargar personal.</td></tr>`;

    }

}



function openAssignModal(type, id, name, action) {

    document.getElementById("modal_res_type").value = type;

    document.getElementById("modal_res_id").value = id;

    document.getElementById("modal_action_type").value = action;

    

    const isAsset = type === 'asset';

    document.getElementById("modal_odometer_container").style.display = isAsset ? 'block' : 'none';

    document.getElementById("modal_custodian_container").style.display = isAsset ? 'block' : 'none';



    document.getElementById("assignModalTitle").innerText = action === 'assign' ? `Asignar ${name} a Obra` : `Transferir ${name} a Nueva Obra`;

    document.getElementById("btnConfirmResourceAction").innerText = action === 'assign' ? 'Confirmar Asignación' : 'Confirmar Transferencia Directa';



    openModal("modalAssignResource");

}



async function submitResourceAction(event) {

    event.preventDefault();

    const type = document.getElementById("modal_res_type").value;

    const id = parseInt(document.getElementById("modal_res_id").value);

    const action = document.getElementById("modal_action_type").value;

    const targetProjId = parseInt(document.getElementById("modal_target_project_id").value);

    const location = document.getElementById("modal_res_location").value;

    const custodian = document.getElementById("modal_res_custodian").value;

    const odometer = parseFloat(document.getElementById("modal_res_odometer").value) || null;



    const endpoint = action === 'assign' ? `${API_BASE}/resources/assign` : `${API_BASE}/resources/transfer`;

    const payload = action === 'assign' ? {

        project_id: targetProjId,

        resource_type: type,

        resource_id: id,

        destination_location: location,

        custodian_name: custodian,

        start_odometer: odometer

    } : {

        target_project_id: targetProjId,

        resource_type: type,

        resource_id: id,

        destination_location: location,

        custodian_name: custodian,

        current_odometer: odometer

    };



    try {

        const res = await fetch(endpoint, {

            method: "POST",

            headers: { "Content-Type": "application/json" },

            body: JSON.stringify(payload)

        });

        if (res.ok) {

            const data = await res.json();

            alert(data.message);

            closeModal("modalAssignResource");

            loadResourceDashboard();

            loadFleetList();

            loadToolsList();

            loadPersonnelTableList();

        } else {

            alert("Error al procesar movimiento de recurso.");

        }

    } catch (e) {

        alert("Error de conexión.");

    }

}



async function returnResourceToBase(type, id) {

    let endOdometer = null;

    if (type === 'asset') {

        const odoInput = prompt("Ingresa el odómetro final (o deja en blanco):");

        if (odoInput) endOdometer = parseFloat(odoInput);

    }



    try {

        const res = await fetch(`${API_BASE}/resources/return-to-base`, {

            method: "POST",

            headers: { "Content-Type": "application/json" },

            body: JSON.stringify({

                resource_type: type,

                resource_id: id,

                end_odometer: endOdometer,

                return_location: "Sede Central"

            })

        });

        if (res.ok) {

            const data = await res.json();

            alert(data.message);

            loadResourceDashboard();

            loadFleetList();

            loadToolsList();

            loadPersonnelTableList();

        }

    } catch (e) {

        alert("Error al registrar retorno.");

    }

}





// --- BLOQUE L12242-L12541 ---
// ==============================================================================

// 🚜 CREACIÓN DE NUEVOS ACTIVOS, VEHÍCULOS, HERRAMIENTAS & MAQUINARIA

// ==============================================================================

function openNewAssetModal(presetType = 'herramienta_mayor') {

    const form = document.getElementById("newAssetForm");

    if (form) form.reset();

    

    const typeSelect = document.getElementById("nass_type");

    if (typeSelect) {

        typeSelect.value = presetType;

    }

    onAssetTypeChanged();

    openModal("modalNewAsset");

}



function openNewToolModal_v2() {

    openNewAssetModal('herramienta_mayor');

}



function openNewVehicleModal_v2() {

    openNewAssetModal('vehiculo');

}



function onAssetTypeChanged() {

    const type = document.getElementById("nass_type").value;

    const title = document.getElementById("newAssetModalTitle");

    const serialLabel = document.getElementById("nass_serial_label");

    const odometerLabel = document.getElementById("nass_odometer_label");



    if (type === 'vehiculo') {

        if (title) title.innerHTML = '<i class="fa-solid fa-truck" style="color: #6366f1;"></i> Registrar Nuevo Vehículo de Flota / Carga';

        if (serialLabel) serialLabel.textContent = "Placa del Vehículo *";

        if (odometerLabel) odometerLabel.textContent = "Kilometraje Inicial (Km)";

    } else if (type === 'maquinaria') {

        if (title) title.innerHTML = '<i class="fa-solid fa-gears" style="color: #d97706;"></i> Registrar Nueva Maquinaria Pesada / Planta / Compresor';

        if (serialLabel) serialLabel.textContent = "Serial del Fabricante";

        if (odometerLabel) odometerLabel.textContent = "Horómetro Inicial (Horas)";

    } else if (type === 'equipo_medicion') {

        if (title) title.innerHTML = '<i class="fa-solid fa-scale-unbalanced" style="color: #8b5cf6;"></i> Registrar Nuevo Equipo de Medición / Calibración';

        if (serialLabel) serialLabel.textContent = "Serial / Certificado Calibración";

        if (odometerLabel) odometerLabel.textContent = "Usos / Horómetro";

    } else {

        if (title) title.innerHTML = '<i class="fa-solid fa-toolbox" style="color: var(--dalor-blue);"></i> Registrar Nueva Herramienta / Equipo';

        if (serialLabel) serialLabel.textContent = "Serial / Identificador";

        if (odometerLabel) odometerLabel.textContent = "Horómetro / Contador";

    }

}



async function submitCreateAsset(e) {

    e.preventDefault();

    const type = document.getElementById("nass_type").value;

    const code = document.getElementById("nass_code").value.trim();

    const name = document.getElementById("nass_name").value.trim();

    const brand = document.getElementById("nass_brand").value.trim();

    const model = document.getElementById("nass_model").value.trim();

    const serial = document.getElementById("nass_serial").value.trim();

    const odometer = parseFloat(document.getElementById("nass_odometer").value) || 0.0;

    const location = document.getElementById("nass_location").value.trim() || "Sede Central";

    const custodian = document.getElementById("nass_custodian").value.trim() || "Disponible en Base";



    const payload = {

        asset_code: code,

        name: name,

        asset_type: type,

        brand: brand,

        model: model,

        serial_number: type !== 'vehiculo' ? serial : null,

        license_plate: type === 'vehiculo' ? serial : null,

        current_odometer: odometer,

        service_interval_km: type === 'vehiculo' ? 5000 : 250,

        current_location: location,

        current_custodian_name: custodian,

        is_exclusive: true

    };



    try {

        const res = await fetch(`${API_BASE}/assets/`, {

            method: "POST",

            headers: { "Content-Type": "application/json" },

            body: JSON.stringify(payload)

        });



        if (!res.ok) {

            const err = await res.json();

            throw new Error(err.detail || "Error al crear activo");

        }



        closeModal("modalNewAsset");

        alert(`✅ Activo ${code} (${name}) registrado exitosamente.`);

        await loadInitialMasterData();

        loadFleetList();

        loadToolsList();

    } catch (err) {

        alert(`❌ Error: ${err.message}`);

    }

}



// ==============================================================================

// 👷 CREACIÓN DE NUEVOS EMPLEADOS / PERSONAL

// ==============================================================================

function openNewPersonnelModal() {

    const form = document.getElementById("newPersonnelForm");

    if (form) form.reset();

    openModal("modalNewPersonnel");

}



async function submitCreatePersonnel(e) {

    e.preventDefault();

    const code = document.getElementById("npers_code").value.trim();

    const fullName = document.getElementById("npers_name").value.trim();

    const idNum = document.getElementById("npers_id").value.trim();

    const role = document.getElementById("npers_role").value;

    const phone = document.getElementById("npers_phone").value.trim();

    const roster = document.getElementById("npers_roster").value;

    const salary = parseFloat(document.getElementById("npers_salary").value) || 0.0;

    const location = document.getElementById("npers_location").value.trim() || "Sede Central";



    const payload = {

        code: code,

        full_name: fullName,

        identification_id: idNum,

        role_title: role,

        phone: phone,

        roster_type: roster,

        monthly_salary_usd: salary,

        current_location: location,

        status: "disponible_base"

    };



    try {

        const res = await fetch(`${API_BASE}/personnel/`, {

            method: "POST",

            headers: { "Content-Type": "application/json" },

            body: JSON.stringify(payload)

        });



        if (!res.ok) {

            const err = await res.json();

            throw new Error(err.detail || "Error al registrar empleado");

        }



        closeModal("modalNewPersonnel");

        alert(`✅ Empleado ${fullName} (${role}) registrado exitosamente.`);

        await loadInitialMasterData();

        loadPersonnelTableList();

    } catch (err) {

        alert(`❌ Error: ${err.message}`);

    }

}






// --- PUENTE DE COMPATIBILIDAD CON WINDOW & HTML INLINE ---
if (typeof window !== 'undefined') {
    window.deleteAssetItem = deleteAssetItem;
    window.handleOdometerImageSelected = handleOdometerImageSelected;
    window.loadFleetList = loadFleetList;
    window.loadMachineryList = loadMachineryList;
    window.loadPersonnelTableList = loadPersonnelTableList;
    window.loadResourceDashboard = loadResourceDashboard;
    window.loadToolsList = loadToolsList;
    window.onAssetTypeChanged = onAssetTypeChanged;
    window.openAssignModal = openAssignModal;
    window.openNewAssetModal = openNewAssetModal;
    window.openNewPersonnelModal = openNewPersonnelModal;
    window.openNewToolModal = openNewToolModal;
    window.openNewToolModal_v2 = openNewToolModal_v2;
    window.openNewVehicleModal = openNewVehicleModal;
    window.openNewVehicleModal_v2 = openNewVehicleModal_v2;
    window.openOdometerOcrModal = openOdometerOcrModal;
    window.openRecordServiceModal = openRecordServiceModal;
    window.openResourceSubtab = openResourceSubtab;
    window.returnResourceToBase = returnResourceToBase;
    window.submitConfirmOdometer = submitConfirmOdometer;
    window.submitCreateAsset = submitCreateAsset;
    window.submitCreatePersonnel = submitCreatePersonnel;
    window.submitCreateTool = submitCreateTool;
    window.submitCreateVehicle = submitCreateVehicle;
    window.submitRecordService = submitRecordService;
    window.submitResourceAction = submitResourceAction;
    window.switchResourceSubtab = switchResourceSubtab;
}

export { deleteAssetItem, handleOdometerImageSelected, loadFleetList, loadMachineryList, loadPersonnelTableList, loadResourceDashboard, loadToolsList, onAssetTypeChanged, openAssignModal, openNewAssetModal, openNewPersonnelModal, openNewToolModal, openNewToolModal_v2, openNewVehicleModal, openNewVehicleModal_v2, openOdometerOcrModal, openRecordServiceModal, openResourceSubtab, returnResourceToBase, submitConfirmOdometer, submitCreateAsset, submitCreatePersonnel, submitCreateTool, submitCreateVehicle, submitRecordService, submitResourceAction, switchResourceSubtab };
