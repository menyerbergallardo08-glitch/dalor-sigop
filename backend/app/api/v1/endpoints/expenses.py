import os
import uuid
from datetime import datetime, timedelta
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

class CategoryCreateInput(BaseModel):
    code: str
    name: str
    parent_id: Optional[int] = None
    group_type: str = "operativo"
    monthly_budget_usd: float = 0.0

# ------------------------------------------------------------------------------
# 🛡️ FUNCIÓN DE SEGURIDAD ANTIDUPLICIDAD Y ANTIFRAUDE
# ------------------------------------------------------------------------------
def check_duplicate_expense(
    db: Session,
    supplier_vendor: str,
    amount_usd: float,
    threshold_hours: int = 48
) -> Optional[Expense]:
    """
    Verifica si existe un gasto con el mismo proveedor y el mismo monto exacto
    registrado en una ventana de tiempo de 48 horas.
    """
    supplier_clean = supplier_vendor.strip().lower()
    now = datetime.utcnow()
    window_start = now - timedelta(hours=threshold_hours)

    duplicate = db.query(Expense).filter(
        func.lower(Expense.supplier_vendor) == supplier_clean,
        func.abs(Expense.amount_usd - amount_usd) < 0.01,
        Expense.expense_date >= window_start,
        Expense.status != "rechazado"
    ).first()

    return duplicate

# ------------------------------------------------------------------------------
# 📂 CATÁLOGO Y ÁRBOL DE PARTIDAS (CATEGORÍAS)
# ------------------------------------------------------------------------------
@router.get("/categories")
def get_categories(db: Session = Depends(get_db)):
    """Retorna todas las categorías de gasto activas."""
    cats = db.query(ExpenseCategory).order_by(ExpenseCategory.code.asc()).all()
    return [
        {
            "id": c.id,
            "code": c.code,
            "name": c.name,
            "parent_id": c.parent_id,
            "group_type": c.group_type,
            "monthly_budget_usd": c.monthly_budget_usd or 0.0
        }
        for c in cats
    ]

@router.get("/categories-tree")
def get_categories_tree(db: Session = Depends(get_db)):
    """
    Retorna el árbol jerárquico de partidas presupuestarias
    (agrupadas por número entero padre y sus subpartidas decimales).
    """
    all_cats = db.query(ExpenseCategory).order_by(ExpenseCategory.code.asc()).all()
    
    # Calcular gasto real acumulado por categoría
    expenses = db.query(
        Expense.category_id,
        func.sum(Expense.amount_usd).label("total_usd")
    ).filter(Expense.status == "aprobado").group_by(Expense.category_id).all()
    
    spent_map = {e.category_id: float(e.total_usd or 0.0) for e in expenses}
    
    # Filtrar padres canónicos: códigos enteros únicos (1, 2, ... 20), sin duplicados
    canonical_parents = []
    seen_codes = set()
    for c in all_cats:
        code_str = str(c.code).strip()
        base_code = code_str.split(".")[0] if code_str.endswith(".0") else code_str
        if ("." not in code_str or code_str.endswith(".0")) and base_code not in seen_codes:
            seen_codes.add(base_code)
            # Asegurar código canónico entero
            c.code = base_code
            canonical_parents.append(c)
            
    # Subcategorías reales (1.1, 1.2, 2.1, etc., excluyendo .0)
    subcats = [c for c in all_cats if "." in str(c.code) and not str(c.code).endswith(".0")]
    
    tree = []
    for p in sorted(canonical_parents, key=lambda x: int(x.code) if str(x.code).isdigit() else 999):
        p_code = str(p.code)
        subs = [s for s in subcats if (s.parent_id == p.id) or str(s.code).startswith(f"{p_code}.")]
        
        # Deduplicar subcategorías por código
        seen_sub_codes = set()
        sub_list = []
        total_parent_spent = spent_map.get(p.id, 0.0)
        
        for s in subs:
            if s.code in seen_sub_codes:
                continue
            seen_sub_codes.add(s.code)
            s_spent = spent_map.get(s.id, 0.0)
            total_parent_spent += s_spent
            sub_list.append({
                "id": s.id,
                "code": s.code,
                "name": s.name,
                "group_type": s.group_type,
                "spent_usd": round(s_spent, 2)
            })
            
        tree.append({
            "id": p.id,
            "code": p.code,
            "name": p.name,
            "group_type": p.group_type,
            "monthly_budget_usd": round(p.monthly_budget_usd or 0.0, 2),
            "total_spent_usd": round(total_parent_spent, 2),
            "subcategories_count": len(sub_list),
            "subcategories": sub_list
        })
        
    return tree


@router.post("/categories")
def create_category(cat_in: CategoryCreateInput, db: Session = Depends(get_db)):
    existing = db.query(ExpenseCategory).filter(ExpenseCategory.code == cat_in.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="El código de partida ya existe.")
    
    new_cat = ExpenseCategory(
        code=cat_in.code,
        name=cat_in.name,
        parent_id=cat_in.parent_id,
        group_type=cat_in.group_type,
        monthly_budget_usd=cat_in.monthly_budget_usd
    )
    db.add(new_cat)
    db.commit()
    db.refresh(new_cat)
    return new_cat

# ------------------------------------------------------------------------------
# 📥 LISTA Y CONTROL GENERAL DE GASTOS (PLANILLA DE GASTOS)
# ------------------------------------------------------------------------------
@router.get("/", response_model=List[ExpenseOut])
def get_expenses(
    project_id: Optional[int] = None,
    category_id: Optional[int] = None,
    alert_only: bool = False,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Expense)
    if project_id:
        query = query.filter(Expense.project_id == project_id)
    if category_id:
        query = query.filter(Expense.category_id == category_id)
    if status and status != "todos":
        query = query.filter(Expense.status == status)
    if alert_only:
        query = query.filter(Expense.alert_flag == True)
    
    return query.order_by(Expense.expense_date.desc()).all()

# ------------------------------------------------------------------------------
# 📥 BUZÓN DE COMPROBANTES PENDIENTES DE APROBACIÓN
# ------------------------------------------------------------------------------
@router.get("/inbox/pending")
def get_pending_inbox(db: Session = Depends(get_db)):
    pending = db.query(Expense).filter(
        Expense.status.in_(["pendiente_validacion", "pendiente_aprobacion"])
    ).order_by(Expense.expense_date.desc()).all()
    
    results = []
    for exp in pending:
        proj_name = exp.project.name if exp.project else "Sin Proyecto / Sede"
        proj_code = exp.project.code if exp.project else "SEDE"
        reporter_name = exp.reported_by.full_name if exp.reported_by else "Personal de Campo"
        asset_name = exp.asset.name if exp.asset else None
        cat_name = exp.category.name if exp.category else "Partida General"
        cat_code = exp.category.code if exp.category else "10.0"

        results.append({
            "id": exp.id,
            "date": exp.expense_date.strftime("%Y-%m-%d %H:%M"),
            "reported_by": reporter_name,
            "project_id": exp.project_id,
            "project_name": proj_name,
            "project_code": proj_code,
            "asset_id": exp.asset_id,
            "asset_name": asset_name,
            "category_id": exp.category_id,
            "category_code": cat_code,
            "category_name": cat_name,
            "description": exp.description,
            "supplier_vendor": exp.supplier_vendor,
            "amount_usd": exp.amount_usd,
            "amount_bs": exp.amount_bs,
            "exchange_rate": exp.exchange_rate,
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
    amount_bs_est: Optional[float] = Form(0.0),
    exchange_rate: Optional[float] = Form(800.0),
    allow_duplicate: Optional[bool] = Form(False),
    db: Session = Depends(get_db)
):
    """
    Subida rápida en 1 Toque desde el móvil de campo.
    Guarda la foto en cola de validación/aprobación con control de duplicados.
    """
    rate = exchange_rate or 800.0
    usd = amount_usd_est or (round(amount_bs_est / rate, 2) if amount_bs_est else 0.0)
    bs = amount_bs_est or round(usd * rate, 2)

    # 🛡️ Control Antifraude y Duplicados
    if not allow_duplicate and usd > 0:
        vendor_check = quick_note or "Comercio"
        duplicate = check_duplicate_expense(db, vendor_check, usd)
        if duplicate:
            raise HTTPException(
                status_code=400,
                detail=f"⚠️ ALERTA DE DUPLICADO: Ya existe un gasto registrado con el mismo monto (${usd:.2f} / {bs:.2f} Bs) el día {duplicate.expense_date.strftime('%d/%m/%Y %H:%M')}. Si realmente es un gasto distinto, confirma el envío."
            )

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    unique_name = f"campo_{uuid.uuid4().hex[:8]}.{ext}"
    saved_path = os.path.join(settings.UPLOAD_DIR, unique_name)

    contents = await file.read()
    with open(saved_path, "wb") as f:
        f.write(contents)

    cat = db.query(ExpenseCategory).first()
    cat_id = cat.id if cat else 1

    reporter = db.query(Personnel).first()
    reporter_id = reporter.id if reporter else None

    new_pending = Expense(
        category_id=cat_id,
        project_id=project_id,
        asset_id=asset_id,
        reported_by_id=reporter_id,
        expense_type="costo_obra" if project_id else "gasto_sede",
        description=quick_note or "Comprobante de Campo",
        supplier_vendor="Por validar en oficina",
        amount_bs=bs,
        exchange_rate=rate,
        amount_usd=usd,
        status="pendiente_validacion",
        has_receipt=True,
        receipt_image_path=f"/uploads/{unique_name}"
    )
    db.add(new_pending)
    db.commit()
    db.refresh(new_pending)

    # Auditoría
    audit = AuditLog(
        username="campo",
        module="gastos_campo",
        action="subida_comprobante",
        details=f"Comprobante recibido desde campo: {unique_name} por ${usd:.2f} / {bs:.2f} Bs"
    )
    db.add(audit)
    db.commit()

    return {
        "success": True,
        "message": "¡Comprobante enviado con éxito a la Bandeja de Aprobaciones!",
        "id": new_pending.id,
        "image_url": f"/uploads/{unique_name}"
    }

@router.put("/inbox/{expense_id}/approve")
def approve_pending_expense(
    expense_id: int,
    db: Session = Depends(get_db)
):
    """Aprueba formalmente un gasto pendiente desde la bandeja administrativa."""
    exp = db.query(Expense).filter(Expense.id == expense_id).first()
    if not exp:
        raise HTTPException(status_code=404, detail="Comprobante no encontrado.")
    
    exp.status = "aprobado"
    db.commit()
    
    audit = AuditLog(
        username="administracion",
        module="aprobaciones",
        action="aprobar_gasto",
        details=f"Gasto #{exp.id} aprobado formalmente por ${exp.amount_usd:.2f}"
    )
    db.add(audit)
    db.commit()
    
    return {"success": True, "message": f"Gasto #{exp.id} aprobado con éxito e imputado a la contabilidad."}

@router.put("/inbox/{expense_id}/reject")
def reject_pending_expense(
    expense_id: int,
    reason: Optional[str] = Query("Rechazado por administración"),
    db: Session = Depends(get_db)
):
    """Rechaza un gasto pendiente desde la bandeja administrativa."""
    exp = db.query(Expense).filter(Expense.id == expense_id).first()
    if not exp:
        raise HTTPException(status_code=404, detail="Comprobante no encontrado.")
    
    exp.status = "rechazado"
    exp.alert_flag = True
    exp.alert_notes = f"RECHAZADO: {reason}"
    db.commit()
    
    audit = AuditLog(
        username="administracion",
        module="aprobaciones",
        action="rechazar_gasto",
        details=f"Gasto #{exp.id} rechazado: {reason}"
    )
    db.add(audit)
    db.commit()
    
    return {"success": True, "message": f"Gasto #{exp.id} ha sido rechazado."}

@router.put("/inbox/{expense_id}/validate-impute")
def validate_and_impute_expense(
    expense_id: int,
    val_in: ExpenseValidationInput,
    db: Session = Depends(get_db)
):
    """
    La administración valida la foto, asigna centro de costo/partida e imputa formalmente.
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
    exp.payment_method = val_in.payment_method
    exp.fuel_liters = val_in.fuel_liters
    exp.odometer_at_fueling = val_in.odometer_at_fueling
    exp.status = "aprobado"

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

# ------------------------------------------------------------------------------
# 📊 CREACIÓN MANUAL O SPLIT DE GASTOS CON CONTROL ANTIDUPLICADOS
# ------------------------------------------------------------------------------
@router.post("/", response_model=List[ExpenseOut])
def create_expense(
    expense_in: ExpenseCreate,
    status_target: Optional[str] = Query("aprobado"),
    allow_duplicate: Optional[bool] = Query(False),
    db: Session = Depends(get_db)
):
    cat = db.query(ExpenseCategory).filter(ExpenseCategory.id == expense_in.category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Categoría de gasto no encontrada.")

    # 🛡️ Seguridad Antifraude y Duplicados
    if not allow_duplicate and expense_in.amount_usd > 0:
        duplicate = check_duplicate_expense(db, expense_in.supplier_vendor, expense_in.amount_usd)
        if duplicate:
            raise HTTPException(
                status_code=400,
                detail=f"⚠️ ALERTA DE DUPLICIDAD: Ya existe un gasto registrado para el proveedor '{expense_in.supplier_vendor}' por un monto de ${expense_in.amount_usd:.2f} ({expense_in.amount_bs:.2f} Bs) el día {duplicate.expense_date.strftime('%d/%m/%Y %H:%M')}. Si realmente es un gasto distinto, confirma el guardado."
            )

    # Reglas de Alerta Combustible
    alert_flag = False
    alert_notes = None

    if expense_in.fuel_liters and expense_in.fuel_liters > 0:
        price_per_l = round(expense_in.amount_usd / expense_in.fuel_liters, 3)
        if price_per_l > 0.55:
            alert_flag = True
            alert_notes = f"ALERTA: Precio de combustible ${price_per_l}/L supera tope autorizado ($0.55/L)."

    price_l = round(expense_in.amount_usd / expense_in.fuel_liters, 3) if (expense_in.fuel_liters and expense_in.fuel_liters > 0) else None
    
    # Manejar split de facturas si viene lista
    if expense_in.split_items and len(expense_in.split_items) > 0:
        created_exps = []
        for idx, item in enumerate(expense_in.split_items):
            sub_exp = Expense(
                category_id=item.category_id,
                project_id=item.project_id,
                cost_center_id=expense_in.cost_center_id,
                asset_id=expense_in.asset_id,
                reported_by_id=expense_in.reported_by_id,
                expense_type="costo_obra" if item.project_id else "gasto_sede",
                description=item.description or f"{expense_in.description} (Partida #{idx+1})",
                supplier_vendor=expense_in.supplier_vendor,
                amount_bs=round(item.amount_usd * expense_in.exchange_rate, 2),
                exchange_rate=expense_in.exchange_rate,
                amount_usd=item.amount_usd,
                payment_method=expense_in.payment_method,
                status=status_target or "aprobado",
                has_receipt=expense_in.has_receipt,
                receipt_image_path=expense_in.receipt_image_path,
                alert_flag=alert_flag,
                alert_notes=alert_notes
            )
            db.add(sub_exp)
            created_exps.append(sub_exp)
        db.commit()
        for e in created_exps:
            db.refresh(e)
        return created_exps

    db_exp = Expense(
        category_id=expense_in.category_id,
        project_id=expense_in.project_id,
        cost_center_id=expense_in.cost_center_id,
        asset_id=expense_in.asset_id,
        reported_by_id=expense_in.reported_by_id,
        expense_type="costo_obra" if expense_in.project_id else "gasto_sede",
        description=expense_in.description,
        supplier_vendor=expense_in.supplier_vendor,
        amount_bs=expense_in.amount_bs,
        exchange_rate=expense_in.exchange_rate,
        amount_usd=expense_in.amount_usd,
        fuel_liters=expense_in.fuel_liters,
        price_per_liter_usd=price_l,
        odometer_at_fueling=expense_in.odometer_at_fueling,
        payment_method=expense_in.payment_method,
        status=status_target or "aprobado",
        has_receipt=expense_in.has_receipt,
        receipt_image_path=expense_in.receipt_image_path,
        alert_flag=alert_flag,
        alert_notes=alert_notes
    )

    db.add(db_exp)
    db.commit()
    db.refresh(db_exp)

    return [db_exp]
