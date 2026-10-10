from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime

from app.core.database import get_db
from app.models.models import Asset, Personnel, Project, ResourceAssignmentHistory
from app.schemas.schemas import ResourceAssignRequest, ResourceTransferRequest, ResourceReturnRequest
from .resources_common import ResourceSubstituteRequest

router = APIRouter()

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

    odo_val = req.start_odometer if req.start_odometer is not None else req.odometer_reading
    if req.resource_type == "asset":
        res = db.query(Asset).filter(Asset.id == req.resource_id).first()
        if not res:
            raise HTTPException(status_code=404, detail="Activo/Herramienta no encontrado.")
        resource_name = res.name
        resource_code = res.asset_code

        res.current_project_id = project.id if project else None
        res.status = "en_obra" if project else "asignado"
        res.current_location = dest_loc
        res.current_custodian_name = req.custodian_name
        if odo_val is not None:
            res.current_odometer = odo_val

    elif req.resource_type == "personnel":
        res = db.query(Personnel).filter(Personnel.id == req.resource_id).first()
        if not res:
            raise HTTPException(status_code=404, detail="Personal no encontrado.")
        resource_name = res.full_name
        resource_code = res.code

        res.current_project_id = project.id if project else None
        res.status = "en_obra" if project else "disponible_base"
        res.current_location = dest_loc
    else:
        raise HTTPException(status_code=400, detail="Tipo de recurso inválido (asset o personnel).")

    history = ResourceAssignmentHistory(
        project_id=project.id if project else None,
        resource_type=req.resource_type,
        resource_id=req.resource_id,
        resource_code=resource_code,
        resource_name=resource_name,
        custodian_name=req.custodian_name,
        origin_location="Sede Central Dalor (Guacara)",
        destination_location=dest_loc,
        start_odometer=odo_val,
        status="en_obra" if project else "asignado",
        notes=req.notes
    )
    db.add(history)
    db.commit()

    return {
        "success": True,
        "message": f"Recurso [{resource_code}] {resource_name} asignado exitosamente.",
        "project_code": project.code if project else "DALOR-BASE"
    }

@router.post("/transfer")
def transfer_resource(req: ResourceTransferRequest, db: Session = Depends(get_db)):
    from_project = db.query(Project).filter(Project.id == req.from_project_id).first() if req.from_project_id else None
    to_project = db.query(Project).filter(Project.id == req.to_project_id).first() if req.to_project_id else None

    if req.to_project_id and not to_project:
        raise HTTPException(status_code=404, detail="Proyecto destino no encontrado.")

    if to_project:
        st_to = (to_project.status or "").lower().strip()
        if st_to in ["culminado", "completado", "cerrado", "cancelado", "finalizado", "inactivo"]:
            raise HTTPException(
                status_code=400,
                detail=f"Operación rechazada: La obra destino [{to_project.code}] '{to_project.name}' se encuentra {st_to.upper()} y no admite transferencias."
            )

    origin_loc = from_project.location if from_project else "Sede Central Dalor (Guacara)"
    dest_loc = req.destination_location or (to_project.location if to_project else "Sede Central Dalor")
    resource_name = ""
    resource_code = ""

    if req.resource_type == "asset":
        res = db.query(Asset).filter(Asset.id == req.resource_id).first()
        if not res:
            raise HTTPException(status_code=404, detail="Activo no encontrado.")
        resource_name = res.name
        resource_code = res.asset_code

        res.current_project_id = to_project.id if to_project else None
        res.status = "en_obra" if to_project else "disponible_base"
        res.current_location = dest_loc
        if req.custodian_name:
            res.current_custodian_name = req.custodian_name
        if req.odometer_reading:
            res.current_odometer = req.odometer_reading

    elif req.resource_type == "personnel":
        res = db.query(Personnel).filter(Personnel.id == req.resource_id).first()
        if not res:
            raise HTTPException(status_code=404, detail="Personal no encontrado.")
        resource_name = res.full_name
        resource_code = res.code

        res.current_project_id = to_project.id if to_project else None
        res.status = "en_obra" if to_project else "disponible_base"
        res.current_location = dest_loc

    transfer_code = f"TRF-{int(datetime.utcnow().timestamp())}"
    history = ResourceAssignmentHistory(
        project_id=to_project.id if to_project else None,
        resource_type=req.resource_type,
        resource_id=req.resource_id,
        resource_code=resource_code,
        resource_name=resource_name,
        custodian_name=req.custodian_name,
        driver_name=req.driver_name,
        transfer_code=transfer_code,
        origin_location=origin_loc,
        destination_location=dest_loc,
        start_odometer=req.odometer_reading,
        status="en_obra" if to_project else "disponible_base",
        notes=f"Transferido de {from_project.code if from_project else 'Base'} a {to_project.code if to_project else 'Base'}. {req.notes or ''}".strip()
    )
    db.add(history)
    db.commit()

    return {
        "success": True,
        "message": f"Recurso [{resource_code}] {resource_name} transferido exitosamente.",
        "transfer_code": transfer_code
    }

@router.post("/return-to-base")
@router.post("/return")
def return_resource_to_base(req: ResourceReturnRequest, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == req.project_id).first() if req.project_id else None
    origin_loc = project.location if project else "Ubicación en Operación"
    resource_name = ""
    resource_code = ""

    odo_val = req.end_odometer if req.end_odometer is not None else req.odometer_reading
    dest_loc = req.return_location or "Sede Central Dalor (Guacara)"

    if req.resource_type == "asset":
        res = db.query(Asset).filter(Asset.id == req.resource_id).first()
        if not res:
            raise HTTPException(status_code=404, detail="Activo no encontrado.")
        resource_name = res.name
        resource_code = res.asset_code
        origin_loc = res.current_location or (project.location if project else "Ubicación en Operación")

        res.current_project_id = None
        res.status = "disponible_base"
        res.current_location = dest_loc
        res.current_custodian_name = "Disponible en Base"
        if odo_val:
            res.current_odometer = odo_val

    elif req.resource_type == "personnel":
        res = db.query(Personnel).filter(Personnel.id == req.resource_id).first()
        if not res:
            raise HTTPException(status_code=404, detail="Personal no encontrado.")
        resource_name = res.full_name
        resource_code = res.code
        origin_loc = res.current_location or (project.location if project else "Ubicación en Operación")

        res.current_project_id = None
        res.status = "disponible_base"
        res.current_location = dest_loc

    history = ResourceAssignmentHistory(
        project_id=project.id if project else None,
        resource_type=req.resource_type,
        resource_id=req.resource_id,
        resource_code=resource_code,
        resource_name=resource_name,
        custodian_name="Base Central",
        origin_location=origin_loc,
        destination_location=dest_loc,
        start_odometer=odo_val,
        status="disponible_base",
        notes=f"Retornado a Base desde {project.code if project else origin_loc}. Condición: {req.return_condition or 'Conforme'}. {req.notes or ''}".strip()
    )
    db.add(history)
    db.commit()

    return {
        "success": True,
        "message": f"Recurso [{resource_code}] {resource_name} retornado exitosamente a Base Dalor."
    }

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
