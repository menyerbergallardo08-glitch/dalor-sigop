
import { api } from '../api/client.js';
import { store } from '../state/store.js';
import { showToast } from '../components/Toast.js';

export function renderLoginView() {
    return `
    <div style="min-height: calc(100vh - 60px); display: flex; align-items: center; justify-content: center; padding: 20px; background: radial-gradient(circle at center, #00375e 0%, #001f35 100%);">
        <div style="width: 100%; max-width: 440px; background: #ffffff; border-radius: 16px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4); padding: 36px 32px; text-align: center;">
            <div style="display: flex; justify-content: center; align-items: center; gap: 10px; margin-bottom: 8px;">
                <i class="fa-solid fa-bolt" style="font-size: 28px; color: var(--dalor-gold);"></i>
                <h1 style="font-size: 22px; font-weight: 900; color: var(--dalor-navy); letter-spacing: -0.5px;">DALOR SIGO-P</h1>
            </div>
            <p style="font-size: 12px; font-weight: 700; color: var(--dalor-text-muted); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 24px;">
                Portal Corporativo Enterprise
            </p>

            <form id="form-login" style="text-align: left;">
                <div style="margin-bottom: 16px;">
                    <label style="display: block; font-size: 12px; font-weight: 700; color: var(--dalor-text-main); margin-bottom: 6px;">
                        Usuario
                    </label>
                    <div style="position: relative;">
                        <i class="fa-solid fa-user" style="position: absolute; left: 12px; top: 12px; color: #94a3b8;"></i>
                        <input type="text" id="login_username" required autocomplete="username"
                            style="width: 100%; padding: 10px 12px 10px 36px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 14px; font-weight: 600;"
                            placeholder="director, administracion, etc.">
                    </div>
                </div>

                <div style="margin-bottom: 24px;">
                    <label style="display: block; font-size: 12px; font-weight: 700; color: var(--dalor-text-main); margin-bottom: 6px;">
                        Contraseña
                    </label>
                    <div style="position: relative;">
                        <i class="fa-solid fa-lock" style="position: absolute; left: 12px; top: 12px; color: #94a3b8;"></i>
                        <input type="password" id="login_password" required autocomplete="current-password"
                            style="width: 100%; padding: 10px 12px 10px 36px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 14px;"
                            placeholder="••••••••">
                    </div>
                </div>

                <button type="submit" id="btn-submit-login" class="btn btn-primary"
                    style="width: 100%; padding: 12px; font-size: 14px; font-weight: 800; justify-content: center;">
                    <i class="fa-solid fa-right-to-bracket" style="color: var(--dalor-gold);"></i> Iniciar Sesión
                </button>
            </form>
        </div>
    </div>
    `;
}

export function bindLoginEvents() {
    const form = document.getElementById('form-login');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const u = document.getElementById('login_username').value.trim();
        const p = document.getElementById('login_password').value;
        const btn = document.getElementById('btn-submit-login');

        if (!u || !p) return;

        btn.disabled = true;
        const origText = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Verificando...';

        try {
            const data = await api.auth.login(u, p);
            showToast(`Bienvenido, ${data.user.full_name || data.user.username}`);
            store.setUser(data.user, data.access_token);
        } catch(err) {
            showToast(err.message, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = origText;
        }
    });
}
