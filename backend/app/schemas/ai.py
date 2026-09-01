from typing import List, Optional
from pydantic import BaseModel, Field
from app.models.enums import ExceptionType

class AIInvestigationResult(BaseModel):
    exception_id: str
    exception_type: ExceptionType
    root_cause: str
    confidence: float = Field(ge=0.0, le=1.0)
    recommended_action: str = Field(description="Advisory AI recommendation: AUTO_RESOLVE or HUMAN_REVIEW")
    explanation: str
    evidence_ids: List[str]
    model_used: Optional[str] = "gemini"
    is_fallback: bool = False
