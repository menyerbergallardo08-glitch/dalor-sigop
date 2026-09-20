/**
 * DALOR SIGO-P | Módulo: RENTALS.JS
 * Módulo de Alquileres & Préstamos de Equipos, Maquinarias y Herramientas (Bidireccional)
 */

var API_BASE = window.API_BASE || (window.location.origin + "/api/v1");
var allRentals = window.allRentals = window.allRentals || [];
var currentRentalsFilter = 'all';

// --- CARGA Y RENDERIZADO DE ALQUILERES & PRÉSTAMOS ---
async function loadRentalsList() {
    const tbody = document.getElementById("rentalsTableBody");
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 25px; color: #94a3b8;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando control de alquileres y préstamos...</td></tr>`;

    try {
        const token = window.authToken || localStorage.getItem('dalor_token') || null;
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        const res = await fetch(`${API_BASE}/rentals/`, { headers });
        if (!res.ok) throw new Error("Error en la respuesta del servidor");

        allRentals = window.allRentals = await res.json();
        renderRentalsTable(allRentals);
        updateRentalsKPIs(allRentals);
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 20px; color: #e11d48; font-weight: 600;">Error al cargar registros: ${e.message}</td></tr>`;
    }
}

function updateRentalsKPIs(items) {
    const kpiSalidas = document.getElementById("kpi_rentals_salidas_count");
    const kpiEntradas = document.getElementById("kpi_rentals_entradas_count");
    const kpiTarifa = document.getElementById("kpi_rentals_daily_rate_usd");
    const badgeCount = document.getElementById("rentals_count_badge");

    const activasSalidas = items.filter(r => r.direction === 'dalor_a_tercero' && r.status === 'activo');
    const activasEntradas = items.filter(r => r.direction === 'tercero_a_dalor' && r.status === 'activo');
    
    let totalTarifaDia = 0;
    items.filter(r => r.status === 'activo' && r.operation_type === 'alquiler').forEach(r => {
        if (r.rate_period === 'dia') totalTarifaDia += (r.rate_usd || 0);
        else if (r.rate_period === 'semana') totalTarifaDia += (r.rate_usd || 0) / 7;
        else if (r.rate_period === 'mes') totalTarifaDia += (r.rate_usd || 0) / 30;
    });

    if (kpiSalidas) kpiSalidas.innerText = activasSalidas.length;
    if (kpiEntradas) kpiEntradas.innerText = activasEntradas.length;
    if (kpiTarifa) kpiTarifa.innerText = `$${totalTarifaDia.toFixed(2)}/día`;
    if (badgeCount) badgeCount.innerText = `${items.length} Registros`;
}

function filterRentalsByDirection(dir) {
    currentRentalsFilter = dir;
    document.querySelectorAll(".rental-filter-btn").forEach(b => {
        b.classList.remove("btn-primary");
        b.classList.add("btn-secondary");
    });
    const activeBtn = document.getElementById(`btn_rentfilter_${dir}`);
    if (activeBtn) {
        activeBtn.classList.remove("btn-secondary");
        activeBtn.classList.add("btn-primary");
    }

    if (dir === 'all') {
        renderRentalsTable(allRentals);
    } else if (dir === 'activos') {
        renderRentalsTable(allRentals.filter(r => r.status === 'activo'));
    } else {
        renderRentalsTable(allRentals.filter(r => r.direction === dir));
    }
}

function searchRentals(query) {
    const q = (query || '').toLowerCase().trim();
    if (!q) {
        filterRentalsByDirection(currentRentalsFilter);
        return;
    }
    const filtered = allRentals.filter(r => 
        r.operation_code.toLowerCase().includes(q) ||
        r.equipment_name.toLowerCase().includes(q) ||
        r.external_entity.toLowerCase().includes(q) ||
        (r.contact_person && r.contact_person.toLowerCase().includes(q))
    );
    renderRentalsTable(filtered);
}

function renderRentalsTable(items) {
    const tbody = document.getElementById("rentalsTableBody");
    if (!tbody) return;

    if (!items || items.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 35px; color: #64748b;">
            <i class="fa-solid fa-handshake" style="font-size: 32px; color: #cbd5e1; margin-bottom: 8px; display: block;"></i>
            <span style="font-size: 13px; font-weight: 700;">No hay préstamos ni alquileres registrados con este filtro.</span><br>
            <span style="font-size: 11px; color: #94a3b8;">Usa el botón "+ Registrar Préstamo / Alquiler" para registrar salidas o entradas de equipos.</span>
        </td></tr>`;
        return;
    }

    tbody.innerHTML = items.map(r => {
        // Dirección Badge
        const isSalida = r.direction === 'dalor_a_tercero';
        const dirBadge = isSalida 
            ? `<span style="background: #e0f2fe; color: #0369a1; font-weight: 800; font-size: 10.5px; padding: 3px 8px; border-radius: 6px; display: inline-flex; align-items: center; gap: 4px;"><i class="fa-solid fa-arrow-up-right-from-square"></i> DALOR ➔ Tercero</span>`
            : `<span style="background: #fef3c7; color: #92400e; font-weight: 800; font-size: 10.5px; padding: 3px 8px; border-radius: 6px; display: inline-flex; align-items: center; gap: 4px;"><i class="fa-solid fa-arrow-down-left-and-up-right-to-center"></i> Tercero ➔ DALOR</span>`;

        // Tipo Badge
        const isAlquiler = r.operation_type === 'alquiler';
        const tipoBadge = isAlquiler
            ? `<span style="font-weight: 700; color: #0284c7;"><i class="fa-solid fa-tag"></i> Alquiler ($${r.rate_usd.toFixed(2)}/${r.rate_period})</span>`
            : `<span style="font-weight: 700; color: #059669;"><i class="fa-solid fa-handshake-angle"></i> Préstamo (Sin Costo)</span>`;

        // Estado Badge
        let statusBadge = '';
        if (r.status === 'activo') {
            if (r.is_overdue) {
                statusBadge = `<span style="background: #fee2e2; color: #b91c1c; font-weight: 800; font-size: 10.5px; padding: 2px 7px; border-radius: 4px;"><i class="fa-solid fa-triangle-exclamation"></i> En Mora / Vencido</span>`;
            } else {
                statusBadge = `<span style="background: #dcfce7; color: #15803d; font-weight: 800; font-size: 10.5px; padding: 2px 7px; border-radius: 4px;"><i class="fa-solid fa-circle-check"></i> Activo en Custodia</span>`;
            }
        } else if (r.status === 'devuelto_conforme') {
            statusBadge = `<span style="background: #f1f5f9; color: #475569; font-weight: 700; font-size: 10.5px; padding: 2px 7px; border-radius: 4px;"><i class="fa-solid fa-check-double"></i> Devuelto Conforme</span>`;
        } else {
            statusBadge = `<span style="background: #ffedd5; color: #c2410c; font-weight: 700; font-size: 10.5px; padding: 2px 7px; border-radius: 4px;"><i class="fa-solid fa-note-sticky"></i> Devuelto c/ Novedad</span>`;
        }

        // Acciones
        let actionsHtml = '';
        if (r.status === 'activo') {
            actionsHtml += `<button type="button" onclick="openReturnRentalModal(${r.id}, '${r.equipment_name.replace(/'/g, "\'")}', '${r.direction}')" class="btn-primary" style="font-size: 11px; padding: 4px 8px; background: #059669; border-radius: 6px; font-weight: 700;" title="Registrar Retorno"><i class="fa-solid fa-rotate-left"></i> Retorno</button> `;
        }
        actionsHtml += `<button type="button" onclick="deleteRentalRecord(${r.id})" class="btn-secondary" style="font-size: 11px; padding: 4px 8px; color: #ef4444; border-color: #fecaca; border-radius: 6px;" title="Anular Registro"><i class="fa-solid fa-trash-can"></i></button>`;

        return `
            <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.15s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='white'">
                <td style="padding: 10px; font-weight: 800; color: var(--dalor-navy); font-size: 11.5px;">${r.operation_code}</td>
                <td style="padding: 10px;">${dirBadge}</td>
                <td style="padding: 10px; font-size: 11px;">${tipoBadge}</td>
                <td style="padding: 10px;">
                    <strong style="color: var(--dalor-blue); font-size: 12px;">${r.equipment_name}</strong>
                    ${r.equipment_code ? `<span style="display:block; font-size:10px; color:#64748b; font-weight:600;">Cód: ${r.equipment_code}</span>` : ''}
                </td>
                <td style="padding: 10px;">
                    <span style="font-weight: 700; color: #1e293b; font-size: 11.5px;">${r.external_entity}</span>
                    ${r.contact_person ? `<span style="display:block; font-size:10px; color:#64748b;">Resp: ${r.contact_person} ${r.contact_phone ? `(${r.contact_phone})` : ''}</span>` : ''}
                </td>
                <td style="padding: 10px; font-size: 11px;">
                    <span style="color: #475569; display: block;">Desde: <b>${r.start_date.split(' ')[0]}</b></span>
                    <span style="color: ${r.is_overdue ? '#b91c1c' : '#0369a1'}; font-weight: 700;">Hasta: ${r.expected_return_date}</span>
                </td>
                <td style="padding: 10px; font-size: 11px; color: #64748b;">
                    <i class="fa-solid fa-location-dot" style="color: #94a3b8;"></i> ${r.project_name}
                </td>
                <td style="padding: 10px; text-align: center;">${statusBadge}</td>
                <td style="padding: 10px; text-align: center; white-space: nowrap;">${actionsHtml}</td>
            </tr>
        `;
    }).join('');
}

// --- MODAL CREAR ALQUILER / PRÉSTAMO ---
function openCreateRentalModal() {
    const form = document.getElementById("rentalForm");
    if (form) form.reset();

    // Llenar activos propios de Dalor disponibles
    const selectAsset = document.getElementById("rental_asset_id");
    if (selectAsset) {
        const ownAssets = (window.allAssets || []).filter(a => a.is_active !== false);
        selectAsset.innerHTML = `<option value="">-- Seleccionar Equipo de la Flota DALOR --</option>` +
            ownAssets.map(a => `<option value="${a.id}" data-name="${a.name}" data-code="${a.asset_code}" data-rate="${a.rental_rate_usd || 0}">[${a.asset_code}] ${a.name} (${a.asset_type})</option>`).join('');
    }

    onRentalDirectionChanged();
    onRentalTypeChanged();
    window.openModal?.('modalRentalLoan');
}

function onRentalDirectionChanged() {
    const dir = document.querySelector('input[name="rental_direction"]:checked')?.value || 'dalor_a_tercero';
    const boxOwn = document.getElementById("box_rental_own_asset");
    const boxExt = document.getElementById("box_rental_external_asset");
    const lblEntity = document.getElementById("lbl_rental_external_entity");
    const hintDir = document.getElementById("rental_dir_hint");

    if (dir === 'dalor_a_tercero') {
        if (boxOwn) boxOwn.classList.remove("hidden");
        if (boxExt) boxExt.classList.add("hidden");
        if (lblEntity) lblEntity.innerText = "Cliente / Subcontratista / Destinatario *";
        if (hintDir) hintDir.innerHTML = `<i class="fa-solid fa-arrow-up-right-from-square" style="color: #0284c7;"></i> DALOR entrega un equipo propio en calidad de préstamo o renta a un tercero.`;
    } else {
        if (boxOwn) boxOwn.classList.add("hidden");
        if (boxExt) boxExt.classList.remove("hidden");
        if (lblEntity) lblEntity.innerText = "Proveedor / Empresa Dueña del Equipo *";
        if (hintDir) hintDir.innerHTML = `<i class="fa-solid fa-arrow-down-left-and-up-right-to-center" style="color: #d97706;"></i> Un proveedor o aliado presta o alquila una máquina/herramienta a DALOR.`;
    }
}

function onRentalAssetSelected() {
    const sel = document.getElementById("rental_asset_id");
    const opt = sel ? sel.options[sel.selectedIndex] : null;
    if (opt && opt.value) {
        const rate = parseFloat(opt.getAttribute("data-rate") || 0);
        const rateInp = document.getElementById("rental_rate_usd");
        if (rateInp && rate > 0) rateInp.value = rate;
    }
}

function onRentalTypeChanged() {
    const type = document.querySelector('input[name="rental_op_type"]:checked')?.value || 'alquiler';
    const boxTarifa = document.getElementById("box_rental_rate");
    if (type === 'alquiler') {
        if (boxTarifa) boxTarifa.style.display = 'grid';
    } else {
        if (boxTarifa) boxTarifa.style.display = 'none';
        const rInp = document.getElementById("rental_rate_usd");
        if (rInp) rInp.value = "0.00";
    }
}

async function submitCreateRental(event) {
    if (event && event.preventDefault) event.preventDefault();

    const dir = document.querySelector('input[name="rental_direction"]:checked')?.value || 'dalor_a_tercero';
    const opType = document.querySelector('input[name="rental_op_type"]:checked')?.value || 'alquiler';
    const assetIdVal = document.getElementById("rental_asset_id")?.value;
    const assetId = (dir === 'dalor_a_tercero' && assetIdVal) ? parseInt(assetIdVal) : null;

    let eqName = "";
    let eqCode = "";
    if (dir === 'dalor_a_tercero') {
        const sel = document.getElementById("rental_asset_id");
        const opt = sel ? sel.options[sel.selectedIndex] : null;
        if (opt && opt.value) {
            eqName = opt.getAttribute("data-name") || opt.text;
            eqCode = opt.getAttribute("data-code") || "";
        } else {
            eqName = document.getElementById("rental_custom_name")?.value?.trim() || "Equipo DALOR";
        }
    } else {
        eqName = document.getElementById("rental_external_equip_name")?.value?.trim() || "";
        eqCode = document.getElementById("rental_external_equip_code")?.value?.trim() || "";
        if (!eqName) {
            alert("Por favor indica el nombre o descripción del equipo recibido.");
            return;
        }
    }

    const entityName = document.getElementById("rental_external_entity")?.value?.trim();
    if (!entityName) {
        alert("Por favor indica la entidad externa (Cliente o Proveedor).");
        return;
    }

    const payload = {
        direction: dir,
        operation_type: opType,
        asset_id: assetId,
        equipment_name: eqName,
        equipment_code: eqCode,
        external_entity: entityName,
        contact_person: document.getElementById("rental_contact_person")?.value?.trim() || null,
        contact_phone: document.getElementById("rental_contact_phone")?.value?.trim() || null,
        project_id: document.getElementById("rental_project_id")?.value ? parseInt(document.getElementById("rental_project_id").value) : null,
        expected_return_date: document.getElementById("rental_expected_return")?.value ? new Date(document.getElementById("rental_expected_return").value).toISOString() : null,
        rate_usd: parseFloat(document.getElementById("rental_rate_usd")?.value || 0) || 0.0,
        rate_period: document.getElementById("rental_rate_period")?.value || "dia",
        notes: document.getElementById("rental_notes")?.value || ""
    };

    try {
        const token = window.authToken || localStorage.getItem('dalor_token') || null;
        const res = await fetch(`${API_BASE}/rentals/`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Error al guardar");

        window.closeModal?.('modalRentalLoan');
        loadRentalsList();
        if (typeof window.loadAssets === 'function') window.loadAssets();
        alert(data.message || "Registro guardado exitosamente.");
    } catch (e) {
        alert("Error al registrar: " + e.message);
    }
}

// --- DEVOLUCIÓN ---
function openReturnRentalModal(rentalId, equipName, direction) {
    const idInput = document.getElementById("ret_rental_id");
    if (idInput) idInput.value = rentalId;
    const titleEl = document.getElementById("ret_equip_title");
    if (titleEl) titleEl.innerText = `${equipName} (${direction === 'dalor_a_tercero' ? 'Retorno de Cliente a DALOR' : 'Devolución de DALOR al Proveedor'})`;
    
    const retDate = document.getElementById("ret_return_date");
    if (retDate) retDate.value = new Date().toISOString().split('T')[0];

    window.openModal?.('modalRentalReturn');
}

async function submitRentalReturn(event) {
    if (event && event.preventDefault) event.preventDefault();
    const rentalId = document.getElementById("ret_rental_id")?.value;
    if (!rentalId) return;

    const payload = {
        return_date: document.getElementById("ret_return_date")?.value ? new Date(document.getElementById("ret_return_date").value).toISOString() : new Date().toISOString(),
        condition_status: document.getElementById("ret_condition_status")?.value || "devuelto_conforme",
        return_notes: document.getElementById("ret_notes")?.value || ""
    };

    try {
        const token = window.authToken || localStorage.getItem('dalor_token') || null;
        const res = await fetch(`${API_BASE}/rentals/${rentalId}/return`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Error al registrar retorno");

        window.closeModal?.('modalRentalReturn');
        loadRentalsList();
        if (typeof window.loadAssets === 'function') window.loadAssets();
        alert(data.message || "Devolución registrada exitosamente.");
    } catch (e) {
        alert("Error: " + e.message);
    }
}

async function deleteRentalRecord(rentalId) {
    if (!confirm("¿Estás seguro de anular este registro de préstamo o alquiler?")) return;
    try {
        const token = window.authToken || localStorage.getItem('dalor_token') || null;
        const res = await fetch(`${API_BASE}/rentals/${rentalId}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Error al eliminar");
        loadRentalsList();
        if (typeof window.loadAssets === 'function') window.loadAssets();
    } catch (e) {
        alert("Error al anular: " + e.message);
    }
}

function openRentalsSubtab() {
    switchView('resources', 'recursos');
    if (typeof window.switchResourceSubtab === 'function') {
        window.switchResourceSubtab('rentals');
    }
}

// Exportar al scope global
if (typeof window !== 'undefined') {
    window.loadRentalsList = loadRentalsList;
    window.openCreateRentalModal = openCreateRentalModal;
    window.onRentalDirectionChanged = onRentalDirectionChanged;
    window.onRentalAssetSelected = onRentalAssetSelected;
    window.onRentalTypeChanged = onRentalTypeChanged;
    window.submitCreateRental = submitCreateRental;
    window.openReturnRentalModal = openReturnRentalModal;
    window.submitRentalReturn = submitRentalReturn;
    window.deleteRentalRecord = deleteRentalRecord;
    window.filterRentalsByDirection = filterRentalsByDirection;
    window.searchRentals = searchRentals;
    window.openRentalsSubtab = openRentalsSubtab;
}

export { 
    loadRentalsList, openCreateRentalModal, onRentalDirectionChanged, 
    onRentalAssetSelected, onRentalTypeChanged, submitCreateRental, 
    openReturnRentalModal, submitRentalReturn, deleteRentalRecord, 
    filterRentalsByDirection, searchRentals, openRentalsSubtab 
};
