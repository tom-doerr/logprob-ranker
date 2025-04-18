"""
OpenRouter integration for LogProb Ranker.

This module provides an adapter for using OpenRouter with LogProb Ranker,
enabling access to various AI models through a single API.
"""

import os
import asyncio
from typing import Optional, Dict, Any, List, Callable
import litellm

from .ranker import LogProbRanker, LogProbConfig, RankedOutput


class OpenRouterAdapter(LogProbRanker):
    """
    Adapter for using OpenRouter with LogProb Ranker.
    
    OpenRouter provides access to various AI models including:
    - OpenAI models (GPT-3.5-Turbo, GPT-4, etc.)
    - Anthropic models (Claude, Claude-2, etc.)
    - Google models (PaLM, etc.)
    - And many more
    
    For full list, see: https://openrouter.ai/docs
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
        Initialize the OpenRouter adapter.
        
        Args:
            model: The model identifier for OpenRouter (e.g., "openai/gpt-3.5-turbo")
            api_key: OpenRouter API key (uses OPENROUTER_API_KEY env var if not provided)
            config: Optional configuration settings
            on_output_callback: Optional callback function
            **kwargs: Additional parameters to pass to the API call
        """
        super().__init__(None, config, on_output_callback)
        self.model = get_full_model_name(model)  # Ensure we use the full model name
        self.api_key = api_key or os.environ.get("OPENROUTER_API_KEY")
        self.kwargs = kwargs
        
        # Configure litellm to use OpenRouter
        # This tells litellm to route all requests through OpenRouter
        litellm.openrouter_key = self.api_key
    
    async def _create_chat_completion(self, 
                                    messages: List[Dict[str, Any]], 
                                    temperature: float, 
                                    max_tokens: int, 
                                    top_p: float):
        """
        Create a chat completion using OpenRouter via litellm.
        
        Args:
            messages: List of message objects (role and content)
            temperature: Temperature parameter for generation
            max_tokens: Maximum tokens to generate
            top_p: Top-p sampling parameter
            
        Returns:
            The raw response from litellm
        """
        # Use litellm with the specified model - prepend 'openrouter/' to model name
        # This tells litellm to use OpenRouter as the provider
        openrouter_model = f"openrouter/{self.model}"
        
        # Set up API key
        api_key = self.api_key
        
        # Use litellm with OpenRouter
        response = await litellm.acompletion(
            model=openrouter_model,
            api_key=api_key,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            top_p=top_p,
            **self.kwargs
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
        
    async def arank(self, prompt: str, criteria: Optional[str] = None) -> RankedOutput:
        """
        Generate and rank outputs for the prompt asynchronously.
        
        Args:
            prompt: The prompt to generate content from
            criteria: Optional criteria for evaluation (overrides the template if provided)
            
        Returns:
            The best RankedOutput based on logprob scores
        """
        # If criteria is provided, create a temporary template
        original_template = None
        if criteria:
            original_template = self.config.template
            # Extract attributes from criteria and create a template
            attributes = []
            for line in criteria.split('\n'):
                line = line.strip()
                if line and line[0].isdigit() and '.' in line:
                    # Extract attribute name from numbered list items
                    parts = line.split('.', 1)
                    if len(parts) > 1:
                        attr_text = parts[1].strip()
                        # Convert the attribute text to a valid JSON key
                        attr_name = attr_text.split()[0].lower().replace('-', '_')
                        attributes.append(attr_name)
            
            # Create a template with the extracted attributes
            if attributes:
                template_parts = []
                for attr in attributes:
                    template_parts.append(f'  "{attr}": LOGPROB_TRUE')
                
                self.config.template = "{\n" + ",\n".join(template_parts) + "\n}"
                
                # Also update the evaluation prompt to include the criteria
                self.config.evaluation_prompt = f"""You are an evaluator. 
Evaluate the following text based on these criteria:

{criteria}

Return ONLY a JSON object with your evaluation. Use JSON boolean values (true/false)."""
        
        try:
            # Generate and rank outputs
            results = await self.rank_outputs(prompt)
            
            # Return the best result
            if results:
                return results[0]  # First result is the highest ranked
            else:
                # Create a default output if no results
                return RankedOutput(
                    output="No valid outputs were generated.",
                    logprob=0.0,
                    index=-1
                )
        finally:
            # Restore original template if we modified it
            if original_template:
                self.config.template = original_template
    
    def rank(self, prompt: str, criteria: Optional[str] = None) -> RankedOutput:
        """
        Synchronous version of arank.
        
        Args:
            prompt: The prompt to generate content from
            criteria: Optional criteria for evaluation (overrides the template if provided)
            
        Returns:
            The best RankedOutput based on logprob scores
        """
        return asyncio.run(self.arank(prompt, criteria))


# Add supported models for easy reference
OPENROUTER_MODELS = {
    # OpenAI models
    "gpt-3.5-turbo": "openai/gpt-3.5-turbo",
    "gpt-4": "openai/gpt-4",
    "gpt-4-turbo": "openai/gpt-4-turbo",
    
    # Anthropic models
    "claude-instant": "anthropic/claude-instant-1",
    "claude-2": "anthropic/claude-2",
    "claude-3-opus": "anthropic/claude-3-opus",
    
    # Google models
    "gemini-pro": "google/gemini-pro",
    "gemini-flash": "google/gemini-flash",  # Cost-effective option for testing
    
    # More specific references
    "openai/gpt-3.5-turbo": "openai/gpt-3.5-turbo",
    "anthropic/claude-2": "anthropic/claude-2",
    "google/gemini-pro": "google/gemini-pro",
    "google/gemini-flash": "google/gemini-flash",
}


def get_full_model_name(model: str) -> str:
    """
    Get the full OpenRouter model name from a short model name.
    
    Args:
        model: Short model name (e.g., "gpt-3.5-turbo") or full name
        
    Returns:
        Full OpenRouter model name (e.g., "openai/gpt-3.5-turbo")
    """
    return OPENROUTER_MODELS.get(model, model)