from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class ExpenseCategory(Base):
    """
    Catálogo oficial de clasificación de gastos de Dalor (20 Categorías)
    """
    __tablename__ = "expense_categories"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(20), unique=True, index=True, nullable=False) # ej: "1.0", "1.1", "19.0"
    name = Column(String(120), nullable=False)
    parent_code = Column(String(20), nullable=True) # ej: "1.0" para "1.1"
    group_type = Column(String(50), nullable=False) # 'nomina_guacara', 'nomina_proyecto', 'operativo_campo', 'servicios', 'impuestos', 'corporativo'
    is_direct_cost = Column(Boolean, default=False) # Si es imputable directamente a un proyecto cliente
    monthly_budget_usd = Column(Float, default=0.0) # Presupuesto de referencia mensual

    expenses = relationship("ExpenseEntry", back_populates="category")
