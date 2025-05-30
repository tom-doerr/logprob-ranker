"""
Basic async tests for the LiteLLMAdapter.
"""

# Standard library imports
import unittest
from unittest.mock import patch, MagicMock, AsyncMock
import asyncio

# Third-party imports
from litellm.utils import ModelResponse # Import for spec

# First-party imports
from logprob_ranker.logprob_ranker.ranker import LiteLLMAdapter, LogProbConfig
from logprob_ranker.logprob_ranker.utils import LLMGenerationError


class AsyncBasicTests(unittest.TestCase):
    """Basic async tests for the LiteLLMAdapter."""

    def setUp(self):
        """Set up test fixtures."""
        # Patch litellm in the ranker module
        self.patcher = patch('logprob_ranker.logprob_ranker.ranker.litellm')
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
        # Mock logprobs structure
        mock_token_logprob1 = MagicMock()
        mock_token_logprob1.token = "Test"
        mock_token_logprob1.logprob = -0.123
        mock_token_logprob2 = MagicMock()
        mock_token_logprob2.token = "content"
        mock_token_logprob2.logprob = -0.456
        
        mock_logprobs_content = [mock_token_logprob1, mock_token_logprob2]
        mock_logprobs_obj = MagicMock()
        mock_logprobs_obj.content = mock_logprobs_content
        gen_choice.logprobs = mock_logprobs_obj # Add logprobs to choice

        self.gen_response = MagicMock(spec=ModelResponse) # Use spec for better mocking
        self.gen_response.choices = [gen_choice]
        # Ensure the mock response object itself can be introspected if needed by LiteLLMAdapter
        self.gen_response.model_dump_json = MagicMock(return_value="{}")
        
        # Setup response for mock evaluation
        eval_message = MagicMock()
        eval_message.content = '{"test": true}'
        eval_choice = MagicMock()
        eval_choice.message = eval_message
        # Mock logprobs for evaluation (though not strictly used for ranking, _extract_raw_token_logprobs will be called)
        mock_eval_token_logprob = MagicMock()
        mock_eval_token_logprob.token = "{\"test\":"
        mock_eval_token_logprob.logprob = -0.01
        mock_eval_logprobs_content = [mock_eval_token_logprob]
        mock_eval_logprobs_obj = MagicMock()
        mock_eval_logprobs_obj.content = mock_eval_logprobs_content
        eval_choice.logprobs = mock_eval_logprobs_obj # Add logprobs to choice

        self.eval_response = MagicMock(spec=ModelResponse)
        self.eval_response.choices = [eval_choice]
        self.eval_response.model_dump_json = MagicMock(return_value="{}")
        
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
        # Check logprob (average of evaluation attribute scores)
        # The template is '{"test": LOGPROB_TRUE}' and eval response is '{"test": true}'
        # So, attribute 'test' gets score 1.0. Average is 1.0.
        self.assertEqual(results[0].logprob, 1.0)  # Based on '{"test": true}' evaluation and LOGPROB_TRUE template
        
        # Verify acompletion was called twice (generate + evaluate)
        self.assertEqual(self.mock_litellm.acompletion.call_count, 2)
        
        return results
    
    def test_async_generation(self):
        """Run the async test in a sync test method."""
        loop = asyncio.get_event_loop()
        results = loop.run_until_complete(self._test_simple_generation())
        self.assertIsNotNone(results)

    async def _test_error_handling(self):
        """Test error handling in async generation when all variants fail."""
        # Configure mock to raise an error that LiteLLMAdapter._create_chat_completion will wrap.
        # This simulates a failure during the call to the LLM service.
        self.mock_litellm.acompletion.side_effect = Exception("Mocked LiteLLM acompletion failure")
        
        adapter = LiteLLMAdapter(
            model="gpt-3.5-turbo",
            api_key="test-key",
            config=self.config  # self.config has num_variants = 1 by default in setUp
        )
        
        # When litellm.acompletion fails, LiteLLMAdapter._create_chat_completion raises LLMGenerationError.
        # Then, LogProbRanker.generate_and_evaluate_output catches this and raises a RuntimeError.
        # Since num_variants is 1, rank_outputs will receive this one failure and, finding no
        # successful results, will raise RuntimeError("All generation and evaluation tasks failed.").
        # However, for a single variant, the RuntimeError from generate_and_evaluate_output itself propagates out.
        expected_error_message = "LLM generation failed for variant 0: LiteLLM completion failed for model gpt-3.5-turbo: Mocked LiteLLM acompletion failure"
        with self.assertRaisesRegex(RuntimeError, expected_error_message):
            await adapter.rank_outputs("Test prompt for error")

        # Ensure acompletion was called once (for the generation attempt of the single variant).
        self.mock_litellm.acompletion.assert_called_once()

    def test_error_handling(self):
        """Run the async error handling test."""
        loop = asyncio.get_event_loop()
        loop.run_until_complete(self._test_error_handling()) # _test_error_handling now makes assertions directly

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
            mock_token_logprob_c1 = MagicMock()
            mock_token_logprob_c1.token = f"Test{i}"
            mock_token_logprob_c1.logprob = -0.1 * i
            mock_token_logprob_c2 = MagicMock()
            mock_token_logprob_c2.token = "content"
            mock_token_logprob_c2.logprob = -0.2 * i
            mock_logprobs_content_c = [mock_token_logprob_c1, mock_token_logprob_c2]
            mock_logprobs_obj_c = MagicMock()
            mock_logprobs_obj_c.content = mock_logprobs_content_c
            gen_choice.logprobs = mock_logprobs_obj_c

            response = MagicMock(spec=ModelResponse)
            response.choices = [gen_choice]
            response.model_dump_json = MagicMock(return_value="{}")
            responses.append(response)
        
        # Create evaluation responses
        eval_responses = []
        for _ in range(3):
            eval_message = MagicMock()
            eval_message.content = '{"test": true}'
            eval_choice = MagicMock()
            eval_choice.message = eval_message
            mock_eval_token_logprob_c = MagicMock()
            mock_eval_token_logprob_c.token = "{\"test\":"
            mock_eval_token_logprob_c.logprob = -0.01 * i
            mock_eval_logprobs_content_c = [mock_eval_token_logprob_c]
            mock_eval_logprobs_obj_c = MagicMock()
            mock_eval_logprobs_obj_c.content = mock_eval_logprobs_content_c
            eval_choice.logprobs = mock_eval_logprobs_obj_c

            eval_response = MagicMock(spec=ModelResponse)
            eval_response.choices = [eval_choice]
            eval_response.model_dump_json = MagicMock(return_value="{}")
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