"""
LogProb Ranker: A library for ranking LLM outputs by log probability scoring
"""

from .logprob_ranker import (
    LogProbRanker,
    LogProbConfig,
    RankedOutput,
    AttributeScore,
    LiteLLMAdapter,
    LLMGenerationError,
    EvaluationParseError,
    LogprobsNotAvailableError
)

# Attempt to import version from the submodule
try:
    from .logprob_ranker import __version__
except ImportError:
    __version__ = "0.0.0-unknown"

__all__ = [
    "LogProbRanker",
    "LogProbConfig",
    "RankedOutput",
    "AttributeScore",
    "LiteLLMAdapter",
    "LLMGenerationError",
    "EvaluationParseError",
    "LogprobsNotAvailableError",
    "__version__"
]
