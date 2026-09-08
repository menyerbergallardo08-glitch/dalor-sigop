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

class OCRReceiptParser:
    """
    Motor de extracción inteligente para facturas en PDF, fotos de tickets y comprobantes
    """

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
        if not WINSDK_AVAILABLE:
            return ""
            
        try:
            # Preprocesamiento con PIL para garantizar compatibilidad con fotos de celular
            clean_temp_path = file_path + "_preprocessed.png"
            with Image.open(file_path) as img:
                img = ImageOps.exif_transpose(img)
                img = img.convert("RGB")
                
                # Redimensionar si la resolución es muy alta para el motor OCR
                max_dim = max(img.width, img.height)
                if max_dim > 2000:
                    scale = 2000 / max_dim
                    img = img.resize((int(img.width * scale), int(img.height * scale)), Image.Resampling.LANCZOS)
                
                img.save(clean_temp_path, "PNG")

            abs_path = os.path.abspath(clean_temp_path)
            storage_file = await storage.StorageFile.get_file_from_path_async(abs_path)
            stream = await storage_file.open_async(storage.FileAccessMode.READ)
            decoder = await imaging.BitmapDecoder.create_async(stream)
            bitmap = await decoder.get_software_bitmap_async()
            
            engine = win_ocr.OcrEngine.try_create_from_user_profile_languages()
            if engine:
                result = await engine.recognize_async(bitmap)
                extracted = result.text or ""
                
                try:
                    if os.path.exists(clean_temp_path):
                        os.remove(clean_temp_path)
                except Exception:
                    pass
                    
                return extracted

        except Exception as e:
            print("Error en OCR de imagen:", e)
            
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
