import os
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from pydantic import BaseModel

from app.core.database import get_db
from app.core.config import settings
from app.models.models import Expense, ExpenseCategory, Project, Asset, Personnel, AuditLog
from app.schemas.schemas import ExpenseCreate, ExpenseOut

router = APIRouter()

class ExpenseValidationInput(BaseModel):
    expense_type: str = "costo_obra" # costo_obra, gasto_sede, retiro_socio
    category_id: int
    project_id: Optional[int] = None
    partner_name: Optional[str] = None
    supplier_vendor: str
    description: str
    amount_usd: float
    exchange_rate: float = 800.0
    payment_method: str = "caja_chica"
    has_fiscal_invoice: bool = False
    fuel_liters: Optional[float] = None
    odometer_at_fueling: Optional[float] = None
    base_amount_usd: Optional[float] = None
    tax_amount_usd: Optional[float] = None
    is_tax_exempt: Optional[bool] = False

@router.get("/", response_model=List[ExpenseOut])
def get_expenses(
    project_id: Optional[int] = None,
    category_id: Optional[int] = None,
    alert_only: bool = False,
    status: Optional[str] = "aprobado",
    db: Session = Depends(get_db)
):
    query = db.query(Expense)
    if project_id:
        query = query.filter(Expense.project_id == project_id)
    if category_id:
        query = query.filter(Expense.category_id == category_id)
    if status:
        query = query.filter(Expense.status == status)
    if alert_only:
        query = query.filter(Expense.alert_flag == True)
    
    return query.order_by(Expense.expense_date.desc()).all()

@router.get("/categories")
def get_expense_categories(db: Session = Depends(get_db)):
    cats = db.query(ExpenseCategory).order_by(ExpenseCategory.code.asc()).all()
    return [
        {
            "id": c.id,
            "code": c.code,
            "name": c.name,
            "parent_id": c.parent_id,
            "group_type": c.group_type,
            "monthly_budget_usd": c.monthly_budget_usd
        }
        for c in cats
    ]

@router.get("/categories-tree")
def get_categories_tree(db: Session = Depends(get_db)):
    try:
        cats = db.query(ExpenseCategory).all()
    except Exception:
        cats = []

    def cat_sort_key(c):
        try:
            return [int(p) for p in c.code.split('.')]
        except Exception:
            return [999]

    cats.sort(key=cat_sort_key)

    spent_by_cat = {}
    try:
        from sqlalchemy import text
        rows = db.execute(text("SELECT category_id, SUM(amount_usd) FROM expenses WHERE status = 'aprobado' GROUP BY category_id")).fetchall()
        for r in rows:
            if r[0]:
                spent_by_cat[r[0]] = float(r[1] or 0.0)
    except Exception:
        pass

    parents = [c for c in cats if not c.parent_id or "." not in c.code or c.code.endswith(".0")]
    parents.sort(key=cat_sort_key)

    tree = []
    for p in parents:
        prefix = p.code.split('.')[0] if '.' in p.code else p.code
        subcats = [c for c in cats if (c.parent_id == p.id or c.code.startswith(prefix + '.')) and c.id != p.id]
        subcats.sort(key=cat_sort_key)
        p_spent = spent_by_cat.get(p.id, 0.0) + sum(spent_by_cat.get(s.id, 0.0) for s in subcats)
        
        tree.append({
            "id": p.id,
            "code": p.code,
            "name": p.name,
            "monthly_budget_usd": float(getattr(p, "monthly_budget_usd", 0.0) or 0.0),
            "total_spent_usd": round(p_spent, 2),
            "subcategories": [
                {
                    "id": s.id,
                    "code": s.code,
                    "name": s.name,
                    "monthly_budget_usd": float(getattr(s, "monthly_budget_usd", 0.0) or 0.0),
                    "spent_usd": round(spent_by_cat.get(s.id, 0.0), 2)
                } for s in subcats
            ]
        })
    return tree

# ------------------------------------------------------------------------------
# 📥 BUZÓN DE COMPROBANTES DE CAMPO PENDIENTES DE VALIDACIÓN
# ------------------------------------------------------------------------------
@router.get("/inbox/pending")
def get_pending_inbox(db: Session = Depends(get_db)):
    pending = db.query(Expense).filter(Expense.status == "pendiente_validacion").order_by(Expense.expense_date.desc()).all()
    results = []
    for exp in pending:
        proj_name = exp.project.name if exp.project else "Sin Proyecto / Sede"
        proj_code = exp.project.code if exp.project else "SEDE"
        reporter_name = exp.partner_name if (exp.partner_name and "Reportado por" in exp.partner_name) else (exp.reported_by.full_name if exp.reported_by else "Personal de Campo")
        asset_name = exp.asset.name if exp.asset else None

        results.append({
            "id": exp.id,
            "date": exp.expense_date.strftime("%Y-%m-%d %H:%M"),
            "reported_by": reporter_name,
            "project_id": exp.project_id,
            "project_name": proj_name,
            "project_code": proj_code,
            "asset_id": exp.asset_id,
            "asset_name": asset_name,
            "description": exp.description,
            "supplier_vendor": exp.supplier_vendor,
            "amount_usd": exp.amount_usd,
            "amount_bs": exp.amount_bs,
            "receipt_image_path": exp.receipt_image_path,
            "status": exp.status
        })
    return results

@router.post("/quick-upload")
async def quick_upload_receipt(
    file: UploadFile = File(...),
    project_id: Optional[int] = Form(None),
    asset_id: Optional[int] = Form(None),
    reported_by_name: Optional[str] = Form("Supervisor Campo"),
    quick_note: Optional[str] = Form("Comprobante enviado desde móvil"),
    amount_usd_est: Optional[float] = Form(0.0),
    allow_duplicate: Optional[bool] = Form(False),
    db: Session = Depends(get_db)
):
    """
    Subida rápida en 1 Toque desde el móvil de campo.
    No requiere llenar campos contables; guarda la foto en cola de validación.
    """
    # Filtro Anti-Duplicados preventivo
    if not allow_duplicate and amount_usd_est and amount_usd_est > 0:
        from datetime import timedelta
        cutoff_date = datetime.utcnow() - timedelta(days=7)
        existing_quick_dup = db.query(Expense).filter(
            Expense.status != "rechazado",
            Expense.expense_date >= cutoff_date,
            func.abs(Expense.amount_usd - amount_usd_est) < 0.03
        ).first()
        if existing_quick_dup:
            date_str = existing_quick_dup.expense_date.strftime("%d/%m/%Y") if existing_quick_dup.expense_date else "reciente"
            raise HTTPException(
                status_code=409,
                detail=f"⚠️ Posible comprobante duplicado: Ya existe un gasto registrado por ${existing_quick_dup.amount_usd:.2f} el {date_str} (ID #{existing_quick_dup.id}). Si es un gasto distinto, confirma el envío."
            )

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    unique_name = f"campo_{uuid.uuid4().hex[:8]}.{ext}"
    saved_path = os.path.join(settings.UPLOAD_DIR, unique_name)

    contents = await file.read()
    with open(saved_path, "wb") as f:
        f.write(contents)

    # Buscar categoría default operativa (10.0 Honorarios/Insumos)
    cat = db.query(ExpenseCategory).first()
    cat_id = cat.id if cat else 1

    # Buscar persona o default
    reporter = db.query(Personnel).first()
    reporter_id = reporter.id if reporter else None

    rep_name_clean = reported_by_name or "Supervisor Campo"

    new_pending = Expense(
        category_id=cat_id,
        project_id=project_id,
        asset_id=asset_id,
        reported_by_id=reporter_id,
        partner_name=f"Reportado por: {rep_name_clean}",
        expense_type="costo_obra" if project_id else "gasto_sede",
        description=f"{quick_note or 'Comprobante de Campo'}",
        supplier_vendor="Por validar en oficina",
        amount_bs=round(amount_usd_est * 800.0, 2),
        exchange_rate=800.0,
        amount_usd=amount_usd_est or 0.0,
        status="pendiente_validacion",
        has_receipt=True,
        receipt_image_path=f"/uploads/{unique_name}"
    )
    db.add(new_pending)
    db.commit()
    db.refresh(new_pending)

    # Auditoría
    audit = AuditLog(
        username=rep_name_clean,
        module="gastos_campo",
        action="subida_comprobante",
        details=f"Comprobante recibido desde campo por {rep_name_clean}: {unique_name} para proyecto ID {project_id}"
    )
    db.add(audit)
    db.commit()

    return {
        "success": True,
        "message": "¡Comprobante enviado con éxito a la Bandeja de Administración!",
        "id": new_pending.id,
        "image_url": f"/uploads/{unique_name}"
    }

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

    exp.category_id = val_in.category_id
    exp.project_id = val_in.project_id
    exp.expense_type = val_in.expense_type
    exp.partner_name = val_in.partner_name
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
        exp.base_amount_usd = val_in.base_amount_usd if val_in.base_amount_usd is not None else round(val_in.amount_usd * 0.862, 2)
        exp.tax_amount_usd = val_in.tax_amount_usd if val_in.tax_amount_usd is not None else round(val_in.amount_usd - exp.base_amount_usd, 2)
    exp.payment_method = val_in.payment_method
    exp.fuel_liters = val_in.fuel_liters
    exp.odometer_at_fueling = val_in.odometer_at_fueling
    exp.status = "aprobado"

    # Alerta Combustible si aplica
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


# ------------------------------------------------------------------------------
# 📊 IMPORTADOR MASIVO DE GASTOS DESDE EXCEL / CSV
# ------------------------------------------------------------------------------
class BatchExpenseRow(BaseModel):
    date: str
    expense_type: str # obra, sede, socio
    project_code: Optional[str] = None
    category_code: str
    supplier_vendor: str
    description: str
    amount_usd: float
    payment_method: str = "caja_chica"
    reference_number: Optional[str] = None

@router.post("/import-batch")
def import_batch_expenses(rows: List[BatchExpenseRow], db: Session = Depends(get_db)):
    created_count = 0
    errors = []

    for idx, r in enumerate(rows):
        try:
            # Buscar categoría por código o default
            cat = db.query(ExpenseCategory).filter(ExpenseCategory.code == r.category_code).first()
            if not cat:
                cat = db.query(ExpenseCategory).first()

            # Buscar proyecto por código
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
    cat = db.query(ExpenseCategory).filter(ExpenseCategory.id == expense_in.category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Categoría de gasto no encontrada.")

    # 🛡️ FILTRO ANTI-DUPLICADOS DALOR: Detección preventiva de comprobantes ya registrados
    if not expense_in.allow_duplicate and expense_in.amount_usd > 0 and expense_in.supplier_vendor:
        from datetime import timedelta
        cutoff_date = datetime.utcnow() - timedelta(days=20)
        clean_v = expense_in.supplier_vendor.strip().lower()
        existing_dup = db.query(Expense).filter(
            Expense.status != "rechazado",
            Expense.expense_date >= cutoff_date,
            func.lower(Expense.supplier_vendor) == clean_v,
            func.abs(Expense.amount_usd - expense_in.amount_usd) < 0.03
        ).first()

        if existing_dup:
            rep_user = existing_dup.partner_name or "Usuario previo"
            date_str = existing_dup.expense_date.strftime("%d/%m/%Y") if existing_dup.expense_date else "reciente"
            raise HTTPException(
                status_code=409,
                detail=f"⚠️ Posible duplicado detectado: Ya existe un gasto para '{existing_dup.supplier_vendor}' por ${existing_dup.amount_usd:.2f} registrado el {date_str} ({rep_user}, ID #{existing_dup.id}). Si estás seguro de que es otro gasto idéntico, confirma el envío."
            )

    # Reglas de Alerta
    alert_flag = False
    alert_notes = None

    if expense_in.fuel_liters and expense_in.fuel_liters > 0:
        price_per_l = round(expense_in.amount_usd / expense_in.fuel_liters, 3)
        if price_per_l > 0.55:
            alert_flag = True
            alert_notes = f"ALERTA: Precio de combustible ${price_per_l}/L supera tope autorizado ($0.55/L)."

    price_l = round(expense_in.amount_usd / expense_in.fuel_liters, 3) if (expense_in.fuel_liters and expense_in.fuel_liters > 0) else None
    
    rep_tag = f"Reportado por: {expense_in.reported_by_name}" if expense_in.reported_by_name else None

    db_exp = Expense(
        category_id=expense_in.category_id,
        project_id=expense_in.project_id,
        cost_center_id=expense_in.cost_center_id,
        asset_id=expense_in.asset_id,
        reported_by_id=expense_in.reported_by_id,
        partner_name=rep_tag,
        expense_type="costo_obra" if expense_in.project_id else "gasto_sede",
        description=expense_in.description,
        supplier_vendor=expense_in.supplier_vendor,
        amount_bs=expense_in.amount_bs,
        exchange_rate=expense_in.exchange_rate,
        amount_usd=expense_in.amount_usd,
        base_amount_usd=expense_in.base_amount_usd if expense_in.base_amount_usd is not None else (expense_in.amount_usd if expense_in.is_tax_exempt else round(expense_in.amount_usd * 0.862, 2)),
        tax_amount_usd=expense_in.tax_amount_usd if expense_in.tax_amount_usd is not None else (0.0 if expense_in.is_tax_exempt else round(expense_in.amount_usd * 0.138, 2)),
        is_tax_exempt=expense_in.is_tax_exempt,
        fuel_liters=expense_in.fuel_liters,
        price_per_liter_usd=price_l,
        odometer_at_fueling=expense_in.odometer_at_fueling,
        payment_method=expense_in.payment_method,
        status="pendiente_validacion" if expense_in.has_receipt else "aprobado",
        has_receipt=expense_in.has_receipt,
        receipt_image_path=expense_in.receipt_image_path,
        alert_flag=alert_flag,
        alert_notes=alert_notes
    )

    db.add(db_exp)
    db.commit()
    db.refresh(db_exp)

    # Auditoría
    audit_user = expense_in.reported_by_name or "sistema"
    audit = AuditLog(
        username=audit_user,
        module="gastos",
        action="registro_gasto",
        details=f"Gasto #{db_exp.id} registrado por ${expense_in.amount_usd:.2f} para '{expense_in.supplier_vendor}' por {audit_user}"
    )
    db.add(audit)
    db.commit()

    return [db_exp]
