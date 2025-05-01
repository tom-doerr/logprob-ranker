"""
Core implementation of the LogProb ranking algorithm for evaluating LLM outputs.
"""

import asyncio
import json
from abc import ABC, abstractmethod
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Dict, Any, Optional, Callable, Union
import litellm
from pydantic import BaseModel, Field, ConfigDict
from .utils import (
    parse_evaluation_json,
    extract_template_attributes,
    calculate_logprob_score,
    sort_ranked_outputs,
    format_evaluation_prompt
)


class AttributeScore(BaseModel):
    """
    Represents an attribute and its associated score from the evaluation.
    """
    name: str
    score: float
    explanation: str = ""  # Optional explanation for the score


class RankedOutput(BaseModel):
    """
    Represents a generated output with its evaluation scores and metadata.
    """
    output: str
    logprob: float
    index: int
    attribute_scores: Optional[List[AttributeScore]] = None
    raw_evaluation: Optional[str] = None


# Configuration class using Pydantic BaseModel for V2 compatibility
class LogProbConfig(BaseModel):
    """
    Configuration for the LogProb ranker.
    """
    # LLM generation parameters
    temperature: float = 0.7
    max_tokens: int = 1000
    top_p: float = 1.0
    
    # Ranking parameters
    num_variants: int = 5
    thread_count: int = 1
    
    # Evaluation template (uses LOGPROB_TRUE placeholders)
    template: str = """{
  "interesting": LOGPROB_TRUE,
  "creative": LOGPROB_TRUE,
  "useful": LOGPROB_TRUE
}"""
    
    # Prompts
    system_prompt: str = "You are a creative assistant that provides a single concise response."
    evaluation_prompt: str = "You are an evaluator. Evaluate the following text based on the criteria.\nReturn ONLY a JSON object with your evaluation. Use JSON boolean values (true/false)."

    # Pydantic V2+ configuration
    model_config = ConfigDict(
        # Example: Allow extra fields if needed, though defaults are usually fine
        # extra = 'allow'
    )


class LogProbRanker:
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
        self.llm_client = llm_client
        self.config = config or LogProbConfig()
        self.on_output_callback = on_output_callback
    
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
            evaluation_prompt = format_evaluation_prompt(
                self.config.evaluation_prompt,
                output,
                self.config.template
            )
            
            evaluation_messages = [
                {"role": "system", "content": "You are an evaluator."},
                {"role": "user", "content": evaluation_prompt}
            ]
            
            evaluation_response = await self._create_chat_completion(
                messages=evaluation_messages,
                temperature=0.0,  # Use deterministic evaluation
                max_tokens=500,
                top_p=1.0
            )
            
            evaluation_text = evaluation_response["choices"][0]["message"]["content"]
            
            # Parse evaluation
            evaluation_data = parse_evaluation_json(evaluation_text)
            
            # Extract attributes from the potentially overridden template *now*
            current_attributes = extract_template_attributes(self.config.template)
            
            # Calculate scores
            attribute_scores = []
            for attr in current_attributes:
                score = 1.0 if evaluation_data.get(attr, False) else 0.0
                attribute_scores.append(AttributeScore(name=attr, score=score))
            
            logprob = calculate_logprob_score(evaluation_data, current_attributes)
            
            ranked_output = RankedOutput(
                output=output,
                logprob=logprob,
                index=index,
                attribute_scores=attribute_scores,
                raw_evaluation=evaluation_text
            )
            
            if self.on_output_callback:
                self.on_output_callback(ranked_output)
            
            return ranked_output
            
        except Exception as e:
            raise RuntimeError(f"Failed to process output {index}: {str(e)}") from e
    
    async def rank_outputs(self, prompt: str) -> List[RankedOutput]:
        """
        Generate multiple outputs for the prompt and rank them by log probability.
        
        Args:
            prompt: The prompt to generate content from
            
        Returns:
            A list of RankedOutput objects sorted by logprob (highest first)
        """
        tasks = []
        results = []
        errors = []

        # Create tasks for each variant
        for i in range(self.config.num_variants):
            task = asyncio.create_task(self.generate_and_evaluate_output(prompt, i))
            tasks.append(task)
        
        # Wait for all tasks to complete
        for task in asyncio.as_completed(tasks):
            try:
                result = await task
                if result is not None:
                    results.append(result)
            except Exception as e:
                errors.append(str(e))
                print(f"Error in task: {str(e)}")
                continue
        
        # If we have no valid results and encountered errors, raise the first error
        if not results and errors:
            raise RuntimeError(f"All tasks failed. First error: {errors[0]}")
        
        # Sort and return results
        return sort_ranked_outputs(results)
    
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
    
    async def _create_chat_completion(self, messages, temperature, max_tokens, top_p):
        """
        Create a chat completion using LiteLLM.
        
        This is an internal method that uses LiteLLM to call any supported LLM provider.
        
        Args:
            messages: List of message objects (role and content)
            temperature: Temperature parameter for generation
            max_tokens: Maximum tokens to generate
            top_p: Top-p sampling parameter
            
        Returns:
            The raw response from the LLM client
        """
        # Use LiteLLM to handle the completion request
        model = self.model if hasattr(self, 'model') else "gpt-3.5-turbo"
        
        # Make the completion request
        try:
            response = await litellm.acompletion(
                model=model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                top_p=top_p
            )
            
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
        except Exception as e:
            print(f"Error in LiteLLM completion: {str(e)}")
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
        self.api_key = api_key
        self.kwargs = kwargs
        
        # Set API key if provided
        if api_key:
            if "anthropic" in model.lower() or model.lower().startswith("claude"):
                litellm.anthropic_api_key = api_key
            elif "openai" in model.lower() or model.lower().startswith("gpt"):
                litellm.openai_api_key = api_key
            else:
                # Set a generic api_key and let LiteLLM handle it
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
                **kwargs
            )

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
        except Exception as e:
            # Include model in the error for easier debugging
            print(f"Error in LiteLLM completion with model {model}: {str(e)}")
            # Re-raise the exception to be handled by the caller
            raise

    async def _create_chat_completion(self, messages, temperature, max_tokens, top_p):
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