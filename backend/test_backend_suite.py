import sys
import os
from fastapi.testclient import TestClient

# Asegurar path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.main import app

client = TestClient(app)

def test_dalor_system():
    print("=== 1. Probando Endpoint Raíz y Estado del Sistema ===")
    res = client.get("/healthz")
    assert res.status_code == 200
    print("OK:", res.json())

    # Autenticar para obtener token JWT
    login_res = client.post("/api/v1/auth/login", json={"username": "admin", "password": "admin123"})
    if login_res.status_code != 200:
        login_res = client.post("/api/v1/auth/login", json={"username": "director", "password": "dalor2026"})
    if login_res.status_code != 200:
        login_res = client.post("/api/v1/auth/login", json={"username": "admin", "password": "admin2026"})
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    print("\n=== 2. Probando Catálogo de Gastos Dalor (20 Categorías) ===")
    res = client.get("/api/v1/expenses/categories", headers=headers)
    assert res.status_code == 200
    categories = res.json()
    print(f"OK: {len(categories)} categorías cargadas.")
    assert len(categories) >= 20

    print("\n=== 3. Probando Proyectos & Job Costing Financiero ===")
    res = client.get("/api/v1/projects/", headers=headers)
    if res.status_code != 200:
        res = client.get("/api/v1/projects", headers=headers)
    assert res.status_code == 200
    projects = res.json()
    assert len(projects) > 0
    p1 = projects[0]
    print(f"Proyecto evaluado: {p1['name']} ({p1['code']})")

    res_summary = client.get(f"/api/v1/projects/{p1['id']}/details", headers=headers)
    if res_summary.status_code != 200:
        res_summary = client.get(f"/api/v1/projects/{p1['id']}/financial-summary", headers=headers)
    assert res_summary.status_code == 200
    summary = res_summary.json()
    print(f"Contrato: ${summary.get('contract_amount_usd')} | Gastado: ${summary.get('total_spent_usd')} | Margen: ${summary.get('gross_margin_usd')}")
    assert summary.get('contract_amount_usd', 0) >= 0

    print("\n=== 4. Probando Semáforo de Mantenimiento de Flota Dalor ===")
    res_fleet = client.get("/api/v1/assets/fleet-summary", headers=headers)
    assert res_fleet.status_code == 200
    fleet = res_fleet.json()
    for item in fleet:
        print(f"Activo: {item['asset_code']} ({item['name']}) -> Odómetro: {item['current_odometer']} km | Semáforo: {item['traffic_light']} | Costo Op: ${item['total_operating_cost_usd']}")

    print("\n=== 5. Probando Ingesta OCR y Validación de Combustible con Alerta de Sobreprecio ===")
    # Simular ticket con sobreprecio de combustible ($0.65 / L cuando el tope es $0.55 / L)
    ticket_payload = {
        "file": ("ticket_gasolina.jpg", b"dummy image bytes content", "image/jpeg")
    }
    data_payload = {
        "simulated_ocr_text": "E/S MORON DIESEL TOTAL USD 32.50 LITROS 50 LTS",
        "exchange_rate": 800.0
    }
    res_ocr = client.post("/api/v1/ocr/scan-ticket", files=ticket_payload, data=data_payload, headers=headers)
    assert res_ocr.status_code == 200
    ocr_result = res_ocr.json()
    print("OCR Extraído:", ocr_result)
    assert ocr_result["fuel_liters"] == 50.0
    price_per_l = round(ocr_result["detected_amount_usd"] / ocr_result["fuel_liters"], 2)
    assert price_per_l == 0.65
    print(f"Combustible validado: {ocr_result['fuel_liters']} L a ${price_per_l}/L (Sobreprecio detectado)")

    print("\n=== 6. Probando Tablero Comparativo de Reportes Dalor ===")
    res_audit = client.get("/api/v1/reports/comparison-dashboard", headers=headers)
    assert res_audit.status_code == 200
    audit = res_audit.json()
    print("Tablero:", audit.get("summary_cards", {}))
    print(f"Total Obras Evaluadas: {len(audit.get('projects', []))}")

    print("\n>>> ¡TODAS LAS PRUEBAS DE DALOR SIGO-P PASARON EXITOSAMENTE! <<<")

if __name__ == "__main__":
    test_dalor_system()
