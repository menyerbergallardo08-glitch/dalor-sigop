from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.models import Expense, ExpenseCategory, PartnerWithdrawal, AuditLog
from .expenses_common import ExpenseValidationInput

router = APIRouter()

@router.get("/inbox/pending")
def get_pending_inbox(db: Session = Depends(get_db)):
    pending = db.query(Expense).filter(Expense.status.in_(["pendiente_validacion", "pendiente", "pending_approval", "pending"])).order_by(Expense.expense_date.desc()).all()
    results = []
    for exp in pending:
        proj_name = exp.project.name if exp.project else "Sin Proyecto / Sede"
        proj_code = exp.project.code if exp.project else "SEDE"
        cat_name = exp.category.name if exp.category else "Por Clasificar"
        cat_code = exp.category.code if exp.category else "S/C"

        rep_name = "Supervisor de Campo"
        if exp.reported_by and exp.reported_by.full_name:
            rep_name = exp.reported_by.full_name
        elif exp.partner_name and exp.partner_name.startswith("Reportado por:"):
            rep_name = exp.partner_name.replace("Reportado por:", "").strip()
        elif exp.partner_name:
            rep_name = exp.partner_name

        results.append({
            "id": exp.id,
            "date": exp.expense_date.strftime("%d/%m/%Y %H:%M") if exp.expense_date else "Reciente",
            "project_id": exp.project_id,
            "project_name": proj_name,
            "project_code": proj_code,
            "category_id": exp.category_id,
            "category_name": cat_name,
            "category_code": cat_code,
            "expense_type": exp.expense_type or "costo_obra",
            "description": exp.description or "Comprobante de compra",
            "supplier_vendor": exp.supplier_vendor or "Comercio no especificado",
            "amount_usd": float(exp.amount_usd or 0.0),
            "amount_bs": float(exp.amount_bs or 0.0),
            "exchange_rate": float(exp.exchange_rate or 800.0),
            "payment_method": exp.payment_method or "caja_chica",
            "receipt_image_path": exp.receipt_image_path,
            "has_receipt": bool(exp.has_receipt or exp.receipt_image_path),
            "reported_by_name": rep_name,
            "alert_flag": bool(exp.alert_flag),
            "alert_notes": exp.alert_notes or ""
        })
    return results

@router.put("/inbox/{expense_id}/validate-impute")
def validate_and_impute_expense(
    expense_id: int,
    val_in: ExpenseValidationInput,
    db: Session = Depends(get_db)
):
    """
    La encargada de administración valida la foto e imputa el gasto formalmente.
    """
    exp = db.query(Expense).filter(Expense.id == expense_id).first()
    if not exp:
        raise HTTPException(status_code=404, detail="Comprobante no encontrado.")

    cat = db.query(ExpenseCategory).filter(ExpenseCategory.id == val_in.category_id).first()
    if not cat:
        first_cat = db.query(ExpenseCategory).first()
        cat_id = first_cat.id if first_cat else 1
    else:
        cat_id = cat.id

    exp.category_id = cat_id
    exp.expense_type = val_in.expense_type

    if val_in.expense_type == "costo_obra":
        exp.project_id = val_in.project_id
        exp.partner_name = None
    elif val_in.expense_type == "gasto_sede":
        exp.project_id = None
        exp.partner_name = None
    elif val_in.expense_type == "retiro_socio":
        exp.project_id = None
        exp.partner_name = val_in.partner_name or "Socio Dalor"

    exp.supplier_vendor = val_in.supplier_vendor
    exp.description = val_in.description
    exp.amount_usd = val_in.amount_usd
    exp.amount_bs = round(val_in.amount_usd * val_in.exchange_rate, 2)
    exp.exchange_rate = val_in.exchange_rate
    exp.is_tax_exempt = val_in.is_tax_exempt

    if val_in.is_tax_exempt:
        exp.base_amount_usd = val_in.amount_usd
        exp.tax_amount_usd = 0.0
    else:
        b = val_in.base_amount_usd if (val_in.base_amount_usd is not None and val_in.base_amount_usd > 0) else round(val_in.amount_usd / 1.16, 2)
        t = val_in.tax_amount_usd if (val_in.tax_amount_usd is not None and val_in.tax_amount_usd >= 0) else round(val_in.amount_usd - b, 2)
        exp.base_amount_usd = b
        exp.tax_amount_usd = t

    exp.payment_method = val_in.payment_method
    exp.fuel_liters = val_in.fuel_liters
    exp.odometer_at_fueling = val_in.odometer_at_fueling
    exp.status = "aprobado"

    ref_tag = f"EXP-{exp.id}"
    existing_w = db.query(PartnerWithdrawal).filter(PartnerWithdrawal.reference_number == ref_tag).first()
    if val_in.expense_type == "retiro_socio":
        p_name = val_in.partner_name or "Socio Dalor"
        if existing_w:
            existing_w.partner_name = p_name
            existing_w.withdrawal_date = exp.expense_date
            existing_w.concept = val_in.description or f"Retiro de Socio - Comprobante #{exp.id}"
            existing_w.amount_usd = val_in.amount_usd
            existing_w.amount_bs = round(val_in.amount_usd * val_in.exchange_rate, 2)
            existing_w.exchange_rate = val_in.exchange_rate
            existing_w.payment_method = val_in.payment_method or "caja_chica"
        else:
            new_w = PartnerWithdrawal(
                partner_name=p_name,
                withdrawal_date=exp.expense_date,
                concept=val_in.description or f"Retiro de Socio - Comprobante #{exp.id}",
                amount_usd=val_in.amount_usd,
                amount_bs=round(val_in.amount_usd * val_in.exchange_rate, 2),
                exchange_rate=val_in.exchange_rate,
                payment_method=val_in.payment_method or "caja_chica",
                reference_number=ref_tag,
                notes=f"Generado automáticamente desde aprobación de gasto #{exp.id}"
            )
            db.add(new_w)
    else:
        if existing_w:
            db.delete(existing_w)

    if val_in.fuel_liters and val_in.fuel_liters > 0:
        price_l = round(val_in.amount_usd / val_in.fuel_liters, 3)
        exp.price_per_liter_usd = price_l
        if price_l > 0.55:
            exp.alert_flag = True
            exp.alert_notes = f"ALERTA: Precio de combustible ${price_l}/L supera tope de $0.55/L."

    db.commit()

    audit = AuditLog(
        username="administracion",
        module="gastos",
        action="validar_imputar_gasto",
        details=f"Comprobante #{exp.id} validado e imputado a '{exp.expense_type}' por ${exp.amount_usd:.2f}"
    )
    db.add(audit)
    db.commit()

    return {
        "success": True,
        "message": f"Gasto #{exp.id} imputado y aprobado exitosamente.",
        "id": exp.id
    }

@router.put("/inbox/{expense_id}/reject")
def reject_pending_expense(
    expense_id: int,
    reason: Optional[str] = Query("Rechazado por Administración"),
    db: Session = Depends(get_db)
):
    exp = db.query(Expense).filter(Expense.id == expense_id).first()
    if not exp:
        raise HTTPException(status_code=404, detail="Comprobante no encontrado.")
    
    exp.status = "rechazado"
    exp.alert_flag = True
    exp.alert_notes = f"RECHAZADO: {reason}"
    db.commit()

    audit = AuditLog(
        username="administracion",
        module="gastos",
        action="rechazar_gasto",
        details=f"Comprobante #{exp.id} rechazado. Motivo: {reason}"
    )
    db.add(audit)
    db.commit()

    return {"success": True, "message": f"Comprobante #{exp.id} rechazado correctamente."}
