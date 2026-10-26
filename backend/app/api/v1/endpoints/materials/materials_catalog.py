from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.models.models import Material, MaterialMovement
from app.services.inventory_excel_service import InventoryExcelService
from .materials_common import MaterialCreate, MaterialUpdate


import re
import unicodedata

def generate_category_prefix(cat_name: str) -> str:
    if not cat_name or not cat_name.strip():
        return "MAT"
    
    clean = unicodedata.normalize('NFKD', cat_name).encode('ASCII', 'ignore').decode('utf-8').upper().strip()
    
    mappings = {
        'HERRAMIENTA': 'HERR',
        'HERRAMIENTAS': 'HERR',
        'MEDICION': 'MED',
        'EQUIPO DE MEDICION': 'MED',
        'EQUIPOS DE MEDICION': 'MED',
        'SOLDADURA': 'SOL',
        'ABRASIVO': 'ABR',
        'ABRASIVOS': 'ABR',
        'TORNILLERIA': 'TOR',
        'PINTURA': 'PIN',
        'PINTURAS': 'PIN',
        'TUBERIA': 'TUB',
        'TUBERIAS': 'TUB',
        'ACERO': 'ACE',
        'ACEROS': 'ACE',
        'CONSUMIBLE': 'CON',
        'CONSUMIBLES': 'CON',
        'ELECTRICO': 'ELEC',
        'ELECTRICIDAD': 'ELEC',
        'SEGURIDAD': 'EPP',
        'EPP': 'EPP',
        'VALVULA': 'VAL',
        'VALVULAS': 'VAL',
        'MANGUERA': 'MAN',
        'MANGUERAS': 'MAN',
        'QUIMICO': 'QUI',
        'QUIMICOS': 'QUI',
        'LUBRICANTE': 'LUB',
        'LUBRICANTES': 'LUB',
        'REPUESTO': 'REP',
        'REPUESTOS': 'REP',
        'MAQUINARIA': 'MAQ'
    }
    
    words = [w for w in re.split(r'[\s\-_/,]+', clean) if w and w not in ('Y', 'DE', 'DEL', 'LA', 'EL', 'LOS', 'LAS', 'EN', 'PARA')]
    if not words:
        return "MAT"
    
    first_word = words[0]
    if first_word in mappings:
        return mappings[first_word]
    if clean in mappings:
        return mappings[clean]
    
    if len(first_word) >= 3:
        return first_word[:3]
    elif len(clean) >= 3:
        return clean[:3]
    return first_word


router = APIRouter()

@router.get("/categories")
def get_material_categories(db: Session = Depends(get_db)):
    cats = db.query(Material.category).distinct().filter(
        Material.category.isnot(None),
        Material.category != "",
        Material.category != "None"
    ).order_by(Material.category.asc()).all()
    return [c[0] for c in cats if c[0]]


@router.get("/next-code")
def get_next_material_code(
    category: Optional[str] = Query(None),
    custom_prefix: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    clean_custom = custom_prefix if isinstance(custom_prefix, str) else None
    clean_cat = category if isinstance(category, str) else None
    
    prefix = (clean_custom or "").strip().upper()
    if not prefix:
        prefix = generate_category_prefix(clean_cat or "Material")
    
    candidates = db.query(Material.code).filter(Material.code.like(f"{prefix}-%")).all()
    max_num = 0
    for row in candidates:
        if row[0]:
            nums = re.findall(r'\d+', row[0])
            if nums:
                try:
                    max_num = max(max_num, int(nums[-1]))
                except ValueError:
                    pass
    
    num = max_num + 1
    next_code = f"{prefix}-{num:03d}"
    while db.query(Material).filter(Material.code == next_code).first():
        num += 1
        next_code = f"{prefix}-{num:03d}"
        
    return {
        "category": category,
        "prefix": prefix,
        "next_code": next_code
    }


@router.get("/")
def get_materials(
    category: Optional[str] = None,
    search: Optional[str] = None,
    page: Optional[int] = Query(None, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    query = db.query(Material).filter((Material.is_active == True) | (Material.is_active == None))
    if category:
        query = query.filter(Material.category == category)
    if search:
        query = query.filter(
            (Material.name.ilike(f"%{search}%")) | (Material.code.ilike(f"%{search}%"))
        )
    
    total_items = query.count()
    total_inventory_usd = sum(m.stock_quantity * m.unit_cost_usd for m in query.all())

    if page:
        materials = query.order_by(Material.category.asc(), Material.name.asc()).offset((page - 1) * page_size).limit(page_size).all()
    else:
        materials = query.order_by(Material.category.asc(), Material.name.asc()).all()

    return {
        "total_items": total_items,
        "total_inventory_usd": round(total_inventory_usd, 2),
        "materials": [{
            "id": m.id,
            "code": m.code,
            "name": m.name,
            "category": m.category,
            "unit_measure": m.unit_measure,
            "stock_quantity": m.stock_quantity,
            "min_stock_alert": m.min_stock_alert,
            "unit_cost_usd": m.unit_cost_usd,
            "total_cost_usd": round(m.stock_quantity * m.unit_cost_usd, 2),
            "location": m.location,
            "is_low_stock": m.stock_quantity <= m.min_stock_alert
        } for m in materials]
    }


# 2. CREAR NUEVO ITEM DE MATERIAL
# ------------------------------------------------------------------------------
@router.post("/")
def create_material(m_in: MaterialCreate, db: Session = Depends(get_db)):
    existing = db.query(Material).filter(Material.code == m_in.code.strip().upper()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe un material con este codigo.")

    total_cost = m_in.stock_quantity * m_in.unit_cost_usd
    mat = Material(
        code=m_in.code.strip().upper(),
        name=m_in.name.strip(),
        category=m_in.category,
        unit_measure=m_in.unit_measure.strip().upper(),
        stock_quantity=m_in.stock_quantity,
        min_stock_alert=m_in.min_stock_alert,
        unit_cost_usd=m_in.unit_cost_usd,
        total_cost_usd=total_cost,
        location=m_in.location
    )
    db.add(mat)
    db.commit()
    db.refresh(mat)

    if m_in.stock_quantity > 0:
        mov = MaterialMovement(
            material_id=mat.id,
            movement_type="entrada_inicial",
            quantity=m_in.stock_quantity,
            unit_cost_usd=m_in.unit_cost_usd,
            total_cost_usd=total_cost,
            destination="Almacen Central",
            reference_doc="Inventario Inicial",
            notes="Carga de apertura de inventario"
        )
        db.add(mov)
        db.commit()

    return {
        "success": True,
        "message": "Material creado exitosamente.",
        "id": mat.id,
        "code": mat.code,
        "name": mat.name,
        "category": mat.category,
        "unit": mat.unit_measure,
        "unit_measure": mat.unit_measure,
        "unit_cost_usd": mat.unit_cost_usd,
        "stock_quantity": mat.stock_quantity
    }


@router.put("/{material_id}")
def update_material_item(material_id: int, req: MaterialUpdate, db: Session = Depends(get_db)):
    mat = db.query(Material).filter(Material.id == material_id).first()
    if not mat:
        raise HTTPException(status_code=404, detail="Material no encontrado.")

    from app.core.security import verify_password
    from app.models.models import User, AuditLog

    # Si se modifica el costo unitario o el stock de forma directa, validar autorización del Director
    is_sensitive_change = (
        (req.unit_cost_usd is not None and abs(float(req.unit_cost_usd) - float(mat.unit_cost_usd or 0.0)) > 1e-4) or
        (req.stock_quantity is not None and abs(float(req.stock_quantity) - float(mat.stock_quantity or 0.0)) > 1e-4)
    )

    if is_sensitive_change:
        if not req.director_password:
            raise HTTPException(
                status_code=403, 
                detail="Para modificar el precio unitario o ajustar el stock en Kárdex se requiere la contraseña del Director General."
            )
        authorized = False
        admin_users = db.query(User).filter(
            (User.is_superuser == True) | 
            (User.role_name.in_(["director", "director_general", "admin_finanzas", "administrador", "admin"])) |
            (User.username.in_(["admin", "director"]))
        ).all()
        for u in admin_users:
            if u.hashed_password and verify_password(req.director_password, u.hashed_password):
                authorized = True
                break
        if not authorized:
            raise HTTPException(status_code=403, detail="Contraseña del Director General incorrecta para autorizar el cambio en Kárdex.")

    old_cost = mat.unit_cost_usd or 0.0
    old_stock = mat.stock_quantity or 0.0

    if req.name is not None and req.name.strip():
        mat.name = req.name.strip()
    if req.category is not None and req.category.strip():
        mat.category = req.category.strip()
    if req.unit_measure is not None and req.unit_measure.strip():
        mat.unit_measure = req.unit_measure.strip().upper()
    if req.stock_quantity is not None:
        new_stock = max(0.0, float(req.stock_quantity))
        if abs(new_stock - old_stock) > 1e-4:
            diff = new_stock - old_stock
            mov = MaterialMovement(
                material_id=mat.id,
                movement_type="ajuste_inventario",
                quantity=abs(diff),
                unit_cost_usd=mat.unit_cost_usd or 0.0,
                total_cost_usd=round(abs(diff) * (mat.unit_cost_usd or 0.0), 2),
                destination="Ajuste manual de ficha técnica",
                notes=req.adjustment_notes or f"Ajuste directo de stock: {old_stock:.2f} -> {new_stock:.2f} ({'+' if diff > 0 else ''}{diff:.2f})",
                performed_by="Dirección General (Autorizado)"
            )
            db.add(mov)
            mat.stock_quantity = new_stock

    if req.min_stock_alert is not None:
        mat.min_stock_alert = max(0.0, float(req.min_stock_alert))
    if req.unit_cost_usd is not None:
        mat.unit_cost_usd = max(0.0, float(req.unit_cost_usd))
    
    mat.total_cost_usd = round((mat.stock_quantity or 0.0) * (mat.unit_cost_usd or 0.0), 2)
    if req.location is not None:
        mat.location = req.location.strip()
    if req.is_active is not None:
        mat.is_active = req.is_active

    if is_sensitive_change:
        db.add(AuditLog(
            username="director_general",
            module="almacen",
            action="rectificar_kardex_precio",
            details=f"Modificación autorizada en [{mat.code}] {mat.name}: Costo ${old_cost} -> ${mat.unit_cost_usd}, Stock {old_stock} -> {mat.stock_quantity}"
        ))

    db.commit()
    db.refresh(mat)


    return {
        "success": True,
        "message": f"Ficha de material [{mat.code}] {mat.name} actualizada correctamente.",
        "material": {
            "id": mat.id,
            "code": mat.code,
            "name": mat.name,
            "category": mat.category,
            "unit_measure": mat.unit_measure,
            "stock_quantity": mat.stock_quantity,
            "min_stock_alert": mat.min_stock_alert,
            "unit_cost_usd": mat.unit_cost_usd,
            "location": mat.location,
            "is_active": mat.is_active
        }
    }


@router.get("/excel-template")
def download_materials_excel_template(db: Session = Depends(get_db)):
    """
    Descarga la plantilla oficial en Excel (.xlsx) con los materiales actuales para revisión o reforma masiva.
    """
    excel_stream = InventoryExcelService.generate_materials_template(db)
    headers = {
        "Content-Disposition": "attachment; filename=DALOR_Catalogo_Materiales.xlsx",
        "Access-Control-Expose-Headers": "Content-Disposition"
    }
    return StreamingResponse(
        excel_stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers=headers
    )


@router.post("/import-excel")
async def import_materials_from_excel(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    Importa masivamente materiales desde la plantilla Excel de DALOR SIGO-P.
    """
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="Formato de archivo inválido. Debe subir un archivo Excel (.xlsx).")

    contents = await file.read()
    try:
        result = InventoryExcelService.import_materials_excel(contents, db)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error al procesar el archivo Excel: {str(e)}")



