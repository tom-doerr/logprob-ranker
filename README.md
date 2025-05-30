# LogProb Ranker

[![PyPI version](https://badge.fury.io/py/logprob-ranker.svg)](https://badge.fury.io/py/logprob-ranker) 
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A Python library for ranking LLM outputs using log probability scoring with multi-provider support.

## Overview

LogProb Ranker is a library that helps you automatically generate and rank multiple outputs from language models according to specific criteria you define. It uses a smart "self-ranking" algorithm that gets the model to evaluate its own outputs against your criteria, resulting in better quality responses.

![LogProb Ranking Process](https://github.com/tom-doerr/logprob-ranker/raw/main/docs/images/logprob-ranking.png)

### Key Features

- **Multi-Provider Support**: Works with OpenAI, Anthropic, Cohere, Google, and more via LiteLLM
- **Multiple Interfaces**: Command-line (CLI), Asynchronous Python API, and Synchronous Python API
- **Customizable Criteria**: Define your own evaluation attributes in a simple JSON template (e.g., `{"helpful": LOGPROB_TRUE, "concise": LOGPROB_TRUE}`)
- **Attribute Scoring**: Get detailed scores for individual criteria (creativity, helpfulness, etc.)
- **Provider Comparison**: Compare outputs from different LLM providers with the same prompt
- **Progress Monitoring**: Optional callback function (`on_output_callback`) to track generated outputs.
- **Parallel Generation**: Generate and rank multiple outputs concurrently for better performance

## Installation

```bash
pip install logprob-ranker
```

## Quick Start

**API Keys:** LogProb Ranker reads API keys from environment variables (e.g., `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`). Ensure the necessary keys are set for the provider(s) you intend to use. **Never hardcode API keys directly in your script.**

### 1. Simple Example (Synchronous API)

```python
import os
from logprob_ranker import LogProbConfig, LiteLLMAdapter

# Example: Set your API key in the environment
# os.environ["OPENAI_API_KEY"] = "your-api-key"

# Create configuration
config = LogProbConfig(
    num_variants=3,  # Generate 3 candidate outputs
    # Define evaluation criteria template.
    # LOGPROB_TRUE is a placeholder indicating the model should evaluate
    # the likelihood of this attribute being true for the output.
    template='''{ 
      "helpful": LOGPROB_TRUE,
      "creative": LOGPROB_TRUE,
      "concise": LOGPROB_TRUE
    }'''
)

# Create ranker using LiteLLM adapter (supports many providers)
ranker = LiteLLMAdapter(
    model="gpt-3.5-turbo",  # Can be any model supported by LiteLLM
    config=config
)

# Generate and rank outputs for a prompt
results = ranker.rank_outputs_sync("Explain quantum computing in simple terms.")

# Print the best result
best = results[0]
print(f"Score: {best.logprob:.3f}")
print(best.output)
```

### 2. Simple Example (Asynchronous API)

```python
import asyncio
import os
from logprob_ranker import LogProbConfig, LiteLLMAdapter

# Example: Set your API key in the environment
# os.environ["OPENAI_API_KEY"] = "your-api-key"

async def main():
    config = LogProbConfig(
        num_variants=3,
        template='{"helpful": LOGPROB_TRUE, "creative": LOGPROB_TRUE}'
    )

    ranker = LiteLLMAdapter(model="gpt-3.5-turbo", config=config)

    # Generate and rank outputs asynchronously
    results = await ranker.rank_outputs("Explain quantum computing in simple terms.")

    # Print the best result
    best = results[0]
    print(f"Score: {best.logprob:.3f}")
    print(best.output)

if __name__ == "__main__":
    asyncio.run(main())

```

### 3. Command-Line Interface

```bash
# Example: Set your API key
# export OPENAI_API_KEY=your-api-key

# Use the CLI
logprob-ranker rank \
  --provider openai \
  --model gpt-3.5-turbo \
  --variants 3 \
  --template-file my_criteria.json \
  "Explain quantum computing in simple terms."
```

Where `my_criteria.json` contains:

```json
{
  "helpful": LOGPROB_TRUE,
  "creative": LOGPROB_TRUE,
  "concise": LOGPROB_TRUE
}
```

## How it Works

LogProb Ranker generates multiple outputs for your prompt and then evaluates each one against a set of criteria you specify using the model itself:

1. **Generation**: The system creates multiple output variants (`num_variants`) from your prompt.
2. **Evaluation**: For each output, the model evaluates how likely it is to satisfy each attribute marked with `LOGPROB_TRUE` in your `template`.
3. **Scoring**: The log probabilities from the evaluation step are combined to form scores for each attribute and an overall score for the output.
4. **Ranking**: Results are sorted from best to worst based on the total score.
5. **Selection**: The top-ranked output is typically chosen as the final result.

The evaluation uses a technique where the AI model assesses whether each output satisfies your criteria. The likelihood (log probability) of the model answering affirmatively (implicitly via token probability) becomes the score, often resulting in more nuanced evaluations than simple self-grading.

## Supported Providers

### LiteLLM Integration

LogProb Ranker uses [LiteLLM](https://github.com/BerriAI/litellm) to support multiple LLM providers:

- **OpenAI**: models like "gpt-3.5-turbo", "gpt-4" (OPENAI_API_KEY)
- **Anthropic**: models like "claude-2", "claude-instant-1" (ANTHROPIC_API_KEY)
- **Cohere**: models like "command", "command-light" (COHERE_API_KEY)
- **Google**: models like "gemini-pro" (GOOGLE_API_KEY)
- And many more providers supported by LiteLLM

## Examples

Check out the [examples](logprob_ranker/examples/) directory for more detailed examples:

- [Simple OpenAI Example](logprob_ranker/examples/simple_openai_example.py): Basic usage with OpenAI
- [LiteLLM Example](logprob_ranker/examples/litellm_example.py): Using multiple providers with LiteLLM
- [Multi-Provider Example](logprob_ranker/examples/multi_provider_example.py): Comparing outputs across different LLM providers
- [Custom LLM Adapter](logprob_ranker/examples/custom_llm_adapter.py): Creating a custom adapter for your own LLM API

## Documentation

For more detailed documentation, see the [docs](logprob_ranker/docs/) directory.

## License

This project is licensed under the MIT License - see the [LICENSE](logprob_ranker/LICENSE) file for details.

## Changelog

See [CHANGELOG.md](logprob_ranker/CHANGELOG.md) for version history and changes.