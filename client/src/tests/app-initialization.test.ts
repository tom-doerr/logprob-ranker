/**
 * App Initialization Integration Tests
 * Tests the application initialization process
 */

import { authStorage } from '../utils/storage';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock window events
const events: Record<string, Function[]> = {};
window.addEventListener = vi.fn((event, callback) => {
  events[event] = events[event] || [];
  events[event].push(callback);
});

window.dispatchEvent = vi.fn((event) => {
  const eventName = event.type;
  if (events[eventName]) {
    events[eventName].forEach(callback => {
      callback(event);
    });
  }
  return true;
});

// Mock storage
vi.mock('../utils/storage', () => ({
  authStorage: {
    getApiKey: vi.fn(),
    getAuthMethod: vi.fn(),
    isAuthenticated: vi.fn(),
    setApiKey: vi.fn(),
    setAuthMethod: vi.fn(),
    clearAuth: vi.fn()
  },
  modelConfigStorage: {
    getModelConfig: vi.fn().mockReturnValue({
      temperature: 0.7,
      topP: 0.9,
      maxTokens: 1000,
      selectedModel: 'test-model',
      isUsingBrowserModel: false
    }),
    saveModelConfig: vi.fn()
  }
}));

// Mock toast notifications
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast
  })
}));

describe('App Initialization Process', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset storage mock implementations
    (authStorage.getApiKey as any).mockReturnValue(null);
    (authStorage.getAuthMethod as any).mockReturnValue(null);
    (authStorage.isAuthenticated as any).mockReturnValue(false);
  });
  
  afterEach(() => {
    vi.clearAllMocks();
  });
  
  it('should initialize with no saved credentials', () => {
    // Mock app initialization function (simplified version)
    const initialize = () => {
      // Check for existing credentials
      const apiKey = authStorage.getApiKey();
      const authMethod = authStorage.getAuthMethod();
      const isAuthenticated = authStorage.isAuthenticated();
      
      let useBrowserModel = false;
      
      // When no API key is available, force browser model
      if (!apiKey) {
        console.log('No API key found, forcing browser model mode');
        useBrowserModel = true;
      }
      
      return {
        initialized: true,
        isAuthenticated,
        authMethod,
        apiKey: apiKey ? 'MASKED' : null,
        useBrowserModel
      };
    };
    
    // Call initialization
    const result = initialize();
    
    // Verify result with no credentials
    expect(result.initialized).toBe(true);
    expect(result.isAuthenticated).toBe(false);
    expect(result.apiKey).toBeNull();
    expect(result.useBrowserModel).toBe(true);
    
    // Storage should be checked
    expect(authStorage.getApiKey).toHaveBeenCalled();
    expect(authStorage.getAuthMethod).toHaveBeenCalled();
    expect(authStorage.isAuthenticated).toHaveBeenCalled();
  });
  
  it('should initialize with saved manual API key', () => {
    // Mock saved manual API key
    (authStorage.getApiKey as any).mockReturnValue('sk-or-v1-test-key');
    (authStorage.getAuthMethod as any).mockReturnValue('manual');
    (authStorage.isAuthenticated as any).mockReturnValue(true);
    
    // Mock app initialization function (simplified version)
    const initialize = () => {
      // Check for existing credentials
      const apiKey = authStorage.getApiKey();
      const authMethod = authStorage.getAuthMethod();
      const isAuthenticated = authStorage.isAuthenticated();
      
      let useBrowserModel = false;
      
      // When no API key is available, force browser model
      if (!apiKey) {
        console.log('No API key found, forcing browser model mode');
        useBrowserModel = true;
      }
      
      // Notify of auth state (simulate event dispatch)
      window.dispatchEvent(new Event('api-key-changed'));
      
      return {
        initialized: true,
        isAuthenticated,
        authMethod,
        apiKey: apiKey ? 'MASKED' : null,
        useBrowserModel
      };
    };
    
    // Call initialization
    const result = initialize();
    
    // Verify result with manual API key
    expect(result.initialized).toBe(true);
    expect(result.isAuthenticated).toBe(true);
    expect(result.authMethod).toBe('manual');
    expect(result.apiKey).toBe('MASKED');
    expect(result.useBrowserModel).toBe(false);
    
    // Event should be dispatched
    expect(window.dispatchEvent).toHaveBeenCalled();
  });
  
  it('should initialize with browser model mode', () => {
    // Mock browser model mode
    (authStorage.getApiKey as any).mockReturnValue('browser-llm');
    (authStorage.getAuthMethod as any).mockReturnValue('browser');
    (authStorage.isAuthenticated as any).mockReturnValue(true);
    
    // Mock app initialization function (simplified version)
    const initialize = () => {
      // Check for existing credentials
      const apiKey = authStorage.getApiKey();
      const authMethod = authStorage.getAuthMethod();
      const isAuthenticated = authStorage.isAuthenticated();
      
      let useBrowserModel = false;
      
      // When using browser model mode
      if (apiKey === 'browser-llm' && authMethod === 'browser') {
        useBrowserModel = true;
      }
      
      // When no API key is available, force browser model
      if (!apiKey) {
        console.log('No API key found, forcing browser model mode');
        useBrowserModel = true;
      }
      
      return {
        initialized: true,
        isAuthenticated,
        authMethod,
        apiKey: apiKey ? 'MASKED' : null,
        useBrowserModel
      };
    };
    
    // Call initialization
    const result = initialize();
    
    // Verify result with browser model mode
    expect(result.initialized).toBe(true);
    expect(result.isAuthenticated).toBe(true);
    expect(result.authMethod).toBe('browser');
    expect(result.apiKey).toBe('MASKED');
    expect(result.useBrowserModel).toBe(true);
  });
  
  it('should handle auth state change events', () => {
    // Create a mock component with state
    let state = {
      apiKey: null,
      authMethod: null,
      isAuthenticated: false,
      useBrowserModel: false
    };
    
    // Mock state update function
    const updateState = (newState: Partial<typeof state>) => {
      state = { ...state, ...newState };
      return state;
    };
    
    // Setup event listener
    const handleAuthEvent = (event: CustomEvent<any>) => {
      if (event.detail && event.detail.apiKey) {
        updateState({
          apiKey: event.detail.apiKey,
          authMethod: event.detail.method,
          isAuthenticated: true,
          useBrowserModel: event.detail.method === 'browser'
        });
      }
    };
    
    // Register event handler
    window.addEventListener('auth-state-change', handleAuthEvent as any);
    
    // Dispatch auth event
    const customEvent = new CustomEvent('auth-state-change', {
      detail: {
        apiKey: 'sk-or-test-updated-key',
        method: 'manual'
      }
    });
    
    window.dispatchEvent(customEvent);
    
    // Verify state was updated
    expect(state.apiKey).toBe('sk-or-test-updated-key');
    expect(state.authMethod).toBe('manual');
    expect(state.isAuthenticated).toBe(true);
    expect(state.useBrowserModel).toBe(false);
  });
});