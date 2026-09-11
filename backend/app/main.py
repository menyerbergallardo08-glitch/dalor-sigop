from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
from datetime import datetime
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
    description="Sistema Integral de Gestión Operativa, Activos, Job Costing y Captura OCR para DALOR & Alianza NEPTUNIA."
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
        "version": "2026.09.09.v28",
        "database": "Neon PostgreSQL (Connected)",
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/")
@app.get("/index.html")
def serve_frontend_root():
    index_path = os.path.join(FRONTEND_DIR, "index.html")
    if os.path.exists(index_path):
        response = FileResponse(index_path)
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        return response
    return {"status": "online", "company": "DALOR", "partner": "NEPTUNIA"}

@app.get("/app.js")
def serve_frontend_js():
    js_path = os.path.join(FRONTEND_DIR, "app.js")
    response = FileResponse(js_path)
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

@app.get("/logo_dalor.jpg")
def serve_logo():
    logo_path = os.path.join(FRONTEND_DIR, "logo_dalor.jpg")
    return FileResponse(logo_path)

@app.get("/simulador")
@app.get("/simulador.html")
def serve_simulator():
    sim_path = os.path.join(FRONTEND_DIR, "simulador.html")
    if os.path.exists(sim_path):
        return FileResponse(sim_path)
    return {"status": "Simulator not found"}

@app.get("/presentacion")
@app.get("/presentacion.html")
def serve_presentation():
    pres_path = os.path.join(FRONTEND_DIR, "presentacion.html")
    if os.path.exists(pres_path):
        return FileResponse(pres_path)
    return {"status": "Presentation not found"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
