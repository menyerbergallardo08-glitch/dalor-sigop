import sqlite3
import os
from datetime import datetime, timedelta

def migrate_db(db_path):
    if not os.path.exists(db_path):
        print(f"DB not found at {db_path}")
        return
    print(f"Migrating financial tables in {db_path}...")
    conn = sqlite3.connect(db_path)
    c = conn.cursor()

    # 1. Accounts Receivable (CxC)
    c.execute("""
    CREATE TABLE IF NOT EXISTS accounts_receivable (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_number VARCHAR(50) UNIQUE,
        client_id INTEGER NOT NULL,
        project_id INTEGER,
        description VARCHAR(255) NOT NULL,
        issue_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        due_date DATETIME NOT NULL,
        amount_usd FLOAT DEFAULT 0.0,
        amount_bs FLOAT DEFAULT 0.0,
        exchange_rate FLOAT DEFAULT 800.0,
        tax_retained_usd FLOAT DEFAULT 0.0,
        paid_amount_usd FLOAT DEFAULT 0.0,
        balance_usd FLOAT DEFAULT 0.0,
        status VARCHAR(50) DEFAULT 'pendiente',
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(client_id) REFERENCES clients(id),
        FOREIGN KEY(project_id) REFERENCES projects(id)
    )
    """)

    # 2. Accounts Payable (CxP)
    c.execute("""
    CREATE TABLE IF NOT EXISTS accounts_payable (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_number VARCHAR(50),
        supplier_name VARCHAR(150) NOT NULL,
        project_id INTEGER,
        category_id INTEGER,
        description VARCHAR(255) NOT NULL,
        issue_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        due_date DATETIME NOT NULL,
        amount_usd FLOAT DEFAULT 0.0,
        amount_bs FLOAT DEFAULT 0.0,
        exchange_rate FLOAT DEFAULT 800.0,
        paid_amount_usd FLOAT DEFAULT 0.0,
        balance_usd FLOAT DEFAULT 0.0,
        status VARCHAR(50) DEFAULT 'pendiente',
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(project_id) REFERENCES projects(id),
        FOREIGN KEY(category_id) REFERENCES expense_categories(id)
    )
    """)

    # 3. Financial Payments
    c.execute("""
    CREATE TABLE IF NOT EXISTS financial_payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        payment_type VARCHAR(50) NOT NULL,
        receivable_id INTEGER,
        payable_id INTEGER,
        payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        payment_method VARCHAR(50) DEFAULT 'transferencia',
        reference_number VARCHAR(100),
        amount_usd FLOAT NOT NULL,
        amount_bs FLOAT NOT NULL,
        exchange_rate FLOAT DEFAULT 800.0,
        notes VARCHAR(255),
        FOREIGN KEY(receivable_id) REFERENCES accounts_receivable(id),
        FOREIGN KEY(payable_id) REFERENCES accounts_payable(id)
    )
    """)

    # Seed initial test data if empty
    c.execute("SELECT COUNT(*) FROM accounts_receivable")
    if c.fetchone()[0] == 0:
        print("Seeding sample CxC and CxP records...")
        now = datetime.utcnow()
        # Sample CxC
        c.execute("""
        INSERT INTO accounts_receivable (invoice_number, client_id, project_id, description, issue_date, due_date, amount_usd, amount_bs, exchange_rate, paid_amount_usd, balance_usd, status)
        VALUES ('FAC-2026-001', 1, 1, 'Anticipo 30% - Montaje Eléctrico', ?, ?, 15000.0, 12750000.0, 850.0, 15000.0, 0.0, 'cobrado')
        """, (now - timedelta(days=10), now + timedelta(days=5)))
        
        c.execute("""
        INSERT INTO accounts_receivable (invoice_number, client_id, project_id, description, issue_date, due_date, amount_usd, amount_bs, exchange_rate, paid_amount_usd, balance_usd, status)
        VALUES ('FAC-2026-002', 1, 1, 'Valuación Nº 1 - Avance Obras Civiles', ?, ?, 18500.0, 15725000.0, 850.0, 5000.0, 13500.0, 'parcial')
        """, (now - timedelta(days=5), now + timedelta(days=15)))

        c.execute("""
        INSERT INTO accounts_receivable (invoice_number, client_id, project_id, description, issue_date, due_date, amount_usd, amount_bs, exchange_rate, paid_amount_usd, balance_usd, status)
        VALUES ('FAC-2026-003', 2, 2, 'Valuación Final - Subestación Guacara', ?, ?, 12000.0, 10200000.0, 850.0, 0.0, 12000.0, 'pendiente')
        """, (now - timedelta(days=20), now - timedelta(days=5)))

        # Sample CxP
        c.execute("""
        INSERT INTO accounts_payable (invoice_number, supplier_name, project_id, description, issue_date, due_date, amount_usd, amount_bs, exchange_rate, paid_amount_usd, balance_usd, status)
        VALUES ('FP-8891', 'Ferretería Industrial Carabobo', 1, 'Cables de potencia 500 MCM y terminales', ?, ?, 4800.0, 4080000.0, 850.0, 4800.0, 0.0, 'pagado')
        """, (now - timedelta(days=8), now + timedelta(days=7)))

        c.execute("""
        INSERT INTO accounts_payable (invoice_number, supplier_name, project_id, description, issue_date, due_date, amount_usd, amount_bs, exchange_rate, paid_amount_usd, balance_usd, status)
        VALUES ('FP-9042', 'Aceros y Estructuras Valencia', 1, 'Vigas H y perfiles estructurales', ?, ?, 6200.0, 5270000.0, 850.0, 2000.0, 4200.0, 'parcial')
        """, (now - timedelta(days=4), now + timedelta(days=10)))

        c.execute("""
        INSERT INTO accounts_payable (invoice_number, supplier_name, project_id, description, issue_date, due_date, amount_usd, amount_bs, exchange_rate, paid_amount_usd, balance_usd, status)
        VALUES ('FP-9110', 'Alquiler de Grúas y Equipos C.A.', 2, 'Servicio de grúa 50 Ton para izamiento', ?, ?, 2500.0, 2125000.0, 850.0, 0.0, 2500.0, 'pendiente')
        """, (now - timedelta(days=2), now + timedelta(days=12)))

    conn.commit()
    conn.close()
    print("Migration finished successfully.")

if __name__ == "__main__":
    db1 = r"C:\Users\GATEWAY\Desktop\CLIENTES DE CONSULTORIA\Metalmecanica Dalor\backend\dalor_sigop.db"
    db2 = r"C:\Users\GATEWAY\.gemini\antigravity\scratch\dalor-sigop\backend\dalor_sigop.db"
    migrate_db(db1)
    migrate_db(db2)
