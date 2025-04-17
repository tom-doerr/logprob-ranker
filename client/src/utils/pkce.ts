/**
 * PKCE utility for OAuth flows
 * Handles creation of PKCE code verifiers and challenges for secure OAuth
 */

// StorageKeys for PKCE and authentication
const STORAGE_KEYS = {
  CODE_VERIFIER: 'pkce-verifier',
  API_KEY: 'nervui-api-key', 
  AUTH_METHOD: 'nervui-auth-method'
};

/**
 * Generate a random code verifier for PKCE
 */
export function generateCodeVerifier(length: number = 64): string {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let text = '';
  
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  
  return text;
}

/**
 * Save code verifier to localStorage
 */
export function saveCodeVerifier(codeVerifier: string): void {
  localStorage.setItem(STORAGE_KEYS.CODE_VERIFIER, codeVerifier);
}

/**
 * Get stored code verifier
 */
export function getCodeVerifier(): string | null {
  return localStorage.getItem(STORAGE_KEYS.CODE_VERIFIER);
}

/**
 * Clear stored code verifier
 */
export function clearCodeVerifier(): void {
  localStorage.removeItem(STORAGE_KEYS.CODE_VERIFIER);
}

/**
 * Create a PKCE code challenge from a code verifier
 */
export async function createPKCECodeChallenge(codeVerifier: string): Promise<string> {
  // Convert the code verifier string to an array buffer
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  
  // Generate a SHA-256 hash of the code verifier
  const hash = await window.crypto.subtle.digest('SHA-256', data);
  
  // Convert the hash to base64 URL encoding
  return base64UrlEncode(hash);
}

// Alias for backward compatibility
export const createSHA256CodeChallenge = createPKCECodeChallenge;

/**
 * Convert an array buffer to a base64 URL encoded string
 */
function base64UrlEncode(arrayBuffer: ArrayBuffer): string {
  // Convert the array buffer to a regular base64 string
  let base64 = '';
  const bytes = new Uint8Array(arrayBuffer);
  const len = bytes.byteLength;
  
  // Manually convert to string to avoid issues with spread operator
  for (let i = 0; i < len; i++) {
    base64 += String.fromCharCode(bytes[i]);
  }
  
  base64 = window.btoa(base64);
  
  // Convert the base64 to base64url by replacing characters
  // and removing padding
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Create an OAuth state parameter with an encoded return URL
 */
export function createOAuthState(returnUrl: string): string {
  const stateObj = { returnUrl };
  return window.btoa(JSON.stringify(stateObj));
}

/**
 * Parse the OAuth state parameter
 */
export function parseOAuthState(state: string): { returnUrl: string } {
  try {
    return JSON.parse(window.atob(state));
  } catch (error) {
    console.error('Failed to parse OAuth state:', error);
    return { returnUrl: '/' };
  }
}

// API key management functions
export function getApiKey(): string | null {
  return localStorage.getItem(STORAGE_KEYS.API_KEY);
}

export function saveApiKey(apiKey: string): void {
  localStorage.setItem(STORAGE_KEYS.API_KEY, apiKey);
}

export function clearApiKey(): void {
  localStorage.removeItem(STORAGE_KEYS.API_KEY);
}

// Auth method management
export function getAuthMethod(): string | null {
  return localStorage.getItem(STORAGE_KEYS.AUTH_METHOD);
}

export function saveAuthMethod(method: string): void {
  localStorage.setItem(STORAGE_KEYS.AUTH_METHOD, method);
}

export function clearAuthMethod(): void {
  localStorage.removeItem(STORAGE_KEYS.AUTH_METHOD);
}

// Combined auth utilities
export function hasValidApiKey(): boolean {
  return getApiKey() !== null;
}

export function getAuthData(): { apiKey: string | null, method: string | null } {
  return {
    apiKey: getApiKey(),
    method: getAuthMethod()
  };
}

// Export all functions as default object
export default {
  generateCodeVerifier,
  createPKCECodeChallenge,
  createSHA256CodeChallenge,
  saveCodeVerifier,
  getCodeVerifier,
  clearCodeVerifier,
  createOAuthState,
  parseOAuthState,
  getApiKey,
  saveApiKey,
  clearApiKey,
  getAuthMethod,
  saveAuthMethod,
  clearAuthMethod,
  hasValidApiKey,
  getAuthData
};