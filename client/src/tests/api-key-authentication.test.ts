import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getApiKey, storeApiKey, removeApiKey } from '../utils/api-key-utils';

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
    storeApiKey(testKey);
    
    // Verify localStorage was called with correct parameters
    expect(localStorageMock.setItem).toHaveBeenCalledWith('api_key', testKey);
    
    // Retrieve the API key
    const retrievedKey = getApiKey();
    
    // Verify the key was retrieved correctly
    expect(retrievedKey).toBe(testKey);
    expect(localStorageMock.getItem).toHaveBeenCalledWith('api_key');
  });

  it('should return null when no API key is stored', () => {
    // Ensure no key exists
    localStorageMock.clear();
    
    // Attempt to retrieve a non-existent key
    const retrievedKey = getApiKey();
    
    // Verify null is returned
    expect(retrievedKey).toBeNull();
    expect(localStorageMock.getItem).toHaveBeenCalledWith('api_key');
  });

  it('should remove API key correctly', () => {
    // First store a key
    const testKey = 'test-api-key-to-remove';
    storeApiKey(testKey);
    
    // Then remove it
    removeApiKey();
    
    // Verify removal
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('api_key');
    
    // Verify key can no longer be retrieved
    const retrievedKey = getApiKey();
    expect(retrievedKey).toBeNull();
  });

  it('should detect when API key is available', () => {
    // No key initially
    expect(getApiKey()).toBeNull();
    
    // After storing key
    storeApiKey('valid-api-key');
    expect(getApiKey()).not.toBeNull();
    
    // After removing key
    removeApiKey();
    expect(getApiKey()).toBeNull();
  });
});