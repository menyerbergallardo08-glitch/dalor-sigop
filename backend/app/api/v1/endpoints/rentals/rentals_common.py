from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel

class RentalItemIn(BaseModel):
    item_type: str = "asset"  # 'asset' | 'material'
    asset_id: Optional[int] = None
    material_id: Optional[int] = None
    name: str
    code: Optional[str] = None
    quantity: float = 1.0

class AssetRentalLoanCreate(BaseModel):
    direction: str  # 'dalor_a_tercero' (salida) o 'tercero_a_dalor' (entrada)
    operation_type: str  # 'alquiler' o 'prestamo'
    asset_id: Optional[int] = None
    material_id: Optional[int] = None
    material_quantity: Optional[float] = 0.0
    equipment_name: Optional[str] = None
    equipment_code: Optional[str] = None
    items: Optional[List[RentalItemIn]] = []
    external_entity: str
    contact_person: Optional[str] = None
    contact_phone: Optional[str] = None
    project_id: Optional[int] = None
    destination_reference: Optional[str] = None
    imputation_mode: Optional[str] = "total_estimado"  # total_estimado, por_factura
    start_date: Optional[datetime] = None
    expected_return_date: Optional[datetime] = None
    rate_usd: Optional[float] = 0.0
    rate_period: Optional[str] = "dia"  # dia, semana, mes, global
    notes: Optional[str] = None

class RentalReturnIn(BaseModel):
    return_date: Optional[datetime] = None
    condition_status: str = "devuelto_conforme"  # devuelto_conforme, devuelto_con_novedad
    return_notes: Optional[str] = None
    settlement_action: Optional[str] = None  # None, 'adjust_real_days', 'extension_negotiation', 'courtesy_waive'
    extension_mode: Optional[str] = None  # 'contract_rate', 'negotiated_rate', 'lump_sum', 'waive'
    negotiated_rate_usd: Optional[float] = None
    lump_sum_amount_usd: Optional[float] = None
    settlement_notes: Optional[str] = None

class RentalPartialReturnIn(BaseModel):
    item_sub_id: int
    returned_quantity: float = 1.0
    condition_status: str = "devuelto_conforme"
    return_notes: Optional[str] = None

class AssetRentalLoanUpdate(BaseModel):
    external_entity: Optional[str] = None
    contact_person: Optional[str] = None
    contact_phone: Optional[str] = None
    destination_reference: Optional[str] = None
    start_date: Optional[datetime] = None
    expected_return_date: Optional[datetime] = None
    rate_usd: Optional[float] = None
    rate_period: Optional[str] = None
    notes: Optional[str] = None
