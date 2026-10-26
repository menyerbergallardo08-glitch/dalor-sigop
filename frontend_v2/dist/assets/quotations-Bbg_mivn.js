function Me(o,e=2){const t=Math.pow(10,e);return Math.round((Number(o)||0)*t)/t}window.roundNumber=Me;function he(o){if(typeof o=="number")return isNaN(o)?0:o;if(!o)return 0;let e=String(o).trim().replace(/[$Bs€\s]/g,"");e.includes(",")&&e.includes(".")?e.indexOf(".")<e.indexOf(",")?e=e.replace(/\./g,"").replace(",","."):e=e.replace(/,/g,""):e.includes(",")&&(e=e.replace(",","."));const t=parseFloat(e);return isNaN(t)?0:t}window.parseLocalizedNumber=he;window.parseDecimal=he;window.API_BASE=window.location.origin+"/api/v1";window.currentUser||(()=>{try{return JSON.parse(localStorage.getItem("dalor_user")||sessionStorage.getItem("dalor_user")||"null")}catch{return null}})();window.authToken||localStorage.getItem("dalor_token")||sessionStorage.getItem("dalor_token");let ke=0;const Ie=o=>{Date.now()-ke<350||!o.target.closest(".nav-dropdown")&&!o.target.closest(".dropdown-menu")&&!o.target.closest(".mobile-submenu-card")&&(closeAllDropdowns(),closeMobileSubmenu())};document.addEventListener("click",Ie);document.addEventListener("touchend",Ie);function j({containerId:o,totalItems:e=0,currentPage:t=1,pageSize:i=10,onPageChange:a="",onPageSizeChange:s="",itemLabel:n="registro(s)",pageSizeOptions:r=[10,15,25,50,100],allowAll:c=!0}){const d=document.getElementById(o);if(!d)return{startIndex:0,endIndex:0,totalPages:1,currentPage:1};const m=i===1e3||i===9999?e||1:i||15,p=Math.max(1,Math.ceil(e/m));let f=Math.max(1,Math.min(t,p));const l=(f-1)*m,u=Math.min(l+m,e);if(e<=Math.min(...r)&&p<=1)return d.innerHTML=`
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 11.5px; color: #64748b; margin-top: 8px;">
                <span>Mostrando <b>${e}</b> ${n}</span>
                ${s?`
                <div style="display: flex; align-items: center; gap: 6px;">
                    <span>Mostrar:</span>
                    <select onchange="${s}(this.value)" style="padding: 2px 6px; font-size: 11px; border: 1px solid #cbd5e1; border-radius: 4px; background: white; font-weight: 700; cursor: pointer;">
                        ${r.map(g=>`<option value="${g}" ${i===g?"selected":""}>${g}</option>`).join("")}
                        ${c?`<option value="1000" ${i===1e3?"selected":""}>Todos</option>`:""}
                    </select>
                </div>`:""}
            </div>
        `,{startIndex:l,endIndex:u,totalPages:p,currentPage:f};let y="",w=Math.max(1,f-2),_=Math.min(p,f+2);w>1&&(y+=`<button type="button" onclick="${a}(1)" class="btn-secondary" style="padding: 4px 9px; font-size: 11px; border-radius: 5px;">1</button>`,w>2&&(y+='<span style="padding: 0 4px; color: #94a3b8;">...</span>'));for(let g=w;g<=_;g++)g===f?y+=`<button type="button" class="btn-primary" style="padding: 4px 10px; font-size: 11px; font-weight: 800; border-radius: 5px; background: var(--dalor-navy, #0f172a); color: white;">${g}</button>`:y+=`<button type="button" onclick="${a}(${g})" class="btn-secondary" style="padding: 4px 9px; font-size: 11px; border-radius: 5px;">${g}</button>`;return _<p&&(_<p-1&&(y+='<span style="padding: 0 4px; color: #94a3b8;">...</span>'),y+=`<button type="button" onclick="${a}(${p})" class="btn-secondary" style="padding: 4px 9px; font-size: 11px; border-radius: 5px;">${p}</button>`),d.innerHTML=`
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 12px; color: #475569; flex-wrap: wrap; gap: 10px; box-shadow: 0 1px 2px rgba(0,0,0,0.04); margin-top: 8px;">
            <div style="font-weight: 600;">
                Mostrando <b style="color: var(--dalor-navy, #0f172a);">${e===0?0:l+1} - ${u}</b> de <b style="color: var(--dalor-navy, #0f172a);">${e}</b> ${n}
            </div>

            <div style="display: flex; align-items: center; gap: 5px;">
                <button type="button" onclick="${a}(1)" class="btn-secondary" style="padding: 4px 8px; font-size: 11px; border-radius: 5px;" ${f===1?'disabled style="opacity:0.4; cursor:not-allowed;"':""} title="Primera página">
                    <i class="fa-solid fa-angles-left"></i>
                </button>
                <button type="button" onclick="${a}(${f-1})" class="btn-secondary" style="padding: 4px 9px; font-size: 11px; border-radius: 5px;" ${f===1?'disabled style="opacity:0.4; cursor:not-allowed;"':""} title="Página anterior">
                    <i class="fa-solid fa-chevron-left"></i> Anterior
                </button>

                <div style="display: flex; align-items: center; gap: 4px;">
                    ${y}
                </div>

                <button type="button" onclick="${a}(${f+1})" class="btn-secondary" style="padding: 4px 9px; font-size: 11px; border-radius: 5px;" ${f===p?'disabled style="opacity:0.4; cursor:not-allowed;"':""} title="Página siguiente">
                    Siguiente <i class="fa-solid fa-chevron-right"></i>
                </button>
                <button type="button" onclick="${a}(${p})" class="btn-secondary" style="padding: 4px 8px; font-size: 11px; border-radius: 5px;" ${f===p?'disabled style="opacity:0.4; cursor:not-allowed;"':""} title="Última página">
                    <i class="fa-solid fa-angles-right"></i>
                </button>
            </div>

            ${s?`
            <div style="display: flex; align-items: center; gap: 6px;">
                <span style="font-size: 11.5px; color: #64748b;">Por página:</span>
                <select onchange="${s}(this.value)" style="padding: 3px 8px; font-size: 11.5px; border: 1px solid #cbd5e1; border-radius: 5px; background: white; font-weight: 700; color: var(--dalor-navy, #0f172a); cursor: pointer;">
                    ${r.map(g=>`<option value="${g}" ${i===g?"selected":""}>${g}</option>`).join("")}
                    ${c?`<option value="1000" ${i===1e3?"selected":""}>Ver todos</option>`:""}
                </select>
            </div>`:""}
        </div>
    `,{startIndex:l,endIndex:u,totalPages:p,currentPage:f}}window.renderPaginationControls=j;function Se(o){o==="modalNewQuotation"&&(o="modalQuotation");const e=document.getElementById(o);e&&(e.classList.remove("hidden"),e.style.setProperty("display","flex","important"));const t=document.getElementById("btnFloatingLogout");t&&t.style.setProperty("display","none","important")}function de(o){const e=document.getElementById(o);if(e&&(e.classList.add("hidden"),e.style.setProperty("display","none","important")),document.querySelectorAll(".modal-overlay:not(.hidden):not([style*='display: none']), .modal:not(.hidden):not([style*='display: none'])").length===0){const i=document.getElementById("btnFloatingLogout");i&&i.style.removeProperty("display")}}function ze(o){const e=document.getElementById("mobileSubmenuSheet");e&&e.classList.remove("active"),document.body.style.overflow=""}function Ne(){document.querySelectorAll(".nav-dropdown").forEach(o=>{o.classList.remove("open")}),ze()}function Be(o,e,t=null){Ne(),["executive","financial","maintenance","quotations","clients","services","projects","dispatch","dashboard","resources","pwa","manual","tree","inbox","expenses-log"].forEach(n=>{const r=document.getElementById(`view-${n}`);r&&r.classList.add("hidden")});const a=document.getElementById(`view-${o}`);a&&a.classList.remove("hidden"),document.querySelectorAll(".nav-dropdown").forEach(n=>n.classList.remove("active"));const s=document.getElementById(`dropdown-${e}`);s&&s.classList.add("active");try{localStorage.setItem("dalor_active_view",o),e&&localStorage.setItem("dalor_active_category",e),sessionStorage.setItem("dalor_active_view",o),e&&sessionStorage.setItem("dalor_active_category",e)}catch{}if(o==="executive"&&typeof window.loadExecutiveDashboard=="function"&&window.loadExecutiveDashboard(),o==="financial"){let n=t||localStorage.getItem("dalor_active_subtab_financial")||sessionStorage.getItem("dalor_active_subtab_financial")||"cxc";const r=window.currentUser||window.State&&window.State.currentUser;if(r){let c={};try{c=typeof r.permissions_json=="string"?JSON.parse(r.permissions_json):r.permissions_json||r.permissions||{}}catch{}if(!((r.username||"").toLowerCase()==="director"||(r.role_name||"").toLowerCase().includes("director")||r.is_superuser===!0)){const m=c.cxc_view!==void 0||c.cxp_view!==void 0||c.bancos_view!==void 0||c.retiros_view!==void 0,p=c.cxc_view!==void 0?!!(c.cxc_view||c.cxc_pay):!m,f=c.cxp_view!==void 0?!!(c.cxp_view||c.cxp_pay):!m,l=c.bancos_view!==void 0?!!c.bancos_view:!m,u=c.retiros_view!==void 0?!!c.retiros_view:!1;n==="cxc"&&p||n==="cxp"&&f||n==="summary"&&l||n==="partners"&&u||(p?n="cxc":f?n="cxp":l?n="summary":u&&(n="partners"))}}typeof window.switchFinancialSubtab=="function"?window.switchFinancialSubtab(n):typeof window.openFinancialSubtab=="function"&&window.openFinancialSubtab(n)}if(o==="maintenance"){const n=t||localStorage.getItem("dalor_active_subtab_maintenance")||sessionStorage.getItem("dalor_active_subtab_maintenance")||"users";typeof window.switchMaintenanceSubtab=="function"?window.switchMaintenanceSubtab(n):typeof window.openMaintenanceSubtab=="function"&&window.openMaintenanceSubtab(n)}if(o==="quotations"&&typeof window.loadQuotations=="function"&&window.loadQuotations(),o==="clients"&&typeof window.loadClients=="function"&&window.loadClients(),o==="services"&&typeof window.loadServices=="function"&&window.loadServices(),o==="projects"){const n=t||localStorage.getItem("dalor_active_subtab_projects")||sessionStorage.getItem("dalor_active_subtab_projects")||"list";typeof window.switchProjectSubtab=="function"?window.switchProjectSubtab(n):typeof window.initProjectPlanningView=="function"&&window.initProjectPlanningView()}if(o==="dispatch"){const n=t||localStorage.getItem("dalor_active_subtab_dispatch")||sessionStorage.getItem("dalor_active_subtab_dispatch")||"list";typeof window.switchDispatchSubtab=="function"?window.switchDispatchSubtab(n):typeof window.initDispatchView=="function"&&window.initDispatchView()}if(o==="dashboard"&&typeof window.loadComparisonDashboard=="function"&&window.loadComparisonDashboard(),o==="resources"){const n=t||localStorage.getItem("dalor_active_subtab_resources")||sessionStorage.getItem("dalor_active_subtab_resources")||"dashboard";typeof window.switchResourceSubtab=="function"?window.switchResourceSubtab(n):typeof window.openResourceSubtab=="function"&&window.openResourceSubtab(n)}o==="inbox"&&typeof window.loadPendingExpensesInbox=="function"&&window.loadPendingExpensesInbox(),o==="tree"&&typeof window.loadCategoriesTree=="function"&&window.loadCategoriesTree(),o==="expenses-log"&&typeof window.loadExpensesLog=="function"&&window.loadExpensesLog(),window.onViewSwitched&&window.onViewSwitched(o)}window.switchView=Be;window.appSwitchView=Be;window.calcFieldBs=function(){var i,a;const o=parseFloat((i=document.getElementById("field_amount_usd"))==null?void 0:i.value)||0,e=parseFloat((a=document.getElementById("globalExchangeRateInput"))==null?void 0:a.value)||EXCHANGE_RATE,t=document.getElementById("field_amount_bs");t&&!isNaN(o)&&(t.value=(o*e).toFixed(2)),ce()};window.calcFieldUsd=function(){var i,a;const o=parseFloat((i=document.getElementById("field_amount_bs"))==null?void 0:i.value)||0,e=parseFloat((a=document.getElementById("globalExchangeRateInput"))==null?void 0:a.value)||EXCHANGE_RATE,t=document.getElementById("field_amount_usd");t&&!isNaN(o)&&e>0&&(t.value=(o/e).toFixed(2)),ce()};window.onFieldTaxConditionChanged=function(){ce()};function ce(){var c,d;const o=parseFloat((c=document.getElementById("field_amount_usd"))==null?void 0:c.value)||0,e=((d=document.getElementById("field_is_tax_exempt"))==null?void 0:d.value)==="true",t=e?o:+(o/1.16).toFixed(2),i=e?0:+(o-t).toFixed(2),a=document.getElementById("field_base_amount_usd"),s=document.getElementById("field_tax_amount_usd"),n=document.getElementById("field_base_display"),r=document.getElementById("field_tax_display");a&&(a.value=t.toFixed(2)),s&&(s.value=i.toFixed(2)),n&&(n.innerText=`$${t.toFixed(2)}`),r&&(r.innerText=`$${i.toFixed(2)}`)}window.onValTaxChanged=function(){var n,r;const o=parseFloat((n=document.getElementById("val_amount_usd"))==null?void 0:n.value)||0,e=((r=document.getElementById("val_is_tax_exempt"))==null?void 0:r.value)==="true",t=e?o:+(o/1.16).toFixed(2),i=e?0:+(o-t).toFixed(2),a=document.getElementById("val_base_usd"),s=document.getElementById("val_tax_usd");a&&(a.value=t.toFixed(2)),s&&(s.value=i.toFixed(2))};parseFloat(localStorage.getItem("dalor_exchange_rate"));var ie=window.allClients=window.allClients||[],Oe=window.allServices=window.allServices||[],ae=window.allProjects=window.allProjects||[],re=window.allCategories=window.allCategories||[],Q=window.allAssets=window.allAssets||[],E=window.allPersonnel=window.allPersonnel||[],G=window.allMaterials=window.allMaterials||[];let D=null,be=0;const Ue=6e4;async function ue(o=!1){const e=Date.now();return D||(!o&&e-be<Ue&&window.allClients&&window.allClients.length>0&&window.allPersonnel&&window.allPersonnel.length>0&&window.allAssets&&window.allAssets.length>0?(typeof populatePlanDropdownSelectors=="function"&&populatePlanDropdownSelectors(),Promise.resolve()):(D=(async()=>{try{const[t,i,a,s,n,r,c]=await Promise.all([authFetch(`${API_BASE}/clients/`),authFetch(`${API_BASE}/services/`),authFetch(`${API_BASE}/projects/`),authFetch(`${API_BASE}/expenses/categories`),authFetch(`${API_BASE}/assets/`),authFetch(`${API_BASE}/personnel/`),authFetch(`${API_BASE}/materials/`)]),d=t.ok?await t.json():[];window.allClients=ie=Array.isArray(d)?d:[];const m=i.ok?await i.json():[];window.allServices=Oe=Array.isArray(m)?m:[];const p=a.ok?await a.json():[];window.allProjects=ae=Array.isArray(p)?p:[];const f=s.ok?await s.json():[];window.allCategories=re=Array.isArray(f)?f:[];const l=n.ok?await n.json():[];window.allAssets=Q=Array.isArray(l)?l:[];const u=r.ok?await r.json():[];window.allPersonnel=E=Array.isArray(u)?u:[];const y=c.ok?await c.json():{};window.allMaterials=G=Array.isArray(y.materials)?y.materials:Array.isArray(y)?y:[],be=Date.now(),le(),populatePlanDropdownSelectors(),updatePendingInboxBadge()}catch(t){console.error("Error al cargar datos maestros:",t)}finally{D=null}})(),D))}function le(){const o=window.allClients&&window.allClients.length>0?window.allClients:Array.isArray(ie)?ie:[],e=window.allProjects&&window.allProjects.length>0?window.allProjects:Array.isArray(ae)?ae:[],t=window.allCategories&&window.allCategories.length>0?window.allCategories:Array.isArray(re)?re:[],i=window.allAssets&&window.allAssets.length>0?window.allAssets:Array.isArray(Q)?Q:[];window.allMaterials&&window.allMaterials.length>0?window.allMaterials:Array.isArray(G),window.allPersonnel&&window.allPersonnel.length>0?window.allPersonnel:Array.isArray(E);const a=(l,u)=>{const y=document.getElementById(l);if(!y)return;const w=y.value;y.innerHTML=u,w&&(y.value=w)},s='<option value="">-- Seleccione Cliente --</option>'+o.map(l=>`<option value="${l.id}">[${l.code}] ${l.name} (${l.rif||"Sin RIF"})</option>`).join("");if(a("quote_client_id",s),a("new_proj_client_id",s),a("cxc_client_id",s),a("rcp_client_id",s),o.length===1){const l=document.getElementById("quote_client_id");l&&!l.value&&(l.value=String(o[0].id));const u=document.getElementById("new_proj_client_id");u&&!u.value&&(u.value=String(o[0].id))}const n='<option value="">-- Gasto General Sede (Sin Proyecto) --</option>'+e.map(l=>`<option value="${l.id}">${l.code} - ${l.name}</option>`).join("");document.getElementById("field_project_id")&&(document.getElementById("field_project_id").innerHTML=n),document.getElementById("manual_project_id")&&(document.getElementById("manual_project_id").innerHTML=n),document.getElementById("cxc_project_id")&&(document.getElementById("cxc_project_id").innerHTML=n),document.getElementById("cxp_project_id")&&(document.getElementById("cxp_project_id").innerHTML=n),document.getElementById("rcp_project_id")&&(document.getElementById("rcp_project_id").innerHTML='<option value="">-- Sin Proyecto Específico (Anticipo a Cuenta) --</option>'),document.getElementById("mc_project_id")&&(document.getElementById("mc_project_id").innerHTML='<option value="">-- Consumo Interno Taller Central (Gasto Sede) --</option>'+e.map(l=>`<option value="${l.id}">${l.code} - ${l.name}</option>`).join("")),document.getElementById("modal_target_project_id")&&(document.getElementById("modal_target_project_id").innerHTML=e.map(l=>`<option value="${l.id}">${l.code} - ${l.name} (${l.location})</option>`).join("")),document.getElementById("tg_project_id")&&(document.getElementById("tg_project_id").innerHTML='<option value="">-- Seleccione Proyecto Aprobado --</option>'+e.map(l=>`<option value="${l.id}" data-location="${l.location}">${l.code} - ${l.name} (${l.location})</option>`).join(""));const c=sortCategoriesNumerically(t).map(l=>`<option value="${l.id}">[${l.code}] ${l.name}</option>`).join("");document.getElementById("field_category_id")&&(document.getElementById("field_category_id").innerHTML=c),document.getElementById("manual_category_id")&&(document.getElementById("manual_category_id").innerHTML=c);const d='<option value="">-- No Aplica --</option>'+i.map(l=>`<option value="${l.id}">${l.asset_code} - ${l.name}</option>`).join("");document.getElementById("field_asset_id")&&(document.getElementById("field_asset_id").innerHTML=d);const m=(Q||[]).filter(l=>(l.asset_type==="vehiculo"||l.asset_type==="camioneta"||l.asset_type==="transporte")&&l.is_active!==!1&&!l.current_project_id&&(l.status==="disponible_base"||l.status==="disponible"||!l.status)&&l.status!=="en_obra"&&l.status!=="en_mantenimiento"&&l.status!=="alquilado_a_tercero"&&l.status!=="desincorporado"),p=`<option value="">-- Seleccione Vehículo de Transporte (${m.length} disp. en base) --</option><option value="none">📍 Sin Vehículo Asignado (Sede Central / Taller / Custodia Interna)</option>`+m.map(l=>`<option value="${l.id}">[${l.asset_code}] ${l.name} (Placa: ${l.license_plate||"S/P"}) - ${l.current_location||"Base"}</option>`).join("");document.getElementById("tg_vehicle_id")&&(document.getElementById("tg_vehicle_id").innerHTML=p);const f='<option value="">-- Seleccione Material --</option>'+G.map(l=>`<option value="${l.id}" data-cost="${l.unit_cost_usd}" data-stock="${l.stock_quantity}" data-unit="${l.unit_measure}">[${l.code}] ${l.name} (${l.stock_quantity} ${l.unit_measure} disp. - $${l.unit_cost_usd}/u)</option>`).join("");if(document.getElementById("me_material_id")&&(document.getElementById("me_material_id").innerHTML=f),document.getElementById("mc_material_id")&&(document.getElementById("mc_material_id").innerHTML=f),E&&E.length>0){const l=E.map(u=>`<option value="${u.id}">[${u.code}] ${u.full_name}${u.role_title?" - "+u.role_title:""}</option>`).join("");document.getElementById("field_reported_by")&&(document.getElementById("field_reported_by").innerHTML=l),document.getElementById("manual_reported_by")&&(document.getElementById("manual_reported_by").innerHTML=l)}if(currentUser&&E&&E.length>0){const l=E.find(u=>u.full_name&&currentUser.username&&u.full_name.toLowerCase().includes(currentUser.username.toLowerCase())||u.role_title&&currentUser.role&&u.role_title.toLowerCase().includes(currentUser.role.toLowerCase()))||E[0];l&&(document.getElementById("field_reported_by")&&(document.getElementById("field_reported_by").value=l.id),document.getElementById("manual_reported_by")&&(document.getElementById("manual_reported_by").value=l.id))}typeof window.populateServiceCategoriesAndUnits=="function"&&window.populateServiceCategoriesAndUnits()}let B=localStorage.getItem("dalor_sound_alerts")!=="false",ve=new Set,xe=!0;function Re(){B=!B,localStorage.setItem("dalor_sound_alerts",B?"true":"false"),pe(),B&&me()}function pe(){const o=document.getElementById("iconSoundToggle"),e=document.getElementById("textSoundToggle"),t=document.getElementById("iconSoundToggleInbox"),i=document.getElementById("textSoundToggleInbox"),a=document.getElementById("btnSoundToggle");o&&e&&(B?(o.className="fa-solid fa-bell",e.innerText="Sonido: ON",a&&(a.style.color="#fbbf24",a.style.borderColor="#fbbf24")):(o.className="fa-solid fa-bell-slash",e.innerText="Sonido: OFF",a&&(a.style.color="#94a3b8",a.style.borderColor="#334155"))),t&&i&&(B?(t.className="fa-solid fa-bell",t.style.color="#059669",i.innerText="Alertas Sonoras: ON"):(t.className="fa-solid fa-bell-slash",t.style.color="#94a3b8",i.innerText="Alertas Sonoras: OFF"))}function me(){if(B)try{const o=window.AudioContext||window.webkitAudioContext;if(!o)return;const e=new o,t=e.currentTime,i=e.createOscillator(),a=e.createGain();i.type="sine",i.frequency.setValueAtTime(659.25,t),a.gain.setValueAtTime(.25,t),a.gain.exponentialRampToValueAtTime(.001,t+.35),i.connect(a),a.connect(e.destination),i.start(t),i.stop(t+.35);const s=e.createOscillator(),n=e.createGain();s.type="sine",s.frequency.setValueAtTime(880,t+.12),n.gain.setValueAtTime(.3,t+.12),n.gain.exponentialRampToValueAtTime(.001,t+.55),s.connect(n),n.connect(e.destination),s.start(t+.12),s.stop(t+.55)}catch(o){console.warn("Audio alert error:",o)}}function $e(o){const e=document.getElementById("toastNotificationContainer");if(!e)return;const t=document.createElement("div");t.className="toast-card-live",t.style.cssText=`

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

    `,e.appendChild(t),setTimeout(()=>{t.parentElement&&(t.style.opacity="0",t.style.transform="translateX(60px)",setTimeout(()=>t.remove(),300))},9e3)}async function Ce(){try{if(!currentUser)return;const o=(currentUser.username||"").toLowerCase(),e=(currentUser.role_name||"").toLowerCase();if(o==="campo"||e.includes("supervisor")||e.includes("campo")){const m=document.getElementById("badgeInboxCount"),p=document.getElementById("badgeGastosDropdown");m&&(m.style.display="none"),p&&(p.style.display="none");return}const i=await authFetch(`${API_BASE}/expenses/inbox/pending`);if(!i.ok)return;const a=await i.json(),s=Array.isArray(a)?a:[],n=s.length,r=document.getElementById("badgeInboxCount");r&&(r.innerText=n,r.style.display=n>0?"inline-block":"none");const c=document.getElementById("badgeGastosDropdown");c&&(c.innerText=n,c.style.display=n>0?"inline-block":"none");const d=new Set(s.map(m=>m.id));if(!xe){const m=s.filter(p=>!ve.has(p.id));if(m.length>0){me(),m.forEach(f=>$e(f));const p=document.getElementById("view-inbox");p&&!p.classList.contains("hidden")&&loadPendingExpensesInbox()}}ve=d,xe=!1}catch{}}setInterval(Ce,5e3);pe();setInterval(()=>{authFetch("/healthz").catch(()=>{})},3e5);typeof window<"u"&&(window.allClients=allClients,window.allServices=allServices,window.allProjects=allProjects,window.allCategories=allCategories,window.allAssets=allAssets,window.allPersonnel=allPersonnel,window.allMaterials=allMaterials,window.selectedPersonnelIds=selectedPersonnelIds,window.selectedVehicleIds=selectedVehicleIds,window.selectedToolIds=selectedToolIds,window.selectedMaterialIds=selectedMaterialIds,window.EXCHANGE_RATE=EXCHANGE_RATE,window.currentUser=window.currentUser||currentUser,window.authToken=window.authToken||authToken,window.closeAllDropdowns=closeAllDropdowns,window.closeMobileSubmenu=closeMobileSubmenu,window.closeModal=closeModal,window.isMobileViewport=isMobileViewport,window.loadInitialMasterData=loadInitialMasterData,window.openMobileSubmenu=openMobileSubmenu,window.openModal=openModal,window.parseLocalizedNumber=parseLocalizedNumber,window.playNotificationChime=me,window.populateSelect=populateSelect,window.populateSelectDropdowns=populateSelectDropdowns,window.roundNumber=roundNumber,window.showInboxToastNotification=$e,window.renderPaginationControls=renderPaginationControls,window.sortCategoriesNumerically=sortCategoriesNumerically,window.switchView=switchView,window.toggleDropdown=toggleDropdown,window.toggleSoundAlerts=Re,window.printElementHtml=printElementHtml,window.updatePendingInboxBadge=Ce,window.updateSoundToggleUI=pe);console.log("--> DALOR SIGO-P CORE (Modular Facade) INITIALIZED");var U=window.API_BASE||window.location.origin+"/api/v1",R=window.allClients=window.allClients||[],H=window.allServices=window.allServices||[];window.allProjects=window.allProjects||[];window.allCategories=window.allCategories||[];window.allMaterials=window.allMaterials||[];window.EXCHANGE_RATE=window.EXCHANGE_RATE||850;window.BCV_DATA=window.BCV_DATA||{rate:850,source:"BCV Oficial"};window.authToken=window.authToken||localStorage.getItem("dalor_token")||null;const He=["Fabricación Metalmecánica","Montaje e Instalación en Sitio","Mantenimiento Industrial & Paradas","Soldadura Especializada & Pailería","Mecanizado & Torno","Arenado y Pintura Industrial","Obras Civiles & Eléctricas Asociadas"];typeof window<"u"&&(window.OFFICIAL_DALOR_APU_CATEGORIES=He);function V(o,e={}){var t=sessionStorage.getItem("dalor_token")||localStorage.getItem("dalor_token")||window.authToken||"",i=Object.assign({},e.headers||{});return t&&(i.Authorization="Bearer "+t),e.body&&!(e.body instanceof FormData)&&!i["Content-Type"]&&(i["Content-Type"]="application/json"),e.body instanceof FormData&&delete i["Content-Type"],window.fetch(o,Object.assign({},e,{headers:i}))}let W=[],$=1,Ae=10,X="",A="",J="",K="";function Ve(o){$=o,S();const e=document.getElementById("quotationsTableBody");e&&e.scrollIntoView({behavior:"smooth",block:"nearest"})}function Qe(o){Ae=parseInt(o)||10,$=1,S()}function Ge(o){X=(o||"").trim().toLowerCase(),$=1,S()}function We(o){A=(o||"").trim().toLowerCase(),$=1,S()}function Xe(){var o,e;J=((o=document.getElementById("quoteFilterDateFrom"))==null?void 0:o.value)||"",K=((e=document.getElementById("quoteFilterDateTo"))==null?void 0:e.value)||"",$=1,S()}function Je(){X="",A="",J="",K="";const o=document.getElementById("quoteSearchInput");o&&(o.value="");const e=document.getElementById("quoteStatusFilter");e&&(e.value="");const t=document.getElementById("quoteFilterDateFrom");t&&(t.value="");const i=document.getElementById("quoteFilterDateTo");i&&(i.value=""),$=1,S()}function S(){const o=document.getElementById("quotationsTableBody");if(!o)return;let e=W||[];if(X){const n=X;e=e.filter(r=>r.quote_number&&r.quote_number.toLowerCase().includes(n)||r.client&&r.client.name&&r.client.name.toLowerCase().includes(n)||r.project_title&&r.project_title.toLowerCase().includes(n))}if(A&&(e=e.filter(n=>{const r=(n.status||"").toLowerCase();return A==="declinado"||A==="rechazado"?r==="declinado"||r==="rechazado":r===A})),J&&(e=e.filter(n=>n.created_at&&n.created_at.substring(0,10)>=J)),K&&(e=e.filter(n=>n.created_at&&n.created_at.substring(0,10)<=K)),e.length===0){o.innerHTML='<tr><td colspan="8" style="text-align: center; padding: 20px; color: #94a3b8;">No se encontraron cotizaciones con los criterios seleccionados.</td></tr>';const n=document.getElementById("quotationsPaginationContainer");n&&(n.innerHTML="");return}const t=typeof window.renderPaginationControls=="function"?window.renderPaginationControls:typeof j=="function"?j:()=>({startIndex:0,endIndex:e.length}),{startIndex:i,endIndex:a}=t({containerId:"quotationsPaginationContainer",totalItems:e.length,currentPage:$,pageSize:Ae,onPageChange:"goToQuotationsPage",onPageSizeChange:"changeQuotationsPageSize",itemLabel:"cotización(es)",pageSizeOptions:[10,20,50,100]}),s=e.slice(i,a);o.innerHTML=s.map(n=>{const r=n.client?n.client.name:"Cliente General",c=(n.status||"borrador").toLowerCase(),d=c==="aprobado",m=c==="declinado"||c==="rechazado",p=Number(n.subtotal_usd||0),f=Number(n.tax_usd||0),l=Number(n.total_usd||0);let u="#f1f5f9",y="#475569",w="1px solid #e2e8f0",_=c.toUpperCase();return d?(u="#dcfce7",y="#166534",w="1px solid #bbf7d0",_="APROBADO"):m&&(u="#fee2e2",y="#991b1b",w="1px solid #fecaca",_="DECLINADO"),`
        <tr>
            <td style="font-weight: 800; color: var(--dalor-blue);">
                ${n.quote_number}
                <div style="font-size: 10px; color: #64748b; font-weight: normal; margin-top: 2px;">
                    <i class="fa-regular fa-calendar-days" style="color: var(--dalor-gold);"></i> ${n.created_at?n.created_at.includes("-")?(g=>`${g[2]}/${g[1]}/${g[0]}`)(n.created_at.substring(0,10).split("-")):new Date(n.created_at).toLocaleDateString("es-VE"):"-"}
                </div>
            </td>
            <td style="font-weight: 600;">${r}</td>
            <td>${n.project_title}</td>
            <td style="font-weight: 700;">$${p.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
            <td style="color: ${f===0?"#10b981":"#64748b"}; font-weight: 700;">
                ${f===0?"EXENTO (0%)":`$${f.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`}
            </td>
            <td style="font-weight: 800; color: var(--dalor-navy);">$${l.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
            <td>
                <span style="font-size: 10px; padding: 3px 8px; border-radius: 9999px; font-weight: 800; background: ${u}; color: ${y}; border: ${w}; display: inline-block;">
                    ${_}
                </span>
            </td>
            <td style="text-align: center; white-space: nowrap;">
                <button onclick="editQuotation(${n.id})" class="btn-secondary" style="padding: 4px 8px; font-size: 11px; margin-right: 4px; color: #0284c7; font-weight: 700;" title="Re-editar Cotización">
                    <i class="fa-solid fa-pen-to-square"></i> Re-editar
                </button>
                <button onclick="printQuotation(${n.id})" class="btn-secondary" style="padding: 4px 8px; font-size: 11px;" title="Imprimir / Exportar Cotización">
                    <i class="fa-solid fa-print"></i>
                </button>
                ${d?`
                    <span style="font-size: 11px; color: #059669; font-weight: bold; margin-left: 6px;"><i class="fa-solid fa-check-circle"></i> Obra Activa</span>
                `:m?`
                    <button onclick="reopenQuotation(${n.id})" class="btn-secondary" style="padding: 4px 8px; font-size: 11px; margin-left: 4px; color: #0284c7; border: 1px solid #bae6fd; font-weight: 600;" title="Reabrir a Borrador para renegociar">
                        <i class="fa-solid fa-rotate-left"></i> Reabrir
                    </button>
                `:`
                    <button onclick="convertQuoteToProject(${n.id})" class="btn-primary" style="padding: 4px 8px; font-size: 11px; margin-left: 4px; background: #059669;" title="Aprobar y Convertir en Proyecto">
                        <i class="fa-solid fa-check"></i> Convertir en Proyecto
                    </button>
                    <button onclick="declineQuotation(${n.id})" class="btn-secondary" style="padding: 4px 8px; font-size: 11px; margin-left: 4px; color: #dc2626; border: 1px solid #fecaca; font-weight: 600;" title="Marcar como Declinado por el cliente">
                        <i class="fa-solid fa-xmark"></i> Declinó
                    </button>
                `}
            </td>
        </tr>`}).join("")}async function Ke(){const o=document.getElementById("quotationsTableBody"),e=Array.isArray(W)&&W.length>0;e?S():o&&(o.innerHTML='<tr><td colspan="8" style="text-align: center; padding: 20px; color: #94a3b8;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando cotizaciones...</td></tr>');try{const t=!R||R.length===0||!H||H.length===0;let i,a,s;if(t){if([i,a,s]=await Promise.all([V(`${U}/quotations/`),V(`${U}/clients/`),V(`${U}/services/`)]),a&&a.ok){const r=await a.json();R=Array.isArray(r)?r:[],window.allClients=R}if(s&&s.ok){const r=await s.json();H=Array.isArray(r)?r:[],window.allServices=H}}else i=await V(`${U}/quotations/`);try{typeof window.populateSelectDropdowns=="function"?window.populateSelectDropdowns():typeof le=="function"&&le()}catch(r){console.warn("Aviso al poblar dropdowns de cotizaciones:",r)}if(!i.ok)throw new Error("Error HTTP "+i.status);const n=await i.json();W=Array.isArray(n)?n:[],S()}catch(t){console.error("Error al cargar cotizaciones:",t),!e&&o&&(o.innerHTML=`<tr><td colspan="8" style="text-align: center; color: #e11d48; padding: 20px;">Error al cargar cotizaciones: ${t.message||"Error de conexión"}</td></tr>`)}}typeof window<"u"&&(window.goToQuotationsPage=Ve,window.changeQuotationsPageSize=Qe,window.onQuotationSearchInput=Ge,window.onQuotationStatusFilterChange=We,window.onQuotationDateFilterChange=Xe,window.clearQuotationFilters=Je,window.renderQuotationsPaginated=S,window.loadQuotations=Ke);var v=window.API_BASE||window.location.origin+"/api/v1",I=window.allClients=window.allClients||[],T=window.allServices=window.allServices||[],Ee=window.allProjects=window.allProjects||[];window.allCategories=window.allCategories||[];window.allMaterials=window.allMaterials||[];var Z=window.EXCHANGE_RATE=window.EXCHANGE_RATE||850;window.BCV_DATA=window.BCV_DATA||{rate:850,source:"BCV Oficial"};window.authToken=window.authToken||localStorage.getItem("dalor_token")||null;const Ze=["Fabricación Metalmecánica","Montaje e Instalación en Sitio","Mantenimiento Industrial & Paradas","Soldadura Especializada & Pailería","Mecanizado & Torno","Arenado y Pintura Industrial","Obras Civiles & Eléctricas Asociadas"];typeof window<"u"&&(window.OFFICIAL_DALOR_APU_CATEGORIES=Ze);function x(o,e={}){var t=sessionStorage.getItem("dalor_token")||localStorage.getItem("dalor_token")||window.authToken||"",i=Object.assign({},e.headers||{});return t&&(i.Authorization="Bearer "+t),e.body&&!(e.body instanceof FormData)&&!i["Content-Type"]&&(i["Content-Type"]="application/json"),e.body instanceof FormData&&delete i["Content-Type"],window.fetch(o,Object.assign({},e,{headers:i}))}let Y=0;async function Ye(){var r;Y=0;const o=document.getElementById("edit_quotation_id");o&&(o.value="");const e=document.getElementById("modalQuotationTitle");e&&(e.innerHTML='<i class="fa-solid fa-calculator" style="color: var(--dalor-blue);"></i> Armar Presupuesto / Cotización Formal (APU)');const t=document.getElementById("btnSubmitQuotation");t&&(t.innerHTML='<i class="fa-solid fa-floppy-disk"></i> Guardar Presupuesto');const i=document.getElementById("quoteForm");i&&i.reset(),document.getElementById("quote_coletilla_divisas")&&(document.getElementById("quote_coletilla_divisas").checked=!0),document.getElementById("quote_coletilla_modalidad")&&(document.getElementById("quote_coletilla_modalidad").checked=!0),document.getElementById("quote_coletilla_bolivares")&&(document.getElementById("quote_coletilla_bolivares").checked=!1),document.getElementById("quote_notes")&&(document.getElementById("quote_notes").value=""),document.getElementById("quote_execution_time")&&(document.getElementById("quote_execution_time").value="15 días hábiles"),document.getElementById("quote_date")&&(document.getElementById("quote_date").value=new Date().toISOString().substring(0,10)),document.getElementById("quote_validity")&&(document.getElementById("quote_validity").value=15);const a=document.getElementById("quoteClientRiskAlert");a&&(a.style.display="none");const s=document.getElementById("quoteItemsList");s&&(s.innerHTML="");try{if((window.allClients&&window.allClients.length>0?window.allClients:I||[]).length===0){const d=window.authToken||localStorage.getItem("dalor_token")||null,m=d?{Authorization:`Bearer ${d}`}:{},p=await x(`${v}/clients/`,{headers:m});if(p.ok){const f=await p.json();I=window.allClients=Array.isArray(f)?f:[]}}if(!window._servicesLoaded){const d=window.authToken||localStorage.getItem("dalor_token")||null,m=d?{Authorization:`Bearer ${d}`}:{},p=await x(`${v}/services/`,{headers:m});if(p.ok){const f=await p.json();T=window.allServices=Array.isArray(f)?f:[],window._servicesLoaded=!0}}}catch(c){console.warn("Error cargando clientes o servicios para cotización:",c)}typeof window.populateSelectDropdowns=="function"&&window.populateSelectDropdowns();const n=document.getElementById("quote_client_id");if(n){const c=window.allClients&&window.allClients.length>0?window.allClients:I||[];if(c.length>0){let d='<option value="">-- Seleccione Cliente --</option>'+c.map(m=>`<option value="${m.id}">[${m.code}] ${m.name} (${m.rif||"Sin RIF"})</option>`).join("");n.innerHTML=d,c.length===1&&(n.value=String(c[0].id))}}document.getElementById("quote_tax_type")&&(document.getElementById("quote_tax_type").value="16"),document.getElementById("quote_tax_percent")&&(document.getElementById("quote_tax_percent").value="16"),document.getElementById("quote_execution_time")&&(document.getElementById("quote_execution_time").value="15 días hábiles"),document.getElementById("quote_currency")&&(document.getElementById("quote_currency").value="USD"),document.getElementById("quote_coletilla_divisas")&&(document.getElementById("quote_coletilla_divisas").checked=!1),document.getElementById("quote_coletilla_modalidad")&&(document.getElementById("quote_coletilla_modalidad").checked=!1),document.getElementById("quote_notes")&&(document.getElementById("quote_notes").value=""),ee(),C(),Te(),typeof window.openModal=="function"?window.openModal("modalQuotation"):(r=document.getElementById("modalQuotation"))==null||r.classList.remove("hidden")}function et(){const o=document.getElementById("quote_tax_type").value;document.getElementById("quote_tax_percent").value=o,C()}function ee(o=null){Y++;const e=document.getElementById("quoteItemsList");if(!e)return;const t=`quote_row_${Y}`,a=`<option value="">${T&&T.length>0?"-- Partida del Catálogo --":"-- Catálogo en blanco (escriba partida manual) --"}</option>`+(T||[]).map(p=>{const f=o&&(String(o.service_id)===String(p.id)||String(o.item_code)===String(p.code));return`<option value="${p.id}" data-code="${p.code}" data-unit="${p.unit_measure}" data-price="${p.unit_price_usd}" ${f?"selected":""}>[${p.code}] ${p.name} ($${p.unit_price_usd}/${p.unit_measure})</option>`}).join(""),s=o?(o.description||"").replaceAll('"',"&quot;"):"",n=o&&o.unit_measure||"Global",r=o&&o.quantity!==void 0?o.quantity:1,c=o&&o.unit_price_usd!==void 0?o.unit_price_usd:0,d=(r*c).toFixed(2),m=document.createElement("div");m.id=t,m.style.cssText="display: grid; grid-template-columns: 4fr 1fr 1fr 1fr 1fr 30px; gap: 6px; background: white; padding: 8px; border-radius: 8px; border: 1px solid #cbd5e1; align-items: center;",m.innerHTML=`

        <div>

            <select class="form-select q-srv-select" style="font-size: 11px; padding: 5px;" onchange="onServiceSelected('${t}')">

                ${a}

            </select>

            <input type="text" class="form-input q-desc" placeholder="Descripción detallada de la partida / APU" value="${s}" autocomplete="off" style="font-size: 11px; padding: 4px 6px; margin-top: 4px;" required>

        </div>

        <div>
            <input type="text" class="form-input q-unit" list="datalist_units" placeholder="Und / Medida" value="${n}" style="font-size: 11px; padding: 5px; font-weight: 700; color: #1e293b;" title="Selecciona o escribe cualquier unidad de medida (ej: Ton, Kg, m, Pulg-Diam, HH, Und)">
            <datalist id="datalist_units">
                ${Array.from(new Set(["Global","Und","Pza","m","m²","m³","ml","Kg","Ton","Litro","Galón","Horas","HH","Días","Punto","Juego","Pulg-Diam",...(T||[]).map(p=>(p.unit_measure||"").trim()).filter(Boolean)])).map(p=>`<option value="${p}">`).join("")}
            </datalist>
        </div>

        <div>
            <input type="text" inputmode="decimal" class="form-input q-qty" placeholder="Cant" value="${r}" oninput="recalcQuotationTotals()" autocomplete="off" style="font-size: 11px; padding: 5px; font-weight: bold;" required>
        </div>

        <div>
            <input type="text" inputmode="decimal" class="form-input q-price" placeholder="P. Unit ($)" value="${c}" oninput="recalcQuotationTotals()" autocomplete="off" style="font-size: 11px; padding: 5px; font-weight: bold; color: var(--dalor-blue);" required>
        </div>

        <div>
            <input type="text" class="form-input q-total" placeholder="Total ($)" value="$${d}" style="font-size: 11px; padding: 5px; font-weight: 800;" readonly>
        </div>

        <div style="text-align: center;">

            <button type="button" onclick="removeQuotationRow('${t}')" style="background: none; border: none; color: #ef4444; font-size: 16px; cursor: pointer;">&times;</button>

        </div>

    `,e.appendChild(m)}function tt(o){const e=document.getElementById(o);e&&e.remove(),C()}function ot(o){const e=document.getElementById(o);if(!e)return;const t=e.querySelector(".q-srv-select"),i=t?t.options[t.selectedIndex]:null;i&&i.value&&(e.querySelector(".q-desc").value=i.text.replace(/\[.*?\]\s*/,"").split(" ($")[0],e.querySelector(".q-unit").value=i.getAttribute("data-unit")||"Global",e.querySelector(".q-price").value=parseFloat(i.getAttribute("data-price")||0).toFixed(2)),C()}function C(){var p;const o=document.querySelectorAll("#quoteItemsList > div");let e=0;o.forEach(f=>{const l=f.querySelector(".q-qty"),u=f.querySelector(".q-price"),y=f.querySelector(".q-total"),w=parseLocalizedNumber(l?l.value:0),_=parseLocalizedNumber(u?u.value:0),g=w*_;y&&(y.value=`$${g.toFixed(2)}`),e+=g});const t=parseFloat(document.getElementById("quote_tax_percent")?document.getElementById("quote_tax_percent").value:16)||0,i=e*(t/100),a=e+i,s=document.getElementById("quote_subtotal_display"),n=document.getElementById("quote_tax_display"),r=document.getElementById("quote_total_display"),c=(((p=document.getElementById("quote_currency"))==null?void 0:p.value)||"USD").toUpperCase(),d=document.getElementById("quote_bcv_banner_box");d&&(d.style.display=c==="VES"?"block":"none");const m=typeof Z<"u"?Z:850;if(c==="VES"){const f=e*m,l=i*m,u=a*m;s&&(s.innerHTML=`$${e.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}<br><span style="font-size:11px; color:#fde047;">Bs. ${f.toLocaleString("es-VE",{minimumFractionDigits:2,maximumFractionDigits:2})}</span>`),n&&(n.innerHTML=t===0?"EXENTO (0%)":`$${i.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}<br><span style="font-size:11px; color:#fde047;">Bs. ${l.toLocaleString("es-VE",{minimumFractionDigits:2,maximumFractionDigits:2})}</span>`),r&&(r.innerHTML=`$${a.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}<br><span style="font-size:12px; color:#fde047;">Bs. ${u.toLocaleString("es-VE",{minimumFractionDigits:2,maximumFractionDigits:2})}</span>`)}else s&&(s.innerText=`$${e.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`),n&&(n.innerText=t===0?"EXENTO (0%)":`$${i.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`),r&&(r.innerText=`$${a.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`)}function Te(){C()}async function nt(o){var e;try{const t=window.authToken||localStorage.getItem("dalor_token")||null,i=t?{Authorization:`Bearer ${t}`}:{};if((window.allClients&&window.allClients.length>0?window.allClients:I||[]).length===0){const f=await x(`${v}/clients/`,{headers:i});if(f.ok){const l=await f.json();I=window.allClients=Array.isArray(l)?l:[]}}if(!window._servicesLoaded){const f=await x(`${v}/services/`,{headers:i});if(f.ok){const l=await f.json();T=window.allServices=Array.isArray(l)?l:[],window._servicesLoaded=!0}}typeof window.populateSelectDropdowns=="function"&&window.populateSelectDropdowns();const s=await x(`${v}/quotations/${o}`,{headers:i});if(!s.ok)throw new Error("No se pudo cargar la cotización para edición.");const n=await s.json(),r=document.getElementById("edit_quotation_id");r&&(r.value=n.id);const c=document.getElementById("modalQuotationTitle");c&&(c.innerHTML=`<i class="fa-solid fa-pen-to-square" style="color: var(--dalor-gold);"></i> Re-editar Presupuesto / Cotización [${n.quote_number}]`);const d=document.getElementById("btnSubmitQuotation");d&&(d.innerHTML='<i class="fa-solid fa-floppy-disk"></i> Guardar Cambios de Presupuesto');const m=document.getElementById("quote_client_id");if(m){const f=window.allClients&&window.allClients.length>0?window.allClients:I||[];if(f.length>0){let l='<option value="">-- Seleccione Cliente --</option>'+f.map(u=>`<option value="${u.id}">[${u.code}] ${u.name} (${u.rif||"Sin RIF"})</option>`).join("");m.innerHTML=l}n.client_id&&(m.value=String(n.client_id))}if(document.getElementById("quote_title")&&(document.getElementById("quote_title").value=n.project_title||""),document.getElementById("quote_location")&&(document.getElementById("quote_location").value=n.location||"Sede Central"),document.getElementById("quote_date")){let f="";n.created_at?f=n.created_at.substring(0,10):f=new Date().toISOString().substring(0,10),document.getElementById("quote_date").value=f}document.getElementById("quote_execution_time")&&(document.getElementById("quote_execution_time").value=n.execution_time||"15 días hábiles"),document.getElementById("quote_validity")&&(document.getElementById("quote_validity").value=n.validity_days||15),document.getElementById("quote_currency")&&(document.getElementById("quote_currency").value=n.currency||"USD"),document.getElementById("quote_tax_percent")&&(document.getElementById("quote_tax_percent").value=n.tax_percent!==void 0&&n.tax_percent!==null?n.tax_percent:n.tax_usd>0?16:0),document.getElementById("quote_notes")&&(document.getElementById("quote_notes").value=n.notes||""),document.getElementById("quote_coletilla_divisas")&&(document.getElementById("quote_coletilla_divisas").checked=n.coletilla_divisas!==!1),document.getElementById("quote_coletilla_modalidad")&&(document.getElementById("quote_coletilla_modalidad").checked=n.coletilla_modalidad!==!1),document.getElementById("quote_coletilla_bolivares")&&(document.getElementById("quote_coletilla_bolivares").checked=!!n.coletilla_bolivares);const p=document.getElementById("quoteItemsList");p&&(p.innerHTML="",Y=0,n.items&&n.items.length>0?n.items.forEach(f=>ee(f)):ee()),C(),typeof window.openModal=="function"?window.openModal("modalQuotation"):(e=document.getElementById("modalQuotation"))==null||e.classList.remove("hidden")}catch(t){console.error("Error al re-editar presupuesto:",t),alert("Error cargando presupuesto: "+t.message)}}async function it(o){var p,f;o&&o.preventDefault&&o.preventDefault();const e=document.getElementById("quote_client_id"),t=e?parseInt(e.value):null;if(!t){alert("Por favor selecciona un cliente de la lista.");return}const i=document.querySelectorAll("#quoteItemsList > div");let a=[];if(i.forEach(l=>{const u=l.querySelector(".q-srv-select"),y=u&&u.value?parseInt(u.value):null,w=u?u.options[u.selectedIndex]:null,_=w?w.getAttribute("data-code"):null,g=l.querySelector(".q-desc")?l.querySelector(".q-desc").value:"",b=l.querySelector(".q-unit")?l.querySelector(".q-unit").value:"Global",oe=l.querySelector(".q-qty")?l.querySelector(".q-qty").value:"1",ne=l.querySelector(".q-price")?l.querySelector(".q-price").value:"0",ye=parseLocalizedNumber(oe)||1,_e=parseLocalizedNumber(ne)||0;a.push({service_id:y,item_code:_,description:g,unit_measure:b,quantity:ye,unit_price_usd:_e,total_usd:Number((ye*_e).toFixed(2))})}),a.length===0){alert("Agrega al menos una partida a la cotización.");return}const s=document.getElementById("edit_quotation_id")?document.getElementById("edit_quotation_id").value:"",n=!!s,r=document.getElementById("quote_date")?document.getElementById("quote_date").value:"";let c;r&&(c=`${r}T12:00:00`);const d={client_id:t,project_title:document.getElementById("quote_title").value,location:document.getElementById("quote_location").value||"Sede Central",execution_time:(document.getElementById("quote_execution_time").value||"").trim()||"15 días hábiles",currency:document.getElementById("quote_currency").value||"USD",validity_days:parseInt(document.getElementById("quote_validity")?document.getElementById("quote_validity").value:15)||15,tax_percent:parseLocalizedNumber((p=document.getElementById("quote_tax_percent"))==null?void 0:p.value)||0,exchange_rate:typeof Z<"u"?Z:850,notes:(((f=document.getElementById("quote_notes"))==null?void 0:f.value)||"").trim(),coletilla_divisas:document.getElementById("quote_coletilla_divisas")?document.getElementById("quote_coletilla_divisas").checked:!1,coletilla_modalidad:document.getElementById("quote_coletilla_modalidad")?document.getElementById("quote_coletilla_modalidad").checked:!1,coletilla_bolivares:document.getElementById("quote_coletilla_bolivares")?document.getElementById("quote_coletilla_bolivares").checked:!1,created_at:c,items:a},m=document.getElementById("btnSubmitQuotation");m&&(m.disabled=!0,m.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Guardando...');try{const l=n?`${v}/quotations/${s}`:`${v}/quotations/`,y=await x(l,{method:n?"PUT":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(d)});if(!y.ok){let g="Error al guardar el presupuesto";try{const b=await y.json();b&&b.detail&&(g=typeof b.detail=="string"?b.detail:JSON.stringify(b.detail))}catch{}throw new Error(g)}const w=await y.json();de("modalQuotation");const _=document.getElementById("quoteForm")||document.getElementById("quotationForm");_&&_.reset(),document.getElementById("edit_quotation_id")&&(document.getElementById("edit_quotation_id").value=""),typeof showToastNotification=="function"?showToastNotification(n?`Presupuesto ${w.quote_number||""} actualizado con éxito`:`Presupuesto ${w.quote_number||""} emitido con éxito`,"success"):typeof showToast=="function"?showToast(n?`Presupuesto ${w.quote_number||""} actualizado con éxito`:"Presupuesto creado con éxito","success"):alert(n?"Presupuesto actualizado con éxito.":"Presupuesto creado con éxito."),await loadQuotations()}catch(l){console.error("Error al guardar presupuesto:",l),typeof Swal<"u"?Swal.fire({icon:"error",title:"Error al Guardar Presupuesto",text:l.message||String(l)}):alert("Error al guardar presupuesto: "+l.message)}finally{m&&(m.disabled=!1,m.innerHTML='<i class="fa-solid fa-floppy-disk"></i> Guardar Presupuesto')}}function at(){const o=document.getElementById("converting_quotation_id");o&&(o.value=""),sessionStorage.removeItem("dalor_active_converting_quote_id");const e=document.getElementById("quote_conversion_banner");e&&e.classList.add("hidden");const t=document.getElementById("projectCreateForm");t&&t.reset(),switchProjectSubtab("list")}async function rt(o){try{if(sessionStorage.setItem("dalor_active_converting_quote_id",String(o)),!I||I.length===0)try{const u=await x(`${v}/clients/`);u.ok&&(I=await u.json())}catch{}const e=await x(`${v}/quotations/${o}`);if(!e.ok)throw new Error("No se pudo cargar la información del presupuesto.");const t=await e.json();switchView("projects","proyectos"),switchProjectSubtab("form"),typeof window.populatePlanDropdownSelectors=="function"&&window.populatePlanDropdownSelectors();const i=document.getElementById("converting_quotation_id");i&&(i.value=t.id);const a=document.getElementById("quote_conversion_banner"),s=document.getElementById("quote_conversion_text");a&&a.classList.remove("hidden");const n=t.client?t.client.name:t.client_name||"Cliente";s&&(s.innerText=`Presupuesto [${t.quote_number}] para ${n}. Monto: $${t.total_usd.toLocaleString("en-US",{minimumFractionDigits:2})}. Revisa y completa los campos a continuación:`);const r=document.getElementById("new_proj_code");if(r&&(r.readOnly=!0,r.style.backgroundColor="#f1f5f9",r.style.cursor="not-allowed",x(`${v}/projects/next-code`).then(u=>u.json()).then(u=>{u&&u.next_code&&r&&(r.value=u.next_code)}).catch(u=>{console.warn("Fallback cálculo código proyecto:",u);const y=(Ee?Ee.length:0)+1;r&&(r.value=`PRJ-2026-${String(y).padStart(3,"0")}`)})),document.getElementById("new_proj_name")&&(document.getElementById("new_proj_name").value=t.project_title||""),document.getElementById("new_proj_start_date")){let u=(t.created_at||"").substring(0,10);document.getElementById("new_proj_start_date").value=u||new Date().toISOString().substring(0,10)}const c=document.getElementById("new_proj_client_id");c&&t.client_id&&(c.value=String(t.client_id));const d=(t.location||"").trim(),m=!d||d.toLowerCase().includes("sede")||d.toLowerCase().includes("central")||d.toLowerCase().includes("taller")||d.toLowerCase().includes("guacara");typeof setProjectType=="function"?setProjectType(m?"sede":"foraneo"):typeof window.setProjectType=="function"&&window.setProjectType(m?"sede":"foraneo"),document.getElementById("new_proj_location")&&(document.getElementById("new_proj_location").value=d||(m?"Sede Central (Taller Guacara)":""));let p=30;if(t.execution_time){const u=t.execution_time.match(/\d+/);u&&(p=parseInt(u[0]))}document.getElementById("new_proj_duration")&&(document.getElementById("new_proj_duration").value=p),document.getElementById("new_proj_contract")&&(document.getElementById("new_proj_contract").value=t.total_usd.toFixed(2));let f=`Obra adjudicada bajo Presupuesto ${t.quote_number}.
Partidas y APU contratadas:
`;t.items&&t.items.length>0?f+=t.items.map((u,y)=>`${y+1}. [${u.item_code||"SER"}] ${u.description} (Cant: ${u.quantity} ${u.unit_measure||"Global"})`).join(`
`):f+=t.project_title,document.getElementById("new_proj_scope")&&(document.getElementById("new_proj_scope").value=f),document.getElementById("new_proj_labor")&&(document.getElementById("new_proj_labor").value="0.00"),document.getElementById("new_proj_fuel")&&(document.getElementById("new_proj_fuel").value="0.00"),document.getElementById("new_proj_tools")&&(document.getElementById("new_proj_tools").value="0.00"),document.getElementById("new_proj_services")&&(document.getElementById("new_proj_services").value="0.00"),typeof updatePlanMaterialsCostTotal=="function"?updatePlanMaterialsCostTotal():typeof window.updatePlanMaterialsCostTotal=="function"?window.updatePlanMaterialsCostTotal():document.getElementById("new_proj_materials")&&(document.getElementById("new_proj_materials").value="0.00");const l=document.getElementById("projectPhasesContainer");l&&typeof addProjectPhaseRow=="function"&&(l.innerHTML="",window.phaseRowsCount=0,addProjectPhaseRow("Fase 1: Ejecución del Proyecto",[],p,0)),recalcProjectBudgetPreview(),window.scrollTo({top:0,behavior:"smooth"})}catch(e){console.error("Error al convertir presupuesto:",e),alert("Error al vincular presupuesto: "+e.message)}}async function Pe(o){const e=document.getElementById("quoteClientRiskAlert"),t=document.getElementById("quoteClientRiskDetails");if(!e||!o){e&&(e.style.display="none");return}try{const i=await x(`${v}/clients/${o}/credit-risk`);if(!i.ok){e.style.display="none";return}const a=await i.json();if(a&&a.has_risk){let s=(a.bad_debts||[]).map(n=>`"¢ <strong>${n.invoice_number||"Doc"}</strong>: $${(n.amount_usd||0).toFixed(2)} USD <em>(${n.reason||"Sin motivo"})</em>`).join("<br>");t&&(t.innerHTML=`
                    Este cliente posee antecedentes de <strong>cuenta incobrable / castigada</strong> por un total de <strong>$${(a.total_bad_debt_usd||0).toFixed(2)} USD</strong>.<br>
                    <div style="margin-top: 4px; padding: 4px 6px; background: rgba(255,255,255,0.7); border-radius: 4px;">${s}</div>
                    <span style="font-size: 10px; color: #881337; margin-top: 4px; display: block;">
                        <strong>Decisión Operativa:</strong> Puede autorizar emitir esta cotización bajo supervisión comercial o cambiar a otro cliente.
                    </span>
                `),e.style.display="block",window.quoteClientRiskDismissed=!1}else e.style.display="none",window.quoteClientRiskDismissed=!0}catch(i){console.warn("Error al verificar riesgo crediticio:",i),e&&(e.style.display="none")}}function lt(o){if(!o){const e=document.getElementById("quoteClientRiskAlert");e&&(e.style.display="none");return}Pe(o)}function st(){const o=document.getElementById("quoteClientRiskAlert");o&&(o.style.display="none"),window.quoteClientRiskDismissed=!0;const e=document.getElementById("quote_client_id"),t=e?e.options[e.selectedIndex]:null;t&&console.log(`[Riesgo Crediticio] Cliente ${t.text} autorizado manualmente para cotización.`)}function dt(){const o=document.getElementById("quote_client_id");o&&(o.value="");const e=document.getElementById("quoteClientRiskAlert");e&&(e.style.display="none"),window.quoteClientRiskDismissed=!1}async function ct(o){if(!confirm(`¿El cliente ha declinado o rechazado esta cotización?

Se marcará como DECLINADA en el sistema. Esto no genera proyectos ni afectará la caja.`))return;const e=prompt("Indica opcionalmente el motivo del rechazo (ej: Precio fuera de presupuesto, Plazo de entrega, Desistimiento del cliente):","")||"";try{const t=`${v}/quotations/${o}/decline`+(e?`?reason=${encodeURIComponent(e)}`:""),i=await x(t,{method:"POST"});if(!i.ok){const s=await i.json().catch(()=>({}));throw new Error(s.detail||"Error al declinar cotización.")}const a=await i.json();typeof showNotification=="function"?showNotification(a.message||"Cotización marcada como DECLINADA.","info"):typeof alert=="function"&&alert(a.message||"Cotización marcada como DECLINADA."),typeof loadQuotations=="function"&&await loadQuotations()}catch(t){console.error("Error al declinar presupuesto:",t),alert(t.message||"No se pudo registrar la declinación.")}}async function ut(o){if(confirm("¿Deseas reactivar esta cotización y devolverla al estado BORRADOR para volver a editarla o renegociarla?"))try{const e=await x(`${v}/quotations/${o}/reopen`,{method:"POST"});if(!e.ok){const i=await e.json().catch(()=>({}));throw new Error(i.detail||"Error al reabrir cotización.")}const t=await e.json();typeof showNotification=="function"?showNotification(t.message||"Cotización reactivada como Borrador.","success"):typeof alert=="function"&&alert(t.message||"Cotización reactivada como Borrador."),typeof loadQuotations=="function"&&await loadQuotations()}catch(e){console.error("Error al reabrir presupuesto:",e),alert(e.message||"No se pudo reabrir la cotización.")}}typeof window<"u"&&(window.openNewQuotationModal=Ye,window.onTaxTypeChanged=et,window.addQuotationRow=ee,window.removeQuotationRow=tt,window.onServiceSelected=ot,window.recalcQuotationTotals=C,window.onQuotationCurrencyChanged=Te,window.editQuotation=nt,window.submitCreateQuotation=it,window.cancelQuotationConversion=at,window.convertQuoteToProject=rt,window.declineQuotation=ct,window.reopenQuotation=ut,window.checkQuoteClientCreditRisk=Pe,window.onQuoteClientChanged=lt,window.confirmQuoteClientRisk=st,window.cancelQuoteClientRisk=dt);var pt=window.API_BASE||window.location.origin+"/api/v1";window.allClients=window.allClients||[];window.allServices=window.allServices||[];window.allProjects=window.allProjects||[];window.allCategories=window.allCategories||[];window.allMaterials=window.allMaterials||[];var mt=window.EXCHANGE_RATE=window.EXCHANGE_RATE||850;window.BCV_DATA=window.BCV_DATA||{rate:850,source:"BCV Oficial"};window.authToken=window.authToken||localStorage.getItem("dalor_token")||null;const ft=["Fabricación Metalmecánica","Montaje e Instalación en Sitio","Mantenimiento Industrial & Paradas","Soldadura Especializada & Pailería","Mecanizado & Torno","Arenado y Pintura Industrial","Obras Civiles & Eléctricas Asociadas"];typeof window<"u"&&(window.OFFICIAL_DALOR_APU_CATEGORIES=ft);function gt(o,e={}){var t=sessionStorage.getItem("dalor_token")||localStorage.getItem("dalor_token")||window.authToken||"",i=Object.assign({},e.headers||{});return t&&(i.Authorization="Bearer "+t),e.body&&!(e.body instanceof FormData)&&!i["Content-Type"]&&(i["Content-Type"]="application/json"),e.body instanceof FormData&&delete i["Content-Type"],window.fetch(o,Object.assign({},e,{headers:i}))}async function wt(o){try{const e=await gt(`${pt}/quotations/${o}`);if(!e.ok)throw new Error("No se pudo cargar la cotización.");const t=await e.json(),i=t.exchange_rate||mt||800,a=(t.currency||"USD").toUpperCase();let s="$",n="USD",r="",c="",d="P. Unit ($)",m="Total ($)";if(a==="USD"){s="$",n="USD",d="P. Unit ($ USD)",m="Total ($ USD)";const w=`$${t.subtotal_usd.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`,_=t.tax_usd===0?"EXENTO (0%)":`$${t.tax_usd.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`,g=`$${t.total_usd.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`;c=`

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

            `,r=""}else if(a==="VES"){s="Bs.",n="VES",d="P. Unit (Bs.)",m="Total (Bs.)";const w=t.subtotal_usd*i,_=t.tax_usd*i,g=t.total_usd*i,b=`Bs. ${w.toLocaleString("es-VE",{minimumFractionDigits:2,maximumFractionDigits:2})}`,oe=_===0?"EXENTO (0%)":`Bs. ${_.toLocaleString("es-VE",{minimumFractionDigits:2,maximumFractionDigits:2})}`,ne=`Bs. ${g.toLocaleString("es-VE",{minimumFractionDigits:2,maximumFractionDigits:2})}`;c=`

                <div style="display: flex; justify-content: space-between; font-size: 11.5px; margin-bottom: 4px;">

                    <span style="color: #475569;">Subtotal:</span>

                    <span style="font-weight: 700; color: #1e293b;">${b}</span>

                </div>

                <div style="display: flex; justify-content: space-between; font-size: 11.5px; margin-bottom: 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">

                    <span style="color: #475569;">IVA (${t.tax_percent}%):</span>

                    <span style="font-weight: 700; color: ${_===0?"#10b981":"#d97706"};">${oe}</span>

                </div>

                <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: 900; color: #002B49;">

                    <span>TOTAL BS:</span>

                    <span style="color: #0072B8;">${ne}</span>

                </div>

            `,r=""}else{s="â‚¬",n="EUR",d="P. Unit (â‚¬ EUR)",m="Total (â‚¬ EUR)";const w=`â‚¬ ${t.subtotal_usd.toLocaleString("de-DE",{minimumFractionDigits:2,maximumFractionDigits:2})}`,_=t.tax_usd===0?"EXENTO (0%)":`â‚¬ ${t.tax_usd.toLocaleString("de-DE",{minimumFractionDigits:2,maximumFractionDigits:2})}`,g=`â‚¬ ${t.total_usd.toLocaleString("de-DE",{minimumFractionDigits:2,maximumFractionDigits:2})}`;c=`

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

            `,r=""}let p=[];(t.coletilla_divisas===!0||t.terms_currency_usd_only===!0)&&p.push("<b>Condición de Pago:</b> Solo pagadero en divisas (USD)."),(t.coletilla_modalidad===!0||t.terms_check_payment_mode===!0)&&p.push("<b>Modalidad de Pago:</b> Consultar modalidad de pago."),t.coletilla_bolivares===!0&&p.push("<b>Pago en Bolívares (Bs.):</b> En caso de realizar el pago en Bolívares, se calculará a la tasa oficial del Banco Central de Venezuela (BCV) correspondiente a la fecha valor del pago efectivo.");let f="";t.notes&&t.notes.trim()&&(f=`
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
            `);const u=(t.items||[]).map((w,_)=>{let g=`$${w.unit_price_usd.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`,b=`$${w.total_usd.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`;return a==="VES"?(g=`Bs. ${(w.unit_price_usd*i).toLocaleString("es-VE",{minimumFractionDigits:2,maximumFractionDigits:2})}`,b=`Bs. ${(w.total_usd*i).toLocaleString("es-VE",{minimumFractionDigits:2,maximumFractionDigits:2})}`):a==="EUR"&&(g=`â‚¬ ${w.unit_price_usd.toLocaleString("de-DE",{minimumFractionDigits:2,maximumFractionDigits:2})}`,b=`â‚¬ ${w.total_usd.toLocaleString("de-DE",{minimumFractionDigits:2,maximumFractionDigits:2})}`),`

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

                        <th style="width: 95px; padding: 6px 8px; border: 1px solid #002B49; font-size: 10.5px; text-align: right;">${d}</th>

                        <th style="width: 105px; padding: 6px 8px; border: 1px solid #002B49; font-size: 10.5px; text-align: right;">${m}</th>

                    </tr>

                </thead>

                <tbody>

                    ${u}

                </tbody>

            </table>



            <!-- Bloque de Totales -->

            <div style="display: flex; justify-content: flex-end; margin-bottom: 16px; page-break-inside: avoid;">

                <div style="width: 310px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 14px;">

                    ${c}

                </div>

            </div>



            <!-- Notas y Coletillas Comerciales (Punto 4 y 5) -->
            ${f}
            ${l}

            <!-- Coletilla de Condiciones Cambiarias -->
            ${r}



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

        `;document.getElementById("modalPrintPreviewContent").innerHTML=y,document.getElementById("previewModalTitle").textContent=`Presupuesto ${t.quote_number} | ${t.client&&t.client.name||"Cliente"}`,document.getElementById("modalPrintPreview").classList.remove("hidden")}catch(e){alert("Error al visualizar cotización: "+e.message)}}function yt(){var t;const o=document.getElementById("modalPrintPreviewContent"),e=((t=document.getElementById("previewModalTitle"))==null?void 0:t.textContent)||"Presupuesto DALOR";typeof window.printElementHtml=="function"&&o?window.printElementHtml(o,e):window.print()}typeof window<"u"&&(window.printQuotation=wt,window.triggerPrintFromModal=yt);var F=window.API_BASE||window.location.origin+"/api/v1";window.allClients=window.allClients||[];var h=window.allServices=window.allServices||[];window.allProjects=window.allProjects||[];window.allCategories=window.allCategories||[];window.allMaterials=window.allMaterials||[];window.EXCHANGE_RATE=window.EXCHANGE_RATE||850;window.BCV_DATA=window.BCV_DATA||{rate:850,source:"BCV Oficial"};window.authToken=window.authToken||localStorage.getItem("dalor_token")||null;const Fe=["Fabricación Metalmecánica","Montaje e Instalación en Sitio","Mantenimiento Industrial & Paradas","Soldadura Especializada & Pailería","Mecanizado & Torno","Arenado y Pintura Industrial","Obras Civiles & Eléctricas Asociadas"];typeof window<"u"&&(window.OFFICIAL_DALOR_APU_CATEGORIES=Fe);function q(o,e={}){var t=sessionStorage.getItem("dalor_token")||localStorage.getItem("dalor_token")||window.authToken||"",i=Object.assign({},e.headers||{});return t&&(i.Authorization="Bearer "+t),e.body&&!(e.body instanceof FormData)&&!i["Content-Type"]&&(i["Content-Type"]="application/json"),e.body instanceof FormData&&delete i["Content-Type"],window.fetch(o,Object.assign({},e,{headers:i}))}let P=[],z=1,qe=10,L="",se="";function _t(o){z=o,N();const e=document.getElementById("servicesTableBody");e&&e.scrollIntoView({behavior:"smooth",block:"nearest"})}function bt(o){qe=parseInt(o)||10,z=1,N()}function vt(o){L=(o||"").toLowerCase().trim(),fe()}function xt(o){se=(o||"").trim(),fe()}function fe(){P=(h||[]).filter(o=>{const e=!L||o.name&&o.name.toLowerCase().includes(L)||o.code&&o.code.toLowerCase().includes(L)||o.unit_measure&&o.unit_measure.toLowerCase().includes(L),t=!se||o.category===se;return e&&t}),z=1,N()}function N(){const o=document.getElementById("servicesTableBody");if(!o)return;const e=P;if(e.length===0){o.innerHTML=`<tr><td colspan="8" style="text-align: center; padding: 25px; color: #64748b; font-weight: 500;">
            <i class="fa-solid fa-folder-open" style="font-size: 24px; color: #94a3b8; margin-bottom: 8px; display: block;"></i>
            No se encontraron partidas que coincidan con los filtros.
        </td></tr>`;const n=document.getElementById("servicesPaginationContainer");n&&(n.innerHTML="");return}const t=typeof window.renderPaginationControls=="function"?window.renderPaginationControls:typeof j=="function"?j:()=>({startIndex:0,endIndex:e.length}),{startIndex:i,endIndex:a}=t({containerId:"servicesPaginationContainer",totalItems:e.length,currentPage:z,pageSize:qe,onPageChange:"goToServicesPage",onPageSizeChange:"changeServicesPageSize",itemLabel:"partida(s)",pageSizeOptions:[10,25,50,100]}),s=e.slice(i,a);o.innerHTML=s.map(n=>{const r=(n.unit_price_usd||0)-(n.base_cost_usd||0);return`
        <tr>
            <td style="font-weight: 800; color: var(--dalor-blue);">${n.code}</td>
            <td style="font-weight: 600; color: var(--dalor-navy);">${n.name}</td>
            <td><span style="font-size: 11px; background: #e0f2fe; color: #0369a1; padding: 3px 8px; border-radius: 6px; font-weight: 700;">${n.category}</span></td>
            <td>${n.unit_measure}</td>
            <td>$${Number(n.base_cost_usd||0).toFixed(2)}</td>
            <td style="font-weight: 800; color: var(--dalor-navy);">$${Number(n.unit_price_usd||0).toFixed(2)}</td>
            <td style="color: #059669; font-weight: 700;">+$${r.toFixed(2)}</td>
            <td style="text-align: center; white-space: nowrap;">
                <button onclick="openEditServiceModal(${n.id})" class="btn-secondary" style="padding: 4px 8px; color: var(--dalor-blue); margin-right: 4px;" title="Editar Partida">
                    <i class="fa-solid fa-pen-to-square"></i>
                </button>
                <button onclick="deleteService(${n.id})" class="btn-secondary" style="padding: 4px 8px; color: #ef4444;" title="Inactivar Partida">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        </tr>`}).join("")}async function te(){const o=document.getElementById("servicesTableBody");o&&(o.innerHTML='<tr><td colspan="8" style="text-align: center; padding: 20px; color: #94a3b8;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando partidas...</td></tr>');try{const e=await q(`${F}/services/`);if(!e.ok)throw new Error("Error HTTP "+e.status);const t=await e.json();h=Array.isArray(t)?t:[],P=h,z=1,N()}catch{o&&(o.innerHTML='<tr><td colspan="8" style="text-align: center; color: #e11d48;">Error al cargar servicios.</td></tr>')}}function ge(){try{return JSON.parse(localStorage.getItem("dalor_custom_apu_categories")||"[]")}catch{return[]}}function we(){try{return JSON.parse(localStorage.getItem("dalor_custom_apu_units")||"[]")}catch{return[]}}function M(o){if(!o||typeof o!="string")return;const e=o.trim();if(!(!e||e==="__NEW__"))try{const t=ge();t.includes(e)||(t.push(e),localStorage.setItem("dalor_custom_apu_categories",JSON.stringify(t)))}catch{}}function k(o){if(!o||typeof o!="string")return;const e=o.trim();if(!(!e||e==="__NEW__"))try{const t=we();t.includes(e)||(t.push(e),localStorage.setItem("dalor_custom_apu_units",JSON.stringify(t)))}catch{}}function De(){const o=new Set(Fe);return ge().forEach(e=>e&&o.add(e.trim())),(window.allServices||h||[]).forEach(e=>{e.category&&typeof e.category=="string"&&e.category.trim()&&e.category!=="__NEW__"&&o.add(e.category.trim())}),Array.from(o)}function Le(){const o=["Kilogramo (kg)","Tonelada (ton)","Metro (m)","Metro Cuadrado (m²)","Metro Cúbico (m³)","Pieza (und)","Global (gl)","Hora-Hombre (hh)","Día (dia)","Pulgada-Diámetro (pulg-diam)","Litro (L)","Galón (gal)"],e=new Set(o);return we().forEach(t=>t&&e.add(t.trim())),(window.allServices||h||[]).forEach(t=>{t.unit_measure&&typeof t.unit_measure=="string"&&t.unit_measure.trim()&&t.unit_measure!=="__NEW__"&&e.add(t.unit_measure.trim())}),Array.from(e)}function O(){const o=De(),e=Le(),t=o.map(d=>`<option value="${d}">${d}</option>`).join("")+'<option value="__NEW__" style="color: #0284c7; font-weight: 800;">âž• Escribir Nueva Categoría...</option>',i=e.map(d=>`<option value="${d}">${d}</option>`).join("")+'<option value="__NEW__" style="color: #0284c7; font-weight: 800;">âž• Escribir Nueva Unidad...</option>',a=document.getElementById("srv_category");if(a){const d=a.value;a.innerHTML=t,d&&d!=="__NEW__"&&o.includes(d)?a.value=d:o.length>0&&d!=="__NEW__"&&(a.value=o[0])}const s=document.getElementById("srv_unit");if(s){const d=s.value;s.innerHTML=i,d&&d!=="__NEW__"&&e.includes(d)?s.value=d:e.length>0&&d!=="__NEW__"&&(s.value=e[0])}const n=document.getElementById("edit_srv_category");if(n){const d=n.value;n.innerHTML=t,d&&d!=="__NEW__"&&o.includes(d)&&(n.value=d)}const r=document.getElementById("edit_srv_unit");if(r){const d=r.value;r.innerHTML=i,d&&d!=="__NEW__"&&e.includes(d)&&(r.value=d)}const c=document.getElementById("serviceCategoryFilter");if(c){const d=c.value;c.innerHTML='<option value="">Todas las Categorías</option>'+o.map(m=>`<option value="${m}">${m}</option>`).join(""),d&&o.includes(d)&&(c.value=d)}}function Et(o){const e=document.getElementById("srv_new_category");e&&(o==="__NEW__"?(e.classList.remove("hidden"),e.focus()):(e.classList.add("hidden"),e.value=""))}function ht(o){const e=document.getElementById("srv_new_unit");e&&(o==="__NEW__"?(e.classList.remove("hidden"),e.focus()):(e.classList.add("hidden"),e.value=""))}function It(o){const e=document.getElementById("edit_srv_new_category");e&&(o==="__NEW__"?(e.classList.remove("hidden"),e.focus()):(e.classList.add("hidden"),e.value=""))}function St(o){const e=document.getElementById("edit_srv_new_unit");e&&(o==="__NEW__"?(e.classList.remove("hidden"),e.focus()):(e.classList.add("hidden"),e.value=""))}async function Bt(){const o=document.getElementById("serviceForm");o&&o.reset();const e=document.getElementById("srv_new_category");e&&(e.value="",e.classList.add("hidden"));const t=document.getElementById("srv_new_unit");t&&(t.value="",t.classList.add("hidden"));const i=document.getElementById("srv_code");i&&(i.value="Generando correlativo...",i.setAttribute("readonly","true"),i.style.backgroundColor="#f1f5f9",i.style.cursor="not-allowed",i.style.fontWeight="700");const a=document.getElementById("newSrvMarginBadge");a&&(a.innerHTML="");const s=document.getElementById("btnSubmitCreateService");s&&(s.disabled=!1,s.title="",s.innerHTML='<i class="fa-solid fa-floppy-disk"></i> Guardar Partida'),O(),Se("modalService");try{const n=await q(`${F}/services/next-code`);if(n.ok){const r=await n.json();i&&r&&r.next_code&&(i.value=r.next_code)}else if(i){const r=(h?h.length:0)+1;i.value=`APU-${String(r).padStart(3,"0")}`}}catch(n){console.warn("No se pudo obtener correlativo de APU:",n),i&&i.value.includes("Generando")&&(i.value="APU-001")}}async function $t(o){var r,c,d,m,p,f,l,u,y,w;o&&o.preventDefault&&o.preventDefault();let e=(r=document.getElementById("srv_category"))==null?void 0:r.value;if(e==="__NEW__"){const _=(((c=document.getElementById("srv_new_category"))==null?void 0:c.value)||"").trim();if(!_){alert("Por favor escribe el nombre de la nueva categoría."),(d=document.getElementById("srv_new_category"))==null||d.focus();return}e=_,M(e)}let t=(m=document.getElementById("srv_unit"))==null?void 0:m.value;if(t==="__NEW__"){const _=(((p=document.getElementById("srv_new_unit"))==null?void 0:p.value)||"").trim();if(!_){alert("Por favor escribe la unidad de medida (ej: Kg, Ton, Galón, etc.)."),(f=document.getElementById("srv_new_unit"))==null||f.focus();return}t=_,k(t)}const i=parseFloat(String(((l=document.getElementById("srv_cost"))==null?void 0:l.value)||"").replace(",","."))||0,a=parseFloat(String(((u=document.getElementById("srv_price"))==null?void 0:u.value)||"").replace(",","."))||0,s={code:document.getElementById("srv_code").value.trim(),name:document.getElementById("srv_name").value.trim(),category:e,unit_measure:t,base_cost_usd:i,unit_price_usd:a};if(!s.name){alert("El nombre de la partida es obligatorio."),(y=document.getElementById("srv_name"))==null||y.focus();return}if(a<i){const _=(a-i).toFixed(2);alert(`⛔ OPERACIÓN DENEGADA | MARGEN NEGATIVO

El Precio de Venta ($${a.toFixed(2)}) no puede ser menor al Costo Base ($${i.toFixed(2)}).

Pérdida calculada: -$${Math.abs(_)} USD.

Por favor ajusta el precio para garantizar la rentabilidad.`),(w=document.getElementById("srv_price"))==null||w.focus();return}const n=document.getElementById("btnSubmitCreateService")||document.querySelector('#serviceForm button[type="submit"]');n&&(n.disabled=!0,n.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Guardando...');try{const _=await q(`${F}/services/`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(s)});if(_.ok){const g=await _.json();de("modalService"),typeof showToastNotification=="function"?showToastNotification(`Partida ${g.code} registrada exitosamente`,"success"):typeof showToast=="function"?showToast(`Partida ${g.code} registrada exitosamente`,"success"):alert(`Partida ${g.code} registrada exitosamente.`),M(g.category||e),k(g.unit_measure||t),await ue(),await te(),O()}else{const g=await _.json().catch(()=>({}));alert("Error al registrar partida: "+(g.detail||"Respuesta inválida del servidor"))}}catch(_){console.error("Error al guardar servicio:",_),alert("Error de conexión al guardar servicio.")}finally{n&&(n.disabled=!1,n.innerHTML='<i class="fa-solid fa-floppy-disk"></i> Guardar Partida')}}async function Ct(o){let e=window.allServices&&window.allServices.length>0?window.allServices:h||[];(!e||e.length===0)&&(e=typeof P<"u"&&P.length>0?P:[]);let t=e.find(r=>r&&(r.id===o||String(r.id)===String(o)));if(!t)try{const r=await q(`${F}/services/`);if(r.ok){const c=await r.json();window.allServices=Array.isArray(c)?c:[],h=window.allServices,t=h.find(d=>d&&(d.id===o||String(d.id)===String(o)))}}catch{}if(!t){alert("Partida no encontrada en el catálogo.");return}O();const i=document.getElementById("edit_srv_new_category");i&&(i.value="",i.classList.add("hidden"));const a=document.getElementById("edit_srv_new_unit");a&&(a.value="",a.classList.add("hidden")),document.getElementById("edit_srv_id").value=t.id,document.getElementById("edit_srv_code").value=t.code,document.getElementById("edit_srv_name").value=t.name;const s=document.getElementById("edit_srv_category");if(s){if(t.category&&!Array.from(s.options).some(r=>r.value===t.category)){const r=document.createElement("option");r.value=t.category,r.textContent=t.category,s.insertBefore(r,s.lastElementChild)}s.value=t.category}const n=document.getElementById("edit_srv_unit");if(n){if(t.unit_measure&&!Array.from(n.options).some(r=>r.value===t.unit_measure)){const r=document.createElement("option");r.value=t.unit_measure,r.textContent=t.unit_measure,n.insertBefore(r,n.lastElementChild)}n.value=t.unit_measure}document.getElementById("edit_srv_cost").value=t.base_cost_usd,document.getElementById("edit_srv_price").value=t.unit_price_usd,je(),Se("modalEditService")}async function At(o){var c,d,m,p,f,l,u,y,w,_;o&&o.preventDefault&&o.preventDefault();const e=document.getElementById("edit_srv_id").value;let t=(c=document.getElementById("edit_srv_category"))==null?void 0:c.value;if(t==="__NEW__"){const g=(((d=document.getElementById("edit_srv_new_category"))==null?void 0:d.value)||"").trim();if(!g){alert("Por favor escribe el nombre de la nueva categoría."),(m=document.getElementById("edit_srv_new_category"))==null||m.focus();return}t=g,M(t)}let i=(p=document.getElementById("edit_srv_unit"))==null?void 0:p.value;if(i==="__NEW__"){const g=(((f=document.getElementById("edit_srv_new_unit"))==null?void 0:f.value)||"").trim();if(!g){alert("Por favor escribe la unidad de medida."),(l=document.getElementById("edit_srv_new_unit"))==null||l.focus();return}i=g,k(i)}const a=parseFloat(String(((u=document.getElementById("edit_srv_cost"))==null?void 0:u.value)||"").replace(",","."))||0,s=parseFloat(String(((y=document.getElementById("edit_srv_price"))==null?void 0:y.value)||"").replace(",","."))||0,n={name:document.getElementById("edit_srv_name").value.trim(),category:t,unit_measure:i,base_cost_usd:a,unit_price_usd:s};if(!n.name){alert("El nombre de la partida es obligatorio."),(w=document.getElementById("edit_srv_name"))==null||w.focus();return}if(s<a){const g=(s-a).toFixed(2);alert(`⛔ OPERACIÓN DENEGADA | MARGEN NEGATIVO

El Precio de Venta ($${s.toFixed(2)}) no puede ser menor al Costo Base ($${a.toFixed(2)}).

Pérdida calculada: -$${Math.abs(g)} USD.

Por favor ajusta el precio para garantizar la rentabilidad.`),(_=document.getElementById("edit_srv_price"))==null||_.focus();return}const r=document.querySelector('#editServiceForm button[type="submit"]');r&&(r.disabled=!0,r.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Guardando...');try{const g=await q(`${F}/services/${e}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(n)});if(g.ok)de("modalEditService"),typeof showToastNotification=="function"?showToastNotification("Partida actualizada exitosamente","success"):typeof showToast=="function"?showToast("Partida actualizada exitosamente","success"):alert("Partida actualizada exitosamente."),M(n.category),k(n.unit_measure),await ue(),await te(),O();else{const b=await g.json().catch(()=>({}));alert("Error al actualizar partida: "+(b.detail||"Respuesta inválida del servidor"))}}catch(g){console.error("Error al actualizar servicio:",g),alert("Error de conexión al actualizar servicio.")}finally{r&&(r.disabled=!1,r.innerHTML='<i class="fa-solid fa-floppy-disk"></i> Guardar Cambios')}}async function Tt(o){if(confirm("¿Deseas eliminar permanentemente esta partida de servicio del catálogo?"))try{(await q(`${F}/services/${o}?permanent=true`,{method:"DELETE"})).ok?(await ue(),te()):alert("Error al eliminar partida.")}catch{alert("Error de conexión al eliminar servicio.")}}function je(){const o=document.getElementById("edit_srv_cost"),e=document.getElementById("edit_srv_price"),t=parseFloat(o==null?void 0:o.value)||0,i=parseFloat(e==null?void 0:e.value)||0,a=document.getElementById("editSrvMarginBadge"),s=document.querySelector('#editServiceForm button[type="submit"]');if(!(o!=null&&o.value)&&!(e!=null&&e.value)){a&&(a.innerHTML=""),s&&(s.disabled=!1,s.title="");return}if(!(e!=null&&e.value)||String(e.value).trim()===""){a&&(a.innerHTML=t>0?'<span style="color:#64748b;font-size:11px;">Indique el precio de venta para evaluar rentabilidad.</span>':""),s&&(s.disabled=!1,s.title="");return}const n=i-t,r=t>0?(n/t*100).toFixed(1):"N/A";i<t?(a&&(a.innerHTML=`<span style="color:#e11d48;background:#fff1f2;padding:4px 10px;border-radius:6px;border:1px solid #fecdd3;display:inline-block;">❌ ERROR: Precio ($${i.toFixed(2)}) menor al costo ($${t.toFixed(2)}) — Pérdida: -$${Math.abs(n).toFixed(2)} (${Math.abs(r)}%)</span>`),s&&(s.disabled=!0,s.title="No se puede guardar una partida con precio menor al costo")):n===0?(a&&(a.innerHTML='<span style="color:#b45309;background:#fffbeb;padding:4px 10px;border-radius:6px;border:1px solid #fde68a;display:inline-block;">⚠️ Margen Cero: Precio igual al costo base, sin ganancia</span>'),s&&(s.disabled=!1,s.title="")):(a&&(a.innerHTML=`<span style="color:#059669;background:#ecfdf5;padding:4px 10px;border-radius:6px;border:1px solid #a7f3d0;display:inline-block;">✅ Margen Válido: Ganancia +$${n.toFixed(2)} (+${r}% sobre costo)</span>`),s&&(s.disabled=!1,s.title=""))}function Pt(){const o=document.getElementById("srv_cost"),e=document.getElementById("srv_price"),t=parseFloat(o==null?void 0:o.value)||0,i=parseFloat(e==null?void 0:e.value)||0,a=document.getElementById("newSrvMarginBadge"),s=document.getElementById("btnSubmitCreateService")||document.querySelector('#serviceForm button[type="submit"]');if(!(o!=null&&o.value)&&!(e!=null&&e.value)){a&&(a.innerHTML=""),s&&(s.disabled=!1,s.title="");return}if(!(e!=null&&e.value)||String(e.value).trim()===""){a&&(a.innerHTML=t>0?'<span style="color:#64748b;font-size:11px;">Indique el precio de venta para evaluar rentabilidad.</span>':""),s&&(s.disabled=!1,s.title="");return}const n=i-t,r=t>0?(n/t*100).toFixed(1):"N/A";i<t?(a&&(a.innerHTML=`<span style="color:#e11d48;background:#fff1f2;padding:4px 10px;border-radius:6px;border:1px solid #fecdd3;display:inline-block;">❌ ERROR: Precio ($${i.toFixed(2)}) menor al costo ($${t.toFixed(2)}) — Pérdida: -$${Math.abs(n).toFixed(2)} (${Math.abs(r)}%)</span>`),s&&(s.disabled=!0,s.title="No se puede guardar una partida con precio menor al costo")):n===0?(a&&(a.innerHTML='<span style="color:#b45309;background:#fffbeb;padding:4px 10px;border-radius:6px;border:1px solid #fde68a;display:inline-block;">⚠️ Margen Cero: Precio igual al costo base, sin ganancia</span>'),s&&(s.disabled=!1,s.title="")):(a&&(a.innerHTML=`<span style="color:#059669;background:#ecfdf5;padding:4px 10px;border-radius:6px;border:1px solid #a7f3d0;display:inline-block;">✅ Margen Válido: Ganancia +$${n.toFixed(2)} (+${r}% sobre costo)</span>`),s&&(s.disabled=!1,s.title=""))}window.calcEditServiceMargin=je;window.calcNewServiceMargin=Pt;typeof window<"u"&&(window.goToServicesPage=_t,window.changeServicesPageSize=bt,window.onServiceSearchInput=vt,window.onServiceCategoryFilterChange=xt,window.filterAndPaginateServices=fe,window.renderServicesPaginated=N,window.loadServices=te,window.getCustomCategories=ge,window.getCustomUnits=we,window.registerCustomCategory=M,window.registerCustomUnit=k,window.getAllServiceCategories=De,window.getAllServiceUnits=Le,window.populateServiceCategoriesAndUnits=O,window.onServiceCategoryChanged=Et,window.onServiceUnitChanged=ht,window.onEditServiceCategoryChanged=It,window.onEditServiceUnitChanged=St,window.openNewServiceModal=Bt,window.submitCreateService=$t,window.openEditServiceModal=Ct,window.submitEditService=At,window.deleteService=Tt);
