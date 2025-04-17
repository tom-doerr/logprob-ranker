import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchFromAPI, sendChatRequest } from '../services/api-service';
import { storeApiKey, removeApiKey } from '../utils/api-key-utils';

// Mock fetch
global.fetch = vi.fn();

describe('API Client Integration', () => {
  const mockApiKey = 'test-integration-api-key-12345';
  
  // Mock localStorage
  const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
      getItem: vi.fn((key: string) => store[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value.toString();
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key];
      }),
      clear: vi.fn(() => {
        store = {};
      })
    };
  })();

  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true
    });
    localStorageMock.clear();
    
    // Reset mock
    vi.resetAllMocks();
    
    // Mock successful fetch response
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: 'test-response' }),
      text: async () => 'success',
    });
  });

  afterEach(() => {
    removeApiKey();
  });

  it('should include API key in request headers when available', async () => {
    // Store API key
    storeApiKey(mockApiKey);
    
    // Make API request
    await fetchFromAPI('/test-endpoint', {
      method: 'GET'
    });
    
    // Verify the API key was included in headers
    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          'Authorization': `Bearer ${mockApiKey}`
        })
      })
    );
  });

  it('should not include API key in request headers when not available', async () => {
    // Ensure no API key is stored
    removeApiKey();
    
    // Make API request
    await fetchFromAPI('/test-endpoint', {
      method: 'GET'
    });
    
    // Verify the API key was NOT included in headers
    const fetchCall = (global.fetch as any).mock.calls[0][1];
    
    // Either headers shouldn't exist, or if they do, should not have Authorization
    if (fetchCall.headers) {
      expect(fetchCall.headers).not.toHaveProperty('Authorization');
    }
  });

  it('should send chat requests with the stored API key', async () => {
    // Store API key
    storeApiKey(mockApiKey);
    
    // Create chat request
    const messages = [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Hello, how are you?' }
    ];
    
    // Send request
    await sendChatRequest({
      messages,
      temperature: 0.7,
      model: 'test-model'
    });
    
    // Verify request was made with correct data and headers
    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mockApiKey}`
        }),
        body: expect.stringContaining('"messages":')
      })
    );
    
    // Verify the body contains the messages
    const requestBody = JSON.parse((global.fetch as any).mock.calls[0][1].body);
    expect(requestBody.messages).toEqual(messages);
    expect(requestBody.temperature).toBe(0.7);
    expect(requestBody.model).toBe('test-model');
  });

  it('should handle API errors correctly', async () => {
    // Mock error response
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: async () => ({ error: 'Invalid API key' }),
      text: async () => 'Invalid API key',
    });
    
    // Store invalid API key
    storeApiKey('invalid-key');
    
    // Make request and expect error
    await expect(fetchFromAPI('/test-endpoint')).rejects.toThrow();
  });

  it('should handle rate limiting with retry logic', async () => {
    // Setup to mock rate limit then success
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        json: async () => ({ error: 'Rate limited' }),
        text: async () => 'Rate limited',
        headers: new Map([['Retry-After', '1']])
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
        text: async () => 'success',
      });
    
    storeApiKey(mockApiKey);
    
    // Make request - it should retry and succeed
    const result = await fetchFromAPI('/test-endpoint', { method: 'GET' });
    
    // Verify fetch was called twice (initial + retry)
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ success: true });
  });
});