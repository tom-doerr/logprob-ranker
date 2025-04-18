"""
Basic async tests for the LiteLLMAdapter.
"""

import unittest
from unittest.mock import patch, MagicMock, AsyncMock
import sys
import os
import asyncio
import json

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from logprob_ranker.ranker import LiteLLMAdapter, LogProbConfig, RankedOutput, AttributeScore


class AsyncBasicTests(unittest.TestCase):
    """Basic async tests for the LiteLLMAdapter."""

    def setUp(self):
        """Set up test fixtures."""
        # Create mock for litellm
        self.patcher = patch('logprob_ranker.ranker.litellm')
        self.mock_litellm = self.patcher.start()
        
        # Create config for tests
        self.config = LogProbConfig(
            num_variants=1,  # Generate just one output for test simplicity
            temperature=0.7,
            max_tokens=100,
            thread_count=1,
            template='{"test": LOGPROB_TRUE}'
        )
        
        # Setup response for mock completion
        gen_message = MagicMock()
        gen_message.content = "Test generated content"
        gen_choice = MagicMock()
        gen_choice.message = gen_message
        self.gen_response = MagicMock()
        self.gen_response.choices = [gen_choice]
        
        # Setup response for mock evaluation
        eval_message = MagicMock()
        eval_message.content = '{"test": true}'
        eval_choice = MagicMock()
        eval_choice.message = eval_message
        self.eval_response = MagicMock()
        self.eval_response.choices = [eval_choice]
        
        # Set up acompletion to return our mock responses
        self.mock_litellm.acompletion = AsyncMock()
    
    def tearDown(self):
        """Tear down test fixtures."""
        self.patcher.stop()
    
    async def _test_simple_generation(self):
        """Test a simple async generation."""
        # Configure the mock to return our responses
        self.mock_litellm.acompletion.side_effect = [
            self.gen_response,
            self.eval_response
        ]
        
        # Create adapter with mocked litellm
        adapter = LiteLLMAdapter(
            model="gpt-3.5-turbo",
            api_key="test-key",
            config=self.config
        )
        
        # Run with a simple prompt - should generate and evaluate one output
        results = await adapter.rank_outputs("Test prompt")
        
        # Verify basic results
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0].output, "Test generated content")
        self.assertEqual(results[0].logprob, 1.0)  # True = 1.0
        
        # Verify acompletion was called twice (generate + evaluate)
        self.assertEqual(self.mock_litellm.acompletion.call_count, 2)
        
        return results
    
    def test_async_generation(self):
        """Run the async test in a sync test method."""
        loop = asyncio.get_event_loop()
        results = loop.run_until_complete(self._test_simple_generation())
        self.assertIsNotNone(results)


if __name__ == "__main__":
    unittest.main()