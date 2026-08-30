from typing import Dict, Any, Optional
from pydantic import BaseModel, Field

class ReconcileRequest(BaseModel):
    reconciliation_run_id: str

class ExceptionBreakdown(BaseModel):
    AMOUNT_MISMATCH: int = 0
    MISSING_SETTLEMENT: int = 0
    DUPLICATE: int = 0
    REFERENCE_MISMATCH: int = 0
    UNKNOWN: int = 0

class ReconcileResponse(BaseModel):
    reconciliation_run_id: str
    status: str
    total_records: int
    matched_records: int
    exceptions_count: int
    match_rate: float
    breakdown: ExceptionBreakdown
