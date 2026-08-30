from typing import Optional
from fastapi import APIRouter, Depends, Query, Path
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.enums import ExceptionType, ExceptionStatus
from app.schemas.exception import ExceptionListResponse, ExceptionDetailResponse
from app.services.exception_service import ExceptionService

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
    summary="Get single exception details with related financial records"
)
def get_exception(
    id: str = Path(..., description="Exception ID"),
    db: Session = Depends(get_db)
):
    return ExceptionService.get_exception_detail(db=db, exception_id=id)
