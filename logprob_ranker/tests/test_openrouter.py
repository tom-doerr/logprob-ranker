"""
Unit tests for OpenRouter adapter.
"""

import unittest
import asyncio
import os
from unittest.mock import AsyncMock, MagicMock, patch

from logprob_ranker.ranker import LogProbConfig, RankedOutput
from logprob_ranker.openrouter import OpenRouterAdapter, get_full_model_name, OPENROUTER_MODELS


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
        
        # Create a mock for os.environ
        self.env_patch = patch.dict('os.environ', {"OPENROUTER_API_KEY": "env_test_api_key"})
        self.env_patch.start()
        
        # Create the OpenRouter adapter
        self.adapter = OpenRouterAdapter(
            model="gpt-3.5-turbo",
            api_key="test_api_key",
            config=self.config
        )
    
    def tearDown(self):
        """Tear down test fixtures."""
        self.litellm_patch.stop()
        self.env_patch.stop()
    
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
        
        self.assertEqual(call_args[1]["model"], "openrouter/openai/gpt-3.5-turbo")
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
        
        # Create an AsyncMock for the rank_outputs method
        self.adapter.rank_outputs = AsyncMock(return_value=mock_results)
        
        # Call the arank method
        result = await self.adapter.arank("Test prompt")
        
        # Verify the result is the first (highest ranked) output
        self.assertEqual(result, mock_results[0])
        
        # Test with custom criteria
        self.adapter.rank_outputs.reset_mock()  # Reset the mock for clean test
        self.adapter.rank_outputs = AsyncMock(return_value=mock_results)
        
        result = await self.adapter.arank("Test prompt", criteria="Test criteria")
        self.assertEqual(result, mock_results[0])
    
    def test_rank(self):
        """Test the synchronous rank method."""
        # Mock the asyncio.run function and arank method
        mock_result = RankedOutput(output="Test output", logprob=0.8, index=0)
        
        # Use AsyncMock for the async 'arank' method.
        # The return_value of the *coroutine function* itself doesn't matter here
        # because asyncio.run will be mocked to return the final result.
        with patch.object(self.adapter, 'arank', new_callable=AsyncMock) as mock_arank:
            with patch('asyncio.run', return_value=mock_result) as mock_run:
                # Call the rank method
                result = self.adapter.rank("Test prompt")
                
                # Verify asyncio.run was called
                mock_run.assert_called_once()
                
                # Verify arank was actually called (which returns the coroutine passed to asyncio.run)
                mock_arank.assert_called_once_with("Test prompt", None)
                
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


class TestOpenRouterCriteriaHandling(unittest.IsolatedAsyncioTestCase):

    def setUp(self):
        """Set up a reusable adapter and config for criteria tests."""
        self.config = LogProbConfig()
        # Store original template/prompt to check restoration
        self.original_template = self.config.template
        self.original_eval_prompt = self.config.evaluation_prompt
        
        # Use a real, cheap model name for initialization if needed
        self.adapter = OpenRouterAdapter(model="google/gemini-flash", config=self.config)
        self.prompt = "Test prompt"

    @patch('logprob_ranker.openrouter.OpenRouterAdapter.rank_outputs', new_callable=AsyncMock)
    async def test_criteria_empty(self, mock_rank_outputs):
        """Test arank with empty criteria string."""
        mock_rank_outputs.return_value = [create_dummy_output(0.9)]
        
        await self.adapter.arank(self.prompt, criteria="")
        
        # Check that config remains unchanged because criteria is empty
        self.assertEqual(self.adapter.config.template, self.original_template)
        self.assertEqual(self.adapter.config.evaluation_prompt, self.original_eval_prompt)
        mock_rank_outputs.assert_awaited_once_with(self.prompt)

    @patch('logprob_ranker.openrouter.OpenRouterAdapter.rank_outputs', new_callable=AsyncMock)
    async def test_criteria_no_numbered_list(self, mock_rank_outputs):
        """Test arank with criteria lacking numbered list format."""
        mock_rank_outputs.return_value = [create_dummy_output(0.9)]
        
        await self.adapter.arank(self.prompt, criteria="Just some text, no list.")
        
        # Check that config remains unchanged because criteria is not parseable
        self.assertEqual(self.adapter.config.template, self.original_template)
        self.assertEqual(self.adapter.config.evaluation_prompt, self.original_eval_prompt)
        mock_rank_outputs.assert_awaited_once_with(self.prompt)

    @patch('logprob_ranker.openrouter.OpenRouterAdapter.rank_outputs', new_callable=AsyncMock)
    async def test_criteria_default_naming(self, mock_rank_outputs):
        """Test arank criteria parsing for default attribute naming (first word)."""
        criteria = "1. Clarity of the explanation\n2. Relevance to the topic"
        expected_template = '{\n  "clarity": LOGPROB_TRUE,\n  "relevance": LOGPROB_TRUE\n}'
        expected_json_guidance = '{\n  "clarity": true,\n  "relevance": true\n}'

        captured_config_template = None
        captured_config_eval_prompt = None

        # Define the side effect function to capture the config state
        async def capture_config_side_effect(*args, **kwargs):
            nonlocal captured_config_template, captured_config_eval_prompt
            # Capture the config state *inside* the mock call
            captured_config_template = self.adapter.config.template
            captured_config_eval_prompt = self.adapter.config.evaluation_prompt
            return [create_dummy_output(0.9)] # Return the mock value

        mock_rank_outputs.side_effect = capture_config_side_effect

        await self.adapter.arank(self.prompt, criteria=criteria)

        # Assert that rank_outputs was called (with only explicit args)
        mock_rank_outputs.assert_awaited_once_with(self.prompt)

        # Now assert using the captured values
        self.assertIsNotNone(captured_config_template, "Side effect did not capture template")
        self.assertEqual(captured_config_template, expected_template)
        self.assertIsNotNone(captured_config_eval_prompt, "Side effect did not capture eval prompt")
        self.assertIn(criteria, captured_config_eval_prompt)
        self.assertIn(expected_json_guidance, captured_config_eval_prompt)

    @patch('logprob_ranker.openrouter.OpenRouterAdapter.rank_outputs', new_callable=AsyncMock)
    async def test_criteria_keyword_detection(self, mock_rank_outputs):
        """Test arank criteria parsing for keyword detection."""
        criteria = (
            "1. Assess the language style.\n" # language
            "2. Check the structure and flow.\n" # structure
            "3. Is it factually correct?" # correctness
        )
        expected_template = '{\n  "language": LOGPROB_TRUE,\n  "structure": LOGPROB_TRUE,\n  "correctness": LOGPROB_TRUE\n}'
        expected_json_guidance = '{\n  "language": true,\n  "structure": true,\n  "correctness": true\n}'

        captured_config_template = None
        captured_config_eval_prompt = None

        # Define the side effect function to capture the config state
        async def capture_config_side_effect(*args, **kwargs):
            nonlocal captured_config_template, captured_config_eval_prompt
            captured_config_template = self.adapter.config.template
            captured_config_eval_prompt = self.adapter.config.evaluation_prompt
            return [create_dummy_output(0.9)]

        mock_rank_outputs.side_effect = capture_config_side_effect

        await self.adapter.arank(self.prompt, criteria=criteria)

        # Assert that rank_outputs was called
        mock_rank_outputs.assert_awaited_once_with(self.prompt)

        # Check the config state using captured values
        self.assertIsNotNone(captured_config_template, "Side effect did not capture template")
        self.assertEqual(captured_config_template, expected_template)
        self.assertIsNotNone(captured_config_eval_prompt, "Side effect did not capture eval prompt")
        self.assertIn(criteria, captured_config_eval_prompt)
        self.assertIn(expected_json_guidance, captured_config_eval_prompt)

    @patch('logprob_ranker.openrouter.OpenRouterAdapter.rank_outputs', new_callable=AsyncMock)
    async def test_criteria_mixed_naming(self, mock_rank_outputs):
        """Test arank criteria parsing with mixed keyword and default naming."""
        criteria = "1. Analyze the writing style\n2. Check the structure\n3. Overall quality assessment"
        expected_template = '{\n  "language": LOGPROB_TRUE,\n  "structure": LOGPROB_TRUE,\n  "overall": LOGPROB_TRUE\n}'
        expected_json_guidance = '{\n  "language": true,\n  "structure": true,\n  "overall": true\n}'

        captured_config_template = None
        captured_config_eval_prompt = None

        # Define the side effect function to capture the config state
        async def capture_config_side_effect(*args, **kwargs):
            nonlocal captured_config_template, captured_config_eval_prompt
            captured_config_template = self.adapter.config.template
            captured_config_eval_prompt = self.adapter.config.evaluation_prompt
            return [create_dummy_output(0.9)]

        mock_rank_outputs.side_effect = capture_config_side_effect

        await self.adapter.arank(self.prompt, criteria=criteria)

        # Assert that rank_outputs was called
        mock_rank_outputs.assert_awaited_once_with(self.prompt)

        # Check the config state using captured values
        self.assertIsNotNone(captured_config_template, "Side effect did not capture template")
        self.assertEqual(captured_config_template, expected_template)
        self.assertIsNotNone(captured_config_eval_prompt, "Side effect did not capture eval prompt")
        self.assertIn(criteria, captured_config_eval_prompt)
        self.assertIn(expected_json_guidance, captured_config_eval_prompt)

    @patch('logprob_ranker.openrouter.OpenRouterAdapter.rank_outputs', new_callable=AsyncMock)
    async def test_criteria_invalid_item_format(self, mock_rank_outputs):
        """Test arank with criteria items not matching 'number. text'."""
        mock_rank_outputs.return_value = [create_dummy_output(0.9)]
        criteria = "- First item\n* Second item" # Does not use '1.', '2.', etc.

        await self.adapter.arank(self.prompt, criteria=criteria)
        
        # Config should remain unchanged as no valid items were parsed
        self.assertEqual(self.adapter.config.template, self.original_template)
        self.assertEqual(self.adapter.config.evaluation_prompt, self.original_eval_prompt)
        mock_rank_outputs.assert_awaited_once_with(self.prompt)

    @patch('logprob_ranker.openrouter.OpenRouterAdapter.rank_outputs', new_callable=AsyncMock)
    async def test_config_restoration(self, mock_rank_outputs):
        """Test that original config is restored after arank call with criteria."""
        mock_rank_outputs.return_value = [create_dummy_output(0.9)]
        criteria = "1. Test criterion"
        expected_template = '{\n  "test": LOGPROB_TRUE\n}'
        
        # Call arank, which modifies the config internally
        await self.adapter.arank(self.prompt, criteria=criteria)
        
        # BUT, the finally block should restore it
        self.assertEqual(self.adapter.config.template, self.original_template)
        self.assertEqual(self.adapter.config.evaluation_prompt, self.original_eval_prompt)


# Dummy RankedOutput for tests
def create_dummy_output(score, index=0, output_text="dummy"):
    return RankedOutput(output=output_text, logprob=score, index=index)


if __name__ == '__main__':
    unittest.main()