import pytest
import aiohttp
import asyncio
import litellm

@pytest.fixture(scope="function")
async def aiohttp_session():
    """
    Pytest fixture to create and properly close an aiohttp.ClientSession.
    The session is scoped to the test function.
    """
    async with aiohttp.ClientSession() as session:
        yield session
    # The session is automatically closed by the async context manager.
    # For session-scoped async fixtures, pytest-asyncio typically manages the loop lifecycle.
    # If we created the loop (loop = asyncio.new_event_loop()), we might consider closing it,
    # but it's generally safer to let pytest-asyncio handle it to avoid conflicts.
    # if 'loop_created_by_fixture' in locals() and loop_created_by_fixture:
    #     loop.close()


@pytest.fixture(scope="session", autouse=True)
async def shutdown_litellm_session():
    yield
    # This code runs after all tests in the session have completed
    if hasattr(litellm, 'shutdown'):
        if asyncio.iscoroutinefunction(litellm.shutdown):
            await litellm.shutdown()
            await asyncio.sleep(0.1) # Add a small delay
        else: # If it's a sync function
            litellm.shutdown()
