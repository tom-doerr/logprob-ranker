# LogProb Ranker

A Python library for ranking LLM outputs using log probability scoring with multi-provider support.

## Overview

LogProb Ranker is a library that helps you automatically generate and rank multiple outputs from language models according to specific criteria you define. It uses a smart "self-ranking" algorithm that gets the model to evaluate its own outputs against your criteria, resulting in better quality responses.

### Key Features

- **Multi-Provider Support**: Works with OpenAI, Anthropic, Cohere, Google, and more via LiteLLM
- **Multiple Interfaces**: Command-line (CLI), Asynchronous Python API, and Synchronous Python API
- **Customizable Criteria**: Define your own evaluation attributes in a simple JSON template
- **Attribute Scoring**: Get detailed scores for individual criteria (creativity, helpfulness, etc.)
- **Provider Comparison**: Compare outputs from different LLM providers with the same prompt
- **Parallel Generation**: Generate and rank multiple outputs concurrently for better performance

## Installation

```bash
pip install logprob-ranker
```

## Quick Start

### 1. Simple Example (Synchronous API)

```python
import os
from logprob_ranker import LogProbConfig, LiteLLMAdapter

# Set your API key in the environment
os.environ["OPENAI_API_KEY"] = "your-api-key"

# Create configuration
config = LogProbConfig(
    num_variants=3,  # Generate 3 variants
    template="""{ 
      "helpful": LOGPROB_TRUE,
      "creative": LOGPROB_TRUE,
      "concise": LOGPROB_TRUE
    }"""
)

# Create ranker using LiteLLM adapter
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

## How it Works

LogProb Ranker generates multiple outputs for your prompt and then evaluates each one against a set of criteria you specify:

1. **Generation**: The system creates multiple output variants from your prompt
2. **Evaluation**: Each output is evaluated against your criteria template
3. **Scoring**: Outputs are assigned scores based on how well they match your criteria
4. **Ranking**: Results are sorted from best to worst based on total score
5. **Selection**: The top-ranked output is typically chosen as the final result

The evaluation uses a clever technique where the AI model is asked to assess whether each output satisfies your criteria. The likelihood (log probability) of the model answering "yes" becomes the score, resulting in better evaluations than simple self-grading.

## Supported Providers

### LiteLLM Integration

LogProb Ranker uses [LiteLLM](https://github.com/BerriAI/litellm) to support multiple LLM providers:

- **OpenAI**: models like "gpt-3.5-turbo", "gpt-4" (OPENAI_API_KEY)
- **Anthropic**: models like "claude-2", "claude-instant-1" (ANTHROPIC_API_KEY)
- **Cohere**: models like "command", "command-light" (COHERE_API_KEY)
- **Google**: models like "gemini-pro" (GOOGLE_API_KEY)
- And many more providers supported by LiteLLM

### OpenRouter Integration

For even more model options, LogProb Ranker provides an OpenRouter adapter:

```python
from logprob_ranker import LogProbConfig, OpenRouterAdapter

config = LogProbConfig(
    num_variants=3,
    template='{"helpful": LOGPROB_TRUE, "accurate": LOGPROB_TRUE}'
)

# Use OpenRouter to access models from various providers
ranker = OpenRouterAdapter(
    model="openai/gpt-4-turbo",  # Access OpenAI's GPT-4 via OpenRouter
    config=config
)

result = ranker.rank("Explain quantum computing in simple terms.")
print(result.output)
```

This integration allows you to access many models through a single API key (OPENROUTER_API_KEY).

## Examples

Check out the examples directory for more detailed examples:

- Simple OpenAI Example: Basic usage with OpenAI
- LiteLLM Example: Using multiple providers with LiteLLM
- Multi-Provider Example: Comparing outputs across different LLM providers
- Custom LLM Adapter: Creating a custom adapter for your own LLM API

## License

This project is licensed under the MIT License - see the LICENSE file for details.