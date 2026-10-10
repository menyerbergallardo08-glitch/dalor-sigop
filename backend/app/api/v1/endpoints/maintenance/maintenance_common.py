import os
from pydantic import BaseModel
from typing import Optional
from app.core.config import settings

BACKUP_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))), "backups")
os.makedirs(BACKUP_DIR, exist_ok=True)

def get_db_file_path():
    db_url = settings.DATABASE_URL
    if "sqlite:///" in db_url:
        path = db_url.replace("sqlite:///", "")
        if os.path.exists(path):
            return path
    default_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))), "dalor_sigop.db")
    return default_path

# Pydantic Schemas - Roles
class RoleCreate(BaseModel):
    name: str
    display_name: str
    description: Optional[str] = None
    permissions_json: str

class RoleUpdate(BaseModel):
    display_name: Optional[str] = None
    description: Optional[str] = None
    permissions_json: Optional[str] = None

# Pydantic Schemas - Users
class UserCreate(BaseModel):
    username: str
    full_name: str
    email: Optional[str] = None
    password: str
    role_name: str = "ingeniero_obra"
    permissions_json: Optional[str] = None

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    role_name: Optional[str] = None
    permissions_json: Optional[str] = None
    password: Optional[str] = None

class UserPermissionsUpdate(BaseModel):
    permissions_json: str

# Pydantic Schemas - Database Ops
class ResetCleanSlateInput(BaseModel):
    director_password: str
