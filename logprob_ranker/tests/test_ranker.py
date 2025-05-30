"""
Tests for the LogProbRanker class.
"""

# Standard library imports
import os
import sys
import unittest
from unittest.mock import MagicMock, AsyncMock, patch # Restored order
import pytest
from logprob_ranker.logprob_ranker.ranker import LLMGenerationError, LogProbConfig, RankedOutput, LogProbRanker, sort_ranked_outputs # Consolidated and cleaned imports

# Third-party imports
# pytest is already imported above

# Add project root to Python path
# This is generally discouraged in favor of proper packaging or using pytest's pythonpath settings.
# However, keeping it for now if it's essential for the current setup.
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

# First-party imports are now consolidated into the import on line 10.
# utils imports are removed as they were unused or their specific functions were unused.


# Define a concrete subclass for testing
class ConcreteTestRanker(LogProbRanker):
    async def _create_chat_completion(self, messages: list, temperature: float, max_tokens: int, top_p: float) -> dict:
        # Mock implementation for testing
        # Return a dictionary that mimics the expected structure from a real LLM call
        # including 'content' and 'average_token_logprob'
        # You might want to make this mock more sophisticated based on test needs
        # e.g., by using self.llm_client if it's a mock, or by returning specific
        # values based on the input messages.
        return {
            "content": f"Mocked LLM output for messages: {messages}",
            "average_token_logprob": -0.12345  # Example logprob
        }

    # _generate_single_output is not an abstract method of LogProbRanker
    # It was likely part of an older design or a misunderstanding.
    # If it's still needed for some specific tests, it can remain,
    # but it's not what makes ConcreteTestRanker concrete.
    # For now, I'm commenting it out to ensure clarity on what makes the class concrete.
    # async def _generate_single_output(self, prompt: str) -> str:
    #     # This is a mock implementation for testing purposes.
    #     # It can be further mocked using unittest.mock.patch if specific test cases
    #     # require different behaviors or checks on this method.
    #     return f"Mocked output for prompt: {prompt}"


# Helper function to create mock litellm responses
def create_mock_litellm_response(content):
    mock_response = MagicMock()
    mock_message = MagicMock()
    mock_message.content = content
    mock_response.choices = [MagicMock()]
    mock_response.choices[0].message = mock_message
    return mock_response

@pytest.fixture
def config():
    """Provides a default LogProbConfig for tests."""
    return LogProbConfig(
        num_variants=2, 
        template='{"test": LOGPROB_TRUE, "quality": LOGPROB_TRUE}'
    )

@pytest.fixture
def ranker(config):
    """Provides a LogProbRanker instance."""
    # Create a real ranker instance; llm_client isn't used by the method under test here
    ranker_instance = ConcreteTestRanker(llm_client=None, config=config)
    # No need to set ranker_instance.attributes here, __init__ does it
    # Return only the ranker instance now
    return ranker_instance


def test_initialization(config): # No ranker fixture needed here
    """Test LogProbRanker initialization (without needing mocks)."""
    ranker_instance = ConcreteTestRanker(llm_client=None, config=config)
    assert ranker_instance.config == config


def test_initialization_default_config():
    """Test LogProbRanker initialization with default config."""
    ranker_instance = ConcreteTestRanker(llm_client=None, config=None)
    assert isinstance(ranker_instance.config, LogProbConfig)
    # Check a few default values if necessary, e.g.:
    assert ranker_instance.config.num_variants == 5 # Default from LogProbConfig
    assert ranker_instance.config.temperature == 0.7 # Default from LogProbConfig


def test_initialization_with_callback():
    """Test LogProbRanker initialization with an on_output_callback."""
    mock_callback = MagicMock()
    ranker_instance = ConcreteTestRanker(llm_client=None, config=None, on_output_callback=mock_callback)
    assert ranker_instance.on_output_callback == mock_callback


@pytest.mark.asyncio
async def test_parse_evaluation():
    """Test parsing evaluation response."""
    # Define mock outputs
    mock_generation_output = "Generated output string."
    mock_evaluation_output = '{"test": true, "quality": false}'
 
    # Create full mock dictionary responses
    # mock_generation_response and mock_evaluation_response were unused and have been removed.

    # Create ranker with mock client
    config = LogProbConfig(
        template='{"test": LOGPROB_TRUE, "quality": LOGPROB_TRUE}'
    )
    placeholder_client = AsyncMock()
    ranker = ConcreteTestRanker(placeholder_client, config)
    
    # Test evaluation parsing
    with unittest.mock.patch.object(ranker, '_create_chat_completion', new_callable=AsyncMock) as mock_create_completion:
        mock_create_completion.side_effect = [
            {"content": mock_generation_output, "average_token_logprob": -0.1},
            {"content": mock_evaluation_output, "average_token_logprob": -0.2}
        ]
        result = await ranker.generate_and_evaluate_output("Test prompt", 0)
    
    # Verify results
    assert result is not None
    assert result.output == mock_generation_output # Check against the defined output string
    assert len(result.attribute_scores) == 2
    assert any(score.name == "test" and score.score == 1.0 for score in result.attribute_scores)
    assert any(score.name == "quality" and score.score == 0.0 for score in result.attribute_scores)


@pytest.mark.asyncio
@patch('logprob_ranker.tests.test_ranker.ConcreteTestRanker._create_chat_completion', new_callable=AsyncMock)
async def test_generate_and_evaluate_output(mock_create_chat_completion, ranker):
    """Test the generate_and_evaluate_output method."""
    ranker_instance = ranker
    prompt = "Test prompt"
    index = 0

    generated_text = "Generated text"
    evaluation_json_str = '{"test": true, "quality": true}' # Score 1.0

    mock_create_chat_completion.side_effect = [
        {"content": generated_text, "average_token_logprob": -0.1},
        {"content": evaluation_json_str, "average_token_logprob": -0.2}
    ]

    result = await ranker_instance.generate_and_evaluate_output(prompt, index)

    assert result is not None
    assert result.output == generated_text
    assert result.raw_evaluation == evaluation_json_str
    assert result.attribute_scores is not None
    assert len(result.attribute_scores) == 2
    # Based on config: template='{"test": LOGPROB_TRUE, "quality": LOGPROB_TRUE}'
    # and eval: '{"test": true, "quality": true}'
    assert any(score.name == "test" and score.score == 1.0 for score in result.attribute_scores)
    assert any(score.name == "quality" and score.score == 1.0 for score in result.attribute_scores)
    assert result.logprob == 1.0 # (1.0 + 1.0) / 2
    assert mock_create_chat_completion.await_count == 2
    # Check first call args (generation)
    call_args_gen = mock_create_chat_completion.await_args_list[0]
    assert call_args_gen.kwargs['messages'] == [
        {"role": "system", "content": ranker_instance.config.system_prompt},
        {"role": "user", "content": prompt}
    ]
    # Check second call args (evaluation)
    call_args_eval = mock_create_chat_completion.await_args_list[1]
    assert generated_text in call_args_eval.kwargs['messages'][-1]['content']
    assert ranker_instance.config.template in call_args_eval.kwargs['messages'][-1]['content']


@pytest.mark.asyncio
@patch('logprob_ranker.tests.test_ranker.ConcreteTestRanker._create_chat_completion', new_callable=AsyncMock)
async def test_generate_and_evaluate_output_failure(mock_create_chat_completion):
    """Test handling of generation failures."""
    # Configure the patched method to raise an exception
    mock_create_chat_completion.side_effect = LLMGenerationError("Generation failed")
    
    # Mock client can be simpler now, as its method isn't directly mocked here
    mock_client = MagicMock()
 
    # Create ranker with mock client
    config = LogProbConfig(
        template='{"test": LOGPROB_TRUE}'
    )
    ranker = ConcreteTestRanker(mock_client, config)
    
    # Expect RuntimeError because the inner exception should be caught and wrapped
    with pytest.raises(RuntimeError) as exc_info:
        await ranker.generate_and_evaluate_output("Test prompt", 0)
    
    # Check if the mock was called
    mock_create_chat_completion.assert_awaited_once()
    
    # Check the wrapped exception message
    assert "LLM generation failed for variant 0: Generation failed" in str(exc_info.value)
    assert "Generation failed" in str(exc_info.value)


@pytest.mark.asyncio
@patch('logprob_ranker.tests.test_ranker.ConcreteTestRanker._create_chat_completion', new_callable=AsyncMock)
async def test_rank_outputs(mock_create_chat_completion, ranker):
    """Test the rank_outputs method (async)."""
    ranker_instance = ranker
    prompt = "Test prompt"
    num_variants = ranker_instance.config.num_variants
    assert num_variants == 2

    outputs_content = ["Output 1", "Output 2"]
    # Eval 1 ('{"test": true, "quality": false}') -> score 0.5 (template: {"test": LOGPROB_TRUE, "quality": LOGPROB_TRUE})
    # Eval 2 ('{"test": true, "quality": true}') -> score 1.0
    evals_content = ['{"test": true, "quality": false}', '{"test": true, "quality": true}']

    mock_create_chat_completion.side_effect = [
        # Variant 1
        {"content": outputs_content[0], "average_token_logprob": -0.11},  # Generation
        {"content": evals_content[0], "average_token_logprob": -0.12},    # Evaluation
        # Variant 2
        {"content": outputs_content[1], "average_token_logprob": -0.21},  # Generation
        {"content": evals_content[1], "average_token_logprob": -0.22},    # Evaluation
    ]

    results = await ranker_instance.rank_outputs(prompt)

    assert len(results) == num_variants
    assert results[0].output == outputs_content[1] # Output 2 (score 1.0) should be first
    assert results[0].logprob == 1.0
    assert results[1].output == outputs_content[0] # Output 1 (score 0.5) should be second
    assert results[1].logprob == 0.5
    assert mock_create_chat_completion.await_count == num_variants * 2


@patch('logprob_ranker.tests.test_ranker.ConcreteTestRanker._create_chat_completion', new_callable=AsyncMock)
def test_rank_outputs_sync(mock_create_chat_completion, ranker):
    """Test the rank_outputs_sync method."""
    ranker_instance = ranker
    prompt = "Test prompt"
    num_variants = ranker_instance.config.num_variants
    assert num_variants == 2

    outputs_content = ["Sync Output 1", "Sync Output 2"]
    # Eval 1 ('{"test": false, "quality": false}') -> score 0.0
    # Eval 2 ('{"test": true, "quality": false}') -> score 0.5
    evals_content = ['{"test": false, "quality": false}', '{"test": true, "quality": false}']
    
    call_index = -1
    async def mock_side_effect_func(*args, **kwargs):
        nonlocal call_index
        call_index += 1
        if call_index == 0: # Gen 1
            return {"content": outputs_content[0], "average_token_logprob": -0.11}
        if call_index == 1: # Eval 1
            return {"content": evals_content[0], "average_token_logprob": -0.12}
        if call_index == 2: # Gen 2
            return {"content": outputs_content[1], "average_token_logprob": -0.21}
        if call_index == 3: # Eval 2
            return {"content": evals_content[1], "average_token_logprob": -0.22}
        raise ValueError(f"Unexpected call_index: {call_index} or too many calls to mock")
            
    mock_create_chat_completion.side_effect = mock_side_effect_func

    results = ranker_instance.rank_outputs_sync(prompt)

    assert len(results) == num_variants
    # Results should be sorted by score (eval 1 = 0.0, eval 2 = 0.5)
    assert results[0].output == outputs_content[1] # Sync Output 2 (score 0.5) should be first
    assert results[0].logprob == 0.5
    assert results[1].output == outputs_content[0] # Sync Output 1 (score 0.0) should be second
    assert results[1].logprob == 0.0
    assert mock_create_chat_completion.await_count == num_variants * 2


def test_sort_ranked_outputs(): # Removed self
    """Test the sort_ranked_outputs helper function."""
    r1 = RankedOutput(output="o1", logprob=0.5, index=0)
    r2 = RankedOutput(output="o2", logprob=0.8, index=1)
    r3 = RankedOutput(output="o3", logprob=0.2, index=2)
    unsorted = [r1, r2, r3]
    sorted_list = sort_ranked_outputs(unsorted)
    assert sorted_list[0] == r2
    assert sorted_list[1] == r1
    assert sorted_list[2] == r3