/**
 * API Service
 * Simplified API client for making requests with consistent error handling
 */

import { authStorage } from "../utils/storage";
import { 
  ChatCompletionRequest, 
  ChatCompletionResponse,
  getChatCompletionsUrl
} from "../lib/openrouter";

class ApiService {
  /**
   * Create a chat completion using the OpenRouter API
   */
  async createChatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    // Get the API key from storage
    const apiKey = authStorage.getApiKey();
    
    if (!apiKey || apiKey === 'browser-llm') {
      throw new Error('No API key found. Please authenticate first.');
    }
    
    try {
      const response = await fetch(getChatCompletionsUrl(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': window.location.origin,
        },
        body: JSON.stringify(request)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API error:', errorData);
        
        // Create a structured error
        const error: any = new Error(
          errorData.error?.message || 'Request failed'
        );
        error.status = response.status;
        error.response = errorData;
        throw error;
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error sending message:', error);
      // Return a minimal valid response structure to prevent null errors
      return {
        id: 'error',
        object: 'error',
        created: Date.now(),
        model: request.model,
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: 'Error connecting to API. Please check your authentication.'
          },
          finish_reason: 'error'
        }]
      };
    }
  }
  
  /**
   * Check if authentication is valid
   */
  async verifyAuthentication(): Promise<boolean> {
    const apiKey = authStorage.getApiKey();
    
    if (!apiKey || apiKey === 'browser-llm') {
      return false;
    }
    
    try {
      const response = await fetch('https://openrouter.ai/api/v1/auth/key', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        }
      });
      
      return response.ok;
    } catch (error) {
      console.error('Auth verification error:', error);
      return false;
    }
  }
}

// Create a singleton instance
export const apiService = new ApiService();