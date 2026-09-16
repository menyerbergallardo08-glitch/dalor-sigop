/**
 * DALOR SIGO-P | Módulo: MAINTENANCE.JS
 * Extraído y desacoplado del monolito de producción (v94)
 */

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



window.quickFillAndLogin = async function(u, p) {

    const uIn = document.getElementById('portal_username');

    const pIn = document.getElementById('portal_password');

    if (uIn) uIn.value = u;

    if (pIn) pIn.value = p;

    await performLogin(u, p);

};



window.handlePortalLogin = async function(e) {

    if (e && e.preventDefault) e.preventDefault();

    const uIn = document.getElementById('portal_username');

    const pIn = document.getElementById('portal_password');

    const u = uIn ? uIn.value.trim() : '';

    const p = pIn ? pIn.value : '';

    await performLogin(u, p);

};



window.performLogin = async function(username, password) {

    if (!username || !password) {

        showLoginError('Por favor ingresa usuario y contraseña');

        return;

    }



    const errBox = document.getElementById('loginErrorMessage');

    const errTxt = document.getElementById('loginErrorText');

    const btnSubmit = document.getElementById('btnSubmitPortalLogin');



    if (errBox) errBox.style.display = 'none';

    if (btnSubmit) {

        btnSubmit.disabled = true;

        btnSubmit.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Accediendo...';

    }



    try {

        const res = await fetch(`${API_BASE}/auth/login`, {

            method: 'POST',

            headers: { 'Content-Type': 'application/json' },

            body: JSON.stringify({ username, password })

        });



        const data = await res.json();

        if (!res.ok || !data.access_token) {

            const msg = data.detail || 'Usuario o contraseña incorrectos';

            showLoginError(msg);

            if (btnSubmit) {

                btnSubmit.disabled = false;

                btnSubmit.innerHTML = '<i class="fa-solid fa-right-to-bracket" style="color: #f5b800;"></i> Iniciar Sesión';

            }

            return;

        }



        // 1. Guardar sesión

        currentUser = data.user;

        authToken = data.access_token;

        sessionStorage.setItem('dalor_session_active', 'true');

        sessionStorage.setItem('dalor_user', JSON.stringify(currentUser));

        sessionStorage.setItem('dalor_token', authToken);



        // 2. Desbloquear visualmente el ERP de forma garantizada

        document.body.classList.add('authenticated');

        const loginScreen = document.getElementById('app-login-screen');

        const authShell = document.getElementById('app-authenticated-shell');

        if (loginScreen) {

            loginScreen.style.setProperty('display', 'none', 'important');

        }

        if (authShell) {

            authShell.style.setProperty('display', 'block', 'important');

        }

        const flLogout = document.getElementById('btnFloatingLogout');

        if (flLogout) flLogout.style.display = 'inline-flex';



        // 3. Configurar interfaz para el usuario

        try { renderUserBadge(); } catch(e) { console.warn(e); }

        try { applyPermissionMap(currentUser); } catch(e) { console.warn(e); }

        try { configureMobileNav(currentUser); } catch(e) { console.warn(e); }

        try { redirectUserByRole(currentUser); } catch(e) { console.warn(e); }



        // 4. Cargar datos maestros sin bloquear la interfaz

        setTimeout(() => {

            try { loadInitialMasterData(); } catch(e) { console.warn(e); }

        }, 50);



        showToast(`Bienvenido, ${currentUser.full_name || currentUser.username}`, 'success');



    } catch (err) {

        showLoginError('Error al conectar con el servidor: ' + err.message);

    } finally {

        if (btnSubmit) {

            btnSubmit.disabled = false;

            btnSubmit.innerHTML = '<i class="fa-solid fa-right-to-bracket" style="color: #f5b800;"></i> Iniciar Sesión';

        }

    }

};



function showLoginError(msg) {

    const errBox = document.getElementById('loginErrorMessage');

    const errTxt = document.getElementById('loginErrorText');

    if (errTxt) errTxt.textContent = msg;

    if (errBox) errBox.style.display = 'block';

}



window.configureMobileNav = function(user) {

    const nav = document.querySelector('.mobile-bottom-nav');

    if (nav) nav.remove();

};



// Aliases para compatibilidad

window.loginDirectlyAs = window.quickFillAndLogin;

window.fillAndSubmitQuickLogin = window.quickFillAndLogin;

window.fillQuickLogin = window.quickFillAndLogin;





// --- BLOQUE L6328-L6484 ---
// ----------------------------------------------------

// 8. MÓDULO DE CLIENTES

// ----------------------------------------------------

async function loadClients() {

    const tbody = document.getElementById("clientsTableBody");

    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px; color: #94a3b8;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando clientes...</td></tr>`;



    try {

        const res = await fetch(`${API_BASE}/clients/`);

        allClients = await res.json();



        tbody.innerHTML = allClients.map(c => `

            <tr>

                <td style="font-weight: 800; color: var(--dalor-blue);">${c.code}</td>

                <td style="font-weight: 700; color: var(--dalor-navy);">${c.name}</td>

                <td>${c.rif || '<span style="color:#94a3b8;">-</span>'}</td>

                <td>${c.contact_name || '<span style="color:#94a3b8;">-</span>'}</td>

                <td>${c.contact_phone || c.contact_email || '<span style="color:#94a3b8;">-</span>'}</td>

                <td>${c.address || '<span style="color:#94a3b8;">-</span>'}</td>

                <td style="text-align: center;">

                    <button onclick="deleteClient(${c.id})" class="btn-secondary" style="padding: 4px 8px; color: #ef4444;" title="Inactivar Cliente">

                        <i class="fa-solid fa-trash"></i>

                    </button>

                </td>

            </tr>

        `).join('');

    } catch (e) {

        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #e11d48;">Error al cargar clientes.</td></tr>`;

    }

}



function openNewClientModal() {

    document.getElementById("clientForm").reset();

    openModal("modalClient");

}



async function submitCreateClient(event) {
    if (event && event.preventDefault) event.preventDefault();
    const payload = {
        code: document.getElementById("cli_code").value.trim(),
        name: document.getElementById("cli_name").value.trim(),
        rif: document.getElementById("cli_rif") ? document.getElementById("cli_rif").value.trim() : "",
        industry: document.getElementById("cli_industry") ? document.getElementById("cli_industry").value.trim() : "General",
        contact_name: document.getElementById("cli_contact") ? document.getElementById("cli_contact").value.trim() : "",
        contact_phone: document.getElementById("cli_phone") ? document.getElementById("cli_phone").value.trim() : "",
        contact_email: document.getElementById("cli_email") ? document.getElementById("cli_email").value.trim() : "",
        address: document.getElementById("cli_address") ? document.getElementById("cli_address").value.trim() : ""
    };

    if (!payload.name) {
        alert("Por favor ingresa el nombre o razón social del cliente.");
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/clients/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            const newClient = await res.json();
            closeModal("modalClient");
            const form = document.getElementById("clientForm");
            if (form) form.reset();

            // Recargar datos maestros en caliente desde la base de datos
            await loadInitialMasterData();
            populateSelectDropdowns();
            populatePlanDropdownSelectors();

            // Auto-seleccionar el cliente recién creado en el selector activo
            if (document.getElementById("quote_client_id")) {
                document.getElementById("quote_client_id").value = String(newClient.id);
            }
            if (document.getElementById("new_proj_client_id")) {
                document.getElementById("new_proj_client_id").value = String(newClient.id);
            }

            if (typeof loadClients === 'function') loadClients();
            if (typeof showToastNotification === 'function') {
                showToastNotification(`Cliente ${newClient.name} registrado con éxito`, 'success');
            } else if (typeof showToast === 'function') {
                showToast(`Cliente ${newClient.name} registrado con éxito`, 'success');
            } else {
                alert(`Cliente ${newClient.name} registrado con éxito.`);
            }
        } else {
            const err = await res.json();
            alert("Error: " + (err.detail || JSON.stringify(err)));
        }
    } catch (e) {
        console.error("Error al guardar cliente:", e);
        alert("Error de conexión al guardar cliente.");
    }
}



async function deleteClient(clientId) {

    if (!confirm("¿Deseas inactivar este cliente? (Se conservará su historial de obras y facturas)")) return;

    try {

        await fetch(`${API_BASE}/clients/${clientId}`, { method: "DELETE" });

        await loadInitialMasterData();

        loadClients();

    } catch (e) {

        alert("Error al inactivar cliente.");

    }

}





// --- BLOQUE L7801-L8012 ---
// ----------------------------------------------------

// 11. DASHBOARD COMPARATIVO

// ----------------------------------------------------

async function loadComparisonDashboard() {

    try {

        const res = await fetch(`${API_BASE}/reports/comparison-dashboard`);

        const data = await res.json();



        // KPIs Globales

        document.getElementById("dashboardKPIsContainer").innerHTML = `

            <div class="card" style="text-align: center; margin-bottom: 0;">

                <span style="font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 700;">Proyectos Activos</span>

                <p style="font-size: 20px; font-weight: 900; color: var(--dalor-navy);">${data.global_summary.active_projects_count}</p>

            </div>

            <div class="card" style="text-align: center; margin-bottom: 0;">

                <span style="font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 700;">Contratos Totales ($)</span>

                <p style="font-size: 20px; font-weight: 900; color: var(--dalor-navy);">$${data.global_summary.total_contracted_usd.toLocaleString()}</p>

            </div>

            <div class="card" style="text-align: center; margin-bottom: 0;">

                <span style="font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 700;">Gasto Real Ejecutado ($)</span>

                <p style="font-size: 20px; font-weight: 900; color: #e11d48;">$${data.global_summary.total_spent_usd.toLocaleString()}</p>

            </div>

            <div class="card" style="text-align: center; margin-bottom: 0;">

                <span style="font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 700;">Margen Neto Consolidado</span>

                <p style="font-size: 20px; font-weight: 900; color: #059669;">${data.global_summary.global_margin_percent}% ($${data.global_summary.net_margin_usd.toLocaleString()})</p>

            </div>

        `;



        // Tabla Comparativa

        document.getElementById("comparisonTableBody").innerHTML = data.projects_comparison.map(p => {

            let badgeBg = "#dcfce7";

            let badgeColor = "#166534";

            if (p.health_status === "ROJO_SOBRECOSTO") {

                badgeBg = "#fee2e2";

                badgeColor = "#991b1b";

            } else if (p.health_status === "AMARILLO_ALERTA") {

                badgeBg = "#fef3c7";

                badgeColor = "#92400e";

            }



            return `

            <tr>

                <td style="font-weight: 800; color: var(--dalor-blue);">${p.project_code}</td>

                <td style="font-weight: 700;">${p.project_name}</td>

                <td>${p.client_name}</td>

                <td style="font-weight: 800;">$${p.contract_amount_usd.toLocaleString()}</td>

                <td style="font-weight: 800; color: #e11d48;">$${p.actual_spent_usd.toLocaleString()}</td>

                <td style="font-weight: 800; color: #059669;">$${p.gross_margin_usd.toLocaleString()}</td>

                <td style="font-weight: 800; color: #059669;">${p.gross_margin_percent}%</td>

                <td style="font-weight: 800; color: var(--dalor-navy);">${p.cpi_index}</td>

                <td style="text-align: center;">

                    <span style="font-size: 10px; padding: 2px 8px; border-radius: 9999px; font-weight: 800; background: ${badgeBg}; color: ${badgeColor};">

                        ${p.health_status.replace('_', ' ')}

                    </span>

                </td>

            </tr>`;

        }).join('');



    } catch (e) {

        console.error("Error al cargar dashboard comparativo:", e);

    }

}



// ----------------------------------------------------

// 12. ÁRBOL JERÁRQUICO DE PARTIDAS

// ----------------------------------------------------

async function loadCategoriesTree() {

    const container = document.getElementById("categoriesTreeContainer");

    container.innerHTML = `<div style="grid-column: span 2; text-align: center; padding: 20px; color: #94a3b8;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando árbol de partidas...</div>`;



    try {

        const res = await fetch(`${API_BASE}/expenses/categories-tree`);

        if (!res.ok) throw new Error("Error en servidor");

        const tree = await res.json();



        container.innerHTML = tree.map(parent => `

            <div class="card" style="margin-bottom: 0; border-top: 3px solid var(--dalor-blue);">

                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; margin-bottom: 8px;">

                    <div>

                        <span style="font-size: 11px; font-weight: 800; background: var(--dalor-navy); color: white; padding: 2px 6px; border-radius: 4px;">${parent.code}</span>

                        <h4 style="font-size: 13px; font-weight: 800; color: var(--dalor-navy); display: inline-block; margin-left: 6px;">${parent.name}</h4>

                    </div>

                    <div style="text-align: right;">

                        <span style="font-size: 10px; color: #64748b; display: block;">Gasto Real</span>

                        <span style="font-weight: 800; color: #e11d48; font-size: 13px;">$${parent.total_spent_usd.toFixed(2)}</span>

                    </div>

                </div>

                <div style="display: flex; flex-direction: column; gap: 4px;">

                    ${parent.subcategories && parent.subcategories.length > 0 ? parent.subcategories.map(sub => `

                        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #475569; padding: 4px 8px; background: #f8fafc; border-radius: 4px; border: 1px solid #f1f5f9;">

                            <span><b>${sub.code}</b> ${sub.name}</span>

                            <span style="font-weight: 700; color: var(--dalor-navy);">$${sub.spent_usd.toFixed(2)}</span>

                        </div>

                    `).join('') : `

                        <div style="font-size: 11px; color: #94a3b8; font-style: italic; padding: 4px 6px;">

                            Partida directa sin sub-cuentas &bull; Ppto ref: $${(parent.monthly_budget_usd || 0).toLocaleString()}

                        </div>

                    `}

                </div>

            </div>

        `).join('');

    } catch (e) {

        container.innerHTML = `<div style="grid-column: span 2; text-align: center; color: #e11d48;">Error al cargar árbol.</div>`;

    }

}





// --- BLOQUE L8866-L9457 ---
// ==============================================================================

// 🔐 14. AUTENTICACIÓN, ROLES & CAPAS DE USO (TIPO PROFIT PLUS)

// ==============================================================================

async function checkAuthStatus() {

    // Para garantizar que el usuario SIEMPRE pueda elegir su perfil en el login al abrir el teléfono:

    // Solo se mantiene autenticado si la sesión fue iniciada explícitamente en la pestaña actual (sessionStorage).

    const sessionActive = sessionStorage.getItem('dalor_session_active');

    const savedUser = sessionStorage.getItem('dalor_user');

    const savedToken = sessionStorage.getItem('dalor_token');

    

    if (sessionActive === 'true' && savedUser && savedToken) {

        try {

            currentUser = JSON.parse(savedUser);

            authToken = savedToken;

            renderUserBadge();

            applyPermissionMap(currentUser);

            return true;

        } catch (e) {

            sessionStorage.clear();

        }

    }

    

    currentUser = null;

    authToken = null;

    sessionStorage.clear();

    localStorage.removeItem('dalor_user');

    localStorage.removeItem('dalor_token');

    return false;

}



function renderUserBadge() {

    if (!currentUser) return;

    const nameEl = document.getElementById('userFullNameDisplay');

    const roleEl = document.getElementById('userRoleDisplay');

    const avatarEl = document.getElementById('userAvatar');



    if (nameEl) nameEl.textContent = currentUser.full_name || currentUser.username;

    if (roleEl) {

        const roleNames = {

            'director': '👑 Director General',

            'director_general': '👑 Director General',

            'admin': '👑 Director General',

            'administracion': '💼 Administración & Finanzas',

            'administrador_financiero': '💼 Administración & Finanzas',

            'admin_finanzas': '💼 Administración & Finanzas',

            'ingeniero': '👷 Ing. Residente de Obra',

            'ingeniero_obra': '👷 Ing. Residente de Obra',

            'campo': '📱 Supervisor de Campo',

            'supervisor_campo': '📱 Supervisor de Campo'

        };

        roleEl.textContent = roleNames[currentUser.role_name] || currentUser.role_name;

    }

    if (avatarEl) {

        avatarEl.textContent = (currentUser.full_name || currentUser.username).charAt(0).toUpperCase();

    }

}



function applyPermissionMap(user) {

    if (!user) return;

    const role = (user.role_name || '').toLowerCase();

    const uname = (user.username || '').toLowerCase();

    const isDirector = uname === 'director' || role.includes('director') || user.is_superuser;

    const isFinanzas = uname === 'administracion' || role.includes('admin') || role.includes('finanzas') || role.includes('contador');

    const isIngeniero = uname === 'ingeniero' || role.includes('ingeniero');

    const isCampo = uname === 'campo' || role.includes('supervisor') || role.includes('campo');

    const isAlmacen = uname === 'almacen' || role.includes('almacen') || role.includes('panol') || role.includes('taller');



    // Dropdown Comercial (SOLO Director General)

    const dCom = document.getElementById('dropdown-comercial');

    if (dCom) {

        dCom.style.display = isDirector ? 'inline-block' : 'none';

    }



    // Dropdown Proyectos (Director e Ingeniero)

    const dProj = document.getElementById('dropdown-proyectos');

    if (dProj) {

        dProj.style.display = (isDirector || isIngeniero) ? 'inline-block' : 'none';

    }



    // Dropdown Finanzas (Director y Administración/Finanzas)

    const dFin = document.getElementById('dropdown-finanzas');

    if (dFin) {

        dFin.style.display = (isDirector || isFinanzas) ? 'inline-block' : 'none';

    }



    // Dropdown Recursos (Director, Ingeniero y Almacén/Pañol)

    const dRec = document.getElementById('dropdown-recursos');

    if (dRec) {

        dRec.style.display = (isDirector || isIngeniero || isAlmacen) ? 'inline-block' : 'none';

    }



    // Dropdown Gastos (Oculto para Almacén e Ingeniero; Ingeniero opera en Proyectos/Recursos/Campo)

    const dGas = document.getElementById('dropdown-gastos');

    if (dGas) {

        dGas.style.display = (isAlmacen || isIngeniero) ? 'none' : 'inline-block';

    }



    const itmInbox = document.getElementById('item-gasto-inbox');

    const itmPwa = document.getElementById('item-gasto-pwa');

    const itmManual = document.getElementById('item-gasto-manual');

    const itmDashboard = document.getElementById('item-gasto-dashboard');

    const itmTree = document.getElementById('item-gasto-tree');



    // 🛡️ Restricciones y Adaptaciones de Rol para Campo vs Administración vs Almacén vs Ingeniero

    const btnQF = document.getElementById('btnQuickFlow');

    if (btnQF) btnQF.style.display = (isCampo || isAlmacen || isIngeniero) ? 'none' : 'inline-flex';



    const fiscalBox = document.getElementById('field_fiscal_tax_box');

    if (fiscalBox) fiscalBox.style.display = isCampo ? 'none' : 'grid';



    const splitBox = document.getElementById('field_split_expense_box');

    if (splitBox) splitBox.style.display = isCampo ? 'none' : 'block';



    const repContainer = document.getElementById('field_reported_by_container');

    if (repContainer) repContainer.style.display = isCampo ? 'none' : 'block';



    const repBadge = document.getElementById('field_reported_by_badge');

    const repText = document.getElementById('field_reported_by_text');

    if (repBadge) {

        repBadge.style.display = isCampo ? 'flex' : 'none';

        if (repText) repText.innerHTML = `Reportando como: <b>${user.full_name || user.username}</b> (Supervisor de Campo)`;

    }



    // Tasa BCV Oficial solo visible para Administración / Dirección

    const tasaBox = document.getElementById('bcvTasaBadge') || document.querySelector('.tasa-editor-box');

    if (tasaBox) {

        tasaBox.style.display = (isDirector || isFinanzas) ? 'inline-flex' : 'none';

    }



    // Ocultar sección de Bolsas de Costo (Paso 4) en formulario de proyectos para Ingeniero

    const step4Budget = document.getElementById('new_proj_contract')?.closest('.grid-3')?.parentElement?.parentElement?.querySelector('h4:has(span)') || document.getElementById('new_proj_labor')?.closest('.grid-3')?.parentElement;

    if (step4Budget) {

        step4Budget.style.display = isIngeniero ? 'none' : 'block';

    }

    const contractInputContainer = document.getElementById('new_proj_contract')?.parentElement;

    if (contractInputContainer) {

        contractInputContainer.style.display = isIngeniero ? 'none' : 'block';

    }



    if (isAlmacen) {

        // ROL ALMACÉN & PAÑOL: Solo Activos, Recursos, Materiales y Despachos

        switchView('resources');

    } else if (isCampo) {

        // ROL DE CAMPO: SOLO RENDICIÓN DE GASTO / CAPTURA OCR

        if (itmInbox) itmInbox.style.display = 'none';

        if (itmPwa) itmPwa.style.display = 'flex';

        if (itmManual) itmManual.style.display = 'none';

        if (itmDashboard) itmDashboard.style.display = 'none';

        if (itmTree) itmTree.style.display = 'none';

        switchView('pwa', 'gastos');

    } else if (isFinanzas) {

        // ADMINISTRACIÓN: Inbox, Carga Oficina, Dashboard Oculto (Job Costing solo para dirección), Árbol

        if (itmInbox) itmInbox.style.display = 'flex';

        if (itmPwa) itmPwa.style.display = 'none';

        if (itmManual) itmManual.style.display = 'flex';

        if (itmDashboard) itmDashboard.style.display = 'none';

        if (itmTree) itmTree.style.display = 'flex';

    } else if (isIngeniero) {

        // INGENIERO DE OBRA: Operativa técnica de Proyectos y Recursos (Sin costos ni finanzas)

        if (itmInbox) itmInbox.style.display = 'none';

        if (itmPwa) itmPwa.style.display = 'none';

        if (itmManual) itmManual.style.display = 'none';

        if (itmDashboard) itmDashboard.style.display = 'none';

        if (itmTree) itmTree.style.display = 'none';

    } else {

        // DIRECTOR GENERAL: Todo disponible

        if (itmInbox) itmInbox.style.display = 'flex';

        if (itmPwa) itmPwa.style.display = 'flex';

        if (itmManual) itmManual.style.display = 'flex';

        if (itmDashboard) itmDashboard.style.display = 'flex';

        if (itmTree) itmTree.style.display = 'flex';

    }



    // Dropdown Mantenimiento (SOLO Director General / Superuser)

    const dMaint = document.getElementById('dropdown-mantenimiento');

    if (dMaint) {

        dMaint.style.display = isDirector ? 'inline-block' : 'none';

    }



    // Botón PowerBI Directivo (SOLO Director General)

    const dGer = document.getElementById('dropdown-gerencia');

    if (dGer) {

        dGer.style.display = isDirector ? 'inline-block' : 'none';

    }

}



async function loginDirectlyAs(username, password) {

    const uIn = document.getElementById('login_username');

    const pIn = document.getElementById('login_password');

    if (uIn) uIn.value = username;

    if (pIn) pIn.value = password;



    const errEl = document.getElementById('loginErrorMessage');

    if (errEl) errEl.classList.add('hidden');



    try {

        const res = await fetch(`${API_BASE}/auth/login`, {

            method: 'POST',

            headers: { 'Content-Type': 'application/json' },

            body: JSON.stringify({ username, password })

        });



        const data = await res.json();

        if (!res.ok) {

            if (errEl) {

                errEl.textContent = data.detail || 'Error de credenciales';

                errEl.classList.remove('hidden');

            }

            return;

        }



        currentUser = data.user;

        authToken = data.access_token;

        localStorage.setItem('dalor_user', JSON.stringify(currentUser));

        localStorage.setItem('dalor_token', authToken);



        renderUserBadge();

        applyPermissionMap(currentUser);

        

        const modal = document.getElementById('modalLogin');

        if (modal) {

            modal.classList.add('hidden');

            modal.style.display = 'none';

        }



        redirectUserByRole(currentUser);



    } catch (e) {

        if (errEl) {

            errEl.textContent = 'Error de conexión: ' + e.message;

            errEl.classList.remove('hidden');

        }

    }

}



function fillQuickLogin(username, password) {

    loginDirectlyAs(username, password);

}



function fillAndSubmitQuickLogin(username, password) {

    loginDirectlyAs(username, password);

}



function redirectUserByRole(user) {

    if (!user) return;

    const role = (user.role_name || user.username || '').toLowerCase();

    

    if (role.includes('almacen') || role.includes('panol') || role.includes('taller')) {

        switchView('resources', 'recursos');

    } else if (role.includes('supervisor') || role.includes('campo')) {

        switchView('pwa', 'gastos');

    } else if (role.includes('admin') || role.includes('finanzas') || role.includes('administrador')) {

        switchView('financial', 'finanzas');

    } else if (role.includes('ingeniero') || role.includes('obra')) {

        switchView('projects', 'proyectos');

    } else {

        switchView('executive', 'gerencia');

    }

}



async function submitLogin(event) {

    if (event && event.preventDefault) event.preventDefault();

    const username = document.getElementById('login_username').value.trim();

    const password = document.getElementById('login_password').value;

    await loginDirectlyAs(username, password);

}



function handleLogout() {

    sessionStorage.clear();

    localStorage.removeItem('dalor_user');

    localStorage.removeItem('dalor_token');

    localStorage.clear();

    currentUser = null;

    authToken = null;

    window.location.reload();

    return;



    document.body.classList.remove('authenticated');

    const loginScreen = document.getElementById('app-login-screen');

    const authShell = document.getElementById('app-authenticated-shell');

    const nav = document.querySelector('.mobile-bottom-nav');



    if (loginScreen) loginScreen.style.display = 'flex';

    if (authShell) authShell.style.display = 'none';

    if (nav) nav.style.display = 'none';



    const uIn = document.getElementById('portal_username');

    const pIn = document.getElementById('portal_password');

    if (uIn) uIn.value = '';

    if (pIn) pIn.value = '';

    const errBox = document.getElementById('loginErrorMessage');

    if (errBox) errBox.style.display = 'none';



    showToast('Sesión finalizada. Inicia sesión con tus credenciales.', 'info');

}





// --- BLOQUE L9458-L9995 ---
// ==============================================================================

// 🛠️ 15. MÓDULO DE MANTENIMIENTO, USUARIOS & AUDITORÍA (TIPO PROFIT PLUS)

// ==============================================================================

let allSystemUsers = [];



function openMaintenanceSubtab(subtab) {

    switchView('maintenance', 'mantenimiento');

    switchMaintenanceSubtab(subtab);

}



function switchMaintenanceSubtab(subtab) {

    ['users', 'audit', 'clean'].forEach(t => {

        const pane = document.getElementById(`subtab-maint-${t}`);

        const btn = document.getElementById(`tabbtn-maint-${t}`);

        if (pane) pane.classList.add('hidden');

        if (btn) btn.classList.remove('active');

    });



    const activePane = document.getElementById(`subtab-maint-${subtab}`);

    const activeBtn = document.getElementById(`tabbtn-maint-${subtab}`);

    if (activePane) activePane.classList.remove('hidden');

    if (activeBtn) activeBtn.classList.add('active');



    if (subtab === 'users') loadMaintenanceUsersList();

    if (subtab === 'audit') loadMaintenanceAuditLogs();

}



async function loadMaintenanceUsersList() {

    const tbody = document.getElementById('maintenanceUsersTableBody');

    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #94a3b8; padding: 16px;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando usuarios...</td></tr>`;



    try {

        const res = await fetch(`${API_BASE}/maintenance/users`);

        allSystemUsers = await res.json();



        if (allSystemUsers.length === 0) {

            tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #94a3b8; padding: 16px;">No hay usuarios registrados.</td></tr>`;

            return;

        }



        const roleBadges = {

            'director': '<span style="background: #ede9fe; color: #5b21b6; padding: 2px 6px; border-radius: 4px; font-weight: 800; font-size: 11px;">👑 Director General</span>',

            'admin_finanzas': '<span style="background: #d1fae5; color: #065f46; padding: 2px 6px; border-radius: 4px; font-weight: 800; font-size: 11px;">💼 Administración & Finanzas</span>',

            'ingeniero_obra': '<span style="background: #e0f2fe; color: #0369a1; padding: 2px 6px; border-radius: 4px; font-weight: 800; font-size: 11px;">👷 Ingeniero Residente</span>',

            'supervisor_campo': '<span style="background: #fef3c7; color: #92400e; padding: 2px 6px; border-radius: 4px; font-weight: 800; font-size: 11px;">📱 Supervisor Campo</span>'

        };



        tbody.innerHTML = allSystemUsers.map(u => `

            <tr>

                <td style="font-weight: 800; color: var(--dalor-navy);">${u.username}</td>

                <td style="font-weight: 700;">${u.full_name}</td>

                <td style="color: #64748b;">${u.email || '-'}</td>

                <td>${roleBadges[u.role_name] || u.role_name}</td>

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



function openNewUserModal() {

    document.getElementById('newUserForm').reset();

    document.getElementById('modalNewUser').classList.remove('hidden');

}



function onUserRoleTemplateChanged() {

    // Helper if needed

}



async function submitCreateUser(event) {

    event.preventDefault();

    const username = document.getElementById('maint_username').value.trim();

    const full_name = document.getElementById('maint_fullname').value.trim();

    const email = document.getElementById('maint_email').value.trim();

    const password = document.getElementById('maint_password').value;

    const role_name = document.getElementById('maint_role').value;



    const roleTemplates = {

        'director': {

            comercial_view: true, comercial_edit: true,

            proyectos_view: true, proyectos_edit: true,

            finanzas_view: true, finanzas_edit: true,

            recursos_view: true, recursos_edit: true,

            gastos_view: true, gastos_edit: true,

            executive_dashboard: true, mantenimiento_admin: true

        },

        'admin_finanzas': {

            comercial_view: true, comercial_edit: true,

            proyectos_view: true, proyectos_edit: false,

            finanzas_view: true, finanzas_edit: true,

            recursos_view: true, recursos_edit: false,

            gastos_view: true, gastos_edit: true,

            executive_dashboard: true, mantenimiento_admin: false

        },

        'ingeniero_obra': {

            comercial_view: true, comercial_edit: false,

            proyectos_view: true, proyectos_edit: true,

            finanzas_view: false, finanzas_edit: false,

            recursos_view: true, recursos_edit: true,

            gastos_view: true, gastos_edit: true,

            executive_dashboard: false, mantenimiento_admin: false

        },

        'supervisor_campo': {

            comercial_view: false, comercial_edit: false,

            proyectos_view: true, proyectos_edit: false,

            finanzas_view: false, finanzas_edit: false,

            recursos_view: true, recursos_edit: false,

            gastos_view: true, gastos_edit: true,

            executive_dashboard: false, mantenimiento_admin: false

        }

    };



    try {

        const res = await fetch(`${API_BASE}/maintenance/users`, {

            method: 'POST',

            headers: { 'Content-Type': 'application/json' },

            body: JSON.stringify({

                username, full_name, email, password, role_name,

                permissions: roleTemplates[role_name] || {}

            })

        });



        const data = await res.json();

        if (!res.ok) {

            alert(data.detail || 'Error al crear usuario.');

            return;

        }



        alert(`¡Usuario '${username}' creado con éxito en el sistema!`);

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



    const p = user.permissions || {};

    

    document.getElementById('perm_comercial_view').checked = !!p.comercial_view;

    document.getElementById('perm_comercial_edit').checked = !!p.comercial_edit;

    document.getElementById('perm_proyectos_view').checked = !!p.proyectos_view;

    document.getElementById('perm_proyectos_edit').checked = !!p.proyectos_edit;

    document.getElementById('perm_finanzas_view').checked = !!p.finanzas_view;

    document.getElementById('perm_finanzas_edit').checked = !!p.finanzas_edit;

    document.getElementById('perm_recursos_view').checked = !!p.recursos_view;

    document.getElementById('perm_recursos_edit').checked = !!p.recursos_edit;

    document.getElementById('perm_gastos_view').checked = !!p.gastos_view;

    document.getElementById('perm_gastos_edit').checked = !!p.gastos_edit;

    document.getElementById('perm_executive_dashboard').checked = !!p.executive_dashboard;

    document.getElementById('perm_mantenimiento_admin').checked = !!p.mantenimiento_admin;



    document.getElementById('modalUserPermissions').classList.remove('hidden');

}



async function submitSaveUserPermissions() {

    const userId = parseInt(document.getElementById('perm_target_user_id').value);

    const permissions = {

        comercial_view: document.getElementById('perm_comercial_view').checked,

        comercial_edit: document.getElementById('perm_comercial_edit').checked,

        proyectos_view: document.getElementById('perm_proyectos_view').checked,

        proyectos_edit: document.getElementById('perm_proyectos_edit').checked,

        finanzas_view: document.getElementById('perm_finanzas_view').checked,

        finanzas_edit: document.getElementById('perm_finanzas_edit').checked,

        recursos_view: document.getElementById('perm_recursos_view').checked,

        recursos_edit: document.getElementById('perm_recursos_edit').checked,

        gastos_view: document.getElementById('perm_gastos_view').checked,

        gastos_edit: document.getElementById('perm_gastos_edit').checked,

        executive_dashboard: document.getElementById('perm_executive_dashboard').checked,

        mantenimiento_admin: document.getElementById('perm_mantenimiento_admin').checked

    };



    try {

        const res = await fetch(`${API_BASE}/maintenance/users/${userId}/permissions`, {

            method: 'PUT',

            headers: { 'Content-Type': 'application/json' },

            body: JSON.stringify({ permissions })

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

        const res = await fetch(`${API_BASE}/maintenance/users/${userId}/toggle-status`, { method: 'PUT' });

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



async function loadMaintenanceAuditLogs() {

    const tbody = document.getElementById('maintenanceAuditTableBody');

    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #94a3b8; padding: 16px;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando bitácora de eventos...</td></tr>`;



    try {

        const res = await fetch(`${API_BASE}/maintenance/audit-logs`);

        const logs = await res.json();



        if (logs.length === 0) {

            tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #94a3b8; padding: 16px;">No hay eventos registrados en la bitácora.</td></tr>`;

            return;

        }



        tbody.innerHTML = logs.map(l => `

            <tr>

                <td style="font-weight: 700; color: #64748b; font-size: 11px;">${l.timestamp}</td>

                <td style="font-weight: 800; color: var(--dalor-navy);">${l.username}</td>

                <td><span style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 11px; text-transform: uppercase;">${l.module}</span></td>

                <td style="font-weight: 700; color: #0284c7;">${l.action}</td>

                <td style="color: #334155; font-size: 11px;">${l.details || '-'}</td>

            </tr>

        `).join('');

    } catch (e) {

        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #e11d48; padding: 16px;">Error al cargar bitácora.</td></tr>`;

    }

}









// --- BLOQUE L10370-L10941 ---
// ==============================================================================

// 📊 16. DASHBOARD GERENCIAL BI CON LAS 4 RESPUESTAS CLARAS

// ==============================================================================

let biSummaryData = null;

let chartRadialCash = null;

let chartRadialOverhead = null;

let chartRadialMargin = null;

let chartRadialPartners = null;

let chartRankingExp = null;

let chartDonutCost = null;



async function loadExecutiveDashboard() {

    const alertsContainer = document.getElementById("executiveAlertsContainer");

    const pnlTbody = document.getElementById("executivePnlTableBody");



    if (pnlTbody) pnlTbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: #94a3b8; padding: 20px;"><i class="fa-solid fa-spinner fa-spin"></i> Consolidando las 4 métricas directivas...</td></tr>`;



    try {

        const res = await fetch(`${API_BASE}/financial/summary`);

        if (!res.ok) throw new Error("Error al obtener datos");

        biSummaryData = await res.json();

        const k = biSummaryData.kpis;



        // 1. Poblar Filtros Slicers

        populateBISlicers();



        // 2. Render Alertas Directivas

        if (alertsContainer) {

            if (biSummaryData.alerts && biSummaryData.alerts.length > 0) {

                alertsContainer.innerHTML = biSummaryData.alerts.map(a => `

                    <div style="background: ${a.level === 'danger' ? '#fef2f2' : '#fffbeb'}; border: 1px solid ${a.level === 'danger' ? '#fecdd3' : '#fde68a'}; border-left: 5px solid ${a.level === 'danger' ? '#e11d48' : '#f59e0b'}; padding: 8px 14px; border-radius: 8px; display: flex; align-items: center; justify-content: space-between;">

                        <div>

                            <strong style="color: ${a.level === 'danger' ? '#9f1239' : '#92400e'}; font-size: 12px;">${a.title}</strong>

                            <p style="font-size: 11px; color: #475569; margin-top: 1px;">${a.message}</p>

                        </div>

                        <button onclick="switchView('financial', 'finanzas')" class="btn-secondary" style="font-size: 10px; padding: 3px 6px;">

                            Ver Finanzas <i class="fa-solid fa-arrow-right"></i>

                        </button>

                    </div>

                `).join('');

            } else {

                alertsContainer.innerHTML = '';

            }

        }



        // 3. Render Las 4 Respuestas Claras Directivas

        // 1. Caja Libre Disponible

        document.getElementById('bi_kpi_cashflow_val').textContent = `$${k.net_operating_cash_usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

        

        // 2. Gastos Fijos Cubiertos (Break-Even %)

        document.getElementById('bi_kpi_overhead_pct').textContent = `${k.fixed_overhead_covered_percent}%`;

        document.getElementById('bi_kpi_overhead_target').textContent = `$${k.monthly_fixed_budget_usd.toLocaleString()}/mes`;



        // 3. Ganancia Real de Obras

        document.getElementById('bi_kpi_profit_val').textContent = `$${k.net_accrual_profit_usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

        document.getElementById('bi_kpi_margin_pct').textContent = `${k.net_margin_percent}%`;



        // 4. Retiros de Socios

        document.getElementById('bi_kpi_partners_val').textContent = `$${k.total_partner_withdrawals_usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;



        // Sidebar

        document.getElementById('bi_side_cxc_val').textContent = `$${k.pending_cxc_usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

        document.getElementById('bi_side_cxp_val').textContent = `$${k.pending_cxp_usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

        document.getElementById('bi_side_alerts_count').textContent = biSummaryData.alerts ? biSummaryData.alerts.length : 0;



        // 4. Render 4 Arcos Radiales (% Progress)

        renderCleanRadialCharts(k);



        // 5. Render Gráficos Analíticos

        renderBIAnalyticsCharts(biSummaryData);



        // 6. Render Tabla P&L

        renderBIPnlTable(biSummaryData.projects_pnl);



    } catch (e) {

        if (pnlTbody) pnlTbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: #e11d48; padding: 20px;">Error al consolidar dashboard.</td></tr>`;

    }

}



function populateBISlicers() {

    const projSelect = document.getElementById('bi_slicer_project');

    const cliSelect = document.getElementById('bi_slicer_client');



    if (projSelect && allProjects.length > 0) {

        const cur = projSelect.value;

        projSelect.innerHTML = `<option value="all">Todas las Obras (${allProjects.length})</option>` +

            allProjects.map(p => `<option value="${p.id}">${p.code} - ${p.name.substring(0, 25)}</option>`).join('');

        if (cur) projSelect.value = cur;

    }



    if (cliSelect && allClients.length > 0) {

        const cur = cliSelect.value;

        cliSelect.innerHTML = `<option value="all">Todos los Clientes (${allClients.length})</option>` +

            allClients.map(c => `<option value="${c.id}">${c.name.substring(0, 25)}</option>`).join('');

        if (cur) cliSelect.value = cur;

    }

}



function renderCleanRadialCharts(k) {

    // 1. Radial Cash Flow

    const ctxCash = document.getElementById('radialChartCash');

    if (ctxCash) {

        if (chartRadialCash) chartRadialCash.destroy();

        chartRadialCash = new Chart(ctxCash, {

            type: 'doughnut',

            data: {

                datasets: [{

                    data: [85, 15],

                    backgroundColor: ['#059669', '#e2e8f0'],

                    borderWidth: 0

                }]

            },

            options: { cutout: '76%', responsive: false, plugins: { legend: { display: false }, tooltip: { enabled: false } } }

        });

    }



    // 2. Radial Overhead (Break-Even %)

    const pctOverhead = Math.max(0, Math.min(100, k.fixed_overhead_covered_percent));

    const ctxOh = document.getElementById('radialChartOverhead');

    if (ctxOh) {

        if (chartRadialOverhead) chartRadialOverhead.destroy();

        chartRadialOverhead = new Chart(ctxOh, {

            type: 'doughnut',

            data: {

                datasets: [{

                    data: [pctOverhead, 100 - pctOverhead],

                    backgroundColor: [pctOverhead >= 100 ? '#059669' : '#0284c7', '#e2e8f0'],

                    borderWidth: 0

                }]

            },

            options: { cutout: '76%', responsive: false, plugins: { legend: { display: false }, tooltip: { enabled: false } } }

        });

    }



    // 3. Radial Margin

    const pctMargin = Math.max(0, Math.min(100, Math.round(k.net_margin_percent)));

    const ctxMar = document.getElementById('radialChartMargin');

    if (ctxMar) {

        if (chartRadialMargin) chartRadialMargin.destroy();

        chartRadialMargin = new Chart(ctxMar, {

            type: 'doughnut',

            data: {

                datasets: [{

                    data: [pctMargin, 100 - pctMargin],

                    backgroundColor: ['#002B49', '#e2e8f0'],

                    borderWidth: 0

                }]

            },

            options: { cutout: '76%', responsive: false, plugins: { legend: { display: false }, tooltip: { enabled: false } } }

        });

    }



    // 4. Radial Partners

    const ctxPart = document.getElementById('radialChartPartners');

    if (ctxPart) {

        if (chartRadialPartners) chartRadialPartners.destroy();

        chartRadialPartners = new Chart(ctxPart, {

            type: 'doughnut',

            data: {

                datasets: [{

                    data: [70, 30],

                    backgroundColor: ['#7c3aed', '#e2e8f0'],

                    borderWidth: 0

                }]

            },

            options: { cutout: '76%', responsive: false, plugins: { legend: { display: false }, tooltip: { enabled: false } } }

        });

    }

}



function renderBIAnalyticsCharts(data) {

    const ctxRank = document.getElementById('chartRankingExpenses');

    if (ctxRank) {

        if (chartRankingExp) chartRankingExp.destroy();

        

        const labels = ['Materiales de Obra', 'Mano de Obra Cuadrilla', 'Combustible & Traslados', 'Equipos & Maquinaria', 'Nómina Fija Taller', 'Alquiler Galpón'];

        const values = [4800, 3200, 1850, 1200, 3200, 1100];



        chartRankingExp = new Chart(ctxRank, {

            type: 'bar',

            data: {

                labels: labels,

                datasets: [{

                    label: 'Monto ($)',

                    data: values,

                    backgroundColor: '#0072B8',

                    borderRadius: 6,

                    barThickness: 13

                }]

            },

            options: {

                indexAxis: 'y',

                responsive: true,

                maintainAspectRatio: false,

                plugins: { legend: { display: false } },

                scales: {

                    x: { grid: { display: false }, ticks: { font: { size: 9 } } },

                    y: { grid: { display: false }, ticks: { font: { size: 9, weight: 'bold' } } }

                }

            }

        });

    }



    const ctxDonut = document.getElementById('chartDonutCostDistribution');

    if (ctxDonut) {

        if (chartDonutCost) chartDonutCost.destroy();



        chartDonutCost = new Chart(ctxDonut, {

            type: 'doughnut',

            data: {

                labels: ['Costos Directos Obras (58%)', 'Gastos Fijos Sede (28%)', 'Retiros de Socios (14%)'],

                datasets: [{

                    data: [58, 28, 14],

                    backgroundColor: ['#0072B8', '#0d9488', '#7c3aed'],

                    borderWidth: 2,

                    borderColor: '#ffffff'

                }]

            },

            options: {

                cutout: '62%',

                responsive: true,

                maintainAspectRatio: false,

                plugins: {

                    legend: {

                        position: 'right',

                        labels: { boxWidth: 10, font: { size: 10 } }

                    }

                }

            }

        });

    }

}



function renderBIPnlTable(pnlList) {

    const pnlTbody = document.getElementById("executivePnlTableBody");

    if (!pnlTbody) return;



    if (!pnlList || pnlList.length === 0) {

        pnlTbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: #94a3b8; padding: 20px;">No hay proyectos para el filtro seleccionado.</td></tr>`;

        return;

    }



    pnlTbody.innerHTML = pnlList.map(p => {

        const isProfitable = p.net_profit_usd >= 0;

        return `

        <tr>

            <td style="font-weight: 800; color: var(--dalor-navy);">${p.code}</td>

            <td style="font-weight: 700;">${p.name}</td>

            <td style="color: #475569;">${p.client_name || 'General'}</td>

            <td style="font-weight: 700;">$${p.contract_amount_usd.toLocaleString()}</td>

            <td style="font-weight: 700; color: #0284c7;">$${p.invoiced_cxc_usd.toLocaleString()}</td>

            <td style="font-weight: 700; color: #059669;">$${p.collected_cxc_usd.toLocaleString()}</td>

            <td style="font-weight: 800; color: #e11d48;">$${p.total_cost_usd.toLocaleString()}</td>

            <td style="font-weight: 900; color: ${isProfitable ? '#059669' : '#e11d48'}; font-size: 13px;">

                $${p.net_profit_usd.toLocaleString()}

            </td>

            <td style="font-weight: 800; color: ${isProfitable ? '#059669' : '#e11d48'};">

                ${p.net_margin_percent}%

            </td>

            <td style="font-weight: 800; color: var(--dalor-navy); text-align: center;">

                <span style="padding: 2px 6px; border-radius: 4px; background: ${p.cpi_efficiency >= 1.0 ? '#d1fae5' : '#fee2e2'}; color: ${p.cpi_efficiency >= 1.0 ? '#065f46' : '#991b1b'}; font-size: 11px;">

                    ${p.cpi_efficiency}

                </span>

            </td>

        </tr>`;

    }).join('');

}



function filterBIDashboard() {

    if (!biSummaryData || !biSummaryData.projects_pnl) return;

    const projVal = document.getElementById('bi_slicer_project').value;

    const cliVal = document.getElementById('bi_slicer_client').value;



    let filtered = biSummaryData.projects_pnl;



    if (projVal !== 'all') {

        filtered = filtered.filter(p => p.id == projVal);

    }

    if (cliVal !== 'all') {

        filtered = filtered.filter(p => p.client_id == cliVal);

    }



    renderBIPnlTable(filtered);

}







// --- BLOQUE L10942-L11091 ---
// ==============================================================================

// 💾 18. MÓDULO DE COPIAS DE SEGURIDAD & RESPALDOS AUTOMÁTICOS

// ==============================================================================

async function loadBackupsList() {

    const tbody = document.getElementById('backupsTableBody');

    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #94a3b8; padding: 16px;"><i class="fa-solid fa-spinner fa-spin"></i> Consultando copias de seguridad...</td></tr>`;



    try {

        const res = await fetch(`${API_BASE}/maintenance/backups`);

        const list = await res.json();



        if (list.length === 0) {

            tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #94a3b8; padding: 16px;">No hay respaldos generados aún. Haz clic en "Generar Respaldo Ahora".</td></tr>`;

            return;

        }



        tbody.innerHTML = list.map(b => `

            <tr>

                <td style="font-weight: 700; color: #64748b; font-size: 11px;">${b.created_at}</td>

                <td style="font-weight: 800; color: var(--dalor-navy); font-family: monospace;">${b.filename}</td>

                <td style="font-weight: 700; color: #0284c7;">${b.size_kb} KB</td>

                <td><span style="background: #d1fae5; color: #065f46; padding: 2px 8px; border-radius: 4px; font-weight: 800; font-size: 11px;">Disponible</span></td>

                <td style="text-align: right;">

                    <a href="${API_BASE}/maintenance/backups/download/${b.filename}" target="_blank" class="btn-secondary" style="padding: 4px 8px; font-size: 11px; text-decoration: none; margin-right: 4px;" title="Descargar copia">

                        <i class="fa-solid fa-download"></i> Descargar

                    </a>

                    <button onclick="restoreBackup('${b.filename}')" class="btn-secondary" style="padding: 4px 8px; font-size: 11px; color: #b45309;" title="Restaurar a esta versión">

                        <i class="fa-solid fa-rotate-left"></i> Restaurar

                    </button>

                </td>

            </tr>

        `).join('');



    } catch (e) {

        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #e11d48; padding: 16px;">Error al cargar copias de seguridad.</td></tr>`;

    }

}



async function createNewBackup() {

    try {

        const res = await fetch(`${API_BASE}/maintenance/backups/create`, { method: 'POST' });

        const data = await res.json();

        if (data.success) {

            alert(`✅ ${data.message}`);

            loadBackupsList();

        } else {

            alert('Error al generar respaldo.');

        }

    } catch (e) {

        alert('Error de conexión al generar respaldo: ' + e.message);

    }

}



async function restoreBackup(filename) {

    if (!confirm(`⚠️ ¿Estás seguro de restaurar la base de datos al estado de '${filename}'?\n\nSe creará un respaldo automático preventivo antes de aplicar la restauración.`)) {

        return;

    }



    try {

        const res = await fetch(`${API_BASE}/maintenance/backups/restore/${filename}`, { method: 'POST' });

        const data = await res.json();

        if (data.success) {

            alert(`✅ ${data.message}`);

            loadInitialMasterData();

            loadExecutiveDashboard();

            loadBackupsList();

        } else {

            alert('Error al restaurar respaldo.');

        }

    } catch (e) {

        alert('Error al restaurar respaldo: ' + e.message);

    }

}





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

        const res = await fetch(`${API_BASE}/auth/users`);

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

        const res = await fetch(`${API_BASE}/auth/users`, {

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



function openMaintenanceSubtab_v2(subtab) {

    if (subtab === 'users') {

        openUserManagementModal();

    } else {

        alert(`Módulo de ${subtab} activo.`);

    }

}










// --- PUENTE DE COMPATIBILIDAD CON WINDOW & HTML INLINE ---
if (typeof window !== 'undefined') {
    window.applyPermissionMap = applyPermissionMap;
    window.checkAuthStatus = checkAuthStatus;
    window.createNewBackup = createNewBackup;
    window.deleteClient = deleteClient;
    window.fillAndSubmitQuickLogin = fillAndSubmitQuickLogin;
    window.fillQuickLogin = fillQuickLogin;
    window.filterBIDashboard = filterBIDashboard;
    window.handleLogout = handleLogout;
    window.loadBackupsList = loadBackupsList;
    window.loadCategoriesTree = loadCategoriesTree;
    window.loadClients = loadClients;
    window.loadComparisonDashboard = loadComparisonDashboard;
    window.loadExecutiveDashboard = loadExecutiveDashboard;
    window.loadMaintenanceAuditLogs = loadMaintenanceAuditLogs;
    window.loadMaintenanceUsersList = loadMaintenanceUsersList;
    window.loadUsersManagementTable = loadUsersManagementTable;
    window.loginDirectlyAs = loginDirectlyAs;
    window.onUserRoleTemplateChanged = onUserRoleTemplateChanged;
    window.openMaintenanceSubtab = openMaintenanceSubtab;
    window.openMaintenanceSubtab_v2 = openMaintenanceSubtab_v2;
    window.openNewClientModal = openNewClientModal;
    window.openNewUserModal = openNewUserModal;
    window.openNewUserModal_v2 = openNewUserModal_v2;
    window.openUserManagementModal = openUserManagementModal;
    window.openUserPermissionsModal = openUserPermissionsModal;
    window.populateBISlicers = populateBISlicers;
    window.redirectUserByRole = redirectUserByRole;
    window.renderBIAnalyticsCharts = renderBIAnalyticsCharts;
    window.renderBIPnlTable = renderBIPnlTable;
    window.renderCleanRadialCharts = renderCleanRadialCharts;
    window.renderUserBadge = renderUserBadge;
    window.restoreBackup = restoreBackup;
    window.showLoginError = showLoginError;
    window.submitCreateClient = submitCreateClient;
    window.submitCreateUser = submitCreateUser;
    window.submitCreateUser_v2 = submitCreateUser_v2;
    window.submitLogin = submitLogin;
    window.submitSaveUserPermissions = submitSaveUserPermissions;
    window.switchMaintenanceSubtab = switchMaintenanceSubtab;
    window.toggleUserStatus = toggleUserStatus;
}

export { applyPermissionMap, checkAuthStatus, createNewBackup, deleteClient, fillAndSubmitQuickLogin, fillQuickLogin, filterBIDashboard, handleLogout, loadBackupsList, loadCategoriesTree, loadClients, loadComparisonDashboard, loadExecutiveDashboard, loadMaintenanceAuditLogs, loadMaintenanceUsersList, loadUsersManagementTable, loginDirectlyAs, onUserRoleTemplateChanged, openMaintenanceSubtab, openMaintenanceSubtab_v2, openNewClientModal, openNewUserModal, openNewUserModal_v2, openUserManagementModal, openUserPermissionsModal, populateBISlicers, redirectUserByRole, renderBIAnalyticsCharts, renderBIPnlTable, renderCleanRadialCharts, renderUserBadge, restoreBackup, showLoginError, submitCreateClient, submitCreateUser, submitCreateUser_v2, submitLogin, submitSaveUserPermissions, switchMaintenanceSubtab, toggleUserStatus };
