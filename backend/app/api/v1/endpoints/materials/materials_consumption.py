from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime

from app.core.database import get_db
from app.models.models import (
    Material,
    MaterialMovement,
    Project,
    Expense,
    ExpenseCategory,
    DispatchGuide,
    DispatchGuideItem,
    ProjectMaterialRequisition,
)
from app.services.bcv_scraper import BCVScraperService
from .materials_common import MaterialConsumeCreate, MaterialConsumeItem

router = APIRouter()

# 4. SALIDA / DESPACHO DE MATERIAL (A PROYECTO O TALLER - CON GUÍA FORMAL GD-XXXX)
# ------------------------------------------------------------------------------
@router.post("/consume")
def record_material_consumption(consume: MaterialConsumeCreate, db: Session = Depends(get_db)):
    # Normalizar ítems (soporte multi-renglón y mono-ítem)
    raw_items = consume.items if (consume.items and len(consume.items) > 0) else []
    if not raw_items and consume.material_id:
        if (consume.quantity or 0) <= 0:
            raise HTTPException(status_code=400, detail="La cantidad a despachar debe ser mayor a cero.")
        raw_items = [MaterialConsumeItem(material_id=consume.material_id, quantity=consume.quantity)]

    if not raw_items:
        raise HTTPException(status_code=400, detail="Debe indicar al menos un material y cantidad a despachar.")

    try:
        bcv_data = BCVScraperService.get_official_rate()
        current_rate = float(bcv_data.get("rate", 842.21))

        proj = None
        project_name = "Taller Central (Gasto Operativo)"
        if consume.project_id:
            proj = db.query(Project).filter(Project.id == consume.project_id).first()
            if proj:
                project_name = f"Proyecto {proj.code} - {proj.name}"

        # Si el despacho es para una obra, emitir formalmente la Guía de Despacho (Punto 5)
        guide = None
        if proj:
            loc_str = f"{proj.location or ''} {proj.name or ''} {proj.code or ''}".lower()
            is_internal_dest = any(k in loc_str for k in ["sede dalor", "sede central", "guacara", "taller", "interna", "interno"])
            
            prefix = "GCI" if is_internal_dest else "GD"
            current_year = datetime.utcnow().year
            seq = db.query(DispatchGuide).filter(DispatchGuide.guide_number.like(f"{prefix}-%")).count() + 1
            guide_number = f"{prefix}-{current_year}-{seq:03d}"
            while db.query(DispatchGuide).filter(DispatchGuide.guide_number == guide_number).first():
                seq += 1
                guide_number = f"{prefix}-{current_year}-{seq:03d}"

            guide = DispatchGuide(
                guide_number=guide_number,
                guide_type="control_interno" if is_internal_dest else "traslado_externo",
                project_id=proj.id,
                client_id=proj.client_id,
                recipient_name=proj.client_name,
                transfer_reason=f"Asignación Interna de Insumos / Taller {proj.code}" if is_internal_dest else f"Despacho de Materiales a Obra {proj.code}",
                destination_address=proj.location or ("Sede Central DALOR (Guacara)" if is_internal_dest else "Frente de Obra Dalor"),
                destination_plant=proj.name or ("Taller Metalmecánico Guacara" if is_internal_dest else "Recepción en Obra"),
                transport_type="interno" if is_internal_dest else "propio_dalor",
                driver_name=None if is_internal_dest else (consume.driver_name or "Transporte DALOR / Conductor Asignado"),
                driver_id_doc=None if is_internal_dest else "V-DALOR",
                vehicle_plate=None if is_internal_dest else (consume.vehicle_plate or "DALOR-01"),
                delivered_by_staff=consume.performed_by or "Custodio de Almacén Dalor",
                received_by_staff="Personal de Taller / Responsable de Obra",
                status="entregado_conforme" if is_internal_dest else "en_transito",
                dispatcher_name=consume.performed_by or "Custodio de Almacén Dalor",
                notes=consume.notes or (f"Asignación interna directa para {proj.code}" if is_internal_dest else f"Despacho automático de almacén para {proj.code}")
            )
            db.add(guide)
            db.flush()

        total_consumed_usd = 0.0
        despachados_summary = []

        for item in raw_items:
            if item.quantity <= 0:
                continue

            mat = db.query(Material).filter(Material.id == item.material_id).with_for_update().first()
            if not mat:
                raise HTTPException(status_code=404, detail=f"Material #{item.material_id} no encontrado.")

            if item.quantity > mat.stock_quantity:
                raise HTTPException(
                    status_code=400,
                    detail=f"Stock insuficiente para {mat.name}: solicitados {item.quantity} {mat.unit_measure}, disponibles {mat.stock_quantity} {mat.unit_measure}."
                )

            item_cost_usd = item.quantity * mat.unit_cost_usd
            total_consumed_usd += item_cost_usd
            mat.stock_quantity -= item.quantity
            mat.total_cost_usd = round(mat.stock_quantity * mat.unit_cost_usd, 2)

            movement = MaterialMovement(
                material_id=mat.id,
                movement_type="despacho_obra",
                quantity=item.quantity,
                unit_cost_usd=mat.unit_cost_usd,
                total_cost_usd=round(item_cost_usd, 2),
                project_id=consume.project_id,
                destination=consume.destination or (proj.location if proj else "Taller Central"),
                reference_doc=guide.guide_number if guide else (consume.reference_doc or "Vale Interno"),
                notes=f"Destino: {project_name}. {consume.notes or ''}",
                performed_by=consume.performed_by or "Custodio de Almacén"
            )
            db.add(movement)

            # Renglón en la Guía de Despacho si aplica
            if guide:
                g_item = DispatchGuideItem(
                    dispatch_guide_id=guide.id,
                    description=f"[{mat.code}] {mat.name}",
                    quantity=item.quantity,
                    unit=mat.unit_measure,
                    condition_status="Nuevo / Verificado en Almacén"
                )
                db.add(g_item)

            # Si existe una requisición pendiente para este proyecto y material, actualizarla
            if proj:
                req_item = db.query(ProjectMaterialRequisition).filter(
                    ProjectMaterialRequisition.project_id == proj.id,
                    ProjectMaterialRequisition.material_id == mat.id
                ).first()
                if req_item:
                    req_item.quantity_dispatched = (req_item.quantity_dispatched or 0.0) + item.quantity
                    if req_item.quantity_dispatched >= req_item.quantity_required:
                        req_item.status = "despachado_total"
                    else:
                        req_item.status = "despachado_parcial"

            despachados_summary.append(f"{item.quantity:g} {mat.unit_measure} de {mat.name}")

        total_consumed_usd = round(total_consumed_usd, 2)

        # Si es para obra, imputar gasto contable
        if consume.project_id:
            cat = db.query(ExpenseCategory).filter(
                (ExpenseCategory.name.ilike("%Insumos%")) | (ExpenseCategory.name.ilike("%Materiales%"))
            ).first() or db.query(ExpenseCategory).first()

            desc_exp = f"Despacho Insumos ({len(raw_items)} ítems) a {project_name}: " + "; ".join(despachados_summary[:3])
            expense = Expense(
                category_id=cat.id if cat else 1,
                project_id=consume.project_id,
                expense_type="costo_obra",
                description=desc_exp[:250],
                supplier_vendor="Almacen Central Dalor",
                amount_usd=total_consumed_usd,
                amount_bs=round(total_consumed_usd * current_rate, 2),
                exchange_rate=current_rate,
                payment_method="consumo_inventario",
                status="aprobado",
                has_receipt=False,
                alert_notes=f"Guía de Despacho #{guide.guide_number if guide else 'S/G'}"
            )
            db.add(expense)

        db.commit()

        return {
            "success": True,
            "message": f"Despacho procesado exitosamente ({len(raw_items)} renglones imputados a {project_name})." + (f" Guía de Despacho formal #{guide.guide_number} emitida." if guide else ""),
            "items_count": len(raw_items),
            "total_cost_imputed_usd": total_consumed_usd,
            "guide_id": guide.id if guide else None,
            "guide_number": guide.guide_number if guide else None
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Fallo en transacción atómica de despacho: {str(e)}")



