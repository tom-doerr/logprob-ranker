"""
Example of using LogProbRanker with multiple LLM providers via LiteLLM.

This example demonstrates how to use the LogProbRanker to compare outputs from
different LLM providers (OpenAI, Anthropic, Cohere, etc.) using the same prompt.

This script will:
1. Run the same prompt through multiple LLM providers
2. Rank the outputs from each provider using the same criteria
3. Compare the best results and show detailed attribute scores
4. Generate a summary showing which provider performed best

To use this example, you'll need API keys for each provider set as environment variables:
- OpenAI: OPENAI_API_KEY
- Anthropic: ANTHROPIC_API_KEY
- Cohere: COHERE_API_KEY
- Google: GOOGLE_API_KEY
- etc.

The script will automatically skip providers where you don't have an API key.
"""

import asyncio
import os
import json
import time
import sys
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple

# Add the parent directory to sys.path to make the package importable in examples
sys.path.insert(0, str(Path(__file__).parent.parent))
from logprob_ranker import (
    LogProbConfig,
    LiteLLMAdapter,
    RankedOutput
)


# Track provider info alongside each output
class ProviderOutput(RankedOutput):
    """Extended RankedOutput class that includes provider information."""
    provider: str = ""
    model: str = ""
    generation_time: float = 0.0


def on_output(output: RankedOutput, provider: str, model: str):
    """Called when an output is generated and evaluated."""
    print(f"\nOutput #{output.index + 1} from {provider.upper()} ({model}):")
    print(f"Score: {output.logprob:.3f}")
    print(f"{output.output[:150]}...")  # Show first 150 chars
    
    if output.attribute_scores:
        print("Attribute scores:")
        for attr in output.attribute_scores:
            print(f"  {attr.name}: {attr.score:.3f}")


async def rank_with_provider(provider: str, model: str, prompt: str, 
                            config: LogProbConfig) -> Optional[Dict[str, Any]]:
    """
    Generate and rank outputs using the specified provider and model.
    
    Args:
        provider: The LLM provider name (for env variable naming)
        model: The model identifier for LiteLLM
        prompt: The prompt to generate content from
        config: The LogProbConfig to use
        
    Returns:
        Dictionary with provider info and results, or None if failed
    """
    # Get API key from environment based on provider
    env_var = f"{provider.upper()}_API_KEY"
    api_key = os.environ.get(env_var)
    
    if not api_key:
        print(f"Skipping {provider.upper()} (no {env_var} found in environment)")
        return None
    
    # Create a wrapper for the callback to include provider info
    def provider_callback(output: RankedOutput):
        on_output(output, provider, model)
    
    # Create ranker using LiteLLM adapter with the specified model
    ranker = LiteLLMAdapter(
        model=model,
        api_key=api_key,
        config=config,
        on_output_callback=provider_callback
    )
    
    print(f"\n===== Using {provider.upper()} with model: {model} =====")
    print(f"Generating and ranking outputs...\n")
    
    try:
        # Measure generation time
        start_time = time.time()
        
        # Generate and rank outputs
        results = await ranker.rank_outputs(prompt)
        
        # Calculate generation time
        end_time = time.time()
        generation_time = end_time - start_time
        
        # Enhance results with provider info
        provider_results = []
        for result in results:
            # Create a ProviderOutput by copying all attributes from the result
            provider_output = ProviderOutput(
                output=result.output,
                logprob=result.logprob,
                index=result.index,
                attribute_scores=result.attribute_scores,
                raw_evaluation=result.raw_evaluation
            )
            # Add provider-specific information
            provider_output.provider = provider
            provider_output.model = model
            provider_output.generation_time = generation_time
            provider_results.append(provider_output)
        
        return {
            "provider": provider,
            "model": model,
            "results": provider_results,
            "generation_time": generation_time
        }
    except Exception as e:
        print(f"Error with {provider.upper()}: {str(e)}")
        return None


async def run_with_providers(prompt: str, providers: List[Tuple[str, str]],
                           criteria_template: str) -> Dict[str, Any]:
    """
    Run the same prompt through multiple providers and compare results.
    
    Args:
        prompt: The prompt to use
        providers: List of (provider_name, model_name) tuples
        criteria_template: The evaluation criteria template
        
    Returns:
        Dictionary with all results and performance data
    """
    # Create common config to use with all providers
    config = LogProbConfig(
        num_variants=3,  # Generate 3 variants per provider
        temperature=0.7,
        max_tokens=350,
        thread_count=2,
        template=criteria_template,
        # Custom system prompt for better results
        system_prompt="You are a helpful assistant that provides clear, accurate explanations."
    )
    
    # Create tasks for all providers
    tasks = []
    for provider, model in providers:
        task = rank_with_provider(provider, model, prompt, config)
        tasks.append(task)
    
    # Run all tasks concurrently and collect results
    all_results = {}
    all_provider_results = []
    
    # Use as_completed to get results as they finish
    for future in asyncio.as_completed(tasks):
        result = await future
        if result:
            provider = result["provider"]
            all_results[provider] = result
            all_provider_results.append(result)
    
    return {
        "prompt": prompt,
        "provider_results": all_provider_results,
        "criteria_template": criteria_template
    }


def print_comparison_report(data: Dict[str, Any]):
    """
    Print a detailed comparison report of all provider results.
    
    Args:
        data: The data returned from run_with_providers
    """
    print("\n" + "="*70)
    print("PROVIDER COMPARISON REPORT")
    print("="*70)
    
    prompt = data["prompt"]
    provider_results = data["provider_results"]
    criteria = data["criteria_template"]
    
    print(f"Prompt: \"{prompt}\"")
    print(f"Number of providers tested: {len(provider_results)}")
    print("Evaluation criteria:")
    
    # Extract attribute names from the template
    import re
    attributes = re.findall(r'"([^"]+)":\s*LOGPROB_TRUE', criteria)
    print(", ".join(attributes))
    
    print("\n" + "-"*70)
    print("PROVIDER RANKINGS BY AVERAGE SCORE")
    print("-"*70)
    
    # Calculate average scores and sort providers
    provider_averages = []
    for p_result in provider_results:
        provider = p_result["provider"].upper()
        model = p_result["model"]
        results = p_result["results"]
        generation_time = p_result["generation_time"]
        
        # Calculate average score and per-attribute averages
        avg_score = sum(r.logprob for r in results) / len(results)
        
        # Get per-attribute averages
        attr_averages = {}
        if results and results[0].attribute_scores:
            for attr_name in attributes:
                attr_scores = []
                for result in results:
                    if result.attribute_scores:
                        score = next((a.score for a in result.attribute_scores 
                                    if a.name == attr_name), None)
                        if score is not None:
                            attr_scores.append(score)
                if attr_scores:
                    attr_averages[attr_name] = sum(attr_scores) / len(attr_scores)
        
        provider_averages.append({
            "provider": provider,
            "model": model,
            "avg_score": avg_score,
            "best_score": results[0].logprob if results else 0,
            "generation_time": generation_time,
            "attribute_averages": attr_averages
        })
    
    # Sort by average score (highest first)
    provider_averages.sort(key=lambda x: x["avg_score"], reverse=True)
    
    # Print provider rankings
    for i, p_avg in enumerate(provider_averages):
        print(f"{i+1}. {p_avg['provider']} ({p_avg['model']})")
        print(f"   Average score: {p_avg['avg_score']:.3f}")
        print(f"   Best output score: {p_avg['best_score']:.3f}")
        print(f"   Generation time: {p_avg['generation_time']:.2f} seconds")
        
        # Print attribute averages
        if p_avg["attribute_averages"]:
            print("   Attribute averages:")
            for attr, score in p_avg["attribute_averages"].items():
                print(f"     {attr}: {score:.3f}")
        print()
    
    # Print the best output from each provider
    print("\n" + "-"*70)
    print("BEST OUTPUT FROM EACH PROVIDER")
    print("-"*70)
    
    # Sort by best score
    provider_results.sort(key=lambda x: x["results"][0].logprob if x["results"] else 0, reverse=True)
    
    for i, p_result in enumerate(provider_results):
        provider = p_result["provider"].upper()
        model = p_result["model"]
        results = p_result["results"]
        
        if results:
            best = results[0]
            print(f"\n{i+1}. {provider} ({model}) - Score: {best.logprob:.3f}")
            print("-" * 50)
            print(best.output)
            
            # Print attribute scores for this result
            if best.attribute_scores:
                print("\nAttribute scores:")
                for attr in best.attribute_scores:
                    print(f"  {attr.name}: {attr.score:.3f}")
            
            print("-" * 50)


async def main():
    """Run examples with multiple providers and compare results."""
    print("LogProb Ranker - Multi-Provider Comparison")
    print("This example will compare outputs from different LLM providers")
    print("using the same prompt and evaluation criteria.\n")
    
    # Define a prompt to use with all providers
    prompt = "Explain the concept of distributed computing to a high school student."
    
    # Define providers and models to test
    # These are popular models from various providers
    providers = [
        ("openai", "gpt-3.5-turbo"),
        ("anthropic", "claude-instant-1"),
        ("cohere", "command-light"),
        # Add or remove providers based on which API keys you have
    ]
    
    # Define evaluation criteria
    criteria_template = """{
  "clear": LOGPROB_TRUE,
  "accurate": LOGPROB_TRUE, 
  "educational": LOGPROB_TRUE,
  "engaging": LOGPROB_TRUE
}"""
    
    print(f"Testing {len(providers)} providers with the prompt:")
    print(f'"{prompt}"\n')
    print("Providers without API keys will be skipped automatically.")
    
    # Run the comparison
    results = await run_with_providers(prompt, providers, criteria_template)
    
    # Print the comparison report
    print_comparison_report(results)
    
    # Save results to a JSON file
    try:
        # Clean up results for serialization
        serializable_results = {
            "prompt": results["prompt"],
            "criteria_template": results["criteria_template"],
            "providers": []
        }
        
        for pr in results["provider_results"]:
            provider_data = {
                "provider": pr["provider"],
                "model": pr["model"],
                "generation_time": pr["generation_time"],
                "outputs": []
            }
            
            # Convert each output to a serializable form
            from logprob_ranker.utils import serialize_ranked_output
            for output in pr["results"]:
                serialized = serialize_ranked_output(output)
                serialized["provider"] = output.provider
                serialized["model"] = output.model
                provider_data["outputs"].append(serialized)
            
            serializable_results["providers"].append(provider_data)
        
        # Save to file
        with open("provider_comparison_results.json", "w") as f:
            json.dump(serializable_results, f, indent=2)
            print("\nResults saved to provider_comparison_results.json")
    except Exception as e:
        print(f"\nFailed to save results to JSON: {str(e)}")


if __name__ == "__main__":
    asyncio.run(main())