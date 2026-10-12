from typing import Optional
from pydantic import BaseModel


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
