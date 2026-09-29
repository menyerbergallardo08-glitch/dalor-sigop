var f=window.API_BASE||window.location.origin+"/api/v1",B=window.allDispatchGuides=window.allDispatchGuides||[],v="all",$=0;function g(i,t={}){var e=sessionStorage.getItem("dalor_token")||localStorage.getItem("dalor_token")||"",a=Object.assign({},t.headers||{});return e&&(a.Authorization="Bearer "+e),window.fetch(i,Object.assign({},t,{headers:a}))}function C(i){try{sessionStorage.setItem("dalor_active_subtab_dispatch",i||"list"),localStorage.setItem("dalor_active_subtab_dispatch",i||"list")}catch{}const t=i==="list",e=document.getElementById("subtab-disp-list"),a=document.getElementById("subtab-disp-form"),s=document.getElementById("tabbtn-disp-list"),o=document.getElementById("tabbtn-disp-form");e&&e.classList.toggle("hidden",!t),a&&a.classList.toggle("hidden",t),s&&(s.className=t?"btn-primary":"btn-secondary",s.style.fontWeight=t?"800":"600"),o&&(o.className=t?"btn-secondary":"btn-primary",o.style.fontWeight=t?"600":"800"),t?b():me()}async function Ee(){C("list"),await b()}function pe(i){const t=i==="freeform",e=document.getElementById("disp_is_freeform");e&&(e.value=t?"1":"0");const a=document.getElementById("disp_sec_project_mode"),s=document.getElementById("disp_sec_freeform_mode"),o=document.getElementById("btn_disp_mode_project"),r=document.getElementById("btn_disp_mode_freeform"),n=document.getElementById("disp_mode_hint");a&&(a.style.display=t?"none":"block"),s&&(s.style.display=t?"block":"none"),o&&(o.className=t?"btn-secondary":"btn-primary"),r&&(r.className=t?"btn-primary":"btn-secondary"),n&&(n.innerHTML=t?'<i class="fa-solid fa-circle-info" style="color: #0284c7;"></i> <b>Formato Abierto:</b> Destinatario libre sin forzar cliente ni proyecto DALOR preexistente.':'<i class="fa-solid fa-circle-info" style="color: #0284c7;"></i> <b>Por Obra / Proyecto:</b> Vincula la salida a un cliente y proyecto registrado en el sistema.')}function ue(i){const t=document.getElementById("disp_transport_type");t&&(t.value=i);const e=document.getElementById("btn_mode_propio"),a=document.getElementById("btn_mode_tercerizado"),s=document.getElementById("btn_mode_retiro"),o=document.getElementById("disp_sec_propio"),r=document.getElementById("disp_sec_tercerizado"),n=document.getElementById("disp_sec_retiro");e&&(e.className=i==="propio_dalor"?"btn-primary":"btn-secondary"),a&&(a.className=i==="flete_tercerizado"?"btn-primary":"btn-secondary"),s&&(s.className=i==="retiro_cliente"?"btn-primary":"btn-secondary"),o&&o.classList.toggle("hidden",i!=="propio_dalor"),r&&r.classList.toggle("hidden",i!=="flete_tercerizado"),n&&n.classList.toggle("hidden",i!=="retiro_cliente")}async function me(){pe("project"),ue("propio_dalor");try{const t=document.getElementById("disp_client_id");if(t){let e=window.allClients||[];if(e.length===0){const a=await g(`${f}/clients/`);a.ok&&(e=window.allClients=await a.json())}t.innerHTML='<option value="">-- Seleccionar Cliente Registrado --</option>'+e.map(a=>`<option value="${a.id}">${a.name} (${a.rif||"S/R"})</option>`).join("")}}catch(t){console.warn("Error cargando clientes para despacho:",t)}try{const t=document.getElementById("disp_project_id");if(t){let e=window.allProjects||[];if(e.length===0){const s=await g(`${f}/projects/`);s.ok&&(e=window.allProjects=await s.json())}const a=(e||[]).filter(s=>{const o=(s.status||"").toLowerCase().trim();return!["culminado","completado","cerrado","cancelado","finalizado","inactivo"].includes(o)});t.innerHTML='<option value="">-- Seleccionar Proyecto Activo DALOR --</option>'+a.map(s=>`<option value="${s.id}" data-client-id="${s.client_id||""}">[${s.code||"PRJ-"+s.id}] ${s.name}</option>`).join("")}}catch(t){console.warn("Error cargando proyectos para despacho:",t)}try{const t=document.getElementById("disp_select_asset");if(t){let e=window.allAssets||[];if(e.length===0){const n=await g(`${f}/assets/`);n.ok&&(e=window.allAssets=await n.json())}const a=e.filter(n=>n.category&&n.category.toLowerCase().includes("veh")||n.sub_category&&n.sub_category.toLowerCase().includes("veh")||n.asset_type&&n.asset_type.toLowerCase().includes("veh")||n.asset_code&&n.asset_code.toLowerCase().includes("veh")),s=[],o=[];a.forEach(n=>{const d=(n.status||"").toLowerCase().trim(),l=n.is_active===!1,p=!!n.current_project_id;l||p||["en_obra","asignado","en_mantenimiento","mantenimiento","en_reparacion","reparacion","inactivo","desincorporado","no_disponible"].includes(d)?o.push(n):s.push(n)});let r="";s.length===0?r+='<option value="" disabled selected>-- No hay vehículos de flota disponibles (0 disponibles) --</option>':(r+=`<option value="">-- Seleccionar Vehículo de Flota DALOR (${s.length} disponibles) --</option>`,r+=s.map(n=>{const d=n.license_plate||n.serial_chassis||n.internal_code||"",l=n.asset_code||n.internal_code||"";return`<option value="${n.id}" data-plate="${d}" data-model="${n.name}" data-status="${n.status}">✅ [DISPONIBLE] ${n.name} (${l} - Placa: ${d||"S/P"})</option>`}).join("")),o.length>0&&(r+='<optgroup label="⛔ Vehículos No Disponibles (En Obra / Mantenimiento / Taller / Inactivos)">',r+=o.map(n=>{let d=(n.status||"No Disponible").toUpperCase();n.current_project_id&&(d==="DISPONIBLE"||d==="DISPONIBLE_BASE")&&(d="EN OBRA");const l=n.license_plate||n.serial_chassis||"";return`<option value="${n.id}" disabled style="color: #94a3b8; background-color: #f8fafc;">⛔ [${d}] ${n.name} (${n.asset_code||""} - Placa: ${l||"S/P"})</option>`}).join(""),r+="</optgroup>"),t.innerHTML=r}}catch(t){console.warn("Error cargando vehículos para despacho:",t)}const i=document.getElementById("dispatchItemsTableBody");i&&i.children.length===0&&y()}function fe(){const i=document.getElementById("disp_client_id"),t=document.getElementById("disp_project_id");if(!i||!t)return;const e=i.value;let a=0;const s=t.selectedOptions[0];s&&s.getAttribute("data-client-id")!==e&&(t.value=""),Array.from(t.options).forEach(d=>{if(!d.value)return;const l=d.getAttribute("data-client-id"),p=!e||String(l)===String(e);d.style.display=p?"block":"none",d.disabled=!p,p&&a++});const o=t.options[0];o&&(e?o.textContent=a>0?`-- Seleccionar Obra del Cliente (${a} disponibles) --`:"-- Este cliente no posee obras registradas --":o.textContent="-- Seleccionar Proyecto DALOR --");const n=(window.allClients||[]).find(d=>String(d.id)===String(e));if(n&&n.address){const d=document.getElementById("disp_destination_address");d&&!d.value&&(d.value=n.address)}}function Ie(){const i=document.getElementById("disp_project_id"),t=document.getElementById("disp_client_id");if(!i||!i.value)return;const e=i.value,s=(window.allProjects||[]).find(o=>String(o.id)===String(e));if(s){s.client_id&&t&&(t.value=String(s.client_id),fe(),i.value=String(e));const o=document.getElementById("disp_destination_plant");o&&!o.value&&(o.value=s.name||"Planta de Obra")}}async function De(){const i=document.getElementById("disp_project_id");if(!i||!i.value){typeof window.showToast=="function"?window.showToast("Selecciona un proyecto primero para cargar sus insumos.","warning"):alert("Selecciona un proyecto primero para cargar sus insumos.");return}try{const t=await g(`${f}/projects/${i.value}`);if(!t.ok)throw new Error("No se pudo obtener el proyecto");const e=await t.json(),a=document.getElementById("dispatchItemsTableBody");a&&(a.innerHTML=""),$=0;let s=0;e.materials&&e.materials.length>0&&e.materials.forEach(o=>{y(o.material_name||o.name||"Insumo de Obra",o.quantity||1,o.unit||"Pzas","Nuevo / En Obra",0),s++}),e.assets&&e.assets.length>0&&e.assets.forEach(o=>{y(`Equipo / Herramienta: ${o.name} (${o.internal_code||"S/C"})`,1,"Unid","Operativo / En Uso",0),s++}),s===0?(y(`Materiales para: ${e.name||"Proyecto"}`,1,"Lote","Reparado / Listo para Montaje",0),typeof window.showToast=="function"&&window.showToast("Se cargó renglón base del proyecto.","info")):typeof window.showToast=="function"&&window.showToast(`Se cargaron ${s} ítems asignados al proyecto.`,"success")}catch(t){console.error("Error cargando recursos de proyecto:",t),y()}}function $e(){const i=document.getElementById("disp_select_asset");if(!i||!i.value)return;const e=i.options[i.selectedIndex].getAttribute("data-plate")||"",a=document.getElementById("disp_plate_propio");a&&e&&(a.value=e.toUpperCase())}function y(i="",t=1,e="Pzas",a="Reparado / Listo para Montaje",s=0){const o=document.getElementById("dispatchItemsTableBody");if(!o)return;$++;const r=`disp_row_${$}`,n=document.createElement("tr");n.id=r,n.style.borderBottom="1px solid #e2e8f0",n.innerHTML=`
        <td style="padding: 6px; text-align: center; color: #64748b; font-weight: 700;" class="disp-row-num">
            ${o.children.length+1}
        </td>
        <td style="padding: 6px;">
            <input type="text" class="form-input disp-item-desc" value="${i}" placeholder="Ej: Eje motriz rectificado / Válvula compuerta 6"" style="width: 100%; font-size: 12px;" required>
        </td>
        <td style="padding: 6px;">
            <input type="number" step="0.01" min="0.01" class="form-input disp-item-qty" value="${t}" style="width: 100%; font-size: 12px; text-align: right;" required>
        </td>
        <td style="padding: 6px;">
            <select class="form-select disp-item-unit" style="width: 100%; font-size: 11.5px;">
                <option value="Pzas" ${e==="Pzas"?"selected":""}>Pzas</option>
                <option value="Unid" ${e==="Unid"?"selected":""}>Unid</option>
                <option value="Kg" ${e==="Kg"?"selected":""}>Kg</option>
                <option value="Metros" ${e==="Metros"?"selected":""}>Metros</option>
                <option value="Lote" ${e==="Lote"?"selected":""}>Lote</option>
                <option value="Juego" ${e==="Juego"?"selected":""}>Juego</option>
                <option value="Tambor" ${e==="Tambor"?"selected":""}>Tambor</option>
            </select>
        </td>
        <td style="padding: 6px;">
            <select class="form-select disp-item-cond" style="width: 100%; font-size: 11px;">
                <option value="Reparado / Listo para Montaje" ${a.includes("Reparado")?"selected":""}>Reparado / Listo p/ Montaje</option>
                <option value="Nuevo / Fabricado" ${a.includes("Fabricado")||a.includes("Nuevo")?"selected":""}>Nuevo / Fabricado DALOR</option>
                <option value="Operativo / Buen Estado" ${a.includes("Operativo")?"selected":""}>Operativo / Buen Estado</option>
                <option value="Material en Custodia / Devolución" ${a.includes("Custodia")?"selected":""}>Material en Custodia</option>
                <option value="Dañado / Para Evaluación en Sitio" ${a.includes("Dañado")?"selected":""}>Dañado / Para Evaluación</option>
            </select>
        </td>
        <td style="padding: 6px;">
            <input type="number" step="0.01" class="form-input disp-item-weight" value="${s||""}" placeholder="0.00" style="width: 100%; font-size: 12px; text-align: right;">
        </td>
        <td style="padding: 6px; text-align: center;">
            <button type="button" onclick="removeDispatchItemRow(this)" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 14px; padding: 4px;" title="Eliminar renglón">
                <i class="fa-solid fa-trash-can"></i>
            </button>
        </td>
    `,o.appendChild(n),ge()}function Be(i){const t=i.closest("tr");if(!t)return;const e=t.parentElement;t.remove(),ge(),e&&e.children.length===0&&y()}function ge(){const i=document.getElementById("dispatchItemsTableBody");i&&Array.from(i.children).forEach((t,e)=>{const a=t.querySelector(".disp-row-num");a&&(a.textContent=e+1)})}async function Ce(i){var L,S,T,z,R,O,A,k,F,M,G,N,q,U,V,H,J,K,W,Y,Z,X,Q,ee,te,ie,oe,ne,ae;i&&i.preventDefault&&i.preventDefault();const t=((L=document.getElementById("disp_is_freeform"))==null?void 0:L.value)==="1";let e=null,a=null,s="",o="Despacho de Producción",r="",n="";if(t){if(s=(((F=document.getElementById("disp_freeform_recipient"))==null?void 0:F.value)||"").trim(),o=(((M=document.getElementById("disp_transfer_reason"))==null?void 0:M.value)||"Despacho de Producción").trim(),r=(((G=document.getElementById("disp_ff_destination_plant"))==null?void 0:G.value)||"").trim(),n=(((N=document.getElementById("disp_ff_destination_address"))==null?void 0:N.value)||"").trim(),!s){alert("Por favor ingresa la empresa o destinatario del traslado.");return}if(!n){alert("Por favor ingresa la dirección de destino de la carga.");return}}else{if(e=((S=document.getElementById("disp_client_id"))==null?void 0:S.value)||null,a=((T=document.getElementById("disp_project_id"))==null?void 0:T.value)||null,r=(((z=document.getElementById("disp_destination_plant"))==null?void 0:z.value)||"").trim(),n=(((R=document.getElementById("disp_destination_address"))==null?void 0:R.value)||"").trim(),!n){alert("Por favor indica la dirección completa de destino.");return}const c=document.getElementById("disp_client_id");s=((k=(A=(O=c==null?void 0:c.selectedOptions[0])==null?void 0:O.text)==null?void 0:A.split("(")[0])==null?void 0:k.trim())||"Cliente DALOR"}const d=((q=document.getElementById("disp_transport_type"))==null?void 0:q.value)||"propio_dalor";let l="",p="",u="",h="",P=0,j=0,_=null;if(d==="propio_dalor"){if(_=((U=document.getElementById("disp_select_asset"))==null?void 0:U.value)||null,_){const c=(window.allAssets||[]).find(m=>String(m.id)===String(_));if(c){const m=(c.status||"").toLowerCase().trim();if(c.is_active===!1||["en_mantenimiento","mantenimiento","en_reparacion","reparacion","inactivo","desincorporado","no_disponible"].includes(m)){alert(`⛔ El vehículo seleccionado [${c.asset_code||""}] '${c.name}' NO se encuentra disponible para despacho (Estatus actual: ${c.status}). Por favor selecciona una unidad operativa.`);return}}}if(l=(((V=document.getElementById("disp_driver_name_propio"))==null?void 0:V.value)||"").trim(),p=(((H=document.getElementById("disp_driver_id_propio"))==null?void 0:H.value)||"").trim(),u=(((J=document.getElementById("disp_plate_propio"))==null?void 0:J.value)||"").trim(),h="Transporte Propio DALOR",!l||!u){alert("Completa el nombre del chofer y la placa del vehículo DALOR.");return}}else if(d==="flete_tercerizado"){if(h=(((K=document.getElementById("disp_carrier_company"))==null?void 0:K.value)||"").trim(),l=(((W=document.getElementById("disp_driver_name_ext"))==null?void 0:W.value)||"").trim(),p=(((Y=document.getElementById("disp_driver_id_ext"))==null?void 0:Y.value)||"").trim(),u=(((Z=document.getElementById("disp_plate_ext"))==null?void 0:Z.value)||"").trim(),P=parseFloat(((X=document.getElementById("disp_freight_cost_usd"))==null?void 0:X.value)||0)||0,j=parseFloat(((Q=document.getElementById("disp_freight_price_charged"))==null?void 0:Q.value)||0)||0,!h||!l||!u){alert("Completa la empresa fletera, nombre del chofer y placa para flete tercerizado.");return}}else if(l=(((ee=document.getElementById("disp_driver_name_ret"))==null?void 0:ee.value)||"").trim(),p=(((te=document.getElementById("disp_driver_id_ret"))==null?void 0:te.value)||"").trim(),u=(((ie=document.getElementById("disp_plate_ret"))==null?void 0:ie.value)||"").trim(),h="Retiro Directo por Cliente",!l){alert("Indica el nombre de la persona autorizada que retira.");return}const D=[];if(document.querySelectorAll("#dispatchItemsTableBody tr").forEach(c=>{var re,se,de,le,ce;const m=(((re=c.querySelector(".disp-item-desc"))==null?void 0:re.value)||"").trim(),w=parseFloat(((se=c.querySelector(".disp-item-qty"))==null?void 0:se.value)||1)||1,ve=((de=c.querySelector(".disp-item-unit"))==null?void 0:de.value)||"Pzas",we=((le=c.querySelector(".disp-item-cond"))==null?void 0:le.value)||"Reparado / Listo para Montaje",xe=parseFloat(((ce=c.querySelector(".disp-item-weight"))==null?void 0:ce.value)||0)||0;m&&D.push({description:m,quantity:w,unit:ve,condition_status:we,approx_weight_kg:xe})}),D.length===0){alert("Debes agregar al menos un renglón con la descripción del material o pieza despachada.");return}const _e={project_id:a?parseInt(a):null,client_id:e?parseInt(e):null,recipient_name:s,transfer_reason:o,is_freeform:t,destination_plant:r||null,destination_address:n,transport_type:d,asset_id:_?parseInt(_):null,carrier_company:h,driver_name:l,driver_id_doc:p||"V-00000000",vehicle_plate:u||"S/P",freight_cost_usd:P,freight_price_charged_usd:j,dispatcher_name:(((oe=document.getElementById("disp_dispatcher_name"))==null?void 0:oe.value)||"Despacho Taller Guacara").trim(),quality_inspector:(((ne=document.getElementById("disp_quality_inspector"))==null?void 0:ne.value)||"Control de Calidad DALOR").trim(),notes:(((ae=document.getElementById("disp_notes"))==null?void 0:ae.value)||"").trim(),items:D};try{const c=await g(`${f}/dispatch/`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(_e)});if(!c.ok){const w=await c.json().catch(()=>({}));throw new Error(w.detail||"Error al emitir guía de despacho.")}const m=await c.json();typeof window.showToast=="function"?window.showToast(`Guía de Despacho N° ${m.guide_number} emitida con éxito.`,"success"):alert(`Guía de Despacho N° ${m.guide_number} emitida con éxito.`),C("list"),await b(),confirm(`¿Deseas abrir la Guía Oficial N° ${m.guide_number} para imprimir o guardar en PDF?`)&&be(m.id)}catch(c){console.error("Error al emitir guía:",c),alert("Error: "+c.message)}}async function b(){const i=document.getElementById("dispatchTableBody"),t=document.getElementById("dispatch_count_badge");try{const e=await g(`${f}/dispatch/`);if(!e.ok)throw new Error("Error al consultar guías de despacho.");B=window.allDispatchGuides=await e.json(),Pe(),E(),typeof window.loadProjectRequisitionsBadge=="function"&&window.loadProjectRequisitionsBadge()}catch(e){console.error("Error cargando guías de despacho:",e),i&&(i.innerHTML=`<tr><td colspan="10" style="text-align: center; color: #ef4444; padding: 20px;">Error al cargar guías: ${e.message}</td></tr>`),t&&(t.textContent="Error de conexión")}}function Pe(){const i=B||[],t=i.length,e=i.filter(u=>!u.is_freeform).length,a=i.filter(u=>u.is_freeform).length,s=i.filter(u=>u.status==="en_transito").length,o=i.filter(u=>u.status==="entregada"||u.status==="entregado_conforme").length,r=document.getElementById("count_disp_all"),n=document.getElementById("count_disp_project"),d=document.getElementById("count_disp_freeform"),l=document.getElementById("count_disp_transit"),p=document.getElementById("count_disp_delivered");r&&(r.textContent=t),n&&(n.textContent=e),d&&(d.textContent=a),l&&(l.textContent=s),p&&(p.textContent=o)}function je(i){v=i,["all","project","freeform","transit","delivered"].forEach(e=>{const a=document.getElementById(`btn_disp_filter_${e}`);a&&(a.className=e===i?"btn-primary":"btn-secondary")}),E()}function Le(i){E(i)}let he=[],x=1,ye=15;function Se(i){x=i,I();const t=document.getElementById("dispatchTableBody");t&&t.scrollIntoView({behavior:"smooth",block:"nearest"})}function Te(i){ye=parseInt(i)||15,x=1,I()}function E(i=""){var s;let t=B||[];v==="project"?t=t.filter(o=>!o.is_freeform):v==="freeform"?t=t.filter(o=>o.is_freeform):v==="transit"?t=t.filter(o=>o.status==="en_transito"):v==="delivered"&&(t=t.filter(o=>o.status==="entregada"||o.status==="entregado_conforme"));const e=(typeof i=="string"?i:((s=document.getElementById("dispatch_search_input"))==null?void 0:s.value)||"").trim().toLowerCase();e&&(t=t.filter(o=>o.guide_number&&o.guide_number.toLowerCase().includes(e)||o.client_name&&o.client_name.toLowerCase().includes(e)||o.recipient_name&&o.recipient_name.toLowerCase().includes(e)||o.project_code&&o.project_code.toLowerCase().includes(e)||o.project_name&&o.project_name.toLowerCase().includes(e)||o.transfer_reason&&o.transfer_reason.toLowerCase().includes(e)||o.driver_name&&o.driver_name.toLowerCase().includes(e)||o.vehicle_plate&&o.vehicle_plate.toLowerCase().includes(e)));const a=document.getElementById("dispatch_count_badge");a&&(a.textContent=`${t.length} guías mostradas`),he=t,x=1,I()}function I(){const i=document.getElementById("dispatchTableBody");if(!i)return;const t=he;if(t.length===0){i.innerHTML='<tr><td colspan="10" style="text-align: center; color: #94a3b8; padding: 28px;">No se encontraron guías de despacho registradas con el filtro actual.</td></tr>';const r=document.getElementById("dispatchPaginationContainer");r&&(r.innerHTML="");return}const e=typeof window.renderPaginationControls=="function"?window.renderPaginationControls:typeof renderPaginationControls=="function"?renderPaginationControls:()=>({startIndex:0,endIndex:t.length}),{startIndex:a,endIndex:s}=e({containerId:"dispatchPaginationContainer",totalItems:t.length,currentPage:x,pageSize:ye,onPageChange:"goToDispatchPage",onPageSizeChange:"changeDispatchPageSize",itemLabel:"guía(s) de despacho",pageSizeOptions:[10,15,25,50,100]}),o=t.slice(a,s);i.innerHTML=o.map(r=>{const n=!!r.is_freeform,d=r.status==="entregada"||r.status==="entregado_conforme",l=d?'<span style="background: #ecfdf5; color: #047857; font-weight: 800; padding: 3px 8px; border-radius: 12px; font-size: 10.5px; border: 1px solid #a7f3d0;"><i class="fa-solid fa-circle-check"></i> Entregada</span>':'<span style="background: #fff7ed; color: #c2410c; font-weight: 800; padding: 3px 8px; border-radius: 12px; font-size: 10.5px; border: 1px solid #fed7aa;"><i class="fa-solid fa-truck-fast"></i> En Tránsito</span>',p=n?'<span style="background: #fef3c7; color: #92400e; font-weight: 800; padding: 2px 7px; border-radius: 6px; font-size: 10px; border: 1px solid #fde68a;"><i class="fa-solid fa-feather-pointed"></i> Libre</span>':'<span style="background: #e0f2fe; color: #0369a1; font-weight: 800; padding: 2px 7px; border-radius: 6px; font-size: 10px; border: 1px solid #bae6fd;"><i class="fa-solid fa-building"></i> Obra</span>',u=n?r.recipient_name||"Destinatario Libre":r.client_name||"Cliente DALOR",h=n?r.transfer_reason||"Traslado Libre":r.project_code?`${r.project_code} - ${r.project_name}`:"Servicio Directo";return`
            <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.15s ease;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'">
                <td style="padding: 10px; font-weight: 900; color: var(--dalor-navy);">
                    ${r.guide_number}
                </td>
                <td style="padding: 10px; color: #64748b; font-size: 11px;">
                    ${r.dispatch_date||"-"}
                </td>
                <td style="padding: 10px; text-align: center;">
                    ${p}
                </td>
                <td style="padding: 10px; font-weight: 700; color: #1e293b;">
                    <div>${u}</div>
                    <div style="font-size: 10px; color: #64748b; font-weight: 400;">${r.destination_plant?r.destination_plant+" &bull; ":""}${r.destination_address||""}</div>
                </td>
                <td style="padding: 10px; color: #334155; font-size: 11.5px;">
                    ${h}
                </td>
                <td style="padding: 10px; font-size: 11.5px; color: #475569;">
                    <div><b>${r.driver_name}</b></div>
                    <div style="font-size: 10px; color: #64748b;">${r.vehicle_plate} &bull; ${r.transport_type==="flete_tercerizado"?"Tercerizado":r.transport_type==="retiro_cliente"?"Retiro":"DALOR"}</div>
                </td>
                <td style="padding: 10px; text-align: center; font-weight: 700;">
                    <span style="background: #f1f5f9; color: #334155; padding: 2px 7px; border-radius: 10px; font-size: 11px;">
                        ${r.items_count||(r.items?r.items.length:0)} renglones
                    </span>
                </td>
                <td style="padding: 10px; text-align: right; font-weight: 800; color: #475569;">
                    $${(r.freight_cost_usd||0).toFixed(2)}
                </td>
                <td style="padding: 10px; text-align: center;">
                    ${l}
                </td>
                <td style="padding: 10px; text-align: center;">
                    <div style="display: inline-flex; gap: 4px;">
                        <button type="button" onclick="printOfficialDispatchGuide(${r.id})" class="btn-secondary" style="padding: 4px 8px; font-size: 11px;" title="Ver e Imprimir Guía Oficial">
                            <i class="fa-solid fa-print"></i>
                        </button>
                        ${d?"":`
                            <button type="button" onclick="openConfirmDeliveryModal(${r.id}, '${r.guide_number}')" class="btn-primary" style="padding: 4px 8px; font-size: 11px; background: #059669;" title="Confirmar Recepción / Entrega">
                                <i class="fa-solid fa-clipboard-check"></i>
                            </button>
                        `}
                        <button type="button" onclick="deleteDispatchGuide(${r.id}, '${r.guide_number}')" class="btn-secondary" style="padding: 4px 8px; font-size: 11px; color: #dc2626;" title="Eliminar Guía">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `}).join("")}function ze(i,t){const e=document.getElementById("conf_disp_id"),a=document.getElementById("conf_disp_guide_text");if(e&&(e.value=i),a&&(a.innerHTML=`Registra los datos de recepción para la <b>Guía N° ${t}</b>:`),typeof window.openModal=="function")window.openModal("modalConfirmDelivery");else{const s=document.getElementById("modalConfirmDelivery");s&&s.classList.remove("hidden")}}async function Re(i){var o,r,n,d;i&&i.preventDefault&&i.preventDefault();const t=(o=document.getElementById("conf_disp_id"))==null?void 0:o.value,e=(((r=document.getElementById("conf_received_by"))==null?void 0:r.value)||"").trim(),a=(((n=document.getElementById("conf_received_id_doc"))==null?void 0:n.value)||"").trim(),s=(((d=document.getElementById("conf_notes"))==null?void 0:d.value)||"").trim();if(!t||!e){alert("Completa el nombre de la persona que recibió en destino.");return}try{const l=await g(`${f}/dispatch/${t}/confirm-delivery`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({received_by:e,received_by_client_name:e,received_by_client_id_doc:a||"V-Receptor",notes:s})});if(!l.ok){const p=await l.json().catch(()=>({}));throw new Error(p.detail||"Error al confirmar recepción.")}if(typeof window.closeModal=="function")window.closeModal("modalConfirmDelivery");else{const p=document.getElementById("modalConfirmDelivery");p&&p.classList.add("hidden")}typeof window.showToast=="function"?window.showToast("Recepción de entrega registrada exitosamente.","success"):alert("Recepción de entrega registrada exitosamente."),await b()}catch(l){console.error("Error confirmando recepción:",l),alert("Error: "+l.message)}}async function Oe(i,t){if(confirm(`¿Estás seguro de anular/eliminar la Guía de Despacho N° ${t}? Esta acción es irreversible.`))try{const e=await g(`${f}/dispatch/${i}`,{method:"DELETE"});if(!e.ok){const a=await e.json().catch(()=>({}));throw new Error(a.detail||"Error al eliminar guía.")}typeof window.showToast=="function"?window.showToast(`Guía ${t} eliminada correctamente.`,"info"):alert(`Guía ${t} eliminada correctamente.`),await b()}catch(e){console.error("Error eliminando guía:",e),alert("Error: "+e.message)}}async function be(i){try{const t=await g(`${f}/dispatch/${i}`);if(!t.ok)throw new Error("No se pudo cargar la información de la guía.");const e=await t.json(),a=!!e.is_freeform,s=a?e.recipient_name||"Destinatario Libre":e.client_name||"Cliente DALOR",o=a?e.transfer_reason||"Traslado Libre":`${e.project_code||"PRJ"} - ${e.project_name||"Servicio de Taller"}`;let r=e.items&&e.items.length>0?e.items.map((d,l)=>`
            <tr style="border-bottom: 1px solid #cbd5e1;">
                <td style="padding: 7px; text-align: center; font-weight: 700;">${l+1}</td>
                <td style="padding: 7px; font-weight: 600;">${d.description}</td>
                <td style="padding: 7px; text-align: right; font-weight: 800;">${d.quantity}</td>
                <td style="padding: 7px; text-align: center;">${d.unit||"Pzas"}</td>
                <td style="padding: 7px;">${d.condition_status||"Listo para Montaje"}</td>
                <td style="padding: 7px; text-align: right;">${d.approx_weight_kg?d.approx_weight_kg.toFixed(2)+" Kg":"-"}</td>
            </tr>
        `).join(""):'<tr><td colspan="6" style="padding: 12px; text-align: center; color: #64748b;">Sin renglones especificados</td></tr>';const n=window.open("","_blank");if(!n){alert("Por favor habilita las ventanas emergentes (pop-ups) para imprimir la guía.");return}n.document.write(`
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <title>Guía de Despacho ${e.guide_number} - DALOR</title>
                <style>
                    @page {
                        size: letter portrait;
                        margin: 12mm 15mm;
                    }
                    body { 
                        font-family: 'Segoe UI', Arial, sans-serif; 
                        font-size: 11.5px; 
                        color: #0f172a; 
                        margin: 0; 
                        padding: 24px; 
                        -webkit-print-color-adjust: exact; 
                        print-color-adjust: exact;
                    }
                    .header-box { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #002B49; padding-bottom: 14px; margin-bottom: 14px; page-break-inside: avoid; }
                    .info-grid { display: grid; grid-template-columns: 1.2fr 1fr; gap: 14px; margin-bottom: 16px; page-break-inside: avoid; }
                    .info-card { border: 1.5px solid #cbd5e1; border-radius: 6px; padding: 10px 12px; background: #f8fafc; }
                    .info-card h4 { margin: 0 0 6px 0; font-size: 11px; text-transform: uppercase; color: #002B49; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px; page-break-inside: auto; }
                    thead { display: table-header-group; }
                    tfoot { display: table-footer-group; }
                    tr { page-break-inside: avoid; page-break-after: auto; }
                    th { background: #002B49 !important; color: white !important; padding: 7px 8px; text-align: left; font-size: 10.5px; text-transform: uppercase; }
                    td { padding: 6px 8px; }
                    .signatures-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 24px; text-align: center; page-break-inside: avoid; }
                    .sig-box { border: 1px solid #94a3b8; border-radius: 4px; padding: 8px 6px; height: 95px; display: flex; flex-direction: column; justify-content: space-between; font-size: 10.5px; page-break-inside: avoid; }
                    .sig-line { border-top: 1px dashed #64748b; margin-top: 35px; padding-top: 4px; font-weight: 700; color: #334155; }
                    @media print {
                        body { padding: 0; }
                        button { display: none !important; }
                        .no-print { display: none !important; }
                    }
                </style>
            </head>
            <body>
                <div style="text-align: right; margin-bottom: 10px;">
                    <button onclick="window.print()" style="background: #002B49; color: white; border: none; padding: 8px 16px; font-weight: bold; border-radius: 6px; cursor: pointer;">
                        🖨️ Imprimir Guía / Guardar PDF
                    </button>
                </div>

                <div class="header-box">
                    <div style="display: flex; align-items: center; gap: 14px;">
                        <img src="/logo_dalor.jpg" alt="DALOR" style="height: 52px; max-width: 140px; object-fit: contain;" onerror="this.style.display='none'">
                        <div>
                            <h1 style="font-size: 18px; font-weight: 900; color: #002B49; margin: 0; text-transform: uppercase;">Metalmecánica Dalor, C.A.</h1>
                            <p style="font-size: 11px; font-weight: 700; color: #0284c7; margin: 2px 0 0 0;">RIF: <b>J-31601195-0</b> &bull; Mantenimiento Predictivo & Montajes Industriales</p>
                            <p style="font-size: 10px; color: #64748b; margin: 2px 0 0 0;">Av. Cámara de las Industrias, Galpón 10, Z.I. El Tigre, Guacara, Edo. Carabobo &bull; Telf: +58 0412-2407079</p>
                        </div>
                    </div>
                    <div style="text-align: right; border: 2px solid #002B49; padding: 8px 14px; border-radius: 6px; background: #f8fafc; min-width: 220px;">
                        <div style="font-size: 11px; font-weight: 900; color: #002B49; text-transform: uppercase;">GUÍA OFICIAL DE TRASLADO Y NOTA DE ENTREGA</div>
                        <div style="font-size: 18px; font-weight: 900; color: #dc2626; margin-top: 3px;">N° ${e.guide_number}</div>
                        <div style="font-size: 10.5px; color: #475569; margin-top: 2px;">Fecha: <b>${e.dispatch_date||new Date().toLocaleString("es-VE")}</b></div>
                    </div>
                </div>

                <div class="info-grid">
                    <div class="info-card">
                        <h4>1. Datos del Destinatario & Obra / Motivo</h4>
                        <div><b>Destinatario / Razón Social:</b> ${s}</div>
                        <div><b>Motivo / Proyecto:</b> ${o}</div>
                        <div><b>Planta / Almacén Destino:</b> ${e.destination_plant||"Recepción en Sitio"}</div>
                        <div><b>Dirección de Entrega:</b> ${e.destination_address||"Sin dirección especificada"}</div>
                    </div>

                    <div class="info-card">
                        <h4>2. Control de Transporte & Vehículo</h4>
                        <div><b>Modalidad:</b> ${e.transport_type==="propio_dalor"?"Flota Propia DALOR":e.transport_type==="flete_tercerizado"?"Flete Tercerizado":"Retiro en Taller por Cliente"}</div>
                        <div><b>Empresa / Fletero:</b> ${e.carrier_company||"DALOR C.A."}</div>
                        <div><b>Conductor:</b> ${e.driver_name} (C.I: ${e.driver_id_doc})</div>
                        <div><b>Placa / Batea:</b> <b style="text-transform: uppercase;">${e.vehicle_plate}</b> ${e.vehicle_model?"("+e.vehicle_model+")":""}</div>
                    </div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th style="width: 35px; text-align: center;">#</th>
                            <th>Descripción de la Carga / Pieza Fabricada o Reparada</th>
                            <th style="width: 70px; text-align: right;">Cantidad</th>
                            <th style="width: 60px; text-align: center;">Unidad</th>
                            <th style="width: 170px;">Condición Física</th>
                            <th style="width: 80px; text-align: right;">Peso Aprox</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${r}
                    </tbody>
                </table>

                <div style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 12px; margin-bottom: 20px; background: #fafafa; font-size: 11px;">
                    <b>Observaciones & Precintos:</b> ${e.notes||"Carga verificada y apta para despacho."} &bull; <b>Inspector:</b> ${e.quality_inspector||"Control de Calidad"}
                </div>

                ${e.status==="entregada"||e.status==="entregado_conforme"?`
                    <div style="border: 1.5px solid #10b981; border-radius: 6px; padding: 8px 12px; margin-bottom: 20px; background: #ecfdf5; font-size: 11px; color: #065f46;">
                        <i class="fa-solid fa-circle-check"></i> <b>Constancia de Recepción Conforme:</b> Recibido por <b>${e.received_by_client_name}</b> (C.I: ${e.received_by_client_id_doc}) en fecha <b>${e.reception_date}</b>.
                    </div>
                `:""}

                <div class="signatures-grid">
                    <div class="sig-box">
                        <span>Despachado por DALOR:</span>
                        <div class="sig-line">${e.dispatcher_name||"Despacho Taller"}</div>
                    </div>
                    <div class="sig-box">
                        <span>Transportista / Conductor:</span>
                        <div class="sig-line">${e.driver_name}</div>
                    </div>
                    <div class="sig-box">
                        <span>Control de Calidad:</span>
                        <div class="sig-line">${e.quality_inspector||"DALOR"}</div>
                    </div>
                    <div class="sig-box">
                        <span>Recibido Conforme (Cliente):</span>
                        <div class="sig-line">Firma, C.I. y Sello</div>
                    </div>
                </div>

                <div style="text-align: center; margin-top: 25px; font-size: 10px; color: #64748b;">
                    Documento emitido por el Sistema Integrado de Gestión Operativa (DALOR SIGO-P) &bull; RIF J-31601195-0
                </div>
            </body>
            </html>
        `),n.document.close()}catch(t){console.error("Error imprimiendo guía de despacho:",t),alert("Error: "+t.message)}}typeof window<"u"&&(window.switchDispatchSubtab=C,window.initDispatchView=Ee,window.initDispatchForm=me,window.setDispatchMode=pe,window.setDispatchTransportMode=ue,window.setDispatchFilter=je,window.filterDispatchList=Le,window.renderDispatchTable=E,window.onDispatchClientChanged=fe,window.onDispatchProjectChanged=Ie,window.loadProjectResourcesIntoDispatch=De,window.onDispatchAssetChanged=$e,window.addDispatchItemRow=y,window.removeDispatchItemRow=Be,window.submitCreateDispatchGuide=Ce,window.loadDispatchGuidesList=b,window.openConfirmDeliveryModal=ze,window.submitConfirmDelivery=Re,window.deleteDispatchGuide=Oe,window.printOfficialDispatchGuide=be,window.goToDispatchPage=Se,window.changeDispatchPageSize=Te,window.renderDispatchPaginated=I);
