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
        # litellm.openrouter_key = self.api_key  # Removed global setting
    
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
        original_eval_prompt = None
        if criteria:
            original_template = self.config.template
            original_eval_prompt = self.config.evaluation_prompt
            
            # Extract attributes and criteria text from the criteria string
            # Logic assumes criteria is a numbered list, e.g.:
            # 1. Criterion one description
            attributes = []
            for line in criteria.split('\n'):
                line = line.strip()
                if line and line[0].isdigit() and '.' in line:
                    # Extract attribute name from numbered list items
                    parts = line.split('.', 1)
                    if len(parts) > 1:
                        attr_text = parts[1].strip()
                        # Convert the key concepts to a valid JSON key
                        # Take the first few words to capture the essence of the criteria
                        words = attr_text.split()
                        # Extract a meaningful attribute name (typically the first 1-3 words)
                        lower_attr_text = attr_text.lower()
                        if len(words) > 0:
                            # Different strategies for attribute name extraction
                            if 'language' in lower_attr_text or 'style' in lower_attr_text:
                                attr_name = 'language'
                            elif 'clarity' in lower_attr_text:
                                attr_name = 'clarity'
                            elif 'example' in lower_attr_text or 'analogies' in lower_attr_text:
                                attr_name = 'examples'
                            elif 'structure' in lower_attr_text:
                                attr_name = 'structure'
                            elif 'creativity' in lower_attr_text or 'creative' in lower_attr_text:
                                attr_name = 'creativity'
                            elif 'relevant' in lower_attr_text or 'relevance' in lower_attr_text:
                                attr_name = 'relevance'
                            elif 'technical' in lower_attr_text or 'accuracy' in lower_attr_text:
                                attr_name = 'accuracy'
                            elif 'correct' in lower_attr_text or 'correctness' in lower_attr_text:
                                attr_name = 'correctness'
                            elif 'emotional' in lower_attr_text or 'impact' in lower_attr_text:
                                attr_name = 'impact'
                            elif 'thorough' in lower_attr_text:
                                attr_name = 'thoroughness'
                            elif 'engaging' in lower_attr_text or 'fun' in lower_attr_text:
                                attr_name = 'engagement'
                            elif 'imagery' in lower_attr_text:
                                attr_name = 'imagery'
                            else:
                                # Default: use the first word as the attribute name
                                attr_name = words[0].lower().replace('-', '_')
                            
                            attributes.append(attr_name)
            
            # Create a template with the extracted attributes
            if attributes:
                template_parts = []
                for attr in attributes:
                    template_parts.append(f'  "{attr}": LOGPROB_TRUE')
                
                self.config.template = "{\n" + ",\n".join(template_parts) + "\n}"
                
                # Create expected JSON format to guide the model
                expected_json = "{\n"
                for attr in attributes:
                    expected_json += f'  "{attr}": true,\n'
                # Remove the trailing comma and close the JSON
                expected_json = expected_json.rstrip(',\n') + "\n}"
                
                # Also update the evaluation prompt to include the criteria
                self.config.evaluation_prompt = f"""You are an evaluator who evaluates text based on specific criteria.

I will provide you with a text and criteria for evaluation. Your task is to evaluate how well the text meets each criterion.

EVALUATION CRITERIA:
{criteria}

For each criterion, evaluate if the text meets it. Return ONLY a JSON object with your evaluation, where keys are the criteria and values are boolean (true/false).

You MUST use EXACTLY these keys in your JSON response:
{expected_json}

Replace the values (all currently set to true) with your actual evaluation (true or false).

IMPORTANT: 
1. Return ONLY the JSON object, nothing else.
2. Use EXACTLY the JSON keys shown above.
3. Use only true or false as values (not strings "true" or "false").
4. Be fair and objective in your evaluation."""
        
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
            # Restore original template and prompt if we modified it
            if original_template is not None:
                self.config.template = original_template
            if original_eval_prompt is not None:
                self.config.evaluation_prompt = original_eval_prompt
    
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