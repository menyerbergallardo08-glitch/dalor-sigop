"""
Endpoint de Marca Blanca (White-Label): Perfil e Identidad de Empresa.
Permite consultar y actualizar en caliente la razon social, RIF, membretes,
direccion fiscal, colores y logotipo de la empresa.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel

from app.core.database import get_db
from app.models.models import User as UserModel
from app.api.deps import require_roles, get_current_user
from app.services.company_profile_service import CompanyProfileService

router = APIRouter()

class CompanyProfileUpdate(BaseModel):
    legal_name: Optional[str] = None
    trade_name: Optional[str] = None
    rif: Optional[str] = None
    fiscal_address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    legal_base_seniat: Optional[str] = None
    logo_url: Optional[str] = None
    currency_symbol: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None

@router.get("")
@router.get("/")
def get_company_profile(db: Session = Depends(get_db)):
    """
    Retorna la identidad y datos fiscales de la empresa activa para membretes y comprobantes.
    """
    return {
        "success": True,
        "company": CompanyProfileService.get_profile(db)
    }

@router.put("")
@router.put("/")
def update_company_profile(
    data: CompanyProfileUpdate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_roles(["ADMIN", "DIRECTOR", "SUPERADMIN"]))
):
    """
    Actualiza la identidad corporativa y fiscal de la empresa en tiempo real.
    """
    payload = data.model_dump(exclude_unset=True)
    updated = CompanyProfileService.update_profile(db, payload)
    return {
        "success": True,
        "message": "Perfil de empresa actualizado exitosamente.",
        "company": updated
    }
