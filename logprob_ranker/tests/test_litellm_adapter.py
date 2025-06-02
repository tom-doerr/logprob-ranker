"""
Tests for the LiteLLMAdapter class.
"""

import asyncio
import json # Added import
import os
import unittest
from unittest.mock import patch, MagicMock, AsyncMock

import aiohttp # Added for explicit session management
from litellm.types.utils import ModelResponse, Choices # LiteLLM's top-level types
from openai.types.chat.chat_completion import ChoiceLogprobs as OpenAIChoiceLogprobs # For the 'logprobs' object on a choice
from openai.types.chat import ChatCompletionTokenLogprob # For individual items in logprobs.content

from logprob_ranker.logprob_ranker.ranker import (
    ChatCompletionParams, # Added import
    LiteLLMAdapter,
    LogProbConfig,
    LogprobsNotAvailableError,
    MalformedLogprobsError, # Added import
    LLMGenerationError,
    RankedOutput # Added import
)

# Mock response for Anthropic integration test
_mock_anthropic_lp_item1 = MagicMock(spec=ChatCompletionTokenLogprob)
_mock_anthropic_lp_item1.token = "anthropic_token_1"
_mock_anthropic_lp_item1.logprob = -0.1000
_mock_anthropic_lp_item2 = MagicMock(spec=ChatCompletionTokenLogprob)
_mock_anthropic_lp_item2.token = "anthropic_token_2"
_mock_anthropic_lp_item2.logprob = -0.1468 # Avg with -0.1000 is -0.1234

_mock_anthropic_logprobs_data = MagicMock(spec=OpenAIChoiceLogprobs)
_mock_anthropic_logprobs_data.content = [_mock_anthropic_lp_item1, _mock_anthropic_lp_item2]

_mock_anthropic_message = MagicMock()
_mock_anthropic_message.content = "Anthropic completion"
_mock_anthropic_message.role = "assistant"

_mock_anthropic_choice = MagicMock(spec=Choices)
_mock_anthropic_choice.message = _mock_anthropic_message
_mock_anthropic_choice.logprobs = _mock_anthropic_logprobs_data

mock_anthropic_response = MagicMock(spec=ModelResponse)
mock_anthropic_response.choices = [_mock_anthropic_choice]
mock_anthropic_response.id = "cmpl-mock-anthropic"
mock_anthropic_response.model = "claude-mock"

# Basic model_dump_json for the mock, in case any part of the adapter tries to use it.
def _mock_anthropic_dump_json(indent=None):
    choice_logprobs_content = []
    if hasattr(_mock_anthropic_choice, 'logprobs') and _mock_anthropic_choice.logprobs and \
       hasattr(_mock_anthropic_choice.logprobs, 'content') and \
       isinstance(_mock_anthropic_choice.logprobs.content, list):
        for item in _mock_anthropic_choice.logprobs.content:
            logprob_item_dict = {
                "token": getattr(item, 'token', None),
                "logprob": getattr(item, 'logprob', None)
            }
            choice_logprobs_content.append(logprob_item_dict)

    return json.dumps({
        "id": mock_anthropic_response.id,
        "model": mock_anthropic_response.model,
        "created": 1234567890, # Dummy value
        "object": "chat.completion", # Dummy value
        "choices": [
            {
                "index": 0,
                "finish_reason": "stop",
                "message": {"role": _mock_anthropic_message.role, "content": _mock_anthropic_message.content},
                "logprobs": {"content": choice_logprobs_content} if choice_logprobs_content else None
            }
        ],
        "usage": { # Dummy usage
            "prompt_tokens": 5,
            "completion_tokens": 5,
            "total_tokens": 10
        }
    }, indent=indent)
mock_anthropic_response.model_dump_json = _mock_anthropic_dump_json

class TestLiteLLMAdapter(unittest.TestCase):
    """Test the LiteLLMAdapter class."""

    def setUp(self):
        """Set up test fixtures."""
        self.config = LogProbConfig(
            num_variants=2,
            thread_count=1,
            template='{"test": LOGPROB_TRUE}',
            logprobs=True # Explicitly set for tests expecting logprobs
        )

        self.litellm_patch = patch('logprob_ranker.logprob_ranker.ranker.litellm')
        self.mock_litellm = self.litellm_patch.start()

        # Initialize the adapter instance for tests
        self.adapter = LiteLLMAdapter(config=self.config, model="mock_model_in_setup_not_real")

        self.mock_litellm.acompletion = AsyncMock()

        mock_model_response = MagicMock(spec=ModelResponse)
        mock_choice = MagicMock(spec=Choices) # Added spec
        mock_message = MagicMock()
        mock_message.content = "Mocked completion content from setUp"
        mock_message.role = "assistant"
        mock_choice.message = mock_message

        mock_logprobs_item1 = MagicMock(spec=ChatCompletionTokenLogprob) # Added spec
        mock_logprobs_item1.token = "setup_token_1"
        mock_logprobs_item1.logprob = -0.123
        mock_logprobs_item2 = MagicMock(spec=ChatCompletionTokenLogprob) # Added spec
        mock_logprobs_item2.token = "setup_token_2"
        mock_logprobs_item2.logprob = -0.456
        mock_logprobs_data = MagicMock(spec=OpenAIChoiceLogprobs) # Added spec
        mock_logprobs_data.content = [mock_logprobs_item1, mock_logprobs_item2]
        mock_choice.logprobs = mock_logprobs_data

        mock_model_response.choices = [mock_choice]
        mock_model_response.id = "cmpl-mocksetUp"
        mock_model_response.model = "mock-model-setUp"
        mock_model_response.created = 1234567890
        mock_model_response.object = "chat.completion"
        mock_model_response.usage = MagicMock(prompt_tokens=10, completion_tokens=20, total_tokens=30)

        def mock_model_dump_json_func(indent=None):
            choice_logprobs_content = []
            if hasattr(mock_choice, 'logprobs') and mock_choice.logprobs and \
               hasattr(mock_choice.logprobs, 'content') and \
               isinstance(mock_choice.logprobs.content, list):
                for item in mock_choice.logprobs.content:
                    logprob_item_dict = {
                        "token": getattr(item, 'token', None),
                        "logprob": getattr(item, 'logprob', None)
                    }
                    if hasattr(item, 'bytes') and getattr(item, 'bytes') is not None:
                        logprob_item_dict["bytes"] = getattr(item, 'bytes')
                    if hasattr(item, 'top_logprobs') and getattr(item, 'top_logprobs') is not None:
                        logprob_item_dict["top_logprobs"] = getattr(item, 'top_logprobs')
                    choice_logprobs_content.append(logprob_item_dict)

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
                        "logprobs": {"content": choice_logprobs_content} if choice_logprobs_content else None
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
        # The following adapter re-initialization was likely an error and is removed.
        # It overwrote the adapter set up earlier and caused test_initialization to fail.
        # self.adapter = LiteLLMAdapter(
        #     model="gpt-3.5-turbo",
        #     api_key="test-key",
        #     config=self.config
        # )
    
    def tearDown(self):
        """Tear down test fixtures."""
        self.litellm_patch.stop()
    
    def test_initialization(self):
        """Test initialization of LiteLLMAdapter."""
        self.assertEqual(self.adapter.model, "mock_model_in_setup_not_real")
        self.assertIsNone(self.adapter.api_key) # api_key is not set in setUp's adapter init
        self.assertEqual(self.adapter.config, self.config)
    
    async def async_test_create_chat_completion(self):
        """Test the _create_chat_completion method."""
        messages = [
            {"role": "system", "content": "Test system"},
            {"role": "user", "content": "Test user"}
        ]
        
        params = ChatCompletionParams(
            messages=messages,
            temperature=0.7,
            max_tokens=100,
            top_p=1.0,
            # model_override, request_logprobs_override, request_top_logprobs_override 
            # can be None if not specifically testing them here, adapter will use defaults or config.
            # additional_provider_kwargs can be an empty dict if not needed.
            additional_provider_kwargs={}
        )
        result = await self.adapter._create_chat_completion(params)
        
        self.mock_litellm.acompletion.assert_called_once_with(
            model="mock_model_in_setup_not_real", # From adapter initialized in setUp
            messages=messages,
            temperature=0.7,
            max_tokens=100,
            top_p=1.0,
            # api_key is not set on the adapter in setUp, so not passed here
            logprobs=True, # From self.config.logprobs = True in setUp
            top_logprobs=5 # Default fallback in _execute_litellm_completion
        )
        
        self.assertEqual(result["content"], "Mocked completion content from setUp")
        self.assertIn("average_token_logprob", result)
        self.assertIsInstance(result["average_token_logprob"], float)
        self.assertAlmostEqual(result["average_token_logprob"], -0.2895, places=4)
        
    def test_create_chat_completion(self):
        run_async_test(self.async_test_create_chat_completion)
    
    async def async_test_rank_outputs(self):
        """Test ranking outputs with LiteLLMAdapter, mocking generation and evaluation calls."""
        num_variants = self.config.num_variants
        
        def create_generation_response(content_text: str, avg_logprob: float = -0.25) -> ModelResponse:
            mock_gen_response = MagicMock(spec=ModelResponse)
            mock_gen_choice = MagicMock(spec=Choices)
            mock_gen_message = MagicMock()
            mock_gen_message.content = content_text
            mock_gen_message.role = "assistant"
            mock_gen_choice.message = mock_gen_message
            
            lp_item1 = MagicMock(spec=ChatCompletionTokenLogprob)
            lp_item1.token = "token_gen_1"
            lp_item1.logprob = avg_logprob - 0.1
            lp_item2 = MagicMock(spec=ChatCompletionTokenLogprob)
            lp_item2.token = "token_gen_2"
            lp_item2.logprob = avg_logprob + 0.1
            mock_gen_logprobs_data = MagicMock(spec=OpenAIChoiceLogprobs)
            mock_gen_logprobs_data.content = [lp_item1, lp_item2]
            mock_gen_choice.logprobs = mock_gen_logprobs_data
            mock_gen_response.choices = [mock_gen_choice]
            mock_gen_response.model_dump_json = MagicMock(return_value=json.dumps({"content": content_text}))
            return mock_gen_response

        def create_evaluation_response(eval_json_str: str, avg_logprob: float = -0.5) -> ModelResponse:
            mock_eval_response = MagicMock(spec=ModelResponse)
            mock_eval_choice = MagicMock(spec=Choices)
            mock_eval_message = MagicMock()
            mock_eval_message.content = eval_json_str
            mock_eval_message.role = "assistant"
            mock_eval_choice.message = mock_eval_message
            
            eval_logprobs_list = []
            if eval_json_str == '{"test": true}':
                eval_logprobs_list = [
                    MagicMock(spec=ChatCompletionTokenLogprob, token='{', logprob=-0.05, bytes=None, top_logprobs=[]),
                    MagicMock(spec=ChatCompletionTokenLogprob, token='"test"', logprob=-0.05, bytes=None, top_logprobs=[]),
                    MagicMock(spec=ChatCompletionTokenLogprob, token=':', logprob=-0.05, bytes=None, top_logprobs=[]),
                    MagicMock(spec=ChatCompletionTokenLogprob, token=' true', logprob=-0.4, bytes=None, top_logprobs=[]),
                    MagicMock(spec=ChatCompletionTokenLogprob, token='}', logprob=-0.05, bytes=None, top_logprobs=[])
                ]
            elif eval_json_str == '{"test": false}':
                eval_logprobs_list = [
                    MagicMock(spec=ChatCompletionTokenLogprob, token='{', logprob=-0.05, bytes=None, top_logprobs=[]),
                    MagicMock(spec=ChatCompletionTokenLogprob, token='"test"', logprob=-0.05, bytes=None, top_logprobs=[]),
                    MagicMock(spec=ChatCompletionTokenLogprob, token=':', logprob=-0.05, bytes=None, top_logprobs=[]),
                    MagicMock(spec=ChatCompletionTokenLogprob, token=' false', logprob=-0.9, bytes=None, top_logprobs=[]),
                    MagicMock(spec=ChatCompletionTokenLogprob, token='}', logprob=-0.05, bytes=None, top_logprobs=[])
                ]
            else:
                # Fallback for unexpected eval_json_str, create some generic logprobs
                eval_logprobs_list = [MagicMock(spec=ChatCompletionTokenLogprob, token='generic', logprob=avg_logprob, bytes=None, top_logprobs=[])]

            mock_eval_logprobs_data = MagicMock(spec=OpenAIChoiceLogprobs)
            mock_eval_logprobs_data.content = eval_logprobs_list
            mock_eval_choice.logprobs = mock_eval_logprobs_data
            mock_eval_response.choices = [mock_eval_choice]
            mock_eval_response.model_dump_json = MagicMock(return_value=json.dumps({"evaluation_content": eval_json_str}))
            return mock_eval_response

        side_effect_list = [
            create_generation_response("Generated Output Alpha", avg_logprob=-0.1),
            create_evaluation_response('{"test": true}'), # Target logprob -0.4 for ' true'
            create_generation_response("Generated Output Beta", avg_logprob=-0.8),
            create_evaluation_response('{"test": false}') # Target logprob -0.9 for ' false'
        ]

        self.mock_litellm.acompletion.side_effect = side_effect_list
        
        results = await self.adapter.rank_outputs("Test prompt for ranking")
            
        self.assertEqual(len(results), num_variants)
        self.assertEqual(self.mock_litellm.acompletion.call_count, num_variants * 2)

        self.assertEqual(results[0].output, "Generated Output Alpha")
        self.assertAlmostEqual(results[0].logprob, -0.4, places=4) # From '{"test": true}' evaluation, logprob of ' true' token
        self.assertEqual(results[0].attribute_scores[0].name, "test")
        self.assertAlmostEqual(results[0].attribute_scores[0].score, -0.4, places=4) # From create_evaluation_response for Alpha ('{"test": true}')
        
        self.assertEqual(results[1].output, "Generated Output Beta")
        self.assertAlmostEqual(results[1].logprob, -0.9, places=4) # From '{"test": false}' evaluation, logprob of ' false' token
        self.assertEqual(results[1].attribute_scores[0].name, "test")
        self.assertAlmostEqual(results[1].attribute_scores[0].score, -0.9, places=4) # From create_evaluation_response for Beta ('{"test": false}')

    def test_rank_outputs(self):
        run_async_test(self.async_test_rank_outputs)
    
    async def async_test_anthropic_integration(self):
        # This test verifies integration with an Anthropic-like model response.
        # It uses a predefined mock response (mock_anthropic_response) which is
        # defined at the module level.
        self.mock_litellm.acompletion.reset_mock()
        self.mock_litellm.acompletion.side_effect = [mock_anthropic_response]

        params = ChatCompletionParams(
            model_override="claude-2", # Example model name for Anthropic
            messages=[{"role": "user", "content": "Hello Anthropic"}],
            temperature=0.7,
            max_tokens=50,
            top_p=1.0,
            additional_provider_kwargs={}
        )
        result = await self.adapter._create_chat_completion(params)
        
        self.assertEqual(result["content"], "Anthropic completion")
        self.assertIn("average_token_logprob", result)
        self.assertIsInstance(result["average_token_logprob"], float)
        self.assertAlmostEqual(result["average_token_logprob"], -0.1234, places=4)
        
        # Verify litellm.acompletion was called with expected parameters.
        # The adapter's default config has require_logprobs=True.
        self.mock_litellm.acompletion.assert_called_once_with(
            model="claude-2",
            messages=[{"role": "user", "content": "Hello Anthropic"}],
            temperature=0.7,
            max_tokens=50,
            top_p=1.0,
            # stream=False, # Default for litellm.acompletion, not explicitly passed by adapter here
            logprobs=True, # Because adapter.config.logprobs is now True in setUp
            top_logprobs=5 # Default fallback in _execute_litellm_completion when config.top_logprobs is None
        )

    def test_anthropic_integration(self):
        run_async_test(self.async_test_anthropic_integration)

        
    async def async_test_real_logprobs_output(self):
        """Test real logprobs output with a live API call, managing aiohttp.ClientSession."""
        openrouter_key_env = os.getenv("OPENROUTER_API_KEY")
        if not openrouter_key_env:
            self.skipTest("OPENROUTER_API_KEY not set, skipping real API call test.")

        # Redact key for printing
        redacted_key = f"{openrouter_key_env[:5]}...{openrouter_key_env[-5:]}" if len(openrouter_key_env) > 10 else "Key too short"
        print(f"DEBUG_TEST: Using OPENROUTER_API_KEY: '{redacted_key}' for model openrouter/google/gemini-flash-1.5")

        original_litellm_acompletion_side_effect = self.mock_litellm.acompletion.side_effect
        self.litellm_patch.stop()  # Stop mocking litellm.acompletion

        real_adapter_config = LogProbConfig(
            num_variants=1, # Keep it simple for a real call
            thread_count=1,
            logprobs=True, # Re-enable logprobs for initial generation for this test
            top_logprobs=5, # Request top_logprobs for initial generation
            # Using a simple template that should work with most models
            template='Output: {"is_good_output": LOGPROB_TRUE, "is_bad_output": LOGPROB_FALSE}'
        )

        async with aiohttp.ClientSession() as session:
            real_adapter = LiteLLMAdapter(
                model="openrouter/openai/gpt-3.5-turbo", # Switch to a model with known good logprobs support
                api_key=openrouter_key_env,
                config=real_adapter_config,
                aiohttp_session=session # Pass the explicitly managed session
            )
            try:
                print("DEBUG_TEST: Attempting real API call to openrouter/google/gemini-flash-1.5...")
                response = await real_adapter.rank_outputs(
                    prompt="Generate a short, positive sentence about programming."
                )
                print(f"DEBUG_TEST: Real API call response: {response}")
                
                self.assertIsInstance(response, list)
                self.assertEqual(len(response), 1) # Expect exactly one due to num_variants=1
                ranked_output_obj = response[0]
                self.assertIsInstance(ranked_output_obj, RankedOutput)
                self.assertIsNotNone(ranked_output_obj.output)
                self.assertTrue(len(ranked_output_obj.output) > 0, "Generated output should not be empty.")
                self.assertIsInstance(ranked_output_obj.logprob, float, "logprob (average_token_logprob or evaluation score) should be a float.")
                # We can't assert a specific logprob value for a real call, but it should be present.
                self.assertIsNotNone(ranked_output_obj.logprob, "logprob (average_token_logprob or evaluation score) should not be None.")
                
                # Check attribute_scores structure based on the template
                self.assertIsInstance(ranked_output_obj.attribute_scores, list)
                self.assertEqual(len(ranked_output_obj.attribute_scores), 2, "Expected two attribute scores based on template.")
                
                attr_names = {attr.name for attr in ranked_output_obj.attribute_scores}
                self.assertIn("is_good_output", attr_names)
                self.assertIn("is_bad_output", attr_names)
                
                for attr_score in ranked_output_obj.attribute_scores:
                    self.assertIsInstance(attr_score.name, str)
                    self.assertIsInstance(attr_score.score, float)
                    self.assertNotEqual(attr_score.score, 0.0, f"Attribute '{attr_score.name}' score should not be 0.0 if token was found.")
                    self.assertNotIn("not found", attr_score.explanation.lower(), f"Attribute '{attr_score.name}' explanation indicates token was not found: {attr_score.explanation}")

                # if ranked_output_obj.raw_generation_response:
                #     print(f"DEBUG_TEST: Raw generation response from real call: {ranked_output_obj.raw_generation_response}")
                # if ranked_output_obj.raw_evaluation_response:
                #     print(f"DEBUG_TEST: Raw evaluation response from real call: {ranked_output_obj.raw_evaluation_response}")


            except LLMGenerationError as e:
                print(f"DEBUG_TEST: Real API call failed with LLMGenerationError: {e}")
                if e.__cause__:
                    print(f"DEBUG_TEST: Underlying cause: {e.__cause__}")
                # import traceback
                # traceback.print_exc()
                self.fail(f"Real API call failed with LLMGenerationError: {e} (Cause: {e.__cause__})")
            except Exception as e:
                print(f"DEBUG_TEST: Real API call failed with unexpected Exception: {e}")
                # import traceback
                # traceback.print_exc()
                self.fail(f"Real API call failed with unexpected Exception: {e}")
            finally:
                self.litellm_patch.start() # Restart mocking for other tests
                self.mock_litellm.acompletion.side_effect = original_litellm_acompletion_side_effect

    def test_real_logprobs_output(self):
        run_async_test(self.async_test_real_logprobs_output)

    # --- Tests for LogprobsNotAvailableError ---
    async def async_test_missing_logprobs_attribute_mocked(self):
        """Test LogprobsNotAvailableError when 'logprobs' attribute is missing from choice."""
        mock_response = MagicMock(spec=ModelResponse)
        mock_choice = MagicMock(spec=Choices) # Use correct spec
        mock_message = MagicMock(content="Test content", role="assistant")
        mock_choice.message = mock_message
        # Simulate 'logprobs' attribute being entirely absent or None
        if hasattr(mock_choice, 'logprobs'):
            delattr(mock_choice, 'logprobs') 
        
        mock_response.choices = [mock_choice]
        self.mock_litellm.acompletion.side_effect = [mock_response]

        with self.assertRaises(LogprobsNotAvailableError) as cm:
            params = ChatCompletionParams(
                messages=[{"role": "user", "content": "Hello"}], 
                temperature=0.7, 
                max_tokens=10, 
                top_p=1.0,
                additional_provider_kwargs={}
            )
            await self.adapter._create_chat_completion(params)
        self.assertIn("No 'logprobs' attribute on choice object or it is None.", str(cm.exception))

    def test_missing_logprobs_attribute_mocked(self):
        run_async_test(self.async_test_missing_logprobs_attribute_mocked)

    async def async_test_empty_logprobs_content_mocked(self):
        """Test LogprobsNotAvailableError when 'logprobs.content' is empty or None."""
        # Test case 1: logprobs.content is an empty list
        mock_response_empty_list = MagicMock(spec=ModelResponse)
        mock_choice_empty_list = MagicMock(spec=Choices)
        mock_message_empty_list = MagicMock(content="Test content", role="assistant")
        mock_choice_empty_list.message = mock_message_empty_list
        mock_logprobs_data_empty_list = MagicMock(spec=OpenAIChoiceLogprobs)
        mock_logprobs_data_empty_list.content = [] # Empty logprobs content
        mock_choice_empty_list.logprobs = mock_logprobs_data_empty_list
        mock_response_empty_list.choices = [mock_choice_empty_list]

        self.mock_litellm.acompletion.side_effect = [mock_response_empty_list]
        with self.assertRaises(LogprobsNotAvailableError) as cm_empty:
            params = ChatCompletionParams(
                messages=[{"role": "user", "content": "Hello"}], 
                temperature=0.7, 
                max_tokens=10, 
                top_p=1.0,
                additional_provider_kwargs={}
            )
            await self.adapter._create_chat_completion(params)
        self.assertIn("'logprobs.content' is an empty list", str(cm_empty.exception))

        # Reset side_effect for the next case
        self.mock_litellm.acompletion.reset_mock() 

        # Test case 2: logprobs.content is None
        mock_response_none_content = MagicMock(spec=ModelResponse)
        mock_choice_none_content = MagicMock(spec=Choices)
        mock_message_none_content = MagicMock(content="Test content", role="assistant")
        mock_choice_none_content.message = mock_message_none_content
        mock_logprobs_data_none_content = MagicMock(spec=OpenAIChoiceLogprobs)
        mock_logprobs_data_none_content.content = None # Logprobs content is None
        mock_choice_none_content.logprobs = mock_logprobs_data_none_content
        mock_response_none_content.choices = [mock_choice_none_content]

        self.mock_litellm.acompletion.side_effect = [mock_response_none_content]
        with self.assertRaises(LogprobsNotAvailableError) as cm_none:
            params = ChatCompletionParams(
                messages=[{"role": "user", "content": "Hello"}], 
                temperature=0.7, 
                max_tokens=10, 
                top_p=1.0,
                additional_provider_kwargs={}
            )
            await self.adapter._create_chat_completion(params)
        self.assertIn("'logprobs.content' is missing or not a list.", str(cm_none.exception))
    def test_empty_logprobs_content_mocked(self):
        run_async_test(self.async_test_empty_logprobs_content_mocked)

    # --- Tests for MalformedLogprobsError ---
    async def async_test_malformed_logprobs_item_mocked(self):
        """Test MalformedLogprobsError when a logprob item has a non-numeric logprob value or is None."""
        # Test case 1: logprob is not a number
        mock_response_str = MagicMock(spec=ModelResponse)
        mock_choice_str = MagicMock(spec=Choices)
        mock_message_str = MagicMock(content="Test content", role="assistant")
        mock_choice_str.message = mock_message_str
        
        malformed_logprob_item_str = MagicMock(spec=ChatCompletionTokenLogprob)
        malformed_logprob_item_str.token = "bad_token_str"
        malformed_logprob_item_str.logprob = "not-a-number" 
        
        valid_logprob_item = MagicMock(spec=ChatCompletionTokenLogprob)
        valid_logprob_item.token = "good_token"
        valid_logprob_item.logprob = -0.5

        mock_logprobs_data_str = MagicMock(spec=OpenAIChoiceLogprobs)
        mock_logprobs_data_str.content = [valid_logprob_item, malformed_logprob_item_str] 
        mock_choice_str.logprobs = mock_logprobs_data_str
        mock_response_str.choices = [mock_choice_str]
        
        self.mock_litellm.acompletion.side_effect = [mock_response_str]
        with self.assertRaises(MalformedLogprobsError) as cm_str:
            params_str = ChatCompletionParams(
            messages=[{"role": "user", "content": "Hello str"}], 
            temperature=0.7, 
            max_tokens=10, 
            top_p=1.0,
            additional_provider_kwargs={}
        )
            await self.adapter._create_chat_completion(params_str)
        self.assertIn("Malformed logprob_item", str(cm_str.exception)) # General check
        self.assertIn("Token: bad_token_str", str(cm_str.exception)) # Specific token
        self.assertIn("Logprob: not-a-number", str(cm_str.exception)) # Specific malformed logprob
        self.assertIn("Expected (str, float/int)", str(cm_str.exception)) # Expected type info

        # Reset for next case
        self.mock_litellm.acompletion.reset_mock()

        # Test case 2: logprob is None
        mock_response_none = MagicMock(spec=ModelResponse)
        mock_choice_none = MagicMock(spec=Choices)
        mock_message_none = MagicMock(content="Test content", role="assistant") # Can reuse or make new
        mock_choice_none.message = mock_message_none

        malformed_logprob_item_none = MagicMock(spec=ChatCompletionTokenLogprob)
        malformed_logprob_item_none.token = "bad_token_none"
        malformed_logprob_item_none.logprob = None

        mock_logprobs_data_none = MagicMock(spec=OpenAIChoiceLogprobs)
        mock_logprobs_data_none.content = [malformed_logprob_item_none]
        mock_choice_none.logprobs = mock_logprobs_data_none
        mock_response_none.choices = [mock_choice_none]

        self.mock_litellm.acompletion.side_effect = [mock_response_none]
        with self.assertRaises(MalformedLogprobsError) as cm_none:
            params_none = ChatCompletionParams(
            messages=[{"role": "user", "content": "Hello None"}], 
            temperature=0.7, 
            max_tokens=10, 
            top_p=1.0,
            additional_provider_kwargs={}
        )
            await self.adapter._create_chat_completion(params_none)
        self.assertIn("Malformed logprob_item", str(cm_none.exception)) # General check
        self.assertIn("Token: bad_token_none", str(cm_none.exception)) # Specific token
        self.assertIn("Logprob: None", str(cm_none.exception)) # Specific malformed logprob (None)
        self.assertIn("Expected (str, float/int)", str(cm_none.exception)) # Expected type info
    def test_malformed_logprobs_item_mocked(self):
        run_async_test(self.async_test_malformed_logprobs_item_mocked)

