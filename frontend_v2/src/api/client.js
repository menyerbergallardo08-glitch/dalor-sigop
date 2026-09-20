
import { store } from '../state/store.js';

const API_BASE = '/api/v1';

async function request(endpoint, options = {}) {
    options.headers = options.headers || {};
    
    // Inject Authorization Header
    const token = store.token || localStorage.getItem('dalor_token');
    if (token) {
        options.headers['Authorization'] = `Bearer ${token}`;
    }
    
    if (!(options.body instanceof FormData) && !options.headers['Content-Type']) {
        options.headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${API_BASE}${endpoint}`, options);

    if (response.status === 401 && !endpoint.includes('/auth/login')) {
        console.warn("[API] Token expirado (401). Cerrando sesión...");
        store.logout();
        throw new Error("Sesión expirada. Por favor ingresa tus credenciales.");
    }

    if (!response.ok) {
        let errDetail = `HTTP ${response.status}`;
        try {
            const errData = await response.json();
            errDetail = errData.detail || errData.message || JSON.stringify(errData);
        } catch(e) {}
        throw new Error(errDetail);
    }

    return await response.json();
}

export const api = {
    auth: {
        login: (username, password) => request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        })
    },
    clients: {
        getAll: () => request('/clients/'),
        create: (data) => request('/clients/', { method: 'POST', body: JSON.stringify(data) }),
        delete: (id) => request(`/clients/${id}`, { method: 'DELETE' })
    },
    services: {
        getAll: () => request('/services/'),
        create: (data) => request('/services/', { method: 'POST', body: JSON.stringify(data) })
    },
    quotations: {
        getAll: () => request('/quotations/'),
        create: (data) => request('/quotations/', { method: 'POST', body: JSON.stringify(data) }),
        update: (id, data) => request(`/quotations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
        approve: (id) => request(`/quotations/${id}/approve`, { method: 'POST' })
    },
    projects: {
        getAll: () => request('/projects/'),
        getDetails: (id) => request(`/projects/${id}/details`),
        createPayment: (data) => request('/financial/direct-collection', { method: 'POST', body: JSON.stringify(data) })
    },
    assets: {
        getAll: () => request('/assets/'),
        getHistory: (id) => request(`/assets/${id}/history`)
    },
    dispatch: {
        getAll: () => request('/dispatch/'),
        create: (data) => request('/dispatch/', { method: 'POST', body: JSON.stringify(data) }),
        confirm: (id) => request(`/dispatch/${id}/confirm-delivery`, { method: 'POST' })
    },
    financial: {
        getCxc: () => request('/financial/cxc'),
        getCxp: () => request('/financial/cxp'),
        getSummary: () => request('/financial/summary'),
        getBcvRate: (forceRefresh = false) => request(`/financial/bcv-rate?force_refresh=${forceRefresh}`),
        recordPartnerWithdrawal: (data) => request('/financial/partners/withdrawals', { method: 'POST', body: JSON.stringify(data) })
    },
    expenses: {
        getAll: () => request('/expenses/'),
        getCategories: () => request('/expenses/categories'),
        create: (data) => request('/expenses/', { method: 'POST', body: JSON.stringify(data) })
    },
    maintenance: {
        getUsers: () => request('/maintenance/users'),
        syncCatalog: () => request('/maintenance/sync-dalor-catalog', { method: 'POST' })
    }
};
