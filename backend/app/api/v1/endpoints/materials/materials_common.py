from pydantic import BaseModel
from typing import List, Optional

class MaterialCreate(BaseModel):
    code: str
    name: str
    category: str = "Acero Estructural"
    unit_measure: str = "UND"
    stock_quantity: float = 0.0
    min_stock_alert: float = 5.0
    unit_cost_usd: float = 0.0
    location: str = "Almacen Central Dalor"

class MaterialEntryItem(BaseModel):
    material_id: int
    quantity: float
    unit_cost_usd: float

class MaterialEntryCreate(BaseModel):
    material_id: Optional[int] = None
    quantity: Optional[float] = None
    unit_cost_usd: Optional[float] = None
    items: Optional[List[MaterialEntryItem]] = None
    supplier_name: Optional[str] = "Proveedor General"
    reference_doc: Optional[str] = None
    notes: Optional[str] = None
    performed_by: Optional[str] = "Custodio de Almacen"
    register_in_cxp: bool = False
    due_days: int = 15
    payment_channel: Optional[str] = "caja_chica_usd"
    payment_ref: Optional[str] = None

class MaterialConsumeItem(BaseModel):
    material_id: int
    quantity: float

class MaterialConsumeCreate(BaseModel):
    material_id: Optional[int] = None
    quantity: Optional[float] = None
    items: Optional[List[MaterialConsumeItem]] = None
    project_id: Optional[int] = None
    destination: Optional[str] = "Taller Central"
    reference_doc: Optional[str] = None
    notes: Optional[str] = None
    performed_by: Optional[str] = "Custodio de Almacen"
    driver_name: Optional[str] = None
    vehicle_plate: Optional[str] = None

class RequisitionDispatchItem(BaseModel):
    requisition_id: int
    quantity_to_dispatch: float

class RequisitionDispatchCreate(BaseModel):
    project_id: int
    items: List[RequisitionDispatchItem]
    driver_name: Optional[str] = None
    driver_id_doc: Optional[str] = None
    vehicle_plate: Optional[str] = None
    vehicle_model: Optional[str] = None
    asset_id: Optional[int] = None
    carrier_company: Optional[str] = "DALOR C.A."
    is_internal: Optional[bool] = None
    notes: Optional[str] = None

class MaterialCalibrationRequest(BaseModel):
    new_stock_quantity: Optional[float] = None
    new_stock: Optional[float] = None
    reason: str
    director_password: str
    calibrated_by: Optional[str] = "Dirección General"

class MaterialUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    unit_measure: Optional[str] = None
    min_stock_alert: Optional[float] = None
    unit_cost_usd: Optional[float] = None
    location: Optional[str] = None
    is_active: Optional[bool] = None
