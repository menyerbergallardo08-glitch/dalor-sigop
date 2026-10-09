from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from app.core.database import get_db
from app.models.models import (
    Material,
    MaterialMovement,
    Expense,
    ExpenseCategory,
    AccountPayable,
)
from app.services.bcv_scraper import BCVScraperService
from .materials_common import MaterialEntryCreate, MaterialEntryItem

router = APIRouter()

# 3. ENTRADA DE MATERIAL (COMPRA / INGRESO A ALMACEN - SOPORTE MULTI-RENGLÓN)
# ------------------------------------------------------------------------------
@router.post("/entry")
def record_material_entry(entry: MaterialEntryCreate, db: Session = Depends(get_db)):
    # 1. Normalizar ítems (soporte multi-renglón y retrocompatibilidad mono-ítem)
    raw_items = entry.items if (entry.items and len(entry.items) > 0) else []
    if not raw_items and entry.material_id:
        if (entry.quantity or 0) <= 0:
            raise HTTPException(status_code=400, detail="La cantidad debe ser mayor a cero.")
        raw_items = [MaterialEntryItem(
            material_id=entry.material_id,
            quantity=entry.quantity,
            unit_cost_usd=entry.unit_cost_usd or 0.0
        )]

    if not raw_items:
        raise HTTPException(status_code=400, detail="Debe ingresar al menos un renglón de material con cantidad válida.")

    # Validar campos obligatorios de la compra / factura
    supp = (entry.supplier_name or "").strip()
    if not supp or supp.lower() in ["proveedor general", "proveedor de materiales", "n/a", "-"]:
        raise HTTPException(status_code=400, detail="Debe especificar el nombre real del Proveedor o Vendedor de la compra.")

    doc = (entry.reference_doc or "").strip()
    if not doc or doc.lower() in ["factura compra", "compra de material", "n/a", "-"]:
        raise HTTPException(status_code=400, detail="Debe especificar el Número de Factura o Guía de Entrega del Proveedor.")

    for idx, item in enumerate(raw_items):
        if (item.quantity or 0) <= 0:
            raise HTTPException(status_code=400, detail=f"Renglón #{idx + 1}: La cantidad debe ser mayor a cero.")
        if (item.unit_cost_usd or 0) <= 0:
            raise HTTPException(status_code=400, detail=f"Renglón #{idx + 1}: El costo unitario en USD debe ser mayor a cero.")

    if not entry.register_in_cxp and not (entry.payment_ref or "").strip():
        raise HTTPException(status_code=400, detail="Para compras de contado debe indicar el número de referencia o recibo de pago.")

    try:
        bcv_data = BCVScraperService.get_official_rate()
        current_rate = float(bcv_data.get("rate", 842.21))

        invoice_total_usd = 0.0
        processed_items_desc = []
        created_movements = []

        for item in raw_items:
            if item.quantity <= 0:
                continue

            mat = db.query(Material).filter(Material.id == item.material_id).with_for_update().first()
            if not mat:
                raise HTTPException(status_code=404, detail=f"Material #{item.material_id} no encontrado.")

            item_total = item.quantity * item.unit_cost_usd
            invoice_total_usd += item_total

            prev_stock = max(0.0, float(mat.stock_quantity or 0.0))
            prev_cost = float(mat.unit_cost_usd or 0.0)
            new_qty = float(item.quantity)
            new_cost = float(item.unit_cost_usd)
            total_qty = prev_stock + new_qty

            if total_qty > 0 and new_cost > 0:
                if prev_stock > 0 and prev_cost > 0:
                    # Costo Promedio Ponderado (CPP)
                    mat.unit_cost_usd = round(((prev_stock * prev_cost) + (new_qty * new_cost)) / total_qty, 4)
                else:
                    mat.unit_cost_usd = round(new_cost, 4)

            is_discrete = (mat.unit_measure or "").strip().lower() in ["und", "unid", "unidad", "unidades", "pza", "pieza", "piezas", "rollo", "rollos"]
            mat.stock_quantity = float(round(total_qty)) if is_discrete else round(total_qty, 2)
            mat.total_cost_usd = round(mat.stock_quantity * mat.unit_cost_usd, 2)

            movement = MaterialMovement(
                material_id=mat.id,
                movement_type="entrada_compra",
                quantity=item.quantity,
                unit_cost_usd=item.unit_cost_usd,
                total_cost_usd=round(item_total, 2),
                destination="Almacen Central",
                reference_doc=entry.reference_doc or "Compra de Material",
                notes=f"Proveedor: {entry.supplier_name or 'N/A'}. {entry.notes or ''}",
                performed_by=entry.performed_by or "Custodio de Almacén"
            )
            db.add(movement)
            db.flush()
            created_movements.append(movement)
            processed_items_desc.append(f"{item.quantity:g} {mat.unit_measure} de {mat.name}")

        invoice_total_usd = round(invoice_total_usd, 2)
        summary_desc = f"Compra ({len(processed_items_desc)} ítems): " + "; ".join(processed_items_desc[:4])
        if len(processed_items_desc) > 4:
            summary_desc += f" y {len(processed_items_desc) - 4} más..."

        cash_expense = None
        created_cxp = None
        first_mov_id = created_movements[0].id if created_movements else None
        ref_code = entry.reference_doc or f"CXP-ENT-{first_mov_id or int(datetime.utcnow().timestamp())}"

        if entry.register_in_cxp:
            due_date = datetime.utcnow() + timedelta(days=entry.due_days or 15)
            created_cxp = AccountPayable(
                invoice_number=ref_code,
                supplier_name=entry.supplier_name or "Proveedor de Materiales",
                payable_type="stock_almacen",
                project_id=None,
                description=summary_desc[:250],
                due_date=due_date,
                amount_usd=invoice_total_usd,
                amount_bs=round(invoice_total_usd * current_rate, 2),
                exchange_rate=current_rate,
                balance_usd=invoice_total_usd,
                status="pendiente",
                warehouse_movement_id=first_mov_id,
                warehouse_entry_ref=ref_code,
                notes=f"Generado automáticamente desde entrada de almacén multi-renglón ({len(raw_items)} ítems). {entry.notes or ''}"
            )
            db.add(created_cxp)
        else:
            cat = db.query(ExpenseCategory).filter((ExpenseCategory.code == "17.0") | (ExpenseCategory.code == "11.0")).first()
            ref_info = f"Ref: {entry.payment_ref or entry.reference_doc or 'Contado Almacén'}."
            note_info = f" {entry.notes}" if entry.notes else ""
            cash_expense = Expense(
                category_id=cat.id if cat else 17,
                expense_type="gasto_sede",
                expense_date=datetime.utcnow(),
                description=f"Compra Contado Stock ({len(raw_items)} ítems). {summary_desc[:180]}. {ref_info}{note_info}",
                supplier_vendor=entry.supplier_name or "Proveedor de Materiales",
                amount_usd=invoice_total_usd,
                amount_bs=round(invoice_total_usd * current_rate, 2),
                exchange_rate=current_rate,
                payment_method=entry.payment_channel or "caja_chica_usd",
                status="aprobado"
            )
            db.add(cash_expense)

        db.commit()

        return {
            "success": True,
            "message": f"Entrada multi-renglón procesada exitosamente ({len(raw_items)} ítems ingresados por ${invoice_total_usd:,.2f} USD).",
            "items_count": len(raw_items),
            "total_usd": invoice_total_usd,
            "expense_id": cash_expense.id if cash_expense else None,
            "cxp_id": created_cxp.id if created_cxp else None,
            "invoice_number": ref_code
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Fallo en transacción atómica de almacén: {str(e)}")



