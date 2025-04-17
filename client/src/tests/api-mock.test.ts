/**
 * Mock API Services Test
 * Tests for API service with mocked fetch responses
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock API responses
const mockResponses = {
  chat: {
    success: {
      id: 'mock-chat-id',
      object: 'chat.completion',
      created: Date.now(),
      model: 'test-model',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: 'This is a mock response'
          },
          finish_reason: 'stop'
        }
      ]
    },
    error: {
      error: {
        message: 'Invalid API key',
        type: 'authentication_error',
        code: 401
      }
    }
  },
  models: {
    success: {
      data: [
        { id: 'model-1', name: 'Model 1' },
        { id: 'model-2', name: 'Model 2' }
      ]
    },
    error: {
      error: {
        message: 'Server error',
        type: 'server_error',
        code: 500
      }
    }
  }
};

// Mock API service
const createApiService = () => {
  // Create a simplified API service
  const callApi = async (endpoint, options = {}) => {
    const url = `https://api.test.com${endpoint}`;
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'API call failed');
    }
    
    return response.json();
  };
  
  // Chat completions API
  const createChatCompletion = async (params) => {
    return callApi('/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${params.apiKey || 'default-key'}`
      },
      body: JSON.stringify({
        model: params.model || 'default-model',
        messages: params.messages || [],
        temperature: params.temperature || 0.7,
        max_tokens: params.maxTokens || 1000
      })
    });
  };
  
  // Get models API
  const getModels = async (apiKey) => {
    return callApi('/models', {
      headers: {
        'Authorization': `Bearer ${apiKey || 'default-key'}`
      }
    });
  };
  
  return {
    createChatCompletion,
    getModels
  };
};

describe('API Service', () => {
  let apiService;
  
  beforeEach(() => {
    apiService = createApiService();
    
    // Reset fetch mock
    vi.restoreAllMocks();
  });
  
  describe('Chat Completions', () => {
    it('should call chat completions API and return response', async () => {
      // Mock fetch to return success response
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponses.chat.success)
      } as Response);
      
      // Call API
      const result = await apiService.createChatCompletion({
        apiKey: 'test-key',
        model: 'test-model',
        messages: [
          { role: 'user', content: 'Hello' }
        ]
      });
      
      // Verify response
      expect(result).toEqual(mockResponses.chat.success);
      expect(result.choices[0].message.content).toBe('This is a mock response');
      
      // Verify fetch was called correctly
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.test.com/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-key'
          }),
          body: expect.stringContaining('test-model')
        })
      );
    });
    
    it('should handle API errors properly', async () => {
      // Mock fetch to return error response
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve(mockResponses.chat.error)
      } as Response);
      
      // Call API (should throw)
      await expect(apiService.createChatCompletion({
        apiKey: 'invalid-key',
        model: 'test-model',
        messages: [
          { role: 'user', content: 'Hello' }
        ]
      })).rejects.toThrow('Invalid API key');
      
      // Verify fetch was called
      expect(global.fetch).toHaveBeenCalled();
    });
  });
  
  describe('Models API', () => {
    it('should fetch available models', async () => {
      // Mock fetch to return success response
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponses.models.success)
      } as Response);
      
      // Call API
      const result = await apiService.getModels('test-key');
      
      // Verify response
      expect(result).toEqual(mockResponses.models.success);
      expect(result.data.length).toBe(2);
      
      // Verify fetch was called correctly
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.test.com/models',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-key'
          })
        })
      );
    });
    
    it('should handle models API errors', async () => {
      // Mock fetch to return error response
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve(mockResponses.models.error)
      } as Response);
      
      // Call API (should throw)
      await expect(apiService.getModels('test-key')).rejects.toThrow('Server error');
      
      // Verify fetch was called
      expect(global.fetch).toHaveBeenCalled();
    });
  });
  
  describe('API Integration', () => {
    it('should chain API calls correctly', async () => {
      // Mock fetch to return models success response for first call
      vi.spyOn(global, 'fetch')
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponses.models.success)
        } as Response)
        // Then return chat success response for second call
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponses.chat.success)
        } as Response);
      
      // First call to get models
      const modelsResult = await apiService.getModels('test-key');
      
      // Verify models response
      expect(modelsResult.data.length).toBe(2);
      
      // Use first model ID for chat completion
      const modelId = modelsResult.data[0].id;
      
      // Second call to create chat completion
      const chatResult = await apiService.createChatCompletion({
        apiKey: 'test-key',
        model: modelId,
        messages: [
          { role: 'user', content: 'Hello' }
        ]
      });
      
      // Verify chat response
      expect(chatResult.choices[0].message.content).toBe('This is a mock response');
      
      // Verify fetch was called twice
      expect(global.fetch).toHaveBeenCalledTimes(2);
      
      // Verify second call used the model ID from first call
      expect(global.fetch).toHaveBeenLastCalledWith(
        'https://api.test.com/chat/completions',
        expect.objectContaining({
          body: expect.stringContaining(modelId)
        })
      );
    });
  });
});