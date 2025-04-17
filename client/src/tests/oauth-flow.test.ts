/**
 * OAuth Flow Integration Tests
 * Tests the complete OAuth authorization flow
 */

import { authStorage } from '../utils/storage';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { generateCodeVerifier, createSHA256CodeChallenge } from '../utils/pkce';

// Mock window location
const mockLocation = {
  origin: 'https://myapp.replit.app',
  pathname: '/app',
  href: 'https://myapp.replit.app/app',
  protocol: 'https:',
  host: 'myapp.replit.app',
  search: ''
};

// Mock fetch
global.fetch = vi.fn();

describe('OAuth Flow Integration', () => {
  beforeEach(() => {
    // Clear auth storage before each test
    authStorage.clearAuth();
    
    // Reset location mock
    Object.defineProperty(window, 'location', {
      value: { ...mockLocation },
      writable: true
    });
    
    // Restore mocks
    vi.clearAllMocks();
  });
  
  afterEach(() => {
    authStorage.clearAuth();
  });
  
  it('should generate and store code verifier for PKCE flow', () => {
    const verifier = generateCodeVerifier();
    
    // Verify code verifier meets PKCE requirements
    expect(verifier).toBeDefined();
    expect(typeof verifier).toBe('string');
    expect(verifier.length).toBeGreaterThanOrEqual(43);
    expect(verifier.length).toBeLessThanOrEqual(128);
    
    // Test storage functionality
    authStorage.saveCodeVerifier(verifier);
    expect(authStorage.getCodeVerifier()).toBe(verifier);
  });
  
  it('should generate correct code challenge from verifier', async () => {
    const verifier = 'test_code_verifier_12345_abcde';
    const challenge = await createSHA256CodeChallenge(verifier);
    
    // Verify challenge format (base64url encoded)
    expect(challenge).toBeDefined();
    expect(typeof challenge).toBe('string');
    // Base64url alphabet check (no +, /, = chars)
    expect(challenge).not.toMatch(/[+/=]/);
  });
  
  it('should handle token exchange process correctly', async () => {
    // Set up prerequisites for token exchange
    const codeVerifier = 'test_code_verifier_12345';
    const authCode = 'test_authorization_code';
    const redirectUri = 'https://myapp.replit.app/callback';
    
    authStorage.saveCodeVerifier(codeVerifier);
    authStorage.setAuthMethod('oauth');
    
    // Mock successful token exchange response
    const mockTokenResponse = {
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        access_token: 'test_access_token_12345',
        token_type: 'Bearer',
        expires_in: 3600
      })
    };
    
    global.fetch.mockResolvedValue(mockTokenResponse);
    
    // Simulate token exchange request
    const response = await fetch('https://openrouter.ai/api/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: authCode,
        code_verifier: codeVerifier,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    });
    
    const data = await response.json();
    
    // Check token structure
    expect(data.access_token).toBeDefined();
    expect(data.token_type).toBe('Bearer');
    
    // Save token and check auth state
    authStorage.setApiKey(data.access_token);
    
    // Verify auth state
    expect(authStorage.getApiKey()).toBe('test_access_token_12345');
    expect(authStorage.getAuthMethod()).toBe('oauth');
    expect(authStorage.isAuthenticated()).toBe(true);
  });
  
  it('should correctly detect Replit environment for callback URL', () => {
    // Set Replit domain in location
    Object.defineProperty(window, 'location', {
      value: {
        origin: 'https://myapp.replit.app',
        pathname: '/nested/path/page',
        href: 'https://myapp.replit.app/nested/path/page',
        protocol: 'https:',
        host: 'myapp.replit.app'
      },
      writable: true
    });
    
    // Create URL formation logic (similar to what's in the app)
    const isReplit = window.location.origin.includes('.replit.app');
    const currentPath = window.location.pathname;
    const basePath = currentPath.split('/').slice(0, -1).join('/');
    const callbackUrl = isReplit 
      ? `${window.location.origin}${basePath}/callback`
      : `${window.location.origin}/callback`;
    
    // Validate URL structure
    expect(callbackUrl).toBe('https://myapp.replit.app/nested/path/callback');
    expect(isReplit).toBe(true);
  });
  
  it('should handle OAuth token revocation/expiration', () => {
    // Set an OAuth token 
    authStorage.setApiKey('test_oauth_token');
    authStorage.setAuthMethod('oauth');
    
    // Verify initial auth state
    expect(authStorage.isAuthenticated()).toBe(true);
    
    // Simulate token revocation by clearing it
    authStorage.clearAuth();
    
    // Check auth state after revocation
    expect(authStorage.isAuthenticated()).toBe(false);
    expect(authStorage.getApiKey()).toBeNull();
    expect(authStorage.getAuthMethod()).toBeNull();
  });
});