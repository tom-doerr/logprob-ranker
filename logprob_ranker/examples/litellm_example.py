"""
Example of using LogProbRanker with LiteLLM adapter for multiple providers.
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


async def main():
    """Example using LiteLLM adapter."""
    
    # Get API key from environment
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print("Please set the OPENAI_API_KEY environment variable")
        return
    
    # Custom configuration
    config = LogProbConfig(
        num_variants=3,  # Generate 3 variants
        temperature=0.7,
        max_tokens=500,
        thread_count=3,  # Use 3 parallel threads
        
        # Custom template with more specific criteria
        template="""{
  "useful": LOGPROB_TRUE,
  "creative": LOGPROB_TRUE,
  "practical": LOGPROB_TRUE,
  "engaging": LOGPROB_TRUE
}"""
    )
    
    # Create ranker using LiteLLM adapter
    ranker = LiteLLMAdapter(
        model="gpt-3.5-turbo",  # Can be any model supported by LiteLLM
        api_key=api_key,
        config=config,
        on_output_callback=on_output
    )
    
    # Define a prompt
    prompt = "Write a short guide on how to stay productive when working from home."
    
    print(f"Generating and ranking outputs for: {prompt}")
    print(f"Using model: gpt-3.5-turbo with temperature {config.temperature}")
    print(f"This may take a minute...\n")
    
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


if __name__ == "__main__":
    asyncio.run(main())