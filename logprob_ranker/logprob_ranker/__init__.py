"""
LogProb Ranker: A library for ranking LLM outputs by log probability scoring
"""

__version__ = '0.1.0'

from .ranker import (
    LogProbRanker,
    RankedOutput,
    AttributeScore,
    LogProbConfig
)