from fastapi.testclient import TestClient
import sys
from pathlib import Path

# Add backend directory to sys.path
backend_path = str(Path(__file__).resolve().parent.parent)
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from app.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "SettleIQ"
    assert "version" in data

def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "Welcome to SettleIQ API" in data["message"]
