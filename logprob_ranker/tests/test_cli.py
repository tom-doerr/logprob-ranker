"""
Tests for the command-line interface (CLI) functionality.

These tests ensure that the CLI correctly handles arguments,
loads configuration, and interacts with the LogProbRanker.
"""

import os
import sys
import pytest 
import tempfile
import json
from unittest.mock import patch, MagicMock, mock_open, AsyncMock, ANY 
from io import StringIO

# Add parent directory to path to import the package
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from logprob_ranker.cli import (
    setup_parser, 
    load_template_from_file, 
    get_model_from_provider,
    on_output_generated, 
    run_rank_command, 
    print_provider_help,
    main 
)
from logprob_ranker.ranker import RankedOutput, AttributeScore, LogProbRanker
from logprob_ranker.utils import serialize_ranked_output 

# Removed unittest.TestCase inheritance

# --- Fixtures (Optional, but can be useful) ---

@pytest.fixture
def mock_args_rank():
    """Provides mock arguments for the 'rank' command."""
    return MagicMock(
        command="rank",
        prompt="Test prompt",
        variants=2,
        temperature=0.8,
        max_tokens=200,
        provider="openai",
        model="gpt-4",
        api_key="test_key",
        threads=2,
        template='{"test": LOGPROB_TRUE}', 
        output=None, 
        config=None 
    )

# --- Test Functions ---

def test_setup_parser():
    """Test that the argument parser is correctly set up."""
    parser = setup_parser()
    
    # Test that the parser has the expected commands
    assert hasattr(parser, 'parse_args')
    
    # Parse some arguments to test parser functionality
    args = parser.parse_args(['rank', 'test prompt'])
    assert args.command == 'rank'
    assert args.prompt == 'test prompt'
    assert args.variants == 3  
    # Test with more arguments
    args = parser.parse_args([
        'rank', 
        'test prompt', 
        '--variants', '5',
        '--temperature', '0.8',
        '--max-tokens', '100',
        '--provider', 'anthropic'
    ])
    assert args.variants == 5
    assert args.temperature == 0.8
    assert args.max_tokens == 100
    assert args.provider == 'anthropic'

def test_load_template_from_file():
    """Test loading a template from a file."""
    # Test with non-existent file
    with patch('os.path.exists', return_value=False):
        with patch('sys.stdout', new=StringIO()) as fake_out:
            result = load_template_from_file('nonexistent.txt')
            assert result is None
            assert 'not found' in fake_out.getvalue()
    
    # Test with existing file
    template_content = '{"test": LOGPROB_TRUE}'
    with patch('os.path.exists', return_value=True):
        with patch('builtins.open', mock_open(read_data=template_content)):
            result = load_template_from_file('test.txt')
            assert result == template_content
    
    # Test with file read error
    with patch('os.path.exists', return_value=True):
        with patch('builtins.open', side_effect=Exception('Read error')):
            with patch('sys.stdout', new=StringIO()) as fake_out:
                result = load_template_from_file('error.txt')
                assert result is None
                assert 'Error loading template file' in fake_out.getvalue()

def test_get_model_from_provider():
    """Test getting default models for providers."""
    assert get_model_from_provider('openai') == 'gpt-3.5-turbo'
    assert get_model_from_provider('anthropic') == 'claude-2'
    assert get_model_from_provider('azure') == 'azure/gpt-35-turbo'
    assert get_model_from_provider('cohere') == 'command'
    assert get_model_from_provider('huggingface') == \
                     'huggingface/mistralai/Mistral-7B-Instruct-v0.1'
    assert get_model_from_provider('palm') == 'palm/chat-bison'
    
    # Test custom provider - should exit
    with patch('sys.exit') as mock_exit:
        with patch('sys.stdout', new=StringIO()):
            get_model_from_provider('custom')
            mock_exit.assert_called_once_with(1)
    
    # Test unknown provider - should exit
    with patch('sys.exit') as mock_exit:
        with patch('sys.stdout', new=StringIO()):
            get_model_from_provider('unknown')
            mock_exit.assert_called_once_with(1)

def test_on_output_generated():
    """Test the callback for output generation."""
    # Create a mock RankedOutput
    mock_output = MagicMock(spec=RankedOutput)
    mock_output.output = "Test Output"
    mock_output.logprob = 0.95
    mock_output.index = 0
    mock_output.raw_evaluation = '{"test": true}'
    # Fix: Explicitly set attributes on the mock object
    mock_attr = MagicMock(spec=AttributeScore)
    mock_attr.name = 'test'
    mock_attr.score = 1.0
    mock_output.attribute_scores = [mock_attr]
    
    with patch('sys.stdout', new=StringIO()) as fake_out:
        on_output_generated(mock_output)
        output = fake_out.getvalue()
        
        # Check that key information is printed
        assert f'Output #{mock_output.index + 1}' in output # Check index (0 -> 1)
        assert f'Score: {mock_output.logprob:.3f}' in output
        assert 'Attribute scores:' in output
        assert 'test: 1.000' in output # Check specific score format
        assert mock_output.output in output # Check output content itself

@patch('logprob_ranker.cli.run_rank_command') 
def test_main_rank_command(mock_run_rank, mock_args_rank):
    """Test that the main function correctly runs the rank command."""
    # Patch parse_args to return our mock rank args
    with patch('argparse.ArgumentParser.parse_args', return_value=mock_args_rank):
        # Patch sys.exit to prevent test termination
        with patch('sys.exit'): 
             # Mock asyncio.run to check if it's called with the right coroutine
            with patch('asyncio.run') as mock_asyncio_run:
                main()
                # Check that asyncio.run was called
                mock_asyncio_run.assert_called_once()
                # Check that it was called with the result of run_rank_command(mock_args_rank)
                # Note: We compare the coroutine object itself if possible, or check args
                called_coro = mock_asyncio_run.call_args[0][0]
                # This check is tricky, might need refinement depending on Python version/mock behavior
                assert hasattr(called_coro, '__await__') 
                # We can't easily assert it's the *exact* coroutine object from run_rank_command
                # because mock_run_rank replaces it. Instead, assert mock_run_rank was prepared.
                # An alternative is to NOT patch run_rank_command here, but patch its *internals*.

def test_main_no_command():
    """Test that main prints help when no command is given."""
    # Mock args returned by parse_args when no command is given
    mock_args_no_command = MagicMock(command=None)
    parser_mock = MagicMock()
    parser_mock.parse_args.return_value = mock_args_no_command
    parser_mock.print_help = MagicMock()

    # Fix: Also patch print_provider_help
    # Fix: Remove sys.exit patch as it's not called
    with patch('logprob_ranker.cli.setup_parser', return_value=parser_mock):
        with patch('logprob_ranker.cli.print_provider_help') as mock_print_provider, \
             patch('asyncio.run') as mock_asyncio_run:
            main()
            parser_mock.print_help.assert_called_once()
            mock_print_provider.assert_called_once() # Assert it was called
            mock_asyncio_run.assert_not_called() # Ensure the async path wasn't taken

def test_print_provider_help():
    """Test that provider help information is printed correctly."""
    with patch('sys.stdout', new=StringIO()) as fake_out:
        print_provider_help()
        output = fake_out.getvalue()
        
        # Check that key information is in the output
        assert 'Supported LLM Providers and Models:' in output
        assert 'OPENAI:' in output
        assert 'ANTHROPIC:' in output
        assert 'gpt-3.5-turbo' in output
        assert 'gpt-4' in output
        assert 'claude-2' in output
        assert 'Example usage:' in output

# Test the async function directly
@pytest.mark.asyncio
# Correct Patching: Remove LogProbRanker patch, keep LiteLLMAdapter patch
@patch('logprob_ranker.cli.LiteLLMAdapter') # Patch the Adapter class
@patch('logprob_ranker.cli.load_template_from_file') # Patch template loading
async def test_run_rank_command_no_output_file(mock_load_template, MockAdapter, mock_args_rank):
    """Test run_rank_command without writing to an output file."""
    template_content = '{"test": LOGPROB_TRUE}'
    mock_load_template.return_value = template_content

    mock_args_rank.template = 'path/to/fake/template.json' # Path is needed to trigger load
    mock_args_rank.output = None

    # Create mock for the adapter instance that will be returned by the constructor patch
    mock_adapter_instance = AsyncMock() # run_rank_command calls rank_outputs on this instance
    MockAdapter.return_value = mock_adapter_instance # Configure the class mock

    # Mock the return value of the rank_outputs method ON THE ADAPTER INSTANCE
    mock_result1 = MagicMock(spec=RankedOutput, logprob=0.9, output="Output 1", index=0)
    mock_result2 = MagicMock(spec=RankedOutput, logprob=0.8, output="Output 2", index=1)
    mock_results = [mock_result1, mock_result2]
    mock_adapter_instance.rank_outputs.return_value = mock_results # Configure method on the instance

    # Patch the callback (passed to Adapter constructor)
    with patch('logprob_ranker.cli.on_output_generated') as mock_callback:
        await run_rank_command(mock_args_rank)

        # Verify template loaded
        mock_load_template.assert_called_once_with(mock_args_rank.template)
        # Verify Adapter class constructor was called correctly
        MockAdapter.assert_called_once_with(
            model=mock_args_rank.model,
            api_key='test_key',
            config=ANY, # Config is created internally, match any LogProbConfig
            on_output_callback=mock_callback # Check callback was passed to Adapter
        )

        # Verify the rank_outputs method on the mock ADAPTER instance was awaited correctly
        mock_adapter_instance.rank_outputs.assert_awaited_once_with(
            mock_args_rank.prompt
        )

@pytest.mark.asyncio
# Correct Patching: Remove LogProbRanker patch, keep LiteLLMAdapter patch
@patch('logprob_ranker.cli.LiteLLMAdapter')
@patch('logprob_ranker.cli.load_template_from_file')
@patch('builtins.open', new_callable=mock_open) # Mock file opening for output
@patch('json.dump') # Mock json writing
async def test_run_rank_command_with_output_file(mock_json_dump, mock_file_open, mock_load_template, MockAdapter, mock_args_rank):
    """Test run_rank_command with writing to an output file."""
    template_content = '{"test": LOGPROB_TRUE}'
    mock_load_template.return_value = template_content

    mock_args_rank.template = 'path/to/fake/template.json' # Path is needed to trigger load

    # Create mock for the adapter instance that will be returned by the constructor patch
    mock_adapter_instance = AsyncMock()
    MockAdapter.return_value = mock_adapter_instance # Configure the class mock

    # Mock the return value of the rank_outputs method ON THE ADAPTER INSTANCE
    mock_result1 = MagicMock(spec=RankedOutput, logprob=0.9, output="Output 1", index=0)
    mock_result2 = MagicMock(spec=RankedOutput, logprob=0.8, output="Output 2", index=1)
    mock_result1.attribute_scores = []
    mock_result1.raw_evaluation = ""
    mock_result2.attribute_scores = []
    mock_result2.raw_evaluation = ""
    mock_results = [mock_result1, mock_result2]
    # Configure the rank_outputs method ON THE ADAPTER INSTANCE to be an AsyncMock
    mock_adapter_instance.rank_outputs = AsyncMock(return_value=mock_results)

    # Provide an output path for the results
    output_path = "/fake/output.json"
    mock_args_rank.output = output_path

    # Patch the callback (passed to Adapter constructor)
    with patch('logprob_ranker.cli.on_output_generated') as mock_callback:
        await run_rank_command(mock_args_rank)

        # Verify template loaded
        mock_load_template.assert_called_once_with(mock_args_rank.template)
        # Verify Adapter class constructor was called correctly
        MockAdapter.assert_called_once_with(
            model=mock_args_rank.model,
            api_key='test_key',
            config=ANY, # Config is created internally, match any LogProbConfig
            on_output_callback=mock_callback # Check callback was passed to Adapter
        )

        # Verify the rank_outputs method on the mock ADAPTER instance was awaited correctly
        mock_adapter_instance.rank_outputs.assert_awaited_once_with(
            mock_args_rank.prompt
        )

        # Verify file was opened and written to (for results)
        mock_file_open.assert_called_once_with(output_path, 'w')
        mock_json_dump.assert_called_once()
        # Check the data passed to json.dump (serialized results)
        dump_args, dump_kwargs = mock_json_dump.call_args
        assert len(dump_args[0]) == 2 # Should be a list of 2 dicts
        assert dump_args[0][0]['output'] == 'Output 1'
        assert dump_args[0][1]['output'] == 'Output 2'
        assert dump_kwargs.get('indent') == 2

# Removed __main__ block for unittest
# if __name__ == '__main__':
#     unittest.main()