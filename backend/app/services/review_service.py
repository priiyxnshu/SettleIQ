import json
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models import (
    ExceptionRecord,
    ReviewDecision,
    AuditLog,
    ExceptionStatus,
    DecisionOutcome,
    AuditAction
)
from app.schemas.review import HumanReviewRequest, HumanReviewResponse, HumanReviewAction

class ReviewService:
    @staticmethod
    def apply_review(
        db: Session,
        exception_id: str,
        request: HumanReviewRequest
    ) -> HumanReviewResponse:
        exc = db.query(ExceptionRecord).filter_by(id=exception_id).first()
        if not exc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Exception with ID '{exception_id}' not found."
            )

        # Precondition: Only exceptions in HUMAN_REVIEW status can be reviewed
        if exc.status != ExceptionStatus.HUMAN_REVIEW:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot submit review: Exception '{exception_id}' is currently in '{exc.status.value}' status. Only exceptions in 'HUMAN_REVIEW' can be reviewed."
            )

        # Dynamic operator identification
        operator = request.reviewed_by or request.user_id or "finance_operator"

        # Action handling & state transitions
        if request.action == HumanReviewAction.APPROVE:
            new_status = ExceptionStatus.AUTO_RESOLVED
            outcome = DecisionOutcome.APPROVED
            action_type = AuditAction.HUMAN_APPROVED
            default_reason = f"Manually approved and resolved by {operator}"
        elif request.action == HumanReviewAction.REJECT:
            new_status = ExceptionStatus.HUMAN_REVIEW
            outcome = DecisionOutcome.REJECTED
            action_type = AuditAction.HUMAN_REJECTED
            default_reason = f"Resolution rejected by {operator}"
        else:  # KEEP_UNRESOLVED
            new_status = ExceptionStatus.HUMAN_REVIEW
            outcome = DecisionOutcome.HUMAN_REVIEW
            action_type = AuditAction.SENT_TO_REVIEW
            default_reason = f"Kept in review queue for further investigation by {operator}"

        reason = request.notes.strip() if request.notes and request.notes.strip() else default_reason
        now = datetime.now(timezone.utc)

        # Update exception status
        exc.status = new_status

        # Upsert ReviewDecision
        decision = db.query(ReviewDecision).filter_by(exception_id=exc.id).first()
        if not decision:
            decision = ReviewDecision(
                exception_id=exc.id,
                decision_outcome=outcome,
                decided_by=operator,
                reason=reason,
                created_at=now
            )
            db.add(decision)
        else:
            decision.decision_outcome = outcome
            decision.decided_by = operator
            decision.reason = reason
            decision.created_at = now

        # Append immutable AuditLog
        audit_entry = AuditLog(
            user_id=request.user_id,
            action_type=action_type,
            entity_type="EXCEPTION",
            entity_id=exc.id,
            details=json.dumps({
                "action": request.action.value,
                "decided_by": operator,
                "decision_outcome": outcome.value,
                "new_status": new_status.value,
                "notes": request.notes
            }),
            created_at=now
        )
        db.add(audit_entry)
        db.commit()

        return HumanReviewResponse(
            exception_id=exc.id,
            action_taken=request.action,
            new_status=new_status,
            decision_outcome=outcome,
            decided_by=operator,
            notes=request.notes,
            timestamp=now
        )
