from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.models.models import AuditLog

router = APIRouter()

@router.get("/audit-logs")
def get_audit_logs(
    username: str = None,
    user: str = None,
    module: str = None,
    date_from: str = None,
    date_to: str = None,
    limit: int = 200,
    db: Session = Depends(get_db)
):
    query = db.query(AuditLog)
    u_filter = username or user
    if u_filter:
        query = query.filter(AuditLog.username.ilike(f"%{u_filter.strip()}%"))
    if module:
        query = query.filter(AuditLog.module.ilike(f"%{module.strip()}%"))
    if date_from:
        try:
            df = datetime.fromisoformat(date_from)
            query = query.filter(AuditLog.created_at >= df)
        except Exception:
            pass
    if date_to:
        try:
            dt = datetime.fromisoformat(date_to)
            if len(date_to) == 10:
                dt = datetime.combine(dt.date(), datetime.max.time())
            query = query.filter(AuditLog.created_at <= dt)
        except Exception:
            pass
    logs = query.order_by(AuditLog.created_at.desc()).limit(limit).all()
    return [{
        "id": l.id,
        "username": l.username,
        "module": l.module,
        "action": l.action,
        "details": l.details,
        "created_at": l.created_at.strftime("%Y-%m-%d %H:%M:%S") if l.created_at else ""
    } for l in logs]

# ------------------------------------------------------------------------------

