from datetime import datetime
from typing import List, Optional, Any
from pydantic import BaseModel
from app.models.enums import AuditAction

class AuditLogItem(BaseModel):
    id: str
    user_id: Optional[str] = None
    action_type: AuditAction
    entity_type: str
    entity_id: str
    details: Optional[Any] = None
    created_at: datetime

class AuditLogListResponse(BaseModel):
    total: int
    items: List[AuditLogItem]
