"""
Pydantic models for the LogProb Ranker.

This module defines the data structures used for configuration,
attribute scoring, and ranked outputs.
"""
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, field_validator

class AttributeScore(BaseModel):
    """
    Represents an attribute and its associated score from the evaluation.
    """
    name: str
    score: float
    explanation: str = ""  # Optional explanation for the score

class RankedOutput(BaseModel):
    """
    Represents a generated output with its evaluation scores and metadata.
    """
    output: str
    logprob: float
    index: int
    attribute_scores: Optional[List[AttributeScore]] = None
    raw_evaluation: Optional[str] = None

class LogProbConfig(BaseModel):
    """
    Configuration for the LogProb ranker.
    """
    # LLM generation parameters
    temperature: float = 0.7
    max_tokens: int = 1000
    top_p: float = 1.0
    
    # Ranking parameters
    num_variants: int = 5
    thread_count: int = 1 # Retained for now, though async is primary
    
    # Evaluation template (uses LOGPROB_TRUE placeholders)
    template: str = """{
  "interesting": LOGPROB_TRUE,
  "creative": LOGPROB_TRUE,
  "useful": LOGPROB_TRUE
}"""
    
    # Prompts
    system_prompt: str = "You are a creative assistant that provides a single concise response."
    evaluation_prompt: str = (
        "You are an evaluator. Evaluate the following text based on the criteria.\n"
        "Return ONLY a JSON object with your evaluation. "
        "Use JSON boolean values (true/false)."
    )

    # Pydantic V2+ configuration
    model_config = ConfigDict(
        # Example: Allow extra fields if needed, though defaults are usually fine
        # extra = 'allow'
    )

    @field_validator('num_variants', 'thread_count')
    @classmethod
    def check_positive(cls, value: int, field) -> int:
        """Validate that num_variants and thread_count are positive."""
        if value <= 0:
            raise ValueError(f'{field.name} must be positive')
        return value
