import os
from datetime import datetime
from sqlalchemy import text, func
from app.core.database import SessionLocal, engine, Base
from app.core.security import get_password_hash
from app.core.config import settings
import app.models.models
from app.models.models import (
    User, Role, Client, Project, ProjectPhase, Asset, Personnel, Material,
    ExpenseCategory, CostCenter, ServiceItem, FinancialAccount
)

def init_db():
    from sqlalchemy import Integer, Float, Boolean, DateTime, Text, String, Enum as SaEnum
    
    # 1. Crear todas las tablas que no existan aun
    Base.metadata.create_all(bind=engine)
    
    # 2. Sincronizacion exhaustiva de esquema dinámico:
    # Recorre cada tabla y cada columna de los modelos SQLAlchemy y asegura
    # que exista en PostgreSQL / SQLite, ejecutando cada sentencia en su
    # propia transaccion aislada para blindar contra transacciones abortadas.
    is_sqlite = "sqlite" in str(engine.url).lower()
    
    for table_name, table in Base.metadata.tables.items():
        for col in table.columns:
            col_name = col.name
            col_type = col.type
            
            if isinstance(col_type, Integer):
                sql_type = "INTEGER"
            elif isinstance(col_type, Float):
                sql_type = "FLOAT" if is_sqlite else "DOUBLE PRECISION"
            elif isinstance(col_type, Boolean):
                sql_type = "BOOLEAN"
            elif isinstance(col_type, DateTime):
                sql_type = "TIMESTAMP"
            elif isinstance(col_type, Text):
                sql_type = "TEXT"
            elif isinstance(col_type, String):
                sql_type = f"VARCHAR({col_type.length or 255})"
            elif isinstance(col_type, SaEnum):
                sql_type = "VARCHAR(50)"
            else:
                sql_type = "VARCHAR(255)"
                
            default_clause = ""
            if col.default is not None and hasattr(col.default, 'arg'):
                arg = col.default.arg
                if isinstance(arg, bool):
                    default_clause = f" DEFAULT {str(arg).upper()}"
                elif isinstance(arg, (int, float)):
                    default_clause = f" DEFAULT {arg}"
                elif isinstance(arg, str):
                    default_clause = f" DEFAULT '{arg}'"
                    
            if is_sqlite:
                stmt = f'ALTER TABLE "{table_name}" ADD COLUMN "{col_name}" {sql_type}{default_clause}'
            else:
                stmt = f'ALTER TABLE "{table_name}" ADD COLUMN IF NOT EXISTS "{col_name}" {sql_type}{default_clause}'
                
            try:
                with engine.begin() as isolated_conn:
                    isolated_conn.execute(text(stmt))
            except Exception:
                pass  # Columna ya existe o base de datos no lo requiere

    # Expansiones de texto e indices criticos
    extra_stmts = [
        "ALTER TABLE expenses ALTER COLUMN description TYPE TEXT;",
        "ALTER TABLE expenses ALTER COLUMN supplier_vendor TYPE TEXT;",
        "ALTER TABLE expenses ALTER COLUMN partner_name TYPE TEXT;",
        "ALTER TABLE expenses ALTER COLUMN alert_notes TYPE TEXT;",
        "ALTER TABLE expenses ALTER COLUMN receipt_image_path TYPE TEXT;",
        "ALTER TABLE audit_logs ALTER COLUMN username TYPE VARCHAR(150);",
        "ALTER TABLE audit_logs ALTER COLUMN action TYPE VARCHAR(150);",
        "ALTER TABLE audit_logs ALTER COLUMN details TYPE TEXT;",
        "ALTER TABLE resource_assignment_history ALTER COLUMN project_id DROP NOT NULL;",
        "ALTER TABLE resource_assignment_history ALTER COLUMN client_id DROP NOT NULL;",
        "ALTER TABLE dispatch_guides ALTER COLUMN project_id DROP NOT NULL;",
        "ALTER TABLE dispatch_guides ALTER COLUMN client_id DROP NOT NULL;",
        "DROP INDEX IF EXISTS idx_dispatch_items_guide_id;",
        "CREATE INDEX IF NOT EXISTS idx_dispatch_items_guide_id ON dispatch_guide_items (dispatch_guide_id);",
        "CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects (client_id);",
        "CREATE INDEX IF NOT EXISTS idx_project_phases_project_id ON project_phases (project_id);",
        "CREATE INDEX IF NOT EXISTS idx_mat_movements_project_id ON material_movements (project_id);",
        "CREATE INDEX IF NOT EXISTS idx_mat_movements_material_id ON material_movements (material_id);",
        "CREATE INDEX IF NOT EXISTS idx_personnel_project_id ON personnel (current_project_id);",
        "CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs (user_id);",
        "CREATE INDEX IF NOT EXISTS idx_expenses_asset_id ON expenses (asset_id);",
        "CREATE INDEX IF NOT EXISTS idx_dispatch_asset_id ON dispatch_guides (asset_id);",
        f"ALTER TABLE accounts_payable ADD COLUMN {'IF NOT EXISTS ' if not is_sqlite else ''}municipal_rate FLOAT DEFAULT 0.0;",
        f"ALTER TABLE accounts_payable ADD COLUMN {'IF NOT EXISTS ' if not is_sqlite else ''}municipal_withholding_usd FLOAT DEFAULT 0.0;",
        f"ALTER TABLE accounts_payable ADD COLUMN {'IF NOT EXISTS ' if not is_sqlite else ''}municipal_voucher_number VARCHAR(50);",
        f"ALTER TABLE accounts_payable ADD COLUMN {'IF NOT EXISTS ' if not is_sqlite else ''}municipal_voucher_date TIMESTAMP;",
        f"ALTER TABLE quotations ADD COLUMN {'IF NOT EXISTS ' if not is_sqlite else ''}coletilla_divisas BOOLEAN DEFAULT TRUE;",
        f"ALTER TABLE quotations ADD COLUMN {'IF NOT EXISTS ' if not is_sqlite else ''}coletilla_bolivares BOOLEAN DEFAULT FALSE;",
        f"ALTER TABLE quotations ADD COLUMN {'IF NOT EXISTS ' if not is_sqlite else ''}coletilla_modalidad BOOLEAN DEFAULT TRUE;",
        f"ALTER TABLE personnel ADD COLUMN {'IF NOT EXISTS ' if not is_sqlite else ''}payroll_type VARCHAR(50) DEFAULT 'semanal';",
        f"ALTER TABLE project_phases ADD COLUMN {'IF NOT EXISTS ' if not is_sqlite else ''}duration_unit VARCHAR(20) DEFAULT 'dias';",
        f"ALTER TABLE project_phases ADD COLUMN {'IF NOT EXISTS ' if not is_sqlite else ''}estimated_duration FLOAT DEFAULT 7.0;",
        f"ALTER TABLE dispatch_guides ADD COLUMN {'IF NOT EXISTS ' if not is_sqlite else ''}guide_type VARCHAR(50) DEFAULT 'traslado_externo';",
        f"ALTER TABLE dispatch_guides ADD COLUMN {'IF NOT EXISTS ' if not is_sqlite else ''}delivered_by_staff VARCHAR(150);",
        f"ALTER TABLE dispatch_guides ADD COLUMN {'IF NOT EXISTS ' if not is_sqlite else ''}received_by_staff VARCHAR(150);",
        f"ALTER TABLE expense_categories ADD COLUMN {'IF NOT EXISTS ' if not is_sqlite else ''}business_rule VARCHAR(50) DEFAULT 'costo_material_obra';",
    ]
    if not is_sqlite:
        extra_stmts.extend([
            "ALTER TABLE dispatch_guides ALTER COLUMN destination_address DROP NOT NULL;",
            "ALTER TABLE dispatch_guides ALTER COLUMN driver_name DROP NOT NULL;",
            "ALTER TABLE dispatch_guides ALTER COLUMN driver_id_doc DROP NOT NULL;",
            "ALTER TABLE dispatch_guides ALTER COLUMN vehicle_plate DROP NOT NULL;"
        ])
    else:
        # En SQLite no existe ALTER COLUMN DROP NOT NULL. Se verifica y migra la estructura si es necesario.
        try:
            with engine.connect() as check_conn:
                raw_c = check_conn.connection
                cur = raw_c.cursor()
                cur.execute("PRAGMA table_info(dispatch_guides)")
                dg_cols = cur.fetchall()
                d_col = next((c for c in dg_cols if c[1] == 'driver_name'), None)
                if d_col and d_col[3] == 1:
                    cur.execute("PRAGMA foreign_keys=OFF")
                    cur.execute("""
                        CREATE TABLE dispatch_guides_new (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            guide_number VARCHAR(50) UNIQUE,
                            project_id INTEGER REFERENCES projects(id),
                            client_id INTEGER REFERENCES clients(id),
                            recipient_name VARCHAR(255),
                            transfer_reason VARCHAR(255),
                            is_freeform BOOLEAN DEFAULT 0,
                            guide_type VARCHAR(50) DEFAULT 'traslado_externo',
                            delivered_by_staff VARCHAR(150),
                            received_by_staff VARCHAR(150),
                            dispatch_date DATETIME,
                            destination_address VARCHAR(255),
                            destination_plant VARCHAR(150),
                            transport_type VARCHAR(50),
                            asset_id INTEGER REFERENCES assets(id),
                            carrier_company VARCHAR(150),
                            driver_name VARCHAR(150),
                            driver_id_doc VARCHAR(50),
                            driver_phone VARCHAR(50),
                            vehicle_model VARCHAR(100),
                            vehicle_plate VARCHAR(50),
                            freight_cost_usd FLOAT DEFAULT 0.0,
                            freight_price_charged_usd FLOAT DEFAULT 0.0,
                            payable_id INTEGER REFERENCES accounts_payable(id),
                            receivable_id INTEGER REFERENCES accounts_receivable(id),
                            status VARCHAR(50),
                            quality_inspector VARCHAR(150),
                            dispatcher_name VARCHAR(150),
                            received_by_client_name VARCHAR(150),
                            received_by_client_id_doc VARCHAR(50),
                            reception_date DATETIME,
                            notes TEXT,
                            created_at DATETIME
                        )
                    """)
                    cur.execute("PRAGMA table_info(dispatch_guides_new)")
                    new_cols = [c[1] for c in cur.fetchall()]
                    old_names = [c[1] for c in dg_cols]
                    shared_cols = [c for c in new_cols if c in old_names]
                    cols_str = ', '.join(f'"{c}"' for c in shared_cols)
                    cur.execute(f"INSERT INTO dispatch_guides_new ({cols_str}) SELECT {cols_str} FROM dispatch_guides")
                    cur.execute("DROP TABLE dispatch_guides")
                    cur.execute("ALTER TABLE dispatch_guides_new RENAME TO dispatch_guides")
                    cur.execute("CREATE UNIQUE INDEX IF NOT EXISTS ix_dispatch_guides_guide_number ON dispatch_guides (guide_number)")
                    cur.execute("CREATE INDEX IF NOT EXISTS ix_dispatch_guides_id ON dispatch_guides (id)")
                    cur.execute("CREATE INDEX IF NOT EXISTS idx_dispatch_asset_id ON dispatch_guides (asset_id)")
                    raw_c.commit()
                    cur.execute("PRAGMA foreign_keys=ON")
        except Exception:
            pass

    for stmt in extra_stmts:
        try:
            with engine.begin() as isolated_conn:
                isolated_conn.execute(text(stmt))
        except Exception:
            pass

    # Normalización de códigos de clientes (MDCLI-001 -> CLI-001, MDCLI-002 -> CLI-002)
    try:
        with engine.begin() as conn:
            conn.execute(text("UPDATE clients SET code = 'CLI-001' WHERE code = 'MDCLI-001'"))
            conn.execute(text("UPDATE clients SET code = 'CLI-002' WHERE code = 'MDCLI-002'"))
    except Exception:
        pass

    # Migración de resguardo permanente de comprobantes en disco a Base64 en PostgreSQL
    try:
        import base64
        with engine.begin() as conn:
            rows = conn.execute(text("SELECT id, receipt_image_path FROM expenses WHERE receipt_image_path LIKE '/uploads/%'")).fetchall()
            for r in rows:
                exp_id, rpath = r[0], r[1]
                local_fname = rpath.replace("/uploads/", "")
                local_fpath = os.path.join(settings.UPLOAD_DIR, local_fname)
                if os.path.exists(local_fpath):
                    with open(local_fpath, "rb") as f_img:
                        b = f_img.read()
                        mime = "application/pdf" if local_fname.lower().endswith(".pdf") else "image/jpeg"
                        b64_url = f"data:{mime};base64,{base64.b64encode(b).decode('ascii')}"
                        conn.execute(text("UPDATE expenses SET receipt_image_path = :b64 WHERE id = :id"), {"b64": b64_url, "id": exp_id})
    except Exception as mig_img_err:
        print(f"--> Warning during receipt image migration: {mig_img_err}")

    db = SessionLocal()
    try:
        print("--> Verifying and synchronizing Dalor SIGO-P Database...")

        # 0. Roles del Sistema y Catálogo de Permisos
        import json
        if db.query(func.count(Role.id)).scalar() == 0:
            print("--> Seeding default system roles...")
            roles_seed = [
                Role(
                    name="director_general",
                    display_name="👑 Director General / Socio",
                    description="Acceso irrestricto a todos los módulos, auditoría forense, aprobación y configuración.",
                    permissions_json=json.dumps({
                        "comercial": {"view": True, "create": True, "edit": True, "delete": True},
                        "proyectos": {"view": True, "create": True, "edit": True, "delete": True, "cpi_spi": True},
                        "finanzas": {"view": True, "create": True, "edit": True, "payments": True, "partners": True},
                        "gastos": {"view": True, "ocr": True, "approve": True, "reject": True, "delete": True},
                        "recursos": {"view": True, "dispatch": True, "manage_fleet": True, "manage_materials": True},
                        "mantenimiento": {"view": True, "users": True, "roles": True, "audit": True, "reset": True}
                    }),
                    is_system=True
                ),
                Role(
                    name="administrador_financiero",
                    display_name="💼 Administración & Finanzas",
                    description="Gestión completa de CxC, CxP, bancos, auditoría de comprobantes y flujo de caja.",
                    permissions_json=json.dumps({
                        "comercial": {"view": True, "create": True, "edit": True, "delete": False},
                        "proyectos": {"view": True, "create": False, "edit": False, "delete": False, "cpi_spi": True},
                        "finanzas": {"view": True, "create": True, "edit": True, "payments": True, "partners": False},
                        "gastos": {"view": True, "ocr": True, "approve": True, "reject": True, "delete": False},
                        "recursos": {"view": True, "dispatch": True, "manage_fleet": False, "manage_materials": True},
                        "mantenimiento": {"view": True, "users": False, "roles": False, "audit": True, "reset": False}
                    }),
                    is_system=True
                ),
                Role(
                    name="ingeniero_obra",
                    display_name="📐 Ingeniero Residente / Obras",
                    description="Planificación técnica, EDT/WBS, requisición de materiales y seguimiento de avance.",
                    permissions_json=json.dumps({
                        "comercial": {"view": True, "create": True, "edit": False, "delete": False},
                        "proyectos": {"view": True, "create": True, "edit": True, "delete": False, "cpi_spi": True},
                        "finanzas": {"view": False, "create": False, "edit": False, "payments": False, "partners": False},
                        "gastos": {"view": True, "ocr": True, "approve": False, "reject": False, "delete": False},
                        "recursos": {"view": True, "dispatch": True, "manage_fleet": False, "manage_materials": False},
                        "mantenimiento": {"view": False, "users": False, "roles": False, "audit": False, "reset": False}
                    }),
                    is_system=True
                ),
                Role(
                    name="supervisor_campo",
                    display_name="👷 Supervisor de Campo / Faena",
                    description="Captura OCR móvil de comprobantes, reporte de gastos y recepción de materiales.",
                    permissions_json=json.dumps({
                        "comercial": {"view": False, "create": False, "edit": False, "delete": False},
                        "proyectos": {"view": True, "create": False, "edit": False, "delete": False, "cpi_spi": False},
                        "finanzas": {"view": False, "create": False, "edit": False, "payments": False, "partners": False},
                        "gastos": {"view": True, "ocr": True, "approve": False, "reject": False, "delete": False},
                        "recursos": {"view": True, "dispatch": False, "manage_fleet": False, "manage_materials": False},
                        "mantenimiento": {"view": False, "users": False, "roles": False, "audit": False, "reset": False}
                    }),
                    is_system=True
                ),
                Role(
                    name="almacenista",
                    display_name="📦 Custodio de Almacén & Pañol",
                    description="Control de existencias de materiales, herramientas, guías de despacho y transferencias.",
                    permissions_json=json.dumps({
                        "comercial": {"view": False, "create": False, "edit": False, "delete": False},
                        "proyectos": {"view": True, "create": False, "edit": False, "delete": False, "cpi_spi": False},
                        "finanzas": {"view": False, "create": False, "edit": False, "payments": False, "partners": False},
                        "gastos": {"view": False, "ocr": False, "approve": False, "reject": False, "delete": False},
                        "recursos": {"view": True, "dispatch": True, "manage_fleet": True, "manage_materials": True},
                        "mantenimiento": {"view": False, "users": False, "roles": False, "audit": False, "reset": False}
                    }),
                    is_system=True
                )
            ]
            for r in roles_seed:
                db.add(r)
            db.commit()

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
        if db.query(func.count(Personnel.id)).scalar() < 15:
            print("--> Synchronizing complete 15-member operational personnel roster...")
            # Keep existing IDs or clean and insert full roster
            existing_codes = {p.code for p in db.query(Personnel.code).all()}
            full_roster = [
                Personnel(code="PERS-001", full_name="Robert Rodríguez", role_title="", identification_id="V-18450123", phone="0414-1234567", status="disponible_base", current_location="Sede Central Dalor (Guacara)", roster_type="guacara_fijo"),
                Personnel(code="PERS-002", full_name="Carlos Hurtado", role_title="", identification_id="V-16982341", phone="0412-9876543", status="disponible_base", current_location="Sede Central Dalor (Guacara)", roster_type="guacara_fijo"),
                Personnel(code="PERS-003", full_name="Julio Saavedra", role_title="", identification_id="V-20114562", phone="0414-5558899", status="disponible_base", current_location="Sede Central Dalor (Guacara)", roster_type="guacara_fijo"),
                Personnel(code="PERS-004", full_name="Vicente Rodríguez", role_title="", identification_id="V-15332901", phone="0424-7778899", status="disponible_base", current_location="Sede Central Dalor (Guacara)", roster_type="guacara_fijo"),
                Personnel(code="PERS-005", full_name="Hender Rodríguez", role_title="", identification_id="V-19345612", phone="0414-3334455", status="disponible_base", current_location="Sede Central Dalor (Guacara)", roster_type="guacara_fijo"),
                Personnel(code="PERS-006", full_name="Herby Rodríguez", role_title="", identification_id="V-21098432", phone="0412-6667788", status="disponible_base", current_location="Sede Central Dalor (Guacara)", roster_type="guacara_fijo"),
                Personnel(code="PERS-007", full_name="Eliú Suárez", role_title="", identification_id="V-17849201", phone="0424-1112233", status="disponible_base", current_location="Sede Central Dalor (Guacara)", roster_type="guacara_fijo"),
                Personnel(code="PERS-008", full_name="Danny Chaparro", role_title="", identification_id="V-22119045", phone="0416-9990011", status="disponible_base", current_location="Sede Central Dalor (Guacara)", roster_type="guacara_fijo"),
                Personnel(code="PERS-009", full_name="Ernesto Chaparro", role_title="", identification_id="V-24558912", phone="0414-8889900", status="disponible_base", current_location="Sede Central Dalor (Guacara)", roster_type="guacara_fijo"),
                Personnel(code="PERS-010", full_name="Mervis Parra", role_title="", identification_id="V-18776234", phone="0412-4445566", status="disponible_base", current_location="Sede Central Dalor (Guacara)", roster_type="guacara_fijo"),
                Personnel(code="PERS-011", full_name="Paola Garay", role_title="", identification_id="V-20334891", phone="0414-2223344", status="disponible_base", current_location="Sede Central Dalor (Guacara)", roster_type="guacara_fijo"),
                Personnel(code="PERS-012", full_name="Geraldine Páez", role_title="", identification_id="V-23450912", phone="0424-5556677", status="disponible_base", current_location="Sede Central Dalor (Guacara)", roster_type="guacara_fijo"),
                Personnel(code="PERS-013", full_name="Eleonora Galetti", role_title="", identification_id="V-19882314", phone="0412-1110099", status="disponible_base", current_location="Sede Central Dalor (Guacara)", roster_type="guacara_fijo"),
                Personnel(code="PERS-014", full_name="José Gregorio Mendoza", role_title="", identification_id="V-14998231", phone="0416-3332211", status="disponible_base", current_location="Sede Central Dalor (Guacara)", roster_type="guacara_fijo"),
                Personnel(code="PERS-015", full_name="Wilmer Albornoz", role_title="", identification_id="V-16773412", phone="0414-7776655", status="disponible_base", current_location="Sede Central Dalor (Guacara)", roster_type="guacara_fijo")
            ]
            for p in full_roster:
                if p.code not in existing_codes:
                    db.add(p)
                else:
                    existing = db.query(Personnel).filter(Personnel.code == p.code).first()
                    if existing:
                        existing.full_name = p.full_name
                        existing.role_title = ""
            db.query(Personnel).filter(
                (Personnel.full_name.ilike("%prueba%")) |
                (Personnel.full_name.ilike("%test%")) |
                (Personnel.code.ilike("%prueba%")) |
                (Personnel.code.ilike("%test%")) |
                (Personnel.code == "per 001") |
                (Personnel.code == "PERS-999")
            ).delete(synchronize_session=False)
            db.query(Personnel).update({"role_title": ""})
            db.commit()

        # 3. Assets, Heavy Machinery, Welding Rigs & Vehicles (Ensure real Dalor fleet & tools loaded)
        if db.query(func.count(Asset.id)).scalar() < 916:
            print("--> Seeding complete industrial catalog of tools, machinery, and vehicles (916 items)...")
            # 8 Vehículos Oficiales DALOR C.A. (Extracción certificada de VEHICULOS.xlsx)
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
                existing_v = db.query(Asset).filter(Asset.asset_code == v["code"]).first()
                if not existing_v:
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
                        current_location="Sede Central Dalor (Guacara)",
                        status="disponible_base",
                        is_active=True
                    ))
                else:
                    existing_v.is_active = True
                    existing_v.status = "disponible_base"
                    existing_v.current_location = "Sede Central Dalor (Guacara)"

            # Cargar herramientas y equipos desde clean_tools.json si existe
            tools_json_paths = [
                "/app/backend/clean_tools.json",
                "/app/backend/app/data/clean_tools.json",
                "/app/clean_tools.json",
                os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "clean_tools.json"),
                os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "clean_tools.json"),
                os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "backend", "clean_tools.json"),
                os.path.join(os.getcwd(), "clean_tools.json"),
                os.path.join(os.getcwd(), "backend", "clean_tools.json"),
                os.path.join(os.getcwd(), "backend", "app", "data", "clean_tools.json"),
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
                            if code:
                                existing_t = db.query(Asset).filter(Asset.asset_code == code).first()
                                if not existing_t:
                                    db.add(Asset(
                                        asset_code=code,
                                        name=t.get("name"),
                                        asset_type=t.get("asset_type", "herramienta"),
                                        brand=t.get("brand"),
                                        model=t.get("model"),
                                        serial_number=t.get("serial_number"),
                                        status="disponible_base",
                                        current_location=t.get("location", "Sede Central Dalor (Guacara)"),
                                        current_odometer=0.0,
                                        last_service_odometer=0.0,
                                        is_active=True
                                    ))
                                else:
                                    existing_t.is_active = True
                        loaded_tools = True
                        break
                    except Exception as e:
                        print(f"Warning loading clean_tools: {e}")

            db.commit()

                # 4. Materials & Consumables Catalog (Ensure 15 materials exist)
        if db.query(func.count(Material.id)).scalar() < 15:
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
        db.commit()

        # 5.1 Deduplicación Defensiva: Migrar y eliminar categorías con código entero redundante ('1', '2', ..., '20')
        try:
            from app.models.models import AccountPayable, Expense
            legacy_int_codes = [str(i) for i in range(1, 21)]
            legacy_cats = db.query(ExpenseCategory).filter(ExpenseCategory.code.in_(legacy_int_codes)).all()
            for leg in legacy_cats:
                official_code = f"{leg.code}.0"
                official_target = db.query(ExpenseCategory).filter(ExpenseCategory.code == official_code).first()
                if official_target:
                    # Migrar gastos
                    db.query(Expense).filter(Expense.category_id == leg.id).update(
                        {"category_id": official_target.id}, synchronize_session=False
                    )
                    # Migrar cuentas por pagar (CxP)
                    db.query(AccountPayable).filter(AccountPayable.category_id == leg.id).update(
                        {"category_id": official_target.id}, synchronize_session=False
                    )
                    # Reasignar subcategorías huérfanas
                    db.query(ExpenseCategory).filter(ExpenseCategory.parent_id == leg.id).update(
                        {"parent_id": official_target.id}, synchronize_session=False
                    )
                    db.flush()
                    db.delete(leg)
            db.commit()
        except Exception as e:
            db.rollback()
            print(f"[WARN] Error purgando categorías duplicadas: {e}")

        # 6. Clients & Corporate Directory: Ensure default client exists if empty
        oxicar = db.query(Client).filter((Client.code == "MDCLI-001") | (Client.code == "CLI-OXICAR") | (Client.code == "CLI-001")).first()
        if not oxicar:
            oxicar = Client(
                code="CLI-001",
                name="OXICAR (Oxígenos Carabobo C.A.)",
                rif="J-07509812-4",
                contact_name="Gerencia de Planta & Mantenimiento",
                contact_phone="+58 241-8710000",
                contact_email="operaciones@oxicar.com.ve",
                address="Zona Industrial Municipal Sur, Valencia, Edo. Carabobo",
                industry="Gases Industriales / Metalmecánica",
                is_active=True
            )
            db.add(oxicar)
        db.commit()

        # 7. Catalogo de Servicios / Partidas APU
        # Catálogo en blanco: No se autogeneran ni precargan partidas estándar.
        # Las partidas de servicio y APU deben ser registradas manualmente por Dalor.

        # 8. Seed de Cuentas Bancarias y Cajas Predeterminadas
        if db.query(func.count(FinancialAccount.id)).scalar() == 0:
            print("--> Seeding default financial accounts (banks & cash registers)...")
            default_accounts = [
                FinancialAccount(name="Banesco Panamá USD", account_type="usd", bank_or_provider="Banesco Panamá", is_default=True, sort_order=1),
                FinancialAccount(name="Banesco Banco Universal (Bs)", account_type="bs", bank_or_provider="Banesco Venezuela", sort_order=2),
                FinancialAccount(name="Binance USDT", account_type="usd", bank_or_provider="Binance", sort_order=3),
                FinancialAccount(name="Zelle", account_type="usd", bank_or_provider="Zelle", sort_order=4),
                FinancialAccount(name="Caja Efectivo USD", account_type="usd", bank_or_provider="Caja Interna", sort_order=5),
                FinancialAccount(name="Caja Efectivo Bs", account_type="bs", bank_or_provider="Caja Interna", sort_order=6),
            ]
            db.add_all(default_accounts)
            db.commit()

        # 8.1 Seed White-Label: Perfil Corporativo Activo (Metalmecánica Dalor, C.A.)
        try:
            from app.models.models import CompanyProfile
            active_profile = db.query(CompanyProfile).filter(CompanyProfile.is_default == True).first()
            if not active_profile:
                print("--> Seeding default corporate profile (Metalmecanica Dalor, C.A.)...")
                dalor_prof = CompanyProfile(
                    legal_name="METALMECANICA DALOR, C.A.",
                    trade_name="DALOR SIGO-P",
                    rif="J-31601195-0",
                    fiscal_address="AV CAMARA DE LAS INDUSTRIAS LOCAL GALPON NRO 10 ZONA INDUSTRIAL EL TIGRE GUACARA CARABOBO",
                    phone="+58 245-564.88.92",
                    email="metalmecanicadalorca@yahoo.com",
                    legal_base_seniat="Providencia Administrativa SNAT/2015/0049 de fecha 17/07/2015, publicada en Gaceta Oficial N° 40.720 del 10/08/2015.",
                    currency_symbol="$",
                    primary_color="#002B49",
                    secondary_color="#D4AF37",
                    is_default=True
                )
                db.add(dalor_prof)
                db.commit()
        except Exception as e_prof:
            db.rollback()
            print(f"[WARN] Error inicializando CompanyProfile: {e_prof}")

        # 8.2 Seed Histórico de Tasas BCV Oficiales (Septiembre - Octubre 2026)
        try:
            with engine.begin() as isolated_conn:
                if is_sqlite:
                    isolated_conn.execute(text("""
                        CREATE TABLE IF NOT EXISTS bcv_rate_history (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            rate_date VARCHAR(10) UNIQUE,
                            rate FLOAT NOT NULL,
                            source VARCHAR(100),
                            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                        );
                    """))
                else:
                    isolated_conn.execute(text("""
                        CREATE TABLE IF NOT EXISTS bcv_rate_history (
                            id SERIAL PRIMARY KEY,
                            rate_date VARCHAR(10) UNIQUE,
                            rate FLOAT NOT NULL,
                            source VARCHAR(100),
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                        );
                    """))
                
                # Serie oficial BCV auditada (solo se insertan fechas faltantes; nunca sobrescribe)
                bcv_rates_seed = [
                    ("2026-09-26", 855.66, "BCV Oficial (Fin de semana)"),
                    ("2026-09-27", 855.66, "BCV Oficial (Fin de semana)"),
                    ("2026-09-28", 856.80, "BCV Oficial (bcv.org.ve)"),
                    ("2026-09-29", 857.01, "BCV Oficial (bcv.org.ve)"),
                    ("2026-09-30", 859.06, "BCV Oficial (bcv.org.ve)"),
                    ("2026-10-01", 860.18, "BCV Oficial (bcv.org.ve)"),
                    ("2026-10-02", 860.18, "BCV Oficial (bcv.org.ve)"),
                    ("2026-10-03", 860.18, "BCV Oficial (Fin de semana)"),
                    ("2026-10-04", 860.18, "BCV Oficial (Fin de semana)"),
                    ("2026-10-05", 872.39, "BCV Oficial (bcv.org.ve)"),
                    ("2026-10-06", 873.87, "BCV Oficial (bcv.org.ve)"),
                    ("2026-10-07", 874.73, "BCV Oficial (bcv.org.ve)"),
                    ("2026-10-08", 875.65, "BCV Oficial (bcv.org.ve)"),
                    ("2026-10-09", 875.65, "BCV Oficial (bcv.org.ve)"),
                ]
                for r_date, r_rate, r_src in bcv_rates_seed:
                    row = isolated_conn.execute(
                        text("SELECT id FROM bcv_rate_history WHERE rate_date = :d"), {"d": r_date}
                    ).fetchone()
                    if not row:
                        isolated_conn.execute(
                            text("INSERT INTO bcv_rate_history (rate_date, rate, source) VALUES (:d, :r, :s)"),
                            {"d": r_date, "r": r_rate, "s": r_src}
                        )
                # Corrección acotada: reemplaza valores provisionales sembrados por error en el
                # primer despliegue. Solo coincide con (fecha + valor provisional exacto + origen exacto).
                _placeholder_fix = {
                    "2026-09-26": 450.25, "2026-09-27": 450.25, "2026-09-28": 452.10,
                    "2026-09-29": 455.80, "2026-09-30": 458.40, "2026-10-01": 460.15,
                    "2026-10-02": 462.50, "2026-10-03": 462.50, "2026-10-04": 462.50,
                    "2026-10-05": 465.30, "2026-10-06": 468.20, "2026-10-07": 471.90,
                    "2026-10-08": 473.40, "2026-10-09": 475.80,
                }
                for _d, _bad in _placeholder_fix.items():
                    _good = next((r for (dd, r, s) in bcv_rates_seed if dd == _d), None)
                    _src = next((s for (dd, r, s) in bcv_rates_seed if dd == _d), None)
                    if _good is not None:
                        isolated_conn.execute(
                            text("UPDATE bcv_rate_history SET rate = :g, source = :s "
                                 "WHERE rate_date = :d AND rate = :b AND source = 'BCV Oficial'"),
                            {"g": _good, "s": _src, "d": _d, "b": _bad}
                        )
        except Exception as e_bcv:
            print(f"[WARN] Error inicializando tasas BCV: {e_bcv}")

        # 9. Purga quirúrgica de registros de prueba de emergencia en producción
        try:
            with engine.begin() as isolated_conn:
                test_prj_filter = "(code = 'PRJ-2026-001' OR name LIKE '%PRUEBA DE DESARROLLO%' OR id = 104)"
                
                # 1. Liberar activos y personal asignados al proyecto de prueba
                isolated_conn.execute(text(f"""
                    UPDATE assets 
                    SET current_project_id = NULL, status = 'disponible_base', current_location = 'Sede Central Dalor (Guacara)'
                    WHERE current_project_id IN (SELECT id FROM projects WHERE {test_prj_filter});
                    
                    UPDATE personnel 
                    SET current_project_id = NULL, status = 'disponible_base', current_location = 'Sede Central Dalor (Guacara)'
                    WHERE current_project_id IN (SELECT id FROM projects WHERE {test_prj_filter});
                """))

                # 2. Desvincular alquileres y préstamos de activos del proyecto
                isolated_conn.execute(text(f"""
                    DELETE FROM asset_rentals_loans 
                    WHERE project_id IN (SELECT id FROM projects WHERE {test_prj_filter});
                """))

                # 3. Eliminar pagos financieros vinculados a CxC o CxP del proyecto de prueba
                isolated_conn.execute(text(f"""
                    DELETE FROM financial_payments 
                    WHERE receivable_id IN (
                        SELECT id FROM accounts_receivable 
                        WHERE invoice_number IN ('FAC-2026-001', 'FAC-2026-002', 'ANT-CLI-23-01')
                           OR project_id IN (SELECT id FROM projects WHERE {test_prj_filter})
                    )
                    OR payable_id IN (
                        SELECT id FROM accounts_payable 
                        WHERE project_id IN (SELECT id FROM projects WHERE {test_prj_filter})
                    );
                """))

                # 4. Eliminar Cuentas por Cobrar (CxC) de prueba
                isolated_conn.execute(text(f"""
                    DELETE FROM accounts_receivable 
                    WHERE invoice_number IN ('FAC-2026-001', 'FAC-2026-002', 'ANT-CLI-23-01')
                       OR project_id IN (SELECT id FROM projects WHERE {test_prj_filter});
                """))

                # 5. Eliminar Cuentas por Pagar (CxP / Compras) del proyecto de prueba
                isolated_conn.execute(text(f"""
                    DELETE FROM accounts_payable 
                    WHERE project_id IN (SELECT id FROM projects WHERE {test_prj_filter});
                """))

                # 6. Eliminar requisiciones de materiales del proyecto de prueba
                isolated_conn.execute(text(f"""
                    DELETE FROM project_material_requisitions 
                    WHERE project_id IN (SELECT id FROM projects WHERE {test_prj_filter});
                """))

                # 7. Eliminar adendas de contrato del proyecto de prueba
                isolated_conn.execute(text(f"""
                    DELETE FROM project_addendums 
                    WHERE project_id IN (SELECT id FROM projects WHERE {test_prj_filter});
                """))

                # 8. Eliminar guías de despacho e ítems de guías del proyecto de prueba
                isolated_conn.execute(text(f"""
                    DELETE FROM dispatch_guide_items 
                    WHERE dispatch_guide_id IN (
                        SELECT id FROM dispatch_guides 
                        WHERE project_id IN (SELECT id FROM projects WHERE {test_prj_filter})
                    );
                    DELETE FROM dispatch_guides 
                    WHERE project_id IN (SELECT id FROM projects WHERE {test_prj_filter});
                """))

                # 9. Eliminar gastos, movimientos de inventario, fases y bitácora de asignación
                isolated_conn.execute(text(f"""
                    DELETE FROM expenses WHERE project_id IN (SELECT id FROM projects WHERE {test_prj_filter});
                    DELETE FROM material_movements WHERE project_id IN (SELECT id FROM projects WHERE {test_prj_filter});
                    DELETE FROM project_phases WHERE project_id IN (SELECT id FROM projects WHERE {test_prj_filter});
                    DELETE FROM resource_assignment_history WHERE project_id IN (SELECT id FROM projects WHERE {test_prj_filter});
                """))

                # 10. Eliminar cotización de prueba COT-2026-0001 y sus renglones
                isolated_conn.execute(text("""
                    DELETE FROM quotation_items 
                    WHERE quotation_id IN (SELECT id FROM quotations WHERE quote_number = 'COT-2026-0001');
                    DELETE FROM quotations 
                    WHERE quote_number = 'COT-2026-0001';
                """))

                # 11. Eliminar el proyecto padre PRJ-2026-001
                isolated_conn.execute(text(f"""
                    DELETE FROM projects 
                    WHERE {test_prj_filter};
                """))

                # 12. Eliminar partida APU de prueba APU-001
                isolated_conn.execute(text("""
                    DELETE FROM service_items 
                    WHERE code = 'APU-001' OR description LIKE '%PRUEBA DE DESARROLLO%';
                """))

                # 13. Eliminar clientes de prueba si no tienen proyectos reales
                isolated_conn.execute(text("""
                    DELETE FROM clients 
                    WHERE name IN ('JESUS GALLARDO', 'MENYERBER GALLARDO')
                      AND id NOT IN (SELECT DISTINCT client_id FROM projects WHERE client_id IS NOT NULL);
                """))
        except Exception as e_purge:
            print(f"--> [INFO] Rutina de purga preventiva de pruebas: {e_purge}")

        print("--> Dalor SIGO-P Database successfully verified & synced!")
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
    finally:
        db.close()
