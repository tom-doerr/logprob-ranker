# Multi-Provider Support with LiteLLM

LogProb Ranker v0.2.0 introduces support for multiple LLM providers through [LiteLLM](https://github.com/BerriAI/litellm), a unified interface for various AI services.

## Supported Providers

Using LiteLLM, LogProb Ranker can now work with:

- **OpenAI**: gpt-3.5-turbo, gpt-4, etc.
- **Anthropic**: claude-2, claude-instant-1, etc.
- **Cohere**: command, command-light, etc.
- **Google**: gemini-pro, etc.
- **Azure OpenAI**: azure/deployment-name
- **And many more**: AWS Bedrock, PaLM, AI21, Hugging Face, etc.

For a complete list of supported providers, see the [LiteLLM documentation](https://docs.litellm.ai/docs/providers).

## Using Different Providers

### Via Python API

```python
from logprob_ranker import LiteLLMAdapter, LogProbConfig

# OpenAI example
openai_ranker = LiteLLMAdapter(
    model="gpt-3.5-turbo",
    api_key=os.environ.get("OPENAI_API_KEY"),
    config=LogProbConfig(...)
)

# Anthropic example
anthropic_ranker = LiteLLMAdapter(
    model="claude-2",
    api_key=os.environ.get("ANTHROPIC_API_KEY"),
    config=LogProbConfig(...)
)

# Cohere example
cohere_ranker = LiteLLMAdapter(
    model="command",
    api_key=os.environ.get("COHERE_API_KEY"),
    config=LogProbConfig(...)
)
```

### Via Command Line

```bash
# OpenAI
logprob-ranker rank --provider openai --model gpt-3.5-turbo "Your prompt here"

# Anthropic
logprob-ranker rank --provider anthropic --model claude-2 "Your prompt here"

# Cohere
logprob-ranker rank --provider cohere --model command "Your prompt here"
```

## API Keys

Each provider requires its own API key, which can be set in the environment:

- OpenAI: `OPENAI_API_KEY`
- Anthropic: `ANTHROPIC_API_KEY`
- Cohere: `COHERE_API_KEY`
- Google (Gemini): `GOOGLE_API_KEY`
- etc.

## Provider Comparison

The multi-provider support enables comparing outputs from different providers with the same evaluation criteria. See the [multi_provider_example.py](../examples/multi_provider_example.py) file for a complete example of how to compare different providers.

```python
# Define providers and models to test
providers = [
    ("openai", "gpt-3.5-turbo"),
    ("anthropic", "claude-instant-1"),
    ("cohere", "command-light"),
]

# Run with all providers and get comparison results
results = await run_with_providers(prompt, providers, criteria_template)
```

## Model-Specific Parameters

You can pass model-specific parameters to the underlying LiteLLM client:

```python
# Example with model-specific parameters
ranker = LiteLLMAdapter(
    model="gpt-4",
    api_key=api_key,
    config=config,
    # Additional LiteLLM parameters
    frequency_penalty=0.5,
    presence_penalty=0.2,
    model_kwargs={"stop": ["STOP", "END"]}
)
```

## Custom LLM Adapter

You can also create a custom adapter for your own LLM API by extending the `LogProbRanker` class. See the [custom_llm_adapter.py](../examples/custom_llm_adapter.py) example for more details.

```python
from logprob_ranker import LogProbRanker

class CustomLLMAdapter(LogProbRanker):
    """Example of a custom adapter for your own LLM API or service."""
    
    def __init__(self, api_url: str, api_key: str, model_name: str = "default", **kwargs):
        """Initialize with your API details."""
        super().__init__(None, **kwargs)  # Pass None as client, we'll handle API calls
        self.api_url = api_url
        self.api_key = api_key
        self.model_name = model_name
        
    async def _create_chat_completion(self, messages, temperature, max_tokens, top_p):
        """Custom implementation for your LLM API."""
        # Your implementation here
        pass
```