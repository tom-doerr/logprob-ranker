"""
Script to run async tests for the LiteLLMAdapter.
"""

import unittest
import asyncio
from test_litellm_adapter import TestLiteLLMAdapter

def run_async_test(test_case):
    """Run an async test method."""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(test_case())
    finally:
        loop.close()

if __name__ == "__main__":
    # Create test instance
    adapter_test = TestLiteLLMAdapter()
    adapter_test.setUp()
    
    try:
        print("Running async test: async_test_create_chat_completion")
        run_async_test(adapter_test.async_test_create_chat_completion)
        print("✓ Test passed\n")
        
        print("Running async test: async_test_rank_outputs")
        run_async_test(adapter_test.async_test_rank_outputs)
        print("✓ Test passed\n")
        
        print("Running async test: async_test_anthropic_integration")
        run_async_test(adapter_test.async_test_anthropic_integration)
        print("✓ Test passed\n")
        
        print("All async tests passed!")
    finally:
        adapter_test.tearDown()