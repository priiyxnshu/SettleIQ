from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import sys
backend_path = str(Path(__file__).resolve().parent.parent)
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

import app.models
from app.main import app
from app.database.base import Base
from app.database.session import get_db
from app.services.ingestion_service import IngestionService
from app.reconciliation.engine import ReconciliationEngine
from app.guardrails.engine import GuardrailEngine

DATA_ROOT = Path(__file__).resolve().parent.parent.parent / "data"
TEST_DB_URL = "sqlite:///:memory:"

@pytest.fixture
def populated_client():
    engine = create_engine(
        TEST_DB_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool
    )
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    def override_get_db():
        db = Session()
        try:
            yield db
        finally:
            db.close()
            
    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app)

    # Ingest development dataset, reconcile, and batch evaluate guardrails
    dev_dir = DATA_ROOT / "development"
    db = Session()
    upload_res = IngestionService.process_uploads(
        db=db,
        payments_bytes=(dev_dir / "payments.csv").read_bytes(),
        payments_filename="payments.csv",
        settlements_bytes=(dev_dir / "settlements.csv").read_bytes(),
        settlements_filename="settlements.csv",
        fees_bytes=(dev_dir / "fees.csv").read_bytes(),
        fees_filename="fees.csv"
    )
    run_id = upload_res.reconciliation_run_id
    ReconciliationEngine.run_reconciliation(db=db, reconciliation_run_id=run_id)
    GuardrailEngine.evaluate_run(db=db, reconciliation_run_id=run_id)
    db.close()

    yield client, Session, run_id

    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)


def test_dashboard_metrics_endpoint(populated_client):
    client, _, run_id = populated_client

    res = client.get("/api/dashboard")
    assert res.status_code == 200
    data = res.json()

    assert data["has_data"] is True
    assert data["latest_run_id"] == run_id
    assert data["total_processed"] == 50
    assert data["matched_count"] == 30
    assert data["exceptions_count"] == 20
    assert data["match_rate"] == 60.0
    assert "AMOUNT_MISMATCH" in data["breakdown"]
    assert len(data["recent_exceptions"]) <= 5
