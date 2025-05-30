"""
Unit tests for utility functions.
"""

import unittest
from logprob_ranker.logprob_ranker.utils import (
    parse_evaluation_json,
    extract_template_attributes,
    calculate_logprob_score,
    format_evaluation_prompt,
    sort_ranked_outputs,
    serialize_ranked_output,
    deserialize_ranked_output,
    EvaluationParseError # Import the specific exception
)
# Explicitly import the actual classes needed for testing instantiation
from logprob_ranker.logprob_ranker.ranker import RankedOutput, AttributeScore


class TestParseEvaluationJson(unittest.TestCase):

    def test_parse_evaluation_json_direct(self):
        json_string = '{"key": "value", "boolean_true": "true", "boolean_false": "false"}'
        expected = {"key": "value", "boolean_true": True, "boolean_false": False}
        self.assertEqual(parse_evaluation_json(json_string), expected)

    def test_parse_evaluation_json_in_markdown(self):
        markdown_string = '```json\n{"key": "value", "is_valid": "True"}\n```'
        expected = {"key": "value", "is_valid": True}
        self.assertEqual(parse_evaluation_json(markdown_string), expected)

    def test_parse_evaluation_json_with_text(self):
        text_with_json = 'Here is the evaluation: { "score": 0.8, "valid": "false" } End of text.'
        expected = {"score": 0.8, "valid": False}
        self.assertEqual(parse_evaluation_json(text_with_json), expected)

    def test_parse_evaluation_json_invalid_json(self):
        invalid_json = '{"key": "value"' # Missing closing brace
        with self.assertRaises(EvaluationParseError):
            parse_evaluation_json(invalid_json)

    def test_parse_evaluation_json_invalid_json_in_markdown(self):
        invalid_markdown = '```json\n{"key": "value"\n```'
        with self.assertRaises(EvaluationParseError):
            parse_evaluation_json(invalid_markdown)

    def test_parse_evaluation_json_invalid_json_with_text(self):
        invalid_text = 'Text { "key": value } Text' # Value not quoted
        with self.assertRaises(EvaluationParseError):
            parse_evaluation_json(invalid_text)
            
    def test_parse_evaluation_json_no_json(self):
        no_json_text = "This text contains no JSON object."
        with self.assertRaises(EvaluationParseError):
            parse_evaluation_json(no_json_text)

    def test_parse_evaluation_json_multiple_json_objects(self):
        # The current implementation extracts the *first* match.
        multiple_json = 'First: {"a": 1}. Second: {"b": 2}.'
        expected = {"a": 1}
        self.assertEqual(parse_evaluation_json(multiple_json), expected)
        
    def test_parse_evaluation_json_not_dict(self):
        not_dict_json = '[1, 2, 3]'
        with self.assertRaises(EvaluationParseError):
            parse_evaluation_json(not_dict_json)
            
    def test_parse_evaluation_json_not_dict_in_text(self):
        not_dict_text = 'List: [1, 2, 3]' 
        with self.assertRaises(EvaluationParseError): 
            parse_evaluation_json(not_dict_text)


class TestUtils(unittest.TestCase):

    def test_extract_template_attributes_basic(self):
        template = '{"attr1": LOGPROB_TRUE, "attr2": LOGPROB_TRUE}'
        expected = ["attr1", "attr2"]
        self.assertEqual(extract_template_attributes(template), expected)

    def test_extract_template_attributes_mixed_values(self):
        template = '{"attr1": LOGPROB_TRUE, "other": "value", "attr3": LOGPROB_TRUE}'
        expected = ["attr1", "attr3"]
        self.assertEqual(extract_template_attributes(template), expected)

    def test_extract_template_attributes_no_logprob(self):
        template = '{"key1": "value1", "key2": false}'
        with self.assertRaises(ValueError):
            extract_template_attributes(template)

    def test_extract_template_attributes_empty_json(self):
        template = '{}'
        with self.assertRaises(ValueError):
            extract_template_attributes(template)

    def test_extract_template_attributes_invalid_json(self):
        # Invalid JSON (missing brace), but regex should find the attribute
        template = '{"key": LOGPROB_TRUE'
        expected = ["key"]
        self.assertEqual(extract_template_attributes(template), expected)

    def test_extract_template_attributes_regex_fallback(self):
        # Invalid JSON (single quotes) but should be caught by regex
        template = "{'attr1': LOGPROB_TRUE, \"attr2\": LOGPROB_TRUE}"
        expected_strict_regex = ["attr2"]
        try:
            self.assertEqual(extract_template_attributes(template), expected_strict_regex)
        except ValueError:
            # If it raises ValueError, neither parsing nor regex worked.
            # This might indicate the regex needs to be more flexible or the initial parsing needs adjustment.
            self.fail("extract_template_attributes failed unexpectedly on regex fallback case")

    def test_extract_template_attributes_whitespace_variation(self):
        # Test different whitespace patterns around the colon (for regex)
        template = '{"attr1"   :LOGPROB_TRUE, "attr2":    LOGPROB_TRUE}'
        expected = ["attr1", "attr2"]
        self.assertEqual(extract_template_attributes(template), expected)

    def test_extract_template_attributes_case_insensitive(self):
        # LOGPROB_TRUE is case-sensitive. 'logprob_true' makes JSON parsing fail,
        # but the regex fallback should still find the correctly cased 'attr2'.
        template = '{"attr1": logprob_true, "attr2": LOGPROB_TRUE}'
        expected = ["attr2"]
        self.assertEqual(extract_template_attributes(template), expected)

    def test_extract_template_attributes_logprob_as_key_or_substring(self):
        # Should not extract if LOGPROB_TRUE is a key or part of another string
        # Corrected input: Use a valid quoted key
        template = '{"LOGPROB_TRUE_key": "value", "key": "prefix_LOGPROB_TRUE", "attr1": LOGPROB_TRUE}'
        expected = ["attr1"]
        self.assertEqual(extract_template_attributes(template), expected)

    def test_extract_template_attributes_invalid_json_no_match(self):
        # Invalid JSON that also won't match the regex
        template = '{key: LOGPROB_TRUE}' # Key not quoted
        with self.assertRaisesRegex(ValueError, "No LOGPROB_TRUE attributes found"):
            extract_template_attributes(template)

    def test_calculate_logprob_score_all_true(self):
        evaluation = {"attr1": True, "attr2": True}
        attributes = ["attr1", "attr2"]
        self.assertEqual(calculate_logprob_score(evaluation, attributes), 1.0)

    def test_calculate_logprob_score_some_true(self):
        evaluation = {"attr1": True, "attr2": False, "attr3": True}
        attributes = ["attr1", "attr2", "attr3"]
        self.assertAlmostEqual(calculate_logprob_score(evaluation, attributes), 2/3)

    def test_calculate_logprob_score_all_false(self):
        evaluation = {"attr1": False, "attr2": False}
        attributes = ["attr1", "attr2"]
        self.assertEqual(calculate_logprob_score(evaluation, attributes), 0.0)

    def test_calculate_logprob_score_missing_attributes(self):
        evaluation = {"attr1": True}
        attributes = ["attr1", "attr2"] # attr2 missing in evaluation
        # Expects 0.5 because attr1 is True, attr2 is treated as False (1/2)
        self.assertEqual(calculate_logprob_score(evaluation, attributes), 0.5)

    def test_calculate_logprob_score_no_attributes(self):
        evaluation = {"attr1": True}
        attributes = []
        with self.assertRaises(ValueError):
            calculate_logprob_score(evaluation, attributes)

    def test_calculate_logprob_score_empty_evaluation_data(self):
        evaluation = {}
        attributes = ["attr1", "attr2"]
        # Expects 0.0 because no attributes are True in empty evaluation (0/2)
        self.assertEqual(calculate_logprob_score(evaluation, attributes), 0.0)

    def test_calculate_logprob_score_non_boolean_values_in_eval(self):
        # parse_evaluation_json converts 'true'/'false' strings to booleans.
        # This test checks direct calls to calculate_logprob_score with varied types.
        evaluation = {
            "attr1": "true_string",  # Truthy string
            "attr2": None,           # Falsy
            "attr3": "",             # Falsy empty string
            "attr4": "non_bool_string", # Truthy string
            "attr5": 1,              # Truthy int
            "attr6": 0,              # Falsy int
            "attr7": True,           # Boolean True
            "attr8": False           # Boolean False
        }
        attributes = ["attr1", "attr2", "attr3", "attr4", "attr5", "attr6", "attr7", "attr8", "missing_attr"]
        # Expected true: attr1, attr4, attr5, attr7 (4 attributes)
        # Total attributes considered: 9
        expected_score = 4 / 9
        self.assertAlmostEqual(calculate_logprob_score(evaluation, attributes), expected_score)

    def test_format_evaluation_prompt(self):
        eval_prompt = "Evaluate this:"
        generated_text = "Some generated text."
        template = '{"criterion": LOGPROB_TRUE}'
        expected = """Evaluate this:

Text to evaluate:
Some generated text.

Criteria template:
{"criterion": LOGPROB_TRUE}"""
        self.assertEqual(format_evaluation_prompt(eval_prompt, generated_text, template), expected)

    def test_format_evaluation_prompt_empty_eval_prompt(self):
        with self.assertRaises(ValueError):
            format_evaluation_prompt("", "text", "template")

    def test_format_evaluation_prompt_empty_generated_text(self):
        with self.assertRaises(ValueError):
            format_evaluation_prompt("prompt", "", "template")

    def test_format_evaluation_prompt_empty_template(self):
        with self.assertRaises(ValueError):
            format_evaluation_prompt("prompt", "text", "")

    def test_sort_ranked_outputs(self):
        # Use actual RankedOutput if available, otherwise mock
        outputs = [
            RankedOutput(output="b", logprob=0.5, index=1),
            RankedOutput(output="a", logprob=0.8, index=0),
            RankedOutput(output="c", logprob=0.2, index=2)
        ]
        sorted_outputs = sort_ranked_outputs(outputs)
        self.assertEqual([o.output for o in sorted_outputs], ["a", "b", "c"])
        self.assertEqual([o.logprob for o in sorted_outputs], [0.8, 0.5, 0.2])

    def test_sort_ranked_outputs_empty_list(self):
        outputs = []
        sorted_outputs = sort_ranked_outputs(outputs)
        self.assertEqual(sorted_outputs, [])

    def test_sort_ranked_outputs_single_item(self):
        output_item = RankedOutput(output="a", logprob=0.8, index=0)
        outputs = [output_item]
        sorted_outputs = sort_ranked_outputs(outputs)
        self.assertEqual(len(sorted_outputs), 1)
        self.assertEqual(sorted_outputs[0].output, "a")

    def test_serialize_ranked_output_basic(self):
        # Use actual RankedOutput if available
        output = RankedOutput(output="text", logprob=0.9, index=0)
        expected = {"output": "text", "logprob": 0.9, "index": 0}
        self.assertEqual(serialize_ranked_output(output), expected)

    def test_serialize_ranked_output_with_extras(self):
        # Use actual classes if available
        attrs = [AttributeScore(name="quality", score=1.0)]
        output = RankedOutput(
            output="text", 
            logprob=0.9, 
            index=0,
            attribute_scores=attrs, 
            raw_evaluation="raw"
        )
        expected = {
            "output": "text", 
            "logprob": 0.9, 
            "index": 0,
            "attribute_scores": [{"name": "quality", "score": 1.0}],
            "raw_evaluation": "raw"
        }
        self.assertEqual(serialize_ranked_output(output), expected)

    def test_deserialize_ranked_output_basic(self):
        data = {"output": "text", "logprob": 0.9, "index": 0}
        # Use actual RankedOutput if available, otherwise patch
        deserialized = deserialize_ranked_output(data)
        self.assertEqual(deserialized.output, "text")
        self.assertEqual(deserialized.logprob, 0.9)
        self.assertEqual(deserialized.index, 0)
        self.assertIsNone(deserialized.attribute_scores)
        self.assertIsNone(deserialized.raw_evaluation)

    def test_deserialize_ranked_output_with_extras(self):
        data = {
            "output": "text", 
            "logprob": 0.9, 
            "index": 0,
            "attribute_scores": [{"name": "quality", "score": 1.0}],
            "raw_evaluation": "raw"
        }
        # Use actual classes if available, otherwise patch
        deserialized = deserialize_ranked_output(data)
        self.assertEqual(deserialized.output, "text")
        self.assertEqual(deserialized.logprob, 0.9)
        self.assertEqual(deserialized.index, 0)
        self.assertIsNotNone(deserialized.attribute_scores)
        self.assertEqual(len(deserialized.attribute_scores), 1)
        self.assertEqual(deserialized.attribute_scores[0].name, "quality")
        self.assertEqual(deserialized.attribute_scores[0].score, 1.0)
        self.assertEqual(deserialized.raw_evaluation, "raw")

    def test_deserialize_ranked_output_missing_required_fields(self):
        # Missing 'output'
        data_missing_output = {"logprob": 0.9, "index": 0}
        with self.assertRaises(EvaluationParseError):
            deserialize_ranked_output(data_missing_output)

        # Missing 'logprob'
        data_missing_logprob = {"output": "text", "index": 0}
        with self.assertRaises(EvaluationParseError):
            deserialize_ranked_output(data_missing_logprob)

        # Missing 'index'
        data_missing_index = {"output": "text", "logprob": 0.9}
        with self.assertRaises(EvaluationParseError):
            deserialize_ranked_output(data_missing_index)

    def test_deserialize_ranked_output_incorrect_types(self):
        # 'logprob' as string
        data_wrong_type_logprob = {"output": "text", "logprob": "not-a-float", "index": 0}
        with self.assertRaises(EvaluationParseError):
            deserialize_ranked_output(data_wrong_type_logprob)

        # 'index' as string
        data_wrong_type_index = {"output": "text", "logprob": 0.9, "index": "not-an-int"}
        with self.assertRaises(EvaluationParseError):
            deserialize_ranked_output(data_wrong_type_index)

        # 'attribute_scores' not a list
        data_wrong_type_attrs = {
            "output": "text", "logprob": 0.9, "index": 0,
            "attribute_scores": "not-a-list"
        }
        with self.assertRaises(EvaluationParseError):
            deserialize_ranked_output(data_wrong_type_attrs)

        # 'attribute_scores' contains non-dict items
        data_wrong_type_attr_item = {
            "output": "text", "logprob": 0.9, "index": 0,
            "attribute_scores": ["not-a-dict"]
        }
        with self.assertRaises(EvaluationParseError):
            deserialize_ranked_output(data_wrong_type_attr_item)

        # 'attribute_scores' item missing 'name'
        data_missing_attr_name = {
            "output": "text", "logprob": 0.9, "index": 0,
            "attribute_scores": [{"score": 1.0}]
        }
        with self.assertRaises(EvaluationParseError):
            deserialize_ranked_output(data_missing_attr_name)


if __name__ == '__main__':
    unittest.main()