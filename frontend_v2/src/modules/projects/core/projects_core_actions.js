// Sigop ERP - Submódulo Proyectos Core
const API_BASE = (typeof window !== 'undefined' && window.API_BASE) || '/api/v1';

const authFetch = (url, options = {}) => {
    const token = (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('dalor_token')) ||
                  (typeof localStorage !== 'undefined' && (localStorage.getItem('dalor_token') || localStorage.getItem('token'))) ||
                  (typeof window !== 'undefined' && window.authToken) || '';
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (options.body instanceof FormData) {
        delete headers['Content-Type'];
    }
    return window.fetch(url, { ...options, headers });
};


export function downloadExcelTemplate() {

    window.location.href = `${API_BASE}/projects/excel-template`;

}

export function triggerExcelImport() {

    document.getElementById("excelProjectFileInput").click();

}

export async function handleExcelFileSelected(event) {

    const file = event.target.files[0];

    if (!file) return;



    const formData = new FormData();

    formData.append("file", file);



    try {
        const res = await authFetch(`${API_BASE}/projects/import-excel`, {
            method: "POST",
            body: formData
        });

        if (res.ok) {
            const data = await res.json();
            alert(data.message);
            await loadInitialMasterData();
            loadProjectsList();
        } else {
            const err = await res.json();
            alert("Error al importar Excel: " + (err.detail || JSON.stringify(err)));
        }
    } catch (e) {
        alert("Error de conexión al cargar Excel.");
    }
}

export function deleteProject(projectId) {
    if (typeof window.openAdminAuthModal === 'function') {
        window.openAdminAuthModal(
            'delete_project',
            projectId,
            `¿Confirmas la inactivación del proyecto #${projectId}? Esta acción requiere contraseña de Administrador / Director General y registrará una traza permanente en la bitácora de auditoría.`
        );
    } else {
        const reason = prompt("Indica el motivo de la inactivación (Requerido para auditoría):");
        if (!reason) return;
        const pwd = prompt("🔒 AUTORIZACIÓN: Ingrese la contraseña de Administrador / Director:");
        if (!pwd) return;
        authFetch(`${API_BASE}/projects/${projectId}/delete`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ admin_password: pwd, reason: reason })
        })
        .then(async r => {
            const data = await r.json();
            if (!r.ok) throw new Error(data.detail || "Error al inactivar proyecto");
            alert(`✅ ${data.message || 'Proyecto inactivado exitosamente.'}`);
            if (typeof loadInitialMasterData === 'function') await loadInitialMasterData();
            loadProjectsList();
        })
        .catch(err => alert("❌ " + err.message));
    }
}

export async function closeAndCulminateProject(projectId) {
    if (!confirm("¿Estás seguro de culminar y cerrar esta obra?\n\n- El estatus pasará a CULMINADO.\n- Toda la maquinaria, vehículos y personal asignados serán liberados a Disponible en Base Central.\n- El proyecto quedará archivado en el histórico.")) {
        return;
    }

    try {
        const res = await authFetch(`${API_BASE}/projects/${projectId}/status`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "culminado" })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Error al culminar el proyecto");

        alert(`✅ ${data.message || 'Obra culminada y cerrada exitosamente.'}`);
        closeModal("modalProjectDetail");
        if (typeof window !== "undefined" && typeof window.loadProjectsList === "function") { await window.loadProjectsList(); }
        if (typeof window.loadInitialMasterData === 'function') {
            await window.loadInitialMasterData();
        }
    } catch (e) {
        alert("Error al culminar obra: " + e.message);
    }
}
