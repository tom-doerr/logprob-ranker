"""
A minimal example of using LogProbRanker with OpenAI.

This is a simplified example that shows the basic usage with OpenAI.
"""

import sys
import os
from pathlib import Path

# Add the parent directory to sys.path to make the package importable in examples
sys.path.insert(0, str(Path(__file__).parent.parent))
from logprob_ranker import LogProbConfig, LiteLLMAdapter, RankedOutput


def print_result(output: RankedOutput):
    """Print a single result with its score."""
    print(f"Output #{output.index + 1} (Score: {output.logprob:.3f}):")
    print(f"{output.output}\n")
    
    if output.attribute_scores:
        print("Attribute scores:")
        for attr in output.attribute_scores:
            print(f"  {attr.name}: {attr.score:.3f}")
    print("-" * 50)


def main():
    """Run a simple example of LogProbRanker with OpenAI."""
    print("LogProb Ranker - Simple OpenAI Example\n")
    
    # Check for OpenAI API key
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print("Error: OPENAI_API_KEY environment variable not set")
        print("Please set your OpenAI API key and try again.")
        print("Example: export OPENAI_API_KEY=your_api_key_here")
        return
    
    # Create a simple configuration
    config = LogProbConfig(
        num_variants=2,  # Generate 2 variants
        temperature=0.7,
        max_tokens=200,
        thread_count=2,
        
        # Simple template with 3 criteria
        template="""{
  "clear": LOGPROB_TRUE,
  "helpful": LOGPROB_TRUE,
  "concise": LOGPROB_TRUE
}"""
    )
    
    # Create a ranker using LiteLLM adapter with OpenAI
    ranker = LiteLLMAdapter(
        model="gpt-3.5-turbo",  # Default to GPT-3.5 Turbo
        api_key=api_key,
        config=config
    )
    
    # Define a simple prompt
    prompt = "Explain how to make a cup of coffee in simple steps."
    
    print(f"Generating and ranking outputs for: '{prompt}'")
    print(f"Using model: gpt-3.5-turbo")
    print("This may take a moment...\n")
    
    # Generate and rank outputs
    results = ranker.rank_outputs_sync(prompt)
    
    # Print all results sorted by score
    print(f"\nGenerated {len(results)} outputs, ranked by score:\n")
    for result in results:
        print_result(result)
    
    # Print the best result
    if results:
        best = results[0]
        print("\n===== BEST RESULT =====")
        print(f"Score: {best.logprob:.3f}")
        print(f"{best.output}")
    else:
        print("No valid outputs were generated.")


if __name__ == "__main__":
    main()