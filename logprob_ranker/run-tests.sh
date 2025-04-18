#!/bin/bash
set -e

# Change to the repository root
cd "$(dirname "$0")"

echo "Running unit tests..."
python -m unittest discover tests

echo "All tests passed!"