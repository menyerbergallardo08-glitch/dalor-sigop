from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Response, Query
from sqlalchemy.orm import Session, joinedload, selectinload
from typing import List, Optional
from datetime import datetime, timedelta
import re
from sqlalchemy import func
from app.core.database import get_db
from app.models.models import (
    Project, Client, Expense, ProjectPhase, Asset, Personnel, 
    ResourceAssignmentHistory, AccountReceivable, AccountPayable, 
    FinancialPayment, ProjectAddendum, AuditLog, Material, 
    ProjectMaterialRequisition, MaterialMovement, User
)
from app.schemas.schemas import ProjectCreate, ProjectUpdate, ProjectOut, ProjectAddendumCreate, ProjectAddendumOut
from app.services.excel_service import ExcelProjectService
from .projects_common import *

router = APIRouter()


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
