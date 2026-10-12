"""
Common imports, database dependencies, and models for Quotations domain.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import re

from app.core.database import get_db
from app.models.models import (
    Quotation,
    QuotationItem,
    Client,
    ServiceItem,
    Project,
    Material,
    ProjectMaterialRequisition
)
from app.schemas.schemas import QuotationCreate, QuotationUpdate, QuotationOut
