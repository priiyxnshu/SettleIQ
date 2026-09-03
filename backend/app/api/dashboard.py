from typing import Dict
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload
from app.database.session import get_db
from app.models import (
    ReconciliationRun,
    PaymentRecord,
    SettlementRecord,
    ExceptionRecord,
    ExceptionStatus,
    ExceptionType,
    DecisionOutcome
)
from app.schemas.dashboard import DashboardStats
from app.services.exception_service import ExceptionService

router = APIRouter()

@router.get(
    "/dashboard",
    response_model=DashboardStats,
    summary="Get aggregated reconciliation dashboard metrics"
)
def get_dashboard_metrics(db: Session = Depends(get_db)):
    latest_run = db.query(ReconciliationRun).order_by(ReconciliationRun.started_at.desc()).first()
    if not latest_run:
        return DashboardStats(has_data=False)

    total_payments = db.query(PaymentRecord).filter_by(reconciliation_run_id=latest_run.id).count()
    exceptions = db.query(ExceptionRecord).options(joinedload(ExceptionRecord.decision)).filter_by(reconciliation_run_id=latest_run.id).all()
    exceptions_count = len(exceptions)
    matched_count = max(0, total_payments - exceptions_count)

    # Genuine system/guardrail auto-resolved (no human approval decision)
    auto_resolved_count = sum(
        1 for e in exceptions
        if e.status == ExceptionStatus.AUTO_RESOLVED and (not e.decision or e.decision.decision_outcome != DecisionOutcome.APPROVED)
    )
    human_approved_count = sum(
        1 for e in exceptions
        if e.status == ExceptionStatus.AUTO_RESOLVED and e.decision and e.decision.decision_outcome == DecisionOutcome.APPROVED
    )
    human_review_count = sum(1 for e in exceptions if e.status == ExceptionStatus.HUMAN_REVIEW)

    match_rate = round((matched_count / total_payments * 100), 2) if total_payments > 0 else 0.0
    auto_res_rate = round((auto_resolved_count / exceptions_count * 100), 2) if exceptions_count > 0 else 0.0

    # Financial Reconciliation Totals
    expected_amount = float(
        db.query(func.coalesce(func.sum(PaymentRecord.payment_amount), 0.0))
        .filter(PaymentRecord.reconciliation_run_id == latest_run.id)
        .scalar()
    )
    settled_amount = float(
        db.query(func.coalesce(func.sum(SettlementRecord.settlement_amount), 0.0))
        .filter(
            SettlementRecord.reconciliation_run_id == latest_run.id,
            func.upper(SettlementRecord.settlement_status) == "SETTLED"
        )
        .scalar()
    )
    difference_amount = round(expected_amount - settled_amount, 2)

    breakdown: Dict[str, int] = {
        ExceptionType.AMOUNT_MISMATCH.value: 0,
        ExceptionType.MISSING_SETTLEMENT.value: 0,
        ExceptionType.DUPLICATE.value: 0,
        ExceptionType.REFERENCE_MISMATCH.value: 0,
        ExceptionType.UNKNOWN.value: 0,
    }
    for e in exceptions:
        breakdown[e.exception_type.value] = breakdown.get(e.exception_type.value, 0) + 1

    # Fetch recent 5 exceptions
    recent_exceptions_resp = ExceptionService.list_exceptions(
        db=db,
        reconciliation_run_id=latest_run.id,
        limit=5
    )

    return DashboardStats(
        has_data=True,
        latest_run_id=latest_run.id,
        run_status=latest_run.status,
        started_at=latest_run.started_at,
        completed_at=latest_run.completed_at,
        total_processed=total_payments,
        matched_count=matched_count,
        exceptions_count=exceptions_count,
        auto_resolved_count=auto_resolved_count,
        human_approved_count=human_approved_count,
        human_review_count=human_review_count,
        match_rate=match_rate,
        auto_resolution_rate=auto_res_rate,
        expected_amount=round(expected_amount, 2),
        settled_amount=round(settled_amount, 2),
        difference_amount=difference_amount,
        breakdown=breakdown,
        recent_exceptions=recent_exceptions_resp.items
    )
