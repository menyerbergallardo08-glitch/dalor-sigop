function Ae(o,e=2){const t=Math.pow(10,e);return Math.round((Number(o)||0)*t)/t}window.roundNumber=Ae;function me(o){if(typeof o=="number")return isNaN(o)?0:o;if(!o)return 0;let e=String(o).trim().replace(/[$Bs€\s]/g,"");e.includes(",")&&e.includes(".")?e.indexOf(".")<e.indexOf(",")?e=e.replace(/\./g,"").replace(",","."):e=e.replace(/,/g,""):e.includes(",")&&(e=e.replace(",","."));const t=parseFloat(e);return isNaN(t)?0:t}window.parseLocalizedNumber=me;window.parseDecimal=me;window.API_BASE=window.location.origin+"/api/v1";var $=window.API_BASE;function Qe(o,e="Documento DALOR",t={}){let i=document.getElementById("dalor_print_iframe");i||(i=document.createElement("iframe"),i.id="dalor_print_iframe",i.style.position="fixed",i.style.right="0",i.style.bottom="0",i.style.width="0",i.style.height="0",i.style.border="0",i.style.visibility="hidden",document.body.appendChild(i));const r=String(e||"").toLowerCase(),a=t&&t.orientation==="landscape"||t&&t.landscape||r.includes("libro")||r.includes("compras")||r.includes("ventas")||r.includes("matriz");let n="";if(typeof o=="string")n=o;else if(o&&o.nodeType){const d=o.cloneNode(!0);d.querySelectorAll('.no-print, button, input[type="button"], input[type="submit"]').forEach(c=>c.remove()),d.querySelectorAll(".table-wrapper, div").forEach(c=>{c.style&&(c.style.maxHeight&&(c.style.maxHeight="none"),c.style.overflow&&(c.style.overflow="visible"),c.style.overflowY&&(c.style.overflowY="visible"),c.style.overflowX&&(c.style.overflowX="visible"))}),a&&d.querySelectorAll("table").forEach(c=>{let p=-1;c.querySelectorAll("thead th").forEach((l,m)=>{const y=l.textContent.trim().toLowerCase();(y==="acción"||y==="accion")&&(p=m)}),p!==-1&&c.querySelectorAll("tr").forEach(l=>{l.cells&&l.cells[p]&&l.cells[p].remove()})}),n=d.innerHTML}const s=`
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
    `,u=i.contentWindow.document;u.open(),u.write(`
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
                ${s}
                ${n}
            </body>
        </html>
    `),u.close(),setTimeout(()=>{i.contentWindow.focus(),i.contentWindow.print()},250)}function We(o,e,t){const i=document.getElementById(o);if(i){if(!Array.isArray(e)){i.innerHTML="";return}i.innerHTML=e.map(t).join("")}}function Pe(o){return Array.isArray(o)?[...o].sort((e,t)=>{const i=String(e.code||"").split(".").map(a=>parseInt(a,10)||0),r=String(t.code||"").split(".").map(a=>parseInt(a,10)||0);for(let a=0;a<Math.max(i.length,r.length);a++){const n=i[a]!==void 0?i[a]:-1,s=r[a]!==void 0?r[a]:-1;if(n!==s)return n-s}return String(e.name||"").localeCompare(String(t.name||""))}):[]}window.calcFieldBs=function(){var i,r;const o=parseFloat((i=document.getElementById("field_amount_usd"))==null?void 0:i.value)||0,e=parseFloat((r=document.getElementById("globalExchangeRateInput"))==null?void 0:r.value)||fe,t=document.getElementById("field_amount_bs");t&&!isNaN(o)&&(t.value=(o*e).toFixed(2)),ge()};window.calcFieldUsd=function(){var i,r;const o=parseFloat((i=document.getElementById("field_amount_bs"))==null?void 0:i.value)||0,e=parseFloat((r=document.getElementById("globalExchangeRateInput"))==null?void 0:r.value)||fe,t=document.getElementById("field_amount_usd");t&&!isNaN(o)&&e>0&&(t.value=(o/e).toFixed(2)),ge()};window.onFieldTaxConditionChanged=function(){ge()};function ge(){var u,d;const o=parseFloat((u=document.getElementById("field_amount_usd"))==null?void 0:u.value)||0,e=((d=document.getElementById("field_is_tax_exempt"))==null?void 0:d.value)==="true",t=e?o:+(o/1.16).toFixed(2),i=e?0:+(o-t).toFixed(2),r=document.getElementById("field_base_amount_usd"),a=document.getElementById("field_tax_amount_usd"),n=document.getElementById("field_base_display"),s=document.getElementById("field_tax_display");r&&(r.value=t.toFixed(2)),a&&(a.value=i.toFixed(2)),n&&(n.innerText=`$${t.toFixed(2)}`),s&&(s.innerText=`$${i.toFixed(2)}`)}window.onValTaxChanged=function(){var n,s;const o=parseFloat((n=document.getElementById("val_amount_usd"))==null?void 0:n.value)||0,e=((s=document.getElementById("val_is_tax_exempt"))==null?void 0:s.value)==="true",t=e?o:+(o/1.16).toFixed(2),i=e?0:+(o-t).toFixed(2),r=document.getElementById("val_base_usd"),a=document.getElementById("val_tax_usd");r&&(r.value=t.toFixed(2)),a&&(a.value=i.toFixed(2))};window.APP_BUILD_VERSION="2026.09.15.v93-clean-production";console.log("--> DALOR SIGO-P INITIALIZED v98.31 [MODERNO]");window.APP_BUILD_VERSION="2026.09.15.v93-clean-production";var Xe=window.APP_BUILD_VERSION;localStorage.setItem("dalor_build_version",Xe);let fe=parseFloat(localStorage.getItem("dalor_exchange_rate"))||850;var G=window.allClients=window.allClients||[],qe=window.allServices=window.allServices||[],Q=window.allProjects=window.allProjects||[],W=window.allCategories=window.allCategories||[],z=window.allAssets=window.allAssets||[],v=window.allPersonnel=window.allPersonnel||[],N=window.allMaterials=window.allMaterials||[];let Je=[],Ke=[],Ye=[],Ze=[],S=window.currentUser||(()=>{try{return JSON.parse(localStorage.getItem("dalor_user")||sessionStorage.getItem("dalor_user")||"null")}catch{return null}})(),et=window.authToken||localStorage.getItem("dalor_token")||sessionStorage.getItem("dalor_token")||null;function I(o,e={}){var t=sessionStorage.getItem("dalor_token")||localStorage.getItem("dalor_token")||window.authToken||"",i=Object.assign({},e.headers||{});return t&&(i.Authorization="Bearer "+t),e.body&&!(e.body instanceof FormData)&&!i["Content-Type"]&&(i["Content-Type"]="application/json"),e.body instanceof FormData&&delete i["Content-Type"],window.fetch(o,Object.assign({},e,{headers:i}))}let Le=0;const Fe=o=>{Date.now()-Le<350||!o.target.closest(".nav-dropdown")&&!o.target.closest(".dropdown-menu")&&!o.target.closest(".mobile-submenu-card")&&(ie(),ne())};document.addEventListener("click",Fe);document.addEventListener("touchend",Fe);function De(){return window.innerWidth<=768}function tt(o,e){o&&o.stopPropagation&&o.stopPropagation(),Le=Date.now();const t=document.getElementById(e);if(!t)return;if(De()){je(e);return}const i=t.classList.contains("open");ie(),i||t.classList.add("open")}function je(o){const e=document.getElementById(o);if(!e)return;const t=e.querySelector(".dropdown-btn"),i=e.querySelector(".dropdown-menu"),r=document.getElementById("mobileSubmenuSheet"),a=document.getElementById("mobileSubmenuTitle"),n=document.getElementById("mobileSubmenuItems");if(!r||!a||!n||!i)return;const s=t?t.querySelector("i"):null,u=t?t.querySelector("span"):null,d=s?s.outerHTML:'<i class="fa-solid fa-layer-group" style="color: var(--dalor-blue);"></i>',c=u?u.innerText:"Opciones del Módulo";a.innerHTML=`${d} <span>${c}</span>`,n.innerHTML="",i.querySelectorAll(".dropdown-item").forEach(g=>{const l=g.cloneNode(!0);l.onclick=m=>{m&&m.stopPropagation&&m.stopPropagation(),ne(),g.onclick&&g.onclick(m)},n.appendChild(l)}),r.classList.add("active"),document.body.style.overflow="hidden"}function ne(o){if(o&&o.target&&o.target.closest(".mobile-submenu-card")&&!o.target.classList.contains("mobile-submenu-close"))return;const e=document.getElementById("mobileSubmenuSheet");e&&e.classList.remove("active"),document.body.style.overflow=""}function ie(){document.querySelectorAll(".nav-dropdown").forEach(o=>{o.classList.remove("open")}),ne()}function we(o,e,t=null){ie(),["executive","financial","maintenance","quotations","clients","services","projects","dispatch","dashboard","resources","pwa","manual","tree","inbox","expenses-log"].forEach(n=>{const s=document.getElementById(`view-${n}`);s&&s.classList.add("hidden")});const r=document.getElementById(`view-${o}`);r&&r.classList.remove("hidden"),document.querySelectorAll(".nav-dropdown").forEach(n=>n.classList.remove("active"));const a=document.getElementById(`dropdown-${e}`);a&&a.classList.add("active");try{localStorage.setItem("dalor_active_view",o),e&&localStorage.setItem("dalor_active_category",e),sessionStorage.setItem("dalor_active_view",o),e&&sessionStorage.setItem("dalor_active_category",e)}catch{}if(o==="executive"&&typeof window.loadExecutiveDashboard=="function"&&window.loadExecutiveDashboard(),o==="financial"){let n=t||localStorage.getItem("dalor_active_subtab_financial")||sessionStorage.getItem("dalor_active_subtab_financial")||"cxc";const s=window.currentUser||window.State&&window.State.currentUser;if(s){let u={};try{u=typeof s.permissions_json=="string"?JSON.parse(s.permissions_json):s.permissions_json||s.permissions||{}}catch{}if(!((s.username||"").toLowerCase()==="director"||(s.role_name||"").toLowerCase().includes("director")||s.is_superuser===!0)){const c=u.cxc_view!==void 0||u.cxp_view!==void 0||u.bancos_view!==void 0||u.retiros_view!==void 0,p=u.cxc_view!==void 0?!!(u.cxc_view||u.cxc_pay):!c,g=u.cxp_view!==void 0?!!(u.cxp_view||u.cxp_pay):!c,l=u.bancos_view!==void 0?!!u.bancos_view:!c,m=u.retiros_view!==void 0?!!u.retiros_view:!1;n==="cxc"&&p||n==="cxp"&&g||n==="summary"&&l||n==="partners"&&m||(p?n="cxc":g?n="cxp":l?n="summary":m&&(n="partners"))}}typeof window.switchFinancialSubtab=="function"?window.switchFinancialSubtab(n):typeof window.openFinancialSubtab=="function"&&window.openFinancialSubtab(n)}if(o==="maintenance"){const n=t||localStorage.getItem("dalor_active_subtab_maintenance")||sessionStorage.getItem("dalor_active_subtab_maintenance")||"users";typeof window.switchMaintenanceSubtab=="function"?window.switchMaintenanceSubtab(n):typeof window.openMaintenanceSubtab=="function"&&window.openMaintenanceSubtab(n)}if(o==="quotations"&&typeof window.loadQuotations=="function"&&window.loadQuotations(),o==="clients"&&typeof window.loadClients=="function"&&window.loadClients(),o==="services"&&typeof window.loadServices=="function"&&window.loadServices(),o==="projects"){const n=t||localStorage.getItem("dalor_active_subtab_projects")||sessionStorage.getItem("dalor_active_subtab_projects")||"list";typeof window.switchProjectSubtab=="function"?window.switchProjectSubtab(n):typeof window.initProjectPlanningView=="function"&&window.initProjectPlanningView()}if(o==="dispatch"){const n=t||localStorage.getItem("dalor_active_subtab_dispatch")||sessionStorage.getItem("dalor_active_subtab_dispatch")||"list";typeof window.switchDispatchSubtab=="function"?window.switchDispatchSubtab(n):typeof window.initDispatchView=="function"&&window.initDispatchView()}if(o==="dashboard"&&typeof window.loadComparisonDashboard=="function"&&window.loadComparisonDashboard(),o==="resources"){const n=t||localStorage.getItem("dalor_active_subtab_resources")||sessionStorage.getItem("dalor_active_subtab_resources")||"dashboard";typeof window.switchResourceSubtab=="function"?window.switchResourceSubtab(n):typeof window.openResourceSubtab=="function"&&window.openResourceSubtab(n)}o==="inbox"&&typeof window.loadPendingExpensesInbox=="function"&&window.loadPendingExpensesInbox(),o==="tree"&&typeof window.loadCategoriesTree=="function"&&window.loadCategoriesTree(),o==="expenses-log"&&typeof window.loadExpensesLog=="function"&&window.loadExpensesLog(),window.onViewSwitched&&window.onViewSwitched(o)}window.switchView=we;window.appSwitchView=we;function F({containerId:o,totalItems:e=0,currentPage:t=1,pageSize:i=10,onPageChange:r="",onPageSizeChange:a="",itemLabel:n="registro(s)",pageSizeOptions:s=[10,15,25,50,100],allowAll:u=!0}){const d=document.getElementById(o);if(!d)return{startIndex:0,endIndex:0,totalPages:1,currentPage:1};const c=i===1e3||i===9999?e||1:i||15,p=Math.max(1,Math.ceil(e/c));let g=Math.max(1,Math.min(t,p));const l=(g-1)*c,m=Math.min(l+c,e);if(e<=Math.min(...s)&&p<=1)return d.innerHTML=`
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 11.5px; color: #64748b; margin-top: 8px;">
                <span>Mostrando <b>${e}</b> ${n}</span>
                ${a?`
                <div style="display: flex; align-items: center; gap: 6px;">
                    <span>Mostrar:</span>
                    <select onchange="${a}(this.value)" style="padding: 2px 6px; font-size: 11px; border: 1px solid #cbd5e1; border-radius: 4px; background: white; font-weight: 700; cursor: pointer;">
                        ${s.map(f=>`<option value="${f}" ${i===f?"selected":""}>${f}</option>`).join("")}
                        ${u?`<option value="1000" ${i===1e3?"selected":""}>Todos</option>`:""}
                    </select>
                </div>`:""}
            </div>
        `,{startIndex:l,endIndex:m,totalPages:p,currentPage:g};let y="",w=Math.max(1,g-2),_=Math.min(p,g+2);w>1&&(y+=`<button type="button" onclick="${r}(1)" class="btn-secondary" style="padding: 4px 9px; font-size: 11px; border-radius: 5px;">1</button>`,w>2&&(y+='<span style="padding: 0 4px; color: #94a3b8;">...</span>'));for(let f=w;f<=_;f++)f===g?y+=`<button type="button" class="btn-primary" style="padding: 4px 10px; font-size: 11px; font-weight: 800; border-radius: 5px; background: var(--dalor-navy, #0f172a); color: white;">${f}</button>`:y+=`<button type="button" onclick="${r}(${f})" class="btn-secondary" style="padding: 4px 9px; font-size: 11px; border-radius: 5px;">${f}</button>`;return _<p&&(_<p-1&&(y+='<span style="padding: 0 4px; color: #94a3b8;">...</span>'),y+=`<button type="button" onclick="${r}(${p})" class="btn-secondary" style="padding: 4px 9px; font-size: 11px; border-radius: 5px;">${p}</button>`),d.innerHTML=`
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 12px; color: #475569; flex-wrap: wrap; gap: 10px; box-shadow: 0 1px 2px rgba(0,0,0,0.04); margin-top: 8px;">
            <div style="font-weight: 600;">
                Mostrando <b style="color: var(--dalor-navy, #0f172a);">${e===0?0:l+1} - ${m}</b> de <b style="color: var(--dalor-navy, #0f172a);">${e}</b> ${n}
            </div>

            <div style="display: flex; align-items: center; gap: 5px;">
                <button type="button" onclick="${r}(1)" class="btn-secondary" style="padding: 4px 8px; font-size: 11px; border-radius: 5px;" ${g===1?'disabled style="opacity:0.4; cursor:not-allowed;"':""} title="Primera página">
                    <i class="fa-solid fa-angles-left"></i>
                </button>
                <button type="button" onclick="${r}(${g-1})" class="btn-secondary" style="padding: 4px 9px; font-size: 11px; border-radius: 5px;" ${g===1?'disabled style="opacity:0.4; cursor:not-allowed;"':""} title="Página anterior">
                    <i class="fa-solid fa-chevron-left"></i> Anterior
                </button>

                <div style="display: flex; align-items: center; gap: 4px;">
                    ${y}
                </div>

                <button type="button" onclick="${r}(${g+1})" class="btn-secondary" style="padding: 4px 9px; font-size: 11px; border-radius: 5px;" ${g===p?'disabled style="opacity:0.4; cursor:not-allowed;"':""} title="Página siguiente">
                    Siguiente <i class="fa-solid fa-chevron-right"></i>
                </button>
                <button type="button" onclick="${r}(${p})" class="btn-secondary" style="padding: 4px 8px; font-size: 11px; border-radius: 5px;" ${g===p?'disabled style="opacity:0.4; cursor:not-allowed;"':""} title="Última página">
                    <i class="fa-solid fa-angles-right"></i>
                </button>
            </div>

            ${a?`
            <div style="display: flex; align-items: center; gap: 6px;">
                <span style="font-size: 11.5px; color: #64748b;">Por página:</span>
                <select onchange="${a}(this.value)" style="padding: 3px 8px; font-size: 11.5px; border: 1px solid #cbd5e1; border-radius: 5px; background: white; font-weight: 700; color: var(--dalor-navy, #0f172a); cursor: pointer;">
                    ${s.map(f=>`<option value="${f}" ${i===f?"selected":""}>${f}</option>`).join("")}
                    ${u?`<option value="1000" ${i===1e3?"selected":""}>Ver todos</option>`:""}
                </select>
            </div>`:""}
        </div>
    `,{startIndex:l,endIndex:m,totalPages:p,currentPage:g}}window.renderPaginationControls=F;let k=null,Be=0;const ot=8e3;async function ae(o=!1){const e=Date.now();return k||(!o&&e-Be<ot&&window.allClients&&window.allClients.length>0&&window.allPersonnel&&window.allPersonnel.length>0&&window.allAssets&&window.allAssets.length>0?(typeof populatePlanDropdownSelectors=="function"&&populatePlanDropdownSelectors(),Promise.resolve()):(k=(async()=>{try{const[t,i,r,a,n,s,u]=await Promise.all([I(`${$}/clients/`),I(`${$}/services/`),I(`${$}/projects/`),I(`${$}/expenses/categories`),I(`${$}/assets/`),I(`${$}/personnel/`),I(`${$}/materials/`)]),d=t.ok?await t.json():[];window.allClients=G=Array.isArray(d)?d:[];const c=i.ok?await i.json():[];window.allServices=qe=Array.isArray(c)?c:[];const p=r.ok?await r.json():[];window.allProjects=Q=Array.isArray(p)?p:[];const g=a.ok?await a.json():[];window.allCategories=W=Array.isArray(g)?g:[];const l=n.ok?await n.json():[];window.allAssets=z=Array.isArray(l)?l:[];const m=s.ok?await s.json():[];window.allPersonnel=v=Array.isArray(m)?m:[];const y=u.ok?await u.json():{};window.allMaterials=N=Array.isArray(y.materials)?y.materials:Array.isArray(y)?y:[],Be=Date.now(),X(),populatePlanDropdownSelectors(),ve()}catch(t){console.error("Error al cargar datos maestros:",t)}finally{k=null}})(),k))}function X(){const o=window.allClients&&window.allClients.length>0?window.allClients:Array.isArray(G)?G:[],e=window.allProjects&&window.allProjects.length>0?window.allProjects:Array.isArray(Q)?Q:[],t=window.allCategories&&window.allCategories.length>0?window.allCategories:Array.isArray(W)?W:[],i=window.allAssets&&window.allAssets.length>0?window.allAssets:Array.isArray(z)?z:[];window.allMaterials&&window.allMaterials.length>0?window.allMaterials:Array.isArray(N),window.allPersonnel&&window.allPersonnel.length>0?window.allPersonnel:Array.isArray(v);const r=(l,m)=>{const y=document.getElementById(l);if(!y)return;const w=y.value;y.innerHTML=m,w&&(y.value=w)},a='<option value="">-- Seleccione Cliente --</option>'+o.map(l=>`<option value="${l.id}">[${l.code}] ${l.name} (${l.rif||"Sin RIF"})</option>`).join("");if(r("quote_client_id",a),r("new_proj_client_id",a),r("cxc_client_id",a),r("rcp_client_id",a),o.length===1){const l=document.getElementById("quote_client_id");l&&!l.value&&(l.value=String(o[0].id));const m=document.getElementById("new_proj_client_id");m&&!m.value&&(m.value=String(o[0].id))}const n='<option value="">-- Gasto General Sede (Sin Proyecto) --</option>'+e.map(l=>`<option value="${l.id}">${l.code} - ${l.name}</option>`).join("");document.getElementById("field_project_id")&&(document.getElementById("field_project_id").innerHTML=n),document.getElementById("manual_project_id")&&(document.getElementById("manual_project_id").innerHTML=n),document.getElementById("cxc_project_id")&&(document.getElementById("cxc_project_id").innerHTML=n),document.getElementById("cxp_project_id")&&(document.getElementById("cxp_project_id").innerHTML=n),document.getElementById("rcp_project_id")&&(document.getElementById("rcp_project_id").innerHTML='<option value="">-- Sin Proyecto Específico (Anticipo a Cuenta) --</option>'),document.getElementById("mc_project_id")&&(document.getElementById("mc_project_id").innerHTML='<option value="">-- Consumo Interno Taller Central (Gasto Sede) --</option>'+e.map(l=>`<option value="${l.id}">${l.code} - ${l.name}</option>`).join("")),document.getElementById("modal_target_project_id")&&(document.getElementById("modal_target_project_id").innerHTML=e.map(l=>`<option value="${l.id}">${l.code} - ${l.name} (${l.location})</option>`).join("")),document.getElementById("tg_project_id")&&(document.getElementById("tg_project_id").innerHTML='<option value="">-- Seleccione Proyecto Aprobado --</option>'+e.map(l=>`<option value="${l.id}" data-location="${l.location}">${l.code} - ${l.name} (${l.location})</option>`).join(""));const u=Pe(t).map(l=>`<option value="${l.id}">[${l.code}] ${l.name}</option>`).join("");document.getElementById("field_category_id")&&(document.getElementById("field_category_id").innerHTML=u),document.getElementById("manual_category_id")&&(document.getElementById("manual_category_id").innerHTML=u);const d='<option value="">-- No Aplica --</option>'+i.map(l=>`<option value="${l.id}">${l.asset_code} - ${l.name}</option>`).join("");document.getElementById("field_asset_id")&&(document.getElementById("field_asset_id").innerHTML=d);const c=(z||[]).filter(l=>(l.asset_type==="vehiculo"||l.asset_type==="camioneta"||l.asset_type==="transporte")&&l.is_active!==!1&&!l.current_project_id&&(l.status==="disponible_base"||l.status==="disponible"||!l.status)&&l.status!=="en_obra"&&l.status!=="en_mantenimiento"&&l.status!=="alquilado_a_tercero"&&l.status!=="desincorporado"),p=`<option value="">-- Seleccione Vehículo de Transporte (${c.length} disp. en base) --</option><option value="none">📍 Sin Vehículo Asignado (Sede Central / Taller / Custodia Interna)</option>`+c.map(l=>`<option value="${l.id}">[${l.asset_code}] ${l.name} (Placa: ${l.license_plate||"S/P"}) - ${l.current_location||"Base"}</option>`).join("");document.getElementById("tg_vehicle_id")&&(document.getElementById("tg_vehicle_id").innerHTML=p);const g='<option value="">-- Seleccione Material --</option>'+N.map(l=>`<option value="${l.id}" data-cost="${l.unit_cost_usd}" data-stock="${l.stock_quantity}" data-unit="${l.unit_measure}">[${l.code}] ${l.name} (${l.stock_quantity} ${l.unit_measure} disp. - $${l.unit_cost_usd}/u)</option>`).join("");if(document.getElementById("me_material_id")&&(document.getElementById("me_material_id").innerHTML=g),document.getElementById("mc_material_id")&&(document.getElementById("mc_material_id").innerHTML=g),v&&v.length>0){const l=v.map(m=>`<option value="${m.id}">[${m.code}] ${m.full_name}${m.role_title?" - "+m.role_title:""}</option>`).join("");document.getElementById("field_reported_by")&&(document.getElementById("field_reported_by").innerHTML=l),document.getElementById("manual_reported_by")&&(document.getElementById("manual_reported_by").innerHTML=l)}if(S&&v&&v.length>0){const l=v.find(m=>m.full_name&&S.username&&m.full_name.toLowerCase().includes(S.username.toLowerCase())||m.role_title&&S.role&&m.role_title.toLowerCase().includes(S.role.toLowerCase()))||v[0];l&&(document.getElementById("field_reported_by")&&(document.getElementById("field_reported_by").value=l.id),document.getElementById("manual_reported_by")&&(document.getElementById("manual_reported_by").value=l.id))}typeof window.populateServiceCategoriesAndUnits=="function"&&window.populateServiceCategoriesAndUnits()}function ye(o){o==="modalNewQuotation"&&(o="modalQuotation");const e=document.getElementById(o);e&&(e.classList.remove("hidden"),e.style.removeProperty("display"));const t=document.getElementById("btnFloatingLogout");t&&t.style.setProperty("display","none","important")}function re(o){const e=document.getElementById(o);if(e&&e.classList.add("hidden"),document.querySelectorAll(".modal-overlay:not(.hidden), .modal:not(.hidden)").length===0){const i=document.getElementById("btnFloatingLogout");i&&i.style.removeProperty("display")}}let A=localStorage.getItem("dalor_sound_alerts")!=="false",$e=new Set,Ce=!0;function nt(){A=!A,localStorage.setItem("dalor_sound_alerts",A?"true":"false"),_e(),A&&be()}function _e(){const o=document.getElementById("iconSoundToggle"),e=document.getElementById("textSoundToggle"),t=document.getElementById("iconSoundToggleInbox"),i=document.getElementById("textSoundToggleInbox"),r=document.getElementById("btnSoundToggle");o&&e&&(A?(o.className="fa-solid fa-bell",e.innerText="Sonido: ON",r&&(r.style.color="#fbbf24",r.style.borderColor="#fbbf24")):(o.className="fa-solid fa-bell-slash",e.innerText="Sonido: OFF",r&&(r.style.color="#94a3b8",r.style.borderColor="#334155"))),t&&i&&(A?(t.className="fa-solid fa-bell",t.style.color="#059669",i.innerText="Alertas Sonoras: ON"):(t.className="fa-solid fa-bell-slash",t.style.color="#94a3b8",i.innerText="Alertas Sonoras: OFF"))}function be(){if(A)try{const o=window.AudioContext||window.webkitAudioContext;if(!o)return;const e=new o,t=e.currentTime,i=e.createOscillator(),r=e.createGain();i.type="sine",i.frequency.setValueAtTime(659.25,t),r.gain.setValueAtTime(.25,t),r.gain.exponentialRampToValueAtTime(.001,t+.35),i.connect(r),r.connect(e.destination),i.start(t),i.stop(t+.35);const a=e.createOscillator(),n=e.createGain();a.type="sine",a.frequency.setValueAtTime(880,t+.12),n.gain.setValueAtTime(.3,t+.12),n.gain.exponentialRampToValueAtTime(.001,t+.55),a.connect(n),n.connect(e.destination),a.start(t+.12),a.stop(t+.55)}catch(o){console.warn("Audio alert error:",o)}}function ke(o){const e=document.getElementById("toastNotificationContainer");if(!e)return;const t=document.createElement("div");t.className="toast-card-live",t.style.cssText=`

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

    `;const i=o.reported_by||"Personal de Campo",r=Number(o.amount_usd||0).toFixed(2),a=o.project_name||"Obra General",n=o.supplier_vendor||"Comercio General";t.innerHTML=`

        <div style="background: rgba(5, 150, 105, 0.2); color: #34d399; width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; animation: pulseGlowGreen 2s infinite;">

            <i class="fa-solid fa-file-invoice-dollar"></i>

        </div>

        <div style="flex: 1; min-width: 0;">

            <div style="display: flex; justify-content: space-between; align-items: center;">

                <h4 style="margin: 0; font-size: 13px; font-weight: 800; color: #34d399;">¡Nuevo Comprobante Recibido!</h4>

                <button onclick="this.closest('.toast-card-live').remove()" style="background: none; border: none; color: #94a3b8; font-size: 18px; cursor: pointer; line-height: 1; padding: 0 4px;">&times;</button>

            </div>

            <p style="margin: 3px 0 0 0; font-size: 11px; color: #cbd5e1;"><b>${i}</b> reportó factura en <b>${n}</b></p>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">

                <span style="font-size: 13px; font-weight: 900; color: var(--dalor-gold);">$${r} USD <small style="color: #94a3b8; font-weight: 600;">(${a})</small></span>

                <button onclick="switchView('inbox', 'gastos'); this.closest('.toast-card-live').remove();" style="background: #059669; color: white; border: none; padding: 5px 10px; border-radius: 6px; font-size: 11px; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 4px;">

                    <i class="fa-solid fa-stamp"></i> Auditar

                </button>

            </div>

        </div>

    `,e.appendChild(t),setTimeout(()=>{t.parentElement&&(t.style.opacity="0",t.style.transform="translateX(60px)",setTimeout(()=>t.remove(),300))},9e3)}async function ve(){try{if(!S)return;const o=(S.username||"").toLowerCase(),e=(S.role_name||"").toLowerCase();if(o==="campo"||e.includes("supervisor")||e.includes("campo")){const c=document.getElementById("badgeInboxCount"),p=document.getElementById("badgeGastosDropdown");c&&(c.style.display="none"),p&&(p.style.display="none");return}const i=await I(`${$}/expenses/inbox/pending`);if(!i.ok)return;const r=await i.json(),a=Array.isArray(r)?r:[],n=a.length,s=document.getElementById("badgeInboxCount");s&&(s.innerText=n,s.style.display=n>0?"inline-block":"none");const u=document.getElementById("badgeGastosDropdown");u&&(u.innerText=n,u.style.display=n>0?"inline-block":"none");const d=new Set(a.map(c=>c.id));if(!Ce){const c=a.filter(p=>!$e.has(p.id));if(c.length>0){be(),c.forEach(g=>ke(g));const p=document.getElementById("view-inbox");p&&!p.classList.contains("hidden")&&loadPendingExpensesInbox()}}$e=d,Ce=!1}catch{}}setInterval(ve,5e3);_e();setInterval(()=>{I("/healthz").catch(()=>{})},3e5);typeof window<"u"&&(window.allClients=G,window.allServices=qe,window.allProjects=Q,window.allCategories=W,window.allAssets=z,window.allPersonnel=v,window.allMaterials=N,window.selectedPersonnelIds=Je,window.selectedVehicleIds=Ke,window.selectedToolIds=Ye,window.selectedMaterialIds=Ze,window.EXCHANGE_RATE=fe,window.currentUser=window.currentUser||S,window.authToken=window.authToken||et,window.closeAllDropdowns=ie,window.closeMobileSubmenu=ne,window.closeModal=re,window.isMobileViewport=De,window.loadInitialMasterData=ae,window.openMobileSubmenu=je,window.openModal=ye,window.parseLocalizedNumber=me,window.playNotificationChime=be,window.populateSelect=We,window.populateSelectDropdowns=X,window.roundNumber=Ae,window.showInboxToastNotification=ke,window.renderPaginationControls=F,window.sortCategoriesNumerically=Pe,window.switchView=we,window.toggleDropdown=tt,window.toggleSoundAlerts=nt,window.printElementHtml=Qe,window.updatePendingInboxBadge=ve,window.updateSoundToggleUI=_e);var ce=window.API_BASE||window.location.origin+"/api/v1",it=window.allClients=window.allClients||[],at=window.allServices=window.allServices||[];window.allProjects=window.allProjects||[];window.allCategories=window.allCategories||[];window.allMaterials=window.allMaterials||[];window.EXCHANGE_RATE=window.EXCHANGE_RATE||850;window.BCV_DATA=window.BCV_DATA||{rate:850,source:"BCV Oficial"};window.authToken=window.authToken||localStorage.getItem("dalor_token")||null;const rt=["Fabricación Metalmecánica","Montaje e Instalación en Sitio","Mantenimiento Industrial & Paradas","Soldadura Especializada & Pailería","Mecanizado & Torno","Arenado y Pintura Industrial","Obras Civiles & Eléctricas Asociadas"];typeof window<"u"&&(window.OFFICIAL_DALOR_APU_CATEGORIES=rt);function ue(o,e={}){var t=sessionStorage.getItem("dalor_token")||localStorage.getItem("dalor_token")||window.authToken||"",i=Object.assign({},e.headers||{});return t&&(i.Authorization="Bearer "+t),e.body&&!(e.body instanceof FormData)&&!i["Content-Type"]&&(i["Content-Type"]="application/json"),e.body instanceof FormData&&delete i["Content-Type"],window.fetch(o,Object.assign({},e,{headers:i}))}let Me=[],C=1,ze=10,J="",K="",Y="",Z="";function lt(o){C=o,T();const e=document.getElementById("quotationsTableBody");e&&e.scrollIntoView({behavior:"smooth",block:"nearest"})}function st(o){ze=parseInt(o)||10,C=1,T()}function dt(o){J=(o||"").trim().toLowerCase(),C=1,T()}function ct(o){K=(o||"").trim().toLowerCase(),C=1,T()}function ut(){var o,e;Y=((o=document.getElementById("quoteFilterDateFrom"))==null?void 0:o.value)||"",Z=((e=document.getElementById("quoteFilterDateTo"))==null?void 0:e.value)||"",C=1,T()}function pt(){J="",K="",Y="",Z="";const o=document.getElementById("quoteSearchInput");o&&(o.value="");const e=document.getElementById("quoteStatusFilter");e&&(e.value="");const t=document.getElementById("quoteFilterDateFrom");t&&(t.value="");const i=document.getElementById("quoteFilterDateTo");i&&(i.value=""),C=1,T()}function T(){const o=document.getElementById("quotationsTableBody");if(!o)return;let e=Me||[];if(J){const n=J;e=e.filter(s=>s.quote_number&&s.quote_number.toLowerCase().includes(n)||s.client&&s.client.name&&s.client.name.toLowerCase().includes(n)||s.project_title&&s.project_title.toLowerCase().includes(n))}if(K&&(e=e.filter(n=>(n.status||"").toLowerCase()===K)),Y&&(e=e.filter(n=>n.created_at&&n.created_at.substring(0,10)>=Y)),Z&&(e=e.filter(n=>n.created_at&&n.created_at.substring(0,10)<=Z)),e.length===0){o.innerHTML='<tr><td colspan="8" style="text-align: center; padding: 20px; color: #94a3b8;">No se encontraron cotizaciones con los criterios seleccionados.</td></tr>';const n=document.getElementById("quotationsPaginationContainer");n&&(n.innerHTML="");return}const t=typeof window.renderPaginationControls=="function"?window.renderPaginationControls:typeof F=="function"?F:()=>({startIndex:0,endIndex:e.length}),{startIndex:i,endIndex:r}=t({containerId:"quotationsPaginationContainer",totalItems:e.length,currentPage:C,pageSize:ze,onPageChange:"goToQuotationsPage",onPageSizeChange:"changeQuotationsPageSize",itemLabel:"cotización(es)",pageSizeOptions:[10,20,50,100]}),a=e.slice(i,r);o.innerHTML=a.map(n=>{const s=n.client?n.client.name:"Cliente General",u=n.status==="aprobado",d=Number(n.subtotal_usd||0),c=Number(n.tax_usd||0),p=Number(n.total_usd||0);return`
        <tr>
            <td style="font-weight: 800; color: var(--dalor-blue);">
                ${n.quote_number}
                <div style="font-size: 10px; color: #64748b; font-weight: normal; margin-top: 2px;">
                    <i class="fa-regular fa-calendar-days" style="color: var(--dalor-gold);"></i> ${n.created_at?n.created_at.includes("-")?(g=>`${g[2]}/${g[1]}/${g[0]}`)(n.created_at.substring(0,10).split("-")):new Date(n.created_at).toLocaleDateString("es-VE"):"-"}
                </div>
            </td>
            <td style="font-weight: 600;">${s}</td>
            <td>${n.project_title}</td>
            <td style="font-weight: 700;">$${d.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
            <td style="color: ${c===0?"#10b981":"#64748b"}; font-weight: 700;">
                ${c===0?"EXENTO (0%)":`$${c.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`}
            </td>
            <td style="font-weight: 800; color: var(--dalor-navy);">$${p.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
            <td>
                <span style="font-size: 10px; padding: 3px 8px; border-radius: 9999px; font-weight: 800; ${u?"background: #dcfce7; color: #166534;":"background: #f1f5f9; color: #475569;"}">
                    ${(n.status||"borrador").toUpperCase()}
                </span>
            </td>
            <td style="text-align: center; white-space: nowrap;">
                <button onclick="editQuotation(${n.id})" class="btn-secondary" style="padding: 4px 8px; font-size: 11px; margin-right: 4px; color: #0284c7; font-weight: 700;" title="Re-editar Cotización">
                    <i class="fa-solid fa-pen-to-square"></i> Re-editar
                </button>
                <button onclick="printQuotation(${n.id})" class="btn-secondary" style="padding: 4px 8px; font-size: 11px;" title="Imprimir / Exportar Cotización">
                    <i class="fa-solid fa-print"></i>
                </button>
                ${u?'<span style="font-size: 11px; color: #059669; font-weight: bold; margin-left: 6px;">Obra Activa</span>':`
                    <button onclick="convertQuoteToProject(${n.id})" class="btn-primary" style="padding: 4px 8px; font-size: 11px; margin-left: 4px; background: #059669;" title="Aprobar y Convertir en Proyecto">
                        <i class="fa-solid fa-check"></i> Convertir en Proyecto
                    </button>
                `}
            </td>
        </tr>`}).join("")}async function mt(){const o=document.getElementById("quotationsTableBody");o.innerHTML='<tr><td colspan="8" style="text-align: center; padding: 20px; color: #94a3b8;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando cotizaciones...</td></tr>';try{const[e,t,i]=await Promise.all([ue(`${ce}/quotations/`),ue(`${ce}/clients/`),ue(`${ce}/services/`)]);if(t.ok){const a=await t.json();it=Array.isArray(a)?a:[]}if(i.ok){const a=await i.json();at=Array.isArray(a)?a:[]}try{typeof window.populateSelectDropdowns=="function"?window.populateSelectDropdowns():typeof X=="function"&&X()}catch(a){console.warn("Aviso al poblar dropdowns de cotizaciones:",a)}if(!e.ok)throw new Error("Error HTTP "+e.status);const r=await e.json();Me=Array.isArray(r)?r:[],C=1,T()}catch(e){console.error("Error al cargar cotizaciones:",e),o.innerHTML=`<tr><td colspan="8" style="text-align: center; color: #e11d48; padding: 20px;">Error al cargar cotizaciones: ${e.message||"Error de conexión"}</td></tr>`}}typeof window<"u"&&(window.goToQuotationsPage=lt,window.changeQuotationsPageSize=st,window.onQuotationSearchInput=dt,window.onQuotationStatusFilterChange=ct,window.onQuotationDateFilterChange=ut,window.clearQuotationFilters=pt,window.renderQuotationsPaginated=T,window.loadQuotations=mt);var x=window.API_BASE||window.location.origin+"/api/v1",B=window.allClients=window.allClients||[],q=window.allServices=window.allServices||[],Te=window.allProjects=window.allProjects||[];window.allCategories=window.allCategories||[];window.allMaterials=window.allMaterials||[];var ee=window.EXCHANGE_RATE=window.EXCHANGE_RATE||850;window.BCV_DATA=window.BCV_DATA||{rate:850,source:"BCV Oficial"};window.authToken=window.authToken||localStorage.getItem("dalor_token")||null;const gt=["Fabricación Metalmecánica","Montaje e Instalación en Sitio","Mantenimiento Industrial & Paradas","Soldadura Especializada & Pailería","Mecanizado & Torno","Arenado y Pintura Industrial","Obras Civiles & Eléctricas Asociadas"];typeof window<"u"&&(window.OFFICIAL_DALOR_APU_CATEGORIES=gt);function E(o,e={}){var t=sessionStorage.getItem("dalor_token")||localStorage.getItem("dalor_token")||window.authToken||"",i=Object.assign({},e.headers||{});return t&&(i.Authorization="Bearer "+t),e.body&&!(e.body instanceof FormData)&&!i["Content-Type"]&&(i["Content-Type"]="application/json"),e.body instanceof FormData&&delete i["Content-Type"],window.fetch(o,Object.assign({},e,{headers:i}))}let te=0;async function ft(){var s;te=0;const o=document.getElementById("edit_quotation_id");o&&(o.value="");const e=document.getElementById("modalQuotationTitle");e&&(e.innerHTML='<i class="fa-solid fa-calculator" style="color: var(--dalor-blue);"></i> Armar Presupuesto / Cotización Formal (APU)');const t=document.getElementById("btnSubmitQuotation");t&&(t.innerHTML='<i class="fa-solid fa-floppy-disk"></i> Guardar Presupuesto');const i=document.getElementById("quoteForm");i&&i.reset(),document.getElementById("quote_coletilla_divisas")&&(document.getElementById("quote_coletilla_divisas").checked=!0),document.getElementById("quote_coletilla_modalidad")&&(document.getElementById("quote_coletilla_modalidad").checked=!0),document.getElementById("quote_coletilla_bolivares")&&(document.getElementById("quote_coletilla_bolivares").checked=!1),document.getElementById("quote_notes")&&(document.getElementById("quote_notes").value=""),document.getElementById("quote_execution_time")&&(document.getElementById("quote_execution_time").value="15 días hábiles"),document.getElementById("quote_date")&&(document.getElementById("quote_date").value=new Date().toISOString().substring(0,10)),document.getElementById("quote_validity")&&(document.getElementById("quote_validity").value=15);const r=document.getElementById("quoteClientRiskAlert");r&&(r.style.display="none");const a=document.getElementById("quoteItemsList");a&&(a.innerHTML="");try{if((window.allClients&&window.allClients.length>0?window.allClients:B||[]).length===0){const d=window.authToken||localStorage.getItem("dalor_token")||null,c=d?{Authorization:`Bearer ${d}`}:{},p=await E(`${x}/clients/`,{headers:c});if(p.ok){const g=await p.json();B=window.allClients=Array.isArray(g)?g:[]}}if(!window._servicesLoaded){const d=window.authToken||localStorage.getItem("dalor_token")||null,c=d?{Authorization:`Bearer ${d}`}:{},p=await E(`${x}/services/`,{headers:c});if(p.ok){const g=await p.json();q=window.allServices=Array.isArray(g)?g:[],window._servicesLoaded=!0}}}catch(u){console.warn("Error cargando clientes o servicios para cotización:",u)}typeof window.populateSelectDropdowns=="function"&&window.populateSelectDropdowns();const n=document.getElementById("quote_client_id");if(n){const u=window.allClients&&window.allClients.length>0?window.allClients:B||[];if(u.length>0){let d='<option value="">-- Seleccione Cliente --</option>'+u.map(c=>`<option value="${c.id}">[${c.code}] ${c.name} (${c.rif||"Sin RIF"})</option>`).join("");n.innerHTML=d,u.length===1&&(n.value=String(u[0].id))}}document.getElementById("quote_tax_type")&&(document.getElementById("quote_tax_type").value="16"),document.getElementById("quote_tax_percent")&&(document.getElementById("quote_tax_percent").value="16"),document.getElementById("quote_execution_time")&&(document.getElementById("quote_execution_time").value=""),document.getElementById("quote_currency")&&(document.getElementById("quote_currency").value="USD"),document.getElementById("quote_coletilla_divisas")&&(document.getElementById("quote_coletilla_divisas").checked=!1),document.getElementById("quote_coletilla_modalidad")&&(document.getElementById("quote_coletilla_modalidad").checked=!1),document.getElementById("quote_notes")&&(document.getElementById("quote_notes").value=""),oe(),P(),Ne(),typeof window.openModal=="function"?window.openModal("modalQuotation"):(s=document.getElementById("modalQuotation"))==null||s.classList.remove("hidden")}function wt(){const o=document.getElementById("quote_tax_type").value;document.getElementById("quote_tax_percent").value=o,P()}function oe(o=null){te++;const e=document.getElementById("quoteItemsList");if(!e)return;const t=`quote_row_${te}`,r=`<option value="">${q&&q.length>0?"-- Partida del Catálogo --":"-- Catálogo en blanco (escriba partida manual) --"}</option>`+(q||[]).map(p=>{const g=o&&(String(o.service_id)===String(p.id)||String(o.item_code)===String(p.code));return`<option value="${p.id}" data-code="${p.code}" data-unit="${p.unit_measure}" data-price="${p.unit_price_usd}" ${g?"selected":""}>[${p.code}] ${p.name} ($${p.unit_price_usd}/${p.unit_measure})</option>`}).join(""),a=o?(o.description||"").replaceAll('"',"&quot;"):"",n=o&&o.unit_measure||"Global",s=o&&o.quantity!==void 0?o.quantity:1,u=o&&o.unit_price_usd!==void 0?o.unit_price_usd:0,d=(s*u).toFixed(2),c=document.createElement("div");c.id=t,c.style.cssText="display: grid; grid-template-columns: 4fr 1fr 1fr 1fr 1fr 30px; gap: 6px; background: white; padding: 8px; border-radius: 8px; border: 1px solid #cbd5e1; align-items: center;",c.innerHTML=`

        <div>

            <select class="form-select q-srv-select" style="font-size: 11px; padding: 5px;" onchange="onServiceSelected('${t}')">

                ${r}

            </select>

            <input type="text" class="form-input q-desc" placeholder="Descripción detallada de la partida / APU" value="${a}" autocomplete="off" style="font-size: 11px; padding: 4px 6px; margin-top: 4px;" required>

        </div>

        <div>
            <input type="text" class="form-input q-unit" list="datalist_units" placeholder="Und / Medida" value="${n}" style="font-size: 11px; padding: 5px; font-weight: 700; color: #1e293b;" title="Selecciona o escribe cualquier unidad de medida (ej: Ton, Kg, m, Pulg-Diam, HH, Und)">
            <datalist id="datalist_units">
                ${Array.from(new Set(["Global","Und","Pza","m","m²","m³","ml","Kg","Ton","Litro","Galón","Horas","HH","Días","Punto","Juego","Pulg-Diam",...(q||[]).map(p=>(p.unit_measure||"").trim()).filter(Boolean)])).map(p=>`<option value="${p}">`).join("")}
            </datalist>
        </div>

        <div>
            <input type="text" inputmode="decimal" class="form-input q-qty" placeholder="Cant" value="${s}" oninput="recalcQuotationTotals()" autocomplete="off" style="font-size: 11px; padding: 5px; font-weight: bold;" required>
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

    `,e.appendChild(c)}function yt(o){const e=document.getElementById(o);e&&e.remove(),P()}function _t(o){const e=document.getElementById(o);if(!e)return;const t=e.querySelector(".q-srv-select"),i=t?t.options[t.selectedIndex]:null;i&&i.value&&(e.querySelector(".q-desc").value=i.text.replace(/\[.*?\]\s*/,"").split(" ($")[0],e.querySelector(".q-unit").value=i.getAttribute("data-unit")||"Global",e.querySelector(".q-price").value=parseFloat(i.getAttribute("data-price")||0).toFixed(2)),P()}function P(){var p;const o=document.querySelectorAll("#quoteItemsList > div");let e=0;o.forEach(g=>{const l=g.querySelector(".q-qty"),m=g.querySelector(".q-price"),y=g.querySelector(".q-total"),w=parseLocalizedNumber(l?l.value:0),_=parseLocalizedNumber(m?m.value:0),f=w*_;y&&(y.value=`$${f.toFixed(2)}`),e+=f});const t=parseFloat(document.getElementById("quote_tax_percent")?document.getElementById("quote_tax_percent").value:16)||0,i=e*(t/100),r=e+i,a=document.getElementById("quote_subtotal_display"),n=document.getElementById("quote_tax_display"),s=document.getElementById("quote_total_display"),u=(((p=document.getElementById("quote_currency"))==null?void 0:p.value)||"USD").toUpperCase(),d=document.getElementById("quote_bcv_banner_box");d&&(d.style.display=u==="VES"?"block":"none");const c=typeof ee<"u"?ee:850;if(u==="VES"){const g=e*c,l=i*c,m=r*c;a&&(a.innerHTML=`$${e.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}<br><span style="font-size:11px; color:#fde047;">Bs. ${g.toLocaleString("es-VE",{minimumFractionDigits:2,maximumFractionDigits:2})}</span>`),n&&(n.innerHTML=t===0?"EXENTO (0%)":`$${i.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}<br><span style="font-size:11px; color:#fde047;">Bs. ${l.toLocaleString("es-VE",{minimumFractionDigits:2,maximumFractionDigits:2})}</span>`),s&&(s.innerHTML=`$${r.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}<br><span style="font-size:12px; color:#fde047;">Bs. ${m.toLocaleString("es-VE",{minimumFractionDigits:2,maximumFractionDigits:2})}</span>`)}else a&&(a.innerText=`$${e.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`),n&&(n.innerText=t===0?"EXENTO (0%)":`$${i.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`),s&&(s.innerText=`$${r.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`)}function Ne(){P()}async function bt(o){var e;try{const t=window.authToken||localStorage.getItem("dalor_token")||null,i=t?{Authorization:`Bearer ${t}`}:{};if((window.allClients&&window.allClients.length>0?window.allClients:B||[]).length===0){const g=await E(`${x}/clients/`,{headers:i});if(g.ok){const l=await g.json();B=window.allClients=Array.isArray(l)?l:[]}}if(!window._servicesLoaded){const g=await E(`${x}/services/`,{headers:i});if(g.ok){const l=await g.json();q=window.allServices=Array.isArray(l)?l:[],window._servicesLoaded=!0}}typeof window.populateSelectDropdowns=="function"&&window.populateSelectDropdowns();const a=await E(`${x}/quotations/${o}`,{headers:i});if(!a.ok)throw new Error("No se pudo cargar la cotización para edición.");const n=await a.json(),s=document.getElementById("edit_quotation_id");s&&(s.value=n.id);const u=document.getElementById("modalQuotationTitle");u&&(u.innerHTML=`<i class="fa-solid fa-pen-to-square" style="color: var(--dalor-gold);"></i> Re-editar Presupuesto / Cotización [${n.quote_number}]`);const d=document.getElementById("btnSubmitQuotation");d&&(d.innerHTML='<i class="fa-solid fa-floppy-disk"></i> Guardar Cambios de Presupuesto');const c=document.getElementById("quote_client_id");if(c){const g=window.allClients&&window.allClients.length>0?window.allClients:B||[];if(g.length>0){let l='<option value="">-- Seleccione Cliente --</option>'+g.map(m=>`<option value="${m.id}">[${m.code}] ${m.name} (${m.rif||"Sin RIF"})</option>`).join("");c.innerHTML=l}n.client_id&&(c.value=String(n.client_id))}if(document.getElementById("quote_title")&&(document.getElementById("quote_title").value=n.project_title||""),document.getElementById("quote_location")&&(document.getElementById("quote_location").value=n.location||"Sede Central"),document.getElementById("quote_date")){let g="";n.created_at?g=n.created_at.substring(0,10):g=new Date().toISOString().substring(0,10),document.getElementById("quote_date").value=g}document.getElementById("quote_execution_time")&&(document.getElementById("quote_execution_time").value=n.execution_time||"15 días hábiles"),document.getElementById("quote_validity")&&(document.getElementById("quote_validity").value=n.validity_days||15),document.getElementById("quote_currency")&&(document.getElementById("quote_currency").value=n.currency||"USD"),document.getElementById("quote_tax_percent")&&(document.getElementById("quote_tax_percent").value=n.tax_percent!==void 0&&n.tax_percent!==null?n.tax_percent:n.tax_usd>0?16:0),document.getElementById("quote_notes")&&(document.getElementById("quote_notes").value=n.notes||""),document.getElementById("quote_coletilla_divisas")&&(document.getElementById("quote_coletilla_divisas").checked=n.coletilla_divisas!==!1),document.getElementById("quote_coletilla_modalidad")&&(document.getElementById("quote_coletilla_modalidad").checked=n.coletilla_modalidad!==!1),document.getElementById("quote_coletilla_bolivares")&&(document.getElementById("quote_coletilla_bolivares").checked=!!n.coletilla_bolivares);const p=document.getElementById("quoteItemsList");p&&(p.innerHTML="",te=0,n.items&&n.items.length>0?n.items.forEach(g=>oe(g)):oe()),P(),typeof window.openModal=="function"?window.openModal("modalQuotation"):(e=document.getElementById("modalQuotation"))==null||e.classList.remove("hidden")}catch(t){console.error("Error al re-editar presupuesto:",t),alert("Error cargando presupuesto: "+t.message)}}async function vt(o){var p,g;o&&o.preventDefault&&o.preventDefault();const e=document.getElementById("quote_client_id"),t=e?parseInt(e.value):null;if(!t){alert("Por favor selecciona un cliente de la lista.");return}const i=document.querySelectorAll("#quoteItemsList > div");let r=[];if(i.forEach(l=>{const m=l.querySelector(".q-srv-select"),y=m&&m.value?parseInt(m.value):null,w=m?m.options[m.selectedIndex]:null,_=w?w.getAttribute("data-code"):null,f=l.querySelector(".q-desc")?l.querySelector(".q-desc").value:"",b=l.querySelector(".q-unit")?l.querySelector(".q-unit").value:"Global",se=l.querySelector(".q-qty")?l.querySelector(".q-qty").value:"1",de=l.querySelector(".q-price")?l.querySelector(".q-price").value:"0",Ie=parseLocalizedNumber(se)||1,Se=parseLocalizedNumber(de)||0;r.push({service_id:y,item_code:_,description:f,unit_measure:b,quantity:Ie,unit_price_usd:Se,total_usd:Number((Ie*Se).toFixed(2))})}),r.length===0){alert("Agrega al menos una partida a la cotización.");return}const a=document.getElementById("edit_quotation_id")?document.getElementById("edit_quotation_id").value:"",n=!!a,s=document.getElementById("quote_date")?document.getElementById("quote_date").value:"";let u;s&&(u=`${s}T12:00:00`);const d={client_id:t,project_title:document.getElementById("quote_title").value,location:document.getElementById("quote_location").value||"Sede Central",execution_time:(document.getElementById("quote_execution_time").value||"").trim()||"15 días hábiles",currency:document.getElementById("quote_currency").value||"USD",validity_days:parseInt(document.getElementById("quote_validity")?document.getElementById("quote_validity").value:15)||15,tax_percent:parseLocalizedNumber((p=document.getElementById("quote_tax_percent"))==null?void 0:p.value)||0,exchange_rate:typeof ee<"u"?ee:850,notes:(((g=document.getElementById("quote_notes"))==null?void 0:g.value)||"").trim(),coletilla_divisas:document.getElementById("quote_coletilla_divisas")?document.getElementById("quote_coletilla_divisas").checked:!1,coletilla_modalidad:document.getElementById("quote_coletilla_modalidad")?document.getElementById("quote_coletilla_modalidad").checked:!1,coletilla_bolivares:document.getElementById("quote_coletilla_bolivares")?document.getElementById("quote_coletilla_bolivares").checked:!1,created_at:u,items:r},c=document.getElementById("btnSubmitQuotation");c&&(c.disabled=!0,c.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Guardando...');try{const l=n?`${x}/quotations/${a}`:`${x}/quotations/`,y=await E(l,{method:n?"PUT":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(d)});if(!y.ok){let f="Error al guardar el presupuesto";try{const b=await y.json();b&&b.detail&&(f=typeof b.detail=="string"?b.detail:JSON.stringify(b.detail))}catch{}throw new Error(f)}const w=await y.json();re("modalQuotation");const _=document.getElementById("quoteForm")||document.getElementById("quotationForm");_&&_.reset(),document.getElementById("edit_quotation_id")&&(document.getElementById("edit_quotation_id").value=""),typeof showToastNotification=="function"?showToastNotification(n?`Presupuesto ${w.quote_number||""} actualizado con éxito`:`Presupuesto ${w.quote_number||""} emitido con éxito`,"success"):typeof showToast=="function"?showToast(n?`Presupuesto ${w.quote_number||""} actualizado con éxito`:"Presupuesto creado con éxito","success"):alert(n?"Presupuesto actualizado con éxito.":"Presupuesto creado con éxito."),await loadQuotations()}catch(l){console.error("Error al guardar presupuesto:",l),typeof Swal<"u"?Swal.fire({icon:"error",title:"Error al Guardar Presupuesto",text:l.message||String(l)}):alert("Error al guardar presupuesto: "+l.message)}finally{c&&(c.disabled=!1,c.innerHTML='<i class="fa-solid fa-floppy-disk"></i> Guardar Presupuesto')}}function xt(){const o=document.getElementById("converting_quotation_id");o&&(o.value=""),sessionStorage.removeItem("dalor_active_converting_quote_id");const e=document.getElementById("quote_conversion_banner");e&&e.classList.add("hidden");const t=document.getElementById("projectCreateForm");t&&t.reset(),switchProjectSubtab("list")}async function Et(o){try{if(sessionStorage.setItem("dalor_active_converting_quote_id",String(o)),!B||B.length===0)try{const m=await E(`${x}/clients/`);m.ok&&(B=await m.json())}catch{}const e=await E(`${x}/quotations/${o}`);if(!e.ok)throw new Error("No se pudo cargar la información del presupuesto.");const t=await e.json();switchView("projects","proyectos"),switchProjectSubtab("form"),populatePlanDropdownSelectors();const i=document.getElementById("converting_quotation_id");i&&(i.value=t.id);const r=document.getElementById("quote_conversion_banner"),a=document.getElementById("quote_conversion_text");r&&r.classList.remove("hidden");const n=t.client?t.client.name:t.client_name||"Cliente";a&&(a.innerText=`Presupuesto [${t.quote_number}] para ${n}. Monto: $${t.total_usd.toLocaleString("en-US",{minimumFractionDigits:2})}. Revisa y completa los campos a continuación:`);const s=document.getElementById("new_proj_code");if(s&&(s.readOnly=!0,s.style.backgroundColor="#f1f5f9",s.style.cursor="not-allowed",E(`${x}/projects/next-code`).then(m=>m.json()).then(m=>{m&&m.next_code&&s&&(s.value=m.next_code)}).catch(m=>{console.warn("Fallback cálculo código proyecto:",m);const y=(Te?Te.length:0)+1;s&&(s.value=`PRJ-2026-${String(y).padStart(3,"0")}`)})),document.getElementById("new_proj_name")&&(document.getElementById("new_proj_name").value=t.project_title||""),document.getElementById("new_proj_start_date")){let m=(t.created_at||"").substring(0,10);document.getElementById("new_proj_start_date").value=m||new Date().toISOString().substring(0,10)}const u=document.getElementById("new_proj_client_id");u&&t.client_id&&(u.value=String(t.client_id));const d=(t.location||"").trim(),c=!d||d.toLowerCase().includes("sede")||d.toLowerCase().includes("central")||d.toLowerCase().includes("taller")||d.toLowerCase().includes("guacara");typeof setProjectType=="function"?setProjectType(c?"sede":"foraneo"):typeof window.setProjectType=="function"&&window.setProjectType(c?"sede":"foraneo"),document.getElementById("new_proj_location")&&(document.getElementById("new_proj_location").value=d||(c?"Sede Central (Taller Guacara)":""));let p=30;if(t.execution_time){const m=t.execution_time.match(/\d+/);m&&(p=parseInt(m[0]))}document.getElementById("new_proj_duration")&&(document.getElementById("new_proj_duration").value=p),document.getElementById("new_proj_contract")&&(document.getElementById("new_proj_contract").value=t.total_usd.toFixed(2));let g=`Obra adjudicada bajo Presupuesto ${t.quote_number}.
Partidas y APU contratadas:
`;t.items&&t.items.length>0?g+=t.items.map((m,y)=>`${y+1}. [${m.item_code||"SER"}] ${m.description} (Cant: ${m.quantity} ${m.unit_measure||"Global"})`).join(`
`):g+=t.project_title,document.getElementById("new_proj_scope")&&(document.getElementById("new_proj_scope").value=g),document.getElementById("new_proj_labor")&&(document.getElementById("new_proj_labor").value="0.00"),document.getElementById("new_proj_fuel")&&(document.getElementById("new_proj_fuel").value="0.00"),document.getElementById("new_proj_tools")&&(document.getElementById("new_proj_tools").value="0.00"),document.getElementById("new_proj_services")&&(document.getElementById("new_proj_services").value="0.00"),typeof updatePlanMaterialsCostTotal=="function"?updatePlanMaterialsCostTotal():typeof window.updatePlanMaterialsCostTotal=="function"?window.updatePlanMaterialsCostTotal():document.getElementById("new_proj_materials")&&(document.getElementById("new_proj_materials").value="0.00");const l=document.getElementById("projectPhasesContainer");l&&typeof addProjectPhaseRow=="function"&&(l.innerHTML="",window.phaseRowsCount=0,addProjectPhaseRow("Fase 1: Ejecución del Proyecto",[],p,0)),recalcProjectBudgetPreview(),window.scrollTo({top:0,behavior:"smooth"})}catch(e){console.error("Error al convertir presupuesto:",e),alert("Error al vincular presupuesto: "+e.message)}}async function Oe(o){const e=document.getElementById("quoteClientRiskAlert"),t=document.getElementById("quoteClientRiskDetails");if(!e||!o){e&&(e.style.display="none");return}try{const i=await E(`${x}/clients/${o}/credit-risk`);if(!i.ok){e.style.display="none";return}const r=await i.json();if(r&&r.has_risk){let a=(r.bad_debts||[]).map(n=>`"¢ <strong>${n.invoice_number||"Doc"}</strong>: $${(n.amount_usd||0).toFixed(2)} USD <em>(${n.reason||"Sin motivo"})</em>`).join("<br>");t&&(t.innerHTML=`
                    Este cliente posee antecedentes de <strong>cuenta incobrable / castigada</strong> por un total de <strong>$${(r.total_bad_debt_usd||0).toFixed(2)} USD</strong>.<br>
                    <div style="margin-top: 4px; padding: 4px 6px; background: rgba(255,255,255,0.7); border-radius: 4px;">${a}</div>
                    <span style="font-size: 10px; color: #881337; margin-top: 4px; display: block;">
                        <strong>Decisión Operativa:</strong> Puede autorizar emitir esta cotización bajo supervisión comercial o cambiar a otro cliente.
                    </span>
                `),e.style.display="block",window.quoteClientRiskDismissed=!1}else e.style.display="none",window.quoteClientRiskDismissed=!0}catch(i){console.warn("Error al verificar riesgo crediticio:",i),e&&(e.style.display="none")}}function ht(o){if(!o){const e=document.getElementById("quoteClientRiskAlert");e&&(e.style.display="none");return}Oe(o)}function It(){const o=document.getElementById("quoteClientRiskAlert");o&&(o.style.display="none"),window.quoteClientRiskDismissed=!0;const e=document.getElementById("quote_client_id"),t=e?e.options[e.selectedIndex]:null;t&&console.log(`[Riesgo Crediticio] Cliente ${t.text} autorizado manualmente para cotización.`)}function St(){const o=document.getElementById("quote_client_id");o&&(o.value="");const e=document.getElementById("quoteClientRiskAlert");e&&(e.style.display="none"),window.quoteClientRiskDismissed=!1}typeof window<"u"&&(window.openNewQuotationModal=ft,window.onTaxTypeChanged=wt,window.addQuotationRow=oe,window.removeQuotationRow=yt,window.onServiceSelected=_t,window.recalcQuotationTotals=P,window.onQuotationCurrencyChanged=Ne,window.editQuotation=bt,window.submitCreateQuotation=vt,window.cancelQuotationConversion=xt,window.convertQuoteToProject=Et,window.checkQuoteClientCreditRisk=Oe,window.onQuoteClientChanged=ht,window.confirmQuoteClientRisk=It,window.cancelQuoteClientRisk=St);var Bt=window.API_BASE||window.location.origin+"/api/v1";window.allClients=window.allClients||[];window.allServices=window.allServices||[];window.allProjects=window.allProjects||[];window.allCategories=window.allCategories||[];window.allMaterials=window.allMaterials||[];var $t=window.EXCHANGE_RATE=window.EXCHANGE_RATE||850;window.BCV_DATA=window.BCV_DATA||{rate:850,source:"BCV Oficial"};window.authToken=window.authToken||localStorage.getItem("dalor_token")||null;const Ct=["Fabricación Metalmecánica","Montaje e Instalación en Sitio","Mantenimiento Industrial & Paradas","Soldadura Especializada & Pailería","Mecanizado & Torno","Arenado y Pintura Industrial","Obras Civiles & Eléctricas Asociadas"];typeof window<"u"&&(window.OFFICIAL_DALOR_APU_CATEGORIES=Ct);function Tt(o,e={}){var t=sessionStorage.getItem("dalor_token")||localStorage.getItem("dalor_token")||window.authToken||"",i=Object.assign({},e.headers||{});return t&&(i.Authorization="Bearer "+t),e.body&&!(e.body instanceof FormData)&&!i["Content-Type"]&&(i["Content-Type"]="application/json"),e.body instanceof FormData&&delete i["Content-Type"],window.fetch(o,Object.assign({},e,{headers:i}))}async function At(o){try{const e=await Tt(`${Bt}/quotations/${o}`);if(!e.ok)throw new Error("No se pudo cargar la cotización.");const t=await e.json(),i=t.exchange_rate||$t||800,r=(t.currency||"USD").toUpperCase();let a="$",n="USD",s="",u="",d="P. Unit ($)",c="Total ($)";if(r==="USD"){a="$",n="USD",d="P. Unit ($ USD)",c="Total ($ USD)";const w=`$${t.subtotal_usd.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`,_=t.tax_usd===0?"EXENTO (0%)":`$${t.tax_usd.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`,f=`$${t.total_usd.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`;u=`

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

                    <span style="color: #0072B8;">${f}</span>

                </div>

            `,s=""}else if(r==="VES"){a="Bs.",n="VES",d="P. Unit (Bs.)",c="Total (Bs.)";const w=t.subtotal_usd*i,_=t.tax_usd*i,f=t.total_usd*i,b=`Bs. ${w.toLocaleString("es-VE",{minimumFractionDigits:2,maximumFractionDigits:2})}`,se=_===0?"EXENTO (0%)":`Bs. ${_.toLocaleString("es-VE",{minimumFractionDigits:2,maximumFractionDigits:2})}`,de=`Bs. ${f.toLocaleString("es-VE",{minimumFractionDigits:2,maximumFractionDigits:2})}`;u=`

                <div style="display: flex; justify-content: space-between; font-size: 11.5px; margin-bottom: 4px;">

                    <span style="color: #475569;">Subtotal:</span>

                    <span style="font-weight: 700; color: #1e293b;">${b}</span>

                </div>

                <div style="display: flex; justify-content: space-between; font-size: 11.5px; margin-bottom: 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">

                    <span style="color: #475569;">IVA (${t.tax_percent}%):</span>

                    <span style="font-weight: 700; color: ${_===0?"#10b981":"#d97706"};">${se}</span>

                </div>

                <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: 900; color: #002B49;">

                    <span>TOTAL BS:</span>

                    <span style="color: #0072B8;">${de}</span>

                </div>

            `,s=""}else{a="â‚¬",n="EUR",d="P. Unit (â‚¬ EUR)",c="Total (â‚¬ EUR)";const w=`â‚¬ ${t.subtotal_usd.toLocaleString("de-DE",{minimumFractionDigits:2,maximumFractionDigits:2})}`,_=t.tax_usd===0?"EXENTO (0%)":`â‚¬ ${t.tax_usd.toLocaleString("de-DE",{minimumFractionDigits:2,maximumFractionDigits:2})}`,f=`â‚¬ ${t.total_usd.toLocaleString("de-DE",{minimumFractionDigits:2,maximumFractionDigits:2})}`;u=`

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

                    <span style="color: #0072B8;">${f}</span>

                </div>

            `,s=""}let p=[];(t.coletilla_divisas===!0||t.terms_currency_usd_only===!0)&&p.push("<b>Condición de Pago:</b> Solo pagadero en divisas (USD)."),(t.coletilla_modalidad===!0||t.terms_check_payment_mode===!0)&&p.push("<b>Modalidad de Pago:</b> Consultar modalidad de pago."),t.coletilla_bolivares===!0&&p.push("<b>Pago en Bolívares (Bs.):</b> En caso de realizar el pago en Bolívares, se calculará a la tasa oficial del Banco Central de Venezuela (BCV) correspondiente a la fecha valor del pago efectivo.");let g="";t.notes&&t.notes.trim()&&(g=`
                <div style="background: #ffffff; border: 1.5px solid #cbd5e1; border-left: 4px solid #0072B8; border-radius: 6px; padding: 10px 14px; margin-bottom: 12px; font-size: 11px; color: #1e293b; line-height: 1.45; page-break-inside: avoid;">
                    <div style="font-weight: 800; color: #002B49; margin-bottom: 4px; text-transform: uppercase; font-size: 10.5px;">
                        <i class="fa-solid fa-clipboard-list" style="color: #0072B8;"></i> Notas & Observaciones Comerciales del Presupuesto:
                    </div>
                    <p style="margin: 0; white-space: pre-wrap;">${t.notes.trim()}</p>
                </div>
            `);let l="";p.length>0&&(l=`
                <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-left: 4px solid #F5B800; padding: 8px 12px; border-radius: 6px; margin-bottom: 12px; font-size: 10.5px; color: #334155; line-height: 1.45; page-break-inside: avoid;">
                    ${p.map(w=>`<p style="margin: 3px 0;">• ${w}</p>`).join("")}
                </div>
            `);const m=(t.items||[]).map((w,_)=>{let f=`$${w.unit_price_usd.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`,b=`$${w.total_usd.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`;return r==="VES"?(f=`Bs. ${(w.unit_price_usd*i).toLocaleString("es-VE",{minimumFractionDigits:2,maximumFractionDigits:2})}`,b=`Bs. ${(w.total_usd*i).toLocaleString("es-VE",{minimumFractionDigits:2,maximumFractionDigits:2})}`):r==="EUR"&&(f=`â‚¬ ${w.unit_price_usd.toLocaleString("de-DE",{minimumFractionDigits:2,maximumFractionDigits:2})}`,b=`â‚¬ ${w.total_usd.toLocaleString("de-DE",{minimumFractionDigits:2,maximumFractionDigits:2})}`),`

            <tr style="page-break-inside: avoid;">

                <td style="text-align: center; font-weight: bold; border: 1px solid #cbd5e1; padding: 6px 4px; font-size: 11px;">${_+1}</td>

                <td style="text-align: center; color: #0284c7; font-weight: 800; border: 1px solid #cbd5e1; padding: 6px 4px; font-size: 11px;">${w.item_code||"SER-"+(_+1)}</td>

                <td style="border: 1px solid #cbd5e1; padding: 6px 8px; font-weight: 600; font-size: 11px; line-height: 1.35;">${w.description}</td>

                <td style="text-align: center; border: 1px solid #cbd5e1; padding: 6px 4px; font-size: 11px;">${w.unit_measure||"Global"}</td>

                <td style="text-align: center; font-weight: bold; border: 1px solid #cbd5e1; padding: 6px 4px; font-size: 11px;">${w.quantity}</td>

                <td style="text-align: right; border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 11px;">${f}</td>

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

                    ${m}

                </tbody>

            </table>



            <!-- Bloque de Totales -->

            <div style="display: flex; justify-content: flex-end; margin-bottom: 16px; page-break-inside: avoid;">

                <div style="width: 310px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 14px;">

                    ${u}

                </div>

            </div>



            <!-- Notas y Coletillas Comerciales (Punto 4 y 5) -->
            ${g}
            ${l}

            <!-- Coletilla de Condiciones Cambiarias -->
            ${s}



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

        `;document.getElementById("modalPrintPreviewContent").innerHTML=y,document.getElementById("previewModalTitle").textContent=`Presupuesto ${t.quote_number} | ${t.client&&t.client.name||"Cliente"}`,document.getElementById("modalPrintPreview").classList.remove("hidden")}catch(e){alert("Error al visualizar cotización: "+e.message)}}function Pt(){var t;const o=document.getElementById("modalPrintPreviewContent"),e=((t=document.getElementById("previewModalTitle"))==null?void 0:t.textContent)||"Presupuesto DALOR";typeof window.printElementHtml=="function"&&o?window.printElementHtml(o,e):window.print()}typeof window<"u"&&(window.printQuotation=At,window.triggerPrintFromModal=Pt);var D=window.API_BASE||window.location.origin+"/api/v1";window.allClients=window.allClients||[];var h=window.allServices=window.allServices||[];window.allProjects=window.allProjects||[];window.allCategories=window.allCategories||[];window.allMaterials=window.allMaterials||[];window.EXCHANGE_RATE=window.EXCHANGE_RATE||850;window.BCV_DATA=window.BCV_DATA||{rate:850,source:"BCV Oficial"};window.authToken=window.authToken||localStorage.getItem("dalor_token")||null;const Re=["Fabricación Metalmecánica","Montaje e Instalación en Sitio","Mantenimiento Industrial & Paradas","Soldadura Especializada & Pailería","Mecanizado & Torno","Arenado y Pintura Industrial","Obras Civiles & Eléctricas Asociadas"];typeof window<"u"&&(window.OFFICIAL_DALOR_APU_CATEGORIES=Re);function j(o,e={}){var t=sessionStorage.getItem("dalor_token")||localStorage.getItem("dalor_token")||window.authToken||"",i=Object.assign({},e.headers||{});return t&&(i.Authorization="Bearer "+t),e.body&&!(e.body instanceof FormData)&&!i["Content-Type"]&&(i["Content-Type"]="application/json"),e.body instanceof FormData&&delete i["Content-Type"],window.fetch(o,Object.assign({},e,{headers:i}))}let L=[],U=1,Ue=10,M="",pe="";function qt(o){U=o,H();const e=document.getElementById("servicesTableBody");e&&e.scrollIntoView({behavior:"smooth",block:"nearest"})}function Lt(o){Ue=parseInt(o)||10,U=1,H()}function Ft(o){M=(o||"").toLowerCase().trim(),xe()}function Dt(o){pe=(o||"").trim(),xe()}function xe(){L=(h||[]).filter(o=>{const e=!M||o.name&&o.name.toLowerCase().includes(M)||o.code&&o.code.toLowerCase().includes(M)||o.unit_measure&&o.unit_measure.toLowerCase().includes(M),t=!pe||o.category===pe;return e&&t}),U=1,H()}function H(){const o=document.getElementById("servicesTableBody");if(!o)return;const e=L;if(e.length===0){o.innerHTML=`<tr><td colspan="8" style="text-align: center; padding: 25px; color: #64748b; font-weight: 500;">
            <i class="fa-solid fa-folder-open" style="font-size: 24px; color: #94a3b8; margin-bottom: 8px; display: block;"></i>
            No se encontraron partidas que coincidan con los filtros.
        </td></tr>`;const n=document.getElementById("servicesPaginationContainer");n&&(n.innerHTML="");return}const t=typeof window.renderPaginationControls=="function"?window.renderPaginationControls:typeof F=="function"?F:()=>({startIndex:0,endIndex:e.length}),{startIndex:i,endIndex:r}=t({containerId:"servicesPaginationContainer",totalItems:e.length,currentPage:U,pageSize:Ue,onPageChange:"goToServicesPage",onPageSizeChange:"changeServicesPageSize",itemLabel:"partida(s)",pageSizeOptions:[10,25,50,100]}),a=e.slice(i,r);o.innerHTML=a.map(n=>{const s=(n.unit_price_usd||0)-(n.base_cost_usd||0);return`
        <tr>
            <td style="font-weight: 800; color: var(--dalor-blue);">${n.code}</td>
            <td style="font-weight: 600; color: var(--dalor-navy);">${n.name}</td>
            <td><span style="font-size: 11px; background: #e0f2fe; color: #0369a1; padding: 3px 8px; border-radius: 6px; font-weight: 700;">${n.category}</span></td>
            <td>${n.unit_measure}</td>
            <td>$${Number(n.base_cost_usd||0).toFixed(2)}</td>
            <td style="font-weight: 800; color: var(--dalor-navy);">$${Number(n.unit_price_usd||0).toFixed(2)}</td>
            <td style="color: #059669; font-weight: 700;">+$${s.toFixed(2)}</td>
            <td style="text-align: center; white-space: nowrap;">
                <button onclick="openEditServiceModal(${n.id})" class="btn-secondary" style="padding: 4px 8px; color: var(--dalor-blue); margin-right: 4px;" title="Editar Partida">
                    <i class="fa-solid fa-pen-to-square"></i>
                </button>
                <button onclick="deleteService(${n.id})" class="btn-secondary" style="padding: 4px 8px; color: #ef4444;" title="Inactivar Partida">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        </tr>`}).join("")}async function le(){const o=document.getElementById("servicesTableBody");o&&(o.innerHTML='<tr><td colspan="8" style="text-align: center; padding: 20px; color: #94a3b8;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando partidas...</td></tr>');try{const e=await j(`${D}/services/`);if(!e.ok)throw new Error("Error HTTP "+e.status);const t=await e.json();h=Array.isArray(t)?t:[],L=h,U=1,H()}catch{o&&(o.innerHTML='<tr><td colspan="8" style="text-align: center; color: #e11d48;">Error al cargar servicios.</td></tr>')}}function Ee(){try{return JSON.parse(localStorage.getItem("dalor_custom_apu_categories")||"[]")}catch{return[]}}function he(){try{return JSON.parse(localStorage.getItem("dalor_custom_apu_units")||"[]")}catch{return[]}}function O(o){if(!o||typeof o!="string")return;const e=o.trim();if(!(!e||e==="__NEW__"))try{const t=Ee();t.includes(e)||(t.push(e),localStorage.setItem("dalor_custom_apu_categories",JSON.stringify(t)))}catch{}}function R(o){if(!o||typeof o!="string")return;const e=o.trim();if(!(!e||e==="__NEW__"))try{const t=he();t.includes(e)||(t.push(e),localStorage.setItem("dalor_custom_apu_units",JSON.stringify(t)))}catch{}}function He(){const o=new Set(Re);return Ee().forEach(e=>e&&o.add(e.trim())),(window.allServices||h||[]).forEach(e=>{e.category&&typeof e.category=="string"&&e.category.trim()&&e.category!=="__NEW__"&&o.add(e.category.trim())}),Array.from(o)}function Ve(){const o=["Kilogramo (kg)","Tonelada (ton)","Metro (m)","Metro Cuadrado (m²)","Metro Cúbico (m³)","Pieza (und)","Global (gl)","Hora-Hombre (hh)","Día (dia)","Pulgada-Diámetro (pulg-diam)","Litro (L)","Galón (gal)"],e=new Set(o);return he().forEach(t=>t&&e.add(t.trim())),(window.allServices||h||[]).forEach(t=>{t.unit_measure&&typeof t.unit_measure=="string"&&t.unit_measure.trim()&&t.unit_measure!=="__NEW__"&&e.add(t.unit_measure.trim())}),Array.from(e)}function V(){const o=He(),e=Ve(),t=o.map(d=>`<option value="${d}">${d}</option>`).join("")+'<option value="__NEW__" style="color: #0284c7; font-weight: 800;">âž• Escribir Nueva Categoría...</option>',i=e.map(d=>`<option value="${d}">${d}</option>`).join("")+'<option value="__NEW__" style="color: #0284c7; font-weight: 800;">âž• Escribir Nueva Unidad...</option>',r=document.getElementById("srv_category");if(r){const d=r.value;r.innerHTML=t,d&&d!=="__NEW__"&&o.includes(d)?r.value=d:o.length>0&&d!=="__NEW__"&&(r.value=o[0])}const a=document.getElementById("srv_unit");if(a){const d=a.value;a.innerHTML=i,d&&d!=="__NEW__"&&e.includes(d)?a.value=d:e.length>0&&d!=="__NEW__"&&(a.value=e[0])}const n=document.getElementById("edit_srv_category");if(n){const d=n.value;n.innerHTML=t,d&&d!=="__NEW__"&&o.includes(d)&&(n.value=d)}const s=document.getElementById("edit_srv_unit");if(s){const d=s.value;s.innerHTML=i,d&&d!=="__NEW__"&&e.includes(d)&&(s.value=d)}const u=document.getElementById("serviceCategoryFilter");if(u){const d=u.value;u.innerHTML='<option value="">Todas las Categorías</option>'+o.map(c=>`<option value="${c}">${c}</option>`).join(""),d&&o.includes(d)&&(u.value=d)}}function jt(o){const e=document.getElementById("srv_new_category");e&&(o==="__NEW__"?(e.classList.remove("hidden"),e.focus()):(e.classList.add("hidden"),e.value=""))}function kt(o){const e=document.getElementById("srv_new_unit");e&&(o==="__NEW__"?(e.classList.remove("hidden"),e.focus()):(e.classList.add("hidden"),e.value=""))}function Mt(o){const e=document.getElementById("edit_srv_new_category");e&&(o==="__NEW__"?(e.classList.remove("hidden"),e.focus()):(e.classList.add("hidden"),e.value=""))}function zt(o){const e=document.getElementById("edit_srv_new_unit");e&&(o==="__NEW__"?(e.classList.remove("hidden"),e.focus()):(e.classList.add("hidden"),e.value=""))}async function Nt(){const o=document.getElementById("serviceForm");o&&o.reset();const e=document.getElementById("srv_new_category");e&&(e.value="",e.classList.add("hidden"));const t=document.getElementById("srv_new_unit");t&&(t.value="",t.classList.add("hidden"));const i=document.getElementById("srv_code");i&&(i.value="Generando correlativo...",i.setAttribute("readonly","true"),i.style.backgroundColor="#f1f5f9",i.style.cursor="not-allowed",i.style.fontWeight="700");const r=document.getElementById("newSrvMarginBadge");r&&(r.innerHTML="");const a=document.getElementById("btnSubmitCreateService");a&&(a.disabled=!1,a.title="",a.innerHTML='<i class="fa-solid fa-floppy-disk"></i> Guardar Partida'),V(),ye("modalService");try{const n=await j(`${D}/services/next-code`);if(n.ok){const s=await n.json();i&&s&&s.next_code&&(i.value=s.next_code)}else if(i){const s=(h?h.length:0)+1;i.value=`APU-${String(s).padStart(3,"0")}`}}catch(n){console.warn("No se pudo obtener correlativo de APU:",n),i&&i.value.includes("Generando")&&(i.value="APU-001")}}async function Ot(o){var s,u,d,c,p,g,l,m,y,w;o&&o.preventDefault&&o.preventDefault();let e=(s=document.getElementById("srv_category"))==null?void 0:s.value;if(e==="__NEW__"){const _=(((u=document.getElementById("srv_new_category"))==null?void 0:u.value)||"").trim();if(!_){alert("Por favor escribe el nombre de la nueva categoría."),(d=document.getElementById("srv_new_category"))==null||d.focus();return}e=_,O(e)}let t=(c=document.getElementById("srv_unit"))==null?void 0:c.value;if(t==="__NEW__"){const _=(((p=document.getElementById("srv_new_unit"))==null?void 0:p.value)||"").trim();if(!_){alert("Por favor escribe la unidad de medida (ej: Kg, Ton, Galón, etc.)."),(g=document.getElementById("srv_new_unit"))==null||g.focus();return}t=_,R(t)}const i=parseFloat(String(((l=document.getElementById("srv_cost"))==null?void 0:l.value)||"").replace(",","."))||0,r=parseFloat(String(((m=document.getElementById("srv_price"))==null?void 0:m.value)||"").replace(",","."))||0,a={code:document.getElementById("srv_code").value.trim(),name:document.getElementById("srv_name").value.trim(),category:e,unit_measure:t,base_cost_usd:i,unit_price_usd:r};if(!a.name){alert("El nombre de la partida es obligatorio."),(y=document.getElementById("srv_name"))==null||y.focus();return}if(r<i){const _=(r-i).toFixed(2);alert(`⛔ OPERACIÓN DENEGADA | MARGEN NEGATIVO

El Precio de Venta ($${r.toFixed(2)}) no puede ser menor al Costo Base ($${i.toFixed(2)}).

Pérdida calculada: -$${Math.abs(_)} USD.

Por favor ajusta el precio para garantizar la rentabilidad.`),(w=document.getElementById("srv_price"))==null||w.focus();return}const n=document.getElementById("btnSubmitCreateService")||document.querySelector('#serviceForm button[type="submit"]');n&&(n.disabled=!0,n.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Guardando...');try{const _=await j(`${D}/services/`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(a)});if(_.ok){const f=await _.json();re("modalService"),typeof showToastNotification=="function"?showToastNotification(`Partida ${f.code} registrada exitosamente`,"success"):typeof showToast=="function"?showToast(`Partida ${f.code} registrada exitosamente`,"success"):alert(`Partida ${f.code} registrada exitosamente.`),O(f.category||e),R(f.unit_measure||t),await ae(),await le(),V()}else{const f=await _.json().catch(()=>({}));alert("Error al registrar partida: "+(f.detail||"Respuesta inválida del servidor"))}}catch(_){console.error("Error al guardar servicio:",_),alert("Error de conexión al guardar servicio.")}finally{n&&(n.disabled=!1,n.innerHTML='<i class="fa-solid fa-floppy-disk"></i> Guardar Partida')}}async function Rt(o){let e=window.allServices&&window.allServices.length>0?window.allServices:h||[];(!e||e.length===0)&&(e=typeof L<"u"&&L.length>0?L:[]);let t=e.find(s=>s&&(s.id===o||String(s.id)===String(o)));if(!t)try{const s=await j(`${D}/services/`);if(s.ok){const u=await s.json();window.allServices=Array.isArray(u)?u:[],h=window.allServices,t=h.find(d=>d&&(d.id===o||String(d.id)===String(o)))}}catch{}if(!t){alert("Partida no encontrada en el catálogo.");return}V();const i=document.getElementById("edit_srv_new_category");i&&(i.value="",i.classList.add("hidden"));const r=document.getElementById("edit_srv_new_unit");r&&(r.value="",r.classList.add("hidden")),document.getElementById("edit_srv_id").value=t.id,document.getElementById("edit_srv_code").value=t.code,document.getElementById("edit_srv_name").value=t.name;const a=document.getElementById("edit_srv_category");if(a){if(t.category&&!Array.from(a.options).some(s=>s.value===t.category)){const s=document.createElement("option");s.value=t.category,s.textContent=t.category,a.insertBefore(s,a.lastElementChild)}a.value=t.category}const n=document.getElementById("edit_srv_unit");if(n){if(t.unit_measure&&!Array.from(n.options).some(s=>s.value===t.unit_measure)){const s=document.createElement("option");s.value=t.unit_measure,s.textContent=t.unit_measure,n.insertBefore(s,n.lastElementChild)}n.value=t.unit_measure}document.getElementById("edit_srv_cost").value=t.base_cost_usd,document.getElementById("edit_srv_price").value=t.unit_price_usd,Ge(),ye("modalEditService")}async function Ut(o){var u,d,c,p,g,l,m,y,w,_;o&&o.preventDefault&&o.preventDefault();const e=document.getElementById("edit_srv_id").value;let t=(u=document.getElementById("edit_srv_category"))==null?void 0:u.value;if(t==="__NEW__"){const f=(((d=document.getElementById("edit_srv_new_category"))==null?void 0:d.value)||"").trim();if(!f){alert("Por favor escribe el nombre de la nueva categoría."),(c=document.getElementById("edit_srv_new_category"))==null||c.focus();return}t=f,O(t)}let i=(p=document.getElementById("edit_srv_unit"))==null?void 0:p.value;if(i==="__NEW__"){const f=(((g=document.getElementById("edit_srv_new_unit"))==null?void 0:g.value)||"").trim();if(!f){alert("Por favor escribe la unidad de medida."),(l=document.getElementById("edit_srv_new_unit"))==null||l.focus();return}i=f,R(i)}const r=parseFloat(String(((m=document.getElementById("edit_srv_cost"))==null?void 0:m.value)||"").replace(",","."))||0,a=parseFloat(String(((y=document.getElementById("edit_srv_price"))==null?void 0:y.value)||"").replace(",","."))||0,n={name:document.getElementById("edit_srv_name").value.trim(),category:t,unit_measure:i,base_cost_usd:r,unit_price_usd:a};if(!n.name){alert("El nombre de la partida es obligatorio."),(w=document.getElementById("edit_srv_name"))==null||w.focus();return}if(a<r){const f=(a-r).toFixed(2);alert(`⛔ OPERACIÓN DENEGADA | MARGEN NEGATIVO

El Precio de Venta ($${a.toFixed(2)}) no puede ser menor al Costo Base ($${r.toFixed(2)}).

Pérdida calculada: -$${Math.abs(f)} USD.

Por favor ajusta el precio para garantizar la rentabilidad.`),(_=document.getElementById("edit_srv_price"))==null||_.focus();return}const s=document.querySelector('#editServiceForm button[type="submit"]');s&&(s.disabled=!0,s.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Guardando...');try{const f=await j(`${D}/services/${e}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(n)});if(f.ok)re("modalEditService"),typeof showToastNotification=="function"?showToastNotification("Partida actualizada exitosamente","success"):typeof showToast=="function"?showToast("Partida actualizada exitosamente","success"):alert("Partida actualizada exitosamente."),O(n.category),R(n.unit_measure),await ae(),await le(),V();else{const b=await f.json().catch(()=>({}));alert("Error al actualizar partida: "+(b.detail||"Respuesta inválida del servidor"))}}catch(f){console.error("Error al actualizar servicio:",f),alert("Error de conexión al actualizar servicio.")}finally{s&&(s.disabled=!1,s.innerHTML='<i class="fa-solid fa-floppy-disk"></i> Guardar Cambios')}}async function Ht(o){if(confirm("¿Deseas eliminar permanentemente esta partida de servicio del catálogo?"))try{(await j(`${D}/services/${o}?permanent=true`,{method:"DELETE"})).ok?(await ae(),le()):alert("Error al eliminar partida.")}catch{alert("Error de conexión al eliminar servicio.")}}function Ge(){const o=document.getElementById("edit_srv_cost"),e=document.getElementById("edit_srv_price"),t=parseFloat(o==null?void 0:o.value)||0,i=parseFloat(e==null?void 0:e.value)||0,r=document.getElementById("editSrvMarginBadge"),a=document.querySelector('#editServiceForm button[type="submit"]');if(!(o!=null&&o.value)&&!(e!=null&&e.value)){r&&(r.innerHTML=""),a&&(a.disabled=!1);return}const n=i-t,s=t>0?(n/t*100).toFixed(1):"N/A";i<t?(r&&(r.innerHTML=`<span style="color:#e11d48;background:#fff1f2;padding:4px 10px;border-radius:6px;border:1px solid #fecdd3;display:inline-block;">❌ ERROR: Precio ($${i.toFixed(2)}) menor al costo ($${t.toFixed(2)}) — Pérdida: -$${Math.abs(n).toFixed(2)} (${Math.abs(s)}%)</span>`),a&&(a.disabled=!0,a.title="No se puede guardar una partida con precio menor al costo")):n===0?(r&&(r.innerHTML='<span style="color:#b45309;background:#fffbeb;padding:4px 10px;border-radius:6px;border:1px solid #fde68a;display:inline-block;">⚠️ Margen Cero: Precio igual al costo base, sin ganancia</span>'),a&&(a.disabled=!1,a.title="")):(r&&(r.innerHTML=`<span style="color:#059669;background:#ecfdf5;padding:4px 10px;border-radius:6px;border:1px solid #a7f3d0;display:inline-block;">✅ Margen Válido: Ganancia +$${n.toFixed(2)} (+${s}% sobre costo)</span>`),a&&(a.disabled=!1,a.title=""))}function Vt(){const o=document.getElementById("srv_cost"),e=document.getElementById("srv_price"),t=parseFloat(o==null?void 0:o.value)||0,i=parseFloat(e==null?void 0:e.value)||0,r=document.getElementById("newSrvMarginBadge"),a=document.getElementById("btnSubmitCreateService")||document.querySelector('#serviceForm button[type="submit"]');if(!(o!=null&&o.value)&&!(e!=null&&e.value)){r&&(r.innerHTML=""),a&&(a.disabled=!1);return}const n=i-t,s=t>0?(n/t*100).toFixed(1):"N/A";i<t?(r&&(r.innerHTML=`<span style="color:#e11d48;background:#fff1f2;padding:4px 10px;border-radius:6px;border:1px solid #fecdd3;display:inline-block;">❌ ERROR: Precio ($${i.toFixed(2)}) menor al costo ($${t.toFixed(2)}) — Pérdida: -$${Math.abs(n).toFixed(2)} (${Math.abs(s)}%)</span>`),a&&(a.disabled=!0,a.title="No se puede guardar una partida con precio menor al costo")):n===0?(r&&(r.innerHTML='<span style="color:#b45309;background:#fffbeb;padding:4px 10px;border-radius:6px;border:1px solid #fde68a;display:inline-block;">⚠️ Margen Cero: Precio igual al costo base, sin ganancia</span>'),a&&(a.disabled=!1,a.title="")):(r&&(r.innerHTML=`<span style="color:#059669;background:#ecfdf5;padding:4px 10px;border-radius:6px;border:1px solid #a7f3d0;display:inline-block;">✅ Margen Válido: Ganancia +$${n.toFixed(2)} (+${s}% sobre costo)</span>`),a&&(a.disabled=!1,a.title=""))}window.calcEditServiceMargin=Ge;window.calcNewServiceMargin=Vt;typeof window<"u"&&(window.goToServicesPage=qt,window.changeServicesPageSize=Lt,window.onServiceSearchInput=Ft,window.onServiceCategoryFilterChange=Dt,window.filterAndPaginateServices=xe,window.renderServicesPaginated=H,window.loadServices=le,window.getCustomCategories=Ee,window.getCustomUnits=he,window.registerCustomCategory=O,window.registerCustomUnit=R,window.getAllServiceCategories=He,window.getAllServiceUnits=Ve,window.populateServiceCategoriesAndUnits=V,window.onServiceCategoryChanged=jt,window.onServiceUnitChanged=kt,window.onEditServiceCategoryChanged=Mt,window.onEditServiceUnitChanged=zt,window.openNewServiceModal=Nt,window.submitCreateService=Ot,window.openEditServiceModal=Rt,window.submitEditService=Ut,window.deleteService=Ht);
