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
from app.models import ExceptionRecord, ReviewDecision, ExceptionStatus
from app.services.ingestion_service import IngestionService
from app.reconciliation.engine import ReconciliationEngine
from app.services.ai_investigation_service import AIInvestigationService
from app.ai.provider import BaseLLMProvider, DeterministicProvider

DATA_ROOT = Path(__file__).resolve().parent.parent.parent / "data"
TEST_DB_URL = "sqlite:///:memory:"

class FaultyProvider(BaseLLMProvider):
    def generate_investigation(self, prompt, package):
        raise RuntimeError("External AI service timeout / connection refused")

class HallucinatingProvider(BaseLLMProvider):
    def generate_investigation(self, prompt, package):
        return {
            "exception_id": package.exception_id,
            "exception_type": package.exception_type.value,
            "root_cause": "INVENTED_ROOT_CAUSE",
            "confidence": 0.99,
            "recommended_action": "AUTO_RESOLVE",
            "explanation": "Invented explanation with fake IDs",
            "evidence_ids": ["FAKE_ID_1", "FAKE_ID_2"],
            "model_used": "fake-llm"
        }

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

    # Ingest development dataset and reconcile
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
    db.close()

    yield client, Session, run_id

    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)


def test_ai_investigation_all_canonical_types(populated_client):
    client, _, _ = populated_client
    list_res = client.get("/api/exceptions?limit=100")
    items = list_res.json()["items"]
    items_by_type = {item["exception_type"]: item for item in items}

    for exc_type, item in items_by_type.items():
        res = client.post(f"/api/exceptions/{item['id']}/investigate")
        assert res.status_code == 200
        ai_res = res.json()

        assert ai_res["exception_id"] == item["id"]
        assert ai_res["exception_type"] == exc_type
        assert 0.0 <= ai_res["confidence"] <= 1.0
        assert ai_res["recommended_action"] in ["AUTO_RESOLVE", "HUMAN_REVIEW"]
        assert len(ai_res["explanation"]) > 0
        assert len(ai_res["evidence_ids"]) > 0
        assert ai_res["is_fallback"] is False


def test_ai_grounding_rejects_hallucinated_ids(populated_client):
    client, Session, _ = populated_client
    db = Session()

    list_res = client.get("/api/exceptions?limit=1")
    exc_id = list_res.json()["items"][0]["id"]

    result = AIInvestigationService.investigate(
        db=db,
        exception_id=exc_id,
        provider_override=HallucinatingProvider()
    )

    # Hallucinated IDs ["FAKE_ID_1", "FAKE_ID_2"] should be caught and replaced with package's grounded evidence IDs
    assert "FAKE_ID_1" not in result.evidence_ids
    assert "FAKE_ID_2" not in result.evidence_ids
    assert len(result.evidence_ids) > 0
    db.close()


def test_ai_safe_fallback_on_failure(populated_client):
    client, Session, _ = populated_client
    db = Session()

    list_res = client.get("/api/exceptions?limit=1")
    exc_id = list_res.json()["items"][0]["id"]

    result = AIInvestigationService.investigate(
        db=db,
        exception_id=exc_id,
        provider_override=FaultyProvider()
    )

    # Safe fallback guarantees
    assert result.recommended_action == "HUMAN_REVIEW"
    assert result.confidence == 0.0
    assert result.is_fallback is True
    assert "unavailable or returned an invalid payload" in result.explanation
    db.close()


def test_ai_investigation_does_not_modify_database_or_auto_resolve(populated_client):
    client, Session, _ = populated_client
    db = Session()

    list_res = client.get("/api/exceptions?limit=1")
    exc_id = list_res.json()["items"][0]["id"]

    # Trigger investigation
    res = client.post(f"/api/exceptions/{exc_id}/investigate")
    assert res.status_code == 200

    # Verify exception in DB is still OPEN
    exc = db.query(ExceptionRecord).filter_by(id=exc_id).first()
    assert exc.status == ExceptionStatus.OPEN

    # Verify no ReviewDecision row was created in DB
    decisions = db.query(ReviewDecision).filter_by(exception_id=exc_id).all()
    assert len(decisions) == 0

    db.close()
