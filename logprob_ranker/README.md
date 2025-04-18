# LogProb Ranker

A Python package for ranking Large Language Model (LLM) outputs using log probability self-scoring. This library implements the logprob self-ranking algorithm, which uses an LLM to evaluate its own outputs against specified criteria.

## Overview

The logprob self-ranking algorithm works by:

1. Generating multiple outputs for a prompt
2. Evaluating each output against a set of criteria
3. Calculating a log probability score for each output
4. Ranking outputs by their scores

This approach allows for more nuanced evaluation than simple temperature-based sampling.

## Installation

You can install LogProb Ranker using pip:

```bash
# Basic installation
pip install logprob-ranker

# With OpenAI support
pip install "logprob-ranker[openai]"

# With both OpenAI and Anthropic support
pip install "logprob-ranker[openai,anthropic]"
```

## Usage

### Command Line

The simplest way to use LogProb Ranker is via the command line:

```bash
# Set your API key as an environment variable
export OPENAI_API_KEY="your-key-here"

# Basic usage
logprob-ranker rank "Suggest a unique product idea for eco-conscious pet owners" --variants 3

# With custom criteria
logprob-ranker rank "Write marketing copy for a new AI product" --template criteria.json --output results.json
```

### Python API

For more control, use the Python API:

```python
import asyncio
from openai import AsyncOpenAI
from logprob_ranker import LogProbRanker, LogProbConfig, RankedOutput

async def main():
    # Initialize OpenAI client
    client = AsyncOpenAI(api_key="your-key-here")
    
    # Create a configuration
    config = LogProbConfig(
        num_variants=3,
        thread_count=3,
        temperature=0.8,
        template="""{ 
  "interesting": LOGPROB_TRUE,
  "creative": LOGPROB_TRUE,
  "useful": LOGPROB_TRUE
}"""
    )
    
    # Initialize ranker
    ranker = LogProbRanker(
        llm_client=client,
        config=config
    )
    
    # Define prompt
    prompt = "Suggest a unique product idea for eco-conscious pet owners"
    
    # Rank outputs
    ranked_outputs = await ranker.rank_outputs(prompt)
    
    # Display results
    for i, output in enumerate(ranked_outputs):
        print(f"\n{i+1}. Score: {output.logprob:.3f}")
        print(f"   Output: {output.output}")

if __name__ == "__main__":
    asyncio.run(main())
```

For a synchronous API:

```python
from logprob_ranker import LogProbRanker, LogProbConfig
from openai import OpenAI

client = OpenAI(api_key="your-key-here")
ranker = LogProbRanker(llm_client=client)
ranked_outputs = ranker.rank_outputs_sync("Your prompt here")
```

## Criteria Templates

The core of LogProb Ranker is the criteria template, which defines what makes a good output. Templates use a special format with `LOGPROB_TRUE` placeholders:

```json
{
  "interesting": LOGPROB_TRUE,
  "creative": LOGPROB_TRUE,
  "useful": LOGPROB_TRUE
}
```

This template is converted to a prompt that asks the LLM to evaluate outputs as JSON.

## Customization

You can customize:

- Evaluation criteria
- Number of variants to generate
- Temperature and other LLM settings
- Parallel processing (thread count)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.