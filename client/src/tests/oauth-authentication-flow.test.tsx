import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AuthProvider, useAuth } from '../hooks/use-auth';
import React from 'react';

// Mock toast hook
vi.mock('../hooks/use-toast', () => ({
  toast: vi.fn(),
  useToast: () => ({
    toast: vi.fn()
  })
}));

// Mock window.location.href setter for OAuth flow
Object.defineProperty(window, 'location', {
  value: {
    href: '',
    origin: 'http://localhost',
    pathname: '/'
  },
  writable: true
});

// Test component to interact with auth context
function AuthTestComponent() {
  const { 
    apiKey, 
    isAuthenticated, 
    authMethod, 
    startOAuthFlow, 
    manualApiKey, 
    setManualApiKey, 
    handleManualKeySubmit,
    logout
  } = useAuth();

  return (
    <div>
      <div data-testid="auth-status">
        {isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
      </div>
      <div data-testid="auth-method">{authMethod || 'none'}</div>
      <div data-testid="api-key">{apiKey || 'no-key'}</div>
      
      <input 
        data-testid="manual-key-input"
        value={manualApiKey}
        onChange={(e) => setManualApiKey(e.target.value)}
      />
      
      <button data-testid="submit-manual-key" onClick={handleManualKeySubmit}>
        Submit Manual Key
      </button>
      
      <button data-testid="start-oauth" onClick={startOAuthFlow}>
        Start OAuth
      </button>
      
      <button data-testid="logout" onClick={logout}>
        Logout
      </button>
    </div>
  );
}

describe('OAuth Authentication Flow', () => {
  // Mock localStorage
  const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
      getItem: vi.fn((key: string) => store[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value.toString();
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key];
      }),
      clear: vi.fn(() => {
        store = {};
      })
    };
  })();

  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true
    });
    localStorageMock.clear();

    // Create mock for CustomEvent
    window.CustomEvent = vi.fn().mockImplementation((event, params) => ({
      type: event,
      ...params
    }));

    // Mock dispatchEvent
    window.dispatchEvent = vi.fn();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should start with unauthenticated state', () => {
    render(
      <AuthProvider>
        <AuthTestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId('auth-status').textContent).toBe('Not Authenticated');
    expect(screen.getByTestId('auth-method').textContent).toBe('none');
    expect(screen.getByTestId('api-key').textContent).toBe('no-key');
  });

  it('should authenticate with manual API key', async () => {
    render(
      <AuthProvider>
        <AuthTestComponent />
      </AuthProvider>
    );

    // Enter manual API key
    fireEvent.change(screen.getByTestId('manual-key-input'), {
      target: { value: 'manual-test-key-12345' }
    });

    // Submit the key
    fireEvent.click(screen.getByTestId('submit-manual-key'));

    // Check authentication state
    await waitFor(() => {
      expect(screen.getByTestId('auth-status').textContent).toBe('Authenticated');
      expect(screen.getByTestId('auth-method').textContent).toBe('manual');
      expect(screen.getByTestId('api-key').textContent).toBe('manual-test-key-12345');
    });

    // Verify localStorage was updated
    expect(localStorageMock.setItem).toHaveBeenCalledWith('nervui-api-key', 'manual-test-key-12345');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('nervui-auth-method', 'manual');
  });

  it('should set up OAuth flow correctly', async () => {
    // Mock pkce functions
    vi.mock('../utils/pkce', () => ({
      generateCodeVerifier: () => 'test-verifier-12345',
      createSHA256CodeChallenge: () => Promise.resolve('test-challenge-abcde')
    }));

    // Spy on window.location.href
    const hrefSpy = vi.spyOn(window.location, 'href', 'set');
    
    render(
      <AuthProvider>
        <AuthTestComponent />
      </AuthProvider>
    );

    // Start OAuth flow
    fireEvent.click(screen.getByTestId('start-oauth'));

    // Verify auth method was set to OAuth
    expect(localStorageMock.setItem).toHaveBeenCalledWith('nervui-auth-method', 'oauth');
    
    // Verify redirect was attempted
    expect(hrefSpy).toHaveBeenCalled();
  });

  it('should log out correctly', async () => {
    render(
      <AuthProvider>
        <AuthTestComponent />
      </AuthProvider>
    );

    // First authenticate
    fireEvent.change(screen.getByTestId('manual-key-input'), {
      target: { value: 'temp-key-for-logout-test' }
    });
    fireEvent.click(screen.getByTestId('submit-manual-key'));

    // Verify authentication
    await waitFor(() => {
      expect(screen.getByTestId('auth-status').textContent).toBe('Authenticated');
    });

    // Now logout
    fireEvent.click(screen.getByTestId('logout'));

    // Verify logout
    await waitFor(() => {
      expect(screen.getByTestId('auth-status').textContent).toBe('Not Authenticated');
      expect(screen.getByTestId('auth-method').textContent).toBe('none');
      expect(screen.getByTestId('api-key').textContent).toBe('no-key');
    });

    // Verify localStorage was cleared
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('nervui-api-key');
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('nervui-auth-method');
  });
});