// Sigop ERP - Submódulo de Proyectos Modularizado
const API_BASE = (typeof window !== 'undefined' && window.API_BASE) || '/api/v1';

const authFetch = (url, options = {}) => {
    const token = (typeof localStorage !== 'undefined' && localStorage.getItem('token')) || (typeof window !== 'undefined' && window.authToken);
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (options.body instanceof FormData) {
        delete headers['Content-Type'];
    }
    return window.fetch(url, { ...options, headers });
};

// --- BLOQUE L14267-L14456 ---
// ==============================================================================

// 🌟 MÓDULOS MAESTROS DALOR: SEGUIMIENTO PÚBLICO, MULTIMONEDA & RETENCIONES SENIAT

// ==============================================================================



function resolveCurrentProjectId(projIdOrCode) {
    if (typeof projIdOrCode === 'number' && !isNaN(projIdOrCode)) return projIdOrCode;
    if (typeof projIdOrCode === 'string' && !isNaN(parseInt(projIdOrCode, 10)) && /^\d+$/.test(projIdOrCode.trim())) {
        return parseInt(projIdOrCode.trim(), 10);
    }
    if (window.currentViewingProjectId) return window.currentViewingProjectId;
    if (typeof currentViewingProjectId !== 'undefined' && currentViewingProjectId) return currentViewingProjectId;
    const modalEl = document.getElementById("modalProjectDetail");
    if (modalEl && modalEl.dataset && modalEl.dataset.projectId) {
        return parseInt(modalEl.dataset.projectId, 10);
    }
    const codeEl = document.getElementById("detail_proj_code");
    if (codeEl && codeEl.innerText) {
        const rawCode = codeEl.innerText.trim();
        const found = (window.allProjects || []).find(p => p.code === rawCode);
        if (found) return found.id;
    }
    return null;
}

/// Copiar Enlace de Seguimiento Público de Proyecto para Clientes
// Enlace de Seguimiento Público de Proyecto para Clientes (Portal Ciego a Costos)
async function copyProjectClientTrackingLink(projIdOrCode) {
    let token = null;
    let projId = resolveCurrentProjectId(projIdOrCode);
    
    // Si se pasa un código de proyecto string que no sea número
    if (typeof projIdOrCode === 'string' && isNaN(parseInt(projIdOrCode, 10))) {
        token = projIdOrCode;
    }

    if (projId) {
        try {
            const res = await authFetch(`${API_BASE}/projects/${projId}/tracking-token`, { method: 'POST' });
            if (res.ok) {
                const data = await res.json();
                token = data.tracking_token || data.project_code;
            }
        } catch(e) {
            console.error('Error generating token:', e);
        }
    }

    if (!token && window.allProjects && projId) {
        const p = window.allProjects.find(x => x.id == projId);
        if (p) token = p.tracking_token || p.code;
    }
    
    const url = window.location.origin + '/seguimiento/' + (token || 'PRJ-2026-001');
    if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
    }
    
    if (typeof showToastNotification === 'function') {
        showToastNotification(`🔗 Enlace copiado al portapapeles: ${url}`, 'success');
    } else {
        alert(`🔗 Enlace de Seguimiento para Cliente copiado al portapapeles:\n\n${url}`);
    }
}

async function shareProjectViaWhatsApp(projIdOrCode) {
    let projId = resolveCurrentProjectId(projIdOrCode);
    let proj = (window.allProjects || []).find(p => p.id == projId) || { name: 'Proyecto', code: 'PRJ' };

    let token = proj.tracking_token || proj.code;
    if (projId) {
        try {
            const res = await authFetch(`${API_BASE}/projects/${projId}/tracking-token`, { method: 'POST' });
            if (res.ok) {
                const data = await res.json();
                token = data.tracking_token || token;
            }
        } catch(e) {}
    }

    const trackingUrl = `${window.location.origin}/seguimiento/${token}`;
    const text = `*Metalmecánica Dalor, C.A.*%0A%0AEstimado cliente, puede consultar el avance en tiempo real y cronograma del proyecto *${encodeURIComponent(proj.name)}* en el siguiente enlace oficial:%0A${encodeURIComponent(trackingUrl)}%0A%0AGracias por confiar en nuestros servicios.`;
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
}

async function printProjectProgressReport(projIdOrCode) {
    const projId = resolveCurrentProjectId(projIdOrCode);
    if (!projId) {
        alert("Por favor abra la ficha de un proyecto para generar el reporte de avance en PDF.");
        return;
    }
    try {
        const res = await authFetch(`${API_BASE}/projects/${projId}/details`);
        if (!res.ok) throw new Error("Error al obtener datos del proyecto (" + res.status + ")");
        const proj = await res.json();

        let phasesRows = (proj.phases || []).map((ph, idx) => `
            <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 8px; font-weight: 800; color: #002B49;">Etapa ${idx + 1}</td>
                <td style="padding: 8px; font-weight: 700;">${ph.name}</td>
                <td style="padding: 8px; text-align: center;">${ph.duration_days} días</td>
                <td style="padding: 8px; text-align: center;">
                    <span style="font-size: 11px; padding: 3px 8px; border-radius: 4px; font-weight: 800; ${ph.status === 'completado' ? 'background: #dcfce7; color: #166534;' : (ph.status === 'en_progreso' ? 'background: #e0f2fe; color: #0369a1;' : 'background: #f1f5f9; color: #64748b;')}">
                        ${ph.status === 'completado' ? '✅ Culminada' : (ph.status === 'en_progreso' ? '🔄 En Progreso' : '⏳ Pendiente')}
                    </span>
                </td>
            </tr>
        `).join('');

        const printHtml = `
        <div style="font-family: Arial, sans-serif; color: #1e293b; max-width: 800px; margin: auto; padding: 24px; border: 1px solid #cbd5e1; background: #fff;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #F5B800; padding-bottom: 12px; margin-bottom: 16px;">
                <div style="display: flex; align-items: center; gap: 14px;">
                    <img src="logo_dalor.jpg" alt="DALOR" style="height: 50px; max-width: 140px; object-fit: contain;" onerror="this.style.display='none'">
                    <div>
                        <h1 style="font-size: 18px; font-weight: 900; color: #002B49; margin: 0; text-transform: uppercase;">Metalmecánica Dalor, C.A.</h1>
                        <p style="font-size: 11px; color: #0284c7; margin: 2px 0 0 0; font-weight: 700;">RIF: J-31601195-0 &bull; Guacara, Edo. Carabobo</p>
                    </div>
                </div>
                <div style="text-align: right; border: 2px solid #002B49; padding: 6px 12px; border-radius: 6px; background: #f8fafc;">
                    <div style="font-size: 10px; font-weight: 900; color: #002B49;">REPORTE OFICIAL DE AVANCE DE OBRA</div>
                    <div style="font-size: 15px; font-weight: 900; color: #0284c7;">${proj.code}</div>
                    <div style="font-size: 10px; color: #64748b;">Fecha: ${new Date().toLocaleDateString('es-VE')}</div>
                </div>
            </div>

            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                <h2 style="font-size: 15px; font-weight: 800; color: #002B49; margin: 0 0 6px 0;">${proj.name}</h2>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12px;">
                    <div><b>Cliente:</b> ${proj.client_name || 'General'}</div>
                    <div><b>Ubicación:</b> ${proj.location || 'Sede Central'}</div>
                    <div><b>Duración Estimada:</b> ${proj.duration_days} días</div>
                    <div><b>Avance Físico Global:</b> <span style="font-weight: 800; color: #059669;">${proj.progress_pct || 0}%</span></div>
                </div>
                ${proj.scope_of_work ? `<p style="font-size: 11px; color: #475569; margin: 8px 0 0 0; border-top: 1px dashed #cbd5e1; padding-top: 6px;"><b>Alcance del Trabajo:</b> ${proj.scope_of_work}</p>` : ''}
            </div>

            <h3 style="font-size: 13px; font-weight: 800; color: #002B49; margin-bottom: 8px;">Desglose de Fases y Cronograma de Ejecución:</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 24px;">
                <thead style="background: #f1f5f9; border-bottom: 2px solid #cbd5e1;">
                    <tr>
                        <th style="padding: 8px; text-align: left;">Fase</th>
                        <th style="padding: 8px; text-align: left;">Descripción de la Actividad</th>
                        <th style="padding: 8px; text-align: center;">Duración</th>
                        <th style="padding: 8px; text-align: center;">Estado</th>
                    </tr>
                </thead>
                <tbody>
                    ${phasesRows}
                </tbody>
            </table>

            <div style="display: flex; justify-content: space-between; margin-top: 40px; padding-top: 10px;">
                <div style="text-align: center; width: 45%; border-top: 1px solid #94a3b8; padding-top: 6px; font-size: 11px;">
                    <b>Ingeniero Residente / Supervisor DALOR</b><br>Firma y Sello
                </div>
                <div style="text-align: center; width: 45%; border-top: 1px solid #94a3b8; padding-top: 6px; font-size: 11px;">
                    <b>Inspector Técnico del Cliente</b><br>Firma y Conformidad
                </div>
            </div>
        </div>
        `;

        const container = document.getElementById("modalPrintPreviewContent");
        if (container) {
            container.innerHTML = printHtml;
            const titleEl = document.getElementById("previewModalTitle");
            if (titleEl) titleEl.innerText = `Reporte de Avance de Obra - ${proj.code}`;
            if (typeof window.openModal === 'function') {
                window.openModal('modalPrintPreview');
            } else {
                const modalEl = document.getElementById('modalPrintPreview');
                if (modalEl) modalEl.classList.remove('hidden');
            }
        } else {
            const w = window.open('', '_blank');
            if (w) {
                w.document.write(`<html><head><title>Avance de Obra - ${proj.code}</title></head><body style="margin: 20px;">${printHtml}</body></html>`);
                w.document.close();
                setTimeout(() => { w.focus(); w.print(); }, 400);
            }
        }
    } catch(e) {
        alert("Error al generar reporte PDF: " + e.message);
    }
}



// Toggle Activo / Inactivo en Activos y Equipos

window.toggleAssetActive = async function(assetId) {
    try {
        const res = await authFetch(`${API_BASE}/assets/${assetId}/toggle-active`, { method: 'POST' });
        if (!res.ok) throw new Error('No se pudo cambiar el estado del activo.');
        const data = await res.json();
        showToastNotification(`Activo actualizado: ${data.status_label}`, 'success');
        if (typeof loadAssetsList === 'function') loadAssetsList();
        if (typeof loadFleetView === 'function') loadFleetView();
    } catch(err) {
        showToastNotification(`Error: ${err.message}`, 'error');
    }
};

// Cambio dinámico de moneda en cotización
window.onQuotationCurrencyChanged = function() {
    const cur = document.getElementById("quote_currency")?.value || "USD";
    const symbol = cur === "VES" ? "Bs." : (cur === "EUR" ? "€" : "$");
    const labelSub = document.querySelector("#quote_subtotal_display")?.previousElementSibling;
    const labelTot = document.querySelector("#quote_total_display")?.previousElementSibling;
    if (labelSub) labelSub.innerText = `Subtotal (${symbol})`;
    if (labelTot) labelTot.innerText = `Total Cotizado (${symbol})`;
    if (typeof recalcQuotationTotals === 'function') recalcQuotationTotals();
};

async function deleteReceivable(cxcId, invoiceNum) {
    if (!confirm(`¿Estás seguro de anular / eliminar la Cuenta por Cobrar [${invoiceNum || cxcId}]?`)) return;
    try {
        const res = await authFetch(`${API_BASE}/financial/cxc/${cxcId}`, { method: 'DELETE' });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || "Error al anular CxC");
        }

        await loadReceivablesList();

        if (typeof showToastNotification === 'function') {

            showToastNotification(`🗑️ Cuenta por cobrar [${invoiceNum}] eliminada con éxito.`, 'success');

        } else {

            alert(`🗑️ Cuenta por cobrar eliminada con éxito.`);

        }

    } catch(err) {

        alert("Error al anular CxC: " + err.message);

    }

}










// ==============================================================================
// ➕ GESTIÓN DE ADENDAS CONTRACTUALES & OBRAS EXTRAS (+USD)
// ==============================================================================
async function openAddendumModal(projectId) {
    const pId = projectId || window.currentViewingProjectId;
    if (!pId) {
        alert("Seleccione un proyecto válido.");
        return;
    }

    const safeProjects = (window.allProjects && window.allProjects.length > 0) ? window.allProjects : (allProjects || []);
    let proj = safeProjects.find(p => p.id == pId);

    if (!proj) {
        try {
            const token = window.authToken || localStorage.getItem('dalor_token') || null;
            const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
            const res = await authFetch(`${API_BASE}/projects/${pId}/details`, { headers });
            if (res.ok) proj = await res.json();
        } catch(e) {
            console.error("Error fetching project for addendum:", e);
        }
    }

    const idInput = document.getElementById("addendum_project_id");
    if (idInput) idInput.value = String(pId);

    const codeEl = document.getElementById("addendum_project_code");
    if (codeEl) codeEl.textContent = proj?.code || `PRJ-${pId}`;

    const nameEl = document.getElementById("addendum_project_name");
    if (nameEl) nameEl.textContent = proj?.name || "Proyecto";

    const contractEl = document.getElementById("addendum_current_contract");
    if (contractEl) contractEl.textContent = `$${Number(proj?.contract_amount_usd || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} USD`;

    // Resetear formulario
    const form = document.getElementById("formProjectAddendum");
    if (form) form.reset();
    if (idInput) idInput.value = String(pId);

    const authInput = document.getElementById("addendum_authorized_by");
    if (authInput) authInput.value = "Dirección General";

    openModal("modalProjectAddendum");
}

async function submitProjectAddendum(event) {
    if (event) event.preventDefault();

    const pId = document.getElementById("addendum_project_id")?.value;
    const title = document.getElementById("addendum_title")?.value?.trim();
    const amountUsd = parseFloat(document.getElementById("addendum_amount_usd")?.value) || 0;
    const scope = document.getElementById("addendum_scope")?.value?.trim() || null;
    const authorizedBy = document.getElementById("addendum_authorized_by")?.value?.trim() || "Dirección General";
    const matUsd = parseFloat(document.getElementById("addendum_mat_usd")?.value) || 0.0;
    const laborUsd = parseFloat(document.getElementById("addendum_labor_usd")?.value) || 0.0;
    const newPhase = document.getElementById("addendum_new_phase")?.value?.trim() || null;

    if (!pId) {
        alert("Error: ID del proyecto no identificado.");
        return;
    }
    if (!title) {
        alert("Indique el título de la adenda contractual.");
        return;
    }
    if (amountUsd <= 0) {
        alert("El monto adicional del contrato debe ser mayor a 0.");
        return;
    }

    try {
        const token = window.authToken || localStorage.getItem('dalor_token') || null;
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const payload = {
            title: title,
            scope_description: scope,
            additional_contract_usd: amountUsd,
            additional_materials_usd: matUsd,
            additional_labor_usd: laborUsd,
            authorized_by: authorizedBy,
            new_phase_name: newPhase || `Adenda: ${title}`
        };

        const res = await authFetch(`${API_BASE}/projects/${pId}/addendums`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.detail || `Error HTTP ${res.status}`);
        }

        const addendumData = await res.json();
        closeModal("modalProjectAddendum");

        if (typeof showToastNotification === 'function') {
            showToastNotification(`✅ Adenda N° ${addendumData.addendum_number} aplicada con éxito (+ $${amountUsd.toLocaleString()} USD) y generada automáticamente en Cuentas por Cobrar (CxC).`, 'success');
        } else {
            alert(`✅ Adenda N° ${addendumData.addendum_number} aplicada con éxito (+ $${amountUsd.toLocaleString()} USD) y generada automáticamente en Cuentas por Cobrar (CxC).`);
        }

        // Recargar proyectos, CxC y refrescar vista de detalles de la obra
        if (typeof loadProjectsList === 'function') {
            await loadProjectsList();
        }
        if (typeof loadReceivablesList === 'function') {
            await loadReceivablesList();
        }
        if (typeof viewProjectDetails === 'function') {
            await viewProjectDetails(pId);
        }
    } catch(err) {
        console.error("Error al registrar adenda:", err);
        alert("Error al registrar adenda: " + err.message);
    }
}

function goToProjectCxC(projIdOrCode) {
    closeModal("modalProjectDetail");
    let proj = (window.allProjects || []).find(p => p.id == projIdOrCode || p.code == projIdOrCode);
    let searchTerm = proj ? (proj.code || proj.name) : String(projIdOrCode);
    if (typeof switchView === 'function') switchView('financial');
    setTimeout(() => {
        if (typeof switchFinancialSubtab === 'function') switchFinancialSubtab('cxc');
        const searchInp = document.getElementById('cxcSearchInput');
        if (searchInp) {
            searchInp.value = searchTerm;
            if (typeof filterCxcList === 'function') filterCxcList(searchTerm);
        }
    }, 150);
}

function openAddPhaseModal(projectId) {
    const pId = projectId || window.currentViewingProjectId;
    if (!pId) return;
    const form = document.getElementById("formAddProjectPhase");
    if (form) form.reset();
    const idInput = document.getElementById("add_phase_project_id");
    if (idInput) idInput.value = String(pId);
    openModal("modalAddProjectPhase");
}

async function submitAddProjectPhase(event) {
    if (event) event.preventDefault();
    const pId = document.getElementById("add_phase_project_id")?.value;
    const name = document.getElementById("add_phase_name")?.value?.trim();
    const rawDur = document.getElementById("add_phase_duration_val")?.value || document.getElementById("add_phase_days")?.value || "7";
    const durVal = parseLocalizedNumber(rawDur) || 7;
    const durUnit = document.getElementById("add_phase_duration_unit")?.value || "dias";
    const days = durUnit === "horas" ? Math.max(1, Math.round(durVal / 8)) : Math.max(1, Math.round(durVal));
    const cost = parseLocalizedNumber(document.getElementById("add_phase_cost")?.value) || 0.0;
    const resp = document.getElementById("add_phase_responsible")?.value?.trim() || "";

    if (!pId || !name) {
        alert("Por favor indique el nombre de la etapa.");
        return;
    }

    try {
        const res = await authFetch(`${API_BASE}/projects/${pId}/phases`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: name,
                duration_days: days,
                duration_unit: durUnit,
                estimated_duration: durVal,
                estimated_cost_usd: cost,
                responsible_person: resp
            })
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || "Error al agregar etapa.");
        }

        closeModal("modalAddProjectPhase");
        if (typeof showToastNotification === 'function') {
            showToastNotification(`✅ Etapa '${name}' agregada con éxito al cronograma.`, "success");
        }
        await viewProjectDetails(pId);
        if (typeof loadProjectsList === 'function') await loadProjectsList();
    } catch (e) {
        console.error("Error al crear etapa:", e);
        alert("Error: " + (e.message || e));
    }
}

async function addProjectTask(projectId, phaseId) {
    const inp = document.getElementById(`new_task_inp_${phaseId}`);
    const taskName = inp?.value?.trim();
    if (!taskName) {
        alert("Escriba la descripción de la tarea antes de agregar.");
        return;
    }

    try {
        const res = await authFetch(`${API_BASE}/projects/${projectId}/phases/${phaseId}/tasks`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ task_name: taskName })
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || "Error al agregar tarea.");
        }

        if (inp) inp.value = "";
        await viewProjectDetails(projectId);
    } catch (e) {
        console.error("Error al agregar tarea:", e);
        alert("Error: " + (e.message || e));
    }
}

async function deleteProjectTask(projectId, phaseId, taskIndex) {
    if (!confirm("¿Está seguro de eliminar esta tarea de la etapa?")) return;

    try {
        const res = await authFetch(`${API_BASE}/projects/${projectId}/phases/${phaseId}/tasks/${taskIndex}`, {
            method: "DELETE"
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || "Error al eliminar tarea.");
        }

        await viewProjectDetails(projectId);
    } catch (e) {
        console.error("Error al eliminar tarea:", e);
        alert("Error: " + (e.message || e));
    }
}

async function openDirectResourceAssignModal(resourceType) {
    const pId = window.currentViewingProjectId;
    if (pId) {
        return openRequestProjectResourcesModal(pId);
    }
}

async function submitDirectResourceAssign(event) {
    if (event) event.preventDefault();
    const pId = parseInt(document.getElementById("direct_res_project_id")?.value);
    const rType = document.getElementById("direct_res_type")?.value;
    const rId = parseInt(document.getElementById("direct_res_select")?.value);
    const custodian = document.getElementById("direct_res_custodian")?.value?.trim() || "Ing. Residente";
    const notes = document.getElementById("direct_res_notes")?.value?.trim() || "";

    if (!pId || !rId) {
        alert("Por favor seleccione un recurso para asignar.");
        return;
    }

    const apiResourceType = (rType === 'personnel') ? 'personnel' : 'asset';

    try {
        const res = await authFetch(`${API_BASE}/resources/assign`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                project_id: pId,
                resource_type: apiResourceType,
                resource_id: rId,
                custodian_name: custodian,
                notes: notes
            })
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || "Error al asignar recurso.");
        }

        closeModal("modalDirectResourceAssign");
        if (typeof showToastNotification === 'function') {
            showToastNotification("✅ Recurso asignado exitosamente a la obra.", "success");
        }
        await viewProjectDetails(pId);
        if (typeof loadProjectsList === 'function') await loadProjectsList();
    } catch (e) {
        console.error("Error al asignar recurso:", e);
        alert("Error: " + (e.message || e));
    }
}

async function releaseProjectResource(resourceType, resourceId, resourceName, targetProjId) {
    const pId = targetProjId || window.currentViewingProjectId;
    if (!confirm(`¿Confirma retornar ${resourceName || 'el recurso'} a Base Central (Sede Dalor Guacara)?`)) return;

    try {
        const res = await authFetch(`${API_BASE}/resources/return-to-base`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                resource_type: resourceType,
                resource_id: resourceId,
                return_location: "Sede Central Dalor (Guacara)"
            })
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || "Error al liberar recurso.");
        }

        // Invalidar caché en memoria para disponibilidad reactiva inmediata sin recargar página
        window.allAssets = [];
        window.allPersonnel = [];

        if (typeof showToastNotification === 'function') {
            showToastNotification(`✅ ${resourceName || 'Recurso'} retornado y DISPONIBLE en Base Central.`, "success");
        }
        if (pId) await viewProjectDetails(pId);
        if (typeof loadProjectsList === 'function') await loadProjectsList();
        if (typeof populatePlanDropdownSelectors === 'function') await populatePlanDropdownSelectors();
        if (typeof window.loadFleetList === 'function') window.loadFleetList();
        if (typeof window.loadMachineryList === 'function') window.loadMachineryList();
        if (typeof window.loadToolsList === 'function') window.loadToolsList();
        if (typeof window.loadPersonnelTableList === 'function') window.loadPersonnelTableList();
        if (typeof window.loadResourcesList === 'function') window.loadResourcesList();
        if (typeof window.loadProjectRequisitionsBadge === 'function') window.loadProjectRequisitionsBadge();
    } catch (e) {
        console.error("Error al liberar recurso:", e);
        alert("Error: " + (e.message || e));
    }
}

function onSubstituteReasonChange(val) {
    const customInp = document.getElementById("sub_res_custom_reason");
    if (customInp) {
        if (val === 'Otro') {
            customInp.classList.remove("hidden");
            customInp.required = true;
            customInp.focus();
        } else {
            customInp.classList.add("hidden");
            customInp.required = false;
            customInp.value = "";
        }
    }
}

async function openSubstituteResourceModal(resourceType, oldId, oldName, projectId) {
    const pId = projectId || window.currentViewingProjectId;
    const typeInp = document.getElementById("sub_res_type");
    const oldIdInp = document.getElementById("sub_res_old_id");
    const projIdInp = document.getElementById("sub_res_project_id");
    const oldDisplay = document.getElementById("sub_res_old_display");
    const newSelect = document.getElementById("sub_res_new_select");
    const titleEl = document.getElementById("modalSubstituteResourceTitle");
    const subtitleEl = document.getElementById("modalSubstituteResourceSubtitle");
    const projBanner = document.getElementById("sub_res_project_banner");
    const projDisplay = document.getElementById("sub_res_project_display");
    const projBadge = document.getElementById("sub_res_project_badge");
    const submitBtn = document.getElementById("btnSubmitSubstituteResource");

    if (typeInp) typeInp.value = resourceType;
    if (oldIdInp) oldIdInp.value = oldId;
    if (projIdInp) projIdInp.value = pId || '';
    if (oldDisplay) oldDisplay.innerHTML = `<strong>${oldName || 'Recurso'}</strong> (ID: ${oldId}) &bull; Será desincorporado de la obra y devuelto a Base`;

    // Validar y mostrar la Obra / Proyecto asociado
    if (!pId) {
        if (projBanner) {
            projBanner.style.background = "#fffbeb";
            projBanner.style.borderColor = "#fcd34d";
        }
        if (projBadge) {
            projBadge.innerText = "Sin Obra";
            projBadge.style.background = "#fef3c7";
            projBadge.style.color = "#92400e";
        }
        if (projDisplay) {
            projDisplay.innerHTML = `<span style="color: #b45309;"><i class="fa-solid fa-triangle-exclamation"></i> Este recurso se encuentra actualmente en <b>Base Central Dalor</b> (no asignado a ninguna obra). La sustitución técnica aplica únicamente para recursos operando en un proyecto.</span>`;
        }
        if (submitBtn) submitBtn.disabled = true;
    } else {
        if (submitBtn) submitBtn.disabled = false;
        if (projBanner) {
            projBanner.style.background = "#eff6ff";
            projBanner.style.borderColor = "#93c5fd";
        }
        if (projBadge) {
            projBadge.innerText = "Obra Activa";
            projBadge.style.background = "#dbeafe";
            projBadge.style.color = "#1e40af";
        }
        if (projDisplay) {
            projDisplay.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Consultando datos de la obra...`;
        }

        const pFound = (window.allProjects || []).find(p => p.id === parseInt(pId));
        if (pFound) {
            if (projDisplay) projDisplay.innerHTML = `<strong>[${pFound.code || 'PRJ'}]</strong> ${pFound.name} &bull; <span style="font-weight: 600; font-size: 11.5px; color: #475569;">Cliente: ${pFound.client_name || 'General'} | Ubicación: ${pFound.location || 'En Obra'}</span>`;
        } else {
            authFetch(`${API_BASE}/projects/${pId}/details`).then(r => r.json()).then(pData => {
                if (projDisplay) projDisplay.innerHTML = `<strong>[${pData.code || 'PRJ'}]</strong> ${pData.name} &bull; <span style="font-weight: 600; font-size: 11.5px; color: #475569;">Cliente: ${pData.client_name || 'General'} | Ubicación: ${pData.location || 'En Obra'}</span>`;
            }).catch(() => {
                if (projDisplay) projDisplay.innerHTML = `<strong>Obra ID: ${pId}</strong> (Asignación activa)`;
            });
        }
    }

    // Abrir modal inmediatamente para retroalimentación instantánea
    openModal("modalSubstituteResource");

    if (newSelect) {
        newSelect.innerHTML = `<option value="">-- Consultando disponibilidad en Base Central... --</option>`;
    }

    if (resourceType === 'personnel') {
        if (titleEl) titleEl.innerHTML = `<i class="fa-solid fa-arrows-rotate" style="color: #2563eb;"></i> Sustituir Personal / Obrero en Obra`;
        if (subtitleEl) subtitleEl.innerText = `Reemplazar a ${oldName || 'trabajador'} por otro operario disponible en Base Central.`;

        try {
            const res = await authFetch(`${API_BASE}/personnel/?include_inactive=false`);
            if (res.ok) {
                const raw = await res.json();
                const list = Array.isArray(raw) ? raw : (raw.items || raw.personnel || []);
                const available = list.filter(p => (!p.current_project_id || p.status === 'disponible_base') && p.id !== oldId);
                if (newSelect) {
                    if (available.length === 0) {
                        newSelect.innerHTML = `<option value="">⚠️ No hay personal disponible en Base Central en este momento.</option>`;
                    } else {
                        newSelect.innerHTML = `<option value="">-- Seleccionar Trabajador Sustituto (${available.length} disponibles) --</option>` +
                            available.map(p => `<option value="${p.id}">[${p.code || 'PER'}] ${p.full_name || p.name} (${p.role_title || 'Operario'})</option>`).join('');
                    }
                }
            } else {
                if (newSelect) newSelect.innerHTML = `<option value="">⚠️ Error al consultar personal en Base</option>`;
            }
        } catch (e) {
            console.error("Error al cargar personal para sustitución:", e);
            if (newSelect) newSelect.innerHTML = `<option value="">⚠️ Error de red al consultar personal</option>`;
        }
    } else {
        // Asset (Tool or Vehicle)
        if (titleEl) titleEl.innerHTML = `<i class="fa-solid fa-arrows-rotate" style="color: #2563eb;"></i> Sustituir Herramienta / Equipo en Obra`;
        if (subtitleEl) subtitleEl.innerText = `Reemplazar ${oldName || 'herramienta'} por otra unidad física operativa disponible en Base.`;

        try {
            const res = await authFetch(`${API_BASE}/assets/`);
            if (res.ok) {
                const raw = await res.json();
                const list = Array.isArray(raw) ? raw : (raw.items || raw.assets || []);
                const available = list.filter(a => (!a.current_project_id || a.status === 'disponible_base') && a.id !== oldId && a.is_active !== false);
                if (newSelect) {
                    if (available.length === 0) {
                        newSelect.innerHTML = `<option value="">⚠️ No hay herramientas disponibles en Base Central.</option>`;
                    } else {
                        newSelect.innerHTML = `<option value="">-- Seleccionar Equipo/Herramienta Sustituto (${available.length} disponibles) --</option>` +
                            available.map(a => `<option value="${a.id}">[${a.asset_code || 'ACT'}] ${a.name} ${a.brand ? `(${a.brand})` : ''} - Ubic: ${a.current_location || 'Base'}</option>`).join('');
                    }
                }
            } else {
                if (newSelect) newSelect.innerHTML = `<option value="">⚠️ Error al consultar herramientas en Base</option>`;
            }
        } catch (e) {
            console.error("Error al cargar herramientas para sustitución:", e);
            if (newSelect) newSelect.innerHTML = `<option value="">⚠️ Error de red al consultar equipos</option>`;
        }
    }
}

async function submitSubstituteResource(event) {
    if (event) {
        if (typeof event.preventDefault === 'function') event.preventDefault();
        if (typeof event.stopPropagation === 'function') event.stopPropagation();
    }

    const pId = parseInt(document.getElementById("sub_res_project_id")?.value) || window.currentViewingProjectId;
    const resType = document.getElementById("sub_res_type")?.value || 'personnel';
    const oldId = parseInt(document.getElementById("sub_res_old_id")?.value);
    const newId = parseInt(document.getElementById("sub_res_new_select")?.value);

    let reason = document.getElementById("sub_res_reason_select")?.value || 'Relevo programado';
    if (reason === 'Otro') {
        reason = (document.getElementById("sub_res_custom_reason")?.value || '').trim() || 'Relevo operativo';
    }
    const notes = (document.getElementById("sub_res_notes")?.value || '').trim();

    if (!newId || isNaN(newId)) {
        alert("Por favor selecciona el recurso sustituto disponible en Base.");
        return;
    }

    const btn = document.getElementById("btnSubmitSubstituteResource");
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Sustituyendo...`;
    }

    try {
        const res = await authFetch(`${API_BASE}/projects/${pId}/substitute-resource`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                resource_type: resType,
                old_id: oldId,
                new_id: newId,
                reason: reason,
                notes: notes
            })
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || "Error al procesar la sustitución");
        }

        const data = await res.json();
        closeModal("modalSubstituteResource");

        window.allAssets = [];
        window.allPersonnel = [];

        if (typeof showToastNotification === 'function') {
            showToastNotification(data.message || "✅ Sustitución de recurso completada con éxito.", "success");
        } else {
            alert(data.message || "✅ Sustitución completada.");
        }

        if (pId) await viewProjectDetails(pId);
        if (typeof loadProjectsList === 'function') await loadProjectsList();
        if (typeof window.loadFleetList === 'function') window.loadFleetList();
        if (typeof window.loadMachineryList === 'function') window.loadMachineryList();
        if (typeof window.loadToolsList === 'function') window.loadToolsList();
        if (typeof window.loadPersonnelTableList === 'function') window.loadPersonnelTableList();
        if (typeof window.loadResourcesList === 'function') window.loadResourcesList();
    } catch (e) {
        console.error(e);
        alert("Error al sustituir recurso: " + e.message);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `<i class="fa-solid fa-arrows-rotate"></i> Confirmar Sustitución`;
        }
    }
}

let substituteCatalogMaterials = [];
let substituteCatalogTools = [];
let currentSubstituteTab = 'materials';
let substituteCurrentMatId = null;

function selectSubstituteItem(id, name, code, costOrBrand, stockOrLoc, unitOrType) {
    const newSelect = document.getElementById("sub_mat_new_select");
    const previewBox = document.getElementById("sub_mat_selected_preview");
    const previewText = document.getElementById("sub_mat_preview_text");
    const cardsContainer = document.getElementById("sub_mat_cards_container");

    if (newSelect) {
        newSelect.innerHTML = `<option value="${id}" selected>${name}</option>`;
        newSelect.value = String(id);
    }
    if (previewText) {
        const extraInfo = currentSubstituteTab === 'tools'
            ? `Ubicación: <b>${stockOrLoc || 'Base Central'}</b>`
            : `Stock disponible: <b>${stockOrLoc} ${unitOrType || 'UND'}</b> &bull; Costo ref: <b>$${parseFloat(costOrBrand || 0).toFixed(2)}</b>`;
        previewText.innerHTML = `<strong>[${code || 'ITEM'}] ${name}</strong> &bull; <span style="color: #0369a1;">${extraInfo}</span>`;
    }
    if (previewBox) previewBox.style.display = 'flex';
    if (cardsContainer) cardsContainer.style.display = 'none';
}

function clearSubstituteMaterialSelection() {
    const newSelect = document.getElementById("sub_mat_new_select");
    const previewBox = document.getElementById("sub_mat_selected_preview");
    const cardsContainer = document.getElementById("sub_mat_cards_container");

    if (newSelect) newSelect.value = '';
    if (previewBox) previewBox.style.display = 'none';
    if (cardsContainer) cardsContainer.style.display = 'flex';
}

function renderSubstituteOptions(list, currentMatId) {
    const newSelect = document.getElementById("sub_mat_new_select");
    const cardsContainer = document.getElementById("sub_mat_cards_container");
    const hintEl = document.getElementById("sub_mat_catalog_hint");
    if (!cardsContainer) return;

    if (!list || list.length === 0) {
        cardsContainer.innerHTML = `<div style="text-align: center; padding: 14px; color: #94a3b8; font-size: 11px;">⚠️ No hay insumos disponibles que coincidan con la búsqueda.</div>`;
        if (newSelect) newSelect.innerHTML = `<option value="">⚠️ No hay insumos disponibles</option>`;
        if (hintEl) hintEl.innerText = "0 insumos encontrados";
        return;
    }

    const available = list.filter(m => !currentMatId || m.id !== currentMatId);

    if (available.length === 0) {
        cardsContainer.innerHTML = `<div style="text-align: center; padding: 14px; color: #94a3b8; font-size: 11px;">⚠️ No hay otros insumos disponibles para sustitución.</div>`;
        if (newSelect) newSelect.innerHTML = `<option value="">⚠️ No hay otros insumos</option>`;
        if (hintEl) hintEl.innerText = "0 insumos disponibles";
        return;
    }

    cardsContainer.innerHTML = available.map(m => {
        const isTool = !!(m.asset_type || m.asset_code);
        const id = m.id;
        const name = (m.name || '').replace(/'/g, "\\'");
        const code = (m.asset_code || m.code || (isTool ? 'ACT' : 'MAT')).replace(/'/g, "\\'");

        if (isTool) {
            const loc = (m.current_location || 'Base Central').replace(/'/g, "\\'");
            const brand = (m.brand || '').replace(/'/g, "\\'");
            return `
            <div onclick="selectSubstituteItem(${id}, '${name}', '${code}', '${brand}', '${loc}', 'EQUIPO')"
                 style="background: white; border: 1px solid #cbd5e1; border-radius: 6px; padding: 7px 10px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; transition: all 0.15s ease;"
                 onmouseover="this.style.borderColor='#0284c7'; this.style.background='#f0f9ff';"
                 onmouseout="this.style.borderColor='#cbd5e1'; this.style.background='white';">
                <div style="display: flex; flex-direction: column; gap: 2px;">
                    <div style="font-size: 11.5px; font-weight: 700; color: var(--dalor-navy);">
                        <i class="fa-solid fa-wrench" style="color: #0284c7; margin-right: 4px;"></i>
                        <strong>[${m.asset_code || 'ACT'}]</strong> ${m.name} ${m.brand ? `<span style="font-size: 10px; color: #64748b;">(${m.brand})</span>` : ''}
                    </div>
                    <div style="font-size: 10.5px; color: #64748b;">
                        Ubicación: <span style="font-weight: 600; color: #0284c7;">${m.current_location || 'Base Central'}</span>
                    </div>
                </div>
                <button type="button" style="pointer-events: none; background: #0284c7; color: white; border: none; border-radius: 4px; padding: 3px 8px; font-size: 10.5px; font-weight: 700;">
                    Elegir <i class="fa-solid fa-arrow-right"></i>
                </button>
            </div>`;
        } else {
            const stock = m.stock_quantity || 0;
            const cost = m.unit_cost_usd || 0;
            const unit = (m.unit_measure || 'UND').replace(/'/g, "\\'");
            const stockColor = stock > 0 ? '#16a34a' : '#dc2626';
            return `
            <div onclick="selectSubstituteItem(${id}, '${name}', '${code}', ${cost}, ${stock}, '${unit}')"
                 style="background: white; border: 1px solid #cbd5e1; border-radius: 6px; padding: 7px 10px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; transition: all 0.15s ease;"
                 onmouseover="this.style.borderColor='#0284c7'; this.style.background='#f0f9ff';"
                 onmouseout="this.style.borderColor='#cbd5e1'; this.style.background='white';">
                <div style="display: flex; flex-direction: column; gap: 2px;">
                    <div style="font-size: 11.5px; font-weight: 700; color: var(--dalor-navy);">
                        <i class="fa-solid fa-box-open" style="color: #059669; margin-right: 4px;"></i>
                        <strong>[${m.code || 'MAT'}]</strong> ${m.name}
                    </div>
                    <div style="font-size: 10.5px; color: #64748b;">
                        Stock disponible: <b style="color: ${stockColor};">${stock} ${m.unit_measure || 'UND'}</b> &bull; Costo ref: $${cost.toFixed(2)}
                    </div>
                </div>
                <button type="button" style="pointer-events: none; background: #059669; color: white; border: none; border-radius: 4px; padding: 3px 8px; font-size: 10.5px; font-weight: 700;">
                    Elegir <i class="fa-solid fa-arrow-right"></i>
                </button>
            </div>`;
        }
    }).join('');

    if (newSelect) {
        newSelect.innerHTML = `<option value="">-- Seleccionar Insumo Sustituto (${available.length} disponibles) --</option>` +
            available.map(m => `<option value="${m.id}">[${m.code || m.asset_code || 'ID'}] ${m.name}</option>`).join('');
    }

    if (hintEl) hintEl.innerText = `${available.length} insumo(s) disponible(s)`;
}

function filterSubstituteCatalogList(searchTerm) {
    const term = (searchTerm || '').trim().toLowerCase();
    const activeList = currentSubstituteTab === 'tools' ? substituteCatalogTools : substituteCatalogMaterials;
    if (!term) {
        renderSubstituteOptions(activeList, substituteCurrentMatId);
        return;
    }
    const filtered = activeList.filter(item => {
        const name = (item.name || '').toLowerCase();
        const code = (item.code || item.asset_code || '').toLowerCase();
        const brand = (item.brand || '').toLowerCase();
        return name.includes(term) || code.includes(term) || brand.includes(term);
    });
    renderSubstituteOptions(filtered, substituteCurrentMatId);
}

function switchSubstituteCatalogTab(tab) {
    currentSubstituteTab = tab;
    clearSubstituteMaterialSelection();
    const tabMatBtn = document.getElementById("sub_mat_tab_materials");
    const tabToolBtn = document.getElementById("sub_mat_tab_tools");
    const searchInp = document.getElementById("sub_mat_search_input");

    if (tab === 'tools') {
        if (tabToolBtn) {
            tabToolBtn.style.background = '#0284c7';
            tabToolBtn.style.color = 'white';
            tabToolBtn.style.borderColor = '#0284c7';
        }
        if (tabMatBtn) {
            tabMatBtn.style.background = '#f8fafc';
            tabMatBtn.style.color = '#475569';
            tabMatBtn.style.borderColor = '#cbd5e1';
        }
    } else {
        if (tabMatBtn) {
            tabMatBtn.style.background = '#0284c7';
            tabMatBtn.style.color = 'white';
            tabMatBtn.style.borderColor = '#0284c7';
        }
        if (tabToolBtn) {
            tabToolBtn.style.background = '#f8fafc';
            tabToolBtn.style.color = '#475569';
            tabToolBtn.style.borderColor = '#cbd5e1';
        }
    }

    const currentSearch = searchInp ? searchInp.value : '';
    filterSubstituteCatalogList(currentSearch);
}

async function openSubstituteMaterialModal(reqId, currentMatId, currentMatName, projectId, resourceType, resourceId) {
    const pId = projectId || window.currentViewingProjectId;
    const reqInp = document.getElementById("sub_mat_req_id");
    const projInp = document.getElementById("sub_mat_project_id");
    const oldDisp = document.getElementById("sub_mat_old_display");
    const newSelect = document.getElementById("sub_mat_new_select");
    const reasonInp = document.getElementById("sub_mat_reason");
    const matProjDisplay = document.getElementById("sub_mat_project_display");
    const searchInp = document.getElementById("sub_mat_search_input");

    substituteCurrentMatId = currentMatId;
    clearSubstituteMaterialSelection();

    if (reqInp) reqInp.value = reqId;
    if (projInp) projInp.value = pId || '';
    if (oldDisp) oldDisp.innerHTML = `<strong>${currentMatName || 'Material'}</strong> ${currentMatId ? `(ID: ${currentMatId})` : ''}`;
    if (reasonInp) reasonInp.value = "Agotado en stock / Cambio por especificación de obra";
    if (searchInp) searchInp.value = "";

    // Determinar si el insumo actual es herramienta o material
    const isTool = (resourceType === 'herramienta' || resourceType === 'equipo' || (currentMatName && /(pistola|taladro|soldador|esmeril|llave|calentador|compresor)/i.test(currentMatName)));
    currentSubstituteTab = isTool ? 'tools' : 'materials';
    switchSubstituteCatalogTab(currentSubstituteTab);

    // Mostrar información de la obra asociada
    if (matProjDisplay) {
        matProjDisplay.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Consultando datos de la obra...`;
        const pFound = (window.allProjects || []).find(p => p.id === parseInt(pId));
        if (pFound) {
            matProjDisplay.innerHTML = `<strong>[${pFound.code || 'PRJ'}]</strong> ${pFound.name} &bull; <span style="font-weight: 600; font-size: 11.5px; color: #475569;">Cliente: ${pFound.client_name || 'General'} | Ubicación: ${pFound.location || 'En Obra'}</span>`;
        } else if (pId) {
            authFetch(`${API_BASE}/projects/${pId}/details`).then(r => r.json()).then(pData => {
                matProjDisplay.innerHTML = `<strong>[${pData.code || 'PRJ'}]</strong> ${pData.name} &bull; <span style="font-weight: 600; font-size: 11.5px; color: #475569;">Cliente: ${pData.client_name || 'General'} | Ubicación: ${pData.location || 'En Obra'}</span>`;
            }).catch(() => {
                matProjDisplay.innerHTML = `<strong>Obra ID: ${pId}</strong>`;
            });
        } else {
            matProjDisplay.innerHTML = `Proyecto en curso`;
        }
    }

    // Abrir modal inmediatamente
    openModal("modalSubstituteMaterial");

    const cardsContainer = document.getElementById("sub_mat_cards_container");
    if (cardsContainer) {
        cardsContainer.innerHTML = `<div style="text-align: center; padding: 14px; color: #64748b; font-size: 11.5px;"><i class="fa-solid fa-spinner fa-spin"></i> Consultando catálogos de almacén...</div>`;
    }

    try {
        const [matRes, toolRes] = await Promise.all([
            authFetch(`${API_BASE}/materials/`),
            authFetch(`${API_BASE}/assets/`)
        ]);

        if (matRes.ok) {
            const mats = await matRes.json();
            substituteCatalogMaterials = Array.isArray(mats) ? mats : (mats.materials || mats.items || []);
        }

        if (toolRes.ok) {
            const tools = await toolRes.json();
            let flatTools = [];
            const rawList = Array.isArray(tools) ? tools : (tools.items || tools.assets || []);
            for (const g of rawList) {
                if (g.items && Array.isArray(g.items)) {
                    flatTools.push(...g.items);
                } else if (g.id) {
                    flatTools.push(g);
                }
            }
            substituteCatalogTools = flatTools.filter(a => (!a.current_project_id || a.status === 'disponible_base') && a.is_active !== false);
        }

        filterSubstituteCatalogList("");
    } catch (e) {
        console.error("Error al cargar catálogos para sustitución:", e);
        if (cardsContainer) cardsContainer.innerHTML = `<div style="text-align: center; padding: 14px; color: #ef4444; font-size: 11px;">⚠️ Error de red al cargar catálogo</div>`;
    }
}

async function submitSubstituteMaterial(event) {
    if (event) {
        if (typeof event.preventDefault === 'function') event.preventDefault();
        if (typeof event.stopPropagation === 'function') event.stopPropagation();
    }

    const pId = parseInt(document.getElementById("sub_mat_project_id")?.value) || window.currentViewingProjectId;
    const reqId = parseInt(document.getElementById("sub_mat_req_id")?.value);
    const newMatId = parseInt(document.getElementById("sub_mat_new_select")?.value);
    const reason = (document.getElementById("sub_mat_reason")?.value || "").trim();

    if (!newMatId || isNaN(newMatId)) {
        alert("Por favor selecciona el nuevo material de reemplazo.");
        return;
    }

    const btn = document.getElementById("btnSubmitSubstituteMaterial");
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Sustituyendo insumo...`;
    }

    try {
        const res = await authFetch(`${API_BASE}/projects/${pId}/substitute-material`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                requisition_id: reqId,
                new_material_id: newMatId,
                reason: reason
            })
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || "Error al sustituir material");
        }

        const data = await res.json();
        closeModal("modalSubstituteMaterial");

        if (typeof showToastNotification === 'function') {
            showToastNotification(data.message || "✅ Material sustituido exitosamente.", "success");
        } else {
            alert(data.message || "✅ Insumo sustituido.");
        }

        if (pId) await viewProjectDetails(pId);
        if (typeof window.loadProjectRequisitionsBadge === 'function') window.loadProjectRequisitionsBadge();
    } catch (e) {
        console.error(e);
        alert("Error al sustituir material: " + e.message);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `<i class="fa-solid fa-shuffle"></i> Confirmar Sustitución de Insumo`;
        }
    }
}



// Auto-window binding & ES6 exports
if (typeof window !== 'undefined') {
    window.resolveCurrentProjectId = resolveCurrentProjectId;
    window.copyProjectClientTrackingLink = copyProjectClientTrackingLink;
    window.shareProjectViaWhatsApp = shareProjectViaWhatsApp;
    window.printProjectProgressReport = printProjectProgressReport;
    window.deleteReceivable = deleteReceivable;
    window.openAddendumModal = openAddendumModal;
    window.submitProjectAddendum = submitProjectAddendum;
    window.goToProjectCxC = goToProjectCxC;
    window.navigateToProjectCxC = goToProjectCxC;
    window.openAddPhaseModal = openAddPhaseModal;
    window.submitAddProjectPhase = submitAddProjectPhase;
    window.addProjectTask = addProjectTask;
    window.deleteProjectTask = deleteProjectTask;
    window.openDirectResourceAssignModal = openDirectResourceAssignModal;
    window.submitDirectResourceAssign = submitDirectResourceAssign;
    window.releaseProjectResource = releaseProjectResource;
    window.onSubstituteReasonChange = onSubstituteReasonChange;
    window.openSubstituteResourceModal = openSubstituteResourceModal;
    window.submitSubstituteResource = submitSubstituteResource;
    window.openSubstituteMaterialModal = openSubstituteMaterialModal;
    window.submitSubstituteMaterial = submitSubstituteMaterial;
    window.filterSubstituteCatalogList = filterSubstituteCatalogList;
    window.switchSubstituteCatalogTab = switchSubstituteCatalogTab;
    window.selectSubstituteItem = selectSubstituteItem;
    window.clearSubstituteMaterialSelection = clearSubstituteMaterialSelection;
}

export { resolveCurrentProjectId };
export { copyProjectClientTrackingLink };
export { shareProjectViaWhatsApp };
export { printProjectProgressReport };
export { deleteReceivable };
export { openAddendumModal };
export { submitProjectAddendum };
export { goToProjectCxC };
export { openAddPhaseModal };
export { submitAddProjectPhase };
export { addProjectTask };
export { deleteProjectTask };
export { openDirectResourceAssignModal };
export { submitDirectResourceAssign };
export { releaseProjectResource };
export { onSubstituteReasonChange };
export { openSubstituteResourceModal };
export { submitSubstituteResource };
export { openSubstituteMaterialModal };
export { submitSubstituteMaterial };
export { filterSubstituteCatalogList };
export { switchSubstituteCatalogTab };
export { selectSubstituteItem };
export { clearSubstituteMaterialSelection };
