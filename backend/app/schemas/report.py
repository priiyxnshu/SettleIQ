from datetime import datetime
from typing import Dict, List, Optional
from pydantic import BaseModel, Field


class ReportMetrics(BaseModel):
    total_transactions: int = Field(..., description="Total payment transactions processed")
    expected_amount: float = Field(..., description="Total expected payment amount (INR)")
    settled_amount: float = Field(..., description="Total verified settled amount (INR)")
    difference_amount: float = Field(..., description="Net variance/discrepancy (expected - settled)")
    matched_count: int = Field(..., description="Cleanly reconciled matching transactions")
    exceptions_count: int = Field(..., description="Total exceptions flagged")
    auto_resolved_count: int = Field(..., description="Exceptions auto-resolved by system/guardrails")
    human_approved_count: int = Field(..., description="Exceptions resolved after human review and approval")
    human_review_count: int = Field(..., description="Exceptions currently pending human review")
    match_rate: float = Field(..., description="Percentage of matched transactions")
    auto_resolution_rate: float = Field(..., description="Percentage of exceptions resolved automatically")


class ReportNarrative(BaseModel):
    executive_summary: str = Field(..., description="Concise executive summary of reconciliation outcome")
    reconciliation_outcome: str = Field(..., description="Short explanation of final reconciliation outcome")
    key_findings: List[str] = Field(..., description="Bullet points of notable findings and variances")
    conclusion: str = Field(..., description="Short concluding statement and recommendation")


class ReconciliationReportData(BaseModel):
    report_id: str
    run_id: str
    run_status: str
    batch_reference: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    generated_at: datetime
    generated_by: str
    metrics: ReportMetrics
    exception_breakdown: Dict[str, int]
    narrative: ReportNarrative
    model_used: str
