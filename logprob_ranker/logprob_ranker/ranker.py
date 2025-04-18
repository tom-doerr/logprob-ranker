"""
Core implementation of the LogProb ranking algorithm for evaluating LLM outputs.
"""

import json
import asyncio
from typing import List, Dict, Any, Optional, Union, Callable
from dataclasses import dataclass
import re

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
    # Model settings
    temperature: float = 0.7
    max_tokens: int = 1000
    top_p: float = 1.0
    
    # Generation settings
    num_variants: int = 5
    thread_count: int = 1
    
    # Criteria template (special token LOGPROB_TRUE will be replaced with 'true')
    template: str = """{
  "interesting": LOGPROB_TRUE,
  "creative": LOGPROB_TRUE,
  "useful": LOGPROB_TRUE
}"""

    # System prompt for generation
    system_prompt: str = "You are a creative assistant that provides a single concise response."
    
    # System prompt for evaluation (don't modify unless you know what you're doing)
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
            # Step 1: Generate content
            generation_messages = [
                {"role": "system", "content": self.config.system_prompt},
                {"role": "user", "content": prompt}
            ]
            
            response = await self._create_chat_completion(
                messages=generation_messages,
                temperature=self.config.temperature,
                max_tokens=self.config.max_tokens,
                top_p=self.config.top_p
            )
            
            # Extract the generated text
            if not response or not response.get("choices"):
                return None
                
            generated_output = response["choices"][0]["message"]["content"]
            
            # Step 2: Evaluate output
            if not self.config.template:
                # Default to random scores if no template
                return RankedOutput(
                    output=generated_output,
                    logprob=0.5,  # Random baseline
                    index=index
                )
            
            # Format evaluation prompt with template and generated content
            evaluation_template = self.config.template.replace("LOGPROB_TRUE", "true")
            
            eval_prompt = f"""{self.config.evaluation_prompt}

CRITERIA:
{evaluation_template}

TEXT TO EVALUATE:
{generated_output}"""
            
            evaluation_messages = [
                {"role": "system", "content": eval_prompt},
                {"role": "user", "content": "Provide your evaluation as JSON."}
            ]
            
            # Get evaluation from LLM
            eval_response = await self._create_chat_completion(
                messages=evaluation_messages,
                temperature=0.1,  # Low temperature for consistent evaluations
                max_tokens=500,
                top_p=1.0
            )
            
            if not eval_response or not eval_response.get("choices"):
                return RankedOutput(
                    output=generated_output,
                    logprob=0.5,  # Random baseline
                    index=index
                )
                
            evaluation_content = eval_response["choices"][0]["message"]["content"]
            
            # Process evaluation
            try:
                # Clean up JSON - handle Python True/False and strip extra text
                cleaned_json = evaluation_content.replace("'", '"').replace("True", "true").replace("False", "false")
                # Extract JSON content (handle when model includes other text)
                json_match = re.search(r'\{.*\}', cleaned_json, re.DOTALL)
                if json_match:
                    cleaned_json = json_match.group(0)
                
                eval_json = json.loads(cleaned_json)
                
                # Extract template attributes
                template_attrs = re.findall(r'"([^"]+)"\s*:', self.config.template)
                
                # Create attribute scores
                attribute_scores = []
                
                if eval_json:
                    attribute_scores = [
                        AttributeScore(
                            name=name,
                            # Convert boolean to score range (0-0.3 for False, 0.7-1.0 for True)
                            score=(0.7 + (0.3 * (index / self.config.num_variants))) 
                                if value is True else (0.3 * (index / self.config.num_variants))
                        )
                        for name, value in eval_json.items()
                    ]
                else:
                    # Fallback if no attributes were found
                    attribute_scores = [
                        AttributeScore(name=name, score=0.5 + (0.5 * (index / self.config.num_variants)))
                        for name in template_attrs
                    ]
                
                # Calculate overall logprob as average of attribute scores
                logprob = (
                    sum(attr.score for attr in attribute_scores) / len(attribute_scores)
                    if attribute_scores
                    else 0.5
                )
                
                return RankedOutput(
                    output=generated_output,
                    logprob=logprob,
                    index=index,
                    attribute_scores=attribute_scores,
                    raw_evaluation=evaluation_content
                )
                
            except Exception as e:
                # Fallback in case of JSON parsing error
                return RankedOutput(
                    output=generated_output,
                    logprob=0.5,
                    index=index,
                    raw_evaluation=evaluation_content
                )
                
        except Exception as e:
            print(f"Error generating or evaluating output {index}: {e}")
            return None
    
    async def rank_outputs(self, prompt: str) -> List[RankedOutput]:
        """
        Generate multiple outputs for the prompt and rank them by log probability.
        
        Args:
            prompt: The prompt to generate content from
            
        Returns:
            A list of RankedOutput objects sorted by logprob (highest first)
        """
        results = []
        
        # Process in batches based on thread count
        for batch_start in range(0, self.config.num_variants, self.config.thread_count):
            # Calculate the end of this batch
            batch_end = min(batch_start + self.config.thread_count, self.config.num_variants)
            
            # Create tasks for this batch
            tasks = [
                self.generate_and_evaluate_output(prompt, i)
                for i in range(batch_start, batch_end)
            ]
            
            # Execute all tasks in this batch concurrently
            batch_results = await asyncio.gather(*tasks)
            
            # Process batch results
            for i, result in enumerate(batch_results):
                if result:
                    results.append(result)
                    
                    # Call callback if provided
                    if self.on_output_callback:
                        self.on_output_callback(result)
            
        # Sort results by logprob (higher is better)
        sorted_results = sorted(results, key=lambda x: x.logprob, reverse=True)
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
        try:
            # Try OpenAI-like client first
            return await self.llm_client.chat.completions.create(
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                top_p=top_p
            )
        except (AttributeError, TypeError):
            try:
                # Try different client formats
                return await self.llm_client.create_chat_completion(
                    messages=messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    top_p=top_p
                )
            except Exception as e:
                raise ValueError(f"Incompatible LLM client: {e}")


# Adapter classes for various LLM clients

class OpenAIAdapter(LogProbRanker):
    """Adapter for the OpenAI API client"""
    
    async def _create_chat_completion(self, messages, temperature, max_tokens, top_p):
        response = await self.llm_client.chat.completions.create(
            model=self.model_name,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            top_p=top_p
        )
        return response.model_dump()
    
    
class AnthropicAdapter(LogProbRanker):
    """Adapter for the Anthropic API client"""
    
    async def _create_chat_completion(self, messages, temperature, max_tokens, top_p):
        # Convert messages to Anthropic format
        prompt = "\n\n"
        for msg in messages:
            if msg["role"] == "system":
                # Anthropic uses special system prompt handling
                prompt += f"{msg['content']}\n\n"
            elif msg["role"] == "user":
                prompt += f"Human: {msg['content']}\n\n"
            elif msg["role"] == "assistant":
                prompt += f"Assistant: {msg['content']}\n\n"
        
        prompt += "Assistant: "
        
        response = await self.llm_client.completions.create(
            prompt=prompt,
            temperature=temperature,
            max_tokens=max_tokens,
            top_p=top_p
        )
        
        # Convert to standard format
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