import json
from abc import ABC, abstractmethod
from typing import Dict, Any, List
import httpx
from app.schemas.evidence import EvidencePackage
from app.models.enums import ExceptionType

class BaseLLMProvider(ABC):
    @abstractmethod
    def generate_investigation(self, prompt: str, package: EvidencePackage) -> Dict[str, Any]:
        pass


class DeterministicProvider(BaseLLMProvider):
    """
    Deterministic AI provider grounded in the supplied EvidencePackage.
    Enables reproducible evaluation, local offline testing, and instant development feedback.
    """
    def generate_investigation(self, prompt: str, package: EvidencePackage) -> Dict[str, Any]:
        facts = package.calculated_facts
        exc_type = package.exception_type
        evidence_ids = facts.evidence_ids

        if exc_type == ExceptionType.AMOUNT_MISMATCH:
            if abs(facts.discrepancy_amount) > 0.01:
                return {
                    "exception_id": package.exception_id,
                    "exception_type": exc_type.value,
                    "root_cause": "UNEXPLAINED_AMOUNT_DIFFERENCE",
                    "confidence": 0.92,
                    "recommended_action": "HUMAN_REVIEW",
                    "explanation": f"Payment of {facts.payment_amount:.2f} differs from settlement ({facts.total_settled_amount:.2f}) and fee ({facts.total_fee_amount:.2f}) by {facts.discrepancy_amount:.2f}.",
                    "evidence_ids": evidence_ids,
                    "model_used": "deterministic-engine"
                }
            else:
                return {
                    "exception_id": package.exception_id,
                    "exception_type": exc_type.value,
                    "root_cause": "PROCESSING_FEE",
                    "confidence": 0.96,
                    "recommended_action": "AUTO_RESOLVE",
                    "explanation": f"Settlement amount is lower than payment by exactly the recorded processing fee ({facts.total_fee_amount:.2f}).",
                    "evidence_ids": evidence_ids,
                    "model_used": "deterministic-engine"
                }

        elif exc_type == ExceptionType.MISSING_SETTLEMENT:
            return {
                "exception_id": package.exception_id,
                "exception_type": exc_type.value,
                "root_cause": "UNSETTLED_PAYMENT",
                "confidence": 0.95,
                "recommended_action": "HUMAN_REVIEW",
                "explanation": f"Payment {package.source_reference} of {facts.payment_amount:.2f} exists but has zero corresponding settlement records in the processor batch.",
                "evidence_ids": evidence_ids,
                "model_used": "deterministic-engine"
            }

        elif exc_type == ExceptionType.DUPLICATE:
            return {
                "exception_id": package.exception_id,
                "exception_type": exc_type.value,
                "root_cause": "DUPLICATE_SETTLEMENT_RECORD",
                "confidence": 0.95,
                "recommended_action": "HUMAN_REVIEW",
                "explanation": f"Detected {facts.settlement_count} distinct settlement records for single payment {package.source_reference}. Total settled {facts.total_settled_amount:.2f}.",
                "evidence_ids": evidence_ids,
                "model_used": "deterministic-engine"
            }

        elif exc_type == ExceptionType.REFERENCE_MISMATCH:
            return {
                "exception_id": package.exception_id,
                "exception_type": exc_type.value,
                "root_cause": "REFERENCE_MISMATCH_DETECTED",
                "confidence": 0.95,
                "recommended_action": "HUMAN_REVIEW",
                "explanation": f"Settlement was linked via order reference rather than direct payment ID. Net settlement {facts.total_settled_amount:.2f} corresponds to payment {facts.payment_amount:.2f}.",
                "evidence_ids": evidence_ids,
                "model_used": "deterministic-engine"
            }

        else:  # UNKNOWN
            return {
                "exception_id": package.exception_id,
                "exception_type": exc_type.value,
                "root_cause": "AMBIGUOUS_FINANCIAL_ANOMALY",
                "confidence": 0.35,
                "recommended_action": "HUMAN_REVIEW",
                "explanation": f"Anomalous financial state detected: negative fees ({facts.is_negative_fee}) or pending status ({facts.is_pending_settlement}). Requires manual investigation.",
                "evidence_ids": evidence_ids,
                "model_used": "deterministic-engine"
            }


class GeminiProvider(BaseLLMProvider):
    """
    Google Gemini API provider calling Gemini 2.5/Flash endpoint with JSON mode.
    """
    def __init__(self, api_key: str, model: str = "gemini-2.5-flash"):
        self.api_key = api_key
        self.model = model
        self.endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent?key={self.api_key}"

    def generate_investigation(self, prompt: str, package: EvidencePackage) -> Dict[str, Any]:
        if not self.api_key or self.api_key == "your_gemini_api_key_here":
            # Fall back to deterministic provider if no live API key is configured
            return DeterministicProvider().generate_investigation(prompt, package)

        headers = {"Content-Type": "application/json"}
        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": prompt}
                    ]
                }
            ],
            "generationConfig": {
                "response_mime_type": "application/json"
            }
        }

        response = httpx.post(self.endpoint, headers=headers, json=payload, timeout=15.0)
        response.raise_for_status()
        data = response.json()

        # Extract text content from Gemini response
        text = data["candidates"][0]["content"]["parts"][0]["text"]
        result = json.loads(text)
        result["model_used"] = self.model
        return result
