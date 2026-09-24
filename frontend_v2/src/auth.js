import { Api } from './api.js';
import { State } from './state.js';

export function checkAuthStatus() {
    const savedUser = localStorage.getItem('dalor_user') || sessionStorage.getItem('dalor_user');
    let savedToken = localStorage.getItem('dalor_token') || sessionStorage.getItem('dalor_token');
    
    if (savedToken === 'null' || savedToken === 'undefined' || typeof savedToken !== 'string' || !savedToken.trim()) {
        savedToken = null;
        localStorage.removeItem('dalor_token');
        sessionStorage.removeItem('dalor_token');
    }
    
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
    const avatarEl = document.getElementById('userAvatar');
    
    const fullName = State.currentUser.full_name || State.currentUser.username || 'Usuario';
    if (nameEl) nameEl.textContent = fullName;
    if (avatarEl) avatarEl.textContent = fullName.charAt(0).toUpperCase();

    if (roleEl) {
        const role = (State.currentUser.role_name || '').toLowerCase();
        const uname = (State.currentUser.username || '').toLowerCase();
        if (uname === 'director' || role.includes('director') || State.currentUser.is_superuser) {
            roleEl.textContent = '👑 Director General';
        } else if (role.includes('finanzas') || role.includes('administracion') || role.includes('administrador_financiero') || uname === 'administracion') {
            roleEl.textContent = '💼 Administración & Finanzas';
        } else if (role.includes('ingeniero') || role.includes('obra') || uname === 'ingeniero') {
            roleEl.textContent = '👷 Ing. Residente';
        } else if (role.includes('campo') || role.includes('supervisor') || uname === 'campo') {
            roleEl.textContent = '📱 Supervisor Campo';
        } else if (role.includes('almacen') || role.includes('almacenista') || uname === 'almacen') {
            roleEl.textContent = '📦 Almacén Central';
        } else {
            roleEl.textContent = State.currentUser.role_name || 'Personal';
        }
    }
}

export function applyPermissionMap(user) {
    if (!user) return;
    const role = (user.role_name || '').toLowerCase();
    const uname = (user.username || '').toLowerCase();
    const isDirector = uname === 'director' || role.includes('director') || user.is_superuser === true;
    const isFinanzas = isDirector || uname === 'administracion' || role.includes('finanzas') || role.includes('administrador_financiero');
    const isIngeniero = isDirector || uname === 'ingeniero' || role.includes('ingeniero');
    const isCampo = uname === 'campo' || role.includes('supervisor') || role.includes('campo');
    const isAlmacen = isDirector || uname === 'almacen' || role.includes('almacen') || role.includes('panol') || role.includes('taller');

    // Control de Dropdowns de la Barra de Módulos (Navbar)
    const dCom = document.getElementById('dropdown-comercial');
    if (dCom) dCom.style.display = isDirector ? 'inline-block' : 'none';

    const dProj = document.getElementById('dropdown-proyectos');
    if (dProj) dProj.style.display = (isDirector || isIngeniero) ? 'inline-block' : 'none';

    const dFin = document.getElementById('dropdown-finanzas');
    if (dFin) dFin.style.display = (isDirector || isFinanzas) ? 'inline-block' : 'none';

    const dRec = document.getElementById('dropdown-recursos');
    if (dRec) dRec.style.display = (isDirector || isIngeniero || isAlmacen) ? 'inline-block' : 'none';

    const dGas = document.getElementById('dropdown-gastos');
    if (dGas) dGas.style.display = (isAlmacen && !isDirector) ? 'none' : 'inline-block';

    const dMaint = document.getElementById('dropdown-mantenimiento');
    if (dMaint) dMaint.style.display = isDirector ? 'inline-block' : 'none';

    const dGer = document.getElementById('dropdown-gerencia');
    if (dGer) dGer.style.display = isDirector ? 'inline-block' : 'none';

    // Clases CSS de visibilidad por rol
    document.querySelectorAll('.role-director-only').forEach(el => el.style.display = isDirector ? '' : 'none');
    document.querySelectorAll('.role-admin-only').forEach(el => el.style.display = isFinanzas ? '' : 'none');
    document.querySelectorAll('.role-eng-only').forEach(el => el.style.display = isIngeniero ? '' : 'none');

    if (typeof window !== 'undefined') {
        window.applyPermissionMap = applyPermissionMap;
        window.renderUserBadge = renderUserBadge;
    }
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
        document.documentElement.classList.add('is-auth');
        const loginScreen = document.getElementById('app-login-screen');
        const authShell = document.getElementById('app-authenticated-shell');
        if (loginScreen) {
            loginScreen.style.setProperty('display', 'none', 'important');
            loginScreen.classList.add('hidden');
        }
        if (authShell) authShell.style.setProperty('display', 'block', 'important');
        
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
    const uname = (user.username || '').toLowerCase();
    if (role.includes('almacen') || uname === 'almacen') {
        window.switchView('resources', 'recursos');
        if (typeof window.openResourceSubtab === 'function') window.openResourceSubtab('materials');
    } else if (role.includes('supervisor') || role.includes('campo') || uname === 'campo') {
        window.switchView('pwa', 'gastos');
    } else if (role.includes('administrador_financiero') || (role.includes('finanzas') && !role.includes('director')) || uname === 'administracion') {
        window.switchView('financial', 'finanzas');
        if (typeof window.openFinancialSubtab === 'function') window.openFinancialSubtab('cxc');
    } else if (role.includes('ingeniero') || uname === 'ingeniero') {
        window.switchView('projects', 'proyectos');
        if (typeof window.loadProjectsList === 'function') window.loadProjectsList();
    } else {
        // Director General / Admin
        window.switchView('projects', 'proyectos');
        if (typeof window.loadProjectsList === 'function') window.loadProjectsList();
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
    try { document.documentElement.classList.remove('is-auth'); } catch(e) {}
    State.currentUser = null;
    State.authToken = null;
    window.currentUser = null;
    window.authToken = null;
    window.location.reload();
}

if (typeof window !== 'undefined') {
    window.performLogin = performLogin;
    window.executePortalLogin = performLogin;
    window.handleLogout = handleLogout;
    window.showLoginError = showLoginError;
    window.redirectUserByRole = redirectUserByRole;
    window.renderUserBadge = renderUserBadge;
    window.applyPermissionMap = applyPermissionMap;
}
