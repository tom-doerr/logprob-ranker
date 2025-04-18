"""
Example of using LogProbRanker with LiteLLM adapter for multiple providers.

This example demonstrates how to use the LogProbRanker with LiteLLM,
which provides access to many different LLM providers through a single interface.

Supported providers through LiteLLM include:
- OpenAI: models like "gpt-3.5-turbo", "gpt-4" (OPENAI_API_KEY)
- Anthropic: models like "claude-2", "claude-instant-1" (ANTHROPIC_API_KEY)
- Cohere: models like "command", "command-light" (COHERE_API_KEY)
- Google: models like "gemini-pro" (GOOGLE_API_KEY)
- And many more

Example usage with different providers:
LLM_MODEL=gpt-3.5-turbo python litellm_example.py  # OpenAI
LLM_MODEL=claude-2 python litellm_example.py  # Anthropic
LLM_MODEL=command python litellm_example.py  # Cohere
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
    print(f"{output.output[:150]}...")  # Show first 150 chars
    
    if output.attribute_scores:
        print("Attribute scores:")
        for attr in output.attribute_scores:
            print(f"  {attr.name}: {attr.score:.3f}")


def get_api_key_for_model(model: str) -> str:
    """Get the appropriate API key based on the model name."""
    if "gpt" in model.lower() or "openai" in model.lower():
        return os.environ.get("OPENAI_API_KEY")
    elif "claude" in model.lower():
        return os.environ.get("ANTHROPIC_API_KEY")
    elif "command" in model.lower() or "cohere" in model.lower():
        return os.environ.get("COHERE_API_KEY")
    elif "gemini" in model.lower():
        return os.environ.get("GOOGLE_API_KEY")
    # Default to OpenAI API key
    return os.environ.get("OPENAI_API_KEY")


async def main():
    """Example using LiteLLM adapter with async API."""
    print("\n=== ASYNCHRONOUS API EXAMPLE ===")
    
    # Get model name from environment or use default
    model = os.environ.get("LLM_MODEL", "gpt-3.5-turbo")
    
    # Get API key based on model
    api_key = get_api_key_for_model(model)
    if not api_key:
        print(f"Warning: No API key found for model {model}")
        print("The example may fail unless the API key is set in the environment.")
    
    # Custom configuration
    config = LogProbConfig(
        num_variants=3,  # Generate 3 variants
        temperature=0.7,
        max_tokens=500,
        thread_count=3,  # Use 3 parallel threads
        
        # Custom template with specific criteria
        template="""{
  "useful": LOGPROB_TRUE,
  "creative": LOGPROB_TRUE,
  "practical": LOGPROB_TRUE,
  "engaging": LOGPROB_TRUE
}"""
    )
    
    # Create ranker using LiteLLM adapter
    ranker = LiteLLMAdapter(
        model=model,  # Can be any model supported by LiteLLM
        api_key=api_key,
        config=config,
        on_output_callback=on_output
    )
    
    # Define a prompt
    prompt = "Write a short guide on how to stay productive when working from home."
    
    print(f"Generating and ranking outputs for: {prompt}")
    print(f"Using model: {model} with temperature {config.temperature}")
    print(f"This may take a minute...\n")
    
    try:
        # Generate and rank outputs
        results = await ranker.rank_outputs(prompt)
        
        # Print the best result
        if results:
            best = results[0]
            print("\n===== BEST RESULT =====")
            print(f"Score: {best.logprob:.3f}")
            print(f"Output: {best.output}")
            
            # Save results to a file
            with open("ranked_outputs.json", "w") as f:
                from logprob_ranker.utils import serialize_ranked_output
                json_results = [serialize_ranked_output(r) for r in results]
                json.dump(json_results, f, indent=2)
                print("\nResults saved to ranked_outputs.json")
        else:
            print("No valid outputs were generated.")
    except Exception as e:
        print(f"Error during async example: {str(e)}")


def run_sync_example():
    """Example using the synchronous API."""
    print("\n=== SYNCHRONOUS API EXAMPLE ===")
    
    # Get model name from environment or use default
    model = os.environ.get("LLM_MODEL", "gpt-3.5-turbo")
    
    # Get API key based on model
    api_key = get_api_key_for_model(model)
    
    # Simpler configuration for sync example
    config = LogProbConfig(
        num_variants=2,  # Fewer variants for quicker example
        temperature=0.5,
        max_tokens=300,
        thread_count=2,
        
        # Simpler template with fewer criteria
        template="""{
  "concise": LOGPROB_TRUE,
  "informative": LOGPROB_TRUE
}"""
    )
    
    # Create ranker using LiteLLM adapter
    ranker = LiteLLMAdapter(
        model=model,
        api_key=api_key,
        config=config
    )
    
    # Define a prompt
    prompt = "Explain what self-consistency in language models means."
    
    print(f"Generating and ranking outputs for: {prompt}")
    print(f"Using model: {model} with temperature {config.temperature}")
    print(f"This may take a minute...\n")
    
    try:
        # Generate and rank outputs synchronously
        results = ranker.rank_outputs_sync(prompt)
        
        # Print the best result
        if results:
            best = results[0]
            print("\n===== BEST RESULT =====")
            print(f"Score: {best.logprob:.3f}")
            print(f"Output: {best.output}")
        else:
            print("No valid outputs were generated.")
    except Exception as e:
        print(f"Error during sync example: {str(e)}")


if __name__ == "__main__":
    # Run the async example
    asyncio.run(main())
    
    # Run the sync example
    try:
        run_sync_example()
    except Exception as e:
        print(f"Sync example failed: {e}")
    
    # Show instructions for using different models
    print("\n=== INSTRUCTIONS ===")
    print("To use a different LLM provider, set the LLM_MODEL environment variable.")
    print("Examples:")
    print("  LLM_MODEL=gpt-3.5-turbo python litellm_example.py  # OpenAI")
    print("  LLM_MODEL=claude-2 python litellm_example.py  # Anthropic")
    print("  LLM_MODEL=command python litellm_example.py  # Cohere")
    print("\nDon't forget to set the corresponding API key in the environment.")
    print("  For OpenAI: OPENAI_API_KEY")
    print("  For Anthropic: ANTHROPIC_API_KEY")
    print("  For Cohere: COHERE_API_KEY")