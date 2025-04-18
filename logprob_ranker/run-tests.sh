#!/bin/bash
set -e

# Change to the repository root
cd "$(dirname "$0")"

echo "Running unit tests..."

# Run specific LiteLLM test suites first
echo "Testing LiteLLM adapter initialization..."
python tests/test_litellm_basic.py

# Run other tests if any of the modules can be imported successfully
echo "Testing other modules..."
python -m unittest discover tests -k "test_utils"

echo "All tests passed!"