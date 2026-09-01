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
from app.schemas.ai import AIInvestigationResult
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


def test_guardrail_auto_resolve_on_fee_explained_discrepancy(populated_client):
    client, Session, _ = populated_client
    db = Session()

    # Find an AMOUNT_MISMATCH exception
    exc = db.query(ExceptionRecord).filter_by(exception_type=ExceptionType.AMOUNT_MISMATCH).first()
    assert exc is not None

    # Simulate an AI recommendation where fee accounts for shortfall
    mock_ai_result = AIInvestigationResult(
        exception_id=exc.id,
        exception_type=exc.exception_type,
        root_cause="PROCESSING_FEE",
        confidence=0.96,
        recommended_action="AUTO_RESOLVE",
        explanation="Shortfall is completely explained by recorded processing fee.",
        evidence_ids=[exc.source_reference],
        model_used="test-llm",
        is_fallback=False
    )

    # Temporarily ensure shortfall == fee for this test payment
    # Payment = 5000, Settlement = 4850, Fee = 150 => |5000 - 4850 - 150| == 0
    from app.models import PaymentRecord, SettlementRecord, FeeRecord
    p = db.query(PaymentRecord).filter_by(reconciliation_run_id=exc.reconciliation_run_id, payment_id=exc.source_reference).first()
    s = db.query(SettlementRecord).filter_by(reconciliation_run_id=exc.reconciliation_run_id, payment_id=exc.source_reference).first()
    f = db.query(FeeRecord).filter_by(reconciliation_run_id=exc.reconciliation_run_id, payment_id=exc.source_reference).first()
    
    p.payment_amount = 5000.00
    s.settlement_amount = 4850.00
    f.fee_amount = 150.00
    db.commit()

    decision = GuardrailEngine.evaluate_exception(
        db=db,
        exception_id=exc.id,
        ai_result=mock_ai_result
    )

    # Verify Auto-Resolve Outcome
    assert decision.decision_outcome == DecisionOutcome.AUTO_RESOLVE
    assert decision.checks.recommendation_valid is True
    assert decision.checks.confidence_passed is True
    assert decision.checks.known_rule_satisfied is True
    assert decision.checks.sanity_passed is True

    # Verify DB persistence
    updated_exc = db.query(ExceptionRecord).filter_by(id=exc.id).first()
    assert updated_exc.status == ExceptionStatus.AUTO_RESOLVED

    saved_decision = db.query(ReviewDecision).filter_by(exception_id=exc.id).first()
    assert saved_decision.decision_outcome == DecisionOutcome.AUTO_RESOLVE
    assert saved_decision.decided_by == "SYSTEM"

    audit = db.query(AuditLog).filter_by(entity_id=exc.id, action_type=AuditAction.AUTO_RESOLVED).first()
    assert audit is not None
    db.close()


def test_guardrail_human_review_on_low_confidence(populated_client):
    client, Session, _ = populated_client
    db = Session()

    exc = db.query(ExceptionRecord).filter_by(exception_type=ExceptionType.AMOUNT_MISMATCH).first()

    mock_ai_result = AIInvestigationResult(
        exception_id=exc.id,
        exception_type=exc.exception_type,
        root_cause="PROCESSING_FEE",
        confidence=0.75,  # Below threshold 0.90
        recommended_action="AUTO_RESOLVE",
        explanation="Low confidence guess.",
        evidence_ids=[exc.source_reference],
        model_used="test-llm",
        is_fallback=False
    )

    decision = GuardrailEngine.evaluate_exception(
        db=db,
        exception_id=exc.id,
        ai_result=mock_ai_result
    )

    assert decision.decision_outcome == DecisionOutcome.HUMAN_REVIEW
    assert decision.checks.confidence_passed is False

    updated_exc = db.query(ExceptionRecord).filter_by(id=exc.id).first()
    assert updated_exc.status == ExceptionStatus.HUMAN_REVIEW
    db.close()


def test_guardrail_human_review_on_non_fee_exception_types(populated_client):
    client, Session, _ = populated_client
    db = Session()

    # For DUPLICATE, MISSING_SETTLEMENT, REFERENCE_MISMATCH, UNKNOWN -> MUST route to HUMAN_REVIEW
    other_types = [
        ExceptionType.DUPLICATE,
        ExceptionType.MISSING_SETTLEMENT,
        ExceptionType.REFERENCE_MISMATCH,
        ExceptionType.UNKNOWN
    ]

    for exc_type in other_types:
        exc = db.query(ExceptionRecord).filter_by(exception_type=exc_type).first()
        assert exc is not None

        mock_ai_result = AIInvestigationResult(
            exception_id=exc.id,
            exception_type=exc.exception_type,
            root_cause="SOME_CAUSE",
            confidence=0.99,
            recommended_action="AUTO_RESOLVE",
            explanation="AI tried to resolve, but guardrail must reject.",
            evidence_ids=[exc.source_reference] if exc.source_reference else [],
            model_used="test-llm",
            is_fallback=False
        )

        decision = GuardrailEngine.evaluate_exception(
            db=db,
            exception_id=exc.id,
            ai_result=mock_ai_result
        )

        assert decision.decision_outcome == DecisionOutcome.HUMAN_REVIEW
        assert decision.checks.known_rule_satisfied is False

        updated_exc = db.query(ExceptionRecord).filter_by(id=exc.id).first()
        assert updated_exc.status == ExceptionStatus.HUMAN_REVIEW

    db.close()


def test_evaluate_all_endpoint(populated_client):
    client, Session, run_id = populated_client

    res = client.post(f"/api/reconciliation/{run_id}/evaluate-all")
    assert res.status_code == 200
    data = res.json()

    assert data["reconciliation_run_id"] == run_id
    assert data["total_exceptions"] == 20
    assert len(data["decisions"]) == 20
    assert data["auto_resolved_count"] + data["human_review_count"] == 20

    # Verify all 20 exceptions in DB are no longer OPEN
    db = Session()
    open_count = db.query(ExceptionRecord).filter_by(reconciliation_run_id=run_id, status=ExceptionStatus.OPEN).count()
    assert open_count == 0
    db.close()
