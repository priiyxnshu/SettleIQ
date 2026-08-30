from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel
from app.models.enums import ExceptionType, ExceptionStatus

class PaymentDetail(BaseModel):
    id: str
    payment_id: str
    order_id: Optional[str] = None
    payment_amount: float
    payment_date: Optional[datetime] = None
    payment_status: str
    customer_reference: Optional[str] = None
    currency: str = "INR"

class SettlementDetail(BaseModel):
    id: str
    settlement_id: str
    payment_id: Optional[str] = None
    settlement_amount: float
    settlement_date: Optional[datetime] = None
    settlement_status: str
    settlement_reference: Optional[str] = None
    settlement_batch_id: Optional[str] = None
    currency: str = "INR"

class FeeDetail(BaseModel):
    id: str
    fee_id: str
    payment_id: Optional[str] = None
    fee_amount: float
    fee_type: str
    fee_date: Optional[datetime] = None

class ExceptionListItem(BaseModel):
    id: str
    reconciliation_run_id: str
    source_reference: Optional[str] = None
    exception_type: ExceptionType
    status: ExceptionStatus
    severity: str
    detected_at: datetime
    payment_amount: Optional[float] = None
    customer_reference: Optional[str] = None

class ExceptionListResponse(BaseModel):
    total: int
    items: List[ExceptionListItem]

class ExceptionDetailResponse(BaseModel):
    id: str
    reconciliation_run_id: str
    source_reference: Optional[str] = None
    exception_type: ExceptionType
    status: ExceptionStatus
    severity: str
    detected_at: datetime
    payment: Optional[PaymentDetail] = None
    settlements: List[SettlementDetail] = []
    fees: List[FeeDetail] = []
