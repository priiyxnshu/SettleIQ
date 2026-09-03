from pathlib import Path
import csv
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

DATA_ROOT = Path(__file__).resolve().parent.parent.parent / "data"
TEST_DB_URL = "sqlite:///:memory:"

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


def test_full_platform_lifecycle_e2e(client_and_session):
    """
    Validates the entire unbroken multi-phase reconciliation lifecycle:
    Upload -> Reconcile -> Evidence -> AI Investigation -> Guardrails -> Isolated Human Reviews -> Audit Trail -> Dashboard
    """
    client, Session = client_and_session
    dev_dir = DATA_ROOT / "development"

    # Step 1: Upload multipart CSVs
    upload_res = client.post(
        "/api/upload",
        files={
            "payments_file": ("payments.csv", (dev_dir / "payments.csv").read_bytes(), "text/csv"),
            "settlements_file": ("settlements.csv", (dev_dir / "settlements.csv").read_bytes(), "text/csv"),
            "fees_file": ("fees.csv", (dev_dir / "fees.csv").read_bytes(), "text/csv")
        }
    )
    assert upload_res.status_code == 201
    upload_data = upload_res.json()
    assert upload_data["success"] is True
    run_id = upload_data["reconciliation_run_id"]
    assert upload_data["summary"]["payments_count"] == 50

    # Step 2: Deterministic Reconciliation
    rec_res = client.post("/api/reconcile", json={"reconciliation_run_id": run_id})
    assert rec_res.status_code == 200
    rec_data = rec_res.json()
    assert rec_data["reconciliation_run_id"] == run_id
    assert rec_data["total_records"] == 50
    assert rec_data["matched_records"] == 30
    assert rec_data["exceptions_count"] == 20
    assert rec_data["match_rate"] == 60.0

    # Step 3: Exception listing & Evidence Retrieval
    exc_list_res = client.get(f"/api/exceptions?reconciliation_run_id={run_id}&limit=50")
    assert exc_list_res.status_code == 200
    exceptions = exc_list_res.json()["items"]
    assert len(exceptions) == 20
    first_exc_id = exceptions[0]["id"]

    ev_res = client.get(f"/api/exceptions/{first_exc_id}/evidence")
    assert ev_res.status_code == 200
    ev_data = ev_res.json()
    assert ev_data["exception_id"] == first_exc_id
    assert "payment_amount" in ev_data["calculated_facts"]

    # Step 4: AI Investigation
    ai_res = client.post(f"/api/exceptions/{first_exc_id}/investigate")
    assert ai_res.status_code == 200
    ai_data = ai_res.json()
    assert ai_data["exception_id"] == first_exc_id
    assert 0.0 <= ai_data["confidence"] <= 1.0
    assert len(ai_data["evidence_ids"]) > 0

    # Step 5: Batch Guardrails & Decision Engine
    eval_res = client.post(f"/api/reconciliation/{run_id}/evaluate-all")
    assert eval_res.status_code == 200
    eval_data = eval_res.json()
    assert eval_data["total_exceptions"] == 20
    assert eval_data["auto_resolved_count"] + eval_data["human_review_count"] == 20

    # Step 6: Isolated Human Review on 3 Separate Exceptions in HUMAN_REVIEW status
    review_queue_res = client.get(f"/api/exceptions?reconciliation_run_id={run_id}&status=HUMAN_REVIEW&limit=10")
    assert review_queue_res.status_code == 200
    human_review_items = review_queue_res.json()["items"]
    assert len(human_review_items) >= 3

    exc_approve_id = human_review_items[0]["id"]
    exc_reject_id = human_review_items[1]["id"]
    exc_keep_id = human_review_items[2]["id"]

    # Action 1: APPROVE
    res_app = client.post(
        f"/api/exceptions/{exc_approve_id}/review",
        json={"action": "APPROVE", "notes": "Approved by senior reviewer", "reviewed_by": "Senior Reviewer A"}
    )
    assert res_app.status_code == 200
    data_app = res_app.json()
    assert data_app["new_status"] == "AUTO_RESOLVED"
    assert data_app["decision_outcome"] == "APPROVED"
    assert data_app["decided_by"] == "Senior Reviewer A"

    # Action 2: REJECT
    res_rej = client.post(
        f"/api/exceptions/{exc_reject_id}/review",
        json={"action": "REJECT", "notes": "Rejection notes", "reviewed_by": "Ops Manager B"}
    )
    assert res_rej.status_code == 200
    data_rej = res_rej.json()
    assert data_rej["new_status"] == "REJECTED"
    assert data_rej["decision_outcome"] == "REJECTED"
    assert data_rej["decided_by"] == "Ops Manager B"

    # Action 3: KEEP_UNRESOLVED
    res_keep = client.post(
        f"/api/exceptions/{exc_keep_id}/review",
        json={"action": "KEEP_UNRESOLVED", "notes": "Deferring decision", "reviewed_by": "Ops Lead C"}
    )
    assert res_keep.status_code == 200
    data_keep = res_keep.json()
    assert data_keep["new_status"] == "HUMAN_REVIEW"
    assert data_keep["decision_outcome"] == "HUMAN_REVIEW"

    # Step 7: Audit Trail Timeline Verification
    audit_res = client.get(f"/api/exceptions/{exc_approve_id}/audit")
    assert audit_res.status_code == 200
    audit_logs = audit_res.json()
    assert any(log["action_type"] == "HUMAN_APPROVED" for log in audit_logs)

    # Step 8: Dashboard Metrics Aggregator
    dash_res = client.get("/api/dashboard")
    assert dash_res.status_code == 200
    dash_data = dash_res.json()
    assert dash_data["has_data"] is True
    assert dash_data["total_processed"] == 50
    assert dash_data["matched_count"] == 30
    assert dash_data["exceptions_count"] == 20


def test_200_record_evaluation_benchmark_ground_truth(client_and_session):
    """
    Verifies 100% deterministic classification accuracy on the 200-record benchmark dataset against ground_truth.csv.
    """
    client, Session = client_and_session
    eval_dir = DATA_ROOT / "evaluation"

    # Ingest 200-record evaluation dataset
    upload_res = client.post(
        "/api/upload",
        files={
            "payments_file": ("payments.csv", (eval_dir / "payments.csv").read_bytes(), "text/csv"),
            "settlements_file": ("settlements.csv", (eval_dir / "settlements.csv").read_bytes(), "text/csv"),
            "fees_file": ("fees.csv", (eval_dir / "fees.csv").read_bytes(), "text/csv")
        }
    )
    assert upload_res.status_code == 201
    run_id = upload_res.json()["reconciliation_run_id"]

    # Run deterministic reconciliation
    rec_res = client.post("/api/reconcile", json={"reconciliation_run_id": run_id})
    assert rec_res.status_code == 200
    rec_data = rec_res.json()

    assert rec_data["total_records"] == 200
    assert rec_data["matched_records"] == 130
    assert rec_data["exceptions_count"] == 70
    assert rec_data["match_rate"] == 65.0

    # Verify exact canonical distribution against ground_truth.csv
    assert rec_data["breakdown"]["AMOUNT_MISMATCH"] == 20
    assert rec_data["breakdown"]["MISSING_SETTLEMENT"] == 15
    assert rec_data["breakdown"]["DUPLICATE"] == 10
    assert rec_data["breakdown"]["REFERENCE_MISMATCH"] == 10
    assert rec_data["breakdown"]["UNKNOWN"] == 15

    # Check record-by-record ground truth agreement
    db = Session()
    exceptions = db.query(ExceptionRecord).filter_by(reconciliation_run_id=run_id).all()
    exceptions_by_payment = {e.source_reference: e.exception_type.value for e in exceptions}

    with open(eval_dir / "ground_truth.csv", mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            pid = row["payment_id"]
            expected_class = row["expected_status"]
            expected_type = row["expected_exception_type"]

            if expected_class == "MATCHED":
                assert pid not in exceptions_by_payment, f"Payment {pid} was expected MATCHED but got exception"
            else:
                assert pid in exceptions_by_payment, f"Payment {pid} was expected {expected_type} but was not flagged"
                assert exceptions_by_payment[pid] == expected_type, f"Payment {pid} expected {expected_type} but got {exceptions_by_payment[pid]}"

    db.close()
