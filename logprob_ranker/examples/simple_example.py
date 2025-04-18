"""
Simple example of using LogProbRanker with a synchronous API.
"""

import os
import json
from openai import OpenAI

# Import the logprob ranker
from logprob_ranker import LogProbRanker, LogProbConfig

def main():
    # Check for API key
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print("ERROR: OPENAI_API_KEY environment variable not set.")
        print("Please set your OpenAI API key as an environment variable.")
        print("Example: export OPENAI_API_KEY=your-key-here")
        return

    # Initialize OpenAI client
    client = OpenAI(api_key=api_key)
    
    # Create a configuration with basic settings    
    config = LogProbConfig(
        num_variants=2,
        temperature=0.7,
        # Use a simpler template
        template="""{ 
  "concise": LOGPROB_TRUE,
  "helpful": LOGPROB_TRUE
}"""
    )
    
    # Initialize the ranker
    ranker = LogProbRanker(
        llm_client=client,
        config=config
    )
    
    # Define a prompt
    prompt = "Explain how to make a peanut butter and jelly sandwich"
    
    print(f"Using OpenAI to generate and rank outputs for: {prompt}")
    print("Generating outputs (this may take a minute)...")
    
    # Use the synchronous API
    results = ranker.rank_outputs_sync(prompt)
    
    # Display ranked results
    print("\n===== RANKED RESULTS =====")
    for i, result in enumerate(results):
        print(f"\n{i+1}. Score: {result.logprob:.3f}")
        print(f"Output: {result.output}")

if __name__ == "__main__":
    main()