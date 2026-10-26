/**
 * DALOR SIGO-P | Módulo: CORE_TAX.JS
 * Desacoplado de core.js
 * Cálculos de monto, condición fiscal y retenciones
 */

// ==============================================================================
// 💵 CÁLCULOS DE MONTO & CONDICIÓN FISCAL EN FORMULARIO DE CAMPO
// ==============================================================================
window.calcFieldBs = function() {
    const usd = parseFloat(document.getElementById("field_amount_usd")?.value) || 0;

    const rate = parseFloat(document.getElementById("globalExchangeRateInput")?.value) || EXCHANGE_RATE;

    const bsEl = document.getElementById("field_amount_bs");

    if (bsEl && !isNaN(usd)) {
        bsEl.value = (usd * rate).toFixed(2);

    }

    updateFieldTaxDisplays();

};

window.calcFieldUsd = function() {
    const bs = parseFloat(document.getElementById("field_amount_bs")?.value) || 0;

    const rate = parseFloat(document.getElementById("globalExchangeRateInput")?.value) || EXCHANGE_RATE;

    const usdEl = document.getElementById("field_amount_usd");

    if (usdEl && !isNaN(bs) && rate > 0) {
        usdEl.value = (bs / rate).toFixed(2);

    }

    updateFieldTaxDisplays();

};

window.onFieldTaxConditionChanged = function() {
    updateFieldTaxDisplays();

};

function updateFieldTaxDisplays() {
    const usd = parseFloat(document.getElementById("field_amount_usd")?.value) || 0;

    const isExempt = document.getElementById("field_is_tax_exempt")?.value === "true";

    const base = isExempt ? usd : +(usd / 1.16).toFixed(2);

    const tax = isExempt ? 0.0 : +(usd - base).toFixed(2);

    const baseIn = document.getElementById("field_base_amount_usd");

    const taxIn = document.getElementById("field_tax_amount_usd");

    const baseDisp = document.getElementById("field_base_display");

    const taxDisp = document.getElementById("field_tax_display");

    if (baseIn) baseIn.value = base.toFixed(2);

    if (taxIn) taxIn.value = tax.toFixed(2);

    if (baseDisp) baseDisp.innerText = `$${base.toFixed(2)}`;

    if (taxDisp) taxDisp.innerText = `$${tax.toFixed(2)}`;

}

window.onValTaxChanged = function() {
    const usd = parseFloat(document.getElementById("val_amount_usd")?.value) || 0;

    const isExempt = document.getElementById("val_is_tax_exempt")?.value === "true";

    const base = isExempt ? usd : +(usd / 1.16).toFixed(2);

    const tax = isExempt ? 0.0 : +(usd - base).toFixed(2);

    const baseEl = document.getElementById("val_base_usd");

    const taxEl = document.getElementById("val_tax_usd");

    if (baseEl) baseEl.value = base.toFixed(2);

    if (taxEl) taxEl.value = tax.toFixed(2);

};

export { updateFieldTaxDisplays };
