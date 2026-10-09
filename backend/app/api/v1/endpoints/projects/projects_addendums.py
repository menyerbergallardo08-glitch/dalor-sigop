from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Response, Query
from sqlalchemy.orm import Session, joinedload, selectinload
from typing import List, Optional
from datetime import datetime, timedelta
import re
from sqlalchemy import func
from app.core.database import get_db
from app.models.models import (
    Project, Client, Expense, ProjectPhase, Asset, Personnel, 
    ResourceAssignmentHistory, AccountReceivable, AccountPayable, 
    FinancialPayment, ProjectAddendum, AuditLog, Material, 
    ProjectMaterialRequisition, MaterialMovement, User
)
from app.schemas.schemas import ProjectCreate, ProjectUpdate, ProjectOut, ProjectAddendumCreate, ProjectAddendumOut
from app.services.excel_service import ExcelProjectService
from .projects_common import *

router = APIRouter()

@router.post("/{project_id}/addendums", response_model=ProjectAddendumOut)
def create_project_addendum(project_id: int, payload: ProjectAddendumCreate, db: Session = Depends(get_db)):
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado.")
    
    if payload.additional_contract_usd <= 0:
        raise HTTPException(status_code=400, detail="El monto adicional del contrato debe ser mayor a 0.")
    
    curr_addendums = db.query(ProjectAddendum).filter(ProjectAddendum.project_id == project_id).all()
    next_num = len(curr_addendums) + 1

    addendum = ProjectAddendum(
        project_id=project_id,
        addendum_number=next_num,
        title=payload.title.strip(),
        scope_description=payload.scope_description.strip() if payload.scope_description else None,
        additional_contract_usd=round(payload.additional_contract_usd, 2),
        additional_materials_usd=round(payload.additional_materials_usd or 0.0, 2),
        additional_labor_usd=round(payload.additional_labor_usd or 0.0, 2),
        additional_services_usd=round(payload.additional_services_usd or 0.0, 2),
        authorized_by=payload.authorized_by or "Dirección General",
        approval_date=datetime.utcnow(),
        created_at=datetime.utcnow()
    )
    db.add(addendum)

    # Actualizar valores contractuales y presupuestarios del proyecto
    proj.contract_amount_usd = round((proj.contract_amount_usd or 0.0) + payload.additional_contract_usd, 2)
    proj.estimated_materials_usd = round((proj.estimated_materials_usd or 0.0) + (payload.additional_materials_usd or 0.0), 2)
    proj.estimated_labor_usd = round((proj.estimated_labor_usd or 0.0) + (payload.additional_labor_usd or 0.0), 2)
    proj.estimated_services_usd = round((proj.estimated_services_usd or 0.0) + (payload.additional_services_usd or 0.0), 2)
    proj.budget_limit_usd = round(
        (proj.estimated_labor_usd or 0.0) +
        (proj.estimated_fuel_usd or 0.0) +
        (proj.estimated_materials_usd or 0.0) +
        (proj.estimated_tools_usd or 0.0) +
        (proj.estimated_services_usd or 0.0),
        2
    )

    # Si el proyecto estaba culminado, se reactiva a activo al aprobarse la adenda
    if proj.status == "culminado":
        proj.status = "activo"

    # Siempre crear una fase/etapa en el cronograma para la adenda
    phase_name = payload.new_phase_name.strip() if payload.new_phase_name else f"Etapa Adenda N° {next_num}: {payload.title}".strip()
    curr_phases = db.query(ProjectPhase).filter(ProjectPhase.project_id == project_id).all()
    new_phase = ProjectPhase(
        project_id=project_id,
        phase_number=len(curr_phases) + 1,
        name=phase_name,
        description=f"Adenda N° {next_num}: {payload.title}. {payload.scope_description or ''}".strip(),
        duration_days=payload.new_phase_duration_days or 7,
        estimated_cost_usd=round(payload.additional_contract_usd, 2),
        status="pendiente",
        responsible_person=payload.authorized_by or "Residente de Obra"
    )
    db.add(new_phase)

    # Generar automáticamente la Cuenta por Cobrar (CxC) de la Adenda
    target_client_id = proj.client_id
    if not target_client_id:
        if proj.client_name:
            c_match = db.query(Client).filter(Client.name.ilike(f"%{proj.client_name}%")).first()
            if c_match:
                target_client_id = c_match.id
        if not target_client_id:
            c_first = db.query(Client).first()
            if c_first:
                target_client_id = c_first.id

    cxc_inv_code = None
    if target_client_id:
        base_inv = f"ADENDA-{proj.code}-{next_num:02d}"
        cxc_inv_code = base_inv
        suffix = 1
        while db.query(AccountReceivable).filter(AccountReceivable.invoice_number == cxc_inv_code).first():
            cxc_inv_code = f"{base_inv}-{suffix}"
            suffix += 1

        cxc_entry = AccountReceivable(
            project_id=proj.id,
            client_id=target_client_id,
            invoice_number=cxc_inv_code,
            description=f"Adenda N° {next_num}: {payload.title}".strip(),
            issue_date=datetime.utcnow(),
            due_date=datetime.utcnow() + timedelta(days=30),
            taxable_base_usd=round(payload.additional_contract_usd, 2),
            tax_amount_usd=0.0,
            amount_usd=round(payload.additional_contract_usd, 2),
            paid_amount_usd=0.0,
            balance_usd=round(payload.additional_contract_usd, 2),
            net_amount_usd=round(payload.additional_contract_usd, 2),
            status="pendiente",
            notes=f"Generado automáticamente por registro de Adenda N° {next_num}. {payload.scope_description or ''}".strip()
        )
        db.add(cxc_entry)

    # Registrar en Auditoría
    audit = AuditLog(
        username=payload.authorized_by or "Dirección General",
        module="proyectos",
        action="crear_adenda_obra_extra",
        details=f"Adenda N° {next_num} ({payload.title}) en {proj.code}: +${payload.additional_contract_usd:.2f} USD. Nuevo Techo: ${proj.contract_amount_usd:.2f} USD. CxC generada: {cxc_inv_code or 'Sin Cliente'}."
    )
    db.add(audit)

    db.commit()
    db.refresh(addendum)
    return addendum
