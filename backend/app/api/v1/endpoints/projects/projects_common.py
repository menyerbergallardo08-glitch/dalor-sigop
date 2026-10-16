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
    is_completed: Optional[bool] = None
    progress_percent: Optional[float] = None
    work_hours: Optional[float] = None

class TaskCreateInput(BaseModel):
    task_name: str
    weight_percent: Optional[float] = None
    work_hours: Optional[float] = None
    progress_percent: Optional[float] = 0.0
    level: Optional[int] = 1

class TaskUpdateInput(BaseModel):
    task_name: Optional[str] = None
    progress_percent: Optional[float] = None
    work_hours: Optional[float] = None
    weight_percent: Optional[float] = None
    level: Optional[int] = None

class TaskIndentInput(BaseModel):
    direction: str  # "indent" (+1 level) or "outdent" (-1 level)

class PhaseWeightsUpdate(BaseModel):
    weight_percent: Optional[float] = None
    tasks_weights: Optional[List[float]] = None
    tasks_hours: Optional[List[float]] = None

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

def parse_task_string(task_raw: str) -> dict:
    """
    Parsea una cadena de tarea con formato MS Project y WBS jerárquico:
    Formatos soportados:
    - [L2] [89%] Tarea A [H:40] [W:40%]
    - [L3] [x] Tarea B [H:16] [W:60%] (100% completada)
    - [ ] Tarea C (0% completada, L1 por defecto)
    - Tarea D
    """
    t = task_raw.strip()
    
    # 0. Nivel jerárquico WBS (L1, L2, L3)
    level = 1
    lvl_match = re.search(r'\[\s*(?:L|LVL|INDENT)(?::|\s*)?([1-9])\s*\]', t, re.IGNORECASE)
    if lvl_match:
        level = int(lvl_match.group(1))

    # 1. Porcentaje de avance
    prog = None
    pct_match = re.search(r'\[\s*([0-9]+(?:\.[0-9]+)?)\s*%\s*\]', t)
    if pct_match:
        prog = float(pct_match.group(1))
    elif t.startswith("[x]") or t.startswith("[X]") or "✅" in t:
        prog = 100.0
    elif t.startswith("[ ]") or "⏳" in t:
        prog = 0.0
    else:
        prog = 0.0

    # 2. Horas estimadas de trabajo (Work / HH)
    hours = None
    h_match = re.search(r'\[\s*(?:H|HH|WORK):\s*([0-9]+(?:\.[0-9]+)?)\s*(?:h|hrs|hh)?\s*\]', t, re.IGNORECASE)
    if h_match:
        hours = float(h_match.group(1))

    # 3. Ponderación manual (W)
    weight = None
    w_match = re.search(r'\[\s*W:\s*([0-9]+(?:\.[0-9]+)?)\s*%?\s*\]', t, re.IGNORECASE)
    if w_match:
        weight = float(w_match.group(1))

    # 4. Nombre limpio de la tarea
    clean_name = t
    for pref in ["[x]", "[X]", "[ ]", "✅", "⏳"]:
        if clean_name.startswith(pref):
            clean_name = clean_name[len(pref):].strip()
    clean_name = re.sub(r'\[\s*(?:L|LVL|INDENT)(?::|\s*)?([1-9])\s*\]', '', clean_name, flags=re.IGNORECASE).strip()
    clean_name = re.sub(r'\[\s*([0-9]+(?:\.[0-9]+)?)\s*%\s*\]', '', clean_name).strip()
    clean_name = re.sub(r'\[\s*(?:H|HH|WORK):\s*([0-9]+(?:\.[0-9]+)?)\s*(?:h|hrs|hh)?\s*\]', '', clean_name, flags=re.IGNORECASE).strip()
    clean_name = re.sub(r'\[\s*W:\s*([0-9]+(?:\.[0-9]+)?)\s*%?\s*\]', '', clean_name, flags=re.IGNORECASE).strip()

    return {
        "raw": t,
        "name": clean_name,
        "level": max(1, min(3, level)),
        "progress_pct": max(0.0, min(100.0, prog)),
        "progress_percent": max(0.0, min(100.0, prog)),
        "work_hours": hours,
        "weight_percent": weight,
        "is_completed": prog >= 100.0,
        "completed": prog >= 100.0
    }

def format_task_string(name: str, progress_pct: float = 0.0, work_hours: Optional[float] = None, weight_percent: Optional[float] = None, level: int = 1) -> str:
    """Formatea una tarea serializada para almacenamiento en la BD"""
    clean_name = name.strip()
    for pref in ["[x]", "[X]", "[ ]", "✅", "⏳"]:
        if clean_name.startswith(pref):
            clean_name = clean_name[len(pref):].strip()
    clean_name = re.sub(r'\[\s*(?:L|LVL|INDENT)(?::|\s*)?([1-9])\s*\]', '', clean_name, flags=re.IGNORECASE).strip()
    clean_name = re.sub(r'\[\s*([0-9]+(?:\.[0-9]+)?)\s*%\s*\]', '', clean_name).strip()
    clean_name = re.sub(r'\[\s*(?:H|HH|WORK):\s*([0-9]+(?:\.[0-9]+)?)\s*(?:h|hrs|hh)?\s*\]', '', clean_name, flags=re.IGNORECASE).strip()
    clean_name = re.sub(r'\[\s*W:\s*([0-9]+(?:\.[0-9]+)?)\s*%?\s*\]', '', clean_name, flags=re.IGNORECASE).strip()

    prog = max(0.0, min(100.0, round(progress_pct, 1)))
    # Compatibilidad: si es 100% o 0%, usar [x] o [ ] además del % para sistemas legacy
    if prog == 100.0:
        prefix = "[x] [100%]"
    elif prog == 0.0:
        prefix = "[ ] [0%]"
    else:
        prefix = f"[{int(round(prog)) if round(prog, 1) == int(prog) else round(prog, 1)}%]"

    parts = []
    lvl = max(1, min(3, int(level or 1)))
    if lvl > 1:
        parts.append(f"[L{lvl}]")
    parts.append(prefix)
    parts.append(clean_name)
    if work_hours is not None and work_hours > 0:
        parts.append(f"[H:{round(work_hours, 1) if round(work_hours, 1) != int(work_hours) else int(work_hours)}]")
    if weight_percent is not None and weight_percent > 0:
        parts.append(f"[W:{round(weight_percent, 2)}%]")

    return " ".join(parts)

def roll_up_hierarchical_tasks(tasks_raw: List[str]) -> List[dict]:
    """
    Toma la lista de tareas en texto plano, identifica nodos resumen (padres con nivel menor que sus sucesores)
    y calcula automáticamente su porcentaje de avance y horas en cascada (Roll-up estilo MS Project).
    """
    if not tasks_raw:
        return []

    parsed = [parse_task_string(t) for t in tasks_raw]
    n = len(parsed)

    # Identificar cuáles son nodos resumen (is_summary: True si el siguiente ítem tiene mayor nivel)
    for i in range(n):
        curr_lvl = parsed[i]["level"]
        is_sum = False
        if i + 1 < n and parsed[i + 1]["level"] > curr_lvl:
            is_sum = True
        parsed[i]["is_summary"] = is_sum

    # Recalcular de abajo hacia arriba (bottom-up roll-up)
    for i in range(n - 1, -1, -1):
        if parsed[i]["is_summary"]:
            parent_lvl = parsed[i]["level"]
            child_tasks = []
            for j in range(i + 1, n):
                if parsed[j]["level"] <= parent_lvl:
                    break
                # Solo hijos directos (parent_lvl + 1)
                if parsed[j]["level"] == parent_lvl + 1:
                    child_tasks.append(parsed[j])

            if child_tasks:
                # 1. Total horas rollup
                total_h = sum((c["work_hours"] or 0.0) for c in child_tasks)
                if total_h > 0:
                    parsed[i]["work_hours"] = total_h

                # 2. Progreso rollup (ponderado por horas si existen, o por peso, o equitativo)
                has_weights = any(c.get("weight_percent") is not None and c["weight_percent"] > 0 for c in child_tasks)
                has_hours = any(c.get("work_hours") is not None and c["work_hours"] > 0 for c in child_tasks)

                if has_weights:
                    w_sum = sum((c["weight_percent"] or 0.0) for c in child_tasks)
                    if w_sum > 0:
                        prog_val = sum(c["progress_pct"] * (c["weight_percent"] or 0.0) for c in child_tasks) / w_sum
                    else:
                        prog_val = sum(c["progress_pct"] for c in child_tasks) / len(child_tasks)
                elif has_hours:
                    h_sum = sum((c["work_hours"] or 0.0) for c in child_tasks)
                    if h_sum > 0:
                        prog_val = sum(c["progress_pct"] * (c["work_hours"] or 0.0) for c in child_tasks) / h_sum
                    else:
                        prog_val = sum(c["progress_pct"] for c in child_tasks) / len(child_tasks)
                else:
                    prog_val = sum(c["progress_pct"] for c in child_tasks) / len(child_tasks)

                calc_prog = max(0.0, min(100.0, round(prog_val, 1)))
                parsed[i]["progress_pct"] = calc_prog
                parsed[i]["progress_percent"] = calc_prog
                parsed[i]["is_completed"] = (calc_prog >= 100.0)
                parsed[i]["completed"] = (calc_prog >= 100.0)

    return parsed

def calculate_project_progress(phases, project_status: Optional[str] = None) -> float:
    """
    Calcula el avance físico ponderado de un proyecto al estilo Microsoft Project:
    1. A nivel de etapa:
       - Si contiene jerarquía multinivel, ejecuta roll_up_hierarchical_tasks()
       - Si las tareas tienen ponderación explícita ([W:xx%]), se calcula:
         Avance Etapa = sum(prog_i * weight_i) / sum(weight_i)
       - Si no tienen peso explícito pero tienen horas ([H:xx]), se calcula ponderación por HH:
         Avance Etapa = sum(prog_i * hours_i) / sum(hours_i)
       - Si no tienen peso ni horas, equipondera: sum(prog_i) / N
    2. A nivel de proyecto:
       - Ponderación de etapas por weight_percent. Si no está asignado, equipondera.
    3. Si el estatus general del proyecto es 'culminado' o 'completado', retorna 100.0%.
    """
    if project_status in ["culminado", "completado"]:
        return 100.0
    if not phases:
        return 0.0

    # Si se pasa un dict de proyecto o un objeto de proyecto en vez de la lista de etapas
    if isinstance(phases, dict) and "phases" in phases:
        phases = phases["phases"]
    elif hasattr(phases, "phases"):
        phases = getattr(phases, "phases")

    if not phases:
        return 0.0

    explicit_phase_weights_sum = 0.0
    phase_progresses = []

    for ph in phases:
        if isinstance(ph, dict):
            raw_desc = ph.get("description", "") or ""
            if not raw_desc and "tasks" in ph:
                if isinstance(ph["tasks"], list):
                    raw_desc = "; ".join(str(x) for x in ph["tasks"])
                else:
                    raw_desc = str(ph["tasks"])
            ph_status = ph.get("status", "")
            ph_weight = float(ph.get("weight_percent", 0.0) or 0.0)
        else:
            raw_desc = getattr(ph, "description", "") or ""
            ph_status = getattr(ph, "status", "")
            ph_weight = float(getattr(ph, "weight_percent", 0.0) or 0.0)

        tasks_raw = [t.strip() for t in raw_desc.split(";") if t.strip()]
        if not tasks_raw and raw_desc.strip():
            tasks_raw = [t.strip() for t in raw_desc.split("\n") if t.strip()]

        if ph_status == "completado":
            phase_prog = 100.0
        elif tasks_raw:
            # Procesar jerarquía y roll-up
            parsed_tasks = roll_up_hierarchical_tasks(tasks_raw)
            
            # Tomar solo las tareas de nivel raíz (L1) para calcular el total de la etapa
            top_level_tasks = [t for t in parsed_tasks if t["level"] == 1]
            if not top_level_tasks:
                top_level_tasks = parsed_tasks

            explicit_weights_sum = sum((t["weight_percent"] or 0.0) for t in top_level_tasks if t["weight_percent"] is not None)
            total_hours_sum = sum((t["work_hours"] or 0.0) for t in top_level_tasks if t["work_hours"] is not None)

            if explicit_weights_sum > 0:
                weighted_sum = sum(t["progress_pct"] * (t["weight_percent"] or 0.0) for t in top_level_tasks)
                phase_prog = min(100.0, round(weighted_sum / explicit_weights_sum, 2))
            elif total_hours_sum > 0:
                weighted_sum = sum(t["progress_pct"] * (t["work_hours"] or 0.0) for t in top_level_tasks)
                phase_prog = min(100.0, round(weighted_sum / total_hours_sum, 2))
            else:
                phase_prog = min(100.0, round(sum(t["progress_pct"] for t in top_level_tasks) / len(top_level_tasks), 2))
        else:
            phase_prog = 50.0 if ph_status == "en_progreso" else 0.0

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


