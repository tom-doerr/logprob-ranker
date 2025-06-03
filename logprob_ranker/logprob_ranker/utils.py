"""
Utility functions for the LogProb ranker package.
"""

from .ranker import (
    LLMGenerationError, 
    EvaluationParseError,
    LogprobsNotAvailableError,
    MalformedLogprobsError
)
import json
import re
from typing import Dict, Any, List, Optional # TypeVar removed

# Import models from the new models.py file
from .models import RankedOutput, LogProbConfig, AttributeScore # Used in deserialize_ranked_output and get_scores_for_attributes


# TypeVar T is not used in the current implementation of deserialize_ranked_output
# RankedOutputLike was also unused.

def parse_evaluation_json(evaluation_text: str) -> Dict[str, Any]:
    """
    Parse the evaluation response into a JSON object.

    Args:
        evaluation_text: The raw evaluation text from the LLM

    Returns:
        A dictionary containing the evaluation results

    Raises:
        ValueError: If the evaluation text cannot be parsed as JSON
    """
    try:
        # Try to parse as JSON directly first
        data = json.loads(evaluation_text)

        # Ensure the parsed data is a dictionary
        if not isinstance(data, dict):
            raise EvaluationParseError("Evaluation text did not parse into a JSON dictionary")

        # Convert string booleans to actual booleans
        for key, value in data.items():
            if isinstance(value, str):
                if value.lower() == "true":
                    data[key] = True
                elif value.lower() == "false":
                    data[key] = False

        return data

    except json.JSONDecodeError as e:
        # If that fails, try to extract JSON from the text
        try:
            # Look for text between curly braces
            match = re.search(r'\{[^}]+\}', evaluation_text)
            if match:
                json_str = match.group(0)
                # Try parsing again with the extracted JSON
                data = json.loads(json_str)

                # Ensure the parsed data is a dictionary
                if not isinstance(data, dict):
                    msg = "Evaluation text did not parse into a JSON dictionary"
                    raise EvaluationParseError(msg) from e

                # Convert string booleans to actual booleans
                for key, value in data.items():
                    if isinstance(value, str):
                        if value.lower() == "true":
                            data[key] = True
                        elif value.lower() == "false":
                            data[key] = False

                return data
            raise EvaluationParseError("No JSON object found in evaluation text") from e
        except Exception as nested_e:
            msg = f"Failed to parse evaluation JSON: {str(e)}. Nested error: {str(nested_e)}"
            raise EvaluationParseError(msg) from e


def extract_template_attributes(template: str) -> List[str]:
    """
    Extract attribute names from the evaluation template.

    Args:
        template: The evaluation template string

    Returns:
        List of attribute names

    Raises:
        ValueError: If no attributes could be extracted from the template
    """
    attributes = []

    try:
        # Regex to find attribute names (quoted string) followed by a LOGPROB placeholder
        # It captures the attribute name from '"attribute_name": LOGPROB_X'
        pattern = r'"([^"]+)":\s*(LOGPROB_TRUE|LOGPROB_FALSE|LOGPROB_ANY)'
        # re.findall will return a list of tuples if multiple capture groups are present.
        # Each tuple will be (attribute_name, logprob_placeholder_type)
        # We only need the attribute_name (the first element of each tuple).
        matches = re.findall(pattern, template)
        attributes = [match[0] for match in matches] # Extract just the attribute name

        if not attributes:
            # Check for a simple template that might just be a single placeholder
            # (e.g. for simple pass/fail without named attributes)
            # This case might need further refinement if we want to support it formally.
            if template.strip() in ('LOGPROB_TRUE', 'LOGPROB_FALSE', 'LOGPROB_ANY'):
                # If the template is *just* a placeholder, perhaps we consider it a single, unnamed attribute.
                # For now, let's stick to requiring named attributes for clarity.
                pass # Or raise ValueError if unnamed attributes are not supported
            
            # If still no attributes, and not a simple placeholder template, then raise error.
            if not attributes: # Re-check as the above block might modify it in future
                msg = (
                    f"No attributes (e.g., \"my_attribute\": LOGPROB_TRUE) found in template: '{template}'. "
                    f"Ensure attributes are quoted strings followed by a LOGPROB_X placeholder."
                )
                raise ValueError(msg)
                
    except re.error as e:
        raise ValueError(f"Regex error during template parsing: {e}") from e

    return attributes

def format_evaluation_prompt(eval_prompt: str, generated_text: str, template: str) -> str:
    """
    Format the evaluation prompt with the generated text and template.

    Args:
        eval_prompt: The base evaluation prompt
        generated_text: The generated text to evaluate
        template: The evaluation template with criteria

    Returns:
        The formatted evaluation prompt
    """
    try:
        if not eval_prompt or not generated_text or not template:
            raise ValueError("Missing required components for evaluation prompt")

        prompt = (
            f"{eval_prompt}\n\n"
            f"Text to evaluate:\n{generated_text}\n\n"
            f"Criteria template:\n{template}"
        )
        return prompt

    except Exception as e:
        raise ValueError(f"Failed to format evaluation prompt: {str(e)}") from e


def sort_ranked_outputs(outputs: List[RankedOutput]) -> List[RankedOutput]:
    """
    Sort outputs by their total score in descending order.

    Args:
        outputs: List of RankedOutput objects to sort

    Returns:
        Sorted list of RankedOutput objects
    """
    try:
        return sorted(outputs, key=lambda x: x.logprob, reverse=True)
    except Exception as e:
        raise ValueError(f"Failed to sort outputs: {str(e)}") from e


def serialize_ranked_output(ranked_output: Any) -> Dict[str, Any]:
    """
    Convert a RankedOutput object to a dictionary for serialization.

    Args:
        ranked_output: The RankedOutput object (from any module)

    Returns:
        A dictionary representation
    """
    result = {
        "output": ranked_output.output,
        "logprob": ranked_output.logprob,
        "index": ranked_output.index,
    }

    if hasattr(ranked_output, "attribute_scores") and ranked_output.attribute_scores:
        result["attribute_scores"] = [
            {"name": a.name, "score": a.score}
            for a in ranked_output.attribute_scores
        ]

    if hasattr(ranked_output, "raw_evaluation") and ranked_output.raw_evaluation:
        result["raw_evaluation"] = ranked_output.raw_evaluation

    if hasattr(ranked_output, "provider"):
        result["provider"] = ranked_output.provider
    if hasattr(ranked_output, "model"):
        result["model"] = ranked_output.model
    if hasattr(ranked_output, "generation_time"):
        result["generation_time"] = ranked_output.generation_time

    return result


def deserialize_ranked_output(data: Dict[str, Any]) -> RankedOutput:
    """
    Convert a dictionary to a RankedOutput object.

    Args:
        data: Dictionary representation of RankedOutput

    Returns:
        A RankedOutput object
    """
    try:
        # Pydantic's model_validate will handle the conversion of attribute_scores
        # from list of dicts to list of AttributeScore objects, and validate all fields.
        return RankedOutput.model_validate(data)
    except Exception as e:
        # Catch Pydantic's ValidationError (which is a subclass of Exception) 
        # or any other unexpected error during validation.
        msg = f"Failed to deserialize RankedOutput data using Pydantic: {e}. Input data: {data}"
        raise EvaluationParseError(msg) from e
