from typing import Optional, List
from fastapi import APIRouter, Depends, Query, Path
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.enums import AuditAction
from app.schemas.audit import AuditLogListResponse, AuditLogItem
from app.services.audit_service import AuditService

router = APIRouter()

@router.get(
    "/audit",
    response_model=AuditLogListResponse,
    summary="Query system-wide audit logs with optional filters"
)
def list_audit_logs(
    action_type: Optional[AuditAction] = Query(None, description="Filter by audit action type"),
    entity_type: Optional[str] = Query(None, description="Filter by entity type (e.g. EXCEPTION, RECONCILIATION_RUN)"),
    entity_id: Optional[str] = Query(None, description="Filter by specific entity ID"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    return AuditService.list_logs(
        db=db,
        action_type=action_type,
        entity_type=entity_type,
        entity_id=entity_id,
        skip=skip,
        limit=limit
    )

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
