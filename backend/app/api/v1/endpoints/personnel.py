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
    role_title: str
    identification_id: Optional[str] = None
    phone: Optional[str] = None
    roster_type: Optional[str] = "guacara_fijo"
    monthly_salary_usd: Optional[float] = 0.0
    daily_rate_usd: Optional[float] = 0.0
    current_location: Optional[str] = "Sede Central"
    status: Optional[str] = "disponible_base"

@router.get("/")
def get_personnel(db: Session = Depends(get_db)):
    return db.query(Personnel).filter(Personnel.is_active == True).order_by(Personnel.code.asc()).all()

@router.post("/")
def create_personnel(person_in: PersonnelCreate, db: Session = Depends(get_db)):
    existing = db.query(Personnel).filter(Personnel.code == person_in.code).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Ya existe un empleado con el código {person_in.code}.")
    
    new_person = Personnel(
        code=person_in.code,
        full_name=person_in.full_name,
        role_title=person_in.role_title,
        identification_id=person_in.identification_id,
        phone=person_in.phone,
        roster_type=person_in.roster_type or "guacara_fijo",
        monthly_salary_usd=person_in.monthly_salary_usd or 0.0,
        daily_rate_usd=person_in.daily_rate_usd or 0.0,
        current_location=person_in.current_location or "Sede Central",
        status=person_in.status or "disponible_base"
    )
    db.add(new_person)
    db.commit()
    db.refresh(new_person)
    return new_person

