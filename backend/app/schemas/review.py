import enum
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from app.models.enums import ExceptionStatus, DecisionOutcome

class HumanReviewAction(str, enum.Enum):
    APPROVE = "APPROVE"
    REJECT = "REJECT"
    KEEP_UNRESOLVED = "KEEP_UNRESOLVED"

class HumanReviewRequest(BaseModel):
    action: HumanReviewAction
    notes: Optional[str] = None
    reviewed_by: Optional[str] = Field(default=None, description="Identifier of reviewing operator")
    user_id: Optional[str] = None

class HumanReviewResponse(BaseModel):
    exception_id: str
    action_taken: HumanReviewAction
    new_status: ExceptionStatus
    decision_outcome: DecisionOutcome
    decided_by: str
    notes: Optional[str] = None
    timestamp: datetime
