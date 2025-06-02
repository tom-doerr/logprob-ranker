"""
Adapter for using LiteLLM with any supported model/provider.
    
LiteLLM supports various providers like OpenAI, Anthropic, Cohere, 
Hugging Face, Azure, PaLM, etc.
"""

import asyncio
import aiohttp
import litellm
import litellm.exceptions as litellm_exceptions
from litellm.types.utils import ModelResponse
from typing import Any, Dict, List, Optional, Tuple

from ..exceptions import (
    LLMGenerationError,
    Logprobs极狐NotAvailableError,
    MalformedLogprobsError
)
from ..core import LogProbRanker, ChatCompletionParams, TextEvaluationResult
from ..models import AttributeScore, RankedOutput

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
            print(">>> ENTERING LiteLLMAdapter._execute_litellm_completion <<<", flush=True)
            print(f"\nDEBUG_RANKER: LiteLLMAdapter._execute_litellm_completion - REQUEST PARAMS:", flush=True)
            print(f"  model: {model}", flush=True)
            print(f"  messages: {messages}", flush=True)
            print(f"  temperature: {temperature}", flush=True)
            print(f"  max_tokens: {max_tokens}", flush=True)
            print(f"  top_p: {top_p}", flush=True)
            print(f"  litellm_call_kwargs: {repr(litellm_call_kwargs)}", flush=True)
            print(f"DEBUG_RANKER: Calling litellm.acompletion...\n", flush=True)

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

            print(f"\nDEBUG_RANKER: LiteLLMAdapter._execute_litellm_completion - RAW RESPONSE OBJECT:", flush=True)
            print(f"  Type: {type(response_obj)}", flush=True)
            print(f"  Response: {repr(response_obj)}\n", flush=True)
        
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
            print(f"\nDEBUG_RANKER: LiteLLM APIError caught in _execute_litellm_completion:", flush=True)
            print(f"  Type: {type(e)}", flush=True)
            print(f"  Error: {e}\n", flush=True)
            raise LLMGenerationError(f"LiteLLM API error for model {model}: {e}") from e
        except LogprobsNotAvailableError: # Raised by _extract_raw_token_logprobs
            raise
        except MalformedLogprobsError: # Raised by _extract_raw_token_logprobs or within this method
            raise
        except Exception as e:
            print(f"\nDEBUG_RANKER: Unexpected Exception caught in _execute_litellm_completion:", flush=True)
            print(f"  Type: {type(e)}", flush=True)
            print(f"  Error: {e}\n", flush=True)
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

    async def evaluate_text(
        self,
        prompt_messages: List[Dict[str, str]],
        text_to_evaluate: str, # Note: Current logic does not use this to force specific text evaluation.
                               # It evaluates text generated from prompt_messages.
        model_override: Optional[str] = None,
        temperature: float = 0.0, 
        max_tokens: int = 150, # Max tokens for the generated text to be evaluated
        top_p: float = 1.0,
        request_logprobs: bool = True, # Must be true to get logprobs
        request_top_logprobs: Optional[int] = 5,
        additional_provider_kwargs: Optional[Dict[str, Any]] = None
    ) -> TextEvaluationResult:
        """
        Evaluates text by generating a completion from prompt_messages and returning its logprobs.
        The 'text_to_evaluate' parameter is currently a placeholder in the logic but kept for API compatibility.
        """
        effective_model = model_override if model_override is not None else self.model

        params = ChatCompletionParams(
            messages=prompt_messages,
            temperature=temperature,
            max_tokens=max_tokens,
            top_p=top_p,
            model_override=effective_model, # Use effective_model here
            request_logprobs_override=request_logprobs,
            request_top_logprobs_override=request_top_logprobs,
            additional_provider_kwargs=additional_provider_kwargs or {}
        )

        response_data = await self._create_chat_completion(params)

        actual_generated_text = response_data.get("content", "")
        avg_logprob = response_data.get("average_token_logprob", 0.0)
        raw_logprobs = response_data.get("raw_token_logprobs", [])
        
        # Count tokens based on the length of the raw_token_logprobs list
        num_actual_tokens = len(raw_logprobs)

        return TextEvaluationResult(
            text_evaluated=actual_generated_text,
            average_logprob=avg_logprob,
            num_tokens=num_actual_tokens, 
            raw_token_logprobs=raw_logprobs,
            prompt_used=prompt_messages,
            model_used=effective_model,
            raw_response=response_data.get("raw_response")
        )

    def evaluate_text_sync(
        self,
        prompt_messages: List[Dict[str, str]],
        text_to_evaluate: str, # Note: Placeholder, see async version
        model_override: Optional[str] = None,
        temperature: float = 0.0,
        max_tokens: int = 150,
        top_p: float = 1.0,
        request_logprobs: bool = True,
        request_top_logprobs: Optional[int] = 5,
        additional_provider_kwargs: Optional[Dict[str, Any]] = None
    ) -> TextEvaluationResult:
        """
        Synchronous version of evaluate_text.
        """
        # This logic mirrors LogProbRanker.rank_outputs_sync
        try:
            # Try to get the current event loop.
            loop = asyncio.get_event_loop()
            if loop.is_running():
                # This case is tricky. For simplicity in a script, direct execution in a new loop is common.
                # If called from within an existing async context that needs to continue,
                # this approach might not be ideal without tools like nest_asyncio.
                # Given this is often for CLI or simple scripts, creating a new loop is a common pattern.
                pass # Proceed to new loop logic if current one is running
        except RuntimeError: # No current event loop on this thread
            loop = None # Ensure loop is None if get_event_loop fails

        # Always create a new loop for this sync call to avoid conflicts, similar to rank_outputs_sync
        policy = asyncio.get_event_loop_policy()
        original_loop = policy.get_event_loop() if loop and loop.is_running() else None # Store if exists and running
        
        new_loop = policy.new_event_loop()
        asyncio.set_event_loop(new_loop)
        
        try:
            result = new_loop.run_until_complete(
                self.evaluate_text(
                    prompt_messages=prompt_messages,
                    text_to_evaluate=text_to_evaluate,
                    model_override=model_override,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    top_p=top_p,
                    request_logprobs=request_logprobs,
                    request_top_logprobs=request_top_logprobs,
                    additional_provider_kwargs=additional_provider_kwargs
                )
            )
            return result
        finally:
            new_loop.close()
            asyncio.set_event_loop(original_loop) # Restore original loop if one was running

    async def score_text_attributes(
        self,
        text_to_evaluate: str,
        custom_attributes_template: Optional[str] = None,
        model_override: Optional[str] = None,
        temperature: float = 0.0, # Typically 0 for deterministic evaluation
        max_tokens: Optional[int] = None, # Max tokens for the evaluation response
        top_p: float = 1.0,
        request_top_logprobs: Optional[int] = None, # How many top logprobs for evaluation call
        additional_provider_kwargs: Optional[Dict[str, Any]] = None
    ) -> List[AttributeScore]:
        """
        Scores a given text against a set of attributes using an LLM evaluation.
        It extracts logprobs for 'true'/'false' tokens corresponding to each attribute.
        Args:
            text_to_evaluate: The text to be scored.
            custom_attributes_template: Optional JSON-like string template defining attributes.
                                      If None, uses self.config.template.
                                      Example: '{"is_clear": LOGPROB_TRUE, "is_concise": LOGPROB_TRUE}'
            model_override: Optional model to use for this specific evaluation call.
            temperature: Temperature for the evaluation LLM call.
            max_tokens: Max tokens for the evaluation LLM response.
            top_p: Top_p for the evaluation LLM call.
            request_top_logprobs: Number of top logprobs for the evaluation LLM call.
                                  Defaults to self.config.evaluation_top_logprobs or 5.
            additional_provider_kwargs: Additional kwargs for the LLM provider.
        Returns:
            A list of AttributeScore objects.
        """
        effective_model = model_override if model_override is not None else self.model
        template_to_use = custom_attributes_template if custom_attributes_template is not None else self.config.template
        
        # 1. Format evaluation prompt
        evaluation_formatted_prompt = format_evaluation_prompt(
            self.config.evaluation_prompt,
            text_to_evaluate,
            template_to极狐_to_use
        )
        evaluation_messages = [
            {"role": "system", "content": "You are an evaluator that outputs JSON with boolean values."},
            {"role": "user", "content": evaluation_formatted_prompt}
        ]

        # 2. Call LLM for evaluation
        actual_max_tokens = max_tokens if max_tokens is not None else self.config.max_tokens
        actual_top_logprobs = request_top_logprobs
        if actual_top_logprobs is None:
            actual_top_logprobs = self.config.evaluation_top_logprobs if hasattr(self.config, 'evaluation_top_logprobs') and self.config.evaluation_top_logprobs is not None else 5

        params = ChatCompletionParams(
            messages=evaluation_messages,
            temperature=temperature,
            max_tokens=actual_max_tokens,
            top_p=top_p,
            model_override=effective_model,
            request_logprobs_override=True, # Must be true for this method
            request_top_logprobs_override=actual_top_logprobs,
            additional_provider_kwargs=additional_provider_kwargs or {}
        )
        response_data = await self._create_chat_completion(params)

        eval_tokens_with_logprobs = response_data.get("raw_token_logprobs")
        if eval_tokens_with_logprobs is None:
            raise LogprobsNotAvailableError(
                f"Evaluation response for model {effective_model} is missing 'raw_token_logprobs'. Response: {response_data}"
            )

        # 3. Extract attribute names from the template
        attributes_list = extract_template_attributes(template_to_use)

        # 4. Construct AttributeScore objects (adapted from LogProbRanker.generate_and_evaluate_output)
        attribute_scores_list: List[AttributeScore] = []
        current_token_stream_idx = 0

        for attr_name in attributes_list:
            attr_actual_logprob = 0.0
            explanation_str = f"Value token for '{attr_name}' not found or logprob extraction failed."
            found_this_attribute_value = False

            key_search_start_idx = current_token_stream_idx
            colon_search_start_idx = -1
            value_search_start_idx = -1

            # Phase A: Find attribute key
            for j_start_token_idx in range(key_search_start_idx, len(eval_tokens_with_logprobs)):
                accumulated_key_text = ""
                for k_current_token_idx in range(j_start_token_idx, len(eval_tokens_with_logprobs)):
                    token_k_raw_text = eval_tokens_with_logprobs[k_current_token_idx][0]
                    if token_k_raw_text.strip() in [":", "{", "}", "[", "]", ","] or '" :' in token_k_raw_text or ':"' in token_k_raw_text or token_k_raw_text == '"':
                        break
                    accumulated_key_text += token_k_raw_text
                    normalized_accumulated_key = accumulated_key_text.strip()
                    if normalized_accumulated_key.startswith('{"') and normalized_accumulated_key.endswith('"'):
                        normalized_accumulated_key = normalized_accumulated_key[2:-1]
                    elif normalized_accumulated_key.startswith('"') and normalized_accumulated_key.endswith('"'):
                        normalized_accumulated_key = normalized_accumulated_key[1:-1]
                    if normalized_accumulated_key == attr_name:
                        colon_search_start_idx = k_current_token_idx + 1
                        break
                    elif len(normalized_accumulated_key) > len(attr_name) + 5 or (len(normalized_accumulated_key) > 0 and not attr_name.startswith(normalized_accumulated_key.strip('"'))):
                        break 
                if colon_search_start_idx != -1:
                    break
            
            # Phase B: Find colon
            if colon_search_start_idx != -1:
                for i in range(colon_search_start_idx, len(eval_tokens_with_logprobs)):
                    if ":" in eval_tokens_with_logprobs[i][0]:
                        value_search_start_idx = i + 1
                        break
                    if (eval_tokens_with_logprobs[i][0].startswith('"') and i > colon_search_start_idx) or eval_tokens_with_logprobs[i][0] in ["}", "]"]:
                        value_search_start_idx = -1; break
            
            # Phase C: Find 'true' or 'false' token
            if value_search_start_idx != -1 and value_search_start_idx < len(eval_tokens_with_logprobs):
                for i in range(value_search_start_idx, len(eval_tokens_with_logprobs)):
                    token_s, token_lp = eval_tokens_with_logprobs[i]
                    normalized_token_s = token_s.strip().lower().replace('"', '')
                    match_found = normalized_token_s in ("true", "false")
                    if match_found:
                        # A logprob of 0.0 (probability 1.0) is highly suspicious for a specific token
                        # in this context and often indicates an upstream issue (e.g., API key error,
                        # model not returning valid logprobs, or LiteLLM defaulting).
                        if token_lp == 0.0:
                            raise ValueError(
                                f"Received a suspicious logprob of 0.0 (probability 1.0) for token '{token_s.strip()}' "
                                f"for attribute '{attr_name}'. This may indicate an API key problem or an "
                                f"issue with the LLM/LiteLLM returning valid logprobs."
                            )
                        
                        attr_actual_logprob = token_lp
                        explanation_str = f"Logprob of token '{token_s.strip()}' for '{attr_name}' is {token_lp:.4f}"
                        current_token_stream_idx = i + 1
                        found_this_attribute_value = True
                        break
                    if token_s in [",", "}", "]"] or (token_s.startswith('"') and i > value_search_start_idx):
                        break # End of value or next item
            
            if found_this_attribute_value:
                attribute_scores_list.append(AttributeScore(name=attr_name, score=attr_actual_logprob, explanation=explanation_str))
            else:
                # If the attribute's value token (true/false) was not found or logprob extraction failed,
                # raise an error instead of defaulting to a 0.0 score.
                # The explanation_str (from line 826) already details this.
                raise ValueError(explanation_str)
        
        return attribute_scores_list

    def score_text_attributes_sync(
        self,
        text_to_evaluate: str,
        custom_attributes_template: Optional[str] = None,
        model_override: Optional[str] = None,
        temperature: float = 0.0,
        max_tokens: Optional[int] = None,
        top_p: float = 1.0,
        request_top_logprobs: Optional[int] = None,
        additional_provider_kwargs: Optional[Dict[str, Any]] = None
    ) -> List[AttributeScore]:
        """
        Synchronous version of score_text_attributes.
        """
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                pass
        except RuntimeError:
            loop = None

        policy = asyncio.get_event_loop_policy()
        original_loop = policy.get_event_loop() if loop and loop.is_running() else None
        
        new_loop = policy.new_event_loop()
        asyncio.set_event_loop(new_loop)
        
        try:
            result = new_loop.run_until_complete(
                self.score_text_attributes(
                    text_to_evaluate=text_to_evaluate,
                    custom_attributes_template=custom_attributes_template,
                    model_override=model_override,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    top_p=top_p,
                    request_top_logprobs=request_top_logprobs,
                    additional_provider_kwargs=additional_provider_kwargs
                )
            )
            return result
        finally:
            new_loop.close()
            asyncio.set_event_loop(original_loop)
