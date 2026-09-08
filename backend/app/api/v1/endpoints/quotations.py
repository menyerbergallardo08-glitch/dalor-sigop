from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from app.core.database import get_db
from app.models.models import Quotation, QuotationItem, Client, ServiceItem, Project
from app.schemas.schemas import QuotationCreate, QuotationOut

router = APIRouter()

@router.get("/", response_model=List[QuotationOut])
def get_quotations(db: Session = Depends(get_db)):
    return db.query(Quotation).order_by(Quotation.created_at.desc()).all()

@router.post("/", response_model=QuotationOut)
def create_quotation(quote_in: QuotationCreate, db: Session = Depends(get_db)):
    client = db.query(Client).filter(Client.id == quote_in.client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado.")

    # Generar correlativo si no viene
    count = db.query(Quotation).count() + 1
    quote_number = quote_in.quote_number or f"COT-2026-{count:04d}"

    # Calcular Subtotal de renglones
    subtotal = 0.0
    items_objs = []
    for it in quote_in.items:
        line_total = round(it.quantity * it.unit_price_usd, 2)
        subtotal += line_total
        items_objs.append(QuotationItem(
            service_id=it.service_id,
            item_code=it.item_code,
            description=it.description,
            unit_measure=it.unit_measure,
            quantity=it.quantity,
            unit_price_usd=it.unit_price_usd,
            total_usd=line_total
        ))

    tax_usd = round(subtotal * (quote_in.tax_percent / 100.0), 2)
    total_usd = round(subtotal + tax_usd, 2)

    new_quote = Quotation(
        quote_number=quote_number,
        client_id=quote_in.client_id,
        project_title=quote_in.project_title,
        location=quote_in.location,
        validity_days=quote_in.validity_days,
        exchange_rate=quote_in.exchange_rate,
        subtotal_usd=subtotal,
        tax_percent=quote_in.tax_percent,
        tax_usd=tax_usd,
        total_usd=total_usd,
        status="borrador",
        notes=quote_in.notes,
        items=items_objs
    )

    db.add(new_quote)
    db.commit()
    db.refresh(new_quote)
    return new_quote

@router.get("/{quotation_id}", response_model=QuotationOut)
def get_quotation_detail(quotation_id: int, db: Session = Depends(get_db)):
    quote = db.query(Quotation).filter(Quotation.id == quotation_id).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Cotización no encontrada.")
    return quote

@router.post("/{quotation_id}/convert-to-project")
@router.post("/{quotation_id}/approve")
def convert_quotation_to_project(quotation_id: int, db: Session = Depends(get_db)):
    quote = db.query(Quotation).filter(Quotation.id == quotation_id).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Cotización no encontrada.")

    # Generar código de proyecto correlativo
    proj_count = db.query(Project).count() + 1
    proj_code = f"PRJ-2026-{proj_count:03d}"

    # Estimar bolsas iniciales a partir del subtotal cotizado (65% costo base estimado, 35% margen)
    est_labor = round(quote.subtotal_usd * 0.30, 2)
    est_fuel = round(quote.subtotal_usd * 0.08, 2)
    est_materials = round(quote.subtotal_usd * 0.20, 2)
    est_tools = round(quote.subtotal_usd * 0.04, 2)
    est_services = round(quote.subtotal_usd * 0.03, 2)
    total_est = est_labor + est_fuel + est_materials + est_tools + est_services

    new_project = Project(
        code=proj_code,
        name=quote.project_title,
        client_id=quote.client_id,
        client_name=quote.client.name if quote.client else "Cliente",
        location=quote.location or "Sede Central",
        status="activo",
        duration_days=30,
        contract_amount_usd=quote.total_usd,
        estimated_labor_usd=est_labor,
        estimated_fuel_usd=est_fuel,
        estimated_materials_usd=est_materials,
        estimated_tools_usd=est_tools,
        estimated_services_usd=est_services,
        budget_limit_usd=total_est,
        is_active=True
    )

    quote.status = "aprobado"
    db.add(new_project)
    db.commit()
    db.refresh(new_project)

    return {
        "success": True,
        "message": f"Cotización {quote.quote_number} convertida exitosamente en el Proyecto Activo {proj_code}.",
        "project_id": new_project.id,
        "project_code": new_project.code,
        "project_name": new_project.name
    }
