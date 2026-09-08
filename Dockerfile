FROM python:3.12-slim

# Instalar dependencias del sistema para OCR (Tesseract y bibliotecas graficas)
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-spa \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copiar requerimientos e instalar
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar backend y frontend
COPY backend/ ./backend/
COPY frontend/ ./frontend/

WORKDIR /app/backend

# Exponer puertos comunes
EXPOSE 8000 8005 10000

# Iniciar servidor Uvicorn usando el puerto dinámico asignado por Render ($PORT) o 8000 por defecto
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}

