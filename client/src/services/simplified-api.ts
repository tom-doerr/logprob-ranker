import { 
  ChatMessage, 
  ChatCompletionRequest, 
  createChatCompletion 
} from '../lib/openrouter';
import { ModelConfig } from '../lib/modelTypes';
import { authStorage } from '../utils/storage';

/**
 * API Error with status code handling
 */
export class ApiError extends Error {
  status?: number;
  
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * Standardized chat response format
 */
export interface ChatResponse {
  text: string;
  message: ChatMessage;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Simplified API Client with async/await
 * - Centralizes error handling
 * - Uses async/await for cleaner code
 * - Provides consistent response format
 */
class ApiClient {
  /**
   * Generates a chat completion from OpenRouter API
   */
  async generateCompletion(
    messages: ChatMessage[], 
    config: Partial<ModelConfig>
  ): Promise<ChatResponse> {
    try {
      // Get auth data from storage
      const { apiKey } = authStorage.getAuthData();
      
      // Check for valid API key
      if (!apiKey || !authStorage.isValidApiKey(apiKey)) {
        throw new ApiError('API key required for this operation', 401);
      }
      
      // Browser model is handled elsewhere
      if (apiKey === 'browser-llm') {
        throw new ApiError('Browser models cannot use the API service', 400);
      }
      
      // Create the request with available parameters
      const request: ChatCompletionRequest = {
        model: config.customModel || config.selectedModel,
        messages,
        temperature: config.temperature,
        max_tokens: config.maxTokens,
      };
      
      // Make the API call
      const response = await createChatCompletion(request, apiKey);
      
      // Extract the response data
      const assistantMessage = response.choices[0].message;
      
      return {
        text: assistantMessage.content,
        message: assistantMessage,
        usage: response.usage ? {
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens
        } : undefined
      };
    } catch (error: any) {
      // Handle API-specific errors and provide meaningful messages
      if (error.response) {
        const status = error.response.status;
        let message = 'API request failed';
        
        if (status === 401) {
          message = 'Invalid API key or authentication error';
        } else if (status === 403) {
          message = 'Access forbidden. Check your API key permissions';
        } else if (status === 429) {
          message = 'Rate limit exceeded. Please try again later';
        } else if (status >= 500) {
          message = 'OpenRouter API server error. Please try again later';
        }
        
        throw new ApiError(message, status);
      }
      
      // Handle network or other errors
      throw new ApiError(error.message || 'Unknown API error');
    }
  }
}

// Export a single instance for the whole app
export const apiClient = new ApiClient();