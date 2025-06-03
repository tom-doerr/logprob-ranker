"""
Example showing how to create a custom adapter for your own LLM API.
"""

import asyncio
import aiohttp

# Import the logprob ranker
from logprob_ranker import LogProbRanker, LogProbConfig


class CustomLLMAdapter(LogProbRanker):
    """
    Example of a custom adapter for your own LLM API or service.

    This example implements a simple HTTP-based API client.
    """

    def __init__(
        self, api_url: str, api_key: str, model_name: str = "default", **kwargs
    ):
        """
        Initialize with your API details.

        Args:
            api_url: Base URL for your API
            api_key: API key for authentication
            model_name: Name of the model to use
        """
        self.api_url = api_url
        self.api_key = api_key
        self.model_name = model_name

        # Pass any remaining kwargs to the parent class
        super().__init__(llm_client=None, **kwargs)

    async def _create_chat_completion(self, messages, temperature, max_tokens, top_p):
        """
        Custom implementation for your LLM API.

        This example sends a POST request to your API endpoint.
        """
        # Prepare the request payload
        payload = {
            "model": self.model_name,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "top_p": top_p,
        }

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        # Make the API request
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{self.api_url}/chat/completions", json=payload, headers=headers
            ) as response:
                # Check for errors
                if response.status != 200:
                    error_text = await response.text()
                    raise ValueError(
                        f"API request failed: {response.status} - {error_text}"
                    )

                # Parse the response
                result = await response.json()

                # Convert to the standard format expected by LogProbRanker
                return {
                    "choices": [
                        {
                            "message": {
                                "role": "assistant",
                                "content": result.get("response", ""),
                            }
                        }
                    ]
                }


async def main():
    """Example of using the custom adapter."""
    # Create and use the adapter with your API details
    adapter = CustomLLMAdapter(
        api_url="https://your-llm-api.example.com",
        api_key="your-api-key-here",
        model_name="your-model-name",
        config=LogProbConfig(
            num_variants=3,
            temperature=0.7,
            template="""{ 
  "interesting": LOGPROB_TRUE,
  "creative": LOGPROB_TRUE,
  "useful": LOGPROB_TRUE
}""",
        ),
    )

    # Define a prompt
    prompt = "Generate a tagline for a new smartphone that emphasizes privacy features"

    print(f"Using custom LLM API to generate and rank outputs for: {prompt}")

    try:
        # This would work with an actual API
        # For this example, we'll just print what would happen
        print("\nNOTE: This example requires a real API connection to run.")
        print("Here's what would happen with a working API:")
        print("\n1. Generate 3 variants using your custom LLM API")
        print("2. Evaluate each variant using the same API")
        print("3. Calculate logprob scores and rank the outputs")
        print("4. Return the results sorted by score")
        
        # Example usage that would work with real API credentials
        # result = adapter.rank_outputs_sync(prompt)
        # for i, output in enumerate(result):
        #     print(f"{i+1}: {output.output} (Score: {output.total_score})")
    except Exception as e:
        print(f"Error (expected in this example): {e}")


if __name__ == "__main__":
    asyncio.run(main())
