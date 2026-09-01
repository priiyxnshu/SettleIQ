from app.config import settings
from app.ai.provider import BaseLLMProvider, GeminiProvider, DeterministicProvider

def get_llm_provider() -> BaseLLMProvider:
    if settings.LLM_PROVIDER.lower() == "gemini" and settings.GEMINI_API_KEY and settings.GEMINI_API_KEY != "your_gemini_api_key_here":
        return GeminiProvider(api_key=settings.GEMINI_API_KEY)
    return DeterministicProvider()
