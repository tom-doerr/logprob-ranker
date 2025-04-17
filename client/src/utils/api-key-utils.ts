/**
 * API Key Utilities
 * 
 * Handles consistent API key access and validation across 
 * different environments and authentication methods
 */

import { authStorage } from './storage';

export interface ApiKeyInfo {
  key: string | null;
  method: 'oauth' | 'manual' | 'browser' | null;
  isValid: boolean;
  source: 'storage' | 'environment' | 'none';
}

/**
 * Validates an API key format
 * - OpenRouter manual keys start with sk-or-
 * - Browser LLM key is 'browser-llm'
 * - OAuth tokens are generally base64 encoded and don't start with 'sk-'
 */
export function validateApiKey(key: string): boolean {
  // Empty key is invalid
  if (!key || typeof key !== 'string' || !key.trim()) return false;
  
  // Browser LLM mode has a special key
  if (key === 'browser-llm') return true;
  
  // OpenRouter manual keys start with sk-or-
  if (key.startsWith('sk-or-')) return true;
  
  // OAuth tokens typically don't have a specific prefix but shouldn't be very short
  // This is a basic length check only
  if (key.length > 20 && !key.startsWith('sk-')) return true;
  
  return false;
}

/**
 * Detects the authentication method from an API key
 */
export function detectAuthMethod(key: string): 'oauth' | 'manual' | 'browser' | null {
  if (!key) return null;
  
  if (key === 'browser-llm') return 'browser';
  if (key.startsWith('sk-or-')) return 'manual';
  
  // Assume OAuth for other formats
  return 'oauth';
}

/**
 * Gets and validates the current API key from storage
 */
export function getCurrentApiKeyInfo(): ApiKeyInfo {
  // Try to get API key from storage
  const storedKey = authStorage.getApiKey();
  const storedMethod = authStorage.getAuthMethod();
  
  // Check if we have a valid key in storage
  if (storedKey && validateApiKey(storedKey)) {
    return {
      key: storedKey,
      method: storedMethod || detectAuthMethod(storedKey),
      isValid: true,
      source: 'storage'
    };
  }
  
  // No valid key found
  return {
    key: null,
    method: null,
    isValid: false,
    source: 'none'
  };
}

/**
 * Ensures API key headers are consistently added to requests
 */
export function addApiKeyHeaders(headers: HeadersInit = {}): HeadersInit {
  const apiKeyInfo = getCurrentApiKeyInfo();
  const headersObj = headers instanceof Headers ? 
    Object.fromEntries(headers.entries()) : 
    { ...headers };
  
  // Don't add API key for browser model
  if (apiKeyInfo.method === 'browser') {
    return headersObj;
  }
  
  // Add Authorization header if we have a valid key
  if (apiKeyInfo.key && apiKeyInfo.isValid) {
    // OAuth uses Bearer format, manual uses direct key
    if (apiKeyInfo.method === 'oauth') {
      headersObj['Authorization'] = `Bearer ${apiKeyInfo.key}`;
    } else {
      headersObj['x-api-key'] = apiKeyInfo.key;
    }
  }
  
  return headersObj;
}

/**
 * Generates complete headers for an API request
 */
export function createApiRequestHeaders(customHeaders: HeadersInit = {}): HeadersInit {
  const baseHeaders = {
    'Content-Type': 'application/json',
  };
  
  // Merge base headers with API key headers and custom headers
  return {
    ...baseHeaders,
    ...addApiKeyHeaders({}),
    ...customHeaders
  };
}