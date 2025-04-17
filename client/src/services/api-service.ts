/**
 * Centralized API service
 * Advantages:
 * - Consistent API access patterns
 * - Centralized error handling
 * - Easy request/response transformations
 * - Simplified mocking for tests
 */

import { authStorage } from '../utils/storage';

// API error types for better error handling
export enum ApiErrorType {
  NETWORK = 'network_error',
  AUTH = 'authentication_error',
  RATE_LIMIT = 'rate_limit',
  SERVER = 'server_error',
  VALIDATION = 'validation_error',
  UNKNOWN = 'unknown_error'
}

// Custom API error class
export class ApiError extends Error {
  type: ApiErrorType;
  statusCode?: number;
  
  constructor(message: string, type: ApiErrorType, statusCode?: number) {
    super(message);
    this.name = 'ApiError';
    this.type = type;
    this.statusCode = statusCode;
  }
}

// Base API configuration
const API_CONFIG = {
  baseUrl: 'https://openrouter.ai/api',
  defaultHeaders: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
};

/**
 * Core API service with consistent error handling
 */
class ApiService {
  /**
   * Makes an authenticated API request
   */
  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    try {
      // Get API key from storage
      const { apiKey } = authStorage.getAuthData();
      
      if (!apiKey) {
        throw new ApiError(
          'API key is required for this operation',
          ApiErrorType.AUTH
        );
      }
      
      // Prepare headers
      const headers = new Headers({
        ...API_CONFIG.defaultHeaders,
        ...(options.headers || {}),
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': window.location.origin,
      });
      
      // Build URL
      const url = endpoint.startsWith('http') 
        ? endpoint 
        : `${API_CONFIG.baseUrl}${endpoint}`;
      
      // Make the request
      const response = await fetch(url, {
        ...options,
        headers,
      });
      
      // Handle HTTP errors
      if (!response.ok) {
        const statusCode = response.status;
        let errorType = ApiErrorType.UNKNOWN;
        let errorMessage = 'Unknown API error';
        
        // Try to parse error response
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || 'API error';
        } catch (e) {
          errorMessage = response.statusText || 'API error';
        }
        
        // Determine error type from status code
        if (statusCode === 401 || statusCode === 403) {
          errorType = ApiErrorType.AUTH;
        } else if (statusCode === 429) {
          errorType = ApiErrorType.RATE_LIMIT;
        } else if (statusCode >= 500) {
          errorType = ApiErrorType.SERVER;
        } else if (statusCode === 400 || statusCode === 422) {
          errorType = ApiErrorType.VALIDATION;
        }
        
        throw new ApiError(errorMessage, errorType, statusCode);
      }
      
      // Parse and return response data
      return await response.json();
    } catch (error) {
      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new ApiError(
          'Network error: Please check your connection',
          ApiErrorType.NETWORK
        );
      }
      
      // Re-throw API errors
      if (error instanceof ApiError) {
        throw error;
      }
      
      // Handle unexpected errors
      throw new ApiError(
        error instanceof Error ? error.message : 'Unknown error',
        ApiErrorType.UNKNOWN
      );
    }
  }
  
  /**
   * Checks if current API key is valid
   */
  async validateApiKey(): Promise<boolean> {
    try {
      await this.request('/v1/auth/validate');
      return true;
    } catch (error) {
      return false;
    }
  }
}

/**
 * OpenRouter-specific API service
 */
class OpenRouterService {
  private api: ApiService;
  
  constructor() {
    this.api = new ApiService();
  }
  
  /**
   * Generates chat completions
   */
  async createChatCompletion(params: {
    model: string;
    messages: Array<{ role: string; content: string }>;
    temperature?: number;
    top_p?: number;
    max_tokens?: number;
  }) {
    return this.api.request('/v1/chat/completions', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }
  
  /**
   * Validates API key
   */
  async validateKey(): Promise<boolean> {
    return this.api.validateApiKey();
  }
  
  /**
   * Gets available models
   */
  async getModels() {
    return this.api.request('/v1/models');
  }
}

// Export service instance
export const openRouterService = new OpenRouterService();

// Export an alias for backward compatibility
export const apiService = openRouterService;