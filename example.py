import asyncio
from logprob_ranker import LiteLLMAdapter, LogProbConfig, RankedOutput

def main_sync():
    print("Running LogProbRanker example (synchronous)...")

    # Configure the ranker
    # Using a model from your preferred list that works well with LiteLLM
    # and often doesn't require explicit API key in code if env vars are set.
    model_name = "openrouter/google/gemini-2.0-flash-001" 
    
    config = LogProbConfig(
        num_variants=2,  # Generate 2 variants for a quick example
        temperature=0.7,
        # By default, evaluation_model will be the same as the generation model
        # and the default evaluation_prompt will be used.
    )

    # Instantiate the adapter
    # No API key here, assuming it's set in the environment for LiteLLM
    try:
        print(f"Instantiating LiteLLMAdapter with model: {model_name}")
        ranker = LiteLLMAdapter(model=model_name, config=config)
    except Exception as e:
        print(f"Error instantiating LiteLLMAdapter: {e}")
        print("Please ensure your LiteLLM environment variables (e.g., OPENROUTER_API_KEY or specific provider keys) are correctly set.")
        return

    # Define a prompt
    prompt = "Write a short, optimistic sentence about the future of AI."

    # Get ranked outputs
    try:
        print(f"\nRanking outputs for prompt: \"{prompt}\"")
        # Ensure the package is discoverable, e.g. by running from project root
        # or having logprob-ranker installed in the environment.
        ranked_outputs: list[RankedOutput] = ranker.rank_outputs_sync(prompt)

        # Print the results
        if ranked_outputs:
            print("\nRanked Outputs:")
            for i, ro in enumerate(ranked_outputs):
                print(f"  Rank {i+1}: Score = {ro.logprob:.4f}, Index = {ro.index}")
                print(f"  Output: \"{ro.output}\"")
                if ro.attribute_scores:
                    print("  Attribute Scores:")
                    for attr_score in ro.attribute_scores:
                        print(f"    - {attr_score.name}: {attr_score.score} (Reason: {attr_score.explanation})")
                print("-" * 20)
        else:
            print("No outputs were ranked. This might indicate an issue with generation or evaluation.")
            print("Check your API keys, model availability, and network connection.")

    except Exception as e:
        print(f"\nAn error occurred during ranking: {e}")
        import traceback
        traceback.print_exc()
        print("\nThis could be due to API key issues, network problems, model rate limits, or unexpected responses from the LLM.")

if __name__ == "__main__":
    main_sync()
