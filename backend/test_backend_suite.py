import sys
import os
from fastapi.testclient import TestClient

# Asegurar path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.main import app

client = TestClient(app)

def test_dalor_system():
    print("=== 1. Probando Endpoint Raíz y Estado del Sistema ===")
    res = client.get("/")
    assert res.status_code == 200
    print("OK:", res.json())

    print("\n=== 2. Probando Catálogo de Gastos Dalor (20 Categorías) ===")
    res = client.get("/api/v1/expenses/categories")
    assert res.status_code == 200
    categories = res.json()
    print(f"OK: {len(categories)} categorías cargadas.")
    assert len(categories) >= 20

    print("\n=== 3. Probando Proyectos & Job Costing Financiero ===")
    res = client.get("/api/v1/projects")
    assert res.status_code == 200
    projects = res.json()
    assert len(projects) > 0
    p1 = projects[0]
    print(f"Proyecto evaluado: {p1['name']} ({p1['code']})")

    res_summary = client.get(f"/api/v1/projects/{p1['id']}/financial-summary")
    assert res_summary.status_code == 200
    summary = res_summary.json()
    print(f"Contrato: ${summary['contract_amount_usd']} | Gastado: ${summary['total_spent_usd']} | Margen: {summary['gross_margin_percent']}% | Status: {summary['alert_status']}")
    assert summary['gross_profit_usd'] > 0

    print("\n=== 4. Probando Semáforo de Mantenimiento de Flota Dalor ===")
    res_fleet = client.get("/api/v1/assets/fleet-summary")
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
    res_ocr = client.post("/api/v1/ocr/scan-ticket", files=ticket_payload, data=data_payload)
    assert res_ocr.status_code == 200
    ocr_result = res_ocr.json()
    print("OCR Extraído:", ocr_result)
    assert ocr_result["fuel_liters"] == 50.0
    assert ocr_result["fuel_price_per_liter_usd"] == 0.65
    assert ocr_result["alert_warning"] is not None
    print("Alerta de tope activada:", ocr_result["alert_warning"])

    print("\n=== 6. Probando Reporte de Auditoría para Neptunia ===")
    res_audit = client.get("/api/v1/reports/neptunia-audit")
    assert res_audit.status_code == 200
    audit = res_audit.json()
    print("Reporte Neptunia:", audit["report_title"])
    print(f"Proyectos en Alianza: {audit['total_partnered_projects']} | Monto Contratos: ${audit['total_partnered_contract_usd']} | Ganancia Proyectada: ${audit['total_partnered_gross_profit_usd']}")

    print("\n>>> ¡TODAS LAS PRUEBAS DE DALOR SIGO-P PASARON EXITOSAMENTE! <<<")

if __name__ == "__main__":
    test_dalor_system()
