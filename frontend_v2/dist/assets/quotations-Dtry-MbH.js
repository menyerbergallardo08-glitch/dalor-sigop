function be(t,e=2){const o=Math.pow(10,e);return Math.round((Number(t)||0)*o)/o}window.roundNumber=be;function re(t){if(typeof t=="number")return isNaN(t)?0:t;if(!t)return 0;let e=String(t).trim().replace(/[$Bs€\s]/g,"");e.includes(",")&&e.includes(".")?e.indexOf(".")<e.indexOf(",")?e=e.replace(/\./g,"").replace(",","."):e=e.replace(/,/g,""):e.includes(",")&&(e=e.replace(",","."));const o=parseFloat(e);return isNaN(o)?0:o}window.parseLocalizedNumber=re;window.parseDecimal=re;window.API_BASE=window.location.origin+"/api/v1";var S=window.API_BASE;function ke(t,e="Documento DALOR"){let o=document.getElementById("dalor_print_iframe");o||(o=document.createElement("iframe"),o.id="dalor_print_iframe",o.style.position="fixed",o.style.right="0",o.style.bottom="0",o.style.width="0",o.style.height="0",o.style.border="0",o.style.visibility="hidden",document.body.appendChild(o));let n="";if(typeof t=="string")n=t;else if(t&&t.nodeType){const s=t.cloneNode(!0);s.querySelectorAll('.no-print, button, input[type="button"]').forEach(i=>i.remove()),n=s.innerHTML}const a=o.contentWindow.document;a.open(),a.write(`
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
                    * { box-sizing: border-box; }
                    body {
                        margin: 0;
                        padding: 8mm 10mm;
                        background: #ffffff;
                        color: #0f172a;
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                        font-size: 11px;
                        line-height: 1.4;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    @page {
                        size: letter portrait;
                        margin: 8mm 10mm;
                    }
                    @media print {
                        body { padding: 0; margin: 0; background: #fff !important; }
                        .no-print { display: none !important; }
                    }
                    .no-print { display: none !important; }
                </style>
            </head>
            <body>
                ${n}
            </body>
        </html>
    `),a.close(),setTimeout(()=>{o.contentWindow.focus(),o.contentWindow.print()},250)}function ze(t,e,o){const n=document.getElementById(t);if(n){if(!Array.isArray(e)){n.innerHTML="";return}n.innerHTML=e.map(o).join("")}}function ve(t){return Array.isArray(t)?[...t].sort((e,o)=>{const n=String(e.code||"").split(".").map(s=>parseInt(s,10)||0),a=String(o.code||"").split(".").map(s=>parseInt(s,10)||0);for(let s=0;s<Math.max(n.length,a.length);s++){const i=n[s]!==void 0?n[s]:-1,m=a[s]!==void 0?a[s]:-1;if(i!==m)return i-m}return String(e.name||"").localeCompare(String(o.name||""))}):[]}window.calcFieldBs=function(){var n,a;const t=parseFloat((n=document.getElementById("field_amount_usd"))==null?void 0:n.value)||0,e=parseFloat((a=document.getElementById("globalExchangeRateInput"))==null?void 0:a.value)||de,o=document.getElementById("field_amount_bs");o&&!isNaN(t)&&(o.value=(t*e).toFixed(2)),le()};window.calcFieldUsd=function(){var n,a;const t=parseFloat((n=document.getElementById("field_amount_bs"))==null?void 0:n.value)||0,e=parseFloat((a=document.getElementById("globalExchangeRateInput"))==null?void 0:a.value)||de,o=document.getElementById("field_amount_usd");o&&!isNaN(t)&&e>0&&(o.value=(t/e).toFixed(2)),le()};window.onFieldTaxConditionChanged=function(){le()};function le(){var u,l;const t=parseFloat((u=document.getElementById("field_amount_usd"))==null?void 0:u.value)||0,e=((l=document.getElementById("field_is_tax_exempt"))==null?void 0:l.value)==="true",o=e?t:+(t/1.16).toFixed(2),n=e?0:+(t-o).toFixed(2),a=document.getElementById("field_base_amount_usd"),s=document.getElementById("field_tax_amount_usd"),i=document.getElementById("field_base_display"),m=document.getElementById("field_tax_display");a&&(a.value=o.toFixed(2)),s&&(s.value=n.toFixed(2)),i&&(i.innerText=`$${o.toFixed(2)}`),m&&(m.innerText=`$${n.toFixed(2)}`)}window.onValTaxChanged=function(){var i,m;const t=parseFloat((i=document.getElementById("val_amount_usd"))==null?void 0:i.value)||0,e=((m=document.getElementById("val_is_tax_exempt"))==null?void 0:m.value)==="true",o=e?t:+(t/1.16).toFixed(2),n=e?0:+(t-o).toFixed(2),a=document.getElementById("val_base_usd"),s=document.getElementById("val_tax_usd");a&&(a.value=o.toFixed(2)),s&&(s.value=n.toFixed(2))};window.APP_BUILD_VERSION="2026.09.15.v93-clean-production";console.log("--> DALOR SIGO-P INITIALIZED v98.31 [MODERNO]");window.APP_BUILD_VERSION="2026.09.15.v93-clean-production";var Ne=window.APP_BUILD_VERSION;localStorage.setItem("dalor_build_version",Ne);let de=parseFloat(localStorage.getItem("dalor_exchange_rate"))||850;var O=window.allClients=window.allClients||[],xe=window.allServices=window.allServices||[],Q=window.allProjects=window.allProjects||[],V=window.allCategories=window.allCategories||[],j=window.allAssets=window.allAssets||[],E=window.allPersonnel=window.allPersonnel||[],D=window.allMaterials=window.allMaterials||[];let Ue=[],He=[],Re=[],Oe=[],B=window.currentUser||(()=>{try{return JSON.parse(localStorage.getItem("dalor_user")||sessionStorage.getItem("dalor_user")||"null")}catch{return null}})(),Qe=window.authToken||localStorage.getItem("dalor_token")||sessionStorage.getItem("dalor_token")||null;function h(t,e={}){var o=sessionStorage.getItem("dalor_token")||localStorage.getItem("dalor_token")||window.authToken||"",n=Object.assign({},e.headers||{});return o&&(n.Authorization="Bearer "+o),e.body&&!(e.body instanceof FormData)&&!n["Content-Type"]&&(n["Content-Type"]="application/json"),e.body instanceof FormData&&delete n["Content-Type"],window.fetch(t,Object.assign({},e,{headers:n}))}let Ee=0;const he=t=>{Date.now()-Ee<350||!t.target.closest(".nav-dropdown")&&!t.target.closest(".dropdown-menu")&&!t.target.closest(".mobile-submenu-card")&&(te(),ee())};document.addEventListener("click",he);document.addEventListener("touchend",he);function Ie(){return window.innerWidth<=768}function Ve(t,e){t&&t.stopPropagation&&t.stopPropagation(),Ee=Date.now();const o=document.getElementById(e);if(!o)return;if(Ie()){Se(e);return}const n=o.classList.contains("open");te(),n||o.classList.add("open")}function Se(t){const e=document.getElementById(t);if(!e)return;const o=e.querySelector(".dropdown-btn"),n=e.querySelector(".dropdown-menu"),a=document.getElementById("mobileSubmenuSheet"),s=document.getElementById("mobileSubmenuTitle"),i=document.getElementById("mobileSubmenuItems");if(!a||!s||!i||!n)return;const m=o?o.querySelector("i"):null,u=o?o.querySelector("span"):null,l=m?m.outerHTML:'<i class="fa-solid fa-layer-group" style="color: var(--dalor-blue);"></i>',p=u?u.innerText:"Opciones del Módulo";s.innerHTML=`${l} <span>${p}</span>`,i.innerHTML="",n.querySelectorAll(".dropdown-item").forEach(c=>{const r=c.cloneNode(!0);r.onclick=g=>{g&&g.stopPropagation&&g.stopPropagation(),ee(),c.onclick&&c.onclick(g)},i.appendChild(r)}),a.classList.add("active"),document.body.style.overflow="hidden"}function ee(t){if(t&&t.target&&t.target.closest(".mobile-submenu-card")&&!t.target.classList.contains("mobile-submenu-close"))return;const e=document.getElementById("mobileSubmenuSheet");e&&e.classList.remove("active"),document.body.style.overflow=""}function te(){document.querySelectorAll(".nav-dropdown").forEach(t=>{t.classList.remove("open")}),ee()}var fe="";function ce(t,e,o=null){const n=`${t}:${o||""}`,a=document.getElementById(`view-${t}`),s=a&&!a.classList.contains("hidden");if(te(),s&&n===fe&&!o)return;fe=n,["executive","financial","maintenance","quotations","clients","services","projects","dispatch","dashboard","resources","pwa","manual","tree","inbox","expenses-log"].forEach(u=>{const l=document.getElementById(`view-${u}`);l&&l.classList.add("hidden")}),a&&a.classList.remove("hidden"),document.querySelectorAll(".nav-dropdown").forEach(u=>u.classList.remove("active"));const m=document.getElementById(`dropdown-${e}`);m&&m.classList.add("active");try{localStorage.setItem("dalor_active_view",t),e&&localStorage.setItem("dalor_active_category",e),sessionStorage.setItem("dalor_active_view",t),e&&sessionStorage.setItem("dalor_active_category",e)}catch{}if(t==="executive"&&typeof window.loadExecutiveDashboard=="function"&&window.loadExecutiveDashboard(),t==="financial"){let u=o||localStorage.getItem("dalor_active_subtab_financial")||sessionStorage.getItem("dalor_active_subtab_financial")||"cxc";const l=window.currentUser||window.State&&window.State.currentUser;if(l){let p={};try{p=typeof l.permissions_json=="string"?JSON.parse(l.permissions_json):l.permissions_json||l.permissions||{}}catch{}if(!((l.username||"").toLowerCase()==="director"||(l.role_name||"").toLowerCase().includes("director")||l.is_superuser===!0)){const c=p.cxc_view!==void 0||p.cxp_view!==void 0||p.bancos_view!==void 0||p.retiros_view!==void 0,r=p.cxc_view!==void 0?!!(p.cxc_view||p.cxc_pay):!c,g=p.cxp_view!==void 0?!!(p.cxp_view||p.cxp_pay):!c,y=p.bancos_view!==void 0?!!p.bancos_view:!c,f=p.retiros_view!==void 0?!!p.retiros_view:!1;u==="cxc"&&r||u==="cxp"&&g||u==="summary"&&y||u==="partners"&&f||(r?u="cxc":g?u="cxp":y?u="summary":f&&(u="partners"))}}typeof window.switchFinancialSubtab=="function"?window.switchFinancialSubtab(u):typeof window.openFinancialSubtab=="function"&&window.openFinancialSubtab(u)}if(t==="maintenance"){const u=o||localStorage.getItem("dalor_active_subtab_maintenance")||sessionStorage.getItem("dalor_active_subtab_maintenance")||"users";typeof window.switchMaintenanceSubtab=="function"?window.switchMaintenanceSubtab(u):typeof window.openMaintenanceSubtab=="function"&&window.openMaintenanceSubtab(u)}if(t==="quotations"&&typeof window.loadQuotations=="function"&&window.loadQuotations(),t==="clients"&&typeof window.loadClients=="function"&&window.loadClients(),t==="services"&&typeof window.loadServices=="function"&&window.loadServices(),t==="projects"){const u=o||localStorage.getItem("dalor_active_subtab_projects")||sessionStorage.getItem("dalor_active_subtab_projects")||"list";typeof window.switchProjectSubtab=="function"?window.switchProjectSubtab(u):typeof window.initProjectPlanningView=="function"&&window.initProjectPlanningView()}if(t==="dispatch"){const u=o||localStorage.getItem("dalor_active_subtab_dispatch")||sessionStorage.getItem("dalor_active_subtab_dispatch")||"list";typeof window.switchDispatchSubtab=="function"?window.switchDispatchSubtab(u):typeof window.initDispatchView=="function"&&window.initDispatchView()}if(t==="dashboard"&&typeof window.loadComparisonDashboard=="function"&&window.loadComparisonDashboard(),t==="resources"){const u=o||localStorage.getItem("dalor_active_subtab_resources")||sessionStorage.getItem("dalor_active_subtab_resources")||"dashboard";typeof window.switchResourceSubtab=="function"?window.switchResourceSubtab(u):typeof window.openResourceSubtab=="function"&&window.openResourceSubtab(u)}t==="inbox"&&typeof window.loadPendingExpensesInbox=="function"&&window.loadPendingExpensesInbox(),t==="tree"&&typeof window.loadCategoriesTree=="function"&&window.loadCategoriesTree(),t==="expenses-log"&&typeof window.loadExpensesLog=="function"&&window.loadExpensesLog(),window.onViewSwitched&&window.onViewSwitched(t)}window.switchView=ce;window.appSwitchView=ce;function A({containerId:t,totalItems:e=0,currentPage:o=1,pageSize:n=10,onPageChange:a="",onPageSizeChange:s="",itemLabel:i="registro(s)",pageSizeOptions:m=[10,15,25,50,100],allowAll:u=!0}){const l=document.getElementById(t);if(!l)return{startIndex:0,endIndex:0,totalPages:1,currentPage:1};const p=n===1e3||n===9999?e||1:n||15,d=Math.max(1,Math.ceil(e/p));let c=Math.max(1,Math.min(o,d));const r=(c-1)*p,g=Math.min(r+p,e);if(e<=Math.min(...m)&&d<=1)return l.innerHTML=`
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 11.5px; color: #64748b; margin-top: 8px;">
                <span>Mostrando <b>${e}</b> ${i}</span>
                ${s?`
                <div style="display: flex; align-items: center; gap: 6px;">
                    <span>Mostrar:</span>
                    <select onchange="${s}(this.value)" style="padding: 2px 6px; font-size: 11px; border: 1px solid #cbd5e1; border-radius: 4px; background: white; font-weight: 700; cursor: pointer;">
                        ${m.map(w=>`<option value="${w}" ${n===w?"selected":""}>${w}</option>`).join("")}
                        ${u?`<option value="1000" ${n===1e3?"selected":""}>Todos</option>`:""}
                    </select>
                </div>`:""}
            </div>
        `,{startIndex:r,endIndex:g,totalPages:d,currentPage:c};let y="",f=Math.max(1,c-2),b=Math.min(d,c+2);f>1&&(y+=`<button type="button" onclick="${a}(1)" class="btn-secondary" style="padding: 4px 9px; font-size: 11px; border-radius: 5px;">1</button>`,f>2&&(y+='<span style="padding: 0 4px; color: #94a3b8;">...</span>'));for(let w=f;w<=b;w++)w===c?y+=`<button type="button" class="btn-primary" style="padding: 4px 10px; font-size: 11px; font-weight: 800; border-radius: 5px; background: var(--dalor-navy, #0f172a); color: white;">${w}</button>`:y+=`<button type="button" onclick="${a}(${w})" class="btn-secondary" style="padding: 4px 9px; font-size: 11px; border-radius: 5px;">${w}</button>`;return b<d&&(b<d-1&&(y+='<span style="padding: 0 4px; color: #94a3b8;">...</span>'),y+=`<button type="button" onclick="${a}(${d})" class="btn-secondary" style="padding: 4px 9px; font-size: 11px; border-radius: 5px;">${d}</button>`),l.innerHTML=`
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 12px; color: #475569; flex-wrap: wrap; gap: 10px; box-shadow: 0 1px 2px rgba(0,0,0,0.04); margin-top: 8px;">
            <div style="font-weight: 600;">
                Mostrando <b style="color: var(--dalor-navy, #0f172a);">${e===0?0:r+1} - ${g}</b> de <b style="color: var(--dalor-navy, #0f172a);">${e}</b> ${i}
            </div>

            <div style="display: flex; align-items: center; gap: 5px;">
                <button type="button" onclick="${a}(1)" class="btn-secondary" style="padding: 4px 8px; font-size: 11px; border-radius: 5px;" ${c===1?'disabled style="opacity:0.4; cursor:not-allowed;"':""} title="Primera página">
                    <i class="fa-solid fa-angles-left"></i>
                </button>
                <button type="button" onclick="${a}(${c-1})" class="btn-secondary" style="padding: 4px 9px; font-size: 11px; border-radius: 5px;" ${c===1?'disabled style="opacity:0.4; cursor:not-allowed;"':""} title="Página anterior">
                    <i class="fa-solid fa-chevron-left"></i> Anterior
                </button>

                <div style="display: flex; align-items: center; gap: 4px;">
                    ${y}
                </div>

                <button type="button" onclick="${a}(${c+1})" class="btn-secondary" style="padding: 4px 9px; font-size: 11px; border-radius: 5px;" ${c===d?'disabled style="opacity:0.4; cursor:not-allowed;"':""} title="Página siguiente">
                    Siguiente <i class="fa-solid fa-chevron-right"></i>
                </button>
                <button type="button" onclick="${a}(${d})" class="btn-secondary" style="padding: 4px 8px; font-size: 11px; border-radius: 5px;" ${c===d?'disabled style="opacity:0.4; cursor:not-allowed;"':""} title="Última página">
                    <i class="fa-solid fa-angles-right"></i>
                </button>
            </div>

            ${s?`
            <div style="display: flex; align-items: center; gap: 6px;">
                <span style="font-size: 11.5px; color: #64748b;">Por página:</span>
                <select onchange="${s}(this.value)" style="padding: 3px 8px; font-size: 11.5px; border: 1px solid #cbd5e1; border-radius: 5px; background: white; font-weight: 700; color: var(--dalor-navy, #0f172a); cursor: pointer;">
                    ${m.map(w=>`<option value="${w}" ${n===w?"selected":""}>${w}</option>`).join("")}
                    ${u?`<option value="1000" ${n===1e3?"selected":""}>Ver todos</option>`:""}
                </select>
            </div>`:""}
        </div>
    `,{startIndex:r,endIndex:g,totalPages:d,currentPage:c}}window.renderPaginationControls=A;async function oe(){try{await h(`${S}/maintenance/sync-dalor-catalog`,{method:"POST"})}catch{}try{const[t,e,o,n,a,s,i]=await Promise.all([h(`${S}/clients/`),h(`${S}/services/`),h(`${S}/projects/`),h(`${S}/expenses/categories`),h(`${S}/assets/`),h(`${S}/personnel/`),h(`${S}/materials/`)]),m=t.ok?await t.json():[];window.allClients=O=Array.isArray(m)?m:[];const u=e.ok?await e.json():[];window.allServices=xe=Array.isArray(u)?u:[];const l=o.ok?await o.json():[];window.allProjects=Q=Array.isArray(l)?l:[];const p=n.ok?await n.json():[];window.allCategories=V=Array.isArray(p)?p:[];const d=a.ok?await a.json():[];window.allAssets=j=Array.isArray(d)?d:[];const c=s.ok?await s.json():[];window.allPersonnel=E=Array.isArray(c)?c:[];const r=i.ok?await i.json():{};window.allMaterials=D=Array.isArray(r.materials)?r.materials:Array.isArray(r)?r:[],G(),populatePlanDropdownSelectors(),ge()}catch(t){console.error("Error al cargar datos maestros:",t)}}function G(){const t=window.allClients&&window.allClients.length>0?window.allClients:Array.isArray(O)?O:[],e=window.allProjects&&window.allProjects.length>0?window.allProjects:Array.isArray(Q)?Q:[],o=window.allCategories&&window.allCategories.length>0?window.allCategories:Array.isArray(V)?V:[],n=window.allAssets&&window.allAssets.length>0?window.allAssets:Array.isArray(j)?j:[];window.allMaterials&&window.allMaterials.length>0?window.allMaterials:Array.isArray(D),window.allPersonnel&&window.allPersonnel.length>0?window.allPersonnel:Array.isArray(E);const a=(r,g)=>{const y=document.getElementById(r);if(!y)return;const f=y.value;y.innerHTML=g,f&&(y.value=f)},s='<option value="">-- Seleccione Cliente --</option>'+t.map(r=>`<option value="${r.id}">[${r.code}] ${r.name} (${r.rif||"Sin RIF"})</option>`).join("");if(a("quote_client_id",s),a("new_proj_client_id",s),a("cxc_client_id",s),a("rcp_client_id",s),t.length===1){const r=document.getElementById("quote_client_id");r&&!r.value&&(r.value=String(t[0].id));const g=document.getElementById("new_proj_client_id");g&&!g.value&&(g.value=String(t[0].id))}const i='<option value="">-- Gasto General Sede (Sin Proyecto) --</option>'+e.map(r=>`<option value="${r.id}">${r.code} - ${r.name}</option>`).join("");document.getElementById("field_project_id")&&(document.getElementById("field_project_id").innerHTML=i),document.getElementById("manual_project_id")&&(document.getElementById("manual_project_id").innerHTML=i),document.getElementById("cxc_project_id")&&(document.getElementById("cxc_project_id").innerHTML=i),document.getElementById("cxp_project_id")&&(document.getElementById("cxp_project_id").innerHTML=i),document.getElementById("rcp_project_id")&&(document.getElementById("rcp_project_id").innerHTML='<option value="">-- Sin Proyecto Específico (Anticipo a Cuenta) --</option>'),document.getElementById("mc_project_id")&&(document.getElementById("mc_project_id").innerHTML='<option value="">-- Consumo Interno Taller Central (Gasto Sede) --</option>'+e.map(r=>`<option value="${r.id}">${r.code} - ${r.name}</option>`).join("")),document.getElementById("modal_target_project_id")&&(document.getElementById("modal_target_project_id").innerHTML=e.map(r=>`<option value="${r.id}">${r.code} - ${r.name} (${r.location})</option>`).join("")),document.getElementById("tg_project_id")&&(document.getElementById("tg_project_id").innerHTML='<option value="">-- Seleccione Proyecto Aprobado --</option>'+e.map(r=>`<option value="${r.id}" data-location="${r.location}">${r.code} - ${r.name} (${r.location})</option>`).join(""));const u=ve(o).map(r=>`<option value="${r.id}">[${r.code}] ${r.name}</option>`).join("");document.getElementById("field_category_id")&&(document.getElementById("field_category_id").innerHTML=u),document.getElementById("manual_category_id")&&(document.getElementById("manual_category_id").innerHTML=u);const l='<option value="">-- No Aplica --</option>'+n.map(r=>`<option value="${r.id}">${r.asset_code} - ${r.name}</option>`).join("");document.getElementById("field_asset_id")&&(document.getElementById("field_asset_id").innerHTML=l);const d='<option value="">-- Seleccione Vehículo de Transporte --</option>'+j.filter(r=>r.asset_type==="vehiculo"||r.asset_type==="camioneta").map(r=>`<option value="${r.id}">[${r.asset_code}] ${r.name} (Placa: ${r.license_plate||"S/P"})</option>`).join("");document.getElementById("tg_vehicle_id")&&(document.getElementById("tg_vehicle_id").innerHTML=d);const c='<option value="">-- Seleccione Material --</option>'+D.map(r=>`<option value="${r.id}" data-cost="${r.unit_cost_usd}" data-stock="${r.stock_quantity}" data-unit="${r.unit_measure}">[${r.code}] ${r.name} (${r.stock_quantity} ${r.unit_measure} disp. - $${r.unit_cost_usd}/u)</option>`).join("");if(document.getElementById("me_material_id")&&(document.getElementById("me_material_id").innerHTML=c),document.getElementById("mc_material_id")&&(document.getElementById("mc_material_id").innerHTML=c),E&&E.length>0){const r=E.map(g=>`<option value="${g.id}">[${g.code}] ${g.full_name}${g.role_title?" - "+g.role_title:""}</option>`).join("");document.getElementById("field_reported_by")&&(document.getElementById("field_reported_by").innerHTML=r),document.getElementById("manual_reported_by")&&(document.getElementById("manual_reported_by").innerHTML=r)}if(B&&E&&E.length>0){const r=E.find(g=>g.full_name&&B.username&&g.full_name.toLowerCase().includes(B.username.toLowerCase())||g.role_title&&B.role&&g.role_title.toLowerCase().includes(B.role.toLowerCase()))||E[0];r&&(document.getElementById("field_reported_by")&&(document.getElementById("field_reported_by").value=r.id),document.getElementById("manual_reported_by")&&(document.getElementById("manual_reported_by").value=r.id))}typeof window.populateServiceCategoriesAndUnits=="function"&&window.populateServiceCategoriesAndUnits()}function ue(t){t==="modalNewQuotation"&&(t="modalQuotation");const e=document.getElementById(t);e&&(e.classList.remove("hidden"),e.style.removeProperty("display"));const o=document.getElementById("btnFloatingLogout");o&&o.style.setProperty("display","none","important")}function ne(t){const e=document.getElementById(t);if(e&&e.classList.add("hidden"),document.querySelectorAll(".modal-overlay:not(.hidden), .modal:not(.hidden)").length===0){const n=document.getElementById("btnFloatingLogout");n&&n.style.removeProperty("display")}}let P=localStorage.getItem("dalor_sound_alerts")!=="false",ye=new Set,we=!0;function Ge(){P=!P,localStorage.setItem("dalor_sound_alerts",P?"true":"false"),pe(),P&&me()}function pe(){const t=document.getElementById("iconSoundToggle"),e=document.getElementById("textSoundToggle"),o=document.getElementById("iconSoundToggleInbox"),n=document.getElementById("textSoundToggleInbox"),a=document.getElementById("btnSoundToggle");t&&e&&(P?(t.className="fa-solid fa-bell",e.innerText="Sonido: ON",a&&(a.style.color="#fbbf24",a.style.borderColor="#fbbf24")):(t.className="fa-solid fa-bell-slash",e.innerText="Sonido: OFF",a&&(a.style.color="#94a3b8",a.style.borderColor="#334155"))),o&&n&&(P?(o.className="fa-solid fa-bell",o.style.color="#059669",n.innerText="Alertas Sonoras: ON"):(o.className="fa-solid fa-bell-slash",o.style.color="#94a3b8",n.innerText="Alertas Sonoras: OFF"))}function me(){if(P)try{const t=window.AudioContext||window.webkitAudioContext;if(!t)return;const e=new t,o=e.currentTime,n=e.createOscillator(),a=e.createGain();n.type="sine",n.frequency.setValueAtTime(659.25,o),a.gain.setValueAtTime(.25,o),a.gain.exponentialRampToValueAtTime(.001,o+.35),n.connect(a),a.connect(e.destination),n.start(o),n.stop(o+.35);const s=e.createOscillator(),i=e.createGain();s.type="sine",s.frequency.setValueAtTime(880,o+.12),i.gain.setValueAtTime(.3,o+.12),i.gain.exponentialRampToValueAtTime(.001,o+.55),s.connect(i),i.connect(e.destination),s.start(o+.12),s.stop(o+.55)}catch(t){console.warn("Audio alert error:",t)}}function Be(t){const e=document.getElementById("toastNotificationContainer");if(!e)return;const o=document.createElement("div");o.className="toast-card-live",o.style.cssText=`

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

    `;const n=t.reported_by||"Personal de Campo",a=Number(t.amount_usd||0).toFixed(2),s=t.project_name||"Obra General",i=t.supplier_vendor||"Comercio General";o.innerHTML=`

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

                <span style="font-size: 13px; font-weight: 900; color: var(--dalor-gold);">$${a} USD <small style="color: #94a3b8; font-weight: 600;">(${s})</small></span>

                <button onclick="switchView('inbox', 'gastos'); this.closest('.toast-card-live').remove();" style="background: #059669; color: white; border: none; padding: 5px 10px; border-radius: 6px; font-size: 11px; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 4px;">

                    <i class="fa-solid fa-stamp"></i> Auditar

                </button>

            </div>

        </div>

    `,e.appendChild(o),setTimeout(()=>{o.parentElement&&(o.style.opacity="0",o.style.transform="translateX(60px)",setTimeout(()=>o.remove(),300))},9e3)}async function ge(){try{if(!B)return;const t=(B.username||"").toLowerCase(),e=(B.role_name||"").toLowerCase();if(t==="campo"||e.includes("supervisor")||e.includes("campo")){const p=document.getElementById("badgeInboxCount"),d=document.getElementById("badgeGastosDropdown");p&&(p.style.display="none"),d&&(d.style.display="none");return}const n=await h(`${S}/expenses/inbox/pending`);if(!n.ok)return;const a=await n.json(),s=Array.isArray(a)?a:[],i=s.length,m=document.getElementById("badgeInboxCount");m&&(m.innerText=i,m.style.display=i>0?"inline-block":"none");const u=document.getElementById("badgeGastosDropdown");u&&(u.innerText=i,u.style.display=i>0?"inline-block":"none");const l=new Set(s.map(p=>p.id));if(!we){const p=s.filter(d=>!ye.has(d.id));if(p.length>0){me(),p.forEach(c=>Be(c));const d=document.getElementById("view-inbox");d&&!d.classList.contains("hidden")&&loadPendingExpensesInbox()}}ye=l,we=!1}catch{}}setInterval(ge,5e3);pe();setInterval(()=>{h("/healthz").catch(()=>{})},3e5);typeof window<"u"&&(window.allClients=O,window.allServices=xe,window.allProjects=Q,window.allCategories=V,window.allAssets=j,window.allPersonnel=E,window.allMaterials=D,window.selectedPersonnelIds=Ue,window.selectedVehicleIds=He,window.selectedToolIds=Re,window.selectedMaterialIds=Oe,window.EXCHANGE_RATE=de,window.currentUser=window.currentUser||B,window.authToken=window.authToken||Qe,window.closeAllDropdowns=te,window.closeMobileSubmenu=ee,window.closeModal=ne,window.isMobileViewport=Ie,window.loadInitialMasterData=oe,window.openMobileSubmenu=Se,window.openModal=ue,window.parseLocalizedNumber=re,window.playNotificationChime=me,window.populateSelect=ze,window.populateSelectDropdowns=G,window.roundNumber=be,window.showInboxToastNotification=Be,window.renderPaginationControls=A,window.sortCategoriesNumerically=ve,window.switchView=ce,window.toggleDropdown=Ve,window.toggleSoundAlerts=Ge,window.printElementHtml=ke,window.updatePendingInboxBadge=ge,window.updateSoundToggleUI=pe);var _=window.API_BASE||window.location.origin+"/api/v1",I=window.allClients=window.allClients||[],x=window.allServices=window.allServices||[],_e=window.allProjects=window.allProjects||[];window.allCategories=window.allCategories||[];window.allAssets=window.allAssets||[];window.allPersonnel=window.allPersonnel||[];window.allMaterials=window.allMaterials||[];window.selectedPersonnelIds=window.selectedPersonnelIds||[];window.selectedVehicleIds=window.selectedVehicleIds||[];window.selectedToolIds=window.selectedToolIds||[];window.selectedMaterialIds=window.selectedMaterialIds||[];var M=window.EXCHANGE_RATE=window.EXCHANGE_RATE||850;window.BCV_DATA=window.BCV_DATA||{rate:850,source:"BCV Oficial"};window.authToken=window.authToken||localStorage.getItem("dalor_token")||null;const $e=["Fabricación Metalmecánica","Montaje e Instalación en Sitio","Mantenimiento Industrial & Paradas","Soldadura Especializada & Pailería","Mecanizado & Torno","Arenado y Pintura Industrial","Obras Civiles & Eléctricas Asociadas"];typeof window<"u"&&(window.OFFICIAL_DALOR_APU_CATEGORIES=$e);function v(t,e={}){var o=sessionStorage.getItem("dalor_token")||localStorage.getItem("dalor_token")||window.authToken||"",n=Object.assign({},e.headers||{});return o&&(n.Authorization="Bearer "+o),e.body&&!(e.body instanceof FormData)&&!n["Content-Type"]&&(n["Content-Type"]="application/json"),e.body instanceof FormData&&delete n["Content-Type"],window.fetch(t,Object.assign({},e,{headers:n}))}let ae=[],C=1,Ce=10,W="",J="",X="",K="";function We(t){C=t,$();const e=document.getElementById("quotationsTableBody");e&&e.scrollIntoView({behavior:"smooth",block:"nearest"})}function Je(t){Ce=parseInt(t)||10,C=1,$()}function Xe(t){W=(t||"").trim().toLowerCase(),C=1,$()}function Ke(t){J=(t||"").trim().toLowerCase(),C=1,$()}function Ze(){var t,e;X=((t=document.getElementById("quoteFilterDateFrom"))==null?void 0:t.value)||"",K=((e=document.getElementById("quoteFilterDateTo"))==null?void 0:e.value)||"",C=1,$()}function Ye(){W="",J="",X="",K="";const t=document.getElementById("quoteSearchInput");t&&(t.value="");const e=document.getElementById("quoteStatusFilter");e&&(e.value="");const o=document.getElementById("quoteFilterDateFrom");o&&(o.value="");const n=document.getElementById("quoteFilterDateTo");n&&(n.value=""),C=1,$()}function $(){const t=document.getElementById("quotationsTableBody");if(!t)return;let e=ae||[];if(W){const i=W;e=e.filter(m=>m.quote_number&&m.quote_number.toLowerCase().includes(i)||m.client&&m.client.name&&m.client.name.toLowerCase().includes(i)||m.project_title&&m.project_title.toLowerCase().includes(i))}if(J&&(e=e.filter(i=>(i.status||"").toLowerCase()===J)),X&&(e=e.filter(i=>i.created_at&&i.created_at.substring(0,10)>=X)),K&&(e=e.filter(i=>i.created_at&&i.created_at.substring(0,10)<=K)),e.length===0){t.innerHTML='<tr><td colspan="8" style="text-align: center; padding: 20px; color: #94a3b8;">No se encontraron cotizaciones con los criterios seleccionados.</td></tr>';const i=document.getElementById("quotationsPaginationContainer");i&&(i.innerHTML="");return}const o=typeof window.renderPaginationControls=="function"?window.renderPaginationControls:typeof A=="function"?A:()=>({startIndex:0,endIndex:e.length}),{startIndex:n,endIndex:a}=o({containerId:"quotationsPaginationContainer",totalItems:e.length,currentPage:C,pageSize:Ce,onPageChange:"goToQuotationsPage",onPageSizeChange:"changeQuotationsPageSize",itemLabel:"cotización(es)",pageSizeOptions:[10,20,50,100]}),s=e.slice(n,a);t.innerHTML=s.map(i=>{const m=i.client?i.client.name:"Cliente General",u=i.status==="aprobado",l=Number(i.subtotal_usd||0),p=Number(i.tax_usd||0),d=Number(i.total_usd||0);return`
        <tr>
            <td style="font-weight: 800; color: var(--dalor-blue);">${i.quote_number}</td>
            <td style="font-weight: 600;">${m}</td>
            <td>${i.project_title}</td>
            <td style="font-weight: 700;">$${l.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
            <td style="color: ${p===0?"#10b981":"#64748b"}; font-weight: 700;">
                ${p===0?"EXENTO (0%)":`$${p.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`}
            </td>
            <td style="font-weight: 800; color: var(--dalor-navy);">$${d.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
            <td>
                <span style="font-size: 10px; padding: 3px 8px; border-radius: 9999px; font-weight: 800; ${u?"background: #dcfce7; color: #166534;":"background: #f1f5f9; color: #475569;"}">
                    ${(i.status||"borrador").toUpperCase()}
                </span>
            </td>
            <td style="text-align: center; white-space: nowrap;">
                <button onclick="editQuotation(${i.id})" class="btn-secondary" style="padding: 4px 8px; font-size: 11px; margin-right: 4px; color: #0284c7; font-weight: 700;" title="Re-editar Cotización">
                    <i class="fa-solid fa-pen-to-square"></i> Re-editar
                </button>
                <button onclick="printQuotation(${i.id})" class="btn-secondary" style="padding: 4px 8px; font-size: 11px;" title="Imprimir / Exportar Cotización">
                    <i class="fa-solid fa-print"></i>
                </button>
                ${u?'<span style="font-size: 11px; color: #059669; font-weight: bold; margin-left: 6px;">Obra Activa</span>':`
                    <button onclick="convertQuoteToProject(${i.id})" class="btn-primary" style="padding: 4px 8px; font-size: 11px; margin-left: 4px; background: #059669;" title="Aprobar y Convertir en Proyecto">
                        <i class="fa-solid fa-check"></i> Convertir en Proyecto
                    </button>
                `}
            </td>
        </tr>`}).join("")}async function Te(){const t=document.getElementById("quotationsTableBody");Array.isArray(allQuotations)&&allQuotations.length>0?(ae=allQuotations,$()):t&&(t.innerHTML='<tr><td colspan="8" style="text-align: center; padding: 20px; color: #94a3b8;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando cotizaciones...</td></tr>');try{const[e,o,n]=await Promise.all([v(`${_}/quotations/`),v(`${_}/clients/`),v(`${_}/services/`)]);if(o.ok){const s=await o.json();I=Array.isArray(s)?s:[]}if(n.ok){const s=await n.json();x=Array.isArray(s)?s:[]}try{typeof window.populateSelectDropdowns=="function"?window.populateSelectDropdowns():typeof G=="function"&&G()}catch(s){console.warn("Aviso al poblar dropdowns de cotizaciones:",s)}if(!e.ok)throw new Error("Error HTTP "+e.status);const a=await e.json();ae=Array.isArray(a)?a:[],C=1,$()}catch(e){console.error("Error al cargar cotizaciones:",e),t.innerHTML=`<tr><td colspan="8" style="text-align: center; color: #e11d48; padding: 20px;">Error al cargar cotizaciones: ${e.message||"Error de conexión"}</td></tr>`}}async function et(){var m;quoteRowsCount=0;const t=document.getElementById("edit_quotation_id");t&&(t.value="");const e=document.getElementById("modalQuotationTitle");e&&(e.innerHTML='<i class="fa-solid fa-calculator" style="color: var(--dalor-blue);"></i> Armar Presupuesto / Cotización Formal (APU)');const o=document.getElementById("btnSubmitQuotation");o&&(o.innerHTML='<i class="fa-solid fa-floppy-disk"></i> Guardar Presupuesto');const n=document.getElementById("quoteForm");n&&n.reset(),document.getElementById("quote_coletilla_divisas")&&(document.getElementById("quote_coletilla_divisas").checked=!0),document.getElementById("quote_coletilla_modalidad")&&(document.getElementById("quote_coletilla_modalidad").checked=!0),document.getElementById("quote_coletilla_bolivares")&&(document.getElementById("quote_coletilla_bolivares").checked=!1),document.getElementById("quote_notes")&&(document.getElementById("quote_notes").value=""),document.getElementById("quote_execution_time")&&(document.getElementById("quote_execution_time").value="15 días hábiles");const a=document.getElementById("quoteClientRiskAlert");a&&(a.style.display="none");const s=document.getElementById("quoteItemsList");s&&(s.innerHTML="");try{if((window.allClients&&window.allClients.length>0?window.allClients:I||[]).length===0){const l=window.authToken||localStorage.getItem("dalor_token")||null,p=l?{Authorization:`Bearer ${l}`}:{},d=await v(`${_}/clients/`,{headers:p});if(d.ok){const c=await d.json();I=window.allClients=Array.isArray(c)?c:[]}}if(!window._servicesLoaded){const l=window.authToken||localStorage.getItem("dalor_token")||null,p=l?{Authorization:`Bearer ${l}`}:{},d=await v(`${_}/services/`,{headers:p});if(d.ok){const c=await d.json();x=window.allServices=Array.isArray(c)?c:[],window._servicesLoaded=!0}}}catch(u){console.warn("Error cargando clientes o servicios para cotización:",u)}typeof window.populateSelectDropdowns=="function"&&window.populateSelectDropdowns();const i=document.getElementById("quote_client_id");if(i){const u=window.allClients&&window.allClients.length>0?window.allClients:I||[];if(u.length>0){let l='<option value="">-- Seleccione Cliente --</option>'+u.map(p=>`<option value="${p.id}">[${p.code}] ${p.name} (${p.rif||"Sin RIF"})</option>`).join("");i.innerHTML=l,u.length===1&&(i.value=String(u[0].id))}}document.getElementById("quote_tax_type")&&(document.getElementById("quote_tax_type").value="16"),document.getElementById("quote_tax_percent")&&(document.getElementById("quote_tax_percent").value="16"),document.getElementById("quote_execution_time")&&(document.getElementById("quote_execution_time").value=""),document.getElementById("quote_currency")&&(document.getElementById("quote_currency").value="USD"),document.getElementById("quote_coletilla_divisas")&&(document.getElementById("quote_coletilla_divisas").checked=!1),document.getElementById("quote_coletilla_modalidad")&&(document.getElementById("quote_coletilla_modalidad").checked=!1),document.getElementById("quote_notes")&&(document.getElementById("quote_notes").value=""),Z(),q(),Pe(),typeof window.openModal=="function"?window.openModal("modalQuotation"):(m=document.getElementById("modalQuotation"))==null||m.classList.remove("hidden")}function tt(){const t=document.getElementById("quote_tax_type").value;document.getElementById("quote_tax_percent").value=t,q()}function Z(t=null){quoteRowsCount++;const e=document.getElementById("quoteItemsList");if(!e)return;const o=`quote_row_${quoteRowsCount}`,a=`<option value="">${x&&x.length>0?"-- Partida del Catálogo --":"-- Catálogo en blanco (escriba partida manual) --"}</option>`+(x||[]).map(d=>{const c=t&&(String(t.service_id)===String(d.id)||String(t.item_code)===String(d.code));return`<option value="${d.id}" data-code="${d.code}" data-unit="${d.unit_measure}" data-price="${d.unit_price_usd}" ${c?"selected":""}>[${d.code}] ${d.name} ($${d.unit_price_usd}/${d.unit_measure})</option>`}).join(""),s=t?(t.description||"").replaceAll('"',"&quot;"):"",i=t&&t.unit_measure||"Global",m=t&&t.quantity!==void 0?t.quantity:1,u=t&&t.unit_price_usd!==void 0?t.unit_price_usd:0,l=(m*u).toFixed(2),p=document.createElement("div");p.id=o,p.style.cssText="display: grid; grid-template-columns: 4fr 1fr 1fr 1fr 1fr 30px; gap: 6px; background: white; padding: 8px; border-radius: 8px; border: 1px solid #cbd5e1; align-items: center;",p.innerHTML=`

        <div>

            <select class="form-select q-srv-select" style="font-size: 11px; padding: 5px;" onchange="onServiceSelected('${o}')">

                ${a}

            </select>

            <input type="text" class="form-input q-desc" placeholder="Descripción detallada de la partida / APU" value="${s}" autocomplete="off" style="font-size: 11px; padding: 4px 6px; margin-top: 4px;" required>

        </div>

        <div>
            <input type="text" class="form-input q-unit" list="datalist_units" placeholder="Und / Medida" value="${i}" style="font-size: 11px; padding: 5px; font-weight: 700; color: #1e293b;" title="Selecciona o escribe cualquier unidad de medida (ej: Ton, Kg, m, Pulg-Diam, HH, Und)">
            <datalist id="datalist_units">
                ${Array.from(new Set(["Global","Und","Pza","m","m²","m³","ml","Kg","Ton","Litro","Galón","Horas","HH","Días","Punto","Juego","Pulg-Diam",...(x||[]).map(d=>(d.unit_measure||"").trim()).filter(Boolean)])).map(d=>`<option value="${d}">`).join("")}
            </datalist>
        </div>

        <div>
            <input type="text" inputmode="decimal" class="form-input q-qty" placeholder="Cant" value="${m}" oninput="recalcQuotationTotals()" autocomplete="off" style="font-size: 11px; padding: 5px; font-weight: bold;" required>
        </div>

        <div>
            <input type="text" inputmode="decimal" class="form-input q-price" placeholder="P. Unit ($)" value="${u}" oninput="recalcQuotationTotals()" autocomplete="off" style="font-size: 11px; padding: 5px; font-weight: bold; color: var(--dalor-blue);" required>
        </div>

        <div>
            <input type="text" class="form-input q-total" placeholder="Total ($)" value="$${l}" style="font-size: 11px; padding: 5px; font-weight: 800;" readonly>
        </div>

        <div style="text-align: center;">

            <button type="button" onclick="removeQuotationRow('${o}')" style="background: none; border: none; color: #ef4444; font-size: 16px; cursor: pointer;">&times;</button>

        </div>

    `,e.appendChild(p)}function ot(t){const e=document.getElementById(t);e&&e.remove(),q()}function nt(t){const e=document.getElementById(t);if(!e)return;const o=e.querySelector(".q-srv-select"),n=o?o.options[o.selectedIndex]:null;n&&n.value&&(e.querySelector(".q-desc").value=n.text.replace(/\[.*?\]\s*/,"").split(" ($")[0],e.querySelector(".q-unit").value=n.getAttribute("data-unit")||"Global",e.querySelector(".q-price").value=parseFloat(n.getAttribute("data-price")||0).toFixed(2)),q()}function q(){var d;const t=document.querySelectorAll("#quoteItemsList > div");let e=0;t.forEach(c=>{const r=c.querySelector(".q-qty"),g=c.querySelector(".q-price"),y=c.querySelector(".q-total"),f=parseLocalizedNumber(r?r.value:0),b=parseLocalizedNumber(g?g.value:0),w=f*b;y&&(y.value=`$${w.toFixed(2)}`),e+=w});const o=parseFloat(document.getElementById("quote_tax_percent")?document.getElementById("quote_tax_percent").value:16)||0,n=e*(o/100),a=e+n,s=document.getElementById("quote_subtotal_display"),i=document.getElementById("quote_tax_display"),m=document.getElementById("quote_total_display"),u=(((d=document.getElementById("quote_currency"))==null?void 0:d.value)||"USD").toUpperCase(),l=document.getElementById("quote_bcv_banner_box");l&&(l.style.display=u==="VES"?"block":"none");const p=typeof M<"u"?M:850;if(u==="VES"){const c=e*p,r=n*p,g=a*p;s&&(s.innerHTML=`$${e.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}<br><span style="font-size:11px; color:#fde047;">Bs. ${c.toLocaleString("es-VE",{minimumFractionDigits:2,maximumFractionDigits:2})}</span>`),i&&(i.innerHTML=o===0?"EXENTO (0%)":`$${n.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}<br><span style="font-size:11px; color:#fde047;">Bs. ${r.toLocaleString("es-VE",{minimumFractionDigits:2,maximumFractionDigits:2})}</span>`),m&&(m.innerHTML=`$${a.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}<br><span style="font-size:12px; color:#fde047;">Bs. ${g.toLocaleString("es-VE",{minimumFractionDigits:2,maximumFractionDigits:2})}</span>`)}else s&&(s.innerText=`$${e.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`),i&&(i.innerText=o===0?"EXENTO (0%)":`$${n.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`),m&&(m.innerText=`$${a.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`)}function Pe(){q()}async function it(t){var e;try{const o=window.authToken||localStorage.getItem("dalor_token")||null,n=o?{Authorization:`Bearer ${o}`}:{};if((window.allClients&&window.allClients.length>0?window.allClients:I||[]).length===0){const c=await v(`${_}/clients/`,{headers:n});if(c.ok){const r=await c.json();I=window.allClients=Array.isArray(r)?r:[]}}if(!window._servicesLoaded){const c=await v(`${_}/services/`,{headers:n});if(c.ok){const r=await c.json();x=window.allServices=Array.isArray(r)?r:[],window._servicesLoaded=!0}}typeof window.populateSelectDropdowns=="function"&&window.populateSelectDropdowns();const s=await v(`${_}/quotations/${t}`,{headers:n});if(!s.ok)throw new Error("No se pudo cargar la cotización para edición.");const i=await s.json(),m=document.getElementById("edit_quotation_id");m&&(m.value=i.id);const u=document.getElementById("modalQuotationTitle");u&&(u.innerHTML=`<i class="fa-solid fa-pen-to-square" style="color: var(--dalor-gold);"></i> Re-editar Presupuesto / Cotización [${i.quote_number}]`);const l=document.getElementById("btnSubmitQuotation");l&&(l.innerHTML='<i class="fa-solid fa-floppy-disk"></i> Guardar Cambios de Presupuesto');const p=document.getElementById("quote_client_id");if(p){const c=window.allClients&&window.allClients.length>0?window.allClients:I||[];if(c.length>0){let r='<option value="">-- Seleccione Cliente --</option>'+c.map(g=>`<option value="${g.id}">[${g.code}] ${g.name} (${g.rif||"Sin RIF"})</option>`).join("");p.innerHTML=r}i.client_id&&(p.value=String(i.client_id))}document.getElementById("quote_title")&&(document.getElementById("quote_title").value=i.project_title||""),document.getElementById("quote_location")&&(document.getElementById("quote_location").value=i.location||"Sede Central"),document.getElementById("quote_execution_time")&&(document.getElementById("quote_execution_time").value=i.execution_time||"15 días hábiles"),document.getElementById("quote_validity")&&(document.getElementById("quote_validity").value=i.validity_days||15),document.getElementById("quote_currency")&&(document.getElementById("quote_currency").value=i.currency||"USD"),document.getElementById("quote_tax_percent")&&(document.getElementById("quote_tax_percent").value=i.tax_percent!==void 0&&i.tax_percent!==null?i.tax_percent:i.tax_usd>0?16:0),document.getElementById("quote_notes")&&(document.getElementById("quote_notes").value=i.notes||""),document.getElementById("quote_coletilla_divisas")&&(document.getElementById("quote_coletilla_divisas").checked=i.coletilla_divisas!==!1),document.getElementById("quote_coletilla_modalidad")&&(document.getElementById("quote_coletilla_modalidad").checked=i.coletilla_modalidad!==!1),document.getElementById("quote_coletilla_bolivares")&&(document.getElementById("quote_coletilla_bolivares").checked=!!i.coletilla_bolivares);const d=document.getElementById("quoteItemsList");d&&(d.innerHTML="",quoteRowsCount=0,i.items&&i.items.length>0?i.items.forEach(c=>Z(c)):Z()),q(),typeof window.openModal=="function"?window.openModal("modalQuotation"):(e=document.getElementById("modalQuotation"))==null||e.classList.remove("hidden")}catch(o){console.error("Error al re-editar presupuesto:",o),alert("Error cargando presupuesto: "+o.message)}}async function at(t){var l,p;t&&t.preventDefault&&t.preventDefault();const e=document.getElementById("quote_client_id"),o=e?parseInt(e.value):null;if(!o){alert("Por favor selecciona un cliente de la lista.");return}const n=document.querySelectorAll("#quoteItemsList > div");let a=[];if(n.forEach(d=>{const c=d.querySelector(".q-srv-select"),r=c&&c.value?parseInt(c.value):null,g=c?c.options[c.selectedIndex]:null,y=g?g.getAttribute("data-code"):null,f=d.querySelector(".q-desc")?d.querySelector(".q-desc").value:"",b=d.querySelector(".q-unit")?d.querySelector(".q-unit").value:"Global",w=d.querySelector(".q-qty")?d.querySelector(".q-qty").value:"1",T=d.querySelector(".q-price")?d.querySelector(".q-price").value:"0",H=parseLocalizedNumber(w)||1,R=parseLocalizedNumber(T)||0;a.push({service_id:r,item_code:y,description:f,unit_measure:b,quantity:H,unit_price_usd:R,total_usd:Number((H*R).toFixed(2))})}),a.length===0){alert("Agrega al menos una partida a la cotización.");return}const s=document.getElementById("edit_quotation_id")?document.getElementById("edit_quotation_id").value:"",i=!!s,m={client_id:o,project_title:document.getElementById("quote_title").value,location:document.getElementById("quote_location").value||"Sede Central",execution_time:(document.getElementById("quote_execution_time").value||"").trim()||"15 días hábiles",currency:document.getElementById("quote_currency").value||"USD",validity_days:parseInt(document.getElementById("quote_validity")?document.getElementById("quote_validity").value:15)||15,tax_percent:parseLocalizedNumber((l=document.getElementById("quote_tax_percent"))==null?void 0:l.value)||0,exchange_rate:typeof M<"u"?M:850,notes:(((p=document.getElementById("quote_notes"))==null?void 0:p.value)||"").trim(),coletilla_divisas:document.getElementById("quote_coletilla_divisas")?document.getElementById("quote_coletilla_divisas").checked:!1,coletilla_modalidad:document.getElementById("quote_coletilla_modalidad")?document.getElementById("quote_coletilla_modalidad").checked:!1,coletilla_bolivares:document.getElementById("quote_coletilla_bolivares")?document.getElementById("quote_coletilla_bolivares").checked:!1,items:a},u=document.getElementById("btnSubmitQuotation");u&&(u.disabled=!0,u.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Guardando...');try{const d=i?`${_}/quotations/${s}`:`${_}/quotations/`,r=await v(d,{method:i?"PUT":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(m)});if(!r.ok){const f=await r.json();throw new Error(f.detail||"Error al guardar el presupuesto")}const g=await r.json();ne("modalQuotation");const y=document.getElementById("quoteForm")||document.getElementById("quotationForm");y&&y.reset(),document.getElementById("edit_quotation_id")&&(document.getElementById("edit_quotation_id").value=""),typeof showToastNotification=="function"?showToastNotification(i?`Presupuesto ${g.quote_number||""} actualizado con éxito`:`Presupuesto ${g.quote_number||""} emitido con éxito`,"success"):typeof showToast=="function"?showToast(i?`Presupuesto ${g.quote_number||""} actualizado con éxito`:"Presupuesto creado con éxito","success"):alert(i?"Presupuesto actualizado con éxito.":"Presupuesto creado con éxito."),await Te()}catch(d){console.error("Error al guardar presupuesto:",d),alert("Error al guardar presupuesto: "+d.message)}finally{u&&(u.disabled=!1,u.innerHTML='<i class="fa-solid fa-floppy-disk"></i> Guardar Presupuesto')}}function st(){const t=document.getElementById("converting_quotation_id");t&&(t.value=""),sessionStorage.removeItem("dalor_active_converting_quote_id");const e=document.getElementById("quote_conversion_banner");e&&e.classList.add("hidden");const o=document.getElementById("projectCreateForm");o&&o.reset(),switchProjectSubtab("list")}async function rt(t){try{if(sessionStorage.setItem("dalor_active_converting_quote_id",String(t)),!I||I.length===0)try{const g=await v(`${_}/clients/`);g.ok&&(I=await g.json())}catch{}const e=await v(`${_}/quotations/${t}`);if(!e.ok)throw new Error("No se pudo cargar la información del presupuesto.");const o=await e.json();switchView("projects","proyectos"),switchProjectSubtab("form"),populatePlanDropdownSelectors();const n=document.getElementById("converting_quotation_id");n&&(n.value=o.id);const a=document.getElementById("quote_conversion_banner"),s=document.getElementById("quote_conversion_text");a&&a.classList.remove("hidden");const i=o.client?o.client.name:o.client_name||"Cliente";s&&(s.innerText=`Presupuesto [${o.quote_number}] para ${i}. Monto: $${o.total_usd.toLocaleString("en-US",{minimumFractionDigits:2})}. Revisa y completa los campos a continuación:`);const m=document.getElementById("new_proj_code");m&&(m.readOnly=!0,m.style.backgroundColor="#f1f5f9",m.style.cursor="not-allowed",v(`${_}/projects/next-code`).then(g=>g.json()).then(g=>{g&&g.next_code&&m&&(m.value=g.next_code)}).catch(g=>{console.warn("Fallback cálculo código proyecto:",g);const y=(_e?_e.length:0)+1;m&&(m.value=`PRJ-2026-${String(y).padStart(3,"0")}`)})),document.getElementById("new_proj_name")&&(document.getElementById("new_proj_name").value=o.project_title||"");const u=document.getElementById("new_proj_client_id");u&&o.client_id&&(u.value=String(o.client_id));const l=(o.location||"").trim(),p=!l||l.toLowerCase().includes("sede")||l.toLowerCase().includes("central")||l.toLowerCase().includes("taller")||l.toLowerCase().includes("guacara");typeof setProjectType=="function"?setProjectType(p?"sede":"foraneo"):typeof window.setProjectType=="function"&&window.setProjectType(p?"sede":"foraneo"),document.getElementById("new_proj_location")&&(document.getElementById("new_proj_location").value=l||(p?"Sede Central (Taller Guacara)":""));let d=30;if(o.execution_time){const g=o.execution_time.match(/\d+/);g&&(d=parseInt(g[0]))}document.getElementById("new_proj_duration")&&(document.getElementById("new_proj_duration").value=d),document.getElementById("new_proj_contract")&&(document.getElementById("new_proj_contract").value=o.total_usd.toFixed(2));let c=`Obra adjudicada bajo Presupuesto ${o.quote_number}.
Partidas y APU contratadas:
`;o.items&&o.items.length>0?c+=o.items.map((g,y)=>`${y+1}. [${g.item_code||"SER"}] ${g.description} (Cant: ${g.quantity} ${g.unit_measure||"Global"})`).join(`
`):c+=o.project_title,document.getElementById("new_proj_scope")&&(document.getElementById("new_proj_scope").value=c),document.getElementById("new_proj_labor")&&(document.getElementById("new_proj_labor").value="0.00"),document.getElementById("new_proj_fuel")&&(document.getElementById("new_proj_fuel").value="0.00"),document.getElementById("new_proj_tools")&&(document.getElementById("new_proj_tools").value="0.00"),document.getElementById("new_proj_services")&&(document.getElementById("new_proj_services").value="0.00"),typeof updatePlanMaterialsCostTotal=="function"?updatePlanMaterialsCostTotal():typeof window.updatePlanMaterialsCostTotal=="function"?window.updatePlanMaterialsCostTotal():document.getElementById("new_proj_materials")&&(document.getElementById("new_proj_materials").value="0.00");const r=document.getElementById("projectPhasesContainer");r&&typeof addProjectPhaseRow=="function"&&(r.innerHTML="",window.phaseRowsCount=0,addProjectPhaseRow("Fase 1: Ejecución del Proyecto",[],d,0)),recalcProjectBudgetPreview(),window.scrollTo({top:0,behavior:"smooth"})}catch(e){console.error("Error al convertir presupuesto:",e),alert("Error al vincular presupuesto: "+e.message)}}async function lt(t){try{const e=await v(`${_}/quotations/${t}`);if(!e.ok)throw new Error("No se pudo cargar la cotización.");const o=await e.json(),n=o.exchange_rate||M||800,a=(o.currency||"USD").toUpperCase();let s="$",i="USD",m="",u="",l="P. Unit ($)",p="Total ($)";if(a==="USD"){s="$",i="USD",l="P. Unit ($ USD)",p="Total ($ USD)";const f=`$${o.subtotal_usd.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`,b=o.tax_usd===0?"EXENTO (0%)":`$${o.tax_usd.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`,w=`$${o.total_usd.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`;u=`

                <div style="display: flex; justify-content: space-between; font-size: 11.5px; margin-bottom: 4px;">

                    <span style="color: #475569;">Subtotal:</span>

                    <span style="font-weight: 700; color: #1e293b;">${f}</span>

                </div>

                <div style="display: flex; justify-content: space-between; font-size: 11.5px; margin-bottom: 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">

                    <span style="color: #475569;">IVA (${o.tax_percent}%):</span>

                    <span style="font-weight: 700; color: ${o.tax_usd===0?"#10b981":"#d97706"};">${b}</span>

                </div>

                <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: 900; color: #002B49;">

                    <span>TOTAL USD:</span>

                    <span style="color: #0072B8;">${w}</span>

                </div>

            `,m=""}else if(a==="VES"){s="Bs.",i="VES",l="P. Unit (Bs.)",p="Total (Bs.)";const f=o.subtotal_usd*n,b=o.tax_usd*n,w=o.total_usd*n,T=`Bs. ${f.toLocaleString("es-VE",{minimumFractionDigits:2,maximumFractionDigits:2})}`,H=b===0?"EXENTO (0%)":`Bs. ${b.toLocaleString("es-VE",{minimumFractionDigits:2,maximumFractionDigits:2})}`,R=`Bs. ${w.toLocaleString("es-VE",{minimumFractionDigits:2,maximumFractionDigits:2})}`;u=`

                <div style="display: flex; justify-content: space-between; font-size: 11.5px; margin-bottom: 4px;">

                    <span style="color: #475569;">Subtotal:</span>

                    <span style="font-weight: 700; color: #1e293b;">${T}</span>

                </div>

                <div style="display: flex; justify-content: space-between; font-size: 11.5px; margin-bottom: 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">

                    <span style="color: #475569;">IVA (${o.tax_percent}%):</span>

                    <span style="font-weight: 700; color: ${b===0?"#10b981":"#d97706"};">${H}</span>

                </div>

                <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: 900; color: #002B49;">

                    <span>TOTAL BS:</span>

                    <span style="color: #0072B8;">${R}</span>

                </div>

            `,m=""}else{s="â‚¬",i="EUR",l="P. Unit (â‚¬ EUR)",p="Total (â‚¬ EUR)";const f=`â‚¬ ${o.subtotal_usd.toLocaleString("de-DE",{minimumFractionDigits:2,maximumFractionDigits:2})}`,b=o.tax_usd===0?"EXENTO (0%)":`â‚¬ ${o.tax_usd.toLocaleString("de-DE",{minimumFractionDigits:2,maximumFractionDigits:2})}`,w=`â‚¬ ${o.total_usd.toLocaleString("de-DE",{minimumFractionDigits:2,maximumFractionDigits:2})}`;u=`

                <div style="display: flex; justify-content: space-between; font-size: 11.5px; margin-bottom: 4px;">

                    <span style="color: #475569;">Subtotal:</span>

                    <span style="font-weight: 700; color: #1e293b;">${f}</span>

                </div>

                <div style="display: flex; justify-content: space-between; font-size: 11.5px; margin-bottom: 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">

                    <span style="color: #475569;">IVA (${o.tax_percent}%):</span>

                    <span style="font-weight: 700; color: ${o.tax_usd===0?"#10b981":"#d97706"};">${b}</span>

                </div>

                <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: 900; color: #002B49;">

                    <span>TOTAL EUR:</span>

                    <span style="color: #0072B8;">${w}</span>

                </div>

            `,m=""}let d=[];(o.coletilla_divisas===!0||o.terms_currency_usd_only===!0)&&d.push("<b>Condición de Pago:</b> Solo pagadero en divisas (USD)."),(o.coletilla_modalidad===!0||o.terms_check_payment_mode===!0)&&d.push("<b>Modalidad de Pago:</b> Consultar modalidad de pago."),o.coletilla_bolivares===!0&&d.push("<b>Pago en Bolívares (Bs.):</b> En caso de realizar el pago en Bolívares, se calculará a la tasa oficial del Banco Central de Venezuela (BCV) correspondiente a la fecha valor del pago efectivo.");let c="";o.notes&&o.notes.trim()&&(c=`
                <div style="background: #ffffff; border: 1.5px solid #cbd5e1; border-left: 4px solid #0072B8; border-radius: 6px; padding: 10px 14px; margin-bottom: 12px; font-size: 11px; color: #1e293b; line-height: 1.45; page-break-inside: avoid;">
                    <div style="font-weight: 800; color: #002B49; margin-bottom: 4px; text-transform: uppercase; font-size: 10.5px;">
                        <i class="fa-solid fa-clipboard-list" style="color: #0072B8;"></i> Notas & Observaciones Comerciales del Presupuesto:
                    </div>
                    <p style="margin: 0; white-space: pre-wrap;">${o.notes.trim()}</p>
                </div>
            `);let r="";d.length>0&&(r=`
                <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-left: 4px solid #F5B800; padding: 8px 12px; border-radius: 6px; margin-bottom: 12px; font-size: 10.5px; color: #334155; line-height: 1.45; page-break-inside: avoid;">
                    ${d.map(f=>`<p style="margin: 3px 0;">• ${f}</p>`).join("")}
                </div>
            `);const g=(o.items||[]).map((f,b)=>{let w=`$${f.unit_price_usd.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`,T=`$${f.total_usd.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`;return a==="VES"?(w=`Bs. ${(f.unit_price_usd*n).toLocaleString("es-VE",{minimumFractionDigits:2,maximumFractionDigits:2})}`,T=`Bs. ${(f.total_usd*n).toLocaleString("es-VE",{minimumFractionDigits:2,maximumFractionDigits:2})}`):a==="EUR"&&(w=`â‚¬ ${f.unit_price_usd.toLocaleString("de-DE",{minimumFractionDigits:2,maximumFractionDigits:2})}`,T=`â‚¬ ${f.total_usd.toLocaleString("de-DE",{minimumFractionDigits:2,maximumFractionDigits:2})}`),`

            <tr style="page-break-inside: avoid;">

                <td style="text-align: center; font-weight: bold; border: 1px solid #cbd5e1; padding: 6px 4px; font-size: 11px;">${b+1}</td>

                <td style="text-align: center; color: #0284c7; font-weight: 800; border: 1px solid #cbd5e1; padding: 6px 4px; font-size: 11px;">${f.item_code||"SER-"+(b+1)}</td>

                <td style="border: 1px solid #cbd5e1; padding: 6px 8px; font-weight: 600; font-size: 11px; line-height: 1.35;">${f.description}</td>

                <td style="text-align: center; border: 1px solid #cbd5e1; padding: 6px 4px; font-size: 11px;">${f.unit_measure||"Global"}</td>

                <td style="text-align: center; font-weight: bold; border: 1px solid #cbd5e1; padding: 6px 4px; font-size: 11px;">${f.quantity}</td>

                <td style="text-align: right; border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 11px;">${w}</td>

                <td style="text-align: right; font-weight: bold; border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 11px; color: #002B49;">${T}</td>

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

                    <span style="background: #002B49; color: #F5B800; padding: 4px 10px; border-radius: 6px; font-weight: 900; font-size: 13px; letter-spacing: 0.5px; display: inline-block;">${o.quote_number}</span>

                    <p style="font-size: 10.5px; color: #475569; margin: 4px 0 0 0;">Fecha: <b>${new Date(o.created_at).toLocaleDateString("es-VE")}</b></p>

                    <p style="font-size: 10.5px; color: #475569; margin: 2px 0 0 0;">Validez: <b>${o.validity_days||15} Días</b></p>

                </div>

            </div>



            <!-- Ficha de Datos: Cliente, Obra y Condiciones -->

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px; background: #f8fafc; border: 1px solid #cbd5e1; padding: 10px 12px; border-radius: 6px;">

                <div>

                    <span style="font-size: 9.5px; font-weight: 800; color: #64748b; text-transform: uppercase;">Datos del Cliente:</span>

                    <p style="font-size: 12.5px; font-weight: 800; color: #002B49; margin: 2px 0 0 0;">${o.client&&o.client.name||"Cliente General"}</p>

                    <p style="font-size: 10.5px; color: #334155; margin: 2px 0 0 0;">RIF: <b>${o.client&&o.client.rif||"-"}</b></p>

                    <p style="font-size: 10.5px; color: #475569; margin: 2px 0 0 0;">Contacto: ${o.client&&o.client.contact_name||"-"} | Tel: ${o.client&&o.client.contact_phone||"-"}</p>

                </div>

                <div>

                    <span style="font-size: 9.5px; font-weight: 800; color: #64748b; text-transform: uppercase;">Proyecto & Condiciones:</span>

                    <p style="font-size: 12.5px; font-weight: 800; color: #002B49; margin: 2px 0 0 0;">${o.project_title}</p>

                    <p style="font-size: 10.5px; color: #334155; margin: 2px 0 0 0;">Lugar de Ejecución: <b>${o.location||"Sede Central"}</b></p>

                    <p style="font-size: 10.5px; color: #0284c7; margin: 2px 0 0 0;">Tiempo de Ejecución: <b>${o.execution_time||"15 días hábiles a partir del anticipo"}</b></p>

                    <p style="font-size: 10px; color: #64748b; margin: 2px 0 0 0;">Moneda de Emisión: <b>${a==="USD"?"Dólares Americanos (USD $)":a==="VES"?"Bolívares (VES Bs.)":"Euros (EUR â‚¬)"}</b></p>

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

                        <th style="width: 95px; padding: 6px 8px; border: 1px solid #002B49; font-size: 10.5px; text-align: right;">${l}</th>

                        <th style="width: 105px; padding: 6px 8px; border: 1px solid #002B49; font-size: 10.5px; text-align: right;">${p}</th>

                    </tr>

                </thead>

                <tbody>

                    ${g}

                </tbody>

            </table>



            <!-- Bloque de Totales -->

            <div style="display: flex; justify-content: flex-end; margin-bottom: 16px; page-break-inside: avoid;">

                <div style="width: 310px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 14px;">

                    ${u}

                </div>

            </div>



            <!-- Notas y Coletillas Comerciales (Punto 4 y 5) -->
            ${c}
            ${r}

            <!-- Coletilla de Condiciones Cambiarias -->
            ${m}



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

        `;document.getElementById("modalPrintPreviewContent").innerHTML=y,document.getElementById("previewModalTitle").textContent=`Presupuesto ${o.quote_number} | ${o.client&&o.client.name||"Cliente"}`,document.getElementById("modalPrintPreview").classList.remove("hidden")}catch(e){alert("Error al visualizar cotización: "+e.message)}}function dt(){var o;const t=document.getElementById("modalPrintPreviewContent"),e=((o=document.getElementById("previewModalTitle"))==null?void 0:o.textContent)||"Presupuesto DALOR";typeof window.printElementHtml=="function"&&t?window.printElementHtml(t,e):window.print()}let N=1,qe=10,Y=[],F="",se="";function ct(t){N=t,L();const e=document.getElementById("servicesTableBody");e&&e.scrollIntoView({behavior:"smooth",block:"nearest"})}function ut(t){qe=parseInt(t)||10,N=1,L()}function pt(t){F=(t||"").toLowerCase().trim(),Ae()}function mt(t){se=(t||"").trim(),Ae()}function Ae(){Y=(x||[]).filter(t=>{const e=!F||t.name&&t.name.toLowerCase().includes(F)||t.code&&t.code.toLowerCase().includes(F)||t.unit_measure&&t.unit_measure.toLowerCase().includes(F),o=!se||t.category===se;return e&&o}),N=1,L()}function L(){const t=document.getElementById("servicesTableBody");if(!t)return;const e=Y;if(e.length===0){t.innerHTML=`<tr><td colspan="8" style="text-align: center; padding: 25px; color: #64748b; font-weight: 500;">
            <i class="fa-solid fa-folder-open" style="font-size: 24px; color: #94a3b8; margin-bottom: 8px; display: block;"></i>
            No se encontraron partidas que coincidan con los filtros.
        </td></tr>`;const i=document.getElementById("servicesPaginationContainer");i&&(i.innerHTML="");return}const o=typeof window.renderPaginationControls=="function"?window.renderPaginationControls:typeof A=="function"?A:()=>({startIndex:0,endIndex:e.length}),{startIndex:n,endIndex:a}=o({containerId:"servicesPaginationContainer",totalItems:e.length,currentPage:N,pageSize:qe,onPageChange:"goToServicesPage",onPageSizeChange:"changeServicesPageSize",itemLabel:"partida(s)",pageSizeOptions:[10,25,50,100]}),s=e.slice(n,a);t.innerHTML=s.map(i=>{const m=(i.unit_price_usd||0)-(i.base_cost_usd||0);return`
        <tr>
            <td style="font-weight: 800; color: var(--dalor-blue);">${i.code}</td>
            <td style="font-weight: 600; color: var(--dalor-navy);">${i.name}</td>
            <td><span style="font-size: 11px; background: #e0f2fe; color: #0369a1; padding: 3px 8px; border-radius: 6px; font-weight: 700;">${i.category}</span></td>
            <td>${i.unit_measure}</td>
            <td>$${Number(i.base_cost_usd||0).toFixed(2)}</td>
            <td style="font-weight: 800; color: var(--dalor-navy);">$${Number(i.unit_price_usd||0).toFixed(2)}</td>
            <td style="color: #059669; font-weight: 700;">+$${m.toFixed(2)}</td>
            <td style="text-align: center; white-space: nowrap;">
                <button onclick="openEditServiceModal(${i.id})" class="btn-secondary" style="padding: 4px 8px; color: var(--dalor-blue); margin-right: 4px;" title="Editar Partida">
                    <i class="fa-solid fa-pen-to-square"></i>
                </button>
                <button onclick="deleteService(${i.id})" class="btn-secondary" style="padding: 4px 8px; color: #ef4444;" title="Inactivar Partida">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        </tr>`}).join("")}async function ie(){const t=document.getElementById("servicesTableBody");Array.isArray(x)&&x.length>0?(Y=x,L()):t&&(t.innerHTML='<tr><td colspan="8" style="text-align: center; padding: 20px; color: #94a3b8;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando partidas...</td></tr>');try{const e=await v(`${_}/services/`);if(!e.ok)throw new Error("Error HTTP "+e.status);const o=await e.json();x=Array.isArray(o)?o:[],Y=x,N=1,L()}catch{t&&(t.innerHTML='<tr><td colspan="8" style="text-align: center; color: #e11d48;">Error al cargar servicios.</td></tr>')}}function Le(){try{return JSON.parse(localStorage.getItem("dalor_custom_apu_categories")||"[]")}catch{return[]}}function Fe(){try{return JSON.parse(localStorage.getItem("dalor_custom_apu_units")||"[]")}catch{return[]}}function k(t){if(!t||typeof t!="string")return;const e=t.trim();if(!(!e||e==="__NEW__"))try{const o=Le();o.includes(e)||(o.push(e),localStorage.setItem("dalor_custom_apu_categories",JSON.stringify(o)))}catch{}}function z(t){if(!t||typeof t!="string")return;const e=t.trim();if(!(!e||e==="__NEW__"))try{const o=Fe();o.includes(e)||(o.push(e),localStorage.setItem("dalor_custom_apu_units",JSON.stringify(o)))}catch{}}function je(){const t=new Set($e);return Le().forEach(e=>e&&t.add(e.trim())),(window.allServices||x||[]).forEach(e=>{e.category&&typeof e.category=="string"&&e.category.trim()&&e.category!=="__NEW__"&&t.add(e.category.trim())}),Array.from(t)}function De(){const t=["Kilogramo (kg)","Tonelada (ton)","Metro (m)","Metro Cuadrado (m²)","Metro Cúbico (m³)","Pieza (und)","Global (gl)","Hora-Hombre (hh)","Día (dia)","Pulgada-Diámetro (pulg-diam)","Litro (L)","Galón (gal)"],e=new Set(t);return Fe().forEach(o=>o&&e.add(o.trim())),(window.allServices||x||[]).forEach(o=>{o.unit_measure&&typeof o.unit_measure=="string"&&o.unit_measure.trim()&&o.unit_measure!=="__NEW__"&&e.add(o.unit_measure.trim())}),Array.from(e)}function U(){const t=je(),e=De(),o=t.map(l=>`<option value="${l}">${l}</option>`).join("")+'<option value="__NEW__" style="color: #0284c7; font-weight: 800;">âž• Escribir Nueva Categoría...</option>',n=e.map(l=>`<option value="${l}">${l}</option>`).join("")+'<option value="__NEW__" style="color: #0284c7; font-weight: 800;">âž• Escribir Nueva Unidad...</option>',a=document.getElementById("srv_category");if(a){const l=a.value;a.innerHTML=o,l&&l!=="__NEW__"&&t.includes(l)?a.value=l:t.length>0&&l!=="__NEW__"&&(a.value=t[0])}const s=document.getElementById("srv_unit");if(s){const l=s.value;s.innerHTML=n,l&&l!=="__NEW__"&&e.includes(l)?s.value=l:e.length>0&&l!=="__NEW__"&&(s.value=e[0])}const i=document.getElementById("edit_srv_category");if(i){const l=i.value;i.innerHTML=o,l&&l!=="__NEW__"&&t.includes(l)&&(i.value=l)}const m=document.getElementById("edit_srv_unit");if(m){const l=m.value;m.innerHTML=n,l&&l!=="__NEW__"&&e.includes(l)&&(m.value=l)}const u=document.getElementById("serviceCategoryFilter");if(u){const l=u.value;u.innerHTML='<option value="">Todas las Categorías</option>'+t.map(p=>`<option value="${p}">${p}</option>`).join(""),l&&t.includes(l)&&(u.value=l)}}function gt(t){const e=document.getElementById("srv_new_category");e&&(t==="__NEW__"?(e.classList.remove("hidden"),e.focus()):(e.classList.add("hidden"),e.value=""))}function ft(t){const e=document.getElementById("srv_new_unit");e&&(t==="__NEW__"?(e.classList.remove("hidden"),e.focus()):(e.classList.add("hidden"),e.value=""))}function yt(t){const e=document.getElementById("edit_srv_new_category");e&&(t==="__NEW__"?(e.classList.remove("hidden"),e.focus()):(e.classList.add("hidden"),e.value=""))}function wt(t){const e=document.getElementById("edit_srv_new_unit");e&&(t==="__NEW__"?(e.classList.remove("hidden"),e.focus()):(e.classList.add("hidden"),e.value=""))}async function _t(){const t=document.getElementById("serviceForm");t&&t.reset();const e=document.getElementById("srv_new_category");e&&(e.value="",e.classList.add("hidden"));const o=document.getElementById("srv_new_unit");o&&(o.value="",o.classList.add("hidden"));const n=document.getElementById("srv_code");n&&(n.value="Generando correlativo...",n.setAttribute("readonly","true"),n.style.backgroundColor="#f1f5f9",n.style.cursor="not-allowed",n.style.fontWeight="700"),U(),ue("modalService");try{const a=await v(`${_}/services/next-code`);if(a.ok){const s=await a.json();n&&s&&s.next_code&&(n.value=s.next_code)}else if(n){const s=(x?x.length:0)+1;n.value=`APU-${String(s).padStart(3,"0")}`}}catch(a){console.warn("No se pudo obtener correlativo de APU:",a),n&&n.value.includes("Generando")&&(n.value="APU-001")}}async function bt(t){var a,s,i,m,u,l,p;t&&t.preventDefault&&t.preventDefault();let e=(a=document.getElementById("srv_category"))==null?void 0:a.value;if(e==="__NEW__"){const d=(((s=document.getElementById("srv_new_category"))==null?void 0:s.value)||"").trim();if(!d){alert("Por favor escribe el nombre de la nueva categoría."),(i=document.getElementById("srv_new_category"))==null||i.focus();return}e=d,k(e)}let o=(m=document.getElementById("srv_unit"))==null?void 0:m.value;if(o==="__NEW__"){const d=(((u=document.getElementById("srv_new_unit"))==null?void 0:u.value)||"").trim();if(!d){alert("Por favor escribe la unidad de medida (ej: Kg, Ton, Galón, etc.)."),(l=document.getElementById("srv_new_unit"))==null||l.focus();return}o=d,z(o)}const n={code:document.getElementById("srv_code").value.trim(),name:document.getElementById("srv_name").value.trim(),category:e,unit_measure:o,base_cost_usd:parseFloat(document.getElementById("srv_cost").value)||0,unit_price_usd:parseFloat(document.getElementById("srv_price").value)||0};if(!n.name){alert("El nombre de la partida es obligatorio.");return}if(n.unit_price_usd<n.base_cost_usd){const d=(n.unit_price_usd-n.base_cost_usd).toFixed(2);alert(`âš ï¸ PRECIO INVÁLIDO

El Precio de Venta ($${n.unit_price_usd.toFixed(2)}) no puede ser menor al Costo Base ($${n.base_cost_usd.toFixed(2)}).

Margen actual: $${d} (pérdida).

Ajusta el precio antes de guardar.`),(p=document.getElementById("srv_price"))==null||p.focus();return}try{const d=await v(`${_}/services/`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(n)});if(d.ok){const c=await d.json();ne("modalService"),typeof showToastNotification=="function"?showToastNotification(`Partida ${c.code} registrada exitosamente`,"success"):typeof showToast=="function"?showToast(`Partida ${c.code} registrada exitosamente`,"success"):alert(`Partida ${c.code} registrada exitosamente.`),k(c.category||e),z(c.unit_measure||o),await oe(),await ie(),U()}else{const c=await d.json();alert("Error: "+(c.detail||JSON.stringify(c)))}}catch(d){console.error("Error al guardar servicio:",d),alert("Error de conexión al guardar servicio.")}}function vt(t){const e=(x||[]).find(i=>i.id===t);if(!e){alert("Partida no encontrada.");return}U();const o=document.getElementById("edit_srv_new_category");o&&(o.value="",o.classList.add("hidden"));const n=document.getElementById("edit_srv_new_unit");n&&(n.value="",n.classList.add("hidden")),document.getElementById("edit_srv_id").value=e.id,document.getElementById("edit_srv_code").value=e.code,document.getElementById("edit_srv_name").value=e.name;const a=document.getElementById("edit_srv_category");if(a){if(e.category&&!Array.from(a.options).some(i=>i.value===e.category)){const i=document.createElement("option");i.value=e.category,i.textContent=e.category,a.insertBefore(i,a.lastElementChild)}a.value=e.category}const s=document.getElementById("edit_srv_unit");if(s){if(e.unit_measure&&!Array.from(s.options).some(i=>i.value===e.unit_measure)){const i=document.createElement("option");i.value=e.unit_measure,i.textContent=e.unit_measure,s.insertBefore(i,s.lastElementChild)}s.value=e.unit_measure}document.getElementById("edit_srv_cost").value=e.base_cost_usd,document.getElementById("edit_srv_price").value=e.unit_price_usd,ue("modalEditService")}async function xt(t){var s,i,m,u,l,p,d;t&&t.preventDefault&&t.preventDefault();const e=document.getElementById("edit_srv_id").value;let o=(s=document.getElementById("edit_srv_category"))==null?void 0:s.value;if(o==="__NEW__"){const c=(((i=document.getElementById("edit_srv_new_category"))==null?void 0:i.value)||"").trim();if(!c){alert("Por favor escribe el nombre de la nueva categoría."),(m=document.getElementById("edit_srv_new_category"))==null||m.focus();return}o=c,k(o)}let n=(u=document.getElementById("edit_srv_unit"))==null?void 0:u.value;if(n==="__NEW__"){const c=(((l=document.getElementById("edit_srv_new_unit"))==null?void 0:l.value)||"").trim();if(!c){alert("Por favor escribe la unidad de medida."),(p=document.getElementById("edit_srv_new_unit"))==null||p.focus();return}n=c,z(n)}const a={name:document.getElementById("edit_srv_name").value.trim(),category:o,unit_measure:n,base_cost_usd:parseFloat(document.getElementById("edit_srv_cost").value)||0,unit_price_usd:parseFloat(document.getElementById("edit_srv_price").value)||0};if(!a.name){alert("El nombre de la partida es obligatorio.");return}if(a.unit_price_usd<a.base_cost_usd){const c=(a.unit_price_usd-a.base_cost_usd).toFixed(2);alert(`âš ï¸ PRECIO INVÁLIDO

El Precio de Venta ($${a.unit_price_usd.toFixed(2)}) no puede ser menor al Costo Base ($${a.base_cost_usd.toFixed(2)}).

Margen actual: $${c} (pérdida).

Ajusta el precio antes de guardar.`),(d=document.getElementById("edit_srv_price"))==null||d.focus();return}try{const c=await v(`${_}/services/${e}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(a)});if(c.ok)ne("modalEditService"),typeof showToastNotification=="function"?showToastNotification("Partida actualizada exitosamente","success"):typeof showToast=="function"?showToast("Partida actualizada exitosamente","success"):alert("Partida actualizada exitosamente."),k(a.category),z(a.unit_measure),await oe(),await ie(),U();else{const r=await c.json();alert("Error: "+(r.detail||JSON.stringify(r)))}}catch(c){console.error("Error al actualizar servicio:",c),alert("Error de conexión al actualizar servicio.")}}async function Et(t){if(confirm("¿Deseas eliminar permanentemente esta partida de servicio del catálogo?"))try{(await v(`${_}/services/${t}?permanent=true`,{method:"DELETE"})).ok?(await oe(),ie()):alert("Error al eliminar partida.")}catch{alert("Error de conexión al eliminar servicio.")}}async function Me(t){const e=document.getElementById("quoteClientRiskAlert"),o=document.getElementById("quoteClientRiskDetails");if(!e||!t){e&&(e.style.display="none");return}try{const n=await v(`${_}/clients/${t}/credit-risk`);if(!n.ok){e.style.display="none";return}const a=await n.json();if(a&&a.has_risk){let s=(a.bad_debts||[]).map(i=>`"¢ <strong>${i.invoice_number||"Doc"}</strong>: $${(i.amount_usd||0).toFixed(2)} USD <em>(${i.reason||"Sin motivo"})</em>`).join("<br>");o&&(o.innerHTML=`
                    Este cliente posee antecedentes de <strong>cuenta incobrable / castigada</strong> por un total de <strong>$${(a.total_bad_debt_usd||0).toFixed(2)} USD</strong>.<br>
                    <div style="margin-top: 4px; padding: 4px 6px; background: rgba(255,255,255,0.7); border-radius: 4px;">${s}</div>
                    <span style="font-size: 10px; color: #881337; margin-top: 4px; display: block;">
                        <strong>Decisión Operativa:</strong> Puede autorizar emitir esta cotización bajo supervisión comercial o cambiar a otro cliente.
                    </span>
                `),e.style.display="block",window.quoteClientRiskDismissed=!1}else e.style.display="none",window.quoteClientRiskDismissed=!0}catch(n){console.warn("Error al verificar riesgo crediticio:",n),e&&(e.style.display="none")}}function ht(t){if(!t){const e=document.getElementById("quoteClientRiskAlert");e&&(e.style.display="none");return}Me(t)}function It(){const t=document.getElementById("quoteClientRiskAlert");t&&(t.style.display="none"),window.quoteClientRiskDismissed=!0;const e=document.getElementById("quote_client_id"),o=e?e.options[e.selectedIndex]:null;o&&console.log(`[Riesgo Crediticio] Cliente ${o.text} autorizado manualmente para cotización.`)}function St(){const t=document.getElementById("quote_client_id");t&&(t.value="");const e=document.getElementById("quoteClientRiskAlert");e&&(e.style.display="none"),window.quoteClientRiskDismissed=!1}typeof window<"u"&&(window.addQuotationRow=Z,window.cancelQuotationConversion=st,window.convertQuoteToProject=rt,window.deleteService=Et,window.editQuotation=it,window.loadQuotations=Te,window.loadServices=ie,window.onQuotationCurrencyChanged=Pe,window.onServiceSelected=nt,window.onTaxTypeChanged=tt,window.openNewQuotationModal=et,window.openNewServiceModal=_t,window.printQuotation=lt,window.recalcQuotationTotals=q,window.removeQuotationRow=ot,window.submitCreateQuotation=at,window.submitCreateService=bt,window.triggerPrintFromModal=dt,window.populateServiceCategoriesAndUnits=U,window.checkQuoteClientCreditRisk=Me,window.onQuoteClientChanged=ht,window.confirmQuoteClientRisk=It,window.cancelQuoteClientRisk=St,window.goToQuotationsPage=We,window.changeQuotationsPageSize=Je,window.renderQuotationsPaginated=$,window.onQuotationSearchInput=Xe,window.onQuotationStatusFilterChange=Ke,window.onQuotationDateFilterChange=Ze,window.clearQuotationFilters=Ye,window.goToServicesPage=ct,window.changeServicesPageSize=ut,window.renderServicesPaginated=L,window.onServiceSearchInput=pt,window.onServiceCategoryFilterChange=mt,window.openEditServiceModal=vt,window.submitEditService=xt,window.onServiceCategoryChanged=gt,window.onServiceUnitChanged=ft,window.onEditServiceCategoryChanged=yt,window.onEditServiceUnitChanged=wt,window.registerCustomCategory=k,window.registerCustomUnit=z,window.getAllServiceCategories=je,window.getAllServiceUnits=De);function Bt(){var s,i;const t=parseFloat((s=document.getElementById("edit_srv_cost"))==null?void 0:s.value)||0,e=parseFloat((i=document.getElementById("edit_srv_price"))==null?void 0:i.value)||0,o=document.getElementById("editSrvMarginBadge");if(!o)return;if(!t&&!e){o.innerHTML="";return}const n=e-t,a=t>0?(n/t*100).toFixed(1):"N/A";n<0?o.innerHTML='<span style="color:#e11d48;background:#fff1f2;padding:3px 10px;border-radius:6px;border:1px solid #fecdd3;">ERROR: Precio de venta menor al costo — Perdida de $'+Math.abs(n).toFixed(2)+" ("+Math.abs(a)+"%) — Ajusta el precio</span>":n===0?o.innerHTML='<span style="color:#b45309;background:#fffbeb;padding:3px 10px;border-radius:6px;border:1px solid #fde68a;">Margen Cero: Precio igual al costo, sin ganancia</span>':o.innerHTML='<span style="color:#059669;background:#ecfdf5;padding:3px 10px;border-radius:6px;border:1px solid #a7f3d0;">OK Ganancia: +$'+n.toFixed(2)+" ("+a+"% sobre costo)</span>"}function $t(){var s,i;const t=parseFloat((s=document.getElementById("srv_cost"))==null?void 0:s.value)||0,e=parseFloat((i=document.getElementById("srv_price"))==null?void 0:i.value)||0,o=document.getElementById("newSrvMarginBadge");if(!o)return;if(!t&&!e){o.innerHTML="";return}const n=e-t,a=t>0?(n/t*100).toFixed(1):"N/A";n<0?o.innerHTML='<span style="color:#e11d48;background:#fff1f2;padding:3px 10px;border-radius:6px;border:1px solid #fecdd3;">ERROR: Precio de venta menor al costo — Perdida de $'+Math.abs(n).toFixed(2)+" ("+Math.abs(a)+"%) — Ajusta el precio</span>":n===0?o.innerHTML='<span style="color:#b45309;background:#fffbeb;padding:3px 10px;border-radius:6px;border:1px solid #fde68a;">Margen Cero: Precio igual al costo, sin ganancia</span>':o.innerHTML='<span style="color:#059669;background:#ecfdf5;padding:3px 10px;border-radius:6px;border:1px solid #a7f3d0;">OK Ganancia: +$'+n.toFixed(2)+" ("+a+"% sobre costo)</span>"}window.calcEditServiceMargin=Bt;window.calcNewServiceMargin=$t;
