"""
End-to-end tests for OpenRouter integration with LogProb Ranker.

These tests make actual API calls to OpenRouter and verify the functionality
of the LogProbRanker with real model responses. 

To run these tests, you need an OpenRouter API key set as OPENROUTER_API_KEY
environment variable.

NOTE: These tests incur costs as they make actual API calls. We use Gemini Flash
where possible to minimize costs.
"""

import os
import unittest
import asyncio
from typing import Dict, Any, Optional, List

# Import the package
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from logprob_ranker import LogProbConfig, RankedOutput
from logprob_ranker.ranker import LiteLLMAdapter


# Skip tests if no API key is available
SKIP_TESTS = "OPENROUTER_API_KEY" not in os.environ
SKIP_MESSAGE = "Skipping OpenRouter tests: No API key (OPENROUTER_API_KEY) found"

# Use a well-supported model for testing
TEST_MODEL = "openrouter/openai/gpt-3.5-turbo"


class TestOpenRouterE2E(unittest.TestCase):
    """End-to-end tests for OpenRouter integration."""
    
    def setUp(self):
        """Set up the test environment."""
        if SKIP_TESTS:
            self.skipTest(SKIP_MESSAGE)
        
        # Create a minimal config for testing
        self.config = LogProbConfig(
            num_variants=2,  # Generate only 2 variants to save costs
            max_tokens=50,  # Keep responses short
            temperature=0.7,
        )
        
        # Set up a simple prompt for testing
        self.prompt = "Write a short haiku about programming."
        
        # Set up criteria for evaluating the outputs
        self.criteria = """
        Evaluate this haiku based on:
        1. Follows haiku structure (5-7-5 syllables)
        2. Relevance to programming
        3. Creativity and imagery
        4. Emotional impact
        """
        
        # Track outputs for verification
        self.generated_outputs: List[RankedOutput] = []
    
    def callback(self, output: RankedOutput):
        """Callback to record outputs."""
        self.generated_outputs.append(output)
    
    def test_openrouter_sync_api(self):
        """Test synchronous API with OpenRouter."""
        # Create adapter
        adapter = LiteLLMAdapter(
            model=TEST_MODEL,
            config=self.config,
            on_output_callback=self.callback
        )
        
        # Run the ranking
        result = adapter.rank(self.prompt, criteria=self.criteria)
        
        # Verify result
        self.assertIsNotNone(result)
        self.assertIsInstance(result, RankedOutput)
        self.assertGreater(len(self.generated_outputs), 0)
        self.assertGreater(result.total_score, 0)
        
        # Check scores
        print(f"\nGenerated output: {result.output}")
        print(f"Total score: {result.total_score}")
        
        # If we have attribute scores, print them
        if result.attribute_scores:
            self.assertGreater(len(result.attribute_scores), 0)
            for attr in result.attribute_scores:
                print(f"{attr.name}: {attr.score} - {attr.explanation}")
        else:
            print("No attribute scores available - using logprob score only")
    
    @unittest.skipIf(SKIP_TESTS, SKIP_MESSAGE)
    def test_openrouter_async_api(self):
        """Test asynchronous API with OpenRouter."""
        async def run_async_test():
            # Clear previous outputs
            self.generated_outputs = []
            
            # Create adapter
            adapter = LiteLLMAdapter(
                model=TEST_MODEL,
                config=self.config,
                on_output_callback=self.callback
            )
            
            # Run the ranking
            result = await adapter.arank(self.prompt, criteria=self.criteria)
            
            # Verify result
            self.assertIsNotNone(result)
            self.assertIsInstance(result, RankedOutput)
            self.assertGreater(len(self.generated_outputs), 0)
            self.assertGreater(result.total_score, 0)
            
            # Print results for verification
            print(f"\nAsync generated output: {result.output}")
            print(f"Async total score: {result.total_score}")
            
            # If we have attribute scores, print them
            if result.attribute_scores:
                self.assertGreater(len(result.attribute_scores), 0)
                for attr in result.attribute_scores:
                    print(f"{attr.name}: {attr.score} - {attr.explanation}")
            else:
                print("No attribute scores available - using logprob score only")
        
        # Run the async test
        asyncio.run(run_async_test())
    
    @unittest.skipIf(SKIP_TESTS, SKIP_MESSAGE)
    def test_different_prompt_types(self):
        """Test with different types of prompts."""
        # Test with a more technical prompt
        technical_prompt = "Explain how recursion works in programming."
        technical_criteria = """
        Evaluate this explanation based on:
        1. Technical accuracy
        2. Clarity of explanation
        3. Use of examples
        4. Thoroughness
        """
        
        adapter = OpenRouterAdapter(
            model=TEST_MODEL,
            config=self.config
        )
        
        # Run the ranking
        result = adapter.rank(technical_prompt, criteria=technical_criteria)
        
        # Verify result
        self.assertIsNotNone(result)
        self.assertIsInstance(result, RankedOutput)
        self.assertGreater(result.total_score, 0)
        
        # Print results for manual verification
        print(f"\nTechnical explanation output: {result.output}")
        print(f"Technical explanation score: {result.total_score}")


if __name__ == "__main__":
    unittest.main()
