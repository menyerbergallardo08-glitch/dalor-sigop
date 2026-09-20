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

is_production = (
    os.getenv("ENVIRONMENT", "").lower() in ("production", "prod")
    or "postgres" in os.getenv("DATABASE_URL", "").lower()
    or bool(os.getenv("RENDER"))
    or bool(os.getenv("RENDER_SERVICE_ID"))
    or bool(os.getenv("RENDER_EXTERNAL_URL"))
    or bool(os.getenv("RENDER_EXTERNAL_HOSTNAME"))
)

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=None if is_production else f"{settings.API_V1_STR}/openapi.json",
    docs_url=None if is_production else "/docs",
    redoc_url=None if is_production else "/redoc",
    description="Sistema Integral de Gestión Operativa, Activos, Job Costing y Captura OCR para METALMECÁNICA DALOR C.A.."
)

import asyncio
import threading
import requests

@app.on_event("startup")
def on_startup():
    init_db()

    # Worker Anti-Suspensión 24/7 (Keep-Alive Heartbeat)
    def keep_alive_heartbeat():
        import time
        # Esperar 2 minutos iniciales para arranque suave
        time.sleep(120)
        while True:
            try:
                # Auto-consulta de salud para mantener caliente la instancia en Render
                target_url = os.getenv("RENDER_EXTERNAL_URL", "https://dalor-sigop.onrender.com")
                res = requests.get(f"{target_url}/healthz", timeout=15)
                if res.status_code == 200:
                    print(f"[HEARTBEAT 24/7] Servidor DALOR activo y caliente: {res.status_code} OK")
            except Exception as e:
                print(f"[HEARTBEAT ERROR] Pulso falló temporalmente: {e}")
            time.sleep(420) # Cada 7 minutos (Render se duerme a los 15 min)

    t = threading.Thread(target=keep_alive_heartbeat, daemon=True)
    t.start()

from fastapi.middleware.gzip import GZipMiddleware

# Habilitar CORS seguro y restringido (SEC-04)
allowed_origins = [
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://dalor-sigop.onrender.com",
    "https://dalor-sigop.vercel.app"
]
extra_origins = os.getenv("ALLOWED_ORIGINS")
if extra_origins:
    allowed_origins.extend([o.strip() for o in extra_origins.split(",") if o.strip()])

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Rutas de Frontend y Uploads
ROOT_PROJECT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
FRONTEND_DIR = os.path.join(ROOT_PROJECT_DIR, "frontend")
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
        "version": "2026.09.16.v94.2-modular-fix",
        "commit": "v94.2-v3-certified",
        "is_production": is_production,
        "timestamp": datetime.utcnow().isoformat()
    }

# 🔒 Desactivar explícitamente Swagger/OpenAPI en Producción (V3-02)
if is_production:
    from fastapi import HTTPException
    @app.get("/docs", include_in_schema=False)
    @app.get("/redoc", include_in_schema=False)
    @app.get(f"{settings.API_V1_STR}/openapi.json", include_in_schema=False)
    @app.get("/openapi.json", include_in_schema=False)
    def disable_docs_in_production():
        raise HTTPException(status_code=404, detail="Not Found")

# Servir Frontend SPA y archivos estáticos con prevención estricta de caché
NO_CACHE_HEADERS = {
    "Cache-Control": "no-cache, no-store, must-revalidate, max-age=0",
    "Pragma": "no-cache",
    "Expires": "0"
}

if os.path.exists(FRONTEND_DIR):
    app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")

    @app.get("/")
    def serve_frontend():
        return FileResponse(os.path.join(FRONTEND_DIR, "index.html"), headers=NO_CACHE_HEADERS)

    @app.get("/app.js")
    def serve_app_js():
        return FileResponse(os.path.join(FRONTEND_DIR, "app.js"), media_type="text/javascript", headers=NO_CACHE_HEADERS)

    @app.get("/seguimiento/{token}")
    @app.get("/tracking/{token}")
    @app.get("/tracking.html")
    def serve_tracking(token: Optional[str] = None):
        track_path = os.path.join(FRONTEND_DIR, "tracking.html")
        if os.path.exists(track_path):
            return FileResponse(track_path, headers=NO_CACHE_HEADERS)
        return {"status": "Tracking Portal not found"}

    @app.get("/flujogramas.html")
    @app.get("/flujogramas")
    def serve_flujogramas():
        fpath = os.path.join(FRONTEND_DIR, "flujogramas.html")
        if os.path.exists(fpath):
            return FileResponse(fpath, headers=NO_CACHE_HEADERS)
        return FileResponse(os.path.join(FRONTEND_DIR, "index.html"), headers=NO_CACHE_HEADERS)

    @app.get("/FLUJOGRAMAS_OFICIALES_DALOR_SIGOP.pdf")
    @app.get("/MANUAL_LOGICA_Y_FLUJOGRAMAS_DALOR_SIGOP.pdf")
    def serve_dossier_pdf():
        ppath = os.path.join(FRONTEND_DIR, "MANUAL_LOGICA_Y_FLUJOGRAMAS_DALOR_SIGOP.pdf")
        if os.path.exists(ppath):
            return FileResponse(ppath, media_type="application/pdf", filename="MANUAL_LOGICA_Y_FLUJOGRAMAS_DALOR_SIGOP.pdf")
        return {"error": "PDF not found"}

    @app.get("/{full_path:path}")
    def serve_spa_fallback(full_path: str):
        target_file = os.path.join(FRONTEND_DIR, full_path)
        if os.path.exists(target_file) and os.path.isfile(target_file):
            return FileResponse(target_file, headers=NO_CACHE_HEADERS)
        return FileResponse(os.path.join(FRONTEND_DIR, "index.html"), headers=NO_CACHE_HEADERS)
