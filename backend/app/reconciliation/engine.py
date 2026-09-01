import json
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models import (
    ReconciliationRun,
    PaymentRecord,
    SettlementRecord,
    FeeRecord,
    ExceptionRecord,
    AuditLog,
    RunStatus,
    ExceptionType,
    ExceptionStatus,
    AuditAction
)
from app.schemas.reconciliation import ReconcileResponse, ExceptionBreakdown

class ReconciliationEngine:
    @staticmethod
    def run_reconciliation(db: Session, reconciliation_run_id: str, user_id: Optional[str] = None) -> ReconcileResponse:
        # 1. Fetch the reconciliation run
        run = db.query(ReconciliationRun).filter_by(id=reconciliation_run_id).first()
        if not run:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Reconciliation run '{reconciliation_run_id}' not found."
            )

        # 2. Update status and log start
        run.status = RunStatus.PROCESSING
        db.add(AuditLog(
            user_id=user_id,
            action_type=AuditAction.RECONCILIATION_STARTED,
            entity_type="RECONCILIATION_RUN",
            entity_id=run.id,
            details=json.dumps({"started_at": datetime.now(timezone.utc).isoformat()})
        ))
        db.flush()

        # 3. Load financial records for this run
        payments: List[PaymentRecord] = db.query(PaymentRecord).filter_by(reconciliation_run_id=run.id).all()
        settlements: List[SettlementRecord] = db.query(SettlementRecord).filter_by(reconciliation_run_id=run.id).all()
        fees: List[FeeRecord] = db.query(FeeRecord).filter_by(reconciliation_run_id=run.id).all()

        # 4. Build index mappings
        direct_settlements_by_pay_id: Dict[str, List[SettlementRecord]] = {}
        for s in settlements:
            if s.payment_id:
                direct_settlements_by_pay_id.setdefault(s.payment_id, []).append(s)

        settlements_by_ref: Dict[str, SettlementRecord] = {}
        for s in settlements:
            if s.settlement_reference:
                settlements_by_ref[s.settlement_reference] = s

        fees_by_pay_id: Dict[str, List[FeeRecord]] = {}
        for f in fees:
            if f.payment_id:
                fees_by_pay_id.setdefault(f.payment_id, []).append(f)

        # Clear any existing exceptions for this run if re-running
        db.query(ExceptionRecord).filter_by(reconciliation_run_id=run.id).delete()

        # 5. Evaluate deterministic precedence for each payment
        matched_count = 0
        breakdown_counts = {
            ExceptionType.AMOUNT_MISMATCH: 0,
            ExceptionType.MISSING_SETTLEMENT: 0,
            ExceptionType.DUPLICATE: 0,
            ExceptionType.REFERENCE_MISMATCH: 0,
            ExceptionType.UNKNOWN: 0,
        }
        exception_records_to_insert: List[ExceptionRecord] = []

        for p in payments:
            direct_settlements = direct_settlements_by_pay_id.get(p.payment_id, [])
            
            # Compute fee sum associated strictly with this payment record
            p_fees = fees_by_pay_id.get(p.payment_id, [])
            p_fee_amt = sum((float(f.fee_amount) for f in p_fees), 0.0)
            p_amt = float(p.payment_amount)

            # --- Rule 1: DUPLICATE (Count > 1) ---
            if len(direct_settlements) > 1:
                breakdown_counts[ExceptionType.DUPLICATE] += 1
                exception_records_to_insert.append(ExceptionRecord(
                    id=f"EXC_{uuid.uuid4().hex[:8].upper()}",
                    reconciliation_run_id=run.id,
                    source_reference=p.payment_id,
                    exception_type=ExceptionType.DUPLICATE,
                    status=ExceptionStatus.OPEN,
                    severity="HIGH"
                ))

            # --- Rule 2: REFERENCE_MISMATCH vs MISSING_SETTLEMENT (Count == 0) ---
            elif len(direct_settlements) == 0:
                alt_ref_found = False
                if p.order_id:
                    expected_ref = f"SR_{p.order_id}"
                    candidate_settlement = settlements_by_ref.get(expected_ref)
                    if candidate_settlement:
                        expected_net = round(p_amt - p_fee_amt, 2)
                        if round(float(candidate_settlement.settlement_amount), 2) == expected_net:
                            alt_ref_found = True

                if alt_ref_found:
                    breakdown_counts[ExceptionType.REFERENCE_MISMATCH] += 1
                    exception_records_to_insert.append(ExceptionRecord(
                        id=f"EXC_{uuid.uuid4().hex[:8].upper()}",
                        reconciliation_run_id=run.id,
                        source_reference=p.payment_id,
                        exception_type=ExceptionType.REFERENCE_MISMATCH,
                        status=ExceptionStatus.OPEN,
                        severity="MEDIUM"
                    ))
                else:
                    breakdown_counts[ExceptionType.MISSING_SETTLEMENT] += 1
                    exception_records_to_insert.append(ExceptionRecord(
                        id=f"EXC_{uuid.uuid4().hex[:8].upper()}",
                        reconciliation_run_id=run.id,
                        source_reference=p.payment_id,
                        exception_type=ExceptionType.MISSING_SETTLEMENT,
                        status=ExceptionStatus.OPEN,
                        severity="HIGH"
                    ))

            # --- Rule 3 & 4: Single Settlement (Count == 1) ---
            else:
                s = direct_settlements[0]
                s_amt = float(s.settlement_amount)

                # Check UNKNOWN generator invariants
                is_unknown = (
                    p_fee_amt < 0 or
                    s_amt > p_amt or
                    (s.settlement_status or "").upper() == "PENDING"
                )

                if is_unknown:
                    breakdown_counts[ExceptionType.UNKNOWN] += 1
                    exception_records_to_insert.append(ExceptionRecord(
                        id=f"EXC_{uuid.uuid4().hex[:8].upper()}",
                        reconciliation_run_id=run.id,
                        source_reference=p.payment_id,
                        exception_type=ExceptionType.UNKNOWN,
                        status=ExceptionStatus.OPEN,
                        severity="HIGH"
                    ))
                else:
                    diff = abs((s_amt + p_fee_amt) - p_amt)
                    if diff > 0.01:
                        breakdown_counts[ExceptionType.AMOUNT_MISMATCH] += 1
                        exception_records_to_insert.append(ExceptionRecord(
                            id=f"EXC_{uuid.uuid4().hex[:8].upper()}",
                            reconciliation_run_id=run.id,
                            source_reference=p.payment_id,
                            exception_type=ExceptionType.AMOUNT_MISMATCH,
                            status=ExceptionStatus.OPEN,
                            severity="MEDIUM"
                        ))
                    else:
                        matched_count += 1

        # 6. Persist exceptions and update run
        db.add_all(exception_records_to_insert)

        total_records = len(payments)
        total_exceptions = len(exception_records_to_insert)
        match_rate = round((matched_count / total_records * 100), 2) if total_records > 0 else 0.0

        run.status = RunStatus.COMPLETED
        run.completed_at = datetime.now(timezone.utc)

        # 7. Record Audit Log for RECONCILIATION_COMPLETED
        audit_summary = {
            "total_records": total_records,
            "matched_records": matched_count,
            "exceptions_count": total_exceptions,
            "match_rate": f"{match_rate}%",
            "breakdown": {k.value: v for k, v in breakdown_counts.items()},
            "completed_at": run.completed_at.isoformat()
        }
        db.add(AuditLog(
            user_id=user_id,
            action_type=AuditAction.RECONCILIATION_COMPLETED,
            entity_type="RECONCILIATION_RUN",
            entity_id=run.id,
            details=json.dumps(audit_summary)
        ))

        db.commit()

        return ReconcileResponse(
            reconciliation_run_id=run.id,
            status=run.status.value,
            total_records=total_records,
            matched_records=matched_count,
            exceptions_count=total_exceptions,
            match_rate=match_rate,
            breakdown=ExceptionBreakdown(
                AMOUNT_MISMATCH=breakdown_counts[ExceptionType.AMOUNT_MISMATCH],
                MISSING_SETTLEMENT=breakdown_counts[ExceptionType.MISSING_SETTLEMENT],
                DUPLICATE=breakdown_counts[ExceptionType.DUPLICATE],
                REFERENCE_MISMATCH=breakdown_counts[ExceptionType.REFERENCE_MISMATCH],
                UNKNOWN=breakdown_counts[ExceptionType.UNKNOWN]
            )
        )
