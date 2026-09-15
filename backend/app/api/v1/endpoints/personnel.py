from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from app.core.database import get_db
from app.models.models import Personnel, AuditLog

router = APIRouter()

class PersonnelCreate(BaseModel):
    code: str
    full_name: str
    identification_id: Optional[str] = None
    role_title: str
    phone: Optional[str] = None
    current_location: Optional[str] = "Sede Central"
    status: Optional[str] = "disponible_base"

class PersonnelUpdate(BaseModel):
    full_name: Optional[str] = None
    identification_id: Optional[str] = None
    role_title: Optional[str] = None
    phone: Optional[str] = None
    current_location: Optional[str] = None
    status: Optional[str] = None
    is_active: Optional[bool] = None

@router.get("/")
def get_personnel(db: Session = Depends(get_db)):
    return db.query(Personnel).filter(Personnel.is_active == True).order_by(Personnel.code.asc()).all()

@router.get("/{personnel_id}")
def get_personnel_by_id(personnel_id: int, db: Session = Depends(get_db)):
    p = db.query(Personnel).filter(Personnel.id == personnel_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Trabajador no encontrado.")
    return p

@router.post("/")
def create_personnel(personnel_in: PersonnelCreate, db: Session = Depends(get_db)):
    existing = db.query(Personnel).filter(Personnel.code == personnel_in.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe un trabajador con este código.")
    
    new_p = Personnel(
        code=personnel_in.code.strip(),
        full_name=personnel_in.full_name.strip(),
        identification_id=personnel_in.identification_id,
        role_title=personnel_in.role_title.strip(),
        phone=personnel_in.phone,
        current_location=personnel_in.current_location or "Sede Central (Guacara)",
        status=personnel_in.status or "disponible_base",
        is_active=True
    )
    db.add(new_p)
    db.commit()
    db.refresh(new_p)
    return new_p

@router.put("/{personnel_id}")
def update_personnel(personnel_id: int, personnel_in: PersonnelUpdate, db: Session = Depends(get_db)):
    p = db.query(Personnel).filter(Personnel.id == personnel_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Trabajador no encontrado.")
    
    if personnel_in.full_name is not None:
        p.full_name = personnel_in.full_name.strip()
    if personnel_in.identification_id is not None:
        p.identification_id = personnel_in.identification_id.strip()
    if personnel_in.role_title is not None:
        p.role_title = personnel_in.role_title.strip()
    if personnel_in.phone is not None:
        p.phone = personnel_in.phone.strip()
    if personnel_in.current_location is not None:
        p.current_location = personnel_in.current_location.strip()
    if personnel_in.status is not None:
        p.status = personnel_in.status
    if personnel_in.is_active is not None:
        p.is_active = personnel_in.is_active
        
    db.commit()
    db.refresh(p)
    return p

@router.delete("/{personnel_id}")
def delete_personnel(personnel_id: int, db: Session = Depends(get_db)):
    p = db.query(Personnel).filter(Personnel.id == personnel_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Trabajador no encontrado.")
    p.is_active = False
    db.commit()
    return {"success": True, "message": f"Trabajador '{p.full_name}' inactivado correctamente."}

