"""
Tests for the utils module.
"""

import json
import unittest
from logprob_ranker.utils import (
    parse_evaluation_json,
    extract_template_attributes,
    calculate_logprob_score,
    sort_ranked_outputs,
)
from logprob_ranker.ranker import AttributeScore, RankedOutput

class TestUtils(unittest.TestCase):
    """Test the utils module."""

    def test_parse_evaluation_json(self):
        """Test parsing evaluation JSON."""
        # Test with clean JSON
        json_str = '{"interesting": true, "creative": false}'
        result = parse_evaluation_json(json_str)
        self.assertEqual(result, {"interesting": True, "creative": False})
        
        # Test with Python booleans
        python_str = '{"interesting": True, "creative": False}'
        result = parse_evaluation_json(python_str)
        self.assertEqual(result, {"interesting": True, "creative": False})
        
        # Test with extra text
        messy_str = 'Here is my evaluation: {"interesting": true, "creative": false} Hope that helps!'
        result = parse_evaluation_json(messy_str)
        self.assertEqual(result, {"interesting": True, "creative": False})
        
        # Test with invalid JSON
        invalid_str = 'Not JSON at all'
        result = parse_evaluation_json(invalid_str)
        self.assertEqual(result, {})
    
    def test_extract_template_attributes(self):
        """Test extracting attributes from template."""
        template = '{"interesting": LOGPROB_TRUE, "creative": LOGPROB_TRUE}'
        result = extract_template_attributes(template)
        self.assertEqual(result, ["interesting", "creative"])
    
    def test_calculate_logprob_score(self):
        """Test calculating logprob score."""
        # Test with multiple attributes
        attrs = [
            AttributeScore(name="interesting", score=0.8),
            AttributeScore(name="creative", score=0.6),
            AttributeScore(name="useful", score=0.7),
        ]
        result = calculate_logprob_score(attrs)
        self.assertEqual(result, (0.8 + 0.6 + 0.7) / 3)
        
        # Test with empty list
        result = calculate_logprob_score([])
        self.assertEqual(result, 0.5)
    
    def test_sort_ranked_outputs(self):
        """Test sorting ranked outputs."""
        outputs = [
            RankedOutput(output="first", logprob=0.5, index=0),
            RankedOutput(output="second", logprob=0.9, index=1),
            RankedOutput(output="third", logprob=0.2, index=2),
        ]
        
        result = sort_ranked_outputs(outputs)
        
        # Check that they're sorted highest to lowest
        self.assertEqual(result[0].output, "second")
        self.assertEqual(result[1].output, "first")
        self.assertEqual(result[2].output, "third")

if __name__ == "__main__":
    unittest.main()