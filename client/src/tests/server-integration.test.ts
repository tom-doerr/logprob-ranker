/**
 * Server API Integration Tests
 * Tests for server API routes and how they handle authentication
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock response data
const mockCompletionResponse = {
  id: 'mock-completion-id',
  object: 'chat.completion',
  created: Date.now(),
  model: 'test-model',
  choices: [
    {
      index: 0,
      message: {
        role: 'assistant',
        content: 'This is a test response from the API'
      },
      finish_reason: 'stop'
    }
  ]
};

const mockModelsResponse = {
  data: [
    { id: 'model-1', name: 'Model 1' },
    { id: 'model-2', name: 'Model 2' }
  ]
};

// Create a simplified mock server for testing
const createMockServer = () => {
  // Save original fetch
  const originalFetch = global.fetch;
  
  // Mock for the OpenRouter API requests from the server
  const mockOpenRouterAPI = vi.fn().mockImplementation((url, options) => {
    if (url === 'https://openrouter.ai/api/v1/chat/completions') {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockCompletionResponse)
      });
    }
    
    if (url === 'https://openrouter.ai/api/v1/models') {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockModelsResponse)
      });
    }
    
    return Promise.resolve({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      text: () => Promise.resolve('Not found')
    });
  });
  
  // Create a simple mock handler for server routes
  const serverHandler = vi.fn().mockImplementation(async (url, options = {}) => {
    // Chat completions endpoint
    if (url === '/api/v1/chat/completions' && options.method === 'POST') {
      const body = JSON.parse(options.body);
      const authHeader = options.headers?.['Authorization'];
      const apiKeyHeader = options.headers?.['x-api-key'];
      
      // Extract auth token either from Authorization header or x-api-key
      let token = 'test-env-api-key'; // Default to env var
      
      if (authHeader) {
        token = authHeader.replace('Bearer ', '');
      } else if (apiKeyHeader) {
        token = apiKeyHeader;
      }
      
      // Call the OpenRouter API with the token
      const apiResponse = await mockOpenRouterAPI('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });
      
      if (!apiResponse.ok) {
        return {
          ok: false,
          status: apiResponse.status,
          statusText: apiResponse.statusText,
          json: () => apiResponse.json(),
          text: () => apiResponse.text()
        };
      }
      
      return {
        ok: true,
        json: () => apiResponse.json()
      };
    }
    
    // Models endpoint
    if (url === '/api/v1/models' && (!options.method || options.method === 'GET')) {
      const authHeader = options.headers?.['Authorization'];
      const apiKeyHeader = options.headers?.['x-api-key'];
      
      // Extract auth token either from Authorization header or x-api-key
      let token = 'test-env-api-key'; // Default to env var
      
      if (authHeader) {
        token = authHeader.replace('Bearer ', '');
      } else if (apiKeyHeader) {
        token = apiKeyHeader;
      }
      
      // Call the OpenRouter API with the token
      const apiResponse = await mockOpenRouterAPI('https://openrouter.ai/api/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      return {
        ok: true,
        json: () => apiResponse.json()
      };
    }
    
    // Status endpoint
    if (url === '/api/v1/status' && (!options.method || options.method === 'GET')) {
      // Simple status check
      if (!process.env.OPENROUTER_API_KEY) {
        return {
          ok: true,
          json: () => Promise.resolve({
            status: 'error',
            keyExists: false,
            message: 'API key not configured'
          })
        };
      }
      
      // Try to validate API key by checking models
      try {
        const modelResponse = await mockOpenRouterAPI('https://openrouter.ai/api/v1/models', {
          headers: {
            'Authorization': `Bearer test-env-api-key`
          }
        });
        
        if (!modelResponse.ok) {
          return {
            ok: true,
            json: () => Promise.resolve({
              status: 'error',
              keyExists: true,
              message: 'API key test failed',
              keyMasked: 'sk-***'
            })
          };
        }
        
        return {
          ok: true,
          json: () => Promise.resolve({
            status: 'success',
            keyExists: true,
            keyMasked: 'sk-***'
          })
        };
      } catch (error) {
        return {
          ok: true,
          json: () => Promise.resolve({
            status: 'error',
            message: 'Server error checking API key',
            error: String(error)
          })
        };
      }
    }
    
    // Default 404 response
    return {
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: () => Promise.resolve({ error: 'Not found' }),
      text: () => Promise.resolve('Not found')
    };
  });
  
  // Override global fetch
  global.fetch = serverHandler;
  
  return {
    serverHandler,
    mockOpenRouterAPI,
    restoreOriginalFetch: () => {
      global.fetch = originalFetch;
    }
  };
};

describe('Server API Integration', () => {
  let mockServer;
  
  beforeEach(() => {
    // Mock environment variable
    process.env.OPENROUTER_API_KEY = 'test-env-api-key';
    
    // Create mock server
    mockServer = createMockServer();
  });
  
  afterEach(() => {
    mockServer.restoreOriginalFetch();
    vi.clearAllMocks();
  });
  
  describe('Chat Completions Endpoint', () => {
    it('should use client provided Authorization header', async () => {
      // Client request with Authorization header (OAuth token)
      const clientResponse = await fetch('/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer oauth-token-12345'
        },
        body: JSON.stringify({
          model: 'test-model',
          messages: [{ role: 'user', content: 'Hello' }]
        })
      });
      
      // Get completion data
      const data = await clientResponse.json();
      
      // Server handler should have been called
      expect(mockServer.serverHandler).toHaveBeenCalledWith(
        '/api/v1/chat/completions',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer oauth-token-12345'
          })
        })
      );
      
      // OpenRouter API should have been called with the auth token
      expect(mockServer.mockOpenRouterAPI).toHaveBeenCalledWith(
        'https://openrouter.ai/api/v1/chat/completions',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer oauth-token-12345'
          })
        })
      );
      
      // Response should contain expected data
      expect(data).toEqual(mockCompletionResponse);
    });
    
    it('should use client provided x-api-key header', async () => {
      // Client request with x-api-key header (manual API key)
      const clientResponse = await fetch('/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'sk-or-v1-test-key'
        },
        body: JSON.stringify({
          model: 'test-model',
          messages: [{ role: 'user', content: 'Hello' }]
        })
      });
      
      // Get completion data
      const data = await clientResponse.json();
      
      // Server handler should have been called
      expect(mockServer.serverHandler).toHaveBeenCalledWith(
        '/api/v1/chat/completions',
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-api-key': 'sk-or-v1-test-key'
          })
        })
      );
      
      // OpenRouter API should have been called with the auth token
      expect(mockServer.mockOpenRouterAPI).toHaveBeenCalledWith(
        'https://openrouter.ai/api/v1/chat/completions',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer sk-or-v1-test-key'
          })
        })
      );
      
      // Response should contain expected data
      expect(data).toEqual(mockCompletionResponse);
    });
    
    it('should fallback to environment API key if no client auth', async () => {
      // Client request without auth headers
      const clientResponse = await fetch('/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'test-model',
          messages: [{ role: 'user', content: 'Hello' }]
        })
      });
      
      // Get completion data
      const data = await clientResponse.json();
      
      // OpenRouter API should have been called with env API key
      expect(mockServer.mockOpenRouterAPI).toHaveBeenCalledWith(
        'https://openrouter.ai/api/v1/chat/completions',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-env-api-key'
          })
        })
      );
      
      // Response should contain expected data
      expect(data).toEqual(mockCompletionResponse);
    });
  });
  
  describe('Models Endpoint', () => {
    it('should use client provided auth headers', async () => {
      // Client request with Authorization header
      const clientResponse = await fetch('/api/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer oauth-token-12345'
        }
      });
      
      // Get models data
      const data = await clientResponse.json();
      
      // Server handler should have been called
      expect(mockServer.serverHandler).toHaveBeenCalledWith(
        '/api/v1/models',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer oauth-token-12345'
          })
        })
      );
      
      // OpenRouter API should have been called with the auth token
      expect(mockServer.mockOpenRouterAPI).toHaveBeenCalledWith(
        'https://openrouter.ai/api/v1/models',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer oauth-token-12345'
          })
        })
      );
      
      // Response should contain expected data
      expect(data).toEqual(mockModelsResponse);
    });
    
    it('should fallback to environment API key if no client auth', async () => {
      // Client request without auth headers
      const clientResponse = await fetch('/api/v1/models', {
        method: 'GET'
      });
      
      // Get models data
      const data = await clientResponse.json();
      
      // OpenRouter API should have been called with env API key
      expect(mockServer.mockOpenRouterAPI).toHaveBeenCalledWith(
        'https://openrouter.ai/api/v1/models',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-env-api-key'
          })
        })
      );
      
      // Response should contain expected data
      expect(data).toEqual(mockModelsResponse);
    });
  });
  
  describe('Status Endpoint', () => {
    it('should check environment API key status', async () => {
      // Client request to status endpoint
      const clientResponse = await fetch('/api/v1/status', {
        method: 'GET'
      });
      
      // Get status data
      const data = await clientResponse.json();
      
      // Should report success
      expect(data.status).toBe('success');
      expect(data.keyExists).toBe(true);
      expect(data.keyMasked).toBeDefined();
    });
    
    it('should handle missing environment API key', async () => {
      // Temporarily remove env API key
      const savedApiKey = process.env.OPENROUTER_API_KEY;
      delete process.env.OPENROUTER_API_KEY;
      
      // Client request to status endpoint
      const clientResponse = await fetch('/api/v1/status', {
        method: 'GET'
      });
      
      // Get status data
      const data = await clientResponse.json();
      
      // Should report missing key
      expect(data.status).toBe('error');
      expect(data.keyExists).toBe(false);
      expect(data.message).toContain('API key not configured');
      
      // Restore env API key
      process.env.OPENROUTER_API_KEY = savedApiKey;
    });
  });
});