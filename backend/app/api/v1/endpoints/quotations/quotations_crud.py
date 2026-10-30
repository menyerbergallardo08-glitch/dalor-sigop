"""
CRUD operations for Quotations (Presupuestos & APU).
"""
from app.api.deps import get_current_active_user
from .quotations_common import (
    APIRouter, Depends, HTTPException, Session, List, datetime, re,
    get_db, Quotation, QuotationItem, Client,
    QuotationCreate, QuotationUpdate, QuotationOut
)

router = APIRouter(dependencies=[Depends(get_current_active_user)])

def compute_next_quotation_number(db: Session, current_year: int = None) -> str:
    """
    Calcula el siguiente correlativo secuencial para cotizaciones basándose
    en el número máximo real en la base de datos (evita colisiones por conteo simple o registros borrados).
    """
    if current_year is None:
        current_year = datetime.utcnow().year

    quotes = db.query(Quotation.quote_number).all()
    max_seq = 0
    pattern = re.compile(rf"COT-{current_year}-(\d+)", re.IGNORECASE)
    for (q_num,) in quotes:
        if q_num:
            m = pattern.search(q_num)
            if m:
                try:
                    num = int(m.group(1))
                    if num > max_seq:
                        max_seq = num
                except ValueError:
                    pass

    next_num = max_seq + 1
    # Asegurar que no colisione con ningún correlativo existente
    while db.query(Quotation.id).filter(Quotation.quote_number == f"COT-{current_year}-{next_num:04d}").first() is not None:
        next_num += 1

    return f"COT-{current_year}-{next_num:04d}"

@router.get("/", response_model=List[QuotationOut])
def get_quotations(db: Session = Depends(get_db)):
    return db.query(Quotation).order_by(Quotation.created_at.desc()).all()

@router.post("/", response_model=QuotationOut)
def create_quotation(quote_in: QuotationCreate, db: Session = Depends(get_db)):
    client = db.query(Client).filter(Client.id == quote_in.client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado.")

    # Generar correlativo si no viene o verificar si ya existe
    current_year = datetime.utcnow().year
    if quote_in.quote_number:
        existing = db.query(Quotation.id).filter(Quotation.quote_number == quote_in.quote_number).first()
        if existing:
            quote_number = compute_next_quotation_number(db, current_year)
        else:
            quote_number = quote_in.quote_number
    else:
        quote_number = compute_next_quotation_number(db, current_year)

    # Calcular Subtotal de renglones
    subtotal = 0.0
    items_objs = []
    for it in quote_in.items:
        if it.quantity <= 0:
            raise HTTPException(status_code=400, detail=f"La cantidad de la partida '{it.description}' debe ser mayor a cero.")
        if it.unit_price_usd < 0:
            raise HTTPException(status_code=400, detail=f"El precio unitario de la partida '{it.description}' no puede ser negativo.")
        line_total = round(it.quantity * it.unit_price_usd, 2)
        subtotal += line_total
        items_objs.append(QuotationItem(
            service_id=it.service_id,
            item_code=it.item_code,
            description=it.description,
            unit_measure=it.unit_measure,
            quantity=it.quantity,
            unit_price_usd=it.unit_price_usd,
            total_usd=line_total
        ))

    tax_pct = quote_in.tax_percent if quote_in.tax_percent is not None else 16.0
    tax_usd = round(subtotal * (tax_pct / 100.0), 2)
    total_usd = round(subtotal + tax_usd, 2)

    new_quote = Quotation(
        quote_number=quote_number,
        client_id=quote_in.client_id,
        project_title=quote_in.project_title,
        location=quote_in.location,
        execution_time=quote_in.execution_time or "15 días hábiles",
        currency=quote_in.currency or "USD",
        validity_days=quote_in.validity_days,
        exchange_rate=quote_in.exchange_rate,
        subtotal_usd=subtotal,
        tax_percent=tax_pct,
        tax_usd=tax_usd,
        total_usd=total_usd,
        status="borrador",
        coletilla_divisas=quote_in.coletilla_divisas if quote_in.coletilla_divisas is not None else True,
        coletilla_bolivares=quote_in.coletilla_bolivares if quote_in.coletilla_bolivares is not None else False,
        coletilla_modalidad=quote_in.coletilla_modalidad if quote_in.coletilla_modalidad is not None else True,
        notes=quote_in.notes,
        created_at=quote_in.created_at or datetime.utcnow(),
        items=items_objs
    )

    try:
        db.add(new_quote)
        db.commit()
        db.refresh(new_quote)
    except Exception as e:
        db.rollback()
        err_str = str(e).lower()
        if "unique" in err_str or "duplicate" in err_str:
            new_quote.quote_number = compute_next_quotation_number(db, current_year)
            try:
                db.add(new_quote)
                db.commit()
                db.refresh(new_quote)
            except Exception as e2:
                db.rollback()
                raise HTTPException(status_code=400, detail=f"Error de concurrencia al registrar presupuesto: {str(e2)}")
        else:
            raise HTTPException(status_code=400, detail=f"Error al registrar presupuesto: {str(e)}")

    return new_quote

@router.get("/{quotation_id}", response_model=QuotationOut)
@router.get("/{quotation_id}/", response_model=QuotationOut)
def get_quotation_by_id(quotation_id: int, db: Session = Depends(get_db)):
    quote = db.query(Quotation).filter(Quotation.id == quotation_id).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Cotización no encontrada.")
    return quote

@router.put("/{quotation_id}", response_model=QuotationOut)
@router.put("/{quotation_id}/", response_model=QuotationOut)
@router.post("/{quotation_id}", response_model=QuotationOut)
@router.post("/{quotation_id}/", response_model=QuotationOut)
@router.patch("/{quotation_id}", response_model=QuotationOut)
@router.patch("/{quotation_id}/", response_model=QuotationOut)
def update_quotation(quotation_id: int, quote_in: QuotationUpdate, db: Session = Depends(get_db)):
    quote = db.query(Quotation).filter(Quotation.id == quotation_id).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Cotización no encontrada.")
    
    if quote_in.client_id is not None:
        quote.client_id = quote_in.client_id
    if quote_in.project_title is not None:
        quote.project_title = quote_in.project_title
    if quote_in.location is not None:
        quote.location = quote_in.location
    if quote_in.execution_time is not None:
        quote.execution_time = quote_in.execution_time
    if quote_in.currency is not None:
        quote.currency = quote_in.currency
    if quote_in.validity_days is not None:
        quote.validity_days = quote_in.validity_days
    if quote_in.exchange_rate is not None:
        quote.exchange_rate = quote_in.exchange_rate
    if quote_in.tax_percent is not None:
        quote.tax_percent = quote_in.tax_percent
    if quote_in.notes is not None:
        quote.notes = quote_in.notes
    if quote_in.coletilla_divisas is not None:
        quote.coletilla_divisas = quote_in.coletilla_divisas
    if quote_in.coletilla_bolivares is not None:
        quote.coletilla_bolivares = quote_in.coletilla_bolivares
    if quote_in.coletilla_modalidad is not None:
        quote.coletilla_modalidad = quote_in.coletilla_modalidad
    if quote_in.status is not None:
        quote.status = quote_in.status
    if quote_in.created_at is not None:
        quote.created_at = quote_in.created_at

    if quote_in.items is not None:
        db.query(QuotationItem).filter(QuotationItem.quotation_id == quotation_id).delete()
        subtotal = 0.0
        items_objs = []
        for it in quote_in.items:
            line_total = round(it.quantity * it.unit_price_usd, 2)
            subtotal += line_total
            items_objs.append(QuotationItem(
                quotation_id=quote.id,
                service_id=it.service_id,
                item_code=it.item_code,
                description=it.description,
                unit_measure=it.unit_measure,
                quantity=it.quantity,
                unit_price_usd=it.unit_price_usd,
                total_usd=line_total
            ))
        tax_usd = round(subtotal * (quote.tax_percent / 100.0), 2)
        total_usd = round(subtotal + tax_usd, 2)
        quote.subtotal_usd = subtotal
        quote.tax_usd = tax_usd
        quote.total_usd = total_usd
        db.add_all(items_objs)

    try:
        db.commit()
        db.refresh(quote)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error al actualizar presupuesto: {str(e)}")

    return quote

@router.delete("/{quotation_id}")
def delete_quotation(quotation_id: int, db: Session = Depends(get_db)):
    quote = db.query(Quotation).filter(Quotation.id == quotation_id).first()
    if not quote:
        raise HTTPException(status_code=404, detail="Cotización no encontrada.")
    try:
        db.query(QuotationItem).filter(QuotationItem.quotation_id == quotation_id).delete()
        db.delete(quote)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error al eliminar presupuesto: {str(e)}")
    return {"success": True, "message": f"Cotización {quote.quote_number} eliminada exitosamente."}
