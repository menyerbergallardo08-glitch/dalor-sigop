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

@router.post("/", response_model=ClientOut)
def create_client(client_in: ClientCreate, db: Session = Depends(get_db)):
    existing = db.query(Client).filter(Client.code == client_in.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe un cliente con ese código.")
    
    new_client = Client(**client_in.dict())
    db.add(new_client)
    db.commit()
    db.refresh(new_client)
    return new_client

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
        "projects": [{"id": p.id, "code": p.code, "name": p.name, "status": p.status, "contract_amount_usd": p.contract_amount_usd} for p in projects],
        "quotations": [{"id": q.id, "quote_number": q.quote_number, "project_title": q.project_title, "total_usd": q.total_usd, "status": q.status} for q in quotations]
    }
