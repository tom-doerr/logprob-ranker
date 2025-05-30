# LogProb Ranker: Ranking Mechanism Update

This document outlines the refined ranking mechanism for the `logprob-ranker` library.

## Ranking Strategy: Attribute Scores from Evaluation LLM's Token Logprobs

The ranking of generated outputs is based on scores assigned to predefined attributes (e.g., "interesting", "creative", "useful"). These attribute scores are derived from a secondary evaluation step:

1.  **Evaluation Prompt**: For each generated output, an "evaluation LLM" is called with an evaluation prompt. This prompt instructs the LLM to judge the output against the predefined attributes and return a JSON object indicating a boolean (true/false) judgment for each attribute.

2.  **Logprobs for Judgments**: Crucially, this evaluation LLM call requests log probabilities for its generated tokens.

3.  **Attribute Scoring**: The score for each attribute (e.g., for "interesting") is **not** a simple 1.0 for `true` or 0.0 for `false`. Instead, it is calculated based on the **log probabilities of the specific tokens** that the evaluation LLM used to express its "true" or "false" judgment for that attribute within the generated JSON response.
    *   For example, if the LLM outputs `"interesting": true`, the system will look for the logprob of the token(s) representing `true` in that context.
    *   The exact method of deriving a score from these token logprobs (e.g., `logprob("true") - logprob("false")`, or a normalized probability) will be implemented in the `AttributeScore` calculation.

4.  **Overall Ranking**: The final score for a `RankedOutput` (stored in its `logprob` field) is an aggregation (e.g., sum or average) of these logprob-derived attribute scores.

## Rationale:

*   **Nuanced Confidence**: This approach aims to capture a more nuanced confidence level from the evaluation LLM for each attribute judgment, rather than a binary decision.
*   **Leveraging Logprobs**: It utilizes the rich information contained in token logprobabilities from the evaluation LLM.
*   **Attribute-Driven Evaluation**: Maintains the ability to evaluate outputs based on specific, human-defined criteria.

## Key Components Retained/Modified:

*   **`LogProbConfig`**: Retains `evaluation_prompt` and `template` to guide the evaluation LLM.
*   **`AttributeScore`**: Remains, but its `score` field will now hold the logprob-derived score.
*   **`RankedOutput`**: Retains `attribute_scores` and `raw_evaluation`. Its `logprob` field will be the aggregate of the new attribute scores.
*   **Utility Functions (`utils.py`)**: Functions for parsing evaluation JSON, extracting attributes, and formatting prompts will be adapted. The primary score calculation logic will be significantly updated.
*   **Core Logic (`ranker.py`)**: The `generate_and_evaluate_output` method will be modified to implement the extraction and calculation of attribute scores from the evaluation LLM's token logprobs.

## Challenges:

*   **Token-Level Logprob Extraction**: Reliably identifying the correct tokens (e.g., for "true" or "false" within a JSON structure) and their corresponding logprobs from the LLM's output can be complex due to tokenization variations.
*   **Score Calculation from Logprobs**: Defining a robust method to convert token logprobs for opposing concepts (like true/false) into a single attribute score.
