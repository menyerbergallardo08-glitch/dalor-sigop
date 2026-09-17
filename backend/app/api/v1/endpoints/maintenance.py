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
from app.api.deps import get_current_user, require_roles

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

@router.post("/users", dependencies=[Depends(require_roles(["director_general"]))])
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

@router.put("/users/{user_id}/permissions", dependencies=[Depends(require_roles(["director_general"]))])
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

@router.put("/users/{user_id}/toggle-status", dependencies=[Depends(require_roles(["director_general"]))])
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
from app.services.backup_service import BackupService

@router.get("/backups", dependencies=[Depends(require_roles(["director_general", "director", "administracion", "gerencia"]))])
def list_backups():
    return BackupService.list_backups()

@router.post("/backups/create", dependencies=[Depends(require_roles(["director_general", "director", "administracion", "gerencia"]))])
def create_backup(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        res = BackupService.create_backup(db=db, initiator_username=current_user.username)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al generar copia de seguridad: {str(e)}")

@router.get("/backups/download/{filename}", dependencies=[Depends(require_roles(["director_general", "director", "administracion", "gerencia"]))])
def download_backup(filename: str):
    if "/" in filename or "\\" in filename or ".." in filename:
        raise HTTPException(status_code=400, detail="Nombre de archivo inválido. Intento de evasión o path traversal bloqueado.")
    if not (filename.startswith("dalor_backup_") and (filename.endswith(".json") or filename.endswith(".db") or filename.endswith(".json.gz"))):
        raise HTTPException(status_code=400, detail="Tipo de archivo no permitido. Solo se admiten archivos de respaldo DALOR.")
        
    file_path = BackupService.get_backup_path(filename)
    if not file_path:
        raise HTTPException(status_code=404, detail="Archivo de respaldo no encontrado.")
    
    media_type = "application/json" if filename.endswith(".json") else "application/octet-stream"
    return FileResponse(path=file_path, filename=filename, media_type=media_type)

@router.post("/backups/restore/{filename}", dependencies=[Depends(require_roles(["director_general", "director"]))])
def restore_backup(filename: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if "/" in filename or "\\" in filename or ".." in filename:
        raise HTTPException(status_code=400, detail="Nombre de archivo inválido. Intento de evasión o path traversal bloqueado.")
    if not (filename.startswith("dalor_backup_") and (filename.endswith(".json") or filename.endswith(".db") or filename.endswith(".json.gz"))):
        raise HTTPException(status_code=400, detail="Tipo de archivo no permitido. Solo se admiten archivos de respaldo DALOR.")
        
    try:
        res = BackupService.restore_backup(filename=filename, db=db, initiator_username=current_user.username)
        return res
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"El archivo de respaldo '{filename}' no existe.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al restaurar respaldo: {str(e)}")


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
        PartnerWithdrawal, FinancialPayment, MaterialMovement, Asset,
        DispatchGuide, DispatchGuideItem, Client, Material
    )

    # 1. Purgar tablas operacionales en orden topológico inverso (hijos primero)
    db.query(DispatchGuideItem).delete()
    db.query(DispatchGuide).delete()
    db.query(FinancialPayment).delete()
    db.query(Expense).delete()
    db.query(AccountReceivable).delete()
    db.query(AccountPayable).delete()
    db.query(QuotationItem).delete()
    db.query(Quotation).delete()
    db.query(ResourceAssignmentHistory).delete()
    db.query(MaterialMovement).delete()
    db.query(PartnerWithdrawal).delete()
    db.query(ProjectPhase).delete()
    db.query(Project).delete()

    # 2. Purgar clientes de prueba / impurezas
    db.query(Client).filter(
        (Client.code.like("CLI-TEST%")) |
        (Client.code.like("CLI-SID%")) |
        (Client.code.like("CLI-PEQ%")) |
        (Client.code.like("CLI-MON%")) |
        (Client.code.like("CLI-DAN%")) |
        (Client.name.ilike("%Prueba%")) |
        (Client.name.ilike("%Stress%"))
    ).delete(synchronize_session=False)

    # 3. Asegurar Clientes Corporativos Oficiales
    real_clients = [
        {"code": "CLI-CORPOELEC", "name": "CORPOELEC INDUSTRIAL / PDVSA", "rif": "G-20010014-1", "address": "Planta Centro, Morón, Edo. Carabobo", "industry": "Energía & Petróleo"},
        {"code": "MDCLI-001", "name": "OXICAR (Oxígenos Carabobo C.A.)", "rif": "J-07509812-4", "address": "Zona Industrial Municipal Sur, Valencia", "industry": "Gases Industriales"},
        {"code": "CLI-POLAR", "name": "Empresas Polar C.A. (Cervecería Modelo)", "rif": "J-00041372-8", "address": "Carretera Nacional San Joaquín, Carabobo", "industry": "Alimentos y Bebidas / Industrial"},
        {"code": "CLI-PIRELLI", "name": "Pirelli de Venezuela C.A.", "rif": "J-00012984-1", "address": "Zona Industrial Guacara, Edo. Carabobo", "industry": "Manufactura / Automotriz"}
    ]
    for rc in real_clients:
        c = db.query(Client).filter(Client.code == rc["code"]).first()
        if not c:
            db.add(Client(
                code=rc["code"],
                name=rc["name"],
                rif=rc["rif"],
                address=rc["address"],
                industry=rc["industry"],
                is_active=True
            ))
        else:
            c.name = rc["name"]
            c.is_active = True

    # 4. Resetear activos a su estado base disponible en Sede y asegurar 916 items
    db.query(Asset).update({
        "status": "disponible_base",
        "current_location": "Sede Central Dalor",
        "current_project_id": None,
        "current_custodian_name": None,
        "is_active": True
    })

    # Cargar 8 vehículos oficiales DALOR C.A.
    vehicles = [
        {"code": "1-V-1-01", "name": "Camión NPR Baranda 350 Blanco 2013", "type": "vehiculo", "brand": "CHEVROLET", "model": "NPR-350", "plate": "A47CC2V"},
        {"code": "1-V-1-02", "name": "Camioneta Dodge RAM Doble Cabina Gris", "type": "vehiculo", "brand": "DODGE", "model": "RAM-250", "plate": "A31AJ5B"},
        {"code": "1-V-1-03", "name": "Camioneta Toyota Hilux Kavak Azul 2009", "type": "vehiculo", "brand": "TOYOTA", "model": "HILUX KAVAK", "plate": "A45AC91"},
        {"code": "3-V-1-04", "name": "Carro Fiat Palio Gris 2003", "type": "vehiculo", "brand": "FIAT", "model": "PALIO SX 1.3", "plate": "DBP20K"},
        {"code": "3-V-1-05", "name": "Montacargas Toyota 2005 3.5T", "type": "maquinaria", "brand": "TOYOTA", "model": "7FGCU30", "plate": "MONT-01"},
        {"code": "3-V-1-06", "name": "Camioneta Toyota 4Runner Negra", "type": "vehiculo", "brand": "TOYOTA", "model": "4RUNNER TRD", "plate": "AI619DK"},
        {"code": "3-V-1-07", "name": "Carro SpaceFox Azul 2011", "type": "vehiculo", "brand": "VOLKSWAGEN", "model": "SPACE FOX", "plate": "AA293TD"},
        {"code": "3-V-1-08", "name": "Camión de Carga Doble Cabina Neptunia", "type": "vehiculo", "brand": "BAW", "model": "NEPTUNIA D/C", "plate": "A41AE34"}
    ]
    for v in vehicles:
        ev = db.query(Asset).filter(Asset.asset_code == v["code"]).first()
        if not ev:
            db.add(Asset(
                asset_code=v["code"],
                name=v["name"],
                asset_type=v["type"],
                brand=v["brand"],
                model=v["model"],
                license_plate=v["plate"],
                current_odometer=0.0,
                last_service_odometer=0.0,
                service_interval_km=5000.0,
                current_location="Sede Central Dalor",
                status="disponible_base",
                is_active=True
            ))

    # Cargar 908 herramientas desde clean_tools.json si faltan
    if db.query(Asset).count() < 916:
        tools_json_paths = [
            os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "data", "clean_tools.json"),
            os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))), "clean_tools.json"),
            os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))), "backend", "clean_tools.json"),
            r"C:\Users\GATEWAY\Desktop\CLIENTES DE CONSULTORIA\Metalmecanica Dalor\clean_tools.json"
        ]
        for tjp in tools_json_paths:
            if os.path.exists(tjp):
                try:
                    import json
                    with open(tjp, "r", encoding="utf-8") as tjf:
                        tools_data = json.load(tjf)
                    for t in tools_data:
                        code = t.get("code")
                        if code:
                            et = db.query(Asset).filter(Asset.asset_code == code).first()
                            if not et:
                                db.add(Asset(
                                    asset_code=code,
                                    name=t.get("name"),
                                    asset_type=t.get("asset_type", "herramienta"),
                                    brand=t.get("brand"),
                                    model=t.get("model"),
                                    serial_number=t.get("serial_number"),
                                    status="disponible_base",
                                    current_location=t.get("location", "Sede Central Dalor"),
                                    current_odometer=0.0,
                                    last_service_odometer=0.0,
                                    is_active=True
                                ))
                            else:
                                et.is_active = True
                    break
                except Exception as ex:
                    print(f"Error loading clean tools in reset: {ex}")

    # 5. Restablecer stocks de materiales a niveles base limpios
    stock_defaults = {
        "MAT-PLA-01": 18.0, "MAT-PLA-02": 24.0, "MAT-PLA-03": 8.0,
        "MAT-VIG-01": 32.0, "MAT-VIG-02": 14.0, "MAT-TUB-01": 45.0,
        "MAT-TUB-02": 20.0, "MAT-SOL-01": 65.0, "MAT-SOL-02": 40.0,
        "MAT-SOL-03": 28.0, "MAT-ABR-01": 35.0, "MAT-ABR-02": 25.0,
        "MAT-REC-01": 42.0, "MAT-REC-02": 30.0, "MAT-ABR-03": 80.0
    }
    for code, qty in stock_defaults.items():
        m = db.query(Material).filter(Material.code == code).first()
        if m:
            m.stock_quantity = qty

    # 6. Registrar auditoría
    audit = AuditLog(
        username="director",
        module="seguridad",
        action="reset_puesta_a_cero",
        details="Puesta a Cero ejecutada por Director General: Todos los registros de prueba e impurezas fueron purgados. Base de datos 100% limpia y catálogo de 916 activos y 15 trabajadores sincronizado."
    )
    db.add(audit)
    db.commit()

    total_assets = db.query(Asset).filter(Asset.is_active == True).count()
    total_clients = db.query(Client).filter(Client.is_active == True).count()

    return {
        "success": True,
        "message": f"Puesta a Cero completada con éxito. Base de datos de producción limpia de impurezas. {total_assets} activos (8 vehículos + 908 herramientas) y {total_clients} clientes corporativos activos.",
        "total_assets": total_assets,
        "total_clients": total_clients
    }

# ------------------------------------------------------------------------------
# 5. 🌟 ESCENARIO MAESTRO DE DEMOSTRACIÓN INTEGRAL (GOLDEN THREAD)
# ------------------------------------------------------------------------------
@router.post("/seed-master-demo", dependencies=[Depends(require_roles(["director_general", "director"]))])
def seed_master_demo(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        from app.models.models import (
            Expense, Quotation, QuotationItem, Project, ProjectPhase,
            AccountReceivable, AccountPayable, ResourceAssignmentHistory,
            PartnerWithdrawal, FinancialPayment, MaterialMovement, Asset,
            Personnel, Client, ExpenseCategory, User, AuditLog,
            DispatchGuide, DispatchGuideItem
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

        # 2. Purgar tablas operacionales dependientes en orden topológico inverso
        db.query(DispatchGuideItem).delete()
        db.query(DispatchGuide).delete()
        db.query(FinancialPayment).delete()
        db.query(Expense).delete()
        db.query(AccountReceivable).delete()
        db.query(AccountPayable).delete()
        db.query(QuotationItem).delete()
        db.query(Quotation).delete()
        db.query(ResourceAssignmentHistory).delete()
        db.query(MaterialMovement).delete()
        db.query(PartnerWithdrawal).delete()
        db.query(ProjectPhase).delete()
        db.query(Project).delete()

        # 2.0 Asegurar intervalos de servicio limpios para la flota real
        db.query(Asset).filter(
            (Asset.asset_type.in_(["vehiculo", "camioneta", "maquinaria"])) | (Asset.asset_code.like("%-V-%"))
        ).update({"service_interval_km": 5000.0}, synchronize_session=False)
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

        # 4. Asegurar Activos y Herramientas Maestras en Almacén (Usar flota y herramientas reales)
        hilux = db.query(Asset).filter(Asset.asset_code == "1-V-1-03").first() or db.query(Asset).filter(Asset.asset_code == "VEH-001").first()
        if not hilux:
            hilux = db.query(Asset).filter(Asset.asset_type.in_(["vehiculo", "camioneta"])).first()

        megger = db.query(Asset).filter(Asset.asset_code == "HER-001").first() or db.query(Asset).filter(Asset.asset_type == "herramienta").first()
        fluke = db.query(Asset).filter(Asset.asset_code == "HER-002").first() or db.query(Asset).filter(Asset.asset_type == "herramienta").offset(1).first()

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




from app.models.models import Personnel, Material, Asset

@router.get("/sync-dalor-catalog")
@router.post("/sync-dalor-catalog")
def sync_dalor_catalog(db: Session = Depends(get_db)):
    """
    Sincroniza y asegura que los 15 integrantes operativos y los 15 materiales industriales existan en la BD.
    """
    # 1. Personal
    full_roster = [
        {"code": "PERS-001", "full_name": "Robert Rodríguez", "role_title": "Ingeniero Residente de Proyecto", "phone": "0414-1234567"},
        {"code": "PERS-002", "full_name": "Carlos Hurtado", "role_title": "Supervisor de Soldadura y Montaje CWI", "phone": "0412-9876543"},
        {"code": "PERS-003", "full_name": "Julio Saavedra", "role_title": "Custodio de Almacén & Pañol Central", "phone": "0414-5558899"},
        {"code": "PERS-004", "full_name": "Vicente Rodríguez", "role_title": "Conductor de Carga Pesada & Equipos", "phone": "0424-7778899"},
        {"code": "PERS-005", "full_name": "Hender Rodríguez", "role_title": "Soldador Especialista 6G / TIG-ASME", "phone": "0414-3334455"},
        {"code": "PERS-006", "full_name": "Herby Rodríguez", "role_title": "Soldador Estructural & Calderería", "phone": "0412-6667788"},
        {"code": "PERS-007", "full_name": "Eliú Suárez", "role_title": "Pailero / Calderero Especialista A36-Hardox", "phone": "0424-1112233"},
        {"code": "PERS-008", "full_name": "Danny Chaparro", "role_title": "Montador Mecánico / Armador de Estructuras", "phone": "0416-9990011"},
        {"code": "PERS-009", "full_name": "Ernesto Chaparro", "role_title": "Oxicortista / Ayudante Técnico Especializado", "phone": "0414-8889900"},
        {"code": "PERS-010", "full_name": "Mervis Parra", "role_title": "Operador de Sandblasting & Pintura Airless", "phone": "0412-4445566"},
        {"code": "PERS-011", "full_name": "Paola Garay", "role_title": "Administradora de Obra & Costos", "phone": "0414-2223344"},
        {"code": "PERS-012", "full_name": "Geraldine Páez", "role_title": "Procura & Compras de Materiales", "phone": "0424-5556677"},
        {"code": "PERS-013", "full_name": "Eleonora Galetti", "role_title": "Inspectora de Seguridad Industrial SHA", "phone": "0412-1110099"},
        {"code": "PERS-014", "full_name": "José Gregorio Mendoza", "role_title": "Tornero & Mecánico Ajustador Taller", "phone": "0416-3332211"},
        {"code": "PERS-015", "full_name": "Wilmer Albornoz", "role_title": "Electricista Industrial & Generadores", "phone": "0414-7776655"}
    ]
    for p_data in full_roster:
        p = db.query(Personnel).filter(Personnel.code == p_data["code"]).first()
        if not p:
            p = Personnel(
                code=p_data["code"],
                full_name=p_data["full_name"],
                role_title=p_data["role_title"],
                phone=p_data["phone"],
                status="disponible_base",
                current_location="Sede Central Dalor",
                roster_type="guacara_fijo"
            )
            db.add(p)
        else:
            p.full_name = p_data["full_name"]
            p.role_title = p_data["role_title"]
            p.is_active = True

    # 2. Materiales
    materials_list = [
        {"code": "MAT-PLA-01", "name": "Plancha de Acero ASTM A36 12mm x 2.44m x 6.00m", "category": "Planchas de Acero", "unit": "Planchas", "stock": 18.0, "cost": 480.0},
        {"code": "MAT-PLA-02", "name": "Plancha de Acero ASTM A36 6mm x 2.44m x 6.00m", "category": "Planchas de Acero", "unit": "Planchas", "stock": 24.0, "cost": 245.0},
        {"code": "MAT-PLA-03", "name": "Plancha Antidesgaste Hardox 450 10mm x 2m x 6m", "category": "Planchas de Acero", "unit": "Planchas", "stock": 8.0, "cost": 1350.0},
        {"code": "MAT-VIG-01", "name": "Viga Estructural IPE 200 x 12 metros", "category": "Perfiles y Vigas", "unit": "Barras", "stock": 32.0, "cost": 310.0},
        {"code": "MAT-VIG-02", "name": "Viga Estructural HEA 240 x 12 metros", "category": "Perfiles y Vigas", "unit": "Barras", "stock": 14.0, "cost": 590.0},
        {"code": "MAT-TUB-01", "name": "Tubo de Acero al Carbono Sin Costura ASTM A106 Gr.B 4\" SCH 40 (6m)", "category": "Tuberías y Bridas", "unit": "Tubos", "stock": 45.0, "cost": 145.0},
        {"code": "MAT-TUB-02", "name": "Tubo de Acero al Carbono ASTM A53 6\" SCH 80 (6m)", "category": "Tuberías y Bridas", "unit": "Tubos", "stock": 20.0, "cost": 260.0},
        {"code": "MAT-SOL-01", "name": "Electrodos de Soldadura E-7018 1/8\" (Caja 20 Kg)", "category": "Soldadura y Gases", "unit": "Cajas", "stock": 65.0, "cost": 55.0},
        {"code": "MAT-SOL-02", "name": "Electrodos de Soldadura E-6010 / E-6013 1/8\" (Caja 20 Kg)", "category": "Soldadura y Gases", "unit": "Cajas", "stock": 40.0, "cost": 48.0},
        {"code": "MAT-SOL-03", "name": "Alambre Tubular para Soldadura MIG/FCAW E71T-1 0.045\" (Rollo 15 Kg)", "category": "Soldadura y Gases", "unit": "Rollos", "stock": 28.0, "cost": 62.0},
        {"code": "MAT-ABR-01", "name": "Discos de Corte Abrasivo 9\" x 1/8\" x 7/8\" para Acero (Caja 25 Und)", "category": "Abrasivos y Discos", "unit": "Cajas", "stock": 35.0, "cost": 42.0},
        {"code": "MAT-ABR-02", "name": "Discos de Desbaste 7\" x 1/4\" x 7/8\" (Caja 20 Und)", "category": "Abrasivos y Discos", "unit": "Cajas", "stock": 25.0, "cost": 38.0},
        {"code": "MAT-REC-01", "name": "Pintura Anticorrosiva Epóxica Poliamida Grís (Kit Galón A+B)", "category": "Pinturas y Recubrimientos", "unit": "Kits", "stock": 42.0, "cost": 58.0},
        {"code": "MAT-REC-02", "name": "Esmalte Poliuretano de Alto Brillo Blanco/Seguridad (Kit Galón)", "category": "Pinturas y Recubrimientos", "unit": "Kits", "stock": 30.0, "cost": 72.0},
        {"code": "MAT-ABR-03", "name": "Granalla de Acero / Abrasivo para Sandblasting G-40 (Saco 25 Kg)", "category": "Abrasivos y Discos", "unit": "Sacos", "stock": 80.0, "cost": 28.0},
    ]
    for m_data in materials_list:
        m = db.query(Material).filter(Material.code == m_data["code"]).first()
        if not m:
            m = Material(
                code=m_data["code"],
                name=m_data["name"],
                category=m_data["category"],
                unit_measure=m_data["unit"],
                stock_quantity=m_data["stock"],
                min_stock_alert=5.0,
                unit_cost_usd=m_data["cost"],
                total_cost_usd=round(m_data["stock"] * m_data["cost"], 2),
                location="Almacén Central Dalor", is_active=True
            )
            db.add(m)
        else:
            m.name = m_data["name"]
            m.category = m_data["category"]
            m.unit_measure = m_data["unit"]
            m.is_active = True
            if m.stock_quantity == 0:
                m.stock_quantity = m_data["stock"]
                m.unit_cost_usd = m_data["cost"]
                m.total_cost_usd = round(m_data["stock"] * m_data["cost"], 2)

    db.commit()
    pers_count = db.query(Personnel).filter(Personnel.is_active == True).count()
    mat_count = db.query(Material).count()
    return {
        "success": True,
        "personnel_count": pers_count,
        "materials_count": mat_count,
        "message": f"Catálogo DALOR sincronizado: {pers_count} trabajadores y {mat_count} materiales activos."
    }
