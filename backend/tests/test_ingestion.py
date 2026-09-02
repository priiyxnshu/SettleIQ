import io
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
from app.models import ReconciliationRun, PaymentRecord, SettlementRecord, FeeRecord, AuditLog, AuditAction

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "development"
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


def test_successful_upload(client_with_db):
    client, Session = client_with_db

    pay_bytes = (DATA_DIR / "payments.csv").read_bytes()
    set_bytes = (DATA_DIR / "settlements.csv").read_bytes()
    fee_bytes = (DATA_DIR / "fees.csv").read_bytes()

    response = client.post(
        "/api/upload",
        files={
            "payments_file": ("payments.csv", pay_bytes, "text/csv"),
            "settlements_file": ("settlements.csv", set_bytes, "text/csv"),
            "fees_file": ("fees.csv", fee_bytes, "text/csv"),
        }
    )

    assert response.status_code == 201, f"Response: {response.text}"
    data = response.json()
    assert data["success"] is True
    assert "reconciliation_run_id" in data
    assert data["summary"]["payments_count"] == 50
    assert data["summary"]["settlements_count"] == 48
    assert data["summary"]["fees_count"] == 50

    # Verify DB persistence
    db = Session()
    run_id = data["reconciliation_run_id"]
    run = db.query(ReconciliationRun).filter_by(id=run_id).first()
    assert run is not None
    assert len(run.payments) == 50
    assert len(run.settlements) == 48
    assert len(run.fees) == 50

    # Verify AuditLog created
    audit = db.query(AuditLog).filter_by(entity_id=run_id).first()
    assert audit is not None
    assert audit.action_type == AuditAction.FILE_UPLOADED
    db.close()


def test_preserve_duplicate_records(client_with_db):
    client, Session = client_with_db

    pay_csv = "payment_id,order_id,payment_amount,payment_date,payment_status,customer_reference\nPAY_1,ORD_1,1000.00,2026-08-01 10:00:00,SUCCESS,CUST_1"
    # 2 settlements for 1 payment
    set_csv = "settlement_id,payment_id,settlement_amount,settlement_date,settlement_status,settlement_reference,settlement_batch_id\nSET_1,PAY_1,980.00,2026-08-02 10:00:00,SETTLED,REF_1,B1\nSET_2,PAY_1,980.00,2026-08-02 11:00:00,SETTLED,REF_2,B1"
    fee_csv = "fee_id,payment_id,fee_amount,fee_type,fee_date\nFEE_1,PAY_1,20.00,PROCESSING_FEE,2026-08-01 10:01:00"

    response = client.post(
        "/api/upload",
        files={
            "payments_file": ("payments.csv", pay_csv.encode("utf-8"), "text/csv"),
            "settlements_file": ("settlements.csv", set_csv.encode("utf-8"), "text/csv"),
            "fees_file": ("fees.csv", fee_csv.encode("utf-8"), "text/csv"),
        }
    )

    assert response.status_code == 201
    data = response.json()
    assert data["summary"]["settlements_count"] == 2

    # Verify both settlement rows exist in database
    db = Session()
    run_id = data["reconciliation_run_id"]
    settlements = db.query(SettlementRecord).filter_by(reconciliation_run_id=run_id).all()
    assert len(settlements) == 2
    assert {s.settlement_id for s in settlements} == {"SET_1", "SET_2"}
    db.close()


def test_missing_column_rejection(client_with_db):
    client, _ = client_with_db

    invalid_pay_csv = "payment_id,order_id,payment_date,payment_status,customer_reference\nPAY_1,ORD_1,2026-08-01 10:00:00,SUCCESS,CUST_1"
    set_csv = "settlement_id,payment_id,settlement_amount,settlement_date,settlement_status,settlement_reference,settlement_batch_id\nSET_1,PAY_1,980.00,2026-08-02 10:00:00,SETTLED,REF_1,B1"
    fee_csv = "fee_id,payment_id,fee_amount,fee_type,fee_date\nFEE_1,PAY_1,20.00,PROCESSING_FEE,2026-08-01 10:01:00"

    response = client.post(
        "/api/upload",
        files={
            "payments_file": ("payments.csv", invalid_pay_csv.encode("utf-8"), "text/csv"),
            "settlements_file": ("settlements.csv", set_csv.encode("utf-8"), "text/csv"),
            "fees_file": ("fees.csv", fee_csv.encode("utf-8"), "text/csv"),
        }
    )

    assert response.status_code == 400
    detail = response.json()["detail"]
    assert "Missing required columns in payments CSV" in str(detail)


def test_malformed_numeric_value_rejection(client_with_db):
    client, _ = client_with_db

    malformed_pay_csv = "payment_id,order_id,payment_amount,payment_date,payment_status,customer_reference\nPAY_1,ORD_1,INVALID_AMOUNT,2026-08-01 10:00:00,SUCCESS,CUST_1"
    set_csv = "settlement_id,payment_id,settlement_amount,settlement_date,settlement_status,settlement_reference,settlement_batch_id\nSET_1,PAY_1,980.00,2026-08-02 10:00:00,SETTLED,REF_1,B1"
    fee_csv = "fee_id,payment_id,fee_amount,fee_type,fee_date\nFEE_1,PAY_1,20.00,PROCESSING_FEE,2026-08-01 10:01:00"

    response = client.post(
        "/api/upload",
        files={
            "payments_file": ("payments.csv", malformed_pay_csv.encode("utf-8"), "text/csv"),
            "settlements_file": ("settlements.csv", set_csv.encode("utf-8"), "text/csv"),
            "fees_file": ("fees.csv", fee_csv.encode("utf-8"), "text/csv"),
        }
    )

    assert response.status_code == 422
    detail = response.json()["detail"]
    assert "Invalid payment amount 'INVALID_AMOUNT'" in str(detail)


def test_upload_history(client_with_db):
    client, _ = client_with_db

    pay_csv = "payment_id,order_id,payment_amount,payment_date,payment_status,customer_reference\nPAY_101,ORD_101,500.00,2026-08-01 10:00:00,SUCCESS,CUST_101"
    set_csv = "settlement_id,payment_id,settlement_amount,settlement_date,settlement_status,settlement_reference,settlement_batch_id\nSET_101,PAY_101,490.00,2026-08-02 10:00:00,SETTLED,REF_101,B101"
    fee_csv = "fee_id,payment_id,fee_amount,fee_type,fee_date\nFEE_101,PAY_101,10.00,PROCESSING_FEE,2026-08-01 10:01:00"

    # Upload files
    upload_res = client.post(
        "/api/upload",
        files={
            "payments_file": ("custom_payments.csv", pay_csv.encode("utf-8"), "text/csv"),
            "settlements_file": ("custom_settlements.csv", set_csv.encode("utf-8"), "text/csv"),
            "fees_file": ("custom_fees.csv", fee_csv.encode("utf-8"), "text/csv"),
        }
    )
    assert upload_res.status_code == 201
    run_id = upload_res.json()["reconciliation_run_id"]

    # Query history
    hist_res = client.get("/api/upload/history")
    assert hist_res.status_code == 200
    hist_data = hist_res.json()
    assert hist_data["total"] >= 1
    assert len(hist_data["items"]) >= 1

    latest_item = hist_data["items"][0]
    assert latest_item["reconciliation_run_id"] == run_id
    assert latest_item["payments_filename"] == "custom_payments.csv"
    assert latest_item["settlements_filename"] == "custom_settlements.csv"
    assert latest_item["fees_filename"] == "custom_fees.csv"
    assert latest_item["payments_count"] == 1
    assert latest_item["settlements_count"] == 1
    assert latest_item["fees_count"] == 1
    assert latest_item["status"] in ["CREATED", "VALIDATED"]
