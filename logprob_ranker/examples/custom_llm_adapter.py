"""
Example showing how to create a custom adapter for your own LLM API.
"""

import asyncio
from typing import Any, Optional
import aiohttp

# Import the logprob ranker
from logprob_ranker import LogProbRanker, LogProbConfig


class CustomLLMAdapter(LogProbRanker):
    """
    Example adapter for a hypothetical custom LLM API.
    """

    def __init__(
        self,
        api_url: str,
        api_key: str,
        model_name: str,
        config: Optional[LogProbConfig] = None,
    ):
        super().__init__(None, config)  # Pass None for llm_client initially
        self.api_url = api_url
        self.api_key = api_key
        self.model_name = model_name
        # Set the llm_client to self for the adapter pattern
        self.llm_client = self

    async def _make_request(
        self, endpoint: str, payload: dict[str, Any]
    ) -> dict[str, Any]:
        """Helper to make requests to the custom API."""
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{self.api_url}/{endpoint}", headers=headers, json=payload
            ) as response:
                response.raise_for_status()  # Raise exception for bad status
                return await response.json()

    # Implement the core 'acompletion' method required by LogProbRanker
    # pylint: disable=too-many-arguments
    # pylint: disable=too-many-positional-arguments
    # pylint: disable=unused-argument
    async def acompletion(
        self,
        model: str,  # Unused, adapter uses self.model_name
        messages: list[dict[str, str]],
        temperature: float,
        max_tokens: int,
        top_p: float,
        stop: Optional[list[str]] = None,
        **kwargs,  # Keep for potential API pass-through
    ) -> dict[str, Any]:
        """
        Simulate calling the custom LLM API's completion endpoint.
        Replace this with the actual logic for your API.
        """
        payload = {
            "model": self.model_name,  # Use the specific model for adapter
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "top_p": top_p,
            "stop": stop,
        }
        # Hypothetical endpoint name
        response_data = await self._make_request("generate", payload)
        temp = response_data.get("generated_text", "")
        # Return data in the OpenAI-compatible format expected by the ranker
        # You'll need to adapt this based on your API's actual response structure
        return {
            "choices": [
                {
                    "message": {
                        "role": "assistant",
                        "content": temp,
                        # Example mapping
                    },
                }
            ]
        }


async def main():
    """Example of using the custom adapter."""
    # Create the adapter with your API details
    adapter = CustomLLMAdapter(
        api_url="https://your-llm-api.example.com",
        api_key="your-api-key-here",
        model_name="your-model-name",
        config=LogProbConfig(
            num_variants=3,
            temperature=0.7,
            template="""{  # Example template
    "interesting": LOGPROB_TRUE,
    "creative": LOGPROB_TRUE,
    "useful": LOGPROB_TRUE
}""",
        )
    )
    # Define a prompt
    prompt = (
        "Generate a tagline for a new smartphone that emphasizes "
        "privacy features"
    )
    print(f"\nSimulating ranking for prompt: '{prompt}'")
    print(f"Using custom adapter for model: {adapter.model_name}")

    try:
        # This would work with an actual API
        # For this example, we'll just print what would happen
        print("\nNOTE: This example requires a real API connection to run.")
        print("Here's what would happen with a working API:")
        print("\n1. Generate 3 variants using your custom LLM API.")
        print("2. Evaluate each variant using the same API.")
        print("3. Calculate logprob scores and rank the outputs.")
        print("4. Return the results sorted by score")
    except aiohttp.ClientError as e:
        print(f"HTTP Error (expected in this example): {e}")


def run_async_test(test_case_method):
    """
    Run an async test method in a new, isolated event loop.
    'test_case_method' is expected to be a callable that returns a coroutine
    (e.g., an async method of a test class).
    """
    policy = asyncio.get_event_loop_policy()
    original_loop = None
    try:
        original_loop = policy.get_event_loop()
    except RuntimeError:  # Indicates no current event loop is set for this thread.
        pass # original_loop remains None

    # Create and set a new event loop specifically for this test case.
    new_loop = policy.new_event_loop()
    policy.set_event_loop(new_loop)

    try:
        # Call the passed method to get the coroutine, then run it.
        result = new_loop.run_until_complete(test_case_method())
        return result
    finally:
        new_loop.close()
        # Restore the original event loop (if any) for the thread.
        policy.set_event_loop(original_loop)

if __name__ == "__main__":
    asyncio.run(main())
