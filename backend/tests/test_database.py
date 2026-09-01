import sys
from pathlib import Path
from datetime import datetime, timezone
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add backend directory to sys.path
backend_path = str(Path(__file__).resolve().parent.parent)
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from app.database.base import Base
from app.models import (
    User,
    Upload,
    ReconciliationRun,
    PaymentRecord,
    SettlementRecord,
    FeeRecord,
    ExceptionRecord,
    ExceptionEvidence,
    ReviewDecision,
    AuditLog,
    UploadFileType,
    UploadStatus,
    RunStatus,
    ExceptionType,
    ExceptionStatus,
    DecisionOutcome,
    AuditAction,
)

# Test in-memory SQLite database
TEST_DB_URL = "sqlite:///:memory:"

@pytest.fixture
def db_session():
    engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = Session()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


def test_create_tables(db_session):
    # Verify tables exist by inserting a User
    user = User(name="Finance Operator", email="operator@settleiq.local")
    db_session.add(user)
    db_session.commit()
    
    saved_user = db_session.query(User).filter_by(email="operator@settleiq.local").first()
    assert saved_user is not None
    assert saved_user.name == "Finance Operator"


def test_reconciliation_lifecycle_models(db_session):
    # 1. Create User
    user = User(name="Ops Lead", email="ops@settleiq.local")
    db_session.add(user)
    db_session.commit()

    # 2. Create Reconciliation Run
    run = ReconciliationRun(
        created_by=user.id,
        status=RunStatus.PROCESSING,
        started_at=datetime.now(timezone.utc)
    )
    db_session.add(run)
    db_session.commit()

    # 3. Create Financial Records (Payment, Settlement, Fee)
    payment = PaymentRecord(
        reconciliation_run_id=run.id,
        payment_id="PAY_10001",
        order_id="ORD_50001",
        payment_amount=5000.00,
        payment_status="SUCCESS",
        currency="INR"
    )
    settlement = SettlementRecord(
        reconciliation_run_id=run.id,
        settlement_id="SET_70001",
        payment_id="PAY_10001",
        settlement_amount=4850.00,
        settlement_status="SETTLED",
        currency="INR"
    )
    fee = FeeRecord(
        reconciliation_run_id=run.id,
        fee_id="FEE_90001",
        payment_id="PAY_10001",
        fee_amount=150.00,
        fee_type="PROCESSING_FEE"
    )
    db_session.add_all([payment, settlement, fee])
    db_session.commit()

    # 4. Create Canonical Exception
    exc = ExceptionRecord(
        reconciliation_run_id=run.id,
        source_reference="PAY_10001",
        exception_type=ExceptionType.AMOUNT_MISMATCH,
        status=ExceptionStatus.OPEN,
        severity="HIGH"
    )
    db_session.add(exc)
    db_session.commit()

    # 5. Create Exception Evidence
    evidence = ExceptionEvidence(
        exception_id=exc.id,
        evidence_type="FEE_CALCULATION",
        evidence_summary="Difference of 150.00 matches recorded processing fee FEE_90001.",
        confidence=0.96
    )
    db_session.add(evidence)
    db_session.commit()

    # 6. Create Review Decision
    decision = ReviewDecision(
        exception_id=exc.id,
        recommended_action="AUTO_RESOLVE",
        decision_outcome=DecisionOutcome.AUTO_RESOLVE,
        confidence=0.96,
        decided_by="SYSTEM",
        reason="Guardrail passed: Processing fee matches discrepancy exactly."
    )
    db_session.add(decision)
    db_session.commit()

    # 7. Create Audit Log
    audit = AuditLog(
        user_id=user.id,
        action_type=AuditAction.AUTO_RESOLVED,
        entity_type="EXCEPTION",
        entity_id=exc.id,
        details="Exception automatically resolved by system guardrails."
    )
    db_session.add(audit)
    db_session.commit()

    # Verify query and relationships
    retrieved_run = db_session.query(ReconciliationRun).filter_by(id=run.id).first()
    assert len(retrieved_run.payments) == 1
    assert len(retrieved_run.settlements) == 1
    assert len(retrieved_run.fees) == 1
    assert len(retrieved_run.exceptions) == 1

    retrieved_exc = retrieved_run.exceptions[0]
    assert retrieved_exc.exception_type == ExceptionType.AMOUNT_MISMATCH
    assert len(retrieved_exc.evidence) == 1
    assert retrieved_exc.evidence[0].confidence == 0.96
    assert retrieved_exc.decision.decision_outcome == DecisionOutcome.AUTO_RESOLVE
