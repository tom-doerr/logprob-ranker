import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../hooks/use-auth';
import React from 'react';

// Mock oauth flow helper
vi.mock('../utils/oauth-utils', () => ({
  initiateOAuthFlow: vi.fn(() => Promise.resolve({ apiKey: 'oauth-provided-key-12345' })),
}));

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
    expect(localStorageMock.setItem).toHaveBeenCalledWith('api_key', 'manual-test-key-12345');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('auth_method', 'manual');
  });

  it('should authenticate with OAuth flow', async () => {
    const { initiateOAuthFlow } = require('../utils/oauth-utils');
    
    render(
      <AuthProvider>
        <AuthTestComponent />
      </AuthProvider>
    );

    // Start OAuth flow
    fireEvent.click(screen.getByTestId('start-oauth'));

    // Check if OAuth initiation was called
    expect(initiateOAuthFlow).toHaveBeenCalled();

    // Simulate successful OAuth completion
    await waitFor(() => {
      expect(screen.getByTestId('auth-status').textContent).toBe('Authenticated');
      expect(screen.getByTestId('auth-method').textContent).toBe('oauth');
      expect(screen.getByTestId('api-key').textContent).toBe('oauth-provided-key-12345');
    });

    // Verify localStorage was updated
    expect(localStorageMock.setItem).toHaveBeenCalledWith('api_key', 'oauth-provided-key-12345');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('auth_method', 'oauth');
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
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('api_key');
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_method');
  });
});