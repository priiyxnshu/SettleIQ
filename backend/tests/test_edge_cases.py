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
from app.models import (
    ExceptionRecord,
    ReviewDecision,
    AuditLog,
    ExceptionStatus,
    DecisionOutcome,
    AuditAction,
    ExceptionType
)
from app.services.ingestion_service import IngestionService
from app.reconciliation.engine import ReconciliationEngine
from app.guardrails.engine import GuardrailEngine
from app.services.ai_investigation_service import AIInvestigationService
from app.ai.provider import BaseLLMProvider

TEST_DB_URL = "sqlite:///:memory:"

class OfflineMockProvider(BaseLLMProvider):
    def generate_investigation(self, prompt, package):
        raise ConnectionError("Simulated LLM Gateway Timeout 504")

class FakeHallucinationProvider(BaseLLMProvider):
    def generate_investigation(self, prompt, package):
        return {
            "exception_id": package.exception_id,
            "exception_type": package.exception_type.value,
            "root_cause": "HALLUCINATED_CAUSE",
            "confidence": 0.98,
            "recommended_action": "AUTO_RESOLVE",
            "explanation": "Fabricated facts",
            "evidence_ids": ["INVENTED_123", "INVENTED_456"],
            "model_used": "fake-ai"
        }

@pytest.fixture
def client_and_session():
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

    yield client, Session

    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)


def test_ingestion_edge_case_empty_csv(client_and_session):
    client, _ = client_and_session
    res = client.post(
        "/api/upload",
        files={
            "payments_file": ("payments.csv", b"", "text/csv"),
            "settlements_file": ("settlements.csv", b"settlement_id,settlement_amount\nSET_1,100", "text/csv"),
            "fees_file": ("fees.csv", b"fee_id,fee_amount\nFEE_1,5", "text/csv")
        }
    )
    assert res.status_code == 400


def test_ingestion_edge_case_missing_required_headers(client_and_session):
    client, _ = client_and_session
    # payments.csv missing payment_amount
    res = client.post(
        "/api/upload",
        files={
            "payments_file": ("payments.csv", b"payment_id,order_id\nPAY_1,ORD_1", "text/csv"),
            "settlements_file": ("settlements.csv", b"settlement_id,settlement_amount\nSET_1,100", "text/csv"),
            "fees_file": ("fees.csv", b"fee_id,fee_amount\nFEE_1,5", "text/csv")
        }
    )
    assert res.status_code == 400


def test_ai_investigation_network_failure_resilience(client_and_session):
    client, Session = client_and_session
    db = Session()

    # Create synthetic exception
    exc = ExceptionRecord(
        reconciliation_run_id="RUN_TEST",
        source_reference="PAY_TEST",
        exception_type=ExceptionType.AMOUNT_MISMATCH,
        status=ExceptionStatus.OPEN,
        severity="MEDIUM"
    )
    db.add(exc)
    db.commit()

    # Call AI investigation with failing mock provider
    result = AIInvestigationService.investigate(
        db=db,
        exception_id=exc.id,
        provider_override=OfflineMockProvider()
    )

    # Must fail safely to HUMAN_REVIEW with confidence=0.0
    assert result.recommended_action == "HUMAN_REVIEW"
    assert result.confidence == 0.0
    assert result.is_fallback is True
    assert "Simulated LLM Gateway Timeout 504" in result.explanation
    db.close()


def test_ai_anti_hallucination_id_grounding(client_and_session):
    client, Session = client_and_session
    db = Session()

    exc = ExceptionRecord(
        reconciliation_run_id="RUN_TEST",
        source_reference="PAY_TEST_2",
        exception_type=ExceptionType.AMOUNT_MISMATCH,
        status=ExceptionStatus.OPEN,
        severity="MEDIUM"
    )
    db.add(exc)
    db.commit()

    result = AIInvestigationService.investigate(
        db=db,
        exception_id=exc.id,
        provider_override=FakeHallucinationProvider()
    )

    # Assert hallucinated IDs were filtered out
    assert "INVENTED_123" not in result.evidence_ids
    assert "INVENTED_456" not in result.evidence_ids
    db.close()


def test_review_guardrail_preconditions(client_and_session):
    client, Session = client_and_session
    db = Session()

    exc_open = ExceptionRecord(
        reconciliation_run_id="RUN_TEST",
        source_reference="PAY_TEST_3",
        exception_type=ExceptionType.AMOUNT_MISMATCH,
        status=ExceptionStatus.OPEN,
        severity="MEDIUM"
    )
    db.add(exc_open)
    db.commit()
    open_id = exc_open.id
    db.close()

    # Attempt to review OPEN exception -> should fail with HTTP 400
    res = client.post(
        f"/api/exceptions/{open_id}/review",
        json={"action": "APPROVE", "notes": "Premature attempt"}
    )
    assert res.status_code == 400
    assert "Only exceptions in 'HUMAN_REVIEW' can be reviewed" in res.json()["detail"]

    # Verify read endpoint is STILL 100% accessible
    read_res = client.get(f"/api/exceptions/{open_id}")
    assert read_res.status_code == 200
    assert read_res.json()["id"] == open_id
