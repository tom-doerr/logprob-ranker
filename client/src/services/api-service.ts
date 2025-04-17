/**
 * API service
 * Centralized API communication service with error handling and retries
 */

import { APP_CONFIG } from '../config/app-config';
import { getApiKey } from '../utils/pkce';
import { ChatMessage } from '../hooks/use-chat-service';

// Base URL for API requests
const API_BASE_URL = APP_CONFIG.API.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';

// Request timeout in milliseconds
const REQUEST_TIMEOUT = 30000;

// Maximum retry attempts
const MAX_RETRIES = 2;

// Retry delay in milliseconds
const RETRY_DELAY = 1000;

// Chat completion options interface
export interface ChatCompletionOptions {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  stream?: boolean;
  signal?: AbortSignal;
}

// API service class
class ApiService {
  /**
   * Create a chat completion
   */
  async createChatCompletion(options: ChatCompletionOptions) {
    const {
      model,
      messages,
      temperature = 0.7,
      top_p = 0.9,
      max_tokens = 1000,
      stream = false,
      signal
    } = options;
    
    const apiKey = getApiKey();
    
    if (!apiKey) {
      throw new Error('API key is required but not provided');
    }
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': window.location.origin,
      'X-Title': APP_CONFIG.APP.NAME
    };
    
    const body = JSON.stringify({
      model,
      messages,
      temperature,
      top_p,
      max_tokens,
      stream
    });
    
    return this.apiRequest('/chat/completions', {
      method: 'POST',
      headers,
      body,
      signal,
      retries: stream ? 0 : MAX_RETRIES // No retries for streaming
    });
  }
  
  /**
   * Get available models
   */
  async getModels() {
    const apiKey = getApiKey();
    
    if (!apiKey) {
      throw new Error('API key is required but not provided');
    }
    
    const headers = {
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': window.location.origin,
      'X-Title': APP_CONFIG.APP.NAME
    };
    
    return this.apiRequest('/models', {
      method: 'GET',
      headers
    });
  }
  
  /**
   * Make a request to the API with retries and error handling
   */
  async apiRequest(endpoint: string, options: {
    method: string;
    headers: HeadersInit;
    body?: string;
    signal?: AbortSignal;
    retries?: number;
  }) {
    const {
      method,
      headers,
      body,
      signal,
      retries = MAX_RETRIES
    } = options;
    
    const url = `${API_BASE_URL}${endpoint}`;
    
    let lastError: Error | null = null;
    
    // Try the request with retries
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // Set up timeout controller if no abort signal provided
        const timeoutController = !signal ? new AbortController() : null;
        const timeoutSignal = timeoutController ? timeoutController.signal : undefined;
        
        // Set up timeout if not using an external abort signal
        let timeoutId: number | null = null;
        if (timeoutController) {
          timeoutId = window.setTimeout(() => {
            timeoutController.abort();
          }, REQUEST_TIMEOUT);
        }
        
        // Make the actual fetch request
        const fetchOptions: RequestInit = {
          method,
          headers,
          body,
          signal: signal || timeoutSignal
        };
        
        const response = await fetch(url, fetchOptions);
        
        // Clear timeout if we got a response
        if (timeoutId !== null) {
          clearTimeout(timeoutId);
        }
        
        // Check if request was aborted
        if (signal?.aborted || timeoutSignal?.aborted) {
          throw new Error('Request aborted');
        }
        
        // Handle error status codes
        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('Unauthorized: Invalid or expired API key');
          } else if (response.status === 403) {
            throw new Error('Forbidden: You do not have access to this resource');
          } else if (response.status === 429) {
            throw new Error('Rate limit exceeded. Please try again later');
          } else {
            const errorText = await response.text();
            throw new Error(`API error (${response.status}): ${errorText}`);
          }
        }
        
        // Parse and return JSON response
        const data = await response.json();
        return data;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Don't retry if aborted or last attempt
        if (signal?.aborted || attempt >= retries) {
          break;
        }
        
        // If rate limited or server error, wait before retrying
        if (
          lastError.message.includes('429') || 
          lastError.message.includes('500') ||
          lastError.message.includes('502') ||
          lastError.message.includes('503')
        ) {
          console.warn(`API request failed (attempt ${attempt + 1}/${retries + 1}), retrying in ${RETRY_DELAY}ms:`, lastError.message);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (attempt + 1)));
        } else {
          // If it's another kind of error, don't retry
          break;
        }
      }
    }
    
    // If we got here, all attempts failed
    throw lastError || new Error('API request failed with unknown error');
  }
}

// Create and export singleton instance
export const apiService = new ApiService();
export default apiService;