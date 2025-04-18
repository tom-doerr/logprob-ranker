#!/bin/bash
# Test script for LogProb Ranker

set -e  # Exit on error

echo "Running unit tests..."
cd "$(dirname "$0")"  # Navigate to script directory

# Run basic tests 
python -m unittest tests/test_ranker.py
python -m unittest tests/test_utils.py
python -m unittest tests/test_async_basic.py

echo "All tests passed!"

echo "Checking import functionality..."
python -c "from logprob_ranker import LogProbConfig, LiteLLMAdapter, RankedOutput; print('Package imports work!')"

echo "Running simple example with the import path..."
cd examples
python -c "import sys; sys.path.insert(0, '..'); from logprob_ranker import LogProbConfig; print('Example imports work!')"

# Print success message
echo "All checks passed successfully!"
echo "The package is ready for installation and distribution."