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

// ==============================================================================

// ⚡ 17. CARGA RÁPIDA EN 3 TOQUES & CONTROL DE RETIROS DE SOCIOS

// ==============================================================================

function _getLocalDatetimeLocalValue(dt = new Date()) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}

function _getLiveQuickBcvRate() {
    return parseFloat(window.EXCHANGE_RATE || (window.BCV_DATA && window.BCV_DATA.rate) || (typeof EXCHANGE_RATE !== 'undefined' ? EXCHANGE_RATE : 0)) || 850.0;
}

function openQuickFlowModal() {

    const u = (typeof window !== 'undefined' && window.currentUser) || (typeof currentUser !== 'undefined' ? currentUser : null);
    const role = (u?.role_name || u?.username || '').toLowerCase();

    if (role.includes('campo') || role.includes('supervisor')) {

        alert('Acceso restringido: El atajo de 3 toques es exclusivo para Dirección y Finanzas. Por favor utiliza el formulario formal de campo.');

        return;

    }

    const pSelect = document.getElementById('qf_project_id');
    const projs = (typeof window !== 'undefined' && Array.isArray(window.allProjects)) ? window.allProjects : [];

    if (pSelect && projs.length > 0) {

        pSelect.innerHTML = projs.map(p => `<option value="${p.id}">${p.code} - ${(p.name || '').substring(0, 30)}</option>`).join('');

    }

    document.getElementById('quickFlowForm')?.reset();

    const editIdEl = document.getElementById('qf_edit_withdrawal_id');
    if (editIdEl) editIdEl.value = '';

    const opDateEl = document.getElementById('qf_operation_date');
    if (opDateEl) opDateEl.value = _getLocalDatetimeLocalValue();

    const rateEl = document.getElementById('qf_exchange_rate');
    if (rateEl) rateEl.value = _getLiveQuickBcvRate().toFixed(2);

    const refEl = document.getElementById('qf_reference_number');
    if (refEl) refEl.value = '';

    selectQuickType('obra');

    calcQuickBs();

    if (typeof window.openModal === 'function') {
        window.openModal('modalQuickFlow');
    } else {
        const m = document.getElementById('modalQuickFlow');
        if (m) {
            m.classList.remove('hidden');
            m.style.removeProperty('display');
        }
    }

}



function selectQuickType(type) {

    document.getElementById('qf_selected_type').value = type;

    

    // Reset cards styles

    ['obra', 'sede', 'socio'].forEach(t => {

        const card = document.getElementById(`card_type_${t}`);

        const details = document.getElementById(`qf_details_${t}`);

        if (card) {

            card.style.borderColor = '#cbd5e1';

            card.style.background = '#ffffff';

        }

        if (details) details.classList.add('hidden');

    });



    const activeCard = document.getElementById(`card_type_${type}`);

    const activeDetails = document.getElementById(`qf_details_${type}`);

    

    if (type === 'obra') {

        if (activeCard) { activeCard.style.borderColor = 'var(--dalor-blue)'; activeCard.style.background = '#f0f9ff'; }

    } else if (type === 'sede') {

        if (activeCard) { activeCard.style.borderColor = '#0d9488'; activeCard.style.background = '#f0fdfa'; }

    } else if (type === 'socio') {

        if (activeCard) { activeCard.style.borderColor = '#7c3aed'; activeCard.style.background = '#faf5ff'; }

    }



    if (activeDetails) activeDetails.classList.remove('hidden');

}



function _getEffectiveQuickRate() {
    const inpRate = parseFloat(document.getElementById('qf_exchange_rate')?.value);
    if (!isNaN(inpRate) && inpRate > 0) return inpRate;
    return _getLiveQuickBcvRate();
}

function calcQuickBs() {
    const usd = parseFloat(document.getElementById('qf_amount_usd')?.value) || 0;
    const bsInput = document.getElementById('qf_amount_bs');
    const rate = _getEffectiveQuickRate();
    if (bsInput) {
        bsInput.value = usd > 0 ? (usd * rate).toFixed(2) : '';
    }
}

function calcQuickUsd() {
    const bs = parseFloat(document.getElementById('qf_amount_bs')?.value) || 0;
    const usdInput = document.getElementById('qf_amount_usd');
    const rate = _getEffectiveQuickRate();
    if (usdInput && rate > 0) {
        usdInput.value = bs > 0 ? (bs / rate).toFixed(2) : '';
    }
}



async function submitQuickFlow(event) {

    event.preventDefault();

    const amount_usd = parseFloat(document.getElementById('qf_amount_usd').value) || 0;

    const payment_method = document.getElementById('qf_payment_method').value;

    const vendor = document.getElementById('qf_vendor').value.trim() || 'General';

    const description = document.getElementById('qf_description').value.trim();

    const selected_type = document.getElementById('qf_selected_type').value;



    if (amount_usd <= 0) {

        alert('Por favor ingresa un monto mayor a cero.');

        return;

    }



    try {

        if (selected_type === 'socio') {

            // Registrar o editar como Retiro de Socio
            const editId = document.getElementById('qf_edit_withdrawal_id')?.value?.trim();
            const movement_type = document.getElementById('qf_partner_movement_type')?.value || 'retiro';
            const partner_name = (document.getElementById('qf_partner_name')?.value || '').trim() || 'Accionista';
            const concept = document.getElementById('qf_partner_concept').value.trim() || description;
            const liveRate = _getEffectiveQuickRate();
            const rawBs = parseFloat(document.getElementById('qf_amount_bs')?.value);
            const exact_amount_bs = (!isNaN(rawBs) && rawBs > 0) ? Math.round(rawBs * 100) / 100 : Math.round(amount_usd * liveRate * 100) / 100;
            const opDate = document.getElementById('qf_operation_date')?.value || null;
            const refNum = document.getElementById('qf_reference_number')?.value?.trim() || null;
            const finAccRaw = document.getElementById('qf_financial_account_id')?.value || '';
            const financial_account_id = finAccRaw ? parseInt(finAccRaw, 10) : null;

            const isEditing = Boolean(editId);
            const url = isEditing ? `${API_BASE}/financial/partners/withdrawals/${editId}` : `${API_BASE}/financial/partners/withdrawals`;
            const method = isEditing ? 'PUT' : 'POST';

            const payload = {
                partner_name,
                movement_type,
                concept,
                amount_usd,
                amount_bs: exact_amount_bs,
                payment_method,
                financial_account_id,
                exchange_rate: liveRate,
                reference_number: refNum,
                notes: `Registrado vía Carga Rápida. Proveedor/Destino: ${vendor}`
            };
            if (opDate) {
                payload.withdrawal_date = opDate;
            }

            const res = await authFetch(url, {

                method,

                headers: { 'Content-Type': 'application/json' },

                body: JSON.stringify(payload)

            });



            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.detail || 'Error al registrar retiro.');
            }

            const movLabels = {
                prestamo_socio: 'Préstamo de socio',
                aporte_capital: 'Aporte de capital',
                devolucion_prestamo: 'Devolución de préstamo',
                retiro: 'Retiro de socio'
            };
            const movLabel = movLabels[movement_type] || 'Movimiento de socio';
            alert(`✅ ${movLabel} ${isEditing ? 'actualizado' : 'registrado'} por $${amount_usd.toLocaleString()} (Bs. ${exact_amount_bs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}) con éxito para ${partner_name}.`);

        } else if (selected_type === 'sede') {

            // Registrar como Gasto Fijo de Sede

            const fixedCat = document.getElementById('qf_fixed_category').value;

            const category_id = (allCategories[0] && allCategories[0].id) || 1;

            const res = await authFetch(`${API_BASE}/expenses/manual`, {

                method: 'POST',

                headers: { 'Content-Type': 'application/json' },

                body: JSON.stringify({

                    category_id: category_id,

                    project_id: null,

                    amount_usd: amount_usd,

                    amount_bs: amount_usd * EXCHANGE_RATE,

                    exchange_rate: EXCHANGE_RATE,

                    payment_method: payment_method,

                    supplier_vendor: vendor,

                    description: `[SEDE / TALLER] ${description} (${fixedCat})`,

                    reported_by_id: (allPersonnel[0] && allPersonnel[0].id) || 1

                })

            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.detail || 'Error al registrar gasto de sede.');
            }

            alert(`✅ Gasto Fijo de Sede de $${amount_usd.toLocaleString()} registrado con éxito.`);

        } else {

            // Registrar como Costo Directo de Obra

            const project_id = parseInt(document.getElementById('qf_project_id').value);

            const costCat = document.getElementById('qf_cost_category').value;

            const category_id = (allCategories[0] && allCategories[0].id) || 1;

            const res = await authFetch(`${API_BASE}/expenses/manual`, {

                method: 'POST',

                headers: { 'Content-Type': 'application/json' },

                body: JSON.stringify({

                    category_id: category_id,

                    project_id: project_id,

                    amount_usd: amount_usd,

                    amount_bs: amount_usd * EXCHANGE_RATE,

                    exchange_rate: EXCHANGE_RATE,

                    payment_method: payment_method,

                    supplier_vendor: vendor,

                    description: `[COSTO OBRA - ${costCat.toUpperCase()}] ${description}`,

                    reported_by_id: (allPersonnel[0] && allPersonnel[0].id) || 1

                })

            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.detail || 'Error al registrar costo de obra.');
            }

            alert(`✅ Costo de Obra de $${amount_usd.toLocaleString()} imputado exitosamente al proyecto.`);

        }



        closeModal('modalQuickFlow');

        

        // Recargar vistas activas
        if (typeof loadInitialMasterData === 'function') loadInitialMasterData();
        if (typeof loadExecutiveDashboard === 'function') loadExecutiveDashboard();
        if (typeof loadPartnersWithdrawalsList === 'function') loadPartnersWithdrawalsList();
        if (typeof window.loadPartnersWithdrawalsList === 'function') window.loadPartnersWithdrawalsList();



    } catch (e) {

        alert('Error al procesar la carga rápida: ' + e.message);

    }

}



let allPartnersWithdrawalsList = [];
let partnersCurrentPage = 1;
let partnersPageSize = 10;
let partnersSelectedPartnerFilter = '';
let partnersSearchQuery = '';

async function loadPartnersWithdrawalsList() {
    const tbody = document.getElementById('partnersWithdrawalsTableBody');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #94a3b8; padding: 16px;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando cuenta corriente de socios...</td></tr>`;

    try {
        const token = window.authToken || localStorage.getItem('dalor_token') || null;
        const res = await authFetch(`${API_BASE}/financial/partners/withdrawals`, { headers: token ? { 'Authorization': `Bearer ${token}` } : {} });
        const list = await res.json();
        allPartnersWithdrawalsList = Array.isArray(list) ? list : (list.items || []);

        populatePartnersFilterDropdown();
        renderPartnersWithdrawalsPaginated();
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #e11d48; padding: 16px;">Error al cargar cuenta corriente de socios.</td></tr>`;
    }
}

function populatePartnersFilterDropdown() {
    const select = document.getElementById("partners_filter_partner");
    if (!select) return;
    const partners = [...new Set(allPartnersWithdrawalsList.map(w => (w.partner_name || '').trim()).filter(Boolean))].sort();
    
    let html = `<option value="">Todos los Socios (${partners.length})</option>`;
    partners.forEach(p => {
        const sel = (partnersSelectedPartnerFilter === p) ? 'selected' : '';
        html += `<option value="${p}" ${sel}>${p}</option>`;
    });
    select.innerHTML = html;
}

function filterPartnersWithdrawals() {
    const select = document.getElementById("partners_filter_partner");
    partnersSelectedPartnerFilter = select?.value || '';
    const searchInput = document.getElementById("partners_search_input");
    partnersSearchQuery = (searchInput?.value || '').trim().toLowerCase();
    partnersCurrentPage = 1;
    renderPartnersWithdrawalsPaginated();
}

function selectPartnerSummaryCard(partnerName) {
    const select = document.getElementById("partners_filter_partner");
    if (select) {
        if (partnersSelectedPartnerFilter === partnerName) {
            select.value = '';
            partnersSelectedPartnerFilter = '';
        } else {
            select.value = partnerName;
            partnersSelectedPartnerFilter = partnerName;
        }
        filterPartnersWithdrawals();
    }
}

function renderPartnersWithdrawalsPaginated() {
    const tbody = document.getElementById('partnersWithdrawalsTableBody');
    if (!tbody) return;

    const list = allPartnersWithdrawalsList || [];

    // Calcular KPIs Totales Globales
    const totalUsdAll = list.reduce((sum, w) => sum + Number(w.amount_usd || 0), 0);
    const totalBsAll = list.reduce((sum, w) => sum + Number(w.amount_bs || 0), 0);
    // Tasa del día en vivo (BCV_DATA) — no depende de registros históricos antiguos
    const liveBcvRate = window.BCV_DATA?.rate || (typeof EXCHANGE_RATE !== 'undefined' ? EXCHANGE_RATE : 857.01);

    const kpiUsd = document.getElementById("kpi_partners_total_usd");
    const kpiBs = document.getElementById("kpi_partners_total_bs");
    const kpiCount = document.getElementById("kpi_partners_count");
    const kpiBcv = document.getElementById("kpi_partners_bcv_rate");

    if (kpiUsd) kpiUsd.innerText = `$${totalUsdAll.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (kpiBs) kpiBs.innerText = `Bs. ${totalBsAll.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (kpiCount) kpiCount.innerText = `${list.length}`;
    if (kpiBcv) kpiBcv.innerText = `${Number(liveBcvRate).toFixed(2)} Bs/$`;


    // 2. Tarjetas de Cuenta Corriente por Socio (#partnersSummaryCards)
    const cardsContainer = document.getElementById("partnersSummaryCards");
    if (cardsContainer) {
        const partnerGroups = {};
        list.forEach(w => {
            const name = (w.partner_name || 'Sin Asignar').trim();
            if (!partnerGroups[name]) {
                partnerGroups[name] = {
                    capital_usd: 0,
                    loans_usd: 0,
                    repayments_usd: 0,
                    withdrawals_usd: 0,
                    total_bs: 0,
                    count: 0
                };
            }
            const mt = (w.movement_type || 'retiro').toLowerCase();
            const amt = Number(w.amount_usd || 0);
            if (mt === 'aporte_capital') partnerGroups[name].capital_usd += amt;
            else if (mt === 'prestamo_socio') partnerGroups[name].loans_usd += amt;
            else if (mt === 'devolucion_prestamo') partnerGroups[name].repayments_usd += amt;
            else partnerGroups[name].withdrawals_usd += amt;
            partnerGroups[name].total_bs += Number(w.amount_bs || 0);
            partnerGroups[name].count += 1;
        });

        const sortedPartners = Object.keys(partnerGroups).sort((a, b) => {
            const totA = partnerGroups[a].withdrawals_usd + partnerGroups[a].loans_usd + partnerGroups[a].capital_usd;
            const totB = partnerGroups[b].withdrawals_usd + partnerGroups[b].loans_usd + partnerGroups[b].capital_usd;
            return totB - totA;
        });

        if (sortedPartners.length === 0) {
            cardsContainer.innerHTML = `<div class="card" style="text-align: center; color: #94a3b8; padding: 12px; font-size: 11px;">No hay registros para resumir.</div>`;
        } else {
            cardsContainer.innerHTML = sortedPartners.map(pName => {
                const grp = partnerGroups[pName];
                const netLoan = Math.round((grp.loans_usd - grp.repayments_usd) * 100) / 100;
                const isSelected = (partnersSelectedPartnerFilter.toLowerCase() === pName.toLowerCase());
                const fmt = (n) => `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                return `
                    <div onclick="selectPartnerSummaryCard('${pName.replace(/'/g, "\\'")}')" class="card" style="margin-bottom: 0; cursor: pointer; border-left: 4px solid ${isSelected ? '#059669' : '#7c3aed'}; padding: 10px 12px; background: ${isSelected ? '#f0fdf4' : '#ffffff'}; transition: all 0.2s;" title="Clic para filtrar por ${pName}">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
                            <span style="font-weight: 800; color: #1e293b; font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 155px;">
                                <i class="fa-solid fa-user-tie" style="color: ${isSelected ? '#059669' : '#7c3aed'};"></i> ${pName}
                            </span>
                            <span style="background: ${isSelected ? '#dcfce7' : '#ede9fe'}; color: ${isSelected ? '#166534' : '#7c3aed'}; font-size: 10px; font-weight: 800; padding: 1px 6px; border-radius: 10px;">
                                ${grp.count} mov.
                            </span>
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 10.5px;">
                            <div><span style="color:#64748b;">Retiros:</span> <b style="color:#7c3aed;">${fmt(grp.withdrawals_usd)}</b></div>
                            <div><span style="color:#64748b;">Capital:</span> <b style="color:#0284c7;">${fmt(grp.capital_usd)}</b></div>
                            <div style="grid-column: span 2; margin-top: 2px; padding-top: 4px; border-top: 1px dashed #e2e8f0; display:flex; justify-content:space-between;">
                                <span style="color:#475569; font-weight:700;">CxP Préstamo Socio:</span>
                                <b style="color:${netLoan > 0 ? '#059669' : '#475569'};">${fmt(netLoan)}</b>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }

    // 3. Filtrar listado para la tabla
    let filtered = list;
    if (partnersSelectedPartnerFilter) {
        filtered = filtered.filter(w => (w.partner_name || '').trim().toLowerCase() === partnersSelectedPartnerFilter.toLowerCase());
    }
    if (partnersSearchQuery) {
        filtered = filtered.filter(w => 
            (w.concept || '').toLowerCase().includes(partnersSearchQuery) ||
            (w.reference_number || '').toLowerCase().includes(partnersSearchQuery) ||
            (w.partner_name || '').toLowerCase().includes(partnersSearchQuery)
        );
    }

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #94a3b8; padding: 16px;">No se encontraron retiros con los filtros seleccionados.</td></tr>`;
        const pCont = document.getElementById("partnersPaginationContainer");
        if (pCont) pCont.innerHTML = '';
        return;
    }

    const { startIndex, endIndex, currentPage } = (typeof window.renderPaginationControls === 'function' ? window.renderPaginationControls : renderPaginationControls)({
        containerId: "partnersPaginationContainer",
        totalItems: filtered.length,
        currentPage: partnersCurrentPage,
        pageSize: partnersPageSize,
        onPageChange: "goToPartnersPage",
        onPageSizeChange: "changePartnersPageSize",
        itemLabel: "retiro(s) de socio"
    });
    partnersCurrentPage = currentPage;

    const _fmtDateTime = (w) => {
        const raw = w.date || w.withdrawal_date || w.created_at || '';
        if (!raw) return '-';
        const m = String(raw).match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
        if (m) return `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}`;
        const dOnly = String(raw).match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (dOnly) return `${dOnly[3]}/${dOnly[2]}/${dOnly[1]} 00:00`;
        return raw;
    };

    const _movBadge = (mt) => {
        if (mt === 'prestamo_socio') return '<span style="background:#dcfce7; color:#166534; padding:1px 6px; border-radius:4px; font-size:9.5px; font-weight:800;">+ Préstamo Socio</span>';
        if (mt === 'aporte_capital') return '<span style="background:#dbeafe; color:#1d4ed8; padding:1px 6px; border-radius:4px; font-size:9.5px; font-weight:800;">+ Aporte Capital</span>';
        if (mt === 'devolucion_prestamo') return '<span style="background:#fef3c7; color:#92400e; padding:1px 6px; border-radius:4px; font-size:9.5px; font-weight:800;">- Devolución Préstamo</span>';
        return '<span style="background:#f3e8ff; color:#6b21a8; padding:1px 6px; border-radius:4px; font-size:9.5px; font-weight:800;">- Retiro Utilidades</span>';
    };

    const pageItems = filtered.slice(startIndex, endIndex);
    tbody.innerHTML = pageItems.map(w => {
        const mt = (w.movement_type || 'retiro').toLowerCase();
        const isInflow = mt === 'prestamo_socio' || mt === 'aporte_capital';
        const sign = isInflow ? '+' : '-';
        const amtColor = isInflow ? '#059669' : '#7c3aed';
        return `
        <tr>
            <td style="font-weight: 700; color: #64748b; font-size: 11px; white-space: nowrap;">${_fmtDateTime(w)}</td>
            <td style="font-weight: 800; color: #7c3aed;">${w.partner_name}<div style="margin-top:2px;">${_movBadge(mt)}</div></td>
            <td style="font-weight: 600;">${w.concept}</td>
            <td><span style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 11px; text-transform: uppercase;">${w.payment_method}</span></td>
            <td style="color: #64748b; font-size: 11px;">${w.reference_number || '-'}</td>
            <td style="font-weight: 900; color: ${amtColor}; font-size: 13px;">${sign}$${Number(w.amount_usd || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
            <td style="color: #475569; font-weight: 700;">
                Bs. ${Number(w.amount_bs || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                <div style="font-size: 10px; color: #64748b; font-weight: 600;">Tasa: ${Number(w.exchange_rate || liveBcvRate).toFixed(2)}</div>
            </td>
            <td style="text-align: center; white-space: nowrap;">
                <button type="button" onclick="openEditPartnerWithdrawalModal(${w.id})" class="btn-secondary" style="padding: 2px 7px; font-size: 11px; color: #0284c7; border-color: #bae6fd; margin-right: 4px;" title="Editar movimiento">
                    <i class="fa-solid fa-pen"></i> Editar
                </button>
                <button type="button" onclick="confirmDeletePartnerWithdrawal(${w.id}, '${(w.partner_name || '').replace(/'/g, "\\'")}', ${w.amount_usd})" class="btn-secondary" style="padding: 2px 7px; font-size: 11px; color: #dc2626; border-color: #fca5a5;" title="Anular movimiento">
                    <i class="fa-solid fa-trash-can"></i> Anular
                </button>
            </td>
        </tr>
    `;
    }).join('');
}

function goToPartnersPage(page) {
    partnersCurrentPage = page;
    renderPartnersWithdrawalsPaginated();
    const c = document.getElementById("partnersWithdrawalsTableBody");
    if (c) c.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function changePartnersPageSize(size) {
    partnersPageSize = parseInt(size) || 15;
    partnersCurrentPage = 1;
    renderPartnersWithdrawalsPaginated();
}

async function confirmDeletePartnerWithdrawal(id, partnerName, amountUsd) {
    if (!confirm(`¿Está seguro de anular el retiro #${id} de "${partnerName}" por $${amountUsd}? Esta acción eliminará el registro y restaurará el saldo en tesorería.`)) {
        return;
    }

    try {
        const token = window.authToken || localStorage.getItem('dalor_token') || null;
        const res = await authFetch(`${API_BASE}/financial/partners/withdrawals/${id}`, {
            method: 'DELETE',
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });

        if (!res.ok) {
            let err = `HTTP ${res.status}`;
            try { const d = await res.json(); err = d.detail || err; } catch(_) {}
            throw new Error(err);
        }

        if (typeof showToastNotification === 'function') {
            showToastNotification(`✅ Retiro #${id} anulado correctamente.`, 'success');
        } else {
            alert(`✅ Retiro #${id} anulado correctamente.`);
        }
        await loadPartnersWithdrawalsList();
        await loadTreasurySummary();
    } catch (e) {
        alert("Error al anular retiro: " + e.message);
    }
}



function openNewPartnerWithdrawalModal() {

    openQuickFlowModal();

    selectQuickType('socio');

    const mtEl = document.getElementById('qf_partner_movement_type');
    if (mtEl) mtEl.value = 'retiro';

}

function openEditPartnerWithdrawalModal(id) {
    const w = (allPartnersWithdrawalsList || []).find(item => Number(item.id) === Number(id));
    if (!w) {
        alert('No se encontró el retiro seleccionado.');
        return;
    }

    openQuickFlowModal();
    selectQuickType('socio');

    const editIdEl = document.getElementById('qf_edit_withdrawal_id');
    const usdEl = document.getElementById('qf_amount_usd');
    const bsEl = document.getElementById('qf_amount_bs');
    const rateEl = document.getElementById('qf_exchange_rate');
    const dateEl = document.getElementById('qf_operation_date');
    const partnerEl = document.getElementById('qf_partner_name');
    const conceptEl = document.getElementById('qf_partner_concept');
    const methodEl = document.getElementById('qf_payment_method');
    const refEl = document.getElementById('qf_reference_number');
    const descEl = document.getElementById('qf_description');

    if (editIdEl) editIdEl.value = String(w.id);
    if (rateEl) rateEl.value = Number(w.exchange_rate || _getLiveQuickBcvRate()).toFixed(2);
    if (usdEl) usdEl.value = Number(w.amount_usd || 0).toFixed(2);
    if (bsEl) bsEl.value = Number(w.amount_bs || 0).toFixed(2);

    const rawDt = w.withdrawal_date || w.date || '';
    const mDt = String(rawDt).match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/);
    if (dateEl && mDt) {
        dateEl.value = `${mDt[1]}T${mDt[2]}`;
    }

    if (partnerEl) partnerEl.value = w.partner_name || '';
    const mtEl = document.getElementById('qf_partner_movement_type');
    if (mtEl) mtEl.value = (w.movement_type || 'retiro').toLowerCase();
    if (conceptEl) conceptEl.value = w.concept || '';
    if (methodEl && w.payment_method) methodEl.value = w.payment_method;
    if (refEl) refEl.value = w.reference_number || '';
    if (descEl) descEl.value = w.concept || 'Retiro de socio';
}







// Auto-window binding & ES6 exports
if (typeof window !== 'undefined') {
    window.openQuickFlowModal = openQuickFlowModal;
    window.selectQuickType = selectQuickType;
    window.calcQuickBs = calcQuickBs;
    window.submitQuickFlow = submitQuickFlow;
    window.loadPartnersWithdrawalsList = loadPartnersWithdrawalsList;
    window.populatePartnersFilterDropdown = populatePartnersFilterDropdown;
    window.filterPartnersWithdrawals = filterPartnersWithdrawals;
    window.selectPartnerSummaryCard = selectPartnerSummaryCard;
    window.renderPartnersWithdrawalsPaginated = renderPartnersWithdrawalsPaginated;
    window.goToPartnersPage = goToPartnersPage;
    window.changePartnersPageSize = changePartnersPageSize;
    window.confirmDeletePartnerWithdrawal = confirmDeletePartnerWithdrawal;
    window.openNewPartnerWithdrawalModal = openNewPartnerWithdrawalModal;
    window.openEditPartnerWithdrawalModal = openEditPartnerWithdrawalModal;
    window.calcQuickUsd = calcQuickUsd;
}

export { openQuickFlowModal };
export { selectQuickType };
export { calcQuickBs };
export { calcQuickUsd };
export { submitQuickFlow };
export { loadPartnersWithdrawalsList };
export { populatePartnersFilterDropdown };
export { filterPartnersWithdrawals };
export { selectPartnerSummaryCard };
export { openEditPartnerWithdrawalModal };
export { renderPartnersWithdrawalsPaginated };
export { goToPartnersPage };
export { changePartnersPageSize };
export { confirmDeletePartnerWithdrawal };
export { openNewPartnerWithdrawalModal };
