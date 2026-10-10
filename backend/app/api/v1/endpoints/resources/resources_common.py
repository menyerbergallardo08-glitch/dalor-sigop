from typing import Optional
from pydantic import BaseModel

class ResourceSubstituteRequest(BaseModel):
    project_id: int
    resource_type: str  # 'personnel' or 'asset'
    old_id: int
    new_id: int
    reason: Optional[str] = "Reemplazo operativo en obra"
    notes: Optional[str] = None
