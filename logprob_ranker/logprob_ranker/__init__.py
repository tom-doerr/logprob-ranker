"""
LogProb Ranker: Core library components.
"""

__version__ = "0.2.0"  # Current version

# Imports from models.py
from .models import (
    LogProbConfig,
    RankedOutput,
    AttributeScore
)

# Imports from ranker.py
from .ranker import (
    LogProbRanker,
    LiteLLMAdapter,
    LLMGenerationError,
    EvaluationParseError,
    LogprobsNotAvailableError,
    MalformedLogprobsError,
    TextEvaluationResult,
    get_scores_for_attributes
)

# Public API definition
__all__ = [
    "__version__",
    "LogProbConfig",
    "RankedOutput",
    "AttributeScore",
    "LogProbRanker",
    "LiteLLMAdapter",
    "LLMGenerationError",
    "EvaluationParseError",
    "LogprobsNotAvailableError",
    "MalformedLogprobsError",
    "TextEvaluationResult",
    "get_scores_for_attributes"
]
