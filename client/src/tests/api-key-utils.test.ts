/**
 * API Key Utilities Tests
 * Tests the API key utility functions
 */

import { validateApiKey, detectAuthMethod, getCurrentApiKeyInfo, addApiKeyHeaders, createApiRequestHeaders } from '../utils/api-key-utils';
import { authStorage } from '../utils/storage';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock storage
vi.mock('../utils/storage', () => ({
  authStorage: {
    getApiKey: vi.fn(),
    getAuthMethod: vi.fn(),
    setApiKey: vi.fn(),
    setAuthMethod: vi.fn(),
    clearAuth: vi.fn()
  }
}));

describe('API Key Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementations
    (authStorage.getApiKey as any).mockReturnValue(null);
    (authStorage.getAuthMethod as any).mockReturnValue(null);
  });
  
  afterEach(() => {
    vi.clearAllMocks();
  });
  
  describe('validateApiKey', () => {
    it('should validate OpenRouter API key format', () => {
      expect(validateApiKey('sk-or-v1-abcdef1234567890')).toBe(true);
      expect(validateApiKey('sk-or-test-key-12345')).toBe(true);
    });
    
    it('should validate browser model key', () => {
      expect(validateApiKey('browser-llm')).toBe(true);
    });
    
    it('should validate OAuth token format', () => {
      expect(validateApiKey('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-token')).toBe(true);
    });
    
    it('should reject invalid keys', () => {
      expect(validateApiKey('')).toBe(false);
      expect(validateApiKey(null as any)).toBe(false);
      expect(validateApiKey(undefined as any)).toBe(false);
      expect(validateApiKey('invalid-key')).toBe(false);
      expect(validateApiKey('   ')).toBe(false);
    });
  });
  
  describe('detectAuthMethod', () => {
    it('should detect browser model method', () => {
      expect(detectAuthMethod('browser-llm')).toBe('browser');
    });
    
    it('should detect manual API key method', () => {
      expect(detectAuthMethod('sk-or-v1-test-key')).toBe('manual');
    });
    
    it('should default to OAuth for other formats', () => {
      expect(detectAuthMethod('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test')).toBe('oauth');
      expect(detectAuthMethod('any-other-format')).toBe('oauth');
    });
    
    it('should return null for empty keys', () => {
      expect(detectAuthMethod('')).toBeNull();
      expect(detectAuthMethod(null as any)).toBeNull();
    });
  });
  
  describe('getCurrentApiKeyInfo', () => {
    it('should return correct info for manual API key', () => {
      // Mock storage to return manual API key
      (authStorage.getApiKey as any).mockReturnValue('sk-or-v1-test-key');
      (authStorage.getAuthMethod as any).mockReturnValue('manual');
      
      const info = getCurrentApiKeyInfo();
      
      expect(info.key).toBe('sk-or-v1-test-key');
      expect(info.method).toBe('manual');
      expect(info.isValid).toBe(true);
      expect(info.source).toBe('storage');
    });
    
    it('should return correct info for browser model', () => {
      // Mock storage to return browser model key
      (authStorage.getApiKey as any).mockReturnValue('browser-llm');
      (authStorage.getAuthMethod as any).mockReturnValue('browser');
      
      const info = getCurrentApiKeyInfo();
      
      expect(info.key).toBe('browser-llm');
      expect(info.method).toBe('browser');
      expect(info.isValid).toBe(true);
      expect(info.source).toBe('storage');
    });
    
    it('should detect method if not provided', () => {
      // Mock storage to return key without method
      (authStorage.getApiKey as any).mockReturnValue('sk-or-v1-test-key');
      (authStorage.getAuthMethod as any).mockReturnValue(null);
      
      const info = getCurrentApiKeyInfo();
      
      expect(info.key).toBe('sk-or-v1-test-key');
      expect(info.method).toBe('manual'); // Auto-detected
      expect(info.isValid).toBe(true);
      expect(info.source).toBe('storage');
    });
    
    it('should handle no API key', () => {
      // Mock storage to return no key
      (authStorage.getApiKey as any).mockReturnValue(null);
      
      const info = getCurrentApiKeyInfo();
      
      expect(info.key).toBeNull();
      expect(info.method).toBeNull();
      expect(info.isValid).toBe(false);
      expect(info.source).toBe('none');
    });
  });
  
  describe('addApiKeyHeaders', () => {
    it('should add Authorization header for OAuth token', () => {
      // Mock storage to return OAuth token
      (authStorage.getApiKey as any).mockReturnValue('oauth-token-12345');
      (authStorage.getAuthMethod as any).mockReturnValue('oauth');
      
      const headers = addApiKeyHeaders({});
      
      expect(headers['Authorization']).toBe('Bearer oauth-token-12345');
    });
    
    it('should add x-api-key header for manual API key', () => {
      // Mock storage to return manual API key
      (authStorage.getApiKey as any).mockReturnValue('sk-or-v1-test-key');
      (authStorage.getAuthMethod as any).mockReturnValue('manual');
      
      const headers = addApiKeyHeaders({});
      
      expect(headers['x-api-key']).toBe('sk-or-v1-test-key');
    });
    
    it('should not add auth headers for browser model', () => {
      // Mock storage to return browser model key
      (authStorage.getApiKey as any).mockReturnValue('browser-llm');
      (authStorage.getAuthMethod as any).mockReturnValue('browser');
      
      const headers = addApiKeyHeaders({});
      
      expect(headers['Authorization']).toBeUndefined();
      expect(headers['x-api-key']).toBeUndefined();
    });
    
    it('should merge with existing headers', () => {
      // Mock storage to return manual API key
      (authStorage.getApiKey as any).mockReturnValue('sk-or-v1-test-key');
      (authStorage.getAuthMethod as any).mockReturnValue('manual');
      
      const existingHeaders = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
      
      const headers = addApiKeyHeaders(existingHeaders);
      
      expect(headers['x-api-key']).toBe('sk-or-v1-test-key');
      expect(headers['Content-Type']).toBe('application/json');
      expect(headers['Accept']).toBe('application/json');
    });
    
    it('should handle Headers object type', () => {
      // Mock storage to return OAuth token
      (authStorage.getApiKey as any).mockReturnValue('oauth-token-12345');
      (authStorage.getAuthMethod as any).mockReturnValue('oauth');
      
      const headersObj = new Headers();
      headersObj.append('Content-Type', 'application/json');
      
      const headers = addApiKeyHeaders(headersObj);
      
      expect(headers['Authorization']).toBe('Bearer oauth-token-12345');
      expect(headers['Content-Type']).toBe('application/json');
    });
  });
  
  describe('createApiRequestHeaders', () => {
    it('should create complete headers with auth', () => {
      // Mock storage to return OAuth token
      (authStorage.getApiKey as any).mockReturnValue('oauth-token-12345');
      (authStorage.getAuthMethod as any).mockReturnValue('oauth');
      
      const headers = createApiRequestHeaders();
      
      expect(headers['Content-Type']).toBe('application/json');
      expect(headers['Authorization']).toBe('Bearer oauth-token-12345');
    });
    
    it('should merge with custom headers', () => {
      // Mock storage to return manual API key
      (authStorage.getApiKey as any).mockReturnValue('sk-or-v1-test-key');
      (authStorage.getAuthMethod as any).mockReturnValue('manual');
      
      const customHeaders = {
        'User-Agent': 'Test Client',
        'X-Custom-Header': 'Custom Value'
      };
      
      const headers = createApiRequestHeaders(customHeaders);
      
      expect(headers['Content-Type']).toBe('application/json');
      expect(headers['x-api-key']).toBe('sk-or-v1-test-key');
      expect(headers['User-Agent']).toBe('Test Client');
      expect(headers['X-Custom-Header']).toBe('Custom Value');
    });
    
    it('should prioritize custom headers over defaults', () => {
      // Mock storage to return manual API key
      (authStorage.getApiKey as any).mockReturnValue('sk-or-v1-test-key');
      (authStorage.getAuthMethod as any).mockReturnValue('manual');
      
      const customHeaders = {
        'Content-Type': 'text/plain' // Override default
      };
      
      const headers = createApiRequestHeaders(customHeaders);
      
      expect(headers['Content-Type']).toBe('text/plain'); // Custom value takes precedence
      expect(headers['x-api-key']).toBe('sk-or-v1-test-key');
    });
  });
});