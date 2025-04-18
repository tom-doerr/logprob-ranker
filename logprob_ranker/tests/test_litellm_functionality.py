"""
Functional tests for the LiteLLMAdapter.
"""

import unittest
from unittest.mock import patch, MagicMock, AsyncMock
import sys
import os
import asyncio

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from logprob_ranker.ranker import LiteLLMAdapter, LogProbConfig, RankedOutput, AttributeScore

class TestLiteLLMFunctionality(unittest.TestCase):
    """Test core functionality of the LiteLLMAdapter."""

    def setUp(self):
        """Set up test fixtures."""
        # Create a config with minimal variants for faster tests
        self.config = LogProbConfig(
            num_variants=1,
            thread_count=1,
            template='{"clear": LOGPROB_TRUE, "useful": LOGPROB_TRUE}',
            max_tokens=50
        )
        
        # Patch litellm module
        self.patcher = patch('logprob_ranker.ranker.litellm')
        self.mock_litellm = self.patcher.start()
        
        # Create a proper AsyncMock for acompletion
        self.mock_litellm.acompletion = AsyncMock()
    
    def tearDown(self):
        """Clean up test fixtures."""
        self.patcher.stop()
    
    async def test_simple_rank(self):
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
        self.mock_litellm.acompletion.side_effect = [
            generation_response,
            evaluation_response
        ]
        
        # Create adapter with our mocked litellm
        adapter = LiteLLMAdapter(
            model="gpt-3.5-turbo",
            api_key="test-key",
            config=self.config
        )
        
        # Create a simpler _create_chat_completion method that just returns our mock responses
        # This avoids having to deal with awaiting the mock responses
        async def mock_create_chat_completion(*args, **kwargs):
            if len(self.mock_litellm.acompletion.side_effect) > 0:
                return self.mock_litellm.acompletion.side_effect.pop(0)
            return MagicMock()
        
        # Replace the method with our mocked version
        adapter._create_chat_completion = mock_create_chat_completion
        
        # Run with a simple prompt
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
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0].output, expected_output.output)
        self.assertEqual(results[0].logprob, expected_output.logprob)
    
    def test_sync_wrapper(self):
        """Test that the synchronous wrapper works correctly."""
        # Patch asyncio.run to avoid actually running the event loop
        with patch('asyncio.run') as mock_run:
            # Setup mock to return a list of RankedOutput objects
            mock_run.return_value = [
                RankedOutput(output="Test output", logprob=0.75, index=0)
            ]
            
            # Create adapter
            adapter = LiteLLMAdapter(
                model="gpt-3.5-turbo",
                api_key="test-key",
                config=self.config
            )
            
            # Call synchronous method
            results = adapter.rank_outputs_sync("Test prompt")
            
            # Verify results
            self.assertEqual(len(results), 1)
            self.assertEqual(results[0].output, "Test output")
            self.assertEqual(results[0].logprob, 0.75)
            
            # Verify asyncio.run was called
            mock_run.assert_called_once()

def run_async_test(test_case):
    """Helper to run an async test."""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(test_case())
    finally:
        loop.close()

if __name__ == '__main__':
    # Run async tests manually
    test_case = TestLiteLLMFunctionality()
    test_case.setUp()
    try:
        print("Running async test: test_simple_rank")
        run_async_test(test_case.test_simple_rank)
        print("✓ Test passed")
    finally:
        test_case.tearDown()
    
    # Run sync test
    print("\nRunning sync test: test_sync_wrapper")
    test_case = TestLiteLLMFunctionality()
    test_case.setUp()
    try:
        test_case.test_sync_wrapper()
        print("✓ Test passed")
    finally:
        test_case.tearDown()