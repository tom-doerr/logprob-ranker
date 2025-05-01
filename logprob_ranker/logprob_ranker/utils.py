"""
Utility functions for the LogProb ranker package.
"""

import json
import re
from typing import Dict, Any, List, Optional, Union, TypeVar
import traceback

# Type variable for any RankedOutput-like object
RankedOutputLike = TypeVar('RankedOutputLike')

# Define classes for type checking, these will be shadowed by actual imports when available
class AttributeScore:
    """Type stub for AttributeScore."""
    name: str
    score: float

class RankedOutput:
    """Type stub for RankedOutput."""
    output: str
    logprob: float
    index: int
    attribute_scores: Optional[List[AttributeScore]]
    raw_evaluation: Optional[str]

# Forward reference for actual implementation
try:
    from .ranker import AttributeScore, RankedOutput
except ImportError:
    # Will use the type stubs defined above
    pass


def parse_evaluation_json(evaluation_text: str) -> dict:
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
            raise ValueError("Evaluation text did not parse into a JSON dictionary")
        
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
                    raise ValueError("Evaluation text did not parse into a JSON dictionary")
                
                # Convert string booleans to actual booleans
                for key, value in data.items():
                    if isinstance(value, str):
                        if value.lower() == "true":
                            data[key] = True
                        elif value.lower() == "false":
                            data[key] = False
                
                return data
            else:
                raise ValueError("No JSON object found in evaluation text")
        except Exception as nested_e:
            raise ValueError(f"Failed to parse evaluation JSON: {str(e)}. Nested error: {str(nested_e)}") from e


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
    template_json = None
    attributes = []

    # Attempt 1: Parse as JSON directly
    try:
        template_json = json.loads(template)
    except json.JSONDecodeError:
        # Attempt 2: Replace LOGPROB_TRUE and parse again
        try:
            valid_json_str = template.replace('LOGPROB_TRUE', '"LOGPROB_TRUE"')
            template_json = json.loads(valid_json_str)
        except json.JSONDecodeError:
            # Both JSON parsing attempts failed, will proceed to regex fallback
            pass

    # If JSON parsing succeeded, extract attributes
    if template_json is not None and isinstance(template_json, dict):
        attributes = [key for key, value in template_json.items()
                     if isinstance(value, str) and value.strip('"') == "LOGPROB_TRUE"]

    # If no attributes found via JSON parsing OR parsing failed, try regex
    if not attributes:
        try:
            pattern = r'"([^" ]+)":\s*LOGPROB_TRUE' # Match "key": LOGPROB_TRUE
            attributes = re.findall(pattern, template)

            if not attributes:
                # Final check: maybe the value itself is just the token
                if template.strip() == 'LOGPROB_TRUE':
                    # This case is ambiguous, perhaps raise or handle specificially?
                    # For now, let's assume it means no attributes defined.
                    raise ValueError("Template contains only LOGPROB_TRUE token, cannot extract attributes.")
                else:
                    raise ValueError("No LOGPROB_TRUE attributes found in template via JSON or regex")
        except re.error as e:
            raise ValueError(f"Regex error during template parsing: {e}") from e

    return attributes


def calculate_logprob_score(evaluation_data: Dict[str, Any], attributes: List[str]) -> float:
    """
    Calculate the log probability score from evaluation data.
    
    Args:
        evaluation_data: Dictionary containing evaluation results
        attributes: List of attributes to consider
        
    Returns:
        The calculated log probability score
        
    Raises:
        ValueError: If no valid attributes are found in the evaluation data
    """
    try:
        # Check for missing keys first
        for attribute in attributes:
            if attribute not in evaluation_data:
                raise ValueError(f"Missing attribute '{attribute}' in evaluation data for score calculation.")
        
        # Count how many criteria were met
        true_count = sum(1 for attr in attributes if evaluation_data.get(attr, False))
        
        if not attributes:
            raise ValueError("No attributes provided for scoring")
            
        # Calculate score as proportion of criteria met
        score = true_count / len(attributes)
        
        return score
        
    except Exception as e:
        raise ValueError(f"Failed to calculate logprob score: {str(e)}") from e


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
        # Ensure we have all required components
        if not eval_prompt or not generated_text or not template:
            raise ValueError("Missing required components for evaluation prompt")
            
        # Format the prompt with the text to evaluate and the template
        prompt = f"{eval_prompt}\n\nText to evaluate:\n{generated_text}\n\nCriteria template:\n{template}"
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
    
    # Include any additional attributes that might be present in extended classes
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
    attribute_scores = None
    if "attribute_scores" in data:
        attribute_scores = []
        for a in data["attribute_scores"]:
            attr_score = AttributeScore()
            attr_score.name = a["name"]
            attr_score.score = a["score"]
            attribute_scores.append(attr_score)
    
    result = RankedOutput()
    result.output = data["output"]
    result.logprob = data["logprob"]
    result.index = data["index"]
    result.attribute_scores = attribute_scores
    result.raw_evaluation = data.get("raw_evaluation")
    return result