"""
Example of using LogProbRanker with multiple LLM providers via LiteLLM.
"""

import asyncio
import os
import json
from logprob_ranker import (
    LogProbConfig,
    LiteLLMAdapter,
    RankedOutput
)


def on_output(output: RankedOutput):
    """Called when an output is generated and evaluated."""
    print(f"\nOutput #{output.index + 1} (Score: {output.logprob:.3f}):")
    print(f"{output.output[:100]}...")  # Show first 100 chars
    
    if output.attribute_scores:
        print("Attribute scores:")
        for attr in output.attribute_scores:
            print(f"  {attr.name}: {attr.score:.3f}")


async def rank_with_provider(provider: str, model: str, prompt: str):
    """
    Generate and rank outputs using the specified provider and model.
    
    Args:
        provider: The LLM provider name (for env variable naming)
        model: The model identifier for LiteLLM
        prompt: The prompt to generate content from
    """
    # Get API key from environment based on provider
    env_var = f"{provider.upper()}_API_KEY"
    api_key = os.environ.get(env_var)
    
    if not api_key:
        print(f"Please set the {env_var} environment variable")
        return None
    
    # Create config (same for all providers)
    config = LogProbConfig(
        num_variants=2,  # Lower for demonstration
        temperature=0.7,
        max_tokens=300,
        thread_count=2,
        template="""{
  "clear": LOGPROB_TRUE,
  "useful": LOGPROB_TRUE,
  "concise": LOGPROB_TRUE
}"""
    )
    
    # Create ranker using LiteLLM adapter with the specified model
    ranker = LiteLLMAdapter(
        model=model,
        api_key=api_key,
        config=config,
        on_output_callback=on_output
    )
    
    print(f"\n===== Using {provider} with model: {model} =====")
    print(f"Generating and ranking outputs...\n")
    
    try:
        # Generate and rank outputs
        results = await ranker.rank_outputs(prompt)
        return results
    except Exception as e:
        print(f"Error with {provider}: {str(e)}")
        return None


async def main():
    """Run examples with multiple providers."""
    # Define a prompt to use with all providers
    prompt = "Explain the concept of APIs to a non-technical person."
    
    # Define providers and models to test
    # This is just an example; you would need the appropriate API keys
    providers = [
        ("openai", "gpt-3.5-turbo"),
        ("anthropic", "claude-2"),
        # Add more as needed based on which API keys you have
    ]
    
    all_results = {}
    
    for provider, model in providers:
        results = await rank_with_provider(provider, model, prompt)
        if results:
            all_results[provider] = results
            
            # Print the best result
            if results:
                best = results[0]
                print(f"\n----- Best {provider} Result (Score: {best.logprob:.3f}) -----")
                print(f"{best.output}\n")
    
    # Compare the best results from each provider
    if all_results:
        print("\n===== PROVIDER COMPARISON =====")
        for provider, results in all_results.items():
            if results:
                print(f"{provider}: Best score = {results[0].logprob:.3f}")
    else:
        print("\nNo results were generated. Please check your API keys.")


if __name__ == "__main__":
    asyncio.run(main())