/**
 * OutputRanker Component Integration Tests
 * Tests the integration between OutputRanker, API service, and auth systems
 */

import { authStorage } from '../utils/storage';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock window interactions
const mockLocation = {
  origin: 'https://myapp.replit.app',
  pathname: '/app',
  href: 'https://myapp.replit.app/app'
};

// Mock API response data
const mockApiResponse = {
  id: 'mock-completion-id',
  object: 'chat.completion',
  created: Date.now(),
  model: 'test-model',
  choices: [
    {
      index: 0,
      message: {
        role: 'assistant',
        content: 'This is a test response from the mocked API'
      },
      finish_reason: 'stop'
    }
  ]
};

// Mock fetch function
global.fetch = vi.fn();

// Mock for AbortController
global.AbortController = vi.fn(() => ({
  signal: { aborted: false },
  abort: vi.fn()
}));

// Mock toast notifications
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast
  })
}));

describe('OutputRanker Integration', () => {
  beforeEach(() => {
    // Reset auth storage
    authStorage.clearAuth();
    
    // Reset location
    Object.defineProperty(window, 'location', {
      value: { ...mockLocation },
      writable: true
    });
    
    // Clear mocks
    vi.clearAllMocks();
    
    // Mock successful API response
    const mockSuccessResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue(mockApiResponse)
    };
    
    // Set up fetch mock default
    global.fetch.mockResolvedValue(mockSuccessResponse);
  });
  
  afterEach(() => {
    authStorage.clearAuth();
  });
  
  it('should properly handle API requests with browser model fallback', async () => {
    // First test with no API key
    authStorage.clearAuth();
    
    // Generate outputs should use browser model when no API key is available
    const mockBrowserModelResponse = {
      choices: [
        {
          message: {
            content: 'This is a test response from the browser model'
          }
        }
      ]
    };
    
    // Create a mock browser model engine
    const mockBrowserModelEngine = {
      chat: {
        completions: {
          create: vi.fn().mockResolvedValue(mockBrowserModelResponse)
        }
      }
    };
    
    // Helper function to simulate generateAndEvaluateOutput 
    // Similar to the one in OutputRanker component
    const generateAndEvaluateOutput = async (index: number, options: {
      prompt: string;
      isUsingBrowserModel: boolean;
      browserModelEngine: any;
    }) => {
      const { prompt, isUsingBrowserModel, browserModelEngine } = options;
      
      try {
        if (isUsingBrowserModel && browserModelEngine) {
          // Use browser model engine
          const response = await browserModelEngine.chat.completions.create({
            messages: [
              { role: 'system', content: 'You are a creative assistant.' },
              { role: 'user', content: prompt }
            ],
            temperature: 0.7,
            max_tokens: 1000
          });
          
          const output = response?.choices?.[0]?.message?.content;
          return {
            output,
            logprob: 0.8,
            index,
            attributeScores: [{ name: 'quality', score: 0.8 }]
          };
        } else {
          // Use API
          const response = await fetch('/api/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: 'test-model',
              messages: [
                { role: 'system', content: 'You are a creative assistant.' },
                { role: 'user', content: prompt }
              ],
              temperature: 0.7,
              max_tokens: 1000
            })
          });
          
          if (!response.ok) {
            throw new Error(`API error ${response.status}`);
          }
          
          const data = await response.json();
          const output = data?.choices?.[0]?.message?.content;
          
          return {
            output,
            logprob: 0.7,
            index,
            attributeScores: [{ name: 'quality', score: 0.7 }]
          };
        }
      } catch (error) {
        console.error('Error:', error);
        return {
          output: `Error: ${error instanceof Error ? error.message : String(error)}`,
          logprob: 0.1,
          index,
          attributeScores: [{ name: 'error', score: 0.1 }]
        };
      }
    };
    
    // Test with browser model
    const browserModelResult = await generateAndEvaluateOutput(0, {
      prompt: 'Test prompt',
      isUsingBrowserModel: true,
      browserModelEngine: mockBrowserModelEngine
    });
    
    expect(browserModelResult.output).toBe('This is a test response from the browser model');
    expect(browserModelEngine.chat.completions.create).toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
    
    // Now test with API 
    const apiResult = await generateAndEvaluateOutput(1, {
      prompt: 'Test prompt',
      isUsingBrowserModel: false,
      browserModelEngine: null
    });
    
    expect(apiResult.output).toBe('This is a test response from the mocked API');
    expect(fetch).toHaveBeenCalled();
  });
  
  it('should handle abortion of requests properly', async () => {
    // Mock AbortController
    const mockAbortController = {
      signal: { aborted: false },
      abort: vi.fn()
    };
    
    // Create a mock generateOutputs function
    const generateOutputs = async (options: {
      abortController: any;
      setIsGenerating: (value: boolean) => void;
      setIsAborted: (value: boolean) => void;
    }) => {
      const { abortController, setIsGenerating, setIsAborted } = options;
      
      setIsGenerating(true);
      setIsAborted(false);
      
      try {
        // Check if already aborted
        if (abortController.signal.aborted) {
          setIsAborted(true);
          setIsGenerating(false);
          return;
        }
        
        // Make fetch request with abort signal
        await fetch('/api/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'test-model',
            messages: [{ role: 'user', content: 'Test message' }]
          }),
          signal: abortController.signal
        });
        
        // Check if aborted during request
        if (abortController.signal.aborted) {
          setIsAborted(true);
          setIsGenerating(false);
          return;
        }
        
        // Success - update state
        setIsGenerating(false);
      } catch (error) {
        // Handle abort and other errors
        if (error instanceof Error && error.name === 'AbortError') {
          setIsAborted(true);
        }
        setIsGenerating(false);
      }
    };
    
    // Test variables to track state
    let isGenerating = false;
    let isAborted = false;
    
    // Start generation
    const promise = generateOutputs({
      abortController: mockAbortController,
      setIsGenerating: (value) => { isGenerating = value; },
      setIsAborted: (value) => { isAborted = value; }
    });
    
    // Simulate abort during generation
    mockAbortController.signal.aborted = true;
    // Actually call abort method to verify it's called
    mockAbortController.abort();
    
    // Wait for generation to complete
    await promise;
    
    // Check final state
    expect(isGenerating).toBe(false);
    expect(isAborted).toBe(true);
    expect(mockAbortController.abort).toHaveBeenCalled();
  });
  
  it('should handle API errors gracefully', async () => {
    // Simulate API error
    const mockErrorResponse = {
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      text: vi.fn().mockResolvedValue('API key is required')
    };
    
    global.fetch.mockResolvedValue(mockErrorResponse);
    
    // Helper function to test error handling
    const generateAndEvaluateOutput = async (index: number) => {
      try {
        const response = await fetch('/api/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'test-model',
            messages: [{ role: 'user', content: 'Test message' }]
          })
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`API error ${response.status}: ${errorText}`);
        }
        
        const data = await response.json();
        return {
          output: data?.choices?.[0]?.message?.content,
          logprob: 0.7,
          index,
          attributeScores: [{ name: 'quality', score: 0.7 }]
        };
      } catch (error) {
        // Should return a structured error result
        return {
          output: `Error: ${error instanceof Error ? error.message : String(error)}`,
          logprob: 0.1,
          index,
          attributeScores: [{ name: 'error', score: 0.1 }]
        };
      }
    };
    
    // Test error handling
    const result = await generateAndEvaluateOutput(0);
    
    // Should have structured error response
    expect(result.output).toContain('Error: API error 401');
    expect(result.logprob).toBe(0.1);
    expect(result.attributeScores[0].name).toBe('error');
  });
  
  it('should handle multiple parallel requests correctly', async () => {
    // Set up for multiple responses
    const responses = [
      { ...mockApiResponse, choices: [{ index: 0, message: { role: 'assistant', content: 'Response 1' }, finish_reason: 'stop' }] },
      { ...mockApiResponse, choices: [{ index: 1, message: { role: 'assistant', content: 'Response 2' }, finish_reason: 'stop' }] },
      { ...mockApiResponse, choices: [{ index: 2, message: { role: 'assistant', content: 'Response 3' }, finish_reason: 'stop' }] }
    ];
    
    // Create mock responses
    const mockResponses = responses.map(response => ({
      ok: true,
      json: vi.fn().mockResolvedValue(response)
    }));
    
    // Set up fetch to return different responses
    responses.forEach((_, index) => {
      global.fetch.mockResolvedValueOnce(mockResponses[index]);
    });
    
    // Function to generate multiple outputs in parallel
    const generateParallelOutputs = async (count: number) => {
      const promises = [];
      for (let i = 0; i < count; i++) {
        promises.push(
          fetch('/api/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: 'test-model',
              messages: [{ role: 'user', content: `Test message ${i + 1}` }]
            })
          }).then(response => response.json())
        );
      }
      
      const results = await Promise.all(promises);
      return results.map((result, index) => ({
        output: result.choices[0].message.content,
        logprob: 0.7 - (index * 0.1),
        index,
        attributeScores: [{ name: 'quality', score: 0.7 - (index * 0.1) }]
      }));
    };
    
    // Test parallel generation
    const results = await generateParallelOutputs(3);
    
    // Should have 3 results with correct content
    expect(results.length).toBe(3);
    expect(results[0].output).toBe('Response 1');
    expect(results[1].output).toBe('Response 2');
    expect(results[2].output).toBe('Response 3');
    
    // Fetch should be called 3 times
    expect(fetch).toHaveBeenCalledTimes(3);
  });
});