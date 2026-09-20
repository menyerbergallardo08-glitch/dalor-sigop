import os
import re
import shutil

PROJECT_ROOT = r"C:\Users\GATEWAY\.gemini\antigravity\scratch\dalor-sigop"
SRC_HTML = os.path.join(PROJECT_ROOT, "frontend", "index.html")
V2_DIR = os.path.join(PROJECT_ROOT, "frontend_v2")
PARTIALS_DIR = os.path.join(V2_DIR, "src", "partials")
VIEWS_DIR = os.path.join(PARTIALS_DIR, "views")

os.makedirs(VIEWS_DIR, exist_ok=True)
os.makedirs(os.path.join(V2_DIR, "public", "css"), exist_ok=True)

# Copy CSS and assets
shutil.copy2(os.path.join(PROJECT_ROOT, "frontend", "css", "styles.css"), os.path.join(V2_DIR, "public", "css", "styles.css"))
if os.path.exists(os.path.join(PROJECT_ROOT, "frontend", "logo_dalor.jpg")):
    shutil.copy2(os.path.join(PROJECT_ROOT, "frontend", "logo_dalor.jpg"), os.path.join(V2_DIR, "public", "logo_dalor.jpg"))

# Copy JS modules from frontend/src to frontend_v2/src
for item in os.listdir(os.path.join(PROJECT_ROOT, "frontend", "src")):
    s = os.path.join(PROJECT_ROOT, "frontend", "src", item)
    d = os.path.join(V2_DIR, "src", item)
    if os.path.isdir(s):
        if item != "partials":
            shutil.copytree(s, d, dirs_exist_ok=True)
    else:
        shutil.copy2(s, d)

with open(SRC_HTML, "r", encoding="utf-8") as f:
    content = f.read()

lines = content.splitlines(keepends=True)

# 1. Extract Header (<header class="header-top"> ... </header>)
header_start = -1
header_end = -1
for i, l in enumerate(lines):
    if '<header class="header-top">' in l:
        header_start = i
    if header_start != -1 and '</header>' in l:
        header_end = i
        break

header_content = "".join(lines[header_start:header_end+1])
with open(os.path.join(PARTIALS_DIR, "header.html"), "w", encoding="utf-8") as f:
    f.write(header_content.strip() + "\n")
print(f"Extracted header.html: {len(header_content)} bytes")

# 2. Extract Navigation (<nav class="module-bar"> ... </nav>)
nav_start = -1
nav_end = -1
for i, l in enumerate(lines):
    if '<nav class="module-bar">' in l:
        nav_start = i
    if nav_start != -1 and '</nav>' in l:
        nav_end = i
        break

nav_content = "".join(lines[nav_start:nav_end+1])
with open(os.path.join(PARTIALS_DIR, "navigation.html"), "w", encoding="utf-8") as f:
    f.write(nav_content.strip() + "\n")
print(f"Extracted navigation.html: {len(nav_content)} bytes")

# 3. Extract Login Portal (<div id="app-login-screen" ... </div>)
login_start = -1
login_end = -1
for i, l in enumerate(lines):
    if 'id="app-login-screen"' in l:
        login_start = i
    if login_start != -1 and i > login_start and '<!-- ==' in l and 'HEADER CORPORATIVO' in l:
        login_end = i - 1
        break

if login_start != -1:
    login_content = "".join(lines[login_start:header_start-1])
    with open(os.path.join(PARTIALS_DIR, "auth_login.html"), "w", encoding="utf-8") as f:
        f.write(login_content.strip() + "\n")
    print(f"Extracted auth_login.html: {len(login_content)} bytes")

# 4. Extract View Sections (<section id="view-..."> ... </section>)
view_names = [
    'executive', 'maintenance', 'financial',
    'quotations', 'services', 'clients',
    'projects', 'dispatch', 'resources',
    'inbox', 'pwa', 'manual', 'dashboard', 'tree', 'expenses-log'
]

view_indices = []
for i, l in enumerate(lines):
    for v in view_names:
        if f'id="view-{v}"' in l:
            view_indices.append((v, i))
            break

# Find end of views (where first modal starts: id="modalPrintPreview")
modals_start_idx = -1
for i, l in enumerate(lines):
    if 'id="modalPrintPreview"' in l:
        modals_start_idx = i - 1
        break

for idx, (vname, start_line) in enumerate(view_indices):
    if idx + 1 < len(view_indices):
        end_line = view_indices[idx + 1][1] - 1
    else:
        end_line = modals_start_idx

    v_content = "".join(lines[start_line:end_line+1])
    v_file = os.path.join(VIEWS_DIR, f"view-{vname}.html")
    with open(v_file, "w", encoding="utf-8") as f:
        f.write(v_content.strip() + "\n")
    print(f"Extracted views/view-{vname}.html ({len(v_content)} bytes, lines {start_line+1} to {end_line+1})")

# 5. Extract Modals (from modals_start_idx to the end of modals before scripts)
script_tag_idx = -1
for i, l in enumerate(lines):
    if '<script type="module"' in l:
        script_tag_idx = i
        break

modals_content = "".join(lines[modals_start_idx:script_tag_idx])
with open(os.path.join(PARTIALS_DIR, "modals.html"), "w", encoding="utf-8") as f:
    f.write(modals_content.strip() + "\n")
print(f"Extracted modals.html: {len(modals_content)} bytes (lines {modals_start_idx+1} to {script_tag_idx})")

# 6. Assemble frontend_v2/index.html using <load ="src/partials/..." />
v2_index = """<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate, max-age=0">
    <meta http-equiv="Pragma" content="no-cache">
    <meta http-equiv="Expires" content="0">
    <title>DALOR SIGO-P | ERP Modular (Vite Engine)</title>
    
    <!-- Iconos FontAwesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <!-- Chart.js & Mermaid.js -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
    
    <!-- Hoja de Estilos Corporativa Extraída -->
    <link rel="stylesheet" href="/css/styles.css?v=2026.09.20">
</head>
<body>
    <!-- PORTAL DE ACCESO / LOGIN CORPORATIVO -->
    <load ="src/partials/auth_login.html" />

    <!-- SHELL PRINCIPAL AUTENTICADO -->
    <div id="app-authenticated-shell" style="display: none; width: 100%; min-height: 100vh;">
        <!-- CABECERA FIJA SUPERIOR & TASA BCV -->
        <load ="src/partials/header.html" />

        <!-- BARRA MODULAR DE SUBMENÚS DESPLEGABLES (PROFIT PLUS STYLE) -->
        <load ="src/partials/navigation.html" />

        <!-- CONTENEDOR PRINCIPAL DE VISTAS OPERATIVAS -->
        <main class="main-content" style="padding: 14px 12px; max-width: 1440px; margin: 0 auto;">
            <load ="src/partials/views/view-executive.html" />
            <load ="src/partials/views/view-maintenance.html" />
            <load ="src/partials/views/view-financial.html" />
            <load ="src/partials/views/view-quotations.html" />
            <load ="src/partials/views/view-services.html" />
            <load ="src/partials/views/view-clients.html" />
            <load ="src/partials/views/view-projects.html" />
            <load ="src/partials/views/view-dispatch.html" />
            <load ="src/partials/views/view-resources.html" />
            <load ="src/partials/views/view-inbox.html" />
            <load ="src/partials/views/view-pwa.html" />
            <load ="src/partials/views/view-manual.html" />
            <load ="src/partials/views/view-dashboard.html" />
            <load ="src/partials/views/view-tree.html" />
            <load ="src/partials/views/view-expenses-log.html" />
        </main>

        <!-- BATERÍA DE MODALES EMBEBIDOS (37 MODALES) -->
        <div id="modals-container">
            <load ="src/partials/modals.html" />
        </div>
    </div>

    <!-- LÓGICA MODULAR ES6 DESACOPLADA -->
    <script type="module" src="/src/main.js"></script>
</body>
</html>
"""

with open(os.path.join(V2_DIR, "index.html"), "w", encoding="utf-8") as f:
    f.write(v2_index)
print("Generated clean declarative frontend_v2/index.html")

# Also copy modularize_html.py into dalor-sigop/scripts/ for permanent repo presence
os.makedirs(os.path.join(PROJECT_ROOT, "scripts"), exist_ok=True)
shutil.copy2(__file__, os.path.join(PROJECT_ROOT, "scripts", "modularize_html.py"))
print("Saved permanent copy to scripts/modularize_html.py")
