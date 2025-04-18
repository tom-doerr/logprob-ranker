"""
Utility functions for the LogProb ranker package.
"""

import json
import re
from typing import Dict, Any, List, Optional, Union
import traceback

# Forward reference for type hints
try:
    from .ranker import AttributeScore, RankedOutput
except ImportError:
    # For type checking only
    class AttributeScore:
        name: str
        score: float
    
    class RankedOutput:
        output: str
        logprob: float
        index: int
        attribute_scores: Optional[List[AttributeScore]]
        raw_evaluation: Optional[str]


def parse_evaluation_json(evaluation_text: str) -> Dict[str, Any]:
    """
    Parse the evaluation text into a clean JSON object.
    
    Args:
        evaluation_text: The raw evaluation text from the LLM
        
    Returns:
        A dictionary of the parsed JSON
    """
    try:
        # First try to parse directly
        return json.loads(evaluation_text)
    except json.JSONDecodeError:
        try:
            # Try to extract JSON object from text using regex
            json_pattern = r'\{[^{]*\}'
            match = re.search(json_pattern, evaluation_text)
            
            if match:
                json_str = match.group(0)
                
                # Clean up Python booleans
                json_str = json_str.replace('True', 'true').replace('False', 'false')
                
                # Parse the extracted JSON
                return json.loads(json_str)
            else:
                # No valid JSON found
                return {}
        except Exception:
            # Return empty dict if all parsing attempts fail
            return {}


def extract_template_attributes(template: str) -> List[str]:
    """
    Extract attribute names from a LogProb template.
    
    Args:
        template: The LogProb template string
        
    Returns:
        A list of attribute names
    """
    try:
        # Replace LOGPROB_TRUE with true to make it valid JSON
        valid_json = template.replace('LOGPROB_TRUE', 'true')
        
        # Parse the JSON
        template_json = json.loads(valid_json)
        
        # Extract the keys
        return list(template_json.keys())
    except json.JSONDecodeError:
        # If parsing fails, use regex to extract attributes
        pattern = r'"([^"]+)":\s*LOGPROB_TRUE'
        matches = re.findall(pattern, template)
        return matches
    except Exception:
        # Return empty list if all extraction attempts fail
        return []


def calculate_logprob_score(attribute_scores: List[AttributeScore]) -> float:
    """
    Calculate the overall logprob score from attribute scores.
    
    Args:
        attribute_scores: List of AttributeScore objects
        
    Returns:
        The calculated logprob score
    """
    if not attribute_scores:
        return 0.5  # Default score for empty attributes
    
    # Calculate the average score
    total = sum(attr.score for attr in attribute_scores)
    return total / len(attribute_scores)


def sort_ranked_outputs(outputs: List[RankedOutput]) -> List[RankedOutput]:
    """
    Sort ranked outputs by logprob score (highest first).
    
    Args:
        outputs: List of RankedOutput objects
        
    Returns:
        The sorted list
    """
    return sorted(outputs, key=lambda x: x.logprob, reverse=True)


def format_evaluation_prompt(template: str, generated_text: str, eval_prompt: Optional[str] = None) -> str:
    """
    Format the evaluation prompt with the template and generated content.
    
    Args:
        template: The LogProb template string
        generated_text: The generated text to evaluate
        eval_prompt: Optional custom evaluation prompt prefix
        
    Returns:
        The formatted evaluation prompt
    """
    default_prompt = "You are an evaluator. Evaluate the following text based on the criteria.\n"\
                     "Return ONLY a JSON object with your evaluation. Use JSON boolean values (true/false)."
    
    prompt = eval_prompt or default_prompt
    
    return f"{prompt}\n\n"\
           f"Text to evaluate:\n"\
           f"```\n{generated_text}\n```\n\n"\
           f"Evaluation criteria (return as JSON):\n"\
           f"```\n{template}\n```\n\n"\
           f"Your evaluation (JSON only):"


def serialize_ranked_output(ranked_output: RankedOutput) -> Dict[str, Any]:
    """
    Convert a RankedOutput object to a dictionary for serialization.
    
    Args:
        ranked_output: The RankedOutput object
        
    Returns:
        A dictionary representation
    """
    result = {
        "output": ranked_output.output,
        "logprob": ranked_output.logprob,
        "index": ranked_output.index,
    }
    
    if ranked_output.attribute_scores:
        result["attribute_scores"] = [
            {"name": a.name, "score": a.score}
            for a in ranked_output.attribute_scores
        ]
    
    if ranked_output.raw_evaluation:
        result["raw_evaluation"] = ranked_output.raw_evaluation
    
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
        attribute_scores = [
            AttributeScore(name=a["name"], score=a["score"])
            for a in data["attribute_scores"]
        ]
    
    return RankedOutput(
        output=data["output"],
        logprob=data["logprob"],
        index=data["index"],
        attribute_scores=attribute_scores,
        raw_evaluation=data.get("raw_evaluation")
    )