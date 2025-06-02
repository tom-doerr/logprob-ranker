"""
Custom exceptions for the LogProb ranker.
"""

class LLMGenerationError(Exception):
    """Custom exception for errors during LLM generation."""

class EvaluationParseError(Exception):
    """Custom exception for errors during evaluation parsing."""

class LogprobsNotAvailableError(LLMGenerationError):
    """Custom exception for when logprobs are expected but not available or processable."""

class MalformedLogprobsError(LLMGenerationError):
    """Custom exception for when logprobs are present but malformed or unprocessable."""
