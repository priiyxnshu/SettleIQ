from datetime import datetime
from typing import List, Optional, Dict
from pydantic import BaseModel
from app.models.enums import RunStatus
from app.schemas.exception import ExceptionListItem

class DashboardStats(BaseModel):
    has_data: bool
    latest_run_id: Optional[str] = None
    run_status: Optional[RunStatus] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    total_processed: int = 0
    matched_count: int = 0
    exceptions_count: int = 0
    auto_resolved_count: int = 0
    human_approved_count: int = 0
    human_review_count: int = 0
    match_rate: float = 0.0
    auto_resolution_rate: float = 0.0
    expected_amount: float = 0.0
    settled_amount: float = 0.0
    difference_amount: float = 0.0
    breakdown: Dict[str, int] = {}
    recent_exceptions: List[ExceptionListItem] = []
