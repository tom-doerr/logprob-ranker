"""
Command-line interface for the LogProb ranker.
"""

import argparse
import asyncio
import os
import sys
import json
from typing import Optional, Dict, Any
import importlib.metadata

from .ranker import LogProbRanker, LogProbConfig, RankedOutput
from .utils import serialize_ranked_output

def setup_parser() -> argparse.ArgumentParser:
    """Set up the argument parser."""
    parser = argparse.ArgumentParser(
        description="LogProb Ranker: Rank LLM outputs by self-evaluation",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    
    # Get version info
    try:
        version = importlib.metadata.version("logprob_ranker")
    except importlib.metadata.PackageNotFoundError:
        version = "0.1.0"  # Default version
    
    parser.add_argument("--version", action="version", version=f"%(prog)s {version}")
    
    # Create subparsers for different commands
    subparsers = parser.add_subparsers(dest="command", help="Command to run")
    
    # Rank command
    rank_parser = subparsers.add_parser("rank", help="Rank outputs for a prompt")
    rank_parser.add_argument("prompt", help="The prompt to generate content from")
    rank_parser.add_argument(
        "--variants", "-n", type=int, default=3, help="Number of variants to generate"
    )
    rank_parser.add_argument(
        "--temperature", "-t", type=float, default=0.7, help="Temperature for generation"
    )
    rank_parser.add_argument(
        "--threads", type=int, default=1, help="Number of threads to use"
    )
    rank_parser.add_argument(
        "--model", "-m", default="gpt-3.5-turbo", help="Model to use (for OpenAI API)"
    )
    rank_parser.add_argument(
        "--template", "-c", help="Path to a JSON file containing criteria template"
    )
    rank_parser.add_argument(
        "--output", "-o", help="Path to save results (JSON format)"
    )
    rank_parser.add_argument(
        "--api-key", help="API key (alternatively, set OPENAI_API_KEY environment variable)"
    )
    
    # CLI defaults
    rank_parser.add_argument(
        "--provider", default="openai", 
        choices=["openai"], 
        help="API provider to use (currently only OpenAI is supported)"
    )
    
    return parser

def load_template_from_file(file_path: str) -> Optional[str]:
    """Load a template from a file."""
    try:
        with open(file_path, 'r') as f:
            return f.read().strip()
    except Exception as e:
        print(f"Error loading template from {file_path}: {e}", file=sys.stderr)
        return None

def create_client(provider: str, api_key: Optional[str]) -> Any:
    """Create an API client based on the provider."""
    if provider == "openai":
        try:
            from openai import AsyncOpenAI
        except ImportError:
            print("Error: openai package is not installed.", file=sys.stderr)
            print("Install it with: pip install openai", file=sys.stderr)
            sys.exit(1)
            
        # Get API key from argument or environment
        openai_api_key = api_key or os.environ.get("OPENAI_API_KEY")
        if not openai_api_key:
            print("Error: OpenAI API key is required.", file=sys.stderr)
            print("Please provide it with --api-key or set the OPENAI_API_KEY environment variable.", file=sys.stderr)
            sys.exit(1)
            
        return AsyncOpenAI(api_key=openai_api_key)
    else:
        print(f"Error: Provider {provider} is not supported.", file=sys.stderr)
        sys.exit(1)

def on_output_generated(output: RankedOutput) -> None:
    """Called when an output is generated and evaluated."""
    print(f"Generated output {output.index + 1} with score: {output.logprob:.3f}")
    
async def run_rank_command(args: argparse.Namespace) -> None:
    """Run the rank command."""
    # Create the client
    client = create_client(args.provider, args.api_key)
    
    # Load template if specified
    template = None
    if args.template:
        template = load_template_from_file(args.template)
        if not template:
            sys.exit(1)
    
    # Create the config
    config = LogProbConfig(
        num_variants=args.variants,
        thread_count=args.threads,
        temperature=args.temperature,
        template=template or LogProbConfig().template
    )
    
    # Create ranker
    ranker = LogProbRanker(
        llm_client=client,
        config=config,
        on_output_callback=on_output_generated
    )
    
    # Run the ranking
    print(f"Prompt: {args.prompt}")
    print(f"Generating {args.variants} variants...")
    
    ranked_outputs = await ranker.rank_outputs(args.prompt)
    
    # Display results
    print("\nResults (ranked by logprob score):")
    print("----------------------------------")
    
    for i, output in enumerate(ranked_outputs):
        print(f"\n{i+1}. Score: {output.logprob:.3f}")
        print(f"   Output: {output.output}")
        
        if output.attribute_scores:
            print("   Attribute Scores:")
            for attr in output.attribute_scores:
                print(f"     - {attr.name}: {attr.score:.3f}")
    
    # Save results if output file is specified
    if args.output:
        try:
            results = [serialize_ranked_output(output) for output in ranked_outputs]
            with open(args.output, 'w') as f:
                json.dump({
                    "prompt": args.prompt,
                    "results": results,
                    "config": {
                        "variants": args.variants,
                        "temperature": args.temperature,
                        "threads": args.threads,
                        "template": config.template
                    }
                }, f, indent=2)
            print(f"\nResults saved to {args.output}")
        except Exception as e:
            print(f"Error saving results to {args.output}: {e}", file=sys.stderr)

def main() -> None:
    """Main entry point."""
    parser = setup_parser()
    args = parser.parse_args()
    
    if args.command == "rank":
        asyncio.run(run_rank_command(args))
    elif not args.command:
        parser.print_help()
    else:
        print(f"Unknown command: {args.command}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()