"""
Core implementation of the LogProb ranking algorithm for evaluating LLM outputs.
"""

import asyncio
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional, Callable
import litellm
# No longer need BaseModel, Field, ConfigDict, field_validator from pydantic here
# as they are used in models.py

from .utils import (
    parse_evaluation_json,
    extract_template_attributes,
    calculate_logprob_score,
    sort_ranked_outputs,
    format_evaluation_prompt,
    LLMGenerationError,
    EvaluationParseError
)
from .models import AttributeScore, RankedOutput, LogProbConfig # Import models


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
        pass

    async def generate_and_evaluate_output(self, prompt: str, index: int) -> Optional[RankedOutput]:
        """
        Generate a single output and evaluate it.
        
        Args:
            prompt: The prompt to generate from
            index: The index of this output for error reporting
            
        Returns:
            A RankedOutput containing the output and its scores, or None if generation failed
            
        Raises:
            RuntimeError: If generation or evaluation fails
        """
        try:
            # Generate output
            generation_messages = [
                {"role": "system", "content": self.config.system_prompt},
                {"role": "user", "content": prompt}
            ]
            
            generation_response = await self._create_chat_completion(
                messages=generation_messages,
                temperature=self.config.temperature,
                max_tokens=self.config.max_tokens,
                top_p=self.config.top_p
            )
            
            output = generation_response["choices"][0]["message"]["content"]
            
            # Generate evaluation
            evaluation_formatted_prompt = format_evaluation_prompt(
                self.config.evaluation_prompt,
                output,
                self.config.template
            )
            
            evaluation_messages = [
                {"role": "system", "content": "You are an evaluator."},
                {"role": "user", "content": evaluation_formatted_prompt}
            ]
            
            evaluation_response = await self._create_chat_completion(
                messages=evaluation_messages,
                temperature=0,  # Use temperature 0 for deterministic evaluation
                max_tokens=self.config.max_tokens, # Max tokens for evaluation can be different
                top_p=1.0
            )
            
            raw_evaluation = evaluation_response["choices"][0]["message"]["content"]

            # 1. Parse the raw evaluation JSON string into a dictionary
            parsed_evaluation_dict = parse_evaluation_json(raw_evaluation)
            
            # 2. Extract attribute names from the template
            attributes_list = extract_template_attributes(self.config.template)
            
            # 3. Construct AttributeScore objects based on parsed_evaluation_dict and attributes_list
            attribute_scores = []
            for attr_name in attributes_list:
                # Determine score: 1.0 if attribute is true, 0.0 otherwise. Handles missing attributes gracefully (as false).
                # LLM is expected to return boolean true/false for attributes in parsed_evaluation_dict.
                attr_value = parsed_evaluation_dict.get(attr_name)
                score = 0.0
                explanation = ""
                if isinstance(attr_value, bool) and attr_value is True:
                    score = 1.0
                elif isinstance(attr_value, dict) and attr_value.get("score") is not None: # For more complex attribute structures if ever needed
                     score = float(attr_value.get("score", 0.0))
                     explanation = str(attr_value.get("explanation", ""))
                elif attr_value: # Fallback for truthy values if not strictly boolean true, though template implies booleans
                    score = 1.0

                attribute_scores.append(AttributeScore(name=attr_name, score=score, explanation=explanation))
                
            # 4. Calculate the overall logprob score using the parsed dictionary and the list of attributes
            logprob_score = calculate_logprob_score(parsed_evaluation_dict, attributes_list)
            
            return RankedOutput(
                    output=output,
                    logprob=logprob_score,
                    index=index,
                    attribute_scores=attribute_scores,
                    raw_evaluation=raw_evaluation
                )

        except LLMGenerationError as e:
            # Specific error from _create_chat_completion
            # print(f"LLM generation error for output {index}: {e}") # Logging can be handled by caller or configured
            raise LLMGenerationError(f"LLM generation failed for output {index}: {e}") from e
        except EvaluationParseError as e: # Catching the specific error from utils.parse_evaluation_json
            # print(f"Evaluation parsing error for output {index}: {e}")
            # raw_evaluation might not be defined if error occurs before its assignment, but it's in the original message
            raise EvaluationParseError(f"Evaluation parsing failed for output {index}: {str(e)}") from e
        except Exception as e: # Catch any other unexpected errors
            # Log the unexpected error for diagnostics
            # print(f"Unexpected error generating and evaluating output {index}: {e}")
            raise RuntimeError(f"Unexpected error generating and evaluating output {index}: {e}") from e

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
        
        # Use asyncio.gather to run tasks concurrently
        # return_exceptions=True allows us to handle individual task failures
        results = await asyncio.gather(*tasks, return_exceptions=True)
        ranked_outputs = [] # Initialize ranked_outputs
        errors_encountered = [] # Let's track errors explicitly
        for i, result in enumerate(results):
            # print(f"DEBUG: Result for task {i}, type: {type(result)}, content: {str(result)[:100]}") # DEBUG line
            if isinstance(result, Exception):
                # Log or handle errors for individual tasks
                # For now, we print and skip, but could collect errors or re-raise a summary error
                print(f"Error processing output variant {i}: {result}")
                errors_encountered.append(result) # Populate errors_encountered
            elif result is not None: # Ensure result is not None before appending
                ranked_outputs.append(result)
                if self.on_output_callback:
                    try:
                        self.on_output_callback(result)
                    except Exception as cb_e:
                        print(f"Error in on_output_callback for output {i}: {cb_e}") # Avoid callback errors stopping everything
            # If result is None and not an exception, it means generate_and_evaluate_output returned None explicitly (though current impl raises)

        # If all tasks resulted in errors, raise a single RuntimeError
        if not ranked_outputs and errors_encountered:
            error_messages = "; ".join([str(e) for e in errors_encountered])
            # print(f"DEBUG_RANKER: About to raise final RuntimeError. errors_encountered: {len(errors_encountered)}, ranked_outputs: {len(ranked_outputs)}")
            raise RuntimeError(f"All tasks failed to generate and evaluate outputs. Errors: {error_messages}")

        return sort_ranked_outputs(ranked_outputs)

    def rank_outputs_sync(self, prompt: str) -> List[RankedOutput]:
        """
        Synchronous version of rank_outputs.
        
        Args:
            prompt: The prompt to generate content from
            
        Returns:
            A list of RankedOutput objects sorted by logprob (highest first)
        """
        try:
            # Get or create an event loop for this thread
            try:
                loop = asyncio.get_event_loop()
            except RuntimeError:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
            
            # Run the async function
            result = loop.run_until_complete(self.rank_outputs(prompt))
            
            return result
        except Exception as e:
            print(f"Error in rank_outputs_sync: {str(e)}")
            raise


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
    
    async def _execute_litellm_completion(self, model, messages, temperature, max_tokens, top_p, **kwargs):
        """
        Helper method to execute litellm.acompletion and format response.
        """
        try:
            response = await litellm.acompletion(
                model=model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                top_p=top_p,
                logprobs=True,  # Request logprobs
                **kwargs
            )
            # DEBUG: Print the full response object to inspect logprobs
            try:
                # Assuming response is a Pydantic model or has model_dump_json
                print(f"DEBUG_RANKER: Full LiteLLM response object:\n{response.model_dump_json(indent=2)}") 
            except AttributeError:
                # Fallback if model_dump_json is not available (e.g., it's a dict or other object)
                print(f"DEBUG_RANKER: Full LiteLLM response object (not a Pydantic model or no model_dump_json):\n{response}") 

            # Return in standardized format
            return {
                "choices": [
                    {
                        "message": {
                            "role": response.choices[0].message.role,
                            "content": response.choices[0].message.content
                        }
                    }
                ]
            }
        except litellm.exceptions.APIError as e:
            # Catch specific LiteLLM API errors if possible
            raise LLMGenerationError(f"LiteLLM API error for model {model}: {e}") from e
        except Exception as e:
            # Catch any other exception during LiteLLM call
            raise LLMGenerationError(f"LiteLLM completion failed for model {model}: {e}") from e

    async def _create_chat_completion(self, messages: List[Dict[str, str]], temperature: float, max_tokens: int, top_p: float) -> Dict[str, Any]:
        """
        Create a chat completion using LiteLLM.
        """
        # Call the helper method with adapter's model and kwargs
        return await self._execute_litellm_completion(
            model=self.model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            top_p=top_p,
            **self.kwargs
        )

# == Utility Functions ==