var q=window.API_BASE||window.location.origin+"/api/v1";window.allClients=window.allClients||[];window.allServices=window.allServices||[];var D=window.allProjects=window.allProjects||[];window.allCategories=window.allCategories||[];var L=window.allAssets=window.allAssets||[],j=window.allPersonnel=window.allPersonnel||[],E=window.allMaterials=window.allMaterials||[];window.selectedPersonnelIds=window.selectedPersonnelIds||[];window.selectedVehicleIds=window.selectedVehicleIds||[];window.selectedToolIds=window.selectedToolIds||[];window.selectedMaterialIds=window.selectedMaterialIds||[];window.EXCHANGE_RATE=window.EXCHANGE_RATE||850;window.BCV_DATA=window.BCV_DATA||{rate:850,source:"BCV Oficial"};window.authToken=window.authToken||localStorage.getItem("dalor_token")||null;function C(e,t={}){const o=sessionStorage.getItem("dalor_token")||localStorage.getItem("dalor_token")||window.authToken||"",a={...t.headers||{}};return o&&(a.Authorization="Bearer "+o),t.body&&!(t.body instanceof FormData)&&!a["Content-Type"]&&(a["Content-Type"]="application/json"),t.body instanceof FormData&&delete a["Content-Type"],window.fetch(e,{...t,headers:a})}function Y(){const e=window.currentUser||JSON.parse(localStorage.getItem("dalor_user")||"null")||{},t=(e.role_name||e.role||e.username||"").toLowerCase();return t.includes("director")||t.includes("admin")}async function T(){const e=document.getElementById("materialsTableBody");if(!e)return;const t=Y(),o=t?9:7;e.innerHTML=`<tr><td colspan="${o}" style="text-align: center; padding: 20px; color: #94a3b8;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando inventario de materiales...</td></tr>`;try{const n=await(await C(`${q}/materials/`)).json();E=n.materials||(Array.isArray(n)?n:[]);const s=document.getElementById("matTotalItemsCount"),r=document.getElementById("matTotalValuationCard"),i=document.getElementById("matTotalValuationUsd");if(s&&(s.innerText=n.total_items!==void 0?n.total_items:E.length),r&&(r.style.display=t?"inline-block":"none"),i&&t){const d=n.total_inventory_usd!==void 0?n.total_inventory_usd:E.reduce((p,c)=>p+(c.stock_quantity*c.unit_cost_usd||0),0);i.innerText=`$${d.toLocaleString("en-US",{minimumFractionDigits:2})} USD`}document.querySelectorAll(".director-cost-col").forEach(d=>{d.style.display=t?"":"none"}),H(E),F();try{typeof populateSelectDropdowns=="function"&&populateSelectDropdowns()}catch(d){console.warn("Dropdown populator warning:",d)}}catch(a){console.error("Error loading materials:",a),e.innerHTML=`<tr><td colspan="${o}" style="text-align: center; color: #e11d48; padding: 20px;">Error al cargar inventario de materiales: ${a.message}</td></tr>`}}let Z=[],z=1,ee=15;function le(e){z=e,O();const t=document.getElementById("materialsTableBody");t&&t.scrollIntoView({behavior:"smooth",block:"nearest"})}function ce(e){ee=parseInt(e)||15,z=1,O()}function H(e){Z=Array.isArray(e)?e:E||[],z=1,O()}function O(){const e=document.getElementById("materialsTableBody");if(!e)return;const t=Y(),o=t?9:7,a=Z||[];if(a.length===0){e.innerHTML=`<tr><td colspan="${o}" style="text-align: center; padding: 20px; color: #94a3b8;">No se encontraron materiales registrados.</td></tr>`;const d=document.getElementById("materialsPaginationContainer");d&&(d.innerHTML="");return}const{startIndex:n,endIndex:s,currentPage:r}=(typeof window.renderPaginationControls=="function"?window.renderPaginationControls:renderPaginationControls)({containerId:"materialsPaginationContainer",totalItems:a.length,currentPage:z,pageSize:ee,onPageChange:"goToMaterialsPage",onPageSizeChange:"changeMaterialsPageSize",itemLabel:"material(es) en catálogo",pageSizeOptions:[15,30,60,120]});z=r;const i=a.slice(n,s);e.innerHTML=i.map(d=>{const p=d.is_low_stock||d.stock_quantity<=d.min_stock_alert,c=Number(d.unit_cost_usd||0),g=Number(d.total_cost_usd||d.stock_quantity*c||0);return`
        <tr>
            <td style="font-weight: 800; color: var(--dalor-blue); font-family: monospace;">${d.code}</td>
            <td style="font-weight: 700; color: var(--dalor-navy);">${d.name}</td>
            <td><span style="font-size: 10px; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-weight: 700; color: #475569;">${d.category}</span></td>
            <td style="text-align: center; font-weight: 700;">${d.unit_measure}</td>
            <td style="text-align: center;">
                <span style="font-weight: 800; font-size: 13px; color: ${p?"#e11d48":"#059669"};">
                    ${(["und","unid","unidad","unidades","pza","pieza","piezas","rollo","rollos"].includes((d.unit_measure||"").toLowerCase())?Math.round(d.stock_quantity):Number((d.stock_quantity||0).toFixed(2))).toLocaleString()} ${d.unit_measure}
                </span>
                ${p?'<span style="display: block; font-size: 9px; color: #dc2626; font-weight: 800;">⚠️ STOCK CRÍTICO</span>':""}
            </td>
            <td style="text-align: center; color: #64748b; font-size: 11px;">${d.min_stock_alert} ${d.unit_measure}</td>
            ${t?`
                <td style="text-align: right; font-weight: 700; color: #0284c7;">$${c.toLocaleString("en-US",{minimumFractionDigits:2})}</td>
                <td style="text-align: right; font-weight: 900; color: var(--dalor-navy);">$${g.toLocaleString("en-US",{minimumFractionDigits:2})}</td>
            `:""}
            <td style="text-align: center; white-space: nowrap;">
                <button onclick="openMaterialEntryModal(${d.id})" class="btn-primary" style="padding: 3px 8px; font-size: 11px; background: #059669;" title="Registrar Entrada / Compra">
                    <i class="fa-solid fa-plus"></i> Entrada
                </button>
                <button onclick="openMaterialConsumeModal(${d.id})" class="btn-primary" style="padding: 3px 8px; font-size: 11px; background: #0284c7; margin-left: 4px;" title="Despachar a Obra o Taller">
                    <i class="fa-solid fa-arrow-right-from-bracket"></i> Despachar
                </button>
            </td>
        </tr>`}).join("")}function pe(){var a,n;const e=(((a=document.getElementById("filterMaterialSearch"))==null?void 0:a.value)||"").toLowerCase(),t=((n=document.getElementById("filterMaterialCategory"))==null?void 0:n.value)||"",o=E.filter(s=>{const r=!e||s.name.toLowerCase().includes(e)||s.code.toLowerCase().includes(e),i=!t||s.category===t;return r&&i});H(o)}function ue(){const e=document.getElementById("nmat_category"),t=document.getElementById("nmat_category_custom");!e||!t||(e.value==="__NEW__"?(t.classList.remove("hidden"),t.required=!0,t.focus()):(t.classList.add("hidden"),t.required=!1,t.value=""))}function te(e=!1){var a;e&&(window.openedMaterialModalFromCxp=!0);const t=document.getElementById("modalNewMaterial");t&&(t.style.zIndex="2200"),(a=document.getElementById("newMaterialForm"))==null||a.reset();const o=document.getElementById("nmat_category_custom");o&&(o.classList.add("hidden"),o.required=!1,o.value=""),openModal("modalNewMaterial")}function me(){te(!0)}async function ge(e){var a,n;e.preventDefault();let t=document.getElementById("nmat_category").value;if(t==="__NEW__"&&(t=(((a=document.getElementById("nmat_category_custom"))==null?void 0:a.value)||"").trim(),!t)){alert("⚠️ Por favor ingresa el nombre de la nueva categoría."),(n=document.getElementById("nmat_category_custom"))==null||n.focus();return}const o={code:document.getElementById("nmat_code").value.trim(),name:document.getElementById("nmat_name").value.trim(),category:t,unit_measure:document.getElementById("nmat_unit").value,stock_quantity:parseFloat(document.getElementById("nmat_stock").value)||0,min_stock_alert:parseFloat(document.getElementById("nmat_alert").value)||5,unit_cost_usd:parseFloat(document.getElementById("nmat_cost").value)||0,location:document.getElementById("nmat_location").value.trim()||"Almacén Central Dalor"};try{const s=await C(`${q}/materials/`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(o)});if(s.ok){const r=await s.json().catch(()=>({}));closeModal("modalNewMaterial");try{await loadInitialMasterData()}catch{}try{T()}catch{}window.openedMaterialModalFromCxp?(window.openedMaterialModalFromCxp=!1,typeof window.onMaterialCreatedFromCxp=="function"&&window.onMaterialCreatedFromCxp(r)):alert("✅ Material registrado con éxito en el catálogo.")}else{const r=await s.json().catch(()=>({}));alert("Error: "+(r.detail||JSON.stringify(r)))}}catch(s){alert("Error de conexión al crear material: "+s.message)}}function U(e=null,t=1,o=0){const a=document.getElementById("me_materials_tbody");if(!a)return;const n=window.allMaterials&&window.allMaterials.length>0?window.allMaterials:E||[],s="me_row_"+Date.now()+"_"+Math.floor(Math.random()*1e3),r=document.createElement("tr");r.id=s,r.style.borderBottom="1px solid #e2e8f0";const i=n.map(d=>{const p=e&&d.id===e?"selected":"",c=d.unit_cost_usd||0;return`<option value="${d.id}" data-cost="${c}" data-unit="${d.unit_measure||"UND"}" data-stock="${d.stock_quantity||0}" ${p}>[${d.code}] ${d.name} (Stock: ${d.stock_quantity||0} ${d.unit_measure||"UND"})</option>`}).join("");if(r.innerHTML=`
        <td style="padding: 6px 8px;">
            <input type="text" placeholder="🔍 Escribe para filtrar material..." oninput="filterEntryRowDropdown(this)" style="font-size: 11px; padding: 4px 6px; width: 100%; margin-bottom: 4px; border: 1px solid #cbd5e1; border-radius: 4px; box-sizing: border-box; background: #f8fafc;">
            <select class="me-row-material form-select" onchange="onEntryMaterialRowChanged(this)" style="font-size: 11.5px; padding: 4px 6px; width: 100%;">
                <option value="">-- Seleccionar Material --</option>
                ${i}
            </select>
        </td>
        <td style="padding: 6px 8px; width: 110px;">
            <input type="number" step="0.01" min="0.01" value="${t}" class="me-row-qty form-input" style="font-size: 11.5px; padding: 4px 6px; text-align: right;" oninput="calcMaterialEntryTotal()">
        </td>
        <td style="padding: 6px 8px; width: 130px;">
            <input type="number" step="0.01" min="0" value="${o}" class="me-row-cost form-input" style="font-size: 11.5px; padding: 4px 6px; text-align: right;" oninput="calcMaterialEntryTotal()">
        </td>
        <td style="padding: 6px 8px; width: 120px; text-align: right; font-weight: 800; color: #059669; font-size: 12px;">
            <span class="me-row-subtotal">$0.00</span>
        </td>
        <td style="padding: 6px 8px; width: 36px; text-align: center;">
            <button type="button" onclick="removeMaterialEntryRow(this)" style="background: none; border: none; color: #dc2626; font-size: 18px; cursor: pointer; padding: 2px 6px; font-weight: bold; line-height: 1;" title="Eliminar este renglón">&times;</button>
        </td>
    `,a.appendChild(r),e){const d=r.querySelector(".me-row-material");d&&(d.value=e,oe(d))}else N()}function fe(e){const t=e.closest("tr");t&&t.remove();const o=document.getElementById("me_materials_tbody");o&&o.children.length===0?U():N()}function oe(e){const t=e.closest("tr");if(!t)return;const o=e.options[e.selectedIndex];if(o&&o.value){const a=t.querySelector(".me-row-cost");if(a&&(!parseFloat(a.value)||parseFloat(a.value)===0)){const n=parseFloat(o.getAttribute("data-cost"))||0;n>0&&(a.value=n.toFixed(2))}}N()}function ye(e){const t=(e.value||"").toLowerCase().trim(),o=e.closest("tr");if(!o)return;const a=o.querySelector(".me-row-material");if(!a)return;const n=window.allMaterials&&window.allMaterials.length>0?window.allMaterials:E||[],s=t?n.filter(i=>(i.name||"").toLowerCase().includes(t)||(i.code||"").toLowerCase().includes(t)):n,r=a.value;a.innerHTML=`<option value="">-- Seleccionar Material (${s.length}) --</option>`+s.map(i=>{const d=String(i.id)===String(r)?"selected":"";return`<option value="${i.id}" data-cost="${i.unit_cost_usd||0}" data-unit="${i.unit_measure||"UND"}" data-stock="${i.stock_quantity||0}" ${d}>[${i.code}] ${i.name} (Stock: ${i.stock_quantity||0} ${i.unit_measure||"UND"})</option>`}).join("")}function xe(e=null){const t=document.getElementById("materialEntryForm");t&&t.reset();const o=document.getElementById("me_materials_tbody");o&&(o.innerHTML=""),U(e,1,0),ae(),openModal("modalMaterialEntry")}function N(){const e=document.querySelectorAll("#me_materials_tbody tr");let t=0;e.forEach(r=>{var g,m;const i=parseFloat((g=r.querySelector(".me-row-qty"))==null?void 0:g.value)||0,d=parseFloat((m=r.querySelector(".me-row-cost"))==null?void 0:m.value)||0,p=i*d;t+=p;const c=r.querySelector(".me-row-subtotal");c&&(c.innerText=`$${p.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`)});const o=document.getElementById("me_total_usd_preview");o&&(o.innerText=`$${t.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})} USD`);const a=window.bcvRate||window.currentBcvRate||1,n=t*(a>1?a:1),s=document.getElementById("me_total_bs_preview");s&&(s.innerText=a>1?`≈ Bs ${n.toLocaleString("es-VE",{minimumFractionDigits:2,maximumFractionDigits:2})} (Tasa BCV: ${a})`:"")}function ae(){var o;const e=((o=document.getElementById("me_register_cxp"))==null?void 0:o.checked)||!1,t=document.getElementById("me_cash_payment_box");t&&(e?t.classList.add("hidden"):t.classList.remove("hidden"))}async function he(e){var c,g,m,u,y,b;e&&(typeof e.preventDefault=="function"&&e.preventDefault(),typeof e.stopPropagation=="function"&&e.stopPropagation());const t=document.querySelectorAll("#me_materials_tbody tr"),o=[];if(t.forEach(h=>{var $,v,x;const w=parseInt(($=h.querySelector(".me-row-material"))==null?void 0:$.value),_=parseFloat((v=h.querySelector(".me-row-qty"))==null?void 0:v.value)||0,f=parseFloat((x=h.querySelector(".me-row-cost"))==null?void 0:x.value)||0;w&&!isNaN(w)&&_>0&&o.push({material_id:w,quantity:_,unit_cost_usd:f})}),o.length===0)return alert("⚠️ Por favor añade al menos un material válido con cantidad mayor a 0."),!1;const a=((c=document.getElementById("me_register_cxp"))==null?void 0:c.checked)||!1,n=((g=document.getElementById("me_payment_channel"))==null?void 0:g.value)||"caja_chica_usd",s=(((m=document.getElementById("me_payment_ref"))==null?void 0:m.value)||"").trim(),r=(((u=document.getElementById("me_supplier"))==null?void 0:u.value)||"").trim()||"Proveedor General",i=(((y=document.getElementById("me_doc"))==null?void 0:y.value)||"").trim()||"Factura Compra",d=(((b=document.getElementById("me_notes"))==null?void 0:b.value)||"").trim(),p={items:o,supplier_name:r,reference_doc:i,notes:d,performed_by:"Custodio de Almacén",register_in_cxp:a,due_days:15,payment_channel:n,payment_ref:s};try{const h=window.authToken||localStorage.getItem("dalor_token"),w={"Content-Type":"application/json",...h?{Authorization:`Bearer ${h}`}:{}},_=await C(`${q}/materials/entry`,{method:"POST",headers:w,body:JSON.stringify(p)});if(_.ok){const f=await _.json();alert(`✅ ${f.message||"Entrada registrada exitosamente"}`),closeModal("modalMaterialEntry");try{await loadInitialMasterData()}catch{}try{T()}catch{}if(a&&typeof window.loadPayablesList=="function")try{window.loadPayablesList()}catch{}}else{const f=await _.json().catch(()=>({detail:"Error en el servidor al registrar entrada."}));alert("Error: "+(f.detail||JSON.stringify(f)))}}catch(h){console.error("[MATERIAL ENTRY ERROR]",h),alert("Error al procesar entrada de material: "+((h==null?void 0:h.message)||h))}return!1}function be(e=null){document.getElementById("materialConsumeForm").reset(),populateSelectDropdowns();const t=document.getElementById("mc_material_search");t&&(t.value="");const o=document.getElementById("mc_material_id");e?(o.value=e,o.disabled=!0,o.style.opacity="0.7",o.style.cursor="not-allowed"):(o.disabled=!1,o.style.opacity="",o.style.cursor=""),ne(),J(),Q(),openModal("modalMaterialConsume")}function we(e){const t=(e||"").toLowerCase().trim(),o=document.getElementById("mc_material_id");if(!o)return;const n=(window.allMaterials&&window.allMaterials.length>0?window.allMaterials:E||[]).filter(i=>(parseFloat(i.stock_quantity)||0)>0),s=t?n.filter(i=>(i.name||"").toLowerCase().includes(t)||(i.code||"").toLowerCase().includes(t)):n,r=o.value;o.innerHTML=`<option value="">-- Seleccionar Material (${s.length} con stock) --</option>`+s.map(i=>{const d=String(i.id)===String(r)?"selected":"";return`<option value="${i.id}" data-cost="${i.unit_cost_usd||0}" data-unit="${i.unit_measure||"UND"}" data-stock="${i.stock_quantity}" ${d}>[${i.code}] ${i.name} (Stock: ${i.stock_quantity} ${i.unit_measure||"UND"})</option>`}).join(""),J()}function ne(){var o;const e=(o=document.getElementById("mc_project_id"))==null?void 0:o.value,t=document.getElementById("mc_guide_banner");t&&(t.style.display=e?"block":"none")}function J(){const e=document.getElementById("mc_material_id");if(!e||!e.options[e.selectedIndex])return;const t=e.options[e.selectedIndex],o=t.getAttribute("data-stock")||"0",a=t.getAttribute("data-unit")||"UND",n=document.getElementById("mc_stock_available_label");n&&(n.innerText=`${parseFloat(o).toLocaleString()} ${a}`),Q()}function Q(){var s;const e=document.getElementById("mc_material_id"),t=parseFloat((s=document.getElementById("mc_quantity"))==null?void 0:s.value)||0;let o=0;e&&e.options[e.selectedIndex]&&(o=parseFloat(e.options[e.selectedIndex].getAttribute("data-cost"))||0);const a=t*o,n=document.getElementById("mc_cost_preview");n&&(n.value=`$${a.toLocaleString("en-US",{minimumFractionDigits:2})} USD`)}async function _e(e){var c,g;e.preventDefault();const t=parseInt(document.getElementById("mc_material_id").value),o=parseFloat(document.getElementById("mc_quantity").value)||0,a=document.getElementById("mc_project_id").value,n=a?parseInt(a):null;if(!t||o<=0){alert("Selecciona un material y cantidad válida mayor a 0.");return}const r=(window.allMaterials&&window.allMaterials.length>0?window.allMaterials:E||[]).find(m=>m.id===t);if(r){const m=parseFloat(r.stock_quantity)||0;if(m<=0){alert(`⛔ Stock agotado: El material [${r.code}] ${r.name} no posee unidades disponibles en pañol (Stock: 0).`);return}if(o>m){alert(`⛔ Stock insuficiente: Has solicitado ${o} ${r.unit_measure||"UND"} de [${r.code}] ${r.name}, pero solo hay ${m} ${r.unit_measure||"UND"} disponibles en pañol.`);return}}const i=(((c=document.getElementById("mc_driver_name"))==null?void 0:c.value)||"").trim(),d=(((g=document.getElementById("mc_vehicle_plate"))==null?void 0:g.value)||"").trim(),p={material_id:t,quantity:o,project_id:n,destination:n?"Obra en Ejecución":"Taller Central",reference_doc:document.getElementById("mc_doc").value.trim()||"Requisición Interna",notes:document.getElementById("mc_notes").value.trim(),performed_by:document.getElementById("mc_performed_by").value.trim()||"Custodio de Almacén",driver_name:i,vehicle_plate:d};try{const m=window.authToken||localStorage.getItem("dalor_token")||null,u={"Content-Type":"application/json"};m&&(u.Authorization=`Bearer ${m}`);const y=await C(`${q}/materials/consume`,{method:"POST",headers:u,body:JSON.stringify(p)});if(y.ok){const b=await y.json();closeModal("modalMaterialConsume"),await loadInitialMasterData(),T(),b.guide_number?confirm(`✅ ${b.message||"Despacho procesado exitosamente."}

Se ha emitido automáticamente la Guía de Despacho Oficial N°: ${b.guide_number}

¿Deseas abrirla en el módulo de Despachos ahora mismo?`)&&typeof window.navigateToDispatchGuide=="function"&&window.navigateToDispatchGuide(b.guide_number):alert(`✅ ${b.message||"Despacho registrado exitosamente."}`)}else{const b=await y.json();alert("Error: "+(b.detail||JSON.stringify(b)))}}catch(m){alert("Error al procesar despacho de material: "+m.message)}}function ve(){document.getElementById("transferGuideForm").reset(),populateSelectDropdowns(),W(),openModal("modalTransferGuide")}function $e(){const e=document.getElementById("tg_project_id");if(!e||!e.options[e.selectedIndex])return;const t=e.options[e.selectedIndex],o=parseInt(e.value),a=D.find(d=>d.id===o),n=a&&a.location||t.getAttribute("data-location")||"Planta Centro - Morón",s=document.getElementById("tg_destination");s&&(s.value=n);const r=document.getElementById("tg_driver_name");if(r){let d=(j||[]).find(p=>p.current_project_id===o&&(p.role_title||"").toLowerCase().includes("chofer"));d||(d=(j||[]).find(p=>(p.role_title||"").toLowerCase().includes("chofer"))),!d&&j&&j.length>0&&(d=j[0]),d&&(r.value=d.full_name)}const i=document.getElementById("tg_vehicle_id");if(i){const d=(L||[]).find(p=>(p.asset_type==="vehiculo"||p.asset_type==="camioneta")&&p.current_project_id===o);if(d)i.value=d.id;else{const p=(L||[]).find(c=>c.asset_type==="vehiculo"||c.asset_type==="camioneta");p&&(i.value=p.id)}}W(o)}function W(e=null){const t=document.getElementById("tg_tools_checklist_container");if(!t)return;const o=L.filter(a=>a.asset_type!=="vehiculo"&&a.asset_type!=="camioneta");if(o.length===0){t.innerHTML='<span style="font-size:11px; color:#94a3b8;">No hay herramientas registradas.</span>';return}t.innerHTML=o.map(a=>{const n=e&&(a.current_project_id===e||a.current_location==="en_obra");return`

        <label style="display: flex; align-items: center; gap: 8px; padding: 4px 6px; border-radius: 4px; background: ${n?"#f0fdf4":"#f8fafc"}; font-size: 11px; cursor: pointer;" class="tg-tool-item" data-text="${a.asset_code} ${a.name} ${a.brand||""}">

            <input type="checkbox" value="${a.id}" data-name="${a.name}" data-code="${a.asset_code}" data-brand="${a.brand||""}" data-serial="${a.serial_number||""}" class="tg-tool-checkbox" ${n?"checked":""} style="width: 15px; height: 15px; accent-color: #0284c7;">

            <span style="font-weight: 800; color: var(--dalor-blue); font-family: monospace;">[${a.asset_code}]</span>

            <span style="font-weight: 600; color: var(--dalor-navy);">${a.name}</span>

            <span style="color: #64748b; font-size: 10px; margin-left: auto;">${a.brand||""}</span>

        </label>

        `}).join("")}function Ee(){var t;const e=(((t=document.getElementById("tg_tools_search"))==null?void 0:t.value)||"").toLowerCase();document.querySelectorAll(".tg-tool-item").forEach(o=>{const a=o.getAttribute("data-text").toLowerCase();o.style.display=a.includes(e)?"flex":"none"})}async function Ie(e){var m;e.preventDefault();const t=parseInt(document.getElementById("tg_project_id").value),o=document.getElementById("tg_destination").value.trim(),a=document.getElementById("tg_vehicle_id").value,n=document.getElementById("tg_driver_name").value.trim();if(!t){alert("Por favor selecciona un proyecto aprobado de destino.");return}const s=[];if(document.querySelectorAll(".tg-tool-checkbox:checked").forEach(u=>{s.push({id:parseInt(u.value),code:u.getAttribute("data-code"),name:u.getAttribute("data-name")})}),s.length===0){alert("Por favor selecciona al menos una herramienta o equipo a trasladar.");return}const r=D.find(u=>u.id===t)||{code:"DAL-2026-001",name:"Proyecto Obra"},i=L.find(u=>u.id==a)||{name:"Camioneta Toyota Hilux"},d=`GT-DALOR-${Date.now().toString().slice(-6)}`;for(const u of s)try{await C(`${q}/resources/assign`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({resource_type:"asset",resource_id:u.id,project_id:t,destination_location:o,custodian_name:n,action_type:"assign"})})}catch(y){console.error("Error asignando herramienta:",y)}closeModal("modalTransferGuide"),await loadInitialMasterData(),document.getElementById("subtab-res-tools")&&!document.getElementById("subtab-res-tools").classList.contains("hidden")&&loadToolsList();const p=document.getElementById("modalPrintPreviewContent"),c=document.getElementById("previewModalTitle");c&&(c.innerText="Guía Oficial de Traslado y Despacho de Equipos - Dalor C.A.");const g=new Date().toLocaleDateString("es-VE")+" "+new Date().toLocaleTimeString("es-VE",{hour:"2-digit",minute:"2-digit"});p&&(p.innerHTML=`

        <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; padding: 25px; background: #fff;">

            <!-- Header Membretado Oficial DALOR -->

            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #002B49; padding-bottom: 12px; margin-bottom: 16px;">

                <div>

                    <h2 style="margin: 0; color: #002B49; font-size: 22px; font-weight: 900; letter-spacing: 1px;">DALOR, C.A.</h2>

                    <p style="margin: 3px 0 0 0; font-size: 11px; color: #475569; font-weight: 600;">SOLUCIONES DE INGENIERÍA, MANTENIMIENTO Y MONTAJE INDUSTRIAL</p>

                    <p style="margin: 2px 0 0 0; font-size: 10px; color: #64748b;">RIF: J-31601195-0 &bull; Guacara, Edo. Carabobo - Venezuela</p>

                </div>

                <div style="text-align: right;">

                    <div style="background: #0284c7; color: #fff; padding: 6px 14px; border-radius: 6px; font-weight: 900; font-size: 13px; letter-spacing: 0.5px;">

                        GUÍA DE TRASLADO DE EQUIPOS

                    </div>

                    <div style="font-size: 13px; font-weight: 900; color: #002B49; margin-top: 5px;">

                        N°: ${d}

                    </div>

                    <div style="font-size: 11px; color: #64748b;">

                        Fecha: ${g}

                    </div>

                </div>

            </div>



            <!-- Ficha de Traslado y Destino -->

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 11px;">

                <tr style="background: #f8fafc;">

                    <td style="padding: 6px 10px; border: 1px solid #cbd5e1; font-weight: 700; width: 20%; color: #475569;">Proyecto Destino:</td>

                    <td style="padding: 6px 10px; border: 1px solid #cbd5e1; width: 30%; font-weight: 800; color: #0284c7;">[${r.code}] ${r.name}</td>

                    <td style="padding: 6px 10px; border: 1px solid #cbd5e1; font-weight: 700; width: 20%; color: #475569;">Ubicación / Frente:</td>

                    <td style="padding: 6px 10px; border: 1px solid #cbd5e1; width: 30%; font-weight: 700;">${o}</td>

                </tr>

                <tr>

                    <td style="padding: 6px 10px; border: 1px solid #cbd5e1; font-weight: 700; color: #475569;">Vehículo de Carga:</td>

                    <td style="padding: 6px 10px; border: 1px solid #cbd5e1;">${i.name} (Placa: ${i.license_plate||"N/A"})</td>

                    <td style="padding: 6px 10px; border: 1px solid #cbd5e1; font-weight: 700; color: #475569;">Conductor / Chofer:</td>

                    <td style="padding: 6px 10px; border: 1px solid #cbd5e1; font-weight: 800; color: #002B49;">${n}</td>

                </tr>

            </table>



            <!-- Tabla de Herramientas y Equipos Despachados -->

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 11px;">

                <thead>

                    <tr style="background: #002B49; color: #ffffff;">

                        <th style="padding: 8px 10px; border: 1px solid #002B49; width: 40px; text-align: center;">Item</th>

                        <th style="padding: 8px 10px; border: 1px solid #002B49; width: 90px;">Código</th>

                        <th style="padding: 8px 10px; border: 1px solid #002B49;">Descripción de la Herramienta / Equipo</th>

                        <th style="padding: 8px 10px; border: 1px solid #002B49; width: 130px;">Marca / Modelo</th>

                        <th style="padding: 8px 10px; border: 1px solid #002B49; width: 120px;">Serial</th>

                        <th style="padding: 8px 10px; border: 1px solid #002B49; width: 90px; text-align: center;">Estado</th>

                    </tr>

                </thead>

                <tbody>

                    ${s.map((u,y)=>`

                        <tr style="background: ${y%2===0?"#ffffff":"#f8fafc"};">

                            <td style="padding: 6px 10px; border: 1px solid #cbd5e1; text-align: center; font-weight: 800;">${y+1}</td>

                            <td style="padding: 6px 10px; border: 1px solid #cbd5e1; font-family: monospace; font-weight: 800; color: #0284c7;">${u.code}</td>

                            <td style="padding: 6px 10px; border: 1px solid #cbd5e1; font-weight: 700;">${u.name}</td>

                            <td style="padding: 6px 10px; border: 1px solid #cbd5e1; color: #64748b;">${u.brand||"-"}</td>

                            <td style="padding: 6px 10px; border: 1px solid #cbd5e1; font-family: monospace;">${u.serial||"S/N"}</td>

                            <td style="padding: 6px 10px; border: 1px solid #cbd5e1; text-align: center; color: #059669; font-weight: 800;">Operativo</td>

                        </tr>

                    `).join("")}

                </tbody>

            </table>



            <!-- Observaciones -->

            <div style="background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 14px; margin-bottom: 24px; font-size: 11px;">

                <strong>Observaciones / Condición de Custodia:</strong> ${((m=document.getElementById("tg_notes"))==null?void 0:m.value)||"Equipos verificados y entregados en condiciones 100% operativas para faena de obra."}

            </div>



            <!-- Bloque Formal de 3 Firmas de Responsabilidad -->

            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; text-align: center; margin-top: 36px; font-size: 11px;">

                <div style="border-top: 1px solid #475569; padding-top: 6px;">

                    <strong style="color: #002B49;">Despachado por:</strong><br>

                    <span style="color: #64748b; font-size: 10px;">Almacén Central / Custodia Dalor</span>

                </div>

                <div style="border-top: 1px solid #475569; padding-top: 6px;">

                    <strong style="color: #002B49;">Transportado por:</strong><br>

                    <span style="color: #64748b; font-size: 10px;">${n} (Chofer)</span>

                </div>

                <div style="border-top: 1px solid #475569; padding-top: 6px;">

                    <strong style="color: #002B49;">Recibido Conforme en Obra:</strong><br>

                    <span style="color: #64748b; font-size: 10px;">Supervisor / Residente de Obra</span>

                </div>

            </div>

        </div>

        `,openModal("modalPrintPreview"))}async function Me(){const e=document.getElementById("materialDeliveryForm");e&&e.reset();let t=window.allProjects&&window.allProjects.length>0?window.allProjects:D||[];if(t.length===0)try{const n=await C(`${q}/projects/`);n.ok&&(t=await n.json(),window.allProjects=D=t)}catch(n){console.error("Error cargando proyectos para despacho:",n)}const o=(t||[]).filter(n=>{const s=(n.status||"").toLowerCase().trim();return!["culminado","completado","cerrado","cancelado","finalizado","inactivo"].includes(s)}),a=document.getElementById("md_project_id");a&&(o.length===0?a.innerHTML='<option value="">⚠️ No hay obras abiertas disponibles para despacho</option>':a.innerHTML='<option value="">-- Seleccione Proyecto Aprobado Destino --</option>'+o.map(n=>`<option value="${n.id}" data-location="${n.location||""}">[${n.code}] ${n.name}</option>`).join("")),ie(),openModal("modalMaterialDelivery")}function ie(){const e=document.getElementById("md_project_id");if(!e||!e.options[e.selectedIndex])return;const t=parseInt(e.value),o=D.find(i=>i.id===t),a=o&&o.location||"Frente de Obra / Planta",n=document.getElementById("md_destination");n&&(n.value=a);const s=document.getElementById("md_dispatcher_name");s&&!s.value&&(s.value="Jefe de Materiales / Almacén Central");const r=document.getElementById("md_receiver_name");r&&!r.value&&(r.value=o&&o.client_name?`Supervisor / Residente (${o.client_name})`:"Supervisor Residente de Obra"),re()}function re(){const e=document.getElementById("md_materials_tbody");if(e)if(e.innerHTML="",E&&E.length>0)for(let t=0;t<Math.min(2,E.length);t++)R(E[t].name,E[t].unit_measure||"Pza",1);else R("Cable THW 12 AWG","Metro (m)",50),R("Breaker 2x30A","Pza",2)}function R(e="",t="Pza",o=1){const a=document.getElementById("md_materials_tbody");if(!a)return;const n=document.createElement("tr");n.style.borderBottom="1px solid #f1f5f9",n.innerHTML=`

        <td style="padding: 4px 6px;">

            <input type="text" class="form-input md-item-name" value="${e}" placeholder="Descripción del material..." style="padding: 4px 6px; font-size: 11px;" required>

        </td>

        <td style="padding: 4px 6px;">

            <input type="text" class="form-input md-item-unit" value="${t}" placeholder="Pza, m, etc." style="padding: 4px 6px; font-size: 11px; text-align: center;">

        </td>

        <td style="padding: 4px 6px;">

            <input type="number" step="0.01" class="form-input md-item-qty" value="${o}" style="padding: 4px 6px; font-size: 11px; text-align: right; font-weight: 800;" required>

        </td>

        <td style="padding: 4px 6px; text-align: center;">

            <button type="button" onclick="this.closest('tr').remove()" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 13px;">&times;</button>

        </td>

    `,a.appendChild(n)}function qe(e){e.preventDefault();const t=parseInt(document.getElementById("md_project_id").value),o=document.getElementById("md_destination").value.trim(),a=document.getElementById("md_dispatcher_name").value.trim(),n=document.getElementById("md_receiver_name").value.trim(),s=document.getElementById("md_notes").value.trim(),r=[];if(document.querySelectorAll("#md_materials_tbody tr").forEach(m=>{var h,w,_;const u=(h=m.querySelector(".md-item-name"))==null?void 0:h.value.trim(),y=((w=m.querySelector(".md-item-unit"))==null?void 0:w.value.trim())||"Pza",b=parseFloat((_=m.querySelector(".md-item-qty"))==null?void 0:_.value)||0;u&&b>0&&r.push({name:u,unit:y,qty:b})}),r.length===0){alert("Por favor ingresa al menos un material con cantidad válida.");return}const i=D.find(m=>m.id===t)||{code:"DAL-2026-001",name:"Proyecto en Obra"},d=`NE-MAT-${Date.now().toString().slice(-6)}`,p=new Date().toLocaleDateString("es-VE")+" "+new Date().toLocaleTimeString("es-VE",{hour:"2-digit",minute:"2-digit"});closeModal("modalMaterialDelivery");const c=document.getElementById("modalPrintPreviewContent"),g=document.getElementById("previewModalTitle");g&&(g.innerText="Nota Oficial de Entrega de Materiales - Dalor C.A."),c&&(c.innerHTML=`

        <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; padding: 25px; background: #fff;">

            <!-- Header Membretado Oficial DALOR -->

            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #002B49; padding-bottom: 12px; margin-bottom: 16px;">

                <div style="display: flex; align-items: center; gap: 12px;">
                    <img src="logo_dalor.jpg" alt="DALOR" style="height: 48px; display: block; border-radius: 4px;" onerror="this.style.display='none'">
                    <div>
                        <h2 style="margin: 0; color: #002B49; font-size: 20px; font-weight: 900; letter-spacing: 0.5px;">METALMECÁNICA DALOR, C.A.</h2>
                        <p style="margin: 2px 0 0 0; font-size: 11px; color: #0284c7; font-weight: 700;">RIF: <b>J-31601195-0</b> &bull; Mantenimiento Predictivo, Proyectos Industriales & Metalmecánica</p>
                        <p style="margin: 2px 0 0 0; font-size: 10px; color: #64748b;">Av. Cámara de las Industrias, Galpón 10, Z.I. El Tigre, Guacara, Edo. Carabobo</p>
                    </div>
                </div>

                <div style="text-align: right;">

                    <div style="background: #059669; color: #fff; padding: 6px 14px; border-radius: 6px; font-weight: 900; font-size: 13px; letter-spacing: 0.5px;">

                        NOTA DE ENTREGA DE MATERIALES

                    </div>

                    <div style="font-size: 13px; font-weight: 900; color: #002B49; margin-top: 5px;">

                        N°: ${d}

                    </div>

                    <div style="font-size: 11px; color: #64748b;">

                        Fecha: ${p}

                    </div>

                </div>

            </div>



            <!-- Ficha de Destinatario y Entrega -->

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 11px;">

                <tr style="background: #f8fafc;">

                    <td style="padding: 6px 10px; border: 1px solid #cbd5e1; font-weight: 700; width: 20%; color: #475569;">Proyecto / Obra:</td>

                    <td style="padding: 6px 10px; border: 1px solid #cbd5e1; width: 30%; font-weight: 800; color: #059669;">[${i.code}] ${i.name}</td>

                    <td style="padding: 6px 10px; border: 1px solid #cbd5e1; font-weight: 700; width: 20%; color: #475569;">Lugar de Entrega:</td>

                    <td style="padding: 6px 10px; border: 1px solid #cbd5e1; width: 30%; font-weight: 700;">${o}</td>

                </tr>

                <tr>

                    <td style="padding: 6px 10px; border: 1px solid #cbd5e1; font-weight: 700; color: #475569;">Despachado Por:</td>

                    <td style="padding: 6px 10px; border: 1px solid #cbd5e1; font-weight: 700;">${a}</td>

                    <td style="padding: 6px 10px; border: 1px solid #cbd5e1; font-weight: 700; color: #475569;">Receptor en Obra:</td>

                    <td style="padding: 6px 10px; border: 1px solid #cbd5e1; font-weight: 800; color: #002B49;">${n}</td>

                </tr>

            </table>



            <!-- Tabla de Materiales Despachados -->

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 11px;">

                <thead>

                    <tr style="background: #002B49; color: #ffffff;">

                        <th style="padding: 8px 10px; border: 1px solid #002B49; width: 40px; text-align: center;">Item</th>

                        <th style="padding: 8px 10px; border: 1px solid #002B49;">Descripción de Material / Insumo</th>

                        <th style="padding: 8px 10px; border: 1px solid #002B49; width: 100px; text-align: center;">Unidad</th>

                        <th style="padding: 8px 10px; border: 1px solid #002B49; width: 110px; text-align: right;">Cantidad Entregada</th>

                    </tr>

                </thead>

                <tbody>

                    ${r.map((m,u)=>`

                        <tr style="background: ${u%2===0?"#ffffff":"#f8fafc"};">

                            <td style="padding: 6px 10px; border: 1px solid #cbd5e1; text-align: center; font-weight: 800;">${u+1}</td>

                            <td style="padding: 6px 10px; border: 1px solid #cbd5e1; font-weight: 700;">${m.name}</td>

                            <td style="padding: 6px 10px; border: 1px solid #cbd5e1; text-align: center; color: #64748b;">${m.unit}</td>

                            <td style="padding: 6px 10px; border: 1px solid #cbd5e1; text-align: right; font-weight: 900; color: #059669; font-size: 12px;">${m.qty}</td>

                        </tr>

                    `).join("")}

                </tbody>

            </table>



            <!-- Observaciones -->

            <div style="background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 14px; margin-bottom: 24px; font-size: 11px;">

                <strong>Observaciones de Despacho:</strong> ${s||"Material verificado en almacén, embalado y entregado conforme para instalación inmediata en obra."}

            </div>



            <!-- Bloque de Firmas -->

            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; text-align: center; margin-top: 36px; font-size: 11px;">

                <div style="border-top: 1px solid #475569; padding-top: 6px;">

                    <strong style="color: #002B49;">Despachado por:</strong><br>

                    <span style="color: #64748b; font-size: 10px;">${a}</span>

                </div>

                <div style="border-top: 1px solid #475569; padding-top: 6px;">

                    <strong style="color: #002B49;">Transportado por:</strong><br>

                    <span style="color: #64748b; font-size: 10px;">Chofer / Transportista</span>

                </div>

                <div style="border-top: 1px solid #475569; padding-top: 6px;">

                    <strong style="color: #002B49;">Recibido Conforme en Obra:</strong><br>

                    <span style="color: #64748b; font-size: 10px;">${n}</span>

                </div>

            </div>

        </div>

        `,openModal("modalPrintPreview"))}var V=window.allProjectRequisitions=[];async function F(){try{const e=await C(`${q}/materials/project-requisitions?status=pendiente`);if(!e.ok)return;const t=await e.json(),o=new Set;let a=!1;(t||[]).forEach(r=>{(r.quantity_pending||0)>0&&(r.project_id&&o.add(r.project_id),(r.quantity_dispatched||0)>0&&(a=!0))});const n=o.size;["badgePendingRequisitions","badgePendingRequisitionsBanner","badgePendingRequisitionsDispatch","badgePendingRequisitionsNav","badgeRecursosDropdown"].forEach(r=>{const i=document.getElementById(r);i&&(i.innerText=n,i.style.display=n>0?"inline-block":"none",a?i.title=`${n} obra(s) con requerimientos (posee pendientes parciales)`:i.title=`${n} obra(s) con requerimientos pendientes`)})}catch(e){console.warn("Could not load project requisitions badge:",e)}}async function Ce(e=null){typeof openModal=="function"&&openModal("modalProjectRequisitionsInbox"),await G(e)}async function G(e=null){const t=document.getElementById("reqInboxContainer");if(t){t.innerHTML='<div style="text-align: center; padding: 40px; color: #94a3b8;"><i class="fa-solid fa-spinner fa-spin" style="font-size: 24px;"></i><p style="margin-top: 8px; font-size: 13px;">Cargando pedidos de insumos desde las Obras...</p></div>';try{const o=await C(`${q}/materials/project-requisitions`);if(!o.ok)throw new Error("Error al consultar requisiciones de proyectos.");const a=await o.json();V=window.allProjectRequisitions=Array.isArray(a)?a:[];const n=document.getElementById("reqInboxProjectFilter");if(n){const s=e!==null?String(e):n.value,r=[],i=new Set;V.forEach(p=>{p.project_id&&!i.has(p.project_id)&&(i.add(p.project_id),r.push({id:p.project_id,code:p.project_code||`PRJ-${p.project_id}`,name:p.project_name||"Sin Título"}))}),r.sort((p,c)=>(c.code||"").localeCompare(p.code||""));let d='<option value="">-- Todas las Obras / Proyectos --</option>';r.forEach(p=>{d+=`<option value="${p.id}" ${s==String(p.id)?"selected":""}>[${p.code}] ${p.name}</option>`}),n.innerHTML=d}de()}catch(o){console.error("Error loading project requisitions inbox:",o),t.innerHTML=`<div style="text-align: center; padding: 30px; color: #ef4444;"><i class="fa-solid fa-triangle-exclamation" style="font-size: 24px;"></i><p style="margin-top: 8px;">Error al cargar las requisiciones: ${o.message}</p></div>`}}}function de(){var n,s,r;const e=(((n=document.getElementById("reqInboxSearch"))==null?void 0:n.value)||"").toLowerCase().trim(),t=((s=document.getElementById("reqInboxProjectFilter"))==null?void 0:s.value)||"",o=((r=document.getElementById("reqInboxStatusFilter"))==null?void 0:r.value)||"pending";let a=V||[];o==="pending"&&(a=a.filter(i=>(i.quantity_pending||0)>0&&i.status!=="despachado")),t&&(a=a.filter(i=>String(i.project_id)===String(t))),e&&(a=a.filter(i=>(i.material_name||"").toLowerCase().includes(e)||(i.material_code||"").toLowerCase().includes(e)||(i.project_code||"").toLowerCase().includes(e)||(i.project_name||"").toLowerCase().includes(e))),X(a)}function Se(e){const t=document.getElementById(`req_vehicle_sel_${e}`),o=document.getElementById(`req_plate_${e}`),a=document.getElementById(`req_vehicle_model_${e}`);if(!t)return;const n=t.options[t.selectedIndex];n&&(o&&(o.value=n.getAttribute("data-plate")||"DALOR-01"),a&&(a.value=n.getAttribute("data-model")||""))}function ke(e){const t=document.getElementById(`req_driver_sel_${e}`),o=document.getElementById(`req_driver_${e}`),a=document.getElementById(`req_driver_ci_${e}`);if(!t)return;const n=t.options[t.selectedIndex];n&&(o&&(o.value=n.getAttribute("data-name")||""),a&&(a.value=n.getAttribute("data-ci")||""))}var M=window.currentReqPage=1,S=window.reqPageSize=3,K=window.currentFilteredReqs=[];function X(e,t=!0){const o=document.getElementById("reqInboxContainer");if(!o)return;if(t&&(M=1),K=e||[],!e||e.length===0){o.innerHTML=`
            <div style="text-align: center; padding: 50px 20px; background: #f8fafc; border-radius: 12px; border: 2px dashed #cbd5e1;">
                <i class="fa-solid fa-circle-check" style="font-size: 40px; color: #10b981; margin-bottom: 12px;"></i>
                <h4 style="font-size: 16px; font-weight: 800; color: #1e293b;">¡No hay requerimientos pendientes de preparación!</h4>
                <p style="font-size: 12px; color: #64748b; max-width: 480px; margin: 6px auto 0;">
                    Todas las solicitudes de insumos formuladas en Obras han sido despachadas o no coinciden con los filtros seleccionados.
                </p>
            </div>
        `;return}const a={};e.forEach(c=>{const g=c.project_id||0;a[g]||(a[g]={project_id:g,project_code:c.project_code||"S/P",project_name:c.project_name||"Sin Obra Asignada",items:[]}),a[g].items.push(c)});const n=Object.values(a),s=n.length,r=Math.max(1,Math.ceil(s/S));M>r&&(M=r);const i=(M-1)*S,d=n.slice(i,i+S);let p="";d.forEach(c=>{const g=c.items.filter(l=>(l.quantity_pending||0)>0).length,m=c.items[0]||{},u=m.project_vehicles||[],y=m.project_personnel||[],b=m.all_fleet||[],h=m.all_personnel||[],w=u.length>0?u[0].plate||"S/P":"DALOR-01",_=u.length>0?u[0].name:"Flota DALOR";let f="";u.length>0&&(f+='<optgroup label="🚗 Asignado a esta Obra (Recomendado)">',u.forEach(l=>{f+=`<option value="${l.id}" data-plate="${l.plate}" data-model="${l.name}" selected>[${l.code}] ${l.name} (${l.plate})</option>`}),f+="</optgroup>"),b.length>0&&(f+='<optgroup label="🚚 Otros Vehículos Flota DALOR">',b.filter(l=>!u.some(I=>I.id===l.id)).forEach(l=>{f+=`<option value="${l.id}" data-plate="${l.plate}" data-model="${l.name}">[${l.code}] ${l.name} (${l.plate})</option>`}),f+="</optgroup>"),f+='<optgroup label="🏢 Flete Tercerizado">',f+='<option value="externo" data-plate="S/P" data-model="Flete Externo">Flete Externo / Retiro Cliente</option>',f+="</optgroup>";const $=y.length>0?y[0].name:"Transporte DALOR / Conductor Asignado",v=y.length>0?y[0].ci:"V-DALOR";let x="";y.length>0&&(x+='<optgroup label="👷 Personal de esta Obra (Recomendado)">',y.forEach(l=>{x+=`<option value="${l.id}" data-name="${l.name}" data-ci="${l.ci}" selected>${l.name} (C.I: ${l.ci} - ${l.role})</option>`}),x+="</optgroup>"),h.length>0&&(x+='<optgroup label="🚛 Choferes & Personal DALOR">',h.filter(l=>!y.some(I=>I.id===l.id)).forEach(l=>{x+=`<option value="${l.id}" data-name="${l.name}" data-ci="${l.ci}">${l.name} (C.I: ${l.ci})</option>`}),x+="</optgroup>"),x+='<optgroup label="✍️ Personalizado">',x+='<option value="externo" data-name="" data-ci="">Otro Conductor (Ingreso manual)</option>',x+="</optgroup>",p+=`
            <div class="card" style="border: 1px solid #cbd5e1; border-radius: 10px; padding: 14px 18px; background: white; box-shadow: 0 1px 3px rgba(0,0,0,0.05); margin-bottom: 16px;">
                <!-- Header de Obra -->
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
                    <div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span style="background: #1e3a8a; color: white; font-weight: 800; font-size: 11px; padding: 3px 8px; border-radius: 6px; letter-spacing: 0.5px;">
                                <i class="fa-solid fa-building"></i> ${c.project_code}
                            </span>
                            <h4 style="font-size: 15px; font-weight: 800; color: #0f172a; margin: 0;">${c.project_name}</h4>
                        </div>
                    </div>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <span style="font-size: 11px; font-weight: 700; color: #475569; background: #f1f5f9; padding: 4px 10px; border-radius: 6px;">
                            ${c.items.length} insumos en lista (${g} pendientes)
                        </span>
                    </div>
                </div>

                <!-- Datos de Despacho & Logística para esta Obra -->
                <div style="background: #f0f9ff; border: 1.5px solid #bae6fd; border-radius: 8px; padding: 12px 14px; margin-bottom: 12px; display: grid; grid-template-columns: 1.2fr 1.2fr 1.6fr; gap: 12px; align-items: start;">
                    <div>
                        <label style="font-size: 11px; font-weight: 800; color: #0369a1; display: flex; align-items: center; justify-content: space-between; margin-bottom: 3px;">
                            <span><i class="fa-solid fa-truck-pickup"></i> Vehículo Asignado a la Obra</span>
                            <span style="font-size: 9.5px; color: #0284c7; font-weight: 700;">(Control Transporte)</span>
                        </label>
                        <select id="req_vehicle_sel_${c.project_id}" onchange="onReqVehicleChanged(${c.project_id})" class="form-select" style="font-size: 11px; padding: 5px 8px; background: white; margin-bottom: 4px;">
                            ${f}
                        </select>
                        <div style="display: flex; gap: 6px;">
                            <input type="text" id="req_plate_${c.project_id}" value="${w}" placeholder="Placa" class="form-input" style="font-size: 11px; padding: 4px 6px; font-weight: 700; width: 45%;" title="Placa del vehículo">
                            <input type="text" id="req_vehicle_model_${c.project_id}" value="${_}" placeholder="Modelo / Marca" class="form-input" style="font-size: 11px; padding: 4px 6px; width: 55%;" title="Modelo del vehículo">
                        </div>
                    </div>
                    <div>
                        <label style="font-size: 11px; font-weight: 800; color: #0369a1; display: flex; align-items: center; justify-content: space-between; margin-bottom: 3px;">
                            <span><i class="fa-solid fa-id-card"></i> Chofer / Conductor</span>
                            <span style="font-size: 9.5px; color: #0284c7; font-weight: 700;">(Datos Conductor)</span>
                        </label>
                        <select id="req_driver_sel_${c.project_id}" onchange="onReqDriverChanged(${c.project_id})" class="form-select" style="font-size: 11px; padding: 5px 8px; background: white; margin-bottom: 4px;">
                            ${x}
                        </select>
                        <div style="display: flex; gap: 6px;">
                            <input type="text" id="req_driver_${c.project_id}" value="${$}" placeholder="Nombre Conductor" class="form-input" style="font-size: 11px; padding: 4px 6px; font-weight: 700; width: 60%;" title="Nombre del chofer">
                            <input type="text" id="req_driver_ci_${c.project_id}" value="${v}" placeholder="C.I. / Cédula" class="form-input" style="font-size: 11px; padding: 4px 6px; font-weight: 700; width: 40%;" title="Cédula de identidad">
                        </div>
                    </div>
                    <div>
                        <label style="font-size: 11px; font-weight: 800; color: #0369a1; display: block; margin-bottom: 3px;">
                            <i class="fa-solid fa-note-sticky"></i> Observaciones de Carga & Precinto
                        </label>
                        <textarea id="req_notes_${c.project_id}" rows="2" placeholder="Ej: Material y herramientas verificadas en pañol para traslado de obra." class="form-input" style="font-size: 11px; padding: 5px 8px; background: white; resize: none;"></textarea>
                    </div>
                </div>

                <!-- Tabla de Insumos Requeridos -->
                <div style="overflow-x: auto; border: 1px solid #e2e8f0; border-radius: 8px;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 11.5px; text-align: left;">
                        <thead>
                            <tr style="background: #f8fafc; color: #475569; font-weight: 700; border-bottom: 1px solid #e2e8f0;">
                                <th style="padding: 8px 10px; width: 36px; text-align: center;">
                                    <input type="checkbox" onchange="toggleSelectAllProjectReqs(${c.project_id}, this.checked)" title="Seleccionar todos con stock">
                                </th>
                                <th style="padding: 8px 10px;">Código</th>
                                <th style="padding: 8px 10px;">Descripción del Insumo</th>
                                <th style="padding: 8px 10px; text-align: center;">Solicitado</th>
                                <th style="padding: 8px 10px; text-align: center;">Despachado</th>
                                <th style="padding: 8px 10px; text-align: center;">Saldo Pendiente</th>
                                <th style="padding: 8px 10px; text-align: center;">Stock en Pañol</th>
                                <th style="padding: 8px 10px; text-align: center; width: 140px;">A Despachar</th>
                                <th style="padding: 8px 10px; text-align: center; width: 90px;">Acción</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${c.items.map(l=>{const I=(l.quantity_pending||0)<=0||l.status==="despachado",k=l.stock_available||0,P=k<=0,A=I||P,B=A?0:Math.min(l.quantity_pending,k),se=P?'<span style="background: #fee2e2; color: #b91c1c; padding: 2px 7px; border-radius: 4px; font-weight: 800; font-size: 10.5px;"><i class="fa-solid fa-ban"></i> 0.00 (SIN STOCK)</span>':l.has_enough_stock?`<span style="background: #dcfce7; color: #15803d; padding: 2px 7px; border-radius: 4px; font-weight: 700; font-size: 10.5px;"><i class="fa-solid fa-circle-check"></i> ${k.toFixed(2)} ${l.unit_measure}</span>`:`<span style="background: #fef3c7; color: #b45309; padding: 2px 7px; border-radius: 4px; font-weight: 700; font-size: 10.5px;"><i class="fa-solid fa-triangle-exclamation"></i> ${k.toFixed(2)} ${l.unit_measure} (Parcial)</span>`;return`
                                    <tr style="border-bottom: 1px solid #f1f5f9; ${I?"background: #f8fafc; opacity: 0.65;":""} ${P&&!I?"background: #fff1f2;":""}">
                                        <td style="padding: 8px 10px; text-align: center;">
                                            <input type="checkbox" class="req-check-${c.project_id}" data-req-id="${l.id}" data-project-id="${c.project_id}" data-stock="${k}" data-pending="${l.quantity_pending}" ${A?"":"checked"} ${A?"disabled":""}>
                                        </td>
                                        <td style="padding: 8px 10px; font-family: monospace; font-weight: 700; color: #334155;">
                                            ${l.material_code}
                                        </td>
                                        <td style="padding: 8px 10px;">
                                            <div style="font-weight: 600; color: #0f172a; display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                                                ${l.resource_type==="herramienta"?'<span class="badge-tag" style="background:#e0e7ff; color:#3730a3; font-size:9.5px;"><i class="fa-solid fa-wrench"></i> Herramienta</span>':l.resource_type==="maquinaria"?'<span class="badge-tag" style="background:#ffedd5; color:#9a3412; font-size:9.5px;"><i class="fa-solid fa-tractor"></i> Maquinaria</span>':l.resource_type==="vehiculo"?'<span class="badge-tag" style="background:#fef3c7; color:#92400e; font-size:9.5px;"><i class="fa-solid fa-truck-pickup"></i> Vehículo</span>':'<span class="badge-tag" style="background:#f0fdf4; color:#166534; font-size:9.5px;"><i class="fa-solid fa-boxes-stacked"></i> Material</span>'}
                                                <span>${l.material_name}</span>
                                            </div>
                                            ${l.notes?`<span style="font-size: 10px; color: #64748b;">Nota: ${l.notes}</span>`:""}
                                        </td>
                                        <td style="padding: 8px 10px; text-align: center; font-weight: 600;">
                                            ${(l.quantity_required||0).toFixed(2)} ${l.unit_measure}
                                        </td>
                                        <td style="padding: 8px 10px; text-align: center; color: #059669; font-weight: 600;">
                                            ${(l.quantity_dispatched||0).toFixed(2)} ${l.unit_measure}
                                        </td>
                                        <td style="padding: 8px 10px; text-align: center; font-weight: 800; color: ${I?"#10b981":"#e11d48"};">
                                            ${I?"0.00 (Listo)":`${(l.quantity_pending||0).toFixed(2)} ${l.unit_measure}`}
                                        </td>
                                        <td style="padding: 8px 10px; text-align: center;">
                                            ${se}
                                        </td>
                                        <td style="padding: 8px 10px; text-align: center;">
                                            <input type="number" step="0.01" min="0" max="${Math.min(l.quantity_pending,k)}" id="req_qty_${l.id}" value="${B}" oninput="onReqQtyChanged(${l.id}, ${l.quantity_pending}, ${k})" class="form-input" style="font-size: 11.5px; padding: 4px 6px; text-align: center; width: 100px; font-weight: 700; ${P?"background-color: #f1f5f9; color: #94a3b8; cursor: not-allowed;":""}" ${A?"disabled":""}>
                                            <div id="req_warn_${l.id}" style="${B<l.quantity_pending&&B>0?"":"display: none;"}">
                                                ${B<l.quantity_pending&&B>0?`<span style="color: #b45309; background: #fef3c7; border: 1px solid #fde68a; padding: 2px 6px; border-radius: 4px; font-size: 9.5px; font-weight: 700; display: inline-block; margin-top: 3px;">⚠️ Parcial: Quedan ${(l.quantity_pending-B).toFixed(2)} por stock</span>`:""}
                                            </div>
                                        </td>
                                        <td style="padding: 8px 10px; text-align: center;">
                                            ${I?'<span class="badge-tag" style="background:#e2e8f0; color:#475569; font-size:10px;">Completado</span>':P?'<span style="color: #ef4444; font-size: 10px; font-weight: 700;"><i class="fa-solid fa-ban"></i> Sin Stock</span>':`
                                                <button type="button" onclick="quickDispatchSingleRequisition(${l.id}, ${c.project_id})" class="btn-secondary" style="font-size: 10px; padding: 3px 8px; border-radius: 4px; background: #e0f2fe; color: #0369a1; border-color: #bae6fd; font-weight: 700;" title="Despachar solo este ítem ahora">
                                                    ⚡ Rápido
                                                </button>
                                            `}
                                        </td>
                                    </tr>
                                `}).join("")}
                        </tbody>
                    </table>
                </div>

                <!-- Botón de Despacho de la Obra -->
                <div style="display: flex; justify-content: flex-end; align-items: center; margin-top: 12px; gap: 10px;">
                    <button type="button" onclick="submitDispatchProjectGroup(${c.project_id})" class="btn-primary" style="background: linear-gradient(135deg, #059669 0%, #047857 100%); font-weight: 800; font-size: 12px; padding: 8px 18px; border-radius: 6px; box-shadow: 0 2px 4px rgba(5, 150, 105, 0.2);">
                        <i class="fa-solid fa-truck-ramp-box"></i> Despachar Ítems Marcados y Emitir Guía de Traslado (${c.project_code})
                    </button>
                </div>
            </div>
        `}),p+=`
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin-top: 14px; flex-wrap: wrap; gap: 10px;">
            <div style="font-size: 12px; font-weight: 600; color: #475569;">
                Mostrando obras <span style="font-weight: 800; color: #0f172a;">${i+1} - ${Math.min(s,i+S)}</span> de <span style="font-weight: 800; color: #0f172a;">${s}</span> con requerimientos
            </div>
            <div style="display: flex; gap: 6px; align-items: center;">
                <button type="button" onclick="goToReqPage(${M-1})" class="btn-secondary" style="padding: 4px 10px; font-size: 11px;" ${M<=1?'disabled style="opacity: 0.5; cursor: not-allowed;"':""}>
                    <i class="fa-solid fa-chevron-left"></i> Anterior
                </button>
                <span style="font-size: 11.5px; font-weight: 700; color: #1e293b; padding: 0 8px;">
                    Página ${M} de ${r}
                </span>
                <button type="button" onclick="goToReqPage(${M+1})" class="btn-secondary" style="padding: 4px 10px; font-size: 11px;" ${M>=r?'disabled style="opacity: 0.5; cursor: not-allowed;"':""}>
                    Siguiente <i class="fa-solid fa-chevron-right"></i>
                </button>
            </div>
            <div style="display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: #475569;">
                <span>Por página:</span>
                <select onchange="changeReqPageSize(this.value)" style="border: 1px solid #cbd5e1; border-radius: 4px; padding: 3px 6px; font-size: 11px; background: white;">
                    <option value="2" ${S===2?"selected":""}>2 obras</option>
                    <option value="3" ${S===3?"selected":""}>3 obras</option>
                    <option value="5" ${S===5?"selected":""}>5 obras</option>
                    <option value="10" ${S===10?"selected":""}>10 obras</option>
                </select>
            </div>
        </div>
    `,o.innerHTML=p}function Be(e){M=e,X(K,!1)}function De(e){S=parseInt(e)||3,M=1,X(K,!1)}function Te(e,t,o){const a=document.getElementById(`req_qty_${e}`),n=document.getElementById(`req_warn_${e}`);if(!a)return;let s=parseFloat(a.value)||0;if(s<0&&(s=0,a.value=0),s>t&&(alert(`⚠️ La cantidad a despachar (${s}) no puede ser mayor a lo solicitado (Saldo pendiente: ${t}). Se ajustó automáticamente.`),s=t,a.value=t),s>o&&(alert(`⚠️ Stock insuficiente en almacén/pañol: Solo hay ${o} unidades disponibles.`),s=o,a.value=o),n)if(s<t&&s>0){const r=(t-s).toFixed(2);n.style.display="block",n.innerHTML=`<span style="color: #b45309; background: #fef3c7; border: 1px solid #fde68a; padding: 2px 6px; border-radius: 4px; font-size: 9.5px; font-weight: 700; display: inline-block; margin-top: 3px;">⚠️ Entrega parcial: Quedarán ${r} pendientes por inventario.</span>`}else s===0?(n.style.display="block",n.innerHTML='<span style="color: #dc2626; background: #fee2e2; border: 1px solid #fecaca; padding: 2px 6px; border-radius: 4px; font-size: 9.5px; font-weight: 700; display: inline-block; margin-top: 3px;">⛔ Cantidad 0: No se incluirá en el traslado.</span>'):n.style.display="none"}function Pe(e,t){document.querySelectorAll(`.req-check-${e}`).forEach(o=>{o.disabled||(o.checked=t)})}async function je(e){var g,m,u,y,b,h;const t=document.querySelectorAll(`.req-check-${e}:checked`);if(!t||t.length===0){alert("⚠️ Por favor selecciona al menos un insumo disponible de la lista para despachar.");return}const o=[];let a=!1;for(const w of t){const _=parseInt(w.getAttribute("data-req-id")),f=parseFloat(w.getAttribute("data-stock")||0),$=parseFloat(w.getAttribute("data-pending")||0),v=document.getElementById(`req_qty_${_}`),x=parseFloat((v==null?void 0:v.value)||0);if(f<=0){alert("⛔ No se puede despachar un ítem con stock 0 en almacén."),v&&v.focus();return}if(x<=0){alert("⚠️ La cantidad a despachar para los ítems seleccionados debe ser mayor a 0."),v&&v.focus();return}if(x>$){alert(`⚠️ La cantidad a despachar (${x}) no puede ser mayor a lo solicitado (${$}).`),v&&v.focus();return}if(x>f){alert(`⚠️ Stock insuficiente: Solicitas ${x} pero solo hay ${f} en almacén.`),v&&v.focus();return}x<$&&(a=!0),o.push({requisition_id:_,quantity_to_dispatch:x})}const n=(((g=document.getElementById(`req_driver_${e}`))==null?void 0:g.value)||"").trim()||"Transporte DALOR / Conductor Asignado",s=(((m=document.getElementById(`req_driver_ci_${e}`))==null?void 0:m.value)||"").trim()||"V-DALOR",r=(((u=document.getElementById(`req_plate_${e}`))==null?void 0:u.value)||"").trim()||"DALOR-01",i=(((y=document.getElementById(`req_vehicle_model_${e}`))==null?void 0:y.value)||"").trim(),d=(b=document.getElementById(`req_vehicle_sel_${e}`))==null?void 0:b.value,p=(((h=document.getElementById(`req_notes_${e}`))==null?void 0:h.value)||"").trim();let c=`¿Confirmas el despacho de ${o.length} insumo(s) para la obra seleccionada?

Se descontará el stock en Almacén y se emitirá la Guía de Despacho oficial.`;if(a&&(c+=`

⚠️ ADVERTENCIA: Uno o más ítems tienen un despacho menor a lo solicitado por disponibilidad de inventario. El resto quedará como saldo pendiente en la obra.`),!!confirm(c))try{const w={project_id:e,items:o,driver_name:n,driver_id_doc:s,vehicle_plate:r,vehicle_model:i,asset_id:d&&d!=="externo"&&!isNaN(parseInt(d))?parseInt(d):null,notes:p},_=await C(`${q}/materials/dispatch-project-requisition`,{method:"POST",body:JSON.stringify(w)});if(_.ok){const f=await _.json();await F(),await T(),await G(e);const $=f.guide_number;confirm(`✅ ${f.message||"Despacho registrado exitosamente."}

Se ha emitido la Guía Oficial N°: ${$}

¿Deseas abrir la Guía de Despacho en pantalla completa ahora?`)&&typeof window.navigateToDispatchGuide=="function"&&(typeof closeModal=="function"&&closeModal("modalProjectRequisitionsInbox"),window.navigateToDispatchGuide($))}else{const f=await _.json();alert("❌ Error al procesar despacho: "+(f.detail||JSON.stringify(f)))}}catch(w){console.error("Error submitting project requisition dispatch:",w),alert("❌ Error de comunicación: "+w.message)}}async function ze(e,t){var y,b,h,w,_,f;const o=document.getElementById(`req_qty_${e}`),a=parseFloat((o==null?void 0:o.value)||0),n=document.querySelector(`.req-check-${t}[data-req-id="${e}"]`),s=parseFloat((n==null?void 0:n.getAttribute("data-stock"))||0),r=parseFloat((n==null?void 0:n.getAttribute("data-pending"))||0);if(s<=0){alert("⛔ No se puede despachar: Stock disponible en almacén es 0.");return}if(a<=0){alert("⚠️ Ingresa una cantidad válida mayor a 0 para despachar."),o&&o.focus();return}if(a>r){alert(`⚠️ La cantidad a despachar (${a}) no puede ser mayor a lo solicitado (${r}).`),o&&o.focus();return}if(a>s){alert(`⚠️ Stock insuficiente: Requieres ${a} pero solo hay ${s} en pañol.`),o&&o.focus();return}const i=(((y=document.getElementById(`req_driver_${t}`))==null?void 0:y.value)||"").trim()||"Transporte DALOR / Conductor Asignado",d=(((b=document.getElementById(`req_driver_ci_${t}`))==null?void 0:b.value)||"").trim()||"V-DALOR",p=(((h=document.getElementById(`req_plate_${t}`))==null?void 0:h.value)||"").trim()||"DALOR-01",c=(((w=document.getElementById(`req_vehicle_model_${t}`))==null?void 0:w.value)||"").trim(),g=(_=document.getElementById(`req_vehicle_sel_${t}`))==null?void 0:_.value,m=(((f=document.getElementById(`req_notes_${t}`))==null?void 0:f.value)||"").trim();let u=`¿Confirmas el despacho rápido de este insumo (${a} unidades)?
Se generará la Guía de Despacho oficial de traslado.`;if(a<r&&(u+=`

⚠️ ADVERTENCIA: La cantidad a despachar (${a}) es menor a lo solicitado (${r}) por inventario. Quedarán ${(r-a).toFixed(2)} pendientes.`),!!confirm(u))try{const $={project_id:t,items:[{requisition_id:e,quantity_to_dispatch:a}],driver_name:i,driver_id_doc:d,vehicle_plate:p,vehicle_model:c,asset_id:g&&g!=="externo"&&!isNaN(parseInt(g))?parseInt(g):null,notes:m},v=await C(`${q}/materials/dispatch-project-requisition`,{method:"POST",body:JSON.stringify($)});if(v.ok){const x=await v.json();await F(),await T(),await G(t);const l=x.guide_number;confirm(`✅ Despacho procesado exitosamente.

Se ha emitido la Guía Oficial N°: ${l}

¿Deseas ver la Guía de Despacho ahora?`)&&typeof window.navigateToDispatchGuide=="function"&&(typeof closeModal=="function"&&closeModal("modalProjectRequisitionsInbox"),window.navigateToDispatchGuide(l))}else{const x=await v.json();alert("❌ Error: "+(x.detail||JSON.stringify(x)))}}catch($){console.error("Error in quick dispatch:",$),alert("❌ Error de comunicación: "+$.message)}}typeof window<"u"&&(window.addMaterialDeliveryRow=R,window.calcMaterialConsumeTotal=Q,window.calcMaterialEntryTotal=N,window.filterMaterialsTable=pe,window.filterTransferToolsChecklist=Ee,window.loadMaterialsList=T,window.onConsumeMaterialSelected=J,window.onMaterialDeliveryProjectChanged=ie,window.onTransferGuideProjectChanged=$e,window.openMaterialConsumeModal=be,window.openMaterialDeliveryModal=Me,window.openMaterialEntryModal=xe,window.openNewMaterialModal=te,window.openTransferGuideModal=ve,window.renderInitialMaterialDeliveryRows=re,window.renderMaterialsTable=H,window.goToMaterialsPage=le,window.changeMaterialsPageSize=ce,window.renderMaterialsTablePaginated=O,window.renderTransferToolsChecklist=W,window.submitCreateMaterial=ge,window.submitGenerateMaterialDeliveryGuide=qe,window.submitGenerateTransferGuide=Ie,window.submitMaterialConsume=_e,window.submitMaterialEntry=he,window.addMaterialEntryRow=U,window.removeMaterialEntryRow=fe,window.onEntryMaterialRowChanged=oe,window.filterEntryRowDropdown=ye,window.filterConsumeMaterialDropdown=we,window.onConsumeProjectChanged=ne,window.toggleMaterialEntryPaymentBox=ae,window.onNewMaterialCategoryChanged=ue,window.openNewMaterialModalFromCxp=me,window.loadProjectRequisitionsBadge=F,window.openProjectRequisitionsInboxModal=Ce,window.loadProjectRequisitionsInbox=G,window.filterProjectRequisitionsView=de,window.toggleSelectAllProjectReqs=Pe,window.submitDispatchProjectGroup=je,window.quickDispatchSingleRequisition=ze,window.goToReqPage=Be,window.changeReqPageSize=De,window.onReqQtyChanged=Te,window.onReqVehicleChanged=Se,window.onReqDriverChanged=ke);
