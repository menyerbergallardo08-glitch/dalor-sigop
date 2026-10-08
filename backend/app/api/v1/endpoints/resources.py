from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
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

    veh_in_base = [v for v in vehicles if not v.current_project_id and v.status == "disponible_base"]
    veh_in_project = [v for v in vehicles if v.current_project_id or v.status in ["en_obra", "en_operacion", "asignado"]]

    mach_in_base = [m for m in machinery if not m.current_project_id and m.status == "disponible_base"]
    mach_in_project = [m for m in machinery if m.current_project_id or m.status in ["en_obra", "en_operacion", "asignado"]]

    tools_in_base = [t for t in tools if not t.current_project_id and t.status == "disponible_base"]
    tools_in_project = [t for t in tools if t.current_project_id or t.status in ["en_obra", "en_operacion", "asignado"]]

    personnel_in_base = [p for p in personnel if not p.current_project_id and p.status == "disponible_base"]
    personnel_in_project = [p for p in personnel if p.current_project_id or p.status in ["en_obra", "en_operacion", "asignado"]]

    return {
        "summary": {
            "total_assets": len(assets),
            "vehicles_total": len(vehicles),
            "vehicles_available_base": len(veh_in_base),
            "vehicles_in_operation": len(veh_in_project),
            "machinery_total": len(machinery),
            "machinery_available_base": len(mach_in_base),
            "machinery_in_operation": len(mach_in_project),
            "tools_total": len(tools),
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
                "status": "en_obra" if a.current_project_id else (a.status if a.status in ["en_operacion", "asignado"] else "disponible_base"),
                "location": (
                    f"Obra [{a.current_project.code}] - {a.current_project.name}" + (f" ({a.current_project.location})" if a.current_project.location else "")
                ) if (a.current_project_id and a.current_project) else (a.current_location or "Sede Central Dalor (Guacara)"),
                "project_id": a.current_project_id,
                "project_code": a.current_project.code if a.current_project else None,
                "custodian": (
                    (a.current_custodian_name if (a.current_custodian_name and "base" not in a.current_custodian_name.lower()) else "En Operación de Obra")
                    if a.current_project_id
                    else (a.current_custodian_name or ("Disponible en Base" if a.status not in ["en_operacion", "asignado"] else "Asignado a Custodio"))
                ),
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
                "location": (
                    f"Obra [{p.current_project.code}] - {p.current_project.name}" + (f" ({p.current_project.location})" if p.current_project.location else "")
                ) if (p.current_project_id and p.current_project) else "Sede Central Dalor (Guacara)",
                "project_id": p.current_project_id,
                "project_code": p.current_project.code if p.current_project else None,
                "project_name": p.current_project.name if p.current_project else None,
                "project_location": p.current_project.location if p.current_project else None,
            } for p in personnel
        ]
    }

@router.post("/assign")
def assign_resource(req: ResourceAssignRequest, db: Session = Depends(get_db)):
    project = None
    if req.project_id and req.project_id != 0:
        project = db.query(Project).filter(Project.id == req.project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Proyecto no encontrado.")

        st = (project.status or "").lower().strip()
        if st in ["culminado", "completado", "cerrado", "cancelado", "finalizado", "inactivo"]:
            raise HTTPException(
                status_code=400,
                detail=f"Operación rechazada: La obra [{project.code}] '{project.name}' se encuentra {st.upper()} y no admite asignación de recursos."
            )

    dest_loc = req.destination_location or (project.location if project else "Sede Central Dalor (Uso Administrativo / Logística)")
    resource_name = ""
    resource_code = ""

    if req.resource_type == "asset":
        asset = db.query(Asset).filter(Asset.id == req.resource_id).first()
        if not asset:
            raise HTTPException(status_code=404, detail="Activo no encontrado.")
        
        if project:
            asset.status = "en_obra"
            asset.current_project_id = project.id
            asset.current_location = dest_loc
            if req.custodian_name and req.custodian_name.strip() and "base" not in req.custodian_name.lower():
                asset.current_custodian_name = req.custodian_name.strip()
            else:
                asset.current_custodian_name = "En Operación de Obra"
        else:
            asset.status = "en_operacion"
            asset.current_project_id = None
            asset.current_location = dest_loc
            asset.current_custodian_name = req.custodian_name.strip() if req.custodian_name and req.custodian_name.strip() else "Asignado a Custodio"

        if req.start_odometer:
            asset.current_odometer = req.start_odometer
        resource_name = asset.name
        resource_code = asset.asset_code

    elif req.resource_type == "personnel":
        person = db.query(Personnel).filter(Personnel.id == req.resource_id).first()
        if not person:
            raise HTTPException(status_code=404, detail="Personal no encontrado.")
        person.status = "en_obra" if project else "en_operacion"
        person.current_project_id = project.id if project else None
        person.current_location = dest_loc
        resource_name = person.full_name
        resource_code = person.code

    # Registrar en bitácora histórica
    history = ResourceAssignmentHistory(
        project_id=project.id if project else None,
        resource_type=req.resource_type,
        resource_id=req.resource_id,
        resource_code=resource_code,
        resource_name=resource_name,
        custodian_name=req.custodian_name or ("Custodio Asignado" if not project else "En Operación"),
        start_odometer=req.start_odometer,
        origin_location="Sede Central",
        destination_location=dest_loc,
        status="en_obra" if project else "en_operacion",
        notes=req.notes or ("Asignación operativa a custodia en Sede Central" if not project else "Asignación a obra")
    )

    db.add(history)
    db.commit()
    dest_label = f"la obra {project.code}" if project else "Uso Administrativo / Logística en Sede Central"
    return {"success": True, "message": f"{resource_name} asignado exitosamente a {dest_label}."}

@router.post("/transfer")
def transfer_resource(req: ResourceTransferRequest, db: Session = Depends(get_db)):
    target_project = None
    if req.target_project_id and req.target_project_id != 0:
        target_project = db.query(Project).filter(Project.id == req.target_project_id).first()
        if not target_project:
            raise HTTPException(status_code=404, detail="Proyecto destino no encontrado.")

        st = (target_project.status or "").lower().strip()
        if st in ["culminado", "completado", "cerrado", "cancelado", "finalizado", "inactivo"]:
            raise HTTPException(
                status_code=400,
                detail=f"Operación rechazada: La obra destino [{target_project.code}] '{target_project.name}' se encuentra {st.upper()} y no admite transferencia de recursos."
            )

    dest_loc = req.destination_location or (target_project.location if target_project else "Sede Central Dalor (Uso Administrativo / Logística)")
    resource_name = ""
    resource_code = ""
    prev_location = "Sede Central"

    if req.resource_type == "asset":
        asset = db.query(Asset).filter(Asset.id == req.resource_id).first()
        if not asset:
            raise HTTPException(status_code=404, detail="Activo no encontrado.")
        prev_location = asset.current_location or "Sede Central"
        asset.current_project_id = target_project.id if target_project else None
        asset.status = "en_obra" if target_project else "en_operacion"
        asset.current_location = dest_loc
        if req.custodian_name and req.custodian_name.strip():
            asset.current_custodian_name = req.custodian_name.strip()
        elif not target_project:
            asset.current_custodian_name = "Asignado a Custodio"
        if req.current_odometer:
            asset.current_odometer = req.current_odometer
        resource_name = asset.name
        resource_code = asset.asset_code

    elif req.resource_type == "personnel":
        person = db.query(Personnel).filter(Personnel.id == req.resource_id).first()
        if not person:
            raise HTTPException(status_code=404, detail="Personal no encontrado.")
        prev_location = person.current_location or "Sede Central"
        person.current_project_id = target_project.id if target_project else None
        person.status = "en_obra" if target_project else "en_operacion"
        person.current_location = dest_loc
        resource_name = person.full_name
        resource_code = person.code

    history = ResourceAssignmentHistory(
        project_id=target_project.id if target_project else None,
        resource_type=req.resource_type,
        resource_id=req.resource_id,
        resource_code=resource_code,
        resource_name=resource_name,
        custodian_name=req.custodian_name or ("Custodio Asignado" if not target_project else "En Operación"),
        start_odometer=req.current_odometer,
        origin_location=prev_location,
        destination_location=dest_loc,
        status="en_obra" if target_project else "en_operacion",
        notes=f"Transferencia: {req.notes or ('Traslado a Sede Central' if not target_project else 'Transferencia a obra')}"
    )

    db.add(history)
    db.commit()
    dest_label = f"la obra {target_project.code}" if target_project else "Sede Central (Uso Administrativo / Logística)"
    return {"success": True, "message": f"{resource_name} transferido exitosamente a {dest_label}."}

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
        asset.current_location = req.return_location or "Sede Central Dalor (Guacara)"
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
        person.current_location = req.return_location or "Sede Central Dalor (Guacara)"
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
        destination_location=req.return_location or "Sede Central Dalor (Guacara)",
        status="disponible_base",
        notes="Desmovilización y retorno conforme a Base Central"
    )
    db.add(history)
    db.commit()
    return {"success": True, "message": f"{resource_name} retornado exitosamente a {req.return_location or 'Sede Central Dalor (Guacara)'} (Disponible)."}

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


class ResourceSubstituteRequest(BaseModel):
    project_id: int
    resource_type: str  # 'personnel' or 'asset'
    old_id: int
    new_id: int
    reason: Optional[str] = "Reemplazo operativo en obra"
    notes: Optional[str] = None

@router.post("/substitute")
def substitute_resource(req: ResourceSubstituteRequest, db: Session = Depends(get_db)):
    """
    Sustituye un recurso asignado en obra por otro disponible en base central,
    retornando el anterior y registrando la traza completa de auditoría.
    """
    project = db.query(Project).filter(Project.id == req.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Proyecto u obra no encontrada.")

    old_name, old_code = "", ""
    new_name, new_code = "", ""

    if req.resource_type == "personnel":
        old_res = db.query(Personnel).filter(Personnel.id == req.old_id).first()
        new_res = db.query(Personnel).filter(Personnel.id == req.new_id).first()
        if not old_res:
            raise HTTPException(status_code=404, detail="Personal a sustituir no encontrado.")
        if not new_res:
            raise HTTPException(status_code=404, detail="Nuevo personal seleccionado no encontrado.")

        old_name, old_code = old_res.full_name, old_res.code
        new_name, new_code = new_res.full_name, new_res.code

        old_res.current_project_id = None
        old_res.status = "disponible_base"
        old_res.current_location = "Sede Central Dalor (Guacara)"

        new_res.current_project_id = project.id
        new_res.status = "en_obra"
        new_res.current_location = project.location or "En Obra"

    elif req.resource_type == "asset":
        old_res = db.query(Asset).filter(Asset.id == req.old_id).first()
        new_res = db.query(Asset).filter(Asset.id == req.new_id).first()
        if not old_res:
            raise HTTPException(status_code=404, detail="Herramienta/Activo a sustituir no encontrado.")
        if not new_res:
            raise HTTPException(status_code=404, detail="Nuevo activo/herramienta seleccionado no encontrado.")

        old_name, old_code = old_res.name, old_res.asset_code
        new_name, new_code = new_res.name, new_res.asset_code

        old_res.current_project_id = None
        old_res.status = "disponible_base"
        old_res.current_location = "Sede Central Dalor (Guacara)"
        old_res.current_custodian_name = "Disponible en Base"

        new_res.current_project_id = project.id
        new_res.status = "en_obra"
        new_res.current_location = project.location or "En Obra"
        new_res.current_custodian_name = f"Asignado a {project.code}"
    else:
        raise HTTPException(status_code=400, detail="Tipo de recurso no soportado (debe ser 'personnel' o 'asset').")

    hist_old = ResourceAssignmentHistory(
        project_id=project.id,
        resource_type=req.resource_type,
        resource_id=req.old_id,
        resource_code=old_code,
        resource_name=old_name,
        custodian_name="Base Central",
        origin_location=project.location or "En Obra",
        destination_location="Sede Central Dalor (Guacara)",
        status="disponible_base",
        notes=f"Sustituido en obra por [{new_code}] {new_name}. Motivo: {req.reason}. {req.notes or ''}".strip()
    )
    hist_new = ResourceAssignmentHistory(
        project_id=project.id,
        resource_type=req.resource_type,
        resource_id=req.new_id,
        resource_code=new_code,
        resource_name=new_name,
        custodian_name=f"Obra {project.code}",
        origin_location="Sede Central Dalor (Guacara)",
        destination_location=project.location or "En Obra",
        status="en_obra",
        notes=f"Asignado en obra en sustitución de [{old_code}] {old_name}. Motivo: {req.reason}. {req.notes or ''}".strip()
    )

    db.add(hist_old)
    db.add(hist_new)
    db.commit()

    return {
        "success": True,
        "message": f"Sustitución exitosa: [{old_code}] {old_name} retornado a Base y [{new_code}] {new_name} asignado a obra."
    }

