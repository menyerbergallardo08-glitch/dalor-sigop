import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.models import Expense
from app.services.storage import R2StorageService

router = APIRouter()

@router.get("/{expense_id}/receipt")
def get_expense_receipt(expense_id: int, db: Session = Depends(get_db)):
    exp = db.query(Expense).filter(Expense.id == expense_id).first()
    if not exp or not exp.receipt_image_path:
        raise HTTPException(status_code=404, detail="Comprobante digital no encontrado.")
    fresh_url = R2StorageService.get_file_url(exp.receipt_image_path)
    if fresh_url and fresh_url.startswith("data:") and exp.receipt_image_path.startswith("/uploads/"):
        try:
            exp.receipt_image_path = fresh_url
            db.commit()
        except Exception:
            pass
    return {"receipt_image_path": fresh_url}

@router.post("/{expense_id}/receipt")
async def upload_expense_receipt(
    expense_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Adjunta o actualiza el comprobante/factura de un gasto existente,
    resguardándolo de forma permanente e inmune a reinicios.
    """
    exp = db.query(Expense).filter(Expense.id == expense_id).first()
    if not exp:
        raise HTTPException(status_code=404, detail="Gasto no encontrado.")
    
    contents = await file.read()
    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    unique_name = f"receipt_{expense_id}_{uuid.uuid4().hex[:8]}.{ext}"
    
    image_url, _ = R2StorageService.upload_receipt_image(contents, unique_name)
    exp.receipt_image_path = image_url
    exp.has_receipt = True
    db.commit()
    db.refresh(exp)
    
    return {
        "success": True,
        "message": "Comprobante digital actualizado y respaldado exitosamente.",
        "receipt_image_path": image_url
    }
