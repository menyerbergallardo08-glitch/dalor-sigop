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

import { 
    checkAuthStatus, 
    performLogin, 
    handleLogout, 
    renderUserBadge, 
    applyPermissionMap, 
    redirectUserByRole, 
    showLoginError 
} from '../../auth.js';

let allSystemUsers = window.allSystemUsers = window.allSystemUsers || [];
let allSystemRoles = window.allSystemRoles = window.allSystemRoles || [];

// --- BLOQUE L497-L764 ---
// ==============================================================================

// 🔐 CONTROLADOR CORPORATIVO DE AUTENTICACIÓN & SESIONES (PRODUCCIÓN)

// ==============================================================================



window.togglePasswordVisibility = function(inputId, btn) {

    const el = document.getElementById(inputId);

    if (!el) return;

    if (el.type === 'password') {

        el.type = 'text';

        if (btn) btn.innerHTML = '<i class="fa-solid fa-eye-slash"></i>';

    } else {

        el.type = 'password';

        if (btn) btn.innerHTML = '<i class="fa-solid fa-eye"></i>';

    }

};



window.toggleDemoProfiles = function() {

    const grid = document.getElementById('demoProfilesGrid');

    if (grid) {

        grid.style.display = (grid.style.display === 'none' || !grid.style.display) ? 'grid' : 'none';

    }

};



const fillQuickLogin = performLogin;
const fillAndSubmitQuickLogin = performLogin;
const loginDirectlyAs = performLogin;
const submitLogin = function(e) {
    if (e && e.preventDefault) e.preventDefault();
    const u = document.getElementById('login_username')?.value?.trim();
    const p = document.getElementById('login_password')?.value;
    performLogin(u, p);
};

window.quickFillAndLogin = performLogin;
window.handlePortalLogin = function(e) {
    if (e && e.preventDefault) e.preventDefault();
    const u = document.getElementById('portal_username')?.value?.trim();
    const p = document.getElementById('portal_password')?.value;
    performLogin(u, p);
};
window.loginDirectlyAs = loginDirectlyAs;
window.fillAndSubmitQuickLogin = fillAndSubmitQuickLogin;
window.fillQuickLogin = fillQuickLogin;
window.submitLogin = submitLogin;






async function loadMaintenanceUsersList() {
    const tbody = document.getElementById('maintenanceUsersTableBody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #94a3b8; padding: 16px;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando usuarios...</td></tr>`;

    try {
        const res = await authFetch(`${API_BASE}/maintenance/users`);
        allSystemUsers = await res.json();

        if (allSystemUsers.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #94a3b8; padding: 16px;">No hay usuarios registrados.</td></tr>`;
            return;
        }

        const roleBadges = {
            'director_general': '<span style="background: #ede9fe; color: #5b21b6; padding: 2px 6px; border-radius: 4px; font-weight: 800; font-size: 11px;">👑 Director General</span>',
            'administrador_financiero': '<span style="background: #d1fae5; color: #065f46; padding: 2px 6px; border-radius: 4px; font-weight: 800; font-size: 11px;">💼 Administración & Finanzas</span>',
            'ingeniero_obra': '<span style="background: #e0f2fe; color: #0369a1; padding: 2px 6px; border-radius: 4px; font-weight: 800; font-size: 11px;">👷 Ingeniero Residente</span>',
            'supervisor_campo': '<span style="background: #fef3c7; color: #92400e; padding: 2px 6px; border-radius: 4px; font-weight: 800; font-size: 11px;">📱 Supervisor Campo</span>',
            'auditor_control': '<span style="background: #ffedd5; color: #c2410c; padding: 2px 6px; border-radius: 4px; font-weight: 800; font-size: 11px;">🔍 Auditor de Control</span>'
        };

        tbody.innerHTML = allSystemUsers.map(u => `
            <tr>
                <td style="font-weight: 800; color: var(--dalor-navy);">${u.username}</td>
                <td style="font-weight: 700;">${u.full_name}</td>
                <td style="color: #64748b;">${u.email || '-'}</td>
                <td>${roleBadges[u.role_name] || `<span style="background: #f1f5f9; color: #334155; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 11px;">🛡️ ${u.role_name}</span>`}</td>
                <td style="color: #64748b; font-size: 11px;">${u.last_login}</td>
                <td>
                    <span style="padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 800; background: ${u.is_active ? '#dcfce7' : '#fee2e2'}; color: ${u.is_active ? '#166534' : '#991b1b'};">
                        ${u.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                </td>
                <td style="text-align: center; white-space: nowrap;">
                    <button onclick="openUserPermissionsModal(${u.id})" class="btn-secondary" style="padding: 3px 7px; font-size: 11px; margin-right: 4px;" title="Modificar Mapa de Permisos">
                        <i class="fa-solid fa-key" style="color: #0284c7;"></i> Permisos
                    </button>
                    <button onclick="toggleUserStatus(${u.id})" class="btn-secondary" style="padding: 3px 7px; font-size: 11px; color: ${u.is_active ? '#e11d48' : '#059669'};" title="Activar/Desactivar Cuenta">
                        <i class="fa-solid fa-power-off"></i>
                    </button>
                </td>
            </tr>
        `).join('');

    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #e11d48; padding: 16px;">Error al cargar directorio de usuarios.</td></tr>`;
    }
}


async function openNewUserModal() {
    const form = document.getElementById('newUserForm');
    if (form) form.reset();

    // Populate roles dynamically if available
    try {
        if (!allSystemRoles || allSystemRoles.length === 0) {
            const res = await authFetch(`${API_BASE}/maintenance/roles`);
            if (res.ok) allSystemRoles = await res.json();
        }
        const select = document.getElementById('nusr_role');
        if (select && allSystemRoles.length > 0) {
            select.innerHTML = allSystemRoles.map(r => `
                <option value="${r.name}">${r.display_name}</option>
            `).join('');
        }
    } catch(e) {}

    onNewUserRoleChanged();
    openModal('modalNewUser');
}

function onNewUserRoleChanged() {
    const roleSelect = document.getElementById('nusr_role');
    if (!roleSelect) return;
    const selectedRoleName = roleSelect.value;
    const role = allSystemRoles.find(r => r.name === selectedRoleName);
    const descEl = document.getElementById('nusr_role_desc');
    if (descEl) {
        if (role && role.description) {
            descEl.textContent = `${role.display_name}: ${role.description}. Heredará sus 32 permisos granulares automáticamente.`;
        } else if (role) {
            descEl.textContent = `Rol asignado: ${role.display_name}. Heredará sus 32 permisos granulares automáticamente.`;
        } else {
            descEl.textContent = 'Este usuario heredará automáticamente la matriz de 32 permisos asignada al rol seleccionado.';
        }
    }
}

const onUserRoleTemplateChanged = onNewUserRoleChanged;

async function submitCreateUser(event) {
    event.preventDefault();
    const username = document.getElementById('nusr_username').value.trim();
    const full_name = document.getElementById('nusr_fullname').value.trim();
    const email = document.getElementById('nusr_email').value.trim();
    const password = document.getElementById('nusr_password').value;
    const role_name = document.getElementById('nusr_role').value;

    const role = allSystemRoles.find(r => r.name === role_name);
    let permissions_json = null;
    if (role && role.permissions_json) {
        permissions_json = typeof role.permissions_json === 'string' ? role.permissions_json : JSON.stringify(role.permissions_json);
    }

    try {
        const res = await authFetch(`${API_BASE}/maintenance/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username, full_name, email, password, role_name,
                permissions_json
            })
        });

        const data = await res.json();
        if (!res.ok) {
            alert(data.detail || 'Error al crear usuario.');
            return;
        }

        alert(`¡Usuario '${username}' creado con éxito con los permisos asignados del rol '${role ? role.display_name : role_name}'!`);
        closeModal('modalNewUser');
        loadMaintenanceUsersList();
    } catch (e) {
        alert('Error de conexión al registrar usuario.');
    }
}

function openUserPermissionsModal(userId) {
    const user = allSystemUsers.find(u => u.id === userId);
    if (!user) return;

    document.getElementById('perm_target_user_id').value = user.id;
    document.getElementById('permModalUsername').textContent = user.username;
    document.getElementById('permModalFullName').textContent = user.full_name;

    let p = {};
    if (typeof user.permissions_json === 'string') {
        try { p = JSON.parse(user.permissions_json); } catch(e) { p = {}; }
    } else if (user.permissions_json) {
        p = user.permissions_json;
    } else if (user.permissions) {
        p = user.permissions;
    }

    GRANULAR_PERM_KEYS.forEach(k => {
        const el = document.getElementById('perm_' + k);
        if (!el) return;
        if (p[k] !== undefined) {
            el.checked = !!p[k];
        } else if (k.startsWith('comercial_') || k.startsWith('quotations_') || k === 'services_view') {
            el.checked = !!(p.comercial || p.comercial_view);
        } else if (k.startsWith('proyectos_')) {
            el.checked = !!(p.proyectos || p.proyectos_view);
        } else if (['cxc_view', 'cxc_pay', 'cxp_view', 'cxp_pay', 'bancos_view', 'conciliacion_view', 'retiros_view'].includes(k)) {
            el.checked = !!(p.finanzas || p.finanzas_view);
        } else if (k.startsWith('gastos_')) {
            el.checked = !!(p.gastos || p.gastos_view);
        } else if (k.startsWith('recursos_') || k.startsWith('personal_') || k === 'mantenimiento_vehicular' || k === 'cuadrillas_assign') {
            el.checked = !!(p.recursos || p.recursos_view);
        } else if (k.startsWith('almacen_') || k.startsWith('requisiciones_') || k.startsWith('despacho_') || k.startsWith('alquileres_')) {
            el.checked = !!(p.recursos || p.recursos_view);
        } else if (k === 'executive_dashboard') {
            el.checked = !!(p.executive_bi || p.executive_dashboard);
        } else if (['usuarios_admin', 'audit_logs', 'backups_admin'].includes(k)) {
            el.checked = !!(p.mantenimiento || p.mantenimiento_admin);
        } else {
            el.checked = false;
        }
    });

    document.getElementById('modalUserPermissions').classList.remove('hidden');
}

async function submitSaveUserPermissions() {
    const userId = parseInt(document.getElementById('perm_target_user_id').value);

    const permissions = {};
    GRANULAR_PERM_KEYS.forEach(k => {
        const el = document.getElementById('perm_' + k);
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
        const token = window.authToken || localStorage.getItem('dalor_token');
        const headers = { 
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };

        const res = await authFetch(`${API_BASE}/maintenance/users/${userId}/permissions`, {
            method: 'PUT',
            headers: headers,
            body: JSON.stringify({ permissions_json: JSON.stringify(permissions) })
        });

        const data = await res.json();
        if (!res.ok) {
            alert(data.detail || 'Error al actualizar permisos.');
            return;
        }



        alert('Mapa de permisos guardado con éxito.');

        closeModal('modalUserPermissions');

        loadMaintenanceUsersList();



        // Si es el usuario actual, actualizar permisos en vivo

        if (currentUser && currentUser.id === userId) {

            currentUser.permissions = permissions;

            localStorage.setItem('dalor_user', JSON.stringify(currentUser));

            applyPermissionMap(currentUser);

        }



    } catch (e) {

        alert('Error de conexión al guardar permisos.');

    }

}



async function toggleUserStatus(userId) {

    if (!confirm('¿Deseas cambiar el estado de acceso de este usuario?')) return;

    try {

        const res = await authFetch(`${API_BASE}/maintenance/users/${userId}/toggle-status`, { method: 'PUT' });

        const data = await res.json();

        if (!res.ok) {

            alert(data.detail || 'Error al cambiar estado.');

            return;

        }

        loadMaintenanceUsersList();

    } catch (e) {

        alert('Error al procesar solicitud.');

    }

}



let allAuditLogsCache = [];


// --- BLOQUE L12542-L12739 ---
// ==============================================================================

// 👤 GESTIÓN Y CREACIÓN DE USUARIOS DE SISTEMA

// ==============================================================================

async function openUserManagementModal() {

    openModal("modalUserManagement");

    await loadUsersManagementTable();

}



async function loadUsersManagementTable() {

    const tbody = document.getElementById("userManagementTableBody");

    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #94a3b8; padding: 20px;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando usuarios...</td></tr>`;



    try {

        const res = await authFetch(`${API_BASE}/auth/users`);

        if (!res.ok) throw new Error("Error al obtener usuarios");

        const users = await res.json();



        if (!users || users.length === 0) {

            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #94a3b8; padding: 20px;">No hay usuarios registrados.</td></tr>`;

            return;

        }



        const roleNamesMap = {

            "director_general": "Director General / Socio",

            "administrador_financiero": "Administración & Finanzas",

            "ingeniero_obra": "Ingeniero Residente de Obra",

            "supervisor_campo": "Supervisor de Campo / Faena"

        };



        tbody.innerHTML = users.map(u => `

            <tr>

                <td><b style="color: var(--dalor-navy); font-family: monospace;">@${u.username}</b></td>

                <td><b>${u.full_name}</b></td>

                <td><span style="color: #64748b; font-size: 11px;">${u.email || '-'}</span></td>

                <td><span class="badge-tag" style="background: #e0f2fe; color: #0369a1; font-size: 10px;">${roleNamesMap[u.role_name] || u.role_name}</span></td>

                <td><span style="color: ${u.is_active ? '#059669' : '#ef4444'}; font-weight: 700; font-size: 11px;">${u.is_active ? '● Activo' : '○ Inactivo'}</span></td>

                <td><span style="color: #64748b; font-size: 11px;">${u.last_login}</span></td>

            </tr>

        `).join("");

    } catch (err) {

        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #ef4444; padding: 20px;">Error al cargar usuarios: ${err.message}</td></tr>`;

    }

}



function openNewUserModal_v2() {

    const form = document.getElementById("newUserForm");

    if (form) form.reset();

    openModal("modalNewUser");

}



async function submitCreateUser_v2(e) {

    e.preventDefault();

    const username = document.getElementById("nusr_username").value.trim();

    const password = document.getElementById("nusr_password").value.trim();

    const fullname = document.getElementById("nusr_fullname").value.trim();

    const email = document.getElementById("nusr_email").value.trim();

    const role = document.getElementById("nusr_role").value;



    const payload = {

        username: username,

        password: password,

        full_name: fullname,

        email: email || null,

        role_name: role,

        is_active: true,

        is_superuser: role === "director_general"

    };



    try {

        const res = await authFetch(`${API_BASE}/auth/users`, {

            method: "POST",

            headers: { "Content-Type": "application/json" },

            body: JSON.stringify(payload)

        });



        if (!res.ok) {

            const err = await res.json();

            throw new Error(err.detail || "Error al crear usuario");

        }



        closeModal("modalNewUser");

        alert(`✅ Usuario @${username} (${fullname}) creado exitosamente.`);

        await loadUsersManagementTable();

    } catch (err) {

        alert(`❌ Error: ${err.message}`);

    }

}




// Exponer al objeto global window para eventos inline y compatibilidad
if (typeof window !== 'undefined') {
    window.loadMaintenanceUsersList = loadMaintenanceUsersList;
    window.openNewUserModal = openNewUserModal;
    window.onNewUserRoleChanged = onNewUserRoleChanged;
    window.submitCreateUser = submitCreateUser;
    window.openUserPermissionsModal = openUserPermissionsModal;
    window.submitSaveUserPermissions = submitSaveUserPermissions;
    window.toggleUserStatus = toggleUserStatus;
    window.openUserManagementModal = openUserManagementModal;
    window.loadUsersManagementTable = loadUsersManagementTable;
    window.openNewUserModal_v2 = openNewUserModal_v2;
    window.submitCreateUser_v2 = submitCreateUser_v2;
}
