/**
 * DALOR SIGO-P | API Service Client Centralizado
 */
const API_BASE = window.location.origin + "/api/v1";

export class ApiClient {
    static getToken() {
        return sessionStorage.getItem('dalor_token') || localStorage.getItem('dalor_token') || null;
    }

    static async request(endpoint, options = {}) {
        const url = `${API_BASE}${endpoint}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s Timeout

        const headers = {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        };

        const token = ApiClient.getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const config = {
            ...options,
            headers,
            signal: controller.signal
        };

        try {
            const response = await fetch(url, config);
            clearTimeout(timeoutId);

            // Interceptor de expiración de sesión (Estrictamente 401 Unauthorized en rutas protegidas)
            if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('bcv-rate')) {
                console.warn("[AUTH] Sesión expirada (HTTP 401):", endpoint);
                sessionStorage.removeItem('dalor_token');
                sessionStorage.removeItem('dalor_user');
                sessionStorage.removeItem('dalor_session_active');
                localStorage.removeItem('dalor_token');
                localStorage.removeItem('dalor_user');
                document.body.classList.remove('authenticated');
                const loginScreen = document.getElementById('app-login-screen');
                const authShell = document.getElementById('app-authenticated-shell');
                if (loginScreen) loginScreen.style.setProperty('display', 'flex', 'important');
                if (authShell) authShell.style.setProperty('display', 'none', 'important');
                
                if (window.location.pathname !== '/' && window.location.pathname !== '') {
                    window.location.href = '/';
                }
                return null;
            }

            // HTTP 403 (Forbidden / Permiso denegado): NO cerrar sesión, solo reportar error de permisos
            if (response.status === 403) {
                console.warn("[AUTH] Acción restringida por rol (HTTP 403):", endpoint);
                const data403 = await response.json().catch(() => ({ detail: "Acción restringida: Tu rol no tiene permisos suficientes." }));
                throw new Error(data403.detail || "Acceso denegado para tu rol.");
            }

            const data = await response.json().catch(() => ({}));
            
            if (!response.ok) {
                const errorMsg = data.detail || `Error HTTP ${response.status}: ${response.statusText}`;
                throw new Error(errorMsg);
            }

            return data;
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                const timeoutMsg = "Tiempo de espera agotado (Timeout de 30s). Por favor verifica tu conexión a internet o el estado del servidor.";
                console.error(`[API TIMEOUT] ${options.method || 'GET'} ${endpoint}:`, timeoutMsg);
                throw new Error(timeoutMsg);
            }
            console.error(`[API ERROR] ${options.method || 'GET'} ${endpoint}:`, error);
            throw error;
        }
    }

    static get(endpoint) { return ApiClient.request(endpoint, { method: 'GET' }); }
    static post(endpoint, body) { return ApiClient.request(endpoint, { method: 'POST', body: JSON.stringify(body) }); }
    static put(endpoint, body) { return ApiClient.request(endpoint, { method: 'PUT', body: JSON.stringify(body) }); }
    static delete(endpoint) { return ApiClient.request(endpoint, { method: 'DELETE' }); }
}

export const Api = {
    auth: {
        login: (username, password) => ApiClient.post('/auth/login', { username, password }),
        getUsers: () => ApiClient.get('/auth/users'),
        createUser: (userData) => ApiClient.post('/auth/users', userData)
    },
    financial: {
        getBcvRate: (forceRefresh = false) => ApiClient.get(`/financial/bcv-rate?force_refresh=${forceRefresh}`),
        getCxc: () => ApiClient.get('/financial/cxc'),
        getCxp: () => ApiClient.get('/financial/cxp'),
        createCxc: (data) => ApiClient.post('/financial/cxc', data),
        createCxp: (data) => ApiClient.post('/financial/cxp', data),
        registerPayment: (targetId, type, data) => ApiClient.post(`/financial/${type}/${targetId}/payment`, data),
        writeOffBadDebt: (cxcId, data) => ApiClient.post(`/financial/cxc/${cxcId}/write-off`, data),
        getSummary: () => ApiClient.get('/financial/summary'),
        getPartnersWithdrawals: () => ApiClient.get('/financial/partners/withdrawals'),
        recordPartnerWithdrawal: (data) => ApiClient.post('/financial/partners/withdrawals', data)
    },
    projects: {
        getAll: () => ApiClient.get('/projects/'),
        getDetails: (id) => ApiClient.get(`/projects/${id}/details`),
        create: (data) => ApiClient.post('/projects/', data),
        delete: (id) => ApiClient.delete(`/projects/${id}`),
        togglePhaseTask: (projectId, phaseId, data) => ApiClient.post(`/projects/${projectId}/phases/${phaseId}/toggle-task`, data),
        updatePhaseStatus: (projectId, phaseId, data) => ApiClient.post(`/projects/${projectId}/phases/${phaseId}/status`, data),
        generateTrackingToken: (projId) => ApiClient.post(`/projects/${projId}/tracking-token`, {})
    },
    materials: {
        getAll: () => ApiClient.get('/materials/'),
        create: (data) => ApiClient.post('/materials/', data),
        recordEntry: (data) => ApiClient.post('/materials/entry', data),
        recordConsumption: (data) => ApiClient.post('/materials/consume', data)
    },
    assets: {
        getAll: () => ApiClient.get('/assets/'),
        create: (data) => ApiClient.post('/assets/', data),
        delete: (id) => ApiClient.delete(`/assets/${id}`),
        getFleetSummary: () => ApiClient.get('/assets/fleet-summary'),
        recordService: (assetId, data) => ApiClient.post(`/assets/${assetId}/record-service`, data),
        recordOdometer: (assetId, data) => ApiClient.post(`/assets/${assetId}/record-odometer`, data),
        toggleActive: (assetId) => ApiClient.post(`/assets/${assetId}/toggle-active`, {})
    },
    personnel: {
        getAll: () => ApiClient.get('/personnel/'),
        create: (data) => ApiClient.post('/personnel/', data)
    },
    resources: {
        getMatrixStatus: () => ApiClient.get('/resources/matrix-status'),
        assign: (data) => ApiClient.post('/resources/assign', data),
        transfer: (data) => ApiClient.post('/resources/transfer', data),
        returnToBase: (data) => ApiClient.post('/resources/return-to-base', data)
    },
    expenses: {
        getCategories: () => ApiClient.get('/expenses/categories'),
        getCategoriesTree: () => ApiClient.get('/expenses/categories-tree'),
        getPendingInbox: () => ApiClient.get('/expenses/inbox/pending'),
        validateImpute: (expId, data) => ApiClient.post(`/expenses/inbox/${expId}/validate-impute`, data),
        reject: (expId, reason) => ApiClient.post(`/expenses/inbox/${expId}/reject?reason=${encodeURIComponent(reason)}`, {}),
        createManual: (data) => ApiClient.post('/expenses/manual', data),
        getDashboardComparison: () => ApiClient.get('/reports/comparison-dashboard')
    },
    maintenance: {
        getUsers: () => ApiClient.get('/maintenance/users'),
        createUser: (data) => ApiClient.post('/maintenance/users', data),
        updatePermissions: (userId, perms) => ApiClient.put(`/maintenance/users/${userId}/permissions`, perms),
        toggleUserStatus: (userId) => ApiClient.put(`/maintenance/users/${userId}/toggle-status`, {}),
        getAuditLogs: () => ApiClient.get('/maintenance/audit-logs'),
        getBackups: () => ApiClient.get('/maintenance/backups'),
        createBackup: () => ApiClient.post('/maintenance/backups/create', {}),
        restoreBackup: (filename) => ApiClient.post(`/maintenance/backups/restore/${filename}`, {}),
        syncDalorCatalog: () => ApiClient.post('/maintenance/sync-dalor-catalog', {}),
        resetToCleanSlate: (data) => ApiClient.post('/maintenance/reset-to-clean-slate', data)
    },
    clients: {
        getAll: () => ApiClient.get('/clients/'),
        create: (data) => ApiClient.post('/clients/', data),
        delete: (id) => ApiClient.delete(`/clients/${id}`)
    },
    services: {
        getAll: () => ApiClient.get('/services/'),
        create: (data) => ApiClient.post('/services/', data),
        delete: (id) => ApiClient.delete(`/services/${id}`)
    },
    dispatch: {
        getAll: () => ApiClient.get('/dispatch/'),
        getOne: (id) => ApiClient.get(`/dispatch/${id}`),
        create: (data) => ApiClient.post('/dispatch/', data),
        delete: (id) => ApiClient.delete(`/dispatch/${id}`),
        confirmDelivery: (id, data) => ApiClient.post(`/dispatch/${id}/confirm-delivery`, data)
    }
};
