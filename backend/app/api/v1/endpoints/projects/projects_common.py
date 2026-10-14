from typing import List, Optional
from datetime import datetime
import re
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.models.models import Project

class PhaseStatusUpdate(BaseModel):
    status: str  # pendiente, en_progreso, completado

class MaterialRequestItemIn(BaseModel):
    material_id: Optional[int] = None
    material_name: Optional[str] = None
    quantity: float = 1.0
    unit_measure: Optional[str] = "UND"
    notes: Optional[str] = None

class ProjectMaterialRequestIn(BaseModel):
    items: List[MaterialRequestItemIn]
    notes: Optional[str] = None

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
    weight_percent: Optional[float] = 0.0

class TaskToggleInput(BaseModel):
    task_index: int
    is_completed: bool

class TaskCreateInput(BaseModel):
    task_name: str
    weight_percent: Optional[float] = None

class PhaseWeightsUpdate(BaseModel):
    weight_percent: Optional[float] = None
    tasks_weights: Optional[List[float]] = None

class ProjectStatusUpdate(BaseModel):
    status: str

class AdminAuthProjectDelete(BaseModel):
    admin_password: str
    reason: Optional[str] = "Inactivación solicitada por Administrador"

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

class MaterialReturnRequest(BaseModel):
    material_id: int
    quantity: float
    notes: Optional[str] = None
    returned_by: Optional[str] = "Responsable de Obra"

class MaterialSubstituteRequest(BaseModel):
    requisition_id: int
    new_material_id: int
    reason: Optional[str] = "Sustitución técnica de material en obra"
    notes: Optional[str] = None

class ProjectResourceSubstituteRequest(BaseModel):
    resource_type: str
    old_id: int
    new_id: int
    reason: Optional[str] = "Reemplazo operativo en obra"
    notes: Optional[str] = None

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

def calculate_project_progress(phases, project_status: Optional[str] = None) -> float:
    """
    Calcula el avance físico ponderado de un proyecto:
    1. A nivel de etapa: ponderación manual por tareas ([W:xx%]). Si no tienen peso explícito, equipondera.
    2. A nivel de proyecto: ponderación manual por etapas (weight_percent). Si no tienen peso explícito, equipondera.
    3. Si el estatus general del proyecto es 'culminado' o 'completado', retorna 100.0%.
    """
    if project_status in ["culminado", "completado"]:
        return 100.0
    if not phases:
        return 0.0

    explicit_phase_weights_sum = 0.0
    phase_progresses = []

    for ph in phases:
        raw_desc = getattr(ph, "description", "") or ""
        tasks = [t.strip() for t in raw_desc.split(";") if t.strip()]
        if not tasks and raw_desc.strip():
            tasks = [t.strip() for t in raw_desc.split("\n") if t.strip()]

        if getattr(ph, "status", "") == "completado":
            phase_prog = 100.0
        elif tasks:
            explicit_task_weights_sum = 0.0
            completed_task_weight = 0.0
            completed_count = 0

            for t in tasks:
                is_done = t.startswith("[x]") or t.startswith("[X]") or "✅" in t
                w_match = re.search(r'\[W:\s*([0-9]+(?:\.[0-9]+)?)\s*%?\]', t, re.IGNORECASE)
                task_w = float(w_match.group(1)) if w_match else 0.0
                if task_w > 0:
                    explicit_task_weights_sum += task_w
                    if is_done:
                        completed_task_weight += task_w
                if is_done:
                    completed_count += 1

            if explicit_task_weights_sum > 0:
                phase_prog = min(100.0, round((completed_task_weight / explicit_task_weights_sum) * 100.0, 1))
            else:
                phase_prog = min(100.0, round((completed_count / len(tasks)) * 100.0, 1))
        else:
            phase_prog = 50.0 if getattr(ph, "status", "") == "en_progreso" else 0.0

        ph_weight = float(getattr(ph, "weight_percent", 0.0) or 0.0)
        if ph_weight > 0:
            explicit_phase_weights_sum += ph_weight

        phase_progresses.append((phase_prog, ph_weight))

    if not phase_progresses:
        return 0.0

    if explicit_phase_weights_sum > 0:
        total_weighted = sum(prog * w for prog, w in phase_progresses)
        return min(100.0, round(total_weighted / explicit_phase_weights_sum, 1))
    else:
        avg_prog = sum(prog for prog, _ in phase_progresses) / len(phase_progresses)
        return min(100.0, round(avg_prog, 1))

