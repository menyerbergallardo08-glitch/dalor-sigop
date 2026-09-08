import os
from pydantic import BaseModel

class Settings(BaseModel):
    PROJECT_NAME: str = "DALOR - Sistema Integral de Gestión Operativa, Activos y Costeo"
    API_V1_STR: str = "/api/v1"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./dalor_sigop.db")
    
    # Parámetros operativos Dalor
    DEFAULT_CURRENCY: str = "USD"
    SECONDARY_CURRENCY: str = "VES"
    DEFAULT_EXCHANGE_RATE: float = 800.00  # Bs por USD configurable
    
    # Topes y Reglas de Campo
    MAX_FUEL_PRICE_USD_PER_LITER: float = 0.55  # Alerta si combustible supera $0.55 / L
    MAX_DAILY_FOOD_ALLOWANCE_USD: float = 25.00  # Tope por día por técnico
    
    UPLOAD_DIR: str = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")

settings = Settings()
