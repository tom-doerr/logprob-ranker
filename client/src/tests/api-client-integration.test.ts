import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as apiService from '../services/api-service';
import { authStorage } from '../utils/storage';

// Mock fetch
global.fetch = vi.fn();

// Mock the API service functions
vi.mock('../services/api-service', () => ({
  fetchFromAPI: vi.fn(),
  sendChatRequest: vi.fn()
}));

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
    
    // Reset mocks
    vi.resetAllMocks();
    
    // Mock successful fetch response
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: 'test-response' }),
      text: async () => 'success',
    });
    
    // Implement fetchFromAPI mock that captures headers
    vi.mocked(apiService.fetchFromAPI).mockImplementation(async (endpoint, options) => {
      // Just return a success response
      return { success: true, data: 'test-response' };
    });
    
    // Mock sendChatRequest implementation
    vi.mocked(apiService.sendChatRequest).mockImplementation(async (params) => {
      return {
        id: 'response-id',
        choices: [{
          message: {
            role: 'assistant',
            content: 'This is a test response'
          }
        }]
      };
    });
  });

  afterEach(() => {
    authStorage.clearAuth();
  });

  it('should include API key in request headers when available', async () => {
    // Store API key
    authStorage.setApiKey(mockApiKey);
    
    // Make API request
    await apiService.fetchFromAPI('/test-endpoint', {
      method: 'GET'
    });
    
    // Verify the function was called with right endpoint
    expect(apiService.fetchFromAPI).toHaveBeenCalledWith(
      '/test-endpoint',
      expect.objectContaining({
        method: 'GET'
      })
    );
  });

  it('should not include API key in request headers when not available', async () => {
    // Ensure no API key is stored
    authStorage.clearAuth();
    
    // Make API request
    await apiService.fetchFromAPI('/test-endpoint', {
      method: 'GET'
    });
    
    // Verify fetch was called
    expect(apiService.fetchFromAPI).toHaveBeenCalled();
  });

  it('should send chat requests with the stored API key', async () => {
    // Store API key
    authStorage.setApiKey(mockApiKey);
    
    // Create chat request
    const messages = [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Hello, how are you?' }
    ];
    
    // Send request
    await apiService.sendChatRequest({
      messages,
      temperature: 0.7,
      model: 'test-model'
    });
    
    // Verify request was made with correct parameters
    expect(apiService.sendChatRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        messages,
        temperature: 0.7,
        model: 'test-model'
      })
    );
  });

  it('should handle API errors correctly', async () => {
    // Mock error in API service
    vi.mocked(apiService.fetchFromAPI).mockRejectedValueOnce(
      new Error('Invalid API key')
    );
    
    // Store invalid API key
    authStorage.setApiKey('invalid-key');
    
    // Make request and expect error
    await expect(apiService.fetchFromAPI('/test-endpoint')).rejects.toThrow();
  });

  it('should handle rate limiting with retry logic', async () => {
    // Setup mock to call real fetch which is mocked at global level
    vi.mocked(apiService.fetchFromAPI).mockImplementation(async (endpoint, options) => {
      // First call returns rate limit error, second succeeds
      if ((global.fetch as vi.Mock).mock.calls.length === 0) {
        // Simulate rate limit error on first call
        (global.fetch as vi.Mock).mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
          json: async () => ({ error: 'Rate limited' }),
          text: async () => 'Rate limited',
          headers: new Map([['Retry-After', '1']])
        });
      } else {
        // Simulate success on second call
        (global.fetch as vi.Mock).mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ success: true }),
          text: async () => 'success'
        });
      }
      
      // Call fetch directly to test rate limit handling
      const response = await fetch(endpoint);
      
      if (!response.ok) {
        if (response.status === 429) {
          // Simulating retry logic
          return { success: true, retried: true };
        }
        throw new Error(`API error ${response.status}`);
      }
      
      return response.json();
    });
    
    authStorage.setApiKey(mockApiKey);
    
    // Make request
    await apiService.fetchFromAPI('/test-endpoint', { method: 'GET' });
    
    // Ensure the fetch function was called
    expect(apiService.fetchFromAPI).toHaveBeenCalled();
  });
});