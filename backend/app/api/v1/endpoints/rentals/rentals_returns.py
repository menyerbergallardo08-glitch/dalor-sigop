from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime

from app.core.database import get_db
from app.models.models import (
    AssetRentalLoan, AssetRentalLoanItem, Asset, AuditLog, Material, 
    MaterialMovement, AccountPayable, AccountReceivable, Client
)
from app.api.deps import get_current_active_user
from .rentals_common import RentalReturnIn, RentalPartialReturnIn

router = APIRouter()

@router.post("/{item_id}/return")
def return_rental_loan(
    item_id: int,
    ret_in: RentalReturnIn,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    item = db.query(AssetRentalLoan).filter(AssetRentalLoan.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Registro de préstamo o alquiler no encontrado.")

    item.actual_return_date = ret_in.return_date or datetime.utcnow()
    item.status = ret_in.condition_status
    item.return_notes = ret_in.return_notes

    # 1. Procesar retorno completo de ítems asociados
    if item.items:
        for sub in item.items:
            rem = sub.quantity - (sub.returned_quantity or 0.0)
            if rem > 0:
                if sub.item_type == "material" and sub.material_id and item.direction == "dalor_a_tercero":
                    mat_obj = db.query(Material).filter(Material.id == sub.material_id).first()
                    if mat_obj:
                        mat_obj.stock_quantity += rem
                        mat_mov = MaterialMovement(
                            material_id=mat_obj.id,
                            movement_type="retorno_prestamo",
                            quantity=rem,
                            unit_cost_usd=mat_obj.unit_cost_usd,
                            total_cost_usd=round(rem * mat_obj.unit_cost_usd, 2),
                            destination="Almacén Central Dalor",
                            reference_doc=item.operation_code,
                            notes=f"Retorno total de material [{item.operation_code}] de {item.external_entity}",
                            performed_by=current_user.username if hasattr(current_user, "username") else "Almacén"
                        )
                        db.add(mat_mov)
                elif sub.item_type == "asset" and sub.asset_id:
                    asset_obj = db.query(Asset).filter(Asset.id == sub.asset_id).first()
                    if asset_obj:
                        asset_obj.status = "disponible_base"
                        asset_obj.current_location = "Sede Central Guacara"
                        asset_obj.current_custodian_name = "Almacén Central"
                        asset_obj.return_due_date = None

            sub.returned_quantity = sub.quantity
            sub.status = "devuelto_total"
            sub.return_date = ret_in.return_date or datetime.utcnow()
            sub.return_condition = ret_in.condition_status
            sub.return_notes = ret_in.return_notes

    # 2. Compatibilidad con registros antiguos de activo o material único
    if item.asset_id:
        asset_obj = db.query(Asset).filter(Asset.id == item.asset_id).first()
        if asset_obj:
            asset_obj.status = "disponible_base"
            asset_obj.current_location = "Sede Central Guacara"
            asset_obj.current_custodian_name = "Almacén Central"
            asset_obj.return_due_date = None

    if item.material_id and item.direction == "dalor_a_tercero" and not item.items:
        mat_obj = db.query(Material).filter(Material.id == item.material_id).first()
        if mat_obj:
            qty = float(item.material_quantity or 1.0)
            mat_obj.stock_quantity += qty
            mat_mov = MaterialMovement(
                material_id=mat_obj.id,
                movement_type="retorno_prestamo",
                quantity=qty,
                unit_cost_usd=mat_obj.unit_cost_usd,
                total_cost_usd=round(qty * mat_obj.unit_cost_usd, 2),
                destination="Almacén Central Dalor",
                reference_doc=item.operation_code,
                notes=f"Devolución de material prestado [{item.operation_code}] de {item.external_entity}",
                performed_by=current_user.username if hasattr(current_user, "username") else "Almacén"
            )
            db.add(mat_mov)

    # 3. Liquidación Financiera por Días Reales / Prórroga (solo si es alquiler con tarifa > 0)
    settlement_summary = ""
    if item.operation_type == "alquiler" and (item.rate_usd or 0.0) > 0.0:
        start_dt = item.start_date or item.created_at
        ret_dt = ret_in.return_date or datetime.utcnow()
        expected_dt = item.expected_return_date or ret_dt

        days_planned = max(1, (expected_dt.date() - start_dt.date()).days)
        days_actual = max(1, (ret_dt.date() - start_dt.date()).days)
        extra_days = days_actual - days_planned

        # A) Reajuste por devolución anticipada (días_actual < días_planned)
        if ret_in.settlement_action == "adjust_real_days" and days_actual < days_planned:
            new_amount = round(item.rate_usd * days_actual, 2)
            if item.direction == "dalor_a_tercero":
                ar = db.query(AccountReceivable).filter(AccountReceivable.invoice_number == f"ALQ-CXC-{item.operation_code}").first()
                if ar:
                    ar.amount_usd = new_amount
                    ar.taxable_base_usd = new_amount
                    ar.net_amount_usd = new_amount
                    paid = ar.paid_amount_usd or 0.0
                    ar.balance_usd = max(0.0, round(new_amount - paid, 2))
                    if ar.balance_usd == 0.0 and paid >= new_amount:
                        ar.status = "pagado"
                    if paid > new_amount:
                        diff = round(paid - new_amount, 2)
                        ar.notes = (ar.notes or "") + f" | Saldo a favor cliente: ${diff:.2f} USD por entrega anticipada ({days_actual} de {days_planned} días)."
                    settlement_summary = f"Factura CxC reajustada a ${new_amount:.2f} USD ({days_actual} días reales consumidos)."
            elif item.direction == "tercero_a_dalor":
                ap = db.query(AccountPayable).filter(AccountPayable.invoice_number == f"ALQ-CXP-{item.operation_code}").first()
                if ap:
                    ap.amount_usd = new_amount
                    ap.taxable_base_usd = new_amount
                    ap.net_amount_usd = new_amount
                    paid = ap.paid_amount_usd or 0.0
                    ap.balance_usd = max(0.0, round(new_amount - paid, 2))
                    if ap.balance_usd == 0.0 and paid >= new_amount:
                        ap.status = "pagado"
                    settlement_summary = f"Factura CxP reajustada a ${new_amount:.2f} USD ({days_actual} días reales consumidos)."

        # B) Días excedentes / Prórroga renegociada o adicional (días_actual > días_planned)
        elif ret_in.settlement_action == "extension_negotiation" and extra_days > 0:
            extra_amount = 0.0
            mode = ret_in.extension_mode or "contract_rate"
            rate_used = item.rate_usd

            if mode == "contract_rate":
                extra_amount = round(item.rate_usd * extra_days, 2)
            elif mode == "negotiated_rate":
                rate_used = float(ret_in.negotiated_rate_usd or item.rate_usd)
                extra_amount = round(rate_used * extra_days, 2)
            elif mode == "lump_sum":
                extra_amount = round(float(ret_in.lump_sum_amount_usd or 0.0), 2)
            elif mode == "waive":
                extra_amount = 0.0

            if extra_amount > 0.0:
                ext_code = f"{item.operation_code}-EXT"
                desc_ext = f"Prórroga de alquiler: {item.equipment_name} a {item.external_entity} ({extra_days} días extra @ ${rate_used}/d)"
                if mode == "lump_sum":
                    desc_ext = f"Prórroga de alquiler: {item.equipment_name} a {item.external_entity} ({extra_days} días extra - monto plano)"

                if item.direction == "dalor_a_tercero":
                    cli = db.query(Client).filter(Client.name.ilike(f"%{item.external_entity.strip()}%")).first()
                    ar_ext = AccountReceivable(
                        invoice_number=f"ALQ-CXC-{ext_code}",
                        client_id=cli.id if cli else 1,
                        project_id=item.project_id,
                        description=desc_ext,
                        issue_date=ret_dt,
                        due_date=ret_dt,
                        amount_usd=extra_amount,
                        taxable_base_usd=extra_amount,
                        net_amount_usd=extra_amount,
                        paid_amount_usd=0.0,
                        balance_usd=extra_amount,
                        status="pendiente",
                        notes=ret_in.settlement_notes or f"Negociación prórroga operación {item.operation_code}"
                    )
                    db.add(ar_ext)
                    settlement_summary = f"Generada CxC prórroga [{ar_ext.invoice_number}] por ${extra_amount:.2f} USD."
                elif item.direction == "tercero_a_dalor":
                    ap_ext = AccountPayable(
                        invoice_number=f"ALQ-CXP-{ext_code}",
                        supplier_name=item.external_entity.strip(),
                        project_id=item.project_id,
                        payable_type="alquiler_maquinaria_externa",
                        description=desc_ext,
                        issue_date=ret_dt,
                        due_date=ret_dt,
                        amount_usd=extra_amount,
                        taxable_base_usd=extra_amount,
                        net_amount_usd=extra_amount,
                        paid_amount_usd=0.0,
                        balance_usd=extra_amount,
                        status="pendiente",
                        notes=ret_in.settlement_notes or f"Adenda prórroga proveedor {item.external_entity}"
                    )
                    db.add(ap_ext)
                    settlement_summary = f"Generada CxP prórroga [{ap_ext.invoice_number}] por ${extra_amount:.2f} USD."
            elif mode == "waive":
                settlement_summary = f"Cortesía comercial: $0 adicionales acordados por {extra_days} días excedentes."
                item.return_notes = (item.return_notes or "") + f" | {settlement_summary}"

    audit = AuditLog(
        username=current_user.username if hasattr(current_user, "username") else "operaciones",
        module="Activos / Alquileres y Prestamos",
        action="Registrar Devolución de Equipo",
        details=f"Equipo [{item.operation_code}] {item.equipment_name} devuelto por {item.external_entity}. Condición: {ret_in.condition_status}. {settlement_summary}"
    )
    db.add(audit)

    db.commit()
    return {
        "success": True,
        "message": f"Devolución del recurso [{item.equipment_name}] registrada conforme exitosamente. {settlement_summary}".strip(),
        "id": item.id
    }


@router.post("/{item_id}/return-partial")
def return_rental_loan_partial(
    item_id: int,
    ret_in: RentalPartialReturnIn,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    item = db.query(AssetRentalLoan).filter(AssetRentalLoan.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Operación no encontrada.")

    sub_item = db.query(AssetRentalLoanItem).filter(
        AssetRentalLoanItem.id == ret_in.item_sub_id,
        AssetRentalLoanItem.rental_id == item_id
    ).first()
    if not sub_item:
        raise HTTPException(status_code=404, detail="Ítem no encontrado en esta operación.")

    qty_to_return = float(ret_in.returned_quantity or 1.0)
    pending_qty = sub_item.quantity - (sub_item.returned_quantity or 0.0)
    if qty_to_return > pending_qty + 0.001:
        raise HTTPException(status_code=400, detail=f"La cantidad a devolver ({qty_to_return}) supera lo pendiente ({pending_qty}).")

    sub_item.returned_quantity = round((sub_item.returned_quantity or 0.0) + qty_to_return, 2)
    if sub_item.returned_quantity >= (sub_item.quantity - 0.001):
        sub_item.status = "devuelto_total"
    else:
        sub_item.status = "devuelto_parcial"
    
    sub_item.return_date = datetime.utcnow()
    sub_item.return_condition = ret_in.condition_status
    sub_item.return_notes = ret_in.return_notes

    # Reponer stock de material
    if sub_item.item_type == "material" and sub_item.material_id and item.direction == "dalor_a_tercero":
        mat = db.query(Material).filter(Material.id == sub_item.material_id).first()
        if mat:
            mat.stock_quantity += qty_to_return
            mov = MaterialMovement(
                material_id=mat.id,
                movement_type="retorno_prestamo",
                quantity=qty_to_return,
                unit_cost_usd=mat.unit_cost_usd,
                total_cost_usd=round(qty_to_return * mat.unit_cost_usd, 2),
                destination="Almacén Central Dalor",
                reference_doc=item.operation_code,
                notes=f"Retorno parcial de {sub_item.name} [{item.operation_code}] ({qty_to_return})",
                performed_by=current_user.username if hasattr(current_user, "username") else "Almacén"
            )
            db.add(mov)

    # Si es activo y se devolvió total, liberar activo
    if sub_item.item_type == "asset" and sub_item.asset_id:
        ast = db.query(Asset).filter(Asset.id == sub_item.asset_id).first()
        if ast:
            ast.status = "disponible_base"
            ast.current_location = "Sede Central Guacara"
            ast.current_custodian_name = "Almacén Central"
            ast.return_due_date = None

    # Verificar si todos los items de la operación ya se devolvieron
    all_items = db.query(AssetRentalLoanItem).filter(AssetRentalLoanItem.rental_id == item_id).all()
    if all(it.status == "devuelto_total" for it in all_items):
        item.status = "devuelto_conforme"
        item.actual_return_date = datetime.utcnow()
    else:
        item.status = "retorno_parcial"

    db.commit()
    return {
        "success": True,
        "message": f"Retorno parcial de [{sub_item.name}] registrado con éxito.",
        "item_status": sub_item.status,
        "operation_status": item.status
    }
