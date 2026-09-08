from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

# --- CLIENTES ---
class ClientBase(BaseModel):
    code: str
    name: str
    rif: Optional[str] = None
    contact_name: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    address: Optional[str] = None
    industry: Optional[str] = None

class ClientCreate(ClientBase):
    pass

class ClientOut(ClientBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

# --- SERVICIOS (PARTIDAS APU) ---
class ServiceItemBase(BaseModel):
    code: str
    name: str
    description: Optional[str] = None
    unit_measure: str = "Global"
    category: str = "Electricidad"
    base_cost_usd: float = 0.0
    unit_price_usd: float = 0.0

class ServiceItemCreate(ServiceItemBase):
    pass

class ServiceItemOut(ServiceItemBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

# --- COTIZACIONES (LULOWIN STYLE) ---
class QuotationItemBase(BaseModel):
    service_id: Optional[int] = None
    item_code: Optional[str] = None
    description: str
    unit_measure: str = "Global"
    quantity: float = 1.0
    unit_price_usd: float = 0.0
    total_usd: float = 0.0

class QuotationItemCreate(QuotationItemBase):
    pass

class QuotationItemOut(QuotationItemBase):
    id: int
    quotation_id: int

    class Config:
        from_attributes = True

class QuotationCreate(BaseModel):
    quote_number: Optional[str] = None
    client_id: int
    project_title: str
    location: Optional[str] = "Sede Central"
    validity_days: int = 15
    exchange_rate: float = 800.0
    tax_percent: float = 16.0
    notes: Optional[str] = None
    items: List[QuotationItemCreate]

class QuotationOut(BaseModel):
    id: int
    quote_number: str
    client_id: int
    project_title: str
    location: Optional[str]
    validity_days: int
    exchange_rate: float
    subtotal_usd: float
    tax_percent: float
    tax_usd: float
    total_usd: float
    status: str
    notes: Optional[str]
    created_at: datetime
    client: Optional[ClientOut] = None
    items: List[QuotationItemOut] = []

    class Config:
        from_attributes = True

# --- ETAPAS / FASES DE PROYECTO ---
class ProjectPhaseCreate(BaseModel):
    phase_number: int = 1
    name: str
    description: Optional[str] = None
    duration_days: int = 7
    estimated_cost_usd: float = 0.0
    status: str = "pendiente"
    responsible_person: Optional[str] = None

class ProjectPhaseOut(BaseModel):
    id: int
    phase_number: int
    name: str
    description: Optional[str]
    duration_days: int
    estimated_cost_usd: float
    status: str
    responsible_person: Optional[str]

    class Config:
        from_attributes = True

# --- PROYECTOS & PLANIFICACIÓN INTEGRAL ---
class ProjectCreate(BaseModel):
    code: str
    name: str
    client_id: Optional[int] = None
    client_name: Optional[str] = None
    location: Optional[str] = "Sede Central"
    status: str = "activo"
    scope_of_work: Optional[str] = None
    duration_days: int = 30
    contract_amount_usd: float = 0.0
    estimated_labor_usd: float = 0.0
    estimated_fuel_usd: float = 0.0
    estimated_materials_usd: float = 0.0
    estimated_tools_usd: float = 0.0
    estimated_services_usd: float = 0.0
    phases: Optional[List[ProjectPhaseCreate]] = []
    assigned_personnel_ids: Optional[List[int]] = []
    assigned_vehicle_ids: Optional[List[int]] = []
    assigned_tool_ids: Optional[List[int]] = []

class ProjectOut(BaseModel):
    id: int
    code: str
    name: str
    client_id: Optional[int]
    client_name: Optional[str]
    location: str
    status: str
    scope_of_work: Optional[str]
    duration_days: int
    contract_amount_usd: float
    estimated_labor_usd: float
    estimated_fuel_usd: float
    estimated_materials_usd: float
    estimated_tools_usd: float
    estimated_services_usd: float
    budget_limit_usd: float
    is_active: bool
    created_at: datetime
    phases: List[ProjectPhaseOut] = []

    class Config:
        from_attributes = True

# --- RECURSOS & MATRIZ ---
class ResourceAssignRequest(BaseModel):
    project_id: int
    resource_type: str # asset, personnel
    resource_id: int
    destination_location: Optional[str] = "Sede Central"
    custodian_name: Optional[str] = None
    start_odometer: Optional[float] = None
    notes: Optional[str] = None

class ResourceTransferRequest(BaseModel):
    target_project_id: int
    resource_type: str
    resource_id: int
    destination_location: Optional[str] = "Sede Central"
    custodian_name: Optional[str] = None
    current_odometer: Optional[float] = None
    notes: Optional[str] = None

class ResourceReturnRequest(BaseModel):
    resource_type: str
    resource_id: int
    end_odometer: Optional[float] = None
    return_location: Optional[str] = "Sede Central"

# --- GASTOS & OCR ---
class OCRExtractResult(BaseModel):
    detected_vendor: Optional[str] = None
    detected_amount_bs: Optional[float] = None
    detected_amount_usd: Optional[float] = None
    detected_base_usd: Optional[float] = None
    detected_tax_usd: Optional[float] = None
    suggested_category_code: Optional[str] = None
    suggested_category_id: Optional[int] = None
    fuel_liters: Optional[float] = None
    raw_text: Optional[str] = None

class SplitExpenseItem(BaseModel):
    category_id: int
    project_id: Optional[int] = None
    amount_usd: float
    description: Optional[str] = None

class ExpenseCreate(BaseModel):
    category_id: int
    project_id: Optional[int] = None
    cost_center_id: Optional[int] = None
    asset_id: Optional[int] = None
    reported_by_id: int
    description: str
    supplier_vendor: str
    amount_bs: float
    exchange_rate: float = 800.0
    amount_usd: float
    fuel_liters: Optional[float] = None
    odometer_at_fueling: Optional[float] = None
    payment_method: str = "caja_chica"
    has_receipt: bool = True
    receipt_image_path: Optional[str] = None
    split_items: Optional[List[SplitExpenseItem]] = None

class ExpenseOut(BaseModel):
    id: int
    category_id: int
    project_id: Optional[int]
    cost_center_id: Optional[int]
    asset_id: Optional[int]
    reported_by_id: Optional[int]
    expense_date: datetime
    description: str
    supplier_vendor: str
    amount_bs: float
    exchange_rate: float
    amount_usd: float
    fuel_liters: Optional[float]
    price_per_liter_usd: Optional[float]
    odometer_at_fueling: Optional[float]
    payment_method: str
    status: str
    has_receipt: bool
    receipt_image_path: Optional[str]
    alert_flag: bool
    alert_notes: Optional[str]

    class Config:
        from_attributes = True

# --- REPORTES Y CATEGORÍAS ---
class CategoryTreeOut(BaseModel):
    id: int
    code: str
    name: str
    group_type: str
    monthly_budget_usd: float
    total_spent_usd: float
    subcategories_count: int
    subcategories: List[dict] = []
