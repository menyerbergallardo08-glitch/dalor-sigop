import os
import shutil
import glob
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel

from app.core.database import get_db
from app.core.config import settings
from app.models.models import User, AuditLog
from app.core.security import verify_password, get_password_hash, create_access_token

router = APIRouter()

BACKUP_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))), "backups")
os.makedirs(BACKUP_DIR, exist_ok=True)

def get_db_file_path():
    db_url = settings.DATABASE_URL
    if "sqlite:///" in db_url:
        path = db_url.replace("sqlite:///", "")
        if os.path.exists(path):
            return path
    default_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))), "dalor_sigop.db")
    return default_path

# ------------------------------------------------------------------------------
# 1. GESTIÓN DE USUARIOS
# ------------------------------------------------------------------------------
class UserCreate(BaseModel):
    username: str
    full_name: str
    email: str = None
    password: str
    role_name: str = "ingeniero_obra"

class UserPermissionsUpdate(BaseModel):
    permissions_json: str

@router.get("/users")
def list_users(db: Session = Depends(get_db)):
    users = db.query(User).all()
    return [{
        "id": u.id,
        "username": u.username,
        "full_name": u.full_name,
        "email": u.email,
        "role_name": u.role_name,
        "is_active": u.is_active,
        "is_superuser": u.is_superuser,
        "permissions_json": u.permissions_json,
        "last_login": u.last_login.strftime("%Y-%m-%d %H:%M") if u.last_login else "Nunca",
        "created_at": u.created_at.strftime("%Y-%m-%d %H:%M")
    } for u in users]

@router.post("/users")
def create_user(user_in: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.username == user_in.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="El nombre de usuario ya existe.")

    hashed_pw = get_password_hash(user_in.password)
    default_perms = '{"comercial": true, "proyectos": true, "finanzas": false, "recursos": true, "gastos": true, "executive_bi": false, "mantenimiento": false}'
    
    new_user = User(
        username=user_in.username.strip().lower(),
        full_name=user_in.full_name.strip(),
        email=user_in.email,
        hashed_password=hashed_pw,
        role_name=user_in.role_name,
        permissions_json=default_perms,
        is_active=True,
        is_superuser=(user_in.role_name == "director_general")
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    audit = AuditLog(
        user_id=new_user.id,
        username=new_user.username,
        module="mantenimiento",
        action="crear_usuario",
        details=f"Usuario {new_user.username} creado con rol {new_user.role_name}"
    )
    db.add(audit)
    db.commit()

    return {"success": True, "message": f"Usuario '{new_user.username}' creado con éxito.", "id": new_user.id}

@router.put("/users/{user_id}/permissions")
def update_user_permissions(user_id: int, perm_in: UserPermissionsUpdate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    user.permissions_json = perm_in.permissions_json
    db.commit()

    audit = AuditLog(
        user_id=user.id,
        username=user.username,
        module="mantenimiento",
        action="modificar_permisos",
        details=f"Mapa de permisos actualizado para {user.username}"
    )
    db.add(audit)
    db.commit()

    return {"success": True, "message": f"Permisos actualizados para '{user.username}'."}

@router.put("/users/{user_id}/toggle-status")
def toggle_user_status(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    user.is_active = not user.is_active
    db.commit()

    audit = AuditLog(
        user_id=user.id,
        username=user.username,
        module="mantenimiento",
        action="cambiar_estado",
        details=f"Estado de usuario {user.username} cambiado a {'Activo' if user.is_active else 'Inactivo'}"
    )
    db.add(audit)
    db.commit()

    return {"success": True, "is_active": user.is_active, "message": f"Usuario {user.username} {'activado' if user.is_active else 'desactivado'}."}

# ------------------------------------------------------------------------------
# 2. BITÁCORA DE AUDITORÍA (TIPO PROFIT PLUS)
# ------------------------------------------------------------------------------
@router.get("/audit-logs")
def get_audit_logs(db: Session = Depends(get_db)):
    logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(100).all()
    return [{
        "id": l.id,
        "username": l.username,
        "module": l.module,
        "action": l.action,
        "details": l.details,
        "created_at": l.created_at.strftime("%Y-%m-%d %H:%M:%S")
    } for l in logs]

# ------------------------------------------------------------------------------
# 3. 💾 MÓDULO DE COPIAS DE SEGURIDAD & RESPALDOS (AUTO-BACKUP & RESTORE)
# ------------------------------------------------------------------------------
@router.get("/backups")
def list_backups():
    files = glob.glob(os.path.join(BACKUP_DIR, "dalor_backup_*.db"))
    backups = []
    for f in files:
        fname = os.path.basename(f)
        size_bytes = os.path.getsize(f)
        mtime = os.path.getmtime(f)
        backups.append({
            "filename": fname,
            "size_kb": round(size_bytes / 1024, 2),
            "size_mb": round(size_bytes / (1024 * 1024), 2),
            "created_at": datetime.fromtimestamp(mtime).strftime("%Y-%m-%d %H:%M:%S")
        })
    backups.sort(key=lambda x: x["created_at"], reverse=True)
    return backups

@router.post("/backups/create")
def create_backup(db: Session = Depends(get_db)):
    src_db = get_db_file_path()
    if not os.path.exists(src_db):
        raise HTTPException(status_code=404, detail=f"Base de datos no encontrada en {src_db}.")

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_filename = f"dalor_backup_{timestamp}.db"
    dest_path = os.path.join(BACKUP_DIR, backup_filename)

    shutil.copyfile(src_db, dest_path)
    size_kb = round(os.path.getsize(dest_path) / 1024, 2)

    audit = AuditLog(
        username="admin",
        module="seguridad",
        action="crear_respaldo_bd",
        details=f"Copia de seguridad generada con éxito: {backup_filename} ({size_kb} KB)"
    )
    db.add(audit)
    db.commit()

    return {
        "success": True,
        "message": f"Copia de seguridad '{backup_filename}' generada exitosamente ({size_kb} KB).",
        "filename": backup_filename,
        "size_kb": size_kb
    }

@router.get("/backups/download/{filename}")
def download_backup(filename: str):
    file_path = os.path.join(BACKUP_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Archivo de respaldo no encontrado.")
    return FileResponse(path=file_path, filename=filename, media_type="application/octet-stream")

@router.post("/backups/restore/{filename}")
def restore_backup(filename: str, db: Session = Depends(get_db)):
    backup_path = os.path.join(BACKUP_DIR, filename)
    if not os.path.exists(backup_path):
        raise HTTPException(status_code=404, detail="El archivo de respaldo no existe.")

    src_db = get_db_file_path()

    pre_restore_filename = f"pre_restore_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.db"
    shutil.copyfile(src_db, os.path.join(BACKUP_DIR, pre_restore_filename))

    shutil.copyfile(backup_path, src_db)

    audit = AuditLog(
        username="admin",
        module="seguridad",
        action="restaurar_respaldo_bd",
        details=f"Base de datos restaurada desde la copia: {filename}"
    )
    db.add(audit)
    db.commit()

    return {
        "success": True,
        "message": f"Base de datos restaurada con éxito a partir de '{filename}'."
    }

@router.post("/reseed-clean-system")
def api_reseed_clean_system(db: Session = Depends(get_db)):
    try:
        from app.models.models import (
            User, Asset, Personnel, Project, Expense, Quotation, 
            AccountReceivable, AccountPayable, FinancialPayment, 
            ExpenseCategory, PartnerWithdrawal, FixedExpenseSetting,
            TransferGuide, TransferGuideItem, Material, MaterialMovement, Client
        )
        
        # 1. Limpiar transacciones de prueba
        db.query(FinancialPayment).delete()
        db.query(AccountReceivable).delete()
        db.query(AccountPayable).delete()
        db.query(Expense).delete()
        db.query(TransferGuideItem).delete()
        db.query(TransferGuide).delete()
        db.query(MaterialMovement).delete()
        db.query(Quotation).delete()
        db.query(Project).delete()
        db.query(Personnel).delete()
        db.query(Asset).delete()
        db.query(Client).delete()
        db.commit()

        # 2. 13 Trabajadores Reales DALOR
        authentic_personnel = [
            {"code": "PERS-001", "full_name": "Paola Garay", "identification_id": "V-19874521", "role_title": "Administración y Finanzas", "phone": "0414-1234501", "current_location": "Sede Central (Guacara)"},
            {"code": "PERS-002", "full_name": "Robert Rodriguez", "identification_id": "V-14562890", "role_title": "Gerente de Operaciones", "phone": "0414-1234502", "current_location": "Sede Central (Guacara)"},
            {"code": "PERS-003", "full_name": "Julio Saavedra", "identification_id": "V-16789452", "role_title": "Técnico Especialista Mecánico", "phone": "0414-1234503", "current_location": "Sede Central (Guacara)"},
            {"code": "PERS-004", "full_name": "Vicente Rodriguez", "identification_id": "V-13456789", "role_title": "Técnico Metalmecánico", "phone": "0414-1234504", "current_location": "Sede Central (Guacara)"},
            {"code": "PERS-005", "full_name": "Carlos Hurtado", "identification_id": "V-14890123", "role_title": "Custodio y Almacenista Central", "phone": "0414-1234505", "current_location": "Sede Central (Guacara)"},
            {"code": "PERS-006", "full_name": "Geraldine Paez", "identification_id": "V-21345678", "role_title": "Asistente Administrativa", "phone": "0414-1234506", "current_location": "Sede Central (Guacara)"},
            {"code": "PERS-007", "full_name": "Eleonora Galetti", "identification_id": "V-18765432", "role_title": "Administración y Compras", "phone": "0414-1234507", "current_location": "Sede Central (Guacara)"},
            {"code": "PERS-008", "full_name": "Hender Rodriguez", "identification_id": "V-15890456", "role_title": "Supervisor de Obra / Campo", "phone": "0412-9876501", "current_location": "Sede Central (Guacara)"},
            {"code": "PERS-009", "full_name": "Herby Rodriguez", "identification_id": "V-12607524", "role_title": "Chofer de Carga Pesada & Logística", "phone": "0412-9876502", "current_location": "Sede Central (Guacara)"},
            {"code": "PERS-010", "full_name": "Eliu Suarez", "identification_id": "V-17890123", "role_title": "Soldador Especialista CWI", "phone": "0412-9876503", "current_location": "Sede Central (Guacara)"},
            {"code": "PERS-011", "full_name": "Danny Chaparro", "identification_id": "V-19012345", "role_title": "Técnico Montador de Estructuras", "phone": "0412-9876504", "current_location": "Sede Central (Guacara)"},
            {"code": "PERS-012", "full_name": "Ernesto Chaparro", "identification_id": "V-16789012", "role_title": "Técnico Montador de Estructuras", "phone": "0412-9876505", "current_location": "Sede Central (Guacara)"},
            {"code": "PERS-013", "full_name": "Mervis Parra", "identification_id": "V-18456789", "role_title": "Técnico Montador de Estructuras", "phone": "0412-9876506", "current_location": "Sede Central (Guacara)"}
        ]
        for p in authentic_personnel:
            db.add(Personnel(
                code=p["code"],
                full_name=p["full_name"],
                identification_id=p["identification_id"],
                role_title=p["role_title"],
                phone=p["phone"],
                status="disponible_base",
                current_location=p["current_location"],
                is_active=True
            ))
        db.commit()

        # 3. 8 Vehículos Reales DALOR
        real_vehicles = [
            {"asset_code": "1-V-1-01", "name": "Camión Chevrolet NPR Baranda 350 Blanco (2013)", "asset_type": "vehiculo", "brand": "CHEVROLET", "model": "NPR-350 Baranda", "license_plate": "A47CC2V", "serial_number": "NPR2013-106290", "current_location": "Sede Central (Guacara)", "status": "disponible_base", "current_odometer": 241400.0, "service_interval_km": 5000.0, "last_service_odometer": 239400.0, "is_exclusive": True, "is_active": True},
            {"asset_code": "1-V-1-02", "name": "Camioneta Dodge Ram 250 Doble Cabina Gris (2007)", "asset_type": "vehiculo", "brand": "DODGE", "model": "RAM 250 8-Cil", "license_plate": "A31AJ5B", "serial_number": "RAM2007-8CIL", "current_location": "Sede Central (Guacara)", "status": "disponible_base", "current_odometer": 311736.0, "service_interval_km": 5000.0, "last_service_odometer": 310000.0, "is_exclusive": True, "is_active": True},
            {"asset_code": "1-V-1-03", "name": "Camioneta Toyota Hilux Kavak 4x4 Doble Cabina Azul (2009)", "asset_type": "vehiculo", "brand": "TOYOTA", "model": "Hilux Kavak 4x4", "license_plate": "A45AC9I", "serial_number": "8XA33ZV2599006549", "current_location": "Sede Central (Guacara)", "status": "disponible_base", "current_odometer": 487742.0, "service_interval_km": 5000.0, "last_service_odometer": 485000.0, "is_exclusive": True, "is_active": True},
            {"asset_code": "3-V-1-04", "name": "Automóvil Fiat Palio SX 1.3 Gris 5P (2003)", "asset_type": "vehiculo", "brand": "FIAT", "model": "Palio SX 1.3 5P", "license_plate": "DBP20K", "serial_number": "9BD17151332254431", "current_location": "Sede Central (Guacara)", "status": "disponible_base", "current_odometer": 185000.0, "service_interval_km": 5000.0, "last_service_odometer": 180000.0, "is_exclusive": True, "is_active": True},
            {"asset_code": "3-V-1-05", "name": "Montacargas Industrial Toyota 3.5 Ton (2005)", "asset_type": "maquinaria", "brand": "TOYOTA", "model": "7FGCU30 3.5 Ton", "license_plate": "SIN PLACA (MONTACARGAS)", "serial_number": "67821", "current_location": "Sede Central (Guacara)", "status": "disponible_base", "current_odometer": 12500.0, "service_interval_km": 500.0, "last_service_odometer": 12000.0, "is_exclusive": True, "is_active": True},
            {"asset_code": "3-V-1-06", "name": "Camioneta Toyota 4Runner SR5 4x4 Negra", "asset_type": "vehiculo", "brand": "TOYOTA", "model": "4Runner SR5 4x4", "license_plate": "AI619DK", "serial_number": "4RUNNER-SR5", "current_location": "Sede Central (Guacara)", "status": "disponible_base", "current_odometer": 198000.0, "service_interval_km": 5000.0, "last_service_odometer": 195000.0, "is_exclusive": True, "is_active": True},
            {"asset_code": "3-V-1-07", "name": "Automóvil Volkswagen Space Fox 1.6 Azul (2011/2012)", "asset_type": "vehiculo", "brand": "VOLKSWAGEN", "model": "Space Fox 1.6", "license_plate": "AA293TD", "serial_number": "8AWPB05Z9CA54090", "current_location": "Sede Central (Guacara)", "status": "disponible_base", "current_odometer": 142000.0, "service_interval_km": 5000.0, "last_service_odometer": 140000.0, "is_exclusive": True, "is_active": True},
            {"asset_code": "3-V-1-08", "name": "Camión de Carga BAW Doble Cabina Blanco Neptunia", "asset_type": "vehiculo", "brand": "BAW", "model": "Doble Cabina 4x2", "license_plate": "A41AE34", "serial_number": "BAW-NEPTUNIA", "current_location": "Sede Central (Guacara)", "status": "disponible_base", "current_odometer": 115000.0, "service_interval_km": 5000.0, "last_service_odometer": 112000.0, "is_exclusive": True, "is_active": True}
        ]
        for v in real_vehicles:
            db.add(Asset(
                asset_code=v["asset_code"],
                name=v["name"],
                asset_type=v["asset_type"],
                brand=v["brand"],
                model=v["model"],
                license_plate=v["license_plate"],
                serial_number=v.get("serial_number"),
                status=v["status"],
                current_location=v["current_location"],
                current_odometer=v["current_odometer"],
                service_interval_km=v["service_interval_km"],
                last_service_odometer=v["last_service_odometer"],
                current_custodian_name="Chofer / Logística Dalor",
                is_active=True
            ))
        db.commit()

        # 4. 20 Categorías Canónicas
        cats = [
            {"code": "1", "name": "Nómina Dalor Guacara", "group_type": "gasto_fijo_sede"},
            {"code": "2", "name": "Impuestos Municipales", "group_type": "gasto_fijo_sede"},
            {"code": "3", "name": "Consumibles Oficina", "group_type": "gasto_fijo_sede"},
            {"code": "4", "name": "Consumibles Taller", "group_type": "costo_directo"},
            {"code": "5", "name": "Seniat IVA", "group_type": "gasto_fijo_sede"},
            {"code": "6", "name": "Seniat ISLR", "group_type": "gasto_fijo_sede"},
            {"code": "7", "name": "Seniat Pensiones", "group_type": "gasto_fijo_sede"},
            {"code": "8", "name": "Fonacit", "group_type": "gasto_fijo_sede"},
            {"code": "9", "name": "Parafiscales", "group_type": "gasto_fijo_sede"},
            {"code": "10", "name": "Honorarios Profesionales", "group_type": "gasto_fijo_sede"},
            {"code": "11", "name": "Compra de Bienes & Activos", "group_type": "costo_directo"},
            {"code": "12", "name": "Servicios (Neptunia, Internet, Vigilancia)", "group_type": "gasto_fijo_sede"},
            {"code": "13", "name": "Gastos de Flota & Combustible", "group_type": "costo_directo"},
            {"code": "14", "name": "Nómina de Proyecto / Campo", "group_type": "costo_directo"},
            {"code": "15", "name": "Hospedaje de Cuadrilla", "group_type": "costo_directo"},
            {"code": "16", "name": "Comidas & Viáticos", "group_type": "costo_directo"},
            {"code": "17", "name": "Insumos & Ferretería", "group_type": "costo_directo"},
            {"code": "18", "name": "Consumibles & Electrodos", "group_type": "costo_directo"},
            {"code": "19", "name": "Combustible en Sitio", "group_type": "costo_directo"},
            {"code": "20", "name": "Traslados & Fletes", "group_type": "costo_directo"}
        ]
        db.query(ExpenseCategory).delete()
        db.commit()
        for c in cats:
            db.add(ExpenseCategory(code=c["code"], name=c["name"], group_type=c["group_type"]))
        db.commit()

        # 5. Cargar 908 herramientas
        import json
        tools_path = None
        for candidate in ["clean_tools.json", "backend/clean_tools.json", "../clean_tools.json", "/app/clean_tools.json", "/app/backend/clean_tools.json"]:
            if os.path.exists(candidate):
                tools_path = candidate
                break
        if tools_path:
            with open(tools_path, "r", encoding="utf-8") as f:
                tools_data = json.load(f)
            for t in tools_data:
                db.add(Asset(
                    asset_code=t["code"],
                    name=t["name"],
                    asset_type="herramienta",
                    brand=t.get("brand") or "",
                    model=t.get("model") or "Estándar",
                    serial_number=t.get("serial_number") or None,
                    status="disponible_base",
                    current_location=t.get("location") or "Sede Central (Guacara)",
                    current_custodian_name="Carlos Hurtado (Almacén Central)",
                    is_active=True
                ))
            db.commit()

        # 6. Cliente OXICAR
        oxicar = Client(
            code="MDCLI-001",
            name="OXICAR",
            rif="J-31000000-0",
            contact_name="Iván Inciarte",
            contact_phone="0414-4000000",
            contact_email="iinciarte@oxicar.com",
            address="Zona Industrial Municipal Norte, Valencia, Edo. Carabobo",
            industry="Gases Industriales / Metalmecánica",
            is_active=True
        )
        db.add(oxicar)
        db.commit()

        return {"success": True, "message": "Base de datos reinicializada al 100% con datos auténticos de DALOR (13 Trabajadores, 8 Vehículos, 908 Herramientas, 20 Partidas y Cliente OXICAR)."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

