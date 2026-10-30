import os
import sys
import pytest
from fastapi.testclient import TestClient

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.main import app
from app.core.database import SessionLocal
from app.models.models import User
from app.core.rate_limiter import reset_rate_limits

@pytest.fixture(autouse=True)
def clean_rate_limits():
    reset_rate_limits()
    yield
    reset_rate_limits()

@pytest.fixture(scope="session")
def client():
    reset_rate_limits()
    return TestClient(app)

@pytest.fixture(scope="session")
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture(scope="session")
def director_token(client):
    res = client.post("/api/v1/auth/login", json={"username": "director", "password": "dalor2026"})
    if res.status_code != 200:
        res = client.post("/api/v1/auth/login", json={"username": "menyerber gallardo", "password": "Dalor2026*"})
    if res.status_code != 200:
        res = client.post("/api/v1/auth/login", json={"username": "admin", "password": "admin123"})
    assert res.status_code == 200, "Debe existir un usuario director para autenticar pruebas"
    return res.json()["access_token"]

@pytest.fixture(scope="session")
def auth_headers(director_token):
    return {"Authorization": f"Bearer {director_token}"}
