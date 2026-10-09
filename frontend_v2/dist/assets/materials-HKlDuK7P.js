var O=window.API_BASE||window.location.origin+"/api/v1",S=window.allMaterials=window.allMaterials||[];window.allProjects=window.allProjects||[];window.allCategories=window.allCategories||[];window.allAssets=window.allAssets||[];window.allPersonnel=window.allPersonnel||[];function G(a,e={}){const t=sessionStorage.getItem("dalor_token")||localStorage.getItem("dalor_token")||window.authToken||"",o={...e.headers||{}};return t&&(o.Authorization="Bearer "+t),e.body&&!(e.body instanceof FormData)&&!o["Content-Type"]&&(o["Content-Type"]="application/json"),e.body instanceof FormData&&delete o["Content-Type"],window.fetch(a,{...e,headers:o})}function le(){const a=window.currentUser||JSON.parse(localStorage.getItem("dalor_user")||"null")||{},e=(a.role_name||a.role||a.username||"").toLowerCase();return e.includes("director")||e.includes("admin")}async function X(){const a=document.getElementById("materialsTableBody");if(!a)return;const e=le(),t=e?9:7;a.innerHTML=`<tr><td colspan="${t}" style="text-align: center; padding: 20px; color: #94a3b8;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando inventario de materiales...</td></tr>`;try{const n=await(await G(`${O}/materials/`)).json();S=n.materials||(Array.isArray(n)?n:[]);const i=document.getElementById("matTotalItemsCount"),r=document.getElementById("matTotalValuationCard"),l=document.getElementById("matTotalValuationUsd");if(i&&(i.innerText=n.total_items!==void 0?n.total_items:S.length),r&&(r.style.display=e?"inline-block":"none"),l&&e){const d=n.total_inventory_usd!==void 0?n.total_inventory_usd:S.reduce((c,s)=>c+(s.stock_quantity*s.unit_cost_usd||0),0);l.innerText=`$${d.toLocaleString("en-US",{minimumFractionDigits:2})} USD`}document.querySelectorAll(".director-cost-col").forEach(d=>{d.style.display=e?"":"none"}),ee(S);try{V()}catch(d){console.warn("Error populating material categories:",d)}loadProjectRequisitionsBadge();try{typeof populateSelectDropdowns=="function"&&populateSelectDropdowns()}catch(d){console.warn("Dropdown populator warning:",d)}}catch(o){console.error("Error loading materials:",o),a.innerHTML=`<tr><td colspan="${t}" style="text-align: center; color: #e11d48; padding: 20px;">Error al cargar inventario de materiales: ${o.message}</td></tr>`}}let de=[],D=1,se=15;function _e(a){D=a,H();const e=document.getElementById("materialsTableBody");e&&e.scrollIntoView({behavior:"smooth",block:"nearest"})}function ve(a){se=parseInt(a)||15,D=1,H()}function ee(a){de=Array.isArray(a)?a:S||[],D=1,H()}function H(){const a=document.getElementById("materialsTableBody");if(!a)return;const e=le(),t=e?9:7,o=de||[];if(o.length===0){a.innerHTML=`<tr><td colspan="${t}" style="text-align: center; padding: 20px; color: #94a3b8;">No se encontraron materiales registrados.</td></tr>`;const d=document.getElementById("materialsPaginationContainer");d&&(d.innerHTML="");return}const{startIndex:n,endIndex:i,currentPage:r}=(typeof window.renderPaginationControls=="function"?window.renderPaginationControls:renderPaginationControls)({containerId:"materialsPaginationContainer",totalItems:o.length,currentPage:D,pageSize:se,onPageChange:"goToMaterialsPage",onPageSizeChange:"changeMaterialsPageSize",itemLabel:"material(es) en catálogo",pageSizeOptions:[15,30,60,120]});D=r;const l=o.slice(n,i);a.innerHTML=l.map(d=>{const c=d.is_low_stock||d.stock_quantity<=d.min_stock_alert,s=Number(d.unit_cost_usd||0),m=Number(d.total_cost_usd||d.stock_quantity*s||0);return`
        <tr>
            <td style="font-weight: 800; color: var(--dalor-blue); font-family: monospace;">${d.code}</td>
            <td style="font-weight: 700; color: var(--dalor-navy);">${d.name}</td>
            <td><span style="font-size: 10px; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-weight: 700; color: #475569;">${d.category}</span></td>
            <td style="text-align: center; font-weight: 700;">${d.unit_measure}</td>
            <td style="text-align: center;">
                <span style="font-weight: 800; font-size: 13px; color: ${c?"#e11d48":"#059669"};">
                    ${(["und","unid","unidad","unidades","pza","pieza","piezas","rollo","rollos"].includes((d.unit_measure||"").toLowerCase())?Math.round(d.stock_quantity):Number((d.stock_quantity||0).toFixed(2))).toLocaleString()} ${d.unit_measure}
                </span>
                ${c?'<span style="display: block; font-size: 9px; color: #dc2626; font-weight: 800;">⚠️ STOCK CRÍTICO</span>':""}
            </td>
            <td style="text-align: center; color: #64748b; font-size: 11px;">${d.min_stock_alert} ${d.unit_measure}</td>
            ${e?`
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
        </tr>`}).join("")}function ce(){var o,n;const a=(((o=document.getElementById("filterMaterialSearch"))==null?void 0:o.value)||"").toLowerCase(),e=((n=document.getElementById("filterMaterialCategory"))==null?void 0:n.value)||"",t=S.filter(i=>{const r=!a||i.name.toLowerCase().includes(a)||i.code.toLowerCase().includes(a),l=!e||i.category===e;return r&&l});ee(t)}function V(){const a=["Planchas de Acero","Acero Estructural","Perfiles y Vigas","Tuberías y Bridas","Soldadura y Gases","Abrasivos y Discos","Tornillería y Fijaciones","Pinturas y Recubrimientos","Consumibles de Almacén"],e=(S||[]).map(i=>(i.category||"").trim()).filter(i=>i&&i.length>0),t=Array.from(new Set([...a,...e])).sort((i,r)=>i.localeCompare(r,"es")),o=document.getElementById("filterMaterialCategory");if(o){const i=o.value;o.innerHTML=`<option value="">-- Todas las Categorías (${t.length}) --</option>`+t.map(r=>`<option value="${r}">${r}</option>`).join(""),i&&t.includes(i)&&(o.value=i)}const n=document.getElementById("nmat_category");if(n){const i=n.value;n.innerHTML=t.map(r=>`<option value="${r}">${r}</option>`).join("")+'<option value="__NEW__" style="font-weight: bold; color: #2563eb;">➕ Crear Nueva Categoría...</option>',i&&(t.includes(i)||i==="__NEW__")&&(n.value=i)}}function $e(){const a=document.getElementById("nmat_category"),e=document.getElementById("nmat_category_custom");!a||!e||(a.value==="__NEW__"?(e.classList.remove("hidden"),e.style.display="block",e.required=!0,e.focus()):(e.classList.add("hidden"),e.style.display="none",e.required=!1,e.value=""))}function pe(a=!1){var o;a&&(window.openedMaterialModalFromCxp=!0);const e=document.getElementById("modalNewMaterial");e&&(e.style.zIndex="2200"),(o=document.getElementById("newMaterialForm"))==null||o.reset(),V();const t=document.getElementById("nmat_category_custom");t&&(t.classList.add("hidden"),t.style.display="none",t.required=!1,t.value=""),openModal("modalNewMaterial")}function Ee(){pe(!0)}async function Me(a){var o,n;a.preventDefault();let e=document.getElementById("nmat_category").value;if(e==="__NEW__"&&(e=(((o=document.getElementById("nmat_category_custom"))==null?void 0:o.value)||"").trim(),!e)){alert("⚠️ Por favor ingresa el nombre de la nueva categoría."),(n=document.getElementById("nmat_category_custom"))==null||n.focus();return}const t={code:document.getElementById("nmat_code").value.trim().toUpperCase(),name:document.getElementById("nmat_name").value.trim(),category:e,unit_measure:document.getElementById("nmat_unit").value,stock_quantity:parseFloat(document.getElementById("nmat_stock").value)||0,min_stock_alert:parseFloat(document.getElementById("nmat_alert").value)||5,unit_cost_usd:parseFloat(document.getElementById("nmat_cost").value)||0,location:document.getElementById("nmat_location").value.trim()||"Almacén Central Dalor"};try{const i=await G(`${O}/materials/`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)});if(i.ok){const r=await i.json().catch(()=>({}));closeModal("modalNewMaterial"),await X(),V();const l=document.getElementById("filterMaterialSearch");l&&(l.value=t.code||r.code||"",ce()),window.openedMaterialModalFromCxp?(window.openedMaterialModalFromCxp=!1,typeof window.onMaterialCreatedFromCxp=="function"&&window.onMaterialCreatedFromCxp(r)):alert(`✅ Material [${t.code}] "${t.name}" creado con éxito en categoría "${e}".`)}else{const r=await i.json().catch(()=>({}));alert("Error: "+(r.detail||JSON.stringify(r)))}}catch(i){alert("Error de conexión al crear material: "+i.message)}}async function Ie(a){let t=(window.allMaterials&&window.allMaterials.length>0?window.allMaterials:S||[]).find(m=>m&&(m.id==a||String(m.id)===String(a)));if(!t&&a)try{const m=await G(`${O}/materials/${a}`);m.ok&&(t=await m.json())}catch{}if(!t){alert("Material no encontrado en catálogo.");return}const o=document.getElementById("edit_mat_id"),n=document.getElementById("edit_mat_code"),i=document.getElementById("edit_mat_name"),r=document.getElementById("edit_mat_category"),l=document.getElementById("edit_mat_unit"),d=document.getElementById("edit_mat_min_stock"),c=document.getElementById("edit_mat_unit_cost"),s=document.getElementById("edit_mat_location");o&&(o.value=t.id),n&&(n.value=t.code||""),i&&(i.value=t.name||""),r&&(r.value=t.category||"Acero Estructural"),l&&(l.value=(t.unit_measure||"UND").toUpperCase()),d&&(d.value=t.min_stock_alert!==void 0?t.min_stock_alert:5),c&&(c.value=t.unit_cost_usd?Number(t.unit_cost_usd).toFixed(2):"0.00"),s&&(s.value=t.location||""),openModal("modalEditMaterial")}async function Ce(a){var n,i,r,l,d,c,s;a&&(typeof a.preventDefault=="function"&&a.preventDefault(),typeof a.stopPropagation=="function"&&a.stopPropagation());const e=(n=document.getElementById("edit_mat_id"))==null?void 0:n.value;if(!e)return;const t={name:(((i=document.getElementById("edit_mat_name"))==null?void 0:i.value)||"").trim(),category:(((r=document.getElementById("edit_mat_category"))==null?void 0:r.value)||"").trim(),unit_measure:(((l=document.getElementById("edit_mat_unit"))==null?void 0:l.value)||"").trim().toUpperCase(),min_stock_alert:parseFloat((d=document.getElementById("edit_mat_min_stock"))==null?void 0:d.value)||0,unit_cost_usd:parseFloat((c=document.getElementById("edit_mat_unit_cost"))==null?void 0:c.value)||0,location:(((s=document.getElementById("edit_mat_location"))==null?void 0:s.value)||"").trim()};if(!t.name){alert("Por favor ingrese el nombre del material.");return}const o=document.getElementById("btnSubmitEditMaterial");o&&(o.disabled=!0,o.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Guardando...');try{const m=await G(`${O}/materials/${e}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)});if(!m.ok){const u=await m.json();throw new Error(u.detail||"Error al actualizar material")}closeModal("modalEditMaterial"),typeof showToastNotification=="function"?showToastNotification("✅ Ficha de material actualizada correctamente.","success"):alert("✅ Material actualizado con éxito."),await X()}catch(m){alert("Error al actualizar material: "+m.message)}finally{o&&(o.disabled=!1,o.innerHTML='<i class="fa-solid fa-floppy-disk"></i> Guardar Cambios')}}typeof window<"u"&&(window.loadMaterialsList=X,window.goToMaterialsPage=_e,window.changeMaterialsPageSize=ve,window.renderMaterialsTable=ee,window.renderMaterialsTablePaginated=H,window.filterMaterialsTable=ce,window.populateMaterialCategories=V,window.onNewMaterialCategoryChanged=$e,window.openNewMaterialModal=pe,window.openNewMaterialModalFromCxp=Ee,window.submitCreateMaterial=Me,window.openEditMaterialModal=Ie,window.submitEditMaterial=Ce);var z=window.API_BASE||window.location.origin+"/api/v1",A=window.allMaterials=window.allMaterials||[];window.allProjects=window.allProjects||[];window.allCategories=window.allCategories||[];window.allAssets=window.allAssets||[];window.allPersonnel=window.allPersonnel||[];function L(a,e={}){const t=sessionStorage.getItem("dalor_token")||localStorage.getItem("dalor_token")||window.authToken||"",o={...e.headers||{}};return t&&(o.Authorization="Bearer "+t),e.body&&!(e.body instanceof FormData)&&!o["Content-Type"]&&(o["Content-Type"]="application/json"),e.body instanceof FormData&&delete o["Content-Type"],window.fetch(a,{...e,headers:o})}function te(a=null,e=1,t=0){const o=document.getElementById("me_materials_tbody");if(!o)return;const n=window.allMaterials&&window.allMaterials.length>0?window.allMaterials:A||[],i="me_row_"+Date.now()+"_"+Math.floor(Math.random()*1e3),r=document.createElement("tr");r.id=i,r.style.borderBottom="1px solid #e2e8f0";const l=n.map(d=>{const c=a&&d.id===a?"selected":"",s=d.unit_cost_usd||0;return`<option value="${d.id}" data-cost="${s}" data-unit="${d.unit_measure||"UND"}" data-stock="${d.stock_quantity||0}" ${c}>[${d.code}] ${d.name} (Stock: ${d.stock_quantity||0} ${d.unit_measure||"UND"})</option>`}).join("");if(r.innerHTML=`
        <td style="padding: 6px 8px;">
            <input type="text" placeholder="🔍 Escribe para filtrar material..." oninput="filterEntryRowDropdown(this)" style="font-size: 11px; padding: 4px 6px; width: 100%; margin-bottom: 4px; border: 1px solid #cbd5e1; border-radius: 4px; box-sizing: border-box; background: #f8fafc;">
            <select class="me-row-material form-select" onchange="onEntryMaterialRowChanged(this)" style="font-size: 11.5px; padding: 4px 6px; width: 100%;">
                <option value="">-- Seleccionar Material --</option>
                ${l}
            </select>
        </td>
        <td style="padding: 6px 8px; width: 110px;">
            <input type="number" step="0.01" min="0.01" value="${e}" class="me-row-qty form-input" style="font-size: 11.5px; padding: 4px 6px; text-align: right;" oninput="calcMaterialEntryTotal()">
        </td>
        <td style="padding: 6px 8px; width: 130px;">
            <input type="number" step="0.01" min="0" value="${t}" class="me-row-cost form-input" style="font-size: 11.5px; padding: 4px 6px; text-align: right;" oninput="calcMaterialEntryTotal()">
        </td>
        <td style="padding: 6px 8px; width: 120px; text-align: right; font-weight: 800; color: #059669; font-size: 12px;">
            <span class="me-row-subtotal">$0.00</span>
        </td>
        <td style="padding: 6px 8px; width: 36px; text-align: center;">
            <button type="button" onclick="removeMaterialEntryRow(this)" style="background: none; border: none; color: #dc2626; font-size: 18px; cursor: pointer; padding: 2px 6px; font-weight: bold; line-height: 1;" title="Eliminar este renglón">&times;</button>
        </td>
    `,o.appendChild(r),a){const d=r.querySelector(".me-row-material");d&&(d.value=a,ue(d))}else U()}function ke(a){const e=a.closest("tr");e&&e.remove();const t=document.getElementById("me_materials_tbody");t&&t.children.length===0?te():U()}function ue(a){const e=a.closest("tr");if(!e)return;const t=a.options[a.selectedIndex];if(t&&t.value){const o=e.querySelector(".me-row-cost");if(o&&(!parseFloat(o.value)||parseFloat(o.value)===0)){const n=parseFloat(t.getAttribute("data-cost"))||0;n>0&&(o.value=n.toFixed(2))}}U()}function Be(a){const e=(a.value||"").toLowerCase().trim(),t=a.closest("tr");if(!t)return;const o=t.querySelector(".me-row-material");if(!o)return;const n=window.allMaterials&&window.allMaterials.length>0?window.allMaterials:A||[],i=e?n.filter(l=>(l.name||"").toLowerCase().includes(e)||(l.code||"").toLowerCase().includes(e)):n,r=o.value;o.innerHTML=`<option value="">-- Seleccionar Material (${i.length}) --</option>`+i.map(l=>{const d=String(l.id)===String(r)?"selected":"";return`<option value="${l.id}" data-cost="${l.unit_cost_usd||0}" data-unit="${l.unit_measure||"UND"}" data-stock="${l.stock_quantity||0}" ${d}>[${l.code}] ${l.name} (Stock: ${l.stock_quantity||0} ${l.unit_measure||"UND"})</option>`}).join("")}function qe(a=null){const e=document.getElementById("materialEntryForm");e&&e.reset();const t=document.getElementById("me_materials_tbody");t&&(t.innerHTML=""),te(a,1,0),me(),openModal("modalMaterialEntry")}function U(){const a=document.querySelectorAll("#me_materials_tbody tr");let e=0;a.forEach(r=>{var m,u;const l=parseFloat((m=r.querySelector(".me-row-qty"))==null?void 0:m.value)||0,d=parseFloat((u=r.querySelector(".me-row-cost"))==null?void 0:u.value)||0,c=l*d;e+=c;const s=r.querySelector(".me-row-subtotal");s&&(s.innerText=`$${c.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`)});const t=document.getElementById("me_total_usd_preview");t&&(t.innerText=`$${e.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})} USD`);const o=window.bcvRate||window.currentBcvRate||1,n=e*(o>1?o:1),i=document.getElementById("me_total_bs_preview");i&&(i.innerText=o>1?`≈ Bs ${n.toLocaleString("es-VE",{minimumFractionDigits:2,maximumFractionDigits:2})} (Tasa BCV: ${o})`:"")}function me(){var t;const a=((t=document.getElementById("me_register_cxp"))==null?void 0:t.checked)||!1,e=document.getElementById("me_cash_payment_box");e&&(a?e.classList.add("hidden"):e.classList.remove("hidden"))}async function Se(a){var s,m,u,y,x,w,p,v,h,I,_,$,M,b,E;a&&(typeof a.preventDefault=="function"&&a.preventDefault(),typeof a.stopPropagation=="function"&&a.stopPropagation());const e=(((s=document.getElementById("me_supplier"))==null?void 0:s.value)||"").trim();if(!e)return alert("⚠️ Debe ingresar el nombre del Proveedor / Vendedor de la compra."),(m=document.getElementById("me_supplier"))==null||m.focus(),!1;const t=(((u=document.getElementById("me_doc"))==null?void 0:u.value)||"").trim();if(!t)return alert("⚠️ Debe ingresar el Nº de Factura o Guía de Entrega del Proveedor."),(y=document.getElementById("me_doc"))==null||y.focus(),!1;const o=document.querySelectorAll("#me_materials_tbody tr");if(!o||o.length===0)return alert("⚠️ Debe agregar al menos un renglón de material a la factura."),!1;const n=[];for(let g=0;g<o.length;g++){const f=o[g],C=parseInt((x=f.querySelector(".me-row-material"))==null?void 0:x.value),B=parseFloat((w=f.querySelector(".me-row-qty"))==null?void 0:w.value)||0,T=parseFloat((p=f.querySelector(".me-row-cost"))==null?void 0:p.value)||0;if(!C||isNaN(C))return alert(`⚠️ En el renglón #${g+1}: Debe seleccionar un material del catálogo.`),(v=f.querySelector(".me-row-material"))==null||v.focus(),!1;if(B<=0)return alert(`⚠️ En el renglón #${g+1}: La cantidad ingresada debe ser mayor a 0.`),(h=f.querySelector(".me-row-qty"))==null||h.focus(),!1;if(T<=0)return alert(`⚠️ En el renglón #${g+1}: El costo unitario en USD debe ser mayor a 0.`),(I=f.querySelector(".me-row-cost"))==null||I.focus(),!1;n.push({material_id:C,quantity:B,unit_cost_usd:T})}const i=((_=document.getElementById("me_register_cxp"))==null?void 0:_.checked)||!1,r=(($=document.getElementById("me_payment_channel"))==null?void 0:$.value)||"caja_chica_usd",l=(((M=document.getElementById("me_payment_ref"))==null?void 0:M.value)||"").trim();if(!i&&!l)return alert("⚠️ Para compras de contado, debe ingresar el Nº de Referencia o comprobante del pago de caja/banco."),(b=document.getElementById("me_payment_ref"))==null||b.focus(),!1;const d=(((E=document.getElementById("me_notes"))==null?void 0:E.value)||"").trim(),c={items:n,supplier_name:e,reference_doc:t,notes:d,performed_by:"Custodio de Almacén",register_in_cxp:i,due_days:15,payment_channel:r,payment_ref:l};try{const g=window.authToken||localStorage.getItem("dalor_token"),f={"Content-Type":"application/json",...g?{Authorization:`Bearer ${g}`}:{}},C=await L(`${z}/materials/entry`,{method:"POST",headers:f,body:JSON.stringify(c)});if(C.ok){const B=await C.json();alert(`✅ ${B.message||"Entrada registrada exitosamente"}`),closeModal("modalMaterialEntry");try{await loadInitialMasterData()}catch{}try{loadMaterialsList()}catch{}if(i&&typeof window.loadPayablesList=="function")try{window.loadPayablesList()}catch{}}else{const B=await C.json().catch(()=>({detail:"Error en el servidor al registrar entrada."}));alert("Error: "+(B.detail||JSON.stringify(B)))}}catch(g){console.error("[MATERIAL ENTRY ERROR]",g),alert("Error al procesar entrada de material: "+((g==null?void 0:g.message)||g))}return!1}function Te(a=null){document.getElementById("materialConsumeForm").reset(),populateSelectDropdowns();const e=document.getElementById("mc_material_search");e&&(e.value="");const t=document.getElementById("mc_material_id");a?(t.value=a,t.disabled=!0,t.style.opacity="0.7",t.style.cursor="not-allowed"):(t.disabled=!1,t.style.opacity="",t.style.cursor=""),fe(),oe(),ae(),openModal("modalMaterialConsume")}function Pe(a){const e=(a||"").toLowerCase().trim(),t=document.getElementById("mc_material_id");if(!t)return;const n=(window.allMaterials&&window.allMaterials.length>0?window.allMaterials:A||[]).filter(l=>(parseFloat(l.stock_quantity)||0)>0),i=e?n.filter(l=>(l.name||"").toLowerCase().includes(e)||(l.code||"").toLowerCase().includes(e)):n,r=t.value;t.innerHTML=`<option value="">-- Seleccionar Material (${i.length} con stock) --</option>`+i.map(l=>{const d=String(l.id)===String(r)?"selected":"";return`<option value="${l.id}" data-cost="${l.unit_cost_usd||0}" data-unit="${l.unit_measure||"UND"}" data-stock="${l.stock_quantity}" ${d}>[${l.code}] ${l.name} (Stock: ${l.stock_quantity} ${l.unit_measure||"UND"})</option>`}).join(""),oe()}function fe(){var t;const a=(t=document.getElementById("mc_project_id"))==null?void 0:t.value,e=document.getElementById("mc_guide_banner");e&&(e.style.display=a?"block":"none")}function oe(){const a=document.getElementById("mc_material_id");if(!a||!a.options[a.selectedIndex])return;const e=a.options[a.selectedIndex],t=e.getAttribute("data-stock")||"0",o=e.getAttribute("data-unit")||"UND",n=document.getElementById("mc_stock_available_label");n&&(n.innerText=`${parseFloat(t).toLocaleString()} ${o}`),ae()}function ae(){var i;const a=document.getElementById("mc_material_id"),e=parseFloat((i=document.getElementById("mc_quantity"))==null?void 0:i.value)||0;let t=0;a&&a.options[a.selectedIndex]&&(t=parseFloat(a.options[a.selectedIndex].getAttribute("data-cost"))||0);const o=e*t,n=document.getElementById("mc_cost_preview");n&&(n.value=`$${o.toLocaleString("en-US",{minimumFractionDigits:2})} USD`)}async function je(a){var s,m;a.preventDefault();const e=parseInt(document.getElementById("mc_material_id").value),t=parseFloat(document.getElementById("mc_quantity").value)||0,o=document.getElementById("mc_project_id").value,n=o?parseInt(o):null;if(!e||t<=0){alert("Selecciona un material y cantidad válida mayor a 0.");return}const r=(window.allMaterials&&window.allMaterials.length>0?window.allMaterials:A||[]).find(u=>u.id===e);if(r){const u=parseFloat(r.stock_quantity)||0;if(u<=0){alert(`⛔ Stock agotado: El material [${r.code}] ${r.name} no posee unidades disponibles en pañol (Stock: 0).`);return}if(t>u){alert(`⛔ Stock insuficiente: Has solicitado ${t} ${r.unit_measure||"UND"} de [${r.code}] ${r.name}, pero solo hay ${u} ${r.unit_measure||"UND"} disponibles en pañol.`);return}}const l=(((s=document.getElementById("mc_driver_name"))==null?void 0:s.value)||"").trim(),d=(((m=document.getElementById("mc_vehicle_plate"))==null?void 0:m.value)||"").trim(),c={material_id:e,quantity:t,project_id:n,destination:n?"Obra en Ejecución":"Taller Central",reference_doc:document.getElementById("mc_doc").value.trim()||"Requisición Interna",notes:document.getElementById("mc_notes").value.trim(),performed_by:document.getElementById("mc_performed_by").value.trim()||"Custodio de Almacén",driver_name:l,vehicle_plate:d};try{const u=window.authToken||localStorage.getItem("dalor_token")||null,y={"Content-Type":"application/json"};u&&(y.Authorization=`Bearer ${u}`);const x=await L(`${z}/materials/consume`,{method:"POST",headers:y,body:JSON.stringify(c)});if(x.ok){const w=await x.json();closeModal("modalMaterialConsume"),await loadInitialMasterData(),loadMaterialsList(),w.guide_number?confirm(`✅ ${w.message||"Despacho procesado exitosamente."}

Se ha emitido automáticamente la Guía de Despacho Oficial N°: ${w.guide_number}

¿Deseas abrirla en el módulo de Despachos ahora mismo?`)&&typeof window.navigateToDispatchGuide=="function"&&window.navigateToDispatchGuide(w.guide_number):alert(`✅ ${w.message||"Despacho registrado exitosamente."}`)}else{const w=await x.json();alert("Error: "+(w.detail||JSON.stringify(w)))}}catch(u){alert("Error al procesar despacho de material: "+u.message)}}async function De(a){let t=(window.allMaterials&&window.allMaterials.length>0?window.allMaterials:A||[]).find(c=>c&&(c.id==a||String(c.id)===String(a)));if(!t&&a)try{const c=await L(`${z}/materials/${a}`);c.ok&&(t=await c.json())}catch{}if(!t)return alert("Material no encontrado");const o=document.getElementById("calib_mat_id");o&&(o.value=t.id);const n=document.getElementById("calib_mat_display");n&&(n.value=`[${t.code}] ${t.name}`);const i=document.getElementById("calib_mat_current_stock");i&&(i.value=`${t.stock_quantity} ${t.unit_measure}`);const r=document.getElementById("calib_mat_new_stock");r&&(r.value=t.stock_quantity);const l=document.getElementById("calib_mat_reason");l&&(l.value="");const d=document.getElementById("calib_mat_password");d&&(d.value=""),typeof openModal=="function"&&openModal("modalCalibrateMaterial")}async function ze(a){var i,r,l,d,c;a&&a.preventDefault();const e=(i=document.getElementById("calib_mat_id"))==null?void 0:i.value,t=parseFloat((r=document.getElementById("calib_mat_new_stock"))==null?void 0:r.value),o=((d=(l=document.getElementById("calib_mat_reason"))==null?void 0:l.value)==null?void 0:d.trim())||"",n=((c=document.getElementById("calib_mat_password"))==null?void 0:c.value)||"";if(!e)return alert("Error: ID del material no identificado.");if(isNaN(t)||t<0)return alert("Ingrese un nuevo stock válido mayor o igual a 0.");if(!o)return alert("Debe indicar la justificación o motivo del ajuste físico.");if(!n)return alert("Debe ingresar su contraseña para autorizar la calibración.");try{const s=await L(`${z}/materials/${e}/calibrate`,{method:"PUT",body:JSON.stringify({new_stock_quantity:t,new_stock:t,reason:o,director_password:n})});if(!s.ok){const u=await s.json().catch(()=>({detail:"Error al calibrar stock"}));throw new Error(u.detail||"Error al calibrar stock")}const m=await s.json();alert(`✅ Stock calibrado exitosamente: nuevo stock ${m.new_stock}`),typeof closeModal=="function"&&closeModal("modalCalibrateMaterial"),loadMaterialsList()}catch(s){console.error("Error calibrating material:",s),alert(`❌ Error: ${s.message||s}`)}return!1}let Y=[];async function Ae(a=null){typeof openModal=="function"&&openModal("modalMaterialKardex");const e=document.getElementById("kardexSearchInput");e&&(e.value="");const t=document.getElementById("kardexTypeFilter");t&&(t.value=""),await ge(a)}async function ge(a=null){const e=document.getElementById("kardexTableBody");document.getElementById("kardexCountBadge"),e&&(e.innerHTML='<tr><td colspan="9" style="text-align: center; padding: 25px; color: #64748b;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando movimientos...</td></tr>');try{let t=`${z}/materials/movements?limit=200`;a&&(t+=`&material_id=${a}`);const o=await L(t);o.ok?(Y=await o.json(),ye(Y)):e&&(e.innerHTML='<tr><td colspan="9" style="text-align: center; padding: 25px; color: #ef4444;">Error al cargar historial de movimientos.</td></tr>')}catch(t){console.error("Error loading kardex:",t),e&&(e.innerHTML=`<tr><td colspan="9" style="text-align: center; padding: 25px; color: #ef4444;">Error: ${t.message||t}</td></tr>`)}}function Le(){var o,n;const a=(((o=document.getElementById("kardexSearchInput"))==null?void 0:o.value)||"").toLowerCase().trim(),e=((n=document.getElementById("kardexTypeFilter"))==null?void 0:n.value)||"",t=(Y||[]).filter(i=>e&&i.movement_type!==e?!1:a?`${i.material_code||""} ${i.material_name||""} ${i.reference_doc||""} ${i.performed_by||""} ${i.project_name||""} ${i.destination||""}`.toLowerCase().includes(a):!0);ye(t)}function ye(a){const e=document.getElementById("kardexTableBody"),t=document.getElementById("kardexCountBadge");if(t&&(t.textContent=`${a.length} movimientos`),!!e){if(!a||a.length===0){e.innerHTML='<tr><td colspan="9" style="text-align: center; padding: 25px; color: #94a3b8;">No se registraron movimientos que coincidan con los filtros.</td></tr>';return}e.innerHTML=a.map(o=>{let n="";return o.movement_type==="entrada_compra"?n='<span style="background: #ecfdf5; color: #047857; font-weight: 800; padding: 2px 7px; border-radius: 6px; font-size: 10.5px; border: 1px solid #a7f3d0;"><i class="fa-solid fa-cart-shopping"></i> Compra</span>':o.movement_type==="despacho_obra"?n='<span style="background: #e0f2fe; color: #0369a1; font-weight: 800; padding: 2px 7px; border-radius: 6px; font-size: 10.5px; border: 1px solid #bae6fd;"><i class="fa-solid fa-truck-arrow-right"></i> Despacho</span>':o.movement_type==="calibracion_inventario"?n='<span style="background: #fef3c7; color: #92400e; font-weight: 800; padding: 2px 7px; border-radius: 6px; font-size: 10.5px; border: 1px solid #fde68a;"><i class="fa-solid fa-scale-balanced"></i> Calibración</span>':n=`<span style="background: #f1f5f9; color: #475569; font-weight: 700; padding: 2px 6px; border-radius: 6px; font-size: 10px;">${o.movement_type}</span>`,`
            <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.15s ease;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'">
                <td style="padding: 7px 10px; color: #64748b; font-size: 11px; white-space: nowrap;">${o.movement_date||"-"}</td>
                <td style="padding: 7px 10px; text-align: center;">${n}</td>
                <td style="padding: 7px 10px; font-weight: 700; color: #1e293b;">
                    <span style="font-family: monospace; font-size: 10.5px; color: #2563eb; background: #eff6ff; padding: 1px 4px; border-radius: 4px; margin-right: 4px;">${o.material_code||"S/C"}</span>
                    ${o.material_name||"N/A"}
                </td>
                <td style="padding: 7px 10px; text-align: right; font-weight: 800; color: #0f172a;">
                    ${o.quantity} <span style="font-size: 10px; color: #64748b; font-weight: 400;">${o.unit_measure||"UND"}</span>
                </td>
                <td style="padding: 7px 10px; text-align: right; color: #475569;">$${(o.unit_cost_usd||0).toFixed(2)}</td>
                <td style="padding: 7px 10px; text-align: right; font-weight: 800; color: #059669;">$${(o.total_cost_usd||0).toFixed(2)}</td>
                <td style="padding: 7px 10px; color: #334155; font-size: 11px;">${o.project_name||o.destination||"-"}</td>
                <td style="padding: 7px 10px; font-family: monospace; font-size: 10.5px; color: #475569;">${o.reference_doc||"-"}</td>
                <td style="padding: 7px 10px; color: #64748b; font-size: 11px;">${o.performed_by||"-"}</td>
            </tr>
        `}).join("")}}typeof window<"u"&&(window.addMaterialEntryRow=te,window.removeMaterialEntryRow=ke,window.onEntryMaterialRowChanged=ue,window.filterEntryRowDropdown=Be,window.openMaterialEntryModal=qe,window.calcMaterialEntryTotal=U,window.toggleMaterialEntryPaymentBox=me,window.submitMaterialEntry=Se,window.openMaterialConsumeModal=Te,window.filterConsumeMaterialDropdown=Pe,window.onConsumeProjectChanged=fe,window.onConsumeMaterialSelected=oe,window.calcMaterialConsumeTotal=ae,window.submitMaterialConsume=je,window.openCalibrateMaterialModal=De,window.submitCalibrateMaterial=ze,window.openMaterialKardexModal=Ae,window.loadMaterialKardexList=ge,window.filterMaterialKardexTable=Le);var Re=window.API_BASE||window.location.origin+"/api/v1";window.allMaterials=window.allMaterials||[];var xe=window.allProjects=window.allProjects||[];window.allCategories=window.allCategories||[];var F=window.allAssets=window.allAssets||[],P=window.allPersonnel=window.allPersonnel||[];function Fe(a,e={}){const t=sessionStorage.getItem("dalor_token")||localStorage.getItem("dalor_token")||window.authToken||"",o={...e.headers||{}};return t&&(o.Authorization="Bearer "+t),e.body&&!(e.body instanceof FormData)&&!o["Content-Type"]&&(o["Content-Type"]="application/json"),e.body instanceof FormData&&delete o["Content-Type"],window.fetch(a,{...e,headers:o})}function Ne(){document.getElementById("transferGuideForm").reset(),populateSelectDropdowns(),ne(),openModal("modalTransferGuide")}function Oe(){const a=document.getElementById("tg_project_id");if(!a||!a.options[a.selectedIndex])return;const e=a.options[a.selectedIndex],t=parseInt(a.value),o=xe.find(d=>d.id===t),n=o&&o.location||e.getAttribute("data-location")||"Planta Centro - Morón",i=document.getElementById("tg_destination");i&&(i.value=n);const r=document.getElementById("tg_driver_name");if(r){let d=(P||[]).find(c=>c.current_project_id===t&&(c.role_title||"").toLowerCase().includes("chofer"));d||(d=(P||[]).find(c=>(c.role_title||"").toLowerCase().includes("chofer"))),!d&&P&&P.length>0&&(d=P[0]),d&&(r.value=d.full_name)}const l=document.getElementById("tg_vehicle_id");if(l){const d=(F||[]).find(c=>(c.asset_type==="vehiculo"||c.asset_type==="camioneta")&&c.current_project_id===t);if(d)l.value=d.id;else{const c=(F||[]).find(s=>s.asset_type==="vehiculo"||s.asset_type==="camioneta");c&&(l.value=c.id)}}ne(t)}function ne(a=null){const e=document.getElementById("tg_tools_checklist_container");if(!e)return;const t=F.filter(o=>o.asset_type!=="vehiculo"&&o.asset_type!=="camioneta");if(t.length===0){e.innerHTML='<span style="font-size:11px; color:#94a3b8;">No hay herramientas registradas.</span>';return}e.innerHTML=t.map(o=>{const n=a&&(o.current_project_id===a||o.current_location==="en_obra");return`

        <label style="display: flex; align-items: center; gap: 8px; padding: 4px 6px; border-radius: 4px; background: ${n?"#f0fdf4":"#f8fafc"}; font-size: 11px; cursor: pointer;" class="tg-tool-item" data-text="${o.asset_code} ${o.name} ${o.brand||""}">

            <input type="checkbox" value="${o.id}" data-name="${o.name}" data-code="${o.asset_code}" data-brand="${o.brand||""}" data-serial="${o.serial_number||""}" class="tg-tool-checkbox" ${n?"checked":""} style="width: 15px; height: 15px; accent-color: #0284c7;">

            <span style="font-weight: 800; color: var(--dalor-blue); font-family: monospace;">[${o.asset_code}]</span>

            <span style="font-weight: 600; color: var(--dalor-navy);">${o.name}</span>

            <span style="color: #64748b; font-size: 10px; margin-left: auto;">${o.brand||""}</span>

        </label>

        `}).join("")}function Ge(){var e;const a=(((e=document.getElementById("tg_tools_search"))==null?void 0:e.value)||"").toLowerCase();document.querySelectorAll(".tg-tool-item").forEach(t=>{const o=t.getAttribute("data-text").toLowerCase();t.style.display=o.includes(a)?"flex":"none"})}async function He(a){var u;a.preventDefault();const e=parseInt(document.getElementById("tg_project_id").value),t=document.getElementById("tg_destination").value.trim(),o=document.getElementById("tg_vehicle_id").value,n=document.getElementById("tg_driver_name").value.trim();if(!e){alert("Por favor selecciona un proyecto aprobado de destino.");return}const i=[];if(document.querySelectorAll(".tg-tool-checkbox:checked").forEach(y=>{i.push({id:parseInt(y.value),code:y.getAttribute("data-code"),name:y.getAttribute("data-name")})}),i.length===0){alert("Por favor selecciona al menos una herramienta o equipo a trasladar.");return}const r=xe.find(y=>y.id===e)||{code:"DAL-2026-001",name:"Proyecto Obra"},l=F.find(y=>y.id==o)||{name:"Camioneta Toyota Hilux"},d=`GT-DALOR-${Date.now().toString().slice(-6)}`;for(const y of i)try{await Fe(`${Re}/resources/assign`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({resource_type:"asset",resource_id:y.id,project_id:e,destination_location:t,custodian_name:n,action_type:"assign"})})}catch(x){console.error("Error asignando herramienta:",x)}closeModal("modalTransferGuide"),await loadInitialMasterData(),document.getElementById("subtab-res-tools")&&!document.getElementById("subtab-res-tools").classList.contains("hidden")&&loadToolsList();const c=document.getElementById("modalPrintPreviewContent"),s=document.getElementById("previewModalTitle");s&&(s.innerText="Guía Oficial de Traslado y Despacho de Equipos - Dalor C.A.");const m=new Date().toLocaleDateString("es-VE")+" "+new Date().toLocaleTimeString("es-VE",{hour:"2-digit",minute:"2-digit"});c&&(c.innerHTML=`

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

                    <td style="padding: 6px 10px; border: 1px solid #cbd5e1; width: 30%; font-weight: 700;">${t}</td>

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

                    ${i.map((y,x)=>`

                        <tr style="background: ${x%2===0?"#ffffff":"#f8fafc"};">

                            <td style="padding: 6px 10px; border: 1px solid #cbd5e1; text-align: center; font-weight: 800;">${x+1}</td>

                            <td style="padding: 6px 10px; border: 1px solid #cbd5e1; font-family: monospace; font-weight: 800; color: #0284c7;">${y.code}</td>

                            <td style="padding: 6px 10px; border: 1px solid #cbd5e1; font-weight: 700;">${y.name}</td>

                            <td style="padding: 6px 10px; border: 1px solid #cbd5e1; color: #64748b;">${y.brand||"-"}</td>

                            <td style="padding: 6px 10px; border: 1px solid #cbd5e1; font-family: monospace;">${y.serial||"S/N"}</td>

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

        `,openModal("modalPrintPreview"))}typeof window<"u"&&(window.openTransferGuideModal=Ne,window.onTransferGuideProjectChanged=Oe,window.renderTransferToolsChecklist=ne,window.filterTransferToolsChecklist=Ge,window.submitGenerateTransferGuide=He);var Ve=window.API_BASE||window.location.origin+"/api/v1",j=window.allMaterials=window.allMaterials||[],N=window.allProjects=window.allProjects||[];window.allCategories=window.allCategories||[];window.allAssets=window.allAssets||[];window.allPersonnel=window.allPersonnel||[];function Ue(a,e={}){const t=sessionStorage.getItem("dalor_token")||localStorage.getItem("dalor_token")||window.authToken||"",o={...e.headers||{}};return t&&(o.Authorization="Bearer "+t),e.body&&!(e.body instanceof FormData)&&!o["Content-Type"]&&(o["Content-Type"]="application/json"),e.body instanceof FormData&&delete o["Content-Type"],window.fetch(a,{...e,headers:o})}async function Je(){const a=document.getElementById("materialDeliveryForm");a&&a.reset();let e=window.allProjects&&window.allProjects.length>0?window.allProjects:N||[];if(e.length===0)try{const n=await Ue(`${Ve}/projects/`);n.ok&&(e=await n.json(),window.allProjects=N=e)}catch(n){console.error("Error cargando proyectos para despacho:",n)}const t=(e||[]).filter(n=>{const i=(n.status||"").toLowerCase().trim();return!["culminado","completado","cerrado","cancelado","finalizado","inactivo"].includes(i)}),o=document.getElementById("md_project_id");o&&(t.length===0?o.innerHTML='<option value="">⚠️ No hay obras abiertas disponibles para despacho</option>':o.innerHTML='<option value="">-- Seleccione Proyecto Aprobado Destino --</option>'+t.map(n=>`<option value="${n.id}" data-location="${n.location||""}">[${n.code}] ${n.name}</option>`).join("")),be(),openModal("modalMaterialDelivery")}function be(){const a=document.getElementById("md_project_id");if(!a||!a.options[a.selectedIndex])return;const e=parseInt(a.value),t=N.find(l=>l.id===e),o=t&&t.location||"Frente de Obra / Planta",n=document.getElementById("md_destination");n&&(n.value=o);const i=document.getElementById("md_dispatcher_name");i&&!i.value&&(i.value="Jefe de Materiales / Almacén Central");const r=document.getElementById("md_receiver_name");r&&!r.value&&(r.value=t&&t.client_name?`Supervisor / Residente (${t.client_name})`:"Supervisor Residente de Obra"),we()}function we(){const a=document.getElementById("md_materials_tbody");if(a)if(a.innerHTML="",j&&j.length>0)for(let e=0;e<Math.min(2,j.length);e++)R(j[e].name,j[e].unit_measure||"Pza",1);else R("Cable THW 12 AWG","Metro (m)",50),R("Breaker 2x30A","Pza",2)}function R(a="",e="Pza",t=1){const o=document.getElementById("md_materials_tbody");if(!o)return;const n=document.createElement("tr");n.style.borderBottom="1px solid #f1f5f9",n.innerHTML=`

        <td style="padding: 4px 6px;">

            <input type="text" class="form-input md-item-name" value="${a}" placeholder="Descripción del material..." style="padding: 4px 6px; font-size: 11px;" required>

        </td>

        <td style="padding: 4px 6px;">

            <input type="text" class="form-input md-item-unit" value="${e}" placeholder="Pza, m, etc." style="padding: 4px 6px; font-size: 11px; text-align: center;">

        </td>

        <td style="padding: 4px 6px;">

            <input type="number" step="0.01" class="form-input md-item-qty" value="${t}" style="padding: 4px 6px; font-size: 11px; text-align: right; font-weight: 800;" required>

        </td>

        <td style="padding: 4px 6px; text-align: center;">

            <button type="button" onclick="this.closest('tr').remove()" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 13px;">&times;</button>

        </td>

    `,o.appendChild(n)}function Ke(a){a.preventDefault();const e=parseInt(document.getElementById("md_project_id").value),t=document.getElementById("md_destination").value.trim(),o=document.getElementById("md_dispatcher_name").value.trim(),n=document.getElementById("md_receiver_name").value.trim(),i=document.getElementById("md_notes").value.trim(),r=[];if(document.querySelectorAll("#md_materials_tbody tr").forEach(u=>{var p,v,h;const y=(p=u.querySelector(".md-item-name"))==null?void 0:p.value.trim(),x=((v=u.querySelector(".md-item-unit"))==null?void 0:v.value.trim())||"Pza",w=parseFloat((h=u.querySelector(".md-item-qty"))==null?void 0:h.value)||0;y&&w>0&&r.push({name:y,unit:x,qty:w})}),r.length===0){alert("Por favor ingresa al menos un material con cantidad válida.");return}const l=N.find(u=>u.id===e)||{code:"DAL-2026-001",name:"Proyecto en Obra"},d=`NE-MAT-${Date.now().toString().slice(-6)}`,c=new Date().toLocaleDateString("es-VE")+" "+new Date().toLocaleTimeString("es-VE",{hour:"2-digit",minute:"2-digit"});closeModal("modalMaterialDelivery");const s=document.getElementById("modalPrintPreviewContent"),m=document.getElementById("previewModalTitle");m&&(m.innerText="Nota Oficial de Entrega de Materiales - Dalor C.A."),s&&(s.innerHTML=`

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

                    <td style="padding: 6px 10px; border: 1px solid #cbd5e1; width: 30%; font-weight: 700;">${t}</td>

                </tr>

                <tr>

                    <td style="padding: 6px 10px; border: 1px solid #cbd5e1; font-weight: 700; color: #475569;">Despachado Por:</td>

                    <td style="padding: 6px 10px; border: 1px solid #cbd5e1; font-weight: 700;">${o}</td>

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

                    ${r.map((u,y)=>`

                        <tr style="background: ${y%2===0?"#ffffff":"#f8fafc"};">

                            <td style="padding: 6px 10px; border: 1px solid #cbd5e1; text-align: center; font-weight: 800;">${y+1}</td>

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

                    <span style="color: #64748b; font-size: 10px;">${o}</span>

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

        `,openModal("modalPrintPreview"))}typeof window<"u"&&(window.openMaterialDeliveryModal=Je,window.onMaterialDeliveryProjectChanged=be,window.renderInitialMaterialDeliveryRows=we,window.addMaterialDeliveryRow=R,window.submitGenerateMaterialDeliveryGuide=Ke);var J=window.API_BASE||window.location.origin+"/api/v1";window.allMaterials=window.allMaterials||[];window.allProjects=window.allProjects||[];window.allCategories=window.allCategories||[];window.allAssets=window.allAssets||[];window.allPersonnel=window.allPersonnel||[];function K(a,e={}){const t=sessionStorage.getItem("dalor_token")||localStorage.getItem("dalor_token")||window.authToken||"",o={...e.headers||{}};return t&&(o.Authorization="Bearer "+t),e.body&&!(e.body instanceof FormData)&&!o["Content-Type"]&&(o["Content-Type"]="application/json"),e.body instanceof FormData&&delete o["Content-Type"],window.fetch(a,{...e,headers:o})}var Z=window.allProjectRequisitions=[];async function ie(){try{const a=await K(`${J}/materials/project-requisitions?status=pendiente`);if(!a.ok)return;const e=await a.json(),t=new Set;let o=!1;(e||[]).forEach(l=>{(l.quantity_pending||0)>0&&(l.project_id&&t.add(l.project_id),(l.quantity_dispatched||0)>0&&(o=!0))});const n=t.size;["badgePendingRequisitions","badgePendingRequisitionsBanner","badgePendingRequisitionsDispatch","badgePendingRequisitionsNav","badgePendingRequisitionsHeader"].forEach(l=>{const d=document.getElementById(l);d&&(d.innerText=n,d.style.display=n>0?"inline-block":"none",o?d.title=`${n} obra(s) con requerimientos (posee pendientes parciales)`:d.title=`${n} obra(s) con requerimientos pendientes`)});const r=document.getElementById("btnHeaderRequisitionsAlarm");r&&(n>0?(r.style.color="#dc2626",r.style.fontWeight="800",r.title=`🚨 ¡Atención Almacén! Hay ${n} obra(s) con solicitudes pendientes de despacho`):(r.style.color="",r.style.fontWeight="",r.title="Requisiciones de Materiales"))}catch(a){console.warn("Could not load project requisitions badge:",a)}}async function Qe(a=null){typeof openModal=="function"&&openModal("modalProjectRequisitionsInbox"),await Q(a)}async function Q(a=null){const e=document.getElementById("reqInboxContainer");if(e){e.innerHTML='<div style="text-align: center; padding: 40px; color: #94a3b8;"><i class="fa-solid fa-spinner fa-spin" style="font-size: 24px;"></i><p style="margin-top: 8px; font-size: 13px;">Cargando pedidos de insumos desde las Obras...</p></div>';try{const t=await K(`${J}/materials/project-requisitions`);if(!t.ok)throw new Error("Error al consultar requisiciones de proyectos.");const o=await t.json();Z=window.allProjectRequisitions=Array.isArray(o)?o:[];const n=document.getElementById("reqInboxProjectFilter");if(n){const i=a!==null?String(a):n.value,r=[],l=new Set;Z.forEach(c=>{c.project_id&&!l.has(c.project_id)&&(l.add(c.project_id),r.push({id:c.project_id,code:c.project_code||`PRJ-${c.project_id}`,name:c.project_name||"Sin Título"}))}),r.sort((c,s)=>(s.code||"").localeCompare(c.code||""));let d='<option value="">-- Todas las Obras / Proyectos --</option>';r.forEach(c=>{d+=`<option value="${c.id}" ${i==String(c.id)?"selected":""}>[${c.code}] ${c.name}</option>`}),n.innerHTML=d}he()}catch(t){console.error("Error loading project requisitions inbox:",t),e.innerHTML=`<div style="text-align: center; padding: 30px; color: #ef4444;"><i class="fa-solid fa-triangle-exclamation" style="font-size: 24px;"></i><p style="margin-top: 8px;">Error al cargar las requisiciones: ${t.message}</p></div>`}}}function he(){var n,i,r;const a=(((n=document.getElementById("reqInboxSearch"))==null?void 0:n.value)||"").toLowerCase().trim(),e=((i=document.getElementById("reqInboxProjectFilter"))==null?void 0:i.value)||"",t=((r=document.getElementById("reqInboxStatusFilter"))==null?void 0:r.value)||"pending";let o=Z||[];t==="pending"&&(o=o.filter(l=>(l.quantity_pending||0)>0&&l.status!=="despachado")),e&&(o=o.filter(l=>String(l.project_id)===String(e))),a&&(o=o.filter(l=>(l.material_name||"").toLowerCase().includes(a)||(l.material_code||"").toLowerCase().includes(a)||(l.project_code||"").toLowerCase().includes(a)||(l.project_name||"").toLowerCase().includes(a))),W(o)}function We(a){const e=document.getElementById(`req_vehicle_sel_${a}`),t=document.getElementById(`req_plate_${a}`),o=document.getElementById(`req_vehicle_model_${a}`);if(!e||!t||!o)return;const n=e.options[e.selectedIndex];if(!n||n.value===""||n.value==="externo"){n&&n.value==="externo"&&(t.value="",o.value="",t.placeholder="Placa flete (ej: A12BC3D)",o.placeholder="Modelo / Tipo Flete");return}const i=n.getAttribute("data-plate")||"",r=n.getAttribute("data-model")||"";t.value=i!=="S/P"?i:"",o.value=r}window.onReqVehicleChanged=We;function Ye(a){const e=document.getElementById(`req_driver_sel_${a}`),t=document.getElementById(`req_driver_${a}`),o=document.getElementById(`req_driver_ci_${a}`);if(!e||!t||!o)return;const n=e.options[e.selectedIndex];if(!n||n.value===""||n.value==="externo"){n&&n.value==="externo"&&(t.value="",o.value="",t.placeholder="Nombre del Chofer Contratado",o.placeholder="C.I. / Cédula");return}const i=n.getAttribute("data-name")||"",r=n.getAttribute("data-ci")||"";t.value=i,o.value=r}window.onReqDriverChanged=Ye;var k=window.currentReqPage=1,q=window.reqPageSize=3,re=window.currentFilteredReqs=[];function W(a,e=!0){const t=document.getElementById("reqInboxContainer");if(!t)return;if(e&&(k=1),re=a||[],!a||a.length===0){t.innerHTML=`
            <div style="text-align: center; padding: 50px 20px; background: #f8fafc; border-radius: 12px; border: 2px dashed #cbd5e1;">
                <i class="fa-solid fa-circle-check" style="font-size: 40px; color: #10b981; margin-bottom: 12px;"></i>
                <h4 style="font-size: 16px; font-weight: 800; color: #1e293b;">¡No hay requerimientos pendientes de preparación!</h4>
                <p style="font-size: 12px; color: #64748b; max-width: 480px; margin: 6px auto 0;">
                    Todas las solicitudes de insumos formuladas en Obras han sido despachadas o no coinciden con los filtros seleccionados.
                </p>
            </div>
        `;return}const o={};a.forEach(s=>{const m=s.project_id||0;o[m]||(o[m]={project_id:m,project_code:s.project_code||"S/P",project_name:s.project_name||"Sin Obra Asignada",project_location:s.project_location||"",is_internal:!!s.is_internal,max_req_id:s.id||0,items:[]}),o[m].items.push(s),(s.id||0)>o[m].max_req_id&&(o[m].max_req_id=s.id)});const n=Object.values(o);n.sort((s,m)=>(m.max_req_id||0)-(s.max_req_id||0)),n.forEach(s=>{s.items.sort((m,u)=>(u.id||0)-(m.id||0))});const i=n.length,r=Math.max(1,Math.ceil(i/q));k>r&&(k=r);const l=(k-1)*q,d=n.slice(l,l+q);let c="";d.forEach(s=>{const m=s.items.filter(p=>(p.quantity_pending||0)>0).length,u=s.items[0]||{},y=`${u.project_location||s.project_location||""} ${s.project_name||""} ${s.project_code||""}`.toLowerCase(),x=u.is_internal||s.is_internal||y.includes("sede")||y.includes("guacara")||y.includes("taller");let w="";if(x)w=`
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
            `;else{const p=u.project_vehicles||[],v=u.available_fleet||u.all_fleet||[],h=u.project_personnel||[],I=u.available_personnel||u.all_personnel||[],_=p.length>0,$=_&&p[0].plate!=="S/P"?p[0].plate:"",M=_&&(p[0].name||p[0].model)||"";let b='<option value="">-- Seleccionar Flota DALOR o Externo --</option>';p.length>0&&(b+='<optgroup label="🚗 Asignado a esta Obra (Prioridad)">',p.forEach((f,C)=>{const B=C===0?"selected":"";b+=`<option value="${f.id}" data-plate="${f.plate}" data-model="${f.name||f.model}" ${B}>[${f.code}] ${f.name} (${f.plate})</option>`}),b+="</optgroup>"),v.length>0&&(b+='<optgroup label="🚚 Otros Vehículos Disponibles en Base">',v.filter(f=>!p.some(C=>C.id===f.id)).forEach(f=>{b+=`<option value="${f.id}" data-plate="${f.plate}" data-model="${f.name||f.model}">[${f.code}] ${f.name} (${f.plate})</option>`}),b+="</optgroup>"),b+='<optgroup label="🏢 Flete Tercerizado / Externo">',b+=`<option value="externo" data-plate="" data-model="" ${_?"":"selected"}>Flete Externo / Retiro Cliente (Ingreso manual)</option>`,b+="</optgroup>";let g='<option value="">-- Seleccionar Chofer o Externo --</option>';h.length>0&&(g+='<optgroup label="🚗 Personal Asignado a esta Obra">',h.forEach(f=>{g+=`<option value="${f.id}" data-name="${f.name}" data-ci="${f.ci}">${f.name} (C.I: ${f.ci})</option>`}),g+="</optgroup>"),I.length>0&&(g+='<optgroup label="🏢 Chofer / Personal Disponible en Base">',I.filter(f=>!h.some(C=>C.id===f.id)).forEach(f=>{g+=`<option value="${f.id}" data-name="${f.name}" data-ci="${f.ci}">${f.name} (C.I: ${f.ci})</option>`}),g+="</optgroup>"),g+='<optgroup label="✍️ Chofer Contratado / Externo">',g+='<option value="externo" data-name="" data-ci="" selected>✍️ Chofer Externo / Contratado por Fuera (Ingreso manual)</option>',g+="</optgroup>",w=`
                <input type="hidden" id="req_is_internal_${s.project_id}" value="0">
                <div style="background: #f0f9ff; border: 1.5px solid #bae6fd; border-radius: 8px; padding: 12px 14px; margin-bottom: 12px; display: grid; grid-template-columns: 1.2fr 1.2fr 1.6fr; gap: 12px; align-items: start;">
                    <div>
                        <label style="font-size: 11px; font-weight: 800; color: #0369a1; display: flex; align-items: center; justify-content: space-between; margin-bottom: 3px;">
                            <span><i class="fa-solid fa-truck-pickup"></i> Vehículo para Obra Foránea</span>
                            <span style="font-size: 9.5px; color: #0284c7; font-weight: 700;">(Flota o Externo)</span>
                        </label>
                        <select id="req_vehicle_sel_${s.project_id}" onchange="onReqVehicleChanged(${s.project_id})" class="form-select" style="font-size: 11px; padding: 5px 8px; background: white; margin-bottom: 4px;">
                            ${b}
                        </select>
                        <div style="display: flex; gap: 6px;">
                            <input type="text" id="req_plate_${s.project_id}" value="${$}" placeholder="Placa (ej: A12BC3D)" class="form-input" style="font-size: 11px; padding: 4px 6px; font-weight: 700; width: 45%;" title="Placa del vehículo">
                            <input type="text" id="req_vehicle_model_${s.project_id}" value="${M}" placeholder="Modelo / Marca" class="form-input" style="font-size: 11px; padding: 4px 6px; width: 55%;" title="Modelo del vehículo">
                        </div>
                    </div>
                    <div>
                        <label style="font-size: 11px; font-weight: 800; color: #0369a1; display: flex; align-items: center; justify-content: space-between; margin-bottom: 3px;">
                            <span><i class="fa-solid fa-id-card"></i> Chofer Asignado al Traslado</span>
                            <span style="font-size: 9.5px; color: #0284c7; font-weight: 700;">(DALOR o Externo)</span>
                        </label>
                        <select id="req_driver_sel_${s.project_id}" onchange="onReqDriverChanged(${s.project_id})" class="form-select" style="font-size: 11px; padding: 5px 8px; background: white; margin-bottom: 4px;">
                            ${g}
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
            `}c+=`
            <div class="card" style="border: 1px solid #cbd5e1; border-radius: 10px; padding: 14px 18px; background: white; box-shadow: 0 1px 3px rgba(0,0,0,0.05); margin-bottom: 16px;">
                <!-- Header de Obra -->
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
                    <div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span style="background: ${x?"#0284c7":"#1e3a8a"}; color: white; font-weight: 800; font-size: 11px; padding: 3px 8px; border-radius: 6px; letter-spacing: 0.5px;">
                                <i class="${x?"fa-solid fa-warehouse":"fa-solid fa-building"}"></i> ${s.project_code}
                            </span>
                            <h4 style="font-size: 15px; font-weight: 800; color: #0f172a; margin: 0;">${s.project_name}</h4>
                            <span style="font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 4px; ${x?"background: #dcfce7; color: #15803d;":"background: #e0f2fe; color: #0369a1;"}">
                                ${x?"🏢 Sede Central":"📍 Obra Foránea (Traslado Externo)"}
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
                ${w}

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
                            ${s.items.map(p=>{const v=(p.quantity_pending||0)<=0||p.status==="despachado",h=p.stock_available||0,I=h<=0,_=v||I,$=_?0:Math.min(p.quantity_pending,h),M=I?'<span style="background: #fee2e2; color: #b91c1c; padding: 2px 7px; border-radius: 4px; font-weight: 800; font-size: 10.5px;"><i class="fa-solid fa-ban"></i> 0.00 (SIN STOCK)</span>':p.has_enough_stock?`<span style="background: #dcfce7; color: #15803d; padding: 2px 7px; border-radius: 4px; font-weight: 700; font-size: 10.5px;"><i class="fa-solid fa-circle-check"></i> ${h.toFixed(2)} ${p.unit_measure}</span>`:`<span style="background: #fef3c7; color: #b45309; padding: 2px 7px; border-radius: 4px; font-weight: 700; font-size: 10.5px;"><i class="fa-solid fa-triangle-exclamation"></i> ${h.toFixed(2)} ${p.unit_measure} (Parcial)</span>`;return`
                                    <tr style="border-bottom: 1px solid #f1f5f9; ${v?"background: #f8fafc; opacity: 0.65;":""} ${I&&!v?"background: #fff1f2;":""}">
                                        <td style="padding: 8px 10px; text-align: center;">
                                            <input type="checkbox" class="req-check-${s.project_id}" data-req-id="${p.id}" data-project-id="${s.project_id}" data-stock="${h}" data-pending="${p.quantity_pending}" ${_?"":"checked"} ${_?"disabled":""}>
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
                                        <td style="padding: 8px 10px; text-align: center; font-weight: 800; color: ${v?"#10b981":"#e11d48"};">
                                            ${v?"0.00 (Listo)":`${(p.quantity_pending||0).toFixed(2)} ${p.unit_measure}`}
                                        </td>
                                        <td style="padding: 8px 10px; text-align: center;">
                                            ${M}
                                        </td>
                                        <td style="padding: 8px 10px; text-align: center;">
                                            <input type="number" step="0.01" min="0" max="${Math.min(p.quantity_pending,h)}" id="req_qty_${p.id}" value="${$}" oninput="onReqQtyChanged(${p.id}, ${p.quantity_pending}, ${h})" class="form-input" style="font-size: 11.5px; padding: 4px 6px; text-align: center; width: 100px; font-weight: 700; ${I?"background-color: #f1f5f9; color: #94a3b8; cursor: not-allowed;":""}" ${_?"disabled":""}>
                                            <div id="req_warn_${p.id}" style="${$<p.quantity_pending&&$>0?"":"display: none;"}">
                                                ${$<p.quantity_pending&&$>0?`<span style="color: #b45309; background: #fef3c7; border: 1px solid #fde68a; padding: 2px 6px; border-radius: 4px; font-size: 9.5px; font-weight: 700; display: inline-block; margin-top: 3px;">⚠️ Parcial: Quedan ${(p.quantity_pending-$).toFixed(2)} por stock</span>`:""}
                                            </div>
                                        </td>
                                        <td style="padding: 8px 10px; text-align: center;">
                                            ${v?'<span class="badge-tag" style="background:#e2e8f0; color:#475569; font-size:10px;">Completado</span>':I?`
                                                <div style="display: flex; flex-direction: column; gap: 3px; align-items: center;">
                                                    <span style="color: #ef4444; font-size: 9.5px; font-weight: 800;"><i class="fa-solid fa-ban"></i> Sin Stock</span>
                                                    <button type="button" onclick="closeModal('modalProjectRequisitionsInbox'); openSubstituteMaterialModal(${p.id}, ${p.material_id||0}, '${(p.material_name||"").replace(/'/g,"\\'")}', ${s.project_id})" class="btn-secondary" style="font-size: 9px; padding: 2px 6px; background: #fef3c7; color: #b45309; border-color: #fde68a; font-weight: 800;" title="Sustituir por otro insumo con inventario">
                                                        <i class="fa-solid fa-shuffle"></i> Sustituir
                                                    </button>
                                                    <button type="button" onclick="closeModal('modalProjectRequisitionsInbox'); openNewPayableModal(); setTimeout(() => { const pSel = document.getElementById('new_cxp_project_id'); if (pSel) pSel.value = '${s.project_id}'; const desc = document.getElementById('new_cxp_description'); if (desc) desc.value = 'Compra urgente de ${(p.material_name||"").replace(/'/g,"\\'")} para obra ${s.project_code}'; }, 200);" class="btn-secondary" style="font-size: 9px; padding: 2px 6px; background: #eff6ff; color: #1d4ed8; border-color: #bfdbfe; font-weight: 800;" title="Cargar CxP / Orden de Compra para este material">
                                                        <i class="fa-solid fa-cart-shopping"></i> Comprar
                                                    </button>
                                                </div>
                                              `:`
                                                <button type="button" onclick="quickDispatchSingleRequisition(${p.id}, ${s.project_id})" class="btn-secondary" style="font-size: 10px; padding: 3px 8px; border-radius: 4px; background: #e0f2fe; color: #0369a1; border-color: #bae6fd; font-weight: 700;" title="Despachar solo este ítem ahora">
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
                    <button type="button" onclick="submitDispatchProjectGroup(${s.project_id})" class="btn-primary" style="${x?"background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);":"background: linear-gradient(135deg, #059669 0%, #047857 100%);"} font-weight: 800; font-size: 12px; padding: 8px 18px; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        ${x?'<i class="fa-solid fa-clipboard-check"></i> Entregar Ítems en Taller y Emitir Vale de Control Interno':'<i class="fa-solid fa-truck-ramp-box"></i> Despachar Ítems Marcados y Emitir Guía de Traslado'} (${s.project_code})
                    </button>
                </div>
            </div>
        `}),c+=`
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin-top: 14px; flex-wrap: wrap; gap: 10px;">
            <div style="font-size: 12px; font-weight: 600; color: #475569;">
                Mostrando obras <span style="font-weight: 800; color: #0f172a;">${l+1} - ${Math.min(i,l+q)}</span> de <span style="font-weight: 800; color: #0f172a;">${i}</span> con requerimientos
            </div>
            <div style="display: flex; gap: 6px; align-items: center;">
                <button type="button" onclick="goToReqPage(${k-1})" class="btn-secondary" style="padding: 4px 10px; font-size: 11px;" ${k<=1?'disabled style="opacity: 0.5; cursor: not-allowed;"':""}>
                    <i class="fa-solid fa-chevron-left"></i> Anterior
                </button>
                <span style="font-size: 11.5px; font-weight: 700; color: #1e293b; padding: 0 8px;">
                    Página ${k} de ${r}
                </span>
                <button type="button" onclick="goToReqPage(${k+1})" class="btn-secondary" style="padding: 4px 10px; font-size: 11px;" ${k>=r?'disabled style="opacity: 0.5; cursor: not-allowed;"':""}>
                    Siguiente <i class="fa-solid fa-chevron-right"></i>
                </button>
            </div>
            <div style="display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: #475569;">
                <span>Por página:</span>
                <select onchange="changeReqPageSize(this.value)" style="border: 1px solid #cbd5e1; border-radius: 4px; padding: 3px 6px; font-size: 11px; background: white;">
                    <option value="2" ${q===2?"selected":""}>2 obras</option>
                    <option value="3" ${q===3?"selected":""}>3 obras</option>
                    <option value="5" ${q===5?"selected":""}>5 obras</option>
                    <option value="10" ${q===10?"selected":""}>10 obras</option>
                </select>
            </div>
        </div>
    `,t.innerHTML=c}function Ze(a){k=a,W(re,!1)}function Xe(a){q=parseInt(a)||3,k=1,W(re,!1)}function et(a,e,t){const o=document.getElementById(`req_qty_${a}`),n=document.getElementById(`req_warn_${a}`);if(!o)return;let i=parseFloat(o.value)||0;if(i<0&&(i=0,o.value=0),i>e&&(alert(`⚠️ La cantidad a despachar (${i}) no puede ser mayor a lo solicitado (Saldo pendiente: ${e}). Se ajustó automáticamente.`),i=e,o.value=e),i>t&&(alert(`⚠️ Stock insuficiente en almacén/pañol: Solo hay ${t} unidades disponibles.`),i=t,o.value=t),n)if(i<e&&i>0){const r=(e-i).toFixed(2);n.style.display="block",n.innerHTML=`<span style="color: #b45309; background: #fef3c7; border: 1px solid #fde68a; padding: 2px 6px; border-radius: 4px; font-size: 9.5px; font-weight: 700; display: inline-block; margin-top: 3px;">⚠️ Entrega parcial: Quedarán ${r} pendientes por inventario.</span>`}else i===0?(n.style.display="block",n.innerHTML='<span style="color: #dc2626; background: #fee2e2; border: 1px solid #fecaca; padding: 2px 6px; border-radius: 4px; font-size: 9.5px; font-weight: 700; display: inline-block; margin-top: 3px;">⛔ Cantidad 0: No se incluirá en el traslado.</span>'):n.style.display="none"}function tt(a,e){document.querySelectorAll(`.req-check-${a}`).forEach(t=>{t.disabled||(t.checked=e)})}async function ot(a){var u,y,x,w,p,v,h,I;const e=document.querySelectorAll(`.req-check-${a}:checked`);if(!e||e.length===0){alert("⚠️ Por favor selecciona al menos un insumo disponible de la lista para despachar.");return}const t=[];let o=!1;for(const _ of e){const $=parseInt(_.getAttribute("data-req-id")),M=parseFloat(_.getAttribute("data-stock")||0),b=parseFloat(_.getAttribute("data-pending")||0),E=document.getElementById(`req_qty_${$}`),g=parseFloat((E==null?void 0:E.value)||0);if(M<=0){alert("⛔ No se puede despachar un ítem con stock 0 en almacén."),E&&E.focus();return}if(g<=0){alert("⚠️ La cantidad a despachar para los ítems seleccionados debe ser mayor a 0."),E&&E.focus();return}if(g>b){alert(`⚠️ La cantidad a despachar (${g}) no puede ser mayor a lo solicitado (${b}).`),E&&E.focus();return}if(g>M){alert(`⚠️ Stock insuficiente: Solicitas ${g} pero solo hay ${M} en almacén.`),E&&E.focus();return}g<b&&(o=!0),t.push({requisition_id:$,quantity_to_dispatch:g})}const n=((u=document.getElementById(`req_is_internal_${a}`))==null?void 0:u.value)==="1";let i=null,r=null,l=null,d=null,c=null;if(!n&&(i=(((y=document.getElementById(`req_driver_${a}`))==null?void 0:y.value)||"").trim(),r=(((x=document.getElementById(`req_driver_ci_${a}`))==null?void 0:x.value)||"").trim(),l=(((w=document.getElementById(`req_plate_${a}`))==null?void 0:w.value)||"").trim(),d=(((p=document.getElementById(`req_vehicle_model_${a}`))==null?void 0:p.value)||"").trim(),c=(v=document.getElementById(`req_vehicle_sel_${a}`))==null?void 0:v.value,!i)){alert("⚠️ Para despachos a Obra Foránea, por favor ingresa o selecciona el Chofer / Conductor asignado."),(h=document.getElementById(`req_driver_${a}`))==null||h.focus();return}const s=(((I=document.getElementById(`req_notes_${a}`))==null?void 0:I.value)||"").trim();let m=n?`¿Confirmas la entrega interna de ${t.length} insumo(s) para los trabajos en Taller Guacara?

Se emitirá el Vale de Control Interno de Almacén.`:`¿Confirmas el despacho de ${t.length} insumo(s) para la Obra Foránea?

Se descontará el stock en Almacén y se emitirá la Guía Oficial de Traslado.`;if(o&&(m+=`

⚠️ ADVERTENCIA: Uno o más ítems tienen una entrega menor a lo solicitado por disponibilidad de inventario. El resto quedará como saldo pendiente en la obra.`),!!confirm(m))try{const _={project_id:a,items:t,is_internal:n,driver_name:i,driver_id_doc:r,vehicle_plate:l,vehicle_model:d,asset_id:c&&c!=="externo"&&!isNaN(parseInt(c))?parseInt(c):null,notes:s},$=await K(`${J}/materials/dispatch-project-requisition`,{method:"POST",body:JSON.stringify(_)});if($.ok){const M=await $.json();await ie(),await loadMaterialsList(),await Q(a);const b=M.guide_number;confirm(`✅ ${M.message||"Despacho registrado exitosamente."}

Se ha emitido el documento N°: ${b}

¿Deseas abrir la Guía en pantalla completa ahora?`)&&typeof window.navigateToDispatchGuide=="function"&&(typeof closeModal=="function"&&closeModal("modalProjectRequisitionsInbox"),window.navigateToDispatchGuide(b))}else{const M=await $.json();alert("❌ Error al procesar despacho: "+(M.detail||JSON.stringify(M)))}}catch(_){console.error("Error submitting project requisition dispatch:",_),alert("❌ Error de comunicación: "+_.message)}}async function at(a,e){var w,p,v,h,I,_,$,M;const t=document.getElementById(`req_qty_${a}`),o=parseFloat((t==null?void 0:t.value)||0),n=document.querySelector(`.req-check-${e}[data-req-id="${a}"]`),i=parseFloat((n==null?void 0:n.getAttribute("data-stock"))||0),r=parseFloat((n==null?void 0:n.getAttribute("data-pending"))||0);if(i<=0){alert("⛔ No se puede despachar: Stock disponible en almacén es 0.");return}if(o<=0){alert("⚠️ Ingresa una cantidad válida mayor a 0 para despachar."),t&&t.focus();return}if(o>r){alert(`⚠️ La cantidad a despachar (${o}) no puede ser mayor a lo solicitado (${r}).`),t&&t.focus();return}if(o>i){alert(`⚠️ Stock insuficiente: Requieres ${o} pero solo hay ${i} en pañol.`),t&&t.focus();return}const l=((w=document.getElementById(`req_is_internal_${e}`))==null?void 0:w.value)==="1";let d=null,c=null,s=null,m=null,u=null;if(!l&&(d=(((p=document.getElementById(`req_driver_${e}`))==null?void 0:p.value)||"").trim(),c=(((v=document.getElementById(`req_driver_ci_${e}`))==null?void 0:v.value)||"").trim(),s=(((h=document.getElementById(`req_plate_${e}`))==null?void 0:h.value)||"").trim(),m=(((I=document.getElementById(`req_vehicle_model_${e}`))==null?void 0:I.value)||"").trim(),u=(_=document.getElementById(`req_vehicle_sel_${e}`))==null?void 0:_.value,!d)){alert("⚠️ Para despachos a Obra Foránea, por favor ingresa o selecciona el Chofer / Conductor asignado."),($=document.getElementById(`req_driver_${e}`))==null||$.focus();return}const y=(((M=document.getElementById(`req_notes_${e}`))==null?void 0:M.value)||"").trim();let x=l?`¿Confirmas la entrega rápida de este insumo (${o} unidades) en Taller Guacara?
Se generará el Vale de Control Interno.`:`¿Confirmas el despacho rápido de este insumo (${o} unidades) para la Obra Foránea?
Se generará la Guía Oficial de Traslado.`;if(o<r&&(x+=`

⚠️ ADVERTENCIA: La cantidad a entregar (${o}) es menor a lo solicitado (${r}) por inventario. Quedarán ${(r-o).toFixed(2)} pendientes.`),!!confirm(x))try{const b={project_id:e,items:[{requisition_id:a,quantity_to_dispatch:o}],is_internal:l,driver_name:d,driver_id_doc:c,vehicle_plate:s,vehicle_model:m,asset_id:u&&u!=="externo"&&!isNaN(parseInt(u))?parseInt(u):null,notes:y},E=await K(`${J}/materials/dispatch-project-requisition`,{method:"POST",body:JSON.stringify(b)});if(E.ok){const g=await E.json();await ie(),await loadMaterialsList(),await Q(e);const f=g.guide_number;confirm(`✅ Despacho procesado exitosamente.

Se ha emitido la Guía Oficial N°: ${f}

¿Deseas ver la Guía de Despacho ahora?`)&&typeof window.navigateToDispatchGuide=="function"&&(typeof closeModal=="function"&&closeModal("modalProjectRequisitionsInbox"),window.navigateToDispatchGuide(f))}else{const g=await E.json();alert("❌ Error: "+(g.detail||JSON.stringify(g)))}}catch(b){console.error("Error in quick dispatch:",b),alert("❌ Error de comunicación: "+b.message)}}typeof window<"u"&&(window.loadProjectRequisitionsBadge=ie,window.openProjectRequisitionsInboxModal=Qe,window.loadProjectRequisitionsInbox=Q,window.filterProjectRequisitionsView=he,window.renderProjectRequisitionsGroups=W,window.goToReqPage=Ze,window.changeReqPageSize=Xe,window.onReqQtyChanged=et,window.toggleSelectAllProjectReqs=tt,window.submitDispatchProjectGroup=ot,window.quickDispatchSingleRequisition=at);
