import os
import re
import asyncio
from datetime import datetime
from typing import Dict, Any, Optional
from PIL import Image, ImageOps

from app.core.config import settings

# Intentar importar winsdk para OCR nativo en Windows
try:
    import winsdk.windows.graphics.imaging as imaging
    import winsdk.windows.media.ocr as win_ocr
    import winsdk.windows.storage as storage
    WINSDK_AVAILABLE = True
except ImportError:
    WINSDK_AVAILABLE = False

# Intentar importar pytesseract para OCR en Linux / Docker
try:
    import pytesseract
    PYTESSERACT_AVAILABLE = True
except ImportError:
    PYTESSERACT_AVAILABLE = False

# Intentar importar Google Generative AI para Gemini Vision
try:
    import google.generativeai as genai
    GENAI_AVAILABLE = True
except ImportError:
    GENAI_AVAILABLE = False

class OCRReceiptParser:
    """
    Motor de extracción inteligente con Gemini 1.5 Flash Vision e Inteligencia Artificial Multimodal,
    con respaldo automático en Tesseract OCR (Linux) y Windows OCR (Windows).
    """

    @staticmethod
    def extract_with_gemini(file_path: str, default_rate: float = 800.0) -> Optional[Dict[str, Any]]:
        api_key = os.getenv("GEMINI_API_KEY") or getattr(settings, "GEMINI_API_KEY", None) or os.getenv("GOOGLE_API_KEY")
        if not api_key or len(str(api_key).strip()) < 10:
            return None

        try:
            import urllib.request
            import base64
            import json
            import io
            from PIL import ImageEnhance

            with Image.open(file_path) as img:
                img = ImageOps.exif_transpose(img)
                img = img.convert("RGB")
                
                # Pre-procesamiento de contraste y nitidez para recibos de campo
                try:
                    img = ImageOps.autocontrast(img, cutoff=0.5)
                    enhancer = ImageEnhance.Sharpness(img)
                    img = enhancer.enhance(1.3)
                except Exception:
                    pass

                max_dim = max(img.width, img.height)
                if max_dim > 1024:
                    scale = 1024 / max_dim
                    img = img.resize((int(img.width * scale), int(img.height * scale)), Image.Resampling.LANCZOS)
                
                buffer = io.BytesIO()
                img.save(buffer, format="JPEG", quality=80)
                b64_image = base64.b64encode(buffer.getvalue()).decode("utf-8")

            prompt = f"""Actúa como auditor contable experto en comprobantes de gasto y facturación venezolana (facturas SENIAT, máquinas fiscales térmicas, tickets de venta, notas de entrega y talonarios manuscritos a bolígrafo/lápiz).
Analiza detenidamente esta imagen y extrae con precisión los datos contables en formato JSON válido.
Tasa de cambio de referencia del sistema: {default_rate} Bs/USD.

REGLAS CRÍTICAS DE LECTURA E INTERPRETACIÓN:
1. DETECCIÓN DE ORIENTACIÓN Y AUTO-ROTACIÓN: La fotografía puede haber sido tomada de lado (rotada 90° izquierda, 90° derecha o invertida 180°). Rota mentalmente la imagen según la orientación natural del texto y cifras para interpretarlo todo correctamente antes de extraer datos.
2. DOCUMENTOS MANUSCRITOS A MANO (MÁXIMA PRIORIDAD): Si la imagen muestra una hoja de cuaderno, papel rayado, talonario o comprobante escrito con bolígrafo o lápiz:
   - Lee cada renglón línea por línea buscando conceptos (ej: 'Cable 2x12', '3 tornillos hex', 'Cemento 1 bls', 'Cinta aislante', etc.) y el valor de cada ítem.
   - Busca el TOTAL en la parte inferior de la hoja, al final de la columna de valores, en un casillero o al lado de 'Total', 'Subtotal', 'A pagar', 'Ref', 'Monto'.
   - Si el monto está escrito como una cifra sola sin símbolo (ej: '2200'), asúmelo como Bolívares y calcula el USD dividiendo por la tasa.
   - Si el membrete no tiene RIF formal: asigna el nombre comercial legible como detected_vendor (ej: 'Ferretería La Clave', 'Materiales El Constructor'), o usa 'Nota Manuscrita / Comprobante Manual' si el nombre no es legible. Marca is_tax_exempt: true.
3. EMPRESAS DE ENCOMIENDA / TRANSPORTE VENEZOLANO: Si el comprobante corresponde a TEALCA, MRW, Zoom, Domesa, Motocarga, CoMoVen, Aerocav, Deprisa, o cualquier empresa de encomienda/flete, asigna:
   - detected_vendor: nombre oficial exacto (ej: "TEALCA C.A.", "MRW C.A.", "Servicio Postal Zoom")
   - suggested_category_code: "5.1" (Fletes / Encomiendas / Transporte)
   - El monto del envío como detected_amount_usd o detected_amount_bs según la moneda mostrada.
4. TICKETS TÉRMICOS SENIAT: NUNCA confundas el nombre de un artículo (ej: 'Carne', 'Filtro', 'Tornillos') con el nombre del proveedor. El proveedor siempre está en el membrete superior de la factura. Si hay RIF (ej: J-310071381), extráelo con precisión.
5. IDENTIFICACIÓN DE MONTOS Y TASAS:
   - Busca la línea de 'TOTAL', 'TOTAL A PAGAR', 'TOTAL BS', 'TOTAL GENERAL', 'TOTAL USD', 'MONTO', o el valor neto al pie del comprobante.
   - Si en la factura SENIAT aparece una tasa (ej: 'Tasa de Cambio BCV: 848.55'), usa esa tasa para la conversión exacta.
   - Si el monto está en Bolívares (Bs.), asígnalo a detected_amount_bs y calcula detected_amount_usd = detected_amount_bs / tasa.
   - Si el monto está en Dólares ($), asígnalo a detected_amount_usd y calcula detected_amount_bs = detected_amount_usd * tasa.
   - Si hay IVA (ej: 16%), extráelo en detected_tax_usd. Si es nota manual, vale o ticket exento, detected_tax_usd = 0.0 e is_tax_exempt = true.

Estructura de respuesta JSON esperada:
{{
  "detected_vendor": "Nombre comercial o razón social del proveedor/empresa",
  "detected_rif": "RIF si está visible o null",
  "detected_amount_bs": 0.0,
  "detected_amount_usd": 0.0,
  "detected_base_usd": 0.0,
  "detected_tax_usd": 0.0,
  "is_tax_exempt": false,
  "suggested_category_code": "10.0",
  "fuel_liters": null,
  "raw_summary": "Resumen detallado de los artículos, conceptos e importes leídos"
}}
Partidas Dalor: 1.1 Materiales construcción/eléctrica, 1.2 Consumibles, 2.1 Equipos, 3.1 Combustible, 4.1 Mantenimiento, 5.1 Fletes/Encomiendas/Transporte, 10.0 Honorarios/General, 15.0 Hospedaje, 16.0 Viáticos/Alimentos, 17.0 Ferretería/Herramientas, 19.0 Combustible/Gasoil, 20.0 Peajes/Vialidad.
Responde ÚNICAMENTE con el bloque JSON válido, sin texto adicional."""


            payload = {
                "contents": [{
                    "parts": [
                        {"text": prompt},
                        {
                            "inline_data": {
                                "mime_type": "image/jpeg",
                                "data": b64_image
                            }
                        }
                    ]
                }],
                "generationConfig": {
                    "temperature": 0.1,
                    "response_mime_type": "application/json"
                }
            }

            # Modelos ordenados por disponibilidad y costo (más estables primero)
            candidate_models = [
                "models/gemini-3.5-flash",
                "models/gemini-3.5-flash-lite",
                "models/gemini-3.8-flash",
                "models/gemini-3.7-flash",
                "models/gemini-3.1-flash-lite",
                "models/gemini-3.6-flash",
                "models/gemini-flash-latest"
            ]
            text_resp = None
            import time as _time
            for attempt_idx, model_name in enumerate(candidate_models):
                try:
                    url = f"https://generativelanguage.googleapis.com/v1beta/{model_name}:generateContent?key={api_key}"
                    req = urllib.request.Request(
                        url,
                        data=json.dumps(payload).encode("utf-8"),
                        headers={"Content-Type": "application/json"}
                    )
                    with urllib.request.urlopen(req, timeout=30) as res:
                        resp_data = json.loads(res.read().decode("utf-8"))
                        candidates = resp_data.get("candidates", [])
                        if candidates and "content" in candidates[0]:
                            parts = candidates[0]["content"].get("parts", [])
                            if parts and "text" in parts[0]:
                                text_resp = parts[0]["text"].strip()
                                if text_resp:
                                    break
                except urllib.error.HTTPError as m_err:
                    err_code = m_err.code
                    print(f"Gemini model {model_name} error: HTTP {err_code}")
                    if err_code in (429, 503) and attempt_idx < len(candidate_models) - 1:
                        _time.sleep(1.5 + attempt_idx * 0.5)  # backoff exponencial suave
                    continue
                except Exception as m_err:
                    print(f"Gemini model {model_name} error: {m_err}")
                    continue


            if not text_resp:
                return None

            if "```json" in text_resp:
                text_resp = text_resp.split("```json")[1].split("```")[0].strip()
            elif "```" in text_resp:
                text_resp = text_resp.split("```")[1].split("```")[0].strip()

            parsed_json = json.loads(text_resp)
            
            def to_clean_float(val):
                if val is None:
                    return 0.0
                if isinstance(val, (int, float)):
                    return float(val)
                return OCRReceiptParser._clean_number_str(str(val))

            amt_usd = to_clean_float(parsed_json.get("detected_amount_usd"))
            amt_bs = to_clean_float(parsed_json.get("detected_amount_bs"))

            if amt_usd > 0 and amt_bs == 0:
                amt_bs = round(amt_usd * default_rate, 2)
            elif amt_bs > 0 and amt_usd == 0:
                amt_usd = round(amt_bs / default_rate, 2)

            base_usd = to_clean_float(parsed_json.get("detected_base_usd"))
            if base_usd == 0 and amt_usd > 0:
                base_usd = round(amt_usd * 0.862, 2)
            tax_usd = to_clean_float(parsed_json.get("detected_tax_usd"))
            if tax_usd == 0 and amt_usd > base_usd:
                tax_usd = round(amt_usd - base_usd, 2)

            return {
                "detected_vendor": parsed_json.get("detected_vendor") or "Comercio General",
                "detected_rif": parsed_json.get("detected_rif"),
                "detected_amount_bs": round(amt_bs, 2),
                "detected_amount_usd": round(amt_usd, 2),
                "detected_base_usd": round(base_usd, 2),
                "detected_tax_usd": round(tax_usd, 2),
                "is_tax_exempt": bool(parsed_json.get("is_tax_exempt") or tax_usd <= 0.01),
                "suggested_category_code": str(parsed_json.get("suggested_category_code") or "10.0"),
                "suggested_category_id": None,
                "fuel_liters": to_clean_float(parsed_json.get("fuel_liters")) if parsed_json.get("fuel_liters") is not None else None,
                "raw_text": f"GEMINI VISION IA: {parsed_json.get('raw_summary', '')}\nProveedor: {parsed_json.get('detected_vendor', '')}\nTotal: ${amt_usd:.2f} USD ({amt_bs:,.2f} Bs)"
            }
        except Exception as e:
            print("Error ejecutando Gemini Vision REST:", e)
            return None

    @staticmethod
    def extract_text_from_pdf(pdf_path: str) -> str:
        try:
            from pypdf import PdfReader
            reader = PdfReader(pdf_path)
            text = ""
            for page in reader.pages:
                text += (page.extract_text() or "") + "\n"
            return text
        except Exception as e:
            print("Error leyendo archivo PDF:", e)
            return ""

    @staticmethod
    async def extract_text_from_file(file_path: str) -> str:
        ext = file_path.lower().split(".")[-1]
        
        # 1. Si es un archivo PDF digital
        if ext == "pdf":
            return OCRReceiptParser.extract_text_from_pdf(file_path)

        # 2. Si es una imagen (JPG, PNG, WebP, HEIC)
        try:
            clean_temp_path = file_path + "_preprocessed.png"
            with Image.open(file_path) as img:
                img = ImageOps.exif_transpose(img)
                img = img.convert("RGB")
                
                # Si la imagen es muy pequeña (<800px), escalar para mejorar legibilidad OCR
                min_dim = min(img.width, img.height)
                if min_dim < 800:
                    scale = 800 / max(min_dim, 1)
                    img = img.resize((int(img.width * scale), int(img.height * scale)), Image.Resampling.LANCZOS)
                
                # Redimensionar si la resolución es muy alta (>2000px)
                max_dim = max(img.width, img.height)
                if max_dim > 2000:
                    scale = 2000 / max_dim
                    img = img.resize((int(img.width * scale), int(img.height * scale)), Image.Resampling.LANCZOS)
                
                img.save(clean_temp_path, "PNG")

            # Intento A: PyTesseract (Linux / Docker en Render)
            if PYTESSERACT_AVAILABLE:
                try:
                    with Image.open(clean_temp_path) as pre_img:
                        extracted = pytesseract.image_to_string(pre_img, lang='spa+eng')
                        if extracted and len(extracted.strip()) > 5:
                            try:
                                if os.path.exists(clean_temp_path):
                                    os.remove(clean_temp_path)
                            except Exception:
                                pass
                            return extracted
                except Exception as t_err:
                    print("PyTesseract OCR error:", t_err)

            # Intento B: Windows WinSDK (Windows local con auto-rotación)
            if WINSDK_AVAILABLE:
                try:
                    abs_path = os.path.abspath(clean_temp_path)
                    storage_file = await storage.StorageFile.get_file_from_path_async(abs_path)
                    stream = await storage_file.open_async(storage.FileAccessMode.READ)
                    decoder = await imaging.BitmapDecoder.create_async(stream)
                    bitmap = await decoder.get_software_bitmap_async()
                    
                    engine = win_ocr.OcrEngine.try_create_from_user_profile_languages()
                    if engine:
                        result = await engine.recognize_async(bitmap)
                        extracted = result.text or ""
                        
                        # Si no detectó texto o la foto fue tomada de lado, intentar rotaciones 90°, 270°, 180°
                        if not extracted or len(extracted.strip()) < 5:
                            for angle in [90, 270, 180]:
                                try:
                                    rot_path = clean_temp_path + f"_rot{angle}.png"
                                    with Image.open(clean_temp_path) as r_img:
                                        r_img.rotate(angle, expand=True).save(rot_path, "PNG")
                                    rot_abs = os.path.abspath(rot_path)
                                    rot_file = await storage.StorageFile.get_file_from_path_async(rot_abs)
                                    rot_stream = await rot_file.open_async(storage.FileAccessMode.READ)
                                    rot_dec = await imaging.BitmapDecoder.create_async(rot_stream)
                                    rot_bm = await rot_dec.get_software_bitmap_async()
                                    rot_res = await engine.recognize_async(rot_bm)
                                    try:
                                        if os.path.exists(rot_path):
                                            os.remove(rot_path)
                                    except Exception:
                                        pass
                                    if rot_res.text and len(rot_res.text.strip()) > len(extracted):
                                        extracted = rot_res.text
                                        if len(extracted.strip()) > 10:
                                            break
                                except Exception:
                                    pass

                        try:
                            if os.path.exists(clean_temp_path):
                                os.remove(clean_temp_path)
                        except Exception:
                            pass
                        return extracted
                except Exception as w_err:
                    print("WinSDK OCR error:", w_err)

            try:
                if os.path.exists(clean_temp_path):
                    os.remove(clean_temp_path)
            except Exception:
                pass

        except Exception as e:
            print("Error en preprocesamiento de imagen OCR:", e)
            
        return ""

    @staticmethod
    def _clean_number_str(s: str) -> float:
        s = s.strip()
        s = re.sub(r'[^\d,\.]', '', s)
        if not s:
            return 0.0
        if ',' in s and '.' in s:
            if s.rfind(',') > s.rfind('.'):
                # Formato europeo/latinoamericano: 1.234,56
                s = s.replace('.', '').replace(',', '.')
            else:
                # Formato estándar US: 1,234.56
                s = s.replace(',', '')
        elif ',' in s:
            parts = s.split(',')
            if len(parts[-1]) == 2:
                s = s.replace(',', '.')
            else:
                s = s.replace(',', '')
        try:
            return float(s)
        except ValueError:
            return 0.0

    @staticmethod
    def parse_text(raw_text: str, default_rate: float = None) -> Dict[str, Any]:
        rate = default_rate or settings.DEFAULT_EXCHANGE_RATE
        text = raw_text if raw_text else ""
        upper_text = text.upper()

        # Normalización profunda de texto y caracteres OCR
        cleaned = text.replace('\r', ' ')
        cleaned = re.sub(r'[,\.]oo\b', '.00', cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r'[,\.]OO\b', '.00', cleaned)
        # Limpiar 'S' aislada cuando reemplaza al signo $
        cleaned = re.sub(r'(?<=\s)[Ss](\d+[\.,]\d{2})', r' \1', cleaned)
        cleaned = cleaned.replace('$', ' ').replace('USD', ' ').replace('Bs.', ' ')

        # Filtrar notas de pie de página de conversión secundaria multilínea (ej: 'Entspricht in Euro ... 36.33 EUR')
        cleaned_no_footnotes = re.sub(r'(?s)(?:ENTSPRICHT|EQUIVALENTE|CONVERSION|TASA\s*CAMBIO).*?(\d+[\.,]\d+)\s*(?:EUR|BS|USD|\$)?', ' ', cleaned, flags=re.IGNORECASE)

        # Líneas normalizadas en una sola línea para búsquedas multilínea
        single_line = re.sub(r'[\r\n]+', ' ', cleaned_no_footnotes)
        single_line = re.sub(r'\s+', ' ', single_line)
        single_upper = single_line.upper()

        detected_vendor = "Comercio / Proveedor General"
        detected_date = datetime.now().strftime("%Y-%m-%d")
        detected_amount_bs = 0.0
        detected_amount_usd = 0.0
        fuel_liters = None
        suggested_category_code = "10.0"

        # ----------------------------------------------------
        # 1. Detección Inteligente y Limpia de Comercio / Proveedor
        # ----------------------------------------------------
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        header_candidate = ""
        for line in lines[:4]:
            clean_l = re.sub(r'[^\w\s\.,\-&áéíóúÁÉÍÓÚñÑ]', '', line).strip()
            if len(clean_l) > 3 and not any(k in clean_l.upper() for k in ["FACTURA", "INVOICE", "RECEIPT", "FECHA", "RIF", "NRO", "EMISION", "CLIENTE", "PAGINA", "TEL"]):
                header_candidate = clean_l
                break

        vendor_match = re.search(r'(?:FACTURA|INVOICE)\s+([A-Za-z0-9\s,\.\-&áéíóúÁÉÍÓÚñÑ]{3,50}?)(?:\n|Torre|Av\.|Calle|RIF|J-|Caracas|Distrito|\+58)', text, re.IGNORECASE)
        if vendor_match:
            clean_v = vendor_match.group(1).strip()
            if len(clean_v) > 3 and not any(k in clean_v.upper() for k in ["DE FACTURA", "EMISION", "FECHA"]):
                detected_vendor = clean_v
        elif header_candidate:
            detected_vendor = header_candidate

        # Limpieza profunda de ítems o palabras de factura en el nombre del comercio
        detected_vendor = re.split(r'\b(?:\d+x|\d+[.,]\d+|BAR\b|PAGO\b|TOTAL\b|SUBTOTAL\b|HUILE\b|STEAK\b|PENNE\b|SURGELE\b|LATTE\b|MACCHIATO\b|SCHNITZEL\b)\b', detected_vendor, flags=re.IGNORECASE)[0].strip()
        detected_vendor = re.sub(r'[\s,\.\-]+$', '', detected_vendor).strip()
        if len(detected_vendor) > 35:
            detected_vendor = detected_vendor[:35].strip()
        if not detected_vendor or len(detected_vendor) < 3:
            detected_vendor = "Comercio / Proveedor General"

        # Clasificación por Palabras Clave
        if any(w in single_upper for w in ["NEPTUNIA", "ALIANZA"]):
            suggested_category_code = "12.1"
            detected_vendor = "Neptunia C.A."
        elif any(w in single_upper for w in ["STARLINK", "SPACEX", "SATELLITE"]):
            suggested_category_code = "12.3"
            detected_vendor = "Starlink Internet"
        elif any(w in single_upper for w in ["STEAKHOUSE", "RESTAURANT", "FOOD", "GRILL", "CAFE", "PIZZA", "PANADERIA", "ALMUERZO", "COMIDA", "MELOCOTON", "TOMATE", "PARAGUAYO", "SUPERMERCADO", "ABASTO", "CARNES", "PENNE", "HUILE"]):
            suggested_category_code = "16.0"
            if detected_vendor == "Comercio / Proveedor General":
                detected_vendor = "Comercio de Alimentos / Restaurante"
        elif any(w in single_upper for w in ["FERRETERIA", "REPUESTOS", "TORNILLO", "LUBRICANTE", "FILTRO", "CAUCHO", "MATERIALES", "ELECTRICO", "CABLES", "ACERO", "SOLDADURA"]):
            suggested_category_code = "17.0"
            if detected_vendor == "Comercio / Proveedor General":
                detected_vendor = "Suministros Técnicos / Ferretería"
        elif any(w in single_upper for w in ["E/S ", "ESTACION DE SERVICIO", "GASOLINA", "DIESEL", "PDVSA", "COMBUSTIBLE", "BOMBA"]):
            suggested_category_code = "19.0"
            if detected_vendor == "Comercio / Proveedor General":
                detected_vendor = "Estación de Servicio"
        elif any(w in single_upper for w in ["HOTEL", "POSADA", "HOSPEDAJE", "SUITES", "INN", "BERGHOTEL", "GROSSE"]):
            suggested_category_code = "15.0"
            if detected_vendor == "Comercio / Proveedor General":
                detected_vendor = "Hospedaje / Hotel"
        elif any(w in single_upper for w in ["PEAJE", "AUTOPISTA", "VIALIDAD", "COVIAL"]):
            suggested_category_code = "20.0"
            if detected_vendor == "Comercio / Proveedor General":
                detected_vendor = "Peaje / Vialidad"
        # ENCOMIENDAS / TRANSPORTE VENEZOLANO - detectado antes de categoría general
        elif any(w in single_upper for w in ["TEALCA", "TRANSPORTE ESPECIAL ALVAREZ", "MRW ", " MRW", "ZOOM COURIER", "DOMESA", "MOTOCARGA", "COMOVEN", "AEROCAV", "DEPRISA", "ENCOMIENDA", "MENSAJERIA", "SERVICIO POSTAL"]):
            suggested_category_code = "5.1"
            # Identificar la empresa exacta
            if "TEALCA" in single_upper or "TRANSPORTE ESPECIAL ALVAREZ" in single_upper:
                detected_vendor = "TEALCA C.A."
            elif "MRW" in single_upper:
                detected_vendor = "MRW C.A."
            elif "ZOOM" in single_upper:
                detected_vendor = "Zoom Courier C.A."
            elif "DOMESA" in single_upper:
                detected_vendor = "Domesa C.A."
            elif "MOTOCARGA" in single_upper:
                detected_vendor = "Motocarga C.A."
            elif detected_vendor == "Comercio / Proveedor General":
                detected_vendor = "Servicio de Encomienda / Mensajería"
        elif any(w in single_upper for w in ["TRANSPORTE", "FLETE", "ACARREO", "CAMION", "MUDANZA"]):
            suggested_category_code = "5.1"
            if detected_vendor == "Comercio / Proveedor General":
                detected_vendor = "Transporte / Flete"

        # ----------------------------------------------------
        # 2. Extracción de Litros (Combustible)
        # ----------------------------------------------------
        if suggested_category_code == "19.0" or "LTS" in single_upper or "LITROS" in single_upper:
            liters_match = re.search(r'(?:LITROS|LTS|VOLUMEN)\s*[:=]?\s*(\d+[.,]?\d*)', single_upper)
            if not liters_match:
                liters_match = re.search(r'(\d+[.,]?\d*)\s*(?:LTS\b|LITROS\b|LT\b)', single_upper)
            if liters_match:
                try:
                    fuel_liters = float(liters_match.group(1).replace(',', '.'))
                except ValueError:
                    pass

        # ----------------------------------------------------
        # 3. EXTRACCIÓN ROBUSTA Y MATEMÁTICA DEL MONTO TOTAL
        # ----------------------------------------------------
        all_raw_decimals = re.findall(r'(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})|\d+[.,]\d{2})', single_line)
        all_floats = [OCRReceiptParser._clean_number_str(x) for x in all_raw_decimals if OCRReceiptParser._clean_number_str(x) > 0]

        # Detección de Subtotal, Impuesto (IVA/Tax) y Propina (Tip)
        subtotal = 0.0
        sub_m = re.search(r'(?:SUBTOTAL|BASE\s*IMPONIBLE|Base:?)\s*[:=]?\s*[\$€EURUSDBS\.\s]*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})|\d+[.,]\d{2})', single_line, re.IGNORECASE)
        if sub_m:
            subtotal = OCRReceiptParser._clean_number_str(sub_m.group(1))

        tax = 0.0
        tax_m = re.search(r'(?:IVA|TAX|IMPUESTO|Total\s*IVA|MwSt)\s*(?:\([^)]*\)|\d+%|\w+)?\s*[:=]?\s*[\$€EURUSDBS\.\s]*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})|\d+[.,]\d{2})', single_line, re.IGNORECASE)
        if tax_m:
            tax = OCRReceiptParser._clean_number_str(tax_m.group(1))

        tip = 0.0
        tip_m = re.search(r'(?:TIP|PROPINA)\s*[:=]?\s*[\$€EURUSDBS\.\s]*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})|\d+[.,]\d{2})', single_line, re.IGNORECASE)
        if tip_m:
            tip = OCRReceiptParser._clean_number_str(tip_m.group(1))

        expected_math_total = 0.0
        if subtotal > 0 and tax > 0:
            expected_math_total = round(subtotal + tax + tip, 2)

        # Frases directas de Total
        explicit_candidates = []
        patterns_strong_total = [
            r'(?:TOTAL\s*A\s*PAGAR|TOTAL\s*APAGAR|TOTAL\s*FACTURA|TOTAL\s*GENERAL|TOTAL\s*DUE|AMOUNT\s*DUE|NETO\s*A\s*PAGAR|IMPORTE\s*TOTAL|MONTO\s*TOTAL|RESTE\s*A\s*PAYER|TOTAL\s*HORS\s*AVANTAGES)\s*[:=]?\s*[\$€EURUSDBS\.\s]*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})|\d+[.,]\d{2})',
            r'(?:EFECTIVO|CASH|TOTAL\s*USD|TOTAL\s*\$|TOTAL\s*CHF)\s*[:=]?\s*[\$€EURUSDBS\.\s]*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})|\d+[.,]\d{2})',
            r'\bTOTAL\b\s*[:=]?\s*[\$€EURUSDBS\.\s]*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})|\d+[.,]\d{2})'
        ]

        for pat in patterns_strong_total:
            for m in re.finditer(pat, single_line, re.IGNORECASE):
                val = OCRReceiptParser._clean_number_str(m.group(1))
                if val > 0:
                    explicit_candidates.append(val)

        chosen_total = 0.0

        # Regla 1: Coincidencia matemática exacta
        if expected_math_total > 0:
            for n in all_floats + explicit_candidates:
                if abs(n - expected_math_total) < 0.05:
                    chosen_total = n
                    break
            if chosen_total == 0:
                chosen_total = expected_math_total

        # Regla 2: Candidatos explícitos de frases de total
        if chosen_total == 0 and explicit_candidates:
            valid_cands = explicit_candidates
            if subtotal > 0:
                valid_cands = [c for c in explicit_candidates if c >= subtotal]
            if valid_cands:
                chosen_total = valid_cands[0]
            else:
                chosen_total = explicit_candidates[0]

        # Regla 3: En recibos en columnas o tickets donde el total real está al final del bloque
        if all_floats:
            last_val = all_floats[-1]
            max_val = max(all_floats)
            if chosen_total == 0 or (last_val > chosen_total and any(w in single_upper for w in ["TOTAL", "DUE", "BALANCE", "PAGO", "AMOUNT", "RECEIPT", "PAYER", "CHF"])):
                chosen_total = last_val
            elif chosen_total < subtotal:
                chosen_total = max_val

        detected_amount_usd = round(chosen_total, 2)
        if detected_amount_usd > 0:
            detected_amount_bs = round(detected_amount_usd * rate, 2)

        base_usd = subtotal if (subtotal > 0 and subtotal <= detected_amount_usd) else detected_amount_usd
        tax_usd = tax if (tax > 0 and tax < detected_amount_usd) else round(detected_amount_usd - base_usd, 2)

        return {
            "detected_vendor": detected_vendor,
            "detected_amount_bs": detected_amount_bs,
            "detected_amount_usd": detected_amount_usd,
            "detected_base_usd": round(base_usd, 2),
            "detected_tax_usd": round(tax_usd, 2),
            "suggested_category_code": suggested_category_code,
            "suggested_category_id": None,
            "fuel_liters": fuel_liters,
            "raw_text": text
        }

    @staticmethod
    def extract_odometer_from_image(file_path: str) -> Dict[str, Any]:
        """
        Extrae la lectura del odómetro (kilometraje total) desde una fotografía del tablero
        del vehículo mediante Visión Multimodal por IA (Gemini) o OCR local con filtros numéricos.
        """
        api_key = os.getenv("GEMINI_API_KEY") or getattr(settings, "GEMINI_API_KEY", None) or os.getenv("GOOGLE_API_KEY")

        # 1. Intentar con Gemini Vision
        if api_key:
            try:
                import urllib.request
                import json
                import io

                with Image.open(file_path) as img:
                    img = ImageOps.exif_transpose(img)
                    img = img.convert("RGB")
                    max_dim = max(img.width, img.height)
                    if max_dim > 1600:
                        scale = 1600 / max_dim
                        img = img.resize((int(img.width * scale), int(img.height * scale)), Image.Resampling.LANCZOS)
                    
                    buffer = io.BytesIO()
                    img.save(buffer, format="JPEG", quality=85)
                    b64_image = base64.b64encode(buffer.getvalue()).decode("utf-8")

                prompt = """Actúa como un sistema experto de visión por computador para gestión de flotas y mantenimiento vehicular.
Analiza detenidamente esta fotografía del tablero de instrumentos / clúster de un vehículo y extrae el KILOMETRAJE TOTAL DEL ODÓMETRO (ODO).

REGLAS CRÍTICAS:
1. Busca el odómetro principal del vehículo (usualmente 5 o 6 dígitos enteros, ej: 125480, 84500, 215320, 68910).
2. NO confundas el odómetro total con:
   - El odómetro parcial o TRIP (que suele tener un decimal o la palabra TRIP A / TRIP B).
   - El velocímetro (0 a 220 km/h) ni el tacómetro / RPM (0 a 8 x1000).
   - La hora del reloj (ej: 12:45) ni la temperatura exterior (ej: 32°C).
   - El indicador de combustible o nivel de batería.
3. Si el número tiene puntos o comas de separación de miles (ej: 125.480 o 125,480), conviértelo a número entero (125480).
4. Si la foto está rotada, gírala mentalmente para leer la cifra correctamente.

Responde ÚNICAMENTE con este JSON válido:
{
  "detected_odometer": 125480.0,
  "confidence": 0.95,
  "dashboard_type": "digital | analogo",
  "notes": "Lectura clara del odómetro principal"
}"""

                payload = {
                    "contents": [{
                        "parts": [
                            {"text": prompt},
                            {
                                "inline_data": {
                                    "mime_type": "image/jpeg",
                                    "data": b64_image
                                }
                            }
                        ]
                    }],
                    "generationConfig": {
                        "temperature": 0.1,
                        "response_mime_type": "application/json"
                    }
                }

                candidate_models = [
                    "models/gemini-3.1-flash-lite",
                    "models/gemini-3.5-flash-lite",
                    "models/gemini-3.8-flash",
                    "models/gemini-3.6-flash",
                    "models/gemini-flash-latest"
                ]
                for model_name in candidate_models:
                    try:
                        url = f"https://generativelanguage.googleapis.com/v1beta/{model_name}:generateContent?key={api_key}"
                        req = urllib.request.Request(
                            url,
                            data=json.dumps(payload).encode("utf-8"),
                            headers={"Content-Type": "application/json"}
                        )
                        with urllib.request.urlopen(req, timeout=15) as res:
                            resp_data = json.loads(res.read().decode("utf-8"))
                            candidates = resp_data.get("candidates", [])
                            if candidates and "content" in candidates[0]:
                                parts = candidates[0]["content"].get("parts", [])
                                if parts and "text" in parts[0]:
                                    text_resp = parts[0]["text"].strip()
                                    if "```json" in text_resp:
                                        text_resp = text_resp.split("```json")[1].split("```")[0].strip()
                                    elif "```" in text_resp:
                                        text_resp = text_resp.split("```")[1].split("```")[0].strip()
                                    parsed = json.loads(text_resp)
                                    odo_val = float(parsed.get("detected_odometer") or 0.0)
                                    if odo_val > 0:
                                        return {
                                            "detected_odometer": round(odo_val, 1),
                                            "confidence": float(parsed.get("confidence", 0.9)),
                                            "dashboard_type": parsed.get("dashboard_type", "digital"),
                                            "is_ai_vision": True,
                                            "notes": parsed.get("notes", "Odómetro identificado con IA de Visión")
                                        }
                    except Exception as e:
                        print(f"Error en Gemini Odometer Vision ({model_name}):", e)
                        continue
            except Exception as outer_e:
                print("Error general en OCR Odometer Gemini:", outer_e)

        # 2. Fallback: OCR de texto con pytesseract/regex
        try:
            raw_text = ""
            if PYTESSERACT_AVAILABLE:
                with Image.open(file_path) as img:
                    img = ImageOps.exif_transpose(img).convert("L")
                    raw_text = pytesseract.image_to_string(img, config='--psm 6 digits')
            
            numbers = re.findall(r'\b(\d{4,6})\b', raw_text)
            if numbers:
                # Tomar el candidato numérico más verosímil
                valid_nums = [float(n) for n in numbers if 1000 <= float(n) <= 999999]
                if valid_nums:
                    return {
                        "detected_odometer": valid_nums[0],
                        "confidence": 0.75,
                        "dashboard_type": "analogo_ocr",
                        "is_ai_vision": False,
                        "notes": f"Lectura OCR por patrón numérico ({valid_nums[0]:,.0f} Km)"
                    }
        except Exception as ocr_err:
            print("Error en fallback OCR Odómetro:", ocr_err)

        return {
            "detected_odometer": 0.0,
            "confidence": 0.0,
            "dashboard_type": "desconocido",
            "is_ai_vision": False,
            "notes": "No se pudo detectar el odómetro automáticamente. Por favor ingrésalo manualmente."
        }

