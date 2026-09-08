from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.models import Personnel

router = APIRouter()

@router.get("/")
def get_personnel(db: Session = Depends(get_db)):
    return db.query(Personnel).filter(Personnel.is_active == True).order_by(Personnel.code.asc()).all()
