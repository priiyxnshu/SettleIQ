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
from app.models import ExceptionRecord, ExceptionStatus
from app.services.ingestion_service import IngestionService
from app.reconciliation.engine import ReconciliationEngine
from app.services.evidence_builder import EvidenceBuilder

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


def test_evidence_package_for_all_canonical_types(populated_client):
    client, Session, _ = populated_client
    list_res = client.get("/api/exceptions?limit=100")
    items = list_res.json()["items"]
    items_by_type = {item["exception_type"]: item for item in items}

    # 1. AMOUNT_MISMATCH
    exc_amt = items_by_type["AMOUNT_MISMATCH"]
    res_amt = client.get(f"/api/exceptions/{exc_amt['id']}/evidence")
    assert res_amt.status_code == 200
    pkg_amt = res_amt.json()
    assert pkg_amt["exception_type"] == "AMOUNT_MISMATCH"
    assert "financial_records" in pkg_amt
    assert "calculated_facts" in pkg_amt
    facts_amt = pkg_amt["calculated_facts"]
    assert facts_amt["discrepancy_amount"] > 0
    assert facts_amt["settlement_count"] == 1
    assert facts_amt["fee_count"] == 1
    assert len(facts_amt["evidence_ids"]) == 3  # PAY, SET, FEE

    # 2. MISSING_SETTLEMENT
    exc_mis = items_by_type["MISSING_SETTLEMENT"]
    res_mis = client.get(f"/api/exceptions/{exc_mis['id']}/evidence")
    assert res_mis.status_code == 200
    pkg_mis = res_mis.json()
    facts_mis = pkg_mis["calculated_facts"]
    assert facts_mis["settlement_count"] == 0
    assert facts_mis["total_settled_amount"] == 0.0
    assert len(pkg_mis["financial_records"]["settlements"]) == 0

    # 3. DUPLICATE
    exc_dup = items_by_type["DUPLICATE"]
    res_dup = client.get(f"/api/exceptions/{exc_dup['id']}/evidence")
    assert res_dup.status_code == 200
    pkg_dup = res_dup.json()
    facts_dup = pkg_dup["calculated_facts"]
    assert facts_dup["settlement_count"] == 2
    assert len(pkg_dup["financial_records"]["settlements"]) == 2
    assert len(facts_dup["evidence_ids"]) == 4  # PAY, SET1, SET2, FEE

    # 4. REFERENCE_MISMATCH
    exc_ref = items_by_type["REFERENCE_MISMATCH"]
    res_ref = client.get(f"/api/exceptions/{exc_ref['id']}/evidence")
    assert res_ref.status_code == 200
    pkg_ref = res_ref.json()
    facts_ref = pkg_ref["calculated_facts"]
    assert facts_ref["has_alternative_reference"] is True
    assert facts_ref["discrepancy_amount"] == 0.0

    # 5. UNKNOWN
    exc_unk = items_by_type["UNKNOWN"]
    res_unk = client.get(f"/api/exceptions/{exc_unk['id']}/evidence")
    assert res_unk.status_code == 200
    pkg_unk = res_unk.json()
    facts_unk = pkg_unk["calculated_facts"]
    assert facts_unk["is_negative_fee"] is True or facts_unk["is_pending_settlement"] is True


def test_evidence_builder_immutability(populated_client):
    client, Session, _ = populated_client
    db = Session()

    list_res = client.get("/api/exceptions?limit=1")
    exc_id = list_res.json()["items"][0]["id"]

    # Call Evidence Builder directly and via API
    pkg = EvidenceBuilder.build_package(db=db, exception_id=exc_id)
    assert pkg.exception_id == exc_id

    # Verify exception in DB is still OPEN and untouched
    exc = db.query(ExceptionRecord).filter_by(id=exc_id).first()
    assert exc.status == ExceptionStatus.OPEN
    db.close()
