from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field

class FileSummary(BaseModel):
    file_name: str
    record_count: int
    status: str

class ValidationErrorDetail(BaseModel):
    file_name: str
    row_number: Optional[int] = None
    field: Optional[str] = None
    message: str

class UploadResponse(BaseModel):
    success: bool
    reconciliation_run_id: str
    message: str
    summary: Dict[str, int]
    files: List[FileSummary]
    validation_errors: List[ValidationErrorDetail] = Field(default_factory=list)

class UploadHistoryItem(BaseModel):
    reconciliation_run_id: str
    payments_filename: str
    settlements_filename: str
    fees_filename: str
    uploaded_at: Optional[datetime] = None
    status: str
    payments_count: int
    settlements_count: int
    fees_count: int

class UploadHistoryResponse(BaseModel):
    total: int
    items: List[UploadHistoryItem]
