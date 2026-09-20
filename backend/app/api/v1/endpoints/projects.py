from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Response, Query
from sqlalchemy.orm import Session, joinedload, selectinload
from typing import List, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel
from app.core.database import get_db
from app.models.models import Project, Client, Expense, ProjectPhase, Asset, Personnel, ResourceAssignmentHistory, AccountReceivable, FinancialPayment
from app.schemas.schemas import ProjectCreate, ProjectOut
from app.services.excel_service import ExcelProjectService

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
            selectinload(Project.phases)
        )
        .filter(Project.is_active == True)
        .order_by(Project.created_at.desc())
        .all()
    )
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
        
        # Consultar si ya tiene factura en Cuentas por Cobrar (CxC)
        cxc_recs = db.query(AccountReceivable).filter(AccountReceivable.project_id == proj.id).all()
        has_cxc = len(cxc_recs) > 0
        total_billed_cxc = sum(r.amount_usd for r in cxc_recs)
        
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
            "total_billed_cxc_usd": round(total_billed_cxc, 2),
            "is_active": proj.is_active,
            "created_at": proj.created_at.isoformat() if proj.created_at else None,
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
    
    # Gastos ejecutados
    expenses = db.query(Expense).filter(Expense.project_id == project_id).all()
    total_spent = sum(e.amount_usd for e in expenses)

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
    collections_trace.sort(key=lambda x: x["payment_date"], reverse=True)

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
        "total_billed_cxc_usd": round(total_billed_cxc, 2),
        "total_collected_usd": round(total_collected_usd, 2),
        "balance_receivable_usd": round(balance_receivable_usd, 2),
        "collections": collections_trace,
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

@router.post("/")
@router.post("/", response_model=ProjectOut)
def create_project(project_in: ProjectCreate, db: Session = Depends(get_db)):
    code = (project_in.code or "").strip()
    if not code or db.query(Project).filter(Project.code == code).first():
        current_year = datetime.utcnow().year
        seq = db.query(Project).count() + 1
        code = f"PRJ-{current_year}-{seq:03d}"
        while db.query(Project).filter(Project.code == code).first():
            seq += 1
            code = f"PRJ-{current_year}-{seq:03d}"
    
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

        # 5. Generar Factura / Valuación Inicial en Cuentas por Cobrar (CxC)
        if new_project.contract_amount_usd and new_project.contract_amount_usd > 0:
            target_client_id = new_project.client_id
            if not target_client_id:
                first_client = db.query(Client).first()
                if first_client:
                    target_client_id = first_client.id
                    new_project.client_id = first_client.id
                    new_project.client_name = first_client.name
            
            if target_client_id:
                from app.models.models import AccountReceivable, FinancialPayment
                cxc_entry = AccountReceivable(
                    project_id=new_project.id,
                    client_id=target_client_id,
                    invoice_number=f"VAL-{new_project.code}-01",
                    description=f"Contrato / Valuación Inicial: {new_project.name}",
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

        # Confirmar transacción atómica completa
        db.commit()
        db.refresh(new_project)

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
            "phases": []
        }

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
            "estimated_cost_usd": ph.estimated_cost_usd,
            "status": ph.status,
            "responsible_person": ph.responsible_person
        } for ph in new_project.phases]
    }

class ProjectPhaseAdd(BaseModel):
    phase_number: int = 1
    name: str
    description: Optional[str] = None
    duration_days: int = 7
    estimated_cost_usd: float = 0.0
    status: str = "pendiente"
    responsible_person: Optional[str] = None

@router.post("/{project_id}/phases")
def add_project_phase(project_id: int, phase_in: ProjectPhaseAdd, db: Session = Depends(get_db)):
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado.")

    new_phase = ProjectPhase(
        project_id=project_id,
        phase_number=phase_in.phase_number,
        name=phase_in.name,
        description=phase_in.description,
        duration_days=phase_in.duration_days,
        estimated_cost_usd=phase_in.estimated_cost_usd,
        status=phase_in.status,
        responsible_person=phase_in.responsible_person
    )
    db.add(new_phase)
    db.commit()
    db.refresh(new_phase)
    return {
        "success": True,
        "message": f"Fase #{new_phase.phase_number} ('{new_phase.name}') agregada exitosamente al proyecto.",
        "id": new_phase.id,
        "phase_number": new_phase.phase_number
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
            a.current_location = "Sede Central Dalor"
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
                destination_location="Sede Central Dalor",
                status="disponible_base",
                notes=f"Liberación automática por culminación y cierre de obra {proj.code}"
            )
            db.add(history_asset)

        # Auto-liberar personal asignado a la obra retornándolos a base central
        assigned_personnel = db.query(Personnel).filter(Personnel.current_project_id == proj.id).all()
        for p in assigned_personnel:
            p.status = "disponible_base"
            p.current_project_id = None
            p.current_location = "Sede Central Dalor"
            released_personnel_count += 1
            
            history_pers = ResourceAssignmentHistory(
                project_id=proj.id,
                resource_type="personnel",
                resource_id=p.id,
                resource_code=p.code,
                resource_name=p.full_name,
                custodian_name="Base Central",
                origin_location=proj.location or "Planta / Obra",
                destination_location="Sede Central Dalor",
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

@router.delete("/{project_id}")
def delete_project(project_id: int, db: Session = Depends(get_db)):
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado.")
    proj.is_active = False
    db.commit()
    return {"message": "Proyecto inactivado exitosamente (traza histórica preservada)."}

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
