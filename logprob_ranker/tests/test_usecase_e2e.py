"""
End-to-end tests for different use cases with LogProb Ranker.

These tests use OpenRouter to test the LogProbRanker with different types 
of content generation tasks and evaluation criteria.

To run these tests, you need an OpenRouter API key set as OPENROUTER_API_KEY
environment variable.
"""

import os
import unittest
import asyncio
from typing import List, Optional

from logprob_ranker.openrouter import OpenRouterAdapter
from logprob_ranker.ranker import LogProbConfig, RankedOutput


class TestUseCaseE2E(unittest.TestCase):
    """End-to-end tests for different content generation use cases."""
    
    def setUp(self):
        """Set up the test environment."""
        self.api_key = os.environ.get("OPENROUTER_API_KEY")
        if not self.api_key:
            self.skipTest("OPENROUTER_API_KEY environment variable not set")
        
        # Use gpt-3.5-turbo for consistent, cost-effective testing
        self.model = "openai/gpt-3.5-turbo"
        
        # Outputs collected during test
        self.outputs: List[RankedOutput] = []
    
    def callback(self, output: RankedOutput):
        """Callback to record outputs."""
        self.outputs.append(output)
    
    def test_creative_writing(self):
        """Test creative writing use case (short story)."""
        # Create a config with criteria for creative writing
        config = LogProbConfig()
        config.num_variants = 2  # Limit to 2 variants for testing
        config.template = """{
  "creativity": LOGPROB_TRUE,
  "coherence": LOGPROB_TRUE,
  "engagement": LOGPROB_TRUE,
  "character_development": LOGPROB_TRUE
}"""
        
        # Define prompt for a short story
        prompt = "Write a short sci-fi story about a robot that develops emotions."
        
        # Create adapter
        adapter = OpenRouterAdapter(
            self.model, 
            api_key=self.api_key,
            config=config,
            on_output_callback=self.callback
        )
        
        # Generate and rank outputs
        results = adapter.rank_outputs_sync(prompt)
        
        # Verify we got results
        self.assertGreater(len(results), 0)
        
        # Verify the outputs have scores
        for output in results:
            self.assertIsNotNone(output.logprob)
            self.assertIsNotNone(output.attribute_scores)
            if output.attribute_scores:
                self.assertGreater(len(output.attribute_scores), 0)
        
        # Print the best result
        best = results[0]
        print(f"\nBest creative writing output (score: {best.logprob:.2f}):")
        print(f"{best.output}\n")
        
        # Print the attribute scores
        if best.attribute_scores:
            print("Attribute scores:")
            for attr in best.attribute_scores:
                print(f"{attr.name}: {attr.score:.2f} - {attr.explanation}")
    
    def test_technical_explanation(self):
        """Test technical explanation use case."""
        # Create a config with criteria for technical explanation
        config = LogProbConfig()
        config.num_variants = 2  # Limit to 2 variants for testing
        config.template = """{
  "accuracy": LOGPROB_TRUE,
  "clarity": LOGPROB_TRUE,
  "conciseness": LOGPROB_TRUE,
  "technical_depth": LOGPROB_TRUE
}"""
        
        # Define prompt for a technical explanation
        prompt = "Explain how a quantum computer works and why it's different from classical computers."
        
        # Create adapter
        adapter = OpenRouterAdapter(
            self.model, 
            api_key=self.api_key,
            config=config,
            on_output_callback=self.callback
        )
        
        # Generate and rank outputs
        results = adapter.rank_outputs_sync(prompt)
        
        # Verify we got results
        self.assertGreater(len(results), 0)
        
        # Verify the outputs have scores
        for output in results:
            self.assertIsNotNone(output.logprob)
            self.assertIsNotNone(output.attribute_scores)
            if output.attribute_scores:
                self.assertGreater(len(output.attribute_scores), 0)
        
        # Print the best result
        best = results[0]
        print(f"\nBest technical explanation (score: {best.logprob:.2f}):")
        print(f"{best.output}\n")
        
        # Print the attribute scores
        if best.attribute_scores:
            print("Attribute scores:")
            for attr in best.attribute_scores:
                print(f"{attr.name}: {attr.score:.2f} - {attr.explanation}")

    def test_persuasive_content(self):
        """Test persuasive content use case."""
        # Create a config with criteria for persuasive content
        config = LogProbConfig()
        config.num_variants = 2  # Limit to 2 variants for testing
        config.template = """{
  "persuasiveness": LOGPROB_TRUE,
  "evidence_based": LOGPROB_TRUE,
  "emotional_appeal": LOGPROB_TRUE,
  "call_to_action": LOGPROB_TRUE
}"""
        
        # Define prompt for persuasive content
        prompt = "Write a persuasive paragraph about why people should reduce plastic usage."
        
        # Create adapter
        adapter = OpenRouterAdapter(
            self.model, 
            api_key=self.api_key,
            config=config,
            on_output_callback=self.callback
        )
        
        # Generate and rank outputs
        results = adapter.rank_outputs_sync(prompt)
        
        # Verify we got results
        self.assertGreater(len(results), 0)
        
        # Verify the outputs have scores
        for output in results:
            self.assertIsNotNone(output.logprob)
            self.assertIsNotNone(output.attribute_scores)
            if output.attribute_scores:
                self.assertGreater(len(output.attribute_scores), 0)
        
        # Print the best result
        best = results[0]
        print(f"\nBest persuasive content (score: {best.logprob:.2f}):")
        print(f"{best.output}\n")
        
        # Print the attribute scores
        if best.attribute_scores:
            print("Attribute scores:")
            for attr in best.attribute_scores:
                print(f"{attr.name}: {attr.score:.2f} - {attr.explanation}")
    
    def test_instructional_content(self):
        """Test instructional/how-to content use case."""
        # Create a config with criteria for instructional content
        config = LogProbConfig()
        config.num_variants = 2  # Limit to 2 variants for testing
        config.template = """{
  "clarity": LOGPROB_TRUE,
  "step_by_step": LOGPROB_TRUE,
  "completeness": LOGPROB_TRUE,
  "actionable": LOGPROB_TRUE
}"""
        
        # Define prompt for instructional content
        prompt = "Explain how to make a basic web page using HTML and CSS for beginners."
        
        # Create adapter
        adapter = OpenRouterAdapter(
            self.model, 
            api_key=self.api_key,
            config=config,
            on_output_callback=self.callback
        )
        
        # Generate and rank outputs
        results = adapter.rank_outputs_sync(prompt)
        
        # Verify we got results
        self.assertGreater(len(results), 0)
        
        # Verify the outputs have scores
        for output in results:
            self.assertIsNotNone(output.logprob)
            self.assertIsNotNone(output.attribute_scores)
            if output.attribute_scores:
                self.assertGreater(len(output.attribute_scores), 0)
        
        # Print the best result
        best = results[0]
        print(f"\nBest instructional content (score: {best.logprob:.2f}):")
        print(f"{best.output}\n")
        
        # Print the attribute scores
        if best.attribute_scores:
            print("Attribute scores:")
            for attr in best.attribute_scores:
                print(f"{attr.name}: {attr.score:.2f} - {attr.explanation}")
    
    def test_summarization(self):
        """Test summarization use case."""
        # Create a config with criteria for summarization
        config = LogProbConfig()
        config.num_variants = 2  # Limit to 2 variants for testing
        config.template = """{
  "conciseness": LOGPROB_TRUE,
  "comprehensiveness": LOGPROB_TRUE,
  "accuracy": LOGPROB_TRUE,
  "clarity": LOGPROB_TRUE
}"""
        
        # Create a long text to summarize (simplified for test)
        long_text = """
        Artificial intelligence (AI) is intelligence demonstrated by machines, as opposed to natural intelligence displayed by animals including humans. 
        AI research has been defined as the field of study of intelligent agents, which refers to any system that perceives its environment and takes actions that maximize its chance of achieving its goals.
        The term "artificial intelligence" had previously been used to describe machines that mimic and display "human" cognitive skills that are associated with the human mind, such as "learning" and "problem-solving". 
        This definition has since been rejected by major AI researchers who now describe AI in terms of rationality and acting rationally, which does not limit how intelligence can be articulated.
        AI applications include advanced web search engines (e.g., Google), recommendation systems (used by YouTube, Amazon, and Netflix), understanding human speech (such as Siri and Alexa), self-driving cars (e.g., Waymo), 
        generative or creative tools (ChatGPT and AI art), automated decision-making, and competing at the highest level in strategic game systems (such as chess and Go).
        As machines become increasingly capable, tasks considered to require "intelligence" are often removed from the definition of AI, a phenomenon known as the AI effect. For instance, optical character recognition is frequently excluded from things considered to be AI, having become a routine technology.
        """
        
        # Define prompt for summarization
        prompt = f"Summarize the following text in a concise paragraph:\n\n{long_text}"
        
        # Create adapter
        adapter = OpenRouterAdapter(
            self.model, 
            api_key=self.api_key,
            config=config,
            on_output_callback=self.callback
        )
        
        # Generate and rank outputs
        results = adapter.rank_outputs_sync(prompt)
        
        # Verify we got results
        self.assertGreater(len(results), 0)
        
        # Verify the outputs have scores
        for output in results:
            self.assertIsNotNone(output.logprob)
            self.assertIsNotNone(output.attribute_scores)
            if output.attribute_scores:
                self.assertGreater(len(output.attribute_scores), 0)
        
        # Print the best result
        best = results[0]
        print(f"\nBest summarization (score: {best.logprob:.2f}):")
        print(f"{best.output}\n")
        
        # Print the attribute scores
        if best.attribute_scores:
            print("Attribute scores:")
            for attr in best.attribute_scores:
                print(f"{attr.name}: {attr.score:.2f} - {attr.explanation}")
                
    def test_code_generation(self):
        """Test code generation use case."""
        # Create a config with criteria for code generation
        config = LogProbConfig()
        config.num_variants = 2  # Limit to 2 variants for testing
        config.template = """{
  "correctness": LOGPROB_TRUE,
  "efficiency": LOGPROB_TRUE,
  "readability": LOGPROB_TRUE,
  "completeness": LOGPROB_TRUE
}"""
        
        # Define prompt for code generation
        prompt = "Write a Python function to check if a string is a palindrome (reads the same forwards and backwards)."
        
        # Create adapter
        adapter = OpenRouterAdapter(
            self.model, 
            api_key=self.api_key,
            config=config,
            on_output_callback=self.callback
        )
        
        # Generate and rank outputs
        results = adapter.rank_outputs_sync(prompt)
        
        # Verify we got results
        self.assertGreater(len(results), 0)
        
        # Verify the outputs have scores
        for output in results:
            self.assertIsNotNone(output.logprob)
            self.assertIsNotNone(output.attribute_scores)
            if output.attribute_scores:
                self.assertGreater(len(output.attribute_scores), 0)
        
        # Print the best result
        best = results[0]
        print(f"\nBest code generation (score: {best.logprob:.2f}):")
        print(f"{best.output}\n")
        
        # Print the attribute scores
        if best.attribute_scores:
            print("Attribute scores:")
            for attr in best.attribute_scores:
                print(f"{attr.name}: {attr.score:.2f} - {attr.explanation}")


if __name__ == "__main__":
    unittest.main()