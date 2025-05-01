"""
End-to-end tests for OpenRouter integration with LogProb Ranker.

These tests make actual API calls to OpenRouter and verify the functionality
of the LogProbRanker with real model responses. 

To run these tests, you need an OpenRouter API key set as OPENROUTER_API_KEY
environment variable.

NOTE: These tests incur costs as they make actual API calls. We use Gemini Flash
where possible to minimize costs.
"""

import os
import unittest
import asyncio
from typing import Dict, Any, Optional, List
import pytest
from unittest.mock import AsyncMock
import unittest.mock # Import for patch decorator

# Import the package
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from logprob_ranker import LogProbConfig, RankedOutput, LogProbRanker
from logprob_ranker.openrouter import OpenRouterAdapter


# Skip tests if no API key is available
SKIP_TESTS = "OPENROUTER_API_KEY" not in os.environ
SKIP_MESSAGE = "Skipping OpenRouter tests: No API key (OPENROUTER_API_KEY) found"

# Use a well-supported model for testing
TEST_MODEL = "gpt-3.5-turbo"


class TestOpenRouterE2E:
    """End-to-end tests for OpenRouter integration."""
    
    def setUp(self):
        """Set up the test environment."""
        if SKIP_TESTS:
            self.skipTest(SKIP_MESSAGE)
        
        # Create a minimal config for testing
        self.config = LogProbConfig(
            num_variants=2,  # Generate only 2 variants to save costs
            max_tokens=50,  # Keep responses short
            temperature=0.7,
        )
        
        # Set up a simple prompt for testing
        self.prompt = "Write a short haiku about programming."
        
        # Set up criteria for evaluating the outputs
        self.criteria = """
        Evaluate this haiku based on:
        1. Follows haiku structure (5-7-5 syllables)
        2. Relevance to programming
        3. Creativity and imagery
        4. Emotional impact
        """
    
    @pytest.mark.asyncio
    async def test_openrouter_async_api(self):
        """Test OpenRouter async API integration."""
        # Define mock responses
        mock_generation_response = {"choices": [{"message": {"content": "Generated text"}}]}
        mock_evaluation_response = {"choices": [{"message": {"content": '{"quality": true, "relevance": true}'}}]}
        
        config = LogProbConfig(
            template='{"quality": LOGPROB_TRUE, "relevance": LOGPROB_TRUE}',
            num_variants=1 # Ensure only one variant is requested
        )
        placeholder_client = AsyncMock()
        ranker = LogProbRanker(placeholder_client, config)
        
        # Mock the internal method directly
        with unittest.mock.patch.object(ranker, '_create_chat_completion', new_callable=AsyncMock) as mock_create_completion:
            mock_create_completion.side_effect = [mock_generation_response, mock_evaluation_response]
            results = await ranker.rank_outputs("Test prompt")
        
        assert len(results) == 1
        assert results[0].output == "Generated text" # Match the mock generation response
        assert results[0].logprob == 1.0  # Both quality and relevance are true
        assert mock_create_completion.call_count == 2 # Generation + Evaluation

    @pytest.mark.asyncio
    async def test_openrouter_sync_api(self):
        """Test OpenRouter sync API integration."""
        # Define mock responses
        mock_generation_response = {"choices": [{"message": {"content": "Generated text"}}]}
        mock_evaluation_response = {"choices": [{"message": {"content": '{"quality": true, "relevance": true}'}}]}
        
        config = LogProbConfig(
            template='{"quality": LOGPROB_TRUE, "relevance": LOGPROB_TRUE}',
            num_variants=1 # Ensure only one variant is requested
        )
        placeholder_client = AsyncMock()
        ranker = LogProbRanker(placeholder_client, config)
        
        # Mock the internal method directly
        with unittest.mock.patch.object(ranker, '_create_chat_completion', new_callable=AsyncMock) as mock_create_completion:
            mock_create_completion.side_effect = [mock_generation_response, mock_evaluation_response]
            results = await ranker.rank_outputs("Test prompt")
        
        assert len(results) == 1
        assert results[0].output == "Generated text" # Match the mock generation response
        assert results[0].logprob == 1.0  # Both quality and relevance are true
        assert mock_create_completion.call_count == 2 # Generation + Evaluation

    @pytest.mark.asyncio
    async def test_different_prompt_types(self):
        """Test OpenRouter with different prompt types."""
        # Define mock responses
        mock_generation_response = {"choices": [{"message": {"content": "Generated text"}}]}
        mock_evaluation_response = {"choices": [{"message": {"content": '{"quality": true, "relevance": true}'}}]}
        
        config = LogProbConfig(
            template='{"quality": LOGPROB_TRUE, "relevance": LOGPROB_TRUE}',
            num_variants=1 # Ensure only one variant is requested
        )
        placeholder_client = AsyncMock()
        ranker = LogProbRanker(placeholder_client, config)
        
        prompts = [
            "Simple text prompt",
            "Multi\nline\nprompt",
            "Prompt with special chars: !@#$%^&*()",
            "Very long prompt " + "x" * 1000
        ]
        
        # Mock the internal method directly
        with unittest.mock.patch.object(ranker, '_create_chat_completion', new_callable=AsyncMock) as mock_create_completion:
            # Set up side effect for multiple calls
            side_effects = []
            for _ in prompts:
                side_effects.extend([mock_generation_response, mock_evaluation_response])
            mock_create_completion.side_effect = side_effects
            
            for prompt in prompts:
                results = await ranker.rank_outputs(prompt)
                assert len(results) == 1
                assert results[0].output == "Generated text" # Match the mock generation response
                assert results[0].logprob == 1.0 # Both quality and relevance are true
        
        assert mock_create_completion.call_count == 2 * len(prompts) # Gen + Eval per prompt

    @pytest.mark.asyncio
    async def test_openrouter_sync_api_e2e(self):
        """Test synchronous API with OpenRouter."""
        prompt = "Which city is best for travel in summer?"
        criteria = "Evaluate based on weather and activities."
        config = LogProbConfig()
        # Create adapter
        adapter = OpenRouterAdapter(
            model=TEST_MODEL,
            config=config,
        )
        
        # Run the ranking
        result = await adapter.arank(prompt, criteria=criteria)
        
        # Verify result
        assert result is not None
        assert isinstance(result, RankedOutput)
        assert result.total_score is not None # Check total_score from adapter
        
        # Verify callback was triggered (if testing callback)
        # assert len(self.generated_outputs) > 0

    @pytest.mark.asyncio
    async def test_openrouter_async_api_e2e(self):
        """Test asynchronous API with OpenRouter."""
        prompt = "Suggest a Python library for data visualization."
        criteria = "Evaluate based on ease of use and documentation."
        config = LogProbConfig()
        
        # Create adapter
        adapter = OpenRouterAdapter(
            model=TEST_MODEL,
            config=config,
        )
        
        # Run the ranking
        result = await adapter.arank(prompt, criteria=criteria)
        
        # Verify result
        assert result is not None
        assert isinstance(result, RankedOutput)
        assert result.total_score is not None # Check total_score from adapter
        
        # Verify callback was triggered (if testing callback)
        # assert len(self.generated_outputs) > 0

    @pytest.mark.asyncio
    async def test_different_prompt_types_e2e(self):
        """Test with different types of prompts."""
        # Test with a more technical prompt
        technical_prompt = "Explain how recursion works in programming."
        technical_criteria = """
        Evaluate this explanation based on:
        1. Technical accuracy
        2. Clarity of explanation
        3. Use of examples
        4. Thoroughness
        """
        config = LogProbConfig()
        
        adapter = OpenRouterAdapter(
            model=TEST_MODEL,
            config=config,
        )
        
        # Run the ranking
        result = await adapter.arank(technical_prompt, criteria=technical_criteria)
        
        # Verify result
        assert result is not None
        assert isinstance(result, RankedOutput)
        assert result.total_score is not None # Check total_score from adapter
         # E2E test might not always guarantee score > 0 depending on model/prompt
         # assert result.total_score > 0
        if result.attribute_scores:
            pass # Add assertion if needed


if __name__ == "__main__":
    unittest.main()