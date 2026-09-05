"""
SettleIQ Report Service Module.

Aggregates reconciliation metrics, financial summaries, exception distributions, and audit
statistics for a specified run. Generates executive narrative commentary using Google Gemini
with grounded numerical facts, backed by a deterministic template fallback.
"""

import uuid
import json
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
import httpx
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.config import settings
from app.models import (
    ReconciliationRun,
    PaymentRecord,
    SettlementRecord,
    ExceptionRecord,
    ExceptionStatus,
    ExceptionType,
    DecisionOutcome,
    Upload
)
from app.schemas.report import (
    ReportMetrics,
    ReportNarrative,
    ReconciliationReportData
)


class ReportService:
    """
    Service generating comprehensive reconciliation summary data and executive narratives.
    """

    @staticmethod
    def get_run_report_data(
        db: Session,
        run_id: Optional[str] = None,
        generated_by: str = "Yash Jain (Checker)"
    ) -> ReconciliationReportData:
        """
        Extract financial metrics and generate narrative commentary for a reconciliation run.

        Aggregates:
            - Payment, settlement, and discrepancy sums
            - Clean match rates and automated resolution rates
            - Exception breakdown by type
            - Maker-Checker human approval vs pending counts
            - Grounded narrative commentary (AI or deterministic fallback)

        Args:
            db: Active database session.
            run_id: Specific reconciliation run ID or 'latest'.
            generated_by: Attribution name for audit logging.

        Returns:
            ReconciliationReportData ready for API response or PDF compilation.
        """
        # 1. Resolve Target Reconciliation Run
        if run_id and run_id.lower() != "latest":
            run = db.query(ReconciliationRun).filter_by(id=run_id).first()
        else:
            run = db.query(ReconciliationRun).order_by(ReconciliationRun.started_at.desc()).first()

        if not run:
            raise ValueError("No reconciliation runs found in database.")

        # 2. Extract Deterministic Counts and Financial Aggregates
        total_payments = db.query(PaymentRecord).filter_by(reconciliation_run_id=run.id).count()
        exceptions = (
            db.query(ExceptionRecord)
            .options(joinedload(ExceptionRecord.decision))
            .filter_by(reconciliation_run_id=run.id)
            .all()
        )
        exceptions_count = len(exceptions)
        matched_count = max(0, total_payments - exceptions_count)

        auto_resolved_count = sum(
            1 for e in exceptions
            if e.status == ExceptionStatus.AUTO_RESOLVED and (not e.decision or e.decision.decision_outcome != DecisionOutcome.APPROVED)
        )
        human_approved_count = sum(
            1 for e in exceptions
            if e.status == ExceptionStatus.AUTO_RESOLVED and e.decision and e.decision.decision_outcome == DecisionOutcome.APPROVED
        )
        human_review_count = sum(1 for e in exceptions if e.status == ExceptionStatus.HUMAN_REVIEW)

        match_rate = round((matched_count / total_payments * 100), 2) if total_payments > 0 else 0.0
        auto_res_rate = round((auto_resolved_count / exceptions_count * 100), 2) if exceptions_count > 0 else 0.0

        # Financial totals
        expected_amount = float(
            db.query(func.coalesce(func.sum(PaymentRecord.payment_amount), 0.0))
            .filter(PaymentRecord.reconciliation_run_id == run.id)
            .scalar()
        )
        settled_amount = float(
            db.query(func.coalesce(func.sum(SettlementRecord.settlement_amount), 0.0))
            .filter(
                SettlementRecord.reconciliation_run_id == run.id,
                func.upper(SettlementRecord.settlement_status) == "SETTLED"
            )
            .scalar()
        )
        difference_amount = round(expected_amount - settled_amount, 2)

        # Exception type breakdown
        breakdown: Dict[str, int] = {
            ExceptionType.AMOUNT_MISMATCH.value: 0,
            ExceptionType.MISSING_SETTLEMENT.value: 0,
            ExceptionType.DUPLICATE.value: 0,
            ExceptionType.REFERENCE_MISMATCH.value: 0,
            ExceptionType.UNKNOWN.value: 0,
        }
        for e in exceptions:
            breakdown[e.exception_type.value] = breakdown.get(e.exception_type.value, 0) + 1

        # Check for batch info from settlements or run
        first_settlement = (
            db.query(SettlementRecord)
            .filter(SettlementRecord.reconciliation_run_id == run.id, SettlementRecord.settlement_batch_id.isnot(None))
            .first()
        )
        batch_reference = (
            first_settlement.settlement_batch_id
            if first_settlement and first_settlement.settlement_batch_id
            else f"BATCH-{run.id[:8].upper()}"
        )

        metrics = ReportMetrics(
            total_transactions=total_payments,
            expected_amount=round(expected_amount, 2),
            settled_amount=round(settled_amount, 2),
            difference_amount=difference_amount,
            matched_count=matched_count,
            exceptions_count=exceptions_count,
            auto_resolved_count=auto_resolved_count,
            human_approved_count=human_approved_count,
            human_review_count=human_review_count,
            match_rate=match_rate,
            auto_resolution_rate=auto_res_rate
        )

        # 3. Generate Non-Authoritative Narrative (AI with Deterministic Fallback)
        narrative, model_used = ReportService._generate_narrative(
            run=run,
            metrics=metrics,
            breakdown=breakdown
        )

        return ReconciliationReportData(
            report_id=f"REP-{uuid.uuid4().hex[:8].upper()}",
            run_id=run.id,
            run_status=run.status.value if hasattr(run.status, "value") else str(run.status),
            batch_reference=batch_reference,
            started_at=run.started_at,
            completed_at=run.completed_at,
            generated_at=datetime.now(timezone.utc),
            generated_by=generated_by,
            metrics=metrics,
            exception_breakdown=breakdown,
            narrative=narrative,
            model_used=model_used
        )

    @staticmethod
    def _generate_narrative(
        run: ReconciliationRun,
        metrics: ReportMetrics,
        breakdown: Dict[str, int]
    ) -> tuple[ReportNarrative, str]:
        """
        Generate executive narrative commentary using Gemini or deterministic fallback.
        """
        # Attempt LLM if configured
        if settings.GEMINI_API_KEY and settings.GEMINI_API_KEY.strip() != "" and settings.GEMINI_API_KEY != "your_gemini_api_key_here":
            try:
                narrative = ReportService._call_gemini_narrative(metrics, breakdown, run)
                return narrative, "gemini-3.6-flash"
            except Exception:
                pass

        # Deterministic Grounded Fallback
        narrative = ReportService._build_deterministic_narrative(metrics, breakdown, run)
        return narrative, "deterministic-engine"

    @staticmethod
    def _call_gemini_narrative(
        metrics: ReportMetrics,
        breakdown: Dict[str, int],
        run: ReconciliationRun
    ) -> ReportNarrative:
        endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key={settings.GEMINI_API_KEY}"
        headers = {"Content-Type": "application/json"}

        prompt = f"""You are SettleIQ Financial Reporting AI.
Generate a concise, professional executive reconciliation narrative based EXCLUSIVELY on these verified factual numbers:

FACTS:
- Total Processed Transactions: {metrics.total_transactions}
- Expected Amount: INR {metrics.expected_amount:,.2f}
- Settled Amount: INR {metrics.settled_amount:,.2f}
- Discrepancy Amount: INR {metrics.difference_amount:,.2f}
- Clean Matched Transactions: {metrics.matched_count} ({metrics.match_rate}%)
- Total Exceptions: {metrics.exceptions_count}
- Auto-Resolved Exceptions: {metrics.auto_resolved_count}
- Human-Approved Exceptions: {metrics.human_approved_count}
- Pending Human Review: {metrics.human_review_count}
- Exception Type Breakdown: {json.dumps(breakdown)}

STRICT RULES:
1. Grounding: Do NOT invent numbers, fees, percentages, or external entities. Use only the provided figures.
2. Return a single JSON object strictly following this schema:
{{
  "executive_summary": "string (1-2 sentences summarizing processed volume, settled value, and overall match health)",
  "reconciliation_outcome": "string (1-2 sentences stating resolution outcome, auto-resolved count, and remaining review status)",
  "key_findings": ["string (finding 1)", "string (finding 2)", "string (finding 3)"],
  "conclusion": "string (1 sentence concluding financial audit readiness)"
}}
"""
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"response_mime_type": "application/json"}
        }

        response = httpx.post(endpoint, headers=headers, json=payload, timeout=12.0)
        response.raise_for_status()
        data = response.json()
        raw_text = data["candidates"][0]["content"]["parts"][0]["text"]
        parsed = json.loads(raw_text)

        return ReportNarrative(
            executive_summary=parsed.get("executive_summary", "").strip(),
            reconciliation_outcome=parsed.get("reconciliation_outcome", "").strip(),
            key_findings=parsed.get("key_findings", []),
            conclusion=parsed.get("conclusion", "").strip()
        )

    @staticmethod
    def _build_deterministic_narrative(
        metrics: ReportMetrics,
        breakdown: Dict[str, int],
        run: ReconciliationRun
    ) -> ReportNarrative:
        amt_diff = metrics.difference_amount
        variance_desc = (
            "fully matched with zero net discrepancy"
            if abs(amt_diff) <= 0.01
            else f"a net settlement variance of INR {amt_diff:,.2f}"
        )

        executive_summary = (
            f"During this reconciliation cycle, SettleIQ verified {metrics.total_transactions} payment transactions "
            f"representing INR {metrics.expected_amount:,.2f} in expected gross value against processor settlements of "
            f"INR {metrics.settled_amount:,.2f}. The deterministic matching engine achieved an initial match rate of "
            f"{metrics.match_rate}%, flagging {metrics.exceptions_count} exceptions for automated guardrail evaluation."
        )

        if metrics.human_review_count == 0:
            outcome = (
                f"Reconciliation completed with 100% item disposition. System guardrails auto-resolved "
                f"{metrics.auto_resolved_count} exceptions ({metrics.auto_resolution_rate}% automation rate), and "
                f"{metrics.human_approved_count} items were verified and authorized by the Reconciliation Manager, leaving 0 items pending."
            )
        else:
            outcome = (
                f"Reconciliation verified with pending operational review items. While {metrics.auto_resolved_count} exceptions "
                f"were auto-resolved by verified guardrails, {metrics.human_review_count} flagged transactions currently remain "
                f"in the Review Queue awaiting authorized Maker-Checker review."
            )

        findings: List[str] = [
            f"Financial Settlement Status: Expected INR {metrics.expected_amount:,.2f} against settled INR {metrics.settled_amount:,.2f}, resulting in {variance_desc}.",
            f"Automated Resolution Efficiency: {metrics.auto_resolved_count} of {metrics.exceptions_count} exceptions successfully auto-resolved via deterministic guardrails.",
            f"Exception Distribution: Flagged {breakdown.get('AMOUNT_MISMATCH', 0)} amount differences, {breakdown.get('MISSING_SETTLEMENT', 0)} missing processor records, and {breakdown.get('REFERENCE_MISMATCH', 0)} order reference discrepancies."
        ]

        if metrics.human_approved_count > 0:
            findings.append(f"Maker-Checker Approvals: {metrics.human_approved_count} exceptions formally approved by human review with full audit trails recorded.")
        elif metrics.human_review_count > 0:
            findings.append(f"Open Queue Alert: {metrics.human_review_count} transactions require manager decision before audit sign-off.")

        conclusion = (
            "All transaction states, automated rule triggers, and reviewer decisions are immutably preserved "
            "within SettleIQ audit logs, providing complete institutional compliance and accounting traceability."
        )

        return ReportNarrative(
            executive_summary=executive_summary,
            reconciliation_outcome=outcome,
            key_findings=findings,
            conclusion=conclusion
        )
