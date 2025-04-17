/**
 * Unified storage utility
 * 
 * Benefits:
 * - Centralized storage access
 * - Type safety with TypeScript
 * - Domain separation for data
 * - Consistent serialization/deserialization
 * - Simplified testing with clear interface
 */

import { AuthMethod } from '../hooks/simplified-auth';

// Storage structure
interface StorageStructure {
  auth: {
    apiKey: string | null;
    method: AuthMethod;
    codeVerifier?: string;
  };
  
  models: {
    selectedId: string;
    parameters: {
      temperature: number;
      topP: number;
      maxTokens: number;
    };
    isBrowserMode: boolean;
    customModelId: string;
  };
  
  ui: {
    theme: 'light' | 'dark' | 'system';
    lastTab: string;
  };
}

// Storage keys
const KEYS = {
  AUTH: 'app.auth',
  MODELS: 'app.models',
  UI: 'app.ui',
  CODE_VERIFIER: 'app.codeVerifier',
};

/**
 * Authentication storage
 */
class AuthStorage {
  /**
   * Gets stored authentication data
   */
  getAuthData(): { apiKey: string | null; method: AuthMethod } {
    try {
      const authData = localStorage.getItem(KEYS.AUTH);
      
      if (authData) {
        const { apiKey, method } = JSON.parse(authData);
        return { apiKey, method };
      }
      
      return { apiKey: null, method: null };
    } catch (error) {
      console.error('Error retrieving auth data:', error);
      return { apiKey: null, method: null };
    }
  }
  
  /**
   * Saves authentication data
   */
  saveAuth(apiKey: string, method: AuthMethod): void {
    try {
      localStorage.setItem(KEYS.AUTH, JSON.stringify({ apiKey, method }));
    } catch (error) {
      console.error('Error saving auth data:', error);
    }
  }
  
  /**
   * Clears authentication data
   */
  clearAuth(): void {
    try {
      localStorage.removeItem(KEYS.AUTH);
    } catch (error) {
      console.error('Error clearing auth data:', error);
    }
  }
  
  /**
   * Saves OAuth code verifier
   */
  saveCodeVerifier(codeVerifier: string): void {
    try {
      localStorage.setItem(KEYS.CODE_VERIFIER, codeVerifier);
    } catch (error) {
      console.error('Error saving code verifier:', error);
    }
  }
  
  /**
   * Gets OAuth code verifier
   */
  getCodeVerifier(): string | null {
    try {
      return localStorage.getItem(KEYS.CODE_VERIFIER);
    } catch (error) {
      console.error('Error retrieving code verifier:', error);
      return null;
    }
  }
  
  /**
   * Clears OAuth code verifier
   */
  clearCodeVerifier(): void {
    try {
      localStorage.removeItem(KEYS.CODE_VERIFIER);
    } catch (error) {
      console.error('Error clearing code verifier:', error);
    }
  }
  
  /**
   * Validates API key format
   */
  isValidApiKey(apiKey: string): boolean {
    if (!apiKey) return false;
    
    // Basic structure validation for API keys
    const isOpenRouterKey = 
      apiKey.startsWith('sk-') && 
      apiKey.length >= 30;
      
    // Could expand with more key format validations
    return isOpenRouterKey;
  }
}

/**
 * Model settings storage
 */
class ModelStorage {
  private readonly KEY = KEYS.MODELS;
  
  /**
   * Gets model settings
   */
  getModelSettings() {
    try {
      const data = localStorage.getItem(this.KEY);
      
      if (data) {
        return JSON.parse(data);
      }
      
      return {
        selectedId: '',
        parameters: {
          temperature: 0.7,
          topP: 0.9,
          maxTokens: 1000
        },
        isBrowserMode: false,
        customModelId: ''
      };
    } catch (error) {
      console.error('Error retrieving model settings:', error);
      return null;
    }
  }
  
  /**
   * Saves model settings
   */
  saveModelSettings(settings: any): void {
    try {
      localStorage.setItem(this.KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving model settings:', error);
    }
  }
  
  /**
   * Clears model settings
   */
  clearModelSettings(): void {
    try {
      localStorage.removeItem(this.KEY);
    } catch (error) {
      console.error('Error clearing model settings:', error);
    }
  }
}

/**
 * UI preferences storage
 */
class UIStorage {
  private readonly KEY = KEYS.UI;
  
  /**
   * Gets UI preferences
   */
  getUIPreferences() {
    try {
      const data = localStorage.getItem(this.KEY);
      
      if (data) {
        return JSON.parse(data);
      }
      
      return {
        theme: 'system',
        lastTab: 'home'
      };
    } catch (error) {
      console.error('Error retrieving UI preferences:', error);
      return null;
    }
  }
  
  /**
   * Saves UI preferences
   */
  saveUIPreferences(preferences: any): void {
    try {
      localStorage.setItem(this.KEY, JSON.stringify(preferences));
    } catch (error) {
      console.error('Error saving UI preferences:', error);
    }
  }
  
  /**
   * Clears UI preferences
   */
  clearUIPreferences(): void {
    try {
      localStorage.removeItem(this.KEY);
    } catch (error) {
      console.error('Error clearing UI preferences:', error);
    }
  }
}

// Export storage modules
export const authStorage = new AuthStorage();
export const modelStorage = new ModelStorage();
export const uiStorage = new UIStorage();