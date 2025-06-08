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


def parse_evaluation_json(evaluation_text: str) -> Dict[str, Any]:
    """
    Parse the evaluation text into a clean JSON object.
    
    Args:
        evaluation_text: The raw evaluation text from the LLM
        
    Returns:
        A dictionary of the parsed JSON
    """
    # Clean input - remove backticks, codeblocks, and other common markdown formatting
    cleaned_text = evaluation_text
    
    # Remove markdown code blocks
    code_block_pattern = r'```(?:json)?\s*([\s\S]*?)\s*```'
    code_block_match = re.search(code_block_pattern, cleaned_text)
    if code_block_match:
        cleaned_text = code_block_match.group(1)
    
    # Remove any leading/trailing content that's not part of the JSON
    json_block_pattern = r'\s*(\{[\s\S]*\})\s*'
    json_block_match = re.search(json_block_pattern, cleaned_text)
    if json_block_match:
        cleaned_text = json_block_match.group(1)
    
    # Replace various boolean representations
    cleaned_text = cleaned_text.replace('True', 'true').replace('False', 'false')
    cleaned_text = cleaned_text.replace('"true"', 'true').replace('"false"', 'false')
    cleaned_text = cleaned_text.replace("'true'", 'true').replace("'false'", 'false')
    
    # Attempt multiple parsing strategies
    parsing_methods = [
        # Direct parsing
        lambda t: json.loads(t),
        
        # Try with regex extraction of JSON object
        lambda t: json.loads(re.search(r'\{[^{]*\}', t).group(0)) if re.search(r'\{[^{]*\}', t) else None,
        
        # Try fixing common JSON syntax errors
        lambda t: json.loads(t.replace("'", '"')
                             .replace(',\n}', '\n}')
                             .replace(',}', '}')
                             .replace('},]', '}]')),
        
        # More aggressive regex
        lambda t: json.loads(re.search(r'\{[\s\S]*\}', t).group(0)) if re.search(r'\{[\s\S]*\}', t) else None
    ]
    
    # Try each parsing method
    for parse_method in parsing_methods:
        try:
            result = parse_method(cleaned_text)
            if result:
                return result
        except Exception:
            continue
    
    # Final fallback: return empty dict if all parsing methods fail
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
    avg_score = total / len(attribute_scores)
    
    return avg_score


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
