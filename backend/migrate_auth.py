import sqlite3
import os
import json
from datetime import datetime
from app.core.security import get_password_hash

DEFAULT_PERMISSIONS = {
    "director": {
        "comercial_view": True, "comercial_edit": True,
        "proyectos_view": True, "proyectos_edit": True,
        "finanzas_view": True, "finanzas_edit": True,
        "recursos_view": True, "recursos_edit": True,
        "gastos_view": True, "gastos_edit": True,
        "executive_dashboard": True,
        "mantenimiento_admin": True
    },
    "admin_finanzas": {
        "comercial_view": True, "comercial_edit": True,
        "proyectos_view": True, "proyectos_edit": False,
        "finanzas_view": True, "finanzas_edit": True,
        "recursos_view": True, "recursos_edit": False,
        "gastos_view": True, "gastos_edit": True,
        "executive_dashboard": True,
        "mantenimiento_admin": False
    },
    "ingeniero_obra": {
        "comercial_view": True, "comercial_edit": False,
        "proyectos_view": True, "proyectos_edit": True,
        "finanzas_view": False, "finanzas_edit": False,
        "recursos_view": True, "recursos_edit": True,
        "gastos_view": True, "gastos_edit": True,
        "executive_dashboard": False,
        "mantenimiento_admin": False
    },
    "supervisor_campo": {
        "comercial_view": False, "comercial_edit": False,
        "proyectos_view": True, "proyectos_edit": False,
        "finanzas_view": False, "finanzas_edit": False,
        "recursos_view": True, "recursos_edit": False,
        "gastos_view": True, "gastos_edit": True,
        "executive_dashboard": False,
        "mantenimiento_admin": False
    }
}

def migrate_db(db_path):
    if not os.path.exists(db_path):
        print(f"DB not found at {db_path}")
        return
    print(f"Migrating users and auth in {db_path}...")
    conn = sqlite3.connect(db_path)
    c = conn.cursor()

    c.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username VARCHAR(50) UNIQUE NOT NULL,
        full_name VARCHAR(150) NOT NULL,
        email VARCHAR(100),
        hashed_password VARCHAR(255) NOT NULL,
        role_name VARCHAR(50) DEFAULT 'ingeniero_obra',
        permissions_json TEXT,
        is_active BOOLEAN DEFAULT 1,
        is_superuser BOOLEAN DEFAULT 0,
        last_login DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    """)

    c.execute("""
    CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        username VARCHAR(50) NOT NULL,
        module VARCHAR(50) NOT NULL,
        action VARCHAR(100) NOT NULL,
        details TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )
    """)

    # Seed default users
    users_to_seed = [
        ("admin", "Director General / Socio", "gerencia@dalor.com", "admin123", "director", True, True),
        ("finanzas", "Lic. Roberto Pérez (Finanzas & Tesorería)", "finanzas@dalor.com", "finanzas123", "admin_finanzas", True, False),
        ("ingeniero", "Ing. Carlos Mendoza (Residente de Obras)", "cmendoza@dalor.com", "obra123", "ingeniero_obra", True, False),
        ("supervisor", "Tsu. Luis Castillo (Supervisor de Campo / Chofer)", "lcastillo@dalor.com", "campo123", "supervisor_campo", True, False)
    ]

    for u_name, f_name, email, pwd, role, is_act, is_sup in users_to_seed:
        c.execute("SELECT id FROM users WHERE username = ?", (u_name,))
        existing = c.fetchone()
        if not existing:
            h_pwd = get_password_hash(pwd)
            perms = json.dumps(DEFAULT_PERMISSIONS.get(role, {}))
            c.execute("""
            INSERT INTO users (username, full_name, email, hashed_password, role_name, permissions_json, is_active, is_superuser)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (u_name, f_name, email, h_pwd, role, perms, is_act, is_sup))
            print(f"Created default user: {u_name} ({role})")

    conn.commit()
    conn.close()
    print("Auth migration finished successfully.")

if __name__ == "__main__":
    db1 = r"C:\Users\GATEWAY\Desktop\CLIENTES DE CONSULTORIA\Metalmecanica Dalor\backend\dalor_sigop.db"
    db2 = r"C:\Users\GATEWAY\.gemini\antigravity\scratch\dalor-sigop\backend\dalor_sigop.db"
    migrate_db(db1)
    migrate_db(db2)
