"""
Functional tests for the LiteLLMAdapter.
"""

import pytest
from unittest.mock import patch, MagicMock, AsyncMock
import sys
import os
import asyncio

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from logprob_ranker.ranker import LiteLLMAdapter, LogProbConfig, RankedOutput, AttributeScore

@pytest.fixture
def config():
    """Provides a LogProbConfig instance for tests."""
    return LogProbConfig(
        num_variants=1,
        thread_count=1,
        template='{"clear": LOGPROB_TRUE, "useful": LOGPROB_TRUE}',
        max_tokens=50
    )

@pytest.mark.asyncio
@patch('logprob_ranker.ranker.litellm')
async def test_simple_rank(mock_litellm, config):
    """Test basic ranking functionality with a single output."""
    # Create response for generation
    generation_response = MagicMock()
    generation_response.choices = [
        MagicMock(message=MagicMock(role="assistant", content="Generated test content"))
    ]
    
    # Create response for evaluation
    evaluation_response = MagicMock()
    evaluation_response.choices = [
        MagicMock(message=MagicMock(role="assistant", content='{"clear": true, "useful": false}'))
    ]
    
    # Configure the async mock to return our responses in sequence
    # The AsyncMock automatically handles the awaiting, so side_effect provides the *results*
    mock_litellm.acompletion = AsyncMock(side_effect=[
        generation_response,
        evaluation_response,
    ])
    
    # Create adapter with our mocked litellm
    adapter = LiteLLMAdapter(
        model="gpt-3.5-turbo",
        api_key="test-key",
        config=config
    )
    
    # Run with a simple prompt using the sync wrapper
    results = await adapter.rank_outputs("Test prompt")
    
    # Create expected result manually for comparison
    expected_output = RankedOutput(
        output="Generated test content",
        logprob=0.5,  # (1.0 + 0.0) / 2
        index=0,
        attribute_scores=[
            AttributeScore(name="clear", score=1.0),
            AttributeScore(name="useful", score=0.0)
        ],
        raw_evaluation='{"clear": true, "useful": false}'
    )
    
    # Verify basic result
    assert len(results) == 1
    assert results[0].output == expected_output.output
    assert results[0].logprob == expected_output.logprob

def test_sync_wrapper(config):
    """Test that the synchronous wrapper works correctly."""
    # Create adapter
    adapter = LiteLLMAdapter(
        model="gpt-3.5-turbo",
        api_key="test-key",
        config=config
    )

    # Mock the underlying async method rank_outputs
    mock_async_result = [
        RankedOutput(output="Test output", logprob=0.75, index=0)
    ]
    adapter.rank_outputs = AsyncMock(return_value=mock_async_result)

    # Call synchronous method
    results = adapter.rank_outputs_sync("Test prompt")

    # Verify results
    assert len(results) == 1
    assert results[0].output == "Test output"
    # Verify the async method was called
    adapter.rank_outputs.assert_awaited_once_with("Test prompt")