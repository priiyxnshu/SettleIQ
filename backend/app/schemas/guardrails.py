from typing import List, Optional, Dict
from pydantic import BaseModel, Field
from app.models.enums import DecisionOutcome

class GuardrailChecks(BaseModel):
    recommendation_valid: bool
    confidence_passed: bool
    evidence_grounded: bool
    known_rule_satisfied: bool
    sanity_passed: bool

class DecisionResponse(BaseModel):
    exception_id: str
    decision_outcome: DecisionOutcome
    recommended_action: str
    confidence: float
    decided_by: str = "SYSTEM"
    reason: str
    checks: GuardrailChecks

class BatchEvaluationSummary(BaseModel):
    reconciliation_run_id: str
    total_exceptions: int
    auto_resolved_count: int
    human_review_count: int
    decisions: List[DecisionResponse]
