from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel

class DispatchItemIn(BaseModel):
    description: str
    quantity: float = 1.0
    unit: str = "Pzas"
    condition_status: str = "Reparado / Listo para Montaje"
    approx_weight_kg: Optional[float] = 0.0

class DispatchGuideCreate(BaseModel):
    guide_number: Optional[str] = None
    guide_type: Optional[str] = "traslado_externo"  # traslado_externo, control_interno
    delivered_by_staff: Optional[str] = None
    received_by_staff: Optional[str] = None
    project_id: Optional[int] = None
    client_id: Optional[int] = None
    recipient_name: Optional[str] = None  # Nombre libre para formato abierto
    transfer_reason: Optional[str] = "Despacho de Producción"  # Motivo de traslado
    is_freeform: Optional[bool] = False
    dispatch_date: Optional[datetime] = None
    destination_address: Optional[str] = "Taller Dalor Guacara"
    destination_plant: Optional[str] = None
    
    transport_type: Optional[str] = "propio_dalor"  # propio_dalor, tercerizado_flete, retiro_cliente
    asset_id: Optional[int] = None
    carrier_company: Optional[str] = None
    driver_name: Optional[str] = "Personal DALOR"
    driver_id_doc: Optional[str] = "N/A"
    driver_phone: Optional[str] = None
    vehicle_model: Optional[str] = None
    vehicle_plate: Optional[str] = "S/P"
    
    freight_cost_usd: Optional[float] = 0.0
    freight_price_charged_usd: Optional[float] = 0.0
    
    quality_inspector: Optional[str] = "Control de Calidad DALOR"
    dispatcher_name: Optional[str] = "Despacho Taller Guacara"
    notes: Optional[str] = None
    
    items: List[DispatchItemIn] = []

class DeliveryConfirmIn(BaseModel):
    received_by_client_name: Optional[str] = None
    received_by: Optional[str] = None
    received_by_client_id_doc: Optional[str] = "V-Receptor"
    reception_date: Optional[datetime] = None
    notes: Optional[str] = None

class BadDebtIn(BaseModel):
    reason: str
    notes: Optional[str] = None
