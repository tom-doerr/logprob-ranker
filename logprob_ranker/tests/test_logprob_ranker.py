import asyncio
import unittest
import json
from .test_utils import run_async_test
from unittest.mock import AsyncMock, MagicMock, patch
from typing import List, Dict, Any, Optional

from litellm.types.utils import ModelResponse, Choices
from openai.types.chat.chat_completion import ChoiceLogprobs as OpenAIChoiceLogprobs
from openai.types.chat import ChatCompletionTokenLogprob

from logprob_ranker.logprob_ranker.ranker import (
    LogProbRanker, LogProbConfig, RankedOutput, 
    LLMGenerationError, LogprobsNotAvailableError,
    MalformedLogprobsError, ChatCompletionParams, 
    LiteLLMAdapter
)

# Helper to run async tests

class MinimalConcreteRanker(LogProbRanker):
    """A minimal concrete implementation of LogProbRanker for testing."""
    def __init__(self, config: Optional[LogProbConfig] = None, mock_create_completion: Optional[AsyncMock] = None):
        super().__init__(llm_client=MagicMock(), config=config or LogProbConfig())
        # Set up the internal mock, allowing injection for testing
        if mock_create_completion:
            self._internal_completion_mock = mock_create_completion # This is the attribute that will be mocked
        else:
            self._internal_completion_mock = AsyncMock()

    async def _create_chat_completion(self, params: ChatCompletionParams) -> Dict[str, Any]:
        # This is the actual method that would call an LLM, now uses the internal mock
        # Unpack from params for the mock, which still expects individual args
        return await self._internal_completion_mock(
            messages=params.messages,
            temperature=params.temperature,
            max_tokens=params.max_tokens,
            top_p=params.top_p,
            model=params.model_override, # model_override from params corresponds to 'model' for the mock
            **params.additional_provider_kwargs
        )

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


# ===== Tests from test_async_basic.py =====
class TestAsyncBasic(unittest.TestCase):
    """Basic tests for the async methods in LogProbRanker."""

    def setUp(self):
        self.config = LogProbConfig(
            num_variants=2,
            temperature=0.7,
            max_tokens=100,
            template='{"test": LOGPROB_TRUE}'
        )
        self.ranker = LogProbRanker(llm_client=MagicMock(), config=self.config)

    async def test_generate_output(self):
        # Mock the _create_chat_completion method
        with patch.object(self.ranker, '_create_chat_completion', new_callable=AsyncMock) as mock_create:
            mock_create.return_value = {
                "content": "Test output",
                "average_token_logprob": -0.5
            }
            output = await self.ranker.generate_output("Test prompt", 0)
            self.assertEqual(output, "Test output")

    def test_generate_output_sync(self):
        with patch.object(self.ranker, 'generate_output', new_callable=AsyncMock) as mock_generate:
            mock_generate.return_value = "Test output"
            output = self.ranker.generate_output_sync("Test prompt", 0)
            self.assertEqual(output, "Test output")

    async def test_rank_outputs(self):
        with patch.object(self.ranker, 'generate_and_evaluate_output', new_callable=AsyncMock) as mock_gen_eval:
            mock_gen_eval.side_effect = [
                RankedOutput(output="Output 1", logprob=-0.1, index=0),
                RankedOutput(output="Output 2", logprob=-0.2, index=1)
            ]
            results = await self.ranker.rank_outputs("Test prompt")
            self.assertEqual(len(results), 2)
            self.assertEqual(results[0].output, "Output 1")
            self.assertEqual(results[1].output, "Output 2")

    def test_rank_outputs_sync(self):
        with patch.object(self.ranker, 'rank_outputs', new_callable=AsyncMock) as mock_rank:
            mock_rank.return_value = [
                RankedOutput(output="Output 1", logprob=-0.1, index=0),
                RankedOutput(output="Output 2", logprob=-0.2, index=1)
            ]
            results = self.ranker.rank_outputs_sync("Test prompt")
            self.assertEqual(len(results), 2)
            self.assertEqual(results[0].output, "Output 1")

# ===== Tests from test_litellm_basic.py =====
class TestLiteLLMBasic(unittest.TestCase):
    """Basic tests for the LiteLLMAdapter."""

    def setUp(self):
        self.config = LogProbConfig(
            num_variants=2,
            temperature=0.7,
            max_tokens=100,
            template='{"test": LOGPROB_TRUE}'
        )
        self.adapter = LiteLLMAdapter(model="gpt-3.5-turbo", api_key="test-key", config=self.config)

    @patch('litellm.acompletion', new_callable=AsyncMock)
    async def test_create_chat_completion(self, mock_acomplete):
        mock_acomplete.return_value = {
            "choices": [{"message": {"content": "Test output"}}]
        }
        params = ChatCompletionParams(
            messages=[{"role": "user", "content": "Test"}],
            temperature=0.7,
            max_tokens=100,
            top_p=1.0
        )
        response = await self.adapter._create_chat_completion(params)
        self.assertEqual(response["content"], "Test output")

    @patch('litellm.acompletion', new_callable=AsyncMock)
    async def test_evaluate_text(self, mock_acomplete):
        mock_acomplete.return_value = {
            "choices": [{"message": {"content": "Test output"}}]
        }
        result = await self.adapter.evaluate_text(
            prompt_messages=[{"role": "user", "content": "Test"}],
            text_to_evaluate="Test text"
        )
        self.assertEqual(result.text_evaluated, "Test output")

# ===== Tests from test_ranker.py =====
class TestLogProbRankerAdditional(unittest.TestCase):
    """Additional tests for the LogProbRanker class."""

    def setUp(self):
        self.config = LogProbConfig(
            num_variants=2,
            temperature=0.7,
            max_tokens=100,
            template='{"test": LOGPROB_TRUE}'
        )
        self.ranker = LogProbRanker(llm_client=MagicMock(), config=self.config)

    async def test_generate_and_evaluate_output(self):
        with patch.object(self.ranker, '_create_chat_completion', new_callable=AsyncMock) as mock_create:
            mock_create.side_effect = [
                {"content": "Generated output", "average_token_logprob": -0.5},
                {"content": '{"test": true}', "average_token_logprob": -0.1}
            ]
            ranked_output = await self.ranker.generate_and_evaluate_output("Test prompt", 0)
            self.assertEqual(ranked_output.output, "Generated output")
            self.assertEqual(ranked_output.logprob, -0.1)

    async def test_handle_all_failures(self):
        with patch.object(self.ranker, 'generate_and_evaluate_output', new_callable=AsyncMock) as mock_gen_eval:
            mock_gen_eval.return_value = None
            with self.assertRaises(RuntimeError):
                await self.ranker.rank_outputs("Test prompt")

# ===== Tests from test_litellm_adapter.py =====
class TestLiteLLMAdapterComprehensive(unittest.TestCase):
    """Comprehensive tests for the LiteLLMAdapter from test_litellm_adapter.py"""

    def setUp(self):
        """Set up test fixtures."""
        self.config = LogProbConfig(
            num_variants=2,
            thread_count=1,
            template='{"test": LOGPROB_TRUE}',
            logprobs=True
        )

        self.litellm_patch = patch('logprob_ranker.logprob_ranker.ranker.litellm')
        self.mock_litellm = self.litellm_patch.start()

        # Initialize the adapter instance for tests
        self.adapter = LiteLLMAdapter(config=self.config, model="mock_model_in_setup_not_real")

        self.mock_litellm.acompletion = AsyncMock()

        mock_model_response = MagicMock(spec=ModelResponse)
        mock_choice = MagicMock(spec=Choices)
        mock_message = MagicMock()
        mock_message.content = "Mocked completion content from setUp"
        mock_message.role = "assistant"
        mock_choice.message = mock_message

        mock_logprobs_item1 = MagicMock(spec=ChatCompletionTokenLogprob)
        mock_logprobs_item1.token = "setup_token_1"
        mock_logprobs_item1.logprob = -0.123
        mock_logprobs_item2 = MagicMock(spec=ChatCompletionTokenLogprob)
        mock_logprobs_item2.token = "setup_token_2"
        mock_logprobs_item2.logprob = -0.456
        mock_logprobs_data = MagicMock(spec=OpenAIChoiceLogprobs)
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
            return mock_model_response

        self.mock_litellm.acompletion.side_effect = mock_default_acompletion
    
    def tearDown(self):
        """Tear down test fixtures."""
        self.litellm_patch.stop()
    
    def test_initialization(self):
        """Test initialization of LiteLLMAdapter."""
        self.assertEqual(self.adapter.model, "mock_model_in_setup_not_real")
        self.assertIsNone(self.adapter.api_key)
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
            additional_provider_kwargs={}
        )
        result = await self.adapter._create_chat_completion(params)
        
        self.mock_litellm.acompletion.assert_called_once_with(
            model="mock_model_in_setup_not_real",
            messages=messages,
            temperature=0.7,
            max_tokens=100,
            top_p=1.0,
            logprobs=True,
            top_logprobs=5
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
                eval_logprobs_list = [MagicMock(spec=ChatCompletionTokenLogprob, token='generic', logprob=avg_logprob, bytes=None, top_logprobs=[])]

            mock_eval_logprobs_data = MagicMock(spec=OpenAIChoiceLogprobs)
            mock_eval_logprobs_data.content = eval_logprobs_list
            mock_eval_choice.logprobs = mock_eval_logprobs_data
            mock_eval_response.choices = [mock_eval_choice]
            mock_eval_response.model_dump_json = MagicMock(return_value=json.dumps({"evaluation_content": eval_json_str}))
            return mock_eval_response

        side_effect_list = [
            create_generation_response("Generated Output Alpha", avg_logprob=-0.1),
            create_evaluation_response('{"test": true}'),
            create_generation_response("Generated Output Beta", avg_logprob=-0.8),
            create_evaluation_response('{"test": false}')
        ]

        self.mock_litellm.acompletion.side_effect = side_effect_list
        
        results = await self.adapter.rank_outputs("Test prompt for ranking")
            
        self.assertEqual(len(results), num_variants)
        self.assertEqual(self.mock_litellm.acompletion.call_count, num_variants * 2)

        self.assertEqual(results[0].output, "Generated Output Alpha")
        self.assertAlmostEqual(results[0].logprob, -0.4, places=4)
        self.assertEqual(results[0].attribute_scores[0].name, "test")
        self.assertAlmostEqual(results[0].attribute_scores[0].score, -0.4, places=4)
        
        self.assertEqual(results[1].output, "Generated Output Beta")
        self.assertAlmostEqual(results[1].logprob, -0.9, places=4)
        self.assertEqual(results[1].attribute_scores[0].name, "test")
        self.assertAlmostEqual(results[1].attribute_scores[0].score, -0.9, places=4)

    def test_rank_outputs(self):
        run_async_test(self.async_test_rank_outputs)

if __name__ == '__main__':
    unittest.main()
