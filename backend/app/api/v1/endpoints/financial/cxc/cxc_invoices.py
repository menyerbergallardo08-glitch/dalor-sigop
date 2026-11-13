"""
Submódulo especializado de Cuentas por Cobrar (CxC) - DALOR SIGO-P.
"""
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
import re
import uuid
from sqlalchemy.orm import Session, joinedload, selectinload
from sqlalchemy import func, text, desc, asc
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any

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
from app.api.deps import get_current_active_user, require_roles, get_current_user
from app.core.file_security import read_and_validate_file
from app.schemas.schemas import (
    ReceivableFollowUpLogCreate,
    ReceivableFollowUpLogOut
)
from .cxc_schemas import (
    ReceivableCreate,
    PaymentCreate,
    ClientRefundCreate,
    BadDebtRequest,
    BadDebtWriteOff,
    CorrelativeOverrideRequest,
    SplitPaymentItem,
    SplitPaymentRequest,
    ReceivableUpdate,
    ReceivableCancelIn,
    ControlNumberUpdate,
    FiscalCorrelativeUpdate
)

router = APIRouter(dependencies=[Depends(get_current_active_user)])

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

@router.post("/override-correlative", dependencies=[Depends(require_roles(["director_general", "director", "administrador_financiero"]))])
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


@router.put("/cxc/{receivable_id}/control-number", dependencies=[Depends(require_roles(["director_general", "director", "administracion", "administrador_financiero"]))])
def update_receivable_control_number(receivable_id: int, payload: ControlNumberUpdate, db: Session = Depends(get_db)):
    r = db.query(AccountReceivable).filter(AccountReceivable.id == receivable_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Factura CxC no encontrada.")
    r.control_number = payload.control_number.strip()
    db.commit()
    return {"success": True, "control_number": r.control_number}

@router.put("/cxc/{receivable_id}/fiscal-correlative", dependencies=[Depends(require_roles(["director_general", "director", "administrador_financiero"]))])
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


@router.put("/cxc/{receivable_id}", dependencies=[Depends(require_roles(["director_general", "director", "administracion", "administrador_financiero"]))])
def update_receivable(
    receivable_id: int,
    up_in: ReceivableUpdate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user)
):
    r = db.query(AccountReceivable).filter(AccountReceivable.id == receivable_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Factura no encontrada.")

    if up_in.invoice_number is not None and up_in.invoice_number.strip():
        exist = db.query(AccountReceivable).filter(
            AccountReceivable.invoice_number == up_in.invoice_number.strip(),
            AccountReceivable.id != r.id
        ).first()
        if exist:
            raise HTTPException(status_code=400, detail=f"El número de factura '{up_in.invoice_number}' ya está registrado.")
        r.invoice_number = up_in.invoice_number.strip()

    if up_in.fiscal_invoice_number is not None:
        r.fiscal_invoice_number = up_in.fiscal_invoice_number.strip() or None
    if up_in.control_number is not None:
        r.control_number = up_in.control_number.strip() or None
    if up_in.description is not None:
        r.description = up_in.description.strip()
    if up_in.due_date is not None:
        r.due_date = up_in.due_date
    if up_in.issue_date is not None:
        r.issue_date = up_in.issue_date
    if up_in.notes is not None:
        r.notes = up_in.notes.strip()

    if up_in.amount_usd is not None and up_in.amount_usd > 0:
        new_amount = float(up_in.amount_usd)
        paid = float(r.paid_amount_usd or 0.0)
        if new_amount < paid:
            raise HTTPException(status_code=400, detail=f"El nuevo monto (${new_amount:.2f}) no puede ser menor a lo ya cobrado (${paid:.2f}). Reversa los cobros primero.")
        r.amount_usd = new_amount
        r.balance_usd = max(0.0, round(new_amount - paid, 2))
        if up_in.taxable_base_usd is not None:
            r.taxable_base_usd = float(up_in.taxable_base_usd)
        if up_in.tax_amount_usd is not None:
            r.tax_amount_usd = float(up_in.tax_amount_usd)
        if r.balance_usd <= 0.001 and paid > 0:
            r.status = "al_dia"
        elif paid > 0:
            r.status = "abono_parcial"
        else:
            r.status = "pendiente"

    audit = AuditLog(
        username=current_user.username,
        module="finanzas_cxc",
        action="modificar_factura_cxc",
        details=f"Factura [{r.invoice_number}] modificada por {current_user.username}. Monto: ${r.amount_usd:.2f}, Saldo: ${r.balance_usd:.2f}"
    )
    db.add(audit)
    db.commit()
    db.refresh(r)

    return {
        "success": True,
        "message": f"Factura [{r.invoice_number}] actualizada exitosamente.",
        "id": r.id,
        "invoice_number": r.invoice_number,
        "control_number": r.control_number,
        "description": r.description,
        "amount_usd": r.amount_usd,
        "balance_usd": r.balance_usd,
        "status": r.status
    }


# ==============================================================================
# ANULACIÓN FORMAL DE FACTURA
# ==============================================================================
@router.post("/cxc/{receivable_id}/cancel", dependencies=[Depends(require_roles(["director_general", "director", "administrador_financiero"]))])
def cancel_receivable(
    receivable_id: int,
    c_in: ReceivableCancelIn,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user)
):
    r = db.query(AccountReceivable).filter(AccountReceivable.id == receivable_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Factura no encontrada.")
    if r.status == "anulada":
        raise HTTPException(status_code=400, detail="Esta factura ya se encuentra anulada.")

    reason = c_in.cancellation_reason.strip()
    if not reason:
        raise HTTPException(status_code=400, detail="Debe indicar el motivo formal de anulación.")

    db.query(FinancialPayment).filter(FinancialPayment.receivable_id == r.id).delete(synchronize_session=False)

    r.status = "anulada"
    r.paid_amount_usd = 0.0
    r.balance_usd = 0.0
    r.notes = (r.notes or "") + f"\n[ANULADA el {datetime.utcnow().strftime('%Y-%m-%d %H:%M')} por {current_user.username}. Motivo: {reason}]"

    audit = AuditLog(
        username=current_user.username,
        module="finanzas_cxc",
        action="anular_factura_cxc",
        details=f"Factura [{r.invoice_number}] ANULADA formalmente por {current_user.username}. Motivo: {reason}"
    )
    db.add(audit)
    db.commit()
    db.refresh(r)

    return {
        "success": True,
        "message": f"Factura [{r.invoice_number}] anulada formalmente.",
        "invoice_number": r.invoice_number,
        "balance_usd": r.balance_usd,
        "status": "anulada"
    }

