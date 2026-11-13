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
        contents = await read_and_validate_file(file)
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


