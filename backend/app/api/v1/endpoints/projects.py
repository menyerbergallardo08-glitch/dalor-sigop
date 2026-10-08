from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Response, Query
from sqlalchemy.orm import Session, joinedload, selectinload
from typing import List, Optional
from datetime import datetime, timedelta
import re
from pydantic import BaseModel
from app.core.database import get_db
from app.models.models import Project, Client, Expense, ProjectPhase, Asset, Personnel, ResourceAssignmentHistory, AccountReceivable, AccountPayable, FinancialPayment, ProjectAddendum, AuditLog, Material, ProjectMaterialRequisition, MaterialMovement, User
from app.schemas.schemas import ProjectCreate, ProjectUpdate, ProjectOut, ProjectAddendumCreate, ProjectAddendumOut
from app.services.excel_service import ExcelProjectService
from sqlalchemy import func

router = APIRouter()

class PhaseStatusUpdate(BaseModel):
    status: str # pendiente, en_progreso, completado

@router.get("/")
def get_projects(db: Session = Depends(get_db)):
    projects = (
        db.query(Project)
        .options(
            joinedload(Project.client),
            selectinload(Project.expenses),
            selectinload(Project.phases),
            selectinload(Project.addendums)
        )
        .filter(Project.is_active == True)
        .order_by(Project.created_at.desc())
        .all()
    )
    
    # Compras y Facturas CxP pagadas imputadas a proyectos
    cxp_sums = dict(
        db.query(AccountPayable.project_id, func.sum(AccountPayable.paid_amount_usd))
        .filter(AccountPayable.project_id.isnot(None))
        .group_by(AccountPayable.project_id)
        .all()
    )

    results = []
    for proj in projects:
        exp_spent = sum(e.amount_usd for e in proj.expenses if e.status == 'aprobado') if proj.expenses else 0.0
        cxp_spent = float(cxp_sums.get(proj.id, 0.0) or 0.0)
        spent = round(exp_spent + cxp_spent, 2)
        
        # Calculate physical progress percentage based on tasks or completed phases
        total_tasks = 0
        completed_tasks = 0
        if proj.phases:
            for ph in proj.phases:
                raw_tasks = [t.strip() for t in (ph.description or "").split(";") if t.strip()]
                if not raw_tasks and (ph.description or "").strip():
                    raw_tasks = [t.strip() for t in ph.description.split("\n") if t.strip()]
                
                if raw_tasks:
                    total_tasks += len(raw_tasks)
                    completed_tasks += sum(1 for t in raw_tasks if t.startswith("[x]") or t.startswith("[X]"))
                else:
                    total_tasks += 1
                    if ph.status == "completado":
                        completed_tasks += 1
        
        prog_pct = round((completed_tasks / total_tasks * 100), 1) if total_tasks > 0 else (100.0 if proj.status == "completado" else 0.0)
        
        # Consultar si ya tiene factura en Cuentas por Cobrar (CxC) y su estado
        cxc_recs = db.query(AccountReceivable).filter(AccountReceivable.project_id == proj.id).all()
        has_cxc = len(cxc_recs) > 0
        total_billed_cxc = sum(r.amount_usd for r in cxc_recs)
        total_paid_cxc = sum(r.paid_amount_usd for r in cxc_recs)
        total_pending_cxc = sum(r.balance_usd for r in cxc_recs)
        contract_amt = proj.contract_amount_usd or 0.0
        unbilled_contract = max(0.0, round(contract_amt - total_billed_cxc, 2))
        is_fully_billed = (total_billed_cxc >= contract_amt - 0.05) and (contract_amt > 0)
        
        if not has_cxc:
            cxc_status = "sin_cxc"
        elif total_pending_cxc <= 0.05:
            cxc_status = "cerrada"
        elif total_paid_cxc > 0.05:
            cxc_status = "parcial"
        else:
            cxc_status = "abierta"
        
        results.append({
            "id": proj.id,
            "code": proj.code,
            "name": proj.name,
            "client_id": proj.client_id,
            "client_name": proj.client_name or (proj.client.name if proj.client else "General"),
            "location": proj.location,
            "status": proj.status,
            "scope_of_work": proj.scope_of_work,
            "duration_days": proj.duration_days,
            "execution_time": proj.execution_time,
            "tracking_token": proj.tracking_token,
            "contract_amount_usd": proj.contract_amount_usd,
            "estimated_labor_usd": proj.estimated_labor_usd,
            "estimated_fuel_usd": proj.estimated_fuel_usd,
            "estimated_materials_usd": proj.estimated_materials_usd,
            "estimated_tools_usd": proj.estimated_tools_usd,
            "estimated_services_usd": proj.estimated_services_usd,
            "budget_limit_usd": proj.budget_limit_usd,
            "total_spent_usd": round(spent, 2),
            "progress_pct": prog_pct,
            "has_cxc": has_cxc,
            "cxc_status": cxc_status,
            "cxc_total_usd": round(total_billed_cxc, 2),
            "cxc_paid_usd": round(total_paid_cxc, 2),
            "cxc_pending_usd": round(total_pending_cxc, 2),
            "total_billed_cxc_usd": round(total_billed_cxc, 2),
            "unbilled_contract_usd": unbilled_contract,
            "is_fully_billed": is_fully_billed,
            "cxc_count": len(cxc_recs),
            "addendums_count": len(proj.addendums) if proj.addendums else 0,
            "total_addendums_usd": round(sum(a.additional_contract_usd for a in (proj.addendums or [])), 2),
            "is_active": proj.is_active,
            "created_at": proj.created_at.isoformat() if proj.created_at else None,
            "phases": [
                {
                    "id": ph.id,
                    "phase_number": ph.phase_number,
                    "name": ph.name,
                    "description": ph.description,
                    "duration_days": ph.duration_days,
                    "duration_unit": getattr(ph, "duration_unit", "dias") or "dias",
                    "estimated_duration": float(getattr(ph, "estimated_duration", ph.duration_days) or ph.duration_days or 0.0),
                    "estimated_cost_usd": ph.estimated_cost_usd,
                    "status": ph.status,
                    "responsible_person": ph.responsible_person
                } for ph in (proj.phases or [])
            ]
        })
    return results

@router.get("/{project_id}/details")
def get_project_details(project_id: int, db: Session = Depends(get_db)):
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado.")

    # Recursos asignados actualmente
    assigned_assets = db.query(Asset).filter(Asset.current_project_id == project_id, Asset.is_active == True).all()
    assigned_personnel = db.query(Personnel).filter(Personnel.current_project_id == project_id, Personnel.is_active == True).all()
    
    # Gastos ejecutados (solo aprobados)
    expenses = db.query(Expense).filter(Expense.project_id == project_id, Expense.status == "aprobado").all()
    expenses_spent = sum(e.amount_usd for e in expenses)

    # Compras y Facturas de Proveedores (CxP) imputadas a la obra
    payables = db.query(AccountPayable).filter(AccountPayable.project_id == project_id).order_by(AccountPayable.issue_date.desc(), AccountPayable.id.desc()).all()
    payables_spent = sum(p.paid_amount_usd for p in payables)
    total_spent = round(expenses_spent + payables_spent, 2)

    # Trazabilidad de Cobros y Cuentas por Cobrar (CxC) de la obra
    receivables = db.query(AccountReceivable).filter(AccountReceivable.project_id == project_id).all()
    total_billed_cxc = sum(r.amount_usd for r in receivables)
    total_collected_usd = sum(r.paid_amount_usd for r in receivables)
    balance_receivable_usd = sum(r.balance_usd for r in receivables)

    # Detalle cronológico de todos los abonos y cobros percibidos
    collections_trace = []
    for r in receivables:
        for pm in (r.payments or []):
            collections_trace.append({
                "id": pm.id,
                "receivable_id": r.id,
                "invoice_number": r.invoice_number,
                "payment_date": pm.payment_date.strftime("%Y-%m-%d %H:%M") if pm.payment_date else "-",
                "payment_method": pm.payment_method or "transferencia",
                "reference_number": pm.voucher_number or pm.reference_number or "-",
                "amount_usd": round(pm.amount_usd, 2),
                "amount_bs": round(pm.amount_bs, 2) if pm.amount_bs else 0.0,
                "exchange_rate": pm.exchange_rate,
                "notes": pm.notes or ""
            })
    # Guías de Despacho vinculadas a la obra
    from app.models.models import DispatchGuide
    guides = db.query(DispatchGuide).filter(DispatchGuide.project_id == project_id).order_by(DispatchGuide.id.desc()).all()
    dispatch_guides_data = [
        {
            "id": g.id,
            "guide_number": g.guide_number,
            "dispatch_date": g.dispatch_date.strftime("%Y-%m-%d %H:%M") if g.dispatch_date else "-",
            "status": g.status,
            "destination_address": g.destination_address,
            "destination_plant": g.destination_plant,
            "transport_type": g.transport_type,
            "vehicle_plate": g.vehicle_plate,
            "driver_name": g.driver_name,
            "items_count": len(g.items or []),
            "transfer_reason": g.transfer_reason,
        }
        for g in guides
    ]

    # Gastos asociados a la obra
    project_expenses = (
        db.query(Expense)
        .options(joinedload(Expense.category), joinedload(Expense.reported_by))
        .filter(Expense.project_id == project_id)
        .order_by(Expense.expense_date.desc(), Expense.id.desc())
        .all()
    )
    expenses_data = [
        {
            "id": e.id,
            "expense_date": e.expense_date.strftime("%Y-%m-%d") if e.expense_date else (e.created_at.strftime("%Y-%m-%d") if e.created_at else "-"),
            "supplier_vendor": e.supplier_vendor or "Comercio General",
            "description": e.description or "-",
            "category_name": e.category.name if e.category else "General",
            "category_code": e.category.code if e.category else "",
            "amount_usd": round(e.amount_usd or 0.0, 2),
            "amount_bs": round(e.amount_bs or 0.0, 2) if e.amount_bs else 0.0,
            "exchange_rate": e.exchange_rate or 850.0,
            "status": e.status or "pendiente",
            "receipt_image_path": e.receipt_image_path or "",
            "reported_by_name": e.reported_by.full_name if e.reported_by else (e.reported_by.username if e.reported_by else "Admin")
        } for e in project_expenses
    ]

    payables_data = [
        {
            "id": p.id,
            "invoice_number": p.invoice_number,
            "control_number": p.control_number or "-",
            "supplier_name": p.supplier_name,
            "supplier_rif": p.supplier_rif or "-",
            "doc_type": p.doc_type or "factura",
            "payable_type": p.payable_type,
            "description": p.description,
            "issue_date": p.issue_date.strftime("%Y-%m-%d") if p.issue_date else "-",
            "due_date": p.due_date.strftime("%Y-%m-%d") if p.due_date else "-",
            "amount_usd": round(p.amount_usd or 0.0, 2),
            "amount_bs": round(p.amount_bs or 0.0, 2) if p.amount_bs else 0.0,
            "exchange_rate": p.exchange_rate or 850.0,
            "taxable_base_usd": round(p.taxable_base_usd or 0.0, 2),
            "tax_withholding_usd": round(p.tax_withholding_usd or 0.0, 2),
            "net_amount_usd": round(p.net_amount_usd or 0.0, 2),
            "paid_amount_usd": round(p.paid_amount_usd or 0.0, 2),
            "balance_usd": round(p.balance_usd or 0.0, 2),
            "status": p.status,
            "withholding_voucher_number": p.withholding_voucher_number or "-"
        } for p in payables
    ]

    return {
        "id": proj.id,
        "code": proj.code,
        "name": proj.name,
        "client_name": proj.client_name,
        "client_id": proj.client_id,
        "client_address": proj.client.address if proj.client else None,
        "location": proj.location,
        "status": proj.status,
        "scope_of_work": proj.scope_of_work,
        "duration_days": proj.duration_days,
        "contract_amount_usd": proj.contract_amount_usd,
        "budget_limit_usd": proj.budget_limit_usd,
        "total_spent_usd": round(total_spent, 2),
        "gross_margin_usd": round(proj.contract_amount_usd - total_spent, 2),
        "total_billed_cxc_usd": round(total_billed_cxc, 2),
        "total_collected_usd": round(total_collected_usd, 2),
        "balance_receivable_usd": round(balance_receivable_usd, 2),
        "unbilled_contract_usd": max(0.0, round(proj.contract_amount_usd - total_billed_cxc, 2)),
        "is_fully_billed": (total_billed_cxc >= proj.contract_amount_usd - 0.05) and (proj.contract_amount_usd > 0),
        "addendums": [
            {
                "id": a.id,
                "addendum_number": a.addendum_number,
                "title": a.title,
                "scope_description": a.scope_description,
                "additional_contract_usd": round(a.additional_contract_usd, 2),
                "additional_materials_usd": round(a.additional_materials_usd or 0.0, 2),
                "additional_labor_usd": round(a.additional_labor_usd or 0.0, 2),
                "authorized_by": a.authorized_by,
                "approval_date": a.approval_date.strftime("%Y-%m-%d %H:%M") if a.approval_date else "-"
            } for a in (proj.addendums or [])
        ],
        "collections": collections_trace,
        "dispatch_guides": dispatch_guides_data,
        "expenses": expenses_data,
        "phases": [
            {
                "id": ph.id,
                "phase_number": ph.phase_number,
                "name": ph.name,
                "description": ph.description,
                "duration_days": ph.duration_days,
                "duration_unit": getattr(ph, "duration_unit", "dias") or "dias",
                "estimated_duration": float(getattr(ph, "estimated_duration", ph.duration_days) or ph.duration_days or 0.0),
                "estimated_cost_usd": ph.estimated_cost_usd,
                "status": ph.status,
                "responsible_person": ph.responsible_person
            } for ph in proj.phases
        ],
        "assigned_fleet": [
            {
                "id": a.id,
                "code": a.asset_code,
                "name": a.name,
                "type": a.asset_type,
                "brand": a.brand,
                "license_plate": a.license_plate,
                "custodian": a.current_custodian_name
            } for a in assigned_assets if a.asset_type in ['vehiculo', 'camioneta']
        ],
        "assigned_tools": [
            {
                "id": a.id,
                "code": a.asset_code,
                "name": a.name,
                "type": a.asset_type,
                "brand": a.brand,
                "serial_number": a.serial_number
            } for a in assigned_assets if a.asset_type not in ['vehiculo', 'camioneta']
        ],
        "assigned_personnel": [
            {
                "id": p.id,
                "code": p.code,
                "name": p.full_name,
                "role": p.role_title
            } for p in assigned_personnel
        ],
        "requested_materials": [
            {
                "id": r.id,
                "material_id": r.material_id,
                "material_code": r.material_code or (r.material.code if r.material else "MAT-REQ"),
                "material_name": r.material_name or (r.material.name if r.material else "Insumo Requerido"),
                "unit_measure": r.unit_measure or (r.material.unit_measure if r.material else "UND"),
                "quantity_required": r.quantity_required,
                "quantity_dispatched": r.quantity_dispatched or 0.0,
                "quantity_pending": max(0.0, (r.quantity_required or 0.0) - (r.quantity_dispatched or 0.0)),
                "estimated_cost_usd": r.estimated_cost_usd or 0.0,
                "unit_cost_usd": (r.material.unit_cost_usd if r.material else 0.0),
                "status": "despachado_total" if (r.quantity_dispatched or 0.0) >= r.quantity_required and r.quantity_required > 0 else ("despachado_parcial" if (r.quantity_dispatched or 0.0) > 0 else "pendiente"),
                "notes": r.notes or "",
                "created_at": r.created_at.strftime("%Y-%m-%d %H:%M") if r.created_at else "-"
            } for r in db.query(ProjectMaterialRequisition).filter(ProjectMaterialRequisition.project_id == project_id).order_by(ProjectMaterialRequisition.id.asc()).all()
        ],
        "materials_requisition": [
            {
                "id": r.id,
                "material_id": r.material_id,
                "material_code": r.material_code or (r.material.code if r.material else "MAT-REQ"),
                "material_name": r.material_name or (r.material.name if r.material else "Insumo Requerido"),
                "unit_measure": r.unit_measure or (r.material.unit_measure if r.material else "UND"),
                "quantity_required": r.quantity_required,
                "quantity_dispatched": r.quantity_dispatched or 0.0,
                "quantity_pending": max(0.0, (r.quantity_required or 0.0) - (r.quantity_dispatched or 0.0)),
                "estimated_cost_usd": r.estimated_cost_usd or 0.0,
                "unit_cost_usd": (r.material.unit_cost_usd if r.material else 0.0),
                "status": "despachado_total" if (r.quantity_dispatched or 0.0) >= r.quantity_required and r.quantity_required > 0 else ("despachado_parcial" if (r.quantity_dispatched or 0.0) > 0 else "pendiente"),
                "notes": r.notes or "",
                "created_at": r.created_at.strftime("%Y-%m-%d %H:%M") if r.created_at else "-"
            } for r in db.query(ProjectMaterialRequisition).filter(ProjectMaterialRequisition.project_id == project_id).order_by(ProjectMaterialRequisition.id.asc()).all()
        ],
        "expenses": expenses_data,
        "payables": payables_data
    }

class MaterialRequestItemIn(BaseModel):
    material_id: Optional[int] = None
    material_name: Optional[str] = None
    quantity: float = 1.0
    unit_measure: Optional[str] = "UND"
    notes: Optional[str] = None

class ProjectMaterialRequestIn(BaseModel):
    items: List[MaterialRequestItemIn]
    notes: Optional[str] = None

@router.post("/{project_id}/request-materials")
def request_materials_for_project(
    project_id: int,
    req_in: ProjectMaterialRequestIn,
    db: Session = Depends(get_db)
):
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado.")

    created = []
    for it in req_in.items:
        m = None
        if it.material_id:
            m = db.query(Material).filter(Material.id == it.material_id).first()
        
        m_name = m.name if m else (it.material_name or "Insumo Requerido")
        m_code = m.code if m else "MAT-REQ"
        m_unit = m.unit_measure if m else (it.unit_measure or "UND")
        cost_est = (m.unit_cost_usd or 0.0) * it.quantity if m else 0.0

        requisition = ProjectMaterialRequisition(
            project_id=proj.id,
            material_id=m.id if m else None,
            material_code=m_code,
            material_name=m_name,
            unit_measure=m_unit,
            quantity_required=it.quantity,
            quantity_dispatched=0.0,
            estimated_cost_usd=round(cost_est, 2),
            status="pendiente",
            notes=it.notes or req_in.notes or "Solicitado a almacén para avance de obra"
        )
        db.add(requisition)
        created.append(requisition)

    db.commit()
    return {
        "success": True,
        "message": f"Se registraron {len(created)} requerimientos de insumos a almacén para el proyecto {proj.code}.",
        "items_count": len(created)
    }

@router.post("/{project_id}/addendums", response_model=ProjectAddendumOut)
def create_project_addendum(project_id: int, payload: ProjectAddendumCreate, db: Session = Depends(get_db)):
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado.")
    
    if payload.additional_contract_usd <= 0:
        raise HTTPException(status_code=400, detail="El monto adicional del contrato debe ser mayor a 0.")
    
    curr_addendums = db.query(ProjectAddendum).filter(ProjectAddendum.project_id == project_id).all()
    next_num = len(curr_addendums) + 1

    addendum = ProjectAddendum(
        project_id=project_id,
        addendum_number=next_num,
        title=payload.title.strip(),
        scope_description=payload.scope_description.strip() if payload.scope_description else None,
        additional_contract_usd=round(payload.additional_contract_usd, 2),
        additional_materials_usd=round(payload.additional_materials_usd or 0.0, 2),
        additional_labor_usd=round(payload.additional_labor_usd or 0.0, 2),
        additional_services_usd=round(payload.additional_services_usd or 0.0, 2),
        authorized_by=payload.authorized_by or "Dirección General",
        approval_date=datetime.utcnow(),
        created_at=datetime.utcnow()
    )
    db.add(addendum)

    # Actualizar valores contractuales y presupuestarios del proyecto
    proj.contract_amount_usd = round((proj.contract_amount_usd or 0.0) + payload.additional_contract_usd, 2)
    proj.estimated_materials_usd = round((proj.estimated_materials_usd or 0.0) + (payload.additional_materials_usd or 0.0), 2)
    proj.estimated_labor_usd = round((proj.estimated_labor_usd or 0.0) + (payload.additional_labor_usd or 0.0), 2)
    proj.estimated_services_usd = round((proj.estimated_services_usd or 0.0) + (payload.additional_services_usd or 0.0), 2)
    proj.budget_limit_usd = round(
        (proj.estimated_labor_usd or 0.0) +
        (proj.estimated_fuel_usd or 0.0) +
        (proj.estimated_materials_usd or 0.0) +
        (proj.estimated_tools_usd or 0.0) +
        (proj.estimated_services_usd or 0.0),
        2
    )

    # Si el proyecto estaba culminado, se reactiva a activo al aprobarse la adenda
    if proj.status == "culminado":
        proj.status = "activo"

    # Siempre crear una fase/etapa en el cronograma para la adenda
    phase_name = payload.new_phase_name.strip() if payload.new_phase_name else f"Etapa Adenda N° {next_num}: {payload.title}".strip()
    curr_phases = db.query(ProjectPhase).filter(ProjectPhase.project_id == project_id).all()
    new_phase = ProjectPhase(
        project_id=project_id,
        phase_number=len(curr_phases) + 1,
        name=phase_name,
        description=f"Adenda N° {next_num}: {payload.title}. {payload.scope_description or ''}".strip(),
        duration_days=payload.new_phase_duration_days or 7,
        estimated_cost_usd=round(payload.additional_contract_usd, 2),
        status="pendiente",
        responsible_person=payload.authorized_by or "Residente de Obra"
    )
    db.add(new_phase)

    # Generar automáticamente la Cuenta por Cobrar (CxC) de la Adenda
    target_client_id = proj.client_id
    if not target_client_id:
        if proj.client_name:
            c_match = db.query(Client).filter(Client.name.ilike(f"%{proj.client_name}%")).first()
            if c_match:
                target_client_id = c_match.id
        if not target_client_id:
            c_first = db.query(Client).first()
            if c_first:
                target_client_id = c_first.id

    cxc_inv_code = None
    if target_client_id:
        base_inv = f"ADENDA-{proj.code}-{next_num:02d}"
        cxc_inv_code = base_inv
        suffix = 1
        while db.query(AccountReceivable).filter(AccountReceivable.invoice_number == cxc_inv_code).first():
            cxc_inv_code = f"{base_inv}-{suffix}"
            suffix += 1

        cxc_entry = AccountReceivable(
            project_id=proj.id,
            client_id=target_client_id,
            invoice_number=cxc_inv_code,
            description=f"Adenda N° {next_num}: {payload.title}".strip(),
            issue_date=datetime.utcnow(),
            due_date=datetime.utcnow() + timedelta(days=30),
            taxable_base_usd=round(payload.additional_contract_usd, 2),
            tax_amount_usd=0.0,
            amount_usd=round(payload.additional_contract_usd, 2),
            paid_amount_usd=0.0,
            balance_usd=round(payload.additional_contract_usd, 2),
            net_amount_usd=round(payload.additional_contract_usd, 2),
            status="pendiente",
            notes=f"Generado automáticamente por registro de Adenda N° {next_num}. {payload.scope_description or ''}".strip()
        )
        db.add(cxc_entry)

    # Registrar en Auditoría
    audit = AuditLog(
        username=payload.authorized_by or "Dirección General",
        module="proyectos",
        action="crear_adenda_obra_extra",
        details=f"Adenda N° {next_num} ({payload.title}) en {proj.code}: +${payload.additional_contract_usd:.2f} USD. Nuevo Techo: ${proj.contract_amount_usd:.2f} USD. CxC generada: {cxc_inv_code or 'Sin Cliente'}."
    )
    db.add(audit)

    db.commit()
    db.refresh(addendum)
    return addendum

def compute_next_project_code(db: Session, current_year: int) -> str:
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
    return f"PRJ-{current_year}-{(max_seq + 1):03d}"

@router.get("/next-code")
def get_next_project_code_endpoint(db: Session = Depends(get_db)):
    current_year = datetime.utcnow().year
    next_code = compute_next_project_code(db, current_year)
    return {"next_code": next_code, "year": current_year}

@router.post("/", response_model=ProjectOut)
def create_project(project_in: ProjectCreate, db: Session = Depends(get_db)):
    code = (project_in.code or "").strip()
    current_year = datetime.utcnow().year
    if not code or db.query(Project).filter(Project.code == code).first():
        code = compute_next_project_code(db, current_year)
    
    total_budget = (
        project_in.estimated_labor_usd +
        project_in.estimated_fuel_usd +
        project_in.estimated_materials_usd +
        project_in.estimated_tools_usd +
        project_in.estimated_services_usd
    )

    client_name = project_in.client_name
    if project_in.client_id:
        client = db.query(Client).filter(Client.id == project_in.client_id).first()
        if client:
            client_name = client.name

    exec_t = (project_in.execution_time or "15 días hábiles").strip()
    if "hábil" not in exec_t.lower() and "habil" not in exec_t.lower():
        exec_t = f"{exec_t} días hábiles"

    try:
        new_project = Project(
            code=code,
            name=project_in.name,
            client_id=project_in.client_id,
            client_name=client_name or "Cliente General",
            location=project_in.location or "Sede Central",
            status=project_in.status or "activo",
            scope_of_work=project_in.scope_of_work,
            duration_days=project_in.duration_days,
            execution_time=exec_t,
            contract_amount_usd=project_in.contract_amount_usd,
            estimated_labor_usd=project_in.estimated_labor_usd,
            estimated_fuel_usd=project_in.estimated_fuel_usd,
            estimated_materials_usd=project_in.estimated_materials_usd,
            estimated_tools_usd=project_in.estimated_tools_usd,
            estimated_services_usd=project_in.estimated_services_usd,
            budget_limit_usd=total_budget if total_budget > 0 else (project_in.contract_amount_usd * 0.70),
            is_active=True
        )
        db.add(new_project)
        db.flush() # Obtiene ID sin cerrar la transacción atómica

        # 1. Crear Etapas / Fases del Proyecto
        if project_in.phases and len(project_in.phases) > 0:
            for idx, phase_data in enumerate(project_in.phases, start=1):
                d_unit = getattr(phase_data, "duration_unit", "dias") or "dias"
                e_dur = getattr(phase_data, "estimated_duration", None)
                if e_dur is None:
                    e_dur = float(phase_data.duration_days or 7.0)
                d_days = int(round(e_dur / 8.0)) if d_unit == "horas" else int(round(e_dur))
                d_days = max(1, d_days)
                phase = ProjectPhase(
                    project_id=new_project.id,
                    phase_number=idx,
                    name=phase_data.name,
                    description=phase_data.description,
                    duration_days=d_days,
                    duration_unit=d_unit,
                    estimated_duration=e_dur,
                    estimated_cost_usd=phase_data.estimated_cost_usd,
                    status=phase_data.status or "pendiente",
                    responsible_person=phase_data.responsible_person
                )
                db.add(phase)
            db.flush()
            db.refresh(new_project)

        # 2. Asignar Personal Seleccionado
        if project_in.assigned_personnel_ids:
            for pers_id in project_in.assigned_personnel_ids:
                person = db.query(Personnel).filter(Personnel.id == pers_id).first()
                if person:
                    if person.is_active is False or person.current_project_id or (person.status or "").lower() not in ["disponible_base", "disponible"]:
                        raise HTTPException(
                            status_code=400,
                            detail=f"El trabajador [{person.code}] {person.full_name} no está disponible en base (Estado: '{person.status or 'no disponible'}'). Si está en otra obra, debe gestionarse por Transferencia."
                        )
                    person.current_project_id = new_project.id
                    person.status = "en_obra"
                    person.current_location = new_project.location
                    hist = ResourceAssignmentHistory(
                        project_id=new_project.id,
                        resource_type="personnel",
                        resource_id=person.id,
                        resource_code=person.code,
                        resource_name=person.full_name,
                        destination_location=new_project.location,
                        status="en_obra",
                        notes="Asignación inicial en planificación"
                    )
                    db.add(hist)

        # 3. Asignar Vehículos Seleccionados
        if project_in.assigned_vehicle_ids:
            for veh_id in project_in.assigned_vehicle_ids:
                asset = db.query(Asset).filter(Asset.id == veh_id).first()
                if asset:
                    if asset.is_active is False or asset.current_project_id or (asset.status or "").lower() not in ["disponible_base", "disponible"]:
                        raise HTTPException(
                            status_code=400,
                            detail=f"El vehículo [{asset.asset_code}] {asset.name} no está disponible en base (Estado: '{asset.status or 'no disponible'}'). Si está en otra obra, debe gestionarse por Transferencia."
                        )
                    asset.current_project_id = new_project.id
                    asset.status = "en_obra"
                    asset.current_location = new_project.location
                    hist = ResourceAssignmentHistory(
                        project_id=new_project.id,
                        resource_type="asset",
                        resource_id=asset.id,
                        resource_code=asset.asset_code,
                        resource_name=asset.name,
                        start_odometer=asset.current_odometer,
                        destination_location=new_project.location,
                        status="en_obra",
                        notes="Vehículo asignado en planificación de obra"
                    )
                    db.add(hist)

        # 4. Asignar Herramientas Seleccionadas
        if project_in.assigned_tool_ids:
            for tool_id in project_in.assigned_tool_ids:
                asset = db.query(Asset).filter(Asset.id == tool_id).first()
                if asset:
                    if asset.is_active is False or asset.current_project_id or (asset.status or "").lower() not in ["disponible_base", "disponible"]:
                        raise HTTPException(
                            status_code=400,
                            detail=f"El equipo/herramienta [{asset.asset_code}] {asset.name} no está disponible en base (Estado: '{asset.status or 'no disponible'}'). Si está en otra obra, debe gestionarse por Transferencia."
                        )
                    asset.current_project_id = new_project.id
                    asset.status = "en_obra"
                    asset.current_location = new_project.location
                    hist = ResourceAssignmentHistory(
                        project_id=new_project.id,
                        resource_type="asset",
                        resource_id=asset.id,
                        resource_code=asset.asset_code,
                        resource_name=asset.name,
                        destination_location=new_project.location,
                        status="en_obra",
                        notes="Herramienta asignada en planificación de obra"
                    )
                    db.add(hist)

                    req_tool = ProjectMaterialRequisition(
                        project_id=new_project.id,
                        resource_type="herramienta",
                        asset_id=asset.id,
                        material_code=asset.asset_code,
                        material_name=asset.name,
                        unit_measure="UND",
                        quantity_required=1.0,
                        quantity_dispatched=0.0,
                        estimated_cost_usd=0.0,
                        status="pendiente",
                        notes="Herramienta/Equipo asignado en planificación de obra"
                    )
                    db.add(req_tool)

        # 4.5. Registrar Materiales e Insumos Requeridos (Lista de Picking para Almacén)
        if getattr(project_in, 'assigned_material_items', None):
            for mat_item in project_in.assigned_material_items:
                m_id = mat_item.get("material_id")
                qty = float(mat_item.get("quantity") or 1.0)
                m_obj = db.query(Material).filter(Material.id == m_id).first() if m_id else None
                m_name = m_obj.name if m_obj else mat_item.get("name", "Material Requerido")
                m_code = m_obj.code if m_obj else mat_item.get("code", "MAT-REQ")
                m_unit = m_obj.unit_measure if m_obj else mat_item.get("unit_measure", "UND")
                cost_est = (m_obj.unit_cost_usd or 0.0) * qty if m_obj else 0.0

                req_rec = ProjectMaterialRequisition(
                    project_id=new_project.id,
                    resource_type="material",
                    material_id=m_id,
                    material_code=m_code,
                    material_name=m_name,
                    unit_measure=m_unit,
                    quantity_required=qty,
                    quantity_dispatched=0.0,
                    estimated_cost_usd=round(cost_est, 2),
                    status="pendiente",
                    notes=mat_item.get("notes", "Requerido en armado y formulación de obra")
                )
                db.add(req_rec)
        # Confirmar transacción atómica completa
        db.commit()
        db.refresh(new_project)

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Fallo en transacción atómica de proyecto: {str(e)}")
    
    return {
        "id": new_project.id,
        "code": new_project.code,
        "name": new_project.name,
        "client_id": new_project.client_id,
        "client_name": new_project.client_name,
        "location": new_project.location,
        "status": new_project.status,
        "scope_of_work": new_project.scope_of_work,
        "duration_days": new_project.duration_days,
        "execution_time": new_project.execution_time,
        "tracking_token": new_project.tracking_token,
        "contract_amount_usd": new_project.contract_amount_usd,
        "estimated_labor_usd": new_project.estimated_labor_usd,
        "estimated_fuel_usd": new_project.estimated_fuel_usd,
        "estimated_materials_usd": new_project.estimated_materials_usd,
        "estimated_tools_usd": new_project.estimated_tools_usd,
        "estimated_services_usd": new_project.estimated_services_usd,
        "budget_limit_usd": new_project.budget_limit_usd,
        "total_spent_usd": 0.0,
        "progress_pct": 0.0,
        "is_active": new_project.is_active,
        "created_at": new_project.created_at.isoformat() if new_project.created_at else None,
        "phases": [{
            "id": ph.id,
            "phase_number": ph.phase_number,
            "name": ph.name,
            "description": ph.description,
            "duration_days": ph.duration_days,
            "duration_unit": getattr(ph, "duration_unit", "dias") or "dias",
            "estimated_duration": getattr(ph, "estimated_duration", None),
            "estimated_cost_usd": ph.estimated_cost_usd,
            "status": ph.status,
            "responsible_person": ph.responsible_person
        } for ph in (new_project.phases or [])]
    }

class ProjectPhaseAdd(BaseModel):
    phase_number: Optional[int] = None
    name: str
    description: Optional[str] = None
    duration_days: Optional[int] = 7
    duration_unit: Optional[str] = "dias"
    estimated_duration: Optional[float] = None
    estimated_cost_usd: Optional[float] = 0.0
    status: Optional[str] = "pendiente"
    responsible_person: Optional[str] = None

@router.post("/{project_id}/phases")
def add_project_phase(project_id: int, phase_in: ProjectPhaseAdd, db: Session = Depends(get_db)):
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado.")

    curr_phases = db.query(ProjectPhase).filter(ProjectPhase.project_id == project_id).all()
    p_num = phase_in.phase_number if (phase_in.phase_number and phase_in.phase_number > 0) else len(curr_phases) + 1

    d_unit = phase_in.duration_unit or "dias"
    e_dur = phase_in.estimated_duration if phase_in.estimated_duration is not None else float(phase_in.duration_days or 7.0)
    d_days = int(round(e_dur / 8.0)) if d_unit == "horas" else int(round(e_dur))
    d_days = max(1, d_days)

    new_phase = ProjectPhase(
        project_id=project_id,
        phase_number=p_num,
        name=phase_in.name.strip(),
        description=(phase_in.description or "").strip(),
        duration_days=d_days,
        duration_unit=d_unit,
        estimated_duration=e_dur,
        estimated_cost_usd=round(phase_in.estimated_cost_usd or 0.0, 2),
        status=phase_in.status or "pendiente",
        responsible_person=phase_in.responsible_person or "Residente de Obra"
    )
    db.add(new_phase)
    db.commit()
    db.refresh(new_phase)
    return {
        "success": True,
        "message": f"Fase #{new_phase.phase_number} ('{new_phase.name}') agregada exitosamente al proyecto.",
        "id": new_phase.id,
        "phase_number": new_phase.phase_number,
        "phase": {
            "id": new_phase.id,
            "phase_number": new_phase.phase_number,
            "name": new_phase.name,
            "duration_days": new_phase.duration_days,
            "estimated_cost_usd": new_phase.estimated_cost_usd,
            "status": new_phase.status
        }
    }

@router.put("/{project_id}/phases/{phase_id}/status")
def update_phase_status(project_id: int, phase_id: int, update_in: PhaseStatusUpdate, db: Session = Depends(get_db)):
    phase = db.query(ProjectPhase).filter(ProjectPhase.id == phase_id, ProjectPhase.project_id == project_id).first()
    if not phase:
        raise HTTPException(status_code=404, detail="Etapa no encontrada.")

    # Restricción Secuencial Estricta:
    if update_in.status in ["en_progreso", "completado"] and phase.phase_number > 1:
        prev_phases = db.query(ProjectPhase).filter(
            ProjectPhase.project_id == project_id,
            ProjectPhase.phase_number < phase.phase_number
        ).order_by(ProjectPhase.phase_number.asc()).all()
        for p in prev_phases:
            if p.status != "completado":
                raise HTTPException(
                    status_code=400,
                    detail=f"Acción Bloqueada: No puedes avanzar la Etapa {phase.phase_number} ('{phase.name}') porque la Etapa {p.phase_number} ('{p.name}') no ha sido culminada aún."
                )

    phase.status = update_in.status
    db.commit()
    return {"success": True, "message": f"Etapa '{phase.name}' actualizada a {phase.status}."}

class TaskToggleInput(BaseModel):
    task_index: int
    is_completed: bool

@router.put("/{project_id}/phases/{phase_id}/toggle-task")
def toggle_phase_task(project_id: int, phase_id: int, task_in: TaskToggleInput, db: Session = Depends(get_db)):
    phase = db.query(ProjectPhase).filter(ProjectPhase.id == phase_id, ProjectPhase.project_id == project_id).first()
    if not phase:
        raise HTTPException(status_code=404, detail="Etapa no encontrada.")

    # Verificar si etapa anterior fue completada si se intenta avanzar
    if task_in.is_completed and phase.phase_number > 1:
        prev_phases = db.query(ProjectPhase).filter(
            ProjectPhase.project_id == project_id,
            ProjectPhase.phase_number < phase.phase_number
        ).order_by(ProjectPhase.phase_number.asc()).all()
        for p in prev_phases:
            if p.status != "completado":
                raise HTTPException(
                    status_code=400,
                    detail=f"Acción Bloqueada: No puedes marcar tareas de la Etapa {phase.phase_number} porque la Etapa {p.phase_number} ('{p.name}') no ha sido culminada."
                )

    raw_desc = phase.description or ""
    tasks = [t.strip() for t in raw_desc.split(";") if t.strip()]
    if not tasks:
        tasks = [t.strip() for t in raw_desc.split("\n") if t.strip()]

    if 0 <= task_in.task_index < len(tasks):
        current_t = tasks[task_in.task_index]
        clean_t = current_t
        for pref in ["[x]", "[X]", "[ ]", "✅", "⏳"]:
            if clean_t.startswith(pref):
                clean_t = clean_t[len(pref):].strip()

        if task_in.is_completed:
            tasks[task_in.task_index] = f"[x] {clean_t}"
        else:
            tasks[task_in.task_index] = f"[ ] {clean_t}"

        phase.description = "; ".join(tasks)
        
        all_done = all(t.startswith("[x]") or t.startswith("[X]") for t in tasks)
        any_done = any(t.startswith("[x]") or t.startswith("[X]") for t in tasks)
        if all_done:
            phase.status = "completado"
        elif any_done:
            phase.status = "en_progreso"
        elif phase.status == "completado":
            phase.status = "en_progreso"

        db.commit()
        return {
            "success": True,
            "phase_status": phase.status,
            "tasks": tasks
        }
    raise HTTPException(status_code=400, detail="Índice de tarea inválido.")

class TaskCreateInput(BaseModel):
    task_name: str

@router.post("/{project_id}/phases/{phase_id}/tasks")
def add_phase_task(project_id: int, phase_id: int, payload: TaskCreateInput, db: Session = Depends(get_db)):
    phase = db.query(ProjectPhase).filter(ProjectPhase.id == phase_id, ProjectPhase.project_id == project_id).first()
    if not phase:
        raise HTTPException(status_code=404, detail="Etapa no encontrada.")
    
    clean_task = payload.task_name.strip()
    if not clean_task:
        raise HTTPException(status_code=400, detail="El nombre de la tarea no puede estar vacío.")
    
    for pref in ["[x]", "[X]", "[ ]", "✅", "⏳"]:
        if clean_task.startswith(pref):
            clean_task = clean_task[len(pref):].strip()
            
    raw_desc = phase.description or ""
    tasks = [t.strip() for t in raw_desc.split(";") if t.strip()]
    if not tasks and raw_desc.strip():
        tasks = [t.strip() for t in raw_desc.split("\n") if t.strip()]
        
    tasks.append(f"[ ] {clean_task}")
    phase.description = "; ".join(tasks)
    db.commit()
    return {
        "success": True,
        "message": f"Tarea '{clean_task}' agregada a la etapa '{phase.name}'.",
        "tasks": tasks
    }

@router.delete("/{project_id}/phases/{phase_id}/tasks/{task_index}")
def delete_phase_task(project_id: int, phase_id: int, task_index: int, db: Session = Depends(get_db)):
    phase = db.query(ProjectPhase).filter(ProjectPhase.id == phase_id, ProjectPhase.project_id == project_id).first()
    if not phase:
        raise HTTPException(status_code=404, detail="Etapa no encontrada.")
        
    raw_desc = phase.description or ""
    tasks = [t.strip() for t in raw_desc.split(";") if t.strip()]
    if not tasks and raw_desc.strip():
        tasks = [t.strip() for t in raw_desc.split("\n") if t.strip()]
        
    if 0 <= task_index < len(tasks):
        removed = tasks.pop(task_index)
        phase.description = "; ".join(tasks)
        if not tasks:
            phase.status = "pendiente"
        else:
            all_done = all(t.startswith("[x]") or t.startswith("[X]") for t in tasks)
            any_done = any(t.startswith("[x]") or t.startswith("[X]") for t in tasks)
            if all_done:
                phase.status = "completado"
            elif any_done:
                phase.status = "en_progreso"
            else:
                phase.status = "pendiente"
        db.commit()
        return {
            "success": True,
            "message": f"Tarea '{removed}' eliminada exitosamente.",
            "tasks": tasks
        }
    raise HTTPException(status_code=400, detail="Índice de tarea inválido.")

@router.get("/excel-template")
def download_excel_template():
    excel_stream = ExcelProjectService.generate_project_template()
    return Response(
        content=excel_stream.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=Plantilla_Creacion_Proyecto_DALOR.xlsx"}
    )

@router.post("/import-excel")
async def import_excel_project(file: UploadFile = File(...), db: Session = Depends(get_db)):
    contents = await file.read()
    try:
        project = ExcelProjectService.import_project_from_excel(contents, db)
        return {
            "success": True,
            "message": f"Proyecto {project.code} - '{project.name}' importado exitosamente desde Excel.",
            "project_id": project.id,
            "project_code": project.code,
            "contract_amount_usd": project.contract_amount_usd,
            "budget_limit_usd": project.budget_limit_usd
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error al procesar el archivo Excel: {str(e)}")

@router.put("/{project_id}")
@router.patch("/{project_id}")
def update_project(project_id: int, project_in: ProjectUpdate, db: Session = Depends(get_db)):
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado.")

    try:
        if project_in.name is not None and project_in.name.strip():
            proj.name = project_in.name.strip()
        if project_in.client_id is not None:
            proj.client_id = project_in.client_id
            client = db.query(Client).filter(Client.id == project_in.client_id).first()
            if client:
                proj.client_name = client.name
        elif project_in.client_name is not None:
            proj.client_name = project_in.client_name.strip()
        if project_in.location is not None:
            proj.location = project_in.location.strip()
        if project_in.status is not None:
            proj.status = project_in.status
        if project_in.scope_of_work is not None:
            proj.scope_of_work = project_in.scope_of_work
        if project_in.duration_days is not None:
            proj.duration_days = project_in.duration_days
        if project_in.execution_time is not None:
            exec_t = project_in.execution_time.strip()
            if "hábil" not in exec_t.lower() and "habil" not in exec_t.lower():
                exec_t = f"{exec_t} días hábiles"
            proj.execution_time = exec_t
        if project_in.contract_amount_usd is not None:
            proj.contract_amount_usd = float(project_in.contract_amount_usd or 0.0)
        if project_in.estimated_labor_usd is not None:
            proj.estimated_labor_usd = float(project_in.estimated_labor_usd or 0.0)
        if project_in.estimated_fuel_usd is not None:
            proj.estimated_fuel_usd = float(project_in.estimated_fuel_usd or 0.0)
        if project_in.estimated_materials_usd is not None:
            proj.estimated_materials_usd = float(project_in.estimated_materials_usd or 0.0)
        if project_in.estimated_tools_usd is not None:
            proj.estimated_tools_usd = float(project_in.estimated_tools_usd or 0.0)
        if project_in.estimated_services_usd is not None:
            proj.estimated_services_usd = float(project_in.estimated_services_usd or 0.0)

        # Recalcular límite presupuestario si los rubros cambiaron
        total_budget = (
            (proj.estimated_labor_usd or 0.0) +
            (proj.estimated_fuel_usd or 0.0) +
            (proj.estimated_materials_usd or 0.0) +
            (proj.estimated_tools_usd or 0.0) +
            (proj.estimated_services_usd or 0.0)
        )
        if total_budget > 0:
            proj.budget_limit_usd = total_budget

        # Si se envían fases válidas para actualización/reemplazo
        if project_in.phases is not None and len(project_in.phases) > 0:
            db.query(ProjectPhase).filter(ProjectPhase.project_id == project_id).delete()
            for idx, phase_data in enumerate(project_in.phases, start=1):
                d_unit = getattr(phase_data, "duration_unit", "dias") or "dias"
                e_dur = getattr(phase_data, "estimated_duration", None)
                if e_dur is None:
                    e_dur = float(phase_data.duration_days or 7.0)
                d_days = int(round(e_dur / 8.0)) if d_unit == "horas" else int(round(e_dur))
                d_days = max(1, d_days)
                new_p = ProjectPhase(
                    project_id=proj.id,
                    phase_number=idx,
                    name=phase_data.name or f"Fase {idx}",
                    description=phase_data.description or phase_data.name or "",
                    duration_days=d_days,
                    duration_unit=d_unit,
                    estimated_duration=e_dur,
                    estimated_cost_usd=float(phase_data.estimated_cost_usd or 0.0),
                    status=phase_data.status or "pendiente",
                    responsible_person=phase_data.responsible_person
                )
                db.add(new_p)

        # Asignación / Actualización de Personal en Re-edición
        if project_in.assigned_personnel_ids is not None:
            target_ids = set(project_in.assigned_personnel_ids)
            current_pers = db.query(Personnel).filter(Personnel.current_project_id == proj.id).all()
            for cp in current_pers:
                if cp.id not in target_ids:
                    cp.current_project_id = None
                    cp.status = "disponible_base"
                    cp.current_location = "Sede Guacara"
            for pers_id in target_ids:
                person = db.query(Personnel).filter(Personnel.id == pers_id).first()
                if person and person.current_project_id != proj.id:
                    person.current_project_id = proj.id
                    person.status = "en_obra"
                    person.current_location = proj.location or "En Obra"
                    hist = ResourceAssignmentHistory(
                        project_id=proj.id,
                        resource_type="personnel",
                        resource_id=person.id,
                        resource_code=person.code,
                        resource_name=person.full_name,
                        destination_location=proj.location or "En Obra",
                        status="en_obra",
                        notes="Personal asignado en re-edición de obra"
                    )
                    db.add(hist)

        # Asignación / Actualización de Vehículos en Re-edición
        if project_in.assigned_vehicle_ids is not None:
            target_v_ids = set(project_in.assigned_vehicle_ids)
            current_vehs = db.query(Asset).filter(Asset.current_project_id == proj.id, Asset.asset_type.in_(['vehiculo', 'camioneta'])).all()
            for cv in current_vehs:
                if cv.id not in target_v_ids:
                    cv.current_project_id = None
                    cv.status = "disponible_base"
                    cv.current_location = "Sede Guacara"
            for veh_id in target_v_ids:
                veh = db.query(Asset).filter(Asset.id == veh_id).first()
                if veh and veh.current_project_id != proj.id:
                    veh.current_project_id = proj.id
                    veh.status = "en_obra"
                    veh.current_location = proj.location or "En Obra"
                    a_code = getattr(veh, 'asset_code', None) or getattr(veh, 'code', None) or f"AST-{veh.id}"
                    hist = ResourceAssignmentHistory(
                        project_id=proj.id,
                        resource_type="asset",
                        resource_id=veh.id,
                        resource_code=a_code,
                        resource_name=veh.name,
                        destination_location=proj.location or "En Obra",
                        status="en_obra",
                        notes="Vehículo asignado en re-edición de obra"
                    )
                    db.add(hist)

        # Asignación / Actualización de Herramientas en Re-edición
        if project_in.assigned_tool_ids is not None:
            target_t_ids = set(project_in.assigned_tool_ids)
            current_tools = db.query(Asset).filter(Asset.current_project_id == proj.id, ~Asset.asset_type.in_(['vehiculo', 'camioneta'])).all()
            for ct in current_tools:
                if ct.id not in target_t_ids:
                    ct.current_project_id = None
                    ct.status = "disponible_base"
                    ct.current_location = "Sede Guacara"
            for tool_id in target_t_ids:
                tool = db.query(Asset).filter(Asset.id == tool_id).first()
                if tool and tool.current_project_id != proj.id:
                    tool.current_project_id = proj.id
                    tool.status = "en_obra"
                    tool.current_location = proj.location or "En Obra"
                    t_code = getattr(tool, 'asset_code', None) or getattr(tool, 'code', None) or f"AST-{tool.id}"
                    hist = ResourceAssignmentHistory(
                        project_id=proj.id,
                        resource_type="asset",
                        resource_id=tool.id,
                        resource_code=t_code,
                        resource_name=tool.name,
                        destination_location=proj.location or "En Obra",
                        status="en_obra",
                        notes="Herramienta asignada en re-edición de obra"
                    )
                    db.add(hist)

        # Registro de nuevos Insumos y Materiales agregados en Re-edición
        if getattr(project_in, 'assigned_material_items', None):
            existing_mats = db.query(ProjectMaterialRequisition).filter(ProjectMaterialRequisition.project_id == proj.id).all()
            existing_mat_ids = {m.material_id for m in existing_mats if m.material_id}
            for mat_item in project_in.assigned_material_items:
                m_id = mat_item.get("material_id")
                if not mat_item.get("is_existing") and (m_id is None or m_id not in existing_mat_ids):
                    qty = float(mat_item.get("quantity") or 1.0)
                    m_obj = db.query(Material).filter(Material.id == m_id).first() if m_id else None
                    m_name = (m_obj.name if m_obj else None) or mat_item.get("name") or "Material Requerido"
                    m_code = (m_obj.code if m_obj else None) or mat_item.get("code") or "MAT-REQ"
                    m_unit = (m_obj.unit_measure if m_obj else None) or mat_item.get("unit_measure") or "UND"
                    cost_est = (m_obj.unit_cost_usd or 0.0) * qty if m_obj else 0.0

                    req_rec = ProjectMaterialRequisition(
                        project_id=proj.id,
                        resource_type="material",
                        material_id=m_id,
                        material_code=m_code,
                        material_name=m_name,
                        unit_measure=m_unit,
                        quantity_required=qty,
                        quantity_dispatched=0.0,
                        estimated_cost_usd=round(cost_est, 2),
                        status="pendiente",
                        notes=mat_item.get("notes", "Agregado en re-edición de obra")
                    )
                    db.add(req_rec)

        db.commit()
        db.refresh(proj)
        return {
            "success": True,
            "message": f"Proyecto [{proj.code}] '{proj.name}' actualizado exitosamente.",
            "project": {
                "id": proj.id,
                "code": proj.code,
                "name": proj.name,
                "client_name": proj.client_name,
                "location": proj.location,
                "status": proj.status,
                "duration_days": proj.duration_days,
                "execution_time": proj.execution_time,
                "contract_amount_usd": proj.contract_amount_usd,
                "budget_limit_usd": proj.budget_limit_usd
            }
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error al actualizar el proyecto: {str(e)}")

class ProjectStatusUpdate(BaseModel):
    status: str

@router.put("/{project_id}/status")
def update_project_status(project_id: int, status_in: ProjectStatusUpdate, db: Session = Depends(get_db)):
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado.")
    proj.status = status_in.status

    released_assets_count = 0
    released_personnel_count = 0

    if status_in.status.lower() in ["culminado", "completado", "cerrado"]:
        # Auto-liberar activos asignados a la obra retornándolos a base central
        assigned_assets = db.query(Asset).filter(Asset.current_project_id == proj.id).all()
        for a in assigned_assets:
            a.status = "disponible_base"
            a.current_project_id = None
            a.current_custodian_name = "Disponible en Base"
            a.current_location = "Sede Central Dalor (Guacara)"
            released_assets_count += 1
            
            # Registrar bitácora de retorno
            history_asset = ResourceAssignmentHistory(
                project_id=proj.id,
                resource_type="asset",
                resource_id=a.id,
                resource_code=a.asset_code,
                resource_name=a.name,
                custodian_name="Custodio Base",
                origin_location=proj.location or "Planta / Obra",
                destination_location="Sede Central Dalor (Guacara)",
                status="disponible_base",
                notes=f"Liberación automática por culminación y cierre de obra {proj.code}"
            )
            db.add(history_asset)

        # Auto-liberar personal asignado a la obra retornándolos a base central
        assigned_personnel = db.query(Personnel).filter(Personnel.current_project_id == proj.id).all()
        for p in assigned_personnel:
            p.status = "disponible_base"
            p.current_project_id = None
            p.current_location = "Sede Central Dalor (Guacara)"
            released_personnel_count += 1
            
            history_pers = ResourceAssignmentHistory(
                project_id=proj.id,
                resource_type="personnel",
                resource_id=p.id,
                resource_code=p.code,
                resource_name=p.full_name,
                custodian_name="Base Central",
                origin_location=proj.location or "Planta / Obra",
                destination_location="Sede Central Dalor (Guacara)",
                status="disponible_base",
                notes=f"Liberación automática por culminación y cierre de obra {proj.code}"
            )
            db.add(history_pers)

    db.commit()
    msg = f"Estatus del proyecto {proj.code} actualizado a '{proj.status}'."
    if released_assets_count > 0 or released_personnel_count > 0:
        msg += f" Se liberaron {released_assets_count} activo(s) y {released_personnel_count} trabajador(es) a Base Central."
    return {
        "success": True,
        "message": msg,
        "released_assets": released_assets_count,
        "released_personnel": released_personnel_count
    }

class AdminAuthProjectDelete(BaseModel):
    admin_password: str
    reason: Optional[str] = "Inactivación solicitada por Administrador"

@router.delete("/{project_id}")
@router.post("/{project_id}/delete")
def delete_project(project_id: int, req: Optional[AdminAuthProjectDelete] = None, admin_password: Optional[str] = Query(None), db: Session = Depends(get_db)):
    pwd = (req.admin_password if req else None) or admin_password
    reason = (req.reason if req else None) or "Inactivación de obra solicitada por Administrador"

    from app.core.security import verify_password
    authorized = False
    director = db.query(User).filter(User.username == "director").first()
    if director and director.hashed_password and pwd and verify_password(pwd, director.hashed_password):
        authorized = True
    else:
        admin = db.query(User).filter(User.username == "admin").first()
        if admin and admin.hashed_password and pwd and verify_password(pwd, admin.hashed_password):
            authorized = True

    if not authorized:
        raise HTTPException(
            status_code=403,
            detail="Operación rechazada: Requiere la contraseña de Administrador / Director General para eliminar o inactivar la obra."
        )

    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado.")

    proj.is_active = False
    proj.status = "inactivo"

    spent_now = round(sum(e.amount_usd for e in proj.expenses if e.status == 'aprobado'), 2) if proj.expenses else 0.0
    audit = AuditLog(
        username="director",
        module="proyectos",
        action="inactivar_proyecto",
        details=f"INACTIVACIÓN DE OBRA [{proj.code}] '{proj.name}' (Cliente: {proj.client_name}). Motivo: {reason}. Costo acumulado al cierre: ${spent_now:,.2f} USD."
    )
    db.add(audit)
    db.commit()
    return {"success": True, "message": f"Proyecto [{proj.code}] inactivado exitosamente. Registro de auditoría guardado."}

# ------------------------------------------------------------------------------
# 🌐 PORTAL PÚBLICO DE SEGUIMIENTO PARA CLIENTES (100% CIEGO A COSTOS Y FINANZAS)
# ------------------------------------------------------------------------------
import secrets
public_router = APIRouter()

@router.post("/{project_id}/tracking-token")
def generate_project_tracking_token(project_id: int, db: Session = Depends(get_db)):
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado.")
    if not proj.tracking_token:
        proj.tracking_token = secrets.token_urlsafe(16)
        db.commit()
    return {
        "success": True,
        "project_id": proj.id,
        "project_code": proj.code,
        "tracking_token": proj.tracking_token,
        "tracking_url": f"/seguimiento/{proj.tracking_token}"
    }

@public_router.get("/public-tracking/{token_or_code}")
@public_router.get("/public-tracking/{token_or_code}/")
def get_public_project_tracking(token_or_code: str, db: Session = Depends(get_db)):
    # Buscar por token seguro o código de proyecto
    proj = db.query(Project).filter(
        (Project.tracking_token == token_or_code) | (Project.code == token_or_code),
        Project.is_active == True
    ).first()
    
    if not proj:
        raise HTTPException(status_code=404, detail="Proyecto o enlace de seguimiento no encontrado.")

    # Calcular progreso físico sin exponer ningún costo
    total_tasks = 0
    completed_tasks = 0
    phases_out = []
    
    if proj.phases:
        for ph in proj.phases:
            raw_tasks = [t.strip() for t in (ph.description or "").split(";") if t.strip()]
            if not raw_tasks and (ph.description or "").strip():
                raw_tasks = [t.strip() for t in ph.description.split("\n") if t.strip()]
            
            phase_tasks = []
            for t in raw_tasks:
                is_done = t.startswith("[x]") or t.startswith("[X]") or "✅" in t
                clean_title = t
                for pref in ["[x]", "[X]", "[ ]", "✅", "⏳"]:
                    if clean_title.startswith(pref):
                        clean_title = clean_title[len(pref):].strip()
                phase_tasks.append({
                    "title": clean_title,
                    "completed": is_done
                })
                total_tasks += 1
                if is_done:
                    completed_tasks += 1

            phases_out.append({
                "phase_number": ph.phase_number,
                "name": ph.name,
                "status": ph.status,
                "duration_days": ph.duration_days,
                "responsible_person": ph.responsible_person or "Equipo de Operaciones",
                "tasks": phase_tasks
            })

    prog_pct = round((completed_tasks / total_tasks * 100), 1) if total_tasks > 0 else (100.0 if proj.status == "completado" else 0.0)

    return {
        "success": True,
        "project_code": proj.code,
        "project_name": proj.name,
        "client_name": proj.client_name or (proj.client.name if proj.client else "Cliente Industrial"),
        "location": proj.location,
        "status": proj.status,
        "scope_of_work": proj.scope_of_work,
        "start_date": proj.start_date.strftime("%d/%m/%Y") if proj.start_date else "Pendiente",
        "end_date": proj.end_date.strftime("%d/%m/%Y") if proj.end_date else "Estimada según cronograma",
        "duration_days": proj.duration_days,
        "execution_time": proj.execution_time or f"{proj.duration_days} días continuos",
        "progress_pct": prog_pct,
        "phases": phases_out,
        "company_info": {
            "name": "METALMECÁNICA DALOR C.A.",
            "rif": "J-31601195-0",
            "partner": "METALMECÁNICA DALOR C.A.",
            "tagline": "Ingeniería, Fabricación y Mantenimiento Industrial Especializado"
        }
    }

class ProjectDispatchRequest(BaseModel):
    assigned_personnel_ids: List[int] = []
    assigned_vehicle_ids: List[int] = []
    assigned_tool_ids: List[int] = []
    materials: List[dict] = []
    notes: Optional[str] = None
    destination_address: Optional[str] = None
    is_internal: Optional[bool] = False
    driver_id: Optional[int] = None
    driver_name: Optional[str] = None
    driver_id_doc: Optional[str] = None
    delivered_by_staff: Optional[str] = None
    received_by_staff: Optional[str] = None

@router.post("/{project_id}/request-dispatch")
def request_project_dispatch(project_id: int, req: ProjectDispatchRequest, db: Session = Depends(get_db)):
    from app.models.models import DispatchGuide, DispatchGuideItem, Material, MaterialMovement
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado.")
    
    if proj.status == "culminado":
        from app.models.models import ProjectAddendum
        has_addendum = db.query(ProjectAddendum).filter(ProjectAddendum.project_id == proj.id).first()
        if not has_addendum:
            raise HTTPException(
                status_code=400,
                detail=f"La obra [{proj.code}] '{proj.name}' se encuentra CULMINADA y cerrada. No se permite solicitar ni despachar insumos sin una adenda contractual aprobada."
            )

    dest_loc = req.destination_address or proj.location or "En Obra"
    dispatch_items = []

    # 1. Asignar Personal
    for pers_id in req.assigned_personnel_ids:
        p = db.query(Personnel).filter(Personnel.id == pers_id).first()
        if not p:
            raise HTTPException(status_code=404, detail=f"Personal con ID {pers_id} no encontrado.")
        if p.current_project_id and p.current_project_id != proj.id:
            assigned_proj = db.query(Project).filter(Project.id == p.current_project_id).first()
            p_code = assigned_proj.code if assigned_proj else f"ID {p.current_project_id}"
            raise HTTPException(
                status_code=400,
                detail=f"El trabajador [{p.code}] {p.full_name} ya está asignado a otra obra [{p_code}]. Si requiere trasladarlo a esta obra, debe solicitarse mediante 'Transferencia entre Obras'."
            )
        if p.current_project_id != proj.id and (p.is_active is False or (p.status or "").lower() not in ["disponible_base", "disponible"]):
            raise HTTPException(
                status_code=400,
                detail=f"El trabajador [{p.code}] {p.full_name} no está disponible en base (Estado actual: '{p.status or 'no disponible'}')."
            )
        p.current_project_id = proj.id
        p.status = "en_obra"
        p.current_location = dest_loc
        hist = ResourceAssignmentHistory(
            project_id=proj.id,
            resource_type="personnel",
            resource_id=p.id,
            resource_code=p.code,
            resource_name=p.full_name,
            destination_location=dest_loc,
            status="en_obra",
            notes=req.notes or "Despacho solicitado para obra"
        )
        db.add(hist)
        dispatch_items.append(DispatchGuideItem(
            description=f"Personal Operativo: [{p.code}] {p.full_name} ({p.role_title or 'Técnico'})",
            quantity=1.0,
            unit="Persona",
            condition_status="Operativo en Faena"
        ))

    # 2. Asignar Vehículos
    for veh_id in req.assigned_vehicle_ids:
        a = db.query(Asset).filter(Asset.id == veh_id).first()
        if not a:
            raise HTTPException(status_code=404, detail=f"Vehículo con ID {veh_id} no encontrado.")
        if a.current_project_id and a.current_project_id != proj.id:
            assigned_proj = db.query(Project).filter(Project.id == a.current_project_id).first()
            p_code = assigned_proj.code if assigned_proj else f"ID {a.current_project_id}"
            raise HTTPException(
                status_code=400,
                detail=f"El vehículo [{a.asset_code}] {a.name} ya está asignado a otra obra [{p_code}]. Si se encuentra en otra obra, debe solicitarse mediante 'Transferencia entre Obras'."
            )
        if a.current_project_id != proj.id and (a.is_active is False or (a.status or "").lower() not in ["disponible_base", "disponible"]):
            raise HTTPException(
                status_code=400,
                detail=f"El vehículo [{a.asset_code}] {a.name} no está disponible en base (Estado actual: '{a.status or 'no disponible'}')."
            )
        a.current_project_id = proj.id
        a.status = "en_obra"
        a.current_location = dest_loc
        hist = ResourceAssignmentHistory(
            project_id=proj.id,
            resource_type="asset",
            resource_id=a.id,
            resource_code=a.asset_code,
            resource_name=a.name,
            start_odometer=a.current_odometer,
            destination_location=dest_loc,
            status="en_obra",
            notes=req.notes or "Vehículo asignado a obra"
        )
        db.add(hist)
        dispatch_items.append(DispatchGuideItem(
            description=f"Unidad de Flota: [{a.asset_code}] {a.name} (Placa: {a.license_plate or 'S/P'})",
            quantity=1.0,
            unit="Unidad",
            condition_status="Operativo"
        ))

    # 3. Asignar Herramientas
    for tool_id in req.assigned_tool_ids:
        t = db.query(Asset).filter(Asset.id == tool_id).first()
        if not t:
            raise HTTPException(status_code=404, detail=f"Herramienta/Equipo con ID {tool_id} no encontrado.")
        if t.current_project_id and t.current_project_id != proj.id:
            assigned_proj = db.query(Project).filter(Project.id == t.current_project_id).first()
            p_code = assigned_proj.code if assigned_proj else f"ID {t.current_project_id}"
            raise HTTPException(
                status_code=400,
                detail=f"El equipo/herramienta [{t.asset_code}] {t.name} ya está asignado a otra obra [{p_code}]. Si se encuentra en otra obra, debe solicitarse mediante 'Transferencia entre Obras'."
            )
        if t.current_project_id != proj.id and (t.is_active is False or (t.status or "").lower() not in ["disponible_base", "disponible"]):
            raise HTTPException(
                status_code=400,
                detail=f"El equipo/herramienta [{t.asset_code}] {t.name} no está disponible en base (Estado actual: '{t.status or 'no disponible'}')."
            )
        t.current_project_id = proj.id
        t.status = "en_obra"
        t.current_location = dest_loc
        hist = ResourceAssignmentHistory(
            project_id=proj.id,
            resource_type="asset",
            resource_id=t.id,
            resource_code=t.asset_code,
            resource_name=t.name,
            destination_location=dest_loc,
            status="en_obra",
            notes=req.notes or "Herramienta despachada a obra"
        )
        db.add(hist)
        dispatch_items.append(DispatchGuideItem(
            description=f"Equipo/Herramienta: [{t.asset_code}] {t.name} (Serial: {t.serial_number or 'S/N'})",
            quantity=1.0,
            unit="Pza",
            condition_status="En Uso Operativo"
        ))

    # 4. Materiales Solicitados
    for mat_item in req.materials:
        mid = mat_item.get("material_id")
        qty = float(mat_item.get("quantity") or 0.0)
        if mid and qty > 0:
            m = db.query(Material).filter(Material.id == mid).first()
            if m:
                if m.stock_quantity < qty:
                    raise HTTPException(status_code=400, detail=f"Stock insuficiente para material [{m.code}] {m.name}. Stock disponible: {m.stock_quantity} {m.unit_measure}.")
                m.stock_quantity -= qty
                mov = MaterialMovement(
                    material_id=m.id,
                    project_id=proj.id,
                    movement_type="despacho_obra",
                    quantity=qty,
                    unit_cost_usd=m.unit_cost_usd or 0.0,
                    total_cost_usd=round(qty * (m.unit_cost_usd or 0.0), 2),
                    reference_doc=f"Solicitud Obra {proj.code}",
                    notes=req.notes or "Despacho a obra",
                    performed_by="Solicitud de Proyecto"
                )
                db.add(mov)

                # Actualizar o crear registro de requisición en la obra para reflejar cantidad despachada
                req_mat = db.query(ProjectMaterialRequisition).filter(
                    ProjectMaterialRequisition.project_id == proj.id,
                    ProjectMaterialRequisition.material_id == m.id
                ).first()
                if req_mat:
                    req_mat.quantity_dispatched = (req_mat.quantity_dispatched or 0.0) + qty
                    if req_mat.quantity_dispatched >= (req_mat.quantity_required or 0.0):
                        req_mat.status = "despachado_total"
                    else:
                        req_mat.status = "despachado_parcial"
                else:
                    new_req_mat = ProjectMaterialRequisition(
                        project_id=proj.id,
                        material_id=m.id,
                        material_code=m.code,
                        material_name=m.name,
                        unit_measure=m.unit_measure or "UND",
                        quantity_required=qty,
                        quantity_dispatched=qty,
                        status="despachado_total",
                        notes=req.notes or "Despachado a obra"
                    )
                    db.add(new_req_mat)

                dispatch_items.append(DispatchGuideItem(
                    description=f"Material: [{m.code}] {m.name}",
                    quantity=qty,
                    unit=m.unit_measure or "UND",
                    condition_status="Nuevo / Conforme"
                ))

    # 5. Generar la Guía de Despacho vinculada (GCI para sede, GD para foránea)
    if dispatch_items:
        current_year = datetime.utcnow().year
        is_internal = bool(req.is_internal)
        proj_loc_lower = (proj.location or "").lower()
        if not is_internal and any(w in proj_loc_lower for w in ["sede", "guacara", "taller"]):
            # Si la ubicación del proyecto es sede y no se forzó otra cosa, tratar como interno
            if not req.driver_id and not req.driver_name and not req.assigned_vehicle_ids:
                is_internal = True

        prefix = f"GCI-{current_year}" if is_internal else f"GD-{current_year}"
        existing_count = db.query(DispatchGuide).filter(DispatchGuide.guide_number.like(f"{prefix}-%")).count() + 1
        guide_code = f"{prefix}-{existing_count:04d}" if is_internal else f"{prefix}-{existing_count:03d}"
        while db.query(DispatchGuide).filter(DispatchGuide.guide_number == guide_code).first():
            existing_count += 1
            guide_code = f"{prefix}-{existing_count:04d}" if is_internal else f"{prefix}-{existing_count:03d}"

        # Asignar item_number secuencial a cada ítem de la guía
        for idx, itm in enumerate(dispatch_items):
            itm.item_number = idx + 1

        if is_internal:
            # Control Interno: Sede / Taller Guacara. Sin chofer ni vehículo.
            guide = DispatchGuide(
                guide_number=guide_code,
                guide_type="control_interno",
                project_id=proj.id,
                client_id=proj.client_id,
                transfer_reason=f"Control Interno Sede / Taller [{proj.code}] {proj.name}",
                destination_address=dest_loc,
                destination_plant=proj.name or "Taller Guacara / Sede",
                transport_type="traslado_interno",
                asset_id=None,
                vehicle_plate="INTERNO",
                vehicle_model="Uso Interno en Sede",
                carrier_company="Control Interno DALOR",
                driver_name="Traslado Interno en Planta",
                driver_id_doc="INTERNO",
                delivered_by_staff=req.delivered_by_staff or "Almacén Central DALOR (Guacara)",
                received_by_staff=req.received_by_staff or "Taller Guacara / Cuadrilla",
                status="emitida",
                notes=req.notes or "Movimiento interno registrado desde Ficha de Obra",
                items=dispatch_items
            )
        else:
            # Guía Oficial de Despacho (GD): Traslado Foráneo a Cliente.
            # Chofer debe ser seleccionado explícitamente (NUNCA predeterminado automáticamente)
            driver_name_val = "Sin Conductor Asignado"
            driver_id_doc_val = "S/D"
            if req.driver_id:
                driver_p = db.query(Personnel).filter(Personnel.id == req.driver_id).first()
                if driver_p:
                    driver_name_val = driver_p.full_name
                    driver_id_doc_val = getattr(driver_p, "identification_id", None) or getattr(driver_p, "id_document", None) or "V-DALOR"
            elif req.driver_name and req.driver_name.strip():
                driver_name_val = req.driver_name.strip()
                driver_id_doc_val = req.driver_id_doc or "V-00000000"

            first_veh = db.query(Asset).filter(Asset.id.in_(req.assigned_vehicle_ids)).first() if req.assigned_vehicle_ids else None

            guide = DispatchGuide(
                guide_number=guide_code,
                guide_type="traslado_externo",
                project_id=proj.id,
                client_id=proj.client_id,
                transfer_reason=f"Despacho Operativo para Obra [{proj.code}] {proj.name}",
                destination_address=dest_loc,
                destination_plant=proj.client_name or "Planta Cliente",
                transport_type="propio_dalor",
                asset_id=first_veh.id if first_veh else None,
                vehicle_plate=first_veh.license_plate if first_veh and first_veh.license_plate else "S/P",
                vehicle_model=f"{first_veh.brand or ''} {first_veh.name}" if first_veh else "Transporte DALOR",
                driver_name=driver_name_val,
                driver_id_doc=driver_id_doc_val,
                delivered_by_staff=req.delivered_by_staff or "Almacén Central DALOR",
                received_by_staff=req.received_by_staff or "Receptor en Obra",
                status="emitida",
                notes=req.notes or "Solicitud de despacho originada desde la Ficha de Obra",
                items=dispatch_items
            )
        db.add(guide)

    db.commit()
    guide_code_ret = guide.guide_number if (dispatch_items and 'guide' in locals()) else None
    guide_id_ret = guide.id if (dispatch_items and 'guide' in locals()) else None
    guide_type_ret = guide.guide_type if (dispatch_items and 'guide' in locals()) else "traslado_externo"

    doc_label = "Vale de Control Interno" if guide_type_ret == "control_interno" else "Guía de Despacho Oficial"
    return {
        "success": True,
        "message": f"Solicitud procesada exitosamente para la obra {proj.code}." + (f" Se emitió el {doc_label} N° {guide_code_ret}." if guide_code_ret else ""),
        "guide_number": guide_code_ret,
        "guide_id": guide_id_ret,
        "guide_type": guide_type_ret,
        "items_count": len(dispatch_items)
    }

class MaterialReturnRequest(BaseModel):
    material_id: int
    quantity: float
    notes: Optional[str] = None
    returned_by: Optional[str] = "Responsable de Obra"

@router.post("/{project_id}/return-material")
def return_project_material(project_id: int, req: MaterialReturnRequest, db: Session = Depends(get_db)):
    from app.models.models import MaterialMovement, Material
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado.")

    mat = db.query(Material).filter(Material.id == req.material_id).first()
    if not mat:
        raise HTTPException(status_code=404, detail="Material no encontrado.")

    if req.quantity <= 0:
        raise HTTPException(status_code=400, detail="La cantidad a devolver debe ser mayor a 0.")

    # Validar que no se intente devolver más de lo despachado a esta obra
    from app.models.models import ProjectMaterialRequisition
    req_item = db.query(ProjectMaterialRequisition).filter(
        ProjectMaterialRequisition.project_id == project_id,
        ProjectMaterialRequisition.material_id == req.material_id
    ).first()
    if not req_item or (float(req_item.quantity_dispatched or 0.0) <= 0):
        raise HTTPException(
            status_code=400,
            detail=f"Operación rechazada: El material [{mat.code}] '{mat.name}' no cuenta con registros de despacho para esta obra."
        )

    max_disp = float(req_item.quantity_dispatched or 0.0)
    if req.quantity > (max_disp + 0.001):
        raise HTTPException(
            status_code=400,
            detail=f"Operación rechazada: No puedes devolver {req.quantity} {mat.unit_measure or 'UND'}. La cantidad máxima despachada a esta obra es {max_disp} {mat.unit_measure or 'UND'}."
        )
    req_item.quantity_dispatched = max(0.0, round(max_disp - req.quantity, 2))
    req_item.quantity_required = max(0.0, round((req_item.quantity_required or 0.0) - req.quantity, 2))
    req_item.estimated_cost_usd = max(0.0, round(req_item.quantity_required * (mat.unit_cost_usd or 0.0), 2))
    if req_item.quantity_required == 0 and req_item.quantity_dispatched == 0:
        req_item.status = "devuelto_total"
    elif req_item.quantity_dispatched == 0:
        req_item.status = "pendiente"
    elif req_item.quantity_dispatched < (req_item.quantity_required or 0.0):
        req_item.status = "despachado_parcial"
    else:
        req_item.status = "despachado_total"

    # Incrementar stock en almacén central y actualizar valoración total de inventario
    mat.stock_quantity = round((mat.stock_quantity or 0.0) + req.quantity, 2)
    mat.total_cost_usd = round(mat.stock_quantity * (mat.unit_cost_usd or 0.0), 2)

    # Descontar monto del material devuelto del costo de materiales de la obra y su límite presupuestario
    returned_amount = round(req.quantity * (mat.unit_cost_usd or 0.0), 2)
    proj.estimated_materials_usd = max(0.0, round((proj.estimated_materials_usd or 0.0) - returned_amount, 2))
    proj.budget_limit_usd = round(
        (proj.estimated_labor_usd or 0.0) +
        (proj.estimated_fuel_usd or 0.0) +
        (proj.estimated_materials_usd or 0.0) +
        (proj.estimated_tools_usd or 0.0) +
        (proj.estimated_services_usd or 0.0), 2
    )

    # Reintegrar / descontar el costo real imputado a la obra en Gastos / Job Costing
    from app.models.models import Expense, ExpenseCategory, AuditLog
    remaining_to_discount = returned_amount
    dispatch_expenses = (
        db.query(Expense)
        .filter(
            Expense.project_id == proj.id,
            Expense.payment_method == "consumo_inventario",
            Expense.status == "aprobado"
        )
        .order_by(Expense.id.desc())
        .all()
    )

    for de in dispatch_expenses:
        if remaining_to_discount <= 0:
            break
        if de.amount_usd > 0:
            deduct = min(de.amount_usd, remaining_to_discount)
            de.amount_usd = round(de.amount_usd - deduct, 2)
            de.base_amount_usd = de.amount_usd
            de.amount_bs = round(de.amount_usd * (de.exchange_rate or 800.0), 2)
            return_note = f"Devolución: -{req.quantity} {mat.unit_measure or 'UND'} de [{mat.code}] {mat.name} (-${deduct:.2f} USD)"
            de.alert_notes = f"{de.alert_notes or ''} | {return_note}".strip(" |")
            remaining_to_discount = round(remaining_to_discount - deduct, 2)

    # Si no había gastos de despacho previos o quedó saldo remanente, registrar crédito/reintegro de gasto
    if remaining_to_discount > 0:
        cat = db.query(ExpenseCategory).filter(
            (ExpenseCategory.name.ilike("%Insumos%")) | (ExpenseCategory.name.ilike("%Materiales%"))
        ).first() or db.query(ExpenseCategory).first()
        credit_exp = Expense(
            category_id=cat.id if cat else 1,
            project_id=proj.id,
            expense_type="costo_obra",
            description=f"Reintegro por Devolución de Material a Almacén: [{mat.code}] {mat.name} ({req.quantity} {mat.unit_measure or 'UND'}) - Obra {proj.code}",
            supplier_vendor="Almacén Central Dalor",
            amount_usd=-remaining_to_discount,
            base_amount_usd=-remaining_to_discount,
            amount_bs=-round(remaining_to_discount * 800.0, 2),
            exchange_rate=800.0,
            payment_method="consumo_inventario",
            status="aprobado",
            has_receipt=False,
            alert_notes=f"Devolución formal de insumo a almacén central"
        )
        db.add(credit_exp)

    # Registrar movimiento formal de devolución de obra a almacén
    mov = MaterialMovement(
        material_id=mat.id,
        project_id=proj.id,
        movement_type="devolucion_obra",
        quantity=req.quantity,
        unit_cost_usd=mat.unit_cost_usd or 0.0,
        total_cost_usd=returned_amount,
        reference_doc=f"Devolución Obra {proj.code}",
        notes=req.notes or f"Devolución de excedente desde obra {proj.code} a almacén central",
        performed_by=req.returned_by or "Responsable de Obra"
    )
    db.add(mov)

    # Auditoría visible
    audit_entry = AuditLog(
        username=req.returned_by or "almacen",
        module="proyectos",
        action="devolucion_material",
        details=f"Devolución de {req.quantity} {mat.unit_measure or 'UND'} de [{mat.code}] {mat.name} al Almacén Central desde obra {proj.code}. Reintegro contable: -${returned_amount:,.2f} USD."
    )
    db.add(audit_entry)
    db.commit()
    return {
        "success": True,
        "message": f"Se devolvieron exitosamente {req.quantity} {mat.unit_measure or 'UND'} de [{mat.code}] {mat.name} al almacén central. Se reintegraron ${returned_amount} USD al costo de la obra.",
        "new_stock": mat.stock_quantity,
        "new_project_materials_usd": proj.estimated_materials_usd
    }


class MaterialSubstituteRequest(BaseModel):
    requisition_id: int
    new_material_id: int
    reason: Optional[str] = "Sustitución técnica de material en obra"
    notes: Optional[str] = None

@router.post("/{project_id}/substitute-material")
def substitute_project_material(project_id: int, req: MaterialSubstituteRequest, db: Session = Depends(get_db)):
    from app.models.models import ProjectMaterialRequisition, Material
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado.")

    req_item = db.query(ProjectMaterialRequisition).filter(
        ProjectMaterialRequisition.id == req.requisition_id,
        ProjectMaterialRequisition.project_id == proj.id
    ).first()
    if not req_item:
        raise HTTPException(status_code=404, detail="Requisición de material no encontrada en este proyecto.")

    from app.models.models import Asset
    new_mat = db.query(Material).filter(Material.id == req.new_material_id).first()
    new_asset = None
    if not new_mat:
        new_asset = db.query(Asset).filter(Asset.id == req.new_material_id).first()
    if not new_mat and not new_asset:
        raise HTTPException(status_code=404, detail="Nuevo insumo no encontrado en catálogo de materiales ni activos.")

    old_mat = req_item.material
    old_mat_name = req_item.material_name or (old_mat.name if old_mat else f"ID {req_item.material_id}")
    old_mat_code = req_item.material_code or (old_mat.code if old_mat else "MAT")

    if new_mat:
        req_item.material_id = new_mat.id
        req_item.material_code = new_mat.code
        req_item.material_name = new_mat.name
        req_item.resource_type = "material"
        if new_mat.unit_measure:
            req_item.unit_measure = new_mat.unit_measure
        if new_mat.unit_cost_usd:
            req_item.estimated_cost_usd = round((req_item.quantity_required or 1.0) * new_mat.unit_cost_usd, 2)
        target_code = new_mat.code
        target_name = new_mat.name
    else:
        req_item.material_id = None
        req_item.material_code = new_asset.asset_code
        req_item.material_name = new_asset.name
        req_item.resource_type = new_asset.asset_type or "herramienta"
        req_item.resource_id = new_asset.id
        req_item.unit_measure = "UND"
        target_code = new_asset.asset_code
        target_name = new_asset.name

    append_note = f"[Sustituido: {old_mat_code} {old_mat_name} por {target_code} - {target_name}. Motivo: {req.reason}]"
    req_item.notes = f"{req_item.notes or ''} {append_note}".strip()

    db.commit()
    return {
        "success": True,
        "message": f"Insumo sustituido exitosamente: [{old_mat_code}] {old_mat_name} reemplazado por [{target_code}] {target_name}.",
        "requisition_id": req_item.id,
        "new_material": {
            "id": new_mat.id if new_mat else new_asset.id,
            "code": target_code,
            "name": target_name,
            "unit_measure": req_item.unit_measure
        }
    }


class ProjectResourceSubstituteRequest(BaseModel):
    resource_type: str
    old_id: int
    new_id: int
    reason: Optional[str] = "Reemplazo operativo en obra"
    notes: Optional[str] = None

@router.post("/{project_id}/substitute-resource")
def substitute_project_resource(project_id: int, req: ProjectResourceSubstituteRequest, db: Session = Depends(get_db)):
    from app.api.v1.endpoints.resources import ResourceSubstituteRequest, substitute_resource
    res_req = ResourceSubstituteRequest(
        project_id=project_id,
        resource_type=req.resource_type,
        old_id=req.old_id,
        new_id=req.new_id,
        reason=req.reason,
        notes=req.notes
    )
    return substitute_resource(res_req, db)


