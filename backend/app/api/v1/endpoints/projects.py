from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List, Optional
import uuid

from app.core.database import get_db
from app.models.models import (
    Project, ProjectPhase, Expense, Client, Asset, Personnel,
    ResourceAssignmentHistory, Quotation, QuotationItem, MaterialMovement, AccountReceivable
)
from app.schemas.schemas import ProjectCreate, ProjectOut

router = APIRouter()

@router.get("/")
def get_projects(db: Session = Depends(get_db)):
    projects = db.query(Project).filter(Project.is_active == True).order_by(Project.created_at.desc()).all()
    results = []
    for p in projects:
        expenses = db.query(Expense).filter(Expense.project_id == p.id).all()
        total_spent = sum(e.amount_usd for e in expenses)

        phases = p.phases
        total_phases = len(phases)
        completed_phases = sum(1 for ph in phases if ph.status == "completado")
        progress_pct = int((completed_phases / total_phases * 100)) if total_phases > 0 else 0

        assigned_assets_count = db.query(Asset).filter(Asset.current_project_id == p.id, Asset.is_active == True).count()
        assigned_pers_count = db.query(Personnel).filter(Personnel.current_project_id == p.id, Personnel.is_active == True).count()

        results.append({
            "id": p.id,
            "code": p.code,
            "name": p.name,
            "client_id": p.client_id,
            "client_name": p.client_name,
            "location": p.location,
            "status": p.status,
            "progress_pct": progress_pct,
            "scope_of_work": p.scope_of_work,
            "duration_days": p.duration_days,
            "execution_time": p.execution_time,
            "contract_amount_usd": p.contract_amount_usd or 0.0,
            "budget_limit_usd": p.budget_limit_usd or 0.0,
            "total_spent_usd": round(total_spent, 2),
            "remaining_budget_usd": round((p.budget_limit_usd or 0.0) - total_spent, 2),
            "tracking_token": p.tracking_token,
            "created_at": p.created_at.strftime("%Y-%m-%d") if p.created_at else "",
            "assigned_resources_count": assigned_assets_count + assigned_pers_count
        })
    return results

@router.get("/{project_id}/details")
def get_project_details(project_id: int, db: Session = Depends(get_db)):
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado.")

    assigned_assets = db.query(Asset).filter(Asset.current_project_id == project_id, Asset.is_active == True).all()
    assigned_personnel = db.query(Personnel).filter(Personnel.current_project_id == project_id, Personnel.is_active == True).all()
    
    dispatched_materials_db = db.query(MaterialMovement).filter(
        MaterialMovement.project_id == project_id,
        MaterialMovement.movement_type == "despacho_obra"
    ).order_by(MaterialMovement.movement_date.desc()).all()
    
    dispatched_materials = [
        {
            "id": m.id,
            "material_code": m.material.code if m.material else "N/A",
            "material_name": m.material.name if m.material else "N/A",
            "quantity": m.quantity,
            "unit_measure": m.material.unit_measure if m.material else "UND",
            "unit_cost_usd": m.unit_cost_usd or 0.0,
            "total_cost_usd": m.total_cost_usd or 0.0,
            "movement_date": m.movement_date.strftime("%d/%m/%Y %H:%M") if m.movement_date else "-",
            "reference_doc": m.reference_doc or "-",
            "performed_by": m.performed_by or "Almacen"
        } for m in dispatched_materials_db
    ]

    expenses = db.query(Expense).filter(Expense.project_id == project_id).all()
    total_spent = sum(e.amount_usd for e in expenses)

    return {
        "id": proj.id,
        "code": proj.code,
        "name": proj.name,
        "client_id": proj.client_id,
        "client_name": proj.client_name,
        "location": proj.location,
        "status": proj.status,
        "scope_of_work": proj.scope_of_work,
        "duration_days": proj.duration_days,
        "contract_amount_usd": proj.contract_amount_usd or 0.0,
        "budget_limit_usd": proj.budget_limit_usd or 0.0,
        "total_spent_usd": round(total_spent, 2),
        "gross_margin_usd": round((proj.contract_amount_usd or 0.0) - total_spent, 2),
        "phases": [
            {
                "id": ph.id,
                "phase_number": ph.phase_number,
                "name": ph.name,
                "description": ph.description,
                "duration_days": ph.duration_days,
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
        "dispatched_materials": dispatched_materials
    }

@router.post("/")
@router.post("/", response_model=ProjectOut)
def create_project(project_in: ProjectCreate, db: Session = Depends(get_db)):
    existing = db.query(Project).filter(Project.code == project_in.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe un proyecto con ese codigo.")
    
    total_budget = (
        (project_in.estimated_labor_usd or 0.0) +
        (project_in.estimated_fuel_usd or 0.0) +
        (project_in.estimated_materials_usd or 0.0) +
        (project_in.estimated_tools_usd or 0.0) +
        (project_in.estimated_services_usd or 0.0)
    )

    client_obj = db.query(Client).filter(Client.id == project_in.client_id).first()
    client_name = client_obj.name if client_obj else "Cliente General"

    tracking_token = uuid.uuid4().hex[:16]

    new_project = Project(
        code=project_in.code.strip().upper(),
        name=project_in.name.strip(),
        client_id=project_in.client_id,
        client_name=client_name,
        location=project_in.location.strip(),
        status="planificado",
        duration_days=project_in.duration_days,
        execution_time=f"{project_in.duration_days} dias calendario",
        contract_amount_usd=project_in.contract_amount_usd or 0.0,
        estimated_labor_usd=project_in.estimated_labor_usd or 0.0,
        estimated_fuel_usd=project_in.estimated_fuel_usd or 0.0,
        estimated_materials_usd=project_in.estimated_materials_usd or 0.0,
        estimated_tools_usd=project_in.estimated_tools_usd or 0.0,
        estimated_services_usd=project_in.estimated_services_usd or 0.0,
        budget_limit_usd=total_budget,
        scope_of_work=project_in.scope_of_work,
        tracking_token=tracking_token,
        is_active=True,
        created_at=datetime.utcnow()
    )
    db.add(new_project)
    db.flush()

    try:
        # Fases/Etapas de Obra
        if project_in.phases:
            for idx, ph in enumerate(project_in.phases, start=1):
                phase_record = ProjectPhase(
                    project_id=new_project.id,
                    phase_number=idx,
                    name=ph.name,
                    description=ph.description,
                    duration_days=ph.duration_days,
                    estimated_cost_usd=ph.estimated_cost_usd,
                    status="pendiente",
                    responsible_person=ph.responsible_person
                )
                db.add(phase_record)

        # Asignar Personal Seleccionado -> Marcar status en_obra
        if project_in.assigned_personnel_ids:
            for pers_id in project_in.assigned_personnel_ids:
                person = db.query(Personnel).filter(Personnel.id == pers_id).first()
                if person:
                    person.current_project_id = new_project.id
                    person.status = "en_obra"
                    person.current_location = new_project.location
                    hist = ResourceAssignmentHistory(
                        project_id=new_project.id,
                        resource_type="personal",
                        resource_id=person.id,
                        resource_code=person.code,
                        resource_name=person.full_name,
                        custodian_name=person.full_name,
                        origin_location="Sede Central",
                        destination_location=new_project.location,
                        status="en_obra",
                        assigned_at=datetime.utcnow(),
                        notes=f"Asignado al inicio del proyecto {new_project.code}"
                    )
                    db.add(hist)

        # Asignar Vehiculos Seleccionados -> Marcar status en_obra
        if project_in.assigned_vehicle_ids:
            for veh_id in project_in.assigned_vehicle_ids:
                veh = db.query(Asset).filter(Asset.id == veh_id).first()
                if veh:
                    veh.current_project_id = new_project.id
                    veh.status = "en_obra"
                    veh.current_location = new_project.location
                    hist = ResourceAssignmentHistory(
                        project_id=new_project.id,
                        resource_type="vehiculo",
                        resource_id=veh.id,
                        resource_code=veh.asset_code,
                        resource_name=veh.name,
                        custodian_name=veh.current_custodian_name or "Chofer Asignado",
                        origin_location="Sede Central",
                        destination_location=new_project.location,
                        status="en_obra",
                        assigned_at=datetime.utcnow(),
                        notes=f"Asignado al proyecto {new_project.code}"
                    )
                    db.add(hist)

        # Asignar Herramientas Seleccionadas -> Marcar status en_obra
        if project_in.assigned_tool_ids:
            for tool_id in project_in.assigned_tool_ids:
                tool = db.query(Asset).filter(Asset.id == tool_id).first()
                if tool:
                    tool.current_project_id = new_project.id
                    tool.status = "en_obra"
                    tool.current_location = new_project.location
                    hist = ResourceAssignmentHistory(
                        project_id=new_project.id,
                        resource_type="herramienta",
                        resource_id=tool.id,
                        resource_code=tool.asset_code,
                        resource_name=tool.name,
                        custodian_name=tool.current_custodian_name or "Supervisor de Obra",
                        origin_location="Sede Central",
                        destination_location=new_project.location,
                        status="en_obra",
                        assigned_at=datetime.utcnow(),
                        notes=f"Asignado a obra {new_project.code}"
                    )
                    db.add(hist)

        # Si proviene de una cotizacion, marcarla como convertida
        if getattr(project_in, 'origin_quotation_id', None):
            quote = db.query(Quotation).filter(Quotation.id == getattr(project_in, 'origin_quotation_id', None)).first()
            if quote:
                quote.status = "adjudicado"
                quote.notes = (quote.notes or "") + f" [Convertido a Obra: {new_project.code}]"

        # Apertura automatica en Cuentas por Cobrar (CxC)
        if new_project.contract_amount_usd and new_project.contract_amount_usd > 0:
            cxc_entry = AccountReceivable(
                project_id=new_project.id,
                client_id=new_project.client_id,
                invoice_number=f"VAL-{new_project.code}-01",
                description=f"Contrato / Valuacion Inicial: {new_project.name}",
                issue_date=datetime.utcnow(),
                due_date=datetime.utcnow() + timedelta(days=new_project.duration_days or 30),
                taxable_base_usd=new_project.contract_amount_usd,
                tax_amount_usd=0.0,
                amount_usd=new_project.contract_amount_usd,
                paid_amount_usd=0.0,
                balance_usd=new_project.contract_amount_usd,
                net_amount_usd=new_project.contract_amount_usd,
                status="pendiente"
            )
            db.add(cxc_entry)

        db.commit()
        db.refresh(new_project)
        return new_project
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error en creacion de proyecto y asignacion de recursos: {str(e)}")

@router.put("/{project_id}/status")
def update_project_status(project_id: int, status_in: dict, db: Session = Depends(get_db)):
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado.")
    
    new_status = status_in.get("status")
    if new_status:
        proj.status = new_status
        if new_status == "completado":
            db.query(Asset).filter(Asset.current_project_id == proj.id).update({
                "current_project_id": None,
                "status": "disponible_base",
                "current_location": "Sede Central"
            })
            db.query(Personnel).filter(Personnel.current_project_id == proj.id).update({
                "current_project_id": None,
                "status": "disponible",
                "current_location": "Sede Central"
            })
    db.commit()
    return {"message": "Estado del proyecto actualizado exitosamente."}

@router.put("/{project_id}/phase/{phase_id}/status")
def update_phase_status(project_id: int, phase_id: int, status_in: dict, db: Session = Depends(get_db)):
    phase = db.query(ProjectPhase).filter(
        ProjectPhase.id == phase_id,
        ProjectPhase.project_id == project_id
    ).first()
    if not phase:
        raise HTTPException(status_code=404, detail="Fase/Etapa no encontrada.")
    
    new_status = status_in.get("status")
    if new_status:
        phase.status = new_status
        db.commit()
    return {"message": "Estado de la etapa actualizado."}

@router.put("/{project_id}/phase/{phase_id}/tasks")
def update_phase_tasks(project_id: int, phase_id: int, tasks_in: dict, db: Session = Depends(get_db)):
    phase = db.query(ProjectPhase).filter(
        ProjectPhase.id == phase_id,
        ProjectPhase.project_id == project_id
    ).first()
    if not phase:
        raise HTTPException(status_code=404, detail="Fase/Etapa no encontrada.")
    
    description_text = tasks_in.get("description")
    if description_text is not None:
        phase.description = description_text
        db.commit()
    return {"message": "Checklist de tareas actualizado correctamente."}

@router.delete("/{project_id}")
def delete_project(project_id: int, db: Session = Depends(get_db)):
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado.")
    proj.is_active = False
    db.query(Asset).filter(Asset.current_project_id == proj.id).update({
        "current_project_id": None,
        "status": "disponible_base",
        "current_location": "Sede Central"
    })
    db.query(Personnel).filter(Personnel.current_project_id == proj.id).update({
        "current_project_id": None,
        "status": "disponible",
        "current_location": "Sede Central"
    })
    db.commit()
    return {"message": "Proyecto inactivado exitosamente."}

@router.get("/tracking/{token}")
def get_public_project_tracking(token: str, db: Session = Depends(get_db)):
    proj = db.query(Project).filter(Project.tracking_token == token, Project.is_active == True).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Proyecto o token de seguimiento no valido.")

    phases = proj.phases
    total_phases = len(phases)
    completed_phases = sum(1 for ph in phases if ph.status == "completado")
    progress_pct = int((completed_phases / total_phases * 100)) if total_phases > 0 else 0

    return {
        "code": proj.code,
        "name": proj.name,
        "client_name": proj.client_name,
        "location": proj.location,
        "status": proj.status,
        "progress_pct": progress_pct,
        "execution_time": proj.execution_time,
        "duration_days": proj.duration_days,
        "scope_of_work": proj.scope_of_work,
        "phases": [
            {
                "phase_number": ph.phase_number,
                "name": ph.name,
                "description": ph.description,
                "status": ph.status
            } for ph in phases
        ]
    }
