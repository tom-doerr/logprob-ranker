# LogProb Ranker

A Python package for ranking Large Language Model (LLM) outputs using log probability self-scoring. This library implements the logprob self-ranking algorithm, which uses an LLM to evaluate its own outputs against specified criteria.

## Overview

The logprob self-ranking algorithm works by:

1. Generating multiple outputs for a prompt
2. Evaluating each output against a set of criteria
3. Calculating a log probability score for each output
4. Ranking outputs by their scores

This approach allows for more nuanced evaluation than simple temperature-based sampling.

## Features

- Multiple LLM provider support through LiteLLM integration
- Consistent API across all providers (OpenAI, Anthropic, Azure, Cohere, etc.)
- Both command-line and programmatic interfaces
- Customizable evaluation criteria
- Asynchronous and synchronous APIs
- Support for parallel execution

## Installation

You can install LogProb Ranker using pip:

```bash
# Standard installation (includes LiteLLM for multi-provider support)
pip install logprob-ranker
```

## Usage

### Command Line

The simplest way to use LogProb Ranker is via the command line:

```bash
# Set your API key as an environment variable
export OPENAI_API_KEY="your-key-here"

# Basic usage with OpenAI (default provider)
logprob-ranker rank "Suggest a unique product idea for eco-conscious pet owners" --variants 3

# With custom criteria
logprob-ranker rank "Write marketing copy for a new AI product" --template criteria.json --output results.json

# Using different providers
export ANTHROPIC_API_KEY="your-anthropic-key"
logprob-ranker rank "Explain quantum computing" --provider anthropic

# Specify a specific model
logprob-ranker rank "Describe the benefits of solar energy" --model gpt-4

# Using Azure OpenAI
export AZURE_API_KEY="your-azure-key"
logprob-ranker rank "Compare EVs to gas cars" --provider azure --model azure/gpt-4-deployment
```

### Python API

For more control, use the Python API with LiteLLM adapter support:

```python
import asyncio
import os
from logprob_ranker import LiteLLMAdapter, LogProbConfig, RankedOutput

async def main():
    # Get API key from environment
    api_key = os.environ.get("OPENAI_API_KEY")
    
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
    
    # Initialize ranker with LiteLLM adapter
    ranker = LiteLLMAdapter(
        model="gpt-3.5-turbo",  # Can be any model supported by LiteLLM
        api_key=api_key,
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
from logprob_ranker import LiteLLMAdapter, LogProbConfig
import os

# Get API key from environment
api_key = os.environ.get("OPENAI_API_KEY")

# Create ranker
ranker = LiteLLMAdapter(model="gpt-3.5-turbo", api_key=api_key)

# Get ranked outputs
ranked_outputs = ranker.rank_outputs_sync("Your prompt here")
```

You can use other providers just by changing the model:

```python
# Anthropic
ranker = LiteLLMAdapter(
    model="claude-2", 
    api_key=os.environ.get("ANTHROPIC_API_KEY")
)

# Azure OpenAI
ranker = LiteLLMAdapter(
    model="azure/deployment-name", 
    api_key=os.environ.get("AZURE_API_KEY")
)
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

## Supported LLM Providers

LogProb Ranker uses LiteLLM to support various LLM providers:

| Provider     | CLI Option    | Model Format Example    | Required Environment Variable |
|--------------|---------------|-------------------------|------------------------------|
| OpenAI       | `--provider openai` | `gpt-3.5-turbo`, `gpt-4` | `OPENAI_API_KEY` |
| Anthropic    | `--provider anthropic` | `claude-2`, `claude-instant-1` | `ANTHROPIC_API_KEY` |
| Azure OpenAI | `--provider azure` | `azure/deployment-name` | `AZURE_API_KEY` |
| Cohere       | `--provider cohere` | `command`, `command-light` | `COHERE_API_KEY` |
| HuggingFace  | `--provider huggingface` | `huggingface/mistralai/Mistral-7B-Instruct-v0.1` | `HUGGINGFACE_API_KEY` |
| Palm (Google)| `--provider palm` | `palm/chat-bison` | `PALM_API_KEY` |
| VertexAI     | N/A (Python API only) | `vertex_ai/chat-bison` | Configured via Google Cloud |

For a complete list of supported models and providers, please refer to the [LiteLLM documentation](https://github.com/BerriAI/litellm).

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.