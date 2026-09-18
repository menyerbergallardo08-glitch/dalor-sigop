from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from app.core.database import get_db
from app.models.models import Asset, Personnel, Project, ResourceAssignmentHistory
from app.schemas.schemas import ResourceAssignRequest, ResourceTransferRequest, ResourceReturnRequest

router = APIRouter()

@router.get("/matrix-status")
def get_resource_matrix_status(db: Session = Depends(get_db)):
    """
    Retorna el estado de disponibilidad y ubicación de todos los activos, vehículos y personal.
    """
    assets = db.query(Asset).filter(Asset.is_active == True).all()
    personnel = db.query(Personnel).filter(Personnel.is_active == True).all()

    vehicles = [a for a in assets if a.asset_type in ["vehiculo", "camioneta", "camion", "remolque"]]
    machinery = [a for a in assets if a.asset_type in ["maquinaria", "generador", "compresor", "planta"]]
    tools = [a for a in assets if a.asset_type not in ["vehiculo", "camioneta", "camion", "remolque", "maquinaria", "generador", "compresor", "planta"]]

    veh_in_base = [v for v in vehicles if not v.current_project_id or v.status == "disponible_base"]
    veh_in_project = [v for v in vehicles if v.current_project_id and v.status == "en_obra"]

    mach_in_base = [m for m in machinery if not m.current_project_id or m.status == "disponible_base"]
    mach_in_project = [m for m in machinery if m.current_project_id and m.status == "en_obra"]

    tools_in_base = [t for t in tools if not t.current_project_id or t.status == "disponible_base"]
    tools_in_project = [t for t in tools if t.current_project_id and t.status == "en_obra"]

    personnel_in_base = [p for p in personnel if not p.current_project_id or p.status == "disponible_base"]
    personnel_in_project = [p for p in personnel if p.current_project_id and p.status == "en_obra"]

    return {
        "summary": {
            "total_assets": len(assets),
            "vehicles_available_base": len(veh_in_base),
            "vehicles_in_operation": len(veh_in_project),
            "machinery_available_base": len(mach_in_base),
            "machinery_in_operation": len(mach_in_project),
            "tools_available_base": len(tools_in_base),
            "tools_in_operation": len(tools_in_project),
            "total_personnel": len(personnel),
            "personnel_available_base": len(personnel_in_base),
            "personnel_in_operation": len(personnel_in_project),
        },
        "assets": [
            {
                "id": a.id,
                "code": a.asset_code,
                "name": a.name,
                "type": a.asset_type,
                "status": "en_obra" if a.current_project_id else "disponible_base",
                "location": a.current_location or "Sede Central",
                "project_id": a.current_project_id,
                "project_name": a.current_project.name if a.current_project else None,
                "custodian": a.current_custodian_name or "Sin Asignar",
                "odometer": a.current_odometer or 0.0,
                "is_exclusive": a.is_exclusive
            } for a in assets
        ],
        "personnel": [
            {
                "id": p.id,
                "code": p.code,
                "name": p.full_name,
                "role": p.role_title,
                "status": "en_obra" if p.current_project_id else "disponible_base",
                "location": p.current_location or "Sede Central",
                "project_id": p.current_project_id,
                "project_name": p.current_project.name if p.current_project else None
            } for p in personnel
        ]
    }

@router.post("/assign")
def assign_resource(req: ResourceAssignRequest, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == req.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado.")

    resource_name = ""
    resource_code = ""

    if req.resource_type == "asset":
        asset = db.query(Asset).filter(Asset.id == req.resource_id).first()
        if not asset:
            raise HTTPException(status_code=404, detail="Activo no encontrado.")
        asset.status = "en_obra"
        asset.current_project_id = project.id
        asset.current_location = req.destination_location or project.location
        if req.custodian_name:
            asset.current_custodian_name = req.custodian_name
        if req.start_odometer:
            asset.current_odometer = req.start_odometer
        resource_name = asset.name
        resource_code = asset.asset_code

    elif req.resource_type == "personnel":
        person = db.query(Personnel).filter(Personnel.id == req.resource_id).first()
        if not person:
            raise HTTPException(status_code=404, detail="Personal no encontrado.")
        person.status = "en_obra"
        person.current_project_id = project.id
        person.current_location = req.destination_location or project.location
        resource_name = person.full_name
        resource_code = person.code

    # Registrar en bitácora histórica
    history = ResourceAssignmentHistory(
        project_id=project.id,
        resource_type=req.resource_type,
        resource_id=req.resource_id,
        resource_code=resource_code,
        resource_name=resource_name,
        custodian_name=req.custodian_name,
        start_odometer=req.start_odometer,
        origin_location="Sede Central",
        destination_location=req.destination_location or project.location,
        status="en_obra",
        notes=req.notes
    )

    db.add(history)
    db.commit()
    return {"success": True, "message": f"{resource_name} asignado a {project.code} ({req.destination_location})."}

@router.post("/transfer")
def transfer_resource(req: ResourceTransferRequest, db: Session = Depends(get_db)):
    target_project = db.query(Project).filter(Project.id == req.target_project_id).first()
    if not target_project:
        raise HTTPException(status_code=404, detail="Proyecto destino no encontrado.")

    resource_name = ""
    resource_code = ""
    prev_location = "Sede Central"

    if req.resource_type == "asset":
        asset = db.query(Asset).filter(Asset.id == req.resource_id).first()
        if not asset:
            raise HTTPException(status_code=404, detail="Activo no encontrado.")
        prev_location = asset.current_location or "Sede Central"
        asset.current_project_id = target_project.id
        asset.current_location = req.destination_location or target_project.location
        if req.custodian_name:
            asset.current_custodian_name = req.custodian_name
        if req.current_odometer:
            asset.current_odometer = req.current_odometer
        resource_name = asset.name
        resource_code = asset.asset_code

    elif req.resource_type == "personnel":
        person = db.query(Personnel).filter(Personnel.id == req.resource_id).first()
        if not person:
            raise HTTPException(status_code=404, detail="Personal no encontrado.")
        prev_location = person.current_location or "Sede Central"
        person.current_project_id = target_project.id
        person.current_location = req.destination_location or target_project.location
        resource_name = person.full_name
        resource_code = person.code

    history = ResourceAssignmentHistory(
        project_id=target_project.id,
        resource_type=req.resource_type,
        resource_id=req.resource_id,
        resource_code=resource_code,
        resource_name=resource_name,
        custodian_name=req.custodian_name,
        start_odometer=req.current_odometer,
        origin_location=prev_location,
        destination_location=req.destination_location or target_project.location,
        status="en_obra",
        notes=f"Transferencia directa: {req.notes or ''}"
    )

    db.add(history)
    db.commit()
    return {"success": True, "message": f"{resource_name} transferido a {target_project.code} ({req.destination_location})."}

@router.post("/return-to-base")
@router.post("/return")
def return_resource_to_base(req: ResourceReturnRequest, db: Session = Depends(get_db)):
    resource_name = ""
    resource_code = ""
    last_proj_id = 1
    if req.resource_type == "asset":
        asset = db.query(Asset).filter(Asset.id == req.resource_id).first()
        if not asset:
            raise HTTPException(status_code=404, detail="Activo no encontrado.")
        last_proj_id = asset.current_project_id or 1
        asset.status = "disponible_base"
        asset.current_project_id = None
        asset.current_location = req.return_location or "Sede Central Dalor"
        asset.current_custodian_name = "Disponible en Base"
        if req.end_odometer:
            asset.current_odometer = req.end_odometer
        resource_name = asset.name
        resource_code = asset.asset_code

    elif req.resource_type == "personnel":
        person = db.query(Personnel).filter(Personnel.id == req.resource_id).first()
        if not person:
            raise HTTPException(status_code=404, detail="Personal no encontrado.")
        last_proj_id = person.current_project_id or 1
        person.status = "disponible_base"
        person.current_project_id = None
        person.current_location = req.return_location or "Sede Central Dalor"
        resource_name = person.full_name
        resource_code = person.code

    # Bitácora de retorno
    history = ResourceAssignmentHistory(
        project_id=last_proj_id,
        resource_type=req.resource_type,
        resource_id=req.resource_id,
        resource_code=resource_code,
        resource_name=resource_name,
        custodian_name="Custodio Base",
        start_odometer=req.end_odometer,
        origin_location="Planta / Obra",
        destination_location=req.return_location or "Sede Central Dalor",
        status="disponible_base",
        notes="Desmovilización y retorno conforme a Base Central"
    )
    db.add(history)
    db.commit()
    return {"success": True, "message": f"{resource_name} retornado exitosamente a {req.return_location or 'Sede Central Dalor'} (Disponible)."}

@router.get("/history")
def get_resource_history(name: str = None, query: str = None, resource_id: int = None, db: Session = Depends(get_db)):
    q = db.query(ResourceAssignmentHistory)
    if resource_id:
        q = q.filter(ResourceAssignmentHistory.resource_id == resource_id)
    search_term = name or query
    if search_term:
        term = f"%{search_term.strip()}%"
        q = q.filter((ResourceAssignmentHistory.resource_name.ilike(term)) | (ResourceAssignmentHistory.resource_code.ilike(term)))
    records = q.order_by(ResourceAssignmentHistory.assigned_at.desc()).limit(100).all()
    return [{
        "id": r.id,
        "transfer_code": r.transfer_code or "S/C",
        "resource_code": r.resource_code or "-",
        "resource_name": r.resource_name or "-",
        "resource_type": r.resource_type,
        "project_name": r.project.name if r.project else "Sede Central",
        "custodian_name": r.custodian_name or "-",
        "driver_name": r.driver_name or "-",
        "origin_location": r.origin_location,
        "destination_location": r.destination_location,
        "status": r.status,
        "notes": r.notes or "-",
        "assigned_at": r.assigned_at.strftime("%Y-%m-%d %H:%M:%S") if r.assigned_at else ""
    } for r in records]
