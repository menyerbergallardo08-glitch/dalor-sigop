FROM python:3.12-slim

# Instalar dependencias del sistema para OCR
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-spa \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copiar requerimientos e instalar dependencias Python
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar backend completo
COPY backend/ ./backend/

# Copiar frontend_v2/dist compilado (frontend moderno Vite)
COPY frontend_v2/dist/ ./frontend_v2/dist/
COPY frontend/logo_dalor.jpg ./frontend_v2/dist/logo_dalor.jpg

WORKDIR /app/backend

# Exponer puertos
EXPOSE 8000 10000

# Iniciar servidor Uvicorn usando el puerto dinamico de Render ($PORT) o 8000 por defecto
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}

