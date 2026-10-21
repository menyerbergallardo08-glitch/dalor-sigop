/**
 * DALOR SIGO-P | Módulo de Mantenimiento Desacoplado
 */
var API_BASE = window.API_BASE || (window.location.origin + "/api/v1");

function authFetch(url, options = {}) {
    var _t = sessionStorage.getItem('dalor_token') || localStorage.getItem('dalor_token') || window.authToken || '';
    var _h = Object.assign({}, options.headers || {});
    if (_t) _h['Authorization'] = 'Bearer ' + _t;
    if (options.body && !(options.body instanceof FormData) && !_h['Content-Type']) {
        _h['Content-Type'] = 'application/json';
    }
    if (options.body instanceof FormData) {
        delete _h['Content-Type'];
    }
    return window.fetch(url, Object.assign({}, options, { headers: _h }));
}

// --- BLOQUE L10370-L10941 ---
// ==============================================================================
// 📊 16. DASHBOARD GERENCIAL BI CON MAPA DE VENEZUELA Y POWERBI DARK NAVY
// ==============================================================================

let biSummaryData = null;
let biRawProjects = [];
let chartBiMonthlyRev = null;
let chartBiService = null;
let chartBiClients = null;
let chartBiStatus = null;
let chartBiMethods = null;
let biCurrentFilter = { region: 'all', year: '2026', client: 'all' };

// --- Leaflet GIS Map Variables & Config ---
let executiveMap = null;
let executiveMapMarkersLayer = null;
let executiveMapBaseLayers = {};
let currentMapLayerName = 'streets';

const VENEZUELA_BOUNDS = [
    [0.7, -73.4], // Suroeste (Amazonas / Apure / Táchira / Zulia)
    [12.4, -59.8]  // Noreste (Falcón / Nueva Esparta / Sucre / Delta Amacuro)
];

const REGION_COORDINATES = {
    all: null,
    carabobo: { center: [10.2280, -67.8770], zoom: 10 },
    miranda: { center: [10.4700, -66.7500], zoom: 10 },
    aragua: { center: [10.2200, -67.5000], zoom: 10 },
    oriente: { center: [10.1300, -64.6800], zoom: 8 },
    zulia_falcon: { center: [11.0000, -70.5000], zoom: 8 },
    bolivar: { center: [8.1287, -63.5408], zoom: 8 },
    centro_occidente: { center: [10.0647, -69.3570], zoom: 9 }
};

async function loadExecutiveDashboard() {
    const pnlTbody = document.getElementById("executivePnlTableBody");
    if (pnlTbody) pnlTbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: #64748b; padding: 20px;"><i class="fa-solid fa-spinner fa-spin"></i> Consolidando analítica ejecutiva y mapa georreferenciado...</td></tr>`;

    try {
        let qParams = [];
        if (biCurrentFilter.year && biCurrentFilter.year !== 'all') qParams.push(`year=${encodeURIComponent(biCurrentFilter.year)}`);
        if (biCurrentFilter.client && biCurrentFilter.client !== 'all') qParams.push(`client_id=${encodeURIComponent(biCurrentFilter.client)}`);
        if (biCurrentFilter.region && biCurrentFilter.region !== 'all') qParams.push(`region=${encodeURIComponent(biCurrentFilter.region)}`);
        const qStr = qParams.length ? `?${qParams.join('&')}` : '';

        const [resMetrics, resClients] = await Promise.all([
            authFetch(`${API_BASE}/financial/bi-metrics${qStr}`),
            authFetch(`${API_BASE}/clients/`)
        ]);

        if (resClients.ok) {
            const clients = await resClients.json();
            populateBIClientSlicer(clients);
        }

        if (resMetrics.ok) {
            biSummaryData = await resMetrics.json();
            renderExecutiveDashboardContent(biSummaryData);
        } else {
            throw new Error(`HTTP ${resMetrics.status}`);
        }

    } catch (e) {
        console.error("Error al cargar BI:", e);
        if (pnlTbody) pnlTbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: #e11d48; padding: 20px;">Error al consolidar dashboard ejecutivo: ${e?.message || e}</td></tr>`;
    }
}

function populateBIClientSlicer(clientsList) {
    const cliSelect = document.getElementById('bi_slicer_client');
    if (!cliSelect) return;
    const cur = cliSelect.value;
    const list = Array.isArray(clientsList) ? clientsList : [];

    let opts = '<option value="all">Todos los Clientes</option>';
    list.forEach(c => {
        opts += `<option value="${c.id}">${c.name}</option>`;
    });
    cliSelect.innerHTML = opts;
    if (cur) cliSelect.value = cur;
}

function initOrUpdateExecutiveMap(projectsGeo = []) {
    const mapEl = document.getElementById('leafletVenezuelaMap');
    if (!mapEl) return;
    if (typeof L === 'undefined') {
        console.warn('Leaflet GIS library (L) is not loaded yet.');
        return;
    }

    if (!executiveMap) {
        executiveMap = L.map('leafletVenezuelaMap', {
            center: [7.5, -66.0],
            zoom: 5,
            minZoom: 4,
            maxZoom: 18,
            zoomControl: true,
            scrollWheelZoom: true
        });

        // Capa Vial (OpenStreetMap Oficial - 100% Gratuito y sin marcas de agua de API key)
        const streetsLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>',
            subdomains: ['a', 'b', 'c'],
            maxZoom: 19
        });

        // Capa Satélite (Esri World Imagery - Satélite real de alta resolución libre)
        const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Tiles &copy; Esri &mdash; Maxar, Earthstar Geographics',
            maxZoom: 18
        });

        executiveMapBaseLayers = {
            streets: streetsLayer,
            satellite: satelliteLayer
        };

        // Capa activa por defecto
        streetsLayer.addTo(executiveMap);

        // Capa de marcadores
        executiveMapMarkersLayer = L.layerGroup().addTo(executiveMap);
    }

    // Invalidar tamaño y ajustar a todo el país automáticamente
    setTimeout(() => {
        if (executiveMap) {
            executiveMap.invalidateSize();
            if (!biCurrentFilter.region || biCurrentFilter.region === 'all') {
                executiveMap.fitBounds(VENEZUELA_BOUNDS, { padding: [12, 12], maxZoom: 6 });
            }
        }
    }, 200);

    // Limpiar marcadores previos
    if (executiveMapMarkersLayer) {
        executiveMapMarkersLayer.clearLayers();
    }

    // 1. Marcador Sede Central Dalor (Guacara, Carabobo)
    const baseIcon = L.divIcon({
        className: 'custom-dalor-base-pin',
        html: `
            <div style="position: relative; width: 34px; height: 34px;">
                <div style="position: absolute; inset: -4px; border-radius: 50%; background: rgba(37, 99, 235, 0.35); animation: pulse 2s infinite;"></div>
                <div style="position: relative; width: 34px; height: 34px; background: #1d4ed8; border: 2.5px solid #ffffff; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #ffffff; box-shadow: 0 3px 8px rgba(0,0,0,0.35); font-size: 14px;">
                    <i class="fa-solid fa-industry"></i>
                </div>
            </div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
        popupAnchor: [0, -17]
    });

    const baseMarker = L.marker([10.2280, -67.8770], { icon: baseIcon, zIndexOffset: 1000 });
    baseMarker.bindPopup(`
        <div style="font-family: inherit; font-size: 12px; min-width: 220px; color: #0f172a; line-height: 1.4;">
            <div style="display: flex; align-items: center; gap: 6px; border-bottom: 2px solid #2563eb; padding-bottom: 4px; margin-bottom: 6px;">
                <i class="fa-solid fa-industry" style="color: #2563eb; font-size: 14px;"></i>
                <span style="font-weight: 800; color: #1e3a8a; font-size: 12.5px;">DALOR, C.A. - SEDE CENTRAL</span>
            </div>
            <p style="margin: 0 0 4px 0; color: #475569; font-size: 11px;">
                <strong>Ubicación:</strong> Guacara, Edo. Carabobo.<br>
                Centro de Operaciones Metalmecánicas y Logística Principal.
            </p>
            <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 4px 8px; font-size: 10.5px; color: #1d4ed8; font-weight: 700;">
                <i class="fa-solid fa-circle-check"></i> Base Operativa Principal
            </div>
        </div>
    `);
    executiveMapMarkersLayer.addLayer(baseMarker);

    // 2. Renderizar marcadores de proyectos georreferenciados
    const emptyOverlay = document.getElementById('biEmptyMapOverlay');
    let hasProjects = false;

    projectsGeo.forEach(p => {
        if (!p.lat || !p.lng) return;
        hasProjects = true;

        const isCulminated = (p.status || '').toLowerCase().includes('culminad') ||
                             (p.status || '').toLowerCase().includes('completad') ||
                             p.progress_pct >= 100;
        const pendingCobro = (p.invoiced_usd - p.collected_usd) > 0.01;

        let pinBg = '#16a34a'; // Verde activo
        let pinIcon = 'fa-solid fa-helmet-safety';
        let statusBadge = '<span style="background: #dcfce7; color: #15803d; padding: 2px 6px; border-radius: 4px; font-weight: 800;">Activo</span>';

        if (isCulminated) {
            pinBg = '#64748b'; // Slate culminado
            pinIcon = 'fa-solid fa-flag-checkered';
            statusBadge = '<span style="background: #f1f5f9; color: #475569; padding: 2px 6px; border-radius: 4px; font-weight: 800;">Culminado</span>';
        } else if (pendingCobro) {
            pinBg = '#d97706'; // Ambar por cobrar
            pinIcon = 'fa-solid fa-clock';
            statusBadge = '<span style="background: #fef3c7; color: #b45309; padding: 2px 6px; border-radius: 4px; font-weight: 800;">Por Cobrar</span>';
        }

        const projectIcon = L.divIcon({
            className: 'custom-dalor-project-pin',
            html: `
                <div style="width: 28px; height: 28px; background: ${pinBg}; border: 2px solid #ffffff; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #ffffff; box-shadow: 0 2px 6px rgba(0,0,0,0.35); font-size: 11px; cursor: pointer; transition: transform 0.15s ease;">
                    <i class="${pinIcon}"></i>
                </div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
            popupAnchor: [0, -14]
        });

        const marker = L.marker([p.lat, p.lng], { icon: projectIcon });

        const safeName = (p.name || 'Proyecto').replace(/"/g, '&quot;');
        const safeClient = (p.client_name || 'General').replace(/"/g, '&quot;');
        const safeLoc = (p.location || p.hub_name || 'Venezuela').replace(/"/g, '&quot;');
        const invFormatted = Number(p.invoiced_usd || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const colFormatted = Number(p.collected_usd || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const contrFormatted = Number(p.contract_amount_usd || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        marker.bindPopup(`
            <div style="font-family: inherit; font-size: 12px; min-width: 220px; color: #0f172a; line-height: 1.4;">
                <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; margin-bottom: 6px;">
                    <span style="font-weight: 800; color: #0284c7; font-size: 12px;">${p.code || 'OBRA'}</span>
                    <span style="font-size: 10px;">${statusBadge}</span>
                </div>
                <div style="font-weight: 800; font-size: 12.5px; color: #0f172a; margin-bottom: 4px;">
                    ${safeName}
                </div>
                <div style="font-size: 11px; color: #475569; margin-bottom: 2px;">
                    <i class="fa-solid fa-building" style="color: #64748b; width: 14px;"></i> <strong>Cliente:</strong> ${safeClient}
                </div>
                <div style="font-size: 11px; color: #475569; margin-bottom: 6px;">
                    <i class="fa-solid fa-location-dot" style="color: #ef4444; width: 14px;"></i> <strong>Sede:</strong> ${safeLoc}
                </div>
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 8px; margin-bottom: 8px; display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 11px;">
                    <div><span style="color: #64748b; font-size: 10px;">Contrato:</span><br><strong>$${contrFormatted}</strong></div>
                    <div><span style="color: #64748b; font-size: 10px;">Avance:</span><br><strong style="color: #0284c7;">${Number(p.progress_pct || 0).toFixed(0)}%</strong></div>
                    <div><span style="color: #64748b; font-size: 10px;">Facturado:</span><br><strong style="color: #2563eb;">$${invFormatted}</strong></div>
                    <div><span style="color: #64748b; font-size: 10px;">Cobrado:</span><br><strong style="color: #059669;">$${colFormatted}</strong></div>
                </div>
                <button type="button" onclick="if(window.viewProjectDetails) window.viewProjectDetails(${p.id});" style="width: 100%; background: #0284c7; color: #ffffff; border: none; padding: 7px 10px; border-radius: 6px; font-weight: 700; font-size: 11px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 1px 2px rgba(0,0,0,0.1);">
                    <i class="fa-solid fa-folder-open"></i> Abrir Ficha Técnica
                </button>
            </div>
        `);

        executiveMapMarkersLayer.addLayer(marker);
    });

    if (emptyOverlay) {
        emptyOverlay.style.display = (hasProjects || projectsGeo.length > 0) ? 'none' : 'flex';
    }
}

function setExecutiveMapLayer(type) {
    if (!executiveMap || !executiveMapBaseLayers[type]) return;
    currentMapLayerName = type;

    Object.values(executiveMapBaseLayers).forEach(layer => {
        if (executiveMap.hasLayer(layer)) {
            executiveMap.removeLayer(layer);
        }
    });

    executiveMapBaseLayers[type].addTo(executiveMap);

    const btnVial = document.getElementById('btnMapLayerStreets');
    const btnSat = document.getElementById('btnMapLayerSatellite');
    if (btnVial && btnSat) {
        if (type === 'streets') {
            btnVial.style.background = '#ffffff';
            btnVial.style.color = '#0f172a';
            btnVial.style.boxShadow = '0 1px 2px rgba(0,0,0,0.08)';
            btnSat.style.background = 'transparent';
            btnSat.style.color = '#64748b';
            btnSat.style.boxShadow = 'none';
        } else {
            btnSat.style.background = '#ffffff';
            btnSat.style.color = '#0f172a';
            btnSat.style.boxShadow = '0 1px 2px rgba(0,0,0,0.08)';
            btnVial.style.background = 'transparent';
            btnVial.style.color = '#64748b';
            btnVial.style.boxShadow = 'none';
        }
    }
}

function resetExecutiveMapView() {
    if (!executiveMap) return;
    executiveMap.fitBounds(VENEZUELA_BOUNDS, { padding: [12, 12], maxZoom: 6 });
}

function focusExecutiveMapRegion(regionKey) {
    if (!executiveMap) return;
    if (!regionKey || regionKey === 'all') {
        executiveMap.fitBounds(VENEZUELA_BOUNDS, { padding: [12, 12], maxZoom: 6 });
    } else {
        const target = REGION_COORDINATES[regionKey];
        if (target && target.center) {
            executiveMap.flyTo(target.center, target.zoom, { duration: 1.0 });
        }
    }
}

function filterBIExtended(type, val, btnEl) {
    if (type === 'region') {
        biCurrentFilter.region = val;
        const buttons = document.querySelectorAll('#biRegionSlicers .bi-filter-pill-light');
        buttons.forEach(b => b.classList.remove('active'));
        if (btnEl) btnEl.classList.add('active');
        focusExecutiveMapRegion(val);
    } else if (type === 'year') {
        biCurrentFilter.year = val;
    } else if (type === 'client') {
        biCurrentFilter.client = val;
    }
    loadExecutiveDashboard();
}

function renderExecutiveDashboardContent(data) {
    if (!data || !data.success) return;
    const s = data.summary || {};
    const regions = data.regions || [];
    const monthly = data.monthly_revenue || [];
    const topClients = data.top_clients || [];
    const statusCounts = data.project_statuses || {};
    const paymentMethods = data.payment_methods || [];
    const serviceLines = data.service_lines || [];
    const pnlList = data.projects_pnl || [];

    // 1. Badge de región seleccionada
    const badgeEl = document.getElementById('biMapSelectedBadge');
    if (badgeEl) {
        const names = {
            all: 'Todo el Territorio Nacional',
            carabobo: 'Carabobo (Centro / Guacara)',
            miranda: 'Miranda / Caracas',
            aragua: 'Aragua (Maracay / Cagua)',
            oriente: 'Oriente (Anzoátegui / Monagas)',
            zulia_falcon: 'Occidente (Zulia / Falcón)',
            bolivar: 'Guayana / Sur (Bolívar)',
            centro_occidente: 'Lara / Centro-Occidente'
        };
        badgeEl.textContent = names[biCurrentFilter.region] || 'Todo el Territorio';
    }

    // 2. Mapa Satelital y GIS Interactivo de Venezuela con Leaflet (100% REAL)
    initOrUpdateExecutiveMap(data.projects_geo || []);

    // 3. Totales de Cabecera (Tarjetas de KPIs)
    const hTotal = document.getElementById('biTotalIngresosHeader');
    if (hTotal) hTotal.textContent = `$${(s.total_collected_usd || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const sFact = document.getElementById('biTotalFacturadoSub');
    if (sFact) sFact.textContent = `$${(s.total_invoiced_usd || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

    const sEfect = document.getElementById('biTasaCobranzaSub');
    if (sEfect) sEfect.textContent = `${(s.collection_rate_pct || 0).toFixed(1)}%`;

    const mProm = document.getElementById('biMargenPromedio');
    if (mProm) mProm.textContent = `${(s.margin_pct || 0).toFixed(1)}%`;

    const oAct = document.getElementById('biObrasActivasCount');
    if (oAct) oAct.textContent = s.active_projects_count || 0;

    const cCalle = document.getElementById('biCarteraCalle');
    if (cCalle) cCalle.textContent = `$${(s.total_pending_cxc_usd || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

    const pProv = document.getElementById('biPasivoProveedores');
    if (pProv) pProv.textContent = `$${(s.total_cost_usd || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

    const mTotal = document.getElementById('biMonthKpiTotal');
    if (mTotal) mTotal.textContent = `$${(s.total_collected_usd || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

    // 4. Gráfico Evolución Mensual Real
    renderBIMonthlyChartReal(monthly);

    // 5. Gráfico de Líneas de Servicio Reales
    renderBIServiceLineChartReal(serviceLines);

    // 6. Donas Reales (Top Clientes, Estado de Obras, Métodos de Pago)
    renderBIDonutsReal(topClients, statusCounts, paymentMethods);

    // 7. Tabla P&L Detallada
    renderBIPnlTable(pnlList);
}

function renderBIMonthlyChartReal(monthlyData) {
    const ctx = document.getElementById('chartBiMonthlyRevenue');
    const emptyEl = document.getElementById('chartBiMonthlyEmpty');
    if (!ctx) return;
    if (chartBiMonthlyRev) chartBiMonthlyRev.destroy();

    const list = Array.isArray(monthlyData) ? monthlyData : [];
    if (list.length === 0) {
        if (emptyEl) emptyEl.style.display = 'flex';
        return;
    }
    if (emptyEl) emptyEl.style.display = 'none';

    const labels = list.map(m => m.label || m.month);
    const collectedVals = list.map(m => m.collected_usd || 0);
    const invoicedVals = list.map(m => m.invoiced_usd || 0);

    chartBiMonthlyRev = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Cobrado Real ($)',
                    data: collectedVals,
                    backgroundColor: '#059669',
                    borderRadius: 4,
                    barPercentage: 0.6
                },
                {
                    label: 'Facturado ($)',
                    data: invoicedVals,
                    backgroundColor: '#93c5fd',
                    borderRadius: 4,
                    barPercentage: 0.6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: { color: '#475569', font: { size: 10, weight: '700' }, boxWidth: 12 }
                },
                tooltip: {
                    backgroundColor: '#ffffff',
                    titleColor: '#0f172a',
                    bodyColor: '#334155',
                    borderColor: '#cbd5e1',
                    borderWidth: 1,
                    callbacks: {
                        label: (ctx) => ` ${ctx.dataset.label}: $${ctx.parsed.y.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: '#64748b', font: { size: 10, weight: '600' } }
                },
                y: {
                    grid: { color: 'rgba(0,0,0,0.05)' },
                    ticks: {
                        color: '#64748b',
                        font: { size: 9.5 },
                        callback: (v) => `$${(v >= 1000 ? (v/1000).toFixed(0) + 'k' : v)}`
                    }
                }
            }
        }
    });
}

function renderBIServiceLineChartReal(serviceLines) {
    const ctx = document.getElementById('chartBiServiceLine');
    const emptyEl = document.getElementById('chartBiServiceEmpty');
    if (!ctx) return;
    if (chartBiService) chartBiService.destroy();

    const list = Array.isArray(serviceLines) ? serviceLines : [];
    if (list.length === 0) {
        if (emptyEl) emptyEl.style.display = 'flex';
        return;
    }
    if (emptyEl) emptyEl.style.display = 'none';

    const labels = list.map(l => l.name);
    const vals = list.map(l => l.percentage);
    const colors = ['#2563eb', '#0284c7', '#059669', '#d97706', '#64748b'];

    chartBiService = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Participación (%)',
                data: vals,
                backgroundColor: colors.slice(0, labels.length),
                borderRadius: 4,
                barThickness: 16
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#ffffff',
                    titleColor: '#0f172a',
                    bodyColor: '#334155',
                    borderColor: '#cbd5e1',
                    borderWidth: 1,
                    callbacks: { label: (ctx) => ` Participación: ${ctx.parsed.x}%` }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(0,0,0,0.05)' },
                    ticks: { color: '#64748b', callback: (v) => `${v}%`, font: { size: 9.5 } },
                    max: 100
                },
                y: {
                    grid: { display: false },
                    ticks: { color: '#334155', font: { size: 10, weight: '700' } }
                }
            }
        }
    });
}

function renderBIDonutsReal(topClients, statusCounts, paymentMethods) {
    // Dona 1: Top Clientes Real
    const ctxCli = document.getElementById('chartBiDonutClients');
    const emptyCli = document.getElementById('chartBiClientsEmpty');
    if (ctxCli) {
        if (chartBiClients) chartBiClients.destroy();
        const list = Array.isArray(topClients) ? topClients : [];
        if (list.length === 0) {
            if (emptyCli) emptyCli.style.display = 'flex';
        } else {
            if (emptyCli) emptyCli.style.display = 'none';
            const labels = list.map(c => `${c.name} (${c.percentage}%)`);
            const dataVals = list.map(c => c.total_usd);

            chartBiClients = new Chart(ctxCli, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        data: dataVals,
                        backgroundColor: ['#2563eb', '#0284c7', '#059669', '#d97706', '#94a3b8'],
                        borderWidth: 2,
                        borderColor: '#ffffff'
                    }]
                },
                options: {
                    cutout: '68%',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: { color: '#475569', boxWidth: 10, font: { size: 9.5 } }
                        }
                    }
                }
            });
        }
    }

    // Dona 2: Estado de Proyectos Real
    const ctxSt = document.getElementById('chartBiDonutProjectsStatus');
    const emptySt = document.getElementById('chartBiStatusEmpty');
    if (ctxSt) {
        if (chartBiStatus) chartBiStatus.destroy();
        const enEjec = statusCounts?.en_ejecucion || 0;
        const culm = statusCounts?.culminados || 0;
        const plan = statusCounts?.planificados || 0;
        const totalProjs = enEjec + culm + plan;

        if (totalProjs === 0) {
            if (emptySt) emptySt.style.display = 'flex';
        } else {
            if (emptySt) emptySt.style.display = 'none';
            chartBiStatus = new Chart(ctxSt, {
                type: 'doughnut',
                data: {
                    labels: [`En Ejecución (${enEjec})`, `Culminadas (${culm})`, `Planificadas (${plan})`],
                    datasets: [{
                        data: [enEjec, culm, plan],
                        backgroundColor: ['#2563eb', '#059669', '#94a3b8'],
                        borderWidth: 2,
                        borderColor: '#ffffff'
                    }]
                },
                options: {
                    cutout: '68%',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: { color: '#475569', boxWidth: 10, font: { size: 9.5 } }
                        }
                    }
                }
            });
        }
    }

    // Dona 3: Método de Pago Real
    const ctxPay = document.getElementById('chartBiDonutPaymentMethods');
    const emptyPay = document.getElementById('chartBiMethodsEmpty');
    if (ctxPay) {
        if (chartBiMethods) chartBiMethods.destroy();
        const list = Array.isArray(paymentMethods) ? paymentMethods : [];
        if (list.length === 0) {
            if (emptyPay) emptyPay.style.display = 'flex';
        } else {
            if (emptyPay) emptyPay.style.display = 'none';
            const labels = list.map(m => `${m.label} (${m.percentage}%)`);
            const dataVals = list.map(m => m.total_usd);

            chartBiMethods = new Chart(ctxPay, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        data: dataVals,
                        backgroundColor: ['#2563eb', '#059669', '#0284c7', '#d97706', '#94a3b8'],
                        borderWidth: 2,
                        borderColor: '#ffffff'
                    }]
                },
                options: {
                    cutout: '68%',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: { color: '#475569', boxWidth: 10, font: { size: 9.5 } }
                        }
                    }
                }
            });
        }
    }
}

let lastBiPnlList = [];
let biPnlCurrentPage = 1;
let biPnlPageSize = 10;

function goToBiPnlPage(page) {
    biPnlCurrentPage = page;
    renderBIPnlTablePaginated();
}

function changeBiPnlPageSize(size) {
    biPnlPageSize = parseInt(size) || 10;
    biPnlCurrentPage = 1;
    renderBIPnlTablePaginated();
}

function renderBIPnlTable(pnlList) {
    lastBiPnlList = Array.isArray(pnlList) ? pnlList : [];
    biPnlCurrentPage = 1;
    renderBIPnlTablePaginated();
}

function renderBIPnlTablePaginated() {
    const pnlTbody = document.getElementById("executivePnlTableBody");
    if (!pnlTbody) return;

    const list = lastBiPnlList || [];
    if (list.length === 0) {
        pnlTbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: #94a3b8; padding: 18px;">No hay registros para este filtro.</td></tr>`;
        const pCont = document.getElementById("biPnlPaginationContainer");
        if (pCont) pCont.innerHTML = '';
        return;
    }

    const { startIndex, endIndex, currentPage } = (typeof window.renderPaginationControls === 'function' ? window.renderPaginationControls : renderPaginationControls)({
        containerId: "biPnlPaginationContainer",
        totalItems: list.length,
        currentPage: biPnlCurrentPage,
        pageSize: biPnlPageSize,
        onPageChange: "goToBiPnlPage",
        onPageSizeChange: "changeBiPnlPageSize",
        itemLabel: "obra(s)",
        pageSizeOptions: [5, 10, 20]
    });
    biPnlCurrentPage = currentPage;

    const pageItems = list.slice(startIndex, endIndex);
    pnlTbody.innerHTML = pageItems.map(p => {
        const rawP = (biRawProjects || []).find(rp => rp.id === (p.project_id || p.id));
        const loc = rawP?.location || p.location || 'Sede Central (Guacara)';
        
        const contr = Number(p.contract_amount_usd || 0);
        const inv = Number(p.invoiced_usd ?? p.total_invoiced_usd ?? 0);
        const col = Number(p.collected_usd ?? p.collected_cxc_usd ?? 0);
        const cost = Number(p.cost_usd ?? p.total_cost_usd ?? 0);
        const profit = Number(p.profit_usd ?? p.net_profit_usd ?? (col - cost));
        const margin = Number(p.margin_pct ?? p.net_margin_percent ?? (cost > 0 ? (profit / cost * 100) : (col > 0 ? 100 : 0)));
        const isProfitable = profit >= 0;

        return `
        <tr style="border-bottom: 1px solid #e2e8f0; hover: background: #f8fafc;">
            <td style="padding: 9px 8px; font-weight: 800; color: #0284c7;">${p.code}</td>
            <td style="padding: 9px 8px; font-weight: 700; color: #0f172a;">${p.name}</td>
            <td style="padding: 9px 8px; color: #334155; font-weight: 600;">${p.client_name || 'General'}</td>
            <td style="padding: 9px 8px; color: #475569; font-size: 11px;"><i class="fa-solid fa-location-dot" style="color:#0284c7;"></i> ${loc}</td>
            <td style="padding: 9px 8px; text-align: right; font-weight: 700; color: #0f172a;">$${contr.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td style="padding: 9px 8px; text-align: right; font-weight: 700; color: #2563eb;">$${inv.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td style="padding: 9px 8px; text-align: right; font-weight: 800; color: #059669;">$${col.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td style="padding: 9px 8px; text-align: right; font-weight: 800; color: #dc2626;">$${cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td style="padding: 9px 8px; text-align: right; font-weight: 900; color: ${isProfitable ? '#059669' : '#dc2626'};">
                $${profit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </td>
            <td style="padding: 9px 8px; text-align: right; font-weight: 800; color: ${isProfitable ? '#059669' : '#dc2626'};">
                ${margin.toFixed(1)}%
            </td>
        </tr>`;
    }).join('');
}

function filterBIDashboard() {
    renderExecutiveDashboardContent();
}

function populateBISlicers() {
    populateBIClientSlicer();
}

function renderBIAnalyticsCharts() {}

function renderCleanRadialCharts() {}








// Exponer al objeto global window para eventos inline y compatibilidad
if (typeof window !== 'undefined') {
    window.loadExecutiveDashboard = loadExecutiveDashboard;
    window.populateBIClientSlicer = populateBIClientSlicer;
    window.filterBIExtended = filterBIExtended;
    window.renderExecutiveDashboardContent = renderExecutiveDashboardContent;
    window.renderBIMonthlyChartReal = renderBIMonthlyChartReal;
    window.renderBIServiceLineChartReal = renderBIServiceLineChartReal;
    window.renderBIDonutsReal = renderBIDonutsReal;
    window.goToBiPnlPage = goToBiPnlPage;
    window.changeBiPnlPageSize = changeBiPnlPageSize;
    window.renderBIPnlTable = renderBIPnlTable;
    window.renderBIPnlTablePaginated = renderBIPnlTablePaginated;
    window.filterBIDashboard = filterBIDashboard;
    window.populateBISlicers = populateBISlicers;
    window.renderBIAnalyticsCharts = renderBIAnalyticsCharts;
    window.renderCleanRadialCharts = renderCleanRadialCharts;
    window.initOrUpdateExecutiveMap = initOrUpdateExecutiveMap;
    window.setExecutiveMapLayer = setExecutiveMapLayer;
    window.resetExecutiveMapView = resetExecutiveMapView;
    window.focusExecutiveMapRegion = focusExecutiveMapRegion;
}
