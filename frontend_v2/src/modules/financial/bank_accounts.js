// Sigop ERP - Submódulo Financiero Modularizado
const API_BASE = (typeof window !== 'undefined' && window.API_BASE) || '/api/v1';

function safeParseFloat(val) {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    let s = String(val).trim();
    if (!s) return 0;
    let hasComma = s.includes(',');
    let hasDot = s.includes('.');
    if (hasComma && hasDot) {
        if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
            s = s.replace(/\./g, '').replace(',', '.');
        } else {
            s = s.replace(/,/g, '');
        }
    } else if (hasComma) {
        s = s.replace(',', '.');
    }
    s = s.replace(/[^0-9.-]/g, '');
    let res = parseFloat(s);
    return isNaN(res) ? 0 : res;
}

const authFetch = (url, options = {}) => {
    const token = (typeof localStorage !== 'undefined' && localStorage.getItem('token')) || (typeof window !== 'undefined' && window.authToken);
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (options.body instanceof FormData) {
        delete headers['Content-Type'];
    }
    return window.fetch(url, { ...options, headers });
};

function openMaterialConsumeModalWithProject(projectId) {
    if (typeof openMaterialConsumeModal === 'function') {
        openMaterialConsumeModal();
    } else {
        openModal("modalMaterialConsume");
    }
    const projSel = document.getElementById("mc_project_id");
    if (projSel && projectId) {
        projSel.value = String(projectId);
    }
}



// --- PUENTE DE COMPATIBILIDAD CON WINDOW & HTML INLINE ---
if (typeof window !== 'undefined') {
    window.calcClientPaymentBs = calcClientPaymentBs;
    window.calcQuickBs = calcQuickBs;
    window.loadPartnersWithdrawalsList = loadPartnersWithdrawalsList;
    window.loadPayablesList = loadPayablesList;
    window.loadReceivablesList = loadReceivablesList;
    window.loadTreasurySummary = loadTreasurySummary;
    window.openBadDebtModal = openBadDebtModal;
    window.openCreateCxCForProject = openCreateCxCForProject;
    window.openFinancialSubtab = openFinancialSubtab;
    window.openMaterialConsumeModalWithProject = openMaterialConsumeModalWithProject;
    window.openNewPartnerWithdrawalModal = openNewPartnerWithdrawalModal;
    window.openNewPayableModal = openNewPayableModal;
    window.openNewReceivableModal = openNewReceivableModal;
    window.openQuickFlowModal = openQuickFlowModal;
    window.openReceiveClientPaymentModal = openReceiveClientPaymentModal;
    window.onRcpClientChanged = onRcpClientChanged;
    window.openRecordPaymentModal = openRecordPaymentModal;
    window.selectQuickType = selectQuickType;
    window.submitBadDebtWriteOff = submitBadDebtWriteOff;
    window.submitCreatePayable = submitCreatePayable;
    window.submitCreateReceivable = submitCreateReceivable;
    window.submitDirectClientPayment = submitDirectClientPayment;
    window.submitFinancialPayment = submitFinancialPayment;
    window.submitQuickFlow = submitQuickFlow;
    window.switchFinancialSubtab = switchFinancialSubtab;
    window.openDeclareBadDebtModal = openDeclareBadDebtModal;
    window.submitDeclareBadDebt = submitDeclareBadDebt;
    window.openCxcHistoryModal = openCxcHistoryModal;
    window.switchCxcHistoryScope = switchCxcHistoryScope;
    window.toggleCxcGestionForm = toggleCxcGestionForm;
    window.submitCxcFollowUpLog = submitCxcFollowUpLog;
    window.openPayableHistoryModal = openPayableHistoryModal;
    window.goToCxcPage = goToCxcPage;
    window.changeCxcPageSize = changeCxcPageSize;
    window.renderReceivablesPaginated = renderReceivablesPaginated;
    window.goToCxpPage = goToCxpPage;
    window.changeCxpPageSize = changeCxpPageSize;
    window.renderPayablesPaginated = renderPayablesPaginated;
    window.goToTreasuryPage = goToTreasuryPage;
    window.changeTreasuryPageSize = changeTreasuryPageSize;
    window.renderTreasuryTracePaginated = renderTreasuryTracePaginated;
    window.goToPartnersPage = goToPartnersPage;
    window.changePartnersPageSize = changePartnersPageSize;
    window.renderPartnersWithdrawalsPaginated = renderPartnersWithdrawalsPaginated;
    window.setFilterCxc = setFilterCxc;
    window.filterCxcList = filterCxcList;
    window.calcFinTransBsEquiv = calcFinTransBsEquiv;
    window.onFinTransAccountChanged = onFinTransAccountChanged;
    window.openClientRefundModal = openClientRefundModal;
    window.submitClientRefund = submitClientRefund;
    window.openTreasuryExchangeModal = openTreasuryExchangeModal;
    window.onTreasuryExchangeTypeChanged = onTreasuryExchangeTypeChanged;
    window.calcTreasuryExchangeDiff = calcTreasuryExchangeDiff;
    window.submitTreasuryExchange = submitTreasuryExchange;
    window.setCashFlowRange = setCashFlowRange;
    window.loadCashFlowMatrix = loadCashFlowMatrix;
    window.printCashFlowMatrixReport = printCashFlowMatrixReport;
    window.applyTreasuryFilters = applyTreasuryFilters;
    window.resetTreasuryFilters = resetTreasuryFilters;
    window.handleTreasuryPeriodChange = handleTreasuryPeriodChange;
    window.printTreasuryTraceReport = printTreasuryTraceReport;
    window.onCxpSearchInput = onCxpSearchInput;
    window.onCxpDocTypeFilterChange = onCxpDocTypeFilterChange;
    window.applyCxpDateFilter = applyCxpDateFilter;
    window.clearCxpDateFilter = clearCxpDateFilter;
    window.setFilterCxp = setFilterCxp;
    window.onCxpModalDocTypeChange = onCxpModalDocTypeChange;
    window.calcPayablePreview = calcPayablePreview;
    window.openWithholdingVoucherModal = openWithholdingVoucherModal;
    window.printWithholdingVoucher = printWithholdingVoucher;
    window.openIslrWithholdingVoucherModal = openIslrWithholdingVoucherModal;
    window.printIslrWithholdingVoucher = printIslrWithholdingVoucher;
    window.openMunicipalWithholdingVoucherModal = openMunicipalWithholdingVoucherModal;
    window.printMunicipalWithholdingVoucher = printMunicipalWithholdingVoucher;
    window.switchFiscalInnerTab = switchFiscalInnerTab;
    window.loadFiscalBooksView = loadFiscalBooksView;
    window.downloadLibroVentasExcel = downloadLibroVentasExcel;
    window.downloadLibroComprasExcel = downloadLibroComprasExcel;
    window.printLibroVentasPDF = printLibroVentasPDF;
    window.printLibroComprasPDF = printLibroComprasPDF;
    window.openImportLibrosExcelModal = openImportLibrosExcelModal;
    window.submitImportLibrosExcel = submitImportLibrosExcel;
    window.openEditPayableModal = openEditPayableModal;
    window.submitEditPayable = submitEditPayable;
    window.calcEditPayableBsPreview = calcEditPayableBsPreview;
    window.calcEditPayableFromBs = calcEditPayableFromBs;
    window.deletePayablePrompt = deletePayablePrompt;
    window.setCashFlowCurrency = setCashFlowCurrency;
    window.onCashFlowMonthChange = onCashFlowMonthChange;
    window.applyCashFlowDateFilter = applyCashFlowDateFilter;
    window.clearCashFlowDateFilter = clearCashFlowDateFilter;
    window.openBcvRateHistoryModal = openBcvRateHistoryModal;
    window.selectBcvHistoricalRate = selectBcvHistoricalRate;
    window.onTreasuryExchangeDateChanged = onTreasuryExchangeDateChanged;
    window.filterPartnersWithdrawals = filterPartnersWithdrawals;
    window.selectPartnerSummaryCard = selectPartnerSummaryCard;
    window.confirmDeletePartnerWithdrawal = confirmDeletePartnerWithdrawal;
    window.loadUnbilledWarehouseEntries = loadUnbilledWarehouseEntries;
    window.onCxpPayableTypeChanged = onCxpPayableTypeChanged;
    window.onCxpWarehouseModeChange = onCxpWarehouseModeChange;
    window.onCxpWarehouseEntrySelected = onCxpWarehouseEntrySelected;
    window.addCxpMaterialRow = addCxpMaterialRow;
    window.onCxpMaterialRowMatChanged = onCxpMaterialRowMatChanged;
    window.removeCxpMaterialRow = removeCxpMaterialRow;
    window.calcCxpMaterialsTotal = calcCxpMaterialsTotal;
    window.applyCxpMaterialsTotalToAmount = applyCxpMaterialsTotalToAmount;
    window.onMaterialCreatedFromCxp = onMaterialCreatedFromCxp;
    window.onCxcClientChanged = onCxcClientChanged;
    window.onCxcProjectChanged = onCxcProjectChanged;
    window.openManageAccountsModal = openManageAccountsModal;
    window.submitNewFinancialAccount = submitNewFinancialAccount;
    window.deactivateFinancialAccount = deactivateFinancialAccount;
    window.loadFinancialAccounts = loadFinancialAccounts;
    window.onTreasurySummaryPeriodChange = onTreasurySummaryPeriodChange;
    window.resetTreasurySummaryFilters = resetTreasurySummaryFilters;
}

// ─── CUENTAS BANCARIAS Y CAJAS PERSONALIZADAS ────────────────────────────────

/** Variable global con las cuentas cargadas */
var allFinancialAccounts = window.allFinancialAccounts = window.allFinancialAccounts || [];

/**
 * Carga cuentas desde la API y llena todos los selectores de cuenta del sistema.
 * Se llama una vez al iniciar la app y luego de crear/editar cuentas.
 */
async function loadFinancialAccounts() {
    try {
        const resp = await fetch(`${API_BASE}/financial/accounts`, {
            headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {}
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const accounts = await resp.json();
        allFinancialAccounts = window.allFinancialAccounts = accounts.filter(a => a.is_active);

        // Poblar TODOS los selectores de cuenta del sistema
        _fillAccountSelect('fin_trans_account', allFinancialAccounts);
        _fillAccountSelect('refund_source_account', allFinancialAccounts);
        _fillAccountSelect('exch_source_account', allFinancialAccounts);
        _fillAccountSelect('exch_target_account', allFinancialAccounts);

        const sumAccSel = document.getElementById('treasury_sum_account');
        if (sumAccSel) {
            const curVal = sumAccSel.value;
            sumAccSel.innerHTML = '<option value="all">Todas las Cuentas / Caja</option>';
            allFinancialAccounts.forEach(acc => {
                const opt = document.createElement('option');
                opt.value = acc.id;
                opt.textContent = `${acc.name} (${acc.currency ? acc.currency.toUpperCase() : (acc.account_type || '').toUpperCase()})`;
                sumAccSel.appendChild(opt);
            });
            if (curVal) sumAccSel.value = curVal;
        }

    } catch(err) {
        console.error('[FinancialAccounts] Error cargando cuentas:', err);
        // Fallback: insertar las cuentas hardcodeadas clásicas para no romper nada
        const fallback = [
            {name:'Banesco Panamá USD', account_type:'usd'},
            {name:'Banesco Banco Universal (Bs)', account_type:'bs'},
            {name:'Binance USDT', account_type:'usd'},
            {name:'Zelle', account_type:'usd'},
            {name:'Caja Efectivo USD', account_type:'usd'},
            {name:'Caja Efectivo Bs', account_type:'bs'},
        ];
        allFinancialAccounts = window.allFinancialAccounts = fallback;
        _fillAccountSelect('fin_trans_account', fallback);
        _fillAccountSelect('refund_source_account', fallback);
        _fillAccountSelect('exch_source_account', fallback);
        _fillAccountSelect('exch_target_account', fallback);
    }
}

/**
 * Llena un <select> con las cuentas disponibles.
 * Añade '(Bs)' al label si la cuenta es en bolívares, para que onFinTransAccountChanged funcione.
 */
function _fillAccountSelect(selectId, accounts) {
    const sel = document.getElementById(selectId);
    if (!sel) return;
    const currentVal = sel.value;
    sel.innerHTML = '';
    accounts.forEach(acc => {
        const opt = document.createElement('option');
        // El valor incluye la moneda para que la lógica de cálculo de Bs funcione
        const bsLabel = acc.account_type === 'bs' ? ' (Bs)' : ` ($)`;
        opt.value = acc.name;  // el valor es el nombre exacto (compatibilidad con backend)
        opt.textContent = acc.name + (acc.name.includes('(Bs)') || acc.name.includes('($)') ? '' : bsLabel);
        sel.appendChild(opt);
    });
    // Restaurar valor anterior si sigue disponible
    if (currentVal && [...sel.options].some(o => o.value === currentVal)) {
        sel.value = currentVal;
    }
}

/** Abre el modal de gestión de cuentas y carga la lista */
async function openManageAccountsModal() {
    document.getElementById('modalManageAccounts')?.classList.remove('hidden');
    // Limpiar campos del formulario
    ['new_acc_name','new_acc_bank','new_acc_number','new_acc_notes'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    await _renderAccountsList();
}

/** Renderiza la tabla de cuentas dentro del modal */
async function _renderAccountsList() {
    const container = document.getElementById('manageAccountsList');
    if (!container) return;
    container.innerHTML = '<p style="text-align:center;color:#64748b;font-size:13px;">Cargando...</p>';
    try {
        const resp = await fetch(`${API_BASE}/financial/accounts`, {
            headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {}
        });
        const accounts = await resp.json();

        if (!accounts.length) {
            container.innerHTML = '<p style="text-align:center;color:#94a3b8;font-size:13px;">No hay cuentas registradas aún.</p>';
            return;
        }

        const rows = accounts.map(acc => `
            <tr style="border-bottom:1px solid #f1f5f9;">
                <td style="padding:8px 6px; font-weight:700; font-size:13px; color:${acc.is_active ? '#1e293b' : '#94a3b8'};">
                    ${acc.is_active ? '🟢' : '🔴'} ${acc.name}
                </td>
                <td style="padding:8px 6px; font-size:12px; color:#475569;">
                    ${acc.account_type === 'usd' ? '💵 USD' : '🇻🇪 Bs'}
                </td>
                <td style="padding:8px 6px; font-size:12px; color:#64748b;">${acc.bank_or_provider || '—'}</td>
                <td style="padding:8px 6px; font-size:12px; color:#94a3b8;">${acc.account_number || '—'}</td>
                <td style="padding:8px 6px; text-align:center; white-space:nowrap;">
                    ${acc.is_active ? `
                        <button onclick="openInitialBalanceModal(${acc.id}, '${acc.name.replace(/'/g, "\\'")}', '${acc.account_type}')" 
                            style="background:#e0f2fe;color:#0284c7;border:1px solid #7dd3fc;border-radius:4px;padding:3px 8px;font-size:11px;font-weight:700;cursor:pointer;margin-right:4px;" 
                            title="Cargar Saldo Inicial / Apertura">
                            <i class="fa-solid fa-coins"></i> Saldo Inicial
                        </button>
                        <button onclick="deactivateFinancialAccount(${acc.id})" 
                            style="background:#fee2e2;color:#dc2626;border:none;border-radius:4px;padding:3px 8px;font-size:11px;font-weight:700;cursor:pointer;" 
                            title="Desactivar cuenta">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    ` : `<span style="font-size:10px;color:#94a3b8;">Inactiva</span>`}
                </td>
            </tr>
        `).join('');

        container.innerHTML = `
            <table style="width:100%; border-collapse:collapse;">
                <thead>
                    <tr style="background:#f8fafc; border-bottom:2px solid #e2e8f0;">
                        <th style="padding:8px 6px; text-align:left; font-size:11px; color:#64748b; font-weight:700;">CUENTA</th>
                        <th style="padding:8px 6px; text-align:left; font-size:11px; color:#64748b; font-weight:700;">MONEDA</th>
                        <th style="padding:8px 6px; text-align:left; font-size:11px; color:#64748b; font-weight:700;">BANCO</th>
                        <th style="padding:8px 6px; text-align:left; font-size:11px; color:#64748b; font-weight:700;">REF.</th>
                        <th style="padding:8px 6px; text-align:center; font-size:11px; color:#64748b; font-weight:700;">ACCIÓN</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        `;
    } catch(err) {
        container.innerHTML = `<p style="color:#dc2626;font-size:13px;">Error cargando cuentas: ${err.message}</p>`;
    }
}

/** Crea una nueva cuenta bancaria o caja */
async function submitNewFinancialAccount() {
    const name = document.getElementById('new_acc_name')?.value?.trim();
    const account_type = document.getElementById('new_acc_type')?.value;
    const bank_or_provider = document.getElementById('new_acc_bank')?.value?.trim() || null;
    const account_number = document.getElementById('new_acc_number')?.value?.trim() || null;
    const notes = document.getElementById('new_acc_notes')?.value?.trim() || null;

    if (!name) { alert('El nombre de la cuenta es obligatorio.'); return; }
    if (!account_type) { alert('Debes seleccionar el tipo de moneda.'); return; }

    try {
        const resp = await fetch(`${API_BASE}/financial/accounts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
            },
            body: JSON.stringify({ name, account_type, bank_or_provider, account_number, notes })
        });
        if (!resp.ok) {
            const err = await resp.json();
            throw new Error(err.detail || `HTTP ${resp.status}`);
        }
        // Limpiar campos
        ['new_acc_name','new_acc_bank','new_acc_number','new_acc_notes'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        // Recargar lista y selectores
        await _renderAccountsList();
        await loadFinancialAccounts();
        // Feedback visual
        const btn = document.querySelector('#modalManageAccounts .btn-primary');
        if (btn) { btn.textContent = '✅ Creada'; setTimeout(() => { btn.innerHTML = '<i class="fa-solid fa-plus"></i> Crear Cuenta'; }, 2000); }
    } catch(err) {
        alert(`Error al crear la cuenta: ${err.message}`);
    }
}

/** Desactiva (soft-delete) una cuenta por ID */
async function deactivateFinancialAccount(accountId) {
    if (!confirm('¿Seguro que quieres desactivar esta cuenta? Ya no aparecerá en los módulos financieros.')) return;
    try {
        const resp = await fetch(`${API_BASE}/financial/accounts/${accountId}`, {
            method: 'DELETE',
            headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {}
        });
        if (!resp.ok && resp.status !== 204) throw new Error(`HTTP ${resp.status}`);
        await _renderAccountsList();
        await loadFinancialAccounts();
    } catch(err) {
        alert(`Error al desactivar la cuenta: ${err.message}`);
    }
}

function openInitialBalanceModal(accountId, accountName, accountType) {
    const idEl = document.getElementById("initbal_account_id");
    const nameEl = document.getElementById("initbal_account_name");
    const curSelect = document.getElementById("initbal_currency");
    const amtEl = document.getElementById("initbal_amount");
    const dateEl = document.getElementById("initbal_date");
    const notesEl = document.getElementById("initbal_notes");

    if (idEl) idEl.value = accountId;
    if (nameEl) nameEl.value = accountName;
    if (curSelect) {
        curSelect.value = (accountType || 'usd').toLowerCase() === 'bs' ? 'BS' : 'USD';
    }
    if (amtEl) amtEl.value = "";
    if (dateEl) dateEl.value = new Date().toISOString().split('T')[0];
    if (notesEl) notesEl.value = "Saldo de apertura / conciliación inicial";

    if (typeof openModal === 'function') openModal("modalInitialBalance");
}

async function submitInitialBalance(event) {
    if (event && event.preventDefault) event.preventDefault();
    const accountId = parseInt(document.getElementById("initbal_account_id")?.value);
    const amount = parseFloat(document.getElementById("initbal_amount")?.value) || 0;
    const currency = document.getElementById("initbal_currency")?.value || "USD";
    const dateVal = document.getElementById("initbal_date")?.value;
    const notes = document.getElementById("initbal_notes")?.value?.trim() || "Saldo de apertura inicial";

    if (!accountId || isNaN(amount) || amount <= 0) {
        alert("⚠️ Por favor ingresa un monto válido mayor a 0 para el saldo inicial.");
        return;
    }

    try {
        const payload = {
            balance_amount: amount,
            currency: currency,
            exchange_rate: window.currentExchangeRate || 859.06,
            notes: notes,
            operation_date: dateVal ? new Date(dateVal).toISOString() : new Date().toISOString()
        };
        const res = await authFetch(`${API_BASE}/financial/accounts/${accountId}/initial-balance`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Error al registrar saldo inicial");

        if (typeof closeModal === 'function') closeModal("modalInitialBalance");
        alert(`✅ ${data.message || 'Saldo inicial registrado exitosamente.'}`);
        if (typeof _renderAccountsList === 'function') await _renderAccountsList();
        if (typeof loadFinancialAccounts === 'function') await loadFinancialAccounts();
        if (typeof loadTreasurySummary === 'function') loadTreasurySummary();
    } catch (e) {
        console.error("[INITIAL BALANCE ERROR]", e);
        alert(`❌ Error al registrar saldo inicial: ${e.message || e}`);
    }
}

if (typeof window !== 'undefined') {
    window.openInitialBalanceModal = openInitialBalanceModal;
    window.submitInitialBalance = submitInitialBalance;
    window.loadExpenseConcepts = loadExpenseConcepts;
    window.openCreateConceptModal = openCreateConceptModal;
    window.submitCreateExpenseConcept = submitCreateExpenseConcept;
}

// Auto-cargar las cuentas al iniciar el módulo financiero
if (typeof window !== 'undefined') {
    // Esperar a que el DOM esté listo y el token disponible
    const _initAccounts = () => {
        authToken = window.authToken || localStorage.getItem('dalor_token') || null;
        if (authToken) {
            loadFinancialAccounts();
        } else {
            // Reintenta en 1.5s si el token aún no está disponible
            setTimeout(_initAccounts, 1500);
        }
    };
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _initAccounts);
    } else {
        setTimeout(_initAccounts, 500);
    }
}





// Auto-window binding & ES6 exports
if (typeof window !== 'undefined') {
    window.openMaterialConsumeModalWithProject = openMaterialConsumeModalWithProject;
    window.loadFinancialAccounts = loadFinancialAccounts;
    window._fillAccountSelect = _fillAccountSelect;
    window.openManageAccountsModal = openManageAccountsModal;
    window._renderAccountsList = _renderAccountsList;
    window.submitNewFinancialAccount = submitNewFinancialAccount;
    window.deactivateFinancialAccount = deactivateFinancialAccount;
    window.openInitialBalanceModal = openInitialBalanceModal;
    window.submitInitialBalance = submitInitialBalance;
}

export { openMaterialConsumeModalWithProject };
export { loadFinancialAccounts };
export { _fillAccountSelect };
export { openManageAccountsModal };
export { _renderAccountsList };
export { submitNewFinancialAccount };
export { deactivateFinancialAccount };
export { openInitialBalanceModal };
export { submitInitialBalance };
