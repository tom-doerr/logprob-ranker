"""
Utility functions for the LogProb ranker package.
"""

import json
import re
from typing import Dict, Any, List, Optional
from .ranker import RankedOutput, AttributeScore

def parse_evaluation_json(evaluation_text: str) -> Dict[str, Any]:
    """
    Parse the evaluation text into a clean JSON object.
    
    Args:
        evaluation_text: The raw evaluation text from the LLM
        
    Returns:
        A dictionary of the parsed JSON
    """
    # Clean up JSON - handle Python True/False and strip extra text
    cleaned_json = evaluation_text.replace("'", '"').replace("True", "true").replace("False", "false")
    
    # Extract JSON content (handle when model includes other text)
    json_match = re.search(r'\{.*\}', cleaned_json, re.DOTALL)
    if json_match:
        cleaned_json = json_match.group(0)
    
    try:
        return json.loads(cleaned_json)
    except json.JSONDecodeError:
        # Return empty dict if parsing fails
        return {}

def extract_template_attributes(template: str) -> List[str]:
    """
    Extract attribute names from a LogProb template.
    
    Args:
        template: The LogProb template string
        
    Returns:
        A list of attribute names
    """
    return re.findall(r'"([^"]+)"\s*:', template)

def calculate_logprob_score(attribute_scores: List[AttributeScore]) -> float:
    """
    Calculate the overall logprob score from attribute scores.
    
    Args:
        attribute_scores: List of AttributeScore objects
        
    Returns:
        The calculated logprob score
    """
    if not attribute_scores:
        return 0.5
    
    return sum(attr.score for attr in attribute_scores) / len(attribute_scores)

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
    default_prompt = "You are an evaluator. Evaluate the following text based on the criteria.\nReturn ONLY a JSON object with your evaluation. Use JSON boolean values (true/false)."
    
    evaluation_template = template.replace("LOGPROB_TRUE", "true")
    
    return f"""{eval_prompt or default_prompt}

CRITERIA:
{evaluation_template}

TEXT TO EVALUATE:
{generated_text}"""

def serialize_ranked_output(ranked_output: RankedOutput) -> Dict[str, Any]:
    """
    Convert a RankedOutput object to a dictionary for serialization.
    
    Args:
        ranked_output: The RankedOutput object
        
    Returns:
        A dictionary representation
    """
    return {
        "output": ranked_output.output,
        "logprob": ranked_output.logprob,
        "index": ranked_output.index,
        "attribute_scores": [
            {"name": attr.name, "score": attr.score}
            for attr in (ranked_output.attribute_scores or [])
        ],
        "raw_evaluation": ranked_output.raw_evaluation
    }

def deserialize_ranked_output(data: Dict[str, Any]) -> RankedOutput:
    """
    Convert a dictionary to a RankedOutput object.
    
    Args:
        data: Dictionary representation of RankedOutput
        
    Returns:
        A RankedOutput object
    """
    attribute_scores = None
    if "attribute_scores" in data and data["attribute_scores"]:
        attribute_scores = [
            AttributeScore(name=item["name"], score=item["score"])
            for item in data["attribute_scores"]
        ]
    
    return RankedOutput(
        output=data["output"],
        logprob=data["logprob"],
        index=data["index"],
        attribute_scores=attribute_scores,
        raw_evaluation=data.get("raw_evaluation")
    )