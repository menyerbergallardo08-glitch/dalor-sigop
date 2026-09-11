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

# ------------------------------------------------------------------------------
# 4. 🧹 PUESTA A CERO / PURGAR REGISTROS DE PRUEBA (SOLO DIRECTOR GENERAL)
# ------------------------------------------------------------------------------
class ResetCleanSlateInput(BaseModel):
    director_password: str

@router.post("/reset-to-clean-slate")
def reset_to_clean_slate(input_data: ResetCleanSlateInput, db: Session = Depends(get_db)):
    director = db.query(User).filter(User.username == "director").first()
    authorized = False
    if director and verify_password(input_data.director_password, director.hashed_password):
        authorized = True
    else:
        admin = db.query(User).filter(User.username == "admin").first()
        if admin and verify_password(input_data.director_password, admin.hashed_password):
            authorized = True

    if not authorized:
        raise HTTPException(status_code=403, detail="Contraseña de Director General incorrecta. Acción cancelada por seguridad.")

    from app.models.models import (
        Expense, Quotation, QuotationItem, Project, ProjectPhase,
        AccountReceivable, AccountPayable, ResourceAssignmentHistory,
        PartnerWithdrawal, FinancialPayment, MaterialMovement, Asset
    )

    # 1. Purgar tablas operacionales
    db.query(Expense).delete()
    db.query(QuotationItem).delete()
    db.query(Quotation).delete()
    db.query(AccountReceivable).delete()
    db.query(AccountPayable).delete()
    db.query(ResourceAssignmentHistory).delete()
    db.query(PartnerWithdrawal).delete()
    db.query(FinancialPayment).delete()
    db.query(MaterialMovement).delete()
    db.query(ProjectPhase).delete()
    db.query(Project).delete()

    # 2. Resetear activos a su estado base disponible en Sede
    db.query(Asset).update({
        "status": "disponible_base",
        "current_location": "Sede Central",
        "current_project_id": None,
        "current_custodian_name": None
    })

    # 3. Registrar auditoría
    audit = AuditLog(
        username="director",
        module="seguridad",
        action="reset_puesta_a_cero",
        details="Puesta a Cero ejecutada por Director General: Todos los registros de prueba fueron purgados para iniciar operación real en limpio."
    )
    db.add(audit)
    db.commit()

    return {
        "success": True,
        "message": "Puesta a Cero completada con éxito. Todos los registros de prueba han sido purgados y la base de datos está en cero para la operación real."
    }

# ------------------------------------------------------------------------------
# 5. 🌟 ESCENARIO MAESTRO DE DEMOSTRACIÓN INTEGRAL (GOLDEN THREAD)
# ------------------------------------------------------------------------------
@router.post("/seed-master-demo")
def seed_master_demo(db: Session = Depends(get_db)):
    try:
        from app.models.models import (
            Expense, Quotation, QuotationItem, Project, ProjectPhase,
            AccountReceivable, AccountPayable, ResourceAssignmentHistory,
            PartnerWithdrawal, FinancialPayment, MaterialMovement, Asset,
            Personnel, Client, ExpenseCategory, User, AuditLog
        )

        # 1. Desvincular llaves foráneas de proyectos en activos y personal
        db.query(Asset).update({
            "status": "disponible_base",
            "current_location": "Sede Central (Almacén)",
            "current_project_id": None,
            "current_custodian_name": None
        })
        db.query(Personnel).update({
            "status": "disponible_base",
            "current_location": "Sede Central",
            "current_project_id": None
        })
        db.commit()

        # 2. Purgar tablas operacionales dependientes
        db.query(Expense).delete()
        db.query(QuotationItem).delete()
        db.query(Quotation).delete()
        db.query(AccountReceivable).delete()
        db.query(AccountPayable).delete()
        db.query(ResourceAssignmentHistory).delete()
        db.query(PartnerWithdrawal).delete()
        db.query(FinancialPayment).delete()
        db.query(MaterialMovement).delete()
        db.query(ProjectPhase).delete()
        db.query(Project).delete()

        # 2.0 Calibrar odómetros y servicios de flota para semáforos limpios
        db.query(Asset).filter(Asset.asset_code == "VEH-001").update({"current_odometer": 142500.0, "last_service_odometer": 141000.0, "service_interval_km": 5000.0})
        db.query(Asset).filter(Asset.asset_code == "VEH-01").update({"current_odometer": 142000.0, "last_service_odometer": 140000.0, "service_interval_km": 5000.0})
        db.query(Asset).filter(Asset.asset_code == "VEH-02").update({"current_odometer": 85000.0, "last_service_odometer": 83500.0, "service_interval_km": 5000.0})
        db.query(Asset).filter(Asset.asset_code == "VEH-03").update({"current_odometer": 118000.0, "last_service_odometer": 114000.0, "service_interval_km": 5000.0})
        db.query(Asset).filter(Asset.asset_code == "VEH-04").update({"current_odometer": 195000.0, "last_service_odometer": 190200.0, "service_interval_km": 5000.0}) # Amarillo 200 km
        db.query(Asset).filter(Asset.asset_code == "VEH-05").update({"current_odometer": 240000.0, "last_service_odometer": 234800.0, "service_interval_km": 5000.0}) # Rojo -200 km
        db.query(Asset).filter(Asset.asset_code == "VEH-06").update({"current_odometer": 165000.0, "last_service_odometer": 162500.0, "service_interval_km": 5000.0})
        db.query(Asset).filter(Asset.asset_code == "VEH-07").update({"current_odometer": 132000.0, "last_service_odometer": 129000.0, "service_interval_km": 5000.0})
        db.commit()
        # 2.1 Asegurar Usuario Almacén
        from app.core.security import get_password_hash
        almacen_usr = db.query(User).filter(User.username == "almacen").first()
        if not almacen_usr:
            almacen_usr = User(
                username="almacen",
                full_name="Almacén & Pañol Central",
                email="almacen@dalor.com.ve",
                hashed_password=get_password_hash("almacen123"),
                role_name="almacenista",
                is_active=True,
                is_superuser=False
            )
            db.add(almacen_usr)
            db.commit()

        # 3. Asegurar Clientes Corporativos
        cli_polar = db.query(Client).filter(Client.code == "CLI-POLAR").first()
        if not cli_polar:
            cli_polar = Client(
                code="CLI-POLAR",
                name="Empresas Polar C.A. (Cervecería Modelo)",
                rif="J-00041372-8",
                contact_name="Ing. Carlos Mendoza (Gte. Mantenimiento)",
                contact_phone="0414-4321980",
                contact_email="cmendoza@polar.com.ve",
                address="Carretera Nacional San Joaquín, Planta Cervecería, Carabobo",
                industry="Alimentos y Bebidas / Industrial",
                is_active=True
            )
            db.add(cli_polar)
            db.commit()
            db.refresh(cli_polar)

        cli_pirelli = db.query(Client).filter(Client.code == "CLI-PIRELLI").first()
        if not cli_pirelli:
            cli_pirelli = Client(
                code="CLI-PIRELLI",
                name="Pirelli de Venezuela C.A.",
                rif="J-00012984-1",
                contact_name="Ing. Roberto Gómez",
                contact_phone="0424-4198230",
                contact_email="rgomez@pirelli.com.ve",
                address="Zona Industrial Guacara, Edo. Carabobo",
                industry="Manufactura / Automotriz",
                is_active=True
            )
            db.add(cli_pirelli)
            db.commit()
            db.refresh(cli_pirelli)

        # 4. Asegurar Activos y Herramientas Maestras en Almacén
        hilux = db.query(Asset).filter(Asset.asset_code == "VEH-001").first()
        if not hilux:
            hilux = Asset(
                asset_code="VEH-001",
                name="Camioneta Toyota Hilux 4x4 Doble Cabina",
                asset_type="vehiculo",
                brand="Toyota",
                model="Hilux D-4D 3.0",
                serial_number="8AJBA3CD9E1029384",
                license_plate="A12BC3D",
                current_odometer=142500.0,
                status="disponible_base",
                current_location="Sede Central (Almacén)",
                is_active=True
            )
            db.add(hilux)

        megger = db.query(Asset).filter(Asset.asset_code == "HER-001").first()
        if not megger:
            megger = Asset(
                asset_code="HER-001",
                name="Megóhmetro Digital de Aislamiento 10kV Megger",
                asset_type="herramienta_mayor",
                brand="Megger",
                model="MIT515",
                serial_number="MG-10KV-90823",
                status="disponible_base",
                current_location="Sede Central (Almacén)",
                is_active=True
            )
            db.add(megger)

        fluke = db.query(Asset).filter(Asset.asset_code == "HER-002").first()
        if not fluke:
            fluke = Asset(
                asset_code="HER-002",
                name="Analizador de Calidad de Energía y Redes Fluke",
                asset_type="herramienta_mayor",
                brand="Fluke",
                model="435 Series II",
                serial_number="FLK-435-77491",
                status="disponible_base",
                current_location="Sede Central (Almacén)",
                is_active=True
            )
            db.add(fluke)

        db.commit()

        # 5. CASO 1: OBRA EXTERNA (Proyecto de Campo Completo)
        prj_polar = Project(
            code="PRJ-2026-001",
            name="Mantenimiento Integral y Pruebas a Subestación Eléctrica 115kV - Planta San Joaquín",
            client_id=cli_polar.id,
            client_name=cli_polar.name,
            location="Planta San Joaquín, Cervecería Polar",
            status="activo",
            scope_of_work="Mantenimiento mayor a transformadores de potencia, pruebas de aislamiento a cables de 115kV, calibración de relés de protección y revisión de seccionadores e interruptores SF6.",
            duration_days=15,
            contract_amount_usd=12500.00,
            budget_limit_usd=8200.00,
            estimated_labor_usd=3500.00,
            estimated_fuel_usd=900.00,
            estimated_materials_usd=2800.00,
            estimated_tools_usd=600.00,
            estimated_services_usd=400.00,
            is_active=True
        )
        db.add(prj_polar)
        db.commit()
        db.refresh(prj_polar)

        # Fases del Proyecto con Tareas Estructuradas (Checklist WBS)
        fases = [
            ProjectPhase(
                project_id=prj_polar.id,
                phase_number=1,
                name="Fase 1: Desconexión, Puesta a Tierra y Pruebas de Aislamiento (Megado)",
                description="[x] Tramitación de permisos de trabajo seguro SHA; [x] Desconexión y bloqueo LOTO de barrajes 115kV; [x] Instalación de tierras temporales de seguridad; [ ] Megado de devanados y aislamiento de cables con Megger MIT515",
                duration_days=4,
                estimated_cost_usd=2500.00,
                status="en_progreso",
                responsible_person="Ing. Residente de Obra"
            ),
            ProjectPhase(
                project_id=prj_polar.id,
                phase_number=2,
                name="Fase 2: Mantenimiento de Seccionadores e Interruptores en SF6",
                description="[ ] Desmontaje y limpieza de cámaras de extinción SF6; [ ] Ajuste de torques y bornes de potencia; [ ] Medición de presión de gas SF6 y engrase conductivo",
                duration_days=6,
                estimated_cost_usd=4000.00,
                status="pendiente",
                responsible_person="Supervisor de Cuadrilla A"
            ),
            ProjectPhase(
                project_id=prj_polar.id,
                phase_number=3,
                name="Fase 3: Calibración de Protecciones, Protocolos y Energización",
                description="[ ] Inyección secundaria de corriente a relés SEL; [ ] Retiro de tierras temporales y energización controlada; [ ] Firma de acta de entrega técnica con el cliente",
                duration_days=5,
                estimated_cost_usd=1700.00,
                status="pendiente",
                responsible_person="Especialista de Protecciones"
            )
        ]
        db.add_all(fases)

        # Asignar activos al proyecto PRJ-polar (Despachados por Almacén)
        hilux = db.query(Asset).filter(Asset.asset_code == "VEH-001").first()
        megger = db.query(Asset).filter(Asset.asset_code == "HER-001").first()
        fluke = db.query(Asset).filter(Asset.asset_code == "HER-002").first()

        if hilux:
            hilux.status = "en_obra"
            hilux.current_location = "Planta San Joaquín (En Obra)"
            hilux.current_project_id = prj_polar.id
            hilux.current_custodian_name = "Supervisor de Campo"

        if megger:
            megger.status = "en_obra"
            megger.current_location = "Planta San Joaquín (En Obra)"
            megger.current_project_id = prj_polar.id
            megger.current_custodian_name = "Supervisor de Campo"

        if fluke:
            fluke.status = "en_obra"
            fluke.current_location = "Planta San Joaquín (En Obra)"
            fluke.current_project_id = prj_polar.id
            fluke.current_custodian_name = "Supervisor de Campo"

        # Historial de despacho Almacén
        hist = ResourceAssignmentHistory(
            project_id=prj_polar.id,
            resource_type="asset",
            resource_id=megger.id if megger else 1,
            resource_name="Megóhmetro Digital 10kV Megger + Fluke 435 + Camioneta Hilux",
            destination_location="Planta San Joaquín, Cervecería Polar",
            custodian_name="Supervisor de Campo (Guía GT-DALOR-2026-001)",
            start_odometer=142500.0,
            notes="Despacho autorizado por Almacén Central según requerimiento de Ingeniería de Obra."
        )
        db.add(hist)
        db.commit()

        # 6. CASO 2: SERVICIO INTERNO (Taller Central Guacara)
        srv_taller = Project(
            code="SRV-2026-001",
            name="Revisión, Rebobinado y Pruebas a Motor Eléctrico Siemens 150HP en Taller Guacara",
            client_id=cli_pirelli.id,
            client_name=cli_pirelli.name,
            location="Taller Central Guacara (Servicio Interno)",
            status="activo",
            scope_of_work="Desarme de motor trifásico 150HP, limpieza química, rebobinado de estator con alambre clase H, cambio de rodamientos SKF y prueba de aislamiento en banco de taller.",
            duration_days=5,
            contract_amount_usd=3200.00,
            budget_limit_usd=1600.00,
            estimated_labor_usd=800.00,
            estimated_fuel_usd=0.00,
            estimated_materials_usd=700.00,
            estimated_tools_usd=100.00,
            estimated_services_usd=0.00,
            is_active=True
        )
        db.add(srv_taller)
        db.commit()
        db.refresh(srv_taller)

        fases_taller = [
            ProjectPhase(
                project_id=srv_taller.id,
                phase_number=1,
                name="Fase 1: Desarme, Inspección Inicial y Lavado Químico",
                description="[x] Desarme de tapas y extracción de rotor; [x] Inspección de entrehierro y aislamiento; [x] Lavado químico y secado en horno",
                duration_days=2,
                estimated_cost_usd=600.00,
                status="completado",
                responsible_person="Técnico de Bobinado"
            ),
            ProjectPhase(
                project_id=srv_taller.id,
                phase_number=2,
                name="Fase 2: Rebobinado Estatórico, Rodamientos y Pruebas",
                description="[ ] Confección de bobinas de cobre clase H; [ ] Barnizado por inmersión y curado térmico; [ ] Montaje de rodamientos SKF y pruebas dinámicas en banco",
                duration_days=3,
                estimated_cost_usd=1000.00,
                status="en_progreso",
                responsible_person="Jefe de Taller Guacara"
            )
        ]
        db.add_all(fases_taller)
        db.commit()

        # 7. COMPROBANTE DE CAMPO DEMO (Listo en Buzón de Entrada para validar con campana en vivo)
        cat_mat = db.query(ExpenseCategory).filter(ExpenseCategory.code.startswith("17.")).first()
        if not cat_mat:
            cat_mat = db.query(ExpenseCategory).first()

        exp_demo = Expense(
            category_id=cat_mat.id if cat_mat else 1,
            project_id=prj_polar.id,
            partner_name="Reportado por: Supervisor de Campo",
            expense_type="costo_obra",
            description="Compra de cinta de alta tensión 3M, terminales de compresión de cobre y spray dieléctrico para Subestación San Joaquín",
            supplier_vendor="Ferretería y Suministros Industriales Carabobo C.A.",
            amount_bs=3033.54,
            exchange_rate=35.48,
            amount_usd=85.50,
            base_amount_usd=73.71,
            tax_amount_usd=11.79,
            is_tax_exempt=False,
            payment_method="caja_chica",
            status="pendiente_validacion",
            has_receipt=True,
            receipt_image_path="https://res.cloudinary.com/demo/image/upload/sample.jpg",
            alert_flag=False,
            alert_notes=None
        )
        db.add(exp_demo)
        db.commit()

        # 8. Auditoría
        audit = AuditLog(
            username="director",
            module="sistema",
            action="inicializar_escenario_demo_maestro",
            details="Escenario Maestro de Demostración inicializado con éxito: Obra Externa Polar (PRJ-2026-001) + Servicio Taller Pirelli (SRV-2026-001) + Guía de Despacho de Almacén + Comprobante OCR pendiente en buzón."
        )
        db.add(audit)
        db.commit()

        return {
            "success": True,
            "message": "Escenario Maestro de Demostración inicializado con éxito en la base de datos.",
            "project_field": {
                "code": prj_polar.code,
                "name": prj_polar.name,
                "client": cli_polar.name,
                "contract_amount_usd": prj_polar.contract_amount_usd,
                "budget_limit_usd": prj_polar.budget_limit_usd,
                "dispatched_assets": ["VEH-001 Camioneta Hilux", "HER-001 Megóhmetro 10kV", "HER-002 Fluke 435"]
            },
            "project_workshop": {
                "code": srv_taller.code,
                "name": srv_taller.name,
                "client": cli_pirelli.name,
                "contract_amount_usd": srv_taller.contract_amount_usd,
                "budget_limit_usd": srv_taller.budget_limit_usd
            },
            "pending_inbox_expense": {
                "vendor": exp_demo.supplier_vendor,
                "amount_usd": exp_demo.amount_usd,
                "description": exp_demo.description,
                "status": exp_demo.status
            }
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al sembrar escenario demo maestro: {str(e)}")


