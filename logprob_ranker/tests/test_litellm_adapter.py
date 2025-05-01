"""
Tests for the LiteLLMAdapter class.
"""

import unittest
from unittest.mock import patch, MagicMock, AsyncMock
import asyncio
from logprob_ranker.ranker import LiteLLMAdapter, LogProbConfig, RankedOutput

class TestLiteLLMAdapter(unittest.TestCase):
    """Test the LiteLLMAdapter class."""

    def setUp(self):
        """Set up test fixtures."""
        # Create a config
        self.config = LogProbConfig(
            num_variants=2,
            thread_count=1,
            template='{"test": LOGPROB_TRUE}'
        )
        
        # Patch litellm
        self.litellm_patch = patch('logprob_ranker.ranker.litellm')
        self.mock_litellm = self.litellm_patch.start()
        
        # Setup acompletion mock
        self.mock_litellm.acompletion = AsyncMock()
        
        # Sample response format
        self.sample_response = MagicMock()
        self.sample_response.choices = [
            MagicMock(message=MagicMock(role="assistant", content="Test response"))
        ]
        
        async def mock_return(*args, **kwargs):
            return self.sample_response
        self.mock_litellm.acompletion.side_effect = mock_return
        
        # Create the adapter
        self.adapter = LiteLLMAdapter(
            model="gpt-3.5-turbo",
            api_key="test-key",
            config=self.config
        )
    
    def tearDown(self):
        """Tear down test fixtures."""
        self.litellm_patch.stop()
    
    def test_initialization(self):
        """Test initialization of LiteLLMAdapter."""
        self.assertEqual(self.adapter.model, "gpt-3.5-turbo")
        self.assertEqual(self.adapter.api_key, "test-key")
        self.assertEqual(self.adapter.config, self.config)
        
        # Check OpenAI API key was set
        self.assertEqual(self.mock_litellm.openai_api_key, "test-key")
    
    async def async_test_create_chat_completion(self):
        """Test the _create_chat_completion method."""
        messages = [
            {"role": "system", "content": "Test system"},
            {"role": "user", "content": "Test user"}
        ]
        
        result = await self.adapter._create_chat_completion(
            messages=messages,
            temperature=0.7,
            max_tokens=100,
            top_p=1.0
        )
        
        # Check litellm.acompletion was called with correct args
        self.mock_litellm.acompletion.assert_called_once_with(
            model="gpt-3.5-turbo",
            messages=messages,
            temperature=0.7,
            max_tokens=100,
            top_p=1.0
        )
        
        # Check result format
        self.assertEqual(
            result["choices"][0]["message"]["content"],
            "Test response"
        )
    
    async def async_test_rank_outputs(self):
        """Test ranking outputs with LiteLLMAdapter."""
        # Configure the mock for both generation and evaluation
        generation_response = MagicMock()
        generation_response.choices = [
            MagicMock(message=MagicMock(role="assistant", content="Generated content"))
        ]
        
        evaluation_response = MagicMock()
        evaluation_response.choices = [
            MagicMock(message=MagicMock(role="assistant", content='{"test": true}'))
        ]
        
        self.mock_litellm.acompletion.side_effect = [
            generation_response,
            evaluation_response,
            generation_response,
            evaluation_response,
        ]
        
        # Call rank_outputs
        results = await self.adapter.rank_outputs("Test prompt")
        
        # Check results
        self.assertEqual(len(results), 2)  # Should match num_variants
        self.assertEqual(results[0].output, "Generated content")
        
        # Check litellm was called multiple times
        # Should be at least 4 calls (2 variants x 2 calls each for generate + evaluate)
        # Exact count may vary based on implementation details
        self.assertGreaterEqual(self.mock_litellm.acompletion.call_count, 4)
    
    async def async_test_anthropic_integration(self):
        """Test adapter with Anthropic-style model."""
        # Create a new adapter with Anthropic model
        self.mock_litellm.reset_mock()
        
        # Set up a new response for this test
        anthropic_response = MagicMock()
        anthropic_response.choices = [
            MagicMock(message=MagicMock(role="assistant", content="Anthropic response"))
        ]
        self.mock_litellm.acompletion.return_value = anthropic_response
        
        anthropic_adapter = LiteLLMAdapter(
            model="claude-2",
            api_key="anthropic-test-key",
            config=self.config
        )
        
        # Check Anthropic API key was set
        self.assertEqual(self.mock_litellm.anthropic_api_key, "anthropic-test-key")
        
        # Test call with Anthropic model
        messages = [{"role": "user", "content": "Test"}]
        result = await anthropic_adapter._create_chat_completion(
            messages=messages,
            temperature=0.7,
            max_tokens=100,
            top_p=1.0
        )
        
        # Check litellm was called with correct arguments
        self.mock_litellm.acompletion.assert_called_with(
            model="claude-2",
            messages=messages,
            temperature=0.7,
            max_tokens=100,
            top_p=1.0
        )
        
        # Check response was correctly formatted
        self.assertEqual(
            result["choices"][0]["message"]["content"],
            "Anthropic response"
        )

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
    # Run the async tests 
    adapter_test = TestLiteLLMAdapter()
    adapter_test.setUp()
    try:
        run_async_test(adapter_test.async_test_create_chat_completion)
        run_async_test(adapter_test.async_test_rank_outputs)
        run_async_test(adapter_test.async_test_anthropic_integration)
    finally:
        adapter_test.tearDown()
    
    # Run the regular tests
    unittest.main()