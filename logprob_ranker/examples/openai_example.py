"""
Example of using LogProbRanker with OpenAI's API.
"""

import asyncio
import os
import json
from openai import AsyncOpenAI

# Import the logprob ranker
from logprob_ranker import LogProbRanker, LogProbConfig, RankedOutput

async def main():
    # Check for API key
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print("ERROR: OPENAI_API_KEY environment variable not set.")
        print("Please set your OpenAI API key as an environment variable.")
        print("Example: export OPENAI_API_KEY=your-key-here")
        return

    # Initialize OpenAI client
    client = AsyncOpenAI(api_key=api_key)
    
    # Create a ranker with callback for real-time updates
    def on_output(output: RankedOutput):
        print(f"\nOutput #{output.index + 1}:")
        print(f"Content: {output.output[:100]}...")
        print(f"LogProb Score: {output.logprob:.3f}")
        if output.attribute_scores:
            print("Attribute Scores:")
            for attr in output.attribute_scores:
                print(f"  - {attr.name}: {attr.score:.3f}")
    
    # Create a configuration    
    config = LogProbConfig(
        num_variants=3,  # Generate 3 outputs
        thread_count=3,  # Use 3 parallel threads
        temperature=0.7,
        max_tokens=300,
        top_p=1.0,
        # Define evaluation criteria
        template="""{ 
  "interesting": LOGPROB_TRUE,
  "creative": LOGPROB_TRUE,
  "useful": LOGPROB_TRUE,
  "well_structured": LOGPROB_TRUE
}"""
    )
    
    # Initialize the ranker
    ranker = LogProbRanker(
        llm_client=client,
        config=config,
        on_output_callback=on_output
    )
    
    # Define a prompt
    prompt = "Generate a unique product idea for eco-conscious pet owners"
    
    print(f"Using OpenAI to generate and rank outputs for: {prompt}")
    print("Generating outputs (this may take a minute)...")
    
    # Rank outputs
    results = await ranker.rank_outputs(prompt)
    
    # Display ranked results
    print("\n===== RANKED RESULTS =====")
    for i, result in enumerate(results):
        print(f"\n{i+1}. Score: {result.logprob:.3f}")
        print(f"Output: {result.output}")
    
    # Save results to file
    with open("openai_results.json", "w") as f:
        # Convert the results to JSON-serializable format
        serialized_results = [
            {
                "index": r.index,
                "logprob": r.logprob,
                "output": r.output,
                "attribute_scores": [
                    {"name": a.name, "score": a.score}
                    for a in (r.attribute_scores or [])
                ]
            }
            for r in results
        ]
        json.dump(serialized_results, f, indent=2)
    
    print("\nResults saved to openai_results.json")

if __name__ == "__main__":
    asyncio.run(main())