from typing import Optional, List
from pydantic import BaseModel

class ExpenseValidationInput(BaseModel):
    expense_type: str = "costo_obra" # costo_obra, gasto_sede, retiro_socio
    category_id: int
    project_id: Optional[int] = None
    partner_name: Optional[str] = None
    supplier_vendor: str
    description: str
    amount_usd: float
    exchange_rate: float = 800.0
    payment_method: str = "caja_chica"
    has_fiscal_invoice: bool = False
    fuel_liters: Optional[float] = None
    odometer_at_fueling: Optional[float] = None
    base_amount_usd: Optional[float] = None
    tax_amount_usd: Optional[float] = None
    is_tax_exempt: Optional[bool] = False

class ManualExpenseCreate(BaseModel):
    category_id: Optional[int] = 1
    project_id: Optional[int] = None
    amount_usd: float
    amount_bs: Optional[float] = 0.0
    exchange_rate: Optional[float] = 800.0
    payment_method: Optional[str] = "efectivo_divisa"
    supplier_vendor: Optional[str] = "Varios / Sede"
    description: str
    reported_by_id: Optional[int] = None

class BatchExpenseRow(BaseModel):
    date: str
    expense_type: str # obra, sede, socio
    project_code: Optional[str] = None
    category_code: str
    supplier_vendor: str
    description: str
    amount_usd: float
    payment_method: str = "caja_chica"
    reference_number: Optional[str] = None
