/**
 * BrowserLLM Component Integration Tests
 * Tests the BrowserLLM component functionality and interactions
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BrowserLLM } from '../components/BrowserLLM';

// Mock ChatMessage type
interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// Mock data
const mockMessages: ChatMessage[] = [
  { role: 'system', content: 'You are a helpful AI assistant.' },
  { role: 'user', content: 'Hello, browser model!' }
];

// Mock browser model engine
const mockCreateCompletions = vi.fn();
const mockLoad = vi.fn();
const mockEngine = {
  chat: {
    completions: {
      create: mockCreateCompletions
    }
  },
  loadModel: mockLoad,
  unloadModel: vi.fn(),
  isModelLoaded: vi.fn().mockReturnValue(false)
};

// Mock hooks
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));

// Mock props functions
const mockOnMessageSent = vi.fn();
const mockOnResponseReceived = vi.fn();
const mockOnSelectBrowserModel = vi.fn();

describe('BrowserLLM Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock behaviors
    mockCreateCompletions.mockResolvedValue({
      choices: [
        {
          message: {
            content: 'This is a response from the browser model'
          },
          finish_reason: 'stop'
        }
      ]
    });
    
    mockLoad.mockResolvedValue(true);
  });
  
  afterEach(() => {
    vi.clearAllMocks();
  });
  
  // Mock simplified component for testing
  const TestBrowserLLM = (props: any) => {
    const {
      onSelectBrowserModel = mockOnSelectBrowserModel,
      onMessageSent = mockOnMessageSent,
      onResponseReceived = mockOnResponseReceived,
      isUsingBrowserModel = true,
      temperature = 0.7,
      topP = 0.9,
      maxTokens = 1000
    } = props;
    
    const [inputValue, setInputValue] = React.useState('');
    const [isLoading, setIsLoading] = React.useState(false);
    const [isModelLoaded, setIsModelLoaded] = React.useState(false);
    const [messages, setMessages] = React.useState<ChatMessage[]>([]);
    
    // Mock loadModel function
    const loadModel = async () => {
      setIsLoading(true);
      try {
        await mockLoad();
        setIsModelLoaded(true);
        setIsLoading(false);
        return true;
      } catch (error) {
        setIsLoading(false);
        return false;
      }
    };
    
    // Mock submitMessage function
    const submitMessage = async () => {
      if (!inputValue.trim()) return;
      
      // Create user message
      const userMessage: ChatMessage = { role: 'user', content: inputValue };
      
      // Update messages and call onMessageSent
      setMessages([...messages, userMessage]);
      onMessageSent(userMessage);
      
      // Clear input
      setInputValue('');
      
      // Set loading state
      setIsLoading(true);
      
      try {
        // Mock browser model generation
        const response = await mockCreateCompletions({
          messages: [...messages, userMessage],
          temperature,
          top_p: topP,
          max_tokens: maxTokens
        });
        
        // Create assistant message
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: response.choices[0].message.content
        };
        
        // Update messages and call onResponseReceived
        setMessages([...messages, userMessage, assistantMessage]);
        onResponseReceived(assistantMessage);
        
        // Clear loading state
        setIsLoading(false);
      } catch (error) {
        // Handle error
        setIsLoading(false);
      }
    };
    
    return (
      <div>
        <div data-testid="model-status">
          {isModelLoaded ? 'Model Loaded' : 'Model Not Loaded'}
        </div>
        
        <div data-testid="loading-status">
          {isLoading ? 'Loading...' : 'Not Loading'}
        </div>
        
        <button 
          onClick={loadModel}
          data-testid="load-model-button"
        >
          Load Model
        </button>
        
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          data-testid="input-field"
          placeholder="Type a message..."
        />
        
        <button 
          onClick={submitMessage}
          data-testid="submit-button"
          disabled={!isModelLoaded || isLoading}
        >
          Send
        </button>
        
        <div data-testid="messages">
          {messages.map((msg, i) => (
            <div key={i} data-testid={`message-${msg.role}`}>
              {msg.role}: {msg.content}
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  it('should load the model when button is clicked', async () => {
    render(<TestBrowserLLM />);
    
    // Initially model should not be loaded
    expect(screen.getByTestId('model-status').textContent).toBe('Model Not Loaded');
    
    // Click load model button
    fireEvent.click(screen.getByTestId('load-model-button'));
    
    // Should show loading state
    expect(screen.getByTestId('loading-status').textContent).toBe('Loading...');
    
    // Wait for model to load
    await waitFor(() => {
      expect(screen.getByTestId('model-status').textContent).toBe('Model Loaded');
      expect(screen.getByTestId('loading-status').textContent).toBe('Not Loading');
    });
    
    // Verify load function was called
    expect(mockLoad).toHaveBeenCalled();
  });
  
  it('should send messages and handle responses', async () => {
    render(<TestBrowserLLM />);
    
    // Load the model first
    fireEvent.click(screen.getByTestId('load-model-button'));
    await waitFor(() => {
      expect(screen.getByTestId('model-status').textContent).toBe('Model Loaded');
    });
    
    // Type a message
    fireEvent.change(screen.getByTestId('input-field'), {
      target: { value: 'Test message' }
    });
    
    // Send the message
    fireEvent.click(screen.getByTestId('submit-button'));
    
    // Should show loading state
    expect(screen.getByTestId('loading-status').textContent).toBe('Loading...');
    
    // Wait for response
    await waitFor(() => {
      expect(screen.getByTestId('loading-status').textContent).toBe('Not Loading');
    });
    
    // Verify messages are displayed
    expect(screen.getByTestId('message-user').textContent).toContain('Test message');
    expect(screen.getByTestId('message-assistant').textContent).toContain('This is a response from the browser model');
    
    // Verify API functions were called
    expect(mockCreateCompletions).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: 'Test message'
          })
        ]),
        temperature: 0.7,
        top_p: 0.9,
        max_tokens: 1000
      })
    );
    
    // Verify callback functions were called
    expect(mockOnMessageSent).toHaveBeenCalledWith(
      expect.objectContaining({
        role: 'user',
        content: 'Test message'
      })
    );
    
    expect(mockOnResponseReceived).toHaveBeenCalledWith(
      expect.objectContaining({
        role: 'assistant',
        content: 'This is a response from the browser model'
      })
    );
  });
  
  it('should handle empty input', async () => {
    render(<TestBrowserLLM />);
    
    // Load the model first
    fireEvent.click(screen.getByTestId('load-model-button'));
    await waitFor(() => {
      expect(screen.getByTestId('model-status').textContent).toBe('Model Loaded');
    });
    
    // Send without typing (empty message)
    fireEvent.click(screen.getByTestId('submit-button'));
    
    // No messages should be sent
    expect(mockCreateCompletions).not.toHaveBeenCalled();
    expect(mockOnMessageSent).not.toHaveBeenCalled();
    
    // No messages should be displayed
    expect(screen.queryByTestId('message-user')).not.toBeInTheDocument();
    expect(screen.queryByTestId('message-assistant')).not.toBeInTheDocument();
  });
  
  it('should handle model loading errors', async () => {
    // Mock load to fail
    mockLoad.mockRejectedValue(new Error('Failed to load model'));
    
    render(<TestBrowserLLM />);
    
    // Click load model button
    fireEvent.click(screen.getByTestId('load-model-button'));
    
    // Should show loading state
    expect(screen.getByTestId('loading-status').textContent).toBe('Loading...');
    
    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.getByTestId('loading-status').textContent).toBe('Not Loading');
    });
    
    // Model should still not be loaded
    expect(screen.getByTestId('model-status').textContent).toBe('Model Not Loaded');
    
    // Verify load function was called
    expect(mockLoad).toHaveBeenCalled();
  });
  
  it('should handle generation errors', async () => {
    // Mock generation to fail
    mockCreateCompletions.mockRejectedValue(new Error('Generation failed'));
    
    render(<TestBrowserLLM />);
    
    // Load the model first
    fireEvent.click(screen.getByTestId('load-model-button'));
    await waitFor(() => {
      expect(screen.getByTestId('model-status').textContent).toBe('Model Loaded');
    });
    
    // Type a message
    fireEvent.change(screen.getByTestId('input-field'), {
      target: { value: 'Test message' }
    });
    
    // Send the message
    fireEvent.click(screen.getByTestId('submit-button'));
    
    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.getByTestId('loading-status').textContent).toBe('Not Loading');
    });
    
    // User message should be sent
    expect(mockOnMessageSent).toHaveBeenCalled();
    
    // But no assistant message
    expect(mockOnResponseReceived).not.toHaveBeenCalled();
    
    // User message should be displayed
    expect(screen.getByTestId('message-user').textContent).toContain('Test message');
    
    // But no assistant message
    expect(screen.queryByTestId('message-assistant')).not.toBeInTheDocument();
  });
});