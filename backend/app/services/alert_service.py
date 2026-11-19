"""
Servicio desacoplado de Alertas del Sistema y Notificaciones por Correo (SMTP) - DALOR SIGO-P.
Consolida alertas de CxC por vencer/vencidas, Gastos pendientes/observados y Obligaciones de Flota.
"""

import json
import os
import smtplib
from datetime import datetime, timedelta
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session, joinedload

from app.models.models import AccountReceivable, Asset, CompanyProfile, Expense, FleetObligation, SystemSetting


class AlertService:
    @staticmethod
    def get_smtp_config() -> Dict[str, Any]:
        host = os.getenv("SMTP_HOST", "smtp.gmail.com").strip()
        port = int(os.getenv("SMTP_PORT", "587") or 587)
        user = os.getenv("SMTP_USER", "").strip()
        password = os.getenv("SMTP_PASSWORD", "").strip()
        sender = os.getenv("SMTP_FROM", user).strip()
        recipients_raw = os.getenv("ALERT_EMAILS", "").strip()
        recipients = [e.strip() for e in recipients_raw.split(",") if e.strip()]
        configured = bool(host and user and password)
        return {
            "host": host,
            "port": port,
            "user": user,
            "password": password,
            "sender": sender or user,
            "recipients": recipients,
            "configured": configured,
        }

    @staticmethod
    def get_email_schedule_settings(db: Session) -> Dict[str, Any]:
        cfg = AlertService.get_smtp_config()
        default_enabled = os.getenv("ALERT_AUTO_EMAIL_ENABLED", "true").lower() == "true"
        default_hours = max(1, int(os.getenv("ALERT_EMAIL_INTERVAL_HOURS", "24") or 24))
        default_recips = ", ".join(cfg["recipients"])
        row = db.query(SystemSetting).filter(SystemSetting.key == "alert_email_schedule").first()
        if row and row.value:
            try:
                saved = json.loads(row.value)
                return {
                    "enabled": bool(saved.get("enabled", default_enabled)),
                    "interval_hours": max(1, int(saved.get("interval_hours", default_hours) or default_hours)),
                    "recipients": str(saved.get("recipients") or default_recips),
                }
            except Exception:
                pass
        return {"enabled": default_enabled, "interval_hours": default_hours, "recipients": default_recips}

    @staticmethod
    def save_email_schedule_settings(db: Session, enabled: bool, interval_hours: int, recipients: str) -> Dict[str, Any]:
        payload = {
            "enabled": bool(enabled),
            "interval_hours": max(1, int(interval_hours or 24)),
            "recipients": (recipients or "").strip(),
        }
        row = db.query(SystemSetting).filter(SystemSetting.key == "alert_email_schedule").first()
        if row:
            row.value = json.dumps(payload)
        else:
            db.add(SystemSetting(key="alert_email_schedule", value=json.dumps(payload)))
        db.commit()
        return payload

    @staticmethod
    def collect_system_alerts(db: Session) -> Dict[str, Any]:
        now = datetime.utcnow()
        today = now.date()
        soon_cxc = now + timedelta(days=7)

        items: List[Dict[str, Any]] = []

        # 1. CxC vencidas o próximas a vencer (7 días)
        cxc_rows = (
            db.query(AccountReceivable)
            .options(joinedload(AccountReceivable.client))
            .filter(
                AccountReceivable.balance_usd > 0.05,
                AccountReceivable.status.notin_(["cobrado_total", "anulada", "castigada", "incobrable"]),
                AccountReceivable.due_date.isnot(None),
                AccountReceivable.due_date <= soon_cxc,
            )
            .order_by(AccountReceivable.due_date.asc())
            .limit(40)
            .all()
        )
        cxc_count = 0
        for r in cxc_rows:
            cxc_count += 1
            days_rem = (r.due_date.date() - today).days
            severity = "critical" if days_rem < 0 else "warning"
            cli_name = r.client.name if r.client else "Cliente"
            status_txt = f"Vencida hace {abs(days_rem)} día(s)" if days_rem < 0 else f"Vence en {days_rem} día(s)"
            items.append({
                "category": "cxc",
                "severity": severity,
                "title": f"CxC [{r.invoice_number}] — {cli_name}",
                "detail": f"Saldo: ${float(r.balance_usd or 0):,.2f} • {status_txt}",
                "due_date": r.due_date.strftime("%Y-%m-%d"),
            })

        # 2. Gastos pendientes u observados
        exp_rows = (
            db.query(Expense)
            .filter(Expense.status.in_(["pendiente", "pendiente_aprobacion", "observado"]))
            .order_by(Expense.expense_date.desc(), Expense.id.desc())
            .limit(30)
            .all()
        )
        exp_count = len(exp_rows)
        for e in exp_rows:
            vendor_lbl = getattr(e, "supplier_vendor", None) or (e.category.name if getattr(e, "category", None) else None) or "Sin proveedor"
            items.append({
                "category": "expenses",
                "severity": "critical" if e.status == "observado" else "warning",
                "title": f"Gasto #{e.id} ({e.status.upper()}) — {vendor_lbl}",
                "detail": f"${float(e.amount_usd or 0):,.2f} • {(e.description or '')[:70]}",
                "due_date": e.expense_date.strftime("%Y-%m-%d") if e.expense_date else None,
            })

        # 3. Obligaciones de Flota vencidas o por vencer
        ob_rows = (
            db.query(FleetObligation)
            .options(joinedload(FleetObligation.asset))
            .filter(FleetObligation.status != "pagado", FleetObligation.expiration_date.isnot(None))
            .order_by(FleetObligation.expiration_date.asc())
            .all()
        )
        fleet_count = 0
        for ob in ob_rows:
            days_rem = (ob.expiration_date.date() - today).days
            if days_rem <= int(ob.alert_days_before or 30):
                fleet_count += 1
                unit_lbl = f"[{ob.asset.asset_code}] {ob.asset.name}" if ob.asset else f"Activo #{ob.asset_id}"
                status_txt = f"Vencida hace {abs(days_rem)}d" if days_rem < 0 else f"Vence en {days_rem}d"
                items.append({
                    "category": "fleet",
                    "severity": "critical" if days_rem < 0 else "warning",
                    "title": f"Flota {unit_lbl} — {ob.title}",
                    "detail": f"{ob.obligation_type} • {status_txt} (${float(ob.amount_usd or 0):,.2f})",
                    "due_date": ob.expiration_date.strftime("%Y-%m-%d"),
                })

        # 4. Vencimiento de Mantenimiento Preventivo (Flota y Maquinaria)
        asset_rows = (
            db.query(Asset)
            .filter(Asset.is_active == True, Asset.asset_type.in_(["vehiculo", "maquinaria"]))
            .all()
        )
        maint_count = 0
        for a in asset_rows:
            cur_odo = float(a.current_odometer or 0.0)
            last_odo = float(a.last_service_odometer or 0.0)
            interval = float(a.service_interval_km or 5000.0)
            if interval <= 0:
                continue
            rem_km = (last_odo + interval) - cur_odo
            if rem_km <= 500:
                maint_count += 1
                is_overdue = rem_km <= 0
                status_txt = f"Vencido hace {abs(rem_km):,.0f} Km" if is_overdue else f"Próximo en {rem_km:,.0f} Km"
                items.append({
                    "category": "maintenance",
                    "severity": "critical" if is_overdue else "warning",
                    "title": f"Mantenimiento [{a.asset_code}] {a.name}",
                    "detail": f"Odómetro: {cur_odo:,.0f} Km • {status_txt}",
                    "due_date": None,
                })

        smtp_cfg = AlertService.get_smtp_config()
        return {
            "total_count": cxc_count + exp_count + fleet_count + maint_count,
            "counts": {"cxc": cxc_count, "expenses": exp_count, "fleet": fleet_count, "maintenance": maint_count},
            "items": items,
            "smtp_configured": smtp_cfg["configured"],
            "default_recipients": smtp_cfg["recipients"],
        }

    @staticmethod
    def send_alerts_email(db: Session, to_email: Optional[str] = None) -> Dict[str, Any]:
        cfg = AlertService.get_smtp_config()
        if not cfg["configured"]:
            return {
                "sent": False,
                "configured": False,
                "message": "SMTP no configurado. Define SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD y ALERT_EMAILS en .env o Render.",
            }

        sched = AlertService.get_email_schedule_settings(db)
        sched_recips = [e.strip() for e in (sched.get("recipients") or "").split(",") if e.strip()]
        recipients = [e.strip() for e in (to_email or "").split(",") if e.strip()] or sched_recips or cfg["recipients"]
        if not recipients:
            profile = db.query(CompanyProfile).first()
            if profile and profile.email:
                recipients = [profile.email.strip()]
        if not recipients:
            return {"sent": False, "configured": True, "message": "No hay correo destinatario configurado."}

        alerts = AlertService.collect_system_alerts(db)
        rows_html = "".join(
            f"<li><b>[{it['category'].upper()}]</b> {it['title']} — {it['detail']}</li>"
            for it in alerts["items"][:50]
        ) or "<li>Sin alertas críticas pendientes al día de hoy.</li>"

        html = f"""
        <html><body style="font-family: Arial, sans-serif; color: #1e293b;">
            <h2 style="color:#002B49;">DALOR SIGO-P — Resumen de Alertas del Sistema</h2>
            <p><b>Total alertas:</b> {alerts['total_count']} (CxC: {alerts['counts']['cxc']} | Mantenimiento: {alerts['counts'].get('maintenance', 0)} | Obligaciones Flota/Fiscales: {alerts['counts']['fleet']} | Gastos: {alerts['counts']['expenses']})</p>
            <ul>{rows_html}</ul>
        </body></html>
        """
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"[DALOR SIGO-P] Alertas del Sistema ({alerts['total_count']} pendientes)"
        msg["From"] = cfg["sender"]
        msg["To"] = ", ".join(recipients)
        msg.attach(MIMEText(html, "html", "utf-8"))

        try:
            if cfg["port"] == 465:
                with smtplib.SMTP_SSL(cfg["host"], cfg["port"], timeout=15) as server:
                    server.login(cfg["user"], cfg["password"])
                    server.sendmail(cfg["sender"], recipients, msg.as_string())
            else:
                with smtplib.SMTP(cfg["host"], cfg["port"], timeout=15) as server:
                    server.starttls()
                    server.login(cfg["user"], cfg["password"])
                    server.sendmail(cfg["sender"], recipients, msg.as_string())
            return {"sent": True, "configured": True, "recipients": recipients, "message": f"Resumen enviado a {', '.join(recipients)}."}
        except Exception as exc:
            return {"sent": False, "configured": True, "message": f"Error SMTP al enviar correo: {exc}"}
