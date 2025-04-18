"""
LogProb Ranker: A library for ranking LLM outputs by log probability scoring
"""

__version__ = "0.2.0"  # Updated for LiteLLM integration

from .ranker import (
    LogProbRanker,
    LogProbConfig,
    RankedOutput,
    AttributeScore,
    LiteLLMAdapter
)

# Import OpenRouter adapter
try:
    from .openrouter import OpenRouterAdapter, get_full_model_name
    __all__ = [
        "LogProbRanker",
        "LogProbConfig",
        "RankedOutput",
        "AttributeScore",
        "LiteLLMAdapter",
        "OpenRouterAdapter",
        "get_full_model_name"
    ]
except ImportError:
    # If litellm is not installed, OpenRouter won't be available
    __all__ = [
        "LogProbRanker",
        "LogProbConfig",
        "RankedOutput",
        "AttributeScore",
        "LiteLLMAdapter"
    ]