"""
Tests for the LiteLLMAdapter class.
"""

import asyncio
import json # Added import
import os
import unittest
from unittest.mock import patch, MagicMock, AsyncMock

from litellm.utils import ModelResponse # Added import

from logprob_ranker.logprob_ranker.ranker import LiteLLMAdapter, LogProbConfig, LogprobsNotAvailableError, LLMGenerationError

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
        self.litellm_patch = patch('logprob_ranker.logprob_ranker.ranker.litellm')
        self.mock_litellm = self.litellm_patch.start()
        
        # Setup acompletion mock to return a detailed ModelResponse mock
        self.mock_litellm.acompletion = AsyncMock()

        mock_model_response = MagicMock(spec=ModelResponse)
        mock_choice = MagicMock()
        mock_message = MagicMock()
        mock_message.content = "Mocked completion content from setUp"
        mock_message.role = "assistant"
        mock_choice.message = mock_message

        # Mock the logprobs structure for the default mock
        mock_logprobs_item1 = MagicMock()
        mock_logprobs_item1.token = "setup_token_1"  # Explicitly set as string
        mock_logprobs_item1.logprob = -0.123
        mock_logprobs_item2 = MagicMock()
        mock_logprobs_item2.token = "setup_token_2"  # Explicitly set as string
        mock_logprobs_item2.logprob = -0.456
        mock_logprobs_data = MagicMock()
        mock_logprobs_data.content = [mock_logprobs_item1, mock_logprobs_item2]
        mock_choice.logprobs = mock_logprobs_data

        mock_model_response.choices = [mock_choice]
        # Add other attributes that ModelResponse might have and are accessed (e.g., in model_dump_json)
        mock_model_response.id = "cmpl-mocksetUp"
        mock_model_response.model = "mock-model-setUp"
        mock_model_response.created = 1234567890
        mock_model_response.object = "chat.completion"
        mock_model_response.usage = MagicMock(prompt_tokens=10, completion_tokens=20, total_tokens=30)

        def mock_model_dump_json_func(indent=None):
            return json.dumps({
                "id": mock_model_response.id,
                "model": mock_model_response.model,
                "created": mock_model_response.created,
                "object": mock_model_response.object,
                "choices": [
                    {
                        "index": 0,
                        "finish_reason": "stop",
                        "message": {"role": mock_message.role, "content": mock_message.content},
                        "logprobs": {
                            "content": [
                                {
                                    "token": item.token,
                                    "logprob": item.logprob,
                                    "bytes": getattr(item, 'bytes', None),
                                    "top_logprobs": getattr(item, 'top_logprobs', [])
                                }
                                for item in mock_choice.logprobs.content
                            ]
                        } if hasattr(mock_choice, 'logprobs') and mock_choice.logprobs and hasattr(mock_choice.logprobs, 'content') and isinstance(mock_choice.logprobs.content, list) else None
                    }
                ],
                "usage": {
                    "prompt_tokens": mock_model_response.usage.prompt_tokens,
                    "completion_tokens": mock_model_response.usage.completion_tokens,
                    "total_tokens": mock_model_response.usage.total_tokens
                }
            }, indent=indent)
        mock_model_response.model_dump_json = mock_model_dump_json_func

        async def mock_default_acompletion(*args, **kwargs):
            # Allow model argument to be checked in tests if needed
            # print(f"DEBUG MOCK ASYNC: Called with model: {kwargs.get('model')}")
            return mock_model_response
        
        self.mock_litellm.acompletion.side_effect = mock_default_acompletion
        
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
            top_p=1.0,
            api_key="test-key",  # Verify api_key is passed
            logprobs=True
        )
        
        # Check result format
        self.assertEqual(result["content"], "Mocked completion content from setUp") # Updated expected content
        self.assertIn("average_token_logprob", result)
        self.assertIsInstance(result["average_token_logprob"], float)
        self.assertAlmostEqual(result["average_token_logprob"], -0.2895, places=4)
        
    def test_create_chat_completion(self):
        run_async_test(self.async_test_create_chat_completion)
    
    async def async_test_rank_outputs(self):
        """Test ranking outputs with LiteLLMAdapter, mocking generation and evaluation calls."""
        
        num_variants = self.config.num_variants # Should be 2 from setUp
        
        # --- Mock for Generation Calls ---
        def create_generation_response(content_text: str, avg_logprob: float = -0.25) -> ModelResponse:
            mock_gen_response = MagicMock(spec=ModelResponse)
            mock_gen_choice = MagicMock()
            mock_gen_message = MagicMock()
            mock_gen_message.content = content_text
            mock_gen_message.role = "assistant"
            mock_gen_choice.message = mock_gen_message
            
            # Dummy logprobs for generation (can be more specific if needed)
            lp_item1 = MagicMock()
            lp_item1.token = "token_gen_1"
            lp_item1.logprob = avg_logprob - 0.1 # e.g., -0.35
            lp_item2 = MagicMock()
            lp_item2.token = "token_gen_2"
            lp_item2.logprob = avg_logprob + 0.1 # e.g., -0.15
            # Ensure avg_logprob is the average of these two
            # (lp_item1.logprob + lp_item2.logprob) / 2 = avg_logprob
            # So, if lp_item1.logprob = X and lp_item2.logprob = Y, then (X+Y)/2 = avg_logprob
            # Let X = avg_logprob - delta, Y = avg_logprob + delta
            # For simplicity, let's assume two tokens for now for the mock
            mock_gen_logprobs_data = MagicMock()
            mock_gen_logprobs_data.content = [lp_item1, lp_item2]
            mock_gen_choice.logprobs = mock_gen_logprobs_data
            mock_gen_response.choices = [mock_gen_choice]
            mock_gen_response.model_dump_json = MagicMock(return_value=f'{{"content": "{content_text}"}}') # Simplified dump
            return mock_gen_response

        # --- Mock for Evaluation Calls ---
        # Evaluation template: '{"test": LOGPROB_TRUE}'
        # LOGPROB_TRUE will be replaced by actual boolean values in the real template processor
        # For the mock, we provide the final JSON string the LLM would return.
        def create_evaluation_response(eval_json_str: str, avg_logprob: float = -0.5) -> ModelResponse:
            mock_eval_response = MagicMock(spec=ModelResponse)
            mock_eval_choice = MagicMock()
            mock_eval_message = MagicMock()
            mock_eval_message.content = eval_json_str
            mock_eval_message.role = "assistant"
            mock_eval_choice.message = mock_eval_message
            
            # For Alpha (expected logprob -0.4 for the attribute 'test' being true)
            eval_logprobs_list_alpha = [
                MagicMock(token='{', logprob=-0.05, bytes=None, top_logprobs=[]),
                MagicMock(token='"test"', logprob=-0.05, bytes=None, top_logprobs=[]),
                MagicMock(token=':', logprob=-0.05, bytes=None, top_logprobs=[]),
                MagicMock(token=' true', logprob=-0.4, bytes=None, top_logprobs=[]), # This logprob is used for ranking
                MagicMock(token='}', logprob=-0.05, bytes=None, top_logprobs=[])
            ]
            avg_logprob_alpha = sum(lp.logprob for lp in eval_logprobs_list_alpha) / len(eval_logprobs_list_alpha)

            # For Beta (expected logprob -0.9 for the attribute 'test' being false, ranked lower)
            eval_logprobs_list_beta = [
                MagicMock(token='{', logprob=-0.05, bytes=None, top_logprobs=[]),
                MagicMock(token='"test"', logprob=-0.05, bytes=None, top_logprobs=[]),
                MagicMock(token=':', logprob=-0.05, bytes=None, top_logprobs=[]),
                MagicMock(token=' false', logprob=-0.9, bytes=None, top_logprobs=[]), # This logprob is used for ranking
                MagicMock(token='}', logprob=-0.05, bytes=None, top_logprobs=[])
            ]
            avg_logprob_beta = sum(lp.logprob for lp in eval_logprobs_list_beta) / len(eval_logprobs_list_beta)

            mock_eval_logprobs_data = MagicMock()
            if eval_json_str == '{"test": true}':
                mock_eval_logprobs_data.content = eval_logprobs_list_alpha
            elif eval_json_str == '{"test": false}':
                mock_eval_logprobs_data.content = eval_logprobs_list_beta
            else:
                raise ValueError("Unexpected eval_json_str")
            mock_eval_choice.logprobs = mock_eval_logprobs_data
            mock_eval_response.choices = [mock_eval_choice]
            mock_eval_response.model_dump_json = MagicMock(return_value=f'{{"evaluation_content": "{eval_json_str}"}}') # Simplified dump
            return mock_eval_response

        # Create a list of side effect responses
        # For num_variants = 2: [Gen1, Eval1, Gen2, Eval2]
        side_effect_list = []
        # Variant 1: Higher logprob, 'test': true
        side_effect_list.append(create_generation_response("Generated Output Alpha", avg_logprob=-0.1))
        side_effect_list.append(create_evaluation_response('{"test": true}', avg_logprob=-0.4))
        # Variant 2: Lower logprob, 'test': false
        side_effect_list.append(create_generation_response("Generated Output Beta", avg_logprob=-0.8))
        side_effect_list.append(create_evaluation_response('{"test": false}', avg_logprob=-0.9))

        self.mock_litellm.acompletion.side_effect = side_effect_list
        
        # Call rank_outputs
        results = await self.adapter.rank_outputs("Test prompt for ranking")
        
        # Check results
        self.assertEqual(len(results), num_variants)
        self.assertEqual(self.mock_litellm.acompletion.call_count, num_variants * 2)

        # Results are sorted by the primary attribute_score (descending).
        # RankedOutput.logprob is the average log probability from the evaluation LLM's response.
        # Variant Alpha (score 1.0): eval_avg_logprob = -0.4
        # Variant Beta (score 0.0): eval_avg_logprob = -0.9
        # Variant Beta: evaluation {'test': false} -> attribute_score 0.0 -> logprob 0.0
        self.assertEqual(results[0].output, "Generated Output Alpha")
        self.assertAlmostEqual(results[0].logprob, -0.4, places=4) # Avg logprob from eval_response for Alpha
        self.assertEqual(results[0].attribute_scores[0].name, "test")
        self.assertAlmostEqual(results[0].attribute_scores[0].score, -0.4, places=4) # Logprob of ' true' token

        self.assertEqual(results[1].output, "Generated Output Beta")
        self.assertAlmostEqual(results[1].logprob, -0.9, places=4) # Avg logprob from eval_response for Beta
        self.assertEqual(results[1].attribute_scores[0].name, "test")
        self.assertAlmostEqual(results[1].attribute_scores[0].score, -0.9, places=4) # Logprob of ' false' token

    def test_rank_outputs(self):
        run_async_test(self.async_test_rank_outputs)
    
    async def async_test_anthropic_integration(self):
        """Test a specific integration path, e.g., for Anthropic, ensuring mocks are isolated."""
        # Setup a mock response specific to this test
        mock_anthropic_response = MagicMock(spec=ModelResponse)
        mock_choice = MagicMock()
        mock_message = MagicMock()
        mock_message.content = "Anthropic completion"
        mock_message.role = "assistant"
        mock_choice.message = mock_message
        
        # Create a dummy logprobs structure for this mock response
        lp_item = MagicMock()
        lp_item.token = "AnthropicToken" # Add token attribute
        lp_item.logprob = -0.1234
        mock_logprobs_data = MagicMock()
        mock_logprobs_data.content = [lp_item]
        mock_choice.logprobs = mock_logprobs_data
        
        mock_anthropic_response.choices = [mock_choice]
        mock_anthropic_response.model_dump_json = MagicMock(return_value='{"content": "Anthropic completion"}')

        # Set side_effect on the class-level mock for litellm.acompletion
        self.mock_litellm.acompletion.side_effect = [mock_anthropic_response]

        # Assuming the adapter's config might be used to determine model/provider
        # For this test, we directly call with a model name that implies Anthropic
        result = await self.adapter._create_chat_completion(
            model="claude-2", # Example model name
            messages=[{"role": "user", "content": "Hello Anthropic"}],
            temperature=0.7,
            max_tokens=50,
            top_p=1.0
        )
        
        self.assertEqual(result["content"], "Anthropic completion")
        self.assertIn("average_token_logprob", result)
        self.assertAlmostEqual(result["average_token_logprob"], -0.1234, places=4)
        self.mock_litellm.acompletion.assert_called_once()

    def test_anthropic_integration(self):
        run_async_test(self.async_test_anthropic_integration)

    async def async_test_real_logprobs_output(self):
        """Temporarily make a real API call to inspect logprobs output."""
        print("\nDEBUG_TEST: Running async_test_real_logprobs_output to get real logprobs structure...")
        
        # DEBUG: Check environment variable directly
        openrouter_key_env = os.getenv("OPENROUTER_API_KEY")
        if openrouter_key_env:
            # Print a redacted version for security
            redacted_key = f"{openrouter_key_env[:5]}...{openrouter_key_env[-5:]}" if len(openrouter_key_env) > 10 else "Key too short to redact fully"
            print(f"DEBUG_TEST: Found OPENROUTER_API_KEY in env: '{redacted_key}'")
        else:
            print("DEBUG_TEST: OPENROUTER_API_KEY NOT FOUND in environment!")
            # For more aggressive debugging, one could print all env vars:
            # print(f"DEBUG_TEST: All environment variables: {os.environ}")

        original_side_effect = self.mock_litellm.acompletion.side_effect
        self.litellm_patch.stop()  # Stop mocking litellm for this test
        
        # Ensure the real litellm is available if it was globally patched elsewhere in tests
        # (though self._patch should handle it for ranker.litellm)

        real_adapter_config = LogProbConfig(
            num_variants=1, # Keep it simple for this test
            thread_count=1,
            template='{"test": LOGPROB_TRUE}' # Template doesn't matter much here
        )
        
        # Use a model known to support logprobs and is inexpensive
        # API key should be picked up from environment by LiteLLM
        real_adapter = LiteLLMAdapter(
            model="openrouter/openai/gpt-3.5-turbo", 
            config=real_adapter_config
        )

        messages = [
            {"role": "user", "content": "Translate 'hello' to French."}
        ]
        
        result = None
        try:
            print("DEBUG_TEST: About to call real _create_chat_completion...")
            result = await real_adapter._create_chat_completion(
                messages=messages,
                temperature=0.1,
                max_tokens=50,
                top_p=1.0
            )
            print(f"DEBUG_TEST: Real call result content: {result['content'] if result else 'No result'}")
            self.assertIsNotNone(result)
            self.assertIn("content", result)
            self.assertIn("raw_token_logprobs", result)
            self.assertTrue(len(result['content']) > 0)
            # For OpenAI gpt-3.5-turbo, we expect logprobs to be available
            self.assertIsInstance(result["raw_token_logprobs"], list)
            if result["raw_token_logprobs"]:
                first_logprob_item = result["raw_token_logprobs"][0]
                self.assertIsInstance(first_logprob_item, tuple)
                self.assertEqual(len(first_logprob_item), 2)
                self.assertIsInstance(first_logprob_item[0], str) # token
                self.assertIsInstance(first_logprob_item[1], float) # logprob
            print(f"DEBUG_TEST: Real call raw_token_logprobs: {result['raw_token_logprobs'][:5]}...") # Print first 5
        except Exception as e:
            print(f"DEBUG_TEST: Error during real API call: {e}")
            self.fail(f"Real API call failed: {e}")
        finally:
            self.mock_litellm = self.litellm_patch.start() # Restore mock
            self.mock_litellm.acompletion.side_effect = original_side_effect # Restore side effect for other tests

        self.assertIsNotNone(result, "Result from real API call should not be None")
        # The primary goal is the DEBUG_RANKER print from _execute_litellm_completion

    def test_real_logprobs_output(self):
        run_async_test(self.async_test_real_logprobs_output)

    # --- Tests for LogprobsNotAvailableError ---
    async def async_test_missing_logprobs_attribute_mocked(self):
        """Test LogprobsNotAvailableError when 'logprobs' attribute is missing from choice."""
        mock_response = MagicMock(spec=ModelResponse)
        mock_choice = MagicMock()
        mock_message = MagicMock(content="Test content", role="assistant")
        mock_choice.message = mock_message
        mock_choice.logprobs = None # Simulate missing logprobs attribute directly
        mock_response.choices = [mock_choice]
        self.mock_litellm.acompletion.side_effect = [mock_response]

        with self.assertRaises(LLMGenerationError) as cm:
            await self.adapter._create_chat_completion(
                messages=[{"role": "user", "content": "Hello"}], temperature=0.7, max_tokens=10, top_p=1.0
            )
        self.assertIsInstance(cm.exception.__cause__, LogprobsNotAvailableError)
        self.assertIn("No 'logprobs' attribute on choice object or it is None", str(cm.exception.__cause__))

    def test_missing_logprobs_attribute_mocked(self):
        run_async_test(self.async_test_missing_logprobs_attribute_mocked)

    async def async_test_empty_logprobs_content_mocked(self):
        """Test LogprobsNotAvailableError when 'logprobs.content' is empty."""
        mock_response = MagicMock(spec=ModelResponse)
        mock_choice = MagicMock()
        mock_message = MagicMock(content="Test content", role="assistant")
        mock_choice.message = mock_message
        mock_logprobs_data = MagicMock()
        mock_logprobs_data.content = [] # Empty logprobs content
        mock_choice.logprobs = mock_logprobs_data
        mock_response.choices = [mock_choice]
        self.mock_litellm.acompletion.side_effect = [mock_response]

        with self.assertRaises(LLMGenerationError) as cm:
            await self.adapter._create_chat_completion(
                messages=[{"role": "user", "content": "Hello"}], temperature=0.7, max_tokens=10, top_p=1.0
            )
        self.assertIsInstance(cm.exception.__cause__, LogprobsNotAvailableError)
        self.assertIn("'logprobs.content' is an empty list.", str(cm.exception.__cause__))

    def test_empty_logprobs_content_mocked(self):
        run_async_test(self.async_test_empty_logprobs_content_mocked)

    async def async_test_malformed_logprobs_item_mocked(self):
        """Test LogprobsNotAvailableError when a logprob item is malformed."""
        mock_response = MagicMock(spec=ModelResponse)
        mock_choice = MagicMock()
        mock_message = MagicMock(content="Test content", role="assistant")
        mock_choice.message = mock_message
        
        malformed_logprob_item = MagicMock()
        # Ensure it doesn't have the 'logprob' attribute or it's not a number
        if hasattr(malformed_logprob_item, 'logprob'):
            delattr(malformed_logprob_item, 'logprob')
        # To be certain, also ensure no 'token' attribute if that's part of malformation test
        if hasattr(malformed_logprob_item, 'token'):
             delattr(malformed_logprob_item, 'token')
            
        mock_logprobs_data = MagicMock()
        # Ensure content is a list of these malformed items
        mock_logprobs_data.content = [malformed_logprob_item, MagicMock()] # Add another malformed mock
        mock_choice.logprobs = mock_logprobs_data
        mock_response.choices = [mock_choice]
        self.mock_litellm.acompletion.side_effect = [mock_response]

        with self.assertRaises(LLMGenerationError) as cm:
            await self.adapter._create_chat_completion(
                messages=[{"role": "user", "content": "Hello"}], temperature=0.7, max_tokens=10, top_p=1.0
            )
        self.assertIsInstance(cm.exception.__cause__, LogprobsNotAvailableError)
        self.assertIn("All logprob items in 'logprobs.content' were malformed.", str(cm.exception.__cause__))
            
    def test_malformed_logprobs_item_mocked(self):
        run_async_test(self.async_test_malformed_logprobs_item_mocked)

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
        run_async_test(adapter_test.async_test_real_logprobs_output) # Run the new test
    finally:
        adapter_test.tearDown()
    
    # Run the regular tests
    unittest.main()