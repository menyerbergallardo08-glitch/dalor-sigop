from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.models import Personnel
from .personnel_schemas import PersonnelCreate, PersonnelUpdate

router = APIRouter()


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
