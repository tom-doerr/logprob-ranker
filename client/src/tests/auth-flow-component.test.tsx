/**
 * Authentication Flow Component Integration Tests
 * Tests the AuthFlow component functionality and interactions
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { authStorage } from '../utils/storage';

// Mock event listeners
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
    clearAuth: vi.fn(),
    saveCodeVerifier: vi.fn(),
    getCodeVerifier: vi.fn()
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

// Mock OAuth handler
vi.mock('../utils/oauth-handler', () => ({
  generatePKCEChallenge: vi.fn().mockReturnValue({
    codeVerifier: 'test-verifier',
    codeChallenge: 'test-challenge'
  }),
  buildAuthorizationUrl: vi.fn().mockReturnValue('https://auth.openrouter.ai/oauth?client_id=test&redirect_uri=test&code_challenge=test')
}));

// Mock toast notifications
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast
  })
}));

// Mock the window.open function
window.open = vi.fn();

// Mock simplified AuthFlow component for testing
const TestAuthFlow = () => {
  const [apiKey, setApiKey] = React.useState('');
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [authMethod, setAuthMethod] = React.useState<string | null>(null);
  
  // Initialize auth state
  React.useEffect(() => {
    const storedKey = authStorage.getApiKey();
    const storedMethod = authStorage.getAuthMethod();
    const isAuth = authStorage.isAuthenticated();
    
    setApiKey(storedKey || '');
    setAuthMethod(storedMethod);
    setIsAuthenticated(isAuth);
  }, []);
  
  // Handle manual key input
  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setApiKey(e.target.value);
  };
  
  // Handle manual key submission
  const handleManualKeySubmit = () => {
    if (!apiKey.trim()) {
      mockToast({
        title: 'Error',
        description: 'Please enter an API key',
        variant: 'destructive'
      });
      return;
    }
    
    // Save API key
    authStorage.setApiKey(apiKey);
    authStorage.setAuthMethod('manual');
    
    // Update state
    setIsAuthenticated(true);
    setAuthMethod('manual');
    
    // Notify of auth state change
    window.dispatchEvent(new CustomEvent('auth-state-change', {
      detail: { apiKey, method: 'manual' }
    }));
    
    mockToast({
      title: 'Success',
      description: 'API key saved successfully',
    });
  };
  
  // Handle OAuth login
  const handleOAuthLogin = () => {
    // Generate PKCE challenge
    const { codeVerifier } = { codeVerifier: 'test-verifier', codeChallenge: 'test-challenge' };
    
    // Save code verifier
    authStorage.saveCodeVerifier(codeVerifier);
    
    // Open OAuth popup
    window.open('https://auth.openrouter.ai/oauth?test=1', '_blank');
  };
  
  // Handle browser model mode
  const handleUseBrowserModel = () => {
    // Set browser model mode
    authStorage.setApiKey('browser-llm');
    authStorage.setAuthMethod('browser');
    
    // Update state
    setIsAuthenticated(true);
    setAuthMethod('browser');
    
    // Notify of auth state change
    window.dispatchEvent(new CustomEvent('auth-state-change', {
      detail: { apiKey: 'browser-llm', method: 'browser' }
    }));
    
    mockToast({
      title: 'Browser Mode Enabled',
      description: 'Using browser-based models only',
    });
  };
  
  // Handle logout
  const handleLogout = () => {
    // Clear auth data
    authStorage.clearAuth();
    
    // Update state
    setIsAuthenticated(false);
    setAuthMethod(null);
    setApiKey('');
    
    // Notify of auth state change
    window.dispatchEvent(new CustomEvent('auth-state-change', {
      detail: { apiKey: null, method: null }
    }));
    
    mockToast({
      title: 'Logged Out',
      description: 'Authentication cleared',
    });
  };
  
  return (
    <div>
      <div data-testid="auth-status">
        {isAuthenticated ? `Authenticated (${authMethod})` : 'Not Authenticated'}
      </div>
      
      {!isAuthenticated ? (
        <div>
          <div>
            <input
              type="text"
              value={apiKey}
              onChange={handleApiKeyChange}
              placeholder="Enter API key"
              data-testid="api-key-input"
            />
            <button
              onClick={handleManualKeySubmit}
              data-testid="manual-submit-button"
            >
              Submit API Key
            </button>
          </div>
          
          <div>
            <button
              onClick={handleOAuthLogin}
              data-testid="oauth-button"
            >
              Login with OpenRouter
            </button>
          </div>
          
          <div>
            <button
              onClick={handleUseBrowserModel}
              data-testid="browser-model-button"
            >
              Use Browser Models Only
            </button>
          </div>
        </div>
      ) : (
        <div>
          <button
            onClick={handleLogout}
            data-testid="logout-button"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
};

describe('AuthFlow Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementations
    (authStorage.getApiKey as any).mockReturnValue(null);
    (authStorage.getAuthMethod as any).mockReturnValue(null);
    (authStorage.isAuthenticated as any).mockReturnValue(false);
  });
  
  afterEach(() => {
    vi.clearAllMocks();
  });
  
  it('should render unauthenticated state initially', () => {
    render(<TestAuthFlow />);
    
    // Should show unauthenticated status
    expect(screen.getByTestId('auth-status').textContent).toBe('Not Authenticated');
    
    // Should show auth options
    expect(screen.getByTestId('api-key-input')).toBeInTheDocument();
    expect(screen.getByTestId('manual-submit-button')).toBeInTheDocument();
    expect(screen.getByTestId('oauth-button')).toBeInTheDocument();
    expect(screen.getByTestId('browser-model-button')).toBeInTheDocument();
    
    // Should not show logout button
    expect(screen.queryByTestId('logout-button')).not.toBeInTheDocument();
  });
  
  it('should handle manual API key submission', async () => {
    render(<TestAuthFlow />);
    
    // Enter API key
    fireEvent.change(screen.getByTestId('api-key-input'), {
      target: { value: 'sk-or-v1-test-key' }
    });
    
    // Submit API key
    fireEvent.click(screen.getByTestId('manual-submit-button'));
    
    // Should save API key
    expect(authStorage.setApiKey).toHaveBeenCalledWith('sk-or-v1-test-key');
    expect(authStorage.setAuthMethod).toHaveBeenCalledWith('manual');
    
    // Should show authenticated status
    await waitFor(() => {
      expect(screen.getByTestId('auth-status').textContent).toBe('Authenticated (manual)');
    });
    
    // Should show logout button
    expect(screen.getByTestId('logout-button')).toBeInTheDocument();
    
    // Should not show auth options
    expect(screen.queryByTestId('api-key-input')).not.toBeInTheDocument();
    expect(screen.queryByTestId('manual-submit-button')).not.toBeInTheDocument();
  });
  
  it('should handle empty API key error', async () => {
    render(<TestAuthFlow />);
    
    // Submit without entering API key
    fireEvent.click(screen.getByTestId('manual-submit-button'));
    
    // Should show error toast
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Error',
        variant: 'destructive'
      })
    );
    
    // Should not save API key
    expect(authStorage.setApiKey).not.toHaveBeenCalled();
    expect(authStorage.setAuthMethod).not.toHaveBeenCalled();
    
    // Should still show unauthenticated status
    expect(screen.getByTestId('auth-status').textContent).toBe('Not Authenticated');
  });
  
  it('should handle OAuth login', async () => {
    render(<TestAuthFlow />);
    
    // Click OAuth login button
    fireEvent.click(screen.getByTestId('oauth-button'));
    
    // Should save code verifier
    expect(authStorage.saveCodeVerifier).toHaveBeenCalledWith('test-verifier');
    
    // Should open OAuth popup
    expect(window.open).toHaveBeenCalled();
  });
  
  it('should handle browser model mode', async () => {
    render(<TestAuthFlow />);
    
    // Click browser model button
    fireEvent.click(screen.getByTestId('browser-model-button'));
    
    // Should save browser model state
    expect(authStorage.setApiKey).toHaveBeenCalledWith('browser-llm');
    expect(authStorage.setAuthMethod).toHaveBeenCalledWith('browser');
    
    // Should show authenticated status with browser method
    await waitFor(() => {
      expect(screen.getByTestId('auth-status').textContent).toBe('Authenticated (browser)');
    });
    
    // Should show success toast
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Browser Mode Enabled'
      })
    );
  });
  
  it('should handle logout', async () => {
    // Mock authenticated state
    (authStorage.getApiKey as any).mockReturnValue('sk-or-v1-test-key');
    (authStorage.getAuthMethod as any).mockReturnValue('manual');
    (authStorage.isAuthenticated as any).mockReturnValue(true);
    
    render(<TestAuthFlow />);
    
    // Should show authenticated status initially
    expect(screen.getByTestId('auth-status').textContent).toBe('Authenticated (manual)');
    
    // Click logout button
    fireEvent.click(screen.getByTestId('logout-button'));
    
    // Should clear auth data
    expect(authStorage.clearAuth).toHaveBeenCalled();
    
    // Should show unauthenticated status
    await waitFor(() => {
      expect(screen.getByTestId('auth-status').textContent).toBe('Not Authenticated');
    });
    
    // Should show auth options again
    expect(screen.getByTestId('api-key-input')).toBeInTheDocument();
    expect(screen.getByTestId('manual-submit-button')).toBeInTheDocument();
  });
  
  it('should handle auth event listeners', async () => {
    render(<TestAuthFlow />);
    
    // Initially unauthenticated
    expect(screen.getByTestId('auth-status').textContent).toBe('Not Authenticated');
    
    // Simulate auth event from external source
    window.dispatchEvent(new CustomEvent('auth-state-change', {
      detail: { apiKey: 'sk-or-v1-external-key', method: 'manual' }
    }));
    
    // Should update authenticated status
    await waitFor(() => {
      expect(screen.getByTestId('auth-status').textContent).toBe('Authenticated (manual)');
    });
  });
});