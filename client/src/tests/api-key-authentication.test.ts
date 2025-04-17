import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { authStorage } from '../utils/storage';
import { validateApiKey, detectAuthMethod } from '../utils/api-key-utils';

describe('API Key Authentication Flow', () => {
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

  // Replace global localStorage with mock
  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true
    });
    localStorageMock.clear();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should store and retrieve API key correctly', () => {
    const testKey = 'test-api-key-12345';
    
    // Store the API key
    authStorage.setApiKey(testKey);
    
    // Verify localStorage was called with correct parameters
    expect(localStorageMock.setItem).toHaveBeenCalled();
    
    // Retrieve the API key
    const retrievedKey = authStorage.getApiKey();
    
    // Verify the key was retrieved correctly
    expect(retrievedKey).toBe(testKey);
    expect(localStorageMock.getItem).toHaveBeenCalled();
  });

  it('should return null when no API key is stored', () => {
    // Ensure no key exists
    localStorageMock.clear();
    
    // Attempt to retrieve a non-existent key
    const retrievedKey = authStorage.getApiKey();
    
    // Verify null is returned
    expect(retrievedKey).toBeNull();
    expect(localStorageMock.getItem).toHaveBeenCalled();
  });

  it('should remove API key correctly', () => {
    // First store a key
    const testKey = 'test-api-key-to-remove';
    authStorage.setApiKey(testKey);
    
    // Then remove it
    authStorage.clearAuth();
    
    // Verify removal
    expect(localStorageMock.removeItem).toHaveBeenCalled();
    
    // Verify key can no longer be retrieved
    const retrievedKey = authStorage.getApiKey();
    expect(retrievedKey).toBeNull();
  });

  it('should detect when API key is available', () => {
    // No key initially
    expect(authStorage.getApiKey()).toBeNull();
    
    // After storing key
    authStorage.setApiKey('valid-api-key');
    expect(authStorage.getApiKey()).not.toBeNull();
    
    // After removing key
    authStorage.clearAuth();
    expect(authStorage.getApiKey()).toBeNull();
  });
  
  it('should correctly validate API key formats', () => {
    // OpenRouter keys
    expect(validateApiKey('sk-or-v1-abcdef1234567890')).toBe(true);
    
    // Browser model special key
    expect(validateApiKey('browser-llm')).toBe(true);
    
    // OAuth token (simplified JWT format)
    expect(validateApiKey('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-token')).toBe(true);
    
    // Invalid keys
    expect(validateApiKey('')).toBe(false);
    expect(validateApiKey('short-key')).toBe(false);
  });
  
  it('should correctly detect authentication methods', () => {
    // Browser model
    expect(detectAuthMethod('browser-llm')).toBe('browser');
    
    // Manual API key
    expect(detectAuthMethod('sk-or-v1-test-key')).toBe('manual');
    
    // OAuth token
    expect(detectAuthMethod('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-token')).toBe('oauth');
    
    // Null for empty key
    expect(detectAuthMethod('')).toBeNull();
  });
});