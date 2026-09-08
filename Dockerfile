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

# Exponer el puerto por defecto
EXPOSE 8005

# Iniciar servidor Uvicorn
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8005"]
