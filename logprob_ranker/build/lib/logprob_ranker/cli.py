"""
Command-line interface for the LogProb ranker.
"""

import os
import json
import argparse
import asyncio
from typing import Optional

from .ranker import (
    LogProbConfig, 
    RankedOutput,
    LiteLLMAdapter
)
from .utils import serialize_ranked_output


def setup_parser() -> argparse.ArgumentParser:
    """Set up the argument parser."""
    parser = argparse.ArgumentParser(
        description="LogProb Ranker: Rank LLM outputs using log probability scoring"
    )
    
    subparsers = parser.add_subparsers(dest="command", help="Command to run")
    
    # Rank command
    rank_parser = subparsers.add_parser(
        "rank", help="Generate and rank outputs for a prompt"
    )
    rank_parser.add_argument(
        "prompt", help="The prompt to generate content from"
    )
    rank_parser.add_argument(
        "--variants", "-v", type=int, default=3,
        help="Number of output variants to generate (default: 3)"
    )
    rank_parser.add_argument(
        "--temperature", "-t", type=float, default=0.7,
        help="Temperature for generation (default: 0.7)"
    )
    rank_parser.add_argument(
        "--max-tokens", "-m", type=int, default=500,
        help="Maximum tokens to generate (default: 500)"
    )
    rank_parser.add_argument(
        "--template", "-c", type=str,
        help="Path to template file with evaluation criteria"
    )
    rank_parser.add_argument(
        "--output", "-o", type=str,
        help="Path to output file for results (JSON format)"
    )
    rank_parser.add_argument(
        "--provider", "-p", type=str, choices=["openai", "anthropic", "custom"],
        default="openai", help="LLM provider to use (default: openai)"
    )
    rank_parser.add_argument(
        "--api-key", type=str,
        help="API key for the LLM provider (defaults to environment variable)"
    )
    rank_parser.add_argument(
        "--threads", type=int, default=1,
        help="Number of parallel threads to use (default: 1)"
    )
    
    return parser


def load_template_from_file(file_path: str) -> Optional[str]:
    """Load a template from a file."""
    if not os.path.exists(file_path):
        print(f"Error: Template file not found: {file_path}")
        return None
        
    try:
        with open(file_path, "r", encoding='utf-8') as f:
            return f.read()
    except OSError as e:
        print(f"Error loading template file: {e}")
        return None


def get_model(provider: str) -> str:
    """Get a default model based on provider."""
    if provider == "openai":
        return "gpt-3.5-turbo"
    if provider == "anthropic":
        return "claude-2"
    return "gpt-3.5-turbo"  # default


def on_output_generated(output: RankedOutput) -> None:
    """Called when an output is generated and evaluated."""
    print(f"\nOutput #{output.index + 1} (Score: {output.logprob:.3f}):")
    print(f"{output.output[:100]}...")  # Show first 100 chars
    
    if output.attribute_scores:
        print("Attribute scores:")
        for attr in output.attribute_scores:
            print(f"  {attr.name}: {attr.score:.3f}")


async def run_rank_command(args: argparse.Namespace) -> None:
    """Run the rank command."""
    # Load template if provided
    template = None
    if args.template:
        template = load_template_from_file(args.template)
        if not template:
            return
    
    # Create config
    config = LogProbConfig(
        num_variants=args.variants,
        temperature=args.temperature,
        max_tokens=args.max_tokens,
        thread_count=args.threads
    )
    
    # Use template if provided
    if template:
        config.template = template

    # Get model based on provider
    model = get_model(args.provider)
    
    # Create the LiteLLMAdapter
    ranker = LiteLLMAdapter(
        model=model,
        api_key=args.api_key,
        config=config,
        on_output_callback=on_output_generated
    )
    
    # Run ranking
    print(f"Generating and ranking {args.variants} outputs for: {args.prompt}")
    print(f"Using {args.provider} API with temperature {args.temperature}")
    print("This may take a minute...")
    
    results = await ranker.rank_outputs(args.prompt)
    
    # Display results
    print("\n===== RANKED RESULTS =====")
    for i, result in enumerate(results):
        print(f"\n{i+1}. Score: {result.logprob:.3f}")
        print(f"Output: {result.output}")
    
    # Save results to file if requested
    if args.output:
        try:
            with open(args.output, "w", encoding='utf-8') as f:
                # Convert results to serializable format
                json_results = [serialize_ranked_output(r) for r in results]
                json.dump(json_results, f, indent=2)
            print(f"\nResults saved to {args.output}")
        except OSError as e:
            print(f"Error saving results: {e}")


def main() -> None:
    """Main entry point."""
    parser = setup_parser()
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    if args.command == "rank":
        asyncio.run(run_rank_command(args))
    else:
        print(f"Unknown command: {args.command}")
        parser.print_help()


if __name__ == "__main__":
    main()
