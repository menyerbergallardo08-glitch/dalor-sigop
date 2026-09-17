from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

# --- CLIENTES ---
class ClientBase(BaseModel):
    code: Optional[str] = None
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
    code: Optional[str] = None
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

# --- COTIZACIONES (APU STYLE) ---
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
    execution_time: Optional[str] = "15 días hábiles"
    currency: Optional[str] = "USD"
    validity_days: int = 15
    exchange_rate: float = 800.0
    tax_percent: float = 16.0
    notes: Optional[str] = None
    items: List[QuotationItemCreate]

class QuotationUpdate(BaseModel):
    client_id: Optional[int] = None
    project_title: Optional[str] = None
    location: Optional[str] = None
    execution_time: Optional[str] = None
    currency: Optional[str] = None
    validity_days: Optional[int] = None
    exchange_rate: Optional[float] = None
    tax_percent: Optional[float] = None
    notes: Optional[str] = None
    status: Optional[str] = None
    items: Optional[List[QuotationItemCreate]] = None

class QuotationOut(BaseModel):
    id: int
    quote_number: str
    client_id: int
    project_title: str
    location: Optional[str]
    execution_time: Optional[str] = "15 días hábiles"
    currency: Optional[str] = "USD"
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
    execution_time: Optional[str] = "15 días hábiles"
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
    origin_quotation_id: Optional[int] = None

class ProjectOut(BaseModel):
    id: int
    code: str
    name: str
    client_id: Optional[int]
    client_name: Optional[str]
    location: Optional[str]
    status: str
    scope_of_work: Optional[str]
    duration_days: int
    execution_time: Optional[str] = "15 días hábiles"
    tracking_token: Optional[str] = None
    contract_amount_usd: float
    estimated_labor_usd: float
    estimated_fuel_usd: float
    estimated_materials_usd: float
    estimated_tools_usd: float
    estimated_services_usd: float
    budget_limit_usd: float
    total_spent_usd: float = 0.0
    progress_pct: float = 0.0
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
    image_url: Optional[str] = None
    is_tax_exempt: Optional[bool] = False

class SplitExpenseItem(BaseModel):
    category_id: int
    project_id: Optional[int] = None
    amount_usd: float
    description: Optional[str] = None

class ExpenseCreate(BaseModel):
    category_id: Optional[int] = 1
    project_id: Optional[int] = None
    cost_center_id: Optional[int] = None
    asset_id: Optional[int] = None
    reported_by_id: Optional[int] = 1
    description: Optional[str] = "Comprobante de campo"
    supplier_vendor: Optional[str] = "Comercio General"
    amount_bs: Optional[float] = 0.0
    exchange_rate: float = 800.0
    amount_usd: float = 0.0
    base_amount_usd: Optional[float] = 0.0
    tax_amount_usd: Optional[float] = 0.0
    is_tax_exempt: Optional[bool] = False
    fuel_liters: Optional[float] = None
    odometer_at_fueling: Optional[float] = None
    payment_method: Optional[str] = "caja_chica"
    has_receipt: bool = True
    receipt_image_path: Optional[str] = None
    reported_by_name: Optional[str] = None
    allow_duplicate: Optional[bool] = False
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
    base_amount_usd: Optional[float] = 0.0
    tax_amount_usd: Optional[float] = 0.0
    is_tax_exempt: Optional[bool] = False
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

# --- OCR EXTRACT RESULT ---
class OCRExtractResult(BaseModel):
    detected_vendor: Optional[str] = "Comercio General"
    detected_amount_bs: Optional[float] = 0.0
    detected_amount_usd: Optional[float] = 0.0
    detected_base_usd: Optional[float] = 0.0
    detected_tax_usd: Optional[float] = 0.0
    suggested_category_code: Optional[str] = "10.0"
    suggested_category_id: Optional[int] = None
    fuel_liters: Optional[float] = None
    raw_text: Optional[str] = None
    image_url: Optional[str] = None
    is_tax_exempt: Optional[bool] = False



# ==============================================================================
# ESQUEMAS FINANCIEROS (CxC, CxP, PAGOS Y RETIROS)
# ==============================================================================

class ReceivableCreate(BaseModel):
    invoice_number: str
    client_id: int
    project_id: Optional[int] = None
    description: str
    due_date: datetime
    amount_usd: float
    taxable_base_usd: Optional[float] = 0.0
    tax_amount_usd: Optional[float] = 0.0
    tax_withholding_rate: Optional[float] = 75.0
    tax_withholding_usd: Optional[float] = 0.0
    islr_rate: Optional[float] = 2.0
    islr_withholding_usd: Optional[float] = 0.0
    net_amount_usd: Optional[float] = 0.0
    tax_retained_usd: Optional[float] = 0.0
    notes: Optional[str] = None
    issue_date: Optional[datetime] = None

class PayableCreate(BaseModel):
    invoice_number: str
    supplier_name: str
    project_id: Optional[int] = None
    category_id: Optional[int] = None
    payable_type: Optional[str] = "costo_material_obra"
    description: str
    due_date: datetime
    amount_usd: float
    notes: Optional[str] = None
    issue_date: Optional[datetime] = None

class FinancialPaymentCreate(BaseModel):
    payment_type: Optional[str] = "abono"
    payment_method: Optional[str] = "transferencia"
    voucher_number: Optional[str] = None
    reference_number: Optional[str] = None
    amount_usd: float
    amount_bs: Optional[float] = 0.0
    exchange_rate: Optional[float] = 800.0
    notes: Optional[str] = None
    payment_date: Optional[datetime] = None

class PartnerWithdrawalCreate(BaseModel):
    partner_name: str
    concept: Optional[str] = "Retiro a cuenta de utilidades / Gasto personal"
    amount_usd: float
    amount_bs: Optional[float] = 0.0
    exchange_rate: Optional[float] = 800.0
    payment_method: Optional[str] = "transferencia"
    reference_number: Optional[str] = None
    notes: Optional[str] = None
    withdrawal_date: Optional[datetime] = None

class FixedExpenseSettingCreate(BaseModel):
    name: str
    category_id: Optional[int] = None
    monthly_amount_usd: float
    is_active: bool = True
