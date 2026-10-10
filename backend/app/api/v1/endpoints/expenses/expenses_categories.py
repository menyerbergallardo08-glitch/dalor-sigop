from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.core.database import get_db
from app.models.models import ExpenseCategory, AuditLog

router = APIRouter()

@router.get("/categories")
def get_expense_categories(db: Session = Depends(get_db)):
    legacy_int_codes = {str(i) for i in range(1, 21)}
    all_codes = {c[0] for c in db.query(ExpenseCategory.code).all()}
    cats = db.query(ExpenseCategory).order_by(ExpenseCategory.code.asc()).all()
    filtered_cats = []
    for c in cats:
        if c.code in legacy_int_codes and f"{c.code}.0" in all_codes:
            continue
        filtered_cats.append(c)
    return [
        {
            "id": c.id,
            "code": c.code,
            "name": c.name,
            "parent_id": c.parent_id,
            "group_type": c.group_type,
            "monthly_budget_usd": c.monthly_budget_usd,
            "is_active": getattr(c, "is_active", True)
        }
        for c in filtered_cats
    ]

@router.post("/categories")
def create_expense_category(payload: dict, db: Session = Depends(get_db)):
    code = (payload.get("code") or "").strip()
    name = (payload.get("name") or "").strip()
    group_type = payload.get("group_type") or "general"
    monthly_budget_usd = float(payload.get("monthly_budget_usd") or 0.0)
    if not code or not name:
        raise HTTPException(status_code=400, detail="Código y nombre son obligatorios.")
    existing = db.query(ExpenseCategory).filter(ExpenseCategory.code == code).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Ya existe una partida con el código [{code}].")
    new_cat = ExpenseCategory(
        code=code,
        name=name,
        group_type=group_type,
        monthly_budget_usd=monthly_budget_usd
    )
    db.add(new_cat)
    db.commit()
    db.refresh(new_cat)
    return {"success": True, "id": new_cat.id, "code": new_cat.code, "name": new_cat.name, "monthly_budget_usd": new_cat.monthly_budget_usd}

@router.post("/categories/{cat_id}/toggle-active")
def toggle_category_active(cat_id: int, db: Session = Depends(get_db)):
    cat = db.query(ExpenseCategory).filter(ExpenseCategory.id == cat_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Categoría no encontrada.")
    current_status = getattr(cat, "is_active", True)
    if hasattr(cat, "is_active"):
        cat.is_active = not current_status
    db.commit()
    return {"success": True, "id": cat.id, "is_active": getattr(cat, "is_active", True)}

@router.get("/categories-tree")
def get_categories_tree(db: Session = Depends(get_db)):
    try:
        cats = db.query(ExpenseCategory).all()
    except Exception:
        cats = []

    def cat_sort_key(c):
        try:
            return [int(p) for p in c.code.split('.')]
        except Exception:
            return [999]

    cats.sort(key=cat_sort_key)

    spent_by_cat = {}
    try:
        rows = db.execute(text("SELECT category_id, SUM(amount_usd) FROM expenses WHERE status = 'aprobado' GROUP BY category_id")).fetchall()
        for r in rows:
            if r[0]:
                spent_by_cat[r[0]] = float(r[1] or 0.0)
    except Exception:
        pass

    # Partidas principales raíces oficiales:
    base_parents = {}
    for c in cats:
        if c.parent_id is not None:
            continue
        parts = c.code.split('.')
        base_num = parts[0]
        if len(parts) > 1 and parts[1] != '0':
            continue
        if base_num not in base_parents or c.code.endswith(".0"):
            base_parents[base_num] = c

    parents = list(base_parents.values())
    parents.sort(key=cat_sort_key)

    tree = []
    for p in parents:
        prefix = p.code.split('.')[0]
        subcats = [c for c in cats if c.parent_id == p.id or (c.id != p.id and c.code.startswith(prefix + '.') and not c.code.endswith('.0'))]
        subcats.sort(key=cat_sort_key)
        p_direct = spent_by_cat.get(p.id, 0.0)
        sub_spent = sum(spent_by_cat.get(s.id, 0.0) for s in subcats)
        total_p = round(p_direct + sub_spent, 2)
        
        sub_items = [
            {
                "id": s.id,
                "code": s.code,
                "name": s.name,
                "monthly_budget_usd": float(getattr(s, "monthly_budget_usd", 0.0) or 0.0),
                "spent_usd": round(spent_by_cat.get(s.id, 0.0), 2),
                "is_direct": False
            } for s in subcats
        ]

        if p_direct > 0 and len(subcats) > 0:
            sub_items.insert(0, {
                "id": p.id,
                "code": f"{p.code} (Base)",
                "name": f"Gastos generales no asignados a subcuentas",
                "monthly_budget_usd": float(getattr(p, "monthly_budget_usd", 0.0) or 0.0),
                "spent_usd": round(p_direct, 2),
                "is_direct": True
            })

        tree.append({
            "id": p.id,
            "code": p.code,
            "name": p.name,
            "monthly_budget_usd": float(getattr(p, "monthly_budget_usd", 0.0) or 0.0),
            "total_spent_usd": total_p,
            "direct_spent_usd": round(p_direct, 2),
            "subcategories": sub_items
        })
    return tree
