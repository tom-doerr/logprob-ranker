/**
 * Centralized storage utility for the application
 * This simplifies our code by providing a single interface for all storage operations
 */

export type AuthMethod = 'oauth' | 'manual' | 'browser' | null;

// Storage keys - all in one place for easy management
const STORAGE_KEYS = {
  API_KEY: 'openrouter_api_key',
  AUTH_METHOD: 'auth_method',
  CODE_VERIFIER: 'pkce_code_verifier',
  MODEL_PREFERENCES: 'model_preferences',
  LAST_USED_MODEL: 'last_used_model'
};

// Auth-related storage
export const authStorage = {
  // Save authentication data in one operation
  saveAuth(apiKey: string, method: AuthMethod): void {
    if (!method) return;
    localStorage.setItem(STORAGE_KEYS.API_KEY, apiKey);
    localStorage.setItem(STORAGE_KEYS.AUTH_METHOD, method);
  },

  // Clear authentication in one operation
  clearAuth(): void {
    localStorage.removeItem(STORAGE_KEYS.API_KEY);
    localStorage.removeItem(STORAGE_KEYS.AUTH_METHOD);
    localStorage.removeItem(STORAGE_KEYS.CODE_VERIFIER);
  },

  // Get all auth data in one operation
  getAuthData(): { apiKey: string | null; method: AuthMethod } {
    const apiKey = localStorage.getItem(STORAGE_KEYS.API_KEY);
    const rawMethod = localStorage.getItem(STORAGE_KEYS.AUTH_METHOD);
    
    // Type-safe auth method
    let method: AuthMethod = null;
    if (rawMethod === 'oauth' || rawMethod === 'manual' || rawMethod === 'browser') {
      method = rawMethod;
    }
    
    return { apiKey, method };
  },

  // Validate API key format
  isValidApiKey(key: string | null): boolean {
    if (!key) return false;
    
    // Special case for browser model
    if (key === 'browser-llm') return true;
    
    // Basic format check for OpenRouter keys
    if (key.startsWith('sk-or-') && key.length > 15) return true;
    
    // Allow any other key format that has reasonable length
    return key.length >= 20;
  },

  // PKCE-specific operations
  saveCodeVerifier(verifier: string): void {
    localStorage.setItem(STORAGE_KEYS.CODE_VERIFIER, verifier);
  },
  
  getCodeVerifier(): string | null {
    return localStorage.getItem(STORAGE_KEYS.CODE_VERIFIER);
  }
};

// Model preferences storage
export const modelStorage = {
  saveLastUsedModel(modelId: string): void {
    localStorage.setItem(STORAGE_KEYS.LAST_USED_MODEL, modelId);
  },
  
  getLastUsedModel(): string | null {
    return localStorage.getItem(STORAGE_KEYS.LAST_USED_MODEL);
  },
  
  saveModelPreferences(preferences: any): void {
    localStorage.setItem(STORAGE_KEYS.MODEL_PREFERENCES, JSON.stringify(preferences));
  },
  
  getModelPreferences(): any {
    const data = localStorage.getItem(STORAGE_KEYS.MODEL_PREFERENCES);
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch (e) {
      return null;
    }
  }
};

// Central storage for everything else
export const appStorage = {
  // Save any value with type safety
  save<T>(key: string, value: T): void {
    localStorage.setItem(key, JSON.stringify(value));
  },
  
  // Get any value with type safety
  get<T>(key: string): T | null {
    const data = localStorage.getItem(key);
    if (!data) return null;
    try {
      return JSON.parse(data) as T;
    } catch (e) {
      return null;
    }
  },
  
  // Remove any item
  remove(key: string): void {
    localStorage.removeItem(key);
  }
};