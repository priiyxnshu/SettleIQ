from typing import Optional, List
from fastapi import APIRouter, Depends, Query, Path
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.enums import ExceptionType, ExceptionStatus
from app.schemas.exception import ExceptionListResponse, ExceptionDetailResponse
from app.schemas.evidence import EvidencePackage
from app.schemas.ai import AIInvestigationResult
from app.schemas.guardrails import DecisionResponse
from app.schemas.review import HumanReviewRequest, HumanReviewResponse
from app.schemas.audit import AuditLogItem
from app.services.exception_service import ExceptionService
from app.services.evidence_builder import EvidenceBuilder
from app.services.ai_investigation_service import AIInvestigationService
from app.guardrails.engine import GuardrailEngine
from app.services.review_service import ReviewService
from app.services.audit_service import AuditService

router = APIRouter()

@router.get(
    "/exceptions",
    response_model=ExceptionListResponse,
    summary="List reconciliation exceptions with optional filters"
)
def list_exceptions(
    reconciliation_run_id: Optional[str] = Query(None, description="Filter by reconciliation run ID"),
    exception_type: Optional[ExceptionType] = Query(None, description="Filter by canonical exception type"),
    status: Optional[ExceptionStatus] = Query(None, description="Filter by workflow status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db)
):
    return ExceptionService.list_exceptions(
        db=db,
        reconciliation_run_id=reconciliation_run_id,
        exception_type=exception_type,
        exception_status=status,
        skip=skip,
        limit=limit
    )

@router.get(
    "/exceptions/{id}",
    response_model=ExceptionDetailResponse,
    summary="Get single exception details with related financial records and decision context"
)
def get_exception(
    id: str = Path(..., description="Exception ID"),
    db: Session = Depends(get_db)
):
    return ExceptionService.get_exception_detail(db=db, exception_id=id)

@router.get(
    "/exceptions/{id}/evidence",
    response_model=EvidencePackage,
    summary="Get structured evidence package for an exception"
)
def get_exception_evidence(
    id: str = Path(..., description="Exception ID"),
    db: Session = Depends(get_db)
):
    return EvidenceBuilder.build_package(db=db, exception_id=id)

@router.post(
    "/exceptions/{id}/investigate",
    response_model=AIInvestigationResult,
    summary="Run AI investigation on an exception (advisory output only)"
)
def investigate_exception(
    id: str = Path(..., description="Exception ID"),
    db: Session = Depends(get_db)
):
    return AIInvestigationService.investigate(db=db, exception_id=id)

@router.post(
    "/exceptions/{id}/evaluate",
    response_model=DecisionResponse,
    summary="Evaluate AI investigation against deterministic guardrails and make routing decision"
)
def evaluate_exception_guardrails(
    id: str = Path(..., description="Exception ID"),
    db: Session = Depends(get_db)
):
    return GuardrailEngine.evaluate_exception(db=db, exception_id=id)

@router.post(
    "/exceptions/{id}/review",
    response_model=HumanReviewResponse,
    summary="Submit human review decision on an exception in HUMAN_REVIEW status"
)
def review_exception(
    id: str = Path(..., description="Exception ID"),
    request: HumanReviewRequest = ...,
    db: Session = Depends(get_db)
):
    return ReviewService.apply_review(db=db, exception_id=id, request=request)

@router.get(
    "/exceptions/{id}/audit",
    response_model=List[AuditLogItem],
    summary="Get full chronological audit trail for a specific exception"
)
def get_exception_audit_trail(
    id: str = Path(..., description="Exception ID"),
    db: Session = Depends(get_db)
):
    return AuditService.get_exception_history(db=db, exception_id=id)
