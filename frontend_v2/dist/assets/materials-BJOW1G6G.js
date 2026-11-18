var L=window.API_BASE||window.location.origin+"/api/v1",j=window.allMaterials=window.allMaterials||[];window.allProjects=window.allProjects||[];window.allCategories=window.allCategories||[];window.allAssets=window.allAssets||[];window.allPersonnel=window.allPersonnel||[];function z(o,e={}){const t=sessionStorage.getItem("dalor_token")||localStorage.getItem("dalor_token")||window.authToken||"",a={...e.headers||{}};return t&&(a.Authorization="Bearer "+t),e.body&&!(e.body instanceof FormData)&&!a["Content-Type"]&&(a["Content-Type"]="application/json"),e.body instanceof FormData&&delete a["Content-Type"],window.fetch(o,{...e,headers:a})}function ge(){const o=window.currentUser||JSON.parse(localStorage.getItem("dalor_user")||"null")||{},e=(o.role_name||o.role||o.username||"").toLowerCase();return e.includes("director")||e.includes("admin")}async function Z(){const o=document.getElementById("materialsTableBody");if(!o)return;const e=ge(),t=e?9:7;o.innerHTML=`<tr><td colspan="${t}" style="text-align: center; padding: 20px; color: #94a3b8;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando inventario de materiales...</td></tr>`;try{const n=await(await z(`${L}/materials/`)).json();j=n.materials||(Array.isArray(n)?n:[]);const i=document.getElementById("matTotalItemsCount"),r=document.getElementById("matTotalValuationCard"),l=document.getElementById("matTotalValuationUsd");if(i&&(i.innerText=n.total_items!==void 0?n.total_items:j.length),r&&(r.style.display=e?"inline-block":"none"),l&&e){const s=n.total_inventory_usd!==void 0?n.total_inventory_usd:j.reduce((c,d)=>c+(d.stock_quantity*d.unit_cost_usd||0),0);l.innerText=`$${s.toLocaleString("en-US",{minimumFractionDigits:2})} USD`}document.querySelectorAll(".director-cost-col").forEach(s=>{s.style.display=e?"":"none"}),se(j);try{ee()}catch(s){console.warn("Error populating material categories:",s)}loadProjectRequisitionsBadge();try{typeof populateSelectDropdowns=="function"&&populateSelectDropdowns()}catch(s){console.warn("Dropdown populator warning:",s)}}catch(a){console.error("Error loading materials:",a),o.innerHTML=`<tr><td colspan="${t}" style="text-align: center; color: #e11d48; padding: 20px;">Error al cargar inventario de materiales: ${a.message}</td></tr>`}}let ye=[],N=1,xe=15;function Se(o){N=o,X();const e=document.getElementById("materialsTableBody");e&&e.scrollIntoView({behavior:"smooth",block:"nearest"})}function Be(o){xe=parseInt(o)||15,N=1,X()}function se(o){ye=Array.isArray(o)?o:j||[],N=1,X()}function X(){const o=document.getElementById("materialsTableBody");if(!o)return;const e=ge(),t=e?9:7,a=ye||[];if(a.length===0){o.innerHTML=`<tr><td colspan="${t}" style="text-align: center; padding: 20px; color: #94a3b8;">No se encontraron materiales registrados.</td></tr>`;const s=document.getElementById("materialsPaginationContainer");s&&(s.innerHTML="");return}const{startIndex:n,endIndex:i,currentPage:r}=(typeof window.renderPaginationControls=="function"?window.renderPaginationControls:renderPaginationControls)({containerId:"materialsPaginationContainer",totalItems:a.length,currentPage:N,pageSize:xe,onPageChange:"goToMaterialsPage",onPageSizeChange:"changeMaterialsPageSize",itemLabel:"material(es) en catálogo",pageSizeOptions:[15,30,60,120]});N=r;const l=a.slice(n,i);o.innerHTML=l.map(s=>{const c=s.is_low_stock||s.stock_quantity<=s.min_stock_alert,d=Number(s.unit_cost_usd||0),y=Number(s.total_cost_usd||s.stock_quantity*d||0);return`
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
            ${e?`
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
        </tr>`}).join("")}function be(){var a,n;const o=(((a=document.getElementById("filterMaterialSearch"))==null?void 0:a.value)||"").toLowerCase(),e=((n=document.getElementById("filterMaterialCategory"))==null?void 0:n.value)||"",t=j.filter(i=>{const r=!o||i.name.toLowerCase().includes(o)||i.code.toLowerCase().includes(o),l=!e||i.category===e;return r&&l});se(t)}let ae=null;async function Q(o){if(!(!o||!o.trim()))try{const e=await z(`${L}/materials/next-code?category=${encodeURIComponent(o.trim())}`);if(e.ok){const t=await e.json(),a=document.getElementById("nmat_code");a&&t.next_code&&(a.value=t.next_code,a.style.borderColor="#10b981",a.style.backgroundColor="#f0fdf4",setTimeout(()=>{a.style.borderColor="",a.style.backgroundColor=""},1e3))}}catch(e){console.error("Error al obtener próximo código de material:",e)}}function je(o){ae&&clearTimeout(ae),ae=setTimeout(()=>{o&&o.trim().length>=2&&Q(o.trim())},300)}function ee(){const o=(j||[]).map(i=>(i.category||"").trim()).filter(i=>i&&i.length>0&&i.toLowerCase()!=="general"&&i.toLowerCase()!=="none"),e=Array.from(new Set(o)).sort((i,r)=>i.localeCompare(r,"es")),t=document.getElementById("filterMaterialCategory");if(t){const i=t.value;t.innerHTML=`<option value="">-- Todas las Categorías (${e.length}) --</option>`+e.map(r=>`<option value="${r}">${r}</option>`).join(""),i&&e.includes(i)&&(t.value=i)}const a=document.getElementById("nmat_category"),n=document.getElementById("nmat_category_custom");a&&(e.length>0?(a.innerHTML='<option value="">-- Seleccionar Categoría --</option>'+e.map(i=>`<option value="${i}">${i}</option>`).join("")+'<option value="__NEW__" style="font-weight: bold; color: #2563eb;">➕ Crear Nueva Categoría...</option>',n&&(n.classList.add("hidden"),n.style.display="none",n.required=!1,n.value="")):(a.innerHTML='<option value="__NEW__" selected>➕ Crear Nueva Categoría...</option>',n&&(n.classList.remove("hidden"),n.style.display="block",n.required=!0,n.value="",setTimeout(()=>n.focus(),150))))}function Pe(){const o=document.getElementById("nmat_category"),e=document.getElementById("nmat_category_custom");!o||!e||(o.value==="__NEW__"?(e.classList.remove("hidden"),e.style.display="block",e.required=!0,e.focus(),e.value.trim()&&Q(e.value.trim())):(e.classList.add("hidden"),e.style.display="none",e.required=!1,e.value="",o.value&&Q(o.value)))}function we(o=!1){var a;o&&(window.openedMaterialModalFromCxp=!0);const e=document.getElementById("modalNewMaterial");e&&(e.style.zIndex="2200"),(a=document.getElementById("newMaterialForm"))==null||a.reset(),ee();const t=document.getElementById("nmat_category_custom");t&&(t.classList.add("hidden"),t.style.display="none",t.required=!1,t.value=""),openModal("modalNewMaterial")}function De(){we(!0)}async function Ae(o){var a,n;o.preventDefault();let e=document.getElementById("nmat_category").value;if(e==="__NEW__"&&(e=(((a=document.getElementById("nmat_category_custom"))==null?void 0:a.value)||"").trim(),!e)){alert("⚠️ Por favor ingresa el nombre de la nueva categoría."),(n=document.getElementById("nmat_category_custom"))==null||n.focus();return}const t={code:document.getElementById("nmat_code").value.trim().toUpperCase(),name:document.getElementById("nmat_name").value.trim(),category:e,unit_measure:document.getElementById("nmat_unit").value,stock_quantity:parseFloat(document.getElementById("nmat_stock").value)||0,min_stock_alert:parseFloat(document.getElementById("nmat_alert").value)||5,unit_cost_usd:parseFloat(document.getElementById("nmat_cost").value)||0,location:document.getElementById("nmat_location").value.trim()||"Almacén Central Dalor"};try{const i=await z(`${L}/materials/`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)});if(i.ok){const r=await i.json().catch(()=>({}));closeModal("modalNewMaterial"),await Z(),ee();const l=document.getElementById("filterMaterialSearch");l&&(l.value=t.code||r.code||"",be()),window.openedMaterialModalFromCxp?(window.openedMaterialModalFromCxp=!1,typeof window.onMaterialCreatedFromCxp=="function"&&window.onMaterialCreatedFromCxp(r)):alert(`✅ Material [${t.code}] "${t.name}" creado con éxito en categoría "${e}".`)}else{const r=await i.json().catch(()=>({}));alert("Error: "+(r.detail||JSON.stringify(r)))}}catch(i){alert("Error de conexión al crear material: "+i.message)}}async function Le(o){let t=(window.allMaterials&&window.allMaterials.length>0?window.allMaterials:j||[]).find(x=>x&&(x.id==o||String(x.id)===String(o)));if(!t&&o)try{const x=await z(`${L}/materials/${o}`);x.ok&&(t=await x.json())}catch{}if(!t){alert("Material no encontrado en catálogo.");return}const a=document.getElementById("edit_mat_id"),n=document.getElementById("edit_mat_code"),i=document.getElementById("edit_mat_name"),r=document.getElementById("edit_mat_category"),l=document.getElementById("edit_mat_unit"),s=document.getElementById("edit_mat_stock"),c=document.getElementById("edit_mat_stock_reason"),d=document.getElementById("edit_mat_min_stock"),y=document.getElementById("edit_mat_unit_cost"),u=document.getElementById("edit_mat_location");a&&(a.value=t.id),n&&(n.value=t.code||""),i&&(i.value=t.name||""),r&&(r.value=t.category||"Acero Estructural"),l&&(l.value=(t.unit_measure||"UND").toUpperCase()),s&&(s.value=t.stock_quantity!==void 0?t.stock_quantity:0),c&&(c.value=""),d&&(d.value=t.min_stock_alert!==void 0?t.min_stock_alert:5),y&&(y.value=t.unit_cost_usd?Number(t.unit_cost_usd).toFixed(2):"0.00"),u&&(u.value=t.location||""),openModal("modalEditMaterial")}async function ze(o){var c,d,y,u,x,b,h,p,I;o&&(typeof o.preventDefault=="function"&&o.preventDefault(),typeof o.stopPropagation=="function"&&o.stopPropagation());const e=(c=document.getElementById("edit_mat_id"))==null?void 0:c.value;if(!e)return;const t=(d=document.getElementById("edit_mat_stock"))==null?void 0:d.value,a={name:(((y=document.getElementById("edit_mat_name"))==null?void 0:y.value)||"").trim(),category:(((u=document.getElementById("edit_mat_category"))==null?void 0:u.value)||"").trim(),unit_measure:(((x=document.getElementById("edit_mat_unit"))==null?void 0:x.value)||"").trim().toUpperCase(),stock_quantity:t!==""&&t!==null&&t!==void 0?parseFloat(t):null,adjustment_notes:(((b=document.getElementById("edit_mat_stock_reason"))==null?void 0:b.value)||"").trim()||null,min_stock_alert:parseFloat((h=document.getElementById("edit_mat_min_stock"))==null?void 0:h.value)||0,unit_cost_usd:parseFloat((p=document.getElementById("edit_mat_unit_cost"))==null?void 0:p.value)||0,location:(((I=document.getElementById("edit_mat_location"))==null?void 0:I.value)||"").trim()};if(!a.name){alert("Por favor ingrese el nombre del material.");return}const n=(window.allMaterials||[]).find(w=>w&&(w.id==e||String(w.id)===String(e))),i=n?parseFloat(n.unit_cost_usd||0):0,r=n?parseFloat(n.stock_quantity||0):0;if(a.unit_cost_usd!==null&&Math.abs(a.unit_cost_usd-i)>1e-4||a.stock_quantity!==null&&Math.abs(a.stock_quantity-r)>1e-4){const w=prompt("🔒 Seguridad Kárdex: Para modificar el precio unitario o ajustar el stock físico se requiere la clave del Director General:");if(!w){alert("Operación cancelada: Se requiere la clave del Director General para rectificaciones de Kárdex.");return}a.director_password=w}const s=document.getElementById("btnSubmitEditMaterial");s&&(s.disabled=!0,s.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Guardando...');try{const w=await z(`${L}/materials/${e}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(a)});if(!w.ok){const k=await w.json();throw new Error(k.detail||"Error al actualizar material")}closeModal("modalEditMaterial"),typeof showToastNotification=="function"?showToastNotification("✅ Ficha de material actualizada correctamente con validación de Director.","success"):alert("✅ Material actualizado con éxito."),await Z()}catch(w){alert("Error al actualizar material: "+w.message)}finally{s&&(s.disabled=!1,s.innerHTML='<i class="fa-solid fa-floppy-disk"></i> Guardar Cambios')}}async function Re(){try{const o=sessionStorage.getItem("dalor_token")||localStorage.getItem("dalor_token")||window.authToken||"",e=await fetch(`${L}/materials/excel-template`,{headers:{Authorization:"Bearer "+o}});if(!e.ok)throw new Error("Error del servidor al generar plantilla");const t=await e.blob(),a=window.URL.createObjectURL(t),n=document.createElement("a");n.href=a,n.download=`DALOR_Catalogo_Materiales_${new Date().toISOString().slice(0,10)}.xlsx`,document.body.appendChild(n),n.click(),n.remove(),window.URL.revokeObjectURL(a)}catch(o){alert("Error al descargar plantilla de materiales: "+o.message)}}async function Ne(o){o.preventDefault();const e=document.getElementById("materials_excel_file_input"),t=document.getElementById("materialsExcelImportFeedback"),a=document.getElementById("btnSubmitImportMaterialsExcel");if(!e||!e.files||e.files.length===0){alert("Por favor selecciona un archivo Excel (.xlsx).");return}const n=e.files[0],i=new FormData;i.append("file",n),a&&(a.disabled=!0,a.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Procesando archivo...'),t&&(t.className="",t.style.display="block",t.style.background="#eff6ff",t.style.color="#1e40af",t.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Leyendo catálogo y sincronizando existencias y costos...');try{const r=await z(`${L}/materials/import-excel`,{method:"POST",body:i}),l=await r.json();r.ok?(t&&(t.style.background="#f0fdf4",t.style.color="#166534",t.innerHTML=`<b>✅ Carga masiva exitosa:</b> ${l.message||""}`),alert(`✅ ${l.message||"Carga completada con éxito."}`),closeModal("modalImportMaterialsExcel"),e.value="",await Z()):(t&&(t.style.background="#fef2f2",t.style.color="#991b1b",t.innerHTML=`<b>❌ Error:</b> ${l.detail||JSON.stringify(l)}`),alert("Error al procesar archivo: "+(l.detail||JSON.stringify(l))))}catch(r){t&&(t.style.background="#fef2f2",t.style.color="#991b1b",t.innerHTML=`<b>❌ Error de conexión:</b> ${r.message}`),alert("Error de conexión al subir Excel: "+r.message)}finally{a&&(a.disabled=!1,a.innerHTML='<i class="fa-solid fa-cloud-arrow-up"></i> Procesar Carga Masiva')}}typeof window<"u"&&(window.loadMaterialsList=Z,window.goToMaterialsPage=Se,window.changeMaterialsPageSize=Be,window.renderMaterialsTable=se,window.renderMaterialsTablePaginated=X,window.filterMaterialsTable=be,window.populateMaterialCategories=ee,window.onNewMaterialCategoryChanged=Pe,window.onCustomCategoryTyped=je,window.fetchNextMaterialCode=Q,window.openNewMaterialModal=we,window.openNewMaterialModalFromCxp=De,window.submitCreateMaterial=Ae,window.openEditMaterialModal=Le,window.submitEditMaterial=ze,window.downloadMaterialsExcelTemplate=Re,window.submitImportMaterialsExcel=Ne);var F=window.API_BASE||window.location.origin+"/api/v1",O=window.allMaterials=window.allMaterials||[];window.allProjects=window.allProjects||[];window.allCategories=window.allCategories||[];window.allAssets=window.allAssets||[];window.allPersonnel=window.allPersonnel||[];function U(o,e={}){const t=sessionStorage.getItem("dalor_token")||localStorage.getItem("dalor_token")||window.authToken||"",a={...e.headers||{}};return t&&(a.Authorization="Bearer "+t),e.body&&!(e.body instanceof FormData)&&!a["Content-Type"]&&(a["Content-Type"]="application/json"),e.body instanceof FormData&&delete a["Content-Type"],window.fetch(o,{...e,headers:a})}function de(o=null,e=1,t=0){const a=document.getElementById("me_materials_tbody");if(!a)return;const n=window.allMaterials&&window.allMaterials.length>0?window.allMaterials:O||[],i="me_row_"+Date.now()+"_"+Math.floor(Math.random()*1e3),r=document.createElement("tr");r.id=i,r.style.borderBottom="1px solid #e2e8f0";const l=n.map(s=>{const c=o&&s.id===o?"selected":"",d=s.unit_cost_usd||0;return`<option value="${s.id}" data-cost="${d}" data-unit="${s.unit_measure||"UND"}" data-stock="${s.stock_quantity||0}" ${c}>[${s.code}] ${s.name} (Stock: ${s.stock_quantity||0} ${s.unit_measure||"UND"})</option>`}).join("");if(r.innerHTML=`
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
    `,a.appendChild(r),o){const s=r.querySelector(".me-row-material");s&&(s.value=o,he(s))}else te()}function Fe(o){const e=o.closest("tr");e&&e.remove();const t=document.getElementById("me_materials_tbody");t&&t.children.length===0?de():te()}function he(o){const e=o.closest("tr");if(!e)return;const t=o.options[o.selectedIndex];if(t&&t.value){const a=e.querySelector(".me-row-cost");if(a&&(!parseFloat(a.value)||parseFloat(a.value)===0)){const n=parseFloat(t.getAttribute("data-cost"))||0;n>0&&(a.value=n.toFixed(2))}}te()}function Oe(o){const e=(o.value||"").toLowerCase().trim(),t=o.closest("tr");if(!t)return;const a=t.querySelector(".me-row-material");if(!a)return;const n=window.allMaterials&&window.allMaterials.length>0?window.allMaterials:O||[],i=e?n.filter(l=>(l.name||"").toLowerCase().includes(e)||(l.code||"").toLowerCase().includes(e)):n,r=a.value;a.innerHTML=`<option value="">-- Seleccionar Material (${i.length}) --</option>`+i.map(l=>{const s=String(l.id)===String(r)?"selected":"";return`<option value="${l.id}" data-cost="${l.unit_cost_usd||0}" data-unit="${l.unit_measure||"UND"}" data-stock="${l.stock_quantity||0}" ${s}>[${l.code}] ${l.name} (Stock: ${l.stock_quantity||0} ${l.unit_measure||"UND"})</option>`}).join("")}function Ue(o=null){const e=document.getElementById("materialEntryForm");e&&e.reset();const t=document.getElementById("me_materials_tbody");t&&(t.innerHTML=""),de(o,1,0),_e(),openModal("modalMaterialEntry")}function te(){const o=document.querySelectorAll("#me_materials_tbody tr");let e=0;o.forEach(r=>{var y,u;const l=parseFloat((y=r.querySelector(".me-row-qty"))==null?void 0:y.value)||0,s=parseFloat((u=r.querySelector(".me-row-cost"))==null?void 0:u.value)||0,c=l*s;e+=c;const d=r.querySelector(".me-row-subtotal");d&&(d.innerText=`$${c.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`)});const t=document.getElementById("me_total_usd_preview");t&&(t.innerText=`$${e.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})} USD`);const a=window.bcvRate||window.currentBcvRate||1,n=e*(a>1?a:1),i=document.getElementById("me_total_bs_preview");i&&(i.innerText=a>1?`≈ Bs ${n.toLocaleString("es-VE",{minimumFractionDigits:2,maximumFractionDigits:2})} (Tasa BCV: ${a})`:"")}function _e(){var t;const o=((t=document.getElementById("me_register_cxp"))==null?void 0:t.checked)||!1,e=document.getElementById("me_cash_payment_box");e&&(o?e.classList.add("hidden"):e.classList.remove("hidden"))}async function Ge(o){var d,y,u,x,b,h,p,I,w,k,f,_,$,v,E;o&&(typeof o.preventDefault=="function"&&o.preventDefault(),typeof o.stopPropagation=="function"&&o.stopPropagation());const e=(((d=document.getElementById("me_supplier"))==null?void 0:d.value)||"").trim();if(!e)return alert("⚠️ Debe ingresar el nombre del Proveedor / Vendedor de la compra."),(y=document.getElementById("me_supplier"))==null||y.focus(),!1;const t=(((u=document.getElementById("me_doc"))==null?void 0:u.value)||"").trim();if(!t)return alert("⚠️ Debe ingresar el Nº de Factura o Guía de Entrega del Proveedor."),(x=document.getElementById("me_doc"))==null||x.focus(),!1;const a=document.querySelectorAll("#me_materials_tbody tr");if(!a||a.length===0)return alert("⚠️ Debe agregar al menos un renglón de material a la factura."),!1;const n=[];for(let m=0;m<a.length;m++){const g=a[m],M=parseInt((b=g.querySelector(".me-row-material"))==null?void 0:b.value),C=parseFloat((h=g.querySelector(".me-row-qty"))==null?void 0:h.value)||0,B=parseFloat((p=g.querySelector(".me-row-cost"))==null?void 0:p.value)||0;if(!M||isNaN(M))return alert(`⚠️ En el renglón #${m+1}: Debe seleccionar un material del catálogo.`),(I=g.querySelector(".me-row-material"))==null||I.focus(),!1;if(C<=0)return alert(`⚠️ En el renglón #${m+1}: La cantidad ingresada debe ser mayor a 0.`),(w=g.querySelector(".me-row-qty"))==null||w.focus(),!1;if(B<=0)return alert(`⚠️ En el renglón #${m+1}: El costo unitario en USD debe ser mayor a 0.`),(k=g.querySelector(".me-row-cost"))==null||k.focus(),!1;n.push({material_id:M,quantity:C,unit_cost_usd:B})}const i=((f=document.getElementById("me_register_cxp"))==null?void 0:f.checked)||!1,r=((_=document.getElementById("me_payment_channel"))==null?void 0:_.value)||"caja_chica_usd",l=((($=document.getElementById("me_payment_ref"))==null?void 0:$.value)||"").trim();if(!i&&!l)return alert("⚠️ Para compras de contado, debe ingresar el Nº de Referencia o comprobante del pago de caja/banco."),(v=document.getElementById("me_payment_ref"))==null||v.focus(),!1;const s=(((E=document.getElementById("me_notes"))==null?void 0:E.value)||"").trim(),c={items:n,supplier_name:e,reference_doc:t,notes:s,performed_by:"Custodio de Almacén",register_in_cxp:i,due_days:15,payment_channel:r,payment_ref:l};try{const m=window.authToken||localStorage.getItem("dalor_token"),g={"Content-Type":"application/json",...m?{Authorization:`Bearer ${m}`}:{}},M=await U(`${F}/materials/entry`,{method:"POST",headers:g,body:JSON.stringify(c)});if(M.ok){const C=await M.json();alert(`✅ ${C.message||"Entrada registrada exitosamente"}`),closeModal("modalMaterialEntry");try{await loadInitialMasterData()}catch{}try{loadMaterialsList()}catch{}if(i&&typeof window.loadPayablesList=="function")try{window.loadPayablesList()}catch{}}else{const C=await M.json().catch(()=>({detail:"Error en el servidor al registrar entrada."}));alert("Error: "+(C.detail||JSON.stringify(C)))}}catch(m){console.error("[MATERIAL ENTRY ERROR]",m),alert("Error al procesar entrada de material: "+((m==null?void 0:m.message)||m))}return!1}function He(o=null){document.getElementById("materialConsumeForm").reset(),populateSelectDropdowns();const e=document.getElementById("mc_material_search");e&&(e.value="");const t=document.getElementById("mc_material_id");o?(t.value=o,t.disabled=!0,t.style.opacity="0.7",t.style.cursor="not-allowed"):(t.disabled=!1,t.style.opacity="",t.style.cursor=""),ve(),ce(),pe(),openModal("modalMaterialConsume")}function Ve(o){const e=(o||"").toLowerCase().trim(),t=document.getElementById("mc_material_id");if(!t)return;const n=(window.allMaterials&&window.allMaterials.length>0?window.allMaterials:O||[]).filter(l=>(parseFloat(l.stock_quantity)||0)>0),i=e?n.filter(l=>(l.name||"").toLowerCase().includes(e)||(l.code||"").toLowerCase().includes(e)):n,r=t.value;t.innerHTML=`<option value="">-- Seleccionar Material (${i.length} con stock) --</option>`+i.map(l=>{const s=String(l.id)===String(r)?"selected":"";return`<option value="${l.id}" data-cost="${l.unit_cost_usd||0}" data-unit="${l.unit_measure||"UND"}" data-stock="${l.stock_quantity}" ${s}>[${l.code}] ${l.name} (Stock: ${l.stock_quantity} ${l.unit_measure||"UND"})</option>`}).join(""),ce()}function ve(){var t;const o=(t=document.getElementById("mc_project_id"))==null?void 0:t.value,e=document.getElementById("mc_guide_banner");e&&(e.style.display=o?"block":"none")}function ce(){const o=document.getElementById("mc_material_id");if(!o||!o.options[o.selectedIndex])return;const e=o.options[o.selectedIndex],t=e.getAttribute("data-stock")||"0",a=e.getAttribute("data-unit")||"UND",n=document.getElementById("mc_stock_available_label");n&&(n.innerText=`${parseFloat(t).toLocaleString()} ${a}`),pe()}function pe(){var i;const o=document.getElementById("mc_material_id"),e=parseFloat((i=document.getElementById("mc_quantity"))==null?void 0:i.value)||0;let t=0;o&&o.options[o.selectedIndex]&&(t=parseFloat(o.options[o.selectedIndex].getAttribute("data-cost"))||0);const a=e*t,n=document.getElementById("mc_cost_preview");n&&(n.value=`$${a.toLocaleString("en-US",{minimumFractionDigits:2})} USD`)}async function Je(o){var d,y;o.preventDefault();const e=parseInt(document.getElementById("mc_material_id").value),t=parseFloat(document.getElementById("mc_quantity").value)||0,a=document.getElementById("mc_project_id").value,n=a?parseInt(a):null;if(!e||t<=0){alert("Selecciona un material y cantidad válida mayor a 0.");return}const r=(window.allMaterials&&window.allMaterials.length>0?window.allMaterials:O||[]).find(u=>u.id===e);if(r){const u=parseFloat(r.stock_quantity)||0;if(u<=0){alert(`⛔ Stock agotado: El material [${r.code}] ${r.name} no posee unidades disponibles en pañol (Stock: 0).`);return}if(t>u){alert(`⛔ Stock insuficiente: Has solicitado ${t} ${r.unit_measure||"UND"} de [${r.code}] ${r.name}, pero solo hay ${u} ${r.unit_measure||"UND"} disponibles en pañol.`);return}}const l=(((d=document.getElementById("mc_driver_name"))==null?void 0:d.value)||"").trim(),s=(((y=document.getElementById("mc_vehicle_plate"))==null?void 0:y.value)||"").trim(),c={material_id:e,quantity:t,project_id:n,destination:n?"Obra en Ejecución":"Taller Central",reference_doc:document.getElementById("mc_doc").value.trim()||"Requisición Interna",notes:document.getElementById("mc_notes").value.trim(),performed_by:document.getElementById("mc_performed_by").value.trim()||"Custodio de Almacén",driver_name:l,vehicle_plate:s};try{const u=window.authToken||localStorage.getItem("dalor_token")||null,x={"Content-Type":"application/json"};u&&(x.Authorization=`Bearer ${u}`);const b=await U(`${F}/materials/consume`,{method:"POST",headers:x,body:JSON.stringify(c)});if(b.ok){const h=await b.json();closeModal("modalMaterialConsume"),await loadInitialMasterData(),loadMaterialsList(),h.guide_number?confirm(`✅ ${h.message||"Despacho procesado exitosamente."}

Se ha emitido automáticamente la Guía de Despacho Oficial N°: ${h.guide_number}

¿Deseas abrirla en el módulo de Despachos ahora mismo?`)&&typeof window.navigateToDispatchGuide=="function"&&window.navigateToDispatchGuide(h.guide_number):alert(`✅ ${h.message||"Despacho registrado exitosamente."}`)}else{const h=await b.json();alert("Error: "+(h.detail||JSON.stringify(h)))}}catch(u){alert("Error al procesar despacho de material: "+u.message)}}async function Qe(o){let t=(window.allMaterials&&window.allMaterials.length>0?window.allMaterials:O||[]).find(c=>c&&(c.id==o||String(c.id)===String(o)));if(!t&&o)try{const c=await U(`${F}/materials/${o}`);c.ok&&(t=await c.json())}catch{}if(!t)return alert("Material no encontrado");const a=document.getElementById("calib_mat_id");a&&(a.value=t.id);const n=document.getElementById("calib_mat_display");n&&(n.value=`[${t.code}] ${t.name}`);const i=document.getElementById("calib_mat_current_stock");i&&(i.value=`${t.stock_quantity} ${t.unit_measure}`);const r=document.getElementById("calib_mat_new_stock");r&&(r.value=t.stock_quantity);const l=document.getElementById("calib_mat_reason");l&&(l.value="");const s=document.getElementById("calib_mat_password");s&&(s.value=""),typeof openModal=="function"&&openModal("modalCalibrateMaterial")}async function Ke(o){var i,r,l,s,c;o&&o.preventDefault();const e=(i=document.getElementById("calib_mat_id"))==null?void 0:i.value,t=parseFloat((r=document.getElementById("calib_mat_new_stock"))==null?void 0:r.value),a=((s=(l=document.getElementById("calib_mat_reason"))==null?void 0:l.value)==null?void 0:s.trim())||"",n=((c=document.getElementById("calib_mat_password"))==null?void 0:c.value)||"";if(!e)return alert("Error: ID del material no identificado.");if(isNaN(t)||t<0)return alert("Ingrese un nuevo stock válido mayor o igual a 0.");if(!a)return alert("Debe indicar la justificación o motivo del ajuste físico.");if(!n)return alert("Debe ingresar su contraseña para autorizar la calibración.");try{const d=await U(`${F}/materials/${e}/calibrate`,{method:"PUT",body:JSON.stringify({new_stock_quantity:t,new_stock:t,reason:a,director_password:n})});if(!d.ok){const u=await d.json().catch(()=>({detail:"Error al calibrar stock"}));throw new Error(u.detail||"Error al calibrar stock")}const y=await d.json();alert(`✅ Stock calibrado exitosamente: nuevo stock ${y.new_stock}`),typeof closeModal=="function"&&closeModal("modalCalibrateMaterial"),loadMaterialsList()}catch(d){console.error("Error calibrating material:",d),alert(`❌ Error: ${d.message||d}`)}return!1}let ne=[];async function We(o=null){typeof openModal=="function"&&openModal("modalMaterialKardex");const e=document.getElementById("kardexSearchInput");e&&(e.value="");const t=document.getElementById("kardexTypeFilter");t&&(t.value=""),await $e(o)}async function $e(o=null){const e=document.getElementById("kardexTableBody");document.getElementById("kardexCountBadge"),e&&(e.innerHTML='<tr><td colspan="9" style="text-align: center; padding: 25px; color: #64748b;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando movimientos...</td></tr>');try{let t=`${F}/materials/movements?limit=200`;o&&(t+=`&material_id=${o}`);const a=await U(t);a.ok?(ne=await a.json(),Ee(ne)):e&&(e.innerHTML='<tr><td colspan="9" style="text-align: center; padding: 25px; color: #ef4444;">Error al cargar historial de movimientos.</td></tr>')}catch(t){console.error("Error loading kardex:",t),e&&(e.innerHTML=`<tr><td colspan="9" style="text-align: center; padding: 25px; color: #ef4444;">Error: ${t.message||t}</td></tr>`)}}function Ye(){var a,n;const o=(((a=document.getElementById("kardexSearchInput"))==null?void 0:a.value)||"").toLowerCase().trim(),e=((n=document.getElementById("kardexTypeFilter"))==null?void 0:n.value)||"",t=(ne||[]).filter(i=>e&&i.movement_type!==e?!1:o?`${i.material_code||""} ${i.material_name||""} ${i.reference_doc||""} ${i.performed_by||""} ${i.project_name||""} ${i.destination||""}`.toLowerCase().includes(o):!0);Ee(t)}function Ee(o){const e=document.getElementById("kardexTableBody"),t=document.getElementById("kardexCountBadge");if(t&&(t.textContent=`${o.length} movimientos`),!!e){if(!o||o.length===0){e.innerHTML='<tr><td colspan="9" style="text-align: center; padding: 25px; color: #94a3b8;">No se registraron movimientos que coincidan con los filtros.</td></tr>';return}e.innerHTML=o.map(a=>{let n="";return a.movement_type==="entrada_compra"?n='<span style="background: #ecfdf5; color: #047857; font-weight: 800; padding: 2px 7px; border-radius: 6px; font-size: 10.5px; border: 1px solid #a7f3d0;"><i class="fa-solid fa-cart-shopping"></i> Compra</span>':a.movement_type==="despacho_obra"?n='<span style="background: #e0f2fe; color: #0369a1; font-weight: 800; padding: 2px 7px; border-radius: 6px; font-size: 10.5px; border: 1px solid #bae6fd;"><i class="fa-solid fa-truck-arrow-right"></i> Despacho</span>':a.movement_type==="calibracion_inventario"?n='<span style="background: #fef3c7; color: #92400e; font-weight: 800; padding: 2px 7px; border-radius: 6px; font-size: 10.5px; border: 1px solid #fde68a;"><i class="fa-solid fa-scale-balanced"></i> Calibración</span>':n=`<span style="background: #f1f5f9; color: #475569; font-weight: 700; padding: 2px 6px; border-radius: 6px; font-size: 10px;">${a.movement_type}</span>`,`
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
        `}).join("")}}typeof window<"u"&&(window.addMaterialEntryRow=de,window.removeMaterialEntryRow=Fe,window.onEntryMaterialRowChanged=he,window.filterEntryRowDropdown=Oe,window.openMaterialEntryModal=Ue,window.calcMaterialEntryTotal=te,window.toggleMaterialEntryPaymentBox=_e,window.submitMaterialEntry=Ge,window.openMaterialConsumeModal=He,window.filterConsumeMaterialDropdown=Ve,window.onConsumeProjectChanged=ve,window.onConsumeMaterialSelected=ce,window.calcMaterialConsumeTotal=pe,window.submitMaterialConsume=Je,window.openCalibrateMaterialModal=Qe,window.submitCalibrateMaterial=Ke,window.openMaterialKardexModal=We,window.loadMaterialKardexList=$e,window.filterMaterialKardexTable=Ye);var K=window.API_BASE||window.location.origin+"/api/v1";window.allMaterials=window.allMaterials||[];var Ie=window.allProjects=window.allProjects||[];window.allCategories=window.allCategories||[];var T=window.allAssets=window.allAssets||[],R=window.allPersonnel=window.allPersonnel||[];function W(o,e={}){const t=sessionStorage.getItem("dalor_token")||localStorage.getItem("dalor_token")||window.authToken||"",a={...e.headers||{}};return t&&(a.Authorization="Bearer "+t),e.body&&!(e.body instanceof FormData)&&!a["Content-Type"]&&(a["Content-Type"]="application/json"),e.body instanceof FormData&&delete a["Content-Type"],window.fetch(o,{...e,headers:a})}function Ze(){document.getElementById("transferGuideForm").reset(),populateSelectDropdowns(),ue(),openModal("modalTransferGuide")}function Xe(){const o=document.getElementById("tg_project_id");if(!o||!o.options[o.selectedIndex])return;const e=o.options[o.selectedIndex],t=parseInt(o.value),a=Ie.find(s=>s.id===t),n=a&&a.location||e.getAttribute("data-location")||"Planta Centro - Morón",i=document.getElementById("tg_destination");i&&(i.value=n);const r=document.getElementById("tg_driver_name");if(r){let s=(R||[]).find(c=>c.current_project_id===t&&(c.role_title||"").toLowerCase().includes("chofer"));s||(s=(R||[]).find(c=>(c.role_title||"").toLowerCase().includes("chofer"))),!s&&R&&R.length>0&&(s=R[0]),s&&(r.value=s.full_name)}const l=document.getElementById("tg_vehicle_id");if(l){const s=(T||[]).find(c=>(c.asset_type==="vehiculo"||c.asset_type==="camioneta")&&c.current_project_id===t);if(s)l.value=s.id;else{const c=(T||[]).find(d=>(d.asset_type==="vehiculo"||d.asset_type==="camioneta"||d.asset_type==="transporte")&&d.is_active!==!1&&!d.current_project_id&&(d.status==="disponible_base"||d.status==="disponible"||!d.status)&&d.status!=="en_mantenimiento"&&d.status!=="en_obra"&&d.status!=="alquilado_a_tercero");c?l.value=c.id:l.value=""}}ue(t)}var A=[];async function et(){if(!T||T.length===0||!(window.rawToolsList&&window.rawToolsList.length>0))try{const o=await W(`${K}/assets/tools-summary`);if(o.ok){const e=await o.json();window.rawToolsList=e.flatMap(t=>t.items||[]),(!T||T.length===0)&&(window.allAssets=T=window.rawToolsList)}else{const e=await W(`${K}/assets/`);e.ok&&(window.allAssets=T=await e.json())}}catch(o){console.warn("Error cargando inventario de herramientas para traslado:",o)}}async function ue(o=null){const e=document.getElementById("tg_tools_checklist_container");if(!e)return;e.innerHTML=`<div style="text-align: center; padding: 12px; color: #64748b; font-size: 11px;">
        <i class="fa-solid fa-spinner fa-spin"></i> Cargando herramientas disponibles...
    </div>`,await et();const t=["vehiculo","camioneta","camion","remolque"],a=window.rawToolsList&&window.rawToolsList.length>0?window.rawToolsList:(T||[]).filter(i=>!t.includes(i.asset_type)),n={};if(a.forEach(i=>{const r=(i.name||"HERRAMIENTA GENERAL").trim().toUpperCase();n[r]||(n[r]={key:r,name:(i.name||"Herramienta General").trim(),asset_code_sample:i.asset_code||"HERR",brand:i.brand||"",availableUnits:[],projectUnits:[],allUnits:[]}),n[r].allUnits.push(i);const l=o&&i.current_project_id===o,s=i.status==="disponible_base"||i.status==="disponible"||!i.current_project_id;l?n[r].projectUnits.push(i):s&&n[r].availableUnits.push(i)}),A=Object.values(n).sort((i,r)=>i.name.localeCompare(r.name)),A.length===0){e.innerHTML=`<div style="text-align: center; padding: 12px; color: #94a3b8; font-size: 11px;">
            No hay herramientas registradas en el sistema.
        </div>`;return}tt()}function tt(){const o=document.getElementById("tg_tools_checklist_container");o&&(o.innerHTML=A.map((e,t)=>{const a=e.availableUnits.length+e.projectUnits.length,n=e.projectUnits.length>0?e.projectUnits.length:0,i=n>0,r=[...e.projectUnits,...e.availableUnits],l=a>1?`
            <div style="width: 100%; margin-top: 6px; padding-top: 6px; border-top: 1px dashed #cbd5e1; display: flex; flex-wrap: wrap; gap: 5px;">
                ${r.map(s=>{const c=s.serial_number&&s.serial_number!=="-"?` (${s.serial_number})`:"";return`<label style="display:inline-flex; align-items:center; gap:4px; background:#fff; border:1px solid #cbd5e1; border-radius:6px; padding:2px 7px; font-size:10.5px; font-weight:700; cursor:pointer;">
                        <input type="checkbox" class="tg-unit-chk-${t}" value="${s.id}" onchange="onToggleTransferSpecificUnit(${t})">
                        <span>${s.asset_code||"HERR"}${c}</span>
                    </label>`}).join("")}
            </div>
        `:"";return`
        <div class="tg-tool-item" data-index="${t}" data-text="${e.name} ${e.asset_code_sample} ${e.brand}" style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; padding: 6px 8px; border-radius: 6px; background: ${i?"#f0fdf4":"#f8fafc"}; border: 1px solid ${i?"#86efac":"#e2e8f0"}; transition: all 0.2s ease;">
            <div style="display: flex; align-items: center; gap: 8px; min-width: 0; flex: 1;">
                <input type="checkbox" id="tg_chk_${t}" class="tg-tool-checkbox" data-index="${t}" ${i?"checked":""} onchange="onToggleTransferToolRow(${t})" style="width: 16px; height: 16px; accent-color: #0284c7; cursor: pointer; flex-shrink: 0;">
                <label for="tg_chk_${t}" style="cursor: pointer; display: flex; flex-direction: column; min-width: 0;">
                    <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                        <span style="font-weight: 700; color: var(--dalor-navy); font-size: 12px; line-height: 1.2;">${e.name}</span>
                        ${e.brand?`<span style="font-size: 10px; color: #64748b; background: #e2e8f0; padding: 1px 5px; border-radius: 4px;">${e.brand}</span>`:""}
                    </div>
                    <span style="font-size: 10px; color: ${a>0?"#059669":"#e11d48"}; font-weight: 600;">
                        Stock Disp.: ${a} unid. ${e.projectUnits.length>0?`(${e.projectUnits.length} ya en obra)`:""}
                    </span>
                </label>
            </div>
            
            <div style="display: flex; align-items: center; gap: 4px; flex-shrink: 0;">
                <button type="button" onclick="adjustTransferToolQty(${t}, -1)" class="btn-qty-minus" style="width: 24px; height: 24px; border: 1px solid #cbd5e1; background: #ffffff; border-radius: 4px; font-weight: 800; cursor: pointer; color: #475569; display: flex; align-items: center; justify-content: center; font-size: 12px;">-</button>
                <input type="number" step="1" id="tg_qty_${t}" class="tg-tool-qty-input" data-index="${t}" min="0" max="${Math.max(1,a)}" value="${n}" oninput="onTransferToolQtyInput(${t})" style="width: 52px; height: 24px; text-align: center; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 12px; font-weight: 800; color: #0284c7;">
                <button type="button" onclick="adjustTransferToolQty(${t}, 1)" class="btn-qty-plus" style="width: 24px; height: 24px; border: 1px solid #cbd5e1; background: #ffffff; border-radius: 4px; font-weight: 800; cursor: pointer; color: #475569; display: flex; align-items: center; justify-content: center; font-size: 12px;">+</button>
            </div>
            ${l}
        </div>
        `}).join(""),ke())}function ot(o){const e=Array.from(document.querySelectorAll(`.tg-unit-chk-${o}:checked`)),t=document.getElementById(`tg_chk_${o}`),a=document.getElementById(`tg_qty_${o}`),n=t==null?void 0:t.closest(".tg-tool-item");a&&(a.value=String(e.length)),t&&(t.checked=e.length>0),n&&(n.style.background=e.length>0?"#f0fdf4":"#f8fafc",n.style.borderColor=e.length>0?"#86efac":"#e2e8f0")}function at(o){var r,l;const e=document.getElementById(`tg_chk_${o}`),t=document.getElementById(`tg_qty_${o}`),a=e==null?void 0:e.closest(".tg-tool-item");if(!e||!t||!a)return;const n=A[o],i=(((r=n==null?void 0:n.availableUnits)==null?void 0:r.length)||0)+(((l=n==null?void 0:n.projectUnits)==null?void 0:l.length)||0);e.checked?(parseInt(t.value)<=0&&(t.value=i>0?"1":"0"),a.style.background="#f0fdf4",a.style.borderColor="#86efac"):(t.value="0",a.style.background="#f8fafc",a.style.borderColor="#e2e8f0")}function nt(o,e){var s,c;const t=document.getElementById(`tg_qty_${o}`),a=document.getElementById(`tg_chk_${o}`),n=t==null?void 0:t.closest(".tg-tool-item");if(!t||!a||!n)return;const i=A[o],r=(((s=i==null?void 0:i.availableUnits)==null?void 0:s.length)||0)+(((c=i==null?void 0:i.projectUnits)==null?void 0:c.length)||0);let l=parseInt(t.value||"0")+e;l<0&&(l=0),l>r&&r>0&&(l=r),t.value=String(l),a.checked=l>0,n.style.background=l>0?"#f0fdf4":"#f8fafc",n.style.borderColor=l>0?"#86efac":"#e2e8f0"}function it(o){var l,s;const e=document.getElementById(`tg_qty_${o}`),t=document.getElementById(`tg_chk_${o}`),a=e==null?void 0:e.closest(".tg-tool-item");if(!e||!t||!a)return;const n=A[o],i=(((l=n==null?void 0:n.availableUnits)==null?void 0:l.length)||0)+(((s=n==null?void 0:n.projectUnits)==null?void 0:s.length)||0);let r=parseInt(e.value||"0");(isNaN(r)||r<0)&&(r=0),r>i&&i>0&&(r=i),e.value=String(r),t.checked=r>0,a.style.background=r>0?"#f0fdf4":"#f8fafc",a.style.borderColor=r>0?"#86efac":"#e2e8f0"}function ke(){const o=document.getElementById("tg_tools_search"),e=((o==null?void 0:o.value)||"").toLowerCase().trim();let t=0;document.querySelectorAll(".tg-tool-item").forEach(i=>{const r=(i.getAttribute("data-text")||"").toLowerCase(),l=!e||r.includes(e);i.style.display=l?"flex":"none",l&&t++});const a=document.getElementById("tg_tools_checklist_container");let n=document.getElementById("tg_tools_no_match");t===0?(!n&&a&&(n=document.createElement("div"),n.id="tg_tools_no_match",n.style.cssText="text-align: center; padding: 12px; color: #94a3b8; font-size: 11px;",a.appendChild(n)),n&&(n.innerHTML=`No se encontraron herramientas que coincidan con "<strong>${e}</strong>".`,n.style.display="block")):n&&(n.style.display="none")}async function rt(o){var I,w,k;o.preventDefault();const e=parseInt(document.getElementById("tg_project_id").value),t=document.getElementById("tg_destination").value.trim(),a=document.getElementById("tg_vehicle_id").value,n=document.getElementById("tg_driver_name").value.trim();if(!e){alert("Por favor selecciona un proyecto aprobado de destino.");return}const i=[];let r=0;if((A||[]).forEach((f,_)=>{const $=document.getElementById(`tg_qty_${_}`),v=document.getElementById(`tg_chk_${_}`),E=parseInt(($==null?void 0:$.value)||"0");if(E>0||v&&v.checked){const m=Array.from(document.querySelectorAll(`.tg-unit-chk-${_}:checked`)).map(P=>parseInt(P.value)),g=m.length>0?m.length:E>0?E:1,M=[...f.projectUnits,...f.availableUnits,...f.allUnits],C=[],B=new Set;for(const P of M)B.has(P.id)||(B.add(P.id),C.push(P));const Te=m.length>0?C.filter(P=>m.includes(P.id)):C.slice(0,g);i.push({group:f,name:f.name,brand:f.brand,quantity:g,units:Te}),r+=g}}),i.length===0||r===0){alert("Por favor selecciona al menos una herramienta o equipo con cantidad mayor a 0 para trasladar.");return}const l=Ie.find(f=>f.id===e)||{code:"DAL-2026-001",name:"Proyecto Obra"},s=!a||a==="none"||t&&(t.toLowerCase().includes("sede")||t.toLowerCase().includes("taller")),c=!s&&a&&a!=="none"&&T.find(f=>f.id==a)||null,d=((I=document.getElementById("tg_notes"))==null?void 0:I.value)||"",y=c&&c.license_plate||"S/P",u=n||(s?"Personal Dalor Sede Central / Custodia Interna":"Chofer DALOR");let x=`GT-DALOR-${Date.now().toString().slice(-6)}`;try{const f=[];i.forEach(E=>{E.units.length>0?E.units.forEach(m=>{f.push({description:`[${m.asset_code}] ${m.name} (Serial: ${m.serial_number||"S/N"})`,quantity:1,unit:"UND",condition_status:"Operativo / Verificado"})}):f.push({description:`${E.name} ${E.brand?"("+E.brand+")":""}`,quantity:E.quantity,unit:"UND",condition_status:"Operativo / Verificado"})});const _=(((w=document.getElementById("tg_dispatch_date"))==null?void 0:w.value)||"").trim(),$={project_id:e,client_id:l?l.client_id:null,recipient_name:l?l.client_name||l.name:t||"Obra DALOR",dispatch_date:_?_.length===16?`${_}:00`:_:null,guide_type:"traslado_externo",destination_address:t||"En Obra",driver_name:u,vehicle_plate:y,carrier_company:"DALOR C.A.",asset_id:c&&c.id?parseInt(c.id):null,transport_type:"propio_dalor",notes:d||(s?"Control Interno / Traslado a Sede Central DALOR":"Guía de traslado de equipos y herramientas hacia obra"),items:f},v=await W(`${K}/dispatch/`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify($)});if(v.ok){const E=await v.json();E&&E.guide_number&&(x=E.guide_number)}}catch(f){console.warn("Advertencia al persistir guía en backend:",f)}for(const f of i)for(const _ of f.units)try{await W(`${K}/resources/assign`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({resource_type:"asset",resource_id:_.id,project_id:e,destination_location:t,custodian_name:n,action_type:"assign"})})}catch($){console.error("Error asignando herramienta:",$)}closeModal("modalTransferGuide"),await loadInitialMasterData(),document.getElementById("subtab-res-tools")&&!document.getElementById("subtab-res-tools").classList.contains("hidden")&&loadToolsList();const b=document.getElementById("modalPrintPreviewContent"),h=document.getElementById("previewModalTitle");h&&(h.innerText="Guía Oficial de Traslado y Despacho de Equipos - Dalor C.A.");const p=new Date().toLocaleDateString("es-VE")+" "+new Date().toLocaleTimeString("es-VE",{hour:"2-digit",minute:"2-digit"});b&&(b.innerHTML=`

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

                        Fecha: ${p}

                    </div>

                </div>

            </div>



            <!-- Ficha de Traslado y Destino -->

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 11px;">

                <tr style="background: #f8fafc;">

                    <td style="padding: 6px 10px; border: 1px solid #cbd5e1; font-weight: 700; width: 20%; color: #475569;">Proyecto Destino:</td>

                    <td style="padding: 6px 10px; border: 1px solid #cbd5e1; width: 30%; font-weight: 800; color: #0284c7;">[${l.code}] ${l.name}</td>

                    <td style="padding: 6px 10px; border: 1px solid #cbd5e1; font-weight: 700; width: 20%; color: #475569;">Ubicación / Frente:</td>

                    <td style="padding: 6px 10px; border: 1px solid #cbd5e1; width: 30%; font-weight: 700;">${t}</td>

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

                    ${(()=>{let f=0;const _=[];return i.forEach($=>{$.units.length>0?$.units.forEach(v=>{f++,_.push(`
                                        <tr style="background: ${f%2===0?"#ffffff":"#f8fafc"};">
                                            <td style="padding: 6px 10px; border: 1px solid #cbd5e1; text-align: center; font-weight: 800;">${f}</td>
                                            <td style="padding: 6px 10px; border: 1px solid #cbd5e1; font-family: monospace; font-weight: 800; color: #0284c7;">${v.asset_code}</td>
                                            <td style="padding: 6px 10px; border: 1px solid #cbd5e1; font-weight: 700;">${v.name}</td>
                                            <td style="padding: 6px 10px; border: 1px solid #cbd5e1; color: #64748b;">${v.brand||$.brand||"-"}</td>
                                            <td style="padding: 6px 10px; border: 1px solid #cbd5e1; font-family: monospace;">${v.serial_number||"S/N"}</td>
                                            <td style="padding: 6px 10px; border: 1px solid #cbd5e1; text-align: center; color: #059669; font-weight: 800;">Operativo (1 UND)</td>
                                        </tr>
                                    `)}):(f++,_.push(`
                                    <tr style="background: ${f%2===0?"#ffffff":"#f8fafc"};">
                                        <td style="padding: 6px 10px; border: 1px solid #cbd5e1; text-align: center; font-weight: 800;">${f}</td>
                                        <td style="padding: 6px 10px; border: 1px solid #cbd5e1; font-family: monospace; font-weight: 800; color: #0284c7;">${$.group.asset_code_sample}</td>
                                        <td style="padding: 6px 10px; border: 1px solid #cbd5e1; font-weight: 700;">${$.name}</td>
                                        <td style="padding: 6px 10px; border: 1px solid #cbd5e1; color: #64748b;">${$.brand||"-"}</td>
                                        <td style="padding: 6px 10px; border: 1px solid #cbd5e1; font-family: monospace;">LOTE</td>
                                        <td style="padding: 6px 10px; border: 1px solid #cbd5e1; text-align: center; color: #059669; font-weight: 800;">Operativo (${$.quantity} UND)</td>
                                    </tr>
                                `))}),_.join("")})()}
                </tbody>
            </table>



            <!-- Observaciones -->

            <div style="background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 14px; margin-bottom: 24px; font-size: 11px;">

                <strong>Observaciones / Condición de Custodia:</strong> ${((k=document.getElementById("tg_notes"))==null?void 0:k.value)||"Equipos verificados y entregados en condiciones 100% operativas para faena de obra."}

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

        `,openModal("modalPrintPreview"))}typeof window<"u"&&(window.openTransferGuideModal=Ze,window.onTransferGuideProjectChanged=Xe,window.renderTransferToolsChecklist=ue,window.filterTransferToolsChecklist=ke,window.onToggleTransferToolRow=at,window.onToggleTransferSpecificUnit=ot,window.adjustTransferToolQty=nt,window.onTransferToolQtyInput=it,window.submitGenerateTransferGuide=rt);var ie=window.API_BASE||window.location.origin+"/api/v1",D=window.allMaterials=window.allMaterials||[],Y=window.allProjects=window.allProjects||[];window.allCategories=window.allCategories||[];window.allAssets=window.allAssets||[];window.allPersonnel=window.allPersonnel||[];function re(o,e={}){const t=sessionStorage.getItem("dalor_token")||localStorage.getItem("dalor_token")||window.authToken||"",a={...e.headers||{}};return t&&(a.Authorization="Bearer "+t),e.body&&!(e.body instanceof FormData)&&!a["Content-Type"]&&(a["Content-Type"]="application/json"),e.body instanceof FormData&&delete a["Content-Type"],window.fetch(o,{...e,headers:a})}async function lt(){const o=document.getElementById("materialDeliveryForm");o&&o.reset();let e=window.allProjects&&window.allProjects.length>0?window.allProjects:Y||[];if(e.length===0)try{const n=await re(`${ie}/projects/`);n.ok&&(e=await n.json(),window.allProjects=Y=e)}catch(n){console.error("Error cargando proyectos para despacho:",n)}const t=(e||[]).filter(n=>{const i=(n.status||"").toLowerCase().trim();return!["culminado","completado","cerrado","cancelado","finalizado","inactivo"].includes(i)}),a=document.getElementById("md_project_id");a&&(t.length===0?a.innerHTML='<option value="">⚠️ No hay obras abiertas disponibles para despacho</option>':a.innerHTML='<option value="">-- Seleccione Proyecto Aprobado Destino --</option>'+t.map(n=>`<option value="${n.id}" data-location="${n.location||""}">[${n.code}] ${n.name}</option>`).join("")),Me(),openModal("modalMaterialDelivery")}function Me(){const o=document.getElementById("md_project_id");if(!o||!o.options[o.selectedIndex])return;const e=parseInt(o.value),t=Y.find(l=>l.id===e),a=t&&t.location||"Frente de Obra / Planta",n=document.getElementById("md_destination");n&&(n.value=a);const i=document.getElementById("md_dispatcher_name");i&&!i.value&&(i.value="Jefe de Materiales / Almacén Central");const r=document.getElementById("md_receiver_name");r&&!r.value&&(r.value=t&&t.client_name?`Supervisor / Residente (${t.client_name})`:"Supervisor Residente de Obra"),Ce()}function Ce(){const o=document.getElementById("md_materials_tbody");if(o)if(o.innerHTML="",D&&D.length>0)for(let e=0;e<Math.min(2,D.length);e++)J(D[e].name,D[e].unit_measure||"Pza",1);else J("Cable THW 12 AWG","Metro (m)",50),J("Breaker 2x30A","Pza",2)}function J(o="",e="Pza",t=1){const a=document.getElementById("md_materials_tbody");if(!a)return;const n=document.createElement("tr");n.style.borderBottom="1px solid #f1f5f9",n.innerHTML=`

        <td style="padding: 4px 6px;">

            <input type="text" class="form-input md-item-name" value="${o}" placeholder="Descripción del material..." style="padding: 4px 6px; font-size: 11px;" required>

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

    `,a.appendChild(n)}async function st(o){o.preventDefault();const e=parseInt(document.getElementById("md_project_id").value),t=document.getElementById("md_destination").value.trim(),a=document.getElementById("md_dispatcher_name").value.trim(),n=document.getElementById("md_receiver_name").value.trim(),i=document.getElementById("md_notes").value.trim(),r=[];if(document.querySelectorAll("#md_materials_tbody tr").forEach(u=>{var p,I,w;const x=(p=u.querySelector(".md-item-name"))==null?void 0:p.value.trim(),b=((I=u.querySelector(".md-item-unit"))==null?void 0:I.value.trim())||"Pza",h=parseFloat((w=u.querySelector(".md-item-qty"))==null?void 0:w.value)||0;x&&h>0&&r.push({name:x,unit:b,qty:h})}),r.length===0){alert("Por favor ingresa al menos un material con cantidad válida.");return}const l=Y.find(u=>u.id===e)||{code:"DAL-2026-001",name:"Proyecto en Obra",client_name:"General"};let s=`NE-MAT-${Date.now().toString().slice(-6)}`;try{const u=[];r.forEach(x=>{const b=(D||[]).find(h=>(h.name||"").toLowerCase().trim()===x.name.toLowerCase().trim()||(h.code||"").toLowerCase().trim()===x.name.toLowerCase().trim());b&&u.push({material_id:b.id,quantity:x.qty})}),u.length>0&&await re(`${ie}/materials/consume`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({project_id:e,destination:t,notes:i||"Despacho directo vía Nota Oficial de Entrega a Obra",performed_by:a||"Jefe de Almacén",items:u})})}catch(u){console.warn("Advertencia al descontar inventario:",u)}try{const u={project_id:e,client_id:l?l.client_id:null,guide_type:"traslado_externo",destination_address:t,driver_name:a,notes:i||"Nota de entrega de materiales e insumos a obra",items:r.map(b=>{const h=(D||[]).find(p=>(p.name||"").toLowerCase().trim()===b.name.toLowerCase().trim()||(p.code||"").toLowerCase().trim()===b.name.toLowerCase().trim());return{item_description:b.name,quantity:b.qty,unit_measure:b.unit,material_id:h?h.id:null}})},x=await re(`${ie}/dispatch/`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(u)});if(x.ok){const b=await x.json();b&&b.guide_number&&(s=b.guide_number)}}catch(u){console.warn("Advertencia al persistir guía en backend:",u)}const c=new Date().toLocaleDateString("es-VE")+" "+new Date().toLocaleTimeString("es-VE",{hour:"2-digit",minute:"2-digit"});closeModal("modalMaterialDelivery"),typeof loadMaterialsList=="function"&&loadMaterialsList();const d=document.getElementById("modalPrintPreviewContent"),y=document.getElementById("previewModalTitle");y&&(y.innerText="Nota Oficial de Entrega de Materiales - Dalor C.A."),d&&(d.innerHTML=`

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

                    <td style="padding: 6px 10px; border: 1px solid #cbd5e1; width: 30%; font-weight: 700;">${t}</td>

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

                    ${r.map((u,x)=>`

                        <tr style="background: ${x%2===0?"#ffffff":"#f8fafc"};">

                            <td style="padding: 6px 10px; border: 1px solid #cbd5e1; text-align: center; font-weight: 800;">${x+1}</td>

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

        `,openModal("modalPrintPreview"))}typeof window<"u"&&(window.openMaterialDeliveryModal=lt,window.onMaterialDeliveryProjectChanged=Me,window.renderInitialMaterialDeliveryRows=Ce,window.addMaterialDeliveryRow=J,window.submitGenerateMaterialDeliveryGuide=st);var G=window.API_BASE||window.location.origin+"/api/v1";window.allMaterials=window.allMaterials||[];window.allProjects=window.allProjects||[];window.allCategories=window.allCategories||[];window.allAssets=window.allAssets||[];window.allPersonnel=window.allPersonnel||[];function H(o,e={}){const t=sessionStorage.getItem("dalor_token")||localStorage.getItem("dalor_token")||window.authToken||"",a={...e.headers||{}};return t&&(a.Authorization="Bearer "+t),e.body&&!(e.body instanceof FormData)&&!a["Content-Type"]&&(a["Content-Type"]="application/json"),e.body instanceof FormData&&delete a["Content-Type"],window.fetch(o,{...e,headers:a})}var le=window.allProjectRequisitions=[];async function fe(){try{const o=await H(`${G}/materials/project-requisitions?status=pendiente`);if(!o.ok)return;const e=await o.json(),t=new Set;let a=!1;(e||[]).forEach(l=>{(l.quantity_pending||0)>0&&(l.project_id&&t.add(l.project_id),(l.quantity_dispatched||0)>0&&(a=!0))});const n=t.size;["badgePendingRequisitions","badgePendingRequisitionsBanner","badgePendingRequisitionsDispatch","badgePendingRequisitionsNav","badgePendingRequisitionsHeader"].forEach(l=>{const s=document.getElementById(l);s&&(s.innerText=n,s.style.display=n>0?"inline-block":"none",a?s.title=`${n} obra(s) con requerimientos (posee pendientes parciales)`:s.title=`${n} obra(s) con requerimientos pendientes`)});const r=document.getElementById("btnHeaderRequisitionsAlarm");r&&(n>0?(r.style.color="#fca5a5",r.style.borderColor="#ef4444",r.style.backgroundColor="rgba(239, 68, 68, 0.2)",r.style.fontWeight="800",r.title=`🚨 ¡Atención Almacén! Hay ${n} obra(s) con solicitudes pendientes de despacho`):(r.style.color="#94a3b8",r.style.borderColor="#334155",r.style.backgroundColor="#1e293b",r.style.fontWeight="",r.title="Requerimientos de Obra pendientes (Almacén)"))}catch(o){console.warn("Could not load project requisitions badge:",o)}}async function dt(o=null){typeof openModal=="function"&&openModal("modalProjectRequisitionsInbox"),await V(o)}async function V(o=null){const e=document.getElementById("reqInboxContainer");if(e){e.innerHTML='<div style="text-align: center; padding: 40px; color: #94a3b8;"><i class="fa-solid fa-spinner fa-spin" style="font-size: 24px;"></i><p style="margin-top: 8px; font-size: 13px;">Cargando pedidos de insumos desde las Obras...</p></div>';try{const t=await H(`${G}/materials/project-requisitions`);if(!t.ok)throw new Error("Error al consultar requisiciones de proyectos.");const a=await t.json();le=window.allProjectRequisitions=Array.isArray(a)?a:[];const n=document.getElementById("reqInboxProjectFilter");if(n){const i=o!==null?String(o):n.value,r=[],l=new Set;le.forEach(c=>{c.project_id&&!l.has(c.project_id)&&(l.add(c.project_id),r.push({id:c.project_id,code:c.project_code||`PRJ-${c.project_id}`,name:c.project_name||"Sin Título"}))}),r.sort((c,d)=>(d.code||"").localeCompare(c.code||""));let s='<option value="">-- Todas las Obras / Proyectos --</option>';r.forEach(c=>{s+=`<option value="${c.id}" ${i==String(c.id)?"selected":""}>[${c.code}] ${c.name}</option>`}),n.innerHTML=s}qe()}catch(t){console.error("Error loading project requisitions inbox:",t),e.innerHTML=`<div style="text-align: center; padding: 30px; color: #ef4444;"><i class="fa-solid fa-triangle-exclamation" style="font-size: 24px;"></i><p style="margin-top: 8px;">Error al cargar las requisiciones: ${t.message}</p></div>`}}}function qe(){var n,i,r;const o=(((n=document.getElementById("reqInboxSearch"))==null?void 0:n.value)||"").toLowerCase().trim(),e=((i=document.getElementById("reqInboxProjectFilter"))==null?void 0:i.value)||"",t=((r=document.getElementById("reqInboxStatusFilter"))==null?void 0:r.value)||"pending";let a=le||[];t==="pending"&&(a=a.filter(l=>(l.quantity_pending||0)>0&&l.status!=="despachado"&&l.status!=="cancelado"&&l.status!=="abortado"&&l.status!=="despachado_total")),e&&(a=a.filter(l=>String(l.project_id)===String(e))),o&&(a=a.filter(l=>(l.material_name||"").toLowerCase().includes(o)||(l.material_code||"").toLowerCase().includes(o)||(l.project_code||"").toLowerCase().includes(o)||(l.project_name||"").toLowerCase().includes(o))),oe(a)}function ct(o){const e=document.getElementById(`req_vehicle_sel_${o}`),t=document.getElementById(`req_plate_${o}`),a=document.getElementById(`req_vehicle_model_${o}`);if(!e||!t||!a)return;const n=e.options[e.selectedIndex];if(!n||n.value===""||n.value==="externo"){n&&n.value==="externo"&&(t.value="",a.value="",t.placeholder="Placa flete (ej: A12BC3D)",a.placeholder="Modelo / Tipo Flete");return}const i=n.getAttribute("data-plate")||"",r=n.getAttribute("data-model")||"";t.value=i!=="S/P"?i:"",a.value=r}window.onReqVehicleChanged=ct;function pt(o){const e=document.getElementById(`req_driver_sel_${o}`),t=document.getElementById(`req_driver_${o}`),a=document.getElementById(`req_driver_ci_${o}`);if(!e||!t||!a)return;const n=e.options[e.selectedIndex];if(!n||n.value===""||n.value==="externo"){n&&n.value==="externo"&&(t.value="",a.value="",t.placeholder="Nombre del Chofer Contratado",a.placeholder="C.I. / Cédula");return}const i=n.getAttribute("data-name")||"",r=n.getAttribute("data-ci")||"";t.value=i,a.value=r}window.onReqDriverChanged=pt;var q=window.currentReqPage=1,S=window.reqPageSize=3,me=window.currentFilteredReqs=[];function oe(o,e=!0){const t=document.getElementById("reqInboxContainer");if(!t)return;if(e&&(q=1),me=o||[],!o||o.length===0){t.innerHTML=`
            <div style="text-align: center; padding: 50px 20px; background: #f8fafc; border-radius: 12px; border: 2px dashed #cbd5e1;">
                <i class="fa-solid fa-circle-check" style="font-size: 40px; color: #10b981; margin-bottom: 12px;"></i>
                <h4 style="font-size: 16px; font-weight: 800; color: #1e293b;">¡No hay requerimientos pendientes de preparación!</h4>
                <p style="font-size: 12px; color: #64748b; max-width: 480px; margin: 6px auto 0;">
                    Todas las solicitudes de insumos formuladas en Obras han sido despachadas o no coinciden con los filtros seleccionados.
                </p>
            </div>
        `;return}const a={};o.forEach(d=>{const y=d.project_id||0;a[y]||(a[y]={project_id:y,project_code:d.project_code||"S/P",project_name:d.project_name||"Sin Obra Asignada",project_location:d.project_location||"",is_internal:!!d.is_internal,max_req_id:d.id||0,items:[]}),a[y].items.push(d),(d.id||0)>a[y].max_req_id&&(a[y].max_req_id=d.id)});const n=Object.values(a);n.sort((d,y)=>(y.max_req_id||0)-(d.max_req_id||0)),n.forEach(d=>{d.items.sort((y,u)=>(u.id||0)-(y.id||0))});const i=n.length,r=Math.max(1,Math.ceil(i/S));q>r&&(q=r);const l=(q-1)*S,s=n.slice(l,l+S);let c="";s.forEach(d=>{const y=d.items.filter(p=>(p.quantity_pending||0)>0).length,u=d.items[0]||{},x=`${u.project_location||d.project_location||""} ${d.project_name||""} ${d.project_code||""}`.toLowerCase(),b=u.is_internal||d.is_internal||x.includes("sede")||x.includes("guacara")||x.includes("taller");let h="";if(b)h=`
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
            `;else{const p=u.project_vehicles||[],I=u.available_fleet||u.all_fleet||[],w=u.project_personnel||[],k=u.available_personnel||u.all_personnel||[],f=p.length>0,_=f&&p[0].plate!=="S/P"?p[0].plate:"",$=f&&(p[0].name||p[0].model)||"";let v='<option value="">-- Seleccionar Flota DALOR o Externo --</option>';p.length>0&&(v+='<optgroup label="🚗 Asignado a esta Obra (Prioridad)">',p.forEach((g,M)=>{const C=M===0?"selected":"";v+=`<option value="${g.id}" data-plate="${g.plate}" data-model="${g.name||g.model}" ${C}>[${g.code}] ${g.name} (${g.plate})</option>`}),v+="</optgroup>"),I.length>0&&(v+='<optgroup label="🚚 Otros Vehículos Disponibles en Base">',I.filter(g=>!p.some(M=>M.id===g.id)).forEach(g=>{v+=`<option value="${g.id}" data-plate="${g.plate}" data-model="${g.name||g.model}">[${g.code}] ${g.name} (${g.plate})</option>`}),v+="</optgroup>"),v+='<optgroup label="🏢 Flete Tercerizado / Externo">',v+=`<option value="externo" data-plate="" data-model="" ${f?"":"selected"}>Flete Externo / Retiro Cliente (Ingreso manual)</option>`,v+="</optgroup>";let m='<option value="">-- Seleccionar Chofer o Externo --</option>';w.length>0&&(m+='<optgroup label="🚗 Personal Asignado a esta Obra">',w.forEach(g=>{m+=`<option value="${g.id}" data-name="${g.name}" data-ci="${g.ci}">${g.name} (C.I: ${g.ci})</option>`}),m+="</optgroup>"),k.length>0&&(m+='<optgroup label="🏢 Chofer / Personal Disponible en Base">',k.filter(g=>!w.some(M=>M.id===g.id)).forEach(g=>{m+=`<option value="${g.id}" data-name="${g.name}" data-ci="${g.ci}">${g.name} (C.I: ${g.ci})</option>`}),m+="</optgroup>"),m+='<optgroup label="✍️ Chofer Contratado / Externo">',m+='<option value="externo" data-name="" data-ci="" selected>✍️ Chofer Externo / Contratado por Fuera (Ingreso manual)</option>',m+="</optgroup>",h=`
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
                            <input type="text" id="req_plate_${d.project_id}" value="${_}" placeholder="Placa (ej: A12BC3D)" class="form-input" style="font-size: 11px; padding: 4px 6px; font-weight: 700; width: 45%;" title="Placa del vehículo">
                            <input type="text" id="req_vehicle_model_${d.project_id}" value="${$}" placeholder="Modelo / Marca" class="form-input" style="font-size: 11px; padding: 4px 6px; width: 55%;" title="Modelo del vehículo">
                        </div>
                    </div>
                    <div>
                        <label style="font-size: 11px; font-weight: 800; color: #0369a1; display: flex; align-items: center; justify-content: space-between; margin-bottom: 3px;">
                            <span><i class="fa-solid fa-id-card"></i> Chofer Asignado al Traslado</span>
                            <span style="font-size: 9.5px; color: #0284c7; font-weight: 700;">(DALOR o Externo)</span>
                        </label>
                        <select id="req_driver_sel_${d.project_id}" onchange="onReqDriverChanged(${d.project_id})" class="form-select" style="font-size: 11px; padding: 5px 8px; background: white; margin-bottom: 4px;">
                            ${m}
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
                            <span style="background: ${b?"#0284c7":"#1e3a8a"}; color: white; font-weight: 800; font-size: 11px; padding: 3px 8px; border-radius: 6px; letter-spacing: 0.5px;">
                                <i class="${b?"fa-solid fa-warehouse":"fa-solid fa-building"}"></i> ${d.project_code}
                            </span>
                            <h4 style="font-size: 15px; font-weight: 800; color: #0f172a; margin: 0;">${d.project_name}</h4>
                            <span style="font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 4px; ${b?"background: #dcfce7; color: #15803d;":"background: #e0f2fe; color: #0369a1;"}">
                                ${b?"🏢 Sede Central":"📍 Obra Foránea (Traslado Externo)"}
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
                ${h}

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
                            ${d.items.map(p=>{const I=(p.quantity_pending||0)<=0||p.status==="despachado",w=p.stock_available||0,k=w<=0,f=I||k,_=f?0:Math.min(p.quantity_pending,w),$=k?'<span style="background: #fee2e2; color: #b91c1c; padding: 2px 7px; border-radius: 4px; font-weight: 800; font-size: 10.5px;"><i class="fa-solid fa-ban"></i> 0.00 (SIN STOCK)</span>':p.has_enough_stock?`<span style="background: #dcfce7; color: #15803d; padding: 2px 7px; border-radius: 4px; font-weight: 700; font-size: 10.5px;"><i class="fa-solid fa-circle-check"></i> ${w.toFixed(2)} ${p.unit_measure}</span>`:`<span style="background: #fef3c7; color: #b45309; padding: 2px 7px; border-radius: 4px; font-weight: 700; font-size: 10.5px;"><i class="fa-solid fa-triangle-exclamation"></i> ${w.toFixed(2)} ${p.unit_measure} (Parcial)</span>`;return`
                                    <tr style="border-bottom: 1px solid #f1f5f9; ${I?"background: #f8fafc; opacity: 0.65;":""} ${k&&!I?"background: #fff1f2;":""}">
                                        <td style="padding: 8px 10px; text-align: center;">
                                            <input type="checkbox" class="req-check-${d.project_id}" data-req-id="${p.id}" data-project-id="${d.project_id}" data-stock="${w}" data-pending="${p.quantity_pending}" ${f?"":"checked"} ${f?"disabled":""}>
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
                                        <td style="padding: 8px 10px; text-align: center; font-weight: 800; color: ${I?"#10b981":"#e11d48"};">
                                            ${I?"0.00 (Listo)":`${(p.quantity_pending||0).toFixed(2)} ${p.unit_measure}`}
                                        </td>
                                        <td style="padding: 8px 10px; text-align: center;">
                                            ${$}
                                        </td>
                                        <td style="padding: 8px 10px; text-align: center;">
                                            <input type="number" step="0.01" min="0" max="${Math.min(p.quantity_pending,w)}" id="req_qty_${p.id}" value="${_}" oninput="onReqQtyChanged(${p.id}, ${p.quantity_pending}, ${w})" class="form-input" style="font-size: 11.5px; padding: 4px 6px; text-align: center; width: 100px; font-weight: 700; ${k?"background-color: #f1f5f9; color: #94a3b8; cursor: not-allowed;":""}" ${f?"disabled":""}>
                                            <div id="req_warn_${p.id}" style="${_<p.quantity_pending&&_>0?"":"display: none;"}">
                                                ${_<p.quantity_pending&&_>0?`<span style="color: #b45309; background: #fef3c7; border: 1px solid #fde68a; padding: 2px 6px; border-radius: 4px; font-size: 9.5px; font-weight: 700; display: inline-block; margin-top: 3px;">⚠️ Parcial: Quedan ${(p.quantity_pending-_).toFixed(2)} por stock</span>`:""}
                                            </div>
                                        </td>
                                        <td style="padding: 8px 10px; text-align: center;">
                                            ${I?'<span class="badge-tag" style="background:#e2e8f0; color:#475569; font-size:10px;">Completado</span>':k?`
                                                <div style="display: flex; flex-direction: column; gap: 3px; align-items: center;">
                                                    <span style="color: #ef4444; font-size: 9.5px; font-weight: 800;"><i class="fa-solid fa-ban"></i> Sin Stock</span>
                                                    <div style="display: flex; gap: 2px;">
                                                        <button type="button" onclick="closeModal('modalProjectRequisitionsInbox'); openSubstituteMaterialModal(${p.id}, ${p.material_id||0}, '${(p.material_name||"").replace(/'/g,"\\'")}', ${d.project_id})" class="btn-secondary" style="font-size: 8.5px; padding: 2px 5px; background: #fef3c7; color: #b45309; border-color: #fde68a; font-weight: 800;" title="Sustituir por otro insumo con inventario">
                                                            <i class="fa-solid fa-shuffle"></i> Sustituir
                                                        </button>
                                                        <button type="button" onclick="closeModal('modalProjectRequisitionsInbox'); openNewPayableModal(); setTimeout(() => { const pSel = document.getElementById('new_cxp_project_id'); if (pSel) pSel.value = '${d.project_id}'; const desc = document.getElementById('new_cxp_description'); if (desc) desc.value = 'Compra urgente de ${(p.material_name||"").replace(/'/g,"\\'")} para obra ${d.project_code}'; }, 200);" class="btn-secondary" style="font-size: 8.5px; padding: 2px 5px; background: #eff6ff; color: #1d4ed8; border-color: #bfdbfe; font-weight: 800;" title="Cargar CxP / Orden de Compra para este material">
                                                            <i class="fa-solid fa-cart-shopping"></i> Comprar
                                                        </button>
                                                    </div>
                                                    <button type="button" onclick="abortProjectRequisition(${p.id}, '${(p.material_name||"").replace(/'/g,"\\'")}', '${d.project_code}')" class="btn-secondary" style="font-size: 8.5px; padding: 2px 7px; background: #fee2e2; color: #b91c1c; border-color: #fca5a5; font-weight: 800; width: 100%;" title="Abortar y sacar este ítem sin stock de la bandeja">
                                                        <i class="fa-solid fa-ban"></i> Abortar
                                                    </button>
                                                </div>
                                              `:`
                                                <div style="display: flex; gap: 4px; align-items: center; justify-content: center;">
                                                    <button type="button" onclick="quickDispatchSingleRequisition(${p.id}, ${d.project_id})" class="btn-secondary" style="font-size: 10px; padding: 3px 8px; border-radius: 4px; background: #e0f2fe; color: #0369a1; border-color: #bae6fd; font-weight: 700;" title="Despachar solo este ítem ahora">
                                                        ⚡ Rápido
                                                    </button>
                                                    <button type="button" onclick="abortProjectRequisition(${p.id}, '${(p.material_name||"").replace(/'/g,"\\'")}', '${d.project_code}')" class="btn-secondary" style="font-size: 10px; padding: 3px 6px; border-radius: 4px; background: #fef2f2; color: #b91c1c; border-color: #fecaca;" title="Abortar o cancelar este requerimiento">
                                                        <i class="fa-solid fa-ban"></i>
                                                    </button>
                                                </div>
                                            `}
                                        </td>
                                    </tr>
                                `}).join("")}
                        </tbody>
                    </table>
                </div>

                <!-- Botón de Despacho de la Obra -->
                <div style="display: flex; justify-content: flex-end; align-items: center; margin-top: 12px; gap: 10px;">
                    <button type="button" onclick="submitDispatchProjectGroup(${d.project_id})" class="btn-primary" style="${b?"background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);":"background: linear-gradient(135deg, #059669 0%, #047857 100%);"} font-weight: 800; font-size: 12px; padding: 8px 18px; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        ${b?'<i class="fa-solid fa-clipboard-check"></i> Entregar Ítems en Taller y Emitir Vale de Control Interno':'<i class="fa-solid fa-truck-ramp-box"></i> Despachar Ítems Marcados y Emitir Guía de Traslado'} (${d.project_code})
                    </button>
                </div>
            </div>
        `}),c+=`
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin-top: 14px; flex-wrap: wrap; gap: 10px;">
            <div style="font-size: 12px; font-weight: 600; color: #475569;">
                Mostrando obras <span style="font-weight: 800; color: #0f172a;">${l+1} - ${Math.min(i,l+S)}</span> de <span style="font-weight: 800; color: #0f172a;">${i}</span> con requerimientos
            </div>
            <div style="display: flex; gap: 6px; align-items: center;">
                <button type="button" onclick="goToReqPage(${q-1})" class="btn-secondary" style="padding: 4px 10px; font-size: 11px;" ${q<=1?'disabled style="opacity: 0.5; cursor: not-allowed;"':""}>
                    <i class="fa-solid fa-chevron-left"></i> Anterior
                </button>
                <span style="font-size: 11.5px; font-weight: 700; color: #1e293b; padding: 0 8px;">
                    Página ${q} de ${r}
                </span>
                <button type="button" onclick="goToReqPage(${q+1})" class="btn-secondary" style="padding: 4px 10px; font-size: 11px;" ${q>=r?'disabled style="opacity: 0.5; cursor: not-allowed;"':""}>
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
    `,t.innerHTML=c}function ut(o){q=o,oe(me,!1)}function ft(o){S=parseInt(o)||3,q=1,oe(me,!1)}function mt(o,e,t){const a=document.getElementById(`req_qty_${o}`),n=document.getElementById(`req_warn_${o}`);if(!a)return;let i=parseFloat(a.value)||0;if(i<0&&(i=0,a.value=0),i>e&&(alert(`⚠️ La cantidad a despachar (${i}) no puede ser mayor a lo solicitado (Saldo pendiente: ${e}). Se ajustó automáticamente.`),i=e,a.value=e),i>t&&(alert(`⚠️ Stock insuficiente en almacén/pañol: Solo hay ${t} unidades disponibles.`),i=t,a.value=t),n)if(i<e&&i>0){const r=(e-i).toFixed(2);n.style.display="block",n.innerHTML=`<span style="color: #b45309; background: #fef3c7; border: 1px solid #fde68a; padding: 2px 6px; border-radius: 4px; font-size: 9.5px; font-weight: 700; display: inline-block; margin-top: 3px;">⚠️ Entrega parcial: Quedarán ${r} pendientes por inventario.</span>`}else i===0?(n.style.display="block",n.innerHTML='<span style="color: #dc2626; background: #fee2e2; border: 1px solid #fecaca; padding: 2px 6px; border-radius: 4px; font-size: 9.5px; font-weight: 700; display: inline-block; margin-top: 3px;">⛔ Cantidad 0: No se incluirá en el traslado.</span>'):n.style.display="none"}function gt(o,e){document.querySelectorAll(`.req-check-${o}`).forEach(t=>{t.disabled||(t.checked=e)})}async function yt(o){var u,x,b,h,p,I,w,k;const e=document.querySelectorAll(`.req-check-${o}:checked`);if(!e||e.length===0){alert("⚠️ Por favor selecciona al menos un insumo disponible de la lista para despachar.");return}const t=[];let a=!1;for(const f of e){const _=parseInt(f.getAttribute("data-req-id")),$=parseFloat(f.getAttribute("data-stock")||0),v=parseFloat(f.getAttribute("data-pending")||0),E=document.getElementById(`req_qty_${_}`),m=parseFloat((E==null?void 0:E.value)||0);if($<=0){alert("⛔ No se puede despachar un ítem con stock 0 en almacén."),E&&E.focus();return}if(m<=0){alert("⚠️ La cantidad a despachar para los ítems seleccionados debe ser mayor a 0."),E&&E.focus();return}if(m>v){alert(`⚠️ La cantidad a despachar (${m}) no puede ser mayor a lo solicitado (${v}).`),E&&E.focus();return}if(m>$){alert(`⚠️ Stock insuficiente: Solicitas ${m} pero solo hay ${$} en almacén.`),E&&E.focus();return}m<v&&(a=!0),t.push({requisition_id:_,quantity_to_dispatch:m})}const n=((u=document.getElementById(`req_is_internal_${o}`))==null?void 0:u.value)==="1";let i=null,r=null,l=null,s=null,c=null;if(!n&&(i=(((x=document.getElementById(`req_driver_${o}`))==null?void 0:x.value)||"").trim(),r=(((b=document.getElementById(`req_driver_ci_${o}`))==null?void 0:b.value)||"").trim(),l=(((h=document.getElementById(`req_plate_${o}`))==null?void 0:h.value)||"").trim(),s=(((p=document.getElementById(`req_vehicle_model_${o}`))==null?void 0:p.value)||"").trim(),c=(I=document.getElementById(`req_vehicle_sel_${o}`))==null?void 0:I.value,!i)){alert("⚠️ Para despachos a Obra Foránea, por favor ingresa o selecciona el Chofer / Conductor asignado."),(w=document.getElementById(`req_driver_${o}`))==null||w.focus();return}const d=(((k=document.getElementById(`req_notes_${o}`))==null?void 0:k.value)||"").trim();let y=n?`¿Confirmas la entrega interna de ${t.length} insumo(s) para los trabajos en Taller Guacara?

Se emitirá el Vale de Control Interno de Almacén.`:`¿Confirmas el despacho de ${t.length} insumo(s) para la Obra Foránea?

Se descontará el stock en Almacén y se emitirá la Guía Oficial de Traslado.`;if(a&&(y+=`

⚠️ ADVERTENCIA: Uno o más ítems tienen una entrega menor a lo solicitado por disponibilidad de inventario. El resto quedará como saldo pendiente en la obra.`),!!confirm(y))try{const f={project_id:o,items:t,is_internal:n,driver_name:i,driver_id_doc:r,vehicle_plate:l,vehicle_model:s,asset_id:c&&c!=="externo"&&!isNaN(parseInt(c))?parseInt(c):null,notes:d},_=await H(`${G}/materials/dispatch-project-requisition`,{method:"POST",body:JSON.stringify(f)});if(_.ok){const $=await _.json();await fe(),await loadMaterialsList(),await V(o);const v=$.guide_number;confirm(`✅ ${$.message||"Despacho registrado exitosamente."}

Se ha emitido el documento N°: ${v}

¿Deseas abrir la Guía en pantalla completa ahora?`)&&typeof window.navigateToDispatchGuide=="function"&&(typeof closeModal=="function"&&closeModal("modalProjectRequisitionsInbox"),window.navigateToDispatchGuide(v))}else{const $=await _.json();alert("❌ Error al procesar despacho: "+($.detail||JSON.stringify($)))}}catch(f){console.error("Error submitting project requisition dispatch:",f),alert("❌ Error de comunicación: "+f.message)}}async function xt(o,e){var h,p,I,w,k,f,_,$;const t=document.getElementById(`req_qty_${o}`),a=parseFloat((t==null?void 0:t.value)||0),n=document.querySelector(`.req-check-${e}[data-req-id="${o}"]`),i=parseFloat((n==null?void 0:n.getAttribute("data-stock"))||0),r=parseFloat((n==null?void 0:n.getAttribute("data-pending"))||0);if(i<=0){alert("⛔ No se puede despachar: Stock disponible en almacén es 0.");return}if(a<=0){alert("⚠️ Ingresa una cantidad válida mayor a 0 para despachar."),t&&t.focus();return}if(a>r){alert(`⚠️ La cantidad a despachar (${a}) no puede ser mayor a lo solicitado (${r}).`),t&&t.focus();return}if(a>i){alert(`⚠️ Stock insuficiente: Requieres ${a} pero solo hay ${i} en pañol.`),t&&t.focus();return}const l=((h=document.getElementById(`req_is_internal_${e}`))==null?void 0:h.value)==="1";let s=null,c=null,d=null,y=null,u=null;if(!l&&(s=(((p=document.getElementById(`req_driver_${e}`))==null?void 0:p.value)||"").trim(),c=(((I=document.getElementById(`req_driver_ci_${e}`))==null?void 0:I.value)||"").trim(),d=(((w=document.getElementById(`req_plate_${e}`))==null?void 0:w.value)||"").trim(),y=(((k=document.getElementById(`req_vehicle_model_${e}`))==null?void 0:k.value)||"").trim(),u=(f=document.getElementById(`req_vehicle_sel_${e}`))==null?void 0:f.value,!s)){alert("⚠️ Para despachos a Obra Foránea, por favor ingresa o selecciona el Chofer / Conductor asignado."),(_=document.getElementById(`req_driver_${e}`))==null||_.focus();return}const x=((($=document.getElementById(`req_notes_${e}`))==null?void 0:$.value)||"").trim();let b=l?`¿Confirmas la entrega rápida de este insumo (${a} unidades) en Taller Guacara?
Se generará el Vale de Control Interno.`:`¿Confirmas el despacho rápido de este insumo (${a} unidades) para la Obra Foránea?
Se generará la Guía Oficial de Traslado.`;if(a<r&&(b+=`

⚠️ ADVERTENCIA: La cantidad a entregar (${a}) es menor a lo solicitado (${r}) por inventario. Quedarán ${(r-a).toFixed(2)} pendientes.`),!!confirm(b))try{const v={project_id:e,items:[{requisition_id:o,quantity_to_dispatch:a}],is_internal:l,driver_name:s,driver_id_doc:c,vehicle_plate:d,vehicle_model:y,asset_id:u&&u!=="externo"&&!isNaN(parseInt(u))?parseInt(u):null,notes:x},E=await H(`${G}/materials/dispatch-project-requisition`,{method:"POST",body:JSON.stringify(v)});if(E.ok){const m=await E.json();await fe(),await loadMaterialsList(),await V(e);const g=m.guide_number;confirm(`✅ Despacho procesado exitosamente.

Se ha emitido la Guía Oficial N°: ${g}

¿Deseas ver la Guía de Despacho ahora?`)&&typeof window.navigateToDispatchGuide=="function"&&(typeof closeModal=="function"&&closeModal("modalProjectRequisitionsInbox"),window.navigateToDispatchGuide(g))}else{const m=await E.json();alert("❌ Error: "+(m.detail||JSON.stringify(m)))}}catch(v){console.error("Error in quick dispatch:",v),alert("❌ Error de comunicación: "+v.message)}}async function bt(o,e,t){const a=prompt(`⚠️ ¿Deseas abortar o cancelar la requisición de '${e}' para la obra ${t}?

Indica el motivo de cancelación (ej: Sin disponibilidad en mercado / Desestimado por obra / Compra directa en sitio / Error de cálculo):`,"Sin disponibilidad en stock / No aplica");if(!(!a||!a.trim()))try{const n=await H(`${G}/materials/project-requisitions/${o}/cancel`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({reason:a.trim()})});if(!n.ok){const i=await n.json().catch(()=>({}));throw new Error(i.detail||"Error al cancelar requisición.")}typeof window.showToast=="function"?window.showToast(`Requisición de '${e}' abortada con éxito.`,"info"):alert(`✅ Requisición de '${e}' cancelada con éxito.`),await V(),typeof window.loadProjectRequisitionsBadge=="function"&&window.loadProjectRequisitionsBadge()}catch(n){console.error("Error al abortar requisición:",n),alert("Error: "+n.message)}}typeof window<"u"&&(window.loadProjectRequisitionsBadge=fe,window.openProjectRequisitionsInboxModal=dt,window.loadProjectRequisitionsInbox=V,window.filterProjectRequisitionsView=qe,window.renderProjectRequisitionsGroups=oe,window.goToReqPage=ut,window.changeReqPageSize=ft,window.onReqQtyChanged=mt,window.toggleSelectAllProjectReqs=gt,window.submitDispatchProjectGroup=yt,window.quickDispatchSingleRequisition=xt,window.abortProjectRequisition=bt);
