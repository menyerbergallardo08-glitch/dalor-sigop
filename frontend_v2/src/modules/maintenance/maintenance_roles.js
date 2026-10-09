/**
 * DALOR SIGO-P | Módulo de Mantenimiento Desacoplado
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

let allSystemRoles = window.allSystemRoles = window.allSystemRoles || [];

// -----------------------------------------------------------------------------
// GESTIÓN DE ROLES (PROFIT PLUS STYLE)
// -----------------------------------------------------------------------------
async function loadMaintenanceRolesList() {
    const tbody = document.getElementById('maintenanceRolesTableBody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #94a3b8; padding: 16px;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando roles de seguridad...</td></tr>`;

    try {
        const res = await authFetch(`${API_BASE}/maintenance/roles`);
        if (!res.ok) throw new Error("Error fetching roles");
        allSystemRoles = await res.json();

        if (allSystemRoles.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #94a3b8; padding: 16px;">No hay roles definidos.</td></tr>`;
            return;
        }

        tbody.innerHTML = allSystemRoles.map(r => {
            let perms = {};
            try { perms = typeof r.permissions_json === 'string' ? JSON.parse(r.permissions_json) : r.permissions_json; } catch(e) { perms = {}; }

            const moduleBadges = [];
            if (perms.comercial || perms.comercial_view) moduleBadges.push('<span style="background: #e0f2fe; color: #0369a1; padding: 1px 5px; border-radius: 3px; font-size: 10px; font-weight: 700;">Comercial</span>');
            if (perms.proyectos || perms.proyectos_view) moduleBadges.push('<span style="background: #dcfce7; color: #166534; padding: 1px 5px; border-radius: 3px; font-size: 10px; font-weight: 700;">Proyectos</span>');
            if (perms.finanzas || perms.finanzas_view) moduleBadges.push('<span style="background: #fef3c7; color: #92400e; padding: 1px 5px; border-radius: 3px; font-size: 10px; font-weight: 700;">Finanzas</span>');
            if (perms.recursos || perms.recursos_view) moduleBadges.push('<span style="background: #ede9fe; color: #5b21b6; padding: 1px 5px; border-radius: 3px; font-size: 10px; font-weight: 700;">Recursos</span>');
            if (perms.gastos || perms.gastos_view) moduleBadges.push('<span style="background: #ffedd5; color: #c2410c; padding: 1px 5px; border-radius: 3px; font-size: 10px; font-weight: 700;">Gastos</span>');
            if (perms.executive_bi || perms.executive_dashboard) moduleBadges.push('<span style="background: #fae8ff; color: #86198f; padding: 1px 5px; border-radius: 3px; font-size: 10px; font-weight: 700;">BI Ejecutivo</span>');
            if (perms.mantenimiento || perms.mantenimiento_admin) moduleBadges.push('<span style="background: #fee2e2; color: #991b1b; padding: 1px 5px; border-radius: 3px; font-size: 10px; font-weight: 700;">Config/Seguridad</span>');

            return `
                <tr>
                    <td style="font-weight: 800; color: var(--dalor-navy);">
                        <i class="fa-solid fa-shield-halved" style="color: #d97706; margin-right: 5px;"></i> ${r.display_name}
                    </td>
                    <td style="font-family: monospace; font-size: 11px; color: #475569;">${r.name}</td>
                    <td style="font-size: 11px; color: #64748b; max-width: 250px;">${r.description || '-'}</td>
                    <td>
                        <div style="display: flex; flex-wrap: wrap; gap: 4px;">
                            ${moduleBadges.length > 0 ? moduleBadges.join('') : '<span style="color: #94a3b8; font-size: 10px;">Sin permisos</span>'}
                        </div>
                    </td>
                    <td>
                        <span style="padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 800; background: ${r.is_system ? '#e2e8f0' : '#dbeafe'}; color: ${r.is_system ? '#475569' : '#1e40af'};">
                            ${r.is_system ? '🔒 Nativo' : '✨ Personalizado'}
                        </span>
                    </td>
                    <td style="text-align: center; white-space: nowrap;">
                        <button onclick="openEditRoleModal(${r.id})" class="btn-secondary" style="padding: 3px 8px; font-size: 11px; margin-right: 4px;" title="Editar Permisos del Rol">
                            <i class="fa-solid fa-pen-to-square"></i> Editar
                        </button>
                        ${!r.is_system ? `
                            <button onclick="deleteRole(${r.id}, '${r.display_name}')" class="btn-secondary" style="padding: 3px 8px; font-size: 11px; color: #e11d48;" title="Eliminar Rol">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        ` : ''}
                    </td>
                </tr>
            `;
        }).join('');

    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #e11d48; padding: 16px;">Error al cargar roles.</td></tr>`;
    }
}

const GRANULAR_PERM_KEYS = [
    'comercial_view', 'comercial_edit', 'services_view', 'quotations_create', 'quotations_approve',
    'proyectos_view', 'proyectos_edit', 'proyectos_phases', 'proyectos_adendas', 'proyectos_costs',
    'cxc_view', 'cxc_pay', 'cxp_view', 'cxp_pay', 'bancos_view', 'conciliacion_view', 'retiros_view',
    'gastos_view', 'gastos_create', 'gastos_approve',
    'recursos_view', 'recursos_edit', 'mantenimiento_vehicular', 'personal_view', 'cuadrillas_assign',
    'almacen_view', 'almacen_adjust', 'requisiciones_view', 'despacho_view', 'alquileres_view',
    'executive_dashboard', 'audit_logs', 'usuarios_admin', 'backups_admin'
];

function toggleAllRoleCheckboxes(check) {
    GRANULAR_PERM_KEYS.forEach(k => {
        const el = document.getElementById('role_perm_' + k);
        if (el) el.checked = !!check;
    });
}

function toggleAllUserCheckboxes(check) {
    GRANULAR_PERM_KEYS.forEach(k => {
        const el = document.getElementById('perm_' + k);
        if (el) el.checked = !!check;
    });
}

function openNewRoleModal() {
    const form = document.getElementById('roleForm');
    if (form) form.reset();
    document.getElementById('role_form_id').value = '';
    document.getElementById('roleModalTitle').textContent = 'Crear Rol de Seguridad';
    document.getElementById('role_name').readOnly = false;
    toggleAllRoleCheckboxes(false);
    ['comercial_view', 'proyectos_view', 'gastos_view', 'gastos_create', 'recursos_view'].forEach(k => {
        const el = document.getElementById('role_perm_' + k);
        if (el) el.checked = true;
    });
    openModal('modalRoleForm');
}

function autoGenerateRoleSlug() {
    const idField = document.getElementById('role_form_id');
    if (idField && idField.value) return;
    const title = document.getElementById('role_display_name').value;
    const slug = title.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
    document.getElementById('role_name').value = slug;
}

function openEditRoleModal(roleId) {
    const role = allSystemRoles.find(r => r.id === roleId);
    if (!role) return;

    document.getElementById('role_form_id').value = role.id;
    document.getElementById('roleModalTitle').textContent = `Editar Rol: ${role.display_name}`;
    document.getElementById('role_display_name').value = role.display_name;
    document.getElementById('role_name').value = role.name;
    document.getElementById('role_name').readOnly = role.is_system;
    document.getElementById('role_description').value = role.description || '';

    let perms = {};
    try { perms = typeof role.permissions_json === 'string' ? JSON.parse(role.permissions_json) : role.permissions_json; } catch(e) { perms = {}; }

    GRANULAR_PERM_KEYS.forEach(k => {
        const el = document.getElementById('role_perm_' + k);
        if (!el) return;
        if (perms[k] !== undefined) {
            el.checked = !!perms[k];
        } else if (k.startsWith('comercial_') || k.startsWith('quotations_') || k === 'services_view') {
            el.checked = !!(perms.comercial || perms.comercial_view);
        } else if (k.startsWith('proyectos_')) {
            el.checked = !!(perms.proyectos || perms.proyectos_view);
        } else if (['cxc_view', 'cxc_pay', 'cxp_view', 'cxp_pay', 'bancos_view', 'conciliacion_view', 'retiros_view'].includes(k)) {
            el.checked = !!(perms.finanzas || perms.finanzas_view);
        } else if (k.startsWith('gastos_')) {
            el.checked = !!(perms.gastos || perms.gastos_view);
        } else if (k.startsWith('recursos_') || k.startsWith('personal_') || k === 'mantenimiento_vehicular' || k === 'cuadrillas_assign') {
            el.checked = !!(perms.recursos || perms.recursos_view);
        } else if (k.startsWith('almacen_') || k.startsWith('requisiciones_') || k.startsWith('despacho_') || k.startsWith('alquileres_')) {
            el.checked = !!(perms.recursos || perms.recursos_view);
        } else if (k === 'executive_dashboard') {
            el.checked = !!(perms.executive_bi || perms.executive_dashboard);
        } else if (['usuarios_admin', 'audit_logs', 'backups_admin'].includes(k)) {
            el.checked = !!(perms.mantenimiento || perms.mantenimiento_admin);
        } else {
            el.checked = false;
        }
    });

    openModal('modalRoleForm');
}

async function submitRoleForm(event) {
    event.preventDefault();
    const roleId = document.getElementById('role_form_id').value;
    const displayName = document.getElementById('role_display_name').value.trim();
    const name = document.getElementById('role_name').value.trim();
    const description = document.getElementById('role_description').value.trim();

    const permissions = {};
    GRANULAR_PERM_KEYS.forEach(k => {
        const el = document.getElementById('role_perm_' + k);
        permissions[k] = el ? el.checked : false;
    });

    // Rollup legacy flags for 100% backward compatibility
    permissions.comercial = permissions.comercial_view || permissions.comercial_edit || permissions.quotations_create;
    permissions.comercial_view = permissions.comercial_view;
    permissions.comercial_edit = permissions.comercial_edit;
    permissions.proyectos = permissions.proyectos_view || permissions.proyectos_edit;
    permissions.proyectos_view = permissions.proyectos_view;
    permissions.proyectos_edit = permissions.proyectos_edit;
    permissions.finanzas = permissions.cxc_view || permissions.cxp_view || permissions.bancos_view;
    permissions.finanzas_view = permissions.finanzas;
    permissions.finanzas_edit = permissions.cxc_pay || permissions.cxp_pay;
    permissions.gastos = permissions.gastos_view || permissions.gastos_create;
    permissions.gastos_view = permissions.gastos_view;
    permissions.gastos_edit = permissions.gastos_create;
    permissions.recursos = permissions.recursos_view || permissions.personal_view || permissions.almacen_view;
    permissions.recursos_view = permissions.recursos;
    permissions.recursos_edit = permissions.recursos_edit || permissions.almacen_adjust;
    permissions.executive_bi = permissions.executive_dashboard;
    permissions.executive_dashboard = permissions.executive_dashboard;
    permissions.mantenimiento = permissions.usuarios_admin || permissions.backups_admin || permissions.audit_logs;
    permissions.mantenimiento_admin = permissions.mantenimiento;

    try {
        let res;
        if (roleId) {
            res = await authFetch(`${API_BASE}/maintenance/roles/${roleId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    display_name: displayName,
                    description: description,
                    permissions_json: JSON.stringify(permissions)
                })
            });
        } else {
            res = await authFetch(`${API_BASE}/maintenance/roles`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name,
                    display_name: displayName,
                    description: description,
                    permissions_json: JSON.stringify(permissions)
                })
            });
        }

        const data = await res.json();
        if (!res.ok) {
            alert(data.detail || 'Error al guardar rol.');
            return;
        }

        alert(data.message || 'Rol guardado exitosamente.');
        closeModal('modalRoleForm');
        loadMaintenanceRolesList();
    } catch(e) {
        alert('Error de conexión al guardar rol.');
    }
}

async function deleteRole(roleId, roleName) {
    if (!confirm(`¿Está seguro de eliminar el rol '${roleName}'? Esta acción no se puede deshacer.`)) return;
    try {
        const res = await authFetch(`${API_BASE}/maintenance/roles/${roleId}`, { method: 'DELETE' });
        const data = await res.json();
        if (!res.ok) {
            alert(data.detail || 'Error al eliminar rol.');
            return;
        }
        alert(data.message || 'Rol eliminado con éxito.');
        loadMaintenanceRolesList();
    } catch(e) {
        alert('Error de conexión al eliminar rol.');
    }
}

// -----------------------------------------------------------------------------
// CREACIÓN DE USUARIO CON PERMISOS MODULARES
// -----------------------------------------------------------------------------

// Exponer al objeto global window para eventos inline y compatibilidad
if (typeof window !== 'undefined') {
    window.loadMaintenanceRolesList = loadMaintenanceRolesList;
    window.toggleAllRoleCheckboxes = toggleAllRoleCheckboxes;
    window.toggleAllUserCheckboxes = toggleAllUserCheckboxes;
    window.openNewRoleModal = openNewRoleModal;
    window.autoGenerateRoleSlug = autoGenerateRoleSlug;
    window.openEditRoleModal = openEditRoleModal;
    window.submitRoleForm = submitRoleForm;
    window.deleteRole = deleteRole;
}
