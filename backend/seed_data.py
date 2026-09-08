from datetime import datetime, timedelta
from app.core.database import SessionLocal, engine, Base
from app.models.category import ExpenseCategory
from app.models.personnel import Personnel
from app.models.asset import Asset, MaintenanceRecord, AssetAssignment
from app.models.project import Project, CostCenter
from app.models.expense import ExpenseEntry

def seed_dalor_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Si ya hay datos, no duplicar
    if db.query(ExpenseCategory).first():
        print("Base de datos ya inicializada. Omitiendo seed.")
        db.close()
        return

    print("Inicializando Catálogo de Gastos DALOR (20 Categorías)...")

    # 1. CATEGORÍAS DE GASTO DALOR
    categories = [
        # 1. Nómina Dalor Guacara
        ExpenseCategory(code="1.0", name="Nomina Dalor Guacara", parent_code=None, group_type="nomina_guacara", is_direct_cost=False, monthly_budget_usd=4500.0),
        ExpenseCategory(code="1.1", name="Paola Garay", parent_code="1.0", group_type="nomina_guacara", is_direct_cost=False),
        ExpenseCategory(code="1.2", name="Robert Rodriguez", parent_code="1.0", group_type="nomina_guacara", is_direct_cost=False),
        ExpenseCategory(code="1.3", name="Julio Saavedra", parent_code="1.0", group_type="nomina_guacara", is_direct_cost=False),
        ExpenseCategory(code="1.4", name="Vicente Rodriguez", parent_code="1.0", group_type="nomina_guacara", is_direct_cost=False),
        ExpenseCategory(code="1.5", name="Carlos Hurtado", parent_code="1.0", group_type="nomina_guacara", is_direct_cost=False),
        ExpenseCategory(code="1.6", name="Geraldine Paez", parent_code="1.0", group_type="nomina_guacara", is_direct_cost=False),
        ExpenseCategory(code="1.7", name="Eleonora Galetti", parent_code="1.0", group_type="nomina_guacara", is_direct_cost=False),
        
        # 2. Impuestos Municipales
        ExpenseCategory(code="2.0", name="Impuestos Municipales", parent_code=None, group_type="impuestos", is_direct_cost=False, monthly_budget_usd=500.0),
        ExpenseCategory(code="2.1", name="Fisco Guacara", parent_code="2.0", group_type="impuestos"),
        ExpenseCategory(code="2.2", name="Direccion de Ambiente", parent_code="2.0", group_type="impuestos"),
        ExpenseCategory(code="2.3", name="Uso Conforme", parent_code="2.0", group_type="impuestos"),
        ExpenseCategory(code="2.4", name="Bomberos", parent_code="2.0", group_type="impuestos"),
        ExpenseCategory(code="2.5", name="Ret. Municipales", parent_code="2.0", group_type="impuestos"),
        
        # 3. Oficina & 4. Taller
        ExpenseCategory(code="3.0", name="Consumibles Oficina", parent_code=None, group_type="corporativo", monthly_budget_usd=250.0),
        ExpenseCategory(code="4.0", name="Consumibles Taller", parent_code=None, group_type="corporativo", monthly_budget_usd=500.0),
        
        # 5 - 9 Tributario SENIAT y Parafiscales
        ExpenseCategory(code="5.0", name="Seniat Iva", parent_code=None, group_type="impuestos", monthly_budget_usd=500.0),
        ExpenseCategory(code="6.0", name="Seniat ISLR", parent_code=None, group_type="impuestos", monthly_budget_usd=300.0),
        ExpenseCategory(code="7.0", name="Seniat Pensiones", parent_code=None, group_type="impuestos", monthly_budget_usd=100.0),
        ExpenseCategory(code="8.0", name="Fonacit", parent_code=None, group_type="impuestos", monthly_budget_usd=100.0),
        ExpenseCategory(code="9.0", name="Parafiscales", parent_code=None, group_type="impuestos", monthly_budget_usd=150.0),
        
        # 10 - 11
        ExpenseCategory(code="10.0", name="Honorarios Profesionales", parent_code=None, group_type="corporativo", monthly_budget_usd=800.0),
        ExpenseCategory(code="11.0", name="Compra de bienes", parent_code=None, group_type="corporativo", monthly_budget_usd=1000.0),
        
        # 12. Servicios
        ExpenseCategory(code="12.0", name="Servicios", parent_code=None, group_type="servicios", monthly_budget_usd=2500.0),
        ExpenseCategory(code="12.1", name="Neptunia", parent_code="12.0", group_type="servicios"),
        ExpenseCategory(code="12.2", name="Gandalf", parent_code="12.0", group_type="servicios"),
        ExpenseCategory(code="12.3", name="Starlink", parent_code="12.0", group_type="servicios"),
        ExpenseCategory(code="12.4", name="Aseo", parent_code="12.0", group_type="servicios"),
        ExpenseCategory(code="12.5", name="Vigilancia", parent_code="12.0", group_type="servicios"),
        
        # 13. Gastos de Flota
        ExpenseCategory(code="13.0", name="Gastos de Flota", parent_code=None, group_type="operativo_campo", is_direct_cost=True, monthly_budget_usd=1200.0),
        
        # 14. Nómina Proyecto (Campo)
        ExpenseCategory(code="14.0", name="Nomina Proyecto", parent_code=None, group_type="nomina_proyecto", is_direct_cost=True, monthly_budget_usd=3500.0),
        ExpenseCategory(code="14.1", name="Hender Rodriguez", parent_code="14.0", group_type="nomina_proyecto", is_direct_cost=True),
        ExpenseCategory(code="14.2", name="Herby Rodriguez", parent_code="14.0", group_type="nomina_proyecto", is_direct_cost=True),
        ExpenseCategory(code="14.3", name="Eliu Suarez", parent_code="14.0", group_type="nomina_proyecto", is_direct_cost=True),
        ExpenseCategory(code="14.4", name="Danny Chaparro", parent_code="14.0", group_type="nomina_proyecto", is_direct_cost=True),
        ExpenseCategory(code="14.5", name="Ernesto Chaparro", parent_code="14.0", group_type="nomina_proyecto", is_direct_cost=True),
        ExpenseCategory(code="14.6", name="Mervis Parra", parent_code="14.0", group_type="nomina_proyecto", is_direct_cost=True),
        
        # 15 - 20 Operativos de Campo
        ExpenseCategory(code="15.0", name="Hospedaje", parent_code=None, group_type="operativo_campo", is_direct_cost=True, monthly_budget_usd=1500.0),
        ExpenseCategory(code="16.0", name="Comidas", parent_code=None, group_type="operativo_campo", is_direct_cost=True, monthly_budget_usd=1800.0),
        ExpenseCategory(code="17.0", name="Insumos", parent_code=None, group_type="operativo_campo", is_direct_cost=True, monthly_budget_usd=2500.0),
        ExpenseCategory(code="18.0", name="Consumibles", parent_code=None, group_type="operativo_campo", is_direct_cost=True, monthly_budget_usd=800.0),
        ExpenseCategory(code="19.0", name="Combustible", parent_code=None, group_type="operativo_campo", is_direct_cost=True, monthly_budget_usd=2000.0),
        ExpenseCategory(code="20.0", name="Traslados", parent_code=None, group_type="operativo_campo", is_direct_cost=True, monthly_budget_usd=600.0)
    ]
    db.add_all(categories)
    db.commit()

    print("Cargando Personal DALOR...")
    personnel_list = [
        # Guacara
        Personnel(code="1.1", full_name="Paola Garay", role_title="Administración y Finanzas", roster_type="guacara_fijo", monthly_salary_usd=800.0, is_approver=True),
        Personnel(code="1.2", full_name="Robert Rodriguez", role_title="Gerente de Operaciones", roster_type="guacara_fijo", monthly_salary_usd=1000.0, is_approver=True),
        Personnel(code="1.3", full_name="Julio Saavedra", role_title="Coordinador de Taller", roster_type="guacara_fijo", monthly_salary_usd=650.0, is_approver=False),
        Personnel(code="1.4", full_name="Vicente Rodriguez", role_title="Logística y Compras", roster_type="guacara_fijo", monthly_salary_usd=600.0, is_approver=False),
        Personnel(code="1.5", full_name="Carlos Hurtado", role_title="Director Técnico / Proyectos", roster_type="guacara_fijo", monthly_salary_usd=1200.0, is_approver=True),
        Personnel(code="1.6", full_name="Geraldine Paez", role_title="Control de Gestión", roster_type="guacara_fijo", monthly_salary_usd=600.0, is_approver=False),
        Personnel(code="1.7", full_name="Eleonora Galetti", role_title="Recursos Humanos", roster_type="guacara_fijo", monthly_salary_usd=600.0, is_approver=False),
        # Campo / Proyecto
        Personnel(code="14.1", full_name="Hender Rodriguez", role_title="Supervisor de Obra", roster_type="proyecto_campo", daily_rate_usd=45.0, is_approver=True),
        Personnel(code="14.2", full_name="Herby Rodriguez", role_title="Técnico Especialista Eléctrico", roster_type="proyecto_campo", daily_rate_usd=40.0),
        Personnel(code="14.3", full_name="Eliu Suarez", role_title="Técnico Mecánico", roster_type="proyecto_campo", daily_rate_usd=35.0),
        Personnel(code="14.4", full_name="Danny Chaparro", role_title="Operador de Maquinaria", roster_type="proyecto_campo", daily_rate_usd=35.0),
        Personnel(code="14.5", full_name="Ernesto Chaparro", role_title="Conductor / Logística Campo", roster_type="proyecto_campo", daily_rate_usd=30.0),
        Personnel(code="14.6", full_name="Mervis Parra", role_title="Técnico de Campo", roster_type="proyecto_campo", daily_rate_usd=30.0)
    ]
    db.add_all(personnel_list)
    db.commit()

    print("Cargando Flota y Activos DALOR...")
    assets = [
        Asset(asset_code="CAM-01", name="Toyota Hilux 4x4", asset_type="vehiculo", brand="Toyota", model="2018", current_odometer_km_hours=148200.0, last_service_odometer=145000.0, service_interval_km_hours=5000.0, current_custodian_name="Hender Rodriguez"),
        Asset(asset_code="CAM-02", name="Isuzu D-Max 4x4", asset_type="vehiculo", brand="Isuzu", model="2021", current_odometer_km_hours=62400.0, last_service_odometer=58000.0, service_interval_km_hours=5000.0, current_custodian_name="Carlos Hurtado"),
        Asset(asset_code="GEN-01", name="Generador Cummins 150 kVA", asset_type="generador", brand="Cummins", model="C150D5", current_odometer_km_hours=1280.0, last_service_odometer=1100.0, service_interval_km_hours=250.0, current_custodian_name="Herby Rodriguez"),
        Asset(asset_code="MAQ-01", name="Retroexcavadora CAT 420F", asset_type="maquinaria_pesada", brand="Caterpillar", model="420F2", current_odometer_km_hours=4320.0, last_service_odometer=4100.0, service_interval_km_hours=250.0, current_custodian_name="Danny Chaparro")
    ]
    db.add_all(assets)
    db.commit()

    print("Cargando Proyectos DALOR & Neptunia...")
    p1 = Project(
        code="PRJ-2026-NEP-01",
        name="Instalación & Montaje Electromecánico Planta El Palito",
        client_name="Complejo Industrial Petroquímico",
        partner_involved="Neptunia",
        contract_amount_usd=48000.00,
        budget_limit_usd=31000.00,
        supervisor_name="Carlos Hurtado",
        notes="Proyecto conjunto con Neptunia. Suministro, pruebas y logística integral."
    )
    p2 = Project(
        code="PRJ-2026-VAL-02",
        name="Mantenimiento Mayor de Transformadores y Celdas",
        client_name="Industrias Metalúrgicas Valencia",
        partner_involved="Dalor Directo",
        contract_amount_usd=22500.00,
        budget_limit_usd=14000.00,
        supervisor_name="Hender Rodriguez",
        notes="Servicio técnico especializado y pruebas de aislamiento."
    )
    db.add_all([p1, p2])
    db.commit()
    db.refresh(p1)
    db.refresh(p2)

    # Centros de Costo
    cc1 = CostCenter(project_id=p1.id, code="CC-01-DIRECTOS", name="Materiales e Insumos Directos", allocated_budget_usd=15000.0)
    cc2 = CostCenter(project_id=p1.id, code="CC-01-LOGISTICA", name="Combustible, Viáticos y Traslados", allocated_budget_usd=9000.0)
    cc3 = CostCenter(project_id=p1.id, code="CC-01-NOMINA", name="Mano de Obra Campo", allocated_budget_usd=7000.0)
    db.add_all([cc1, cc2, cc3])
    db.commit()

    # Asignaciones de Flota
    db.add(AssetAssignment(asset_id=assets[0].id, project_id=p1.id, assigned_to_name="Hender Rodriguez", initial_odometer=147500.0))
    db.add(AssetAssignment(asset_id=assets[2].id, project_id=p1.id, assigned_to_name="Herby Rodriguez", initial_odometer=1250.0))
    db.commit()

    # Gastos de Demostración
    cat_nomina_robert = db.query(ExpenseCategory).filter(ExpenseCategory.code == "1.2").first()
    cat_combustible = db.query(ExpenseCategory).filter(ExpenseCategory.code == "19.0").first()
    cat_comidas = db.query(ExpenseCategory).filter(ExpenseCategory.code == "16.0").first()
    cat_hospedaje = db.query(ExpenseCategory).filter(ExpenseCategory.code == "15.0").first()
    cat_starlink = db.query(ExpenseCategory).filter(ExpenseCategory.code == "12.3").first()
    cat_flota = db.query(ExpenseCategory).filter(ExpenseCategory.code == "13.0").first()

    expenses_sample = [
        # Gasto real del Excel: Nómina Robert Rodriguez
        ExpenseEntry(
            category_id=cat_nomina_robert.id,
            description="NOMINA 15/08 Robert Rodriguez",
            amount_bs=50000.00,
            exchange_rate=799.00,
            amount_usd=62.58,
            payment_method="transferencia",
            status="aprobado"
        ),
        # Combustible Camioneta 01 en Proyecto Neptunia
        ExpenseEntry(
            category_id=cat_combustible.id,
            project_id=p1.id,
            cost_center_id=cc2.id,
            asset_id=assets[0].id,
            reported_by_id=personnel_list[7].id, # Hender
            description="Carga Diésel E/S Guacara - Camioneta Hilux",
            supplier_vendor="E/S PDVSA Guacara",
            amount_bs=17600.00,
            exchange_rate=800.00,
            amount_usd=22.00,
            fuel_liters=44.0,
            price_per_liter_usd=0.50,
            odometer_at_fueling=148200.0,
            has_receipt=True,
            payment_method="caja_chica",
            status="aprobado"
        ),
        # Almuerzos cuadrilla en campo
        ExpenseEntry(
            category_id=cat_comidas.id,
            project_id=p1.id,
            cost_center_id=cc2.id,
            reported_by_id=personnel_list[7].id,
            description="Almuerzos cuadrilla técnica (4 personas)",
            supplier_vendor="Restaurant Don Pepe",
            amount_bs=32000.00,
            exchange_rate=800.00,
            amount_usd=40.00,
            has_receipt=True,
            payment_method="caja_chica",
            status="aprobado"
        ),
        # Conectividad Satelital Starlink
        ExpenseEntry(
            category_id=cat_starlink.id,
            description="Servicio Internet Starlink Dalor Base & Operaciones",
            supplier_vendor="Starlink Satellite",
            amount_usd=65.00,
            exchange_rate=800.00,
            amount_bs=52000.00,
            has_receipt=True,
            payment_method="tarjeta_corporativa",
            status="aprobado"
        ),
        # Mantenimiento de Flota
        ExpenseEntry(
            category_id=cat_flota.id,
            asset_id=assets[1].id, # D-Max
            description="Cambio de filtro de aire y pastillas de freno",
            supplier_vendor="Ferretería & Repuestos Carabobo",
            amount_usd=110.00,
            exchange_rate=800.00,
            amount_bs=88000.00,
            has_receipt=True,
            payment_method="transferencia",
            status="aprobado"
        )
    ]
    db.add_all(expenses_sample)
    db.commit()
    db.close()
    print("¡Base de datos DALOR inicializada exitosamente con estructura real y demo de Neptunia!")

if __name__ == "__main__":
    seed_dalor_database()
