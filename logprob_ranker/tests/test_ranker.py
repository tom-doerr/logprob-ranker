"""
Tests for the LogProbRanker class.
"""

import unittest
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch
from logprob_ranker.ranker import LogProbRanker, LogProbConfig, RankedOutput

class TestLogProbRanker(unittest.TestCase):
    """Test the LogProbRanker class."""

    def setUp(self):
        """Set up test fixtures."""
        # Create a mock LLM client
        self.mock_client = MagicMock()
        self.mock_client.chat = MagicMock()
        self.mock_client.chat.completions = MagicMock()
        self.mock_client.chat.completions.create = AsyncMock()
        
        # Set up default return values
        self.mock_client.chat.completions.create.return_value = {
            "choices": [
                {
                    "message": {
                        "role": "assistant",
                        "content": "This is a test response."
                    }
                }
            ]
        }
        
        # Create a test config
        self.config = LogProbConfig(
            num_variants=2,
            thread_count=1,
            template='{"test": LOGPROB_TRUE}'
        )
        
        # Create the ranker
        self.ranker = LogProbRanker(llm_client=self.mock_client, config=self.config)
    
    def test_initialization(self):
        """Test initialization of LogProbRanker."""
        self.assertEqual(self.ranker.llm_client, self.mock_client)
        self.assertEqual(self.ranker.config, self.config)
        self.assertIsNone(self.ranker.on_output_callback)
    
    async def async_test_generate_and_evaluate_output(self):
        """Test generating and evaluating a single output."""
        # Setup mock for generation
        self.mock_client.chat.completions.create.side_effect = [
            # First call - generation
            {
                "choices": [
                    {
                        "message": {
                            "role": "assistant",
                            "content": "Generated content"
                        }
                    }
                ]
            },
            # Second call - evaluation
            {
                "choices": [
                    {
                        "message": {
                            "role": "assistant",
                            "content": '{"test": true}'
                        }
                    }
                ]
            }
        ]
        
        # Call the method
        result = await self.ranker.generate_and_evaluate_output("Test prompt", 0)
        
        # Check result
        self.assertIsInstance(result, RankedOutput)
        self.assertEqual(result.output, "Generated content")
        self.assertEqual(result.index, 0)
        self.assertGreaterEqual(result.logprob, 0)
        self.assertLessEqual(result.logprob, 1)
        
        # Check that client was called twice
        self.assertEqual(self.mock_client.chat.completions.create.call_count, 2)
    
    async def async_test_rank_outputs(self):
        """Test ranking multiple outputs."""
        # Setup mock
        async def mock_generate(*args, **kwargs):
            return RankedOutput(
                output=f"Output for {args[1]}",
                logprob=0.5 + (args[1] * 0.1),  # Higher index = higher score for testing
                index=args[1]
            )
        
        # Patch the generate_and_evaluate_output method
        with patch.object(
            self.ranker, 'generate_and_evaluate_output', side_effect=mock_generate
        ):
            # Call the method
            results = await self.ranker.rank_outputs("Test prompt")
            
            # Check results
            self.assertEqual(len(results), 2)  # num_variants in config
            
            # Check sorting (higher logprob first)
            self.assertEqual(results[0].index, 1)  # Higher index had higher score
            self.assertEqual(results[1].index, 0)
    
    def test_rank_outputs_sync(self):
        """Test the synchronous wrapper for rank_outputs."""
        # We'll patch asyncio.run to avoid actually running the event loop
        with patch('asyncio.run') as mock_run:
            mock_run.return_value = [
                RankedOutput(output="Test 1", logprob=0.8, index=0),
                RankedOutput(output="Test 2", logprob=0.6, index=1)
            ]
            
            # Call the method
            results = self.ranker.rank_outputs_sync("Test prompt")
            
            # Check that asyncio.run was called with rank_outputs
            mock_run.assert_called_once()
            
            # Check results
            self.assertEqual(len(results), 2)
            self.assertEqual(results[0].output, "Test 1")

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