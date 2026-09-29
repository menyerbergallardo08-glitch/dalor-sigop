from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

from app.core.database import get_db
from app.models.models import (
    AssetRentalLoan, AssetRentalLoanItem, Asset, Project, AuditLog, Material, 
    MaterialMovement, AccountPayable, AccountReceivable, Client, Expense, ExpenseCategory
)
from app.api.deps import get_current_active_user, require_roles

router = APIRouter()

# ------------------------------------------------------------------------------
# SCHEMAS
# ------------------------------------------------------------------------------
class RentalItemIn(BaseModel):
    item_type: str = "asset" # 'asset' | 'material'
    asset_id: Optional[int] = None
    material_id: Optional[int] = None
    name: str
    code: Optional[str] = None
    quantity: float = 1.0

class AssetRentalLoanCreate(BaseModel):
    direction: str # 'dalor_a_tercero' (salida) o 'tercero_a_dalor' (entrada)
    operation_type: str # 'alquiler' o 'prestamo'
    asset_id: Optional[int] = None
    material_id: Optional[int] = None
    material_quantity: Optional[float] = 0.0
    equipment_name: Optional[str] = None
    equipment_code: Optional[str] = None
    items: Optional[List[RentalItemIn]] = []
    external_entity: str
    contact_person: Optional[str] = None
    contact_phone: Optional[str] = None
    project_id: Optional[int] = None
    destination_reference: Optional[str] = None
    imputation_mode: Optional[str] = "total_estimado" # total_estimado, por_factura
    start_date: Optional[datetime] = None
    expected_return_date: Optional[datetime] = None
    rate_usd: Optional[float] = 0.0
    rate_period: Optional[str] = "dia" # dia, semana, mes, global
    notes: Optional[str] = None

class RentalReturnIn(BaseModel):
    return_date: Optional[datetime] = None
    condition_status: str = "devuelto_conforme" # devuelto_conforme, devuelto_con_novedad
    return_notes: Optional[str] = None
    # Liquidación financiera por días / prórroga
    settlement_action: Optional[str] = None # None, 'adjust_real_days', 'extension_negotiation', 'courtesy_waive'
    extension_mode: Optional[str] = None # 'contract_rate', 'negotiated_rate', 'lump_sum', 'waive'
    negotiated_rate_usd: Optional[float] = None
    lump_sum_amount_usd: Optional[float] = None
    settlement_notes: Optional[str] = None

class RentalPartialReturnIn(BaseModel):
    item_sub_id: int
    returned_quantity: float = 1.0
    condition_status: str = "devuelto_conforme"
    return_notes: Optional[str] = None



# ------------------------------------------------------------------------------
# ENDPOINTS
# ------------------------------------------------------------------------------
@router.get("/")
def list_rentals(
    direction: Optional[str] = Query(None),
    operation_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    q = db.query(AssetRentalLoan)
    if direction:
        q = q.filter(AssetRentalLoan.direction == direction)
    if operation_type:
        q = q.filter(AssetRentalLoan.operation_type == operation_type)
    if status:
        q = q.filter(AssetRentalLoan.status == status)

    records = q.order_by(AssetRentalLoan.created_at.desc()).all()
    results = []
    now = datetime.utcnow()
    
    for r in records:
        is_overdue = False
        if r.status == "activo" and r.expected_return_date:
            is_overdue = now > r.expected_return_date

        results.append({
            "id": r.id,
            "operation_code": r.operation_code,
            "direction": r.direction,
            "operation_type": r.operation_type,
            "asset_id": r.asset_id,
            "asset_name": r.asset.name if r.asset else None,
            "asset_code": r.asset.asset_code if r.asset else r.equipment_code,
            "equipment_name": r.equipment_name,
            "equipment_code": r.equipment_code or (r.asset.asset_code if r.asset else ""),
            "external_entity": r.external_entity,
            "contact_person": r.contact_person or "",
            "contact_phone": r.contact_phone or "",
            "project_id": r.project_id,
            "project_name": r.project.name if r.project else "Taller Central Guacara",
            "destination_reference": r.destination_reference or "",
            "start_date": r.start_date.strftime("%Y-%m-%d %H:%M") if r.start_date else "",
            "expected_return_date": r.expected_return_date.strftime("%Y-%m-%d") if r.expected_return_date else "Indefinido",
            "actual_return_date": r.actual_return_date.strftime("%Y-%m-%d %H:%M") if r.actual_return_date else "",
            "rate_usd": r.rate_usd or 0.0,
            "rate_period": r.rate_period or "dia",
            "total_amount_usd": r.total_amount_usd or 0.0,
            "status": r.status,
            "is_overdue": is_overdue,
            "return_notes": r.return_notes or "",
            "notes": r.notes or "",
            "created_at": r.created_at.strftime("%Y-%m-%d %H:%M") if r.created_at else "",
            "items": [{
                "id": it.id,
                "item_type": it.item_type,
                "name": it.name,
                "code": it.code or "",
                "quantity": it.quantity,
                "returned_quantity": it.returned_quantity or 0.0,
                "status": it.status,
                "return_condition": it.return_condition or "",
                "return_notes": it.return_notes or ""
            } for it in (r.items or [])]
        })
    return results


@router.post("/")
def create_rental_loan(
    req: AssetRentalLoanCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    if not (req.equipment_name and req.equipment_name.strip()) and not req.items:
        raise HTTPException(status_code=400, detail="Debe indicar el nombre del equipo o agregar ítems a la operación.")
    if not req.external_entity.strip():
        raise HTTPException(status_code=400, detail="Debe indicar el cliente, proveedor o tercero responsable.")

    # Generar correlativo
    prefix = "ALQ" if req.operation_type == "alquiler" else "PRE"
    count = db.query(AssetRentalLoan).filter(AssetRentalLoan.operation_type == req.operation_type).count() + 1
    op_code = f"{prefix}-2026-{count:03d}"

    # Si ya existe, incrementar
    if db.query(AssetRentalLoan).filter(AssetRentalLoan.operation_code == op_code).first():
        count = db.query(AssetRentalLoan).count() + 10
        op_code = f"{prefix}-2026-{count:03d}"

    eq_name = (req.equipment_name or "").strip()
    eq_code = (req.equipment_code or "").strip()

    if not eq_name and req.items:
        if len(req.items) == 1:
            eq_name = f"{req.items[0].name} ({req.items[0].quantity})"
            eq_code = req.items[0].code or ""
        else:
            names = [it.name for it in req.items[:2]]
            eq_name = f"Lote ({len(req.items)} recursos): {', '.join(names)}{'...' if len(req.items) > 2 else ''}"

    # Cálculo del total monetario según modalidad de imputación (solo si es alquiler)
    total_amount_usd = 0.0
    if req.operation_type == "alquiler" and (req.rate_usd or 0.0) > 0.0:
        if req.imputation_mode == "total_estimado" and req.start_date and req.expected_return_date:
            days = max(1, (req.expected_return_date.date() - req.start_date.date()).days)
            if req.rate_period == "dia":
                total_amount_usd = round(req.rate_usd * days, 2)
            elif req.rate_period == "semana":
                weeks = max(1.0, days / 7.0)
                total_amount_usd = round(req.rate_usd * weeks, 2)
            elif req.rate_period == "mes":
                months = max(1.0, days / 30.0)
                total_amount_usd = round(req.rate_usd * months, 2)
            else:
                total_amount_usd = round(req.rate_usd, 2)
        else:
            total_amount_usd = round(req.rate_usd or 0.0, 2)

    # 1. Si viene con lista multi-ítem
    created_items = []
    if req.items:
        for it in req.items:
            qty = float(it.quantity or 1.0)
            if it.item_type == "material" or it.material_id:
                mat_obj = db.query(Material).filter(Material.id == it.material_id).first() if it.material_id else None
                if mat_obj and req.direction == "dalor_a_tercero":
                    if mat_obj.stock_quantity < qty:
                        raise HTTPException(status_code=400, detail=f"Stock insuficiente para {mat_obj.name}. Disponible: {mat_obj.stock_quantity} {mat_obj.unit_measure}.")
                    mat_obj.stock_quantity -= qty
                    mat_mov = MaterialMovement(
                        material_id=mat_obj.id,
                        movement_type="salida_prestamo",
                        quantity=qty,
                        unit_cost_usd=mat_obj.unit_cost_usd,
                        total_cost_usd=round(qty * mat_obj.unit_cost_usd, 2),
                        destination=f"Custodia Externa: {req.external_entity.strip()}",
                        reference_doc=op_code,
                        notes=f"Salida préstamo/alquiler [{op_code}] a {req.external_entity.strip()}",
                        performed_by=current_user.username if hasattr(current_user, "username") else "Almacén"
                    )
                    db.add(mat_mov)
            elif it.item_type == "asset" or it.asset_id:
                asset_obj = db.query(Asset).filter(Asset.id == it.asset_id).first() if it.asset_id else None
                if asset_obj and req.direction == "dalor_a_tercero":
                    if asset_obj.status != "disponible_base" and asset_obj.current_project_id is not None:
                        raise HTTPException(status_code=400, detail=f"El activo [{asset_obj.asset_code}] {asset_obj.name} no está disponible (Estatus: {asset_obj.status}).")
                    asset_obj.status = "alquilado_a_tercero" if req.operation_type == "alquiler" else "prestado_a_cliente"
                    asset_obj.current_location = f"Custodia Externa: {req.external_entity.strip()}"
                    asset_obj.current_custodian_name = req.contact_person or req.external_entity.strip()
                    asset_obj.rental_rate_usd = req.rate_usd or 0.0
                    asset_obj.return_due_date = req.expected_return_date
    else:
        # Modo legado de 1 solo recurso
        if req.material_id:
            mat_obj = db.query(Material).filter(Material.id == req.material_id).first()
            if not mat_obj:
                raise HTTPException(status_code=400, detail="Material seleccionado no existe en almacén.")
            qty = float(req.material_quantity or 1.0)
            if req.direction == "dalor_a_tercero":
                if mat_obj.stock_quantity < qty:
                    raise HTTPException(status_code=400, detail=f"Stock insuficiente para {mat_obj.name}. Disponible: {mat_obj.stock_quantity} {mat_obj.unit_measure}.")
                mat_obj.stock_quantity -= qty
                mat_mov = MaterialMovement(
                    material_id=mat_obj.id,
                    movement_type="salida_prestamo",
                    quantity=qty,
                    unit_cost_usd=mat_obj.unit_cost_usd,
                    total_cost_usd=round(qty * mat_obj.unit_cost_usd, 2),
                    destination=f"Custodia Externa: {req.external_entity.strip()}",
                    reference_doc=op_code,
                    notes=f"Préstamo/Alquiler de material [{op_code}] a {req.external_entity.strip()}",
                    performed_by=current_user.username if hasattr(current_user, "username") else "Almacén"
                )
                db.add(mat_mov)
            eq_name = f"{mat_obj.name} ({qty} {mat_obj.unit_measure})"
            eq_code = mat_obj.code

        if req.asset_id:
            asset_obj = db.query(Asset).filter(Asset.id == req.asset_id).first()
            if asset_obj:
                eq_name = asset_obj.name
                eq_code = asset_obj.asset_code
                if req.direction == "dalor_a_tercero":
                    if asset_obj.status != "disponible_base" and asset_obj.current_project_id is not None:
                        raise HTTPException(status_code=400, detail=f"El activo [{asset_obj.asset_code}] {asset_obj.name} no está disponible (Estatus: {asset_obj.status}).")
                    asset_obj.status = "alquilado_a_tercero" if req.operation_type == "alquiler" else "prestado_a_cliente"
                    asset_obj.current_location = f"Custodia Externa: {req.external_entity.strip()}"
                    asset_obj.current_custodian_name = req.contact_person or req.external_entity.strip()
                    asset_obj.rental_rate_usd = req.rate_usd or 0.0
                    asset_obj.return_due_date = req.expected_return_date

    # 3. Integración Financiera Automática (CxP y CxC solo si es alquiler con costo > 0)
    created_payable_id = None
    created_receivable_id = None

    if req.operation_type == "alquiler" and total_amount_usd > 0.0:
        # A) Entrada: Tercero alquila a DALOR -> Crea CxP y si es obra, imputa al costo
        if req.direction == "tercero_a_dalor":
            ap = AccountPayable(
                invoice_number=f"ALQ-CXP-{op_code}",
                supplier_name=req.external_entity.strip(),
                project_id=req.project_id,
                payable_type="alquiler_maquinaria_externa",
                description=f"Alquiler de equipo externo: {eq_name} - {op_code} ({req.imputation_mode})",
                issue_date=req.start_date or datetime.utcnow(),
                due_date=req.expected_return_date or datetime.utcnow(),
                amount_usd=total_amount_usd,
                taxable_base_usd=total_amount_usd,
                net_amount_usd=total_amount_usd,
                paid_amount_usd=0.0,
                balance_usd=total_amount_usd,
                status="pendiente",
                notes=f"Generado automáticamente por operación {op_code}"
            )
            db.add(ap)
            db.flush()
            created_payable_id = ap.id

            # Imputar costo al proyecto si se vinculó
            if req.project_id:
                proj = db.query(Project).filter(Project.id == req.project_id).first()
                if proj:
                    cat = db.query(ExpenseCategory).filter(ExpenseCategory.name.ilike("%alquiler%")).first() or db.query(ExpenseCategory).first()
                    cat_id = cat.id if cat else 1
                    exp = Expense(
                        category_id=cat_id,
                        project_id=proj.id,
                        expense_type="costo_obra",
                        expense_date=req.start_date or datetime.utcnow(),
                        description=f"Alquiler equipo externo: {eq_name} ({op_code})",
                        supplier_vendor=req.external_entity.strip(),
                        amount_bs=round(total_amount_usd * 850.0, 2),
                        exchange_rate=850.0,
                        amount_usd=total_amount_usd,
                        base_amount_usd=total_amount_usd,
                        payment_method="credito_proveedor",
                        status="aprobado",
                        has_receipt=False
                    )
                    db.add(exp)

        # B) Salida: DALOR alquila a Tercero -> Crea CxC
        elif req.direction == "dalor_a_tercero":
            clean_name = req.external_entity.strip()
            cli = db.query(Client).filter(Client.name.ilike(f"%{clean_name}%")).first()
            if not cli:
                count_cli = db.query(Client).count()
                cli = Client(
                    code=f"CLI-ALQ-{count_cli + 1:03d}",
                    name=clean_name,
                    rif="S/I",
                    contact_name=req.contact_person.strip() if req.contact_person else None,
                    contact_phone=req.contact_phone.strip() if req.contact_phone else None,
                    is_active=True
                )
                db.add(cli)
                db.flush()

            if cli:
                ar = AccountReceivable(
                    invoice_number=f"ALQ-CXC-{op_code}",
                    client_id=cli.id,
                    project_id=req.project_id,
                    description=f"Cobro por alquiler de equipo DALOR: {eq_name} a {req.external_entity.strip()} - {op_code}",
                    issue_date=req.start_date or datetime.utcnow(),
                    due_date=req.expected_return_date or datetime.utcnow(),
                    amount_usd=total_amount_usd,
                    taxable_base_usd=total_amount_usd,
                    net_amount_usd=total_amount_usd,
                    paid_amount_usd=0.0,
                    balance_usd=total_amount_usd,
                    status="pendiente",
                    notes=f"Generado automáticamente por operación {op_code}"
                )
                db.add(ar)
                db.flush()
                created_receivable_id = ar.id

    new_item = AssetRentalLoan(
        operation_code=op_code,
        direction=req.direction,
        operation_type=req.operation_type,
        asset_id=req.asset_id if not req.items else None,
        material_id=req.material_id if not req.items else None,
        material_quantity=req.material_quantity or 0.0,
        equipment_name=eq_name,
        equipment_code=eq_code or None,
        external_entity=req.external_entity.strip(),
        contact_person=req.contact_person.strip() if req.contact_person else None,
        contact_phone=req.contact_phone.strip() if req.contact_phone else None,
        project_id=req.project_id if req.direction == "tercero_a_dalor" else None,
        destination_reference=req.destination_reference.strip() if req.destination_reference else None,
        imputation_mode=req.imputation_mode or "total_estimado",
        start_date=req.start_date or datetime.utcnow(),
        expected_return_date=req.expected_return_date,
        rate_usd=req.rate_usd or 0.0,
        rate_period=req.rate_period or "dia",
        total_amount_usd=total_amount_usd,
        payable_id=created_payable_id,
        receivable_id=created_receivable_id,
        status="activo",
        notes=req.notes
    )
    db.add(new_item)
    db.flush()

    # Guardar ítems si vienen en lista
    if req.items:
        for it in req.items:
            sub = AssetRentalLoanItem(
                rental_id=new_item.id,
                item_type=it.item_type,
                asset_id=it.asset_id,
                material_id=it.material_id,
                name=it.name,
                code=it.code,
                quantity=it.quantity,
                returned_quantity=0.0,
                status="prestado"
            )
            db.add(sub)
    elif req.asset_id or req.material_id:
        # Generar renglón para compatibilidad
        sub = AssetRentalLoanItem(
            rental_id=new_item.id,
            item_type="material" if req.material_id else "asset",
            asset_id=req.asset_id,
            material_id=req.material_id,
            name=eq_name,
            code=eq_code,
            quantity=float(req.material_quantity or 1.0) if req.material_id else 1.0,
            returned_quantity=0.0,
            status="prestado"
        )
        db.add(sub)

    audit = AuditLog(
        username=current_user.username if hasattr(current_user, "username") else "operaciones",
        module="Activos / Alquileres y Prestamos",
        action=f"Crear {req.operation_type.title()} ({req.direction})",
        details=f"Registrado [{op_code}] {eq_name} con {req.external_entity.strip()}. Monto total: ${total_amount_usd:.2f}."
    )
    db.add(audit)

    db.commit()
    db.refresh(new_item)

    return {
        "success": True,
        "message": f"Registro [{op_code}] de {req.operation_type.title()} guardado exitosamente.",
        "id": new_item.id,
        "operation_code": op_code,
        "total_amount_usd": total_amount_usd
    }


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


@router.get("/{item_id}/delivery-note")
def get_rental_delivery_note(item_id: int, db: Session = Depends(get_db)):
    item = db.query(AssetRentalLoan).filter(AssetRentalLoan.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Operación no encontrada.")

    items_list = []
    if item.items:
        for it in item.items:
            unit = "UND"
            if it.material:
                unit = it.material.unit_measure
            elif it.item_type == "asset":
                unit = "UND"
            items_list.append({
                "id": it.id,
                "name": it.name,
                "code": it.code or (it.asset.asset_code if it.asset else (it.material.code if it.material else "-")),
                "item_type": it.item_type,
                "quantity": it.quantity,
                "returned_quantity": it.returned_quantity or 0.0,
                "unit": unit,
                "status": it.status,
                "condition": it.return_condition or "Operativo / Salida Conforme"
            })
    else:
        items_list.append({
            "id": 1,
            "name": item.equipment_name,
            "code": item.equipment_code or "-",
            "item_type": "material" if item.material_id else "asset",
            "quantity": item.material_quantity if item.material_id else 1.0,
            "returned_quantity": 0.0,
            "unit": "UND",
            "status": item.status,
            "condition": "Operativo / Salida Conforme"
        })

    guide_type = "PRÉSTAMO / COMODATO DE EQUIPOS" if item.operation_type == "prestamo" else "ALQUILER Y ARRENDAMIENTO DE EQUIPOS"
    transfer_type_label = "Salida DALOR a Tercero" if item.direction == "dalor_a_tercero" else "Entrada Tercero a DALOR"

    return {
        "operation_code": item.operation_code,
        "guide_number": f"GD-{item.operation_code}",
        "guide_type": guide_type,
        "direction": item.direction,
        "direction_label": transfer_type_label,
        "operation_type": item.operation_type,
        "external_entity": item.external_entity,
        "contact_person": item.contact_person or "No indicado",
        "contact_phone": item.contact_phone or "No indicado",
        "destination_reference": item.destination_reference or (item.project.name if item.project else "Taller Central Guacara"),
        "project_name": item.project.name if item.project else (item.destination_reference or "Uso Externo / Destino Particular"),
        "dispatch_date": item.start_date.strftime("%d/%m/%Y") if item.start_date else datetime.utcnow().strftime("%d/%m/%Y"),
        "expected_return_date": item.expected_return_date.strftime("%d/%m/%Y") if item.expected_return_date else "Indefinido",
        "rate_usd": item.rate_usd or 0.0,
        "rate_period": item.rate_period or "dia",
        "total_amount_usd": item.total_amount_usd or 0.0,
        "status": item.status,
        "notes": item.notes or "",
        "dispatcher_name": "Almacén & Custodia DALOR",
        "receiver_name": item.contact_person or item.external_entity,
        "items": items_list
    }


@router.delete("/{item_id}", dependencies=[Depends(require_roles(["director_general", "administrador_financiero"]))])
def delete_rental_loan(item_id: int, db: Session = Depends(get_db)):
    item = db.query(AssetRentalLoan).filter(AssetRentalLoan.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Registro no encontrado.")

    # Restaurar activo si estaba asociado
    if item.asset_id and item.status == "activo":
        asset_obj = db.query(Asset).filter(Asset.id == item.asset_id).first()
        if asset_obj:
            asset_obj.status = "disponible_base"
            asset_obj.current_location = "Sede Central Guacara"
            asset_obj.return_due_date = None

    db.delete(item)
    db.commit()
    return {"success": True, "message": f"Registro [{item.operation_code}] anulado con éxito."}
