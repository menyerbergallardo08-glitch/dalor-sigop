from datetime import datetime
from app.core.database import SessionLocal, engine, Base
from app.core.security import get_password_hash
from app.models.models import (
    User, Client, Project, Asset, Personnel, Material,
    ExpenseCategory, CostCenter
)

def init_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # Check if already seeded
        if db.query(User).first():
            db.close()
            return

        print("--> Initializing Dalor SIGO-P Database with clean corporate data...")

        # 1. Official Users
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
                username="administracion",
                full_name="Administración & Finanzas",
                email="admin@dalor.com.ve",
                hashed_password=get_password_hash("admin2026"),
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
        ]
        db.add_all(users)
        db.commit()

        # 2. Expense Categories
        categories = [
            ExpenseCategory(code="1.0", name="Nómina Base Sede Central", group_type="nomina_guacara", monthly_budget_usd=4500.0),
            ExpenseCategory(code="2.0", name="Impuestos Municipales", group_type="impuestos", monthly_budget_usd=500.0),
            ExpenseCategory(code="3.0", name="Consumibles Oficina & Papelería", group_type="corporativo", monthly_budget_usd=250.0),
            ExpenseCategory(code="4.0", name="Consumibles & Dotación Taller Central", group_type="corporativo", monthly_budget_usd=500.0),
            ExpenseCategory(code="5.0", name="Tributos SENIAT (IVA)", group_type="impuestos", monthly_budget_usd=500.0),
            ExpenseCategory(code="6.0", name="Tributos SENIAT (ISLR)", group_type="impuestos", monthly_budget_usd=300.0),
            ExpenseCategory(code="7.0", name="Aportes Parafiscales (IVSS / BANAVIH / INCES)", group_type="impuestos", monthly_budget_usd=250.0),
            ExpenseCategory(code="8.0", name="Honorarios Profesionales & Asesorías", group_type="corporativo", monthly_budget_usd=800.0),
            ExpenseCategory(code="9.0", name="Inversión / Reposición de Bienes de Capital", group_type="corporativo", monthly_budget_usd=1000.0),
            ExpenseCategory(code="10.0", name="Servicios Básicos & Conectividad", group_type="servicios", monthly_budget_usd=2500.0),
            ExpenseCategory(code="11.0", name="Combustible y Peajes de Flota", group_type="operativo_campo", monthly_budget_usd=1200.0),
            ExpenseCategory(code="12.0", name="Mantenimiento Preventivo y Correctivo de Flota", group_type="operativo_campo", monthly_budget_usd=800.0),
            ExpenseCategory(code="13.0", name="Nómina Operativa de Proyecto (Campo)", group_type="nomina_proyecto", monthly_budget_usd=3500.0),
            ExpenseCategory(code="14.0", name="Viáticos, Hospedaje y Logística de Campo", group_type="operativo_campo", monthly_budget_usd=1500.0),
            ExpenseCategory(code="15.0", name="Materiales e Insumos Metalmecánicos Directos", group_type="operativo_campo", monthly_budget_usd=5000.0),
            ExpenseCategory(code="16.0", name="Subcontratos y Servicios Especializados Externos", group_type="operativo_campo", monthly_budget_usd=3000.0),
            ExpenseCategory(code="17.0", name="Alquiler de Maquinaria y Equipos Pesados", group_type="operativo_campo", monthly_budget_usd=2000.0),
            ExpenseCategory(code="18.0", name="Seguridad Industrial, EPP y Certificaciones", group_type="operativo_campo", monthly_budget_usd=600.0),
            ExpenseCategory(code="19.0", name="Fletes, Transporte y Logística de Carga Pesada", group_type="operativo_campo", monthly_budget_usd=1000.0),
            ExpenseCategory(code="20.0", name="Gastos Varios No Deducibles / Imprevistos", group_type="otros", monthly_budget_usd=500.0),
        ]
        db.add_all(categories)

        # 3. Cost Centers
        cost_centers = [
            CostCenter(code="CC-CORP", name="Sede Central Guacara / Corporativo", description="Costos fijos administrativos"),
            CostCenter(code="CC-PROJ", name="Centro Operativo de Proyectos Metalmecánicos", description="Costos directos de ejecución de obras"),
            CostCenter(code="CC-TALLER", name="Taller y Fabricación de Estructuras", description="Operaciones de fabricación interna"),
        ]
        db.add_all(cost_centers)

        # 4. Dalor Vehicles
        vehicles = [
            Asset(asset_code="VEH-01", name="Camión Chuto Mack Granite", asset_type="vehiculo", brand="Mack", model="Granite 2018", license_plate="A12BC34", current_odometer=142000, current_location="Sede Central", status="disponible_base"),
            Asset(asset_code="VEH-02", name="Batea 3 Ejes Plataforma Carga", asset_type="vehiculo", brand="Randon", model="Plataforma 13.5m", license_plate="B56CD78", current_odometer=85000, current_location="Sede Central", status="disponible_base"),
            Asset(asset_code="VEH-03", name="Camión Grúa Ford F-750 Brazo Telescópico", asset_type="vehiculo", brand="Ford / Hiab", model="F-750 12T", license_plate="C90EF12", current_odometer=118000, current_location="Sede Central", status="disponible_base"),
            Asset(asset_code="VEH-04", name="Camión 350 Super Duty Plataforma", asset_type="vehiculo", brand="Ford", model="F-350 Tritón", license_plate="D34GH56", current_odometer=195000, current_location="Sede Central", status="disponible_base"),
            Asset(asset_code="VEH-05", name="Camión 350 Chevrolet C-30 Estacas", asset_type="vehiculo", brand="Chevrolet", model="C-30 Heavy Duty", license_plate="E78IJ90", current_odometer=240000, current_location="Sede Central", status="disponible_base"),
            Asset(asset_code="VEH-06", name="Camioneta Pick-up Toyota Hilux 4x4", asset_type="vehiculo", brand="Toyota", model="Hilux Doble Cabina", license_plate="F12KL34", current_odometer=165000, current_location="Sede Central", status="disponible_base"),
            Asset(asset_code="VEH-07", name="Camioneta Pick-up Ford Ranger 4x4", asset_type="vehiculo", brand="Ford", model="Ranger XLT", license_plate="G56MN78", current_odometer=132000, current_location="Sede Central", status="disponible_base"),
            Asset(asset_code="VEH-08", name="Montacargas Industrial TCM 3.5 Toneladas", asset_type="maquinaria", brand="TCM", model="FD35T", serial_number="TCM-88231", current_odometer=4200, current_location="Sede Central", status="disponible_base"),
            Asset(asset_code="VEH-09", name="Generador Eléctrico Móvil Diésel 150 kVA", asset_type="maquinaria", brand="Cummins", model="C150D5", serial_number="CUM-44910", current_odometer=1850, current_location="Sede Central", status="disponible_base"),
        ]
        db.add_all(vehicles)

        # 5. Industrial Machinery, Welding Rigs & Heavy Tools (Catalog)
        tools = [
            Asset(asset_code="EQ-SOL-01", name="Máquina de Soldar Miller Big Blue 500X Diésel", asset_type="maquinaria", brand="Miller", model="Big Blue 500X", serial_number="MIL-5501", current_location="Sede Central", status="disponible_base"),
            Asset(asset_code="EQ-SOL-02", name="Máquina de Soldar Lincoln Ranger 305D", asset_type="maquinaria", brand="Lincoln Electric", model="Ranger 305D", serial_number="LNC-3051", current_location="Sede Central", status="disponible_base"),
            Asset(asset_code="EQ-SOL-03", name="Soldadora Inversora Miller Multiproceso 350A", asset_type="herramienta_mayor", brand="Miller", model="XMT 350 CC/CV", serial_number="MIL-XMT-1", current_location="Sede Central", status="disponible_base"),
            Asset(asset_code="EQ-SOL-04", name="Soldadora Inversora Lincoln Invertec V350-Pro", asset_type="herramienta_mayor", brand="Lincoln Electric", model="V350-PRO", serial_number="LNC-INV-1", current_location="Sede Central", status="disponible_base"),
            Asset(asset_code="EQ-COR-01", name="Equipo de Oxicorte Completo con Reguladores Victor y Carro", asset_type="herramienta_mayor", brand="Victor", model="Medalist 350", serial_number="VIC-OXI-01", current_location="Sede Central", status="disponible_base"),
            Asset(asset_code="EQ-COR-02", name="Equipo de Oxicorte Portátil con Cilindros", asset_type="herramienta_mayor", brand="Harris", model="Port-A-Torch", serial_number="HAR-OXI-02", current_location="Sede Central", status="disponible_base"),
            Asset(asset_code="EQ-COR-03", name="Cortadora de Plasma Hypertherm Powermax 85A", asset_type="herramienta_mayor", brand="Hypertherm", model="Powermax 85", serial_number="HYP-85-01", current_location="Sede Central", status="disponible_base"),
            Asset(asset_code="EQ-CMP-01", name="Compresor de Aire Diésel Sullair 185 CFM Remolcable", asset_type="maquinaria", brand="Sullair", model="185 T4F", serial_number="SUL-185-01", current_location="Sede Central", status="disponible_base"),
            Asset(asset_code="EQ-SAN-01", name="Tolva de Sandblasting 600 lbs con Manguera y Boquilla Venturi", asset_type="herramienta_mayor", brand="Clemco", model="Classic 600", serial_number="CLM-600-01", current_location="Sede Central", status="disponible_base"),
            Asset(asset_code="EQ-AIR-01", name="Bomba de Pintura Airless Graco King 60:1 Neumática", asset_type="herramienta_mayor", brand="Graco", model="King Xtreme 60:1", serial_number="GRC-601-01", current_location="Sede Central", status="disponible_base"),
            Asset(asset_code="HR-ESM-01", name="Esmeril Angular 9\" Bosch GWS 22-230 Heavy Duty (x4)", asset_type="herramienta_mayor", brand="Bosch", model="GWS 22-230", serial_number="BSH-9-SET1", current_location="Sede Central", status="disponible_base"),
            Asset(asset_code="HR-ESM-02", name="Esmeril Angular 4-1/2\" DeWalt DWE4020 (x6)", asset_type="herramienta_menor", brand="DeWalt", model="DWE4020", serial_number="DWT-45-SET1", current_location="Sede Central", status="disponible_base"),
            Asset(asset_code="HR-TAL-01", name="Taladro Magnético Industrial Euroboor ECO 50", asset_type="herramienta_mayor", brand="Euroboor", model="ECO.50+", serial_number="EUR-ECO-50", current_location="Sede Central", status="disponible_base"),
            Asset(asset_code="HR-ROT-01", name="Rotomartillo SDS-Max Bosch GBH 8-45 D", asset_type="herramienta_mayor", brand="Bosch", model="GBH 8-45 D", serial_number="BSH-ROTO-01", current_location="Sede Central", status="disponible_base"),
            Asset(asset_code="HR-IZA-01", name="Señorita / Tecle de Cadena Manual 5 Ton Yale (x2)", asset_type="herramienta_mayor", brand="Yale", model="Yalelift 360 5T", serial_number="YAL-5T-SET1", current_location="Sede Central", status="disponible_base"),
            Asset(asset_code="HR-IZA-02", name="Señorita / Tecle de Palanca (Tirfor / Ratchet) 3 Ton Harrington (x3)", asset_type="herramienta_mayor", brand="Harrington", model="LB 3T", serial_number="HAR-3T-SET1", current_location="Sede Central", status="disponible_base"),
            Asset(asset_code="HR-GAT-01", name="Gatos Hidráulicos Tipo Botella 20 Toneladas (Juego x4)", asset_type="herramienta_mayor", brand="Enerpac", model="GB-20T", serial_number="ENR-20T-SET", current_location="Sede Central", status="disponible_base"),
            Asset(asset_code="HR-TOR-01", name="Torquímetro Industrial 1\" Proto 100-600 ft-lb con Calibración", asset_type="herramienta_mayor", brand="Proto", model="J6014C", serial_number="PRT-TORQ-01", current_location="Sede Central", status="disponible_base"),
        ]
        db.add_all(tools)

        # 6. Raw Materials & Consumables Catalog
        materials = [
            Material(code="MAT-PLA-01", name="Plancha de Acero ASTM A36 12mm x 2.44m x 6.00m", category="Planchas de Acero", unit_of_measure="Planchas", current_stock=18.0, minimum_stock=5.0, average_unit_cost_usd=480.0),
            Material(code="MAT-PLA-02", name="Plancha de Acero ASTM A36 6mm x 2.44m x 6.00m", category="Planchas de Acero", unit_of_measure="Planchas", current_stock=24.0, minimum_stock=6.0, average_unit_cost_usd=245.0),
            Material(code="MAT-PLA-03", name="Plancha Antidesgaste Hardox 450 10mm x 2m x 6m", category="Planchas de Acero", unit_of_measure="Planchas", current_stock=8.0, minimum_stock=2.0, average_unit_cost_usd=1350.0),
            Material(code="MAT-VIG-01", name="Viga Estructural IPE 200 x 12 metros", category="Perfiles y Vigas", unit_of_measure="Barras", current_stock=32.0, minimum_stock=10.0, average_unit_cost_usd=310.0),
            Material(code="MAT-VIG-02", name="Viga Estructural HEA 240 x 12 metros", category="Perfiles y Vigas", unit_of_measure="Barras", current_stock=14.0, minimum_stock=4.0, average_unit_cost_usd=590.0),
            Material(code="MAT-TUB-01", name="Tubo de Acero al Carbono Sin Costura ASTM A106 Gr.B 4\" SCH 40 (6m)", category="Tuberías y Bridas", unit_of_measure="Tubos", current_stock=45.0, minimum_stock=15.0, average_unit_cost_usd=145.0),
            Material(code="MAT-TUB-02", name="Tubo de Acero al Carbono ASTM A53 6\" SCH 80 (6m)", category="Tuberías y Bridas", unit_of_measure="Tubos", current_stock=20.0, minimum_stock=8.0, average_unit_cost_usd=260.0),
            Material(code="MAT-SOL-01", name="Electrodos de Soldadura E-7018 1/8\" (Caja 20 Kg)", category="Soldadura y Gases", unit_of_measure="Cajas", current_stock=65.0, minimum_stock=20.0, average_unit_cost_usd=55.0),
            Material(code="MAT-SOL-02", name="Electrodos de Soldadura E-6010 / E-6013 1/8\" (Caja 20 Kg)", category="Soldadura y Gases", unit_of_measure="Cajas", current_stock=40.0, minimum_stock=15.0, average_unit_cost_usd=48.0),
            Material(code="MAT-SOL-03", name="Alambre Tubular para Soldadura MIG/FCAW E71T-1 0.045\" (Rollo 15 Kg)", category="Soldadura y Gases", unit_of_measure="Rollos", current_stock=28.0, minimum_stock=10.0, average_unit_cost_usd=62.0),
            Material(code="MAT-ABR-01", name="Discos de Corte Abrasivo 9\" x 1/8\" x 7/8\" para Acero (Caja 25 Und)", category="Abrasivos y Discos", unit_of_measure="Cajas", current_stock=35.0, minimum_stock=10.0, average_unit_cost_usd=42.0),
            Material(code="MAT-ABR-02", name="Discos de Desbaste 7\" x 1/4\" x 7/8\" (Caja 20 Und)", category="Abrasivos y Discos", unit_of_measure="Cajas", current_stock=25.0, minimum_stock=8.0, average_unit_cost_usd=38.0),
            Material(code="MAT-REC-01", name="Pintura Anticorrosiva Epóxica Poliamida Grís (Kit Galón A+B)", category="Pinturas y Recubrimientos", unit_of_measure="Kits", current_stock=42.0, minimum_stock=12.0, average_unit_cost_usd=58.0),
            Material(code="MAT-REC-02", name="Esmalte Poliuretano de Alto Brillo Blanco/Seguridad (Kit Galón)", category="Pinturas y Recubrimientos", unit_of_measure="Kits", current_stock=30.0, minimum_stock=10.0, average_unit_cost_usd=72.0),
            Material(code="MAT-ABR-03", name="Granalla de Acero / Abrasivo para Sandblasting G-40 (Saco 25 Kg)", category="Abrasivos y Discos", unit_of_measure="Sacos", current_stock=80.0, minimum_stock=25.0, average_unit_cost_usd=28.0),
        ]
        db.add_all(materials)

        # 7. Operational Personnel
        personnel = [
            Personnel(code="PER-001", full_name="Ingeniero Residente de Proyecto", role_title="Ingeniero Residente", identification_id="V-18450123", phone="+58 414-1234567", status="disponible_base", current_location="Sede Central", roster_type="guacara_fijo"),
            Personnel(code="PER-002", full_name="Supervisor de Soldadura y Montaje CWI", role_title="Supervisor de Obra", identification_id="V-16982341", phone="+58 412-9876543", status="disponible_base", current_location="Sede Central", roster_type="guacara_fijo"),
            Personnel(code="PER-003", full_name="Custodio y Despachador de Almacén Central", role_title="Custodio de Almacén", identification_id="V-20114562", phone="+58 416-5551234", status="disponible_base", current_location="Sede Central", roster_type="guacara_fijo"),
            Personnel(code="PER-004", full_name="Conductor de Carga Pesada y Equipos", role_title="Chofer / Conductor", identification_id="V-15332901", phone="+58 424-7778899", status="disponible_base", current_location="Sede Central", roster_type="guacara_fijo"),
        ]
        db.add_all(personnel)

        # 8. Client & Active Project
        client = Client(
            code="CLI-CORPOELEC",
            name="CORPOELEC INDUSTRIAL / PDVSA",
            rif="J-30004567-8",
            contact_name="Gerencia de Proyectos Mayores",
            contact_phone="+58 212-5071111",
            contact_email="proyectos@corpoelec.gob.ve",
            address="Av. Sanz, Edif. Corpoelec, Caracas",
            industry="Energía y Petróleo"
        )
        db.add(client)
        db.flush()

        project = Project(
            code="DAL-2026-001",
            name="Mantenimiento Mayor de Estructuras y Calderas Planta Centro",
            client_id=client.id,
            client_name=client.name,
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
        print("--> Dalor SIGO-P Database successfully initialized and seeded!")
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
    finally:
        db.close()
