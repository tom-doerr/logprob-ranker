"""
Unit tests for OpenRouter adapter.
"""

import unittest
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

from logprob_ranker.ranker import LogProbConfig, RankedOutput
from logprob_ranker.openrouter import OpenRouterAdapter


class TestOpenRouterAdapter(unittest.TestCase):
    """Test the OpenRouter adapter."""
    
    def setUp(self):
        """Set up test fixtures."""
        # Create a config for testing
        self.config = LogProbConfig(
            num_variants=2,
            max_tokens=100,
            temperature=0.7,
            template='{"test": LOGPROB_TRUE, "quality": LOGPROB_TRUE}'
        )
        
        # Create a mock for the LiteLLM module
        self.litellm_patch = patch('logprob_ranker.openrouter.litellm')
        self.mock_litellm = self.litellm_patch.start()
        
        # Create the OpenRouter adapter
        self.adapter = OpenRouterAdapter(
            model="gpt-3.5-turbo",
            api_key="test_api_key",
            config=self.config
        )
    
    def tearDown(self):
        """Tear down test fixtures."""
        self.litellm_patch.stop()
    
    async def async_test_create_chat_completion(self):
        """Test the _create_chat_completion method."""
        # Mock the response from litellm
        mock_response = MagicMock()
        mock_response.choices = [
            MagicMock(
                message=MagicMock(
                    role="assistant",
                    content="Test response"
                )
            )
        ]
        
        # Need to use AsyncMock for an awaitable function
        self.mock_litellm.acompletion = AsyncMock(return_value=mock_response)
        
        # Call the method
        messages = [{"role": "user", "content": "Test prompt"}]
        result = await self.adapter._create_chat_completion(
            messages, temperature=0.7, max_tokens=100, top_p=1.0
        )
        
        # Verify litellm.acompletion was called with correct parameters
        self.mock_litellm.acompletion.assert_called_once()
        call_args = self.mock_litellm.acompletion.call_args
        
        self.assertEqual(call_args[1]["model"], "openai/gpt-3.5-turbo")
        self.assertEqual(call_args[1]["messages"], messages)
        self.assertEqual(call_args[1]["temperature"], 0.7)
        self.assertEqual(call_args[1]["max_tokens"], 100)
        
        # Verify result format
        self.assertIn("choices", result)
        self.assertEqual(result["choices"][0]["message"]["content"], "Test response")
    
    async def async_test_arank(self):
        """Test the arank method."""
        # Mock the rank_outputs method
        mock_results = [
            RankedOutput(output="Output 1", logprob=0.9, index=0),
            RankedOutput(output="Output 2", logprob=0.7, index=1)
        ]
        
        with patch.object(self.adapter, 'rank_outputs', return_value=mock_results):
            # Call the arank method
            result = await self.adapter.arank("Test prompt")
            
            # Verify the result is the first (highest ranked) output
            self.assertEqual(result, mock_results[0])
            
            # Test with custom criteria
            with patch.object(self.adapter, 'rank_outputs', return_value=mock_results):
                result = await self.adapter.arank("Test prompt", criteria="Test criteria")
                self.assertEqual(result, mock_results[0])
    
    def test_rank(self):
        """Test the synchronous rank method."""
        # Mock the asyncio.run function
        mock_result = RankedOutput(output="Test output", logprob=0.8, index=0)
        
        with patch('asyncio.run', return_value=mock_result) as mock_run:
            # Call the rank method
            result = self.adapter.rank("Test prompt")
            
            # Verify asyncio.run was called with arank
            mock_run.assert_called_once()
            
            # Verify the result
            self.assertEqual(result, mock_result)
    
    def test_create_chat_completion(self):
        """Run the async test for _create_chat_completion."""
        run_async_test(self.async_test_create_chat_completion)
    
    def test_arank(self):
        """Run the async test for arank."""
        run_async_test(self.async_test_arank)


# Helper to run async tests
def run_async_test(test_case):
    """Run an async test method."""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(test_case())
    finally:
        loop.close()


if __name__ == "__main__":
    unittest.main()