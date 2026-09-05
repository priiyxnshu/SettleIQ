import pytest
from app.ai.provider import DeterministicProvider

@pytest.fixture(autouse=True)
def force_deterministic_llm_provider_for_tests(monkeypatch):
    """
    Forces the test environment to use the existing DeterministicProvider instead of making live Gemini API calls.
    Prevents API rate-limiting (HTTP 429), ensures 100% deterministic tests, and avoids consuming Gemini quota.
    Production behavior remains completely unchanged.
    """
    monkeypatch.setattr("app.ai.factory.get_llm_provider", lambda: DeterministicProvider())
    monkeypatch.setattr("app.services.ai_investigation_service.get_llm_provider", lambda: DeterministicProvider())
