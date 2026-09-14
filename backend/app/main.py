from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
from datetime import datetime
from typing import Optional
from app.core.config import settings
from app.core.database import engine, Base
from app.core.init_db import init_db
from app.api.v1.api_router import api_router

# Crear tablas en SQLite/PostgreSQL
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    description="Sistema Integral de Gestión Operativa, Activos, Job Costing y Captura OCR para METALMECÁNICA DALOR C.A.."
)

@app.on_event("startup")
def on_startup():
    init_db()

# Habilitar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rutas de Frontend y Uploads
FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "frontend")
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Incluir Rutas de API
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/healthz")
@app.get("/ping")
def healthcheck():
    return {
        "status": "healthy",
        "system": "DALOR SIGO-P ERP",
        "version": "2026.09.14.v50",
        "timestamp": datetime.utcnow().isoformat()
    }

# Servir Frontend SPA y archivos estáticos
if os.path.exists(FRONTEND_DIR):
    app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")

    @app.get("/")
    def serve_frontend():
        return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))

    @app.get("/seguimiento/{token}")
    @app.get("/tracking/{token}")
    @app.get("/tracking.html")
    def serve_tracking(token: Optional[str] = None):
        track_path = os.path.join(FRONTEND_DIR, "tracking.html")
        if os.path.exists(track_path):
            return FileResponse(track_path)
        return {"status": "Tracking Portal not found"}

    @app.get("/{full_path:path}")
    def serve_spa_fallback(full_path: str):
        target_file = os.path.join(FRONTEND_DIR, full_path)
        if os.path.exists(target_file) and os.path.isfile(target_file):
            return FileResponse(target_file)
        return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))
