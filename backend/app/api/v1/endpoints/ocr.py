import os
import uuid
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import settings
from app.services.ocr_parser import OCRReceiptParser
from app.schemas.schemas import OCRExtractResult

router = APIRouter()

@router.post("/scan-ticket", response_model=OCRExtractResult)
async def scan_ticket(
    file: UploadFile = File(...),
    simulated_ocr_text: str = Form(None),
    exchange_rate: float = Form(800.0)
):
    """
    Recibe la foto del ticket capturada desde la PWA móvil o PC,
    extrae el texto mediante OCR real de visión y clasifica el comercio y monto.
    """
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    file_ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    unique_filename = f"ticket_{uuid.uuid4().hex[:8]}.{file_ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, unique_filename)

    # Guardar archivo temporalmente en disco y subirlo a Cloudflare R2
    contents = await file.read()
    with open(file_path, "wb") as f:
        f.write(contents)

    from app.services.storage import R2StorageService
    image_url, _ = R2StorageService.upload_receipt_image(contents, unique_filename)

    # 1. Intentar primero con Gemini 3.6 Flash Vision Multimodal
    gemini_result = OCRReceiptParser.extract_with_gemini(file_path, default_rate=exchange_rate)
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

    parsed = OCRReceiptParser.parse_text(
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
    file: UploadFile = File(...),
    asset_id: int = Form(None)
):
    """
    Recibe la foto del tablero/odómetro capturada en campo por el chofer o supervisor,
    extrae el kilometraje total mediante Inteligencia Artificial de Visión (Gemini)
    y lo devuelve con URL de respaldo para confirmación y actualización.
    """
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    file_ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    unique_filename = f"odometer_{uuid.uuid4().hex[:8]}.{file_ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, unique_filename)

    contents = await file.read()
    with open(file_path, "wb") as f:
        f.write(contents)

    from app.services.storage import R2StorageService
    image_url, _ = R2StorageService.upload_receipt_image(contents, unique_filename)

    result = OCRReceiptParser.extract_odometer_from_image(file_path)
    result["image_url"] = image_url
    result["asset_id"] = asset_id
    result["filename"] = unique_filename
    return result


