"""
Basic tests for LiteLLMAdapter initialization.
"""

# Standard library imports
import os
import sys
import unittest
from unittest.mock import patch # MagicMock removed

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

# First-party imports
from logprob_ranker.logprob_ranker.ranker import LiteLLMAdapter, LogProbConfig

class TestLiteLLMBasic(unittest.TestCase):
    """Test basic initialization of LiteLLMAdapter."""

    def setUp(self):
        """Set up test fixtures."""
        # Create a config
        self.config = LogProbConfig(
            num_variants=2,
            thread_count=1,
            template='{"test": LOGPROB_TRUE}'
        )
        
    def test_openai_initialization(self):
        """Test initialization with OpenAI model."""
        with patch('logprob_ranker.logprob_ranker.ranker.litellm'):
            adapter = LiteLLMAdapter(
                model="gpt-3.5-turbo",
                api_key="test-key",
                config=self.config
            )
            
            # Check basic properties
            self.assertEqual(adapter.model, "gpt-3.5-turbo")
            self.assertEqual(adapter.api_key, "test-key")
            self.assertEqual(adapter.config, self.config)
    
    def test_anthropic_initialization(self):
        """Test initialization with Anthropic model."""
        with patch('logprob_ranker.logprob_ranker.ranker.litellm'):
            adapter = LiteLLMAdapter(
                model="claude-2",
                api_key="anthropic-test-key",
                config=self.config
            )
            
            # Check basic properties
            self.assertEqual(adapter.model, "claude-2")
            self.assertEqual(adapter.api_key, "anthropic-test-key")
    
    def test_custom_initialization(self):
        """Test initialization with custom model."""
        with patch('logprob_ranker.logprob_ranker.ranker.litellm'):
            adapter = LiteLLMAdapter(
                model="custom-model",
                api_key="custom-key",
                config=self.config,
                base_url="https://custom-api.example.com"
            )
            
            # Check kwargs are stored
            self.assertEqual(adapter.api_key, "custom-key")
            self.assertEqual(adapter.additional_kwargs["base_url"], "https://custom-api.example.com")
            
if __name__ == "__main__":
    unittest.main()