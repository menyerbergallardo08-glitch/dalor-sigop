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

// --- BLOQUE L12740-L13126 ---
// ==============================================================================

// 📦 NOTA DE ENTREGA DE MATERIALES (PARA JEFE DE MATERIALES / ALMACÉN)

// ==============================================================================

async function openMaterialDeliveryModal() {
    const form = document.getElementById("materialDeliveryForm");
    if (form) form.reset();

    let projects = (window.allProjects && window.allProjects.length > 0) ? window.allProjects : (allProjects || []);
    if (projects.length === 0) {
        try {
            const res = await authFetch(`${API_BASE}/projects/`);
            if (res.ok) {
                projects = await res.json();
                window.allProjects = allProjects = projects;
            }
        } catch(e) {
            console.error("Error cargando proyectos para despacho:", e);
        }
    }

    // Filtrar estrictamente solo obras ABIERTAS / ACTIVAS
    const openProjects = (projects || []).filter(p => {
        const st = (p.status || '').toLowerCase().trim();
        return !['culminado', 'completado', 'cerrado', 'cancelado', 'finalizado', 'inactivo'].includes(st);
    });

    const sel = document.getElementById("md_project_id");
    if (sel) {
        if (openProjects.length === 0) {
            sel.innerHTML = `<option value="">⚠️ No hay obras abiertas disponibles para despacho</option>`;
        } else {
            sel.innerHTML = `<option value="">-- Seleccione Proyecto Aprobado Destino --</option>` +
                openProjects.map(p => `<option value="${p.id}" data-location="${p.location || ''}">[${p.code}] ${p.name}</option>`).join('');
        }
    }

    onMaterialDeliveryProjectChanged();
    openModal("modalMaterialDelivery");
}



function onMaterialDeliveryProjectChanged() {

    const sel = document.getElementById("md_project_id");

    if (!sel || !sel.options[sel.selectedIndex]) return;

    const projId = parseInt(sel.value);

    const proj = allProjects.find(p => p.id === projId);



    const loc = (proj && proj.location) || "Frente de Obra / Planta";

    const destInput = document.getElementById("md_destination");

    if (destInput) destInput.value = loc;



    const dispInput = document.getElementById("md_dispatcher_name");

    if (dispInput && !dispInput.value) {

        dispInput.value = "Jefe de Materiales / Almacén Central";

    }



    const recvInput = document.getElementById("md_receiver_name");

    if (recvInput && !recvInput.value) {

        recvInput.value = (proj && proj.client_name) ? `Supervisor / Residente (${proj.client_name})` : "Supervisor Residente de Obra";

    }



    renderInitialMaterialDeliveryRows();

}



function renderInitialMaterialDeliveryRows() {

    const tbody = document.getElementById("md_materials_tbody");

    if (!tbody) return;

    tbody.innerHTML = '';

    

    // Si hay materiales en inventario, precargar los primeros 2

    if (allMaterials && allMaterials.length > 0) {

        for (let i = 0; i < Math.min(2, allMaterials.length); i++) {

            addMaterialDeliveryRow(allMaterials[i].name, allMaterials[i].unit_measure || 'Pza', 1);

        }

    } else {

        addMaterialDeliveryRow('Cable THW 12 AWG', 'Metro (m)', 50);

        addMaterialDeliveryRow('Breaker 2x30A', 'Pza', 2);

    }

}



function addMaterialDeliveryRow(defaultName = '', defaultUnit = 'Pza', defaultQty = 1) {

    const tbody = document.getElementById("md_materials_tbody");

    if (!tbody) return;



    const tr = document.createElement("tr");

    tr.style.borderBottom = "1px solid #f1f5f9";

    tr.innerHTML = `

        <td style="padding: 4px 6px;">

            <input type="text" class="form-input md-item-name" value="${defaultName}" placeholder="Descripción del material..." style="padding: 4px 6px; font-size: 11px;" required>

        </td>

        <td style="padding: 4px 6px;">

            <input type="text" class="form-input md-item-unit" value="${defaultUnit}" placeholder="Pza, m, etc." style="padding: 4px 6px; font-size: 11px; text-align: center;">

        </td>

        <td style="padding: 4px 6px;">

            <input type="number" step="0.01" class="form-input md-item-qty" value="${defaultQty}" style="padding: 4px 6px; font-size: 11px; text-align: right; font-weight: 800;" required>

        </td>

        <td style="padding: 4px 6px; text-align: center;">

            <button type="button" onclick="this.closest('tr').remove()" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 13px;">&times;</button>

        </td>

    `;

    tbody.appendChild(tr);

}



function submitGenerateMaterialDeliveryGuide(event) {

    event.preventDefault();

    const projId = parseInt(document.getElementById("md_project_id").value);

    const dest = document.getElementById("md_destination").value.trim();

    const dispatcher = document.getElementById("md_dispatcher_name").value.trim();

    const receiver = document.getElementById("md_receiver_name").value.trim();

    const notes = document.getElementById("md_notes").value.trim();



    const items = [];

    document.querySelectorAll("#md_materials_tbody tr").forEach(row => {

        const name = row.querySelector(".md-item-name")?.value.trim();

        const unit = row.querySelector(".md-item-unit")?.value.trim() || "Pza";

        const qty = parseFloat(row.querySelector(".md-item-qty")?.value) || 0;

        if (name && qty > 0) {

            items.push({ name, unit, qty });

        }

    });



    if (items.length === 0) {

        alert("Por favor ingresa al menos un material con cantidad válida.");

        return;

    }



    const proj = allProjects.find(p => p.id === projId) || { code: "DAL-2026-001", name: "Proyecto en Obra", client_name: "General" };

    const guideNumber = `NE-MAT-${Date.now().toString().slice(-6)}`;

    const nowStr = new Date().toLocaleDateString('es-VE') + ' ' + new Date().toLocaleTimeString('es-VE', {hour: '2-digit', minute:'2-digit'});



    closeModal("modalMaterialDelivery");



    // MOSTRAR FORMATO OFICIAL FORMAL LISTO PARA IMPRIMIR O GUARDAR EN PDF

    const printArea = document.getElementById("modalPrintPreviewContent");

    const titleEl = document.getElementById("previewModalTitle");

    if (titleEl) titleEl.innerText = "Nota Oficial de Entrega de Materiales - Dalor C.A.";



    if (printArea) {

        printArea.innerHTML = `

        <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; padding: 25px; background: #fff;">

            <!-- Header Membretado Oficial DALOR -->

            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #002B49; padding-bottom: 12px; margin-bottom: 16px;">

                <div style="display: flex; align-items: center; gap: 12px;">
                    <img src="logo_dalor.jpg" alt="DALOR" style="height: 48px; display: block; border-radius: 4px;" onerror="this.style.display='none'">
                    <div>
                        <h2 style="margin: 0; color: #002B49; font-size: 20px; font-weight: 900; letter-spacing: 0.5px;">METALMECÁNICA DALOR, C.A.</h2>
                        <p style="margin: 2px 0 0 0; font-size: 11px; color: #0284c7; font-weight: 700;">RIF: <b>J-31601195-0</b> &bull; Mantenimiento Predictivo, Proyectos Industriales & Metalmecánica</p>
                        <p style="margin: 2px 0 0 0; font-size: 10px; color: #64748b;">Av. Cámara de las Industrias, Galpón 10, Z.I. El Tigre, Guacara, Edo. Carabobo</p>
                    </div>
                </div>

                <div style="text-align: right;">

                    <div style="background: #059669; color: #fff; padding: 6px 14px; border-radius: 6px; font-weight: 900; font-size: 13px; letter-spacing: 0.5px;">

                        NOTA DE ENTREGA DE MATERIALES

                    </div>

                    <div style="font-size: 13px; font-weight: 900; color: #002B49; margin-top: 5px;">

                        N°: ${guideNumber}

                    </div>

                    <div style="font-size: 11px; color: #64748b;">

                        Fecha: ${nowStr}

                    </div>

                </div>

            </div>



            <!-- Ficha de Destinatario y Entrega -->

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 11px;">

                <tr style="background: #f8fafc;">

                    <td style="padding: 6px 10px; border: 1px solid #cbd5e1; font-weight: 700; width: 20%; color: #475569;">Proyecto / Obra:</td>

                    <td style="padding: 6px 10px; border: 1px solid #cbd5e1; width: 30%; font-weight: 800; color: #059669;">[${proj.code}] ${proj.name}</td>

                    <td style="padding: 6px 10px; border: 1px solid #cbd5e1; font-weight: 700; width: 20%; color: #475569;">Lugar de Entrega:</td>

                    <td style="padding: 6px 10px; border: 1px solid #cbd5e1; width: 30%; font-weight: 700;">${dest}</td>

                </tr>

                <tr>

                    <td style="padding: 6px 10px; border: 1px solid #cbd5e1; font-weight: 700; color: #475569;">Despachado Por:</td>

                    <td style="padding: 6px 10px; border: 1px solid #cbd5e1; font-weight: 700;">${dispatcher}</td>

                    <td style="padding: 6px 10px; border: 1px solid #cbd5e1; font-weight: 700; color: #475569;">Receptor en Obra:</td>

                    <td style="padding: 6px 10px; border: 1px solid #cbd5e1; font-weight: 800; color: #002B49;">${receiver}</td>

                </tr>

            </table>



            <!-- Tabla de Materiales Despachados -->

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 11px;">

                <thead>

                    <tr style="background: #002B49; color: #ffffff;">

                        <th style="padding: 8px 10px; border: 1px solid #002B49; width: 40px; text-align: center;">Item</th>

                        <th style="padding: 8px 10px; border: 1px solid #002B49;">Descripción de Material / Insumo</th>

                        <th style="padding: 8px 10px; border: 1px solid #002B49; width: 100px; text-align: center;">Unidad</th>

                        <th style="padding: 8px 10px; border: 1px solid #002B49; width: 110px; text-align: right;">Cantidad Entregada</th>

                    </tr>

                </thead>

                <tbody>

                    ${items.map((it, i) => `

                        <tr style="background: ${i % 2 === 0 ? '#ffffff' : '#f8fafc'};">

                            <td style="padding: 6px 10px; border: 1px solid #cbd5e1; text-align: center; font-weight: 800;">${i + 1}</td>

                            <td style="padding: 6px 10px; border: 1px solid #cbd5e1; font-weight: 700;">${it.name}</td>

                            <td style="padding: 6px 10px; border: 1px solid #cbd5e1; text-align: center; color: #64748b;">${it.unit}</td>

                            <td style="padding: 6px 10px; border: 1px solid #cbd5e1; text-align: right; font-weight: 900; color: #059669; font-size: 12px;">${it.qty}</td>

                        </tr>

                    `).join('')}

                </tbody>

            </table>



            <!-- Observaciones -->

            <div style="background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 14px; margin-bottom: 24px; font-size: 11px;">

                <strong>Observaciones de Despacho:</strong> ${notes || 'Material verificado en almacén, embalado y entregado conforme para instalación inmediata en obra.'}

            </div>



            <!-- Bloque de Firmas -->

            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; text-align: center; margin-top: 36px; font-size: 11px;">

                <div style="border-top: 1px solid #475569; padding-top: 6px;">

                    <strong style="color: #002B49;">Despachado por:</strong><br>

                    <span style="color: #64748b; font-size: 10px;">${dispatcher}</span>

                </div>

                <div style="border-top: 1px solid #475569; padding-top: 6px;">

                    <strong style="color: #002B49;">Transportado por:</strong><br>

                    <span style="color: #64748b; font-size: 10px;">Chofer / Transportista</span>

                </div>

                <div style="border-top: 1px solid #475569; padding-top: 6px;">

                    <strong style="color: #002B49;">Recibido Conforme en Obra:</strong><br>

                    <span style="color: #64748b; font-size: 10px;">${receiver}</span>

                </div>

            </div>

        </div>

        `;

        openModal("modalPrintPreview");

    }

}


// Exponer al objeto global window para eventos inline y compatibilidad
if (typeof window !== 'undefined') {
    window.openMaterialDeliveryModal = openMaterialDeliveryModal;
    window.onMaterialDeliveryProjectChanged = onMaterialDeliveryProjectChanged;
    window.renderInitialMaterialDeliveryRows = renderInitialMaterialDeliveryRows;
    window.addMaterialDeliveryRow = addMaterialDeliveryRow;
    window.submitGenerateMaterialDeliveryGuide = submitGenerateMaterialDeliveryGuide;
}
