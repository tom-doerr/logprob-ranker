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

__all__ = [
    "LogProbRanker",
    "LogProbConfig",
    "RankedOutput",
    "AttributeScore",
    "LiteLLMAdapter"
]
