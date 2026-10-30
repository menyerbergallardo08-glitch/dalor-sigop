from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
import re
import uuid
from sqlalchemy.orm import Session, joinedload, selectinload
from sqlalchemy import func, text, desc, asc
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from pydantic import BaseModel

from app.core.database import get_db
from app.services.storage import R2StorageService
from app.models.models import (
    AccountReceivable,
    FinancialPayment,
    FinancialAccount,
    Client,
    Project,
    AuditLog,
    ReceivableFollowUpLog,
    User as UserModel,
    CompanyProfile
)
from app.api.deps import require_roles, get_current_user
from app.schemas.schemas import (
    ReceivableFollowUpLogCreate,
    ReceivableFollowUpLogOut
)

router = APIRouter()

# ------------------------------------------------------------------------------
# SCHEMAS DE CUENTAS POR COBRAR (CxC)
# ------------------------------------------------------------------------------
class ReceivableCreate(BaseModel):
    invoice_number: Optional[str] = None
    control_number: Optional[str] = None
    client_id: int
    project_id: Optional[int] = None
    description: str
    due_date: Optional[datetime] = None
    amount_usd: float # Total Factura
    taxable_base_usd: Optional[float] = 0.0
    tax_amount_usd: Optional[float] = 0.0
    tax_withholding_rate: Optional[float] = 75.0 # 0, 75, 100
    tax_withholding_usd: Optional[float] = 0.0
    islr_rate: Optional[float] = 2.0 # 0, 1, 2, 3, 5
    islr_withholding_usd: Optional[float] = 0.0
    tax_retained_usd: Optional[float] = 0.0
    net_amount_usd: Optional[float] = 0.0
    exchange_rate: float = 800.0
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
    emit_fiscal_invoice: bool = False
    custom_concept: Optional[str] = None


class ClientRefundCreate(BaseModel):
    amount_usd: float
    payment_method: str = "transferencia"
    reference_number: Optional[str] = None
    exchange_rate: Optional[float] = 850.0
    notes: Optional[str] = None


class BadDebtRequest(BaseModel):
    reason: str
    notes: Optional[str] = None


class BadDebtWriteOff(BaseModel):
    reason: str
    notes: Optional[str] = None


class CorrelativeOverrideRequest(BaseModel):
    next_invoice_code: Optional[str] = None
    next_control_number: Optional[str] = None
    reason: str


# ------------------------------------------------------------------------------
# 3. ENDPOINTS DE CUENTAS POR COBRAR (CxC)
# ------------------------------------------------------------------------------
@router.get("/cxc")
def get_receivables(
    page: Optional[int] = Query(None, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    query = (
        db.query(AccountReceivable)
        .options(
            joinedload(AccountReceivable.client),
            joinedload(AccountReceivable.project),
            selectinload(AccountReceivable.payments)
        )
        .order_by(AccountReceivable.id.desc())
    )
    is_paginated = page is not None and isinstance(page, int)
    total = query.order_by(None).count() if is_paginated else None
    rows = query.offset((page - 1) * page_size).limit(page_size).all() if is_paginated else query.all()

    items = [{
        "id": r.id,
        "invoice_number": r.invoice_number,
        "control_number": getattr(r, 'control_number', None) or "",
        "client_id": r.client_id,
        "client_name": r.client.name if r.client else "General",
        "client_rif": r.client.rif if r.client else "-",
        "project_id": r.project_id,
        "project_name": r.project.name if r.project else "Sede Central",
        "project_code": r.project.code if r.project else "GEN",
        "description": r.description,
        "issue_date": r.issue_date.strftime("%Y-%m-%d") if r.issue_date else "",
        "due_date": r.due_date.strftime("%Y-%m-%d") if r.due_date else "",
        "amount_usd": r.amount_usd,
        "taxable_base_usd": r.taxable_base_usd,
        "tax_amount_usd": r.tax_amount_usd,
        "tax_withholding_rate": r.tax_withholding_rate,
        "tax_withholding_usd": r.tax_withholding_usd,
        "islr_rate": r.islr_rate,
        "islr_withholding_usd": r.islr_withholding_usd,
        "net_amount_usd": r.net_amount_usd,
        "paid_amount_usd": r.paid_amount_usd,
        "balance_usd": r.balance_usd,
        "status": r.status,
        "tax_retained_usd": r.tax_retained_usd,
        "payments": [{
            "id": p.id,
            "payment_type": p.payment_type,
            "payment_method": p.payment_method,
            "amount_usd": p.amount_usd,
            "voucher_number": p.voucher_number or p.reference_number,
            "payment_date": p.payment_date.strftime("%d/%m/%Y") if p.payment_date else "",
            "notes": p.notes
        } for p in r.payments]
    } for r in rows]

    if is_paginated:
        return {
            "items": items,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size if page_size > 0 else 1
        }
    return items

def compute_next_invoice_code(db: Session, current_year: int, prefix: str = "FAC") -> str:
    import re
    clean_prefix = (prefix or "FAC").strip().upper()
    if clean_prefix in ("VAL", "NE", "REC"):
        records = db.query(AccountReceivable.invoice_number).all()
        max_seq = 0
        pattern = re.compile(rf"{clean_prefix}-{current_year}-(\d+)", re.IGNORECASE)
        for (inv_code,) in records:
            if inv_code:
                match = pattern.search(inv_code.strip())
                if match:
                    try:
                        num = int(match.group(1))
                        if num > max_seq:
                            max_seq = num
                    except ValueError:
                        pass
        return f"{clean_prefix}-{current_year}-{(max_seq + 1):03d}"

    # Correlativo Oficial de Facturas en Forma Libre (4 dígitos: 0948, 0949...)
    # 1. Si la Dirección fijó un número en CompanyProfile, se respeta estrictamente
    profile = db.query(CompanyProfile).first()
    if profile and profile.next_invoice_number and profile.next_invoice_number > 0:
        return f"{profile.next_invoice_number:04d}"

    # 2. Base histórica física de Metalmecánica Dalor: 0947
    records = db.query(AccountReceivable.invoice_number).all()
    max_seq = 947
    for (inv_code,) in records:
        if inv_code:
            code_str = inv_code.strip()
            nums = re.findall(r'\d+', code_str)
            for part in nums:
                try:
                    val = int(part)
                    if val != current_year and 900 <= val < 100000:
                        if val > max_seq:
                            max_seq = val
                except ValueError:
                    pass
    next_num = max_seq + 1
    return f"{next_num:04d}"

def compute_next_control_number(db: Session) -> str:
    import re
    profile = db.query(CompanyProfile).first()
    if profile and profile.next_control_number and profile.next_control_number > 0:
        return f"00-{profile.next_control_number:06d}"

    ctrl_records = db.query(AccountReceivable.control_number).filter(AccountReceivable.control_number != None).all()
    max_ctrl = 557 # Papel físico de muestra en taller es 00-000558
    for (c_num,) in ctrl_records:
        if c_num:
            m = re.findall(r'\d+', c_num)
            if m:
                try:
                    val = int(m[-1])
                    if val > max_ctrl:
                        max_ctrl = val
                except ValueError:
                    pass
    return f"00-{max_ctrl + 1:06d}"

@router.get("/next-invoice-code")
def get_next_invoice_code(prefix: str = "FAC", db: Session = Depends(get_db)):
    current_year = datetime.utcnow().year
    clean_p = (prefix or "FAC").strip().upper()
    code = compute_next_invoice_code(db, current_year, clean_p)
    control = compute_next_control_number(db) if clean_p == "FAC" else ""
    return {"next_code": code, "next_control": control, "year": current_year, "prefix": clean_p}

@router.post("/override-correlative")
def override_fiscal_correlative(
    req: CorrelativeOverrideRequest,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """
    Mecanismo de Emergencia para Directivos:
    Permite saltar o reajustar correlativos oficiales en caso de atasco, rotura de papel
    o anulación física de formas libres en taller/sede.
    """
    role = (getattr(current_user, "role_name", "") or "").lower()
    is_director = bool(getattr(current_user, "is_superuser", False)) or any(d in role for d in ["director", "directivo", "gerencia_general", "admin", "administrador"])
    if not is_director:
        raise HTTPException(
            status_code=403,
            detail="Acceso restringido: Solo directores y administradores generales pueden modificar el correlativo fiscal de emergencia."
        )

    if not req.reason or len(req.reason.strip()) < 5:
        raise HTTPException(
            status_code=400,
            detail="Debe suministrar una justificación detallada para el ajuste de emergencia del correlativo fiscal."
        )

    profile = db.query(CompanyProfile).first()
    if not profile:
        profile = CompanyProfile()
        db.add(profile)
        db.flush()

    prev_inv = profile.next_invoice_number or compute_next_invoice_code(db, datetime.utcnow().year, "FAC")
    prev_ctrl = profile.next_control_number or compute_next_control_number(db)

    inv_changed = False
    ctrl_changed = False

    if req.next_invoice_code and req.next_invoice_code.strip():
        m = re.findall(r'\d+', req.next_invoice_code)
        if m:
            new_inv_num = int(m[-1])
            profile.next_invoice_number = new_inv_num
            inv_changed = True

    if req.next_control_number and req.next_control_number.strip():
        m = re.findall(r'\d+', req.next_control_number)
        if m:
            new_ctrl_num = int(m[-1])
            profile.next_control_number = new_ctrl_num
            ctrl_changed = True

    if not inv_changed and not ctrl_changed:
        raise HTTPException(status_code=400, detail="Debe indicar un número de factura o número de control válido.")

    audit = AuditLog(
        user_id=getattr(current_user, "id", None),
        username=getattr(current_user, "username", "director"),
        module="financial_correlative",
        action="emergency_override",
        details=str({
            "previous_invoice": prev_inv,
            "new_invoice": profile.next_invoice_number,
            "previous_control": prev_ctrl,
            "new_control": profile.next_control_number,
            "reason": req.reason.strip()
        })
    )
    db.add(audit)
    db.commit()

    current_year = datetime.utcnow().year
    fresh_code = compute_next_invoice_code(db, current_year, "FAC")
    fresh_control = compute_next_control_number(db)

    return {
        "success": True,
        "message": f"Correlativo fiscal actualizado exitosamente por Dirección.",
        "next_code": fresh_code,
        "next_control": fresh_control
    }

@router.post("/cxc", dependencies=[Depends(require_roles(["director_general", "director", "administracion", "administrador_financiero", "facturacion"]))])
def create_receivable(r_in: ReceivableCreate, db: Session = Depends(get_db)):
    try:
        current_year = datetime.utcnow().year
        raw_inv = (r_in.invoice_number or "").strip()
        if not raw_inv:
            inv_number = compute_next_invoice_code(db, current_year, "FAC")
        else:
            existing = db.query(AccountReceivable).filter(AccountReceivable.invoice_number == raw_inv).first()
            if existing:
                base_inv = raw_inv
                count = db.query(AccountReceivable).filter(AccountReceivable.invoice_number.like(f"{base_inv}%")).count()
                inv_number = f"{base_inv}-{count+1:02d}"
            else:
                inv_number = raw_inv

        # Validación de proyecto (opcional: permite facturación libre / directa / en blanco sin obra asociada)
        proj = None
        if r_in.project_id and r_in.project_id > 0:
            proj = db.query(Project).filter(Project.id == r_in.project_id).first()
            if not proj:
                raise HTTPException(status_code=404, detail="El proyecto imputable no existe.")
            if proj.client_id and proj.client_id != r_in.client_id:
                raise HTTPException(
                    status_code=400,
                    detail=f"Inconsistencia: La obra [{proj.code}] '{proj.name}' pertenece a otro cliente y no puede imputarse a este cliente."
                )

        # Las retenciones NO se predeterminan obligatoriamente; sólo se registran si el usuario o cliente las especifica explícitamente (> 0)
        base_usd = r_in.taxable_base_usd if (r_in.taxable_base_usd and r_in.taxable_base_usd > 0) else round(r_in.amount_usd / 1.16, 2)
        tax_usd = r_in.tax_amount_usd if (r_in.tax_amount_usd and r_in.tax_amount_usd > 0) else round(r_in.amount_usd - base_usd, 2)
        ret_iva_usd = r_in.tax_withholding_usd if (r_in.tax_withholding_usd and r_in.tax_withholding_usd > 0) else 0.0
        ret_islr_usd = r_in.islr_withholding_usd if (r_in.islr_withholding_usd and r_in.islr_withholding_usd > 0) else 0.0
        tot_ret_usd = r_in.tax_retained_usd if (r_in.tax_retained_usd and r_in.tax_retained_usd > 0) else (ret_iva_usd + ret_islr_usd)
        net_usd = r_in.net_amount_usd if (r_in.net_amount_usd and r_in.net_amount_usd > 0) else round(r_in.amount_usd - tot_ret_usd, 2)

        amount_bs = r_in.amount_usd * r_in.exchange_rate
        ctrl_final = (r_in.control_number or "").strip() or compute_next_control_number(db)
        new_r = AccountReceivable(
            invoice_number=inv_number,
            control_number=ctrl_final,
            client_id=r_in.client_id,
            project_id=r_in.project_id,
            description=r_in.description.strip(),
            due_date=r_in.due_date,
            taxable_base_usd=base_usd,
            tax_amount_usd=tax_usd,
            tax_withholding_rate=r_in.tax_withholding_rate or 75.0,
            tax_withholding_usd=ret_iva_usd,
            islr_rate=r_in.islr_rate or 2.0,
            islr_withholding_usd=ret_islr_usd,
            net_amount_usd=net_usd,
            amount_usd=r_in.amount_usd,
            amount_bs=amount_bs,
            exchange_rate=r_in.exchange_rate,
            tax_retained_usd=ret_iva_usd + ret_islr_usd,
            balance_usd=r_in.amount_usd,
            status="pendiente",
            notes=r_in.notes
        )
        db.add(new_r)

        # Si hay override de correlativo activo en CompanyProfile, avanzar puntero automáticamente
        profile = db.query(CompanyProfile).first()
        if profile:
            m_inv = re.findall(r'\d+', inv_number)
            if m_inv:
                used_inv = int(m_inv[-1])
                if profile.next_invoice_number and used_inv >= profile.next_invoice_number:
                    profile.next_invoice_number = used_inv + 1
            if ctrl_final:
                m_ctrl = re.findall(r'\d+', ctrl_final)
                if m_ctrl:
                    used_ctrl = int(m_ctrl[-1])
                    if profile.next_control_number and used_ctrl >= profile.next_control_number:
                        profile.next_control_number = used_ctrl + 1

        db.commit()
        db.refresh(new_r)
        return {"success": True, "message": "Factura CxC registrada con éxito con retenciones SENIAT.", "id": new_r.id, "invoice_number": new_r.invoice_number, "control_number": new_r.control_number}
    except Exception as e:
        import traceback
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error en create_receivable: {str(e)} -> {traceback.format_exc()}")

class ControlNumberUpdate(BaseModel):
    control_number: str

class FiscalCorrelativeUpdate(BaseModel):
    fiscal_invoice_number: Optional[str] = None
    control_number: Optional[str] = None
    issue_date: Optional[str] = None
    reason: Optional[str] = None

@router.put("/cxc/{receivable_id}/control-number", dependencies=[Depends(require_roles(["director_general", "director", "administracion", "administrador_financiero"]))])
def update_receivable_control_number(receivable_id: int, payload: ControlNumberUpdate, db: Session = Depends(get_db)):
    r = db.query(AccountReceivable).filter(AccountReceivable.id == receivable_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Factura CxC no encontrada.")
    r.control_number = payload.control_number.strip()
    db.commit()
    return {"success": True, "control_number": r.control_number}

@router.put("/cxc/{receivable_id}/fiscal-correlative")
def update_receivable_fiscal_correlative(
    receivable_id: int,
    payload: FiscalCorrelativeUpdate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    r = db.query(AccountReceivable).filter(AccountReceivable.id == receivable_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Cuenta por cobrar no encontrada.")

    changes = []
    if payload.fiscal_invoice_number and payload.fiscal_invoice_number.strip():
        new_inv = payload.fiscal_invoice_number.strip()
        r.fiscal_invoice_number = new_inv
        changes.append(f"Factura: {new_inv}")
        nums = re.findall(r'\d+', new_inv)
        if nums:
            val = int(nums[-1])
            profile = db.query(CompanyProfile).first()
            if profile and (not profile.next_invoice_number or val >= profile.next_invoice_number):
                profile.next_invoice_number = val + 1

    if payload.control_number and payload.control_number.strip():
        new_ctrl = payload.control_number.strip()
        r.control_number = new_ctrl
        changes.append(f"Control: {new_ctrl}")
        nums = re.findall(r'\d+', new_ctrl)
        if nums:
            val = int(nums[-1])
            profile = db.query(CompanyProfile).first()
            if profile and (not profile.next_control_number or val >= profile.next_control_number):
                profile.next_control_number = val + 1

    if payload.issue_date and payload.issue_date.strip():
        dt = None
        d_clean = payload.issue_date.strip()
        for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%Y/%m/%d"):
            try:
                dt = datetime.strptime(d_clean, fmt)
                break
            except ValueError:
                pass

        if dt:
            r.issue_date = dt
            changes.append(f"Fecha: {dt.strftime('%d/%m/%Y')}")

            # Buscar si existe tasa BCV histórica auditada para la nueva fecha de emisión
            d_str = dt.strftime("%Y-%m-%d")
            row = db.execute(
                text("SELECT rate FROM bcv_rate_history WHERE rate_date <= :d ORDER BY rate_date DESC LIMIT 1"),
                {"d": d_str}
            ).fetchone()
            if not row:
                row = db.execute(text("SELECT rate FROM bcv_rate_history ORDER BY rate_date DESC LIMIT 1")).fetchone()
            if row and row[0] and float(row[0]) > 0:
                r.exchange_rate = float(row[0])
                r.amount_bs = round((r.amount_usd or 0.0) * r.exchange_rate, 2)

    audit = AuditLog(
        user_id=getattr(current_user, "id", None),
        username=getattr(current_user, "username", "usuario"),
        module="financial_cxc_fiscal",
        action="update_fiscal_correlative",
        details=str({
            "receivable_id": r.id,
            "invoice_number": r.invoice_number,
            "fiscal_invoice_number": r.fiscal_invoice_number,
            "control_number": r.control_number,
            "issue_date": r.issue_date.strftime("%Y-%m-%d") if r.issue_date else None,
            "reason": (payload.reason or "").strip()
        })
    )
    db.add(audit)
    db.commit()

    return {
        "success": True,
        "message": f"Ajustes fiscales actualizados con éxito ({', '.join(changes)}).",
        "fiscal_invoice_number": r.fiscal_invoice_number,
        "control_number": r.control_number,
        "issue_date": r.issue_date.strftime("%d/%m/%Y") if r.issue_date else "",
        "issue_date_iso": r.issue_date.strftime("%Y-%m-%d") if r.issue_date else ""
    }

@router.get("/cxc/{receivable_id}/fiscal-invoice-data")
def get_fiscal_invoice_data(receivable_id: int, db: Session = Depends(get_db)):
    r = (
        db.query(AccountReceivable)
        .options(
            joinedload(AccountReceivable.client),
            joinedload(AccountReceivable.project)
        )
        .filter(AccountReceivable.id == receivable_id)
        .first()
    )
    if not r:
        raise HTTPException(status_code=404, detail="Cuenta por cobrar no encontrada.")

    rate = float(r.exchange_rate or 0.0)
    if rate <= 0 or (rate == 800.0 and r.issue_date):
        d_str = r.issue_date.strftime("%Y-%m-%d") if r.issue_date else ""
        bcv_row = db.execute(
            text("SELECT rate FROM bcv_rate_history WHERE rate_date <= :d ORDER BY rate_date DESC LIMIT 1"),
            {"d": d_str}
        ).fetchone()
        if not bcv_row:
            bcv_row = db.execute(text("SELECT rate FROM bcv_rate_history ORDER BY rate_date DESC LIMIT 1")).fetchone()
        if bcv_row and bcv_row[0] and float(bcv_row[0]) > 0:
            rate = float(bcv_row[0])
            r.exchange_rate = rate
            db.commit()
    if rate <= 0:
        rate = 800.0

    total_usd = float(r.amount_usd or 0.0)
    base_usd = float(r.taxable_base_usd or 0.0)
    if base_usd <= 0 and total_usd > 0:
        base_usd = round(total_usd / 1.16, 2)
    tax_usd = float(r.tax_amount_usd or 0.0)
    if tax_usd <= 0 and total_usd > 0:
        tax_usd = round(total_usd - base_usd, 2)

    base_bs = round(base_usd * rate, 2)
    total_bs = round(total_usd * rate, 2)
    tax_bs = round(total_bs - base_bs, 2)

    proj = r.project
    client = r.client

    # Intentar obtener renglones detallados de la cotización asociada si y sólo si
    # los renglones corresponden fielmente al monto de esta factura (coherencia fiscal)
    items = []
    if proj:
        from app.models.models import Quotation, QuotationItem
        quote = None
        if proj.scope_of_work:
            m_cot = re.search(r'COT-\d{4}-\d+', proj.scope_of_work)
            if m_cot:
                quote = db.query(Quotation).filter(Quotation.quote_number == m_cot.group(0)).first()
        if not quote:
            quote = db.query(Quotation).filter(Quotation.client_id == proj.client_id, Quotation.project_title == proj.name).first()

        if quote:
            q_items = db.query(QuotationItem).filter(QuotationItem.quotation_id == quote.id).all()
            q_sum_usd = sum(float(qi.total_usd or (float(qi.quantity or 1.0) * float(qi.unit_price_usd or 0.0))) for qi in q_items)
            # Solo usar los renglones si coinciden matemáticamente con la base imponible de la factura
            if abs(q_sum_usd - base_usd) <= 0.05:
                for qi in q_items:
                    qi_qty = float(qi.quantity or 1.0)
                    qi_p_usd = float(qi.unit_price_usd or 0.0)
                    qi_tot_usd = float(qi.total_usd or (qi_qty * qi_p_usd))
                    items.append({
                        "description": (qi.description or qi.item_code or "Servicio").upper(),
                        "quantity": qi_qty,
                        "unit_price_usd": qi_p_usd,
                        "total_usd": qi_tot_usd,
                        "unit_price_bs": round(qi_p_usd * rate, 2),
                        "total_bs": round(qi_tot_usd * rate, 2)
                    })
                # Ajustar diferencia de céntimos por redondeo en el último renglón para cuadre exacto con base_bs
                items_bs_sum = sum(it["total_bs"] for it in items)
                diff = round(base_bs - items_bs_sum, 2)
                if abs(diff) > 0 and len(items) > 0:
                    items[-1]["total_bs"] = round(items[-1]["total_bs"] + diff, 2)
                    if items[-1]["quantity"] == 1:
                        items[-1]["unit_price_bs"] = items[-1]["total_bs"]

    # Si no hay renglones de cotización coincidentes, el renglón fiscal es la descripción real de la CxC
    if not items:
        raw_desc = (r.description or "").strip()
        if not raw_desc:
            raw_desc = proj.name if proj else "SERVICIO METALMECÁNICO Y MANUFACTURA INDUSTRIAL"

        desc_lines = [l.strip() for l in raw_desc.split(";") if l.strip()]
        if len(desc_lines) > 1:
            split_base_usd = round(base_usd / len(desc_lines), 2)
            accum_bs = 0.0
            for idx, l in enumerate(desc_lines):
                if idx == len(desc_lines) - 1:
                    p_usd = round(base_usd - split_base_usd * (len(desc_lines) - 1), 2)
                    p_bs = round(base_bs - accum_bs, 2)
                else:
                    p_usd = split_base_usd
                    p_bs = round(p_usd * rate, 2)
                    accum_bs += p_bs
                items.append({
                    "description": l.upper(),
                    "quantity": 1.0,
                    "unit_price_usd": p_usd,
                    "total_usd": p_usd,
                    "unit_price_bs": p_bs,
                    "total_bs": p_bs
                })
        else:
            items.append({
                "description": raw_desc.upper(),
                "quantity": 1.0,
                "unit_price_usd": base_usd,
                "total_usd": base_usd,
                "unit_price_bs": base_bs,
                "total_bs": base_bs
            })

    ot_code = proj.code if proj else "MD26012"
    if ot_code and ot_code.startswith("PRJ-"):
        m_ot = re.search(r'PRJ-(\d{4})-(\d+)', ot_code)
        if m_ot:
            ot_code = f"MD{m_ot.group(1)[2:]}{int(m_ot.group(2)):03d}"

    # Lógica de asignación oficial de número de factura fiscal:
    # 1. Si la CxC ya tiene fiscal_invoice_number asignado, se usa
    # 2. Si invoice_number no es un código operativo no fiscal (ej: no empieza por ALQ-, VAL-, NE-, REC-), se usa
    # 3. Si es un cobro operativo/alquiler, se calcula el siguiente número de factura SENIAT oficial (ej: 0948)
    raw_inv = (getattr(r, "fiscal_invoice_number", None) or r.invoice_number or "").strip()
    is_operational = any(raw_inv.upper().startswith(p) for p in ["ALQ-", "VAL-", "NE-", "REC-", "PRJ-", "NDE-", "N/A"])
    
    if getattr(r, "fiscal_invoice_number", None) and r.fiscal_invoice_number.strip():
        inv_display = r.fiscal_invoice_number.strip()
    elif not is_operational and raw_inv:
        inv_display = raw_inv.replace("FAC-", "").strip()
    else:
        inv_display = compute_next_invoice_code(db, r.issue_date.year, "FAC")

    # Fijar el fiscal_invoice_number en el registro si no estaba establecido
    if not getattr(r, "fiscal_invoice_number", None) and inv_display:
        r.fiscal_invoice_number = inv_display
        db.commit()

    ctrl_display = r.control_number or compute_next_control_number(db)
    if not r.control_number and ctrl_display:
        r.control_number = ctrl_display
        db.commit()

    return {
        "id": r.id,
        "invoice_number": inv_display,
        "operational_code": r.invoice_number or "",
        "control_number": ctrl_display,
        "issue_date": r.issue_date.strftime("%d/%m/%Y") if r.issue_date else "",
        "issue_date_iso": r.issue_date.strftime("%Y-%m-%d") if r.issue_date else "",
        "city_date_formatted": f"En Guacara {r.issue_date.strftime('%d/%m/%Y')}" if r.issue_date else "En Guacara",
        "client": {
            "name": client.name if client else "CLIENTE GENERAL",
            "rif": client.rif if client else "J-00000000-0",
            "fiscal_address": getattr(client, "fiscal_address", None) or getattr(client, "address", None) or "ZONA INDUSTRIAL, GUACARA EDO. CARABOBO",
            "phones": getattr(client, "phone", None) or getattr(client, "contact_phone", None) or "0412-240.70.79"
        },
        "payment_conditions": "CONTADO",
        "delivery_note": r.invoice_number if is_operational else "N/A",
        "ot_number": ot_code,
        "service_order": f"{r.id:08d}",
        "items": items,
        "exchange_rate": rate,
        "taxable_base_usd": base_usd,
        "tax_amount_usd": tax_usd,
        "total_usd": total_usd,
        "taxable_base_bs": base_bs,
        "tax_amount_bs": tax_bs,
        "total_bs": total_bs,
        "coletilla_art25": f"A los solos efectos de lo previsto en el Art. 25 de la Ley de Impuesto al Valor Agregado, se expresan los montos de la factura en Bs. calculados a la tasa de cambio establecida por el BCV de 1 US$ por Bs {f'{rate:,.2f}'.replace(',', 'X').replace('.', ',').replace('X', '.')}"
    }

@router.post("/cxc/{receivable_id}/payment", dependencies=[Depends(require_roles(["director_general", "director", "administracion", "administrador_financiero", "tesoreria"]))])
def record_cxc_payment(receivable_id: int, p_in: PaymentCreate, db: Session = Depends(get_db)):
    r = db.query(AccountReceivable).filter(AccountReceivable.id == receivable_id).with_for_update().first()
    if not r:
        raise HTTPException(status_code=404, detail="Factura no encontrada.")

    if r.balance_usd <= 0.001:
        raise HTTPException(status_code=400, detail="Esta factura ya se encuentra totalmente cobrada (saldo $0.00). No es posible registrar abonos adicionales.")

    if p_in.amount_usd <= 0:
        raise HTTPException(status_code=400, detail="El monto del cobro debe ser mayor a cero.")

    if p_in.amount_usd > (r.balance_usd + 0.05):
        raise HTTPException(status_code=400, detail=f"El cobro (${p_in.amount_usd}) supera el saldo pendiente (${r.balance_usd}).")

    # 🛡️ Idempotencia Transaccional: Rechazar duplicación de la misma referencia
    ref_clean = (p_in.reference_number or p_in.voucher_number or "").strip()
    if ref_clean:
        existing_pay = db.query(FinancialPayment).filter(
            FinancialPayment.receivable_id == receivable_id,
            (FinancialPayment.reference_number == ref_clean) | (FinancialPayment.voucher_number == ref_clean)
        ).first()
        if existing_pay:
            raise HTTPException(
                status_code=409,
                detail=f"Operación duplicada: El cobro con referencia '{ref_clean}' ya fue procesado para esta factura (Pago #{existing_pay.id} por ${existing_pay.amount_usd:.2f})."
            )

    # Buscar tasa BCV oficial
    rate = float(p_in.exchange_rate or r.exchange_rate or 0.0)
    if rate <= 0 or rate == 800.0:
        d_str = datetime.utcnow().strftime("%Y-%m-%d")
        bcv_row = db.execute(
            text("SELECT rate FROM bcv_rate_history WHERE rate_date <= :d ORDER BY rate_date DESC LIMIT 1"),
            {"d": d_str}
        ).fetchone()
        if not bcv_row:
            bcv_row = db.execute(text("SELECT rate FROM bcv_rate_history ORDER BY rate_date DESC LIMIT 1")).fetchone()
        if bcv_row and bcv_row[0] and float(bcv_row[0]) > 0:
            rate = float(bcv_row[0])
    if rate <= 0:
        rate = 800.0

    current_year = datetime.utcnow().year
    emitted_inv_id = r.id
    emitted_inv_code = r.fiscal_invoice_number or r.invoice_number

    # CASO: El usuario solicita emitir una Factura Fiscal oficial por este cobro específico
    if p_in.emit_fiscal_invoice:
        is_partial_split = p_in.amount_usd < (r.amount_usd - 0.05)
        
        if is_partial_split:
            # Facturación fraccionada: Crear un nuevo registro fiscal independiente por el monto exacto cobrado
            next_inv = compute_next_invoice_code(db, current_year, "FAC")
            next_ctrl = compute_next_control_number(db)
            
            base_usd = round(p_in.amount_usd / 1.16, 2)
            tax_usd = round(p_in.amount_usd - base_usd, 2)
            
            clean_concept = (p_in.custom_concept or "").strip()
            if not clean_concept:
                p_code = r.project.code if r.project else "GEN"
                clean_concept = f"VALUACIÓN / ABONO FACTURADO - [{p_code}] {r.description}"

            child_r = AccountReceivable(
                invoice_number=next_inv,
                fiscal_invoice_number=next_inv,
                control_number=next_ctrl,
                client_id=r.client_id,
                project_id=r.project_id,
                description=clean_concept,
                issue_date=datetime.utcnow(),
                due_date=r.due_date or datetime.utcnow(),
                taxable_base_usd=base_usd,
                tax_amount_usd=tax_usd,
                tax_withholding_rate=75.0,
                tax_withholding_usd=0.0,
                islr_rate=2.0,
                islr_withholding_usd=0.0,
                net_amount_usd=p_in.amount_usd,
                amount_usd=p_in.amount_usd,
                amount_bs=round(p_in.amount_usd * rate, 2),
                exchange_rate=rate,
                tax_retained_usd=0.0,
                paid_amount_usd=p_in.amount_usd,
                balance_usd=0.0,
                status="cobrado_total",
                notes=f"Emitida automáticamente desde Cobro por ${p_in.amount_usd:.2f} sobre cuenta origen #{r.id} ({r.invoice_number})"
            )
            db.add(child_r)
            db.flush()

            # Avanzar contadores en CompanyProfile
            profile = db.query(CompanyProfile).first()
            if profile:
                m_inv = re.findall(r'\d+', next_inv)
                if m_inv and profile.next_invoice_number and int(m_inv[-1]) >= profile.next_invoice_number:
                    profile.next_invoice_number = int(m_inv[-1]) + 1
                if next_ctrl:
                    m_ctrl = re.findall(r'\d+', next_ctrl)
                    if m_ctrl and profile.next_control_number and int(m_ctrl[-1]) >= profile.next_control_number:
                        profile.next_control_number = int(m_ctrl[-1]) + 1

            # Registrar el pago contra la nueva factura emitida
            payment = FinancialPayment(
                payment_type=p_in.payment_type or "cxc_cobro",
                receivable_id=child_r.id,
                amount_usd=p_in.amount_usd,
                amount_bs=round(p_in.amount_usd * rate, 2),
                exchange_rate=rate,
                payment_method=p_in.payment_method,
                voucher_number=p_in.voucher_number or p_in.reference_number,
                reference_number=p_in.reference_number,
                notes=p_in.notes
            )
            db.add(payment)

            # Reducir la cuenta origen (padre) para que mantenga el saldo real pendiente
            r.amount_usd = max(0.0, round(r.amount_usd - p_in.amount_usd, 2))
            r.balance_usd = max(0.0, round(r.balance_usd - p_in.amount_usd, 2))
            r.taxable_base_usd = round(r.amount_usd / 1.16, 2)
            r.tax_amount_usd = round(r.amount_usd - r.taxable_base_usd, 2)
            r.amount_bs = round(r.amount_usd * rate, 2)
            if r.balance_usd <= 0.01:
                r.status = "cobrado_total"

            emitted_inv_id = child_r.id
            emitted_inv_code = next_inv

        else:
            # Es el cobro del saldo restante o monto total: asegurar correlativo fiscal oficial
            if not getattr(r, "fiscal_invoice_number", None) or not r.fiscal_invoice_number.strip():
                next_inv = compute_next_invoice_code(db, current_year, "FAC")
                r.fiscal_invoice_number = next_inv
                r.control_number = r.control_number or compute_next_control_number(db)
                profile = db.query(CompanyProfile).first()
                if profile:
                    m_inv = re.findall(r'\d+', next_inv)
                    if m_inv and profile.next_invoice_number and int(m_inv[-1]) >= profile.next_invoice_number:
                        profile.next_invoice_number = int(m_inv[-1]) + 1
                    if r.control_number:
                        m_ctrl = re.findall(r'\d+', r.control_number)
                        if m_ctrl and profile.next_control_number and int(m_ctrl[-1]) >= profile.next_control_number:
                            profile.next_control_number = int(m_ctrl[-1]) + 1

            payment = FinancialPayment(
                payment_type=p_in.payment_type or "cxc_cobro",
                receivable_id=r.id,
                amount_usd=p_in.amount_usd,
                amount_bs=round(p_in.amount_usd * rate, 2),
                exchange_rate=rate,
                payment_method=p_in.payment_method,
                voucher_number=p_in.voucher_number or p_in.reference_number,
                reference_number=p_in.reference_number,
                notes=p_in.notes
            )
            db.add(payment)

            r.paid_amount_usd += p_in.amount_usd
            r.balance_usd = max(0.0, round(r.balance_usd - p_in.amount_usd, 2))
            if r.balance_usd <= 0.01:
                r.status = "cobrado_total"
            else:
                r.status = "abono_parcial"

            emitted_inv_id = r.id
            emitted_inv_code = r.fiscal_invoice_number

    else:
        # Flujo estándar de cobro sin emitir nueva factura fiscal (abono tradicional)
        payment = FinancialPayment(
            payment_type=p_in.payment_type or "cxc_cobro",
            receivable_id=r.id,
            amount_usd=p_in.amount_usd,
            amount_bs=round(p_in.amount_usd * rate, 2),
            exchange_rate=rate,
            payment_method=p_in.payment_method,
            voucher_number=p_in.voucher_number or p_in.reference_number,
            reference_number=p_in.reference_number,
            notes=p_in.notes
        )
        db.add(payment)

        r.paid_amount_usd += p_in.amount_usd
        r.balance_usd = max(0.0, round(r.balance_usd - p_in.amount_usd, 2))
        if r.balance_usd <= 0.01:
            r.status = "cobrado_total"
        else:
            r.status = "abono_parcial"

    db.commit()
    return {
        "success": True,
        "message": f"Cobro aplicado exitosamente ({f'Factura Fiscal {emitted_inv_code} emitida' if p_in.emit_fiscal_invoice else 'Saldo restante: $' + str(r.balance_usd)}).",
        "new_balance_usd": r.balance_usd,
        "status": r.status,
        "emitted_invoice_id": emitted_inv_id if p_in.emit_fiscal_invoice else None,
        "invoice_number": emitted_inv_code
    }

@router.post("/cxc/{receivable_id}/refund", dependencies=[Depends(require_roles(["director_general", "director", "administrador_financiero"]))])
def process_client_refund(receivable_id: int, r_in: ClientRefundCreate, db: Session = Depends(get_db)):
    r = db.query(AccountReceivable).filter(AccountReceivable.id == receivable_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Factura o cuenta por cobrar no encontrada.")
    
    # Validación estricta: Solo se puede reembolsar si el cliente pagó de más
    surplus = round((r.paid_amount_usd or 0.0) - (r.amount_usd or 0.0), 2)
    if surplus <= 0.01:
        raise HTTPException(
            status_code=400, 
            detail=f"No hay saldo a favor disponible para reembolso. Monto facturado: ${r.amount_usd:,.2f}, Total cancelado: ${r.paid_amount_usd:,.2f}."
        )
    
    if r_in.amount_usd <= 0.0:
        raise HTTPException(status_code=400, detail="El monto a reembolsar debe ser mayor a cero.")
    
    if r_in.amount_usd > (surplus + 0.01):
        raise HTTPException(
            status_code=400,
            detail=f"El monto a reembolsar (${r_in.amount_usd:,.2f}) supera el saldo a favor disponible (${surplus:,.2f})."
        )
    
    ref_num = (r_in.reference_number or f"REFUND-{int(datetime.utcnow().timestamp())}").strip()
    rate = r_in.exchange_rate or 850.0
    
    payment = FinancialPayment(
        payment_type="reembolso_cliente",
        receivable_id=r.id,
        amount_usd=r_in.amount_usd,
        amount_bs=round(r_in.amount_usd * rate, 2),
        exchange_rate=rate,
        payment_method=r_in.payment_method or "transferencia",
        voucher_number=ref_num,
        reference_number=ref_num,
        notes=f"[REEMBOLSO SALDO A FAVOR] {r_in.notes or ''}".strip()
    )
    db.add(payment)
    
    # Reducir paid_amount_usd para extinguir el excedente reembolsado
    r.paid_amount_usd = max(r.amount_usd, round(r.paid_amount_usd - r_in.amount_usd, 2))
    r.notes = (r.notes or "") + f" | Reembolso de ${r_in.amount_usd:,.2f} USD procesado (Ref: {ref_num})."
    
    audit = AuditLog(
        username="Finanzas",
        module="Finanzas / CxC",
        action="Emitir Reembolso de Saldo a Favor",
        details=f"Reembolso de ${r_in.amount_usd:,.2f} USD emitido para factura {r.invoice_number} ({r.client.name if r.client else 'Cliente'}). Ref: {ref_num}."
    )
    db.add(audit)
    db.commit()
    
    return {
        "success": True,
        "message": f"Reembolso de ${r_in.amount_usd:,.2f} USD emitido exitosamente.",
        "receipt_number": ref_num,
        "remaining_surplus": max(0.0, round(surplus - r_in.amount_usd, 2))
    }

@router.post("/cxc/{receivable_id}/declare-bad-debt")
def declare_cxc_bad_debt(receivable_id: int, req: BadDebtRequest, db: Session = Depends(get_db)):
    r = db.query(AccountReceivable).filter(AccountReceivable.id == receivable_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Factura no encontrada.")
    if r.status in ["cobrado_total", "cobrado"]:
        raise HTTPException(status_code=400, detail="No se puede castigar una factura ya cobrada en su totalidad.")

    amount_written_off = r.balance_usd
    r.is_bad_debt = True
    r.bad_debt_amount_usd = amount_written_off
    r.bad_debt_reason = req.reason.strip()
    r.bad_debt_date = datetime.utcnow()
    r.balance_usd = 0.0
    r.status = "incobrable"

    audit = AuditLog(
        username="Finanzas",
        module="Finanzas / CxC",
        action="Declarar Cartera Incobrable",
        details=f"Factura {r.invoice_number} ({r.client.name if r.client else 'Cliente'}) castigada por ${amount_written_off:,.2f} USD. Motivo: {req.reason}. Notas: {req.notes or 'N/A'}"
    )
    db.add(audit)
    db.commit()
    return {
        "success": True,
        "message": f"Factura {r.invoice_number} declarada incobrable por ${amount_written_off:,.2f} USD.",
        "amount_written_off": amount_written_off
    }

# ------------------------------------------------------------------------------
# 3.1 BITÁCORA Y TRAZABILIDAD DE COBRANZA (CxC TIMELINE & SEGUIMIENTO)
# ------------------------------------------------------------------------------

@router.get("/cxc/{receivable_id}/timeline")
def get_cxc_timeline(receivable_id: int, db: Session = Depends(get_db)):
    r = db.query(AccountReceivable).options(joinedload(AccountReceivable.client), joinedload(AccountReceivable.project)).filter(AccountReceivable.id == receivable_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Factura CxC no encontrada.")

    payments = db.query(FinancialPayment).filter(FinancialPayment.receivable_id == receivable_id).order_by(FinancialPayment.payment_date.desc()).all()
    follow_ups = db.query(ReceivableFollowUpLog).filter(ReceivableFollowUpLog.receivable_id == receivable_id).order_by(ReceivableFollowUpLog.created_at.desc()).all()

    events = []
    
    def _clean_dt(dt):
        if not dt:
            return None
        if hasattr(dt, 'strftime'):
            return dt.strftime("%Y-%m-%d %H:%M")
        return str(dt)

    def _iso_sort(dt):
        if not dt:
            return ""
        if hasattr(dt, 'isoformat'):
            return dt.isoformat()
        return str(dt)

    inv_dt = r.issue_date or r.created_at
    events.append({
        "type": "factura_emitida",
        "date": _clean_dt(inv_dt),
        "raw_date": _iso_sort(inv_dt),
        "title": f"Factura Emitida: {r.invoice_number}",
        "subtitle": f"Monto Bruto: ${r.amount_usd:,.2f} USD | Vence: {r.due_date.strftime('%Y-%m-%d') if r.due_date else 'S/F'}",
        "details": r.description or "Factura registrada en el sistema.",
        "amount_usd": r.amount_usd,
        "user": "Facturación DALOR",
        "badge_color": "blue"
    })

    for p in payments:
        p_dt = p.payment_date or p.created_at
        events.append({
            "type": "abono_pago",
            "date": _clean_dt(p_dt),
            "raw_date": _iso_sort(p_dt),
            "title": f"Abono / Pago Recibido: ${p.amount_usd:,.2f} USD",
            "subtitle": f"Ref: {p.reference_number or p.voucher_number or 'S/R'} | Método: {(p.payment_method or 'Transferencia').upper()}",
            "details": f"Monto en Bs: Bs. {p.amount_bs:,.2f} (Tasa: {p.exchange_rate:.2f}) | {p.notes or ''}",
            "amount_usd": p.amount_usd,
            "user": "Cobranzas",
            "badge_color": "green"
        })

    for f in follow_ups:
        prom_str = f" | Promesa: {f.promised_payment_date.strftime('%Y-%m-%d')} (${f.promised_amount_usd:,.2f} USD)" if f.promised_payment_date else ""
        events.append({
            "type": "gestion_cobranza",
            "date": _clean_dt(f.created_at),
            "raw_date": _iso_sort(f.created_at),
            "title": f"Gestión: {f.contact_channel}",
            "subtitle": f"Contacto: {f.contact_person or 'Sin especificar'}{prom_str}",
            "details": f.notes,
            "amount_usd": f.promised_amount_usd or 0.0,
            "user": f.recorded_by,
            "badge_color": "purple",
            "evidence_image_path": f.evidence_image_path
        })

    if r.is_bad_debt:
        events.append({
            "type": "incobrable",
            "date": _clean_dt(r.bad_debt_date),
            "raw_date": _iso_sort(r.bad_debt_date),
            "title": f"Cartera Castigada / Incobrable: ${r.bad_debt_amount_usd:,.2f} USD",
            "subtitle": f"Motivo: {r.bad_debt_reason or 'No especificado'}",
            "details": "Factura declarada incobrable por la gerencia.",
            "amount_usd": r.bad_debt_amount_usd,
            "user": "Dirección",
            "badge_color": "red"
        })

    events.sort(key=lambda x: str(x.get("raw_date") or x.get("date") or ""), reverse=True)

    return {
        "receivable": {
            "id": r.id,
            "invoice_number": r.invoice_number,
            "client_id": r.client_id,
            "client_name": r.client.name if r.client else "Cliente",
            "client_rif": r.client.rif if r.client else "",
            "client_phone": r.client.contact_phone if r.client else "",
            "client_email": r.client.contact_email if r.client else "",
            "project_id": r.project_id,
            "project_code": r.project.code if r.project else "General",
            "description": r.description,
            "amount_usd": r.amount_usd,
            "paid_amount_usd": r.paid_amount_usd,
            "balance_usd": r.balance_usd,
            "status": r.status,
            "issue_date": r.issue_date.strftime('%Y-%m-%d') if r.issue_date else "",
            "due_date": r.due_date.strftime('%Y-%m-%d') if r.due_date else "",
            "is_bad_debt": r.is_bad_debt
        },
        "timeline": events
    }

@router.get("/cxc/client/{client_id}/timeline")
def get_client_cxc_timeline(client_id: int, db: Session = Depends(get_db)):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado.")

    receivables = db.query(AccountReceivable).options(joinedload(AccountReceivable.project)).filter(AccountReceivable.client_id == client_id).order_by(AccountReceivable.issue_date.desc()).all()
    rec_ids = [r.id for r in receivables]

    payments = []
    if rec_ids:
        payments = db.query(FinancialPayment).filter(FinancialPayment.receivable_id.in_(rec_ids)).order_by(FinancialPayment.payment_date.desc()).all()

    follow_ups = db.query(ReceivableFollowUpLog).filter(ReceivableFollowUpLog.client_id == client_id).order_by(ReceivableFollowUpLog.created_at.desc()).all()

    total_billed = sum(r.amount_usd for r in receivables)
    total_paid = sum(r.paid_amount_usd for r in receivables)
    total_balance = sum(r.balance_usd for r in receivables)

    events = []
    def _clean_dt(dt):
        if not dt:
            return None
        if hasattr(dt, 'strftime'):
            return dt.strftime("%Y-%m-%d %H:%M")
        return str(dt)

    def _iso_sort(dt):
        if not dt:
            return ""
        if hasattr(dt, 'isoformat'):
            return dt.isoformat()
        return str(dt)

    for r in receivables:
        inv_dt = r.issue_date or r.created_at
        events.append({
            "type": "factura_emitida",
            "date": _clean_dt(inv_dt),
            "raw_date": _iso_sort(inv_dt),
            "title": f"Factura Emitida: {r.invoice_number}",
            "subtitle": f"Total: ${r.amount_usd:,.2f} USD | Saldo: ${r.balance_usd:,.2f} USD | Vence: {r.due_date.strftime('%Y-%m-%d') if r.due_date else 'S/F'}",
            "details": r.description or "Factura registrada",
            "amount_usd": r.amount_usd,
            "user": "Facturación DALOR",
            "badge_color": "blue",
            "receivable_id": r.id,
            "invoice_number": r.invoice_number
        })

    for p in payments:
        p_dt = p.payment_date or p.created_at
        events.append({
            "type": "abono_pago",
            "date": _clean_dt(p_dt),
            "raw_date": _iso_sort(p_dt),
            "title": f"Abono / Pago Recibido: ${p.amount_usd:,.2f} USD",
            "subtitle": f"Ref: {p.reference_number or p.voucher_number or 'S/R'} | Factura #{p.receivable_id}",
            "details": f"Bs. {p.amount_bs:,.2f} (Tasa: {p.exchange_rate:.2f}) | {p.notes or ''}",
            "amount_usd": p.amount_usd,
            "user": "Cobranzas",
            "badge_color": "green",
            "receivable_id": p.receivable_id
        })

    for f in follow_ups:
        prom_str = f" | Promesa: {f.promised_payment_date.strftime('%Y-%m-%d')} (${f.promised_amount_usd:,.2f} USD)" if f.promised_payment_date else ""
        inv_str = f" (Factura #{f.receivable_id})" if f.receivable_id else " (Gestión General Cliente)"
        events.append({
            "type": "gestion_cobranza",
            "date": _clean_dt(f.created_at),
            "raw_date": _iso_sort(f.created_at),
            "title": f"Gestión: {f.contact_channel}{inv_str}",
            "subtitle": f"Contacto: {f.contact_person or 'Sin especificar'}{prom_str}",
            "details": f.notes,
            "amount_usd": f.promised_amount_usd or 0.0,
            "user": f.recorded_by,
            "badge_color": "purple",
            "receivable_id": f.receivable_id,
            "evidence_image_path": f.evidence_image_path
        })

    events.sort(key=lambda x: str(x.get("raw_date") or x.get("date") or ""), reverse=True)

    return {
        "client": {
            "id": client.id,
            "name": client.name,
            "rif": client.rif,
            "contact_name": client.contact_name,
            "contact_phone": client.contact_phone,
            "contact_email": client.contact_email,
            "address": client.address,
            "total_invoiced_usd": round(total_billed, 2),
            "total_paid_usd": round(total_paid, 2),
            "total_balance_usd": round(total_balance, 2)
        },
        "invoices": [
            {
                "id": r.id,
                "invoice_number": r.invoice_number,
                "description": r.description,
                "amount_usd": r.amount_usd,
                "balance_usd": r.balance_usd,
                "status": r.status,
                "due_date": r.due_date.strftime('%Y-%m-%d') if r.due_date else ""
            } for r in receivables
        ],
        "timeline": events
    }

@router.post("/cxc/upload-evidence")
async def upload_cxc_evidence(
    file: UploadFile = File(...),
    current_user: UserModel = Depends(get_current_user)
):
    """
    Sube soporte digital o evidencia fotográfica (comprobante, captura WhatsApp, compromiso firmado)
    directamente al almacenamiento Cloudflare R2 para la bitácora de cobranza.
    """
    try:
        contents = await file.read()
        ext = file.filename.split(".")[-1] if file.filename and "." in file.filename else "jpg"
        unique_name = f"cxc_evidence_{uuid.uuid4().hex[:10]}.{ext}"
        
        image_url, _ = R2StorageService.upload_receipt_image(contents, unique_name)
        return {
            "success": True,
            "message": "Evidencia respaldada exitosamente en Cloudflare R2.",
            "evidence_url": image_url
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error subiendo evidencia a R2: {str(e)}")

@router.post("/cxc/{receivable_id}/log")
def create_cxc_follow_up_log(
    receivable_id: int, 
    log_in: ReceivableFollowUpLogCreate, 
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    r = db.query(AccountReceivable).filter(AccountReceivable.id == receivable_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Factura no encontrada.")

    prom_date = None
    if log_in.promised_payment_date:
        try:
            prom_date = datetime.strptime(log_in.promised_payment_date.split("T")[0], "%Y-%m-%d")
        except Exception:
            prom_date = None

    author_name = current_user.full_name or current_user.username if current_user else "Administración"

    entry = ReceivableFollowUpLog(
        receivable_id=r.id,
        client_id=r.client_id,
        contact_channel=log_in.contact_channel or "Llamada Telefónica",
        contact_person=log_in.contact_person,
        promised_payment_date=prom_date,
        promised_amount_usd=log_in.promised_amount_usd or 0.0,
        notes=log_in.notes,
        evidence_image_path=log_in.evidence_image_path,
        recorded_by=author_name
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)

    return {"success": True, "message": "Gestión registrada en la bitácora de cobranza.", "log_id": entry.id}

@router.post("/cxc/client/{client_id}/log")
def create_client_cxc_follow_up_log(
    client_id: int, 
    log_in: ReceivableFollowUpLogCreate, 
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    c = db.query(Client).filter(Client.id == client_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Cliente no encontrado.")

    prom_date = None
    if log_in.promised_payment_date:
        try:
            prom_date = datetime.strptime(log_in.promised_payment_date.split("T")[0], "%Y-%m-%d")
        except Exception:
            prom_date = None

    author_name = current_user.full_name or current_user.username if current_user else "Administración"

    entry = ReceivableFollowUpLog(
        receivable_id=log_in.receivable_id,
        client_id=c.id,
        contact_channel=log_in.contact_channel or "Llamada Telefónica",
        contact_person=log_in.contact_person,
        promised_payment_date=prom_date,
        promised_amount_usd=log_in.promised_amount_usd or 0.0,
        notes=log_in.notes,
        evidence_image_path=log_in.evidence_image_path,
        recorded_by=author_name
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)

    return {"success": True, "message": "Gestión registrada en la bitácora del cliente.", "log_id": entry.id}


@router.delete("/cxc/{cxc_id}", dependencies=[Depends(require_roles(["director_general", "director"]))])
def delete_receivable(cxc_id: int, db: Session = Depends(get_db)):
    rec = db.query(AccountReceivable).filter(AccountReceivable.id == cxc_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Cuenta por cobrar no encontrada.")
    # Eliminar pagos asociados primero si existen
    db.query(FinancialPayment).filter(
        (FinancialPayment.receivable_id == cxc_id) | 
        ((FinancialPayment.payment_type == "cxc_cobro") & (FinancialPayment.reference_number == rec.invoice_number))
    ).delete(synchronize_session=False)
    
    db.delete(rec)
    db.commit()
    return {"success": True, "message": f"Cuenta por cobrar [{rec.invoice_number}] eliminada con éxito."}

@router.post("/cxc/{receivable_id}/write-off")
def write_off_bad_debt(receivable_id: int, w_in: BadDebtWriteOff, db: Session = Depends(get_db)):
    try:
        rec = db.query(AccountReceivable).filter(AccountReceivable.id == receivable_id).first()
        if not rec:
            raise HTTPException(status_code=404, detail="Cuenta por cobrar no encontrada.")

        if rec.balance_usd <= 0:
            raise HTTPException(status_code=400, detail="Esta cuenta no tiene saldo pendiente por castigar.")

        castigo_amount = rec.balance_usd
        rec.is_bad_debt = True
        rec.bad_debt_amount_usd = castigo_amount
        rec.bad_debt_reason = w_in.reason.strip()
        rec.bad_debt_date = datetime.utcnow()
        rec.status = "incobrable"
        rec.balance_usd = 0.0
        if w_in.notes:
            rec.notes = (rec.notes or "") + f"\n[Castigo Cartera: {w_in.reason} - {w_in.notes}]"

        # Si está vinculada a un proyecto, registrar auditoría
        audit = AuditLog(
            username="administracion",
            module="finanzas_cxc",
            action="castigo_cartera_incobrable",
            details=f"Castigo de cartera por ${castigo_amount:.2f} en factura [{rec.invoice_number}] de '{rec.client.name if rec.client else 'General'}'. Motivo: {w_in.reason}"
        )
        db.add(audit)
        db.commit()

        return {
            "success": True,
            "invoice_number": rec.invoice_number,
            "bad_debt_amount_usd": castigo_amount,
            "message": f"Factura [{rec.invoice_number}] declarada Incobrable por ${castigo_amount:.2f}. Saldo vivo retirado de tesorería."
        }
    except Exception as e:
        import traceback
        db.rollback()
        return {"error": str(e), "traceback": traceback.format_exc()}

