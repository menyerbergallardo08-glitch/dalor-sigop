
// ── Indicadores de Margen en Tiempo Real ────────────────────────────────────
function calcEditServiceMargin() {
    const cost = parseFloat(document.getElementById('edit_srv_cost')?.value) || 0;
    const price = parseFloat(document.getElementById('edit_srv_price')?.value) || 0;
    const badge = document.getElementById('editSrvMarginBadge');
    if (!badge) return;
    if (!cost && !price) { badge.innerHTML = ''; return; }
    const margin = price - cost;
    const pct = cost > 0 ? ((margin / cost) * 100).toFixed(1) : 'N/A';
    if (margin < 0) {
        badge.innerHTML = '<span style="color:#e11d48;background:#fff1f2;padding:3px 10px;border-radius:6px;border:1px solid #fecdd3;">ERROR: Precio de venta menor al costo — Perdida de $' + Math.abs(margin).toFixed(2) + ' (' + Math.abs(pct) + '%) — Ajusta el precio</span>';
    } else if (margin === 0) {
        badge.innerHTML = '<span style="color:#b45309;background:#fffbeb;padding:3px 10px;border-radius:6px;border:1px solid #fde68a;">Margen Cero: Precio igual al costo, sin ganancia</span>';
    } else {
        badge.innerHTML = '<span style="color:#059669;background:#ecfdf5;padding:3px 10px;border-radius:6px;border:1px solid #a7f3d0;">OK Ganancia: +$' + margin.toFixed(2) + ' (' + pct + '% sobre costo)</span>';
    }
}

function calcNewServiceMargin() {
    const cost = parseFloat(document.getElementById('srv_cost')?.value) || 0;
    const price = parseFloat(document.getElementById('srv_price')?.value) || 0;
    const badge = document.getElementById('newSrvMarginBadge');
    if (!badge) return;
    if (!cost && !price) { badge.innerHTML = ''; return; }
    const margin = price - cost;
    const pct = cost > 0 ? ((margin / cost) * 100).toFixed(1) : 'N/A';
    if (margin < 0) {
        badge.innerHTML = '<span style="color:#e11d48;background:#fff1f2;padding:3px 10px;border-radius:6px;border:1px solid #fecdd3;">ERROR: Precio de venta menor al costo — Perdida de $' + Math.abs(margin).toFixed(2) + ' (' + Math.abs(pct) + '%) — Ajusta el precio</span>';
    } else if (margin === 0) {
        badge.innerHTML = '<span style="color:#b45309;background:#fffbeb;padding:3px 10px;border-radius:6px;border:1px solid #fde68a;">Margen Cero: Precio igual al costo, sin ganancia</span>';
    } else {
        badge.innerHTML = '<span style="color:#059669;background:#ecfdf5;padding:3px 10px;border-radius:6px;border:1px solid #a7f3d0;">OK Ganancia: +$' + margin.toFixed(2) + ' (' + pct + '% sobre costo)</span>';
    }
}

window.calcEditServiceMargin = calcEditServiceMargin;
window.calcNewServiceMargin = calcNewServiceMargin;
