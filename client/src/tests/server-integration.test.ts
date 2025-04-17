/**
 * Server API Integration Tests
 * Tests for server API routes and how they handle authentication
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Global fetch is already mocked in setup.ts
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

// Mock environment variables
process.env.OPENROUTER_API_KEY = 'test-env-api-key';

describe('Server API Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default fetch mock implementation
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({})
    });
  });
  
  afterEach(() => {
    vi.clearAllMocks();
  });
  
  describe('Chat Completions Endpoint', () => {
    it('should use client provided Authorization header', async () => {
      // Mock successful API response
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(mockCompletionResponse)
      });
      
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
      
      // Server should forward the request to OpenRouter API
      expect(global.fetch).toHaveBeenCalledWith(
        'https://openrouter.ai/api/v1/chat/completions',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer oauth-token-12345'
          })
        })
      );
      
      // Check response
      expect(data).toEqual(mockCompletionResponse);
    });
    
    it('should use client provided x-api-key header', async () => {
      // Mock successful API response
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(mockCompletionResponse)
      });
      
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
      
      // Server should forward the request to OpenRouter API with Bearer token
      expect(global.fetch).toHaveBeenCalledWith(
        'https://openrouter.ai/api/v1/chat/completions',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer sk-or-v1-test-key'
          })
        })
      );
      
      // Check response
      expect(data).toEqual(mockCompletionResponse);
    });
    
    it('should fallback to environment API key if no client auth', async () => {
      // Mock successful API response
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(mockCompletionResponse)
      });
      
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
      
      // Server should forward the request to OpenRouter API with env API key
      expect(global.fetch).toHaveBeenCalledWith(
        'https://openrouter.ai/api/v1/chat/completions',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-env-api-key'
          })
        })
      );
      
      // Check response
      expect(data).toEqual(mockCompletionResponse);
    });
    
    it('should handle API errors properly', async () => {
      // Mock API error response
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: vi.fn().mockResolvedValue('Invalid API key')
      });
      
      // Client request
      const clientResponse = await fetch('/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer invalid-token'
        },
        body: JSON.stringify({
          model: 'test-model',
          messages: [{ role: 'user', content: 'Hello' }]
        })
      });
      
      // Check error response
      expect(clientResponse.ok).toBe(false);
      
      // API call should still be made with the provided token
      expect(global.fetch).toHaveBeenCalledWith(
        'https://openrouter.ai/api/v1/chat/completions',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer invalid-token'
          })
        })
      );
    });
  });
  
  describe('Models Endpoint', () => {
    it('should use client provided auth headers', async () => {
      // Mock successful API response
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(mockModelsResponse)
      });
      
      // Client request with Authorization header
      const clientResponse = await fetch('/api/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer oauth-token-12345'
        }
      });
      
      // Get models data
      const data = await clientResponse.json();
      
      // Server should forward the request to OpenRouter API
      expect(global.fetch).toHaveBeenCalledWith(
        'https://openrouter.ai/api/v1/models',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer oauth-token-12345'
          })
        })
      );
      
      // Check response
      expect(data).toEqual(mockModelsResponse);
    });
    
    it('should fallback to environment API key if no client auth', async () => {
      // Mock successful API response
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(mockModelsResponse)
      });
      
      // Client request without auth headers
      const clientResponse = await fetch('/api/v1/models', {
        method: 'GET'
      });
      
      // Get models data
      const data = await clientResponse.json();
      
      // Server should forward the request to OpenRouter API with env API key
      expect(global.fetch).toHaveBeenCalledWith(
        'https://openrouter.ai/api/v1/models',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-env-api-key'
          })
        })
      );
      
      // Check response
      expect(data).toEqual(mockModelsResponse);
    });
  });
  
  describe('Status Endpoint', () => {
    it('should check environment API key status', async () => {
      // Mock successful API response for models check
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          data: [
            { id: 'model-1', name: 'Model 1' },
            { id: 'model-2', name: 'Model 2' }
          ]
        })
      });
      
      // Client request to status endpoint
      const clientResponse = await fetch('/api/v1/status', {
        method: 'GET'
      });
      
      // Get status data
      const data = await clientResponse.json();
      
      // Status endpoint should check API key with OpenRouter API
      expect(global.fetch).toHaveBeenCalledWith(
        'https://openrouter.ai/api/v1/models',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-env-api-key'
          })
        })
      );
      
      // Status should be success
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
    
    it('should handle API key validation failure', async () => {
      // Mock API error response for models check
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: vi.fn().mockResolvedValue('Invalid API key')
      });
      
      // Client request to status endpoint
      const clientResponse = await fetch('/api/v1/status', {
        method: 'GET'
      });
      
      // Get status data
      const data = await clientResponse.json();
      
      // Status should be error
      expect(data.status).toBe('error');
      expect(data.keyExists).toBe(true);
      expect(data.message).toContain('API key test failed');
    });
  });
});