from datetime import datetime
from sqlalchemy import text
from app.core.database import SessionLocal, engine, Base
from app.core.security import get_password_hash
from app.models.models import (
    User, Client, Project, ProjectPhase, Asset, Personnel, Material,
    ExpenseCategory, CostCenter, ServiceItem
)

def init_db():
    Base.metadata.create_all(bind=engine)
    
    # Safe auto-migration for newly added columns and TEXT column expansion
    with engine.connect() as conn:
        for stmt in [
            "ALTER TABLE expenses ALTER COLUMN description TYPE TEXT;",
            "ALTER TABLE expenses ALTER COLUMN supplier_vendor TYPE TEXT;",
            "ALTER TABLE expenses ALTER COLUMN partner_name TYPE TEXT;",
            "ALTER TABLE expenses ALTER COLUMN alert_notes TYPE TEXT;",
            "ALTER TABLE expenses ALTER COLUMN receipt_image_path TYPE TEXT;",
            "ALTER TABLE audit_logs ALTER COLUMN username TYPE VARCHAR(150);",
            "ALTER TABLE audit_logs ALTER COLUMN action TYPE VARCHAR(150);",
            "ALTER TABLE audit_logs ALTER COLUMN details TYPE TEXT;",
            "ALTER TABLE expenses ADD COLUMN IF NOT EXISTS base_amount_usd FLOAT DEFAULT 0.0;",
            "ALTER TABLE expenses ADD COLUMN IF NOT EXISTS tax_amount_usd FLOAT DEFAULT 0.0;",
            "ALTER TABLE expenses ADD COLUMN IF NOT EXISTS is_tax_exempt BOOLEAN DEFAULT FALSE;",
            "ALTER TABLE projects ADD COLUMN IF NOT EXISTS tracking_token VARCHAR(64);",
            "ALTER TABLE projects ADD COLUMN IF NOT EXISTS execution_time VARCHAR(100) DEFAULT '15 días hábiles';",
            "ALTER TABLE projects ADD COLUMN IF NOT EXISTS scope_of_work TEXT;",
            "ALTER TABLE projects ADD COLUMN IF NOT EXISTS duration_days INTEGER DEFAULT 30;",
            "ALTER TABLE projects ADD COLUMN IF NOT EXISTS contract_amount_usd FLOAT DEFAULT 0.0;",
            "ALTER TABLE projects ADD COLUMN IF NOT EXISTS estimated_labor_usd FLOAT DEFAULT 0.0;",
            "ALTER TABLE projects ADD COLUMN IF NOT EXISTS estimated_fuel_usd FLOAT DEFAULT 0.0;",
            "ALTER TABLE projects ADD COLUMN IF NOT EXISTS estimated_materials_usd FLOAT DEFAULT 0.0;",
            "ALTER TABLE projects ADD COLUMN IF NOT EXISTS estimated_tools_usd FLOAT DEFAULT 0.0;",
            "ALTER TABLE projects ADD COLUMN IF NOT EXISTS estimated_services_usd FLOAT DEFAULT 0.0;",
            "ALTER TABLE projects ADD COLUMN IF NOT EXISTS budget_limit_usd FLOAT DEFAULT 0.0;",
            "ALTER TABLE accounts_receivable ADD COLUMN IF NOT EXISTS is_bad_debt BOOLEAN DEFAULT FALSE;",
            "ALTER TABLE accounts_receivable ADD COLUMN IF NOT EXISTS bad_debt_amount_usd FLOAT DEFAULT 0.0;",
            "ALTER TABLE accounts_receivable ADD COLUMN IF NOT EXISTS bad_debt_reason VARCHAR(255);",
            "ALTER TABLE accounts_receivable ADD COLUMN IF NOT EXISTS bad_debt_date TIMESTAMP;",
            "ALTER TABLE accounts_receivable ADD COLUMN IF NOT EXISTS taxable_base_usd FLOAT DEFAULT 0.0;",
            "ALTER TABLE accounts_receivable ADD COLUMN IF NOT EXISTS tax_amount_usd FLOAT DEFAULT 0.0;",
            "ALTER TABLE accounts_receivable ADD COLUMN IF NOT EXISTS tax_withholding_rate FLOAT DEFAULT 75.0;",
            "ALTER TABLE accounts_receivable ADD COLUMN IF NOT EXISTS tax_withholding_usd FLOAT DEFAULT 0.0;",
            "ALTER TABLE accounts_receivable ADD COLUMN IF NOT EXISTS islr_rate FLOAT DEFAULT 2.0;",
            "ALTER TABLE accounts_receivable ADD COLUMN IF NOT EXISTS islr_withholding_usd FLOAT DEFAULT 0.0;",
            "ALTER TABLE accounts_receivable ADD COLUMN IF NOT EXISTS net_amount_usd FLOAT DEFAULT 0.0;",
            "ALTER TABLE accounts_payable ADD COLUMN IF NOT EXISTS payable_type VARCHAR(50) DEFAULT 'costo_material_obra';",
            "ALTER TABLE accounts_payable ADD COLUMN IF NOT EXISTS taxable_base_usd FLOAT DEFAULT 0.0;",
            "ALTER TABLE accounts_payable ADD COLUMN IF NOT EXISTS tax_amount_usd FLOAT DEFAULT 0.0;",
            "ALTER TABLE accounts_payable ADD COLUMN IF NOT EXISTS tax_withholding_rate FLOAT DEFAULT 75.0;",
            "ALTER TABLE accounts_payable ADD COLUMN IF NOT EXISTS tax_withholding_usd FLOAT DEFAULT 0.0;",
            "ALTER TABLE accounts_payable ADD COLUMN IF NOT EXISTS islr_rate FLOAT DEFAULT 2.0;",
            "ALTER TABLE accounts_payable ADD COLUMN IF NOT EXISTS islr_withholding_usd FLOAT DEFAULT 0.0;",
            "ALTER TABLE accounts_payable ADD COLUMN IF NOT EXISTS net_amount_usd FLOAT DEFAULT 0.0;",
            "ALTER TABLE resource_assignment_history ADD COLUMN IF NOT EXISTS transfer_code VARCHAR(50);",
            "ALTER TABLE resource_assignment_history ADD COLUMN IF NOT EXISTS custodian_name VARCHAR(150);",
            "ALTER TABLE resource_assignment_history ADD COLUMN IF NOT EXISTS driver_name VARCHAR(150);",
            "ALTER TABLE resource_assignment_history ADD COLUMN IF NOT EXISTS origin_location VARCHAR(150) DEFAULT 'Sede Central';",
            "ALTER TABLE resource_assignment_history ADD COLUMN IF NOT EXISTS freight_cost_usd FLOAT DEFAULT 0.0;",
            "ALTER TABLE resource_assignment_history ADD COLUMN IF NOT EXISTS fuel_cost_usd FLOAT DEFAULT 0.0;",
            "ALTER TABLE resource_assignment_history ADD COLUMN IF NOT EXISTS start_odometer FLOAT DEFAULT 0.0;",
            "ALTER TABLE resource_assignment_history ADD COLUMN IF NOT EXISTS end_odometer FLOAT DEFAULT 0.0;",
            "ALTER TABLE resource_assignment_history ADD COLUMN IF NOT EXISTS start_hourmeter FLOAT DEFAULT 0.0;",
            "ALTER TABLE resource_assignment_history ADD COLUMN IF NOT EXISTS end_hourmeter FLOAT DEFAULT 0.0;",
            "ALTER TABLE resource_assignment_history ADD COLUMN IF NOT EXISTS cargo_manifest_details TEXT;",
            "ALTER TABLE resource_assignment_history ALTER COLUMN project_id DROP NOT NULL;",
            "ALTER TABLE resource_assignment_history ALTER COLUMN client_id DROP NOT NULL;",
            "ALTER TABLE dispatch_guides ALTER COLUMN project_id DROP NOT NULL;",
            "ALTER TABLE dispatch_guides ALTER COLUMN client_id DROP NOT NULL;"
        ]:
            try:
                conn.execute(text(stmt))
                conn.commit()
            except Exception:
                pass

    db = SessionLocal()
    try:
        print("--> Verifying and synchronizing Dalor SIGO-P Database...")

        # 1. Clean Official Users (Purge old/fictional users if present)
        director = db.query(User).filter(User.username == "director").first()
        if not director:
            print("--> Seeding clean official users...")
            db.query(User).delete()
            db.commit()
            users = [
                User(
                    username="director",
                    full_name="Director General / Socio",
                    email="director@dalor.com.ve",
                    hashed_password=get_password_hash("dalor2026"),
                    role_name="director_general",
                    is_active=True,
                    is_superuser=True
                ),
                User(
                    username="admin",
                    full_name="Director General / Socio",
                    email="admin@dalor.com.ve",
                    hashed_password=get_password_hash("admin123"),
                    role_name="director_general",
                    is_active=True,
                    is_superuser=True
                ),
                User(
                    username="administracion",
                    full_name="Administración & Finanzas",
                    email="admin@dalor.com.ve",
                    hashed_password=get_password_hash("admin2026"),
                    role_name="administrador_financiero",
                    is_active=True,
                    is_superuser=False
                ),
                User(
                    username="finanzas",
                    full_name="Administración & Finanzas",
                    email="finanzas@dalor.com.ve",
                    hashed_password=get_password_hash("finanzas123"),
                    role_name="administrador_financiero",
                    is_active=True,
                    is_superuser=False
                ),
                User(
                    username="ingeniero",
                    full_name="Ingeniero Residente de Obra",
                    email="ingenieria@dalor.com.ve",
                    hashed_password=get_password_hash("obra2026"),
                    role_name="ingeniero_obra",
                    is_active=True,
                    is_superuser=False
                ),
                User(
                    username="campo",
                    full_name="Supervisor de Campo / Faena",
                    email="campo@dalor.com.ve",
                    hashed_password=get_password_hash("campo2026"),
                    role_name="supervisor_campo",
                    is_active=True,
                    is_superuser=False
                ),
                User(
                    username="supervisor",
                    full_name="Supervisor de Campo / Faena",
                    email="supervisor@dalor.com.ve",
                    hashed_password=get_password_hash("campo123"),
                    role_name="supervisor_campo",
                    is_active=True,
                    is_superuser=False
                ),
                User(
                    username="almacen",
                    full_name="Almacén & Pañol Central",
                    email="almacen@dalor.com.ve",
                    hashed_password=get_password_hash("almacen123"),
                    role_name="almacenista",
                    is_active=True,
                    is_superuser=False
                ),
            ]
            db.add_all(users)
            db.commit()

        # Asegurar usuario Almacén si ya existía la base de datos
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

                # 2. Clean Personnel Roster (15 Official Operational DALOR Members)
        if db.query(Personnel).count() < 15:
            print("--> Synchronizing complete 15-member operational personnel roster...")
            # Keep existing IDs or clean and insert full roster
            existing_codes = {p.code for p in db.query(Personnel.code).all()}
            full_roster = [
                Personnel(code="PERS-001", full_name="Robert Rodríguez", role_title="Ingeniero Residente de Proyecto", identification_id="V-18450123", phone="0414-1234567", status="disponible_base", current_location="Sede Central Dalor", roster_type="guacara_fijo"),
                Personnel(code="PERS-002", full_name="Carlos Hurtado", role_title="Supervisor de Soldadura y Montaje CWI", identification_id="V-16982341", phone="0412-9876543", status="disponible_base", current_location="Sede Central Dalor", roster_type="guacara_fijo"),
                Personnel(code="PERS-003", full_name="Julio Saavedra", role_title="Custodio de Almacén & Pañol Central", identification_id="V-20114562", phone="0414-5558899", status="disponible_base", current_location="Sede Central Dalor", roster_type="guacara_fijo"),
                Personnel(code="PERS-004", full_name="Vicente Rodríguez", role_title="Conductor de Carga Pesada & Equipos", identification_id="V-15332901", phone="0424-7778899", status="disponible_base", current_location="Sede Central Dalor", roster_type="guacara_fijo"),
                Personnel(code="PERS-005", full_name="Hender Rodríguez", role_title="Soldador Especialista 6G / TIG-ASME", identification_id="V-19345612", phone="0414-3334455", status="disponible_base", current_location="Sede Central Dalor", roster_type="guacara_fijo"),
                Personnel(code="PERS-006", full_name="Herby Rodríguez", role_title="Soldador Estructural & Calderería", identification_id="V-21098432", phone="0412-6667788", status="disponible_base", current_location="Sede Central Dalor", roster_type="guacara_fijo"),
                Personnel(code="PERS-007", full_name="Eliú Suárez", role_title="Pailero / Calderero Especialista A36-Hardox", identification_id="V-17849201", phone="0424-1112233", status="disponible_base", current_location="Sede Central Dalor", roster_type="guacara_fijo"),
                Personnel(code="PERS-008", full_name="Danny Chaparro", role_title="Montador Mecánico / Armador de Estructuras", identification_id="V-22119045", phone="0416-9990011", status="disponible_base", current_location="Sede Central Dalor", roster_type="guacara_fijo"),
                Personnel(code="PERS-009", full_name="Ernesto Chaparro", role_title="Oxicortista / Ayudante Técnico Especializado", identification_id="V-24558912", phone="0414-8889900", status="disponible_base", current_location="Sede Central Dalor", roster_type="guacara_fijo"),
                Personnel(code="PERS-010", full_name="Mervis Parra", role_title="Operador de Sandblasting & Pintura Airless", identification_id="V-18776234", phone="0412-4445566", status="disponible_base", current_location="Sede Central Dalor", roster_type="guacara_fijo"),
                Personnel(code="PERS-011", full_name="Paola Garay", role_title="Administradora de Obra & Costos", identification_id="V-20334891", phone="0414-2223344", status="disponible_base", current_location="Sede Central Dalor", roster_type="guacara_fijo"),
                Personnel(code="PERS-012", full_name="Geraldine Páez", role_title="Procura & Compras de Materiales", identification_id="V-23450912", phone="0424-5556677", status="disponible_base", current_location="Sede Central Dalor", roster_type="guacara_fijo"),
                Personnel(code="PERS-013", full_name="Eleonora Galetti", role_title="Inspectora de Seguridad Industrial SHA", identification_id="V-19882314", phone="0412-1110099", status="disponible_base", current_location="Sede Central Dalor", roster_type="guacara_fijo"),
                Personnel(code="PERS-014", full_name="José Gregorio Mendoza", role_title="Tornero & Mecánico Ajustador Taller", identification_id="V-14998231", phone="0416-3332211", status="disponible_base", current_location="Sede Central Dalor", roster_type="guacara_fijo"),
                Personnel(code="PERS-015", full_name="Wilmer Albornoz", role_title="Electricista Industrial & Generadores", identification_id="V-16773412", phone="0414-7776655", status="disponible_base", current_location="Sede Central Dalor", roster_type="guacara_fijo")
            ]
            for p in full_roster:
                if p.code not in existing_codes:
                    db.add(p)
                else:
                    existing = db.query(Personnel).filter(Personnel.code == p.code).first()
                    if existing:
                        existing.full_name = p.full_name
                        existing.role_title = p.role_title
                        existing.current_location = p.current_location
            db.commit()

        # 3. Assets, Heavy Machinery, Welding Rigs & Vehicles (Ensure real Dalor fleet & tools loaded)
        if db.query(Asset).count() == 0 or db.query(Asset).filter(Asset.asset_code == "1-V-1-01").first() is None:
            print("--> Seeding complete industrial catalog of tools, machinery, and vehicles...")
            db.query(Asset).delete()
            db.commit()

            # 8 Vehículos Oficiales DALOR C.A. (Extracción certificada de VEHICULOS.xlsx)
            vehicles = [
                Asset(asset_code="1-V-1-01", name="Camión NPR Baranda 350 Blanco 2013", asset_type="vehiculo", brand="CHEVROLET", model="NPR-350", license_plate="A47CC2V", current_odometer=0.0, last_service_odometer=0.0, service_interval_km=5000, current_location="Sede Central Dalor", status="disponible_base"),
                Asset(asset_code="1-V-1-02", name="Camioneta Dodge RAM Doble Cabina Gris", asset_type="vehiculo", brand="DODGE", model="RAM-250", license_plate="A31AJ5B", current_odometer=0.0, last_service_odometer=0.0, service_interval_km=5000, current_location="Sede Central Dalor", status="disponible_base"),
                Asset(asset_code="1-V-1-03", name="Camioneta Toyota Hilux Kavak Azul 2009", asset_type="vehiculo", brand="TOYOTA", model="HILUX KAVAK", license_plate="A45AC91", serial_number="8XA33ZV2599006549", current_odometer=0.0, last_service_odometer=0.0, service_interval_km=5000, current_location="Sede Central Dalor", status="disponible_base"),
                Asset(asset_code="3-V-1-04", name="Carro Fiat Palio Gris 2003", asset_type="vehiculo", brand="FIAT", model="PALIO SX 1.3", license_plate="DBP20K", serial_number="6361720", current_odometer=0.0, last_service_odometer=0.0, service_interval_km=5000, current_location="Sede Central Dalor", status="disponible_base"),
                Asset(asset_code="3-V-1-05", name="Montacargas Toyota 2005 3.5T", asset_type="maquinaria", brand="TOYOTA", model="7FGCU30", serial_number="67821", current_odometer=0.0, last_service_odometer=0.0, service_interval_km=250, current_location="Sede Central Dalor", status="disponible_base"),
                Asset(asset_code="3-V-1-06", name="Camioneta Toyota 4Runner Negra", asset_type="vehiculo", brand="TOYOTA", model="4RUNNER TRD", license_plate="AI619DK", current_odometer=0.0, last_service_odometer=0.0, service_interval_km=5000, current_location="Sede Central Dalor", status="disponible_base"),
                Asset(asset_code="3-V-1-07", name="Carro SpaceFox Azul 2011", asset_type="vehiculo", brand="VOLKSWAGEN", model="SPACE FOX", license_plate="AA293TD", serial_number="CFZ277038", current_odometer=0.0, last_service_odometer=0.0, service_interval_km=5000, current_location="Sede Central Dalor", status="disponible_base"),
                Asset(asset_code="3-V-1-08", name="Camión de Carga Doble Cabina Neptunia", asset_type="vehiculo", brand="BAW", model="NEPTUNIA D/C", license_plate="A41AE34", current_odometer=0.0, last_service_odometer=0.0, service_interval_km=5000, current_location="Sede Central Dalor", status="disponible_base")
            ]
            db.add_all(vehicles)

            # Cargar herramientas y equipos desde clean_tools.json si existe
            tools_json_paths = [
                os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "clean_tools.json"),
                os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "clean_tools.json"),
                r"C:\Users\GATEWAY\Desktop\CLIENTES DE CONSULTORIA\Metalmecanica Dalor\clean_tools.json"
            ]
            loaded_tools = False
            for tjp in tools_json_paths:
                if os.path.exists(tjp):
                    try:
                        import json
                        with open(tjp, "r", encoding="utf-8") as tjf:
                            tools_data = json.load(tjf)
                        for t in tools_data:
                            code = t.get("code")
                            if code and not db.query(Asset).filter(Asset.asset_code == code).first():
                                db.add(Asset(
                                    asset_code=code,
                                    name=t.get("name"),
                                    asset_type=t.get("asset_type", "herramienta"),
                                    brand=t.get("brand"),
                                    model=t.get("model"),
                                    serial_number=t.get("serial_number"),
                                    status=t.get("status", "disponible_base"),
                                    current_location=t.get("location", "Sede Central Dalor"),
                                    current_odometer=0.0,
                                    last_service_odometer=0.0
                                ))
                        loaded_tools = True
                        break
                    except Exception as e:
                        print(f"Warning loading clean_tools: {e}")

            db.commit()

                # 4. Materials & Consumables Catalog (Ensure 15 materials exist)
        if db.query(Material).count() < 15:
            print("--> Seeding/Syncing 15 authentic raw materials & consumables...")
            existing_mats = {m.code for m in db.query(Material.code).all()}
            materials_list = [
                Material(code='MAT-PLA-01', name='Plancha de Acero ASTM A36 12mm x 2.44m x 6.00m', category='Planchas de Acero', unit_measure='Planchas', stock_quantity=18.0, min_stock_alert=5.0, unit_cost_usd=480.0, total_cost_usd=8640.0),
                Material(code='MAT-PLA-02', name='Plancha de Acero ASTM A36 6mm x 2.44m x 6.00m', category='Planchas de Acero', unit_measure='Planchas', stock_quantity=24.0, min_stock_alert=6.0, unit_cost_usd=245.0, total_cost_usd=5880.0),
                Material(code='MAT-PLA-03', name='Plancha Antidesgaste Hardox 450 10mm x 2m x 6m', category='Planchas de Acero', unit_measure='Planchas', stock_quantity=8.0, min_stock_alert=2.0, unit_cost_usd=1350.0, total_cost_usd=10800.0),
                Material(code='MAT-VIG-01', name='Viga Estructural IPE 200 x 12 metros', category='Perfiles y Vigas', unit_measure='Barras', stock_quantity=32.0, min_stock_alert=10.0, unit_cost_usd=310.0, total_cost_usd=9920.0),
                Material(code='MAT-VIG-02', name='Viga Estructural HEA 240 x 12 metros', category='Perfiles y Vigas', unit_measure='Barras', stock_quantity=14.0, min_stock_alert=4.0, unit_cost_usd=590.0, total_cost_usd=8260.0),
                Material(code='MAT-TUB-01', name='Tubo de Acero al Carbono Sin Costura ASTM A106 Gr.B 4" SCH 40 (6m)', category='Tuberías y Bridas', unit_measure='Tubos', stock_quantity=45.0, min_stock_alert=15.0, unit_cost_usd=145.0, total_cost_usd=6525.0),
                Material(code='MAT-TUB-02', name='Tubo de Acero al Carbono ASTM A53 6" SCH 80 (6m)', category='Tuberías y Bridas', unit_measure='Tubos', stock_quantity=20.0, min_stock_alert=8.0, unit_cost_usd=260.0, total_cost_usd=5200.0),
                Material(code='MAT-SOL-01', name='Electrodos de Soldadura E-7018 1/8" (Caja 20 Kg)', category='Soldadura y Gases', unit_measure='Cajas', stock_quantity=65.0, min_stock_alert=20.0, unit_cost_usd=55.0, total_cost_usd=3575.0),
                Material(code='MAT-SOL-02', name='Electrodos de Soldadura E-6010 / E-6013 1/8" (Caja 20 Kg)', category='Soldadura y Gases', unit_measure='Cajas', stock_quantity=40.0, min_stock_alert=15.0, unit_cost_usd=48.0, total_cost_usd=1920.0),
                Material(code='MAT-SOL-03', name='Alambre Tubular para Soldadura MIG/FCAW E71T-1 0.045" (Rollo 15 Kg)', category='Soldadura y Gases', unit_measure='Rollos', stock_quantity=28.0, min_stock_alert=10.0, unit_cost_usd=62.0, total_cost_usd=1736.0),
                Material(code='MAT-ABR-01', name='Discos de Corte Abrasivo 9" x 1/8" x 7/8" para Acero (Caja 25 Und)', category='Abrasivos y Discos', unit_measure='Cajas', stock_quantity=35.0, min_stock_alert=10.0, unit_cost_usd=42.0, total_cost_usd=1470.0),
                Material(code='MAT-ABR-02', name='Discos de Desbaste 7" x 1/4" x 7/8" (Caja 20 Und)', category='Abrasivos y Discos', unit_measure='Cajas', stock_quantity=25.0, min_stock_alert=8.0, unit_cost_usd=38.0, total_cost_usd=950.0),
                Material(code='MAT-REC-01', name='Pintura Anticorrosiva Epóxica Poliamida Grís (Kit Galón A+B)', category='Pinturas y Recubrimientos', unit_measure='Kits', stock_quantity=42.0, min_stock_alert=12.0, unit_cost_usd=58.0, total_cost_usd=2436.0),
                Material(code='MAT-REC-02', name='Esmalte Poliuretano de Alto Brillo Blanco/Seguridad (Kit Galón)', category='Pinturas y Recubrimientos', unit_measure='Kits', stock_quantity=30.0, min_stock_alert=10.0, unit_cost_usd=72.0, total_cost_usd=2160.0),
                Material(code='MAT-ABR-03', name='Granalla de Acero / Abrasivo para Sandblasting G-40 (Saco 25 Kg)', category='Abrasivos y Discos', unit_measure='Sacos', stock_quantity=80.0, min_stock_alert=25.0, unit_cost_usd=28.0, total_cost_usd=2240.0),
            ]
            for m in materials_list:
                if m.code not in existing_mats:
                    db.add(m)
            db.commit()

        # 5. Categories and Cost Centers (Estructura Original Dalor 20 Categorías + Subcuentas)
        dalor_cats_data = [
            # 1. Nómina Dalor Guacara
            {"code": "1.0", "name": "Nomina Dalor Guacara", "parent_code": None, "group_type": "nomina_guacara", "monthly_budget_usd": 4500.0},
            {"code": "1.1", "name": "Paola Garay", "parent_code": "1.0", "group_type": "nomina_guacara", "monthly_budget_usd": 800.0},
            {"code": "1.2", "name": "Robert Rodriguez", "parent_code": "1.0", "group_type": "nomina_guacara", "monthly_budget_usd": 1000.0},
            {"code": "1.3", "name": "Julio Saavedra", "parent_code": "1.0", "group_type": "nomina_guacara", "monthly_budget_usd": 650.0},
            {"code": "1.4", "name": "Vicente Rodriguez", "parent_code": "1.0", "group_type": "nomina_guacara", "monthly_budget_usd": 600.0},
            {"code": "1.5", "name": "Carlos Hurtado", "parent_code": "1.0", "group_type": "nomina_guacara", "monthly_budget_usd": 1200.0},
            {"code": "1.6", "name": "Geraldine Paez", "parent_code": "1.0", "group_type": "nomina_guacara", "monthly_budget_usd": 600.0},
            {"code": "1.7", "name": "Eleonora Galetti", "parent_code": "1.0", "group_type": "nomina_guacara", "monthly_budget_usd": 600.0},
            # 2. Impuestos Municipales
            {"code": "2.0", "name": "Impuestos Municipales", "parent_code": None, "group_type": "impuestos", "monthly_budget_usd": 500.0},
            {"code": "2.1", "name": "Fisco Guacara", "parent_code": "2.0", "group_type": "impuestos", "monthly_budget_usd": 150.0},
            {"code": "2.2", "name": "Direccion de Ambiente", "parent_code": "2.0", "group_type": "impuestos", "monthly_budget_usd": 100.0},
            {"code": "2.3", "name": "Uso Conforme", "parent_code": "2.0", "group_type": "impuestos", "monthly_budget_usd": 50.0},
            {"code": "2.4", "name": "Bomberos", "parent_code": "2.0", "group_type": "impuestos", "monthly_budget_usd": 100.0},
            {"code": "2.5", "name": "Ret. Municipales", "parent_code": "2.0", "group_type": "impuestos", "monthly_budget_usd": 100.0},
            # 3. Oficina & 4. Taller
            {"code": "3.0", "name": "Consumibles Oficina", "parent_code": None, "group_type": "corporativo", "monthly_budget_usd": 250.0},
            {"code": "4.0", "name": "Consumibles Taller", "parent_code": None, "group_type": "corporativo", "monthly_budget_usd": 500.0},
            # 5 - 9 Tributario SENIAT y Parafiscales
            {"code": "5.0", "name": "Seniat Iva", "parent_code": None, "group_type": "impuestos", "monthly_budget_usd": 500.0},
            {"code": "6.0", "name": "Seniat ISLR", "parent_code": None, "group_type": "impuestos", "monthly_budget_usd": 300.0},
            {"code": "7.0", "name": "Seniat Pensiones", "parent_code": None, "group_type": "impuestos", "monthly_budget_usd": 100.0},
            {"code": "8.0", "name": "Fonacit", "parent_code": None, "group_type": "impuestos", "monthly_budget_usd": 100.0},
            {"code": "9.0", "name": "Parafiscales", "parent_code": None, "group_type": "impuestos", "monthly_budget_usd": 150.0},
            # 10 - 11
            {"code": "10.0", "name": "Honorarios Profesionales", "parent_code": None, "group_type": "corporativo", "monthly_budget_usd": 800.0},
            {"code": "11.0", "name": "Compra de bienes", "parent_code": None, "group_type": "corporativo", "monthly_budget_usd": 1000.0},
            # 12. Servicios
            {"code": "12.0", "name": "Servicios", "parent_code": None, "group_type": "servicios", "monthly_budget_usd": 2500.0},
            {"code": "12.1", "name": "Neptunia", "parent_code": "12.0", "group_type": "servicios", "monthly_budget_usd": 800.0},
            {"code": "12.2", "name": "Gandalf", "parent_code": "12.0", "group_type": "servicios", "monthly_budget_usd": 400.0},
            {"code": "12.3", "name": "Starlink", "parent_code": "12.0", "group_type": "servicios", "monthly_budget_usd": 300.0},
            {"code": "12.4", "name": "Aseo", "parent_code": "12.0", "group_type": "servicios", "monthly_budget_usd": 200.0},
            {"code": "12.5", "name": "Vigilancia", "parent_code": "12.0", "group_type": "servicios", "monthly_budget_usd": 800.0},
            # 13. Gastos de Flota
            {"code": "13.0", "name": "Gastos de Flota", "parent_code": None, "group_type": "operativo_campo", "monthly_budget_usd": 1200.0},
            # 14. Nómina Proyecto (Campo)
            {"code": "14.0", "name": "Nomina Proyecto", "parent_code": None, "group_type": "nomina_proyecto", "monthly_budget_usd": 3500.0},
            {"code": "14.1", "name": "Hender Rodriguez", "parent_code": "14.0", "group_type": "nomina_proyecto", "monthly_budget_usd": 800.0},
            {"code": "14.2", "name": "Herby Rodriguez", "parent_code": "14.0", "group_type": "nomina_proyecto", "monthly_budget_usd": 700.0},
            {"code": "14.3", "name": "Eliu Suarez", "parent_code": "14.0", "group_type": "nomina_proyecto", "monthly_budget_usd": 600.0},
            {"code": "14.4", "name": "Danny Chaparro", "parent_code": "14.0", "group_type": "nomina_proyecto", "monthly_budget_usd": 600.0},
            {"code": "14.5", "name": "Ernesto Chaparro", "parent_code": "14.0", "group_type": "nomina_proyecto", "monthly_budget_usd": 500.0},
            {"code": "14.6", "name": "Mervis Parra", "parent_code": "14.0", "group_type": "nomina_proyecto", "monthly_budget_usd": 500.0},
            # 15 - 20 Operativos de Campo
            {"code": "15.0", "name": "Hospedaje", "parent_code": None, "group_type": "operativo_campo", "monthly_budget_usd": 1500.0},
            {"code": "16.0", "name": "Comidas", "parent_code": None, "group_type": "operativo_campo", "monthly_budget_usd": 1800.0},
            {"code": "17.0", "name": "Insumos", "parent_code": None, "group_type": "operativo_campo", "monthly_budget_usd": 2500.0},
            {"code": "18.0", "name": "Consumibles", "parent_code": None, "group_type": "operativo_campo", "monthly_budget_usd": 800.0},
            {"code": "19.0", "name": "Combustible", "parent_code": None, "group_type": "operativo_campo", "monthly_budget_usd": 2000.0},
            {"code": "20.0", "name": "Traslados", "parent_code": None, "group_type": "operativo_campo", "monthly_budget_usd": 600.0}
        ]
        
        parent_map = {}
        for item in dalor_cats_data:
            if item["parent_code"] is None:
                cat = db.query(ExpenseCategory).filter(ExpenseCategory.code == item["code"]).first()
                if not cat:
                    cat = ExpenseCategory(code=item["code"])
                    db.add(cat)
                cat.name = item["name"]
                cat.group_type = item["group_type"]
                cat.monthly_budget_usd = item["monthly_budget_usd"]
                cat.parent_id = None
                db.flush()
                parent_map[item["code"]] = cat.id

        for item in dalor_cats_data:
            if item["parent_code"] is not None:
                cat = db.query(ExpenseCategory).filter(ExpenseCategory.code == item["code"]).first()
                if not cat:
                    cat = ExpenseCategory(code=item["code"])
                    db.add(cat)
                cat.name = item["name"]
                cat.group_type = item["group_type"]
                cat.monthly_budget_usd = item["monthly_budget_usd"]
                cat.parent_id = parent_map.get(item["parent_code"])
                db.flush()
        db.commit()

        # 6. Clients & Corporate Directory
        # Fix any legacy clients with missing codes
        null_code_clients = db.query(Client).filter((Client.code == None) | (Client.code == "")).all()
        for nc in null_code_clients:
            nc.code = f"CLI-LEGACY-{nc.id}"
        db.commit()

        official_clients = [
            Client(
                code="CLI-POLAR",
                name="Cervecería Polar, C.A. / Alimentos Polar",
                rif="J-00006547-2",
                contact_name="Gerencia de Planta & Proyectos",
                contact_phone="+58 241-8712200",
                contact_email="proyectos.metalmecanicos@empresaspolar.com",
                address="Zona Industrial Los Cortijos / San Joaquín, Edo. Carabobo",
                industry="Alimentos y Bebidas"
            ),
            Client(
                code="CLI-PIRELLI",
                name="Pirelli de Venezuela, C.A.",
                rif="J-00018902-3",
                contact_name="Ingeniería de Planta y Mantenimiento",
                contact_phone="+58 245-5601100",
                contact_email="mantenimiento.industrial@pirelli.com.ve",
                address="Zona Industrial Guacara, Edo. Carabobo",
                industry="Manufactura y Neumáticos"
            ),
            Client(
                code="CLI-REGIONAL",
                name="Cervecería Regional, C.A.",
                rif="J-00034125-9",
                contact_name="Dpto. de Calderas y Estructuras",
                contact_phone="+58 244-3951000",
                contact_email="operaciones@cerveceriaregional.com",
                address="Cagua, Edo. Aragua",
                industry="Bebidas y Cervecería"
            ),
            Client(
                code="CLI-CORPOELEC",
                name="CORPOELEC INDUSTRIAL / PDVSA",
                rif="J-30004567-8",
                contact_name="Gerencia de Proyectos Mayores",
                contact_phone="+58 212-5071111",
                contact_email="proyectos@corpoelec.gob.ve",
                address="Av. Sanz, Edif. Corpoelec, Caracas",
                industry="Energía y Petróleo"
            ),
            Client(
                code="CLI-PROTINAL",
                name="Protinal Proagro, C.A.",
                rif="J-00021543-1",
                contact_name="Supervisión de Silos y Mantenimiento",
                contact_phone="+58 241-8395500",
                contact_email="ingenieria@protinal-proagro.com",
                address="Valencia, Edo. Carabobo",
                industry="Agroindustria y Alimentos"
            ),
        ]

        for oc in official_clients:
            existing = db.query(Client).filter(Client.code == oc.code).first()
            if not existing:
                db.add(oc)
            else:
                existing.name = oc.name
                existing.rif = oc.rif
                existing.contact_name = oc.contact_name
                existing.contact_phone = oc.contact_phone
                existing.contact_email = oc.contact_email
                existing.address = oc.address
                existing.industry = oc.industry
        db.commit()

        # 7. Catalogo de Servicios / Partidas APU
        if db.query(ServiceItem).count() < 5:
            print("--> Seeding standard metalmechanical APU service items...")
            apu_services = [
                ServiceItem(
                    code="SRV-FAB-01",
                    name="Fabricación de Estructuras Metálicas en Taller (Vigas, Columnas, Cerchas)",
                    description="Fabricación bajo especificación AWS D1.1 en perfiles estructurales ASTM A36/A572, incluye corte, perforación, armado, soldadura y limpieza mecánica.",
                    unit_measure="Kg",
                    category="Metalmecánica / Taller",
                    base_cost_usd=1.85,
                    unit_price_usd=3.40
                ),
                ServiceItem(
                    code="SRV-MON-02",
                    name="Montaje Mecánico y Elevación de Estructuras en Obra",
                    description="Montaje en sitio con grúa telescópica, alineación topográfica, torqueo de pernos de alta resistencia A325/A490 y soldadura en posición.",
                    unit_measure="Ton",
                    category="Montaje Mecánico",
                    base_cost_usd=450.0,
                    unit_price_usd=780.0
                ),
                ServiceItem(
                    code="SRV-SOL-03",
                    name="Soldadura Calificada ASME 6G / TIG-SMAW en Tuberías de Proceso",
                    description="Pase de raíz con proceso GTAW (TIG) Argón y relleno con electrodo E-7018 en tuberías ASTM A106 Gr.B SCH 40/80 con inspección radiográfica 100%.",
                    unit_measure="Pulg-Diam",
                    category="Soldadura Especializada",
                    base_cost_usd=12.50,
                    unit_price_usd=24.00
                ),
                ServiceItem(
                    code="SRV-SAN-04",
                    name="Sandblasting Grado Comercial SSPC-SP6 y Esquema Epóxico de Alto Sólidos",
                    description="Preparación de superficie con granalla metálica y aplicación de fondo anticorrosivo poliamida 4 mils EPS + acabado poliuretano alifático 3 mils EPS.",
                    unit_measure="m2",
                    category="Tratamiento Superficial & Pintura",
                    base_cost_usd=14.00,
                    unit_price_usd=26.50
                ),
                ServiceItem(
                    code="SRV-CAL-05",
                    name="Reparación, Pailería y Revestimiento de Tolvas y Calderas Industriales",
                    description="Corte térmico de planchas fatigadas, conformación de virolas y colocación de planchas de desgaste Hardox 450 con soldadura especial antiabrasión.",
                    unit_measure="Global",
                    category="Calderería y Pailería Pesada",
                    base_cost_usd=3800.0,
                    unit_price_usd=6900.0
                ),
                ServiceItem(
                    code="SRV-TUB-06",
                    name="Tendido e Interconexión de Tuberías de Vapor y Condensado",
                    description="Suministro de mano de obra especializada para trazado, soportería tipo resorte, juntas de expansión y pruebas hidrostáticas a 1.5x presión de diseño.",
                    unit_measure="Metro Lineal",
                    category="Tuberías Industriales",
                    base_cost_usd=28.00,
                    unit_price_usd=52.00
                )
            ]
            for srv in apu_services:
                if not db.query(ServiceItem).filter(ServiceItem.code == srv.code).first():
                    db.add(srv)
            db.commit()

        # 8. Client & Active Project
        if db.query(Project).count() == 0:
            client = db.query(Client).filter(Client.code == "CLI-CORPOELEC").first()
            if not client:
                client = db.query(Client).first()

            project = Project(
                code="DAL-2026-001",
                name="Mantenimiento Mayor de Estructuras y Calderas Planta Centro",
                client_id=client.id if client else 1,
                client_name=client.name if client else "Cliente General",
                location="Planta Termoeléctrica Planta Centro, Morón, Edo. Carabobo",
                status="activo",
                scope_of_work="Desmontaje, fabricación y montaje de tolvas de ceniza, vigas de soporte y ductos de gases de alta temperatura.",
                duration_days=60,
                contract_amount_usd=145000.0,
                estimated_labor_usd=32000.0,
                estimated_fuel_usd=5500.0,
                estimated_materials_usd=48000.0,
                estimated_tools_usd=12000.0,
                estimated_services_usd=8000.0,
                budget_limit_usd=105500.0
            )
            db.add(project)
            db.commit()

        # 7. Etapas & Tareas de Obras (Asegurar que el proyecto DAL-2026-001 tenga sus fases operativas)
        active_proj = db.query(Project).filter(Project.code == "DAL-2026-001").first()
        if active_proj and db.query(ProjectPhase).filter(ProjectPhase.project_id == active_proj.id).count() == 0:
            print("--> Seeding 4 industrial phases and task scopes for DAL-2026-001...")
            phases = [
                ProjectPhase(
                    project_id=active_proj.id,
                    phase_number=1,
                    name="Fase 1: Movilización, Permisos & Seguridad SHA",
                    description="Gestión de pases de planta PDVSA/Corpoelec, charla SHA, inspección de EPP, movilización de maquinaria y tolvas al sitio.",
                    duration_days=10,
                    estimated_cost_usd=15000.0,
                    status="completado",
                    responsible_person="Supervisor de Obra"
                ),
                ProjectPhase(
                    project_id=active_proj.id,
                    phase_number=2,
                    name="Fase 2: Desmontaje Mecánico & Corte con Oxicorte",
                    description="Corte de tolvas deterioradas, retiro de vigas secundarias y ductos de gases de alta temperatura con apoyo de camión grúa.",
                    duration_days=15,
                    estimated_cost_usd=25000.0,
                    status="en_progreso",
                    responsible_person="Supervisor de Soldadura"
                ),
                ProjectPhase(
                    project_id=active_proj.id,
                    phase_number=3,
                    name="Fase 3: Fabricación & Montaje de Estructuras Nuevas",
                    description="Armado, calderería y soldadura bajo norma ASME/AWS de nuevas tolvas en acero A36 e instalación de vigas de soporte HEA.",
                    duration_days=25,
                    estimated_cost_usd=45000.0,
                    status="pendiente",
                    responsible_person="Ingeniero Residente"
                ),
                ProjectPhase(
                    project_id=active_proj.id,
                    phase_number=4,
                    name="Fase 4: Ensayos No Destructivos (END), Pintura & Entrega",
                    description="Inspección de soldaduras por líquidos penetrantes y ultrasonido, recubrimiento epóxico anticorrosivo y firma de acta de aceptación.",
                    duration_days=10,
                    estimated_cost_usd=20500.0,
                    status="pendiente",
                    responsible_person="Gerencia de Calidad"
                ),
            ]
            db.add_all(phases)
            db.commit()

        print("--> Dalor SIGO-P Database successfully verified & synced!")
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
    finally:
        db.close()
