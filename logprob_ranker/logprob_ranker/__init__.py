"""
LogProb Ranker: Core library components.
"""

__version__ = "0.2.0"  # Ensure this is the correct version

# Imports from models.py
from .models import (
    LogProbConfig,
    RankedOutput,
    AttributeScore
    # Add other models here if they become part of the public API
)

# Imports from ranker.py
from .ranker import (
    LogProbRanker,
    LiteLLMAdapter,
    LLMGenerationError,
    EvaluationParseError, # This seems to be an old error, check if still used/needed
    LogprobsNotAvailableError,
    MalformedLogprobsError,
    TextEvaluationResult  # Moved here from models import
    # Add other ranker components here if they become part of the public API
)

# Imports from ranker.py (for high-level API functions)
from .ranker import get_scores_for_attributes

# Public API definition
__all__ = [
    # Version
    "__version__",

    # From models.py
    "LogProbConfig",
    "RankedOutput",
    "AttributeScore",

    # From ranker.py
    "LogProbRanker",
    "LiteLLMAdapter",
    "LLMGenerationError",
    "EvaluationParseError", # Review if this error is still relevant
    "LogprobsNotAvailableError",
    "MalformedLogprobsError",
    "TextEvaluationResult", # Added here

    # From ranker.py (high-level API)
    "get_scores_for_attributes",
]