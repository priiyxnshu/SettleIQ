from fastapi import APIRouter, Depends, HTTPException, status, Path
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.schemas.reconciliation import ReconcileRequest, ReconcileResponse
from app.schemas.guardrails import BatchEvaluationSummary
from app.reconciliation.engine import ReconciliationEngine
from app.guardrails.engine import GuardrailEngine

router = APIRouter()

@router.post(
    "/reconcile",
    response_model=ReconcileResponse,
    summary="Execute deterministic financial reconciliation"
)
def reconcile_records(request: ReconcileRequest, db: Session = Depends(get_db)):
    return ReconciliationEngine.run_reconciliation(
        db=db,
        reconciliation_run_id=request.reconciliation_run_id
    )

@router.post(
    "/reconciliation/{id}/evaluate-all",
    response_model=BatchEvaluationSummary,
    summary="Batch evaluate all exceptions in a reconciliation run with Guardrail Engine"
)
def evaluate_all_exceptions(
    id: str = Path(..., description="Reconciliation Run ID"),
    db: Session = Depends(get_db)
):
    return GuardrailEngine.evaluate_run(db=db, reconciliation_run_id=id)
