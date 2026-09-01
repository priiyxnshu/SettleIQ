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
from app.models import ExceptionType, ExceptionStatus
from app.services.ingestion_service import IngestionService
from app.reconciliation.engine import ReconciliationEngine

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


def test_list_exceptions_and_filters(populated_client):
    client, _, run_id = populated_client

    # 1. List all exceptions
    res = client.get("/api/exceptions")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 20
    assert len(data["items"]) == 20

    # 2. Filter by run ID
    res_run = client.get(f"/api/exceptions?reconciliation_run_id={run_id}")
    assert res_run.status_code == 200
    assert res_run.json()["total"] == 20

    # 3. Filter by exception type
    res_dup = client.get("/api/exceptions?exception_type=DUPLICATE")
    assert res_dup.status_code == 200
    data_dup = res_dup.json()
    assert data_dup["total"] == 3
    for item in data_dup["items"]:
        assert item["exception_type"] == "DUPLICATE"
        assert item["payment_amount"] is not None

    # 4. Filter by status
    res_status = client.get("/api/exceptions?status=OPEN")
    assert res_status.status_code == 200
    assert res_status.json()["total"] == 20


def test_exception_detail_all_canonical_types(populated_client):
    client, _, _ = populated_client

    list_res = client.get("/api/exceptions?limit=100")
    items = list_res.json()["items"]

    items_by_type = {item["exception_type"]: item for item in items}

    # 1. AMOUNT_MISMATCH
    exc_amt = items_by_type["AMOUNT_MISMATCH"]
    detail_amt = client.get(f"/api/exceptions/{exc_amt['id']}").json()
    assert detail_amt["id"] == exc_amt["id"]
    assert detail_amt["exception_type"] == "AMOUNT_MISMATCH"
    assert detail_amt["payment"] is not None
    assert len(detail_amt["settlements"]) == 1
    assert len(detail_amt["fees"]) == 1

    # 2. MISSING_SETTLEMENT
    exc_mis = items_by_type["MISSING_SETTLEMENT"]
    detail_mis = client.get(f"/api/exceptions/{exc_mis['id']}").json()
    assert detail_mis["exception_type"] == "MISSING_SETTLEMENT"
    assert detail_mis["payment"] is not None
    assert len(detail_mis["settlements"]) == 0
    assert len(detail_mis["fees"]) == 1

    # 3. DUPLICATE
    exc_dup = items_by_type["DUPLICATE"]
    detail_dup = client.get(f"/api/exceptions/{exc_dup['id']}").json()
    assert detail_dup["exception_type"] == "DUPLICATE"
    assert detail_dup["payment"] is not None
    assert len(detail_dup["settlements"]) == 2
    assert len(detail_dup["fees"]) == 1

    # 4. REFERENCE_MISMATCH
    exc_ref = items_by_type["REFERENCE_MISMATCH"]
    detail_ref = client.get(f"/api/exceptions/{exc_ref['id']}").json()
    assert detail_ref["exception_type"] == "REFERENCE_MISMATCH"
    assert detail_ref["payment"] is not None
    assert len(detail_ref["settlements"]) == 1
    assert detail_ref["settlements"][0]["settlement_reference"] == f"SR_{detail_ref['payment']['order_id']}"
    assert len(detail_ref["fees"]) == 1

    # 5. UNKNOWN
    exc_unk = items_by_type["UNKNOWN"]
    detail_unk = client.get(f"/api/exceptions/{exc_unk['id']}").json()
    assert detail_unk["exception_type"] == "UNKNOWN"
    assert detail_unk["payment"] is not None
    assert len(detail_unk["settlements"]) == 1
    assert detail_unk["settlements"][0]["settlement_status"] == "PENDING"
    assert len(detail_unk["fees"]) == 1
    assert detail_unk["fees"][0]["fee_amount"] < 0


def test_exception_detail_404_not_found(populated_client):
    client, _, _ = populated_client
    res = client.get("/api/exceptions/NON_EXISTENT_ID")
    assert res.status_code == 404
