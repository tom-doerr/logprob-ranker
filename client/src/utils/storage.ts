/**
 * Centralized storage utilities for the application
 * This provides a consistent interface for accessing stored data
 * with TypeScript typing and error handling.
 */

// Storage keys
const STORAGE_KEYS = {
  AUTH: {
    API_KEY: 'apiKey',
    AUTH_METHOD: 'authMethod',
    CODE_VERIFIER: 'codeVerifier'
  },
  SETTINGS: {
    MODEL_CONFIG: 'modelConfig',
    RANKER_SETTINGS: 'rankerSettings',
    TEMPLATES: 'templates',
    SAVED_RESULTS: 'savedResults',
    UI_PREFERENCES: 'uiPreferences'
  }
};

// Auth method types
export type AuthMethod = 'oauth' | 'manual' | 'browser' | null;

// Auth data interface
export interface AuthData {
  apiKey: string | null;
  authMethod: AuthMethod;
}

/**
 * Auth storage utilities
 */
class AuthStorage {
  /**
   * Gets stored authentication data
   */
  getAuthData(): AuthData {
    return {
      apiKey: localStorage.getItem(STORAGE_KEYS.AUTH.API_KEY),
      authMethod: this.getAuthMethod()
    };
  }
  
  /**
   * Gets the stored API key
   */
  getApiKey(): string | null {
    return localStorage.getItem(STORAGE_KEYS.AUTH.API_KEY);
  }
  
  /**
   * Saves the API key
   */
  saveApiKey(key: string): void {
    localStorage.setItem(STORAGE_KEYS.AUTH.API_KEY, key);
  }
  
  /**
   * Clears the API key
   */
  clearApiKey(): void {
    localStorage.removeItem(STORAGE_KEYS.AUTH.API_KEY);
  }
  
  /**
   * Gets the stored authentication method
   */
  getAuthMethod(): AuthMethod {
    const method = localStorage.getItem(STORAGE_KEYS.AUTH.AUTH_METHOD);
    if (method === 'oauth' || method === 'manual' || method === 'browser') {
      return method;
    }
    return null;
  }
  
  /**
   * Saves the authentication method
   */
  saveAuthMethod(method: 'oauth' | 'manual' | 'browser'): void {
    localStorage.setItem(STORAGE_KEYS.AUTH.AUTH_METHOD, method);
  }
  
  /**
   * Clears the authentication method
   */
  clearAuthMethod(): void {
    localStorage.removeItem(STORAGE_KEYS.AUTH.AUTH_METHOD);
  }
  
  /**
   * Gets the stored code verifier
   */
  getCodeVerifier(): string | null {
    return localStorage.getItem(STORAGE_KEYS.AUTH.CODE_VERIFIER);
  }
  
  /**
   * Saves the code verifier
   */
  saveCodeVerifier(verifier: string): void {
    localStorage.setItem(STORAGE_KEYS.AUTH.CODE_VERIFIER, verifier);
  }
  
  /**
   * Clears the code verifier
   */
  clearCodeVerifier(): void {
    localStorage.removeItem(STORAGE_KEYS.AUTH.CODE_VERIFIER);
  }
  
  /**
   * Checks if current api key is valid
   */
  isValidApiKey(key: string): boolean {
    // Very basic validation
    if (!key) return false;
    
    return (
      key === 'browser-llm' || 
      key.startsWith('sk-') || 
      key.length > 32
    );
  }
  
  /**
   * Clears all auth data
   */
  clearAllAuth(): void {
    this.clearApiKey();
    this.clearAuthMethod();
    this.clearCodeVerifier();
  }
}

/**
 * Export storage instances
 */
export const authStorage = new AuthStorage();

/**
 * Generic storage utility for any type of data
 */
export class TypedStorage<T> {
  private key: string;
  private defaultValue: T;
  
  constructor(key: string, defaultValue: T) {
    this.key = key;
    this.defaultValue = defaultValue;
  }
  
  /**
   * Get the stored value
   */
  get(): T {
    try {
      const item = localStorage.getItem(this.key);
      return item ? JSON.parse(item) : this.defaultValue;
    } catch (e) {
      console.error(`Error getting ${this.key} from storage:`, e);
      return this.defaultValue;
    }
  }
  
  /**
   * Set the stored value
   */
  set(value: T): void {
    try {
      localStorage.setItem(this.key, JSON.stringify(value));
    } catch (e) {
      console.error(`Error setting ${this.key} in storage:`, e);
    }
  }
  
  /**
   * Clear the stored value
   */
  clear(): void {
    localStorage.removeItem(this.key);
  }
}

/**
 * Usage example:
 * 
 * // Define a typed storage for UI preferences
 * export const uiPreferencesStorage = new TypedStorage<{
 *   theme: 'light' | 'dark';
 *   fontSize: number;
 * }>(STORAGE_KEYS.SETTINGS.UI_PREFERENCES, { theme: 'dark', fontSize: 16 });
 * 
 * // Get the stored value
 * const preferences = uiPreferencesStorage.get();
 * // Set the stored value
 * uiPreferencesStorage.set({ ...preferences, theme: 'light' });
 */