"""
Core implementation of the LogProb ranking algorithm for evaluating LLM outputs.
"""

import asyncio
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional, Callable
import litellm
import litellm.exceptions as litellm_exceptions # Import real exceptions
from litellm.utils import ModelResponse # Added for type hinting
# No longer need BaseModel, Field, ConfigDict, field_validator from pydantic here
# as they are used in models.py

from .utils import (
    parse_evaluation_json,
    extract_template_attributes,
    sort_ranked_outputs,
    format_evaluation_prompt
)
from .models import AttributeScore, RankedOutput, LogProbConfig # Import models


class LLMGenerationError(Exception):
    """Custom exception for errors during LLM generation."""
    pass  # pylint: disable=unnecessary-pass


class EvaluationParseError(Exception):
    """Custom exception for errors during evaluation string parsing."""
    pass  # pylint: disable=unnecessary-pass


class LogprobsNotAvailableError(LLMGenerationError):
    """Custom exception for when logprobs are expected but not available or processable."""
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
    async def _create_chat_completion(self, messages: List[Dict[str, str]], temperature: float, max_tokens: int, top_p: float) -> Dict[str, Any]:
        """
        Abstract method to create a chat completion using an LLM.
        Subclasses must implement this method.
        
        Args:
            messages: List of message objects (role and content)
            temperature: Temperature parameter for generation
            max_tokens: Maximum tokens to generate
            top_p: Top-p sampling parameter
            
        Returns:
            The raw response from the LLM client, expected in a standardized format.
        
        Raises:
            LLMGenerationError: If the LLM call fails.
        """
        pass  # pylint: disable=unnecessary-pass

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
            
            generation_response_data = await self._create_chat_completion(
                messages=generation_messages,
                temperature=self.config.temperature,
                max_tokens=self.config.max_tokens,
                top_p=self.config.top_p
            )
            
            generated_output_content = generation_response_data["content"]
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
            evaluation_llm_response_data = await self._create_chat_completion(
                messages=evaluation_messages,
                temperature=0,  # Use temperature 0 for deterministic evaluation
                max_tokens=self.config.max_tokens, 
                top_p=1.0
            )
            
            raw_evaluation_text = evaluation_llm_response_data["content"]
            eval_tokens_with_logprobs: List[Tuple[str, float]] = evaluation_llm_response_data["raw_token_logprobs"]

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

                # Phase A: Find attribute key (e.g., "interesting")
                for i in range(key_search_start_idx, len(eval_tokens_with_logprobs)):
                    # Simplified: check if attr_name (e.g. 'interesting') is part of token (e.g. '"interesting"')
                    # This is not robust for multi-token keys or complex JSON.
                    if attr_name in eval_tokens_with_logprobs[i][0]:
                        colon_search_start_idx = i # Start searching for colon from here
                        break
                
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

                        if normalized_token_s == "true" or normalized_token_s == "false":
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
        **kwargs
    ):
        """
        Initialize the LiteLLM adapter.
        
        Args:
            model: The model identifier (e.g., "gpt-4", "claude-2", "command-nightly")
            api_key: Optional API key (uses env variables if not provided)
            config: Optional configuration settings
            on_output_callback: Optional callback function
            **kwargs: Additional parameters to pass to LiteLLM
        """
        super().__init__(None, config, on_output_callback)
        self.model = model
        self.api_key = api_key # Retain for potential direct use if needed, though primary mechanism is via kwargs
        self.kwargs = kwargs
        
        # If api_key is provided, add it to kwargs to be passed to litellm.acompletion
        # This avoids setting global litellm keys and aligns with user rule.
        if api_key:
            self.kwargs["api_key"] = api_key
    
    def _extract_raw_token_logprobs(self, response: Optional[ModelResponse]) -> List[Tuple[str, float]]:
        """Extracts (token_string, logprob) tuples from the LiteLLM ModelResponse."""
        if not response:
            raise LogprobsNotAvailableError("LiteLLM response object is None, cannot extract logprobs.")
        # The initial `if not response:` check handles None response.
        # The rest of the logic will proceed without a broad try-except.
        # Specific issues like missing attributes will raise AttributeError, which is more informative.

        if not response.choices or not response.choices[0]:
            print("DEBUG_RANKER: _extract_raw_token_logprobs - Response choices list is empty/invalid. Returning empty list.")
            return []

        choice = response.choices[0]

        if not hasattr(choice, 'logprobs') or choice.logprobs is None:
            print("DEBUG_RANKER: _extract_raw_token_logprobs - No 'logprobs' attribute on choice object or it is None. Returning empty list.")
            return []

        # Assuming logprobs is an object with a 'content' attribute which is a list of logprob items
        if not hasattr(choice.logprobs, 'content') or not isinstance(choice.logprobs.content, list):
            # If 'content' is missing or not a list, we can't iterate. If it's an empty list, the loop won't run.
            print("DEBUG_RANKER: _extract_raw_token_logprobs - 'logprobs.content' is missing, not a list, or empty. Returning empty list.")
            return []

        raw_token_logprobs: List[Tuple[str, float]] = []
        for logprob_item in choice.logprobs.content: # Iterates if content is a list (even if empty)
            # Standard LiteLLM LogprobItem structure has 'token' and 'logprob'
            if hasattr(logprob_item, 'token') and isinstance(logprob_item.token, str) and \
               hasattr(logprob_item, 'logprob') and isinstance(logprob_item.logprob, (int, float)):
                raw_token_logprobs.append((logprob_item.token, logprob_item.logprob))
            else:
                # This case might indicate an unexpected structure in logprobs.content
                print(f"DEBUG_RANKER: Logprob item has unexpected structure: {logprob_item}. Skipping.")
        
        # If the loop completes and raw_token_logprobs is empty, it means no valid logprobs were found or content was empty.
        # The list will be returned as is (empty or populated).
        if not raw_token_logprobs and choice.logprobs.content: # Only print if content was there but nothing was extracted
            print("DEBUG_RANKER: _extract_raw_token_logprobs - Extracted list is empty, but logprobs.content was present. Check item structure.")
        elif not choice.logprobs.content:
            print("DEBUG_RANKER: _extract_raw_token_logprobs - logprobs.content was empty. Returning empty list.")

        return raw_token_logprobs

    def _calculate_average_token_logprob(self, token_logprobs: List[Tuple[str, float]]) -> float:
        """Calculates the average of a list of token logprobs."""
        if not token_logprobs:
            print("DEBUG_RANKER: _calculate_average_token_logprob - Token logprobs list is empty. Returning 0.0.")
            return 0.0 # Return 0.0 if the list is empty
        try:
            if not all(isinstance(lp, (int, float)) for lp in token_logprobs):
                print("DEBUG_RANKER: _calculate_average_token_logprob - All items in token_logprobs must be numbers. Raising ValueError.")
                raise ValueError("All items in token_logprobs must be numbers.")
            return sum(token_logprobs) / len(token_logprobs)
        except TypeError as e: # Catch specific TypeError if sum/len fails on unexpected content despite check
            print(f"DEBUG_RANKER: _calculate_average_token_logprob - TypeError: {e}. Raising ValueError.")
            raise ValueError(f"Error calculating average token logprob due to type error: {e}") from e

    async def _execute_litellm_completion(self, model, messages, temperature, max_tokens, top_p, **kwargs):
        """
        Helper method to execute litellm.acompletion and format response.
        """
        # Prepare parameters for litellm.acompletion
        litellm_params = kwargs.copy()

        # If 'api_key' is present in litellm_params and is None,
        # remove it so LiteLLM can fall back to environment variables.
        # .get() is used to safely check for presence and None value.
        # .pop(key, None) safely removes the key if it exists.
        if "api_key" in litellm_params and litellm_params["api_key"] is None:
            litellm_params.pop("api_key")

        response_obj: Optional[ModelResponse] = None # Initialize response_obj
        try:
            response_obj = await litellm.acompletion(
                model=model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                top_p=top_p,
                logprobs=True,  # Explicitly request logprobs
                **litellm_params
            )

            raw_token_logprobs_list = self._extract_raw_token_logprobs(response_obj)
        
            # DEBUG: Print the full response object if available
            if response_obj:
                try:
                    # print(f"DEBUG_RANKER: Full LiteLLM response object (_execute_litellm_completion for {model}):\n{response_obj.model_dump_json(indent=2)}")
                    pass # Keep debug minimal for now
                except AttributeError:
                    # print(f"DEBUG_RANKER: Full LiteLLM response object (not Pydantic or no model_dump_json) (_execute_litellm_completion for {model}):\n{response_obj}")
                    pass # Keep debug minimal for now
            # else:
                # print(f"DEBUG_RANKER: LiteLLM response object was None (_execute_litellm_completion for {model}).")

            if not response_obj or not response_obj.choices or not response_obj.choices[0] or \
               not response_obj.choices[0].message or response_obj.choices[0].message.content is None:
                # print(f"DEBUG_RANKER: Critical information missing in LiteLLM response for model {model}.")
                raise LLMGenerationError(f"LiteLLM response missing critical information for model {model}.")

            return {
                "content": response_obj.choices[0].message.content,
                "role": response_obj.choices[0].message.role,
                "raw_token_logprobs": raw_token_logprobs_list # Return the list of (token, logprob) tuples
            }

        except litellm_exceptions.APIError as e:
            raise LLMGenerationError(f"LiteLLM API error for model {model}: {e}") from e
        except Exception as e: # Catch other exceptions, including LogprobsNotAvailableError
            if isinstance(e, LogprobsNotAvailableError):
                print(f"DEBUG_RANKER: Caught LogprobsNotAvailableError for model {model}. Details: {e}")
                if response_obj: # Check if response_obj exists before trying to dump it
                    try:
                        print(f"DEBUG_RANKER: Full LiteLLM response object that caused LogprobsNotAvailableError:\n{response_obj.model_dump_json(indent=2)}")
                    except AttributeError:
                        print(f"DEBUG_RANKER: Full LiteLLM response object (not Pydantic or no model_dump_json) that caused LogprobsNotAvailableError:\n{response_obj}")
                else:
                    print(f"DEBUG_RANKER: LiteLLM response_obj was None when LogprobsNotAvailableError occurred.")
            # else:
                # For other types of exceptions, you might want different logging
                # if response_obj:
                #     try:
                #         print(f"DEBUG_RANKER: LiteLLM response object during other Exception ({type(e).__name__}):\n{response_obj.model_dump_json(indent=2)}")
                #     except AttributeError:
                #         print(f"DEBUG_RANKER: LiteLLM response object (not Pydantic or no model_dump_json) during other Exception ({type(e).__name__}):\n{response_obj}")
            raise LLMGenerationError(f"LiteLLM completion failed for model {model}: {e}") from e

    async def _create_chat_completion(self, messages: List[Dict[str, str]], temperature: float, max_tokens: int, top_p: float, model: Optional[str] = None, **kwargs) -> Dict[str, Any]:
        """Create a chat completion using LiteLLM, handling potential errors and extracting logprobs."""
        model_to_call = model if model is not None else self.model
        # Use self.api_key from instance attributes
        return await self._execute_litellm_completion(
            model=model_to_call, 
            messages=messages, 
            temperature=temperature, 
            max_tokens=max_tokens, 
            top_p=top_p, 
            api_key=self.api_key, 
            **kwargs
        )

# == Utility Functions ==