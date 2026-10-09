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

import secrets

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
