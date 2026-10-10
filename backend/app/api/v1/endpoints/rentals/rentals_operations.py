from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.core.database import get_db
from app.models.models import (
    AssetRentalLoan, AssetRentalLoanItem, Asset, Project, AuditLog, Material, 
    MaterialMovement, AccountPayable, AccountReceivable, Client, Expense, ExpenseCategory
)
from app.api.deps import get_current_active_user, require_roles
from .rentals_common import (
    RentalItemIn, AssetRentalLoanCreate, AssetRentalLoanUpdate
)

router = APIRouter()

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
            "asset_code": r.asset.asset_code if r.asset else None,
            "material_id": r.material_id,
            "material_name": r.material.name if r.material else None,
            "material_code": r.material.code if r.material else None,
            "material_quantity": r.material_quantity or 0.0,
            "equipment_name": r.equipment_name,
            "equipment_code": r.equipment_code,
            "external_entity": r.external_entity,
            "contact_person": r.contact_person,
            "contact_phone": r.contact_phone,
            "project_id": r.project_id,
            "project_name": r.project.name if r.project else None,
            "destination_reference": r.destination_reference,
            "imputation_mode": r.imputation_mode or "total_estimado",
            "start_date": r.start_date.isoformat() if r.start_date else None,
            "expected_return_date": r.expected_return_date.isoformat() if r.expected_return_date else None,
            "actual_return_date": r.actual_return_date.isoformat() if r.actual_return_date else None,
            "rate_usd": r.rate_usd,
            "rate_period": r.rate_period,
            "total_amount_usd": r.total_amount_usd,
            "payable_id": r.payable_id,
            "receivable_id": r.receivable_id,
            "status": r.status,
            "is_overdue": is_overdue,
            "notes": r.notes,
            "return_notes": r.return_notes,
            "items": [{
                "id": it.id,
                "item_type": it.item_type,
                "asset_id": it.asset_id,
                "material_id": it.material_id,
                "name": it.name,
                "code": it.code,
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
                    cat = db.query(ExpenseCategory).filter(
                        (ExpenseCategory.code == "12.0") | 
                        (ExpenseCategory.name.ilike("%servicio%")) | 
                        (ExpenseCategory.name.ilike("%alquiler%"))
                    ).first()
                    cat_id = cat.id if cat else 12
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
            asset_obj.current_custodian_name = "Almacén Central"
            asset_obj.return_due_date = None

    db.delete(item)
    db.commit()
    return {"success": True, "message": f"Registro [{item.operation_code}] anulado con éxito."}


@router.put("/{item_id}")
def update_rental_loan(item_id: int, r_in: AssetRentalLoanUpdate, db: Session = Depends(get_db)):
    item = db.query(AssetRentalLoan).filter(AssetRentalLoan.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Orden de alquiler/préstamo no encontrada.")

    for field, val in r_in.dict(exclude_unset=True).items():
        if val is not None:
            setattr(item, field, val)
            
    if item.asset_id and r_in.expected_return_date:
        asset_obj = db.query(Asset).filter(Asset.id == item.asset_id).first()
        if asset_obj:
            asset_obj.return_due_date = r_in.expected_return_date

    db.commit()
    db.refresh(item)
    return item
