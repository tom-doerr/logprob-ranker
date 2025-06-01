import asyncio
import os
from typing import List

from logprob_ranker.logprob_ranker import (
    LiteLLMAdapter,
    LogProbConfig,
    AttributeScore,
    TextEvaluationResult # Though not directly used, good to ensure it's importable
)

# Configure API keys if not set in environment (replace with your actual keys or ensure they are set)
# os.environ["OPENROUTER_API_KEY"] = "your_openrouter_api_key"
# os.environ["OPENAI_API_KEY"] = "your_openai_api_key"

def run_attribute_scoring_demo_sync(model_name: str, text_to_score: str, attributes_template: str):
    print("Running Attribute Scoring Demo (synchronous)...")
    print(f"Instantiating LiteLLMAdapter with model: {model_name}")

    # Default config should be sufficient as score_text_attributes uses its own logic
    # or defaults if specific config values like evaluation_prompt are not tailored.
    config = LogProbConfig()
    adapter = LiteLLMAdapter(model=model_name, config=config)

    print(f"\nText to score: \"{text_to_score}\"")
    print(f"Attributes template: {attributes_template}")

    try:
        attribute_scores: List[AttributeScore] = adapter.score_text_attributes_sync(
            text_to_evaluate=text_to_score,
            custom_attributes_template=attributes_template,
            model_override=model_name, # Can override model for this specific call
            temperature=0.0, # Usually 0 for deterministic evaluation
            max_tokens=100, # Max tokens for the LLM's evaluation response
            request_top_logprobs=5 # Get top 5 logprobs for the evaluation call
        )

        if attribute_scores:
            print("\nAttribute Scoring Succeeded:")
            for attr_score in attribute_scores:
                print(f"  - Attribute: {attr_score.name}")
                print(f"    Score (LogProb of 'true'/'false' token): {attr_score.score:.4f}")
                print(f"    Explanation: {attr_score.explanation}")
        else:
            print("\nAttribute Scoring returned no scores or an empty list.")

    except Exception as e:
        print(f"\nAn error occurred during attribute scoring: {e}")
        print("This could be due to API key issues, network problems, model rate limits, ")
        print("or issues with the LLM's ability to follow the evaluation prompt and produce valid JSON.")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    # Ensure API keys are set in your environment variables
    # For example, OPENROUTER_API_KEY or OPENAI_API_KEY
    if not os.getenv("OPENROUTER_API_KEY") and not os.getenv("OPENAI_API_KEY"):
        print("Warning: OPENROUTER_API_KEY or OPENAI_API_KEY not found in environment variables.")
        print("The demo might fail if the chosen model requires an API key.")
        # exit(1) # Optionally exit if keys are strictly required

    # --- Configuration for the demo ---
    # You can change the model, text, and attributes here
    # model_to_use = "gpt-3.5-turbo" # Example OpenAI model
    model_to_use = "openrouter/openai/gpt-4o-mini" # Example OpenRouter model
    
    sample_text = (
        "The new quantum computing chip announced today promises to revolutionize data processing speeds, "
        "offering unprecedented performance for complex simulations. However, some critics remain skeptical "
        "about its practical scalability and the timeline for widespread adoption."
    )

    # Define attributes and whether we expect their 'true' or 'false' value to be scored.
    # The current implementation of score_text_attributes primarily focuses on the logprob of the token
    # that the LLM generates for the boolean value (true/false) in its JSON output.
    # The LOGPROB_TRUE/LOGPROB_FALSE in the template is more for the original ranker's interpretation.
    # For score_text_attributes, it mainly serves to list the attributes to look for.
    sample_attributes_template = '''{
        "is_positive_sentiment": LOGPROB_TRUE, 
        "is_negative_sentiment": LOGPROB_TRUE, 
        "is_neutral_sentiment": LOGPROB_TRUE, 
        "is_factual": LOGPROB_TRUE, 
        "is_opinion": LOGPROB_TRUE, 
        "is_clear_and_concise": LOGPROB_TRUE
    }'''

    run_attribute_scoring_demo_sync(
        model_name=model_to_use,
        text_to_score=sample_text,
        attributes_template=sample_attributes_template
    )

    print("\nDemo finished.")
