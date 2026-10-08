var q=window.API_BASE||window.location.origin+"/api/v1";window.allClients=window.allClients||[];window.allServices=window.allServices||[];var D=window.allProjects=window.allProjects||[];window.allCategories=window.allCategories||[];var R=window.allAssets=window.allAssets||[],P=window.allPersonnel=window.allPersonnel||[],M=window.allMaterials=window.allMaterials||[];window.selectedPersonnelIds=window.selectedPersonnelIds||[];window.selectedVehicleIds=window.selectedVehicleIds||[];window.selectedToolIds=window.selectedToolIds||[];window.selectedMaterialIds=window.selectedMaterialIds||[];window.EXCHANGE_RATE=window.EXCHANGE_RATE||850;window.BCV_DATA=window.BCV_DATA||{rate:850,source:"BCV Oficial"};window.authToken=window.authToken||localStorage.getItem("dalor_token")||null;function k(e,t={}){const o=sessionStorage.getItem("dalor_token")||localStorage.getItem("dalor_token")||window.authToken||"",a={...t.headers||{}};return o&&(a.Authorization="Bearer "+o),t.body&&!(t.body instanceof FormData)&&!a["Content-Type"]&&(a["Content-Type"]="application/json"),t.body instanceof FormData&&delete a["Content-Type"],window.fetch(e,{...t,headers:a})}function Y(){const e=window.currentUser||JSON.parse(localStorage.getItem("dalor_user")||"null")||{},t=(e.role_name||e.role||e.username||"").toLowerCase();return t.includes("director")||t.includes("admin")}async function T(){const e=document.getElementById("materialsTableBody");if(!e)return;const t=Y(),o=t?9:7;e.innerHTML=`<tr><td colspan="${o}" style="text-align: center; padding: 20px; color: #94a3b8;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando inventario de materiales...</td></tr>`;try{const n=await(await k(`${q}/materials/`)).json();M=n.materials||(Array.isArray(n)?n:[]);const i=document.getElementById("matTotalItemsCount"),r=document.getElementById("matTotalValuationCard"),l=document.getElementById("matTotalValuationUsd");if(i&&(i.innerText=n.total_items!==void 0?n.total_items:M.length),r&&(r.style.display=t?"inline-block":"none"),l&&t){const d=n.total_inventory_usd!==void 0?n.total_inventory_usd:M.reduce((p,s)=>p+(s.stock_quantity*s.unit_cost_usd||0),0);l.innerText=`$${d.toLocaleString("en-US",{minimumFractionDigits:2})} USD`}document.querySelectorAll(".director-cost-col").forEach(d=>{d.style.display=t?"":"none"}),H(M);try{N()}catch(d){console.warn("Error populating material categories:",d)}O();try{typeof populateSelectDropdowns=="function"&&populateSelectDropdowns()}catch(d){console.warn("Dropdown populator warning:",d)}}catch(a){console.error("Error loading materials:",a),e.innerHTML=`<tr><td colspan="${o}" style="text-align: center; color: #e11d48; padding: 20px;">Error al cargar inventario de materiales: ${a.message}</td></tr>`}}let Z=[],z=1,ee=15;function ue(e){z=e,L();const t=document.getElementById("materialsTableBody");t&&t.scrollIntoView({behavior:"smooth",block:"nearest"})}function me(e){ee=parseInt(e)||15,z=1,L()}function H(e){Z=Array.isArray(e)?e:M||[],z=1,L()}function L(){const e=document.getElementById("materialsTableBody");if(!e)return;const t=Y(),o=t?9:7,a=Z||[];if(a.length===0){e.innerHTML=`<tr><td colspan="${o}" style="text-align: center; padding: 20px; color: #94a3b8;">No se encontraron materiales registrados.</td></tr>`;const d=document.getElementById("materialsPaginationContainer");d&&(d.innerHTML="");return}const{startIndex:n,endIndex:i,currentPage:r}=(typeof window.renderPaginationControls=="function"?window.renderPaginationControls:renderPaginationControls)({containerId:"materialsPaginationContainer",totalItems:a.length,currentPage:z,pageSize:ee,onPageChange:"goToMaterialsPage",onPageSizeChange:"changeMaterialsPageSize",itemLabel:"material(es) en catálogo",pageSizeOptions:[15,30,60,120]});z=r;const l=a.slice(n,i);e.innerHTML=l.map(d=>{const p=d.is_low_stock||d.stock_quantity<=d.min_stock_alert,s=Number(d.unit_cost_usd||0),m=Number(d.total_cost_usd||d.stock_quantity*s||0);return`
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
                <td style="text-align: right; font-weight: 700; color: #0284c7;">$${s.toLocaleString("en-US",{minimumFractionDigits:2})}</td>
                <td style="text-align: right; font-weight: 900; color: var(--dalor-navy);">$${m.toLocaleString("en-US",{minimumFractionDigits:2})}</td>
            `:""}
            <td style="text-align: center; white-space: nowrap;">
                <button onclick="openMaterialEntryModal(${d.id})" class="btn-primary" style="padding: 3px 8px; font-size: 11px; background: #059669;" title="Registrar Entrada / Compra">
                    <i class="fa-solid fa-plus"></i> Entrada
                </button>
                <button onclick="openMaterialConsumeModal(${d.id})" class="btn-primary" style="padding: 3px 8px; font-size: 11px; background: #0284c7; margin-left: 4px;" title="Despachar a Obra o Taller">
                    <i class="fa-solid fa-arrow-right-from-bracket"></i> Despachar
                </button>
                <button onclick="openEditMaterialModal(${d.id})" class="btn-secondary" style="padding: 3px 8px; font-size: 11px; margin-left: 4px; color: #0284c7; border-color: #bae6fd;" title="Editar Ficha del Material">
                    <i class="fa-solid fa-pen-to-square"></i> Editar
                </button>
                <button onclick="openCalibrateMaterialModal(${d.id})" class="btn-secondary" style="padding: 3px 8px; font-size: 11px; margin-left: 4px; color: #7c3aed; border-color: #c4b5fd;" title="Calibrar / Ajustar Stock con Clave de Director">
                    <i class="fa-solid fa-key"></i> Calibrar
                </button>
            </td>
        </tr>`}).join("")}function te(){var a,n;const e=(((a=document.getElementById("filterMaterialSearch"))==null?void 0:a.value)||"").toLowerCase(),t=((n=document.getElementById("filterMaterialCategory"))==null?void 0:n.value)||"",o=M.filter(i=>{const r=!e||i.name.toLowerCase().includes(e)||i.code.toLowerCase().includes(e),l=!t||i.category===t;return r&&l});H(o)}function N(){const e=["Planchas de Acero","Acero Estructural","Perfiles y Vigas","Tuberías y Bridas","Soldadura y Gases","Abrasivos y Discos","Tornillería y Fijaciones","Pinturas y Recubrimientos","Consumibles de Almacén"],t=(M||[]).map(i=>(i.category||"").trim()).filter(i=>i&&i.length>0),o=Array.from(new Set([...e,...t])).sort((i,r)=>i.localeCompare(r,"es")),a=document.getElementById("filterMaterialCategory");if(a){const i=a.value;a.innerHTML=`<option value="">-- Todas las Categorías (${o.length}) --</option>`+o.map(r=>`<option value="${r}">${r}</option>`).join(""),i&&o.includes(i)&&(a.value=i)}const n=document.getElementById("nmat_category");if(n){const i=n.value;n.innerHTML=o.map(r=>`<option value="${r}">${r}</option>`).join("")+'<option value="__NEW__" style="font-weight: bold; color: #2563eb;">➕ Crear Nueva Categoría...</option>',i&&(o.includes(i)||i==="__NEW__")&&(n.value=i)}}function fe(){const e=document.getElementById("nmat_category"),t=document.getElementById("nmat_category_custom");!e||!t||(e.value==="__NEW__"?(t.classList.remove("hidden"),t.style.display="block",t.required=!0,t.focus()):(t.classList.add("hidden"),t.style.display="none",t.required=!1,t.value=""))}function oe(e=!1){var a;e&&(window.openedMaterialModalFromCxp=!0);const t=document.getElementById("modalNewMaterial");t&&(t.style.zIndex="2200"),(a=document.getElementById("newMaterialForm"))==null||a.reset(),N();const o=document.getElementById("nmat_category_custom");o&&(o.classList.add("hidden"),o.style.display="none",o.required=!1,o.value=""),openModal("modalNewMaterial")}function ge(){oe(!0)}async function ye(e){var a,n;e.preventDefault();let t=document.getElementById("nmat_category").value;if(t==="__NEW__"&&(t=(((a=document.getElementById("nmat_category_custom"))==null?void 0:a.value)||"").trim(),!t)){alert("⚠️ Por favor ingresa el nombre de la nueva categoría."),(n=document.getElementById("nmat_category_custom"))==null||n.focus();return}const o={code:document.getElementById("nmat_code").value.trim().toUpperCase(),name:document.getElementById("nmat_name").value.trim(),category:t,unit_measure:document.getElementById("nmat_unit").value,stock_quantity:parseFloat(document.getElementById("nmat_stock").value)||0,min_stock_alert:parseFloat(document.getElementById("nmat_alert").value)||5,unit_cost_usd:parseFloat(document.getElementById("nmat_cost").value)||0,location:document.getElementById("nmat_location").value.trim()||"Almacén Central Dalor"};try{const i=await k(`${q}/materials/`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(o)});if(i.ok){const r=await i.json().catch(()=>({}));closeModal("modalNewMaterial"),await T(),N();const l=document.getElementById("filterMaterialSearch");l&&(l.value=o.code||r.code||"",te()),window.openedMaterialModalFromCxp?(window.openedMaterialModalFromCxp=!1,typeof window.onMaterialCreatedFromCxp=="function"&&window.onMaterialCreatedFromCxp(r)):alert(`✅ Material [${o.code}] "${o.name}" creado con éxito en categoría "${t}".`)}else{const r=await i.json().catch(()=>({}));alert("Error: "+(r.detail||JSON.stringify(r)))}}catch(i){alert("Error de conexión al crear material: "+i.message)}}function U(e=null,t=1,o=0){const a=document.getElementById("me_materials_tbody");if(!a)return;const n=window.allMaterials&&window.allMaterials.length>0?window.allMaterials:M||[],i="me_row_"+Date.now()+"_"+Math.floor(Math.random()*1e3),r=document.createElement("tr");r.id=i,r.style.borderBottom="1px solid #e2e8f0";const l=n.map(d=>{const p=e&&d.id===e?"selected":"",s=d.unit_cost_usd||0;return`<option value="${d.id}" data-cost="${s}" data-unit="${d.unit_measure||"UND"}" data-stock="${d.stock_quantity||0}" ${p}>[${d.code}] ${d.name} (Stock: ${d.stock_quantity||0} ${d.unit_measure||"UND"})</option>`}).join("");if(r.innerHTML=`
        <td style="padding: 6px 8px;">
            <input type="text" placeholder="🔍 Escribe para filtrar material..." oninput="filterEntryRowDropdown(this)" style="font-size: 11px; padding: 4px 6px; width: 100%; margin-bottom: 4px; border: 1px solid #cbd5e1; border-radius: 4px; box-sizing: border-box; background: #f8fafc;">
            <select class="me-row-material form-select" onchange="onEntryMaterialRowChanged(this)" style="font-size: 11.5px; padding: 4px 6px; width: 100%;">
                <option value="">-- Seleccionar Material --</option>
                ${l}
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
    `,a.appendChild(r),e){const d=r.querySelector(".me-row-material");d&&(d.value=e,ae(d))}else F()}function xe(e){const t=e.closest("tr");t&&t.remove();const o=document.getElementById("me_materials_tbody");o&&o.children.length===0?U():F()}function ae(e){const t=e.closest("tr");if(!t)return;const o=e.options[e.selectedIndex];if(o&&o.value){const a=t.querySelector(".me-row-cost");if(a&&(!parseFloat(a.value)||parseFloat(a.value)===0)){const n=parseFloat(o.getAttribute("data-cost"))||0;n>0&&(a.value=n.toFixed(2))}}F()}function be(e){const t=(e.value||"").toLowerCase().trim(),o=e.closest("tr");if(!o)return;const a=o.querySelector(".me-row-material");if(!a)return;const n=window.allMaterials&&window.allMaterials.length>0?window.allMaterials:M||[],i=t?n.filter(l=>(l.name||"").toLowerCase().includes(t)||(l.code||"").toLowerCase().includes(t)):n,r=a.value;a.innerHTML=`<option value="">-- Seleccionar Material (${i.length}) --</option>`+i.map(l=>{const d=String(l.id)===String(r)?"selected":"";return`<option value="${l.id}" data-cost="${l.unit_cost_usd||0}" data-unit="${l.unit_measure||"UND"}" data-stock="${l.stock_quantity||0}" ${d}>[${l.code}] ${l.name} (Stock: ${l.stock_quantity||0} ${l.unit_measure||"UND"})</option>`}).join("")}function he(e=null){const t=document.getElementById("materialEntryForm");t&&t.reset();const o=document.getElementById("me_materials_tbody");o&&(o.innerHTML=""),U(e,1,0),ne(),openModal("modalMaterialEntry")}function F(){const e=document.querySelectorAll("#me_materials_tbody tr");let t=0;e.forEach(r=>{var m,u;const l=parseFloat((m=r.querySelector(".me-row-qty"))==null?void 0:m.value)||0,d=parseFloat((u=r.querySelector(".me-row-cost"))==null?void 0:u.value)||0,p=l*d;t+=p;const s=r.querySelector(".me-row-subtotal");s&&(s.innerText=`$${p.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`)});const o=document.getElementById("me_total_usd_preview");o&&(o.innerText=`$${t.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})} USD`);const a=window.bcvRate||window.currentBcvRate||1,n=t*(a>1?a:1),i=document.getElementById("me_total_bs_preview");i&&(i.innerText=a>1?`≈ Bs ${n.toLocaleString("es-VE",{minimumFractionDigits:2,maximumFractionDigits:2})} (Tasa BCV: ${a})`:"")}function ne(){var o;const e=((o=document.getElementById("me_register_cxp"))==null?void 0:o.checked)||!1,t=document.getElementById("me_cash_payment_box");t&&(e?t.classList.add("hidden"):t.classList.remove("hidden"))}async function we(e){var s,m,u,f,y,h;e&&(typeof e.preventDefault=="function"&&e.preventDefault(),typeof e.stopPropagation=="function"&&e.stopPropagation());const t=document.querySelectorAll("#me_materials_tbody tr"),o=[];if(t.forEach(c=>{var b,E,I;const w=parseInt((b=c.querySelector(".me-row-material"))==null?void 0:b.value),x=parseFloat((E=c.querySelector(".me-row-qty"))==null?void 0:E.value)||0,$=parseFloat((I=c.querySelector(".me-row-cost"))==null?void 0:I.value)||0;w&&!isNaN(w)&&x>0&&o.push({material_id:w,quantity:x,unit_cost_usd:$})}),o.length===0)return alert("⚠️ Por favor añade al menos un material válido con cantidad mayor a 0."),!1;const a=((s=document.getElementById("me_register_cxp"))==null?void 0:s.checked)||!1,n=((m=document.getElementById("me_payment_channel"))==null?void 0:m.value)||"caja_chica_usd",i=(((u=document.getElementById("me_payment_ref"))==null?void 0:u.value)||"").trim(),r=(((f=document.getElementById("me_supplier"))==null?void 0:f.value)||"").trim()||"Proveedor General",l=(((y=document.getElementById("me_doc"))==null?void 0:y.value)||"").trim()||"Factura Compra",d=(((h=document.getElementById("me_notes"))==null?void 0:h.value)||"").trim(),p={items:o,supplier_name:r,reference_doc:l,notes:d,performed_by:"Custodio de Almacén",register_in_cxp:a,due_days:15,payment_channel:n,payment_ref:i};try{const c=window.authToken||localStorage.getItem("dalor_token"),w={"Content-Type":"application/json",...c?{Authorization:`Bearer ${c}`}:{}},x=await k(`${q}/materials/entry`,{method:"POST",headers:w,body:JSON.stringify(p)});if(x.ok){const $=await x.json();alert(`✅ ${$.message||"Entrada registrada exitosamente"}`),closeModal("modalMaterialEntry");try{await loadInitialMasterData()}catch{}try{T()}catch{}if(a&&typeof window.loadPayablesList=="function")try{window.loadPayablesList()}catch{}}else{const $=await x.json().catch(()=>({detail:"Error en el servidor al registrar entrada."}));alert("Error: "+($.detail||JSON.stringify($)))}}catch(c){console.error("[MATERIAL ENTRY ERROR]",c),alert("Error al procesar entrada de material: "+((c==null?void 0:c.message)||c))}return!1}function _e(e=null){document.getElementById("materialConsumeForm").reset(),populateSelectDropdowns();const t=document.getElementById("mc_material_search");t&&(t.value="");const o=document.getElementById("mc_material_id");e?(o.value=e,o.disabled=!0,o.style.opacity="0.7",o.style.cursor="not-allowed"):(o.disabled=!1,o.style.opacity="",o.style.cursor=""),ie(),J(),Q(),openModal("modalMaterialConsume")}function ve(e){const t=(e||"").toLowerCase().trim(),o=document.getElementById("mc_material_id");if(!o)return;const n=(window.allMaterials&&window.allMaterials.length>0?window.allMaterials:M||[]).filter(l=>(parseFloat(l.stock_quantity)||0)>0),i=t?n.filter(l=>(l.name||"").toLowerCase().includes(t)||(l.code||"").toLowerCase().includes(t)):n,r=o.value;o.innerHTML=`<option value="">-- Seleccionar Material (${i.length} con stock) --</option>`+i.map(l=>{const d=String(l.id)===String(r)?"selected":"";return`<option value="${l.id}" data-cost="${l.unit_cost_usd||0}" data-unit="${l.unit_measure||"UND"}" data-stock="${l.stock_quantity}" ${d}>[${l.code}] ${l.name} (Stock: ${l.stock_quantity} ${l.unit_measure||"UND"})</option>`}).join(""),J()}function ie(){var o;const e=(o=document.getElementById("mc_project_id"))==null?void 0:o.value,t=document.getElementById("mc_guide_banner");t&&(t.style.display=e?"block":"none")}function J(){const e=document.getElementById("mc_material_id");if(!e||!e.options[e.selectedIndex])return;const t=e.options[e.selectedIndex],o=t.getAttribute("data-stock")||"0",a=t.getAttribute("data-unit")||"UND",n=document.getElementById("mc_stock_available_label");n&&(n.innerText=`${parseFloat(o).toLocaleString()} ${a}`),Q()}function Q(){var i;const e=document.getElementById("mc_material_id"),t=parseFloat((i=document.getElementById("mc_quantity"))==null?void 0:i.value)||0;let o=0;e&&e.options[e.selectedIndex]&&(o=parseFloat(e.options[e.selectedIndex].getAttribute("data-cost"))||0);const a=t*o,n=document.getElementById("mc_cost_preview");n&&(n.value=`$${a.toLocaleString("en-US",{minimumFractionDigits:2})} USD`)}async function $e(e){var s,m;e.preventDefault();const t=parseInt(document.getElementById("mc_material_id").value),o=parseFloat(document.getElementById("mc_quantity").value)||0,a=document.getElementById("mc_project_id").value,n=a?parseInt(a):null;if(!t||o<=0){alert("Selecciona un material y cantidad válida mayor a 0.");return}const r=(window.allMaterials&&window.allMaterials.length>0?window.allMaterials:M||[]).find(u=>u.id===t);if(r){const u=parseFloat(r.stock_quantity)||0;if(u<=0){alert(`⛔ Stock agotado: El material [${r.code}] ${r.name} no posee unidades disponibles en pañol (Stock: 0).`);return}if(o>u){alert(`⛔ Stock insuficiente: Has solicitado ${o} ${r.unit_measure||"UND"} de [${r.code}] ${r.name}, pero solo hay ${u} ${r.unit_measure||"UND"} disponibles en pañol.`);return}}const l=(((s=document.getElementById("mc_driver_name"))==null?void 0:s.value)||"").trim(),d=(((m=document.getElementById("mc_vehicle_plate"))==null?void 0:m.value)||"").trim(),p={material_id:t,quantity:o,project_id:n,destination:n?"Obra en Ejecución":"Taller Central",reference_doc:document.getElementById("mc_doc").value.trim()||"Requisición Interna",notes:document.getElementById("mc_notes").value.trim(),performed_by:document.getElementById("mc_performed_by").value.trim()||"Custodio de Almacén",driver_name:l,vehicle_plate:d};try{const u=window.authToken||localStorage.getItem("dalor_token")||null,f={"Content-Type":"application/json"};u&&(f.Authorization=`Bearer ${u}`);const y=await k(`${q}/materials/consume`,{method:"POST",headers:f,body:JSON.stringify(p)});if(y.ok){const h=await y.json();closeModal("modalMaterialConsume"),await loadInitialMasterData(),T(),h.guide_number?confirm(`✅ ${h.message||"Despacho procesado exitosamente."}

Se ha emitido automáticamente la Guía de Despacho Oficial N°: ${h.guide_number}

¿Deseas abrirla en el módulo de Despachos ahora mismo?`)&&typeof window.navigateToDispatchGuide=="function"&&window.navigateToDispatchGuide(h.guide_number):alert(`✅ ${h.message||"Despacho registrado exitosamente."}`)}else{const h=await y.json();alert("Error: "+(h.detail||JSON.stringify(h)))}}catch(u){alert("Error al procesar despacho de material: "+u.message)}}function Ee(){document.getElementById("transferGuideForm").reset(),populateSelectDropdowns(),W(),openModal("modalTransferGuide")}function Ie(){const e=document.getElementById("tg_project_id");if(!e||!e.options[e.selectedIndex])return;const t=e.options[e.selectedIndex],o=parseInt(e.value),a=D.find(d=>d.id===o),n=a&&a.location||t.getAttribute("data-location")||"Planta Centro - Morón",i=document.getElementById("tg_destination");i&&(i.value=n);const r=document.getElementById("tg_driver_name");if(r){let d=(P||[]).find(p=>p.current_project_id===o&&(p.role_title||"").toLowerCase().includes("chofer"));d||(d=(P||[]).find(p=>(p.role_title||"").toLowerCase().includes("chofer"))),!d&&P&&P.length>0&&(d=P[0]),d&&(r.value=d.full_name)}const l=document.getElementById("tg_vehicle_id");if(l){const d=(R||[]).find(p=>(p.asset_type==="vehiculo"||p.asset_type==="camioneta")&&p.current_project_id===o);if(d)l.value=d.id;else{const p=(R||[]).find(s=>s.asset_type==="vehiculo"||s.asset_type==="camioneta");p&&(l.value=p.id)}}W(o)}function W(e=null){const t=document.getElementById("tg_tools_checklist_container");if(!t)return;const o=R.filter(a=>a.asset_type!=="vehiculo"&&a.asset_type!=="camioneta");if(o.length===0){t.innerHTML='<span style="font-size:11px; color:#94a3b8;">No hay herramientas registradas.</span>';return}t.innerHTML=o.map(a=>{const n=e&&(a.current_project_id===e||a.current_location==="en_obra");return`

        <label style="display: flex; align-items: center; gap: 8px; padding: 4px 6px; border-radius: 4px; background: ${n?"#f0fdf4":"#f8fafc"}; font-size: 11px; cursor: pointer;" class="tg-tool-item" data-text="${a.asset_code} ${a.name} ${a.brand||""}">

            <input type="checkbox" value="${a.id}" data-name="${a.name}" data-code="${a.asset_code}" data-brand="${a.brand||""}" data-serial="${a.serial_number||""}" class="tg-tool-checkbox" ${n?"checked":""} style="width: 15px; height: 15px; accent-color: #0284c7;">

            <span style="font-weight: 800; color: var(--dalor-blue); font-family: monospace;">[${a.asset_code}]</span>

            <span style="font-weight: 600; color: var(--dalor-navy);">${a.name}</span>

            <span style="color: #64748b; font-size: 10px; margin-left: auto;">${a.brand||""}</span>

        </label>

        `}).join("")}function Me(){var t;const e=(((t=document.getElementById("tg_tools_search"))==null?void 0:t.value)||"").toLowerCase();document.querySelectorAll(".tg-tool-item").forEach(o=>{const a=o.getAttribute("data-text").toLowerCase();o.style.display=a.includes(e)?"flex":"none"})}async function Ce(e){var u;e.preventDefault();const t=parseInt(document.getElementById("tg_project_id").value),o=document.getElementById("tg_destination").value.trim(),a=document.getElementById("tg_vehicle_id").value,n=document.getElementById("tg_driver_name").value.trim();if(!t){alert("Por favor selecciona un proyecto aprobado de destino.");return}const i=[];if(document.querySelectorAll(".tg-tool-checkbox:checked").forEach(f=>{i.push({id:parseInt(f.value),code:f.getAttribute("data-code"),name:f.getAttribute("data-name")})}),i.length===0){alert("Por favor selecciona al menos una herramienta o equipo a trasladar.");return}const r=D.find(f=>f.id===t)||{code:"DAL-2026-001",name:"Proyecto Obra"},l=R.find(f=>f.id==a)||{name:"Camioneta Toyota Hilux"},d=`GT-DALOR-${Date.now().toString().slice(-6)}`;for(const f of i)try{await k(`${q}/resources/assign`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({resource_type:"asset",resource_id:f.id,project_id:t,destination_location:o,custodian_name:n,action_type:"assign"})})}catch(y){console.error("Error asignando herramienta:",y)}closeModal("modalTransferGuide"),await loadInitialMasterData(),document.getElementById("subtab-res-tools")&&!document.getElementById("subtab-res-tools").classList.contains("hidden")&&loadToolsList();const p=document.getElementById("modalPrintPreviewContent"),s=document.getElementById("previewModalTitle");s&&(s.innerText="Guía Oficial de Traslado y Despacho de Equipos - Dalor C.A.");const m=new Date().toLocaleDateString("es-VE")+" "+new Date().toLocaleTimeString("es-VE",{hour:"2-digit",minute:"2-digit"});p&&(p.innerHTML=`

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

                        Fecha: ${m}

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

                    <td style="padding: 6px 10px; border: 1px solid #cbd5e1;">${l.name} (Placa: ${l.license_plate||"N/A"})</td>

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

                    ${i.map((f,y)=>`

                        <tr style="background: ${y%2===0?"#ffffff":"#f8fafc"};">

                            <td style="padding: 6px 10px; border: 1px solid #cbd5e1; text-align: center; font-weight: 800;">${y+1}</td>

                            <td style="padding: 6px 10px; border: 1px solid #cbd5e1; font-family: monospace; font-weight: 800; color: #0284c7;">${f.code}</td>

                            <td style="padding: 6px 10px; border: 1px solid #cbd5e1; font-weight: 700;">${f.name}</td>

                            <td style="padding: 6px 10px; border: 1px solid #cbd5e1; color: #64748b;">${f.brand||"-"}</td>

                            <td style="padding: 6px 10px; border: 1px solid #cbd5e1; font-family: monospace;">${f.serial||"S/N"}</td>

                            <td style="padding: 6px 10px; border: 1px solid #cbd5e1; text-align: center; color: #059669; font-weight: 800;">Operativo</td>

                        </tr>

                    `).join("")}

                </tbody>

            </table>



            <!-- Observaciones -->

            <div style="background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 14px; margin-bottom: 24px; font-size: 11px;">

                <strong>Observaciones / Condición de Custodia:</strong> ${((u=document.getElementById("tg_notes"))==null?void 0:u.value)||"Equipos verificados y entregados en condiciones 100% operativas para faena de obra."}

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

        `,openModal("modalPrintPreview"))}async function qe(){const e=document.getElementById("materialDeliveryForm");e&&e.reset();let t=window.allProjects&&window.allProjects.length>0?window.allProjects:D||[];if(t.length===0)try{const n=await k(`${q}/projects/`);n.ok&&(t=await n.json(),window.allProjects=D=t)}catch(n){console.error("Error cargando proyectos para despacho:",n)}const o=(t||[]).filter(n=>{const i=(n.status||"").toLowerCase().trim();return!["culminado","completado","cerrado","cancelado","finalizado","inactivo"].includes(i)}),a=document.getElementById("md_project_id");a&&(o.length===0?a.innerHTML='<option value="">⚠️ No hay obras abiertas disponibles para despacho</option>':a.innerHTML='<option value="">-- Seleccione Proyecto Aprobado Destino --</option>'+o.map(n=>`<option value="${n.id}" data-location="${n.location||""}">[${n.code}] ${n.name}</option>`).join("")),re(),openModal("modalMaterialDelivery")}function re(){const e=document.getElementById("md_project_id");if(!e||!e.options[e.selectedIndex])return;const t=parseInt(e.value),o=D.find(l=>l.id===t),a=o&&o.location||"Frente de Obra / Planta",n=document.getElementById("md_destination");n&&(n.value=a);const i=document.getElementById("md_dispatcher_name");i&&!i.value&&(i.value="Jefe de Materiales / Almacén Central");const r=document.getElementById("md_receiver_name");r&&!r.value&&(r.value=o&&o.client_name?`Supervisor / Residente (${o.client_name})`:"Supervisor Residente de Obra"),le()}function le(){const e=document.getElementById("md_materials_tbody");if(e)if(e.innerHTML="",M&&M.length>0)for(let t=0;t<Math.min(2,M.length);t++)A(M[t].name,M[t].unit_measure||"Pza",1);else A("Cable THW 12 AWG","Metro (m)",50),A("Breaker 2x30A","Pza",2)}function A(e="",t="Pza",o=1){const a=document.getElementById("md_materials_tbody");if(!a)return;const n=document.createElement("tr");n.style.borderBottom="1px solid #f1f5f9",n.innerHTML=`

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

    `,a.appendChild(n)}function ke(e){e.preventDefault();const t=parseInt(document.getElementById("md_project_id").value),o=document.getElementById("md_destination").value.trim(),a=document.getElementById("md_dispatcher_name").value.trim(),n=document.getElementById("md_receiver_name").value.trim(),i=document.getElementById("md_notes").value.trim(),r=[];if(document.querySelectorAll("#md_materials_tbody tr").forEach(u=>{var c,w,x;const f=(c=u.querySelector(".md-item-name"))==null?void 0:c.value.trim(),y=((w=u.querySelector(".md-item-unit"))==null?void 0:w.value.trim())||"Pza",h=parseFloat((x=u.querySelector(".md-item-qty"))==null?void 0:x.value)||0;f&&h>0&&r.push({name:f,unit:y,qty:h})}),r.length===0){alert("Por favor ingresa al menos un material con cantidad válida.");return}const l=D.find(u=>u.id===t)||{code:"DAL-2026-001",name:"Proyecto en Obra"},d=`NE-MAT-${Date.now().toString().slice(-6)}`,p=new Date().toLocaleDateString("es-VE")+" "+new Date().toLocaleTimeString("es-VE",{hour:"2-digit",minute:"2-digit"});closeModal("modalMaterialDelivery");const s=document.getElementById("modalPrintPreviewContent"),m=document.getElementById("previewModalTitle");m&&(m.innerText="Nota Oficial de Entrega de Materiales - Dalor C.A."),s&&(s.innerHTML=`

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

                    <td style="padding: 6px 10px; border: 1px solid #cbd5e1; width: 30%; font-weight: 800; color: #059669;">[${l.code}] ${l.name}</td>

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

                    ${r.map((u,f)=>`

                        <tr style="background: ${f%2===0?"#ffffff":"#f8fafc"};">

                            <td style="padding: 6px 10px; border: 1px solid #cbd5e1; text-align: center; font-weight: 800;">${f+1}</td>

                            <td style="padding: 6px 10px; border: 1px solid #cbd5e1; font-weight: 700;">${u.name}</td>

                            <td style="padding: 6px 10px; border: 1px solid #cbd5e1; text-align: center; color: #64748b;">${u.unit}</td>

                            <td style="padding: 6px 10px; border: 1px solid #cbd5e1; text-align: right; font-weight: 900; color: #059669; font-size: 12px;">${u.qty}</td>

                        </tr>

                    `).join("")}

                </tbody>

            </table>



            <!-- Observaciones -->

            <div style="background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 14px; margin-bottom: 24px; font-size: 11px;">

                <strong>Observaciones de Despacho:</strong> ${i||"Material verificado en almacén, embalado y entregado conforme para instalación inmediata en obra."}

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

        `,openModal("modalPrintPreview"))}var V=window.allProjectRequisitions=[];async function O(){try{const e=await k(`${q}/materials/project-requisitions?status=pendiente`);if(!e.ok)return;const t=await e.json(),o=new Set;let a=!1;(t||[]).forEach(l=>{(l.quantity_pending||0)>0&&(l.project_id&&o.add(l.project_id),(l.quantity_dispatched||0)>0&&(a=!0))});const n=o.size;["badgePendingRequisitions","badgePendingRequisitionsBanner","badgePendingRequisitionsDispatch","badgePendingRequisitionsNav","badgePendingRequisitionsHeader"].forEach(l=>{const d=document.getElementById(l);d&&(d.innerText=n,d.style.display=n>0?"inline-block":"none",a?d.title=`${n} obra(s) con requerimientos (posee pendientes parciales)`:d.title=`${n} obra(s) con requerimientos pendientes`)});const r=document.getElementById("btnHeaderRequisitionsAlarm");r&&(n>0?(r.style.color="#dc2626",r.style.fontWeight="800",r.title=`🚨 ¡Atención Almacén! Hay ${n} obra(s) con solicitudes pendientes de despacho`):(r.style.color="",r.style.fontWeight="",r.title="Requisiciones de Materiales"))}catch(e){console.warn("Could not load project requisitions badge:",e)}}async function Be(e=null){typeof openModal=="function"&&openModal("modalProjectRequisitionsInbox"),await G(e)}async function G(e=null){const t=document.getElementById("reqInboxContainer");if(t){t.innerHTML='<div style="text-align: center; padding: 40px; color: #94a3b8;"><i class="fa-solid fa-spinner fa-spin" style="font-size: 24px;"></i><p style="margin-top: 8px; font-size: 13px;">Cargando pedidos de insumos desde las Obras...</p></div>';try{const o=await k(`${q}/materials/project-requisitions`);if(!o.ok)throw new Error("Error al consultar requisiciones de proyectos.");const a=await o.json();V=window.allProjectRequisitions=Array.isArray(a)?a:[];const n=document.getElementById("reqInboxProjectFilter");if(n){const i=e!==null?String(e):n.value,r=[],l=new Set;V.forEach(p=>{p.project_id&&!l.has(p.project_id)&&(l.add(p.project_id),r.push({id:p.project_id,code:p.project_code||`PRJ-${p.project_id}`,name:p.project_name||"Sin Título"}))}),r.sort((p,s)=>(s.code||"").localeCompare(p.code||""));let d='<option value="">-- Todas las Obras / Proyectos --</option>';r.forEach(p=>{d+=`<option value="${p.id}" ${i==String(p.id)?"selected":""}>[${p.code}] ${p.name}</option>`}),n.innerHTML=d}de()}catch(o){console.error("Error loading project requisitions inbox:",o),t.innerHTML=`<div style="text-align: center; padding: 30px; color: #ef4444;"><i class="fa-solid fa-triangle-exclamation" style="font-size: 24px;"></i><p style="margin-top: 8px;">Error al cargar las requisiciones: ${o.message}</p></div>`}}}function de(){var n,i,r;const e=(((n=document.getElementById("reqInboxSearch"))==null?void 0:n.value)||"").toLowerCase().trim(),t=((i=document.getElementById("reqInboxProjectFilter"))==null?void 0:i.value)||"",o=((r=document.getElementById("reqInboxStatusFilter"))==null?void 0:r.value)||"pending";let a=V||[];o==="pending"&&(a=a.filter(l=>(l.quantity_pending||0)>0&&l.status!=="despachado")),t&&(a=a.filter(l=>String(l.project_id)===String(t))),e&&(a=a.filter(l=>(l.material_name||"").toLowerCase().includes(e)||(l.material_code||"").toLowerCase().includes(e)||(l.project_code||"").toLowerCase().includes(e)||(l.project_name||"").toLowerCase().includes(e))),X(a)}function se(e){const t=document.getElementById(`req_vehicle_sel_${e}`),o=document.getElementById(`req_plate_${e}`),a=document.getElementById(`req_vehicle_model_${e}`);if(!t||!o||!a)return;const n=t.options[t.selectedIndex];if(!n||n.value===""||n.value==="externo"){n&&n.value==="externo"&&(o.value="",a.value="",o.placeholder="Placa flete (ej: A12BC3D)",a.placeholder="Modelo / Tipo Flete");return}const i=n.getAttribute("data-plate")||"",r=n.getAttribute("data-model")||"";o.value=i!=="S/P"?i:"",a.value=r}window.onReqVehicleChanged=se;function ce(e){const t=document.getElementById(`req_driver_sel_${e}`),o=document.getElementById(`req_driver_${e}`),a=document.getElementById(`req_driver_ci_${e}`);if(!t||!o||!a)return;const n=t.options[t.selectedIndex];if(!n||n.value===""||n.value==="externo"){n&&n.value==="externo"&&(o.value="",a.value="",o.placeholder="Nombre del Chofer Contratado",a.placeholder="C.I. / Cédula");return}const i=n.getAttribute("data-name")||"",r=n.getAttribute("data-ci")||"";o.value=i,a.value=r}window.onReqDriverChanged=ce;var B=window.currentReqPage=1,S=window.reqPageSize=3,K=window.currentFilteredReqs=[];function X(e,t=!0){const o=document.getElementById("reqInboxContainer");if(!o)return;if(t&&(B=1),K=e||[],!e||e.length===0){o.innerHTML=`
            <div style="text-align: center; padding: 50px 20px; background: #f8fafc; border-radius: 12px; border: 2px dashed #cbd5e1;">
                <i class="fa-solid fa-circle-check" style="font-size: 40px; color: #10b981; margin-bottom: 12px;"></i>
                <h4 style="font-size: 16px; font-weight: 800; color: #1e293b;">¡No hay requerimientos pendientes de preparación!</h4>
                <p style="font-size: 12px; color: #64748b; max-width: 480px; margin: 6px auto 0;">
                    Todas las solicitudes de insumos formuladas en Obras han sido despachadas o no coinciden con los filtros seleccionados.
                </p>
            </div>
        `;return}const a={};e.forEach(s=>{const m=s.project_id||0;a[m]||(a[m]={project_id:m,project_code:s.project_code||"S/P",project_name:s.project_name||"Sin Obra Asignada",project_location:s.project_location||"",is_internal:!!s.is_internal,max_req_id:s.id||0,items:[]}),a[m].items.push(s),(s.id||0)>a[m].max_req_id&&(a[m].max_req_id=s.id)});const n=Object.values(a);n.sort((s,m)=>(m.max_req_id||0)-(s.max_req_id||0)),n.forEach(s=>{s.items.sort((m,u)=>(u.id||0)-(m.id||0))});const i=n.length,r=Math.max(1,Math.ceil(i/S));B>r&&(B=r);const l=(B-1)*S,d=n.slice(l,l+S);let p="";d.forEach(s=>{const m=s.items.filter(c=>(c.quantity_pending||0)>0).length,u=s.items[0]||{},f=`${u.project_location||s.project_location||""} ${s.project_name||""} ${s.project_code||""}`.toLowerCase(),y=u.is_internal||s.is_internal||f.includes("sede")||f.includes("guacara")||f.includes("taller");let h="";if(y)h=`
                <input type="hidden" id="req_is_internal_${s.project_id}" value="1">
                <div style="background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 8px; padding: 12px 16px; margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <span style="font-size: 26px;">🏢</span>
                        <div>
                            <strong style="color: #166534; font-size: 13px; display: block;">ENTREGA DE MATERIALES (CONTROL INTERNO - SEDE CENTRAL)</strong>
                            <span style="color: #4b5563; font-size: 11px;">Trabajo ejecutado dentro de sede central. Almacén certifica la entrega de pañol. No requiere chofer ni vehículo.</span>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px; flex: 1; max-width: 420px; min-width: 260px;">
                        <div style="flex: 1;">
                            <label style="font-size: 10px; font-weight: 800; color: #166534; text-transform: uppercase; display: block; margin-bottom: 2px;">Observaciones de Entrega en Pañol:</label>
                            <input type="text" id="req_notes_${s.project_id}" placeholder="Ej: Material verificado para trabajo interno en pañol." class="form-input" style="font-size: 11px; padding: 5px 8px; background: white; width: 100%;">
                        </div>
                    </div>
                </div>
            `;else{const c=u.project_vehicles||[],w=u.available_fleet||u.all_fleet||[],x=u.project_personnel||[],$=u.available_personnel||u.all_personnel||[],b=c.length>0,E=b&&c[0].plate!=="S/P"?c[0].plate:"",I=b&&(c[0].name||c[0].model)||"";let v='<option value="">-- Seleccionar Flota DALOR o Externo --</option>';c.length>0&&(v+='<optgroup label="🚗 Asignado a esta Obra (Prioridad)">',c.forEach((g,j)=>{const pe=j===0?"selected":"";v+=`<option value="${g.id}" data-plate="${g.plate}" data-model="${g.name||g.model}" ${pe}>[${g.code}] ${g.name} (${g.plate})</option>`}),v+="</optgroup>"),w.length>0&&(v+='<optgroup label="🚚 Otros Vehículos Disponibles en Base">',w.filter(g=>!c.some(j=>j.id===g.id)).forEach(g=>{v+=`<option value="${g.id}" data-plate="${g.plate}" data-model="${g.name||g.model}">[${g.code}] ${g.name} (${g.plate})</option>`}),v+="</optgroup>"),v+='<optgroup label="🏢 Flete Tercerizado / Externo">',v+=`<option value="externo" data-plate="" data-model="" ${b?"":"selected"}>Flete Externo / Retiro Cliente (Ingreso manual)</option>`,v+="</optgroup>";let _='<option value="">-- Seleccionar Chofer o Externo --</option>';x.length>0&&(_+='<optgroup label="🚗 Personal Asignado a esta Obra">',x.forEach(g=>{_+=`<option value="${g.id}" data-name="${g.name}" data-ci="${g.ci}">${g.name} (C.I: ${g.ci})</option>`}),_+="</optgroup>"),$.length>0&&(_+='<optgroup label="🏢 Chofer / Personal Disponible en Base">',$.filter(g=>!x.some(j=>j.id===g.id)).forEach(g=>{_+=`<option value="${g.id}" data-name="${g.name}" data-ci="${g.ci}">${g.name} (C.I: ${g.ci})</option>`}),_+="</optgroup>"),_+='<optgroup label="✍️ Chofer Contratado / Externo">',_+='<option value="externo" data-name="" data-ci="" selected>✍️ Chofer Externo / Contratado por Fuera (Ingreso manual)</option>',_+="</optgroup>",h=`
                <input type="hidden" id="req_is_internal_${s.project_id}" value="0">
                <div style="background: #f0f9ff; border: 1.5px solid #bae6fd; border-radius: 8px; padding: 12px 14px; margin-bottom: 12px; display: grid; grid-template-columns: 1.2fr 1.2fr 1.6fr; gap: 12px; align-items: start;">
                    <div>
                        <label style="font-size: 11px; font-weight: 800; color: #0369a1; display: flex; align-items: center; justify-content: space-between; margin-bottom: 3px;">
                            <span><i class="fa-solid fa-truck-pickup"></i> Vehículo para Obra Foránea</span>
                            <span style="font-size: 9.5px; color: #0284c7; font-weight: 700;">(Flota o Externo)</span>
                        </label>
                        <select id="req_vehicle_sel_${s.project_id}" onchange="onReqVehicleChanged(${s.project_id})" class="form-select" style="font-size: 11px; padding: 5px 8px; background: white; margin-bottom: 4px;">
                            ${v}
                        </select>
                        <div style="display: flex; gap: 6px;">
                            <input type="text" id="req_plate_${s.project_id}" value="${E}" placeholder="Placa (ej: A12BC3D)" class="form-input" style="font-size: 11px; padding: 4px 6px; font-weight: 700; width: 45%;" title="Placa del vehículo">
                            <input type="text" id="req_vehicle_model_${s.project_id}" value="${I}" placeholder="Modelo / Marca" class="form-input" style="font-size: 11px; padding: 4px 6px; width: 55%;" title="Modelo del vehículo">
                        </div>
                    </div>
                    <div>
                        <label style="font-size: 11px; font-weight: 800; color: #0369a1; display: flex; align-items: center; justify-content: space-between; margin-bottom: 3px;">
                            <span><i class="fa-solid fa-id-card"></i> Chofer Asignado al Traslado</span>
                            <span style="font-size: 9.5px; color: #0284c7; font-weight: 700;">(DALOR o Externo)</span>
                        </label>
                        <select id="req_driver_sel_${s.project_id}" onchange="onReqDriverChanged(${s.project_id})" class="form-select" style="font-size: 11px; padding: 5px 8px; background: white; margin-bottom: 4px;">
                            ${_}
                        </select>
                        <div style="display: flex; gap: 6px;">
                            <input type="text" id="req_driver_${s.project_id}" value="" placeholder="Nombre del Chofer" class="form-input" style="font-size: 11px; padding: 4px 6px; font-weight: 700; width: 60%;" title="Nombre del chofer">
                            <input type="text" id="req_driver_ci_${s.project_id}" value="" placeholder="C.I. / Cédula" class="form-input" style="font-size: 11px; padding: 4px 6px; font-weight: 700; width: 40%;" title="Cédula de identidad">
                        </div>
                    </div>
                    <div>
                        <label style="font-size: 11px; font-weight: 800; color: #0369a1; display: block; margin-bottom: 3px;">
                            <i class="fa-solid fa-note-sticky"></i> Observaciones de Despacho & Precinto
                        </label>
                        <textarea id="req_notes_${s.project_id}" rows="2" placeholder="Ej: Material verificado en pañol para traslado de obra." class="form-input" style="font-size: 11px; padding: 5px 8px; background: white; resize: none;"></textarea>
                    </div>
                </div>
            `}p+=`
            <div class="card" style="border: 1px solid #cbd5e1; border-radius: 10px; padding: 14px 18px; background: white; box-shadow: 0 1px 3px rgba(0,0,0,0.05); margin-bottom: 16px;">
                <!-- Header de Obra -->
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
                    <div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span style="background: ${y?"#0284c7":"#1e3a8a"}; color: white; font-weight: 800; font-size: 11px; padding: 3px 8px; border-radius: 6px; letter-spacing: 0.5px;">
                                <i class="${y?"fa-solid fa-warehouse":"fa-solid fa-building"}"></i> ${s.project_code}
                            </span>
                            <h4 style="font-size: 15px; font-weight: 800; color: #0f172a; margin: 0;">${s.project_name}</h4>
                            <span style="font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 4px; ${y?"background: #dcfce7; color: #15803d;":"background: #e0f2fe; color: #0369a1;"}">
                                ${y?"🏢 Sede Central":"📍 Obra Foránea (Traslado Externo)"}
                            </span>
                        </div>
                    </div>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <span style="font-size: 11px; font-weight: 700; color: #475569; background: #f1f5f9; padding: 4px 10px; border-radius: 6px;">
                            ${s.items.length} insumos en lista (${m} pendientes)
                        </span>
                    </div>
                </div>

                <!-- Datos de Despacho & Logística para esta Obra -->
                ${h}

                <!-- Tabla de Insumos Requeridos -->
                <div style="overflow-x: auto; border: 1px solid #e2e8f0; border-radius: 8px;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 11.5px; text-align: left;">
                        <thead>
                            <tr style="background: #f8fafc; color: #475569; font-weight: 700; border-bottom: 1px solid #e2e8f0;">
                                <th style="padding: 8px 10px; width: 36px; text-align: center;">
                                    <input type="checkbox" onchange="toggleSelectAllProjectReqs(${s.project_id}, this.checked)" title="Seleccionar todos con stock">
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
                            ${s.items.map(c=>{const w=(c.quantity_pending||0)<=0||c.status==="despachado",x=c.stock_available||0,$=x<=0,b=w||$,E=b?0:Math.min(c.quantity_pending,x),I=$?'<span style="background: #fee2e2; color: #b91c1c; padding: 2px 7px; border-radius: 4px; font-weight: 800; font-size: 10.5px;"><i class="fa-solid fa-ban"></i> 0.00 (SIN STOCK)</span>':c.has_enough_stock?`<span style="background: #dcfce7; color: #15803d; padding: 2px 7px; border-radius: 4px; font-weight: 700; font-size: 10.5px;"><i class="fa-solid fa-circle-check"></i> ${x.toFixed(2)} ${c.unit_measure}</span>`:`<span style="background: #fef3c7; color: #b45309; padding: 2px 7px; border-radius: 4px; font-weight: 700; font-size: 10.5px;"><i class="fa-solid fa-triangle-exclamation"></i> ${x.toFixed(2)} ${c.unit_measure} (Parcial)</span>`;return`
                                    <tr style="border-bottom: 1px solid #f1f5f9; ${w?"background: #f8fafc; opacity: 0.65;":""} ${$&&!w?"background: #fff1f2;":""}">
                                        <td style="padding: 8px 10px; text-align: center;">
                                            <input type="checkbox" class="req-check-${s.project_id}" data-req-id="${c.id}" data-project-id="${s.project_id}" data-stock="${x}" data-pending="${c.quantity_pending}" ${b?"":"checked"} ${b?"disabled":""}>
                                        </td>
                                        <td style="padding: 8px 10px; font-family: monospace; font-weight: 700; color: #334155;">
                                            ${c.material_code}
                                        </td>
                                        <td style="padding: 8px 10px;">
                                            <div style="font-weight: 600; color: #0f172a; display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                                                ${c.resource_type==="herramienta"?'<span class="badge-tag" style="background:#e0e7ff; color:#3730a3; font-size:9.5px;"><i class="fa-solid fa-wrench"></i> Herramienta</span>':c.resource_type==="maquinaria"?'<span class="badge-tag" style="background:#ffedd5; color:#9a3412; font-size:9.5px;"><i class="fa-solid fa-tractor"></i> Maquinaria</span>':c.resource_type==="vehiculo"?'<span class="badge-tag" style="background:#fef3c7; color:#92400e; font-size:9.5px;"><i class="fa-solid fa-truck-pickup"></i> Vehículo</span>':'<span class="badge-tag" style="background:#f0fdf4; color:#166534; font-size:9.5px;"><i class="fa-solid fa-boxes-stacked"></i> Material</span>'}
                                                <span>${c.material_name}</span>
                                            </div>
                                            ${c.notes?`<span style="font-size: 10px; color: #64748b;">Nota: ${c.notes}</span>`:""}
                                        </td>
                                        <td style="padding: 8px 10px; text-align: center; font-weight: 600;">
                                            ${(c.quantity_required||0).toFixed(2)} ${c.unit_measure}
                                        </td>
                                        <td style="padding: 8px 10px; text-align: center; color: #059669; font-weight: 600;">
                                            ${(c.quantity_dispatched||0).toFixed(2)} ${c.unit_measure}
                                        </td>
                                        <td style="padding: 8px 10px; text-align: center; font-weight: 800; color: ${w?"#10b981":"#e11d48"};">
                                            ${w?"0.00 (Listo)":`${(c.quantity_pending||0).toFixed(2)} ${c.unit_measure}`}
                                        </td>
                                        <td style="padding: 8px 10px; text-align: center;">
                                            ${I}
                                        </td>
                                        <td style="padding: 8px 10px; text-align: center;">
                                            <input type="number" step="0.01" min="0" max="${Math.min(c.quantity_pending,x)}" id="req_qty_${c.id}" value="${E}" oninput="onReqQtyChanged(${c.id}, ${c.quantity_pending}, ${x})" class="form-input" style="font-size: 11.5px; padding: 4px 6px; text-align: center; width: 100px; font-weight: 700; ${$?"background-color: #f1f5f9; color: #94a3b8; cursor: not-allowed;":""}" ${b?"disabled":""}>
                                            <div id="req_warn_${c.id}" style="${E<c.quantity_pending&&E>0?"":"display: none;"}">
                                                ${E<c.quantity_pending&&E>0?`<span style="color: #b45309; background: #fef3c7; border: 1px solid #fde68a; padding: 2px 6px; border-radius: 4px; font-size: 9.5px; font-weight: 700; display: inline-block; margin-top: 3px;">⚠️ Parcial: Quedan ${(c.quantity_pending-E).toFixed(2)} por stock</span>`:""}
                                            </div>
                                        </td>
                                        <td style="padding: 8px 10px; text-align: center;">
                                            ${w?'<span class="badge-tag" style="background:#e2e8f0; color:#475569; font-size:10px;">Completado</span>':$?`
                                                <div style="display: flex; flex-direction: column; gap: 3px; align-items: center;">
                                                    <span style="color: #ef4444; font-size: 9.5px; font-weight: 800;"><i class="fa-solid fa-ban"></i> Sin Stock</span>
                                                    <button type="button" onclick="closeModal('modalProjectRequisitionsInbox'); openSubstituteMaterialModal(${c.id}, ${c.material_id||0}, '${(c.material_name||"").replace(/'/g,"\\'")}', ${s.project_id})" class="btn-secondary" style="font-size: 9px; padding: 2px 6px; background: #fef3c7; color: #b45309; border-color: #fde68a; font-weight: 800;" title="Sustituir por otro insumo con inventario">
                                                        <i class="fa-solid fa-shuffle"></i> Sustituir
                                                    </button>
                                                    <button type="button" onclick="closeModal('modalProjectRequisitionsInbox'); openNewPayableModal(); setTimeout(() => { const pSel = document.getElementById('new_cxp_project_id'); if (pSel) pSel.value = '${s.project_id}'; const desc = document.getElementById('new_cxp_description'); if (desc) desc.value = 'Compra urgente de ${(c.material_name||"").replace(/'/g,"\\'")} para obra ${s.project_code}'; }, 200);" class="btn-secondary" style="font-size: 9px; padding: 2px 6px; background: #eff6ff; color: #1d4ed8; border-color: #bfdbfe; font-weight: 800;" title="Cargar CxP / Orden de Compra para este material">
                                                        <i class="fa-solid fa-cart-shopping"></i> Comprar
                                                    </button>
                                                </div>
                                              `:`
                                                <button type="button" onclick="quickDispatchSingleRequisition(${c.id}, ${s.project_id})" class="btn-secondary" style="font-size: 10px; padding: 3px 8px; border-radius: 4px; background: #e0f2fe; color: #0369a1; border-color: #bae6fd; font-weight: 700;" title="Despachar solo este ítem ahora">
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
                    <button type="button" onclick="submitDispatchProjectGroup(${s.project_id})" class="btn-primary" style="${y?"background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);":"background: linear-gradient(135deg, #059669 0%, #047857 100%);"} font-weight: 800; font-size: 12px; padding: 8px 18px; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        ${y?'<i class="fa-solid fa-clipboard-check"></i> Entregar Ítems en Taller y Emitir Vale de Control Interno':'<i class="fa-solid fa-truck-ramp-box"></i> Despachar Ítems Marcados y Emitir Guía de Traslado'} (${s.project_code})
                    </button>
                </div>
            </div>
        `}),p+=`
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin-top: 14px; flex-wrap: wrap; gap: 10px;">
            <div style="font-size: 12px; font-weight: 600; color: #475569;">
                Mostrando obras <span style="font-weight: 800; color: #0f172a;">${l+1} - ${Math.min(i,l+S)}</span> de <span style="font-weight: 800; color: #0f172a;">${i}</span> con requerimientos
            </div>
            <div style="display: flex; gap: 6px; align-items: center;">
                <button type="button" onclick="goToReqPage(${B-1})" class="btn-secondary" style="padding: 4px 10px; font-size: 11px;" ${B<=1?'disabled style="opacity: 0.5; cursor: not-allowed;"':""}>
                    <i class="fa-solid fa-chevron-left"></i> Anterior
                </button>
                <span style="font-size: 11.5px; font-weight: 700; color: #1e293b; padding: 0 8px;">
                    Página ${B} de ${r}
                </span>
                <button type="button" onclick="goToReqPage(${B+1})" class="btn-secondary" style="padding: 4px 10px; font-size: 11px;" ${B>=r?'disabled style="opacity: 0.5; cursor: not-allowed;"':""}>
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
    `,o.innerHTML=p}function Se(e){B=e,X(K,!1)}function Te(e){S=parseInt(e)||3,B=1,X(K,!1)}function je(e,t,o){const a=document.getElementById(`req_qty_${e}`),n=document.getElementById(`req_warn_${e}`);if(!a)return;let i=parseFloat(a.value)||0;if(i<0&&(i=0,a.value=0),i>t&&(alert(`⚠️ La cantidad a despachar (${i}) no puede ser mayor a lo solicitado (Saldo pendiente: ${t}). Se ajustó automáticamente.`),i=t,a.value=t),i>o&&(alert(`⚠️ Stock insuficiente en almacén/pañol: Solo hay ${o} unidades disponibles.`),i=o,a.value=o),n)if(i<t&&i>0){const r=(t-i).toFixed(2);n.style.display="block",n.innerHTML=`<span style="color: #b45309; background: #fef3c7; border: 1px solid #fde68a; padding: 2px 6px; border-radius: 4px; font-size: 9.5px; font-weight: 700; display: inline-block; margin-top: 3px;">⚠️ Entrega parcial: Quedarán ${r} pendientes por inventario.</span>`}else i===0?(n.style.display="block",n.innerHTML='<span style="color: #dc2626; background: #fee2e2; border: 1px solid #fecaca; padding: 2px 6px; border-radius: 4px; font-size: 9.5px; font-weight: 700; display: inline-block; margin-top: 3px;">⛔ Cantidad 0: No se incluirá en el traslado.</span>'):n.style.display="none"}function De(e,t){document.querySelectorAll(`.req-check-${e}`).forEach(o=>{o.disabled||(o.checked=t)})}async function Pe(e){var u,f,y,h,c,w,x,$;const t=document.querySelectorAll(`.req-check-${e}:checked`);if(!t||t.length===0){alert("⚠️ Por favor selecciona al menos un insumo disponible de la lista para despachar.");return}const o=[];let a=!1;for(const b of t){const E=parseInt(b.getAttribute("data-req-id")),I=parseFloat(b.getAttribute("data-stock")||0),v=parseFloat(b.getAttribute("data-pending")||0),C=document.getElementById(`req_qty_${E}`),_=parseFloat((C==null?void 0:C.value)||0);if(I<=0){alert("⛔ No se puede despachar un ítem con stock 0 en almacén."),C&&C.focus();return}if(_<=0){alert("⚠️ La cantidad a despachar para los ítems seleccionados debe ser mayor a 0."),C&&C.focus();return}if(_>v){alert(`⚠️ La cantidad a despachar (${_}) no puede ser mayor a lo solicitado (${v}).`),C&&C.focus();return}if(_>I){alert(`⚠️ Stock insuficiente: Solicitas ${_} pero solo hay ${I} en almacén.`),C&&C.focus();return}_<v&&(a=!0),o.push({requisition_id:E,quantity_to_dispatch:_})}const n=((u=document.getElementById(`req_is_internal_${e}`))==null?void 0:u.value)==="1";let i=null,r=null,l=null,d=null,p=null;if(!n&&(i=(((f=document.getElementById(`req_driver_${e}`))==null?void 0:f.value)||"").trim(),r=(((y=document.getElementById(`req_driver_ci_${e}`))==null?void 0:y.value)||"").trim(),l=(((h=document.getElementById(`req_plate_${e}`))==null?void 0:h.value)||"").trim(),d=(((c=document.getElementById(`req_vehicle_model_${e}`))==null?void 0:c.value)||"").trim(),p=(w=document.getElementById(`req_vehicle_sel_${e}`))==null?void 0:w.value,!i)){alert("⚠️ Para despachos a Obra Foránea, por favor ingresa o selecciona el Chofer / Conductor asignado."),(x=document.getElementById(`req_driver_${e}`))==null||x.focus();return}const s=((($=document.getElementById(`req_notes_${e}`))==null?void 0:$.value)||"").trim();let m=n?`¿Confirmas la entrega interna de ${o.length} insumo(s) para los trabajos en Taller Guacara?

Se emitirá el Vale de Control Interno de Almacén.`:`¿Confirmas el despacho de ${o.length} insumo(s) para la Obra Foránea?

Se descontará el stock en Almacén y se emitirá la Guía Oficial de Traslado.`;if(a&&(m+=`

⚠️ ADVERTENCIA: Uno o más ítems tienen una entrega menor a lo solicitado por disponibilidad de inventario. El resto quedará como saldo pendiente en la obra.`),!!confirm(m))try{const b={project_id:e,items:o,is_internal:n,driver_name:i,driver_id_doc:r,vehicle_plate:l,vehicle_model:d,asset_id:p&&p!=="externo"&&!isNaN(parseInt(p))?parseInt(p):null,notes:s},E=await k(`${q}/materials/dispatch-project-requisition`,{method:"POST",body:JSON.stringify(b)});if(E.ok){const I=await E.json();await O(),await T(),await G(e);const v=I.guide_number;confirm(`✅ ${I.message||"Despacho registrado exitosamente."}

Se ha emitido el documento N°: ${v}

¿Deseas abrir la Guía en pantalla completa ahora?`)&&typeof window.navigateToDispatchGuide=="function"&&(typeof closeModal=="function"&&closeModal("modalProjectRequisitionsInbox"),window.navigateToDispatchGuide(v))}else{const I=await E.json();alert("❌ Error al procesar despacho: "+(I.detail||JSON.stringify(I)))}}catch(b){console.error("Error submitting project requisition dispatch:",b),alert("❌ Error de comunicación: "+b.message)}}async function ze(e,t){var h,c,w,x,$,b,E,I;const o=document.getElementById(`req_qty_${e}`),a=parseFloat((o==null?void 0:o.value)||0),n=document.querySelector(`.req-check-${t}[data-req-id="${e}"]`),i=parseFloat((n==null?void 0:n.getAttribute("data-stock"))||0),r=parseFloat((n==null?void 0:n.getAttribute("data-pending"))||0);if(i<=0){alert("⛔ No se puede despachar: Stock disponible en almacén es 0.");return}if(a<=0){alert("⚠️ Ingresa una cantidad válida mayor a 0 para despachar."),o&&o.focus();return}if(a>r){alert(`⚠️ La cantidad a despachar (${a}) no puede ser mayor a lo solicitado (${r}).`),o&&o.focus();return}if(a>i){alert(`⚠️ Stock insuficiente: Requieres ${a} pero solo hay ${i} en pañol.`),o&&o.focus();return}const l=((h=document.getElementById(`req_is_internal_${t}`))==null?void 0:h.value)==="1";let d=null,p=null,s=null,m=null,u=null;if(!l&&(d=(((c=document.getElementById(`req_driver_${t}`))==null?void 0:c.value)||"").trim(),p=(((w=document.getElementById(`req_driver_ci_${t}`))==null?void 0:w.value)||"").trim(),s=(((x=document.getElementById(`req_plate_${t}`))==null?void 0:x.value)||"").trim(),m=((($=document.getElementById(`req_vehicle_model_${t}`))==null?void 0:$.value)||"").trim(),u=(b=document.getElementById(`req_vehicle_sel_${t}`))==null?void 0:b.value,!d)){alert("⚠️ Para despachos a Obra Foránea, por favor ingresa o selecciona el Chofer / Conductor asignado."),(E=document.getElementById(`req_driver_${t}`))==null||E.focus();return}const f=(((I=document.getElementById(`req_notes_${t}`))==null?void 0:I.value)||"").trim();let y=l?`¿Confirmas la entrega rápida de este insumo (${a} unidades) en Taller Guacara?
Se generará el Vale de Control Interno.`:`¿Confirmas el despacho rápido de este insumo (${a} unidades) para la Obra Foránea?
Se generará la Guía Oficial de Traslado.`;if(a<r&&(y+=`

⚠️ ADVERTENCIA: La cantidad a entregar (${a}) es menor a lo solicitado (${r}) por inventario. Quedarán ${(r-a).toFixed(2)} pendientes.`),!!confirm(y))try{const v={project_id:t,items:[{requisition_id:e,quantity_to_dispatch:a}],is_internal:l,driver_name:d,driver_id_doc:p,vehicle_plate:s,vehicle_model:m,asset_id:u&&u!=="externo"&&!isNaN(parseInt(u))?parseInt(u):null,notes:f},C=await k(`${q}/materials/dispatch-project-requisition`,{method:"POST",body:JSON.stringify(v)});if(C.ok){const _=await C.json();await O(),await T(),await G(t);const g=_.guide_number;confirm(`✅ Despacho procesado exitosamente.

Se ha emitido la Guía Oficial N°: ${g}

¿Deseas ver la Guía de Despacho ahora?`)&&typeof window.navigateToDispatchGuide=="function"&&(typeof closeModal=="function"&&closeModal("modalProjectRequisitionsInbox"),window.navigateToDispatchGuide(g))}else{const _=await C.json();alert("❌ Error: "+(_.detail||JSON.stringify(_)))}}catch(v){console.error("Error in quick dispatch:",v),alert("❌ Error de comunicación: "+v.message)}}function Ae(e){const t=(M||[]).find(d=>d.id===e);if(!t)return alert("Material no encontrado");const o=document.getElementById("calib_mat_id");o&&(o.value=t.id);const a=document.getElementById("calib_mat_display");a&&(a.value=`[${t.code}] ${t.name}`);const n=document.getElementById("calib_mat_current_stock");n&&(n.value=`${t.stock_quantity} ${t.unit_measure}`);const i=document.getElementById("calib_mat_new_stock");i&&(i.value=t.stock_quantity);const r=document.getElementById("calib_mat_reason");r&&(r.value="");const l=document.getElementById("calib_mat_password");l&&(l.value=""),typeof openModal=="function"&&openModal("modalCalibrateMaterial")}async function Re(e){var i,r,l,d,p;e&&e.preventDefault();const t=(i=document.getElementById("calib_mat_id"))==null?void 0:i.value,o=parseFloat((r=document.getElementById("calib_mat_new_stock"))==null?void 0:r.value),a=((d=(l=document.getElementById("calib_mat_reason"))==null?void 0:l.value)==null?void 0:d.trim())||"",n=((p=document.getElementById("calib_mat_password"))==null?void 0:p.value)||"";if(!t)return alert("Error: ID del material no identificado.");if(isNaN(o)||o<0)return alert("Ingrese un nuevo stock válido mayor o igual a 0.");if(!a)return alert("Debe indicar la justificación o motivo del ajuste físico.");if(!n)return alert("Debe ingresar su contraseña para autorizar la calibración.");try{const s=await k(`${q}/materials/${t}/calibrate`,{method:"PUT",body:JSON.stringify({new_stock_quantity:o,new_stock:o,reason:a,director_password:n})});if(!s.ok){const u=await s.json().catch(()=>({detail:"Error al calibrar stock"}));throw new Error(u.detail||"Error al calibrar stock")}const m=await s.json();alert(`✅ Stock calibrado exitosamente: nuevo stock ${m.new_stock}`),typeof closeModal=="function"&&closeModal("modalCalibrateMaterial"),T()}catch(s){console.error("Error calibrating material:",s),alert(`❌ Error: ${s.message||s}`)}return!1}typeof window<"u"&&(window.addMaterialDeliveryRow=A,window.calcMaterialConsumeTotal=Q,window.calcMaterialEntryTotal=F,window.filterMaterialsTable=te,window.filterTransferToolsChecklist=Me,window.loadMaterialsList=T,window.onConsumeMaterialSelected=J,window.onMaterialDeliveryProjectChanged=re,window.onTransferGuideProjectChanged=Ie,window.openMaterialConsumeModal=_e,window.openMaterialDeliveryModal=qe,window.openMaterialEntryModal=he,window.openNewMaterialModal=oe,window.openTransferGuideModal=Ee,window.renderInitialMaterialDeliveryRows=le,window.renderMaterialsTable=H,window.goToMaterialsPage=ue,window.changeMaterialsPageSize=me,window.renderMaterialsTablePaginated=L,window.renderTransferToolsChecklist=W,window.submitCreateMaterial=ye,window.submitGenerateMaterialDeliveryGuide=ke,window.submitGenerateTransferGuide=Ce,window.submitMaterialConsume=$e,window.submitMaterialEntry=we,window.addMaterialEntryRow=U,window.removeMaterialEntryRow=xe,window.onEntryMaterialRowChanged=ae,window.filterEntryRowDropdown=be,window.filterConsumeMaterialDropdown=ve,window.onConsumeProjectChanged=ie,window.toggleMaterialEntryPaymentBox=ne,window.onNewMaterialCategoryChanged=fe,window.populateMaterialCategories=N,window.openNewMaterialModalFromCxp=ge,window.loadProjectRequisitionsBadge=O,window.openProjectRequisitionsInboxModal=Be,window.loadProjectRequisitionsInbox=G,window.filterProjectRequisitionsView=de,window.toggleSelectAllProjectReqs=De,window.submitDispatchProjectGroup=Pe,window.quickDispatchSingleRequisition=ze,window.goToReqPage=Se,window.changeReqPageSize=Te,window.onReqQtyChanged=je,window.onReqVehicleChanged=se,window.onReqDriverChanged=ce,window.openCalibrateMaterialModal=Ae,window.submitCalibrateMaterial=Re,window.openEditMaterialModal=Le,window.submitEditMaterial=Ne);async function Le(e){const o=(window.allMaterials&&window.allMaterials.length>0?window.allMaterials:M||[]).find(m=>m.id===e);if(!o){alert("Material no encontrado en catálogo.");return}const a=document.getElementById("edit_mat_id"),n=document.getElementById("edit_mat_code"),i=document.getElementById("edit_mat_name"),r=document.getElementById("edit_mat_category"),l=document.getElementById("edit_mat_unit"),d=document.getElementById("edit_mat_min_stock"),p=document.getElementById("edit_mat_unit_cost"),s=document.getElementById("edit_mat_location");a&&(a.value=o.id),n&&(n.value=o.code||""),i&&(i.value=o.name||""),r&&(r.value=o.category||"Acero Estructural"),l&&(l.value=(o.unit_measure||"UND").toUpperCase()),d&&(d.value=o.min_stock_alert!==void 0?o.min_stock_alert:5),p&&(p.value=o.unit_cost_usd?Number(o.unit_cost_usd).toFixed(2):"0.00"),s&&(s.value=o.location||""),openModal("modalEditMaterial")}async function Ne(e){var n,i,r,l,d,p,s;e&&(typeof e.preventDefault=="function"&&e.preventDefault(),typeof e.stopPropagation=="function"&&e.stopPropagation());const t=(n=document.getElementById("edit_mat_id"))==null?void 0:n.value;if(!t)return;const o={name:(((i=document.getElementById("edit_mat_name"))==null?void 0:i.value)||"").trim(),category:(((r=document.getElementById("edit_mat_category"))==null?void 0:r.value)||"").trim(),unit_measure:(((l=document.getElementById("edit_mat_unit"))==null?void 0:l.value)||"").trim().toUpperCase(),min_stock_alert:parseFloat((d=document.getElementById("edit_mat_min_stock"))==null?void 0:d.value)||0,unit_cost_usd:parseFloat((p=document.getElementById("edit_mat_unit_cost"))==null?void 0:p.value)||0,location:(((s=document.getElementById("edit_mat_location"))==null?void 0:s.value)||"").trim()};if(!o.name){alert("Por favor ingrese el nombre del material.");return}const a=document.getElementById("btnSubmitEditMaterial");a&&(a.disabled=!0,a.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Guardando...');try{const m=await k(`${q}/materials/${t}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(o)});if(!m.ok){const u=await m.json();throw new Error(u.detail||"Error al actualizar material")}closeModal("modalEditMaterial"),typeof showToastNotification=="function"?showToastNotification("✅ Ficha de material actualizada correctamente.","success"):alert("✅ Material actualizado con éxito."),await T()}catch(m){alert("Error al actualizar material: "+m.message)}finally{a&&(a.disabled=!1,a.innerHTML='<i class="fa-solid fa-floppy-disk"></i> Guardar Cambios')}}
