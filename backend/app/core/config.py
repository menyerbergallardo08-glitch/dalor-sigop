import os
from pydantic import BaseModel

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PROJECT_ROOT = os.path.dirname(BACKEND_DIR)
DEFAULT_DB_PATH = os.path.join(PROJECT_ROOT, "dalor_sigop.db").replace("\\", "/")

# Cargar automáticamente variables de entorno desde .env si existe
for env_candidate in [os.path.join(PROJECT_ROOT, ".env"), os.path.join(BACKEND_DIR, ".env")]:
    if os.path.exists(env_candidate):
        with open(env_candidate, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    os.environ.setdefault(k.strip(), v.strip().strip("'").strip('"'))

class Settings(BaseModel):
    PROJECT_NAME: str = "DALOR - Sistema Integral de Gestión Operativa, Activos y Costeo"
    API_V1_STR: str = "/api/v1"
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{DEFAULT_DB_PATH}")
    
    # Parámetros operativos Dalor
    DEFAULT_CURRENCY: str = "USD"
    SECONDARY_CURRENCY: str = "VES"
    DEFAULT_EXCHANGE_RATE: float = 800.00  # Bs por USD configurable
    
    # Topes y Reglas de Campo
    MAX_FUEL_PRICE_USD_PER_LITER: float = 0.55  # Alerta si combustible supera $0.55 / L
    MAX_DAILY_FOOD_ALLOWANCE_USD: float = 25.00  # Tope por día por técnico
    
    UPLOAD_DIR: str = os.path.join(BACKEND_DIR, "uploads")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")

settings = Settings()
