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


def test_human_approve_action(populated_client):
    client, Session, _ = populated_client
    db = Session()

    # Find an exception in HUMAN_REVIEW status
    exc = db.query(ExceptionRecord).filter_by(status=ExceptionStatus.HUMAN_REVIEW).first()
    assert exc is not None
    exc_id = exc.id
    db.close()

    # Submit APPROVE action
    review_payload = {
        "action": "APPROVE",
        "notes": "Verified offline contract terms with processor; manual approval granted.",
        "reviewed_by": "Senior Finance Analyst"
    }

    res = client.post(f"/api/exceptions/{exc_id}/review", json=review_payload)
    assert res.status_code == 200
    data = res.json()
    assert data["exception_id"] == exc_id
    assert data["action_taken"] == "APPROVE"
    assert data["new_status"] == "AUTO_RESOLVED"
    assert data["decision_outcome"] == "APPROVED"
    assert data["decided_by"] == "Senior Finance Analyst"

    # Verify DB persistence in fresh session
    verify_db = Session()
    updated_exc = verify_db.query(ExceptionRecord).filter_by(id=exc_id).first()
    assert updated_exc.status == ExceptionStatus.AUTO_RESOLVED

    decision = verify_db.query(ReviewDecision).filter_by(exception_id=exc_id).first()
    assert decision.decision_outcome == DecisionOutcome.APPROVED
    assert decision.decided_by == "Senior Finance Analyst"
    assert "Verified offline contract terms" in decision.reason

    # Verify AuditLog has HUMAN_APPROVED
    audit = verify_db.query(AuditLog).filter_by(entity_id=exc_id, action_type=AuditAction.HUMAN_APPROVED).first()
    assert audit is not None
    assert "Senior Finance Analyst" in audit.details

    # Verify exception detail endpoint shows updated decision context
    detail_res = client.get(f"/api/exceptions/{exc_id}")
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["decision"] is not None
    assert detail["decision"]["decision_outcome"] == "APPROVED"
    assert detail["decision"]["decided_by"] == "Senior Finance Analyst"
    verify_db.close()


def test_human_reject_action(populated_client):
    client, Session, _ = populated_client
    db = Session()

    exc = db.query(ExceptionRecord).filter_by(status=ExceptionStatus.HUMAN_REVIEW).first()
    exc_id = exc.id
    db.close()

    review_payload = {
        "action": "REJECT",
        "notes": "Processor settlement amount is invalid. Ticket opened with support.",
        "reviewed_by": "Ops Manager"
    }

    res = client.post(f"/api/exceptions/{exc_id}/review", json=review_payload)
    assert res.status_code == 200
    data = res.json()
    assert data["action_taken"] == "REJECT"
    assert data["new_status"] == "REJECTED"
    assert data["decision_outcome"] == "REJECTED"
    assert data["decided_by"] == "Ops Manager"

    # Verify DB persistence in fresh session
    verify_db = Session()
    updated_exc = verify_db.query(ExceptionRecord).filter_by(id=exc_id).first()
    assert updated_exc.status == ExceptionStatus.REJECTED

    decision = verify_db.query(ReviewDecision).filter_by(exception_id=exc_id).first()
    assert decision.decision_outcome == DecisionOutcome.REJECTED
    assert decision.decided_by == "Ops Manager"
    assert "Ticket opened with support" in decision.reason

    # Verify AuditLog has HUMAN_REJECTED
    audit = verify_db.query(AuditLog).filter_by(entity_id=exc_id, action_type=AuditAction.HUMAN_REJECTED).first()
    assert audit is not None
    assert "Ticket opened with support" in audit.details
    verify_db.close()

    # Verify REJECTED exception is terminal and CANNOT be reviewed again
    repeat_res = client.post(
        f"/api/exceptions/{exc_id}/review",
        json={"action": "APPROVE", "notes": "Invalid attempt"}
    )
    assert repeat_res.status_code == 400
    assert "Only exceptions in 'HUMAN_REVIEW' can be reviewed" in repeat_res.json()["detail"]


def test_human_keep_unresolved_action(populated_client):
    client, Session, _ = populated_client
    db = Session()

    exc = db.query(ExceptionRecord).filter_by(status=ExceptionStatus.HUMAN_REVIEW).first()
    exc_id = exc.id
    db.close()

    review_payload = {
        "action": "KEEP_UNRESOLVED",
        "notes": "Awaiting bank statement confirmation tomorrow.",
        "reviewed_by": "Ops Lead"
    }

    res = client.post(f"/api/exceptions/{exc_id}/review", json=review_payload)
    assert res.status_code == 200
    data = res.json()
    assert data["action_taken"] == "KEEP_UNRESOLVED"
    assert data["new_status"] == "HUMAN_REVIEW"
    assert data["decision_outcome"] == "HUMAN_REVIEW"


def test_review_guard_rejects_non_human_review_exceptions(populated_client):
    client, Session, _ = populated_client
    db = Session()

    # Find or set an exception to AUTO_RESOLVED
    exc = db.query(ExceptionRecord).first()
    exc.status = ExceptionStatus.AUTO_RESOLVED
    exc_id = exc.id
    db.commit()
    db.close()

    # Attempt to submit review on AUTO_RESOLVED exception
    res = client.post(
        f"/api/exceptions/{exc_id}/review",
        json={"action": "APPROVE", "notes": "Invalid attempt"}
    )
    assert res.status_code == 400
    assert "Only exceptions in 'HUMAN_REVIEW' can be reviewed" in res.json()["detail"]

    # Verify readable access is STILL completely available and unblocked
    detail_res = client.get(f"/api/exceptions/{exc_id}")
    assert detail_res.status_code == 200
    assert detail_res.json()["status"] == "AUTO_RESOLVED"

    evidence_res = client.get(f"/api/exceptions/{exc_id}/evidence")
    assert evidence_res.status_code == 200

    audit_res = client.get(f"/api/exceptions/{exc_id}/audit")
    assert audit_res.status_code == 200


def test_global_audit_queries(populated_client):
    client, _, run_id = populated_client

    # 1. Global audit list
    res = client.get("/api/audit?limit=100")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] > 0
    assert len(data["items"]) > 0

    # 2. Filter by action type
    res_filtered = client.get("/api/audit?action_type=FILE_UPLOADED")
    assert res_filtered.status_code == 200
    data_filtered = res_filtered.json()
    assert data_filtered["total"] >= 1
    for item in data_filtered["items"]:
        assert item["action_type"] == "FILE_UPLOADED"


def test_review_queue_counts_across_three_actions(populated_client):
    client, Session, run_id = populated_client
    
    # 1. Initial count of HUMAN_REVIEW items
    dash_res = client.get("/api/dashboard")
    assert dash_res.status_code == 200
    initial_human_review = dash_res.json()["human_review_count"]
    initial_auto_resolved = dash_res.json()["auto_resolved_count"]
    assert initial_human_review >= 3

    queue_res = client.get(f"/api/exceptions?reconciliation_run_id={run_id}&status=HUMAN_REVIEW&limit=50")
    assert queue_res.status_code == 200
    items = queue_res.json()["items"]
    assert len(items) == initial_human_review

    e1 = items[0]["id"]
    e2 = items[1]["id"]
    e3 = items[2]["id"]

    # Action 1: KEEP_UNRESOLVED (Keep Pending) -> leaves count unchanged
    res_keep = client.post(
        f"/api/exceptions/{e1}/review",
        json={"action": "KEEP_UNRESOLVED", "notes": "Deferred notes", "reviewed_by": "Operator"}
    )
    assert res_keep.status_code == 200
    assert res_keep.json()["new_status"] == "HUMAN_REVIEW"

    dash_res1 = client.get("/api/dashboard")
    assert dash_res1.json()["human_review_count"] == initial_human_review
    assert dash_res1.json()["auto_resolved_count"] == initial_auto_resolved

    # Action 2: APPROVE (Approve & Resolve) -> decreases human_review by 1, does NOT increase auto_resolved
    res_app = client.post(
        f"/api/exceptions/{e2}/review",
        json={"action": "APPROVE", "notes": "Approved notes", "reviewed_by": "Operator"}
    )
    assert res_app.status_code == 200
    assert res_app.json()["new_status"] == "AUTO_RESOLVED"

    dash_res2 = client.get("/api/dashboard")
    assert dash_res2.json()["human_review_count"] == initial_human_review - 1
    assert dash_res2.json()["auto_resolved_count"] == initial_auto_resolved
    assert dash_res2.json()["human_approved_count"] == 1

    # Action 3: REJECT (Reject / Dispute) -> decreases human_review by 1, does NOT increase auto_resolved
    res_rej = client.post(
        f"/api/exceptions/{e3}/review",
        json={"action": "REJECT", "notes": "Disputed notes", "reviewed_by": "Operator"}
    )
    assert res_rej.status_code == 200
    assert res_rej.json()["new_status"] == "REJECTED"

    dash_res3 = client.get("/api/dashboard")
    assert dash_res3.json()["human_review_count"] == initial_human_review - 2
    assert dash_res3.json()["auto_resolved_count"] == initial_auto_resolved
    assert dash_res3.json()["human_approved_count"] == 1

    # Verify queue query only returns remaining HUMAN_REVIEW items
    final_queue_res = client.get(f"/api/exceptions?reconciliation_run_id={run_id}&status=HUMAN_REVIEW&limit=50")
    assert final_queue_res.status_code == 200
    final_items = final_queue_res.json()["items"]
    assert len(final_items) == initial_human_review - 2
    final_ids = {item["id"] for item in final_items}
    assert e1 in final_ids
    assert e2 not in final_ids
    assert e3 not in final_ids
