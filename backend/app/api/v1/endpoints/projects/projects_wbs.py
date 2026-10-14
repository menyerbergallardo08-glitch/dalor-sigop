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

    # Prelación eliminada: se permite marcar o desmarcar cualquier tarea sin depender de etapas previas
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
        
    task_str = f"[ ] {clean_task}"
    if payload.weight_percent is not None and payload.weight_percent > 0:
        task_str = f"[ ] {clean_task} [W:{round(payload.weight_percent, 2)}%]"
    tasks.append(task_str)
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

    # 2. Validar y actualizar pesos de las tareas de la etapa
    if payload.tasks_weights is not None:
        tasks_sum = sum(payload.tasks_weights)
        if tasks_sum > 100.05:
            raise HTTPException(
                status_code=400,
                detail=f"Inconsistencia en Tareas: La suma de pesos de las tareas es {round(tasks_sum, 1)}%, lo cual supera el 100% de la etapa."
            )

        raw_desc = phase.description or ""
        tasks = [t.strip() for t in raw_desc.split(";") if t.strip()]
        if not tasks and raw_desc.strip():
            tasks = [t.strip() for t in raw_desc.split("\n") if t.strip()]

        updated_tasks = []
        for idx, t in enumerate(tasks):
            is_done = t.startswith("[x]") or t.startswith("[X]") or "✅" in t
            clean_title = t
            for pref in ["[x]", "[X]", "[ ]", "✅", "⏳"]:
                if clean_title.startswith(pref):
                    clean_title = clean_title[len(pref):].strip()
            # Limpiar peso previo
            clean_title = re.sub(r'\[W:\s*([0-9]+(?:\.[0-9]+)?)\s*%?\]', '', clean_title, flags=re.IGNORECASE).strip()

            prefix = "[x]" if is_done else "[ ]"
            w = payload.tasks_weights[idx] if idx < len(payload.tasks_weights) else 0.0
            if w > 0:
                updated_tasks.append(f"{prefix} {clean_title} [W:{round(w, 2)}%]")
            else:
                updated_tasks.append(f"{prefix} {clean_title}")

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
