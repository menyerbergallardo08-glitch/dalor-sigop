/**
 * DALOR SIGO-P | Módulo de Materiales e Inventario Desacoplado
 */
var API_BASE = window.API_BASE || (window.location.origin + "/api/v1");
var allMaterials = window.allMaterials = window.allMaterials || [];
var allProjects = window.allProjects = window.allProjects || [];
var allCategories = window.allCategories = window.allCategories || [];
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

// --- BLOQUE L11768-L12241 ---
// ==============================================================================

// 📋 7. GUÍAS OFICIALES DE TRASLADO & DESPACHO A OBRA

// ==============================================================================



function openTransferGuideModal() {

    document.getElementById("transferGuideForm").reset();

    populateSelectDropdowns();

    renderTransferToolsChecklist();

    openModal("modalTransferGuide");

}



function onTransferGuideProjectChanged() {

    const sel = document.getElementById("tg_project_id");

    if (!sel || !sel.options[sel.selectedIndex]) return;

    const opt = sel.options[sel.selectedIndex];

    const projId = parseInt(sel.value);

    const proj = allProjects.find(p => p.id === projId);



    // 1. Destino

    const loc = (proj && proj.location) || opt.getAttribute("data-location") || "Planta Centro - Morón";

    const destInput = document.getElementById("tg_destination");

    if (destInput) destInput.value = loc;



    // 2. Chofer responsable pre-cargado

    const driverInput = document.getElementById("tg_driver_name");

    if (driverInput) {

        let chofer = (allPersonnel || []).find(p => p.current_project_id === projId && (p.role_title || '').toLowerCase().includes('chofer'));

        if (!chofer) {

            chofer = (allPersonnel || []).find(p => (p.role_title || '').toLowerCase().includes('chofer'));

        }

        if (!chofer && allPersonnel && allPersonnel.length > 0) {

            chofer = allPersonnel[0];

        }

        if (chofer) driverInput.value = chofer.full_name;

    }



    // 3. Vehículo de transporte pre-cargado

    const vehSelect = document.getElementById("tg_vehicle_id");

    if (vehSelect) {

        const projVeh = (allAssets || []).find(a => (a.asset_type === 'vehiculo' || a.asset_type === 'camioneta') && a.current_project_id === projId);

        if (projVeh) {

            vehSelect.value = projVeh.id;

        } else {

            const firstVeh = (allAssets || []).find(a => a.asset_type === 'vehiculo' || a.asset_type === 'camioneta');

            if (firstVeh) vehSelect.value = firstVeh.id;

        }

    }



    // 4. Pre-marcar herramientas asignadas a este proyecto

    renderTransferToolsChecklist(projId);

}



function renderTransferToolsChecklist(selectedProjId = null) {

    const container = document.getElementById("tg_tools_checklist_container");

    if (!container) return;



    const tools = allAssets.filter(a => a.asset_type !== 'vehiculo' && a.asset_type !== 'camioneta');

    if (tools.length === 0) {

        container.innerHTML = `<span style="font-size:11px; color:#94a3b8;">No hay herramientas registradas.</span>`;

        return;

    }



    container.innerHTML = tools.map(t => {

        const isPreChecked = selectedProjId && (t.current_project_id === selectedProjId || t.current_location === "en_obra");

        return `

        <label style="display: flex; align-items: center; gap: 8px; padding: 4px 6px; border-radius: 4px; background: ${isPreChecked ? '#f0fdf4' : '#f8fafc'}; font-size: 11px; cursor: pointer;" class="tg-tool-item" data-text="${t.asset_code} ${t.name} ${t.brand || ''}">

            <input type="checkbox" value="${t.id}" data-name="${t.name}" data-code="${t.asset_code}" data-brand="${t.brand || ''}" data-serial="${t.serial_number || ''}" class="tg-tool-checkbox" ${isPreChecked ? 'checked' : ''} style="width: 15px; height: 15px; accent-color: #0284c7;">

            <span style="font-weight: 800; color: var(--dalor-blue); font-family: monospace;">[${t.asset_code}]</span>

            <span style="font-weight: 600; color: var(--dalor-navy);">${t.name}</span>

            <span style="color: #64748b; font-size: 10px; margin-left: auto;">${t.brand || ''}</span>

        </label>

        `;

    }).join('');

}



function filterTransferToolsChecklist() {

    const q = (document.getElementById("tg_tools_search")?.value || "").toLowerCase();

    document.querySelectorAll(".tg-tool-item").forEach(item => {

        const text = item.getAttribute("data-text").toLowerCase();

        item.style.display = text.includes(q) ? "flex" : "none";

    });

}



async function submitGenerateTransferGuide(event) {

    event.preventDefault();

    const projId = parseInt(document.getElementById("tg_project_id").value);

    const dest = document.getElementById("tg_destination").value.trim();

    const vehId = document.getElementById("tg_vehicle_id").value;

    const driver = document.getElementById("tg_driver_name").value.trim();



    if (!projId) {

        alert("Por favor selecciona un proyecto aprobado de destino.");

        return;

    }



    const selectedTools = [];

    document.querySelectorAll(".tg-tool-checkbox:checked").forEach(cb => {

        selectedTools.push({

            id: parseInt(cb.value),

            code: cb.getAttribute("data-code"),

            name: cb.getAttribute("data-name")

        });

    });



    if (selectedTools.length === 0) {

        alert("Por favor selecciona al menos una herramienta o equipo a trasladar.");

        return;

    }



    const proj = allProjects.find(p => p.id === projId) || { code: "DAL-2026-001", name: "Proyecto Obra" };

    const veh = allAssets.find(a => a.id == vehId) || { asset_code: "VEH-001", name: "Camioneta Toyota Hilux" };

    const guideNumber = `GT-DALOR-${Date.now().toString().slice(-6)}`;



    // Reubicar herramientas en backend para el proyecto

    for (const tool of selectedTools) {

        try {

            await authFetch(`${API_BASE}/resources/assign`, {

                method: "POST",

                headers: { "Content-Type": "application/json" },

                body: JSON.stringify({

                    resource_type: "asset",

                    resource_id: tool.id,

                    project_id: projId,

                    destination_location: dest,

                    custodian_name: driver,

                    action_type: "assign"

                })

            });

        } catch (e) {

            console.error("Error asignando herramienta:", e);

        }

    }



    closeModal("modalTransferGuide");

    await loadInitialMasterData();

    if (document.getElementById("subtab-res-tools") && !document.getElementById("subtab-res-tools").classList.contains("hidden")) {

        loadToolsList();

    }



    // MOSTRAR FORMATO OFICIAL FORMAL LISTO PARA IMPRIMIR O GUARDAR EN PDF

    const printArea = document.getElementById("modalPrintPreviewContent");

    const titleEl = document.getElementById("previewModalTitle");

    if (titleEl) titleEl.innerText = "Guía Oficial de Traslado y Despacho de Equipos - Dalor C.A.";



    const nowStr = new Date().toLocaleDateString('es-VE') + ' ' + new Date().toLocaleTimeString('es-VE', {hour: '2-digit', minute:'2-digit'});



    if (printArea) {

        printArea.innerHTML = `

        <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; padding: 25px; background: #fff;">

            <!-- Header Membretado Oficial DALOR -->

            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #002B49; padding-bottom: 12px; margin-bottom: 16px;">

                <div>

                    <h2 style="margin: 0; color: #002B49; font-size: 22px; font-weight: 900; letter-spacing: 1px;">DALOR, C.A.</h2>

                    <p style="margin: 3px 0 0 0; font-size: 11px; color: #475569; font-weight: 600;">SOLUCIONES DE INGENIERÍA, MANTENIMIENTO Y MONTAJE INDUSTRIAL</p>

                    <p style="margin: 2px 0 0 0; font-size: 10px; color: #64748b;">RIF: J-31601195-0 &bull; Guacara, Edo. Carabobo - Venezuela</p>

                </div>

                <div style="text-align: right;">

                    <div style="background: #0284c7; color: #fff; padding: 6px 14px; border-radius: 6px; font-weight: 900; font-size: 13px; letter-spacing: 0.5px;">

                        GUÍA DE TRASLADO DE EQUIPOS

                    </div>

                    <div style="font-size: 13px; font-weight: 900; color: #002B49; margin-top: 5px;">

                        N°: ${guideNumber}

                    </div>

                    <div style="font-size: 11px; color: #64748b;">

                        Fecha: ${nowStr}

                    </div>

                </div>

            </div>



            <!-- Ficha de Traslado y Destino -->

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 11px;">

                <tr style="background: #f8fafc;">

                    <td style="padding: 6px 10px; border: 1px solid #cbd5e1; font-weight: 700; width: 20%; color: #475569;">Proyecto Destino:</td>

                    <td style="padding: 6px 10px; border: 1px solid #cbd5e1; width: 30%; font-weight: 800; color: #0284c7;">[${proj.code}] ${proj.name}</td>

                    <td style="padding: 6px 10px; border: 1px solid #cbd5e1; font-weight: 700; width: 20%; color: #475569;">Ubicación / Frente:</td>

                    <td style="padding: 6px 10px; border: 1px solid #cbd5e1; width: 30%; font-weight: 700;">${dest}</td>

                </tr>

                <tr>

                    <td style="padding: 6px 10px; border: 1px solid #cbd5e1; font-weight: 700; color: #475569;">Vehículo de Carga:</td>

                    <td style="padding: 6px 10px; border: 1px solid #cbd5e1;">${veh.name} (Placa: ${veh.license_plate || 'N/A'})</td>

                    <td style="padding: 6px 10px; border: 1px solid #cbd5e1; font-weight: 700; color: #475569;">Conductor / Chofer:</td>

                    <td style="padding: 6px 10px; border: 1px solid #cbd5e1; font-weight: 800; color: #002B49;">${driver}</td>

                </tr>

            </table>



            <!-- Tabla de Herramientas y Equipos Despachados -->

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 11px;">

                <thead>

                    <tr style="background: #002B49; color: #ffffff;">

                        <th style="padding: 8px 10px; border: 1px solid #002B49; width: 40px; text-align: center;">Item</th>

                        <th style="padding: 8px 10px; border: 1px solid #002B49; width: 90px;">Código</th>

                        <th style="padding: 8px 10px; border: 1px solid #002B49;">Descripción de la Herramienta / Equipo</th>

                        <th style="padding: 8px 10px; border: 1px solid #002B49; width: 130px;">Marca / Modelo</th>

                        <th style="padding: 8px 10px; border: 1px solid #002B49; width: 120px;">Serial</th>

                        <th style="padding: 8px 10px; border: 1px solid #002B49; width: 90px; text-align: center;">Estado</th>

                    </tr>

                </thead>

                <tbody>

                    ${selectedTools.map((t, i) => `

                        <tr style="background: ${i % 2 === 0 ? '#ffffff' : '#f8fafc'};">

                            <td style="padding: 6px 10px; border: 1px solid #cbd5e1; text-align: center; font-weight: 800;">${i + 1}</td>

                            <td style="padding: 6px 10px; border: 1px solid #cbd5e1; font-family: monospace; font-weight: 800; color: #0284c7;">${t.code}</td>

                            <td style="padding: 6px 10px; border: 1px solid #cbd5e1; font-weight: 700;">${t.name}</td>

                            <td style="padding: 6px 10px; border: 1px solid #cbd5e1; color: #64748b;">${t.brand || '-'}</td>

                            <td style="padding: 6px 10px; border: 1px solid #cbd5e1; font-family: monospace;">${t.serial || 'S/N'}</td>

                            <td style="padding: 6px 10px; border: 1px solid #cbd5e1; text-align: center; color: #059669; font-weight: 800;">Operativo</td>

                        </tr>

                    `).join('')}

                </tbody>

            </table>



            <!-- Observaciones -->

            <div style="background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 14px; margin-bottom: 24px; font-size: 11px;">

                <strong>Observaciones / Condición de Custodia:</strong> ${document.getElementById("tg_notes")?.value || 'Equipos verificados y entregados en condiciones 100% operativas para faena de obra.'}

            </div>



            <!-- Bloque Formal de 3 Firmas de Responsabilidad -->

            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; text-align: center; margin-top: 36px; font-size: 11px;">

                <div style="border-top: 1px solid #475569; padding-top: 6px;">

                    <strong style="color: #002B49;">Despachado por:</strong><br>

                    <span style="color: #64748b; font-size: 10px;">Almacén Central / Custodia Dalor</span>

                </div>

                <div style="border-top: 1px solid #475569; padding-top: 6px;">

                    <strong style="color: #002B49;">Transportado por:</strong><br>

                    <span style="color: #64748b; font-size: 10px;">${driver} (Chofer)</span>

                </div>

                <div style="border-top: 1px solid #475569; padding-top: 6px;">

                    <strong style="color: #002B49;">Recibido Conforme en Obra:</strong><br>

                    <span style="color: #64748b; font-size: 10px;">Supervisor / Residente de Obra</span>

                </div>

            </div>

        </div>

        `;

        openModal("modalPrintPreview");

    }

}






// Exponer al objeto global window para eventos inline y compatibilidad
if (typeof window !== 'undefined') {
    window.openTransferGuideModal = openTransferGuideModal;
    window.onTransferGuideProjectChanged = onTransferGuideProjectChanged;
    window.renderTransferToolsChecklist = renderTransferToolsChecklist;
    window.filterTransferToolsChecklist = filterTransferToolsChecklist;
    window.submitGenerateTransferGuide = submitGenerateTransferGuide;
}
