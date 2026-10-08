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

async function loadMachineryList() {

    const tbody = document.getElementById("machineryTableBody");

    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; padding: 20px; color: #94a3b8;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando maquinaria pesada y plantas...</td></tr>`;



    try {

        const res = await authFetch(`${API_BASE}/assets/`);

        const assets = await res.json();
        window.allAssets = assets;

        const machinery = assets.filter(a => 
            (['maquinaria', 'planta', 'generador', 'compresor', 'equipo_mayor'].includes(a.asset_type) ||
            (a.asset_code === '3-V-1-05')) && a.asset_type !== 'herramienta'
        );
        window.rawMachineryList = machinery;



        if (machinery.length === 0) {

            tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; padding: 20px; color: #94a3b8;">No hay maquinaria pesada o plantas registradas.</td></tr>`;

            return;

        }



        tbody.innerHTML = machinery.map(m => {
            const hasProject = Boolean(m.current_project_id);
            const hasCustodian = Boolean(m.current_custodian_name && !m.current_custodian_name.toLowerCase().includes('disponible') && !m.current_custodian_name.toLowerCase().includes('base') && m.current_custodian_name !== '-');
            const isEnObra = m.status === 'en_obra' || hasProject;
            const isEnOperacion = m.status === 'en_operacion' || (!hasProject && hasCustodian);
            const inBase = !isEnObra && !isEnOperacion && (m.status === 'disponible_base' || m.status === 'disponible' || !m.status);

            const isMaint = m.maintenance_status === 'en_mantenimiento';

            let obraLabel = 'DISPONIBLE EN BASE';
            let badgeStyle = 'background: #dcfce7; color: #166534;';
            if (isEnObra) {
                const proj = (window.allProjects || []).find(p => p.id === m.current_project_id);
                const projName = proj ? `[${proj.code}]` : '';
                obraLabel = `EN OBRA ${projName}`.trim();
                badgeStyle = 'background: #e0f2fe; color: #0369a1;';
            } else if (isEnOperacion) {
                obraLabel = 'EN OPERACIÓN / ASIGNADO';
                badgeStyle = 'background: #fef3c7; color: #92400e;';
            }

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
                    <span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 800; ${badgeStyle}">
                        ${obraLabel}
                    </span>
                </td>
                <td style="font-size: 11.5px; font-weight: 600; color: #334155;">${m.current_location || 'Sede Central'}</td>
                <td style="font-size: 11.5px; font-weight: 700; color: ${hasCustodian ? '#0f766e' : '#64748b'};">${m.current_custodian_name || 'Disponible en Base'}</td>
                <td style="text-align: center; white-space: nowrap;">
                    ${inBase ? `
                        <button onclick="openAssignModal('asset', ${m.id}, '${(m.name || '').replace(/'/g, "\\'")}', 'assign')" class="btn-primary" style="padding: 3px 8px; font-size: 11px; background: #ea580c;">
                            <i class="fa-solid fa-truck-ramp-box"></i> Asignar a Faena
                        </button>
                    ` : `
                        <button onclick="openAssignModal('asset', ${m.id}, '${(m.name || '').replace(/'/g, "\\'")}', 'transfer')" class="btn-secondary" style="padding: 3px 6px; font-size: 11px;" title="Transferir o reasignar destino/custodio">
                            <i class="fa-solid fa-arrows-split-up-and-left"></i>
                        </button>
                        ${m.current_project_id ? `
                        <button onclick="openSubstituteResourceModal('asset', ${m.id}, '${(m.name || '').replace(/'/g, "\\'")}', ${m.current_project_id})" class="btn-secondary" style="padding: 3px 6px; font-size: 11px; margin-left: 4px; color: #2563eb; border-color: #bfdbfe;" title="Sustituir en Obra por otra maquinaria disponible">
                            <i class="fa-solid fa-arrows-rotate"></i>
                        </button>` : ''}
                        <button onclick="returnResourceToBase('asset', ${m.id})" class="btn-primary" style="padding: 3px 6px; font-size: 11px; margin-left: 4px; background: #059669;" title="Liberar y retornar a Sede Central (Disponible)">
                            <i class="fa-solid fa-warehouse"></i> Liberar
                        </button>
                    `}

                    <button onclick="openVehicleServicesModal(${m.id}, '${(m.asset_code || '').replace(/'/g, "\\'")}', '${(m.name || '').replace(/'/g, "\\'")}')" class="btn-primary" style="padding: 3px 8px; font-size: 11px; margin-right: 4px; background: #ea580c; border-radius: 4px;" title="Servicios, Horómetro y Mantenimiento de Maquinaria">
                        <i class="fa-solid fa-wrench"></i> Servicios
                    </button>
                    <button onclick="openAssetHistoryModal(${m.id})" class="btn-primary" style="padding: 3px 8px; font-size: 11px; margin-right: 4px; background: #2563eb;" title="Ver Bitácora y Trazabilidad de Uso">
                        <i class="fa-solid fa-clock-rotate-left"></i> Bitácora
                    </button>
                    <button onclick="openEditAssetModal(${m.id})" class="btn-secondary" style="padding: 3px 8px; font-size: 11px; margin-right: 4px; color: #0284c7; border-color: #bae6fd;" title="Editar Maquinaria">
                        <i class="fa-solid fa-pen"></i> Editar
                    </button>
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

let rawToolsList = [];
let groupedToolsList = [];



// --- VINCULACIÓN CON WINDOW Y SCOPE GLOBAL ---
if (typeof window !== 'undefined') {
    window.loadMachineryList = loadMachineryList;
}
