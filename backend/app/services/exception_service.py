"""
SettleIQ Exception Service Module.

Provides querying, filtering, pagination, and multi-entity correlation for reconciliation
exceptions. Joins exception records with underlying payments, settlement batches, fee deductions,
and review decisions for dashboard display and evidence assembly.
"""

from typing import List, Optional
from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException, status

from app.models import (
    ExceptionRecord,
    PaymentRecord,
    SettlementRecord,
    FeeRecord,
    ReviewDecision,
    ExceptionType,
    ExceptionStatus,
    DecisionOutcome
)
from app.schemas.exception import (
    ExceptionListItem,
    ExceptionListResponse,
    ExceptionDetailResponse,
    PaymentDetail,
    SettlementDetail,
    FeeDetail,
    ReviewDecisionDetail
)


class ExceptionService:
    """
    Service for querying exception lists and retrieving correlated exception details.
    """

    @staticmethod
    def list_exceptions(
        db: Session,
        reconciliation_run_id: Optional[str] = None,
        exception_type: Optional[ExceptionType] = None,
        exception_status: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> ExceptionListResponse:
        """
        Query and paginate exceptions with filtering by run ID, type, and status.

        Enriches list items with payment amounts and associated review decisions.
        """
        query = db.query(ExceptionRecord).options(joinedload(ExceptionRecord.decision))

        if reconciliation_run_id:
            query = query.filter(ExceptionRecord.reconciliation_run_id == reconciliation_run_id)
        if exception_type:
            query = query.filter(ExceptionRecord.exception_type == exception_type)
        if exception_status:
            status_val = exception_status.value if hasattr(exception_status, "value") else str(exception_status)
            if status_val == "HUMAN_APPROVED":
                query = query.filter(
                    ExceptionRecord.status == ExceptionStatus.AUTO_RESOLVED,
                    ExceptionRecord.decision.has(ReviewDecision.decision_outcome == DecisionOutcome.APPROVED)
                )
            elif status_val == "AUTO_RESOLVED":
                query = query.filter(
                    ExceptionRecord.status == ExceptionStatus.AUTO_RESOLVED,
                    ~ExceptionRecord.decision.has(ReviewDecision.decision_outcome == DecisionOutcome.APPROVED)
                )
            else:
                query = query.filter(ExceptionRecord.status == status_val)

        total = query.count()
        exceptions: List[ExceptionRecord] = query.order_by(ExceptionRecord.detected_at.desc()).offset(skip).limit(limit).all()

        # Batch load payments for list view enrichment
        payment_ids = [exc.source_reference for exc in exceptions if exc.source_reference]
        run_ids = {exc.reconciliation_run_id for exc in exceptions}
        
        payments_map = {}
        if payment_ids and run_ids:
            payments = db.query(PaymentRecord).filter(
                PaymentRecord.reconciliation_run_id.in_(run_ids),
                PaymentRecord.payment_id.in_(payment_ids)
            ).all()
            for p in payments:
                payments_map[(p.reconciliation_run_id, p.payment_id)] = p

        items = []
        for exc in exceptions:
            p = payments_map.get((exc.reconciliation_run_id, exc.source_reference))
            decision_detail = None
            if exc.decision:
                decision_detail = ReviewDecisionDetail(
                    id=exc.decision.id,
                    recommended_action=exc.decision.recommended_action,
                    decision_outcome=exc.decision.decision_outcome,
                    confidence=exc.decision.confidence,
                    decided_by=exc.decision.decided_by,
                    reason=exc.decision.reason,
                    created_at=exc.decision.created_at
                )
            items.append(ExceptionListItem(
                id=exc.id,
                reconciliation_run_id=exc.reconciliation_run_id,
                source_reference=exc.source_reference,
                exception_type=exc.exception_type,
                status=exc.status,
                severity=exc.severity,
                detected_at=exc.detected_at,
                payment_amount=float(p.payment_amount) if p else None,
                customer_reference=p.customer_reference if p else None,
                decision=decision_detail
            ))

        return ExceptionListResponse(total=total, items=items)

    @staticmethod
    def get_exception_detail(db: Session, exception_id: str) -> ExceptionDetailResponse:
        """
        Retrieve comprehensive detail for an exception, correlating payment, settlements, and fees.

        Handles alternative reference linking (SR_<order_id>) for REFERENCE_MISMATCH exceptions.
        """
        exc = db.query(ExceptionRecord).filter(ExceptionRecord.id == exception_id).first()
        if not exc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Exception with ID '{exception_id}' not found."
            )

        # 1. Fetch related payment
        payment_record = None
        if exc.source_reference:
            payment_record = db.query(PaymentRecord).filter(
                PaymentRecord.reconciliation_run_id == exc.reconciliation_run_id,
                PaymentRecord.payment_id == exc.source_reference
            ).first()

        # 2. Fetch related settlements
        settlement_records: List[SettlementRecord] = []
        if exc.source_reference:
            settlement_records = db.query(SettlementRecord).filter(
                SettlementRecord.reconciliation_run_id == exc.reconciliation_run_id,
                SettlementRecord.payment_id == exc.source_reference
            ).all()

        # If REFERENCE_MISMATCH and no direct match, look up by explicit alternative reference rule
        if not settlement_records and exc.exception_type == ExceptionType.REFERENCE_MISMATCH and payment_record and payment_record.order_id:
            expected_ref = f"SR_{payment_record.order_id}"
            alt_settlement = db.query(SettlementRecord).filter(
                SettlementRecord.reconciliation_run_id == exc.reconciliation_run_id,
                SettlementRecord.settlement_reference == expected_ref
            ).first()
            if alt_settlement:
                settlement_records.append(alt_settlement)

        # 3. Fetch related fees
        fee_records: List[FeeRecord] = []
        if exc.source_reference:
            fee_records = db.query(FeeRecord).filter(
                FeeRecord.reconciliation_run_id == exc.reconciliation_run_id,
                FeeRecord.payment_id == exc.source_reference
            ).all()

        # 4. Fetch persisted decision if present
        decision_detail = None
        if exc.decision:
            decision_detail = ReviewDecisionDetail(
                id=exc.decision.id,
                recommended_action=exc.decision.recommended_action,
                decision_outcome=exc.decision.decision_outcome,
                confidence=exc.decision.confidence,
                decided_by=exc.decision.decided_by,
                reason=exc.decision.reason,
                created_at=exc.decision.created_at
            )

        # Build response
        payment_detail = PaymentDetail(
            id=payment_record.id,
            payment_id=payment_record.payment_id,
            order_id=payment_record.order_id,
            payment_amount=float(payment_record.payment_amount),
            payment_date=payment_record.payment_date,
            payment_status=payment_record.payment_status,
            customer_reference=payment_record.customer_reference,
            currency=payment_record.currency
        ) if payment_record else None

        settlement_details = [
            SettlementDetail(
                id=s.id,
                settlement_id=s.settlement_id,
                payment_id=s.payment_id,
                settlement_amount=float(s.settlement_amount),
                settlement_date=s.settlement_date,
                settlement_status=s.settlement_status,
                settlement_reference=s.settlement_reference,
                settlement_batch_id=s.settlement_batch_id,
                currency=s.currency
            ) for s in settlement_records
        ]

        fee_details = [
            FeeDetail(
                id=f.id,
                fee_id=f.fee_id,
                payment_id=f.payment_id,
                fee_amount=float(f.fee_amount),
                fee_type=f.fee_type,
                fee_date=f.fee_date
            ) for f in fee_records
        ]

        return ExceptionDetailResponse(
            id=exc.id,
            reconciliation_run_id=exc.reconciliation_run_id,
            source_reference=exc.source_reference,
            exception_type=exc.exception_type,
            status=exc.status,
            severity=exc.severity,
            detected_at=exc.detected_at,
            payment=payment_detail,
            settlements=settlement_details,
            fees=fee_details,
            decision=decision_detail
        )
