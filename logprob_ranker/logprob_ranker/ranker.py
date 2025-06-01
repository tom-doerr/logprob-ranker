"""
Core implementation of the LogProb ranking algorithm for evaluating LLM outputs.
"""

import asyncio
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional, Callable, Tuple

import aiohttp # Added import
import litellm
import litellm.exceptions as litellm_exceptions # Import real exceptions
from litellm.utils import ModelResponse # Added for type hinting
# No longer need BaseModel, Field, ConfigDict, field_validator from pydantic here
# as they are used in models.py

from .utils import (
    extract_template_attributes,
    sort_ranked_outputs,
    format_evaluation_prompt
)
from dataclasses import dataclass, field # Add field for default_factory
from .models import AttributeScore, RankedOutput, LogProbConfig # Import models


@dataclass
class ChatCompletionParams:
    messages: List[Dict[str, str]]
    temperature: float
    max_tokens: int
    top_p: float
    model_override: Optional[str] = None
    request_logprobs_override: Optional[bool] = None
    request_top_logprobs_override: Optional[int] = None
    additional_provider_kwargs: Dict[str, Any] = field(default_factory=dict)


class LLMGenerationError(Exception):
    """Custom exception for errors during LLM generation."""
    pass  # pylint: disable=unnecessary-pass


class EvaluationParseError(Exception):
    """Custom exception for errors during evaluation string parsing."""
    pass  # pylint: disable=unnecessary-pass


class LogprobsNotAvailableError(LLMGenerationError):
    """Custom exception for when logprobs are expected but not available or processable."""
    pass  # pylint: disable=unnecessary-pass


class MalformedLogprobsError(LLMGenerationError):
    """Custom exception for when logprobs are present but malformed or unprocessable."""
    pass  # pylint: disable=unnecessary-pass


class LogProbRanker(ABC):
    """
    A class for generating and ranking LLM outputs based on the logprob self-ranking algorithm.
    """
    
    def __init__(
        self,
        llm_client,
        config: Optional[LogProbConfig] = None,
        on_output_callback: Optional[Callable[[RankedOutput], None]] = None
    ):
        """
        Initialize the ranker with the specified LLM client and configuration.
        
        Args:
            llm_client: A client for interacting with the language model API (e.g., OpenAI client)
            config: Optional configuration settings
            on_output_callback: Optional callback function called for each output as it's generated and ranked
        """
        self.llm_client = llm_client # Retained, though not used by base _create_chat_completion anymore
        self.config = config or LogProbConfig()
        self.on_output_callback = on_output_callback
    
    @abstractmethod
    async def _create_chat_completion(self, params: ChatCompletionParams) -> Dict[str, Any]:
        """
        Abstract method to create a chat completion using an LLM.
        Subclasses must implement this method.
        
        Args:
            messages: List of message objects (role and content).
            temperature: Temperature parameter for generation.
            max_tokens: Maximum tokens to generate.
            top_p: Top-p sampling parameter.
            **kwargs: Additional provider-specific arguments.
            
        Returns:
            The raw response from the LLM client, expected in a standardized format
            (e.g., including 'content' and 'raw_token_logprobs').
        
        Raises:
            LLMGenerationError: If the LLM call fails.
        """
        pass  # pylint: disable=unnecessary-pass

    async def _call_llm_and_get_content(
        self,
        messages: List[Dict[str, str]],
        temperature: float,
        max_tokens: int,
        top_p: float,
        call_purpose: str, # "generation" or "evaluation"
        error_context_index: int,
        **kwargs
    ) -> Tuple[str, Dict[str, Any]]:
        """Helper to call _create_chat_completion and validate/return content and full response."""
        # Extract specific overrides from kwargs, put the rest into additional_provider_kwargs
        provider_kwargs_for_params = kwargs.copy() # Start with all kwargs

        model_override_val = provider_kwargs_for_params.pop('model', None)
        request_logprobs_override_val = provider_kwargs_for_params.pop('request_logprobs', None)
        request_top_logprobs_override_val = provider_kwargs_for_params.pop('request_top_logprobs', None)

        completion_params = ChatCompletionParams(
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            top_p=top_p,
            model_override=model_override_val,
            request_logprobs_override=request_logprobs_override_val,
            request_top_logprobs_override=request_top_logprobs_override_val,
            additional_provider_kwargs=provider_kwargs_for_params # Remaining kwargs
        )
        response_data = await self._create_chat_completion(params=completion_params)
        
        content = response_data.get("content")
        if content is None:
            error_message = (
                f"{call_purpose.capitalize()} response from _create_chat_completion for variant {error_context_index} "
                f"is missing the 'content' key. Response: {response_data}"
            )
            if call_purpose == "generation":
                raise LLMGenerationError(error_message)
            elif call_purpose == "evaluation":
                raise EvaluationParseError(error_message)
            else:
                # Should not happen with controlled inputs
                raise ValueError(f"Invalid call_purpose: {call_purpose}")
        return content, response_data

    async def generate_and_evaluate_output(self, prompt: str, index: int) -> Optional[RankedOutput]:
        """
        Generate a single output, evaluate it, and use its average token logprob for ranking.
        """
        try:
            # Generate output
            generation_messages = [
                {"role": "system", "content": self.config.system_prompt},
                {"role": "user", "content": prompt}
            ]
            
            generated_output_content, _ = await self._call_llm_and_get_content(
                messages=generation_messages,
                temperature=self.config.temperature,
                max_tokens=self.config.max_tokens,
                top_p=self.config.top_p,
                call_purpose="generation",
                error_context_index=index,
                request_logprobs=self.config.logprobs, # Pass logprobs config
                request_top_logprobs=self.config.top_logprobs # Pass top_logprobs config
            )
            # output_avg_token_logprob from generation_response_data["average_token_logprob"] is not directly used for ranking score anymore.
            
            # Generate evaluation
            evaluation_formatted_prompt = format_evaluation_prompt(
                self.config.evaluation_prompt,
                generated_output_content, # Evaluate the generated content
                self.config.template
            )
            
            evaluation_messages = [
                {"role": "system", "content": "You are an evaluator that outputs JSON with boolean values."},
                {"role": "user", "content": evaluation_formatted_prompt}
            ]
            
            # This call returns a dict including 'content' and 'raw_token_logprobs' (List[Tuple[str, float]])
            raw_evaluation_text, evaluation_llm_response_data = await self._call_llm_and_get_content(
                messages=evaluation_messages,
                temperature=0,  # Use temperature 0 for deterministic evaluation
                max_tokens=self.config.max_tokens, 
                top_p=1.0,
                call_purpose="evaluation",
                error_context_index=index,
                request_logprobs=True, # Always request logprobs for evaluation
                request_top_logprobs=(self.config.evaluation_top_logprobs if hasattr(self.config, 'evaluation_top_logprobs') and self.config.evaluation_top_logprobs is not None else 5)
            )

            eval_tokens_with_logprobs = evaluation_llm_response_data.get("raw_token_logprobs")
            if eval_tokens_with_logprobs is None:
                error_msg = (
                    f"Evaluation response from _create_chat_completion for variant {index} "
                    "is missing the 'raw_token_logprobs' key or its value was None. This is essential for scoring. "
                    f"Response received: {evaluation_llm_response_data}"
                )
                raise LogprobsNotAvailableError(error_msg)
            
            # 1. Parse the raw evaluation JSON (optional, for debugging or cross-referencing)
            # parsed_evaluation_dict = parse_evaluation_json(raw_evaluation_text)
            
            # 2. Extract attribute names from the template
            attributes_list = extract_template_attributes(self.config.template)

            # 3. Construct AttributeScore objects using logprobs of 'true'/'false' tokens
            attribute_scores_list = []
            current_token_stream_idx = 0
            total_attribute_token_logprob = 0.0
            num_scores_found = 0

            for attr_name in attributes_list:
                attr_actual_logprob = 0.0  # Logprob of the 'true' or 'false' token found for this attribute
                explanation_str = f"Value token for '{attr_name}' not found."
                found_this_attribute_value = False

                # Try to find the attribute key, then colon, then value token, advancing current_token_stream_idx
                # This is a heuristic scan and assumes attributes in template appear in order in the JSON output.
                key_search_start_idx = current_token_stream_idx
                colon_search_start_idx = -1
                value_search_start_idx = -1

                # Phase A: Find attribute key (e.g., "is_good_output") by concatenating tokens
                colon_search_start_idx = -1 # Reset for current attr_name; will be updated if key found
                # key_search_start_idx is the global offset in the token stream from previous attribute searches.

                for j_start_token_idx in range(key_search_start_idx, len(eval_tokens_with_logprobs)):
                    accumulated_key_text = ""
                    # Try to match attr_name starting from token j_start_token_idx
                    for k_current_token_idx in range(j_start_token_idx, len(eval_tokens_with_logprobs)):
                        token_k_raw_text = eval_tokens_with_logprobs[k_current_token_idx][0]

                        # Heuristic: if token looks like a structural/delimiter that cannot be part of a key name,
                        # stop accumulating for *this* candidate key path.
                        # This check is for the *current* token being a delimiter for the *end* of the key.
                        if token_k_raw_text.strip() in [":", "{", "}", "[", "]", ","] or '" :' in token_k_raw_text or ':"' in token_k_raw_text or token_k_raw_text == '"':
                            if not accumulated_key_text and token_k_raw_text.strip() in ["{", "}", "[", "]", ","]:
                                # If first token is a standalone structural char, this j_start_token_idx is not a key start.
                                pass # Let outer loop j_start_token_idx continue
                            break # Stop accumulating for this j_start_token_idx path, current token is a delimiter.

                        accumulated_key_text += token_k_raw_text
                        
                        # Normalize accumulated_key_text for comparison with attr_name (which is clean, e.g., "is_good_output")
                        # Handles cases like accumulated_key_text being "\"is_good_output\"" or "is_good_output"
                        # Normalize accumulated_key_text for comparison with attr_name
                        normalized_accumulated_key = accumulated_key_text.strip() # Strip outside whitespace first
                        
                        # Handle '{"key"' -> "key"
                        if normalized_accumulated_key.startswith('{"') and normalized_accumulated_key.endswith('"'):
                            normalized_accumulated_key = normalized_accumulated_key[2:-1]
                        # Handle '"key"' -> "key"
                        elif normalized_accumulated_key.startswith('"') and normalized_accumulated_key.endswith('"'):
                            normalized_accumulated_key = normalized_accumulated_key[1:-1]
                        # Add other normalizations if necessary for other tokenization patterns

                        if normalized_accumulated_key == attr_name:
                            # Key found, ends at k_current_token_idx.
                            # Phase B should start searching for colon from the *next* token.
                            colon_search_start_idx = k_current_token_idx + 1 
                            break # Found key, break from k_current_token_idx loop (inner)
                        elif len(normalized_accumulated_key) > len(attr_name) or not attr_name.startswith(normalized_accumulated_key):
                            # Mismatch or overshot, this path won't form the key
                            break # Break from k_current_token_idx loop (inner)
                    
                    if colon_search_start_idx != -1:
                        # Found key for this attr_name, break from j_start_token_idx loop (outer)
                        break 
                # If loop finishes and colon_search_start_idx is still -1, key was not found.
                
                # Phase B: Find colon after key
                if colon_search_start_idx != -1:
                    for i in range(colon_search_start_idx, len(eval_tokens_with_logprobs)):
                        if ":" in eval_tokens_with_logprobs[i][0]:
                            value_search_start_idx = i + 1 # Value token should be after colon token
                            break
                        # If we hit another quoted string (potential next key) or end of object, stop for this attr
                        if (eval_tokens_with_logprobs[i][0].startswith('"') and i > colon_search_start_idx) or \
                           eval_tokens_with_logprobs[i][0] in ["}", "]"]:
                            value_search_start_idx = -1 # Mark as colon not leading to value
                            break
                
                # Phase C: Find 'true' or 'false' token after colon
                if value_search_start_idx != -1 and value_search_start_idx < len(eval_tokens_with_logprobs):
                    for i in range(value_search_start_idx, len(eval_tokens_with_logprobs)):
                        token_s, token_lp = eval_tokens_with_logprobs[i]
                        normalized_token_s = token_s.strip().lower().replace('"', '')
                        match_found = normalized_token_s in ("true", "false")

                        if match_found:
                            attr_actual_logprob = token_lp
                            explanation_str = f"Logprob of token '{token_s.strip()}' for '{attr_name}'"
                            current_token_stream_idx = i + 1 # Advance main cursor past this value token
                            found_this_attribute_value = True
                            break
                        
                        # If we hit a structural token indicating end of value or next item, stop for this attr
                        if token_s in [",", "}", "]"] or (token_s.startswith('"') and i > value_search_start_idx):
                            current_token_stream_idx = i # Next attribute search starts from this structural token
                            break
                    else: # Loop finished without break (ran out of tokens for this value search)
                        current_token_stream_idx = len(eval_tokens_with_logprobs)
                
                if found_this_attribute_value:
                    total_attribute_token_logprob += attr_actual_logprob
                    num_scores_found += 1
                
                attribute_scores_list.append(AttributeScore(name=attr_name, score=attr_actual_logprob, explanation=explanation_str))

            final_score = 0.0
            if num_scores_found > 0:
                final_score = total_attribute_token_logprob / num_scores_found
            
            return RankedOutput(
                output=generated_output_content, # Use the content from the initial generation
                logprob=final_score,  # Use the new score derived from evaluation token logprobs
                index=index,
                attribute_scores=attribute_scores_list,
                raw_evaluation=raw_evaluation_text # The JSON string from the evaluation LLM
            )

        except LLMGenerationError as e:
            # print(f"DEBUG_RANKER: LLM generation error for output {index}: {e}") # Optional: for debugging
            raise RuntimeError(f"LLM generation failed for variant {index}: {e}") from e
        except EvaluationParseError as e:
            # print(f"DEBUG_RANKER: Evaluation parsing error for output {index}: {str(e)}") # Optional: for debugging
            raise RuntimeError(f"Evaluation parsing failed for variant {index}: {e}") from e
        except Exception as e:
            # print(f"DEBUG_RANKER: Unexpected error generating and evaluating output {index}: {e}") # Optional: for debugging
            raise RuntimeError(f"Unexpected error for variant {index}: {e}") from e

    async def rank_outputs(self, prompt: str) -> List[RankedOutput]:
        """
        Generate multiple outputs for the prompt and rank them by log probability.
        
        Args:
            prompt: The prompt to generate content from
            
        Returns:
            A list of RankedOutput objects sorted by logprob (highest first)
        """
        tasks = [
            self.generate_and_evaluate_output(prompt, i)
            for i in range(self.config.num_variants)
        ]
        
        # Use asyncio.gather to run tasks concurrently.
    # Since generate_and_evaluate_output now handles its exceptions by returning None,
    # we don't expect exceptions in the results list from these handled cases.
        results = await asyncio.gather(*tasks)

        ranked_outputs = []
        for i, result in enumerate(results):
            # result will be either a RankedOutput object or None
            if result is not None:
                ranked_outputs.append(result)
                if self.on_output_callback:
                    try:
                        self.on_output_callback(result)
                    except Exception as cb_e:
                        # Log callback error but don't let it stop processing other results
                        print(f"Error in on_output_callback for output {i}: {cb_e}") 
    
        # If no tasks successfully produced a RankedOutput
        if not ranked_outputs:
            raise RuntimeError("All generation and evaluation tasks failed.")

        return sort_ranked_outputs(ranked_outputs)

    def rank_outputs_sync(self, prompt: str) -> List[RankedOutput]:
        """
        Synchronous version of rank_outputs.
        
        Args:
            prompt: The prompt to generate content from
            
        Returns:
            A list of RankedOutput objects sorted by logprob (highest first)
        """
        # Store the current event loop policy's event loop, if any.
        # Using the policy is more robust for getting/setting the loop for a thread.
        policy = asyncio.get_event_loop_policy()
        try:
            original_loop = policy.get_event_loop()
        except RuntimeError:  # Indicates no current event loop is set for this thread.
            original_loop = None

        # Create and set a new event loop specifically for this synchronous operation.
        new_loop = policy.new_event_loop()
        policy.set_event_loop(new_loop)

        try:
            # Run the async function (self.rank_outputs) in the new loop.
            result = new_loop.run_until_complete(self.rank_outputs(prompt))
            return result
        except Exception as e:
            # Consider replacing print with proper logging for library code.
            print(f"Error in rank_outputs_sync: {str(e)}")
            raise
        finally:
            # Ensure the new loop is closed.
            new_loop.close()
            # Restore the original event loop for the thread.
            policy.set_event_loop(original_loop)


class LiteLLMAdapter(LogProbRanker):
    """
    Adapter for using LiteLLM with any supported model/provider.
    
    LiteLLM supports various providers like OpenAI, Anthropic, Cohere, 
    Hugging Face, Azure, PaLM, etc.
    """
    
    def __init__(
        self,
        model: str,
        api_key: Optional[str] = None,
        config: Optional[LogProbConfig] = None,
        on_output_callback: Optional[Callable[[RankedOutput], None]] = None,
        aiohttp_session: Optional[aiohttp.ClientSession] = None,  # Added parameter
        **kwargs
    ):
        """
        Initialize the LiteLLM adapter.
        
        Args:
            model: The model identifier (e.g., "gpt-4", "claude-2", "command-nightly")
            api_key: Optional API key (uses env variables if not provided)
            config: Optional configuration settings
            on_output_callback: Optional callback function
            aiohttp_session: Optional aiohttp ClientSession to use for requests
            **kwargs: Additional parameters to pass to LiteLLM
        """
        super().__init__(None, config, on_output_callback)
        self.model = model
        self.api_key = api_key # Retain for potential direct use if needed, though primary mechanism is via kwargs
        self.aiohttp_session = aiohttp_session # Store the aiohttp session
        self.additional_kwargs = kwargs # Store additional kwargs for litellm
        
    def _extract_raw_token_logprobs(self, response: Optional[ModelResponse]) -> List[Tuple[str, float]]:
        """Extracts (token_string, logprob) tuples from the LiteLLM ModelResponse."""
        if not response:
            raise LogprobsNotAvailableError("LiteLLM response object is None, cannot extract logprobs.")
        # The initial `if not response:` check handles None response.
        # The rest of the logic will proceed without a broad try-except.
        # Specific issues like missing attributes will raise AttributeError, which is more informative.

        if not response.choices or not response.choices[0]:
            raise LogprobsNotAvailableError("Response choices list is empty or invalid, cannot extract logprobs.")

        choice = response.choices[0]

        if not hasattr(choice, 'logprobs') or choice.logprobs is None:
            raise LogprobsNotAvailableError("No 'logprobs' attribute on choice object or it is None.")

        if not hasattr(choice.logprobs, 'content') or not isinstance(choice.logprobs.content, list):
            raise LogprobsNotAvailableError("'logprobs.content' is missing or not a list.")

        if not choice.logprobs.content: # Content is an empty list
            raise LogprobsNotAvailableError("'logprobs.content' is an empty list.")

        raw_token_logprobs: List[Tuple[str, float]] = []
        for i, logprob_item in enumerate(choice.logprobs.content):
            has_token = hasattr(logprob_item, 'token')
            token_is_str = isinstance(getattr(logprob_item, 'token', None), str)
            has_logprob = hasattr(logprob_item, 'logprob')
            logprob_is_num = isinstance(getattr(logprob_item, 'logprob', None), (int, float))

            if has_token and token_is_str and \
               has_logprob and logprob_is_num:
                raw_token_logprobs.append((logprob_item.token, logprob_item.logprob))
            else:
                # If any item is malformed, we should raise an error, as partial logprobs might be misleading.
                raise MalformedLogprobsError(
                    f"Malformed logprob_item #{i} in 'logprobs.content'. "
                    f"Token: {getattr(logprob_item, 'token', 'MISSING_OR_INVALID_TYPE')}, "
                    f"Logprob: {getattr(logprob_item, 'logprob', 'MISSING_OR_INVALID_TYPE')}. "
                    f"Expected (str, float/int)."
                )
    
        if not raw_token_logprobs:
            # This means choice.logprobs.content was not empty, but all items in it were malformed.
            raise LogprobsNotAvailableError("All logprob items in 'logprobs.content' were malformed.")

        return raw_token_logprobs

    def _calculate_average_token_logprob(self, token_logprobs: List[Tuple[str, float]]) -> float:
        """Calculates the average of a list of token logprobs."""
        if not token_logprobs:
            return 0.0

        logprob_sum = 0.0
        count = 0
        for i, (token, logprob) in enumerate(token_logprobs):
            if not isinstance(logprob, (int, float)):
                raise ValueError(
                    f"Invalid logprob type for token '{token}' (item {i}) in token_logprobs: {type(logprob).__name__}. Expected float or int."
                )
            logprob_sum += logprob
            count += 1
        
        if count == 0:
            return 0.0 
            
        return logprob_sum / count

    async def _execute_litellm_completion(self, model: str, messages: List[Dict[str, str]], temperature: float, max_tokens: int, top_p: float, request_logprobs: Optional[bool] = None, request_top_logprobs: Optional[int] = None, **kwargs) -> Dict[str, Any]:
        """
        Helper method to execute litellm.acompletion and format response.
        """
        # kwargs received here are already {**self.additional_kwargs, **call_time_kwargs_to_create_chat_completion}
        final_litellm_params = kwargs.copy()

        # Determine API key for litellm.acompletion
        # Priority: 1. 'api_key' in final_litellm_params (already popped if present) -> 2. self.api_key -> 3. LiteLLM uses env vars
        api_key_for_litellm = final_litellm_params.pop('api_key', self.api_key)

        # Determine client session for litellm.acompletion
        # Priority: 1. 'client' in final_litellm_params -> 2. self.aiohttp_session -> 3. LiteLLM manages its own
        if 'client' not in final_litellm_params:  # If not explicitly passed by caller
            if self.aiohttp_session: # Use instance's session if available
                final_litellm_params['client'] = self.aiohttp_session
        # If 'client' IS in final_litellm_params, it's used as is (could be a session, or None to force no session from adapter).

        # Determine if logprobs should be requested and how many top_logprobs
        should_request_logprobs = request_logprobs if request_logprobs is not None else self.config.logprobs

        if should_request_logprobs:
            final_litellm_params['logprobs'] = True
            # Determine top_logprobs value
            actual_top_logprobs = request_top_logprobs # Prioritize call-time parameter
            if actual_top_logprobs is None:
                actual_top_logprobs = self.config.top_logprobs # Fallback to instance config
            if actual_top_logprobs is None: # If still None, default for evaluation or general request
                # For evaluation, we'd ideally use evaluation_top_logprobs, but this method is generic.
                # A general default if logprobs are requested but no specific top_n is fine.
                actual_top_logprobs = 5 
            final_litellm_params['top_logprobs'] = actual_top_logprobs
        else:
            # Ensure logprobs and top_logprobs are not sent if not requested
            final_litellm_params.pop('logprobs', None)
            final_litellm_params.pop('top_logprobs', None)
        
        # Prepare the final set of keyword arguments for litellm.acompletion
        litellm_call_kwargs = final_litellm_params
        if api_key_for_litellm:
            litellm_call_kwargs['api_key'] = api_key_for_litellm
        # If api_key_for_litellm is None, 'api_key' is not in litellm_call_kwargs (it was popped and not re-added),
        # allowing LiteLLM to use environment variables.

        response_obj: Optional[ModelResponse] = None
        raw_token_logprobs_list: List[Tuple[str, float]] = []

        try:
            # Debug print (can be uncommented if needed)
            # print(f"DEBUG_RANKER: LiteLLMAdapter._execute_litellm_completion - Calling litellm.acompletion with model={model}, temp={temperature}, messages={messages}, client_present={litellm_call_kwargs.get('client') is not None}, all_kwargs={litellm_call_kwargs}")

            response_obj = await litellm.acompletion(
                model=model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                top_p=top_p,
                **litellm_call_kwargs # Contains logprobs, api_key (if set), client (if set), and other params
            )

            if should_request_logprobs:
                raw_token_logprobs_list = self._extract_raw_token_logprobs(response_obj)
            # else: raw_token_logprobs_list remains [], which is intended if logprobs were not requested.
        
            # Validate response structure
            if not response_obj or not response_obj.choices or not response_obj.choices[0] or \
               not response_obj.choices[0].message or response_obj.choices[0].message.content is None:
                raise LLMGenerationError(f"LiteLLM response missing critical information for model {model}.")

            response_data = {
                "content": response_obj.choices[0].message.content,
                "role": response_obj.choices[0].message.role,
                "num_tokens": len(response_obj.choices[0].message.content),
                "raw_token_logprobs": raw_token_logprobs_list,
                "raw_response": response_obj
            }

            if raw_token_logprobs_list:
                response_data['average_token_logprob'] = self._calculate_average_token_logprob(raw_token_logprobs_list)
            elif should_request_logprobs:
                raise MalformedLogprobsError(
                    f"Logprobs were requested for model {model}, but the extracted logprobs list was empty. "
                    f"This might indicate missing or empty 'content' in the logprobs object from the LLM response."
                )
            else: # This means not should_request_logprobs and raw_token_logprobs_list is empty.
                # This is the expected behavior when logprobs are not requested.
                response_data['average_token_logprob'] = 0.0

            return response_data

        except litellm_exceptions.APIError as e:
            raise LLMGenerationError(f"LiteLLM API error for model {model}: {e}") from e
        except LogprobsNotAvailableError: # Raised by _extract_raw_token_logprobs
            raise
        except MalformedLogprobsError: # Raised by _extract_raw_token_logprobs or within this method
            raise
        except Exception as e:
            # Catch-all for other unexpected errors during the call or processing
            raise LLMGenerationError(f"Unexpected error during LiteLLM completion for model {model}: {type(e).__name__} - {e}") from e

    async def _create_chat_completion(self, params: ChatCompletionParams) -> Dict[str, Any]:
        """Create a chat completion using LiteLLM, handling potential errors and extracting logprobs."""
        model_to_call = params.model_override if params.model_override is not None else self.model
        
        # Pass through overrides; _execute_litellm_completion handles defaults if these are None
        final_request_logprobs = params.request_logprobs_override
        final_request_top_logprobs = params.request_top_logprobs_override

        # Combine instance-level additional_kwargs with call-time additional_provider_kwargs from params
        # Params' kwargs take precedence
        final_provider_kwargs = {**self.additional_kwargs, **params.additional_provider_kwargs}

        return await self._execute_litellm_completion(
            model=model_to_call,
            messages=params.messages,
            temperature=params.temperature,
            max_tokens=params.max_tokens,
            top_p=params.top_p,
            request_logprobs=final_request_logprobs,
            request_top_logprobs=final_request_top_logprobs,
            **final_provider_kwargs
        )

# == Utility Functions ==