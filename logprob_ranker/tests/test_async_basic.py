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

    async def _test_error_handling(self):
        """Test error handling in async generation."""
        # Configure the mock to raise an exception
        self.mock_litellm.acompletion.side_effect = Exception("Test error")
        
        # Create adapter with mocked litellm
        adapter = LiteLLMAdapter(
            model="gpt-3.5-turbo",
            api_key="test-key",
            config=self.config
        )
        
        # Test that errors are properly propagated
        with self.assertRaises(RuntimeError) as context:
            await adapter.rank_outputs("Test prompt")
        
        self.assertIn("All tasks failed", str(context.exception))
        self.assertIn("Test error", str(context.exception))
        
        return True

    def test_error_handling(self):
        """Run the async error handling test."""
        loop = asyncio.get_event_loop()
        result = loop.run_until_complete(self._test_error_handling())
        self.assertTrue(result)

    async def _test_concurrent_tasks(self):
        """Test concurrent task handling."""
        # Configure config for multiple variants
        multi_config = LogProbConfig(
            num_variants=3,
            temperature=0.7,
            max_tokens=100,
            thread_count=2,
            template='{"test": LOGPROB_TRUE}'  # Add template to config
        )
        
        # Configure mock to return different responses
        responses = []
        for i in range(3):
            gen_message = MagicMock()
            gen_message.content = f"Test content {i}"
            gen_choice = MagicMock()
            gen_choice.message = gen_message
            response = MagicMock()
            response.choices = [gen_choice]
            responses.append(response)
        
        # Create evaluation responses
        eval_responses = []
        for _ in range(3):
            eval_message = MagicMock()
            eval_message.content = '{"test": true}'
            eval_choice = MagicMock()
            eval_choice.message = eval_message
            eval_response = MagicMock()
            eval_response.choices = [eval_choice]
            eval_responses.append(eval_response)
        
        # Set up side effects to return our responses in sequence
        # Interleave generation and evaluation responses
        all_responses = []
        for gen_resp, eval_resp in zip(responses, eval_responses):
            all_responses.extend([gen_resp, eval_resp])
        
        self.mock_litellm.acompletion.side_effect = all_responses
        
        # Create adapter with mocked litellm
        adapter = LiteLLMAdapter(
            model="gpt-3.5-turbo",
            api_key="test-key",
            config=multi_config
        )
        
        # Run with concurrent tasks
        results = await adapter.rank_outputs("Test prompt")
        
        # Verify results
        self.assertEqual(len(results), 3)
        contents = {result.output for result in results}
        self.assertEqual(contents, {"Test content 0", "Test content 1", "Test content 2"})
        
        # Verify all tasks were completed
        self.assertEqual(self.mock_litellm.acompletion.call_count, 6)  # 3 generations + 3 evaluations
        
        return results

    def test_concurrent_tasks(self):
        """Run the concurrent tasks test."""
        loop = asyncio.get_event_loop()
        results = loop.run_until_complete(self._test_concurrent_tasks())
        self.assertIsNotNone(results)


if __name__ == "__main__":
    unittest.main()