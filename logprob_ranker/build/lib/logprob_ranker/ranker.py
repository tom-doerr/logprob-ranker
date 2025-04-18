"""
Core implementation of the LogProb ranking algorithm for evaluating LLM outputs.
"""

import asyncio
import json
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional, Callable, Union
from concurrent.futures import ThreadPoolExecutor
from .utils import (
    parse_evaluation_json,
    extract_template_attributes,
    calculate_logprob_score,
    sort_ranked_outputs,
    format_evaluation_prompt
)


@dataclass
class AttributeScore:
    """
    Represents an attribute and its associated score from the evaluation.
    """
    name: str
    score: float


@dataclass
class RankedOutput:
    """
    Represents a generated output with its evaluation scores and metadata.
    """
    output: str
    logprob: float
    index: int
    attribute_scores: Optional[List[AttributeScore]] = None
    raw_evaluation: Optional[str] = None


@dataclass
class LogProbConfig:
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
        
        # Extract attribute names from the template
        self.attributes = extract_template_attributes(self.config.template)
    
    async def generate_and_evaluate_output(self, prompt: str, index: int) -> Optional[RankedOutput]:
        """
        Generate a single output and evaluate it according to the criteria template.
        
        Args:
            prompt: The prompt to generate content from
            index: The index of this generation in the batch
            
        Returns:
            A RankedOutput object or None if generation failed
        """
        try:
            # Generate content
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
            
            # Extract generated content
            generated_text = generation_response["choices"][0]["message"]["content"]
            
            # Create evaluation prompt
            evaluation_prompt = format_evaluation_prompt(
                template=self.config.template,
                generated_text=generated_text,
                eval_prompt=self.config.evaluation_prompt
            )
            
            # Evaluate the generated content
            evaluation_messages = [
                {"role": "system", "content": self.config.evaluation_prompt},
                {"role": "user", "content": evaluation_prompt}
            ]
            
            evaluation_response = await self._create_chat_completion(
                messages=evaluation_messages,
                temperature=0.0,  # Use low temperature for consistent evaluations
                max_tokens=500,
                top_p=1.0
            )
            
            # Extract evaluation
            evaluation_text = evaluation_response["choices"][0]["message"]["content"]
            evaluation_json = parse_evaluation_json(evaluation_text)
            
            # Calculate scores
            attribute_scores = []
            for attr in self.attributes:
                # Convert boolean to score (true = 1.0, false = 0.0)
                score = 1.0 if evaluation_json.get(attr, False) else 0.0
                attribute_scores.append(AttributeScore(name=attr, score=score))
            
            # Calculate overall logprob score
            logprob = calculate_logprob_score(attribute_scores)
            
            # Create result
            result = RankedOutput(
                output=generated_text,
                logprob=logprob,
                index=index,
                attribute_scores=attribute_scores,
                raw_evaluation=evaluation_text
            )
            
            # Call callback if provided
            if self.on_output_callback:
                self.on_output_callback(result)
                
            return result
        
        except Exception as e:
            # Log error and return None to indicate failure
            print(f"Error generating output {index}: {str(e)}")
            return None
    
    async def rank_outputs(self, prompt: str) -> List[RankedOutput]:
        """
        Generate multiple outputs for the prompt and rank them by log probability.
        
        Args:
            prompt: The prompt to generate content from
            
        Returns:
            A list of RankedOutput objects sorted by logprob (highest first)
        """
        tasks = []
        for i in range(self.config.num_variants):
            tasks.append(self.generate_and_evaluate_output(prompt, i))
        
        # Use thread count for parallel execution
        if self.config.thread_count > 1:
            # Split tasks into batches based on thread count
            batched_results = []
            for i in range(0, len(tasks), self.config.thread_count):
                batch = tasks[i:i + self.config.thread_count]
                batch_results = await asyncio.gather(*batch)
                batched_results.extend(batch_results)
            
            results = batched_results
        else:
            # Sequential execution
            results = await asyncio.gather(*tasks)
        
        # Filter out None results (failed generations)
        results = [r for r in results if r is not None]
        
        # Sort by logprob score (highest first)
        sorted_results = sort_ranked_outputs(results)
        
        return sorted_results
    
    def rank_outputs_sync(self, prompt: str) -> List[RankedOutput]:
        """
        Synchronous version of rank_outputs.
        
        Args:
            prompt: The prompt to generate content from
            
        Returns:
            A list of RankedOutput objects sorted by logprob (highest first)
        """
        return asyncio.run(self.rank_outputs(prompt))
    
    async def _create_chat_completion(self, messages, temperature, max_tokens, top_p):
        """
        Create a chat completion using the provided LLM client.
        
        This is an internal method that adapts to different LLM client implementations.
        Override this in a subclass to support different LLM clients.
        
        Args:
            messages: List of message objects (role and content)
            temperature: Temperature parameter for generation
            max_tokens: Maximum tokens to generate
            top_p: Top-p sampling parameter
            
        Returns:
            The raw response from the LLM client
        """
        # Default implementation for OpenAI-like clients
        response = await self.llm_client.chat.completions.create(
            model="gpt-3.5-turbo",  # Default model
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            top_p=top_p
        )
        
        # Convert the response to a simple dict format
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


class OpenAIAdapter(LogProbRanker):
    """Adapter for the OpenAI API client"""
    
    async def _create_chat_completion(self, messages, temperature, max_tokens, top_p):
        # Use the client to create a chat completion
        response = await self.llm_client.chat.completions.create(
            model="gpt-3.5-turbo",  # You can configure this if needed
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            top_p=top_p
        )
        
        # Convert the response to a simple dict format
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


class AnthropicAdapter(LogProbRanker):
    """Adapter for the Anthropic API client"""
    
    async def _create_chat_completion(self, messages, temperature, max_tokens, top_p):
        # Convert messages to Anthropic format
        system = None
        prompt = ""
        
        for msg in messages:
            if msg["role"] == "system":
                system = msg["content"]
            elif msg["role"] == "user":
                prompt += f"\n\nHuman: {msg['content']}"
            elif msg["role"] == "assistant":
                prompt += f"\n\nAssistant: {msg['content']}"
        
        prompt += "\n\nAssistant:"
        
        # Call Anthropic API
        response = await self.llm_client.completions.create(
            model="claude-2",  # You can configure this
            prompt=prompt,
            max_tokens_to_sample=max_tokens,
            temperature=temperature,
            system=system
        )
        
        # Convert to the expected format
        return {
            "choices": [
                {
                    "message": {
                        "role": "assistant",
                        "content": response.completion
                    }
                }
            ]
        }