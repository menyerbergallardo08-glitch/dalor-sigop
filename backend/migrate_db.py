import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), "dalor_sigop.db")
conn = sqlite3.connect(db_path)
c = conn.cursor()

def add_col(table, col, col_type):
    c.execute(f"PRAGMA table_info({table})")
    existing_cols = [row[1] for row in c.fetchall()]
    if col not in existing_cols:
        print(f"Adding {col} to {table}...")
        c.execute(f"ALTER TABLE {table} ADD COLUMN {col} {col_type}")

add_col("projects", "scope_of_work", "TEXT")
add_col("personnel", "phone", "VARCHAR(50)")
add_col("personnel", "identification_id", "VARCHAR(50)")
add_col("expense_categories", "parent_id", "INTEGER")

# Corregir parent_id en expense_categories
c.execute("SELECT id, code, parent_code FROM expense_categories")
rows = c.fetchall()
code_to_id = {r[1]: r[0] for r in rows}

for r in rows:
    cat_id = r[0]
    parent_code = r[2]
    if parent_code and parent_code in code_to_id:
        p_id = code_to_id[parent_code]
        c.execute("UPDATE expense_categories SET parent_id = ? WHERE id = ?", (p_id, cat_id))

# Table project_phases
c.execute("""
CREATE TABLE IF NOT EXISTS project_phases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    phase_number INTEGER DEFAULT 1,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    duration_days INTEGER DEFAULT 7,
    estimated_cost_usd FLOAT DEFAULT 0.0,
    status VARCHAR(50) DEFAULT 'pendiente',
    responsible_person VARCHAR(150),
    FOREIGN KEY(project_id) REFERENCES projects(id)
)
""")

conn.commit()
conn.close()
print("Migration and parent_id population completed successfully.")
