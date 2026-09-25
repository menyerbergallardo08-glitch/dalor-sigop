import os
import sys
from datetime import datetime, timezone

# Asegurar path de backend
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__)) if "backend" in os.path.abspath(__file__) else os.path.join(os.path.abspath("."), "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app.core.database import SessionLocal, engine, Base
from app.core.init_db import init_db
import app.models.models as models

def run_seed():
    print(">> Inicializando estructura DDL y catálogo base...")
    init_db()
    
    db = SessionLocal()
    try:
        # 1. Centros de Costo
        existing_ccs = {cc.code: cc for cc in db.query(models.CostCenter).all()}
        
        cc_taller = existing_ccs.get("CC-TAL") or models.CostCenter(code="CC-TAL", name="Taller y Fabricación", is_active=True)
        cc_obra = existing_ccs.get("CC-OBR") or models.CostCenter(code="CC-OBR", name="Obras y Montajes", is_active=True)
        cc_flota = existing_ccs.get("CC-FLOT") or models.CostCenter(code="CC-FLOT", name="Flota y Alquileres", is_active=True)
        
        db.add_all([cc_taller, cc_obra, cc_flota])
        db.flush()

        # 2. Clientes Formales
        existing_clients = {c.rif: c for c in db.query(models.Client).all()}
        
        c1 = existing_clients.get("J-30492811-0") or models.Client(
            code="CLI-001",
            rif="J-30492811-0",
            name="Siderúrgica del Turbio C.A.",
            contact_name="Ing. Roberto Mendoza",
            contact_phone="+58 414 1234567",
            contact_email="rmendoza@siderturbio.com",
            address="Zona Industrial II, Valencia, Carabobo",
            industry="Siderúrgica & Metalmecánica",
            is_active=True
        )
        c2 = existing_clients.get("J-40192833-2") or models.Client(
            code="CLI-002",
            rif="J-40192833-2",
            name="Constructora Concretos Gran Caracas",
            contact_name="Lic. Elena Pacheco",
            contact_phone="+58 412 9876543",
            contact_email="compras@concretoscaracas.com",
            address="Av. Francisco de Miranda, Caracas",
            industry="Construcción Civil",
            is_active=True
        )
        c3 = existing_clients.get("J-50129384-9") or models.Client(
            code="CLI-003",
            rif="J-50129384-9",
            name="Servicios Industriales Valencia C.A.",
            contact_name="Carlos Rivas",
            contact_phone="+58 424 5554321",
            contact_email="crivas@servindvalencia.com",
            address="Parque Industrial San Diego, Carabobo",
            industry="Servicios Industriales",
            is_active=True
        )
        db.add_all([c1, c2, c3])
        db.flush()

        # 3. Proyectos vinculados a Centro y Cliente
        existing_projs = {p.code: p for p in db.query(models.Project).all()}
        
        p1 = existing_projs.get("PRJ-2026-001") or models.Project(
            code="PRJ-2026-001",
            name="Fabricación Estructuras Metálicas Galpón 4",
            client_id=c1.id,
            client_name=c1.name,
            location="Taller y Fabricación Dalor",
            status="activo",
            contract_amount_usd=25000.00,
            budget_limit_usd=22000.00,
            duration_days=45,
            execution_time="45 días continuos",
            scope_of_work="Diseño, corte por plasma, armado y soldadura de cerchas estructurales.",
            start_date=datetime.now(timezone.utc),
            is_active=True
        )
        
        p2 = existing_projs.get("PRJ-2026-002") or models.Project(
            code="PRJ-2026-002",
            name="Mantenimiento Mayor Grúas Industriales",
            client_id=c2.id,
            client_name=c2.name,
            location="Planta Gran Caracas",
            status="activo",
            contract_amount_usd=14500.00,
            budget_limit_usd=12000.00,
            duration_days=30,
            execution_time="30 días continuos",
            scope_of_work="Revisión estructural, calibración de cables y sustitución de poleas.",
            start_date=datetime.now(timezone.utc),
            is_active=True
        )
        db.add_all([p1, p2])
        db.commit()
        print(">> Seeding completado: Centros de Costo, Clientes y Proyectos creados correctamente en PostgreSQL.")
    except Exception as e:
        db.rollback()
        print(f"Error en seed: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    run_seed()
