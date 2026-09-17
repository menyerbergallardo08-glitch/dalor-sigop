import { Api } from './api.js';
import { State } from './state.js';

export function checkAuthStatus() {
    const savedUser = localStorage.getItem('dalor_user') || sessionStorage.getItem('dalor_user');
    const savedToken = localStorage.getItem('dalor_token') || sessionStorage.getItem('dalor_token');
    
    if (savedUser && savedToken) {
        try {
            State.currentUser = JSON.parse(savedUser);
            State.authToken = savedToken;
            window.currentUser = State.currentUser;
            window.authToken = State.authToken;
            localStorage.setItem('dalor_user', JSON.stringify(State.currentUser));
            localStorage.setItem('dalor_token', State.authToken);
            sessionStorage.setItem('dalor_session_active', 'true');
            sessionStorage.setItem('dalor_user', JSON.stringify(State.currentUser));
            sessionStorage.setItem('dalor_token', State.authToken);
            renderUserBadge();
            applyPermissionMap(State.currentUser);
            return true;
        } catch (e) {
            sessionStorage.clear();
            localStorage.removeItem('dalor_user');
            localStorage.removeItem('dalor_token');
        }
    }
    
    State.currentUser = null;
    State.authToken = null;
    window.currentUser = null;
    window.authToken = null;
    return false;
}

export function renderUserBadge() {
    if (!State.currentUser) return;
    const nameEl = document.getElementById('userFullNameDisplay');
    const roleEl = document.getElementById('userRoleDisplay');
    if (nameEl) nameEl.textContent = State.currentUser.full_name || State.currentUser.username;
    if (roleEl) {
        const role = (State.currentUser.role_name || '').toLowerCase();
        if (role.includes('director') || role.includes('admin')) roleEl.textContent = '👑 Director General';
        else if (role.includes('finanzas') || role.includes('administracion')) roleEl.textContent = '💼 Administración';
        else if (role.includes('ingeniero') || role.includes('obra')) roleEl.textContent = '👷 Ing. Residente';
        else if (role.includes('campo') || role.includes('supervisor')) roleEl.textContent = '📱 Supervisor Campo';
        else if (role.includes('almacen')) roleEl.textContent = '📦 Almacén Central';
        else roleEl.textContent = State.currentUser.role_name;
    }
}

export function applyPermissionMap(user) {
    if (!user) return;
    const role = (user.role_name || user.username || '').toLowerCase();
    const isDirector = role.includes('director') || role.includes('admin') || user.is_superuser;
    const isAdmin = isDirector || role.includes('finanzas') || role.includes('administracion');
    const isIngeniero = isDirector || isAdmin || role.includes('ingeniero') || role.includes('obra');
    
    document.querySelectorAll('.role-director-only').forEach(el => el.style.display = isDirector ? '' : 'none');
    document.querySelectorAll('.role-admin-only').forEach(el => el.style.display = isAdmin ? '' : 'none');
    document.querySelectorAll('.role-eng-only').forEach(el => el.style.display = isIngeniero ? '' : 'none');
}

export async function performLogin(username, password) {
    if (!username || !password) {
        showLoginError('Por favor ingresa usuario y contraseña');
        return;
    }

    const errBox = document.getElementById('loginErrorMessage');
    const btnSubmit = document.getElementById('btnSubmitPortalLogin');
    if (errBox) errBox.style.display = 'none';
    if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Accediendo...';
    }

    try {
        const data = await Api.auth.login(username, password);
        State.currentUser = data.user;
        State.authToken = data.access_token;
        window.currentUser = data.user;
        window.authToken = data.access_token;
        
        localStorage.setItem('dalor_user', JSON.stringify(State.currentUser));
        localStorage.setItem('dalor_token', State.authToken);
        sessionStorage.setItem('dalor_session_active', 'true');
        sessionStorage.setItem('dalor_user', JSON.stringify(State.currentUser));
        sessionStorage.setItem('dalor_token', State.authToken);

        // Desbloquear interfaz
        document.body.classList.add('authenticated');
        const loginScreen = document.getElementById('app-login-screen');
        if (loginScreen) loginScreen.style.setProperty('display', 'none', 'important');
        
        renderUserBadge();
        applyPermissionMap(State.currentUser);
        redirectUserByRole(State.currentUser);

        // Inicializar cargas visuales si existen en app.js
        if (typeof window.loadInitialMasterData === 'function') {
            try { window.loadInitialMasterData(); } catch(e) { console.warn(e); }
        }
        if (typeof window.loadExecutiveDashboard === 'function') {
            try { window.loadExecutiveDashboard(); } catch(e) {}
        }
        if (typeof window.loadProjectsList === 'function') {
            try { window.loadProjectsList(); } catch(e) {}
        }
        if (typeof window.loadMaterialsList === 'function') {
            try { window.loadMaterialsList(); } catch(e) {}
        }

        if (window.showToast) {
            window.showToast(`Bienvenido, ${State.currentUser.full_name || State.currentUser.username}`, 'success');
        }
    } catch (err) {
        showLoginError(err.message || 'Usuario o contraseña incorrectos');
    } finally {
        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = '<i class="fa-solid fa-right-to-bracket" style="color: #f5b800;"></i> Iniciar Sesión';
        }
    }
}

export function redirectUserByRole(user) {
    if (!user) return;
    const role = (user.role_name || user.username || '').toLowerCase();
    if (role.includes('almacen')) {
        window.switchView('resources', 'recursos');
        if (typeof window.openResourceSubtab === 'function') window.openResourceSubtab('materials');
    } else if (role.includes('supervisor') || role.includes('campo')) {
        window.switchView('pwa', 'gastos');
    } else if (role.includes('admin') || role.includes('finanzas')) {
        window.switchView('financial', 'finanzas');
        if (typeof window.openFinancialSubtab === 'function') window.openFinancialSubtab('cxc');
    } else if (role.includes('ingeniero') || role.includes('obra')) {
        window.switchView('projects', 'proyectos');
        if (typeof window.loadProjectsList === 'function') window.loadProjectsList();
    } else {
        window.switchView('executive', 'gerencia');
        if (typeof window.loadExecutiveDashboard === 'function') window.loadExecutiveDashboard();
    }
}

export function showLoginError(msg) {
    const errBox = document.getElementById('loginErrorMessage');
    const errTxt = document.getElementById('loginErrorText');
    if (errTxt) errTxt.textContent = msg;
    if (errBox) errBox.style.display = 'block';
}

export function handleLogout() {
    sessionStorage.clear();
    localStorage.removeItem('dalor_token');
    localStorage.removeItem('dalor_user');
    State.currentUser = null;
    State.authToken = null;
    window.currentUser = null;
    window.authToken = null;
    window.location.reload();
}
