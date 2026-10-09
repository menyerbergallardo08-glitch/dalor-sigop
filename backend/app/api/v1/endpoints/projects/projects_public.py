from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, selectinload
from typing import List, Optional
from datetime import datetime
from app.core.database import get_db
from app.models.models import Project, Client, ProjectPhase

public_router = APIRouter()

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
