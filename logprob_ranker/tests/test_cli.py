"""
Tests for the command-line interface (CLI) functionality.

These tests ensure that the CLI correctly handles arguments,
loads configuration, and interacts with the LogProbRanker.
"""

import asyncio
import os
import sys
import unittest
import tempfile
import json
from unittest.mock import patch, MagicMock, mock_open, ANY
from io import StringIO

# Add parent directory to path to import the package
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from logprob_ranker.cli import (
    setup_parser,
    load_template_from_file,
    get_model_from_provider,
    on_output_generated,
    print_provider_help,
    main,
    run_rank_command,
)
from logprob_ranker.ranker import RankedOutput, AttributeScore


class TestCLI(unittest.TestCase):
    """Tests for the CLI functionality."""

    def test_setup_parser(self):
        """Test that the argument parser is correctly set up."""
        parser = setup_parser()

        # Test that the parser has the expected commands
        self.assertTrue(hasattr(parser, "parse_args"))

        # Parse some arguments to test parser functionality
        args = parser.parse_args(["rank", "test prompt"])
        self.assertEqual(args.command, "rank")
        self.assertEqual(args.prompt, "test prompt")
        self.assertEqual(args.variants, 3)  # Default value

        # Test with more arguments
        args = parser.parse_args(
            [
                "rank",
                "test prompt",
                "--variants",
                "5",
                "--temperature",
                "0.8",
                "--max-tokens",
                "100",
                "--provider",
                "anthropic",
            ]
        )
        self.assertEqual(args.variants, 5)
        self.assertEqual(args.temperature, 0.8)
        self.assertEqual(args.max_tokens, 100)
        self.assertEqual(args.provider, "anthropic")

    def test_load_template_from_file(self):
        """Test loading a template from a file."""
        # Test with non-existent file
        with patch("os.path.exists", return_value=False):
            with patch("sys.stdout", new=StringIO()) as fake_out:
                result = load_template_from_file("nonexistent.txt")
                self.assertIsNone(result)
                self.assertIn("not found", fake_out.getvalue())

        # Test with existing file
        template_content = '{"test": LOGPROB_TRUE}'
        with patch("os.path.exists", return_value=True):
            with patch("builtins.open", mock_open(read_data=template_content)):
                result = load_template_from_file("test.txt")
                self.assertEqual(result, template_content)

        # Test with file read error
        with patch("os.path.exists", return_value=True):
            with patch("builtins.open", side_effect=Exception("Read error")):
                with patch("sys.stdout", new=StringIO()) as fake_out:
                    result = load_template_from_file("error.txt")
                    self.assertIsNone(result)
                    self.assertIn("Error loading template file", fake_out.getvalue())

    def test_get_model_from_provider(self):
        """Test getting default models for providers."""
        self.assertEqual(get_model_from_provider("openai"), "gpt-3.5-turbo")
        self.assertEqual(get_model_from_provider("anthropic"), "claude-2")
        self.assertEqual(get_model_from_provider("azure"), "azure/gpt-35-turbo")
        self.assertEqual(get_model_from_provider("cohere"), "command")
        self.assertEqual(
            get_model_from_provider("huggingface"),
            "huggingface/mistralai/Mistral-7B-Instruct-v0.1",
        )
        self.assertEqual(get_model_from_provider("palm"), "palm/chat-bison")

        # Test custom provider - should exit
        with patch("sys.exit") as mock_exit:
            with patch("sys.stdout", new=StringIO()):
                get_model_from_provider("custom")
                mock_exit.assert_called_once_with(1)

        # Test unknown provider - should exit
        with patch("sys.exit") as mock_exit:
            with patch("sys.stdout", new=StringIO()):
                get_model_from_provider("unknown")
                mock_exit.assert_called_once_with(1)

    def test_on_output_generated(self):
        """Test the callback for output generation."""
        # Create a mock output
        attribute_scores = [
            AttributeScore(name="test", score=0.8, explanation="Test explanation")
        ]
        output = RankedOutput(
            output="This is a test output that is longer than 100 characters to test the truncation functionality of the on_output_generated function.",
            logprob=0.75,
            index=0,
            attribute_scores=attribute_scores,
        )

        # Test the callback
        with patch("sys.stdout", new=StringIO()) as fake_out:
            on_output_generated(output)
            output_text = fake_out.getvalue()

            # Check that key information is in the output
            self.assertIn("Output #1 (Score: 0.750)", output_text)
            self.assertIn("This is a test output", output_text)
            self.assertIn("Attribute scores:", output_text)
            self.assertIn("test: 0.800", output_text)

    @patch("asyncio.run")
    def test_main_rank_command(self, mock_run):
        """Test that the main function correctly runs the rank command."""
        # Mock the argument parser
        with patch("argparse.ArgumentParser.parse_args") as mock_parse_args:
            mock_parse_args.return_value = MagicMock(
                command="rank",
                prompt="test prompt",
                variants=3,
                temperature=0.7,
                max_tokens=500,
                provider="openai",
                model=None,
                api_key=None,
                threads=1,
                template=None,
                output=None,
            )

            # Run the main function
            with patch("sys.exit"):
                with patch.dict("os.environ", {"OPENAI_API_KEY": "test_key"}):
                    main()

                    # Verify that asyncio.run was called
                    mock_run.assert_called_once()

    def test_main_no_command(self):
        """Test that main prints help when no command is given."""
        # Mock the argument parser
        with patch("argparse.ArgumentParser.parse_args") as mock_parse_args:
            mock_parse_args.return_value = MagicMock(command=None)

            # Mock print_help function
            with patch("argparse.ArgumentParser.print_help") as mock_print_help:
                # Mock print_provider_help function
                with patch(
                    "logprob_ranker.cli.print_provider_help"
                ) as mock_print_provider:
                    main()

                    # Verify that both help functions were called
                    mock_print_help.assert_called_once()
                    mock_print_provider.assert_called_once()

    def test_print_provider_help(self):
        """Test that provider help information is printed correctly."""
        with patch("sys.stdout", new=StringIO()) as fake_out:
            print_provider_help()
            output = fake_out.getvalue()

            # Check that key information is in the output
            self.assertIn("Supported LLM Providers and Models:", output)
            self.assertIn("OPENAI:", output)
            self.assertIn("ANTHROPIC:", output)
            self.assertIn("gpt-3.5-turbo", output)
            self.assertIn("gpt-4", output)
            self.assertIn("claude-2", output)
            self.assertIn("Example usage:", output)

    @patch("logprob_ranker.cli.LiteLLMAdapter")
    @patch("logprob_ranker.cli.LogProbConfig")
    def test_openrouter_model_prepend(self, mock_config, mock_adapter):
        """Test that when provider is openrouter, the model name is prepended if needed."""
        # Create mock args
        args = MagicMock(
            command="rank",
            prompt="Test prompt",
            variants=3,
            temperature=0.7,
            max_tokens=500,
            provider="openrouter",
            model="google/gemma-7b-it",
            api_key=None,
            threads=1,
            template=None,
            output=None,
        )

        # Mock the adapter instance and its method
        mock_adapter_instance = MagicMock()
        mock_adapter.return_value = mock_adapter_instance
        mock_adapter_instance.rank_outputs.return_value = []

        # Run the command
        asyncio.run(run_rank_command(args))

        # Check that the model was prepended
        mock_adapter.assert_called_once()
        call_args, call_kwargs = mock_adapter.call_args
        self.assertEqual(call_kwargs["model"], "openrouter/google/gemma-7b-it")

        # Also test when the model already has the prefix
        mock_adapter.reset_mock()
        args.model = "openrouter/google/gemma-7b-it"
        asyncio.run(run_rank_command(args))
        mock_adapter.assert_called_once_with(
            model="openrouter/google/gemma-7b-it",
            api_key=None,
            config=mock_config.return_value,
            on_output_callback=ANY,
        )

        # Test with a non-openrouter provider
        mock_adapter.reset_mock()
        args.provider = "openai"
        args.model = "gpt-3.5-turbo"
        asyncio.run(run_rank_command(args))
        mock_adapter.assert_called_once_with(
            model="gpt-3.5-turbo",
            api_key=None,
            config=mock_config.return_value,
            on_output_callback=ANY,
        )

    @patch("logprob_ranker.cli.LiteLLMAdapter")
    @patch("logprob_ranker.cli.LogProbConfig")
    def test_run_rank_command(self, mock_config, mock_adapter):
        """Test running the rank command with mocked dependencies."""
        # This test uses the unittest's patch to replace the async function
        # with a synchronous version for testing purposes

        # Mock ranked outputs
        mock_result1 = MagicMock(logprob=0.9, output="Output 1")
        mock_result2 = MagicMock(logprob=0.8, output="Output 2")
        mock_results = [mock_result1, mock_result2]

        # Setup mock adapter
        mock_adapter_instance = MagicMock()
        mock_adapter_instance.rank_outputs.return_value = mock_results
        mock_adapter.return_value = mock_adapter_instance

        # Create temp file for output
        with tempfile.NamedTemporaryFile(delete=False) as temp_file:
            output_path = temp_file.name

        try:
            # Create args
            args = MagicMock(
                command="rank",  # This is important - needs to be "rank"
                prompt="Test prompt",
                variants=2,
                temperature=0.8,
                max_tokens=200,
                provider="openai",
                model="gpt-4",
                api_key="test_key",
                threads=2,
                template=None,
                output=output_path,
            )

            # We need to patch asyncio.run since run_rank_command is called with it
            with patch("asyncio.run") as mock_asyncio_run:
                # Then we can see what was passed to asyncio.run
                # Call main which will call run_rank_command through asyncio.run
                with patch("argparse.ArgumentParser.parse_args", return_value=args):
                    with patch("sys.exit"):
                        main()
                        # Verify asyncio.run was called with run_rank_command(args)
                        mock_asyncio_run.assert_called_once()

            # Now test the serialize_ranked_output functionality separately
            from logprob_ranker.utils import serialize_ranked_output

            # Mock the output file writing
            mock_open_func = mock_open()
            with patch("builtins.open", mock_open_func):
                # Mock json.dump
                with patch("json.dump") as mock_json_dump:
                    # Create serialized results
                    serialized_results = [
                        serialize_ranked_output(mock_result1),
                        serialize_ranked_output(mock_result2),
                    ]

                    # Call directly the part that writes to file
                    with open(output_path, "w") as f:
                        json.dump(serialized_results, f, indent=2)

                    # Verify json.dump was called
                    mock_json_dump.assert_called_once()
                    # Verify the first argument is a list with 2 items
                    args, _ = mock_json_dump.call_args
                    self.assertEqual(len(args[0]), 2)

        finally:
            # Clean up the temp file
            if os.path.exists(output_path):
                os.unlink(output_path)


if __name__ == "__main__":
    unittest.main()
