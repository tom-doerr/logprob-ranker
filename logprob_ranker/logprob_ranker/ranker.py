"""
Core implementation of the LogProb ranking algorithm for evaluating LLM outputs.
"""

import asyncio
import logging
from dataclasses import dataclass
from typing import Callable, List, Optional
import litellm
from .utils import (
    parse_evaluation_json,
    extract_template_attributes,
    calculate_logprob_score,
    sort_ranked_outputs,
    format_evaluation_prompt,
)


@dataclass
class AttributeScore:
    """
    Represents an attribute and its associated score from the evaluation.
    """

    name: str
    score: float
    explanation: str = ""  # Optional explanation for the score


@dataclass
class RankedOutput:
    """
    Represents a generated output with its evaluation scores and metadata.
    """

    output: str
    logprob: float
    index: int
    attribute_scores: Optional[List["AttributeScore"]] = None
    raw_evaluation: Optional[str] = None

    @property
    def total_score(self) -> float:
        """
        Calculate the total score from attribute scores.

        If no attribute scores are available, returns the logprob score.
        """
        if not self.attribute_scores:
            return self.logprob

        # Sum all attribute scores
        return sum(attr.score for attr in self.attribute_scores)


@dataclass
class LogProbConfig:
    """
    Configuration for the LogProb ranker.
    """

    # LLM generation parameters
    temperature: float = 0.7
    max_tokens: int = 1000
    top_p: float = 1.0

    # Ranking parameters
    num_variants: int = 5
    thread_count: int = 1

    # Evaluation template (uses LOGPROB_TRUE placeholders)
    template: str = """{
  "interesting": LOGPROB_TRUE,
  "creative": LOGPROB_TRUE,
  "useful": LOGPROB_TRUE
}"""

    # Prompts
    system_prompt: str = (
        "You are a creative assistant that provides a single concise response."
    )
    evaluation_prompt: str = (
        "You are an evaluator. Evaluate the following text based on the criteria.\n"
        "Return ONLY a JSON object with your evaluation. Use JSON boolean values (true/false)."
    )


class LogProbRanker:
    """
    A class for generating and ranking LLM outputs based on the logprob self-ranking algorithm.
    """

    def __init__(
        self,
        llm_client,
        config: Optional["LogProbConfig"] = None,
        on_output_callback: Optional[Callable[["RankedOutput"], None]] = None,
    ):
        """
        Initialize the ranker with the specified LLM client and configuration.

        Args:
            llm_client: A client for interacting with the language model API (e.g., OpenAI client)
            config: Optional configuration settings
            on_output_callback: Optional callback function called for each output as it's generated and ranked
        """
        self.llm_client = llm_client
        self.config = config or LogProbConfig()
        self.on_output_callback = on_output_callback
        self.logger = logging.getLogger(__name__)

        # Extract attribute names from the template
        self.attributes = extract_template_attributes(self.config.template)

    async def generate_and_evaluate_output(
        self, prompt: str, index: int
    ) -> Optional["RankedOutput"]:
        """
        Generate a single output and evaluate it according to the criteria template.

        Args:
            prompt: The prompt to generate content from
            index: The index of this generation in the batch

        Returns:
            A RankedOutput object or None if generation failed
        """
        try:
            # Generate content
            generation_messages = [
                {"role": "system", "content": self.config.system_prompt},
                {"role": "user", "content": prompt},
            ]

            generation_response = await self._create_chat_completion(
                messages=generation_messages,
                temperature=self.config.temperature,
                max_tokens=self.config.max_tokens,
                top_p=self.config.top_p,
            )

            # Extract generated content
            generated_text = generation_response["choices"][0]["message"]["content"]

            # Create evaluation prompt
            evaluation_prompt = format_evaluation_prompt(
                template=self.config.template,
                generated_text=generated_text,
                eval_prompt=self.config.evaluation_prompt,
            )

            # Evaluate the generated content
            evaluation_messages = [
                {"role": "system", "content": self.config.evaluation_prompt},
                {"role": "user", "content": evaluation_prompt},
            ]

            evaluation_response = await self._create_chat_completion(
                messages=evaluation_messages,
                temperature=0.0,  # Use low temperature for consistent evaluations
                max_tokens=500,
                top_p=1.0,
            )

            # Extract evaluation
            evaluation_text = evaluation_response["choices"][0]["message"]["content"]

            try:
                evaluation_json = parse_evaluation_json(evaluation_text)
            except Exception:
                evaluation_json = {}

            # Calculate scores
            attribute_scores = []

            # First check if we have attributes in the evaluation JSON that match our template
            for attr in self.attributes:
                if attr in evaluation_json:
                    # Convert boolean to score (true = 1.0, false = 0.0)
                    score = 1.0 if evaluation_json.get(attr, False) else 0.0
                    # Add an explanation based on whether criterion was met
                    explanation = f"The output {'' if score > 0 else 'does not '}meets the {attr} criterion"
                    attribute_scores.append(
                        AttributeScore(name=attr, score=score, explanation=explanation)
                    )

            # If no matches found with template attributes, use all attributes from the evaluation JSON
            if not attribute_scores and evaluation_json:
                for attr, value in evaluation_json.items():
                    # Convert boolean to score (true = 1.0, false = 0.0)
                    score = 1.0 if value else 0.0
                    # Add an explanation based on whether criterion was met
                    explanation = f"The output {'' if score > 0 else 'does not '}meets the {attr} criterion"
                    attribute_scores.append(
                        AttributeScore(name=attr, score=score, explanation=explanation)
                    )

            # Calculate overall logprob score
            logprob = calculate_logprob_score(attribute_scores)

            # Create result
            result = RankedOutput(
                output=generated_text,
                logprob=logprob,
                index=index,
                attribute_scores=attribute_scores,
                raw_evaluation=evaluation_text,
            )

            # Call callback if provided
            if self.on_output_callback:
                self.on_output_callback(result)

            return result

        except Exception as e:
            # Log error and return None to indicate failure
            self.logger.error("Error generating output %d: %s", index, str(e))
            return None

    async def rank_outputs(self, prompt: str) -> List["RankedOutput"]:
        """
        Generate multiple outputs for the prompt and rank them by log probability.

        Args:
            prompt: The prompt to generate content from

        Returns:
            A list of RankedOutput objects sorted by logprob (highest first)
        """
        tasks = []
        for i in range(self.config.num_variants):
            tasks.append(self.generate_and_evaluate_output(prompt, i))

        # Use thread count for parallel execution
        if self.config.thread_count > 1:
            # Split tasks into batches based on thread count
            batched_results = []
            for i in range(0, len(tasks), self.config.thread_count):
                batch = tasks[i : i + self.config.thread_count]
                batch_results = await asyncio.gather(*batch)
                batched_results.extend(batch_results)

            results = batched_results
        else:
            # Sequential execution
            results = await asyncio.gather(*tasks)

        # Filter out None results (failed generations)
        results = [r for r in results if r is not None]

        # Sort by logprob score (highest first)
        sorted_results = sort_ranked_outputs(results)

        return sorted_results

    def rank_outputs_sync(self, prompt: str) -> List["RankedOutput"]:
        """
        Synchronous version of rank_outputs.

        Args:
            prompt: The prompt to generate content from

        Returns:
            A list of RankedOutput objects sorted by logprob (highest first)
        """
        return asyncio.run(self.rank_outputs(prompt))

    async def _create_chat_completion(self, messages, temperature, max_tokens, top_p):
        """
        Create a chat completion using LiteLLM.

        This is an internal method that uses LiteLLM to call any supported LLM provider.

        Args:
            messages: List of message objects (role and content)
            temperature: Temperature parameter for generation
            max_tokens: Maximum tokens to generate
            top_p: Top-p sampling parameter

        Returns:
            The raw response from the LLM client
        """
        # Use LiteLLM to handle the completion request
        model = self.model if hasattr(self, "model") else "gpt-3.5-turbo"

        # Make the completion request
        try:
            response = await litellm.acompletion(
                model=model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                top_p=top_p,
            )

            # Return in standardized format
            return {
                "choices": [
                    {
                        "message": {
                            "role": response.choices[0].message.role,
                            "content": response.choices[0].message.content,
                        }
                    }
                ]
            }
        except Exception as e:
            self.logger.error("Error in LiteLLM completion: %s", str(e))
            raise


class LiteLLMAdapter(LogProbRanker):
    """
    Adapter for using LiteLLM with any supported model/provider.

    LiteLLM supports various providers like OpenAI, Anthropic, Cohere,
    Hugging Face, Azure, PaLM, etc.
    """

    def __init__(
        self,
        model: str,
        api_key: Optional[str] = None,
        config: Optional["LogProbConfig"] = None,
        on_output_callback: Optional[Callable[["RankedOutput"], None]] = None,
        **kwargs,
    ):
        """
        Initialize the LiteLLM adapter.

        Args:
            model: The model identifier (e.g., "gpt-4", "claude-2", "command-nightly")
            api_key: Optional API key (uses env variables if not provided)
            config: Optional configuration settings
            on_output_callback: Optional callback function
            **kwargs: Additional parameters to pass to LiteLLM
        """
        super().__init__(None, config, on_output_callback)
        self.model = model
        self.api_key = api_key
        self.kwargs = kwargs

        # Set API key if provided
        if api_key:
            if "anthropic" in model.lower() or model.lower().startswith("claude"):
                litellm.anthropic_api_key = api_key
            elif "openai" in model.lower() or model.lower().startswith("gpt"):
                litellm.openai_api_key = api_key
            else:
                # Set a generic api_key and let LiteLLM handle it
                self.kwargs["api_key"] = api_key

    async def _create_chat_completion(self, messages, temperature, max_tokens, top_p):
        """
        Create a chat completion using LiteLLM.
        """
        try:
            response = await litellm.acompletion(
                model=self.model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                top_p=top_p,
                **self.kwargs,
            )

            # Return in standardized format
            return {
                "choices": [
                    {
                        "message": {
                            "role": response.choices[0].message.role,
                            "content": response.choices[0].message.content,
                        }
                    }
                ]
            }
        except Exception as e:
            self.logger.error(
                "Error in LiteLLM completion with model %s: %s", self.model, str(e)
            )
            raise
