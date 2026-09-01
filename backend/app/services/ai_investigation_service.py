from typing import Optional, List
import logging
from sqlalchemy.orm import Session
from pydantic import ValidationError

from app.schemas.ai import AIInvestigationResult
from app.services.evidence_builder import EvidenceBuilder
from app.ai.prompt_builder import PromptBuilder
from app.ai.factory import get_llm_provider
from app.ai.provider import BaseLLMProvider

logger = logging.getLogger(__name__)

class AIInvestigationService:
    @staticmethod
    def investigate(
        db: Session,
        exception_id: str,
        provider_override: Optional[BaseLLMProvider] = None
    ) -> AIInvestigationResult:
        # 1. Fetch structured evidence package
        package = EvidenceBuilder.build_package(db, exception_id)
        valid_evidence_ids = set(package.calculated_facts.evidence_ids)

        # 2. Select provider and build prompt
        provider = provider_override or get_llm_provider()
        prompt = PromptBuilder.build_prompt(package)

        try:
            # 3. Call LLM provider
            raw_response = provider.generate_investigation(prompt, package)

            # 4. Filter evidence_ids to ensure strict grounding (no invented IDs)
            raw_evidence_ids: List[str] = raw_response.get("evidence_ids", [])
            grounded_evidence_ids = [eid for eid in raw_evidence_ids if eid in valid_evidence_ids]
            if not grounded_evidence_ids:
                grounded_evidence_ids = package.calculated_facts.evidence_ids

            # 5. Schema validation
            return AIInvestigationResult(
                exception_id=package.exception_id,
                exception_type=package.exception_type,
                root_cause=raw_response.get("root_cause", "UNKNOWN_ROOT_CAUSE"),
                confidence=float(raw_response.get("confidence", 0.0)),
                recommended_action=raw_response.get("recommended_action", "HUMAN_REVIEW"),
                explanation=raw_response.get("explanation", "No explanation provided."),
                evidence_ids=grounded_evidence_ids,
                model_used=raw_response.get("model_used", "gemini"),
                is_fallback=False
            )

        except Exception as e:
            logger.warning(f"AI Investigation failed safely for exception {exception_id}: {str(e)}")
            # Safe failure fallback
            return AIInvestigationResult(
                exception_id=package.exception_id,
                exception_type=package.exception_type,
                root_cause="AI_UNAVAILABLE_OR_ERROR",
                confidence=0.0,
                recommended_action="HUMAN_REVIEW",
                explanation=f"AI investigation was unavailable or returned an invalid payload ({str(e)}). Safely routed to human review.",
                evidence_ids=package.calculated_facts.evidence_ids,
                model_used="safe-fallback",
                is_fallback=True
            )
