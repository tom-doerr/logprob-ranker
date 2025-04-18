"""
Simple example of using LogProbRanker with a synchronous API.
"""

import os
import sys
from logprob_ranker import LogProbRanker, LogProbConfig, RankedOutput
from openai import OpenAI

def main():
    # Check for API key
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print("Error: OPENAI_API_KEY environment variable is required.")
        print("Please set it with: export OPENAI_API_KEY='your-api-key'")
        sys.exit(1)
    
    # Initialize OpenAI client
    client = OpenAI(api_key=api_key)
    
    # Create a configuration
    config = LogProbConfig(
        num_variants=2,  # Generate 2 variants to keep it quick
        thread_count=1,  # Use a single thread for simplicity
        temperature=0.7,
        template="""{ 
  "engaging": LOGPROB_TRUE,
  "creative": LOGPROB_TRUE
}"""
    )
    
    # Initialize ranker
    ranker = LogProbRanker(
        llm_client=client,
        config=config
    )
    
    # Define prompt
    prompt = "Write a hook for a sci-fi novel about time travel"
    
    print(f"Prompt: {prompt}")
    print(f"Generating {config.num_variants} variants...")
    
    # Rank outputs (using synchronous version)
    ranked_outputs = ranker.rank_outputs_sync(prompt)
    
    # Display results
    print("\nResults (ranked by logprob score):")
    print("----------------------------------")
    
    for i, output in enumerate(ranked_outputs):
        print(f"\n{i+1}. Score: {output.logprob:.3f}")
        print(f"   Output: {output.output}")
    
    # Demonstrate ranking with a different template on the same outputs
    print("\nRe-ranking with different criteria...")
    
    # Create a new configuration with different template
    new_config = LogProbConfig(
        template="""{ 
  "surprising": LOGPROB_TRUE,
  "coherent": LOGPROB_TRUE,
  "intriguing": LOGPROB_TRUE
}"""
    )
    
    # Replace the ranker's config
    ranker.config = new_config
    
    # You could re-rank the same outputs, but for this example, we'll generate new ones
    new_ranked_outputs = ranker.rank_outputs_sync(prompt)
    
    print("\nNew Results (ranked by different criteria):")
    print("-------------------------------------------")
    
    for i, output in enumerate(new_ranked_outputs):
        print(f"\n{i+1}. Score: {output.logprob:.3f}")
        print(f"   Output: {output.output}")

if __name__ == "__main__":
    main()