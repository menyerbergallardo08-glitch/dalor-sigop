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

let rawPersonnelList = [];
let currentPersonnelItem = null;
let currentPersonnelTimelineList = [];
let currentPersonnelTimelinePage = 1;
let currentPersonnelTimelinePageSize = 6;

async function loadPersonnelTableList() {
    const tbody = document.getElementById("matrixPersonnelTableBody");
    if (Array.isArray(rawPersonnelList) && rawPersonnelList.length > 0) {
        filterPersonnelList();
    } else if (tbody) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px; color: #94a3b8;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando personal...</td></tr>`;
    }

    try {
        const res = await authFetch(`${API_BASE}/personnel/?include_inactive=true`);
        allPersonnel = await res.json();
        rawPersonnelList = Array.isArray(allPersonnel) ? allPersonnel : [];

        // Poblar datalists dinámicos de cargos y nóminas
        populatePersonnelDatalists();

        // Poblar selector dinámico de roles de personal
        const roleSelect = document.getElementById("personnelRoleFilter");
        if (roleSelect) {
            const currentVal = roleSelect.value || 'all';
            const roles = Array.from(new Set(rawPersonnelList.map(p => (p.role_title || '').trim()).filter(Boolean))).sort();
            roleSelect.innerHTML = `<option value="all">Todos los Cargos / Roles (${roles.length})</option>` +
                roles.map(r => `<option value="${r}" ${r === currentVal ? 'selected' : ''}>${r}</option>`).join('');
        }

        filterPersonnelList();

    } catch (e) {
        if (tbody) tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #e11d48;">Error al cargar personal: ${e?.message || e}</td></tr>`;
    }
}

function filterPersonnelList() {
    const q = (document.getElementById("personnelSearchInput")?.value || '').trim().toLowerCase();
    const role = document.getElementById("personnelRoleFilter")?.value || 'all';
    const status = document.getElementById("personnelStatusFilter")?.value || 'all';
    const countBadge = document.getElementById("personnelCountBadge");
    const tbody = document.getElementById("matrixPersonnelTableBody");

    let filtered = (rawPersonnelList || []).filter(p => {
        const safeCode = (p?.code || '').toLowerCase();
        const safeName = (p?.full_name || '').toLowerCase();
        const safePhone = (p?.phone || '').toLowerCase();
        const safeRole = (p?.role_title || '').toLowerCase();
        const matchText = !q || safeCode.includes(q) || safeName.includes(q) || safePhone.includes(q) || safeRole.includes(q);

        let matchRole = true;
        if (role !== 'all') matchRole = (p?.role_title || '').trim() === role;

        const isInactive = p?.is_active === false;
        const inBase = (p?.status === 'disponible_base' || !p?.current_project_id) && !isInactive;
        const inObra = Boolean(p?.current_project_id) && !isInactive;

        let matchStatus = true;
        if (status === 'all') matchStatus = !isInactive;
        if (status === 'disponible_base') matchStatus = inBase;
        if (status === 'en_obra') matchStatus = inObra;
        if (status === 'inactivo') matchStatus = isInactive;
        if (status === 'todos') matchStatus = true;

        return matchText && matchRole && matchStatus;
    });

    if (countBadge) countBadge.innerText = `${filtered.length} de ${rawPersonnelList.length} empleados`;

    if (!tbody) return;

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px; color: #94a3b8;">No se encontraron empleados con los criterios de búsqueda.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(p => {
        const isInactive = p?.is_active === false;
        const inBase = (p?.status === 'disponible_base' || !p?.current_project_id) && !isInactive;
        const locStr = isInactive ? 'Inactivo / Egresado' : (p?.current_location || (inBase ? 'Sede Central Dalor (Guacara)' : 'En Obra / Proyecto'));
        const safeName = (p?.full_name || '').replace(/'/g, "\\'");
        const pId = p?.id ?? 0;
        const pPayroll = p?.payroll_type ? ` &bull; <small style="color: #64748b;">${p.payroll_type}</small>` : '';

        return `
        <tr style="${isInactive ? 'opacity: 0.75; background: #fff1f2;' : ''}">
            <td style="font-weight: 800; color: var(--dalor-blue); font-family: monospace;">${p?.code || '-'}</td>
            <td style="font-weight: 700; color: var(--dalor-navy);">${p?.full_name || '-'}</td>
            <td><span style="font-size: 11px; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-weight: 600;">${p?.role_title || '-'}${pPayroll}</span></td>
            <td>${p?.phone || '-'}</td>
            <td>
                ${isInactive ? `
                    <span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 800; background: #fee2e2; color: #991b1b;">
                        <i class="fa-solid fa-user-slash"></i> INACTIVO
                    </span>
                ` : `
                    <span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 800; ${inBase ? 'background: #dcfce7; color: #166534;' : 'background: #e0f2fe; color: #0369a1;'}">
                        <i class="fa-solid ${inBase ? 'fa-warehouse' : 'fa-helmet-safety'}"></i> ${inBase ? 'DISPONIBLE EN BASE' : 'EN OBRA'}
                    </span>
                `}
            </td>
            <td>${locStr}</td>
            <td style="text-align: center; white-space: nowrap;">
                <button onclick="openPersonnelHistoryModal(${pId}, '${p?.code || ''}', '${safeName}')" class="btn-secondary" style="padding: 3px 6px; font-size: 11px; margin-right: 4px; color: #2563eb; border-color: #93c5fd;" title="Ver Bitácora & Trazabilidad de Asignaciones (Punto 6)">
                    <i class="fa-solid fa-clock-rotate-left"></i> Bitácora
                </button>
                <button onclick="openEditPersonnelModal(${pId})" class="btn-primary" style="padding: 3px 8px; font-size: 11px; margin-right: 4px; background: #0284c7; color: white;" title="Editar Ficha de Personal">
                    <i class="fa-solid fa-user-pen"></i> Editar
                </button>
                ${!isInactive ? (inBase ? `
                    <button onclick="openAssignModal('personnel', ${pId}, '${safeName}', 'assign')" class="btn-primary" style="padding: 3px 8px; font-size: 11px;">
                        Asignar a Obra
                    </button>
                ` : `
                    <button onclick="openSubstituteResourceModal('personnel', ${pId}, '${safeName}', ${p.current_project_id})" class="btn-secondary" style="padding: 3px 6px; font-size: 11px; margin-right: 4px; color: #2563eb; border-color: #bfdbfe;" title="Sustituir en obra por otro trabajador disponible">
                        <i class="fa-solid fa-arrows-rotate"></i> Sustituir
                    </button>
                    <button onclick="openAssignModal('personnel', ${pId}, '${safeName}', 'transfer')" class="btn-secondary" style="padding: 3px 6px; font-size: 11px;" title="Transferir a otra obra">
                        <i class="fa-solid fa-arrows-split-up-and-left"></i>
                    </button>
                    <button onclick="returnResourceToBase('personnel', ${pId})" class="btn-primary" style="padding: 3px 6px; font-size: 11px; margin-left: 4px; background: #059669;" title="Devolver a Sede Central">
                        <i class="fa-solid fa-warehouse"></i>
                    </button>
                `) : ''}
                <button onclick="togglePersonnelStatus(${pId}, ${!isInactive})" class="btn-secondary" style="padding: 3px 6px; font-size: 11px; margin-left: 4px; ${isInactive ? 'color: #16a34a; border-color: #bbf7d0;' : 'color: #ef4444; border-color: #fecaca;'}" title="${isInactive ? 'Reactivar Personal' : 'Inactivar Personal'}">
                    <i class="fa-solid ${isInactive ? 'fa-user-check' : 'fa-user-slash'}"></i>
                </button>
            </td>
        </tr>`;
    }).join('');
}




async function populatePersonnelDatalists() {
    try {
        const rolesDatalist = document.getElementById("rolesDatalist");
        if (rolesDatalist) {
            const res = await authFetch(`${API_BASE}/personnel/roles-list`);
            if (res.ok) {
                const roles = await res.json();
                if (Array.isArray(roles) && roles.length > 0) {
                    rolesDatalist.innerHTML = roles.map(r => `<option value="${r}"></option>`).join('');
                }
            }
        }
        const payrollDatalist = document.getElementById("payrollDatalist");
        if (payrollDatalist && (!payrollDatalist.children || payrollDatalist.children.length === 0)) {
            const payrollTypes = ["Semanal", "Quincenal", "Mensual", "Por Obra / Destajo", "Honorarios Profesionales"];
            payrollDatalist.innerHTML = payrollTypes.map(p => `<option value="${p}"></option>`).join('');
        }
    } catch (e) {
        console.warn("Could not populate personnel datalists:", e);
    }
}

function openNewPersonnelModal() {
    const form = document.getElementById("newPersonnelForm");
    if (form) form.reset();

    // Poblar datalists dinámicos
    populatePersonnelDatalists();

    // Auto-sugerir siguiente correlativo PERS-XXX
    const persList = allPersonnel || [];
    const nums = persList.map(p => {
        const m = (p.code || '').match(/(\d+)/);
        return m ? parseInt(m[1]) : 0;
    });
    const maxNum = nums.length > 0 ? Math.max(...nums) : 18;
    const nextCode = `PERS-${String(maxNum + 1).padStart(3, '0')}`;
    const codeInput = document.getElementById("npers_code");
    if (codeInput) codeInput.value = nextCode;

    const locInput = document.getElementById("npers_location");
    if (locInput) locInput.value = "Sede Central Dalor (Guacara)";

    openModal("modalNewPersonnel");
}

async function submitCreatePersonnel(e) {
    e.preventDefault();

    const code = document.getElementById("npers_code").value.trim();
    const fullName = document.getElementById("npers_name").value.trim();
    const idNum = document.getElementById("npers_id").value.trim();
    const role = document.getElementById("npers_role").value.trim();
    const payrollType = document.getElementById("npers_payroll_type") ? document.getElementById("npers_payroll_type").value.trim() : "semanal";
    const phone = document.getElementById("npers_phone").value.trim();
    const roster = document.getElementById("npers_roster") ? document.getElementById("npers_roster").value : "rotativo";
    const salary = parseFloat(document.getElementById("npers_salary").value) || 0.0;
    const location = document.getElementById("npers_location").value.trim() || "Sede Central Dalor (Guacara)";

    const payload = {
        code: code,
        full_name: fullName,
        identification_id: idNum,
        role_title: role,
        payroll_type: payrollType || "semanal",
        phone: phone,
        roster_type: roster,
        monthly_salary_usd: salary,
        current_location: location,
        status: "disponible_base"
    };

    try {
        const res = await authFetch(`${API_BASE}/personnel/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || "Error al registrar empleado");
        }

        closeModal("modalNewPersonnel");
        alert(`✅ Empleado ${fullName} (${role || 'Personal'}) registrado exitosamente.`);

        await loadInitialMasterData();
        loadPersonnelTableList();

    } catch (err) {
        alert(`❌ Error: ${err.message}`);
    }
}

async function openEditPersonnelModal(persId) {
    const p = (rawPersonnelList || []).concat(window.allPersonnel || []).find(x => x && x.id === persId);
    if (!p) return alert("Empleado no encontrado.");

    populatePersonnelDatalists();

    document.getElementById("edit_pers_id").value = p.id;
    document.getElementById("edit_pers_code").value = p.code || '';
    document.getElementById("edit_pers_name").value = p.full_name || '';
    document.getElementById("edit_pers_id_doc").value = p.identification_id || '';
    document.getElementById("edit_pers_phone").value = p.phone || '';
    document.getElementById("edit_pers_role").value = p.role_title || '';
    document.getElementById("edit_pers_payroll_type").value = p.payroll_type || 'semanal';
    document.getElementById("edit_pers_salary").value = p.monthly_salary_usd || '';
    document.getElementById("edit_pers_location").value = p.current_location || '';

    if (typeof openModal === 'function') openModal("modalEditPersonnel");
}

async function submitEditPersonnel(e) {
    if (e) e.preventDefault();
    const id = document.getElementById("edit_pers_id").value;
    const payload = {
        full_name: document.getElementById("edit_pers_name").value.trim(),
        identification_id: document.getElementById("edit_pers_id_doc").value.trim(),
        role_title: document.getElementById("edit_pers_role").value.trim(),
        payroll_type: document.getElementById("edit_pers_payroll_type").value.trim() || 'semanal',
        phone: document.getElementById("edit_pers_phone").value.trim(),
        monthly_salary_usd: parseFloat(document.getElementById("edit_pers_salary").value) || 0.0,
        current_location: document.getElementById("edit_pers_location").value.trim()
    };
    try {
        const res = await authFetch(`${API_BASE}/personnel/${id}`, {
            method: "PUT",
            body: JSON.stringify(payload)
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({ detail: 'Error al actualizar' }));
            throw new Error(err.detail || 'Error al actualizar ficha');
        }
        alert("✅ Ficha de personal actualizada con éxito.");
        if (typeof closeModal === 'function') closeModal("modalEditPersonnel");
        await loadInitialMasterData();
        loadPersonnelTableList();
    } catch (err) {
        alert("❌ Error: " + err.message);
    }
    return false;
}

async function togglePersonnelStatus(persId, currentActive) {
    const action = currentActive ? "inactivar" : "reactivar";
    if (!confirm(`¿Desea ${action} este colaborador? Se conservará su historial de obras.`)) return;
    try {
        const res = await authFetch(`${API_BASE}/personnel/${persId}/toggle-active`, { method: "POST" });
        if (!res.ok) {
            const err = await res.json().catch(() => ({ detail: 'Error al cambiar estado' }));
            throw new Error(err.detail || 'Error al procesar solicitud');
        }
        alert(`✅ Colaborador ${action === 'inactivar' ? 'inactivado' : 'reactivado'} exitosamente.`);
        await loadInitialMasterData();
        loadPersonnelTableList();
    } catch (err) {
        alert("❌ Error: " + err.message);
    }
}

// ==============================================================================
// 🚜 EDICIÓN Y GESTIÓN DE ESTADO DE ACTIVOS / EQUIPOS / VEHÍCULOS
// ==============================================================================


function goToPersonnelHistoryPage(page) {
    currentPersonnelTimelinePage = page;
    renderPersonnelHistoryTablePaginated();
}

function changePersonnelHistoryPageSize(size) {
    currentPersonnelTimelinePageSize = parseInt(size) || 6;
    currentPersonnelTimelinePage = 1;
    renderPersonnelHistoryTablePaginated();
}

function renderPersonnelHistoryTablePaginated() {
    const tbody = document.getElementById("personnelHistoryTableBody");
    const container = document.getElementById("personnelHistoryPagination");
    if (!tbody) return;

    if (!currentPersonnelTimelineList || currentPersonnelTimelineList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #94a3b8; padding: 20px;">No se registran asignaciones ni traslados históricos para este colaborador (Permanece en Base Central).</td></tr>`;
        if (container) container.innerHTML = '';
        return;
    }

    const paginateFn = typeof window.renderPaginationControls === 'function' 
        ? window.renderPaginationControls 
        : (typeof renderPaginationControls === 'function' ? renderPaginationControls : () => ({ startIndex: 0, endIndex: currentPersonnelTimelineList.length }));

    const { startIndex, endIndex } = paginateFn({
        containerId: "personnelHistoryPagination",
        totalItems: currentPersonnelTimelineList.length,
        currentPage: currentPersonnelTimelinePage,
        pageSize: currentPersonnelTimelinePageSize,
        onPageChange: "goToPersonnelHistoryPage",
        onPageSizeChange: "changePersonnelHistoryPageSize",
        itemLabel: "registro(s) en bitácora",
        pageSizeOptions: [6, 12, 25],
        allowAll: true
    });

    const pageItems = currentPersonnelTimelineList.slice(startIndex, endIndex);

    tbody.innerHTML = pageItems.map(t => {
        let badgeBg = '#f1f5f9', badgeColor = '#475569', typeLabel = 'Movimiento';
        if (t.type === 'chofer_despacho') {
            badgeBg = '#dbeafe'; badgeColor = '#1d4ed8'; typeLabel = '🚛 Conductor Guía';
        } else if (t.type === 'receptor_guia' || t.type === 'guia_despacho') {
            badgeBg = '#e0f2fe'; badgeColor = '#0369a1'; typeLabel = '📦 Receptor en Obra';
        } else if (t.type === 'retorno_base' || t.status === 'disponible_base') {
            badgeBg = '#dcfce7'; badgeColor = '#15803d'; typeLabel = '🏠 Retorno a Base';
        } else if (t.type === 'transferencia_obra') {
            badgeBg = '#ffedd5'; badgeColor = '#c2410c'; typeLabel = '🔄 Transferencia Obra';
        } else {
            badgeBg = '#e0e7ff'; badgeColor = '#4338ca'; typeLabel = '🏗️ Asignación a Obra';
        }

        const roleText = t.role_in_project || t.role || (currentPersonnelItem && currentPersonnelItem.role_title) || '-';

        return `
            <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 8px; font-weight: 600; color: #475569; white-space: nowrap;">${t.date}</td>
                <td style="padding: 8px;"><span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 800; background: ${badgeBg}; color: ${badgeColor};">${typeLabel}</span></td>
                <td style="padding: 8px;"><span style="font-weight: 700; color: #1e293b;">${t.project_code ? `[${t.project_code}] ` : ''}${t.destination || t.project_name || '-'}</span></td>
                <td style="padding: 8px; font-weight: 600; color: #2563eb;">${roleText}</td>
                <td style="padding: 8px; color: #64748b; font-size: 11px;">
                    ${t.transfer_code ? `<b style="color: var(--dalor-navy); font-family: monospace;">[${t.transfer_code}]</b> ` : ''}${t.notes || '-'}
                </td>
            </tr>
        `;
    }).join('');
}

async function openPersonnelHistoryModal(personnelId, personnelCode = null, personnelName = null) {
    const titleEl = document.getElementById("personnelHistoryTitle");
    const subEl = document.getElementById("personnelHistorySubtitle");
    const locEl = document.getElementById("persHistCurrentLoc");
    const roleEl = document.getElementById("persHistRole");
    const prjEl = document.getElementById("persHistTotalProjects");
    const statusEl = document.getElementById("persHistStatusBadge");
    const tbody = document.getElementById("personnelHistoryTableBody");

    const safePersonnel = (window.allPersonnel && window.allPersonnel.length > 0) ? window.allPersonnel : (allPersonnel || []);
    const matched = safePersonnel.find(p => p.id === personnelId) || {};
    const code = personnelCode || matched.code || `EMP-${personnelId}`;
    const name = personnelName || matched.full_name || 'Personal / Colaborador';

    if (titleEl) titleEl.innerHTML = `<i class="fa-solid fa-user-clock" style="color: #2563eb;"></i> Bitácora & Trazabilidad: [${code}] ${name}`;
    if (subEl) subEl.innerText = `Cargando historial cronológico de obras, roles y guías de despacho...`;
    if (tbody) tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #94a3b8; padding: 20px;"><i class="fa-solid fa-spinner fa-spin"></i> Consultando bitácora del colaborador...</td></tr>`;

    openModal("modalPersonnelHistory");

    try {
        const token = sessionStorage.getItem('dalor_token') || localStorage.getItem('dalor_token') || window.authToken || '';
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        const res = await authFetch(`${API_BASE}/personnel/${personnelId}/history`, { headers });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const p = data.personnel || {};
        const timeline = data.timeline || [];

        if (subEl) subEl.innerText = `Cédula: ${p.identification_id || p.dni || '-'} | Cargo: ${p.role_title || 'Colaborador'} | Teléfono: ${p.phone || '-'}`;
        if (locEl) locEl.innerText = p.current_location || "Sede Central Dalor (Guacara)";
        if (roleEl) roleEl.innerText = p.role_title || "Colaborador";
        if (prjEl) prjEl.innerText = `${p.total_projects_assigned || timeline.length} registro(s)`;
        if (statusEl) {
            const inBase = p.status === 'disponible_base' || !p.current_project_id;
            statusEl.innerHTML = `<span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 800; ${inBase ? 'background: #dcfce7; color: #166534;' : 'background: #e0f2fe; color: #0369a1;'}">${(p.status || 'DISPONIBLE').toUpperCase().replace(/_/g, ' ')}</span>`;
        }

        currentPersonnelItem = p;
        currentPersonnelTimelineList = timeline;
        currentPersonnelTimelinePage = 1;
        renderPersonnelHistoryTablePaginated();

    } catch (e) {
        if (tbody) tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #e11d48; padding: 20px;">Error al cargar bitácora del colaborador: ${e.message}</td></tr>`;
    }
}



// --- VINCULACIÓN CON WINDOW Y SCOPE GLOBAL ---
if (typeof window !== 'undefined') {
    window.loadPersonnelTableList = loadPersonnelTableList;
    window.filterPersonnelList = filterPersonnelList;
    window.populatePersonnelDatalists = populatePersonnelDatalists;
    window.openNewPersonnelModal = openNewPersonnelModal;
    window.submitCreatePersonnel = submitCreatePersonnel;
    window.openEditPersonnelModal = openEditPersonnelModal;
    window.submitEditPersonnel = submitEditPersonnel;
    window.togglePersonnelStatus = togglePersonnelStatus;
    window.goToPersonnelHistoryPage = goToPersonnelHistoryPage;
    window.changePersonnelHistoryPageSize = changePersonnelHistoryPageSize;
    window.renderPersonnelHistoryTablePaginated = renderPersonnelHistoryTablePaginated;
    window.openPersonnelHistoryModal = openPersonnelHistoryModal;
}
