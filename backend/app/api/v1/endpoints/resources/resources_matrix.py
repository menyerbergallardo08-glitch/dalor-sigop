from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import Asset, Personnel

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
