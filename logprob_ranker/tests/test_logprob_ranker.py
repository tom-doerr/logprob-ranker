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


class TestLogProbRankerScoring(unittest.TestCase):
    """Tests the attribute scoring logic in LogProbRanker based on token logprobs."""

    def setUp(self):
        self.default_template = (
            '{\n' # Use double backslash for literal newline in string if needed, or just \n
            '  "interesting": LOGPROB_TRUE,\n'
            '  "creative": LOGPROB_TRUE,\n'
            '  "useful": LOGPROB_TRUE\n'
            '}'
        )
        self.config = LogProbConfig(
            num_variants=1,
            evaluation_prompt="Evaluate the following text:", # Simple prompt
            template=self.default_template
        )
        self.mock_create_completion = AsyncMock()
        self.ranker = MinimalConcreteRanker(config=self.config, mock_create_completion=self.mock_create_completion)

    async def _async_test_simple_successful_scoring(self):
        """Test scoring with a clean JSON and identifiable true/false tokens."""
        generated_text_response = {
            "content": "This is a generated output.",
            "raw_token_logprobs": [("This", -0.1), (" is", -0.2), (" a", -0.1), (" generated", -0.3), (" output", -0.1), (".", -0.05)]
            # Role and other fields not strictly needed by the mock's current usage in generate_and_evaluate_output for generation part
        }

        eval_raw_json_text = '{"interesting": true, "creative": false, "useful": true}'
        eval_tokens_with_logprobs = [
            ('{"interesting"', -0.1), (':', -0.1), (' true', -0.5), (',', -0.1), # interesting: true (-0.5)
            (' "creative"', -0.1), (':', -0.1), (' false', -0.8), (',', -0.1), # creative: false (-0.8)
            (' "useful"', -0.1), (':', -0.1), (' true', -0.6), ('}', -0.1)    # useful: true (-0.6)
        ]
        evaluation_response = {
            "content": eval_raw_json_text,
            "raw_token_logprobs": eval_tokens_with_logprobs
        }

        self.ranker._internal_completion_mock.side_effect = [
            generated_text_response,
            evaluation_response
        ]

        ranked_output = await self.ranker.generate_and_evaluate_output(prompt="Test prompt", index=0)

        self.assertIsNotNone(ranked_output)
        self.assertEqual(ranked_output.output, "This is a generated output.")

        # Expected scores: interesting: -0.5, creative: -0.8, useful: -0.6
        # Expected final score: average of (-0.2, -0.9, -0.3) = -1.4 / 3 = -0.4666...
        # Mock values are: interesting: true (-0.5), creative: false (-0.8), useful: true (-0.6)
        self.assertAlmostEqual(ranked_output.logprob, (-0.5 - 0.8 - 0.6) / 3, places=5)
        
        self.assertEqual(len(ranked_output.attribute_scores), 3)
        
        score_map = {s.name: s for s in ranked_output.attribute_scores}
        self.assertIn("interesting", score_map)
        self.assertAlmostEqual(score_map["interesting"].score, -0.5, places=5) # Matches mock_eval_logprobs
        self.assertIn("Logprob of token 'true' for 'interesting'", score_map["interesting"].explanation)

        self.assertIn("creative", score_map)
        self.assertAlmostEqual(score_map["creative"].score, -0.8, places=5) # Matches mock_eval_logprobs
        self.assertIn("Logprob of token 'false' for 'creative'", score_map["creative"].explanation)

        self.assertIn("useful", score_map)
        self.assertAlmostEqual(score_map["useful"].score, -0.6, places=5) # Matches mock_eval_logprobs
        self.assertIn("Logprob of token 'true' for 'useful'", score_map["useful"].explanation)
        
        self.assertEqual(self.ranker._internal_completion_mock.call_count, 2)

    def test_simple_successful_scoring(self):
        run_async_test(self._async_test_simple_successful_scoring)


if __name__ == '__main__':
    unittest.main()
