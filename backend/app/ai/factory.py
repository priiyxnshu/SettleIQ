"""
SettleIQ AI Provider Factory Module.

Provides factory resolution for obtaining the configured LLM provider instance
(GeminiProvider vs DeterministicProvider) based on environment configuration.
"""

from app.config import settings
from app.ai.provider import BaseLLMProvider, GeminiProvider, DeterministicProvider


def get_llm_provider() -> BaseLLMProvider:
    """
    Resolve and instantiate the active AI investigation provider.

    Returns:
        GeminiProvider if LLM_PROVIDER is 'gemini' and a valid GEMINI_API_KEY is configured;
        otherwise returns DeterministicProvider for offline/deterministic operation.
    """
    if settings.LLM_PROVIDER.lower() == "gemini" and settings.GEMINI_API_KEY and settings.GEMINI_API_KEY != "your_gemini_api_key_here":
        return GeminiProvider(api_key=settings.GEMINI_API_KEY)
    return DeterministicProvider()

