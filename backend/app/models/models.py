from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.core.database import Base

class ProjectStatus(str, enum.Enum):
    COTIZACION = "cotizacion"
    ACTIVO = "activo"
    PAUSADO = "pausado"
    COMPLETADO = "completado"

class QuotationStatus(str, enum.Enum):
    BORRADOR = "borrador"
    ENVIADO = "enviado"
    APROBADO = "aprobado"
    RECHAZADO = "rechazado"

class ResourceStatus(str, enum.Enum):
    DISPONIBLE_BASE = "disponible_base"
    EN_OBRA = "en_obra"
    EN_MANTENIMIENTO = "en_mantenimiento"
    DESINCORPORADO = "desincorporado"

# ==============================================================================
# 🔐 MÓDULO DE MANTENIMIENTO, SEGURIDAD & USUARIOS (TIPO PROFIT PLUS)
# ==============================================================================
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    full_name = Column(String(150), nullable=False)
    email = Column(String(100), nullable=True)
    hashed_password = Column(String(255), nullable=False)
    role_name = Column(String(50), default="ingeniero_obra")
    permissions_json = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    last_login = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    username = Column(String(50), nullable=False)
    module = Column(String(50), nullable=False)
    action = Column(String(100), nullable=False)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

# ==============================================================================
# 👤 RETIROS DE SOCIOS & GASTOS FIJOS DE SEDE (BLINDAJE FINANCIERO)
# ==============================================================================
class PartnerWithdrawal(Base):
    __tablename__ = "partner_withdrawals"

    id = Column(Integer, primary_key=True, index=True)
    partner_name = Column(String(150), nullable=False) # e.g. "Ing. David Dalor (Socio Principal)", "Socio B"
    withdrawal_date = Column(DateTime, default=datetime.utcnow)
    concept = Column(String(255), nullable=False) # e.g. "Retiro a cuenta de utilidades / Gasto personal"
    amount_usd = Column(Float, nullable=False)
    amount_bs = Column(Float, default=0.0)
    exchange_rate = Column(Float, default=800.0)
    payment_method = Column(String(50), default="transferencia") # transferencia, efectivo_divisa, zelle, pago_movil
    reference_number = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class FixedExpenseSetting(Base):
    __tablename__ = "fixed_expense_settings"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False) # e.g. "Nómina Fija Taller", "Alquiler Galpón", "Servicios & Electricidad"
    category_type = Column(String(50), default="nomina_fija") # nomina_fija, alquiler, servicios, internet, varios
    monthly_amount_usd = Column(Float, default=0.0)
    is_active = Column(Boolean, default=True)

# ==============================================================================
# 🏢 ENTIDADES CORE DE NEGOCIO
# ==============================================================================

class Client(Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True)
    name = Column(String(200), nullable=False)
    rif = Column(String(50), nullable=True)
    contact_name = Column(String(150), nullable=True)
    contact_phone = Column(String(50), nullable=True)
    contact_email = Column(String(100), nullable=True)
    address = Column(String(255), nullable=True)
    industry = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    projects = relationship("Project", back_populates="client")
    quotations = relationship("Quotation", back_populates="client")
    receivables = relationship("AccountReceivable", back_populates="client")

class ServiceItem(Base):
    __tablename__ = "service_items"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    unit_measure = Column(String(50), default="Global")
    category = Column(String(100), default="Electricidad")
    base_cost_usd = Column(Float, default=0.0)
    unit_price_usd = Column(Float, default=0.0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Quotation(Base):
    __tablename__ = "quotations"

    id = Column(Integer, primary_key=True, index=True)
    quote_number = Column(String(50), unique=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    project_title = Column(String(200), nullable=False)
    location = Column(String(200), nullable=True)
    validity_days = Column(Integer, default=15)
    exchange_rate = Column(Float, default=800.0)
    subtotal_usd = Column(Float, default=0.0)
    tax_percent = Column(Float, default=16.0)
    tax_usd = Column(Float, default=0.0)
    total_usd = Column(Float, default=0.0)
    status = Column(String(50), default="borrador")
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    client = relationship("Client", back_populates="quotations")
    items = relationship("QuotationItem", back_populates="quotation", cascade="all, delete-orphan")

class QuotationItem(Base):
    __tablename__ = "quotation_items"

    id = Column(Integer, primary_key=True, index=True)
    quotation_id = Column(Integer, ForeignKey("quotations.id"), nullable=False)
    service_id = Column(Integer, ForeignKey("service_items.id"), nullable=True)
    item_code = Column(String(50), nullable=True)
    description = Column(String(255), nullable=False)
    unit_measure = Column(String(50), default="Global")
    quantity = Column(Float, default=1.0)
    unit_price_usd = Column(Float, default=0.0)
    total_usd = Column(Float, default=0.0)

    quotation = relationship("Quotation", back_populates="items")
    service = relationship("ServiceItem")

class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True)
    name = Column(String(200), nullable=False)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=True)
    client_name = Column(String(150), nullable=True)
    location = Column(String(200), default="Sede Central")
    status = Column(String(50), default="activo")
    scope_of_work = Column(Text, nullable=True)
    start_date = Column(DateTime, default=datetime.utcnow)
    end_date = Column(DateTime, nullable=True)
    duration_days = Column(Integer, default=30)
    
    # Valores Financieros / Bolsas de Costo Estimado
    contract_amount_usd = Column(Float, default=0.0)
    estimated_labor_usd = Column(Float, default=0.0)
    estimated_fuel_usd = Column(Float, default=0.0)
    estimated_materials_usd = Column(Float, default=0.0)
    estimated_tools_usd = Column(Float, default=0.0)
    estimated_services_usd = Column(Float, default=0.0)
    budget_limit_usd = Column(Float, default=0.0)
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    client = relationship("Client", back_populates="projects")
    phases = relationship("ProjectPhase", back_populates="project", cascade="all, delete-orphan", order_by="ProjectPhase.phase_number")
    expenses = relationship("Expense", back_populates="project")
    resource_history = relationship("ResourceAssignmentHistory", back_populates="project")
    receivables = relationship("AccountReceivable", back_populates="project")
    payables = relationship("AccountPayable", back_populates="project")

class ProjectPhase(Base):
    __tablename__ = "project_phases"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    phase_number = Column(Integer, default=1)
    name = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    duration_days = Column(Integer, default=7)
    estimated_cost_usd = Column(Float, default=0.0)
    status = Column(String(50), default="pendiente")
    responsible_person = Column(String(150), nullable=True)

    project = relationship("Project", back_populates="phases")

class CostCenter(Base):
    __tablename__ = "cost_centers"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)

class Asset(Base):
    __tablename__ = "assets"

    id = Column(Integer, primary_key=True, index=True)
    asset_code = Column(String(50), unique=True, index=True)
    name = Column(String(100), nullable=False)
    asset_type = Column(String(50))
    brand = Column(String(50), nullable=True)
    model = Column(String(50), nullable=True)
    serial_number = Column(String(100), nullable=True)
    license_plate = Column(String(50), nullable=True)
    current_odometer = Column(Float, default=0.0)
    service_interval_km = Column(Float, default=5000.0)
    last_service_odometer = Column(Float, default=0.0)
    
    status = Column(String(50), default="disponible_base")
    current_location = Column(String(150), default="Sede Central")
    current_project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)
    current_custodian_name = Column(String(100), nullable=True)
    is_exclusive = Column(Boolean, default=True)
    is_active = Column(Boolean, default=True)

    current_project = relationship("Project")

class Personnel(Base):
    __tablename__ = "personnel"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True)
    full_name = Column(String(150), nullable=False)
    identification_id = Column(String(50), nullable=True)
    role_title = Column(String(100), nullable=False)
    phone = Column(String(50), nullable=True)
    
    status = Column(String(50), default="disponible_base")
    current_location = Column(String(150), default="Sede Central")
    current_project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)
    roster_type = Column(String(50), default="guacara_fijo")
    monthly_salary_usd = Column(Float, default=0.0)
    daily_rate_usd = Column(Float, default=0.0)
    is_approver = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)

    current_project = relationship("Project")

class ResourceAssignmentHistory(Base):
    __tablename__ = "resource_assignment_history"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    resource_type = Column(String(50), nullable=False)
    resource_id = Column(Integer, nullable=False)
    resource_code = Column(String(50), nullable=True)
    resource_name = Column(String(150), nullable=True)
    custodian_name = Column(String(150), nullable=True)
    start_odometer = Column(Float, nullable=True)
    origin_location = Column(String(150), default="Sede Central")
    destination_location = Column(String(150), nullable=False)
    status = Column(String(50), default="en_obra")
    notes = Column(String(255), nullable=True)
    assigned_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="resource_history")

class ExpenseCategory(Base):
    __tablename__ = "expense_categories"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(20), unique=True, index=True)
    name = Column(String(100), nullable=False)
    parent_id = Column(Integer, ForeignKey("expense_categories.id"), nullable=True)
    group_type = Column(String(50), default="operativo") # costo_directo, gasto_fijo_sede, retiro_socio
    monthly_budget_usd = Column(Float, default=0.0)

    parent = relationship("ExpenseCategory", remote_side=[id], back_populates="subcategories")
    subcategories = relationship("ExpenseCategory", back_populates="parent")
    expenses = relationship("Expense", back_populates="category")

class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey("expense_categories.id"), nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)
    cost_center_id = Column(Integer, ForeignKey("cost_centers.id"), nullable=True)
    asset_id = Column(Integer, ForeignKey("assets.id"), nullable=True)
    reported_by_id = Column(Integer, ForeignKey("personnel.id"), nullable=True)
    
    # Clasificación de Alto Nivel
    expense_type = Column(String(50), default="costo_obra") # costo_obra, gasto_sede, retiro_socio
    partner_name = Column(Text, nullable=True) # Para retiros de socios o autor que reporta
    
    expense_date = Column(DateTime, default=datetime.utcnow)
    description = Column(Text, nullable=False)
    supplier_vendor = Column(Text, nullable=False)
    amount_bs = Column(Float, nullable=False)
    exchange_rate = Column(Float, nullable=False)
    amount_usd = Column(Float, nullable=False)
    base_amount_usd = Column(Float, default=0.0)
    tax_amount_usd = Column(Float, default=0.0)
    is_tax_exempt = Column(Boolean, default=False)
    
    fuel_liters = Column(Float, nullable=True)
    price_per_liter_usd = Column(Float, nullable=True)
    odometer_at_fueling = Column(Float, nullable=True)
    
    payment_method = Column(String(50), default="caja_chica")
    status = Column(String(50), default="aprobado")
    has_receipt = Column(Boolean, default=True)
    receipt_image_path = Column(Text, nullable=True)
    
    alert_flag = Column(Boolean, default=False)
    alert_notes = Column(Text, nullable=True)

    category = relationship("ExpenseCategory", back_populates="expenses")
    project = relationship("Project", back_populates="expenses")
    asset = relationship("Asset")
    reported_by = relationship("Personnel")

# ==============================================================================
# 💰 CUENTAS POR COBRAR (CxC), PAGAR (CxP) Y PAGOS FINANCIEROS
# ==============================================================================

class AccountReceivable(Base):
    __tablename__ = "accounts_receivable"

    id = Column(Integer, primary_key=True, index=True)
    invoice_number = Column(String(50), unique=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)
    
    description = Column(String(255), nullable=False)
    issue_date = Column(DateTime, default=datetime.utcnow)
    due_date = Column(DateTime, nullable=False)
    
    amount_usd = Column(Float, default=0.0)
    amount_bs = Column(Float, default=0.0)
    exchange_rate = Column(Float, default=800.0)
    tax_retained_usd = Column(Float, default=0.0)
    
    paid_amount_usd = Column(Float, default=0.0)
    balance_usd = Column(Float, default=0.0)
    status = Column(String(50), default="pendiente")
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    client = relationship("Client", back_populates="receivables")
    project = relationship("Project", back_populates="receivables")
    payments = relationship("FinancialPayment", back_populates="receivable", cascade="all, delete-orphan")

class AccountPayable(Base):
    __tablename__ = "accounts_payable"

    id = Column(Integer, primary_key=True, index=True)
    invoice_number = Column(String(50), index=True)
    supplier_name = Column(String(150), nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)
    category_id = Column(Integer, ForeignKey("expense_categories.id"), nullable=True)
    
    # Clasificación de Compra
    payable_type = Column(String(50), default="costo_material_obra") # costo_material_obra, gasto_fijo_sede, stock_almacen
    
    description = Column(String(255), nullable=False)
    issue_date = Column(DateTime, default=datetime.utcnow)
    due_date = Column(DateTime, nullable=False)
    
    amount_usd = Column(Float, default=0.0)
    amount_bs = Column(Float, default=0.0)
    exchange_rate = Column(Float, default=800.0)
    
    paid_amount_usd = Column(Float, default=0.0)
    balance_usd = Column(Float, default=0.0)
    status = Column(String(50), default="pendiente")
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="payables")
    category = relationship("ExpenseCategory")
    payments = relationship("FinancialPayment", back_populates="payable", cascade="all, delete-orphan")

class FinancialPayment(Base):
    __tablename__ = "financial_payments"

    id = Column(Integer, primary_key=True, index=True)
    payment_type = Column(String(50), nullable=False)
    receivable_id = Column(Integer, ForeignKey("accounts_receivable.id"), nullable=True)
    payable_id = Column(Integer, ForeignKey("accounts_payable.id"), nullable=True)
    
    payment_date = Column(DateTime, default=datetime.utcnow)
    payment_method = Column(String(50), default="transferencia")
    reference_number = Column(String(100), nullable=True)
    amount_usd = Column(Float, nullable=False)
    amount_bs = Column(Float, nullable=False)
    exchange_rate = Column(Float, default=800.0)
    notes = Column(String(255), nullable=True)

    receivable = relationship("AccountReceivable", back_populates="payments")
    payable = relationship("AccountPayable", back_populates="payments")

# ==============================================================================
# 📦 INVENTARIO DE MATERIALES Y CONSUMIBLES DE METALMECÁNICA
# ==============================================================================

class Material(Base):
    __tablename__ = "materials"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True)
    name = Column(String(200), nullable=False)
    category = Column(String(100), default="Acero Estructural") # Acero Estructural, Planchas, Tuberías, Soldadura, Abrasivos, Tornillería, Pinturas
    unit_measure = Column(String(50), default="UND") # UND, KG, MTR, PLG, GAL, ROLLO, CAJA
    stock_quantity = Column(Float, default=0.0)
    min_stock_alert = Column(Float, default=5.0)
    unit_cost_usd = Column(Float, default=0.0)
    total_cost_usd = Column(Float, default=0.0)
    location = Column(String(150), default="Almacén Central Dalor")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    movements = relationship("MaterialMovement", back_populates="material", cascade="all, delete-orphan")

class MaterialMovement(Base):
    __tablename__ = "material_movements"

    id = Column(Integer, primary_key=True, index=True)
    material_id = Column(Integer, ForeignKey("materials.id"), nullable=False)
    movement_type = Column(String(50), nullable=False) # entrada_compra, despacho_obra, ajuste_inventario, devolucion_obra
    quantity = Column(Float, nullable=False)
    unit_cost_usd = Column(Float, default=0.0)
    total_cost_usd = Column(Float, default=0.0)
    
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)
    destination = Column(String(150), default="Sede Central")
    reference_doc = Column(String(100), nullable=True) # Factura, Vale interno, Guía
    notes = Column(Text, nullable=True)
    performed_by = Column(String(150), default="Custodio de Almacén")
    movement_date = Column(DateTime, default=datetime.utcnow)

    material = relationship("Material", back_populates="movements")
    project = relationship("Project")
