"""
Example of using LogProbRanker with OpenRouter.

OpenRouter provides a single API for accessing many different LLM providers
including OpenAI, Anthropic, Google, and more.

This example demonstrates how to use the OpenRouterAdapter to work with
various models through OpenRouter's unified API.

To use this example, you'll need an OpenRouter API key set as the 
OPENROUTER_API_KEY environment variable.
"""

import os
import asyncio
from typing import Optional

# Import the package
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from logprob_ranker import LogProbConfig, RankedOutput
from logprob_ranker.openrouter import OpenRouterAdapter, get_full_model_name


def on_output(output: RankedOutput):
    """Called when an output is generated and evaluated."""
    print(f"\n=== Generated Output [Score: {output.total_score:.2f}] ===")
    print(output.output)
    print("\n=== Attribute Scores ===")
    for attr in output.attribute_scores:
        print(f"{attr.name}: {attr.score:.2f} - {attr.explanation}")


async def main():
    """Example using OpenRouter adapter with async API."""
    # Get API key from environment
    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        print("Error: OPENROUTER_API_KEY environment variable not set")
        print("Get an API key from https://openrouter.ai")
        return
    
    # Set up the model to use (using Gemini Flash to save costs)
    model = "gemini-flash"  # Short name, will be expanded to "google/gemini-flash"
    
    # Create configuration
    config = LogProbConfig(
        num_variants=3,      # Generate 3 different outputs
        num_top_results=1,   # Return only the best one
        temperature=0.7,     # Moderate creativity
        max_tokens=150,      # Keep responses concise
    )
    
    # Create the adapter
    ranker = OpenRouterAdapter(
        model=model,
        api_key=api_key,
        config=config,
        on_output_callback=on_output
    )
    
    print(f"Using model: {get_full_model_name(model)} via OpenRouter")
    
    # Define the prompt and criteria
    prompt = "Explain the concept of recursion to a 10-year-old."
    
    criteria = """
    Evaluate this explanation based on:
    1. Child-friendly language (avoid technical jargon)
    2. Use of relatable examples and analogies
    3. Clarity and simplicity of explanation
    4. Engagement and fun factor
    """
    
    # Run the ranking process
    print("Generating and ranking outputs...")
    result = await ranker.arank(prompt, criteria=criteria)
    
    print("\n=== FINAL RESULT ===")
    print(f"Best output (score: {result.total_score:.2f}): \n{result.output}")


def run_sync_example():
    """Example using the synchronous API."""
    # Get API key from environment
    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        print("Error: OPENROUTER_API_KEY environment variable not set")
        return
    
    # Create the adapter with Gemini Flash (cost-effective)
    ranker = OpenRouterAdapter(
        model="google/gemini-flash",
        api_key=api_key,
        config=LogProbConfig(num_variants=2, max_tokens=100)
    )
    
    # Define a simple prompt and criteria
    prompt = "Write a short poem about artificial intelligence."
    criteria = """
    Evaluate this poem based on:
    1. Creativity and originality
    2. Relevance to AI theme
    3. Emotional impact
    4. Imagery and language
    """
    
    print("Running synchronous example...")
    result = ranker.rank(prompt, criteria=criteria)
    
    print(f"\nGenerated poem (score: {result.total_score:.2f}):")
    print(result.output)
    
    print("\nAttribute scores:")
    for attr in result.attribute_scores:
        print(f"{attr.name}: {attr.score:.2f} - {attr.explanation}")


if __name__ == "__main__":
    # Run the async example
    asyncio.run(main())
    
    # Run the sync example
    print("\n\n=== SYNCHRONOUS EXAMPLE ===")
    run_sync_example()