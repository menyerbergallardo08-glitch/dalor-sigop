from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Response
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from app.core.database import get_db
from app.models.models import Project, Client, Expense, ProjectPhase, Asset, Personnel, ResourceAssignmentHistory
from app.schemas.schemas import ProjectCreate, ProjectOut
from app.services.excel_service import ExcelProjectService

router = APIRouter()

class PhaseStatusUpdate(BaseModel):
    status: str # pendiente, en_progreso, completado

@router.get("/", response_model=List[ProjectOut])
def get_projects(db: Session = Depends(get_db)):
    projects = db.query(Project).filter(Project.is_active == True).order_by(Project.created_at.desc()).all()
    results = []
    for proj in projects:
        spent = sum(e.amount_usd for e in proj.expenses) if proj.expenses else 0.0
        
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
        
        # Build ProjectOut dictionary/object
        p_out = ProjectOut(
            id=proj.id,
            code=proj.code,
            name=proj.name,
            client_id=proj.client_id,
            client_name=proj.client_name or (proj.client.name if proj.client else "General"),
            location=proj.location,
            status=proj.status,
            scope_of_work=proj.scope_of_work,
            duration_days=proj.duration_days,
            contract_amount_usd=proj.contract_amount_usd,
            estimated_labor_usd=proj.estimated_labor_usd,
            estimated_fuel_usd=proj.estimated_fuel_usd,
            estimated_materials_usd=proj.estimated_materials_usd,
            estimated_tools_usd=proj.estimated_tools_usd,
            estimated_services_usd=proj.estimated_services_usd,
            budget_limit_usd=proj.budget_limit_usd,
            total_spent_usd=round(spent, 2),
            progress_pct=prog_pct,
            is_active=proj.is_active,
            created_at=proj.created_at,
            phases=[
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
            ]
        )
        results.append(p_out)
    return results

@router.get("/{project_id}/details")
def get_project_details(project_id: int, db: Session = Depends(get_db)):
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado.")

    # Recursos asignados actualmente
    assigned_assets = db.query(Asset).filter(Asset.current_project_id == project_id, Asset.is_active == True).all()
    assigned_personnel = db.query(Personnel).filter(Personnel.current_project_id == project_id, Personnel.is_active == True).all()
    
    # Gastos ejecutados
    expenses = db.query(Expense).filter(Expense.project_id == project_id).all()
    total_spent = sum(e.amount_usd for e in expenses)

    return {
        "id": proj.id,
        "code": proj.code,
        "name": proj.name,
        "client_name": proj.client_name,
        "location": proj.location,
        "status": proj.status,
        "scope_of_work": proj.scope_of_work,
        "duration_days": proj.duration_days,
        "contract_amount_usd": proj.contract_amount_usd,
        "budget_limit_usd": proj.budget_limit_usd,
        "total_spent_usd": round(total_spent, 2),
        "gross_margin_usd": round(proj.contract_amount_usd - total_spent, 2),
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
        ]
    }

@router.post("/", response_model=ProjectOut)
def create_project(project_in: ProjectCreate, db: Session = Depends(get_db)):
    existing = db.query(Project).filter(Project.code == project_in.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe un proyecto con ese código.")
    
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

    new_project = Project(
        code=project_in.code,
        name=project_in.name,
        client_id=project_in.client_id,
        client_name=client_name or "Cliente General",
        location=project_in.location or "Sede Central",
        status=project_in.status or "activo",
        scope_of_work=project_in.scope_of_work,
        duration_days=project_in.duration_days,
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
    db.commit()
    db.refresh(new_project)

    # 1. Crear Etapas / Fases del Proyecto si fueron suministradas
    if project_in.phases and len(project_in.phases) > 0:
        for idx, phase_data in enumerate(project_in.phases, start=1):
            phase = ProjectPhase(
                project_id=new_project.id,
                phase_number=idx,
                name=phase_data.name,
                description=phase_data.description,
                duration_days=phase_data.duration_days,
                estimated_cost_usd=phase_data.estimated_cost_usd,
                status=phase_data.status or "pendiente",
                responsible_person=phase_data.responsible_person
            )
            db.add(phase)

    # 2. Asignar Personal Seleccionado
    if project_in.assigned_personnel_ids:
        for pers_id in project_in.assigned_personnel_ids:
            person = db.query(Personnel).filter(Personnel.id == pers_id).first()
            if person:
                person.current_project_id = new_project.id
                person.status = "en_obra"
                person.current_location = new_project.location
                # Registro en bitácora
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

    db.commit()
    db.refresh(new_project)
    return new_project

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

@router.delete("/{project_id}")
def delete_project(project_id: int, db: Session = Depends(get_db)):
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado.")
    proj.is_active = False
    db.commit()
    return {"message": "Proyecto inactivado exitosamente (traza histórica preservada)."}
