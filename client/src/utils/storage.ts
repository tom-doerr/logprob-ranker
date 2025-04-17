/**
 * Storage utilities for client-side persistence
 * Provides abstracted access to localStorage with type safety
 */

// Auth method types
export type AuthMethod = 'oauth' | 'manual' | 'browser' | null;

// Storage keys
const STORAGE_KEYS = {
  // Auth storage
  API_KEY: 'nervui-api-key',
  AUTH_METHOD: 'nervui-auth-method',
  CODE_VERIFIER: 'nervui-code-verifier',
  
  // Model config
  MODEL_CONFIG: 'nervui-model-config',
  
  // Chat storage
  CHAT_MESSAGES: 'nervui-chat-messages',
  
  // User preferences
  USER_PREFERENCES: 'nervui-user-preferences',
};

// Default values
const DEFAULTS = {
  // Default model config
  MODEL_CONFIG: {
    temperature: 0.7,
    topP: 0.9,
    maxTokens: 1000,
    selectedModel: 'google/gemini-pro',
    customModel: '',
    isUsingBrowserModel: false,
  },
  
  // Default user preferences
  USER_PREFERENCES: {
    theme: 'dark' as 'dark' | 'light' | 'system',
    codeStyle: 'tokyo-night',
    showLineNumbers: true,
    fontSize: 'medium' as 'small' | 'medium' | 'large',
    previewEnabled: true,
  },
};

// Model configuration interface
export interface ModelConfig {
  temperature: number;
  topP: number;
  maxTokens: number;
  selectedModel: string;
  customModel: string;
  isUsingBrowserModel: boolean;
}

// User preferences interface
export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  codeStyle: string;
  showLineNumbers: boolean;
  fontSize: 'small' | 'medium' | 'large';
  previewEnabled: boolean;
}

// Chat message interface
export interface StoredChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp?: number;
}

/**
 * Auth storage utilities
 */
export const authStorage = {
  // Get API key
  getApiKey(): string | null {
    return localStorage.getItem(STORAGE_KEYS.API_KEY);
  },
  
  // Set API key
  setApiKey(value: string): boolean {
    try {
      localStorage.setItem(STORAGE_KEYS.API_KEY, value);
      return true;
    } catch (error) {
      console.error('Failed to save API key:', error);
      return false;
    }
  },
  
  // Get auth method
  getAuthMethod(): AuthMethod {
    const method = localStorage.getItem(STORAGE_KEYS.AUTH_METHOD);
    if (method === 'oauth' || method === 'manual' || method === 'browser') {
      return method;
    }
    return null;
  },
  
  // Set auth method
  setAuthMethod(value: AuthMethod): boolean {
    try {
      if (value === null) {
        localStorage.removeItem(STORAGE_KEYS.AUTH_METHOD);
      } else {
        localStorage.setItem(STORAGE_KEYS.AUTH_METHOD, value);
      }
      return true;
    } catch (error) {
      console.error('Failed to save auth method:', error);
      return false;
    }
  },
  
  // Clear auth data
  clearAuth(): boolean {
    try {
      localStorage.removeItem(STORAGE_KEYS.API_KEY);
      localStorage.removeItem(STORAGE_KEYS.AUTH_METHOD);
      return true;
    } catch (error) {
      console.error('Failed to clear auth data:', error);
      return false;
    }
  },
  
  // Check if authenticated
  isAuthenticated(): boolean {
    return this.getApiKey() !== null;
  }
};

/**
 * Model config storage utilities
 */
export const modelConfigStorage = {
  // Get model config
  getModelConfig(): ModelConfig {
    try {
      const configStr = localStorage.getItem(STORAGE_KEYS.MODEL_CONFIG);
      if (configStr) {
        const config = JSON.parse(configStr);
        return {
          ...DEFAULTS.MODEL_CONFIG,
          ...config
        };
      }
    } catch (error) {
      console.error('Error loading model config:', error);
    }
    
    return DEFAULTS.MODEL_CONFIG;
  },
  
  // Save model config
  saveModelConfig(config: Partial<ModelConfig>): boolean {
    try {
      const currentConfig = this.getModelConfig();
      const updatedConfig = {
        ...currentConfig,
        ...config
      };
      
      localStorage.setItem(STORAGE_KEYS.MODEL_CONFIG, JSON.stringify(updatedConfig));
      return true;
    } catch (error) {
      console.error('Error saving model config:', error);
      return false;
    }
  },
  
  // Reset model config to defaults
  resetModelConfig(): boolean {
    try {
      localStorage.setItem(STORAGE_KEYS.MODEL_CONFIG, JSON.stringify(DEFAULTS.MODEL_CONFIG));
      return true;
    } catch (error) {
      console.error('Error resetting model config:', error);
      return false;
    }
  }
};

/**
 * User preferences storage utilities
 */
export const userPreferencesStorage = {
  // Get user preferences
  getUserPreferences(): UserPreferences {
    try {
      const prefsStr = localStorage.getItem(STORAGE_KEYS.USER_PREFERENCES);
      if (prefsStr) {
        const prefs = JSON.parse(prefsStr);
        return {
          ...DEFAULTS.USER_PREFERENCES,
          ...prefs
        };
      }
    } catch (error) {
      console.error('Error loading user preferences:', error);
    }
    
    return DEFAULTS.USER_PREFERENCES;
  },
  
  // Save user preferences
  saveUserPreferences(prefs: Partial<UserPreferences>): boolean {
    try {
      const currentPrefs = this.getUserPreferences();
      const updatedPrefs = {
        ...currentPrefs,
        ...prefs
      };
      
      localStorage.setItem(STORAGE_KEYS.USER_PREFERENCES, JSON.stringify(updatedPrefs));
      return true;
    } catch (error) {
      console.error('Error saving user preferences:', error);
      return false;
    }
  }
};

/**
 * Chat storage utilities
 */
export const chatStorage = {
  // Get all messages for a specific chat
  getMessages(chatId: string): StoredChatMessage[] {
    try {
      const key = `${STORAGE_KEYS.CHAT_MESSAGES}-${chatId}`;
      const messagesStr = localStorage.getItem(key);
      
      if (messagesStr) {
        return JSON.parse(messagesStr);
      }
    } catch (error) {
      console.error(`Error loading chat messages for chat ${chatId}:`, error);
    }
    
    return [];
  },
  
  // Save messages for a specific chat
  saveMessages(chatId: string, messages: StoredChatMessage[]): boolean {
    try {
      const key = `${STORAGE_KEYS.CHAT_MESSAGES}-${chatId}`;
      localStorage.setItem(key, JSON.stringify(messages));
      return true;
    } catch (error) {
      console.error(`Error saving chat messages for chat ${chatId}:`, error);
      return false;
    }
  },
  
  // Clear messages for a specific chat
  clearMessages(chatId: string): boolean {
    try {
      const key = `${STORAGE_KEYS.CHAT_MESSAGES}-${chatId}`;
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Error clearing chat messages for chat ${chatId}:`, error);
      return false;
    }
  },
  
  // Get all chat IDs
  getAllChatIds(): string[] {
    try {
      const prefix = `${STORAGE_KEYS.CHAT_MESSAGES}-`;
      const chatIds: string[] = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          chatIds.push(key.substring(prefix.length));
        }
      }
      
      return chatIds;
    } catch (error) {
      console.error('Error getting all chat IDs:', error);
      return [];
    }
  }
};

// Export default combined storage object
export default {
  auth: authStorage,
  modelConfig: modelConfigStorage,
  userPreferences: userPreferencesStorage,
  chat: chatStorage,
  
  // Clear all stored data
  clearAll(): boolean {
    try {
      Object.values(STORAGE_KEYS).forEach(key => {
        if (typeof key === 'string') {
          localStorage.removeItem(key);
        }
      });
      
      // Also clear all chat messages
      chatStorage.getAllChatIds().forEach(id => {
        chatStorage.clearMessages(id);
      });
      
      return true;
    } catch (error) {
      console.error('Error clearing all storage:', error);
      return false;
    }
  }
};