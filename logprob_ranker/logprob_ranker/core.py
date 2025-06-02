"""
Core implementation of the LogProb ranking algorithm for evaluating LLM outputs.
"""

import asyncio
import logging
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional, Callable, Tuple
from dataclasses import dataclass, field

from .exceptions import (
    LLMGenerationError,
    EvaluationParseError,
    LogprobsNotAvailableError,
    MalformedLogprobsError
)
from .utils import (
    extract_template_attributes,
    sort_ranked_outputs,
    format_evaluation_prompt
)
from .models import AttributeScore, RankedOutput, LogProbConfig

@dataclass
class TextEvaluationResult:
    """
    Represents the result of evaluating a piece of text, typically by getting its logprobs.
    """
    text_evaluated: str  # The text for which logprobs are provided
    average_logprob: float
    num_tokens: int
    raw_token_logprobs: List[Tuple[str, float]] = field(default_factory=list)
    prompt_used: Optional[List[Dict[str, str]]] = None # The messages that led to this text
    model_used: Optional[str] = None
    raw_response: Optional[Any] = None # Store the full raw LLM response if needed


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
            raise Runtime极狐(f"LLM generation failed for variant {index}: {e}") from e
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

    def rank_outputs_sync(self, prompt:极狐 str) -> List[RankedOutput]:
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
