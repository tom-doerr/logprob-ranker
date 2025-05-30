import asyncio
import unittest
from unittest.mock import AsyncMock, MagicMock, patch
from typing import List, Dict, Any, Optional

from logprob_ranker.logprob_ranker.ranker import LogProbRanker, LogProbConfig, RankedOutput, LLMGenerationError

# Helper to run async tests
def run_async_test(test_case_method):
    """
    Run an async test method in a new, isolated event loop.
    'test_case_method' is expected to be a callable that returns a coroutine
    (e.g., an async method of a test class).
    """
    policy = asyncio.get_event_loop_policy()
    original_loop = None
    try:
        original_loop = policy.get_event_loop()
    except RuntimeError:  # Indicates no current event loop is set for this thread.
        pass # original_loop remains None

    # Create and set a new event loop specifically for this test case.
    new_loop = policy.new_event_loop()
    policy.set_event_loop(new_loop)

    try:
        # Call the passed method to get the coroutine, then run it.
        result = new_loop.run_until_complete(test_case_method())
        return result
    finally:
        new_loop.close()
        # Restore the original event loop (if any) for the thread.
        policy.set_event_loop(original_loop)

class MinimalConcreteRanker(LogProbRanker):
    """A minimal concrete implementation of LogProbRanker for testing."""
    def __init__(self, config: Optional[LogProbConfig] = None, mock_create_completion: Optional[AsyncMock] = None):
        super().__init__(llm_client=MagicMock(), config=config or LogProbConfig())
        # Set up the internal mock, allowing injection for testing
        if mock_create_completion:
            self._internal_completion_mock = mock_create_completion # This is the attribute that will be mocked
        else:
            self._internal_completion_mock = AsyncMock()

    async def _create_chat_completion(self, messages: List[Dict[str, str]], temperature: float, max_tokens: int, top_p: float, model: Optional[str] = None, **kwargs) -> Dict[str, Any]:
        # This is the actual method that would call an LLM, now uses the internal mock
        return await self._internal_completion_mock(messages, temperature, max_tokens, top_p, model, **kwargs)

class TestLogProbRankerErrorHandling(unittest.TestCase):
    """Tests error handling in the LogProbRanker class."""

    def setUp(self):
        # Using default template from LogProbConfig for these error handling tests.
        # The default template is: """{
        #   "interesting": LOGPROB_TRUE,
        #   "creative": LOGPROB_TRUE,
        #   "useful": LOGPROB_TRUE
        # }"""
        # The evaluation_prompt_template will also use its default.
        self.config = LogProbConfig(
            num_variants=1
            # evaluation_prompt_template can be set here if a specific one is needed for a test
        )
        self.mock_create_completion = AsyncMock()
        self.ranker = MinimalConcreteRanker(config=self.config, mock_create_completion=self.mock_create_completion)

    async def _async_test_gen_eval_handles_generation_error(self):
        """Test generate_and_evaluate_output raises RuntimeError if generation fails."""
        self.ranker._internal_completion_mock.side_effect = LLMGenerationError("Mocked LLM Error")
        
        with self.assertRaisesRegex(RuntimeError, "LLM generation failed for variant 0: Mocked LLM Error"):
            await self.ranker.generate_and_evaluate_output(prompt="Test prompt", index=0)
        
        # Ensure _create_chat_completion was called once (for generation)
        self.ranker._internal_completion_mock.assert_called_once()

    def test_gen_eval_handles_generation_error(self):
        run_async_test(self._async_test_gen_eval_handles_generation_error)

    async def _async_test_gen_eval_handles_evaluation_error(self):
        """Test generate_and_evaluate_output raises RuntimeError if evaluation's LLM call fails."""
        # First call (generation) is successful
        generation_response = {
            "content": "Generated output",
            # "role": "assistant", # Not strictly needed by current _create_chat_completion mock
            "average_token_logprob": -0.5
        }
        # Second call (evaluation's LLM call) fails
        self.ranker._internal_completion_mock.side_effect = [
            generation_response, 
            LLMGenerationError("Evaluation LLM call failed") # Specific error message for this scenario
        ]
        
        with self.assertRaisesRegex(RuntimeError, "LLM generation failed for variant 0: Evaluation LLM call failed"):
            await self.ranker.generate_and_evaluate_output(prompt="Test prompt", index=0)
        
        # Ensure _create_chat_completion was called twice (generation + evaluation)
        self.assertEqual(self.ranker._internal_completion_mock.call_count, 2)

    def test_gen_eval_handles_evaluation_error(self):
        run_async_test(self._async_test_gen_eval_handles_evaluation_error)

    @patch('logprob_ranker.logprob_ranker.ranker.LogProbRanker.generate_and_evaluate_output', new_callable=AsyncMock)
    async def _async_test_rank_outputs_handles_some_failures(self, mock_gen_eval):
        """Test rank_outputs correctly handles some None results from generate_and_evaluate_output."""
        self.ranker.config.num_variants = 3 # Test with 3 variants

        # Mock generate_and_evaluate_output to return a mix of RankedOutput and None
        successful_output1 = RankedOutput(output="Success 1", logprob=-0.1, index=0, attribute_scores=[])
        successful_output2 = RankedOutput(output="Success 2", logprob=-0.3, index=2, attribute_scores=[])
        
        mock_gen_eval.side_effect = [
            successful_output1, # Variant 0 succeeds
            None,               # Variant 1 fails
            successful_output2  # Variant 2 succeeds
        ]
        
        results = await self.ranker.rank_outputs(prompt="Test prompt for partial failure")
        
        self.assertEqual(len(results), 2) # Should only contain the successful ones
        self.assertEqual(results[0].output, "Success 1") # Sorted by logprob
        self.assertEqual(results[1].output, "Success 2")
        self.assertEqual(mock_gen_eval.call_count, 3)

    def test_rank_outputs_handles_some_failures(self):
        run_async_test(self._async_test_rank_outputs_handles_some_failures)

    @patch('logprob_ranker.logprob_ranker.ranker.LogProbRanker.generate_and_evaluate_output', new_callable=AsyncMock)
    async def _async_test_rank_outputs_handles_all_failures(self, mock_gen_eval):
        """Test rank_outputs raises RuntimeError if all generate_and_evaluate_output calls fail."""
        self.ranker.config.num_variants = 2 # Test with 2 variants
        mock_gen_eval.return_value = None # All calls fail
        
        with self.assertRaisesRegex(RuntimeError, "All generation and evaluation tasks failed."):
            await self.ranker.rank_outputs(prompt="Test prompt for total failure")
            
        self.assertEqual(mock_gen_eval.call_count, 2)

    def test_rank_outputs_handles_all_failures(self):
        run_async_test(self._async_test_rank_outputs_handles_all_failures)

if __name__ == '__main__':
    unittest.main()
