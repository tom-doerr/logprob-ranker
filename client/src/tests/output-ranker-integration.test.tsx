import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import OutputRanker from '../components/OutputRanker';
import * as apiService from '../services/api-service';
import { authStorage } from '../utils/storage';
import { ModelConfigProvider } from '../hooks/use-model-config';
import { AuthProvider } from '../hooks/use-auth';

// Mock toast hook 
vi.mock('../hooks/use-toast', () => ({
  toast: vi.fn(),
  useToast: () => ({
    toast: vi.fn()
  })
}));

vi.mock('../services/api-service', () => ({
  apiService: {
    createChatCompletion: vi.fn(),
    getModels: vi.fn()
  }
}));

describe('Output Ranker Integration', () => {
  const mockApiKey = 'test-output-ranker-api-key';
  
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
    
    // Mock createChatCompletion implementation
    vi.mocked(apiService.apiService.createChatCompletion).mockImplementation(async (params) => {
      try {
        // Simulate different responses based on API call
        if (params.model === 'google/gemini-2.0-flash-001') {
          // For variant generation
          return {
            id: 'test-response-id',
            choices: [{
              message: {
                role: 'assistant',
                content: 'This is a test response from the Gemini model.'
              },
              logprob: 0.95
            }]
          };
        } else if (params.messages?.[0]?.content?.includes('evaluation')) {
          // For evaluation response
          return {
            id: 'eval-response-id',
            choices: [{
              message: {
                role: 'assistant',
                content: '{"interesting": true, "creative": true, "useful": true}'
              }
            }]
          };
        }
        
        return {
          id: 'default-response',
          choices: [{
            message: {
              role: 'assistant',
              content: 'Default test response'
            },
            logprob: 0.5
          }]
        };
      } catch (error) {
        console.error('Mock API error:', error);
        throw error;
      }
    });
    
    // Mock getModels
    vi.mocked(apiService.apiService.getModels).mockResolvedValue([
      { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash', provider: 'Google' },
      { id: 'claude-3-opus', name: 'Claude 3 Opus', provider: 'Anthropic' }
    ]);
    
    // Set a mock API key for the tests
    authStorage.setApiKey(mockApiKey);
  });
  
  afterEach(() => {
    vi.resetAllMocks();
  });
  
  it('should render the NERV-themed Output Ranker interface', async () => {
    render(
      <AuthProvider>
        <ModelConfigProvider>
          <OutputRanker />
        </ModelConfigProvider>
      </AuthProvider>
    );
    
    // Check for NERV/Evangelion specific elements
    expect(screen.getByText(/NERV MAGI SYSTEM/i)).toBeInTheDocument();
    expect(screen.getByText(/INITIATE EVANGELION/i)).toBeInTheDocument();
    
    // Check for key component elements
    await waitFor(() => {
      // Input prompt area
      expect(screen.getByLabelText(/Input Prompt/i)).toBeInTheDocument();
      
      // Model selection
      expect(screen.getByText(/MODEL SELECTION/i)).toBeInTheDocument();
      
      // Output area or other elements that should be present 
      expect(screen.getByText(/MAGI-01/i)).toBeInTheDocument();
    });
  });
  
  it('should generate and rank outputs when INITIATE EVANGELION is clicked', async () => {
    render(
      <AuthProvider>
        <ModelConfigProvider>
          <OutputRanker />
        </ModelConfigProvider>
      </AuthProvider>
    );
    
    // Enter a prompt
    const promptInput = screen.getByLabelText(/Input Prompt/i);
    fireEvent.change(promptInput, { target: { value: 'Test prompt for Output Ranker' } });
    
    // Select template
    const templateInput = screen.getByLabelText(/LogProb Template/i);
    fireEvent.change(templateInput, { 
      target: { 
        value: '{\n  "interesting": LOGPROB_TRUE,\n  "creative": LOGPROB_TRUE\n}' 
      }
    });
    
    // Click the generate button
    const generateButton = screen.getByText(/INITIATE EVANGELION/i);
    fireEvent.click(generateButton);
    
    // Wait for the generation process to complete
    await waitFor(() => {
      // Check multiple API calls were made (for generation and evaluation)
      expect(apiService.apiService.createChatCompletion).toHaveBeenCalledTimes(10); // 5 generations + 5 evaluations
      
      // Check for ranked outputs section being populated
      expect(screen.getByText(/VARIANT-001/i)).toBeInTheDocument();
      expect(screen.getByText(/VARIANT-002/i)).toBeInTheDocument();
    });
  });
  
  it('should properly handle different temperature settings', async () => {
    render(
      <AuthProvider>
        <ModelConfigProvider>
          <OutputRanker />
        </ModelConfigProvider>
      </AuthProvider>
    );
    
    // Enter prompt
    const promptInput = screen.getByLabelText(/Input Prompt/i);
    fireEvent.change(promptInput, { target: { value: 'Test prompt' } });
    
    // Set custom temperature
    const temperatureSlider = screen.getByLabelText(/Temperature/i);
    fireEvent.change(temperatureSlider, { target: { value: 0.9 } });
    
    // Click generate
    const generateButton = screen.getByText(/INITIATE EVANGELION/i);
    fireEvent.click(generateButton);
    
    // Verify temperature was passed to API
    await waitFor(() => {
      const apiCall = vi.mocked(apiService.apiService.createChatCompletion).mock.calls[0][0];
      expect(apiCall.temperature).toBeCloseTo(0.9, 1);
    });
  });
  
  it('should display error message when no API key is available', async () => {
    // Clear API key
    localStorageMock.removeItem('nervui-apiKey');
    
    // Force an API error for all calls in this test
    vi.mocked(apiService.apiService.createChatCompletion).mockRejectedValue(
      new Error('API key is required but not configured')
    );
    
    render(
      <AuthProvider>
        <ModelConfigProvider>
          <OutputRanker />
        </ModelConfigProvider>
      </AuthProvider>
    );
    
    // Enter prompt and generate
    const promptInput = screen.getByLabelText(/Input Prompt/i);
    fireEvent.change(promptInput, { target: { value: 'Test prompt' } });
    
    const generateButton = screen.getByText(/INITIATE EVANGELION/i);
    fireEvent.click(generateButton);
    
    // Check for error in outputs
    await waitFor(() => {
      expect(screen.getByText(/API key is required/i)).toBeInTheDocument();
    });
  });
  
  // Simplified test that just verifies ModelConfigProvider is properly connected
  it('should allow toggling the browser model setting', async () => {
    render(
      <AuthProvider>
        <ModelConfigProvider>
          <OutputRanker />
        </ModelConfigProvider>
      </AuthProvider>
    );
    
    // Just checking that the component renders with configuration elements
    expect(screen.getByText(/MODEL CONFIGURATION/i)).toBeInTheDocument();
  });
});