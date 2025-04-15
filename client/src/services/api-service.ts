import { 
  ChatMessage, 
  ChatCompletionRequest, 
  createChatCompletion 
} from '../lib/openrouter';
import { ModelConfig } from '../lib/modelTypes';
import { getApiKey } from '../utils/pkce';

// Error class for API errors
export class ApiServiceError extends Error {
  status?: number;
  
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiServiceError';
    this.status = status;
  }
}

// Interface for standardized chat completion response
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
 * Unified API Service facade to handle all model interactions
 * Abstracts the details of different model APIs and provides a consistent interface
 */
export class ApiService {
  private apiKey: string | null = null;
  
  constructor() {
    // Load API key on initialization
    this.apiKey = getApiKey();
    
    // Listen for API key changes
    window.addEventListener('api-key-changed', () => {
      this.apiKey = getApiKey();
    });
  }
  
  /**
   * Validates if the service is ready to make API calls
   * @returns boolean indicating if API key is available
   */
  isReady(): boolean {
    return this.apiKey !== null && this.apiKey !== 'browser-llm';
  }
  
  /**
   * Get the current API key
   */
  getApiKey(): string | null {
    return this.apiKey;
  }
  
  /**
   * Generate chat completion using OpenRouter API
   * @param messages Array of chat messages for context
   * @param config Model configuration options
   * @returns Promise with the chat response
   */
  async generateChatCompletion(
    messages: ChatMessage[],
    config: Partial<ModelConfig>
  ): Promise<ChatResponse> {
    if (!this.isReady()) {
      throw new ApiServiceError('API key not available. Please authenticate first.');
    }
    
    try {
      // Determine which model to use
      const modelId = config.selectedModel === 'custom' 
        ? config.customModel 
        : config.selectedModel;
      
      if (!modelId) {
        throw new ApiServiceError('No model selected');
      }
      
      // Prepare request
      const request: ChatCompletionRequest = {
        model: modelId,
        messages,
        temperature: config.temperature,
        max_tokens: config.maxTokens,
      };
      
      // Make API call
      const response = await createChatCompletion(request);
      
      // Check response validity
      if (!response.choices || response.choices.length === 0) {
        throw new ApiServiceError('Empty response from API');
      }
      
      // Return standardized response
      return {
        text: response.choices[0].message.content,
        message: response.choices[0].message,
        usage: response.usage ? {
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens,
        } : undefined
      };
    } catch (error) {
      // Rethrow as ApiServiceError with additional context
      if (error instanceof ApiServiceError) {
        throw error;
      } else if (error instanceof Error) {
        throw new ApiServiceError(`API Error: ${error.message}`);
      } else {
        throw new ApiServiceError('Unknown API error');
      }
    }
  }
}

// Export singleton instance for app-wide use
export const apiService = new ApiService();