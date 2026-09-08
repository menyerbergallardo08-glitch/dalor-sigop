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

    # Guardar archivo en disco
    contents = await file.read()
    with open(file_path, "wb") as f:
        f.write(contents)

    # 1. Intentar primero con Gemini 1.5 Flash Vision Multimodal
    gemini_result = OCRReceiptParser.extract_with_gemini(file_path, default_rate=exchange_rate)
    if gemini_result:
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

    return parsed

