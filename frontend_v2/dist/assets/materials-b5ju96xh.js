var A=window.API_BASE||window.location.origin+"/api/v1",j=window.allMaterials=window.allMaterials||[];window.allProjects=window.allProjects||[];window.allCategories=window.allCategories||[];window.allAssets=window.allAssets||[];window.allPersonnel=window.allPersonnel||[];function R(o,t={}){const e=sessionStorage.getItem("dalor_token")||localStorage.getItem("dalor_token")||window.authToken||"",a={...t.headers||{}};return e&&(a.Authorization="Bearer "+e),t.body&&!(t.body instanceof FormData)&&!a["Content-Type"]&&(a["Content-Type"]="application/json"),t.body instanceof FormData&&delete a["Content-Type"],window.fetch(o,{...t,headers:a})}function ue(){const o=window.currentUser||JSON.parse(localStorage.getItem("dalor_user")||"null")||{},t=(o.role_name||o.role||o.username||"").toLowerCase();return t.includes("director")||t.includes("admin")}async function J(){const o=document.getElementById("materialsTableBody");if(!o)return;const t=ue(),e=t?9:7;o.innerHTML=`<tr><td colspan="${e}" style="text-align: center; padding: 20px; color: #94a3b8;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando inventario de materiales...</td></tr>`;try{const n=await(await R(`${A}/materials/`)).json();j=n.materials||(Array.isArray(n)?n:[]);const i=document.getElementById("matTotalItemsCount"),r=document.getElementById("matTotalValuationCard"),l=document.getElementById("matTotalValuationUsd");if(i&&(i.innerText=n.total_items!==void 0?n.total_items:j.length),r&&(r.style.display=t?"inline-block":"none"),l&&t){const s=n.total_inventory_usd!==void 0?n.total_inventory_usd:j.reduce((c,d)=>c+(d.stock_quantity*d.unit_cost_usd||0),0);l.innerText=`$${s.toLocaleString("en-US",{minimumFractionDigits:2})} USD`}document.querySelectorAll(".director-cost-col").forEach(s=>{s.style.display=t?"":"none"}),ie(j);try{K()}catch(s){console.warn("Error populating material categories:",s)}loadProjectRequisitionsBadge();try{typeof populateSelectDropdowns=="function"&&populateSelectDropdowns()}catch(s){console.warn("Dropdown populator warning:",s)}}catch(a){console.error("Error loading materials:",a),o.innerHTML=`<tr><td colspan="${e}" style="text-align: center; color: #e11d48; padding: 20px;">Error al cargar inventario de materiales: ${a.message}</td></tr>`}}let me=[],z=1,fe=15;function ke(o){z=o,Q();const t=document.getElementById("materialsTableBody");t&&t.scrollIntoView({behavior:"smooth",block:"nearest"})}function Ce(o){fe=parseInt(o)||15,z=1,Q()}function ie(o){me=Array.isArray(o)?o:j||[],z=1,Q()}function Q(){const o=document.getElementById("materialsTableBody");if(!o)return;const t=ue(),e=t?9:7,a=me||[];if(a.length===0){o.innerHTML=`<tr><td colspan="${e}" style="text-align: center; padding: 20px; color: #94a3b8;">No se encontraron materiales registrados.</td></tr>`;const s=document.getElementById("materialsPaginationContainer");s&&(s.innerHTML="");return}const{startIndex:n,endIndex:i,currentPage:r}=(typeof window.renderPaginationControls=="function"?window.renderPaginationControls:renderPaginationControls)({containerId:"materialsPaginationContainer",totalItems:a.length,currentPage:z,pageSize:fe,onPageChange:"goToMaterialsPage",onPageSizeChange:"changeMaterialsPageSize",itemLabel:"material(es) en catálogo",pageSizeOptions:[15,30,60,120]});z=r;const l=a.slice(n,i);o.innerHTML=l.map(s=>{const c=s.is_low_stock||s.stock_quantity<=s.min_stock_alert,d=Number(s.unit_cost_usd||0),y=Number(s.total_cost_usd||s.stock_quantity*d||0);return`
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
                <td style="text-align: right; font-weight: 900; color: var(--dalor-navy);">$${y.toLocaleString("en-US",{minimumFractionDigits:2})}</td>
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
        </tr>`}).join("")}function ge(){var a,n;const o=(((a=document.getElementById("filterMaterialSearch"))==null?void 0:a.value)||"").toLowerCase(),t=((n=document.getElementById("filterMaterialCategory"))==null?void 0:n.value)||"",e=j.filter(i=>{const r=!o||i.name.toLowerCase().includes(o)||i.code.toLowerCase().includes(o),l=!t||i.category===t;return r&&l});ie(e)}function K(){const o=["Planchas de Acero","Acero Estructural","Perfiles y Vigas","Tuberías y Bridas","Soldadura y Gases","Abrasivos y Discos","Tornillería y Fijaciones","Pinturas y Recubrimientos","Consumibles de Almacén"],t=(j||[]).map(i=>(i.category||"").trim()).filter(i=>i&&i.length>0),e=Array.from(new Set([...o,...t])).sort((i,r)=>i.localeCompare(r,"es")),a=document.getElementById("filterMaterialCategory");if(a){const i=a.value;a.innerHTML=`<option value="">-- Todas las Categorías (${e.length}) --</option>`+e.map(r=>`<option value="${r}">${r}</option>`).join(""),i&&e.includes(i)&&(a.value=i)}const n=document.getElementById("nmat_category");if(n){const i=n.value;n.innerHTML=e.map(r=>`<option value="${r}">${r}</option>`).join("")+'<option value="__NEW__" style="font-weight: bold; color: #2563eb;">➕ Crear Nueva Categoría...</option>',i&&(e.includes(i)||i==="__NEW__")&&(n.value=i)}}function Be(){const o=document.getElementById("nmat_category"),t=document.getElementById("nmat_category_custom");!o||!t||(o.value==="__NEW__"?(t.classList.remove("hidden"),t.style.display="block",t.required=!0,t.focus()):(t.classList.add("hidden"),t.style.display="none",t.required=!1,t.value=""))}function ye(o=!1){var a;o&&(window.openedMaterialModalFromCxp=!0);const t=document.getElementById("modalNewMaterial");t&&(t.style.zIndex="2200"),(a=document.getElementById("newMaterialForm"))==null||a.reset(),K();const e=document.getElementById("nmat_category_custom");e&&(e.classList.add("hidden"),e.style.display="none",e.required=!1,e.value=""),openModal("modalNewMaterial")}function qe(){ye(!0)}async function Te(o){var a,n;o.preventDefault();let t=document.getElementById("nmat_category").value;if(t==="__NEW__"&&(t=(((a=document.getElementById("nmat_category_custom"))==null?void 0:a.value)||"").trim(),!t)){alert("⚠️ Por favor ingresa el nombre de la nueva categoría."),(n=document.getElementById("nmat_category_custom"))==null||n.focus();return}const e={code:document.getElementById("nmat_code").value.trim().toUpperCase(),name:document.getElementById("nmat_name").value.trim(),category:t,unit_measure:document.getElementById("nmat_unit").value,stock_quantity:parseFloat(document.getElementById("nmat_stock").value)||0,min_stock_alert:parseFloat(document.getElementById("nmat_alert").value)||5,unit_cost_usd:parseFloat(document.getElementById("nmat_cost").value)||0,location:document.getElementById("nmat_location").value.trim()||"Almacén Central Dalor"};try{const i=await R(`${A}/materials/`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)});if(i.ok){const r=await i.json().catch(()=>({}));closeModal("modalNewMaterial"),await J(),K();const l=document.getElementById("filterMaterialSearch");l&&(l.value=e.code||r.code||"",ge()),window.openedMaterialModalFromCxp?(window.openedMaterialModalFromCxp=!1,typeof window.onMaterialCreatedFromCxp=="function"&&window.onMaterialCreatedFromCxp(r)):alert(`✅ Material [${e.code}] "${e.name}" creado con éxito en categoría "${t}".`)}else{const r=await i.json().catch(()=>({}));alert("Error: "+(r.detail||JSON.stringify(r)))}}catch(i){alert("Error de conexión al crear material: "+i.message)}}async function Se(o){let e=(window.allMaterials&&window.allMaterials.length>0?window.allMaterials:j||[]).find(x=>x&&(x.id==o||String(x.id)===String(o)));if(!e&&o)try{const x=await R(`${A}/materials/${o}`);x.ok&&(e=await x.json())}catch{}if(!e){alert("Material no encontrado en catálogo.");return}const a=document.getElementById("edit_mat_id"),n=document.getElementById("edit_mat_code"),i=document.getElementById("edit_mat_name"),r=document.getElementById("edit_mat_category"),l=document.getElementById("edit_mat_unit"),s=document.getElementById("edit_mat_stock"),c=document.getElementById("edit_mat_stock_reason"),d=document.getElementById("edit_mat_min_stock"),y=document.getElementById("edit_mat_unit_cost"),p=document.getElementById("edit_mat_location");a&&(a.value=e.id),n&&(n.value=e.code||""),i&&(i.value=e.name||""),r&&(r.value=e.category||"Acero Estructural"),l&&(l.value=(e.unit_measure||"UND").toUpperCase()),s&&(s.value=e.stock_quantity!==void 0?e.stock_quantity:0),c&&(c.value=""),d&&(d.value=e.min_stock_alert!==void 0?e.min_stock_alert:5),y&&(y.value=e.unit_cost_usd?Number(e.unit_cost_usd).toFixed(2):"0.00"),p&&(p.value=e.location||""),openModal("modalEditMaterial")}async function je(o){var i,r,l,s,c,d,y,p,x;o&&(typeof o.preventDefault=="function"&&o.preventDefault(),typeof o.stopPropagation=="function"&&o.stopPropagation());const t=(i=document.getElementById("edit_mat_id"))==null?void 0:i.value;if(!t)return;const e=(r=document.getElementById("edit_mat_stock"))==null?void 0:r.value,a={name:(((l=document.getElementById("edit_mat_name"))==null?void 0:l.value)||"").trim(),category:(((s=document.getElementById("edit_mat_category"))==null?void 0:s.value)||"").trim(),unit_measure:(((c=document.getElementById("edit_mat_unit"))==null?void 0:c.value)||"").trim().toUpperCase(),stock_quantity:e!==""&&e!==null&&e!==void 0?parseFloat(e):null,adjustment_notes:(((d=document.getElementById("edit_mat_stock_reason"))==null?void 0:d.value)||"").trim()||null,min_stock_alert:parseFloat((y=document.getElementById("edit_mat_min_stock"))==null?void 0:y.value)||0,unit_cost_usd:parseFloat((p=document.getElementById("edit_mat_unit_cost"))==null?void 0:p.value)||0,location:(((x=document.getElementById("edit_mat_location"))==null?void 0:x.value)||"").trim()};if(!a.name){alert("Por favor ingrese el nombre del material.");return}const n=document.getElementById("btnSubmitEditMaterial");n&&(n.disabled=!0,n.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Guardando...');try{const f=await R(`${A}/materials/${t}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(a)});if(!f.ok){const _=await f.json();throw new Error(_.detail||"Error al actualizar material")}closeModal("modalEditMaterial"),typeof showToastNotification=="function"?showToastNotification("✅ Ficha de material actualizada correctamente.","success"):alert("✅ Material actualizado con éxito."),await J()}catch(f){alert("Error al actualizar material: "+f.message)}finally{n&&(n.disabled=!1,n.innerHTML='<i class="fa-solid fa-floppy-disk"></i> Guardar Cambios')}}async function Pe(){try{const o=sessionStorage.getItem("dalor_token")||localStorage.getItem("dalor_token")||window.authToken||"",t=await fetch(`${A}/materials/excel-template`,{headers:{Authorization:"Bearer "+o}});if(!t.ok)throw new Error("Error del servidor al generar plantilla");const e=await t.blob(),a=window.URL.createObjectURL(e),n=document.createElement("a");n.href=a,n.download=`DALOR_Catalogo_Materiales_${new Date().toISOString().slice(0,10)}.xlsx`,document.body.appendChild(n),n.click(),n.remove(),window.URL.revokeObjectURL(a)}catch(o){alert("Error al descargar plantilla de materiales: "+o.message)}}async function De(o){o.preventDefault();const t=document.getElementById("materials_excel_file_input"),e=document.getElementById("materialsExcelImportFeedback"),a=document.getElementById("btnSubmitImportMaterialsExcel");if(!t||!t.files||t.files.length===0){alert("Por favor selecciona un archivo Excel (.xlsx).");return}const n=t.files[0],i=new FormData;i.append("file",n),a&&(a.disabled=!0,a.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Procesando archivo...'),e&&(e.className="",e.style.display="block",e.style.background="#eff6ff",e.style.color="#1e40af",e.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Leyendo catálogo y sincronizando existencias y costos...');try{const r=await R(`${A}/materials/import-excel`,{method:"POST",body:i}),l=await r.json();r.ok?(e&&(e.style.background="#f0fdf4",e.style.color="#166534",e.innerHTML=`<b>✅ Carga masiva exitosa:</b> ${l.message||""}`),alert(`✅ ${l.message||"Carga completada con éxito."}`),closeModal("modalImportMaterialsExcel"),t.value="",await J()):(e&&(e.style.background="#fef2f2",e.style.color="#991b1b",e.innerHTML=`<b>❌ Error:</b> ${l.detail||JSON.stringify(l)}`),alert("Error al procesar archivo: "+(l.detail||JSON.stringify(l))))}catch(r){e&&(e.style.background="#fef2f2",e.style.color="#991b1b",e.innerHTML=`<b>❌ Error de conexión:</b> ${r.message}`),alert("Error de conexión al subir Excel: "+r.message)}finally{a&&(a.disabled=!1,a.innerHTML='<i class="fa-solid fa-cloud-arrow-up"></i> Procesar Carga Masiva')}}typeof window<"u"&&(window.loadMaterialsList=J,window.goToMaterialsPage=ke,window.changeMaterialsPageSize=Ce,window.renderMaterialsTable=ie,window.renderMaterialsTablePaginated=Q,window.filterMaterialsTable=ge,window.populateMaterialCategories=K,window.onNewMaterialCategoryChanged=Be,window.openNewMaterialModal=ye,window.openNewMaterialModalFromCxp=qe,window.submitCreateMaterial=Te,window.openEditMaterialModal=Se,window.submitEditMaterial=je,window.downloadMaterialsExcelTemplate=Pe,window.submitImportMaterialsExcel=De);var N=window.API_BASE||window.location.origin+"/api/v1",F=window.allMaterials=window.allMaterials||[];window.allProjects=window.allProjects||[];window.allCategories=window.allCategories||[];window.allAssets=window.allAssets||[];window.allPersonnel=window.allPersonnel||[];function O(o,t={}){const e=sessionStorage.getItem("dalor_token")||localStorage.getItem("dalor_token")||window.authToken||"",a={...t.headers||{}};return e&&(a.Authorization="Bearer "+e),t.body&&!(t.body instanceof FormData)&&!a["Content-Type"]&&(a["Content-Type"]="application/json"),t.body instanceof FormData&&delete a["Content-Type"],window.fetch(o,{...t,headers:a})}function re(o=null,t=1,e=0){const a=document.getElementById("me_materials_tbody");if(!a)return;const n=window.allMaterials&&window.allMaterials.length>0?window.allMaterials:F||[],i="me_row_"+Date.now()+"_"+Math.floor(Math.random()*1e3),r=document.createElement("tr");r.id=i,r.style.borderBottom="1px solid #e2e8f0";const l=n.map(s=>{const c=o&&s.id===o?"selected":"",d=s.unit_cost_usd||0;return`<option value="${s.id}" data-cost="${d}" data-unit="${s.unit_measure||"UND"}" data-stock="${s.stock_quantity||0}" ${c}>[${s.code}] ${s.name} (Stock: ${s.stock_quantity||0} ${s.unit_measure||"UND"})</option>`}).join("");if(r.innerHTML=`
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
    `,a.appendChild(r),o){const s=r.querySelector(".me-row-material");s&&(s.value=o,xe(s))}else W()}function Ae(o){const t=o.closest("tr");t&&t.remove();const e=document.getElementById("me_materials_tbody");e&&e.children.length===0?re():W()}function xe(o){const t=o.closest("tr");if(!t)return;const e=o.options[o.selectedIndex];if(e&&e.value){const a=t.querySelector(".me-row-cost");if(a&&(!parseFloat(a.value)||parseFloat(a.value)===0)){const n=parseFloat(e.getAttribute("data-cost"))||0;n>0&&(a.value=n.toFixed(2))}}W()}function Le(o){const t=(o.value||"").toLowerCase().trim(),e=o.closest("tr");if(!e)return;const a=e.querySelector(".me-row-material");if(!a)return;const n=window.allMaterials&&window.allMaterials.length>0?window.allMaterials:F||[],i=t?n.filter(l=>(l.name||"").toLowerCase().includes(t)||(l.code||"").toLowerCase().includes(t)):n,r=a.value;a.innerHTML=`<option value="">-- Seleccionar Material (${i.length}) --</option>`+i.map(l=>{const s=String(l.id)===String(r)?"selected":"";return`<option value="${l.id}" data-cost="${l.unit_cost_usd||0}" data-unit="${l.unit_measure||"UND"}" data-stock="${l.stock_quantity||0}" ${s}>[${l.code}] ${l.name} (Stock: ${l.stock_quantity||0} ${l.unit_measure||"UND"})</option>`}).join("")}function ze(o=null){const t=document.getElementById("materialEntryForm");t&&t.reset();const e=document.getElementById("me_materials_tbody");e&&(e.innerHTML=""),re(o,1,0),be(),openModal("modalMaterialEntry")}function W(){const o=document.querySelectorAll("#me_materials_tbody tr");let t=0;o.forEach(r=>{var y,p;const l=parseFloat((y=r.querySelector(".me-row-qty"))==null?void 0:y.value)||0,s=parseFloat((p=r.querySelector(".me-row-cost"))==null?void 0:p.value)||0,c=l*s;t+=c;const d=r.querySelector(".me-row-subtotal");d&&(d.innerText=`$${c.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`)});const e=document.getElementById("me_total_usd_preview");e&&(e.innerText=`$${t.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})} USD`);const a=window.bcvRate||window.currentBcvRate||1,n=t*(a>1?a:1),i=document.getElementById("me_total_bs_preview");i&&(i.innerText=a>1?`≈ Bs ${n.toLocaleString("es-VE",{minimumFractionDigits:2,maximumFractionDigits:2})} (Tasa BCV: ${a})`:"")}function be(){var e;const o=((e=document.getElementById("me_register_cxp"))==null?void 0:e.checked)||!1,t=document.getElementById("me_cash_payment_box");t&&(o?t.classList.add("hidden"):t.classList.remove("hidden"))}async function Re(o){var d,y,p,x,f,_,u,I,E,g,v,w,h,$,M;o&&(typeof o.preventDefault=="function"&&o.preventDefault(),typeof o.stopPropagation=="function"&&o.stopPropagation());const t=(((d=document.getElementById("me_supplier"))==null?void 0:d.value)||"").trim();if(!t)return alert("⚠️ Debe ingresar el nombre del Proveedor / Vendedor de la compra."),(y=document.getElementById("me_supplier"))==null||y.focus(),!1;const e=(((p=document.getElementById("me_doc"))==null?void 0:p.value)||"").trim();if(!e)return alert("⚠️ Debe ingresar el Nº de Factura o Guía de Entrega del Proveedor."),(x=document.getElementById("me_doc"))==null||x.focus(),!1;const a=document.querySelectorAll("#me_materials_tbody tr");if(!a||a.length===0)return alert("⚠️ Debe agregar al menos un renglón de material a la factura."),!1;const n=[];for(let b=0;b<a.length;b++){const m=a[b],k=parseInt((f=m.querySelector(".me-row-material"))==null?void 0:f.value),C=parseFloat((_=m.querySelector(".me-row-qty"))==null?void 0:_.value)||0,T=parseFloat((u=m.querySelector(".me-row-cost"))==null?void 0:u.value)||0;if(!k||isNaN(k))return alert(`⚠️ En el renglón #${b+1}: Debe seleccionar un material del catálogo.`),(I=m.querySelector(".me-row-material"))==null||I.focus(),!1;if(C<=0)return alert(`⚠️ En el renglón #${b+1}: La cantidad ingresada debe ser mayor a 0.`),(E=m.querySelector(".me-row-qty"))==null||E.focus(),!1;if(T<=0)return alert(`⚠️ En el renglón #${b+1}: El costo unitario en USD debe ser mayor a 0.`),(g=m.querySelector(".me-row-cost"))==null||g.focus(),!1;n.push({material_id:k,quantity:C,unit_cost_usd:T})}const i=((v=document.getElementById("me_register_cxp"))==null?void 0:v.checked)||!1,r=((w=document.getElementById("me_payment_channel"))==null?void 0:w.value)||"caja_chica_usd",l=(((h=document.getElementById("me_payment_ref"))==null?void 0:h.value)||"").trim();if(!i&&!l)return alert("⚠️ Para compras de contado, debe ingresar el Nº de Referencia o comprobante del pago de caja/banco."),($=document.getElementById("me_payment_ref"))==null||$.focus(),!1;const s=(((M=document.getElementById("me_notes"))==null?void 0:M.value)||"").trim(),c={items:n,supplier_name:t,reference_doc:e,notes:s,performed_by:"Custodio de Almacén",register_in_cxp:i,due_days:15,payment_channel:r,payment_ref:l};try{const b=window.authToken||localStorage.getItem("dalor_token"),m={"Content-Type":"application/json",...b?{Authorization:`Bearer ${b}`}:{}},k=await O(`${N}/materials/entry`,{method:"POST",headers:m,body:JSON.stringify(c)});if(k.ok){const C=await k.json();alert(`✅ ${C.message||"Entrada registrada exitosamente"}`),closeModal("modalMaterialEntry");try{await loadInitialMasterData()}catch{}try{loadMaterialsList()}catch{}if(i&&typeof window.loadPayablesList=="function")try{window.loadPayablesList()}catch{}}else{const C=await k.json().catch(()=>({detail:"Error en el servidor al registrar entrada."}));alert("Error: "+(C.detail||JSON.stringify(C)))}}catch(b){console.error("[MATERIAL ENTRY ERROR]",b),alert("Error al procesar entrada de material: "+((b==null?void 0:b.message)||b))}return!1}function Ne(o=null){document.getElementById("materialConsumeForm").reset(),populateSelectDropdowns();const t=document.getElementById("mc_material_search");t&&(t.value="");const e=document.getElementById("mc_material_id");o?(e.value=o,e.disabled=!0,e.style.opacity="0.7",e.style.cursor="not-allowed"):(e.disabled=!1,e.style.opacity="",e.style.cursor=""),we(),le(),se(),openModal("modalMaterialConsume")}function Fe(o){const t=(o||"").toLowerCase().trim(),e=document.getElementById("mc_material_id");if(!e)return;const n=(window.allMaterials&&window.allMaterials.length>0?window.allMaterials:F||[]).filter(l=>(parseFloat(l.stock_quantity)||0)>0),i=t?n.filter(l=>(l.name||"").toLowerCase().includes(t)||(l.code||"").toLowerCase().includes(t)):n,r=e.value;e.innerHTML=`<option value="">-- Seleccionar Material (${i.length} con stock) --</option>`+i.map(l=>{const s=String(l.id)===String(r)?"selected":"";return`<option value="${l.id}" data-cost="${l.unit_cost_usd||0}" data-unit="${l.unit_measure||"UND"}" data-stock="${l.stock_quantity}" ${s}>[${l.code}] ${l.name} (Stock: ${l.stock_quantity} ${l.unit_measure||"UND"})</option>`}).join(""),le()}function we(){var e;const o=(e=document.getElementById("mc_project_id"))==null?void 0:e.value,t=document.getElementById("mc_guide_banner");t&&(t.style.display=o?"block":"none")}function le(){const o=document.getElementById("mc_material_id");if(!o||!o.options[o.selectedIndex])return;const t=o.options[o.selectedIndex],e=t.getAttribute("data-stock")||"0",a=t.getAttribute("data-unit")||"UND",n=document.getElementById("mc_stock_available_label");n&&(n.innerText=`${parseFloat(e).toLocaleString()} ${a}`),se()}function se(){var i;const o=document.getElementById("mc_material_id"),t=parseFloat((i=document.getElementById("mc_quantity"))==null?void 0:i.value)||0;let e=0;o&&o.options[o.selectedIndex]&&(e=parseFloat(o.options[o.selectedIndex].getAttribute("data-cost"))||0);const a=t*e,n=document.getElementById("mc_cost_preview");n&&(n.value=`$${a.toLocaleString("en-US",{minimumFractionDigits:2})} USD`)}async function Oe(o){var d,y;o.preventDefault();const t=parseInt(document.getElementById("mc_material_id").value),e=parseFloat(document.getElementById("mc_quantity").value)||0,a=document.getElementById("mc_project_id").value,n=a?parseInt(a):null;if(!t||e<=0){alert("Selecciona un material y cantidad válida mayor a 0.");return}const r=(window.allMaterials&&window.allMaterials.length>0?window.allMaterials:F||[]).find(p=>p.id===t);if(r){const p=parseFloat(r.stock_quantity)||0;if(p<=0){alert(`⛔ Stock agotado: El material [${r.code}] ${r.name} no posee unidades disponibles en pañol (Stock: 0).`);return}if(e>p){alert(`⛔ Stock insuficiente: Has solicitado ${e} ${r.unit_measure||"UND"} de [${r.code}] ${r.name}, pero solo hay ${p} ${r.unit_measure||"UND"} disponibles en pañol.`);return}}const l=(((d=document.getElementById("mc_driver_name"))==null?void 0:d.value)||"").trim(),s=(((y=document.getElementById("mc_vehicle_plate"))==null?void 0:y.value)||"").trim(),c={material_id:t,quantity:e,project_id:n,destination:n?"Obra en Ejecución":"Taller Central",reference_doc:document.getElementById("mc_doc").value.trim()||"Requisición Interna",notes:document.getElementById("mc_notes").value.trim(),performed_by:document.getElementById("mc_performed_by").value.trim()||"Custodio de Almacén",driver_name:l,vehicle_plate:s};try{const p=window.authToken||localStorage.getItem("dalor_token")||null,x={"Content-Type":"application/json"};p&&(x.Authorization=`Bearer ${p}`);const f=await O(`${N}/materials/consume`,{method:"POST",headers:x,body:JSON.stringify(c)});if(f.ok){const _=await f.json();closeModal("modalMaterialConsume"),await loadInitialMasterData(),loadMaterialsList(),_.guide_number?confirm(`✅ ${_.message||"Despacho procesado exitosamente."}

Se ha emitido automáticamente la Guía de Despacho Oficial N°: ${_.guide_number}

¿Deseas abrirla en el módulo de Despachos ahora mismo?`)&&typeof window.navigateToDispatchGuide=="function"&&window.navigateToDispatchGuide(_.guide_number):alert(`✅ ${_.message||"Despacho registrado exitosamente."}`)}else{const _=await f.json();alert("Error: "+(_.detail||JSON.stringify(_)))}}catch(p){alert("Error al procesar despacho de material: "+p.message)}}async function Ue(o){let e=(window.allMaterials&&window.allMaterials.length>0?window.allMaterials:F||[]).find(c=>c&&(c.id==o||String(c.id)===String(o)));if(!e&&o)try{const c=await O(`${N}/materials/${o}`);c.ok&&(e=await c.json())}catch{}if(!e)return alert("Material no encontrado");const a=document.getElementById("calib_mat_id");a&&(a.value=e.id);const n=document.getElementById("calib_mat_display");n&&(n.value=`[${e.code}] ${e.name}`);const i=document.getElementById("calib_mat_current_stock");i&&(i.value=`${e.stock_quantity} ${e.unit_measure}`);const r=document.getElementById("calib_mat_new_stock");r&&(r.value=e.stock_quantity);const l=document.getElementById("calib_mat_reason");l&&(l.value="");const s=document.getElementById("calib_mat_password");s&&(s.value=""),typeof openModal=="function"&&openModal("modalCalibrateMaterial")}async function Ge(o){var i,r,l,s,c;o&&o.preventDefault();const t=(i=document.getElementById("calib_mat_id"))==null?void 0:i.value,e=parseFloat((r=document.getElementById("calib_mat_new_stock"))==null?void 0:r.value),a=((s=(l=document.getElementById("calib_mat_reason"))==null?void 0:l.value)==null?void 0:s.trim())||"",n=((c=document.getElementById("calib_mat_password"))==null?void 0:c.value)||"";if(!t)return alert("Error: ID del material no identificado.");if(isNaN(e)||e<0)return alert("Ingrese un nuevo stock válido mayor o igual a 0.");if(!a)return alert("Debe indicar la justificación o motivo del ajuste físico.");if(!n)return alert("Debe ingresar su contraseña para autorizar la calibración.");try{const d=await O(`${N}/materials/${t}/calibrate`,{method:"PUT",body:JSON.stringify({new_stock_quantity:e,new_stock:e,reason:a,director_password:n})});if(!d.ok){const p=await d.json().catch(()=>({detail:"Error al calibrar stock"}));throw new Error(p.detail||"Error al calibrar stock")}const y=await d.json();alert(`✅ Stock calibrado exitosamente: nuevo stock ${y.new_stock}`),typeof closeModal=="function"&&closeModal("modalCalibrateMaterial"),loadMaterialsList()}catch(d){console.error("Error calibrating material:",d),alert(`❌ Error: ${d.message||d}`)}return!1}let te=[];async function He(o=null){typeof openModal=="function"&&openModal("modalMaterialKardex");const t=document.getElementById("kardexSearchInput");t&&(t.value="");const e=document.getElementById("kardexTypeFilter");e&&(e.value=""),await he(o)}async function he(o=null){const t=document.getElementById("kardexTableBody");document.getElementById("kardexCountBadge"),t&&(t.innerHTML='<tr><td colspan="9" style="text-align: center; padding: 25px; color: #64748b;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando movimientos...</td></tr>');try{let e=`${N}/materials/movements?limit=200`;o&&(e+=`&material_id=${o}`);const a=await O(e);a.ok?(te=await a.json(),_e(te)):t&&(t.innerHTML='<tr><td colspan="9" style="text-align: center; padding: 25px; color: #ef4444;">Error al cargar historial de movimientos.</td></tr>')}catch(e){console.error("Error loading kardex:",e),t&&(t.innerHTML=`<tr><td colspan="9" style="text-align: center; padding: 25px; color: #ef4444;">Error: ${e.message||e}</td></tr>`)}}function Ve(){var a,n;const o=(((a=document.getElementById("kardexSearchInput"))==null?void 0:a.value)||"").toLowerCase().trim(),t=((n=document.getElementById("kardexTypeFilter"))==null?void 0:n.value)||"",e=(te||[]).filter(i=>t&&i.movement_type!==t?!1:o?`${i.material_code||""} ${i.material_name||""} ${i.reference_doc||""} ${i.performed_by||""} ${i.project_name||""} ${i.destination||""}`.toLowerCase().includes(o):!0);_e(e)}function _e(o){const t=document.getElementById("kardexTableBody"),e=document.getElementById("kardexCountBadge");if(e&&(e.textContent=`${o.length} movimientos`),!!t){if(!o||o.length===0){t.innerHTML='<tr><td colspan="9" style="text-align: center; padding: 25px; color: #94a3b8;">No se registraron movimientos que coincidan con los filtros.</td></tr>';return}t.innerHTML=o.map(a=>{let n="";return a.movement_type==="entrada_compra"?n='<span style="background: #ecfdf5; color: #047857; font-weight: 800; padding: 2px 7px; border-radius: 6px; font-size: 10.5px; border: 1px solid #a7f3d0;"><i class="fa-solid fa-cart-shopping"></i> Compra</span>':a.movement_type==="despacho_obra"?n='<span style="background: #e0f2fe; color: #0369a1; font-weight: 800; padding: 2px 7px; border-radius: 6px; font-size: 10.5px; border: 1px solid #bae6fd;"><i class="fa-solid fa-truck-arrow-right"></i> Despacho</span>':a.movement_type==="calibracion_inventario"?n='<span style="background: #fef3c7; color: #92400e; font-weight: 800; padding: 2px 7px; border-radius: 6px; font-size: 10.5px; border: 1px solid #fde68a;"><i class="fa-solid fa-scale-balanced"></i> Calibración</span>':n=`<span style="background: #f1f5f9; color: #475569; font-weight: 700; padding: 2px 6px; border-radius: 6px; font-size: 10px;">${a.movement_type}</span>`,`
            <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.15s ease;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'">
                <td style="padding: 7px 10px; color: #64748b; font-size: 11px; white-space: nowrap;">${a.movement_date||"-"}</td>
                <td style="padding: 7px 10px; text-align: center;">${n}</td>
                <td style="padding: 7px 10px; font-weight: 700; color: #1e293b;">
                    <span style="font-family: monospace; font-size: 10.5px; color: #2563eb; background: #eff6ff; padding: 1px 4px; border-radius: 4px; margin-right: 4px;">${a.material_code||"S/C"}</span>
                    ${a.material_name||"N/A"}
                </td>
                <td style="padding: 7px 10px; text-align: right; font-weight: 800; color: #0f172a;">
                    ${a.quantity} <span style="font-size: 10px; color: #64748b; font-weight: 400;">${a.unit_measure||"UND"}</span>
                </td>
                <td style="padding: 7px 10px; text-align: right; color: #475569;">$${(a.unit_cost_usd||0).toFixed(2)}</td>
                <td style="padding: 7px 10px; text-align: right; font-weight: 800; color: #059669;">$${(a.total_cost_usd||0).toFixed(2)}</td>
                <td style="padding: 7px 10px; color: #334155; font-size: 11px;">${a.project_name||a.destination||"-"}</td>
                <td style="padding: 7px 10px; font-family: monospace; font-size: 10.5px; color: #475569;">${a.reference_doc||"-"}</td>
                <td style="padding: 7px 10px; color: #64748b; font-size: 11px;">${a.performed_by||"-"}</td>
            </tr>
        `}).join("")}}typeof window<"u"&&(window.addMaterialEntryRow=re,window.removeMaterialEntryRow=Ae,window.onEntryMaterialRowChanged=xe,window.filterEntryRowDropdown=Le,window.openMaterialEntryModal=ze,window.calcMaterialEntryTotal=W,window.toggleMaterialEntryPaymentBox=be,window.submitMaterialEntry=Re,window.openMaterialConsumeModal=Ne,window.filterConsumeMaterialDropdown=Fe,window.onConsumeProjectChanged=we,window.onConsumeMaterialSelected=le,window.calcMaterialConsumeTotal=se,window.submitMaterialConsume=Oe,window.openCalibrateMaterialModal=Ue,window.submitCalibrateMaterial=Ge,window.openMaterialKardexModal=He,window.loadMaterialKardexList=he,window.filterMaterialKardexTable=Ve);var G=window.API_BASE||window.location.origin+"/api/v1";window.allMaterials=window.allMaterials||[];var ve=window.allProjects=window.allProjects||[];window.allCategories=window.allCategories||[];var q=window.allAssets=window.allAssets||[],L=window.allPersonnel=window.allPersonnel||[];function H(o,t={}){const e=sessionStorage.getItem("dalor_token")||localStorage.getItem("dalor_token")||window.authToken||"",a={...t.headers||{}};return e&&(a.Authorization="Bearer "+e),t.body&&!(t.body instanceof FormData)&&!a["Content-Type"]&&(a["Content-Type"]="application/json"),t.body instanceof FormData&&delete a["Content-Type"],window.fetch(o,{...t,headers:a})}function Je(){document.getElementById("transferGuideForm").reset(),populateSelectDropdowns(),de(),openModal("modalTransferGuide")}function Qe(){const o=document.getElementById("tg_project_id");if(!o||!o.options[o.selectedIndex])return;const t=o.options[o.selectedIndex],e=parseInt(o.value),a=ve.find(s=>s.id===e),n=a&&a.location||t.getAttribute("data-location")||"Planta Centro - Morón",i=document.getElementById("tg_destination");i&&(i.value=n);const r=document.getElementById("tg_driver_name");if(r){let s=(L||[]).find(c=>c.current_project_id===e&&(c.role_title||"").toLowerCase().includes("chofer"));s||(s=(L||[]).find(c=>(c.role_title||"").toLowerCase().includes("chofer"))),!s&&L&&L.length>0&&(s=L[0]),s&&(r.value=s.full_name)}const l=document.getElementById("tg_vehicle_id");if(l){const s=(q||[]).find(c=>(c.asset_type==="vehiculo"||c.asset_type==="camioneta")&&c.current_project_id===e);if(s)l.value=s.id;else{const c=(q||[]).find(d=>(d.asset_type==="vehiculo"||d.asset_type==="camioneta"||d.asset_type==="transporte")&&d.is_active!==!1&&!d.current_project_id&&(d.status==="disponible_base"||d.status==="disponible"||!d.status)&&d.status!=="en_mantenimiento"&&d.status!=="en_obra"&&d.status!=="alquilado_a_tercero");c?l.value=c.id:l.value=""}}de(e)}var D=[];async function Ke(){if(!q||q.length===0||!(window.rawToolsList&&window.rawToolsList.length>0))try{const o=await H(`${G}/assets/tools-summary`);if(o.ok){const t=await o.json();window.rawToolsList=t.flatMap(e=>e.items||[]),(!q||q.length===0)&&(window.allAssets=q=window.rawToolsList)}else{const t=await H(`${G}/assets/`);t.ok&&(window.allAssets=q=await t.json())}}catch(o){console.warn("Error cargando inventario de herramientas para traslado:",o)}}async function de(o=null){const t=document.getElementById("tg_tools_checklist_container");if(!t)return;t.innerHTML=`<div style="text-align: center; padding: 12px; color: #64748b; font-size: 11px;">
        <i class="fa-solid fa-spinner fa-spin"></i> Cargando herramientas disponibles...
    </div>`,await Ke();const e=["vehiculo","camioneta","camion","remolque"],a=window.rawToolsList&&window.rawToolsList.length>0?window.rawToolsList:(q||[]).filter(i=>!e.includes(i.asset_type)),n={};if(a.forEach(i=>{const r=(i.name||"HERRAMIENTA GENERAL").trim().toUpperCase();n[r]||(n[r]={key:r,name:(i.name||"Herramienta General").trim(),asset_code_sample:i.asset_code||"HERR",brand:i.brand||"",availableUnits:[],projectUnits:[],allUnits:[]}),n[r].allUnits.push(i);const l=o&&i.current_project_id===o,s=i.status==="disponible_base"||i.status==="disponible"||!i.current_project_id;l?n[r].projectUnits.push(i):s&&n[r].availableUnits.push(i)}),D=Object.values(n).sort((i,r)=>i.name.localeCompare(r.name)),D.length===0){t.innerHTML=`<div style="text-align: center; padding: 12px; color: #94a3b8; font-size: 11px;">
            No hay herramientas registradas en el sistema.
        </div>`;return}We()}function We(){const o=document.getElementById("tg_tools_checklist_container");o&&(o.innerHTML=D.map((t,e)=>{const a=t.availableUnits.length+t.projectUnits.length,n=t.projectUnits.length>0?t.projectUnits.length:0,i=n>0;return`
        <div class="tg-tool-item" data-index="${e}" data-text="${t.name} ${t.asset_code_sample} ${t.brand}" style="display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 6px 8px; border-radius: 6px; background: ${i?"#f0fdf4":"#f8fafc"}; border: 1px solid ${i?"#86efac":"#e2e8f0"}; transition: all 0.2s ease;">
            <div style="display: flex; align-items: center; gap: 8px; min-width: 0; flex: 1;">
                <input type="checkbox" id="tg_chk_${e}" class="tg-tool-checkbox" data-index="${e}" ${i?"checked":""} onchange="onToggleTransferToolRow(${e})" style="width: 16px; height: 16px; accent-color: #0284c7; cursor: pointer; flex-shrink: 0;">
                <label for="tg_chk_${e}" style="cursor: pointer; display: flex; flex-direction: column; min-width: 0;">
                    <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                        <span style="font-weight: 700; color: var(--dalor-navy); font-size: 12px; line-height: 1.2;">${t.name}</span>
                        ${t.brand?`<span style="font-size: 10px; color: #64748b; background: #e2e8f0; padding: 1px 5px; border-radius: 4px;">${t.brand}</span>`:""}
                    </div>
                    <span style="font-size: 10px; color: ${a>0?"#059669":"#e11d48"}; font-weight: 600;">
                        Stock Disp.: ${a} unid. ${t.projectUnits.length>0?`(${t.projectUnits.length} ya en obra)`:""}
                    </span>
                </label>
            </div>
            
            <div style="display: flex; align-items: center; gap: 4px; flex-shrink: 0;">
                <button type="button" onclick="adjustTransferToolQty(${e}, -1)" class="btn-qty-minus" style="width: 24px; height: 24px; border: 1px solid #cbd5e1; background: #ffffff; border-radius: 4px; font-weight: 800; cursor: pointer; color: #475569; display: flex; align-items: center; justify-content: center; font-size: 12px;">-</button>
                <input type="number" id="tg_qty_${e}" class="tg-tool-qty-input" data-index="${e}" min="0" max="${Math.max(1,a)}" value="${n}" oninput="onTransferToolQtyInput(${e})" style="width: 52px; height: 24px; text-align: center; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 12px; font-weight: 800; color: #0284c7;">
                <button type="button" onclick="adjustTransferToolQty(${e}, 1)" class="btn-qty-plus" style="width: 24px; height: 24px; border: 1px solid #cbd5e1; background: #ffffff; border-radius: 4px; font-weight: 800; cursor: pointer; color: #475569; display: flex; align-items: center; justify-content: center; font-size: 12px;">+</button>
            </div>
        </div>
        `}).join(""),$e())}function Ye(o){var r,l;const t=document.getElementById(`tg_chk_${o}`),e=document.getElementById(`tg_qty_${o}`),a=t==null?void 0:t.closest(".tg-tool-item");if(!t||!e||!a)return;const n=D[o],i=(((r=n==null?void 0:n.availableUnits)==null?void 0:r.length)||0)+(((l=n==null?void 0:n.projectUnits)==null?void 0:l.length)||0);t.checked?(parseInt(e.value)<=0&&(e.value=i>0?"1":"0"),a.style.background="#f0fdf4",a.style.borderColor="#86efac"):(e.value="0",a.style.background="#f8fafc",a.style.borderColor="#e2e8f0")}function Ze(o,t){var s,c;const e=document.getElementById(`tg_qty_${o}`),a=document.getElementById(`tg_chk_${o}`),n=e==null?void 0:e.closest(".tg-tool-item");if(!e||!a||!n)return;const i=D[o],r=(((s=i==null?void 0:i.availableUnits)==null?void 0:s.length)||0)+(((c=i==null?void 0:i.projectUnits)==null?void 0:c.length)||0);let l=parseInt(e.value||"0")+t;l<0&&(l=0),l>r&&r>0&&(l=r),e.value=String(l),a.checked=l>0,n.style.background=l>0?"#f0fdf4":"#f8fafc",n.style.borderColor=l>0?"#86efac":"#e2e8f0"}function Xe(o){var l,s;const t=document.getElementById(`tg_qty_${o}`),e=document.getElementById(`tg_chk_${o}`),a=t==null?void 0:t.closest(".tg-tool-item");if(!t||!e||!a)return;const n=D[o],i=(((l=n==null?void 0:n.availableUnits)==null?void 0:l.length)||0)+(((s=n==null?void 0:n.projectUnits)==null?void 0:s.length)||0);let r=parseInt(t.value||"0");(isNaN(r)||r<0)&&(r=0),r>i&&i>0&&(r=i),t.value=String(r),e.checked=r>0,a.style.background=r>0?"#f0fdf4":"#f8fafc",a.style.borderColor=r>0?"#86efac":"#e2e8f0"}function $e(){const o=document.getElementById("tg_tools_search"),t=((o==null?void 0:o.value)||"").toLowerCase().trim();let e=0;document.querySelectorAll(".tg-tool-item").forEach(i=>{const r=(i.getAttribute("data-text")||"").toLowerCase(),l=!t||r.includes(t);i.style.display=l?"flex":"none",l&&e++});const a=document.getElementById("tg_tools_checklist_container");let n=document.getElementById("tg_tools_no_match");e===0?(!n&&a&&(n=document.createElement("div"),n.id="tg_tools_no_match",n.style.cssText="text-align: center; padding: 12px; color: #94a3b8; font-size: 11px;",a.appendChild(n)),n&&(n.innerHTML=`No se encontraron herramientas que coincidan con "<strong>${t}</strong>".`,n.style.display="block")):n&&(n.style.display="none")}async function et(o){var I,E;o.preventDefault();const t=parseInt(document.getElementById("tg_project_id").value),e=document.getElementById("tg_destination").value.trim(),a=document.getElementById("tg_vehicle_id").value,n=document.getElementById("tg_driver_name").value.trim();if(!t){alert("Por favor selecciona un proyecto aprobado de destino.");return}const i=[];let r=0;if((D||[]).forEach((g,v)=>{const w=document.getElementById(`tg_qty_${v}`),h=document.getElementById(`tg_chk_${v}`),$=parseInt((w==null?void 0:w.value)||"0");if($>0||h&&h.checked){const M=$>0?$:1,b=[...g.projectUnits,...g.availableUnits,...g.allUnits],m=[],k=new Set;for(const T of b)k.has(T.id)||(k.add(T.id),m.push(T));const C=m.slice(0,M);i.push({group:g,name:g.name,brand:g.brand,quantity:M,units:C}),r+=M}}),i.length===0||r===0){alert("Por favor selecciona al menos una herramienta o equipo con cantidad mayor a 0 para trasladar.");return}const l=ve.find(g=>g.id===t)||{code:"DAL-2026-001",name:"Proyecto Obra"},s=!a||a==="none"||e&&(e.toLowerCase().includes("sede")||e.toLowerCase().includes("taller")),c=!s&&a&&a!=="none"&&q.find(g=>g.id==a)||null,d=((I=document.getElementById("tg_notes"))==null?void 0:I.value)||"",y=c&&c.license_plate||"S/P",p=n||(s?"Personal Dalor Sede Central / Custodia Interna":"Chofer DALOR");let x=`GT-DALOR-${Date.now().toString().slice(-6)}`;try{const g=[];i.forEach(h=>{h.units.length>0?h.units.forEach($=>{g.push({description:`[${$.asset_code}] ${$.name} (Serial: ${$.serial_number||"S/N"})`,quantity:1,unit:"UND",condition_status:"Operativo / Verificado"})}):g.push({description:`${h.name} ${h.brand?"("+h.brand+")":""}`,quantity:h.quantity,unit:"UND",condition_status:"Operativo / Verificado"})});const v={project_id:t,client_id:l?l.client_id:null,guide_type:s?"control_interno":"traslado_externo",destination_address:e||(s?"Taller DALOR Guacara (Sede Central)":"En Obra"),driver_name:p,vehicle_plate:y,carrier_company:"DALOR C.A.",asset_id:c&&c.id?parseInt(c.id):null,transport_type:"propio_dalor",notes:d||(s?"Control Interno / Traslado a Sede Central DALOR":"Guía de traslado de equipos y herramientas hacia obra"),items:g},w=await H(`${G}/dispatch/`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(v)});if(w.ok){const h=await w.json();h&&h.guide_number&&(x=h.guide_number)}}catch(g){console.warn("Advertencia al persistir guía en backend:",g)}for(const g of i)for(const v of g.units)try{await H(`${G}/resources/assign`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({resource_type:"asset",resource_id:v.id,project_id:t,destination_location:e,custodian_name:n,action_type:"assign"})})}catch(w){console.error("Error asignando herramienta:",w)}closeModal("modalTransferGuide"),await loadInitialMasterData(),document.getElementById("subtab-res-tools")&&!document.getElementById("subtab-res-tools").classList.contains("hidden")&&loadToolsList();const f=document.getElementById("modalPrintPreviewContent"),_=document.getElementById("previewModalTitle");_&&(_.innerText="Guía Oficial de Traslado y Despacho de Equipos - Dalor C.A.");const u=new Date().toLocaleDateString("es-VE")+" "+new Date().toLocaleTimeString("es-VE",{hour:"2-digit",minute:"2-digit"});f&&(f.innerHTML=`

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

                        N°: ${x}

                    </div>

                    <div style="font-size: 11px; color: #64748b;">

                        Fecha: ${u}

                    </div>

                </div>

            </div>



            <!-- Ficha de Traslado y Destino -->

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 11px;">

                <tr style="background: #f8fafc;">

                    <td style="padding: 6px 10px; border: 1px solid #cbd5e1; font-weight: 700; width: 20%; color: #475569;">Proyecto Destino:</td>

                    <td style="padding: 6px 10px; border: 1px solid #cbd5e1; width: 30%; font-weight: 800; color: #0284c7;">[${l.code}] ${l.name}</td>

                    <td style="padding: 6px 10px; border: 1px solid #cbd5e1; font-weight: 700; width: 20%; color: #475569;">Ubicación / Frente:</td>

                    <td style="padding: 6px 10px; border: 1px solid #cbd5e1; width: 30%; font-weight: 700;">${e}</td>

                </tr>

                <tr>

                    <td style="padding: 6px 10px; border: 1px solid #cbd5e1; font-weight: 700; color: #475569;">Vehículo de Carga:</td>

                    <td style="padding: 6px 10px; border: 1px solid #cbd5e1;">${c.name} (Placa: ${c.license_plate||"N/A"})</td>

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

                    ${(()=>{let g=0;const v=[];return i.forEach(w=>{w.units.length>0?w.units.forEach(h=>{g++,v.push(`
                                        <tr style="background: ${g%2===0?"#ffffff":"#f8fafc"};">
                                            <td style="padding: 6px 10px; border: 1px solid #cbd5e1; text-align: center; font-weight: 800;">${g}</td>
                                            <td style="padding: 6px 10px; border: 1px solid #cbd5e1; font-family: monospace; font-weight: 800; color: #0284c7;">${h.asset_code}</td>
                                            <td style="padding: 6px 10px; border: 1px solid #cbd5e1; font-weight: 700;">${h.name}</td>
                                            <td style="padding: 6px 10px; border: 1px solid #cbd5e1; color: #64748b;">${h.brand||w.brand||"-"}</td>
                                            <td style="padding: 6px 10px; border: 1px solid #cbd5e1; font-family: monospace;">${h.serial_number||"S/N"}</td>
                                            <td style="padding: 6px 10px; border: 1px solid #cbd5e1; text-align: center; color: #059669; font-weight: 800;">Operativo (1 UND)</td>
                                        </tr>
                                    `)}):(g++,v.push(`
                                    <tr style="background: ${g%2===0?"#ffffff":"#f8fafc"};">
                                        <td style="padding: 6px 10px; border: 1px solid #cbd5e1; text-align: center; font-weight: 800;">${g}</td>
                                        <td style="padding: 6px 10px; border: 1px solid #cbd5e1; font-family: monospace; font-weight: 800; color: #0284c7;">${w.group.asset_code_sample}</td>
                                        <td style="padding: 6px 10px; border: 1px solid #cbd5e1; font-weight: 700;">${w.name}</td>
                                        <td style="padding: 6px 10px; border: 1px solid #cbd5e1; color: #64748b;">${w.brand||"-"}</td>
                                        <td style="padding: 6px 10px; border: 1px solid #cbd5e1; font-family: monospace;">LOTE</td>
                                        <td style="padding: 6px 10px; border: 1px solid #cbd5e1; text-align: center; color: #059669; font-weight: 800;">Operativo (${w.quantity} UND)</td>
                                    </tr>
                                `))}),v.join("")})()}
                </tbody>
            </table>



            <!-- Observaciones -->

            <div style="background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 14px; margin-bottom: 24px; font-size: 11px;">

                <strong>Observaciones / Condición de Custodia:</strong> ${((E=document.getElementById("tg_notes"))==null?void 0:E.value)||"Equipos verificados y entregados en condiciones 100% operativas para faena de obra."}

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

        `,openModal("modalPrintPreview"))}typeof window<"u"&&(window.openTransferGuideModal=Je,window.onTransferGuideProjectChanged=Qe,window.renderTransferToolsChecklist=de,window.filterTransferToolsChecklist=$e,window.onToggleTransferToolRow=Ye,window.adjustTransferToolQty=Ze,window.onTransferToolQtyInput=Xe,window.submitGenerateTransferGuide=et);var oe=window.API_BASE||window.location.origin+"/api/v1",P=window.allMaterials=window.allMaterials||[],V=window.allProjects=window.allProjects||[];window.allCategories=window.allCategories||[];window.allAssets=window.allAssets||[];window.allPersonnel=window.allPersonnel||[];function ae(o,t={}){const e=sessionStorage.getItem("dalor_token")||localStorage.getItem("dalor_token")||window.authToken||"",a={...t.headers||{}};return e&&(a.Authorization="Bearer "+e),t.body&&!(t.body instanceof FormData)&&!a["Content-Type"]&&(a["Content-Type"]="application/json"),t.body instanceof FormData&&delete a["Content-Type"],window.fetch(o,{...t,headers:a})}async function tt(){const o=document.getElementById("materialDeliveryForm");o&&o.reset();let t=window.allProjects&&window.allProjects.length>0?window.allProjects:V||[];if(t.length===0)try{const n=await ae(`${oe}/projects/`);n.ok&&(t=await n.json(),window.allProjects=V=t)}catch(n){console.error("Error cargando proyectos para despacho:",n)}const e=(t||[]).filter(n=>{const i=(n.status||"").toLowerCase().trim();return!["culminado","completado","cerrado","cancelado","finalizado","inactivo"].includes(i)}),a=document.getElementById("md_project_id");a&&(e.length===0?a.innerHTML='<option value="">⚠️ No hay obras abiertas disponibles para despacho</option>':a.innerHTML='<option value="">-- Seleccione Proyecto Aprobado Destino --</option>'+e.map(n=>`<option value="${n.id}" data-location="${n.location||""}">[${n.code}] ${n.name}</option>`).join("")),Ee(),openModal("modalMaterialDelivery")}function Ee(){const o=document.getElementById("md_project_id");if(!o||!o.options[o.selectedIndex])return;const t=parseInt(o.value),e=V.find(l=>l.id===t),a=e&&e.location||"Frente de Obra / Planta",n=document.getElementById("md_destination");n&&(n.value=a);const i=document.getElementById("md_dispatcher_name");i&&!i.value&&(i.value="Jefe de Materiales / Almacén Central");const r=document.getElementById("md_receiver_name");r&&!r.value&&(r.value=e&&e.client_name?`Supervisor / Residente (${e.client_name})`:"Supervisor Residente de Obra"),Ie()}function Ie(){const o=document.getElementById("md_materials_tbody");if(o)if(o.innerHTML="",P&&P.length>0)for(let t=0;t<Math.min(2,P.length);t++)U(P[t].name,P[t].unit_measure||"Pza",1);else U("Cable THW 12 AWG","Metro (m)",50),U("Breaker 2x30A","Pza",2)}function U(o="",t="Pza",e=1){const a=document.getElementById("md_materials_tbody");if(!a)return;const n=document.createElement("tr");n.style.borderBottom="1px solid #f1f5f9",n.innerHTML=`

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

    `,a.appendChild(n)}async function ot(o){o.preventDefault();const t=parseInt(document.getElementById("md_project_id").value),e=document.getElementById("md_destination").value.trim(),a=document.getElementById("md_dispatcher_name").value.trim(),n=document.getElementById("md_receiver_name").value.trim(),i=document.getElementById("md_notes").value.trim(),r=[];if(document.querySelectorAll("#md_materials_tbody tr").forEach(p=>{var u,I,E;const x=(u=p.querySelector(".md-item-name"))==null?void 0:u.value.trim(),f=((I=p.querySelector(".md-item-unit"))==null?void 0:I.value.trim())||"Pza",_=parseFloat((E=p.querySelector(".md-item-qty"))==null?void 0:E.value)||0;x&&_>0&&r.push({name:x,unit:f,qty:_})}),r.length===0){alert("Por favor ingresa al menos un material con cantidad válida.");return}const l=V.find(p=>p.id===t)||{code:"DAL-2026-001",name:"Proyecto en Obra",client_name:"General"};let s=`NE-MAT-${Date.now().toString().slice(-6)}`;try{const p=[];r.forEach(x=>{const f=(P||[]).find(_=>(_.name||"").toLowerCase().trim()===x.name.toLowerCase().trim()||(_.code||"").toLowerCase().trim()===x.name.toLowerCase().trim());f&&p.push({material_id:f.id,quantity:x.qty})}),p.length>0&&await ae(`${oe}/materials/consume`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({project_id:t,destination:e,notes:i||"Despacho directo vía Nota Oficial de Entrega a Obra",performed_by:a||"Jefe de Almacén",items:p})})}catch(p){console.warn("Advertencia al descontar inventario:",p)}try{const p={project_id:t,client_id:l?l.client_id:null,guide_type:"traslado_externo",destination_address:e,driver_name:a,notes:i||"Nota de entrega de materiales e insumos a obra",items:r.map(f=>{const _=(P||[]).find(u=>(u.name||"").toLowerCase().trim()===f.name.toLowerCase().trim()||(u.code||"").toLowerCase().trim()===f.name.toLowerCase().trim());return{item_description:f.name,quantity:f.qty,unit_measure:f.unit,material_id:_?_.id:null}})},x=await ae(`${oe}/dispatch/`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(p)});if(x.ok){const f=await x.json();f&&f.guide_number&&(s=f.guide_number)}}catch(p){console.warn("Advertencia al persistir guía en backend:",p)}const c=new Date().toLocaleDateString("es-VE")+" "+new Date().toLocaleTimeString("es-VE",{hour:"2-digit",minute:"2-digit"});closeModal("modalMaterialDelivery"),typeof loadMaterialsList=="function"&&loadMaterialsList();const d=document.getElementById("modalPrintPreviewContent"),y=document.getElementById("previewModalTitle");y&&(y.innerText="Nota Oficial de Entrega de Materiales - Dalor C.A."),d&&(d.innerHTML=`

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

                    ${r.map((p,x)=>`

                        <tr style="background: ${x%2===0?"#ffffff":"#f8fafc"};">

                            <td style="padding: 6px 10px; border: 1px solid #cbd5e1; text-align: center; font-weight: 800;">${x+1}</td>

                            <td style="padding: 6px 10px; border: 1px solid #cbd5e1; font-weight: 700;">${p.name}</td>

                            <td style="padding: 6px 10px; border: 1px solid #cbd5e1; text-align: center; color: #64748b;">${p.unit}</td>

                            <td style="padding: 6px 10px; border: 1px solid #cbd5e1; text-align: right; font-weight: 900; color: #059669; font-size: 12px;">${p.qty}</td>

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

        `,openModal("modalPrintPreview"))}typeof window<"u"&&(window.openMaterialDeliveryModal=tt,window.onMaterialDeliveryProjectChanged=Ee,window.renderInitialMaterialDeliveryRows=Ie,window.addMaterialDeliveryRow=U,window.submitGenerateMaterialDeliveryGuide=ot);var Y=window.API_BASE||window.location.origin+"/api/v1";window.allMaterials=window.allMaterials||[];window.allProjects=window.allProjects||[];window.allCategories=window.allCategories||[];window.allAssets=window.allAssets||[];window.allPersonnel=window.allPersonnel||[];function Z(o,t={}){const e=sessionStorage.getItem("dalor_token")||localStorage.getItem("dalor_token")||window.authToken||"",a={...t.headers||{}};return e&&(a.Authorization="Bearer "+e),t.body&&!(t.body instanceof FormData)&&!a["Content-Type"]&&(a["Content-Type"]="application/json"),t.body instanceof FormData&&delete a["Content-Type"],window.fetch(o,{...t,headers:a})}var ne=window.allProjectRequisitions=[];async function ce(){try{const o=await Z(`${Y}/materials/project-requisitions?status=pendiente`);if(!o.ok)return;const t=await o.json(),e=new Set;let a=!1;(t||[]).forEach(l=>{(l.quantity_pending||0)>0&&(l.project_id&&e.add(l.project_id),(l.quantity_dispatched||0)>0&&(a=!0))});const n=e.size;["badgePendingRequisitions","badgePendingRequisitionsBanner","badgePendingRequisitionsDispatch","badgePendingRequisitionsNav","badgePendingRequisitionsHeader"].forEach(l=>{const s=document.getElementById(l);s&&(s.innerText=n,s.style.display=n>0?"inline-block":"none",a?s.title=`${n} obra(s) con requerimientos (posee pendientes parciales)`:s.title=`${n} obra(s) con requerimientos pendientes`)});const r=document.getElementById("btnHeaderRequisitionsAlarm");r&&(n>0?(r.style.color="#dc2626",r.style.fontWeight="800",r.title=`🚨 ¡Atención Almacén! Hay ${n} obra(s) con solicitudes pendientes de despacho`):(r.style.color="",r.style.fontWeight="",r.title="Requisiciones de Materiales"))}catch(o){console.warn("Could not load project requisitions badge:",o)}}async function at(o=null){typeof openModal=="function"&&openModal("modalProjectRequisitionsInbox"),await X(o)}async function X(o=null){const t=document.getElementById("reqInboxContainer");if(t){t.innerHTML='<div style="text-align: center; padding: 40px; color: #94a3b8;"><i class="fa-solid fa-spinner fa-spin" style="font-size: 24px;"></i><p style="margin-top: 8px; font-size: 13px;">Cargando pedidos de insumos desde las Obras...</p></div>';try{const e=await Z(`${Y}/materials/project-requisitions`);if(!e.ok)throw new Error("Error al consultar requisiciones de proyectos.");const a=await e.json();ne=window.allProjectRequisitions=Array.isArray(a)?a:[];const n=document.getElementById("reqInboxProjectFilter");if(n){const i=o!==null?String(o):n.value,r=[],l=new Set;ne.forEach(c=>{c.project_id&&!l.has(c.project_id)&&(l.add(c.project_id),r.push({id:c.project_id,code:c.project_code||`PRJ-${c.project_id}`,name:c.project_name||"Sin Título"}))}),r.sort((c,d)=>(d.code||"").localeCompare(c.code||""));let s='<option value="">-- Todas las Obras / Proyectos --</option>';r.forEach(c=>{s+=`<option value="${c.id}" ${i==String(c.id)?"selected":""}>[${c.code}] ${c.name}</option>`}),n.innerHTML=s}Me()}catch(e){console.error("Error loading project requisitions inbox:",e),t.innerHTML=`<div style="text-align: center; padding: 30px; color: #ef4444;"><i class="fa-solid fa-triangle-exclamation" style="font-size: 24px;"></i><p style="margin-top: 8px;">Error al cargar las requisiciones: ${e.message}</p></div>`}}}function Me(){var n,i,r;const o=(((n=document.getElementById("reqInboxSearch"))==null?void 0:n.value)||"").toLowerCase().trim(),t=((i=document.getElementById("reqInboxProjectFilter"))==null?void 0:i.value)||"",e=((r=document.getElementById("reqInboxStatusFilter"))==null?void 0:r.value)||"pending";let a=ne||[];e==="pending"&&(a=a.filter(l=>(l.quantity_pending||0)>0&&l.status!=="despachado")),t&&(a=a.filter(l=>String(l.project_id)===String(t))),o&&(a=a.filter(l=>(l.material_name||"").toLowerCase().includes(o)||(l.material_code||"").toLowerCase().includes(o)||(l.project_code||"").toLowerCase().includes(o)||(l.project_name||"").toLowerCase().includes(o))),ee(a)}function nt(o){const t=document.getElementById(`req_vehicle_sel_${o}`),e=document.getElementById(`req_plate_${o}`),a=document.getElementById(`req_vehicle_model_${o}`);if(!t||!e||!a)return;const n=t.options[t.selectedIndex];if(!n||n.value===""||n.value==="externo"){n&&n.value==="externo"&&(e.value="",a.value="",e.placeholder="Placa flete (ej: A12BC3D)",a.placeholder="Modelo / Tipo Flete");return}const i=n.getAttribute("data-plate")||"",r=n.getAttribute("data-model")||"";e.value=i!=="S/P"?i:"",a.value=r}window.onReqVehicleChanged=nt;function it(o){const t=document.getElementById(`req_driver_sel_${o}`),e=document.getElementById(`req_driver_${o}`),a=document.getElementById(`req_driver_ci_${o}`);if(!t||!e||!a)return;const n=t.options[t.selectedIndex];if(!n||n.value===""||n.value==="externo"){n&&n.value==="externo"&&(e.value="",a.value="",e.placeholder="Nombre del Chofer Contratado",a.placeholder="C.I. / Cédula");return}const i=n.getAttribute("data-name")||"",r=n.getAttribute("data-ci")||"";e.value=i,a.value=r}window.onReqDriverChanged=it;var B=window.currentReqPage=1,S=window.reqPageSize=3,pe=window.currentFilteredReqs=[];function ee(o,t=!0){const e=document.getElementById("reqInboxContainer");if(!e)return;if(t&&(B=1),pe=o||[],!o||o.length===0){e.innerHTML=`
            <div style="text-align: center; padding: 50px 20px; background: #f8fafc; border-radius: 12px; border: 2px dashed #cbd5e1;">
                <i class="fa-solid fa-circle-check" style="font-size: 40px; color: #10b981; margin-bottom: 12px;"></i>
                <h4 style="font-size: 16px; font-weight: 800; color: #1e293b;">¡No hay requerimientos pendientes de preparación!</h4>
                <p style="font-size: 12px; color: #64748b; max-width: 480px; margin: 6px auto 0;">
                    Todas las solicitudes de insumos formuladas en Obras han sido despachadas o no coinciden con los filtros seleccionados.
                </p>
            </div>
        `;return}const a={};o.forEach(d=>{const y=d.project_id||0;a[y]||(a[y]={project_id:y,project_code:d.project_code||"S/P",project_name:d.project_name||"Sin Obra Asignada",project_location:d.project_location||"",is_internal:!!d.is_internal,max_req_id:d.id||0,items:[]}),a[y].items.push(d),(d.id||0)>a[y].max_req_id&&(a[y].max_req_id=d.id)});const n=Object.values(a);n.sort((d,y)=>(y.max_req_id||0)-(d.max_req_id||0)),n.forEach(d=>{d.items.sort((y,p)=>(p.id||0)-(y.id||0))});const i=n.length,r=Math.max(1,Math.ceil(i/S));B>r&&(B=r);const l=(B-1)*S,s=n.slice(l,l+S);let c="";s.forEach(d=>{const y=d.items.filter(u=>(u.quantity_pending||0)>0).length,p=d.items[0]||{},x=`${p.project_location||d.project_location||""} ${d.project_name||""} ${d.project_code||""}`.toLowerCase(),f=p.is_internal||d.is_internal||x.includes("sede")||x.includes("guacara")||x.includes("taller");let _="";if(f)_=`
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
            `;else{const u=p.project_vehicles||[],I=p.available_fleet||p.all_fleet||[],E=p.project_personnel||[],g=p.available_personnel||p.all_personnel||[],v=u.length>0,w=v&&u[0].plate!=="S/P"?u[0].plate:"",h=v&&(u[0].name||u[0].model)||"";let $='<option value="">-- Seleccionar Flota DALOR o Externo --</option>';u.length>0&&($+='<optgroup label="🚗 Asignado a esta Obra (Prioridad)">',u.forEach((m,k)=>{const C=k===0?"selected":"";$+=`<option value="${m.id}" data-plate="${m.plate}" data-model="${m.name||m.model}" ${C}>[${m.code}] ${m.name} (${m.plate})</option>`}),$+="</optgroup>"),I.length>0&&($+='<optgroup label="🚚 Otros Vehículos Disponibles en Base">',I.filter(m=>!u.some(k=>k.id===m.id)).forEach(m=>{$+=`<option value="${m.id}" data-plate="${m.plate}" data-model="${m.name||m.model}">[${m.code}] ${m.name} (${m.plate})</option>`}),$+="</optgroup>"),$+='<optgroup label="🏢 Flete Tercerizado / Externo">',$+=`<option value="externo" data-plate="" data-model="" ${v?"":"selected"}>Flete Externo / Retiro Cliente (Ingreso manual)</option>`,$+="</optgroup>";let b='<option value="">-- Seleccionar Chofer o Externo --</option>';E.length>0&&(b+='<optgroup label="🚗 Personal Asignado a esta Obra">',E.forEach(m=>{b+=`<option value="${m.id}" data-name="${m.name}" data-ci="${m.ci}">${m.name} (C.I: ${m.ci})</option>`}),b+="</optgroup>"),g.length>0&&(b+='<optgroup label="🏢 Chofer / Personal Disponible en Base">',g.filter(m=>!E.some(k=>k.id===m.id)).forEach(m=>{b+=`<option value="${m.id}" data-name="${m.name}" data-ci="${m.ci}">${m.name} (C.I: ${m.ci})</option>`}),b+="</optgroup>"),b+='<optgroup label="✍️ Chofer Contratado / Externo">',b+='<option value="externo" data-name="" data-ci="" selected>✍️ Chofer Externo / Contratado por Fuera (Ingreso manual)</option>',b+="</optgroup>",_=`
                <input type="hidden" id="req_is_internal_${d.project_id}" value="0">
                <div style="background: #f0f9ff; border: 1.5px solid #bae6fd; border-radius: 8px; padding: 12px 14px; margin-bottom: 12px; display: grid; grid-template-columns: 1.2fr 1.2fr 1.6fr; gap: 12px; align-items: start;">
                    <div>
                        <label style="font-size: 11px; font-weight: 800; color: #0369a1; display: flex; align-items: center; justify-content: space-between; margin-bottom: 3px;">
                            <span><i class="fa-solid fa-truck-pickup"></i> Vehículo para Obra Foránea</span>
                            <span style="font-size: 9.5px; color: #0284c7; font-weight: 700;">(Flota o Externo)</span>
                        </label>
                        <select id="req_vehicle_sel_${d.project_id}" onchange="onReqVehicleChanged(${d.project_id})" class="form-select" style="font-size: 11px; padding: 5px 8px; background: white; margin-bottom: 4px;">
                            ${$}
                        </select>
                        <div style="display: flex; gap: 6px;">
                            <input type="text" id="req_plate_${d.project_id}" value="${w}" placeholder="Placa (ej: A12BC3D)" class="form-input" style="font-size: 11px; padding: 4px 6px; font-weight: 700; width: 45%;" title="Placa del vehículo">
                            <input type="text" id="req_vehicle_model_${d.project_id}" value="${h}" placeholder="Modelo / Marca" class="form-input" style="font-size: 11px; padding: 4px 6px; width: 55%;" title="Modelo del vehículo">
                        </div>
                    </div>
                    <div>
                        <label style="font-size: 11px; font-weight: 800; color: #0369a1; display: flex; align-items: center; justify-content: space-between; margin-bottom: 3px;">
                            <span><i class="fa-solid fa-id-card"></i> Chofer Asignado al Traslado</span>
                            <span style="font-size: 9.5px; color: #0284c7; font-weight: 700;">(DALOR o Externo)</span>
                        </label>
                        <select id="req_driver_sel_${d.project_id}" onchange="onReqDriverChanged(${d.project_id})" class="form-select" style="font-size: 11px; padding: 5px 8px; background: white; margin-bottom: 4px;">
                            ${b}
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
                            <span style="background: ${f?"#0284c7":"#1e3a8a"}; color: white; font-weight: 800; font-size: 11px; padding: 3px 8px; border-radius: 6px; letter-spacing: 0.5px;">
                                <i class="${f?"fa-solid fa-warehouse":"fa-solid fa-building"}"></i> ${d.project_code}
                            </span>
                            <h4 style="font-size: 15px; font-weight: 800; color: #0f172a; margin: 0;">${d.project_name}</h4>
                            <span style="font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 4px; ${f?"background: #dcfce7; color: #15803d;":"background: #e0f2fe; color: #0369a1;"}">
                                ${f?"🏢 Sede Central":"📍 Obra Foránea (Traslado Externo)"}
                            </span>
                        </div>
                    </div>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <span style="font-size: 11px; font-weight: 700; color: #475569; background: #f1f5f9; padding: 4px 10px; border-radius: 6px;">
                            ${d.items.length} insumos en lista (${y} pendientes)
                        </span>
                    </div>
                </div>

                <!-- Datos de Despacho & Logística para esta Obra -->
                ${_}

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
                            ${d.items.map(u=>{const I=(u.quantity_pending||0)<=0||u.status==="despachado",E=u.stock_available||0,g=E<=0,v=I||g,w=v?0:Math.min(u.quantity_pending,E),h=g?'<span style="background: #fee2e2; color: #b91c1c; padding: 2px 7px; border-radius: 4px; font-weight: 800; font-size: 10.5px;"><i class="fa-solid fa-ban"></i> 0.00 (SIN STOCK)</span>':u.has_enough_stock?`<span style="background: #dcfce7; color: #15803d; padding: 2px 7px; border-radius: 4px; font-weight: 700; font-size: 10.5px;"><i class="fa-solid fa-circle-check"></i> ${E.toFixed(2)} ${u.unit_measure}</span>`:`<span style="background: #fef3c7; color: #b45309; padding: 2px 7px; border-radius: 4px; font-weight: 700; font-size: 10.5px;"><i class="fa-solid fa-triangle-exclamation"></i> ${E.toFixed(2)} ${u.unit_measure} (Parcial)</span>`;return`
                                    <tr style="border-bottom: 1px solid #f1f5f9; ${I?"background: #f8fafc; opacity: 0.65;":""} ${g&&!I?"background: #fff1f2;":""}">
                                        <td style="padding: 8px 10px; text-align: center;">
                                            <input type="checkbox" class="req-check-${d.project_id}" data-req-id="${u.id}" data-project-id="${d.project_id}" data-stock="${E}" data-pending="${u.quantity_pending}" ${v?"":"checked"} ${v?"disabled":""}>
                                        </td>
                                        <td style="padding: 8px 10px; font-family: monospace; font-weight: 700; color: #334155;">
                                            ${u.material_code}
                                        </td>
                                        <td style="padding: 8px 10px;">
                                            <div style="font-weight: 600; color: #0f172a; display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                                                ${u.resource_type==="herramienta"?'<span class="badge-tag" style="background:#e0e7ff; color:#3730a3; font-size:9.5px;"><i class="fa-solid fa-wrench"></i> Herramienta</span>':u.resource_type==="maquinaria"?'<span class="badge-tag" style="background:#ffedd5; color:#9a3412; font-size:9.5px;"><i class="fa-solid fa-tractor"></i> Maquinaria</span>':u.resource_type==="vehiculo"?'<span class="badge-tag" style="background:#fef3c7; color:#92400e; font-size:9.5px;"><i class="fa-solid fa-truck-pickup"></i> Vehículo</span>':'<span class="badge-tag" style="background:#f0fdf4; color:#166534; font-size:9.5px;"><i class="fa-solid fa-boxes-stacked"></i> Material</span>'}
                                                <span>${u.material_name}</span>
                                            </div>
                                            ${u.notes?`<span style="font-size: 10px; color: #64748b;">Nota: ${u.notes}</span>`:""}
                                        </td>
                                        <td style="padding: 8px 10px; text-align: center; font-weight: 600;">
                                            ${(u.quantity_required||0).toFixed(2)} ${u.unit_measure}
                                        </td>
                                        <td style="padding: 8px 10px; text-align: center; color: #059669; font-weight: 600;">
                                            ${(u.quantity_dispatched||0).toFixed(2)} ${u.unit_measure}
                                        </td>
                                        <td style="padding: 8px 10px; text-align: center; font-weight: 800; color: ${I?"#10b981":"#e11d48"};">
                                            ${I?"0.00 (Listo)":`${(u.quantity_pending||0).toFixed(2)} ${u.unit_measure}`}
                                        </td>
                                        <td style="padding: 8px 10px; text-align: center;">
                                            ${h}
                                        </td>
                                        <td style="padding: 8px 10px; text-align: center;">
                                            <input type="number" step="0.01" min="0" max="${Math.min(u.quantity_pending,E)}" id="req_qty_${u.id}" value="${w}" oninput="onReqQtyChanged(${u.id}, ${u.quantity_pending}, ${E})" class="form-input" style="font-size: 11.5px; padding: 4px 6px; text-align: center; width: 100px; font-weight: 700; ${g?"background-color: #f1f5f9; color: #94a3b8; cursor: not-allowed;":""}" ${v?"disabled":""}>
                                            <div id="req_warn_${u.id}" style="${w<u.quantity_pending&&w>0?"":"display: none;"}">
                                                ${w<u.quantity_pending&&w>0?`<span style="color: #b45309; background: #fef3c7; border: 1px solid #fde68a; padding: 2px 6px; border-radius: 4px; font-size: 9.5px; font-weight: 700; display: inline-block; margin-top: 3px;">⚠️ Parcial: Quedan ${(u.quantity_pending-w).toFixed(2)} por stock</span>`:""}
                                            </div>
                                        </td>
                                        <td style="padding: 8px 10px; text-align: center;">
                                            ${I?'<span class="badge-tag" style="background:#e2e8f0; color:#475569; font-size:10px;">Completado</span>':g?`
                                                <div style="display: flex; flex-direction: column; gap: 3px; align-items: center;">
                                                    <span style="color: #ef4444; font-size: 9.5px; font-weight: 800;"><i class="fa-solid fa-ban"></i> Sin Stock</span>
                                                    <button type="button" onclick="closeModal('modalProjectRequisitionsInbox'); openSubstituteMaterialModal(${u.id}, ${u.material_id||0}, '${(u.material_name||"").replace(/'/g,"\\'")}', ${d.project_id})" class="btn-secondary" style="font-size: 9px; padding: 2px 6px; background: #fef3c7; color: #b45309; border-color: #fde68a; font-weight: 800;" title="Sustituir por otro insumo con inventario">
                                                        <i class="fa-solid fa-shuffle"></i> Sustituir
                                                    </button>
                                                    <button type="button" onclick="closeModal('modalProjectRequisitionsInbox'); openNewPayableModal(); setTimeout(() => { const pSel = document.getElementById('new_cxp_project_id'); if (pSel) pSel.value = '${d.project_id}'; const desc = document.getElementById('new_cxp_description'); if (desc) desc.value = 'Compra urgente de ${(u.material_name||"").replace(/'/g,"\\'")} para obra ${d.project_code}'; }, 200);" class="btn-secondary" style="font-size: 9px; padding: 2px 6px; background: #eff6ff; color: #1d4ed8; border-color: #bfdbfe; font-weight: 800;" title="Cargar CxP / Orden de Compra para este material">
                                                        <i class="fa-solid fa-cart-shopping"></i> Comprar
                                                    </button>
                                                </div>
                                              `:`
                                                <button type="button" onclick="quickDispatchSingleRequisition(${u.id}, ${d.project_id})" class="btn-secondary" style="font-size: 10px; padding: 3px 8px; border-radius: 4px; background: #e0f2fe; color: #0369a1; border-color: #bae6fd; font-weight: 700;" title="Despachar solo este ítem ahora">
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
                    <button type="button" onclick="submitDispatchProjectGroup(${d.project_id})" class="btn-primary" style="${f?"background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);":"background: linear-gradient(135deg, #059669 0%, #047857 100%);"} font-weight: 800; font-size: 12px; padding: 8px 18px; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        ${f?'<i class="fa-solid fa-clipboard-check"></i> Entregar Ítems en Taller y Emitir Vale de Control Interno':'<i class="fa-solid fa-truck-ramp-box"></i> Despachar Ítems Marcados y Emitir Guía de Traslado'} (${d.project_code})
                    </button>
                </div>
            </div>
        `}),c+=`
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
    `,e.innerHTML=c}function rt(o){B=o,ee(pe,!1)}function lt(o){S=parseInt(o)||3,B=1,ee(pe,!1)}function st(o,t,e){const a=document.getElementById(`req_qty_${o}`),n=document.getElementById(`req_warn_${o}`);if(!a)return;let i=parseFloat(a.value)||0;if(i<0&&(i=0,a.value=0),i>t&&(alert(`⚠️ La cantidad a despachar (${i}) no puede ser mayor a lo solicitado (Saldo pendiente: ${t}). Se ajustó automáticamente.`),i=t,a.value=t),i>e&&(alert(`⚠️ Stock insuficiente en almacén/pañol: Solo hay ${e} unidades disponibles.`),i=e,a.value=e),n)if(i<t&&i>0){const r=(t-i).toFixed(2);n.style.display="block",n.innerHTML=`<span style="color: #b45309; background: #fef3c7; border: 1px solid #fde68a; padding: 2px 6px; border-radius: 4px; font-size: 9.5px; font-weight: 700; display: inline-block; margin-top: 3px;">⚠️ Entrega parcial: Quedarán ${r} pendientes por inventario.</span>`}else i===0?(n.style.display="block",n.innerHTML='<span style="color: #dc2626; background: #fee2e2; border: 1px solid #fecaca; padding: 2px 6px; border-radius: 4px; font-size: 9.5px; font-weight: 700; display: inline-block; margin-top: 3px;">⛔ Cantidad 0: No se incluirá en el traslado.</span>'):n.style.display="none"}function dt(o,t){document.querySelectorAll(`.req-check-${o}`).forEach(e=>{e.disabled||(e.checked=t)})}async function ct(o){var p,x,f,_,u,I,E,g;const t=document.querySelectorAll(`.req-check-${o}:checked`);if(!t||t.length===0){alert("⚠️ Por favor selecciona al menos un insumo disponible de la lista para despachar.");return}const e=[];let a=!1;for(const v of t){const w=parseInt(v.getAttribute("data-req-id")),h=parseFloat(v.getAttribute("data-stock")||0),$=parseFloat(v.getAttribute("data-pending")||0),M=document.getElementById(`req_qty_${w}`),b=parseFloat((M==null?void 0:M.value)||0);if(h<=0){alert("⛔ No se puede despachar un ítem con stock 0 en almacén."),M&&M.focus();return}if(b<=0){alert("⚠️ La cantidad a despachar para los ítems seleccionados debe ser mayor a 0."),M&&M.focus();return}if(b>$){alert(`⚠️ La cantidad a despachar (${b}) no puede ser mayor a lo solicitado (${$}).`),M&&M.focus();return}if(b>h){alert(`⚠️ Stock insuficiente: Solicitas ${b} pero solo hay ${h} en almacén.`),M&&M.focus();return}b<$&&(a=!0),e.push({requisition_id:w,quantity_to_dispatch:b})}const n=((p=document.getElementById(`req_is_internal_${o}`))==null?void 0:p.value)==="1";let i=null,r=null,l=null,s=null,c=null;if(!n&&(i=(((x=document.getElementById(`req_driver_${o}`))==null?void 0:x.value)||"").trim(),r=(((f=document.getElementById(`req_driver_ci_${o}`))==null?void 0:f.value)||"").trim(),l=(((_=document.getElementById(`req_plate_${o}`))==null?void 0:_.value)||"").trim(),s=(((u=document.getElementById(`req_vehicle_model_${o}`))==null?void 0:u.value)||"").trim(),c=(I=document.getElementById(`req_vehicle_sel_${o}`))==null?void 0:I.value,!i)){alert("⚠️ Para despachos a Obra Foránea, por favor ingresa o selecciona el Chofer / Conductor asignado."),(E=document.getElementById(`req_driver_${o}`))==null||E.focus();return}const d=(((g=document.getElementById(`req_notes_${o}`))==null?void 0:g.value)||"").trim();let y=n?`¿Confirmas la entrega interna de ${e.length} insumo(s) para los trabajos en Taller Guacara?

Se emitirá el Vale de Control Interno de Almacén.`:`¿Confirmas el despacho de ${e.length} insumo(s) para la Obra Foránea?

Se descontará el stock en Almacén y se emitirá la Guía Oficial de Traslado.`;if(a&&(y+=`

⚠️ ADVERTENCIA: Uno o más ítems tienen una entrega menor a lo solicitado por disponibilidad de inventario. El resto quedará como saldo pendiente en la obra.`),!!confirm(y))try{const v={project_id:o,items:e,is_internal:n,driver_name:i,driver_id_doc:r,vehicle_plate:l,vehicle_model:s,asset_id:c&&c!=="externo"&&!isNaN(parseInt(c))?parseInt(c):null,notes:d},w=await Z(`${Y}/materials/dispatch-project-requisition`,{method:"POST",body:JSON.stringify(v)});if(w.ok){const h=await w.json();await ce(),await loadMaterialsList(),await X(o);const $=h.guide_number;confirm(`✅ ${h.message||"Despacho registrado exitosamente."}

Se ha emitido el documento N°: ${$}

¿Deseas abrir la Guía en pantalla completa ahora?`)&&typeof window.navigateToDispatchGuide=="function"&&(typeof closeModal=="function"&&closeModal("modalProjectRequisitionsInbox"),window.navigateToDispatchGuide($))}else{const h=await w.json();alert("❌ Error al procesar despacho: "+(h.detail||JSON.stringify(h)))}}catch(v){console.error("Error submitting project requisition dispatch:",v),alert("❌ Error de comunicación: "+v.message)}}async function pt(o,t){var _,u,I,E,g,v,w,h;const e=document.getElementById(`req_qty_${o}`),a=parseFloat((e==null?void 0:e.value)||0),n=document.querySelector(`.req-check-${t}[data-req-id="${o}"]`),i=parseFloat((n==null?void 0:n.getAttribute("data-stock"))||0),r=parseFloat((n==null?void 0:n.getAttribute("data-pending"))||0);if(i<=0){alert("⛔ No se puede despachar: Stock disponible en almacén es 0.");return}if(a<=0){alert("⚠️ Ingresa una cantidad válida mayor a 0 para despachar."),e&&e.focus();return}if(a>r){alert(`⚠️ La cantidad a despachar (${a}) no puede ser mayor a lo solicitado (${r}).`),e&&e.focus();return}if(a>i){alert(`⚠️ Stock insuficiente: Requieres ${a} pero solo hay ${i} en pañol.`),e&&e.focus();return}const l=((_=document.getElementById(`req_is_internal_${t}`))==null?void 0:_.value)==="1";let s=null,c=null,d=null,y=null,p=null;if(!l&&(s=(((u=document.getElementById(`req_driver_${t}`))==null?void 0:u.value)||"").trim(),c=(((I=document.getElementById(`req_driver_ci_${t}`))==null?void 0:I.value)||"").trim(),d=(((E=document.getElementById(`req_plate_${t}`))==null?void 0:E.value)||"").trim(),y=(((g=document.getElementById(`req_vehicle_model_${t}`))==null?void 0:g.value)||"").trim(),p=(v=document.getElementById(`req_vehicle_sel_${t}`))==null?void 0:v.value,!s)){alert("⚠️ Para despachos a Obra Foránea, por favor ingresa o selecciona el Chofer / Conductor asignado."),(w=document.getElementById(`req_driver_${t}`))==null||w.focus();return}const x=(((h=document.getElementById(`req_notes_${t}`))==null?void 0:h.value)||"").trim();let f=l?`¿Confirmas la entrega rápida de este insumo (${a} unidades) en Taller Guacara?
Se generará el Vale de Control Interno.`:`¿Confirmas el despacho rápido de este insumo (${a} unidades) para la Obra Foránea?
Se generará la Guía Oficial de Traslado.`;if(a<r&&(f+=`

⚠️ ADVERTENCIA: La cantidad a entregar (${a}) es menor a lo solicitado (${r}) por inventario. Quedarán ${(r-a).toFixed(2)} pendientes.`),!!confirm(f))try{const $={project_id:t,items:[{requisition_id:o,quantity_to_dispatch:a}],is_internal:l,driver_name:s,driver_id_doc:c,vehicle_plate:d,vehicle_model:y,asset_id:p&&p!=="externo"&&!isNaN(parseInt(p))?parseInt(p):null,notes:x},M=await Z(`${Y}/materials/dispatch-project-requisition`,{method:"POST",body:JSON.stringify($)});if(M.ok){const b=await M.json();await ce(),await loadMaterialsList(),await X(t);const m=b.guide_number;confirm(`✅ Despacho procesado exitosamente.

Se ha emitido la Guía Oficial N°: ${m}

¿Deseas ver la Guía de Despacho ahora?`)&&typeof window.navigateToDispatchGuide=="function"&&(typeof closeModal=="function"&&closeModal("modalProjectRequisitionsInbox"),window.navigateToDispatchGuide(m))}else{const b=await M.json();alert("❌ Error: "+(b.detail||JSON.stringify(b)))}}catch($){console.error("Error in quick dispatch:",$),alert("❌ Error de comunicación: "+$.message)}}typeof window<"u"&&(window.loadProjectRequisitionsBadge=ce,window.openProjectRequisitionsInboxModal=at,window.loadProjectRequisitionsInbox=X,window.filterProjectRequisitionsView=Me,window.renderProjectRequisitionsGroups=ee,window.goToReqPage=rt,window.changeReqPageSize=lt,window.onReqQtyChanged=st,window.toggleSelectAllProjectReqs=dt,window.submitDispatchProjectGroup=ct,window.quickDispatchSingleRequisition=pt);
