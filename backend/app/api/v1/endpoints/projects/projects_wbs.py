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

from app.api.deps import get_current_active_user
import secrets

router = APIRouter(dependencies=[Depends(get_current_active_user)])

@router.post("/{project_id}/phases")
def add_project_phase(project_id: int, phase_in: ProjectPhaseAdd, db: Session = Depends(get_db)):
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado.")

    curr_phases = db.query(ProjectPhase).filter(ProjectPhase.project_id == project_id).all()
    # Validar que la nueva etapa no exceda el 100% de ponderación de la obra
    existing_weights = sum((p.weight_percent or 0.0) for p in curr_phases)
    new_weight = round(phase_in.weight_percent or 0.0, 2)
    if existing_weights + new_weight > 100.05:
        raise HTTPException(
            status_code=400,
            detail=f"Inconsistencia en Ponderación: Las etapas existentes suman {round(existing_weights, 1)}%. Asignar {new_weight}% superaría el 100% permitido (Total resultante: {round(existing_weights + new_weight, 1)}%)."
        )

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
        responsible_person=phase_in.responsible_person or "Residente de Obra",
        weight_percent=round(phase_in.weight_percent or 0.0, 2)
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
            "status": new_phase.status,
            "weight_percent": new_phase.weight_percent
        }
    }

@router.put("/{project_id}/phases/{phase_id}/status")
def update_phase_status(project_id: int, phase_id: int, update_in: PhaseStatusUpdate, db: Session = Depends(get_db)):
    phase = db.query(ProjectPhase).filter(ProjectPhase.id == phase_id, ProjectPhase.project_id == project_id).first()
    if not phase:
        raise HTTPException(status_code=404, detail="Etapa no encontrada.")

    # Prelación eliminada: se permite avanzar o culminar cualquier etapa independientemente (estilo Project)
    phase.status = update_in.status
    db.commit()
    return {"success": True, "message": f"Etapa '{phase.name}' actualizada a {phase.status}."}

@router.put("/{project_id}/phases/{phase_id}/toggle-task")
def toggle_phase_task(project_id: int, phase_id: int, task_in: TaskToggleInput, db: Session = Depends(get_db)):
    phase = db.query(ProjectPhase).filter(ProjectPhase.id == phase_id, ProjectPhase.project_id == project_id).first()
    if not phase:
        raise HTTPException(status_code=404, detail="Etapa no encontrada.")

    raw_desc = phase.description or ""
    tasks = [t.strip() for t in raw_desc.split(";") if t.strip()]
    if not tasks:
        tasks = [t.strip() for t in raw_desc.split("\n") if t.strip()]

    if 0 <= task_in.task_index < len(tasks):
        current_t = tasks[task_in.task_index]
        parsed = parse_task_string(current_t)

        # Determinar nuevo progreso
        if task_in.progress_percent is not None:
            new_prog = max(0.0, min(100.0, float(task_in.progress_percent)))
        elif task_in.is_completed is not None:
            new_prog = 100.0 if task_in.is_completed else 0.0
        else:
            new_prog = 0.0 if parsed["progress_pct"] >= 100.0 else 100.0

        new_hours = task_in.work_hours if task_in.work_hours is not None else parsed["work_hours"]
        new_weight = parsed["weight_percent"]

        tasks[task_in.task_index] = format_task_string(
            name=parsed["name"],
            progress_pct=new_prog,
            work_hours=new_hours,
            weight_percent=new_weight,
            level=parsed["level"]
        )

        # Ejecutar roll-up jerárquico automático sobre todas las tareas
        rolled_up = roll_up_hierarchical_tasks(tasks)
        updated_tasks = [
            format_task_string(
                name=t["name"],
                progress_pct=t["progress_pct"],
                work_hours=t["work_hours"],
                weight_percent=t["weight_percent"],
                level=t["level"]
            )
            for t in rolled_up
        ]
        phase.description = "; ".join(updated_tasks)

        # Actualizar estatus de la fase
        all_done = all(t["progress_pct"] >= 100.0 for t in rolled_up)
        any_done = any(t["progress_pct"] > 0.0 for t in rolled_up)

        if all_done:
            phase.status = "completado"
        elif any_done:
            phase.status = "en_progreso"
        else:
            phase.status = "pendiente"

        db.commit()

        # Calcular avance global de proyecto
        all_phases = db.query(ProjectPhase).filter(ProjectPhase.project_id == project_id).all()
        proj_prog = calculate_project_progress(all_phases)

        return {
            "success": True,
            "phase_status": phase.status,
            "project_progress_pct": proj_prog,
            "tasks": updated_tasks,
            "parsed_tasks": rolled_up
        }
    raise HTTPException(status_code=400, detail="Índice de tarea inválido.")

@router.put("/{project_id}/phases/{phase_id}/tasks/{task_index}")
def update_phase_task(project_id: int, phase_id: int, task_index: int, payload: TaskUpdateInput, db: Session = Depends(get_db)):
    phase = db.query(ProjectPhase).filter(ProjectPhase.id == phase_id, ProjectPhase.project_id == project_id).first()
    if not phase:
        raise HTTPException(status_code=404, detail="Etapa no encontrada.")

    raw_desc = phase.description or ""
    tasks = [t.strip() for t in raw_desc.split(";") if t.strip()]
    if not tasks:
        tasks = [t.strip() for t in raw_desc.split("\n") if t.strip()]

    if 0 <= task_index < len(tasks):
        current_t = tasks[task_index]
        parsed = parse_task_string(current_t)

        new_name = payload.task_name.strip() if payload.task_name and payload.task_name.strip() else parsed["name"]
        new_prog = max(0.0, min(100.0, float(payload.progress_percent))) if payload.progress_percent is not None else parsed["progress_pct"]
        new_hours = payload.work_hours if payload.work_hours is not None else parsed["work_hours"]
        new_weight = payload.weight_percent if payload.weight_percent is not None else parsed["weight_percent"]
        new_lvl = payload.level if payload.level is not None else parsed["level"]

        tasks[task_index] = format_task_string(
            name=new_name,
            progress_pct=new_prog,
            work_hours=new_hours,
            weight_percent=new_weight,
            level=new_lvl
        )

        rolled_up = roll_up_hierarchical_tasks(tasks)
        updated_tasks = [
            format_task_string(
                name=t["name"],
                progress_pct=t["progress_pct"],
                work_hours=t["work_hours"],
                weight_percent=t["weight_percent"],
                level=t["level"]
            )
            for t in rolled_up
        ]
        phase.description = "; ".join(updated_tasks)

        all_done = all(t["progress_pct"] >= 100.0 for t in rolled_up)
        any_done = any(t["progress_pct"] > 0.0 for t in rolled_up)

        if all_done:
            phase.status = "completado"
        elif any_done:
            phase.status = "en_progreso"
        else:
            phase.status = "pendiente"

        db.commit()

        all_phases = db.query(ProjectPhase).filter(ProjectPhase.project_id == project_id).all()
        proj_prog = calculate_project_progress(all_phases)

        return {
            "success": True,
            "message": f"Tarea '{new_name}' actualizada correctamente.",
            "phase_status": phase.status,
            "project_progress_pct": proj_prog,
            "tasks": updated_tasks,
            "parsed_tasks": rolled_up
        }
    raise HTTPException(status_code=400, detail="Índice de tarea inválido.")

@router.put("/{project_id}/phases/{phase_id}/tasks/{task_index}/indent")
def indent_phase_task(project_id: int, phase_id: int, task_index: int, payload: TaskIndentInput, db: Session = Depends(get_db)):
    phase = db.query(ProjectPhase).filter(ProjectPhase.id == phase_id, ProjectPhase.project_id == project_id).first()
    if not phase:
        raise HTTPException(status_code=404, detail="Etapa no encontrada.")

    raw_desc = phase.description or ""
    tasks = [t.strip() for t in raw_desc.split(";") if t.strip()]
    if not tasks:
        tasks = [t.strip() for t in raw_desc.split("\n") if t.strip()]

    if 0 <= task_index < len(tasks):
        current_t = tasks[task_index]
        parsed = parse_task_string(current_t)

        delta = 1 if payload.direction == "indent" else -1
        new_lvl = max(1, min(3, parsed["level"] + delta))

        tasks[task_index] = format_task_string(
            name=parsed["name"],
            progress_pct=parsed["progress_pct"],
            work_hours=parsed["work_hours"],
            weight_percent=parsed["weight_percent"],
            level=new_lvl
        )

        rolled_up = roll_up_hierarchical_tasks(tasks)
        updated_tasks = [
            format_task_string(
                name=t["name"],
                progress_pct=t["progress_pct"],
                work_hours=t["work_hours"],
                weight_percent=t["weight_percent"],
                level=t["level"]
            )
            for t in rolled_up
        ]
        phase.description = "; ".join(updated_tasks)
        db.commit()

        all_phases = db.query(ProjectPhase).filter(ProjectPhase.project_id == project_id).all()
        proj_prog = calculate_project_progress(all_phases)

        return {
            "success": True,
            "message": f"Nivel WBS actualizado a L{new_lvl}.",
            "phase_status": phase.status,
            "project_progress_pct": proj_prog,
            "tasks": updated_tasks,
            "parsed_tasks": rolled_up
        }
    raise HTTPException(status_code=400, detail="Índice de tarea inválido.")

@router.post("/{project_id}/phases/{phase_id}/tasks")
def add_phase_task(project_id: int, phase_id: int, payload: TaskCreateInput, db: Session = Depends(get_db)):
    phase = db.query(ProjectPhase).filter(ProjectPhase.id == phase_id, ProjectPhase.project_id == project_id).first()
    if not phase:
        raise HTTPException(status_code=404, detail="Etapa no encontrada.")
    
    clean_task = payload.task_name.strip()
    if not clean_task:
        raise HTTPException(status_code=400, detail="El nombre de la tarea no puede estar vacío.")
    
    raw_desc = phase.description or ""
    tasks = [t.strip() for t in raw_desc.split(";") if t.strip()]
    if not tasks and raw_desc.strip():
        tasks = [t.strip() for t in raw_desc.split("\n") if t.strip()]

    prog = payload.progress_percent if payload.progress_percent is not None else 0.0
    task_str = format_task_string(
        name=clean_task,
        progress_pct=prog,
        work_hours=payload.work_hours,
        weight_percent=payload.weight_percent,
        level=payload.level or 1
    )
    tasks.append(task_str)
    
    rolled_up = roll_up_hierarchical_tasks(tasks)
    updated_tasks = [
        format_task_string(
            name=t["name"],
            progress_pct=t["progress_pct"],
            work_hours=t["work_hours"],
            weight_percent=t["weight_percent"],
            level=t["level"]
        )
        for t in rolled_up
    ]
    phase.description = "; ".join(updated_tasks)

    # Actualizar estatus si la tarea agregada tiene avance
    all_done = all(t["progress_pct"] >= 100.0 for t in rolled_up)
    any_done = any(t["progress_pct"] > 0.0 for t in rolled_up)
    if all_done:
        phase.status = "completado"
    elif any_done:
        phase.status = "en_progreso"

    db.commit()
    all_phases = db.query(ProjectPhase).filter(ProjectPhase.project_id == project_id).all()
    proj_prog = calculate_project_progress(all_phases)

    return {
        "success": True,
        "message": f"Tarea '{clean_task}' agregada a la etapa '{phase.name}'.",
        "phase_status": phase.status,
        "project_progress_pct": proj_prog,
        "tasks": updated_tasks,
        "parsed_tasks": rolled_up
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
            parsed_all = [parse_task_string(t) for t in tasks]
            all_done = all(t["progress_pct"] >= 100.0 for t in parsed_all)
            any_done = any(t["progress_pct"] > 0.0 for t in parsed_all)
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

@router.put("/{project_id}/phases/{phase_id}/weights")
def update_phase_weights(project_id: int, phase_id: int, payload: PhaseWeightsUpdate, db: Session = Depends(get_db)):
    phase = db.query(ProjectPhase).filter(ProjectPhase.id == phase_id, ProjectPhase.project_id == project_id).first()
    if not phase:
        raise HTTPException(status_code=404, detail="Etapa no encontrada.")

    # 1. Validar y actualizar peso de la etapa en el proyecto si se envía
    if payload.weight_percent is not None:
        other_phases = db.query(ProjectPhase).filter(
            ProjectPhase.project_id == project_id,
            ProjectPhase.id != phase_id
        ).all()
        other_sum = sum((p.weight_percent or 0.0) for p in other_phases)
        new_weight = round(payload.weight_percent, 2)
        if other_sum + new_weight > 100.05:
            raise HTTPException(
                status_code=400,
                detail=f"Inconsistencia: Las demás etapas suman {round(other_sum, 1)}%. Asignar {new_weight}% a esta etapa superaría el 100% total (Suma: {round(other_sum + new_weight, 1)}%)."
            )
        phase.weight_percent = new_weight

    raw_desc = phase.description or ""
    tasks = [t.strip() for t in raw_desc.split(";") if t.strip()]
    if not tasks and raw_desc.strip():
        tasks = [t.strip() for t in raw_desc.split("\n") if t.strip()]

    # 2. Si se suministran horas de trabajo por tarea, calcular pesos proporcionales automáticos si no vienen pesos explícitos
    calc_weights = payload.tasks_weights
    if payload.tasks_hours is not None and len(payload.tasks_hours) > 0:
        tot_hrs = sum(payload.tasks_hours)
        if tot_hrs > 0:
            if calc_weights is None or len(calc_weights) == 0:
                calc_weights = [round((h / tot_hrs) * 100.0, 2) for h in payload.tasks_hours]

    # 3. Validar y actualizar pesos y/o horas de las tareas
    if calc_weights is not None or payload.tasks_hours is not None:
        if calc_weights is not None:
            tasks_sum = sum(calc_weights)
            if tasks_sum > 100.05:
                raise HTTPException(
                    status_code=400,
                    detail=f"Inconsistencia en Tareas: La suma de pesos de las tareas es {round(tasks_sum, 1)}%, lo cual supera el 100% de la etapa."
                )

        updated_tasks = []
        for idx, t in enumerate(tasks):
            parsed = parse_task_string(t)
            w = calc_weights[idx] if (calc_weights is not None and idx < len(calc_weights)) else parsed["weight_percent"]
            h = payload.tasks_hours[idx] if (payload.tasks_hours is not None and idx < len(payload.tasks_hours)) else parsed["work_hours"]

            updated_tasks.append(format_task_string(
                name=parsed["name"],
                progress_pct=parsed["progress_pct"],
                work_hours=h,
                weight_percent=w
            ))

        phase.description = "; ".join(updated_tasks)

    db.commit()
    return {
        "success": True,
        "message": f"Ponderaciones de la etapa '{phase.name}' actualizadas correctamente.",
        "phase_weight_percent": phase.weight_percent,
        "description": phase.description
    }

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
