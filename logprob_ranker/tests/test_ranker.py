"""
Tests for the LogProbRanker class.
"""

import unittest
import asyncio
from typing import Optional, List
from unittest.mock import AsyncMock, MagicMock, patch
from logprob_ranker.ranker import LogProbRanker, LogProbConfig, RankedOutput, AttributeScore

class TestLogProbRanker(unittest.TestCase):
    """Test the LogProbRanker class."""

    def setUp(self):
        """Set up test fixtures."""
        # Create a mock LLM client
        self.mock_client = MagicMock()
        self.mock_client.chat = MagicMock()
        self.mock_client.chat.completions = MagicMock()
        self.mock_client.chat.completions.create = AsyncMock()
        
        # Create a proper mock response object structure
        mock_response = MagicMock()
        mock_response.choices = [
            MagicMock(
                message=MagicMock(
                    role="assistant",
                    content="This is a test response."
                )
            )
        ]
        self.mock_client.chat.completions.create.return_value = mock_response
        
        # Create a test config with multiple LOGPROB_TRUE attributes
        self.config = LogProbConfig(
            num_variants=2,
            thread_count=1,
            template='{"test": LOGPROB_TRUE, "quality": LOGPROB_TRUE}'
        )
        
        # Create the ranker
        with patch('logprob_ranker.ranker.extract_template_attributes', return_value=["test", "quality"]):
            self.ranker = LogProbRanker(llm_client=self.mock_client, config=self.config)
    
    def test_initialization(self):
        """Test initialization of LogProbRanker."""
        self.assertEqual(self.ranker.llm_client, self.mock_client)
        self.assertEqual(self.ranker.config, self.config)
        self.assertIsNone(self.ranker.on_output_callback)
    
    async def async_test_generate_and_evaluate_output(self):
        """Test generating and evaluating a single output."""
        # Create a partial class to avoid actual API calls
        async def mock_create_chat_completion(messages, temperature, max_tokens, top_p):
            """Mock the create chat completion method"""
            # Return different responses based on the message content
            if any("system" in msg and "evaluator" in msg.get("content", "") for msg in messages):
                # This is an evaluation call
                return {
                    "choices": [
                        {
                            "message": {
                                "role": "assistant",
                                "content": '{"test": true, "quality": true}'
                            }
                        }
                    ]
                }
            else:
                # This is a generation call
                return {
                    "choices": [
                        {
                            "message": {
                                "role": "assistant",
                                "content": "Generated content"
                            }
                        }
                    ]
                }
        
        # Mock the _create_chat_completion method
        with patch.object(self.ranker, '_create_chat_completion', side_effect=mock_create_chat_completion):
            # Mock the parse_evaluation_json function to return our expected result
            with patch('logprob_ranker.ranker.parse_evaluation_json', return_value={"test": True, "quality": True}):
                # Mock the calculate_logprob_score function to return a fixed value
                with patch('logprob_ranker.ranker.calculate_logprob_score', return_value=0.8):
                    # Call the method
                    result = await self.ranker.generate_and_evaluate_output("Test prompt", 0)
                    
                    # Check result is not None
                    self.assertIsNotNone(result, "Result should not be None")
                    
                    # First assert that result is not None and is the correct type
                    self.assertIsNotNone(result, "Result should not be None")
                    self.assertIsInstance(result, RankedOutput, "Result should be a RankedOutput instance")
                    
                    # Then we can safely check individual properties
                    self.assertEqual(result.output, "Generated content")
                    self.assertEqual(result.index, 0)
                    self.assertEqual(result.logprob, 0.8)
                    
                    # Now for attribute_scores, only check if they exist first
                    attribute_scores = getattr(result, 'attribute_scores', None)
                    self.assertIsNotNone(attribute_scores, "Attribute scores should not be None")
                    
                    if attribute_scores:  # Only proceed if not None
                        self.assertTrue(isinstance(attribute_scores, list), "Attribute scores should be a list")
                        self.assertEqual(len(attribute_scores), 2, "Should have 2 attribute scores")
                        
                        # Extract attribute names safely
                        attribute_names = [getattr(attr, 'name', None) for attr in attribute_scores]
                        self.assertIn("test", attribute_names, "Should have 'test' attribute")
                        self.assertIn("quality", attribute_names, "Should have 'quality' attribute")
    
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
    
    # Note: arank method is only in the OpenRouter adapter, not in the base LogProbRanker class
    
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
    
    def test_generate_and_evaluate_output(self):
        """Run the async test for generate_and_evaluate_output."""
        run_async_test(self.async_test_generate_and_evaluate_output)
    
    def test_rank_outputs(self):
        """Run the async test for rank_outputs."""
        run_async_test(self.async_test_rank_outputs)

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