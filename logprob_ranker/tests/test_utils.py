"""
Shared utilities for async tests.
"""

import asyncio

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
        pass

    new_loop = policy.new_event_loop()
    policy.set_event_loop(new_loop)

    try:
        return new_loop.run_until_complete(test_case_method())
    finally:
        new_loop.close()
        policy.set_event_loop(original_loop)
