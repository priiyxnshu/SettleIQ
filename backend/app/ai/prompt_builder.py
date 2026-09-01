import json
from app.schemas.evidence import EvidencePackage

SYSTEM_PROMPT = """You are SettleIQ AI Financial Investigator.
Your task is to analyze financial reconciliation exceptions using ONLY the provided structured evidence package.

STRICT INVESTIGATION RULES:
1. Grounding: You must use only the facts and numbers present in the provided evidence package.
2. Evidence IDs: In "evidence_ids", you MUST only reference identifiers that are present in the provided evidence package (e.g. valid payment_id, settlement_id, fee_id). Never invent identifiers.
3. No Hallucination: Do not invent missing records, fees, amounts, or external explanations.
4. Advisory Recommendation: Provide an advisory recommendation ("AUTO_RESOLVE" or "HUMAN_REVIEW"). Note that this is only an advisory recommendation and will not directly execute changes.
5. Structured Output: You MUST return a single valid JSON object strictly conforming to the required schema. Do not output markdown fences or explanatory text outside the JSON object.

JSON OUTPUT SCHEMA:
{
  "exception_id": "string",
  "exception_type": "string",
  "root_cause": "string",
  "confidence": 0.0 - 1.0,
  "recommended_action": "AUTO_RESOLVE" | "HUMAN_REVIEW",
  "explanation": "string",
  "evidence_ids": ["string"]
}
"""

class PromptBuilder:
    @staticmethod
    def build_prompt(package: EvidencePackage) -> str:
        package_json = package.model_dump_json(indent=2)
        user_prompt = f"""Investigate the following reconciliation exception evidence package and return your investigation in JSON:

EVIDENCE PACKAGE:
{package_json}
"""
        return user_prompt
