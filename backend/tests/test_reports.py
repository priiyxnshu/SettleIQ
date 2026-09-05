import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database.session import SessionLocal
from app.models import ReconciliationRun, RunStatus

client = TestClient(app)


def test_generate_report_latest():
    response = client.post("/api/reports/generate")
    assert response.status_code == 200
    data = response.json()
    assert "report_id" in data
    assert "run_id" in data
    assert "metrics" in data
    assert "narrative" in data
    assert "exception_breakdown" in data

    metrics = data["metrics"]
    assert "total_transactions" in metrics
    assert "expected_amount" in metrics
    assert "settled_amount" in metrics
    assert "difference_amount" in metrics
    assert "matched_count" in metrics
    assert "exceptions_count" in metrics

    narrative = data["narrative"]
    assert "executive_summary" in narrative
    assert "reconciliation_outcome" in narrative
    assert isinstance(narrative["key_findings"], list)
    assert len(narrative["key_findings"]) > 0


def test_download_report_pdf():
    # First get latest run id
    gen_resp = client.post("/api/reports/generate")
    assert gen_resp.status_code == 200
    run_id = gen_resp.json()["run_id"]

    pdf_resp = client.get(f"/api/reports/{run_id}/pdf")
    assert pdf_resp.status_code == 200
    assert pdf_resp.headers["content-type"] == "application/pdf"
    assert "attachment; filename=" in pdf_resp.headers["content-disposition"]
    assert pdf_resp.content.startswith(b"%PDF")
    assert len(pdf_resp.content) > 1000


def test_report_not_found():
    response = client.get("/api/reports/00000000-0000-0000-0000-000000000000")
    assert response.status_code == 404
