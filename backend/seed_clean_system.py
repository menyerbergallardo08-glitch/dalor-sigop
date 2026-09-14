import json
import os
from datetime import datetime
from sqlalchemy.orm import Session

from app.core.database import engine, Base, SessionLocal
from app.core.security import get_password_hash
from app.models.models import (
    User, Asset, Personnel, Project, Expense, Quotation, 
    AccountReceivable, AccountPayable, FinancialPayment, 
    ExpenseCategory, PartnerWithdrawal, FixedExpenseSetting,
    TransferGuide, TransferGuideItem, Material, MaterialMovement, Client
)

# 1. Ensure all tables are created
Base.metadata.create_all(bind=engine)

def seed_database():
    db: Session = SessionLocal()
    try:
        print("--- 1. PURGING ALL TEST TRANSACTIONS & CLEANING SLATE ---")
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
        print("[OK] Completely purged old test transactions, clients, assets and personnel.")

        print("--- 2. SEEDING OFFICIAL 4 SYSTEM ROLES & USERS ---")
        users_config = [
            {
                "username": "director",
                "full_name": "Director General / Socio",
                "email": "direccion@dalor.com",
                "password": get_password_hash("dalor2026"),
                "role_name": "director",
                "is_superuser": True,
                "permissions": {
                    "comercial_view": True, "comercial_edit": True,
                    "proyectos_view": True, "proyectos_edit": True,
                    "finanzas_view": True, "finanzas_edit": True,
                    "recursos_view": True, "recursos_edit": True,
                    "gastos_view": True, "gastos_edit": True,
                    "executive_dashboard": True,
                    "mantenimiento_admin": True
                }
            },
            {
                "username": "administracion",
                "full_name": "Administración & Contabilidad",
                "email": "administracion@dalor.com",
                "password": get_password_hash("admin2026"),
                "role_name": "admin_finanzas",
                "is_superuser": False,
                "permissions": {
                    "comercial_view": True, "comercial_edit": True,
                    "proyectos_view": True, "proyectos_edit": False,
                    "finanzas_view": True, "finanzas_edit": True,
                    "recursos_view": True, "recursos_edit": False,
                    "gastos_view": True, "gastos_edit": True,
                    "executive_dashboard": False,
                    "mantenimiento_admin": False
                }
            },
            {
                "username": "ingeniero",
                "full_name": "Ingeniero Residente / Obras",
                "email": "operaciones@dalor.com",
                "password": get_password_hash("obra2026"),
                "role_name": "ingeniero_obra",
                "is_superuser": False,
                "permissions": {
                    "comercial_view": True, "comercial_edit": True,
                    "proyectos_view": True, "proyectos_edit": True,
                    "finanzas_view": False, "finanzas_edit": False,
                    "recursos_view": True, "recursos_edit": True,
                    "gastos_view": True, "gastos_edit": False,
                    "executive_dashboard": False,
                    "mantenimiento_admin": False
                }
            },
            {
                "username": "campo",
                "full_name": "Supervisor de Campo / Cuadrilla",
                "email": "campo@dalor.com",
                "password": get_password_hash("campo2026"),
                "role_name": "supervisor_campo",
                "is_superuser": False,
                "permissions": {
                    "comercial_view": False, "comercial_edit": False,
                    "proyectos_view": False, "proyectos_edit": False,
                    "finanzas_view": False, "finanzas_edit": False,
                    "recursos_view": False, "recursos_edit": False,
                    "gastos_view": True, "gastos_edit": True,
                    "executive_dashboard": False,
                    "mantenimiento_admin": False
                }
            }
        ]

        for u in users_config:
            existing = db.query(User).filter(User.username == u["username"]).first()
            if existing:
                existing.full_name = u["full_name"]
                existing.email = u["email"]
                existing.hashed_password = u["password"]
                existing.role_name = u["role_name"]
                existing.is_superuser = u["is_superuser"]
                existing.permissions_json = json.dumps(u["permissions"])
                existing.is_active = True
            else:
                new_u = User(
                    username=u["username"],
                    full_name=u["full_name"],
                    email=u["email"],
                    hashed_password=u["password"],
                    role_name=u["role_name"],
                    is_superuser=u["is_superuser"],
                    permissions_json=json.dumps(u["permissions"]),
                    is_active=True
                )
                db.add(new_u)
        db.commit()
        print("[OK] 4 Official Users configured & active.")

        print("--- 3. SEEDING AUTHENTIC DALOR PERSONNEL (13 TRABAJADORES REALES) ---")
        authentic_personnel = [
            {"code": "PERS-001", "full_name": "Paola Garay", "identification_id": "V-19874521", "role_title": "Administración y Finanzas", "phone": "0414-1234501", "current_location": "Sede Central (Guacara)", "roster_type": "guacara_fijo", "monthly_salary_usd": 500.0, "status": "disponible_base", "is_active": True},
            {"code": "PERS-002", "full_name": "Robert Rodriguez", "identification_id": "V-14562890", "role_title": "Gerente de Operaciones", "phone": "0414-1234502", "current_location": "Sede Central (Guacara)", "roster_type": "guacara_fijo", "monthly_salary_usd": 650.0, "status": "disponible_base", "is_active": True},
            {"code": "PERS-003", "full_name": "Julio Saavedra", "identification_id": "V-16789452", "role_title": "Técnico Especialista Mecánico", "phone": "0414-1234503", "current_location": "Sede Central (Guacara)", "roster_type": "guacara_fijo", "monthly_salary_usd": 450.0, "status": "disponible_base", "is_active": True},
            {"code": "PERS-004", "full_name": "Vicente Rodriguez", "identification_id": "V-13456789", "role_title": "Técnico Metalmecánico", "phone": "0414-1234504", "current_location": "Sede Central (Guacara)", "roster_type": "guacara_fijo", "monthly_salary_usd": 450.0, "status": "disponible_base", "is_active": True},
            {"code": "PERS-005", "full_name": "Carlos Hurtado", "identification_id": "V-14890123", "role_title": "Custodio y Almacenista Central", "phone": "0414-1234505", "current_location": "Sede Central (Guacara)", "roster_type": "guacara_fijo", "monthly_salary_usd": 400.0, "status": "disponible_base", "is_active": True},
            {"code": "PERS-006", "full_name": "Geraldine Paez", "identification_id": "V-21345678", "role_title": "Asistente Administrativa", "phone": "0414-1234506", "current_location": "Sede Central (Guacara)", "roster_type": "guacara_fijo", "monthly_salary_usd": 350.0, "status": "disponible_base", "is_active": True},
            {"code": "PERS-007", "full_name": "Eleonora Galetti", "identification_id": "V-18765432", "role_title": "Administración y Compras", "phone": "0414-1234507", "current_location": "Sede Central (Guacara)", "roster_type": "guacara_fijo", "monthly_salary_usd": 400.0, "status": "disponible_base", "is_active": True},
            {"code": "PERS-008", "full_name": "Hender Rodriguez", "identification_id": "V-15890456", "role_title": "Supervisor de Obra / Campo", "phone": "0412-9876501", "current_location": "Sede Central (Guacara)", "roster_type": "proyecto_campo", "daily_rate_usd": 25.0, "status": "disponible_base", "is_active": True},
            {"code": "PERS-009", "full_name": "Herby Rodriguez", "identification_id": "V-12607524", "role_title": "Chofer de Carga Pesada & Logística", "phone": "0412-9876502", "current_location": "Sede Central (Guacara)", "roster_type": "proyecto_campo", "daily_rate_usd": 20.0, "status": "disponible_base", "is_active": True},
            {"code": "PERS-010", "full_name": "Eliu Suarez", "identification_id": "V-17890123", "role_title": "Soldador Especialista CWI", "phone": "0412-9876503", "current_location": "Sede Central (Guacara)", "roster_type": "proyecto_campo", "daily_rate_usd": 22.0, "status": "disponible_base", "is_active": True},
            {"code": "PERS-011", "full_name": "Danny Chaparro", "identification_id": "V-19012345", "role_title": "Técnico Montador de Estructuras", "phone": "0412-9876504", "current_location": "Sede Central (Guacara)", "roster_type": "proyecto_campo", "daily_rate_usd": 18.0, "status": "disponible_base", "is_active": True},
            {"code": "PERS-012", "full_name": "Ernesto Chaparro", "identification_id": "V-16789012", "role_title": "Técnico Montador de Estructuras", "phone": "0412-9876505", "current_location": "Sede Central (Guacara)", "roster_type": "proyecto_campo", "daily_rate_usd": 18.0, "status": "disponible_base", "is_active": True},
            {"code": "PERS-013", "full_name": "Mervis Parra", "identification_id": "V-18456789", "role_title": "Técnico Montador de Estructuras", "phone": "0412-9876506", "current_location": "Sede Central (Guacara)", "roster_type": "proyecto_campo", "daily_rate_usd": 18.0, "status": "disponible_base", "is_active": True}
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
        print(f"[OK] {len(authentic_personnel)} Authentic Dalor Personnel seeded.")

        print("--- 4. SEEDING OFFICIAL EXPENSE CATEGORIES & BUDGET HIERARCHY ---")
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
        for c in cats:
            existing_c = db.query(ExpenseCategory).filter(ExpenseCategory.code == c["code"]).first()
            if not existing_c:
                db.add(ExpenseCategory(code=c["code"], name=c["name"], group_type=c["group_type"]))
            else:
                existing_c.name = c["name"]
        db.commit()
        print(f"[OK] {len(cats)} Official Budget Categories synchronized.")

        print("--- 5. SEEDING 8 AUTHENTIC DALOR FLEET VEHICLES ---")
        real_vehicles = [
            {
                "asset_code": "1-V-1-01",
                "name": "Camión Chevrolet NPR Baranda 350 Blanco (2013)",
                "asset_type": "vehiculo",
                "brand": "CHEVROLET",
                "model": "NPR-350 Baranda",
                "license_plate": "A47CC2V",
                "serial_number": "NPR2013-106290",
                "current_location": "Sede Central (Guacara)",
                "status": "disponible_base",
                "current_odometer": 241400.0,
                "service_interval_km": 5000.0,
                "last_service_odometer": 239400.0,
                "ownership_type": "propio",
                "rental_rate_usd": 0.0,
                "is_exclusive": True,
                "is_active": True
            },
            {
                "asset_code": "1-V-1-02",
                "name": "Camioneta Dodge Ram 250 Doble Cabina Gris (2007)",
                "asset_type": "vehiculo",
                "brand": "DODGE",
                "model": "RAM 250 8-Cil",
                "license_plate": "A31AJ5B",
                "serial_number": "RAM2007-8CIL",
                "current_location": "Sede Central (Guacara)",
                "status": "disponible_base",
                "current_odometer": 311736.0,
                "service_interval_km": 5000.0,
                "last_service_odometer": 310000.0,
                "ownership_type": "propio",
                "rental_rate_usd": 0.0,
                "is_exclusive": True,
                "is_active": True
            },
            {
                "asset_code": "1-V-1-03",
                "name": "Camioneta Toyota Hilux Kavak 4x4 Doble Cabina Azul (2009)",
                "asset_type": "vehiculo",
                "brand": "TOYOTA",
                "model": "Hilux Kavak 4x4",
                "license_plate": "A45AC9I",
                "serial_number": "8XA33ZV2599006549",
                "current_location": "Sede Central (Guacara)",
                "status": "disponible_base",
                "current_odometer": 487742.0,
                "service_interval_km": 5000.0,
                "last_service_odometer": 485000.0,
                "ownership_type": "propio",
                "rental_rate_usd": 0.0,
                "is_exclusive": True,
                "is_active": True
            },
            {
                "asset_code": "3-V-1-04",
                "name": "Automóvil Fiat Palio SX 1.3 Gris 5P (2003)",
                "asset_type": "vehiculo",
                "brand": "FIAT",
                "model": "Palio SX 1.3 5P",
                "license_plate": "DBP20K",
                "serial_number": "9BD17151332254431",
                "current_location": "Sede Central (Guacara)",
                "status": "disponible_base",
                "current_odometer": 185000.0,
                "service_interval_km": 5000.0,
                "last_service_odometer": 180000.0,
                "ownership_type": "propio",
                "rental_rate_usd": 0.0,
                "is_exclusive": True,
                "is_active": True
            },
            {
                "asset_code": "3-V-1-05",
                "name": "Montacargas Industrial Toyota 3.5 Ton (2005)",
                "asset_type": "maquinaria",
                "brand": "TOYOTA",
                "model": "7FGCU30 3.5 Ton",
                "license_plate": "SIN PLACA (MONTACARGAS)",
                "serial_number": "67821",
                "current_location": "Sede Central (Guacara)",
                "status": "disponible_base",
                "current_odometer": 12500.0,
                "service_interval_km": 500.0,
                "last_service_odometer": 12000.0,
                "ownership_type": "propio",
                "rental_rate_usd": 0.0,
                "is_exclusive": True,
                "is_active": True
            },
            {
                "asset_code": "3-V-1-06",
                "name": "Camioneta Toyota 4Runner SR5 4x4 Negra",
                "asset_type": "vehiculo",
                "brand": "TOYOTA",
                "model": "4Runner SR5 4x4",
                "license_plate": "AI619DK",
                "serial_number": "4RUNNER-SR5",
                "current_location": "Sede Central (Guacara)",
                "status": "disponible_base",
                "current_odometer": 198000.0,
                "service_interval_km": 5000.0,
                "last_service_odometer": 195000.0,
                "ownership_type": "propio",
                "rental_rate_usd": 0.0,
                "is_exclusive": True,
                "is_active": True
            },
            {
                "asset_code": "3-V-1-07",
                "name": "Automóvil Volkswagen Space Fox 1.6 Azul (2011/2012)",
                "asset_type": "vehiculo",
                "brand": "VOLKSWAGEN",
                "model": "Space Fox 1.6",
                "license_plate": "AA293TD",
                "serial_number": "8AWPB05Z9CA54090",
                "current_location": "Sede Central (Guacara)",
                "status": "disponible_base",
                "current_odometer": 142000.0,
                "service_interval_km": 5000.0,
                "last_service_odometer": 140000.0,
                "ownership_type": "propio",
                "rental_rate_usd": 0.0,
                "is_exclusive": True,
                "is_active": True
            },
            {
                "asset_code": "3-V-1-08",
                "name": "Camión de Carga BAW Doble Cabina Blanco Neptunia",
                "asset_type": "vehiculo",
                "brand": "BAW",
                "model": "Doble Cabina 4x2",
                "license_plate": "A41AE34",
                "serial_number": "BAW-NEPTUNIA",
                "current_location": "Sede Central (Guacara)",
                "status": "disponible_base",
                "current_odometer": 115000.0,
                "service_interval_km": 5000.0,
                "last_service_odometer": 112000.0,
                "ownership_type": "alquilado",
                "external_entity_name": "Neptunia C.A.",
                "rental_rate_usd": 0.0,
                "is_exclusive": True,
                "is_active": True
            }
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
                ownership_type=v["ownership_type"],
                external_entity_name=v.get("external_entity_name"),
                current_custodian_name="Chofer / Logística Dalor",
                is_active=True
            ))
        db.commit()
        print(f"[OK] {len(real_vehicles)} Authentic Dalor Vehicles loaded.")

        print("--- 6. SEEDING AUTHENTIC TOOLS & EQUIPMENT (CATALOG MASTER) ---")
        tools_file = None
        for candidate in ["clean_tools.json", "../clean_tools.json", "backend/clean_tools.json", "/app/clean_tools.json", os.path.join(os.path.dirname(__file__), "..", "clean_tools.json")]:
            if os.path.exists(candidate):
                tools_file = candidate
                break
        
        if tools_file:
            with open(tools_file, "r", encoding="utf-8") as f:
                tools_data = json.load(f)
            
            for t in tools_data:
                db.add(Asset(
                    asset_code=t["code"],
                    name=t["name"],
                    asset_type="herramienta",
                    brand=t.get("brand"),
                    model=t.get("model") or "Estándar",
                    serial_number=t.get("serial_number"),
                    status="disponible_base",
                    current_location=t.get("location") or "Sede Central (Guacara)",
                    current_custodian_name="Carlos Hurtado (Almacén Central)",
                    is_active=True
                ))
            db.commit()
            print(f"[OK] {len(tools_data)} Authentic Tools and Equipment loaded from {tools_file}.")

        print("--- 7. SEEDING AUTHENTIC CLIENT OXICAR ---")
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
        print("[OK] Authentic Client OXICAR seeded.")

        print("\n=======================================================")
        print("DATABASE RE-INITIALIZATION & CLEAN SLATE 100% SUCCESSFUL")
        print("=======================================================")

    except Exception as e:
        db.rollback()
        print(f"ERROR SEEDING: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
