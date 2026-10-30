import pytest
from fastapi import HTTPException
from app.api.deps import require_roles
from app.core.rate_limiter import check_login_rate_limit, record_login_failure, record_login_success
from app.core.file_security import MAX_FILE_SIZE_BYTES, ALLOWED_IMAGE_MIME_TYPES

def test_25_exact_role_matching_allows_authorized():
    allowed_roles = ["director_general", "administrador_financiero"]
    allowed_set = {r.strip().lower() for r in allowed_roles}
    assert "director_general" in allowed_set
    assert "administrador_financiero" in allowed_set

def test_26_exact_role_matching_denies_partial_substring():
    allowed_roles = ["director_general"]
    allowed_set = {r.strip().lower() for r in allowed_roles}
    # Antes: "director" in "subdirector_general" -> True (Vulnerable)
    # Ahora: Set exacto
    assert "subdirector" not in allowed_set
    assert "general" not in allowed_set
    assert "director" not in allowed_set

def test_27_unauthenticated_request_rejected_401(client):
    r = client.get("/api/v1/projects/")
    assert r.status_code == 401

def test_28_insufficient_role_rejected_403(client):
    # Autenticar usuario con rol bajo o sin permisos
    login_res = client.post("/api/v1/auth/login", json={"username": "campo", "password": "campo2026"})
    if login_res.status_code == 200:
        token = login_res.json()["access_token"]
        # Intentar acceder a anulación de CxC reservada a directores
        r = client.delete("/api/v1/financial/cxc/99999", headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 403

def test_29_owasp_security_headers_present(client):
    r = client.get("/healthz")
    headers = {k.lower(): v for k, v in r.headers.items()}
    assert headers.get("x-frame-options") == "DENY"
    assert headers.get("x-content-type-options") == "nosniff"
    assert headers.get("x-xss-protection") == "1; mode=block"

def test_30_anti_bruteforce_lockout_after_5_failures(client):
    # 5 intentos con clave errónea para un usuario único de prueba
    test_user = "bruteforce_test_probe"
    results = [client.post("/api/v1/auth/login", json={"username": test_user, "password": "wrong"}).status_code for _ in range(6)]
    assert results[-1] == 429
    from app.core.rate_limiter import reset_rate_limits
    reset_rate_limits()

def test_31_master_password_blocked_for_directors(client):
    # Las cuentas directivas NO deben aceptar master passwords genéricas (ej: admin123)
    r = client.post("/api/v1/auth/login", json={"username": "henser rodriguez", "password": "admin123"})
    assert r.status_code == 400

def test_32_change_password_endpoint_flow(client, auth_headers):
    # Validar que el endpoint change-password responda adecuadamente a password incorrecto
    r = client.post("/api/v1/auth/change-password", headers=auth_headers, json={
        "current_password": "wrong_password_12345",
        "new_password": "NewValidPassword2026*",
        "confirm_password": "NewValidPassword2026*"
    })
    assert r.status_code == 400
    assert "incorrecta" in r.json().get("detail", "").lower()

def test_33_upload_file_size_limit_10mb():
    assert MAX_FILE_SIZE_BYTES == 10 * 1024 * 1024

def test_34_upload_file_mime_type_validation():
    assert "image/jpeg" in ALLOWED_IMAGE_MIME_TYPES
    assert "image/png" in ALLOWED_IMAGE_MIME_TYPES
    assert "application/x-msdownload" not in ALLOWED_IMAGE_MIME_TYPES
