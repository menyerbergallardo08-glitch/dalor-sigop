from fastapi import APIRouter, Depends, HTTPException, Query
import re
from sqlalchemy.orm import Session, joinedload, selectinload
from sqlalchemy import func, text, desc, asc
from datetime import datetime, timedelta, date
from typing import List, Optional, Dict, Any
from pydantic import BaseModel

from app.core.database import get_db
from app.models.models import (
    AccountPayable,
    FinancialPayment,
    FinancialAccount,
    Project,
    Material,
    MaterialMovement,
    ExpenseCategory,
    AuditLog,
    User as UserModel
)
from app.api.deps import require_roles, get_current_user

router = APIRouter()

# ------------------------------------------------------------------------------
# SCHEMAS DE CUENTAS POR PAGAR (CxP)
# ------------------------------------------------------------------------------
class PayableMaterialItem(BaseModel):
    material_id: int
    quantity: float
    unit_cost_usd: float
    destination: Optional[str] = "Almacén Central Dalor"

class PayableCreate(BaseModel):
    invoice_number: str
    supplier_name: str
    supplier_rif: Optional[str] = None
    control_number: Optional[str] = None
    doc_type: Optional[str] = "factura" # factura, factura_sin_retencion, nota_entrega
    project_id: Optional[int] = None
    category_id: Optional[int] = None
    payable_type: str = "costo_material_obra" # costo_material_obra, stock_almacen, servicios_honorarios, gastos_sede, alquiler_maquinaria_ext
    description: str
    due_date: datetime
    amount_usd: float # Total Factura
    taxable_base_usd: Optional[float] = 0.0
    tax_amount_usd: Optional[float] = 0.0
    tax_withholding_rate: Optional[float] = 75.0
    tax_withholding_usd: Optional[float] = 0.0
    withholding_exempt_usd: Optional[float] = 0.0
    is_withholding_applied: Optional[bool] = True
    islr_rate: Optional[float] = 2.0
    islr_withholding_usd: Optional[float] = 0.0
    municipal_rate: Optional[float] = 0.0
    municipal_withholding_usd: Optional[float] = 0.0
    municipal_voucher_number: Optional[str] = None
    tax_retained_usd: Optional[float] = 0.0
    net_amount_usd: Optional[float] = 0.0
    exchange_rate: float = 800.0
    notes: Optional[str] = None
    issue_date: Optional[datetime] = None
    warehouse_movement_id: Optional[int] = None
    warehouse_entry_ref: Optional[str] = None
    material_items: Optional[List[PayableMaterialItem]] = None

class PayableUpdate(BaseModel):
    supplier_name: Optional[str] = None
    supplier_rif: Optional[str] = None
    invoice_number: Optional[str] = None
    control_number: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    doc_type: Optional[str] = None
    is_withholding_applied: Optional[bool] = None
    tax_withholding_rate: Optional[float] = None
    taxable_base_usd: Optional[float] = None
    tax_amount_usd: Optional[float] = None
    tax_withholding_usd: Optional[float] = None
    withholding_exempt_usd: Optional[float] = None
    withholding_voucher_number: Optional[str] = None
    islr_rate: Optional[float] = None
    islr_withholding_usd: Optional[float] = None
    municipal_rate: Optional[float] = None
    municipal_withholding_usd: Optional[float] = None
    municipal_voucher_number: Optional[str] = None
    amount_usd: Optional[float] = None
    exchange_rate: Optional[float] = None
    notes: Optional[str] = None

class PaymentCreate(BaseModel):
    payment_type: Optional[str] = "cxc_cobro" # cxc_cobro, cxp_pago, cxp_retencion_iva
    target_id: Optional[int] = None # receivable_id o payable_id
    amount_usd: float
    payment_method: str = "transferencia" # transferencia, efectivo_usd, retencion_iva, retencion_islr, zelle, pago_movil
    bank_account: Optional[str] = "banesco_usd" # banesco_usd, banesco_bs, binance_usdt, efectivo_usd, caja_chica
    voucher_number: Optional[str] = None # N° comprobante de retención o referencia
    reference_number: Optional[str] = None
    exchange_rate: float = 800.0
    notes: Optional[str] = None

class DirectCollectionCreate(BaseModel):
    client_id: int
    project_id: Optional[int] = None
    financial_account_id: Optional[int] = None
    amount_usd: float
    exchange_rate: float = 800.0
    payment_method: str = "transferencia"
    reference_number: Optional[str] = None
    concept: Optional[str] = "Anticipo / Abono de Cliente"
    notes: Optional[str] = None

class PartnerWithdrawalCreate(BaseModel):
    partner_name: str
    concept: str
    amount_usd: float
    payment_method: str = "transferencia"
    reference_number: Optional[str] = None
    exchange_rate: float = 800.0
    notes: Optional[str] = None

class ClientRefundCreate(BaseModel):
    amount_usd: float
    payment_method: str = "transferencia"
    reference_number: Optional[str] = None
    exchange_rate: Optional[float] = 850.0
    notes: Optional[str] = None


class PaymentCreate(BaseModel):
    payment_type: Optional[str] = "cxp_pago"  # cxc_cobro, cxp_pago, cxp_retencion_iva
    target_id: Optional[int] = None  # receivable_id o payable_id
    amount_usd: float
    payment_method: str = "transferencia"  # transferencia, efectivo_usd, retencion_iva, retencion_islr, zelle, pago_movil
    bank_account: Optional[str] = "banesco_usd"
    voucher_number: Optional[str] = None
    reference_number: Optional[str] = None
    exchange_rate: float = 800.0
    notes: Optional[str] = None

# 4. ENDPOINTS DE CUENTAS POR PAGAR (CxP PROVEEDORES)
# ------------------------------------------------------------------------------
# ------------------------------------------------------------------------------
# 4. ENDPOINTS DE CUENTAS POR PAGAR (CxP PROVEEDORES)
# ------------------------------------------------------------------------------
@router.get("/cxp")
def get_payables(
    page: Optional[int] = Query(None, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    search: Optional[str] = Query(None),
    doc_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    project_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    query = (
        db.query(AccountPayable)
        .options(
            joinedload(AccountPayable.project),
            selectinload(AccountPayable.payments)
        )
    )

    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        query = query.filter(
            func.lower(AccountPayable.supplier_name).like(term) |
            func.lower(AccountPayable.invoice_number).like(term) |
            func.lower(AccountPayable.control_number).like(term) |
            func.lower(AccountPayable.supplier_rif).like(term) |
            func.lower(AccountPayable.description).like(term) |
            func.lower(AccountPayable.withholding_voucher_number).like(term)
        )

    if doc_type and doc_type.strip() and doc_type != "all":
        query = query.filter(AccountPayable.doc_type == doc_type.strip())

    if project_id:
        query = query.filter(AccountPayable.project_id == project_id)

    if date_from and date_from.strip():
        try:
            df = datetime.strptime(date_from.strip(), "%Y-%m-%d")
            query = query.filter(AccountPayable.issue_date >= df)
        except Exception:
            pass

    if date_to and date_to.strip():
        try:
            dt = datetime.strptime(date_to.strip(), "%Y-%m-%d").replace(hour=23, minute=59, second=59)
            query = query.filter(AccountPayable.issue_date <= dt)
        except Exception:
            pass

    today = datetime.utcnow().date()

    if status and status.strip() and status != "all":
        st = status.strip().lower()
        if st in ["pagado", "pagado_total", "solvente"]:
            query = query.filter(AccountPayable.balance_usd <= 0.01)
        elif st in ["pendiente", "abierta"]:
            query = query.filter(AccountPayable.balance_usd > 0.01)
        elif st == "vencido":
            query = query.filter(AccountPayable.balance_usd > 0.01, AccountPayable.due_date < datetime.utcnow())
        elif st == "por_vencer":
            seven_days = datetime.utcnow() + timedelta(days=7)
            query = query.filter(AccountPayable.balance_usd > 0.01, AccountPayable.due_date >= datetime.utcnow(), AccountPayable.due_date <= seven_days)

    query = query.order_by(AccountPayable.id.desc())

    is_paginated = page is not None and isinstance(page, int)
    total = query.order_by(None).count() if is_paginated else None
    rows = query.offset((page - 1) * page_size).limit(page_size).all() if is_paginated else query.all()

    items = []
    for p in rows:
        due_d = p.due_date.date() if p.due_date else None
        days_diff = (today - due_d).days if due_d else 0
        
        if p.balance_usd <= 0.01:
            aging_status = "solventado"
        elif days_diff > 0:
            aging_status = "vencido"
        elif days_diff >= -7:
            aging_status = "por_vencer"
        else:
            aging_status = "al_dia"

        items.append({
            "id": p.id,
            "invoice_number": p.invoice_number,
            "control_number": p.control_number or "-",
            "supplier_name": p.supplier_name,
            "supplier_rif": p.supplier_rif or "-",
            "doc_type": p.doc_type or "factura",
            "project_id": p.project_id,
            "project_name": p.project.name if p.project else "Sede Central",
            "project_code": p.project.code if p.project else "SEDE",
            "payable_type": p.payable_type,
            "description": p.description,
            "issue_date": p.issue_date.strftime("%Y-%m-%d") if p.issue_date else "-",
            "due_date": p.due_date.strftime("%Y-%m-%d") if p.due_date else "-",
            "days_overdue": max(0, days_diff) if aging_status == "vencido" else 0,
            "aging_status": aging_status,
            "withholding_voucher_number": p.withholding_voucher_number,
            "withholding_voucher_date": p.withholding_voucher_date.strftime("%Y-%m-%d") if p.withholding_voucher_date else None,
            "is_withholding_applied": p.is_withholding_applied,
            "withholding_exempt_usd": p.withholding_exempt_usd or 0.0,
            "warehouse_movement_id": p.warehouse_movement_id,
            "warehouse_entry_ref": p.warehouse_entry_ref,
            "amount_usd": p.amount_usd,
            "amount_bs": p.amount_bs,
            "exchange_rate": p.exchange_rate,
            "taxable_base_usd": p.taxable_base_usd,
            "tax_amount_usd": p.tax_amount_usd,
            "tax_withholding_rate": p.tax_withholding_rate,
            "tax_withholding_usd": p.tax_withholding_usd,
            "islr_rate": p.islr_rate,
            "islr_withholding_usd": p.islr_withholding_usd,
            "municipal_rate": p.municipal_rate or 0.0,
            "municipal_withholding_usd": p.municipal_withholding_usd or 0.0,
            "municipal_voucher_number": p.municipal_voucher_number,
            "net_amount_usd": p.net_amount_usd,
            "paid_amount_usd": p.paid_amount_usd,
            "balance_usd": p.balance_usd,
            "status": p.status,
            "payments": [{
                "id": pm.id,
                "payment_type": pm.payment_type,
                "payment_method": pm.payment_method,
                "bank_account": pm.bank_account or "banesco_usd",
                "amount_usd": pm.amount_usd,
                "amount_bs": pm.amount_bs,
                "voucher_number": pm.voucher_number or pm.reference_number,
                "payment_date": pm.payment_date.strftime("%d/%m/%Y") if pm.payment_date else "-",
                "notes": pm.notes
            } for pm in p.payments]
        })

    if is_paginated:
        return {
            "items": items,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size if page_size > 0 else 1
        }
    return items

@router.get("/unbilled-warehouse-entries")
def get_unbilled_warehouse_entries(db: Session = Depends(get_db)):
    """
    Retorna entradas físicas de almacén que no han sido vinculadas a una Cuenta por Pagar (CxP).
    """
    entries = db.query(MaterialMovement).options(
        joinedload(MaterialMovement.material),
        joinedload(MaterialMovement.project)
    ).filter(
        MaterialMovement.movement_type == "entrada"
    ).order_by(MaterialMovement.movement_date.desc()).limit(150).all()

    linked_ids = set(
        row[0] for row in db.query(AccountPayable.warehouse_movement_id).filter(
            AccountPayable.warehouse_movement_id.isnot(None)
        ).all()
    )

    unbilled = []
    for e in entries:
        if e.id not in linked_ids:
            unbilled.append({
                "id": e.id,
                "movement_date": e.movement_date.strftime("%Y-%m-%d %H:%M") if e.movement_date else "",
                "material_id": e.material_id,
                "material_name": e.material.name if e.material else "Material Desconocido",
                "unit_measure": e.material.unit_measure if e.material else "UND",
                "quantity": e.quantity,
                "unit_cost_usd": e.unit_cost_usd or 0.0,
                "total_cost_usd": e.total_cost_usd or round((e.quantity or 0) * (e.unit_cost_usd or 0), 2),
                "destination": e.destination or "Almacén Central Dalor",
                "reference_doc": e.reference_doc or f"ENTRADA-{e.id}",
                "project_id": e.project_id,
                "project_name": e.project.name if e.project else None
            })
    return unbilled

@router.post("/cxp")
def create_payable(p_in: PayableCreate, db: Session = Depends(get_db)):
    # --------------------------------------------------------------------------
    # REGLA DE AUDITORÍA: AMARRE OBLIGATORIO DE COMPRAS DE MERCANCÍA / CONSUMIBLES
    # --------------------------------------------------------------------------
    ptype = (p_in.payable_type or "").strip().lower()
    is_material_purchase = ptype in ["stock_almacen", "costo_material_obra", "compra_materiales"]

    created_mov_id = None
    created_mov_ref = None

    if is_material_purchase:
        # Opción A: Vinculación con entrada previa existente
        if p_in.warehouse_movement_id:
            mov = db.query(MaterialMovement).filter(
                MaterialMovement.id == p_in.warehouse_movement_id,
                MaterialMovement.movement_type == "entrada"
            ).first()
            if not mov:
                raise HTTPException(status_code=400, detail=f"La entrada de almacén #{p_in.warehouse_movement_id} no existe o no corresponde a una recepción válida.")
            created_mov_id = mov.id
            created_mov_ref = mov.reference_doc or f"REC-MAT-{mov.id}"

        # Opción B: Carga física simultánea de ítems recibidos
        elif p_in.material_items and len(p_in.material_items) > 0:
            for item in p_in.material_items:
                if item.quantity <= 0:
                    raise HTTPException(status_code=400, detail="La cantidad ingresada de cada material debe ser mayor a cero.")
                mat = db.query(Material).filter(Material.id == item.material_id).first()
                if not mat:
                    raise HTTPException(status_code=404, detail=f"Material #{item.material_id} no encontrado en catálogo.")

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
                mat.stock_quantity = round(total_qty, 2)
                mat.total_cost_usd = round(mat.stock_quantity * (mat.unit_cost_usd or 0.0), 2)

                dest = item.destination or ("Almacén Central Dalor" if ptype == "stock_almacen" else f"Proyecto #{p_in.project_id or 'General'}")
                ref_doc = p_in.invoice_number or p_in.control_number or f"REC-CXP-{int(datetime.utcnow().timestamp())}"

                new_mov = MaterialMovement(
                    material_id=mat.id,
                    movement_type="entrada",
                    quantity=item.quantity,
                    unit_cost_usd=item.unit_cost_usd,
                    total_cost_usd=round(item.quantity * item.unit_cost_usd, 2),
                    project_id=p_in.project_id if ptype == "costo_material_obra" else None,
                    destination=dest,
                    reference_doc=ref_doc,
                    notes=f"Entrada por compra a crédito según factura [{p_in.invoice_number}] de {p_in.supplier_name}",
                    performed_by="Finanzas / Almacén"
                )
                db.add(new_mov)
                db.flush()
                if not created_mov_id:
                    created_mov_id = new_mov.id
                    created_mov_ref = ref_doc
        else:
            raise HTTPException(
                status_code=400,
                detail="Por control de inventario y auditoría Dalor, toda Cuenta por Pagar por compra de mercancía o consumibles debe respaldarse obligatoriamente con una Entrada de Almacén previa o registrando los materiales recibidos."
            )

    doc = (p_in.doc_type or "factura").strip().lower()
    islr_r = 0.0
    ret_islr_usd = 0.0
    
    # 1. Caso Nota de Entrega Informal (Sin IVA, Sin Retención)
    if doc == "nota_entrega":
        base_usd = p_in.amount_usd
        tax_usd = 0.0
        ret_rate = 0.0
        ret_iva_usd = 0.0
        islr_r = 0.0
        ret_islr_usd = 0.0
        net_usd = p_in.amount_usd
        voucher_num = None
        voucher_date = None
        is_ret_applied = False
        init_paid = 0.0
        init_balance = p_in.amount_usd
    
    # 2. Caso Factura Contado en Sitio (Con IVA pagado al 100% de contado, Sin Retención de DALOR)
    elif doc == "factura_sin_retencion" or p_in.is_withholding_applied is False or (p_in.tax_withholding_rate or 0) <= 0:
        base_usd = p_in.taxable_base_usd if (p_in.taxable_base_usd and p_in.taxable_base_usd > 0) else round(p_in.amount_usd / 1.16, 2)
        tax_usd = p_in.tax_amount_usd if (p_in.tax_amount_usd and p_in.tax_amount_usd > 0) else round(p_in.amount_usd - base_usd, 2)
        ret_rate = 0.0
        ret_iva_usd = 0.0
        net_usd = p_in.amount_usd
        voucher_num = None
        voucher_date = None
        is_ret_applied = False
        init_paid = 0.0
        init_balance = p_in.amount_usd
        
    # 3. Caso Factura Fiscal SENIAT Estándar con Retención de IVA (75% / 100%)
    else:
        base_usd = p_in.taxable_base_usd if (p_in.taxable_base_usd and p_in.taxable_base_usd > 0) else round(p_in.amount_usd / 1.16, 2)
        tax_usd = p_in.tax_amount_usd if (p_in.tax_amount_usd and p_in.tax_amount_usd > 0) else round(p_in.amount_usd - base_usd, 2)
        ret_rate = p_in.tax_withholding_rate if p_in.tax_withholding_rate is not None else 75.0
        ret_iva_usd = p_in.tax_withholding_usd if (p_in.tax_withholding_usd and p_in.tax_withholding_usd > 0) else round(tax_usd * (ret_rate / 100.0), 2)
        islr_r = p_in.islr_rate if p_in.islr_rate is not None else 0.0
        ret_islr_usd = p_in.islr_withholding_usd if (p_in.islr_withholding_usd and p_in.islr_withholding_usd > 0) else (round(base_usd * (islr_r / 100.0), 2) if islr_r > 0 else 0.0)
        mun_r = p_in.municipal_rate if p_in.municipal_rate is not None else 0.0
        ret_mun_usd = p_in.municipal_withholding_usd if (p_in.municipal_withholding_usd and p_in.municipal_withholding_usd > 0) else (round(base_usd * (mun_r / 100.0), 2) if mun_r > 0 else 0.0)
        net_usd = round(p_in.amount_usd - ret_iva_usd - ret_islr_usd - ret_mun_usd, 2)
        
        # Correlativo normativo SENIAT YYYYMM + 8 dígitos
        now = datetime.utcnow()
        prefix = now.strftime("%Y%m") # e.g. 202609
        latest_v = db.query(AccountPayable.withholding_voucher_number).filter(
            AccountPayable.withholding_voucher_number.like(f"{prefix}%")
        ).order_by(AccountPayable.withholding_voucher_number.desc()).first()
        
        if latest_v and latest_v[0]:
            try:
                seq = int(str(latest_v[0])[6:]) + 1
            except Exception:
                seq = 1
        else:
            seq = 1015 if prefix == "202609" else 1
            
        voucher_num = f"{prefix}{seq:08d}"
        voucher_date = now
        is_ret_applied = True
        init_paid = 0.0
        init_balance = net_usd

    amount_bs = round(p_in.amount_usd * p_in.exchange_rate, 2)
    
    new_p = AccountPayable(
        invoice_number=p_in.invoice_number.strip(),
        control_number=(p_in.control_number or "").strip() or None,
        supplier_name=p_in.supplier_name.strip(),
        supplier_rif=(p_in.supplier_rif or "").strip() or None,
        doc_type=doc,
        withholding_voucher_number=voucher_num,
        withholding_voucher_date=voucher_date,
        is_withholding_applied=is_ret_applied,
        withholding_exempt_usd=p_in.withholding_exempt_usd or 0.0,
        project_id=p_in.project_id,
        category_id=p_in.category_id,
        payable_type=p_in.payable_type,
        warehouse_movement_id=created_mov_id,
        warehouse_entry_ref=created_mov_ref,
        description=p_in.description.strip(),
        issue_date=p_in.issue_date or datetime.utcnow(),
        due_date=p_in.due_date,
        taxable_base_usd=base_usd,
        tax_amount_usd=tax_usd,
        tax_withholding_rate=ret_rate,
        tax_withholding_usd=ret_iva_usd,
        islr_rate=islr_r,
        islr_withholding_usd=ret_islr_usd,
        municipal_rate=p_in.municipal_rate or 0.0,
        municipal_withholding_usd=p_in.municipal_withholding_usd or 0.0,
        municipal_voucher_number=p_in.municipal_voucher_number,
        municipal_voucher_date=datetime.utcnow() if (p_in.municipal_withholding_usd and p_in.municipal_withholding_usd > 0) else None,
        net_amount_usd=net_usd,
        amount_usd=p_in.amount_usd,
        amount_bs=amount_bs,
        exchange_rate=p_in.exchange_rate,
        paid_amount_usd=init_paid,
        balance_usd=init_balance,
        status="pagado_total" if init_balance <= 0.01 else "pendiente",
        notes=p_in.notes
    )
    db.add(new_p)
    db.flush()

    # Si se aplicó retención IVA, crear el movimiento fiscal de comprobante
    if is_ret_applied and ret_iva_usd > 0:
        ret_pay = FinancialPayment(
            payment_type="cxp_retencion_iva",
            payable_id=new_p.id,
            amount_usd=ret_iva_usd,
            amount_bs=round(ret_iva_usd * p_in.exchange_rate, 2),
            exchange_rate=p_in.exchange_rate,
            payment_method="retencion_iva",
            bank_account="fiscal_seniat",
            voucher_number=voucher_num,
            reference_number=voucher_num,
            notes=f"Comprobante de Retención de IVA {voucher_num} (Alícuota {ret_rate}%) emitido al proveedor."
        )
        db.add(ret_pay)

    # Si se aplicó retención ISLR, crear el movimiento fiscal de comprobante ISLR
    if ret_islr_usd > 0:
        ret_islr_pay = FinancialPayment(
            payment_type="cxp_retencion_islr",
            payable_id=new_p.id,
            amount_usd=ret_islr_usd,
            amount_bs=round(ret_islr_usd * p_in.exchange_rate, 2),
            exchange_rate=p_in.exchange_rate,
            payment_method="retencion_islr",
            bank_account="fiscal_seniat",
            voucher_number=f"ISLR-{voucher_num or new_p.id}",
            reference_number=f"ISLR-{voucher_num or new_p.id}",
            notes=f"Retención ISLR {islr_r}% ({new_p.supplier_name})"
        )
        db.add(ret_islr_pay)

    # Auditoría
    audit = AuditLog(
        username="Finanzas",
        module="cuentas_por_pagar",
        action="crear_cuenta_por_pagar",
        details=f"Factura/Nota {new_p.invoice_number} de '{new_p.supplier_name}' registrada por ${new_p.amount_usd:.2f} USD. Modalidad: {doc}. Comprobante: {voucher_num or 'N/A'}."
    )
    db.add(audit)
    db.commit()
    db.refresh(new_p)

    return {
        "success": True,
        "message": f"Cuenta por pagar {new_p.invoice_number} registrada exitosamente.",
        "id": new_p.id,
        "withholding_voucher_number": voucher_num,
        "net_balance_usd": new_p.balance_usd,
        "warehouse_movement_id": new_p.warehouse_movement_id,
        "warehouse_entry_ref": new_p.warehouse_entry_ref
    }

# ─── COMPROBANTES DE RETENCIÓN SENIAT & MUNICIPALES (MODULARIZADO EN ./financial/financial_vouchers.py) ────

@router.put("/cxp/{payable_id}")
def update_payable(payable_id: int, p_in: PayableUpdate, db: Session = Depends(get_db)):
    p = db.query(AccountPayable).filter(AccountPayable.id == payable_id).with_for_update().first()
    if not p:
        raise HTTPException(status_code=404, detail="Cuenta por pagar no encontrada.")

    # Solo permitir editar si no se han hecho pagos bancarios definitivos
    bank_pays = [pm for pm in p.payments if pm.payment_method not in ["retencion_iva", "retencion_islr"]]
    if bank_pays:
        raise HTTPException(status_code=400, detail="No se puede modificar una factura que ya posee pagos bancarios ejecutados. Debe anular primero los pagos si desea corregirla.")

    if p_in.supplier_name is not None: p.supplier_name = p_in.supplier_name.strip()
    if p_in.supplier_rif is not None: p.supplier_rif = p_in.supplier_rif.strip()
    if p_in.invoice_number is not None: p.invoice_number = p_in.invoice_number.strip()
    if p_in.control_number is not None: p.control_number = p_in.control_number.strip()
    if p_in.description is not None: p.description = p_in.description.strip()
    if p_in.due_date is not None: p.due_date = p_in.due_date
    if p_in.notes is not None: p.notes = p_in.notes
    if p_in.doc_type is not None: p.doc_type = p_in.doc_type.strip().lower()
    if p_in.withholding_voucher_number is not None: p.withholding_voucher_number = p_in.withholding_voucher_number.strip()

    if p_in.exchange_rate is not None and p_in.exchange_rate > 0:
        p.exchange_rate = p_in.exchange_rate

    if p_in.amount_usd is not None and p_in.amount_usd > 0:
        p.amount_usd = p_in.amount_usd
    
    p.amount_bs = round(p.amount_usd * p.exchange_rate, 2)

    if p_in.tax_withholding_rate is not None:
        p.tax_withholding_rate = p_in.tax_withholding_rate

    if p.doc_type == "factura" and p.tax_withholding_rate and p.tax_withholding_rate > 0:
        base_usd = p_in.taxable_base_usd if (p_in.taxable_base_usd is not None and p_in.taxable_base_usd > 0) else round(p.amount_usd / 1.16, 2)
        tax_usd = p_in.tax_amount_usd if (p_in.tax_amount_usd is not None and p_in.tax_amount_usd > 0) else round(p.amount_usd - base_usd, 2)
        ret_usd = p_in.tax_withholding_usd if (p_in.tax_withholding_usd is not None and p_in.tax_withholding_usd > 0) else round(tax_usd * (p.tax_withholding_rate / 100.0), 2)
        net_usd = round(p.amount_usd - ret_usd, 2)

        p.taxable_base_usd = base_usd
        p.tax_amount_usd = tax_usd
        p.tax_withholding_usd = ret_usd
        p.net_amount_usd = net_usd
        p.paid_amount_usd = 0.0
        p.balance_usd = net_usd
        p.is_withholding_applied = True

        # Actualizar pago de retención
        ret_pay = db.query(FinancialPayment).filter(
            FinancialPayment.payable_id == p.id,
            FinancialPayment.payment_method == "retencion_iva"
        ).first()
        if ret_pay:
            ret_pay.amount_usd = ret_usd
            ret_pay.amount_bs = round(ret_usd * p.exchange_rate, 2)
            ret_pay.exchange_rate = p.exchange_rate
            if p.withholding_voucher_number:
                ret_pay.voucher_number = p.withholding_voucher_number
                ret_pay.reference_number = p.withholding_voucher_number
        elif ret_usd > 0:
            now = datetime.utcnow()
            v_num = p.withholding_voucher_number or f"{now.strftime('%Y%m')}00001015"
            p.withholding_voucher_number = v_num
            p.withholding_voucher_date = now
            db.add(FinancialPayment(
                payment_type="cxp_retencion_iva",
                payable_id=p.id,
                amount_usd=ret_usd,
                amount_bs=round(ret_usd * p.exchange_rate, 2),
                exchange_rate=p.exchange_rate,
                payment_method="retencion_iva",
                bank_account="fiscal_seniat",
                voucher_number=v_num,
                reference_number=v_num,
                notes=f"Comprobante de Retención de IVA {v_num} reajustado."
            ))
    else:
        # Sin retención
        p.tax_withholding_rate = 0.0
        p.tax_withholding_usd = 0.0
        p.net_amount_usd = p.amount_usd
        p.paid_amount_usd = 0.0
        p.balance_usd = p.amount_usd
        p.is_withholding_applied = False
        db.query(FinancialPayment).filter(
            FinancialPayment.payable_id == p.id,
            FinancialPayment.payment_method == "retencion_iva"
        ).delete(synchronize_session=False)

    p.status = "pagado_total" if p.balance_usd <= 0.01 else "pendiente"

    audit = AuditLog(
        username="Finanzas",
        module="cuentas_por_pagar",
        action="modificar_cuenta_por_pagar",
        details=f"Factura {p.invoice_number} modificada. Nuevo saldo: ${p.balance_usd:.2f} USD."
    )
    db.add(audit)
    db.commit()
    db.refresh(p)
    return {"success": True, "message": "Factura actualizada exitosamente.", "id": p.id, "balance_usd": p.balance_usd}

@router.delete("/cxp/{payable_id}")
def delete_payable(payable_id: int, db: Session = Depends(get_db)):
    p = db.query(AccountPayable).filter(AccountPayable.id == payable_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Cuenta por pagar no encontrada.")

    # Eliminar todos los pagos y retenciones asociados a esta cuenta por pagar
    db.query(FinancialPayment).filter(
        (FinancialPayment.payable_id == payable_id) |
        ((FinancialPayment.payment_type == "cxp_pago") & (FinancialPayment.reference_number == p.invoice_number))
    ).delete(synchronize_session=False)

    inv_num = p.invoice_number
    supp = p.supplier_name
    db.delete(p)

    audit = AuditLog(
        username="Finanzas",
        module="cuentas_por_pagar",
        action="anular_cuenta_por_pagar",
        details=f"Cuenta por pagar {inv_num} de '{supp}' fue anulada y eliminada del sistema."
    )
    db.add(audit)
    db.commit()
    return {"success": True, "message": f"Factura {inv_num} eliminada y anulada con éxito."}

@router.post("/cxp/{payable_id}/payment")
def record_cxp_payment(payable_id: int, p_in: PaymentCreate, db: Session = Depends(get_db)):
    p = db.query(AccountPayable).filter(AccountPayable.id == payable_id).with_for_update().first()
    if not p:
        raise HTTPException(status_code=404, detail="Deuda no encontrada.")

    if p_in.amount_usd <= 0:
        raise HTTPException(status_code=400, detail="El monto del pago debe ser mayor a cero.")

    if p_in.amount_usd > (p.balance_usd + 0.05):
        raise HTTPException(status_code=400, detail=f"El pago (${p_in.amount_usd:.2f}) supera el saldo pendiente (${p.balance_usd:.2f}).")

    ref_clean = (p_in.reference_number or p_in.voucher_number or "").strip()
    if ref_clean:
        existing_pay = db.query(FinancialPayment).filter(
            FinancialPayment.payable_id == payable_id,
            (FinancialPayment.reference_number == ref_clean) | (FinancialPayment.voucher_number == ref_clean)
        ).first()
        if existing_pay:
            raise HTTPException(
                status_code=409,
                detail=f"Operación duplicada: El pago con referencia '{ref_clean}' ya fue procesado para esta deuda (Pago #{existing_pay.id} por ${existing_pay.amount_usd:.2f})."
            )

    b_acc = p_in.bank_account or "banesco_usd"
    amount_bs = round(p_in.amount_usd * p_in.exchange_rate, 2)
    payment = FinancialPayment(
        payment_type="cxp_pago",  # SIEMPRE forzado a cxp_pago independientemente del payload
        payable_id=p.id,

        amount_usd=round(p_in.amount_usd, 2),
        amount_bs=amount_bs,
        exchange_rate=p_in.exchange_rate,
        payment_method=p_in.payment_method,
        bank_account=b_acc,
        voucher_number=p_in.voucher_number or p_in.reference_number,
        reference_number=p_in.reference_number,
        notes=p_in.notes
    )
    db.add(payment)

    p.paid_amount_usd = round(p.paid_amount_usd + p_in.amount_usd, 2)
    p.balance_usd = max(0.0, round(p.balance_usd - p_in.amount_usd, 2))
    if p.balance_usd <= 0.01:
        p.status = "pagado_total"
    else:
        p.status = "abono_parcial"

    audit = AuditLog(
        username="Finanzas",
        module="cuentas_por_pagar",
        action="registrar_pago_cxp",
        details=f"Abono de ${p_in.amount_usd:.2f} USD a '{p.supplier_name}' (Factura {p.invoice_number}) desde cuenta '{b_acc}'. Ref: {ref_clean}. Nuevo Saldo: ${p.balance_usd:.2f} USD."
    )
    db.add(audit)
    db.commit()
    return {"success": True, "message": "Pago aplicado con éxito.", "new_balance_usd": p.balance_usd, "status": p.status}

