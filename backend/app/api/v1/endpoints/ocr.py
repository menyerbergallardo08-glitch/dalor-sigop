import os
import uuid
import asyncio
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, Request, BackgroundTasks
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import settings
from app.core.rate_limiter import check_ocr_rate_limit
from app.services.ocr_parser import OCRReceiptParser
from app.schemas.schemas import OCRExtractResult
from app.services.storage import R2StorageService
from app.models.models import User
from app.api.deps import get_current_user

router = APIRouter()

def cleanup_temp_file(path: str):
    """Elimina de forma segura el archivo temporal en disco tras enviar la respuesta."""
    try:
        if path and os.path.exists(path):
            os.remove(path)
    except Exception:
        pass

@router.post("/scan-ticket", response_model=OCRExtractResult)
async def scan_ticket(
    request: Request,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    simulated_ocr_text: str = Form(None),
    exchange_rate: float = Form(800.0),
    current_user: User = Depends(get_current_user)
):
    """
    Recibe la foto del ticket capturada desde la PWA móvil o PC,
    extrae el texto mediante OCR real de visión y clasifica el comercio y monto.
    Ejecuta el I/O pesado de forma no bloqueante para no congelar el event loop.
    """
    # 1. Blindaje contra abusos de cuota Gemini/R2 por IP
    check_ocr_rate_limit(request)

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    file_ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    unique_filename = f"ticket_{uuid.uuid4().hex[:8]}.{file_ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, unique_filename)

    # Programar limpieza del archivo temporal tras responder al cliente
    background_tasks.add_task(cleanup_temp_file, file_path)

    # Guardar archivo temporalmente en disco
    contents = await file.read()
    with open(file_path, "wb") as f:
        f.write(contents)

    # Subir a Cloudflare R2 en threadpool para no bloquear el event loop asyncio
    image_url, _ = await asyncio.to_thread(R2StorageService.upload_receipt_image, contents, unique_filename)

    # 1. Intentar primero con Gemini Flash Vision Multimodal (offloaded to thread)
    gemini_result = await asyncio.to_thread(OCRReceiptParser.extract_with_gemini, file_path, default_rate=exchange_rate)
    if gemini_result:
        gemini_result["image_url"] = image_url
        tax_val = gemini_result.get("detected_tax_usd") or 0.0
        gemini_result["is_tax_exempt"] = (tax_val <= 0.001)
        return gemini_result

    # 2. Fallback: OCR de texto (Tesseract en Linux / WinSDK en Windows)
    raw_text = simulated_ocr_text
    if not raw_text:
        raw_text = await OCRReceiptParser.extract_text_from_file(file_path)

    if not raw_text:
        raw_text = "TICKET RECIBO DE COMPRA"

    parsed = await asyncio.to_thread(
        OCRReceiptParser.parse_text,
        raw_text=raw_text,
        default_rate=exchange_rate
    )
    if isinstance(parsed, dict):
        parsed["image_url"] = image_url
        tax_val = parsed.get("detected_tax_usd") or 0.0
        parsed["is_tax_exempt"] = (tax_val <= 0.001)
    elif hasattr(parsed, "image_url"):
        parsed.image_url = image_url
        tax_val = getattr(parsed, "detected_tax_usd", 0.0) or 0.0
        parsed.is_tax_exempt = (tax_val <= 0.001)

    return parsed

@router.post("/scan-odometer")
async def scan_odometer(
    request: Request,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    asset_id: int = Form(None),
    current_user: User = Depends(get_current_user)
):
    """
    Recibe la foto del tablero/odómetro capturada en campo por el chofer o supervisor,
    extrae el kilometraje total mediante Inteligencia Artificial de Visión (Gemini)
    y lo devuelve con URL de respaldo para confirmación y actualización.
    """
    # 1. Blindaje contra abusos por IP
    check_ocr_rate_limit(request)

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    file_ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    unique_filename = f"odometer_{uuid.uuid4().hex[:8]}.{file_ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, unique_filename)

    # Programar limpieza del archivo temporal tras responder al cliente
    background_tasks.add_task(cleanup_temp_file, file_path)

    contents = await file.read()
    with open(file_path, "wb") as f:
        f.write(contents)

    # Subir a Cloudflare R2 de forma no bloqueante
    image_url, _ = await asyncio.to_thread(R2StorageService.upload_receipt_image, contents, unique_filename)

    # Extraer odómetro con IA de visión de forma no bloqueante
    result = await asyncio.to_thread(OCRReceiptParser.extract_odometer_from_image, file_path)
    result["image_url"] = image_url
    result["asset_id"] = asset_id
    result["filename"] = unique_filename
    return result


