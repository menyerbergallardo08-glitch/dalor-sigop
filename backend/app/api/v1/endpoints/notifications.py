"""
Endpoints de Notificaciones del Sistema y Envío de Alertas por Correo - DALOR SIGO-P.
"""

from typing import Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import get_current_active_user
from app.services.alert_service import AlertService

router = APIRouter(dependencies=[Depends(get_current_active_user)])


class SendAlertEmailRequest(BaseModel):
    to_email: Optional[str] = None


class AlertEmailSettingsUpdate(BaseModel):
    enabled: bool = True
    interval_hours: int = 24
    recipients: str = ""


@router.get("/alerts")
def get_system_alerts(db: Session = Depends(get_db)):
    data = AlertService.collect_system_alerts(db)
    data["schedule"] = AlertService.get_email_schedule_settings(db)
    return data


@router.put("/settings")
def update_alert_email_settings(payload: AlertEmailSettingsUpdate, db: Session = Depends(get_db)):
    saved = AlertService.save_email_schedule_settings(db, payload.enabled, payload.interval_hours, payload.recipients)
    return {"success": True, "schedule": saved}


@router.post("/send-email")
def trigger_alerts_email(payload: SendAlertEmailRequest, db: Session = Depends(get_db)):
    return AlertService.send_alerts_email(db, to_email=payload.to_email)
