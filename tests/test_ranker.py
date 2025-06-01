# Tests for functions and classes in ranker.py

import pytest
from unittest.mock import patch, MagicMock

from logprob_ranker.logprob_ranker import (
    get_scores_for_attributes,
    LiteLLMAdapter,
    LogProbConfig,
    AttributeScore
)

# More tests will be added here


@patch('logprob_ranker.logprob_ranker.ranker.LiteLLMAdapter')
def test_get_scores_for_attributes_happy_path(mock_adapter_class):
    # Arrange
    mock_adapter_instance = MagicMock()
    mock_adapter_class.return_value = mock_adapter_instance

    expected_scores = [
        AttributeScore(name="is_positive", score=0.9, explanation="very positive"),
        AttributeScore(name="is_clear", score=0.8, explanation="quite clear")
    ]
    mock_adapter_instance.score_text_attributes_sync.return_value = expected_scores

    text_to_evaluate = "This is a great and clear statement."
    attribute_names = ["is_positive", "is_clear"]
    model_name = "test-model"

    # Act
    actual_scores = get_scores_for_attributes(
        text_to_evaluate=text_to_evaluate,
        attribute_names=attribute_names,
        model_name=model_name
    )

    # Assert
    assert actual_scores == expected_scores
    mock_adapter_class.assert_called_once()
    # Check that the adapter was initialized with the model and a default LogProbConfig
    # Since LogProbConfig() creates a new object each time, we check the type and model.
    adapter_call_args = mock_adapter_class.call_args
    assert adapter_call_args[1]['model'] == model_name
    assert isinstance(adapter_call_args[1]['config'], LogProbConfig)


    expected_template_str = '{ "is_positive": LOGPROB_TRUE, "is_clear": LOGPROB_TRUE }'
    mock_adapter_instance.score_text_attributes_sync.assert_called_once_with(
        text_to_evaluate=text_to_evaluate,
        custom_attributes_template=expected_template_str,
        model_override=model_name,
        temperature=0.0,
        max_tokens=150,
        request_top_logprobs=5
    )


@patch('logprob_ranker.logprob_ranker.ranker.LiteLLMAdapter')
def test_get_scores_for_attributes_with_custom_config(mock_adapter_class):
    # Arrange
    mock_adapter_instance = MagicMock()
    mock_adapter_class.return_value = mock_adapter_instance

    expected_scores = [AttributeScore(name="is_custom", score=0.7, explanation="custom config used")]
    mock_adapter_instance.score_text_attributes_sync.return_value = expected_scores

    text_to_evaluate = "Testing with custom config."
    attribute_names = ["is_custom"]
    model_name = "custom-model"
    custom_config = LogProbConfig(evaluation_prompt="Custom prompt", num_generations=1) # Example custom config

    # Act
    actual_scores = get_scores_for_attributes(
        text_to_evaluate=text_to_evaluate,
        attribute_names=attribute_names,
        model_name=model_name,
        config=custom_config
    )

    # Assert
    assert actual_scores == expected_scores
    mock_adapter_class.assert_called_once()
    # Check that the adapter was initialized with the model and the custom LogProbConfig
    adapter_call_args = mock_adapter_class.call_args
    assert adapter_call_args[1]['model'] == model_name
    assert adapter_call_args[1]['config'] is custom_config # Check for instance identity

    expected_template_str = '{ "is_custom": LOGPROB_TRUE }'
    mock_adapter_instance.score_text_attributes_sync.assert_called_once_with(
        text_to_evaluate=text_to_evaluate,
        custom_attributes_template=expected_template_str,
        model_override=model_name,
        temperature=0.0,
        max_tokens=150,
        request_top_logprobs=5
    )


@patch('logprob_ranker.logprob_ranker.ranker.LiteLLMAdapter')
def test_get_scores_for_attributes_error_handling(mock_adapter_class):
    # Arrange
    mock_adapter_instance = MagicMock()
    mock_adapter_class.return_value = mock_adapter_instance

    # Configure the mock to raise an exception when score_text_attributes_sync is called
    mock_adapter_instance.score_text_attributes_sync.side_effect = Exception("LLM API Error")

    text_to_evaluate = "This will cause an error."
    attribute_names = ["is_problematic"]
    model_name = "error-model"

    # Act
    actual_scores = get_scores_for_attributes(
        text_to_evaluate=text_to_evaluate,
        attribute_names=attribute_names,
        model_name=model_name
    )

    # Assert
    assert actual_scores == [] # Expect an empty list on error
    mock_adapter_class.assert_called_once()
    adapter_call_args = mock_adapter_class.call_args
    assert adapter_call_args[1]['model'] == model_name
    assert isinstance(adapter_call_args[1]['config'], LogProbConfig)

    expected_template_str = '{ "is_problematic": LOGPROB_TRUE }'
    mock_adapter_instance.score_text_attributes_sync.assert_called_once_with(
        text_to_evaluate=text_to_evaluate,
        custom_attributes_template=expected_template_str,
        model_override=model_name,
        temperature=0.0,
        max_tokens=150,
        request_top_logprobs=5
    )

