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

class TaskToggleInput(BaseModel):
    task_index: int
    is_completed: bool

class TaskCreateInput(BaseModel):
    task_name: str

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
