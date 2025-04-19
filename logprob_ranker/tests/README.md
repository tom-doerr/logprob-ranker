# LogProb Ranker Tests

This directory contains various tests for the LogProb Ranker package.

## Test Files

- `test_async_basic.py`: Tests the basic asynchronous API functionality
- `test_litellm_adapter.py`: Tests the LiteLLM adapter for multi-provider support
- `test_litellm_basic.py`: Tests basic LiteLLM integration
- `test_litellm_functionality.py`: Tests advanced functionality with LiteLLM
- `test_openrouter_e2e.py`: End-to-end tests for OpenRouter integration
- `test_ranker.py`: Tests the core ranker functionality
- `test_usecase_e2e.py`: Tests various content generation use cases with tailored evaluation criteria
- `test_utils.py`: Tests utility functions

## End-to-End Tests

The end-to-end tests require an OpenRouter API key set as the `OPENROUTER_API_KEY` environment variable.

```bash
export OPENROUTER_API_KEY=your_api_key_here
python -m unittest tests/test_openrouter_e2e.py
```

## Use Case Tests

The use case tests demonstrate how to configure LogProb Ranker for different types of content generation:

- Creative writing (stories, poems)
- Technical explanations
- Persuasive content
- Instructional content (how-to guides)
- Text summarization
- Code generation

Each use case has its own set of evaluation criteria tailored to that specific type of content.

```bash
python -m unittest tests/test_usecase_e2e.py
```

## Running All Tests

To run all tests:

```bash
cd logprob_ranker
python -m unittest discover tests
```

Note that some tests require API keys for external services.