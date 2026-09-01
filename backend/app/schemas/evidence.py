from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel
from app.models.enums import ExceptionType, ExceptionStatus
from app.schemas.exception import PaymentDetail, SettlementDetail, FeeDetail

class CalculatedFinancialFacts(BaseModel):
    payment_amount: float
    total_settled_amount: float
    total_fee_amount: float
    discrepancy_amount: float
    settlement_count: int
    fee_count: int
    has_alternative_reference: bool
    is_negative_fee: bool
    is_pending_settlement: bool
    evidence_ids: List[str]

class FinancialRecordsContext(BaseModel):
    payment: Optional[PaymentDetail] = None
    settlements: List[SettlementDetail] = []
    fees: List[FeeDetail] = []

class EvidencePackage(BaseModel):
    exception_id: str
    reconciliation_run_id: str
    source_reference: Optional[str] = None
    exception_type: ExceptionType
    status: ExceptionStatus
    severity: str
    detected_at: datetime
    financial_records: FinancialRecordsContext
    calculated_facts: CalculatedFinancialFacts
