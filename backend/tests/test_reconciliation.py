import csv
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

import app.models  # Register all models on Base.metadata
from app.main import app
from app.database.base import Base
from app.database.session import get_db
from app.models import ReconciliationRun, ExceptionRecord, AuditLog, AuditAction, ExceptionType
from app.services.ingestion_service import IngestionService
from app.reconciliation.engine import ReconciliationEngine

DATA_ROOT = Path(__file__).resolve().parent.parent.parent / "data"
TEST_DB_URL = "sqlite:///:memory:"

@pytest.fixture
def client_with_db():
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


def test_evaluation_benchmark_reconciliation_exact_accuracy(client_with_db):
    client, Session = client_with_db
    eval_dir = DATA_ROOT / "evaluation"

    pay_bytes = (eval_dir / "payments.csv").read_bytes()
    set_bytes = (eval_dir / "settlements.csv").read_bytes()
    fee_bytes = (eval_dir / "fees.csv").read_bytes()

    db = Session()
    upload_res = IngestionService.process_uploads(
        db=db,
        payments_bytes=pay_bytes,
        payments_filename="payments.csv",
        settlements_bytes=set_bytes,
        settlements_filename="settlements.csv",
        fees_bytes=fee_bytes,
        fees_filename="fees.csv"
    )
    run_id = upload_res.reconciliation_run_id

    # Execute reconciliation via Engine
    recon_res = ReconciliationEngine.run_reconciliation(db=db, reconciliation_run_id=run_id)

    # 1. Verify totals and breakdown
    assert recon_res.total_records == 200
    assert recon_res.matched_records == 130
    assert recon_res.exceptions_count == 70
    assert recon_res.match_rate == 65.0
    assert recon_res.breakdown.AMOUNT_MISMATCH == 20
    assert recon_res.breakdown.MISSING_SETTLEMENT == 15
    assert recon_res.breakdown.DUPLICATE == 10
    assert recon_res.breakdown.REFERENCE_MISMATCH == 10
    assert recon_res.breakdown.UNKNOWN == 15

    # 2. Verify 1-to-1 exact agreement with ground_truth.csv
    with open(eval_dir / "ground_truth.csv", mode="r", encoding="utf-8") as f:
        ground_truth_rows = list(csv.DictReader(f))

    # Fetch stored exceptions from database
    stored_exceptions = db.query(ExceptionRecord).filter_by(reconciliation_run_id=run_id).all()
    exceptions_by_payment_id = {exc.source_reference: exc for exc in stored_exceptions}

    for gt in ground_truth_rows:
        pid = gt["payment_id"]
        expected_status = gt["expected_status"]
        expected_type = gt["expected_exception_type"]

        if expected_status == "MATCHED":
            assert pid not in exceptions_by_payment_id, f"Payment {pid} should be MATCHED but got exception"
        else:
            assert pid in exceptions_by_payment_id, f"Payment {pid} should have exception {expected_type} but was marked MATCHED"
            actual_exc = exceptions_by_payment_id[pid]
            assert actual_exc.exception_type.value == expected_type, f"Payment {pid}: expected {expected_type}, got {actual_exc.exception_type.value}"

    # 3. Verify Audit Trail
    audit_logs = db.query(AuditLog).filter_by(entity_id=run_id).all()
    actions = [a.action_type for a in audit_logs]
    assert AuditAction.FILE_UPLOADED in actions
    assert AuditAction.RECONCILIATION_STARTED in actions
    assert AuditAction.RECONCILIATION_COMPLETED in actions

    db.close()


def test_reconcile_api_endpoint(client_with_db):
    client, Session = client_with_db
    dev_dir = DATA_ROOT / "development"

    pay_bytes = (dev_dir / "payments.csv").read_bytes()
    set_bytes = (dev_dir / "settlements.csv").read_bytes()
    fee_bytes = (dev_dir / "fees.csv").read_bytes()

    upload_resp = client.post(
        "/api/upload",
        files={
            "payments_file": ("payments.csv", pay_bytes, "text/csv"),
            "settlements_file": ("settlements.csv", set_bytes, "text/csv"),
            "fees_file": ("fees.csv", fee_bytes, "text/csv"),
        }
    )
    assert upload_resp.status_code == 201
    run_id = upload_resp.json()["reconciliation_run_id"]

    # Call POST /api/reconcile
    reconcile_resp = client.post(
        "/api/reconcile",
        json={"reconciliation_run_id": run_id}
    )
    assert reconcile_resp.status_code == 200
    data = reconcile_resp.json()
    assert data["reconciliation_run_id"] == run_id
    assert data["status"] == "COMPLETED"
    assert data["total_records"] == 50
    assert data["matched_records"] == 30
    assert data["exceptions_count"] == 20
    assert data["breakdown"]["AMOUNT_MISMATCH"] == 5
    assert data["breakdown"]["MISSING_SETTLEMENT"] == 5
    assert data["breakdown"]["DUPLICATE"] == 3
    assert data["breakdown"]["REFERENCE_MISMATCH"] == 3
    assert data["breakdown"]["UNKNOWN"] == 4
