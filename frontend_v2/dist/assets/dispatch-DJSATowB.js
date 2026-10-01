var y=window.API_BASE||window.location.origin+"/api/v1",A=window.allDispatchGuides=window.allDispatchGuides||[],x="all",P=0;function h(o,i={}){var e=sessionStorage.getItem("dalor_token")||localStorage.getItem("dalor_token")||"",n=Object.assign({},i.headers||{});return e&&(n.Authorization="Bearer "+e),window.fetch(o,Object.assign({},i,{headers:n}))}function S(o){try{sessionStorage.setItem("dalor_active_subtab_dispatch",o||"list"),localStorage.setItem("dalor_active_subtab_dispatch",o||"list")}catch{}const i=o==="list",e=document.getElementById("subtab-disp-list"),n=document.getElementById("subtab-disp-form"),s=document.getElementById("tabbtn-disp-list"),t=document.getElementById("tabbtn-disp-form");e&&e.classList.toggle("hidden",!i),n&&n.classList.toggle("hidden",i),s&&(s.className=i?"btn-primary":"btn-secondary",s.style.fontWeight=i?"800":"600"),t&&(t.className=i?"btn-secondary":"btn-primary",t.style.fontWeight=i?"600":"800"),i?I():Ee()}async function Se(){S("list"),await I()}function xe(o){const i=o==="freeform",e=o==="internal",n=document.getElementById("disp_is_freeform"),s=document.getElementById("disp_guide_type");n&&(n.value=i?"1":"0"),s&&(s.value=e?"control_interno":"traslado_externo");const t=document.getElementById("disp_sec_project_mode"),a=document.getElementById("disp_sec_freeform_mode"),r=document.getElementById("disp_sec_internal_mode"),d=document.getElementById("disp_sec_trans_external"),c=document.getElementById("disp_sec_trans_internal"),u=document.getElementById("btn_disp_mode_project"),m=document.getElementById("btn_disp_mode_freeform"),f=document.getElementById("btn_disp_mode_internal"),l=document.getElementById("disp_mode_hint"),_=document.getElementById("disp_step1_title"),g=document.getElementById("disp_step2_title"),w=document.getElementById("disp_step3_title");t&&(t.style.display=!i&&!e?"block":"none"),a&&(a.style.display=i?"block":"none"),r&&(r.style.display=e?"block":"none"),d&&(d.style.display=e?"none":"block"),c&&(c.style.display=e?"block":"none"),u&&(u.className=!i&&!e?"btn-primary":"btn-secondary"),m&&(m.className=i?"btn-primary":"btn-secondary"),f&&(f.className=e?"btn-primary":"btn-secondary"),l&&(e?l.innerHTML='<i class="fa-solid fa-circle-info" style="color: #2563eb;"></i> <b>Control Interno Taller Guacara:</b> Nomenclatura <b>GCI-2026-XXXX</b> para custodia de maquinaria, herramientas y salida de insumos a taller en sede.':i?l.innerHTML='<i class="fa-solid fa-circle-info" style="color: #0284c7;"></i> <b>Formato Abierto (GD):</b> Traslado legal con correlativo <b>GD-2026-XXXX</b> a destinatario libre.':l.innerHTML='<i class="fa-solid fa-circle-info" style="color: #0284c7;"></i> <b>Por Obra / Proyecto (GD):</b> Emisión de guía oficial <b>GD-2026-XXXX</b> vinculada a un cliente y proyecto registrado.'),_&&(_.textContent=e?"Datos del Traslado Interno & Destino en Sede":i?"Datos del Destinatario & Motivo Libre":"Datos del Destinatario & Obra / Motivo"),g&&(g.textContent=e?"Custodios & Responsables de Entrega Interna":"Modalidad de Transporte, Vehículo & Conductor"),w&&(w.textContent=e?"Maquinaria, Equipos & Insumos en Movimiento Interno":"Carga / Piezas / Componentes Despachados")}function Ie(o){const i=document.getElementById("disp_transport_type");i&&(i.value=o);const e=document.getElementById("btn_mode_propio"),n=document.getElementById("btn_mode_tercerizado"),s=document.getElementById("btn_mode_retiro"),t=document.getElementById("disp_sec_propio"),a=document.getElementById("disp_sec_tercerizado"),r=document.getElementById("disp_sec_retiro");e&&(e.className=o==="propio_dalor"?"btn-primary":"btn-secondary"),n&&(n.className=o==="flete_tercerizado"?"btn-primary":"btn-secondary"),s&&(s.className=o==="retiro_cliente"?"btn-primary":"btn-secondary"),t&&t.classList.toggle("hidden",o!=="propio_dalor"),a&&a.classList.toggle("hidden",o!=="flete_tercerizado"),r&&r.classList.toggle("hidden",o!=="retiro_cliente")}async function Ee(){xe("project"),Ie("propio_dalor");try{const i=document.getElementById("disp_client_id");if(i){let e=window.allClients||[];if(e.length===0){const n=await h(`${y}/clients/`);n.ok&&(e=window.allClients=await n.json())}i.innerHTML='<option value="">-- Seleccionar Cliente Registrado --</option>'+e.map(n=>`<option value="${n.id}">${n.name} (${n.rif||"S/R"})</option>`).join("")}}catch(i){console.warn("Error cargando clientes para despacho:",i)}try{const i=document.getElementById("disp_project_id"),e=document.getElementById("disp_ci_project_id");let n=window.allProjects||[];if(n.length===0){const t=await h(`${y}/projects/`);t.ok&&(n=window.allProjects=await t.json())}const s=(n||[]).filter(t=>{const a=(t.status||"").toLowerCase().trim();return!["culminado","completado","cerrado","cancelado","finalizado","inactivo"].includes(a)});i&&(i.innerHTML='<option value="">-- Seleccionar Proyecto Activo DALOR --</option>'+s.map(t=>`<option value="${t.id}" data-client-id="${t.client_id||""}">[${t.code||"PRJ-"+t.id}] ${t.name}</option>`).join("")),e&&(e.innerHTML='<option value="">-- Operación General Sede (Sin Proyecto) --</option>'+s.map(t=>`<option value="${t.id}">[${t.code||"PRJ-"+t.id}] ${t.name}</option>`).join(""))}catch(i){console.warn("Error cargando proyectos para despacho:",i)}try{let i=window.allPersonnel||[];if(i.length===0){const t=await h(`${y}/personnel/`);t.ok&&(i=window.allPersonnel=await t.json())}const e=document.getElementById("disp_select_driver_personnel");e&&i.length>0&&(e.innerHTML='<option value="">-- Seleccionar Chofer del Personal (Opcional) --</option><option value="__MANUAL__">➕ Escribir Chofer Manualmente / Flete Externo</option>'+i.map(t=>`<option value="${t.id}" data-name="${t.full_name}" data-id-doc="${t.id_document||""}">[${t.code}] ${t.full_name} (${t.id_document||"S/C"})</option>`).join(""));const n=document.getElementById("disp_ci_delivered_select");n&&i.length>0&&(n.innerHTML='<option value="">-- Seleccionar de Personal DALOR --</option>'+i.map(t=>`<option value="${t.id}" data-name="${t.full_name}">[${t.code}] ${t.full_name} (${t.role_title||"Almacén"})</option>`).join(""));const s=document.getElementById("disp_ci_received_select");s&&i.length>0&&(s.innerHTML='<option value="">-- Seleccionar de Personal DALOR --</option>'+i.map(t=>`<option value="${t.id}" data-name="${t.full_name}">[${t.code}] ${t.full_name} (${t.role_title||"Taller"})</option>`).join(""))}catch(i){console.warn("Error cargando personal para despacho:",i)}try{const i=document.getElementById("disp_select_asset");if(i){let e=window.allAssets||[];if(e.length===0){const r=await h(`${y}/assets/`);r.ok&&(e=window.allAssets=await r.json())}const n=e.filter(r=>r.category&&r.category.toLowerCase().includes("veh")||r.sub_category&&r.sub_category.toLowerCase().includes("veh")||r.asset_type&&r.asset_type.toLowerCase().includes("veh")||r.asset_code&&r.asset_code.toLowerCase().includes("veh")),s=[],t=[];n.forEach(r=>{const d=(r.status||"").toLowerCase().trim(),c=r.is_active===!1,u=!!r.current_project_id;c||u||["en_obra","asignado","en_mantenimiento","mantenimiento","en_reparacion","reparacion","inactivo","desincorporado","no_disponible"].includes(d)?t.push(r):s.push(r)});let a="";s.length===0?a+='<option value="" disabled selected>-- No hay vehículos de flota disponibles (0 disponibles) --</option>':(a+=`<option value="">-- Seleccionar Vehículo de Flota DALOR (${s.length} disponibles) --</option>`,a+=s.map(r=>{const d=r.license_plate||r.serial_chassis||r.internal_code||"",c=r.asset_code||r.internal_code||"";return`<option value="${r.id}" data-plate="${d}" data-model="${r.name}" data-status="${r.status}">✅ [DISPONIBLE] ${r.name} (${c} - Placa: ${d||"S/P"})</option>`}).join("")),t.length>0&&(a+='<optgroup label="⛔ Vehículos No Disponibles (En Obra / Mantenimiento / Taller / Inactivos)">',a+=t.map(r=>{let d=(r.status||"No Disponible").toUpperCase();r.current_project_id&&(d==="DISPONIBLE"||d==="DISPONIBLE_BASE")&&(d="EN OBRA");const c=r.license_plate||r.serial_chassis||"";return`<option value="${r.id}" disabled style="color: #94a3b8; background-color: #f8fafc;">⛔ [${d}] ${r.name} (${r.asset_code||""} - Placa: ${c||"S/P"})</option>`}).join(""),a+="</optgroup>"),i.innerHTML=a}}catch(i){console.warn("Error cargando vehículos para despacho:",i)}const o=document.getElementById("dispatchItemsTableBody");o&&o.children.length===0&&v()}function je(){const o=document.getElementById("disp_select_driver_personnel");if(!o)return;const i=o.options[o.selectedIndex];if(!i||!i.value||i.value==="__MANUAL__")return;const e=i.getAttribute("data-name")||"",n=i.getAttribute("data-id-doc")||"",s=document.getElementById("disp_driver_name_propio"),t=document.getElementById("disp_driver_id_propio");s&&e&&(s.value=e),t&&n&&(t.value=n)}function Re(){const o=document.getElementById("disp_ci_delivered_select");if(!o)return;const i=o.options[o.selectedIndex];if(!i||!i.value)return;const e=i.getAttribute("data-name")||"",n=document.getElementById("disp_ci_delivered_staff");n&&e&&(n.value=e+" (Almacén Central DALOR)")}function Oe(){const o=document.getElementById("disp_ci_received_select");if(!o)return;const i=o.options[o.selectedIndex];if(!i||!i.value)return;const e=i.getAttribute("data-name")||"",n=document.getElementById("disp_ci_received_staff");n&&e&&(n.value=e+" (Taller Metalmecánico)")}async function ze(){try{let o=window.allAssets||[];if(o.length===0){const t=await h(`${y}/assets/`);t.ok&&(o=window.allAssets=await t.json())}if(o.length===0){alert("No se encontraron activos o herramientas registradas.");return}const e=prompt(`Ingresa el nombre o código de la maquinaria/equipo DALOR a agregar:
(Ej: Máquina de Soldar Miller, Torno Paralelo, Esmeril 9"):`);if(!e)return;const n=o.find(t=>t.name&&t.name.toLowerCase().includes(e.toLowerCase())||t.asset_code&&t.asset_code.toLowerCase().includes(e.toLowerCase())),s=n?`Equipo DALOR: ${n.name} (${n.asset_code||n.internal_code||"S/C"})`:`Equipo DALOR: ${e}`;v(s,1,"Unid","Operativo / En Custodia",0),typeof window.showToast=="function"&&window.showToast("Equipo agregado a los ítems del vale.","success")}catch(o){console.error("Error cargando maquinaria DALOR en despacho:",o)}}function De(){const o=document.getElementById("disp_client_id"),i=document.getElementById("disp_project_id");if(!o||!i)return;const e=o.value;let n=0;const s=i.selectedOptions[0];s&&s.getAttribute("data-client-id")!==e&&(i.value=""),Array.from(i.options).forEach(d=>{if(!d.value)return;const c=d.getAttribute("data-client-id"),u=!e||String(c)===String(e);d.style.display=u?"block":"none",d.disabled=!u,u&&n++});const t=i.options[0];t&&(e?t.textContent=n>0?`-- Seleccionar Obra del Cliente (${n} disponibles) --`:"-- Este cliente no posee obras registradas --":t.textContent="-- Seleccionar Proyecto DALOR --");const r=(window.allClients||[]).find(d=>String(d.id)===String(e));if(r&&r.address){const d=document.getElementById("disp_destination_address");d&&!d.value&&(d.value=r.address)}}function Me(){const o=document.getElementById("disp_project_id"),i=document.getElementById("disp_client_id");if(!o||!o.value)return;const e=o.value,s=(window.allProjects||[]).find(t=>String(t.id)===String(e));if(s){s.client_id&&i&&(i.value=String(s.client_id),De(),o.value=String(e));const t=document.getElementById("disp_destination_plant");t&&!t.value&&(t.value=s.name||"Planta de Obra")}}async function ke(){const o=document.getElementById("disp_project_id");if(!o||!o.value){typeof window.showToast=="function"?window.showToast("Selecciona un proyecto primero para cargar sus insumos.","warning"):alert("Selecciona un proyecto primero para cargar sus insumos.");return}try{const i=await h(`${y}/projects/${o.value}`);if(!i.ok)throw new Error("No se pudo obtener el proyecto");const e=await i.json(),n=document.getElementById("dispatchItemsTableBody");n&&(n.innerHTML=""),P=0;let s=0;e.materials&&e.materials.length>0&&e.materials.forEach(t=>{v(t.material_name||t.name||"Insumo de Obra",t.quantity||1,t.unit||"Pzas","Nuevo / En Obra",0),s++}),e.assets&&e.assets.length>0&&e.assets.forEach(t=>{v(`Equipo / Herramienta: ${t.name} (${t.internal_code||"S/C"})`,1,"Unid","Operativo / En Uso",0),s++}),s===0?(v(`Materiales para: ${e.name||"Proyecto"}`,1,"Lote","Reparado / Listo para Montaje",0),typeof window.showToast=="function"&&window.showToast("Se cargó renglón base del proyecto.","info")):typeof window.showToast=="function"&&window.showToast(`Se cargaron ${s} ítems asignados al proyecto.`,"success")}catch(i){console.error("Error cargando recursos de proyecto:",i),v()}}function Ge(){const o=document.getElementById("disp_select_asset");if(!o||!o.value)return;const e=o.options[o.selectedIndex].getAttribute("data-plate")||"",n=document.getElementById("disp_plate_propio");n&&e&&(n.value=e.toUpperCase())}function v(o="",i=1,e="Pzas",n="Reparado / Listo para Montaje",s=0){const t=document.getElementById("dispatchItemsTableBody");if(!t)return;P++;const a=`disp_row_${P}`,r=document.createElement("tr");r.id=a,r.style.borderBottom="1px solid #e2e8f0",r.innerHTML=`
        <td style="padding: 6px; text-align: center; color: #64748b; font-weight: 700;" class="disp-row-num">
            ${t.children.length+1}
        </td>
        <td style="padding: 6px;">
            <input type="text" class="form-input disp-item-desc" value="${o}" placeholder="Ej: Eje motriz rectificado / Válvula compuerta 6"" style="width: 100%; font-size: 12px;" required>
        </td>
        <td style="padding: 6px;">
            <input type="number" step="0.01" min="0.01" class="form-input disp-item-qty" value="${i}" style="width: 100%; font-size: 12px; text-align: right;" required>
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
                <option value="Reparado / Listo para Montaje" ${n.includes("Reparado")?"selected":""}>Reparado / Listo p/ Montaje</option>
                <option value="Nuevo / Fabricado" ${n.includes("Fabricado")||n.includes("Nuevo")?"selected":""}>Nuevo / Fabricado DALOR</option>
                <option value="Operativo / Buen Estado" ${n.includes("Operativo")?"selected":""}>Operativo / Buen Estado</option>
                <option value="Material en Custodia / Devolución" ${n.includes("Custodia")?"selected":""}>Material en Custodia</option>
                <option value="Dañado / Para Evaluación en Sitio" ${n.includes("Dañado")?"selected":""}>Dañado / Para Evaluación</option>
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
    `,t.appendChild(r),Ce()}function Ne(o){const i=o.closest("tr");if(!i)return;const e=i.parentElement;i.remove(),Ce(),e&&e.children.length===0&&v()}function Ce(){const o=document.getElementById("dispatchItemsTableBody");o&&Array.from(o.children).forEach((i,e)=>{const n=i.querySelector(".disp-row-num");n&&(n.textContent=e+1)})}async function Fe(o){var R,O,z,M,k,G,N,F,q,V,U,H,J,X,W,K,Y,Z,Q,ee,te,ie,oe,ne,ae,re,se,de,le,ce,pe,ue,me,fe,ge,_e;o&&o.preventDefault&&o.preventDefault();const i=((R=document.getElementById("disp_guide_type"))==null?void 0:R.value)||"traslado_externo",e=((O=document.getElementById("disp_is_freeform"))==null?void 0:O.value)==="1";let n=null,s=null,t="",a="Despacho de Producción",r="",d="",c=null,u=null;if(i==="control_interno"){t="Metalmecánica Dalor - Sede Guacara",a=(((z=document.getElementById("disp_ci_reason"))==null?void 0:z.value)||"Uso Operativo en Taller").trim(),r=(((M=document.getElementById("disp_ci_destination_area"))==null?void 0:M.value)||"Taller Metalmecánico").trim(),d="Sede Dalor Guacara, Av. Cámara de las Industrias, Galpón 10",c=(((k=document.getElementById("disp_ci_delivered_staff"))==null?void 0:k.value)||"Almacén Central Guacara").trim(),u=(((G=document.getElementById("disp_ci_received_staff"))==null?void 0:G.value)||"Operario de Taller").trim();const p=(N=document.getElementById("disp_ci_project_id"))==null?void 0:N.value;s=p?parseInt(p):null}else if(e){if(t=(((W=document.getElementById("disp_freeform_recipient"))==null?void 0:W.value)||"").trim(),a=(((K=document.getElementById("disp_transfer_reason"))==null?void 0:K.value)||"Despacho de Producción").trim(),r=(((Y=document.getElementById("disp_ff_destination_plant"))==null?void 0:Y.value)||"").trim(),d=(((Z=document.getElementById("disp_ff_destination_address"))==null?void 0:Z.value)||"").trim(),!t){alert("Por favor ingresa la empresa o destinatario del traslado.");return}if(!d){alert("Por favor ingresa la dirección de destino de la carga.");return}}else{if(n=((F=document.getElementById("disp_client_id"))==null?void 0:F.value)||null,s=((q=document.getElementById("disp_project_id"))==null?void 0:q.value)||null,r=(((V=document.getElementById("disp_destination_plant"))==null?void 0:V.value)||"").trim(),d=(((U=document.getElementById("disp_destination_address"))==null?void 0:U.value)||"").trim(),!d){alert("Por favor indica la dirección completa de destino.");return}const p=document.getElementById("disp_client_id");t=((X=(J=(H=p==null?void 0:p.selectedOptions[0])==null?void 0:H.text)==null?void 0:J.split("(")[0])==null?void 0:X.trim())||"Cliente DALOR"}const m=i==="control_interno"?"propio_dalor":((Q=document.getElementById("disp_transport_type"))==null?void 0:Q.value)||"propio_dalor";let f="",l="",_="",g="",w=0,j=0,E=null;if(i==="control_interno")f=(((ee=document.getElementById("disp_ci_movement_type"))==null?void 0:ee.value)||"Personal Interno DALOR").trim(),l="V-00000000",_="INTERNO",g="Control Interno DALOR";else if(m==="propio_dalor"){if(E=((te=document.getElementById("disp_select_asset"))==null?void 0:te.value)||null,E){const p=(window.allAssets||[]).find(b=>String(b.id)===String(E));if(p){const b=(p.status||"").toLowerCase().trim();if(p.is_active===!1||["en_mantenimiento","mantenimiento","en_reparacion","reparacion","inactivo","desincorporado","no_disponible"].includes(b)){alert(`⛔ El vehículo seleccionado [${p.asset_code||""}] '${p.name}' NO se encuentra disponible para despacho (Estatus actual: ${p.status}). Por favor selecciona una unidad operativa.`);return}}}f=(((ie=document.getElementById("disp_driver_name_propio"))==null?void 0:ie.value)||"").trim()||"Personal DALOR",l=(((oe=document.getElementById("disp_driver_id_propio"))==null?void 0:oe.value)||"").trim()||"V-00000000",_=(((ne=document.getElementById("disp_plate_propio"))==null?void 0:ne.value)||"").trim()||"S/P",g="Transporte Propio DALOR"}else m==="flete_tercerizado"?(g=(((ae=document.getElementById("disp_carrier_company"))==null?void 0:ae.value)||"Flete Tercerizado").trim(),f=(((re=document.getElementById("disp_driver_name_ext"))==null?void 0:re.value)||"").trim()||"Chofer Flete Externo",l=(((se=document.getElementById("disp_driver_id_ext"))==null?void 0:se.value)||"").trim()||"V-00000000",_=(((de=document.getElementById("disp_plate_ext"))==null?void 0:de.value)||"").trim()||"S/P",w=parseFloat(((le=document.getElementById("disp_freight_cost_usd"))==null?void 0:le.value)||0)||0,j=parseFloat(((ce=document.getElementById("disp_freight_price_charged"))==null?void 0:ce.value)||0)||0):(f=(((pe=document.getElementById("disp_driver_name_ret"))==null?void 0:pe.value)||"").trim()||"Receptor Autorizado",l=(((ue=document.getElementById("disp_driver_id_ret"))==null?void 0:ue.value)||"").trim()||"V-00000000",_=(((me=document.getElementById("disp_plate_ret"))==null?void 0:me.value)||"").trim()||"S/P",g="Retiro Directo por Cliente");const T=[];if(document.querySelectorAll("#dispatchItemsTableBody tr").forEach(p=>{var be,ye,he,ve,we;const b=(((be=p.querySelector(".disp-item-desc"))==null?void 0:be.value)||"").trim(),D=parseFloat(((ye=p.querySelector(".disp-item-qty"))==null?void 0:ye.value)||1)||1,L=((he=p.querySelector(".disp-item-unit"))==null?void 0:he.value)||"Pzas",Pe=((ve=p.querySelector(".disp-item-cond"))==null?void 0:ve.value)||"Reparado / Listo para Montaje",Ae=parseFloat(((we=p.querySelector(".disp-item-weight"))==null?void 0:we.value)||0)||0;b&&T.push({description:b,quantity:D,unit:L,condition_status:Pe,approx_weight_kg:Ae})}),T.length===0){alert("Debes agregar al menos un renglón con la descripción del material, equipo o pieza despachada.");return}const Le={guide_type:i,delivered_by_staff:c,received_by_staff:u,project_id:s?parseInt(s):null,client_id:n?parseInt(n):null,recipient_name:t,transfer_reason:a,is_freeform:i==="control_interno"?!1:e,destination_plant:r||null,destination_address:d,transport_type:m,asset_id:E?parseInt(E):null,carrier_company:g,driver_name:f,driver_id_doc:l,vehicle_plate:_,freight_cost_usd:w,freight_price_charged_usd:j,dispatcher_name:(((fe=document.getElementById("disp_dispatcher_name"))==null?void 0:fe.value)||"Despacho Taller Guacara").trim(),quality_inspector:(((ge=document.getElementById("disp_quality_inspector"))==null?void 0:ge.value)||"Control de Calidad DALOR").trim(),notes:(((_e=document.getElementById("disp_notes"))==null?void 0:_e.value)||"").trim(),items:T};try{const p=await h(`${y}/dispatch/`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(Le)});if(!p.ok){const L=await p.json().catch(()=>({}));throw new Error(L.detail||"Error al emitir guía de despacho.")}const b=await p.json(),D=i==="control_interno"?"Vale de Control Interno":"Guía de Despacho";typeof window.showToast=="function"?window.showToast(`${D} N° ${b.guide_number} emitida con éxito.`,"success"):alert(`${D} N° ${b.guide_number} emitida con éxito.`),S("list"),await I(),confirm(`¿Deseas abrir el documento oficial N° ${b.guide_number} para imprimir o guardar en PDF?`)&&Te(b.id)}catch(p){console.error("Error al emitir documento de despacho:",p),alert("Error: "+p.message)}}async function I(){const o=document.getElementById("dispatchTableBody"),i=document.getElementById("dispatch_count_badge");try{const e=await h(`${y}/dispatch/`);if(!e.ok)throw new Error("Error al consultar guías de despacho.");A=window.allDispatchGuides=await e.json(),qe(),$(),typeof window.loadProjectRequisitionsBadge=="function"&&window.loadProjectRequisitionsBadge()}catch(e){console.error("Error cargando guías de despacho:",e),o&&(o.innerHTML=`<tr><td colspan="10" style="text-align: center; color: #ef4444; padding: 20px;">Error al cargar guías: ${e.message}</td></tr>`),i&&(i.textContent="Error de conexión")}}function qe(){const o=A||[],i=o.length,e=o.filter(l=>!l.is_freeform&&l.guide_type!=="control_interno"&&!(l.guide_number&&l.guide_number.startsWith("GCI-"))).length,n=o.filter(l=>l.is_freeform&&l.guide_type!=="control_interno"&&!(l.guide_number&&l.guide_number.startsWith("GCI-"))).length,s=o.filter(l=>l.guide_type==="control_interno"||l.guide_number&&l.guide_number.startsWith("GCI-")).length,t=o.filter(l=>l.status==="en_transito").length,a=o.filter(l=>l.status==="entregada"||l.status==="entregado_conforme").length,r=document.getElementById("count_disp_all"),d=document.getElementById("count_disp_project"),c=document.getElementById("count_disp_freeform"),u=document.getElementById("count_disp_internal"),m=document.getElementById("count_disp_transit"),f=document.getElementById("count_disp_delivered");r&&(r.textContent=i),d&&(d.textContent=e),c&&(c.textContent=n),u&&(u.textContent=s),m&&(m.textContent=t),f&&(f.textContent=a)}function Ve(o){x=o,["all","project","freeform","internal","transit","delivered"].forEach(e=>{const n=document.getElementById(`btn_disp_filter_${e}`);n&&(n.className=e===o?"btn-primary":"btn-secondary")}),$()}function Ue(o){$(o)}let $e=[],C=1,Be=15;function He(o){C=o,B();const i=document.getElementById("dispatchTableBody");i&&i.scrollIntoView({behavior:"smooth",block:"nearest"})}function Je(o){Be=parseInt(o)||15,C=1,B()}function $(o=""){var s;let i=A||[];x==="project"?i=i.filter(t=>!t.is_freeform&&t.guide_type!=="control_interno"&&!(t.guide_number&&t.guide_number.startsWith("GCI-"))):x==="freeform"?i=i.filter(t=>t.is_freeform&&t.guide_type!=="control_interno"&&!(t.guide_number&&t.guide_number.startsWith("GCI-"))):x==="internal"?i=i.filter(t=>t.guide_type==="control_interno"||t.guide_number&&t.guide_number.startsWith("GCI-")):x==="transit"?i=i.filter(t=>t.status==="en_transito"):x==="delivered"&&(i=i.filter(t=>t.status==="entregada"||t.status==="entregado_conforme"));const e=(typeof o=="string"?o:((s=document.getElementById("dispatch_search_input"))==null?void 0:s.value)||"").trim().toLowerCase();e&&(i=i.filter(t=>t.guide_number&&t.guide_number.toLowerCase().includes(e)||t.client_name&&t.client_name.toLowerCase().includes(e)||t.recipient_name&&t.recipient_name.toLowerCase().includes(e)||t.project_code&&t.project_code.toLowerCase().includes(e)||t.project_name&&t.project_name.toLowerCase().includes(e)||t.transfer_reason&&t.transfer_reason.toLowerCase().includes(e)||t.driver_name&&t.driver_name.toLowerCase().includes(e)||t.vehicle_plate&&t.vehicle_plate.toLowerCase().includes(e)||t.delivered_by_staff&&t.delivered_by_staff.toLowerCase().includes(e)||t.received_by_staff&&t.received_by_staff.toLowerCase().includes(e)));const n=document.getElementById("dispatch_count_badge");n&&(n.textContent=`${i.length} guías mostradas`),$e=i,C=1,B()}function B(){const o=document.getElementById("dispatchTableBody");if(!o)return;const i=$e;if(i.length===0){o.innerHTML='<tr><td colspan="10" style="text-align: center; color: #94a3b8; padding: 28px;">No se encontraron guías de despacho registradas con el filtro actual.</td></tr>';const a=document.getElementById("dispatchPaginationContainer");a&&(a.innerHTML="");return}const e=typeof window.renderPaginationControls=="function"?window.renderPaginationControls:typeof renderPaginationControls=="function"?renderPaginationControls:()=>({startIndex:0,endIndex:i.length}),{startIndex:n,endIndex:s}=e({containerId:"dispatchPaginationContainer",totalItems:i.length,currentPage:C,pageSize:Be,onPageChange:"goToDispatchPage",onPageSizeChange:"changeDispatchPageSize",itemLabel:"guía(s) de despacho",pageSizeOptions:[10,15,25,50,100]}),t=i.slice(n,s);o.innerHTML=t.map(a=>{const r=a.guide_type==="control_interno"||a.guide_number&&a.guide_number.startsWith("GCI-"),d=!!a.is_freeform,c=a.status==="entregada"||a.status==="entregado_conforme",u=c?`<span style="background: #ecfdf5; color: #047857; font-weight: 800; padding: 3px 8px; border-radius: 12px; font-size: 10.5px; border: 1px solid #a7f3d0;"><i class="fa-solid fa-circle-check"></i> ${r?"Conforme Sede":"Entregada"}</span>`:'<span style="background: #fff7ed; color: #c2410c; font-weight: 800; padding: 3px 8px; border-radius: 12px; font-size: 10.5px; border: 1px solid #fed7aa;"><i class="fa-solid fa-truck-fast"></i> En Tránsito</span>';let m="";r?m='<span style="background: #eff6ff; color: #1e40af; font-weight: 800; padding: 2px 7px; border-radius: 6px; font-size: 10px; border: 1px solid #bfdbfe;"><i class="fa-solid fa-warehouse"></i> Interno GCI</span>':d?m='<span style="background: #fef3c7; color: #92400e; font-weight: 800; padding: 2px 7px; border-radius: 6px; font-size: 10px; border: 1px solid #fde68a;"><i class="fa-solid fa-feather-pointed"></i> Libre</span>':m='<span style="background: #e0f2fe; color: #0369a1; font-weight: 800; padding: 2px 7px; border-radius: 6px; font-size: 10px; border: 1px solid #bae6fd;"><i class="fa-solid fa-building"></i> Obra</span>';let f="",l="",_="";return r?(f=`<div><b>${a.destination_plant||"Taller Metalmecánico"}</b></div><div style="font-size: 10px; color: #64748b;">Sede Central Guacara</div>`,l=a.project_name?`${a.project_code||"PRJ"} - ${a.project_name}`:a.transfer_reason||"Uso en Taller",_=`<div><b>${a.delivered_by_staff||"Almacén"} &rarr; ${a.received_by_staff||"Taller"}</b></div><div style="font-size: 10px; color: #64748b;">Custodia Interna</div>`):(f=`<div>${d?a.recipient_name||"Destinatario Libre":a.client_name||"Cliente DALOR"}</div><div style="font-size: 10px; color: #64748b; font-weight: 400;">${a.destination_plant?a.destination_plant+" &bull; ":""}${a.destination_address||""}</div>`,l=d?a.transfer_reason||"Traslado Libre":a.project_code?`${a.project_code} - ${a.project_name}`:"Servicio Directo",_=`<div><b>${a.driver_name||"Personal DALOR"}</b></div><div style="font-size: 10px; color: #64748b;">${a.vehicle_plate||"S/P"} &bull; ${a.transport_type==="flete_tercerizado"?"Tercerizado":a.transport_type==="retiro_cliente"?"Retiro":"DALOR"}</div>`),`
            <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.15s ease;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'">
                <td style="padding: 10px; font-weight: 900; color: var(--dalor-navy);">
                    ${a.guide_number}
                </td>
                <td style="padding: 10px; color: #64748b; font-size: 11px;">
                    ${a.dispatch_date||"-"}
                </td>
                <td style="padding: 10px; text-align: center;">
                    ${m}
                </td>
                <td style="padding: 10px; font-weight: 700; color: #1e293b;">
                    ${f}
                </td>
                <td style="padding: 10px; color: #334155; font-size: 11.5px;">
                    ${l}
                </td>
                <td style="padding: 10px; font-size: 11.5px; color: #475569;">
                    ${_}
                </td>
                <td style="padding: 10px; text-align: center; font-weight: 700;">
                    <span style="background: #f1f5f9; color: #334155; padding: 2px 7px; border-radius: 10px; font-size: 11px;">
                        ${a.items_count||(a.items?a.items.length:0)} renglones
                    </span>
                </td>
                <td style="padding: 10px; text-align: right; font-weight: 800; color: #475569;">
                    $${(a.freight_cost_usd||0).toFixed(2)}
                </td>
                <td style="padding: 10px; text-align: center;">
                    ${u}
                </td>
                <td style="padding: 10px; text-align: center;">
                    <div style="display: inline-flex; gap: 4px;">
                        <button type="button" onclick="printOfficialDispatchGuide(${a.id})" class="btn-secondary" style="padding: 4px 8px; font-size: 11px;" title="Ver e Imprimir Guía Oficial">
                            <i class="fa-solid fa-print"></i>
                        </button>
                        ${c?"":`
                            <button type="button" onclick="openConfirmDeliveryModal(${a.id}, '${a.guide_number}')" class="btn-primary" style="padding: 4px 8px; font-size: 11px; background: #059669;" title="Confirmar Recepción / Entrega">
                                <i class="fa-solid fa-clipboard-check"></i>
                            </button>
                        `}
                        <button type="button" onclick="deleteDispatchGuide(${a.id}, '${a.guide_number}')" class="btn-secondary" style="padding: 4px 8px; font-size: 11px; color: #dc2626;" title="Eliminar Guía">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `}).join("")}function Xe(o,i){const e=document.getElementById("conf_disp_id"),n=document.getElementById("conf_disp_guide_text");if(e&&(e.value=o),n&&(n.innerHTML=`Registra los datos de recepción para la <b>Guía N° ${i}</b>:`),typeof window.openModal=="function")window.openModal("modalConfirmDelivery");else{const s=document.getElementById("modalConfirmDelivery");s&&s.classList.remove("hidden")}}async function We(o){var t,a,r,d;o&&o.preventDefault&&o.preventDefault();const i=(t=document.getElementById("conf_disp_id"))==null?void 0:t.value,e=(((a=document.getElementById("conf_received_by"))==null?void 0:a.value)||"").trim(),n=(((r=document.getElementById("conf_received_id_doc"))==null?void 0:r.value)||"").trim(),s=(((d=document.getElementById("conf_notes"))==null?void 0:d.value)||"").trim();if(!i||!e){alert("Completa el nombre de la persona que recibió en destino.");return}try{const c=await h(`${y}/dispatch/${i}/confirm-delivery`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({received_by:e,received_by_client_name:e,received_by_client_id_doc:n||"V-Receptor",notes:s})});if(!c.ok){const u=await c.json().catch(()=>({}));throw new Error(u.detail||"Error al confirmar recepción.")}if(typeof window.closeModal=="function")window.closeModal("modalConfirmDelivery");else{const u=document.getElementById("modalConfirmDelivery");u&&u.classList.add("hidden")}typeof window.showToast=="function"?window.showToast("Recepción de entrega registrada exitosamente.","success"):alert("Recepción de entrega registrada exitosamente."),await I()}catch(c){console.error("Error confirmando recepción:",c),alert("Error: "+c.message)}}async function Ke(o,i){if(confirm(`¿Estás seguro de anular/eliminar la Guía de Despacho N° ${i}? Esta acción es irreversible.`))try{const e=await h(`${y}/dispatch/${o}`,{method:"DELETE"});if(!e.ok){const n=await e.json().catch(()=>({}));throw new Error(n.detail||"Error al eliminar guía.")}typeof window.showToast=="function"?window.showToast(`Guía ${i} eliminada correctamente.`,"info"):alert(`Guía ${i} eliminada correctamente.`),await I()}catch(e){console.error("Error eliminando guía:",e),alert("Error: "+e.message)}}async function Te(o){try{const i=await h(`${y}/dispatch/${o}`);if(!i.ok)throw new Error("No se pudo cargar la información de la guía.");const e=await i.json(),n=e.guide_type==="control_interno"||e.guide_number&&e.guide_number.startsWith("GCI-"),s=!!e.is_freeform,t=s?e.recipient_name||"Destinatario Libre":e.client_name||"Cliente DALOR",a=s?e.transfer_reason||"Traslado Libre":`${e.project_code||"PRJ"} - ${e.project_name||"Servicio de Taller"}`;let r=e.items&&e.items.length>0?e.items.map((g,w)=>`
            <tr style="border-bottom: 1px solid #cbd5e1;">
                <td style="padding: 7px; text-align: center; font-weight: 700;">${w+1}</td>
                <td style="padding: 7px; font-weight: 600;">${g.description}</td>
                <td style="padding: 7px; text-align: right; font-weight: 800;">${g.quantity}</td>
                <td style="padding: 7px; text-align: center;">${g.unit||"Pzas"}</td>
                <td style="padding: 7px;">${g.condition_status||(n?"Operativo / En Custodia":"Listo para Montaje")}</td>
                <td style="padding: 7px; text-align: right;">${g.approx_weight_kg?g.approx_weight_kg.toFixed(2)+" Kg":"-"}</td>
            </tr>
        `).join(""):'<tr><td colspan="6" style="padding: 12px; text-align: center; color: #64748b;">Sin renglones especificados</td></tr>';const d=window.open("","_blank");if(!d){alert("Por favor habilita las ventanas emergentes (pop-ups) para imprimir el documento.");return}const c=n?`Vale de Control Interno ${e.guide_number} - DALOR`:`Guía de Despacho ${e.guide_number} - DALOR`,u=n?`<div style="font-size: 11px; font-weight: 900; color: #1e3a8a; text-transform: uppercase;">VALE DE CONTROL INTERNO (TALLER GUACARA / SEDE)</div>
               <div style="font-size: 18px; font-weight: 900; color: #2563eb; margin-top: 3px;">N° ${e.guide_number}</div>
               <div style="font-size: 10.5px; color: #475569; margin-top: 2px;">Fecha: <b>${e.dispatch_date||new Date().toLocaleString("es-VE")}</b></div>`:`<div style="font-size: 11px; font-weight: 900; color: #002B49; text-transform: uppercase;">GUÍA OFICIAL DE TRASLADO Y NOTA DE ENTREGA</div>
               <div style="font-size: 18px; font-weight: 900; color: #dc2626; margin-top: 3px;">N° ${e.guide_number}</div>
               <div style="font-size: 10.5px; color: #475569; margin-top: 2px;">Fecha: <b>${e.dispatch_date||new Date().toLocaleString("es-VE")}</b></div>`,m=n?`
            <div class="info-card" style="border-left: 4px solid #2563eb;">
                <h4>1. Control de Sede & Custodia Interna</h4>
                <div><b>Sede / Planta Origen:</b> Almacén Central DALOR - Sede Guacara</div>
                <div><b>Área / Taller Destino:</b> <b style="color: #1e40af;">${e.destination_plant||"Taller Metalmecánico / Producción"}</b></div>
                <div><b>Motivo del Movimiento:</b> ${e.transfer_reason||"Uso Operativo en Taller Central"}</div>
                <div><b>Proyecto Vinculado:</b> ${e.project_name?`${e.project_code||"PRJ"} - ${e.project_name}`:"Operación Regular DALOR"}</div>
            </div>

            <div class="info-card" style="border-left: 4px solid #16a34a;">
                <h4>2. Responsables de Custodia & Traspaso</h4>
                <div><b>Entregado por (Almacén):</b> <b>${e.delivered_by_staff||"Almacén Central DALOR"}</b></div>
                <div><b>Recibido por (Taller):</b> <b>${e.received_by_staff||"Operario de Taller"}</b></div>
                <div><b>Medio de Traslado:</b> ${e.driver_name||"Traslado Interno en Planta"}</div>
                <div><b>Estatus:</b> <span style="color: #166534; font-weight: 700;">Custodia Asignada / Conforme en Sede</span></div>
            </div>
        `:`
            <div class="info-card">
                <h4>1. Datos del Destinatario & Obra / Motivo</h4>
                <div><b>Destinatario / Razón Social:</b> ${t}</div>
                <div><b>Motivo / Proyecto:</b> ${a}</div>
                <div><b>Planta / Almacén Destino:</b> ${e.destination_plant||"Recepción en Sitio"}</div>
                <div><b>Dirección de Entrega:</b> ${e.destination_address||"Sin dirección especificada"}</div>
            </div>

            <div class="info-card">
                <h4>2. Control de Transporte & Vehículo</h4>
                <div><b>Modalidad:</b> ${e.transport_type==="propio_dalor"?"Flota Propia DALOR":e.transport_type==="flete_tercerizado"?"Flete Tercerizado":"Retiro en Taller por Cliente"}</div>
                <div><b>Empresa / Fletero:</b> ${e.carrier_company||"DALOR C.A."}</div>
                <div><b>Conductor:</b> ${e.driver_name||"Personal DALOR"} (C.I: ${e.driver_id_doc||"V-00000000"})</div>
                <div><b>Placa / Batea:</b> <b style="text-transform: uppercase;">${e.vehicle_plate||"S/P"}</b> ${e.vehicle_model?"("+e.vehicle_model+")":""}</div>
            </div>
        `,f=n?`
            <div class="signatures-grid">
                <div class="sig-box">
                    <span>Entregado por (Almacén Central):</span>
                    <div class="sig-line">${e.delivered_by_staff||"Almacén Central Guacara"}</div>
                </div>
                <div class="sig-box">
                    <span>Recibido por (Taller / Operario):</span>
                    <div class="sig-line">${e.received_by_staff||"Operario de Taller"}</div>
                </div>
                <div class="sig-box">
                    <span>Supervisor de Taller / Calidad:</span>
                    <div class="sig-line">${e.quality_inspector||"DALOR C.A."}</div>
                </div>
                <div class="sig-box">
                    <span>Gerencia de Operaciones:</span>
                    <div class="sig-line">Firma y Sello Aprobatorio</div>
                </div>
            </div>
        `:`
            <div class="signatures-grid">
                <div class="sig-box">
                    <span>Despachado por DALOR:</span>
                    <div class="sig-line">${e.dispatcher_name||"Despacho Taller"}</div>
                </div>
                <div class="sig-box">
                    <span>Transportista / Conductor:</span>
                    <div class="sig-line">${e.driver_name||"Conductor Asignado"}</div>
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
        `,l=n?"Maquinaria, Herramientas, Equipos e Insumos en Custodia Interna":"Descripción de la Carga / Pieza Fabricada o Reparada",_=n?"DOCUMENTO EXCLUSIVO DE CONTROL INTERNO DALOR &bull; NO CONSTITUYE GUÍA DE TRANSPORTE EN VÍA PÚBLICA &bull; SEDE GUACARA &bull; RIF J-31601195-0":"Documento emitido por el Sistema Integrado de Gestión Operativa (DALOR SIGO-P) &bull; RIF J-31601195-0";d.document.write(`
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <title>${c}</title>
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
                    .header-box { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid ${n?"#1e3a8a":"#002B49"}; padding-bottom: 14px; margin-bottom: 14px; page-break-inside: avoid; }
                    .info-grid { display: grid; grid-template-columns: 1.2fr 1fr; gap: 14px; margin-bottom: 16px; page-break-inside: avoid; }
                    .info-card { border: 1.5px solid #cbd5e1; border-radius: 6px; padding: 10px 12px; background: #f8fafc; }
                    .info-card h4 { margin: 0 0 6px 0; font-size: 11px; text-transform: uppercase; color: ${n?"#1e3a8a":"#002B49"}; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px; page-break-inside: auto; }
                    thead { display: table-header-group; }
                    tfoot { display: table-footer-group; }
                    tr { page-break-inside: avoid; page-break-after: auto; }
                    th { background: ${n?"#1e3a8a":"#002B49"} !important; color: white !important; padding: 7px 8px; text-align: left; font-size: 10.5px; text-transform: uppercase; }
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
                    <button onclick="window.print()" style="background: ${n?"#1e3a8a":"#002B49"}; color: white; border: none; padding: 8px 16px; font-weight: bold; border-radius: 6px; cursor: pointer;">
                        🖨️ Imprimir Documento / Guardar PDF
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
                    <div style="text-align: right; border: 2px solid ${n?"#1e3a8a":"#002B49"}; padding: 8px 14px; border-radius: 6px; background: #f8fafc; min-width: 220px;">
                        ${u}
                    </div>
                </div>

                <div class="info-grid">
                    ${m}
                </div>

                <table>
                    <thead>
                        <tr>
                            <th style="width: 35px; text-align: center;">#</th>
                            <th>${l}</th>
                            <th style="width: 70px; text-align: right;">Cantidad</th>
                            <th style="width: 60px; text-align: center;">Unidad</th>
                            <th style="width: 170px;">Condición Física / Estado</th>
                            <th style="width: 80px; text-align: right;">Peso Aprox</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${r}
                    </tbody>
                </table>

                <div style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 12px; margin-bottom: 20px; background: #fafafa; font-size: 11px;">
                    <b>Observaciones & Precintos:</b> ${e.notes||(n?"Equipos verificados e inventariados para custodia interna.":"Carga verificada y apta para despacho.")} &bull; <b>Inspector:</b> ${e.quality_inspector||"Control de Calidad"}
                </div>

                ${!n&&(e.status==="entregada"||e.status==="entregado_conforme")?`
                    <div style="border: 1.5px solid #10b981; border-radius: 6px; padding: 8px 12px; margin-bottom: 20px; background: #ecfdf5; font-size: 11px; color: #065f46;">
                        <i class="fa-solid fa-circle-check"></i> <b>Constancia de Recepción Conforme:</b> Recibido por <b>${e.received_by_client_name}</b> (C.I: ${e.received_by_client_id_doc}) en fecha <b>${e.reception_date}</b>.
                    </div>
                `:""}

                ${f}

                <div style="text-align: center; margin-top: 25px; font-size: 10px; color: #64748b;">
                    ${_}
                </div>
            </body>
            </html>
        `),d.document.close()}catch(i){console.error("Error imprimiendo documento de despacho:",i),alert("Error: "+i.message)}}typeof window<"u"&&(window.switchDispatchSubtab=S,window.initDispatchView=Se,window.initDispatchForm=Ee,window.setDispatchMode=xe,window.setDispatchTransportMode=Ie,window.setDispatchFilter=Ve,window.filterDispatchList=Ue,window.renderDispatchTable=$,window.onDispatchClientChanged=De,window.onDispatchProjectChanged=Me,window.loadProjectResourcesIntoDispatch=ke,window.onDispatchAssetChanged=Ge,window.onDispatchDriverPersonnelChanged=je,window.onDispatchCiDeliveredChanged=Re,window.onDispatchCiReceivedChanged=Oe,window.loadDalorAssetsIntoDispatch=ze,window.addDispatchItemRow=v,window.removeDispatchItemRow=Ne,window.submitCreateDispatchGuide=Fe,window.loadDispatchGuidesList=I,window.openConfirmDeliveryModal=Xe,window.submitConfirmDelivery=We,window.deleteDispatchGuide=Ke,window.printOfficialDispatchGuide=Te,window.goToDispatchPage=He,window.changeDispatchPageSize=Je,window.renderDispatchPaginated=B);
