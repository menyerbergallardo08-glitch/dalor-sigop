from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.models import Client, Project, Quotation, AccountReceivable
from app.api.deps import get_current_active_user

router = APIRouter(dependencies=[Depends(get_current_active_user)])


@router.get("/{client_id}/history")
def get_client_history(client_id: int, db: Session = Depends(get_db)):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado.")
    
    projects = db.query(Project).filter(Project.client_id == client_id).all()
    quotations = db.query(Quotation).filter(Quotation.client_id == client_id).all()

    total_contracted = sum(p.contract_amount_usd for p in projects)
    
    return {
        "client": {
            "id": client.id,
            "name": client.name,
            "code": client.code,
            "rif": client.rif,
            "contact_name": client.contact_name,
            "contact_phone": client.contact_phone,
            "contact_email": client.contact_email,
            "address": client.address
        },
        "total_contracted_usd": total_contracted,
        "projects_count": len(projects),
        "quotations_count": len(quotations),
    }


@router.get("/{client_id}/credit-risk")
def get_client_credit_risk(client_id: int, db: Session = Depends(get_db)):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado.")

    bad_debts = db.query(AccountReceivable).filter(
        AccountReceivable.client_id == client_id,
        (AccountReceivable.status == "incobrable") | (AccountReceivable.is_bad_debt == True)
    ).all()

    has_bad_debt = len(bad_debts) > 0
    total_bad_debt = sum(b.bad_debt_amount_usd or b.amount_usd for b in bad_debts)
    details = [
        {
            "invoice_number": b.invoice_number,
            "amount_usd": b.bad_debt_amount_usd or b.amount_usd,
            "reason": b.bad_debt_reason or b.notes or "Cuenta castigada por mora"
        }
        for b in bad_debts
    ]

    return {
        "has_risk": has_bad_debt,
        "total_bad_debt_usd": round(total_bad_debt, 2),
        "bad_debts": details,
        "client_name": client.name
    }
