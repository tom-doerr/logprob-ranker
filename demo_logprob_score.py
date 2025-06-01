import asyncio
from logprob_ranker import LiteLLMAdapter, LogProbConfig, TextEvaluationResult

def run_evaluation_demo_sync():
    print("Running LogProb Score Demo (synchronous)...")

    # Configure the adapter
    # Using a model known to work well and provide logprobs
    # Ensure API keys (e.g., OPENROUTER_API_KEY or OPENAI_API_KEY) are set in your environment.
    model_name = "openrouter/openai/gpt-4o-mini" 
    # You can also try "gpt-3.5-turbo" or other models that support logprobs via LiteLLM.
    
    config = LogProbConfig(
        # logprobs=True is default, but explicit for clarity
        logprobs=True, 
        # top_logprobs=0 is default if only basic logprobs are needed for the tokens themselves.
        # Set to a positive integer (e.g., 5) if you also want to see alternative tokens.
        top_logprobs=0 
    )

    print(f"Instantiating LiteLLMAdapter with model: {model_name}")
    try:
        adapter = LiteLLMAdapter(model=model_name, config=config)
    except Exception as e:
        print(f"Error instantiating LiteLLMAdapter: {e}")
        print("Please ensure your LiteLLM environment variables (e.g., OPENROUTER_API_KEY or specific provider keys) are correctly set.")
        return

    prompt = "The cat sat on the"
    completion = "mat, purring softly."
    
    print(f"\nPrompt: \"{prompt}\"")
    print(f"Text to evaluate (completion): \"{completion}\"")

    try:
        prompt_messages = [{"role": "user", "content": prompt}]
        result: TextEvaluationResult = adapter.evaluate_text_sync(
            prompt_messages=prompt_messages, 
            text_to_evaluate=completion, 
            model_override=model_name, 
            temperature=0.0, 
            max_tokens=50, 
            request_logprobs=True, 
            request_top_logprobs=5 
        )

        if result:
            print(f"\nEvaluation Succeeded:")
            print(f"  Average Log Probability of completion: {result.average_logprob:.4f}")
            print(f"  Number of Tokens in completion: {result.num_tokens}")
            if result.raw_token_logprobs:
                print("  Raw Token Logprobs for completion:")
                for token, logprob_val in result.raw_token_logprobs:
                    print(f"    - Token: '{token}', LogProb: {logprob_val:.4f}")
            else:
                print("  No raw token logprobs were returned. This might happen if the model doesn't support them or logprobs were not requested properly.")
        else:
            print("\nEvaluation did not return a result. This could be due to an error or if logprobs are unavailable.")

    except Exception as e:
        print(f"\nAn error occurred during text evaluation: {e}")
        import traceback
        traceback.print_exc()
        print("This could be due to API key issues, network problems, model rate limits, or unexpected responses from the LLM.")

if __name__ == "__main__":
    run_evaluation_demo_sync()
