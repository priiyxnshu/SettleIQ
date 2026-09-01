from typing import List
from sqlalchemy.orm import Session
from app.services.exception_service import ExceptionService
from app.schemas.evidence import (
    EvidencePackage,
    FinancialRecordsContext,
    CalculatedFinancialFacts
)

class EvidenceBuilder:
    @staticmethod
    def build_package(db: Session, exception_id: str) -> EvidencePackage:
        # Fetch the correlated exception context reusing the exact Phase 5 service
        detail = ExceptionService.get_exception_detail(db, exception_id)

        payment = detail.payment
        settlements = detail.settlements
        fees = detail.fees

        # Calculate financial facts deterministically
        p_amt = round(float(payment.payment_amount), 2) if payment else 0.0
        total_settled = round(sum(float(s.settlement_amount) for s in settlements), 2)
        total_fees = round(sum(float(f.fee_amount) for f in fees), 2)
        discrepancy = round(p_amt - (total_settled + total_fees), 2)

        # Evidence IDs collection
        evidence_ids: List[str] = []
        if payment and payment.payment_id:
            evidence_ids.append(payment.payment_id)
        for s in settlements:
            if s.settlement_id and s.settlement_id not in evidence_ids:
                evidence_ids.append(s.settlement_id)
        for f in fees:
            if f.fee_id and f.fee_id not in evidence_ids:
                evidence_ids.append(f.fee_id)

        # Invariant indicators
        has_alt_ref = False
        if payment and payment.order_id:
            expected_ref = f"SR_{payment.order_id}"
            has_alt_ref = any(s.settlement_reference == expected_ref for s in settlements)

        is_neg_fee = any(f.fee_amount < 0 for f in fees)
        is_pending = any((s.settlement_status or "").upper() == "PENDING" for s in settlements)

        calculated_facts = CalculatedFinancialFacts(
            payment_amount=p_amt,
            total_settled_amount=total_settled,
            total_fee_amount=total_fees,
            discrepancy_amount=discrepancy,
            settlement_count=len(settlements),
            fee_count=len(fees),
            has_alternative_reference=has_alt_ref,
            is_negative_fee=is_neg_fee,
            is_pending_settlement=is_pending,
            evidence_ids=evidence_ids
        )

        financial_records = FinancialRecordsContext(
            payment=payment,
            settlements=settlements,
            fees=fees
        )

        return EvidencePackage(
            exception_id=detail.id,
            reconciliation_run_id=detail.reconciliation_run_id,
            source_reference=detail.source_reference,
            exception_type=detail.exception_type,
            status=detail.status,
            severity=detail.severity,
            detected_at=detail.detected_at,
            financial_records=financial_records,
            calculated_facts=calculated_facts
        )
