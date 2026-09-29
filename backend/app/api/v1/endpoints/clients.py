from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.models import Client, Project, Quotation
from app.schemas.schemas import ClientCreate, ClientOut

router = APIRouter()

@router.get("/", response_model=List[ClientOut])
def get_clients(include_inactive: bool = False, db: Session = Depends(get_db)):
    query = db.query(Client)
    if not include_inactive:
        query = query.filter(Client.is_active == True)
    return query.order_by(Client.name.asc()).all()

import re

def get_next_client_code_value(db: Session) -> str:
    clients = db.query(Client).all()
    max_num = 0
    for c in clients:
        if c.code:
            nums = re.findall(r'\d+', c.code)
            if nums:
                try:
                    max_num = max(max_num, int(nums[-1]))
                except ValueError:
                    pass
    num = max(max_num + 1, len(clients) + 1)
    code = f"CLI-{num:03d}"
    while db.query(Client).filter(Client.code == code).first():
        num += 1
        code = f"CLI-{num:03d}"
    return code

@router.get("/next-code")
def get_next_client_code_endpoint(db: Session = Depends(get_db)):
    return {"next_code": get_next_client_code_value(db)}

@router.post("/", response_model=ClientOut)
def create_client(client_in: ClientCreate, db: Session = Depends(get_db)):
    client_dict = client_in.dict()
    name_val = (client_dict.get("name") or "").strip()
    rif_val = (client_dict.get("rif") or "").strip().upper()
    
    if not name_val:
        raise HTTPException(status_code=400, detail="La razón social del cliente es obligatoria.")
        
    # Anti-duplicados por RIF
    if rif_val:
        rif_clean = re.sub(r'[^A-Z0-9]', '', rif_val)
        existing_clients = db.query(Client).filter(Client.is_active == True).all()
        for c in existing_clients:
            if c.rif and re.sub(r'[^A-Z0-9]', '', c.rif.upper()) == rif_clean:
                raise HTTPException(status_code=400, detail=f"Ya existe un cliente activo con el RIF '{rif_val}' ({c.name}).")
                
    # Anti-duplicados por Razón Social
    existing_name = db.query(Client).filter(Client.name.ilike(name_val), Client.is_active == True).first()
    if existing_name:
        raise HTTPException(status_code=400, detail=f"Ya existe un cliente activo con la razón social '{name_val}' ({existing_name.code}).")

    code_val = (client_dict.get("code") or "").strip()
    # El correlativo es obligatorio y estrictamente ordenado (no editable por operario)
    if not code_val or code_val in ("Cargando...", "Generando..."):
        code_val = get_next_client_code_value(db)
    else:
        existing = db.query(Client).filter(Client.code == code_val).first()
        if existing:
            code_val = get_next_client_code_value(db)
    
    client_dict["code"] = code_val
    new_client = Client(**client_dict)
    db.add(new_client)
    db.commit()
    db.refresh(new_client)
    return new_client

@router.put("/{client_id}", response_model=ClientOut)
def update_client(client_id: int, client_in: ClientCreate, db: Session = Depends(get_db)):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado.")
    
    client_dict = client_in.dict()
    name_val = (client_dict.get("name") or "").strip()
    rif_val = (client_dict.get("rif") or "").strip().upper()
    
    if name_val:
        # Validar que no colisione con otro cliente
        existing_name = db.query(Client).filter(Client.name.ilike(name_val), Client.id != client_id, Client.is_active == True).first()
        if existing_name:
            raise HTTPException(status_code=400, detail=f"Ya existe otro cliente con la razón social '{name_val}' ({existing_name.code}).")
        client.name = name_val
        
    if rif_val:
        rif_clean = re.sub(r'[^A-Z0-9]', '', rif_val)
        existing_clients = db.query(Client).filter(Client.id != client_id, Client.is_active == True).all()
        for c in existing_clients:
            if c.rif and re.sub(r'[^A-Z0-9]', '', c.rif.upper()) == rif_clean:
                raise HTTPException(status_code=400, detail=f"El RIF '{rif_val}' ya pertenece a otro cliente ({c.name}).")
        client.rif = rif_val

    updatable_fields = ["contact_name", "contact_phone", "contact_email", "address", "industry"]
    for field in updatable_fields:
        if field in client_dict and client_dict[field] is not None:
            setattr(client, field, client_dict[field])
            
    db.commit()
    db.refresh(client)
    return client

@router.delete("/{client_id}")
def delete_client(client_id: int, db: Session = Depends(get_db)):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado.")
    
    # Soft Delete para preservar la traza
    client.is_active = False
    db.commit()
    return {"message": "Cliente inactivado exitosamente (traza histórica preservada)."}

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

    from app.models.models import AccountReceivable
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

