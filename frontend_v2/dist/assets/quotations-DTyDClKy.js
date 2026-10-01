function we(o,e=2){const t=Math.pow(10,e);return Math.round((Number(o)||0)*t)/t}window.roundNumber=we;function ae(o){if(typeof o=="number")return isNaN(o)?0:o;if(!o)return 0;let e=String(o).trim().replace(/[$Bs€\s]/g,"");e.includes(",")&&e.includes(".")?e.indexOf(".")<e.indexOf(",")?e=e.replace(/\./g,"").replace(",","."):e=e.replace(/,/g,""):e.includes(",")&&(e=e.replace(",","."));const t=parseFloat(e);return isNaN(t)?0:t}window.parseLocalizedNumber=ae;window.parseDecimal=ae;window.API_BASE=window.location.origin+"/api/v1";var S=window.API_BASE;function Me(o,e="Documento DALOR"){let t=document.getElementById("dalor_print_iframe");t||(t=document.createElement("iframe"),t.id="dalor_print_iframe",t.style.position="fixed",t.style.right="0",t.style.bottom="0",t.style.width="0",t.style.height="0",t.style.border="0",t.style.visibility="hidden",document.body.appendChild(t));let i="";if(typeof o=="string")i=o;else if(o&&o.nodeType){const s=o.cloneNode(!0);s.querySelectorAll('.no-print, button, input[type="button"]').forEach(n=>n.remove()),i=s.innerHTML}const a=t.contentWindow.document;a.open(),a.write(`
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
    `),a.close(),setTimeout(()=>{t.contentWindow.focus(),t.contentWindow.print()},250)}function ke(o,e,t){const i=document.getElementById(o);if(i){if(!Array.isArray(e)){i.innerHTML="";return}i.innerHTML=e.map(t).join("")}}function _e(o){return Array.isArray(o)?[...o].sort((e,t)=>{const i=String(e.code||"").split(".").map(s=>parseInt(s,10)||0),a=String(t.code||"").split(".").map(s=>parseInt(s,10)||0);for(let s=0;s<Math.max(i.length,a.length);s++){const n=i[s]!==void 0?i[s]:-1,d=a[s]!==void 0?a[s]:-1;if(n!==d)return n-d}return String(e.name||"").localeCompare(String(t.name||""))}):[]}window.calcFieldBs=function(){var i,a;const o=parseFloat((i=document.getElementById("field_amount_usd"))==null?void 0:i.value)||0,e=parseFloat((a=document.getElementById("globalExchangeRateInput"))==null?void 0:a.value)||re,t=document.getElementById("field_amount_bs");t&&!isNaN(o)&&(t.value=(o*e).toFixed(2)),se()};window.calcFieldUsd=function(){var i,a;const o=parseFloat((i=document.getElementById("field_amount_bs"))==null?void 0:i.value)||0,e=parseFloat((a=document.getElementById("globalExchangeRateInput"))==null?void 0:a.value)||re,t=document.getElementById("field_amount_usd");t&&!isNaN(o)&&e>0&&(t.value=(o/e).toFixed(2)),se()};window.onFieldTaxConditionChanged=function(){se()};function se(){var p,u;const o=parseFloat((p=document.getElementById("field_amount_usd"))==null?void 0:p.value)||0,e=((u=document.getElementById("field_is_tax_exempt"))==null?void 0:u.value)==="true",t=e?o:+(o/1.16).toFixed(2),i=e?0:+(o-t).toFixed(2),a=document.getElementById("field_base_amount_usd"),s=document.getElementById("field_tax_amount_usd"),n=document.getElementById("field_base_display"),d=document.getElementById("field_tax_display");a&&(a.value=t.toFixed(2)),s&&(s.value=i.toFixed(2)),n&&(n.innerText=`$${t.toFixed(2)}`),d&&(d.innerText=`$${i.toFixed(2)}`)}window.onValTaxChanged=function(){var n,d;const o=parseFloat((n=document.getElementById("val_amount_usd"))==null?void 0:n.value)||0,e=((d=document.getElementById("val_is_tax_exempt"))==null?void 0:d.value)==="true",t=e?o:+(o/1.16).toFixed(2),i=e?0:+(o-t).toFixed(2),a=document.getElementById("val_base_usd"),s=document.getElementById("val_tax_usd");a&&(a.value=t.toFixed(2)),s&&(s.value=i.toFixed(2))};window.APP_BUILD_VERSION="2026.09.15.v93-clean-production";console.log("--> DALOR SIGO-P INITIALIZED v98.31 [MODERNO]");window.APP_BUILD_VERSION="2026.09.15.v93-clean-production";var ze=window.APP_BUILD_VERSION;localStorage.setItem("dalor_build_version",ze);let re=parseFloat(localStorage.getItem("dalor_exchange_rate"))||850;var O=window.allClients=window.allClients||[],be=window.allServices=window.allServices||[],V=window.allProjects=window.allProjects||[],Q=window.allCategories=window.allCategories||[],L=window.allAssets=window.allAssets||[],E=window.allPersonnel=window.allPersonnel||[],j=window.allMaterials=window.allMaterials||[];let Ne=[],Ue=[],He=[],Re=[],B=window.currentUser||(()=>{try{return JSON.parse(localStorage.getItem("dalor_user")||sessionStorage.getItem("dalor_user")||"null")}catch{return null}})(),Oe=window.authToken||localStorage.getItem("dalor_token")||sessionStorage.getItem("dalor_token")||null;function h(o,e={}){var t=sessionStorage.getItem("dalor_token")||localStorage.getItem("dalor_token")||window.authToken||"",i=Object.assign({},e.headers||{});return t&&(i.Authorization="Bearer "+t),e.body&&!(e.body instanceof FormData)&&!i["Content-Type"]&&(i["Content-Type"]="application/json"),e.body instanceof FormData&&delete i["Content-Type"],window.fetch(o,Object.assign({},e,{headers:i}))}let xe=0;const ve=o=>{Date.now()-xe<350||!o.target.closest(".nav-dropdown")&&!o.target.closest(".dropdown-menu")&&!o.target.closest(".mobile-submenu-card")&&(ee(),Y())};document.addEventListener("click",ve);document.addEventListener("touchend",ve);function Ee(){return window.innerWidth<=768}function Ve(o,e){o&&o.stopPropagation&&o.stopPropagation(),xe=Date.now();const t=document.getElementById(e);if(!t)return;if(Ee()){he(e);return}const i=t.classList.contains("open");ee(),i||t.classList.add("open")}function he(o){const e=document.getElementById(o);if(!e)return;const t=e.querySelector(".dropdown-btn"),i=e.querySelector(".dropdown-menu"),a=document.getElementById("mobileSubmenuSheet"),s=document.getElementById("mobileSubmenuTitle"),n=document.getElementById("mobileSubmenuItems");if(!a||!s||!n||!i)return;const d=t?t.querySelector("i"):null,p=t?t.querySelector("span"):null,u=d?d.outerHTML:'<i class="fa-solid fa-layer-group" style="color: var(--dalor-blue);"></i>',m=p?p.innerText:"Opciones del Módulo";s.innerHTML=`${u} <span>${m}</span>`,n.innerHTML="",i.querySelectorAll(".dropdown-item").forEach(c=>{const r=c.cloneNode(!0);r.onclick=g=>{g&&g.stopPropagation&&g.stopPropagation(),Y(),c.onclick&&c.onclick(g)},n.appendChild(r)}),a.classList.add("active"),document.body.style.overflow="hidden"}function Y(o){if(o&&o.target&&o.target.closest(".mobile-submenu-card")&&!o.target.classList.contains("mobile-submenu-close"))return;const e=document.getElementById("mobileSubmenuSheet");e&&e.classList.remove("active"),document.body.style.overflow=""}function ee(){document.querySelectorAll(".nav-dropdown").forEach(o=>{o.classList.remove("open")}),Y()}function le(o,e,t=null){ee(),["executive","financial","maintenance","quotations","clients","services","projects","dispatch","dashboard","resources","pwa","manual","tree","inbox","expenses-log"].forEach(n=>{const d=document.getElementById(`view-${n}`);d&&d.classList.add("hidden")});const a=document.getElementById(`view-${o}`);a&&a.classList.remove("hidden"),document.querySelectorAll(".nav-dropdown").forEach(n=>n.classList.remove("active"));const s=document.getElementById(`dropdown-${e}`);s&&s.classList.add("active");try{localStorage.setItem("dalor_active_view",o),e&&localStorage.setItem("dalor_active_category",e),sessionStorage.setItem("dalor_active_view",o),e&&sessionStorage.setItem("dalor_active_category",e)}catch{}if(o==="executive"&&typeof window.loadExecutiveDashboard=="function"&&window.loadExecutiveDashboard(),o==="financial"){let n=t||localStorage.getItem("dalor_active_subtab_financial")||sessionStorage.getItem("dalor_active_subtab_financial")||"cxc";const d=window.currentUser||window.State&&window.State.currentUser;if(d){let p={};try{p=typeof d.permissions_json=="string"?JSON.parse(d.permissions_json):d.permissions_json||d.permissions||{}}catch{}if(!((d.username||"").toLowerCase()==="director"||(d.role_name||"").toLowerCase().includes("director")||d.is_superuser===!0)){const m=p.cxc_view!==void 0||p.cxp_view!==void 0||p.bancos_view!==void 0||p.retiros_view!==void 0,l=p.cxc_view!==void 0?!!(p.cxc_view||p.cxc_pay):!m,c=p.cxp_view!==void 0?!!(p.cxp_view||p.cxp_pay):!m,r=p.bancos_view!==void 0?!!p.bancos_view:!m,g=p.retiros_view!==void 0?!!p.retiros_view:!1;n==="cxc"&&l||n==="cxp"&&c||n==="summary"&&r||n==="partners"&&g||(l?n="cxc":c?n="cxp":r?n="summary":g&&(n="partners"))}}typeof window.switchFinancialSubtab=="function"?window.switchFinancialSubtab(n):typeof window.openFinancialSubtab=="function"&&window.openFinancialSubtab(n)}if(o==="maintenance"){const n=t||localStorage.getItem("dalor_active_subtab_maintenance")||sessionStorage.getItem("dalor_active_subtab_maintenance")||"users";typeof window.switchMaintenanceSubtab=="function"?window.switchMaintenanceSubtab(n):typeof window.openMaintenanceSubtab=="function"&&window.openMaintenanceSubtab(n)}if(o==="quotations"&&typeof window.loadQuotations=="function"&&window.loadQuotations(),o==="clients"&&typeof window.loadClients=="function"&&window.loadClients(),o==="services"&&typeof window.loadServices=="function"&&window.loadServices(),o==="projects"){const n=t||localStorage.getItem("dalor_active_subtab_projects")||sessionStorage.getItem("dalor_active_subtab_projects")||"list";typeof window.switchProjectSubtab=="function"?window.switchProjectSubtab(n):typeof window.initProjectPlanningView=="function"&&window.initProjectPlanningView()}if(o==="dispatch"){const n=t||localStorage.getItem("dalor_active_subtab_dispatch")||sessionStorage.getItem("dalor_active_subtab_dispatch")||"list";typeof window.switchDispatchSubtab=="function"?window.switchDispatchSubtab(n):typeof window.initDispatchView=="function"&&window.initDispatchView()}if(o==="dashboard"&&typeof window.loadComparisonDashboard=="function"&&window.loadComparisonDashboard(),o==="resources"){const n=t||localStorage.getItem("dalor_active_subtab_resources")||sessionStorage.getItem("dalor_active_subtab_resources")||"dashboard";typeof window.switchResourceSubtab=="function"?window.switchResourceSubtab(n):typeof window.openResourceSubtab=="function"&&window.openResourceSubtab(n)}o==="inbox"&&typeof window.loadPendingExpensesInbox=="function"&&window.loadPendingExpensesInbox(),o==="tree"&&typeof window.loadCategoriesTree=="function"&&window.loadCategoriesTree(),o==="expenses-log"&&typeof window.loadExpensesLog=="function"&&window.loadExpensesLog(),window.onViewSwitched&&window.onViewSwitched(o)}window.switchView=le;window.appSwitchView=le;function A({containerId:o,totalItems:e=0,currentPage:t=1,pageSize:i=10,onPageChange:a="",onPageSizeChange:s="",itemLabel:n="registro(s)",pageSizeOptions:d=[10,15,25,50,100],allowAll:p=!0}){const u=document.getElementById(o);if(!u)return{startIndex:0,endIndex:0,totalPages:1,currentPage:1};const m=i===1e3||i===9999?e||1:i||15,l=Math.max(1,Math.ceil(e/m));let c=Math.max(1,Math.min(t,l));const r=(c-1)*m,g=Math.min(r+m,e);if(e<=Math.min(...d)&&l<=1)return u.innerHTML=`
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 11.5px; color: #64748b; margin-top: 8px;">
                <span>Mostrando <b>${e}</b> ${n}</span>
                ${s?`
                <div style="display: flex; align-items: center; gap: 6px;">
                    <span>Mostrar:</span>
                    <select onchange="${s}(this.value)" style="padding: 2px 6px; font-size: 11px; border: 1px solid #cbd5e1; border-radius: 4px; background: white; font-weight: 700; cursor: pointer;">
                        ${d.map(w=>`<option value="${w}" ${i===w?"selected":""}>${w}</option>`).join("")}
                        ${p?`<option value="1000" ${i===1e3?"selected":""}>Todos</option>`:""}
                    </select>
                </div>`:""}
            </div>
        `,{startIndex:r,endIndex:g,totalPages:l,currentPage:c};let f="",y=Math.max(1,c-2),x=Math.min(l,c+2);y>1&&(f+=`<button type="button" onclick="${a}(1)" class="btn-secondary" style="padding: 4px 9px; font-size: 11px; border-radius: 5px;">1</button>`,y>2&&(f+='<span style="padding: 0 4px; color: #94a3b8;">...</span>'));for(let w=y;w<=x;w++)w===c?f+=`<button type="button" class="btn-primary" style="padding: 4px 10px; font-size: 11px; font-weight: 800; border-radius: 5px; background: var(--dalor-navy, #0f172a); color: white;">${w}</button>`:f+=`<button type="button" onclick="${a}(${w})" class="btn-secondary" style="padding: 4px 9px; font-size: 11px; border-radius: 5px;">${w}</button>`;return x<l&&(x<l-1&&(f+='<span style="padding: 0 4px; color: #94a3b8;">...</span>'),f+=`<button type="button" onclick="${a}(${l})" class="btn-secondary" style="padding: 4px 9px; font-size: 11px; border-radius: 5px;">${l}</button>`),u.innerHTML=`
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 12px; color: #475569; flex-wrap: wrap; gap: 10px; box-shadow: 0 1px 2px rgba(0,0,0,0.04); margin-top: 8px;">
            <div style="font-weight: 600;">
                Mostrando <b style="color: var(--dalor-navy, #0f172a);">${e===0?0:r+1} - ${g}</b> de <b style="color: var(--dalor-navy, #0f172a);">${e}</b> ${n}
            </div>

            <div style="display: flex; align-items: center; gap: 5px;">
                <button type="button" onclick="${a}(1)" class="btn-secondary" style="padding: 4px 8px; font-size: 11px; border-radius: 5px;" ${c===1?'disabled style="opacity:0.4; cursor:not-allowed;"':""} title="Primera página">
                    <i class="fa-solid fa-angles-left"></i>
                </button>
                <button type="button" onclick="${a}(${c-1})" class="btn-secondary" style="padding: 4px 9px; font-size: 11px; border-radius: 5px;" ${c===1?'disabled style="opacity:0.4; cursor:not-allowed;"':""} title="Página anterior">
                    <i class="fa-solid fa-chevron-left"></i> Anterior
                </button>

                <div style="display: flex; align-items: center; gap: 4px;">
                    ${f}
                </div>

                <button type="button" onclick="${a}(${c+1})" class="btn-secondary" style="padding: 4px 9px; font-size: 11px; border-radius: 5px;" ${c===l?'disabled style="opacity:0.4; cursor:not-allowed;"':""} title="Página siguiente">
                    Siguiente <i class="fa-solid fa-chevron-right"></i>
                </button>
                <button type="button" onclick="${a}(${l})" class="btn-secondary" style="padding: 4px 8px; font-size: 11px; border-radius: 5px;" ${c===l?'disabled style="opacity:0.4; cursor:not-allowed;"':""} title="Última página">
                    <i class="fa-solid fa-angles-right"></i>
                </button>
            </div>

            ${s?`
            <div style="display: flex; align-items: center; gap: 6px;">
                <span style="font-size: 11.5px; color: #64748b;">Por página:</span>
                <select onchange="${s}(this.value)" style="padding: 3px 8px; font-size: 11.5px; border: 1px solid #cbd5e1; border-radius: 5px; background: white; font-weight: 700; color: var(--dalor-navy, #0f172a); cursor: pointer;">
                    ${d.map(w=>`<option value="${w}" ${i===w?"selected":""}>${w}</option>`).join("")}
                    ${p?`<option value="1000" ${i===1e3?"selected":""}>Ver todos</option>`:""}
                </select>
            </div>`:""}
        </div>
    `,{startIndex:r,endIndex:g,totalPages:l,currentPage:c}}window.renderPaginationControls=A;async function te(){try{await h(`${S}/maintenance/sync-dalor-catalog`,{method:"POST"})}catch{}try{const[o,e,t,i,a,s,n]=await Promise.all([h(`${S}/clients/`),h(`${S}/services/`),h(`${S}/projects/`),h(`${S}/expenses/categories`),h(`${S}/assets/`),h(`${S}/personnel/`),h(`${S}/materials/`)]),d=o.ok?await o.json():[];window.allClients=O=Array.isArray(d)?d:[];const p=e.ok?await e.json():[];window.allServices=be=Array.isArray(p)?p:[];const u=t.ok?await t.json():[];window.allProjects=V=Array.isArray(u)?u:[];const m=i.ok?await i.json():[];window.allCategories=Q=Array.isArray(m)?m:[];const l=a.ok?await a.json():[];window.allAssets=L=Array.isArray(l)?l:[];const c=s.ok?await s.json():[];window.allPersonnel=E=Array.isArray(c)?c:[];const r=n.ok?await n.json():{};window.allMaterials=j=Array.isArray(r.materials)?r.materials:Array.isArray(r)?r:[],G(),populatePlanDropdownSelectors(),pe()}catch(o){console.error("Error al cargar datos maestros:",o)}}function G(){const o=window.allClients&&window.allClients.length>0?window.allClients:Array.isArray(O)?O:[],e=window.allProjects&&window.allProjects.length>0?window.allProjects:Array.isArray(V)?V:[],t=window.allCategories&&window.allCategories.length>0?window.allCategories:Array.isArray(Q)?Q:[],i=window.allAssets&&window.allAssets.length>0?window.allAssets:Array.isArray(L)?L:[];window.allMaterials&&window.allMaterials.length>0?window.allMaterials:Array.isArray(j),window.allPersonnel&&window.allPersonnel.length>0?window.allPersonnel:Array.isArray(E);const a=(r,g)=>{const f=document.getElementById(r);if(!f)return;const y=f.value;f.innerHTML=g,y&&(f.value=y)},s='<option value="">-- Seleccione Cliente --</option>'+o.map(r=>`<option value="${r.id}">[${r.code}] ${r.name} (${r.rif||"Sin RIF"})</option>`).join("");if(a("quote_client_id",s),a("new_proj_client_id",s),a("cxc_client_id",s),a("rcp_client_id",s),o.length===1){const r=document.getElementById("quote_client_id");r&&!r.value&&(r.value=String(o[0].id));const g=document.getElementById("new_proj_client_id");g&&!g.value&&(g.value=String(o[0].id))}const n='<option value="">-- Gasto General Sede (Sin Proyecto) --</option>'+e.map(r=>`<option value="${r.id}">${r.code} - ${r.name}</option>`).join("");document.getElementById("field_project_id")&&(document.getElementById("field_project_id").innerHTML=n),document.getElementById("manual_project_id")&&(document.getElementById("manual_project_id").innerHTML=n),document.getElementById("cxc_project_id")&&(document.getElementById("cxc_project_id").innerHTML=n),document.getElementById("cxp_project_id")&&(document.getElementById("cxp_project_id").innerHTML=n),document.getElementById("rcp_project_id")&&(document.getElementById("rcp_project_id").innerHTML='<option value="">-- Sin Proyecto Específico (Anticipo a Cuenta) --</option>'),document.getElementById("mc_project_id")&&(document.getElementById("mc_project_id").innerHTML='<option value="">-- Consumo Interno Taller Central (Gasto Sede) --</option>'+e.map(r=>`<option value="${r.id}">${r.code} - ${r.name}</option>`).join("")),document.getElementById("modal_target_project_id")&&(document.getElementById("modal_target_project_id").innerHTML=e.map(r=>`<option value="${r.id}">${r.code} - ${r.name} (${r.location})</option>`).join("")),document.getElementById("tg_project_id")&&(document.getElementById("tg_project_id").innerHTML='<option value="">-- Seleccione Proyecto Aprobado --</option>'+e.map(r=>`<option value="${r.id}" data-location="${r.location}">${r.code} - ${r.name} (${r.location})</option>`).join(""));const p=_e(t).map(r=>`<option value="${r.id}">[${r.code}] ${r.name}</option>`).join("");document.getElementById("field_category_id")&&(document.getElementById("field_category_id").innerHTML=p),document.getElementById("manual_category_id")&&(document.getElementById("manual_category_id").innerHTML=p);const u='<option value="">-- No Aplica --</option>'+i.map(r=>`<option value="${r.id}">${r.asset_code} - ${r.name}</option>`).join("");document.getElementById("field_asset_id")&&(document.getElementById("field_asset_id").innerHTML=u);const l='<option value="">-- Seleccione Vehículo de Transporte --</option>'+L.filter(r=>r.asset_type==="vehiculo"||r.asset_type==="camioneta").map(r=>`<option value="${r.id}">[${r.asset_code}] ${r.name} (Placa: ${r.license_plate||"S/P"})</option>`).join("");document.getElementById("tg_vehicle_id")&&(document.getElementById("tg_vehicle_id").innerHTML=l);const c='<option value="">-- Seleccione Material --</option>'+j.map(r=>`<option value="${r.id}" data-cost="${r.unit_cost_usd}" data-stock="${r.stock_quantity}" data-unit="${r.unit_measure}">[${r.code}] ${r.name} (${r.stock_quantity} ${r.unit_measure} disp. - $${r.unit_cost_usd}/u)</option>`).join("");if(document.getElementById("me_material_id")&&(document.getElementById("me_material_id").innerHTML=c),document.getElementById("mc_material_id")&&(document.getElementById("mc_material_id").innerHTML=c),E&&E.length>0){const r=E.map(g=>`<option value="${g.id}">[${g.code}] ${g.full_name}${g.role_title?" - "+g.role_title:""}</option>`).join("");document.getElementById("field_reported_by")&&(document.getElementById("field_reported_by").innerHTML=r),document.getElementById("manual_reported_by")&&(document.getElementById("manual_reported_by").innerHTML=r)}if(B&&E&&E.length>0){const r=E.find(g=>g.full_name&&B.username&&g.full_name.toLowerCase().includes(B.username.toLowerCase())||g.role_title&&B.role&&g.role_title.toLowerCase().includes(B.role.toLowerCase()))||E[0];r&&(document.getElementById("field_reported_by")&&(document.getElementById("field_reported_by").value=r.id),document.getElementById("manual_reported_by")&&(document.getElementById("manual_reported_by").value=r.id))}typeof window.populateServiceCategoriesAndUnits=="function"&&window.populateServiceCategoriesAndUnits()}function de(o){o==="modalNewQuotation"&&(o="modalQuotation");const e=document.getElementById(o);e&&(e.classList.remove("hidden"),e.style.removeProperty("display"));const t=document.getElementById("btnFloatingLogout");t&&t.style.setProperty("display","none","important")}function oe(o){const e=document.getElementById(o);if(e&&e.classList.add("hidden"),document.querySelectorAll(".modal-overlay:not(.hidden), .modal:not(.hidden)").length===0){const i=document.getElementById("btnFloatingLogout");i&&i.style.removeProperty("display")}}let P=localStorage.getItem("dalor_sound_alerts")!=="false",ge=new Set,fe=!0;function Qe(){P=!P,localStorage.setItem("dalor_sound_alerts",P?"true":"false"),ce(),P&&ue()}function ce(){const o=document.getElementById("iconSoundToggle"),e=document.getElementById("textSoundToggle"),t=document.getElementById("iconSoundToggleInbox"),i=document.getElementById("textSoundToggleInbox"),a=document.getElementById("btnSoundToggle");o&&e&&(P?(o.className="fa-solid fa-bell",e.innerText="Sonido: ON",a&&(a.style.color="#fbbf24",a.style.borderColor="#fbbf24")):(o.className="fa-solid fa-bell-slash",e.innerText="Sonido: OFF",a&&(a.style.color="#94a3b8",a.style.borderColor="#334155"))),t&&i&&(P?(t.className="fa-solid fa-bell",t.style.color="#059669",i.innerText="Alertas Sonoras: ON"):(t.className="fa-solid fa-bell-slash",t.style.color="#94a3b8",i.innerText="Alertas Sonoras: OFF"))}function ue(){if(P)try{const o=window.AudioContext||window.webkitAudioContext;if(!o)return;const e=new o,t=e.currentTime,i=e.createOscillator(),a=e.createGain();i.type="sine",i.frequency.setValueAtTime(659.25,t),a.gain.setValueAtTime(.25,t),a.gain.exponentialRampToValueAtTime(.001,t+.35),i.connect(a),a.connect(e.destination),i.start(t),i.stop(t+.35);const s=e.createOscillator(),n=e.createGain();s.type="sine",s.frequency.setValueAtTime(880,t+.12),n.gain.setValueAtTime(.3,t+.12),n.gain.exponentialRampToValueAtTime(.001,t+.55),s.connect(n),n.connect(e.destination),s.start(t+.12),s.stop(t+.55)}catch(o){console.warn("Audio alert error:",o)}}function Ie(o){const e=document.getElementById("toastNotificationContainer");if(!e)return;const t=document.createElement("div");t.className="toast-card-live",t.style.cssText=`

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

    `;const i=o.reported_by||"Personal de Campo",a=Number(o.amount_usd||0).toFixed(2),s=o.project_name||"Obra General",n=o.supplier_vendor||"Comercio General";t.innerHTML=`

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

    `,e.appendChild(t),setTimeout(()=>{t.parentElement&&(t.style.opacity="0",t.style.transform="translateX(60px)",setTimeout(()=>t.remove(),300))},9e3)}async function pe(){try{if(!B)return;const o=(B.username||"").toLowerCase(),e=(B.role_name||"").toLowerCase();if(o==="campo"||e.includes("supervisor")||e.includes("campo")){const m=document.getElementById("badgeInboxCount"),l=document.getElementById("badgeGastosDropdown");m&&(m.style.display="none"),l&&(l.style.display="none");return}const i=await h(`${S}/expenses/inbox/pending`);if(!i.ok)return;const a=await i.json(),s=Array.isArray(a)?a:[],n=s.length,d=document.getElementById("badgeInboxCount");d&&(d.innerText=n,d.style.display=n>0?"inline-block":"none");const p=document.getElementById("badgeGastosDropdown");p&&(p.innerText=n,p.style.display=n>0?"inline-block":"none");const u=new Set(s.map(m=>m.id));if(!fe){const m=s.filter(l=>!ge.has(l.id));if(m.length>0){ue(),m.forEach(c=>Ie(c));const l=document.getElementById("view-inbox");l&&!l.classList.contains("hidden")&&loadPendingExpensesInbox()}}ge=u,fe=!1}catch{}}setInterval(pe,5e3);ce();setInterval(()=>{h("/healthz").catch(()=>{})},3e5);typeof window<"u"&&(window.allClients=O,window.allServices=be,window.allProjects=V,window.allCategories=Q,window.allAssets=L,window.allPersonnel=E,window.allMaterials=j,window.selectedPersonnelIds=Ne,window.selectedVehicleIds=Ue,window.selectedToolIds=He,window.selectedMaterialIds=Re,window.EXCHANGE_RATE=re,window.currentUser=window.currentUser||B,window.authToken=window.authToken||Oe,window.closeAllDropdowns=ee,window.closeMobileSubmenu=Y,window.closeModal=oe,window.isMobileViewport=Ee,window.loadInitialMasterData=te,window.openMobileSubmenu=he,window.openModal=de,window.parseLocalizedNumber=ae,window.playNotificationChime=ue,window.populateSelect=ke,window.populateSelectDropdowns=G,window.roundNumber=we,window.showInboxToastNotification=Ie,window.renderPaginationControls=A,window.sortCategoriesNumerically=_e,window.switchView=le,window.toggleDropdown=Ve,window.toggleSoundAlerts=Qe,window.printElementHtml=Me,window.updatePendingInboxBadge=pe,window.updateSoundToggleUI=ce);var _=window.API_BASE||window.location.origin+"/api/v1",I=window.allClients=window.allClients||[],v=window.allServices=window.allServices||[],ye=window.allProjects=window.allProjects||[];window.allCategories=window.allCategories||[];window.allAssets=window.allAssets||[];window.allPersonnel=window.allPersonnel||[];window.allMaterials=window.allMaterials||[];window.selectedPersonnelIds=window.selectedPersonnelIds||[];window.selectedVehicleIds=window.selectedVehicleIds||[];window.selectedToolIds=window.selectedToolIds||[];window.selectedMaterialIds=window.selectedMaterialIds||[];var D=window.EXCHANGE_RATE=window.EXCHANGE_RATE||850;window.BCV_DATA=window.BCV_DATA||{rate:850,source:"BCV Oficial"};window.authToken=window.authToken||localStorage.getItem("dalor_token")||null;const Se=["Fabricación Metalmecánica","Montaje e Instalación en Sitio","Mantenimiento Industrial & Paradas","Soldadura Especializada & Pailería","Mecanizado & Torno","Arenado y Pintura Industrial","Obras Civiles & Eléctricas Asociadas"];typeof window<"u"&&(window.OFFICIAL_DALOR_APU_CATEGORIES=Se);function b(o,e={}){var t=sessionStorage.getItem("dalor_token")||localStorage.getItem("dalor_token")||window.authToken||"",i=Object.assign({},e.headers||{});return t&&(i.Authorization="Bearer "+t),e.body&&!(e.body instanceof FormData)&&!i["Content-Type"]&&(i["Content-Type"]="application/json"),e.body instanceof FormData&&delete i["Content-Type"],window.fetch(o,Object.assign({},e,{headers:i}))}let Be=[],$=1,$e=10,W="",J="",X="",K="";function Ge(o){$=o,C();const e=document.getElementById("quotationsTableBody");e&&e.scrollIntoView({behavior:"smooth",block:"nearest"})}function We(o){$e=parseInt(o)||10,$=1,C()}function Je(o){W=(o||"").trim().toLowerCase(),$=1,C()}function Xe(o){J=(o||"").trim().toLowerCase(),$=1,C()}function Ke(){var o,e;X=((o=document.getElementById("quoteFilterDateFrom"))==null?void 0:o.value)||"",K=((e=document.getElementById("quoteFilterDateTo"))==null?void 0:e.value)||"",$=1,C()}function Ze(){W="",J="",X="",K="";const o=document.getElementById("quoteSearchInput");o&&(o.value="");const e=document.getElementById("quoteStatusFilter");e&&(e.value="");const t=document.getElementById("quoteFilterDateFrom");t&&(t.value="");const i=document.getElementById("quoteFilterDateTo");i&&(i.value=""),$=1,C()}function C(){const o=document.getElementById("quotationsTableBody");if(!o)return;let e=Be||[];if(W){const n=W;e=e.filter(d=>d.quote_number&&d.quote_number.toLowerCase().includes(n)||d.client&&d.client.name&&d.client.name.toLowerCase().includes(n)||d.project_title&&d.project_title.toLowerCase().includes(n))}if(J&&(e=e.filter(n=>(n.status||"").toLowerCase()===J)),X&&(e=e.filter(n=>n.created_at&&n.created_at.substring(0,10)>=X)),K&&(e=e.filter(n=>n.created_at&&n.created_at.substring(0,10)<=K)),e.length===0){o.innerHTML='<tr><td colspan="8" style="text-align: center; padding: 20px; color: #94a3b8;">No se encontraron cotizaciones con los criterios seleccionados.</td></tr>';const n=document.getElementById("quotationsPaginationContainer");n&&(n.innerHTML="");return}const t=typeof window.renderPaginationControls=="function"?window.renderPaginationControls:typeof A=="function"?A:()=>({startIndex:0,endIndex:e.length}),{startIndex:i,endIndex:a}=t({containerId:"quotationsPaginationContainer",totalItems:e.length,currentPage:$,pageSize:$e,onPageChange:"goToQuotationsPage",onPageSizeChange:"changeQuotationsPageSize",itemLabel:"cotización(es)",pageSizeOptions:[10,20,50,100]}),s=e.slice(i,a);o.innerHTML=s.map(n=>{const d=n.client?n.client.name:"Cliente General",p=n.status==="aprobado",u=Number(n.subtotal_usd||0),m=Number(n.tax_usd||0),l=Number(n.total_usd||0);return`
        <tr>
            <td style="font-weight: 800; color: var(--dalor-blue);">${n.quote_number}</td>
            <td style="font-weight: 600;">${d}</td>
            <td>${n.project_title}</td>
            <td style="font-weight: 700;">$${u.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
            <td style="color: ${m===0?"#10b981":"#64748b"}; font-weight: 700;">
                ${m===0?"EXENTO (0%)":`$${m.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`}
            </td>
            <td style="font-weight: 800; color: var(--dalor-navy);">$${l.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
            <td>
                <span style="font-size: 10px; padding: 3px 8px; border-radius: 9999px; font-weight: 800; ${p?"background: #dcfce7; color: #166534;":"background: #f1f5f9; color: #475569;"}">
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
                ${p?'<span style="font-size: 11px; color: #059669; font-weight: bold; margin-left: 6px;">Obra Activa</span>':`
                    <button onclick="convertQuoteToProject(${n.id})" class="btn-primary" style="padding: 4px 8px; font-size: 11px; margin-left: 4px; background: #059669;" title="Aprobar y Convertir en Proyecto">
                        <i class="fa-solid fa-check"></i> Convertir en Proyecto
                    </button>
                `}
            </td>
        </tr>`}).join("")}async function Ce(){const o=document.getElementById("quotationsTableBody");o.innerHTML='<tr><td colspan="8" style="text-align: center; padding: 20px; color: #94a3b8;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando cotizaciones...</td></tr>';try{const[e,t,i]=await Promise.all([b(`${_}/quotations/`),b(`${_}/clients/`),b(`${_}/services/`)]);if(t.ok){const s=await t.json();I=Array.isArray(s)?s:[]}if(i.ok){const s=await i.json();v=Array.isArray(s)?s:[]}try{typeof window.populateSelectDropdowns=="function"?window.populateSelectDropdowns():typeof G=="function"&&G()}catch(s){console.warn("Aviso al poblar dropdowns de cotizaciones:",s)}if(!e.ok)throw new Error("Error HTTP "+e.status);const a=await e.json();Be=Array.isArray(a)?a:[],$=1,C()}catch(e){console.error("Error al cargar cotizaciones:",e),o.innerHTML=`<tr><td colspan="8" style="text-align: center; color: #e11d48; padding: 20px;">Error al cargar cotizaciones: ${e.message||"Error de conexión"}</td></tr>`}}async function Ye(){var d;quoteRowsCount=0;const o=document.getElementById("edit_quotation_id");o&&(o.value="");const e=document.getElementById("modalQuotationTitle");e&&(e.innerHTML='<i class="fa-solid fa-calculator" style="color: var(--dalor-blue);"></i> Armar Presupuesto / Cotización Formal (APU)');const t=document.getElementById("btnSubmitQuotation");t&&(t.innerHTML='<i class="fa-solid fa-floppy-disk"></i> Guardar Presupuesto');const i=document.getElementById("quoteForm");i&&i.reset(),document.getElementById("quote_coletilla_divisas")&&(document.getElementById("quote_coletilla_divisas").checked=!0),document.getElementById("quote_coletilla_modalidad")&&(document.getElementById("quote_coletilla_modalidad").checked=!0),document.getElementById("quote_notes")&&(document.getElementById("quote_notes").value=""),document.getElementById("quote_execution_time")&&(document.getElementById("quote_execution_time").value="15 días hábiles");const a=document.getElementById("quoteClientRiskAlert");a&&(a.style.display="none");const s=document.getElementById("quoteItemsList");s&&(s.innerHTML="");try{if((window.allClients&&window.allClients.length>0?window.allClients:I||[]).length===0){const u=window.authToken||localStorage.getItem("dalor_token")||null,m=u?{Authorization:`Bearer ${u}`}:{},l=await b(`${_}/clients/`,{headers:m});if(l.ok){const c=await l.json();I=window.allClients=Array.isArray(c)?c:[]}}if(!window._servicesLoaded){const u=window.authToken||localStorage.getItem("dalor_token")||null,m=u?{Authorization:`Bearer ${u}`}:{},l=await b(`${_}/services/`,{headers:m});if(l.ok){const c=await l.json();v=window.allServices=Array.isArray(c)?c:[],window._servicesLoaded=!0}}}catch(p){console.warn("Error cargando clientes o servicios para cotización:",p)}typeof window.populateSelectDropdowns=="function"&&window.populateSelectDropdowns();const n=document.getElementById("quote_client_id");if(n){const p=window.allClients&&window.allClients.length>0?window.allClients:I||[];if(p.length>0){let u='<option value="">-- Seleccione Cliente --</option>'+p.map(m=>`<option value="${m.id}">[${m.code}] ${m.name} (${m.rif||"Sin RIF"})</option>`).join("");n.innerHTML=u,p.length===1&&(n.value=String(p[0].id))}}document.getElementById("quote_tax_type")&&(document.getElementById("quote_tax_type").value="16"),document.getElementById("quote_tax_percent")&&(document.getElementById("quote_tax_percent").value="16"),document.getElementById("quote_execution_time")&&(document.getElementById("quote_execution_time").value=""),document.getElementById("quote_currency")&&(document.getElementById("quote_currency").value="USD"),document.getElementById("quote_coletilla_divisas")&&(document.getElementById("quote_coletilla_divisas").checked=!1),document.getElementById("quote_coletilla_modalidad")&&(document.getElementById("quote_coletilla_modalidad").checked=!1),document.getElementById("quote_notes")&&(document.getElementById("quote_notes").value=""),Z(),q(),Te(),typeof window.openModal=="function"?window.openModal("modalQuotation"):(d=document.getElementById("modalQuotation"))==null||d.classList.remove("hidden")}function et(){const o=document.getElementById("quote_tax_type").value;document.getElementById("quote_tax_percent").value=o,q()}function Z(o=null){quoteRowsCount++;const e=document.getElementById("quoteItemsList");if(!e)return;const t=`quote_row_${quoteRowsCount}`,a=`<option value="">${v&&v.length>0?"-- Partida del Catálogo --":"-- Catálogo en blanco (escriba partida manual) --"}</option>`+(v||[]).map(l=>{const c=o&&(String(o.service_id)===String(l.id)||String(o.item_code)===String(l.code));return`<option value="${l.id}" data-code="${l.code}" data-unit="${l.unit_measure}" data-price="${l.unit_price_usd}" ${c?"selected":""}>[${l.code}] ${l.name} ($${l.unit_price_usd}/${l.unit_measure})</option>`}).join(""),s=o?(o.description||"").replaceAll('"',"&quot;"):"",n=o&&o.unit_measure||"Global",d=o&&o.quantity!==void 0?o.quantity:1,p=o&&o.unit_price_usd!==void 0?o.unit_price_usd:0,u=(d*p).toFixed(2),m=document.createElement("div");m.id=t,m.style.cssText="display: grid; grid-template-columns: 4fr 1fr 1fr 1fr 1fr 30px; gap: 6px; background: white; padding: 8px; border-radius: 8px; border: 1px solid #cbd5e1; align-items: center;",m.innerHTML=`

        <div>

            <select class="form-select q-srv-select" style="font-size: 11px; padding: 5px;" onchange="onServiceSelected('${t}')">

                ${a}

            </select>

            <input type="text" class="form-input q-desc" placeholder="Descripción detallada de la partida / APU" value="${s}" autocomplete="off" style="font-size: 11px; padding: 4px 6px; margin-top: 4px;" required>

        </div>

        <div>
            <input type="text" class="form-input q-unit" list="datalist_units" placeholder="Und / Medida" value="${n}" style="font-size: 11px; padding: 5px; font-weight: 700; color: #1e293b;" title="Selecciona o escribe cualquier unidad de medida (ej: Ton, Kg, m, Pulg-Diam, HH, Und)">
            <datalist id="datalist_units">
                ${Array.from(new Set(["Global","Und","Pza","m","m²","m³","ml","Kg","Ton","Litro","Galón","Horas","HH","Días","Punto","Juego","Pulg-Diam",...(v||[]).map(l=>(l.unit_measure||"").trim()).filter(Boolean)])).map(l=>`<option value="${l}">`).join("")}
            </datalist>
        </div>

        <div>
            <input type="text" inputmode="decimal" class="form-input q-qty" placeholder="Cant" value="${d}" oninput="recalcQuotationTotals()" autocomplete="off" style="font-size: 11px; padding: 5px; font-weight: bold;" required>
        </div>

        <div>
            <input type="text" inputmode="decimal" class="form-input q-price" placeholder="P. Unit ($)" value="${p}" oninput="recalcQuotationTotals()" autocomplete="off" style="font-size: 11px; padding: 5px; font-weight: bold; color: var(--dalor-blue);" required>
        </div>

        <div>
            <input type="text" class="form-input q-total" placeholder="Total ($)" value="$${u}" style="font-size: 11px; padding: 5px; font-weight: 800;" readonly>
        </div>

        <div style="text-align: center;">

            <button type="button" onclick="removeQuotationRow('${t}')" style="background: none; border: none; color: #ef4444; font-size: 16px; cursor: pointer;">&times;</button>

        </div>

    `,e.appendChild(m)}function tt(o){const e=document.getElementById(o);e&&e.remove(),q()}function ot(o){const e=document.getElementById(o);if(!e)return;const t=e.querySelector(".q-srv-select"),i=t?t.options[t.selectedIndex]:null;i&&i.value&&(e.querySelector(".q-desc").value=i.text.replace(/\[.*?\]\s*/,"").split(" ($")[0],e.querySelector(".q-unit").value=i.getAttribute("data-unit")||"Global",e.querySelector(".q-price").value=parseFloat(i.getAttribute("data-price")||0).toFixed(2)),q()}function q(){var l;const o=document.querySelectorAll("#quoteItemsList > div");let e=0;o.forEach(c=>{const r=c.querySelector(".q-qty"),g=c.querySelector(".q-price"),f=c.querySelector(".q-total"),y=parseLocalizedNumber(r?r.value:0),x=parseLocalizedNumber(g?g.value:0),w=y*x;f&&(f.value=`$${w.toFixed(2)}`),e+=w});const t=parseFloat(document.getElementById("quote_tax_percent")?document.getElementById("quote_tax_percent").value:16)||0,i=e*(t/100),a=e+i,s=document.getElementById("quote_subtotal_display"),n=document.getElementById("quote_tax_display"),d=document.getElementById("quote_total_display"),p=(((l=document.getElementById("quote_currency"))==null?void 0:l.value)||"USD").toUpperCase(),u=document.getElementById("quote_bcv_banner_box");u&&(u.style.display=p==="VES"?"block":"none");const m=typeof D<"u"?D:850;if(p==="VES"){const c=e*m,r=i*m,g=a*m;s&&(s.innerHTML=`$${e.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}<br><span style="font-size:11px; color:#fde047;">Bs. ${c.toLocaleString("es-VE",{minimumFractionDigits:2,maximumFractionDigits:2})}</span>`),n&&(n.innerHTML=t===0?"EXENTO (0%)":`$${i.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}<br><span style="font-size:11px; color:#fde047;">Bs. ${r.toLocaleString("es-VE",{minimumFractionDigits:2,maximumFractionDigits:2})}</span>`),d&&(d.innerHTML=`$${a.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}<br><span style="font-size:12px; color:#fde047;">Bs. ${g.toLocaleString("es-VE",{minimumFractionDigits:2,maximumFractionDigits:2})}</span>`)}else s&&(s.innerText=`$${e.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`),n&&(n.innerText=t===0?"EXENTO (0%)":`$${i.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`),d&&(d.innerText=`$${a.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`)}function Te(){q()}async function nt(o){var e;try{const t=window.authToken||localStorage.getItem("dalor_token")||null,i=t?{Authorization:`Bearer ${t}`}:{};if((window.allClients&&window.allClients.length>0?window.allClients:I||[]).length===0){const c=await b(`${_}/clients/`,{headers:i});if(c.ok){const r=await c.json();I=window.allClients=Array.isArray(r)?r:[]}}if(!window._servicesLoaded){const c=await b(`${_}/services/`,{headers:i});if(c.ok){const r=await c.json();v=window.allServices=Array.isArray(r)?r:[],window._servicesLoaded=!0}}typeof window.populateSelectDropdowns=="function"&&window.populateSelectDropdowns();const s=await b(`${_}/quotations/${o}`,{headers:i});if(!s.ok)throw new Error("No se pudo cargar la cotización para edición.");const n=await s.json(),d=document.getElementById("edit_quotation_id");d&&(d.value=n.id);const p=document.getElementById("modalQuotationTitle");p&&(p.innerHTML=`<i class="fa-solid fa-pen-to-square" style="color: var(--dalor-gold);"></i> Re-editar Presupuesto / Cotización [${n.quote_number}]`);const u=document.getElementById("btnSubmitQuotation");u&&(u.innerHTML='<i class="fa-solid fa-floppy-disk"></i> Guardar Cambios de Presupuesto');const m=document.getElementById("quote_client_id");if(m){const c=window.allClients&&window.allClients.length>0?window.allClients:I||[];if(c.length>0){let r='<option value="">-- Seleccione Cliente --</option>'+c.map(g=>`<option value="${g.id}">[${g.code}] ${g.name} (${g.rif||"Sin RIF"})</option>`).join("");m.innerHTML=r}n.client_id&&(m.value=String(n.client_id))}document.getElementById("quote_title")&&(document.getElementById("quote_title").value=n.project_title||""),document.getElementById("quote_location")&&(document.getElementById("quote_location").value=n.location||"Sede Central"),document.getElementById("quote_execution_time")&&(document.getElementById("quote_execution_time").value=n.execution_time||"15 días hábiles"),document.getElementById("quote_validity")&&(document.getElementById("quote_validity").value=n.validity_days||15),document.getElementById("quote_currency")&&(document.getElementById("quote_currency").value=n.currency||"USD"),document.getElementById("quote_tax_percent")&&(document.getElementById("quote_tax_percent").value=n.tax_percent!==void 0&&n.tax_percent!==null?n.tax_percent:n.tax_usd>0?16:0),document.getElementById("quote_notes")&&(document.getElementById("quote_notes").value=n.notes||""),document.getElementById("quote_coletilla_divisas")&&(document.getElementById("quote_coletilla_divisas").checked=n.coletilla_divisas!==!1),document.getElementById("quote_coletilla_modalidad")&&(document.getElementById("quote_coletilla_modalidad").checked=n.coletilla_modalidad!==!1);const l=document.getElementById("quoteItemsList");l&&(l.innerHTML="",quoteRowsCount=0,n.items&&n.items.length>0?n.items.forEach(c=>Z(c)):Z()),q(),typeof window.openModal=="function"?window.openModal("modalQuotation"):(e=document.getElementById("modalQuotation"))==null||e.classList.remove("hidden")}catch(t){console.error("Error al re-editar presupuesto:",t),alert("Error cargando presupuesto: "+t.message)}}async function it(o){var u,m;o&&o.preventDefault&&o.preventDefault();const e=document.getElementById("quote_client_id"),t=e?parseInt(e.value):null;if(!t){alert("Por favor selecciona un cliente de la lista.");return}const i=document.querySelectorAll("#quoteItemsList > div");let a=[];if(i.forEach(l=>{const c=l.querySelector(".q-srv-select"),r=c&&c.value?parseInt(c.value):null,g=c?c.options[c.selectedIndex]:null,f=g?g.getAttribute("data-code"):null,y=l.querySelector(".q-desc")?l.querySelector(".q-desc").value:"",x=l.querySelector(".q-unit")?l.querySelector(".q-unit").value:"Global",w=l.querySelector(".q-qty")?l.querySelector(".q-qty").value:"1",T=l.querySelector(".q-price")?l.querySelector(".q-price").value:"0",H=parseLocalizedNumber(w)||1,R=parseLocalizedNumber(T)||0;a.push({service_id:r,item_code:f,description:y,unit_measure:x,quantity:H,unit_price_usd:R,total_usd:Number((H*R).toFixed(2))})}),a.length===0){alert("Agrega al menos una partida a la cotización.");return}const s=document.getElementById("edit_quotation_id")?document.getElementById("edit_quotation_id").value:"",n=!!s,d={client_id:t,project_title:document.getElementById("quote_title").value,location:document.getElementById("quote_location").value||"Sede Central",execution_time:(document.getElementById("quote_execution_time").value||"").trim()||"15 días hábiles",currency:document.getElementById("quote_currency").value||"USD",validity_days:parseInt(document.getElementById("quote_validity")?document.getElementById("quote_validity").value:15)||15,tax_percent:parseLocalizedNumber((u=document.getElementById("quote_tax_percent"))==null?void 0:u.value)||0,exchange_rate:typeof D<"u"?D:850,notes:(((m=document.getElementById("quote_notes"))==null?void 0:m.value)||"").trim(),coletilla_divisas:document.getElementById("quote_coletilla_divisas")?document.getElementById("quote_coletilla_divisas").checked:!1,coletilla_modalidad:document.getElementById("quote_coletilla_modalidad")?document.getElementById("quote_coletilla_modalidad").checked:!1,items:a},p=document.getElementById("btnSubmitQuotation");p&&(p.disabled=!0,p.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Guardando...');try{const l=n?`${_}/quotations/${s}`:`${_}/quotations/`,r=await b(l,{method:n?"PUT":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(d)});if(!r.ok){const y=await r.json();throw new Error(y.detail||"Error al guardar el presupuesto")}const g=await r.json();oe("modalQuotation");const f=document.getElementById("quoteForm")||document.getElementById("quotationForm");f&&f.reset(),document.getElementById("edit_quotation_id")&&(document.getElementById("edit_quotation_id").value=""),typeof showToastNotification=="function"?showToastNotification(n?`Presupuesto ${g.quote_number||""} actualizado con éxito`:`Presupuesto ${g.quote_number||""} emitido con éxito`,"success"):typeof showToast=="function"?showToast(n?`Presupuesto ${g.quote_number||""} actualizado con éxito`:"Presupuesto creado con éxito","success"):alert(n?"Presupuesto actualizado con éxito.":"Presupuesto creado con éxito."),await Ce()}catch(l){console.error("Error al guardar presupuesto:",l),alert("Error al guardar presupuesto: "+l.message)}finally{p&&(p.disabled=!1,p.innerHTML='<i class="fa-solid fa-floppy-disk"></i> Guardar Presupuesto')}}function at(){const o=document.getElementById("converting_quotation_id");o&&(o.value=""),sessionStorage.removeItem("dalor_active_converting_quote_id");const e=document.getElementById("quote_conversion_banner");e&&e.classList.add("hidden");const t=document.getElementById("projectCreateForm");t&&t.reset(),switchProjectSubtab("list")}async function st(o){try{if(sessionStorage.setItem("dalor_active_converting_quote_id",String(o)),!I||I.length===0)try{const f=await b(`${_}/clients/`);f.ok&&(I=await f.json())}catch{}const e=await b(`${_}/quotations/${o}`);if(!e.ok)throw new Error("No se pudo cargar la información del presupuesto.");const t=await e.json();switchView("projects","proyectos"),switchProjectSubtab("form"),populatePlanDropdownSelectors();const i=document.getElementById("converting_quotation_id");i&&(i.value=t.id);const a=document.getElementById("quote_conversion_banner"),s=document.getElementById("quote_conversion_text");a&&a.classList.remove("hidden");const n=t.client?t.client.name:t.client_name||"Cliente";s&&(s.innerText=`Presupuesto [${t.quote_number}] para ${n}. Monto: $${t.total_usd.toLocaleString("en-US",{minimumFractionDigits:2})}. Revisa y completa los campos a continuación:`);const d=document.getElementById("new_proj_code");d&&(d.readOnly=!0,d.style.backgroundColor="#f1f5f9",d.style.cursor="not-allowed",b(`${_}/projects/next-code`).then(f=>f.json()).then(f=>{f&&f.next_code&&d&&(d.value=f.next_code)}).catch(f=>{console.warn("Fallback cálculo código proyecto:",f);const y=(ye?ye.length:0)+1;d&&(d.value=`PRJ-2026-${String(y).padStart(3,"0")}`)})),document.getElementById("new_proj_name")&&(document.getElementById("new_proj_name").value=t.project_title||"");const p=document.getElementById("new_proj_client_id");p&&t.client_id&&(p.value=String(t.client_id)),document.getElementById("new_proj_location")&&(document.getElementById("new_proj_location").value=t.location||"Sede Central");let u=30;if(t.execution_time){const f=t.execution_time.match(/\d+/);f&&(u=parseInt(f[0]))}document.getElementById("new_proj_duration")&&(document.getElementById("new_proj_duration").value=u),document.getElementById("new_proj_contract")&&(document.getElementById("new_proj_contract").value=t.total_usd.toFixed(2));let m=`Obra adjudicada bajo Presupuesto ${t.quote_number}.
Partidas y APU contratadas:
`;t.items&&t.items.length>0?m+=t.items.map((f,y)=>`${y+1}. [${f.item_code||"SER"}] ${f.description} (Cant: ${f.quantity} ${f.unit_measure||"Global"})`).join(`
`):m+=t.project_title,document.getElementById("new_proj_scope")&&(document.getElementById("new_proj_scope").value=m);const l=t.subtotal_usd||t.total_usd||0,c=t.total_usd||0,r=l*.65;document.getElementById("new_proj_labor")&&(document.getElementById("new_proj_labor").value=(l*.3).toFixed(2)),document.getElementById("new_proj_fuel")&&(document.getElementById("new_proj_fuel").value=(l*.08).toFixed(2)),document.getElementById("new_proj_materials")&&(document.getElementById("new_proj_materials").value=(l*.2).toFixed(2)),document.getElementById("new_proj_tools")&&(document.getElementById("new_proj_tools").value=(l*.04).toFixed(2)),document.getElementById("new_proj_services")&&(document.getElementById("new_proj_services").value=(l*.03).toFixed(2));const g=document.getElementById("projectPhasesContainer");if(g&&typeof addProjectPhaseRow=="function"){g.innerHTML="",window.phaseRowsCount=0;const f=Math.max(7,Math.round(u/4));addProjectPhaseRow("Fase 1: Movilización, Permisos & Seguridad SHA",["Gestión de pases y autorizaciones","Charla de inducción y seguridad industrial SHA","Movilización de cuadrilla y equipos a planta"],f,Number((r*.2).toFixed(2))),addProjectPhaseRow("Fase 2: Ejecución Operativa / Desmontaje",["Desmontaje, cortes y maniobras mecánicas","Alineación y preparación de superficies"],f,Number((r*.35).toFixed(2))),addProjectPhaseRow("Fase 3: Montaje, Armado & Ajustes",["Soldadura, calderería e instalación de piezas nuevas","Torque y fijación de soportería estructural"],f,Number((r*.3).toFixed(2))),addProjectPhaseRow("Fase 4: Ensayos, Pintura & Entrega Conforme",["Inspección de calidad y recubrimiento anticorrosivo","Pruebas de servicio y firma de acta de entrega"],f,Number((r*.15).toFixed(2)))}recalcProjectBudgetPreview(),window.scrollTo({top:0,behavior:"smooth"})}catch(e){console.error("Error al convertir presupuesto:",e),alert("Error al vincular presupuesto: "+e.message)}}async function rt(o){try{const e=await b(`${_}/quotations/${o}`);if(!e.ok)throw new Error("No se pudo cargar la cotización.");const t=await e.json(),i=t.exchange_rate||D||800,a=(t.currency||"USD").toUpperCase();let s="$",n="USD",d="",p="",u="P. Unit ($)",m="Total ($)";if(a==="USD"){s="$",n="USD",u="P. Unit ($ USD)",m="Total ($ USD)";const y=`$${t.subtotal_usd.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`,x=t.tax_usd===0?"EXENTO (0%)":`$${t.tax_usd.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`,w=`$${t.total_usd.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`;p=`

                <div style="display: flex; justify-content: space-between; font-size: 11.5px; margin-bottom: 4px;">

                    <span style="color: #475569;">Subtotal:</span>

                    <span style="font-weight: 700; color: #1e293b;">${y}</span>

                </div>

                <div style="display: flex; justify-content: space-between; font-size: 11.5px; margin-bottom: 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">

                    <span style="color: #475569;">IVA (${t.tax_percent}%):</span>

                    <span style="font-weight: 700; color: ${t.tax_usd===0?"#10b981":"#d97706"};">${x}</span>

                </div>

                <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: 900; color: #002B49;">

                    <span>TOTAL USD:</span>

                    <span style="color: #0072B8;">${w}</span>

                </div>

            `,d=""}else if(a==="VES"){s="Bs.",n="VES",u="P. Unit (Bs.)",m="Total (Bs.)";const y=t.subtotal_usd*i,x=t.tax_usd*i,w=t.total_usd*i,T=`Bs. ${y.toLocaleString("es-VE",{minimumFractionDigits:2,maximumFractionDigits:2})}`,H=x===0?"EXENTO (0%)":`Bs. ${x.toLocaleString("es-VE",{minimumFractionDigits:2,maximumFractionDigits:2})}`,R=`Bs. ${w.toLocaleString("es-VE",{minimumFractionDigits:2,maximumFractionDigits:2})}`;p=`

                <div style="display: flex; justify-content: space-between; font-size: 11.5px; margin-bottom: 4px;">

                    <span style="color: #475569;">Subtotal:</span>

                    <span style="font-weight: 700; color: #1e293b;">${T}</span>

                </div>

                <div style="display: flex; justify-content: space-between; font-size: 11.5px; margin-bottom: 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">

                    <span style="color: #475569;">IVA (${t.tax_percent}%):</span>

                    <span style="font-weight: 700; color: ${x===0?"#10b981":"#d97706"};">${H}</span>

                </div>

                <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: 900; color: #002B49;">

                    <span>TOTAL BS:</span>

                    <span style="color: #0072B8;">${R}</span>

                </div>

            `,d=""}else{s="â‚¬",n="EUR",u="P. Unit (â‚¬ EUR)",m="Total (â‚¬ EUR)";const y=`â‚¬ ${t.subtotal_usd.toLocaleString("de-DE",{minimumFractionDigits:2,maximumFractionDigits:2})}`,x=t.tax_usd===0?"EXENTO (0%)":`â‚¬ ${t.tax_usd.toLocaleString("de-DE",{minimumFractionDigits:2,maximumFractionDigits:2})}`,w=`â‚¬ ${t.total_usd.toLocaleString("de-DE",{minimumFractionDigits:2,maximumFractionDigits:2})}`;p=`

                <div style="display: flex; justify-content: space-between; font-size: 11.5px; margin-bottom: 4px;">

                    <span style="color: #475569;">Subtotal:</span>

                    <span style="font-weight: 700; color: #1e293b;">${y}</span>

                </div>

                <div style="display: flex; justify-content: space-between; font-size: 11.5px; margin-bottom: 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">

                    <span style="color: #475569;">IVA (${t.tax_percent}%):</span>

                    <span style="font-weight: 700; color: ${t.tax_usd===0?"#10b981":"#d97706"};">${x}</span>

                </div>

                <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: 900; color: #002B49;">

                    <span>TOTAL EUR:</span>

                    <span style="color: #0072B8;">${w}</span>

                </div>

            `,d=""}let l=[];(t.coletilla_divisas===!0||t.terms_currency_usd_only===!0)&&l.push("<b>Condición de Pago:</b> Solo pagadero en divisas (USD)."),(t.coletilla_modalidad===!0||t.terms_check_payment_mode===!0)&&l.push("<b>Modalidad de Pago:</b> Consultar modalidad de pago.");let c="";t.notes&&t.notes.trim()&&(c=`
                <div style="background: #ffffff; border: 1.5px solid #cbd5e1; border-left: 4px solid #0072B8; border-radius: 6px; padding: 10px 14px; margin-bottom: 12px; font-size: 11px; color: #1e293b; line-height: 1.45; page-break-inside: avoid;">
                    <div style="font-weight: 800; color: #002B49; margin-bottom: 4px; text-transform: uppercase; font-size: 10.5px;">
                        <i class="fa-solid fa-clipboard-list" style="color: #0072B8;"></i> Notas & Observaciones Comerciales del Presupuesto:
                    </div>
                    <p style="margin: 0; white-space: pre-wrap;">${t.notes.trim()}</p>
                </div>
            `);let r="";l.length>0&&(r=`
                <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-left: 4px solid #F5B800; padding: 8px 12px; border-radius: 6px; margin-bottom: 12px; font-size: 10.5px; color: #334155; line-height: 1.45; page-break-inside: avoid;">
                    ${l.map(y=>`<p style="margin: 3px 0;">• ${y}</p>`).join("")}
                </div>
            `);const g=(t.items||[]).map((y,x)=>{let w=`$${y.unit_price_usd.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`,T=`$${y.total_usd.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`;return a==="VES"?(w=`Bs. ${(y.unit_price_usd*i).toLocaleString("es-VE",{minimumFractionDigits:2,maximumFractionDigits:2})}`,T=`Bs. ${(y.total_usd*i).toLocaleString("es-VE",{minimumFractionDigits:2,maximumFractionDigits:2})}`):a==="EUR"&&(w=`â‚¬ ${y.unit_price_usd.toLocaleString("de-DE",{minimumFractionDigits:2,maximumFractionDigits:2})}`,T=`â‚¬ ${y.total_usd.toLocaleString("de-DE",{minimumFractionDigits:2,maximumFractionDigits:2})}`),`

            <tr style="page-break-inside: avoid;">

                <td style="text-align: center; font-weight: bold; border: 1px solid #cbd5e1; padding: 6px 4px; font-size: 11px;">${x+1}</td>

                <td style="text-align: center; color: #0284c7; font-weight: 800; border: 1px solid #cbd5e1; padding: 6px 4px; font-size: 11px;">${y.item_code||"SER-"+(x+1)}</td>

                <td style="border: 1px solid #cbd5e1; padding: 6px 8px; font-weight: 600; font-size: 11px; line-height: 1.35;">${y.description}</td>

                <td style="text-align: center; border: 1px solid #cbd5e1; padding: 6px 4px; font-size: 11px;">${y.unit_measure||"Global"}</td>

                <td style="text-align: center; font-weight: bold; border: 1px solid #cbd5e1; padding: 6px 4px; font-size: 11px;">${y.quantity}</td>

                <td style="text-align: right; border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 11px;">${w}</td>

                <td style="text-align: right; font-weight: bold; border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 11px; color: #002B49;">${T}</td>

            </tr>`}).join(""),f=`

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

                    <p style="font-size: 10.5px; color: #475569; margin: 4px 0 0 0;">Fecha: <b>${new Date(t.created_at).toLocaleDateString("es-VE")}</b></p>

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

                        <th style="width: 95px; padding: 6px 8px; border: 1px solid #002B49; font-size: 10.5px; text-align: right;">${u}</th>

                        <th style="width: 105px; padding: 6px 8px; border: 1px solid #002B49; font-size: 10.5px; text-align: right;">${m}</th>

                    </tr>

                </thead>

                <tbody>

                    ${g}

                </tbody>

            </table>



            <!-- Bloque de Totales -->

            <div style="display: flex; justify-content: flex-end; margin-bottom: 16px; page-break-inside: avoid;">

                <div style="width: 310px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 14px;">

                    ${p}

                </div>

            </div>



            <!-- Notas y Coletillas Comerciales (Punto 4 y 5) -->
            ${c}
            ${r}

            <!-- Coletilla de Condiciones Cambiarias -->
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

        `;document.getElementById("modalPrintPreviewContent").innerHTML=f,document.getElementById("previewModalTitle").textContent=`Presupuesto ${t.quote_number} | ${t.client&&t.client.name||"Cliente"}`,document.getElementById("modalPrintPreview").classList.remove("hidden")}catch(e){alert("Error al visualizar cotización: "+e.message)}}function lt(){var t;const o=document.getElementById("modalPrintPreviewContent"),e=((t=document.getElementById("previewModalTitle"))==null?void 0:t.textContent)||"Presupuesto DALOR";typeof window.printElementHtml=="function"&&o?window.printElementHtml(o,e):window.print()}let z=1,Pe=10,me=[],F="",ie="";function dt(o){z=o,N();const e=document.getElementById("servicesTableBody");e&&e.scrollIntoView({behavior:"smooth",block:"nearest"})}function ct(o){Pe=parseInt(o)||10,z=1,N()}function ut(o){F=(o||"").toLowerCase().trim(),qe()}function pt(o){ie=(o||"").trim(),qe()}function qe(){me=(v||[]).filter(o=>{const e=!F||o.name&&o.name.toLowerCase().includes(F)||o.code&&o.code.toLowerCase().includes(F)||o.unit_measure&&o.unit_measure.toLowerCase().includes(F),t=!ie||o.category===ie;return e&&t}),z=1,N()}function N(){const o=document.getElementById("servicesTableBody");if(!o)return;const e=me;if(e.length===0){o.innerHTML=`<tr><td colspan="8" style="text-align: center; padding: 25px; color: #64748b; font-weight: 500;">
            <i class="fa-solid fa-folder-open" style="font-size: 24px; color: #94a3b8; margin-bottom: 8px; display: block;"></i>
            No se encontraron partidas que coincidan con los filtros.
        </td></tr>`;const n=document.getElementById("servicesPaginationContainer");n&&(n.innerHTML="");return}const t=typeof window.renderPaginationControls=="function"?window.renderPaginationControls:typeof A=="function"?A:()=>({startIndex:0,endIndex:e.length}),{startIndex:i,endIndex:a}=t({containerId:"servicesPaginationContainer",totalItems:e.length,currentPage:z,pageSize:Pe,onPageChange:"goToServicesPage",onPageSizeChange:"changeServicesPageSize",itemLabel:"partida(s)",pageSizeOptions:[10,25,50,100]}),s=e.slice(i,a);o.innerHTML=s.map(n=>{const d=(n.unit_price_usd||0)-(n.base_cost_usd||0);return`
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
        </tr>`}).join("")}async function ne(){const o=document.getElementById("servicesTableBody");o&&(o.innerHTML='<tr><td colspan="8" style="text-align: center; padding: 20px; color: #94a3b8;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando partidas...</td></tr>');try{const e=await b(`${_}/services/`);if(!e.ok)throw new Error("Error HTTP "+e.status);const t=await e.json();v=Array.isArray(t)?t:[],me=v,z=1,N()}catch{o&&(o.innerHTML='<tr><td colspan="8" style="text-align: center; color: #e11d48;">Error al cargar servicios.</td></tr>')}}function Ae(){try{return JSON.parse(localStorage.getItem("dalor_custom_apu_categories")||"[]")}catch{return[]}}function Fe(){try{return JSON.parse(localStorage.getItem("dalor_custom_apu_units")||"[]")}catch{return[]}}function M(o){if(!o||typeof o!="string")return;const e=o.trim();if(!(!e||e==="__NEW__"))try{const t=Ae();t.includes(e)||(t.push(e),localStorage.setItem("dalor_custom_apu_categories",JSON.stringify(t)))}catch{}}function k(o){if(!o||typeof o!="string")return;const e=o.trim();if(!(!e||e==="__NEW__"))try{const t=Fe();t.includes(e)||(t.push(e),localStorage.setItem("dalor_custom_apu_units",JSON.stringify(t)))}catch{}}function Le(){const o=new Set(Se);return Ae().forEach(e=>e&&o.add(e.trim())),(window.allServices||v||[]).forEach(e=>{e.category&&typeof e.category=="string"&&e.category.trim()&&e.category!=="__NEW__"&&o.add(e.category.trim())}),Array.from(o)}function je(){const o=["Kilogramo (kg)","Tonelada (ton)","Metro (m)","Metro Cuadrado (m²)","Metro Cúbico (m³)","Pieza (und)","Global (gl)","Hora-Hombre (hh)","Día (dia)","Pulgada-Diámetro (pulg-diam)","Litro (L)","Galón (gal)"],e=new Set(o);return Fe().forEach(t=>t&&e.add(t.trim())),(window.allServices||v||[]).forEach(t=>{t.unit_measure&&typeof t.unit_measure=="string"&&t.unit_measure.trim()&&t.unit_measure!=="__NEW__"&&e.add(t.unit_measure.trim())}),Array.from(e)}function U(){const o=Le(),e=je(),t=o.map(u=>`<option value="${u}">${u}</option>`).join("")+'<option value="__NEW__" style="color: #0284c7; font-weight: 800;">âž• Escribir Nueva Categoría...</option>',i=e.map(u=>`<option value="${u}">${u}</option>`).join("")+'<option value="__NEW__" style="color: #0284c7; font-weight: 800;">âž• Escribir Nueva Unidad...</option>',a=document.getElementById("srv_category");if(a){const u=a.value;a.innerHTML=t,u&&u!=="__NEW__"&&o.includes(u)?a.value=u:o.length>0&&u!=="__NEW__"&&(a.value=o[0])}const s=document.getElementById("srv_unit");if(s){const u=s.value;s.innerHTML=i,u&&u!=="__NEW__"&&e.includes(u)?s.value=u:e.length>0&&u!=="__NEW__"&&(s.value=e[0])}const n=document.getElementById("edit_srv_category");if(n){const u=n.value;n.innerHTML=t,u&&u!=="__NEW__"&&o.includes(u)&&(n.value=u)}const d=document.getElementById("edit_srv_unit");if(d){const u=d.value;d.innerHTML=i,u&&u!=="__NEW__"&&e.includes(u)&&(d.value=u)}const p=document.getElementById("serviceCategoryFilter");if(p){const u=p.value;p.innerHTML='<option value="">Todas las Categorías</option>'+o.map(m=>`<option value="${m}">${m}</option>`).join(""),u&&o.includes(u)&&(p.value=u)}}function mt(o){const e=document.getElementById("srv_new_category");e&&(o==="__NEW__"?(e.classList.remove("hidden"),e.focus()):(e.classList.add("hidden"),e.value=""))}function gt(o){const e=document.getElementById("srv_new_unit");e&&(o==="__NEW__"?(e.classList.remove("hidden"),e.focus()):(e.classList.add("hidden"),e.value=""))}function ft(o){const e=document.getElementById("edit_srv_new_category");e&&(o==="__NEW__"?(e.classList.remove("hidden"),e.focus()):(e.classList.add("hidden"),e.value=""))}function yt(o){const e=document.getElementById("edit_srv_new_unit");e&&(o==="__NEW__"?(e.classList.remove("hidden"),e.focus()):(e.classList.add("hidden"),e.value=""))}async function wt(){const o=document.getElementById("serviceForm");o&&o.reset();const e=document.getElementById("srv_new_category");e&&(e.value="",e.classList.add("hidden"));const t=document.getElementById("srv_new_unit");t&&(t.value="",t.classList.add("hidden"));const i=document.getElementById("srv_code");i&&(i.value="Generando correlativo...",i.setAttribute("readonly","true"),i.style.backgroundColor="#f1f5f9",i.style.cursor="not-allowed",i.style.fontWeight="700"),U(),de("modalService");try{const a=await b(`${_}/services/next-code`);if(a.ok){const s=await a.json();i&&s&&s.next_code&&(i.value=s.next_code)}else if(i){const s=(v?v.length:0)+1;i.value=`APU-${String(s).padStart(3,"0")}`}}catch(a){console.warn("No se pudo obtener correlativo de APU:",a),i&&i.value.includes("Generando")&&(i.value="APU-001")}}async function _t(o){var a,s,n,d,p,u,m;o&&o.preventDefault&&o.preventDefault();let e=(a=document.getElementById("srv_category"))==null?void 0:a.value;if(e==="__NEW__"){const l=(((s=document.getElementById("srv_new_category"))==null?void 0:s.value)||"").trim();if(!l){alert("Por favor escribe el nombre de la nueva categoría."),(n=document.getElementById("srv_new_category"))==null||n.focus();return}e=l,M(e)}let t=(d=document.getElementById("srv_unit"))==null?void 0:d.value;if(t==="__NEW__"){const l=(((p=document.getElementById("srv_new_unit"))==null?void 0:p.value)||"").trim();if(!l){alert("Por favor escribe la unidad de medida (ej: Kg, Ton, Galón, etc.)."),(u=document.getElementById("srv_new_unit"))==null||u.focus();return}t=l,k(t)}const i={code:document.getElementById("srv_code").value.trim(),name:document.getElementById("srv_name").value.trim(),category:e,unit_measure:t,base_cost_usd:parseFloat(document.getElementById("srv_cost").value)||0,unit_price_usd:parseFloat(document.getElementById("srv_price").value)||0};if(!i.name){alert("El nombre de la partida es obligatorio.");return}if(i.unit_price_usd<i.base_cost_usd){const l=(i.unit_price_usd-i.base_cost_usd).toFixed(2);alert(`âš ï¸ PRECIO INVÁLIDO

El Precio de Venta ($${i.unit_price_usd.toFixed(2)}) no puede ser menor al Costo Base ($${i.base_cost_usd.toFixed(2)}).

Margen actual: $${l} (pérdida).

Ajusta el precio antes de guardar.`),(m=document.getElementById("srv_price"))==null||m.focus();return}try{const l=await b(`${_}/services/`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(i)});if(l.ok){const c=await l.json();oe("modalService"),typeof showToastNotification=="function"?showToastNotification(`Partida ${c.code} registrada exitosamente`,"success"):typeof showToast=="function"?showToast(`Partida ${c.code} registrada exitosamente`,"success"):alert(`Partida ${c.code} registrada exitosamente.`),M(c.category||e),k(c.unit_measure||t),await te(),await ne(),U()}else{const c=await l.json();alert("Error: "+(c.detail||JSON.stringify(c)))}}catch(l){console.error("Error al guardar servicio:",l),alert("Error de conexión al guardar servicio.")}}function bt(o){const e=(v||[]).find(n=>n.id===o);if(!e){alert("Partida no encontrada.");return}U();const t=document.getElementById("edit_srv_new_category");t&&(t.value="",t.classList.add("hidden"));const i=document.getElementById("edit_srv_new_unit");i&&(i.value="",i.classList.add("hidden")),document.getElementById("edit_srv_id").value=e.id,document.getElementById("edit_srv_code").value=e.code,document.getElementById("edit_srv_name").value=e.name;const a=document.getElementById("edit_srv_category");if(a){if(e.category&&!Array.from(a.options).some(n=>n.value===e.category)){const n=document.createElement("option");n.value=e.category,n.textContent=e.category,a.insertBefore(n,a.lastElementChild)}a.value=e.category}const s=document.getElementById("edit_srv_unit");if(s){if(e.unit_measure&&!Array.from(s.options).some(n=>n.value===e.unit_measure)){const n=document.createElement("option");n.value=e.unit_measure,n.textContent=e.unit_measure,s.insertBefore(n,s.lastElementChild)}s.value=e.unit_measure}document.getElementById("edit_srv_cost").value=e.base_cost_usd,document.getElementById("edit_srv_price").value=e.unit_price_usd,de("modalEditService")}async function xt(o){var s,n,d,p,u,m,l;o&&o.preventDefault&&o.preventDefault();const e=document.getElementById("edit_srv_id").value;let t=(s=document.getElementById("edit_srv_category"))==null?void 0:s.value;if(t==="__NEW__"){const c=(((n=document.getElementById("edit_srv_new_category"))==null?void 0:n.value)||"").trim();if(!c){alert("Por favor escribe el nombre de la nueva categoría."),(d=document.getElementById("edit_srv_new_category"))==null||d.focus();return}t=c,M(t)}let i=(p=document.getElementById("edit_srv_unit"))==null?void 0:p.value;if(i==="__NEW__"){const c=(((u=document.getElementById("edit_srv_new_unit"))==null?void 0:u.value)||"").trim();if(!c){alert("Por favor escribe la unidad de medida."),(m=document.getElementById("edit_srv_new_unit"))==null||m.focus();return}i=c,k(i)}const a={name:document.getElementById("edit_srv_name").value.trim(),category:t,unit_measure:i,base_cost_usd:parseFloat(document.getElementById("edit_srv_cost").value)||0,unit_price_usd:parseFloat(document.getElementById("edit_srv_price").value)||0};if(!a.name){alert("El nombre de la partida es obligatorio.");return}if(a.unit_price_usd<a.base_cost_usd){const c=(a.unit_price_usd-a.base_cost_usd).toFixed(2);alert(`âš ï¸ PRECIO INVÁLIDO

El Precio de Venta ($${a.unit_price_usd.toFixed(2)}) no puede ser menor al Costo Base ($${a.base_cost_usd.toFixed(2)}).

Margen actual: $${c} (pérdida).

Ajusta el precio antes de guardar.`),(l=document.getElementById("edit_srv_price"))==null||l.focus();return}try{const c=await b(`${_}/services/${e}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(a)});if(c.ok)oe("modalEditService"),typeof showToastNotification=="function"?showToastNotification("Partida actualizada exitosamente","success"):typeof showToast=="function"?showToast("Partida actualizada exitosamente","success"):alert("Partida actualizada exitosamente."),M(a.category),k(a.unit_measure),await te(),await ne(),U();else{const r=await c.json();alert("Error: "+(r.detail||JSON.stringify(r)))}}catch(c){console.error("Error al actualizar servicio:",c),alert("Error de conexión al actualizar servicio.")}}async function vt(o){if(confirm("¿Deseas eliminar permanentemente esta partida de servicio del catálogo?"))try{(await b(`${_}/services/${o}?permanent=true`,{method:"DELETE"})).ok?(await te(),ne()):alert("Error al eliminar partida.")}catch{alert("Error de conexión al eliminar servicio.")}}async function De(o){const e=document.getElementById("quoteClientRiskAlert"),t=document.getElementById("quoteClientRiskDetails");if(!e||!o){e&&(e.style.display="none");return}try{const i=await b(`${_}/clients/${o}/credit-risk`);if(!i.ok){e.style.display="none";return}const a=await i.json();if(a&&a.has_risk){let s=(a.bad_debts||[]).map(n=>`"¢ <strong>${n.invoice_number||"Doc"}</strong>: $${(n.amount_usd||0).toFixed(2)} USD <em>(${n.reason||"Sin motivo"})</em>`).join("<br>");t&&(t.innerHTML=`
                    Este cliente posee antecedentes de <strong>cuenta incobrable / castigada</strong> por un total de <strong>$${(a.total_bad_debt_usd||0).toFixed(2)} USD</strong>.<br>
                    <div style="margin-top: 4px; padding: 4px 6px; background: rgba(255,255,255,0.7); border-radius: 4px;">${s}</div>
                    <span style="font-size: 10px; color: #881337; margin-top: 4px; display: block;">
                        <strong>Decisión Operativa:</strong> Puede autorizar emitir esta cotización bajo supervisión comercial o cambiar a otro cliente.
                    </span>
                `),e.style.display="block",window.quoteClientRiskDismissed=!1}else e.style.display="none",window.quoteClientRiskDismissed=!0}catch(i){console.warn("Error al verificar riesgo crediticio:",i),e&&(e.style.display="none")}}function Et(o){if(!o){const e=document.getElementById("quoteClientRiskAlert");e&&(e.style.display="none");return}De(o)}function ht(){const o=document.getElementById("quoteClientRiskAlert");o&&(o.style.display="none"),window.quoteClientRiskDismissed=!0;const e=document.getElementById("quote_client_id"),t=e?e.options[e.selectedIndex]:null;t&&console.log(`[Riesgo Crediticio] Cliente ${t.text} autorizado manualmente para cotización.`)}function It(){const o=document.getElementById("quote_client_id");o&&(o.value="");const e=document.getElementById("quoteClientRiskAlert");e&&(e.style.display="none"),window.quoteClientRiskDismissed=!1}typeof window<"u"&&(window.addQuotationRow=Z,window.cancelQuotationConversion=at,window.convertQuoteToProject=st,window.deleteService=vt,window.editQuotation=nt,window.loadQuotations=Ce,window.loadServices=ne,window.onQuotationCurrencyChanged=Te,window.onServiceSelected=ot,window.onTaxTypeChanged=et,window.openNewQuotationModal=Ye,window.openNewServiceModal=wt,window.printQuotation=rt,window.recalcQuotationTotals=q,window.removeQuotationRow=tt,window.submitCreateQuotation=it,window.submitCreateService=_t,window.triggerPrintFromModal=lt,window.populateServiceCategoriesAndUnits=U,window.checkQuoteClientCreditRisk=De,window.onQuoteClientChanged=Et,window.confirmQuoteClientRisk=ht,window.cancelQuoteClientRisk=It,window.goToQuotationsPage=Ge,window.changeQuotationsPageSize=We,window.renderQuotationsPaginated=C,window.onQuotationSearchInput=Je,window.onQuotationStatusFilterChange=Xe,window.onQuotationDateFilterChange=Ke,window.clearQuotationFilters=Ze,window.goToServicesPage=dt,window.changeServicesPageSize=ct,window.renderServicesPaginated=N,window.onServiceSearchInput=ut,window.onServiceCategoryFilterChange=pt,window.openEditServiceModal=bt,window.submitEditService=xt,window.onServiceCategoryChanged=mt,window.onServiceUnitChanged=gt,window.onEditServiceCategoryChanged=ft,window.onEditServiceUnitChanged=yt,window.registerCustomCategory=M,window.registerCustomUnit=k,window.getAllServiceCategories=Le,window.getAllServiceUnits=je);function St(){var s,n;const o=parseFloat((s=document.getElementById("edit_srv_cost"))==null?void 0:s.value)||0,e=parseFloat((n=document.getElementById("edit_srv_price"))==null?void 0:n.value)||0,t=document.getElementById("editSrvMarginBadge");if(!t)return;if(!o&&!e){t.innerHTML="";return}const i=e-o,a=o>0?(i/o*100).toFixed(1):"N/A";i<0?t.innerHTML='<span style="color:#e11d48;background:#fff1f2;padding:3px 10px;border-radius:6px;border:1px solid #fecdd3;">ERROR: Precio de venta menor al costo — Perdida de $'+Math.abs(i).toFixed(2)+" ("+Math.abs(a)+"%) — Ajusta el precio</span>":i===0?t.innerHTML='<span style="color:#b45309;background:#fffbeb;padding:3px 10px;border-radius:6px;border:1px solid #fde68a;">Margen Cero: Precio igual al costo, sin ganancia</span>':t.innerHTML='<span style="color:#059669;background:#ecfdf5;padding:3px 10px;border-radius:6px;border:1px solid #a7f3d0;">OK Ganancia: +$'+i.toFixed(2)+" ("+a+"% sobre costo)</span>"}function Bt(){var s,n;const o=parseFloat((s=document.getElementById("srv_cost"))==null?void 0:s.value)||0,e=parseFloat((n=document.getElementById("srv_price"))==null?void 0:n.value)||0,t=document.getElementById("newSrvMarginBadge");if(!t)return;if(!o&&!e){t.innerHTML="";return}const i=e-o,a=o>0?(i/o*100).toFixed(1):"N/A";i<0?t.innerHTML='<span style="color:#e11d48;background:#fff1f2;padding:3px 10px;border-radius:6px;border:1px solid #fecdd3;">ERROR: Precio de venta menor al costo — Perdida de $'+Math.abs(i).toFixed(2)+" ("+Math.abs(a)+"%) — Ajusta el precio</span>":i===0?t.innerHTML='<span style="color:#b45309;background:#fffbeb;padding:3px 10px;border-radius:6px;border:1px solid #fde68a;">Margen Cero: Precio igual al costo, sin ganancia</span>':t.innerHTML='<span style="color:#059669;background:#ecfdf5;padding:3px 10px;border-radius:6px;border:1px solid #a7f3d0;">OK Ganancia: +$'+i.toFixed(2)+" ("+a+"% sobre costo)</span>"}window.calcEditServiceMargin=St;window.calcNewServiceMargin=Bt;
