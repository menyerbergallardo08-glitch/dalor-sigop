function fe(t,e=2){const o=Math.pow(10,e);return Math.round((Number(t)||0)*o)/o}window.roundNumber=fe;function qe(t){if(typeof t=="number")return isNaN(t)?0:t;if(!t)return 0;let e=String(t).trim().replace(/[$Bs€\s]/g,"");e.includes(",")&&e.includes(".")?e.indexOf(".")<e.indexOf(",")?e=e.replace(/\./g,"").replace(",","."):e=e.replace(/,/g,""):e.includes(",")&&(e=e.replace(",","."));const o=parseFloat(e);return isNaN(o)?0:o}window.API_BASE=window.location.origin+"/api/v1";var S=window.API_BASE;function De(t,e="Documento DALOR"){let o=document.getElementById("dalor_print_iframe");o||(o=document.createElement("iframe"),o.id="dalor_print_iframe",o.style.position="fixed",o.style.right="0",o.style.bottom="0",o.style.width="0",o.style.height="0",o.style.border="0",o.style.visibility="hidden",document.body.appendChild(o));let i="";if(typeof t=="string")i=t;else if(t&&t.nodeType){const s=t.cloneNode(!0);s.querySelectorAll('.no-print, button, input[type="button"]').forEach(n=>n.remove()),i=s.innerHTML}const a=o.contentWindow.document;a.open(),a.write(`
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
                ${i}
            </body>
        </html>
    `),a.close(),setTimeout(()=>{o.contentWindow.focus(),o.contentWindow.print()},250)}function Me(t,e,o){const i=document.getElementById(t);if(i){if(!Array.isArray(e)){i.innerHTML="";return}i.innerHTML=e.map(o).join("")}}function ye(t){return Array.isArray(t)?[...t].sort((e,o)=>{const i=String(e.code||"").split(".").map(s=>parseInt(s,10)||0),a=String(o.code||"").split(".").map(s=>parseInt(s,10)||0);for(let s=0;s<Math.max(i.length,a.length);s++){const n=i[s]!==void 0?i[s]:-1,d=a[s]!==void 0?a[s]:-1;if(n!==d)return n-d}return String(e.name||"").localeCompare(String(o.name||""))}):[]}window.calcFieldBs=function(){var i,a;const t=parseFloat((i=document.getElementById("field_amount_usd"))==null?void 0:i.value)||0,e=parseFloat((a=document.getElementById("globalExchangeRateInput"))==null?void 0:a.value)||ne,o=document.getElementById("field_amount_bs");o&&!isNaN(t)&&(o.value=(t*e).toFixed(2)),oe()};window.calcFieldUsd=function(){var i,a;const t=parseFloat((i=document.getElementById("field_amount_bs"))==null?void 0:i.value)||0,e=parseFloat((a=document.getElementById("globalExchangeRateInput"))==null?void 0:a.value)||ne,o=document.getElementById("field_amount_usd");o&&!isNaN(t)&&e>0&&(o.value=(t/e).toFixed(2)),oe()};window.onFieldTaxConditionChanged=function(){oe()};function oe(){var m,c;const t=parseFloat((m=document.getElementById("field_amount_usd"))==null?void 0:m.value)||0,e=((c=document.getElementById("field_is_tax_exempt"))==null?void 0:c.value)==="true",o=e?t:+(t/1.16).toFixed(2),i=e?0:+(t-o).toFixed(2),a=document.getElementById("field_base_amount_usd"),s=document.getElementById("field_tax_amount_usd"),n=document.getElementById("field_base_display"),d=document.getElementById("field_tax_display");a&&(a.value=o.toFixed(2)),s&&(s.value=i.toFixed(2)),n&&(n.innerText=`$${o.toFixed(2)}`),d&&(d.innerText=`$${i.toFixed(2)}`)}window.onValTaxChanged=function(){var n,d;const t=parseFloat((n=document.getElementById("val_amount_usd"))==null?void 0:n.value)||0,e=((d=document.getElementById("val_is_tax_exempt"))==null?void 0:d.value)==="true",o=e?t:+(t/1.16).toFixed(2),i=e?0:+(t-o).toFixed(2),a=document.getElementById("val_base_usd"),s=document.getElementById("val_tax_usd");a&&(a.value=o.toFixed(2)),s&&(s.value=i.toFixed(2))};window.APP_BUILD_VERSION="2026.09.15.v93-clean-production";console.log("--> DALOR SIGO-P INITIALIZED v98.31 [MODERNO]");window.APP_BUILD_VERSION="2026.09.15.v93-clean-production";var ke=window.APP_BUILD_VERSION;localStorage.setItem("dalor_build_version",ke);let ne=parseFloat(localStorage.getItem("dalor_exchange_rate"))||850;var U=window.allClients=window.allClients||[],we=window.allServices=window.allServices||[],H=window.allProjects=window.allProjects||[],R=window.allCategories=window.allCategories||[],j=window.allAssets=window.allAssets||[],v=window.allPersonnel=window.allPersonnel||[],L=window.allMaterials=window.allMaterials||[];let ze=[],Ne=[],Ue=[],He=[],B=window.currentUser||(()=>{try{return JSON.parse(localStorage.getItem("dalor_user")||sessionStorage.getItem("dalor_user")||"null")}catch{return null}})(),Re=window.authToken||localStorage.getItem("dalor_token")||sessionStorage.getItem("dalor_token")||null;function h(t,e={}){var o=sessionStorage.getItem("dalor_token")||localStorage.getItem("dalor_token")||window.authToken||"",i=Object.assign({},e.headers||{});return o&&(i.Authorization="Bearer "+o),e.body&&!(e.body instanceof FormData)&&!i["Content-Type"]&&(i["Content-Type"]="application/json"),e.body instanceof FormData&&delete i["Content-Type"],window.fetch(t,Object.assign({},e,{headers:i}))}let _e=0;const be=t=>{Date.now()-_e<350||!t.target.closest(".nav-dropdown")&&!t.target.closest(".dropdown-menu")&&!t.target.closest(".mobile-submenu-card")&&(K(),X())};document.addEventListener("click",be);document.addEventListener("touchend",be);function xe(){return window.innerWidth<=768}function Oe(t,e){t&&t.stopPropagation&&t.stopPropagation(),_e=Date.now();const o=document.getElementById(e);if(!o)return;if(xe()){ve(e);return}const i=o.classList.contains("open");K(),i||o.classList.add("open")}function ve(t){const e=document.getElementById(t);if(!e)return;const o=e.querySelector(".dropdown-btn"),i=e.querySelector(".dropdown-menu"),a=document.getElementById("mobileSubmenuSheet"),s=document.getElementById("mobileSubmenuTitle"),n=document.getElementById("mobileSubmenuItems");if(!a||!s||!n||!i)return;const d=o?o.querySelector("i"):null,m=o?o.querySelector("span"):null,c=d?d.outerHTML:'<i class="fa-solid fa-layer-group" style="color: var(--dalor-blue);"></i>',p=m?m.innerText:"Opciones del Módulo";s.innerHTML=`${c} <span>${p}</span>`,n.innerHTML="",i.querySelectorAll(".dropdown-item").forEach(u=>{const r=u.cloneNode(!0);r.onclick=g=>{g&&g.stopPropagation&&g.stopPropagation(),X(),u.onclick&&u.onclick(g)},n.appendChild(r)}),a.classList.add("active"),document.body.style.overflow="hidden"}function X(t){if(t&&t.target&&t.target.closest(".mobile-submenu-card")&&!t.target.classList.contains("mobile-submenu-close"))return;const e=document.getElementById("mobileSubmenuSheet");e&&e.classList.remove("active"),document.body.style.overflow=""}function K(){document.querySelectorAll(".nav-dropdown").forEach(t=>{t.classList.remove("open")}),X()}function ie(t,e,o=null){K(),["executive","financial","maintenance","quotations","clients","services","projects","dispatch","dashboard","resources","pwa","manual","tree","inbox","expenses-log"].forEach(n=>{const d=document.getElementById(`view-${n}`);d&&d.classList.add("hidden")});const a=document.getElementById(`view-${t}`);a&&a.classList.remove("hidden"),document.querySelectorAll(".nav-dropdown").forEach(n=>n.classList.remove("active"));const s=document.getElementById(`dropdown-${e}`);s&&s.classList.add("active");try{localStorage.setItem("dalor_active_view",t),e&&localStorage.setItem("dalor_active_category",e),sessionStorage.setItem("dalor_active_view",t),e&&sessionStorage.setItem("dalor_active_category",e)}catch{}if(t==="executive"&&typeof window.loadExecutiveDashboard=="function"&&window.loadExecutiveDashboard(),t==="financial"){let n=o||localStorage.getItem("dalor_active_subtab_financial")||sessionStorage.getItem("dalor_active_subtab_financial")||"cxc";const d=window.currentUser||window.State&&window.State.currentUser;if(d){let m={};try{m=typeof d.permissions_json=="string"?JSON.parse(d.permissions_json):d.permissions_json||d.permissions||{}}catch{}if(!((d.username||"").toLowerCase()==="director"||(d.role_name||"").toLowerCase().includes("director")||d.is_superuser===!0)){const p=m.cxc_view!==void 0||m.cxp_view!==void 0||m.bancos_view!==void 0||m.retiros_view!==void 0,l=m.cxc_view!==void 0?!!(m.cxc_view||m.cxc_pay):!p,u=m.cxp_view!==void 0?!!(m.cxp_view||m.cxp_pay):!p,r=m.bancos_view!==void 0?!!m.bancos_view:!p,g=m.retiros_view!==void 0?!!m.retiros_view:!1;n==="cxc"&&l||n==="cxp"&&u||n==="summary"&&r||n==="partners"&&g||(l?n="cxc":u?n="cxp":r?n="summary":g&&(n="partners"))}}typeof window.switchFinancialSubtab=="function"?window.switchFinancialSubtab(n):typeof window.openFinancialSubtab=="function"&&window.openFinancialSubtab(n)}if(t==="maintenance"){const n=o||localStorage.getItem("dalor_active_subtab_maintenance")||sessionStorage.getItem("dalor_active_subtab_maintenance")||"users";typeof window.switchMaintenanceSubtab=="function"?window.switchMaintenanceSubtab(n):typeof window.openMaintenanceSubtab=="function"&&window.openMaintenanceSubtab(n)}if(t==="quotations"&&typeof window.loadQuotations=="function"&&window.loadQuotations(),t==="clients"&&typeof window.loadClients=="function"&&window.loadClients(),t==="services"&&typeof window.loadServices=="function"&&window.loadServices(),t==="projects"){const n=o||localStorage.getItem("dalor_active_subtab_projects")||sessionStorage.getItem("dalor_active_subtab_projects")||"list";typeof window.switchProjectSubtab=="function"?window.switchProjectSubtab(n):typeof window.initProjectPlanningView=="function"&&window.initProjectPlanningView()}if(t==="dispatch"){const n=o||localStorage.getItem("dalor_active_subtab_dispatch")||sessionStorage.getItem("dalor_active_subtab_dispatch")||"list";typeof window.switchDispatchSubtab=="function"?window.switchDispatchSubtab(n):typeof window.initDispatchView=="function"&&window.initDispatchView()}if(t==="dashboard"&&typeof window.loadComparisonDashboard=="function"&&window.loadComparisonDashboard(),t==="resources"){const n=o||localStorage.getItem("dalor_active_subtab_resources")||sessionStorage.getItem("dalor_active_subtab_resources")||"dashboard";typeof window.switchResourceSubtab=="function"?window.switchResourceSubtab(n):typeof window.openResourceSubtab=="function"&&window.openResourceSubtab(n)}t==="inbox"&&typeof window.loadPendingExpensesInbox=="function"&&window.loadPendingExpensesInbox(),t==="tree"&&typeof window.loadCategoriesTree=="function"&&window.loadCategoriesTree(),t==="expenses-log"&&typeof window.loadExpensesLog=="function"&&window.loadExpensesLog(),window.onViewSwitched&&window.onViewSwitched(t)}window.switchView=ie;window.appSwitchView=ie;function A({containerId:t,totalItems:e=0,currentPage:o=1,pageSize:i=10,onPageChange:a="",onPageSizeChange:s="",itemLabel:n="registro(s)",pageSizeOptions:d=[10,15,25,50,100],allowAll:m=!0}){const c=document.getElementById(t);if(!c)return{startIndex:0,endIndex:0,totalPages:1,currentPage:1};const p=i===1e3||i===9999?e||1:i||15,l=Math.max(1,Math.ceil(e/p));let u=Math.max(1,Math.min(o,l));const r=(u-1)*p,g=Math.min(r+p,e);if(e<=Math.min(...d)&&l<=1)return c.innerHTML=`
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 11.5px; color: #64748b; margin-top: 8px;">
                <span>Mostrando <b>${e}</b> ${n}</span>
                ${s?`
                <div style="display: flex; align-items: center; gap: 6px;">
                    <span>Mostrar:</span>
                    <select onchange="${s}(this.value)" style="padding: 2px 6px; font-size: 11px; border: 1px solid #cbd5e1; border-radius: 4px; background: white; font-weight: 700; cursor: pointer;">
                        ${d.map(y=>`<option value="${y}" ${i===y?"selected":""}>${y}</option>`).join("")}
                        ${m?`<option value="1000" ${i===1e3?"selected":""}>Todos</option>`:""}
                    </select>
                </div>`:""}
            </div>
        `,{startIndex:r,endIndex:g,totalPages:l,currentPage:u};let f="",w=Math.max(1,u-2),I=Math.min(l,u+2);w>1&&(f+=`<button type="button" onclick="${a}(1)" class="btn-secondary" style="padding: 4px 9px; font-size: 11px; border-radius: 5px;">1</button>`,w>2&&(f+='<span style="padding: 0 4px; color: #94a3b8;">...</span>'));for(let y=w;y<=I;y++)y===u?f+=`<button type="button" class="btn-primary" style="padding: 4px 10px; font-size: 11px; font-weight: 800; border-radius: 5px; background: var(--dalor-navy, #0f172a); color: white;">${y}</button>`:f+=`<button type="button" onclick="${a}(${y})" class="btn-secondary" style="padding: 4px 9px; font-size: 11px; border-radius: 5px;">${y}</button>`;return I<l&&(I<l-1&&(f+='<span style="padding: 0 4px; color: #94a3b8;">...</span>'),f+=`<button type="button" onclick="${a}(${l})" class="btn-secondary" style="padding: 4px 9px; font-size: 11px; border-radius: 5px;">${l}</button>`),c.innerHTML=`
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 12px; color: #475569; flex-wrap: wrap; gap: 10px; box-shadow: 0 1px 2px rgba(0,0,0,0.04); margin-top: 8px;">
            <div style="font-weight: 600;">
                Mostrando <b style="color: var(--dalor-navy, #0f172a);">${e===0?0:r+1} - ${g}</b> de <b style="color: var(--dalor-navy, #0f172a);">${e}</b> ${n}
            </div>

            <div style="display: flex; align-items: center; gap: 5px;">
                <button type="button" onclick="${a}(1)" class="btn-secondary" style="padding: 4px 8px; font-size: 11px; border-radius: 5px;" ${u===1?'disabled style="opacity:0.4; cursor:not-allowed;"':""} title="Primera página">
                    <i class="fa-solid fa-angles-left"></i>
                </button>
                <button type="button" onclick="${a}(${u-1})" class="btn-secondary" style="padding: 4px 9px; font-size: 11px; border-radius: 5px;" ${u===1?'disabled style="opacity:0.4; cursor:not-allowed;"':""} title="Página anterior">
                    <i class="fa-solid fa-chevron-left"></i> Anterior
                </button>

                <div style="display: flex; align-items: center; gap: 4px;">
                    ${f}
                </div>

                <button type="button" onclick="${a}(${u+1})" class="btn-secondary" style="padding: 4px 9px; font-size: 11px; border-radius: 5px;" ${u===l?'disabled style="opacity:0.4; cursor:not-allowed;"':""} title="Página siguiente">
                    Siguiente <i class="fa-solid fa-chevron-right"></i>
                </button>
                <button type="button" onclick="${a}(${l})" class="btn-secondary" style="padding: 4px 8px; font-size: 11px; border-radius: 5px;" ${u===l?'disabled style="opacity:0.4; cursor:not-allowed;"':""} title="Última página">
                    <i class="fa-solid fa-angles-right"></i>
                </button>
            </div>

            ${s?`
            <div style="display: flex; align-items: center; gap: 6px;">
                <span style="font-size: 11.5px; color: #64748b;">Por página:</span>
                <select onchange="${s}(this.value)" style="padding: 3px 8px; font-size: 11.5px; border: 1px solid #cbd5e1; border-radius: 5px; background: white; font-weight: 700; color: var(--dalor-navy, #0f172a); cursor: pointer;">
                    ${d.map(y=>`<option value="${y}" ${i===y?"selected":""}>${y}</option>`).join("")}
                    ${m?`<option value="1000" ${i===1e3?"selected":""}>Ver todos</option>`:""}
                </select>
            </div>`:""}
        </div>
    `,{startIndex:r,endIndex:g,totalPages:l,currentPage:u}}window.renderPaginationControls=A;async function Z(){try{await h(`${S}/maintenance/sync-dalor-catalog`,{method:"POST"})}catch{}try{const[t,e,o,i,a,s,n]=await Promise.all([h(`${S}/clients/`),h(`${S}/services/`),h(`${S}/projects/`),h(`${S}/expenses/categories`),h(`${S}/assets/`),h(`${S}/personnel/`),h(`${S}/materials/`)]),d=t.ok?await t.json():[];window.allClients=U=Array.isArray(d)?d:[];const m=e.ok?await e.json():[];window.allServices=we=Array.isArray(m)?m:[];const c=o.ok?await o.json():[];window.allProjects=H=Array.isArray(c)?c:[];const p=i.ok?await i.json():[];window.allCategories=R=Array.isArray(p)?p:[];const l=a.ok?await a.json():[];window.allAssets=j=Array.isArray(l)?l:[];const u=s.ok?await s.json():[];window.allPersonnel=v=Array.isArray(u)?u:[];const r=n.ok?await n.json():{};window.allMaterials=L=Array.isArray(r.materials)?r.materials:Array.isArray(r)?r:[],O(),populatePlanDropdownSelectors(),le()}catch(t){console.error("Error al cargar datos maestros:",t)}}function O(){const t=window.allClients&&window.allClients.length>0?window.allClients:Array.isArray(U)?U:[],e=window.allProjects&&window.allProjects.length>0?window.allProjects:Array.isArray(H)?H:[],o=window.allCategories&&window.allCategories.length>0?window.allCategories:Array.isArray(R)?R:[],i=window.allAssets&&window.allAssets.length>0?window.allAssets:Array.isArray(j)?j:[];window.allMaterials&&window.allMaterials.length>0?window.allMaterials:Array.isArray(L),window.allPersonnel&&window.allPersonnel.length>0?window.allPersonnel:Array.isArray(v);const a=(r,g)=>{const f=document.getElementById(r);if(!f)return;const w=f.value;f.innerHTML=g,w&&(f.value=w)},s='<option value="">-- Seleccione Cliente --</option>'+t.map(r=>`<option value="${r.id}">[${r.code}] ${r.name} (${r.rif||"Sin RIF"})</option>`).join("");if(a("quote_client_id",s),a("new_proj_client_id",s),a("cxc_client_id",s),a("rcp_client_id",s),t.length===1){const r=document.getElementById("quote_client_id");r&&!r.value&&(r.value=String(t[0].id));const g=document.getElementById("new_proj_client_id");g&&!g.value&&(g.value=String(t[0].id))}const n='<option value="">-- Gasto General Sede (Sin Proyecto) --</option>'+e.map(r=>`<option value="${r.id}">${r.code} - ${r.name}</option>`).join("");document.getElementById("field_project_id")&&(document.getElementById("field_project_id").innerHTML=n),document.getElementById("manual_project_id")&&(document.getElementById("manual_project_id").innerHTML=n),document.getElementById("cxc_project_id")&&(document.getElementById("cxc_project_id").innerHTML=n),document.getElementById("cxp_project_id")&&(document.getElementById("cxp_project_id").innerHTML=n),document.getElementById("rcp_project_id")&&(document.getElementById("rcp_project_id").innerHTML='<option value="">-- Sin Proyecto Específico (Anticipo a Cuenta) --</option>'),document.getElementById("mc_project_id")&&(document.getElementById("mc_project_id").innerHTML='<option value="">-- Consumo Interno Taller Central (Gasto Sede) --</option>'+e.map(r=>`<option value="${r.id}">${r.code} - ${r.name}</option>`).join("")),document.getElementById("modal_target_project_id")&&(document.getElementById("modal_target_project_id").innerHTML=e.map(r=>`<option value="${r.id}">${r.code} - ${r.name} (${r.location})</option>`).join("")),document.getElementById("tg_project_id")&&(document.getElementById("tg_project_id").innerHTML='<option value="">-- Seleccione Proyecto Aprobado --</option>'+e.map(r=>`<option value="${r.id}" data-location="${r.location}">${r.code} - ${r.name} (${r.location})</option>`).join(""));const m=ye(o).map(r=>`<option value="${r.id}">[${r.code}] ${r.name}</option>`).join("");document.getElementById("field_category_id")&&(document.getElementById("field_category_id").innerHTML=m),document.getElementById("manual_category_id")&&(document.getElementById("manual_category_id").innerHTML=m);const c='<option value="">-- No Aplica --</option>'+i.map(r=>`<option value="${r.id}">${r.asset_code} - ${r.name}</option>`).join("");document.getElementById("field_asset_id")&&(document.getElementById("field_asset_id").innerHTML=c);const l='<option value="">-- Seleccione Vehículo de Transporte --</option>'+j.filter(r=>r.asset_type==="vehiculo"||r.asset_type==="camioneta").map(r=>`<option value="${r.id}">[${r.asset_code}] ${r.name} (Placa: ${r.license_plate||"S/P"})</option>`).join("");document.getElementById("tg_vehicle_id")&&(document.getElementById("tg_vehicle_id").innerHTML=l);const u='<option value="">-- Seleccione Material --</option>'+L.map(r=>`<option value="${r.id}" data-cost="${r.unit_cost_usd}" data-stock="${r.stock_quantity}" data-unit="${r.unit_measure}">[${r.code}] ${r.name} (${r.stock_quantity} ${r.unit_measure} disp. - $${r.unit_cost_usd}/u)</option>`).join("");if(document.getElementById("me_material_id")&&(document.getElementById("me_material_id").innerHTML=u),document.getElementById("mc_material_id")&&(document.getElementById("mc_material_id").innerHTML=u),v&&v.length>0){const r=v.map(g=>`<option value="${g.id}">[${g.code}] ${g.full_name}${g.role_title?" - "+g.role_title:""}</option>`).join("");document.getElementById("field_reported_by")&&(document.getElementById("field_reported_by").innerHTML=r),document.getElementById("manual_reported_by")&&(document.getElementById("manual_reported_by").innerHTML=r)}if(B&&v&&v.length>0){const r=v.find(g=>g.full_name&&B.username&&g.full_name.toLowerCase().includes(B.username.toLowerCase())||g.role_title&&B.role&&g.role_title.toLowerCase().includes(B.role.toLowerCase()))||v[0];r&&(document.getElementById("field_reported_by")&&(document.getElementById("field_reported_by").value=r.id),document.getElementById("manual_reported_by")&&(document.getElementById("manual_reported_by").value=r.id))}typeof window.populateServiceCategoriesAndUnits=="function"&&window.populateServiceCategoriesAndUnits()}function ae(t){t==="modalNewQuotation"&&(t="modalQuotation");const e=document.getElementById(t);e&&(e.classList.remove("hidden"),e.style.removeProperty("display"));const o=document.getElementById("btnFloatingLogout");o&&o.style.setProperty("display","none","important")}function Y(t){const e=document.getElementById(t);if(e&&e.classList.add("hidden"),document.querySelectorAll(".modal-overlay:not(.hidden), .modal:not(.hidden)").length===0){const i=document.getElementById("btnFloatingLogout");i&&i.style.removeProperty("display")}}let T=localStorage.getItem("dalor_sound_alerts")!=="false",pe=new Set,me=!0;function Ve(){T=!T,localStorage.setItem("dalor_sound_alerts",T?"true":"false"),re(),T&&se()}function re(){const t=document.getElementById("iconSoundToggle"),e=document.getElementById("textSoundToggle"),o=document.getElementById("iconSoundToggleInbox"),i=document.getElementById("textSoundToggleInbox"),a=document.getElementById("btnSoundToggle");t&&e&&(T?(t.className="fa-solid fa-bell",e.innerText="Sonido: ON",a&&(a.style.color="#fbbf24",a.style.borderColor="#fbbf24")):(t.className="fa-solid fa-bell-slash",e.innerText="Sonido: OFF",a&&(a.style.color="#94a3b8",a.style.borderColor="#334155"))),o&&i&&(T?(o.className="fa-solid fa-bell",o.style.color="#059669",i.innerText="Alertas Sonoras: ON"):(o.className="fa-solid fa-bell-slash",o.style.color="#94a3b8",i.innerText="Alertas Sonoras: OFF"))}function se(){if(T)try{const t=window.AudioContext||window.webkitAudioContext;if(!t)return;const e=new t,o=e.currentTime,i=e.createOscillator(),a=e.createGain();i.type="sine",i.frequency.setValueAtTime(659.25,o),a.gain.setValueAtTime(.25,o),a.gain.exponentialRampToValueAtTime(.001,o+.35),i.connect(a),a.connect(e.destination),i.start(o),i.stop(o+.35);const s=e.createOscillator(),n=e.createGain();s.type="sine",s.frequency.setValueAtTime(880,o+.12),n.gain.setValueAtTime(.3,o+.12),n.gain.exponentialRampToValueAtTime(.001,o+.55),s.connect(n),n.connect(e.destination),s.start(o+.12),s.stop(o+.55)}catch(t){console.warn("Audio alert error:",t)}}function he(t){const e=document.getElementById("toastNotificationContainer");if(!e)return;const o=document.createElement("div");o.className="toast-card-live",o.style.cssText=`

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

    `;const i=t.reported_by||"Personal de Campo",a=Number(t.amount_usd||0).toFixed(2),s=t.project_name||"Obra General",n=t.supplier_vendor||"Comercio General";o.innerHTML=`

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

                <span style="font-size: 13px; font-weight: 900; color: var(--dalor-gold);">$${a} USD <small style="color: #94a3b8; font-weight: 600;">(${s})</small></span>

                <button onclick="switchView('inbox', 'gastos'); this.closest('.toast-card-live').remove();" style="background: #059669; color: white; border: none; padding: 5px 10px; border-radius: 6px; font-size: 11px; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 4px;">

                    <i class="fa-solid fa-stamp"></i> Auditar

                </button>

            </div>

        </div>

    `,e.appendChild(o),setTimeout(()=>{o.parentElement&&(o.style.opacity="0",o.style.transform="translateX(60px)",setTimeout(()=>o.remove(),300))},9e3)}async function le(){try{if(!B)return;const t=(B.username||"").toLowerCase(),e=(B.role_name||"").toLowerCase();if(t==="campo"||e.includes("supervisor")||e.includes("campo")){const p=document.getElementById("badgeInboxCount"),l=document.getElementById("badgeGastosDropdown");p&&(p.style.display="none"),l&&(l.style.display="none");return}const i=await h(`${S}/expenses/inbox/pending`);if(!i.ok)return;const a=await i.json(),s=Array.isArray(a)?a:[],n=s.length,d=document.getElementById("badgeInboxCount");d&&(d.innerText=n,d.style.display=n>0?"inline-block":"none");const m=document.getElementById("badgeGastosDropdown");m&&(m.innerText=n,m.style.display=n>0?"inline-block":"none");const c=new Set(s.map(p=>p.id));if(!me){const p=s.filter(l=>!pe.has(l.id));if(p.length>0){se(),p.forEach(u=>he(u));const l=document.getElementById("view-inbox");l&&!l.classList.contains("hidden")&&loadPendingExpensesInbox()}}pe=c,me=!1}catch{}}setInterval(le,5e3);re();setInterval(()=>{h("/healthz").catch(()=>{})},3e5);typeof window<"u"&&(window.allClients=U,window.allServices=we,window.allProjects=H,window.allCategories=R,window.allAssets=j,window.allPersonnel=v,window.allMaterials=L,window.selectedPersonnelIds=ze,window.selectedVehicleIds=Ne,window.selectedToolIds=Ue,window.selectedMaterialIds=He,window.EXCHANGE_RATE=ne,window.currentUser=window.currentUser||B,window.authToken=window.authToken||Re,window.closeAllDropdowns=K,window.closeMobileSubmenu=X,window.closeModal=Y,window.isMobileViewport=xe,window.loadInitialMasterData=Z,window.openMobileSubmenu=ve,window.openModal=ae,window.parseLocalizedNumber=qe,window.playNotificationChime=se,window.populateSelect=Me,window.populateSelectDropdowns=O,window.roundNumber=fe,window.showInboxToastNotification=he,window.renderPaginationControls=A,window.sortCategoriesNumerically=ye,window.switchView=ie,window.toggleDropdown=Oe,window.toggleSoundAlerts=Ve,window.printElementHtml=De,window.updatePendingInboxBadge=le,window.updateSoundToggleUI=re);var _=window.API_BASE||window.location.origin+"/api/v1",E=window.allClients=window.allClients||[],x=window.allServices=window.allServices||[],ge=window.allProjects=window.allProjects||[];window.allCategories=window.allCategories||[];window.allAssets=window.allAssets||[];window.allPersonnel=window.allPersonnel||[];window.allMaterials=window.allMaterials||[];window.selectedPersonnelIds=window.selectedPersonnelIds||[];window.selectedVehicleIds=window.selectedVehicleIds||[];window.selectedToolIds=window.selectedToolIds||[];window.selectedMaterialIds=window.selectedMaterialIds||[];var q=window.EXCHANGE_RATE=window.EXCHANGE_RATE||850;window.BCV_DATA=window.BCV_DATA||{rate:850,source:"BCV Oficial"};window.authToken=window.authToken||localStorage.getItem("dalor_token")||null;const Ee=["Fabricación Metalmecánica","Montaje e Instalación en Sitio","Mantenimiento Industrial & Paradas","Soldadura Especializada & Pailería","Mecanizado & Torno","Arenado y Pintura Industrial","Obras Civiles & Eléctricas Asociadas"];typeof window<"u"&&(window.OFFICIAL_DALOR_APU_CATEGORIES=Ee);function b(t,e={}){var o=sessionStorage.getItem("dalor_token")||localStorage.getItem("dalor_token")||window.authToken||"",i=Object.assign({},e.headers||{});return o&&(i.Authorization="Bearer "+o),e.body&&!(e.body instanceof FormData)&&!i["Content-Type"]&&(i["Content-Type"]="application/json"),e.body instanceof FormData&&delete i["Content-Type"],window.fetch(t,Object.assign({},e,{headers:i}))}let Ie=[],$=1,Se=10,V="",Q="",G="",W="";function Qe(t){$=t,C();const e=document.getElementById("quotationsTableBody");e&&e.scrollIntoView({behavior:"smooth",block:"nearest"})}function Ge(t){Se=parseInt(t)||10,$=1,C()}function We(t){V=(t||"").trim().toLowerCase(),$=1,C()}function Je(t){Q=(t||"").trim().toLowerCase(),$=1,C()}function Xe(){var t,e;G=((t=document.getElementById("quoteFilterDateFrom"))==null?void 0:t.value)||"",W=((e=document.getElementById("quoteFilterDateTo"))==null?void 0:e.value)||"",$=1,C()}function Ke(){V="",Q="",G="",W="";const t=document.getElementById("quoteSearchInput");t&&(t.value="");const e=document.getElementById("quoteStatusFilter");e&&(e.value="");const o=document.getElementById("quoteFilterDateFrom");o&&(o.value="");const i=document.getElementById("quoteFilterDateTo");i&&(i.value=""),$=1,C()}function C(){const t=document.getElementById("quotationsTableBody");if(!t)return;let e=Ie||[];if(V){const n=V;e=e.filter(d=>d.quote_number&&d.quote_number.toLowerCase().includes(n)||d.client&&d.client.name&&d.client.name.toLowerCase().includes(n)||d.project_title&&d.project_title.toLowerCase().includes(n))}if(Q&&(e=e.filter(n=>(n.status||"").toLowerCase()===Q)),G&&(e=e.filter(n=>n.created_at&&n.created_at.substring(0,10)>=G)),W&&(e=e.filter(n=>n.created_at&&n.created_at.substring(0,10)<=W)),e.length===0){t.innerHTML='<tr><td colspan="8" style="text-align: center; padding: 20px; color: #94a3b8;">No se encontraron cotizaciones con los criterios seleccionados.</td></tr>';const n=document.getElementById("quotationsPaginationContainer");n&&(n.innerHTML="");return}const o=typeof window.renderPaginationControls=="function"?window.renderPaginationControls:typeof A=="function"?A:()=>({startIndex:0,endIndex:e.length}),{startIndex:i,endIndex:a}=o({containerId:"quotationsPaginationContainer",totalItems:e.length,currentPage:$,pageSize:Se,onPageChange:"goToQuotationsPage",onPageSizeChange:"changeQuotationsPageSize",itemLabel:"cotización(es)",pageSizeOptions:[10,20,50,100]}),s=e.slice(i,a);t.innerHTML=s.map(n=>{const d=n.client?n.client.name:"Cliente General",m=n.status==="aprobado",c=Number(n.subtotal_usd||0),p=Number(n.tax_usd||0),l=Number(n.total_usd||0);return`
        <tr>
            <td style="font-weight: 800; color: var(--dalor-blue);">${n.quote_number}</td>
            <td style="font-weight: 600;">${d}</td>
            <td>${n.project_title}</td>
            <td style="font-weight: 700;">$${c.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
            <td style="color: ${p===0?"#10b981":"#64748b"}; font-weight: 700;">
                ${p===0?"EXENTO (0%)":`$${p.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`}
            </td>
            <td style="font-weight: 800; color: var(--dalor-navy);">$${l.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
            <td>
                <span style="font-size: 10px; padding: 3px 8px; border-radius: 9999px; font-weight: 800; ${m?"background: #dcfce7; color: #166534;":"background: #f1f5f9; color: #475569;"}">
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
                ${m?'<span style="font-size: 11px; color: #059669; font-weight: bold; margin-left: 6px;">Obra Activa</span>':`
                    <button onclick="convertQuoteToProject(${n.id})" class="btn-primary" style="padding: 4px 8px; font-size: 11px; margin-left: 4px; background: #059669;" title="Aprobar y Convertir en Proyecto">
                        <i class="fa-solid fa-check"></i> Convertir en Proyecto
                    </button>
                `}
            </td>
        </tr>`}).join("")}async function Be(){const t=document.getElementById("quotationsTableBody");t.innerHTML='<tr><td colspan="8" style="text-align: center; padding: 20px; color: #94a3b8;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando cotizaciones...</td></tr>';try{const[e,o,i]=await Promise.all([b(`${_}/quotations/`),b(`${_}/clients/`),b(`${_}/services/`)]);if(o.ok){const s=await o.json();E=Array.isArray(s)?s:[]}if(i.ok){const s=await i.json();x=Array.isArray(s)?s:[]}try{typeof window.populateSelectDropdowns=="function"?window.populateSelectDropdowns():typeof O=="function"&&O()}catch(s){console.warn("Aviso al poblar dropdowns de cotizaciones:",s)}if(!e.ok)throw new Error("Error HTTP "+e.status);const a=await e.json();Ie=Array.isArray(a)?a:[],$=1,C()}catch(e){console.error("Error al cargar cotizaciones:",e),t.innerHTML=`<tr><td colspan="8" style="text-align: center; color: #e11d48; padding: 20px;">Error al cargar cotizaciones: ${e.message||"Error de conexión"}</td></tr>`}}async function Ze(){var d;quoteRowsCount=0;const t=document.getElementById("edit_quotation_id");t&&(t.value="");const e=document.getElementById("modalQuotationTitle");e&&(e.innerHTML='<i class="fa-solid fa-calculator" style="color: var(--dalor-blue);"></i> Armar Presupuesto / Cotización Formal (APU)');const o=document.getElementById("btnSubmitQuotation");o&&(o.innerHTML='<i class="fa-solid fa-floppy-disk"></i> Guardar Presupuesto');const i=document.getElementById("quoteForm");i&&i.reset();const a=document.getElementById("quoteClientRiskAlert");a&&(a.style.display="none");const s=document.getElementById("quoteItemsList");s&&(s.innerHTML="");try{if((window.allClients&&window.allClients.length>0?window.allClients:E||[]).length===0){const c=window.authToken||localStorage.getItem("dalor_token")||null,p=c?{Authorization:`Bearer ${c}`}:{},l=await b(`${_}/clients/`,{headers:p});if(l.ok){const u=await l.json();E=window.allClients=Array.isArray(u)?u:[]}}if(!window._servicesLoaded){const c=window.authToken||localStorage.getItem("dalor_token")||null,p=c?{Authorization:`Bearer ${c}`}:{},l=await b(`${_}/services/`,{headers:p});if(l.ok){const u=await l.json();x=window.allServices=Array.isArray(u)?u:[],window._servicesLoaded=!0}}}catch(m){console.warn("Error cargando clientes o servicios para cotización:",m)}typeof window.populateSelectDropdowns=="function"&&window.populateSelectDropdowns();const n=document.getElementById("quote_client_id");if(n){const m=window.allClients&&window.allClients.length>0?window.allClients:E||[];if(m.length>0){let c='<option value="">-- Seleccione Cliente --</option>'+m.map(p=>`<option value="${p.id}">[${p.code}] ${p.name} (${p.rif||"Sin RIF"})</option>`).join("");n.innerHTML=c,m.length===1&&(n.value=String(m[0].id))}}document.getElementById("quote_tax_type")&&(document.getElementById("quote_tax_type").value="16"),document.getElementById("quote_tax_percent")&&(document.getElementById("quote_tax_percent").value="16"),document.getElementById("quote_execution_time")&&(document.getElementById("quote_execution_time").value=""),document.getElementById("quote_currency")&&(document.getElementById("quote_currency").value="USD"),J(),P(),$e(),typeof window.openModal=="function"?window.openModal("modalQuotation"):(d=document.getElementById("modalQuotation"))==null||d.classList.remove("hidden")}function Ye(){const t=document.getElementById("quote_tax_type").value;document.getElementById("quote_tax_percent").value=t,P()}function J(t=null){quoteRowsCount++;const e=document.getElementById("quoteItemsList");if(!e)return;const o=`quote_row_${quoteRowsCount}`,a=`<option value="">${x&&x.length>0?"-- Partida del Catálogo --":"-- Catálogo en blanco (escriba partida manual) --"}</option>`+(x||[]).map(l=>{const u=t&&(String(t.service_id)===String(l.id)||String(t.item_code)===String(l.code));return`<option value="${l.id}" data-code="${l.code}" data-unit="${l.unit_measure}" data-price="${l.unit_price_usd}" ${u?"selected":""}>[${l.code}] ${l.name} ($${l.unit_price_usd}/${l.unit_measure})</option>`}).join(""),s=t?(t.description||"").replaceAll('"',"&quot;"):"",n=t&&t.unit_measure||"Global",d=t&&t.quantity!==void 0?t.quantity:1,m=t&&t.unit_price_usd!==void 0?t.unit_price_usd:0,c=(d*m).toFixed(2),p=document.createElement("div");p.id=o,p.style.cssText="display: grid; grid-template-columns: 4fr 1fr 1fr 1fr 1fr 30px; gap: 6px; background: white; padding: 8px; border-radius: 8px; border: 1px solid #cbd5e1; align-items: center;",p.innerHTML=`

        <div>

            <select class="form-select q-srv-select" style="font-size: 11px; padding: 5px;" onchange="onServiceSelected('${o}')">

                ${a}

            </select>

            <input type="text" class="form-input q-desc" placeholder="Descripción detallada de la partida / APU" value="${s}" autocomplete="off" style="font-size: 11px; padding: 4px 6px; margin-top: 4px;" required>

        </div>

        <div>
            <input type="text" class="form-input q-unit" list="datalist_units" placeholder="Und / Medida" value="${n}" style="font-size: 11px; padding: 5px; font-weight: 700; color: #1e293b;" title="Selecciona o escribe cualquier unidad de medida (ej: Ton, Kg, m, Pulg-Diam, HH, Und)">
            <datalist id="datalist_units">
                ${Array.from(new Set(["Global","Und","Pza","m","m²","m³","ml","Kg","Ton","Litro","Galón","Horas","HH","Días","Punto","Juego","Pulg-Diam",...(x||[]).map(l=>(l.unit_measure||"").trim()).filter(Boolean)])).map(l=>`<option value="${l}">`).join("")}
            </datalist>
        </div>

        <div>

            <input type="number" step="0.01" class="form-input q-qty" placeholder="Cant" value="${d}" oninput="recalcQuotationTotals()" autocomplete="off" style="font-size: 11px; padding: 5px; font-weight: bold;" required>

        </div>

        <div>

            <input type="number" step="0.01" class="form-input q-price" placeholder="P. Unit ($)" value="${m}" oninput="recalcQuotationTotals()" autocomplete="off" style="font-size: 11px; padding: 5px; font-weight: bold; color: var(--dalor-blue);" required>

        </div>

        <div>

            <input type="text" class="form-input q-total" placeholder="Total ($)" value="$${c}" style="font-size: 11px; padding: 5px; font-weight: 800;" readonly>

        </div>

        <div style="text-align: center;">

            <button type="button" onclick="removeQuotationRow('${o}')" style="background: none; border: none; color: #ef4444; font-size: 16px; cursor: pointer;">&times;</button>

        </div>

    `,e.appendChild(p)}function et(t){const e=document.getElementById(t);e&&e.remove(),P()}function tt(t){const e=document.getElementById(t);if(!e)return;const o=e.querySelector(".q-srv-select"),i=o?o.options[o.selectedIndex]:null;i&&i.value&&(e.querySelector(".q-desc").value=i.text.replace(/\[.*?\]\s*/,"").split(" ($")[0],e.querySelector(".q-unit").value=i.getAttribute("data-unit")||"Global",e.querySelector(".q-price").value=parseFloat(i.getAttribute("data-price")||0).toFixed(2)),P()}function P(){var l;const t=document.querySelectorAll("#quoteItemsList > div");let e=0;t.forEach(u=>{const r=u.querySelector(".q-qty"),g=u.querySelector(".q-price"),f=u.querySelector(".q-total"),w=parseFloat(r?r.value:0)||0,I=parseFloat(g?g.value:0)||0,y=w*I;f&&(f.value=`$${y.toFixed(2)}`),e+=y});const o=parseFloat(document.getElementById("quote_tax_percent")?document.getElementById("quote_tax_percent").value:16)||0,i=e*(o/100),a=e+i,s=document.getElementById("quote_subtotal_display"),n=document.getElementById("quote_tax_display"),d=document.getElementById("quote_total_display"),m=(((l=document.getElementById("quote_currency"))==null?void 0:l.value)||"USD").toUpperCase(),c=document.getElementById("quote_bcv_banner_box");c&&(c.style.display=m==="VES"?"block":"none");const p=typeof q<"u"?q:850;if(m==="VES"){const u=e*p,r=i*p,g=a*p;s&&(s.innerHTML=`$${e.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}<br><span style="font-size:11px; color:#fde047;">Bs. ${u.toLocaleString("es-VE",{minimumFractionDigits:2,maximumFractionDigits:2})}</span>`),n&&(n.innerHTML=o===0?"EXENTO (0%)":`$${i.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}<br><span style="font-size:11px; color:#fde047;">Bs. ${r.toLocaleString("es-VE",{minimumFractionDigits:2,maximumFractionDigits:2})}</span>`),d&&(d.innerHTML=`$${a.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}<br><span style="font-size:12px; color:#fde047;">Bs. ${g.toLocaleString("es-VE",{minimumFractionDigits:2,maximumFractionDigits:2})}</span>`)}else s&&(s.innerText=`$${e.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`),n&&(n.innerText=o===0?"EXENTO (0%)":`$${i.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`),d&&(d.innerText=`$${a.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`)}function $e(){P()}async function ot(t){var e;try{const o=window.authToken||localStorage.getItem("dalor_token")||null,i=o?{Authorization:`Bearer ${o}`}:{};if((window.allClients&&window.allClients.length>0?window.allClients:E||[]).length===0){const u=await b(`${_}/clients/`,{headers:i});if(u.ok){const r=await u.json();E=window.allClients=Array.isArray(r)?r:[]}}if(!window._servicesLoaded){const u=await b(`${_}/services/`,{headers:i});if(u.ok){const r=await u.json();x=window.allServices=Array.isArray(r)?r:[],window._servicesLoaded=!0}}typeof window.populateSelectDropdowns=="function"&&window.populateSelectDropdowns();const s=await b(`${_}/quotations/${t}`,{headers:i});if(!s.ok)throw new Error("No se pudo cargar la cotización para edición.");const n=await s.json(),d=document.getElementById("edit_quotation_id");d&&(d.value=n.id);const m=document.getElementById("modalQuotationTitle");m&&(m.innerHTML=`<i class="fa-solid fa-pen-to-square" style="color: var(--dalor-gold);"></i> Re-editar Presupuesto / Cotización [${n.quote_number}]`);const c=document.getElementById("btnSubmitQuotation");c&&(c.innerHTML='<i class="fa-solid fa-floppy-disk"></i> Guardar Cambios de Presupuesto');const p=document.getElementById("quote_client_id");if(p){const u=window.allClients&&window.allClients.length>0?window.allClients:E||[];if(u.length>0){let r='<option value="">-- Seleccione Cliente --</option>'+u.map(g=>`<option value="${g.id}">[${g.code}] ${g.name} (${g.rif||"Sin RIF"})</option>`).join("");p.innerHTML=r}n.client_id&&(p.value=String(n.client_id))}document.getElementById("quote_title")&&(document.getElementById("quote_title").value=n.project_title||""),document.getElementById("quote_location")&&(document.getElementById("quote_location").value=n.location||"Sede Central"),document.getElementById("quote_execution_time")&&(document.getElementById("quote_execution_time").value=n.execution_time||"15 días hábiles"),document.getElementById("quote_validity")&&(document.getElementById("quote_validity").value=n.validity_days||15),document.getElementById("quote_currency")&&(document.getElementById("quote_currency").value=n.currency||"USD"),document.getElementById("quote_tax_percent")&&(document.getElementById("quote_tax_percent").value=n.tax_percent!==void 0&&n.tax_percent!==null?n.tax_percent:n.tax_usd>0?16:0);const l=document.getElementById("quoteItemsList");l&&(l.innerHTML="",quoteRowsCount=0,n.items&&n.items.length>0?n.items.forEach(u=>J(u)):J()),P(),typeof window.openModal=="function"?window.openModal("modalQuotation"):(e=document.getElementById("modalQuotation"))==null||e.classList.remove("hidden")}catch(o){console.error("Error al re-editar presupuesto:",o),alert("Error cargando presupuesto: "+o.message)}}async function nt(t){var c;t&&t.preventDefault&&t.preventDefault();const e=document.getElementById("quote_client_id"),o=e?parseInt(e.value):null;if(!o){alert("Por favor selecciona un cliente de la lista.");return}const i=document.querySelectorAll("#quoteItemsList > div");let a=[];if(i.forEach(p=>{const l=p.querySelector(".q-srv-select"),u=l&&l.value?parseInt(l.value):null,r=l?l.options[l.selectedIndex]:null,g=r?r.getAttribute("data-code"):null,f=p.querySelector(".q-desc")?p.querySelector(".q-desc").value:"",w=p.querySelector(".q-unit")?p.querySelector(".q-unit").value:"Global",I=p.querySelector(".q-qty")?p.querySelector(".q-qty").value:"1",y=p.querySelector(".q-price")?p.querySelector(".q-price").value:"0",ce=parseLocalizedNumber(I)||1,ue=parseLocalizedNumber(y)||0;a.push({service_id:u,item_code:g,description:f,unit_measure:w,quantity:ce,unit_price_usd:ue,total_usd:Number((ce*ue).toFixed(2))})}),a.length===0){alert("Agrega al menos una partida a la cotización.");return}const s=document.getElementById("edit_quotation_id")?document.getElementById("edit_quotation_id").value:"",n=!!s,d={client_id:o,project_title:document.getElementById("quote_title").value,location:document.getElementById("quote_location").value||"Sede Central",execution_time:(document.getElementById("quote_execution_time").value||"").trim()||"A convenir",currency:document.getElementById("quote_currency").value||"USD",validity_days:parseInt(document.getElementById("quote_validity")?document.getElementById("quote_validity").value:15)||15,tax_percent:parseLocalizedNumber((c=document.getElementById("quote_tax_percent"))==null?void 0:c.value)||0,exchange_rate:typeof q<"u"?q:850,items:a},m=document.getElementById("btnSubmitQuotation");m&&(m.disabled=!0,m.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Guardando...');try{const p=n?`${_}/quotations/${s}`:`${_}/quotations/`,u=await b(p,{method:n?"PUT":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(d)});if(!u.ok){const f=await u.json();throw new Error(f.detail||"Error al guardar el presupuesto")}const r=await u.json();Y("modalQuotation");const g=document.getElementById("quoteForm")||document.getElementById("quotationForm");g&&g.reset(),document.getElementById("edit_quotation_id")&&(document.getElementById("edit_quotation_id").value=""),typeof showToastNotification=="function"?showToastNotification(n?`Presupuesto ${r.quote_number||""} actualizado con éxito`:`Presupuesto ${r.quote_number||""} emitido con éxito`,"success"):typeof showToast=="function"?showToast(n?`Presupuesto ${r.quote_number||""} actualizado con éxito`:"Presupuesto creado con éxito","success"):alert(n?"Presupuesto actualizado con éxito.":"Presupuesto creado con éxito."),await Be()}catch(p){console.error("Error al guardar presupuesto:",p),alert("Error al guardar presupuesto: "+p.message)}finally{m&&(m.disabled=!1,m.innerHTML='<i class="fa-solid fa-floppy-disk"></i> Guardar Presupuesto')}}function it(){const t=document.getElementById("converting_quotation_id");t&&(t.value=""),sessionStorage.removeItem("dalor_active_converting_quote_id");const e=document.getElementById("quote_conversion_banner");e&&e.classList.add("hidden");const o=document.getElementById("projectCreateForm");o&&o.reset(),switchProjectSubtab("list")}async function at(t){try{if(sessionStorage.setItem("dalor_active_converting_quote_id",String(t)),!E||E.length===0)try{const f=await b(`${_}/clients/`);f.ok&&(E=await f.json())}catch{}const e=await b(`${_}/quotations/${t}`);if(!e.ok)throw new Error("No se pudo cargar la información del presupuesto.");const o=await e.json();switchView("projects","proyectos"),switchProjectSubtab("form"),populatePlanDropdownSelectors();const i=document.getElementById("converting_quotation_id");i&&(i.value=o.id);const a=document.getElementById("quote_conversion_banner"),s=document.getElementById("quote_conversion_text");a&&a.classList.remove("hidden");const n=o.client?o.client.name:o.client_name||"Cliente";s&&(s.innerText=`Presupuesto [${o.quote_number}] para ${n}. Monto: $${o.total_usd.toLocaleString("en-US",{minimumFractionDigits:2})}. Revisa y completa los campos a continuación:`);const d=document.getElementById("new_proj_code");d&&(d.readOnly=!0,d.style.backgroundColor="#f1f5f9",d.style.cursor="not-allowed",b(`${_}/projects/next-code`).then(f=>f.json()).then(f=>{f&&f.next_code&&d&&(d.value=f.next_code)}).catch(f=>{console.warn("Fallback cálculo código proyecto:",f);const w=(ge?ge.length:0)+1;d&&(d.value=`PRJ-2026-${String(w).padStart(3,"0")}`)})),document.getElementById("new_proj_name")&&(document.getElementById("new_proj_name").value=o.project_title||"");const m=document.getElementById("new_proj_client_id");m&&o.client_id&&(m.value=String(o.client_id)),document.getElementById("new_proj_location")&&(document.getElementById("new_proj_location").value=o.location||"Sede Central");let c=30;if(o.execution_time){const f=o.execution_time.match(/\d+/);f&&(c=parseInt(f[0]))}document.getElementById("new_proj_duration")&&(document.getElementById("new_proj_duration").value=c),document.getElementById("new_proj_contract")&&(document.getElementById("new_proj_contract").value=o.total_usd.toFixed(2));let p=`Obra adjudicada bajo Presupuesto ${o.quote_number}.
Partidas y APU contratadas:
`;o.items&&o.items.length>0?p+=o.items.map((f,w)=>`${w+1}. [${f.item_code||"SER"}] ${f.description} (Cant: ${f.quantity} ${f.unit_measure||"Global"})`).join(`
`):p+=o.project_title,document.getElementById("new_proj_scope")&&(document.getElementById("new_proj_scope").value=p);const l=o.subtotal_usd||o.total_usd||0,u=o.total_usd||0,r=l*.65;document.getElementById("new_proj_labor")&&(document.getElementById("new_proj_labor").value=(l*.3).toFixed(2)),document.getElementById("new_proj_fuel")&&(document.getElementById("new_proj_fuel").value=(l*.08).toFixed(2)),document.getElementById("new_proj_materials")&&(document.getElementById("new_proj_materials").value=(l*.2).toFixed(2)),document.getElementById("new_proj_tools")&&(document.getElementById("new_proj_tools").value=(l*.04).toFixed(2)),document.getElementById("new_proj_services")&&(document.getElementById("new_proj_services").value=(l*.03).toFixed(2));const g=document.getElementById("projectPhasesContainer");if(g&&typeof addProjectPhaseRow=="function"){g.innerHTML="",window.phaseRowsCount=0;const f=Math.max(7,Math.round(c/4));addProjectPhaseRow("Fase 1: Movilización, Permisos & Seguridad SHA",["Gestión de pases y autorizaciones","Charla de inducción y seguridad industrial SHA","Movilización de cuadrilla y equipos a planta"],f,Number((r*.2).toFixed(2))),addProjectPhaseRow("Fase 2: Ejecución Operativa / Desmontaje",["Desmontaje, cortes y maniobras mecánicas","Alineación y preparación de superficies"],f,Number((r*.35).toFixed(2))),addProjectPhaseRow("Fase 3: Montaje, Armado & Ajustes",["Soldadura, calderería e instalación de piezas nuevas","Torque y fijación de soportería estructural"],f,Number((r*.3).toFixed(2))),addProjectPhaseRow("Fase 4: Ensayos, Pintura & Entrega Conforme",["Inspección de calidad y recubrimiento anticorrosivo","Pruebas de servicio y firma de acta de entrega"],f,Number((r*.15).toFixed(2)))}recalcProjectBudgetPreview(),window.scrollTo({top:0,behavior:"smooth"})}catch(e){console.error("Error al convertir presupuesto:",e),alert("Error al vincular presupuesto: "+e.message)}}async function rt(t){try{const e=await b(`${_}/quotations/${t}`);if(!e.ok)throw new Error("No se pudo cargar la cotización.");const o=await e.json(),i=o.exchange_rate||q||800,a=(o.currency||"USD").toUpperCase();let s="$",n="USD",d="",m="",c="P. Unit ($)",p="Total ($)";if(a==="USD"){s="$",n="USD",c="P. Unit ($ USD)",p="Total ($ USD)";const r=`$${o.subtotal_usd.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`,g=o.tax_usd===0?"EXENTO (0%)":`$${o.tax_usd.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`,f=`$${o.total_usd.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`;m=`

                <div style="display: flex; justify-content: space-between; font-size: 11.5px; margin-bottom: 4px;">

                    <span style="color: #475569;">Subtotal:</span>

                    <span style="font-weight: 700; color: #1e293b;">${r}</span>

                </div>

                <div style="display: flex; justify-content: space-between; font-size: 11.5px; margin-bottom: 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">

                    <span style="color: #475569;">IVA (${o.tax_percent}%):</span>

                    <span style="font-weight: 700; color: ${o.tax_usd===0?"#10b981":"#d97706"};">${g}</span>

                </div>

                <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: 900; color: #002B49;">

                    <span>TOTAL USD:</span>

                    <span style="color: #0072B8;">${f}</span>

                </div>

            `,d=`

                <div style="background: #f8fafc; border-left: 4px solid var(--dalor-navy); padding: 8px 12px; border-radius: 4px; margin-bottom: 18px; font-size: 10px; color: #334155; line-height: 1.45;">

                    <p style="margin: 0;"><b>Condición de Pago & Cláusula Cambiaria:</b> Precios expresados en Dólares Americanos (USD). En caso de liquidación o pago en Bolívares (VES), los importes se calcularán a la tasa oficial de cambio publicada por el Banco Central de Venezuela (BCV) vigente a la fecha efectiva del pago.</p>

                </div>

            `}else if(a==="VES"){s="Bs.",n="VES",c="P. Unit (Bs.)",p="Total (Bs.)";const r=o.subtotal_usd*i,g=o.tax_usd*i,f=o.total_usd*i,w=`Bs. ${r.toLocaleString("es-VE",{minimumFractionDigits:2,maximumFractionDigits:2})}`,I=g===0?"EXENTO (0%)":`Bs. ${g.toLocaleString("es-VE",{minimumFractionDigits:2,maximumFractionDigits:2})}`,y=`Bs. ${f.toLocaleString("es-VE",{minimumFractionDigits:2,maximumFractionDigits:2})}`;m=`

                <div style="display: flex; justify-content: space-between; font-size: 11.5px; margin-bottom: 4px;">

                    <span style="color: #475569;">Subtotal:</span>

                    <span style="font-weight: 700; color: #1e293b;">${w}</span>

                </div>

                <div style="display: flex; justify-content: space-between; font-size: 11.5px; margin-bottom: 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">

                    <span style="color: #475569;">IVA (${o.tax_percent}%):</span>

                    <span style="font-weight: 700; color: ${g===0?"#10b981":"#d97706"};">${I}</span>

                </div>

                <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: 900; color: #002B49;">

                    <span>TOTAL BS:</span>

                    <span style="color: #0072B8;">${y}</span>

                </div>

            `,d=`
                <div style="background: #fefce8; border: 1.5px solid #facc15; border-left: 5px solid #d97706; padding: 10px 14px; border-radius: 6px; margin-bottom: 18px; font-size: 11px; color: #713f12; line-height: 1.45;">
                    <p style="margin: 0;"><b><i class="fa-solid fa-scale-balanced" style="color: #b45309;"></i> Membrete Oficial & Cláusula Cambiaria BCV:</b> Monto cotizado expresado en USD y pagadero en Bolívares (VES) a la Tasa Oficial del Banco Central de Venezuela (BCV) vigente a la fecha efectiva de pago. Operación amparada bajo el régimen cambiario y fiscal venezolano vigente.</p>
                </div>
            `}else{s="â‚¬",n="EUR",c="P. Unit (â‚¬ EUR)",p="Total (â‚¬ EUR)";const r=`â‚¬ ${o.subtotal_usd.toLocaleString("de-DE",{minimumFractionDigits:2,maximumFractionDigits:2})}`,g=o.tax_usd===0?"EXENTO (0%)":`â‚¬ ${o.tax_usd.toLocaleString("de-DE",{minimumFractionDigits:2,maximumFractionDigits:2})}`,f=`â‚¬ ${o.total_usd.toLocaleString("de-DE",{minimumFractionDigits:2,maximumFractionDigits:2})}`;m=`

                <div style="display: flex; justify-content: space-between; font-size: 11.5px; margin-bottom: 4px;">

                    <span style="color: #475569;">Subtotal:</span>

                    <span style="font-weight: 700; color: #1e293b;">${r}</span>

                </div>

                <div style="display: flex; justify-content: space-between; font-size: 11.5px; margin-bottom: 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">

                    <span style="color: #475569;">IVA (${o.tax_percent}%):</span>

                    <span style="font-weight: 700; color: ${o.tax_usd===0?"#10b981":"#d97706"};">${g}</span>

                </div>

                <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: 900; color: #002B49;">

                    <span>TOTAL EUR:</span>

                    <span style="color: #0072B8;">${f}</span>

                </div>

            `,d=`

                <div style="background: #f8fafc; border-left: 4px solid var(--dalor-navy); padding: 8px 12px; border-radius: 4px; margin-bottom: 18px; font-size: 10px; color: #334155; line-height: 1.45;">

                    <p style="margin: 0;"><b>Condición de Pago & Cláusula Cambiaria:</b> Precios expresados en Euros (EUR). Pagaderos en Bolívares (VES) a la tasa oficial BCV vigente a la fecha efectiva del pago.</p>

                </div>

            `}const l=(o.items||[]).map((r,g)=>{let f=`$${r.unit_price_usd.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`,w=`$${r.total_usd.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`;return a==="VES"?(f=`Bs. ${(r.unit_price_usd*i).toLocaleString("es-VE",{minimumFractionDigits:2,maximumFractionDigits:2})}`,w=`Bs. ${(r.total_usd*i).toLocaleString("es-VE",{minimumFractionDigits:2,maximumFractionDigits:2})}`):a==="EUR"&&(f=`â‚¬ ${r.unit_price_usd.toLocaleString("de-DE",{minimumFractionDigits:2,maximumFractionDigits:2})}`,w=`â‚¬ ${r.total_usd.toLocaleString("de-DE",{minimumFractionDigits:2,maximumFractionDigits:2})}`),`

            <tr style="page-break-inside: avoid;">

                <td style="text-align: center; font-weight: bold; border: 1px solid #cbd5e1; padding: 6px 4px; font-size: 11px;">${g+1}</td>

                <td style="text-align: center; color: #0284c7; font-weight: 800; border: 1px solid #cbd5e1; padding: 6px 4px; font-size: 11px;">${r.item_code||"SER-"+(g+1)}</td>

                <td style="border: 1px solid #cbd5e1; padding: 6px 8px; font-weight: 600; font-size: 11px; line-height: 1.35;">${r.description}</td>

                <td style="text-align: center; border: 1px solid #cbd5e1; padding: 6px 4px; font-size: 11px;">${r.unit_measure||"Global"}</td>

                <td style="text-align: center; font-weight: bold; border: 1px solid #cbd5e1; padding: 6px 4px; font-size: 11px;">${r.quantity}</td>

                <td style="text-align: right; border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 11px;">${f}</td>

                <td style="text-align: right; font-weight: bold; border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 11px; color: #002B49;">${w}</td>

            </tr>`}).join(""),u=`

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

                        <th style="width: 95px; padding: 6px 8px; border: 1px solid #002B49; font-size: 10.5px; text-align: right;">${c}</th>

                        <th style="width: 105px; padding: 6px 8px; border: 1px solid #002B49; font-size: 10.5px; text-align: right;">${p}</th>

                    </tr>

                </thead>

                <tbody>

                    ${l}

                </tbody>

            </table>



            <!-- Bloque de Totales -->

            <div style="display: flex; justify-content: flex-end; margin-bottom: 16px; page-break-inside: avoid;">

                <div style="width: 310px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 14px;">

                    ${m}

                </div>

            </div>



            <!-- Coletilla de Condiciones Comerciales -->

            ${d}



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

        `;document.getElementById("modalPrintPreviewContent").innerHTML=u,document.getElementById("previewModalTitle").textContent=`Presupuesto ${o.quote_number} | ${o.client&&o.client.name||"Cliente"}`,document.getElementById("modalPrintPreview").classList.remove("hidden")}catch(e){alert("Error al visualizar cotización: "+e.message)}}function st(){var o;const t=document.getElementById("modalPrintPreviewContent"),e=((o=document.getElementById("previewModalTitle"))==null?void 0:o.textContent)||"Presupuesto DALOR";typeof window.printElementHtml=="function"&&t?window.printElementHtml(t,e):window.print()}let k=1,Ce=10,de=[],F="",te="";function lt(t){k=t,z();const e=document.getElementById("servicesTableBody");e&&e.scrollIntoView({behavior:"smooth",block:"nearest"})}function dt(t){Ce=parseInt(t)||10,k=1,z()}function ct(t){F=(t||"").toLowerCase().trim(),Te()}function ut(t){te=(t||"").trim(),Te()}function Te(){de=(x||[]).filter(t=>{const e=!F||t.name&&t.name.toLowerCase().includes(F)||t.code&&t.code.toLowerCase().includes(F)||t.unit_measure&&t.unit_measure.toLowerCase().includes(F),o=!te||t.category===te;return e&&o}),k=1,z()}function z(){const t=document.getElementById("servicesTableBody");if(!t)return;const e=de;if(e.length===0){t.innerHTML=`<tr><td colspan="8" style="text-align: center; padding: 25px; color: #64748b; font-weight: 500;">
            <i class="fa-solid fa-folder-open" style="font-size: 24px; color: #94a3b8; margin-bottom: 8px; display: block;"></i>
            No se encontraron partidas que coincidan con los filtros.
        </td></tr>`;const n=document.getElementById("servicesPaginationContainer");n&&(n.innerHTML="");return}const o=typeof window.renderPaginationControls=="function"?window.renderPaginationControls:typeof A=="function"?A:()=>({startIndex:0,endIndex:e.length}),{startIndex:i,endIndex:a}=o({containerId:"servicesPaginationContainer",totalItems:e.length,currentPage:k,pageSize:Ce,onPageChange:"goToServicesPage",onPageSizeChange:"changeServicesPageSize",itemLabel:"partida(s)",pageSizeOptions:[10,25,50,100]}),s=e.slice(i,a);t.innerHTML=s.map(n=>{const d=(n.unit_price_usd||0)-(n.base_cost_usd||0);return`
        <tr>
            <td style="font-weight: 800; color: var(--dalor-blue);">${n.code}</td>
            <td style="font-weight: 600; color: var(--dalor-navy);">${n.name}</td>
            <td><span style="font-size: 11px; background: #e0f2fe; color: #0369a1; padding: 3px 8px; border-radius: 6px; font-weight: 700;">${n.category}</span></td>
            <td>${n.unit_measure}</td>
            <td>$${Number(n.base_cost_usd||0).toFixed(2)}</td>
            <td style="font-weight: 800; color: var(--dalor-navy);">$${Number(n.unit_price_usd||0).toFixed(2)}</td>
            <td style="color: #059669; font-weight: 700;">+$${d.toFixed(2)}</td>
            <td style="text-align: center; white-space: nowrap;">
                <button onclick="openEditServiceModal(${n.id})" class="btn-secondary" style="padding: 4px 8px; color: var(--dalor-blue); margin-right: 4px;" title="Editar Partida">
                    <i class="fa-solid fa-pen-to-square"></i>
                </button>
                <button onclick="deleteService(${n.id})" class="btn-secondary" style="padding: 4px 8px; color: #ef4444;" title="Inactivar Partida">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        </tr>`}).join("")}async function ee(){const t=document.getElementById("servicesTableBody");t&&(t.innerHTML='<tr><td colspan="8" style="text-align: center; padding: 20px; color: #94a3b8;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando partidas...</td></tr>');try{const e=await b(`${_}/services/`);if(!e.ok)throw new Error("Error HTTP "+e.status);const o=await e.json();x=Array.isArray(o)?o:[],de=x,k=1,z()}catch{t&&(t.innerHTML='<tr><td colspan="8" style="text-align: center; color: #e11d48;">Error al cargar servicios.</td></tr>')}}function Pe(){try{return JSON.parse(localStorage.getItem("dalor_custom_apu_categories")||"[]")}catch{return[]}}function Ae(){try{return JSON.parse(localStorage.getItem("dalor_custom_apu_units")||"[]")}catch{return[]}}function D(t){if(!t||typeof t!="string")return;const e=t.trim();if(!(!e||e==="__NEW__"))try{const o=Pe();o.includes(e)||(o.push(e),localStorage.setItem("dalor_custom_apu_categories",JSON.stringify(o)))}catch{}}function M(t){if(!t||typeof t!="string")return;const e=t.trim();if(!(!e||e==="__NEW__"))try{const o=Ae();o.includes(e)||(o.push(e),localStorage.setItem("dalor_custom_apu_units",JSON.stringify(o)))}catch{}}function Fe(){const t=new Set(Ee);return Pe().forEach(e=>e&&t.add(e.trim())),(window.allServices||x||[]).forEach(e=>{e.category&&typeof e.category=="string"&&e.category.trim()&&e.category!=="__NEW__"&&t.add(e.category.trim())}),Array.from(t)}function je(){const t=["Kilogramo (kg)","Tonelada (ton)","Metro (m)","Metro Cuadrado (m²)","Metro Cúbico (m³)","Pieza (und)","Global (gl)","Hora-Hombre (hh)","Día (dia)","Pulgada-Diámetro (pulg-diam)","Litro (L)","Galón (gal)"],e=new Set(t);return Ae().forEach(o=>o&&e.add(o.trim())),(window.allServices||x||[]).forEach(o=>{o.unit_measure&&typeof o.unit_measure=="string"&&o.unit_measure.trim()&&o.unit_measure!=="__NEW__"&&e.add(o.unit_measure.trim())}),Array.from(e)}function N(){const t=Fe(),e=je(),o=t.map(c=>`<option value="${c}">${c}</option>`).join("")+'<option value="__NEW__" style="color: #0284c7; font-weight: 800;">âž• Escribir Nueva Categoría...</option>',i=e.map(c=>`<option value="${c}">${c}</option>`).join("")+'<option value="__NEW__" style="color: #0284c7; font-weight: 800;">âž• Escribir Nueva Unidad...</option>',a=document.getElementById("srv_category");if(a){const c=a.value;a.innerHTML=o,c&&c!=="__NEW__"&&t.includes(c)?a.value=c:t.length>0&&c!=="__NEW__"&&(a.value=t[0])}const s=document.getElementById("srv_unit");if(s){const c=s.value;s.innerHTML=i,c&&c!=="__NEW__"&&e.includes(c)?s.value=c:e.length>0&&c!=="__NEW__"&&(s.value=e[0])}const n=document.getElementById("edit_srv_category");if(n){const c=n.value;n.innerHTML=o,c&&c!=="__NEW__"&&t.includes(c)&&(n.value=c)}const d=document.getElementById("edit_srv_unit");if(d){const c=d.value;d.innerHTML=i,c&&c!=="__NEW__"&&e.includes(c)&&(d.value=c)}const m=document.getElementById("serviceCategoryFilter");if(m){const c=m.value;m.innerHTML='<option value="">Todas las Categorías</option>'+t.map(p=>`<option value="${p}">${p}</option>`).join(""),c&&t.includes(c)&&(m.value=c)}}function pt(t){const e=document.getElementById("srv_new_category");e&&(t==="__NEW__"?(e.classList.remove("hidden"),e.focus()):(e.classList.add("hidden"),e.value=""))}function mt(t){const e=document.getElementById("srv_new_unit");e&&(t==="__NEW__"?(e.classList.remove("hidden"),e.focus()):(e.classList.add("hidden"),e.value=""))}function gt(t){const e=document.getElementById("edit_srv_new_category");e&&(t==="__NEW__"?(e.classList.remove("hidden"),e.focus()):(e.classList.add("hidden"),e.value=""))}function ft(t){const e=document.getElementById("edit_srv_new_unit");e&&(t==="__NEW__"?(e.classList.remove("hidden"),e.focus()):(e.classList.add("hidden"),e.value=""))}async function yt(){const t=document.getElementById("serviceForm");t&&t.reset();const e=document.getElementById("srv_new_category");e&&(e.value="",e.classList.add("hidden"));const o=document.getElementById("srv_new_unit");o&&(o.value="",o.classList.add("hidden"));const i=document.getElementById("srv_code");i&&(i.value="Generando correlativo...",i.setAttribute("readonly","true"),i.style.backgroundColor="#f1f5f9",i.style.cursor="not-allowed",i.style.fontWeight="700"),N(),ae("modalService");try{const a=await b(`${_}/services/next-code`);if(a.ok){const s=await a.json();i&&s&&s.next_code&&(i.value=s.next_code)}else if(i){const s=(x?x.length:0)+1;i.value=`APU-${String(s).padStart(3,"0")}`}}catch(a){console.warn("No se pudo obtener correlativo de APU:",a),i&&i.value.includes("Generando")&&(i.value="APU-001")}}async function wt(t){var a,s,n,d,m,c,p;t&&t.preventDefault&&t.preventDefault();let e=(a=document.getElementById("srv_category"))==null?void 0:a.value;if(e==="__NEW__"){const l=(((s=document.getElementById("srv_new_category"))==null?void 0:s.value)||"").trim();if(!l){alert("Por favor escribe el nombre de la nueva categoría."),(n=document.getElementById("srv_new_category"))==null||n.focus();return}e=l,D(e)}let o=(d=document.getElementById("srv_unit"))==null?void 0:d.value;if(o==="__NEW__"){const l=(((m=document.getElementById("srv_new_unit"))==null?void 0:m.value)||"").trim();if(!l){alert("Por favor escribe la unidad de medida (ej: Kg, Ton, Galón, etc.)."),(c=document.getElementById("srv_new_unit"))==null||c.focus();return}o=l,M(o)}const i={code:document.getElementById("srv_code").value.trim(),name:document.getElementById("srv_name").value.trim(),category:e,unit_measure:o,base_cost_usd:parseFloat(document.getElementById("srv_cost").value)||0,unit_price_usd:parseFloat(document.getElementById("srv_price").value)||0};if(!i.name){alert("El nombre de la partida es obligatorio.");return}if(i.unit_price_usd<i.base_cost_usd){const l=(i.unit_price_usd-i.base_cost_usd).toFixed(2);alert(`âš ï¸ PRECIO INVÁLIDO

El Precio de Venta ($${i.unit_price_usd.toFixed(2)}) no puede ser menor al Costo Base ($${i.base_cost_usd.toFixed(2)}).

Margen actual: $${l} (pérdida).

Ajusta el precio antes de guardar.`),(p=document.getElementById("srv_price"))==null||p.focus();return}try{const l=await b(`${_}/services/`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(i)});if(l.ok){const u=await l.json();Y("modalService"),typeof showToastNotification=="function"?showToastNotification(`Partida ${u.code} registrada exitosamente`,"success"):typeof showToast=="function"?showToast(`Partida ${u.code} registrada exitosamente`,"success"):alert(`Partida ${u.code} registrada exitosamente.`),D(u.category||e),M(u.unit_measure||o),await Z(),await ee(),N()}else{const u=await l.json();alert("Error: "+(u.detail||JSON.stringify(u)))}}catch(l){console.error("Error al guardar servicio:",l),alert("Error de conexión al guardar servicio.")}}function _t(t){const e=(x||[]).find(n=>n.id===t);if(!e){alert("Partida no encontrada.");return}N();const o=document.getElementById("edit_srv_new_category");o&&(o.value="",o.classList.add("hidden"));const i=document.getElementById("edit_srv_new_unit");i&&(i.value="",i.classList.add("hidden")),document.getElementById("edit_srv_id").value=e.id,document.getElementById("edit_srv_code").value=e.code,document.getElementById("edit_srv_name").value=e.name;const a=document.getElementById("edit_srv_category");if(a){if(e.category&&!Array.from(a.options).some(n=>n.value===e.category)){const n=document.createElement("option");n.value=e.category,n.textContent=e.category,a.insertBefore(n,a.lastElementChild)}a.value=e.category}const s=document.getElementById("edit_srv_unit");if(s){if(e.unit_measure&&!Array.from(s.options).some(n=>n.value===e.unit_measure)){const n=document.createElement("option");n.value=e.unit_measure,n.textContent=e.unit_measure,s.insertBefore(n,s.lastElementChild)}s.value=e.unit_measure}document.getElementById("edit_srv_cost").value=e.base_cost_usd,document.getElementById("edit_srv_price").value=e.unit_price_usd,ae("modalEditService")}async function bt(t){var s,n,d,m,c,p,l;t&&t.preventDefault&&t.preventDefault();const e=document.getElementById("edit_srv_id").value;let o=(s=document.getElementById("edit_srv_category"))==null?void 0:s.value;if(o==="__NEW__"){const u=(((n=document.getElementById("edit_srv_new_category"))==null?void 0:n.value)||"").trim();if(!u){alert("Por favor escribe el nombre de la nueva categoría."),(d=document.getElementById("edit_srv_new_category"))==null||d.focus();return}o=u,D(o)}let i=(m=document.getElementById("edit_srv_unit"))==null?void 0:m.value;if(i==="__NEW__"){const u=(((c=document.getElementById("edit_srv_new_unit"))==null?void 0:c.value)||"").trim();if(!u){alert("Por favor escribe la unidad de medida."),(p=document.getElementById("edit_srv_new_unit"))==null||p.focus();return}i=u,M(i)}const a={name:document.getElementById("edit_srv_name").value.trim(),category:o,unit_measure:i,base_cost_usd:parseFloat(document.getElementById("edit_srv_cost").value)||0,unit_price_usd:parseFloat(document.getElementById("edit_srv_price").value)||0};if(!a.name){alert("El nombre de la partida es obligatorio.");return}if(a.unit_price_usd<a.base_cost_usd){const u=(a.unit_price_usd-a.base_cost_usd).toFixed(2);alert(`âš ï¸ PRECIO INVÁLIDO

El Precio de Venta ($${a.unit_price_usd.toFixed(2)}) no puede ser menor al Costo Base ($${a.base_cost_usd.toFixed(2)}).

Margen actual: $${u} (pérdida).

Ajusta el precio antes de guardar.`),(l=document.getElementById("edit_srv_price"))==null||l.focus();return}try{const u=await b(`${_}/services/${e}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(a)});if(u.ok)Y("modalEditService"),typeof showToastNotification=="function"?showToastNotification("Partida actualizada exitosamente","success"):typeof showToast=="function"?showToast("Partida actualizada exitosamente","success"):alert("Partida actualizada exitosamente."),D(a.category),M(a.unit_measure),await Z(),await ee(),N();else{const r=await u.json();alert("Error: "+(r.detail||JSON.stringify(r)))}}catch(u){console.error("Error al actualizar servicio:",u),alert("Error de conexión al actualizar servicio.")}}async function xt(t){if(confirm("¿Deseas eliminar permanentemente esta partida de servicio del catálogo?"))try{(await b(`${_}/services/${t}?permanent=true`,{method:"DELETE"})).ok?(await Z(),ee()):alert("Error al eliminar partida.")}catch{alert("Error de conexión al eliminar servicio.")}}async function Le(t){const e=document.getElementById("quoteClientRiskAlert"),o=document.getElementById("quoteClientRiskDetails");if(!e||!t){e&&(e.style.display="none");return}try{const i=await b(`${_}/clients/${t}/credit-risk`);if(!i.ok){e.style.display="none";return}const a=await i.json();if(a&&a.has_risk){let s=(a.bad_debts||[]).map(n=>`"¢ <strong>${n.invoice_number||"Doc"}</strong>: $${(n.amount_usd||0).toFixed(2)} USD <em>(${n.reason||"Sin motivo"})</em>`).join("<br>");o&&(o.innerHTML=`
                    Este cliente posee antecedentes de <strong>cuenta incobrable / castigada</strong> por un total de <strong>$${(a.total_bad_debt_usd||0).toFixed(2)} USD</strong>.<br>
                    <div style="margin-top: 4px; padding: 4px 6px; background: rgba(255,255,255,0.7); border-radius: 4px;">${s}</div>
                    <span style="font-size: 10px; color: #881337; margin-top: 4px; display: block;">
                        <strong>Decisión Operativa:</strong> Puede autorizar emitir esta cotización bajo supervisión comercial o cambiar a otro cliente.
                    </span>
                `),e.style.display="block",window.quoteClientRiskDismissed=!1}else e.style.display="none",window.quoteClientRiskDismissed=!0}catch(i){console.warn("Error al verificar riesgo crediticio:",i),e&&(e.style.display="none")}}function vt(t){if(!t){const e=document.getElementById("quoteClientRiskAlert");e&&(e.style.display="none");return}Le(t)}function ht(){const t=document.getElementById("quoteClientRiskAlert");t&&(t.style.display="none"),window.quoteClientRiskDismissed=!0;const e=document.getElementById("quote_client_id"),o=e?e.options[e.selectedIndex]:null;o&&console.log(`[Riesgo Crediticio] Cliente ${o.text} autorizado manualmente para cotización.`)}function Et(){const t=document.getElementById("quote_client_id");t&&(t.value="");const e=document.getElementById("quoteClientRiskAlert");e&&(e.style.display="none"),window.quoteClientRiskDismissed=!1}typeof window<"u"&&(window.addQuotationRow=J,window.cancelQuotationConversion=it,window.convertQuoteToProject=at,window.deleteService=xt,window.editQuotation=ot,window.loadQuotations=Be,window.loadServices=ee,window.onQuotationCurrencyChanged=$e,window.onServiceSelected=tt,window.onTaxTypeChanged=Ye,window.openNewQuotationModal=Ze,window.openNewServiceModal=yt,window.printQuotation=rt,window.recalcQuotationTotals=P,window.removeQuotationRow=et,window.submitCreateQuotation=nt,window.submitCreateService=wt,window.triggerPrintFromModal=st,window.populateServiceCategoriesAndUnits=N,window.checkQuoteClientCreditRisk=Le,window.onQuoteClientChanged=vt,window.confirmQuoteClientRisk=ht,window.cancelQuoteClientRisk=Et,window.goToQuotationsPage=Qe,window.changeQuotationsPageSize=Ge,window.renderQuotationsPaginated=C,window.onQuotationSearchInput=We,window.onQuotationStatusFilterChange=Je,window.onQuotationDateFilterChange=Xe,window.clearQuotationFilters=Ke,window.goToServicesPage=lt,window.changeServicesPageSize=dt,window.renderServicesPaginated=z,window.onServiceSearchInput=ct,window.onServiceCategoryFilterChange=ut,window.openEditServiceModal=_t,window.submitEditService=bt,window.onServiceCategoryChanged=pt,window.onServiceUnitChanged=mt,window.onEditServiceCategoryChanged=gt,window.onEditServiceUnitChanged=ft,window.registerCustomCategory=D,window.registerCustomUnit=M,window.getAllServiceCategories=Fe,window.getAllServiceUnits=je);function It(){var s,n;const t=parseFloat((s=document.getElementById("edit_srv_cost"))==null?void 0:s.value)||0,e=parseFloat((n=document.getElementById("edit_srv_price"))==null?void 0:n.value)||0,o=document.getElementById("editSrvMarginBadge");if(!o)return;if(!t&&!e){o.innerHTML="";return}const i=e-t,a=t>0?(i/t*100).toFixed(1):"N/A";i<0?o.innerHTML='<span style="color:#e11d48;background:#fff1f2;padding:3px 10px;border-radius:6px;border:1px solid #fecdd3;">ERROR: Precio de venta menor al costo — Perdida de $'+Math.abs(i).toFixed(2)+" ("+Math.abs(a)+"%) — Ajusta el precio</span>":i===0?o.innerHTML='<span style="color:#b45309;background:#fffbeb;padding:3px 10px;border-radius:6px;border:1px solid #fde68a;">Margen Cero: Precio igual al costo, sin ganancia</span>':o.innerHTML='<span style="color:#059669;background:#ecfdf5;padding:3px 10px;border-radius:6px;border:1px solid #a7f3d0;">OK Ganancia: +$'+i.toFixed(2)+" ("+a+"% sobre costo)</span>"}function St(){var s,n;const t=parseFloat((s=document.getElementById("srv_cost"))==null?void 0:s.value)||0,e=parseFloat((n=document.getElementById("srv_price"))==null?void 0:n.value)||0,o=document.getElementById("newSrvMarginBadge");if(!o)return;if(!t&&!e){o.innerHTML="";return}const i=e-t,a=t>0?(i/t*100).toFixed(1):"N/A";i<0?o.innerHTML='<span style="color:#e11d48;background:#fff1f2;padding:3px 10px;border-radius:6px;border:1px solid #fecdd3;">ERROR: Precio de venta menor al costo — Perdida de $'+Math.abs(i).toFixed(2)+" ("+Math.abs(a)+"%) — Ajusta el precio</span>":i===0?o.innerHTML='<span style="color:#b45309;background:#fffbeb;padding:3px 10px;border-radius:6px;border:1px solid #fde68a;">Margen Cero: Precio igual al costo, sin ganancia</span>':o.innerHTML='<span style="color:#059669;background:#ecfdf5;padding:3px 10px;border-radius:6px;border:1px solid #a7f3d0;">OK Ganancia: +$'+i.toFixed(2)+" ("+a+"% sobre costo)</span>"}window.calcEditServiceMargin=It;window.calcNewServiceMargin=St;
