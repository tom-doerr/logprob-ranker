import { 
  ChatMessage, 
  ChatCompletionRequest, 
  createChatCompletion 
} from '../lib/openrouter';
import { authStorage } from '../utils/storage';

/**
 * API Error with status code handling
 */
export class ApiError extends Error {
  status?: number;
  type: string;
  
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.type = status === 401 ? 'authentication_error' : 'api_error';
  }
}

/**
 * Standardized chat response format
 */
export interface ChatResponse {
  message: {
    role: string;
    content: string;
  };
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
  async createChatCompletion(
    params: {
      model: string;
      messages: Array<{ role: string; content: string }>;
      temperature?: number;
      max_tokens?: number;
      top_p?: number;
    }
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
      // Cast messages to the required type (safe because we validate roles)
      const messages = params.messages.map(msg => ({
        role: msg.role as "system" | "user" | "assistant",
        content: msg.content
      }));

      const request: ChatCompletionRequest = {
        model: params.model,
        messages,
        temperature: params.temperature,
        max_tokens: params.max_tokens,
        top_p: params.top_p
      };
      
      // Make the API call
      const response = await createChatCompletion(request, apiKey);
      
      // Extract the response data
      const assistantMessage = response.choices[0].message;
      
      return {
        message: assistantMessage,
        usage: response.usage ? {
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens
        } : undefined
      };
    } catch (error: any) {
      // Convert to standard API error
      if (error instanceof ApiError) {
        throw error;
      }
      
      // Handle network errors
      if (error.message && error.message.includes('network')) {
        throw new ApiError('Network error: Please check your connection', 500);
      }
      
      // Handle auth errors
      if (error.status === 401 || error.status === 403) {
        throw new ApiError('Authentication failed: Invalid API key', 401);
      }
      
      // Handle rate limits
      if (error.status === 429) {
        throw new ApiError('Rate limit exceeded: Please try again later', 429);
      }
      
      // Generic error fallback
      throw new ApiError(
        error.message || 'Unknown API error occurred',
        error.status || 500
      );
    }
  }
}

// Export singleton instance
export const apiClient = new ApiClient();