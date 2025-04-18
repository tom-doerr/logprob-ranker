"""
Example of using LogProbRanker with OpenAI's API.
"""

import asyncio
import os
import sys
from openai import AsyncOpenAI
from logprob_ranker import LogProbRanker, LogProbConfig, RankedOutput

async def main():
    # Check for API key
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print("Error: OPENAI_API_KEY environment variable is required.")
        print("Please set it with: export OPENAI_API_KEY='your-api-key'")
        sys.exit(1)
    
    # Initialize OpenAI client
    client = AsyncOpenAI(api_key=api_key)
    
    # Create a configuration
    config = LogProbConfig(
        num_variants=3,  # Generate 3 variants
        thread_count=3,  # Process 3 threads in parallel
        temperature=0.8,
        template="""{ 
  "interesting": LOGPROB_TRUE,
  "creative": LOGPROB_TRUE,
  "useful": LOGPROB_TRUE
}"""
    )
    
    # Progress callback
    def on_output(output: RankedOutput):
        print(f"Generated output {output.index + 1} with logprob score: {output.logprob:.3f}")
    
    # Initialize ranker
    ranker = LogProbRanker(
        llm_client=client,
        config=config,
        on_output_callback=on_output
    )
    
    # Define prompt
    prompt = "Suggest a unique product idea for eco-conscious pet owners"
    
    print(f"Prompt: {prompt}")
    print(f"Generating {config.num_variants} variants...")
    
    # Rank outputs
    ranked_outputs = await ranker.rank_outputs(prompt)
    
    # Display results
    print("\nResults (ranked by logprob score):")
    print("----------------------------------")
    
    for i, output in enumerate(ranked_outputs):
        print(f"\n{i+1}. Score: {output.logprob:.3f}")
        print(f"   Output: {output.output}")
        
        if output.attribute_scores:
            print("   Attribute Scores:")
            for attr in output.attribute_scores:
                print(f"     - {attr.name}: {attr.score:.3f}")

if __name__ == "__main__":
    asyncio.run(main())