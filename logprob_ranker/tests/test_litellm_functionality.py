"""
Functional tests for the LiteLLMAdapter.
"""

# Standard library imports
import os
import sys
from unittest.mock import patch, MagicMock, AsyncMock

# Third-party imports
import pytest

# Add parent directory to path
# Adjusting path to point to project root for consistency
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

# First-party imports
# Assuming RankedOutput and AttributeScore are not used in this specific file based on typical Pylint behavior for unused imports.
# If they are used, this will need to be adjusted.
from logprob_ranker.logprob_ranker.ranker import LiteLLMAdapter, LogProbConfig, RankedOutput, AttributeScore

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
@patch('logprob_ranker.logprob_ranker.ranker.litellm')
async def test_simple_rank(mock_litellm, config):
    """Test basic ranking functionality with a single output."""
    # Create response for generation
    generation_response = MagicMock()
    generation_response.choices = [
        MagicMock(
            message=MagicMock(role="assistant", content="Generated test content"),
            logprobs=MagicMock(content=[
                MagicMock(token="Generated", logprob=-0.1, top_logprobs=None, bytes=None),
                MagicMock(token=" test", logprob=-0.1, top_logprobs=None, bytes=None),
                MagicMock(token=" content", logprob=-0.1, top_logprobs=None, bytes=None)
            ])
        )
    ]
    
    # Create response for evaluation
    evaluation_response = MagicMock()
    evaluation_response.choices = [
        MagicMock(
            message=MagicMock(role="assistant", content='{"clear": true, "useful": false}'),
            logprobs=MagicMock(content=[
                MagicMock(token='{"clear"', logprob=-0.1, top_logprobs=None, bytes=None),
                MagicMock(token=':', logprob=-0.1, top_logprobs=None, bytes=None),
                MagicMock(token=' true', logprob=-0.2, top_logprobs=None, bytes=None), # clear: true
                MagicMock(token=',', logprob=-0.1, top_logprobs=None, bytes=None),
                MagicMock(token=' "useful"', logprob=-0.1, top_logprobs=None, bytes=None),
                MagicMock(token=':', logprob=-0.1, top_logprobs=None, bytes=None),
                MagicMock(token=' false', logprob=-0.9, top_logprobs=None, bytes=None), # useful: false
                MagicMock(token='}', logprob=-0.1, top_logprobs=None, bytes=None)
            ])
        )
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
        logprob=(-0.2 - 0.9) / 2,  # For clear=true (-0.2), useful=false (-0.9)
        index=0,
        attribute_scores=[
            AttributeScore(name="clear", score=-0.2, explanation="Logprob of token 'true' for 'clear'"),
            AttributeScore(name="useful", score=-0.9, explanation="Logprob of token 'false' for 'useful'")
        ],
        raw_evaluation='{"clear": true, "useful": false}'
    )
    
    # Verify basic result
    assert len(results) == 1
    assert results[0].output == expected_output.output
    assert results[0].logprob == pytest.approx(expected_output.logprob)
    # Compare attribute scores individually due to potential explanation string differences if not perfectly matched
    assert len(results[0].attribute_scores) == len(expected_output.attribute_scores)
    for res_attr, exp_attr in zip(sorted(results[0].attribute_scores, key=lambda x: x.name), sorted(expected_output.attribute_scores, key=lambda x: x.name)):
        assert res_attr.name == exp_attr.name
        assert res_attr.score == pytest.approx(exp_attr.score)
        # We can be more lenient with explanation string if needed, or ensure it matches perfectly
        assert exp_attr.explanation in res_attr.explanation

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