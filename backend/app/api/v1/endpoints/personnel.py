from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from app.core.database import get_db
from app.models.models import Personnel

router = APIRouter()

class PersonnelCreate(BaseModel):
    code: str
    full_name: str
    role_title: Optional[str] = ""
    identification_id: Optional[str] = None
    phone: Optional[str] = None
    roster_type: Optional[str] = "guacara_fijo"
    payroll_type: Optional[str] = "semanal"
    monthly_salary_usd: Optional[float] = 0.0
    daily_rate_usd: Optional[float] = 0.0
    current_location: Optional[str] = "Sede Central Dalor (Guacara)"
    status: Optional[str] = "disponible_base"

class PersonnelUpdate(BaseModel):
    full_name: Optional[str] = None
    role_title: Optional[str] = None
    identification_id: Optional[str] = None
    phone: Optional[str] = None
    roster_type: Optional[str] = None
    payroll_type: Optional[str] = None
    monthly_salary_usd: Optional[float] = None
    daily_rate_usd: Optional[float] = None
    current_location: Optional[str] = None
    status: Optional[str] = None
    is_active: Optional[bool] = None

@router.get("/")
def get_personnel(include_inactive: bool = False, db: Session = Depends(get_db)):
    query = db.query(Personnel)
    if not include_inactive:
        query = query.filter(Personnel.is_active == True)
    return query.order_by(Personnel.code.asc()).all()

@router.get("/roles-list")
def get_roles_list(db: Session = Depends(get_db)):
    # Obtener cargos existentes en la base de datos más especialidades estándar
    db_roles = db.query(Personnel.role_title).filter(Personnel.role_title != None, Personnel.role_title != "").distinct().all()
    roles_set = set(r[0].strip() for r in db_roles if r[0] and r[0].strip())
    default_roles = [
        "Ingeniero Residente", "Supervisor de Obra", "Técnico Mecánico", "Mecánico Ajustador",
        "Soldador Especializado", "Soldador TIG/MIG", "Oxicortador", "Electricista Industrial",
        "Instrumentista", "Operador de Maquinaria", "Chofer / Conductor", "Ayudante Técnico",
        "Coordinador de Seguridad Industrial (SIAHO)", "Tornero / Fresador", "Pailero / Calderero"
    ]
    for dr in default_roles:
        roles_set.add(dr)
    return sorted(list(roles_set))

@router.post("/")
def create_personnel(person_in: PersonnelCreate, db: Session = Depends(get_db)):
    existing = db.query(Personnel).filter(Personnel.code == person_in.code).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Ya existe un empleado con el código {person_in.code}.")
    
    new_person = Personnel(
        code=person_in.code.strip(),
        full_name=person_in.full_name.strip(),
        role_title=(person_in.role_title or "").strip(),
        identification_id=person_in.identification_id.strip() if person_in.identification_id else None,
        phone=person_in.phone.strip() if person_in.phone else None,
        roster_type=person_in.roster_type or "guacara_fijo",
        payroll_type=person_in.payroll_type or "semanal",
        monthly_salary_usd=person_in.monthly_salary_usd or 0.0,
        daily_rate_usd=person_in.daily_rate_usd or 0.0,
        current_location=person_in.current_location or "Sede Central Dalor (Guacara)",
        status=person_in.status or "disponible_base",
        is_active=True
    )
    db.add(new_person)
    db.commit()
    db.refresh(new_person)
    return new_person

@router.put("/{personnel_id}")
def update_personnel(personnel_id: int, person_in: PersonnelUpdate, db: Session = Depends(get_db)):
    p = db.query(Personnel).filter(Personnel.id == personnel_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Colaborador no encontrado.")
    
    update_data = person_in.dict(exclude_unset=True)
    # Proteger el código único histórico
    if "code" in update_data:
        del update_data["code"]
        
    for field, val in update_data.items():
        if val is not None:
            if isinstance(val, str):
                setattr(p, field, val.strip())
            else:
                setattr(p, field, val)
                
    db.commit()
    db.refresh(p)
    return p

@router.post("/{personnel_id}/toggle-active")
def toggle_personnel_active(personnel_id: int, db: Session = Depends(get_db)):
    p = db.query(Personnel).filter(Personnel.id == personnel_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Colaborador no encontrado.")
    
    p.is_active = not p.is_active
    if not p.is_active:
        p.status = "inactivo"
        p.current_project_id = None
    else:
        p.status = "disponible_base"
        p.current_location = "Sede Central Dalor (Guacara)"
        
    db.commit()
    return {
        "success": True,
        "id": p.id,
        "is_active": p.is_active,
        "status_label": "Activo" if p.is_active else "Inactivo",
        "message": f"Colaborador {p.full_name} {'reactivado' if p.is_active else 'inactivado'} exitosamente."
    }

@router.delete("/{personnel_id}")
def delete_personnel(personnel_id: int, db: Session = Depends(get_db)):
    p = db.query(Personnel).filter(Personnel.id == personnel_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Empleado no encontrado.")
    # Inactivación suave para proteger integridad referencial de auditoría
    p.is_active = False
    p.status = "inactivo"
    p.current_project_id = None
    db.commit()
    return {"success": True, "message": f"Empleado {p.full_name} inactivado con éxito (historial preservado)."}


@router.get("/{personnel_id}/history")
def get_personnel_history(personnel_id: int, db: Session = Depends(get_db)):
    from app.models.models import ResourceAssignmentHistory, DispatchGuide, Project

    p = db.query(Personnel).filter(Personnel.id == personnel_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Colaborador no encontrado.")

    # 1. Movimientos en ResourceAssignmentHistory
    movements = db.query(ResourceAssignmentHistory).filter(
        (
            (ResourceAssignmentHistory.resource_type.in_(["personnel", "personal"])) &
            (
                (ResourceAssignmentHistory.resource_id == personnel_id) |
                (ResourceAssignmentHistory.resource_code == p.code) |
                (ResourceAssignmentHistory.resource_name == p.full_name)
            )
        ) |
        (ResourceAssignmentHistory.custodian_name == p.full_name) |
        (ResourceAssignmentHistory.driver_name == p.full_name)
    ).order_by(ResourceAssignmentHistory.assigned_at.desc()).all()

    timeline = []
    for m in movements:
        m_type = "asignacion_obra"
        if "transfer" in (m.notes or "").lower() or (m.origin_location and "obra" in m.origin_location.lower()):
            m_type = "transferencia_obra"
        elif "retorno" in (m.notes or "").lower() or "base" in (m.destination_location or "").lower():
            m_type = "retorno_base"

        timeline.append({
            "id": f"mov-{m.id}",
            "type": m_type,
            "date": m.assigned_at.strftime("%Y-%m-%d %H:%M:%S") if m.assigned_at else "-",
            "transfer_code": m.transfer_code or "S/C",
            "project_code": m.project.code if m.project else "Sede Central Dalor (Guacara)",
            "project_name": m.project.name if m.project else "Sede Central Dalor (Guacara)",
            "origin": m.origin_location or "Sede Central Dalor (Guacara)",
            "destination": m.destination_location or "-",
            "role": p.role_title or "Personal Operativo",
            "status": m.status or "en_obra",
            "notes": m.notes or ""
        })

    # 2. Despachos y Guías donde actuó como chofer o receptor
    guides = db.query(DispatchGuide).filter(
        (DispatchGuide.driver_name == p.full_name) |
        (DispatchGuide.received_by_client_name == p.full_name)
    ).order_by(DispatchGuide.dispatch_date.desc()).all()

    for g in guides:
        is_driver = (g.driver_name == p.full_name)
        timeline.append({
            "id": f"disp-{g.id}",
            "type": "chofer_despacho" if is_driver else "receptor_guia",
            "date": g.dispatch_date.strftime("%Y-%m-%d %H:%M:%S") if g.dispatch_date else g.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            "transfer_code": g.guide_number,
            "project_code": g.project.code if g.project else "S/P",
            "project_name": g.project.name if g.project else (g.recipient_name or "Despacho Libre"),
            "origin": "Sede Central Dalor (Guacara)",
            "destination": g.destination_address,
            "role": "Conductor de Traslado" if is_driver else "Receptor en Obra",
            "status": g.status,
            "notes": f"Guía {g.guide_number} | Placa: {g.vehicle_plate} | {g.transfer_reason or ''}"
        })

    # Ordenar por fecha cronológica descendente
    timeline.sort(key=lambda x: x["date"], reverse=True)

    return {
        "personnel": {
            "id": p.id,
            "code": p.code,
            "full_name": p.full_name,
            "role_title": p.role_title,
            "identification_id": p.identification_id or "-",
            "phone": p.phone or "-",
            "current_location": p.current_location or "Sede Central Dalor (Guacara)",
            "status": p.status,
            "project_code": p.current_project.code if p.current_project else "Sede Central"
        },
        "history_count": len(timeline),
        "timeline": timeline
    }



