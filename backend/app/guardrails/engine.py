"""
SettleIQ Guardrail Engine Module.

Provides deterministic validation gates that evaluate AI investigation recommendations
before any settlement exception can be automatically resolved. Acts as an immutable safety
layer preventing unauthorized financial adjustments, hallucinations, or unsafe resolutions.
"""

import json
from typing import Optional, List
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models import (
    ExceptionRecord,
    ReviewDecision,
    AuditLog,
    ExceptionType,
    ExceptionStatus,
    DecisionOutcome,
    AuditAction
)
from app.schemas.ai import AIInvestigationResult
from app.schemas.guardrails import (
    GuardrailChecks,
    DecisionResponse,
    BatchEvaluationSummary
)
from app.services.evidence_builder import EvidenceBuilder
from app.services.ai_investigation_service import AIInvestigationService


class GuardrailEngine:
    """
    Deterministic safety engine enforcing financial integrity policies.

    Evaluates AI-generated investigation results against five mandatory safety gates
    to decide whether an exception may transition to AUTO_RESOLVED or must be routed
    to HUMAN_REVIEW.
    """
    CONFIDENCE_THRESHOLD = 0.90

    @classmethod
    def evaluate_exception(
        cls,
        db: Session,
        exception_id: str,
        ai_result: Optional[AIInvestigationResult] = None,
        user_id: Optional[str] = None
    ) -> DecisionResponse:
        """
        Evaluate a single exception against the five deterministic guardrail checks.

        Safety Gates Evaluated:
            1. Recommendation Validity: AI must explicitly recommend 'AUTO_RESOLVE'
               without triggering fallback heuristics.
            2. Confidence Threshold: AI confidence score must meet or exceed 0.90.
            3. Evidence Grounding: All evidence IDs cited by the AI must exist within
               the pre-calculated facts package (zero tolerance for hallucinated IDs).
            4. Deterministic Policies:
               - Policy A (AMOUNT_MISMATCH): Discrepancy (Payment - Settlement) must
                 exactly equal the recorded processor fee (tolerance <= 0.01).
               - Policy B (REFERENCE_MISMATCH): Alternate order reference correlation
                 must be verified with zero net financial discrepancy (tolerance <= 0.01).
            5. Sanity & Invariants: Fee must not be negative, and settlement status
               must not be pending.

        Updates the ExceptionRecord status, persists the ReviewDecision, writes an
        immutable AuditLog entry, and returns the DecisionResponse.
        """
        # 1. Fetch exception record
        exc = db.query(ExceptionRecord).filter_by(id=exception_id).first()
        if not exc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Exception with ID '{exception_id}' not found."
            )

        # 2. Fetch structured evidence package
        package = EvidenceBuilder.build_package(db, exception_id)

        # 3. Get AI Investigation result if not provided
        if ai_result is None:
            ai_result = AIInvestigationService.investigate(db, exception_id)

        # 4. Evaluate the 5 deterministic guardrail checks
        # Check 1: AI Recommendation Valid
        check_rec = (ai_result.recommended_action == "AUTO_RESOLVE" and not ai_result.is_fallback)

        # Check 2: Confidence Threshold (>= 0.90)
        check_conf = (ai_result.confidence >= cls.CONFIDENCE_THRESHOLD)

        # Check 3: Evidence Grounding (all IDs present in calculated facts)
        valid_evidence_ids = set(package.calculated_facts.evidence_ids)
        check_evidence = (
            len(ai_result.evidence_ids) > 0 and
            all(eid in valid_evidence_ids for eid in ai_result.evidence_ids)
        )

        # Check 4: Explicit Deterministic Policies
        facts = package.calculated_facts
        p_amt = facts.payment_amount
        s_amt = facts.total_settled_amount
        f_amt = facts.total_fee_amount
        shortfall = round(p_amt - s_amt, 2)

        check_known_rule = False

        # Policy A: AMOUNT_MISMATCH where shortfall (P - S) is 100% accounted for by recorded processing fee (F)
        if exc.exception_type == ExceptionType.AMOUNT_MISMATCH and ai_result.root_cause == "PROCESSING_FEE":
            if facts.settlement_count == 1 and facts.fee_count == 1:
                if s_amt > 0 and f_amt > 0 and abs(shortfall - f_amt) <= 0.01:
                    check_known_rule = True

        # Policy B: REFERENCE_MISMATCH where alternate reference is verified and net discrepancy is zero
        elif exc.exception_type == ExceptionType.REFERENCE_MISMATCH and ai_result.root_cause == "CORRELATED_ORDER_REFERENCE":
            if (
                facts.has_alternative_reference and
                facts.settlement_count == 1 and
                facts.fee_count <= 1 and
                p_amt > 0 and
                s_amt > 0 and
                abs(facts.discrepancy_amount) <= 0.01
            ):
                check_known_rule = True

        # Check 5: Sanity and Safety Check
        check_sanity = (
            not facts.is_negative_fee and
            not facts.is_pending_settlement
        )

        all_passed = (
            check_rec and
            check_conf and
            check_evidence and
            check_known_rule and
            check_sanity
        )

        checks_summary = GuardrailChecks(
            recommendation_valid=check_rec,
            confidence_passed=check_conf,
            evidence_grounded=check_evidence,
            known_rule_satisfied=check_known_rule,
            sanity_passed=check_sanity
        )

        # 5. Determine outcome and reason
        if all_passed:
            outcome = DecisionOutcome.AUTO_RESOLVE
            new_status = ExceptionStatus.AUTO_RESOLVED
            if exc.exception_type == ExceptionType.REFERENCE_MISMATCH:
                reason = f"Auto-resolve approved: Order reference correlation verified with zero net financial discrepancy ({facts.discrepancy_amount:.2f}) and confidence ({ai_result.confidence:.2f}) >= {cls.CONFIDENCE_THRESHOLD:.2f}."
            else:
                reason = f"Auto-resolve approved: Discrepancy of {shortfall:.2f} is fully explained by recorded processing fee ({f_amt:.2f}) and confidence ({ai_result.confidence:.2f}) >= {cls.CONFIDENCE_THRESHOLD:.2f}."
            action_type = AuditAction.AUTO_RESOLVED
        else:
            outcome = DecisionOutcome.HUMAN_REVIEW
            new_status = ExceptionStatus.HUMAN_REVIEW
            failed_checks = []
            if not check_rec:
                failed_checks.append("AI did not recommend AUTO_RESOLVE or used fallback")
            if not check_conf:
                failed_checks.append(f"Confidence ({ai_result.confidence:.2f}) below threshold ({cls.CONFIDENCE_THRESHOLD:.2f})")
            if not check_evidence:
                failed_checks.append("Evidence IDs not grounded")
            if not check_known_rule:
                failed_checks.append(f"Requires human operator review for {exc.exception_type.value} exception")
            if not check_sanity:
                failed_checks.append("Sanity check failed (negative fee or pending settlement)")
            
            reason = f"Routed to human review: {'; '.join(failed_checks)}."
            action_type = AuditAction.SENT_TO_REVIEW

        # 6. Database updates
        exc.status = new_status

        decision = db.query(ReviewDecision).filter_by(exception_id=exc.id).first()
        if not decision:
            decision = ReviewDecision(
                exception_id=exc.id,
                recommended_action=ai_result.recommended_action,
                decision_outcome=outcome,
                confidence=ai_result.confidence,
                decided_by="SYSTEM",
                reason=reason
            )
            db.add(decision)
        else:
            decision.recommended_action = ai_result.recommended_action
            decision.decision_outcome = outcome
            decision.confidence = ai_result.confidence
            decision.decided_by = "SYSTEM"
            decision.reason = reason

        audit_entry = AuditLog(
            user_id=user_id,
            action_type=action_type,
            entity_type="EXCEPTION",
            entity_id=exc.id,
            details=json.dumps({
                "decision_outcome": outcome.value,
                "ai_recommendation": ai_result.recommended_action,
                "confidence": ai_result.confidence,
                "reason": reason,
                "checks": checks_summary.model_dump()
            })
        )
        db.add(audit_entry)
        db.commit()

        return DecisionResponse(
            exception_id=exc.id,
            decision_outcome=outcome,
            recommended_action=ai_result.recommended_action,
            confidence=ai_result.confidence,
            decided_by="SYSTEM",
            reason=reason,
            checks=checks_summary
        )

    @classmethod
    def evaluate_run(
        cls,
        db: Session,
        reconciliation_run_id: str,
        user_id: Optional[str] = None
    ) -> BatchEvaluationSummary:
        """
        Evaluate all exception records associated with a specific reconciliation run.

        Iterates through all exceptions in the run, executes evaluate_exception() on each,
        tallies AUTO_RESOLVED vs HUMAN_REVIEW counts, and aggregates a comprehensive
        BatchEvaluationSummary.
        """
        exceptions = db.query(ExceptionRecord).filter_by(reconciliation_run_id=reconciliation_run_id).all()
        decisions: List[DecisionResponse] = []
        auto_count = 0
        review_count = 0

        for exc in exceptions:
            dec = cls.evaluate_exception(db=db, exception_id=exc.id, user_id=user_id)
            decisions.append(dec)
            if dec.decision_outcome == DecisionOutcome.AUTO_RESOLVE:
                auto_count += 1
            else:
                review_count += 1

        return BatchEvaluationSummary(
            reconciliation_run_id=reconciliation_run_id,
            total_exceptions=len(exceptions),
            auto_resolved_count=auto_count,
            human_review_count=review_count,
            decisions=decisions
        )
