from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.schemas.reconciliation import ReconcileRequest, ReconcileResponse
from app.reconciliation.engine import ReconciliationEngine

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
