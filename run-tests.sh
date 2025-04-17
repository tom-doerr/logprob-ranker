#!/bin/bash

# Run integration tests using Vitest
echo "Running integration tests..."
npx vitest run

# Check test results
TEST_EXIT_CODE=$?

if [ $TEST_EXIT_CODE -eq 0 ]; then
  echo "All tests passed successfully! ✅"
else
  echo "Some tests failed. ❌"
fi

exit $TEST_EXIT_CODE