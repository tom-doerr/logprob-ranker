"""
Basic async tests for the LiteLLMAdapter using pytest.
"""

# Standard library imports
from unittest.mock import patch, MagicMock, AsyncMock

# Third-party imports
import pytest
from litellm.utils import ModelResponse # Import for spec

# First-party imports
from logprob_ranker.logprob_ranker.ranker import LiteLLMAdapter, LogProbConfig
# from logprob_ranker.logprob_ranker.utils import LLMGenerationError # Keep if specific exception types are asserted

@pytest.fixture
def mock_env_fixture():
    """Pytest fixture to mock litellm and provide common test objects."""
    with patch('logprob_ranker.logprob_ranker.ranker.litellm') as mock_litellm:
        # Create config for tests
        config = LogProbConfig(
            num_variants=1,  # Generate just one output for test simplicity
            temperature=0.7,
            max_tokens=100,
            thread_count=1, # Note: thread_count is for LogProbRanker, not directly used by LiteLLMAdapter's own concurrency
            template='{"test": LOGPROB_TRUE}'
        )
        
        # Setup response for mock completion (gen_response)
        gen_message = MagicMock(content="Test generated content")
        gen_choice = MagicMock(message=gen_message)
        mock_token_logprob1 = MagicMock(token="Test", logprob=-0.123)
        mock_token_logprob2 = MagicMock(token="content", logprob=-0.456)
        mock_logprobs_content = [mock_token_logprob1, mock_token_logprob2]
        mock_logprobs_obj = MagicMock(content=mock_logprobs_content)
        gen_choice.logprobs = mock_logprobs_obj
        gen_response = MagicMock(spec=ModelResponse, choices=[gen_choice])
        gen_response.model_dump_json = MagicMock(return_value="{}")
        
        # Setup response for mock evaluation (eval_response)
        eval_message = MagicMock(content='{"test": true}')
        eval_choice = MagicMock(message=eval_message)
        mock_eval_logprobs_content = [
            MagicMock(token='{', logprob=-0.02),
            MagicMock(token='"test"', logprob=-0.03),
            MagicMock(token=':', logprob=-0.04),
            MagicMock(token=' true', logprob=-0.1),  # Key logprob for the attribute value
            MagicMock(token='}', logprob=-0.05)
        ]
        mock_eval_logprobs_obj = MagicMock(content=mock_eval_logprobs_content)
        eval_choice.logprobs = mock_eval_logprobs_obj
        eval_response = MagicMock(spec=ModelResponse, choices=[eval_choice])
        eval_response.model_dump_json = MagicMock(return_value="{}")
        
        mock_litellm.acompletion = AsyncMock()
        
        yield mock_litellm, config, gen_response, eval_response

@pytest.mark.asyncio
async def test_simple_generation(mock_env_fixture, aiohttp_session):
    """Test a simple async generation using LiteLLMAdapter."""
    mock_litellm, config, gen_response, eval_response = mock_env_fixture
    
    mock_litellm.acompletion.side_effect = [gen_response, eval_response]
    
    adapter = LiteLLMAdapter(
        model="gpt-3.5-turbo",
        api_key="test-key",
        config=config,
        aiohttp_session=aiohttp_session
    )
    
    results = await adapter.rank_outputs("Test prompt")
    
    assert len(results) == 1
    assert results[0].output == "Test generated content"
    assert results[0].logprob == pytest.approx(-0.1, abs=1e-4)
    assert mock_litellm.acompletion.call_count == 2

@pytest.mark.asyncio
async def test_error_handling(mock_env_fixture, aiohttp_session):
    """Test error handling in async generation when a variant fails."""
    mock_litellm, config, _, _ = mock_env_fixture # gen_response, eval_response not needed
    
    mock_litellm.acompletion.side_effect = Exception("Mocked LiteLLM acompletion failure")
    
    adapter = LiteLLMAdapter(
        model="gpt-3.5-turbo",
        api_key="test-key",
        config=config, # config has num_variants = 1
        aiohttp_session=aiohttp_session
    )
    
    expected_error_message = "LLM generation failed for variant 0: Unexpected error during LiteLLM completion for model gpt-3.5-turbo: Exception - Mocked LiteLLM acompletion failure"
    with pytest.raises(RuntimeError, match=expected_error_message):
        await adapter.rank_outputs("Test prompt for error")
    
    mock_litellm.acompletion.assert_called_once()

@pytest.mark.asyncio
async def test_concurrent_tasks(mock_env_fixture, aiohttp_session):
    """Test concurrent task handling for multiple variants."""
    mock_litellm, _, _, _ = mock_env_fixture # Original config, gen_response, eval_response not used directly
    
    multi_config = LogProbConfig(
        num_variants=3,
        temperature=0.7,
        max_tokens=100,
        thread_count=2, # As in original test, for LogProbRanker context
        template='{"test": LOGPROB_TRUE}'
    )
    
    # Mock generation responses for 3 variants
    gen_responses = []
    for i in range(3):
        gen_message = MagicMock(content=f"Test content {i}")
        gen_choice = MagicMock(message=gen_message)
        # Simplified logprobs for gen response, original had -0.1*i and -0.2*i
        mock_token_logprob_g1 = MagicMock(token=f"Test{i}", logprob=-0.1 * (i + 1)) 
        mock_token_logprob_g2 = MagicMock(token="content", logprob=-0.2 * (i + 1))
        gen_choice.logprobs = MagicMock(content=[mock_token_logprob_g1, mock_token_logprob_g2])
        response = MagicMock(spec=ModelResponse, choices=[gen_choice])
        response.model_dump_json = MagicMock(return_value="{}")
        gen_responses.append(response)
        
    # Mock evaluation responses for 3 variants
    # The original test's eval logprobs for concurrent tasks were not set up to vary meaningfully for 'true'.
    # Replicating the original structure, which means the logprob for 'true' might be consistent or fallback.
    eval_responses = []
    for i in range(3): # Loop variable 'i' for distinct mock details if needed
        eval_message = MagicMock(content='{"test": true}')
        eval_choice = MagicMock(message=eval_message)
        # Original mock for eval logprobs in concurrent test was: token="{\"test\":", logprob=-0.01*i
        # This doesn't provide a 'true' token's logprob. 
        # For simplicity and to match original test's limited scope on this, we'll use a fixed eval logprob structure
        # similar to the one in mock_env_fixture's eval_response, or accept fallback behavior.
        # Here, we ensure each eval response has the standard 'true' logprob for this test's purpose.
        mock_eval_logprobs_content_c = [
            MagicMock(token='{', logprob=-0.02),
            MagicMock(token='"test"', logprob=-0.03),
            MagicMock(token=':', logprob=-0.04),
            MagicMock(token=' true', logprob=-0.1), # Consistent logprob for 'true'
            MagicMock(token='}', logprob=-0.05)
        ]
        eval_choice.logprobs = MagicMock(content=mock_eval_logprobs_content_c)
        response = MagicMock(spec=ModelResponse, choices=[eval_choice])
        response.model_dump_json = MagicMock(return_value="{}")
        eval_responses.append(response)
        
    all_litellm_responses = []
    for gen_resp, eval_resp in zip(gen_responses, eval_responses):
        all_litellm_responses.extend([gen_resp, eval_resp])
    
    mock_litellm.acompletion.side_effect = all_litellm_responses
    
    adapter = LiteLLMAdapter(
        model="gpt-3.5-turbo",
        api_key="test-key",
        config=multi_config,
        aiohttp_session=aiohttp_session
    )
    
    results = await adapter.rank_outputs("Test prompt")
    
    assert len(results) == 3
    output_contents = {result.output for result in results}
    assert output_contents == {"Test content 0", "Test content 1", "Test content 2"}
    assert mock_litellm.acompletion.call_count == 6  # 3 generations + 3 evaluations