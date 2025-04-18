# API Usage Guide

LogProb Ranker provides both synchronous and asynchronous APIs for integrating into your projects.

## Table of Contents
- [Basic Concepts](#basic-concepts)
- [Configuration](#configuration)
- [Asynchronous API](#asynchronous-api)
- [Synchronous API](#synchronous-api)
- [Progress Callbacks](#progress-callbacks)
- [Handling Results](#handling-results)
- [Serialization](#serialization)

## Basic Concepts

LogProb Ranker works by:
1. Generating multiple variations of responses to a prompt
2. Evaluating each variation against custom criteria
3. Calculating an overall score based on the evaluations
4. Ranking and returning the outputs by score

## Configuration

The `LogProbConfig` class contains all the settings for the ranking process:

```python
from logprob_ranker import LogProbConfig

config = LogProbConfig(
    # Number of outputs to generate and rank
    num_variants=5,
    
    # Temperature for generation (higher = more creative/random)
    temperature=0.7,
    
    # Maximum tokens to generate for each output
    max_tokens=1000,
    
    # Number of concurrent threads for generation
    thread_count=3,
    
    # Evaluation criteria template (JSON with LOGPROB_TRUE)
    template="""{ 
      "helpful": LOGPROB_TRUE,
      "creative": LOGPROB_TRUE,
      "accurate": LOGPROB_TRUE 
    }""",
    
    # System prompt for the generator
    system_prompt="You are a creative assistant that provides a single concise response.",
    
    # Prompt prefix for the evaluator
    evaluation_prompt="You are an evaluator. Evaluate the following text based on the criteria."
)
```

## Asynchronous API

The asynchronous API is recommended for most use cases, especially in web applications or when generating many outputs:

```python
import asyncio
from logprob_ranker import LiteLLMAdapter, LogProbConfig

async def generate_ranked_outputs(prompt: str):
    # Create configuration
    config = LogProbConfig(num_variants=3, temperature=0.7)
    
    # Create ranker
    ranker = LiteLLMAdapter(
        model="gpt-3.5-turbo",
        api_key="your-api-key",
        config=config
    )
    
    # Generate and rank asynchronously
    results = await ranker.rank_outputs(prompt)
    return results

# Run with asyncio
results = asyncio.run(generate_ranked_outputs("Explain quantum computing."))
```

## Synchronous API

The synchronous API is simpler to use but will block until all processing is complete:

```python
from logprob_ranker import LiteLLMAdapter, LogProbConfig

# Create configuration and ranker
config = LogProbConfig(num_variants=3, temperature=0.7)
ranker = LiteLLMAdapter(
    model="gpt-3.5-turbo",
    api_key="your-api-key",
    config=config
)

# Generate and rank synchronously
results = ranker.rank_outputs_sync("Explain quantum computing.")
```

## Progress Callbacks

You can register a callback function to be notified as each output is generated and evaluated:

```python
from logprob_ranker import LiteLLMAdapter, LogProbConfig, RankedOutput

def on_output(output: RankedOutput):
    print(f"Output #{output.index + 1} (Score: {output.logprob:.3f}):")
    print(f"{output.output[:100]}...")  # Print first 100 chars
    
    if output.attribute_scores:
        print("Attribute scores:")
        for attr in output.attribute_scores:
            print(f"  {attr.name}: {attr.score:.3f}")

# Create ranker with callback
ranker = LiteLLMAdapter(
    model="gpt-3.5-turbo",
    api_key="your-api-key",
    config=config,
    on_output_callback=on_output
)
```

## Handling Results

The `rank_outputs` and `rank_outputs_sync` methods return a list of `RankedOutput` objects, sorted by score (highest first):

```python
results = ranker.rank_outputs_sync(prompt)

# Get the best result
if results:
    best = results[0]
    print(f"Best output (Score: {best.logprob:.3f}):")
    print(best.output)
    
    # Access individual attribute scores
    if best.attribute_scores:
        for attr in best.attribute_scores:
            print(f"{attr.name}: {attr.score:.3f}")
```

The `RankedOutput` class has the following attributes:
- `output`: The generated text
- `logprob`: The overall score (0-1 range)
- `index`: The index of this output in the batch
- `attribute_scores`: List of individual criteria scores
- `raw_evaluation`: The raw evaluation text from the LLM

## Serialization

You can convert `RankedOutput` objects to and from dictionaries for storage or transmission:

```python
from logprob_ranker.utils import serialize_ranked_output, deserialize_ranked_output
import json

# Serialize to dictionary
result_dict = serialize_ranked_output(ranked_output)

# Save to JSON file
with open("ranked_outputs.json", "w") as f:
    json.dump(result_dict, f, indent=2)

# Load from dictionary
loaded_output = deserialize_ranked_output(result_dict)
```