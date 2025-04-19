"""
Unit tests for utility functions.
"""

import unittest
import json

from logprob_ranker.utils import (
    parse_evaluation_json,
    extract_template_attributes,
    calculate_logprob_score,
    AttributeScore,
    detect_attributes_from_criteria
)


class TestUtils(unittest.TestCase):
    """Test utility functions."""
    
    def test_parse_evaluation_json_clean(self):
        """Test parsing clean JSON."""
        # Test with a clean JSON string
        clean_json = '{"quality": true, "relevance": false}'
        result = parse_evaluation_json(clean_json)
        
        self.assertEqual(result["quality"], True)
        self.assertEqual(result["relevance"], False)
    
    def test_parse_evaluation_json_with_code_block(self):
        """Test parsing JSON with code blocks."""
        # Test with JSON in a code block
        code_block = '```json\n{"quality": true, "relevance": false}\n```'
        result = parse_evaluation_json(code_block)
        
        self.assertEqual(result["quality"], True)
        self.assertEqual(result["relevance"], False)
    
    def test_parse_evaluation_json_with_text(self):
        """Test parsing JSON with surrounding text."""
        # Test with JSON surrounded by text
        text_json = 'Here is the evaluation:\n{"quality": true, "relevance": false}\nEnd of evaluation'
        result = parse_evaluation_json(text_json)
        
        self.assertEqual(result["quality"], True)
        self.assertEqual(result["relevance"], False)
    
    def test_parse_evaluation_json_with_string_booleans(self):
        """Test parsing JSON with string boolean values."""
        # Test with string boolean values
        string_booleans = '{"quality": "true", "relevance": "false"}'
        result = parse_evaluation_json(string_booleans)
        
        self.assertEqual(result["quality"], True)
        self.assertEqual(result["relevance"], False)
    
    def test_extract_template_attributes_valid_json(self):
        """Test extracting attributes from a valid JSON template."""
        # Test with a valid JSON template
        template = '{"quality": LOGPROB_TRUE, "relevance": LOGPROB_TRUE}'
        attributes = extract_template_attributes(template)
        
        self.assertEqual(len(attributes), 2)
        self.assertIn("quality", attributes)
        self.assertIn("relevance", attributes)
    
    def test_extract_template_attributes_invalid_json(self):
        """Test extracting attributes from an invalid JSON template."""
        # Test with an invalid JSON that needs regex fallback
        template = '"quality": LOGPROB_TRUE, "relevance": LOGPROB_TRUE'
        attributes = extract_template_attributes(template)
        
        self.assertEqual(len(attributes), 2)
        self.assertIn("quality", attributes)
        self.assertIn("relevance", attributes)
    
    def test_calculate_logprob_score_all_true(self):
        """Test calculating logprob score with all true attributes."""
        # Test with all true values
        attribute_scores = [
            AttributeScore(name="quality", value=True),
            AttributeScore(name="relevance", value=True)
        ]
        score = calculate_logprob_score(attribute_scores)
        
        self.assertEqual(score, 1.0)  # All true should be 1.0
    
    def test_calculate_logprob_score_mixed(self):
        """Test calculating logprob score with mixed true/false."""
        # Test with mixed values
        attribute_scores = [
            AttributeScore(name="quality", value=True),
            AttributeScore(name="relevance", value=False)
        ]
        score = calculate_logprob_score(attribute_scores)
        
        self.assertEqual(score, 0.5)  # Half true should be 0.5
    
    def test_calculate_logprob_score_all_false(self):
        """Test calculating logprob score with all false."""
        # Test with all false values
        attribute_scores = [
            AttributeScore(name="quality", value=False),
            AttributeScore(name="relevance", value=False)
        ]
        score = calculate_logprob_score(attribute_scores)
        
        self.assertEqual(score, 0.0)  # All false should be 0.0
    
    def test_calculate_logprob_score_empty(self):
        """Test calculating logprob score with empty list."""
        # Test with empty list
        attribute_scores = []
        score = calculate_logprob_score(attribute_scores)
        
        self.assertEqual(score, 0.0)  # Empty should be 0.0
    
    def test_detect_attributes_from_criteria(self):
        """Test detecting attributes from criteria text."""
        criteria = """
        The response should be:
        1. Accurate - factually correct information
        2. Concise - without unnecessary words
        3. Helpful - actually answers the question
        """
        
        attributes = detect_attributes_from_criteria(criteria)
        
        self.assertGreaterEqual(len(attributes), 3)
        self.assertIn("accurate", attributes)
        self.assertIn("concise", attributes)
        self.assertIn("helpful", attributes)


if __name__ == "__main__":
    unittest.main()