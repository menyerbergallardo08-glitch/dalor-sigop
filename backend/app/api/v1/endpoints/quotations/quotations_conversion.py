"""
Conversion & approval logic: Quotation -> Active Project and Material Requisitions.
"""
from app.api.deps import get_current_active_user
from .quotations_common import (
    APIRouter, Depends, HTTPException, Session, datetime, re, Optional,
    get_db, Quotation, Project, Material, ProjectMaterialRequisition
)

router = APIRouter(dependencies=[Depends(get_current_active_user)])

@router.post("/{quotation_id}/convert-to-project")
@router.post("/{quotation_id}/approve")
def convert_quotation_to_project(quotation_id: int, db: Session = Depends(get_db)):
    quote = db.query(Quotation).filter(Quotation.id == quotation_id).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Cotización no encontrada.")

    # 🛡️ Idempotencia: Bloquear duplicación si la cotización ya fue aprobada
    if quote.status == "aprobado":
        existing_p = db.query(Project).filter(
            Project.client_id == quote.client_id,
            Project.name == quote.project_title
        ).first()
        if existing_p:
            return {
                "success": True,
                "message": f"Esta cotización ya fue aprobada previamente y está vinculada al Proyecto {existing_p.code}.",
                "project_id": existing_p.id,
                "project_code": existing_p.code,
                "project_name": existing_p.name,
                "already_approved": True
            }
        raise HTTPException(
            status_code=400,
            detail=f"La cotización {quote.quote_number} ya fue aprobada previamente y no puede duplicarse."
        )

    # Generar código de proyecto correlativo garantizando unicidad y formato estricto
    current_year = datetime.utcnow().year
    projects = db.query(Project.code).all()
    max_seq = 0
    pattern = re.compile(rf"PRJ-{current_year}-(\d+)", re.IGNORECASE)
    for (p_code,) in projects:
        if p_code:
            m = pattern.search(p_code)
            if m:
                try:
                    num = int(m.group(1))
                    if num > max_seq:
                        max_seq = num
                except ValueError:
                    pass
    proj_code = f"PRJ-{current_year}-{(max_seq + 1):03d}"

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
    db.flush()

    # Explosión de Insumos del Presupuesto a Requisición de Almacén para el Proyecto
    for q_item in (quote.items or []):
        mat = db.query(Material).filter(
            (Material.code == q_item.item_code) |
            (Material.name.ilike(f"%{q_item.description[:30]}%"))
        ).first()

        req = ProjectMaterialRequisition(
            project_id=new_project.id,
            material_id=mat.id if mat else None,
            material_code=mat.code if mat else (q_item.item_code or "APU-MAT"),
            material_name=q_item.description,
            unit_measure=q_item.unit_measure or "UND",
            quantity_required=q_item.quantity or 1.0,
            quantity_dispatched=0.0,
            estimated_cost_usd=q_item.total_usd or 0.0,
            status="pendiente",
            notes=f"Partida presupuestada en {quote.quote_number}"
        )
        db.add(req)

    db.commit()
    db.refresh(new_project)

    return {
        "success": True,
        "message": f"Cotización {quote.quote_number} convertida exitosamente en el Proyecto Activo {proj_code}.",
        "project_id": new_project.id,
        "project_code": new_project.code,
        "project_name": new_project.name
    }


@router.post("/{quotation_id}/decline")
def decline_quotation(
    quotation_id: int,
    reason: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Marca un presupuesto como declinado por el cliente sin alterar proyectos ni caja."""
    quote = db.query(Quotation).filter(Quotation.id == quotation_id).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Cotización no encontrada.")
    
    if quote.status == "aprobado":
        p = db.query(Project).filter(
            Project.client_id == quote.client_id,
            Project.name == quote.project_title,
            Project.is_active == True
        ).first()
        if p:
            raise HTTPException(
                status_code=400,
                detail=f"Esta cotización ya fue aprobada y tiene el Proyecto activo {p.code}. Inactiva o elimina el proyecto antes de marcarla como declinada."
            )

    quote.status = "declinado"
    clean_reason = (reason or "").strip()
    stamp = datetime.utcnow().strftime("%d/%m/%Y")
    note_entry = f"[{stamp}] Cliente declinó la propuesta" + (f". Motivo: {clean_reason}" if clean_reason else ".")
    quote.notes = f"{quote.notes}\n{note_entry}" if quote.notes else note_entry

    db.commit()
    db.refresh(quote)
    return {
        "success": True,
        "message": f"Cotización {quote.quote_number} marcada como DECLINADA por el cliente.",
        "quotation_id": quote.id,
        "status": quote.status
    }


@router.post("/{quotation_id}/reopen")
def reopen_quotation(quotation_id: int, db: Session = Depends(get_db)):
    """Reabre una cotización declinada devolviéndola al estado borrador para su renegociación."""
    quote = db.query(Quotation).filter(Quotation.id == quotation_id).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Cotización no encontrada.")
    
    quote.status = "borrador"
    stamp = datetime.utcnow().strftime("%d/%m/%Y")
    note_entry = f"[{stamp}] Presupuesto reabierto a Borrador para renegociación comercial."
    quote.notes = f"{quote.notes}\n{note_entry}" if quote.notes else note_entry

    db.commit()
    db.refresh(quote)
    return {
        "success": True,
        "message": f"Cotización {quote.quote_number} reabierta a BORRADOR exitosamente.",
        "quotation_id": quote.id,
        "status": quote.status
    }

