var x=window.API_BASE||window.location.origin+"/api/v1";window.allClients=window.allClients||[];window.allServices=window.allServices||[];var ye=window.allProjects=window.allProjects||[];window.allCategories=window.allCategories||[];var Y=window.allAssets=window.allAssets||[],L=window.allPersonnel=window.allPersonnel||[];window.allMaterials=window.allMaterials||[];window.selectedPersonnelIds=window.selectedPersonnelIds||[];window.selectedVehicleIds=window.selectedVehicleIds||[];window.selectedToolIds=window.selectedToolIds||[];window.selectedMaterialIds=window.selectedMaterialIds||[];window.EXCHANGE_RATE=window.EXCHANGE_RATE||850;window.BCV_DATA=window.BCV_DATA||{rate:850,source:"BCV Oficial"};var J=window.currentUser||null;window.authToken=window.authToken||localStorage.getItem("dalor_token")||null;function w(t,o={}){const r=sessionStorage.getItem("dalor_token")||localStorage.getItem("dalor_token")||window.authToken||"",s={...o.headers||{}};return r&&(s.Authorization="Bearer "+r),o.body&&!(o.body instanceof FormData)&&!s["Content-Type"]&&(s["Content-Type"]="application/json"),o.body instanceof FormData&&delete s["Content-Type"],window.fetch(t,{...o,headers:s})}function be(t){switchView("resources","recursos"),ee(t)}function ee(t){try{sessionStorage.setItem("dalor_active_subtab_resources",t),localStorage.setItem("dalor_active_subtab_resources",t)}catch{}["dashboard","fleet","machinery","tools","materials","personnel","rentals"].forEach(a=>{const l=document.getElementById(`subtab-res-${a}`),i=document.getElementById(`tabbtn-res-${a}`);l&&l.classList.add("hidden"),i&&i.classList.remove("active")});const r=document.getElementById(`subtab-res-${t}`),s=document.getElementById(`tabbtn-res-${t}`);r&&r.classList.remove("hidden"),s&&s.classList.add("active"),t==="dashboard"&&O(),t==="fleet"&&_(),t==="machinery"&&T(),t==="tools"&&$(),t==="materials"&&loadMaterialsList(),t==="personnel"&&z(),t==="rentals"&&typeof window.loadRentalsList=="function"&&window.loadRentalsList()}async function O(){try{const o=await(await w(`${x}/resources/matrix-status`)).json(),r=o.summary.vehicles_total??(o.summary.vehicles_available_base||0)+(o.summary.vehicles_in_operation||0),s=o.summary.machinery_total??(o.summary.machinery_available_base||0)+(o.summary.machinery_in_operation||0),a=o.summary.tools_total??(o.summary.tools_available_base||0)+(o.summary.tools_in_operation||0),l=o.summary.total_personnel??(o.summary.personnel_available_base||0)+(o.summary.personnel_in_operation||0);document.getElementById("matrixCountersContainer").innerHTML=`
            <div style="background: white; border: 1px solid #cbd5e1; border-radius: 10px; padding: 10px 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                    <span style="font-size: 10.5px; text-transform: uppercase; color: #1e293b; font-weight: 800;">
                        <i class="fa-solid fa-truck-front" style="color: #0284c7;"></i> Flota Vehicular
                    </span>
                    <span style="font-size: 10px; background: #f1f5f9; padding: 1px 6px; border-radius: 4px; font-weight: 800; color: #475569;">Total: ${r}</span>
                </div>
                <div style="display: flex; justify-content: space-around; align-items: baseline; margin-top: 6px;">
                    <div style="text-align: center;">
                        <span style="font-size: 9px; color: #0284c7; font-weight: 700; text-transform: uppercase;">En Obra</span>
                        <p style="font-size: 16px; font-weight: 900; color: #0284c7; margin: 0;">${o.summary.vehicles_in_operation??0}</p>
                    </div>
                    <div style="border-left: 1px solid #e2e8f0; height: 24px;"></div>
                    <div style="text-align: center;">
                        <span style="font-size: 9px; color: #166534; font-weight: 700; text-transform: uppercase;">En Base</span>
                        <p style="font-size: 16px; font-weight: 900; color: #16a34a; margin: 0;">${o.summary.vehicles_available_base??0}</p>
                    </div>
                </div>
            </div>

            <div style="background: white; border: 1px solid #cbd5e1; border-radius: 10px; padding: 10px 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                    <span style="font-size: 10.5px; text-transform: uppercase; color: #1e293b; font-weight: 800;">
                        <i class="fa-solid fa-tractor" style="color: #ea580c;"></i> Maquinaria Pesada
                    </span>
                    <span style="font-size: 10px; background: #f1f5f9; padding: 1px 6px; border-radius: 4px; font-weight: 800; color: #475569;">Total: ${s}</span>
                </div>
                <div style="display: flex; justify-content: space-around; align-items: baseline; margin-top: 6px;">
                    <div style="text-align: center;">
                        <span style="font-size: 9px; color: #0284c7; font-weight: 700; text-transform: uppercase;">En Obra</span>
                        <p style="font-size: 16px; font-weight: 900; color: #0284c7; margin: 0;">${o.summary.machinery_in_operation??0}</p>
                    </div>
                    <div style="border-left: 1px solid #e2e8f0; height: 24px;"></div>
                    <div style="text-align: center;">
                        <span style="font-size: 9px; color: #c2410c; font-weight: 700; text-transform: uppercase;">En Base</span>
                        <p style="font-size: 16px; font-weight: 900; color: #ea580c; margin: 0;">${o.summary.machinery_available_base??0}</p>
                    </div>
                </div>
            </div>

            <div style="background: white; border: 1px solid #cbd5e1; border-radius: 10px; padding: 10px 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                    <span style="font-size: 10.5px; text-transform: uppercase; color: #1e293b; font-weight: 800;">
                        <i class="fa-solid fa-wrench" style="color: #4f46e5;"></i> Herramientas Stock
                    </span>
                    <span style="font-size: 10px; background: #f1f5f9; padding: 1px 6px; border-radius: 4px; font-weight: 800; color: #475569;">Total: ${a}</span>
                </div>
                <div style="display: flex; justify-content: space-around; align-items: baseline; margin-top: 6px;">
                    <div style="text-align: center;">
                        <span style="font-size: 9px; color: #0284c7; font-weight: 700; text-transform: uppercase;">En Obra</span>
                        <p style="font-size: 16px; font-weight: 900; color: #0284c7; margin: 0;">${o.summary.tools_in_operation??0}</p>
                    </div>
                    <div style="border-left: 1px solid #e2e8f0; height: 24px;"></div>
                    <div style="text-align: center;">
                        <span style="font-size: 9px; color: #166534; font-weight: 700; text-transform: uppercase;">En Base</span>
                        <p style="font-size: 16px; font-weight: 900; color: #16a34a; margin: 0;">${o.summary.tools_available_base??0}</p>
                    </div>
                </div>
            </div>

            <div style="background: white; border: 1px solid #cbd5e1; border-radius: 10px; padding: 10px 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                    <span style="font-size: 10.5px; text-transform: uppercase; color: #1e293b; font-weight: 800;">
                        <i class="fa-solid fa-users" style="color: #059669;"></i> Nómina / Personal
                    </span>
                    <span style="font-size: 10px; background: #f1f5f9; padding: 1px 6px; border-radius: 4px; font-weight: 800; color: #475569;">Total: ${l}</span>
                </div>
                <div style="display: flex; justify-content: space-around; align-items: baseline; margin-top: 6px;">
                    <div style="text-align: center;">
                        <span style="font-size: 9px; color: #0284c7; font-weight: 700; text-transform: uppercase;">En Obra</span>
                        <p style="font-size: 16px; font-weight: 900; color: #0284c7; margin: 0;">${o.summary.personnel_in_operation??0}</p>
                    </div>
                    <div style="border-left: 1px solid #e2e8f0; height: 24px;"></div>
                    <div style="text-align: center;">
                        <span style="font-size: 9px; color: #166534; font-weight: 700; text-transform: uppercase;">En Base</span>
                        <p style="font-size: 16px; font-weight: 900; color: #16a34a; margin: 0;">${o.summary.personnel_available_base??0}</p>
                    </div>
                </div>
            </div>
        `;const i=d=>{if(d.project_id&&d.project_name){const p=d.project_code||`PRJ-${d.project_id}`,m=d.project_location?` (${d.project_location})`:"";return`Obra [${p}] - ${d.project_name}${m}`}const e=d.location||"",c=e.trim().toLowerCase();return!c||c.includes("sede")||c.includes("base")||c.includes("guacara")||c.includes("taller")?"Sede Central Dalor (Guacara)":e.trim()},n={};[...o.assets,...o.personnel].forEach(d=>{const e=i(d);n[e]||(n[e]={assets:0,personnel:0}),d.type?n[e].assets++:n[e].personnel++}),document.getElementById("locationDistributionContainer").innerHTML=Object.keys(n).map(d=>`

            <div style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 12px; font-size: 12px;">

                <div>

                    <b><i class="fa-solid fa-location-dot" style="color: var(--dalor-blue);"></i> ${d}</b>

                </div>

                <div style="display: flex; gap: 8px;">

                    <span style="background: #e0f2fe; color: #0369a1; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 11px;">

                        ${n[d].assets} Activos/Flota

                    </span>

                    <span style="background: #dcfce7; color: #166534; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 11px;">

                        ${n[d].personnel} Trabajadores

                    </span>

                </div>

            </div>

        `).join("")||'<span style="color:#94a3b8; font-size:11px;">Sin datos de ubicación.</span>',document.getElementById("recentMovementsContainer").innerHTML=o.assets.slice(0,5).map(d=>{const e=d.status==="en_obra"||d.project_id,c=e?d.custodian&&!d.custodian.toLowerCase().includes("base")?d.custodian:"En Operación de Obra":d.custodian||"Disponible en Base";return`
            <div style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 10px; font-size: 11px;">
                <span><b>${d.code}</b> - ${d.name}</span>
                <span style="font-weight: 700; color: ${e?"#0284c7":"#059669"};">
                    ${d.location} (${c})
                </span>
            </div>
        `}).join("")}catch(t){console.error("Error al cargar dashboard de recursos:",t)}}async function _(){const t=document.getElementById("fleetTableBody");if(t){t.innerHTML='<tr><td colspan="10" style="text-align: center; padding: 20px; color: #94a3b8;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando flota...</td></tr>';try{const o=window.authToken||localStorage.getItem("dalor_token"),r=o?{Authorization:`Bearer ${o}`}:{},s=await w(`${x}/assets/fleet-summary`,{headers:r});if(!s.ok)throw new Error(`HTTP ${s.status}`);const a=await s.json();if(!Array.isArray(a)){t.innerHTML='<tr><td colspan="10" style="text-align: center; padding: 20px; color: #94a3b8;">No se pudo procesar la respuesta de la flota.</td></tr>';return}X=a.filter(l=>l&&(l.asset_type==="vehiculo"||l.asset_type==="camioneta"||typeof l.asset_code=="string"&&(l.asset_code.includes("-V-")||l.asset_code.startsWith("FLT-"))||typeof l.category=="string"&&l.category.toLowerCase().includes("flota"))),te()}catch(o){console.error("[FLEET ERROR]",o);const r=document.getElementById("fleetTableBody");r&&(r.innerHTML=`<tr><td colspan="11" style="text-align: center; color: #e11d48;">Error al cargar flota: ${(o==null?void 0:o.message)||o}</td></tr>`)}}}let X=[];function te(){var i,n,d;const t=(((i=document.getElementById("fleetSearchInput"))==null?void 0:i.value)||"").trim().toLowerCase(),o=((n=document.getElementById("fleetStatusFilter"))==null?void 0:n.value)||"all",r=((d=document.getElementById("fleetMaintFilter"))==null?void 0:d.value)||"all",s=document.getElementById("fleetTableBody"),a=document.getElementById("fleetCountBadge");let l=(X||[]).filter(e=>{const c=((e==null?void 0:e.asset_code)||"").toLowerCase(),p=((e==null?void 0:e.name)||"").toLowerCase(),m=((e==null?void 0:e.brand)||"").toLowerCase(),u=((e==null?void 0:e.license_plate)||"").toLowerCase(),f=!t||c.includes(t)||p.includes(t)||m.includes(t)||u.includes(t),b=(e==null?void 0:e.status)==="disponible_base"&&!(e!=null&&e.current_project_id);let h=!0;o==="en_obra"&&(h=!b),o==="disponible_base"&&(h=b);let y=!0;return r!=="all"&&(y=String((e==null?void 0:e.traffic_light)||"")===r),f&&h&&y});if(a&&(a.innerText=`${l.length} de ${X.length} vehículos`),!!s){if(l.length===0){s.innerHTML='<tr><td colspan="11" style="text-align: center; padding: 20px; color: #94a3b8;">No hay vehículos que coincidan con la búsqueda o filtros aplicados.</td></tr>';return}s.innerHTML=l.map(e=>{if(!e)return"";let c="#166534",p="#dcfce7";const m=String((e==null?void 0:e.traffic_light)??"VERDE_OK");m==="ROJO_VENCIDO"?(c="#991b1b",p="#fee2e2"):m==="AMARILLO_PROXIMO"&&(c="#92400e",p="#fef3c7");const u=(e==null?void 0:e.status)==="disponible_base"&&!(e!=null&&e.current_project_id),f=Number((e==null?void 0:e.current_odometer)??0),b=Number((e==null?void 0:e.remaining_km_to_service)??0),h=(e==null?void 0:e.license_plate)||"-",y=u?(e==null?void 0:e.current_location)||"Sede Central Dalor (Guacara)":e!=null&&e.current_location&&!e.current_location.includes("Sede")?e.current_location:"En Operación / Obra",g=u?"Disponible en Base":e!=null&&e.custodian&&!e.custodian.toLowerCase().includes("base")?e.custodian:"Equipo de Obra",v=(e==null?void 0:e.name)||"Vehículo",E=String(v).replace(/'/g,"\\'").replace(/"/g,"&quot;"),H=(e==null?void 0:e.asset_code)||"FLT",I=(e==null?void 0:e.id)??0,fe=e!=null&&e.brand?`(${e.brand})`:"",ge=(e==null?void 0:e.services_count)??0;return`
        <tr>
            <td style="font-weight: 800; color: var(--dalor-blue); font-family: monospace;">${H}</td>
            <td style="font-weight: 700; color: var(--dalor-navy);">${v} ${fe}</td>
            <td style="font-weight: 800; font-family: monospace;">${h}</td>
            <td style="font-weight: 800;">${f.toLocaleString()} Km</td>
            <td>En ${b.toLocaleString()} Km</td>
            <td>
                <span style="font-size: 10px; padding: 2px 8px; border-radius: 9999px; font-weight: 800; background: ${p}; color: ${c};">
                    ${m.replace(/_/g," ")}
                </span>
            </td>
            <td style="text-align: center;">
                <button onclick="openVehicleServicesModal(${I}, '${H}', '${E}')" class="btn-secondary" style="padding: 3px 8px; border-radius: 9999px; font-weight: 800; font-size: 11px; background: #ffedd5; color: #c2410c; border: 1px solid #fed7aa; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;" title="Ver bitácora de mantenimientos y servicios de esta unidad">
                    <i class="fa-solid fa-wrench"></i> ${ge} Servicios
                </button>
            </td>
            <td>
                <span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 800; ${u?"background: #dcfce7; color: #166534;":"background: #e0f2fe; color: #0369a1;"}">
                    <i class="fa-solid ${u?"fa-warehouse":"fa-truck-front"}"></i> ${u?"DISPONIBLE EN BASE":"EN OPERACIÓN / OBRA"}
                </span>
            </td>
            <td>${y}</td>
            <td>${g}</td>
            <td style="text-align: center; white-space: nowrap;">
                <button onclick="openAssetHistoryModal(${I}, '${H}', '${E}')" class="btn-primary" style="padding: 3px 8px; font-size: 11px; margin-right: 4px; background: #2563eb;" title="Ver Bitácora Integral y Trazabilidad">
                    <i class="fa-solid fa-clock-rotate-left"></i> Bitácora
                </button>
                <button onclick="openOdometerOcrModal(${I}, '${H}', '${E}', '${h}', ${f})" class="btn-primary" style="padding: 3px 6px; font-size: 11px; margin-right: 4px; background: #0284c7; box-shadow: 0 1px 3px rgba(2, 132, 199, 0.4);" title="Capturar Odómetro por Foto (OCR)">
                    <i class="fa-solid fa-camera"></i> Odómetro
                </button>
                <button onclick="openCalibrateOdometerModal(${I}, '${H}', '${E}', ${f})" class="btn-secondary" style="padding: 3px 6px; font-size: 11px; margin-right: 4px; color: #7c3aed; border-color: #c4b5fd;" title="Calibrar / Resetear Odómetro con Clave de Director">
                    <i class="fa-solid fa-key"></i> Calibrar
                </button>
                ${u?`
                    <button onclick="openAssignModal('asset', ${I}, '${E}', 'assign')" class="btn-primary" style="padding: 3px 8px; font-size: 11px;">
                        Asignar a Obra
                    </button>
                `:`
                    <button onclick="openAssignModal('asset', ${I}, '${E}', 'transfer')" class="btn-secondary" style="padding: 3px 6px; font-size: 11px;" title="Transferir a otra obra">
                        <i class="fa-solid fa-arrows-split-up-and-left"></i>
                    </button>
                    <button onclick="returnResourceToBase('asset', ${I})" class="btn-primary" style="padding: 3px 6px; font-size: 11px; margin-left: 4px; background: #059669;" title="Devolver a Sede Central">
                        <i class="fa-solid fa-warehouse"></i>
                    </button>
                `}
                <button onclick="deleteAssetItem(${I})" class="btn-secondary" style="padding: 3px 6px; color: #ef4444; margin-left: 4px;" title="Inactivar Vehículo">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        </tr>`}).join("")}}let B=[],j=1,oe=5;function xe(t){j=t,N()}function we(t){oe=parseInt(t)||5,j=1,N()}function N(){const t=document.getElementById("vehServicesTableBody"),o=document.getElementById("vehServicesPagination");if(!t)return;if(!B||B.length===0){t.innerHTML='<tr><td colspan="6" style="text-align: center; padding: 20px; color: #94a3b8;">No se registran servicios de taller ni cambios de aceite para este vehículo aún. Usa el botón superior para registrar uno.</td></tr>',o&&(o.innerHTML="");return}const r=typeof window.renderPaginationControls=="function"?window.renderPaginationControls:typeof renderPaginationControls=="function"?renderPaginationControls:()=>({startIndex:0,endIndex:B.length}),{startIndex:s,endIndex:a}=r({containerId:"vehServicesPagination",totalItems:B.length,currentPage:j,pageSize:oe,onPageChange:"goToVehServicesPage",onPageSizeChange:"changeVehServicesPageSize",itemLabel:"servicio(s) realizado(s)",pageSizeOptions:[5,10,20],allowAll:!0}),l=B.slice(s,a);t.innerHTML=l.map(i=>{const n=(i.service_type||"").replace(/_/g," ").toUpperCase();return`
        <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 8px; font-weight: 600; color: #475569; white-space: nowrap;">${i.service_date}</td>
            <td style="padding: 8px; font-weight: 700; color: #1e293b;">
                <span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 800; background: #fff7ed; color: #c2410c; border: 1px solid #ffedd5;">
                    <i class="fa-solid fa-wrench"></i> ${n}
                </span>
            </td>
            <td style="padding: 8px; text-align: right; font-weight: 800; color: var(--dalor-navy);">${Number(i.service_odometer||0).toLocaleString()} Km</td>
            <td style="padding: 8px; color: #334155; font-weight: 600;">${i.technician_workshop||"Taller Central"}</td>
            <td style="padding: 8px; text-align: right; font-weight: 800; color: #059669;">$${Number(i.cost_usd||0).toFixed(2)}</td>
            <td style="padding: 8px; color: #64748b; font-size: 11px;">${i.notes||"-"}</td>
        </tr>`}).join("")}async function ne(t,o=null,r=null){const s=document.getElementById("vehServicesModalTitle"),a=document.getElementById("vehServicesModalSubtitle"),l=document.getElementById("vehSrvPlate"),i=document.getElementById("vehSrvOdometer"),n=document.getElementById("vehSrvCount"),d=document.getElementById("vehSrvTotalCost"),e=document.getElementById("vehServicesTableBody"),c=document.getElementById("btnOpenNewServiceFromHistory");s&&(s.innerHTML=`<i class="fa-solid fa-wrench"></i> Historial de Servicios: [${o||"..."} ${r||""}]`),a&&(a.innerText="Cargando bitácora de mantenimientos preventivos y correctivos..."),e&&(e.innerHTML='<tr><td colspan="6" style="text-align: center; padding: 20px; color: #64748b;"><i class="fa-solid fa-spinner fa-spin"></i> Consultando registros...</td></tr>'),openModal("modalVehicleServices");try{const p=await w(`${x}/assets/${t}/services`);if(!p.ok)throw new Error(`HTTP ${p.status}`);const m=await p.json(),u=m.asset||{},f=m.services||[];s&&(s.innerHTML=`<i class="fa-solid fa-wrench"></i> Historial de Servicios: [${u.asset_code||o||""}] ${u.name||r||""}`),a&&(a.innerText=`${u.brand?u.brand+" ":""}${u.model||""} | Placa: ${u.license_plate||"-"} | Ubicación: ${u.current_location||"Base"}`),l&&(l.innerText=u.license_plate||"-"),i&&(i.innerText=`${Number(u.current_odometer||0).toLocaleString()} Km`),n&&(n.innerText=`${m.services_count||0} Realizados`),d&&(d.innerText=`$${Number(m.total_cost_usd||0).toLocaleString("en-US",{minimumFractionDigits:2})} USD`),c&&(c.onclick=()=>{closeModal("modalVehicleServices"),re(u.id,u.asset_code,u.name,u.current_odometer||0)}),B=f,j=1,N()}catch(p){e&&(e.innerHTML=`<tr><td colspan="6" style="text-align: center; color: #e11d48; padding: 16px;">Error al cargar servicios: ${p.message}</td></tr>`)}}function ae(){var s;const t=(s=document.getElementById("srv_type"))==null?void 0:s.value,o=document.getElementById("srv_reset_oil"),r=document.getElementById("srv_reset_oil_desc");o&&(t==="cambio_aceite_filtros"||t==="mantenimiento_preventivo_mayor"?(o.checked=!0,r&&(r.innerText="Marcado: Este servicio incluye cambio de lubricante y reinicia el intervalo a 5.000 Km (Verde OK).")):(o.checked=!1,r&&(r.innerText="Desmarcado: Solo registra la reparación/cauchos en bitácora. El semáforo de aceite conserva su conteo de kilómetros.")))}function re(t,o,r,s){if(!document.getElementById("modalRecordService")){const e=document.createElement("div");e.id="modalRecordService",e.className="modal-overlay hidden",e.innerHTML=`
        <div class="modal-card" style="max-width: 460px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <h3 style="font-size: 16px; font-weight: 800; color: #ea580c; display: flex; align-items: center; gap: 8px;">
                    <i class="fa-solid fa-wrench"></i> Registrar Mantenimiento / Servicio
                </h3>
                <button onclick="closeModal('modalRecordService')" style="background: none; border: none; font-size: 18px; color: #64748b; cursor: pointer;">&times;</button>
            </div>
            <form id="formRecordService" onsubmit="submitRecordService(event)">
                <input type="hidden" id="srv_asset_id">
                <div class="form-group" style="margin-bottom: 12px;">
                    <label style="font-size: 12px; font-weight: 700; color: #334155;">Vehículo / Equipo:</label>
                    <div id="srv_veh_label" style="font-weight: 800; color: var(--dalor-navy); font-size: 13px; padding: 8px; background: #f1f5f9; border-radius: 6px;"></div>
                </div>
                <div class="form-group" style="margin-bottom: 12px;">
                    <label style="font-size: 12px; font-weight: 700; color: #334155;">Tipo de Servicio *</label>
                    <select id="srv_type" class="form-control" onchange="onRecordServiceTypeChange()" required>
                        <option value="cambio_aceite_filtros">Cambio de Aceite y Filtros (5.000 Km)</option>
                        <option value="mantenimiento_preventivo_mayor">Mantenimiento Preventivo Mayor (Frenos/Tren/Correas)</option>
                        <option value="reparacion_correctiva">Reparación Mecánica Correctiva</option>
                        <option value="cambio_cauchos_alineacion">Cambio de Cauchos y Alineación</option>
                    </select>
                </div>
                <div class="form-group" style="margin-bottom: 12px; background: #fff7ed; padding: 10px; border-radius: 6px; border: 1px solid #fed7aa;">
                    <label style="display: flex; align-items: flex-start; gap: 8px; cursor: pointer; font-size: 11px; font-weight: 700; color: #9a3412;">
                        <input type="checkbox" id="srv_reset_oil" checked style="width: 16px; height: 16px; accent-color: #ea580c;">
                        <div>
                            <span>¿Reiniciar semáforo de cambio de aceite a 5.000 Km?</span>
                            <span id="srv_reset_oil_desc" style="display: block; font-size: 10px; font-weight: 500; color: #c2410c;">Marcado: Incluye cambio de lubricante y reinicia a 5.000 Km.</span>
                        </div>
                    </label>
                </div>
                <div class="form-group" style="margin-bottom: 12px;">
                    <label style="font-size: 12px; font-weight: 700; color: #334155;">Nuevo Odómetro al momento del Servicio (Km) *</label>
                    <input type="number" step="1" id="srv_odometer" class="form-control" required>
                </div>
                <div class="form-group" style="margin-bottom: 12px;">
                    <label style="font-size: 12px; font-weight: 700; color: #334155;">Costo Total del Servicio (USD)</label>
                    <input type="number" step="0.01" id="srv_cost" class="form-control" value="0.00">
                </div>
                <div class="form-group" style="margin-bottom: 16px;">
                    <label style="font-size: 12px; font-weight: 700; color: #334155;">Taller / Observaciones</label>
                    <textarea id="srv_notes" class="form-control" rows="2" placeholder="Ej: Taller Central - Aceite 15W40 mineral"></textarea>
                </div>
                <div style="display: flex; justify-content: flex-end; gap: 8px;">
                    <button type="button" onclick="closeModal('modalRecordService')" class="btn-secondary" style="font-size: 12px;">Cancelar</button>
                    <button type="submit" class="btn-primary" style="font-size: 12px; background: #ea580c;">
                        <i class="fa-solid fa-check"></i> Guardar en Bitácora
                    </button>
                </div>
            </form>
        </div>`,document.body.appendChild(e)}const l=document.getElementById("srv_asset_id"),i=document.getElementById("srv_veh_label"),n=document.getElementById("srv_odometer"),d=document.getElementById("srv_type");l&&(l.value=t),i&&(i.innerText=`[${o}] ${r}`),n&&(n.value=s),d&&(d.value="cambio_aceite_filtros",ae()),openModal("modalRecordService")}async function he(t){t.preventDefault();const o=document.getElementById("srv_asset_id").value,r=document.getElementById("srv_reset_oil"),s={new_odometer:parseFloat(document.getElementById("srv_odometer").value),service_type:document.getElementById("srv_type").value,cost_usd:parseFloat(document.getElementById("srv_cost").value)||0,notes:document.getElementById("srv_notes").value,reset_oil_interval:r?r.checked:void 0};try{const a=await w(`${x}/assets/${o}/record-service`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(s)});if(a.ok){const l=await a.json();alert(l.message||"Servicio registrado exitosamente."),closeModal("modalRecordService"),await _(),await ne(o)}else{const l=await a.json();alert("Error: "+(l.detail||JSON.stringify(l)))}}catch{alert("Error al conectar con el servidor.")}}function _e(t,o,r,s,a){document.getElementById("odoAssetIdHidden").value=t,document.getElementById("odoImageUrlHidden").value="",document.getElementById("odoVehicleSubtitle").innerText=`[${o}] ${r} - Placa: ${s||"N/A"}`,document.getElementById("odoCurrentKmDisplay").innerText=`${(a||0).toLocaleString()} Km`;const l=document.getElementById("odoPreviewBox"),i=document.getElementById("odoResultBox"),n=document.getElementById("btnConfirmOdometer"),d=document.getElementById("odometerFileInput");l&&(l.style.display="none"),i&&(i.style.display="none"),n&&(n.style.display="none"),d&&(d.value=""),openModal("modalOdometerOcr")}async function ve(t){const o=t.target.files[0];if(!o)return;const r=document.getElementById("odoPreviewBox"),s=document.getElementById("odoPreviewImg"),a=document.getElementById("odoScanningOverlay"),l=document.getElementById("odoResultBox"),i=document.getElementById("btnConfirmOdometer"),n=document.getElementById("odoDetectedInput"),d=document.getElementById("odoConfidenceBadge"),e=document.getElementById("odoDetectedNotes"),c=document.getElementById("odoAssetIdHidden").value,p=new FileReader;p.onload=function(m){s.src=m.target.result,r.style.display="block",a.style.display="flex"},p.readAsDataURL(o),l.style.display="none",i.style.display="none";try{const m=new FormData;m.append("file",o),c&&m.append("asset_id",c);const u=await w(`${x}/ocr/scan-odometer`,{method:"POST",body:m});if(!u.ok)throw new Error("Error en servidor OCR");const f=await u.json();a.style.display="none";const b=f.detected_odometer||0;document.getElementById("odoImageUrlHidden").value=f.image_url||"",n.value=b>0?b:"",d.innerText=f.is_ai_vision?`IA Visión (${Math.round((f.confidence||.95)*100)}%)`:"Lectura OCR",e.innerText=f.notes||"Verifica la lectura antes de confirmar.",l.style.display="block",i.style.display="inline-flex",b>0&&showRealtimeToast(`Odómetro leído: ${b.toLocaleString()} Km`,"ocr_flota","info")}catch(m){console.error("Error analizando odómetro:",m),a.style.display="none",l.style.display="block",n.value="",d.innerText="Modo Manual",e.innerText="No se pudo leer automáticamente el tablero. Ingresa el kilometraje a mano.",i.style.display="inline-flex"}}async function Ee(t){t.preventDefault();const o=document.getElementById("odoAssetIdHidden").value,r=parseFloat(document.getElementById("odoDetectedInput").value),s=document.getElementById("odoImageUrlHidden").value;if(isNaN(r)||r<=0){alert("Por favor ingresa un kilometraje válido mayor a 0.");return}try{const a=await w(`${x}/assets/${o}/record-odometer`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({odometer_reading:r,photo_url:s,reported_by:J&&J.full_name?J.full_name:"Supervisor de Campo"})});if(!a.ok)throw new Error("Error al guardar odómetro");const l=await a.json();closeModal("modalOdometerOcr"),showRealtimeToast(`✅ Odómetro registrado: ${r.toLocaleString()} Km (${l.traffic_light.replace("_"," ")})`,"flota","success"),await _()}catch(a){alert("Error al guardar odómetro: "+a.message)}}function Ie(t,o,r,s){if(!document.getElementById("modalCalibrateOdometer")){const l=document.createElement("div");l.id="modalCalibrateOdometer",l.className="modal-overlay hidden",l.innerHTML=`
        <div class="modal-card" style="max-width: 460px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <h3 style="font-size: 16px; font-weight: 800; color: #7c3aed; display: flex; align-items: center; gap: 8px;">
                    <i class="fa-solid fa-key"></i> Calibrar / Resetear Odómetro
                </h3>
                <button onclick="closeModal('modalCalibrateOdometer')" style="background: none; border: none; font-size: 18px; color: #64748b; cursor: pointer;">&times;</button>
            </div>
            <p style="font-size: 12px; color: #64748b; margin-bottom: 12px;">
                Esta función permite a la Dirección General calibrar o resetear a cero el odómetro base del vehículo mediante autorización criptográfica.
            </p>
            <form id="formCalibrateOdometer" onsubmit="submitCalibrateOdometer(event)">
                <input type="hidden" id="calib_asset_id">
                <div class="form-group" style="margin-bottom: 12px;">
                    <label style="font-size: 12px; font-weight: 700; color: #334155;">Vehículo Seleccionado:</label>
                    <div id="calib_veh_label" style="font-weight: 800; color: var(--dalor-navy); font-size: 13px; padding: 8px; background: #f1f5f9; border-radius: 6px;"></div>
                </div>
                <div class="form-group" style="margin-bottom: 12px;">
                    <label style="font-size: 12px; font-weight: 700; color: #334155;">Nuevo Odómetro Actual (Km) *</label>
                    <input type="number" step="1" id="calib_new_odometer" class="form-control" required placeholder="0">
                </div>
                <div class="form-group" style="margin-bottom: 12px;">
                    <label style="font-size: 12px; font-weight: 700; color: #334155;">Odómetro de Último Servicio (Km) *</label>
                    <input type="number" step="1" id="calib_service_odometer" class="form-control" required placeholder="0">
                    <small style="color: #64748b; font-size: 10px;">Si es puesta a cero, coloca el mismo valor que el odómetro actual.</small>
                </div>
                <div class="form-group" style="margin-bottom: 12px;">
                    <label style="font-size: 12px; font-weight: 700; color: #334155;">Motivo / Nota de Calibración</label>
                    <input type="text" id="calib_notes" class="form-control" value="Calibración y puesta a punto de odómetro por Dirección">
                </div>
                <div class="form-group" style="margin-bottom: 16px; background: #faf5ff; padding: 10px; border-radius: 6px; border: 1px solid #e9d5ff;">
                    <label style="font-size: 12px; font-weight: 800; color: #6b21a8;"><i class="fa-solid fa-lock"></i> Contraseña de Director General *</label>
                    <input type="password" id="calib_director_password" class="form-control" required placeholder="Ingresa clave de director (dalor2026)" style="border-color: #c4b5fd;">
                </div>
                <div style="display: flex; justify-content: flex-end; gap: 8px;">
                    <button type="button" onclick="closeModal('modalCalibrateOdometer')" class="btn-secondary">Cancelar</button>
                    <button type="submit" class="btn-primary" style="background: #7c3aed;">Confirmar Calibración</button>
                </div>
            </form>
        </div>
        `,document.body.appendChild(l)}document.getElementById("calib_asset_id").value=t,document.getElementById("calib_veh_label").innerText=`[${o}] ${r}`,document.getElementById("calib_new_odometer").value=s||0,document.getElementById("calib_service_odometer").value=s||0,document.getElementById("calib_director_password").value="",openModal("modalCalibrateOdometer")}async function Te(t){t.preventDefault();const o=document.getElementById("calib_asset_id").value,r=parseFloat(document.getElementById("calib_new_odometer").value),s=parseFloat(document.getElementById("calib_service_odometer").value),a=document.getElementById("calib_notes").value,l=document.getElementById("calib_director_password").value;if(isNaN(r)||r<0){alert("Por favor ingresa un odómetro válido.");return}try{const i=await w(`${x}/assets/${o}/calibrate-odometer`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({director_password:l,new_odometer:r,new_last_service_odometer:s,notes:a})}),n=await i.json();if(!i.ok)throw new Error(n.detail||"Error al calibrar odómetro");closeModal("modalCalibrateOdometer"),showRealtimeToast(n.message||"Odómetro calibrado exitosamente.","flota","success"),await _()}catch(i){alert("Error de autorización o calibración: "+i.message)}}function $e(){if(!document.getElementById("modalCalibrateAllOdometers")){const o=document.createElement("div");o.id="modalCalibrateAllOdometers",o.className="modal-overlay hidden",o.innerHTML=`
        <div class="modal-card" style="max-width: 480px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <h3 style="font-size: 16px; font-weight: 800; color: #7c3aed; display: flex; align-items: center; gap: 8px;">
                    <i class="fa-solid fa-gauge-high"></i> Puesta a Cero / Calibrar Todos los Odómetros
                </h3>
                <button onclick="closeModal('modalCalibrateAllOdometers')" style="background: none; border: none; font-size: 18px; color: #64748b; cursor: pointer;">&times;</button>
            </div>
            <div style="background: #fdf2f8; border: 1px solid #fbcfe8; border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                <span style="color: #9d174d; font-size: 12px; font-weight: 700;">
                    <i class="fa-solid fa-triangle-exclamation"></i> Calibración Masiva de Flota:
                </span>
                <p style="color: #475569; font-size: 11px; margin-top: 4px;">
                    Esta acción calibrará simultáneamente los 8 vehículos oficiales de DALOR al kilometraje seleccionado (ej: 0 Km para arranque limpio de operación).
                </p>
            </div>
            <form id="formCalibrateAllOdometers" onsubmit="submitCalibrateAllOdometers(event)">
                <div class="form-group" style="margin-bottom: 12px;">
                    <label style="font-size: 12px; font-weight: 700; color: #334155;">Kilometraje Base Objetivo (Km) *</label>
                    <input type="number" step="1" id="bulk_target_odometer" class="form-control" value="0" required>
                </div>
                <div class="form-group" style="margin-bottom: 16px; background: #faf5ff; padding: 10px; border-radius: 6px; border: 1px solid #e9d5ff;">
                    <label style="font-size: 12px; font-weight: 800; color: #6b21a8;"><i class="fa-solid fa-lock"></i> Contraseña de Director General *</label>
                    <input type="password" id="bulk_director_password" class="form-control" required placeholder="Ingresa clave de director (dalor2026)" style="border-color: #c4b5fd;">
                </div>
                <div style="display: flex; justify-content: flex-end; gap: 8px;">
                    <button type="button" onclick="closeModal('modalCalibrateAllOdometers')" class="btn-secondary">Cancelar</button>
                    <button type="submit" class="btn-primary" style="background: #7c3aed;">Ejecutar Calibración Masiva</button>
                </div>
            </form>
        </div>
        `,document.body.appendChild(o)}document.getElementById("bulk_director_password").value="",openModal("modalCalibrateAllOdometers")}async function Be(t){t.preventDefault();const o=parseFloat(document.getElementById("bulk_target_odometer").value),r=document.getElementById("bulk_director_password").value;if(isNaN(o)||o<0){alert("Por favor ingresa un kilometraje válido.");return}try{const s=await w(`${x}/assets/calibrate-all-odometers`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({director_password:r,target_odometer:o,notes:"Calibración masiva de flota por Dirección General"})}),a=await s.json();if(!s.ok)throw new Error(a.detail||"Error en calibración masiva");closeModal("modalCalibrateAllOdometers"),showRealtimeToast(a.message||"Flota calibrada exitosamente.","flota","success"),await _()}catch(s){alert("Error de autorización: "+s.message)}}function Ce(){document.getElementById("vehicleForm").reset(),openModal("modalVehicle")}async function Se(t){t.preventDefault();const o={asset_code:document.getElementById("veh_code").value,name:document.getElementById("veh_name").value,asset_type:"vehiculo",brand:document.getElementById("veh_brand").value,license_plate:document.getElementById("veh_plate").value,current_odometer:parseFloat(document.getElementById("veh_odometer").value)||0,service_interval_km:parseFloat(document.getElementById("veh_interval").value)||5e3,current_location:"Sede Central",is_exclusive:!0};try{const r=await w(`${x}/assets/`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(o)});if(r.ok)alert("Vehículo registrado exitosamente en la flota."),closeModal("modalVehicle"),await loadInitialMasterData(),_();else{const s=await r.json();alert("Error: "+(s.detail||JSON.stringify(s)))}}catch{alert("Error al registrar vehículo.")}}async function T(){const t=document.getElementById("machineryTableBody");if(t){t.innerHTML='<tr><td colspan="10" style="text-align: center; padding: 20px; color: #94a3b8;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando maquinaria pesada y plantas...</td></tr>';try{const s=(await(await w(`${x}/assets/`)).json()).filter(a=>["maquinaria","planta","generador","compresor"].includes(a.asset_type));if(s.length===0){t.innerHTML='<tr><td colspan="10" style="text-align: center; padding: 20px; color: #94a3b8;">No hay maquinaria pesada o plantas registradas.</td></tr>';return}t.innerHTML=s.map(a=>{const l=a.status==="disponible_base"||!a.current_project_id,i=a.maintenance_status==="en_mantenimiento";return`

            <tr>

                <td style="font-weight: 800; color: #ea580c; font-family: monospace;">${a.asset_code}</td>

                <td style="font-weight: 700; color: var(--dalor-navy);">${a.name}</td>

                <td>${a.brand||""} ${a.model?`(${a.model})`:""}</td>

                <td style="font-family: monospace; font-size: 11px;">${a.serial_number||"-"}</td>

                <td style="font-weight: 800; color: #0284c7;">${(a.current_odometer||0).toLocaleString()} Hrs/Km</td>

                <td>

                    <span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 800; ${i?"background: #fee2e2; color: #991b1b;":"background: #dcfce7; color: #166534;"}">

                        ${i?"EN TALLER / MTTO":"OPERATIVO"}

                    </span>

                </td>

                <td>

                    <span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 800; ${l?"background: #dcfce7; color: #166534;":"background: #e0f2fe; color: #0369a1;"}">

                        ${l?"DISPONIBLE EN BASE":"EN OBRA / FAENA"}

                    </span>

                </td>

                <td>${a.current_location||"Sede Central"}</td>

                <td>${a.current_custodian_name||"Disponible"}</td>

                <td style="text-align: center; white-space: nowrap;">

                    ${l?`

                        <button onclick="openAssignModal('asset', ${a.id}, '${a.name}', 'assign')" class="btn-primary" style="padding: 3px 8px; font-size: 11px; background: #ea580c;">

                            Asignar a Faena

                        </button>

                    `:`

                        <button onclick="openAssignModal('asset', ${a.id}, '${a.name}', 'transfer')" class="btn-secondary" style="padding: 3px 6px; font-size: 11px;" title="Transferir a otra obra">

                            <i class="fa-solid fa-arrows-split-up-and-left"></i>

                        </button>

                        <button onclick="returnResourceToBase('asset', ${a.id})" class="btn-primary" style="padding: 3px 6px; font-size: 11px; margin-left: 4px; background: #059669;" title="Devolver a Sede Central">

                            <i class="fa-solid fa-warehouse"></i>

                        </button>

                    `}

                    <button onclick="openAssetHistoryModal(${a.id})" class="btn-primary" style="padding: 3px 8px; font-size: 11px; margin-right: 4px; background: #2563eb;" title="Ver Bitácora y Trazabilidad de Uso">
                        <i class="fa-solid fa-clock-rotate-left"></i> Bitácora
                    </button>
                    <button onclick="deleteAssetItem(${a.id})" class="btn-secondary" style="padding: 3px 6px; color: #ef4444; margin-left: 4px;" title="Inactivar Maquinaria">

                        <i class="fa-solid fa-trash"></i>

                    </button>

                </td>

            </tr>`}).join("")}catch{t.innerHTML='<tr><td colspan="10" style="text-align: center; color: #e11d48;">Error al cargar maquinaria pesada.</td></tr>'}}}let C=[],S=[];async function $(){const t=document.getElementById("toolsTableBody");if(t){t.innerHTML='<tr><td colspan="7" style="text-align: center; padding: 20px; color: #94a3b8;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando inventario de herramientas agrupadas...</td></tr>';try{const o=await w(`${x}/assets/tools-summary`);if(o.ok){S=await o.json(),C=S.flatMap(n=>n.items||[]),W(S);return}const s=await(await w(`${x}/assets/`)).json(),a=["vehiculo","camioneta","camion","remolque","maquinaria","planta","generador","compresor"];if(C=s.filter(n=>!a.includes(n.asset_type)),C.length===0){t.innerHTML='<tr><td colspan="7" style="text-align: center; padding: 20px; color: #94a3b8;">No hay herramientas registradas.</td></tr>';return}const l={};C.forEach(n=>{const d=(n.name||"HERRAMIENTA GENERAL").trim().toUpperCase();l[d]||(l[d]={name:n.name.trim(),asset_type:n.asset_type||"herramienta",category:n.category||"General",items:[],total:0,available:0,in_use:0,locations:new Set}),l[d].items.push(n),l[d].total++,n.status==="disponible_base"||!n.current_project_id?l[d].available++:l[d].in_use++,n.current_location&&l[d].locations.add(n.current_location)}),S=Object.values(l).map(n=>({...n,locations:Array.from(n.locations)}));const i=document.getElementById("toolCategoryFilter");if(i){const n=i.value||"all",d=Array.from(new Set(C.map(e=>e.category).filter(Boolean))).sort();i.innerHTML=`<option value="all">Todas las Categorías (${d.length})</option>`+d.map(e=>`<option value="${e}" ${e===n?"selected":""}>${e}</option>`).join("")}W(S)}catch{t.innerHTML='<tr><td colspan="7" style="text-align: center; color: #e11d48; padding: 20px;">Error al cargar herramientas.</td></tr>'}}}let se=[],R=1,ie=10;function Pe(t){R=t,D();const o=document.getElementById("toolsTableBody");o&&o.scrollIntoView({behavior:"smooth",block:"nearest"})}function Me(t){ie=parseInt(t)||10,R=1,D()}function W(t){se=t||[],R=1,D()}function D(){const t=se,o=document.getElementById("toolsTableBody"),r=document.getElementById("toolsCountBadge");if(r&&(r.innerText=`${t.length} modelos (${t.reduce((n,d)=>n+d.total,0)} unidades físicas)`),!o)return;if(t.length===0){o.innerHTML='<tr><td colspan="7" style="text-align: center; padding: 20px; color: #94a3b8;">No se encontraron herramientas con los filtros seleccionados.</td></tr>';const n=document.getElementById("toolsPaginationContainer");n&&(n.innerHTML="");return}const s=typeof window.renderPaginationControls=="function"?window.renderPaginationControls:typeof renderPaginationControls=="function"?renderPaginationControls:()=>({startIndex:0,endIndex:t.length}),{startIndex:a,endIndex:l}=s({containerId:"toolsPaginationContainer",totalItems:t.length,currentPage:R,pageSize:ie,onPageChange:"goToToolsPage",onPageSizeChange:"changeToolsPageSize",itemLabel:"modelo(s) de herramientas",pageSizeOptions:[10,20,50,100]}),i=t.slice(a,l);o.innerHTML=i.map((n,d)=>{var b,h,y;const e=((b=n.items[0])==null?void 0:b.asset_code)||"HER",c=((h=n.items[0])==null?void 0:h.brand)||"",p=(y=n.items[0])!=null&&y.model?`(${n.items[0].model})`:"",m=n.locations.length>0?n.locations.slice(0,2).join(", "):"Sede Central",u=`tool_units_row_${a+d}`,f=n.items.map(g=>{const v=g.status==="disponible_base"||!g.current_project_id;return`
                <tr style="border-bottom: 1px solid #e2e8f0; background: #ffffff;">
                    <td style="padding: 5px 8px; font-weight: 800; color: var(--dalor-navy); font-family: monospace;">${g.asset_code}</td>
                    <td style="padding: 5px 8px; font-size: 11px;">${g.brand||"-"} ${g.model||""}</td>
                    <td style="padding: 5px 8px; font-family: monospace; font-size: 11px; color: #64748b;">${g.serial_number||"-"}</td>
                    <td style="padding: 5px 8px; font-size: 11px; color: #334155;">${g.current_location||"Sede Central"}</td>
                    <td style="padding: 5px 8px; font-size: 11px; color: #2563eb; font-weight: 600;">${g.current_custodian_name||"En Pañol Base"}</td>
                    <td style="padding: 5px 8px; text-align: center;">
                        <span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 800; ${v?"background: #dcfce7; color: #166534;":"background: #fee2e2; color: #991b1b;"}">
                            ${v?"DISPONIBLE":"EN OBRA"}
                        </span>
                    </td>
                    <td style="padding: 5px 8px; text-align: center;">
                        <button onclick="openAssetHistoryModal(${g.id}, '${g.asset_code}', '${(g.name||"").replace(/'/g,"\\'")}')" class="btn-secondary" style="padding: 2px 6px; font-size: 10px; color: #2563eb; border-color: #bfdbfe;" title="Ver Bitácora de esta unidad física">
                            <i class="fa-solid fa-clock-rotate-left"></i> Traza
                        </button>
                    </td>
                </tr>
            `}).join("");return`
        <tr style="background: #ffffff; border-bottom: 1px solid #e2e8f0;">
            <td>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <button onclick="toggleToolUnitsBreakdown('${u}')" style="background: none; border: 1px solid #cbd5e1; border-radius: 4px; width: 22px; height: 22px; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; color: #0284c7;" title="Desplegar / Ocultar desglose de unidades físicas">
                        <i id="icon_${u}" class="fa-solid fa-chevron-right" style="font-size: 10px; transition: transform 0.2s;"></i>
                    </button>
                    <div>
                        <div style="font-weight: 800; color: var(--dalor-navy); cursor: pointer;" onclick="toggleToolUnitsBreakdown('${u}')">
                            ${n.name}
                        </div>
                        <div style="font-size: 10px; color: #64748b; font-family: monospace;">Muestra: ${e} ${c} ${p}</div>
                    </div>
                </div>
            </td>
            <td><span style="font-size: 10px; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-weight: 700;">${(n.asset_type||"HERRAMIENTA").toUpperCase().replace("_"," ")}</span></td>
            <td style="text-align: center;">
                <span style="font-size: 12px; font-weight: 800; background: #e0e7ff; color: #3730a3; padding: 3px 8px; border-radius: 6px;">${n.total}</span>
            </td>
            <td style="text-align: center;">
                <span style="font-size: 12px; font-weight: 800; background: ${n.available>0?"#dcfce7":"#f1f5f9"}; color: ${n.available>0?"#166534":"#94a3b8"}; padding: 3px 8px; border-radius: 6px;">
                    ${n.available}
                </span>
            </td>
            <td style="text-align: center;">
                <span style="font-size: 12px; font-weight: 800; background: ${n.in_use>0?"#fee2e2":"#f1f5f9"}; color: ${n.in_use>0?"#991b1b":"#94a3b8"}; padding: 3px 8px; border-radius: 6px;">
                    ${n.in_use}
                </span>
            </td>
            <td style="font-size: 11px; color: #334155;">${m}</td>
            <td style="text-align: center; white-space: nowrap;">
                <button onclick="toggleToolUnitsBreakdown('${u}')" class="btn-secondary" style="padding: 3px 8px; font-size: 11px; margin-right: 4px; color: #475569; background: #f8fafc;" title="Ver desglose detallado de cada serial y unidad">
                    <i class="fa-solid fa-layer-group"></i> Desglose (${n.total})
                </button>
                ${n.available>0?`
                    <button onclick="assignAvailableToolFromGroup('${encodeURIComponent(n.name)}')" class="btn-primary" style="padding: 3px 8px; font-size: 11px; margin-right: 4px;" title="Asignar una unidad disponible a obra">
                        <i class="fa-solid fa-arrow-right-from-bracket"></i> Asignar
                    </button>
                `:""}
                <button onclick="openToolHistoryModal('${encodeURIComponent(n.name)}')" class="btn-secondary" style="padding: 3px 8px; font-size: 11px; color: #0284c7; border-color: #bae6fd;" title="Ver Historial de Traza Global">
                    <i class="fa-solid fa-clock-rotate-left"></i> Traza
                </button>
            </td>
        </tr>
        <!-- FILA DE DESGLOSE DE UNIDADES INDIVIDUALES -->
        <tr id="${u}" class="hidden" style="background: #f8fafc;">
            <td colspan="7" style="padding: 12px 16px; border-left: 3px solid #0284c7;">
                <div style="font-size: 11px; font-weight: 800; color: #002B49; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
                    <span><i class="fa-solid fa-boxes-stacked" style="color: #0284c7;"></i> Desglose Unitario de [${n.name}] &bull; ${n.total} unidad(es) física(s) con serial y custodio:</span>
                    <span style="color: #64748b; font-weight: 600;">Disponibles: <b style="color: #166534;">${n.available}</b> | En Obra: <b style="color: #991b1b;">${n.in_use}</b></span>
                </div>
                <div style="border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; background: white;">
                    <table style="width: 100%; font-size: 11px; margin: 0;">
                        <thead>
                            <tr style="background: #f1f5f9; border-bottom: 1px solid #cbd5e1;">
                                <th style="padding: 6px 8px; text-align: left;">Código Dalor</th>
                                <th style="padding: 6px 8px; text-align: left;">Marca / Modelo</th>
                                <th style="padding: 6px 8px; text-align: left;">Serial Físico</th>
                                <th style="padding: 6px 8px; text-align: left;">Ubicación Actual</th>
                                <th style="padding: 6px 8px; text-align: left;">Custodio / Técnico</th>
                                <th style="padding: 6px 8px; text-align: center;">Estatus</th>
                                <th style="padding: 6px 8px; text-align: center;">Acción</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${f}
                        </tbody>
                    </table>
                </div>
            </td>
        </tr>`}).join("")}function ke(t){const o=document.getElementById(t),r=document.getElementById(`icon_${t}`);o&&(o.classList.contains("hidden")?(o.classList.remove("hidden"),r&&(r.style.transform="rotate(90deg)")):(o.classList.add("hidden"),r&&(r.style.transform="rotate(0deg)")))}window.toggleToolUnitsBreakdown=ke;function He(){var a,l,i;const t=(((a=document.getElementById("toolSearchInput"))==null?void 0:a.value)||"").trim().toLowerCase(),o=((l=document.getElementById("toolStatusFilter"))==null?void 0:l.value)||"all",r=((i=document.getElementById("toolCategoryFilter"))==null?void 0:i.value)||"all";let s=S.filter(n=>{const d=!t||n.name.toLowerCase().includes(t)||n.asset_type&&n.asset_type.toLowerCase().includes(t)||n.category&&n.category.toLowerCase().includes(t);let e=!0;o==="disponible"&&(e=n.available>0),o==="en_obra"&&(e=n.in_use>0);let c=!0;return r!=="all"&&(c=n.category===r||n.items&&n.items.some(p=>p.category===r)),d&&e&&c});W(s)}function Le(t){const o=decodeURIComponent(t),r=C.find(s=>s.name.trim().toUpperCase()===o.trim().toUpperCase()&&(s.status==="disponible_base"||!s.current_project_id));if(!r){alert("No hay unidades disponibles de esta herramienta en Base.");return}ce("asset",r.id,r.name,"assign")}let P=[],F=1,le=6;function ze(t){F=t,V()}function Ae(t){le=parseInt(t)||6,F=1,V()}function V(){const t=document.getElementById("toolHistoryTableBody"),o=document.getElementById("toolHistoryPagination");if(!t)return;if(!P||P.length===0){t.innerHTML='<tr><td colspan="5" style="text-align: center; color: #94a3b8; padding: 16px;">No se registran movimientos para esta herramienta (permanece en Base Central).</td></tr>',o&&(o.innerHTML="");return}const r=typeof window.renderPaginationControls=="function"?window.renderPaginationControls:typeof renderPaginationControls=="function"?renderPaginationControls:()=>({startIndex:0,endIndex:P.length}),{startIndex:s,endIndex:a}=r({containerId:"toolHistoryPagination",totalItems:P.length,currentPage:F,pageSize:le,onPageChange:"goToToolHistoryPage",onPageSizeChange:"changeToolHistoryPageSize",itemLabel:"movimiento(s) en traza",pageSizeOptions:[6,12,25],allowAll:!0}),l=P.slice(s,a);t.innerHTML=l.map(i=>`
        <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 8px; font-weight: 700; color: #64748b; font-size: 10px;">${i.assigned_at}</td>
            <td style="padding: 8px; font-weight: 800; color: var(--dalor-navy); font-family: monospace;">${i.resource_code}</td>
            <td style="padding: 8px;">
                <span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 700; ${i.status==="en_obra"?"background: #e0f2fe; color: #0369a1;":"background: #dcfce7; color: #166534;"}">
                    ${i.status==="en_obra"?"Despacho a Obra":"Retorno a Base"}
                </span>
            </td>
            <td style="padding: 8px; font-weight: 600;">${i.destination_location} (${i.project_name})</td>
            <td style="padding: 8px;">${i.custodian_name||i.driver_name||"-"}</td>
        </tr>
    `).join("")}async function Oe(t){const o=decodeURIComponent(t),r=document.getElementById("modalToolHistoryTitle"),s=document.getElementById("modalToolHistorySubtitle"),a=document.getElementById("toolHistoryTableBody");r&&(r.innerHTML=`<i class="fa-solid fa-clock-rotate-left" style="color: var(--dalor-blue);"></i> Traza: ${o}`),s&&(s.innerText="Histórico de movimientos de las unidades de este modelo."),a&&(a.innerHTML='<tr><td colspan="5" style="text-align: center; color: #94a3b8; padding: 16px;"><i class="fa-solid fa-spinner fa-spin"></i> Consultando traza...</td></tr>'),openModal("modalToolHistory");try{const l=await w(`${x}/resources/history?name=${encodeURIComponent(o)}`);if(!l.ok)throw new Error("Error en servidor");P=await l.json()||[],F=1,V()}catch{a&&(a.innerHTML='<tr><td colspan="5" style="text-align: center; color: #e11d48; padding: 16px;">Error al cargar la traza de movimientos.</td></tr>')}}function je(){document.getElementById("toolForm").reset(),openModal("modalTool")}async function Ne(t){t.preventDefault();const o={asset_code:document.getElementById("tool_code").value,name:document.getElementById("tool_name").value,asset_type:document.getElementById("tool_type").value,brand:document.getElementById("tool_brand").value,serial_number:document.getElementById("tool_serial").value,current_location:document.getElementById("tool_location").value||"Sede Central",is_exclusive:!0};try{const r=await w(`${x}/assets/`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(o)});if(r.ok)alert("Herramienta/Equipo registrado exitosamente."),closeModal("modalTool"),await loadInitialMasterData(),$(),typeof T=="function"&&T(),typeof _=="function"&&_();else{const s=await r.json();alert("Error: "+(s.detail||JSON.stringify(s)))}}catch{alert("Error al registrar herramienta.")}}async function Re(t){if(confirm("¿Deseas inactivar este elemento? (Se conservará la traza histórica)"))try{await w(`${x}/assets/${t}`,{method:"DELETE"}),await loadInitialMasterData(),$(),_()}catch{alert("Error al inactivar.")}}let A=[];async function z(){const t=document.getElementById("matrixPersonnelTableBody");t&&(t.innerHTML='<tr><td colspan="7" style="text-align: center; padding: 20px; color: #94a3b8;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando personal...</td></tr>');try{L=await(await w(`${x}/personnel/`)).json(),A=Array.isArray(L)?L:[];const r=document.getElementById("personnelRoleFilter");if(r){const s=r.value||"all",a=Array.from(new Set(A.map(l=>(l.role_title||"").trim()).filter(Boolean))).sort();r.innerHTML=`<option value="all">Todos los Cargos / Roles (${a.length})</option>`+a.map(l=>`<option value="${l}" ${l===s?"selected":""}>${l}</option>`).join("")}de()}catch(o){t&&(t.innerHTML=`<tr><td colspan="7" style="text-align: center; color: #e11d48;">Error al cargar personal: ${(o==null?void 0:o.message)||o}</td></tr>`)}}function de(){var i,n,d;const t=(((i=document.getElementById("personnelSearchInput"))==null?void 0:i.value)||"").trim().toLowerCase(),o=((n=document.getElementById("personnelRoleFilter"))==null?void 0:n.value)||"all",r=((d=document.getElementById("personnelStatusFilter"))==null?void 0:d.value)||"all",s=document.getElementById("personnelCountBadge"),a=document.getElementById("matrixPersonnelTableBody");let l=(A||[]).filter(e=>{const c=((e==null?void 0:e.code)||"").toLowerCase(),p=((e==null?void 0:e.full_name)||"").toLowerCase(),m=((e==null?void 0:e.phone)||"").toLowerCase(),u=((e==null?void 0:e.role_title)||"").toLowerCase(),f=!t||c.includes(t)||p.includes(t)||m.includes(t)||u.includes(t);let b=!0;o!=="all"&&(b=((e==null?void 0:e.role_title)||"").trim()===o);const h=(e==null?void 0:e.status)==="disponible_base"||!(e!=null&&e.current_project_id);let y=!0;return r==="disponible_base"&&(y=h),r==="en_obra"&&(y=!h),f&&b&&y});if(s&&(s.innerText=`${l.length} de ${A.length} empleados`),!!a){if(l.length===0){a.innerHTML='<tr><td colspan="7" style="text-align: center; padding: 20px; color: #94a3b8;">No se encontraron empleados con los criterios de búsqueda.</td></tr>';return}a.innerHTML=l.map(e=>{const c=(e==null?void 0:e.status)==="disponible_base"||!(e!=null&&e.current_project_id),p=(e==null?void 0:e.current_location)||(c?"Sede Central Dalor (Guacara)":"En Obra / Proyecto"),m=((e==null?void 0:e.full_name)||"").replace(/'/g,"\\'"),u=(e==null?void 0:e.id)??0;return`
        <tr>
            <td style="font-weight: 800; color: var(--dalor-blue); font-family: monospace;">${(e==null?void 0:e.code)||"-"}</td>
            <td style="font-weight: 700; color: var(--dalor-navy);">${(e==null?void 0:e.full_name)||"-"}</td>
            <td><span style="font-size: 11px; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-weight: 600;">${(e==null?void 0:e.role_title)||"-"}</span></td>
            <td>${(e==null?void 0:e.phone)||"-"}</td>
            <td>
                <span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 800; ${c?"background: #dcfce7; color: #166534;":"background: #e0f2fe; color: #0369a1;"}">
                    <i class="fa-solid ${c?"fa-warehouse":"fa-helmet-safety"}"></i> ${c?"DISPONIBLE EN BASE":"EN OBRA"}
                </span>
            </td>
            <td>${p}</td>
            <td style="text-align: center; white-space: nowrap;">
                <button onclick="openPersonnelHistoryModal(${u}, '${(e==null?void 0:e.code)||""}', '${m}')" class="btn-secondary" style="padding: 3px 6px; font-size: 11px; margin-right: 4px; color: #2563eb; border-color: #93c5fd;" title="Ver Bitácora & Trazabilidad de Asignaciones (Punto 6)">
                    <i class="fa-solid fa-clock-rotate-left"></i> Bitácora
                </button>
                ${c?`
                    <button onclick="openAssignModal('personnel', ${u}, '${m}', 'assign')" class="btn-primary" style="padding: 3px 8px; font-size: 11px;">
                        Asignar a Obra
                    </button>
                `:`
                    <button onclick="openAssignModal('personnel', ${u}, '${m}', 'transfer')" class="btn-secondary" style="padding: 3px 6px; font-size: 11px;" title="Transferir a otra obra">
                        <i class="fa-solid fa-arrows-split-up-and-left"></i>
                    </button>
                    <button onclick="returnResourceToBase('personnel', ${u})" class="btn-primary" style="padding: 3px 6px; font-size: 11px; margin-left: 4px; background: #059669;" title="Devolver a Sede Central">
                        <i class="fa-solid fa-warehouse"></i>
                    </button>
                `}
            </td>
        </tr>`}).join("")}}function ce(t,o,r,s){document.getElementById("modal_res_type").value=t,document.getElementById("modal_res_id").value=o,document.getElementById("modal_action_type").value=s;const a=t==="asset";document.getElementById("modal_odometer_container").style.display=a?"block":"none",document.getElementById("modal_custodian_container").style.display=a?"block":"none";const l=document.getElementById("modal_target_project_id");if(l){const n=((window.allProjects&&window.allProjects.length>0?window.allProjects:ye||[])||[]).filter(d=>{const e=(d.status||"").toLowerCase().trim();return!["culminado","completado","cerrado","cancelado","finalizado","inactivo"].includes(e)});n.length>0?(l.innerHTML='<option value="">-- Seleccione Proyecto Destino Activo --</option>'+n.map(d=>`<option value="${d.id}" data-loc="${d.location||"Sede Central"}">[${d.code}] ${d.name} (${d.location||"Sede Central"})</option>`).join(""),l.onchange=function(){const d=this.options[this.selectedIndex],e=d?d.getAttribute("data-loc"):"",c=document.getElementById("modal_res_location");c&&e&&(c.value=e)}):l.innerHTML='<option value="">⚠️ No hay obras abiertas disponibles</option>'}document.getElementById("assignModalTitle").innerText=s==="assign"?`Asignar ${r} a Obra`:`Transferir ${r} a Nueva Obra`,document.getElementById("btnConfirmResourceAction").innerText=s==="assign"?"Confirmar Asignación":"Confirmar Transferencia Directa",openModal("modalAssignResource")}async function De(t){t.preventDefault();const o=document.getElementById("modal_res_type").value,r=parseInt(document.getElementById("modal_res_id").value),s=document.getElementById("modal_action_type").value,a=parseInt(document.getElementById("modal_target_project_id").value),l=document.getElementById("modal_res_location").value,i=document.getElementById("modal_res_custodian").value,n=parseFloat(document.getElementById("modal_res_odometer").value)||null,d=s==="assign"?`${x}/resources/assign`:`${x}/resources/transfer`,e=s==="assign"?{project_id:a,resource_type:o,resource_id:r,destination_location:l,custodian_name:i,start_odometer:n}:{target_project_id:a,resource_type:o,resource_id:r,destination_location:l,custodian_name:i,current_odometer:n};try{const c=await w(d,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)});if(c.ok){const p=await c.json();alert(p.message),closeModal("modalAssignResource"),O(),_(),typeof T=="function"&&T(),$(),z()}else alert("Error al procesar movimiento de recurso.")}catch{alert("Error de conexión.")}}async function Fe(t,o){let r=null;if(t==="asset"){const s=prompt("Ingresa el odómetro final (o deja en blanco):");s&&(r=parseFloat(s))}try{const s=await w(`${x}/resources/return-to-base`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({resource_type:t,resource_id:o,end_odometer:r,return_location:"Sede Central"})});if(s.ok){const a=await s.json();alert(a.message),O(),_(),$(),z()}}catch{alert("Error al registrar retorno.")}}function Z(t="herramienta_mayor"){const o=document.getElementById("newAssetForm");o&&o.reset();const r=document.getElementById("nass_type");r&&(r.value=t);const s=document.getElementById("nass_category"),a=document.getElementById("nass_new_category");if(a&&(a.classList.add("hidden"),a.value=""),s){const i=Array.from(new Set((Y||[]).map(e=>e.category).filter(Boolean))).sort(),n=["Herramientas Manuales","Herramientas Eléctricas","Equipos de Medición","Seguridad Industrial","Consumibles de Taller","Flota Vehicular","Maquinaria Pesada","Herramientas Generales"],d=Array.from(new Set([...n,...i]));s.innerHTML=d.map(e=>`<option value="${e}">${e}</option>`).join("")+'<option value="__NEW__" style="font-weight: 800; color: #2563eb;">+ Crear Nueva Categoría...</option>'}const l=document.getElementById("nass_location");l&&(l.value="Sede Central Dalor (Guacara)"),pe(),openModal("modalNewAsset")}function Ve(){const t=document.getElementById("nass_category"),o=document.getElementById("nass_new_category");!t||!o||(t.value==="__NEW__"?(o.classList.remove("hidden"),o.required=!0,o.focus()):(o.classList.add("hidden"),o.required=!1))}function qe(){Z("herramienta_mayor")}function Ue(){Z("vehiculo")}function pe(){var d;const t=((d=document.getElementById("nass_type"))==null?void 0:d.value)||"herramienta_mayor",o=document.getElementById("newAssetModalTitle"),r=document.getElementById("nass_serial_label"),s=document.getElementById("nass_odometer_label"),a=document.getElementById("nass_nomenclature_text"),l=document.getElementById("nass_code"),i=document.getElementById("nass_category"),n=Y||[];if(t==="vehiculo"){o&&(o.innerHTML='<i class="fa-solid fa-truck" style="color: #6366f1;"></i> Registrar Nuevo Vehículo de Flota / Carga'),r&&(r.textContent="Placa del Vehículo *"),s&&(s.textContent="Kilometraje Inicial (Km)"),a&&(a.innerHTML="Nomenclatura Dalor Flota: <b>[Piso]-[Tipo V]-[Área]-[Correlativo]</b> (Ej: <code>1-V-1-09</code>) o <b>FLT-XXX</b> (Ej: <code>FLT-009</code>)."),i&&(i.value="Flota Vehicular");const c=n.filter(p=>p.asset_type==="vehiculo"||p.asset_code&&p.asset_code.includes("-V-")).length+1;l&&(l.value=`3-V-1-${String(c).padStart(2,"0")}`)}else if(t==="maquinaria"){o&&(o.innerHTML='<i class="fa-solid fa-gears" style="color: #d97706;"></i> Registrar Nueva Maquinaria Pesada / Planta / Compresor'),r&&(r.textContent="Serial del Fabricante"),s&&(s.textContent="Horómetro Inicial (Horas)"),a&&(a.innerHTML="Nomenclatura Dalor Maquinaria: Prefijo <b>MAQ-</b> o <b>EQ-</b> (Ej: <code>MAQ-002</code> o <code>EQ-PLANTA-01</code>)."),i&&(i.value="Maquinaria Pesada");const c=n.filter(p=>p.asset_type==="maquinaria"||p.asset_code&&p.asset_code.startsWith("MAQ-")).length+1;l&&(l.value=`MAQ-${String(c).padStart(3,"0")}`)}else if(t==="equipo_medicion"){o&&(o.innerHTML='<i class="fa-solid fa-scale-unbalanced" style="color: #8b5cf6;"></i> Registrar Nuevo Equipo de Medición / Calibración'),r&&(r.textContent="Serial / Certificado Calibración"),s&&(s.textContent="Usos / Horómetro"),a&&(a.innerHTML="Nomenclatura Dalor Medición: Prefijo <b>MED-</b> o código Pañol <b>1-D-X-XX</b> (Ej: <code>MED-002</code> o <code>1-D-1-26-3</code>)."),i&&(i.value="Equipos de Medición");const c=n.filter(p=>p.asset_type==="equipo_medicion"||p.asset_code&&p.asset_code.startsWith("MED-")).length+1;l&&(l.value=`MED-${String(c).padStart(3,"0")}`)}else{o&&(o.innerHTML='<i class="fa-solid fa-toolbox" style="color: var(--dalor-blue);"></i> Registrar Nueva Herramienta / Equipo'),r&&(r.textContent="Serial / Identificador"),s&&(s.textContent="Horómetro / Contador"),a&&(a.innerHTML="Nomenclatura Dalor Herramientas: Prefijo <b>HERR-</b> (Ej: <code>HERR-0908</code>) o Código Pañol <b>[Gaveta]-[Letra]-[Nivel]-[Ítem]</b> (Ej: <code>1-J-1-28</code>)."),i&&(i.value==="Flota Vehicular"||i.value==="Maquinaria Pesada")&&(i.value="Herramientas Manuales");const e=n.map(p=>p.asset_code).filter(p=>p&&p.startsWith("HERR-")).map(p=>parseInt(p.replace("HERR-",""))||0),c=e.length>0?Math.max(...e):907;l&&(l.value=`HERR-${String(c+1).padStart(4,"0")}`)}}async function Ge(t){var m,u;t.preventDefault();const o=document.getElementById("nass_type").value,r=document.getElementById("nass_code").value.trim(),s=document.getElementById("nass_name").value.trim(),a=document.getElementById("nass_brand").value.trim(),l=document.getElementById("nass_model").value.trim(),i=document.getElementById("nass_serial").value.trim(),n=parseFloat(document.getElementById("nass_odometer").value)||0,d=document.getElementById("nass_location").value.trim()||"Sede Central Dalor (Guacara)",e=document.getElementById("nass_custodian").value.trim()||"Disponible en Base";let c=((m=document.getElementById("nass_category"))==null?void 0:m.value)||"General";c==="__NEW__"&&(c=(((u=document.getElementById("nass_new_category"))==null?void 0:u.value)||"").trim()||"General");const p={asset_code:r,name:s,asset_type:o,category:c,brand:a,model:l,serial_number:o!=="vehiculo"?i:null,license_plate:o==="vehiculo"?i:null,current_odometer:n,service_interval_km:o==="vehiculo"?5e3:250,current_location:d,current_custodian_name:e,is_exclusive:!0};try{const f=await w(`${x}/assets/`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(p)});if(!f.ok){const b=await f.json();throw new Error(b.detail||"Error al crear activo")}closeModal("modalNewAsset"),alert(`✅ Activo ${r} (${s}) registrado exitosamente en categoría "${c}".`),await loadInitialMasterData(),_(),$(),typeof T=="function"&&T()}catch(f){alert(`❌ Error: ${f.message}`)}}function Ke(){const t=document.getElementById("newPersonnelForm");t&&t.reset();const r=(L||[]).map(n=>{const d=(n.code||"").match(/(\d+)/);return d?parseInt(d[1]):0}),s=r.length>0?Math.max(...r):18,a=`PERS-${String(s+1).padStart(3,"0")}`,l=document.getElementById("npers_code");l&&(l.value=a);const i=document.getElementById("npers_location");i&&(i.value="Sede Central Dalor (Guacara)"),openModal("modalNewPersonnel")}async function Je(t){t.preventDefault();const o=document.getElementById("npers_code").value.trim(),r=document.getElementById("npers_name").value.trim(),s=document.getElementById("npers_id").value.trim(),a=document.getElementById("npers_role").value,l=document.getElementById("npers_phone").value.trim(),i=document.getElementById("npers_roster").value,n=parseFloat(document.getElementById("npers_salary").value)||0,d=document.getElementById("npers_location").value.trim()||"Sede Central Dalor (Guacara)",e={code:o,full_name:r,identification_id:s,role_title:a,phone:l,roster_type:i,monthly_salary_usd:n,current_location:d,status:"disponible_base"};try{const c=await w(`${x}/personnel/`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)});if(!c.ok){const p=await c.json();throw new Error(p.detail||"Error al registrar empleado")}closeModal("modalNewPersonnel"),alert(`✅ Empleado ${r} (${a||"Personal"}) registrado exitosamente.`),await loadInitialMasterData(),z()}catch(c){alert(`❌ Error: ${c.message}`)}}let M=[],q=1,ue=6;function Xe(t){q=t,U()}function We(t){ue=parseInt(t)||6,q=1,U()}function U(){const t=document.getElementById("assetHistoryTableBody"),o=document.getElementById("assetHistoryPagination");if(!t)return;if(!M||M.length===0){t.innerHTML='<tr><td colspan="7" style="text-align: center; color: #94a3b8; padding: 20px;">No se registran salidas ni movimientos históricos para este activo (Permanece en Base Central).</td></tr>',o&&(o.innerHTML="");return}const r=typeof window.renderPaginationControls=="function"?window.renderPaginationControls:typeof renderPaginationControls=="function"?renderPaginationControls:()=>({startIndex:0,endIndex:M.length}),{startIndex:s,endIndex:a}=r({containerId:"assetHistoryPagination",totalItems:M.length,currentPage:q,pageSize:ue,onPageChange:"goToAssetHistoryPage",onPageSizeChange:"changeAssetHistoryPageSize",itemLabel:"registro(s) en bitácora",pageSizeOptions:[6,12,25],allowAll:!0}),l=M.slice(s,a);t.innerHTML=l.map(i=>{let n="#f1f5f9",d="#475569",e="Movimiento";return i.type==="guia_despacho"?(n="#dbeafe",d="#1d4ed8",e="Guía Despacho"):i.type==="alquiler_prestamo"?(n="#fef3c7",d="#b45309",e="Alquiler/Préstamo"):i.status==="disponible_base"?(n="#dcfce7",d="#15803d",e="Retorno a Base"):(n="#e0e7ff",d="#4338ca",e="Asignación Obra"),`
            <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 8px; font-weight: 600; color: #475569; white-space: nowrap;">${i.date}</td>
                <td style="padding: 8px;"><span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 800; background: ${n}; color: ${d};">${e}</span></td>
                <td style="padding: 8px; font-family: monospace; font-weight: 800; color: var(--dalor-navy);">${i.transfer_code||"-"}</td>
                <td style="padding: 8px;"><span style="font-weight: 700; color: #1e293b;">${i.project_code?`[${i.project_code}] `:""}${i.destination||i.project_name}</span></td>
                <td style="padding: 8px; font-weight: 700; color: #2563eb;">${i.driver_name||i.responsible_person||"-"}</td>
                <td style="padding: 8px; text-align: right; font-weight: 800; color: #059669;">${i.odometer!=null?Number(i.odometer).toLocaleString()+" Km":"-"}</td>
                <td style="padding: 8px; color: #64748b; font-size: 11px;">${i.notes||"-"}</td>
            </tr>
        `}).join("")}async function Qe(t,o=null,r=null){const s=document.getElementById("assetHistoryTitle"),a=document.getElementById("assetHistorySubtitle"),l=document.getElementById("assetHistCurrentLoc"),i=document.getElementById("assetHistCustodian"),n=document.getElementById("assetHistOdometer"),d=document.getElementById("assetHistStatusBadge"),e=document.getElementById("assetHistoryTableBody"),c=(Y||[]).find(u=>u.id===t)||{},p=o||c.asset_code||c.code||`ACT-${t}`,m=r||c.name||"Activo / Maquinaria";s&&(s.innerHTML=`<i class="fa-solid fa-clock-rotate-left" style="color: #2563eb;"></i> Bitácora & Trazabilidad: [${p}] ${m}`),a&&(a.innerText="Consultando historial de asignaciones, choferes, obras y despachos..."),e&&(e.innerHTML='<tr><td colspan="7" style="text-align: center; color: #94a3b8; padding: 20px;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando bitácora de uso...</td></tr>'),openModal("modalAssetHistory");try{const u=sessionStorage.getItem("dalor_token")||localStorage.getItem("dalor_token")||window.authToken||"",f=u?{Authorization:`Bearer ${u}`}:{},b=await w(`${x}/assets/${t}/history`,{headers:f});if(!b.ok)throw new Error(`HTTP ${b.status}`);const h=await b.json(),y=h.asset||{},g=h.timeline||[];if(a&&(a.innerText=`${y.brand?y.brand+" ":""}${y.model||""} | Placa/Serial: ${y.license_plate||"-"} | Ubicación Actual: ${y.current_location||"Base"}`),l&&(l.innerText=y.current_location||"Sede Central Dalor"),i&&(i.innerText=y.current_custodian||"Disponible en Base"),n&&(n.innerText=`${Number(y.current_odometer||0).toLocaleString()} Km`),d){const v=y.status==="disponible_base"||!y.current_project_id;d.innerHTML=`<span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 800; ${v?"background: #dcfce7; color: #166534;":"background: #e0f2fe; color: #0369a1;"}">${(y.status||"DISPONIBLE").toUpperCase().replace(/_/g," ")}</span>`}M=g,q=1,U()}catch(u){e&&(e.innerHTML=`<tr><td colspan="7" style="text-align: center; color: #e11d48; padding: 20px;">Error al cargar bitácora del activo: ${u.message}</td></tr>`)}}let k=[],G=1,me=6,Q=null;function Ye(t){G=t,K()}function Ze(t){me=parseInt(t)||6,G=1,K()}function K(){const t=document.getElementById("personnelHistoryTableBody"),o=document.getElementById("personnelHistoryPagination");if(!t)return;if(!k||k.length===0){t.innerHTML='<tr><td colspan="5" style="text-align: center; color: #94a3b8; padding: 20px;">No se registran asignaciones ni traslados históricos para este colaborador (Permanece en Base Central).</td></tr>',o&&(o.innerHTML="");return}const r=typeof window.renderPaginationControls=="function"?window.renderPaginationControls:typeof renderPaginationControls=="function"?renderPaginationControls:()=>({startIndex:0,endIndex:k.length}),{startIndex:s,endIndex:a}=r({containerId:"personnelHistoryPagination",totalItems:k.length,currentPage:G,pageSize:me,onPageChange:"goToPersonnelHistoryPage",onPageSizeChange:"changePersonnelHistoryPageSize",itemLabel:"registro(s) en bitácora",pageSizeOptions:[6,12,25],allowAll:!0}),l=k.slice(s,a);t.innerHTML=l.map(i=>{let n="#f1f5f9",d="#475569",e="Movimiento";i.type==="chofer_despacho"?(n="#dbeafe",d="#1d4ed8",e="🚛 Conductor Guía"):i.type==="receptor_guia"||i.type==="guia_despacho"?(n="#e0f2fe",d="#0369a1",e="📦 Receptor en Obra"):i.type==="retorno_base"||i.status==="disponible_base"?(n="#dcfce7",d="#15803d",e="🏠 Retorno a Base"):i.type==="transferencia_obra"?(n="#ffedd5",d="#c2410c",e="🔄 Transferencia Obra"):(n="#e0e7ff",d="#4338ca",e="🏗️ Asignación a Obra");const c=i.role_in_project||i.role||Q&&Q.role_title||"-";return`
            <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 8px; font-weight: 600; color: #475569; white-space: nowrap;">${i.date}</td>
                <td style="padding: 8px;"><span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 800; background: ${n}; color: ${d};">${e}</span></td>
                <td style="padding: 8px;"><span style="font-weight: 700; color: #1e293b;">${i.project_code?`[${i.project_code}] `:""}${i.destination||i.project_name||"-"}</span></td>
                <td style="padding: 8px; font-weight: 600; color: #2563eb;">${c}</td>
                <td style="padding: 8px; color: #64748b; font-size: 11px;">
                    ${i.transfer_code?`<b style="color: var(--dalor-navy); font-family: monospace;">[${i.transfer_code}]</b> `:""}${i.notes||"-"}
                </td>
            </tr>
        `}).join("")}async function et(t,o=null,r=null){const s=document.getElementById("personnelHistoryTitle"),a=document.getElementById("personnelHistorySubtitle"),l=document.getElementById("persHistCurrentLoc"),i=document.getElementById("persHistRole"),n=document.getElementById("persHistTotalProjects"),d=document.getElementById("persHistStatusBadge"),e=document.getElementById("personnelHistoryTableBody"),p=(window.allPersonnel&&window.allPersonnel.length>0?window.allPersonnel:L||[]).find(f=>f.id===t)||{},m=o||p.code||`EMP-${t}`,u=r||p.full_name||"Personal / Colaborador";s&&(s.innerHTML=`<i class="fa-solid fa-user-clock" style="color: #2563eb;"></i> Bitácora & Trazabilidad: [${m}] ${u}`),a&&(a.innerText="Cargando historial cronológico de obras, roles y guías de despacho..."),e&&(e.innerHTML='<tr><td colspan="5" style="text-align: center; color: #94a3b8; padding: 20px;"><i class="fa-solid fa-spinner fa-spin"></i> Consultando bitácora del colaborador...</td></tr>'),openModal("modalPersonnelHistory");try{const f=sessionStorage.getItem("dalor_token")||localStorage.getItem("dalor_token")||window.authToken||"",b=f?{Authorization:`Bearer ${f}`}:{},h=await w(`${x}/personnel/${t}/history`,{headers:b});if(!h.ok)throw new Error(`HTTP ${h.status}`);const y=await h.json(),g=y.personnel||{},v=y.timeline||[];if(a&&(a.innerText=`Cédula: ${g.identification_id||g.dni||"-"} | Cargo: ${g.role_title||"Colaborador"} | Teléfono: ${g.phone||"-"}`),l&&(l.innerText=g.current_location||"Sede Central Dalor (Guacara)"),i&&(i.innerText=g.role_title||"Colaborador"),n&&(n.innerText=`${g.total_projects_assigned||v.length} registro(s)`),d){const E=g.status==="disponible_base"||!g.current_project_id;d.innerHTML=`<span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 800; ${E?"background: #dcfce7; color: #166534;":"background: #e0f2fe; color: #0369a1;"}">${(g.status||"DISPONIBLE").toUpperCase().replace(/_/g," ")}</span>`}Q=g,k=v,G=1,K()}catch(f){e&&(e.innerHTML=`<tr><td colspan="5" style="text-align: center; color: #e11d48; padding: 20px;">Error al cargar bitácora del colaborador: ${f.message}</td></tr>`)}}typeof window<"u"&&(window.deleteAssetItem=Re,window.handleOdometerImageSelected=ve,window.loadFleetList=_,window.loadFleetTable=_,window.loadMachineryList=T,window.loadPersonnelTableList=z,window.loadResourceDashboard=O,window.loadToolsList=$,window.onAssetTypeChanged=pe,window.openAssignModal=ce,window.openNewAssetModal=Z,window.openNewPersonnelModal=Ke,window.openNewToolModal=je,window.openNewToolModal_v2=qe,window.openNewVehicleModal=Ce,window.openNewVehicleModal_v2=Ue,window.openOdometerOcrModal=_e,window.openRecordServiceModal=re,window.openResourceSubtab=be,window.returnResourceToBase=Fe,window.submitConfirmOdometer=Ee,window.submitCreateAsset=Ge,window.submitCreatePersonnel=Je,window.submitCreateTool=Ne,window.submitCreateVehicle=Se,window.submitRecordService=he,window.submitResourceAction=De,window.switchResourceSubtab=ee,window.openCalibrateOdometerModal=Ie,window.submitCalibrateOdometer=Te,window.openCalibrateAllOdometersModal=$e,window.submitCalibrateAllOdometers=Be,window.filterToolsList=He,window.assignAvailableToolFromGroup=Le,window.openToolHistoryModal=Oe,window.openAssetHistoryModal=Qe,window.openPersonnelHistoryModal=et,window.goToToolsPage=Pe,window.changeToolsPageSize=Me,window.renderGroupedToolsPaginated=D,window.openVehicleServicesModal=ne,window.filterFleetList=te,window.filterPersonnelList=de,window.onAssetCategorySelected=Ve,window.goToVehServicesPage=xe,window.changeVehServicesPageSize=we,window.renderVehServicesTablePaginated=N,window.goToToolHistoryPage=ze,window.changeToolHistoryPageSize=Ae,window.renderToolHistoryTablePaginated=V,window.goToAssetHistoryPage=Xe,window.changeAssetHistoryPageSize=We,window.renderAssetHistoryTablePaginated=U,window.goToPersonnelHistoryPage=Ye,window.changePersonnelHistoryPageSize=Ze,window.renderPersonnelHistoryTablePaginated=K,window.onRecordServiceTypeChange=ae);
