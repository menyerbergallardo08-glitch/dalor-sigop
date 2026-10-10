from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from app.core.database import get_db
from app.models.models import Expense, ExpenseCategory, Project, Asset, Personnel, AuditLog
from app.schemas.schemas import ExpenseCreate, ExpenseOut
from .expenses_common import BatchExpenseRow, ManualExpenseCreate

router = APIRouter()

@router.get("/", response_model=List[ExpenseOut])
def get_expenses(
    project_id: Optional[int] = None,
    category_id: Optional[int] = None,
    direct_only: bool = False,
    alert_only: bool = False,
    status: Optional[str] = "aprobado",
    db: Session = Depends(get_db)
):
    query = db.query(Expense).options(
        joinedload(Expense.category),
        joinedload(Expense.project)
    )
    if status and status.lower() not in ("todos", "all", "*"):
        query = query.filter(Expense.status == status)
    if project_id:
        query = query.filter(Expense.project_id == project_id)
    if category_id:
        if direct_only:
            query = query.filter(Expense.category_id == category_id)
        else:
            cat = db.query(ExpenseCategory).filter(ExpenseCategory.id == category_id).first()
            if cat and (cat.code.endswith(".0") or cat.parent_id is None):
                prefix = cat.code.split('.')[0]
                child_cats = db.query(ExpenseCategory.id).filter(
                    (ExpenseCategory.parent_id == cat.id) |
                    (ExpenseCategory.code.like(f"{prefix}.%"))
                ).all()
                cat_ids = [c[0] for c in child_cats]
                cat_ids.append(cat.id)
                query = query.filter(Expense.category_id.in_(cat_ids))
            else:
                query = query.filter(Expense.category_id == category_id)
    if alert_only:
        query = query.filter(Expense.alert_flag == True)
    return query.order_by(Expense.expense_date.desc()).all()

@router.post("/import-batch")
def import_batch_expenses(rows: List[BatchExpenseRow], db: Session = Depends(get_db)):
    created_count = 0
    errors = []

    for idx, r in enumerate(rows):
        try:
            cat = db.query(ExpenseCategory).filter(ExpenseCategory.code == r.category_code).first()
            if not cat:
                cat = db.query(ExpenseCategory).first()

            proj = None
            if r.project_code:
                proj = db.query(Project).filter(Project.code == r.project_code).first()

            new_exp = Expense(
                category_id=cat.id if cat else 1,
                project_id=proj.id if proj else None,
                expense_type=r.expense_type,
                description=r.description,
                supplier_vendor=r.supplier_vendor,
                amount_usd=r.amount_usd,
                amount_bs=round(r.amount_usd * 800.0, 2),
                exchange_rate=800.0,
                payment_method=r.payment_method,
                status="aprobado",
                has_receipt=False
            )
            db.add(new_exp)
            created_count += 1
        except Exception as e:
            errors.append(f"Fila {idx+1}: {str(e)}")

    db.commit()

    audit = AuditLog(
        username="admin",
        module="importador_gastos",
        action="carga_masiva_excel",
        details=f"Importación masiva completada: {created_count} registros creados con éxito."
    )
    db.add(audit)
    db.commit()

    return {
        "success": True,
        "imported_count": created_count,
        "errors": errors,
        "message": f"Se importaron {created_count} gastos históricos con éxito al sistema."
    }

@router.post("/", response_model=List[ExpenseOut])
def create_expense(expense_in: ExpenseCreate, db: Session = Depends(get_db)):
    # 🛡️ Validación Estricta Contable: Rechazar montos negativos o en cero
    if (expense_in.amount_usd is not None and expense_in.amount_usd < 0) or (expense_in.amount_bs is not None and expense_in.amount_bs < 0):
        raise HTTPException(status_code=400, detail="El monto del comprobante o gasto no puede ser negativo.")

    raw_usd = float(expense_in.amount_usd or 0.0)
    raw_bs = float(expense_in.amount_bs or 0.0)
    if raw_usd <= 0 and raw_bs <= 0:
        raise HTTPException(status_code=400, detail="El monto del comprobante/gasto debe ser estrictamente mayor a cero.")

    # 🛡️ Validación de Gastos Divididos (Split Items)
    if expense_in.split_items and len(expense_in.split_items) > 0:
        split_sum = sum(float(s.amount_usd or 0.0) for s in expense_in.split_items)
        target_total = raw_usd if raw_usd > 0 else round(raw_bs / float(expense_in.exchange_rate or 800.0), 2)
        if abs(split_sum - target_total) > 0.05:
            raise HTTPException(
                status_code=400,
                detail=f"Descuadre en gasto dividido: La suma de las partes (${split_sum:.2f}) no coincide con el total declarado (${target_total:.2f})."
            )

    try:
        alert_flag = False
        alert_notes = None

        clean_vendor = (expense_in.supplier_vendor or "Comercio General").strip()
        amt_usd = raw_usd
        amt_bs = raw_bs
        rate = float(expense_in.exchange_rate or 800.0)

        if amt_usd <= 0 and amt_bs > 0:
            amt_usd = round(amt_bs / rate, 2)
        elif amt_bs <= 0 and amt_usd > 0:
            amt_bs = round(amt_usd * rate, 2)

        if amt_usd > 0 and clean_vendor:
            cutoff_date = datetime.utcnow() - timedelta(days=20)
            existing_dup = db.query(Expense).filter(
                Expense.status != "rechazado",
                Expense.expense_date >= cutoff_date,
                func.lower(Expense.supplier_vendor) == clean_vendor.lower(),
                func.abs(Expense.amount_usd - amt_usd) < 0.03
            ).first()

            if existing_dup:
                rep_user = existing_dup.partner_name or "Usuario previo"
                date_str = existing_dup.expense_date.strftime("%d/%m/%Y") if existing_dup.expense_date else "reciente"
                alert_flag = True
                alert_notes = f"⚠️ Posible duplicado: Monto idéntico (${existing_dup.amount_usd:.2f}) registrado el {date_str} (Gasto #{existing_dup.id})."
                
                if not expense_in.has_receipt and not expense_in.allow_duplicate:
                    raise HTTPException(
                        status_code=409,
                        detail=f"⚠️ Posible duplicado detectado: Ya existe un gasto para '{existing_dup.supplier_vendor}' por ${existing_dup.amount_usd:.2f} registrado el {date_str} ({rep_user}, ID #{existing_dup.id}). Si estás seguro de que es otro gasto idéntico, confirma el envío."
                    )

        if expense_in.fuel_liters and expense_in.fuel_liters > 0:
            price_per_l = round(amt_usd / expense_in.fuel_liters, 3)
            if price_per_l > 0.55:
                alert_flag = True
                alert_notes = f"ALERTA: Precio de combustible ${price_per_l}/L supera tope autorizado ($0.55/L)."

        price_l = round(amt_usd / expense_in.fuel_liters, 3) if (expense_in.fuel_liters and expense_in.fuel_liters > 0) else None
        
        rep_name = (expense_in.reported_by_name or "Personal de Campo").strip()[:80]
        rep_tag = f"Reportado por: {rep_name}"

        safe_rep_id = expense_in.reported_by_id
        if safe_rep_id:
            p_check = db.query(Personnel.id).filter(Personnel.id == safe_rep_id).first()
            if not p_check:
                first_p = db.query(Personnel.id).first()
                safe_rep_id = first_p[0] if first_p else None

        safe_proj_id = expense_in.project_id
        if safe_proj_id:
            proj_check = db.query(Project.id).filter(Project.id == safe_proj_id).first()
            if not proj_check:
                safe_proj_id = None

        safe_asset_id = expense_in.asset_id
        if safe_asset_id:
            asset_check = db.query(Asset.id).filter(Asset.id == safe_asset_id).first()
            if not asset_check:
                safe_asset_id = None

        safe_cat_id = expense_in.category_id or 1
        cat_check = db.query(ExpenseCategory.id).filter(ExpenseCategory.id == safe_cat_id).first()
        if not cat_check:
            first_cat = db.query(ExpenseCategory.id).first()
            safe_cat_id = first_cat[0] if first_cat else 1

        desc_final = (expense_in.description or f"Comprobante en {clean_vendor}").strip()
        if not desc_final:
            desc_final = "Comprobante de campo"

        base_usd = expense_in.base_amount_usd if expense_in.base_amount_usd is not None else (amt_usd if expense_in.is_tax_exempt else round(amt_usd / 1.16, 2))
        tax_usd = expense_in.tax_amount_usd if expense_in.tax_amount_usd is not None else (0.0 if expense_in.is_tax_exempt else round(amt_usd - round(amt_usd / 1.16, 2), 2))

        db_exp = Expense(
            category_id=safe_cat_id,
            project_id=safe_proj_id,
            cost_center_id=expense_in.cost_center_id,
            asset_id=safe_asset_id,
            reported_by_id=safe_rep_id,
            partner_name=rep_tag,
            expense_type="costo_obra" if safe_proj_id else "gasto_sede",
            description=desc_final,
            supplier_vendor=clean_vendor,
            amount_bs=amt_bs,
            exchange_rate=rate,
            amount_usd=amt_usd,
            base_amount_usd=base_usd,
            tax_amount_usd=tax_usd,
            is_tax_exempt=expense_in.is_tax_exempt,
            fuel_liters=expense_in.fuel_liters,
            price_per_liter_usd=price_l,
            odometer_at_fueling=expense_in.odometer_at_fueling,
            payment_method=expense_in.payment_method or "caja_chica",
            status="pendiente_validacion" if (expense_in.has_receipt or expense_in.receipt_image_path or "Comprobante" in (expense_in.description or "")) else "aprobado",
            has_receipt=expense_in.has_receipt,
            receipt_image_path=expense_in.receipt_image_path,
            alert_flag=alert_flag,
            alert_notes=alert_notes
        )

        db.add(db_exp)
        db.commit()
        db.refresh(db_exp)

        try:
            audit_user = rep_name[:45]
            audit = AuditLog(
                username=audit_user,
                module="gastos",
                action="registro_gasto",
                details=f"Gasto #{db_exp.id} registrado por ${amt_usd:.2f} para '{clean_vendor[:60]}' por {audit_user}"
            )
            db.add(audit)
            db.commit()
        except Exception as a_err:
            db.rollback()
            print(f"[Audit Warning] Could not record audit log: {a_err}")

        return [db_exp]
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"[Critical Expense Fallback Error] {e}")
        try:
            fallback_exp = Expense(
                category_id=1,
                project_id=None,
                partner_name="Reportado por: Campo",
                expense_type="gasto_sede",
                description="Comprobante móvil por validar",
                supplier_vendor="Comercio por validar",
                amount_bs=0.0,
                exchange_rate=800.0,
                amount_usd=float(expense_in.amount_usd or 0.0),
                status="pendiente_validacion",
                has_receipt=True,
                receipt_image_path=expense_in.receipt_image_path
            )
            db.add(fallback_exp)
            db.commit()
            db.refresh(fallback_exp)
            return [fallback_exp]
        except Exception as final_e:
            db.rollback()
            raise HTTPException(status_code=400, detail=f"No se pudo guardar el comprobante: {str(e)}")

@router.post("/manual")
def create_manual_expense(exp_in: ManualExpenseCreate, db: Session = Depends(get_db)):
    if exp_in.amount_usd <= 0:
        raise HTTPException(status_code=400, detail="El monto del gasto debe ser mayor a cero.")

    rate = exp_in.exchange_rate or 800.0
    amt_bs = exp_in.amount_bs if (exp_in.amount_bs and exp_in.amount_bs > 0) else round(exp_in.amount_usd * rate, 2)
    exp_type = "costo_obra" if exp_in.project_id else "gasto_sede"
    
    cat = None
    if exp_in.category_id:
        cat = db.query(ExpenseCategory).filter(ExpenseCategory.id == exp_in.category_id).first()
    if not cat:
        cat = db.query(ExpenseCategory).first()
    cat_id = cat.id if cat else 1

    rep_id = None
    if exp_in.reported_by_id:
        p = db.query(Personnel).filter(Personnel.id == exp_in.reported_by_id).first()
        if p:
            rep_id = p.id
    if not rep_id:
        p_first = db.query(Personnel).first()
        rep_id = p_first.id if p_first else None

    proj_id = None
    if exp_in.project_id:
        pr = db.query(Project).filter(Project.id == exp_in.project_id).first()
        if pr:
            proj_id = pr.id

    new_exp = Expense(
        category_id=cat_id,
        project_id=proj_id,
        reported_by_id=rep_id,
        expense_type=exp_type,
        expense_date=datetime.utcnow(),
        description=exp_in.description.strip(),
        supplier_vendor=(exp_in.supplier_vendor or "Comercio General").strip(),
        amount_bs=amt_bs,
        exchange_rate=rate,
        amount_usd=exp_in.amount_usd,
        base_amount_usd=exp_in.amount_usd,
        tax_amount_usd=0.0,
        payment_method=exp_in.payment_method or "efectivo_divisa",
        status="aprobado",
        has_receipt=True
    )
    db.add(new_exp)
    db.commit()
    db.refresh(new_exp)
    return {"success": True, "message": "Gasto registrado con éxito.", "id": new_exp.id}
