"""
Tests for the LogProbRanker class.
"""

import pytest
from unittest.mock import MagicMock, AsyncMock, patch
import asyncio
import sys
import os

# Add project root to Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Import the module itself and utils module
from logprob_ranker import ranker as ranker_module 
from logprob_ranker import utils as utils_module # Import utils
from logprob_ranker.ranker import (LogProbRanker, LogProbConfig, RankedOutput, 
                                 AttributeScore, sort_ranked_outputs)
# Import the utility function needed
from logprob_ranker.utils import extract_template_attributes
import unittest.mock # Import for patch decorator

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
    ranker_instance = LogProbRanker(llm_client=None, config=config)
    # No need to set ranker_instance.attributes here, __init__ does it
    # Return only the ranker instance now
    return ranker_instance


def test_initialization(config): # No ranker fixture needed here
    """Test LogProbRanker initialization (without needing mocks)."""
    ranker_instance = LogProbRanker(llm_client=None, config=config)
    assert ranker_instance.config == config


@pytest.mark.asyncio
async def test_parse_evaluation():
    """Test parsing evaluation response."""
    # Define mock outputs
    mock_generation_output = "Generated output string."
    mock_evaluation_output = '{"test": true, "quality": false}'
 
    # Create full mock dictionary responses
    mock_generation_response = {
        "choices": [
            {
                "message": {
                    "content": mock_generation_output
                }
            }
        ]
    }

    mock_evaluation_response = {
        "choices": [
            {
                "message": {
                    "content": mock_evaluation_output
                }
            }
        ]
    }

    # Create ranker with mock client
    config = LogProbConfig(
        template='{"test": LOGPROB_TRUE, "quality": LOGPROB_TRUE}'
    )
    placeholder_client = AsyncMock()
    ranker = LogProbRanker(placeholder_client, config)
    
    # Test evaluation parsing
    with unittest.mock.patch.object(ranker, '_create_chat_completion', new_callable=AsyncMock) as mock_create_completion:
        mock_create_completion.side_effect = [mock_generation_response, mock_evaluation_response]
        result = await ranker.generate_and_evaluate_output("Test prompt", 0)
    
    # Verify results
    assert result is not None
    assert result.output == mock_generation_output # Check against the defined output string
    assert len(result.attribute_scores) == 2
    assert any(score.name == "test" and score.score == 1.0 for score in result.attribute_scores)
    assert any(score.name == "quality" and score.score == 0.0 for score in result.attribute_scores)


@pytest.mark.asyncio
@patch('logprob_ranker.ranker.litellm.acompletion', new_callable=AsyncMock)
async def test_generate_and_evaluate_output(mock_acompletion, ranker): # Add mock_acompletion arg
    """Test the generate_and_evaluate_output method."""
    ranker_instance = ranker # Get instance from fixture
    prompt = "Test prompt"
    index = 0

    # Mock litellm.acompletion responses
    generated_text = "Generated text"
    evaluation_json_str = '{"test": true, "quality": true}'
    mock_acompletion.side_effect = [
        # First call (generation)
        create_mock_litellm_response(generated_text),
        # Second call (evaluation)
        create_mock_litellm_response(evaluation_json_str)
    ]

    result = await ranker_instance.generate_and_evaluate_output(prompt, index)

    assert result is not None
    assert result.output == generated_text
    assert result.raw_evaluation == evaluation_json_str
    assert result.attribute_scores is not None
    assert len(result.attribute_scores) == 2
    assert result.attribute_scores[0].name == "test" and result.attribute_scores[0].score == 1.0
    assert result.attribute_scores[1].name == "quality" and result.attribute_scores[1].score == 1.0
    assert result.logprob == 1.0 # (1+1)/2
    # Check calls to the mocked function
    assert mock_acompletion.call_count == 2
    # Check first call args (generation)
    call_args_gen = mock_acompletion.call_args_list[0]
    assert call_args_gen.kwargs['messages'] == [
        {"role": "system", "content": ranker_instance.config.system_prompt},
        {"role": "user", "content": prompt}
    ]
    # Check second call args (evaluation)
    call_args_eval = mock_acompletion.call_args_list[1]
    assert generated_text in call_args_eval.kwargs['messages'][-1]['content']
    assert ranker_instance.config.template in call_args_eval.kwargs['messages'][-1]['content']


@pytest.mark.asyncio
@patch('logprob_ranker.ranker.LogProbRanker._create_chat_completion', new_callable=AsyncMock)
async def test_generate_and_evaluate_output_failure(mock_create_chat_completion):
    """Test handling of generation failures."""
    # Configure the patched method to raise an exception
    mock_create_chat_completion.side_effect = Exception("Generation failed")
    
    # Mock client can be simpler now, as its method isn't directly mocked here
    mock_client = MagicMock()
 
    # Create ranker with mock client
    config = LogProbConfig(
        template='{"test": LOGPROB_TRUE}'
    )
    ranker = LogProbRanker(mock_client, config)
    
    # Expect RuntimeError because the inner exception should be caught and wrapped
    with pytest.raises(RuntimeError) as exc_info:
        await ranker.generate_and_evaluate_output("Test prompt", 0)
    
    # Check if the mock was called
    mock_create_chat_completion.assert_awaited_once()
    
    # Check the wrapped exception message
    assert "Failed to process output 0" in str(exc_info.value)
    assert "Generation failed" in str(exc_info.value)


@pytest.mark.asyncio
@patch('logprob_ranker.ranker.litellm.acompletion', new_callable=AsyncMock)
async def test_rank_outputs(mock_acompletion, ranker): # Add mock_acompletion arg
    """Test the rank_outputs method (async)."""
    ranker_instance = ranker # Get instance from fixture
    prompt = "Test prompt"
    num_variants = ranker_instance.config.num_variants # Should be 2 from fixture
    assert num_variants == 2

    # Mock adapter responses for multiple calls (2 generations, 2 evaluations)
    outputs = ["Output 1", "Output 2"]
    evals = ['{"test": true, "quality": false}', '{"test": true, "quality": true}']
    mock_acompletion.side_effect = [
        # Generation 1
        create_mock_litellm_response(outputs[0]),
        # Evaluation 1
        create_mock_litellm_response(evals[0]),
        # Generation 2
        create_mock_litellm_response(outputs[1]),
        # Evaluation 2
        create_mock_litellm_response(evals[1])
    ]

    results = await ranker_instance.rank_outputs(prompt)

    assert len(results) == num_variants
    # Results should be sorted by score (eval 1 = 0.5, eval 2 = 1.0)
    assert results[0].output == outputs[1] # Output 2 should be first
    assert results[0].logprob == 1.0
    assert results[1].output == outputs[0] # Output 1 should be second
    assert results[1].logprob == 0.5
    assert mock_acompletion.call_count == num_variants * 2 # gen + eval for each


@patch('logprob_ranker.ranker.litellm.acompletion', new_callable=AsyncMock)
def test_rank_outputs_sync(mock_acompletion, ranker): # Add mock_acompletion arg
    """Test the rank_outputs_sync method."""
    ranker_instance = ranker # Get instance from fixture
    prompt = "Test prompt"
    num_variants = ranker_instance.config.num_variants # Should be 2
    assert num_variants == 2

    # Mock adapter responses (needs to be structured for sync calls via asyncio.run)
    outputs = ["Sync Output 1", "Sync Output 2"]
    evals = ['{"test": false, "quality": false}', '{"test": true, "quality": false}']
    call_index = -1
    # Define the side effect function for the async mock
    async def mock_side_effect_func(*args, **kwargs):
        nonlocal call_index
        call_index += 1
        if call_index == 0: # Gen 1
            return create_mock_litellm_response(outputs[0])
        elif call_index == 1: # Eval 1
            return create_mock_litellm_response(evals[0])
        elif call_index == 2: # Gen 2
            return create_mock_litellm_response(outputs[1])
        elif call_index == 3: # Eval 2
            return create_mock_litellm_response(evals[1])
        else:
            raise ValueError("Too many calls to mock")
            
    mock_acompletion.side_effect = mock_side_effect_func

    results = ranker_instance.rank_outputs_sync(prompt)

    assert len(results) == num_variants
    # Results should be sorted by score (eval 1 = 0.0, eval 2 = 0.5)
    assert results[0].output == outputs[1] # Sync Output 2 should be first
    assert results[0].logprob == 0.5
    assert results[1].output == outputs[0] # Sync Output 1 should be second
    assert results[1].logprob == 0.0
    assert mock_acompletion.call_count == num_variants * 2


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