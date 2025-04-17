/**
 * API Service Integration Tests
 * Tests the interaction between our API service and server endpoints
 */

import { apiService } from '../services/api-service';
import { authStorage } from '../utils/storage';
import { getCurrentApiKeyInfo, addApiKeyHeaders } from '../utils/api-key-utils';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock global fetch
global.fetch = vi.fn();

describe('API Service Integration', () => {
  beforeEach(() => {
    // Clear auth storage before each test
    authStorage.clearAuth();
    vi.clearAllMocks();
  });
  
  afterEach(() => {
    authStorage.clearAuth();
  });
  
  it('should include correct auth headers for API requests with manual key', async () => {
    // Set up manual API key auth
    const testApiKey = 'sk-or-v1-testapikey12345';
    authStorage.setApiKey(testApiKey);
    authStorage.setAuthMethod('manual');
    
    // Mock successful API response
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({ choices: [{ message: { content: 'Test response' } }] })
    };
    
    global.fetch.mockResolvedValue(mockResponse);
    
    // Make a request with the API service
    await apiService.createChatCompletion({
      model: 'test-model',
      messages: [{ role: 'user', content: 'Test message' }]
    });
    
    // Check that fetch was called with the correct headers
    expect(fetch).toHaveBeenCalled();
    const fetchOptions = (global.fetch as any).mock.calls[0][1];
    expect(fetchOptions.headers).toBeDefined();
    
    // Headers should include the x-api-key header with the API key
    // This is how it should be sent when using a manual key
    const headersObj = fetchOptions.headers;
    expect(headersObj['x-api-key']).toBe(testApiKey);
  });
  
  it('should include correct auth headers for API requests with OAuth token', async () => {
    // Set up OAuth token auth
    const testOAuthToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-token';
    authStorage.setApiKey(testOAuthToken);
    authStorage.setAuthMethod('oauth');
    
    // Mock successful API response
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({ choices: [{ message: { content: 'Test response' } }] })
    };
    
    global.fetch.mockResolvedValue(mockResponse);
    
    // Make a request with the API service
    await apiService.createChatCompletion({
      model: 'test-model',
      messages: [{ role: 'user', content: 'Test message' }]
    });
    
    // Check that fetch was called with the correct headers
    expect(fetch).toHaveBeenCalled();
    const fetchOptions = (global.fetch as any).mock.calls[0][1];
    expect(fetchOptions.headers).toBeDefined();
    
    // Headers should include the Authorization header for OAuth
    const headersObj = fetchOptions.headers;
    expect(headersObj['Authorization']).toBe(`Bearer ${testOAuthToken}`);
  });
  
  it('should not include auth headers when using browser model mode', async () => {
    // Set up browser model mode auth
    authStorage.setApiKey('browser-llm');
    authStorage.setAuthMethod('browser');
    
    // Check auth info
    const apiKeyInfo = getCurrentApiKeyInfo();
    expect(apiKeyInfo.method).toBe('browser');
    
    // Get headers 
    const headers = addApiKeyHeaders({});
    
    // Should not have auth headers for browser model
    expect(headers['Authorization']).toBeUndefined();
    expect(headers['x-api-key']).toBeUndefined();
  });
  
  it('should handle API errors correctly', async () => {
    // Set up manual API key auth
    const testApiKey = 'sk-or-v1-testapikey12345';
    authStorage.setApiKey(testApiKey);
    authStorage.setAuthMethod('manual');
    
    // Mock error API response
    const mockErrorResponse = {
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      text: vi.fn().mockResolvedValue('Invalid API key')
    };
    
    global.fetch.mockResolvedValue(mockErrorResponse);
    
    // Make a request and expect it to throw
    await expect(
      apiService.createChatCompletion({
        model: 'test-model',
        messages: [{ role: 'user', content: 'Test message' }]
      })
    ).rejects.toThrow();
    
    // Check that fetch was called
    expect(fetch).toHaveBeenCalled();
  });
  
  it('should retry on rate limit errors', async () => {
    // Set up manual API key auth
    const testApiKey = 'sk-or-v1-testapikey12345';
    authStorage.setApiKey(testApiKey);
    authStorage.setAuthMethod('manual');
    
    // Mock rate limit error then success
    const mockRateLimitResponse = {
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
      text: vi.fn().mockResolvedValue('Rate limit exceeded')
    };
    
    const mockSuccessResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({ choices: [{ message: { content: 'Test response' } }] })
    };
    
    // First call gets rate limited, second succeeds
    global.fetch.mockResolvedValueOnce(mockRateLimitResponse)
               .mockResolvedValueOnce(mockSuccessResponse);
    
    // Mock setTimeout to avoid waiting in tests
    vi.useFakeTimers();
    
    // Start the request
    const promise = apiService.createChatCompletion({
      model: 'test-model',
      messages: [{ role: 'user', content: 'Test message' }]
    });
    
    // Advance timers to trigger retry
    vi.runAllTimers();
    
    // Wait for the request to complete
    await promise;
    
    // Should have called fetch twice (original + retry)
    expect(fetch).toHaveBeenCalledTimes(2);
    
    // Reset timers
    vi.useRealTimers();
  });
});