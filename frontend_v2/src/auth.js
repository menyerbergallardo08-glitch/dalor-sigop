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
            try { renderUserBadge(); } catch(e) { console.warn("renderUserBadge warn:", e); }
            try { applyPermissionMap(State.currentUser); } catch(e) { console.warn("applyPermissionMap warn:", e); }

            // Sincronización transparente en segundo plano con /api/v1/auth/me para refrescar permisos si cambió el rol
            if (State.authToken) {
                const apiBase = window.API_BASE || (window.location.origin + '/api/v1');
                fetch(`${apiBase}/auth/me`, {
                    headers: { 'Authorization': 'Bearer ' + State.authToken }
                }).then(res => {
                    if (res.ok) return res.json();
                    if (res.status === 401 || res.status === 403) {
                        handleLogout();
                    }
                    return null;
                }).then(freshData => {
                    if (freshData && freshData.username) {
                        State.currentUser = { ...State.currentUser, ...freshData };
                        window.currentUser = State.currentUser;
                        localStorage.setItem('dalor_user', JSON.stringify(State.currentUser));
                        sessionStorage.setItem('dalor_user', JSON.stringify(State.currentUser));
                        try { renderUserBadge(); } catch(e) {}
                        try { applyPermissionMap(State.currentUser); } catch(e) {}
                    }
                }).catch(() => {});
            }

            return true;
        } catch (e) {
            console.error("JSON parse error in checkAuthStatus:", e);
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

    // 1. Extraer permisos
    let p = {};
    if (typeof user.permissions_json === 'string') {
        try { p = JSON.parse(user.permissions_json); } catch(e) { p = {}; }
    } else if (user.permissions_json && typeof user.permissions_json === 'object') {
        p = user.permissions_json;
    } else if (user.permissions && typeof user.permissions === 'object') {
        p = user.permissions;
    }

    // 2. Detectar si existen claves de la matriz granular enterprise (32 permisos)
    const GRANULAR_TEST_KEYS = [
        'comercial_view', 'comercial_edit', 'quotations_create',
        'proyectos_view', 'proyectos_edit', 'proyectos_create',
        'cxc_view', 'cxc_pay', 'cxp_view', 'cxp_pay', 'bancos_view', 'conciliacion_view', 'retiros_view',
        'gastos_view', 'gastos_create', 'gastos_approve', 'gastos_export',
        'recursos_view', 'personal_view', 'almacen_view',
        'usuarios_admin', 'backups_admin', 'executive_dashboard'
    ];
    const hasExplicitGranular = GRANULAR_TEST_KEYS.some(k => p[k] !== undefined);

    let hasComercial, hasProyectos, hasGastos, hasRecursos;
    let canCxc, canCxp, canBancos, canPartners, hasFinanzas;
    let hasMantenimiento, hasBI;

    if (hasExplicitGranular) {
        // MODO GRANULAR ESTRICTO
        hasComercial = isDirector || !!(p.comercial_view || p.comercial_edit || p.quotations_create || p.clients_manage || p.services_view);
        hasProyectos = isDirector || !!(p.proyectos_view || p.proyectos_edit || p.proyectos_create || p.valuaciones_approve);
        hasGastos = isDirector || !!(p.gastos_view || p.gastos_create || p.gastos_approve || p.gastos_export);
        canCxc = isDirector || !!(p.cxc_view || p.cxc_pay);
        canCxp = isDirector || !!(p.cxp_view || p.cxp_pay);
        canBancos = isDirector || !!(p.bancos_view || p.conciliacion_view);
        canPartners = isDirector || !!(p.retiros_view || p.bancos_view);
        hasFinanzas = isDirector || canCxc || canCxp || canBancos || canPartners || !!p.finanzas_view;
        hasRecursos = isDirector || !!(p.recursos_view || p.recursos_edit || p.personal_view || p.personal_edit || p.mantenimiento_vehicular || p.cuadrillas_assign || p.almacen_view || p.almacen_adjust || p.requisiciones_view || p.requisiciones_create || p.despacho_view || p.despacho_create || p.alquileres_view || p.alquileres_create);
        hasMantenimiento = isDirector || !!(p.usuarios_admin || p.backups_admin || p.audit_logs || p.mantenimiento_admin);
        hasBI = isDirector || !!(p.executive_dashboard || p.executive_bi);
    } else {
        // FALLBACK COMPATIBILIDAD CON ROLES HEREDADOS PREVIOS
        const isFinanzasLegacy = isDirector || uname === 'administracion' || role.includes('finanzas') || role.includes('administrador_financiero');
        const isIngenieroLegacy = isDirector || uname === 'ingeniero' || role.includes('ingeniero');
        const isAlmacenLegacy = isDirector || uname === 'almacen' || role.includes('almacen') || role.includes('panol') || role.includes('taller');
        const isCampoLegacy = uname === 'campo' || role.includes('supervisor') || role.includes('campo');

        hasComercial = isDirector || p.comercial || p.comercial_view || (!role && true);
        hasProyectos = isDirector || p.proyectos || p.proyectos_view || isIngenieroLegacy;
        hasGastos = isDirector || p.gastos || p.gastos_view || !isAlmacenLegacy;
        hasRecursos = isDirector || p.recursos || p.recursos_view || isIngenieroLegacy || isAlmacenLegacy;
        canCxc = isDirector || isFinanzasLegacy || !!p.cxc_view;
        canCxp = isDirector || isFinanzasLegacy || !!p.cxp_view;
        canBancos = isDirector || isFinanzasLegacy || !!p.bancos_view;
        canPartners = isDirector;
        hasFinanzas = isDirector || isFinanzasLegacy || !!p.finanzas;
        hasMantenimiento = isDirector || !!p.mantenimiento;
        hasBI = isDirector || !!p.executive_bi;
    }

    // Dropdowns Principales de Navegación (Navbar)
    const dCom = document.getElementById('dropdown-comercial');
    if (dCom) dCom.style.display = hasComercial ? 'inline-block' : 'none';

    const dProj = document.getElementById('dropdown-proyectos');
    if (dProj) dProj.style.display = hasProyectos ? 'inline-block' : 'none';

    const dFin = document.getElementById('dropdown-finanzas');
    if (dFin) dFin.style.display = hasFinanzas ? 'inline-block' : 'none';

    const dRec = document.getElementById('dropdown-recursos');
    if (dRec) dRec.style.display = hasRecursos ? 'inline-block' : 'none';

    const dGas = document.getElementById('dropdown-gastos');
    if (dGas) dGas.style.display = hasGastos ? 'inline-block' : 'none';

    const dMaint = document.getElementById('dropdown-mantenimiento');
    if (dMaint) dMaint.style.display = hasMantenimiento ? 'inline-block' : 'none';

    const dGer = document.getElementById('dropdown-gerencia');
    if (dGer) dGer.style.display = hasBI ? 'inline-block' : 'none';

    // 1. Dropdown Menú de Comercial
    const itmComQuotes = document.getElementById('nav-item-com-quotes');
    if (itmComQuotes) itmComQuotes.style.display = (isDirector || p.quotations_create || p.comercial_view || !hasExplicitGranular) ? 'flex' : 'none';

    const itmComClients = document.getElementById('nav-item-com-clients');
    if (itmComClients) itmComClients.style.display = (isDirector || p.clients_manage || p.comercial_view || !hasExplicitGranular) ? 'flex' : 'none';

    const itmComServices = document.getElementById('nav-item-com-services');
    if (itmComServices) itmComServices.style.display = (isDirector || p.services_view || p.comercial_view || !hasExplicitGranular) ? 'flex' : 'none';

    // 2. Dropdown Menú de Proyectos
    const itmProProjects = document.getElementById('nav-item-pro-projects');
    if (itmProProjects) itmProProjects.style.display = (isDirector || p.proyectos_view || p.proyectos_edit || !hasExplicitGranular) ? 'flex' : 'none';

    const itmProDashboard = document.getElementById('nav-item-pro-dashboard');
    if (itmProDashboard) itmProDashboard.style.display = (isDirector || p.proyectos_view || p.proyectos_edit || !hasExplicitGranular) ? 'flex' : 'none';

    // 3. Dropdown Menú de Finanzas (Navbar Superior)
    const itmFinCxc = document.getElementById('nav-item-fin-cxc');
    if (itmFinCxc) itmFinCxc.style.display = canCxc ? 'flex' : 'none';

    const itmFinCxp = document.getElementById('nav-item-fin-cxp');
    if (itmFinCxp) itmFinCxp.style.display = canCxp ? 'flex' : 'none';

    const itmFinSummary = document.getElementById('nav-item-fin-summary');
    if (itmFinSummary) itmFinSummary.style.display = canBancos ? 'flex' : 'none';

    const itmFinPartners = document.getElementById('nav-item-fin-partners');
    if (itmFinPartners) itmFinPartners.style.display = canPartners ? 'flex' : 'none';

    // 4. Subpestañas y Botones de Acción de Finanzas (Dentro de view-financial)
    const tabCxc = document.getElementById('tabbtn-fin-cxc');
    if (tabCxc) tabCxc.style.display = canCxc ? '' : 'none';

    const tabCxp = document.getElementById('tabbtn-fin-cxp');
    if (tabCxp) tabCxp.style.display = canCxp ? '' : 'none';

    const tabSummary = document.getElementById('tabbtn-fin-summary');
    if (tabSummary) tabSummary.style.display = canBancos ? '' : 'none';

    const tabPartners = document.getElementById('tabbtn-fin-partners');
    if (tabPartners) tabPartners.style.display = canPartners ? '' : 'none';

    const btnNewRec = document.getElementById('btnFinNewReceivable');
    if (btnNewRec) btnNewRec.style.display = canCxc ? '' : 'none';

    const btnRecPay = document.getElementById('btnFinReceiveClientPayment');
    if (btnRecPay) btnRecPay.style.display = canCxc ? '' : 'none';

    const btnNewPay = document.getElementById('btnFinNewPayable');
    if (btnNewPay) btnNewPay.style.display = canCxp ? '' : 'none';

    // 5. Dropdown Menú de Recursos
    const canAlmacen = isDirector || !!(p.almacen_view || p.almacen_adjust || p.recursos_view || !hasExplicitGranular);
    const canPersonal = isDirector || !!(p.personal_view || p.personal_edit || p.recursos_view || !hasExplicitGranular);
    const canEquipos = isDirector || !!(p.recursos_view || p.recursos_edit || !hasExplicitGranular);

    const itmRecDashboard = document.getElementById('nav-item-rec-dashboard');
    if (itmRecDashboard) itmRecDashboard.style.display = canEquipos ? 'flex' : 'none';

    const itmRecFleet = document.getElementById('nav-item-rec-fleet');
    if (itmRecFleet) itmRecFleet.style.display = canEquipos ? 'flex' : 'none';

    const itmRecMachinery = document.getElementById('nav-item-rec-machinery');
    if (itmRecMachinery) itmRecMachinery.style.display = canEquipos ? 'flex' : 'none';

    const itmRecTools = document.getElementById('nav-item-rec-tools');
    if (itmRecTools) itmRecTools.style.display = canEquipos ? 'flex' : 'none';

    const itmRecMaterials = document.getElementById('nav-item-rec-materials');
    if (itmRecMaterials) itmRecMaterials.style.display = canAlmacen ? 'flex' : 'none';

    const itmRecPersonnel = document.getElementById('nav-item-rec-personnel');
    if (itmRecPersonnel) itmRecPersonnel.style.display = canPersonal ? 'flex' : 'none';

    const itmRecReqs = document.getElementById('nav-item-rec-reqs');
    if (itmRecReqs) itmRecReqs.style.display = (isDirector || p.requisiciones_view || p.requisiciones_create || !hasExplicitGranular) ? 'flex' : 'none';

    const itmRecDispatch = document.getElementById('nav-item-rec-dispatch');
    if (itmRecDispatch) itmRecDispatch.style.display = (isDirector || p.despacho_view || p.despacho_create || !hasExplicitGranular) ? 'flex' : 'none';

    const itmRecRentals = document.getElementById('nav-item-rec-rentals');
    if (itmRecRentals) itmRecRentals.style.display = (isDirector || p.alquileres_view || p.alquileres_create || !hasExplicitGranular) ? 'flex' : 'none';

    // 6. Opciones del Menú Gastos
    const itmInbox = document.getElementById('item-gasto-inbox');
    if (itmInbox) itmInbox.style.display = (isDirector || p.gastos_approve || p.gastos_view) ? 'flex' : 'none';

    const itmPwa = document.getElementById('item-gasto-pwa');
    if (itmPwa) itmPwa.style.display = (isDirector || p.gastos_create || !hasExplicitGranular) ? 'flex' : 'none';

    const itmManual = document.getElementById('item-gasto-manual');
    if (itmManual) itmManual.style.display = (isDirector || p.gastos_create || p.gastos_approve) ? 'flex' : 'none';

    const itmDashboard = document.getElementById('item-gasto-dashboard');
    if (itmDashboard) itmDashboard.style.display = (isDirector || p.executive_dashboard) ? 'flex' : 'none';

    const itmTree = document.getElementById('item-gasto-tree');
    if (itmTree) itmTree.style.display = (isDirector || p.gastos_view) ? 'flex' : 'none';

    // Elementos operativos de UI
    const btnQF = document.getElementById('btnQuickFlow');
    if (btnQF) btnQF.style.display = (hasGastos && (isDirector || p.gastos_create)) ? 'inline-flex' : 'none';

    const tasaBox = document.getElementById('bcvTasaBadge') || document.querySelector('.tasa-editor-box');
    if (tasaBox) tasaBox.style.display = (isDirector || hasFinanzas) ? 'inline-flex' : 'none';

    // Clases CSS de visibilidad por rol
    document.querySelectorAll('.role-director-only').forEach(el => el.style.display = isDirector ? '' : 'none');
    document.querySelectorAll('.role-admin-only').forEach(el => el.style.display = (isDirector || hasFinanzas) ? '' : 'none');
    document.querySelectorAll('.role-eng-only').forEach(el => el.style.display = (isDirector || hasProyectos) ? '' : 'none');

    // Auto-ajustar subtab financiero al primer tab autorizado si el actual no tiene permiso
    try {
        let validFinTab = 'cxc';
        if (canCxc) validFinTab = 'cxc';
        else if (canCxp) validFinTab = 'cxp';
        else if (canBancos) validFinTab = 'summary';
        else if (canPartners) validFinTab = 'partners';

        const currentFinTab = sessionStorage.getItem('dalor_active_subtab_financial') || localStorage.getItem('dalor_active_subtab_financial') || 'cxc';
        const isCurrentAllowed = (currentFinTab === 'cxc' && canCxc) ||
                                 (currentFinTab === 'cxp' && canCxp) ||
                                 (currentFinTab === 'summary' && canBancos) ||
                                 (currentFinTab === 'partners' && canPartners);
        if (!isCurrentAllowed) {
            sessionStorage.setItem('dalor_active_subtab_financial', validFinTab);
            localStorage.setItem('dalor_active_subtab_financial', validFinTab);
        }
    } catch(e) {}

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
    const isDirector = uname === 'director' || role.includes('director') || user.is_superuser === true;

    let p = {};
    if (typeof user.permissions_json === 'string') {
        try { p = JSON.parse(user.permissions_json); } catch(e) { p = {}; }
    } else if (user.permissions_json && typeof user.permissions_json === 'object') {
        p = user.permissions_json;
    } else if (user.permissions && typeof user.permissions === 'object') {
        p = user.permissions;
    }

    const canCxc = isDirector || p.cxc_view === true || p.cxc_pay === true;
    const canCxp = isDirector || p.cxp_view === true || p.cxp_pay === true;
    const hasFin = isDirector || canCxc || canCxp || p.bancos_view === true || p.finanzas === true;
    const hasProj = isDirector || p.proyectos === true || p.proyectos_view === true || role.includes('ingeniero');
    const hasRec = isDirector || p.recursos === true || p.recursos_view === true || role.includes('almacen');
    const hasGas = isDirector || p.gastos === true || p.gastos_view === true || p.gastos_create === true || role.includes('campo');
    const hasCom = isDirector || p.comercial === true || p.comercial_view === true;
    const hasMaint = isDirector || p.mantenimiento === true || p.usuarios_admin === true;

    if (isDirector) {
        window.switchView('projects', 'proyectos');
        if (typeof window.loadProjectsList === 'function') window.loadProjectsList();
    } else if (role.includes('almacen') || (hasRec && !hasProj && !hasFin && !hasGas)) {
        window.switchView('resources', 'recursos');
        if (typeof window.openResourceSubtab === 'function') window.openResourceSubtab('materials');
    } else if (role.includes('supervisor') || role.includes('campo') || (hasGas && !hasProj && !hasFin && !hasRec)) {
        window.switchView('pwa', 'gastos');
    } else if (hasFin && !hasProj) {
        window.switchView('financial', 'finanzas');
        const targetSub = canCxc ? 'cxc' : (canCxp ? 'cxp' : 'summary');
        if (typeof window.switchFinancialSubtab === 'function') window.switchFinancialSubtab(targetSub);
    } else if (hasProj) {
        window.switchView('projects', 'proyectos');
        if (typeof window.loadProjectsList === 'function') window.loadProjectsList();
    } else if (hasCom) {
        window.switchView('quotations', 'comercial');
    } else if (hasGas) {
        window.switchView('pwa', 'gastos');
    } else if (hasMaint) {
        window.switchView('maintenance', 'mantenimiento');
    } else {
        window.switchView('pwa', 'gastos');
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
