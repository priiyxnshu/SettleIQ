from typing import List, Optional, Dict, Any
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
