import os
from typing import List, Optional

# Imports needed for the helper function to work
from logprob_ranker.logprob_ranker import (
    LiteLLMAdapter,
    LogProbConfig,
    AttributeScore
)

# --- Helper function to simplify usage --- 
def get_scores_for_attributes(
    text_to_evaluate: str,
    attribute_names: List[str],
    model_name: str = "openrouter/openai/gpt-4o-mini",
    config: Optional[LogProbConfig] = None
) -> List[AttributeScore]:
    """
    High-level wrapper to get attribute scores for a text using sensible defaults.

    Args:
        text_to_evaluate: The text to be scored.
        attribute_names: A list of attribute names (strings) to score.
                         Assumes LOGPROB_TRUE for all attributes for simplicity.
        model_name: The LLM model to use for evaluation.
        config: Optional LogProbConfig. If None, a default one is created.

    Returns:
        A list of AttributeScore objects, or an empty list if an error occurs.
    """
    if config is None:
        config = LogProbConfig()  # Uses default evaluation_prompt, etc.
    
    adapter = LiteLLMAdapter(model=model_name, config=config)
    
    # Dynamically create the attributes template string from the list of names
    # This simple version assumes LOGPROB_TRUE for all listed attributes.
    template_parts = [f'\"{attr}\": LOGPROB_TRUE' for attr in attribute_names]
    attributes_template_str = "{ " + ", ".join(template_parts) + " }"
    
    # print(f"--- Debug: Using template: {attributes_template_str} ---") # Uncomment for debugging template

    try:
        scores = adapter.score_text_attributes_sync(
            text_to_evaluate=text_to_evaluate,
            custom_attributes_template=attributes_template_str,
            model_override=model_name,
            temperature=0.0,      # Deterministic evaluation
            max_tokens=150,       # Max tokens for the LLM's evaluation JSON response
            request_top_logprobs=5 # Get top logprobs for the evaluation call
        )
        return scores
    except Exception as e:
        print(f"Error encountered in get_scores_for_attributes: {e}")
        # import traceback
        # traceback.print_exc() # Uncomment for detailed error for debugging
        return []

# --- Main Demo --- 
if __name__ == "__main__":
    # Ensure API keys are set in your environment variables (e.g., OPENROUTER_API_KEY)
    if not os.getenv("OPENROUTER_API_KEY") and not os.getenv("OPENAI_API_KEY"):
        print("Warning: OPENROUTER_API_KEY or OPENAI_API_KEY not found. The demo might fail.")

    # 1. Define your text and a simple list of attributes you care about
    my_text_input = "The new AI model shows impressive understanding of complex queries and generates fluent text."
    my_attribute_list = ["is_positive_sentiment", "is_about_ai", "is_fluent"]

    # 2. Get scores (this is your 'one line execution')
    # The 'get_scores_for_attributes' function is defined above in this script.
    # If it were part of your library, the import would be the 'one line import'.
    # Example: from logprob_ranker.api import get_scores_for_attributes
    results = get_scores_for_attributes(my_text_input, my_attribute_list)

    # 3. Print results (this can be your 'one line print', or a slightly more formatted loop)
    print("\n--- Simple Attribute Scores ---")
    if results:
        for r in results:
            print(f"  Attribute: {r.name}, Score: {r.score:.4f}, Explanation: {r.explanation}")
    else:
        print("No scores were returned, or an error occurred during processing.")
    
    print("\nSimple attribute scoring demo finished.")
