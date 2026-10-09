"""
Servicio de Marca Blanca (White-Label) para Gestion de Perfil de Empresa.
Mantiene un cache de alto rendimiento en memoria para entregar la identidad fiscal y visual
a comprobantes, facturas, presupuestos y reportes con latencia ultra-baja (<0.01 ms).
"""
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from datetime import datetime

from app.models.models import CompanyProfile

class CompanyProfileService:
    _cached_dict: Optional[Dict[str, Any]] = None
    _last_cache_time: Optional[datetime] = None

    @classmethod
    def get_profile(cls, db: Session) -> Dict[str, Any]:
        """
        Retorna la configuracion activa de la empresa. Utiliza cache en memoria.
        """
        if cls._cached_dict is not None:
            return cls._cached_dict

        profile = db.query(CompanyProfile).filter(CompanyProfile.is_default == True).first()
        if not profile:
            profile = db.query(CompanyProfile).first()

        if not profile:
            profile = CompanyProfile(
                legal_name="METALMECANICA DALOR, C.A.",
                trade_name="DALOR SIGO-P",
                rif="J-31601195-0",
                fiscal_address="AV CAMARA DE LAS INDUSTRIAS LOCAL GALPON NRO 10 ZONA INDUSTRIAL EL TIGRE GUACARA CARABOBO",
                phone="+58 (245) 000-0000",
                email="metalmecanicadalorca@yahoo.com",
                legal_base_seniat="Providencia Administrativa SNAT/2015/0049 de fecha 17/07/2015, publicada en Gaceta Oficial N° 40.720 del 10/08/2015.",
                logo_url=None,
                currency_symbol="$",
                primary_color="#002B49",
                secondary_color="#D4AF37",
                is_default=True
            )
            db.add(profile)
            db.commit()
            db.refresh(profile)

        data = {
            "id": profile.id,
            "legal_name": profile.legal_name,
            "trade_name": profile.trade_name,
            "rif": profile.rif,
            "fiscal_address": profile.fiscal_address,
            "phone": profile.phone,
            "email": profile.email,
            "legal_base_seniat": profile.legal_base_seniat,
            "logo_url": profile.logo_url,
            "currency_symbol": profile.currency_symbol or "$",
            "primary_color": profile.primary_color or "#002B49",
            "secondary_color": profile.secondary_color or "#D4AF37",
            "is_default": profile.is_default,
            "updated_at": profile.updated_at.isoformat() if profile.updated_at else datetime.utcnow().isoformat()
        }
        cls._cached_dict = data
        cls._last_cache_time = datetime.utcnow()
        return data

    @classmethod
    def update_profile(cls, db: Session, update_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Actualiza el perfil de empresa y refresca el cache inmediatamente.
        """
        profile = db.query(CompanyProfile).filter(CompanyProfile.is_default == True).first()
        if not profile:
            profile = db.query(CompanyProfile).first()

        if not profile:
            profile = CompanyProfile()
            db.add(profile)

        updatable_fields = [
            "legal_name", "trade_name", "rif", "fiscal_address",
            "phone", "email", "legal_base_seniat", "logo_url",
            "currency_symbol", "primary_color", "secondary_color"
        ]

        for field in updatable_fields:
            if field in update_data and update_data[field] is not None:
                setattr(profile, field, update_data[field])

        profile.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(profile)

        # Invalidar y actualizar cache
        cls._cached_dict = None
        return cls.get_profile(db)

    @classmethod
    def clear_cache(cls):
        """Invalida el cache en memoria."""
        cls._cached_dict = None
