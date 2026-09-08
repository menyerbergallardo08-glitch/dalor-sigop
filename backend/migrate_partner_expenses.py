import sqlite3
import os

def migrate(db_path):
    if not os.path.exists(db_path):
        print(f"DB not found at {db_path}")
        return
    print(f"Migrating Partner Withdrawals & Fixed Overhead in {db_path}...")
    conn = sqlite3.connect(db_path)
    c = conn.cursor()

    # 1. Create partner_withdrawals table
    c.execute("""
    CREATE TABLE IF NOT EXISTS partner_withdrawals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        partner_name VARCHAR(150) NOT NULL,
        withdrawal_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        concept VARCHAR(255) NOT NULL,
        amount_usd FLOAT NOT NULL,
        amount_bs FLOAT DEFAULT 0.0,
        exchange_rate FLOAT DEFAULT 800.0,
        payment_method VARCHAR(50) DEFAULT 'transferencia',
        reference_number VARCHAR(100),
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # 2. Create fixed_expense_settings table
    c.execute("""
    CREATE TABLE IF NOT EXISTS fixed_expense_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(100) NOT NULL,
        category_type VARCHAR(50) DEFAULT 'nomina_fija',
        monthly_amount_usd FLOAT DEFAULT 0.0,
        is_active BOOLEAN DEFAULT 1
    )
    """)

    # Add columns to expenses if not exist
    c.execute("PRAGMA table_info(expenses)")
    exp_cols = [row[1] for row in c.fetchall()]
    if 'expense_type' not in exp_cols:
        c.execute("ALTER TABLE expenses ADD COLUMN expense_type VARCHAR(50) DEFAULT 'costo_obra'")
        print("Added expense_type to expenses table")
    if 'partner_name' not in exp_cols:
        c.execute("ALTER TABLE expenses ADD COLUMN partner_name VARCHAR(150)")
        print("Added partner_name to expenses table")

    # Add columns to accounts_payable if not exist
    c.execute("PRAGMA table_info(accounts_payable)")
    cxp_cols = [row[1] for row in c.fetchall()]
    if 'payable_type' not in cxp_cols:
        c.execute("ALTER TABLE accounts_payable ADD COLUMN payable_type VARCHAR(50) DEFAULT 'costo_material_obra'")
        print("Added payable_type to accounts_payable table")

    # Seed fixed expense settings
    c.execute("SELECT COUNT(*) FROM fixed_expense_settings")
    if c.fetchone()[0] == 0:
        c.executemany("""
        INSERT INTO fixed_expense_settings (name, category_type, monthly_amount_usd, is_active)
        VALUES (?, ?, ?, ?)
        """, [
            ("Nómina Fija Taller & Planta", "nomina_fija", 3200.0, 1),
            ("Alquiler Galpón / Sede Central", "alquiler", 1100.0, 1),
            ("Electricidad & Servicios Básicos", "servicios", 450.0, 1),
            ("Mantenimiento Preventivo de Taller", "mantenimiento", 250.0, 1)
        ])
        print("Seeded default fixed expense settings ($5,000/mes base).")

    # Seed sample partner withdrawals
    c.execute("SELECT COUNT(*) FROM partner_withdrawals")
    if c.fetchone()[0] == 0:
        c.executemany("""
        INSERT INTO partner_withdrawals (partner_name, concept, amount_usd, amount_bs, exchange_rate, payment_method, reference_number)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """, [
            ("Ing. David Dalor (Socio Principal)", "Retiro personal a cuenta de ganancias", 1200.0, 960000.0, 800.0, "transferencia", "REF-SOC-001"),
            ("Socio B (Operaciones)", "Gastos particulares familiares", 850.0, 680000.0, 800.0, "pago_movil", "REF-SOC-002")
        ])
        print("Seeded sample partner withdrawals.")

    conn.commit()
    conn.close()
    print("Migration finished successfully.")

if __name__ == "__main__":
    db1 = r"C:\Users\GATEWAY\Desktop\CLIENTES DE CONSULTORIA\Metalmecanica Dalor\backend\dalor_sigop.db"
    db2 = r"C:\Users\GATEWAY\.gemini\antigravity\scratch\dalor-sigop\backend\dalor_sigop.db"
    migrate(db1)
    migrate(db2)
