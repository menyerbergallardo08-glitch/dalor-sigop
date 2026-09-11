import os
import re
import ssl
import json
import urllib.request
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

class BCVExchangeRateService:
    """
    Servicio de Cotizacion Oficial BCV con Arquitectura de Blindaje en 4 Capas:
    - Capa 1: Scraper Directo Oficial Banco Central de Venezuela (bcv.org.ve)
    - Capa 2: API Espejo de Respaldo de Alta Disponibilidad (DolarApi)
    - Capa 3: Cache Persistente en Base de Datos / Memoria
    - Capa 4: Fallback Base de Contingencia (850.00)
    """

    _cached_data: Optional[Dict[str, Any]] = None
    _last_fetch_time: Optional[datetime] = None
    _CACHE_DURATION_MINUTES = 30 # Refrescar cada 30 min o manual

    @classmethod
    def get_current_rate(cls, force_refresh: bool = False) -> Dict[str, Any]:
        now = datetime.now()

        # Si tenemos cache fresco y no es forzado, devolverlo
        if not force_refresh and cls._cached_data and cls._last_fetch_time:
            if now - cls._last_fetch_time < timedelta(minutes=cls._CACHE_DURATION_MINUTES):
                return cls._cached_data

        # ----------------------------------------------------
        # CAPA 1: Scraper Directo Oficial BCV (bcv.org.ve)
        # ----------------------------------------------------
        try:
            ctx = ssl.create_default_context()
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE

            req = urllib.request.Request(
                "https://www.bcv.org.ve/",
                headers={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
                }
            )
            with urllib.request.urlopen(req, timeout=7, context=ctx) as res:
                html = res.read().decode("utf-8", errors="ignore")

                # Extraer USD
                usd_match = re.search(r'USD\s*</span>\s*</div>\s*<div[^>]*>\s*<strong[^>]*>([0-9,\.]+)</strong>', html, re.IGNORECASE)
                if not usd_match:
                    usd_match = re.search(r'USD.*?<strong[^>]*>([0-9,\.]+)</strong>', html, re.DOTALL | re.IGNORECASE)

                # Extraer Fecha Valor
                fecha_match = re.search(r'Fecha Valor:\s*<span[^>]*>(?:<[^>]+>)*\s*([^<]+)', html, re.IGNORECASE)
                fecha_valor_str = fecha_match.group(1).strip() if fecha_match else now.strftime("%d/%m/%Y")

                if usd_match:
                    raw_rate_str = usd_match.group(1).replace(".", "").replace(",", ".")
                    rate_val = round(float(raw_rate_str), 2)
                    if rate_val > 0:
                        result = {
                            "rate": rate_val,
                            "formatted_rate": f"{rate_val:,.2f}",
                            "date_value": fecha_valor_str,
                            "source": "BCV Oficial (bcv.org.ve)",
                            "source_tier": "oficial_directo",
                            "last_updated": now.strftime("%Y-%m-%d %H:%M:%S"),
                            "is_fallback": False,
                            "status": "success"
                        }
                        cls._cached_data = result
                        cls._last_fetch_time = now
                        return result
        except Exception as e:
            print(f"[BCV Scraper] Advertencia en Capa 1 (bcv.org.ve): {e}")

        # ----------------------------------------------------
        # CAPA 2: API Espejo de Respaldo (DolarApi Oficial BCV)
        # ----------------------------------------------------
        try:
            req2 = urllib.request.Request(
                "https://ve.dolarapi.com/v1/dolares/oficial",
                headers={"User-Agent": "DalorSigop-Scraper/2.0"}
            )
            with urllib.request.urlopen(req2, timeout=5) as res2:
                data2 = json.loads(res2.read().decode("utf-8"))
                rate_val = round(float(data2.get("promedio", 0.0)), 2)
                fecha_upd = data2.get("fechaActualizacion", now.strftime("%Y-%m-%d"))

                if rate_val > 0:
                    result = {
                        "rate": rate_val,
                        "formatted_rate": f"{rate_val:,.2f}",
                        "date_value": fecha_upd[:10] if len(fecha_upd) >= 10 else now.strftime("%d/%m/%Y"),
                        "source": "API Espejo BCV (DolarApi)",
                        "source_tier": "espejo_redundante",
                        "last_updated": now.strftime("%Y-%m-%d %H:%M:%S"),
                        "is_fallback": False,
                        "status": "success"
                    }
                    cls._cached_data = result
                    cls._last_fetch_time = now
                    return result
        except Exception as e2:
            print(f"[BCV Scraper] Advertencia en Capa 2 (DolarApi): {e2}")

        # ----------------------------------------------------
        # CAPA 3: Ultima Cotizacion Valida en Memoria/Cache
        # ----------------------------------------------------
        if cls._cached_data and cls._cached_data.get("rate", 0) > 0:
            cls._cached_data["is_fallback"] = True
            cls._cached_data["source"] = f"{cls._cached_data['source']} (Cache Guardado)"
            return cls._cached_data

        # ----------------------------------------------------
        # CAPA 4: Fallback Base de Contingencia (850.00)
        # ----------------------------------------------------
        return {
            "rate": 850.00,
            "formatted_rate": "850.00",
            "date_value": now.strftime("%d/%m/%Y"),
            "source": "Tasa Base de Contingencia",
            "source_tier": "fallback_base",
            "last_updated": now.strftime("%Y-%m-%d %H:%M:%S"),
            "is_fallback": True,
            "status": "warning"
        }
