/**
 * Authentication Hook Integration Test
 * Tests the authentication hook functionality
 */

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Create mock localStorage
const createMockStorage = () => {
  let storage = {};
  
  return {
    getItem: vi.fn((key) => {
      return storage[key] || null;
    }),
    setItem: vi.fn((key, value) => {
      storage[key] = value;
    }),
    removeItem: vi.fn((key) => {
      delete storage[key];
    }),
    clear: vi.fn(() => {
      storage = {};
    }),
    _getStorage: () => storage // For testing
  };
};

// Mock localStorage
const mockStorage = createMockStorage();
Object.defineProperty(window, 'localStorage', {
  value: mockStorage
});

// Auth storage constants
const AUTH_KEY = 'app_auth_key';
const AUTH_METHOD_KEY = 'app_auth_method';
const CODE_VERIFIER_KEY = 'app_code_verifier';

// Auth storage utility
const authStorage = {
  getApiKey: () => {
    return window.localStorage.getItem(AUTH_KEY);
  },
  
  setApiKey: (key) => {
    if (key === null) {
      window.localStorage.removeItem(AUTH_KEY);
    } else {
      window.localStorage.setItem(AUTH_KEY, key);
    }
  },
  
  getAuthMethod: () => {
    return window.localStorage.getItem(AUTH_METHOD_KEY);
  },
  
  setAuthMethod: (method) => {
    if (method === null) {
      window.localStorage.removeItem(AUTH_METHOD_KEY);
    } else {
      window.localStorage.setItem(AUTH_METHOD_KEY, method);
    }
  },
  
  saveCodeVerifier: (verifier) => {
    window.localStorage.setItem(CODE_VERIFIER_KEY, verifier);
  },
  
  getCodeVerifier: () => {
    return window.localStorage.getItem(CODE_VERIFIER_KEY);
  },
  
  clearAuth: () => {
    window.localStorage.removeItem(AUTH_KEY);
    window.localStorage.removeItem(AUTH_METHOD_KEY);
    window.localStorage.removeItem(CODE_VERIFIER_KEY);
  },
  
  isAuthenticated: () => {
    const apiKey = authStorage.getApiKey();
    return !!apiKey;
  }
};

// Custom hook for authentication
const useAuth = () => {
  const [apiKey, setApiKey] = React.useState(() => authStorage.getApiKey());
  const [authMethod, setAuthMethod] = React.useState(() => authStorage.getAuthMethod());
  const [isAuthenticated, setIsAuthenticated] = React.useState(() => authStorage.isAuthenticated());
  const [manualApiKey, setManualApiKey] = React.useState('');
  
  // Auto-authenticate using stored credentials
  const autoAuthenticate = () => {
    const storedKey = authStorage.getApiKey();
    const storedMethod = authStorage.getAuthMethod();
    
    if (storedKey) {
      setApiKey(storedKey);
      setAuthMethod(storedMethod);
      setIsAuthenticated(true);
      return true;
    }
    
    return false;
  };
  
  // Handle manual key submission
  const handleManualKeySubmit = () => {
    if (!manualApiKey.trim()) {
      return;
    }
    
    // Save API key and auth method
    authStorage.setApiKey(manualApiKey);
    authStorage.setAuthMethod('manual');
    
    // Update state
    setApiKey(manualApiKey);
    setAuthMethod('manual');
    setIsAuthenticated(true);
    
    // Dispatch auth state change event
    window.dispatchEvent(new CustomEvent('auth-state-change', {
      detail: { apiKey: manualApiKey, method: 'manual' }
    }));
  };
  
  // Start OAuth flow
  const startOAuthFlow = async () => {
    // Generate code verifier (simplified for testing)
    const codeVerifier = 'test-code-verifier';
    
    // Save code verifier
    authStorage.saveCodeVerifier(codeVerifier);
    
    // In a real implementation, this would open OAuth popup
    // For testing, we'll simulate the flow
    console.log('Starting OAuth flow');
    
    // Simulate successful OAuth response
    const simulateSuccessfulOAuth = () => {
      const oauthToken = 'test-oauth-token';
      
      // Save token
      authStorage.setApiKey(oauthToken);
      authStorage.setAuthMethod('oauth');
      
      // Update state
      setApiKey(oauthToken);
      setAuthMethod('oauth');
      setIsAuthenticated(true);
      
      // Dispatch auth state change event
      window.dispatchEvent(new CustomEvent('auth-state-change', {
        detail: { apiKey: oauthToken, method: 'oauth' }
      }));
    };
    
    // Simulate successful OAuth completion (future)
    setTimeout(simulateSuccessfulOAuth, 0);
  };
  
  // Enable browser model
  const enableBrowserModel = () => {
    // Set browser model auth
    authStorage.setApiKey('browser-llm');
    authStorage.setAuthMethod('browser');
    
    // Update state
    setApiKey('browser-llm');
    setAuthMethod('browser');
    setIsAuthenticated(true);
    
    // Dispatch auth state change event
    window.dispatchEvent(new CustomEvent('auth-state-change', {
      detail: { apiKey: 'browser-llm', method: 'browser' }
    }));
  };
  
  // Logout
  const logout = () => {
    // Clear auth data
    authStorage.clearAuth();
    
    // Update state
    setApiKey(null);
    setAuthMethod(null);
    setIsAuthenticated(false);
    setManualApiKey('');
    
    // Dispatch auth state change event
    window.dispatchEvent(new CustomEvent('auth-state-change', {
      detail: { apiKey: null, method: null }
    }));
  };
  
  // Listen for auth state changes
  React.useEffect(() => {
    const handleAuthStateChange = (event) => {
      const { apiKey, method } = event.detail || {};
      
      if (apiKey) {
        setApiKey(apiKey);
        setAuthMethod(method);
        setIsAuthenticated(true);
      } else {
        setApiKey(null);
        setAuthMethod(null);
        setIsAuthenticated(false);
      }
    };
    
    window.addEventListener('auth-state-change', handleAuthStateChange);
    
    return () => {
      window.removeEventListener('auth-state-change', handleAuthStateChange);
    };
  }, []);
  
  return {
    apiKey,
    isAuthenticated,
    authMethod,
    authInitialized: true,
    
    // Auto-authentication
    autoAuthenticate,
    
    // Manual key input
    manualApiKey,
    setManualApiKey,
    handleManualKeySubmit,
    
    // OAuth flow
    startOAuthFlow,
    
    // Browser model auth
    enableBrowserModel,
    
    // Logout
    logout
  };
};

// Test component using the hook
const AuthComponent = () => {
  const {
    apiKey,
    isAuthenticated,
    authMethod,
    manualApiKey,
    setManualApiKey,
    handleManualKeySubmit,
    startOAuthFlow,
    enableBrowserModel,
    logout
  } = useAuth();
  
  return (
    <div>
      <div data-testid="auth-status">
        {isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
      </div>
      
      <div data-testid="auth-method">
        {authMethod || 'None'}
      </div>
      
      <div data-testid="api-key">
        {apiKey ? `***${apiKey.substring(Math.max(0, apiKey.length - 3))}` : 'No API Key'}
      </div>
      
      {!isAuthenticated ? (
        <div>
          <div>
            <input
              data-testid="api-key-input"
              type="text"
              value={manualApiKey}
              onChange={(e) => setManualApiKey(e.target.value)}
              placeholder="Enter API key"
            />
            <button
              data-testid="manual-submit"
              onClick={handleManualKeySubmit}
            >
              Submit API Key
            </button>
          </div>
          
          <button
            data-testid="oauth-button"
            onClick={startOAuthFlow}
          >
            Login with OAuth
          </button>
          
          <button
            data-testid="browser-model-button"
            onClick={enableBrowserModel}
          >
            Use Browser Model
          </button>
        </div>
      ) : (
        <button
          data-testid="logout-button"
          onClick={logout}
        >
          Logout
        </button>
      )}
    </div>
  );
};

describe('Auth Hook Integration', () => {
  // Set up spies for window events
  const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');
  
  beforeEach(() => {
    // Clear localStorage before each test
    window.localStorage.clear();
    vi.clearAllMocks();
  });
  
  afterEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
  });
  
  it('should initialize as unauthenticated when no stored credentials', () => {
    render(<AuthComponent />);
    
    // Should display unauthenticated status
    expect(screen.getByTestId('auth-status').textContent).toBe('Not Authenticated');
    expect(screen.getByTestId('auth-method').textContent).toBe('None');
    expect(screen.getByTestId('api-key').textContent).toBe('No API Key');
    
    // Should show auth options
    expect(screen.getByTestId('api-key-input')).toBeInTheDocument();
    expect(screen.getByTestId('manual-submit')).toBeInTheDocument();
    expect(screen.getByTestId('oauth-button')).toBeInTheDocument();
    expect(screen.getByTestId('browser-model-button')).toBeInTheDocument();
  });
  
  it('should initialize as authenticated when stored credentials exist', () => {
    // Set up stored credentials
    authStorage.setApiKey('sk-or-test-key');
    authStorage.setAuthMethod('manual');
    
    render(<AuthComponent />);
    
    // Should display authenticated status
    expect(screen.getByTestId('auth-status').textContent).toBe('Authenticated');
    expect(screen.getByTestId('auth-method').textContent).toBe('manual');
    expect(screen.getByTestId('api-key').textContent).toBe('***key');
    
    // Should show logout button
    expect(screen.getByTestId('logout-button')).toBeInTheDocument();
    
    // Should not show auth options
    expect(screen.queryByTestId('api-key-input')).not.toBeInTheDocument();
    expect(screen.queryByTestId('manual-submit')).not.toBeInTheDocument();
    expect(screen.queryByTestId('oauth-button')).not.toBeInTheDocument();
  });
  
  it('should handle manual API key submission', () => {
    render(<AuthComponent />);
    
    // Enter API key
    const input = screen.getByTestId('api-key-input');
    fireEvent.change(input, { target: { value: 'sk-or-test-manual-key' } });
    
    // Submit API key
    const submitButton = screen.getByTestId('manual-submit');
    fireEvent.click(submitButton);
    
    // Should save API key and auth method
    expect(window.localStorage.setItem).toHaveBeenCalledWith(AUTH_KEY, 'sk-or-test-manual-key');
    expect(window.localStorage.setItem).toHaveBeenCalledWith(AUTH_METHOD_KEY, 'manual');
    
    // Should display authenticated status
    expect(screen.getByTestId('auth-status').textContent).toBe('Authenticated');
    expect(screen.getByTestId('auth-method').textContent).toBe('manual');
    expect(screen.getByTestId('api-key').textContent).toBe('***key');
    
    // Should dispatch auth state change event
    expect(dispatchEventSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'auth-state-change',
        detail: expect.objectContaining({
          apiKey: 'sk-or-test-manual-key',
          method: 'manual'
        })
      })
    );
  });
  
  it('should enable browser model mode', () => {
    render(<AuthComponent />);
    
    // Click browser model button
    const browserModelButton = screen.getByTestId('browser-model-button');
    fireEvent.click(browserModelButton);
    
    // Should save browser model auth
    expect(window.localStorage.setItem).toHaveBeenCalledWith(AUTH_KEY, 'browser-llm');
    expect(window.localStorage.setItem).toHaveBeenCalledWith(AUTH_METHOD_KEY, 'browser');
    
    // Should display authenticated status with browser method
    expect(screen.getByTestId('auth-status').textContent).toBe('Authenticated');
    expect(screen.getByTestId('auth-method').textContent).toBe('browser');
    expect(screen.getByTestId('api-key').textContent).toBe('***llm');
    
    // Should dispatch auth state change event
    expect(dispatchEventSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'auth-state-change',
        detail: expect.objectContaining({
          apiKey: 'browser-llm',
          method: 'browser'
        })
      })
    );
  });
  
  it('should handle logout', () => {
    // Set up authenticated state
    authStorage.setApiKey('sk-or-test-key');
    authStorage.setAuthMethod('manual');
    
    render(<AuthComponent />);
    
    // Initially authenticated
    expect(screen.getByTestId('auth-status').textContent).toBe('Authenticated');
    
    // Click logout button
    const logoutButton = screen.getByTestId('logout-button');
    fireEvent.click(logoutButton);
    
    // Should clear auth data
    expect(window.localStorage.removeItem).toHaveBeenCalledWith(AUTH_KEY);
    expect(window.localStorage.removeItem).toHaveBeenCalledWith(AUTH_METHOD_KEY);
    expect(window.localStorage.removeItem).toHaveBeenCalledWith(CODE_VERIFIER_KEY);
    
    // Should display unauthenticated status
    expect(screen.getByTestId('auth-status').textContent).toBe('Not Authenticated');
    expect(screen.getByTestId('auth-method').textContent).toBe('None');
    expect(screen.getByTestId('api-key').textContent).toBe('No API Key');
    
    // Should show auth options again
    expect(screen.getByTestId('api-key-input')).toBeInTheDocument();
    
    // Should dispatch auth state change event
    expect(dispatchEventSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'auth-state-change',
        detail: expect.objectContaining({
          apiKey: null,
          method: null
        })
      })
    );
  });
  
  it('should handle OAuth flow', async () => {
    render(<AuthComponent />);
    
    // Click OAuth button
    const oauthButton = screen.getByTestId('oauth-button');
    
    // Use act for async operations
    await act(async () => {
      fireEvent.click(oauthButton);
    });
    
    // Should save code verifier
    expect(window.localStorage.setItem).toHaveBeenCalledWith(CODE_VERIFIER_KEY, 'test-code-verifier');
    
    // Should simulate OAuth completion and update state
    await act(async () => {
      // Wait for simulated OAuth completion
      await new Promise(resolve => setTimeout(resolve, 10));
    });
    
    // Should save OAuth token and auth method
    expect(window.localStorage.setItem).toHaveBeenCalledWith(AUTH_KEY, 'test-oauth-token');
    expect(window.localStorage.setItem).toHaveBeenCalledWith(AUTH_METHOD_KEY, 'oauth');
    
    // Should display authenticated status with oauth method
    expect(screen.getByTestId('auth-status').textContent).toBe('Authenticated');
    expect(screen.getByTestId('auth-method').textContent).toBe('oauth');
    
    // Should dispatch auth state change event
    expect(dispatchEventSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'auth-state-change',
        detail: expect.objectContaining({
          apiKey: 'test-oauth-token',
          method: 'oauth'
        })
      })
    );
  });
  
  it('should handle auth state changes from external events', () => {
    render(<AuthComponent />);
    
    // Initially unauthenticated
    expect(screen.getByTestId('auth-status').textContent).toBe('Not Authenticated');
    
    // Simulate auth state change from external source
    act(() => {
      window.dispatchEvent(new CustomEvent('auth-state-change', {
        detail: { apiKey: 'external-token', method: 'external' }
      }));
    });
    
    // Should update state based on event
    expect(screen.getByTestId('auth-status').textContent).toBe('Authenticated');
    expect(screen.getByTestId('auth-method').textContent).toBe('external');
    expect(screen.getByTestId('api-key').textContent).toBe('***ken');
  });
});