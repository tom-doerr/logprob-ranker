"""
LogProb Ranker: A library for ranking LLM outputs by log probability scoring
"""

__version__ = "0.1.0"

from .ranker import (
    LogProbRanker,
    LogProbConfig,
    RankedOutput,
    AttributeScore,
    OpenAIAdapter,
    AnthropicAdapter
)

__all__ = [
    "LogProbRanker",
    "LogProbConfig",
    "RankedOutput",
    "AttributeScore",
    "OpenAIAdapter",
    "AnthropicAdapter"
]