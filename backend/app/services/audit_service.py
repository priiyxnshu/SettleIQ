import json
from typing import List, Optional, Any
from sqlalchemy.orm import Session
from app.models import AuditLog, AuditAction
from app.schemas.audit import AuditLogItem, AuditLogListResponse

def safe_parse_details(details_str: Optional[str]) -> Any:
    if not details_str:
        return None
    try:
        return json.loads(details_str)
    except Exception:
        return details_str

class AuditService:
    @staticmethod
    def list_logs(
        db: Session,
        action_type: Optional[AuditAction] = None,
        entity_type: Optional[str] = None,
        entity_id: Optional[str] = None,
        skip: int = 0,
        limit: int = 50
    ) -> AuditLogListResponse:
        query = db.query(AuditLog)

        if action_type:
            query = query.filter(AuditLog.action_type == action_type)
        if entity_type:
            query = query.filter(AuditLog.entity_type == entity_type)
        if entity_id:
            query = query.filter(AuditLog.entity_id == entity_id)

        total = query.count()
        logs = query.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit).all()

        items = [
            AuditLogItem(
                id=log.id,
                user_id=log.user_id,
                action_type=log.action_type,
                entity_type=log.entity_type,
                entity_id=log.entity_id,
                details=safe_parse_details(log.details),
                created_at=log.created_at
            )
            for log in logs
        ]

        return AuditLogListResponse(total=total, items=items)

    @staticmethod
    def get_exception_history(db: Session, exception_id: str) -> List[AuditLogItem]:
        logs = db.query(AuditLog).filter(
            AuditLog.entity_id == exception_id
        ).order_by(AuditLog.created_at.asc()).all()

        return [
            AuditLogItem(
                id=log.id,
                user_id=log.user_id,
                action_type=log.action_type,
                entity_type=log.entity_type,
                entity_id=log.entity_id,
                details=safe_parse_details(log.details),
                created_at=log.created_at
            )
            for log in logs
        ]
