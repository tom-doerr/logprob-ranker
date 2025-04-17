/**
 * Mock Server Tests
 * Sets up and tests mock server handlers for client testing
 */

import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';

// Mock server handlers
const mockServerHandlers = [
  // Chat Completions API
  async (req, res, ctx) => {
    if (req.url.pathname === '/api/v1/chat/completions' && req.method === 'POST') {
      const body = await req.json();
      
      // Check for auth headers
      const authHeader = req.headers.get('Authorization');
      const apiKeyHeader = req.headers.get('x-api-key');
      
      // Simulate auth failure
      if (!authHeader && !apiKeyHeader) {
        return res(
          ctx.status(401),
          ctx.json({
            error: {
              message: 'Authentication required'
            }
          })
        );
      }
      
      // Mock successful response
      return res(
        ctx.status(200),
        ctx.json({
          id: 'mock-completion-id',
          object: 'chat.completion',
          created: Date.now(),
          model: body.model || 'default-model',
          choices: [
            {
              index: 0,
              message: {
                role: 'assistant',
                content: `Mock response for: ${body.messages[body.messages.length - 1].content}`
              },
              finish_reason: 'stop'
            }
          ]
        })
      );
    }
    
    // Pass through if not handled
    return false;
  },
  
  // Models API
  async (req, res, ctx) => {
    if (req.url.pathname === '/api/v1/models' && req.method === 'GET') {
      // Check for auth headers
      const authHeader = req.headers.get('Authorization');
      const apiKeyHeader = req.headers.get('x-api-key');
      
      // Simulate auth failure
      if (!authHeader && !apiKeyHeader) {
        return res(
          ctx.status(401),
          ctx.json({
            error: {
              message: 'Authentication required'
            }
          })
        );
      }
      
      // Mock successful response
      return res(
        ctx.status(200),
        ctx.json({
          data: [
            { id: 'model-1', name: 'Model 1' },
            { id: 'model-2', name: 'Model 2' },
            { id: 'model-3', name: 'Model 3' }
          ]
        })
      );
    }
    
    // Pass through if not handled
    return false;
  },
  
  // Status API
  async (req, res, ctx) => {
    if (req.url.pathname === '/api/v1/status' && req.method === 'GET') {
      // Mock successful response
      return res(
        ctx.status(200),
        ctx.json({
          status: 'success',
          keyExists: true,
          keyMasked: 'sk-or-****-****-****'
        })
      );
    }
    
    // Pass through if not handled
    return false;
  }
];

// Mock fetch implementation to use our handlers
const originalFetch = global.fetch;
global.fetch = vi.fn(async (url, options = {}) => {
  // Convert URL to string if it's a URL object
  const urlString = url instanceof URL ? url.toString() : String(url);
  
  // Parse URL
  const parsedUrl = new URL(urlString, 'http://localhost');
  
  // Create request object
  const req = {
    url: parsedUrl,
    method: options.method || 'GET',
    headers: new Headers(options.headers || {}),
    json: async () => options.body ? JSON.parse(options.body) : undefined
  };
  
  // Create response context
  const ctx = {
    status: (code) => ({ code }),
    json: (body) => ({ body }),
    text: (text) => ({ text })
  };
  
  // Create response builder
  const res = (statusObj, bodyObj) => {
    return {
      ok: statusObj.code >= 200 && statusObj.code < 300,
      status: statusObj.code,
      json: async () => bodyObj.body,
      text: async () => bodyObj.text || JSON.stringify(bodyObj.body)
    };
  };
  
  // Try each handler
  for (const handler of mockServerHandlers) {
    const result = await handler(req, res, ctx);
    if (result !== false) {
      return result;
    }
  }
  
  // Default 404 response
  return res(
    ctx.status(404),
    ctx.json({
      error: {
        message: 'Not found'
      }
    })
  );
});

describe('Mock Server', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });
  
  afterAll(() => {
    global.fetch = originalFetch;
  });
  
  it('should handle chat completions API', async () => {
    const response = await fetch('/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({
        model: 'test-model',
        messages: [{ role: 'user', content: 'Hello, mock server!' }]
      })
    });
    
    expect(response.ok).toBe(true);
    
    const data = await response.json();
    expect(data.choices[0].message.content).toContain('Hello, mock server!');
    expect(data.model).toBe('test-model');
  });
  
  it('should handle models API', async () => {
    const response = await fetch('/api/v1/models', {
      headers: {
        'x-api-key': 'test-api-key'
      }
    });
    
    expect(response.ok).toBe(true);
    
    const data = await response.json();
    expect(data.data).toBeInstanceOf(Array);
    expect(data.data.length).toBeGreaterThan(0);
  });
  
  it('should handle status API', async () => {
    const response = await fetch('/api/v1/status');
    
    expect(response.ok).toBe(true);
    
    const data = await response.json();
    expect(data.status).toBe('success');
    expect(data.keyExists).toBe(true);
  });
  
  it('should require authentication for protected endpoints', async () => {
    // Chat completions without auth
    const chatResponse = await fetch('/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'test-model',
        messages: [{ role: 'user', content: 'Hello' }]
      })
    });
    
    expect(chatResponse.ok).toBe(false);
    expect(chatResponse.status).toBe(401);
    
    // Models without auth
    const modelsResponse = await fetch('/api/v1/models');
    
    expect(modelsResponse.ok).toBe(false);
    expect(modelsResponse.status).toBe(401);
  });
  
  it('should handle unknown endpoints with 404', async () => {
    const response = await fetch('/api/v1/unknown-endpoint');
    
    expect(response.ok).toBe(false);
    expect(response.status).toBe(404);
  });
});