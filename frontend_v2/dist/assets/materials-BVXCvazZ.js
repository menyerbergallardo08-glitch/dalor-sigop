var R=window.API_BASE||window.location.origin+"/api/v1",B=window.allMaterials=window.allMaterials||[];window.allProjects=window.allProjects||[];window.allCategories=window.allCategories||[];window.allAssets=window.allAssets||[];window.allPersonnel=window.allPersonnel||[];function F(o,t={}){const e=sessionStorage.getItem("dalor_token")||localStorage.getItem("dalor_token")||window.authToken||"",a={...t.headers||{}};return e&&(a.Authorization="Bearer "+e),t.body&&!(t.body instanceof FormData)&&!a["Content-Type"]&&(a["Content-Type"]="application/json"),t.body instanceof FormData&&delete a["Content-Type"],window.fetch(o,{...t,headers:a})}function ne(){const o=window.currentUser||JSON.parse(localStorage.getItem("dalor_user")||"null")||{},t=(o.role_name||o.role||o.username||"").toLowerCase();return t.includes("director")||t.includes("admin")}async function K(){const o=document.getElementById("materialsTableBody");if(!o)return;const t=ne(),e=t?9:7;o.innerHTML=`<tr><td colspan="${e}" style="text-align: center; padding: 20px; color: #94a3b8;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando inventario de materiales...</td></tr>`;try{const n=await(await F(`${R}/materials/`)).json();B=n.materials||(Array.isArray(n)?n:[]);const i=document.getElementById("matTotalItemsCount"),r=document.getElementById("matTotalValuationCard"),l=document.getElementById("matTotalValuationUsd");if(i&&(i.innerText=n.total_items!==void 0?n.total_items:B.length),r&&(r.style.display=t?"inline-block":"none"),l&&t){const s=n.total_inventory_usd!==void 0?n.total_inventory_usd:B.reduce((c,d)=>c+(d.stock_quantity*d.unit_cost_usd||0),0);l.innerText=`$${s.toLocaleString("en-US",{minimumFractionDigits:2})} USD`}document.querySelectorAll(".director-cost-col").forEach(s=>{s.style.display=t?"":"none"}),Y(B);try{N()}catch(s){console.warn("Error populating material categories:",s)}loadProjectRequisitionsBadge();try{typeof populateSelectDropdowns=="function"&&populateSelectDropdowns()}catch(s){console.warn("Dropdown populator warning:",s)}}catch(a){console.error("Error loading materials:",a),o.innerHTML=`<tr><td colspan="${e}" style="text-align: center; color: #e11d48; padding: 20px;">Error al cargar inventario de materiales: ${a.message}</td></tr>`}}let ie=[],j=1,re=15;function xe(o){j=o,L();const t=document.getElementById("materialsTableBody");t&&t.scrollIntoView({behavior:"smooth",block:"nearest"})}function we(o){re=parseInt(o)||15,j=1,L()}function Y(o){ie=Array.isArray(o)?o:B||[],j=1,L()}function L(){const o=document.getElementById("materialsTableBody");if(!o)return;const t=ne(),e=t?9:7,a=ie||[];if(a.length===0){o.innerHTML=`<tr><td colspan="${e}" style="text-align: center; padding: 20px; color: #94a3b8;">No se encontraron materiales registrados.</td></tr>`;const s=document.getElementById("materialsPaginationContainer");s&&(s.innerHTML="");return}const{startIndex:n,endIndex:i,currentPage:r}=(typeof window.renderPaginationControls=="function"?window.renderPaginationControls:renderPaginationControls)({containerId:"materialsPaginationContainer",totalItems:a.length,currentPage:j,pageSize:re,onPageChange:"goToMaterialsPage",onPageSizeChange:"changeMaterialsPageSize",itemLabel:"material(es) en catálogo",pageSizeOptions:[15,30,60,120]});j=r;const l=a.slice(n,i);o.innerHTML=l.map(s=>{const c=s.is_low_stock||s.stock_quantity<=s.min_stock_alert,d=Number(s.unit_cost_usd||0),m=Number(s.total_cost_usd||s.stock_quantity*d||0);return`
        <tr>
            <td style="font-weight: 800; color: var(--dalor-blue); font-family: monospace;">${s.code}</td>
            <td style="font-weight: 700; color: var(--dalor-navy);">${s.name}</td>
            <td><span style="font-size: 10px; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-weight: 700; color: #475569;">${s.category}</span></td>
            <td style="text-align: center; font-weight: 700;">${s.unit_measure}</td>
            <td style="text-align: center;">
                <span style="font-weight: 800; font-size: 13px; color: ${c?"#e11d48":"#059669"};">
                    ${(["und","unid","unidad","unidades","pza","pieza","piezas","rollo","rollos"].includes((s.unit_measure||"").toLowerCase())?Math.round(s.stock_quantity):Number((s.stock_quantity||0).toFixed(2))).toLocaleString()} ${s.unit_measure}
                </span>
                ${c?'<span style="display: block; font-size: 9px; color: #dc2626; font-weight: 800;">⚠️ STOCK CRÍTICO</span>':""}
            </td>
            <td style="text-align: center; color: #64748b; font-size: 11px;">${s.min_stock_alert} ${s.unit_measure}</td>
            ${t?`
                <td style="text-align: right; font-weight: 700; color: #0284c7;">$${d.toLocaleString("en-US",{minimumFractionDigits:2})}</td>
                <td style="text-align: right; font-weight: 900; color: var(--dalor-navy);">$${m.toLocaleString("en-US",{minimumFractionDigits:2})}</td>
            `:""}
            <td style="text-align: center; white-space: nowrap;">
                <button onclick="openMaterialEntryModal(${s.id})" class="btn-primary" style="padding: 3px 8px; font-size: 11px; background: #059669;" title="Registrar Entrada / Compra">
                    <i class="fa-solid fa-plus"></i> Entrada
                </button>
                <button onclick="openMaterialConsumeModal(${s.id})" class="btn-primary" style="padding: 3px 8px; font-size: 11px; background: #0284c7; margin-left: 4px;" title="Despachar a Obra o Taller">
                    <i class="fa-solid fa-arrow-right-from-bracket"></i> Despachar
                </button>
                <button onclick="openEditMaterialModal(${s.id})" class="btn-secondary" style="padding: 3px 8px; font-size: 11px; margin-left: 4px; color: #0284c7; border-color: #bae6fd;" title="Editar Ficha del Material">
                    <i class="fa-solid fa-pen-to-square"></i> Editar
                </button>
                <button onclick="openCalibrateMaterialModal(${s.id})" class="btn-secondary" style="padding: 3px 8px; font-size: 11px; margin-left: 4px; color: #7c3aed; border-color: #c4b5fd;" title="Calibrar / Ajustar Stock con Clave de Director">
                    <i class="fa-solid fa-key"></i> Calibrar
                </button>
            </td>
        </tr>`}).join("")}function le(){var a,n;const o=(((a=document.getElementById("filterMaterialSearch"))==null?void 0:a.value)||"").toLowerCase(),t=((n=document.getElementById("filterMaterialCategory"))==null?void 0:n.value)||"",e=B.filter(i=>{const r=!o||i.name.toLowerCase().includes(o)||i.code.toLowerCase().includes(o),l=!t||i.category===t;return r&&l});Y(e)}function N(){const o=["Planchas de Acero","Acero Estructural","Perfiles y Vigas","Tuberías y Bridas","Soldadura y Gases","Abrasivos y Discos","Tornillería y Fijaciones","Pinturas y Recubrimientos","Consumibles de Almacén"],t=(B||[]).map(i=>(i.category||"").trim()).filter(i=>i&&i.length>0),e=Array.from(new Set([...o,...t])).sort((i,r)=>i.localeCompare(r,"es")),a=document.getElementById("filterMaterialCategory");if(a){const i=a.value;a.innerHTML=`<option value="">-- Todas las Categorías (${e.length}) --</option>`+e.map(r=>`<option value="${r}">${r}</option>`).join(""),i&&e.includes(i)&&(a.value=i)}const n=document.getElementById("nmat_category");if(n){const i=n.value;n.innerHTML=e.map(r=>`<option value="${r}">${r}</option>`).join("")+'<option value="__NEW__" style="font-weight: bold; color: #2563eb;">➕ Crear Nueva Categoría...</option>',i&&(e.includes(i)||i==="__NEW__")&&(n.value=i)}}function be(){const o=document.getElementById("nmat_category"),t=document.getElementById("nmat_category_custom");!o||!t||(o.value==="__NEW__"?(t.classList.remove("hidden"),t.style.display="block",t.required=!0,t.focus()):(t.classList.add("hidden"),t.style.display="none",t.required=!1,t.value=""))}function se(o=!1){var a;o&&(window.openedMaterialModalFromCxp=!0);const t=document.getElementById("modalNewMaterial");t&&(t.style.zIndex="2200"),(a=document.getElementById("newMaterialForm"))==null||a.reset(),N();const e=document.getElementById("nmat_category_custom");e&&(e.classList.add("hidden"),e.style.display="none",e.required=!1,e.value=""),openModal("modalNewMaterial")}function he(){se(!0)}async function _e(o){var a,n;o.preventDefault();let t=document.getElementById("nmat_category").value;if(t==="__NEW__"&&(t=(((a=document.getElementById("nmat_category_custom"))==null?void 0:a.value)||"").trim(),!t)){alert("⚠️ Por favor ingresa el nombre de la nueva categoría."),(n=document.getElementById("nmat_category_custom"))==null||n.focus();return}const e={code:document.getElementById("nmat_code").value.trim().toUpperCase(),name:document.getElementById("nmat_name").value.trim(),category:t,unit_measure:document.getElementById("nmat_unit").value,stock_quantity:parseFloat(document.getElementById("nmat_stock").value)||0,min_stock_alert:parseFloat(document.getElementById("nmat_alert").value)||5,unit_cost_usd:parseFloat(document.getElementById("nmat_cost").value)||0,location:document.getElementById("nmat_location").value.trim()||"Almacén Central Dalor"};try{const i=await F(`${R}/materials/`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)});if(i.ok){const r=await i.json().catch(()=>({}));closeModal("modalNewMaterial"),await K(),N();const l=document.getElementById("filterMaterialSearch");l&&(l.value=e.code||r.code||"",le()),window.openedMaterialModalFromCxp?(window.openedMaterialModalFromCxp=!1,typeof window.onMaterialCreatedFromCxp=="function"&&window.onMaterialCreatedFromCxp(r)):alert(`✅ Material [${e.code}] "${e.name}" creado con éxito en categoría "${t}".`)}else{const r=await i.json().catch(()=>({}));alert("Error: "+(r.detail||JSON.stringify(r)))}}catch(i){alert("Error de conexión al crear material: "+i.message)}}async function ve(o){let e=(window.allMaterials&&window.allMaterials.length>0?window.allMaterials:B||[]).find(m=>m&&(m.id==o||String(m.id)===String(o)));if(!e&&o)try{const m=await F(`${R}/materials/${o}`);m.ok&&(e=await m.json())}catch{}if(!e){alert("Material no encontrado en catálogo.");return}const a=document.getElementById("edit_mat_id"),n=document.getElementById("edit_mat_code"),i=document.getElementById("edit_mat_name"),r=document.getElementById("edit_mat_category"),l=document.getElementById("edit_mat_unit"),s=document.getElementById("edit_mat_min_stock"),c=document.getElementById("edit_mat_unit_cost"),d=document.getElementById("edit_mat_location");a&&(a.value=e.id),n&&(n.value=e.code||""),i&&(i.value=e.name||""),r&&(r.value=e.category||"Acero Estructural"),l&&(l.value=(e.unit_measure||"UND").toUpperCase()),s&&(s.value=e.min_stock_alert!==void 0?e.min_stock_alert:5),c&&(c.value=e.unit_cost_usd?Number(e.unit_cost_usd).toFixed(2):"0.00"),d&&(d.value=e.location||""),openModal("modalEditMaterial")}async function $e(o){var n,i,r,l,s,c,d;o&&(typeof o.preventDefault=="function"&&o.preventDefault(),typeof o.stopPropagation=="function"&&o.stopPropagation());const t=(n=document.getElementById("edit_mat_id"))==null?void 0:n.value;if(!t)return;const e={name:(((i=document.getElementById("edit_mat_name"))==null?void 0:i.value)||"").trim(),category:(((r=document.getElementById("edit_mat_category"))==null?void 0:r.value)||"").trim(),unit_measure:(((l=document.getElementById("edit_mat_unit"))==null?void 0:l.value)||"").trim().toUpperCase(),min_stock_alert:parseFloat((s=document.getElementById("edit_mat_min_stock"))==null?void 0:s.value)||0,unit_cost_usd:parseFloat((c=document.getElementById("edit_mat_unit_cost"))==null?void 0:c.value)||0,location:(((d=document.getElementById("edit_mat_location"))==null?void 0:d.value)||"").trim()};if(!e.name){alert("Por favor ingrese el nombre del material.");return}const a=document.getElementById("btnSubmitEditMaterial");a&&(a.disabled=!0,a.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Guardando...');try{const m=await F(`${R}/materials/${t}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)});if(!m.ok){const u=await m.json();throw new Error(u.detail||"Error al actualizar material")}closeModal("modalEditMaterial"),typeof showToastNotification=="function"?showToastNotification("✅ Ficha de material actualizada correctamente.","success"):alert("✅ Material actualizado con éxito."),await K()}catch(m){alert("Error al actualizar material: "+m.message)}finally{a&&(a.disabled=!1,a.innerHTML='<i class="fa-solid fa-floppy-disk"></i> Guardar Cambios')}}typeof window<"u"&&(window.loadMaterialsList=K,window.goToMaterialsPage=xe,window.changeMaterialsPageSize=we,window.renderMaterialsTable=Y,window.renderMaterialsTablePaginated=L,window.filterMaterialsTable=le,window.populateMaterialCategories=N,window.onNewMaterialCategoryChanged=be,window.openNewMaterialModal=se,window.openNewMaterialModalFromCxp=he,window.submitCreateMaterial=_e,window.openEditMaterialModal=ve,window.submitEditMaterial=$e);var O=window.API_BASE||window.location.origin+"/api/v1",T=window.allMaterials=window.allMaterials||[];window.allProjects=window.allProjects||[];window.allCategories=window.allCategories||[];window.allAssets=window.allAssets||[];window.allPersonnel=window.allPersonnel||[];function G(o,t={}){const e=sessionStorage.getItem("dalor_token")||localStorage.getItem("dalor_token")||window.authToken||"",a={...t.headers||{}};return e&&(a.Authorization="Bearer "+e),t.body&&!(t.body instanceof FormData)&&!a["Content-Type"]&&(a["Content-Type"]="application/json"),t.body instanceof FormData&&delete a["Content-Type"],window.fetch(o,{...t,headers:a})}function Z(o=null,t=1,e=0){const a=document.getElementById("me_materials_tbody");if(!a)return;const n=window.allMaterials&&window.allMaterials.length>0?window.allMaterials:T||[],i="me_row_"+Date.now()+"_"+Math.floor(Math.random()*1e3),r=document.createElement("tr");r.id=i,r.style.borderBottom="1px solid #e2e8f0";const l=n.map(s=>{const c=o&&s.id===o?"selected":"",d=s.unit_cost_usd||0;return`<option value="${s.id}" data-cost="${d}" data-unit="${s.unit_measure||"UND"}" data-stock="${s.stock_quantity||0}" ${c}>[${s.code}] ${s.name} (Stock: ${s.stock_quantity||0} ${s.unit_measure||"UND"})</option>`}).join("");if(r.innerHTML=`
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
            <input type="number" step="0.01" min="0" value="${e}" class="me-row-cost form-input" style="font-size: 11.5px; padding: 4px 6px; text-align: right;" oninput="calcMaterialEntryTotal()">
        </td>
        <td style="padding: 6px 8px; width: 120px; text-align: right; font-weight: 800; color: #059669; font-size: 12px;">
            <span class="me-row-subtotal">$0.00</span>
        </td>
        <td style="padding: 6px 8px; width: 36px; text-align: center;">
            <button type="button" onclick="removeMaterialEntryRow(this)" style="background: none; border: none; color: #dc2626; font-size: 18px; cursor: pointer; padding: 2px 6px; font-weight: bold; line-height: 1;" title="Eliminar este renglón">&times;</button>
        </td>
    `,a.appendChild(r),o){const s=r.querySelector(".me-row-material");s&&(s.value=o,de(s))}else H()}function Ee(o){const t=o.closest("tr");t&&t.remove();const e=document.getElementById("me_materials_tbody");e&&e.children.length===0?Z():H()}function de(o){const t=o.closest("tr");if(!t)return;const e=o.options[o.selectedIndex];if(e&&e.value){const a=t.querySelector(".me-row-cost");if(a&&(!parseFloat(a.value)||parseFloat(a.value)===0)){const n=parseFloat(e.getAttribute("data-cost"))||0;n>0&&(a.value=n.toFixed(2))}}H()}function Me(o){const t=(o.value||"").toLowerCase().trim(),e=o.closest("tr");if(!e)return;const a=e.querySelector(".me-row-material");if(!a)return;const n=window.allMaterials&&window.allMaterials.length>0?window.allMaterials:T||[],i=t?n.filter(l=>(l.name||"").toLowerCase().includes(t)||(l.code||"").toLowerCase().includes(t)):n,r=a.value;a.innerHTML=`<option value="">-- Seleccionar Material (${i.length}) --</option>`+i.map(l=>{const s=String(l.id)===String(r)?"selected":"";return`<option value="${l.id}" data-cost="${l.unit_cost_usd||0}" data-unit="${l.unit_measure||"UND"}" data-stock="${l.stock_quantity||0}" ${s}>[${l.code}] ${l.name} (Stock: ${l.stock_quantity||0} ${l.unit_measure||"UND"})</option>`}).join("")}function Ie(o=null){const t=document.getElementById("materialEntryForm");t&&t.reset();const e=document.getElementById("me_materials_tbody");e&&(e.innerHTML=""),Z(o,1,0),ce(),openModal("modalMaterialEntry")}function H(){const o=document.querySelectorAll("#me_materials_tbody tr");let t=0;o.forEach(r=>{var m,u;const l=parseFloat((m=r.querySelector(".me-row-qty"))==null?void 0:m.value)||0,s=parseFloat((u=r.querySelector(".me-row-cost"))==null?void 0:u.value)||0,c=l*s;t+=c;const d=r.querySelector(".me-row-subtotal");d&&(d.innerText=`$${c.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`)});const e=document.getElementById("me_total_usd_preview");e&&(e.innerText=`$${t.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})} USD`);const a=window.bcvRate||window.currentBcvRate||1,n=t*(a>1?a:1),i=document.getElementById("me_total_bs_preview");i&&(i.innerText=a>1?`≈ Bs ${n.toLocaleString("es-VE",{minimumFractionDigits:2,maximumFractionDigits:2})} (Tasa BCV: ${a})`:"")}function ce(){var e;const o=((e=document.getElementById("me_register_cxp"))==null?void 0:e.checked)||!1,t=document.getElementById("me_cash_payment_box");t&&(o?t.classList.add("hidden"):t.classList.remove("hidden"))}async function Ce(o){var d,m,u,f,y,b;o&&(typeof o.preventDefault=="function"&&o.preventDefault(),typeof o.stopPropagation=="function"&&o.stopPropagation());const t=document.querySelectorAll("#me_materials_tbody tr"),e=[];if(t.forEach(p=>{var w,E,M;const h=parseInt((w=p.querySelector(".me-row-material"))==null?void 0:w.value),x=parseFloat((E=p.querySelector(".me-row-qty"))==null?void 0:E.value)||0,$=parseFloat((M=p.querySelector(".me-row-cost"))==null?void 0:M.value)||0;h&&!isNaN(h)&&x>0&&e.push({material_id:h,quantity:x,unit_cost_usd:$})}),e.length===0)return alert("⚠️ Por favor añade al menos un material válido con cantidad mayor a 0."),!1;const a=((d=document.getElementById("me_register_cxp"))==null?void 0:d.checked)||!1,n=((m=document.getElementById("me_payment_channel"))==null?void 0:m.value)||"caja_chica_usd",i=(((u=document.getElementById("me_payment_ref"))==null?void 0:u.value)||"").trim(),r=(((f=document.getElementById("me_supplier"))==null?void 0:f.value)||"").trim()||"Proveedor General",l=(((y=document.getElementById("me_doc"))==null?void 0:y.value)||"").trim()||"Factura Compra",s=(((b=document.getElementById("me_notes"))==null?void 0:b.value)||"").trim(),c={items:e,supplier_name:r,reference_doc:l,notes:s,performed_by:"Custodio de Almacén",register_in_cxp:a,due_days:15,payment_channel:n,payment_ref:i};try{const p=window.authToken||localStorage.getItem("dalor_token"),h={"Content-Type":"application/json",...p?{Authorization:`Bearer ${p}`}:{}},x=await G(`${O}/materials/entry`,{method:"POST",headers:h,body:JSON.stringify(c)});if(x.ok){const $=await x.json();alert(`✅ ${$.message||"Entrada registrada exitosamente"}`),closeModal("modalMaterialEntry");try{await loadInitialMasterData()}catch{}try{loadMaterialsList()}catch{}if(a&&typeof window.loadPayablesList=="function")try{window.loadPayablesList()}catch{}}else{const $=await x.json().catch(()=>({detail:"Error en el servidor al registrar entrada."}));alert("Error: "+($.detail||JSON.stringify($)))}}catch(p){console.error("[MATERIAL ENTRY ERROR]",p),alert("Error al procesar entrada de material: "+((p==null?void 0:p.message)||p))}return!1}function ke(o=null){document.getElementById("materialConsumeForm").reset(),populateSelectDropdowns();const t=document.getElementById("mc_material_search");t&&(t.value="");const e=document.getElementById("mc_material_id");o?(e.value=o,e.disabled=!0,e.style.opacity="0.7",e.style.cursor="not-allowed"):(e.disabled=!1,e.style.opacity="",e.style.cursor=""),pe(),X(),ee(),openModal("modalMaterialConsume")}function Be(o){const t=(o||"").toLowerCase().trim(),e=document.getElementById("mc_material_id");if(!e)return;const n=(window.allMaterials&&window.allMaterials.length>0?window.allMaterials:T||[]).filter(l=>(parseFloat(l.stock_quantity)||0)>0),i=t?n.filter(l=>(l.name||"").toLowerCase().includes(t)||(l.code||"").toLowerCase().includes(t)):n,r=e.value;e.innerHTML=`<option value="">-- Seleccionar Material (${i.length} con stock) --</option>`+i.map(l=>{const s=String(l.id)===String(r)?"selected":"";return`<option value="${l.id}" data-cost="${l.unit_cost_usd||0}" data-unit="${l.unit_measure||"UND"}" data-stock="${l.stock_quantity}" ${s}>[${l.code}] ${l.name} (Stock: ${l.stock_quantity} ${l.unit_measure||"UND"})</option>`}).join(""),X()}function pe(){var e;const o=(e=document.getElementById("mc_project_id"))==null?void 0:e.value,t=document.getElementById("mc_guide_banner");t&&(t.style.display=o?"block":"none")}function X(){const o=document.getElementById("mc_material_id");if(!o||!o.options[o.selectedIndex])return;const t=o.options[o.selectedIndex],e=t.getAttribute("data-stock")||"0",a=t.getAttribute("data-unit")||"UND",n=document.getElementById("mc_stock_available_label");n&&(n.innerText=`${parseFloat(e).toLocaleString()} ${a}`),ee()}function ee(){var i;const o=document.getElementById("mc_material_id"),t=parseFloat((i=document.getElementById("mc_quantity"))==null?void 0:i.value)||0;let e=0;o&&o.options[o.selectedIndex]&&(e=parseFloat(o.options[o.selectedIndex].getAttribute("data-cost"))||0);const a=t*e,n=document.getElementById("mc_cost_preview");n&&(n.value=`$${a.toLocaleString("en-US",{minimumFractionDigits:2})} USD`)}async function qe(o){var d,m;o.preventDefault();const t=parseInt(document.getElementById("mc_material_id").value),e=parseFloat(document.getElementById("mc_quantity").value)||0,a=document.getElementById("mc_project_id").value,n=a?parseInt(a):null;if(!t||e<=0){alert("Selecciona un material y cantidad válida mayor a 0.");return}const r=(window.allMaterials&&window.allMaterials.length>0?window.allMaterials:T||[]).find(u=>u.id===t);if(r){const u=parseFloat(r.stock_quantity)||0;if(u<=0){alert(`⛔ Stock agotado: El material [${r.code}] ${r.name} no posee unidades disponibles en pañol (Stock: 0).`);return}if(e>u){alert(`⛔ Stock insuficiente: Has solicitado ${e} ${r.unit_measure||"UND"} de [${r.code}] ${r.name}, pero solo hay ${u} ${r.unit_measure||"UND"} disponibles en pañol.`);return}}const l=(((d=document.getElementById("mc_driver_name"))==null?void 0:d.value)||"").trim(),s=(((m=document.getElementById("mc_vehicle_plate"))==null?void 0:m.value)||"").trim(),c={material_id:t,quantity:e,project_id:n,destination:n?"Obra en Ejecución":"Taller Central",reference_doc:document.getElementById("mc_doc").value.trim()||"Requisición Interna",notes:document.getElementById("mc_notes").value.trim(),performed_by:document.getElementById("mc_performed_by").value.trim()||"Custodio de Almacén",driver_name:l,vehicle_plate:s};try{const u=window.authToken||localStorage.getItem("dalor_token")||null,f={"Content-Type":"application/json"};u&&(f.Authorization=`Bearer ${u}`);const y=await G(`${O}/materials/consume`,{method:"POST",headers:f,body:JSON.stringify(c)});if(y.ok){const b=await y.json();closeModal("modalMaterialConsume"),await loadInitialMasterData(),loadMaterialsList(),b.guide_number?confirm(`✅ ${b.message||"Despacho procesado exitosamente."}

Se ha emitido automáticamente la Guía de Despacho Oficial N°: ${b.guide_number}

¿Deseas abrirla en el módulo de Despachos ahora mismo?`)&&typeof window.navigateToDispatchGuide=="function"&&window.navigateToDispatchGuide(b.guide_number):alert(`✅ ${b.message||"Despacho registrado exitosamente."}`)}else{const b=await y.json();alert("Error: "+(b.detail||JSON.stringify(b)))}}catch(u){alert("Error al procesar despacho de material: "+u.message)}}async function Se(o){let e=(window.allMaterials&&window.allMaterials.length>0?window.allMaterials:T||[]).find(c=>c&&(c.id==o||String(c.id)===String(o)));if(!e&&o)try{const c=await G(`${O}/materials/${o}`);c.ok&&(e=await c.json())}catch{}if(!e)return alert("Material no encontrado");const a=document.getElementById("calib_mat_id");a&&(a.value=e.id);const n=document.getElementById("calib_mat_display");n&&(n.value=`[${e.code}] ${e.name}`);const i=document.getElementById("calib_mat_current_stock");i&&(i.value=`${e.stock_quantity} ${e.unit_measure}`);const r=document.getElementById("calib_mat_new_stock");r&&(r.value=e.stock_quantity);const l=document.getElementById("calib_mat_reason");l&&(l.value="");const s=document.getElementById("calib_mat_password");s&&(s.value=""),typeof openModal=="function"&&openModal("modalCalibrateMaterial")}async function Pe(o){var i,r,l,s,c;o&&o.preventDefault();const t=(i=document.getElementById("calib_mat_id"))==null?void 0:i.value,e=parseFloat((r=document.getElementById("calib_mat_new_stock"))==null?void 0:r.value),a=((s=(l=document.getElementById("calib_mat_reason"))==null?void 0:l.value)==null?void 0:s.trim())||"",n=((c=document.getElementById("calib_mat_password"))==null?void 0:c.value)||"";if(!t)return alert("Error: ID del material no identificado.");if(isNaN(e)||e<0)return alert("Ingrese un nuevo stock válido mayor o igual a 0.");if(!a)return alert("Debe indicar la justificación o motivo del ajuste físico.");if(!n)return alert("Debe ingresar su contraseña para autorizar la calibración.");try{const d=await G(`${O}/materials/${t}/calibrate`,{method:"PUT",body:JSON.stringify({new_stock_quantity:e,new_stock:e,reason:a,director_password:n})});if(!d.ok){const u=await d.json().catch(()=>({detail:"Error al calibrar stock"}));throw new Error(u.detail||"Error al calibrar stock")}const m=await d.json();alert(`✅ Stock calibrado exitosamente: nuevo stock ${m.new_stock}`),typeof closeModal=="function"&&closeModal("modalCalibrateMaterial"),loadMaterialsList()}catch(d){console.error("Error calibrating material:",d),alert(`❌ Error: ${d.message||d}`)}return!1}typeof window<"u"&&(window.addMaterialEntryRow=Z,window.removeMaterialEntryRow=Ee,window.onEntryMaterialRowChanged=de,window.filterEntryRowDropdown=Me,window.openMaterialEntryModal=Ie,window.calcMaterialEntryTotal=H,window.toggleMaterialEntryPaymentBox=ce,window.submitMaterialEntry=Ce,window.openMaterialConsumeModal=ke,window.filterConsumeMaterialDropdown=Be,window.onConsumeProjectChanged=pe,window.onConsumeMaterialSelected=X,window.calcMaterialConsumeTotal=ee,window.submitMaterialConsume=qe,window.openCalibrateMaterialModal=Se,window.submitCalibrateMaterial=Pe);var je=window.API_BASE||window.location.origin+"/api/v1";window.allMaterials=window.allMaterials||[];var ue=window.allProjects=window.allProjects||[];window.allCategories=window.allCategories||[];var A=window.allAssets=window.allAssets||[],S=window.allPersonnel=window.allPersonnel||[];function Te(o,t={}){const e=sessionStorage.getItem("dalor_token")||localStorage.getItem("dalor_token")||window.authToken||"",a={...t.headers||{}};return e&&(a.Authorization="Bearer "+e),t.body&&!(t.body instanceof FormData)&&!a["Content-Type"]&&(a["Content-Type"]="application/json"),t.body instanceof FormData&&delete a["Content-Type"],window.fetch(o,{...t,headers:a})}function De(){document.getElementById("transferGuideForm").reset(),populateSelectDropdowns(),te(),openModal("modalTransferGuide")}function Ae(){const o=document.getElementById("tg_project_id");if(!o||!o.options[o.selectedIndex])return;const t=o.options[o.selectedIndex],e=parseInt(o.value),a=ue.find(s=>s.id===e),n=a&&a.location||t.getAttribute("data-location")||"Planta Centro - Morón",i=document.getElementById("tg_destination");i&&(i.value=n);const r=document.getElementById("tg_driver_name");if(r){let s=(S||[]).find(c=>c.current_project_id===e&&(c.role_title||"").toLowerCase().includes("chofer"));s||(s=(S||[]).find(c=>(c.role_title||"").toLowerCase().includes("chofer"))),!s&&S&&S.length>0&&(s=S[0]),s&&(r.value=s.full_name)}const l=document.getElementById("tg_vehicle_id");if(l){const s=(A||[]).find(c=>(c.asset_type==="vehiculo"||c.asset_type==="camioneta")&&c.current_project_id===e);if(s)l.value=s.id;else{const c=(A||[]).find(d=>d.asset_type==="vehiculo"||d.asset_type==="camioneta");c&&(l.value=c.id)}}te(e)}function te(o=null){const t=document.getElementById("tg_tools_checklist_container");if(!t)return;const e=A.filter(a=>a.asset_type!=="vehiculo"&&a.asset_type!=="camioneta");if(e.length===0){t.innerHTML='<span style="font-size:11px; color:#94a3b8;">No hay herramientas registradas.</span>';return}t.innerHTML=e.map(a=>{const n=o&&(a.current_project_id===o||a.current_location==="en_obra");return`

        <label style="display: flex; align-items: center; gap: 8px; padding: 4px 6px; border-radius: 4px; background: ${n?"#f0fdf4":"#f8fafc"}; font-size: 11px; cursor: pointer;" class="tg-tool-item" data-text="${a.asset_code} ${a.name} ${a.brand||""}">

            <input type="checkbox" value="${a.id}" data-name="${a.name}" data-code="${a.asset_code}" data-brand="${a.brand||""}" data-serial="${a.serial_number||""}" class="tg-tool-checkbox" ${n?"checked":""} style="width: 15px; height: 15px; accent-color: #0284c7;">

            <span style="font-weight: 800; color: var(--dalor-blue); font-family: monospace;">[${a.asset_code}]</span>

            <span style="font-weight: 600; color: var(--dalor-navy);">${a.name}</span>

            <span style="color: #64748b; font-size: 10px; margin-left: auto;">${a.brand||""}</span>

        </label>

        `}).join("")}function ze(){var t;const o=(((t=document.getElementById("tg_tools_search"))==null?void 0:t.value)||"").toLowerCase();document.querySelectorAll(".tg-tool-item").forEach(e=>{const a=e.getAttribute("data-text").toLowerCase();e.style.display=a.includes(o)?"flex":"none"})}async function Re(o){var u;o.preventDefault();const t=parseInt(document.getElementById("tg_project_id").value),e=document.getElementById("tg_destination").value.trim(),a=document.getElementById("tg_vehicle_id").value,n=document.getElementById("tg_driver_name").value.trim();if(!t){alert("Por favor selecciona un proyecto aprobado de destino.");return}const i=[];if(document.querySelectorAll(".tg-tool-checkbox:checked").forEach(f=>{i.push({id:parseInt(f.value),code:f.getAttribute("data-code"),name:f.getAttribute("data-name")})}),i.length===0){alert("Por favor selecciona al menos una herramienta o equipo a trasladar.");return}const r=ue.find(f=>f.id===t)||{code:"DAL-2026-001",name:"Proyecto Obra"},l=A.find(f=>f.id==a)||{name:"Camioneta Toyota Hilux"},s=`GT-DALOR-${Date.now().toString().slice(-6)}`;for(const f of i)try{await Te(`${je}/resources/assign`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({resource_type:"asset",resource_id:f.id,project_id:t,destination_location:e,custodian_name:n,action_type:"assign"})})}catch(y){console.error("Error asignando herramienta:",y)}closeModal("modalTransferGuide"),await loadInitialMasterData(),document.getElementById("subtab-res-tools")&&!document.getElementById("subtab-res-tools").classList.contains("hidden")&&loadToolsList();const c=document.getElementById("modalPrintPreviewContent"),d=document.getElementById("previewModalTitle");d&&(d.innerText="Guía Oficial de Traslado y Despacho de Equipos - Dalor C.A.");const m=new Date().toLocaleDateString("es-VE")+" "+new Date().toLocaleTimeString("es-VE",{hour:"2-digit",minute:"2-digit"});c&&(c.innerHTML=`

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

                        N°: ${s}

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

                    <td style="padding: 6px 10px; border: 1px solid #cbd5e1; width: 30%; font-weight: 700;">${e}</td>

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

        `,openModal("modalPrintPreview"))}typeof window<"u"&&(window.openTransferGuideModal=De,window.onTransferGuideProjectChanged=Ae,window.renderTransferToolsChecklist=te,window.filterTransferToolsChecklist=ze,window.submitGenerateTransferGuide=Re);var Fe=window.API_BASE||window.location.origin+"/api/v1",P=window.allMaterials=window.allMaterials||[],z=window.allProjects=window.allProjects||[];window.allCategories=window.allCategories||[];window.allAssets=window.allAssets||[];window.allPersonnel=window.allPersonnel||[];function Le(o,t={}){const e=sessionStorage.getItem("dalor_token")||localStorage.getItem("dalor_token")||window.authToken||"",a={...t.headers||{}};return e&&(a.Authorization="Bearer "+e),t.body&&!(t.body instanceof FormData)&&!a["Content-Type"]&&(a["Content-Type"]="application/json"),t.body instanceof FormData&&delete a["Content-Type"],window.fetch(o,{...t,headers:a})}async function Ne(){const o=document.getElementById("materialDeliveryForm");o&&o.reset();let t=window.allProjects&&window.allProjects.length>0?window.allProjects:z||[];if(t.length===0)try{const n=await Le(`${Fe}/projects/`);n.ok&&(t=await n.json(),window.allProjects=z=t)}catch(n){console.error("Error cargando proyectos para despacho:",n)}const e=(t||[]).filter(n=>{const i=(n.status||"").toLowerCase().trim();return!["culminado","completado","cerrado","cancelado","finalizado","inactivo"].includes(i)}),a=document.getElementById("md_project_id");a&&(e.length===0?a.innerHTML='<option value="">⚠️ No hay obras abiertas disponibles para despacho</option>':a.innerHTML='<option value="">-- Seleccione Proyecto Aprobado Destino --</option>'+e.map(n=>`<option value="${n.id}" data-location="${n.location||""}">[${n.code}] ${n.name}</option>`).join("")),me(),openModal("modalMaterialDelivery")}function me(){const o=document.getElementById("md_project_id");if(!o||!o.options[o.selectedIndex])return;const t=parseInt(o.value),e=z.find(l=>l.id===t),a=e&&e.location||"Frente de Obra / Planta",n=document.getElementById("md_destination");n&&(n.value=a);const i=document.getElementById("md_dispatcher_name");i&&!i.value&&(i.value="Jefe de Materiales / Almacén Central");const r=document.getElementById("md_receiver_name");r&&!r.value&&(r.value=e&&e.client_name?`Supervisor / Residente (${e.client_name})`:"Supervisor Residente de Obra"),fe()}function fe(){const o=document.getElementById("md_materials_tbody");if(o)if(o.innerHTML="",P&&P.length>0)for(let t=0;t<Math.min(2,P.length);t++)D(P[t].name,P[t].unit_measure||"Pza",1);else D("Cable THW 12 AWG","Metro (m)",50),D("Breaker 2x30A","Pza",2)}function D(o="",t="Pza",e=1){const a=document.getElementById("md_materials_tbody");if(!a)return;const n=document.createElement("tr");n.style.borderBottom="1px solid #f1f5f9",n.innerHTML=`

        <td style="padding: 4px 6px;">

            <input type="text" class="form-input md-item-name" value="${o}" placeholder="Descripción del material..." style="padding: 4px 6px; font-size: 11px;" required>

        </td>

        <td style="padding: 4px 6px;">

            <input type="text" class="form-input md-item-unit" value="${t}" placeholder="Pza, m, etc." style="padding: 4px 6px; font-size: 11px; text-align: center;">

        </td>

        <td style="padding: 4px 6px;">

            <input type="number" step="0.01" class="form-input md-item-qty" value="${e}" style="padding: 4px 6px; font-size: 11px; text-align: right; font-weight: 800;" required>

        </td>

        <td style="padding: 4px 6px; text-align: center;">

            <button type="button" onclick="this.closest('tr').remove()" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 13px;">&times;</button>

        </td>

    `,a.appendChild(n)}function Oe(o){o.preventDefault();const t=parseInt(document.getElementById("md_project_id").value),e=document.getElementById("md_destination").value.trim(),a=document.getElementById("md_dispatcher_name").value.trim(),n=document.getElementById("md_receiver_name").value.trim(),i=document.getElementById("md_notes").value.trim(),r=[];if(document.querySelectorAll("#md_materials_tbody tr").forEach(u=>{var p,h,x;const f=(p=u.querySelector(".md-item-name"))==null?void 0:p.value.trim(),y=((h=u.querySelector(".md-item-unit"))==null?void 0:h.value.trim())||"Pza",b=parseFloat((x=u.querySelector(".md-item-qty"))==null?void 0:x.value)||0;f&&b>0&&r.push({name:f,unit:y,qty:b})}),r.length===0){alert("Por favor ingresa al menos un material con cantidad válida.");return}const l=z.find(u=>u.id===t)||{code:"DAL-2026-001",name:"Proyecto en Obra"},s=`NE-MAT-${Date.now().toString().slice(-6)}`,c=new Date().toLocaleDateString("es-VE")+" "+new Date().toLocaleTimeString("es-VE",{hour:"2-digit",minute:"2-digit"});closeModal("modalMaterialDelivery");const d=document.getElementById("modalPrintPreviewContent"),m=document.getElementById("previewModalTitle");m&&(m.innerText="Nota Oficial de Entrega de Materiales - Dalor C.A."),d&&(d.innerHTML=`

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

                        N°: ${s}

                    </div>

                    <div style="font-size: 11px; color: #64748b;">

                        Fecha: ${c}

                    </div>

                </div>

            </div>



            <!-- Ficha de Destinatario y Entrega -->

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 11px;">

                <tr style="background: #f8fafc;">

                    <td style="padding: 6px 10px; border: 1px solid #cbd5e1; font-weight: 700; width: 20%; color: #475569;">Proyecto / Obra:</td>

                    <td style="padding: 6px 10px; border: 1px solid #cbd5e1; width: 30%; font-weight: 800; color: #059669;">[${l.code}] ${l.name}</td>

                    <td style="padding: 6px 10px; border: 1px solid #cbd5e1; font-weight: 700; width: 20%; color: #475569;">Lugar de Entrega:</td>

                    <td style="padding: 6px 10px; border: 1px solid #cbd5e1; width: 30%; font-weight: 700;">${e}</td>

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

        `,openModal("modalPrintPreview"))}typeof window<"u"&&(window.openMaterialDeliveryModal=Ne,window.onMaterialDeliveryProjectChanged=me,window.renderInitialMaterialDeliveryRows=fe,window.addMaterialDeliveryRow=D,window.submitGenerateMaterialDeliveryGuide=Oe);var V=window.API_BASE||window.location.origin+"/api/v1";window.allMaterials=window.allMaterials||[];window.allProjects=window.allProjects||[];window.allCategories=window.allCategories||[];window.allAssets=window.allAssets||[];window.allPersonnel=window.allPersonnel||[];function U(o,t={}){const e=sessionStorage.getItem("dalor_token")||localStorage.getItem("dalor_token")||window.authToken||"",a={...t.headers||{}};return e&&(a.Authorization="Bearer "+e),t.body&&!(t.body instanceof FormData)&&!a["Content-Type"]&&(a["Content-Type"]="application/json"),t.body instanceof FormData&&delete a["Content-Type"],window.fetch(o,{...t,headers:a})}var W=window.allProjectRequisitions=[];async function oe(){try{const o=await U(`${V}/materials/project-requisitions?status=pendiente`);if(!o.ok)return;const t=await o.json(),e=new Set;let a=!1;(t||[]).forEach(l=>{(l.quantity_pending||0)>0&&(l.project_id&&e.add(l.project_id),(l.quantity_dispatched||0)>0&&(a=!0))});const n=e.size;["badgePendingRequisitions","badgePendingRequisitionsBanner","badgePendingRequisitionsDispatch","badgePendingRequisitionsNav","badgePendingRequisitionsHeader"].forEach(l=>{const s=document.getElementById(l);s&&(s.innerText=n,s.style.display=n>0?"inline-block":"none",a?s.title=`${n} obra(s) con requerimientos (posee pendientes parciales)`:s.title=`${n} obra(s) con requerimientos pendientes`)});const r=document.getElementById("btnHeaderRequisitionsAlarm");r&&(n>0?(r.style.color="#dc2626",r.style.fontWeight="800",r.title=`🚨 ¡Atención Almacén! Hay ${n} obra(s) con solicitudes pendientes de despacho`):(r.style.color="",r.style.fontWeight="",r.title="Requisiciones de Materiales"))}catch(o){console.warn("Could not load project requisitions badge:",o)}}async function Ge(o=null){typeof openModal=="function"&&openModal("modalProjectRequisitionsInbox"),await J(o)}async function J(o=null){const t=document.getElementById("reqInboxContainer");if(t){t.innerHTML='<div style="text-align: center; padding: 40px; color: #94a3b8;"><i class="fa-solid fa-spinner fa-spin" style="font-size: 24px;"></i><p style="margin-top: 8px; font-size: 13px;">Cargando pedidos de insumos desde las Obras...</p></div>';try{const e=await U(`${V}/materials/project-requisitions`);if(!e.ok)throw new Error("Error al consultar requisiciones de proyectos.");const a=await e.json();W=window.allProjectRequisitions=Array.isArray(a)?a:[];const n=document.getElementById("reqInboxProjectFilter");if(n){const i=o!==null?String(o):n.value,r=[],l=new Set;W.forEach(c=>{c.project_id&&!l.has(c.project_id)&&(l.add(c.project_id),r.push({id:c.project_id,code:c.project_code||`PRJ-${c.project_id}`,name:c.project_name||"Sin Título"}))}),r.sort((c,d)=>(d.code||"").localeCompare(c.code||""));let s='<option value="">-- Todas las Obras / Proyectos --</option>';r.forEach(c=>{s+=`<option value="${c.id}" ${i==String(c.id)?"selected":""}>[${c.code}] ${c.name}</option>`}),n.innerHTML=s}ge()}catch(e){console.error("Error loading project requisitions inbox:",e),t.innerHTML=`<div style="text-align: center; padding: 30px; color: #ef4444;"><i class="fa-solid fa-triangle-exclamation" style="font-size: 24px;"></i><p style="margin-top: 8px;">Error al cargar las requisiciones: ${e.message}</p></div>`}}}function ge(){var n,i,r;const o=(((n=document.getElementById("reqInboxSearch"))==null?void 0:n.value)||"").toLowerCase().trim(),t=((i=document.getElementById("reqInboxProjectFilter"))==null?void 0:i.value)||"",e=((r=document.getElementById("reqInboxStatusFilter"))==null?void 0:r.value)||"pending";let a=W||[];e==="pending"&&(a=a.filter(l=>(l.quantity_pending||0)>0&&l.status!=="despachado")),t&&(a=a.filter(l=>String(l.project_id)===String(t))),o&&(a=a.filter(l=>(l.material_name||"").toLowerCase().includes(o)||(l.material_code||"").toLowerCase().includes(o)||(l.project_code||"").toLowerCase().includes(o)||(l.project_name||"").toLowerCase().includes(o))),Q(a)}function He(o){const t=document.getElementById(`req_vehicle_sel_${o}`),e=document.getElementById(`req_plate_${o}`),a=document.getElementById(`req_vehicle_model_${o}`);if(!t||!e||!a)return;const n=t.options[t.selectedIndex];if(!n||n.value===""||n.value==="externo"){n&&n.value==="externo"&&(e.value="",a.value="",e.placeholder="Placa flete (ej: A12BC3D)",a.placeholder="Modelo / Tipo Flete");return}const i=n.getAttribute("data-plate")||"",r=n.getAttribute("data-model")||"";e.value=i!=="S/P"?i:"",a.value=r}window.onReqVehicleChanged=He;function Ve(o){const t=document.getElementById(`req_driver_sel_${o}`),e=document.getElementById(`req_driver_${o}`),a=document.getElementById(`req_driver_ci_${o}`);if(!t||!e||!a)return;const n=t.options[t.selectedIndex];if(!n||n.value===""||n.value==="externo"){n&&n.value==="externo"&&(e.value="",a.value="",e.placeholder="Nombre del Chofer Contratado",a.placeholder="C.I. / Cédula");return}const i=n.getAttribute("data-name")||"",r=n.getAttribute("data-ci")||"";e.value=i,a.value=r}window.onReqDriverChanged=Ve;var C=window.currentReqPage=1,k=window.reqPageSize=3,ae=window.currentFilteredReqs=[];function Q(o,t=!0){const e=document.getElementById("reqInboxContainer");if(!e)return;if(t&&(C=1),ae=o||[],!o||o.length===0){e.innerHTML=`
            <div style="text-align: center; padding: 50px 20px; background: #f8fafc; border-radius: 12px; border: 2px dashed #cbd5e1;">
                <i class="fa-solid fa-circle-check" style="font-size: 40px; color: #10b981; margin-bottom: 12px;"></i>
                <h4 style="font-size: 16px; font-weight: 800; color: #1e293b;">¡No hay requerimientos pendientes de preparación!</h4>
                <p style="font-size: 12px; color: #64748b; max-width: 480px; margin: 6px auto 0;">
                    Todas las solicitudes de insumos formuladas en Obras han sido despachadas o no coinciden con los filtros seleccionados.
                </p>
            </div>
        `;return}const a={};o.forEach(d=>{const m=d.project_id||0;a[m]||(a[m]={project_id:m,project_code:d.project_code||"S/P",project_name:d.project_name||"Sin Obra Asignada",project_location:d.project_location||"",is_internal:!!d.is_internal,max_req_id:d.id||0,items:[]}),a[m].items.push(d),(d.id||0)>a[m].max_req_id&&(a[m].max_req_id=d.id)});const n=Object.values(a);n.sort((d,m)=>(m.max_req_id||0)-(d.max_req_id||0)),n.forEach(d=>{d.items.sort((m,u)=>(u.id||0)-(m.id||0))});const i=n.length,r=Math.max(1,Math.ceil(i/k));C>r&&(C=r);const l=(C-1)*k,s=n.slice(l,l+k);let c="";s.forEach(d=>{const m=d.items.filter(p=>(p.quantity_pending||0)>0).length,u=d.items[0]||{},f=`${u.project_location||d.project_location||""} ${d.project_name||""} ${d.project_code||""}`.toLowerCase(),y=u.is_internal||d.is_internal||f.includes("sede")||f.includes("guacara")||f.includes("taller");let b="";if(y)b=`
                <input type="hidden" id="req_is_internal_${d.project_id}" value="1">
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
                            <input type="text" id="req_notes_${d.project_id}" placeholder="Ej: Material verificado para trabajo interno en pañol." class="form-input" style="font-size: 11px; padding: 5px 8px; background: white; width: 100%;">
                        </div>
                    </div>
                </div>
            `;else{const p=u.project_vehicles||[],h=u.available_fleet||u.all_fleet||[],x=u.project_personnel||[],$=u.available_personnel||u.all_personnel||[],w=p.length>0,E=w&&p[0].plate!=="S/P"?p[0].plate:"",M=w&&(p[0].name||p[0].model)||"";let v='<option value="">-- Seleccionar Flota DALOR o Externo --</option>';p.length>0&&(v+='<optgroup label="🚗 Asignado a esta Obra (Prioridad)">',p.forEach((g,q)=>{const ye=q===0?"selected":"";v+=`<option value="${g.id}" data-plate="${g.plate}" data-model="${g.name||g.model}" ${ye}>[${g.code}] ${g.name} (${g.plate})</option>`}),v+="</optgroup>"),h.length>0&&(v+='<optgroup label="🚚 Otros Vehículos Disponibles en Base">',h.filter(g=>!p.some(q=>q.id===g.id)).forEach(g=>{v+=`<option value="${g.id}" data-plate="${g.plate}" data-model="${g.name||g.model}">[${g.code}] ${g.name} (${g.plate})</option>`}),v+="</optgroup>"),v+='<optgroup label="🏢 Flete Tercerizado / Externo">',v+=`<option value="externo" data-plate="" data-model="" ${w?"":"selected"}>Flete Externo / Retiro Cliente (Ingreso manual)</option>`,v+="</optgroup>";let _='<option value="">-- Seleccionar Chofer o Externo --</option>';x.length>0&&(_+='<optgroup label="🚗 Personal Asignado a esta Obra">',x.forEach(g=>{_+=`<option value="${g.id}" data-name="${g.name}" data-ci="${g.ci}">${g.name} (C.I: ${g.ci})</option>`}),_+="</optgroup>"),$.length>0&&(_+='<optgroup label="🏢 Chofer / Personal Disponible en Base">',$.filter(g=>!x.some(q=>q.id===g.id)).forEach(g=>{_+=`<option value="${g.id}" data-name="${g.name}" data-ci="${g.ci}">${g.name} (C.I: ${g.ci})</option>`}),_+="</optgroup>"),_+='<optgroup label="✍️ Chofer Contratado / Externo">',_+='<option value="externo" data-name="" data-ci="" selected>✍️ Chofer Externo / Contratado por Fuera (Ingreso manual)</option>',_+="</optgroup>",b=`
                <input type="hidden" id="req_is_internal_${d.project_id}" value="0">
                <div style="background: #f0f9ff; border: 1.5px solid #bae6fd; border-radius: 8px; padding: 12px 14px; margin-bottom: 12px; display: grid; grid-template-columns: 1.2fr 1.2fr 1.6fr; gap: 12px; align-items: start;">
                    <div>
                        <label style="font-size: 11px; font-weight: 800; color: #0369a1; display: flex; align-items: center; justify-content: space-between; margin-bottom: 3px;">
                            <span><i class="fa-solid fa-truck-pickup"></i> Vehículo para Obra Foránea</span>
                            <span style="font-size: 9.5px; color: #0284c7; font-weight: 700;">(Flota o Externo)</span>
                        </label>
                        <select id="req_vehicle_sel_${d.project_id}" onchange="onReqVehicleChanged(${d.project_id})" class="form-select" style="font-size: 11px; padding: 5px 8px; background: white; margin-bottom: 4px;">
                            ${v}
                        </select>
                        <div style="display: flex; gap: 6px;">
                            <input type="text" id="req_plate_${d.project_id}" value="${E}" placeholder="Placa (ej: A12BC3D)" class="form-input" style="font-size: 11px; padding: 4px 6px; font-weight: 700; width: 45%;" title="Placa del vehículo">
                            <input type="text" id="req_vehicle_model_${d.project_id}" value="${M}" placeholder="Modelo / Marca" class="form-input" style="font-size: 11px; padding: 4px 6px; width: 55%;" title="Modelo del vehículo">
                        </div>
                    </div>
                    <div>
                        <label style="font-size: 11px; font-weight: 800; color: #0369a1; display: flex; align-items: center; justify-content: space-between; margin-bottom: 3px;">
                            <span><i class="fa-solid fa-id-card"></i> Chofer Asignado al Traslado</span>
                            <span style="font-size: 9.5px; color: #0284c7; font-weight: 700;">(DALOR o Externo)</span>
                        </label>
                        <select id="req_driver_sel_${d.project_id}" onchange="onReqDriverChanged(${d.project_id})" class="form-select" style="font-size: 11px; padding: 5px 8px; background: white; margin-bottom: 4px;">
                            ${_}
                        </select>
                        <div style="display: flex; gap: 6px;">
                            <input type="text" id="req_driver_${d.project_id}" value="" placeholder="Nombre del Chofer" class="form-input" style="font-size: 11px; padding: 4px 6px; font-weight: 700; width: 60%;" title="Nombre del chofer">
                            <input type="text" id="req_driver_ci_${d.project_id}" value="" placeholder="C.I. / Cédula" class="form-input" style="font-size: 11px; padding: 4px 6px; font-weight: 700; width: 40%;" title="Cédula de identidad">
                        </div>
                    </div>
                    <div>
                        <label style="font-size: 11px; font-weight: 800; color: #0369a1; display: block; margin-bottom: 3px;">
                            <i class="fa-solid fa-note-sticky"></i> Observaciones de Despacho & Precinto
                        </label>
                        <textarea id="req_notes_${d.project_id}" rows="2" placeholder="Ej: Material verificado en pañol para traslado de obra." class="form-input" style="font-size: 11px; padding: 5px 8px; background: white; resize: none;"></textarea>
                    </div>
                </div>
            `}c+=`
            <div class="card" style="border: 1px solid #cbd5e1; border-radius: 10px; padding: 14px 18px; background: white; box-shadow: 0 1px 3px rgba(0,0,0,0.05); margin-bottom: 16px;">
                <!-- Header de Obra -->
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
                    <div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span style="background: ${y?"#0284c7":"#1e3a8a"}; color: white; font-weight: 800; font-size: 11px; padding: 3px 8px; border-radius: 6px; letter-spacing: 0.5px;">
                                <i class="${y?"fa-solid fa-warehouse":"fa-solid fa-building"}"></i> ${d.project_code}
                            </span>
                            <h4 style="font-size: 15px; font-weight: 800; color: #0f172a; margin: 0;">${d.project_name}</h4>
                            <span style="font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 4px; ${y?"background: #dcfce7; color: #15803d;":"background: #e0f2fe; color: #0369a1;"}">
                                ${y?"🏢 Sede Central":"📍 Obra Foránea (Traslado Externo)"}
                            </span>
                        </div>
                    </div>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <span style="font-size: 11px; font-weight: 700; color: #475569; background: #f1f5f9; padding: 4px 10px; border-radius: 6px;">
                            ${d.items.length} insumos en lista (${m} pendientes)
                        </span>
                    </div>
                </div>

                <!-- Datos de Despacho & Logística para esta Obra -->
                ${b}

                <!-- Tabla de Insumos Requeridos -->
                <div style="overflow-x: auto; border: 1px solid #e2e8f0; border-radius: 8px;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 11.5px; text-align: left;">
                        <thead>
                            <tr style="background: #f8fafc; color: #475569; font-weight: 700; border-bottom: 1px solid #e2e8f0;">
                                <th style="padding: 8px 10px; width: 36px; text-align: center;">
                                    <input type="checkbox" onchange="toggleSelectAllProjectReqs(${d.project_id}, this.checked)" title="Seleccionar todos con stock">
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
                            ${d.items.map(p=>{const h=(p.quantity_pending||0)<=0||p.status==="despachado",x=p.stock_available||0,$=x<=0,w=h||$,E=w?0:Math.min(p.quantity_pending,x),M=$?'<span style="background: #fee2e2; color: #b91c1c; padding: 2px 7px; border-radius: 4px; font-weight: 800; font-size: 10.5px;"><i class="fa-solid fa-ban"></i> 0.00 (SIN STOCK)</span>':p.has_enough_stock?`<span style="background: #dcfce7; color: #15803d; padding: 2px 7px; border-radius: 4px; font-weight: 700; font-size: 10.5px;"><i class="fa-solid fa-circle-check"></i> ${x.toFixed(2)} ${p.unit_measure}</span>`:`<span style="background: #fef3c7; color: #b45309; padding: 2px 7px; border-radius: 4px; font-weight: 700; font-size: 10.5px;"><i class="fa-solid fa-triangle-exclamation"></i> ${x.toFixed(2)} ${p.unit_measure} (Parcial)</span>`;return`
                                    <tr style="border-bottom: 1px solid #f1f5f9; ${h?"background: #f8fafc; opacity: 0.65;":""} ${$&&!h?"background: #fff1f2;":""}">
                                        <td style="padding: 8px 10px; text-align: center;">
                                            <input type="checkbox" class="req-check-${d.project_id}" data-req-id="${p.id}" data-project-id="${d.project_id}" data-stock="${x}" data-pending="${p.quantity_pending}" ${w?"":"checked"} ${w?"disabled":""}>
                                        </td>
                                        <td style="padding: 8px 10px; font-family: monospace; font-weight: 700; color: #334155;">
                                            ${p.material_code}
                                        </td>
                                        <td style="padding: 8px 10px;">
                                            <div style="font-weight: 600; color: #0f172a; display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                                                ${p.resource_type==="herramienta"?'<span class="badge-tag" style="background:#e0e7ff; color:#3730a3; font-size:9.5px;"><i class="fa-solid fa-wrench"></i> Herramienta</span>':p.resource_type==="maquinaria"?'<span class="badge-tag" style="background:#ffedd5; color:#9a3412; font-size:9.5px;"><i class="fa-solid fa-tractor"></i> Maquinaria</span>':p.resource_type==="vehiculo"?'<span class="badge-tag" style="background:#fef3c7; color:#92400e; font-size:9.5px;"><i class="fa-solid fa-truck-pickup"></i> Vehículo</span>':'<span class="badge-tag" style="background:#f0fdf4; color:#166534; font-size:9.5px;"><i class="fa-solid fa-boxes-stacked"></i> Material</span>'}
                                                <span>${p.material_name}</span>
                                            </div>
                                            ${p.notes?`<span style="font-size: 10px; color: #64748b;">Nota: ${p.notes}</span>`:""}
                                        </td>
                                        <td style="padding: 8px 10px; text-align: center; font-weight: 600;">
                                            ${(p.quantity_required||0).toFixed(2)} ${p.unit_measure}
                                        </td>
                                        <td style="padding: 8px 10px; text-align: center; color: #059669; font-weight: 600;">
                                            ${(p.quantity_dispatched||0).toFixed(2)} ${p.unit_measure}
                                        </td>
                                        <td style="padding: 8px 10px; text-align: center; font-weight: 800; color: ${h?"#10b981":"#e11d48"};">
                                            ${h?"0.00 (Listo)":`${(p.quantity_pending||0).toFixed(2)} ${p.unit_measure}`}
                                        </td>
                                        <td style="padding: 8px 10px; text-align: center;">
                                            ${M}
                                        </td>
                                        <td style="padding: 8px 10px; text-align: center;">
                                            <input type="number" step="0.01" min="0" max="${Math.min(p.quantity_pending,x)}" id="req_qty_${p.id}" value="${E}" oninput="onReqQtyChanged(${p.id}, ${p.quantity_pending}, ${x})" class="form-input" style="font-size: 11.5px; padding: 4px 6px; text-align: center; width: 100px; font-weight: 700; ${$?"background-color: #f1f5f9; color: #94a3b8; cursor: not-allowed;":""}" ${w?"disabled":""}>
                                            <div id="req_warn_${p.id}" style="${E<p.quantity_pending&&E>0?"":"display: none;"}">
                                                ${E<p.quantity_pending&&E>0?`<span style="color: #b45309; background: #fef3c7; border: 1px solid #fde68a; padding: 2px 6px; border-radius: 4px; font-size: 9.5px; font-weight: 700; display: inline-block; margin-top: 3px;">⚠️ Parcial: Quedan ${(p.quantity_pending-E).toFixed(2)} por stock</span>`:""}
                                            </div>
                                        </td>
                                        <td style="padding: 8px 10px; text-align: center;">
                                            ${h?'<span class="badge-tag" style="background:#e2e8f0; color:#475569; font-size:10px;">Completado</span>':$?`
                                                <div style="display: flex; flex-direction: column; gap: 3px; align-items: center;">
                                                    <span style="color: #ef4444; font-size: 9.5px; font-weight: 800;"><i class="fa-solid fa-ban"></i> Sin Stock</span>
                                                    <button type="button" onclick="closeModal('modalProjectRequisitionsInbox'); openSubstituteMaterialModal(${p.id}, ${p.material_id||0}, '${(p.material_name||"").replace(/'/g,"\\'")}', ${d.project_id})" class="btn-secondary" style="font-size: 9px; padding: 2px 6px; background: #fef3c7; color: #b45309; border-color: #fde68a; font-weight: 800;" title="Sustituir por otro insumo con inventario">
                                                        <i class="fa-solid fa-shuffle"></i> Sustituir
                                                    </button>
                                                    <button type="button" onclick="closeModal('modalProjectRequisitionsInbox'); openNewPayableModal(); setTimeout(() => { const pSel = document.getElementById('new_cxp_project_id'); if (pSel) pSel.value = '${d.project_id}'; const desc = document.getElementById('new_cxp_description'); if (desc) desc.value = 'Compra urgente de ${(p.material_name||"").replace(/'/g,"\\'")} para obra ${d.project_code}'; }, 200);" class="btn-secondary" style="font-size: 9px; padding: 2px 6px; background: #eff6ff; color: #1d4ed8; border-color: #bfdbfe; font-weight: 800;" title="Cargar CxP / Orden de Compra para este material">
                                                        <i class="fa-solid fa-cart-shopping"></i> Comprar
                                                    </button>
                                                </div>
                                              `:`
                                                <button type="button" onclick="quickDispatchSingleRequisition(${p.id}, ${d.project_id})" class="btn-secondary" style="font-size: 10px; padding: 3px 8px; border-radius: 4px; background: #e0f2fe; color: #0369a1; border-color: #bae6fd; font-weight: 700;" title="Despachar solo este ítem ahora">
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
                    <button type="button" onclick="submitDispatchProjectGroup(${d.project_id})" class="btn-primary" style="${y?"background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);":"background: linear-gradient(135deg, #059669 0%, #047857 100%);"} font-weight: 800; font-size: 12px; padding: 8px 18px; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        ${y?'<i class="fa-solid fa-clipboard-check"></i> Entregar Ítems en Taller y Emitir Vale de Control Interno':'<i class="fa-solid fa-truck-ramp-box"></i> Despachar Ítems Marcados y Emitir Guía de Traslado'} (${d.project_code})
                    </button>
                </div>
            </div>
        `}),c+=`
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin-top: 14px; flex-wrap: wrap; gap: 10px;">
            <div style="font-size: 12px; font-weight: 600; color: #475569;">
                Mostrando obras <span style="font-weight: 800; color: #0f172a;">${l+1} - ${Math.min(i,l+k)}</span> de <span style="font-weight: 800; color: #0f172a;">${i}</span> con requerimientos
            </div>
            <div style="display: flex; gap: 6px; align-items: center;">
                <button type="button" onclick="goToReqPage(${C-1})" class="btn-secondary" style="padding: 4px 10px; font-size: 11px;" ${C<=1?'disabled style="opacity: 0.5; cursor: not-allowed;"':""}>
                    <i class="fa-solid fa-chevron-left"></i> Anterior
                </button>
                <span style="font-size: 11.5px; font-weight: 700; color: #1e293b; padding: 0 8px;">
                    Página ${C} de ${r}
                </span>
                <button type="button" onclick="goToReqPage(${C+1})" class="btn-secondary" style="padding: 4px 10px; font-size: 11px;" ${C>=r?'disabled style="opacity: 0.5; cursor: not-allowed;"':""}>
                    Siguiente <i class="fa-solid fa-chevron-right"></i>
                </button>
            </div>
            <div style="display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: #475569;">
                <span>Por página:</span>
                <select onchange="changeReqPageSize(this.value)" style="border: 1px solid #cbd5e1; border-radius: 4px; padding: 3px 6px; font-size: 11px; background: white;">
                    <option value="2" ${k===2?"selected":""}>2 obras</option>
                    <option value="3" ${k===3?"selected":""}>3 obras</option>
                    <option value="5" ${k===5?"selected":""}>5 obras</option>
                    <option value="10" ${k===10?"selected":""}>10 obras</option>
                </select>
            </div>
        </div>
    `,e.innerHTML=c}function Ue(o){C=o,Q(ae,!1)}function Je(o){k=parseInt(o)||3,C=1,Q(ae,!1)}function Qe(o,t,e){const a=document.getElementById(`req_qty_${o}`),n=document.getElementById(`req_warn_${o}`);if(!a)return;let i=parseFloat(a.value)||0;if(i<0&&(i=0,a.value=0),i>t&&(alert(`⚠️ La cantidad a despachar (${i}) no puede ser mayor a lo solicitado (Saldo pendiente: ${t}). Se ajustó automáticamente.`),i=t,a.value=t),i>e&&(alert(`⚠️ Stock insuficiente en almacén/pañol: Solo hay ${e} unidades disponibles.`),i=e,a.value=e),n)if(i<t&&i>0){const r=(t-i).toFixed(2);n.style.display="block",n.innerHTML=`<span style="color: #b45309; background: #fef3c7; border: 1px solid #fde68a; padding: 2px 6px; border-radius: 4px; font-size: 9.5px; font-weight: 700; display: inline-block; margin-top: 3px;">⚠️ Entrega parcial: Quedarán ${r} pendientes por inventario.</span>`}else i===0?(n.style.display="block",n.innerHTML='<span style="color: #dc2626; background: #fee2e2; border: 1px solid #fecaca; padding: 2px 6px; border-radius: 4px; font-size: 9.5px; font-weight: 700; display: inline-block; margin-top: 3px;">⛔ Cantidad 0: No se incluirá en el traslado.</span>'):n.style.display="none"}function We(o,t){document.querySelectorAll(`.req-check-${o}`).forEach(e=>{e.disabled||(e.checked=t)})}async function Ke(o){var u,f,y,b,p,h,x,$;const t=document.querySelectorAll(`.req-check-${o}:checked`);if(!t||t.length===0){alert("⚠️ Por favor selecciona al menos un insumo disponible de la lista para despachar.");return}const e=[];let a=!1;for(const w of t){const E=parseInt(w.getAttribute("data-req-id")),M=parseFloat(w.getAttribute("data-stock")||0),v=parseFloat(w.getAttribute("data-pending")||0),I=document.getElementById(`req_qty_${E}`),_=parseFloat((I==null?void 0:I.value)||0);if(M<=0){alert("⛔ No se puede despachar un ítem con stock 0 en almacén."),I&&I.focus();return}if(_<=0){alert("⚠️ La cantidad a despachar para los ítems seleccionados debe ser mayor a 0."),I&&I.focus();return}if(_>v){alert(`⚠️ La cantidad a despachar (${_}) no puede ser mayor a lo solicitado (${v}).`),I&&I.focus();return}if(_>M){alert(`⚠️ Stock insuficiente: Solicitas ${_} pero solo hay ${M} en almacén.`),I&&I.focus();return}_<v&&(a=!0),e.push({requisition_id:E,quantity_to_dispatch:_})}const n=((u=document.getElementById(`req_is_internal_${o}`))==null?void 0:u.value)==="1";let i=null,r=null,l=null,s=null,c=null;if(!n&&(i=(((f=document.getElementById(`req_driver_${o}`))==null?void 0:f.value)||"").trim(),r=(((y=document.getElementById(`req_driver_ci_${o}`))==null?void 0:y.value)||"").trim(),l=(((b=document.getElementById(`req_plate_${o}`))==null?void 0:b.value)||"").trim(),s=(((p=document.getElementById(`req_vehicle_model_${o}`))==null?void 0:p.value)||"").trim(),c=(h=document.getElementById(`req_vehicle_sel_${o}`))==null?void 0:h.value,!i)){alert("⚠️ Para despachos a Obra Foránea, por favor ingresa o selecciona el Chofer / Conductor asignado."),(x=document.getElementById(`req_driver_${o}`))==null||x.focus();return}const d=((($=document.getElementById(`req_notes_${o}`))==null?void 0:$.value)||"").trim();let m=n?`¿Confirmas la entrega interna de ${e.length} insumo(s) para los trabajos en Taller Guacara?

Se emitirá el Vale de Control Interno de Almacén.`:`¿Confirmas el despacho de ${e.length} insumo(s) para la Obra Foránea?

Se descontará el stock en Almacén y se emitirá la Guía Oficial de Traslado.`;if(a&&(m+=`

⚠️ ADVERTENCIA: Uno o más ítems tienen una entrega menor a lo solicitado por disponibilidad de inventario. El resto quedará como saldo pendiente en la obra.`),!!confirm(m))try{const w={project_id:o,items:e,is_internal:n,driver_name:i,driver_id_doc:r,vehicle_plate:l,vehicle_model:s,asset_id:c&&c!=="externo"&&!isNaN(parseInt(c))?parseInt(c):null,notes:d},E=await U(`${V}/materials/dispatch-project-requisition`,{method:"POST",body:JSON.stringify(w)});if(E.ok){const M=await E.json();await oe(),await loadMaterialsList(),await J(o);const v=M.guide_number;confirm(`✅ ${M.message||"Despacho registrado exitosamente."}

Se ha emitido el documento N°: ${v}

¿Deseas abrir la Guía en pantalla completa ahora?`)&&typeof window.navigateToDispatchGuide=="function"&&(typeof closeModal=="function"&&closeModal("modalProjectRequisitionsInbox"),window.navigateToDispatchGuide(v))}else{const M=await E.json();alert("❌ Error al procesar despacho: "+(M.detail||JSON.stringify(M)))}}catch(w){console.error("Error submitting project requisition dispatch:",w),alert("❌ Error de comunicación: "+w.message)}}async function Ye(o,t){var b,p,h,x,$,w,E,M;const e=document.getElementById(`req_qty_${o}`),a=parseFloat((e==null?void 0:e.value)||0),n=document.querySelector(`.req-check-${t}[data-req-id="${o}"]`),i=parseFloat((n==null?void 0:n.getAttribute("data-stock"))||0),r=parseFloat((n==null?void 0:n.getAttribute("data-pending"))||0);if(i<=0){alert("⛔ No se puede despachar: Stock disponible en almacén es 0.");return}if(a<=0){alert("⚠️ Ingresa una cantidad válida mayor a 0 para despachar."),e&&e.focus();return}if(a>r){alert(`⚠️ La cantidad a despachar (${a}) no puede ser mayor a lo solicitado (${r}).`),e&&e.focus();return}if(a>i){alert(`⚠️ Stock insuficiente: Requieres ${a} pero solo hay ${i} en pañol.`),e&&e.focus();return}const l=((b=document.getElementById(`req_is_internal_${t}`))==null?void 0:b.value)==="1";let s=null,c=null,d=null,m=null,u=null;if(!l&&(s=(((p=document.getElementById(`req_driver_${t}`))==null?void 0:p.value)||"").trim(),c=(((h=document.getElementById(`req_driver_ci_${t}`))==null?void 0:h.value)||"").trim(),d=(((x=document.getElementById(`req_plate_${t}`))==null?void 0:x.value)||"").trim(),m=((($=document.getElementById(`req_vehicle_model_${t}`))==null?void 0:$.value)||"").trim(),u=(w=document.getElementById(`req_vehicle_sel_${t}`))==null?void 0:w.value,!s)){alert("⚠️ Para despachos a Obra Foránea, por favor ingresa o selecciona el Chofer / Conductor asignado."),(E=document.getElementById(`req_driver_${t}`))==null||E.focus();return}const f=(((M=document.getElementById(`req_notes_${t}`))==null?void 0:M.value)||"").trim();let y=l?`¿Confirmas la entrega rápida de este insumo (${a} unidades) en Taller Guacara?
Se generará el Vale de Control Interno.`:`¿Confirmas el despacho rápido de este insumo (${a} unidades) para la Obra Foránea?
Se generará la Guía Oficial de Traslado.`;if(a<r&&(y+=`

⚠️ ADVERTENCIA: La cantidad a entregar (${a}) es menor a lo solicitado (${r}) por inventario. Quedarán ${(r-a).toFixed(2)} pendientes.`),!!confirm(y))try{const v={project_id:t,items:[{requisition_id:o,quantity_to_dispatch:a}],is_internal:l,driver_name:s,driver_id_doc:c,vehicle_plate:d,vehicle_model:m,asset_id:u&&u!=="externo"&&!isNaN(parseInt(u))?parseInt(u):null,notes:f},I=await U(`${V}/materials/dispatch-project-requisition`,{method:"POST",body:JSON.stringify(v)});if(I.ok){const _=await I.json();await oe(),await loadMaterialsList(),await J(t);const g=_.guide_number;confirm(`✅ Despacho procesado exitosamente.

Se ha emitido la Guía Oficial N°: ${g}

¿Deseas ver la Guía de Despacho ahora?`)&&typeof window.navigateToDispatchGuide=="function"&&(typeof closeModal=="function"&&closeModal("modalProjectRequisitionsInbox"),window.navigateToDispatchGuide(g))}else{const _=await I.json();alert("❌ Error: "+(_.detail||JSON.stringify(_)))}}catch(v){console.error("Error in quick dispatch:",v),alert("❌ Error de comunicación: "+v.message)}}typeof window<"u"&&(window.loadProjectRequisitionsBadge=oe,window.openProjectRequisitionsInboxModal=Ge,window.loadProjectRequisitionsInbox=J,window.filterProjectRequisitionsView=ge,window.renderProjectRequisitionsGroups=Q,window.goToReqPage=Ue,window.changeReqPageSize=Je,window.onReqQtyChanged=Qe,window.toggleSelectAllProjectReqs=We,window.submitDispatchProjectGroup=Ke,window.quickDispatchSingleRequisition=Ye);
