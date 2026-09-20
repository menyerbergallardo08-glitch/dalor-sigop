
// DALOR SIGO-P | Reactive Application State Store
class Store {
    constructor() {
        this.listeners = new Set();
        this.currentUser = null;
        try {
            this.currentUser = JSON.parse(localStorage.getItem('dalor_user') || 'null');
        } catch(e) { this.currentUser = null; }
        this.token = localStorage.getItem('dalor_token') || null;
        this.activeView = this.token ? 'quotations' : 'login';
        this.bcv = {
            rate: parseFloat(localStorage.getItem('dalor_exchange_rate')) || 849.56,
            date: '',
            source: 'BCV Oficial'
        };
        this.notifications = [];
    }

    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    notify() {
        for (const listener of this.listeners) {
            listener(this);
        }
    }

    setUser(user, token) {
        this.currentUser = user;
        this.token = token;
        if (token) {
            localStorage.setItem('dalor_token', token);
            localStorage.setItem('dalor_user', JSON.stringify(user));
            this.activeView = 'quotations';
        } else {
            localStorage.removeItem('dalor_token');
            localStorage.removeItem('dalor_user');
            this.activeView = 'login';
        }
        this.notify();
    }

    logout() {
        this.setUser(null, null);
    }

    setView(viewName) {
        this.activeView = viewName;
        this.notify();
    }

    setBcv(data) {
        if (data && data.rate) {
            const r = parseFloat(data.rate);
            if (!isNaN(r) && r > 0) {
                this.bcv.rate = r;
                localStorage.setItem('dalor_exchange_rate', r);
            }
        }
        this.notify();
    }
}

export const store = new Store();
