function Ae(o,e=2){const t=Math.pow(10,e);return Math.round((Number(o)||0)*t)/t}window.roundNumber=Ae;function ge(o){if(typeof o=="number")return isNaN(o)?0:o;if(!o)return 0;let e=String(o).trim().replace(/[$Bs€\s]/g,"");e.includes(",")&&e.includes(".")?e.indexOf(".")<e.indexOf(",")?e=e.replace(/\./g,"").replace(",","."):e=e.replace(/,/g,""):e.includes(",")&&(e=e.replace(",","."));const t=parseFloat(e);return isNaN(t)?0:t}window.parseLocalizedNumber=ge;window.parseDecimal=ge;window.API_BASE=window.location.origin+"/api/v1";function Ge(o,e,t){const n=document.getElementById(o);if(n){if(!Array.isArray(e)){n.innerHTML="";return}n.innerHTML=e.map(t).join("")}}function We(o){return Array.isArray(o)?[...o].sort((e,t)=>{const n=String(e.code||"").split(".").map(a=>parseInt(a,10)||0),r=String(t.code||"").split(".").map(a=>parseInt(a,10)||0);for(let a=0;a<Math.max(n.length,r.length);a++){const i=n[a]!==void 0?n[a]:-1,l=r[a]!==void 0?r[a]:-1;if(i!==l)return i-l}return String(e.name||"").localeCompare(String(t.name||""))}):[]}window.currentUser||(()=>{try{return JSON.parse(localStorage.getItem("dalor_user")||sessionStorage.getItem("dalor_user")||"null")}catch{return null}})();window.authToken||localStorage.getItem("dalor_token")||sessionStorage.getItem("dalor_token");function Te(o,e={}){var t=sessionStorage.getItem("dalor_token")||localStorage.getItem("dalor_token")||window.authToken||"",n=Object.assign({},e.headers||{});return t&&(n.Authorization="Bearer "+t),e.body&&!(e.body instanceof FormData)&&!n["Content-Type"]&&(n["Content-Type"]="application/json"),e.body instanceof FormData&&delete n["Content-Type"],window.fetch(o,Object.assign({},e,{headers:n}))}window.authFetch=Te;function D({containerId:o,totalItems:e=0,currentPage:t=1,pageSize:n=10,onPageChange:r="",onPageSizeChange:a="",itemLabel:i="registro(s)",pageSizeOptions:l=[10,15,25,50,100],allowAll:u=!0}){const d=document.getElementById(o);if(!d)return{startIndex:0,endIndex:0,totalPages:1,currentPage:1};const c=n===1e3||n===9999?e||1:n||15,m=Math.max(1,Math.ceil(e/c));let f=Math.max(1,Math.min(t,m));const s=(f-1)*c,p=Math.min(s+c,e);if(e<=Math.min(...l)&&m<=1)return d.innerHTML=`
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 11.5px; color: #64748b; margin-top: 8px;">
                <span>Mostrando <b>${e}</b> ${i}</span>
                ${a?`
                <div style="display: flex; align-items: center; gap: 6px;">
                    <span>Mostrar:</span>
                    <select onchange="${a}(this.value)" style="padding: 2px 6px; font-size: 11px; border: 1px solid #cbd5e1; border-radius: 4px; background: white; font-weight: 700; cursor: pointer;">
                        ${l.map(g=>`<option value="${g}" ${n===g?"selected":""}>${g}</option>`).join("")}
                        ${u?`<option value="1000" ${n===1e3?"selected":""}>Todos</option>`:""}
                    </select>
                </div>`:""}
            </div>
        `,{startIndex:s,endIndex:p,totalPages:m,currentPage:f};let y="",w=Math.max(1,f-2),_=Math.min(m,f+2);w>1&&(y+=`<button type="button" onclick="${r}(1)" class="btn-secondary" style="padding: 4px 9px; font-size: 11px; border-radius: 5px;">1</button>`,w>2&&(y+='<span style="padding: 0 4px; color: #94a3b8;">...</span>'));for(let g=w;g<=_;g++)g===f?y+=`<button type="button" class="btn-primary" style="padding: 4px 10px; font-size: 11px; font-weight: 800; border-radius: 5px; background: var(--dalor-navy, #0f172a); color: white;">${g}</button>`:y+=`<button type="button" onclick="${r}(${g})" class="btn-secondary" style="padding: 4px 9px; font-size: 11px; border-radius: 5px;">${g}</button>`;return _<m&&(_<m-1&&(y+='<span style="padding: 0 4px; color: #94a3b8;">...</span>'),y+=`<button type="button" onclick="${r}(${m})" class="btn-secondary" style="padding: 4px 9px; font-size: 11px; border-radius: 5px;">${m}</button>`),d.innerHTML=`
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 12px; color: #475569; flex-wrap: wrap; gap: 10px; box-shadow: 0 1px 2px rgba(0,0,0,0.04); margin-top: 8px;">
            <div style="font-weight: 600;">
                Mostrando <b style="color: var(--dalor-navy, #0f172a);">${e===0?0:s+1} - ${p}</b> de <b style="color: var(--dalor-navy, #0f172a);">${e}</b> ${i}
            </div>

            <div style="display: flex; align-items: center; gap: 5px;">
                <button type="button" onclick="${r}(1)" class="btn-secondary" style="padding: 4px 8px; font-size: 11px; border-radius: 5px;" ${f===1?'disabled style="opacity:0.4; cursor:not-allowed;"':""} title="Primera página">
                    <i class="fa-solid fa-angles-left"></i>
                </button>
                <button type="button" onclick="${r}(${f-1})" class="btn-secondary" style="padding: 4px 9px; font-size: 11px; border-radius: 5px;" ${f===1?'disabled style="opacity:0.4; cursor:not-allowed;"':""} title="Página anterior">
                    <i class="fa-solid fa-chevron-left"></i> Anterior
                </button>

                <div style="display: flex; align-items: center; gap: 4px;">
                    ${y}
                </div>

                <button type="button" onclick="${r}(${f+1})" class="btn-secondary" style="padding: 4px 9px; font-size: 11px; border-radius: 5px;" ${f===m?'disabled style="opacity:0.4; cursor:not-allowed;"':""} title="Página siguiente">
                    Siguiente <i class="fa-solid fa-chevron-right"></i>
                </button>
                <button type="button" onclick="${r}(${m})" class="btn-secondary" style="padding: 4px 8px; font-size: 11px; border-radius: 5px;" ${f===m?'disabled style="opacity:0.4; cursor:not-allowed;"':""} title="Última página">
                    <i class="fa-solid fa-angles-right"></i>
                </button>
            </div>

            ${a?`
            <div style="display: flex; align-items: center; gap: 6px;">
                <span style="font-size: 11.5px; color: #64748b;">Por página:</span>
                <select onchange="${a}(this.value)" style="padding: 3px 8px; font-size: 11.5px; border: 1px solid #cbd5e1; border-radius: 5px; background: white; font-weight: 700; color: var(--dalor-navy, #0f172a); cursor: pointer;">
                    ${l.map(g=>`<option value="${g}" ${n===g?"selected":""}>${g}</option>`).join("")}
                    ${u?`<option value="1000" ${n===1e3?"selected":""}>Ver todos</option>`:""}
                </select>
            </div>`:""}
        </div>
    `,{startIndex:s,endIndex:p,totalPages:m,currentPage:f}}window.renderPaginationControls=D;function we(o){o==="modalNewQuotation"&&(o="modalQuotation");const e=document.getElementById(o);e&&(e.classList.remove("hidden"),e.style.setProperty("display","flex","important"));const t=document.getElementById("btnFloatingLogout");t&&t.style.setProperty("display","none","important")}function ie(o){const e=document.getElementById(o);if(e&&(e.classList.add("hidden"),e.style.setProperty("display","none","important")),document.querySelectorAll(".modal-overlay:not(.hidden):not([style*='display: none']), .modal:not(.hidden):not([style*='display: none'])").length===0){const n=document.getElementById("btnFloatingLogout");n&&n.style.removeProperty("display")}}typeof window<"u"&&(window.openModal=we,window.closeModal=ie,window.roundNumber=Ae,window.parseLocalizedNumber=ge,window.populateSelect=Ge,window.sortCategoriesNumerically=We,window.authFetch=Te,window.renderPaginationControls=D);let Pe=0;function Fe(){return window.innerWidth<=768}function Xe(o,e){o&&o.stopPropagation&&o.stopPropagation(),Pe=Date.now();const t=document.getElementById(e);if(!t)return;if(Fe()){qe(e);return}const n=t.classList.contains("open");re(),n||t.classList.add("open")}function qe(o){const e=document.getElementById(o);if(!e)return;const t=e.querySelector(".dropdown-btn"),n=e.querySelector(".dropdown-menu"),r=document.getElementById("mobileSubmenuSheet"),a=document.getElementById("mobileSubmenuTitle"),i=document.getElementById("mobileSubmenuItems");if(!r||!a||!i||!n)return;const l=t?t.querySelector("i"):null,u=t?t.querySelector("span"):null,d=l?l.outerHTML:'<i class="fa-solid fa-layer-group" style="color: var(--dalor-blue);"></i>',c=u?u.innerText:"Opciones del Módulo";a.innerHTML=`${d} <span>${c}</span>`,i.innerHTML="",n.querySelectorAll(".dropdown-item").forEach(f=>{const s=f.cloneNode(!0);s.onclick=p=>{p&&p.stopPropagation&&p.stopPropagation(),ae(),f.onclick&&f.onclick(p)},i.appendChild(s)}),r.classList.add("active"),document.body.style.overflow="hidden"}function ae(o){if(o&&o.target&&o.target.closest(".mobile-submenu-card")&&!o.target.classList.contains("mobile-submenu-close"))return;const e=document.getElementById("mobileSubmenuSheet");e&&e.classList.remove("active"),document.body.style.overflow=""}function re(){document.querySelectorAll(".nav-dropdown").forEach(o=>{o.classList.remove("open")}),ae()}function De(o,e,t=null){re(),["executive","financial","maintenance","quotations","clients","services","projects","dispatch","dashboard","resources","pwa","manual","tree","inbox","expenses-log"].forEach(i=>{const l=document.getElementById(`view-${i}`);l&&l.classList.add("hidden")});const r=document.getElementById(`view-${o}`);r&&r.classList.remove("hidden"),document.querySelectorAll(".nav-dropdown").forEach(i=>i.classList.remove("active"));const a=document.getElementById(`dropdown-${e}`);a&&a.classList.add("active");try{localStorage.setItem("dalor_active_view",o),e&&localStorage.setItem("dalor_active_category",e),sessionStorage.setItem("dalor_active_view",o),e&&sessionStorage.setItem("dalor_active_category",e)}catch{}if(o==="executive"&&typeof window.loadExecutiveDashboard=="function"&&window.loadExecutiveDashboard(),o==="financial"){let i=t||localStorage.getItem("dalor_active_subtab_financial")||sessionStorage.getItem("dalor_active_subtab_financial")||"cxc";const l=window.currentUser||window.State&&window.State.currentUser;if(l){let u={};try{u=typeof l.permissions_json=="string"?JSON.parse(l.permissions_json):l.permissions_json||l.permissions||{}}catch{}if(!((l.username||"").toLowerCase()==="director"||(l.role_name||"").toLowerCase().includes("director")||l.is_superuser===!0)){const c=u.cxc_view!==void 0||u.cxp_view!==void 0||u.bancos_view!==void 0||u.retiros_view!==void 0,m=u.cxc_view!==void 0?!!(u.cxc_view||u.cxc_pay):!c,f=u.cxp_view!==void 0?!!(u.cxp_view||u.cxp_pay):!c,s=u.bancos_view!==void 0?!!u.bancos_view:!c,p=u.retiros_view!==void 0?!!u.retiros_view:!1;i==="cxc"&&m||i==="cxp"&&f||i==="summary"&&s||i==="partners"&&p||(m?i="cxc":f?i="cxp":s?i="summary":p&&(i="partners"))}}typeof window.switchFinancialSubtab=="function"?window.switchFinancialSubtab(i):typeof window.openFinancialSubtab=="function"&&window.openFinancialSubtab(i)}if(o==="maintenance"){const i=t||localStorage.getItem("dalor_active_subtab_maintenance")||sessionStorage.getItem("dalor_active_subtab_maintenance")||"users";typeof window.switchMaintenanceSubtab=="function"?window.switchMaintenanceSubtab(i):typeof window.openMaintenanceSubtab=="function"&&window.openMaintenanceSubtab(i)}if(o==="quotations"&&typeof window.loadQuotations=="function"&&window.loadQuotations(),o==="clients"&&typeof window.loadClients=="function"&&window.loadClients(),o==="services"&&typeof window.loadServices=="function"&&window.loadServices(),o==="projects"){const i=t||localStorage.getItem("dalor_active_subtab_projects")||sessionStorage.getItem("dalor_active_subtab_projects")||"list";typeof window.switchProjectSubtab=="function"?window.switchProjectSubtab(i):typeof window.initProjectPlanningView=="function"&&window.initProjectPlanningView()}if(o==="dispatch"){const i=t||localStorage.getItem("dalor_active_subtab_dispatch")||sessionStorage.getItem("dalor_active_subtab_dispatch")||"list";typeof window.switchDispatchSubtab=="function"?window.switchDispatchSubtab(i):typeof window.initDispatchView=="function"&&window.initDispatchView()}if(o==="dashboard"&&typeof window.loadComparisonDashboard=="function"&&window.loadComparisonDashboard(),o==="resources"){const i=t||localStorage.getItem("dalor_active_subtab_resources")||sessionStorage.getItem("dalor_active_subtab_resources")||"dashboard";typeof window.switchResourceSubtab=="function"?window.switchResourceSubtab(i):typeof window.openResourceSubtab=="function"&&window.openResourceSubtab(i)}o==="inbox"&&typeof window.loadPendingExpensesInbox=="function"&&window.loadPendingExpensesInbox(),o==="tree"&&typeof window.loadCategoriesTree=="function"&&window.loadCategoriesTree(),o==="expenses-log"&&typeof window.loadExpensesLog=="function"&&window.loadExpensesLog(),window.onViewSwitched&&window.onViewSwitched(o)}window.switchView=De;window.appSwitchView=De;window.isMobileViewport=Fe;window.toggleDropdown=Xe;window.openMobileSubmenu=qe;window.closeMobileSubmenu=ae;window.closeAllDropdowns=re;const Le=o=>{Date.now()-Pe<350||!o.target.closest(".nav-dropdown")&&!o.target.closest(".dropdown-menu")&&!o.target.closest(".mobile-submenu-card")&&(re(),ae())};document.addEventListener("click",Le);document.addEventListener("touchend",Le);window.calcFieldBs=function(){var n,r;const o=parseFloat((n=document.getElementById("field_amount_usd"))==null?void 0:n.value)||0,e=parseFloat((r=document.getElementById("globalExchangeRateInput"))==null?void 0:r.value)||EXCHANGE_RATE,t=document.getElementById("field_amount_bs");t&&!isNaN(o)&&(t.value=(o*e).toFixed(2)),ye()};window.calcFieldUsd=function(){var n,r;const o=parseFloat((n=document.getElementById("field_amount_bs"))==null?void 0:n.value)||0,e=parseFloat((r=document.getElementById("globalExchangeRateInput"))==null?void 0:r.value)||EXCHANGE_RATE,t=document.getElementById("field_amount_usd");t&&!isNaN(o)&&e>0&&(t.value=(o/e).toFixed(2)),ye()};window.onFieldTaxConditionChanged=function(){ye()};function ye(){var u,d;const o=parseFloat((u=document.getElementById("field_amount_usd"))==null?void 0:u.value)||0,e=((d=document.getElementById("field_is_tax_exempt"))==null?void 0:d.value)==="true",t=e?o:+(o/1.16).toFixed(2),n=e?0:+(o-t).toFixed(2),r=document.getElementById("field_base_amount_usd"),a=document.getElementById("field_tax_amount_usd"),i=document.getElementById("field_base_display"),l=document.getElementById("field_tax_display");r&&(r.value=t.toFixed(2)),a&&(a.value=n.toFixed(2)),i&&(i.innerText=`$${t.toFixed(2)}`),l&&(l.innerText=`$${n.toFixed(2)}`)}window.onValTaxChanged=function(){var i,l;const o=parseFloat((i=document.getElementById("val_amount_usd"))==null?void 0:i.value)||0,e=((l=document.getElementById("val_is_tax_exempt"))==null?void 0:l.value)==="true",t=e?o:+(o/1.16).toFixed(2),n=e?0:+(o-t).toFixed(2),r=document.getElementById("val_base_usd"),a=document.getElementById("val_tax_usd");r&&(r.value=t.toFixed(2)),a&&(a.value=n.toFixed(2))};function Je(o,e="Documento DALOR",t={}){let n=document.getElementById("dalor_print_iframe");n||(n=document.createElement("iframe"),n.id="dalor_print_iframe",n.style.position="fixed",n.style.right="0",n.style.bottom="0",n.style.width="0",n.style.height="0",n.style.border="0",n.style.visibility="hidden",document.body.appendChild(n));const r=String(e||"").toLowerCase(),a=t&&t.orientation==="landscape"||t&&t.landscape||r.includes("libro")||r.includes("compras")||r.includes("ventas")||r.includes("matriz");let i="";if(typeof o=="string")i=o;else if(o&&o.nodeType){const d=o.cloneNode(!0);d.querySelectorAll('.no-print, button, input[type="button"], input[type="submit"]').forEach(c=>c.remove()),d.querySelectorAll(".table-wrapper, div").forEach(c=>{c.style&&(c.style.maxHeight&&(c.style.maxHeight="none"),c.style.overflow&&(c.style.overflow="visible"),c.style.overflowY&&(c.style.overflowY="visible"),c.style.overflowX&&(c.style.overflowX="visible"))}),a&&d.querySelectorAll("table").forEach(c=>{let m=-1;c.querySelectorAll("thead th").forEach((s,p)=>{const y=s.textContent.trim().toLowerCase();(y==="acción"||y==="accion")&&(m=p)}),m!==-1&&c.querySelectorAll("tr").forEach(s=>{s.cells&&s.cells[m]&&s.cells[m].remove()})}),i=d.innerHTML}const l=`
        <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 8px; border-bottom: 2px solid #002B49; padding-bottom: 4px;">
            <div>
                <h1 style="margin: 0; font-size: ${a?"13px":"15px"}; font-weight: 900; color: #002B49; letter-spacing: -0.2px;">METALMECÁNICA DALOR, C.A.</h1>
                <p style="margin: 2px 0 0; font-size: ${a?"8px":"9.5px"}; color: #475569; font-weight: 600;">RIF: J-31601195-0 &bull; Av. Cámara de las Industrias, Galpón 10, Guacara, Edo. Carabobo</p>
            </div>
            <div style="text-align: right;">
                <h2 style="margin: 0; font-size: ${a?"11px":"13px"}; font-weight: 800; color: #0072B8;">${String(e).replace(/_/g," ")}</h2>
                <p style="margin: 2px 0 0; font-size: ${a?"7.5px":"9px"}; color: #64748b;">Impreso: ${new Date().toLocaleDateString("es-VE")} ${new Date().toLocaleTimeString("es-VE",{hour:"2-digit",minute:"2-digit"})}</p>
            </div>
        </div>
    `,u=n.contentWindow.document;u.open(),u.write(`
        <!DOCTYPE html>
        <html lang="es">
            <head>
                <meta charset="utf-8">
                <title>${e}</title>
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
                <link rel="stylesheet" href="/css/styles.css?v=2026.09.24.v98.35">
                <style>
                    :root {
                        --dalor-navy: #002B49;
                        --dalor-blue: #0072B8;
                        --dalor-gold: #F5B800;
                        --dalor-coral: #ff4b72;
                        --dalor-cyan: #0284c7;
                        --dalor-emerald: #059669;
                        --dalor-purple: #7c3aed;
                        --dalor-bg: #f1f5f9;
                        --dalor-card-bg: #ffffff;
                        --border-color: #cbd5e1;
                    }
                    * { 
                        box-sizing: border-box; 
                        scrollbar-width: none !important;
                    }
                    ::-webkit-scrollbar {
                        display: none !important;
                        width: 0 !important;
                        height: 0 !important;
                    }
                    body {
                        margin: 0;
                        padding: ${a?"4mm 6mm":"8mm 10mm"};
                        background: #ffffff;
                        color: #0f172a;
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                        font-size: ${a?"8px":"11px"};
                        line-height: 1.25;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    @page {
                        size: ${a?"letter landscape":"letter portrait"};
                        margin: ${a?"5mm":"8mm 10mm"};
                    }
                    @media print {
                        body { padding: 0; margin: 0; background: #fff !important; }
                        .no-print { display: none !important; }
                    }
                    .no-print { display: none !important; }

                    .table-wrapper {
                        max-height: none !important;
                        height: auto !important;
                        overflow: visible !important;
                        overflow-x: visible !important;
                        overflow-y: visible !important;
                        width: 100% !important;
                        border: none !important;
                        box-shadow: none !important;
                        margin-bottom: 6px !important;
                    }
                    table {
                        width: 100% !important;
                        max-width: 100% !important;
                        border-collapse: collapse !important;
                        font-size: ${a?"7.5px":"10px"} !important;
                        table-layout: auto !important;
                        page-break-inside: auto;
                    }
                    tr {
                        page-break-inside: avoid;
                        page-break-after: auto;
                    }
                    thead {
                        display: table-header-group;
                    }
                    th, td {
                        padding: ${a?"2.5px 2px":"6px 8px"} !important;
                        border: 1px solid #94a3b8 !important;
                        white-space: normal !important;
                        word-break: break-word !important;
                        font-size: ${a?"7.5px":"10px"} !important;
                        line-height: 1.15 !important;
                    }
                    thead th {
                        background: #0f172a !important;
                        color: #ffffff !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        text-align: center;
                        font-weight: 800;
                    }
                    /* Barra horizontal compacta para KPI Cards */
                    div[style*="grid-template-columns"] {
                        display: flex !important;
                        flex-direction: row !important;
                        justify-content: space-between !important;
                        gap: 5px !important;
                        margin-bottom: 8px !important;
                        width: 100% !important;
                    }
                    div[style*="grid-template-columns"] > div {
                        flex: 1 1 0 !important;
                        padding: 3px 6px !important;
                        border-radius: 4px !important;
                    }
                    div[style*="grid-template-columns"] span {
                        font-size: 7.5px !important;
                        display: block !important;
                    }
                    div[style*="grid-template-columns"] div[id^="kpi_"] {
                        font-size: ${a?"11px":"13px"} !important;
                        font-weight: 900 !important;
                        margin-top: 1px !important;
                    }
                </style>
            </head>
            <body>
                ${l}
                ${i}
            </body>
        </html>
    `),u.close(),setTimeout(()=>{n.contentWindow.focus(),n.contentWindow.print()},250)}typeof window<"u"&&(window.printElementHtml=Je);var B=window.API_BASE||window.location.origin+"/api/v1";const $=window.authFetch||function(o,e={}){const t=sessionStorage.getItem("dalor_token")||localStorage.getItem("dalor_token")||window.authToken||"",n=Object.assign({},e.headers||{});return t&&(n.Authorization="Bearer "+t),e.body&&!(e.body instanceof FormData)&&!n["Content-Type"]&&(n["Content-Type"]="application/json"),window.fetch(o,Object.assign({},e,{headers:n}))};parseFloat(localStorage.getItem("dalor_exchange_rate"));var ue=window.allClients=window.allClients||[],Ke=window.allServices=window.allServices||[],pe=window.allProjects=window.allProjects||[],me=window.allCategories=window.allCategories||[],W=window.allAssets=window.allAssets||[],h=window.allPersonnel=window.allPersonnel||[],X=window.allMaterials=window.allMaterials||[];let k=null,Se=0;const Ye=6e4;async function le(o=!1){const e=Date.now();return k||(!o&&e-Se<Ye&&window.allClients&&window.allClients.length>0&&window.allPersonnel&&window.allPersonnel.length>0&&window.allAssets&&window.allAssets.length>0?(typeof populatePlanDropdownSelectors=="function"&&populatePlanDropdownSelectors(),Promise.resolve()):(k=(async()=>{try{const[t,n,r,a,i,l,u]=await Promise.all([$(`${B}/clients/`),$(`${B}/services/`),$(`${B}/projects/`),$(`${B}/expenses/categories`),$(`${B}/assets/`),$(`${B}/personnel/`),$(`${B}/materials/`)]),d=t.ok?await t.json():[];window.allClients=ue=Array.isArray(d)?d:[];const c=n.ok?await n.json():[];window.allServices=Ke=Array.isArray(c)?c:[];const m=r.ok?await r.json():[];window.allProjects=pe=Array.isArray(m)?m:[];const f=a.ok?await a.json():[];window.allCategories=me=Array.isArray(f)?f:[];const s=i.ok?await i.json():[];window.allAssets=W=Array.isArray(s)?s:[];const p=l.ok?await l.json():[];window.allPersonnel=h=Array.isArray(p)?p:[];const y=u.ok?await u.json():{};window.allMaterials=X=Array.isArray(y.materials)?y.materials:Array.isArray(y)?y:[],Se=Date.now(),K(),populatePlanDropdownSelectors(),updatePendingInboxBadge()}catch(t){console.error("Error al cargar datos maestros:",t)}finally{k=null}})(),k))}function K(){const o=window.allClients&&window.allClients.length>0?window.allClients:Array.isArray(ue)?ue:[],e=window.allProjects&&window.allProjects.length>0?window.allProjects:Array.isArray(pe)?pe:[],t=window.allCategories&&window.allCategories.length>0?window.allCategories:Array.isArray(me)?me:[],n=window.allAssets&&window.allAssets.length>0?window.allAssets:Array.isArray(W)?W:[];window.allMaterials&&window.allMaterials.length>0?window.allMaterials:Array.isArray(X),window.allPersonnel&&window.allPersonnel.length>0?window.allPersonnel:Array.isArray(h);const r=(s,p)=>{const y=document.getElementById(s);if(!y)return;const w=y.value;y.innerHTML=p,w&&(y.value=w)},a='<option value="">-- Seleccione Cliente --</option>'+o.map(s=>`<option value="${s.id}">[${s.code}] ${s.name} (${s.rif||"Sin RIF"})</option>`).join("");if(r("quote_client_id",a),r("new_proj_client_id",a),r("cxc_client_id",a),r("rcp_client_id",a),o.length===1){const s=document.getElementById("quote_client_id");s&&!s.value&&(s.value=String(o[0].id));const p=document.getElementById("new_proj_client_id");p&&!p.value&&(p.value=String(o[0].id))}const i='<option value="">-- Gasto General Sede (Sin Proyecto) --</option>'+e.map(s=>`<option value="${s.id}">${s.code} - ${s.name}</option>`).join("");document.getElementById("field_project_id")&&(document.getElementById("field_project_id").innerHTML=i),document.getElementById("manual_project_id")&&(document.getElementById("manual_project_id").innerHTML=i),document.getElementById("cxc_project_id")&&(document.getElementById("cxc_project_id").innerHTML=i),document.getElementById("cxp_project_id")&&(document.getElementById("cxp_project_id").innerHTML=i),document.getElementById("rcp_project_id")&&(document.getElementById("rcp_project_id").innerHTML='<option value="">-- Sin Proyecto Específico (Anticipo a Cuenta) --</option>'),document.getElementById("mc_project_id")&&(document.getElementById("mc_project_id").innerHTML='<option value="">-- Consumo Interno Taller Central (Gasto Sede) --</option>'+e.map(s=>`<option value="${s.id}">${s.code} - ${s.name}</option>`).join("")),document.getElementById("modal_target_project_id")&&(document.getElementById("modal_target_project_id").innerHTML=e.map(s=>`<option value="${s.id}">${s.code} - ${s.name} (${s.location})</option>`).join("")),document.getElementById("tg_project_id")&&(document.getElementById("tg_project_id").innerHTML='<option value="">-- Seleccione Proyecto Aprobado --</option>'+e.map(s=>`<option value="${s.id}" data-location="${s.location}">${s.code} - ${s.name} (${s.location})</option>`).join(""));const u=sortCategoriesNumerically(t).map(s=>`<option value="${s.id}">[${s.code}] ${s.name}</option>`).join("");document.getElementById("field_category_id")&&(document.getElementById("field_category_id").innerHTML=u),document.getElementById("manual_category_id")&&(document.getElementById("manual_category_id").innerHTML=u);const d='<option value="">-- No Aplica --</option>'+n.map(s=>`<option value="${s.id}">${s.asset_code} - ${s.name}</option>`).join("");document.getElementById("field_asset_id")&&(document.getElementById("field_asset_id").innerHTML=d);const c=(W||[]).filter(s=>(s.asset_type==="vehiculo"||s.asset_type==="camioneta"||s.asset_type==="transporte")&&s.is_active!==!1&&!s.current_project_id&&(s.status==="disponible_base"||s.status==="disponible"||!s.status)&&s.status!=="en_obra"&&s.status!=="en_mantenimiento"&&s.status!=="alquilado_a_tercero"&&s.status!=="desincorporado"),m=`<option value="">-- Seleccione Vehículo de Transporte (${c.length} disp. en base) --</option><option value="none">📍 Sin Vehículo Asignado (Sede Central / Taller / Custodia Interna)</option>`+c.map(s=>`<option value="${s.id}">[${s.asset_code}] ${s.name} (Placa: ${s.license_plate||"S/P"}) - ${s.current_location||"Base"}</option>`).join("");document.getElementById("tg_vehicle_id")&&(document.getElementById("tg_vehicle_id").innerHTML=m);const f='<option value="">-- Seleccione Material --</option>'+X.map(s=>`<option value="${s.id}" data-cost="${s.unit_cost_usd}" data-stock="${s.stock_quantity}" data-unit="${s.unit_measure}">[${s.code}] ${s.name} (${s.stock_quantity} ${s.unit_measure} disp. - $${s.unit_cost_usd}/u)</option>`).join("");if(document.getElementById("me_material_id")&&(document.getElementById("me_material_id").innerHTML=f),document.getElementById("mc_material_id")&&(document.getElementById("mc_material_id").innerHTML=f),h&&h.length>0){const s=h.map(p=>`<option value="${p.id}">[${p.code}] ${p.full_name}${p.role_title?" - "+p.role_title:""}</option>`).join("");document.getElementById("field_reported_by")&&(document.getElementById("field_reported_by").innerHTML=s),document.getElementById("manual_reported_by")&&(document.getElementById("manual_reported_by").innerHTML=s)}if(currentUser&&h&&h.length>0){const s=h.find(p=>p.full_name&&currentUser.username&&p.full_name.toLowerCase().includes(currentUser.username.toLowerCase())||p.role_title&&currentUser.role&&p.role_title.toLowerCase().includes(currentUser.role.toLowerCase()))||h[0];s&&(document.getElementById("field_reported_by")&&(document.getElementById("field_reported_by").value=s.id),document.getElementById("manual_reported_by")&&(document.getElementById("manual_reported_by").value=s.id))}typeof window.populateServiceCategoriesAndUnits=="function"&&window.populateServiceCategoriesAndUnits()}typeof window<"u"&&(window.loadInitialMasterData=le,window.populateSelectDropdowns=K);var Ze=window.API_BASE||window.location.origin+"/api/v1";const je=window.authFetch||function(o,e={}){const t=sessionStorage.getItem("dalor_token")||localStorage.getItem("dalor_token")||window.authToken||"",n=Object.assign({},e.headers||{});return t&&(n.Authorization="Bearer "+t),e.body&&!(e.body instanceof FormData)&&!n["Content-Type"]&&(n["Content-Type"]="application/json"),window.fetch(o,Object.assign({},e,{headers:n}))};let C=localStorage.getItem("dalor_sound_alerts")!=="false",Be=new Set,$e=!0;function et(){C=!C,localStorage.setItem("dalor_sound_alerts",C?"true":"false"),_e(),C&&be()}function _e(){const o=document.getElementById("iconSoundToggle"),e=document.getElementById("textSoundToggle"),t=document.getElementById("iconSoundToggleInbox"),n=document.getElementById("textSoundToggleInbox"),r=document.getElementById("btnSoundToggle");o&&e&&(C?(o.className="fa-solid fa-bell",e.innerText="Sonido: ON",r&&(r.style.color="#fbbf24",r.style.borderColor="#fbbf24")):(o.className="fa-solid fa-bell-slash",e.innerText="Sonido: OFF",r&&(r.style.color="#94a3b8",r.style.borderColor="#334155"))),t&&n&&(C?(t.className="fa-solid fa-bell",t.style.color="#059669",n.innerText="Alertas Sonoras: ON"):(t.className="fa-solid fa-bell-slash",t.style.color="#94a3b8",n.innerText="Alertas Sonoras: OFF"))}function be(){if(C)try{const o=window.AudioContext||window.webkitAudioContext;if(!o)return;const e=new o,t=e.currentTime,n=e.createOscillator(),r=e.createGain();n.type="sine",n.frequency.setValueAtTime(659.25,t),r.gain.setValueAtTime(.25,t),r.gain.exponentialRampToValueAtTime(.001,t+.35),n.connect(r),r.connect(e.destination),n.start(t),n.stop(t+.35);const a=e.createOscillator(),i=e.createGain();a.type="sine",a.frequency.setValueAtTime(880,t+.12),i.gain.setValueAtTime(.3,t+.12),i.gain.exponentialRampToValueAtTime(.001,t+.55),a.connect(i),i.connect(e.destination),a.start(t+.12),a.stop(t+.55)}catch(o){console.warn("Audio alert error:",o)}}function ke(o){const e=document.getElementById("toastNotificationContainer");if(!e)return;const t=document.createElement("div");t.className="toast-card-live",t.style.cssText=`

        background: #0f172a;

        color: white;

        border: 2px solid #059669;

        border-radius: 12px;

        padding: 12px 14px;

        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.6);

        pointer-events: auto;

        display: flex;

        align-items: flex-start;

        gap: 12px;

        transition: all 0.3s ease;

    `;const n=o.reported_by||"Personal de Campo",r=Number(o.amount_usd||0).toFixed(2),a=o.project_name||"Obra General",i=o.supplier_vendor||"Comercio General";t.innerHTML=`

        <div style="background: rgba(5, 150, 105, 0.2); color: #34d399; width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; animation: pulseGlowGreen 2s infinite;">

            <i class="fa-solid fa-file-invoice-dollar"></i>

        </div>

        <div style="flex: 1; min-width: 0;">

            <div style="display: flex; justify-content: space-between; align-items: center;">

                <h4 style="margin: 0; font-size: 13px; font-weight: 800; color: #34d399;">¡Nuevo Comprobante Recibido!</h4>

                <button onclick="this.closest('.toast-card-live').remove()" style="background: none; border: none; color: #94a3b8; font-size: 18px; cursor: pointer; line-height: 1; padding: 0 4px;">&times;</button>

            </div>

            <p style="margin: 3px 0 0 0; font-size: 11px; color: #cbd5e1;"><b>${n}</b> reportó factura en <b>${i}</b></p>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">

                <span style="font-size: 13px; font-weight: 900; color: var(--dalor-gold);">$${r} USD <small style="color: #94a3b8; font-weight: 600;">(${a})</small></span>

                <button onclick="switchView('inbox', 'gastos'); this.closest('.toast-card-live').remove();" style="background: #059669; color: white; border: none; padding: 5px 10px; border-radius: 6px; font-size: 11px; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 4px;">

                    <i class="fa-solid fa-stamp"></i> Auditar

                </button>

            </div>

        </div>

    `,e.appendChild(t),setTimeout(()=>{t.parentElement&&(t.style.opacity="0",t.style.transform="translateX(60px)",setTimeout(()=>t.remove(),300))},9e3)}async function Me(){try{if(!currentUser)return;const o=(currentUser.username||"").toLowerCase(),e=(currentUser.role_name||"").toLowerCase();if(o==="campo"||e.includes("supervisor")||e.includes("campo")){const c=document.getElementById("badgeInboxCount"),m=document.getElementById("badgeGastosDropdown");c&&(c.style.display="none"),m&&(m.style.display="none");return}const n=await je(`${Ze}/expenses/inbox/pending`);if(!n.ok)return;const r=await n.json(),a=Array.isArray(r)?r:[],i=a.length,l=document.getElementById("badgeInboxCount");l&&(l.innerText=i,l.style.display=i>0?"inline-block":"none");const u=document.getElementById("badgeGastosDropdown");u&&(u.innerText=i,u.style.display=i>0?"inline-block":"none");const d=new Set(a.map(c=>c.id));if(!$e){const c=a.filter(m=>!Be.has(m.id));if(c.length>0){be(),c.forEach(f=>ke(f));const m=document.getElementById("view-inbox");m&&!m.classList.contains("hidden")&&loadPendingExpensesInbox()}}Be=d,$e=!1}catch{}}setInterval(Me,5e3);_e();setInterval(()=>{je("/healthz").catch(()=>{})},3e5);typeof window<"u"&&(window.toggleSoundAlerts=et,window.updateSoundToggleUI=_e,window.playNotificationChime=be,window.showInboxToastNotification=ke,window.updatePendingInboxBadge=Me);console.log("--> DALOR SIGO-P CORE (Modular Facade) INITIALIZED");var H=window.API_BASE||window.location.origin+"/api/v1",V=window.allClients=window.allClients||[],Q=window.allServices=window.allServices||[];window.allProjects=window.allProjects||[];window.allCategories=window.allCategories||[];window.allMaterials=window.allMaterials||[];window.EXCHANGE_RATE=window.EXCHANGE_RATE||850;window.BCV_DATA=window.BCV_DATA||{rate:850,source:"BCV Oficial"};window.authToken=window.authToken||localStorage.getItem("dalor_token")||null;const tt=["Fabricación Metalmecánica","Montaje e Instalación en Sitio","Mantenimiento Industrial & Paradas","Soldadura Especializada & Pailería","Mecanizado & Torno","Arenado y Pintura Industrial","Obras Civiles & Eléctricas Asociadas"];typeof window<"u"&&(window.OFFICIAL_DALOR_APU_CATEGORIES=tt);function G(o,e={}){var t=sessionStorage.getItem("dalor_token")||localStorage.getItem("dalor_token")||window.authToken||"",n=Object.assign({},e.headers||{});return t&&(n.Authorization="Bearer "+t),e.body&&!(e.body instanceof FormData)&&!n["Content-Type"]&&(n["Content-Type"]="application/json"),e.body instanceof FormData&&delete n["Content-Type"],window.fetch(o,Object.assign({},e,{headers:n}))}let J=[],A=1,ze=10,Y="",P="",Z="",ee="";function ot(o){A=o,S();const e=document.getElementById("quotationsTableBody");e&&e.scrollIntoView({behavior:"smooth",block:"nearest"})}function nt(o){ze=parseInt(o)||10,A=1,S()}function it(o){Y=(o||"").trim().toLowerCase(),A=1,S()}function at(o){P=(o||"").trim().toLowerCase(),A=1,S()}function rt(){var o,e;Z=((o=document.getElementById("quoteFilterDateFrom"))==null?void 0:o.value)||"",ee=((e=document.getElementById("quoteFilterDateTo"))==null?void 0:e.value)||"",A=1,S()}function lt(){Y="",P="",Z="",ee="";const o=document.getElementById("quoteSearchInput");o&&(o.value="");const e=document.getElementById("quoteStatusFilter");e&&(e.value="");const t=document.getElementById("quoteFilterDateFrom");t&&(t.value="");const n=document.getElementById("quoteFilterDateTo");n&&(n.value=""),A=1,S()}function S(){const o=document.getElementById("quotationsTableBody");if(!o)return;let e=J||[];if(Y){const i=Y;e=e.filter(l=>l.quote_number&&l.quote_number.toLowerCase().includes(i)||l.client&&l.client.name&&l.client.name.toLowerCase().includes(i)||l.project_title&&l.project_title.toLowerCase().includes(i))}if(P&&(e=e.filter(i=>{const l=(i.status||"").toLowerCase();return P==="declinado"||P==="rechazado"?l==="declinado"||l==="rechazado":l===P})),Z&&(e=e.filter(i=>i.created_at&&i.created_at.substring(0,10)>=Z)),ee&&(e=e.filter(i=>i.created_at&&i.created_at.substring(0,10)<=ee)),e.length===0){o.innerHTML='<tr><td colspan="8" style="text-align: center; padding: 20px; color: #94a3b8;">No se encontraron cotizaciones con los criterios seleccionados.</td></tr>';const i=document.getElementById("quotationsPaginationContainer");i&&(i.innerHTML="");return}const t=typeof window.renderPaginationControls=="function"?window.renderPaginationControls:typeof D=="function"?D:()=>({startIndex:0,endIndex:e.length}),{startIndex:n,endIndex:r}=t({containerId:"quotationsPaginationContainer",totalItems:e.length,currentPage:A,pageSize:ze,onPageChange:"goToQuotationsPage",onPageSizeChange:"changeQuotationsPageSize",itemLabel:"cotización(es)",pageSizeOptions:[10,20,50,100]}),a=e.slice(n,r);o.innerHTML=a.map(i=>{const l=i.client?i.client.name:"Cliente General",u=(i.status||"borrador").toLowerCase(),d=u==="aprobado",c=u==="declinado"||u==="rechazado",m=Number(i.subtotal_usd||0),f=Number(i.tax_usd||0),s=Number(i.total_usd||0);let p="#f1f5f9",y="#475569",w="1px solid #e2e8f0",_=u.toUpperCase();return d?(p="#dcfce7",y="#166534",w="1px solid #bbf7d0",_="APROBADO"):c&&(p="#fee2e2",y="#991b1b",w="1px solid #fecaca",_="DECLINADO"),`
        <tr>
            <td style="font-weight: 800; color: var(--dalor-blue);">
                ${i.quote_number}
                <div style="font-size: 10px; color: #64748b; font-weight: normal; margin-top: 2px;">
                    <i class="fa-regular fa-calendar-days" style="color: var(--dalor-gold);"></i> ${i.created_at?i.created_at.includes("-")?(g=>`${g[2]}/${g[1]}/${g[0]}`)(i.created_at.substring(0,10).split("-")):new Date(i.created_at).toLocaleDateString("es-VE"):"-"}
                </div>
            </td>
            <td style="font-weight: 600;">${l}</td>
            <td>${i.project_title}</td>
            <td style="font-weight: 700;">$${m.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
            <td style="color: ${f===0?"#10b981":"#64748b"}; font-weight: 700;">
                ${f===0?"EXENTO (0%)":`$${f.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`}
            </td>
            <td style="font-weight: 800; color: var(--dalor-navy);">$${s.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
            <td>
                <span style="font-size: 10px; padding: 3px 8px; border-radius: 9999px; font-weight: 800; background: ${p}; color: ${y}; border: ${w}; display: inline-block;">
                    ${_}
                </span>
            </td>
            <td style="text-align: center; white-space: nowrap;">
                <button onclick="editQuotation(${i.id})" class="btn-secondary" style="padding: 4px 8px; font-size: 11px; margin-right: 4px; color: #0284c7; font-weight: 700;" title="Re-editar Cotización">
                    <i class="fa-solid fa-pen-to-square"></i> Re-editar
                </button>
                <button onclick="printQuotation(${i.id})" class="btn-secondary" style="padding: 4px 8px; font-size: 11px;" title="Imprimir / Exportar Cotización">
                    <i class="fa-solid fa-print"></i>
                </button>
                ${d?`
                    <span style="font-size: 11px; color: #059669; font-weight: bold; margin-left: 6px;"><i class="fa-solid fa-check-circle"></i> Obra Activa</span>
                `:c?`
                    <button onclick="reopenQuotation(${i.id})" class="btn-secondary" style="padding: 4px 8px; font-size: 11px; margin-left: 4px; color: #0284c7; border: 1px solid #bae6fd; font-weight: 600;" title="Reabrir a Borrador para renegociar">
                        <i class="fa-solid fa-rotate-left"></i> Reabrir
                    </button>
                `:`
                    <button onclick="convertQuoteToProject(${i.id})" class="btn-primary" style="padding: 4px 8px; font-size: 11px; margin-left: 4px; background: #059669;" title="Aprobar y Convertir en Proyecto">
                        <i class="fa-solid fa-check"></i> Convertir en Proyecto
                    </button>
                    <button onclick="declineQuotation(${i.id})" class="btn-secondary" style="padding: 4px 8px; font-size: 11px; margin-left: 4px; color: #dc2626; border: 1px solid #fecaca; font-weight: 600;" title="Marcar como Declinado por el cliente">
                        <i class="fa-solid fa-xmark"></i> Declinó
                    </button>
                `}
            </td>
        </tr>`}).join("")}async function st(){const o=document.getElementById("quotationsTableBody"),e=Array.isArray(J)&&J.length>0;e?S():o&&(o.innerHTML='<tr><td colspan="8" style="text-align: center; padding: 20px; color: #94a3b8;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando cotizaciones...</td></tr>');try{const t=!V||V.length===0||!Q||Q.length===0;let n,r,a;if(t){if([n,r,a]=await Promise.all([G(`${H}/quotations/`),G(`${H}/clients/`),G(`${H}/services/`)]),r&&r.ok){const l=await r.json();V=Array.isArray(l)?l:[],window.allClients=V}if(a&&a.ok){const l=await a.json();Q=Array.isArray(l)?l:[],window.allServices=Q}}else n=await G(`${H}/quotations/`);try{typeof window.populateSelectDropdowns=="function"?window.populateSelectDropdowns():typeof K=="function"&&K()}catch(l){console.warn("Aviso al poblar dropdowns de cotizaciones:",l)}if(!n.ok)throw new Error("Error HTTP "+n.status);const i=await n.json();J=Array.isArray(i)?i:[],S()}catch(t){console.error("Error al cargar cotizaciones:",t),!e&&o&&(o.innerHTML=`<tr><td colspan="8" style="text-align: center; color: #e11d48; padding: 20px;">Error al cargar cotizaciones: ${t.message||"Error de conexión"}</td></tr>`)}}typeof window<"u"&&(window.goToQuotationsPage=ot,window.changeQuotationsPageSize=nt,window.onQuotationSearchInput=it,window.onQuotationStatusFilterChange=at,window.onQuotationDateFilterChange=rt,window.clearQuotationFilters=lt,window.renderQuotationsPaginated=S,window.loadQuotations=st);var v=window.API_BASE||window.location.origin+"/api/v1",I=window.allClients=window.allClients||[],F=window.allServices=window.allServices||[],Ce=window.allProjects=window.allProjects||[];window.allCategories=window.allCategories||[];window.allMaterials=window.allMaterials||[];var te=window.EXCHANGE_RATE=window.EXCHANGE_RATE||850;window.BCV_DATA=window.BCV_DATA||{rate:850,source:"BCV Oficial"};window.authToken=window.authToken||localStorage.getItem("dalor_token")||null;const dt=["Fabricación Metalmecánica","Montaje e Instalación en Sitio","Mantenimiento Industrial & Paradas","Soldadura Especializada & Pailería","Mecanizado & Torno","Arenado y Pintura Industrial","Obras Civiles & Eléctricas Asociadas"];typeof window<"u"&&(window.OFFICIAL_DALOR_APU_CATEGORIES=dt);function x(o,e={}){var t=sessionStorage.getItem("dalor_token")||localStorage.getItem("dalor_token")||window.authToken||"",n=Object.assign({},e.headers||{});return t&&(n.Authorization="Bearer "+t),e.body&&!(e.body instanceof FormData)&&!n["Content-Type"]&&(n["Content-Type"]="application/json"),e.body instanceof FormData&&delete n["Content-Type"],window.fetch(o,Object.assign({},e,{headers:n}))}let oe=0;async function ct(){var l;oe=0;const o=document.getElementById("edit_quotation_id");o&&(o.value="");const e=document.getElementById("modalQuotationTitle");e&&(e.innerHTML='<i class="fa-solid fa-calculator" style="color: var(--dalor-blue);"></i> Armar Presupuesto / Cotización Formal (APU)');const t=document.getElementById("btnSubmitQuotation");t&&(t.innerHTML='<i class="fa-solid fa-floppy-disk"></i> Guardar Presupuesto');const n=document.getElementById("quoteForm");n&&n.reset(),document.getElementById("quote_coletilla_divisas")&&(document.getElementById("quote_coletilla_divisas").checked=!0),document.getElementById("quote_coletilla_modalidad")&&(document.getElementById("quote_coletilla_modalidad").checked=!0),document.getElementById("quote_coletilla_bolivares")&&(document.getElementById("quote_coletilla_bolivares").checked=!1),document.getElementById("quote_notes")&&(document.getElementById("quote_notes").value=""),document.getElementById("quote_execution_time")&&(document.getElementById("quote_execution_time").value="15 días hábiles"),document.getElementById("quote_date")&&(document.getElementById("quote_date").value=new Date().toISOString().substring(0,10)),document.getElementById("quote_validity")&&(document.getElementById("quote_validity").value=15);const r=document.getElementById("quoteClientRiskAlert");r&&(r.style.display="none");const a=document.getElementById("quoteItemsList");a&&(a.innerHTML="");try{if((window.allClients&&window.allClients.length>0?window.allClients:I||[]).length===0){const d=window.authToken||localStorage.getItem("dalor_token")||null,c=d?{Authorization:`Bearer ${d}`}:{},m=await x(`${v}/clients/`,{headers:c});if(m.ok){const f=await m.json();I=window.allClients=Array.isArray(f)?f:[]}}if(!window._servicesLoaded){const d=window.authToken||localStorage.getItem("dalor_token")||null,c=d?{Authorization:`Bearer ${d}`}:{},m=await x(`${v}/services/`,{headers:c});if(m.ok){const f=await m.json();F=window.allServices=Array.isArray(f)?f:[],window._servicesLoaded=!0}}}catch(u){console.warn("Error cargando clientes o servicios para cotización:",u)}typeof window.populateSelectDropdowns=="function"&&window.populateSelectDropdowns();const i=document.getElementById("quote_client_id");if(i){const u=window.allClients&&window.allClients.length>0?window.allClients:I||[];if(u.length>0){let d='<option value="">-- Seleccione Cliente --</option>'+u.map(c=>`<option value="${c.id}">[${c.code}] ${c.name} (${c.rif||"Sin RIF"})</option>`).join("");i.innerHTML=d,u.length===1&&(i.value=String(u[0].id))}}document.getElementById("quote_tax_type")&&(document.getElementById("quote_tax_type").value="16"),document.getElementById("quote_tax_percent")&&(document.getElementById("quote_tax_percent").value="16"),document.getElementById("quote_execution_time")&&(document.getElementById("quote_execution_time").value="15 días hábiles"),document.getElementById("quote_currency")&&(document.getElementById("quote_currency").value="USD"),document.getElementById("quote_coletilla_divisas")&&(document.getElementById("quote_coletilla_divisas").checked=!1),document.getElementById("quote_coletilla_modalidad")&&(document.getElementById("quote_coletilla_modalidad").checked=!1),document.getElementById("quote_notes")&&(document.getElementById("quote_notes").value=""),ne(),T(),Ne(),typeof window.openModal=="function"?window.openModal("modalQuotation"):(l=document.getElementById("modalQuotation"))==null||l.classList.remove("hidden")}function ut(){const o=document.getElementById("quote_tax_type").value;document.getElementById("quote_tax_percent").value=o,T()}function ne(o=null){oe++;const e=document.getElementById("quoteItemsList");if(!e)return;const t=`quote_row_${oe}`,r=`<option value="">${F&&F.length>0?"-- Partida del Catálogo --":"-- Catálogo en blanco (escriba partida manual) --"}</option>`+(F||[]).map(m=>{const f=o&&(String(o.service_id)===String(m.id)||String(o.item_code)===String(m.code));return`<option value="${m.id}" data-code="${m.code}" data-unit="${m.unit_measure}" data-price="${m.unit_price_usd}" ${f?"selected":""}>[${m.code}] ${m.name} ($${m.unit_price_usd}/${m.unit_measure})</option>`}).join(""),a=o?(o.description||"").replaceAll('"',"&quot;"):"",i=o&&o.unit_measure||"Global",l=o&&o.quantity!==void 0?o.quantity:1,u=o&&o.unit_price_usd!==void 0?o.unit_price_usd:0,d=(l*u).toFixed(2),c=document.createElement("div");c.id=t,c.style.cssText="display: grid; grid-template-columns: 4fr 1fr 1fr 1fr 1fr 30px; gap: 6px; background: white; padding: 8px; border-radius: 8px; border: 1px solid #cbd5e1; align-items: center;",c.innerHTML=`

        <div>

            <select class="form-select q-srv-select" style="font-size: 11px; padding: 5px;" onchange="onServiceSelected('${t}')">

                ${r}

            </select>

            <input type="text" class="form-input q-desc" placeholder="Descripción detallada de la partida / APU" value="${a}" autocomplete="off" style="font-size: 11px; padding: 4px 6px; margin-top: 4px;" required>

        </div>

        <div>
            <input type="text" class="form-input q-unit" list="datalist_units" placeholder="Und / Medida" value="${i}" style="font-size: 11px; padding: 5px; font-weight: 700; color: #1e293b;" title="Selecciona o escribe cualquier unidad de medida (ej: Ton, Kg, m, Pulg-Diam, HH, Und)">
            <datalist id="datalist_units">
                ${Array.from(new Set(["Global","Und","Pza","m","m²","m³","ml","Kg","Ton","Litro","Galón","Horas","HH","Días","Punto","Juego","Pulg-Diam",...(F||[]).map(m=>(m.unit_measure||"").trim()).filter(Boolean)])).map(m=>`<option value="${m}">`).join("")}
            </datalist>
        </div>

        <div>
            <input type="text" inputmode="decimal" class="form-input q-qty" placeholder="Cant" value="${l}" oninput="recalcQuotationTotals()" autocomplete="off" style="font-size: 11px; padding: 5px; font-weight: bold;" required>
        </div>

        <div>
            <input type="text" inputmode="decimal" class="form-input q-price" placeholder="P. Unit ($)" value="${u}" oninput="recalcQuotationTotals()" autocomplete="off" style="font-size: 11px; padding: 5px; font-weight: bold; color: var(--dalor-blue);" required>
        </div>

        <div>
            <input type="text" class="form-input q-total" placeholder="Total ($)" value="$${d}" style="font-size: 11px; padding: 5px; font-weight: 800;" readonly>
        </div>

        <div style="text-align: center;">

            <button type="button" onclick="removeQuotationRow('${t}')" style="background: none; border: none; color: #ef4444; font-size: 16px; cursor: pointer;">&times;</button>

        </div>

    `,e.appendChild(c)}function pt(o){const e=document.getElementById(o);e&&e.remove(),T()}function mt(o){const e=document.getElementById(o);if(!e)return;const t=e.querySelector(".q-srv-select"),n=t?t.options[t.selectedIndex]:null;n&&n.value&&(e.querySelector(".q-desc").value=n.text.replace(/\[.*?\]\s*/,"").split(" ($")[0],e.querySelector(".q-unit").value=n.getAttribute("data-unit")||"Global",e.querySelector(".q-price").value=parseFloat(n.getAttribute("data-price")||0).toFixed(2)),T()}function T(){var m;const o=document.querySelectorAll("#quoteItemsList > div");let e=0;o.forEach(f=>{const s=f.querySelector(".q-qty"),p=f.querySelector(".q-price"),y=f.querySelector(".q-total"),w=parseLocalizedNumber(s?s.value:0),_=parseLocalizedNumber(p?p.value:0),g=w*_;y&&(y.value=`$${g.toFixed(2)}`),e+=g});const t=parseFloat(document.getElementById("quote_tax_percent")?document.getElementById("quote_tax_percent").value:16)||0,n=e*(t/100),r=e+n,a=document.getElementById("quote_subtotal_display"),i=document.getElementById("quote_tax_display"),l=document.getElementById("quote_total_display"),u=(((m=document.getElementById("quote_currency"))==null?void 0:m.value)||"USD").toUpperCase(),d=document.getElementById("quote_bcv_banner_box");d&&(d.style.display=u==="VES"?"block":"none");const c=typeof te<"u"?te:850;if(u==="VES"){const f=e*c,s=n*c,p=r*c;a&&(a.innerHTML=`$${e.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}<br><span style="font-size:11px; color:#fde047;">Bs. ${f.toLocaleString("es-VE",{minimumFractionDigits:2,maximumFractionDigits:2})}</span>`),i&&(i.innerHTML=t===0?"EXENTO (0%)":`$${n.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}<br><span style="font-size:11px; color:#fde047;">Bs. ${s.toLocaleString("es-VE",{minimumFractionDigits:2,maximumFractionDigits:2})}</span>`),l&&(l.innerHTML=`$${r.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}<br><span style="font-size:12px; color:#fde047;">Bs. ${p.toLocaleString("es-VE",{minimumFractionDigits:2,maximumFractionDigits:2})}</span>`)}else a&&(a.innerText=`$${e.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`),i&&(i.innerText=t===0?"EXENTO (0%)":`$${n.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`),l&&(l.innerText=`$${r.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`)}function Ne(){T()}async function ft(o){var e;try{const t=window.authToken||localStorage.getItem("dalor_token")||null,n=t?{Authorization:`Bearer ${t}`}:{};if((window.allClients&&window.allClients.length>0?window.allClients:I||[]).length===0){const f=await x(`${v}/clients/`,{headers:n});if(f.ok){const s=await f.json();I=window.allClients=Array.isArray(s)?s:[]}}if(!window._servicesLoaded){const f=await x(`${v}/services/`,{headers:n});if(f.ok){const s=await f.json();F=window.allServices=Array.isArray(s)?s:[],window._servicesLoaded=!0}}typeof window.populateSelectDropdowns=="function"&&window.populateSelectDropdowns();const a=await x(`${v}/quotations/${o}`,{headers:n});if(!a.ok)throw new Error("No se pudo cargar la cotización para edición.");const i=await a.json(),l=document.getElementById("edit_quotation_id");l&&(l.value=i.id);const u=document.getElementById("modalQuotationTitle");u&&(u.innerHTML=`<i class="fa-solid fa-pen-to-square" style="color: var(--dalor-gold);"></i> Re-editar Presupuesto / Cotización [${i.quote_number}]`);const d=document.getElementById("btnSubmitQuotation");d&&(d.innerHTML='<i class="fa-solid fa-floppy-disk"></i> Guardar Cambios de Presupuesto');const c=document.getElementById("quote_client_id");if(c){const f=window.allClients&&window.allClients.length>0?window.allClients:I||[];if(f.length>0){let s='<option value="">-- Seleccione Cliente --</option>'+f.map(p=>`<option value="${p.id}">[${p.code}] ${p.name} (${p.rif||"Sin RIF"})</option>`).join("");c.innerHTML=s}i.client_id&&(c.value=String(i.client_id))}if(document.getElementById("quote_title")&&(document.getElementById("quote_title").value=i.project_title||""),document.getElementById("quote_location")&&(document.getElementById("quote_location").value=i.location||"Sede Central"),document.getElementById("quote_date")){let f="";i.created_at?f=i.created_at.substring(0,10):f=new Date().toISOString().substring(0,10),document.getElementById("quote_date").value=f}document.getElementById("quote_execution_time")&&(document.getElementById("quote_execution_time").value=i.execution_time||"15 días hábiles"),document.getElementById("quote_validity")&&(document.getElementById("quote_validity").value=i.validity_days||15),document.getElementById("quote_currency")&&(document.getElementById("quote_currency").value=i.currency||"USD"),document.getElementById("quote_tax_percent")&&(document.getElementById("quote_tax_percent").value=i.tax_percent!==void 0&&i.tax_percent!==null?i.tax_percent:i.tax_usd>0?16:0),document.getElementById("quote_notes")&&(document.getElementById("quote_notes").value=i.notes||""),document.getElementById("quote_coletilla_divisas")&&(document.getElementById("quote_coletilla_divisas").checked=i.coletilla_divisas!==!1),document.getElementById("quote_coletilla_modalidad")&&(document.getElementById("quote_coletilla_modalidad").checked=i.coletilla_modalidad!==!1),document.getElementById("quote_coletilla_bolivares")&&(document.getElementById("quote_coletilla_bolivares").checked=!!i.coletilla_bolivares);const m=document.getElementById("quoteItemsList");m&&(m.innerHTML="",oe=0,i.items&&i.items.length>0?i.items.forEach(f=>ne(f)):ne()),T(),typeof window.openModal=="function"?window.openModal("modalQuotation"):(e=document.getElementById("modalQuotation"))==null||e.classList.remove("hidden")}catch(t){console.error("Error al re-editar presupuesto:",t),alert("Error cargando presupuesto: "+t.message)}}async function gt(o){var m,f;o&&o.preventDefault&&o.preventDefault();const e=document.getElementById("quote_client_id"),t=e?parseInt(e.value):null;if(!t){alert("Por favor selecciona un cliente de la lista.");return}const n=document.querySelectorAll("#quoteItemsList > div");let r=[];if(n.forEach(s=>{const p=s.querySelector(".q-srv-select"),y=p&&p.value?parseInt(p.value):null,w=p?p.options[p.selectedIndex]:null,_=w?w.getAttribute("data-code"):null,g=s.querySelector(".q-desc")?s.querySelector(".q-desc").value:"",b=s.querySelector(".q-unit")?s.querySelector(".q-unit").value:"Global",de=s.querySelector(".q-qty")?s.querySelector(".q-qty").value:"1",ce=s.querySelector(".q-price")?s.querySelector(".q-price").value:"0",Ee=parseLocalizedNumber(de)||1,Ie=parseLocalizedNumber(ce)||0;r.push({service_id:y,item_code:_,description:g,unit_measure:b,quantity:Ee,unit_price_usd:Ie,total_usd:Number((Ee*Ie).toFixed(2))})}),r.length===0){alert("Agrega al menos una partida a la cotización.");return}const a=document.getElementById("edit_quotation_id")?document.getElementById("edit_quotation_id").value:"",i=!!a,l=document.getElementById("quote_date")?document.getElementById("quote_date").value:"";let u;l&&(u=`${l}T12:00:00`);const d={client_id:t,project_title:document.getElementById("quote_title").value,location:document.getElementById("quote_location").value||"Sede Central",execution_time:(document.getElementById("quote_execution_time").value||"").trim()||"15 días hábiles",currency:document.getElementById("quote_currency").value||"USD",validity_days:parseInt(document.getElementById("quote_validity")?document.getElementById("quote_validity").value:15)||15,tax_percent:parseLocalizedNumber((m=document.getElementById("quote_tax_percent"))==null?void 0:m.value)||0,exchange_rate:typeof te<"u"?te:850,notes:(((f=document.getElementById("quote_notes"))==null?void 0:f.value)||"").trim(),coletilla_divisas:document.getElementById("quote_coletilla_divisas")?document.getElementById("quote_coletilla_divisas").checked:!1,coletilla_modalidad:document.getElementById("quote_coletilla_modalidad")?document.getElementById("quote_coletilla_modalidad").checked:!1,coletilla_bolivares:document.getElementById("quote_coletilla_bolivares")?document.getElementById("quote_coletilla_bolivares").checked:!1,created_at:u,items:r},c=document.getElementById("btnSubmitQuotation");c&&(c.disabled=!0,c.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Guardando...');try{const s=i?`${v}/quotations/${a}`:`${v}/quotations/`,y=await x(s,{method:i?"PUT":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(d)});if(!y.ok){let g="Error al guardar el presupuesto";try{const b=await y.json();b&&b.detail&&(g=typeof b.detail=="string"?b.detail:JSON.stringify(b.detail))}catch{}throw new Error(g)}const w=await y.json();ie("modalQuotation");const _=document.getElementById("quoteForm")||document.getElementById("quotationForm");_&&_.reset(),document.getElementById("edit_quotation_id")&&(document.getElementById("edit_quotation_id").value=""),typeof showToastNotification=="function"?showToastNotification(i?`Presupuesto ${w.quote_number||""} actualizado con éxito`:`Presupuesto ${w.quote_number||""} emitido con éxito`,"success"):typeof showToast=="function"?showToast(i?`Presupuesto ${w.quote_number||""} actualizado con éxito`:"Presupuesto creado con éxito","success"):alert(i?"Presupuesto actualizado con éxito.":"Presupuesto creado con éxito."),await loadQuotations()}catch(s){console.error("Error al guardar presupuesto:",s),typeof Swal<"u"?Swal.fire({icon:"error",title:"Error al Guardar Presupuesto",text:s.message||String(s)}):alert("Error al guardar presupuesto: "+s.message)}finally{c&&(c.disabled=!1,c.innerHTML='<i class="fa-solid fa-floppy-disk"></i> Guardar Presupuesto')}}function wt(){const o=document.getElementById("converting_quotation_id");o&&(o.value=""),sessionStorage.removeItem("dalor_active_converting_quote_id");const e=document.getElementById("quote_conversion_banner");e&&e.classList.add("hidden");const t=document.getElementById("projectCreateForm");t&&t.reset(),switchProjectSubtab("list")}async function yt(o){try{if(sessionStorage.setItem("dalor_active_converting_quote_id",String(o)),!I||I.length===0)try{const p=await x(`${v}/clients/`);p.ok&&(I=await p.json())}catch{}const e=await x(`${v}/quotations/${o}`);if(!e.ok)throw new Error("No se pudo cargar la información del presupuesto.");const t=await e.json();switchView("projects","proyectos"),switchProjectSubtab("form"),typeof window.populatePlanDropdownSelectors=="function"&&window.populatePlanDropdownSelectors();const n=document.getElementById("converting_quotation_id");n&&(n.value=t.id);const r=document.getElementById("quote_conversion_banner"),a=document.getElementById("quote_conversion_text");r&&r.classList.remove("hidden");const i=t.client?t.client.name:t.client_name||"Cliente";a&&(a.innerText=`Presupuesto [${t.quote_number}] para ${i}. Monto: $${t.total_usd.toLocaleString("en-US",{minimumFractionDigits:2})}. Revisa y completa los campos a continuación:`);const l=document.getElementById("new_proj_code");if(l&&(l.readOnly=!0,l.style.backgroundColor="#f1f5f9",l.style.cursor="not-allowed",x(`${v}/projects/next-code`).then(p=>p.json()).then(p=>{p&&p.next_code&&l&&(l.value=p.next_code)}).catch(p=>{console.warn("Fallback cálculo código proyecto:",p);const y=(Ce?Ce.length:0)+1;l&&(l.value=`PRJ-2026-${String(y).padStart(3,"0")}`)})),document.getElementById("new_proj_name")&&(document.getElementById("new_proj_name").value=t.project_title||""),document.getElementById("new_proj_start_date")){let p=(t.created_at||"").substring(0,10);document.getElementById("new_proj_start_date").value=p||new Date().toISOString().substring(0,10)}const u=document.getElementById("new_proj_client_id");u&&t.client_id&&(u.value=String(t.client_id));const d=(t.location||"").trim(),c=!d||d.toLowerCase().includes("sede")||d.toLowerCase().includes("central")||d.toLowerCase().includes("taller")||d.toLowerCase().includes("guacara");typeof setProjectType=="function"?setProjectType(c?"sede":"foraneo"):typeof window.setProjectType=="function"&&window.setProjectType(c?"sede":"foraneo"),document.getElementById("new_proj_location")&&(document.getElementById("new_proj_location").value=d||(c?"Sede Central (Taller Guacara)":""));let m=30;if(t.execution_time){const p=t.execution_time.match(/\d+/);p&&(m=parseInt(p[0]))}document.getElementById("new_proj_duration")&&(document.getElementById("new_proj_duration").value=m),document.getElementById("new_proj_contract")&&(document.getElementById("new_proj_contract").value=t.total_usd.toFixed(2));let f=`Obra adjudicada bajo Presupuesto ${t.quote_number}.
Partidas y APU contratadas:
`;t.items&&t.items.length>0?f+=t.items.map((p,y)=>`${y+1}. [${p.item_code||"SER"}] ${p.description} (Cant: ${p.quantity} ${p.unit_measure||"Global"})`).join(`
`):f+=t.project_title,document.getElementById("new_proj_scope")&&(document.getElementById("new_proj_scope").value=f),document.getElementById("new_proj_labor")&&(document.getElementById("new_proj_labor").value="0.00"),document.getElementById("new_proj_fuel")&&(document.getElementById("new_proj_fuel").value="0.00"),document.getElementById("new_proj_tools")&&(document.getElementById("new_proj_tools").value="0.00"),document.getElementById("new_proj_services")&&(document.getElementById("new_proj_services").value="0.00"),typeof updatePlanMaterialsCostTotal=="function"?updatePlanMaterialsCostTotal():typeof window.updatePlanMaterialsCostTotal=="function"?window.updatePlanMaterialsCostTotal():document.getElementById("new_proj_materials")&&(document.getElementById("new_proj_materials").value="0.00");const s=document.getElementById("projectPhasesContainer");s&&typeof addProjectPhaseRow=="function"&&(s.innerHTML="",window.phaseRowsCount=0,addProjectPhaseRow("Fase 1: Ejecución del Proyecto",[],m,0)),recalcProjectBudgetPreview(),window.scrollTo({top:0,behavior:"smooth"})}catch(e){console.error("Error al convertir presupuesto:",e),alert("Error al vincular presupuesto: "+e.message)}}async function Oe(o){const e=document.getElementById("quoteClientRiskAlert"),t=document.getElementById("quoteClientRiskDetails");if(!e||!o){e&&(e.style.display="none");return}try{const n=await x(`${v}/clients/${o}/credit-risk`);if(!n.ok){e.style.display="none";return}const r=await n.json();if(r&&r.has_risk){let a=(r.bad_debts||[]).map(i=>`"¢ <strong>${i.invoice_number||"Doc"}</strong>: $${(i.amount_usd||0).toFixed(2)} USD <em>(${i.reason||"Sin motivo"})</em>`).join("<br>");t&&(t.innerHTML=`
                    Este cliente posee antecedentes de <strong>cuenta incobrable / castigada</strong> por un total de <strong>$${(r.total_bad_debt_usd||0).toFixed(2)} USD</strong>.<br>
                    <div style="margin-top: 4px; padding: 4px 6px; background: rgba(255,255,255,0.7); border-radius: 4px;">${a}</div>
                    <span style="font-size: 10px; color: #881337; margin-top: 4px; display: block;">
                        <strong>Decisión Operativa:</strong> Puede autorizar emitir esta cotización bajo supervisión comercial o cambiar a otro cliente.
                    </span>
                `),e.style.display="block",window.quoteClientRiskDismissed=!1}else e.style.display="none",window.quoteClientRiskDismissed=!0}catch(n){console.warn("Error al verificar riesgo crediticio:",n),e&&(e.style.display="none")}}function _t(o){if(!o){const e=document.getElementById("quoteClientRiskAlert");e&&(e.style.display="none");return}Oe(o)}function bt(){const o=document.getElementById("quoteClientRiskAlert");o&&(o.style.display="none"),window.quoteClientRiskDismissed=!0;const e=document.getElementById("quote_client_id"),t=e?e.options[e.selectedIndex]:null;t&&console.log(`[Riesgo Crediticio] Cliente ${t.text} autorizado manualmente para cotización.`)}function vt(){const o=document.getElementById("quote_client_id");o&&(o.value="");const e=document.getElementById("quoteClientRiskAlert");e&&(e.style.display="none"),window.quoteClientRiskDismissed=!1}async function xt(o){if(!confirm(`¿El cliente ha declinado o rechazado esta cotización?

Se marcará como DECLINADA en el sistema. Esto no genera proyectos ni afectará la caja.`))return;const e=prompt("Indica opcionalmente el motivo del rechazo (ej: Precio fuera de presupuesto, Plazo de entrega, Desistimiento del cliente):","")||"";try{const t=`${v}/quotations/${o}/decline`+(e?`?reason=${encodeURIComponent(e)}`:""),n=await x(t,{method:"POST"});if(!n.ok){const a=await n.json().catch(()=>({}));throw new Error(a.detail||"Error al declinar cotización.")}const r=await n.json();typeof showNotification=="function"?showNotification(r.message||"Cotización marcada como DECLINADA.","info"):typeof alert=="function"&&alert(r.message||"Cotización marcada como DECLINADA."),typeof loadQuotations=="function"&&await loadQuotations()}catch(t){console.error("Error al declinar presupuesto:",t),alert(t.message||"No se pudo registrar la declinación.")}}async function ht(o){if(confirm("¿Deseas reactivar esta cotización y devolverla al estado BORRADOR para volver a editarla o renegociarla?"))try{const e=await x(`${v}/quotations/${o}/reopen`,{method:"POST"});if(!e.ok){const n=await e.json().catch(()=>({}));throw new Error(n.detail||"Error al reabrir cotización.")}const t=await e.json();typeof showNotification=="function"?showNotification(t.message||"Cotización reactivada como Borrador.","success"):typeof alert=="function"&&alert(t.message||"Cotización reactivada como Borrador."),typeof loadQuotations=="function"&&await loadQuotations()}catch(e){console.error("Error al reabrir presupuesto:",e),alert(e.message||"No se pudo reabrir la cotización.")}}typeof window<"u"&&(window.openNewQuotationModal=ct,window.onTaxTypeChanged=ut,window.addQuotationRow=ne,window.removeQuotationRow=pt,window.onServiceSelected=mt,window.recalcQuotationTotals=T,window.onQuotationCurrencyChanged=Ne,window.editQuotation=ft,window.submitCreateQuotation=gt,window.cancelQuotationConversion=wt,window.convertQuoteToProject=yt,window.declineQuotation=xt,window.reopenQuotation=ht,window.checkQuoteClientCreditRisk=Oe,window.onQuoteClientChanged=_t,window.confirmQuoteClientRisk=bt,window.cancelQuoteClientRisk=vt);var Et=window.API_BASE||window.location.origin+"/api/v1";window.allClients=window.allClients||[];window.allServices=window.allServices||[];window.allProjects=window.allProjects||[];window.allCategories=window.allCategories||[];window.allMaterials=window.allMaterials||[];var It=window.EXCHANGE_RATE=window.EXCHANGE_RATE||850;window.BCV_DATA=window.BCV_DATA||{rate:850,source:"BCV Oficial"};window.authToken=window.authToken||localStorage.getItem("dalor_token")||null;const St=["Fabricación Metalmecánica","Montaje e Instalación en Sitio","Mantenimiento Industrial & Paradas","Soldadura Especializada & Pailería","Mecanizado & Torno","Arenado y Pintura Industrial","Obras Civiles & Eléctricas Asociadas"];typeof window<"u"&&(window.OFFICIAL_DALOR_APU_CATEGORIES=St);function Bt(o,e={}){var t=sessionStorage.getItem("dalor_token")||localStorage.getItem("dalor_token")||window.authToken||"",n=Object.assign({},e.headers||{});return t&&(n.Authorization="Bearer "+t),e.body&&!(e.body instanceof FormData)&&!n["Content-Type"]&&(n["Content-Type"]="application/json"),e.body instanceof FormData&&delete n["Content-Type"],window.fetch(o,Object.assign({},e,{headers:n}))}async function $t(o){try{const e=await Bt(`${Et}/quotations/${o}`);if(!e.ok)throw new Error("No se pudo cargar la cotización.");const t=await e.json(),n=t.exchange_rate||It||800,r=(t.currency||"USD").toUpperCase();let a="$",i="USD",l="",u="",d="P. Unit ($)",c="Total ($)";if(r==="USD"){a="$",i="USD",d="P. Unit ($ USD)",c="Total ($ USD)";const w=`$${t.subtotal_usd.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`,_=t.tax_usd===0?"EXENTO (0%)":`$${t.tax_usd.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`,g=`$${t.total_usd.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`;u=`

                <div style="display: flex; justify-content: space-between; font-size: 11.5px; margin-bottom: 4px;">

                    <span style="color: #475569;">Subtotal:</span>

                    <span style="font-weight: 700; color: #1e293b;">${w}</span>

                </div>

                <div style="display: flex; justify-content: space-between; font-size: 11.5px; margin-bottom: 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">

                    <span style="color: #475569;">IVA (${t.tax_percent}%):</span>

                    <span style="font-weight: 700; color: ${t.tax_usd===0?"#10b981":"#d97706"};">${_}</span>

                </div>

                <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: 900; color: #002B49;">

                    <span>TOTAL USD:</span>

                    <span style="color: #0072B8;">${g}</span>

                </div>

            `,l=""}else if(r==="VES"){a="Bs.",i="VES",d="P. Unit (Bs.)",c="Total (Bs.)";const w=t.subtotal_usd*n,_=t.tax_usd*n,g=t.total_usd*n,b=`Bs. ${w.toLocaleString("es-VE",{minimumFractionDigits:2,maximumFractionDigits:2})}`,de=_===0?"EXENTO (0%)":`Bs. ${_.toLocaleString("es-VE",{minimumFractionDigits:2,maximumFractionDigits:2})}`,ce=`Bs. ${g.toLocaleString("es-VE",{minimumFractionDigits:2,maximumFractionDigits:2})}`;u=`

                <div style="display: flex; justify-content: space-between; font-size: 11.5px; margin-bottom: 4px;">

                    <span style="color: #475569;">Subtotal:</span>

                    <span style="font-weight: 700; color: #1e293b;">${b}</span>

                </div>

                <div style="display: flex; justify-content: space-between; font-size: 11.5px; margin-bottom: 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">

                    <span style="color: #475569;">IVA (${t.tax_percent}%):</span>

                    <span style="font-weight: 700; color: ${_===0?"#10b981":"#d97706"};">${de}</span>

                </div>

                <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: 900; color: #002B49;">

                    <span>TOTAL BS:</span>

                    <span style="color: #0072B8;">${ce}</span>

                </div>

            `,l=""}else{a="â‚¬",i="EUR",d="P. Unit (â‚¬ EUR)",c="Total (â‚¬ EUR)";const w=`â‚¬ ${t.subtotal_usd.toLocaleString("de-DE",{minimumFractionDigits:2,maximumFractionDigits:2})}`,_=t.tax_usd===0?"EXENTO (0%)":`â‚¬ ${t.tax_usd.toLocaleString("de-DE",{minimumFractionDigits:2,maximumFractionDigits:2})}`,g=`â‚¬ ${t.total_usd.toLocaleString("de-DE",{minimumFractionDigits:2,maximumFractionDigits:2})}`;u=`

                <div style="display: flex; justify-content: space-between; font-size: 11.5px; margin-bottom: 4px;">

                    <span style="color: #475569;">Subtotal:</span>

                    <span style="font-weight: 700; color: #1e293b;">${w}</span>

                </div>

                <div style="display: flex; justify-content: space-between; font-size: 11.5px; margin-bottom: 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">

                    <span style="color: #475569;">IVA (${t.tax_percent}%):</span>

                    <span style="font-weight: 700; color: ${t.tax_usd===0?"#10b981":"#d97706"};">${_}</span>

                </div>

                <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: 900; color: #002B49;">

                    <span>TOTAL EUR:</span>

                    <span style="color: #0072B8;">${g}</span>

                </div>

            `,l=""}let m=[];(t.coletilla_divisas===!0||t.terms_currency_usd_only===!0)&&m.push("<b>Condición de Pago:</b> Solo pagadero en divisas (USD)."),(t.coletilla_modalidad===!0||t.terms_check_payment_mode===!0)&&m.push("<b>Modalidad de Pago:</b> Consultar modalidad de pago."),t.coletilla_bolivares===!0&&m.push("<b>Pago en Bolívares (Bs.):</b> En caso de realizar el pago en Bolívares, se calculará a la tasa oficial del Banco Central de Venezuela (BCV) correspondiente a la fecha valor del pago efectivo.");let f="";t.notes&&t.notes.trim()&&(f=`
                <div style="background: #ffffff; border: 1.5px solid #cbd5e1; border-left: 4px solid #0072B8; border-radius: 6px; padding: 10px 14px; margin-bottom: 12px; font-size: 11px; color: #1e293b; line-height: 1.45; page-break-inside: avoid;">
                    <div style="font-weight: 800; color: #002B49; margin-bottom: 4px; text-transform: uppercase; font-size: 10.5px;">
                        <i class="fa-solid fa-clipboard-list" style="color: #0072B8;"></i> Notas & Observaciones Comerciales del Presupuesto:
                    </div>
                    <p style="margin: 0; white-space: pre-wrap;">${t.notes.trim()}</p>
                </div>
            `);let s="";m.length>0&&(s=`
                <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-left: 4px solid #F5B800; padding: 8px 12px; border-radius: 6px; margin-bottom: 12px; font-size: 10.5px; color: #334155; line-height: 1.45; page-break-inside: avoid;">
                    ${m.map(w=>`<p style="margin: 3px 0;">• ${w}</p>`).join("")}
                </div>
            `);const p=(t.items||[]).map((w,_)=>{let g=`$${w.unit_price_usd.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`,b=`$${w.total_usd.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`;return r==="VES"?(g=`Bs. ${(w.unit_price_usd*n).toLocaleString("es-VE",{minimumFractionDigits:2,maximumFractionDigits:2})}`,b=`Bs. ${(w.total_usd*n).toLocaleString("es-VE",{minimumFractionDigits:2,maximumFractionDigits:2})}`):r==="EUR"&&(g=`â‚¬ ${w.unit_price_usd.toLocaleString("de-DE",{minimumFractionDigits:2,maximumFractionDigits:2})}`,b=`â‚¬ ${w.total_usd.toLocaleString("de-DE",{minimumFractionDigits:2,maximumFractionDigits:2})}`),`

            <tr style="page-break-inside: avoid;">

                <td style="text-align: center; font-weight: bold; border: 1px solid #cbd5e1; padding: 6px 4px; font-size: 11px;">${_+1}</td>

                <td style="text-align: center; color: #0284c7; font-weight: 800; border: 1px solid #cbd5e1; padding: 6px 4px; font-size: 11px;">${w.item_code||"SER-"+(_+1)}</td>

                <td style="border: 1px solid #cbd5e1; padding: 6px 8px; font-weight: 600; font-size: 11px; line-height: 1.35;">${w.description}</td>

                <td style="text-align: center; border: 1px solid #cbd5e1; padding: 6px 4px; font-size: 11px;">${w.unit_measure||"Global"}</td>

                <td style="text-align: center; font-weight: bold; border: 1px solid #cbd5e1; padding: 6px 4px; font-size: 11px;">${w.quantity}</td>

                <td style="text-align: right; border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 11px;">${g}</td>

                <td style="text-align: right; font-weight: bold; border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 11px; color: #002B49;">${b}</td>

            </tr>`}).join(""),y=`

            <!-- Membrete DALOR -->

            <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #F5B800; padding-bottom: 10px; margin-bottom: 10px;">

                <div style="display: flex; align-items: center; gap: 12px;">

                    <img src="logo_dalor.jpg" alt="DALOR" style="height: 48px; display: block; border-radius: 4px;">

                    <div>

                        <h1 style="font-size: 17px; font-weight: 900; color: #002B49; margin: 0; letter-spacing: 0.3px;">METALMECÁNICA DALOR, C.A.</h1>

                        <p style="font-size: 10.5px; color: #475569; margin: 2px 0 0 0; font-weight: 600;">RIF: <b>J-31601195-0</b> &bull; Mantenimiento Predictivo, Proyectos Industriales & Metalmecánica</p>

                        <p style="font-size: 10px; color: #64748b; margin: 1px 0 0 0;">Av. Cámara de las Industrias, Galpón 10, Z.I. El Tigre, Guacara, Edo. Carabobo &bull; Telf: +58 0412-2407079 / 0424-4131782</p>

                    </div>

                </div>

                <div style="text-align: right;">

                    <span style="background: #002B49; color: #F5B800; padding: 4px 10px; border-radius: 6px; font-weight: 900; font-size: 13px; letter-spacing: 0.5px; display: inline-block;">${t.quote_number}</span>

                    <p style="font-size: 10.5px; color: #475569; margin: 4px 0 0 0;">Fecha: <b>${t.created_at?t.created_at.includes("-")?(w=>`${w[2]}/${w[1]}/${w[0]}`)(t.created_at.substring(0,10).split("-")):new Date(t.created_at).toLocaleDateString("es-VE"):"-"}</b></p>

                    <p style="font-size: 10.5px; color: #475569; margin: 2px 0 0 0;">Validez: <b>${t.validity_days||15} Días</b></p>

                </div>

            </div>



            <!-- Ficha de Datos: Cliente, Obra y Condiciones -->

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px; background: #f8fafc; border: 1px solid #cbd5e1; padding: 10px 12px; border-radius: 6px;">

                <div>

                    <span style="font-size: 9.5px; font-weight: 800; color: #64748b; text-transform: uppercase;">Datos del Cliente:</span>

                    <p style="font-size: 12.5px; font-weight: 800; color: #002B49; margin: 2px 0 0 0;">${t.client&&t.client.name||"Cliente General"}</p>

                    <p style="font-size: 10.5px; color: #334155; margin: 2px 0 0 0;">RIF: <b>${t.client&&t.client.rif||"-"}</b></p>

                    <p style="font-size: 10.5px; color: #475569; margin: 2px 0 0 0;">Contacto: ${t.client&&t.client.contact_name||"-"} | Tel: ${t.client&&t.client.contact_phone||"-"}</p>

                </div>

                <div>

                    <span style="font-size: 9.5px; font-weight: 800; color: #64748b; text-transform: uppercase;">Proyecto & Condiciones:</span>

                    <p style="font-size: 12.5px; font-weight: 800; color: #002B49; margin: 2px 0 0 0;">${t.project_title}</p>

                    <p style="font-size: 10.5px; color: #334155; margin: 2px 0 0 0;">Lugar de Ejecución: <b>${t.location||"Sede Central"}</b></p>

                    <p style="font-size: 10.5px; color: #0284c7; margin: 2px 0 0 0;">Tiempo de Ejecución: <b>${t.execution_time||"15 días hábiles a partir del anticipo"}</b></p>

                    <p style="font-size: 10px; color: #64748b; margin: 2px 0 0 0;">Moneda de Emisión: <b>${r==="USD"?"Dólares Americanos (USD $)":r==="VES"?"Bolívares (VES Bs.)":"Euros (EUR â‚¬)"}</b></p>

                </div>

            </div>



            <!-- Tabla de Partidas / APU -->

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 11px;">

                <thead>

                    <tr style="background: #002B49; color: white;">

                        <th style="width: 25px; padding: 6px 4px; border: 1px solid #002B49; font-size: 10.5px; text-align: center;">#</th>

                        <th style="width: 75px; padding: 6px 4px; border: 1px solid #002B49; font-size: 10.5px; text-align: center;">Código</th>

                        <th style="padding: 6px 8px; border: 1px solid #002B49; font-size: 10.5px; text-align: left;">Descripción del Servicio / Partida APU</th>

                        <th style="width: 55px; padding: 6px 4px; border: 1px solid #002B49; font-size: 10.5px; text-align: center;">Unidad</th>

                        <th style="width: 45px; padding: 6px 4px; border: 1px solid #002B49; font-size: 10.5px; text-align: center;">Cant.</th>

                        <th style="width: 95px; padding: 6px 8px; border: 1px solid #002B49; font-size: 10.5px; text-align: right;">${d}</th>

                        <th style="width: 105px; padding: 6px 8px; border: 1px solid #002B49; font-size: 10.5px; text-align: right;">${c}</th>

                    </tr>

                </thead>

                <tbody>

                    ${p}

                </tbody>

            </table>



            <!-- Bloque de Totales -->

            <div style="display: flex; justify-content: flex-end; margin-bottom: 16px; page-break-inside: avoid;">

                <div style="width: 310px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 14px;">

                    ${u}

                </div>

            </div>



            <!-- Notas y Coletillas Comerciales (Punto 4 y 5) -->
            ${f}
            ${s}

            <!-- Coletilla de Condiciones Cambiarias -->
            ${l}



            <!-- Firmas de Aprobación Formal -->

            <div style="margin-top: 25px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; text-align: center; page-break-inside: avoid;">

                <div>

                    <div style="border-bottom: 1px solid #1e293b; margin-bottom: 5px;"></div>

                    <p style="font-size: 10.5px; font-weight: 800; margin: 0; color: #002B49;">Por Metalmecánica Dalor C.A.</p>

                    <p style="font-size: 9.5px; color: #64748b; margin: 0;">Gerencia de Proyectos / Estimación</p>

                </div>

                <div>

                    <div style="border-bottom: 1px solid #1e293b; margin-bottom: 5px;"></div>

                    <p style="font-size: 10.5px; font-weight: 800; margin: 0; color: #002B49;">Aceptado y Conforme por el Cliente</p>

                    <p style="font-size: 9.5px; color: #64748b; margin: 0;">Firma y Sello de Aprobación</p>

                </div>

            </div>

        `;document.getElementById("modalPrintPreviewContent").innerHTML=y,document.getElementById("previewModalTitle").textContent=`Presupuesto ${t.quote_number} | ${t.client&&t.client.name||"Cliente"}`,document.getElementById("modalPrintPreview").classList.remove("hidden")}catch(e){alert("Error al visualizar cotización: "+e.message)}}function Ct(){var t;const o=document.getElementById("modalPrintPreviewContent"),e=((t=document.getElementById("previewModalTitle"))==null?void 0:t.textContent)||"Presupuesto DALOR";typeof window.printElementHtml=="function"&&o?window.printElementHtml(o,e):window.print()}typeof window<"u"&&(window.printQuotation=$t,window.triggerPrintFromModal=Ct);var L=window.API_BASE||window.location.origin+"/api/v1";window.allClients=window.allClients||[];var E=window.allServices=window.allServices||[];window.allProjects=window.allProjects||[];window.allCategories=window.allCategories||[];window.allMaterials=window.allMaterials||[];window.EXCHANGE_RATE=window.EXCHANGE_RATE||850;window.BCV_DATA=window.BCV_DATA||{rate:850,source:"BCV Oficial"};window.authToken=window.authToken||localStorage.getItem("dalor_token")||null;const Re=["Fabricación Metalmecánica","Montaje e Instalación en Sitio","Mantenimiento Industrial & Paradas","Soldadura Especializada & Pailería","Mecanizado & Torno","Arenado y Pintura Industrial","Obras Civiles & Eléctricas Asociadas"];typeof window<"u"&&(window.OFFICIAL_DALOR_APU_CATEGORIES=Re);function j(o,e={}){var t=sessionStorage.getItem("dalor_token")||localStorage.getItem("dalor_token")||window.authToken||"",n=Object.assign({},e.headers||{});return t&&(n.Authorization="Bearer "+t),e.body&&!(e.body instanceof FormData)&&!n["Content-Type"]&&(n["Content-Type"]="application/json"),e.body instanceof FormData&&delete n["Content-Type"],window.fetch(o,Object.assign({},e,{headers:n}))}let q=[],O=1,Ue=10,M="",fe="";function At(o){O=o,R();const e=document.getElementById("servicesTableBody");e&&e.scrollIntoView({behavior:"smooth",block:"nearest"})}function Tt(o){Ue=parseInt(o)||10,O=1,R()}function Pt(o){M=(o||"").toLowerCase().trim(),ve()}function Ft(o){fe=(o||"").trim(),ve()}function ve(){q=(E||[]).filter(o=>{const e=!M||o.name&&o.name.toLowerCase().includes(M)||o.code&&o.code.toLowerCase().includes(M)||o.unit_measure&&o.unit_measure.toLowerCase().includes(M),t=!fe||o.category===fe;return e&&t}),O=1,R()}function R(){const o=document.getElementById("servicesTableBody");if(!o)return;const e=q;if(e.length===0){o.innerHTML=`<tr><td colspan="8" style="text-align: center; padding: 25px; color: #64748b; font-weight: 500;">
            <i class="fa-solid fa-folder-open" style="font-size: 24px; color: #94a3b8; margin-bottom: 8px; display: block;"></i>
            No se encontraron partidas que coincidan con los filtros.
        </td></tr>`;const i=document.getElementById("servicesPaginationContainer");i&&(i.innerHTML="");return}const t=typeof window.renderPaginationControls=="function"?window.renderPaginationControls:typeof D=="function"?D:()=>({startIndex:0,endIndex:e.length}),{startIndex:n,endIndex:r}=t({containerId:"servicesPaginationContainer",totalItems:e.length,currentPage:O,pageSize:Ue,onPageChange:"goToServicesPage",onPageSizeChange:"changeServicesPageSize",itemLabel:"partida(s)",pageSizeOptions:[10,25,50,100]}),a=e.slice(n,r);o.innerHTML=a.map(i=>{const l=(i.unit_price_usd||0)-(i.base_cost_usd||0);return`
        <tr>
            <td style="font-weight: 800; color: var(--dalor-blue);">${i.code}</td>
            <td style="font-weight: 600; color: var(--dalor-navy);">${i.name}</td>
            <td><span style="font-size: 11px; background: #e0f2fe; color: #0369a1; padding: 3px 8px; border-radius: 6px; font-weight: 700;">${i.category}</span></td>
            <td>${i.unit_measure}</td>
            <td>$${Number(i.base_cost_usd||0).toFixed(2)}</td>
            <td style="font-weight: 800; color: var(--dalor-navy);">$${Number(i.unit_price_usd||0).toFixed(2)}</td>
            <td style="color: #059669; font-weight: 700;">+$${l.toFixed(2)}</td>
            <td style="text-align: center; white-space: nowrap;">
                <button onclick="openEditServiceModal(${i.id})" class="btn-secondary" style="padding: 4px 8px; color: var(--dalor-blue); margin-right: 4px;" title="Editar Partida">
                    <i class="fa-solid fa-pen-to-square"></i>
                </button>
                <button onclick="deleteService(${i.id})" class="btn-secondary" style="padding: 4px 8px; color: #ef4444;" title="Inactivar Partida">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        </tr>`}).join("")}async function se(){const o=document.getElementById("servicesTableBody");o&&(o.innerHTML='<tr><td colspan="8" style="text-align: center; padding: 20px; color: #94a3b8;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando partidas...</td></tr>');try{const e=await j(`${L}/services/`);if(!e.ok)throw new Error("Error HTTP "+e.status);const t=await e.json();E=Array.isArray(t)?t:[],q=E,O=1,R()}catch{o&&(o.innerHTML='<tr><td colspan="8" style="text-align: center; color: #e11d48;">Error al cargar servicios.</td></tr>')}}function xe(){try{return JSON.parse(localStorage.getItem("dalor_custom_apu_categories")||"[]")}catch{return[]}}function he(){try{return JSON.parse(localStorage.getItem("dalor_custom_apu_units")||"[]")}catch{return[]}}function z(o){if(!o||typeof o!="string")return;const e=o.trim();if(!(!e||e==="__NEW__"))try{const t=xe();t.includes(e)||(t.push(e),localStorage.setItem("dalor_custom_apu_categories",JSON.stringify(t)))}catch{}}function N(o){if(!o||typeof o!="string")return;const e=o.trim();if(!(!e||e==="__NEW__"))try{const t=he();t.includes(e)||(t.push(e),localStorage.setItem("dalor_custom_apu_units",JSON.stringify(t)))}catch{}}function He(){const o=new Set(Re);return xe().forEach(e=>e&&o.add(e.trim())),(window.allServices||E||[]).forEach(e=>{e.category&&typeof e.category=="string"&&e.category.trim()&&e.category!=="__NEW__"&&o.add(e.category.trim())}),Array.from(o)}function Ve(){const o=["Kilogramo (kg)","Tonelada (ton)","Metro (m)","Metro Cuadrado (m²)","Metro Cúbico (m³)","Pieza (und)","Global (gl)","Hora-Hombre (hh)","Día (dia)","Pulgada-Diámetro (pulg-diam)","Litro (L)","Galón (gal)"],e=new Set(o);return he().forEach(t=>t&&e.add(t.trim())),(window.allServices||E||[]).forEach(t=>{t.unit_measure&&typeof t.unit_measure=="string"&&t.unit_measure.trim()&&t.unit_measure!=="__NEW__"&&e.add(t.unit_measure.trim())}),Array.from(e)}function U(){const o=He(),e=Ve(),t=o.map(d=>`<option value="${d}">${d}</option>`).join("")+'<option value="__NEW__" style="color: #0284c7; font-weight: 800;">âž• Escribir Nueva Categoría...</option>',n=e.map(d=>`<option value="${d}">${d}</option>`).join("")+'<option value="__NEW__" style="color: #0284c7; font-weight: 800;">âž• Escribir Nueva Unidad...</option>',r=document.getElementById("srv_category");if(r){const d=r.value;r.innerHTML=t,d&&d!=="__NEW__"&&o.includes(d)?r.value=d:o.length>0&&d!=="__NEW__"&&(r.value=o[0])}const a=document.getElementById("srv_unit");if(a){const d=a.value;a.innerHTML=n,d&&d!=="__NEW__"&&e.includes(d)?a.value=d:e.length>0&&d!=="__NEW__"&&(a.value=e[0])}const i=document.getElementById("edit_srv_category");if(i){const d=i.value;i.innerHTML=t,d&&d!=="__NEW__"&&o.includes(d)&&(i.value=d)}const l=document.getElementById("edit_srv_unit");if(l){const d=l.value;l.innerHTML=n,d&&d!=="__NEW__"&&e.includes(d)&&(l.value=d)}const u=document.getElementById("serviceCategoryFilter");if(u){const d=u.value;u.innerHTML='<option value="">Todas las Categorías</option>'+o.map(c=>`<option value="${c}">${c}</option>`).join(""),d&&o.includes(d)&&(u.value=d)}}function qt(o){const e=document.getElementById("srv_new_category");e&&(o==="__NEW__"?(e.classList.remove("hidden"),e.focus()):(e.classList.add("hidden"),e.value=""))}function Dt(o){const e=document.getElementById("srv_new_unit");e&&(o==="__NEW__"?(e.classList.remove("hidden"),e.focus()):(e.classList.add("hidden"),e.value=""))}function Lt(o){const e=document.getElementById("edit_srv_new_category");e&&(o==="__NEW__"?(e.classList.remove("hidden"),e.focus()):(e.classList.add("hidden"),e.value=""))}function jt(o){const e=document.getElementById("edit_srv_new_unit");e&&(o==="__NEW__"?(e.classList.remove("hidden"),e.focus()):(e.classList.add("hidden"),e.value=""))}async function kt(){const o=document.getElementById("serviceForm");o&&o.reset();const e=document.getElementById("srv_new_category");e&&(e.value="",e.classList.add("hidden"));const t=document.getElementById("srv_new_unit");t&&(t.value="",t.classList.add("hidden"));const n=document.getElementById("srv_code");n&&(n.value="Generando correlativo...",n.setAttribute("readonly","true"),n.style.backgroundColor="#f1f5f9",n.style.cursor="not-allowed",n.style.fontWeight="700");const r=document.getElementById("newSrvMarginBadge");r&&(r.innerHTML="");const a=document.getElementById("btnSubmitCreateService");a&&(a.disabled=!1,a.title="",a.innerHTML='<i class="fa-solid fa-floppy-disk"></i> Guardar Partida'),U(),we("modalService");try{const i=await j(`${L}/services/next-code`);if(i.ok){const l=await i.json();n&&l&&l.next_code&&(n.value=l.next_code)}else if(n){const l=(E?E.length:0)+1;n.value=`APU-${String(l).padStart(3,"0")}`}}catch(i){console.warn("No se pudo obtener correlativo de APU:",i),n&&n.value.includes("Generando")&&(n.value="APU-001")}}async function Mt(o){var l,u,d,c,m,f,s,p,y,w;o&&o.preventDefault&&o.preventDefault();let e=(l=document.getElementById("srv_category"))==null?void 0:l.value;if(e==="__NEW__"){const _=(((u=document.getElementById("srv_new_category"))==null?void 0:u.value)||"").trim();if(!_){alert("Por favor escribe el nombre de la nueva categoría."),(d=document.getElementById("srv_new_category"))==null||d.focus();return}e=_,z(e)}let t=(c=document.getElementById("srv_unit"))==null?void 0:c.value;if(t==="__NEW__"){const _=(((m=document.getElementById("srv_new_unit"))==null?void 0:m.value)||"").trim();if(!_){alert("Por favor escribe la unidad de medida (ej: Kg, Ton, Galón, etc.)."),(f=document.getElementById("srv_new_unit"))==null||f.focus();return}t=_,N(t)}const n=parseFloat(String(((s=document.getElementById("srv_cost"))==null?void 0:s.value)||"").replace(",","."))||0,r=parseFloat(String(((p=document.getElementById("srv_price"))==null?void 0:p.value)||"").replace(",","."))||0,a={code:document.getElementById("srv_code").value.trim(),name:document.getElementById("srv_name").value.trim(),category:e,unit_measure:t,base_cost_usd:n,unit_price_usd:r};if(!a.name){alert("El nombre de la partida es obligatorio."),(y=document.getElementById("srv_name"))==null||y.focus();return}if(r<n){const _=(r-n).toFixed(2);alert(`⛔ OPERACIÓN DENEGADA | MARGEN NEGATIVO

El Precio de Venta ($${r.toFixed(2)}) no puede ser menor al Costo Base ($${n.toFixed(2)}).

Pérdida calculada: -$${Math.abs(_)} USD.

Por favor ajusta el precio para garantizar la rentabilidad.`),(w=document.getElementById("srv_price"))==null||w.focus();return}const i=document.getElementById("btnSubmitCreateService")||document.querySelector('#serviceForm button[type="submit"]');i&&(i.disabled=!0,i.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Guardando...');try{const _=await j(`${L}/services/`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(a)});if(_.ok){const g=await _.json();ie("modalService"),typeof showToastNotification=="function"?showToastNotification(`Partida ${g.code} registrada exitosamente`,"success"):typeof showToast=="function"?showToast(`Partida ${g.code} registrada exitosamente`,"success"):alert(`Partida ${g.code} registrada exitosamente.`),z(g.category||e),N(g.unit_measure||t),await le(),await se(),U()}else{const g=await _.json().catch(()=>({}));alert("Error al registrar partida: "+(g.detail||"Respuesta inválida del servidor"))}}catch(_){console.error("Error al guardar servicio:",_),alert("Error de conexión al guardar servicio.")}finally{i&&(i.disabled=!1,i.innerHTML='<i class="fa-solid fa-floppy-disk"></i> Guardar Partida')}}async function zt(o){let e=window.allServices&&window.allServices.length>0?window.allServices:E||[];(!e||e.length===0)&&(e=typeof q<"u"&&q.length>0?q:[]);let t=e.find(l=>l&&(l.id===o||String(l.id)===String(o)));if(!t)try{const l=await j(`${L}/services/`);if(l.ok){const u=await l.json();window.allServices=Array.isArray(u)?u:[],E=window.allServices,t=E.find(d=>d&&(d.id===o||String(d.id)===String(o)))}}catch{}if(!t){alert("Partida no encontrada en el catálogo.");return}U();const n=document.getElementById("edit_srv_new_category");n&&(n.value="",n.classList.add("hidden"));const r=document.getElementById("edit_srv_new_unit");r&&(r.value="",r.classList.add("hidden")),document.getElementById("edit_srv_id").value=t.id,document.getElementById("edit_srv_code").value=t.code,document.getElementById("edit_srv_name").value=t.name;const a=document.getElementById("edit_srv_category");if(a){if(t.category&&!Array.from(a.options).some(l=>l.value===t.category)){const l=document.createElement("option");l.value=t.category,l.textContent=t.category,a.insertBefore(l,a.lastElementChild)}a.value=t.category}const i=document.getElementById("edit_srv_unit");if(i){if(t.unit_measure&&!Array.from(i.options).some(l=>l.value===t.unit_measure)){const l=document.createElement("option");l.value=t.unit_measure,l.textContent=t.unit_measure,i.insertBefore(l,i.lastElementChild)}i.value=t.unit_measure}document.getElementById("edit_srv_cost").value=t.base_cost_usd,document.getElementById("edit_srv_price").value=t.unit_price_usd,Qe(),we("modalEditService")}async function Nt(o){var u,d,c,m,f,s,p,y,w,_;o&&o.preventDefault&&o.preventDefault();const e=document.getElementById("edit_srv_id").value;let t=(u=document.getElementById("edit_srv_category"))==null?void 0:u.value;if(t==="__NEW__"){const g=(((d=document.getElementById("edit_srv_new_category"))==null?void 0:d.value)||"").trim();if(!g){alert("Por favor escribe el nombre de la nueva categoría."),(c=document.getElementById("edit_srv_new_category"))==null||c.focus();return}t=g,z(t)}let n=(m=document.getElementById("edit_srv_unit"))==null?void 0:m.value;if(n==="__NEW__"){const g=(((f=document.getElementById("edit_srv_new_unit"))==null?void 0:f.value)||"").trim();if(!g){alert("Por favor escribe la unidad de medida."),(s=document.getElementById("edit_srv_new_unit"))==null||s.focus();return}n=g,N(n)}const r=parseFloat(String(((p=document.getElementById("edit_srv_cost"))==null?void 0:p.value)||"").replace(",","."))||0,a=parseFloat(String(((y=document.getElementById("edit_srv_price"))==null?void 0:y.value)||"").replace(",","."))||0,i={name:document.getElementById("edit_srv_name").value.trim(),category:t,unit_measure:n,base_cost_usd:r,unit_price_usd:a};if(!i.name){alert("El nombre de la partida es obligatorio."),(w=document.getElementById("edit_srv_name"))==null||w.focus();return}if(a<r){const g=(a-r).toFixed(2);alert(`⛔ OPERACIÓN DENEGADA | MARGEN NEGATIVO

El Precio de Venta ($${a.toFixed(2)}) no puede ser menor al Costo Base ($${r.toFixed(2)}).

Pérdida calculada: -$${Math.abs(g)} USD.

Por favor ajusta el precio para garantizar la rentabilidad.`),(_=document.getElementById("edit_srv_price"))==null||_.focus();return}const l=document.querySelector('#editServiceForm button[type="submit"]');l&&(l.disabled=!0,l.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Guardando...');try{const g=await j(`${L}/services/${e}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(i)});if(g.ok)ie("modalEditService"),typeof showToastNotification=="function"?showToastNotification("Partida actualizada exitosamente","success"):typeof showToast=="function"?showToast("Partida actualizada exitosamente","success"):alert("Partida actualizada exitosamente."),z(i.category),N(i.unit_measure),await le(),await se(),U();else{const b=await g.json().catch(()=>({}));alert("Error al actualizar partida: "+(b.detail||"Respuesta inválida del servidor"))}}catch(g){console.error("Error al actualizar servicio:",g),alert("Error de conexión al actualizar servicio.")}finally{l&&(l.disabled=!1,l.innerHTML='<i class="fa-solid fa-floppy-disk"></i> Guardar Cambios')}}async function Ot(o){if(confirm("¿Deseas eliminar permanentemente esta partida de servicio del catálogo?"))try{(await j(`${L}/services/${o}?permanent=true`,{method:"DELETE"})).ok?(await le(),se()):alert("Error al eliminar partida.")}catch{alert("Error de conexión al eliminar servicio.")}}function Qe(){const o=document.getElementById("edit_srv_cost"),e=document.getElementById("edit_srv_price"),t=parseFloat(o==null?void 0:o.value)||0,n=parseFloat(e==null?void 0:e.value)||0,r=document.getElementById("editSrvMarginBadge"),a=document.querySelector('#editServiceForm button[type="submit"]');if(!(o!=null&&o.value)&&!(e!=null&&e.value)){r&&(r.innerHTML=""),a&&(a.disabled=!1,a.title="");return}if(!(e!=null&&e.value)||String(e.value).trim()===""){r&&(r.innerHTML=t>0?'<span style="color:#64748b;font-size:11px;">Indique el precio de venta para evaluar rentabilidad.</span>':""),a&&(a.disabled=!1,a.title="");return}const i=n-t,l=t>0?(i/t*100).toFixed(1):"N/A";n<t?(r&&(r.innerHTML=`<span style="color:#e11d48;background:#fff1f2;padding:4px 10px;border-radius:6px;border:1px solid #fecdd3;display:inline-block;">❌ ERROR: Precio ($${n.toFixed(2)}) menor al costo ($${t.toFixed(2)}) — Pérdida: -$${Math.abs(i).toFixed(2)} (${Math.abs(l)}%)</span>`),a&&(a.disabled=!0,a.title="No se puede guardar una partida con precio menor al costo")):i===0?(r&&(r.innerHTML='<span style="color:#b45309;background:#fffbeb;padding:4px 10px;border-radius:6px;border:1px solid #fde68a;display:inline-block;">⚠️ Margen Cero: Precio igual al costo base, sin ganancia</span>'),a&&(a.disabled=!1,a.title="")):(r&&(r.innerHTML=`<span style="color:#059669;background:#ecfdf5;padding:4px 10px;border-radius:6px;border:1px solid #a7f3d0;display:inline-block;">✅ Margen Válido: Ganancia +$${i.toFixed(2)} (+${l}% sobre costo)</span>`),a&&(a.disabled=!1,a.title=""))}function Rt(){const o=document.getElementById("srv_cost"),e=document.getElementById("srv_price"),t=parseFloat(o==null?void 0:o.value)||0,n=parseFloat(e==null?void 0:e.value)||0,r=document.getElementById("newSrvMarginBadge"),a=document.getElementById("btnSubmitCreateService")||document.querySelector('#serviceForm button[type="submit"]');if(!(o!=null&&o.value)&&!(e!=null&&e.value)){r&&(r.innerHTML=""),a&&(a.disabled=!1,a.title="");return}if(!(e!=null&&e.value)||String(e.value).trim()===""){r&&(r.innerHTML=t>0?'<span style="color:#64748b;font-size:11px;">Indique el precio de venta para evaluar rentabilidad.</span>':""),a&&(a.disabled=!1,a.title="");return}const i=n-t,l=t>0?(i/t*100).toFixed(1):"N/A";n<t?(r&&(r.innerHTML=`<span style="color:#e11d48;background:#fff1f2;padding:4px 10px;border-radius:6px;border:1px solid #fecdd3;display:inline-block;">❌ ERROR: Precio ($${n.toFixed(2)}) menor al costo ($${t.toFixed(2)}) — Pérdida: -$${Math.abs(i).toFixed(2)} (${Math.abs(l)}%)</span>`),a&&(a.disabled=!0,a.title="No se puede guardar una partida con precio menor al costo")):i===0?(r&&(r.innerHTML='<span style="color:#b45309;background:#fffbeb;padding:4px 10px;border-radius:6px;border:1px solid #fde68a;display:inline-block;">⚠️ Margen Cero: Precio igual al costo base, sin ganancia</span>'),a&&(a.disabled=!1,a.title="")):(r&&(r.innerHTML=`<span style="color:#059669;background:#ecfdf5;padding:4px 10px;border-radius:6px;border:1px solid #a7f3d0;display:inline-block;">✅ Margen Válido: Ganancia +$${i.toFixed(2)} (+${l}% sobre costo)</span>`),a&&(a.disabled=!1,a.title=""))}window.calcEditServiceMargin=Qe;window.calcNewServiceMargin=Rt;typeof window<"u"&&(window.goToServicesPage=At,window.changeServicesPageSize=Tt,window.onServiceSearchInput=Pt,window.onServiceCategoryFilterChange=Ft,window.filterAndPaginateServices=ve,window.renderServicesPaginated=R,window.loadServices=se,window.getCustomCategories=xe,window.getCustomUnits=he,window.registerCustomCategory=z,window.registerCustomUnit=N,window.getAllServiceCategories=He,window.getAllServiceUnits=Ve,window.populateServiceCategoriesAndUnits=U,window.onServiceCategoryChanged=qt,window.onServiceUnitChanged=Dt,window.onEditServiceCategoryChanged=Lt,window.onEditServiceUnitChanged=jt,window.openNewServiceModal=kt,window.submitCreateService=Mt,window.openEditServiceModal=zt,window.submitEditService=Nt,window.deleteService=Ot);
