import re
from sqlalchemy.orm import Session
from app.models.models import ServiceItem

OFFICIAL_APU_CATEGORIES = [
    "Fabricación Metalmecánica",
    "Montaje e Instalación en Sitio",
    "Mantenimiento Industrial & Paradas",
    "Soldadura Especializada & Pailería",
    "Mecanizado & Torno",
    "Arenado y Pintura Industrial",
    "Obras Civiles & Eléctricas Asociadas"
]

def get_next_service_code_value(db: Session) -> str:
    items = db.query(ServiceItem).all()
    max_num = 0
    for item in items:
        if item.code:
            m = re.match(r'^APU-(\d+)$', item.code.strip())
            if m:
                max_num = max(max_num, int(m.group(1)))
    if max_num > 0:
        next_num = max_num + 1
    else:
        next_num = len(items) + 1
    code = f"APU-{next_num:03d}"
    while db.query(ServiceItem).filter(ServiceItem.code == code).first():
        next_num += 1
        code = f"APU-{next_num:03d}"
    return code
